import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { dirname } from "path";
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from "../../src/core/note-generators";
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
} from "../../src/core/note-generators";
import {
  handleValidateFrontmatterCommand,
  handleValidateNoteStructureCommand,
  handleValidateRequiredLinksCommand,
  handleDetectOrphansCommand,
  handleValidateAllCommand,
  handleVaultDoctorCommand,
} from "../../src/core/note-validators";
import { formatCommandCatalog, formatCommandHelp } from "../../src/core/command-catalog";
import type { AgentVaultCommandName } from "../../src/core/command-catalog";
import { loadCodeGraphIndex, queryCodeGraphIndex } from "../../src/core/code-graph-lookup";
import {
  ensureVaultGraph,
  formatVaultTraverseResultAsJson,
  formatVaultTraverseResultAsToon,
  invalidateVaultGraphCache,
  traverseVaultGraph,
} from "../../src/core/vault-graph";
import { extractVaultNoteTarget } from "../../src/core/vault-extract";
import { readVaultConfig, updateVaultConfig } from "../../src/core/vault-config";
import { isProjectVault, resolveVaultRoot } from "../../src/core/vault-files";
import { initVault } from "../../src/scaffold/init";
import { scanProject } from "../../src/scaffold/scan";
import { writeCodeGraph } from "../../src/scaffold/code-graph";

type CommandHandler = (argv: string[], environment?: AgentVaultCommandEnvironment) => Promise<number>;

const captureOutput = async (handler: CommandHandler, argv: string[], vaultRoot: string) => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: AgentVaultCommandIO = {
    stdout: (msg) => stdout.push(msg),
    stderr: (msg) => stderr.push(msg),
  };
  const exitCode = await handler(argv, { vaultRoot, io });
  const output = [...stdout, ...stderr].join("\n");
  return {
    content: [{ type: "text" as const, text: output || (exitCode === 0 ? "OK" : "Command failed") }],
    details: {},
    isError: exitCode !== 0,
  };
};

const noArgs = (handler: CommandHandler) => captureOutput(handler, [], resolveVaultRoot(process.cwd()));

export default function (pi: ExtensionAPI) {
  // ── vault_init ──────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_init",
    label: "Vault Init",
    description:
      "Initialize an Agent Vault in the project. Creates .agent-vault/ scaffold with templates, home notes, architecture stubs, and .obsidian config. Runs a filesystem scan and returns structured project metadata. If a .planning/ directory (GSD) exists, backfills phases, steps, decisions, and project context into the vault.",
    parameters: Type.Object({
      project_root: Type.Optional(Type.String({ description: "Project root directory. Defaults to cwd." })),
    }),
    promptSnippet:
      "Use vault_init to create or re-initialize an Agent Vault in a project directory. This scaffolds .agent-vault/ with templates, home notes, and config. Pass project_root or it defaults to cwd.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const root = params.project_root || process.cwd();
      const result = await initVault(root);
      const config = await readVaultConfig(result.vaultRoot);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                vaultRoot: result.vaultRoot,
                created: result.created,
                filesWritten: result.filesWritten,
                config,
                scan: result.scan,
                ...(result.planningBackfill?.found ? { planningBackfill: result.planningBackfill } : {}),
                ...(result.codeGraph ? { codeGraph: result.codeGraph } : {}),
                ...(result.codeGraphWarning ? { codeGraphWarning: result.codeGraphWarning } : {}),
              },
              null,
              2,
            ),
          },
        ],
        details: {},
      };
    },
  });

  // ── vault_scan ──────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_scan",
    label: "Vault Scan",
    description:
      "Scan the project filesystem and return structured metadata: languages, frameworks, package manager, monorepo shape, key directories, test framework, build system, CI system, and entry points.",
    parameters: Type.Object({
      project_root: Type.Optional(Type.String({ description: "Project root directory. Defaults to cwd." })),
    }),
    promptSnippet:
      "Use vault_scan to scan a project and return structured metadata about languages, frameworks, package manager, monorepo shape, and more.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const result = await scanProject(params.project_root || process.cwd());
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: {},
      };
    },
  });

  // ── vault_create ────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_create",
    label: "Vault Create",
    description: [
      "Create a vault note. The `type` field selects the note kind:",
      '- "phase": Create a phase folder + note. Params: title (required), phase_number, previous, insert_before.',
      '- "step": Create a step inside a phase. Params: title, phase_number, step_number (all required).',
      '- "session": Create a timestamped session linked to a step. Params: related_step (required), agent.',
      '- "bug": Create a bug note. Params: title (required), bug_id, step, session.',
      '- "decision": Create a decision note. Params: title (required), decision_id, phase, session, bug.',
    ].join("\n"),
    parameters: Type.Object({
      type: StringEnum(["phase", "step", "session", "bug", "decision"], { description: "Note type to create" }),
      title: Type.Optional(Type.String({ description: "Note title (required for phase, step, bug, decision)" })),
      phase_number: Type.Optional(
        Type.String({ description: "Phase number (step: required; phase: optional, auto-generated)" }),
      ),
      step_number: Type.Optional(Type.String({ description: "Step number (required for step)" })),
      previous: Type.Optional(Type.String({ description: "Previous phase ID for linkage (phase only)" })),
      insert_before: Type.Optional(
        Type.String({ description: "Insert before this phase, shifting existing phases forward (phase only)" }),
      ),
      related_step: Type.Optional(Type.String({ description: "Step ID to link (required for session)" })),
      agent: Type.Optional(Type.String({ description: "Agent name (session only)" })),
      bug_id: Type.Optional(Type.String({ description: "Bug ID, auto-generated if omitted (bug only)" })),
      decision_id: Type.Optional(
        Type.String({ description: "Decision ID, auto-generated if omitted (decision only)" }),
      ),
      phase: Type.Optional(Type.String({ description: "Related phase ID (decision only)" })),
      session: Type.Optional(Type.String({ description: "Related session ID (bug, decision)" })),
      bug: Type.Optional(Type.String({ description: "Related bug ID (decision only)" })),
      step: Type.Optional(Type.String({ description: "Related step ID (bug only)" })),
    }),
    promptSnippet:
      'Use vault_create to create vault notes. Set type to "phase", "step", "session", "bug", or "decision" and provide the required params for each type.',
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const vaultRoot = resolveVaultRoot(process.cwd());

      switch (params.type) {
        case "phase": {
          if (!params.title) {
            return {
              content: [{ type: "text", text: "title is required for phase" }],
              details: {},
              isError: true,
            };
          }
          const argv = [params.title];
          if (params.phase_number) argv.push("--phase-number", params.phase_number);
          if (params.previous) argv.push("--previous", params.previous);
          if (params.insert_before) argv.push("--insert-before", params.insert_before);
          return captureOutput(handleCreatePhaseCommand, argv, vaultRoot);
        }

        case "step": {
          if (!params.phase_number || !params.step_number || !params.title) {
            return {
              content: [{ type: "text", text: "phase_number, step_number, and title are required for step" }],
              details: {},
              isError: true,
            };
          }
          return captureOutput(
            handleCreateStepCommand,
            [params.phase_number, params.step_number, params.title],
            vaultRoot,
          );
        }

        case "session": {
          if (!params.related_step) {
            return {
              content: [{ type: "text", text: "related_step is required for session" }],
              details: {},
              isError: true,
            };
          }
          const argv = [params.related_step];
          if (params.agent) argv.push("--agent", params.agent);
          return captureOutput(handleCreateSessionCommand, argv, vaultRoot);
        }

        case "bug": {
          if (!params.title) {
            return {
              content: [{ type: "text", text: "title is required for bug" }],
              details: {},
              isError: true,
            };
          }
          const argv = [params.title];
          if (params.bug_id) argv.push("--bug-id", params.bug_id);
          if (params.step) argv.push("--step", params.step);
          if (params.session) argv.push("--session", params.session);
          return captureOutput(handleCreateBugCommand, argv, vaultRoot);
        }

        case "decision": {
          if (!params.title) {
            return {
              content: [{ type: "text", text: "title is required for decision" }],
              details: {},
              isError: true,
            };
          }
          const argv = [params.title];
          if (params.decision_id) argv.push("--decision-id", params.decision_id);
          if (params.phase) argv.push("--phase", params.phase);
          if (params.session) argv.push("--session", params.session);
          if (params.bug) argv.push("--bug", params.bug);
          return captureOutput(handleCreateDecisionCommand, argv, vaultRoot);
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown note type: ${params.type}` }],
            details: {},
            isError: true,
          };
      }
    },
  });

  // ── vault_traverse ──────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_traverse",
    label: "Vault Traverse",
    description: [
      "Traverse connected vault notes for agent context loading.",
      "- Depth controls how many hops away from the root note are included.",
      "- Filters narrow the returned notes without including unresolved links.",
      "- TOON is the default output format for token-efficient structured context.",
      "- The resolver defaults to the vault config (obsidian when available, filesystem otherwise).",
      "- Obsidian CLI provides richer link resolution; filesystem is the automatic fallback.",
    ].join("\n"),
    parameters: Type.Object({
      root: Type.String({
        description: 'Starting note path or wiki target, e.g. "02_Phases/Phase_01_Foundation/Phase"',
      }),
      depth: Type.Integer({ minimum: 0, maximum: 10, description: "Traversal depth from the root note" }),
      direction: StringEnum(["outgoing", "incoming", "both"], {
        default: "outgoing",
        description: "Traversal direction",
      }),
      format: StringEnum(["toon", "json"], { default: "toon", description: "Response format" }),
      include_content: Type.Boolean({ default: false, description: "Include bounded note content excerpts" }),
      note_type: Type.Optional(
        Type.Array(Type.String(), { description: "Optional note_type filter for returned notes" }),
      ),
      status: Type.Optional(
        Type.Array(Type.String(), { description: "Optional status filter for returned notes" }),
      ),
      max_notes: Type.Integer({
        minimum: 1,
        maximum: 5000,
        default: 500,
        description: "Safety cap for returned notes",
      }),
      resolver: Type.Optional(
        StringEnum(["filesystem", "obsidian"], { description: "Link resolver override. Defaults to vault config." }),
      ),
    }),
    promptSnippet:
      "Use vault_traverse to walk the vault graph starting from a root note. Control depth, direction, format (toon or json), and filters. TOON format is token-efficient for context loading.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const vaultRoot = resolveVaultRoot(process.cwd());
      const config = await readVaultConfig(vaultRoot);
      const effectiveResolver = params.resolver ?? config.resolver;
      const { graph, warnings } = await ensureVaultGraph(vaultRoot, effectiveResolver);
      const result = traverseVaultGraph(
        graph,
        {
          root: params.root,
          depth: params.depth,
          direction: params.direction || "outgoing",
          includeContent: params.include_content ?? false,
          noteTypes: params.note_type,
          statuses: params.status,
          maxNotes: params.max_notes ?? 500,
          resolver: effectiveResolver,
        },
        warnings,
      );

      const text =
        params.format === "json"
          ? formatVaultTraverseResultAsJson(result)
          : formatVaultTraverseResultAsToon(result);

      return {
        content: [{ type: "text", text }],
        details: {},
      };
    },
  });

  // ── vault_extract ──────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_extract",
    label: "Vault Extract",
    description: [
      "Extract a bounded note section by markdown heading or generated block without returning the full note.",
      "Use this for targeted context loading when you need a specific section rather than an entire note.",
      '- heading: extracts the exact markdown heading section, including nested subsections.',
      '- block: extracts an existing <!-- AGENT-START:name --> / <!-- AGENT-END:name --> generated block.',
    ].join("\n"),
    parameters: Type.Object({
      note_path: Type.String({ description: "Vault-relative note path. .md is optional." }),
      heading: Type.Optional(Type.String({ description: "Exact markdown heading text to extract, excluding # markers." })),
      block: Type.Optional(Type.String({ description: "Generated block name to extract, e.g. phase-steps." })),
      include_markers: Type.Optional(Type.Boolean({ default: true, description: "For block extraction, include AGENT-START/END markers. Default: true." })),
    }),
    promptSnippet:
      "Use vault_extract to pull a bounded section from a vault note by heading or generated block name, without loading the entire note.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const vaultRoot = resolveVaultRoot(process.cwd());
        const result = await extractVaultNoteTarget(vaultRoot, {
          notePath: params.note_path,
          heading: params.heading,
          block: params.block,
          includeMarkers: params.include_markers !== false,
        });
        return {
          content: [{
            type: "text",
            text: [
              `notePath: ${result.notePath}`,
              `selector: ${result.selector}`,
              "content: |",
              ...result.content.split("\n").map((line) => `  ${line}`),
            ].join("\n"),
          }],
          details: {},
        };
      } catch (err) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Failed to extract vault note target: ${err instanceof Error ? err.message : String(err)}`,
          }],
          details: {},
        };
      }
    },
  });

  // ── vault_lookup_code_graph ───────────────────────────────────────
  pi.registerTool({
    name: "vault_lookup_code_graph",
    label: "Vault Code Graph Lookup",
    description: [
      "Search the machine-readable code graph index without loading the full JSON blob into prompt context.",
      '- Reads `.agent-vault/08_Automation/code-graph/index.json`.',
      '- Returns only matching symbols and file paths.',
    ].join("\n"),
    parameters: Type.Object({
      query: Type.String({ description: "Case-insensitive symbol substring to search for" }),
      limit: Type.Integer({ minimum: 1, maximum: 200, default: 10, description: "Maximum matches to return" }),
      path_substring: Type.Optional(Type.String({ description: "Optional file-path substring filter" })),
      exported_only: Type.Boolean({ default: false, description: "When true, only return exported/public symbols" }),
    }),
    promptSnippet:
      "Use vault_lookup_code_graph to search the generated code-graph index and return only matching symbols/files without loading the whole index into context.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const vaultRoot = resolveVaultRoot(process.cwd());
        const index = await loadCodeGraphIndex(vaultRoot);
        const matches = queryCodeGraphIndex(index, {
          query: params.query,
          limit: params.limit ?? 10,
          pathSubstring: params.path_substring,
          exportedOnly: params.exported_only ?? false,
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              repoName: index.repoName,
              generatedAt: index.generatedAt,
              query: params.query,
              matchCount: matches.length,
              matches,
            }, null, 2),
          }],
          details: {},
        };
      } catch (err) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Failed to query code graph index: ${err instanceof Error ? err.message : String(err)}`,
          }],
          details: {},
        };
      }
    },
  });

  // ── vault_mutate ────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_mutate",
    label: "Vault Mutate",
    description: [
      "Mutate an existing vault note. The `action` field selects the operation:",
      '- "update_frontmatter": Update YAML frontmatter fields. Params: note_path, updates (Record<string,string>).',
      '- "append_section": Append text to a heading section. Params: note_path, heading, content.',
    ].join("\n"),
    parameters: Type.Object({
      action: StringEnum(["update_frontmatter", "append_section"], { description: "Mutation action" }),
      note_path: Type.String({ description: "Note path relative to vault root" }),
      updates: Type.Optional(
        Type.Record(Type.String(), Type.String(), {
          description: "Key-value pairs to set (update_frontmatter)",
        }),
      ),
      heading: Type.Optional(Type.String({ description: "Heading text to append under (append_section)" })),
      content: Type.Optional(Type.String({ description: "Content to append (append_section)" })),
    }),
    promptSnippet:
      'Use vault_mutate to modify existing vault notes. Set action to "update_frontmatter" with updates map, or "append_section" with heading and content.',
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const vaultRoot = resolveVaultRoot(process.cwd());

      switch (params.action) {
        case "update_frontmatter": {
          if (!params.updates || Object.keys(params.updates).length === 0) {
            return {
              content: [{ type: "text", text: "updates is required for update_frontmatter" }],
              details: {},
              isError: true,
            };
          }
          const argv = [params.note_path];
          for (const [key, value] of Object.entries(params.updates)) {
            argv.push("--set", `${key}=${value}`);
          }
          const result = await captureOutput(handleUpdateFrontmatterCommand, argv, vaultRoot);
          invalidateVaultGraphCache(vaultRoot);
          return result;
        }

        case "append_section": {
          if (!params.heading || !params.content) {
            return {
              content: [{ type: "text", text: "heading and content are required for append_section" }],
              details: {},
              isError: true,
            };
          }
          const result = await captureOutput(
            handleAppendSectionCommand,
            [params.note_path, "--heading", params.heading, "--content", params.content],
            vaultRoot,
          );
          invalidateVaultGraphCache(vaultRoot);
          return result;
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${params.action}` }],
            details: {},
            isError: true,
          };
      }
    },
  });

  // ── vault_refresh ───────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_refresh",
    label: "Vault Refresh",
    description: [
      "Refresh generated home-note content from vault metadata.",
      '- target "all" (default): rebuild indexes + refresh active context.',
      '- target "indexes": rebuild bugs and decisions index tables only.',
      '- target "active_context": refresh focus, blockers, and critical bugs only.',
      '- target "code_graph": re-scan source files and regenerate the code graph architecture note.',
    ].join("\n"),
    parameters: Type.Object({
      target: StringEnum(["all", "indexes", "active_context", "code_graph"], {
        default: "all",
        description: "What to refresh",
      }),
    }),
    promptSnippet:
      'Use vault_refresh to regenerate home notes. Target "all" rebuilds everything, "indexes" rebuilds bug/decision tables, "active_context" refreshes focus/blockers, "code_graph" re-scans source files.',
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const target = params.target || "all";

      switch (target) {
        case "all":
          return noArgs(handleRefreshAllHomeNotesCommand);
        case "indexes":
          return noArgs(handleRebuildIndexesCommand);
        case "active_context":
          return noArgs(handleRefreshActiveContextCommand);
        case "code_graph": {
          try {
            const vaultRoot = resolveVaultRoot(process.cwd());
            if (!isProjectVault(vaultRoot)) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: `No project vault found. Resolved ${vaultRoot} is not a vault created by vault_init. Run vault_init first.`,
                  },
                ],
                details: {},
              };
            }
            const projectRoot = dirname(vaultRoot);
            const scan = await scanProject(projectRoot);
            const graph = await writeCodeGraph(projectRoot, vaultRoot, scan.repoName);
            return {
              content: [
                {
                  type: "text",
                  text: `Code graph refreshed: ${graph.totalFiles} files, ${graph.totalSymbols} symbols indexed.`,
                },
              ],
              details: {},
            };
          } catch (err) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Failed to refresh code graph: ${err instanceof Error ? err.message : String(err)}`,
                },
              ],
              details: {},
            };
          }
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown target: ${target}` }],
            details: {},
            isError: true,
          };
      }
    },
  });

  // ── vault_validate ──────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_validate",
    label: "Vault Validate",
    description: [
      "Validate vault integrity. Runs read-only checks and reports issues.",
      '- target "all" (default): run all four validators.',
      '- target "frontmatter": check YAML frontmatter shape and required keys.',
      '- target "structure": check required headings and generated-block balance.',
      '- target "links": check required inter-note links.',
      '- target "orphans": detect notes with no inbound links.',
      '- target "doctor": strict health report (validation + summary).',
    ].join("\n"),
    parameters: Type.Object({
      target: StringEnum(["all", "frontmatter", "structure", "links", "orphans", "doctor"], {
        default: "all",
        description: "What to validate",
      }),
    }),
    promptSnippet:
      'Use vault_validate to check vault integrity. Target "all" runs every validator, "doctor" gives a strict health report. Other targets run individual checks.',
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const target = params.target || "all";

      switch (target) {
        case "all":
          return noArgs(handleValidateAllCommand);
        case "frontmatter":
          return noArgs(handleValidateFrontmatterCommand);
        case "structure":
          return noArgs(handleValidateNoteStructureCommand);
        case "links":
          return noArgs(handleValidateRequiredLinksCommand);
        case "orphans":
          return noArgs(handleDetectOrphansCommand);
        case "doctor":
          return noArgs(handleVaultDoctorCommand);
        default:
          return {
            content: [{ type: "text", text: `Unknown target: ${target}` }],
            details: {},
            isError: true,
          };
      }
    },
  });

  // ── vault_config ────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_config",
    label: "Vault Config",
    description: [
      "View or update vault configuration (.agent-vault/.config.json).",
      "- With no parameters: returns current config.",
      '- resolver: set the default link resolver ("obsidian" or "filesystem").',
      "  Obsidian CLI is preferred when available and provides richer link resolution.",
    ].join("\n"),
    parameters: Type.Object({
      resolver: Type.Optional(
        StringEnum(["filesystem", "obsidian"], { description: "Set the default link resolver" }),
      ),
    }),
    promptSnippet:
      "Use vault_config to view or update the vault configuration. Pass resolver to change the default link resolver, or omit all params to view current config.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const vaultRoot = resolveVaultRoot(process.cwd());
      if (params.resolver) {
        const config = await updateVaultConfig(vaultRoot, { resolver: params.resolver });
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
          details: {},
        };
      }
      const config = await readVaultConfig(vaultRoot);
      return {
        content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        details: {},
      };
    },
  });

  // ── vault_help ──────────────────────────────────────────────────────
  pi.registerTool({
    name: "vault_help",
    label: "Vault Help",
    description: "List all vault commands or show detailed help for a specific command.",
    parameters: Type.Object({
      command: Type.Optional(Type.String({ description: "Command name to get help for" })),
    }),
    promptSnippet:
      "Use vault_help to list all available vault commands, or pass a command name to get detailed help for that specific command.",
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        const text = params.command
          ? formatCommandHelp(params.command as AgentVaultCommandName)
          : formatCommandCatalog();
        return {
          content: [{ type: "text", text }],
          details: {},
        };
      } catch (err) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: err instanceof Error ? err.message : String(err),
          }],
          details: {},
        };
      }
    },
  });
}
