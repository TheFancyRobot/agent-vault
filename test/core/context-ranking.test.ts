import { describe, expect, it } from 'vitest';
import type {
  ContextRankingInput,
  ContextRankingResult,
  RankedItem,
  SourceFileCandidate,
  VaultNoteCandidate,
} from '../../src/core/context-ranking';
import { rankContextCandidates } from '../../src/core/context-ranking';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeVaultCandidate = (
  overrides: Partial<VaultNoteCandidate> & Pick<VaultNoteCandidate, 'canonicalTarget' | 'relativePath'>,
): VaultNoteCandidate => ({
  title: overrides.canonicalTarget.split('/').pop() ?? 'Untitled',
  noteType: 'step',
  status: 'planned',
  updated: '2026-07-05',
  mtimeMs: Date.now() - 86_400_000, // 1 day ago
  outgoingLinks: [],
  estimatedTokens: 200,
  ...overrides,
});

const makeSourceCandidate = (
  overrides: Partial<SourceFileCandidate> & Pick<SourceFileCandidate, 'path'>,
): SourceFileCandidate => ({
  estimatedTokens: 100,
  isGenerated: false,
  isVendor: false,
  ...overrides,
});

const makeInput = (overrides: Partial<ContextRankingInput> = {}): ContextRankingInput => ({
  explicitLinksFromRoot: [],
  graphDistances: new Map(),
  vaultCandidates: [],
  sourceCandidates: [],
  ...overrides,
});

const findItem = (result: ContextRankingResult, path: string): RankedItem | undefined =>
  result.items.find((item) => item.path === path);

const findItemByKind = (result: ContextRankingResult, path: string, kind: 'vault_note' | 'source_file'): RankedItem | undefined =>
  result.items.find((item) => item.path === path && item.kind === kind);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('context ranking', () => {
  describe('determinism', () => {
    it('produces identical output ordering for the same inputs', () => {
      const referenceTimeMs = Date.now();
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Phase', relativePath: '02_Phases/Phase_01/Phase.md', status: 'active' }),
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Steps/Step_01', relativePath: '02_Phases/Phase_01/Steps/Step_01.md' }),
          makeVaultCandidate({ canonicalTarget: '01_Architecture/System_Overview', relativePath: '01_Architecture/System_Overview.md' }),
        ],
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
          makeSourceCandidate({ path: 'src/core/vault-files.ts' }),
        ],
        rootNoteCanonicalTarget: '02_Phases/Phase_01/Phase',
        explicitLinksFromRoot: ['02_Phases/Phase_01/Steps/Step_01'],
        graphDistances: new Map([
          ['02_Phases/Phase_01/Phase', 0],
          ['02_Phases/Phase_01/Steps/Step_01', 1],
          ['01_Architecture/System_Overview', 1],
        ]),
        referenceTimeMs,
      });

      const result1 = rankContextCandidates(input);
      const result2 = rankContextCandidates(input);

      expect(result1.items.map((i) => i.path)).toEqual(result2.items.map((i) => i.path));
      expect(result1.items.map((i) => i.score)).toEqual(result2.items.map((i) => i.score));
      expect(result1.items.map((i) => i.reasons)).toEqual(result2.items.map((i) => i.reasons));
    });
  });

  describe('direct target', () => {
    it('scores the root note highest and carries a "direct target" reason', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Phase', relativePath: '02_Phases/Phase_01/Phase.md' }),
          makeVaultCandidate({ canonicalTarget: '01_Architecture/System_Overview', relativePath: '01_Architecture/System_Overview.md' }),
        ],
        rootNoteCanonicalTarget: '02_Phases/Phase_01/Phase',
      });

      const result = rankContextCandidates(input);
      const rootItem = findItem(result, '02_Phases/Phase_01/Phase.md');
      const otherItem = findItem(result, '01_Architecture/System_Overview.md');

      expect(rootItem).toBeDefined();
      expect(otherItem).toBeDefined();
      expect(rootItem!.score).toBeGreaterThan(otherItem!.score);
      expect(rootItem!.reasons).toContain('direct target');
    });

    it('scores the active step as a direct target', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Steps/Step_01', relativePath: '02_Phases/Phase_01/Steps/Step_01.md' }),
          makeVaultCandidate({ canonicalTarget: '01_Architecture/System_Overview', relativePath: '01_Architecture/System_Overview.md' }),
        ],
        activeStepCanonicalTarget: '02_Phases/Phase_01/Steps/Step_01',
      });

      const result = rankContextCandidates(input);
      const stepItem = findItem(result, '02_Phases/Phase_01/Steps/Step_01.md');

      expect(stepItem).toBeDefined();
      expect(stepItem!.reasons).toContain('direct target');
    });
  });

  describe('explicitly linked from root', () => {
    it('applies boost and reports the reason', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Steps/Step_01', relativePath: '02_Phases/Phase_01/Steps/Step_01.md' }),
          makeVaultCandidate({ canonicalTarget: '01_Architecture/System_Overview', relativePath: '01_Architecture/System_Overview.md' }),
        ],
        rootNoteCanonicalTarget: '02_Phases/Phase_01/Phase',
        explicitLinksFromRoot: ['02_Phases/Phase_01/Steps/Step_01'],
      });

      const result = rankContextCandidates(input);
      const linkedItem = findItem(result, '02_Phases/Phase_01/Steps/Step_01.md');
      const unlinkedItem = findItem(result, '01_Architecture/System_Overview.md');

      expect(linkedItem!.reasons).toContain('explicitly linked from root');
      expect(unlinkedItem!.reasons).not.toContain('explicitly linked from root');
      expect(linkedItem!.score).toBeGreaterThan(unlinkedItem!.score);
    });
  });

  describe('active session or step', () => {
    it('applies boost when candidate is the active step', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Steps/Step_01', relativePath: '02_Phases/Phase_01/Steps/Step_01.md' }),
        ],
        activeStepCanonicalTarget: '02_Phases/Phase_01/Steps/Step_01',
      });

      const result = rankContextCandidates(input);
      const item = findItem(result, '02_Phases/Phase_01/Steps/Step_01.md');

      expect(item!.reasons).toContain('active session or step');
    });

    it('applies boost when candidate is a session note', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: '05_Sessions/Session_01',
            relativePath: '05_Sessions/Session_01.md',
            noteType: 'session',
          }),
          makeVaultCandidate({ canonicalTarget: '01_Architecture/System_Overview', relativePath: '01_Architecture/System_Overview.md' }),
        ],
      });

      const result = rankContextCandidates(input);
      const sessionItem = findItem(result, '05_Sessions/Session_01.md');
      const otherItem = findItem(result, '01_Architecture/System_Overview.md');

      expect(sessionItem!.reasons).toContain('active session or step');
      expect(otherItem!.reasons).not.toContain('active session or step');
    });
  });

  describe('same phase', () => {
    it('applies boost when candidate is in the same phase as the active phase', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: '02_Phases/Phase_04_context_compiler/Steps/Step_02',
            relativePath: '02_Phases/Phase_04_context_compiler/Steps/Step_02.md',
          }),
          makeVaultCandidate({
            canonicalTarget: '02_Phases/Phase_01_foundation/Steps/Step_01',
            relativePath: '02_Phases/Phase_01_foundation/Steps/Step_01.md',
          }),
        ],
        activePhaseCanonicalTarget: '02_Phases/Phase_04_context_compiler/Phase',
      });

      const result = rankContextCandidates(input);
      const samePhaseItem = findItem(result, '02_Phases/Phase_04_context_compiler/Steps/Step_02.md');
      const otherPhaseItem = findItem(result, '02_Phases/Phase_01_foundation/Steps/Step_01.md');

      expect(samePhaseItem!.reasons).toContain('same phase');
      expect(otherPhaseItem!.reasons).not.toContain('same phase');
      expect(samePhaseItem!.score).toBeGreaterThan(otherPhaseItem!.score);
    });
  });

  describe('code symbol match', () => {
    it('applies boost when source file path matches task text words', () => {
      const input = makeInput({
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
          makeSourceCandidate({ path: 'src/core/vault-files.ts' }),
        ],
        taskText: 'edit graph traversal logic',
      });

      const result = rankContextCandidates(input);
      const graphItem = findItemByKind(result, 'src/core/vault-graph.ts', 'source_file');
      const filesItem = findItemByKind(result, 'src/core/vault-files.ts', 'source_file');

      expect(graphItem!.reasons).toContain('code symbol match');
      expect(filesItem!.reasons).not.toContain('code symbol match');
    });
  });

  describe('dependency edge', () => {
    it('applies boost when dependency edges are supplied', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'src/core/vault-graph', relativePath: 'src/core/vault-graph.md' }),
        ],
        dependencyEdges: new Map([
          ['src/core/vault-graph', ['src/core/vault-files']],
        ]),
      });

      const result = rankContextCandidates(input);
      const item = findItem(result, 'src/core/vault-graph.md');

      expect(item!.reasons).toContain('dependency edge');
    });

    it('is a no-op when dependency edges are absent', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'src/core/vault-graph', relativePath: 'src/core/vault-graph.md' }),
        ],
      });

      const result = rankContextCandidates(input);
      const item = findItem(result, 'src/core/vault-graph.md');

      expect(item!.reasons).not.toContain('dependency edge');
    });
  });

  describe('changed in git diff', () => {
    it('applies boost when candidate is in the changed files list', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: '02_Phases/Phase_01/Phase', relativePath: '02_Phases/Phase_01/Phase.md' }),
        ],
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
          makeSourceCandidate({ path: 'src/core/vault-files.ts' }),
        ],
        changedFiles: ['src/core/vault-graph.ts'],
      });

      const result = rankContextCandidates(input);
      const changedItem = findItemByKind(result, 'src/core/vault-graph.ts', 'source_file');
      const unchangedItem = findItemByKind(result, 'src/core/vault-files.ts', 'source_file');

      expect(changedItem!.reasons).toContain('changed in git diff');
      expect(unchangedItem!.reasons).not.toContain('changed in git diff');
    });
  });

  describe('graph distance', () => {
    it('contributes reciprocally (distance 0 > 1 > 2)', () => {
      const dist0 = makeVaultCandidate({ canonicalTarget: 'root', relativePath: 'root.md' });
      const dist1 = makeVaultCandidate({ canonicalTarget: 'child', relativePath: 'child.md' });
      const dist2 = makeVaultCandidate({ canonicalTarget: 'grandchild', relativePath: 'grandchild.md' });

      const input = makeInput({
        vaultCandidates: [dist0, dist1, dist2],
        rootNoteCanonicalTarget: 'root',
        graphDistances: new Map([
          ['root', 0],
          ['child', 1],
          ['grandchild', 2],
        ]),
      });

      const result = rankContextCandidates(input);
      const rootItem = findItem(result, 'root.md');
      const childItem = findItem(result, 'child.md');
      const grandchildItem = findItem(result, 'grandchild.md');

      expect(rootItem!.score).toBeGreaterThan(childItem!.score);
      expect(childItem!.score).toBeGreaterThan(grandchildItem!.score);
      expect(rootItem!.reasons).toContain('graph distance=0');
      expect(childItem!.reasons).toContain('graph distance=1');
      expect(grandchildItem!.reasons).toContain('graph distance=2');
    });
  });

  describe('stale index penalty', () => {
    it('reduces source-file scores and is reported', () => {
      const input = makeInput({
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
        ],
        codeGraphStale: true,
      });

      const result = rankContextCandidates(input);
      const item = findItemByKind(result, 'src/core/vault-graph.ts', 'source_file');

      expect(item!.reasons).toContain('stale index penalty');
      expect(item!.score).toBeLessThan(0);
    });
  });

  describe('generated or vendor penalty', () => {
    it('reduces source-file scores and is reported', () => {
      const input = makeInput({
        sourceCandidates: [
          makeSourceCandidate({ path: 'dist/cli.mjs', isGenerated: true }),
          makeSourceCandidate({ path: 'node_modules/foo/index.js', isVendor: true }),
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
        ],
      });

      const result = rankContextCandidates(input);
      const genItem = findItemByKind(result, 'dist/cli.mjs', 'source_file');
      const vendorItem = findItemByKind(result, 'node_modules/foo/index.js', 'source_file');
      const normalItem = findItemByKind(result, 'src/core/vault-graph.ts', 'source_file');

      expect(genItem!.reasons).toContain('generated or vendor penalty');
      expect(vendorItem!.reasons).toContain('generated or vendor penalty');
      expect(normalItem!.reasons).not.toContain('generated or vendor penalty');
      expect(normalItem!.score).toBeGreaterThan(genItem!.score);
      expect(normalItem!.score).toBeGreaterThan(vendorItem!.score);
    });
  });

  describe('token budget pruning', () => {
    it('drops low-score items first when budget is exceeded', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: 'high',
            relativePath: 'high.md',
            estimatedTokens: 100,
          }),
          makeVaultCandidate({
            canonicalTarget: 'low',
            relativePath: 'low.md',
            estimatedTokens: 100,
          }),
        ],
        rootNoteCanonicalTarget: 'high',
        tokenBudget: 150,
      });

      const result = rankContextCandidates(input);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.path).toBe('high.md');
      expect(result.prunedCount).toBe(1);
    });

    it('keeps mandatory items regardless of score', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: 'mandatory',
            relativePath: 'mandatory.md',
            estimatedTokens: 500,
          }),
          makeVaultCandidate({
            canonicalTarget: 'other',
            relativePath: 'other.md',
            estimatedTokens: 100,
          }),
        ],
        rootNoteCanonicalTarget: 'mandatory',
        explicitLinksFromRoot: ['mandatory'],
        tokenBudget: 200,
      });

      const result = rankContextCandidates(input);

      // The mandatory item should be included even though it exceeds budget
      const mandatoryItem = findItem(result, 'mandatory.md');
      expect(mandatoryItem).toBeDefined();
    });

    it('reports estimated tokens for included items', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: 'note',
            relativePath: 'note.md',
            estimatedTokens: 200,
          }),
        ],
        tokenBudget: 1000,
      });

      const result = rankContextCandidates(input);

      expect(result.totalEstimatedTokens).toBe(200);
    });
  });

  describe('minimum relevance score', () => {
    it('prunes items below the minimum score unless mandatory', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: 'high',
            relativePath: 'high.md',
            status: 'active',
          }),
          makeVaultCandidate({
            canonicalTarget: 'low',
            relativePath: 'low.md',
            status: 'planned',
          }),
        ],
        rootNoteCanonicalTarget: 'high',
        minRelevanceScore: 5,
      });

      const result = rankContextCandidates(input);

      // The high item should be included (direct target = 8.0)
      const highItem = findItem(result, 'high.md');
      expect(highItem).toBeDefined();

      // The low item should be pruned (no boosts, score < 5)
      const lowItem = findItem(result, 'low.md');
      expect(lowItem).toBeUndefined();
      expect(result.prunedCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('render mode', () => {
    it('assigns "full" to direct target vault notes', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'root', relativePath: 'root.md' }),
        ],
        rootNoteCanonicalTarget: 'root',
      });

      const result = rankContextCandidates(input);
      expect(result.items[0]!.renderMode).toBe('full');
    });

    it('assigns "excerpt" to non-direct vault notes', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'other', relativePath: 'other.md' }),
        ],
      });

      const result = rankContextCandidates(input);
      expect(result.items[0]!.renderMode).toBe('excerpt');
    });

    it('assigns "stub" to source files', () => {
      const input = makeInput({
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
        ],
      });

      const result = rankContextCandidates(input);
      expect(result.items[0]!.renderMode).toBe('stub');
    });
  });

  describe('edge cases', () => {
    it('handles no task text (rank purely on structural signals)', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'root', relativePath: 'root.md', status: 'active' }),
          makeVaultCandidate({ canonicalTarget: 'child', relativePath: 'child.md' }),
        ],
        rootNoteCanonicalTarget: 'root',
        graphDistances: new Map([
          ['root', 0],
          ['child', 1],
        ]),
      });

      const result = rankContextCandidates(input);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]!.path).toBe('root.md');
    });

    it('handles empty vault graph', () => {
      const input = makeInput();

      const result = rankContextCandidates(input);

      expect(result.items).toHaveLength(0);
      expect(result.totalEstimatedTokens).toBe(0);
      expect(result.prunedCount).toBe(0);
    });

    it('handles ties with stable path-order tiebreak', () => {
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({ canonicalTarget: 'b_note', relativePath: 'b_note.md' }),
          makeVaultCandidate({ canonicalTarget: 'a_note', relativePath: 'a_note.md' }),
        ],
      });

      const result = rankContextCandidates(input);

      // Both have the same score, so they should be sorted by path
      expect(result.items[0]!.path).toBe('a_note.md');
      expect(result.items[1]!.path).toBe('b_note.md');
    });

    it('handles source candidates with no code graph stale flag', () => {
      const input = makeInput({
        sourceCandidates: [
          makeSourceCandidate({ path: 'src/core/vault-graph.ts' }),
        ],
      });

      const result = rankContextCandidates(input);
      const item = findItemByKind(result, 'src/core/vault-graph.ts', 'source_file');

      expect(item!.reasons).not.toContain('stale index penalty');
    });
  });

  describe('combined scoring', () => {
    it('accumulates multiple scoring components correctly', () => {
      const referenceTimeMs = Date.now();
      const input = makeInput({
        vaultCandidates: [
          makeVaultCandidate({
            canonicalTarget: '02_Phases/Phase_04_context_compiler/Steps/Step_02',
            relativePath: '02_Phases/Phase_04_context_compiler/Steps/Step_02.md',
            status: 'active',
            mtimeMs: referenceTimeMs - 1000, // very recent
          }),
        ],
        rootNoteCanonicalTarget: '02_Phases/Phase_04_context_compiler/Phase',
        activeStepCanonicalTarget: '02_Phases/Phase_04_context_compiler/Steps/Step_02',
        activePhaseCanonicalTarget: '02_Phases/Phase_04_context_compiler/Phase',
        explicitLinksFromRoot: ['02_Phases/Phase_04_context_compiler/Steps/Step_02'],
        graphDistances: new Map([
          ['02_Phases/Phase_04_context_compiler/Steps/Step_02', 1],
        ]),
        changedFiles: ['02_Phases/Phase_04_context_compiler/Steps/Step_02.md'],
        referenceTimeMs,
      });

      const result = rankContextCandidates(input);
      const item = result.items[0]!;

      // Should have multiple reasons
      expect(item.reasons.length).toBeGreaterThanOrEqual(4);
      expect(item.reasons).toContain('direct target');
      expect(item.reasons).toContain('explicitly linked from root');
      expect(item.reasons).toContain('active session or step');
      expect(item.reasons).toContain('same phase');
      expect(item.reasons).toContain('changed in git diff');
      expect(item.reasons).toContain('graph distance=1');
      expect(item.reasons).toContain('recency boost');
      expect(item.reasons).toContain('status=active');

      // Score should be high: 8 + 6 + 5 + 4 + 3 + 1.0 + 1.5 + 1.0 = 29.5
      // (graph distance=1 → 2.0/(1+1) = 1.0)
      expect(item.score).toBeCloseTo(29.5, 1);
    });
  });
});