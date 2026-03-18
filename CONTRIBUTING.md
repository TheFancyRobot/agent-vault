# Contributing

Thanks for contributing to `agent-vault`.

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests (vitest)
bun run test:watch   # Run tests in watch mode
bun run build        # Build (tsup)
bun run e2e:local    # Publish to local Verdaccio and exercise bunx install E2E
bun run e2e:home     # Publish to local Verdaccio and install into your real HOME
bun run e2e:uninstall # Publish to local Verdaccio and exercise bunx uninstall E2E
bun run typecheck    # Type-check without emitting
```

## Local E2E

`bun run e2e:local` clears and recreates a dedicated temp workspace, starts a temporary Verdaccio registry, publishes a uniquely-versioned local build of `@fancyrobot/agent-vault`, runs `bunx @fancyrobot/agent-vault` in a throwaway project with a throwaway `HOME`, and verifies the installed runtime, config, and command files. The temp workspace is preserved at the end so you can keep testing against the installed package state.

`bun run e2e:home` uses the same local publish flow, but installs into your real `HOME` so Claude Code and OpenCode can use the locally published build immediately. This modifies your actual agent config and command directories.

`bun run e2e:uninstall` follows the same setup, then runs `bunx @fancyrobot/agent-vault uninstall` and verifies that the runtime, MCP config, and managed command files are removed cleanly.

Install flags are forwarded to the install step, so you can run:

```bash
bun run e2e:local -- --global
bun run e2e:local -- --cwd
bun run e2e:local -- --dry-run
bun run e2e:home -- --global
bun run e2e:uninstall -- --cwd
```

The preserved workspaces live at `/tmp/agent-vault-e2e-local`, `/tmp/agent-vault-e2e-home`, and `/tmp/agent-vault-e2e-uninstall` on Linux.
