import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Path to the canonical vault templates in this repo.
 * Tests copy templates from here to temp vaults so runtime generators stay aligned
 * with the checked-in vault contract.
 */
const REPO_VAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.agent-vault');

export const copyTemplate = async (tempVaultRoot: string, templateName: string): Promise<void> => {
  const source = join(REPO_VAULT_ROOT, '07_Templates', templateName);
  const target = join(tempVaultRoot, '07_Templates', templateName);
  await mkdir(join(tempVaultRoot, '07_Templates'), { recursive: true });
  await writeFile(target, await readFile(source, 'utf-8'), 'utf-8');
};

export const copyHomeNote = async (tempVaultRoot: string, noteName: string): Promise<void> => {
  const source = join(REPO_VAULT_ROOT, '00_Home', noteName);
  const target = join(tempVaultRoot, '00_Home', noteName);
  await mkdir(join(tempVaultRoot, '00_Home'), { recursive: true });
  await writeFile(target, await readFile(source, 'utf-8'), 'utf-8');
};

export const makeIo = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
};
