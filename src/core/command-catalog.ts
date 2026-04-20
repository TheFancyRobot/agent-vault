import { formatContextManualCommandSummary } from './context-contract';

export type AgentVaultCommandName =
  | 'vault'
  | 'vault-doctor'
  | 'help'
  | 'create-phase'
  | 'create-step'
  | 'create-session'
  | 'create-bug'
  | 'create-decision'
  | 'update-frontmatter'
  | 'append-section'
  | 'rebuild-bugs-index'
  | 'rebuild-decisions-index'
  | 'rebuild-indexes'
  | 'refresh-active-context'
  | 'refresh-all-home-notes'
  | 'validate-frontmatter'
  | 'validate-note-structure'
  | 'validate-required-links'
  | 'detect-orphans'
  | 'validate-all';

type CommandGroup = 'Discovery' | 'Create Notes' | 'Mutate Notes' | 'Refresh Home Notes' | 'Validate Notes';

interface AgentVaultCommandDefinition {
  readonly name: AgentVaultCommandName;
  readonly group: CommandGroup;
  readonly usage: string;
  readonly summary: string;
  readonly examples: readonly string[];
  readonly notes: readonly string[];
}

const COMMANDS: readonly AgentVaultCommandDefinition[] = [
  {
    name: 'vault',
    group: 'Discovery',
    usage: 'vault [command] [...args]',
    summary: 'Dispatch Agent Vault commands from a single entrypoint.',
    examples: [
      'agent-vault serve  # start MCP server',
      'vault help create-step',
      'vault validate-all',
    ],
    notes: [
      'In MCP mode, commands are invoked as tool calls rather than CLI arguments.',
    ],
  },
  {
    name: 'vault-doctor',
    group: 'Discovery',
    usage: 'vault-doctor',
    summary: 'Run a strict Agent Vault health report across note validation.',
    examples: [
      'vault vault-doctor',
    ],
    notes: [
      'Fails if validation emits warnings or errors.',
    ],
  },
  {
    name: 'help',
    group: 'Discovery',
    usage: 'help [command]',
    summary: 'List Agent Vault automation commands or show detailed help for one command.',
    examples: [
      'vault help',
      'vault help validate-all',
    ],
    notes: [
      'Use this as the main discoverability entrypoint for the vault automation layer.',
    ],
  },
  {
    name: 'create-phase',
    group: 'Create Notes',
    usage: 'create-phase <title> [--phase-number <number>] [--previous <related-phase>] [--insert-before <phase-ref>]',
    summary: 'Create a phase folder and phase note with safe defaults and optional previous-phase linkage.',
    examples: [
      'vault create-phase "Workflow Adoption"',
      'vault create-phase "Automation Hardening" --phase-number 4 --previous PHASE-03',
      'vault create-phase "New Phase" --insert-before 3',
    ],
    notes: [
      'If no phase number is provided, the next available phase number is generated automatically.',
      'A `Steps/` directory is created alongside the phase note.',
      'Use `--insert-before` to insert at a specific position; existing phases from that point onward are renumbered.',
    ],
  },
  {
    name: 'create-step',
    group: 'Create Notes',
    usage: 'create-step <phase-number> <step-number> <title>',
    summary: 'Create a step note inside an existing phase steps folder.',
    examples: [
      'vault create-step 1 2 "Add command catalog"',
    ],
    notes: [
      'The target phase folder must already exist.',
      'The command creates a new file and fails if the destination already exists.',
    ],
  },
  {
    name: 'create-session',
    group: 'Create Notes',
    usage: 'create-session <related-step> [--agent <name>]',
    summary: 'Create a timestamped session note linked to an existing step.',
    examples: [
      'vault create-session STEP-01-02',
      'vault create-session STEP-01-02 --agent OpenCode',
    ],
    notes: [
      'Use this before major work so execution has a chronological home.',
    ],
  },
  {
    name: 'create-bug',
    group: 'Create Notes',
    usage: 'create-bug <title> [--bug-id <BUG-0001>] [--step <related-step>] [--session <related-session>]',
    summary: 'Create a bug note and optionally pre-link the related step and session.',
    examples: [
      'vault create-bug "Generated index loses manual prose" --step STEP-01-02',
    ],
    notes: [
      'If no bug id is provided, the next available id is generated automatically.',
    ],
  },
  {
    name: 'create-decision',
    group: 'Create Notes',
    usage: 'create-decision <title> [--decision-id <DEC-0001>] [--phase <related-phase>] [--session <related-session>] [--bug <related-bug>]',
    summary: 'Create a decision note and optionally pre-link the related phase, session, and bug notes.',
    examples: [
      'vault create-decision "Generate vault home notes" --phase PHASE-01',
      'vault create-decision "Capture blocker workflow" --session SESSION-2026-03-14-150926',
    ],
    notes: [
      'Provide at least one related phase, session, or bug so the decision has durable context.',
      'If no decision id is provided, the next available id is generated automatically.',
    ],
  },
  {
    name: 'update-frontmatter',
    group: 'Mutate Notes',
    usage: 'update-frontmatter <note-path> --set <key>=<value> [--set <key>=<value> ...]',
    summary: 'Safely update one or more frontmatter fields in an existing note while preserving unknown keys.',
    examples: [
      'vault update-frontmatter 03_Bugs/BUG-0001.md --set status=investigating --set owner=agent',
    ],
    notes: [
      'Values are set as strings. Use `[]` for an empty array.',
      'Unknown keys already in the frontmatter are preserved.',
      'The note must have valid YAML frontmatter.',
    ],
  },
  {
    name: 'append-section',
    group: 'Mutate Notes',
    usage: 'append-section <note-path> --heading <heading-text> --content <text>',
    summary: 'Append text to a named heading section in an existing note without disturbing other sections.',
    examples: [
      'vault append-section 05_Sessions/session.md --heading "Execution Log" --content "- 14:30 - Completed investigation."',
    ],
    notes: [
      'The heading must exist and must not contain nested sub-headings.',
      'Content is appended after existing section content.',
      'This is the preferred way to add entries to append-only sections like Execution Log, Timeline, and Implementation Notes.',
    ],
  },
  {
    name: 'rebuild-bugs-index',
    group: 'Refresh Home Notes',
    usage: 'rebuild-bugs-index',
    summary: 'Rebuild the generated bug index block in `00_Home/Bugs_Index.md`.',
    examples: [
      'vault rebuild-bugs-index',
    ],
    notes: [
      'Only the named generated block is replaced.',
    ],
  },
  {
    name: 'rebuild-decisions-index',
    group: 'Refresh Home Notes',
    usage: 'rebuild-decisions-index',
    summary: 'Rebuild the generated decision index block in `00_Home/Decisions_Index.md`.',
    examples: [
      'vault rebuild-decisions-index',
    ],
    notes: [
      'Only the named generated block is replaced.',
    ],
  },
  {
    name: 'rebuild-indexes',
    group: 'Refresh Home Notes',
    usage: 'rebuild-indexes',
    summary: 'Rebuild both the bugs and decisions index in one command.',
    examples: [
      'vault rebuild-indexes',
    ],
    notes: [
      'Equivalent to running rebuild-bugs-index and rebuild-decisions-index sequentially.',
    ],
  },
  {
    name: 'refresh-active-context',
    group: 'Refresh Home Notes',
    usage: 'refresh-active-context',
    summary: 'Refresh the generated focus, blockers, and critical bug blocks in `00_Home/Active_Context.md`.',
    examples: [
      'vault refresh-active-context',
    ],
    notes: [
      'Human-written sections outside the generated blocks are preserved verbatim.',
    ],
  },
  {
    name: 'refresh-all-home-notes',
    group: 'Refresh Home Notes',
    usage: 'refresh-all-home-notes',
    summary: 'Run all home-note refreshers in one command.',
    examples: [
      'vault refresh-all-home-notes',
    ],
    notes: [
      'Use this after meaningful bug, decision, phase, or step metadata changes.',
    ],
  },
  {
    name: 'validate-frontmatter',
    group: 'Validate Notes',
    usage: 'validate-frontmatter',
    summary: 'Check note frontmatter shape, required keys, and tolerated starter-note gaps.',
    examples: [
      'vault validate-frontmatter',
    ],
    notes: [
      'This command is read-only.',
    ],
  },
  {
    name: 'validate-note-structure',
    group: 'Validate Notes',
    usage: 'validate-note-structure',
    summary: 'Check required headings and generated-block integrity.',
    examples: [
      'vault validate-note-structure',
    ],
    notes: [
      'This command is read-only.',
    ],
  },
  {
    name: 'validate-required-links',
    group: 'Validate Notes',
    usage: 'validate-required-links',
    summary: 'Check that notes link to the phase, step, and related context they require.',
    examples: [
      'vault validate-required-links',
    ],
    notes: [
      'This command is read-only.',
    ],
  },
  {
    name: 'detect-orphans',
    group: 'Validate Notes',
    usage: 'detect-orphans',
    summary: 'Detect notes with no inbound links so discoverability gaps are visible.',
    examples: [
      'vault detect-orphans',
    ],
    notes: [
      'This command is read-only.',
    ],
  },
  {
    name: 'validate-all',
    group: 'Validate Notes',
    usage: 'validate-all',
    summary: 'Run all integrity validators and return a failing exit code if any errors are found.',
    examples: [
      'vault validate-all',
    ],
    notes: [
      'Use this before handing off automation or after structural note edits.',
    ],
  },
];

const GROUP_ORDER: readonly CommandGroup[] = [
  'Discovery',
  'Create Notes',
  'Mutate Notes',
  'Refresh Home Notes',
  'Validate Notes',
];

export const getCommandDefinition = (name: string): AgentVaultCommandDefinition | undefined =>
  COMMANDS.find((command) => command.name === name);

export const formatCommandUsage = (name: AgentVaultCommandName): string => {
  const command = getCommandDefinition(name);
  if (!command) {
    throw new Error(`Unknown Agent Vault command: ${name}`);
  }

  return `Usage: ${command.usage}`;
};

export const formatCommandHelp = (name: AgentVaultCommandName): string => {
  const command = getCommandDefinition(name);
  if (!command) {
    throw new Error(`Unknown Agent Vault command: ${name}`);
  }

  return [
    `${command.name}`,
    '',
    formatCommandUsage(name),
    '',
    command.summary,
    '',
    'Examples:',
    ...command.examples.map((example) => `- ${example}`),
    '',
    'Notes:',
    '- Commands auto-discover `.agent-vault` from the current working directory.',
    ...command.notes.map((note) => `- ${note}`),
  ].join('\n');
};

export const formatCommandCatalog = (): string => {
  const lines = [
    'Agent Vault automation commands',
    '',
    'Run these from anywhere inside the repository. Each command auto-discovers `.agent-vault`.',
    '',
  ];

  for (const group of GROUP_ORDER) {
    lines.push(`${group}:`);

    for (const command of COMMANDS.filter((entry) => entry.group === group)) {
      lines.push(`- ${command.name} - ${command.summary}`);
    }

    lines.push('');
  }

  lines.push(...formatContextManualCommandSummary());
  lines.push('');
  lines.push('For command-specific help, use the vault_help MCP tool with `command` set to the command name.');
  lines.push('For graph-based context loading, use the `vault_traverse` MCP tool.');
  return lines.join('\n');
};
