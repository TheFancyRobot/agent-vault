import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  RegexAnalyzer,
  TypeScriptCompilerAnalyzer,
  TreeSitterAnalyzer,
  TieredSourceAnalyzer,
  createTieredAnalyzer,
  type AnalyzedSymbol,
  type AnalyzedImport,
  type AnalyzedExport,
} from '../src/scaffold/source-analyzer';
import { buildCodeGraph } from '../src/scaffold/code-graph';

const tempRoots: string[] = [];

const createTempProject = async (name: string): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), `agent-vault-source-analyzer-${name}-`));
  tempRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Source Analyzer', () => {
  describe('RegexAnalyzer', () => {
    it('extracts TypeScript symbols using regex', async () => {
      const content = `
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}

export class User {
  constructor(public name: string) {}
}

export interface Config {
  debug: boolean;
}

export const VERSION = '1.0.0';
`;

      const analyzer = new RegexAnalyzer({
        typescript: (content: string) => {
          const symbols: AnalyzedSymbol[] = [];
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const exportFn = /^export\s+function\s+(\w+)/.exec(line);
            if (exportFn) {
              symbols.push({ name: exportFn[1], kind: 'function', line: i + 1, exported: true });
            }
            const exportClass = /^export\s+class\s+(\w+)/.exec(line);
            if (exportClass) {
              symbols.push({ name: exportClass[1], kind: 'class', line: i + 1, exported: true });
            }
            const exportInterface = /^export\s+interface\s+(\w+)/.exec(line);
            if (exportInterface) {
              symbols.push({ name: exportInterface[1], kind: 'interface', line: i + 1, exported: true });
            }
            const exportConst = /^export\s+const\s+(\w+)/.exec(line);
            if (exportConst) {
              symbols.push({ name: exportConst[1], kind: 'const', line: i + 1, exported: true });
            }
          }
          return symbols;
        },
        other: {},
        imports: () => [],
        exports: () => [],
      });

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      expect(result!.tier).toBe('regex');
      expect(result!.symbols).toHaveLength(4);
      expect(result!.symbols.map(s => s.name)).toEqual(['hello', 'User', 'Config', 'VERSION']);
    });

    it('is always available', async () => {
      const analyzer = new RegexAnalyzer({
        typescript: () => [],
        other: {},
        imports: () => [],
        exports: () => [],
      });

      expect(await analyzer.isAvailable()).toBe(true);
    });
  });

  describe('TypeScriptCompilerAnalyzer', () => {
    it('extracts symbols with high fidelity when TypeScript is available', async () => {
      const content = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export class User {
  constructor(public id: number, public name: string) {}
  
  getDisplayName(): string {
    return this.name;
  }
}

export interface Config {
  debug: boolean;
  port: number;
}

export type Status = 'active' | 'inactive';

export const VERSION = '1.0.0';
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        // Skip if TypeScript is not available in the test environment
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      expect(result!.tier).toBe('typescript-compiler');
      expect(result!.symbols.length).toBeGreaterThan(0);

      // Check that we extracted the main symbols
      const names = result!.symbols.map(s => s.name);
      expect(names).toContain('greet');
      expect(names).toContain('User');
      expect(names).toContain('Config');
      expect(names).toContain('Status');
      expect(names).toContain('VERSION');
    });

    it('extracts class declarations but not members by default', async () => {
      const content = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
}
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      // Should extract the class but not its methods (to match regex behavior)
      const classes = result!.symbols.filter(s => s.kind === 'class');
      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe('Calculator');
      
      const methods = result!.symbols.filter(s => s.kind === 'method');
      expect(methods).toHaveLength(0);
    });

    it('extracts import edges', async () => {
      const content = `
import { readFile } from 'fs/promises';
import type { Config } from './config';
import * as path from 'path';
import defaultExport from './default';
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      expect(result!.imports.length).toBeGreaterThan(0);

      const specifiers = result!.imports.map(i => i.specifier);
      expect(specifiers).toContain('fs/promises');
      expect(specifiers).toContain('./config');
      expect(specifiers).toContain('path');
      expect(specifiers).toContain('./default');
    });

    it('returns null for non-TypeScript languages', async () => {
      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.py', 'def hello(): pass', 'Python');
      expect(result).toBeNull();
    });
  });

  describe('TreeSitterAnalyzer', () => {
    it('reports availability based on web-tree-sitter installation', async () => {
      const analyzer = new TreeSitterAnalyzer();
      const available = await analyzer.isAvailable();

      // This test just checks that the availability check doesn't throw
      expect(typeof available).toBe('boolean');
    });

    it('returns null for unsupported languages', async () => {
      const analyzer = new TreeSitterAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('Tree-sitter not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.xyz', 'unknown language', 'UnknownLanguage');
      expect(result).toBeNull();
    });
  });

  describe('TieredSourceAnalyzer', () => {
    it('tries tiers in order and falls back on failure', async () => {
      const analyzer = new TieredSourceAnalyzer();

      // Create a mock analyzer that always fails
      const failingAnalyzer = {
        async isAvailable() { return true; },
        async analyze() { return null; },
      };

      // Create a mock analyzer that succeeds
      const successAnalyzer = {
        async isAvailable() { return true; },
        async analyze() {
          return {
            symbols: [{ name: 'test', kind: 'const' as const, line: 1, exported: true }],
            imports: [],
            exports: [],
            tier: 'regex' as const,
            warnings: [],
          };
        },
      };

      analyzer.registerTier('typescript-compiler', failingAnalyzer);
      analyzer.registerTier('tree-sitter', failingAnalyzer);
      analyzer.registerTier('regex', successAnalyzer);

      const result = await analyzer.analyze('test.ts', 'const test = 1;', 'TypeScript');

      expect(result.tier).toBe('regex');
      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('test');
    });

    it('records warnings from failed tiers', async () => {
      const analyzer = new TieredSourceAnalyzer();

      const failingAnalyzer = {
        async isAvailable() { return false; },
        async analyze() { return null; },
      };

      const successAnalyzer = {
        async isAvailable() { return true; },
        async analyze() {
          return {
            symbols: [],
            imports: [],
            exports: [],
            tier: 'regex' as const,
            warnings: [],
          };
        },
      };

      analyzer.registerTier('typescript-compiler', failingAnalyzer);
      analyzer.registerTier('regex', successAnalyzer);

      const result = await analyzer.analyze('test.ts', '', 'TypeScript');

      expect(result.warnings.some(w => w.includes('not available'))).toBe(true);
    });

    it('uses the first available tier that succeeds', async () => {
      const analyzer = new TieredSourceAnalyzer();

      const tsCompilerAnalyzer = {
        async isAvailable() { return true; },
        async analyze() {
          return {
            symbols: [{ name: 'fromCompiler', kind: 'function' as const, line: 1, exported: true }],
            imports: [],
            exports: [],
            tier: 'typescript-compiler' as const,
            warnings: [],
          };
        },
      };

      analyzer.registerTier('typescript-compiler', tsCompilerAnalyzer);

      const result = await analyzer.analyze('test.ts', '', 'TypeScript');

      expect(result.tier).toBe('typescript-compiler');
      expect(result.symbols[0].name).toBe('fromCompiler');
    });
  });

  describe('createTieredAnalyzer', () => {
    it('creates a fully-configured analyzer with all three tiers', async () => {
      const analyzer = createTieredAnalyzer({
        typescript: () => [],
        other: {},
        imports: () => [],
        exports: () => [],
      });

      expect(analyzer).toBeInstanceOf(TieredSourceAnalyzer);
      expect(await analyzer.isAvailable()).toBe(true);
    });
  });

  describe('Integration with buildCodeGraph', () => {
    it('records parser tier in FileSymbolsV3', async () => {
      const root = await createTempProject('parser-tier');
      await writeFile(join(root, 'index.ts'), `
export function hello() {
  return 'Hello, world!';
}

export const VERSION = '1.0.0';
`, 'utf-8');

      const graph = await buildCodeGraph(root);

      expect(graph.files).toHaveLength(1);
      expect(graph.files[0].parser).toBeDefined();
      // Should be either 'typescript-compiler' or 'regex' depending on availability
      expect(['typescript-compiler', 'tree-sitter', 'regex']).toContain(graph.files[0].parser);
    });

    it('uses tiered analyzer for TypeScript files', async () => {
      const root = await createTempProject('ts-tiered');
      await writeFile(join(root, 'complex.ts'), `
export class User {
  constructor(public name: string) {}
  
  greet(): string {
    return \`Hello, \${this.name}!\`;
  }
}

export interface Config {
  debug: boolean;
}
`, 'utf-8');

      const graph = await buildCodeGraph(root);

      expect(graph.files).toHaveLength(1);
      expect(graph.files[0].parser).toBeDefined();
      expect(graph.files[0].symbols.length).toBeGreaterThan(0);
    });

    it('falls back to regex for non-TS/JS files', async () => {
      const root = await createTempProject('python-regex');
      await writeFile(join(root, 'main.py'), `
def hello():
    print("Hello, world!")

class User:
    def __init__(self, name):
        self.name = name
`, 'utf-8');

      const graph = await buildCodeGraph(root);

      expect(graph.files).toHaveLength(1);
      expect(graph.files[0].parser).toBe('regex');
      expect(graph.files[0].symbols.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('handles syntax errors gracefully', async () => {
      const content = `
export function broken( {
  // Missing closing paren
  return 1;
}
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      // TypeScript compiler should handle this gracefully (either parse or return null)
      const result = await analyzer.analyze('broken.ts', content, 'TypeScript');
      
      // Should not throw, should either return result or null
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('handles decorators', async () => {
      const content = `
@Component({
  selector: 'app-root',
})
export class AppComponent {
  title = 'app';
}

@Injectable()
export class MyService {
  getData() { return []; }
}
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      const names = result!.symbols.map(s => s.name);
      expect(names).toContain('AppComponent');
      expect(names).toContain('MyService');
    });

    it('handles multiline signatures', async () => {
      const content = `
export function processData(
  input: string,
  options: {
    debug?: boolean;
    timeout?: number;
  },
  callback: (result: any) => void
): Promise<void> {
  return Promise.resolve();
}
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      const fn = result!.symbols.find(s => s.name === 'processData');
      expect(fn).toBeDefined();
      expect(fn!.signature).toBeDefined();
    });

    it('handles type-only imports', async () => {
      const content = `
import type { Config } from './config';
import { readFile } from 'fs/promises';
`;

      const analyzer = new TypeScriptCompilerAnalyzer();
      const available = await analyzer.isAvailable();

      if (!available) {
        console.warn('TypeScript not available in test environment, skipping');
        return;
      }

      const result = await analyzer.analyze('test.ts', content, 'TypeScript');

      expect(result).not.toBeNull();
      expect(result!.imports.length).toBe(2);

      const typeImport = result!.imports.find(i => i.specifier === './config');
      expect(typeImport).toBeDefined();
      expect(typeImport!.kind).toBe('type');

      const regularImport = result!.imports.find(i => i.specifier === 'fs/promises');
      expect(regularImport).toBeDefined();
      expect(regularImport!.kind).toBe('static');
    });
  });
});
