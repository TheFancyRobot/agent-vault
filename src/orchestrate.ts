import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { basename, join, relative, resolve } from 'path';
import { createInterface } from 'node:readline/promises';
import yaml from 'js-yaml';
import { resolveVaultRoot, readUtf8File } from './core/vault-files.js';

// --- Types ---

interface StepInfo {
  readonly id: string;
  readonly path: string;
  readonly status: string;
  readonly title: string;
}

interface PhaseInfo {
  readonly id: string;
  readonly path: string;
  readonly status: string;
  readonly title: string;
  readonly dirPath: string;
}

interface BugInfo {
  readonly bugId: string;
  readonly path: string;
  readonly status: string;
  readonly severity: string;
  readonly title: string;
}

interface OrchestrateOptions {
  mode: 'phase' | 'bugs';
  agent: 'opencode' | 'claude' | 'codex';
  phase?: string;
  confirm: boolean;
  retries: number;
  severity?: string;
  bugIds?: string[];
}

// --- Constants ---

const AGENT_NAMES = ['opencode', 'claude', 'codex'] as const;
type AgentName = (typeof AGENT_NAMES)[number];

const COMPLETED_STATUSES = new Set(['done', 'completed', 'closed', 'cancelled']);
const SKIP_STATUSES = new Set([
  'done', 'completed', 'closed', 'cancelled',
  'blocked', 'on-hold', 'waiting', 'waiting-on-dependency',
]);

const BUG_SKIP_STATUSES = new Set([
  'closed', 'fixed-awaiting-verification', 'fixed-awaiting-retest',
  'wont-fix', 'not-a-bug', 'duplicate',
]);

const BUG_DONE_STATUSES = new Set([
  'closed', 'fixed-awaiting-verification', 'fixed-awaiting-retest',
]);

const CLAUDE_ALLOWED_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent', 'Skill',
  'mcp__agent-vault__vault_traverse',
  'mcp__agent-vault__vault_mutate',
  'mcp__agent-vault__vault_create',
  'mcp__agent-vault__vault_refresh',
  'mcp__agent-vault__vault_validate',
  'mcp__agent-vault__vault_scan',
  'mcp__agent-vault__vault_config',
  'mcp__agent-vault__vault_help',
  'mcp__agent-vault__vault_init',
].join(',');

// --- Helpers ---

const readFrontmatter = async (filePath: string): Promise<Record<string, unknown>> => {
  const content = await readUtf8File(filePath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  return (yaml.load(match[1]) as Record<string, unknown>) ?? {};
};

const titleFromFilename = (filename: string): string =>
  basename(filename, '.md')
    .replace(/^Step_\d+_\d+_?/, '')
    .replace(/_/g, ' ')
    .trim() || basename(filename, '.md');

const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const severityRank = (severity: string): number => {
  const match = /^sev-(\d+)$/i.exec(severity.trim());
  return match ? Number(match[1]) : 999;
};

// --- Phase & Step Discovery ---

const findPhase = async (vaultRoot: string, input: string): Promise<PhaseInfo> => {
  const phasesDir = join(vaultRoot, '02_Phases');
  if (!existsSync(phasesDir)) throw new Error(`No phases directory: ${phasesDir}`);

  const entries = await readdir(phasesDir, { withFileTypes: true });
  const normalized = input.replace(/^PHASE-?0*/i, '').replace(/^0+/, '') || '0';

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^Phase_(\d+)/i);
    if (!match) continue;
    if ((match[1].replace(/^0+/, '') || '0') !== normalized) continue;

    const dirPath = join(phasesDir, entry.name);
    const phasePath = join(dirPath, 'Phase.md');
    if (!existsSync(phasePath)) throw new Error(`Phase note missing: ${phasePath}`);

    const fm = await readFrontmatter(phasePath);
    const padded = match[1].padStart(2, '0');

    return {
      id: `PHASE-${padded}`,
      path: phasePath,
      status: String(fm.status ?? 'planned'),
      title: String(fm.title ?? entry.name.replace(/^Phase_\d+_?/, '').replace(/_/g, ' ')),
      dirPath,
    };
  }

  throw new Error(`Phase "${input}" not found`);
};

const loadSteps = async (phase: PhaseInfo): Promise<StepInfo[]> => {
  const stepsDir = join(phase.dirPath, 'Steps');
  if (!existsSync(stepsDir)) return [];

  const files = (await readdir(stepsDir)).filter(f => f.endsWith('.md')).sort();
  const steps: StepInfo[] = [];

  for (const file of files) {
    const match = file.match(/^Step_(\d+)_(\d+)/i);
    if (!match) continue;
    const filePath = join(stepsDir, file);
    const fm = await readFrontmatter(filePath);
    steps.push({
      id: `STEP-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`,
      path: filePath,
      status: String(fm.status ?? 'planned'),
      title: titleFromFilename(file),
    });
  }

  return steps;
};

// --- Bug Discovery ---

const loadBugs = async (vaultRoot: string): Promise<BugInfo[]> => {
  const bugsDir = join(vaultRoot, '03_Bugs');
  if (!existsSync(bugsDir)) return [];

  const files = (await readdir(bugsDir)).filter(f => f.endsWith('.md')).sort();
  const bugs: BugInfo[] = [];

  for (const file of files) {
    const filePath = join(bugsDir, file);
    const fm = await readFrontmatter(filePath);
    if (fm.note_type !== 'bug') continue;

    bugs.push({
      bugId: String(fm.bug_id ?? basename(file, '.md')),
      path: filePath,
      status: String(fm.status ?? 'new'),
      severity: String(fm.severity ?? 'sev-3'),
      title: String(fm.title ?? basename(file, '.md')),
    });
  }

  return bugs;
};

// --- Agent CLI ---

const isAvailable = (cmd: string): Promise<boolean> =>
  new Promise((res) => {
    const child = spawn('which', [cmd], { stdio: 'ignore' });
    child.on('close', (code) => res(code === 0));
    child.on('error', () => res(false));
  });

const detectAgent = async (): Promise<AgentName> => {
  for (const agent of AGENT_NAMES) {
    if (await isAvailable(agent)) return agent;
  }
  throw new Error('No agent CLI found in PATH (opencode, claude, or codex)');
};

const buildStepCommand = (
  agent: AgentName,
  phaseId: string,
  stepId: string,
): { cmd: string; args: string[] } => {
  switch (agent) {
    case 'opencode':
      return { cmd: 'opencode', args: ['run', `/vault:execute ${phaseId} ${stepId}`] };
    case 'claude':
      return {
        cmd: 'claude',
        args: ['-p', `/vault:execute ${phaseId} ${stepId}`, '--allowedTools', CLAUDE_ALLOWED_TOOLS],
      };
    case 'codex':
      return {
        cmd: 'codex',
        args: ['exec', `/prompts:vault-execute ${phaseId} ${stepId}`, '--full-auto'],
      };
  }
};

const buildBugCommand = (
  agent: AgentName,
  bug: BugInfo,
  projectRoot: string,
): { cmd: string; args: string[] } => {
  const bugRelPath = relative(projectRoot, bug.path);
  const today = new Date().toISOString().slice(0, 10);

  const prompt = [
    `Fix bug ${bug.bugId}: "${bug.title}" (severity: ${bug.severity}).`,
    '',
    `The bug is documented at: ${bugRelPath}`,
    'Read the bug note for full context including reproduction steps, observed/expected behavior, and suspected root cause.',
    '',
    'Workflow:',
    '1. Load the bug note and related context via vault_traverse.',
    '2. Investigate the codebase to identify the root cause.',
    `3. Implement the fix with incremental commits. Reference ${bug.bugId} in commit messages.`,
    '4. Add or update tests to prevent regression.',
    '5. After fixing, update the bug note:',
    `   - Set frontmatter status to "closed" and fixed_on to "${today}" via vault_mutate update_frontmatter.`,
    '   - Document the confirmed root cause in the "Confirmed Root Cause" section via vault_mutate append_section.',
  ].join('\n');

  switch (agent) {
    case 'opencode':
      return { cmd: 'opencode', args: ['run', prompt] };
    case 'claude':
      return { cmd: 'claude', args: ['-p', prompt, '--allowedTools', CLAUDE_ALLOWED_TOOLS] };
    case 'codex':
      return { cmd: 'codex', args: ['exec', prompt, '--full-auto'] };
  }
};

const spawnAgent = (cmd: string, args: string[], cwd: string): Promise<number> =>
  new Promise((res, rej) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], cwd });
    child.on('close', (code) => res(code ?? 1));
    child.on('error', rej);
  });

// --- Git Helpers ---

const execGit = (args: string[], cwd: string): Promise<string> =>
  new Promise((res, rej) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    child.on('close', (code) => code === 0 ? res(out.trim()) : rej(new Error(`git ${args.join(' ')} failed`)));
    child.on('error', rej);
  });

const gitCurrentBranch = (cwd: string): Promise<string> =>
  execGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);

const gitCheckout = (cwd: string, branch: string, create = false): Promise<string> =>
  execGit(create ? ['checkout', '-b', branch] : ['checkout', branch], cwd);

const gitBranchExists = async (cwd: string, branch: string): Promise<boolean> => {
  try {
    await execGit(['rev-parse', '--verify', branch], cwd);
    return true;
  } catch {
    return false;
  }
};

const gitIsClean = async (cwd: string): Promise<boolean> => {
  const status = await execGit(['status', '--porcelain'], cwd);
  return status.length === 0;
};

// --- Step Execution ---

const executeStep = async (
  agent: AgentName,
  phaseId: string,
  step: StepInfo,
  maxRetries: number,
  projectRoot: string,
): Promise<boolean> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) console.log(`\n  Retry ${attempt}/${maxRetries}...`);

    const { cmd, args } = buildStepCommand(agent, phaseId, step.id);
    console.log(`  > ${cmd} ${args.join(' ')}\n`);

    try {
      await spawnAgent(cmd, args, projectRoot);
    } catch (err) {
      console.error(`  Agent error: ${err instanceof Error ? err.message : err}`);
    }

    // Re-read step status from disk after agent exits
    const fm = await readFrontmatter(step.path);
    const status = String(fm.status ?? '');

    if (COMPLETED_STATUSES.has(status)) return true;

    if (attempt < maxRetries) {
      console.log(`  Status: ${status || 'unknown'} (not completed)`);
    }
  }

  return false;
};

// --- Bug Execution ---

const executeBug = async (
  agent: AgentName,
  bug: BugInfo,
  maxRetries: number,
  projectRoot: string,
): Promise<boolean> => {
  const branchName = `fix/${bug.bugId.toLowerCase()}-${slugify(bug.title)}`;
  const originalBranch = await gitCurrentBranch(projectRoot);

  if (await gitBranchExists(projectRoot, branchName)) {
    console.log(`  Branch ${branchName} already exists, resuming...`);
    await gitCheckout(projectRoot, branchName);
  } else {
    await gitCheckout(projectRoot, branchName, true);
    console.log(`  Created branch: ${branchName}`);
  }

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) console.log(`\n  Retry ${attempt}/${maxRetries}...`);

      const { cmd, args } = buildBugCommand(agent, bug, projectRoot);
      console.log(`  > ${cmd} ... [bug-fix prompt]\n`);

      try {
        await spawnAgent(cmd, args, projectRoot);
      } catch (err) {
        console.error(`  Agent error: ${err instanceof Error ? err.message : err}`);
      }

      // Re-read bug status from disk
      const fm = await readFrontmatter(bug.path);
      const status = String(fm.status ?? '');

      if (BUG_DONE_STATUSES.has(status)) return true;

      if (attempt < maxRetries) {
        console.log(`  Status: ${status || 'unknown'} (not resolved)`);
      }
    }

    return false;
  } finally {
    try {
      await gitCheckout(projectRoot, originalBranch);
    } catch {
      console.error(`  Warning: could not return to branch ${originalBranch}`);
    }
  }
};

// --- Argument Parsing ---

const HELP_TEXT = `Usage: agent-vault orchestrate <phase|bugs> [options]

Orchestrate vault work by executing each unit in a fresh agent context
with automatic context clearing between units.

Modes:
  <phase>             Execute steps in a phase (e.g., "1", "01", "PHASE-01")
  bugs                Triage and fix open bugs, each on its own branch

Options:
  --agent <name>      Agent CLI to use: opencode, claude, codex
                      (default: auto-detect, prefers opencode > claude > codex)
  --confirm           Pause for user confirmation between units
  --retry <n>         Max retries per unit if not completed (default: 3)
  --severity <sev-N>  (bugs mode) Only fix bugs at this severity or higher
  -h, --help          Show this help message

Examples:
  agent-vault orchestrate 1
  agent-vault orchestrate PHASE-02 --agent claude --confirm
  agent-vault orchestrate bugs
  agent-vault orchestrate bugs --severity sev-2 --agent opencode
  agent-vault orchestrate bugs BUG-0001 BUG-0003
  agent-vault orchestrate fix all bugs
`;

const BUG_MODE_KEYWORDS = new Set(['bugs', 'bug', 'fix', 'all']);

const parseOrchestrateArgs = (argv: string[]): OrchestrateOptions => {
  let agent: string | undefined;
  let confirm = false;
  let retries = 3;
  let severity: string | undefined;
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--agent' && i + 1 < argv.length) {
      agent = argv[++i];
    } else if (arg === '--confirm') {
      confirm = true;
    } else if (arg === '--retry' && i + 1 < argv.length) {
      retries = parseInt(argv[++i], 10);
      if (isNaN(retries) || retries < 0) throw new Error('--retry must be a non-negative integer');
    } else if (arg === '--severity' && i + 1 < argv.length) {
      severity = argv[++i];
    } else if (!arg.startsWith('--')) {
      positionals.push(arg);
    }
  }

  if (agent && !(AGENT_NAMES as readonly string[]).includes(agent)) {
    throw new Error(`Unknown agent "${agent}". Must be one of: ${AGENT_NAMES.join(', ')}`);
  }

  // Detect mode from positional arguments
  const hasBugKeyword = positionals.some(p => BUG_MODE_KEYWORDS.has(p.toLowerCase()));

  if (hasBugKeyword) {
    const bugIds = positionals
      .filter(p => /^BUG-\d+$/i.test(p))
      .map(p => p.toUpperCase());

    return {
      mode: 'bugs',
      agent: agent as AgentName,
      confirm,
      retries,
      severity,
      bugIds: bugIds.length > 0 ? bugIds : undefined,
    };
  }

  const phase = positionals[0];
  if (!phase) {
    throw new Error('Phase or "bugs" is required.\n\n' + HELP_TEXT);
  }

  return { mode: 'phase', agent: agent as AgentName, phase, confirm, retries };
};

// --- Phase Orchestration ---

const orchestratePhase = async (
  options: OrchestrateOptions,
  vaultRoot: string,
  projectRoot: string,
): Promise<void> => {
  const phase = await findPhase(vaultRoot, options.phase!);
  const allSteps = await loadSteps(phase);

  if (allSteps.length === 0) {
    console.log(`No steps found in ${phase.id}`);
    return;
  }

  const pending = allSteps.filter(s => !SKIP_STATUSES.has(s.status));
  if (pending.length === 0) {
    console.log(`All steps in ${phase.id} are completed or blocked.`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phase.id}: ${phase.title}`);
  console.log(`  Agent: ${options.agent} | Steps: ${pending.length}/${allSteps.length} pending | Retries: ${options.retries}`);
  console.log(`${'='.repeat(60)}`);

  for (const [i, step] of pending.entries()) {
    console.log(`\n--- [${i + 1}/${pending.length}] ${step.id}: ${step.title} ---`);

    if (options.confirm) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question('  Execute? [Y/n] ');
      rl.close();
      if (answer.trim().toLowerCase() === 'n') {
        console.log('  Skipped.');
        continue;
      }
    }

    const t0 = Date.now();
    const ok = await executeStep(options.agent, phase.id, step, options.retries, projectRoot);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);

    if (ok) {
      console.log(`  Completed (${elapsed}s)`);
    } else {
      console.error(`\n  FAILED after ${options.retries + 1} attempts (${elapsed}s). Stopping.`);
      process.exit(1);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phase.id} orchestration complete`);
  console.log(`${'='.repeat(60)}\n`);
};

// --- Bug Orchestration ---

const orchestrateBugs = async (
  options: OrchestrateOptions,
  vaultRoot: string,
  projectRoot: string,
): Promise<void> => {
  if (!(await gitIsClean(projectRoot))) {
    throw new Error('Working tree has uncommitted changes. Commit or stash before running bug orchestration.');
  }

  const allBugs = await loadBugs(vaultRoot);
  if (allBugs.length === 0) {
    console.log('No bug notes found in the vault.');
    return;
  }

  // Filter to open bugs
  let pending = allBugs.filter(b => !BUG_SKIP_STATUSES.has(b.status.toLowerCase()));

  // Apply specific bug ID filter
  if (options.bugIds && options.bugIds.length > 0) {
    const idSet = new Set(options.bugIds);
    pending = pending.filter(b => idSet.has(b.bugId));
  }

  // Apply severity filter (only bugs at this severity or more severe)
  if (options.severity) {
    const maxRank = severityRank(options.severity);
    pending = pending.filter(b => severityRank(b.severity) <= maxRank);
  }

  // Sort by severity (most severe first), then by bug ID
  pending.sort((a, b) => {
    const sevDiff = severityRank(a.severity) - severityRank(b.severity);
    return sevDiff !== 0 ? sevDiff : a.bugId.localeCompare(b.bugId);
  });

  if (pending.length === 0) {
    console.log('No open bugs match the given filters.');
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('  Bug Orchestration');
  console.log(`  Agent: ${options.agent} | Bugs: ${pending.length} open | Retries: ${options.retries}`);
  if (options.severity) console.log(`  Severity filter: ${options.severity} or higher`);
  console.log(`${'='.repeat(60)}`);

  const results: { bug: BugInfo; ok: boolean; elapsed: string; branch: string }[] = [];

  for (const [i, bug] of pending.entries()) {
    const branch = `fix/${bug.bugId.toLowerCase()}-${slugify(bug.title)}`;
    console.log(`\n--- [${i + 1}/${pending.length}] ${bug.bugId}: ${bug.title} (${bug.severity}) ---`);

    if (options.confirm) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question('  Fix this bug? [Y/n] ');
      rl.close();
      if (answer.trim().toLowerCase() === 'n') {
        console.log('  Skipped.');
        continue;
      }
    }

    const t0 = Date.now();
    const ok = await executeBug(options.agent, bug, options.retries, projectRoot);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    results.push({ bug, ok, elapsed, branch });

    if (ok) {
      console.log(`  Fixed (${elapsed}s) -> branch: ${branch}`);
    } else {
      console.error(`  FAILED after ${options.retries + 1} attempts (${elapsed}s)`);
    }
  }

  // Summary
  const fixed = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);

  console.log(`\n${'='.repeat(60)}`);
  console.log('  Bug Orchestration Complete');
  console.log(`  Fixed: ${fixed.length} | Failed: ${failed.length}`);
  if (fixed.length > 0) {
    console.log('\n  Fix branches:');
    for (const r of fixed) {
      console.log(`    ${r.bug.bugId}: ${r.branch}`);
    }
  }
  if (failed.length > 0) {
    console.log('\n  Failed bugs:');
    for (const r of failed) {
      console.log(`    ${r.bug.bugId}: ${r.bug.title}`);
    }
  }
  console.log(`${'='.repeat(60)}\n`);

  if (failed.length > 0) {
    process.exit(1);
  }
};

// --- Main ---

export const orchestrate = async (argv: string[]): Promise<void> => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP_TEXT);
    return;
  }

  const options = parseOrchestrateArgs(argv);

  // Auto-detect agent if not specified
  if (!options.agent) {
    options.agent = await detectAgent();
    console.log(`Auto-detected agent: ${options.agent}`);
  }

  // Resolve vault and project root
  const vaultRoot = resolveVaultRoot(process.cwd());
  const projectRoot = resolve(vaultRoot, '..');

  if (options.mode === 'bugs') {
    await orchestrateBugs(options, vaultRoot, projectRoot);
  } else {
    await orchestratePhase(options, vaultRoot, projectRoot);
  }
};
