import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import {
  collectLinks,
  ensureVaultGraph,
  formatVaultTraverseResultAsJson,
  formatVaultTraverseResultAsToon,
  invalidateVaultGraphCache,
  traverseVaultGraph,
} from '../../src/core/vault-graph';

const tempRoots: string[] = [];

const writeNote = async (vaultRoot: string, relativePath: string, lines: string[]): Promise<void> => {
  const absolutePath = join(vaultRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, lines.join('\n'), 'utf-8');
};

const createTempVault = async (): Promise<string> => {
  const vaultRoot = await mkdtemp(join(tmpdir(), 'agent-vault-graph-'));
  tempRoots.push(vaultRoot);

  await writeNote(vaultRoot, '02_Phases/Phase_01_Foundation/Phase.md', [
    '---',
    'note_type: phase',
    'title: Foundation',
    'status: active',
    'updated: "2026-03-14"',
    '---',
    '',
    '# Phase 01 Foundation',
    '',
    'See [[02_Phases/Phase_01_Foundation/Steps/Step_01_graph|STEP-01 Graph Index]].',
    'See [[01_Architecture/System_Overview|System Overview]].',
  ]);

  await writeNote(vaultRoot, '02_Phases/Phase_01_Foundation/Steps/Step_01_graph.md', [
    '---',
    'note_type: step',
    'title: Add graph traversal',
    'status: planned',
    'updated: "2026-03-15"',
    '---',
    '',
    '# Step 01 Graph Traversal',
    '',
    'Back to [[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]].',
    '[Decision](../../../04_Decisions/DEC-0001.md)',
  ]);

  await writeNote(vaultRoot, '01_Architecture/System_Overview.md', [
    '---',
    'note_type: architecture',
    'title: System Overview',
    'status: active',
    'updated: "2026-03-12"',
    '---',
    '',
    '# System Overview',
    '',
    'Relates to [[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]].',
  ]);

  await writeNote(vaultRoot, '04_Decisions/DEC-0001.md', [
    '---',
    'note_type: decision',
    'title: Use graph traversal',
    'status: decided',
    'updated: "2026-03-16"',
    '---',
    '',
    '# Decision 0001',
    '',
    'Relates to [[02_Phases/Phase_01_Foundation/Steps/Step_01_graph|STEP-01 Graph Index]].',
  ]);

  return vaultRoot;
};

afterEach(async () => {
  invalidateVaultGraphCache();
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('vault graph', () => {
  it('collects normalized wiki and markdown links', () => {
    const links = collectLinks(
      '02_Phases/Phase_01_Foundation/Steps/Step_01_graph.md',
      '[[../Phase|Phase]] and [Decision](../../../04_Decisions/DEC-0001.md) and https://example.com'
    );

    expect([...links]).toEqual([
      '02_Phases/Phase_01_Foundation/Phase',
      '04_Decisions/DEC-0001',
    ]);
  });

  it('traverses the graph by depth and direction', async () => {
    const vaultRoot = await createTempVault();
    const { graph, warnings } = await ensureVaultGraph(vaultRoot);

    const result = traverseVaultGraph(graph, {
      root: '02_Phases/Phase_01_Foundation/Phase',
      depth: 1,
      direction: 'outgoing',
    }, warnings);

    expect(result.meta.totalNotes).toBe(3);
    expect(result.meta.truncated).toBe(false);
    expect(result.notes.map((note) => note.path)).toEqual([
      '01_Architecture/System_Overview.md',
      '02_Phases/Phase_01_Foundation/Phase.md',
      '02_Phases/Phase_01_Foundation/Steps/Step_01_graph.md',
    ]);
    expect(result.edges).toEqual([
      {
        from: '01_Architecture/System_Overview.md',
        to: '02_Phases/Phase_01_Foundation/Phase.md',
      },
      {
        from: '02_Phases/Phase_01_Foundation/Phase.md',
        to: '01_Architecture/System_Overview.md',
      },
      {
        from: '02_Phases/Phase_01_Foundation/Phase.md',
        to: '02_Phases/Phase_01_Foundation/Steps/Step_01_graph.md',
      },
      {
        from: '02_Phases/Phase_01_Foundation/Steps/Step_01_graph.md',
        to: '02_Phases/Phase_01_Foundation/Phase.md',
      },
    ]);
  });

  it('applies filters to returned notes while preserving the root', async () => {
    const vaultRoot = await createTempVault();
    const { graph, warnings } = await ensureVaultGraph(vaultRoot);

    const result = traverseVaultGraph(graph, {
      root: '02_Phases/Phase_01_Foundation/Phase.md',
      depth: 2,
      direction: 'both',
      noteTypes: ['architecture'],
      statuses: ['active'],
    }, warnings);

    expect(result.notes.map((note) => note.path)).toEqual([
      '01_Architecture/System_Overview.md',
      '02_Phases/Phase_01_Foundation/Phase.md',
    ]);
    expect(result.edges).toEqual([
      {
        from: '01_Architecture/System_Overview.md',
        to: '02_Phases/Phase_01_Foundation/Phase.md',
      },
      {
        from: '02_Phases/Phase_01_Foundation/Phase.md',
        to: '01_Architecture/System_Overview.md',
      },
    ]);
  });

  it('keeps filtered traversals focused through non-matching bridge notes', async () => {
    const vaultRoot = await mkdtemp(join(tmpdir(), 'agent-vault-fanout-'));
    tempRoots.push(vaultRoot);

    await writeNote(vaultRoot, '00_Home/Root.md', [
      '---',
      'note_type: home_context',
      'title: Root',
      'status: active',
      '---',
      '',
      '# Root',
      '',
      '[[00_Home/Bridge|Bridge]]',
    ]);

    await writeNote(vaultRoot, '00_Home/Bridge.md', [
      '---',
      'note_type: home_context',
      'title: Bridge',
      'status: active',
      '---',
      '',
      '# Bridge',
      '',
      '[[01_Architecture/Focused_Context|Focused Context]]',
      ...Array.from({ length: 24 }, (_, index) => `[[02_Phases/Phase_${String(index + 1).padStart(2, '0')}/Phase|Phase ${index + 1}]]`),
    ]);

    await writeNote(vaultRoot, '01_Architecture/Focused_Context.md', [
      '---',
      'note_type: architecture',
      'title: Focused Context',
      'status: active',
      '---',
      '',
      '# Focused Context',
    ]);

    await Promise.all(Array.from({ length: 24 }, (_, index) =>
      writeNote(vaultRoot, `02_Phases/Phase_${String(index + 1).padStart(2, '0')}/Phase.md`, [
        '---',
        'note_type: phase',
        `title: Phase ${index + 1}`,
        'status: planned',
        '---',
        '',
        `# Phase ${index + 1}`,
      ])
    ));

    const { graph, warnings } = await ensureVaultGraph(vaultRoot);
    const result = traverseVaultGraph(graph, {
      root: '00_Home/Root',
      depth: 2,
      direction: 'outgoing',
      noteTypes: ['architecture'],
      maxNotes: 2,
    }, warnings);

    expect(result.meta.truncated).toBe(false);
    expect(result.notes.map((note) => note.path)).toEqual([
      '00_Home/Root.md',
      '01_Architecture/Focused_Context.md',
    ]);
  });

  it('bounds included content and marks truncation', async () => {
    const vaultRoot = await createTempVault();
    const longContent = 'A'.repeat(4500);
    await writeNote(vaultRoot, '03_Bugs/BUG-0001.md', [
      '---',
      'note_type: bug',
      'title: Big bug',
      'status: active',
      'updated: "2026-03-17"',
      '---',
      '',
      '# Big bug',
      '',
      longContent,
    ]);
    await writeNote(vaultRoot, '00_Home/Root.md', [
      '---',
      'note_type: home_context',
      'title: Root',
      'status: active',
      'updated: "2026-03-17"',
      '---',
      '',
      '# Root',
      '',
      '[[03_Bugs/BUG-0001|BUG-0001]]',
    ]);

    const { graph, warnings } = await ensureVaultGraph(vaultRoot);
    const result = traverseVaultGraph(graph, {
      root: '00_Home/Root',
      depth: 1,
      direction: 'outgoing',
      includeContent: true,
    }, warnings);

    expect(result.meta.truncated).toBe(true);
    expect(result.notes.some((note) => note.content?.includes('[truncated]'))).toBe(true);
    expect(formatVaultTraverseResultAsJson(result)).toContain('"notes"');
    expect(formatVaultTraverseResultAsToon(result)).toContain('notes[');
  });

  it('prioritizes root content and caps aggregate content payloads', async () => {
    const vaultRoot = await mkdtemp(join(tmpdir(), 'agent-vault-content-'));
    tempRoots.push(vaultRoot);

    const longContent = 'B'.repeat(9000);
    await Promise.all(Array.from({ length: 11 }, (_, index) =>
      writeNote(vaultRoot, `01_Context/Note_${String(index + 1).padStart(2, '0')}.md`, [
        '---',
        'note_type: architecture',
        `title: Note ${index + 1}`,
        'status: active',
        '---',
        '',
        `# Note ${index + 1}`,
        '',
        longContent,
      ])
    ));

    await writeNote(vaultRoot, '99_Root.md', [
      '---',
      'note_type: home_context',
      'title: Root',
      'status: active',
      '---',
      '',
      '# Root',
      '',
      ...Array.from({ length: 11 }, (_, index) => `[[01_Context/Note_${String(index + 1).padStart(2, '0')}|Note ${index + 1}]]`),
      '',
      longContent,
    ]);

    const { graph, warnings } = await ensureVaultGraph(vaultRoot);
    const result = traverseVaultGraph(graph, {
      root: '99_Root',
      depth: 1,
      direction: 'outgoing',
      includeContent: true,
    }, warnings);

    const rootNote = result.notes.find((note) => note.path === '99_Root.md');
    const totalContentLength = result.notes.reduce((sum, note) => sum + (note.content?.length ?? 0), 0);

    expect(rootNote?.content).toBeTruthy();
    expect(totalContentLength).toBeLessThanOrEqual(24000);
    expect(result.notes.filter((note) => note.content && note.content.length > 0)).toHaveLength(12);
  });

  it('honors max_notes as a safety cap', async () => {
    const vaultRoot = await createTempVault();
    const { graph, warnings } = await ensureVaultGraph(vaultRoot);

    const result = traverseVaultGraph(graph, {
      root: '02_Phases/Phase_01_Foundation/Phase',
      depth: 2,
      direction: 'both',
      maxNotes: 2,
    }, warnings);

    expect(result.meta.truncated).toBe(true);
    expect(result.notes).toHaveLength(2);
  });
});
