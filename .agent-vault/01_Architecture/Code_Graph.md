---
note_type: architecture
template_version: 2
contract_version: 1
title: Code Graph
architecture_id: "ARCH-0006"
status: active
owner: ""
reviewed_on: "2026-04-23"
created: "2026-04-23"
updated: "2026-04-23"
related_notes:
  - "[[01_Architecture/Code_Map|Code Map]]"
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

# Code Graph

## Purpose

- Provide a low-cost navigation summary for the indexed codebase.
- Keep default vault context small while preserving machine-readable symbol lookup.
- Point agents and engineers to the generated JSON index when detailed symbol data is needed.

## Overview

- Repository: agent-vault
- Files indexed: 33
- Symbols found: 548
- Detailed index path: `.agent-vault/08_Automation/code-graph/index.json`

## Key Components

- The markdown note is intentionally thin and should stay safe to include in routine vault traversals.
- The JSON index is the source for detailed symbol-to-file lookup.
- Directory summaries below show where most indexed code lives without inlining the full symbol table.

## Important Paths

- `.agent-vault/01_Architecture/Code_Graph.md` — compact human summary.
- `.agent-vault/08_Automation/code-graph/index.json` — full machine-readable index.

## Constraints

- Auto-generated during vault initialization and `vault_refresh target=code_graph`; do not hand-edit.
- This note must remain concise; full symbol dumps belong only in the JSON index.
- Files larger than 500 KB and common generated/test files are excluded.

## Failure Modes

- If source files are added outside the supported language set, they will not appear in the index.
- If the JSON index is stale, refresh the code graph before using it for lookup-heavy tasks.
- Deeply nested files (beyond 8 levels) are skipped.

## How to Use

1. Read this note first for a cheap overview.
2. For low-cost symbol/file discovery, use `vault_lookup_code_graph` instead of loading the full JSON index into prompt context.
3. Read the JSON index directly only for tooling or explicit offline inspection.
4. Use lookup results to narrow to a small set of source files before reading code.

## Directory Hotspots

- `src/core`: 12 files, 110 exported symbols, 228 internal symbols
- `src/scaffold`: 4 files, 18 exported symbols, 41 internal symbols
- `src`: 3 files, 10 exported symbols, 46 internal symbols
- `src/templates`: 8 files, 33 exported symbols, 2 internal symbols
- `scripts`: 2 files, 1 exported symbols, 31 internal symbols
- `pi-package/skills/vault-resume`: 2 files, 0 exported symbols, 21 internal symbols
- `test`: 1 files, 3 exported symbols, 1 internal symbols
- `pi-package/extensions`: 1 files, 0 exported symbols, 3 internal symbols

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/Code_Map|Code Map]]
- [[01_Architecture/System_Overview|System Overview]]
<!-- AGENT-END:architecture-related-notes -->
