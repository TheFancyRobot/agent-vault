import { readFile } from 'fs/promises';
import { join } from 'path';
import { encode } from '@toon-format/toon';
import type { AgentVaultCommandEnvironment } from './note-generators';
import { formatCommandHelp } from './command-catalog';
import { resolveVaultRoot } from './vault-files';
import type { CodeGraphIndexPayload, CodeSymbol } from '../scaffold/code-graph';

export interface CodeGraphLookupMatch {
  readonly file: string;
  readonly language: string;
  readonly symbol: CodeSymbol;
}

export interface QueryCodeGraphIndexInput {
  readonly query: string;
  readonly limit: number;
  readonly pathSubstring?: string;
  readonly exportedOnly?: boolean;
}

export interface FormatCodeGraphLookupToonOptions {
  readonly compact?: boolean;
}

const CODE_GRAPH_INDEX_PATH = join('08_Automation', 'code-graph', 'index.json');

const normalize = (value: string): string => value.trim().toLowerCase();

const parsePositiveIntOption = (flag: string, value: string | undefined): number => {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
};

export async function loadCodeGraphIndex(vaultRoot: string): Promise<CodeGraphIndexPayload> {
  const raw = await readFile(join(vaultRoot, CODE_GRAPH_INDEX_PATH), 'utf-8');
  return JSON.parse(raw) as CodeGraphIndexPayload;
}

export function queryCodeGraphIndex(
  index: CodeGraphIndexPayload,
  { query, limit, pathSubstring, exportedOnly }: QueryCodeGraphIndexInput,
): CodeGraphLookupMatch[] {
  const normalizedQuery = normalize(query);
  const normalizedPath = pathSubstring ? normalize(pathSubstring) : undefined;
  const matches: CodeGraphLookupMatch[] = [];

  for (const file of index.files) {
    if (normalizedPath && !file.path.toLowerCase().includes(normalizedPath)) {
      continue;
    }

    for (const symbol of file.symbols) {
      if (exportedOnly && !symbol.exported) {
        continue;
      }
      if (!symbol.name.toLowerCase().includes(normalizedQuery)) {
        continue;
      }

      matches.push({ file: file.path, language: file.language, symbol });
      if (matches.length >= limit) {
        return matches;
      }
    }
  }

  return matches;
}

const parseLookupArgs = (argv: string[]): {
  query?: string;
  limit: number;
  pathSubstring?: string;
  exportedOnly: boolean;
  helpRequested: boolean;
} => {
  const positionals: string[] = [];
  let limit = 10;
  let pathSubstring: string | undefined;
  let exportedOnly = false;
  let helpRequested = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      helpRequested = true;
      continue;
    }
    if (token === '--exports-only') {
      exportedOnly = true;
      continue;
    }
    if (token === '--limit') {
      limit = parsePositiveIntOption('--limit', argv[++i]);
      continue;
    }
    if (token === '--path') {
      const next = argv[++i];
      if (!next) throw new Error('Missing value for --path');
      pathSubstring = next;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`Unknown option: ${token}`);
    }
    positionals.push(token);
  }

  return {
    query: positionals[0],
    limit,
    pathSubstring,
    exportedOnly,
    helpRequested,
  };
};

export function formatCodeGraphLookupResults(matches: CodeGraphLookupMatch[], query: string): string {
  const header = `Code graph lookup: ${matches.length} match${matches.length === 1 ? '' : 'es'} for "${query}"`;
  if (matches.length === 0) {
    return `${header}\n\nNo matches found.`;
  }

  return [
    header,
    '',
    ...matches.map((match) => {
      const exportedLabel = match.symbol.exported ? 'exported' : 'internal';
      return `- ${match.file}:${match.symbol.line} — ${match.symbol.kind} ${match.symbol.name} (${match.language}, ${exportedLabel})`;
    }),
  ].join('\n');
}

export function formatCodeGraphLookupResultsAsToon(
  index: CodeGraphIndexPayload,
  matches: CodeGraphLookupMatch[],
  query: string,
  options: FormatCodeGraphLookupToonOptions = {},
): string {
  const compact = options.compact ?? false;

  if (compact) {
    const groupedMatches = Object.entries(matches.reduce<Record<string, { language: string; symbols: Array<{ name: string; kind: CodeSymbol['kind']; line: number; exported: boolean }> }>>((acc, match) => {
      const existing = acc[match.file] ?? { language: match.language, symbols: [] };
      existing.symbols.push({
        name: match.symbol.name,
        kind: match.symbol.kind,
        line: match.symbol.line,
        exported: match.symbol.exported,
      });
      acc[match.file] = existing;
      return acc;
    }, {})).map(([file, value]) => ({ file, ...value }));

    return encode({
      q: query,
      c: matches.length,
      f: groupedMatches,
    }, { delimiter: '\t', keyFolding: 'safe' });
  }

  return encode({
    repoName: index.repoName,
    generatedAt: index.generatedAt,
    query,
    matchCount: matches.length,
    matches,
  }, { delimiter: '\t', keyFolding: 'safe' });
}

export async function handleLookupCodeGraphCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? {
    stdout: (message: string) => console.log(message),
    stderr: (message: string) => console.error(message),
  };

  try {
    const parsed = parseLookupArgs(argv);
    if (parsed.helpRequested) {
      io.stdout(formatCommandHelp('lookup-code-graph'));
      return 0;
    }
    if (!parsed.query) {
      io.stderr('lookup-code-graph requires a query.');
      io.stdout('');
      io.stdout(formatCommandHelp('lookup-code-graph'));
      return 1;
    }

    const vaultRoot = environment.vaultRoot ?? resolveVaultRoot(environment.cwd ? environment.cwd() : process.cwd());
    const index = await loadCodeGraphIndex(vaultRoot);
    const matches = queryCodeGraphIndex(index, {
      query: parsed.query,
      limit: parsed.limit,
      pathSubstring: parsed.pathSubstring,
      exportedOnly: parsed.exportedOnly,
    });
    io.stdout(formatCodeGraphLookupResults(matches, parsed.query));
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
