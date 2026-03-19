import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'node:readline/promises';

type CommandFormat = 'claude' | 'opencode' | 'codex';
type InstallScope = 'global' | 'cwd';
type PackageManager = 'bun' | 'npm';
type ToolKind = 'claude' | 'opencode' | 'codex';
type McpConfigRootKey = 'mcpServers' | 'mcp';

interface DetectedTool {
  kind: ToolKind;
  name: string;
  configPath: string;
  detected: boolean;
  commandsDir?: string;
  commandFormat?: CommandFormat;
}

interface InstallAction {
  tool: string;
  path: string;
  detail?: string;
}

interface InstallTarget {
  rootPath: string;
  runtimePath: string;
  cliPath: string;
}

const PACKAGE_NAME = '@fancyrobot/agent-vault';
const INSTALL_DIRNAME = '.agent-vault';
const RUNTIME_DIRNAME = '.runtime';

const COMMAND_SOURCE_DIR = join(dirname(new URL(import.meta.url).pathname), '..', 'claude-commands');
const CLAUDE_LEGACY_COMMANDS = [
  'vault-init.md', 'vault-create-step.md', 'vault-create-bug.md',
  'vault-create-session.md', 'vault-create-decision.md', 'vault-create-phase.md',
  'vault-validate.md', 'vault-refresh.md',
] as const;

interface CommandTemplate {
  sourceFilename: string;
  sourceCommandName: string;
  content: string;
}

interface RenderedCommand {
  filename: string;
  slashCommand: string;
  content: string;
}

const isBunRuntime = (): boolean => typeof process.versions.bun === 'string';

const getPackageManager = (): PackageManager => (isBunRuntime() ? 'bun' : 'npm');

export const resolveInstallRoot = (
  scope: InstallScope,
  cwd: string = process.cwd(),
  home: string = homedir(),
): string => join(scope === 'global' ? home : cwd, INSTALL_DIRNAME);

export const buildInstallTarget = (
  scope: InstallScope,
  cwd: string = process.cwd(),
  home: string = homedir(),
): InstallTarget => {
  const rootPath = resolveInstallRoot(scope, cwd, home);
  const runtimePath = join(rootPath, RUNTIME_DIRNAME);
  return {
    rootPath,
    runtimePath,
    cliPath: join(runtimePath, 'node_modules', '@fancyrobot', 'agent-vault', 'dist', 'cli.mjs'),
  };
};

export const buildMcpServerConfig = (target: InstallTarget, executablePath: string = process.execPath) => ({
  type: 'stdio' as const,
  command: executablePath,
  args: [target.cliPath, 'serve'],
});

export const buildOpenCodeMcpServerConfig = (target: InstallTarget, executablePath: string = process.execPath) => ({
  type: 'local' as const,
  command: [executablePath, target.cliPath, 'serve'],
  enabled: true,
});

const getToolMcpRootKey = (tool: DetectedTool): McpConfigRootKey => tool.kind === 'opencode' ? 'mcp' : 'mcpServers';

const buildToolMcpServerConfig = (tool: DetectedTool, target: InstallTarget) => (
  tool.kind === 'opencode'
    ? buildOpenCodeMcpServerConfig(target)
    : buildMcpServerConfig(target)
);

export const parseInstallScope = (args: string[]): InstallScope | null => {
  if (args.includes('--global')) {
    return 'global';
  }

  if (args.includes('--cwd')) {
    return 'cwd';
  }

  return null;
};

export const parseNumberedSelection = (answer: string, options: string[]): string[] | null => {
  const normalized = answer.trim().toLowerCase();

  if (normalized === '' || normalized === 'all' || normalized === '*') {
    return [...options];
  }

  if (normalized === '0' || normalized === 'none' || normalized === 'skip') {
    return [];
  }

  const tokens = normalized.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  const selectedIndexes = new Set<number>();
  for (const token of tokens) {
    const index = Number.parseInt(token, 10);
    if (!Number.isInteger(index) || index < 1 || index > options.length) {
      return null;
    }
    selectedIndexes.add(index - 1);
  }

  return options.filter((_, index) => selectedIndexes.has(index));
};

const writeRuntimeManifest = async (runtimePath: string): Promise<void> => {
  const packageJsonPath = join(runtimePath, 'package.json');
  if (existsSync(packageJsonPath)) {
    return;
  }

  await writeFile(packageJsonPath, JSON.stringify({
    name: 'agent-vault-runtime',
    private: true,
  }, null, 2) + '\n', 'utf-8');
};

const runPackageInstall = async (packageManager: PackageManager, cwd: string): Promise<void> => {
  const command = packageManager === 'bun'
    ? (process.platform === 'win32' ? 'bun.exe' : 'bun')
    : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const args = packageManager === 'bun'
    ? ['add', '--exact', `${PACKAGE_NAME}@latest`]
    : ['install', '--save-exact', `${PACKAGE_NAME}@latest`];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`));
    });
  });
};

const promptForInstallScope = async (): Promise<InstallScope> => {
  const globalRoot = resolveInstallRoot('global');
  const cwdRoot = resolveInstallRoot('cwd');

  console.log('Choose where Agent Vault should live:');
  console.log(`1) Global (${globalRoot})`);
  console.log(`2) This working directory (${cwdRoot})`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = (await rl.question('Install target [1]: ')).trim().toLowerCase();
      if (answer === '' || answer === '1' || answer === 'g' || answer === 'global') {
        return 'global';
      }

      if (answer === '2' || answer === 'c' || answer === 'cwd' || answer === 'local' || answer === 'project') {
        return 'cwd';
      }

      console.log('Enter 1 for the global install or 2 for the cwd-scoped install.');
    }
  } finally {
    rl.close();
  }
};

const resolveInstallScope = async (args: string[]): Promise<InstallScope> => {
  const requestedScope = parseInstallScope(args);
  if (requestedScope) {
    return requestedScope;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return 'global';
  }

  return promptForInstallScope();
};

const promptForInstallTools = async (detected: DetectedTool[]): Promise<DetectedTool[]> => {
  const optionLabels = detected.map((tool) => tool.name);
  const defaultSelection = optionLabels.map((_, index) => String(index + 1)).join(',');

  console.log('\nWhich agents do you want to install to?');
  for (const [index, tool] of detected.entries()) {
    console.log(`${index + 1}) ${tool.name}`);
  }
  console.log('Press Enter to configure all detected tools, or enter comma-separated numbers.');
  console.log('Enter 0 to skip tool configuration and only install the runtime.');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = await rl.question(`Agents [${defaultSelection}]: `);
      const selectedLabels = parseNumberedSelection(answer, optionLabels);
      if (selectedLabels) {
        const selectedSet = new Set(selectedLabels);
        return detected.filter((tool) => selectedSet.has(tool.name));
      }

      console.log(`Enter one or more numbers between 1 and ${detected.length}, press Enter for all, or 0 to skip.`);
    }
  } finally {
    rl.close();
  }
};

const resolveInstallTools = async (args: string[], detected: DetectedTool[]): Promise<DetectedTool[]> => {
  if (detected.length === 0) {
    return [];
  }

  if (args.includes('--global') || !process.stdin.isTTY || !process.stdout.isTTY) {
    return detected;
  }

  return promptForInstallTools(detected);
};

const ensureRuntimeInstalled = async (target: InstallTarget, dryRun: boolean): Promise<InstallAction> => {
  const packageManager = getPackageManager();
  const hadInstall = existsSync(target.cliPath);

  if (!dryRun) {
    await mkdir(target.runtimePath, { recursive: true });
    await writeRuntimeManifest(target.runtimePath);
    await runPackageInstall(packageManager, target.runtimePath);
  }

  return {
    tool: 'Installer',
    path: target.runtimePath,
    detail: `${hadInstall ? 'Updated' : 'Installed'} ${PACKAGE_NAME} with ${packageManager}`,
  };
};

const maybeRemoveEmptyDir = async (path: string, dryRun: boolean): Promise<boolean> => {
  if (!existsSync(path)) {
    return false;
  }

  const entries = await readdir(path);
  if (entries.length > 0) {
    return false;
  }

  if (!dryRun) {
    await rm(path, { recursive: true, force: true });
  }

  return true;
};

const uninstallInstalledRuntime = async (dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  const targets = [buildInstallTarget('global'), buildInstallTarget('cwd')];
  const seenRuntimePaths = new Set<string>();

  for (const target of targets) {
    if (seenRuntimePaths.has(target.runtimePath)) {
      continue;
    }
    seenRuntimePaths.add(target.runtimePath);

    if (!existsSync(target.runtimePath)) {
      continue;
    }

    if (!dryRun) {
      await rm(target.runtimePath, { recursive: true, force: true });
    }

    actions.push({
      tool: 'Installer',
      path: target.runtimePath,
      detail: `Removed installed runtime from ${target.runtimePath}`,
    });

    if (await maybeRemoveEmptyDir(target.rootPath, dryRun)) {
      actions.push({
        tool: 'Installer',
        path: target.rootPath,
        detail: `Removed empty install root ${target.rootPath}`,
      });
    }
  }

  return actions;
};

const toCodexPromptName = (commandName: string): string => commandName.replace(/:/g, '-');

const getFirstNonEmptyLine = (content: string): string => {
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return 'Run an Agent Vault command.';
};

const getCommandBody = (content: string): string => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmptyIndex === -1) {
    return '';
  }

  const bodyLines = lines.slice(firstNonEmptyIndex + 1);
  while (bodyLines.length > 0 && bodyLines[0] === '') {
    bodyLines.shift();
  }

  const body = bodyLines.join('\n').trimEnd();
  return body.length > 0 ? `${body}\n` : '';
};

const withDescriptionFrontmatter = (description: string, body: string): string => {
  const frontmatter = `---\ndescription: ${JSON.stringify(description)}\n---\n`;
  return body.length > 0 ? `${frontmatter}\n${body}` : `${frontmatter}\n`;
};

export const renderToolCommand = (template: CommandTemplate, format: CommandFormat): RenderedCommand => {
  if (format === 'claude') {
    return {
      filename: template.sourceFilename,
      slashCommand: template.sourceCommandName,
      content: template.content,
    };
  }

  const description = getFirstNonEmptyLine(template.content);
  const baseCommandName = format === 'codex'
    ? toCodexPromptName(template.sourceCommandName)
    : template.sourceCommandName;
  const slashCommand = format === 'codex'
    ? `prompts:${baseCommandName}`
    : baseCommandName;
  const body = getCommandBody(template.content).replaceAll(
    `/${template.sourceCommandName}`,
    `/${slashCommand}`,
  );

  return {
    filename: `${baseCommandName}.md`,
    slashCommand,
    content: withDescriptionFrontmatter(description, body),
  };
};

const readCommandTemplates = async (): Promise<CommandTemplate[]> => {
  try {
    const files = (await readdir(COMMAND_SOURCE_DIR))
      .filter((file) => file.endsWith('.md'))
      .sort();

    return Promise.all(files.map(async (file) => ({
      sourceFilename: file,
      sourceCommandName: file.replace(/\.md$/i, ''),
      content: await readFile(join(COMMAND_SOURCE_DIR, file), 'utf-8'),
    })));
  } catch {
    return [];
  }
};

const detectTools = (): DetectedTool[] => {
  const home = homedir();
  return [
    {
      kind: 'claude',
      name: 'Claude Code',
      configPath: join(home, '.claude.json'),
      detected: existsSync(join(home, '.claude')) || existsSync(join(home, '.claude.json')),
      commandsDir: join(home, '.claude', 'commands'),
      commandFormat: 'claude',
    },
    {
      kind: 'opencode',
      name: 'OpenCode',
      configPath: join(home, '.config', 'opencode', 'config.json'),
      detected: existsSync(join(home, '.config', 'opencode')),
      commandsDir: join(home, '.config', 'opencode', 'commands'),
      commandFormat: 'opencode',
    },
    {
      kind: 'codex',
      name: 'Codex',
      configPath: join(home, '.codex', 'config.json'),
      detected: existsSync(join(home, '.codex')),
      commandsDir: join(home, '.codex', 'prompts'),
      commandFormat: 'codex',
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

const installMcpServer = async (tool: DetectedTool, target: InstallTarget, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];

  const config = await readJsonSafe(tool.configPath);
  const rootKey = getToolMcpRootKey(tool);
  const mcpServers = (config[rootKey] ?? {}) as Record<string, unknown>;
  const nextConfig = buildToolMcpServerConfig(tool, target);
  const currentConfig = mcpServers['agent-vault'];

  if (JSON.stringify(currentConfig) !== JSON.stringify(nextConfig)) {
    mcpServers['agent-vault'] = nextConfig;
    config[rootKey] = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      path: tool.configPath,
      detail: `${currentConfig ? 'Updated' : 'Added'} agent-vault MCP server to ${rootKey}`,
    });
  }

  return actions;
};

const installToolCommands = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  if (!tool.commandsDir || !tool.commandFormat) {
    return actions;
  }

  const templates = await readCommandTemplates();
  for (const template of templates) {
    const rendered = renderToolCommand(template, tool.commandFormat);
    const target = join(tool.commandsDir, rendered.filename);
    const alreadyExists = existsSync(target);
    const currentContent = alreadyExists ? await readFile(target, 'utf-8') : null;
    if (currentContent !== rendered.content) {
      if (!dryRun) {
        await mkdir(tool.commandsDir, { recursive: true });
        await writeFile(target, rendered.content, 'utf-8');
      }
      actions.push({
        tool: tool.name,
        path: target,
        detail: `${alreadyExists ? 'Updated' : 'Copied'} slash command /${rendered.slashCommand}`,
      });
    }
  }

  return actions;
};

const uninstallTool = async (tool: DetectedTool, dryRun: boolean): Promise<InstallAction[]> => {
  const actions: InstallAction[] = [];
  const config = await readJsonSafe(tool.configPath);
  const rootKey = getToolMcpRootKey(tool);
  const mcpServers = (config[rootKey] ?? {}) as Record<string, unknown>;

  if (mcpServers['agent-vault']) {
    delete mcpServers['agent-vault'];
    config[rootKey] = mcpServers;

    if (!dryRun) {
      await writeJsonSafe(tool.configPath, config);
    }
    actions.push({
      tool: tool.name,
      path: tool.configPath,
      detail: `Removed agent-vault MCP server from ${rootKey}`,
    });
  }

  const { commandsDir, commandFormat } = tool;
  if (commandsDir && commandFormat) {
    const templates = await readCommandTemplates();
    const managedCommands = templates.map((template) => renderToolCommand(template, commandFormat));
    const filenames = managedCommands.map((command) => command.filename);

    if (commandFormat === 'claude') {
      filenames.push(...CLAUDE_LEGACY_COMMANDS);
    }

    for (const filename of filenames) {
      const path = join(commandsDir, filename);
      if (existsSync(path)) {
        if (!dryRun) {
          try {
            await unlink(path);
          } catch {
            // Ignore commands that disappear during uninstall.
          }
        }
        actions.push({
          tool: tool.name,
          path,
          detail: `Removed slash command ${filename}`,
        });
      }
    }
  }

  return actions;
};

export async function runInstall(args: string[]): Promise<void> {
  const dryRun = args.includes('--dry-run');
  const scope = await resolveInstallScope(args);
  const installTarget = buildInstallTarget(scope);
  const tools = detectTools();
  const detected = tools.filter((t) => t.detected);
  const selected = await resolveInstallTools(args, detected);

  console.log(`Install target: ${installTarget.rootPath} (${scope === 'global' ? 'global' : 'cwd-scoped'})`);
  if (dryRun) console.log('(dry run - no changes will be made)\n');
  if (detected.length > 0) {
    console.log(`Detected: ${detected.map((t) => t.name).join(', ')}`);
    if (selected.length === 0) {
      console.log('Selected: runtime only');
    } else if (selected.length !== detected.length) {
      console.log(`Selected: ${selected.map((t) => t.name).join(', ')}`);
    }
  } else {
    console.log('No supported agent tools detected right now. The runtime install will still be prepared.');
  }

  const allActions: InstallAction[] = [await ensureRuntimeInstalled(installTarget, dryRun)];

  for (const tool of selected) {
    const actions = await installMcpServer(tool, installTarget, dryRun);
    actions.push(...await installToolCommands(tool, dryRun));
    allActions.push(...actions);
  }

  for (const action of allActions) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${action.tool}: ${action.detail} (${action.path})`);
  }

  if (!dryRun) {
    console.log(`\nAgent Vault is ready at ${installTarget.rootPath}.`);
    if (selected.length > 0) {
      console.log(`Configured agent-vault for ${selected.map((t) => t.name).join(', ')}.`);
      console.log('Use /vault:init in Claude Code/OpenCode or /prompts:vault-init in Codex to initialize a vault.');
    } else {
      console.log('No supported agent tools were configured in this run.');
    }
  }
}

export async function runUninstall(args: string[]): Promise<void> {
  const dryRun = args.includes('--dry-run');
  const tools = detectTools();
  const detected = tools.filter((t) => t.detected);

  if (dryRun) console.log('(dry run - no changes will be made)\n');

  const allActions: InstallAction[] = await uninstallInstalledRuntime(dryRun);

  for (const tool of detected) {
    const actions = await uninstallTool(tool, dryRun);
    allActions.push(...actions);
  }

  if (allActions.length === 0) {
    console.log('Agent Vault is not configured in any detected tools or install roots. Nothing to do.');
    return;
  }

  for (const action of allActions) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${action.tool}: ${action.detail} (${action.path})`);
  }

  if (!dryRun) {
    console.log('\nUninstalled agent-vault from all detected tools.');
  }
}
