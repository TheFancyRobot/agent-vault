import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { dirname } from 'path';
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
import { formatCodeGraphLookupResultsAsToon, loadCodeGraphIndex, queryCodeGraphIndex } from './core/code-graph-lookup';
import { formatInitResultAsToon, formatScanResultAsToon, formatVaultConfigAsToon } from './core/mcp-response-format';
import {
  ensureVaultGraph,
  formatVaultTraverseResultAsJson,
  formatVaultTraverseResultAsToon,
  invalidateVaultGraphCache,
  traverseVaultGraph,
} from './core/vault-graph';
import { readVaultConfig, updateVaultConfig } from './core/vault-config';
import { isProjectVault, resolveVaultRoot } from './core/vault-files';
import { initVault } from './scaffold/init';
import { scanProject } from './scaffold/scan';
import { writeCodeGraph } from './scaffold/code-graph';

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
    'Initialize `.agent-vault/`, scan the project, and backfill from `.planning/` when present.',
    { project_root: z.string().optional().describe('Project root. Defaults to cwd.') },
    async ({ project_root }) => {
      const root = project_root || process.cwd();
      const result = await initVault(root);
      const config = await readVaultConfig(result.vaultRoot);
      return {
        content: [{
          type: 'text',
          text: formatInitResultAsToon(result, config),
        }],
      };
    },
  );

  // ── vault_scan ──────────────────────────────────────────────────────
  server.tool(
    'vault_scan',
    'Scan the project and return compact metadata such as languages, frameworks, package manager, key paths, tests, build, CI, and entry points.',
    { project_root: z.string().optional().describe('Project root. Defaults to cwd.') },
    async ({ project_root }) => {
      const result = await scanProject(project_root || process.cwd());
      return { content: [{ type: 'text', text: formatScanResultAsToon(result) }] };
    },
  );

  // ── vault_create ────────────────────────────────────────────────────
  server.tool(
    'vault_create',
    'Create a phase, step, session, bug, or decision note.',
    {
      type: z.enum(['phase', 'step', 'session', 'bug', 'decision']).describe('Note type to create'),
      title: z.string().optional().describe('Note title (required for phase, step, bug, decision)'),
      phase_number: z.string().optional().describe('Phase number (step: required; phase: optional, auto-generated)'),
      step_number: z.string().optional().describe('Step number (required for step)'),
      previous: z.string().optional().describe('Previous phase ID for linkage (phase only)'),
      insert_before: z.string().optional().describe('Insert before this phase, shifting existing phases forward (phase only)'),
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
          if (input.insert_before) argv.push('--insert-before', input.insert_before);
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
    'Load linked vault context from a root note. TOON is the default compact format.',
    {
      root: z.string().describe('Root note path or wikilink target.'),
      depth: z.number().int().min(0).max(10).describe('Traversal depth.'),
      direction: z.enum(['outgoing', 'incoming', 'both']).default('outgoing').describe('Link direction.'),
      format: z.enum(['toon', 'json']).default('toon').describe('Output format.'),
      include_content: z.boolean().default(false).describe('Include bounded content excerpts.'),
      note_type: z.array(z.string()).optional().describe('Optional note_type filter.'),
      status: z.array(z.string()).optional().describe('Optional status filter.'),
      max_notes: z.number().int().min(1).max(5000).default(500).describe('Max notes returned.'),
      resolver: z.enum(['filesystem', 'obsidian']).optional().describe('Resolver override.'),
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

  // ── vault_lookup_code_graph ───────────────────────────────────────
  server.tool(
    'vault_lookup_code_graph',
    'Search the compact code-graph index for matching symbols and files. Returns TOON; compact mode is the default.',
    {
      query: z.string().describe('Case-insensitive symbol substring.'),
      limit: z.number().int().min(1).max(200).default(10).describe('Max matches.'),
      path_substring: z.string().optional().describe('Optional file-path filter.'),
      exported_only: z.boolean().default(false).describe('Only exported/public symbols.'),
      compact: z.boolean().default(true).describe('Use grouped compact TOON output.'),
    },
    async ({ query, limit, path_substring, exported_only, compact }) => {
      try {
        const vaultRoot = resolveVaultRoot(process.cwd());
        const index = await loadCodeGraphIndex(vaultRoot);
        const matches = queryCodeGraphIndex(index, {
          query,
          limit,
          pathSubstring: path_substring,
          exportedOnly: exported_only,
        });
        return {
          content: [{
            type: 'text',
            text: formatCodeGraphLookupResultsAsToon(index, matches, query, { compact }),
          }],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Failed to query code graph index: ${err instanceof Error ? err.message : String(err)}`,
          }],
        };
      }
    },
  );

  // ── vault_mutate ────────────────────────────────────────────────────
  server.tool(
    'vault_mutate',
    'Safely update note frontmatter or append to a named section.',
    {
      action: z.enum(['update_frontmatter', 'append_section']).describe('Mutation action.'),
      note_path: z.string().describe('Path relative to vault root.'),
      updates: z.record(z.string(), z.string()).optional().describe('Fields to set.'),
      heading: z.string().optional().describe('Target heading.'),
      content: z.string().optional().describe('Content to append.'),
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
    'Refresh generated indexes, active context, or the code graph.',
    {
      target: z.enum(['all', 'indexes', 'active_context', 'code_graph']).default('all').describe('Refresh target.'),
    },
    async ({ target }) => {
      switch (target) {
        case 'all': return noArgs(handleRefreshAllHomeNotesCommand);
        case 'indexes': return noArgs(handleRebuildIndexesCommand);
        case 'active_context': return noArgs(handleRefreshActiveContextCommand);
        case 'code_graph': {
          try {
            const vaultRoot = resolveVaultRoot(process.cwd());
            if (!isProjectVault(vaultRoot)) {
              return {
                isError: true,
                content: [{
                  type: 'text',
                  text: `No project vault found. Resolved ${vaultRoot} is not a vault created by vault_init. Run vault_init first.`,
                }],
              };
            }
            const projectRoot = dirname(vaultRoot);
            const scan = await scanProject(projectRoot);
            const graph = await writeCodeGraph(projectRoot, vaultRoot, scan.repoName);
            return {
              content: [{
                type: 'text',
                text: `Code graph refreshed: ${graph.totalFiles} files, ${graph.totalSymbols} symbols indexed.`,
              }],
            };
          } catch (err) {
            return {
              isError: true,
              content: [{
                type: 'text',
                text: `Failed to refresh code graph: ${err instanceof Error ? err.message : String(err)}`,
              }],
            };
          }
        }
      }
    },
  );

  // ── vault_validate ──────────────────────────────────────────────────
  server.tool(
    'vault_validate',
    'Run read-only vault validation checks or a strict doctor report.',
    {
      target: z.enum(['all', 'frontmatter', 'structure', 'links', 'orphans', 'doctor']).default('all').describe('Validation target.'),
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
    'View or update `.agent-vault/.config.json`.',
    {
      resolver: z.enum(['filesystem', 'obsidian']).optional().describe('Default link resolver.'),
    },
    async ({ resolver }) => {
      const vaultRoot = resolveVaultRoot(process.cwd());
      if (resolver) {
        const config = await updateVaultConfig(vaultRoot, { resolver });
        return { content: [{ type: 'text', text: formatVaultConfigAsToon(config) }] };
      }
      const config = await readVaultConfig(vaultRoot);
      return { content: [{ type: 'text', text: formatVaultConfigAsToon(config) }] };
    },
  );

  // ── vault_help ──────────────────────────────────────────────────────
  server.tool(
    'vault_help',
    'List commands or show help for one command.',
    { command: z.string().optional().describe('Command name.') },
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
