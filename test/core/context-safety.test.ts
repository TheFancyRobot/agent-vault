import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertContextPathAllowed,
  createContextSafetyPolicy,
  getContextPathExclusion,
} from '../../src/core/context-safety';
import { buildCodeGraph } from '../../src/scaffold/code-graph';
import { prepareContext } from '../../src/core/vault-prepare-context';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-context-safety-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('context safety policy', () => {
  it('denies secret, generated, vendor, lockfile, and traversal paths by default', () => {
    const policy = createContextSafetyPolicy();

    for (const path of ['.env', 'config/key.pem', 'src/credentials.ts', 'dist/output.ts', 'node_modules/pkg/index.ts', 'package-lock.json']) {
      expect(getContextPathExclusion(path, policy)).toBeDefined();
    }
    expect(() => assertContextPathAllowed('../outside.ts', 'Source path', policy)).toThrow(/unsafe segment/);
    expect(() => assertContextPathAllowed('/etc/passwd', 'Source path', policy)).toThrow(/relative/);
  });

  it('allows an explicit named exception without weakening traversal guards', () => {
    const policy = createContextSafetyPolicy({ allowlist: ['src/credentials.ts'] });

    expect(getContextPathExclusion('src/credentials.ts', policy)).toBeUndefined();
    expect(() => assertContextPathAllowed('src/credentials.ts', 'Source path', policy)).not.toThrow();
    expect(() => assertContextPathAllowed('../credentials.ts', 'Source path', policy)).toThrow(/unsafe segment/);
  });
});

describe('context safety enforcement', () => {
  it('excludes secret-like source files from graph output while honoring an explicit exception', async () => {
    const projectRoot = await createTempProject('graph');
    await mkdir(join(projectRoot, 'src'), { recursive: true });
    await writeFile(join(projectRoot, 'src', 'safe.ts'), 'export const safe = true;\n', 'utf-8');
    await writeFile(join(projectRoot, 'src', 'credentials.ts'), 'export const credentials = true;\n', 'utf-8');

    const safeGraph = await buildCodeGraph(projectRoot);
    expect(safeGraph.files.map((file) => file.path)).toEqual(['src/safe.ts']);

    const exceptionGraph = await buildCodeGraph(projectRoot, createContextSafetyPolicy({ allowlist: ['src/credentials.ts'] }));
    expect(exceptionGraph.files.map((file) => file.path)).toEqual(['src/credentials.ts', 'src/safe.ts']);
  });

  it('keeps compiled content within the reported token budget and survives missing indexes', async () => {
    const projectRoot = await createTempProject('budget');
    const vaultRoot = join(projectRoot, '.agent-vault');
    await mkdir(join(vaultRoot, '00_Home'), { recursive: true });
    await writeFile(join(vaultRoot, '00_Home', 'Active_Context.md'), `# Active Context\n\n${'context '.repeat(1200)}\n`, 'utf-8');

    const result = await prepareContext(vaultRoot, projectRoot, {
      include_source: true,
      max_tokens: 100,
    });

    expect(result.meta.estimatedTokens).toBeLessThanOrEqual(100);
    expect(result.meta.truncated).toBe(true);
    expect(result.meta.warnings.join('\n')).toMatch(/code graph index missing|truncated/);
    expect(result.content).toContain('[truncated — max_tokens budget]');
    expect(existsSync(join(vaultRoot, '08_Automation', 'code-graph', 'index.json'))).toBe(false);
  });

  it('rejects unsafe compiler inputs before assembling context', async () => {
    const projectRoot = await createTempProject('compiler-path');
    const vaultRoot = join(projectRoot, '.agent-vault');
    await mkdir(join(vaultRoot, '00_Home'), { recursive: true });
    await writeFile(join(vaultRoot, '00_Home', 'Active_Context.md'), '# Active Context\n', 'utf-8');

    await expect(prepareContext(vaultRoot, projectRoot, { active_file: '../outside.ts' }))
      .rejects.toThrow(/unsafe segment/);
    await expect(prepareContext(vaultRoot, projectRoot, { root_note: '../outside' }))
      .rejects.toThrow(/unsafe segment/);
  });
});
