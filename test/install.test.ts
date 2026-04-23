import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildInstallTarget,
  buildMcpServerConfig,
  buildOpenCodeMcpServerConfig,
  buildPiPackageSource,
  detectTools,
  parseNumberedSelection,
  parseInstallScope,
  removePiPackageSourcesFromConfig,
  renderToolCommand,
  resolveInstallRoot,
  upsertPiPackageSourceInConfig,
} from '../src/install';

// We test the JSON config merge logic directly since the install module
// depends on actual home directory paths. These tests verify the core
// merge behavior.

const tempRoots: string[] = [];

const createTempDir = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-install-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('install config merge', () => {
  const runtimeConfig = buildMcpServerConfig(
    buildInstallTarget('global', '/workspace/repo', '/home/alice'),
    '/usr/bin/node',
  );

  it('adds mcpServers key to empty config', async () => {
    const dir = await createTempDir('empty');
    const configPath = join(dir, 'settings.json');
    await writeFile(configPath, '{}', 'utf-8');

    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers['agent-vault'] = runtimeConfig;
    config.mcpServers = mcpServers;
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const result = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(result.mcpServers['agent-vault']).toEqual(runtimeConfig);
  });

  it('preserves existing mcpServers when adding agent-vault', async () => {
    const dir = await createTempDir('existing');
    const configPath = join(dir, 'settings.json');
    await writeFile(configPath, JSON.stringify({
      mcpServers: {
        'other-server': { type: 'stdio', command: 'other' },
      },
    }), 'utf-8');

    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    const mcpServers = config.mcpServers as Record<string, unknown>;
    mcpServers['agent-vault'] = runtimeConfig;
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const result = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(result.mcpServers['other-server']).toEqual({ type: 'stdio', command: 'other' });
    expect(result.mcpServers['agent-vault']).toBeTruthy();
  });

  it('uninstall removes agent-vault but preserves other servers', async () => {
    const dir = await createTempDir('uninstall');
    const configPath = join(dir, 'settings.json');
    await writeFile(configPath, JSON.stringify({
      mcpServers: {
        'other-server': { type: 'stdio', command: 'other' },
        'agent-vault': runtimeConfig,
      },
    }), 'utf-8');

    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    delete config.mcpServers['agent-vault'];
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const result = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(result.mcpServers['other-server']).toBeTruthy();
    expect(result.mcpServers['agent-vault']).toBeUndefined();
  });
});

describe('renderToolCommand', () => {
  const template = {
    sourceFilename: 'vault:create-phase.md',
    sourceCommandName: 'vault:create-phase',
    content: `Create a new phase in the vault.

Usage: /vault:create-phase <title> [--phase-number N] [--previous PHASE-ID]

Call the \`vault_create_phase\` MCP tool. The phase number is auto-generated if omitted.

Example: /vault:create-phase "Workflow Adoption"
`,
  };

  it('keeps Claude Code commands unchanged', () => {
    expect(renderToolCommand(template, 'claude')).toEqual({
      filename: 'vault:create-phase.md',
      slashCommand: 'vault:create-phase',
      content: template.content,
    });
  });

  it('renders OpenCode commands with description frontmatter', () => {
    const rendered = renderToolCommand(template, 'opencode');

    expect(rendered.filename).toBe('vault:create-phase.md');
    expect(rendered.slashCommand).toBe('vault:create-phase');
    expect(rendered.content).toContain('description: "Create a new phase in the vault."');
    expect(rendered.content).toContain('Usage: /vault:create-phase <title> [--phase-number N] [--previous PHASE-ID]');
    expect(rendered.content).not.toContain('\nCreate a new phase in the vault.\n\nUsage:');
  });

  it('renders Codex prompts with prompts: namespace', () => {
    const rendered = renderToolCommand(template, 'codex');

    expect(rendered.filename).toBe('vault-create-phase.md');
    expect(rendered.slashCommand).toBe('prompts:vault-create-phase');
    expect(rendered.content).toContain('description: "Create a new phase in the vault."');
    expect(rendered.content).toContain('Usage: /prompts:vault-create-phase <title> [--phase-number N] [--previous PHASE-ID]');
    expect(rendered.content).toContain('Example: /prompts:vault-create-phase "Workflow Adoption"');
  });

  it('rewrites cross-command references for Codex prompts', () => {
    const rendered = renderToolCommand({
      sourceFilename: 'vault:resume.md',
      sourceCommandName: 'vault:resume',
      content: `Resume work from the last saved session checkpoint.

Usage: /vault:resume [--session <session-id>]

If no sessions exist, suggest /vault:execute instead. Do not create a new session unless the user explicitly requests one via /vault:create-session.
`,
    }, 'codex');

    expect(rendered.content).toContain('Usage: /prompts:vault-resume [--session <session-id>]');
    expect(rendered.content).toContain('/prompts:vault-execute');
    expect(rendered.content).toContain('/prompts:vault-create-session');
    expect(rendered.content).not.toContain('/vault:');
  });

  it('renders rich workflow commands for OpenCode', async () => {
    for (const file of ['vault:plan.md', 'vault:refine.md', 'vault:execute.md', 'vault:resume.md']) {
      const content = await readFile(join(import.meta.dirname, '..', 'claude-commands', file), 'utf-8');
      const rendered = renderToolCommand({
        sourceFilename: file,
        sourceCommandName: file.replace('.md', ''),
        content,
      }, 'opencode');

      expect(rendered.filename).toBe(file);
      expect(rendered.slashCommand).toBe(file.replace('.md', ''));
      expect(rendered.content).toMatch(/^---\ndescription: /);
      expect(rendered.content).toContain(`Usage: /${file.replace('.md', '')}`);
    }
  });

  it('renders rich workflow commands for Codex', async () => {
    for (const file of ['vault:plan.md', 'vault:refine.md', 'vault:execute.md', 'vault:resume.md']) {
      const sourceCommandName = file.replace('.md', '');
      const content = await readFile(join(import.meta.dirname, '..', 'claude-commands', file), 'utf-8');
      const rendered = renderToolCommand({ sourceFilename: file, sourceCommandName, content }, 'codex');

      expect(rendered.filename).toBe(file.replace(':', '-'));
      expect(rendered.slashCommand).toBe(`prompts:${sourceCommandName.replace(':', '-')}`);
      expect(rendered.content).toMatch(/^---\ndescription: /);
      expect(rendered.content).toContain(`Usage: /prompts:${sourceCommandName.replace(':', '-')}`);
      expect(rendered.content).not.toContain('/vault:');
    }
  });
});

describe('install target helpers', () => {
  it('detects pi as an install target when pi settings exist', async () => {
    const home = await createTempDir('pi-home');
    const cwd = await createTempDir('pi-cwd');

    await mkdir(join(home, '.pi', 'agent'), { recursive: true });
    await writeFile(join(home, '.pi', 'agent', 'settings.json'), '{}\n', 'utf-8');

    const detected = detectTools('global', cwd, home).filter((tool) => tool.detected);

    expect(detected.map((tool) => tool.name)).toContain('pi');
  });

  it('ships the migrate-step-notes skill in the pi package', () => {
    expect(existsSync(join(import.meta.dirname, '..', 'pi-package', 'skills', 'vault-migrate-step-notes', 'SKILL.md'))).toBe(true);
  });

  it('parses explicit install scope flags', () => {
    expect(parseInstallScope(['--global'])).toBe('global');
    expect(parseInstallScope(['--cwd'])).toBe('cwd');
    expect(parseInstallScope([])).toBeNull();
  });

  it('parses numbered interactive agent selections', () => {
    const options = ['Claude Code', 'OpenCode', 'Codex'];

    expect(parseNumberedSelection('', options)).toEqual(options);
    expect(parseNumberedSelection('2, 1', options)).toEqual(['Claude Code', 'OpenCode']);
    expect(parseNumberedSelection('0', options)).toEqual([]);
    expect(parseNumberedSelection('all', options)).toEqual(options);
    expect(parseNumberedSelection('4', options)).toBeNull();
    expect(parseNumberedSelection('abc', options)).toBeNull();
  });

  it('resolves install roots for global and cwd scopes', () => {
    expect(resolveInstallRoot('global', '/workspace/repo', '/home/alice')).toBe('/home/alice/.agent-vault');
    expect(resolveInstallRoot('cwd', '/workspace/repo', '/home/alice')).toBe('/workspace/repo/.agent-vault');
  });

  it('builds runtime target paths under the chosen root', () => {
    const target = buildInstallTarget('cwd', '/workspace/repo', '/home/alice');

    expect(target.rootPath).toBe('/workspace/repo/.agent-vault');
    expect(target.runtimePath).toBe('/workspace/repo/.agent-vault/.runtime');
    expect(target.cliPath).toBe('/workspace/repo/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault/dist/cli.mjs');
  });

  it('points MCP config at the installed runtime CLI', () => {
    const config = buildMcpServerConfig(
      buildInstallTarget('global', '/workspace/repo', '/home/alice'),
      '/usr/bin/node',
    );

    expect(config).toEqual({
      type: 'stdio',
      command: '/usr/bin/node',
      args: ['/home/alice/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault/dist/cli.mjs', 'serve'],
    });
  });

  it('builds OpenCode MCP config using local command array format', () => {
    const config = buildOpenCodeMcpServerConfig(
      buildInstallTarget('global', '/workspace/repo', '/home/alice'),
      '/usr/bin/node',
    );

    expect(config).toEqual({
      type: 'local',
      command: ['/usr/bin/node', '/home/alice/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault/dist/cli.mjs', 'serve'],
      enabled: true,
    });
  });

  it('builds pi package source from the installed runtime package path', () => {
    const source = buildPiPackageSource(buildInstallTarget('cwd', '/workspace/repo', '/home/alice'));

    expect(source).toBe('/workspace/repo/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault');
  });
});

describe('pi package config helpers', () => {
  it('adds the installed runtime package path to pi settings without dropping existing packages', () => {
    const packageSource = '/workspace/repo/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault';
    const result = upsertPiPackageSourceInConfig({
      packages: ['pi-skills', { source: 'npm:@acme/other-package', prompts: [] }],
    }, packageSource);

    expect(result.changed).toBe(true);
    expect(result.config.packages).toEqual([
      'pi-skills',
      { source: 'npm:@acme/other-package', prompts: [] },
      packageSource,
    ]);
  });

  it('does not duplicate the runtime package path in pi settings', () => {
    const packageSource = '/workspace/repo/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault';
    const result = upsertPiPackageSourceInConfig({ packages: [packageSource] }, packageSource);

    expect(result.changed).toBe(false);
    expect(result.config.packages).toEqual([packageSource]);
  });

  it('removes installed runtime package paths from pi settings while preserving other packages', () => {
    const globalSource = '/home/alice/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault';
    const cwdSource = '/workspace/repo/.agent-vault/.runtime/node_modules/@fancyrobot/agent-vault';
    const result = removePiPackageSourcesFromConfig({
      packages: [globalSource, 'pi-skills', { source: 'npm:@acme/other-package', prompts: [] }, cwdSource],
    }, [globalSource, cwdSource]);

    expect(result.changed).toBe(true);
    expect(result.config.packages).toEqual([
      'pi-skills',
      { source: 'npm:@acme/other-package', prompts: [] },
    ]);
  });
});
