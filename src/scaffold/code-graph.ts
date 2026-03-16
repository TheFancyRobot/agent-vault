import { existsSync } from 'fs';
import { readFile, readdir, writeFile } from 'fs/promises';
import { extname, join, relative } from 'path';

export interface CodeSymbol {
  readonly name: string;
  readonly kind: 'function' | 'class' | 'type' | 'interface' | 'const' | 'variable' | 'enum' | 'struct' | 'trait' | 'method';
  readonly line: number;
  readonly exported: boolean;
}

export interface FileSymbols {
  readonly path: string;
  readonly language: string;
  readonly symbols: CodeSymbol[];
}

export interface CodeGraphResult {
  readonly files: FileSymbols[];
  readonly totalFiles: number;
  readonly totalSymbols: number;
}

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.agent-vault', 'dist', 'build', 'out',
  '.next', '.nuxt', '.svelte-kit', 'target', '__pycache__', '.venv',
  'venv', 'vendor', '.gradle', '.idea', '.vscode', 'coverage',
  '.planning', '.obsidian',
]);

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
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
  '.ex': 'Elixir', '.exs': 'Elixir',
};

/**
 * Parse identifier names from brace content like "foo, bar as baz, qux".
 * For "as" aliases, uses the exported name (right side of "as").
 * Skips rest elements (...name) and nested destructuring.
 */
const parseNamesFromBraces = (braceContent: string): string[] => {
  return braceContent
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith('...') && !part.startsWith('{') && !part.startsWith('['))
    .map((part) => {
      // "foo as bar" → use "bar" (the exported/bound name)
      const asMatch = /(\w+)\s+as\s+(\w+)/.exec(part);
      return asMatch ? asMatch[2] : part.replace(/[^a-zA-Z0-9_$]/g, '');
    })
    .filter((name) => name.length > 0 && /^\w+$/.test(name));
};

// ── Language-specific symbol extractors ──────────────────────────────────

type SymbolExtractor = (content: string) => CodeSymbol[];

const extractTypeScript: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // export function name / export async function name
    const exportFn = /^export\s+(?:async\s+)?function\s+(\w+)/m.exec(line);
    if (exportFn) { symbols.push({ name: exportFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    // export class Name
    const exportClass = /^export\s+(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (exportClass) { symbols.push({ name: exportClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    // export interface Name
    const exportInterface = /^export\s+interface\s+(\w+)/.exec(line);
    if (exportInterface) { symbols.push({ name: exportInterface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    // export type Name
    const exportType = /^export\s+type\s+(\w+)/.exec(line);
    if (exportType) { symbols.push({ name: exportType[1], kind: 'type', line: lineNum, exported: true }); continue; }

    // export const { a, b } = ... (destructured export)
    const destructuredExport = /^export\s+(?:const|let|var)\s+\{([^}]+)\}/.exec(line);
    if (destructuredExport) {
      for (const name of parseNamesFromBraces(destructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    // export const [a, b] = ... (array destructured export)
    const arrayDestructuredExport = /^export\s+(?:const|let|var)\s+\[([^\]]+)\]/.exec(line);
    if (arrayDestructuredExport) {
      for (const name of parseNamesFromBraces(arrayDestructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    // export const name / export let name
    const exportConst = /^export\s+(?:const|let|var)\s+(\w+)/.exec(line);
    if (exportConst) { symbols.push({ name: exportConst[1], kind: 'const', line: lineNum, exported: true }); continue; }

    // export enum Name
    const exportEnum = /^export\s+enum\s+(\w+)/.exec(line);
    if (exportEnum) { symbols.push({ name: exportEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    // export default function name / export default class name
    const exportDefault = /^export\s+default\s+(?:(?:async\s+)?function|class)\s+(\w+)/.exec(line);
    if (exportDefault) { symbols.push({ name: exportDefault[1], kind: 'function', line: lineNum, exported: true }); continue; }

    // export { foo, bar } or export { foo as bar } (with or without 'from')
    const reExport = /^export\s+\{([^}]+)\}/.exec(line);
    if (reExport) {
      for (const name of parseNamesFromBraces(reExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    // Non-exported top-level function (no indentation)
    const topFn = /^(?:async\s+)?function\s+(\w+)/.exec(line);
    if (topFn) { symbols.push({ name: topFn[1], kind: 'function', line: lineNum, exported: false }); continue; }

    // Non-exported top-level const (arrow functions, objects, etc.)
    const topConst = /^const\s+(\w+)\s*(?::\s*\S+)?\s*=/.exec(line);
    if (topConst) { symbols.push({ name: topConst[1], kind: 'const', line: lineNum, exported: false }); continue; }

    // Non-exported class
    const topClass = /^(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (topClass) { symbols.push({ name: topClass[1], kind: 'class', line: lineNum, exported: false }); continue; }

    // Non-exported interface
    const topInterface = /^interface\s+(\w+)/.exec(line);
    if (topInterface) { symbols.push({ name: topInterface[1], kind: 'interface', line: lineNum, exported: false }); continue; }

    // Non-exported type
    const topType = /^type\s+(\w+)/.exec(line);
    if (topType) { symbols.push({ name: topType[1], kind: 'type', line: lineNum, exported: false }); continue; }
  }

  return symbols;
};

const extractPython: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Top-level def (no indentation)
    const fn = /^def\s+(\w+)\s*\(/.exec(line);
    if (fn) {
      const exported = !fn[1].startsWith('_');
      symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    // Top-level async def
    const asyncFn = /^async\s+def\s+(\w+)\s*\(/.exec(line);
    if (asyncFn) {
      const exported = !asyncFn[1].startsWith('_');
      symbols.push({ name: asyncFn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    // Top-level class
    const cls = /^class\s+(\w+)/.exec(line);
    if (cls) {
      const exported = !cls[1].startsWith('_');
      symbols.push({ name: cls[1], kind: 'class', line: lineNum, exported });
      continue;
    }

    // Top-level variable assignment (UPPER_CASE = convention for module-level constants)
    const variable = /^([A-Z][A-Z_0-9]+)\s*=/.exec(line);
    if (variable) {
      symbols.push({ name: variable[1], kind: 'const', line: lineNum, exported: true });
    }
  }

  return symbols;
};

const extractGo: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // func Name or func (receiver) Name
    const fn = /^func\s+(?:\([^)]*\)\s+)?(\w+)/.exec(line);
    if (fn) {
      const exported = fn[1][0] === fn[1][0].toUpperCase() && fn[1][0] !== fn[1][0].toLowerCase();
      symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    // type Name struct/interface
    const typeDecl = /^type\s+(\w+)\s+(struct|interface)/.exec(line);
    if (typeDecl) {
      const kind = typeDecl[2] === 'struct' ? 'struct' as const : 'interface' as const;
      const exported = typeDecl[1][0] === typeDecl[1][0].toUpperCase() && typeDecl[1][0] !== typeDecl[1][0].toLowerCase();
      symbols.push({ name: typeDecl[1], kind, line: lineNum, exported });
      continue;
    }

    // type Name = ... (type alias)
    const typeAlias = /^type\s+(\w+)\s+/.exec(line);
    if (typeAlias && !typeDecl) {
      const exported = typeAlias[1][0] === typeAlias[1][0].toUpperCase() && typeAlias[1][0] !== typeAlias[1][0].toLowerCase();
      symbols.push({ name: typeAlias[1], kind: 'type', line: lineNum, exported });
    }
  }

  return symbols;
};

const extractRust: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // pub fn name / pub async fn name
    const pubFn = /^pub\s+(?:async\s+)?fn\s+(\w+)/.exec(line);
    if (pubFn) { symbols.push({ name: pubFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    // fn name (non-pub)
    const fn = /^(?:async\s+)?fn\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: false }); continue; }

    // pub struct Name
    const pubStruct = /^pub\s+struct\s+(\w+)/.exec(line);
    if (pubStruct) { symbols.push({ name: pubStruct[1], kind: 'struct', line: lineNum, exported: true }); continue; }

    // struct Name
    const struct = /^struct\s+(\w+)/.exec(line);
    if (struct) { symbols.push({ name: struct[1], kind: 'struct', line: lineNum, exported: false }); continue; }

    // pub enum Name
    const pubEnum = /^pub\s+enum\s+(\w+)/.exec(line);
    if (pubEnum) { symbols.push({ name: pubEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    // pub trait Name
    const pubTrait = /^pub\s+trait\s+(\w+)/.exec(line);
    if (pubTrait) { symbols.push({ name: pubTrait[1], kind: 'trait', line: lineNum, exported: true }); continue; }

    // pub type Name
    const pubType = /^pub\s+type\s+(\w+)/.exec(line);
    if (pubType) { symbols.push({ name: pubType[1], kind: 'type', line: lineNum, exported: true }); continue; }
  }

  return symbols;
};

const extractJava: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // public class/interface/enum Name
    const classDecl = /^(?:public\s+)?(?:abstract\s+)?(?:final\s+)?(class|interface|enum)\s+(\w+)/.exec(line);
    if (classDecl) {
      const kind = classDecl[1] as 'class' | 'interface' | 'enum';
      const exported = line.includes('public');
      symbols.push({ name: classDecl[2], kind, line: lineNum, exported });
      continue;
    }

    // public returnType methodName(
    const method = /^(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/.exec(line);
    if (method && method[1] !== 'if' && method[1] !== 'for' && method[1] !== 'while' && method[1] !== 'switch') {
      const exported = line.startsWith('public');
      symbols.push({ name: method[1], kind: 'method', line: lineNum, exported });
    }
  }

  return symbols;
};

const EXTRACTORS: Record<string, SymbolExtractor> = {
  'TypeScript': extractTypeScript,
  'JavaScript': extractTypeScript, // Same syntax for exports
  'Python': extractPython,
  'Go': extractGo,
  'Rust': extractRust,
  'Java': extractJava,
  'Kotlin': extractJava, // Close enough for top-level declarations
};

// ── File walker ──────────────────────────────────────────────────────────

const walkSourceFiles = async (
  dir: string,
  projectRoot: string,
  results: FileSymbols[],
  depth = 0,
): Promise<void> => {
  if (depth > 8) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        await walkSourceFiles(fullPath, projectRoot, results, depth + 1);
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = extname(entry.name).toLowerCase();
    const language = LANGUAGE_EXTENSIONS[ext];
    if (!language) continue;

    const extractor = EXTRACTORS[language];
    if (!extractor) continue;

    // Skip test files and generated files
    const name = entry.name.toLowerCase();
    if (name.includes('.test.') || name.includes('.spec.') || name.includes('.d.ts') ||
        name.endsWith('.min.js') || name.endsWith('.bundle.js')) continue;

    try {
      const content = await readFile(fullPath, 'utf-8');
      // Skip very large files (likely generated)
      if (content.length > 500_000) continue;

      const symbols = extractor(content);
      if (symbols.length > 0) {
        const relativePath = relative(projectRoot, fullPath);
        results.push({ path: relativePath, language, symbols });
      }
    } catch {
      // Skip unreadable files
    }
  }
};

// ── Public API ───────────────────────────────────────────────────────────

export async function buildCodeGraph(projectRoot: string): Promise<CodeGraphResult> {
  const files: FileSymbols[] = [];
  await walkSourceFiles(projectRoot, projectRoot, files);

  // Sort by path for stable output
  files.sort((a, b) => a.path.localeCompare(b.path));

  const totalSymbols = files.reduce((sum, f) => sum + f.symbols.length, 0);

  return { files, totalFiles: files.length, totalSymbols };
}

/**
 * Render the code graph as a markdown document for the vault.
 */
export function renderCodeGraphMarkdown(graph: CodeGraphResult, repoName: string): string {
  const date = new Date().toISOString().slice(0, 10);

  const sections: string[] = [
    `---`,
    `note_type: architecture`,
    `template_version: 2`,
    `contract_version: 1`,
    `title: Code Graph`,
    `architecture_id: "ARCH-0006"`,
    `status: active`,
    `owner: ""`,
    `reviewed_on: "${date}"`,
    `created: "${date}"`,
    `updated: "${date}"`,
    `related_notes:`,
    `  - "[[01_Architecture/Code_Map|Code Map]]"`,
    `  - "[[01_Architecture/System_Overview|System Overview]]"`,
    `tags:`,
    `  - agent-vault`,
    `  - architecture`,
    `---`,
    ``,
    `# Code Graph`,
    ``,
    `## Purpose`,
    ``,
    `- Map exported symbols (functions, classes, types, interfaces) to their source files.`,
    `- Enable agents and engineers to locate relevant code by symbol name without searching.`,
    `- Auto-generated during vault initialization; refresh with \`vault_refresh\` target \`code-graph\`.`,
    ``,
    `## Overview`,
    ``,
    `- Repository: ${repoName}`,
    `- Files indexed: ${graph.totalFiles}`,
    `- Symbols found: ${graph.totalSymbols}`,
    ``,
    `## Key Components`,
    ``,
    `- See **Exports by File** below for the full symbol index grouped by directory.`,
    ``,
    `## Important Paths`,
    ``,
    `- All indexed source files are listed in the Exports by File section with line-level symbol locations.`,
    ``,
    `## Constraints`,
    ``,
    `- Auto-generated during vault initialization; do not hand-edit.`,
    `- Refresh with \`vault_refresh\` target \`code-graph\`.`,
    `- Files larger than 500 KB and common generated/test files are excluded.`,
    ``,
    `## Failure Modes`,
    ``,
    `- If source files are added outside the supported language set, they will not appear in this graph.`,
    `- Deeply nested files (beyond 8 levels) are skipped.`,
    ``,
    `## Exports by File`,
    ``,
  ];

  // Group files by top-level directory
  const byDir = new Map<string, FileSymbols[]>();
  for (const file of graph.files) {
    const topDir = file.path.split('/')[0] || file.path;
    const group = byDir.get(topDir) ?? [];
    group.push(file);
    byDir.set(topDir, group);
  }

  for (const [dir, files] of byDir) {
    sections.push(`### ${dir}/`, '');

    for (const file of files) {
      const exported = file.symbols.filter((s) => s.exported);
      const internal = file.symbols.filter((s) => !s.exported);

      if (exported.length === 0 && internal.length === 0) continue;

      sections.push(`**\`${file.path}\`** *(${file.language})*`);

      if (exported.length > 0) {
        for (const sym of exported) {
          sections.push(`- \`${sym.kind}\` **${sym.name}** (line ${sym.line})`);
        }
      }

      if (internal.length > 0) {
        const internals = internal.map((s) => `\`${s.name}\``).join(', ');
        sections.push(`- *internal:* ${internals}`);
      }

      sections.push('');
    }
  }

  sections.push(
    `## Related Notes`,
    ``,
    `<!-- AGENT-START:architecture-related-notes -->`,
    `- [[01_Architecture/Code_Map|Code Map]]`,
    `- [[01_Architecture/System_Overview|System Overview]]`,
    `<!-- AGENT-END:architecture-related-notes -->`,
    ``,
  );

  return sections.join('\n');
}

/**
 * Build the code graph and write it to the vault's architecture directory.
 * Returns the graph result for further processing.
 */
export async function writeCodeGraph(
  projectRoot: string,
  vaultRoot: string,
  repoName: string,
): Promise<CodeGraphResult> {
  const graph = await buildCodeGraph(projectRoot);
  const markdown = renderCodeGraphMarkdown(graph, repoName);
  const outputPath = join(vaultRoot, '01_Architecture', 'Code_Graph.md');
  await writeFile(outputPath, markdown, 'utf-8');
  return graph;
}

/**
 * Look up which files contain symbols matching a query.
 * Useful for enriching step notes with relevant code paths.
 */
export function findSymbols(
  graph: CodeGraphResult,
  query: string,
): Array<{ file: string; symbol: CodeSymbol }> {
  const results: Array<{ file: string; symbol: CodeSymbol }> = [];
  const lowerQuery = query.toLowerCase();

  for (const file of graph.files) {
    for (const symbol of file.symbols) {
      if (symbol.name.toLowerCase().includes(lowerQuery)) {
        results.push({ file: file.path, symbol });
      }
    }
  }

  return results;
}

/**
 * Get all exported symbols from files matching a path pattern.
 * Used to enrich step notes' "Relevant Code Paths" with function-level detail.
 */
export function getSymbolsForFiles(
  graph: CodeGraphResult,
  filePaths: string[],
): Map<string, CodeSymbol[]> {
  const result = new Map<string, CodeSymbol[]>();

  for (const queryPath of filePaths) {
    for (const file of graph.files) {
      if (file.path === queryPath || file.path.endsWith(queryPath) || file.path.includes(queryPath)) {
        const existing = result.get(file.path) ?? [];
        existing.push(...file.symbols.filter((s) => s.exported));
        result.set(file.path, existing);
      }
    }
  }

  return result;
}
