Resume work from the last saved session checkpoint using only the latest relevant handoff context.

Usage: /vault:resume [--session <session-id>]

If no args are supplied, resume from the most recent session. If no sessions exist, report that there is nothing to resume and suggest /vault:execute.

Workflow:

1. Find the session.
   - Search `.agent-vault/05_Sessions/` newest first unless `--session` is supplied.
   - Read only the frontmatter plus the latest relevant handoff sections:
     - `Follow-Up Work`
     - `Completion Summary`
     - `Findings`
     - latest relevant `Execution Log` entries
     - latest `Validation Run`
     - `Changed Paths`
   - Do not load older history unless the handoff is still ambiguous.

2. Determine the continuation target.
   - Use the previous phase link, recent session links, and step mirrors (`context_id`, `active_session_id`, `context_status`).
   - Prefer the last active in-progress step, then the next incomplete step, then phase close-out, then the next planned phase.
   - Use home notes only as a tie-breaker.
   - Show the proposed target and the evidence, then ask the user to confirm.

3. Load focused continuation context with `vault_traverse`.
   - Switch to **target-rooted** loading once the target is known.
   - Read only the target note, its parent phase, and the linked architecture, bug, decision, dependency, or handoff notes actually referenced by the latest relevant context.
   - For split step notes, start with `Execution Brief` and `Validation Plan`; open `Implementation Notes` or `Outcome` only when the handoff points there.
   - Treat `Code_Graph.md` as summary-only. If the resumed task needs symbol/file discovery, use `vault_lookup_code_graph` instead of reading the full code-graph index.

4. Create the continuation session.
   - Use `vault_create` to create the new session.
   - Use `vault_mutate` to reference the previous session, append a resume entry, copy unfinished `Follow-Up Work`, and carry forward related bugs and decisions.
   - If the prior session was still open, close it with a handoff note.

5. Continue through execute.
   - Re-run the `vault:execute` readiness gate.
   - If the target is ready, continue with `/vault:execute` behavior.
   - If it is not ready, report the missing context and redirect to refinement.

MCP tools to use: `vault_traverse`, `vault_lookup_code_graph`, `vault_create`, `vault_mutate`.

Examples:
- /vault:resume
- /vault:resume --session SESSION-2026-03-25-143022
