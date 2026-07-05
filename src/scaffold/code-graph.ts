import { createHash } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { extname, join, relative } from 'path';

// ─── v2 types (kept for backward-compat lookup) ───

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

export interface CodeGraphDirectorySummary {
  readonly directory: string;
  readonly files: number;
  readonly exportedSymbols: number;
  readonly internalSymbols: number;
  readonly totalSymbols: number;
}

export interface CodeGraphIndexPayload {
  readonly version: 2;
  readonly generatedAt: string;
  readonly repoName: string;
  readonly totalFiles: number;
  readonly totalSymbols: number;
  readonly directories: CodeGraphDirectorySummary[];
  readonly files: FileSymbols[];
}

// ─── v3 types ───

export interface CodeSymbolV3 extends CodeSymbol {
  readonly endLine?: number;
  readonly signature?: string;
  readonly doc?: string;
  readonly parentName?: string;
}

export interface ImportEdge {
  readonly source: string;
  readonly specifier: string;
  readonly imported?: string[];
  readonly resolvedPath?: string;
  readonly kind?: 'static' | 'dynamic' | 'type';
}

export interface ExportEdge {
  readonly name?: string;
  readonly source?: string;
  readonly resolvedPath?: string;
  readonly kind?: 'named' | 'default' | 'namespace' | 'reexport';
}

export interface FileSymbolsV3 {
  readonly path: string;
  readonly language: string;
  readonly symbols: CodeSymbolV3[];
  readonly imports?: ImportEdge[];
  readonly exports?: ExportEdge[];
  readonly hash?: string;
  readonly mtimeMs?: number;
  readonly size?: number;
  readonly generated?: boolean;
  readonly vendor?: boolean;
}

export interface CodeGraphIndexV3 {
  readonly version: 3;
  readonly generatedAt: string;
  readonly root: string;
  readonly files: FileSymbolsV3[];
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
      const asMatch = /(\w+)\s+as\s+(\w+)/.exec(part);
      return asMatch ? asMatch[2] : part.replace(/[^a-zA-Z0-9_$]/g, '');
    })
    .filter((name) => name.length > 0 && /^[\w$]+$/.test(name));
};

type SymbolExtractorV3 = (content: string) => CodeSymbolV3[];

/**
 * Extract JSDoc comment from preceding lines.
 * Returns the comment text or undefined.
 */
const extractJSDoc = (lines: string[], fromLine: number): string | undefined => {
  // Walk backward from the symbol's line looking for a JSDoc block
  let i = fromLine - 1;
  while (i >= 0) {
    const trimmed = lines[i].trim();
    if (trimmed === '*/' || trimmed.startsWith('* ')) {
      i--;
      continue;
    }
    if (trimmed === '/**' || trimmed.startsWith('/**')) {
      // Found start of JSDoc; collect lines between /** and */
      const start = i;
      let end = fromLine;
      const docLines: string[] = [];
      for (let j = start + 1; j < end; j++) {
        const t = lines[j].trim();
        if (t.startsWith('* ')) {
          docLines.push(t.slice(2));
        } else if (t.startsWith('*') || t === '*/') {
          docLines.push(t.replace(/^\*[\s/]*$/g, '').trim());
        }
      }
      return docLines.join('\n').trim();
    }
    break;
  }
  return undefined;
};

/**
 * Try to extract a function signature from a single declaration line.
 * Returns undefined for multiline or complex declarations.
 */
const extractFunctionSignature = (line: string): string | undefined => {
  // Match: function name(params): returnType or arrow function
  const match = /(?:^|\s)(?:async\s+)?(function|const|let|var)\s+(\w+)\s*\(([^)]*)\)(\s*:\s*(\S+))?(\s*(?:=\s*)?)$/.exec(line);
  if (match) {
    const returnType = match[5] || '';
    return `(${match[3] || ''})${returnType ? `: ${returnType}` : ''}`;
  }
  // Simpler pattern for just the parameter list
  const simpleFn = /(?:^|\s)(?:async\s+)?(function|const|let|var)\s+(\w+)\s*\(([^)]*)\)/.exec(line);
  if (simpleFn) {
    return `(${simpleFn[3] || ''})`;
  }
  return undefined;
};

const extractImportEdges = (content: string): ImportEdge[] => {
  const lines = content.split('\n');
  const edges: ImportEdge[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // import { a, b } from 'specifier'
    const namedImport = /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (namedImport) {
      const names = namedImport[1].split(',')
        .map(n => n.trim())
        .filter(n => n.length > 0 && !n.startsWith('...') && !n.startsWith('{') && !n.startsWith('['))
        .map(n => {
          const asMatch = /(\w+)\s+as\s+(\w+)/.exec(n);
          return asMatch ? asMatch[2] : n.replace(/[^a-zA-Z0-9_$]/g, '');
        })
        .filter(n => n.length > 0 && /^[\w$]+$/.test(n));
      edges.push({
        source: namedImport[1].trim(),
        specifier: namedImport[2],
        imported: names,
        kind: 'static',
      });
      continue;
    }

    // import type { a, b } from 'specifier'
    const typeImport = /^import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (typeImport) {
      const names = typeImport[1].split(',')
        .map(n => n.trim())
        .filter(n => n.length > 0)
        .map(n => n.replace(/[^a-zA-Z0-9_$]/g, ''))
        .filter(n => n.length > 0 && /^[\w$]+$/.test(n));
      edges.push({
        source: typeImport[1].trim(),
        specifier: typeImport[2],
        imported: names,
        kind: 'type',
      });
      continue;
    }

    // import defaultName from 'specifier'
    const defaultImport = /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (defaultImport) {
      edges.push({
        source: defaultImport[1],
        specifier: defaultImport[2],
        imported: [defaultImport[1]],
        kind: 'static',
      });
      continue;
    }

    // import * as name from 'specifier'
    const namespaceImport = /^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (namespaceImport) {
      edges.push({
        source: namespaceImport[1],
        specifier: namespaceImport[2],
        kind: 'static',
      });
      continue;
    }

    // import 'specifier' (side-effect)
    const sideEffectImport = /^import\s+['"]([^'"]+)['"]/.exec(line);
    if (sideEffectImport) {
      edges.push({
        source: '',
        specifier: sideEffectImport[1],
        kind: 'static',
      });
      continue;
    }

    // Dynamic import: import('specifier')
    const dynamicImport = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
    if (dynamicImport) {
      edges.push({
        source: '',
        specifier: dynamicImport[1],
        kind: 'dynamic',
      });
      continue;
    }
  }

  return edges;
};

const extractExportEdges = (content: string): ExportEdge[] => {
  const lines = content.split('\n');
  const edges: ExportEdge[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // export { foo, bar } from 'specifier' (re-export)
    const reExport = /^export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (reExport) {
      edges.push({
        name: reExport[1].trim(),
        source: reExport[2],
        kind: 'reexport',
      });
      continue;
    }

    // export * from 'specifier' (namespace re-export)
    const namespaceExport = /^export\s+\*\s+from\s+['"]([^'"]+)['"]/.exec(line);
    if (namespaceExport) {
      edges.push({
        name: '*',
        source: namespaceExport[1],
        kind: 'namespace',
      });
      continue;
    }

    // export default (function/class/const/etc.)
    const defaultExport = /^export\s+default\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)?/.exec(line);
    if (defaultExport) {
      edges.push({
        name: defaultExport[1],
        kind: 'default',
      });
      continue;
    }

    // export default (expression)
    const defaultExpr = /^export\s+default\s+[^{\s]/.exec(line);
    if (defaultExpr) {
      edges.push({
        kind: 'default',
      });
      continue;
    }
  }

  return edges;
};

const extractTypeScript: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const doc = extractJSDoc(lines, i);

    const exportFn = /^export\s+(?:async\s+)?function\s+(\w+)/.exec(line);
    if (exportFn) {
      symbols.push({ name: exportFn[1], kind: 'function', line: lineNum, exported: true, endLine: lineNum, signature: extractFunctionSignature(line), doc });
      continue;
    }

    const exportClass = /^export\s+(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (exportClass) {
      symbols.push({ name: exportClass[1], kind: 'class', line: lineNum, exported: true, endLine: lineNum, doc });
      continue;
    }

    const exportInterface = /^export\s+interface\s+(\w+)/.exec(line);
    if (exportInterface) {
      symbols.push({ name: exportInterface[1], kind: 'interface', line: lineNum, exported: true, endLine: lineNum, doc });
      continue;
    }

    const exportType = /^export\s+type\s+(\w+)/.exec(line);
    if (exportType) {
      symbols.push({ name: exportType[1], kind: 'type', line: lineNum, exported: true, endLine: lineNum, doc });
      continue;
    }

    const destructuredExport = /^export\s+(?:const|let|var)\s+\{([^}]+)\}/.exec(line);
    if (destructuredExport) {
      for (const name of parseNamesFromBraces(destructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true, endLine: lineNum });
      }
      continue;
    }

    const arrayDestructuredExport = /^export\s+(?:const|let|var)\s+\[([^\]]+)\]/.exec(line);
    if (arrayDestructuredExport) {
      for (const name of parseNamesFromBraces(arrayDestructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true, endLine: lineNum });
      }
      continue;
    }

    const exportConst = /^export\s+(?:const|let|var)\s+(\w+)/.exec(line);
    if (exportConst) {
      symbols.push({ name: exportConst[1], kind: 'const', line: lineNum, exported: true, endLine: lineNum });
      continue;
    }

    const exportEnum = /^export\s+enum\s+(\w+)/.exec(line);
    if (exportEnum) {
      symbols.push({ name: exportEnum[1], kind: 'enum', line: lineNum, exported: true, endLine: lineNum });
      continue;
    }

    const exportDefaultFn = /^export\s+default\s+(?:async\s+)?function\s+(\w+)/.exec(line);
    if (exportDefaultFn) {
      symbols.push({ name: exportDefaultFn[1], kind: 'function', line: lineNum, exported: true, endLine: lineNum, signature: extractFunctionSignature(line), doc });
      continue;
    }

    const exportDefaultClass = /^export\s+default\s+class\s+(\w+)/.exec(line);
    if (exportDefaultClass) {
      symbols.push({ name: exportDefaultClass[1], kind: 'class', line: lineNum, exported: true, endLine: lineNum, doc });
      continue;
    }

    const reExport = /^export\s+\{([^}]+)\}/.exec(line);
    if (reExport) {
      for (const name of parseNamesFromBraces(reExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true, endLine: lineNum });
      }
      continue;
    }

    const topFn = /^(?:async\s+)?function\s+(\w+)/.exec(line);
    if (topFn) {
      symbols.push({ name: topFn[1], kind: 'function', line: lineNum, exported: false, endLine: lineNum, signature: extractFunctionSignature(line), doc });
      continue;
    }

    const topConst = /^const\s+(\w+)\s*(?::\s*\S+)?\s*=/.exec(line);
    if (topConst) {
      symbols.push({ name: topConst[1], kind: 'const', line: lineNum, exported: false, endLine: lineNum });
      continue;
    }

    const topClass = /^(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (topClass) {
      symbols.push({ name: topClass[1], kind: 'class', line: lineNum, exported: false, endLine: lineNum, doc });
      continue;
    }

    const topInterface = /^interface\s+(\w+)/.exec(line);
    if (topInterface) {
      symbols.push({ name: topInterface[1], kind: 'interface', line: lineNum, exported: false, endLine: lineNum, doc });
      continue;
    }

    const topType = /^type\s+(\w+)/.exec(line);
    if (topType) {
      symbols.push({ name: topType[1], kind: 'type', line: lineNum, exported: false, endLine: lineNum, doc });
      continue;
    }
  }

  return symbols;
};

const extractPython: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const fn = /^def\s+(\w+)\s*\(/.exec(line);
    if (fn) {
      const exported = !fn[1].startsWith('_');
      symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    const asyncFn = /^async\s+def\s+(\w+)\s*\(/.exec(line);
    if (asyncFn) {
      const exported = !asyncFn[1].startsWith('_');
      symbols.push({ name: asyncFn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    const cls = /^class\s+(\w+)/.exec(line);
    if (cls) {
      const exported = !cls[1].startsWith('_');
      symbols.push({ name: cls[1], kind: 'class', line: lineNum, exported });
      continue;
    }

    const variable = /^([A-Z][A-Z_0-9]+)\s*=/.exec(line);
    if (variable) {
      symbols.push({ name: variable[1], kind: 'const', line: lineNum, exported: true });
    }
  }

  return symbols;
};

const extractGo: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const fn = /^func\s+(?:\([^)]*\)\s+)?(\w+)/.exec(line);
    if (fn) {
      const exported = fn[1][0] === fn[1][0].toUpperCase() && fn[1][0] !== fn[1][0].toLowerCase();
      symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported });
      continue;
    }

    const typeDecl = /^type\s+(\w+)\s+(struct|interface)/.exec(line);
    if (typeDecl) {
      const kind = typeDecl[2] === 'struct' ? 'struct' as const : 'interface' as const;
      const exported = typeDecl[1][0] === typeDecl[1][0].toUpperCase() && typeDecl[1][0] !== typeDecl[1][0].toLowerCase();
      symbols.push({ name: typeDecl[1], kind, line: lineNum, exported });
      continue;
    }

    const typeAlias = /^type\s+(\w+)\s+/.exec(line);
    if (typeAlias && !typeDecl) {
      const exported = typeAlias[1][0] === typeAlias[1][0].toUpperCase() && typeAlias[1][0] !== typeAlias[1][0].toLowerCase();
      symbols.push({ name: typeAlias[1], kind: 'type', line: lineNum, exported });
    }
  }

  return symbols;
};

const extractRust: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const pubFn = /^pub\s+(?:async\s+)?fn\s+(\w+)/.exec(line);
    if (pubFn) { symbols.push({ name: pubFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const fn = /^(?:async\s+)?fn\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: false }); continue; }

    const pubStruct = /^pub\s+struct\s+(\w+)/.exec(line);
    if (pubStruct) { symbols.push({ name: pubStruct[1], kind: 'struct', line: lineNum, exported: true }); continue; }

    const struct = /^struct\s+(\w+)/.exec(line);
    if (struct) { symbols.push({ name: struct[1], kind: 'struct', line: lineNum, exported: false }); continue; }

    const pubEnum = /^pub\s+enum\s+(\w+)/.exec(line);
    if (pubEnum) { symbols.push({ name: pubEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    const enumDecl = /^enum\s+(\w+)/.exec(line);
    if (enumDecl) { symbols.push({ name: enumDecl[1], kind: 'enum', line: lineNum, exported: false }); continue; }

    const pubTrait = /^pub\s+trait\s+(\w+)/.exec(line);
    if (pubTrait) { symbols.push({ name: pubTrait[1], kind: 'trait', line: lineNum, exported: true }); continue; }

    const traitDecl = /^trait\s+(\w+)/.exec(line);
    if (traitDecl) { symbols.push({ name: traitDecl[1], kind: 'trait', line: lineNum, exported: false }); continue; }

    const pubType = /^pub\s+type\s+(\w+)/.exec(line);
    if (pubType) { symbols.push({ name: pubType[1], kind: 'type', line: lineNum, exported: true }); continue; }

    const typeDecl = /^type\s+(\w+)/.exec(line);
    if (typeDecl) { symbols.push({ name: typeDecl[1], kind: 'type', line: lineNum, exported: false }); continue; }
  }

  return symbols;
};

const extractJava: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const pubClass = /^public\s+(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (pubClass) { symbols.push({ name: pubClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const classDecl = /^(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (classDecl) { symbols.push({ name: classDecl[1], kind: 'class', line: lineNum, exported: false }); continue; }

    const pubInterface = /^public\s+interface\s+(\w+)/.exec(line);
    if (pubInterface) { symbols.push({ name: pubInterface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const interfaceDecl = /^interface\s+(\w+)/.exec(line);
    if (interfaceDecl) { symbols.push({ name: interfaceDecl[1], kind: 'interface', line: lineNum, exported: false }); continue; }

    const pubEnum = /^public\s+enum\s+(\w+)/.exec(line);
    if (pubEnum) { symbols.push({ name: pubEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    const enumDecl = /^enum\s+(\w+)/.exec(line);
    if (enumDecl) { symbols.push({ name: enumDecl[1], kind: 'enum', line: lineNum, exported: false }); continue; }

    const pubMethod = /^public\s+(?:static\s+)?\w+[<>,\s\[\]]*\s+(\w+)\s*\(/.exec(line);
    if (pubMethod) { symbols.push({ name: pubMethod[1], kind: 'method', line: lineNum, exported: true }); continue; }

    const methodDecl = /^(?:private|protected)?\s*(?:static\s+)?\w+[<>,\s\[\]]*\s+(\w+)\s*\(/.exec(line);
    if (methodDecl && !['if', 'for', 'while', 'switch', 'catch'].includes(methodDecl[1])) {
      symbols.push({ name: methodDecl[1], kind: 'method', line: lineNum, exported: false });
    }
  }

  return symbols;
};

const extractKotlin: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const pubClass = /^public\s+(?:data\s+)?class\s+(\w+)/.exec(line);
    if (pubClass) { symbols.push({ name: pubClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const classDecl = /^(?:data\s+)?class\s+(\w+)/.exec(line);
    if (classDecl) { symbols.push({ name: classDecl[1], kind: 'class', line: lineNum, exported: false }); continue; }

    const pubInterface = /^public\s+interface\s+(\w+)/.exec(line);
    if (pubInterface) { symbols.push({ name: pubInterface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const interfaceDecl = /^interface\s+(\w+)/.exec(line);
    if (interfaceDecl) { symbols.push({ name: interfaceDecl[1], kind: 'interface', line: lineNum, exported: false }); continue; }

    const pubFn = /^public\s+fun\s+(\w+)/.exec(line);
    if (pubFn) { symbols.push({ name: pubFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const fn = /^fun\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: false }); continue; }
  }

  return symbols;
};

const extractRuby: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const cls = /^class\s+(\w+)/.exec(line);
    if (cls) { symbols.push({ name: cls[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const moduleDecl = /^module\s+(\w+)/.exec(line);
    if (moduleDecl) { symbols.push({ name: moduleDecl[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const fn = /^def\s+(self\.)?(\w+)/.exec(line);
    if (fn) {
      const name = fn[1] ? `self.${fn[2]}` : fn[2];
      const exported = !fn[2].startsWith('_');
      symbols.push({ name, kind: 'method', line: lineNum, exported });
    }
  }

  return symbols;
};

const extractCSharp: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const pubClass = /^public\s+(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (pubClass) { symbols.push({ name: pubClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const classDecl = /^(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (classDecl) { symbols.push({ name: classDecl[1], kind: 'class', line: lineNum, exported: false }); continue; }

    const pubInterface = /^public\s+interface\s+(\w+)/.exec(line);
    if (pubInterface) { symbols.push({ name: pubInterface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const interfaceDecl = /^interface\s+(\w+)/.exec(line);
    if (interfaceDecl) { symbols.push({ name: interfaceDecl[1], kind: 'interface', line: lineNum, exported: false }); continue; }

    const pubEnum = /^public\s+enum\s+(\w+)/.exec(line);
    if (pubEnum) { symbols.push({ name: pubEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    const enumDecl = /^enum\s+(\w+)/.exec(line);
    if (enumDecl) { symbols.push({ name: enumDecl[1], kind: 'enum', line: lineNum, exported: false }); continue; }

    const pubMethod = /^public\s+(?:static\s+)?[\w<>\[\],\s]+\s+(\w+)\s*\(/.exec(line);
    if (pubMethod) { symbols.push({ name: pubMethod[1], kind: 'method', line: lineNum, exported: true }); continue; }

    const methodDecl = /^(?:private|protected|internal)?\s*(?:static\s+)?[\w<>\[\],\s]+\s+(\w+)\s*\(/.exec(line);
    if (methodDecl && !['if', 'for', 'while', 'switch', 'catch'].includes(methodDecl[1])) {
      symbols.push({ name: methodDecl[1], kind: 'method', line: lineNum, exported: false });
    }
  }

  return symbols;
};

const extractSwift: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const pubClass = /^(?:public|open)\s+class\s+(\w+)/.exec(line);
    if (pubClass) { symbols.push({ name: pubClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const classDecl = /^class\s+(\w+)/.exec(line);
    if (classDecl) { symbols.push({ name: classDecl[1], kind: 'class', line: lineNum, exported: false }); continue; }

    const pubStruct = /^(?:public|open)\s+struct\s+(\w+)/.exec(line);
    if (pubStruct) { symbols.push({ name: pubStruct[1], kind: 'struct', line: lineNum, exported: true }); continue; }

    const structDecl = /^struct\s+(\w+)/.exec(line);
    if (structDecl) { symbols.push({ name: structDecl[1], kind: 'struct', line: lineNum, exported: false }); continue; }

    const pubProtocol = /^(?:public|open)\s+protocol\s+(\w+)/.exec(line);
    if (pubProtocol) { symbols.push({ name: pubProtocol[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const protocolDecl = /^protocol\s+(\w+)/.exec(line);
    if (protocolDecl) { symbols.push({ name: protocolDecl[1], kind: 'interface', line: lineNum, exported: false }); continue; }

    const pubFn = /^(?:public|open)\s+func\s+(\w+)/.exec(line);
    if (pubFn) { symbols.push({ name: pubFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const fn = /^func\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: false }); continue; }
  }

  return symbols;
};

const extractPHP: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const cls = /^class\s+(\w+)/.exec(line);
    if (cls) { symbols.push({ name: cls[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const iface = /^interface\s+(\w+)/.exec(line);
    if (iface) { symbols.push({ name: iface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const traitDecl = /^trait\s+(\w+)/.exec(line);
    if (traitDecl) { symbols.push({ name: traitDecl[1], kind: 'trait', line: lineNum, exported: true }); continue; }

    const fn = /^function\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const method = /^(?:public|private|protected)\s+function\s+(\w+)/.exec(line);
    if (method) {
      const exported = line.startsWith('public');
      symbols.push({ name: method[1], kind: 'method', line: lineNum, exported });
    }
  }

  return symbols;
};

const extractScala: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const cls = /^(?:case\s+)?class\s+(\w+)/.exec(line);
    if (cls) { symbols.push({ name: cls[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const traitDecl = /^trait\s+(\w+)/.exec(line);
    if (traitDecl) { symbols.push({ name: traitDecl[1], kind: 'trait', line: lineNum, exported: true }); continue; }

    const objectDecl = /^object\s+(\w+)/.exec(line);
    if (objectDecl) { symbols.push({ name: objectDecl[1], kind: 'const', line: lineNum, exported: true }); continue; }

    const fn = /^def\s+(\w+)/.exec(line);
    if (fn) { symbols.push({ name: fn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const typeDecl = /^type\s+(\w+)/.exec(line);
    if (typeDecl) { symbols.push({ name: typeDecl[1], kind: 'type', line: lineNum, exported: true }); }
  }

  return symbols;
};

const extractElixir: SymbolExtractorV3 = (content) => {
  const symbols: CodeSymbolV3[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    const moduleDecl = /^defmodule\s+([A-Z]\w*(?:\.[A-Z]\w*)*)/.exec(line);
    if (moduleDecl) { symbols.push({ name: moduleDecl[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const pubFn = /^def\s+(\w+)/.exec(line);
    if (pubFn) { symbols.push({ name: pubFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const privFn = /^defp\s+(\w+)/.exec(line);
    if (privFn) { symbols.push({ name: privFn[1], kind: 'function', line: lineNum, exported: false }); continue; }
  }

  return symbols;
};

const EXTRACTORS: Record<string, SymbolExtractorV3> = {
  TypeScript: extractTypeScript,
  JavaScript: extractTypeScript,
  Python: extractPython,
  Go: extractGo,
  Rust: extractRust,
  Java: extractJava,
  Kotlin: extractKotlin,
  Ruby: extractRuby,
  'C#': extractCSharp,
  Swift: extractSwift,
  PHP: extractPHP,
  Scala: extractScala,
  Elixir: extractElixir,
};

const GENERATED_DIRS = new Set(['.next', '.nuxt', '.svelte-kit', 'dist', 'build', 'out', '__pycache__', '.gradle']);
const VENDOR_DIRS = new Set(['node_modules', '.git', '.agent-vault', 'vendor', '.venv', 'venv', '.idea', '.vscode', 'coverage', '.planning', '.obsidian']);

async function walkSourceFiles(
  projectRoot: string,
  dir: string,
  results: FileSymbolsV3[],
  depth = 0,
): Promise<void> {
  if (depth > 8) return;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walkSourceFiles(projectRoot, fullPath, results, depth + 1);
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = extname(entry.name);
    const language = LANGUAGE_EXTENSIONS[ext];
    if (!language) continue;

    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;

    try {
      const content = await readFile(fullPath, 'utf-8');
      if (content.length > 500_000) continue;

      const extractor = EXTRACTORS[language];
      if (!extractor) continue;

      const symbols = extractor(content);
      if (symbols.length > 0) {
        const relativePath = relative(projectRoot, fullPath).replace(/\\/g, '/');
        const fileStats = await stat(fullPath);
        const hash = createHash('sha256').update(content).digest('hex');

        // Determine flags
        const rel = relative(projectRoot, dir).replace(/\\/g, '/');
        const genArray = [...GENERATED_DIRS];
        const vendArray = [...VENDOR_DIRS];
        const generated = GENERATED_DIRS.has(rel) || genArray.some((d: string) => relativePath.includes('/' + d + '/'));
        const vendor = VENDOR_DIRS.has(rel) || vendArray.some((d: string) => relativePath.includes('/' + d + '/'));

        let fileResult: FileSymbolsV3 = {
          path: relativePath,
          language,
          symbols,
          hash,
          mtimeMs: fileStats.mtimeMs,
          size: fileStats.size,
          generated,
          vendor,
        };

        // Only extract import/export edges for TS/JS
        if (language === 'TypeScript' || language === 'JavaScript') {
          fileResult = {
            ...fileResult,
            imports: extractImportEdges(content),
            exports: extractExportEdges(content),
          };
        }

        results.push(fileResult);
      }
    } catch {
      // Skip unreadable files
    }
  }
}

export async function buildCodeGraph(projectRoot: string): Promise<CodeGraphResult> {
  const files: FileSymbolsV3[] = [];
  await walkSourceFiles(projectRoot, projectRoot, files);

  files.sort((a, b) => a.path.localeCompare(b.path));
  const totalSymbols = files.reduce((sum, f) => sum + f.symbols.length, 0);

  return { files, totalFiles: files.length, totalSymbols };
}

export function summarizeCodeGraph(graph: CodeGraphResult): CodeGraphDirectorySummary[] {
  const byDirectory = new Map<string, CodeGraphDirectorySummary>();

  for (const file of graph.files) {
    const directory = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '.';
    const exportedSymbols = file.symbols.filter((symbol) => symbol.exported).length;
    const internalSymbols = file.symbols.length - exportedSymbols;
    const existing = byDirectory.get(directory) ?? {
      directory,
      files: 0,
      exportedSymbols: 0,
      internalSymbols: 0,
      totalSymbols: 0,
    };

    byDirectory.set(directory, {
      directory,
      files: existing.files + 1,
      exportedSymbols: existing.exportedSymbols + exportedSymbols,
      internalSymbols: existing.internalSymbols + internalSymbols,
      totalSymbols: existing.totalSymbols + file.symbols.length,
    });
  }

  return Array.from(byDirectory.values()).sort((left, right) => {
    if (right.totalSymbols !== left.totalSymbols) return right.totalSymbols - left.totalSymbols;
    return left.directory.localeCompare(right.directory);
  });
}

export function buildCodeGraphIndexPayloadV3(graph: CodeGraphResult, root: string, generatedAt = new Date().toISOString()): CodeGraphIndexV3 {
  return {
    version: 3,
    generatedAt,
    root,
    files: graph.files,
  };
}

// Keep v2 for backward compatibility (used by older lookups)
export function buildCodeGraphIndexPayload(graph: CodeGraphResult, repoName: string, generatedAt = new Date().toISOString()): CodeGraphIndexPayload {
  return {
    version: 2,
    generatedAt,
    repoName,
    totalFiles: graph.totalFiles,
    totalSymbols: graph.totalSymbols,
    directories: summarizeCodeGraph(graph),
    files: graph.files.map(f => ({ path: f.path, language: f.language, symbols: f.symbols })),
  };
}

export function renderCodeGraphMarkdown(graph: CodeGraphResult, repoName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const directories = summarizeCodeGraph(graph).slice(0, 8);

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
    `- Provide a low-cost navigation summary for the indexed codebase.`,
    `- Keep default vault context small while preserving machine-readable symbol lookup.`,
    `- Point agents and engineers to the generated JSON index when detailed symbol data is needed.`,
    ``,
    `## Overview`,
    ``,
    `- Repository: ${repoName}`,
    `- Files indexed: ${graph.totalFiles}`,
    `- Symbols found: ${graph.totalSymbols}`,
    `- Detailed index path: \`.agent-vault/08_Automation/code-graph/index.json\``,
    ``,
    `## Key Components`,
    ``,
    `- The markdown note is intentionally thin and should stay safe to include in routine vault traversals.`,
    `- The JSON index is the source for detailed symbol-to-file lookup.`,
    `- Directory summaries below show where most indexed code lives without inlining the full symbol table.`,
    ``,
    `## Important Paths`,
    ``,
    `- \`.agent-vault/01_Architecture/Code_Graph.md\` — compact human summary.`,
    `- \`.agent-vault/08_Automation/code-graph/index.json\` — full machine-readable index.`,
    ``,
    `## Constraints`,
    ``,
    `- Auto-generated during vault initialization and \`vault_refresh target=code_graph\`; do not hand-edit.`,
    `- This note must remain concise; full symbol dumps belong only in the JSON index.`,
    `- Files larger than 500 KB and common generated/test files are excluded.`,
    ``,
    `## Failure Modes`,
    ``,
    `- If source files are added outside the supported language set, they will not appear in the index.`,
    `- If the JSON index is stale, refresh the code graph before using it for lookup-heavy tasks.`,
    `- Deeply nested files (beyond 8 levels) are skipped.`,
    ``,
    `## How to Use`,
    ``,
    `1. Read this note first for a cheap overview.`,
    `2. For low-cost symbol/file discovery, use \`vault_lookup_code_graph\` instead of loading the full JSON index into prompt context.`,
    `3. Read the JSON index directly only for tooling or explicit offline inspection.`,
    `4. Use lookup results to narrow to a small set of source files before reading code.`,
    ``,
    `## Directory Hotspots`,
    ``,

  ];

  if (directories.length === 0) {
    sections.push(`- No indexed source files were found.`, ``);
  } else {
    for (const directory of directories) {
      sections.push(`- \`${directory.directory}\`: ${directory.files} files, ${directory.exportedSymbols} exported symbols, ${directory.internalSymbols} internal symbols`);
    }
    sections.push('');
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

export async function writeCodeGraph(
  projectRoot: string,
  vaultRoot: string,
  repoName: string,
): Promise<CodeGraphResult> {
  const graph = await buildCodeGraph(projectRoot);
  const markdown = renderCodeGraphMarkdown(graph, repoName);
  const indexPayload = buildCodeGraphIndexPayloadV3(graph, projectRoot);

  const outputPath = join(vaultRoot, '01_Architecture', 'Code_Graph.md');
  const indexDir = join(vaultRoot, '08_Automation', 'code-graph');
  const indexPath = join(indexDir, 'index.json');

  await mkdir(join(vaultRoot, '01_Architecture'), { recursive: true });
  await mkdir(indexDir, { recursive: true });
  await writeFile(outputPath, markdown, 'utf-8');
  await writeFile(indexPath, JSON.stringify(indexPayload, null, 2) + '\n', 'utf-8');
  return graph;
}

export function findSymbols(
  graph: CodeGraphResult,
  query: string,
): Array<{ file: string; symbol: CodeSymbolV3 }> {
  const results: Array<{ file: string; symbol: CodeSymbolV3 }> = [];
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

export function getSymbolsForFiles(
  graph: CodeGraphResult,
  filePaths: string[],
): Map<string, CodeSymbolV3[]> {
  const result = new Map<string, CodeSymbolV3[]>();

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
