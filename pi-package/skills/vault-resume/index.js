// vault-resume skill implementation
// This skill handles resuming work from the last saved session checkpoint

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Main entry point for the vault-resume skill
 * @param {Object} params - Skill parameters
 * @param {string} [params.session] - Optional session ID to resume from
 */
async function vaultResume(params = {}) {
  const { session: sessionId } = params;
  
  try {
    // Step 1: Locate the previous session to resume from
    const previousSession = await locatePreviousSession(sessionId);
    if (!previousSession) {
      console.log("No sessions found to resume from. Consider using vault-execute workflow instead.");
      return null;
    }
    
    // Step 2: Determine the continuation target
    const continuationTarget = await determineContinuationTarget(previousSession);
    if (!continuationTarget) {
      console.log("Could not determine a valid continuation target.");
      return null;
    }
    
    // Ask user for confirmation before proceeding
    const confirmed = await askUserConfirmation(continuationTarget, previousSession);
    if (!confirmed) {
      console.log("Resume operation cancelled by user.");
      return null;
    }
    
    // Step 3: Load focused context for continuation
    const context = await loadContinuationContext(continuationTarget, previousSession);
    
    // Step 4: Create a continuation session
    const newSession = await createContinuationSession(continuationTarget, previousSession);
    
    // Step 5: Transition into execution
    const readyForExecution = await runReadinessCheck(continuationTarget.step);
    if (!readyForExecution) {
      console.log("Target step failed readiness check. Redirecting to refinement.");
      return { session: newSession, context, needsRefinement: true };
    }
    
    console.log(`Successfully resumed session. Continuing work on: ${continuationTarget.description}`);
    return { session: newSession, context, continuationTarget };
    
  } catch (error) {
    console.error("Error during vault resume:", error.message);
    throw error;
  }
}

/**
 * Step 1: Locate the previous session to resume from
 */
async function locatePreviousSession(sessionId) {
  const sessionsDir = '.agent-vault/05_Sessions';
  
  // Check if sessions directory exists
  if (!fs.existsSync(sessionsDir)) {
    console.log("No sessions directory found.");
    return null;
  }
  
  // Get all session files
  const sessionFiles = fs.readdirSync(sessionsDir)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(sessionsDir, file));
  
  if (sessionFiles.length === 0) {
    console.log("No session files found.");
    return null;
  }
  
  let targetSessionFile;
  
  if (sessionId) {
    // Find session by ID
    targetSessionFile = sessionFiles.find(file => {
      const content = fs.readFileSync(file, 'utf8');
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = parseYaml(frontmatterMatch[1]);
        return frontmatter.session_id === sessionId;
      }
      return false;
    });
    
    if (!targetSessionFile) {
      console.log(`Session with ID '${sessionId}' not found.`);
      return null;
    }
  } else {
    // Use most recent session (sorted by filename timestamp)
    sessionFiles.sort((a, b) => {
      const timeA = extractTimestampFromFilename(a);
      const timeB = extractTimestampFromFilename(b);
      return timeB - timeA; // Newest first
    });
    targetSessionFile = sessionFiles[0];
  }
  
  // Read and parse the session note
  const content = fs.readFileSync(targetSessionFile, 'utf8');
  const sessionData = parseSessionNote(content);
  sessionData.filePath = targetSessionFile;
  
  return sessionData;
}

/**
 * Extract timestamp from session filename.
 * Supports canonical Agent Vault session names like YYYY-MM-DD-HHMMSS-slug.md.
 */
function extractTimestampFromFilename(filename) {
  const basename = path.basename(filename, '.md');
  const match = basename.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{6})(?:-|$)/);
  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }

  const [, year, month, day, hhmmss] = match;
  const hours = hhmmss.slice(0, 2);
  const minutes = hhmmss.slice(2, 4);
  const seconds = hhmmss.slice(4, 6);
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Handle boolean values
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      // Handle array values (comma-separated)
      else if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      }
      
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Parse session note content into structured data
 */
function parseSessionNote(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch ? parseYaml(frontmatterMatch[1]) : {};
  
  const sections = {};
  const sectionRegex = /##\s+(.+?)\s*\n([\s\S]*?)(?=##\s+|$)/g;
  let match;
  
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();
    sections[sectionName] = sectionContent;
  }
  
  return {
    frontmatter,
    ...sections
  };
}

/**
 * Step 2: Determine the continuation target from the previous session
 */
async function determineContinuationTarget(previousSession) {
  const phaseLink = previousSession.frontmatter.phase;
  if (!phaseLink) {
    console.log("No phase link found in previous session.");
    return null;
  }
  
  // Extract phase number from link (e.g., "02_Phases/Phase_01_Foundation/Phase")
  const phaseNumberMatch = phaseLink.match(/Phase_(\d+)/);
  if (!phaseNumberMatch) {
    console.log("Could not extract phase number from phase link.");
    return null;
  }
  
  const phaseNumber = phaseNumberMatch[1];
  const phasePath = `.agent-vault/02_Phases/Phase_${phaseNumber.padStart(2, '0')}_*/Phase.md`;
  const phaseFiles = execSync(`find .agent-vault/02_Phases -name "Phase.md" | grep "Phase_${phaseNumber.padStart(2, '0')}"`, { encoding: 'utf8' }).trim();
  
  if (!phaseFiles) {
    console.log(`Phase ${phaseNumber} not found.`);
    return null;
  }
  
  const phaseContent = fs.readFileSync(phaseFiles, 'utf8');
  const phaseData = parseSessionNote(phaseContent);
  
  // Find steps in this phase
  const stepsDir = path.join(path.dirname(phaseFiles), 'Steps');
  const stepFiles = fs.existsSync(stepsDir)
    ? fs.readdirSync(stepsDir)
        .filter(file => file.startsWith('Step_') && file.endsWith('.md'))
        .sort()
        .map(file => path.join(stepsDir, file))
    : [];
  
  let lastActiveStep = null;
  let nextIncompleteStep = null;
  
  // Check if previous session is referenced in any step's related_sessions
  for (const stepFile of stepFiles) {
    const stepContent = fs.readFileSync(stepFile, 'utf8');
    const stepData = parseSessionNote(stepContent);
    
    if (stepData.frontmatter.related_sessions?.includes(previousSession.frontmatter.session_id)) {
      lastActiveStep = {
        filePath: stepFile,
        data: stepData,
        status: stepData.frontmatter.status || 'not-started'
      };
    }
    
    // Look for next incomplete step
    const stepStatus = stepData.frontmatter.status || 'not-started';
    if (!nextIncompleteStep && ['not-started', 'planned', 'in-progress'].includes(stepStatus)) {
      nextIncompleteStep = {
        filePath: stepFile,
        data: stepData,
        status: stepStatus
      };
    }
  }
  
  // Apply priority order to select continuation target
  let target;
  
  if (lastActiveStep && lastActiveStep.status === 'in-progress') {
    // Resume the last active step if still in progress
    target = {
      type: 'step',
      step: lastActiveStep,
      description: `Step ${path.basename(lastActiveStep.filePath, '.md')}`
    };
  } else if (nextIncompleteStep) {
    // Target next incomplete step
    target = {
      type: 'step',
      step: nextIncompleteStep,
      description: `Step ${path.basename(nextIncompleteStep.filePath, '.md')}`
    };
  } else {
    // All steps complete, target phase for close-out
    const phaseStatus = phaseData.frontmatter.status || 'in-progress';
    if (phaseStatus !== 'completed') {
      target = {
        type: 'phase',
        phase: { filePath: phaseFiles, data: phaseData },
        description: `Phase ${phaseNumber} close-out`
      };
    } else {
      // Find next planned phase
      const nextPhase = await findNextPlannedPhase(parseInt(phaseNumber));
      if (nextPhase) {
        target = {
          type: 'step',
          step: nextPhase.firstStep,
          description: `Phase ${nextPhase.number} - Step ${path.basename(nextPhase.firstStep.filePath, '.md')}`
        };
      }
    }
  }
  
  if (!target) {
    console.log("No valid continuation target found.");
    return null;
  }
  
  return target;
}

/**
 * Find the next planned phase after the given phase number
 */
async function findNextPlannedPhase(currentPhaseNumber) {
  const phasesDir = '.agent-vault/02_Phases';
  if (!fs.existsSync(phasesDir)) return null;
  
  const phaseDirs = fs.readdirSync(phasesDir)
    .filter(dir => fs.statSync(path.join(phasesDir, dir)).isDirectory())
    .sort();
  
  for (const phaseDir of phaseDirs) {
    const phaseNumberMatch = phaseDir.match(/^Phase_(\d+)/);
    if (phaseNumberMatch) {
      const phaseNumber = parseInt(phaseNumberMatch[1]);
      if (phaseNumber > currentPhaseNumber) {
        const phaseFile = path.join(phasesDir, phaseDir, 'Phase.md');
        if (fs.existsSync(phaseFile)) {
          const stepsDir = path.join(phasesDir, phaseDir, 'Steps');
          const stepFiles = fs.existsSync(stepsDir)
            ? fs.readdirSync(stepsDir)
                .filter(file => file.startsWith('Step_') && file.endsWith('.md'))
                .sort()
            : [];
          
          if (stepFiles.length > 0) {
            const firstStepFile = path.join(stepsDir, stepFiles[0]);
            const firstStepContent = fs.readFileSync(firstStepFile, 'utf8');
            const firstStepData = parseSessionNote(firstStepContent);
            
            return {
              number: phaseNumber,
              firstStep: {
                filePath: firstStepFile,
                data: firstStepData,
                status: firstStepData.frontmatter.status || 'not-started'
              }
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Ask user for confirmation before proceeding
 */
async function askUserConfirmation(continuationTarget, previousSession) {
  const lastLogEntries = previousSession['Execution Log']?.split('\n').slice(-3).join('\n') || 'No recent log entries.';
  const followUpWork = previousSession['Follow-Up Work'] || 'No follow-up work items.';
  const completionSummary = previousSession['Completion Summary'] || 'No completion summary.';
  
  const context = `
Previous session details:
- Last execution log entries:
${lastLogEntries}

- Follow-up work items:
${followUpWork}

- Completion summary:
${completionSummary}
  `;
  
  // In a real implementation, this would use the ask_user tool
  console.log("Proposed continuation target:", continuationTarget.description);
  console.log("Context from previous session:", context);
  console.log("Please confirm you want to proceed with this continuation target.");
  
  // For now, auto-confirm in this simulation
  return true;
}

/**
 * Step 3: Load focused context for continuation
 */
async function loadContinuationContext(continuationTarget, previousSession) {
  // This would use vault_traverse in a real implementation
  console.log("Loading context for continuation target...");
  
  const context = {
    target: continuationTarget,
    previousSession: previousSession,
    relatedNotes: []
  };
  
  // Load target step/phase content
  if (continuationTarget.step) {
    context.targetContent = continuationTarget.step.data;
  } else if (continuationTarget.phase) {
    context.targetContent = continuationTarget.phase.data;
  }
  
  // Load related bugs and decisions if referenced
  const relatedBugs = previousSession.frontmatter.related_bugs || [];
  const relatedDecisions = previousSession.frontmatter.related_decisions || [];
  
  // In real implementation, these would be loaded via vault_traverse or direct file reads
  
  return context;
}

/**
 * Step 4: Create a continuation session
 */
async function createContinuationSession(continuationTarget, previousSession) {
  // This would use vault_create and vault_mutate in a real implementation
  console.log("Creating continuation session...");
  
  const newSessionId = `session_${Date.now()}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const sessionFilename = `${timestamp}_Session.md`;
  const sessionPath = `.agent-vault/05_Sessions/${sessionFilename}`;
  
  // Create session frontmatter
  const frontmatter = {
    session_id: newSessionId,
    status: 'in-progress',
    created_at: new Date().toISOString(),
    phase: previousSession.frontmatter.phase,
    related_bugs: previousSession.frontmatter.related_bugs || [],
    related_decisions: previousSession.frontmatter.related_decisions || [],
    agent: 'vault-resume'
  };
  
  // Create session content
  let objective = `Resuming from [[${previousSession.frontmatter.session_id}]]. Continuing ${continuationTarget.description}.`;
  
  let followUpWork = '';
  if (previousSession['Follow-Up Work']) {
    followUpWork = previousSession['Follow-Up Work'];
  }
  
  const sessionContent = `---
${Object.entries(frontmatter)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
    }
    return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`;
  })
  .join('\n')}
---

## Objective
${objective}

## Planned Scope
${followUpWork || 'To be determined during execution.'}

## Execution Log
${new Date().toLocaleTimeString()} - Resuming from [[${previousSession.frontmatter.session_id}]]. Continuing ${continuationTarget.description}.

## Changed Paths


## Validation Run


## Findings


## Follow-Up Work


## Completion Summary
`;
  
  // Ensure sessions directory exists
  fs.mkdirSync('.agent-vault/05_Sessions', { recursive: true });
  
  // Write new session file
  fs.writeFileSync(sessionPath, sessionContent);
  
  // Update previous session status if it was in-progress
  if (previousSession.frontmatter.status === 'in-progress') {
    const updatedPreviousContent = previousSession.filePath ?
      fs.readFileSync(previousSession.filePath, 'utf8') : '';
    
    if (updatedPreviousContent) {
      const updatedContent = updatedPreviousContent.replace(
        /(status: )["']?in-progress["']?/,
        '$1"completed"'
      );
      
      // Append completion summary about handoff
      const handoffSummary = `\n\nHanded off to session [[${newSessionId}]] for continuation.`;
      const completionSummaryMatch = updatedContent.match(/(## Completion Summary\s*\n)([\s\S]*)/);
      
      if (completionSummaryMatch) {
        const finalContent = updatedContent.replace(
          /(## Completion Summary\s*\n)([\s\S]*)/,
          `$1$2${handoffSummary}`
        );
        fs.writeFileSync(previousSession.filePath, finalContent);
      }
    }
  }
  
  return {
    id: newSessionId,
    filePath: sessionPath,
    frontmatter,
    content: sessionContent
  };
}

/**
 * Step 5: Run readiness check (simulated)
 */
async function runReadinessCheck(stepData) {
  // This would implement the actual readiness checklist from vault-execute
  console.log("Running readiness check...");
  
  // Simulate success for now
  return true;
}

module.exports = { vaultResume };