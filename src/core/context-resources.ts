import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { extname, isAbsolute, relative, resolve } from 'path';
import type { ListResourcesResult, ReadResourceResult, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { CodeGraphIndexV3, FileSymbolsV3 } from '../scaffold/code-graph';
import { loadCodeGraphIndex } from './code-graph-lookup';
import { readStubManifest, resolveStubPath, type StubManifestEntry } from '../scaffold/code-stubs';
import { assertWithinVaultRoot, resolveVaultRelativePath } from './vault-files';

const STUBS_DIR = 'code-stubs';
const MAX_EXCERPT_LINES = 80;

export type ContextResourceKind = 'note' | 'code-stub' | 'code-summary' | 'code-excerpt';

export interface ParsedContextResourceUri {
  readonly kind: ContextResourceKind;
  readonly path: string;
  readonly fragment?: string;
}

export const buildContextResourceUri = (
  kind: ContextResourceKind,
  resourcePath: string,
  fragment?: string,
): string => {
  const encodedPath = resourcePath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const suffix = fragment ? `#${encodeURIComponent(fragment)}` : '';
  return `vault://${kind}/${encodedPath}${suffix}`;
};

const decodeUriComponentStrict = (value: string, label: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`Invalid ${label}: malformed percent encoding.`);
  }
};

const containsEncodedSeparator = (value: string): boolean => /%(?:2f|5c)/i.test(value);

const assertSafeRelativeResourcePath = (path: string): void => {
  if (!path || path.trim().length === 0) {
    throw new Error('Resource path is required.');
  }
  if (path.includes('\0')) {
    throw new Error('Resource path contains a NUL byte.');
  }
  if (path.includes('\\')) {
    throw new Error('Resource path must use forward slashes, not backslashes.');
  }
  if (isAbsolute(path) || path.startsWith('/')) {
    throw new Error(`Resource path must be relative: ${path}`);
  }
  const segments = path.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Resource path contains an unsafe segment: ${path}`);
  }
};

const SECRET_PATH_PATTERN = /(^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.pypirc$|id_rsa$|id_dsa$|id_ed25519$|.*(?:secret|secrets|credential|credentials|token|private-key).*)(\/|$)/i;

const assertNotSecretLikePath = (path: string): void => {
  if (SECRET_PATH_PATTERN.test(path)) {
    throw new Error(`Refusing to expose secret-like resource path: ${path}`);
  }
};

export const parseContextResourceUri = (uri: URL | string): ParsedContextResourceUri => {
  if (typeof uri === 'string') {
    const rawPathAndFragment = uri.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*\/?/i, '');
    const rawPathOnly = rawPathAndFragment.split('#', 1)[0];
    if (/(^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(rawPathOnly)) {
      throw new Error('Resource path contains an unsafe segment.');
    }
    if (containsEncodedSeparator(rawPathOnly)) {
      throw new Error('Resource path must not contain encoded path separators.');
    }
  }
  const url = typeof uri === 'string' ? new URL(uri) : uri;
  if (url.protocol !== 'vault:') {
    throw new Error(`Unsupported resource URI scheme: ${url.protocol}`);
  }

  const kind = url.hostname as ContextResourceKind;
  if (!['note', 'code-stub', 'code-summary', 'code-excerpt'].includes(kind)) {
    throw new Error(`Unsupported vault resource kind: ${url.hostname}`);
  }

  const rawPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  if (containsEncodedSeparator(rawPath)) {
    throw new Error('Resource path must not contain encoded path separators.');
  }
  const path = decodeUriComponentStrict(rawPath, 'resource path').replace(/\\/g, '/');
  assertSafeRelativeResourcePath(path);

  const fragment = url.hash.length > 0
    ? decodeUriComponentStrict(url.hash.slice(1), 'resource fragment')
    : undefined;

  return { kind, path, fragment };
};

const resolveExistingVaultFile = async (vaultRoot: string, notePath: string): Promise<string> => {
  assertSafeRelativeResourcePath(notePath);
  assertNotSecretLikePath(notePath);
  const absolutePath = resolveVaultRelativePath(vaultRoot, notePath);
  assertWithinVaultRoot(vaultRoot, absolutePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Vault note not found: ${notePath}`);
  }
  const realVaultRoot = await safeRealpath(vaultRoot);
  const realNotePath = await safeRealpath(absolutePath);
  assertWithinRoot(realVaultRoot, realNotePath, 'vault root');
  return absolutePath;
};

const safeRealpath = async (path: string): Promise<string> => {
  const { realpath } = await import('fs/promises');
  return realpath(path);
};

const resolveProjectPath = async (projectRoot: string, projectRelativePath: string): Promise<string> => {
  assertSafeRelativeResourcePath(projectRelativePath);
  assertNotSecretLikePath(projectRelativePath);
  const absolutePath = resolve(projectRoot, projectRelativePath);
  assertWithinRoot(resolve(projectRoot), absolutePath, 'project root');
  if (!existsSync(absolutePath)) {
    throw new Error(`Source file not found: ${projectRelativePath}`);
  }
  const realProjectRoot = await safeRealpath(projectRoot);
  const realPath = await safeRealpath(absolutePath);
  assertWithinRoot(realProjectRoot, realPath, 'project root');
  return absolutePath;
};

const assertWithinRoot = (root: string, absolutePath: string, label: string): void => {
  const rel = relative(resolve(root), resolve(absolutePath));
  if (rel.length > 0 && (rel.startsWith('..') || isAbsolute(rel))) {
    throw new Error(`Resolved path escapes the ${label}: ${absolutePath}`);
  }
};

const readCodeGraphV3 = async (vaultRoot: string): Promise<CodeGraphIndexV3> => {
  const index = await loadCodeGraphIndex(vaultRoot);
  if (index.version !== 3) {
    throw new Error('Code graph v3 is required for context resources. Run vault_refresh target=code_graph.');
  }
  return index;
};

const findCodeGraphFile = async (vaultRoot: string, sourcePath: string): Promise<FileSymbolsV3> => {
  const index = await readCodeGraphV3(vaultRoot);
  const file = index.files.find((candidate) => candidate.path === sourcePath);
  if (!file) {
    throw new Error(`Code graph has no entry for ${sourcePath}. Run vault_refresh target=code_graph.`);
  }
  if (file.generated || file.vendor) {
    throw new Error(`Refusing to expose generated/vendor source artifact: ${sourcePath}`);
  }
  return file;
};

const hashFile = async (absolutePath: string): Promise<string> => {
  const content = await readFile(absolutePath);
  return createHash('sha256').update(content).digest('hex');
};

const checkStubFreshness = async (
  projectRoot: string,
  entry: StubManifestEntry,
): Promise<{ stale: boolean; reasons: string[] }> => {
  const reasons: string[] = [];
  try {
    // The content hash is authoritative; mtime can drift on some filesystems
    // (rounding) without the source actually changing.
    const sourcePath = await resolveProjectPath(projectRoot, entry.path);
    const sha256 = await hashFile(sourcePath);
    if (sha256 !== entry.sha256) {
      reasons.push('source hash changed');
      const sourceStats = await stat(sourcePath);
      if (sourceStats.size !== entry.size) reasons.push('source size changed');
    }
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : String(error));
  }
  return { stale: reasons.length > 0, reasons };
};

const textResource = (
  uri: string,
  text: string,
  mimeType = 'text/plain',
  meta?: Record<string, unknown>,
): ReadResourceResult => ({
  contents: [{ uri, mimeType, text, _meta: meta }],
});

export async function readNoteResource(vaultRoot: string, uri: URL | string): Promise<ReadResourceResult> {
  const parsed = parseContextResourceUri(uri);
  if (parsed.kind !== 'note') throw new Error(`Expected vault://note resource, got ${parsed.kind}.`);
  if (parsed.fragment) throw new Error('vault://note resources do not support fragments; use vault://code-excerpt for symbol fragments.');
  if (extname(parsed.path).toLowerCase() !== '.md') {
    throw new Error(`vault://note resources only expose Markdown notes: ${parsed.path}`);
  }
  const absolutePath = await resolveExistingVaultFile(vaultRoot, parsed.path);
  const content = await readFile(absolutePath, 'utf-8');
  return textResource(buildContextResourceUri('note', parsed.path), content, 'text/markdown');
}

export async function readCodeStubResource(
  vaultRoot: string,
  projectRoot: string,
  uri: URL | string,
): Promise<ReadResourceResult> {
  const parsed = parseContextResourceUri(uri);
  if (parsed.kind !== 'code-stub') throw new Error(`Expected vault://code-stub resource, got ${parsed.kind}.`);
  if (parsed.fragment) throw new Error('vault://code-stub resources do not support fragments.');
  assertNotSecretLikePath(parsed.path);
  await resolveProjectPath(projectRoot, parsed.path);

  const manifest = await readStubManifest(vaultRoot);
  const entry = manifest?.entries.find((candidate) => candidate.path === parsed.path);
  if (!entry) {
    throw new Error(`Code stub not found for ${parsed.path}. Run vault_refresh target=code_stubs or vault_prepare_context to populate the cache.`);
  }

  const stubPath = resolveStubPath(vaultRoot, entry);
  if (!stubPath) {
    throw new Error(`Code stub artifact missing for ${parsed.path}. Run vault_refresh target=code_stubs or vault_prepare_context to repopulate the cache.`);
  }
  const absoluteStubPath = resolve(vaultRoot, STUBS_DIR, stubPath);
  assertWithinVaultRoot(vaultRoot, absoluteStubPath);
  const content = await readFile(absoluteStubPath, 'utf-8');
  const freshness = await checkStubFreshness(projectRoot, entry);
  const prefix = freshness.stale
    ? `// STALE CODE STUB: ${freshness.reasons.join('; ')}. Refresh hint: run vault_prepare_context or regenerate code stubs.\n\n`
    : '';

  return textResource(
    buildContextResourceUri('code-stub', parsed.path),
    `${prefix}${content}`,
    'text/typescript',
    freshness.stale ? { stale: true, refreshHint: 'Run vault_prepare_context or regenerate code stubs.', staleReasons: freshness.reasons } : undefined,
  );
}

export async function readCodeSummaryResource(
  vaultRoot: string,
  projectRoot: string,
  uri: URL | string,
): Promise<ReadResourceResult> {
  const parsed = parseContextResourceUri(uri);
  if (parsed.kind !== 'code-summary') throw new Error(`Expected vault://code-summary resource, got ${parsed.kind}.`);
  if (parsed.fragment) throw new Error('vault://code-summary resources do not support fragments.');
  await resolveProjectPath(projectRoot, parsed.path);
  const file = await findCodeGraphFile(vaultRoot, parsed.path);
  const text = JSON.stringify({
    path: file.path,
    language: file.language,
    parser: file.parser,
    size: file.size,
    mtimeMs: file.mtimeMs,
    hash: file.hash,
    symbols: file.symbols.map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      line: symbol.line,
      endLine: symbol.endLine,
      exported: symbol.exported,
      signature: symbol.signature,
      doc: symbol.doc,
      parentName: symbol.parentName,
    })),
    imports: file.imports ?? [],
    exports: file.exports ?? [],
  }, null, 2);
  return textResource(buildContextResourceUri('code-summary', parsed.path), text, 'application/json');
}

export async function readCodeExcerptResource(
  vaultRoot: string,
  projectRoot: string,
  uri: URL | string,
): Promise<ReadResourceResult> {
  const parsed = parseContextResourceUri(uri);
  if (parsed.kind !== 'code-excerpt') throw new Error(`Expected vault://code-excerpt resource, got ${parsed.kind}.`);
  if (!parsed.fragment) {
    throw new Error('vault://code-excerpt requires a #symbol fragment.');
  }
  const sourcePath = await resolveProjectPath(projectRoot, parsed.path);
  const file = await findCodeGraphFile(vaultRoot, parsed.path);
  const [symbolName, lineSuffix] = parsed.fragment.split(':');
  const matchingSymbols = file.symbols.filter((symbol) => (
    symbol.name === symbolName && (!lineSuffix || String(symbol.line) === lineSuffix)
  ));
  if (matchingSymbols.length === 0) {
    throw new Error(`Symbol not found in code graph: ${parsed.path}#${parsed.fragment}. Run vault_refresh target=code_graph if this is stale.`);
  }
  const symbol = matchingSymbols[0];
  const warnings = matchingSymbols.length > 1 && !lineSuffix
    ? [`Multiple symbols named ${symbolName}; returning first match at line ${symbol.line}. Use #${symbolName}:line to disambiguate.`]
    : [];
  const source = await readFile(sourcePath, 'utf-8');
  const lines = source.split('\n');
  const startLine = Math.max(1, symbol.line);
  const symbolEndLine = Math.max(startLine, symbol.endLine ?? symbol.line);
  const endLine = Math.min(lines.length, Math.min(symbolEndLine, startLine + MAX_EXCERPT_LINES - 1));
  const excerpt = lines.slice(startLine - 1, endLine).join('\n');
  const text = [
    `// ${parsed.path}#${parsed.fragment} lines ${startLine}-${endLine}`,
    ...warnings.map((warning) => `// WARNING: ${warning}`),
    excerpt,
  ].join('\n');
  return textResource(
    buildContextResourceUri('code-excerpt', parsed.path, parsed.fragment),
    text,
    'text/plain',
    warnings.length > 0 ? { warnings } : undefined,
  );
}

export async function readContextResource(
  vaultRoot: string,
  projectRoot: string,
  uri: URL | string,
): Promise<ReadResourceResult> {
  const parsed = parseContextResourceUri(uri);
  switch (parsed.kind) {
    case 'note': return readNoteResource(vaultRoot, uri);
    case 'code-stub': return readCodeStubResource(vaultRoot, projectRoot, uri);
    case 'code-summary': return readCodeSummaryResource(vaultRoot, projectRoot, uri);
    case 'code-excerpt': return readCodeExcerptResource(vaultRoot, projectRoot, uri);
  }
}

const resourceName = (kind: ContextResourceKind, resourcePath: string): string => `${kind}: ${resourcePath}`;

async function listMarkdownNotes(vaultRoot: string, relativeDir = ''): Promise<Resource[]> {
  const absoluteDir = resolve(vaultRoot, relativeDir);
  assertWithinVaultRoot(vaultRoot, absoluteDir);
  if (!existsSync(absoluteDir)) return [];
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const childRelative = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listMarkdownNotes(vaultRoot, childRelative);
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md' && !SECRET_PATH_PATTERN.test(childRelative)) {
      return [{
        uri: buildContextResourceUri('note', childRelative),
        name: resourceName('note', childRelative),
        mimeType: 'text/markdown',
      } satisfies Resource];
    }
    return [] as Resource[];
  }));
  return nested.flat();
}

export async function listNoteResources(vaultRoot: string): Promise<ListResourcesResult> {
  return { resources: await listMarkdownNotes(vaultRoot) };
}

export async function listCodeArtifactResources(vaultRoot: string): Promise<ListResourcesResult> {
  const resources: Resource[] = [];
  try {
    const index = await readCodeGraphV3(vaultRoot);
    for (const file of index.files) {
      if (file.generated || file.vendor || SECRET_PATH_PATTERN.test(file.path)) continue;
      resources.push({
        uri: buildContextResourceUri('code-summary', file.path),
        name: resourceName('code-summary', file.path),
        mimeType: 'application/json',
      });
      for (const symbol of file.symbols) {
        resources.push({
          uri: buildContextResourceUri('code-excerpt', file.path, symbol.name),
          name: `code-excerpt: ${file.path}#${symbol.name}`,
          mimeType: 'text/plain',
        });
      }
    }
  } catch {
    // Listing stays best-effort when generated artifacts are missing.
  }

  try {
    const manifest = await readStubManifest(vaultRoot);
    for (const entry of manifest?.entries ?? []) {
      if (SECRET_PATH_PATTERN.test(entry.path)) continue;
      resources.push({
        uri: buildContextResourceUri('code-stub', entry.path),
        name: resourceName('code-stub', entry.path),
        mimeType: 'text/typescript',
      });
    }
  } catch {
    // Listing stays best-effort when generated artifacts are missing.
  }

  return { resources };
}
