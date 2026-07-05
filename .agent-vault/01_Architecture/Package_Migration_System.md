---
note_type: architecture
template_version: 2
contract_version: 1
title: Package-level migration system (RFC)
architecture_id: ARCH-0007
status: active
owner: Pi
reviewed_on: '2026-07-05'
created: '2026-07-05'
updated: '2026-07-05'
related_notes:
  - '[[01_Architecture/Agent_Workflow|Agent Workflow]]'
  - '[[01_Architecture/System_Overview|System Overview]]'
  - '[[01_Architecture/Code_Map|Code Map]]'
  - '[[07_Templates/Note_Contracts|Note Contracts]]'
  - '[[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]'
tags:
  - agent-vault
  - architecture
  - rfc
---

# Package-Level Migration System (RFC)

This note is the durable RFC produced by [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]. It defines, for the Agent Vault **package** (not any single consuming repository), how vault structure evolves safely across releases and what a general `vault migrate` command must guarantee. [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02]] converts this contract into a PR-sized implementation checklist; it must not re-decide the product behavior defined here.

**Scope note:** this document is planning only. No `vault migrate` command, registry, or schema-version file is implemented by this RFC. See [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03]] Non-Goals.

## Purpose

- Answer, for any repository that adopts Agent Vault, "what must ship whenever vault structure changes, and how does that repository catch up safely?"
- Give `vault migrate` one stable contract to implement against, so migration behavior does not accumulate ad hoc the way `migrate-step-notes` did.
- Give package maintainers a checklist they must follow whenever a template, contract, or generated-block shape changes.

## Overview

Agent Vault today versions individual notes (`template_version`, `contract_version` per note type, enforced by [[01_Architecture/Code_Map|Code Map]] → `src/core/note-validators.ts`) but has **no vault-wide schema version**. There is no `.agent-vault/.config.json` field, and no other file, that records "this vault was scaffolded by / last upgraded to package version X." The only migration tooling that exists, `migrate-step-notes` (`src/core/note-generators.ts::handleMigrateStepNotesCommand`), is a single hard-coded transform (legacy verbose step note → thin step index + companion notes) detected by sniffing note content (`isLegacyStepNoteContent`) rather than by comparing declared versions.

This RFC introduces:

1. A **vault schema version** as the top-level unit of migration, distinct from per-note `template_version`/`contract_version`.
2. A **migration registry** — an ordered list of small, self-contained migration steps, each declaring the schema versions it moves between.
3. A general **`vault migrate`** command that plans and applies registry entries, replacing today's pattern of one bespoke command per structural change.
4. **Maintainer obligations** tying future template/contract changes to a required registry entry, so migration support cannot silently fall behind the templates.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Vault schema version — a single integer/string recorded in `.agent-vault/.config.json` (`vault_schema_version`) identifying the structural generation of the vault as a whole.
- Migration registry — an ordered array of migration step definitions (id, `from_version`, `to_version`, description, `detect()`, `plan()`, `apply()`) living beside `note-generators.ts`, e.g. `src/core/migrations/registry.ts`.
- `vault migrate` command — new entry in `command-catalog.ts`; dispatches to the registry runner instead of a single-purpose handler.
- Migration runner — resolves the vault's current schema version, walks the registry in order, and executes only the steps needed to reach the package's current schema version (or a `--to` version for partial upgrades).
- Compatibility layer — the existing `migrate-step-notes` behavior is retained as the first registered migration step (e.g. `0 -> 1: thin-step-notes`) rather than removed, so its detection logic and output stay covered by tests.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- `.agent-vault/.config.json` — gains `vault_schema_version`; today only stores the link resolver (`vault_config` MCP tool), and does not exist until first written.
- `src/core/note-generators.ts` — houses `handleMigrateStepNotesCommand`; its transform logic becomes the first migration registry entry instead of a standalone command handler.
- `src/core/note-validators.ts` — owns per-note-type required-field lists (`REQUIRED_FRONTMATTER_FIELDS`) and structural checks; `vault migrate` must leave a vault in a state that `validate-all` accepts, and `validate-all` should be able to warn when `vault_schema_version` is behind the package's current version.
- `src/core/command-catalog.ts` — command registry; add `migrate` alongside the existing `migrate-step-notes` (kept as a deprecated alias, see Compatibility Strategy).
- `.agent-vault/07_Templates/Note_Contracts.md` — defines `template_version`/`contract_version` semantics per note; this RFC does not change that contract, it adds a coarser vault-level version above it.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- The vault schema version is a new, coarser counter layered above existing per-note `template_version`/`contract_version` fields; it does not replace or renumber them (see Terminology and Version Boundaries).
- `vault migrate` must never write to disk in plan mode, must apply registry steps strictly in ascending order with no gap-jumping, and must end every apply with a validator pass (see Safety Guarantees).
- Unsafe/manual registry steps must never have an `apply()` and must block automatic progression past their version rather than being silently skipped (see Migration Categories, Safety Guarantees).
- Any change to a note template's required fields, headings, or generated-block names must ship with a corresponding registry step in the same PR, or an explicit justification for why no existing vault is affected (see Maintainer Obligations).
- The existing `migrate-step-notes` command and its detection/transform logic must keep working unmodified as a thin wrapper over the new registry (see Compatibility Strategy).

## Terminology and Version Boundaries

- **Vault schema version** — one monotonically increasing integer for the whole `.agent-vault/` structure (folder layout, generated-block set, cross-note conventions). Bumped only when a change requires or benefits from an automated transform across existing vaults.
- **Note template version** (`template_version`) — per note-type layout version, as today. A vault schema bump MAY imply specific note template bumps, but the two are not the same counter: a vault schema bump can also cover folder-level or config-level changes that touch no single note template.
- **Note contract version** (`contract_version`) — per note-type field/heading contract version, as today. Unchanged by this RFC.
- **Package version** — the npm package's own semver (`package.json` `version`). Multiple package releases may ship without a vault schema bump; a vault schema bump SHOULD be called out in `CHANGELOG.md` as a breaking/upgrade-relevant entry.

The vault schema version is the unit `vault migrate` reasons about. Per-note `template_version`/`contract_version` remain the unit validators reason about for individual notes. A migration step MAY need to rewrite many notes' `template_version` fields to move the vault schema version forward, but "vault schema version N" is what a project's `.config.json` declares, not an aggregate computed from note contents.

## `vault migrate` Command Contract

<!-- AGENT-START:architecture-command-contract -->
- `vault migrate` (no args) — plan mode is the default: reports the vault's current schema version, the package's current schema version, and the ordered list of registry steps that would run, with a one-line description and affected-path count per step. Makes no writes.
- `vault migrate --apply` — executes the plan from current version to the package's latest version, one registry step at a time, in order. Refuses to skip steps.
- `vault migrate --apply --to <version>` — applies only up through the named intermediate version, for staged rollouts across large vaults.
- `vault migrate --dry-run` — explicit alias for the default plan-only behavior, for scripting clarity.
- Every apply run ends by invoking the existing validator suite (`validate-all` equivalent) and refuses to report success if validation fails after the transform; failures are surfaced with the specific step that produced them, not a generic error.
- Every apply run ends by refreshing generated indexes/code graph the same way `migrate-step-notes` does today (`scanProject` + `writeCodeGraph`), since structural changes can invalidate cached graph data.
- Existing `vault migrate-step-notes` keeps working unmodified as a thin wrapper that invokes the single corresponding registry step directly (see Compatibility Strategy); it is not removed in the same phase this RFC ships in.
<!-- AGENT-END:architecture-command-contract -->

## Migration Categories

Not all vault schema bumps carry the same risk. The registry step definition MUST classify itself into one of:

- **Safe/automatic** — purely additive or mechanically reversible (e.g., adding a new generated block with a documented default, adding a new required-but-defaultable frontmatter field). `vault migrate --apply` runs these without extra confirmation.
- **Safe/needs confirmation** — content-changing but deterministic (e.g., today's legacy-step-note restructuring, which moves prose into companion files). `vault migrate --apply` runs these but the plan output must show a per-note diff summary (paths touched, count) before apply, and `vault migrate` (plan mode) is expected to be read first.
- **Unsafe/manual** — cannot be safely automated for arbitrary vaults (e.g., a rename that collides with user-authored content, or a structural change that depends on judgment calls the tool cannot make). These steps MUST NOT have an `apply()`; they only have `detect()` + a written manual-upgrade note, and `vault migrate` reports them as "manual action required" with a link to upgrade guidance, never silently skips them.

A registry step's category is fixed at authoring time and reviewed as part of the PR that adds it (see Maintainer Obligations).

## Safety Guarantees

<!-- AGENT-START:architecture-safety-guarantees -->
- `vault migrate` without `--apply` never writes to disk.
- Steps run strictly in ascending version order; the runner refuses to apply a step whose `from_version` does not match the vault's current recorded version (no gap-jumping, no reordering).
- Unsafe/manual steps block automatic progression past their version: `--apply` stops and reports the manual step rather than silently skipping it and advancing `vault_schema_version` past unmigrated content.
- Every apply is followed by validator invocation; a failing post-migration validation is reported as a migration failure, not swallowed.
- No registry step deletes user-authored prose sections (per [[07_Templates/Note_Contracts|Note Contracts]] "Editing Rules" — automation prefers frontmatter/generated-block edits). Steps that must move prose (like the step-notes split) relocate it into a companion note rather than discarding it.
- Migrations are safe to interrupt: because steps are ordered and the schema version is only advanced after a step's writes and validation succeed, re-running `vault migrate --apply` after an interruption resumes from the last completed step rather than re-applying or corrupting state.
<!-- AGENT-END:architecture-safety-guarantees -->

## Validator Relationship

- Validators (`validate-frontmatter`, `validate-note-structure`, `validate-required-links`, `detect-orphans`, `validate-all`) continue to check the current, single supported shape per note type — they do not grow "understand every historical shape" branches.
- `validate-all` gains one additional check: compare `.agent-vault/.config.json` `vault_schema_version` against the package's current schema version and emit a warning (not an error) pointing at `vault migrate` when the vault is behind. This keeps validators fast and deterministic while surfacing drift.
- A vault with no `vault_schema_version` recorded is treated as schema version `0` (the version implied by the vault shape before this RFC), so existing vaults do not need a one-time manual opt-in step to become migratable.
- Validators are the arbiter of "did the migration succeed," not the migration code itself — this is why every `--apply` run ends with a validator pass rather than a migration-internal success flag.

## Compatibility Strategy

- `migrate-step-notes` is registered as migration step `0 -> 1` in the new registry, reusing its existing detection (`isLegacyStepNoteContent`) and transform logic verbatim — this RFC asks for a registry wrapper, not a rewrite of working logic.
- The standalone `vault migrate-step-notes [--phase] [--step]` command keeps working after `vault migrate` ships. It becomes documented as an alias that runs one specific registry step with its existing filters, so existing user muscle memory and any external scripts calling it directly are not broken.
- README/CLI help updates that describe `vault migrate-step-notes` as "the" migration workflow (README.md around the command table and the "migration workflow" callout) are updated, in the implementation phase, to point at `vault migrate` as the general entry point while keeping the specific-command docs for users who want a scoped run.
- No forced adoption: a vault that never runs `vault migrate` keeps working exactly as it does today. The command is opt-in, matching the existing pattern where `migrate-step-notes` is manually invoked, not run automatically.

## Maintainer Obligations

<!-- AGENT-START:architecture-maintainer-obligations -->
- Any PR that changes a note template's required fields, headings, or generated-block names (i.e., bumps a `template_version`/`contract_version`, or changes `07_Templates/Note_Contracts.md` structural rules) MUST either (a) add a corresponding registry migration step in the same PR, or (b) explicitly justify in the PR description why no existing vault can be affected (e.g., a brand-new note type with no prior instances).
- Any PR that adds a registry step MUST state its migration category (safe/automatic, safe/needs confirmation, unsafe/manual) and include a test fixture vault snapshot representing the "before" shape.
- `CHANGELOG.md` entries for a vault-schema-bumping change MUST mention the new schema version number and link to (or summarize) what `vault migrate` will do, so users scanning the changelog know to run it.
- Removing a registry step (dropping support for migrating from a very old version) is itself a breaking change: it requires a major/minor package version bump per existing release discipline and an explicit "vaults on schema version < N must migrate before upgrading further" note in the changelog and README.
- The registry is append-only in practice: steps are not edited in place after release (to keep past upgrade paths reproducible); a bug in a shipped step is fixed by adding a corrective step, not by mutating the original.
<!-- AGENT-END:architecture-maintainer-obligations -->

## Failure Modes

- **No `.agent-vault/.config.json` yet** — treated as schema version 0, as stated above; `vault migrate` creates the config file as part of the first apply.
- **Vault partially upgraded by hand** — a user who manually restructured a note to look like the post-migration shape without updating `vault_schema_version`. `detect()` for a step should be tolerant (skip notes that already match the target shape rather than double-transforming), matching `migrate-step-notes`'s existing `content.includes('## Companion Notes')` early-out.
- **Vault skipped several package releases** — the runner applies every intervening step in order; this is the normal case, not a special one, because steps are ordered and cumulative.
- **Custom/non-standard vault content** (e.g., extra user-added headings or notes outside the known types) — migrations only ever touch the specific structures they target; untouched files and unrecognized headings are left alone, consistent with today's validator behavior of skipping unclassifiable notes rather than erroring on them.
- **Unsafe/manual step blocks further automated progress** — `vault migrate` plan output must make it unambiguous that later "safe" steps depending on that version are also held back, rather than implying the vault is up to date.

## Security and Performance

- `vault migrate --apply` performs the same class of filesystem writes `migrate-step-notes` already performs today (read + rewrite Markdown under `.agent-vault/`); no new file-system trust boundary is introduced.
- Plan mode must stay cheap enough to run before every apply as a matter of habit: it should reuse the existing note-scanning pass (`listMarkdownFiles`, frontmatter parsing) rather than adding a second full-vault walk.
- Migrations must not regress prompt-budget ergonomics established in [[04_Decisions/DEC-0002_use-headings-and-generated-blocks-as-targeted-extraction-selectors|DEC-0002]] — i.e., a step that changes generated-block names must update `vault_extract` selector expectations in the same change, not leave targeted extraction silently returning stale blocks.

## Open Questions Left for Implementation

- Exact on-disk location/shape for the registry module (single file vs. one file per step) — left to [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02]] to size as PR-sized units.
- Whether `vault migrate` needs a `--dry-run-verbose` per-note diff view beyond the summary counts described here, or whether that's deferred past first release.
- Whether the schema-version warning in `validate-all` should be promotable to an error via a config flag for teams that want to enforce staying current — left as a future decision, not required for first ship.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[01_Architecture/System_Overview|System Overview]]
- [[01_Architecture/Code_Map|Code Map]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Phase|PHASE-03 Package-level vault migration system]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_01_draft-package-level-migration-rfc|STEP-03-01 Draft package-level migration RFC]]
- [[02_Phases/Phase_03_package_level_vault_migration_system/Steps/Step_02_translate-rfc-into-pr-sized-implementation-checklist|STEP-03-02 Translate RFC into PR-sized implementation checklist]]
<!-- AGENT-END:architecture-related-notes -->
