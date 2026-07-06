import { createHash } from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { prepareContext } from '../../src/core/vault-prepare-context';
import type { CodeGraphIndexV3 } from '../../src/scaffold/code-graph';
import { invalidateStub, readStubManifest, type StubManifest } from '../../src/scaffold/code-stubs';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-prepare-context-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const writeFixtureVault = async (projectRoot: string): Promise<{ vaultRoot: string }> => {
  const vaultRoot = join(projectRoot, '.agent-vault');
  await mkdir(join(vaultRoot, '00_Home'), { recursive: true });
  await mkdir(join(vaultRoot, '01_Architecture'), { recursive: true });

  await writeFile(join(vaultRoot, '00_Home', 'Active_Context.md'), [
    '---',
    'note_type: home',
    'status: active',
    '---',
    '',
    '# Active Context',
    '',
    'Current focus: demo work. See [[01_Architecture/Overview]].',
    '',
  ].join('\n'), 'utf-8');

  await writeFile(join(vaultRoot, '01_Architecture', 'Overview.md'), [
    '---',
    'note_type: architecture',
    'status: active',
    '---',
    '',
    '# Overview',
    '',
    'System overview content.',
    '',
  ].join('\n'), 'utf-8');

  const sourceDir = join(projectRoot, 'src', 'core');
  await mkdir(sourceDir, { recursive: true });
  const demoSource = 'export function demo(value: string): string {\n  return value.toUpperCase();\n}\n';
  await writeFile(join(sourceDir, 'demo.ts'), demoSource, 'utf-8');
  const appSource = "import { demo } from './core/demo';\nexport const run = (): string => demo('x');\n";
  await writeFile(join(projectRoot, 'src', 'app.ts'), appSource, 'utf-8');

  const demoStats = await stat(join(sourceDir, 'demo.ts'));
  const appStats = await stat(join(projectRoot, 'src', 'app.ts'));

  const index: CodeGraphIndexV3 = {
    version: 3,
    generatedAt: '2026-07-05T00:00:00.000Z',
    root: projectRoot,
    files: [
      {
        path: 'src/core/demo.ts',
        language: 'TypeScript',
        symbols: [{ name: 'demo', kind: 'function', line: 1, endLine: 3, exported: true, signature: 'export function demo(value: string): string' }],
        imports: [],
        exports: [{ name: 'demo', kind: 'named' }],
        size: demoStats.size,
        mtimeMs: demoStats.mtimeMs,
        generated: false,
        vendor: false,
      },
      {
        path: 'src/app.ts',
        language: 'TypeScript',
        symbols: [{ name: 'run', kind: 'const', line: 2, exported: true }],
        imports: [{ source: 'src/app.ts', specifier: './core/demo', imported: ['demo'], resolvedPath: 'src/core/demo.ts' }],
        exports: [{ name: 'run', kind: 'named' }],
        size: appStats.size,
        mtimeMs: appStats.mtimeMs,
        generated: false,
        vendor: false,
      },
    ],
  };
  await mkdir(join(vaultRoot, '08_Automation', 'code-graph'), { recursive: true });
  await writeFile(join(vaultRoot, '08_Automation', 'code-graph', 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  return { vaultRoot };
};

describe('prepareContext', () => {
  it('renders vault note content instead of selector errors', async () => {
    const projectRoot = await createTempProject('render');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const result = await prepareContext(vaultRoot, projectRoot, { include_source: false });

    expect(result.content).toContain('# Active Context');
    expect(result.content).toContain('# Overview');
    expect(result.content).not.toContain('// Could not render');
  });

  it('treats the resolved traversal root as a direct target', async () => {
    const projectRoot = await createTempProject('root-target');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const result = await prepareContext(vaultRoot, projectRoot, { include_source: false });

    const rootItem = result.items.find((item) => item.path === '00_Home/Active_Context.md');
    expect(rootItem).toBeDefined();
    expect(rootItem!.reasons).toContain('direct target');
    expect(rootItem!.renderMode).toBe('full');
  });

  it('computes graph distances across traverse edges for linked notes', async () => {
    const projectRoot = await createTempProject('distances');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const result = await prepareContext(vaultRoot, projectRoot, { include_source: false });

    const linkedItem = result.items.find((item) => item.path === '01_Architecture/Overview.md');
    expect(linkedItem).toBeDefined();
    expect(linkedItem!.reasons).toContain('graph distance=1');
  });

  it('honors the requested source render mode', async () => {
    const projectRoot = await createTempProject('source-mode');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const result = await prepareContext(vaultRoot, projectRoot, { source_mode: 'summary' });

    const sourceItems = result.items.filter((item) => item.kind === 'source_file');
    expect(sourceItems.length).toBeGreaterThan(0);
    for (const item of sourceItems) {
      expect(item.renderMode).toBe('summary');
      expect(item.resourceUri.startsWith('vault://code-summary/')).toBe(true);
    }
    expect(result.content).toContain('"name": "demo"');
  });

  it('boosts imported files via dependency edges from resolved import paths', async () => {
    const projectRoot = await createTempProject('dep-edges');
    const { vaultRoot } = await writeFixtureVault(projectRoot);

    const result = await prepareContext(vaultRoot, projectRoot, {});

    const importedItem = result.items.find((item) => item.path === 'src/core/demo.ts');
    const importerItem = result.items.find((item) => item.path === 'src/app.ts');
    expect(importedItem).toBeDefined();
    expect(importedItem!.reasons).toContain('dependency edge');
    expect(importerItem).toBeDefined();
    expect(importerItem!.reasons).not.toContain('dependency edge');
  });
});

describe('invalidateStub', () => {
  it('removes the stub artifact from the code-stubs directory and the manifest entry', async () => {
    const projectRoot = await createTempProject('invalidate');
    const vaultRoot = join(projectRoot, '.agent-vault');
    const stubsDir = join(vaultRoot, 'code-stubs');
    await mkdir(stubsDir, { recursive: true });

    const stubFilename = 'src_core_demo.abcdef12.stub.ts';
    await writeFile(join(stubsDir, stubFilename), 'export declare function demo(value: string): string;\n', 'utf-8');
    const manifest: StubManifest = {
      version: 1,
      generatedAt: '2026-07-05T00:00:00.000Z',
      entries: [{
        path: 'src/core/demo.ts',
        language: 'TypeScript',
        size: 10,
        mtimeMs: 0,
        sha256: createHash('sha256').update('demo').digest('hex'),
        stubVersion: 1,
        parser: 'regex',
        stubPath: stubFilename,
      }],
    };
    await writeFile(join(stubsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    const removed = await invalidateStub(vaultRoot, 'src/core/demo.ts');

    expect(removed).toBe(true);
    expect(existsSync(join(stubsDir, stubFilename))).toBe(false);
    const updated = await readStubManifest(vaultRoot);
    expect(updated?.entries).toHaveLength(0);
  });
});
