import { existsSync } from 'fs';
import { readFile, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from '../core/note-generators';
import {
  handleCreatePhaseCommand,
  handleCreateStepCommand,
  handleCreateDecisionCommand,
} from '../core/note-generators';
import { updateFrontmatter, replaceGeneratedBlock, replaceHeadingSection } from '../core/note-mutations';

export interface PlanningBackfillResult {
  readonly found: boolean;
  readonly phasesImported: number;
  readonly stepsImported: number;
  readonly decisionsImported: number;
  readonly architectureLinksCreated: number;
  readonly roadmapBackfilled: boolean;
  readonly projectContextBackfilled: boolean;
  readonly warnings: string[];
  readonly architectureReviewPrompt?: string;
}

interface GsdPhase {
  readonly number: string;
  readonly name: string;
  readonly dirPath: string;
  readonly status: 'planned' | 'in-progress' | 'done';
  readonly plans: GsdPlan[];
  readonly summaries: GsdSummary[];
}

interface GsdPlan {
  readonly phaseNumber: string;
  readonly planNumber: string;
  readonly filePath: string;
  readonly title: string;
  readonly tasks: string[];
}

interface GsdSummary {
  readonly filePath: string;
  readonly keyDecisions: string[];
  readonly completed: string | undefined;
  readonly patternsEstablished: string[];
  readonly subsystem: string | undefined;
  readonly techStackAdded: string[];
  readonly keyFilesCreated: string[];
  readonly keyFilesModified: string[];
}

const EMPTY_RESULT: PlanningBackfillResult = {
  found: false,
  phasesImported: 0,
  stepsImported: 0,
  decisionsImported: 0,
  architectureLinksCreated: 0,
  roadmapBackfilled: false,
  projectContextBackfilled: false,
  warnings: [],
};

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns a simple key-value map (flat fields and arrays).
 */
const parseFrontmatter = (content: string): Record<string, unknown> => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, unknown> = {};

  let currentKey = '';
  let currentArray: string[] | null = null;

  for (const line of yaml.split('\n')) {
    // Array item continuation
    if (currentArray !== null && /^\s+-\s+/.test(line)) {
      const value = line.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '').trim();
      if (value.length > 0) currentArray.push(value);
      continue;
    }

    // Flush any pending array
    if (currentArray !== null) {
      result[currentKey] = currentArray;
      currentArray = null;
    }

    // Empty inline array: key: []
    const emptyArrayMatch = /^(\w[\w-]*):\s*\[\]\s*$/.exec(line);
    if (emptyArrayMatch) {
      result[emptyArrayMatch[1]] = [];
      continue;
    }

    // Inline array: key: [a, b, c]
    const inlineArrayMatch = /^(\w[\w-]*):\s*\[(.+)\]\s*$/.exec(line);
    if (inlineArrayMatch) {
      result[inlineArrayMatch[1]] = inlineArrayMatch[2]
        .split(',')
        .map((v) => v.replace(/^["'\s]+|["'\s]+$/g, '').trim())
        .filter((v) => v.length > 0);
      continue;
    }

    // Key with no value (start of block array or nested object)
    // Matches both top-level and indented keys (e.g. "tech-stack:" or "  added:")
    const blockStartMatch = /^\s*(\w[\w-]*):\s*$/.exec(line);
    if (blockStartMatch) {
      currentKey = blockStartMatch[1];
      currentArray = [];
      continue;
    }

    // Simple key: value
    const kvMatch = /^(\w[\w-]*):\s+(.+)$/.exec(line);
    if (kvMatch) {
      const value = kvMatch[2].replace(/^["']|["']$/g, '').trim();
      result[kvMatch[1]] = value;
    }
  }

  if (currentArray !== null) {
    result[currentKey] = currentArray;
  }

  return result;
};

/**
 * Extract the body text after frontmatter.
 */
const getBody = (content: string): string => {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(content);
  return match ? content.slice(match[0].length) : content;
};

/**
 * Extract task names from GSD plan XML-style task blocks.
 */
const extractTaskNames = (content: string): string[] => {
  const tasks: string[] = [];
  const regex = /<name>(.*?)<\/name>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    if (name.length > 0) tasks.push(name);
  }
  return tasks;
};

/**
 * Extract the <objective> text from a plan.
 */
const extractObjective = (content: string): string | undefined => {
  const match = /<objective>([\s\S]*?)<\/objective>/i.exec(content);
  if (!match) return undefined;
  // Clean up: strip Purpose/Output lines, collapse whitespace
  return match[1]
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('Purpose:') && !l.startsWith('Output:'))
    .join(' ')
    .trim() || undefined;
};

/**
 * Scan .planning/phases/ for GSD phase directories.
 */
const scanPlanningPhases = async (planningDir: string): Promise<GsdPhase[]> => {
  const phasesDir = join(planningDir, 'phases');
  if (!existsSync(phasesDir)) return [];

  const entries = await readdir(phasesDir, { withFileTypes: true });
  const phases: GsdPhase[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // GSD phase dirs are like "01-foundation", "02-core-features"
    const phaseMatch = /^(\d+)-(.+)$/.exec(entry.name);
    if (!phaseMatch) continue;

    const phaseNumber = phaseMatch[1];
    const phaseName = phaseMatch[2].replace(/-/g, ' ');
    const phaseDir = join(phasesDir, entry.name);

    // Read plans and summaries
    let phaseFiles: string[];
    try {
      phaseFiles = await readdir(phaseDir);
    } catch {
      continue;
    }

    const plans: GsdPlan[] = [];
    const summaries: GsdSummary[] = [];
    for (const file of phaseFiles) {
      const filePath = join(phaseDir, file);

      if (file.endsWith('-PLAN.md')) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const objective = extractObjective(content);
          const title = objective ?? phaseName;
          const tasks = extractTaskNames(content);
          const planMatch = /^(\d+)-(\d+)-PLAN\.md$/.exec(file);
          plans.push({
            phaseNumber,
            planNumber: planMatch?.[2] ?? '01',
            filePath,
            title,
            tasks,
          });
        } catch {
          // skip unreadable plans
        }
      }

      if (file.endsWith('-SUMMARY.md')) {
        try {
          const content = await readFile(filePath, 'utf-8');
          const summaryFm = parseFrontmatter(content);
          const keyDecisions = Array.isArray(summaryFm['key-decisions'])
            ? (summaryFm['key-decisions'] as string[])
            : [];
          const patternsEstablished = Array.isArray(summaryFm['patterns-established'])
            ? (summaryFm['patterns-established'] as string[])
            : [];
          const completed = typeof summaryFm.completed === 'string' ? summaryFm.completed : undefined;
          const subsystem = typeof summaryFm.subsystem === 'string' ? summaryFm.subsystem : undefined;
          // tech-stack.added and key-files.created/modified are nested —
          // our flat parser puts sub-keys like "added", "created", "modified" as top-level
          // when they appear after a parent key with no inline value.
          const techStackAdded = Array.isArray(summaryFm.added) ? (summaryFm.added as string[]) : [];
          const keyFilesCreated = Array.isArray(summaryFm.created) ? (summaryFm.created as string[]) : [];
          const keyFilesModified = Array.isArray(summaryFm.modified) ? (summaryFm.modified as string[]) : [];
          summaries.push({
            filePath, keyDecisions, completed, patternsEstablished,
            subsystem, techStackAdded, keyFilesCreated, keyFilesModified,
          });
        } catch {
          // skip unreadable summaries
        }
      }
    }

    // Determine phase status
    let status: 'planned' | 'in-progress' | 'done' = 'planned';
    if (summaries.length > 0 && summaries.every((s) => s.completed)) {
      status = 'done';
    } else if (plans.length > 0 || summaries.length > 0) {
      status = 'in-progress';
    }

    phases.push({
      number: phaseNumber,
      name: phaseName,
      dirPath: phaseDir,
      status,
      plans,
      summaries,
    });
  }

  // Sort by phase number
  phases.sort((a, b) => Number(a.number) - Number(b.number));
  return phases;
};

/**
 * Read a section from a markdown file by heading name.
 * Returns the content under the heading until the next heading of equal or higher level.
 */
const extractSection = (content: string, heading: string): string | undefined => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^(#{1,6})\\s+${escapedHeading}\\s*$`, 'm');
  const match = regex.exec(content);
  if (!match) return undefined;

  const level = match[1].length;
  const startIndex = match.index + match[0].length;
  const rest = content.slice(startIndex);

  // Find next heading of equal or higher level
  const nextHeadingRegex = new RegExp(`^#{1,${level}}\\s+`, 'm');
  const nextMatch = nextHeadingRegex.exec(rest);
  const sectionContent = nextMatch ? rest.slice(0, nextMatch.index) : rest;

  return sectionContent.trim() || undefined;
};

/**
 * Backfill vault from a .planning/ directory.
 *
 * Called during initVault() after scaffold is created. Uses the existing
 * vault command handlers to create notes, ensuring all backreferences and
 * generated blocks are properly maintained.
 */
export async function backfillFromPlanning(
  projectRoot: string,
  vaultRoot: string,
): Promise<PlanningBackfillResult> {
  const planningDir = join(projectRoot, '.planning');
  if (!existsSync(planningDir)) return EMPTY_RESULT;

  const warnings: string[] = [];
  let phasesImported = 0;
  let stepsImported = 0;
  let decisionsImported = 0;
  let roadmapBackfilled = false;
  let projectContextBackfilled = false;

  // Suppress stdout from command handlers during backfill
  const silentIO: AgentVaultCommandIO = {
    stdout: () => {},
    stderr: (msg) => warnings.push(msg),
  };
  const env: AgentVaultCommandEnvironment = { vaultRoot, io: silentIO };

  // ── 1. Scan phases ────────────────────────────────────────────────────
  const phases = await scanPlanningPhases(planningDir);

  // ── 2. Create vault phase notes ───────────────────────────────────────
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseTitle = titleCase(phase.name);
    const argv = [phaseTitle, '--phase-number', phase.number];

    const exitCode = await handleCreatePhaseCommand(argv, env);
    if (exitCode === 0) {
      phasesImported++;

      // Update phase status if not planned
      if (phase.status !== 'planned') {
        const { handleUpdateFrontmatterCommand } = await import('../core/note-generators');
        const phaseSlug = slugify(phaseTitle);
        const phasePath = `02_Phases/Phase_${phase.number.padStart(2, '0')}_${phaseSlug}/Phase.md`;
        await handleUpdateFrontmatterCommand(
          [phasePath, '--set', `status=${phase.status}`],
          env,
        );
      }

      // ── 2a. Create step notes from plan tasks ───────────────────────
      // Collect tasks across all plans for this phase
      const allTasks: Array<{ name: string; planNumber: string }> = [];
      for (const plan of phase.plans) {
        for (const task of plan.tasks) {
          allTasks.push({ name: task, planNumber: plan.planNumber });
        }
      }

      for (let stepIdx = 0; stepIdx < allTasks.length; stepIdx++) {
        const task = allTasks[stepIdx];
        const stepNumber = String(stepIdx + 1);
        const stepExitCode = await handleCreateStepCommand(
          [phase.number, stepNumber, task.name],
          env,
        );
        if (stepExitCode === 0) {
          stepsImported++;
        }
      }
    }
  }

  // ── 3. Extract decisions from summaries ───────────────────────────────
  const allDecisions: Array<{ text: string; phaseNumber: string }> = [];
  for (const phase of phases) {
    for (const summary of phase.summaries) {
      for (const decision of summary.keyDecisions) {
        allDecisions.push({ text: decision, phaseNumber: phase.number });
      }
    }
  }

  for (const decision of allDecisions) {
    // Strip any leading "Decision N:" prefix from GSD format
    const cleanTitle = decision.text.replace(/^Decision\s+\d+:\s*/i, '').trim();
    if (cleanTitle.length === 0) continue;

    const phaseId = `PHASE-${decision.phaseNumber.padStart(2, '0')}`;
    const exitCode = await handleCreateDecisionCommand(
      [cleanTitle, '--phase', phaseId],
      env,
    );
    if (exitCode === 0) decisionsImported++;
  }

  // ── 3a. Populate Decisions Index with backfilled decisions ────────────
  if (decisionsImported > 0) {
    const decisionsIndexPath = join(vaultRoot, '00_Home', 'Decisions_Index.md');
    if (existsSync(decisionsIndexPath)) {
      try {
        let indexContent = await readFile(decisionsIndexPath, 'utf-8');
        // Collect decision file wiki links
        const decisionFiles = (await readdir(join(vaultRoot, '04_Decisions'))).filter((f) => f.endsWith('.md'));
        if (decisionFiles.length > 0) {
          const decisionLinks = decisionFiles.map((f) => {
            const baseName = f.replace(/\.md$/, '');
            return `- [[04_Decisions/${baseName}|${baseName.replace(/_/g, ' ')}]]`;
          });
          const date = new Date().toISOString().slice(0, 10);
          const blockContent = [`_Last rebuilt: ${date}._`, '', ...decisionLinks].join('\n');
          indexContent = replaceGeneratedBlock(indexContent, 'decisions-index', blockContent).content;
          await writeFile(decisionsIndexPath, indexContent, 'utf-8');
        }
      } catch {
        warnings.push('Failed to populate Decisions Index with backfilled decisions');
      }
    }
  }

  // ── 4. Link phases + steps to architecture notes & enrich stubs ────────
  let architectureLinksCreated = 0;

  // Architecture note wiki links (stable paths from the stubs)
  const ARCH_SYSTEM_OVERVIEW = '[[01_Architecture/System_Overview|System Overview]]';
  const ARCH_CODE_MAP = '[[01_Architecture/Code_Map|Code Map]]';
  const ARCH_DOMAIN_MODEL = '[[01_Architecture/Domain_Model|Domain Model]]';
  const ARCH_INTEGRATION_MAP = '[[01_Architecture/Integration_Map|Integration Map]]';

  // Subsystems that signal Integration Map relevance
  const INTEGRATION_SUBSYSTEMS = new Set(['api', 'infra', 'infrastructure', 'integration', 'networking']);
  // Subsystems that signal Domain Model relevance
  const DOMAIN_SUBSYSTEMS = new Set(['database', 'auth', 'data', 'domain', 'model', 'payments', 'users']);

  // Collect architecture enrichment data and per-phase arch links in one pass
  const allKeyFiles: string[] = [];
  const allTechStack: string[] = [];
  const allPatterns: string[] = [];
  const phaseArchLinks = new Map<string, string[]>(); // phaseNumber → wiki links
  const linkSummary: Array<{ phase: string; links: string[] }> = [];

  for (const phase of phases) {
    const archLinks = new Set<string>();

    if (phase.summaries.length > 0) {
      for (const summary of phase.summaries) {
        archLinks.add(ARCH_SYSTEM_OVERVIEW);

        if (summary.keyFilesCreated.length > 0 || summary.keyFilesModified.length > 0) {
          archLinks.add(ARCH_CODE_MAP);
          allKeyFiles.push(...summary.keyFilesCreated, ...summary.keyFilesModified);
        }

        if (summary.subsystem) {
          const sub = summary.subsystem.toLowerCase();
          if (INTEGRATION_SUBSYSTEMS.has(sub)) archLinks.add(ARCH_INTEGRATION_MAP);
          if (DOMAIN_SUBSYSTEMS.has(sub)) archLinks.add(ARCH_DOMAIN_MODEL);
        }

        if (summary.techStackAdded.length > 0) {
          archLinks.add(ARCH_CODE_MAP);
          allTechStack.push(...summary.techStackAdded);
        }

        allPatterns.push(...summary.patternsEstablished);
      }
    } else {
      // Phases without summaries get System Overview as default
      archLinks.add(ARCH_SYSTEM_OVERVIEW);
    }

    const archLinkArray = [...archLinks];
    phaseArchLinks.set(phase.number, archLinkArray);

    // Build display names for the review prompt
    const displayNames = archLinkArray.map((link) => {
      const match = /\|([^\]]+)\]\]$/.exec(link);
      return match ? match[1] : link;
    });
    linkSummary.push({ phase: `Phase ${phase.number} (${titleCase(phase.name)})`, links: displayNames });

    // Update the phase note
    const phaseSlug = slugify(titleCase(phase.name));
    const phaseDir = `Phase_${phase.number.padStart(2, '0')}_${phaseSlug}`;
    const phasePath = join(vaultRoot, '02_Phases', phaseDir, 'Phase.md');

    if (existsSync(phasePath)) {
      try {
        let content = await readFile(phasePath, 'utf-8');
        content = updateFrontmatter(content, { related_architecture: archLinkArray }, phasePath).content;
        const blockLines = archLinkArray.map((link) => `- ${link}`).join('\n');
        content = replaceGeneratedBlock(content, 'phase-related-architecture', blockLines).content;
        await writeFile(phasePath, content, 'utf-8');
        architectureLinksCreated += archLinks.size;
      } catch {
        warnings.push(`Failed to add architecture links to phase ${phase.number}`);
      }
    }

    // Update step notes — inject architecture links into Required Reading
    const stepsDir = join(vaultRoot, '02_Phases', phaseDir, 'Steps');
    if (existsSync(stepsDir)) {
      try {
        const stepFiles = (await readdir(stepsDir)).filter((f) => f.endsWith('.md'));
        const readingLines = archLinkArray.map((link) => `- ${link}`).join('\n');
        for (const stepFile of stepFiles) {
          const stepPath = join(stepsDir, stepFile);
          try {
            let content = await readFile(stepPath, 'utf-8');
            content = replaceHeadingSection(content, 'Required Reading', readingLines).content;
            await writeFile(stepPath, content, 'utf-8');
          } catch {
            warnings.push(`Failed to add architecture links to step ${stepFile}`);
          }
        }
      } catch {
        warnings.push(`Failed to read steps directory for phase ${phase.number}`);
      }
    }
  }

  // Enrich architecture stubs with collected data
  await enrichArchitectureStub(vaultRoot, 'Code_Map', 'architecture-important-paths',
    allKeyFiles.map((f) => `- \`${f}\``), warnings);
  await enrichArchitectureStub(vaultRoot, 'System_Overview', 'architecture-key-components',
    [
      ...allTechStack.map((t) => `- ${t}`),
      ...allPatterns.map((p) => `- ${p}`),
    ], warnings);

  // ── 5. Backfill roadmap from ROADMAP.md ───────────────────────────────
  const roadmapPath = join(planningDir, 'ROADMAP.md');
  if (existsSync(roadmapPath)) {
    try {
      const roadmapContent = await readFile(roadmapPath, 'utf-8');
      const vaultRoadmapPath = join(vaultRoot, '00_Home', 'Roadmap.md');
      if (existsSync(vaultRoadmapPath)) {
        const existing = await readFile(vaultRoadmapPath, 'utf-8');
        // Append a "GSD Roadmap Context" section if not already present
        if (!existing.includes('## Imported GSD Roadmap')) {
          const phaseSummary = extractSection(roadmapContent, 'Phases')
            ?? extractSection(roadmapContent, 'Overview')
            ?? getBody(roadmapContent).slice(0, 2000);

          if (phaseSummary.length > 0) {
            const appendix = [
              '',
              '## Imported GSD Roadmap',
              '',
              '> Imported from `.planning/ROADMAP.md` during vault initialization.',
              '',
              phaseSummary,
              '',
            ].join('\n');

            await writeFile(vaultRoadmapPath, existing + appendix, 'utf-8');
            roadmapBackfilled = true;
          }
        }
      }
    } catch {
      warnings.push('Failed to read .planning/ROADMAP.md');
    }
  }

  // ── 5. Backfill project context from PROJECT.md ───────────────────────
  const projectPath = join(planningDir, 'PROJECT.md');
  if (existsSync(projectPath)) {
    try {
      const projectContent = await readFile(projectPath, 'utf-8');
      const activeContextPath = join(vaultRoot, '00_Home', 'Active_Context.md');
      if (existsSync(activeContextPath)) {
        const existing = await readFile(activeContextPath, 'utf-8');
        if (!existing.includes('## Imported GSD Project Context')) {
          const coreValue = extractSection(projectContent, 'Core Value')
            ?? extractSection(projectContent, 'What This Is');
          const requirements = extractSection(projectContent, 'Requirements');
          const constraints = extractSection(projectContent, 'Constraints');

          const contextParts: string[] = [
            '',
            '## Imported GSD Project Context',
            '',
            '> Imported from `.planning/PROJECT.md` during vault initialization.',
            '',
          ];

          if (coreValue) {
            contextParts.push('### Core Value', '', coreValue, '');
          }
          if (requirements) {
            contextParts.push('### Requirements', '', requirements, '');
          }
          if (constraints) {
            contextParts.push('### Constraints', '', constraints, '');
          }

          if (contextParts.length > 5) {
            await writeFile(activeContextPath, existing + contextParts.join('\n'), 'utf-8');
            projectContextBackfilled = true;
          }
        }
      }
    } catch {
      warnings.push('Failed to read .planning/PROJECT.md');
    }
  }

  // Build architecture review prompt if deterministic links were created
  let architectureReviewPrompt: string | undefined;
  if (architectureLinksCreated > 0 && linkSummary.length > 0) {
    const linkReport = linkSummary
      .map((entry) => `- ${entry.phase}: ${entry.links.join(', ')}`)
      .join('\n');

    architectureReviewPrompt = [
      'Architecture links were created deterministically during .planning/ import using keyword matching.',
      'Please review and correct them. The following links were assigned:',
      '',
      linkReport,
      '',
      'Available architecture notes: System Overview, Code Map, Agent Workflow, Domain Model, Integration Map.',
      '',
      'For each phase, read its vault note and the linked .planning/ source to verify:',
      '1. Are any linked architecture notes irrelevant? Remove them via vault_mutate (update related_architecture frontmatter and phase-related-architecture block).',
      '2. Are any architecture notes missing? A phase that defines domain concepts should link Domain Model. A phase that adds external integrations should link Integration Map. A phase that changes project structure should link Code Map.',
      '3. Agent Workflow was never linked automatically — add it to any phase that changes how agents interact with the codebase.',
      '',
      'Use vault_mutate to fix any incorrect links. Update both the related_architecture frontmatter list and the phase-related-architecture generated block.',
    ].join('\n');
  }

  return {
    found: true,
    phasesImported,
    stepsImported,
    decisionsImported,
    architectureLinksCreated,
    roadmapBackfilled,
    projectContextBackfilled,
    warnings,
    architectureReviewPrompt,
  };
}

/**
 * Enrich an architecture stub's generated block with imported data.
 * Only writes if the stub still has its placeholder content.
 */
const enrichArchitectureStub = async (
  vaultRoot: string,
  stubName: string,
  blockName: string,
  lines: string[],
  warnings: string[],
): Promise<void> => {
  if (lines.length === 0) return;

  const stubPath = join(vaultRoot, '01_Architecture', `${stubName}.md`);
  if (!existsSync(stubPath)) return;

  try {
    let content = await readFile(stubPath, 'utf-8');
    // Only enrich if the block still has placeholder content
    if (!content.includes('To be populated after vault initialization.')) return;

    const uniqueLines = [...new Set(lines)];
    content = replaceGeneratedBlock(content, blockName, uniqueLines.join('\n')).content;
    await writeFile(stubPath, content, 'utf-8');
  } catch {
    warnings.push(`Failed to enrich architecture stub ${stubName}`);
  }
};

const titleCase = (s: string): string =>
  s
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'note';
};
