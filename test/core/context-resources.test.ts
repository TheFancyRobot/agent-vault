import { createHash } from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildContextResourceUri,
  listCodeArtifactResources,
  listNoteResources,
  parseContextResourceUri,
  readCodeExcerptResource,
  readCodeStubResource,
  readCodeSummaryResource,
  readNoteResource,
} from '../../src/core/context-resources';
import type { CodeGraphIndexV3 } from '../../src/scaffold/code-graph';
import type { StubManifest } from '../../src/scaffold/code-stubs';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-context-resources-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const writeFixtureVault = async (projectRoot: string): Promise<{ vaultRoot: string; sourcePath: string; sourceHash: string }> => {
  const vaultRoot = join(projectRoot, '.agent-vault');
  await mkdir(join(vaultRoot, '00_Home'), { recursive: true });
  await writeFile(join(vaultRoot, '00_Home', 'Active_Context.md'), '# Active Context\n\nCurrent work.\n', 'utf-8');

  const sourcePath = join(projectRoot, 'src', 'core', 'demo.ts');
  await mkdir(join(projectRoot, 'src', 'core'), { recursive: true });
  const source = [
    'export function demo(value: string): string {',
    '  return value.toUpperCase();',
    '}',
    '',
  ].join('\n');
  await writeFile(sourcePath, source, 'utf-8');
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const sourceStats = await stat(sourcePath);

  const index: CodeGraphIndexV3 = {
    version: 3,
    generatedAt: '2026-07-05T00:00:00.000Z',
    root: projectRoot,
    files: [{
      path: 'src/core/demo.ts',
      language: 'TypeScript',
      symbols: [{ name: 'demo', kind: 'function', line: 1, endLine: 3, exported: true, signature: 'export function demo(value: string): string' }],
      imports: [],
      exports: [{ name: 'demo', kind: 'named' }],
      hash: sourceHash,
      mtimeMs: sourceStats.mtimeMs,
      size: sourceStats.size,
      generated: false,
      vendor: false,
      parser: 'typescript-compiler',
    }],
  };
  await mkdir(join(vaultRoot, '08_Automation', 'code-graph'), { recursive: true });
  await writeFile(join(vaultRoot, '08_Automation', 'code-graph', 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  await mkdir(join(vaultRoot, 'code-stubs'), { recursive: true });
  const stubContent = 'export declare function demo(value: string): string;\n';
  await writeFile(join(vaultRoot, 'code-stubs', 'src_core_demo.abcdef12.stub.ts'), stubContent, 'utf-8');
  const manifest: StubManifest = {
    version: 1,
    generatedAt: '2026-07-05T00:00:00.000Z',
    entries: [{
      path: 'src/core/demo.ts',
      language: 'TypeScript',
      size: sourceStats.size,
      mtimeMs: sourceStats.mtimeMs,
      sha256: sourceHash,
      stubVersion: 1,
      parser: 'typescript-compiler',
      stubPath: 'src_core_demo.abcdef12.stub.ts',
      incomplete: false,
    }],
  };
  await writeFile(join(vaultRoot, 'code-stubs', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  return { vaultRoot, sourcePath, sourceHash };
};

describe('context MCP resources', () => {
  it('parses stable vault:// resource URIs and rejects unsafe path encodings', () => {
    expect(parseContextResourceUri('vault://code-excerpt/src/core/demo.ts#demo')).toEqual({
      kind: 'code-excerpt',
      path: 'src/core/demo.ts',
      fragment: 'demo',
    });
    expect(buildContextResourceUri('note', '00_Home/Active_Context.md')).toBe('vault://note/00_Home/Active_Context.md');
    expect(() => parseContextResourceUri('file://note/00_Home/Active_Context.md')).toThrow(/scheme/);
    expect(() => parseContextResourceUri('vault://note/%2e%2e/secret.md')).toThrow(/unsafe segment/);
    expect(() => parseContextResourceUri('vault://note/00_Home%2FActive_Context.md')).toThrow(/encoded path separators/);
    expect(() => parseContextResourceUri('vault://code-stub//etc/passwd')).toThrow(/unsafe segment|relative/);
  });

  it('reads note, code stub, code summary, and symbol excerpt resources without regenerating artifacts', async () => {
    const projectRoot = await createTempProject('happy-path');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const note = await readNoteResource(vaultRoot, 'vault://note/00_Home/Active_Context.md');
    expect(note.contents[0].text).toContain('Current work.');

    const stub = await readCodeStubResource(vaultRoot, projectRoot, 'vault://code-stub/src/core/demo.ts');
    expect(stub.contents[0].text).toContain('export declare function demo');

    const summary = await readCodeSummaryResource(vaultRoot, projectRoot, 'vault://code-summary/src/core/demo.ts');
    expect(summary.contents[0].text).toContain('"symbols"');
    expect(summary.contents[0].text).toContain('"demo"');

    const excerpt = await readCodeExcerptResource(vaultRoot, projectRoot, 'vault://code-excerpt/src/core/demo.ts#demo');
    expect(excerpt.contents[0].text).toContain('lines 1-3');
    expect(excerpt.contents[0].text).toContain('return value.toUpperCase()');

    const listedNotes = await listNoteResources(vaultRoot);
    expect(listedNotes.resources.map((resource) => resource.uri)).toContain('vault://note/00_Home/Active_Context.md');
    const listedCode = await listCodeArtifactResources(vaultRoot);
    expect(listedCode.resources.map((resource) => resource.uri)).toEqual(expect.arrayContaining([
      'vault://code-stub/src/core/demo.ts',
      'vault://code-summary/src/core/demo.ts',
      'vault://code-excerpt/src/core/demo.ts#demo',
    ]));
  });

  it('returns clear refresh hints for missing generated artifacts and reports stale stubs', async () => {
    const projectRoot = await createTempProject('stale');
    const { vaultRoot, sourcePath } = await writeFixtureVault(projectRoot);

    await expect(readCodeStubResource(vaultRoot, projectRoot, 'vault://code-stub/src/core/missing.ts'))
      .rejects.toThrow(/Source file not found|Code stub not found/);

    await writeFile(sourcePath, 'export function demo(value: string): string {\n  return value;\n}\n', 'utf-8');
    const stale = await readCodeStubResource(vaultRoot, projectRoot, 'vault://code-stub/src/core/demo.ts');
    expect(stale.contents[0].text).toContain('STALE CODE STUB');
    expect(stale.contents[0]._meta?.stale).toBe(true);
  });

  it('rejects traversal, secret-like, generated, vendor, and symlink-escape resources', async () => {
    const projectRoot = await createTempProject('rejections');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    await expect(readNoteResource(vaultRoot, 'vault://note/../outside.md')).rejects.toThrow(/unsafe segment/);
    await expect(readNoteResource(vaultRoot, 'vault://note/08_Automation/code-graph/index.json')).rejects.toThrow(/only expose Markdown notes/);
    await expect(readCodeSummaryResource(vaultRoot, projectRoot, 'vault://code-summary/.env')).rejects.toThrow(/secret-like|Source file not found/);

    const outsideRoot = await createTempProject('outside');
    await writeFile(join(outsideRoot, 'outside.ts'), 'export const escaped = true;\n', 'utf-8');
    await symlink(join(outsideRoot, 'outside.ts'), join(projectRoot, 'src', 'core', 'escaped.ts'));
    await expect(readCodeSummaryResource(vaultRoot, projectRoot, 'vault://code-summary/src/core/escaped.ts'))
      .rejects.toThrow(/escapes the project root|no entry/);

    const indexPath = join(vaultRoot, '08_Automation', 'code-graph', 'index.json');
    const index = JSON.parse(await readFile(indexPath, 'utf-8')) as CodeGraphIndexV3;
    index.files.push({
      path: 'src/core/generated.ts',
      language: 'TypeScript',
      symbols: [],
      generated: true,
      vendor: false,
    });
    await writeFile(join(projectRoot, 'src', 'core', 'generated.ts'), 'export const generated = true;\n', 'utf-8');
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    await expect(readCodeSummaryResource(vaultRoot, projectRoot, 'vault://code-summary/src/core/generated.ts'))
      .rejects.toThrow(/generated\/vendor/);
  });
});
