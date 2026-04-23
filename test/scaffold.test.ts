import { afterEach, describe, expect, it } from 'vitest';
import { existsSync } from 'fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { initVault } from '../src/scaffold/init';
import { scanProject } from '../src/scaffold/scan';
import { buildCodeGraph } from '../src/scaffold/code-graph';
import { handleValidateAllCommand, handleDetectOrphansCommand } from '../src/core/note-validators';

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

  it('backfills from .planning/ directory on fresh init', async () => {
    const root = await createTempProject('backfill');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'test-backfill' }), 'utf-8');

    // Create a GSD-style .planning/ structure
    const planningDir = join(root, '.planning');
    await mkdir(join(planningDir, 'phases', '01-foundation'), { recursive: true });
    await mkdir(join(planningDir, 'phases', '02-core-features'), { recursive: true });

    // PROJECT.md
    await writeFile(join(planningDir, 'PROJECT.md'), [
      '# Test Project',
      '',
      '## What This Is',
      'A test project for backfill.',
      '',
      '## Core Value',
      'Validates that GSD planning context is imported into Agent Vault.',
      '',
      '## Requirements',
      '- REQ-01: Import phases',
      '- REQ-02: Import decisions',
      '',
      '## Constraints',
      '- Must be non-destructive',
    ].join('\n'), 'utf-8');

    // ROADMAP.md
    await writeFile(join(planningDir, 'ROADMAP.md'), [
      '# Roadmap: Test Project',
      '',
      '## Overview',
      'Two-phase project.',
      '',
      '## Phases',
      '- [x] Phase 1: Foundation',
      '- [ ] Phase 2: Core Features',
    ].join('\n'), 'utf-8');

    // Phase 1 plan with tasks
    await writeFile(join(planningDir, 'phases', '01-foundation', '01-01-PLAN.md'), [
      '---',
      'phase: 01-foundation',
      'plan: 01',
      'type: execute',
      '---',
      '',
      '<objective>',
      'Set up the project foundation',
      '</objective>',
      '',
      '<tasks>',
      '<task type="auto">',
      '  <name>Initialize project structure</name>',
      '  <action>Create directories and config</action>',
      '</task>',
      '<task type="auto">',
      '  <name>Set up testing</name>',
      '  <action>Configure vitest</action>',
      '</task>',
      '</tasks>',
    ].join('\n'), 'utf-8');

    // Phase 1 summary with decisions, subsystem, tech-stack, key-files
    await writeFile(join(planningDir, 'phases', '01-foundation', '01-01-SUMMARY.md'), [
      '---',
      'phase: 01-foundation',
      'plan: 01',
      'subsystem: api',
      'completed: "2026-01-15"',
      'key-decisions:',
      '  - "Use Bun as the package manager for speed"',
      '  - "Adopt vitest over jest for ESM support"',
      'patterns-established:',
      '  - "Barrel exports from src/index.ts"',
      'tech-stack:',
      '  added:',
      '    - "vitest"',
      '    - "typescript"',
      'key-files:',
      '  created:',
      '    - "src/index.ts"',
      '    - "src/config.ts"',
      '---',
      '',
      '## Summary',
      'Foundation phase complete.',
    ].join('\n'), 'utf-8');

    // Phase 2 plan (in progress, no summary)
    await writeFile(join(planningDir, 'phases', '02-core-features', '02-01-PLAN.md'), [
      '---',
      'phase: 02-core-features',
      'plan: 01',
      'type: execute',
      '---',
      '',
      '<objective>',
      'Build the core feature set',
      '</objective>',
      '',
      '<tasks>',
      '<task type="auto">',
      '  <name>Implement data layer</name>',
      '  <action>Build the data access layer</action>',
      '</task>',
      '</tasks>',
    ].join('\n'), 'utf-8');

    const result = await initVault(root);

    expect(result.created).toBe(true);
    expect(result.planningBackfill).toBeDefined();
    expect(result.planningBackfill!.found).toBe(true);
    expect(result.planningBackfill!.phasesImported).toBe(2);
    expect(result.planningBackfill!.stepsImported).toBe(3); // 2 from phase 1 + 1 from phase 2
    expect(result.planningBackfill!.decisionsImported).toBe(2);
    expect(result.planningBackfill!.architectureLinksCreated).toBeGreaterThan(0);
    expect(result.planningBackfill!.architectureReviewPrompt).toBeDefined();
    expect(result.planningBackfill!.architectureReviewPrompt).toContain('Phase 01 (Foundation)');
    expect(result.planningBackfill!.architectureReviewPrompt).toContain('System Overview');
    expect(result.planningBackfill!.roadmapBackfilled).toBe(true);
    expect(result.planningBackfill!.projectContextBackfilled).toBe(true);

    // Verify phase directories were created
    const vaultRoot = result.vaultRoot;
    expect(existsSync(join(vaultRoot, '02_Phases'))).toBe(true);

    // Verify phase 1 has architecture links (subsystem=api → System Overview + Integration Map + Code Map)
    const phase1Path = join(vaultRoot, '02_Phases');
    const phase1Dirs = (await import('fs/promises')).readdir(phase1Path);
    const phase1DirName = (await phase1Dirs).find((d: string) => d.startsWith('Phase_01'));
    expect(phase1DirName).toBeDefined();
    const phase1Content = await readFile(join(phase1Path, phase1DirName!, 'Phase.md'), 'utf-8');
    expect(phase1Content).toContain('System Overview');
    expect(phase1Content).toContain('Integration Map'); // subsystem=api
    expect(phase1Content).toContain('Code Map'); // has key-files

    // Verify step notes inherit architecture links from parent phase
    const stepsDir = join(phase1Path, phase1DirName!, 'Steps');
    const stepFiles = (await import('fs/promises')).readdir(stepsDir);
    const firstStep = (await stepFiles).find((f: string) => f.startsWith('Step_01') && f.endsWith('.md'));
    expect(firstStep).toBeDefined();
    const stepContent = await readFile(join(stepsDir, firstStep!), 'utf-8');
    expect(stepContent).toContain('System Overview');
    expect(stepContent).toContain('Integration Map');
    expect(stepContent).toContain('Code Map');

    // Verify phase 2 steps get default System Overview (no summary)
    const phase2DirName = (await (await import('fs/promises')).readdir(phase1Path)).find((d: string) => d.startsWith('Phase_02'));
    expect(phase2DirName).toBeDefined();
    const phase2StepsDir = join(phase1Path, phase2DirName!, 'Steps');
    const phase2StepFiles = await (await import('fs/promises')).readdir(phase2StepsDir);
    const phase2Step = phase2StepFiles.find((f: string) => f.startsWith('Step_01') && f.endsWith('.md'));
    expect(phase2Step).toBeDefined();
    const phase2StepContent = await readFile(join(phase2StepsDir, phase2Step!), 'utf-8');
    expect(phase2StepContent).toContain('System Overview');

    // Verify architecture stubs were enriched
    const codeMap = await readFile(join(vaultRoot, '01_Architecture', 'Code_Map.md'), 'utf-8');
    expect(codeMap).toContain('src/index.ts');

    const sysOverview = await readFile(join(vaultRoot, '01_Architecture', 'System_Overview.md'), 'utf-8');
    expect(sysOverview).toContain('vitest');
    expect(sysOverview).toContain('Barrel exports');

    // Verify roadmap was enriched
    const roadmap = await readFile(join(vaultRoot, '00_Home', 'Roadmap.md'), 'utf-8');
    expect(roadmap).toContain('Imported GSD Roadmap');

    // Verify active context was enriched
    const activeContext = await readFile(join(vaultRoot, '00_Home', 'Active_Context.md'), 'utf-8');
    expect(activeContext).toContain('Imported GSD Project Context');
    expect(activeContext).toContain('Validates that GSD planning context is imported');

    // Verify decisions were created
    expect(existsSync(join(vaultRoot, '04_Decisions'))).toBe(true);
  });

  it('fresh init passes validation with zero errors and zero warnings', async () => {
    const root = await createTempProject('validate-init');
    await writeFile(join(root, 'package.json'), JSON.stringify({
      name: 'validate-test',
      dependencies: { express: '^4.0.0' },
    }), 'utf-8');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'export function main() {}', 'utf-8');

    const result = await initVault(root);
    expect(result.created).toBe(true);

    // Run full validation (frontmatter + structure + required links)
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await handleValidateAllCommand([], {
      vaultRoot: result.vaultRoot,
      io: { stdout: (m) => stdout.push(m), stderr: (m) => stderr.push(m) },
    });

    const errors = stdout.filter((m) => m.includes('ERROR '));
    const warnings = stdout.filter((m) => m.includes('WARN '));

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(stderr).toEqual([]);
    expect(exitCode).toBe(0);

    // Run orphan detection separately (also zero warnings)
    const orphanStdout: string[] = [];
    const orphanExitCode = await handleDetectOrphansCommand([], {
      vaultRoot: result.vaultRoot,
      io: { stdout: (m) => orphanStdout.push(m), stderr: () => {} },
    });

    const orphanWarnings = orphanStdout.filter((m) => m.includes('WARN '));
    expect(orphanWarnings).toEqual([]);
    expect(orphanExitCode).toBe(0);
  });

  it('fresh init with .planning/ backfill passes validation with zero errors', async () => {
    const root = await createTempProject('validate-backfill');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'validate-bf' }), 'utf-8');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), 'export function main() {}', 'utf-8');

    // Create a .planning/ structure with decisions
    const planningDir = join(root, '.planning');
    await mkdir(join(planningDir, 'phases', '01-foundation'), { recursive: true });
    await writeFile(join(planningDir, 'phases', '01-foundation', '01-01-PLAN.md'), [
      '---',
      'phase: 01-foundation',
      'plan: 01',
      '---',
      '<tasks><task type="auto"><name>Set up project</name></task></tasks>',
    ].join('\n'), 'utf-8');
    await writeFile(join(planningDir, 'phases', '01-foundation', '01-01-SUMMARY.md'), [
      '---',
      'completed: "2026-01-15"',
      'key-decisions:',
      '  - "Use TypeScript for type safety"',
      '  - "Use Bun as package manager"',
      '---',
    ].join('\n'), 'utf-8');

    const result = await initVault(root);
    expect(result.planningBackfill?.decisionsImported).toBe(2);

    // Run full validation
    const stdout: string[] = [];
    const stderr: string[] = [];
    const exitCode = await handleValidateAllCommand([], {
      vaultRoot: result.vaultRoot,
      io: { stdout: (m) => stdout.push(m), stderr: (m) => stderr.push(m) },
    });

    const errors = stdout.filter((m) => m.includes('ERROR '));
    expect(errors).toEqual([]);
    expect(stderr).toEqual([]);
    expect(exitCode).toBe(0);

    // Run orphan detection — decisions should have inbound links
    const orphanStdout: string[] = [];
    await handleDetectOrphansCommand([], {
      vaultRoot: result.vaultRoot,
      io: { stdout: (m) => orphanStdout.push(m), stderr: () => {} },
    });

    const orphanWarnings = orphanStdout.filter((m) => m.includes('WARN '));
    expect(orphanWarnings).toEqual([]);
  });

  it('does not backfill on re-init', async () => {
    const root = await createTempProject('backfill-reinit');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');

    // Create minimal .planning/
    const planningDir = join(root, '.planning');
    await mkdir(join(planningDir, 'phases', '01-setup'), { recursive: true });
    await writeFile(join(planningDir, 'phases', '01-setup', '01-01-PLAN.md'), [
      '---',
      'phase: 01-setup',
      'plan: 01',
      '---',
      '<tasks><task type="auto"><name>Do a thing</name></task></tasks>',
    ].join('\n'), 'utf-8');

    const result1 = await initVault(root);
    expect(result1.planningBackfill?.found).toBe(true);
    expect(result1.planningBackfill?.phasesImported).toBe(1);

    // Re-init should skip backfill entirely
    const result2 = await initVault(root);
    expect(result2.planningBackfill).toBeUndefined();
  });

  it('handles missing .planning/ gracefully', async () => {
    const root = await createTempProject('no-planning');
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'test' }), 'utf-8');

    const result = await initVault(root);
    // No .planning/ dir → backfill reports not found
    expect(result.planningBackfill?.found).toBe(false);
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

    // Re-init should not overwrite scaffold files (code graph still refreshes)
    const result2 = await initVault(root);
    expect(result2.created).toBe(false);
    // Only the code graph is re-written on re-init (it always refreshes)
    expect(result2.filesWritten).toBeLessThanOrEqual(1);

    const dashboard = await readFile(dashboardPath, 'utf-8');
    expect(dashboard).toBe('Custom content');
  });

  it('generates a code graph during init', async () => {
    const root = await createTempProject('code-graph');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'graph-test' }), 'utf-8');
    await writeFile(join(root, 'src', 'index.ts'), [
      'export function greet(name: string): string { return `Hello ${name}`; }',
      'export class UserService {}',
      'export interface Config { port: number; }',
      'export type ID = string;',
      'const internal = 42;',
    ].join('\n'), 'utf-8');
    await writeFile(join(root, 'src', 'utils.ts'), [
      'export const slugify = (s: string) => s.toLowerCase();',
      'export async function fetchData() {}',
    ].join('\n'), 'utf-8');

    const result = await initVault(root);

    expect(result.codeGraph).toBeDefined();
    expect(result.codeGraph!.totalFiles).toBeGreaterThanOrEqual(2);
    expect(result.codeGraph!.totalSymbols).toBeGreaterThanOrEqual(6);

    // Verify thin Code_Graph.md summary + machine-readable JSON index were written
    const graphPath = join(result.vaultRoot, '01_Architecture', 'Code_Graph.md');
    const graphIndexPath = join(result.vaultRoot, '08_Automation', 'code-graph', 'index.json');
    expect(existsSync(graphPath)).toBe(true);
    expect(existsSync(graphIndexPath)).toBe(true);

    const graphContent = await readFile(graphPath, 'utf-8');
    expect(graphContent).toContain('Files indexed:');
    expect(graphContent).toContain('How to Use');
    expect(graphContent).toContain('08_Automation/code-graph/index.json');
    expect(graphContent).not.toContain('greet');
    expect(graphContent).not.toContain('UserService');
    expect(graphContent).not.toContain('slugify');

    const graphIndex = JSON.parse(await readFile(graphIndexPath, 'utf-8')) as { files: Array<{ path: string; symbols: Array<{ name: string }> }> };
    expect(graphIndex.files.map((file) => file.path)).toEqual(expect.arrayContaining(['src/index.ts', 'src/utils.ts']));
    expect(graphIndex.files.flatMap((file) => file.symbols.map((symbol) => symbol.name))).toEqual(
      expect.arrayContaining(['greet', 'UserService', 'Config', 'slugify', 'fetchData']),
    );
  });
});

describe('code graph', () => {
  it('extracts TypeScript exports', async () => {
    const root = await createTempProject('ts-graph');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'main.ts'), [
      'export function hello() {}',
      'export async function asyncHello() {}',
      'export class Service {}',
      'export interface IService {}',
      'export type Result = string;',
      'export const VERSION = "1.0";',
      'export enum Status { Active, Inactive }',
      'export default function defaultFn() {}',
      'function internalFn() {}',
      'const internalConst = 1;',
    ].join('\n'), 'utf-8');

    const graph = await buildCodeGraph(root);

    expect(graph.totalFiles).toBe(1);
    const file = graph.files[0];
    expect(file.path).toBe('src/main.ts');

    const exported = file.symbols.filter((s) => s.exported);
    const internal = file.symbols.filter((s) => !s.exported);

    expect(exported.map((s) => s.name)).toEqual(
      expect.arrayContaining(['hello', 'asyncHello', 'Service', 'IService', 'Result', 'VERSION', 'Status', 'defaultFn']),
    );
    expect(internal.map((s) => s.name)).toEqual(
      expect.arrayContaining(['internalFn', 'internalConst']),
    );
  });

  it('extracts Python symbols', async () => {
    const root = await createTempProject('py-graph');
    await writeFile(join(root, 'app.py'), [
      'def public_func():',
      '    pass',
      '',
      'async def async_func():',
      '    pass',
      '',
      'class MyClass:',
      '    pass',
      '',
      'def _private_func():',
      '    pass',
      '',
      'MAX_RETRIES = 3',
    ].join('\n'), 'utf-8');

    const graph = await buildCodeGraph(root);
    const file = graph.files[0];

    expect(file.symbols.find((s) => s.name === 'public_func')?.exported).toBe(true);
    expect(file.symbols.find((s) => s.name === 'async_func')?.exported).toBe(true);
    expect(file.symbols.find((s) => s.name === 'MyClass')?.exported).toBe(true);
    expect(file.symbols.find((s) => s.name === '_private_func')?.exported).toBe(false);
    expect(file.symbols.find((s) => s.name === 'MAX_RETRIES')?.exported).toBe(true);
  });

  it('extracts Go symbols', async () => {
    const root = await createTempProject('go-graph');
    await writeFile(join(root, 'main.go'), [
      'package main',
      '',
      'func PublicFunc() {}',
      'func privateFunc() {}',
      'func (s *Server) Handle() {}',
      'type Server struct {}',
      'type Handler interface {}',
    ].join('\n'), 'utf-8');

    const graph = await buildCodeGraph(root);
    const file = graph.files[0];

    expect(file.symbols.find((s) => s.name === 'PublicFunc')?.exported).toBe(true);
    expect(file.symbols.find((s) => s.name === 'privateFunc')?.exported).toBe(false);
    expect(file.symbols.find((s) => s.name === 'Handle')?.exported).toBe(true);
    expect(file.symbols.find((s) => s.name === 'Server')?.kind).toBe('struct');
    expect(file.symbols.find((s) => s.name === 'Handler')?.kind).toBe('interface');
  });

  it('extracts Rust symbols', async () => {
    const root = await createTempProject('rs-graph');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'lib.rs'), [
      'pub fn public_fn() {}',
      'pub async fn async_pub() {}',
      'fn private_fn() {}',
      'pub struct Config {}',
      'struct Internal {}',
      'pub enum Status {}',
      'pub trait Handler {}',
      'pub type Result = std::result::Result<(), Error>;',
    ].join('\n'), 'utf-8');

    const graph = await buildCodeGraph(root);
    const file = graph.files[0];

    expect(file.symbols.filter((s) => s.exported).map((s) => s.name)).toEqual(
      expect.arrayContaining(['public_fn', 'async_pub', 'Config', 'Status', 'Handler', 'Result']),
    );
    expect(file.symbols.find((s) => s.name === 'private_fn')?.exported).toBe(false);
    expect(file.symbols.find((s) => s.name === 'Internal')?.exported).toBe(false);
  });

  it('achieves high accuracy on this repo (self-test)', async () => {
    // Run the code graph against the agent-vault repo itself
    // and compare against grep-based ground truth
    const graph = await buildCodeGraph(join(__dirname, '..'));
    const { readFile: rf } = await import('fs/promises');

    let exportTP = 0, exportFN = 0, exportFP = 0;
    let internTP = 0, internFN = 0, internFP = 0;

    for (const file of graph.files) {
      if (file.language !== 'TypeScript') continue;
      const content = await rf(join(__dirname, '..', file.path), 'utf-8');
      const lines = content.split('\n');

      const actualExports = new Set<number>();
      const actualInternals = new Set<number>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const ln = i + 1;
        if (/^export\s+(async\s+)?(function|class|interface|type|const|let|var|enum|default|abstract)\s+/.test(line)) actualExports.add(ln);
        else if (/^(async\s+)?function\s+\w+/.test(line)) actualInternals.add(ln);
        else if (/^const\s+\w+\s*(?::\s*\S+)?\s*=/.test(line)) actualInternals.add(ln);
        else if (/^(abstract\s+)?class\s+\w+/.test(line)) actualInternals.add(ln);
        else if (/^interface\s+\w+/.test(line)) actualInternals.add(ln);
        else if (/^type\s+\w+/.test(line)) actualInternals.add(ln);
      }

      const detectedExports = new Set(file.symbols.filter(s => s.exported).map(s => s.line));
      const detectedInternals = new Set(file.symbols.filter(s => !s.exported).map(s => s.line));

      for (const ln of actualExports) { if (detectedExports.has(ln)) exportTP++; else exportFN++; }
      for (const ln of detectedExports) { if (!actualExports.has(ln)) exportFP++; }
      for (const ln of actualInternals) { if (detectedInternals.has(ln)) internTP++; else internFN++; }
      for (const ln of detectedInternals) { if (!actualInternals.has(ln)) internFP++; }
    }

    const exportPrecision = exportTP / (exportTP + exportFP);
    const exportRecall = exportTP / (exportTP + exportFN);
    const internPrecision = internTP / (internTP + internFP);
    const internRecall = internTP / (internTP + internFN);

    // Require at least 95% across the board
    expect(exportPrecision).toBeGreaterThanOrEqual(0.95);
    expect(exportRecall).toBeGreaterThanOrEqual(0.95);
    expect(internPrecision).toBeGreaterThanOrEqual(0.95);
    expect(internRecall).toBeGreaterThanOrEqual(0.95);
  });

  it('extracts re-exports and destructured exports', async () => {
    const root = await createTempProject('reexport-graph');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'index.ts'), [
      '// Re-exports',
      'export { foo, bar } from "./module";',
      'export { baz as renamed } from "./other";',
      '',
      '// Destructured exports',
      'export const { alpha, beta } = config;',
      'export const [first, second] = items;',
      '',
      '// Regular export for comparison',
      'export function normal() {}',
    ].join('\n'), 'utf-8');

    const graph = await buildCodeGraph(root);
    const file = graph.files[0];
    const names = file.symbols.map((s) => s.name);

    // Re-exports
    expect(names).toContain('foo');
    expect(names).toContain('bar');
    expect(names).toContain('renamed'); // "baz as renamed" → renamed

    // Destructured
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
    expect(names).toContain('first');
    expect(names).toContain('second');

    // Regular
    expect(names).toContain('normal');

    // All should be exported
    expect(file.symbols.every((s) => s.exported)).toBe(true);
  });

  it('skips test files and node_modules', async () => {
    const root = await createTempProject('skip-graph');
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'dep'), { recursive: true });
    await writeFile(join(root, 'src', 'main.ts'), 'export function app() {}', 'utf-8');
    await writeFile(join(root, 'src', 'main.test.ts'), 'export function testApp() {}', 'utf-8');
    await writeFile(join(root, 'src', 'main.spec.ts'), 'export function specApp() {}', 'utf-8');
    await writeFile(join(root, 'node_modules', 'dep', 'index.js'), 'export function dep() {}', 'utf-8');

    const graph = await buildCodeGraph(root);

    expect(graph.totalFiles).toBe(1);
    expect(graph.files[0].path).toBe('src/main.ts');
  });
});
