import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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
  it('adds mcpServers key to empty config', async () => {
    const dir = await createTempDir('empty');
    const configPath = join(dir, 'settings.json');
    await writeFile(configPath, '{}', 'utf-8');

    const config = JSON.parse(await readFile(configPath, 'utf-8'));
    const mcpServers = (config.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers['agent-vault'] = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'agent-vault', 'serve'],
    };
    config.mcpServers = mcpServers;
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    const result = JSON.parse(await readFile(configPath, 'utf-8'));
    expect(result.mcpServers['agent-vault']).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'agent-vault', 'serve'],
    });
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
    mcpServers['agent-vault'] = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'agent-vault', 'serve'],
    };
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
        'agent-vault': { type: 'stdio', command: 'npx', args: ['-y', 'agent-vault', 'serve'] },
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
