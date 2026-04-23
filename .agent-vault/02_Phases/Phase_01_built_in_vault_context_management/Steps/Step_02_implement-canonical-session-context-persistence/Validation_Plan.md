# Validation Plan

## Readiness Checklist

- Exact outcome and success condition: implement canonical session-owned context persistence so newly created and subsequently updated session notes contain the agreed v1 `context` frontmatter shape plus a single `## Context Handoff` prose section; success means generators, validators, and mutation helpers all accept and preserve that shape.
- Why this step matters to the phase: session notes are the canonical context store; without this step, `/vault:resume`, `/vault:execute`, and step mirroring still depend on implicit conversation memory.
- Prerequisites, setup state, and dependencies: depends on STEP-01-01 being locked; no external dependency is known.
- Concrete starting files, directories, packages, commands, and tests: start with `src/templates/note-templates.ts`, `.agent-vault/07_Templates/Session_Template.md`, `src/core/note-generators.ts`, `src/core/note-mutations.ts`, `src/core/note-validators.ts`, and the listed core tests.
- Required reading completeness: the reading list is sufficient if read in full; do not skip STEP-01-01 because that note defines the canonical field names and enum values.
- Implementation constraints and non-goals: do not add historical context snapshots to frontmatter, do not invent extra v1 lifecycle states, and do not mirror step context in this step beyond what is needed to keep session generation coherent.
- Validation commands, manual checks, and acceptance criteria mapping: run the targeted generator/validator/mutation tests plus `bun run typecheck`; manually inspect a generated session note fixture or sample output to verify `context`, `Context Handoff`, and existing required sections coexist correctly.
- Edge cases, failure modes, and recovery expectations: preserve CRLF-safe mutations, preserve unknown frontmatter keys, handle empty/default context fields cleanly, and fail validation loudly if required subfields or the handoff heading are missing.
- Security considerations or explicit not-applicable judgment: context summaries must not encourage storing secrets or raw credentials in session frontmatter; keep sensitive narrative in prose only when truly needed.
- Performance considerations or explicit not-applicable judgment: keep the context object lean so session-note parsing and home-note refreshes stay cheap.
- Integration touchpoints and downstream effects: STEP-01-03 will read this session shape for mirror updates and workflow behavior; STEP-01-04 will document and migrate it.
- Blockers, unresolved decisions, and handoff expectations: no current blocker; if the persistence shape proves too large for safe frontmatter updates, capture that as a decision before widening scope.
- Junior-developer readiness verdict: PASS once the implementer can name the template, generator, validator, and tests that together enforce canonical session context persistence.
