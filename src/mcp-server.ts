import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from './core/note-generators';
import {
  handleCreatePhaseCommand,
  handleCreateStepCommand,
  handleCreateSessionCommand,
  handleCreateBugCommand,
  handleCreateDecisionCommand,
  handleUpdateFrontmatterCommand,
  handleAppendSectionCommand,
  handleRebuildIndexesCommand,
  handleRefreshActiveContextCommand,
  handleRefreshAllHomeNotesCommand,
} from './core/note-generators';
import {
  handleValidateFrontmatterCommand,
  handleValidateNoteStructureCommand,
  handleValidateRequiredLinksCommand,
  handleDetectOrphansCommand,
  handleValidateAllCommand,
  handleVaultDoctorCommand,
} from './core/note-validators';
import { formatCommandCatalog, formatCommandHelp } from './core/command-catalog';
import {
  ensureVaultGraph,
  formatVaultTraverseResultAsJson,
  formatVaultTraverseResultAsToon,
  invalidateVaultGraphCache,
  traverseVaultGraph,
} from './core/vault-graph';
import { readVaultConfig, updateVaultConfig } from './core/vault-config';
import { resolveVaultRoot } from './core/vault-files';
import { initVault } from './scaffold/init';
import { scanProject } from './scaffold/scan';

type CommandHandler = (argv: string[], environment?: AgentVaultCommandEnvironment) => Promise<number>;

const captureOutput = async (handler: CommandHandler, argv: string[], vaultRoot: string) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: AgentVaultCommandIO = {
    stdout: (msg) => stdout.push(msg),
    stderr: (msg) => stderr.push(msg),
  };
  const exitCode = await handler(argv, { vaultRoot, io });
  const output = [...stdout, ...stderr].join('\n');
  return {
    content: [{ type: 'text' as const, text: output || (exitCode === 0 ? 'OK' : 'Command failed') }],
    isError: exitCode !== 0,
  };
};

const noArgs = (handler: CommandHandler) => captureOutput(handler, [], resolveVaultRoot(process.cwd()));

export async function startServer(): Promise<void> {
  const server = new McpServer({ name: 'agent-vault', version: '0.0.1' });

  // ── vault_init ──────────────────────────────────────────────────────
  server.tool(
    'vault_init',
    'Initialize an Agent Vault in the project. Creates .agent-vault/ scaffold with templates, home notes, architecture stubs, and .obsidian config. Runs a filesystem scan and returns structured project metadata.',
    { project_root: z.string().optional().describe('Project root directory. Defaults to cwd.') },
    async ({ project_root }) => {
      const root = project_root || process.cwd();
      const result = await initVault(root);
      const config = await readVaultConfig(result.vaultRoot);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            vaultRoot: result.vaultRoot,
            created: result.created,
            filesWritten: result.filesWritten,
            config,
            scan: result.scan,
          }, null, 2),
        }],
      };
    },
  );

  // ── vault_scan ──────────────────────────────────────────────────────
  server.tool(
    'vault_scan',
    'Scan the project filesystem and return structured metadata: languages, frameworks, package manager, monorepo shape, key directories, test framework, build system, CI system, and entry points.',
    { project_root: z.string().optional().describe('Project root directory. Defaults to cwd.') },
    async ({ project_root }) => {
      const result = await scanProject(project_root || process.cwd());
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── vault_create ────────────────────────────────────────────────────
  server.tool(
    'vault_create',
    [
      'Create a vault note. The `type` field selects the note kind:',
      '- "phase": Create a phase folder + note. Params: title (required), phase_number, previous.',
      '- "step": Create a step inside a phase. Params: title, phase_number, step_number (all required).',
      '- "session": Create a timestamped session linked to a step. Params: related_step (required), agent.',
      '- "bug": Create a bug note. Params: title (required), bug_id, step, session.',
      '- "decision": Create a decision note. Params: title (required), decision_id, phase, session, bug.',
    ].join('\n'),
    {
      type: z.enum(['phase', 'step', 'session', 'bug', 'decision']).describe('Note type to create'),
      title: z.string().optional().describe('Note title (required for phase, step, bug, decision)'),
      phase_number: z.string().optional().describe('Phase number (step: required; phase: optional, auto-generated)'),
      step_number: z.string().optional().describe('Step number (required for step)'),
      previous: z.string().optional().describe('Previous phase ID for linkage (phase only)'),
      related_step: z.string().optional().describe('Step ID to link (required for session)'),
      agent: z.string().optional().describe('Agent name (session only)'),
      bug_id: z.string().optional().describe('Bug ID, auto-generated if omitted (bug only)'),
      decision_id: z.string().optional().describe('Decision ID, auto-generated if omitted (decision only)'),
      phase: z.string().optional().describe('Related phase ID (decision only)'),
      session: z.string().optional().describe('Related session ID (bug, decision)'),
      bug: z.string().optional().describe('Related bug ID (decision only)'),
      step: z.string().optional().describe('Related step ID (bug only)'),
    },
    async (input) => {
      const vaultRoot = resolveVaultRoot(process.cwd());

      switch (input.type) {
        case 'phase': {
          if (!input.title) return { content: [{ type: 'text', text: 'title is required for phase' }], isError: true };
          const argv = [input.title];
          if (input.phase_number) argv.push('--phase-number', input.phase_number);
          if (input.previous) argv.push('--previous', input.previous);
          return captureOutput(handleCreatePhaseCommand, argv, vaultRoot);
        }

        case 'step': {
          if (!input.phase_number || !input.step_number || !input.title) {
            return { content: [{ type: 'text', text: 'phase_number, step_number, and title are required for step' }], isError: true };
          }
          return captureOutput(handleCreateStepCommand, [input.phase_number, input.step_number, input.title], vaultRoot);
        }

        case 'session': {
          if (!input.related_step) return { content: [{ type: 'text', text: 'related_step is required for session' }], isError: true };
          const argv = [input.related_step];
          if (input.agent) argv.push('--agent', input.agent);
          return captureOutput(handleCreateSessionCommand, argv, vaultRoot);
        }

        case 'bug': {
          if (!input.title) return { content: [{ type: 'text', text: 'title is required for bug' }], isError: true };
          const argv = [input.title];
          if (input.bug_id) argv.push('--bug-id', input.bug_id);
          if (input.step) argv.push('--step', input.step);
          if (input.session) argv.push('--session', input.session);
          return captureOutput(handleCreateBugCommand, argv, vaultRoot);
        }

        case 'decision': {
          if (!input.title) return { content: [{ type: 'text', text: 'title is required for decision' }], isError: true };
          const argv = [input.title];
          if (input.decision_id) argv.push('--decision-id', input.decision_id);
          if (input.phase) argv.push('--phase', input.phase);
          if (input.session) argv.push('--session', input.session);
          if (input.bug) argv.push('--bug', input.bug);
          return captureOutput(handleCreateDecisionCommand, argv, vaultRoot);
        }
      }
    },
  );

  // ── vault_traverse ──────────────────────────────────────────────────
  server.tool(
    'vault_traverse',
    [
      'Traverse connected vault notes for agent context loading.',
      '- Depth controls how many hops away from the root note are included.',
      '- Filters narrow the returned notes without including unresolved links.',
      '- TOON is the default output format for token-efficient structured context.',
      '- The resolver defaults to the vault config (obsidian when available, filesystem otherwise).',
      '- Obsidian CLI provides richer link resolution; filesystem is the automatic fallback.',
    ].join('\n'),
    {
      root: z.string().describe('Starting note path or wiki target, e.g. "02_Phases/Phase_01_Foundation/Phase"'),
      depth: z.number().int().min(0).max(10).describe('Traversal depth from the root note'),
      direction: z.enum(['outgoing', 'incoming', 'both']).default('outgoing').describe('Traversal direction'),
      format: z.enum(['toon', 'json']).default('toon').describe('Response format'),
      include_content: z.boolean().default(false).describe('Include bounded note content excerpts'),
      note_type: z.array(z.string()).optional().describe('Optional note_type filter for returned notes'),
      status: z.array(z.string()).optional().describe('Optional status filter for returned notes'),
      max_notes: z.number().int().min(1).max(5000).default(500).describe('Safety cap for returned notes'),
      resolver: z.enum(['filesystem', 'obsidian']).optional().describe('Link resolver override. Defaults to vault config.'),
    },
    async ({ root, depth, direction, format, include_content, note_type, status, max_notes, resolver }) => {
      const vaultRoot = resolveVaultRoot(process.cwd());
      const config = await readVaultConfig(vaultRoot);
      const effectiveResolver = resolver ?? config.resolver;
      const { graph, warnings } = await ensureVaultGraph(vaultRoot, effectiveResolver);
      const result = traverseVaultGraph(graph, {
        root,
        depth,
        direction,
        includeContent: include_content,
        noteTypes: note_type,
        statuses: status,
        maxNotes: max_notes,
        resolver: effectiveResolver,
      }, warnings);

      const text = format === 'json'
        ? formatVaultTraverseResultAsJson(result)
        : formatVaultTraverseResultAsToon(result);

      return { content: [{ type: 'text', text }] };
    },
  );

  // ── vault_mutate ────────────────────────────────────────────────────
  server.tool(
    'vault_mutate',
    [
      'Mutate an existing vault note. The `action` field selects the operation:',
      '- "update_frontmatter": Update YAML frontmatter fields. Params: note_path, updates (Record<string,string>).',
      '- "append_section": Append text to a heading section. Params: note_path, heading, content.',
    ].join('\n'),
    {
      action: z.enum(['update_frontmatter', 'append_section']).describe('Mutation action'),
      note_path: z.string().describe('Note path relative to vault root'),
      updates: z.record(z.string(), z.string()).optional().describe('Key-value pairs to set (update_frontmatter)'),
      heading: z.string().optional().describe('Heading text to append under (append_section)'),
      content: z.string().optional().describe('Content to append (append_section)'),
    },
    async (input) => {
      const vaultRoot = resolveVaultRoot(process.cwd());

      switch (input.action) {
        case 'update_frontmatter': {
          if (!input.updates || Object.keys(input.updates).length === 0) {
            return { content: [{ type: 'text', text: 'updates is required for update_frontmatter' }], isError: true };
          }
          const argv = [input.note_path];
          for (const [key, value] of Object.entries(input.updates)) {
            argv.push('--set', `${key}=${value}`);
          }
          const result = await captureOutput(handleUpdateFrontmatterCommand, argv, vaultRoot);
          invalidateVaultGraphCache(vaultRoot);
          return result;
        }

        case 'append_section': {
          if (!input.heading || !input.content) {
            return { content: [{ type: 'text', text: 'heading and content are required for append_section' }], isError: true };
          }
          const result = await captureOutput(
            handleAppendSectionCommand,
            [input.note_path, '--heading', input.heading, '--content', input.content],
            vaultRoot,
          );
          invalidateVaultGraphCache(vaultRoot);
          return result;
        }
      }
    },
  );

  // ── vault_refresh ───────────────────────────────────────────────────
  server.tool(
    'vault_refresh',
    [
      'Refresh generated home-note content from vault metadata.',
      '- target "all" (default): rebuild indexes + refresh active context.',
      '- target "indexes": rebuild bugs and decisions index tables only.',
      '- target "active_context": refresh focus, blockers, and critical bugs only.',
    ].join('\n'),
    {
      target: z.enum(['all', 'indexes', 'active_context']).default('all').describe('What to refresh'),
    },
    async ({ target }) => {
      switch (target) {
        case 'all': return noArgs(handleRefreshAllHomeNotesCommand);
        case 'indexes': return noArgs(handleRebuildIndexesCommand);
        case 'active_context': return noArgs(handleRefreshActiveContextCommand);
      }
    },
  );

  // ── vault_validate ──────────────────────────────────────────────────
  server.tool(
    'vault_validate',
    [
      'Validate vault integrity. Runs read-only checks and reports issues.',
      '- target "all" (default): run all four validators.',
      '- target "frontmatter": check YAML frontmatter shape and required keys.',
      '- target "structure": check required headings and generated-block balance.',
      '- target "links": check required inter-note links.',
      '- target "orphans": detect notes with no inbound links.',
      '- target "doctor": strict health report (validation + summary).',
    ].join('\n'),
    {
      target: z.enum(['all', 'frontmatter', 'structure', 'links', 'orphans', 'doctor']).default('all').describe('What to validate'),
    },
    async ({ target }) => {
      switch (target) {
        case 'all': return noArgs(handleValidateAllCommand);
        case 'frontmatter': return noArgs(handleValidateFrontmatterCommand);
        case 'structure': return noArgs(handleValidateNoteStructureCommand);
        case 'links': return noArgs(handleValidateRequiredLinksCommand);
        case 'orphans': return noArgs(handleDetectOrphansCommand);
        case 'doctor': return noArgs(handleVaultDoctorCommand);
      }
    },
  );

  // ── vault_config ────────────────────────────────────────────────────
  server.tool(
    'vault_config',
    [
      'View or update vault configuration (.agent-vault/.config.json).',
      '- With no parameters: returns current config.',
      '- resolver: set the default link resolver ("obsidian" or "filesystem").',
      '  Obsidian CLI is preferred when available and provides richer link resolution.',
    ].join('\n'),
    {
      resolver: z.enum(['filesystem', 'obsidian']).optional().describe('Set the default link resolver'),
    },
    async ({ resolver }) => {
      const vaultRoot = resolveVaultRoot(process.cwd());
      if (resolver) {
        const config = await updateVaultConfig(vaultRoot, { resolver });
        return { content: [{ type: 'text', text: JSON.stringify(config, null, 2) }] };
      }
      const config = await readVaultConfig(vaultRoot);
      return { content: [{ type: 'text', text: JSON.stringify(config, null, 2) }] };
    },
  );

  // ── vault_help ──────────────────────────────────────────────────────
  server.tool(
    'vault_help',
    'List all vault commands or show detailed help for a specific command.',
    { command: z.string().optional().describe('Command name to get help for') },
    async ({ command }) => {
      const text = command
        ? formatCommandHelp(command as Parameters<typeof formatCommandHelp>[0])
        : formatCommandCatalog();
      return { content: [{ type: 'text', text }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
