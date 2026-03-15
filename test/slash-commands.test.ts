import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { renderToolCommand } from '../src/install';

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

  it('command rendering covers every source command file', async () => {
    const files = await listCommandFiles();
    for (const file of files) {
      const content = await readFile(join(COMMANDS_DIR, file), 'utf-8');
      const template = {
        sourceFilename: file,
        sourceCommandName: file.replace('.md', ''),
        content,
      };

      expect(renderToolCommand(template, 'claude').filename, `${file} missing from Claude rendering`).toBe(file);
      expect(renderToolCommand(template, 'opencode').filename, `${file} missing from OpenCode rendering`).toBe(file);
      expect(renderToolCommand(template, 'codex').slashCommand, `${file} missing Codex prompts namespace`).toMatch(/^prompts:vault-/);
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
