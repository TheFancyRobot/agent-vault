import { describe, expect, it } from 'vitest';
import { formatInitResultAsToon, formatScanResultAsToon, formatVaultConfigAsToon } from '../../src/core/mcp-response-format';

describe('MCP response formatting', () => {
  it('formats scan results as TOON', () => {
    const output = formatScanResultAsToon({
      projectRoot: '/tmp/project',
      repoName: 'demo',
      languages: { TypeScript: 3 },
      primaryLanguage: 'TypeScript',
      frameworks: ['React'],
      packageManager: 'bun',
      monorepo: false,
      keyDirectories: ['src'],
      testFramework: 'vitest',
      buildSystem: 'tsup',
      ciSystem: 'GitHub Actions',
      entryPoints: ['src/index.ts'],
    });

    expect(output).toContain('repoName');
    expect(output).toContain('primaryLanguage');
    expect(output).toContain('entryPoints[');
    expect(output).toContain('frameworks[');
    expect(output).not.toContain('monorepoShape');
    expect(output).not.toContain('{');
  });

  it('formats init results as TOON and omits absent optional sections', () => {
    const output = formatInitResultAsToon({
      vaultRoot: '/tmp/project/.agent-vault',
      created: true,
      filesWritten: 42,
      scan: {
        projectRoot: '/tmp/project',
        repoName: 'demo',
        languages: { TypeScript: 3 },
        primaryLanguage: 'TypeScript',
        frameworks: ['React'],
        packageManager: 'bun',
        monorepo: false,
        keyDirectories: ['src'],
        testFramework: 'vitest',
        buildSystem: 'tsup',
        ciSystem: 'GitHub Actions',
        entryPoints: ['src/index.ts'],
      },
      codeGraph: { totalFiles: 3, totalSymbols: 10 },
    }, { resolver: 'filesystem' });

    expect(output).toContain('vaultRoot');
    expect(output).toContain('config.resolver');
    expect(output).toContain('codeGraph');
    expect(output).toContain('totalFiles');
    expect(output).not.toContain('planningBackfill');
    expect(output).toContain('frameworks[');
    expect(output).not.toContain('monorepoShape');
    expect(output).not.toContain('{');
  });

  it('drops empty and nullish scan fields from TOON output', () => {
    const output = formatScanResultAsToon({
      projectRoot: '/tmp/project',
      repoName: 'demo',
      languages: { TypeScript: 3 },
      primaryLanguage: 'TypeScript',
      frameworks: [],
      packageManager: 'bun',
      monorepo: false,
      monorepoShape: undefined,
      keyDirectories: ['src'],
      testFramework: 'vitest',
      buildSystem: 'tsup',
      ciSystem: 'GitHub Actions',
      entryPoints: ['src/index.ts'],
    });

    expect(output).not.toContain('frameworks');
    expect(output).not.toContain('monorepoShape');
  });

  it('formats vault config as TOON', () => {
    const output = formatVaultConfigAsToon({ resolver: 'filesystem' });

    expect(output).toContain('resolver');
    expect(output).toContain('filesystem');
    expect(output).not.toContain('{');
  });
});
