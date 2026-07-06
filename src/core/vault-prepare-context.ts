/**
 * Context compiler: deterministic, explainable, token-budgeted context assembly.
 *
 * Consumes outputs from STEP-04-02 (ranking), STEP-04-03 (v3 code graph),
 * STEP-04-04 (stub cache), and existing vault graph / extract primitives.
 *
 * This module does NOT re-implement traversal, extraction, or graph lookup;
 * it composes existing primitives.
 */

import { execFile as execFileCallback } from 'child_process';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { promisify } from 'util';
import type { CodeGraphIndex } from './code-graph-lookup';
import { loadCodeGraphIndex } from './code-graph-lookup';
import {
  rankContextCandidates,
  type ContextRankingInput,
  type RankedItem,
  type SourceFileCandidate,
  type VaultNoteCandidate,
} from './context-ranking';
import {
  generateStubForFile,
  readStubManifest,
  resolveStubPath,
} from '../scaffold/code-stubs';
import {
  ensureVaultGraph,
  type VaultGraph,
  type VaultGraphNode,
  traverseVaultGraph,
} from './vault-graph';
import {
  extractVaultNoteTarget,
  type VaultNoteExtractionResult,
} from './vault-extract';
import { buildContextResourceUri } from './context-resources';


const execFile = promisify(execFileCallback);

// ─── Token estimation ────────────────────────────────────────────────

const estimateTokens = (chars: number): number => Math.max(1, Math.ceil(chars / 4));

// ─── Input / Output types ────────────────────────────────────────────

export type PrepareContextMode = 'plan' | 'edit' | 'review' | 'debug' | 'resume';
export type PrepareContextSourceMode = 'summary' | 'stub' | 'excerpt' | 'full';
export type PrepareContextRanker = 'deterministic' | 'local';

export interface PrepareContextInput {
  /** Free-text task description for relevance matching. */
  task?: string;
  /** Path to the file currently being edited (relative to project root). */
  active_file?: string;
  /** Root vault note to start traversal from (relative to vault root). */
  root_note?: string;
  /** Phase ID or canonical target. */
  phase?: string;
  /** Step ID or canonical target. */
  step?: string;
  /** Mode for weighting differences. */
  mode?: PrepareContextMode;
  /** Token budget for the compiled context. */
  max_tokens?: number;
  /** Whether to include source-file context (default: true). */
  include_source?: boolean;
  /** Default source render mode when not determined by ranker (default: 'stub'). */
  source_mode?: PrepareContextSourceMode;
  /** Ranker backend (default: 'deterministic'). */
  ranker?: PrepareContextRanker;
}

export interface PrepareContextItem {
  kind: 'vault_note' | 'source_file';
  path: string;
  resourceUri: string;
  renderMode: 'full' | 'excerpt' | 'stub' | 'summary' | 'heading' | 'metadata';
  score: number;
  reasons: string[];
  estimatedTokens: number;
}

export interface PrepareContextResult {
  meta: {
    mode: PrepareContextMode;
    maxTokens: number | undefined;
    estimatedTokens: number;
    ranker: PrepareContextRanker;
    truncated: boolean;
    warnings: string[];
  };
  items: PrepareContextItem[];
  content: string;
}

// ─── Candidate gathering ────────────────────────────────────────────

const collectChangedFiles = async (projectRoot: string): Promise<string[]> => {
  try {
    const { stdout } = await execFile('git', ['diff', '--name-only'], {
      cwd: projectRoot,
      timeout: 5000,
    });
    return stdout
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
};

const normalizeCanonicalTarget = (value: string): string =>
  value.replace(/\\/g, '/').replace(/\.md$/i, '');

const estimateNoteTokens = (note: VaultGraphNode): number =>
  estimateTokens(note.content.length);

const mapToVaultCandidate = (
  node: VaultGraphNode,
  _graph: VaultGraph,
): VaultNoteCandidate => ({
  canonicalTarget: node.canonicalTarget,
  relativePath: node.relativePath,
  title: node.title,
  noteType: node.noteType,
  status: node.status,
  updated: node.updated,
  mtimeMs: node.mtimeMs,
  outgoingLinks: [...node.outgoingLinks],
  estimatedTokens: estimateNoteTokens(node),
});

const buildGraphDistances = (
  traverseResult: Awaited<ReturnType<typeof traverseVaultGraph>>,
  graph: VaultGraph,
): Map<string, number> => {
  const distances = new Map<string, number>();
  const rootCanonical = normalizeCanonicalTarget(traverseResult.meta.root);
  const rootNode = graph.nodesByCanonicalTarget.get(rootCanonical);
  if (!rootNode) return distances;

  distances.set(rootCanonical, 0);
  const queue: string[] = [rootCanonical];
  const visited = new Set<string>([rootCanonical]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = distances.get(current)!;
    const currentEdges = traverseResult.edges.filter(
      (e) => e.from === current || e.to === current,
    );

    for (const edge of currentEdges) {
      const neighborCanonical =
        edge.from === current
          ? normalizeCanonicalTarget(edge.to)
          : normalizeCanonicalTarget(edge.from);

      const neighborNode = graph.nodesByCanonicalTarget.get(neighborCanonical);
      if (neighborNode && !visited.has(neighborCanonical)) {
        visited.add(neighborCanonical);
        distances.set(neighborCanonical, currentDepth + 1);
        queue.push(neighborCanonical);
      }
    }
  }

  return distances;
};

const buildExplicitLinksFromRoot = (
  graph: VaultGraph,
  traverseResult: Awaited<ReturnType<typeof traverseVaultGraph>>,
): string[] => {
  const rootCanonical = normalizeCanonicalTarget(traverseResult.meta.root);
  const rootNode = graph.nodesByCanonicalTarget.get(rootCanonical);
  return rootNode ? [...rootNode.outgoingLinks] : [];
};

const buildDependencyEdges = (
  index: CodeGraphIndex,
): Map<string, readonly string[]> => {
  if (index.version !== 3) return new Map();

  const edges = new Map<string, string[]>();
  const v3Index = index as {
    version: 3;
    files: Array<{
      path: string;
      imports?: Array<{ specifier: string; imported?: string[] }>;
      exports?: Array<{ name?: string; source?: string; kind?: string }>;
    }>;
  };

  for (const file of v3Index.files) {
    if (!file.imports) continue;

    for (const imp of file.imports) {
      if (!edges.has(file.path)) {
        edges.set(file.path, []);
      }

      // Build edges from imported symbols
      if (imp.imported) {
        for (const symbol of imp.imported) {
          edges.get(file.path)!.push(`${file.path}:${symbol}`);
        }
      }

      // Build edges from resolved paths
  
    }
  }

  return edges;
};

const buildSourceCandidates = (
  index: CodeGraphIndex,
  activeFile?: string,
): SourceFileCandidate[] => {
  const candidates: SourceFileCandidate[] = [];

  if (!index || index.version !== 3) return candidates;

  const v3Index = index as {
    version: 3;
    files: Array<{
      path: string;
      hash?: string;
      mtimeMs?: number;
      size?: number;
      generated?: boolean;
      vendor?: boolean;
      symbols?: Array<{ name: string; exported?: boolean }>;
      imports?: Array<{ specifier: string; imported?: string[] }>;
    }>;
  };

  for (const file of v3Index.files) {
    candidates.push({
      path: file.path,
      estimatedTokens: file.size ? estimateTokens(file.size) : 0,
      isGenerated: file.generated ?? false,
      isVendor: file.vendor ?? false,
    });
  }

  // Add active file if not already in index
  if (activeFile) {
    const exists = candidates.some((c) => c.path === activeFile);
    if (!exists) {
      candidates.push({
        path: activeFile,
        estimatedTokens: 0,
        isGenerated: false,
        isVendor: false,
      });
    }
  }

  return candidates;
};

// ─── Render mode determination ─────────────────────────────────────

const determineRenderMode = (
  item: RankedItem,
  mode: PrepareContextMode,
  sourceMode: PrepareContextSourceMode,
): PrepareContextItem['renderMode'] => {
  if (item.kind === 'vault_note') {
    const base = item.renderMode;
    if (mode === 'plan' && base === 'full') return 'full';
    if (mode === 'debug' && base === 'full') return 'full';
    return base;
  }

  if (item.renderMode === 'full') return 'full';
  if (item.renderMode === 'stub') return 'stub';
  return sourceMode as PrepareContextItem['renderMode'];
};

// ─── Content rendering ────────────────────────────────────────────

const STUBS_DIR = 'code-stubs';

const renderVaultNote = async (
  vaultRoot: string,
  item: PrepareContextItem,
): Promise<string> => {
  try {
    const result: VaultNoteExtractionResult = await extractVaultNoteTarget(
      vaultRoot,
      { notePath: item.path, includeMarkers: false },
    );
    return result.content;
  } catch {
    return `// Could not render: ${item.path}`;
  }
};

const renderSourceStub = async (
  projectRoot: string,
  vaultRoot: string,
  item: PrepareContextItem,
): Promise<string> => {
  const sourcePath = item.path;

  // Try to find a cached stub
  const manifest = await readStubManifest(vaultRoot);
  const entry = manifest?.entries.find((e) => e.path === sourcePath);

  if (entry) {
    const stubPath = resolveStubPath(vaultRoot, entry);
    if (stubPath) {
      const absoluteStubPath = resolve(vaultRoot, STUBS_DIR, stubPath);
      if (existsSync(absoluteStubPath)) {
        return await readFile(absoluteStubPath, 'utf-8');
      }
    }
  }

  // Generate stub on demand
  try {
    const result = await generateStubForFile(projectRoot, vaultRoot, sourcePath);
    if (result && result.stubPath) {
      const absoluteStubPath = resolve(vaultRoot, STUBS_DIR, result.stubPath);
      if (existsSync(absoluteStubPath)) {
        return await readFile(absoluteStubPath, 'utf-8');
      }
    }
  } catch {
    // Ignore generation errors
  }

  // Last resort: truncated source
  try {
    const fullPath = resolve(projectRoot, sourcePath);
    const content = await readFile(fullPath, 'utf-8');
    const limit = 500;
    if (content.length <= limit) {
      return content;
    }
    return `${content.slice(0, limit)}\n\n[truncated — stub not cached]`;
  } catch {
    return `// Stub unavailable: ${sourcePath}`;
  }
};

// ─── Main compiler ────────────────────────────────────────────────

const DEFAULT_TOKEN_BUDGET = 40_000;

/**
 * Compile task-specific context by gathering, ranking, and rendering
 * candidates from vault notes, source files, git changes, and code graph.
 *
 * Fails safely: if the code graph or stub cache is missing, degrades to
 * vault-note-only context and returns a hint to run vault_refresh.
 */
export const prepareContext = async (
  vaultRoot: string,
  projectRoot: string,
  input: PrepareContextInput,
): Promise<PrepareContextResult> => {
  const {
    task,
    active_file,
    root_note,
    phase,
    step,
    mode = 'edit',
    max_tokens = DEFAULT_TOKEN_BUDGET,
    include_source = true,
    source_mode = 'stub',
    ranker = 'deterministic',
  } = input;

  const warnings: string[] = [];

  // ── Resolve active file path ──────────────────────────────────────
  let resolvedActiveFile: string | undefined;
  if (active_file) {
    const absolutePath = resolve(projectRoot, active_file);
    const relativePath = relativePathFromProjectRoot(projectRoot, absolutePath);
    if (relativePath.startsWith('..')) {
      throw new Error(`active_file escapes the project root: ${active_file}`);
    }
    resolvedActiveFile = relativePath;
  }

  // ── Gather vault candidates ───────────────────────────────────────
  const { graph, warnings: graphWarnings } = await ensureVaultGraph(
    vaultRoot,
    'filesystem',
  );
  warnings.push(...graphWarnings);

  // Determine traversal root
  const traverseRoot: string = step
    ? normalizeCanonicalTarget(step)
    : root_note
    ? normalizeCanonicalTarget(root_note)
    : phase
    ? normalizeCanonicalTarget(phase)
    : '00_Home/Active_Context';

  const traverseResult = traverseVaultGraph(graph, {
    root: traverseRoot,
    depth: 3,
    direction: 'outgoing',
    includeContent: false,
    maxNotes: 200,
    resolver: 'filesystem',
  }, graphWarnings);

  const vaultCandidates: VaultNoteCandidate[] = [];
  for (const node of graph.nodes) {
    vaultCandidates.push(mapToVaultCandidate(node, graph));
  }

  // ── Gather source candidates ──────────────────────────────────────
  let codeGraphIndex: CodeGraphIndex | undefined;
  let dependencyEdges = new Map<string, readonly string[]>();
  let codeGraphStale = false;

  if (include_source) {
    try {
      codeGraphIndex = await loadCodeGraphIndex(vaultRoot);
      dependencyEdges = buildDependencyEdges(codeGraphIndex);
    } catch {
      warnings.push(
        'code graph index missing; source-file candidates unavailable. Run vault_refresh target=code_graph.',
      );
      codeGraphStale = true;
    }
  }

  const sourceCandidates = include_source
    ? buildSourceCandidates(codeGraphIndex ?? {} as CodeGraphIndex, resolvedActiveFile)
    : [];

  // ── Gather changed files ──────────────────────────────────────────
  let changedFiles: string[] = [];
  try {
    changedFiles = await collectChangedFiles(projectRoot);
  } catch {
    warnings.push('git unavailable; changed-file signals absent.');
  }

  // ── Build graph distances ─────────────────────────────────────────
  const graphDistances = buildGraphDistances(traverseResult, graph);
  const explicitLinks = buildExplicitLinksFromRoot(graph, traverseResult);

  // ── Build ranking input ──────────────────────────────────────────
  const rankingInput: ContextRankingInput = {
    taskText: task,
    rootNoteCanonicalTarget: phase
      ? normalizeCanonicalTarget(phase)
      : undefined,
    activeStepCanonicalTarget: step
      ? normalizeCanonicalTarget(step)
      : undefined,
    activePhaseCanonicalTarget: phase
      ? normalizeCanonicalTarget(phase)
      : undefined,
    changedFiles,
    explicitLinksFromRoot: explicitLinks,
    graphDistances,
    dependencyEdges,
    vaultCandidates,
    sourceCandidates,
    tokenBudget: max_tokens,
    minRelevanceScore: 0,
    codeGraphStale,
  };

  // ── Rank candidates ───────────────────────────────────────────────
  const rankingResult = rankContextCandidates(rankingInput);

  // ── Map ranked items to PrepareContextItem ────────────────────────
  const items: PrepareContextItem[] = rankingResult.items.map((ranked) => {
    const renderMode = determineRenderMode(ranked, mode, source_mode);
    return {
      kind: ranked.kind,
      path: ranked.path,
      resourceUri: ranked.kind === 'vault_note'
        ? buildContextResourceUri('note', ranked.path)
        : buildContextResourceUri(renderMode === 'summary' ? 'code-summary' : 'code-stub', ranked.path),
      renderMode,
      score: ranked.score,
      reasons: [...ranked.reasons],
      estimatedTokens: ranked.estimatedTokens,
    };
  });

  // ── Render content ────────────────────────────────────────────────
  const contentParts: string[] = [];
  let renderedTokens = 0;

  for (const item of items) {
    let rendered: string;

    if (item.kind === 'vault_note') {
      rendered = await renderVaultNote(vaultRoot, item);
    } else if (include_source) {
      rendered = await renderSourceStub(projectRoot, vaultRoot, item);
    } else {
      continue;
    }

    const itemTokens = estimateTokens(rendered.length);
    renderedTokens += itemTokens;

    contentParts.push(
      `--- ${item.kind}: ${item.path} (${item.renderMode}, score=${item.score}, tokens≈${itemTokens}) ---`,
    );
    contentParts.push(rendered);
    contentParts.push('');
  }

  const totalEstimatedTokens = items.reduce((sum, i) => sum + i.estimatedTokens, 0);

  return {
    meta: {
      mode,
      maxTokens: max_tokens,
      estimatedTokens: totalEstimatedTokens,
      ranker,
      truncated: rankingResult.prunedCount > 0,
      warnings,
    },
    items,
    content: contentParts.join('\n'),
  };
};

// ─── Helpers ───────────────────────────────────────────────────────

const relativePathFromProjectRoot = (projectRoot: string, absolutePath: string): string => {
  const { relative } = require('path');
  const relPath: string = relative(projectRoot, absolutePath);
  return relPath.replace(/\\/g, '/');
};
