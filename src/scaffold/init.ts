import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { probeObsidianCli, readVaultConfig, writeVaultConfig } from '../core/vault-config';
import { scanProject, type ScanResult } from './scan';
import { backfillFromPlanning, type PlanningBackfillResult } from './backfill-planning';
import { writeCodeGraph } from './code-graph';
import { AGENT_VAULT_MARKER, ROOT_AGENTS_MD_SECTION } from '../templates/root-agents-md';

// Templates
import {
  PHASE_TEMPLATE,
  STEP_TEMPLATE,
  BUG_TEMPLATE,
  DECISION_TEMPLATE,
  SESSION_TEMPLATE,
  ARCHITECTURE_TEMPLATE,
  NOTE_CONTRACTS,
} from '../templates/note-templates';
import {
  ACTIVE_CONTEXT_TEMPLATE,
  BUGS_INDEX_TEMPLATE,
  DECISIONS_INDEX_TEMPLATE,
  DASHBOARD_TEMPLATE,
  INBOX_TEMPLATE,
  ROADMAP_TEMPLATE,
} from '../templates/home';
import {
  CODING_STANDARDS,
  PROMPT_STANDARDS,
  BUG_TAXONOMY,
  DEFINITION_OF_DONE,
  AGENT_WORKFLOW_PLAYBOOKS,
} from '../templates/shared-knowledge';
import {
  SYSTEM_OVERVIEW_STUB,
  CODE_MAP_STUB,
  AGENT_WORKFLOW_STUB,
  DOMAIN_MODEL_STUB,
  INTEGRATION_MAP_STUB,
} from '../templates/architecture';
import { AGENTS_MD_TEMPLATE } from '../templates/agents-md';
import { README_MD_TEMPLATE } from '../templates/readme';
import {
  OBSIDIAN_APP_CONFIG,
  OBSIDIAN_APPEARANCE_CONFIG,
  OBSIDIAN_COMMUNITY_PLUGINS,
  OBSIDIAN_CORE_PLUGINS,
  OBSIDIAN_GRAPH_CONFIG,
} from '../templates/obsidian-config';

export interface InitResult {
  readonly vaultRoot: string;
  readonly created: boolean;
  readonly scan: ScanResult;
  readonly filesWritten: number;
  readonly planningBackfill?: PlanningBackfillResult;
  readonly codeGraph?: { totalFiles: number; totalSymbols: number };
}

const fillPlaceholders = (content: string, scan: ScanResult): string => {
  const repoShape = scan.monorepo
    ? `${scan.packageManager} monorepo${scan.monorepoShape ? ` (${scan.monorepoShape})` : ''}`
    : `${scan.packageManager} project`;

  const primaryStack = [
    scan.primaryLanguage,
    ...scan.frameworks.slice(0, 3),
  ].filter(Boolean).join(', ');

  return content
    .replace(/\{\{repo_name\}\}/g, scan.repoName)
    .replace(/\{\{repo_shape\}\}/g, repoShape)
    .replace(/\{\{primary_stack\}\}/g, primaryStack || scan.primaryLanguage)
    .replace(/\{\{primary_language\}\}/g, scan.primaryLanguage)
    .replace(/\{\{framework\}\}/g, scan.frameworks[0] ?? 'none detected');
};

const writeIfNotExists = async (filePath: string, content: string): Promise<boolean> => {
  try {
    await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EEXIST') {
      return false;
    }
    throw error;
  }
};

export async function initVault(projectRoot: string): Promise<InitResult> {
  const vaultRoot = join(projectRoot, '.agent-vault');
  const alreadyExists = existsSync(vaultRoot);

  // Create directory tree
  const dirs = [
    '00_Home',
    '01_Architecture',
    '02_Phases',
    '03_Bugs',
    '04_Decisions',
    '05_Sessions',
    '06_Shared_Knowledge',
    '07_Templates',
    '.obsidian',
  ];

  for (const dir of dirs) {
    await mkdir(join(vaultRoot, dir), { recursive: true });
  }

  // Run scan
  const scan = await scanProject(projectRoot);

  let filesWritten = 0;

  // Write templates (07_Templates/)
  const templates: Array<[string, string]> = [
    ['07_Templates/Phase_Template.md', PHASE_TEMPLATE],
    ['07_Templates/Step_Template.md', STEP_TEMPLATE],
    ['07_Templates/Bug_Template.md', BUG_TEMPLATE],
    ['07_Templates/Decision_Template.md', DECISION_TEMPLATE],
    ['07_Templates/Session_Template.md', SESSION_TEMPLATE],
    ['07_Templates/Architecture_Template.md', ARCHITECTURE_TEMPLATE],
    ['07_Templates/Note_Contracts.md', NOTE_CONTRACTS],
  ];

  for (const [path, content] of templates) {
    if (await writeIfNotExists(join(vaultRoot, path), content)) filesWritten++;
  }

  // Write home notes with filled placeholders (00_Home/)
  const homeNotes: Array<[string, string]> = [
    ['00_Home/Active_Context.md', fillPlaceholders(ACTIVE_CONTEXT_TEMPLATE, scan)],
    ['00_Home/Bugs_Index.md', fillPlaceholders(BUGS_INDEX_TEMPLATE, scan)],
    ['00_Home/Decisions_Index.md', fillPlaceholders(DECISIONS_INDEX_TEMPLATE, scan)],
    ['00_Home/Dashboard.md', fillPlaceholders(DASHBOARD_TEMPLATE, scan)],
    ['00_Home/Inbox.md', fillPlaceholders(INBOX_TEMPLATE, scan)],
    ['00_Home/Roadmap.md', fillPlaceholders(ROADMAP_TEMPLATE, scan)],
  ];

  for (const [path, content] of homeNotes) {
    if (await writeIfNotExists(join(vaultRoot, path), content)) filesWritten++;
  }

  // Write shared knowledge (06_Shared_Knowledge/)
  const sharedKnowledge: Array<[string, string]> = [
    ['06_Shared_Knowledge/Coding_Standards.md', CODING_STANDARDS],
    ['06_Shared_Knowledge/Prompt_Standards.md', PROMPT_STANDARDS],
    ['06_Shared_Knowledge/Bug_Taxonomy.md', BUG_TAXONOMY],
    ['06_Shared_Knowledge/Definition_Of_Done.md', DEFINITION_OF_DONE],
    ['06_Shared_Knowledge/Agent_Workflow_Playbooks.md', AGENT_WORKFLOW_PLAYBOOKS],
  ];

  for (const [path, content] of sharedKnowledge) {
    if (await writeIfNotExists(join(vaultRoot, path), content)) filesWritten++;
  }

  // Write architecture stubs (01_Architecture/)
  const archStubs: Array<[string, string]> = [
    ['01_Architecture/System_Overview.md', fillPlaceholders(SYSTEM_OVERVIEW_STUB, scan)],
    ['01_Architecture/Code_Map.md', fillPlaceholders(CODE_MAP_STUB, scan)],
    ['01_Architecture/Agent_Workflow.md', fillPlaceholders(AGENT_WORKFLOW_STUB, scan)],
    ['01_Architecture/Domain_Model.md', fillPlaceholders(DOMAIN_MODEL_STUB, scan)],
    ['01_Architecture/Integration_Map.md', fillPlaceholders(INTEGRATION_MAP_STUB, scan)],
  ];

  for (const [path, content] of archStubs) {
    if (await writeIfNotExists(join(vaultRoot, path), content)) filesWritten++;
  }

  // Write AGENTS.md and README.md
  if (await writeIfNotExists(join(vaultRoot, 'AGENTS.md'), fillPlaceholders(AGENTS_MD_TEMPLATE, scan))) filesWritten++;
  if (await writeIfNotExists(join(vaultRoot, 'README.md'), fillPlaceholders(README_MD_TEMPLATE, scan))) filesWritten++;

  // Write .obsidian configs
  const obsidianConfigs: Array<[string, unknown]> = [
    ['.obsidian/app.json', OBSIDIAN_APP_CONFIG],
    ['.obsidian/appearance.json', OBSIDIAN_APPEARANCE_CONFIG],
    ['.obsidian/community-plugins.json', OBSIDIAN_COMMUNITY_PLUGINS],
    ['.obsidian/core-plugins.json', OBSIDIAN_CORE_PLUGINS],
    ['.obsidian/graph.json', OBSIDIAN_GRAPH_CONFIG],
  ];

  for (const [path, config] of obsidianConfigs) {
    if (await writeIfNotExists(join(vaultRoot, path), JSON.stringify(config, null, 2) + '\n')) filesWritten++;
  }

  // Write or append Agent Vault section to project-root AGENTS.md
  const rootAgentsPath = join(projectRoot, 'AGENTS.md');
  if (existsSync(rootAgentsPath)) {
    const existing = await readFile(rootAgentsPath, 'utf-8');
    if (!existing.includes(AGENT_VAULT_MARKER)) {
      const separator = existing.endsWith('\n') ? '\n' : '\n\n';
      await writeFile(rootAgentsPath, existing + separator + ROOT_AGENTS_MD_SECTION, 'utf-8');
      filesWritten++;
    }
  } else {
    await writeFile(rootAgentsPath, `# AGENTS\n\n${ROOT_AGENTS_MD_SECTION}`, 'utf-8');
    filesWritten++;
  }

  // Configure resolver — prefer obsidian CLI when available
  const existingConfig = await readVaultConfig(vaultRoot);
  if (existingConfig.resolver === 'filesystem') {
    const obsidianAvailable = await probeObsidianCli();
    if (obsidianAvailable) {
      await writeVaultConfig(vaultRoot, { ...existingConfig, resolver: 'obsidian' });
    }
  }

  // Backfill from .planning/ directory if present (only on fresh init)
  let planningBackfill: PlanningBackfillResult | undefined;
  if (!alreadyExists) {
    planningBackfill = await backfillFromPlanning(projectRoot, vaultRoot);
    if (planningBackfill.found) {
      filesWritten += planningBackfill.phasesImported
        + planningBackfill.stepsImported
        + planningBackfill.decisionsImported
        + (planningBackfill.roadmapBackfilled ? 1 : 0)
        + (planningBackfill.projectContextBackfilled ? 1 : 0);
    }
  }

  // Build code graph (always, even on re-init — code changes)
  let codeGraph: { totalFiles: number; totalSymbols: number } | undefined;
  try {
    const graph = await writeCodeGraph(projectRoot, vaultRoot, scan.repoName);
    codeGraph = { totalFiles: graph.totalFiles, totalSymbols: graph.totalSymbols };
    filesWritten++; // Code_Graph.md
  } catch {
    // Non-fatal — code graph is supplementary
  }

  return {
    vaultRoot,
    created: !alreadyExists,
    scan,
    filesWritten,
    planningBackfill,
    codeGraph,
  };
}
