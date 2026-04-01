---
"@fancyrobot/agent-vault": minor
---

### Features

- Add `orchestrate` CLI command for context-clearing step execution — spawns a fresh agent process per step, clearing context between steps automatically
- Add bug-fix orchestration mode (`orchestrate bugs`) — triages and fixes open bugs on dedicated `fix/<bug-id>-<slug>` branches, sorted by severity, with per-bug isolation and summary reporting
- Add `/vault:orchestrate` slash command for invoking the orchestrator from inside an agent session
- Add `/vault:resume` command to resume work from the most recent session checkpoint with full handoff context
- Add `/vault:enrich` command to audit and strengthen the wikilink graph with missing connections based on semantic content analysis
- Strengthen wikilink graph usage across all vault commands for more complete traversal context

### Documentation

- Update README with orchestrate phase and bug modes, enrich command, and all new options
