import { formatCommandCatalog, formatCommandHelp, getCommandDefinition, type AgentVaultCommandName } from './command-catalog';
import type { AgentVaultCommandEnvironment } from './note-generators';
import { handleLookupCodeGraphCommand } from './code-graph-lookup';
import {
  handleAppendSectionCommand,
  handleCreateBugCommand,
  handleCreateDecisionCommand,
  handleCreatePhaseCommand,
  handleCreateSessionCommand,
  handleCreateStepCommand,
  handleMigrateStepNotesCommand,
  handleRebuildIndexesCommand,
  handleRefreshActiveContextCommand,
  handleRefreshAllHomeNotesCommand,
  handleRebuildBugsIndexCommand,
  handleRebuildDecisionsIndexCommand,
  handleUpdateFrontmatterCommand,
} from './note-generators';
import {
  handleDetectOrphansCommand,
  handleVaultDoctorCommand,
  handleValidateAllCommand,
  handleValidateFrontmatterCommand,
  handleValidateNoteStructureCommand,
  handleValidateRequiredLinksCommand,
} from './note-validators';

type CommandHandler = (argv: string[], environment?: AgentVaultCommandEnvironment) => Promise<number>;

const COMMAND_HANDLERS: Partial<Record<AgentVaultCommandName, CommandHandler>> = {
  'lookup-code-graph': handleLookupCodeGraphCommand,
  'create-step': handleCreateStepCommand,
  'create-phase': handleCreatePhaseCommand,
  'create-session': handleCreateSessionCommand,
  'migrate-step-notes': handleMigrateStepNotesCommand,
  'create-bug': handleCreateBugCommand,
  'create-decision': handleCreateDecisionCommand,
  'update-frontmatter': handleUpdateFrontmatterCommand,
  'append-section': handleAppendSectionCommand,
  'vault-doctor': handleVaultDoctorCommand,
  'rebuild-bugs-index': handleRebuildBugsIndexCommand,
  'rebuild-decisions-index': handleRebuildDecisionsIndexCommand,
  'rebuild-indexes': handleRebuildIndexesCommand,
  'refresh-active-context': handleRefreshActiveContextCommand,
  'refresh-all-home-notes': handleRefreshAllHomeNotesCommand,
  'validate-frontmatter': handleValidateFrontmatterCommand,
  'validate-note-structure': handleValidateNoteStructureCommand,
  'validate-required-links': handleValidateRequiredLinksCommand,
  'detect-orphans': handleDetectOrphansCommand,
  'validate-all': handleValidateAllCommand,
};

export async function handleVaultCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? {
    stdout: (message: string) => console.log(message),
    stderr: (message: string) => console.error(message),
  };
  const [firstArg, ...rest] = argv;

  if (!firstArg) {
    io.stdout(formatCommandCatalog());
    return 0;
  }

  if (firstArg === '--help' || firstArg === '-h') {
    io.stdout(formatCommandHelp('vault'));
    return 0;
  }

  if (firstArg === 'help') {
    const helpTarget = rest[0]?.trim();
    if (!helpTarget) {
      io.stdout(formatCommandCatalog());
      return 0;
    }

    const command = getCommandDefinition(helpTarget);
    if (!command) {
      io.stderr(`Unknown Agent Vault command: ${helpTarget}`);
      io.stdout('');
      io.stdout(formatCommandCatalog());
      return 1;
    }

    io.stdout(formatCommandHelp(command.name));
    return 0;
  }

  const command = getCommandDefinition(firstArg);
  if (!command) {
    io.stderr(`Unknown Agent Vault command: ${firstArg}`);
    io.stdout('');
    io.stdout(formatCommandCatalog());
    return 1;
  }

  const handler = COMMAND_HANDLERS[command.name];
  if (!handler) {
    io.stderr(`Agent Vault command is not directly dispatchable: ${command.name}`);
    return 1;
  }

  return handler(rest, environment);
}
