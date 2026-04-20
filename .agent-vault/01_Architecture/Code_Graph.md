---
note_type: architecture
template_version: 2
contract_version: 1
title: Code Graph
architecture_id: "ARCH-0006"
status: active
owner: ""
reviewed_on: "2026-04-20"
created: "2026-04-20"
updated: "2026-04-20"
related_notes:
  - "[[01_Architecture/Code_Map|Code Map]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# Code Graph

## Purpose

- Map exported symbols (functions, classes, types, interfaces) to their source files.
- Enable agents and engineers to locate relevant code by symbol name without searching.
- Auto-generated during vault initialization; refresh by re-running `vault init`.

## Overview

- Repository: agent-vault
- Files indexed: 28
- Symbols found: 469

## Key Components

- See **Exports by File** below for the full symbol index grouped by directory.

## Important Paths

- All indexed source files are listed in the Exports by File section with line-level symbol locations.

## Constraints

- Auto-generated during vault initialization; do not hand-edit.
- Refresh by re-running `vault init`.
- Files larger than 500 KB and common generated/test files are excluded.

## Failure Modes

- If source files are added outside the supported language set, they will not appear in this graph.
- Deeply nested files (beyond 8 levels) are skipped.

## Exports by File

### pi-package/

**`pi-package/extensions/index.ts`** *(TypeScript)*
- *internal:* `CommandHandler`, `captureOutput`, `noArgs`

**`pi-package/skills/vault-resume/index.js`** *(JavaScript)*
- *internal:* `fs`, `path`, `vaultResume`, `locatePreviousSession`, `extractTimestampFromFilename`, `parseYaml`, `parseSessionNote`, `determineContinuationTarget`, `findNextPlannedPhase`, `askUserConfirmation`, `loadContinuationContext`, `createContinuationSession`, `runReadinessCheck`

**`pi-package/skills/vault-resume/test.js`** *(JavaScript)*
- *internal:* `fs`, `path`, `createMockVault`, `cleanupMockVault`, `testResumeFromMostRecent`, `testResumeFromSpecificSession`, `testNoSessionsFound`, `runAllTests`

### scripts/

**`scripts/e2e-local-shared.ts`** *(TypeScript)*
- `function` **runLocalE2E** (line 408)
- *internal:* `PACKAGE_NAME`, `TOOL_CONFIGS`, `__dirname`, `repoRoot`, `commandSourceDir`, `InstallScope`, `RunningProcess`, `LocalE2EOptions`, `ToolConfig`, `sleep`, `getFreePort`, `runCommand`, `startVerdaccio`, `waitForRegistry`, `stopVerdaccio`, `writeRegistryConfig`, `createVerdaccioConfig`, `stagePackageForPublish`, `createFakeToolHomes`, `detectTools`, `getToolMcpRootKey`, `assertValidToolMcpConfig`, `readJson`, `getCommandFileCount`, `resolveExpectedInstallScope`, `resolveExpectedInstallRoot`, `getManagedCommandFilenames`, `verifyInstalledState`, `verifyCleanState`

### src/

**`src/cli.ts`** *(TypeScript)*
- *internal:* `args`, `command`, `main`

**`src/core/command-catalog.ts`** *(TypeScript)*
- `type` **AgentVaultCommandName** (line 1)
- `const` **getCommandDefinition** (line 300)
- `const` **formatCommandUsage** (line 303)
- `const` **formatCommandHelp** (line 312)
- `const` **formatCommandCatalog** (line 334)
- *internal:* `CommandGroup`, `AgentVaultCommandDefinition`

**`src/core/dispatcher.ts`** *(TypeScript)*
- `function` **handleVaultCommand** (line 49)
- *internal:* `CommandHandler`

**`src/core/note-generators.ts`** *(TypeScript)*
- `interface` **AgentVaultCommandIO** (line 21)
- `interface` **AgentVaultCommandEnvironment** (line 26)
- `function` **handleCreateStepCommand** (line 1681)
- `function` **handleCreatePhaseCommand** (line 1728)
- `function` **handleCreateSessionCommand** (line 1858)
- `function` **handleCreateBugCommand** (line 1914)
- `function` **handleCreateDecisionCommand** (line 1970)
- `function` **handleUpdateFrontmatterCommand** (line 2041)
- `function` **handleAppendSectionCommand** (line 2104)
- `function` **handleRebuildIndexesCommand** (line 2152)
- `function` **handleRebuildBugsIndexCommand** (line 2201)
- `function` **handleRebuildDecisionsIndexCommand** (line 2228)
- `function` **handleRefreshActiveContextCommand** (line 2255)
- `function` **handleRefreshAllHomeNotesCommand** (line 2311)
- *internal:* `ParsedArgs`, `PhaseInfo`, `ResolvedStepNote`, `ResolvedPhaseNote`, `ResolvedSessionNote`, `ResolvedBugNote`, `IndexedVaultNote`, `SummaryItem`, `DEFAULT_IO`, `PHASE_TEMPLATE_PATH`, `STEP_TEMPLATE_PATH`, `SESSION_TEMPLATE_PATH`, `BUG_TEMPLATE_PATH`, `DECISION_TEMPLATE_PATH`, `BUGS_INDEX_PATH`, `DECISIONS_INDEX_PATH`, `ACTIVE_CONTEXT_PATH`, `LINEAR_FIELD_NAMES`, `EMPTY_CELL`, `ACTIVE_SESSION_STATUSES`, `ACTIVE_WORK_STATUSES`, `BLOCKER_STATUSES`, `COMPLETED_WORK_STATUSES`, `joinTemplatePath`, `slugify`, `padNumber`, `formatDate`, `formatTime`, `formatTimestamp`, `replaceFirstHeading`, `parseArgs`, `getRequiredOption`, `getVaultRoot`, `toWikiTarget`, `toWikiLink`, `resolvePhaseNotePathFromLink`, `parseStringField`, `parseOptionalStringField`, `normalizeMetadataKey`, `getFirstPresentStringField`, `parseDateValue`, `parseSeverityRank`, `BUG_STATUS_ORDER`, `DECISION_STATUS_ORDER`, `compareSummaryItems`, `escapeMarkdownTableCell`, `escapeMarkdownLinkLabel`, `toMarkdownLink`, `toDisplayCell`, `buildMarkdownTable`, `buildSummaryLine`, `isStatusInSet`, `isOpenWorkStatus`, `compareByUpdatedDesc`, `formatMetadataBits`, `withMetadataSuffix`, `summarizeOverflow`, `displayPhaseName`, `buildPhaseLink`, `buildPhaseId`, `listPhaseDirectoryNames`, `parsePhaseNumberFromDirectory`, `getNextPhaseNumber`, `parseInsertBeforeTarget`, `renumberPhasesFrom`, `findPreviousPhase`, `findPhase`, `readTemplate`, `readNoteFrontmatter`, `tryReadNoteFrontmatter`, `resolveDirectNotePath`, `resolveStepReference`, `resolvePhaseReference`, `resolveSessionReference`, `resolveBugReference`, `nextBugId`, `validateBugId`, `nextDecisionId`, `validateDecisionId`, `parseStringListField`, `appendUniqueString`, `normalizeBlockBody`, `appendUniqueGeneratedLine`, `updateBackreferenceNote`, `appendUniqueFrontmatterLink`, `appendUniqueGeneratedBlockLine`, `tryApplyBackreference`, `linkStepBackToPhase`, `linkSessionBackToStep`, `linkBugBackToStep`, `linkBugBackToSession`, `linkBugBackToPhase`, `linkDecisionBackToPhase`, `linkDecisionBackToSession`, `linkDecisionBackToBug`, `linkPhaseForwardFromPreviousPhase`, `createPhaseContent`, `createStepContent`, `createSessionContent`, `createBugContent`, `createDecisionContent`, `collectIndexedNotes`, `updateGeneratedBlockFile`, `buildBugsIndexBlock`, `buildDecisionsIndexBlock`, `buildPhaseSummary`, `buildStepSummary`, `buildSessionSummary`, `buildBugSummary`, `buildCurrentFocusBlock`, `buildBlockersBlock`, `buildCriticalBugsBlock`, `ensureParentDirectory`, `writeNewNote`, `emitCreatedNote`

**`src/core/note-mutations.ts`** *(TypeScript)*
- `type` **MutationErrorCode** (line 11)
- `class` **AgentVaultMutationError** (line 23)
- `interface` **NoteMutation** (line 35)
- `interface` **MutationResult** (line 41)
- `interface` **ParsedFrontmatter** (line 47)
- `const` **parseYamlFrontmatter** (line 129)
- `const` **updateFrontmatter** (line 400)
- `const` **replaceGeneratedBlock** (line 424)
- `const` **readGeneratedBlockContent** (line 442)
- `const` **replaceHeadingSection** (line 452)
- `const` **appendToAppendOnlySection** (line 478)
- *internal:* `HeadingMatch`, `ResolvedGeneratedBlockRange`, `GENERATED_MARKER_PATTERN`, `HEADING_PATTERN`, `DEFAULT_NOTE_PATH`, `mutationError`, `detectLineEnding`, `toNoteLineEnding`, `trimBoundaryNewlines`, `applyMutation`, `isPlainObject`, `getClosingFrontmatterDelimiter`, `dumpFrontmatter`, `lineStartAt`, `nextLineBreakLength`, `ensureStandaloneLine`, `collectStandaloneTokenIndexes`, `normalizeInsertedContent`, `trailingWhitespace`, `leadingBlankLines`, `buildSectionReplacement`, `buildAppendedSectionReplacement`, `scanHeadings`, `resolveHeadingRange`, `resolveGeneratedBlockRange`

**`src/core/note-validators.ts`** *(TypeScript)*
- `function` **handleValidateFrontmatterCommand** (line 485)
- `function` **handleValidateNoteStructureCommand** (line 497)
- `function` **handleValidateRequiredLinksCommand** (line 509)
- `function` **handleDetectOrphansCommand** (line 521)
- `function` **handleValidateAllCommand** (line 533)
- `function` **handleVaultDoctorCommand** (line 574)
- *internal:* `FrontmatterNoteType`, `StructureKind`, `ValidationSeverity`, `ValidationIssue`, `ValidationSummary`, `NoteClassification`, `ParsedNote`, `GraphNote`, `DEFAULT_IO`, `FRONTMATTER_NOTE_TYPES`, `MARKER_LINE_PATTERN`, `HEADING_PATTERN`, `getVaultRoot`, `classifyNotePath`, `parseFrontmatterNoteType`, `readAllNotes`, `makeIssue`, `scanHeadings`, `validateGeneratedBlocks`, `hasLinkTo`, `isTemplateNote`, `buildSummary`, `writeSummary`, `validateFrontmatter`, `validateStructure`, `validateRequiredLinks`, `detectOrphans`, `runValidation`

**`src/core/vault-config.ts`** *(TypeScript)*
- `interface` **VaultConfig** (line 12)
- `const` **readVaultConfig** (line 22)
- `const` **writeVaultConfig** (line 40)
- `const` **updateVaultConfig** (line 45)
- `const` **probeObsidianCli** (line 57)
- *internal:* `execFile`, `CONFIG_FILENAME`, `DEFAULT_CONFIG`, `VALID_RESOLVERS`

**`src/core/vault-files.ts`** *(TypeScript)*
- `interface` **VaultFileRecord** (line 5)
- `const` **isProjectVault** (line 15)
- `const` **resolveVaultRoot** (line 18)
- `const` **getRelativeNotePath** (line 36)
- `const` **assertWithinVaultRoot** (line 39)
- `const` **resolveVaultRelativePath** (line 52)
- `const` **listMarkdownFiles** (line 58)
- `const` **scanVaultMarkdownFiles** (line 78)
- `const` **readUtf8File** (line 91)

**`src/core/vault-graph.ts`** *(TypeScript)*
- `type` **VaultGraphResolver** (line 21)
- `type` **VaultTraverseDirection** (line 22)
- `interface` **VaultGraphNode** (line 24)
- `interface` **VaultGraph** (line 39)
- `interface` **VaultTraverseParams** (line 47)
- `interface` **VaultTraverseResultNode** (line 58)
- `interface` **VaultTraverseResultEdge** (line 67)
- `interface` **VaultTraverseResult** (line 72)
- `const` **collectLinks** (line 172)
- `const` **invalidateVaultGraphCache** (line 362)
- `const` **ensureVaultGraph** (line 371)
- `const` **traverseVaultGraph** (line 538)
- `const` **formatVaultTraverseResultAsJson** (line 699)
- `const` **formatVaultTraverseResultAsToon** (line 702)
- *internal:* `execFile`, `WIKI_LINK_PATTERN`, `MARKDOWN_LINK_PATTERN`, `HEADING_PATTERN`, `ROOT_CONTENT_EXCERPT_LIMIT`, `CONTENT_EXCERPT_LIMIT`, `MIN_CONTENT_EXCERPT_LIMIT`, `TOTAL_CONTENT_LIMIT`, `TRUNCATION_SUFFIX`, `OBSIDIAN_TIMEOUT_MS`, `CachedVaultGraph`, `ParsedVaultNote`, `GRAPH_CACHE_MAX_SIZE`, `graphCache`, `setGraphCache`, `normalizePathLikeValue`, `getCanonicalTarget`, `parseOptionalString`, `extractTitle`, `normalizeLinkTarget`, `loadParsedVaultNotes`, `buildSignature`, `extractObsidianPaths`, `readObsidianCliLinks`, `buildFilesystemGraph`, `buildObsidianGraph`, `resolveTraversalRoot`, `normalizeFilterValues`, `getTraversalNeighbors`, `nodeMatchesFilters`, `excerptContent`, `allocateContentExcerpts`

**`src/install.ts`** *(TypeScript)*
- `const` **resolveInstallRoot** (line 62)
- `const` **buildInstallTarget** (line 68)
- `const` **buildMcpServerConfig** (line 82)
- `const` **buildOpenCodeMcpServerConfig** (line 88)
- `const` **parseInstallScope** (line 102)
- `const` **parseNumberedSelection** (line 114)
- `const` **renderToolCommand** (line 372)
- `function` **runInstall** (line 568)
- `function` **runUninstall** (line 612)
- *internal:* `CommandFormat`, `InstallScope`, `PackageManager`, `ToolKind`, `McpConfigRootKey`, `DetectedTool`, `InstallAction`, `InstallTarget`, `PACKAGE_NAME`, `INSTALL_DIRNAME`, `RUNTIME_DIRNAME`, `COMMAND_SOURCE_DIR`, `CLAUDE_LEGACY_COMMANDS`, `CommandTemplate`, `RenderedCommand`, `isBunRuntime`, `getPackageManager`, `getToolMcpRootKey`, `buildToolMcpServerConfig`, `writeRuntimeManifest`, `runPackageInstall`, `promptForInstallScope`, `resolveInstallScope`, `promptForInstallTools`, `resolveInstallTools`, `ensureRuntimeInstalled`, `maybeRemoveEmptyDir`, `uninstallInstalledRuntime`, `toCodexPromptName`, `getFirstNonEmptyLine`, `getCommandBody`, `withDescriptionFrontmatter`, `renderSlashCommandReference`, `readCommandTemplates`, `detectTools`, `readJsonSafe`, `writeJsonSafe`, `installMcpServer`, `installToolCommands`, `uninstallTool`

**`src/mcp-server.ts`** *(TypeScript)*
- `function` **startServer** (line 59)
- *internal:* `CommandHandler`, `captureOutput`, `noArgs`

**`src/scaffold/backfill-planning.ts`** *(TypeScript)*
- `interface` **PlanningBackfillResult** (line 12)
- `function` **backfillFromPlanning** (line 302)
- *internal:* `GsdPhase`, `GsdPlan`, `GsdSummary`, `EMPTY_RESULT`, `parseFrontmatter`, `getBody`, `extractTaskNames`, `extractObjective`, `scanPlanningPhases`, `extractSection`, `enrichArchitectureStub`, `titleCase`, `slugify`

**`src/scaffold/code-graph.ts`** *(TypeScript)*
- `interface` **CodeSymbol** (line 4)
- `interface` **FileSymbols** (line 11)
- `interface` **CodeGraphResult** (line 17)
- `function` **buildCodeGraph** (line 374)
- `function` **renderCodeGraphMarkdown** (line 389)
- `function` **writeCodeGraph** (line 501)
- `function` **findSymbols** (line 517)
- `function` **getSymbolsForFiles** (line 539)
- *internal:* `SKIP_DIRS`, `parseNamesFromBraces`, `SymbolExtractor`, `extractTypeScript`, `extractPython`, `extractGo`, `extractRust`, `extractJava`, `walkSourceFiles`

**`src/scaffold/init.ts`** *(TypeScript)*
- `interface` **InitResult** (line 52)
- `function` **initVault** (line 92)
- *internal:* `fillPlaceholders`, `writeIfNotExists`

**`src/scaffold/scan.ts`** *(TypeScript)*
- `interface` **ScanResult** (line 5)
- `function` **scanProject** (line 288)
- *internal:* `SKIP_DIRS`, `countFilesByExtension`, `detectFrameworks`, `detectPackageManager`, `detectMonorepo`, `detectKeyDirectories`, `detectTestFramework`, `detectBuildSystem`, `detectCISystem`, `detectEntryPoints`

**`src/templates/agents-md.ts`** *(TypeScript)*
- `const` **AGENTS_MD_TEMPLATE** (line 5)

**`src/templates/architecture.ts`** *(TypeScript)*
- `const` **SYSTEM_OVERVIEW_STUB** (line 7)
- `const` **CODE_MAP_STUB** (line 68)
- `const` **AGENT_WORKFLOW_STUB** (line 125)
- `const` **DOMAIN_MODEL_STUB** (line 181)
- `const` **INTEGRATION_MAP_STUB** (line 236)

**`src/templates/home.ts`** *(TypeScript)*
- `const` **ACTIVE_CONTEXT_TEMPLATE** (line 6)
- `const` **BUGS_INDEX_TEMPLATE** (line 82)
- `const` **DECISIONS_INDEX_TEMPLATE** (line 123)
- `const` **DASHBOARD_TEMPLATE** (line 168)
- `const` **INBOX_TEMPLATE** (line 235)
- `const` **ROADMAP_TEMPLATE** (line 269)

**`src/templates/note-templates.ts`** *(TypeScript)*
- `const` **PHASE_TEMPLATE** (line 6)
- `const` **STEP_TEMPLATE** (line 98)
- `const` **BUG_TEMPLATE** (line 187)
- `const` **DECISION_TEMPLATE** (line 278)
- `const` **SESSION_TEMPLATE** (line 347)
- `const` **ARCHITECTURE_TEMPLATE** (line 430)
- `const` **NOTE_CONTRACTS** (line 492)

**`src/templates/obsidian-config.ts`** *(TypeScript)*
- `const` **OBSIDIAN_APP_CONFIG** (line 6)
- `const` **OBSIDIAN_APPEARANCE_CONFIG** (line 8)
- `const` **OBSIDIAN_COMMUNITY_PLUGINS** (line 10)
- `const` **OBSIDIAN_CORE_PLUGINS** (line 12)
- `const` **OBSIDIAN_GRAPH_CONFIG** (line 46)

**`src/templates/readme.ts`** *(TypeScript)*
- `const` **README_MD_TEMPLATE** (line 5)

**`src/templates/root-agents-md.ts`** *(TypeScript)*
- `const` **AGENT_VAULT_MARKER** (line 9)
- `const` **AGENT_VAULT_MARKER_END** (line 9)
- `const` **ROOT_AGENTS_MD_SECTION** (line 11)
- *internal:* `AGENT_VAULT_MARKER`, `AGENT_VAULT_MARKER_END`

**`src/templates/shared-knowledge.ts`** *(TypeScript)*
- `const` **CODING_STANDARDS** (line 7)
- `const` **PROMPT_STANDARDS** (line 34)
- `const` **BUG_TAXONOMY** (line 78)
- `const` **DEFINITION_OF_DONE** (line 125)
- `const` **AGENT_WORKFLOW_PLAYBOOKS** (line 157)

### test/

**`test/helpers.ts`** *(TypeScript)*
- `const` **copyTemplate** (line 12)
- `const` **copyHomeNote** (line 19)
- `const` **makeIo** (line 26)
- *internal:* `FRED_VAULT_ROOT`

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:architecture-related-notes -->
