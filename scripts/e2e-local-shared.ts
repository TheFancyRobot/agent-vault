import { strict as assert } from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const PACKAGE_NAME = '@fancyrobot/agent-vault';
const TOOL_CONFIGS = [
  {
    kind: 'claude',
    name: 'Claude Code',
    configPathParts: ['.claude.json'],
    commandsDirParts: ['.claude', 'commands'],
  },
  {
    kind: 'opencode',
    name: 'OpenCode',
    configPathParts: ['.config', 'opencode', 'config.json'],
    commandsDirParts: ['.config', 'opencode', 'commands'],
  },
  {
    kind: 'codex',
    name: 'Codex',
    configPathParts: ['.codex', 'config.json'],
    commandsDirParts: ['.codex', 'prompts'],
  },
  {
    kind: 'pi',
    name: 'pi',
    configPathParts: ['.pi', 'agent', 'settings.json'],
  },
] as const;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const commandSourceDir = join(repoRoot, 'claude-commands');

type InstallScope = 'global' | 'cwd';

type RunningProcess = {
  readonly child: ChildProcess;
  readonly stdout: string[];
  readonly stderr: string[];
};

interface LocalE2EOptions {
  cliArgs: string[];
  tempRootName: string;
  uninstallAfterInstall: boolean;
  successLabel: string;
  useRealHome?: boolean;
}

interface ToolConfig {
  kind: 'claude' | 'opencode' | 'codex' | 'pi';
  name: string;
  configPath: string;
  commandsDir?: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolvePromise) => {
  setTimeout(resolvePromise, ms);
});

const getFreePort = async (): Promise<number> => new Promise((resolvePromise, reject) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close(() => reject(new Error('Could not determine a free TCP port.')));
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolvePromise(address.port);
    });
  });
  server.on('error', reject);
});

const runCommand = async (
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; label: string },
): Promise<void> => {
  console.log(`\n==> ${options.label}`);
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}.`));
    });
  });
};

const startVerdaccio = (configPath: string, listenAddress: string, env: NodeJS.ProcessEnv): RunningProcess => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const child = spawn('bunx', ['verdaccio', '--config', configPath, '--listen', listenAddress], {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    stdout.push(text);
    process.stdout.write(`[verdaccio] ${text}`);
  });

  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    stderr.push(text);
    process.stderr.write(`[verdaccio] ${text}`);
  });

  return { child, stdout, stderr };
};

const waitForRegistry = async (url: string, processHandle: RunningProcess): Promise<void> => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (processHandle.child.exitCode !== null) {
      throw new Error(`Verdaccio exited early with code ${processHandle.child.exitCode}.`);
    }

    try {
      const response = await fetch(`${url}/-/ping`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the server comes up.
    }

    await sleep(250);
  }

  throw new Error('Timed out waiting for Verdaccio to start.');
};

const stopVerdaccio = async (processHandle: RunningProcess): Promise<void> => {
  if (processHandle.child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolvePromise) => {
    const timeout = setTimeout(() => {
      processHandle.child.kill('SIGKILL');
    }, 5_000);

    processHandle.child.once('exit', () => {
      clearTimeout(timeout);
      resolvePromise();
    });

    processHandle.child.kill('SIGTERM');
  });
};

const writeRegistryConfig = async (registryHome: string, registryUrl: string): Promise<void> => {
  await mkdir(registryHome, { recursive: true });
  await writeFile(join(registryHome, '.npmrc'), [
    `registry=${registryUrl}/`,
    `//${registryUrl.replace(/^https?:\/\//, '')}/:_authToken=e2e-token`,
    'always-auth=false',
    '',
  ].join('\n'), 'utf-8');
  await writeFile(join(registryHome, '.bunfig.toml'), [
    '[install]',
    `registry = "${registryUrl}/"`,
    '',
  ].join('\n'), 'utf-8');
};

const createVerdaccioConfig = async (tempRoot: string): Promise<string> => {
  const configPath = join(tempRoot, 'verdaccio.yaml');
  await writeFile(configPath, [
    `storage: ${JSON.stringify(join(tempRoot, 'storage'))}`,
    'auth:',
    '  htpasswd:',
    `    file: ${JSON.stringify(join(tempRoot, 'htpasswd'))}`,
    'uplinks:',
    '  npmjs:',
    '    url: https://registry.npmjs.org/',
    'packages:',
    '  "@*/*":',
    '    access: $all',
    '    publish: $all',
    '    proxy: npmjs',
    '  "**":',
    '    access: $all',
    '    publish: $all',
    '    proxy: npmjs',
    'server:',
    '  keepAliveTimeout: 60',
    'log:',
    '  type: stdout',
    '  format: pretty',
    '  level: error',
    '',
  ].join('\n'), 'utf-8');
  return configPath;
};

const stagePackageForPublish = async (tempRoot: string): Promise<{ publishDir: string; version: string }> => {
  const publishDir = join(tempRoot, 'publish');
  const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf-8')) as Record<string, unknown>;
  const version = `${String(packageJson.version)}-e2e.${Date.now()}`;
  packageJson.version = version;

  await mkdir(publishDir, { recursive: true });
  await writeFile(join(publishDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
  await cp(join(repoRoot, 'dist'), join(publishDir, 'dist'), { recursive: true });
  await cp(join(repoRoot, 'claude-commands'), join(publishDir, 'claude-commands'), { recursive: true });
  await cp(join(repoRoot, 'README.md'), join(publishDir, 'README.md'));
  await cp(join(repoRoot, 'LICENSE'), join(publishDir, 'LICENSE'));

  return { publishDir, version };
};

const createFakeToolHomes = async (homeDir: string): Promise<void> => {
  for (const tool of TOOL_CONFIGS) {
    const configPath = join(homeDir, ...tool.configPathParts);
    await mkdir(dirname(configPath), { recursive: true });

    if (tool.kind === 'pi') {
      await writeFile(configPath, JSON.stringify({
        packages: ['pi-skills'],
      }, null, 2) + '\n', 'utf-8');
      continue;
    }

    const rootKey = tool.kind === 'opencode' ? 'mcp' : 'mcpServers';
    const existingServer = tool.kind === 'opencode'
      ? {
          type: 'local',
          command: ['node', 'existing-server.js'],
          enabled: true,
        }
      : {
          type: 'stdio',
          command: 'existing',
        };
    await writeFile(configPath, JSON.stringify({
      [rootKey]: {
        'existing-server': {
          ...existingServer,
        },
      },
    }, null, 2) + '\n', 'utf-8');
  }
};

const detectTools = (homeDir: string, projectDir: string, expectedScope: InstallScope): ToolConfig[] => TOOL_CONFIGS
  .map((tool) => ({
    kind: tool.kind,
    name: tool.name,
    configPath: tool.kind === 'pi'
      ? (expectedScope === 'global'
        ? join(homeDir, '.pi', 'agent', 'settings.json')
        : join(projectDir, '.pi', 'settings.json'))
      : join(homeDir, ...tool.configPathParts),
    commandsDir: tool.commandsDirParts ? join(homeDir, ...tool.commandsDirParts) : undefined,
  }))
  .filter((tool) => {
    if (tool.kind === 'claude') {
      return existsSync(join(homeDir, '.claude')) || existsSync(tool.configPath);
    }
    if (tool.kind === 'pi') {
      return existsSync(join(homeDir, '.pi', 'agent')) || existsSync(join(projectDir, '.pi'));
    }
    return existsSync(dirname(tool.configPath));
  });

const getToolMcpRootKey = (tool: ToolConfig): 'mcp' | 'mcpServers' => (
  tool.kind === 'opencode' ? 'mcp' : 'mcpServers'
);

const assertValidToolMcpConfig = (tool: ToolConfig, agentVault: unknown, runtimeCliPath: string): void => {
  assert.ok(agentVault && typeof agentVault === 'object', `${tool.name} should store an MCP server config object`);
  const serverConfig = agentVault as Record<string, unknown>;

  if (tool.kind === 'opencode') {
    assert.equal(serverConfig.type, 'local', `${tool.name} should use OpenCode local MCP config`);
    assert.equal(serverConfig.enabled, true, `${tool.name} should enable the MCP server`);
    assert.ok(Array.isArray(serverConfig.command), `${tool.name} should store command as an array`);
    assert.deepEqual(serverConfig.command.slice(1), [runtimeCliPath, 'serve'], `${tool.name} should point at the installed runtime CLI`);
    const commandPath = String(serverConfig.command[0] ?? '');
    assert.ok(commandPath.startsWith('/'), `${tool.name} should store an absolute runtime executable path`);
    assert.ok(existsSync(commandPath), `${tool.name} should point at an installed runtime executable`);
    assert.ok(['node', 'bun', 'node.exe', 'bun.exe'].includes(basename(commandPath)), `${tool.name} should use Node or Bun as the runtime executable`);
    return;
  }

  assert.equal(serverConfig.type, 'stdio', `${tool.name} should use stdio MCP config`);
  assert.deepEqual(serverConfig.args, [runtimeCliPath, 'serve'], `${tool.name} should point at the installed runtime CLI`);
  const commandPath = String(serverConfig.command ?? '');
  assert.ok(commandPath.startsWith('/'), `${tool.name} should store an absolute runtime executable path`);
  assert.ok(existsSync(commandPath), `${tool.name} should point at an installed runtime executable`);
  assert.ok(['node', 'bun', 'node.exe', 'bun.exe'].includes(basename(commandPath)), `${tool.name} should use Node or Bun as the runtime executable`);
};

const readJson = async (path: string): Promise<Record<string, unknown>> => {
  const content = await readFile(path, 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
};

const getCommandFileCount = async (dir: string): Promise<number> => {
  try {
    const entries = await readdir(dir);
    return entries.filter((entry) => entry.endsWith('.md')).length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
};

const resolveExpectedInstallScope = (args: string[]): InstallScope => {
  if (args.includes('--global')) {
    return 'global';
  }

  if (args.includes('--cwd')) {
    return 'cwd';
  }

  return 'global';
};

const resolveExpectedInstallRoot = (scope: InstallScope, homeDir: string, projectDir: string): string => (
  scope === 'global' ? join(homeDir, '.agent-vault') : join(projectDir, '.agent-vault')
);

const getManagedCommandFilenames = async (toolName: string): Promise<string[]> => {
  const sourceFiles = (await readdir(commandSourceDir)).filter((file) => file.endsWith('.md')).sort();
  if (toolName === 'pi') {
    return [];
  }
  if (toolName !== 'Codex') {
    return sourceFiles;
  }

  return sourceFiles.map((file) => file.replace(/:/g, '-'));
};

const verifyInstalledState = async (
  tools: ToolConfig[],
  installRoot: string,
  expectedVersion: string,
  expectExistingServerPreserved: boolean,
): Promise<void> => {
  const runtimePackagePath = join(installRoot, '.runtime', 'node_modules', '@fancyrobot', 'agent-vault', 'package.json');
  const runtimeCliPath = join(installRoot, '.runtime', 'node_modules', '@fancyrobot', 'agent-vault', 'dist', 'cli.mjs');
  const runtimePackageRoot = join(installRoot, '.runtime', 'node_modules', '@fancyrobot', 'agent-vault');
  const runtimePackage = await readJson(runtimePackagePath);

  assert.equal(runtimePackage.version, expectedVersion, 'installed runtime version should match the locally published package');

  for (const tool of tools) {
    const config = await readJson(tool.configPath);

    if (tool.kind === 'pi') {
      const packages = Array.isArray(config.packages) ? config.packages : [];
      assert.ok(packages.includes(runtimePackageRoot), 'pi should include the installed Agent Vault package path');
      if (expectExistingServerPreserved) {
        assert.ok(packages.includes('pi-skills'), 'pi should preserve existing packages');
      }
      continue;
    }

    const rootKey = getToolMcpRootKey(tool);
    const mcpServers = (config[rootKey] ?? {}) as Record<string, unknown>;
    const agentVault = mcpServers['agent-vault'];

    if (expectExistingServerPreserved) {
      assert.ok(mcpServers['existing-server'], `${tool.name} should preserve existing MCP servers`);
    }
    assertValidToolMcpConfig(tool, agentVault, runtimeCliPath);

    const managedFilenames = await getManagedCommandFilenames(tool.name);
    for (const filename of managedFilenames) {
      const path = join(tool.commandsDir!, filename);
      assert.ok(existsSync(path), `${tool.name} should install managed command ${filename}`);
    }
  }
};

const verifyCleanState = async (
  tools: ToolConfig[],
  homeDir: string,
  projectDir: string,
  expectExistingServerPreserved: boolean,
): Promise<void> => {
  for (const tool of tools) {
    const config = await readJson(tool.configPath);

    if (tool.kind === 'pi') {
      const packages = Array.isArray(config.packages) ? config.packages : [];
      assert.ok(!packages.includes(join(homeDir, '.agent-vault', '.runtime', 'node_modules', '@fancyrobot', 'agent-vault')), 'pi should remove the global Agent Vault package path');
      assert.ok(!packages.includes(join(projectDir, '.agent-vault', '.runtime', 'node_modules', '@fancyrobot', 'agent-vault')), 'pi should remove the cwd Agent Vault package path');
      if (expectExistingServerPreserved) {
        assert.ok(packages.includes('pi-skills'), 'pi should preserve existing packages when install state is cleaned up');
      }
      continue;
    }

    const rootKey = getToolMcpRootKey(tool);
    const mcpServers = (config[rootKey] ?? {}) as Record<string, unknown>;

    if (expectExistingServerPreserved) {
      assert.ok(mcpServers['existing-server'], `${tool.name} should preserve the existing MCP server when install state is cleaned up`);
    }
    assert.equal(mcpServers['agent-vault'], undefined, `${tool.name} should not keep the agent-vault MCP server when install state is cleaned up`);

    const managedFilenames = await getManagedCommandFilenames(tool.name);
    for (const filename of managedFilenames) {
      const path = join(tool.commandsDir!, filename);
      assert.ok(!existsSync(path), `${tool.name} should not keep managed command ${filename} when install state is cleaned up`);
    }
  }

  for (const runtimeRoot of [join(homeDir, '.agent-vault'), join(projectDir, '.agent-vault')]) {
    try {
      await readdir(runtimeRoot);
      throw new Error(`install root should not exist after cleanup: ${runtimeRoot}`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      assert.equal(code, 'ENOENT', `install root should not exist after cleanup: ${runtimeRoot}`);
    }
  }
};

export async function runLocalE2E(options: LocalE2EOptions): Promise<void> {
  const tempRoot = join(tmpdir(), options.tempRootName);
  const installArgs = [...options.cliArgs];
  const useRealHome = options.useRealHome === true;
  const realHome = process.env.HOME ?? process.env.USERPROFILE;

  if (useRealHome && (!realHome || realHome.length === 0)) {
    throw new Error('Could not determine HOME for real-home E2E run.');
  }

  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });

  const registryHome = join(tempRoot, 'registry-home');
  const workspaceHome = useRealHome ? realHome! : join(tempRoot, 'workspace-home');
  const projectDir = useRealHome ? process.cwd() : join(tempRoot, 'project');
  const bunCacheDir = join(tempRoot, 'bun-cache');
  const expectedScope = resolveExpectedInstallScope(installArgs);
  const expectedInstallRoot = resolveExpectedInstallRoot(expectedScope, workspaceHome, projectDir);

  console.log(`Using temp root: ${tempRoot}`);
  if (useRealHome) {
    console.log(`Using real HOME: ${workspaceHome}`);
  }

  const port = await getFreePort();
  const registryUrl = `http://127.0.0.1:${port}`;
  const verdaccioConfigPath = await createVerdaccioConfig(tempRoot);
  await writeRegistryConfig(registryHome, registryUrl);
  if (!useRealHome) {
    await writeRegistryConfig(workspaceHome, registryUrl);
  }
  await mkdir(projectDir, { recursive: true });
  await mkdir(bunCacheDir, { recursive: true });
  if (!useRealHome) {
    await createFakeToolHomes(workspaceHome);
  }
  const detectedTools = detectTools(workspaceHome, projectDir, expectedScope);

  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: workspaceHome,
    NPM_CONFIG_REGISTRY: `${registryUrl}/`,
    BUN_INSTALL_CACHE_DIR: bunCacheDir,
  };

  const verdaccioEnv: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: registryHome,
  };

  const verdaccio = startVerdaccio(verdaccioConfigPath, `127.0.0.1:${port}`, verdaccioEnv);

  try {
    await waitForRegistry(registryUrl, verdaccio);
    await runCommand('bun', ['run', 'build'], {
      cwd: repoRoot,
      env: process.env,
      label: 'Build local package',
    });

    const { publishDir, version } = await stagePackageForPublish(tempRoot);
    await runCommand('bun', ['publish'], {
      cwd: publishDir,
      env: {
        ...baseEnv,
        HOME: registryHome,
      },
      label: `Publish ${PACKAGE_NAME}@${version} to local Verdaccio`,
    });

    await runCommand('bunx', [PACKAGE_NAME, ...installArgs], {
      cwd: projectDir,
      env: baseEnv,
      label: `Install Agent Vault from local registry with bunx${installArgs.length > 0 ? ` ${installArgs.join(' ')}` : ''}`,
    });

    if (installArgs.includes('--dry-run')) {
      await verifyCleanState(detectedTools, workspaceHome, projectDir, !useRealHome);
      console.log('\nDry-run assertions passed.');
    } else {
      await verifyInstalledState(detectedTools, expectedInstallRoot, version, !useRealHome);
      console.log('\nInstall assertions passed.');
    }

    if (options.uninstallAfterInstall) {
      await runCommand('bunx', [PACKAGE_NAME, 'uninstall'], {
        cwd: projectDir,
        env: baseEnv,
        label: 'Uninstall Agent Vault from local registry with bunx',
      });

      await verifyCleanState(detectedTools, workspaceHome, projectDir, !useRealHome);
      console.log('\nUninstall assertions passed.');
    }

    console.log(`\nArtifacts preserved at ${tempRoot}`);
    console.log(`\n${options.successLabel}`);
  } catch (error) {
    console.error('\nLocal E2E failed.');
    console.error(`Artifacts preserved at ${tempRoot}`);
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    throw error;
  } finally {
    await stopVerdaccio(verdaccio);
  }
}
