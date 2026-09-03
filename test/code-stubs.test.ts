import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'crypto';
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  computeSourceMetadata,
  generateStubForFile,
  readStubManifest,
  sanitizeStubPath,
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

  it('replaces a hard-linked manifest.json instead of writing through the shared inode', async () => {
    // Both paths live under one temp root so the hard link cannot fail with EXDEV.
    const workspace = await createTempDir('manifest-hardlink');
    const vaultRoot = join(workspace, 'vault');
    await mkdir(join(vaultRoot, 'code-stubs'), { recursive: true });

    const externalPath = join(workspace, 'external.json');
    await writeFile(externalPath, 'EXTERNAL_SENTINEL', 'utf-8');
    await link(externalPath, join(vaultRoot, 'code-stubs', 'manifest.json'));

    await expect(writeStubManifest(vaultRoot, emptyManifest())).resolves.toBeUndefined();

    expect(await readFile(externalPath, 'utf-8')).toBe('EXTERNAL_SENTINEL');
    expect((await readStubManifest(vaultRoot))?.entries).toEqual([]);
  });

  it('replaces a hard-linked stub file instead of writing through the shared inode', async () => {
    const workspace = await createTempDir('stub-hardlink');
    const projectRoot = join(workspace, 'project');
    const vaultRoot = join(workspace, 'vault');
    await mkdir(join(projectRoot, 'src'), { recursive: true });
    await mkdir(join(vaultRoot, 'code-stubs'), { recursive: true });

    const sourceContent = 'export function demo(value: string): string {\n  return value;\n}\n';
    await writeFile(join(projectRoot, 'src', 'demo.ts'), sourceContent, 'utf-8');

    const sha256 = createHash('sha256').update(sourceContent).digest('hex');
    const stubFilename = sanitizeStubPath('src/demo.ts', sha256);
    const externalPath = join(workspace, 'external.stub.ts');
    await writeFile(externalPath, 'EXTERNAL_SENTINEL', 'utf-8');
    await link(externalPath, join(vaultRoot, 'code-stubs', stubFilename));

    await generateStubForFile(projectRoot, vaultRoot, 'src/demo.ts');

    expect(await readFile(externalPath, 'utf-8')).toBe('EXTERNAL_SENTINEL');
    expect(await readFile(join(vaultRoot, 'code-stubs', stubFilename), 'utf-8')).toContain('Generated stub');
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
