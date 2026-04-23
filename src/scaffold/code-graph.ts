import { mkdir, readFile, readdir, writeFile } from 'fs/promises';
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

type SymbolExtractor = (content: string) => CodeSymbol[];

const extractTypeScript: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const exportFn = /^export\s+(?:async\s+)?function\s+(\w+)/m.exec(line);
    if (exportFn) { symbols.push({ name: exportFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const exportClass = /^export\s+(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (exportClass) { symbols.push({ name: exportClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const exportInterface = /^export\s+interface\s+(\w+)/.exec(line);
    if (exportInterface) { symbols.push({ name: exportInterface[1], kind: 'interface', line: lineNum, exported: true }); continue; }

    const exportType = /^export\s+type\s+(\w+)/.exec(line);
    if (exportType) { symbols.push({ name: exportType[1], kind: 'type', line: lineNum, exported: true }); continue; }

    const destructuredExport = /^export\s+(?:const|let|var)\s+\{([^}]+)\}/.exec(line);
    if (destructuredExport) {
      for (const name of parseNamesFromBraces(destructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    const arrayDestructuredExport = /^export\s+(?:const|let|var)\s+\[([^\]]+)\]/.exec(line);
    if (arrayDestructuredExport) {
      for (const name of parseNamesFromBraces(arrayDestructuredExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    const exportConst = /^export\s+(?:const|let|var)\s+(\w+)/.exec(line);
    if (exportConst) { symbols.push({ name: exportConst[1], kind: 'const', line: lineNum, exported: true }); continue; }

    const exportEnum = /^export\s+enum\s+(\w+)/.exec(line);
    if (exportEnum) { symbols.push({ name: exportEnum[1], kind: 'enum', line: lineNum, exported: true }); continue; }

    const exportDefaultFn = /^export\s+default\s+(?:async\s+)?function\s+(\w+)/.exec(line);
    if (exportDefaultFn) { symbols.push({ name: exportDefaultFn[1], kind: 'function', line: lineNum, exported: true }); continue; }

    const exportDefaultClass = /^export\s+default\s+class\s+(\w+)/.exec(line);
    if (exportDefaultClass) { symbols.push({ name: exportDefaultClass[1], kind: 'class', line: lineNum, exported: true }); continue; }

    const reExport = /^export\s+\{([^}]+)\}/.exec(line);
    if (reExport) {
      for (const name of parseNamesFromBraces(reExport[1])) {
        symbols.push({ name, kind: 'const', line: lineNum, exported: true });
      }
      continue;
    }

    const topFn = /^(?:async\s+)?function\s+(\w+)/.exec(line);
    if (topFn) { symbols.push({ name: topFn[1], kind: 'function', line: lineNum, exported: false }); continue; }

    const topConst = /^const\s+(\w+)\s*(?::\s*\S+)?\s*=/.exec(line);
    if (topConst) { symbols.push({ name: topConst[1], kind: 'const', line: lineNum, exported: false }); continue; }

    const topClass = /^(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (topClass) { symbols.push({ name: topClass[1], kind: 'class', line: lineNum, exported: false }); continue; }

    const topInterface = /^interface\s+(\w+)/.exec(line);
    if (topInterface) { symbols.push({ name: topInterface[1], kind: 'interface', line: lineNum, exported: false }); continue; }

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

const extractGo: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractRust: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractJava: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractKotlin: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractRuby: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractCSharp: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractSwift: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractPHP: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractScala: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const extractElixir: SymbolExtractor = (content) => {
  const symbols: CodeSymbol[] = [];
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

const EXTRACTORS: Record<string, SymbolExtractor> = {
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

async function walkSourceFiles(
  projectRoot: string,
  dir: string,
  results: FileSymbols[],
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
        results.push({ path: relativePath, language, symbols });
      }
    } catch {
      // Skip unreadable files
    }
  }
}

export async function buildCodeGraph(projectRoot: string): Promise<CodeGraphResult> {
  const files: FileSymbols[] = [];
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

export function buildCodeGraphIndexPayload(graph: CodeGraphResult, repoName: string, generatedAt = new Date().toISOString()): CodeGraphIndexPayload {
  return {
    version: 2,
    generatedAt,
    repoName,
    totalFiles: graph.totalFiles,
    totalSymbols: graph.totalSymbols,
    directories: summarizeCodeGraph(graph),
    files: graph.files,
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
  const indexPayload = buildCodeGraphIndexPayload(graph, repoName);

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
