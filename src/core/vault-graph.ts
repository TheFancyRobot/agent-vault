import { execFile as execFileCallback } from 'child_process';
import { createHash } from 'crypto';
import { encode } from '@toon-format/toon';
import { basename, dirname, join } from 'path';
import { promisify } from 'util';
import { parseYamlFrontmatter } from './note-mutations';
import { readUtf8File, scanVaultMarkdownFiles, type VaultFileRecord } from './vault-files';

const execFile = promisify(execFileCallback);

const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const HEADING_PATTERN = /^( {0,3})#{1,6}[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?[ \t]*$/m;
const ROOT_CONTENT_EXCERPT_LIMIT = 4000;
const CONTENT_EXCERPT_LIMIT = 2000;
const MIN_CONTENT_EXCERPT_LIMIT = 400;
const TOTAL_CONTENT_LIMIT = 24000;
const TRUNCATION_SUFFIX = '\n\n[truncated]';
const OBSIDIAN_TIMEOUT_MS = 5000;

export type VaultGraphResolver = 'filesystem' | 'obsidian';
export type VaultTraverseDirection = 'outgoing' | 'incoming' | 'both';

export interface VaultGraphNode {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly canonicalTarget: string;
  readonly title: string;
  readonly noteType?: string;
  readonly status?: string;
  readonly updated?: string;
  readonly mtimeMs: number;
  readonly frontmatter: Record<string, unknown>;
  readonly content: string;
  outgoingLinks: string[];
  incomingLinks: string[];
}

export interface VaultGraph {
  readonly vaultRoot: string;
  readonly resolver: VaultGraphResolver;
  readonly nodes: VaultGraphNode[];
  readonly nodesByCanonicalTarget: Map<string, VaultGraphNode>;
  readonly signature: string;
}

export interface VaultTraverseParams {
  readonly root: string;
  readonly depth: number;
  readonly direction: VaultTraverseDirection;
  readonly includeContent?: boolean;
  readonly noteTypes?: readonly string[];
  readonly statuses?: readonly string[];
  readonly maxNotes?: number;
  readonly resolver?: VaultGraphResolver;
}

export interface VaultTraverseResultNode {
  readonly path: string;
  readonly title: string;
  readonly noteType?: string;
  readonly status?: string;
  readonly updated?: string;
  readonly content?: string;
}

export interface VaultTraverseResultEdge {
  readonly from: string;
  readonly to: string;
}

export interface VaultTraverseResult {
  readonly meta: {
    readonly root: string;
    readonly depth: number;
    readonly direction: VaultTraverseDirection;
    readonly resolverRequested: VaultGraphResolver;
    readonly resolverUsed: VaultGraphResolver;
    readonly totalNotes: number;
    readonly truncated: boolean;
    readonly warnings: string[];
    readonly noteTypes?: readonly string[];
    readonly statuses?: readonly string[];
  };
  readonly notes: VaultTraverseResultNode[];
  readonly edges: VaultTraverseResultEdge[];
}

interface CachedVaultGraph {
  readonly signature: string;
  readonly graph: VaultGraph;
}

interface ParsedVaultNote {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly canonicalTarget: string;
  readonly mtimeMs: number;
  readonly content: string;
  readonly frontmatter: Record<string, unknown>;
  readonly title: string;
  readonly noteType?: string;
  readonly status?: string;
  readonly updated?: string;
}

const GRAPH_CACHE_MAX_SIZE = 4;
const graphCache = new Map<string, CachedVaultGraph>();

const setGraphCache = (key: string, value: CachedVaultGraph): void => {
  graphCache.delete(key);
  if (graphCache.size >= GRAPH_CACHE_MAX_SIZE) {
    const oldest = graphCache.keys().next().value;
    if (oldest !== undefined) {
      graphCache.delete(oldest);
    }
  }
  graphCache.set(key, value);
};

const normalizePathLikeValue = (value: string): string => value.replace(/\\/g, '/').replace(/\.md$/i, '');

const getCanonicalTarget = (relativePath: string): string => normalizePathLikeValue(relativePath);

const parseOptionalString = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractTitle = (content: string, frontmatter: Record<string, unknown>, relativePath: string): string => {
  const frontmatterTitle = parseOptionalString(frontmatter.title);
  if (frontmatterTitle) {
    return frontmatterTitle;
  }

  const headingMatch = HEADING_PATTERN.exec(content);
  if (headingMatch) {
    return headingMatch[2].trim();
  }

  return basename(relativePath, '.md');
};

const normalizeLinkTarget = (currentRelativePath: string, rawTarget: string): string | undefined => {
  const withoutAlias = rawTarget.split('|')[0]?.trim() ?? '';
  const withoutHeading = withoutAlias.split('#')[0]?.trim() ?? '';
  if (withoutHeading.length === 0) {
    return undefined;
  }

  if (withoutHeading.includes('<') || withoutHeading.includes('>')) {
    return undefined;
  }

  if (/^(?:https?:|mailto:|obsidian:|file:)/i.test(withoutHeading) || withoutHeading.startsWith('#')) {
    return undefined;
  }

  if (withoutHeading.startsWith('./') || withoutHeading.startsWith('../')) {
    return normalizePathLikeValue(join(dirname(currentRelativePath), withoutHeading));
  }

  return normalizePathLikeValue(withoutHeading);
};

export const collectLinks = (relativePath: string, content: string): ReadonlySet<string> => {
  const links = new Set<string>();
  const currentCanonicalTarget = getCanonicalTarget(relativePath);
  const addTarget = (rawTarget: string): void => {
    const normalized = normalizeLinkTarget(relativePath, rawTarget);
    if (!normalized || normalized === currentCanonicalTarget) {
      return;
    }
    links.add(normalized);
  };

  WIKI_LINK_PATTERN.lastIndex = 0;
  for (const match of content.matchAll(WIKI_LINK_PATTERN)) {
    addTarget(match[1]);
  }

  MARKDOWN_LINK_PATTERN.lastIndex = 0;
  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    addTarget(match[1]);
  }

  return links;
};

const loadParsedVaultNotes = async (files: readonly VaultFileRecord[]): Promise<ParsedVaultNote[]> =>
  Promise.all(files.map(async (file) => {
    const content = await readUtf8File(file.absolutePath);
    let frontmatter: Record<string, unknown> = {};

    try {
      frontmatter = parseYamlFrontmatter(content, file.relativePath).data;
    } catch {
      frontmatter = {};
    }

    return {
      absolutePath: file.absolutePath,
      relativePath: file.relativePath,
      canonicalTarget: getCanonicalTarget(file.relativePath),
      mtimeMs: file.mtimeMs,
      content,
      frontmatter,
      title: extractTitle(content, frontmatter, file.relativePath),
      noteType: parseOptionalString(frontmatter.note_type),
      status: parseOptionalString(frontmatter.status),
      updated: parseOptionalString(frontmatter.updated),
    } satisfies ParsedVaultNote;
  }));

const buildSignature = (files: readonly VaultFileRecord[]): string => {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(`${file.relativePath}:${file.mtimeMs}\n`);
  }
  return hash.digest('hex');
};

const extractObsidianPaths = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractObsidianPaths(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const directPath = typeof record.path === 'string' ? [record.path] : [];
    const directFile = typeof record.file === 'string' ? [record.file] : [];
    const directName = typeof record.name === 'string' ? [record.name] : [];

    return [
      ...directPath,
      ...directFile,
      ...directName,
      ...Object.values(record).flatMap((item) => extractObsidianPaths(item)),
    ];
  }

  return [];
};

const readObsidianCliLinks = async (
  vaultRoot: string,
  relativePath: string,
  command: 'links' | 'backlinks',
): Promise<string[]> => {
  const { stdout } = await execFile('obsidian', [command, `path=${relativePath}`, 'format=json'], {
    cwd: vaultRoot,
    timeout: OBSIDIAN_TIMEOUT_MS,
  });

  const parsed = JSON.parse(stdout.trim() || '[]') as unknown;
  return [...new Set(extractObsidianPaths(parsed).map((entry) => normalizePathLikeValue(entry)).filter(Boolean))];
};

const buildFilesystemGraph = (vaultRoot: string, notes: readonly ParsedVaultNote[], signature: string): VaultGraph => {
  const canonicalTargets = new Set(notes.map((note) => note.canonicalTarget));
  const nodes = notes.map((note) => ({
    absolutePath: note.absolutePath,
    relativePath: note.relativePath,
    canonicalTarget: note.canonicalTarget,
    title: note.title,
    noteType: note.noteType,
    status: note.status,
    updated: note.updated,
    mtimeMs: note.mtimeMs,
    frontmatter: note.frontmatter,
    content: note.content,
    outgoingLinks: [...collectLinks(note.relativePath, note.content)].filter((target) => canonicalTargets.has(target)).sort(),
    incomingLinks: [] as string[],
  } satisfies VaultGraphNode));

  const nodesByCanonicalTarget = new Map(nodes.map((node) => [node.canonicalTarget, node]));
  for (const node of nodes) {
    for (const target of node.outgoingLinks) {
      const destination = nodesByCanonicalTarget.get(target);
      if (!destination) {
        continue;
      }
      destination.incomingLinks.push(node.canonicalTarget);
    }
  }

  for (const node of nodes) {
    node.incomingLinks.sort();
  }

  return {
    vaultRoot,
    resolver: 'filesystem',
    nodes,
    nodesByCanonicalTarget,
    signature,
  };
};

const buildObsidianGraph = async (vaultRoot: string, notes: readonly ParsedVaultNote[], signature: string): Promise<VaultGraph> => {
  const canonicalTargets = new Set(notes.map((note) => note.canonicalTarget));
  const nodes = notes.map((note) => ({
    absolutePath: note.absolutePath,
    relativePath: note.relativePath,
    canonicalTarget: note.canonicalTarget,
    title: note.title,
    noteType: note.noteType,
    status: note.status,
    updated: note.updated,
    mtimeMs: note.mtimeMs,
    frontmatter: note.frontmatter,
    content: note.content,
    outgoingLinks: [] as string[],
    incomingLinks: [] as string[],
  } satisfies VaultGraphNode));

  const nodesByCanonicalTarget = new Map(nodes.map((node) => [node.canonicalTarget, node]));

  await Promise.all(nodes.map(async (node) => {
    const [outgoing, incoming] = await Promise.all([
      readObsidianCliLinks(vaultRoot, node.relativePath, 'links'),
      readObsidianCliLinks(vaultRoot, node.relativePath, 'backlinks'),
    ]);

    node.outgoingLinks = outgoing.filter((target) => canonicalTargets.has(target) && target !== node.canonicalTarget).sort();
    node.incomingLinks = incoming.filter((target) => canonicalTargets.has(target) && target !== node.canonicalTarget).sort();
  }));

  for (const node of nodes) {
    if (node.incomingLinks.length > 0) {
      continue;
    }

    for (const source of nodes) {
      if (source.outgoingLinks.includes(node.canonicalTarget)) {
        node.incomingLinks.push(source.canonicalTarget);
      }
    }

    node.incomingLinks.sort();
  }

  return {
    vaultRoot,
    resolver: 'obsidian',
    nodes,
    nodesByCanonicalTarget,
    signature,
  };
};

export const invalidateVaultGraphCache = (vaultRoot?: string): void => {
  if (vaultRoot) {
    graphCache.delete(`${vaultRoot}:filesystem`);
    graphCache.delete(`${vaultRoot}:obsidian`);
    return;
  }
  graphCache.clear();
};

export const ensureVaultGraph = async (
  vaultRoot: string,
  resolver: VaultGraphResolver = 'filesystem',
): Promise<{ graph: VaultGraph; warnings: string[] }> => {
  const files = await scanVaultMarkdownFiles(vaultRoot);
  const signature = buildSignature(files);
  const cacheKey = `${vaultRoot}:${resolver}`;
  const cached = graphCache.get(cacheKey);
  if (cached && cached.signature === signature) {
    return { graph: cached.graph, warnings: [] };
  }

  const parsedNotes = await loadParsedVaultNotes(files);

  if (resolver === 'obsidian') {
    try {
      const graph = await buildObsidianGraph(vaultRoot, parsedNotes, signature);
      setGraphCache(cacheKey, { signature, graph });
      return { graph, warnings: [] };
    } catch (error) {
      const fallbackGraph = buildFilesystemGraph(vaultRoot, parsedNotes, signature);
      setGraphCache(`${vaultRoot}:filesystem`, { signature, graph: fallbackGraph });
      return {
        graph: fallbackGraph,
        warnings: [
          `Obsidian CLI resolver failed, falling back to filesystem links: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  const graph = buildFilesystemGraph(vaultRoot, parsedNotes, signature);
  setGraphCache(cacheKey, { signature, graph });
  return { graph, warnings: [] };
};

const resolveTraversalRoot = (graph: VaultGraph, input: string): VaultGraphNode | undefined => {
  const normalizedInput = normalizePathLikeValue(input.trim().replace(/^\.\//, ''));
  if (normalizedInput.length === 0) {
    return undefined;
  }

  const exactMatch = graph.nodesByCanonicalTarget.get(normalizedInput);
  if (exactMatch) {
    return exactMatch;
  }

  const basenameMatches = graph.nodes.filter((node) => basename(node.canonicalTarget) === basename(normalizedInput));
  if (basenameMatches.length === 1) {
    return basenameMatches[0];
  }

  return undefined;
};

const normalizeFilterValues = (values: readonly string[] | undefined): Set<string> | null => {
  if (!values || values.length === 0) {
    return null;
  }

  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? new Set(normalized) : null;
};

const getTraversalNeighbors = (node: VaultGraphNode, direction: VaultTraverseDirection): string[] => {
  const neighborTargets = new Set<string>();
  if (direction === 'outgoing' || direction === 'both') {
    for (const target of node.outgoingLinks) {
      neighborTargets.add(target);
    }
  }
  if (direction === 'incoming' || direction === 'both') {
    for (const target of node.incomingLinks) {
      neighborTargets.add(target);
    }
  }
  return [...neighborTargets];
};

const nodeMatchesFilters = (
  node: VaultGraphNode,
  noteTypeFilter: Set<string> | null,
  statusFilter: Set<string> | null,
): boolean => {
  if (noteTypeFilter && !noteTypeFilter.has((node.noteType ?? '').toLowerCase())) {
    return false;
  }

  if (statusFilter && !statusFilter.has((node.status ?? '').toLowerCase())) {
    return false;
  }

  return true;
};

const excerptContent = (content: string, limit: number): { excerpt: string; truncated: boolean } => {
  if (content.length <= limit) {
    return { excerpt: content, truncated: false };
  }

  if (limit <= TRUNCATION_SUFFIX.length) {
    return {
      excerpt: TRUNCATION_SUFFIX.slice(0, limit),
      truncated: true,
    };
  }

  return {
    excerpt: `${content.slice(0, limit - TRUNCATION_SUFFIX.length)}${TRUNCATION_SUFFIX}`,
    truncated: true,
  };
};

const allocateContentExcerpts = (
  nodes: readonly VaultGraphNode[],
  rootTarget: string,
  discoveredDepths: ReadonlyMap<string, number>,
): { contentByTarget: Map<string, string>; truncated: boolean } => {
  const prioritizedNodes = [...nodes].sort((left, right) => {
    const leftRootRank = left.canonicalTarget === rootTarget ? 0 : 1;
    const rightRootRank = right.canonicalTarget === rootTarget ? 0 : 1;
    if (leftRootRank !== rightRootRank) {
      return leftRootRank - rightRootRank;
    }

    const leftDepth = discoveredDepths.get(left.canonicalTarget) ?? Number.POSITIVE_INFINITY;
    const rightDepth = discoveredDepths.get(right.canonicalTarget) ?? Number.POSITIVE_INFINITY;
    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return left.relativePath.localeCompare(right.relativePath);
  });

  const contentByTarget = new Map<string, string>();
  let contentBudgetRemaining = TOTAL_CONTENT_LIMIT;
  let truncated = false;

  prioritizedNodes.forEach((node, index) => {
    if (contentBudgetRemaining <= 0) {
      truncated = true;
      return;
    }

    const remainingNodes = prioritizedNodes.length - index;
    const fairShare = Math.max(MIN_CONTENT_EXCERPT_LIMIT, Math.floor(contentBudgetRemaining / remainingNodes));
    const perNodeLimit = Math.min(
      node.canonicalTarget === rootTarget ? ROOT_CONTENT_EXCERPT_LIMIT : CONTENT_EXCERPT_LIMIT,
      fairShare,
      contentBudgetRemaining,
    );

    const excerpt = excerptContent(node.content, perNodeLimit);
    if (excerpt.truncated) {
      truncated = true;
    }

    contentByTarget.set(node.canonicalTarget, excerpt.excerpt);
    contentBudgetRemaining -= excerpt.excerpt.length;
  });

  return { contentByTarget, truncated };
};

export const traverseVaultGraph = (graph: VaultGraph, params: VaultTraverseParams, warnings: string[] = []): VaultTraverseResult => {
  const rootNode = resolveTraversalRoot(graph, params.root);
  if (!rootNode) {
    throw new Error(`Could not resolve traversal root: ${params.root}`);
  }

  const maxNotes = Math.max(1, params.maxNotes ?? 500);
  const noteTypeFilter = normalizeFilterValues(params.noteTypes);
  const statusFilter = normalizeFilterValues(params.statuses);
  const filtersActive = noteTypeFilter !== null || statusFilter !== null;
  const visited = new Set<string>([rootNode.canonicalTarget]);
  const included = new Set<string>([rootNode.canonicalTarget]);
  const discoveredDepths = new Map<string, number>([[rootNode.canonicalTarget, 0]]);
  const queue: Array<{ target: string; depth: number }> = [{ target: rootNode.canonicalTarget, depth: 0 }];
  const matchMemo = new Map<string, boolean>();
  let truncated = false;

  const canReachIncludedNode = (target: string, remainingDepth: number, activeKeys = new Set<string>()): boolean => {
    const memoKey = `${target}:${remainingDepth}`;
    const memoized = matchMemo.get(memoKey);
    if (memoized !== undefined) {
      return memoized;
    }

    const node = graph.nodesByCanonicalTarget.get(target);
    if (!node) {
      matchMemo.set(memoKey, false);
      return false;
    }

    if (nodeMatchesFilters(node, noteTypeFilter, statusFilter)) {
      matchMemo.set(memoKey, true);
      return true;
    }

    if (remainingDepth <= 0) {
      matchMemo.set(memoKey, false);
      return false;
    }

    activeKeys.add(memoKey);
    for (const neighbor of getTraversalNeighbors(node, params.direction)) {
      const childKey = `${neighbor}:${remainingDepth - 1}`;
      if (activeKeys.has(childKey)) {
        continue;
      }

      if (canReachIncludedNode(neighbor, remainingDepth - 1, activeKeys)) {
        activeKeys.delete(memoKey);
        matchMemo.set(memoKey, true);
        return true;
      }
    }

    activeKeys.delete(memoKey);
    matchMemo.set(memoKey, false);
    return false;
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.depth >= params.depth) {
      continue;
    }

    const node = graph.nodesByCanonicalTarget.get(current.target);
    if (!node) {
      continue;
    }

    for (const target of getTraversalNeighbors(node, params.direction)) {
      if (visited.has(target)) {
        continue;
      }

      const nextDepth = current.depth + 1;
      const remainingDepth = params.depth - nextDepth;
      const candidate = graph.nodesByCanonicalTarget.get(target);
      if (!candidate) {
        visited.add(target);
        continue;
      }

      if (filtersActive && !canReachIncludedNode(target, remainingDepth)) {
        visited.add(target);
        continue;
      }

      visited.add(target);
      queue.push({ target, depth: nextDepth });

      if (!nodeMatchesFilters(candidate, noteTypeFilter, statusFilter)) {
        continue;
      }

      if (included.size >= maxNotes) {
        truncated = true;
        continue;
      }

      included.add(target);
      discoveredDepths.set(target, nextDepth);
    }
  }

  const filteredNodes = [...included]
    .map((target) => graph.nodesByCanonicalTarget.get(target))
    .filter((node): node is VaultGraphNode => Boolean(node))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const includedTargets = new Set(filteredNodes.map((node) => node.canonicalTarget));
  const contentByTarget = new Map<string, string>();
  if (params.includeContent) {
    const allocatedContent = allocateContentExcerpts(filteredNodes, rootNode.canonicalTarget, discoveredDepths);
    truncated ||= allocatedContent.truncated;
    for (const [target, content] of allocatedContent.contentByTarget.entries()) {
      contentByTarget.set(target, content);
    }
  }

  const notes = filteredNodes.map((node) => ({
    path: node.relativePath,
    title: node.title,
    noteType: node.noteType,
    status: node.status,
    updated: node.updated,
    ...(contentByTarget.has(node.canonicalTarget) ? { content: contentByTarget.get(node.canonicalTarget) } : {}),
  } satisfies VaultTraverseResultNode));

  const edges = filteredNodes.flatMap((node) => {
    const neighborTargets = getTraversalNeighbors(node, params.direction);

    return neighborTargets
      .filter((target) => includedTargets.has(target))
      .map((target) => ({ from: node.relativePath, to: graph.nodesByCanonicalTarget.get(target)?.relativePath ?? target }))
      .filter((edge) => typeof edge.to === 'string')
      .sort((left, right) => left.to.localeCompare(right.to));
  });

  return {
    meta: {
      root: rootNode.relativePath,
      depth: params.depth,
      direction: params.direction,
      resolverRequested: params.resolver ?? 'filesystem',
      resolverUsed: graph.resolver,
      totalNotes: notes.length,
      truncated,
      warnings,
      ...(noteTypeFilter ? { noteTypes: [...noteTypeFilter] } : {}),
      ...(statusFilter ? { statuses: [...statusFilter] } : {}),
    },
    notes,
    edges,
  };
};

export const formatVaultTraverseResultAsJson = (result: VaultTraverseResult): string =>
  JSON.stringify(result, null, 2);

export const formatVaultTraverseResultAsToon = (result: VaultTraverseResult): string =>
  encode(result, { delimiter: '\t', keyFolding: 'safe' });
