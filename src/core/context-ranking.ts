/**
 * A vault-note candidate for deterministic context ranking.
 *
 * This type mirrors the shape of `VaultGraphNode` but only carries the fields
 * that the ranking function actually needs.  It is produced by the caller
 * (e.g. the context compiler) and passed into `rankContextCandidates`.
 */
export interface VaultNoteCandidate {
  /** Canonical target used for link resolution (normalized, no `.md`). */
  readonly canonicalTarget: string;
  /** Relative path from the vault root (e.g. `02_Phases/Phase_01/Phase.md`). */
  readonly relativePath: string;
  /** Note title from frontmatter or first heading. */
  readonly title: string;
  /** Note type from frontmatter (`phase`, `step`, `session`, etc.). */
  readonly noteType?: string;
  /** Status from frontmatter (`active`, `planned`, `completed`, etc.). */
  readonly status?: string;
  /** `updated` date from frontmatter, or undefined. */
  readonly updated?: string;
  /** File modification time in milliseconds. */
  readonly mtimeMs: number;
  /** Canonical targets of notes this note links to. */
  readonly outgoingLinks: readonly string[];
  /** Estimated character-based token count (chars / 4). */
  readonly estimatedTokens: number;
}

/**
 * A source-file candidate for deterministic context ranking.
 */
export interface SourceFileCandidate {
  /** Relative path from the project root. */
  readonly path: string;
  /** Estimated character-based token count (chars / 4). */
  readonly estimatedTokens: number;
  /** True when the file is auto-generated (e.g. under `08_Automation/`). */
  readonly isGenerated?: boolean;
  /** True when the file lives under a vendor directory (e.g. `node_modules/`). */
  readonly isVendor?: boolean;
}

/**
 * Optional reference time for deterministic recency scoring.
 * If not provided, `Date.now()` is used.
 */
export interface ContextRankingOptions {
  /** Reference timestamp (ms since epoch) for recency calculations. */
  readonly referenceTimeMs?: number;
}

/**
 * Input to the deterministic context ranker.
 *
 * All task signals are optional; the ranker works purely on structural
 * signals if no task text is supplied.
 */
export interface ContextRankingInput {
  /** Free-text task description, used for code-symbol matching. */
  readonly taskText?: string;

  /** Canonical target of the root note (the traversal origin). */
  readonly rootNoteCanonicalTarget?: string;

  /** Canonical target of the active step note. */
  readonly activeStepCanonicalTarget?: string;

  /** Canonical target of the active phase note. */
  readonly activePhaseCanonicalTarget?: string;

  /** Relative paths of files changed in the working tree. */
  readonly changedFiles?: readonly string[];

  /** Canonical targets explicitly linked from the root note. */
  readonly explicitLinksFromRoot: readonly string[];

  /** Graph distance from the root note for each canonical target. */
  readonly graphDistances: Map<string, number>;

  /** Optional dependency edges: canonical target → dependents. */
  readonly dependencyEdges?: Map<string, readonly string[]>;

  /**
   * Vault-note candidates.  These are the notes that can be included in the
   * compiled context.
   */
  readonly vaultCandidates: readonly VaultNoteCandidate[];

  /**
   * Source-file candidates.  These are the source files that can be
   * included in the compiled context.
   */
  readonly sourceCandidates: readonly SourceFileCandidate[];

  /**
   * Maximum token budget for the compiled context.  Items are pruned
   * when the budget would be exceeded, lowest-scored first.
   */
  readonly tokenBudget?: number;

  /**
   * Minimum relevance score threshold.  Items scoring below this value
   * are pruned unless they are mandatory.
   */
  readonly minRelevanceScore?: number;

  /**
   * True when the code-graph index is known to be stale.  A penalty is
   * applied to source-file candidates when this is true.
   */
  readonly codeGraphStale?: boolean;

  /**
   * Optional reference time for deterministic recency scoring.
   * Defaults to `Date.now()` if not provided.
   */
  readonly referenceTimeMs?: number;
}

/**
 * A single ranked item produced by the context ranker.
 */
export interface RankedItem {
  /** Path relative to vault root (vault notes) or project root (source). */
  readonly path: string;

  /** Kind of the ranked item. */
  readonly kind: 'vault_note' | 'source_file';

  /**
   * Final score, the sum of all weighted scoring components.
   */
  readonly score: number;

  /**
   * Human-readable reasons explaining the score.  Each reason maps to one
   * scoring component.  Must be present for every component that
   * contributed a non-zero value.
   */
  readonly reasons: readonly string[];

  /**
   * Suggested rendering mode for this item.
   *
   * - `full`: include the full content (small notes, direct targets).
   * - `excerpt`: include a bounded excerpt (most notes).
   * - `stub`: include an interface skeleton (source files).
   */
  readonly renderMode: 'full' | 'excerpt' | 'stub';

  /** Estimated token count for this item (chars / 4). */
  readonly estimatedTokens: number;
}

/**
 * Result of a ranking pass.
 */
export interface ContextRankingResult {
  /** Ranked items, ordered by descending score with deterministic tie-breaking. */
  readonly items: readonly RankedItem[];

  /** Total estimated tokens across all included items. */
  readonly totalEstimatedTokens: number;

  /** Number of candidates that were pruned (token budget or min score). */
  readonly prunedCount: number;
}

// ---------------------------------------------------------------------------
// Scoring constants (tunable; must stay visible and testable)
// ---------------------------------------------------------------------------

const SCORE_DIRECT_TARGET = 8.0;
const SCORE_EXPLICITLY_LINKED_FROM_ROOT = 6.0;
const SCORE_ACTIVE_SESSION_OR_STEP = 5.0;
const SCORE_SAME_PHASE = 4.0;
const SCORE_CODE_SYMBOL_MATCH = 4.0;
const SCORE_DEPENDENCY_EDGE = 3.5;
const SCORE_CHANGED_IN_GIT_DIFF = 3.0;
const SCORE_RECIPROCAL_GRAPH_DISTANCE_MAX = 2.0;
const SCORE_RECENCY_BOOST = 1.5;
const SCORE_STATUS_PRIORITY = 1.0;
const SCORE_STALE_INDEX_PENALTY = 3.0;
const SCORE_GENERATED_OR_VENDOR_PENALTY = 4.0;

const RECENCY_ONE_HOUR_MS = 3600_000;
const RECENCY_ONE_DAY_MS = 86_400_000;

// Status priority mapping
const STATUS_PRIORITY_SCORES: Readonly<Record<string, number>> = Object.freeze({
  active: SCORE_STATUS_PRIORITY,
  'in-progress': SCORE_STATUS_PRIORITY * 0.5,
  planned: SCORE_STATUS_PRIORITY * 0.25,
});

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

const estimateTokens = (chars: number): number => Math.max(1, Math.ceil(chars / 4));

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

const isDirectTarget = (
  candidate: VaultNoteCandidate | SourceFileCandidate,
  input: ContextRankingInput,
): boolean => {
  if ('canonicalTarget' in candidate) {
    return (
      candidate.canonicalTarget === input.rootNoteCanonicalTarget ||
      candidate.canonicalTarget === input.activeStepCanonicalTarget ||
      candidate.canonicalTarget === input.activePhaseCanonicalTarget
    );
  }
  // Source file: direct target if it matches the active file from git diff
  return input.changedFiles?.includes(candidate.path) ?? false;
};

const isExplicitlyLinkedFromRoot = (
  candidate: VaultNoteCandidate,
  input: ContextRankingInput,
): boolean => {
  const link = input.explicitLinksFromRoot.find(
    (target) => target === candidate.canonicalTarget,
  );
  return link !== undefined;
};

const isActiveSessionOrStep = (
  candidate: VaultNoteCandidate,
  input: ContextRankingInput,
): boolean => {
  return (
    candidate.canonicalTarget === input.activeStepCanonicalTarget ||
    candidate.noteType === 'session'
  );
};

const isSamePhase = (
  candidate: VaultNoteCandidate,
  input: ContextRankingInput,
): boolean => {
  if (!input.activePhaseCanonicalTarget) return false;
  // Extract the phase directory prefix from the active phase canonical target.
  // E.g. "02_Phases/Phase_04_context_compiler_and_token_efficiency/Phase"
  //   → "02_Phases/Phase_04_context_compiler_and_token_efficiency"
  const activePhaseParts = input.activePhaseCanonicalTarget.split('/');
  const activePhaseDir = activePhaseParts.slice(0, 2).join('/');
  // Check if the candidate's relative path starts with the same phase directory.
  const candidateParts = candidate.relativePath.split('/');
  const candidateDir = candidateParts.slice(0, 2).join('/');
  return candidateDir === activePhaseDir;
};

const hasCodeSymbolMatch = (
  candidate: SourceFileCandidate,
  input: ContextRankingInput,
): boolean => {
  if (!input.taskText) return false;
  const taskWords = input.taskText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const pathLower = candidate.path.toLowerCase();
  return taskWords.some((word) => pathLower.includes(word));
};

const hasDependencyEdge = (
  candidate: VaultNoteCandidate | SourceFileCandidate,
  input: ContextRankingInput,
): boolean => {
  if (!input.dependencyEdges) return false;
  const key = 'canonicalTarget' in candidate ? candidate.canonicalTarget : candidate.path;
  const deps = input.dependencyEdges.get(key);
  return deps !== undefined && deps.length > 0;
};

const isChangedInGitDiff = (
  candidate: VaultNoteCandidate | SourceFileCandidate,
  input: ContextRankingInput,
): boolean => {
  if (!input.changedFiles) return false;
  const path = 'canonicalTarget' in candidate ? candidate.relativePath : candidate.path;
  return input.changedFiles.includes(path);
};

const reciprocalGraphDistanceScore = (
  candidate: VaultNoteCandidate | SourceFileCandidate,
  input: ContextRankingInput,
): number => {
  const key = 'canonicalTarget' in candidate ? candidate.canonicalTarget : candidate.path;
  const distance = input.graphDistances.get(key);
  if (distance === undefined || distance < 0) return 0;
  return SCORE_RECIPROCAL_GRAPH_DISTANCE_MAX / (distance + 1);
};

const recencyBoost = (candidate: VaultNoteCandidate, referenceTimeMs: number): number => {
  const ageMs = referenceTimeMs - candidate.mtimeMs;
  if (ageMs <= RECENCY_ONE_HOUR_MS) return SCORE_RECENCY_BOOST;
  if (ageMs <= RECENCY_ONE_DAY_MS) return SCORE_RECENCY_BOOST * 0.5;
  return 0;
};

const statusPriorityScore = (status?: string): number => {
  return status ? (STATUS_PRIORITY_SCORES[status] ?? 0) : 0;
};

const hasStaleIndexPenalty = (input: ContextRankingInput): boolean => {
  return input.codeGraphStale ?? false;
};

const hasGeneratedOrVendorPenalty = (candidate: SourceFileCandidate): boolean => {
  return candidate.isGenerated === true || candidate.isVendor === true;
};

// ---------------------------------------------------------------------------
// Render mode selection
// ---------------------------------------------------------------------------

const determineRenderMode = (
  candidate: VaultNoteCandidate | SourceFileCandidate,
  input: ContextRankingInput,
): 'full' | 'excerpt' | 'stub' => {
  if ('canonicalTarget' in candidate) {
    // Vault notes: full for direct targets, excerpt otherwise
    if (isDirectTarget(candidate, input)) return 'full';
    return 'excerpt';
  }
  return 'stub';
};

// ---------------------------------------------------------------------------
// Scoring a vault-note candidate
// ---------------------------------------------------------------------------

const scoreVaultCandidate = (
  candidate: VaultNoteCandidate,
  input: ContextRankingInput,
  referenceTimeMs: number,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;

  // 8.0 * isDirectTarget
  if (isDirectTarget(candidate, input)) {
    score += SCORE_DIRECT_TARGET;
    reasons.push('direct target');
  }

  // 6.0 * isExplicitlyLinkedFromRoot
  if (isExplicitlyLinkedFromRoot(candidate, input)) {
    score += SCORE_EXPLICITLY_LINKED_FROM_ROOT;
    reasons.push('explicitly linked from root');
  }

  // 5.0 * isActiveSessionOrStep
  if (isActiveSessionOrStep(candidate, input)) {
    score += SCORE_ACTIVE_SESSION_OR_STEP;
    reasons.push('active session or step');
  }

  // 4.0 * samePhase
  if (isSamePhase(candidate, input)) {
    score += SCORE_SAME_PHASE;
    reasons.push('same phase');
  }

  // 3.5 * dependencyEdge
  if (hasDependencyEdge(candidate, input)) {
    score += SCORE_DEPENDENCY_EDGE;
    reasons.push('dependency edge');
  }

  // 3.0 * changedInGitDiff
  if (isChangedInGitDiff(candidate, input)) {
    score += SCORE_CHANGED_IN_GIT_DIFF;
    reasons.push('changed in git diff');
  }

  // 2.0 * reciprocalGraphDistance
  const graphDistScore = reciprocalGraphDistanceScore(candidate, input);
  if (graphDistScore > 0) {
    score += graphDistScore;
    const distance = input.graphDistances.get(candidate.canonicalTarget) ?? 0;
    reasons.push(`graph distance=${distance}`);
  }

  // 1.5 * recencyBoost
  const recency = recencyBoost(candidate, referenceTimeMs);
  if (recency > 0) {
    score += recency;
    reasons.push('recency boost');
  }

  // 1.0 * statusPriority
  const statusScore = statusPriorityScore(candidate.status);
  if (statusScore > 0) {
    score += statusScore;
    reasons.push(`status=${candidate.status}`);
  }

  return { score, reasons };
};

// ---------------------------------------------------------------------------
// Scoring a source-file candidate
// ---------------------------------------------------------------------------

const scoreSourceCandidate = (
  candidate: SourceFileCandidate,
  input: ContextRankingInput,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;

  // 8.0 * isDirectTarget
  if (isDirectTarget(candidate, input)) {
    score += SCORE_DIRECT_TARGET;
    reasons.push('direct target');
  }

  // 4.0 * codeSymbolMatch
  if (hasCodeSymbolMatch(candidate, input)) {
    score += SCORE_CODE_SYMBOL_MATCH;
    reasons.push('code symbol match');
  }

  // 3.5 * dependencyEdge
  if (hasDependencyEdge(candidate, input)) {
    score += SCORE_DEPENDENCY_EDGE;
    reasons.push('dependency edge');
  }

  // 3.0 * changedInGitDiff
  if (isChangedInGitDiff(candidate, input)) {
    score += SCORE_CHANGED_IN_GIT_DIFF;
    reasons.push('changed in git diff');
  }

  // 2.0 * reciprocalGraphDistance (for source files, use path as key)
  const graphDistScore = reciprocalGraphDistanceScore(candidate, input);
  if (graphDistScore > 0) {
    score += graphDistScore;
    const distance = input.graphDistances.get(candidate.path) ?? 0;
    reasons.push(`graph distance=${distance}`);
  }

  // -3.0 * staleIndexPenalty
  if (hasStaleIndexPenalty(input)) {
    score -= SCORE_STALE_INDEX_PENALTY;
    reasons.push('stale index penalty');
  }

  // -4.0 * generatedOrVendorPenalty
  if (hasGeneratedOrVendorPenalty(candidate)) {
    score -= SCORE_GENERATED_OR_VENDOR_PENALTY;
    reasons.push('generated or vendor penalty');
  }

  return { score, reasons };
};

// ---------------------------------------------------------------------------
// Main ranking function
// ---------------------------------------------------------------------------

/**
 * Rank vault-note and source-file candidates deterministically against task
 * signals, returning scored, ordered results with explainable reasons.
 *
 * Same inputs always produce the same scores and the same ordering.
 * No embeddings, GPUs, network calls, or model availability requirements.
 */
export const rankContextCandidates = (input: ContextRankingInput): ContextRankingResult => {
  const {
    vaultCandidates,
    sourceCandidates,
    tokenBudget,
    minRelevanceScore,
  } = input;

  const referenceTimeMs = input.referenceTimeMs ?? Date.now();

  // Score all vault-note candidates
  const scoredVaultItems: RankedItem[] = vaultCandidates.map((candidate) => {
    const { score, reasons } = scoreVaultCandidate(candidate, input, referenceTimeMs);
    const renderMode = determineRenderMode(candidate, input);
    const estimatedTokens =
      candidate.estimatedTokens > 0
        ? candidate.estimatedTokens
        : estimateTokens(candidate.title.length + (candidate.noteType?.length ?? 0) + (candidate.status?.length ?? 0));

    return {
      path: candidate.relativePath,
      kind: 'vault_note' as const,
      score,
      reasons,
      renderMode,
      estimatedTokens,
    };
  });

  // Score all source-file candidates
  const scoredSourceItems: RankedItem[] = sourceCandidates.map((candidate) => {
    const { score, reasons } = scoreSourceCandidate(candidate, input);
    const renderMode = 'stub' as const;
    const estimatedTokens =
      candidate.estimatedTokens > 0
        ? candidate.estimatedTokens
        : estimateTokens(candidate.path.length);

    return {
      path: candidate.path,
      kind: 'source_file' as const,
      score,
      reasons,
      renderMode,
      estimatedTokens,
    };
  });

  // Combine and sort: descending score, then deterministic path tiebreak
  const allItems: RankedItem[] = [...scoredVaultItems, ...scoredSourceItems].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.path.localeCompare(b.path);
  });

  // Identify mandatory items (explicitly linked from root, active step/session,
  // direct targets, or same phase) — these are never pruned regardless of score.
  const mandatoryPaths = new Set<string>();
  for (const item of scoredVaultItems) {
    const candidate = vaultCandidates.find(
      (c) => c.relativePath === item.path,
    );
    if (!candidate) continue;

    if (isDirectTarget(candidate, input)) {
      mandatoryPaths.add(item.path);
    }
    if (isExplicitlyLinkedFromRoot(candidate, input)) {
      mandatoryPaths.add(item.path);
    }
    if (isActiveSessionOrStep(candidate, input)) {
      mandatoryPaths.add(item.path);
    }
    if (isSamePhase(candidate, input)) {
      mandatoryPaths.add(item.path);
    }
  }

  // Prune by minimum relevance score first (non-mandatory only)
  // Only prune if minRelevanceScore is explicitly set
  const afterMinScore = minRelevanceScore !== undefined
    ? allItems.filter((item) => {
        if (mandatoryPaths.has(item.path)) return true;
        return item.score >= minRelevanceScore;
      })
    : allItems;

  let prunedCount = allItems.length - afterMinScore.length;

  // Prune by token budget: walk top-scored items, drop lowest-scored when budget
  // is exceeded.  Do not discard a fixed bottom percentage.
  if (tokenBudget !== undefined && tokenBudget > 0) {
    const included: RankedItem[] = [];
    let remainingBudget = tokenBudget;

    for (const item of afterMinScore) {
      if (remainingBudget <= 0 && !mandatoryPaths.has(item.path)) {
        prunedCount++;
        continue;
      }

      if (item.estimatedTokens <= remainingBudget || mandatoryPaths.has(item.path)) {
        included.push(item);
        remainingBudget -= item.estimatedTokens;
      } else {
        // If even a mandatory item would exceed budget, include it but note it
        if (!mandatoryPaths.has(item.path)) {
          prunedCount++;
        } else {
          included.push(item);
        }
      }
    }

    return {
      items: included,
      totalEstimatedTokens: included.reduce((sum, item) => sum + item.estimatedTokens, 0),
      prunedCount,
    };
  }

  const totalEstimatedTokens = afterMinScore.reduce(
    (sum, item) => sum + item.estimatedTokens,
    0,
  );

  return {
    items: afterMinScore,
    totalEstimatedTokens,
    prunedCount,
  };
};
