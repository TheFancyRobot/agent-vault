import { readdir, readFile } from 'fs/promises';
import { relative, join, sep } from 'path';

export type ContextFootprintCategory =
  | 'root_instructions'
  | 'vault_contract'
  | 'vault_notes'
  | 'workflow_prompts';

export interface ContextFootprintEntry {
  readonly path: string;
  readonly category: ContextFootprintCategory;
  readonly chars: number;
  readonly estimatedTokens: number;
}

export interface ContextFootprintCategorySummary {
  readonly category: ContextFootprintCategory;
  readonly files: number;
  readonly chars: number;
  readonly estimatedTokens: number;
}

export interface ContextFootprintReport {
  readonly totalFiles: number;
  readonly totalChars: number;
  readonly totalEstimatedTokens: number;
  readonly entries: readonly ContextFootprintEntry[];
  readonly topFiles: readonly ContextFootprintEntry[];
  readonly categories: readonly ContextFootprintCategorySummary[];
}

const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules']);
const WORKFLOW_PROMPT_FILENAMES = new Set(['SKILL.md']);

const estimateTokens = (chars: number): number => Math.max(1, Math.ceil(chars / 4));

const normalizePath = (value: string): string => value.split(sep).join('/');

const classifyPath = (path: string): ContextFootprintCategory | null => {
  if (path === 'AGENTS.md') return 'root_instructions';
  if (path === '.agent-vault/AGENTS.md') return 'vault_contract';
  if (path.startsWith('.agent-vault/') && path.endsWith('.md')) return 'vault_notes';
  if (path.startsWith('pi-package/skills/') && WORKFLOW_PROMPT_FILENAMES.has(path.split('/').at(-1) ?? '')) return 'workflow_prompts';
  if (path.startsWith('claude-commands/') && path.endsWith('.md')) return 'workflow_prompts';
  return null;
};

const collectFiles = async (root: string, current = ''): Promise<string[]> => {
  const absolute = join(root, current);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...await collectFiles(root, join(current, entry.name)));
      continue;
    }

    if (!entry.isFile()) continue;
    files.push(join(current, entry.name));
  }

  return files;
};

export const generateContextFootprintReport = async (root: string): Promise<ContextFootprintReport> => {
  const files = await collectFiles(root);
  const entries: ContextFootprintEntry[] = [];

  for (const file of files) {
    const relativePath = normalizePath(relative(root, join(root, file)) || file);
    const category = classifyPath(relativePath);
    if (!category) continue;

    const content = await readFile(join(root, file), 'utf-8');
    entries.push({
      path: relativePath,
      category,
      chars: content.length,
      estimatedTokens: estimateTokens(content.length),
    });
  }

  entries.sort((left, right) => right.chars - left.chars || left.path.localeCompare(right.path));

  const categoryMap = new Map<ContextFootprintCategory, { files: number; chars: number; estimatedTokens: number }>();
  for (const entry of entries) {
    const current = categoryMap.get(entry.category) ?? { files: 0, chars: 0, estimatedTokens: 0 };
    current.files += 1;
    current.chars += entry.chars;
    current.estimatedTokens += entry.estimatedTokens;
    categoryMap.set(entry.category, current);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([category, summary]) => ({ category, ...summary }))
    .sort((left, right) => right.chars - left.chars || left.category.localeCompare(right.category));

  const totalChars = entries.reduce((sum, entry) => sum + entry.chars, 0);
  const totalEstimatedTokens = entries.reduce((sum, entry) => sum + entry.estimatedTokens, 0);

  return {
    totalFiles: entries.length,
    totalChars,
    totalEstimatedTokens,
    entries,
    topFiles: entries.slice(0, 10),
    categories,
  };
};

export const formatContextFootprintReport = (report: ContextFootprintReport): string => {
  const lines: string[] = [];
  lines.push('Context footprint report');
  lines.push(`Total files: ${report.totalFiles}`);
  lines.push(`Total chars: ${report.totalChars}`);
  lines.push(`Estimated tokens: ${report.totalEstimatedTokens}`);
  lines.push('');
  lines.push('By category:');
  for (const category of report.categories) {
    lines.push(`- ${category.category}: ${category.files} files, ${category.chars} chars, ~${category.estimatedTokens} tokens`);
  }
  lines.push('');
  lines.push('Top files:');
  for (const entry of report.topFiles) {
    lines.push(`- ${entry.path}: ${entry.chars} chars, ~${entry.estimatedTokens} tokens (${entry.category})`);
  }
  return lines.join('\n');
};
