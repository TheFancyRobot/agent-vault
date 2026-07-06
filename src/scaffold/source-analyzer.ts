/**
 * Source Analyzer — parser abstraction with tiered fallback.
 *
 * Tier order:
 *   1. TypeScript compiler (optional dynamic import from host environment)
 *   2. Tree-sitter (optional dependency, wasm-based web-tree-sitter)
 *   3. Regex (always available, wraps existing extractors from code-graph.ts)
 *
 * Parser errors never break vault_refresh: failures downgrade per-file with
 * recorded warnings.
 */


// ─── Types ───────────────────────────────────────────────────────────────────

export type AnalysisTier = 'typescript-compiler' | 'tree-sitter' | 'regex';

export interface AnalyzedSymbol {
  readonly name: string;
  readonly kind: 'function' | 'class' | 'type' | 'interface' | 'const' | 'variable' | 'enum' | 'struct' | 'trait' | 'method';
  readonly line: number;
  readonly endLine?: number;
  readonly exported: boolean;
  readonly signature?: string;
  readonly doc?: string;
  readonly parentName?: string;
}

export interface AnalyzedImport {
  readonly source: string;
  readonly specifier: string;
  readonly imported?: string[];
  readonly resolvedPath?: string;
  readonly kind?: 'static' | 'dynamic' | 'type';
}

export interface AnalyzedExport {
  readonly name?: string;
  readonly source?: string;
  readonly resolvedPath?: string;
  readonly kind?: 'named' | 'default' | 'namespace' | 'reexport';
}

export interface AnalysisResult {
  readonly symbols: AnalyzedSymbol[];
  readonly imports: AnalyzedImport[];
  readonly exports: AnalyzedExport[];
  readonly tier: AnalysisTier;
  readonly warnings: string[];
}

export interface SourceAnalyzer {
  /**
   * Analyze a source file's content.
   * Returns AnalysisResult or null if this analyzer cannot handle the file.
   */
  analyze(filePath: string, content: string, language: string): Promise<AnalysisResult | null>;

  /**
   * Whether this analyzer is available in the current environment.
   */
  isAvailable(): Promise<boolean>;
}

// ─── Regex Analyzer (Tier 3 — always available) ─────────────────────────────

/**
 * Wraps the existing regex-based extractors from code-graph.ts.
 * This is the always-available final fallback tier.
 */
export class RegexAnalyzer implements SourceAnalyzer {
  private readonly tsExtractor: (content: string) => AnalyzedSymbol[];
  private readonly otherExtractors: Record<string, (content: string) => AnalyzedSymbol[]>;
  private readonly importExtractor: (content: string) => AnalyzedImport[];
  private readonly exportExtractor: (content: string) => AnalyzedExport[];

  constructor(
    extractors: {
      typescript: (content: string) => AnalyzedSymbol[];
      other: Record<string, (content: string) => AnalyzedSymbol[]>;
      imports: (content: string) => AnalyzedImport[];
      exports: (content: string) => AnalyzedExport[];
    }
  ) {
    this.tsExtractor = extractors.typescript;
    this.otherExtractors = extractors.other;
    this.importExtractor = extractors.imports;
    this.exportExtractor = extractors.exports;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async analyze(filePath: string, content: string, language: string): Promise<AnalysisResult> {
    const warnings: string[] = [];

    // Select extractor based on language
    const extractor = language === 'TypeScript' || language === 'JavaScript'
      ? this.tsExtractor
      : this.otherExtractors[language];

    if (!extractor) {
      return {
        symbols: [],
        imports: [],
        exports: [],
        tier: 'regex',
        warnings: [`No regex extractor for language: ${language}`],
      };
    }

    try {
      const symbols = extractor(content);

      // Extract import/export edges only for TS/JS
      let imports: AnalyzedImport[] = [];
      let exports: AnalyzedExport[] = [];
      if (language === 'TypeScript' || language === 'JavaScript') {
        imports = this.importExtractor(content);
        exports = this.exportExtractor(content);
      }

      return { symbols, imports, exports, tier: 'regex', warnings };
    } catch (err) {
      warnings.push(`Regex extraction error for ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
      return { symbols: [], imports: [], exports: [], tier: 'regex', warnings };
    }
  }
}

// ─── TypeScript Compiler Analyzer (Tier 1) ──────────────────────────────────

/**
 * Uses the TypeScript compiler API for high-fidelity extraction.
 * Loaded via optional dynamic import — `typescript` stays a devDependency
 * and is not promoted to a runtime dependency.
 */
export class TypeScriptCompilerAnalyzer implements SourceAnalyzer {
  private tsModule: typeof import('typescript') | null = null;
  private checked = false;

  async isAvailable(): Promise<boolean> {
    if (this.checked) return this.tsModule !== null;
    this.checked = true;
    try {
      this.tsModule = await import('typescript');
      return true;
    } catch {
      this.tsModule = null;
      return false;
    }
  }

  async analyze(filePath: string, content: string, language: string): Promise<AnalysisResult | null> {
    if (language !== 'TypeScript' && language !== 'JavaScript') {
      return null; // Only handles TS/JS
    }

    const ts = await this.loadModule();
    if (!ts) return null;

    const warnings: string[] = [];

    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true, // setParentNodes
      );

      const symbols: AnalyzedSymbol[] = [];
      const imports: AnalyzedImport[] = [];
      const exports: AnalyzedExport[] = [];

      // Extract import declarations
      for (const statement of sourceFile.statements) {
        if (ts.isImportDeclaration(statement)) {
          this.extractImport(ts, statement, imports);
        }
      }

      // Extract export declarations (re-exports)
      for (const statement of sourceFile.statements) {
        if (ts.isExportDeclaration(statement)) {
          this.extractExport(ts, statement, exports);
        }
      }

      // Extract symbols from all statements
      for (const statement of sourceFile.statements) {
        this.extractSymbols(ts, sourceFile, statement, symbols, undefined);
      }

      return { symbols, imports, exports, tier: 'typescript-compiler', warnings };
    } catch (err) {
      warnings.push(`TypeScript compiler analysis error for ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
      return null; // Fall through to next tier
    }
  }

  private async loadModule(): Promise<typeof import('typescript') | null> {
    if (this.tsModule) return this.tsModule;
    try {
      this.tsModule = await import('typescript');
      return this.tsModule;
    } catch {
      return null;
    }
  }

  private extractImport(
    ts: typeof import('typescript'),
    node: import('typescript').ImportDeclaration,
    imports: AnalyzedImport[],
  ): void {
    const specifier = ts.isStringLiteral(node.moduleSpecifier)
      ? node.moduleSpecifier.text
      : undefined;
    if (!specifier) return;

    // Check if it's a type-only import
    const isTypeOnly = node.importClause?.isTypeOnly ?? false;

    if (node.importClause) {
      const clause = node.importClause;

      // Named imports: import { a, b } from 'x'
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        const names = clause.namedBindings.elements.map(el => {
          return el.propertyName ? el.propertyName.text : el.name.text;
        });
        imports.push({
          source: clause.name?.text ?? '',
          specifier,
          imported: names,
          kind: isTypeOnly ? 'type' : 'static',
        });
        return;
      }

      // Namespace import: import * as x from 'y'
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        imports.push({
          source: clause.namedBindings.name.text,
          specifier,
          kind: isTypeOnly ? 'type' : 'static',
        });
        return;
      }

      // Default import: import x from 'y'
      if (clause.name) {
        imports.push({
          source: clause.name.text,
          specifier,
          imported: [clause.name.text],
          kind: isTypeOnly ? 'type' : 'static',
        });
        return;
      }
    }

    // Side-effect import: import 'x'
    imports.push({
      source: '',
      specifier,
      kind: 'static',
    });
  }

  private extractExport(
    ts: typeof import('typescript'),
    node: import('typescript').ExportDeclaration,
    exports: AnalyzedExport[],
  ): void {
    // export * from 'x'
    if (!node.exportClause && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      exports.push({
        name: '*',
        source: node.moduleSpecifier.text,
        kind: 'namespace',
      });
      return;
    }

    // export { a, b } from 'x'
    if (node.exportClause && ts.isNamedExports(node.exportClause) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const names = node.exportClause.elements.map(el => {
        return el.propertyName ? el.propertyName.text : el.name.text;
      });
      exports.push({
        name: names.join(', '),
        source: node.moduleSpecifier.text,
        kind: 'reexport',
      });
    }
  }

  private extractSymbols(
    ts: typeof import('typescript'),
    sourceFile: import('typescript').SourceFile,
    node: import('typescript').Statement,
    symbols: AnalyzedSymbol[],
    parentName: string | undefined,
  ): void {
    const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const line = startLine + 1;
    const end = endLine + 1;

    // Get JSDoc comment
    const doc = this.extractJSDoc(ts, node, sourceFile);

    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const exported = this.isExported(ts, node);
      const signature = this.buildFunctionSignature(ts, node);
      symbols.push({
        name: node.name.text,
        kind: 'function',
        line,
        endLine: end,
        exported,
        signature,
        doc,
        parentName,
      });
      return;
    }

    // Class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const exported = this.isExported(ts, node);
      symbols.push({
        name: node.name.text,
        kind: 'class',
        line,
        endLine: end,
        exported,
        doc,
        parentName,
      });
      // Note: We intentionally do NOT extract class members here to match
      // the regex extractor's behavior and maintain compatibility with
      // existing tests. Class members can be extracted separately if needed.
      return;
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const exported = this.hasExportModifier(ts, node);
      symbols.push({
        name: node.name.text,
        kind: 'interface',
        line,
        endLine: end,
        exported,
        doc,
        parentName,
      });
      return;
    }

    // Type alias declarations
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      const exported = this.hasExportModifier(ts, node);
      symbols.push({
        name: node.name.text,
        kind: 'type',
        line,
        endLine: end,
        exported,
        doc,
        parentName,
      });
      return;
    }

    // Enum declarations
    if (ts.isEnumDeclaration(node) && node.name) {
      const exported = this.hasExportModifier(ts, node);
      symbols.push({
        name: node.name.text,
        kind: 'enum',
        line,
        endLine: end,
        exported,
        doc,
        parentName,
      });
      return;
    }

    // Variable statements: export const/let/var
    if (ts.isVariableStatement(node)) {
      const exported = this.hasExportModifier(ts, node);
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const kind = this.inferVariableKind(ts, decl);
          symbols.push({
            name: decl.name.text,
            kind,
            line,
            endLine: end,
            exported,
            doc,
            parentName,
          });
        } else if (ts.isObjectBindingPattern(decl.name)) {
          // Destructured export: export const { a, b } = ...
          for (const element of decl.name.elements) {
            if (ts.isIdentifier(element.name)) {
              symbols.push({
                name: element.name.text,
                kind: 'const',
                line,
                endLine: end,
                exported,
                parentName,
              });
            }
          }
        } else if (ts.isArrayBindingPattern(decl.name)) {
          // Array destructured export: export const [a, b] = ...
          for (const element of decl.name.elements) {
            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
              symbols.push({
                name: element.name.text,
                kind: 'const',
                line,
                endLine: end,
                exported,
                parentName,
              });
            }
          }
        }
      }
      return;
    }

    // Export default
    if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        symbols.push({
          name: node.expression.text,
          kind: 'const',
          line,
          endLine: end,
          exported: true,
          parentName,
        });
      } else {
        symbols.push({
          name: 'default',
          kind: 'const',
          line,
          endLine: end,
          exported: true,
          parentName,
        });
      }
      return;
    }

    // Export declarations: export { foo, bar } and export { foo, bar } from './module'
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exportedName = element.name.text;
          symbols.push({
            name: exportedName,
            kind: 'const',
            line,
            endLine: end,
            exported: true,
            parentName,
          });
        }
      }
      return;
    }
  }

  // NOTE: Class member extraction (methods, properties, constructors) is intentionally
  // not implemented to match the regex extractor's behavior and maintain compatibility
  // with existing tests. To enable class member extraction in the future, add an
  // extractClassMember method and call it from the class declaration handler above.

  private isExported(ts: typeof import('typescript'), node: import('typescript').Node): boolean {
    if (!ts.canHaveModifiers(node)) return false;
    const modifiers = ts.getModifiers(node);
    if (!modifiers) return false;
    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  private hasExportModifier(ts: typeof import('typescript'), node: import('typescript').Node): boolean {
    return this.isExported(ts, node);
  }

  private extractJSDoc(
    _ts: typeof import('typescript'),
    node: import('typescript').Node,
    _sourceFile: import('typescript').SourceFile,
  ): string | undefined {
    const jsDocs = (node as any).jsDoc as import('typescript').JSDoc[] | undefined;
    if (!jsDocs || jsDocs.length === 0) return undefined;

    const lastDoc = jsDocs[jsDocs.length - 1];
    if (lastDoc.comment) {
      if (typeof lastDoc.comment === 'string') {
        return lastDoc.comment;
      }
      // NodeArray of JSDocComment
      return lastDoc.comment.map((c: any) => c.text || '').join('');
    }
    return undefined;
  }

  private buildFunctionSignature(
    ts: typeof import('typescript'),
    node: import('typescript').FunctionDeclaration,
  ): string | undefined {
    const params = node.parameters.map(p => {
      const name = ts.isIdentifier(p.name) ? p.name.text : p.name.getText();
      const type = p.type ? `: ${p.type.getText()}` : '';
      const optional = p.questionToken ? '?' : '';
      const defaultVal = p.initializer ? ` = ...` : '';
      return `${name}${optional}${type}${defaultVal}`;
    });

    const typeParams = node.typeParameters
      ? `<${node.typeParameters.map(tp => tp.getText()).join(', ')}>`
      : '';

    const returnType = node.type ? `: ${node.type.getText()}` : '';
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
    const async = isAsync ? 'async ' : '';

    return `${async}${typeParams}(${params.join(', ')})${returnType}`;
  }

  private inferVariableKind(
    ts: typeof import('typescript'),
    decl: import('typescript').VariableDeclaration,
  ): 'const' | 'variable' {
    const parent = decl.parent;
    if (parent && ts.isVariableDeclarationList(parent)) {
      if (parent.flags & ts.NodeFlags.Const) return 'const';
      return 'variable';
    }
    return 'const';
  }
}

// ─── Tree-sitter Analyzer (Tier 2) ──────────────────────────────────────────

/**
 * Uses web-tree-sitter (wasm-based) for multi-language parsing.
 * Falls back gracefully when tree-sitter is not installed.
 */
export class TreeSitterAnalyzer implements SourceAnalyzer {
  private Parser: any = null;
  private parser: any = null;
  private languages: Map<string, any> = new Map();
  private checked = false;
  private initFailed = false;

  async isAvailable(): Promise<boolean> {
    if (this.checked) return this.parser !== null && !this.initFailed;
    this.checked = true;

    try {
      // @ts-expect-error - web-tree-sitter is an optional dependency
      const TreeSitter = await import('web-tree-sitter');
      await TreeSitter.default.init();
      this.Parser = TreeSitter.default;
      this.parser = new TreeSitter.default();
      return true;
    } catch {
      this.initFailed = true;
      return false;
    }
  }

  async analyze(_filePath: string, content: string, language: string): Promise<AnalysisResult | null> {
    if (this.initFailed) return null;

    const treeSitterLang = this.mapLanguage(language);
    if (!treeSitterLang) return null;

    try {
      const lang = await this.loadLanguage(treeSitterLang);
      if (!lang) return null;

      this.parser.setLanguage(lang);
      const tree = this.parser.parse(content);
      const root = tree.rootNode;

      const symbols = this.extractSymbols(root, content, language);
      const imports = language === 'TypeScript' || language === 'JavaScript'
        ? this.extractImports(root, content)
        : [];
      const exports = language === 'TypeScript' || language === 'JavaScript'
        ? this.extractExports(root, content)
        : [];

      tree.delete();

      return { symbols, imports, exports, tier: 'tree-sitter', warnings: [] };
    } catch (err) {
      return null; // Fall through to regex
    }
  }

  private mapLanguage(language: string): string | null {
    const map: Record<string, string> = {
      'TypeScript': 'typescript',
      'JavaScript': 'javascript',
      'Python': 'python',
      'Go': 'go',
      'Rust': 'rust',
      'Java': 'java',
      'Ruby': 'ruby',
      'C#': 'c_sharp',
      'PHP': 'php',
    };
    return map[language] ?? null;
  }

  private async loadLanguage(langName: string): Promise<any> {
    if (this.languages.has(langName)) return this.languages.get(langName);

    try {
      // Try to load the language wasm file
      const lang = await this.Parser.Language.load(`${langName}.wasm`);
      this.languages.set(langName, lang);
      return lang;
    } catch {
      // Language wasm not available
      return null;
    }
  }

  private extractSymbols(root: any, content: string, language: string): AnalyzedSymbol[] {
    const symbols: AnalyzedSymbol[] = [];
    const lines = content.split('\n');

    // Generic tree-sitter symbol extraction
    // This is a simplified extraction — tree-sitter gives us accurate line ranges
    const visit = (node: any, parentName?: string) => {
      const kind = this.mapNodeKind(node, language);
      if (kind) {
        const name = this.extractNodeName(node, language);
        if (name) {
          const exported = this.isNodeExported(node, language);
          const doc = this.extractDocComment(node, lines);
          symbols.push({
            name,
            kind: kind.kind,
            line: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            exported,
            doc,
            parentName,
          });
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          const newParent = kind?.kind === 'class' ? (this.extractNodeName(node, language) ?? undefined) : parentName;
          visit(child, newParent);
        }
      }
    };

    visit(root);
    return symbols;
  }

  private mapNodeKind(node: any, language: string): { kind: AnalyzedSymbol['kind'] } | null {
    const type = node.type;

    // TypeScript/JavaScript
    if (language === 'TypeScript' || language === 'JavaScript') {
      if (type === 'function_declaration' || type === 'generator_function_declaration') return { kind: 'function' };
      if (type === 'class_declaration') return { kind: 'class' };
      if (type === 'interface_declaration') return { kind: 'interface' };
      if (type === 'type_alias_declaration') return { kind: 'type' };
      if (type === 'enum_declaration') return { kind: 'enum' };
      if (type === 'lexical_declaration' || type === 'variable_declaration') return { kind: 'const' };
      if (type === 'method_definition') return { kind: 'method' };
      if (type === 'export_statement') {
        const decl = node.childForFieldName('declaration');
        if (decl) return this.mapNodeKind(decl, language);
      }
    }

    // Python
    if (language === 'Python') {
      if (type === 'function_definition') return { kind: 'function' };
      if (type === 'class_definition') return { kind: 'class' };
    }

    // Go
    if (language === 'Go') {
      if (type === 'function_declaration' || type === 'method_declaration') return { kind: 'function' };
      if (type === 'type_declaration') return { kind: 'type' };
    }

    // Rust
    if (language === 'Rust') {
      if (type === 'function_item') return { kind: 'function' };
      if (type === 'struct_item') return { kind: 'struct' };
      if (type === 'enum_item') return { kind: 'enum' };
      if (type === 'trait_item') return { kind: 'trait' };
      if (type === 'type_item') return { kind: 'type' };
    }

    return null;
  }

  private extractNodeName(node: any, _language: string): string | null {
    // Try common field names
    const nameNode = node.childForFieldName('name');
    if (nameNode) return nameNode.text;

    // Fallback: look for identifier child
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'identifier') return child.text;
      if (child && child.type === 'type_identifier') return child.text;
    }

    return null;
  }

  private isNodeExported(node: any, language: string): boolean {
    const text = node.text || '';
    if (language === 'TypeScript' || language === 'JavaScript') {
      return text.startsWith('export');
    }
    if (language === 'Python') {
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.text) {
        return !nameNode.text.startsWith('_');
      }
    }
    if (language === 'Go') {
      // Go exports by identifier capitalization, not a keyword.
      const name = this.extractNodeName(node, language);
      return name ? /^[A-Z]/.test(name) : false;
    }
    if (language === 'Rust') {
      return text.startsWith('pub ') || text.startsWith('pub(');
    }
    return false;
  }

  private extractDocComment(node: any, _lines: string[]): string | undefined {
    // Look for a comment node immediately before this node
    const prev = node.previousSibling;
    if (prev && (prev.type === 'comment' || prev.type === 'jsdoc_comment')) {
      const text = prev.text || '';
      // Extract JSDoc content
      const match = /^\/\*\*[\s\S]*?\*\//.exec(text);
      if (match) {
        return match[0]
          .replace(/^\/\*\*\s*/, '')
          .replace(/\s*\*\/$/, '')
          .split('\n')
          .map(l => l.replace(/^\s*\*\s?/, '').trim())
          .filter(l => l.length > 0)
          .join('\n');
      }
    }
    return undefined;
  }

  private extractImports(_root: any, _content: string): AnalyzedImport[] {
    // Simplified import extraction via tree-sitter
    // The regex extractor handles this well enough; tree-sitter tier focuses on symbols
    return [];
  }

  private extractExports(_root: any, _content: string): AnalyzedExport[] {
    // Simplified export extraction via tree-sitter
    return [];
  }
}

// ─── Tiered Source Analyzer ─────────────────────────────────────────────────

export interface TieredAnalyzerOptions {
  /**
   * Override the tier order. Default: ['typescript-compiler', 'tree-sitter', 'regex']
   */
  tierOrder?: AnalysisTier[];

  /**
   * Custom regex analyzer (if not provided, uses a no-op that always returns empty).
   */
  regexAnalyzer?: SourceAnalyzer;

  /**
   * Custom TypeScript compiler analyzer.
   */
  typescriptCompilerAnalyzer?: SourceAnalyzer;

  /**
   * Custom tree-sitter analyzer.
   */
  treeSitterAnalyzer?: SourceAnalyzer;
}

/**
 * Manages the tier chain: tries each analyzer in order, falling back on failure.
 * Records which tier produced each result and any warnings.
 */
export class TieredSourceAnalyzer implements SourceAnalyzer {
  private tiers: Map<AnalysisTier, SourceAnalyzer> = new Map();
  private tierOrder: AnalysisTier[];

  constructor(options: TieredAnalyzerOptions = {}) {
    this.tierOrder = options.tierOrder ?? ['typescript-compiler', 'tree-sitter', 'regex'];

    if (options.regexAnalyzer) {
      this.tiers.set('regex', options.regexAnalyzer);
    }
    if (options.typescriptCompilerAnalyzer) {
      this.tiers.set('typescript-compiler', options.typescriptCompilerAnalyzer);
    }
    if (options.treeSitterAnalyzer) {
      this.tiers.set('tree-sitter', options.treeSitterAnalyzer);
    }
  }

  /**
   * Register an analyzer for a specific tier.
   */
  registerTier(tier: AnalysisTier, analyzer: SourceAnalyzer): void {
    this.tiers.set(tier, analyzer);
  }

  async isAvailable(): Promise<boolean> {
    // The tiered analyzer is always available as long as regex fallback exists
    const regex = this.tiers.get('regex');
    return regex ? regex.isAvailable() : false;
  }

  async analyze(filePath: string, content: string, language: string): Promise<AnalysisResult> {
    const allWarnings: string[] = [];

    for (const tierName of this.tierOrder) {
      const analyzer = this.tiers.get(tierName);
      if (!analyzer) continue;

      try {
        const available = await analyzer.isAvailable();
        if (!available) {
          allWarnings.push(`Tier ${tierName} not available, trying next`);
          continue;
        }

        const result = await analyzer.analyze(filePath, content, language);
        if (result) {
          // Merge warnings from this tier with our tier-fallback warnings
          return {
            ...result,
            warnings: [...allWarnings, ...result.warnings],
          };
        }

        allWarnings.push(`Tier ${tierName} returned null for ${filePath}, trying next`);
      } catch (err) {
        allWarnings.push(`Tier ${tierName} threw for ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // All tiers failed — return empty result with warnings
    return {
      symbols: [],
      imports: [],
      exports: [],
      tier: 'regex', // Report as regex even if it failed
      warnings: [...allWarnings, `All analysis tiers failed for ${filePath}`],
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a fully-configured tiered analyzer with all three tiers.
 */
export function createTieredAnalyzer(
  regexExtractors: {
    typescript: (content: string) => AnalyzedSymbol[];
    other: Record<string, (content: string) => AnalyzedSymbol[]>;
    imports: (content: string) => AnalyzedImport[];
    exports: (content: string) => AnalyzedExport[];
  }
): TieredSourceAnalyzer {
  const regex = new RegexAnalyzer(regexExtractors);
  const tsCompiler = new TypeScriptCompilerAnalyzer();
  const treeSitter = new TreeSitterAnalyzer();

  return new TieredSourceAnalyzer({
    regexAnalyzer: regex,
    typescriptCompilerAnalyzer: tsCompiler,
    treeSitterAnalyzer: treeSitter,
  });
}
