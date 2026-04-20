# Coding Standards

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
- Do not add a nested project folder inside \`.agent-vault/\`.
- Prefer wiki links and stable headings over clever formatting.
- Make notes safe for both agents and humans to edit.

## Reference Notes

- [[06_Shared_Knowledge/Definition_Of_Done|Definition Of Done]]
- [[06_Shared_Knowledge/Prompt_Standards|Prompt Standards]]
- [[01_Architecture/Agent_Workflow|Agent Workflow]]
