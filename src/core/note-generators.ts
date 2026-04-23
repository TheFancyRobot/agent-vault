import { existsSync } from 'fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';
import { scanProject } from '../scaffold/scan';
import { writeCodeGraph } from '../scaffold/code-graph';
import {
  appendToAppendOnlySection,
  parseYamlFrontmatter,
  readGeneratedBlockContent,
  replaceGeneratedBlock,
  replaceHeadingSection,
  updateFrontmatter,
} from './note-mutations';
import { formatCommandHelp, formatCommandUsage } from './command-catalog';
import { CONTEXT_HANDOFF_SECTION_HEADING, createDefaultSessionContext, buildStepMirror, STEP_MIRROR_CONTEXT_ID_KEY } from './context-contract';
import {
  assertWithinVaultRoot,
  getRelativeNotePath,
  listMarkdownFiles,
  resolveVaultRelativePath,
  resolveVaultRoot,
} from './vault-files';

export interface AgentVaultCommandIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

export interface AgentVaultCommandEnvironment {
  vaultRoot?: string;
  cwd?: () => string;
  now?: () => Date;
  io?: AgentVaultCommandIO;
}

interface ParsedArgs {
  readonly positionals: string[];
  readonly options: Record<string, string | true>;
}

interface PhaseInfo {
  readonly directoryName: string;
  readonly absolutePath: string;
  readonly phaseLink: string;
}

export interface ResolvedStepNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
  readonly wikiLink: string;
  readonly title: string;
  readonly stepId: string;
  readonly phaseLink: string;
  readonly phaseNotePath?: string;
}

interface ResolvedPhaseNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
  readonly wikiLink: string;
  readonly title: string;
  readonly phaseId: string;
}

interface ResolvedSessionNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
  readonly wikiLink: string;
  readonly title: string;
  readonly sessionId: string;
  readonly phaseLink: string;
  readonly phaseNotePath?: string;
}

interface ResolvedBugNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
  readonly wikiLink: string;
  readonly title: string;
  readonly bugId: string;
}

interface IndexedVaultNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
  readonly frontmatter: Record<string, unknown>;
}

interface SummaryItem {
  readonly key: string;
  readonly display: string;
}

const DEFAULT_IO: AgentVaultCommandIO = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
};

const PHASE_TEMPLATE_PATH = ['07_Templates', 'Phase_Template.md'] as const;
const STEP_TEMPLATE_PATH = ['07_Templates', 'Step_Template.md'] as const;
const SESSION_TEMPLATE_PATH = ['07_Templates', 'Session_Template.md'] as const;
const BUG_TEMPLATE_PATH = ['07_Templates', 'Bug_Template.md'] as const;
const DECISION_TEMPLATE_PATH = ['07_Templates', 'Decision_Template.md'] as const;
const BUGS_INDEX_PATH = ['00_Home', 'Bugs_Index.md'] as const;
const DECISIONS_INDEX_PATH = ['00_Home', 'Decisions_Index.md'] as const;
const ACTIVE_CONTEXT_PATH = ['00_Home', 'Active_Context.md'] as const;
const LINEAR_FIELD_NAMES = ['linear_id', 'linear_issue', 'linear_ticket', 'linear_issue_id', 'linear_url'] as const;
const EMPTY_CELL = '-';
const ACTIVE_SESSION_STATUSES = new Set(['in-progress', 'active']);
const ACTIVE_WORK_STATUSES = new Set(['in-progress', 'active', 'planned']);
const BLOCKER_STATUSES = new Set(['blocked', 'on-hold', 'waiting', 'waiting-on-dependency']);
const COMPLETED_WORK_STATUSES = new Set(['done', 'completed', 'closed', 'cancelled']);

const joinTemplatePath = (vaultRoot: string, parts: readonly string[]): string => join(vaultRoot, ...parts);

const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : 'note';
};

const padNumber = (value: string, digits: number, label: string): string => {
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${label} must be a whole number.`);
  }

  return value.trim().padStart(digits, '0');
};

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

const formatTime = (date: Date): string => {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatTimestamp = (date: Date): string => {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${formatDate(date)}-${hh}${mm}${ss}`;
};

const replaceFirstHeading = (content: string, heading: string): string => content.replace(/^#\s+.*$/m, `# ${heading}`);

const ensureHeadingSection = (
  content: string,
  headingText: string,
  sectionContent: string,
  insertBeforeHeading?: string,
): string => {
  const headingToken = `## ${headingText}`;
  if (content.includes(headingToken)) {
    return replaceHeadingSection(content, headingText, sectionContent).content;
  }

  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
  const normalizedBody = sectionContent.replace(/\r\n|\r|\n/g, lineEnding).trim();
  const section = `${headingToken}${lineEnding}${lineEnding}${normalizedBody}${lineEnding}${lineEnding}`;

  if (insertBeforeHeading) {
    const beforeToken = `## ${insertBeforeHeading}`;
    const beforeIndex = content.indexOf(beforeToken);
    if (beforeIndex !== -1) {
      return `${content.slice(0, beforeIndex)}${section}${content.slice(beforeIndex)}`;
    }
  }

  const trimmed = content.replace(/(?:\r\n|\r|\n)+$/g, '');
  return `${trimmed}${lineEnding}${lineEnding}${section}`;
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const positionals: string[] = [];
  const options: Record<string, string | true> = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const name = arg.slice(2);
    const nextArg = argv[index + 1];
    if (nextArg === undefined || nextArg.startsWith('--')) {
      options[name] = true;
      continue;
    }

    options[name] = nextArg;
    index++;
  }

  return { positionals, options };
};

const getRequiredOption = (options: Record<string, string | true>, name: string): string | undefined => {
  const value = options[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (value === true) {
    throw new Error(`Option --${name} requires a value.`);
  }
  return undefined;
};

const getVaultRoot = (environment: AgentVaultCommandEnvironment): string =>
  environment.vaultRoot ?? resolveVaultRoot(environment.cwd?.() ?? process.cwd());

const toWikiTarget = (vaultRelativePath: string): string => vaultRelativePath.replace(/\.md$/i, '');

const toWikiLink = (vaultRelativePath: string, alias: string): string => `[[${toWikiTarget(vaultRelativePath)}|${alias}]]`;

const resolvePhaseNotePathFromLink = (vaultRoot: string, phaseLink: string): string | undefined => {
  const match = /^\[\[([^|\]]+)\|[^\]]+\]\]$/.exec(phaseLink.trim());
  if (!match) {
    return undefined;
  }

  const relativeTarget = `${match[1]}.md`;
  const absolutePath = join(vaultRoot, relativeTarget);
  return existsSync(absolutePath) ? absolutePath : undefined;
};

const parseStringField = (notePath: string, key: string, value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${notePath} is missing required frontmatter field "${key}".`);
  }
  return value.trim();
};

const parseOptionalStringField = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeMetadataKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const getFirstPresentStringField = (
  frontmatter: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    const value = parseOptionalStringField(frontmatter[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const parseDateValue = (value: string | undefined): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

const parseSeverityRank = (severity: string | undefined): number => {
  if (!severity) {
    return Number.POSITIVE_INFINITY;
  }

  const match = /^sev-(\d+)$/i.exec(severity.trim());
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

const BUG_STATUS_ORDER = new Map<string, number>([
  ['new', 0],
  ['investigating', 1],
  ['fixed-awaiting-verification', 2],
  ['fixed-awaiting-retest', 2],
  ['closed', 3],
]);

const DECISION_STATUS_ORDER = new Map<string, number>([
  ['accepted', 0],
  ['proposed', 1],
  ['superseded', 2],
  ['rejected', 3],
]);

const compareSummaryItems = (
  left: SummaryItem,
  right: SummaryItem,
  order: ReadonlyMap<string, number>,
): number => {
  const leftRank = order.get(left.key) ?? Number.POSITIVE_INFINITY;
  const rightRank = order.get(right.key) ?? Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  return left.display.localeCompare(right.display);
};

const escapeMarkdownTableCell = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

const escapeMarkdownLinkLabel = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');

const toMarkdownLink = (fromPath: string, toPath: string, label: string): string => {
  const relativeTarget = relative(dirname(fromPath), toPath).replace(/\\/g, '/');
  return `[${escapeMarkdownLinkLabel(label)}](${relativeTarget})`;
};

const toDisplayCell = (value: string | undefined): string => value ?? EMPTY_CELL;

const buildMarkdownTable = (headers: readonly string[], rows: readonly (readonly string[])[]): string => {
  const lines = [
    `| ${headers.map(escapeMarkdownTableCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${row.map(escapeMarkdownTableCell).join(' | ')} |`);
  }

  return lines.join('\n');
};

const buildSummaryLine = (
  label: string,
  items: readonly SummaryItem[],
  order: ReadonlyMap<string, number>,
): string | undefined => {
  if (items.length === 0) {
    return undefined;
  }

  const counts = new Map<string, { display: string; count: number }>();
  for (const item of items) {
    const existing = counts.get(item.key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(item.key, { display: item.display, count: 1 });
    }
  }

  const summary = [...counts.entries()]
    .map(([key, value]) => ({ key, display: value.display, count: value.count }))
    .sort((left, right) => compareSummaryItems(left, right, order))
    .map((item) => `${item.display} (${item.count})`)
    .join(', ');

  return `- ${label}: ${summary}`;
};

const isStatusInSet = (status: string | undefined, accepted: ReadonlySet<string>): boolean =>
  status !== undefined && accepted.has(normalizeMetadataKey(status));

const isOpenWorkStatus = (status: string | undefined): boolean => {
  const key = status === undefined ? '' : normalizeMetadataKey(status);
  return key.length > 0 && !COMPLETED_WORK_STATUSES.has(key) && !BLOCKER_STATUSES.has(key);
};

const compareByUpdatedDesc = (
  left: Record<string, string | undefined>,
  right: Record<string, string | undefined>,
): number => {
  const updatedDiff = parseDateValue(right.updated) - parseDateValue(left.updated);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = parseDateValue(right.created) - parseDateValue(left.created);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return 0;
};

const formatMetadataBits = (bits: Array<string | undefined>): string => bits.filter((value): value is string => Boolean(value)).join(' - ');

const withMetadataSuffix = (bits: Array<string | undefined>): string => {
  const formatted = formatMetadataBits(bits);
  return formatted.length > 0 ? ` - ${formatted}` : '';
};

const summarizeOverflow = (label: string, count: number): string | undefined =>
  count > 0 ? `${count} more ${label}` : undefined;

const displayPhaseName = (directoryName: string): string => {
  const match = /^Phase_(\d+)_(.+)$/.exec(directoryName);
  if (!match) {
    return directoryName.replace(/_/g, ' ');
  }
  return `Phase ${match[1]} ${match[2].replace(/_/g, ' ')}`;
};

const buildPhaseLink = (directoryName: string): string =>
  `[[02_Phases/${directoryName}/Phase|${displayPhaseName(directoryName)}]]`;

const buildPhaseId = (phaseNumber: string): string => `PHASE-${phaseNumber}`;

const listPhaseDirectoryNames = async (vaultRoot: string): Promise<string[]> => {
  const phasesRoot = join(vaultRoot, '02_Phases');
  const entries = await readdir(phasesRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && /^Phase_\d+_/.test(entry.name)).map((entry) => entry.name).sort();
};

const parsePhaseNumberFromDirectory = (directoryName: string): number | null => {
  const match = /^Phase_(\d+)_/.exec(directoryName);
  return match ? Number(match[1]) : null;
};

const getNextPhaseNumber = async (vaultRoot: string): Promise<string> => {
  const phaseNumbers = (await listPhaseDirectoryNames(vaultRoot))
    .map(parsePhaseNumberFromDirectory)
    .filter((value): value is number => value !== null);
  const maxPhase = phaseNumbers.length === 0 ? 0 : Math.max(...phaseNumbers);
  return String(maxPhase + 1).padStart(2, '0');
};

const parseInsertBeforeTarget = (input: string): number => {
  const normalized = input.replace(/^PHASE-?/i, '').replace(/^0+(?=\d)/, '');
  const num = Number(normalized);
  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    throw new Error(`Invalid --insert-before target: "${input}". Use a phase number (e.g., 3) or ID (e.g., PHASE-03).`);
  }
  return num;
};

const renumberPhasesFrom = async (vaultRoot: string, insertionPoint: number): Promise<void> => {
  const phaseNames = await listPhaseDirectoryNames(vaultRoot);

  const toRenumber = phaseNames
    .map((dirName) => ({ dirName, number: parsePhaseNumberFromDirectory(dirName) }))
    .filter((entry): entry is { dirName: string; number: number } =>
      entry.number !== null && entry.number >= insertionPoint,
    )
    .sort((a, b) => b.number - a.number); // highest first to avoid directory conflicts

  if (toRenumber.length === 0) return;

  // Build regex replacement pairs (ordered highest-to-lowest to prevent cascading).
  // PHASE-NN uses a non-digit lookahead to avoid prefix collisions (e.g. PHASE-10 vs PHASE-100).
  const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replacements: Array<{ pattern: RegExp; replacement: string }> = [];

  for (const { dirName, number: oldNum } of toRenumber) {
    const oldPadded = String(oldNum).padStart(2, '0');
    const newPadded = String(oldNum + 1).padStart(2, '0');
    const slug = dirName.replace(/^Phase_\d+_/, '');

    replacements.push({ pattern: new RegExp(`Phase_${oldPadded}_${escapeRegExp(slug)}`, 'g'), replacement: `Phase_${newPadded}_${slug}` });
    replacements.push({ pattern: new RegExp(`PHASE-${oldPadded}(?!\\d)`, 'g'), replacement: `PHASE-${newPadded}` });
    replacements.push({ pattern: new RegExp(`STEP-${oldPadded}-`, 'g'), replacement: `STEP-${newPadded}-` });
    replacements.push({ pattern: new RegExp(`Phase ${oldPadded} `, 'g'), replacement: `Phase ${newPadded} ` });
  }

  // Rename directories (highest to lowest to avoid conflicts)
  const phasesRoot = join(vaultRoot, '02_Phases');
  for (const { dirName, number: oldNum } of toRenumber) {
    const newPadded = String(oldNum + 1).padStart(2, '0');
    const slug = dirName.replace(/^Phase_\d+_/, '');
    const newDirName = `Phase_${newPadded}_${slug}`;
    await rename(join(phasesRoot, dirName), join(phasesRoot, newDirName));
  }

  // Global text replacement pass on all .md files
  const allFiles = await listMarkdownFiles(vaultRoot);
  for (const filePath of allFiles) {
    let content = await readFile(filePath, 'utf-8');
    let changed = false;
    for (const { pattern, replacement } of replacements) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) changed = true;
    }
    if (changed) {
      await writeFile(filePath, content, 'utf-8');
    }
  }
};

const findPreviousPhase = async (vaultRoot: string, phaseNumber: string): Promise<ResolvedPhaseNote | undefined> => {
  const target = Number(phaseNumber);
  const phaseNames = await listPhaseDirectoryNames(vaultRoot);
  const candidates = phaseNames
    .map((directoryName) => ({ directoryName, phaseNumber: parsePhaseNumberFromDirectory(directoryName) }))
    .filter((entry): entry is { directoryName: string; phaseNumber: number } => entry.phaseNumber !== null && entry.phaseNumber < target)
    .sort((left, right) => right.phaseNumber - left.phaseNumber);

  if (candidates.length === 0) {
    return undefined;
  }

  const directoryName = candidates[0].directoryName;
  const absolutePath = join(vaultRoot, '02_Phases', directoryName, 'Phase.md');
  const frontmatter = await readNoteFrontmatter(absolutePath);
  const title = parseStringField(absolutePath, 'title', frontmatter.title);
  const phaseId = parseStringField(absolutePath, 'phase_id', frontmatter.phase_id);
  const vaultRelativePath = getRelativeNotePath(vaultRoot, absolutePath);

  return {
    absolutePath,
    vaultRelativePath,
    wikiLink: toWikiLink(vaultRelativePath, `${phaseId} ${title}`),
    title,
    phaseId,
  };
};

const findPhase = async (vaultRoot: string, phaseNumber: string): Promise<PhaseInfo> => {
  const phasesRoot = join(vaultRoot, '02_Phases');
  const prefix = `Phase_${phaseNumber}_`;
  const entries = await readdir(phasesRoot, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => entry.name)
    .sort();

  if (matches.length === 0) {
    throw new Error(`Could not find a phase folder for phase ${phaseNumber}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Phase ${phaseNumber} is ambiguous: ${matches.join(', ')}`);
  }

  const directoryName = matches[0];
  const absolutePath = join(phasesRoot, directoryName);
  const phaseNotePath = join(absolutePath, 'Phase.md');
  if (!existsSync(phaseNotePath)) {
    throw new Error(`Expected phase note at ${phaseNotePath}.`);
  }

  return {
    directoryName,
    absolutePath,
    phaseLink: buildPhaseLink(directoryName),
  };
};

const readTemplate = (vaultRoot: string, parts: readonly string[]): Promise<string> =>
  readFile(joinTemplatePath(vaultRoot, parts), 'utf-8');

const readNoteFrontmatter = async (absolutePath: string): Promise<Record<string, unknown>> => {
  const content = await readFile(absolutePath, 'utf-8');
  return parseYamlFrontmatter(content, absolutePath).data;
};

const tryReadNoteFrontmatter = async (absolutePath: string): Promise<Record<string, unknown> | null> => {
  try {
    return await readNoteFrontmatter(absolutePath);
  } catch {
    return null;
  }
};

const resolveDirectNotePath = (vaultRoot: string, reference: string): string | null => {
  const trimmed = reference.trim();
  if (trimmed.length === 0) return null;

  const candidates = [
    resolve(trimmed),
    join(vaultRoot, trimmed),
    join(dirname(vaultRoot), trimmed),
  ];

  for (const candidate of candidates) {
    if (!candidate.endsWith('.md') || !existsSync(candidate)) {
      continue;
    }

    try {
      assertWithinVaultRoot(vaultRoot, candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const resolveStepReference = async (vaultRoot: string, reference: string): Promise<ResolvedStepNote> => {
  const directPath = resolveDirectNotePath(vaultRoot, reference);
  const stepFiles = directPath ? [directPath] : await listMarkdownFiles(join(vaultRoot, '02_Phases'));

  const matchingPaths = directPath
    ? [directPath]
    : stepFiles.filter((filePath) => {
        const relativePath = getRelativeNotePath(vaultRoot, filePath);
        const baseName = basename(filePath, '.md');
        return relativePath === reference || relativePath === `${reference}.md` || baseName === reference;
      });

  if (matchingPaths.length > 1) {
    throw new Error(`Step reference is ambiguous: ${reference}`);
  }

  const notePath = matchingPaths[0] ?? (await (async () => {
    const matches: string[] = [];
    for (const filePath of stepFiles) {
      const frontmatter = await tryReadNoteFrontmatter(filePath);
      if (frontmatter === null) {
        continue;
      }
      if (frontmatter.note_type === 'step' && frontmatter.step_id === reference) {
        matches.push(filePath);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Step reference is ambiguous: ${reference}`);
    }
    return matches[0] ?? null;
  })());

  if (!notePath) {
    throw new Error(`Could not resolve step reference: ${reference}`);
  }

  const frontmatter = await readNoteFrontmatter(notePath);
  const title = parseStringField(notePath, 'title', frontmatter.title);
  const stepId = parseStringField(notePath, 'step_id', frontmatter.step_id);
  const phaseLink = parseStringField(notePath, 'phase', frontmatter.phase);
  const vaultRelativePath = getRelativeNotePath(vaultRoot, notePath);

  return {
    absolutePath: notePath,
    vaultRelativePath,
    wikiLink: toWikiLink(vaultRelativePath, `${stepId} ${title}`),
    title,
    stepId,
    phaseLink,
    phaseNotePath: resolvePhaseNotePathFromLink(vaultRoot, phaseLink),
  };
};

const resolvePhaseReference = async (vaultRoot: string, reference: string): Promise<ResolvedPhaseNote> => {
  const directPath = resolveDirectNotePath(vaultRoot, reference);
  const phaseFiles = directPath ? [directPath] : await listMarkdownFiles(join(vaultRoot, '02_Phases'));

  const matchingPaths = directPath
    ? [directPath]
    : phaseFiles.filter((filePath) => {
        const relativePath = getRelativeNotePath(vaultRoot, filePath);
        const baseName = basename(filePath, '.md');
        const phaseDirectory = basename(dirname(filePath));
        return relativePath === reference
          || relativePath === `${reference}.md`
          || baseName === reference
          || phaseDirectory === reference;
      });

  if (matchingPaths.length > 1) {
    throw new Error(`Phase reference is ambiguous: ${reference}`);
  }

  const notePath = matchingPaths[0] ?? (await (async () => {
    const files = await listMarkdownFiles(join(vaultRoot, '02_Phases'));
    const matches: string[] = [];
    for (const filePath of files) {
      const frontmatter = await tryReadNoteFrontmatter(filePath);
      if (frontmatter === null) {
        continue;
      }
      if (frontmatter.note_type === 'phase' && frontmatter.phase_id === reference) {
        matches.push(filePath);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Phase reference is ambiguous: ${reference}`);
    }
    return matches[0] ?? null;
  })());

  if (!notePath) {
    throw new Error(`Could not resolve phase reference: ${reference}`);
  }

  const frontmatter = await readNoteFrontmatter(notePath);
  const title = parseStringField(notePath, 'title', frontmatter.title);
  const phaseId = parseStringField(notePath, 'phase_id', frontmatter.phase_id);
  const vaultRelativePath = getRelativeNotePath(vaultRoot, notePath);

  return {
    absolutePath: notePath,
    vaultRelativePath,
    wikiLink: toWikiLink(vaultRelativePath, `${phaseId} ${title}`),
    title,
    phaseId,
  };
};

const resolveSessionReference = async (vaultRoot: string, reference: string): Promise<ResolvedSessionNote> => {
  const directPath = resolveDirectNotePath(vaultRoot, reference);
  const sessionFiles = directPath ? [directPath] : await listMarkdownFiles(join(vaultRoot, '05_Sessions'));

  const matchingPaths = directPath
    ? [directPath]
    : sessionFiles.filter((filePath) => {
        const relativePath = getRelativeNotePath(vaultRoot, filePath);
        const baseName = basename(filePath, '.md');
        return relativePath === reference || relativePath === `${reference}.md` || baseName === reference;
      });

  if (matchingPaths.length > 1) {
    throw new Error(`Session reference is ambiguous: ${reference}`);
  }

  const notePath = matchingPaths[0] ?? (await (async () => {
    const files = await listMarkdownFiles(join(vaultRoot, '05_Sessions'));
    const matches: string[] = [];
    for (const filePath of files) {
      const frontmatter = await tryReadNoteFrontmatter(filePath);
      if (frontmatter === null) {
        continue;
      }
      if (frontmatter.note_type === 'session' && frontmatter.session_id === reference) {
        matches.push(filePath);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Session reference is ambiguous: ${reference}`);
    }
    return matches[0] ?? null;
  })());

  if (!notePath) {
    throw new Error(`Could not resolve session reference: ${reference}`);
  }

  const frontmatter = await readNoteFrontmatter(notePath);
  const title = parseStringField(notePath, 'title', frontmatter.title);
  const sessionId = parseStringField(notePath, 'session_id', frontmatter.session_id);
  const phaseLink = parseStringField(notePath, 'phase', frontmatter.phase);
  const vaultRelativePath = getRelativeNotePath(vaultRoot, notePath);

  return {
    absolutePath: notePath,
    vaultRelativePath,
    wikiLink: toWikiLink(vaultRelativePath, `${sessionId} ${title}`),
    title,
    sessionId,
    phaseLink,
    phaseNotePath: resolvePhaseNotePathFromLink(vaultRoot, phaseLink),
  };
};

const resolveBugReference = async (vaultRoot: string, reference: string): Promise<ResolvedBugNote> => {
  const directPath = resolveDirectNotePath(vaultRoot, reference);
  const bugFiles = directPath ? [directPath] : await listMarkdownFiles(join(vaultRoot, '03_Bugs'));

  const matchingPaths = directPath
    ? [directPath]
    : bugFiles.filter((filePath) => {
        const relativePath = getRelativeNotePath(vaultRoot, filePath);
        const baseName = basename(filePath, '.md');
        return relativePath === reference || relativePath === `${reference}.md` || baseName === reference;
      });

  if (matchingPaths.length > 1) {
    throw new Error(`Bug reference is ambiguous: ${reference}`);
  }

  const notePath = matchingPaths[0] ?? (await (async () => {
    const files = await listMarkdownFiles(join(vaultRoot, '03_Bugs'));
    const matches: string[] = [];
    for (const filePath of files) {
      const frontmatter = await tryReadNoteFrontmatter(filePath);
      if (frontmatter === null) {
        continue;
      }
      if (frontmatter.note_type === 'bug' && frontmatter.bug_id === reference) {
        matches.push(filePath);
      }
    }
    if (matches.length > 1) {
      throw new Error(`Bug reference is ambiguous: ${reference}`);
    }
    return matches[0] ?? null;
  })());

  if (!notePath) {
    throw new Error(`Could not resolve bug reference: ${reference}`);
  }

  const frontmatter = await readNoteFrontmatter(notePath);
  const title = parseStringField(notePath, 'title', frontmatter.title);
  const bugId = parseStringField(notePath, 'bug_id', frontmatter.bug_id);
  const vaultRelativePath = getRelativeNotePath(vaultRoot, notePath);

  return {
    absolutePath: notePath,
    vaultRelativePath,
    wikiLink: toWikiLink(vaultRelativePath, `${bugId} ${title}`),
    title,
    bugId,
  };
};

const nextBugId = async (vaultRoot: string): Promise<string> => {
  const bugFiles = await listMarkdownFiles(join(vaultRoot, '03_Bugs'));
  let maxId = 0;

  for (const filePath of bugFiles) {
    const filenameMatch = /^BUG-(\d+)/.exec(basename(filePath));
    if (filenameMatch) {
      maxId = Math.max(maxId, Number(filenameMatch[1]));
      continue;
    }

    const frontmatter = await tryReadNoteFrontmatter(filePath);
    if (frontmatter === null) {
      continue;
    }
    if (typeof frontmatter.bug_id === 'string') {
      const idMatch = /^BUG-(\d+)/.exec(frontmatter.bug_id);
      if (idMatch) {
        maxId = Math.max(maxId, Number(idMatch[1]));
      }
    }
  }

  return `BUG-${String(maxId + 1).padStart(4, '0')}`;
};

const validateBugId = (bugId: string): string => {
  if (!/^BUG-\d{4,}$/.test(bugId)) {
    throw new Error('Bug id must look like BUG-0001.');
  }
  return bugId;
};

const nextDecisionId = async (vaultRoot: string): Promise<string> => {
  const decisionFiles = await listMarkdownFiles(join(vaultRoot, '04_Decisions'));
  let maxId = 0;

  for (const filePath of decisionFiles) {
    const filenameMatch = /^DEC-(\d+)/.exec(basename(filePath));
    if (filenameMatch) {
      maxId = Math.max(maxId, Number(filenameMatch[1]));
      continue;
    }

    const frontmatter = await tryReadNoteFrontmatter(filePath);
    if (frontmatter === null) {
      continue;
    }
    if (typeof frontmatter.decision_id === 'string') {
      const idMatch = /^DEC-(\d+)/.exec(frontmatter.decision_id);
      if (idMatch) {
        maxId = Math.max(maxId, Number(idMatch[1]));
      }
    }
  }

  return `DEC-${String(maxId + 1).padStart(4, '0')}`;
};

const validateDecisionId = (decisionId: string): string => {
  if (!/^DEC-\d{4,}$/.test(decisionId)) {
    throw new Error('Decision id must look like DEC-0001.');
  }
  return decisionId;
};

const parseStringListField = (notePath: string, key: string, value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${notePath} has non-string values in frontmatter list "${key}".`);
  }

  return [...value];
};

const appendUniqueString = (items: readonly string[], value: string): string[] =>
  items.includes(value) ? [...items] : [...items, value];

const normalizeBlockBody = (content: string): string => content.trim().replace(/\r\n/g, '\n');

const appendUniqueGeneratedLine = (
  existingBlock: string,
  nextLine: string,
  emptyStateLines: readonly string[],
): string => {
  const normalizedExisting = normalizeBlockBody(existingBlock);
  if (normalizedExisting.length === 0 || emptyStateLines.includes(normalizedExisting)) {
    return nextLine;
  }

  const existingLines = normalizedExisting.split('\n');
  if (existingLines.includes(nextLine)) {
    return normalizedExisting;
  }

  return `${normalizedExisting}\n${nextLine}`;
};

const updateBackreferenceNote = async (
  filePath: string,
  updatedOn: string,
  mutate: (content: string) => string,
): Promise<boolean> => {
  const currentContent = await readFile(filePath, 'utf-8');
  const nextContent = mutate(currentContent);

  if (nextContent === currentContent) {
    return false;
  }

  const withUpdatedFrontmatter = updateFrontmatter(nextContent, { updated: updatedOn }, filePath).content;
  await writeFile(filePath, withUpdatedFrontmatter, 'utf-8');
  return true;
};

const appendUniqueFrontmatterLink = (
  content: string,
  notePath: string,
  fieldName: string,
  link: string,
): string => {
  const frontmatter = parseYamlFrontmatter(content, notePath).data;
  const nextLinks = appendUniqueString(parseStringListField(notePath, fieldName, frontmatter[fieldName]), link);
  return updateFrontmatter(content, { [fieldName]: nextLinks }, notePath).content;
};

const appendUniqueGeneratedBlockLine = (
  content: string,
  notePath: string,
  blockName: string,
  line: string,
  emptyStateLines: readonly string[],
): string => {
  const currentBlock = readGeneratedBlockContent(content, blockName, notePath);
  const nextBlock = appendUniqueGeneratedLine(currentBlock, line, emptyStateLines);
  return replaceGeneratedBlock(content, blockName, nextBlock, notePath).content;
};

const tryApplyBackreference = async (
  io: AgentVaultCommandIO,
  label: string,
  apply: () => Promise<boolean>,
): Promise<void> => {
  try {
    await apply();
  } catch (error) {
    io.stderr(`Warning: skipped ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const linkStepBackToPhase = async (
  phaseNotePath: string | undefined,
  stepLink: string,
  updatedOn: string,
): Promise<boolean> => {
  if (!phaseNotePath) {
    return false;
  }

  return updateBackreferenceNote(phaseNotePath, updatedOn, (content) =>
    appendUniqueGeneratedBlockLine(
      content,
      phaseNotePath,
      'phase-steps',
      `- [ ] ${stepLink}`,
      ['- No step notes yet.'],
    ));
};

const linkSessionBackToStep = async (
  step: ResolvedStepNote,
  sessionLink: string,
  updatedOn: string,
  sessionContextId?: string,
  sessionContextStatus?: string,
  sessionContextSummary?: string,
): Promise<boolean> =>
  updateBackreferenceNote(step.absolutePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, step.absolutePath, 'related_sessions', sessionLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      step.absolutePath,
      'step-session-history',
      `- ${updatedOn} - ${sessionLink} - Session created.`,
      ['- No sessions yet.'],
    );
    // Write step-mirror fields from canonical session context.
    if (sessionContextId && sessionContextStatus) {
      const mirror = buildStepMirror({
        sessionId: sessionLink.replace(/^\[\[|\]\]$/g, '').split('|')[0],
        contextId: sessionContextId,
        status: sessionContextStatus as 'active' | 'paused' | 'blocked' | 'completed',
        summary: sessionContextSummary ?? '',
      });
      nextContent = updateFrontmatter(nextContent, mirror, step.absolutePath).content;
    }
    return nextContent;
  });

/** Re-read canonical session context from a session note and re-mirror onto the linked step.
 * This is the principled way to update step mirrors on lifecycle transitions, completion,
 * or when a new session becomes active for the step (per DEC-0001).
 * Returns true if the step note was modified, false otherwise.
 */
export const updateStepMirrors = async (
  step: ResolvedStepNote,
  sessionNotePath: string,
  updatedOn: string,
): Promise<boolean> => {
  const sessionFrontmatter = await readNoteFrontmatter(sessionNotePath);
  const context = sessionFrontmatter.context;

  if (typeof context !== 'object' || context === null || Array.isArray(context)) {
    return false;
  }

  const ctx = context as Record<string, unknown>;
  const contextId = parseOptionalStringField(ctx[STEP_MIRROR_CONTEXT_ID_KEY]);
  const status = parseOptionalStringField(ctx.status);
  const focus = ctx.current_focus;
  const summary = (typeof focus === 'object' && focus !== null && !Array.isArray(focus))
    ? parseOptionalStringField((focus as Record<string, unknown>).summary)
    : undefined;

  if (!contextId || !status) {
    return false;
  }

  const mirror = buildStepMirror({
    sessionId: getRelativeNotePath(
      join(step.absolutePath, '..','..','..','..'),
      sessionNotePath,
    ).replace(/\.md$/i, ''),
    contextId,
    status: status as 'active' | 'paused' | 'blocked' | 'completed',
    summary: summary ?? '',
  });

  return updateBackreferenceNote(step.absolutePath, updatedOn, (content) =>
    updateFrontmatter(content, mirror, step.absolutePath).content,
  );
};

const linkBugBackToStep = async (
  step: ResolvedStepNote,
  bugLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(step.absolutePath, updatedOn, (content) =>
    appendUniqueFrontmatterLink(content, step.absolutePath, 'related_bugs', bugLink));

const linkBugBackToSession = async (
  session: ResolvedSessionNote,
  bugLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(session.absolutePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, session.absolutePath, 'related_bugs', bugLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      session.absolutePath,
      'session-bugs-encountered',
      `- ${bugLink} - Linked from bug generator.`,
      ['- None.'],
    );
    return nextContent;
  });

const linkBugBackToPhase = async (
  phaseNotePath: string | undefined,
  bugLink: string,
  updatedOn: string,
): Promise<boolean> => {
  if (!phaseNotePath) {
    return false;
  }

  return updateBackreferenceNote(phaseNotePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, phaseNotePath, 'related_bugs', bugLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      phaseNotePath,
      'phase-related-bugs',
      `- ${bugLink}`,
      ['- None yet.'],
    );
    return nextContent;
  });
};

const linkDecisionBackToPhase = async (
  phase: ResolvedPhaseNote,
  decisionLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(phase.absolutePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, phase.absolutePath, 'related_decisions', decisionLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      phase.absolutePath,
      'phase-related-decisions',
      `- ${decisionLink}`,
      ['- None yet.'],
    );
    return nextContent;
  });

const linkDecisionBackToSession = async (
  session: ResolvedSessionNote,
  decisionLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(session.absolutePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, session.absolutePath, 'related_decisions', decisionLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      session.absolutePath,
      'session-decisions-made-or-updated',
      `- ${decisionLink} - Linked from decision generator.`,
      ['- None.'],
    );
    return nextContent;
  });

const linkDecisionBackToBug = async (
  bug: ResolvedBugNote,
  decisionLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(bug.absolutePath, updatedOn, (content) => {
    let nextContent = appendUniqueFrontmatterLink(content, bug.absolutePath, 'related_notes', decisionLink);
    nextContent = appendUniqueGeneratedBlockLine(
      nextContent,
      bug.absolutePath,
      'bug-related-notes',
      `- Decision: ${decisionLink}`,
      ['- None yet.'],
    );
    return nextContent;
  });

const linkPhaseForwardFromPreviousPhase = async (
  previousPhase: PhaseInfo,
  nextPhaseLink: string,
  updatedOn: string,
): Promise<boolean> =>
  updateBackreferenceNote(join(previousPhase.absolutePath, 'Phase.md'), updatedOn, (content) => {
    const currentBlock = readGeneratedBlockContent(content, 'phase-linear-context', join(previousPhase.absolutePath, 'Phase.md'));
    const lines = currentBlock.trim().length === 0 ? [] : currentBlock.trim().split('\n');
    const nextLine = `- Next phase: ${nextPhaseLink}`;
    const nextLines = lines.some((line) => line.startsWith('- Next phase:'))
      ? lines.map((line) => line.startsWith('- Next phase:') ? nextLine : line)
      : [...lines, nextLine];
    return replaceGeneratedBlock(content, 'phase-linear-context', nextLines.join('\n'), join(previousPhase.absolutePath, 'Phase.md')).content;
  });

const createPhaseContent = (
  template: string,
  title: string,
  phaseId: string,
  phaseNumber: string,
  date: string,
  previousPhaseLink?: string,
): string => {
  let content = template;
  content = replaceFirstHeading(content, `Phase ${phaseNumber} ${title}`);
  content = updateFrontmatter(content, {
    title,
    phase_id: phaseId,
    created: date,
    updated: date,
    depends_on: previousPhaseLink ? [previousPhaseLink] : [],
  }).content;
  content = replaceHeadingSection(content, 'Objective', `- Define and complete the ${title} milestone.`).content;
  content = replaceHeadingSection(content, 'Why This Phase Exists', `- Capture the next bounded milestone after ${previousPhaseLink ?? 'the current roadmap baseline'}.`).content;
  content = replaceHeadingSection(content, 'Scope', [
    '- Add the concrete work items for this milestone.',
    '- Create step notes as execution becomes clearer.',
  ].join('\n')).content;
  content = replaceHeadingSection(content, 'Non-Goals', '- Leave unrelated follow-on ideas in the roadmap or inbox until they become concrete.').content;
  content = replaceHeadingSection(content, 'Dependencies', previousPhaseLink
    ? `- Depends on ${previousPhaseLink}.`
    : '- No earlier phase dependency has been recorded yet.').content;
  content = replaceHeadingSection(content, 'Acceptance Criteria', [
    '- [ ] Scope is concrete and linked to the right durable notes.',
    '- [ ] Step notes exist for the first executable work units.',
    '- [ ] Validation and documentation expectations are explicit.',
  ].join('\n')).content;
  content = replaceGeneratedBlock(content, 'phase-linear-context', [
    `- Previous phase: ${previousPhaseLink ?? 'none.'}`,
    '- Current phase status: planned',
    '- Next phase: not planned yet.',
  ].join('\n')).content;
  content = replaceGeneratedBlock(content, 'phase-related-architecture', '- None yet.').content;
  content = replaceGeneratedBlock(content, 'phase-related-decisions', '- None yet.').content;
  content = replaceGeneratedBlock(content, 'phase-related-bugs', '- None yet.').content;
  content = replaceGeneratedBlock(content, 'phase-steps', '- No step notes yet.').content;
  content = replaceHeadingSection(content, 'Notes', [
    '- Add architecture, bug, and decision links as the milestone becomes more concrete.',
    '- Use the `Steps/` directory for the first executable units instead of expanding this note too far.',
  ].join('\n')).content;
  return content;
};

const createStepContent = (
  template: string,
  title: string,
  stepId: string,
  stepNumber: string,
  phaseLink: string,
  date: string,
  companionLinks: {
    executionBrief: string,
    validationPlan: string,
    implementationNotes: string,
    outcome: string,
  },
): string => {
  let content = template;
  content = replaceFirstHeading(content, `Step ${stepNumber} - ${title}`);
  content = updateFrontmatter(content, {
    title,
    step_id: stepId,
    phase: phaseLink,
    created: date,
    updated: date,
  }).content;
  content = replaceHeadingSection(content, 'Purpose', `- Outcome: ${title}.\n- Parent phase: ${phaseLink}.`).content;
  content = replaceHeadingSection(content, 'Required Reading', [
    `- ${phaseLink}`,
    `- ${companionLinks.executionBrief}`,
    `- ${companionLinks.validationPlan}`,
  ].join('\n')).content;
  content = replaceHeadingSection(content, 'Companion Notes', [
    `- ${companionLinks.executionBrief} - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.`,
    `- ${companionLinks.validationPlan} - Acceptance checks, commands, edge cases, and regression expectations.`,
    `- ${companionLinks.implementationNotes} - Durable findings discovered while the step is being executed.`,
    `- ${companionLinks.outcome} - Final result, validation evidence, and explicit follow-up.`,
  ].join('\n')).content;
  content = replaceGeneratedBlock(content, 'step-agent-managed-snapshot', [
    '- Status: planned',
    '- Current owner: ',
    `- Last touched: ${date}`,
    `- Next action: Read ${companionLinks.executionBrief} and ${companionLinks.validationPlan}.`,
  ].join('\n')).content;
  content = replaceGeneratedBlock(content, 'step-session-history', '- No sessions yet.').content;
  return content;
};

const createStepCompanionContent = (
  heading: string,
  body: string,
  relatedNotes: string[] = [],
): string => [
  `# ${heading}`,
  '',
  body,
  ...(relatedNotes.length > 0 ? ['', '## Related Notes', '', ...relatedNotes] : []),
  '',
].join('\n');

interface ParsedTopLevelSections {
  readonly frontmatter: Record<string, unknown>;
  readonly title: string;
  readonly intro: string;
  readonly sections: Map<string, string>;
  readonly generatedBlocks: Map<string, string>;
}

const parseTopLevelSections = (content: string, notePath: string): ParsedTopLevelSections => {
  const frontmatter = parseYamlFrontmatter(content, notePath);
  const body = content.slice(frontmatter.bodyStart);
  const firstHeadingMatch = /^#\s+(.+)$/m.exec(body);
  if (!firstHeadingMatch || firstHeadingMatch.index === undefined) {
    throw new Error(`Step note is missing a top-level heading: ${notePath}`);
  }

  const firstHeadingLineStart = firstHeadingMatch.index;
  const firstHeadingLineEnd = body.indexOf('\n', firstHeadingLineStart);
  const title = firstHeadingMatch[1].trim();
  const afterFirstHeading = body.slice(firstHeadingLineEnd === -1 ? body.length : firstHeadingLineEnd + 1);
  const sectionMatches = Array.from(afterFirstHeading.matchAll(/^##\s+(.+)$/gm));
  const introEnd = sectionMatches[0]?.index ?? afterFirstHeading.length;
  const intro = afterFirstHeading.slice(0, introEnd).trim();
  const sections = new Map<string, string>();

  for (let index = 0; index < sectionMatches.length; index++) {
    const match = sectionMatches[index];
    const heading = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const bodyStart = afterFirstHeading.slice(start).startsWith('\n\n') ? start + 2 : afterFirstHeading.slice(start).startsWith('\n') ? start + 1 : start;
    const end = index + 1 < sectionMatches.length ? (sectionMatches[index + 1].index ?? afterFirstHeading.length) : afterFirstHeading.length;
    sections.set(heading, afterFirstHeading.slice(bodyStart, end).trim());
  }

  const generatedBlocks = new Map<string, string>();
  for (const blockName of ['step-agent-managed-snapshot', 'step-session-history']) {
    try {
      generatedBlocks.set(blockName, readGeneratedBlockContent(content, blockName, notePath));
    } catch {
      // ignore absent blocks in legacy/handwritten notes
    }
  }

  return { frontmatter: frontmatter.data, title, intro, sections, generatedBlocks };
};

const formatCompanionSections = (sections: Array<{ heading: string; body: string }>): string => sections
  .filter(({ body }) => body.trim().length > 0)
  .map(({ heading, body }) => `## ${heading}\n\n${body.trim()}`)
  .join('\n\n');

const isLegacyStepNoteContent = (content: string): boolean =>
  content.includes('## Execution Prompt') || content.includes('## Implementation Notes') || content.includes('## Outcome Summary');

const createSessionContent = (
  template: string,
  title: string,
  sessionId: string,
  phaseLink: string,
  owner: string,
  date: string,
  time: string,
  stepLink: string,
  updatedAt: string,
): string => {
  let content = template;
  content = replaceFirstHeading(content, title);
  content = updateFrontmatter(content, {
    title,
    session_id: sessionId,
    date,
    owner,
    phase: phaseLink,
    context: createDefaultSessionContext({
      sessionId,
      stepLink,
      updatedAt,
    }),
    created: date,
    updated: date,
  }).content;
  content = replaceHeadingSection(content, 'Objective', `- Advance ${stepLink}.\n- Leave a clean handoff if the work stops mid-step.`).content;
  content = replaceHeadingSection(content, 'Planned Scope', `- Review ${stepLink} before editing.\n- Record changed paths and validation as the session progresses.`).content;
  content = replaceGeneratedBlock(content, 'session-execution-log', [
    `- ${time} - Created session note.`,
    `- ${time} - Linked related step ${stepLink}.`,
  ].join('\n')).content;
  content = ensureHeadingSection(
    content,
    CONTEXT_HANDOFF_SECTION_HEADING,
    '- Use this as the single canonical prose section for prepared context, resume notes, and handoff summaries tied to the current effective context.\n- Keep durable conclusions promoted into phase, bug, decision, or architecture notes when they outlive the session.',
    'Changed Paths',
  );
  content = replaceGeneratedBlock(content, 'session-changed-paths', '- None yet.').content;
  content = replaceGeneratedBlock(content, 'session-validation-run', [
    '- Command: not run yet',
    '- Result: not run',
    '- Notes: ',
  ].join('\n')).content;
  content = replaceGeneratedBlock(content, 'session-bugs-encountered', '- None.').content;
  content = replaceGeneratedBlock(content, 'session-decisions-made-or-updated', '- None.').content;
  content = replaceGeneratedBlock(content, 'session-follow-up-work', `- [ ] Continue ${stepLink}.`).content;
  return content;
};

const createBugContent = (
  template: string,
  title: string,
  bugId: string,
  date: string,
  relatedLinks: string[],
  relatedBlockLines: string[],
): string => {
  let content = template;
  content = replaceFirstHeading(content, `${bugId} - ${title}`);
  content = updateFrontmatter(content, {
    title,
    bug_id: bugId,
    reported_on: date,
    created: date,
    updated: date,
    related_notes: relatedLinks,
  }).content;
  content = replaceHeadingSection(content, 'Summary', [
    `- ${title}.`,
    relatedLinks.length > 0 ? `- Related notes: ${relatedLinks.join(', ')}.` : '- Related notes: none linked yet.',
  ].join('\n')).content;
  content = replaceGeneratedBlock(
    content,
    'bug-related-notes',
    relatedBlockLines.length > 0 ? relatedBlockLines.join('\n') : '- None yet.',
  ).content;
  content = replaceGeneratedBlock(content, 'bug-timeline', `- ${date} - Reported.`).content;
  return content;
};

const createDecisionContent = (
  template: string,
  title: string,
  decisionId: string,
  date: string,
  relatedLinks: string[],
  relatedBlockLines: string[],
): string => {
  let content = template;
  content = replaceFirstHeading(content, `${decisionId} - ${title}`);
  content = updateFrontmatter(content, {
    title,
    decision_id: decisionId,
    decided_on: date,
    created: date,
    updated: date,
    related_notes: relatedLinks,
  }).content;
  content = replaceHeadingSection(content, 'Status', [
    '- Current status: proposed.',
    '- Keep this section aligned with the `status` frontmatter value.',
  ].join('\n')).content;
  content = replaceHeadingSection(content, 'Context', [
    `- Decision needed: ${title}.`,
    relatedLinks.length > 0 ? `- Related notes: ${relatedLinks.join(', ')}.` : '- Related notes: none linked yet.',
  ].join('\n')).content;
  content = replaceGeneratedBlock(
    content,
    'decision-related-notes',
    relatedBlockLines.length > 0 ? relatedBlockLines.join('\n') : '- None yet.',
  ).content;
  content = replaceGeneratedBlock(content, 'decision-change-log', `- ${date} - Created as \`proposed\`.`).content;
  return content;
};

const collectIndexedNotes = async (
  vaultRoot: string,
  directoryName: string,
  expectedNoteType: string,
): Promise<{ notes: IndexedVaultNote[]; skipped: string[] }> => {
  const files = await listMarkdownFiles(join(vaultRoot, directoryName));
  const notes: IndexedVaultNote[] = [];
  const skipped: string[] = [];

  await Promise.all(files.map(async (filePath) => {
    try {
      const frontmatter = await readNoteFrontmatter(filePath);
      if (frontmatter.note_type !== expectedNoteType) {
        return;
      }

      notes.push({
        absolutePath: filePath,
        vaultRelativePath: getRelativeNotePath(vaultRoot, filePath),
        frontmatter,
      });
    } catch {
      skipped.push(getRelativeNotePath(vaultRoot, filePath));
    }
  }));

  return { notes, skipped: skipped.sort() };
};

const updateGeneratedBlockFile = async (
  filePath: string,
  blockName: string,
  nextBlockContent: string,
): Promise<boolean> => {
  const currentContent = await readFile(filePath, 'utf-8');
  const nextContent = replaceGeneratedBlock(currentContent, blockName, nextBlockContent, filePath).content;

  if (nextContent === currentContent) {
    return false;
  }

  await writeFile(filePath, nextContent, 'utf-8');
  return true;
};

const buildBugsIndexBlock = (
  indexPath: string,
  notes: readonly IndexedVaultNote[],
  skipped: readonly string[],
  rebuiltOn: string,
): string => {
  const rows = notes
    .map((note) => {
      const bugId = parseOptionalStringField(note.frontmatter.bug_id) ?? basename(note.absolutePath, '.md');
      const title = parseOptionalStringField(note.frontmatter.title) ?? bugId;
      const status = parseOptionalStringField(note.frontmatter.status) ?? 'unknown';
      const statusKey = normalizeMetadataKey(status);
      const severity = parseOptionalStringField(note.frontmatter.severity);
      const reportedOn = parseOptionalStringField(note.frontmatter.reported_on);
      const fixedOn = parseOptionalStringField(note.frontmatter.fixed_on);
      const linearId = getFirstPresentStringField(note.frontmatter, LINEAR_FIELD_NAMES);

      return {
        bugId,
        title,
        status,
        statusKey,
        severity,
        reportedOn,
        fixedOn,
        linearId,
        titleLink: toMarkdownLink(indexPath, note.absolutePath, title),
      };
    })
    .sort((left, right) => {
      const leftStatusRank = BUG_STATUS_ORDER.get(left.statusKey) ?? Number.POSITIVE_INFINITY;
      const rightStatusRank = BUG_STATUS_ORDER.get(right.statusKey) ?? Number.POSITIVE_INFINITY;
      if (leftStatusRank !== rightStatusRank) {
        return leftStatusRank - rightStatusRank;
      }

      const severityRankDiff = parseSeverityRank(left.severity) - parseSeverityRank(right.severity);
      if (severityRankDiff !== 0) {
        return severityRankDiff;
      }

      const reportedDiff = parseDateValue(right.reportedOn) - parseDateValue(left.reportedOn);
      if (reportedDiff !== 0) {
        return reportedDiff;
      }

      return left.bugId.localeCompare(right.bugId);
    });

  const lines = [`_Last rebuilt: ${rebuiltOn}._`, ''];

  if (rows.length === 0) {
    lines.push('- No bug notes yet.');
  } else {
    lines.push(`- Notes indexed: ${rows.length}`);
    const summaryLine = buildSummaryLine(
      'Status summary',
      rows.map((row) => ({ key: row.statusKey, display: row.status })),
      BUG_STATUS_ORDER,
    );
    if (summaryLine) {
      lines.push(summaryLine);
    }

    lines.push('');
    lines.push(buildMarkdownTable(
      ['Id', 'Title', 'Status', 'Severity', 'Reported', 'Fixed', 'Linear'],
      rows.map((row) => [
        row.bugId,
        row.titleLink,
        row.status,
        toDisplayCell(row.severity),
        toDisplayCell(row.reportedOn),
        toDisplayCell(row.fixedOn),
        toDisplayCell(row.linearId),
      ]),
    ));
  }

  if (skipped.length > 0) {
    lines.push('');
    lines.push(`- Skipped invalid notes: ${skipped.map((path) => `\`${path}\``).join(', ')}`);
  }

  return lines.join('\n');
};

const buildDecisionsIndexBlock = (
  indexPath: string,
  notes: readonly IndexedVaultNote[],
  skipped: readonly string[],
  rebuiltOn: string,
): string => {
  const rows = notes
    .map((note) => {
      const decisionId = parseOptionalStringField(note.frontmatter.decision_id) ?? basename(note.absolutePath, '.md');
      const title = parseOptionalStringField(note.frontmatter.title) ?? decisionId;
      const status = parseOptionalStringField(note.frontmatter.status) ?? 'unknown';
      const statusKey = normalizeMetadataKey(status);
      const decidedOn = parseOptionalStringField(note.frontmatter.decided_on);
      const updated = parseOptionalStringField(note.frontmatter.updated);
      const linearId = getFirstPresentStringField(note.frontmatter, LINEAR_FIELD_NAMES);

      return {
        decisionId,
        title,
        status,
        statusKey,
        decidedOn,
        updated,
        linearId,
        titleLink: toMarkdownLink(indexPath, note.absolutePath, title),
      };
    })
    .sort((left, right) => {
      const leftStatusRank = DECISION_STATUS_ORDER.get(left.statusKey) ?? Number.POSITIVE_INFINITY;
      const rightStatusRank = DECISION_STATUS_ORDER.get(right.statusKey) ?? Number.POSITIVE_INFINITY;
      if (leftStatusRank !== rightStatusRank) {
        return leftStatusRank - rightStatusRank;
      }

      const decidedDiff = parseDateValue(right.decidedOn) - parseDateValue(left.decidedOn);
      if (decidedDiff !== 0) {
        return decidedDiff;
      }

      const updatedDiff = parseDateValue(right.updated) - parseDateValue(left.updated);
      if (updatedDiff !== 0) {
        return updatedDiff;
      }

      return left.decisionId.localeCompare(right.decisionId);
    });

  const lines = [`_Last rebuilt: ${rebuiltOn}._`, ''];

  if (rows.length === 0) {
    lines.push('- No decision notes yet.');
  } else {
    lines.push(`- Notes indexed: ${rows.length}`);
    const summaryLine = buildSummaryLine(
      'Status summary',
      rows.map((row) => ({ key: row.statusKey, display: row.status })),
      DECISION_STATUS_ORDER,
    );
    if (summaryLine) {
      lines.push(summaryLine);
    }

    lines.push('');
    lines.push(buildMarkdownTable(
      ['Id', 'Title', 'Status', 'Decided', 'Updated', 'Linear'],
      rows.map((row) => [
        row.decisionId,
        row.titleLink,
        row.status,
        toDisplayCell(row.decidedOn),
        toDisplayCell(row.updated),
        toDisplayCell(row.linearId),
      ]),
    ));
  }

  if (skipped.length > 0) {
    lines.push('');
    lines.push(`- Skipped invalid notes: ${skipped.map((path) => `\`${path}\``).join(', ')}`);
  }

  return lines.join('\n');
};

const buildPhaseSummary = (note: IndexedVaultNote): { link: string; status?: string; owner?: string; phase?: string; updated?: string; created?: string } => {
  const title = parseOptionalStringField(note.frontmatter.title) ?? basename(note.absolutePath, '.md');
  const phaseId = parseOptionalStringField(note.frontmatter.phase_id);
  return {
    link: toWikiLink(note.vaultRelativePath, phaseId ? `${phaseId} ${title}` : title),
    status: parseOptionalStringField(note.frontmatter.status),
    owner: parseOptionalStringField(note.frontmatter.owner),
    phase: undefined,
    updated: parseOptionalStringField(note.frontmatter.updated),
    created: parseOptionalStringField(note.frontmatter.created),
  };
};

const buildStepSummary = (note: IndexedVaultNote): { link: string; status?: string; owner?: string; phase?: string; updated?: string; created?: string } => {
  const title = parseOptionalStringField(note.frontmatter.title) ?? basename(note.absolutePath, '.md');
  const stepId = parseOptionalStringField(note.frontmatter.step_id);
  return {
    link: toWikiLink(note.vaultRelativePath, stepId ? `${stepId} ${title}` : title),
    status: parseOptionalStringField(note.frontmatter.status),
    owner: parseOptionalStringField(note.frontmatter.owner),
    phase: parseOptionalStringField(note.frontmatter.phase),
    updated: parseOptionalStringField(note.frontmatter.updated),
    created: parseOptionalStringField(note.frontmatter.created),
  };
};

const buildSessionSummary = (note: IndexedVaultNote): { link: string; status?: string; owner?: string; phase?: string; updated?: string; created?: string } => {
  const title = parseOptionalStringField(note.frontmatter.title) ?? basename(note.absolutePath, '.md');
  const sessionId = parseOptionalStringField(note.frontmatter.session_id);
  return {
    link: toWikiLink(note.vaultRelativePath, sessionId ? `${sessionId} ${title}` : title),
    status: parseOptionalStringField(note.frontmatter.status),
    owner: parseOptionalStringField(note.frontmatter.owner),
    phase: parseOptionalStringField(note.frontmatter.phase),
    updated: parseOptionalStringField(note.frontmatter.updated),
    created: parseOptionalStringField(note.frontmatter.created) ?? parseOptionalStringField(note.frontmatter.date),
  };
};

const buildBugSummary = (note: IndexedVaultNote): { link: string; status?: string; severity?: string; reportedOn?: string; linearId?: string; updated?: string; created?: string } => {
  const title = parseOptionalStringField(note.frontmatter.title) ?? basename(note.absolutePath, '.md');
  const bugId = parseOptionalStringField(note.frontmatter.bug_id);
  return {
    link: toWikiLink(note.vaultRelativePath, bugId ? `${bugId} ${title}` : title),
    status: parseOptionalStringField(note.frontmatter.status),
    severity: parseOptionalStringField(note.frontmatter.severity),
    reportedOn: parseOptionalStringField(note.frontmatter.reported_on),
    linearId: getFirstPresentStringField(note.frontmatter, LINEAR_FIELD_NAMES),
    updated: parseOptionalStringField(note.frontmatter.updated),
    created: parseOptionalStringField(note.frontmatter.created),
  };
};

const buildCurrentFocusBlock = (
  phases: readonly IndexedVaultNote[],
  steps: readonly IndexedVaultNote[],
  sessions: readonly IndexedVaultNote[],
  bugs: readonly IndexedVaultNote[],
  refreshedOn: string,
): string => {
  const activeSessions = sessions
    .map(buildSessionSummary)
    .filter((session) => isStatusInSet(session.status, ACTIVE_SESSION_STATUSES))
    .sort(compareByUpdatedDesc);
  const activeSteps = steps
    .map(buildStepSummary)
    .filter((step) => isStatusInSet(step.status, ACTIVE_WORK_STATUSES) || isOpenWorkStatus(step.status))
    .sort(compareByUpdatedDesc);
  const activePhases = phases
    .map(buildPhaseSummary)
    .filter((phase) => isStatusInSet(phase.status, ACTIVE_WORK_STATUSES) || isOpenWorkStatus(phase.status))
    .sort(compareByUpdatedDesc);
  const criticalBugCount = bugs
    .map(buildBugSummary)
    .filter((bug) => parseSeverityRank(bug.severity) <= 2 && normalizeMetadataKey(bug.status ?? '') !== 'closed')
    .length;

  const lines = [`_Last refreshed: ${refreshedOn}._`];
  const primarySession = activeSessions[0];
  lines.push(primarySession
    ? `- Session in progress: ${primarySession.link}${withMetadataSuffix([
        primarySession.owner ? `owner: ${primarySession.owner}` : undefined,
        primarySession.phase ? `phase: ${primarySession.phase}` : undefined,
        primarySession.updated ? `updated: ${primarySession.updated}` : undefined,
      ])}`
    : '- Session in progress: none.');

  const primaryStep = activeSteps[0];
  lines.push(primaryStep
    ? `- Current step: ${primaryStep.link}${withMetadataSuffix([
        primaryStep.status ? `status: ${primaryStep.status}` : undefined,
        primaryStep.phase ? `phase: ${primaryStep.phase}` : undefined,
        primaryStep.owner ? `owner: ${primaryStep.owner}` : undefined,
      ])}`
    : '- Current step: no active or planned step is marked in metadata.');

  const primaryPhase = activePhases[0];
  lines.push(primaryPhase
    ? `- Active phase: ${primaryPhase.link}${withMetadataSuffix([
        primaryPhase.status ? `status: ${primaryPhase.status}` : undefined,
        primaryPhase.owner ? `owner: ${primaryPhase.owner}` : undefined,
        primaryPhase.updated ? `updated: ${primaryPhase.updated}` : undefined,
      ])}`
    : '- Active phase: no active or planned phase is marked in metadata.');

  const overflow = [
    summarizeOverflow('additional sessions', Math.max(activeSessions.length - 1, 0)),
    summarizeOverflow('additional steps', Math.max(activeSteps.length - 1, 0)),
    criticalBugCount > 0 ? `${criticalBugCount} open critical bug${criticalBugCount === 1 ? '' : 's'}` : undefined,
  ].filter((value): value is string => value !== undefined);
  if (overflow.length > 0) {
    lines.push(`- Also active: ${overflow.join(', ')}.`);
  }

  return lines.join('\n');
};

const buildBlockersBlock = (
  phases: readonly IndexedVaultNote[],
  steps: readonly IndexedVaultNote[],
  sessions: readonly IndexedVaultNote[],
): string => {
  const blockedItems = [
    ...phases.map((note) => ({ kind: 'Phase', ...buildPhaseSummary(note) })),
    ...steps.map((note) => ({ kind: 'Step', ...buildStepSummary(note) })),
    ...sessions.map((note) => ({ kind: 'Session', ...buildSessionSummary(note) })),
  ]
    .filter((item) => isStatusInSet(item.status, BLOCKER_STATUSES))
    .sort(compareByUpdatedDesc);

  if (blockedItems.length === 0) {
    return '- No phase, step, or session notes are currently marked blocked.';
  }

  return blockedItems
    .slice(0, 6)
    .map((item) => `- ${item.kind}: ${item.link}${withMetadataSuffix([
      item.status ? `status: ${item.status}` : undefined,
      item.owner ? `owner: ${item.owner}` : undefined,
      item.phase ? `phase: ${item.phase}` : undefined,
      item.updated ? `updated: ${item.updated}` : undefined,
    ])}`)
    .join('\n');
};

const buildCriticalBugsBlock = (bugs: readonly IndexedVaultNote[]): string => {
  const criticalBugs = bugs
    .map(buildBugSummary)
    .filter((bug) => parseSeverityRank(bug.severity) <= 2 && normalizeMetadataKey(bug.status ?? '') !== 'closed')
    .sort((left, right) => {
      const severityDiff = parseSeverityRank(left.severity) - parseSeverityRank(right.severity);
      if (severityDiff !== 0) {
        return severityDiff;
      }

      const reportedDiff = parseDateValue(right.reportedOn) - parseDateValue(left.reportedOn);
      if (reportedDiff !== 0) {
        return reportedDiff;
      }

      return compareByUpdatedDesc(left, right);
    });

  if (criticalBugs.length === 0) {
    return '- No open sev-1 or sev-2 bugs are currently recorded.';
  }

  return criticalBugs
    .slice(0, 6)
    .map((bug) => `- ${bug.link}${withMetadataSuffix([
      bug.status ? `status: ${bug.status}` : undefined,
      bug.severity ? `severity: ${bug.severity}` : undefined,
      bug.reportedOn ? `reported: ${bug.reportedOn}` : undefined,
      bug.linearId ? `Linear: ${bug.linearId}` : undefined,
    ])}`)
    .join('\n');
};

const ensureParentDirectory = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};

const writeNewNote = async (filePath: string, content: string): Promise<void> => {
  await ensureParentDirectory(filePath);
  try {
    await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Refusing to overwrite existing note: ${filePath}`);
    }
    throw error;
  }
};

const emitCreatedNote = (io: AgentVaultCommandIO, vaultRoot: string, notePath: string): void => {
  io.stdout(`Created ${getRelativeNotePath(vaultRoot, notePath)}`);
};

export async function handleCreateStepCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('create-step'));
      return 0;
    }

    const { positionals } = parseArgs(argv);
    const phaseRaw = positionals[0];
    const stepRaw = positionals[1];
    const title = positionals.slice(2).join(' ').trim();

    if (!phaseRaw || !stepRaw || title.length === 0) {
      throw new Error(formatCommandUsage('create-step'));
    }

    const vaultRoot = getVaultRoot(environment);
    const phaseNumber = padNumber(phaseRaw, 2, 'Phase number');
    const stepNumber = padNumber(stepRaw, 2, 'Step number');
    const phase = await findPhase(vaultRoot, phaseNumber);
    const template = await readTemplate(vaultRoot, STEP_TEMPLATE_PATH);
    const date = formatDate(environment.now?.() ?? new Date());
    const stepId = `STEP-${phaseNumber}-${stepNumber}`;
    const stepBaseName = `Step_${stepNumber}_${slugify(title)}`;
    const filePath = join(
      phase.absolutePath,
      'Steps',
      `${stepBaseName}.md`,
    );
    const companionDirectory = join(phase.absolutePath, 'Steps', stepBaseName);
    const companionLinks = {
      executionBrief: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Execution_Brief.md')), 'Execution Brief'),
      validationPlan: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Validation_Plan.md')), 'Validation Plan'),
      implementationNotes: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Implementation_Notes.md')), 'Implementation Notes'),
      outcome: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Outcome.md')), 'Outcome'),
    };

    const content = createStepContent(template, title, stepId, stepNumber, phase.phaseLink, date, companionLinks);
    await writeNewNote(filePath, content);
    const stepLink = toWikiLink(getRelativeNotePath(vaultRoot, filePath), `${stepId} ${title}`);
    const companionRelatedNotes = [
      `- Step: ${stepLink}`,
      `- Phase: ${phase.phaseLink}`,
    ];
    await writeNewNote(join(companionDirectory, 'Execution_Brief.md'), createStepCompanionContent('Execution Brief', [
      '- Record why the step exists, prerequisites, likely code paths, and the smallest execution checklist here.',
    ].join('\n'), companionRelatedNotes));
    await writeNewNote(join(companionDirectory, 'Validation_Plan.md'), createStepCompanionContent('Validation Plan', [
      '- Record the direct validation commands, acceptance checks, edge cases, and regression expectations here.',
    ].join('\n'), companionRelatedNotes));
    await writeNewNote(join(companionDirectory, 'Implementation_Notes.md'), createStepCompanionContent('Implementation Notes', [
      '- Capture durable findings learned during execution. Prefer short bullets with file paths, commands, and observed behavior.',
    ].join('\n'), companionRelatedNotes));
    await writeNewNote(join(companionDirectory, 'Outcome.md'), createStepCompanionContent('Outcome', [
      '- Record the final result, validation performed, and explicit follow-up here.',
    ].join('\n'), companionRelatedNotes));
    await tryApplyBackreference(io, `phase step list for ${phase.directoryName}`, () =>
      linkStepBackToPhase(join(phase.absolutePath, 'Phase.md'), stepLink, date));
    emitCreatedNote(io, vaultRoot, filePath);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleMigrateStepNotesCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('migrate-step-notes'));
      return 0;
    }

    const { options } = parseArgs(argv);
    const vaultRoot = getVaultRoot(environment);
    const phaseRef = getRequiredOption(options, 'phase');
    const stepRef = getRequiredOption(options, 'step');
    const template = await readTemplate(vaultRoot, STEP_TEMPLATE_PATH);
    const date = formatDate(environment.now?.() ?? new Date());

    const stepFilter = stepRef ? await resolveStepReference(vaultRoot, stepRef) : undefined;
    const phaseFilter = phaseRef ? await resolvePhaseReference(vaultRoot, phaseRef) : undefined;
    const allStepFiles = await listMarkdownFiles(join(vaultRoot, '02_Phases'));
    let migratedCount = 0;

    for (const filePath of allStepFiles) {
      const relativePath = getRelativeNotePath(vaultRoot, filePath);
      if (!/^02_Phases\/[^/]+\/Steps\/[^/]+\.md$/.test(relativePath)) continue;
      if (stepFilter && relativePath !== stepFilter.vaultRelativePath) continue;
      if (phaseFilter) {
        const phaseDirectory = basename(dirname(phaseFilter.absolutePath));
        if (!relativePath.startsWith(`02_Phases/${phaseDirectory}/Steps/`)) continue;
      }

      const content = await readFile(filePath, 'utf-8');
      if (!isLegacyStepNoteContent(content) || content.includes('## Companion Notes')) continue;

      const parsed = parseTopLevelSections(content, filePath);
      const frontmatter = parsed.frontmatter;
      if (frontmatter.note_type !== 'step') continue;

      const title = parseStringField(filePath, 'title', frontmatter.title);
      const stepId = parseStringField(filePath, 'step_id', frontmatter.step_id);
      const phaseLink = parseStringField(filePath, 'phase', frontmatter.phase);
      const stepNumber = stepId.split('-').at(-1) ?? '00';
      const stepBaseName = basename(filePath, '.md');
      const companionDirectory = join(dirname(filePath), stepBaseName);
      const companionLinks = {
        executionBrief: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Execution_Brief.md')), 'Execution Brief'),
        validationPlan: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Validation_Plan.md')), 'Validation Plan'),
        implementationNotes: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Implementation_Notes.md')), 'Implementation Notes'),
        outcome: toWikiLink(getRelativeNotePath(vaultRoot, join(companionDirectory, 'Outcome.md')), 'Outcome'),
      };
      const stepLink = toWikiLink(getRelativeNotePath(vaultRoot, filePath), `${stepId} ${title}`);
      const companionRelatedNotes = [
        `- Step: ${stepLink}`,
        `- Phase: ${phaseLink}`,
      ];

      await mkdir(companionDirectory, { recursive: true });
      await writeNewNote(join(companionDirectory, 'Execution_Brief.md'), createStepCompanionContent('Execution Brief', formatCompanionSections([
        { heading: 'Step Overview', body: parsed.intro },
        { heading: 'Why This Step Exists', body: parsed.sections.get('Why This Step Exists') ?? '' },
        { heading: 'Prerequisites', body: parsed.sections.get('Prerequisites') ?? '' },
        { heading: 'Relevant Code Paths', body: parsed.sections.get('Relevant Code Paths') ?? '' },
        { heading: 'Execution Prompt', body: parsed.sections.get('Execution Prompt') ?? '' },
      ]), companionRelatedNotes));
      await writeNewNote(join(companionDirectory, 'Validation_Plan.md'), createStepCompanionContent('Validation Plan', formatCompanionSections([
        { heading: 'Readiness Checklist', body: parsed.sections.get('Readiness Checklist') ?? '' },
      ]), companionRelatedNotes));
      await writeNewNote(join(companionDirectory, 'Implementation_Notes.md'), createStepCompanionContent('Implementation Notes', parsed.sections.get('Implementation Notes') ?? '- No implementation findings were migrated.', companionRelatedNotes));
      await writeNewNote(join(companionDirectory, 'Outcome.md'), createStepCompanionContent('Outcome', parsed.sections.get('Outcome Summary') ?? '- No outcome summary was migrated.', companionRelatedNotes));

      let nextContent = createStepContent(template, title, stepId, stepNumber, phaseLink, date, companionLinks);
      nextContent = updateFrontmatter(nextContent, frontmatter).content;
      if (parsed.sections.has('Purpose')) nextContent = replaceHeadingSection(nextContent, 'Purpose', parsed.sections.get('Purpose')!).content;
      if (parsed.sections.has('Required Reading')) nextContent = replaceHeadingSection(nextContent, 'Required Reading', parsed.sections.get('Required Reading')!).content;
      if (parsed.sections.has('Human Notes')) nextContent = replaceHeadingSection(nextContent, 'Human Notes', parsed.sections.get('Human Notes')!).content;
      if (parsed.generatedBlocks.has('step-agent-managed-snapshot')) nextContent = replaceGeneratedBlock(nextContent, 'step-agent-managed-snapshot', parsed.generatedBlocks.get('step-agent-managed-snapshot')!, filePath).content;
      if (parsed.generatedBlocks.has('step-session-history')) nextContent = replaceGeneratedBlock(nextContent, 'step-session-history', parsed.generatedBlocks.get('step-session-history')!, filePath).content;
      await writeFile(filePath, nextContent, 'utf-8');
      migratedCount++;
    }

    const projectRoot = basename(vaultRoot) === '.agent-vault' ? dirname(vaultRoot) : vaultRoot;
    const scan = await scanProject(projectRoot);
    const graph = await writeCodeGraph(projectRoot, vaultRoot, scan.repoName);

    io.stdout(`Migrated ${migratedCount} legacy step note${migratedCount === 1 ? '' : 's'}.`);
    io.stdout(`Code graph refreshed: ${graph.totalFiles} files, ${graph.totalSymbols} symbols indexed.`);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleCreatePhaseCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('create-phase'));
      return 0;
    }

    const { positionals, options } = parseArgs(argv);
    const title = positionals.join(' ').trim();
    if (title.length === 0) {
      throw new Error(formatCommandUsage('create-phase'));
    }

    const vaultRoot = getVaultRoot(environment);
    const insertBeforeRef = getRequiredOption(options, 'insert-before');

    // Handle --insert-before: renumber existing phases to make room
    let phaseNumber: string;
    if (insertBeforeRef) {
      if (getRequiredOption(options, 'phase-number')) {
        throw new Error('Cannot use --insert-before together with --phase-number.');
      }
      const insertionPoint = parseInsertBeforeTarget(insertBeforeRef);
      const existingPhases = (await listPhaseDirectoryNames(vaultRoot))
        .map(parsePhaseNumberFromDirectory)
        .filter((n): n is number => n !== null);
      if (!existingPhases.includes(insertionPoint)) {
        throw new Error(`Phase ${insertionPoint} does not exist. Cannot insert before a non-existent phase.`);
      }
      await renumberPhasesFrom(vaultRoot, insertionPoint);
      phaseNumber = String(insertionPoint).padStart(2, '0');
    } else {
      phaseNumber = getRequiredOption(options, 'phase-number')
        ? padNumber(getRequiredOption(options, 'phase-number')!, 2, 'Phase number')
        : await getNextPhaseNumber(vaultRoot);
    }

    const previousPhaseRef = getRequiredOption(options, 'previous');
    const previousPhase = previousPhaseRef
      ? await resolvePhaseReference(vaultRoot, previousPhaseRef)
      : await findPreviousPhase(vaultRoot, phaseNumber);
    const date = formatDate(environment.now?.() ?? new Date());
    const phaseId = buildPhaseId(phaseNumber);
    const directoryName = `Phase_${phaseNumber}_${slugify(title).replace(/-/g, '_')}`;
    const phaseDirectory = join(vaultRoot, '02_Phases', directoryName);
    const phasePath = join(phaseDirectory, 'Phase.md');
    const stepsDirectory = join(phaseDirectory, 'Steps');
    const template = await readTemplate(vaultRoot, PHASE_TEMPLATE_PATH);
    const content = createPhaseContent(template, title, phaseId, phaseNumber, date, previousPhase?.wikiLink);

    if (existsSync(phaseDirectory)) {
      throw new Error(`Refusing to overwrite existing phase directory: ${phaseDirectory}`);
    }

    await mkdir(stepsDirectory, { recursive: true });
    await writeNewNote(phasePath, content);
    if (previousPhase) {
      await tryApplyBackreference(io, `previous phase linkage for ${previousPhase.phaseId}`, () =>
        linkPhaseForwardFromPreviousPhase({
          directoryName: basename(dirname(previousPhase.absolutePath)),
          absolutePath: dirname(previousPhase.absolutePath),
          phaseLink: previousPhase.wikiLink,
        }, toWikiLink(getRelativeNotePath(vaultRoot, phasePath), `${phaseId} ${title}`), date));
    }

    // When inserting before, fix links between new phase and the shifted next phase
    if (insertBeforeRef) {
      const nextPhaseNumber = String(parseInsertBeforeTarget(insertBeforeRef) + 1).padStart(2, '0');
      const newPhaseLink = toWikiLink(getRelativeNotePath(vaultRoot, phasePath), `${phaseId} ${title}`);

      try {
        const shiftedPhaseInfo = await findPhase(vaultRoot, nextPhaseNumber);
        const shiftedPhasePath = join(shiftedPhaseInfo.absolutePath, 'Phase.md');
        const shiftedPhaseLink = shiftedPhaseInfo.phaseLink;

        // Update new phase's "Next phase" in linear context
        await tryApplyBackreference(io, `next phase linkage for ${phaseId}`, () =>
          updateBackreferenceNote(phasePath, date, (phaseContent) => {
            const block = readGeneratedBlockContent(phaseContent, 'phase-linear-context', phasePath);
            const lines = block.trim().length === 0 ? [] : block.trim().split('\n');
            const nextLine = `- Next phase: ${shiftedPhaseLink}`;
            const nextLines = lines.some((line) => line.startsWith('- Next phase:'))
              ? lines.map((line) => line.startsWith('- Next phase:') ? nextLine : line)
              : [...lines, nextLine];
            return replaceGeneratedBlock(phaseContent, 'phase-linear-context', nextLines.join('\n'), phasePath).content;
          }),
        );

        // Update shifted phase's "Previous phase" and depends_on to point to new phase,
        // preserving any non-linear dependencies the user may have added.
        await tryApplyBackreference(io, `shifted phase linkage for PHASE-${nextPhaseNumber}`, () =>
          updateBackreferenceNote(shiftedPhasePath, date, (shiftedContent) => {
            const shiftedFm = parseYamlFrontmatter(shiftedContent, shiftedPhasePath).data;
            const existingDeps = parseStringListField(shiftedPhasePath, 'depends_on', shiftedFm.depends_on);
            const previousPhaseLink = previousPhase?.wikiLink;
            // Replace only the linear previous-phase dependency; preserve all others
            const updatedDeps = previousPhaseLink && existingDeps.includes(previousPhaseLink)
              ? existingDeps.map((dep) => dep === previousPhaseLink ? newPhaseLink : dep)
              : [newPhaseLink, ...existingDeps.filter((dep) => dep !== newPhaseLink)];
            let result = updateFrontmatter(shiftedContent, { depends_on: updatedDeps }, shiftedPhasePath).content;
            const block = readGeneratedBlockContent(result, 'phase-linear-context', shiftedPhasePath);
            const lines = block.trim().length === 0 ? [] : block.trim().split('\n');
            const prevLine = `- Previous phase: ${newPhaseLink}`;
            const nextLines = lines.some((line) => line.startsWith('- Previous phase:'))
              ? lines.map((line) => line.startsWith('- Previous phase:') ? prevLine : line)
              : [prevLine, ...lines];
            return replaceGeneratedBlock(result, 'phase-linear-context', nextLines.join('\n'), shiftedPhasePath).content;
          }),
        );
      } catch (error) {
        io.stderr(
          `Warning: failed to update shifted phase linkage for PHASE-${nextPhaseNumber}: ` +
          (error instanceof Error ? error.message : String(error)),
        );
      }
    }

    emitCreatedNote(io, vaultRoot, phasePath);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleCreateSessionCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('create-session'));
      return 0;
    }

    const { positionals, options } = parseArgs(argv);
    const relatedStep = positionals[0]?.trim();
    const agentName = getRequiredOption(options, 'agent') ?? '';

    if (!relatedStep) {
      throw new Error(formatCommandUsage('create-session'));
    }

    const vaultRoot = getVaultRoot(environment);
    const step = await resolveStepReference(vaultRoot, relatedStep);
    const now = environment.now?.() ?? new Date();
    const date = formatDate(now);
    const timestamp = formatTimestamp(now);
    const title = agentName.length > 0 ? `${agentName} session for ${step.title}` : `Session for ${step.title}`;
    const sessionId = `SESSION-${timestamp}`;
    const filePath = join(
      vaultRoot,
      '05_Sessions',
      `${timestamp}-${slugify(step.title)}${agentName.length > 0 ? `-${slugify(agentName)}` : ''}.md`,
    );
    const template = await readTemplate(vaultRoot, SESSION_TEMPLATE_PATH);
    const content = createSessionContent(
      template,
      title,
      sessionId,
      step.phaseLink,
      agentName,
      date,
      formatTime(now),
      step.wikiLink,
      now.toISOString(),
    );

    await writeNewNote(filePath, content);
    const sessionLink = toWikiLink(getRelativeNotePath(vaultRoot, filePath), `${sessionId} ${title}`);
    // Mirror canonical session context onto the step note.
    const defaultContext = createDefaultSessionContext({
      sessionId,
      stepLink: step.wikiLink,
      updatedAt: now.toISOString(),
    });
    await tryApplyBackreference(io, `step backreference for ${step.stepId}`, () =>
      linkSessionBackToStep(
        step,
        sessionLink,
        date,
        defaultContext.context_id,
        defaultContext.status,
        defaultContext.current_focus.summary,
      ));
    emitCreatedNote(io, vaultRoot, filePath);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleCreateBugCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('create-bug'));
      return 0;
    }

    const { positionals, options } = parseArgs(argv);
    const title = positionals.join(' ').trim();
    if (title.length === 0) {
      throw new Error(formatCommandUsage('create-bug'));
    }

    const vaultRoot = getVaultRoot(environment);
    const bugId = validateBugId(getRequiredOption(options, 'bug-id') ?? await nextBugId(vaultRoot));
    const relatedStepRef = getRequiredOption(options, 'step');
    const relatedSessionRef = getRequiredOption(options, 'session');
    const relatedStep = relatedStepRef ? await resolveStepReference(vaultRoot, relatedStepRef) : undefined;
    const relatedSession = relatedSessionRef ? await resolveSessionReference(vaultRoot, relatedSessionRef) : undefined;
    const phaseLink = relatedStep?.phaseLink ?? relatedSession?.phaseLink;
    const relatedLinks = [relatedStep?.wikiLink, relatedSession?.wikiLink].filter((value): value is string => typeof value === 'string');
    const relatedBlockLines = [
      phaseLink ? `- Phase: ${phaseLink}` : null,
      relatedStep ? `- Step: ${relatedStep.wikiLink}` : null,
      relatedSession ? `- Session: ${relatedSession.wikiLink}` : null,
    ].filter((value): value is string => value !== null);
    const date = formatDate(environment.now?.() ?? new Date());
    const template = await readTemplate(vaultRoot, BUG_TEMPLATE_PATH);
    const filePath = join(vaultRoot, '03_Bugs', `${bugId}_${slugify(title)}.md`);
    const content = createBugContent(template, title, bugId, date, relatedLinks, relatedBlockLines);

    await writeNewNote(filePath, content);
    const bugLink = toWikiLink(getRelativeNotePath(vaultRoot, filePath), `${bugId} ${title}`);
    if (relatedStep) {
      await tryApplyBackreference(io, `step backreference for ${relatedStep.stepId}`, () =>
        linkBugBackToStep(relatedStep, bugLink, date));
    }
    if (relatedSession) {
      await tryApplyBackreference(io, `session backreference for ${relatedSession.sessionId}`, () =>
        linkBugBackToSession(relatedSession, bugLink, date));
    }
    await tryApplyBackreference(io, 'phase related bugs list', () =>
      linkBugBackToPhase(relatedStep?.phaseNotePath ?? relatedSession?.phaseNotePath, bugLink, date));
    emitCreatedNote(io, vaultRoot, filePath);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleCreateDecisionCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('create-decision'));
      return 0;
    }

    const { positionals, options } = parseArgs(argv);
    const title = positionals.join(' ').trim();
    if (title.length === 0) {
      throw new Error(formatCommandUsage('create-decision'));
    }

    const vaultRoot = getVaultRoot(environment);
    const decisionId = validateDecisionId(getRequiredOption(options, 'decision-id') ?? await nextDecisionId(vaultRoot));
    const phaseRef = getRequiredOption(options, 'phase');
    const sessionRef = getRequiredOption(options, 'session');
    const bugRef = getRequiredOption(options, 'bug');
    const relatedPhase = phaseRef ? await resolvePhaseReference(vaultRoot, phaseRef) : undefined;
    const relatedSession = sessionRef ? await resolveSessionReference(vaultRoot, sessionRef) : undefined;
    const relatedBug = bugRef ? await resolveBugReference(vaultRoot, bugRef) : undefined;

    if (!relatedPhase && !relatedSession && !relatedBug) {
      throw new Error(formatCommandUsage('create-decision'));
    }

    const relatedLinks = [relatedPhase?.wikiLink, relatedSession?.wikiLink, relatedBug?.wikiLink]
      .filter((value): value is string => typeof value === 'string');
    const relatedBlockLines = [
      relatedPhase ? `- Phase: ${relatedPhase.wikiLink}` : null,
      relatedSession ? `- Session: ${relatedSession.wikiLink}` : null,
      relatedBug ? `- Bug: ${relatedBug.wikiLink}` : null,
    ].filter((value): value is string => value !== null);
    const date = formatDate(environment.now?.() ?? new Date());
    const template = await readTemplate(vaultRoot, DECISION_TEMPLATE_PATH);
    const filePath = join(vaultRoot, '04_Decisions', `${decisionId}_${slugify(title)}.md`);
    const content = createDecisionContent(template, title, decisionId, date, relatedLinks, relatedBlockLines);

    await writeNewNote(filePath, content);
    const decisionLink = toWikiLink(getRelativeNotePath(vaultRoot, filePath), `${decisionId} ${title}`);
    if (relatedPhase) {
      await tryApplyBackreference(io, `phase backreference for ${relatedPhase.phaseId}`, () =>
        linkDecisionBackToPhase(relatedPhase, decisionLink, date));
    }
    if (relatedSession) {
      await tryApplyBackreference(io, `session backreference for ${relatedSession.sessionId}`, () =>
        linkDecisionBackToSession(relatedSession, decisionLink, date));
      const derivedPhasePath = relatedSession.phaseNotePath;
      if (derivedPhasePath && !relatedPhase) {
        const derivedPhase = await resolvePhaseReference(vaultRoot, derivedPhasePath);
        await tryApplyBackreference(io, `phase backreference for ${derivedPhase.phaseId}`, () =>
          linkDecisionBackToPhase(derivedPhase, decisionLink, date));
      }
    }
    if (relatedBug) {
      await tryApplyBackreference(io, `bug backreference for ${relatedBug.bugId}`, () =>
        linkDecisionBackToBug(relatedBug, decisionLink, date));
    }
    emitCreatedNote(io, vaultRoot, filePath);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleUpdateFrontmatterCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('update-frontmatter'));
      return 0;
    }

    const { positionals } = parseArgs(argv);
    const notePath = positionals[0]?.trim();
    if (!notePath) {
      throw new Error(formatCommandUsage('update-frontmatter'));
    }

    const vaultRoot = getVaultRoot(environment);
    const absolutePath = resolveVaultRelativePath(vaultRoot, notePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Note does not exist: ${notePath}`);
    }

    // Collect all --set key=value pairs from argv directly (parseArgs may consume only one).
    const updates: Record<string, unknown> = {};
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--set' && argv[i + 1]) {
        const pair = argv[i + 1];
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) {
          throw new Error(`Invalid --set value "${pair}". Expected key=value format.`);
        }
        const key = pair.slice(0, eqIndex).trim();
        const value = pair.slice(eqIndex + 1);
        if (key.length === 0) {
          throw new Error(`Invalid --set value "${pair}". Key must not be empty.`);
        }
        // Support empty arrays via "[]" syntax.
        updates[key] = value === '[]' ? [] : value;
        i++;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('At least one --set key=value pair is required.');
    }

    const content = await readFile(absolutePath, 'utf-8');
    const result = updateFrontmatter(content, updates, notePath);
    if (result.changed) {
      await writeFile(absolutePath, result.content, 'utf-8');
      io.stdout(`Updated frontmatter in ${notePath}`);

      // Auto-re-mirror step mirrors when session context fields change.
      const hasContextUpdate = Object.keys(updates).some((key) => key === 'context' || key.startsWith('context.'));
      if (hasContextUpdate) {
        try {
          const updatedFrontmatter = parseYamlFrontmatter(result.content, notePath).data;
          if (updatedFrontmatter.note_type === 'session') {
            const sessionUpdatedOn = parseOptionalStringField(updatedFrontmatter.updated) ?? formatDate(new Date());
            // Scan step notes for ones that reference this session in their related_sessions.
            const sessionRelPath = getRelativeNotePath(vaultRoot, absolutePath).replace(/\.md$/i, '');
            const candidateSteps = await listMarkdownFiles(join(vaultRoot, '02_Phases'));
            for (const candidatePath of candidateSteps) {
              try {
                const candidateFm = await readNoteFrontmatter(candidatePath);
                if (candidateFm.note_type !== 'step') continue;
                const stepRelatedSessions = parseStringListField(candidatePath, 'related_sessions', candidateFm.related_sessions);
                if (stepRelatedSessions.some((link: string) => link.includes(sessionRelPath))) {
                  const candidateRelPath = getRelativeNotePath(vaultRoot, candidatePath);
                  const step: ResolvedStepNote = {
                    absolutePath: candidatePath,
                    vaultRelativePath: candidateRelPath,
                    wikiLink: toWikiLink(candidateRelPath, `${candidateFm.step_id ?? ''} ${candidateFm.title ?? ''}`),
                    title: parseOptionalStringField(candidateFm.title) ?? '',
                    stepId: parseOptionalStringField(candidateFm.step_id) ?? '',
                    phaseLink: parseOptionalStringField(candidateFm.phase) ?? '',
                  };
                  await updateStepMirrors(step, absolutePath, sessionUpdatedOn);
                }
              } catch {
                // Skip unreadable step notes.
              }
            }
          }
        } catch (mirrorError) {
          io.stderr(`Warning: step mirror update failed: ${mirrorError instanceof Error ? mirrorError.message : String(mirrorError)}`);
        }
      }
    } else {
      io.stdout(`Unchanged ${notePath}`);
    }
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleAppendSectionCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('append-section'));
      return 0;
    }

    const { positionals, options } = parseArgs(argv);
    const notePath = positionals[0]?.trim();
    if (!notePath) {
      throw new Error(formatCommandUsage('append-section'));
    }

    const heading = getRequiredOption(options, 'heading');
    const content = getRequiredOption(options, 'content');
    if (!heading) {
      throw new Error('Option --heading is required.');
    }
    if (!content) {
      throw new Error('Option --content is required.');
    }

    const vaultRoot = getVaultRoot(environment);
    const absolutePath = resolveVaultRelativePath(vaultRoot, notePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Note does not exist: ${notePath}`);
    }

    const fileContent = await readFile(absolutePath, 'utf-8');
    const result = appendToAppendOnlySection(fileContent, heading, content, notePath);
    if (result.changed) {
      await writeFile(absolutePath, result.content, 'utf-8');
      io.stdout(`Appended to "${heading}" in ${notePath}`);
    } else {
      io.stdout(`Unchanged ${notePath}`);
    }
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleRebuildIndexesCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('rebuild-indexes'));
      return 0;
    }

    const stdout: string[] = [];
    const stderr: string[] = [];
    const nestedEnvironment: AgentVaultCommandEnvironment = {
      ...environment,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    };

    const exitCodes = [
      await handleRebuildBugsIndexCommand([], nestedEnvironment),
      await handleRebuildDecisionsIndexCommand([], nestedEnvironment),
    ];

    for (const message of stdout) {
      io.stdout(message);
    }

    if (stderr.length > 0) {
      for (const message of stderr) {
        io.stderr(message);
      }
    }

    if (exitCodes.some((code) => code !== 0)) {
      return 1;
    }

    io.stdout('Rebuilt all indexes.');
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleRebuildBugsIndexCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('rebuild-bugs-index'));
      return 0;
    }

    const vaultRoot = getVaultRoot(environment);
    const indexPath = joinTemplatePath(vaultRoot, BUGS_INDEX_PATH);
    const rebuiltOn = formatDate(environment.now?.() ?? new Date());
    const { notes, skipped } = await collectIndexedNotes(vaultRoot, '03_Bugs', 'bug');
    const nextBlockContent = buildBugsIndexBlock(indexPath, notes, skipped, rebuiltOn);
    const changed = await updateGeneratedBlockFile(indexPath, 'bugs-index', nextBlockContent);

    io.stdout(`${changed ? 'Updated' : 'Unchanged'} ${getRelativeNotePath(vaultRoot, indexPath)}`);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleRebuildDecisionsIndexCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('rebuild-decisions-index'));
      return 0;
    }

    const vaultRoot = getVaultRoot(environment);
    const indexPath = joinTemplatePath(vaultRoot, DECISIONS_INDEX_PATH);
    const rebuiltOn = formatDate(environment.now?.() ?? new Date());
    const { notes, skipped } = await collectIndexedNotes(vaultRoot, '04_Decisions', 'decision');
    const nextBlockContent = buildDecisionsIndexBlock(indexPath, notes, skipped, rebuiltOn);
    const changed = await updateGeneratedBlockFile(indexPath, 'decisions-index', nextBlockContent);

    io.stdout(`${changed ? 'Updated' : 'Unchanged'} ${getRelativeNotePath(vaultRoot, indexPath)}`);
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleRefreshActiveContextCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('refresh-active-context'));
      return 0;
    }

    const vaultRoot = getVaultRoot(environment);
    const contextPath = joinTemplatePath(vaultRoot, ACTIVE_CONTEXT_PATH);
    const refreshedOn = formatDate(environment.now?.() ?? new Date());
    const [{ notes: phaseNotes }, { notes: stepNotes }, { notes: sessionNotes }, { notes: bugNotes }] = await Promise.all([
      collectIndexedNotes(vaultRoot, '02_Phases', 'phase'),
      collectIndexedNotes(vaultRoot, '02_Phases', 'step'),
      collectIndexedNotes(vaultRoot, '05_Sessions', 'session'),
      collectIndexedNotes(vaultRoot, '03_Bugs', 'bug'),
    ]);

    const currentContent = await readFile(contextPath, 'utf-8');
    const withCurrentFocus = replaceGeneratedBlock(
      currentContent,
      'current-focus',
      buildCurrentFocusBlock(phaseNotes, stepNotes, sessionNotes, bugNotes, refreshedOn),
      contextPath,
    ).content;
    const withBlockers = replaceGeneratedBlock(
      withCurrentFocus,
      'blockers',
      buildBlockersBlock(phaseNotes, stepNotes, sessionNotes),
      contextPath,
    ).content;
    const nextContent = replaceGeneratedBlock(
      withBlockers,
      'critical-bugs',
      buildCriticalBugsBlock(bugNotes),
      contextPath,
    ).content;

    if (nextContent !== currentContent) {
      await writeFile(contextPath, nextContent, 'utf-8');
      io.stdout(`Updated ${getRelativeNotePath(vaultRoot, contextPath)}`);
    } else {
      io.stdout(`Unchanged ${getRelativeNotePath(vaultRoot, contextPath)}`);
    }

    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function handleRefreshAllHomeNotesCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;

  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      io.stdout(formatCommandHelp('refresh-all-home-notes'));
      return 0;
    }

    const stdout: string[] = [];
    const stderr: string[] = [];
    const nestedEnvironment: AgentVaultCommandEnvironment = {
      ...environment,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    };

    const exitCodes = [
      await handleRebuildBugsIndexCommand([], nestedEnvironment),
      await handleRebuildDecisionsIndexCommand([], nestedEnvironment),
      await handleRefreshActiveContextCommand([], nestedEnvironment),
    ];

    for (const message of stdout) {
      io.stdout(message);
    }

    if (stderr.length > 0) {
      for (const message of stderr) {
        io.stderr(message);
      }
    }

    if (exitCodes.some((code) => code !== 0)) {
      return 1;
    }

    io.stdout('Refreshed all home notes.');
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
