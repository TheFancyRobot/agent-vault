import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';

// ─── Types ────────────────────────────────────────────────────────────

export interface StubManifestEntry {
  /** Project-relative source path (e.g. "src/core/vault-graph.ts") */
  readonly path: string;
  /** Language detected from file extension */
  readonly language: string;
  /** Source file size in bytes */
  readonly size: number;
  /** Source file mtime in milliseconds since epoch */
  readonly mtimeMs: number;
  /** SHA-256 hex digest of source file content */
  readonly sha256: string;
  /** Stub schema version */
  readonly stubVersion: 1;
  /** Parser used: 'regex' for initial regex-based, later 'typescript-compiler' or 'tree-sitter' */
  readonly parser: string;
  /** Path within the vault automation directory to the generated stub file */
  readonly stubPath: string;
  /** Set to true when the stub is incomplete (fallback, partial extraction, etc.) */
  readonly incomplete?: boolean;
}

export interface StubManifest {
  /** Manifest schema version */
  readonly version: 1;
  /** ISO-8601 timestamp when manifest was generated */
  generatedAt: string;
  /** Ordered list of stub entries */
  entries: StubManifestEntry[];
}

export interface GenerateStubResult {
  /** Whether a new stub was generated (true) or served from cache (false) */
  readonly generated: boolean;
  /** Path to the generated stub file (relative to vault root) */
  readonly stubPath: string;
  /** Whether the stub is complete or a fallback/incomplete version */
  readonly incomplete: boolean;
}

export interface GenerateStubsResult {
  /** Number of new stubs generated */
  readonly generated: number;
  /** Total number of stubs in manifest */
  readonly total: number;
  /** Any warnings encountered */
  readonly warnings: string[];
}

// ─── Constants ────────────────────────────────────────────────────────

const STUBS_DIR = 'code-stubs';
const STUB_EXT = '.stub.ts';
const MAX_FILE_SIZE = 500_000; // 500KB limit, same as code-graph

// ─── Path sanitization ────────────────────────────────────────────────

/**
 * Convert a project-relative path like "src/core/vault-graph.ts" into a safe
 * stub filename like "src_core_vault-graph.ts.a1b2c3d4.stub.ts".
 *
 * The hash prefix prevents collisions when multiple source paths map to the same
 * sanitized base name.
 */
export function sanitizeStubPath(projectRelativePath: string, sha256: string): string {
  const sanitized = projectRelativePath
    .replace(/\.[^.]+$/, '') // remove extension
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // sanitize separators
    .replace(/_{2,}/g, '_'); // collapse multiple underscores

  const hashPrefix = sha256.slice(0, 8);
  return `${sanitized}.${hashPrefix}${STUB_EXT}`;
}

/**
 * Resolve the vault-relative stub file path for a given source file.
 * Returns undefined if the stub doesn't exist on disk.
 */
export function resolveStubPath(vaultRoot: string, manifestEntry: StubManifestEntry): string | undefined {
  const absoluteStub = resolve(vaultRoot, STUBS_DIR, manifestEntry.stubPath);
  return existsSync(absoluteStub) ? manifestEntry.stubPath : undefined;
}

// ─── Stub content generation ────────────────────────────────────────

/**
 * Generate a TypeScript stub from source content.
 *
 * Rules per DEC-0003:
 * - Do not invent behavior
 * - Keep exported declarations, public signatures, interfaces, types, enums, constants
 * - Keep useful docstrings where safely extractable
 * - Keep import/export relationships
 * - Drop function/method bodies
 * - Preserve line references when possible
 * - Mark incomplete/fallback stubs clearly
 *
 * This is the initial regex-based parser; STEP-04-06 will add TypeScript compiler
 * and Tree-sitter backends for higher fidelity.
 */
export function generateTypeScriptStub(content: string): { stubContent: string; incomplete: boolean } {
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let incomplete = false;
  let braceDepth = 0;

  // We process line-by-line, tracking brace depth to identify function/class bodies.
  // Strategy:
  // 1. Keep all import statements
  // 2. For function declarations (export function / async function / arrow), emit a declaration stub
  // 3. For classes, emit a declare class with declare methods
  // 4. For interfaces, types, enums, constants: keep as-is
  // 5. Drop all implementation bodies

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Keep JSDoc / block comments ──
    if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('*/')) {
      outputLines.push(line);
      i++;
      continue;
    }

    // ── Keep single-line comments ──
    if (trimmed.startsWith('//')) {
      outputLines.push(line);
      i++;
      continue;
    }

    // ── Keep import statements ──
    if (/^import\s+/.test(trimmed)) {
      outputLines.push(line);
      i++;
      continue;
    }

    // ── Handle function declarations ──
    const fnMatch = /^(export\s+(?:async\s+)?)?(?:function\s+)(\w+)\s*\(([^)]*)\)(\s*:\s*(\S+))?\s*(?:=|{|$)/.exec(trimmed);
    if (fnMatch && !line.startsWith('import')) {
      const isExport = !!fnMatch[1];
      const name = fnMatch[2];
      const params = fnMatch[3];
      const returnType = fnMatch[5] || '';
      const hasBody = trimmed.includes('{');

      if (hasBody) {
        // Convert to declare form: export declare function name(params): ReturnType;
        const declarePrefix = isExport ? 'export declare' : 'declare';
        const ret = returnType ? `: ${returnType}` : '';
        outputLines.push(`${declarePrefix} function ${name}(${params})${ret};`);

        // Skip the function body
        if (trimmed.endsWith('{') || (i + 1 < lines.length && lines[i + 1].trim() === '{')) {
          braceDepth = 1;
          let j = i + 1;
          while (j < lines.length && braceDepth > 0) {
            const l = lines[j].trim();
            braceDepth += (l.match(/\{/g) || []).length;
            braceDepth -= (l.match(/\}/g) || []).length;
            j++;
          }
          i = j;
          incomplete = true; // We're approximating via regex
        } else {
          i++;
        }
      } else {
        // Arrow function or function expression assignment — skip
        if (/=\s*\(/.test(trimmed) || /=>/.test(trimmed)) {
          // Arrow function assignment — try to get the signature
          const arrowMatch = /^(export\s+(?:const|let|var)\s+)?(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(\s*:\s*(\S+))?\s*=>/.exec(trimmed);
          if (arrowMatch) {
            const isExport = !!arrowMatch[1];
            const ret = arrowMatch[5] || 'unknown';
            const declarePrefix = isExport ? 'export declare' : 'declare';
            outputLines.push(`${declarePrefix} const ${arrowMatch[2]}: (${arrowMatch[3]}) => ${ret};`);
          }
        }
        i++;
      }
      continue;
    }

    // ── Handle class declarations ──
    const classMatch = /^(export\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(trimmed);
    if (classMatch && !line.startsWith('import')) {
      const isExport = !!classMatch[1];
      const className = classMatch[2];

      // Emit a declare class with empty body
      const declarePrefix = isExport ? 'export declare' : 'declare';
      const isAbstract = trimmed.startsWith('abstract');
      outputLines.push(`${declarePrefix} ${isAbstract ? 'abstract ' : ''}class ${className} { }`);
      outputLines.push('');

      incomplete = true;
      i++;
      continue;
    }

    // ── Keep interfaces, types, enums, and constants ──
    if (/^export\s+(interface|type|enum|const|let|var)\s+\w+/.test(trimmed)) {
      // Check if this is a const/let/var with an initializer that is a function expression
      const constFnMatch = /^(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/.exec(trimmed);
      if (constFnMatch) {
        // This is a function assigned to a const — emit declare form
        const isExport = !!constFnMatch[1];
        const name = constFnMatch[2];
        const declarePrefix = isExport ? 'export declare' : 'declare';
        outputLines.push(`${declarePrefix} const ${name}: Function;`);
        incomplete = true;
        i++;
        continue;
      }

      // Keep the full declaration (interfaces/types/enums/constants have no bodies to drop
      // — or in case of const, the value is small enough to keep)
      outputLines.push(line);
      i++;
      continue;
    }

    // ── Handle non-exported declarations ──
    if (/^(function|const|let|var|class|interface|type|enum)\s+\w+/.test(trimmed) && !line.startsWith('import')) {
      // Non-exported function
      const nonExportFn = /^(async\s+)?function\s+(\w+)\s*\(([^)]*)\)(\s*:\s*(\S+))?\s*{/.exec(trimmed);
      if (nonExportFn) {
        const name = nonExportFn[2];
        const params = nonExportFn[3];
        const returnType = nonExportFn[5] || '';
        const ret = returnType ? `: ${returnType}` : '';
        outputLines.push(`declare function ${name}(${params})${ret};`);

        // Skip body
        braceDepth = 1;
        let j = i + 1;
        while (j < lines.length && braceDepth > 0) {
          const l = lines[j].trim();
          braceDepth += (l.match(/\{/g) || []).length;
          braceDepth -= (l.match(/\}/g) || []).length;
          j++;
        }
        i = j;
        incomplete = true;
        continue;
      }

      // Non-exported const/let/var — keep
      outputLines.push(line);
      i++;
      continue;
    }

    // ── Default: skip lines that are part of dropped bodies ──
    i++;
  }

  const stubContent = [
    '// Generated stub — interface skeleton only, do not edit.',
    '// Original: see source file for full implementation.',
    '// Parser: regex (incomplete)',
    '',
    ...outputLines,
  ].join('\n');

  return { stubContent, incomplete };
}

// ─── Cache management ────────────────────────────────────────────────

/**
 * Read the stub manifest, returning undefined if it doesn't exist yet.
 */
export async function readStubManifest(vaultRoot: string): Promise<StubManifest | undefined> {
  const manifestPath = join(vaultRoot, STUBS_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return undefined;
  }
  const raw = await readFile(manifestPath, 'utf-8');
  return JSON.parse(raw) as StubManifest;
}

/**
 * Write the stub manifest atomically (write to temp, then rename — simplified: just overwrite).
 */
export async function writeStubManifest(vaultRoot: string, manifest: StubManifest): Promise<void> {
  const manifestPath = join(vaultRoot, STUBS_DIR, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

/**
 * Check if a manifest entry is still valid by comparing the stored hash with the current source file hash.
 */
export async function isEntryStale(entry: StubManifestEntry, projectRoot: string): Promise<boolean> {
  const sourcePath = join(projectRoot, entry.path);
  if (!existsSync(sourcePath)) {
    return true; // Source file deleted
  }
  const content = await readFile(sourcePath, 'utf-8');
  const currentHash = createHash('sha256').update(content).digest('hex');
  return currentHash !== entry.sha256;
}

/**
 * Compute metadata for a source file: size, mtime, and SHA-256 hash.
 */
export async function computeSourceMetadata(projectRoot: string, projectRelativePath: string): Promise<{
  size: number;
  mtimeMs: number;
  sha256: string;
  content: string;
} | undefined> {
  const absolutePath = join(projectRoot, projectRelativePath);
  if (!existsSync(absolutePath)) {
    return undefined;
  }
  const stats = await stat(absolutePath);
  if (stats.size > MAX_FILE_SIZE) {
    return undefined; // Too large to stub
  }
  const content = await readFile(absolutePath, 'utf-8');
  const hash = createHash('sha256').update(content).digest('hex');
  return {
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    sha256: hash,
    content,
  };
}

// ─── Stub generation ────────────────────────────────────────────────

/**
 * Generate a stub for a single source file.
 * If a valid cached stub exists (same hash), returns without regenerating.
 */
export async function generateStubForFile(
  projectRoot: string,
  vaultRoot: string,
  projectRelativePath: string,
  parser: string = 'regex',
): Promise<GenerateStubResult | undefined> {
  const metadata = await computeSourceMetadata(projectRoot, projectRelativePath);
  if (!metadata) {
    return undefined;
  }

  const { sha256, size, mtimeMs, content } = metadata;
  const ext = extname(projectRelativePath);
  const language = getLanguageForExtension(ext);
  if (!language) {
    return undefined;
  }

  // Check manifest for a valid entry
  const manifest = await readStubManifest(vaultRoot);
  const existingEntry = manifest?.entries.find((e) => e.path === projectRelativePath);

  if (existingEntry && existingEntry.sha256 === sha256 && existingEntry.size === size) {
    // Valid cached stub — nothing to regenerate
    return {
      generated: false,
      stubPath: existingEntry.stubPath,
      incomplete: !!existingEntry.incomplete,
    };
  }

  // Generate stub content
  let stubContent: string;
  let incomplete = false;

  if (language === 'TypeScript' || language === 'JavaScript') {
    const result = generateTypeScriptStub(content);
    stubContent = result.stubContent;
    incomplete = result.incomplete;
  } else {
    // Fallback: metadata-only stub with a comment
    stubContent = [
      `// Stub placeholder — full parsing not yet implemented for ${language}.`,
      `// Source: ${projectRelativePath}`,
      `// Hash: ${sha256}`,
    ].join('\n');
    incomplete = true;
  }

  // Write stub file
  const stubFilename = sanitizeStubPath(projectRelativePath, sha256);
  const stubPathInVault = join(STUBS_DIR, stubFilename);
  const absoluteStubPath = resolve(vaultRoot, stubPathInVault);

  await mkdir(join(vaultRoot, STUBS_DIR), { recursive: true });
  await writeFile(absoluteStubPath, stubContent, 'utf-8');

  // Update manifest
  if (manifest) {
    // Replace existing entry or add new one
    const existingIndex = manifest.entries.findIndex((e) => e.path === projectRelativePath);
    const newEntry: StubManifestEntry = {
      path: projectRelativePath,
      language,
      size,
      mtimeMs,
      sha256,
      stubVersion: 1,
      parser,
      stubPath: stubFilename,
      incomplete,
    };

    if (existingIndex >= 0) {
      manifest.entries[existingIndex] = newEntry;
    } else {
      manifest.entries.push(newEntry);
    }
    manifest.generatedAt = new Date().toISOString();
    await writeStubManifest(vaultRoot, manifest);
  } else {
    // First time — create manifest
    const newManifest: StubManifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      entries: [{
        path: projectRelativePath,
        language,
        size,
        mtimeMs,
        sha256,
        stubVersion: 1,
        parser,
        stubPath: stubFilename,
        incomplete,
      }],
    };
    await writeStubManifest(vaultRoot, newManifest);
  }

  return {
    generated: true,
    stubPath: stubFilename,
    incomplete,
  };
}

/**
 * Generate stubs for multiple source files at once, reusing the manifest.
 * Used by the context compiler when it needs stubs for indirect dependencies.
 */
export async function generateStubs(
  projectRoot: string,
  vaultRoot: string,
  paths: string[],
  parser: string = 'regex',
): Promise<GenerateStubsResult> {
  const warnings: string[] = [];
  let generated = 0;

  for (const path of paths) {
    try {
      const result = await generateStubForFile(projectRoot, vaultRoot, path, parser);
      if (!result) {
        warnings.push(`Could not generate stub for ${path} (file not found or unsupported language)`);
        continue;
      }
      if (result.generated) {
        generated++;
      }
      if (result.incomplete) {
        warnings.push(`Stub for ${path} is incomplete (parser: ${parser})`);
      }
    } catch (err) {
      warnings.push(`Failed to generate stub for ${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const manifest = await readStubManifest(vaultRoot);
  return {
    generated,
    total: manifest?.entries.length ?? 0,
    warnings,
  };
}

/**
 * Initialize the stub cache directory and create an empty manifest.
 * Called during `vault_refresh target=code_stubs` or vault init.
 */
export async function initializeStubCache(vaultRoot: string): Promise<void> {
  const stubsDir = join(vaultRoot, STUBS_DIR);
  await mkdir(stubsDir, { recursive: true });

  const manifestPath = join(stubsDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    await writeStubManifest(vaultRoot, {
      version: 1,
      generatedAt: new Date().toISOString(),
      entries: [],
    });
  }
}

/**
 * Invalidate a specific stub entry from the manifest and remove its file.
 */
export async function invalidateStub(
  vaultRoot: string,
  projectRelativePath: string,
): Promise<boolean> {
  const manifest = await readStubManifest(vaultRoot);
  if (!manifest) {
    return false;
  }

  const entryIndex = manifest.entries.findIndex((e) => e.path === projectRelativePath);
  if (entryIndex < 0) {
    return false;
  }

  const entry = manifest.entries[entryIndex];
  // Remove the stub file; deletion failures propagate so callers never
  // believe a stub was invalidated while the artifact remains on disk.
  const stubAbsolutePath = resolve(vaultRoot, STUBS_DIR, entry.stubPath);
  if (existsSync(stubAbsolutePath)) {
    await rm(stubAbsolutePath, { force: true });
  }

  manifest.entries.splice(entryIndex, 1);
  manifest.generatedAt = new Date().toISOString();
  await writeStubManifest(vaultRoot, manifest);
  return true;
}

// ─── Language detection ─────────────────────────────────────────────

function getLanguageForExtension(ext: string): string | undefined {
  const LANGUAGE_EXTENSIONS: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.rb': 'Ruby',
    '.cs': 'C#',
    '.swift': 'Swift',
    '.php': 'PHP',
    '.scala': 'Scala',
    '.ex': 'Elixir',
    '.exs': 'Elixir',
  };
  return LANGUAGE_EXTENSIONS[ext];
}
