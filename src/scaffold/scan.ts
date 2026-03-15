import { existsSync } from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { basename, extname, join } from 'path';

export interface ScanResult {
  readonly projectRoot: string;
  readonly repoName: string;
  readonly languages: Record<string, number>;
  readonly primaryLanguage: string;
  readonly frameworks: string[];
  readonly packageManager: string;
  readonly monorepo: boolean;
  readonly monorepoShape?: string;
  readonly keyDirectories: string[];
  readonly testFramework: string;
  readonly buildSystem: string;
  readonly ciSystem: string;
  readonly entryPoints: string[];
}

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
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.php': 'PHP',
  '.scala': 'Scala',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.clj': 'Clojure',
  '.hs': 'Haskell',
  '.lua': 'Lua',
  '.dart': 'Dart',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.agent-vault', 'dist', 'build', 'out',
  '.next', '.nuxt', '.svelte-kit', 'target', '__pycache__', '.venv',
  'venv', 'vendor', '.gradle', '.idea', '.vscode', 'coverage',
]);

const countFilesByExtension = async (dir: string, counts: Record<string, number>, depth = 0): Promise<void> => {
  if (depth > 5) return;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          await countFilesByExtension(join(dir, entry.name), counts, depth + 1);
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        const lang = LANGUAGE_EXTENSIONS[ext];
        if (lang) {
          counts[lang] = (counts[lang] ?? 0) + 1;
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }
};

const detectFrameworks = async (projectRoot: string): Promise<string[]> => {
  const frameworks: string[] = [];

  // Node.js / package.json based detection
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps.react) frameworks.push('React');
      if (allDeps.next) frameworks.push('Next.js');
      if (allDeps.vue) frameworks.push('Vue');
      if (allDeps.nuxt) frameworks.push('Nuxt');
      if (allDeps.svelte) frameworks.push('Svelte');
      if (allDeps.angular || allDeps['@angular/core']) frameworks.push('Angular');
      if (allDeps.express) frameworks.push('Express');
      if (allDeps.fastify) frameworks.push('Fastify');
      if (allDeps.hono) frameworks.push('Hono');
      if (allDeps.effect || allDeps['@effect/io']) frameworks.push('Effect');
      if (allDeps.django) frameworks.push('Django');
      if (allDeps.flask) frameworks.push('Flask');
      if (allDeps.electron) frameworks.push('Electron');
      if (allDeps.tailwindcss) frameworks.push('Tailwind CSS');
    } catch {
      // Invalid package.json
    }
  }

  // Rust
  if (existsSync(join(projectRoot, 'Cargo.toml'))) frameworks.push('Rust/Cargo');
  // Go
  if (existsSync(join(projectRoot, 'go.mod'))) frameworks.push('Go Modules');
  // Python
  if (existsSync(join(projectRoot, 'pyproject.toml'))) frameworks.push('Python (pyproject)');
  if (existsSync(join(projectRoot, 'setup.py'))) frameworks.push('Python (setuptools)');
  // Ruby
  if (existsSync(join(projectRoot, 'Gemfile'))) frameworks.push('Ruby (Bundler)');
  // Java/Kotlin
  if (existsSync(join(projectRoot, 'build.gradle')) || existsSync(join(projectRoot, 'build.gradle.kts'))) frameworks.push('Gradle');
  if (existsSync(join(projectRoot, 'pom.xml'))) frameworks.push('Maven');

  return frameworks;
};

const detectPackageManager = (projectRoot: string): string => {
  if (existsSync(join(projectRoot, 'bun.lock')) || existsSync(join(projectRoot, 'bun.lockb'))) return 'bun';
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectRoot, 'package-lock.json'))) return 'npm';
  if (existsSync(join(projectRoot, 'Cargo.lock'))) return 'cargo';
  if (existsSync(join(projectRoot, 'go.sum'))) return 'go';
  if (existsSync(join(projectRoot, 'Pipfile.lock'))) return 'pipenv';
  if (existsSync(join(projectRoot, 'poetry.lock'))) return 'poetry';
  if (existsSync(join(projectRoot, 'Gemfile.lock'))) return 'bundler';
  return 'unknown';
};

const detectMonorepo = async (projectRoot: string): Promise<{ monorepo: boolean; shape?: string }> => {
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      if (pkg.workspaces) {
        const dirs = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
        return { monorepo: true, shape: `workspaces: ${dirs.join(', ')}` };
      }
    } catch {
      // ignore
    }
  }

  if (existsSync(join(projectRoot, 'pnpm-workspace.yaml'))) {
    return { monorepo: true, shape: 'pnpm workspaces' };
  }

  if (existsSync(join(projectRoot, 'lerna.json'))) {
    return { monorepo: true, shape: 'Lerna' };
  }

  // Rust workspace
  if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    try {
      const cargo = await readFile(join(projectRoot, 'Cargo.toml'), 'utf-8');
      if (cargo.includes('[workspace]')) {
        return { monorepo: true, shape: 'Cargo workspace' };
      }
    } catch {
      // ignore
    }
  }

  return { monorepo: false };
};

const detectKeyDirectories = async (projectRoot: string): Promise<string[]> => {
  const dirs: string[] = [];
  const candidates = ['src', 'lib', 'packages', 'apps', 'services', 'modules', 'crates', 'cmd', 'internal', 'pkg', 'test', 'tests', 'spec', 'docs', 'scripts', 'examples', 'config', 'migrations', 'public', 'static', 'assets'];

  for (const name of candidates) {
    const fullPath = join(projectRoot, name);
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        dirs.push(name);
      }
    } catch {
      // not found
    }
  }

  return dirs;
};

const detectTestFramework = async (projectRoot: string): Promise<string> => {
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.vitest) return 'vitest';
      if (allDeps.jest) return 'jest';
      if (allDeps.mocha) return 'mocha';
      if (allDeps.ava) return 'ava';
      if (allDeps.tap) return 'tap';
    } catch {
      // ignore
    }
  }

  // Check for bun test
  if (existsSync(join(projectRoot, 'bunfig.toml'))) return 'bun:test';

  // Python
  if (existsSync(join(projectRoot, 'pytest.ini')) || existsSync(join(projectRoot, 'pyproject.toml'))) return 'pytest';

  // Rust
  if (existsSync(join(projectRoot, 'Cargo.toml'))) return 'cargo test';

  // Go
  if (existsSync(join(projectRoot, 'go.mod'))) return 'go test';

  return 'unknown';
};

const detectBuildSystem = async (projectRoot: string): Promise<string> => {
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps.tsup) return 'tsup';
      if (allDeps.esbuild) return 'esbuild';
      if (allDeps.rollup) return 'rollup';
      if (allDeps.webpack) return 'webpack';
      if (allDeps.vite) return 'vite';
      if (allDeps.parcel) return 'parcel';
      if (allDeps.turbo || allDeps.turbopack) return 'turbo';
      if (allDeps.tsc || allDeps.typescript) return 'tsc';
    } catch {
      // ignore
    }
  }

  if (existsSync(join(projectRoot, 'Makefile'))) return 'make';
  if (existsSync(join(projectRoot, 'CMakeLists.txt'))) return 'cmake';

  return 'unknown';
};

const detectCISystem = (projectRoot: string): string => {
  if (existsSync(join(projectRoot, '.github', 'workflows'))) return 'GitHub Actions';
  if (existsSync(join(projectRoot, '.gitlab-ci.yml'))) return 'GitLab CI';
  if (existsSync(join(projectRoot, '.circleci'))) return 'CircleCI';
  if (existsSync(join(projectRoot, 'Jenkinsfile'))) return 'Jenkins';
  if (existsSync(join(projectRoot, '.travis.yml'))) return 'Travis CI';
  if (existsSync(join(projectRoot, 'bitbucket-pipelines.yml'))) return 'Bitbucket Pipelines';
  if (existsSync(join(projectRoot, 'azure-pipelines.yml'))) return 'Azure Pipelines';
  return 'unknown';
};

const detectEntryPoints = async (projectRoot: string): Promise<string[]> => {
  const entryPoints: string[] = [];
  const pkgPath = join(projectRoot, 'package.json');

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      if (pkg.main) entryPoints.push(pkg.main);
      if (pkg.module) entryPoints.push(pkg.module);
      if (typeof pkg.bin === 'string') entryPoints.push(pkg.bin);
      if (typeof pkg.bin === 'object') {
        for (const path of Object.values(pkg.bin)) {
          if (typeof path === 'string') entryPoints.push(path);
        }
      }
    } catch {
      // ignore
    }
  }

  // Common entry points
  const candidates = ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'index.ts', 'index.js', 'main.go', 'src/main.rs', 'src/lib.rs', 'app.py', 'main.py'];
  for (const candidate of candidates) {
    if (existsSync(join(projectRoot, candidate)) && !entryPoints.includes(candidate)) {
      entryPoints.push(candidate);
    }
  }

  return entryPoints;
};

export async function scanProject(projectRoot: string): Promise<ScanResult> {
  const repoName = basename(projectRoot);

  // Count files by language
  const languageCounts: Record<string, number> = {};
  await countFilesByExtension(projectRoot, languageCounts);

  // Determine primary language
  const sortedLanguages = Object.entries(languageCounts).sort((a, b) => b[1] - a[1]);
  const primaryLanguage = sortedLanguages[0]?.[0] ?? 'unknown';

  // Detect everything
  const [frameworks, { monorepo, shape }, keyDirs, testFramework, buildSystem, entryPoints] = await Promise.all([
    detectFrameworks(projectRoot),
    detectMonorepo(projectRoot),
    detectKeyDirectories(projectRoot),
    detectTestFramework(projectRoot),
    detectBuildSystem(projectRoot),
    detectEntryPoints(projectRoot),
  ]);

  const packageManager = detectPackageManager(projectRoot);
  const ciSystem = detectCISystem(projectRoot);

  return {
    projectRoot,
    repoName,
    languages: languageCounts,
    primaryLanguage,
    frameworks,
    packageManager,
    monorepo,
    monorepoShape: shape,
    keyDirectories: keyDirs,
    testFramework,
    buildSystem,
    ciSystem,
    entryPoints,
  };
}
