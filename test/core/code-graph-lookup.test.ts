import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  formatCodeGraphLookupResultsAsToon,
  handleLookupCodeGraphCommand,
  loadCodeGraphIndex,
  queryCodeGraphIndex,
} from '../../src/core/code-graph-lookup';
import type { CodeGraphIndexPayload } from '../../src/scaffold/code-graph';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-code-graph-lookup-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const writeIndex = async (projectRoot: string, payload: CodeGraphIndexPayload): Promise<void> => {
  const indexDir = join(projectRoot, '.agent-vault', '08_Automation', 'code-graph');
  await mkdir(indexDir, { recursive: true });
  await writeFile(join(indexDir, 'index.json'), JSON.stringify(payload, null, 2), 'utf-8');
};

describe('code graph lookup', () => {
  it('loads the machine-readable index and finds matching symbols', async () => {
    const root = await createTempProject('query');
    await writeIndex(root, {
      version: 2,
      generatedAt: '2026-04-23T00:00:00.000Z',
      repoName: 'lookup-test',
      totalFiles: 2,
      totalSymbols: 4,
      directories: [
        { directory: 'src', files: 2, exportedSymbols: 3, internalSymbols: 1, totalSymbols: 4 },
      ],
      files: [
        {
          path: 'src/auth.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createAuthToken', kind: 'function', line: 10, exported: true },
            { name: 'parseAuthHeader', kind: 'function', line: 22, exported: false },
          ],
        },
        {
          path: 'src/user.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createUser', kind: 'function', line: 5, exported: true },
            { name: 'AuthUser', kind: 'type', line: 1, exported: true },
          ],
        },
      ],
    });

    const index = await loadCodeGraphIndex(join(root, '.agent-vault'));
    const matches = queryCodeGraphIndex(index, { query: 'auth', limit: 10 });

    expect(index.repoName).toBe('lookup-test');
    expect(matches.map((match) => `${match.file}:${match.symbol.name}`)).toEqual([
      'src/auth.ts:createAuthToken',
      'src/auth.ts:parseAuthHeader',
      'src/user.ts:AuthUser',
    ]);
  });

  it('supports exported-only, path filters, and limit', async () => {
    const root = await createTempProject('filters');
    await writeIndex(root, {
      version: 2,
      generatedAt: '2026-04-23T00:00:00.000Z',
      repoName: 'lookup-test',
      totalFiles: 2,
      totalSymbols: 4,
      directories: [
        { directory: 'src', files: 2, exportedSymbols: 3, internalSymbols: 1, totalSymbols: 4 },
      ],
      files: [
        {
          path: 'src/auth.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createAuthToken', kind: 'function', line: 10, exported: true },
            { name: 'parseAuthHeader', kind: 'function', line: 22, exported: false },
          ],
        },
        {
          path: 'src/auth/admin.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'AuthAdmin', kind: 'type', line: 1, exported: true },
            { name: 'auditAuthEvent', kind: 'function', line: 8, exported: true },
          ],
        },
      ],
    });

    const index = await loadCodeGraphIndex(join(root, '.agent-vault'));
    const matches = queryCodeGraphIndex(index, {
      query: 'auth',
      exportedOnly: true,
      pathSubstring: 'admin',
      limit: 1,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.file).toBe('src/auth/admin.ts');
    expect(matches[0]?.symbol.name).toBe('AuthAdmin');
  });

  it('formats compact lookup results as TOON for MCP responses', async () => {
    const root = await createTempProject('toon');
    await writeIndex(root, {
      version: 2,
      generatedAt: '2026-04-23T00:00:00.000Z',
      repoName: 'lookup-test',
      totalFiles: 1,
      totalSymbols: 2,
      directories: [
        { directory: 'src', files: 1, exportedSymbols: 1, internalSymbols: 1, totalSymbols: 2 },
      ],
      files: [
        {
          path: 'src/auth.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createAuthToken', kind: 'function', line: 10, exported: true },
            { name: 'parseAuthHeader', kind: 'function', line: 22, exported: false },
          ],
        },
      ],
    });

    const index = await loadCodeGraphIndex(join(root, '.agent-vault'));
    const matches = queryCodeGraphIndex(index, { query: 'auth', limit: 10 });
    const output = formatCodeGraphLookupResultsAsToon(index, matches, 'auth', { compact: true });

    expect(output).toContain('q');
    expect(output).toContain('c');
    expect(output).toContain('f[');
    expect(output).toContain('src/auth.ts');
    expect(output).toContain('createAuthToken');
    expect(output).not.toContain('repoName');
    expect(output).not.toContain('generatedAt');
  });

  it('can still format verbose TOON output when requested', async () => {
    const root = await createTempProject('toon-verbose');
    await writeIndex(root, {
      version: 2,
      generatedAt: '2026-04-23T00:00:00.000Z',
      repoName: 'lookup-test',
      totalFiles: 1,
      totalSymbols: 2,
      directories: [
        { directory: 'src', files: 1, exportedSymbols: 1, internalSymbols: 1, totalSymbols: 2 },
      ],
      files: [
        {
          path: 'src/auth.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createAuthToken', kind: 'function', line: 10, exported: true },
            { name: 'parseAuthHeader', kind: 'function', line: 22, exported: false },
          ],
        },
      ],
    });

    const index = await loadCodeGraphIndex(join(root, '.agent-vault'));
    const matches = queryCodeGraphIndex(index, { query: 'auth', limit: 10 });
    const output = formatCodeGraphLookupResultsAsToon(index, matches, 'auth', { compact: false });

    expect(output).toContain('repoName');
    expect(output).toContain('generatedAt');
    expect(output).toContain('matchCount');
    expect(output).toContain('matches[');
  });

  it('formats lookup results for the CLI handler', async () => {
    const root = await createTempProject('handler');
    await writeIndex(root, {
      version: 2,
      generatedAt: '2026-04-23T00:00:00.000Z',
      repoName: 'lookup-test',
      totalFiles: 1,
      totalSymbols: 2,
      directories: [
        { directory: 'src', files: 1, exportedSymbols: 1, internalSymbols: 1, totalSymbols: 2 },
      ],
      files: [
        {
          path: 'src/auth.ts',
          language: 'TypeScript',
          symbols: [
            { name: 'createAuthToken', kind: 'function', line: 10, exported: true },
            { name: 'parseAuthHeader', kind: 'function', line: 22, exported: false },
          ],
        },
      ],
    });

    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await handleLookupCodeGraphCommand(['auth', '--exports-only'], {
      vaultRoot: join(root, '.agent-vault'),
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    });

    expect(exitCode).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout.join('\n')).toContain('Code graph lookup: 1 match');
    expect(stdout.join('\n')).toContain('src/auth.ts');
    expect(stdout.join('\n')).toContain('createAuthToken');
    expect(stdout.join('\n')).not.toContain('parseAuthHeader');
  });
});
