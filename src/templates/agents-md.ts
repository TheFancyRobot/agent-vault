/**
 * Embedded AGENTS.md template, genericized with {{repo_name}} placeholder.
 */

export const AGENTS_MD_TEMPLATE = `# Agent Vault Operating Contract

This file defines how agents and humans should read, create, and update notes inside \\\`.agent-vault/\\\`.

## Purpose

Agent Vault is the durable project memory layer for this repository.

It exists to preserve:

- architecture context
- phased implementation plans
- step-by-step execution notes
- bug forensics
- decision records
- session history
- roadmap context
- implementation history that may otherwise be lost over time

Agent Vault is designed to be:

- agent-write-first
- human-edit-safe
- markdown-native
- filesystem-native
- Obsidian-compatible

It is not a generic wiki.
It is not a second issue tracker.
It is not the source of truth for implementation.

## Source of Truth Boundaries

Use these boundaries unless explicitly instructed otherwise:

- **Codebase** = implementation, tests, build/runtime behavior, executable docs
- **Agent Vault** = context, reasoning, planning, history, bug forensics, decision records, execution notes

If the same fact could live in multiple places, choose one source of truth and link from the others.

## Recommended Read Order

Do not scan the whole vault by default.

When vault context is needed, use this read order:

1. \\\`00_Home/Active_Context.md\\\`
2. Relevant step note
3. Linked phase note
4. Linked architecture notes
5. Related bugs
6. Related decisions
7. Relevant prior sessions

Use local context clusters, not full-vault dumping.

## Core Design Principles

### 1. One repo = one vault

This vault represents the current repository.
Do not create a redundant project subfolder inside the vault.

### 2. Agent-write-first, human-edit-safe

Agents may create and update notes.
Humans may manually edit any note.

Automation must assume notes may have been manually edited.

### 3. Safe mutation only

Allowed mutation patterns:

- create note from template
- update YAML frontmatter
- update a known heading section
- update a bounded generated block
- append to append-only sections
- regenerate index files

Disallowed mutation patterns:

- rewriting entire notes casually
- deleting unknown sections
- removing human-authored narrative
- renaming notes without an explicit workflow
- reformatting files unnecessarily
- inventing new structure when existing structure is sufficient

### 4. Markdown must remain readable

All notes must remain understandable without special tooling.
Avoid opaque machine blobs.
Prefer clear prose, simple lists, and stable headings.

### 5. Graph usefulness depends on links

Use wiki links deliberately.
No orphan notes.
The graph is only useful if notes are linked consistently.

## Vault Structure

Expected high-level structure:

\\\`\\\`\\\`text
.agent-vault/
\u251c\u2500\u2500 .obsidian/
\u251c\u2500\u2500 AGENTS.md
\u251c\u2500\u2500 README.md
\u251c\u2500\u2500 00_Home/
\u251c\u2500\u2500 01_Architecture/
\u251c\u2500\u2500 02_Phases/
\u251c\u2500\u2500 03_Bugs/
\u251c\u2500\u2500 04_Decisions/
\u251c\u2500\u2500 05_Sessions/
\u251c\u2500\u2500 06_Shared_Knowledge/
\u251c\u2500\u2500 07_Templates/
\u2514\u2500\u2500 08_Automation/
\\\`\\\`\\\`

### Important areas:

00_Home/ \u2014 dashboards, active context, roadmap, indexes
01_Architecture/ \u2014 system maps, code maps, integration context, workflow docs
02_Phases/ \u2014 phase and step execution plans
03_Bugs/ \u2014 durable bug investigation and fix notes
04_Decisions/ \u2014 ADR-style decision records
05_Sessions/ \u2014 logs for individual work sessions
06_Shared_Knowledge/ \u2014 reusable project conventions and standards
07_Templates/ \u2014 canonical note templates
08_Automation/ \u2014 scripts, generators, indexers, validators, future integrations
### Note Types
#### Phase
A phase note defines a milestone or major body of work.
Typical contents:
- objective
- rationale
- scope
- non-goals
- dependencies
- acceptance criteria
- related architecture
- related bugs
- related decisions
- linked steps
#### Step
A step note is the primary executable work unit for a coding agent.
Typical contents:
- purpose
- rationale
- prerequisites
- relevant code paths
- required reading
- execution prompt
- agent-managed snapshot
- implementation notes
- human notes
- session history
- outcome summary

#### Bug
A bug note is a durable forensic record of a defect.
Typical contents:
- summary
- observed behavior
- expected behavior
- reproduction steps
- blast radius
- suspected root cause
- confirmed root cause
- workaround
- permanent fix plan
- regression coverage
- timeline

#### Decision
A decision note is an ADR-style record of an important design or workflow decision.
- Typical contents:
- status
- context
- decision
- alternatives considered
- tradeoffs
- consequences
- related notes
- change log

#### Session
A session note is a log for one meaningful work run.
Typical contents:
- objective
- planned scope
- execution log
- findings
- changed paths
- validation run
- bugs encountered
- decisions made or updated
- follow-up work
- completion summary

#### Architecture
An architecture note explains some durable aspect of the system, such as:
- system overview
- domain model
- code map
- integration map
- workflow boundaries
- failure modes
- constraints

### Required Linking Rules
Phase note must link to
- its step notes
- at least one architecture note

Step note must link to
- its phase note
- at least one architecture note
- relevant bug notes when known
- relevant decision notes when known

Bug note must link to
- a related step, phase, or session when known

Session note must link to
- exactly one primary step
- related bugs when applicable
- related decisions when applicable

Decision note must link to
- at least one related step, bug, or architecture note

**No orphan notes unless the note is newly created and not yet fully wired in.**

## Stable Headings
- Automation depends on stable headings.
- Do not casually rename required machine-targeted headings in managed note types.
- Custom sections are allowed.
- Unknown sections must be preserved.
- Automation should ignore sections it does not explicitly manage.

## Generated Blocks
Where bounded automation is required, use this exact format:
\\\`\\\`\\\`
<!-- AGENT-START:block-name -->
generated content

<!-- AGENT-END:block-name -->
Use generated blocks sparingly.
\\\`\\\`\\\`

Typical generated blocks include:
- active context summaries
- blockers
- critical bugs
- index tables
- step snapshots

Automation may replace the contents of a generated block, but should not damage surrounding content.

### File Mutation Safety Rules
Whenever editing an existing note:
- parse safely
- preserve unknown frontmatter keys
- preserve unknown sections
- only update targeted content
- do not remove human-authored narrative
- fail safely if structure is unexpected

If mutation fails:
- report the problem clearly
- do not silently corrupt the file
- prefer logging, validation output, or a session note entry over guessing

**Do not perform broad rewrites when a bounded edit is possible.**

## Manual Edits
Manual editing is a first-class feature of this system.

Humans are expected to:
- refine rationale
- correct agent assumptions
- add nuance
- improve prompts
- record edge cases
- preserve institutional memory
- reorganize prose when helpful, without breaking required machine-managed structure

**Do not optimize for automation at the expense of human readability.**

## Naming Conventions
Use stable, sortable filenames.

Examples:
- \\\`Phase_01_Foundation\\\`
- \\\`Step_02_Create_Safe_Update_Engine\\\`
- \\\`BUG-014_Context_Link_Drift\\\`
- \\\`DECISION-007_Use_Append_Only_Session_Logs\\\`
- \\\`2026-03-14_session_004_fix-context-link-drift\\\`

**Favor predictable names over clever names.**

## Expected Automation Surface
At minimum, the vault may contain or eventually support automation for:
- create-step
- create-session
- create-bug
- update-frontmatter
- append-section
- rebuild-indexes

Optional but useful automation:
- validate-frontmatter
- validate-note-structure
- validate-required-links
- detect-orphans

**Automation should remain conservative, explicit, and easy to review.**
## Recommended Workflow for Agents
When a task requires vault context, use this flow.

Before work
- Read 00_Home/Active_Context.md
- Identify the relevant step note
- Read the linked phase note
- Read the linked architecture notes
- Read related bugs and decisions as needed
- Create a session note before major work begins

During work
- Update notes conservatively
- Append to session logs rather than rewriting them
- Create or update bug notes when real defects are discovered
- Create or update decision notes when design changes meaningfully
- Keep links up to date

After work
- Update the step snapshot or relevant bounded sections
- Update related bug or decision notes if needed
- Rebuild indexes if meaningful note metadata changed
- Leave the vault in a coherent state for the next human or agent
## Active Context
\\\`00_Home/Active_Context.md\\\` is the primary bootstrap note.

Use it to identify:
- current focus
- blockers]
- critical bugs
- recommended reading order
- human warnings or caveats

Do not assume it is exhaustive.
Use it as the starting point for traversal.
### Indexes
The following files may include generated index regions:
- \\\`00_Home/Bugs_Index.md\\\`
- \\\`00_Home/Decisions_Index.md\\\`

**Preserve any human-authored commentary outside generated blocks.**
## Validation Expectations
When validators exist, use them before or after significant vault mutations.
Expected validation areas:
- frontmatter shape
- required headings
- generated block balance
- required links
- orphan detection

Warnings are acceptable for partially initialized notes.
Hard failures should be reserved for real structural problems.

## What Not To Do
Do not:
- treat the vault as disposable scratch output
- rewrite notes wholesale
- duplicate all issue-tracker state into markdown
- create giant omnibus notes when smaller linked notes are better
- invent extra hierarchy that duplicates the repository itself
- break manual editing ergonomics
- load the entire vault into working context unless truly necessary

## Default Operating Assumption
Use the smallest amount of vault context needed to perform the task correctly.

Start from Active_Context.md, follow links outward, and keep note edits bounded and safe.

## Related Notes

- [[README|Agent Vault README]]
- [[00_Home/Active_Context|Active Context]]
- [[07_Templates/Note_Contracts|Note Contracts]]
- [[08_Automation/README|Automation README]]
` as string;
