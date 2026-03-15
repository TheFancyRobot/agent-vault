import { existsSync } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path';

export interface VaultFileRecord {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly mtimeMs: number;
}

export const resolveVaultRoot = (startDir: string): string => {
  let current = resolve(startDir);

  while (true) {
    const directVault = basename(current) === '.agent-vault' ? current : join(current, '.agent-vault');
    if (existsSync(directVault)) {
      return directVault;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error('Could not find .agent-vault from the current working directory.');
    }

    current = parent;
  }
};

export const getRelativeNotePath = (vaultRoot: string, absolutePath: string): string =>
  relative(vaultRoot, absolutePath).replace(/\\/g, '/');

export const assertWithinVaultRoot = (vaultRoot: string, absolutePath: string): void => {
  const resolvedVaultRoot = resolve(vaultRoot);
  const resolvedPath = resolve(absolutePath);
  const vaultRelativePath = relative(resolvedVaultRoot, resolvedPath);

  if (
    vaultRelativePath.length > 0 &&
    (vaultRelativePath.startsWith('..') || isAbsolute(vaultRelativePath))
  ) {
    throw new Error(`Resolved path escapes the vault root: ${absolutePath}`);
  }
};

export const resolveVaultRelativePath = (vaultRoot: string, notePath: string): string => {
  const absolutePath = resolve(join(vaultRoot, notePath));
  assertWithinVaultRoot(vaultRoot, absolutePath);
  return absolutePath;
};

export const listMarkdownFiles = async (directory: string): Promise<string[]> => {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const nextPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listMarkdownFiles(nextPath);
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      return [nextPath];
    }
    return [] as string[];
  }));

  return files.flat().sort();
};

export const scanVaultMarkdownFiles = async (vaultRoot: string): Promise<VaultFileRecord[]> => {
  const files = await listMarkdownFiles(vaultRoot);

  return Promise.all(files.map(async (absolutePath) => {
    const fileStats = await stat(absolutePath);
    return {
      absolutePath,
      relativePath: getRelativeNotePath(vaultRoot, absolutePath),
      mtimeMs: fileStats.mtimeMs,
    } satisfies VaultFileRecord;
  }));
};

export const readUtf8File = async (absolutePath: string): Promise<string> => readFile(absolutePath, 'utf-8');
