const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  if (command === 'serve') {
    const { startServer } = await import('./mcp-server.js');
    await startServer();
  } else if (command === 'install') {
    const { runInstall } = await import('./install.js');
    await runInstall(args.slice(1));
  } else if (command === 'uninstall') {
    const { runUninstall } = await import('./install.js');
    await runUninstall(args.slice(1));
  } else {
    console.log(`agent-vault - Durable project memory for coding agents

Usage:
  npx @fancyrobot/agent-vault install     Configure MCP server in Claude Code, OpenCode, Codex
  npx @fancyrobot/agent-vault uninstall   Remove MCP server configuration
  npx @fancyrobot/agent-vault serve       Start MCP stdio server (used by agent tools)

Options:
  --dry-run                   Show what would change without modifying files
  --help                      Show this help message
`);
    process.exit(command === '--help' || command === '-h' ? 0 : 1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
