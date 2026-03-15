import { existsSync } from 'fs';
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { homedir } from 'os';

interface DetectedTool {
  name: string;
  configPath: string;
  detected: boolean;
}

interface InstallAction {
  tool: string;
  action: string;
  path: string;
  detail?: string;
}

const MCP_SERVER_CONFIG = {
  type: 'stdio' as const,
  command: 'npx',
  args: ['-y', 'agent-vault', 'serve'],
};

const CLAUDE_COMMANDS_DIR = join(dirname(new URL(import.meta.url).pathname), '..', 'claude-commands');

const detectTools = (): DetectedTool[] => {
  const home = homedir();
  return [
    {
      name: 'Claude Code',
      configPath: join(home, '.claude', 'settings.json'),
      detected: existsSync(join(home, '.claude')),
    },
    {
      name: 'OpenCode',
      configPath: join(home, '.config', 'opencode', 'config.json'),
      detected: existsSync(join(home, '.config', 'opencode')),
    },
    {
      name: 'Codex',
      configPath: join(home, '.codex', 'config.json'),
      detected: existsSync(join(home, '.codex')),
    },
  ];
};

const readJsonSafe = async (path: string): Promise<Record<string, unknown>> => {
  try {
    if (!existsSync(path)) return {};
    const content = await readFile(path, 'utf-8');
    const trimmed = content.trim();
    if (trimmed.length === 0) return {};
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
};

const writeJsonSafe = async (path: string, data: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
};

const installClaudeCode = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];

  // Add MCP server config
  const config = await readJsonSafe(tool.configPath);
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (!mcpServers['agent-vault']) {
    mcpServers['agent-vault'] = MCP_SERVER_CONFIG;
    config.mcpServers = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      action: 'add_mcp_server',
      path: tool.configPath,
      detail: 'Added agent-vault MCP server to mcpServers',
    });
  }

  // Copy slash commands
  const commandsDir = join(homedir(), '.claude', 'commands');
  if (existsSync(CLAUDE_COMMANDS_DIR)) {
    const { readdir } = await import('fs/promises');
    try {
      const commandFiles = await readdir(CLAUDE_COMMANDS_DIR);
      for (const file of commandFiles) {
        if (!file.endsWith('.md')) continue;
        const target = join(commandsDir, file);
        if (!existsSync(target)) {
          if (!dryRun) {
            await mkdir(commandsDir, { recursive: true });
            await copyFile(join(CLAUDE_COMMANDS_DIR, file), target);
          }
          actions.push({
            tool: tool.name,
            action: 'copy_command',
            path: target,
            detail: `Copied slash command ${file}`,
          });
        }
      }
    } catch {
      // claude-commands dir may not exist in dev
    }
  }

  return actions;
};

const installOpenCode = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  const config = await readJsonSafe(tool.configPath);
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (!mcpServers['agent-vault']) {
    mcpServers['agent-vault'] = MCP_SERVER_CONFIG;
    config.mcpServers = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      action: 'add_mcp_server',
      path: tool.configPath,
      detail: 'Added agent-vault MCP server to mcpServers',
    });
  }

  return actions;
};

const installCodex = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  const config = await readJsonSafe(tool.configPath);
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (!mcpServers['agent-vault']) {
    mcpServers['agent-vault'] = MCP_SERVER_CONFIG;
    config.mcpServers = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      action: 'add_mcp_server',
      path: tool.configPath,
      detail: 'Added agent-vault MCP server to mcpServers',
    });
  }

  return actions;
};

const uninstallTool = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  const config = await readJsonSafe(tool.configPath);
  const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (mcpServers['agent-vault']) {
    delete mcpServers['agent-vault'];
    config.mcpServers = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      action: 'remove_mcp_server',
      path: tool.configPath,
      detail: 'Removed agent-vault MCP server from mcpServers',
    });
  }

  // Remove Claude Code slash commands
  if (tool.name === 'Claude Code') {
    const commandsDir = join(homedir(), '.claude', 'commands');
    const vaultCommands = [
      'vault-init.md', 'vault-create-step.md', 'vault-create-bug.md',
      'vault-create-session.md', 'vault-create-decision.md', 'vault-create-phase.md',
      'vault-validate.md', 'vault-refresh.md',
    ];
    const { unlink } = await import('fs/promises');
    for (const cmd of vaultCommands) {
      const path = join(commandsDir, cmd);
      if (existsSync(path)) {
        if (!dryRun) {
          try { await unlink(path); } catch { /* ignore */ }
        }
        actions.push({
          tool: tool.name,
          action: 'remove_command',
          path,
          detail: `Removed slash command ${cmd}`,
        });
      }
    }
  }

  return actions;
};

export async function runInstall(args: string[]): Promise<void> {
  const dryRun = args.includes('--dry-run');
  const tools = detectTools();
  const detected = tools.filter((t) => t.detected);

  if (detected.length === 0) {
    console.log('No supported agent tools detected (Claude Code, OpenCode, Codex).');
    console.log('Install one of these tools first, then run `npx agent-vault install` again.');
    return;
  }

  console.log(`Detected: ${detected.map((t) => t.name).join(', ')}`);
  if (dryRun) console.log('(dry run - no changes will be made)\n');

  const allActions: InstallAction[] = [];

  for (const tool of detected) {
    let actions: InstallAction[];
    switch (tool.name) {
      case 'Claude Code':
        actions = await installClaudeCode(tool, dryRun);
        break;
      case 'OpenCode':
        actions = await installOpenCode(tool, dryRun);
        break;
      case 'Codex':
        actions = await installCodex(tool, dryRun);
        break;
      default:
        actions = [];
    }
    allActions.push(...actions);
  }

  if (allActions.length === 0) {
    console.log('Already configured. Nothing to do.');
    return;
  }

  for (const action of allActions) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${action.tool}: ${action.detail} (${action.path})`);
  }

  if (!dryRun) {
    console.log(`\nInstalled agent-vault for ${detected.map((t) => t.name).join(', ')}.`);
    console.log('Use /vault-init in your agent tool to initialize a vault in any project.');
  }
}

export async function runUninstall(args: string[]): Promise<void> {
  const dryRun = args.includes('--dry-run');
  const tools = detectTools();
  const detected = tools.filter((t) => t.detected);

  if (detected.length === 0) {
    console.log('No agent tools detected. Nothing to uninstall.');
    return;
  }

  if (dryRun) console.log('(dry run - no changes will be made)\n');

  const allActions: InstallAction[] = [];

  for (const tool of detected) {
    const actions = await uninstallTool(tool, dryRun);
    allActions.push(...actions);
  }

  if (allActions.length === 0) {
    console.log('Agent Vault is not configured in any detected tools. Nothing to do.');
    return;
  }

  for (const action of allActions) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${action.tool}: ${action.detail} (${action.path})`);
  }

  if (!dryRun) {
    console.log('\nUninstalled agent-vault from all detected tools.');
  }
}
