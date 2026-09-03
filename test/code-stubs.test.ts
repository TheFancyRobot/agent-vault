import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  computeSourceMetadata,
  writeStubManifest,
  type StubManifest,
} from '../src/scaffold/code-stubs';

const tempRoots: string[] = [];

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), `agent-vault-${prefix}-`));
  tempRoots.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const emptyManifest = (): StubManifest => ({
  version: 1,
  generatedAt: '2026-09-03T00:00:00.000Z',
  entries: [],
});

describe('writeStubManifest', () => {
  it('refuses to write through a symlinked manifest.json and leaves the external target unchanged', async () => {
    const vaultRoot = await createTempDir('stubs-vault');
    const stubsDir = join(vaultRoot, 'code-stubs');
    await mkdir(stubsDir, { recursive: true });

    const outsideDir = await createTempDir('stubs-outside');
    const externalPath = join(outsideDir, 'manifest.json');
    await writeFile(externalPath, 'EXTERNAL_SENTINEL', 'utf-8');
    await symlink(externalPath, join(stubsDir, 'manifest.json'));

    await expect(writeStubManifest(vaultRoot, emptyManifest())).rejects.toThrow(/symlink/i);
    expect(await readFile(externalPath, 'utf-8')).toBe('EXTERNAL_SENTINEL');
  });

  it('refuses to write when the stubs directory is a symlink outside the vault', async () => {
    const vaultRoot = await createTempDir('stubs-vault');
    const outsideDir = await createTempDir('stubs-outside');
    const externalStubsDir = join(outsideDir, 'code-stubs');
    await mkdir(externalStubsDir, { recursive: true });
    await symlink(externalStubsDir, join(vaultRoot, 'code-stubs'));

    await expect(writeStubManifest(vaultRoot, emptyManifest())).rejects.toThrow();
    expect(await readFile(join(externalStubsDir, 'manifest.json'), 'utf-8').catch(() => undefined)).toBeUndefined();
  });
});

describe('computeSourceMetadata', () => {
  it('rejects an allowed source path whose symlink target is denied by the policy', async () => {
    const projectRoot = await createTempDir('stubs-project');
    await mkdir(join(projectRoot, 'src', 'generated'), { recursive: true });
    await writeFile(join(projectRoot, 'src', 'generated', 'output.ts'), 'export const secret = true;', 'utf-8');
    await symlink(join(projectRoot, 'src', 'generated', 'output.ts'), join(projectRoot, 'src', 'util.ts'));

    // The declared path (src/util.ts) is allowed; only the resolved target is
    // denied, so the policy must be re-applied after symlink resolution.
    expect(await computeSourceMetadata(projectRoot, 'src/util.ts')).toBeUndefined();
  });
});
