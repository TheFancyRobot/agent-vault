import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { basename, join, resolve } from 'path';
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

interface OrchestrateOptions {
  agent: 'opencode' | 'claude' | 'codex';
  phase: string;
  confirm: boolean;
  retries: number;
}

// --- Constants ---

const AGENT_NAMES = ['opencode', 'claude', 'codex'] as const;
type AgentName = (typeof AGENT_NAMES)[number];

const COMPLETED_STATUSES = new Set(['done', 'completed', 'closed', 'cancelled']);
const SKIP_STATUSES = new Set([
  'done', 'completed', 'closed', 'cancelled',
  'blocked', 'on-hold', 'waiting', 'waiting-on-dependency',
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

const buildCommand = (
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

const spawnAgent = (cmd: string, args: string[], cwd: string): Promise<number> =>
  new Promise((res, rej) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], cwd });
    child.on('close', (code) => res(code ?? 1));
    child.on('error', rej);
  });

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

    const { cmd, args } = buildCommand(agent, phaseId, step.id);
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

// --- Argument Parsing ---

const HELP_TEXT = `Usage: agent-vault orchestrate <phase> [options]

Orchestrate a vault phase by executing each step in a fresh agent
context with automatic context clearing between steps.

Arguments:
  <phase>             Phase number or ID (e.g., "1", "01", "PHASE-01")

Options:
  --agent <name>      Agent CLI to use: opencode, claude, codex
                      (default: auto-detect, prefers opencode > claude > codex)
  --confirm           Pause for user confirmation between steps
  --retry <n>         Max retries per step if not completed (default: 3)
  -h, --help          Show this help message

Examples:
  agent-vault orchestrate 1
  agent-vault orchestrate PHASE-02 --agent claude --confirm
  agent-vault orchestrate 3 --agent opencode --retry 5
`;

const parseOrchestrateArgs = (argv: string[]): OrchestrateOptions => {
  let agent: string | undefined;
  let phase: string | undefined;
  let confirm = false;
  let retries = 3;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--agent' && i + 1 < argv.length) {
      agent = argv[++i];
    } else if (arg === '--phase' && i + 1 < argv.length) {
      phase = argv[++i];
    } else if (arg === '--confirm') {
      confirm = true;
    } else if (arg === '--retry' && i + 1 < argv.length) {
      retries = parseInt(argv[++i], 10);
      if (isNaN(retries) || retries < 0) throw new Error('--retry must be a non-negative integer');
    } else if (!arg.startsWith('--') && !phase) {
      phase = arg;
    }
  }

  if (!phase) {
    throw new Error('Phase is required.\n\n' + HELP_TEXT);
  }

  if (agent && !(AGENT_NAMES as readonly string[]).includes(agent)) {
    throw new Error(`Unknown agent "${agent}". Must be one of: ${AGENT_NAMES.join(', ')}`);
  }

  return { agent: agent as AgentName, phase, confirm, retries };
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

  // Load phase and steps
  const phase = await findPhase(vaultRoot, options.phase);
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

  // Display plan
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${phase.id}: ${phase.title}`);
  console.log(`  Agent: ${options.agent} | Steps: ${pending.length}/${allSteps.length} pending | Retries: ${options.retries}`);
  console.log(`${'='.repeat(60)}`);

  // Execute steps sequentially
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
