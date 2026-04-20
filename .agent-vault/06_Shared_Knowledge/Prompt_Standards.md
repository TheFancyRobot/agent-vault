# Prompt Standards

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

\`\`\`md
Objective: Add X without changing Y.
Constraints: Keep API stable, update docs, preserve tests.
Context: Relevant package paths and current behavior.
Deliverable: Code change, updated note, test coverage.
Verification: Exact commands or checks to run.
\`\`\`

## Anti-Patterns

- Dumping the entire repo history into the prompt
- Asking for a broad goal without a success condition
- Hiding critical constraints in the last sentence
- Mixing unrelated tasks that should be tracked separately

## Related Notes

- [[01_Architecture/Agent_Workflow|Agent Workflow]]
- [[06_Shared_Knowledge/Coding_Standards|Coding Standards]]
