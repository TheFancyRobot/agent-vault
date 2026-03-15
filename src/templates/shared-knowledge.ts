/**
 * Embedded shared knowledge templates from 06_Shared_Knowledge/.
 * Genericized: fred-specific coding standards (Effect idioms, runtime boundary rules)
 * have been removed. Generic standards about change hygiene and vault rules are kept.
 */

export const CODING_STANDARDS = `# Coding Standards

This note captures the repo-level engineering rules most likely to matter during implementation.

## Change Hygiene

- Read surrounding code before editing shared modules.
- Prefer small, composable changes over broad rewrites.
- Update documentation when behavior, structure, or workflow changes.
- Keep tests focused on deterministic behavior.
- Follow existing package structure instead of inventing parallel abstractions.
- Avoid destructive git operations unless explicitly requested.

## Vault-Specific Standards

- Keep one vault per repo.
- Do not add a nested project folder inside \\\`.agent-vault/\\\`.
- Prefer wiki links and stable headings over clever formatting.
- Make notes safe for both agents and humans to edit.

## Reference Notes

- [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
- [[06_Shared_Knowledge/Prompt_Standards|Prompt Standards]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
` as string;

export const PROMPT_STANDARDS = `# Prompt Standards

Use these rules when writing prompts, agent instructions, or task briefs that should stay reusable.

## Core Rules

- Start with the outcome, not the backstory.
- State hard constraints explicitly.
- Give the smallest useful context window.
- Define the expected output shape.
- Call out required verification steps.
- Separate facts from assumptions.

## Good Prompt Shape

1. Objective
2. Constraints
3. Relevant repo context
4. Expected deliverable
5. Verification

## Example Skeleton

\\\`\\\`\\\`md
Objective: Add X without changing Y.
Constraints: Keep API stable, update docs, preserve tests.
Context: Relevant package paths and current behavior.
Deliverable: Code change, updated note, test coverage.
Verification: Exact commands or checks to run.
\\\`\\\`\\\`

## Anti-Patterns

- Dumping the entire repo history into the prompt
- Asking for a broad goal without a success condition
- Hiding critical constraints in the last sentence
- Mixing unrelated tasks that should be tracked separately

## Related Notes

- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[06_Shared_Knowledge/Coding_Standards|Coding Standards]]
` as string;

export const BUG_TAXONOMY = `# Bug Taxonomy

Use this taxonomy to keep bug notes consistent.

## Severity

- \\\`sev-1\\\` production-blocking, data loss, or security-impacting
- \\\`sev-2\\\` major feature failure with no reasonable workaround
- \\\`sev-3\\\` incorrect behavior with a workaround or limited blast radius
- \\\`sev-4\\\` minor defect, polish issue, or low-risk regression

## Category

- \\\`logic\\\` incorrect program behavior
- \\\`integration\\\` failure across boundaries or services
- \\\`regression\\\` previously working behavior now broken
- \\\`performance\\\` latency, memory, or throughput issue
- \\\`ux\\\` confusing or misleading user experience
- \\\`docs\\\` documentation mismatch or missing guidance
- \\\`test\\\` flaky or incorrect validation

## Lifecycle

- new
- investigating
- fix-in-progress
- fixed-awaiting-verification
- closed

## Minimum Bug Record

- id
- summary
- symptoms
- severity and category
- affected area
- reproduction steps
- root cause
- fix summary
- verification

## Related Notes

- [[00_Home/Bugs_Index|Bugs Index]]
- [[07_Templates/Bug_Template|Bug Template]]
` as string;

export const DEFINITION_OF_DONE = `# Definition Of Done

A task is done when the change is both implemented and made legible for the next person.

## Minimum Done Criteria

- The intended change exists and matches the requested scope.
- Relevant tests, checks, or manual verification steps were run or explicitly noted as pending.
- User-facing or operator-facing behavior changes are documented when needed.
- New bugs, decisions, or follow-up work are recorded instead of left implicit.
- The active context reflects the latest truth when the work materially changes current focus.

## Done For Vault Work

- The right note exists in the right folder.
- The note has enough context to be useful later.
- Links point to the next note a reader will likely need.
- Templates remain clean and reusable after the new work is learned.

## Not Done Yet

- Code changed but no verification happened.
- A significant tradeoff was made but never written down.
- A phase note says work is complete but the indexes still point nowhere.

## Related Notes

- [[00_Home/Active_Context|Active Context]]
- [[06_Shared_Knowledge/Coding_Standards|Coding Standards]]
- [[06_Shared_Knowledge/Agent_Workflow_Playbooks|Agent Workflow Playbooks]]
` as string;

export const AGENT_WORKFLOW_PLAYBOOKS = `# Agent Workflow Playbooks

Use these playbooks when deciding how to document a piece of work.

## Feature Playbook

1. Update or create a phase note.
2. Refresh [[00_Home/Active_Context|Active Context]] with goal and scope.
3. Record decisions as they become durable.
4. End with verification notes and a session entry.

## Bugfix Playbook

1. Create or update a bug note.
2. Capture reproduction and affected area before changing code.
3. Record root cause once known.
4. Link verification steps and close the bug only after validation.

## Refactor Playbook

1. Write down the reason for refactoring.
2. Protect behavior with tests or clear regression checks.
3. Record any architecture decisions that change boundaries.
4. Update code map or integration map if structure changes.

## Docs Or Knowledge Playbook

1. Update the durable note, not just the current session log.
2. Add links from the hub or index note if discoverability changes.
3. Trim stale statements rather than layering contradictions.

## Related Notes

- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
- [[07_Templates/Session_Template|Session Template]]
` as string;
