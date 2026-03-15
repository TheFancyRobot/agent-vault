import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { initVault } from '../src/scaffold/init';
import { scanProject } from '../src/scaffold/scan';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-scaffold-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('vault scan', () => {
  it('detects a TypeScript project with bun', async () => {
    const root = await createTempProject('ts-bun');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'test-project',
      devDependencies: { typescript: '^5.0.0', vitest: '^3.0.0' },
    }), 'utf-8');
    await writeFile(join(root, 'bun.lock'), '', 'utf-8');
    await writeFile(join(root, 'src', 'index.ts'), 'export const x = 1;', 'utf-8');
    await writeFile(join(root, 'src', 'utils.ts'), 'export const y = 2;', 'utf-8');

    const result = await scanProject(root);

    expect(result.primaryLanguage).toBe('TypeScript');
    expect(result.languages['TypeScript']).toBe(2);
    expect(result.packageManager).toBe('bun');
    expect(result.testFramework).toBe('vitest');
    expect(result.keyDirectories).toContain('src');
    expect(result.entryPoints).toContain('src/index.ts');
  });

  it('detects a Python project', async () => {
    const root = await createTempProject('python');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'pyproject.toml'), '[tool.pytest]', 'utf-8');
    await writeFile(join(root, 'src', 'main.py'), 'print("hello")', 'utf-8');
    await writeFile(join(root, 'src', 'utils.py'), 'x = 1', 'utf-8');

    const result = await scanProject(root);

    expect(result.primaryLanguage).toBe('Python');
    expect(result.frameworks).toContain('Python (pyproject)');
  });

  it('detects a monorepo', async () => {
    const root = await createTempProject('monorepo');
    await mkdir(join(root, 'packages', 'core', 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'my-monorepo',
      workspaces: ['packages/*'],
    }), 'utf-8');
    await writeFile(join(root, 'packages', 'core', 'src', 'index.ts'), '', 'utf-8');

    const result = await scanProject(root);

    expect(result.monorepo).toBe(true);
    expect(result.monorepoShape).toContain('packages/*');
  });

  it('detects GitHub Actions CI', async () => {
    const root = await createTempProject('ci');
    await mkdir(join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'on: push', 'utf-8');

    const result = await scanProject(root);

    expect(result.ciSystem).toBe('GitHub Actions');
  });
});

describe('vault init', () => {
  it('creates a valid vault scaffold in an empty project', async () => {
    const root = await createTempProject('init');
    await writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'my-project',
      dependencies: { express: '^4.0.0' },
    }), 'utf-8');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'export {};', 'utf-8');

    const result = await initVault(root);

    expect(result.created).toBe(true);
    expect(result.filesWritten).toBeGreaterThan(20);
    expect(result.scan.repoName).toBe(result.vaultRoot.split('/').at(-2));

    // Check directory structure
    expect(existsSync(join(result.vaultRoot, '00_Home'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '01_Architecture'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '02_Phases'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '03_Bugs'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '04_Decisions'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '05_Sessions'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '06_Shared_Knowledge'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '07_Templates'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '.obsidian'))).toBe(true);

    // Check templates are written
    expect(existsSync(join(result.vaultRoot, '07_Templates', 'Phase_Template.md'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '07_Templates', 'Step_Template.md'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '07_Templates', 'Bug_Template.md'))).toBe(true);

    // Check home notes have repo name filled in
    const dashboard = await readFile(join(result.vaultRoot, '00_Home', 'Dashboard.md'), 'utf-8');
    expect(dashboard).not.toContain('{{repo_name}}');

    // Check architecture stubs exist
    expect(existsSync(join(result.vaultRoot, '01_Architecture', 'System_Overview.md'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, '01_Architecture', 'Code_Map.md'))).toBe(true);

    // Check AGENTS.md and README.md
    expect(existsSync(join(result.vaultRoot, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(result.vaultRoot, 'README.md'))).toBe(true);

    // Check .obsidian configs
    const corePlugins = JSON.parse(await readFile(join(result.vaultRoot, '.obsidian', 'core-plugins.json'), 'utf-8'));
    expect(corePlugins['file-explorer']).toBe(true);
  });

  it('does not overwrite existing files on re-init', async () => {
    const root = await createTempProject('reinit');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');

    const result1 = await initVault(root);
    expect(result1.created).toBe(true);
    expect(result1.filesWritten).toBeGreaterThan(0);

    // Modify a file
    const dashboardPath = join(result1.vaultRoot, '00_Home', 'Dashboard.md');
    await writeFile(dashboardPath, 'Custom content', 'utf-8');

    // Re-init should not overwrite
    const result2 = await initVault(root);
    expect(result2.created).toBe(false);
    expect(result2.filesWritten).toBe(0);

    const dashboard = await readFile(dashboardPath, 'utf-8');
    expect(dashboard).toBe('Custom content');
  });
});
