import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const COMMANDS_DIR = join(import.meta.dirname, '..', 'claude-commands');

const NAMESPACE = 'vault';

const listCommandFiles = async (): Promise<string[]> => {
  const files = await readdir(COMMANDS_DIR);
  return files.filter((f) => f.endsWith('.md')).sort();
};

describe('slash commands', () => {
  it('all files use the vault: namespace prefix', async () => {
    const files = await listCommandFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(new RegExp(`^${NAMESPACE}:.+\\.md$`));
    }
  });

  it('usage line matches the filename', async () => {
    const files = await listCommandFiles();
    for (const file of files) {
      const content = await readFile(join(COMMANDS_DIR, file), 'utf-8');
      const commandName = file.replace('.md', '');
      const usageMatch = content.match(/Usage:\s*\/(\S+)/);
      if (usageMatch) {
        expect(usageMatch[1]).toBe(commandName);
      }
    }
  });

  it('no stale /vault- references in any command file', async () => {
    const files = await listCommandFiles();
    for (const file of files) {
      const content = await readFile(join(COMMANDS_DIR, file), 'utf-8');
      expect(content, `${file} contains stale /vault- reference`).not.toMatch(/\/vault-/);
    }
  });

  it('uninstall list covers every command file', async () => {
    const files = await listCommandFiles();
    const installSrc = await readFile(join(import.meta.dirname, '..', 'src', 'install.ts'), 'utf-8');
    for (const file of files) {
      expect(installSrc, `${file} missing from uninstall list`).toContain(`'${file}'`);
    }
  });

  it('each command file references an MCP tool', async () => {
    const files = await listCommandFiles();
    for (const file of files) {
      const content = await readFile(join(COMMANDS_DIR, file), 'utf-8');
      expect(content, `${file} does not reference an MCP tool`).toMatch(/`vault_\w+`/);
    }
  });
});
