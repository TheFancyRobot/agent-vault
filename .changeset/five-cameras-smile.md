---
"@fancyrobot/agent-vault": patch
---

Improve low-context migration and code-graph behavior.

- Refresh `Code_Graph.md` into a thin summary note and regenerate `.agent-vault/08_Automation/code-graph/index.json`
- Make `migrate-step-notes` upgrade legacy step notes and compact code-graph artifacts in one pass
- Document the migration behavior in README and command help so slash-command users understand the upgrade path
