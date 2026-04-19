const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (command === '--help' || command === '-h' || command === 'help') {
    console.log(`agent-vault - Durable project memory for coding agents

Usage:
  npx @fancyrobot/agent-vault                   Install/update Agent Vault and configure detected agent tools
  bunx @fancyrobot/agent-vault                  Same install/update flow via Bun
  npx @fancyrobot/agent-vault uninstall         Remove MCP server configuration
  npx @fancyrobot/agent-vault serve             Start MCP stdio server (used by agent tools)

Options:
  --global                    Install runtime in ~/.agent-vault without agent prompts
  --cwd                       Install runtime in $PWD/.agent-vault
  --dry-run                   Show what would change without modifying files
  --help                      Show this help message
`);
    process.exit(0);
  } else if (command === 'serve') {
    const { startServer } = await import('./mcp-server.js');
    await startServer();
  } else if (command === 'uninstall') {
    const { runUninstall } = await import('./install.js');
    await runUninstall(args.slice(1));
  } else if (!command || command.startsWith('-')) {
    const { runInstall } = await import('./install.js');
    await runInstall(args);
  } else {
    console.log(`agent-vault - Durable project memory for coding agents

Usage:
  npx @fancyrobot/agent-vault                   Install/update Agent Vault and configure detected agent tools
  bunx @fancyrobot/agent-vault                  Same install/update flow via Bun
  npx @fancyrobot/agent-vault uninstall         Remove MCP server configuration
  npx @fancyrobot/agent-vault serve             Start MCP stdio server (used by agent tools)

Options:
  --global                    Install runtime in ~/.agent-vault without agent prompts
  --cwd                       Install runtime in $PWD/.agent-vault
  --dry-run                   Show what would change without modifying files
  --help                      Show this help message
`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
