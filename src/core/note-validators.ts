import { existsSync } from 'fs';
import { readFile, readdir } from 'fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'path';
import { formatCommandHelp } from './command-catalog';
import type { AgentVaultCommandEnvironment, AgentVaultCommandIO } from './note-generators';
import { AgentVaultMutationError, parseYamlFrontmatter } from './note-mutations';

type FrontmatterNoteType =
  | 'architecture'
  | 'bug'
  | 'decision'
  | 'home_context'
  | 'home_index'
  | 'phase'
  | 'session'
  | 'step';

type StructureKind = Exclude<FrontmatterNoteType, 'home_index'> | 'bugs_index' | 'decisions_index';
type ValidationSeverity = 'error' | 'warning';

interface ValidationIssue {
  readonly severity: ValidationSeverity;
  readonly code: string;
  readonly notePath: string;
  readonly message: string;
}

interface ValidationSummary {
  readonly commandName: string;
  readonly checkedNotes: number;
  readonly skippedNotes: number;
  readonly issues: ValidationIssue[];
}

interface NoteClassification {
  readonly inferredType?: FrontmatterNoteType;
  readonly structureKind?: StructureKind;
  readonly starterWarning: boolean;
  readonly skipFrontmatterValidation: boolean;
}

interface ParsedNote {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
  readonly classification: NoteClassification;
  readonly frontmatter?: Record<string, unknown>;
  readonly noteType?: FrontmatterNoteType;
  readonly frontmatterError?: Error;
}

interface GraphNote extends ParsedNote {
  readonly outboundLinks: ReadonlySet<string>;
  readonly canonicalTarget: string;
}

const DEFAULT_IO: AgentVaultCommandIO = {
  stdout: (message) => console.log(message),
  stderr: (message) => console.error(message),
};

const FRONTMATTER_REQUIRED_KEYS: Record<FrontmatterNoteType, readonly string[]> = {
  architecture: ['note_type', 'template_version', 'contract_version', 'title', 'architecture_id', 'status', 'owner', 'reviewed_on', 'created', 'updated', 'related_notes', 'tags'],
  bug: ['note_type', 'template_version', 'contract_version', 'title', 'bug_id', 'status', 'severity', 'category', 'reported_on', 'fixed_on', 'owner', 'created', 'updated', 'related_notes', 'tags'],
  decision: ['note_type', 'template_version', 'contract_version', 'title', 'decision_id', 'status', 'decided_on', 'owner', 'created', 'updated', 'supersedes', 'superseded_by', 'related_notes', 'tags'],
  home_context: ['note_type', 'template_version', 'contract_version', 'title', 'status', 'created', 'updated', 'tags'],
  home_index: ['note_type', 'template_version', 'contract_version', 'title', 'status', 'created', 'updated', 'tags'],
  phase: ['note_type', 'template_version', 'contract_version', 'title', 'phase_id', 'status', 'owner', 'created', 'updated', 'depends_on', 'related_architecture', 'related_decisions', 'related_bugs', 'tags'],
  session: ['note_type', 'template_version', 'contract_version', 'title', 'session_id', 'date', 'status', 'owner', 'branch', 'phase', 'related_bugs', 'related_decisions', 'created', 'updated', 'tags'],
  step: ['note_type', 'template_version', 'contract_version', 'title', 'step_id', 'phase', 'status', 'owner', 'created', 'updated', 'depends_on', 'related_sessions', 'related_bugs', 'tags'],
};

const STRUCTURE_REQUIRED_HEADINGS: Record<StructureKind, readonly string[]> = {
  architecture: ['Purpose', 'Overview', 'Key Components', 'Important Paths', 'Constraints', 'Failure Modes', 'Related Notes'],
  bug: ['Summary', 'Observed Behavior', 'Expected Behavior', 'Reproduction Steps', 'Scope / Blast Radius', 'Suspected Root Cause', 'Confirmed Root Cause', 'Workaround', 'Permanent Fix Plan', 'Regression Coverage Needed', 'Related Notes', 'Timeline'],
  bugs_index: ['Triage Rules', 'Status Buckets', 'Useful Links'],
  decision: ['Status', 'Context', 'Decision', 'Alternatives Considered', 'Tradeoffs', 'Consequences', 'Related Notes', 'Change Log'],
  decisions_index: ['Logging Rules', 'Starter Decision Candidates', 'Decision Log', 'Useful Links'],
  home_context: ['Current Objective', 'Repo Snapshot', 'In Scope Right Now', 'Out Of Scope Right Now', 'Working Assumptions', 'Blockers', 'Open Questions', 'Critical Bugs', 'Next Actions'],
  phase: ['Objective', 'Why This Phase Exists', 'Scope', 'Non-Goals', 'Dependencies', 'Acceptance Criteria', 'Linear Context', 'Related Architecture', 'Related Decisions', 'Related Bugs', 'Steps', 'Notes'],
  session: ['Objective', 'Planned Scope', 'Execution Log', 'Findings', 'Changed Paths', 'Validation Run', 'Bugs Encountered', 'Decisions Made or Updated', 'Follow-Up Work', 'Completion Summary'],
  step: ['Purpose', 'Why This Step Exists', 'Prerequisites', 'Relevant Code Paths', 'Required Reading', 'Execution Prompt', 'Agent-Managed Snapshot', 'Implementation Notes', 'Human Notes', 'Session History', 'Outcome Summary'],
};

const FRONTMATTER_NOTE_TYPES = new Set<FrontmatterNoteType>([
  'architecture',
  'bug',
  'decision',
  'home_context',
  'home_index',
  'phase',
  'session',
  'step',
]);

const MARKER_LINE_PATTERN = /^<!-- AGENT-(START|END):([A-Za-z0-9._-]+) -->$/;
const HEADING_PATTERN = /^( {0,3})(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?[ \t]*$/;
const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;

const resolveVaultRoot = (startDir: string): string => {
  let current = resolve(startDir);

  while (true) {
    const directVault = basename(current) === '.agent-vault' ? current : join(current, '.agent-vault');
    if (existsSync(directVault)) {
      return directVault;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error('Could not find .agent-vault from the current working directory.');
    }
    current = parent;
  }
};

const getVaultRoot = (environment: AgentVaultCommandEnvironment): string =>
  environment.vaultRoot ?? resolveVaultRoot(environment.cwd?.() ?? process.cwd());

const getRelativeNotePath = (vaultRoot: string, absolutePath: string): string =>
  relative(vaultRoot, absolutePath).replace(/\\/g, '/');

const listMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const nextPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listMarkdownFiles(nextPath);
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      return [nextPath];
    }
    return [] as string[];
  }));

  return files.flat().sort();
};

const classifyNotePath = (relativePath: string): NoteClassification => {
  if (relativePath === '00_Home/Active_Context.md') {
    return { inferredType: 'home_context', structureKind: 'home_context', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '00_Home/Bugs_Index.md') {
    return { inferredType: 'home_index', structureKind: 'bugs_index', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '00_Home/Decisions_Index.md') {
    return { inferredType: 'home_index', structureKind: 'decisions_index', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Phase_Template.md') {
    return { inferredType: 'phase', structureKind: 'phase', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Step_Template.md') {
    return { inferredType: 'step', structureKind: 'step', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Bug_Template.md') {
    return { inferredType: 'bug', structureKind: 'bug', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Decision_Template.md') {
    return { inferredType: 'decision', structureKind: 'decision', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Session_Template.md') {
    return { inferredType: 'session', structureKind: 'session', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath === '07_Templates/Architecture_Template.md') {
    return { inferredType: 'architecture', structureKind: 'architecture', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('02_Phases/') && relativePath.endsWith('/Phase.md')) {
    return { inferredType: 'phase', structureKind: 'phase', starterWarning: true, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('02_Phases/') && relativePath.includes('/Steps/') && relativePath.endsWith('.md')) {
    return { inferredType: 'step', structureKind: 'step', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('03_Bugs/') && relativePath.endsWith('.md')) {
    return { inferredType: 'bug', structureKind: 'bug', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('04_Decisions/') && relativePath.endsWith('.md')) {
    return { inferredType: 'decision', structureKind: 'decision', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('05_Sessions/') && relativePath.endsWith('.md')) {
    return { inferredType: 'session', structureKind: 'session', starterWarning: false, skipFrontmatterValidation: false };
  }
  if (relativePath.startsWith('01_Architecture/') && relativePath.endsWith('.md')) {
    return { inferredType: 'architecture', structureKind: 'architecture', starterWarning: true, skipFrontmatterValidation: false };
  }
  return { starterWarning: false, skipFrontmatterValidation: true };
};

const parseFrontmatterNoteType = (value: unknown): FrontmatterNoteType | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  return FRONTMATTER_NOTE_TYPES.has(value as FrontmatterNoteType) ? (value as FrontmatterNoteType) : undefined;
};

const readAllNotes = async (vaultRoot: string): Promise<ParsedNote[]> => {
  const files = await listMarkdownFiles(vaultRoot);
  const notes = await Promise.all(files.map(async (absolutePath) => {
    const relativePath = getRelativeNotePath(vaultRoot, absolutePath);
    const content = await readFile(absolutePath, 'utf-8');
    const classification = classifyNotePath(relativePath);

    try {
      const frontmatter = parseYamlFrontmatter(content, relativePath).data;
      const noteType = parseFrontmatterNoteType(frontmatter.note_type);
      return { absolutePath, relativePath, content, classification, frontmatter, noteType } satisfies ParsedNote;
    } catch (error) {
      return { absolutePath, relativePath, content, classification, frontmatterError: error instanceof Error ? error : new Error(String(error)) } satisfies ParsedNote;
    }
  }));

  return notes;
};

const makeIssue = (severity: ValidationSeverity, code: string, notePath: string, message: string): ValidationIssue => ({
  severity,
  code,
  notePath,
  message,
});

const scanHeadings = (content: string): string[] => {
  const headings: string[] = [];
  const lines = content.split(/\r?\n/);
  let activeFence: string | null = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fenceMatch = /^(?:```+|~~~+)/.exec(trimmed);
    if (fenceMatch) {
      if (activeFence === null) {
        activeFence = fenceMatch[0][0];
      } else if (activeFence === fenceMatch[0][0]) {
        activeFence = null;
      }
      continue;
    }

    if (activeFence !== null) {
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      headings.push(headingMatch[3].trim());
    }
  }

  return headings;
};

const validateGeneratedBlocks = (note: ParsedNote): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const stack: Array<{ name: string; line: number }> = [];
  const lines = note.content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = lines[index];
    if (!line.includes('AGENT-START:') && !line.includes('AGENT-END:')) {
      continue;
    }

    const trimmed = line.trim();
    const markerMatch = MARKER_LINE_PATTERN.exec(trimmed);
    if (!markerMatch) {
      issues.push(makeIssue('error', 'MALFORMED_GENERATED_BLOCK', note.relativePath, `line ${lineNumber}: generated block marker must occupy its own line`));
      continue;
    }

    const [, kind, name] = markerMatch;
    if (kind === 'START') {
      if (stack.length > 0) {
        issues.push(makeIssue('error', 'NESTED_GENERATED_BLOCK', note.relativePath, `line ${lineNumber}: block "${name}" starts before "${stack[stack.length - 1].name}" closes`));
        continue;
      }
      stack.push({ name, line: lineNumber });
      continue;
    }

    const openBlock = stack[stack.length - 1];
    if (!openBlock) {
      issues.push(makeIssue('error', 'UNBALANCED_GENERATED_BLOCK', note.relativePath, `line ${lineNumber}: block "${name}" ends without a matching start marker`));
      continue;
    }
    if (openBlock.name !== name) {
      issues.push(makeIssue('error', 'UNBALANCED_GENERATED_BLOCK', note.relativePath, `line ${lineNumber}: block "${name}" closes "${openBlock.name}"`));
      stack.pop();
      continue;
    }
    stack.pop();
  }

  for (const openBlock of stack) {
    issues.push(makeIssue('error', 'UNBALANCED_GENERATED_BLOCK', note.relativePath, `line ${openBlock.line}: block "${openBlock.name}" is missing its closing marker`));
  }

  return issues;
};

const normalizeLinkTarget = (currentRelativePath: string, rawTarget: string): string | undefined => {
  const withoutAlias = rawTarget.split('|')[0]?.trim() ?? '';
  const withoutHeading = withoutAlias.split('#')[0]?.trim() ?? '';
  if (withoutHeading.length === 0) {
    return undefined;
  }
  if (withoutHeading.includes('<') || withoutHeading.includes('>')) {
    return undefined;
  }
  if (/^(?:https?:|mailto:|obsidian:)/i.test(withoutHeading) || withoutHeading.startsWith('#')) {
    return undefined;
  }
  if (withoutHeading.startsWith('./') || withoutHeading.startsWith('../')) {
    return join(dirname(currentRelativePath), withoutHeading).replace(/\\/g, '/').replace(/\.md$/i, '');
  }
  return withoutHeading.replace(/\\/g, '/').replace(/\.md$/i, '');
};

const collectLinks = (note: ParsedNote): ReadonlySet<string> => {
  const links = new Set<string>();
  const addTarget = (rawTarget: string): void => {
    const normalized = normalizeLinkTarget(note.relativePath, rawTarget);
    if (!normalized) {
      return;
    }
    if (normalized === note.relativePath.replace(/\.md$/i, '')) {
      return;
    }
    links.add(normalized);
  };

  WIKI_LINK_PATTERN.lastIndex = 0;
  for (const match of note.content.matchAll(WIKI_LINK_PATTERN)) {
    addTarget(match[1]);
  }

  MARKDOWN_LINK_PATTERN.lastIndex = 0;
  for (const match of note.content.matchAll(MARKDOWN_LINK_PATTERN)) {
    addTarget(match[1]);
  }

  return links;
};

const hasLinkTo = (note: ParsedNote, predicate: (target: string) => boolean): boolean => {
  for (const target of collectLinks(note)) {
    if (predicate(target)) {
      return true;
    }
  }
  return false;
};

const isTemplateNote = (relativePath: string): boolean => relativePath.startsWith('07_Templates/');

const buildSummary = (commandName: string, checkedNotes: number, skippedNotes: number, issues: ValidationIssue[]): ValidationSummary => ({
  commandName,
  checkedNotes,
  skippedNotes,
  issues,
});

const writeSummary = (summary: ValidationSummary, io: AgentVaultCommandIO): number => {
  const errorCount = summary.issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = summary.issues.length - errorCount;
  io.stdout(`${summary.commandName}: checked ${summary.checkedNotes} notes, ${errorCount} errors, ${warningCount} warnings, ${summary.skippedNotes} skipped`);

  for (const issue of summary.issues.sort((left, right) => left.notePath.localeCompare(right.notePath) || left.code.localeCompare(right.code))) {
    const label = issue.severity === 'error' ? 'ERROR' : 'WARN';
    io.stdout(`${label} ${issue.code} ${issue.notePath} - ${issue.message}`);
  }

  return errorCount > 0 ? 1 : 0;
};

const validateFrontmatter = (notes: readonly ParsedNote[]): ValidationSummary => {
  const issues: ValidationIssue[] = [];
  let checkedNotes = 0;
  let skippedNotes = 0;

  for (const note of notes) {
    if (note.classification.skipFrontmatterValidation) {
      skippedNotes++;
      continue;
    }

    checkedNotes++;

    if (!note.frontmatter) {
      if (
        note.frontmatterError instanceof AgentVaultMutationError &&
        note.frontmatterError.code === 'MISSING_FRONTMATTER' &&
        note.classification.starterWarning
      ) {
        issues.push(makeIssue('warning', 'LEGACY_MISSING_FRONTMATTER', note.relativePath, 'starter note is missing YAML frontmatter; tolerated for v1 but should be upgraded'));
        continue;
      }

      issues.push(makeIssue('error', 'INVALID_FRONTMATTER', note.relativePath, note.frontmatterError?.message ?? 'could not parse YAML frontmatter'));
      continue;
    }

    const rawType = note.frontmatter.note_type;
    if (typeof rawType !== 'string') {
      issues.push(makeIssue('error', 'MISSING_NOTE_TYPE', note.relativePath, 'frontmatter must declare note_type'));
      continue;
    }
    if (!note.noteType) {
      issues.push(makeIssue('error', 'UNKNOWN_NOTE_TYPE', note.relativePath, `note_type "${rawType}" is not recognized`));
      continue;
    }

    const expectedType = note.classification.inferredType;
    if (expectedType && expectedType !== note.noteType) {
      issues.push(makeIssue('error', 'NOTE_TYPE_PATH_MISMATCH', note.relativePath, `note_type "${note.noteType}" does not match this note location; expected "${expectedType}"`));
    }

    for (const key of FRONTMATTER_REQUIRED_KEYS[note.noteType]) {
      if (!(key in note.frontmatter)) {
        issues.push(makeIssue('error', 'MISSING_FRONTMATTER_KEY', note.relativePath, `missing required frontmatter key "${key}" for ${note.noteType} notes`));
      }
    }
  }

  return buildSummary('validate-frontmatter', checkedNotes, skippedNotes, issues);
};

const validateStructure = (notes: readonly ParsedNote[]): ValidationSummary => {
  const issues: ValidationIssue[] = [];
  let checkedNotes = 0;
  let skippedNotes = 0;

  for (const note of notes) {
    const structureKind = note.classification.structureKind;
    if (!structureKind) {
      skippedNotes++;
      continue;
    }

    checkedNotes++;
    issues.push(...validateGeneratedBlocks(note));

    if (!note.frontmatter && note.classification.starterWarning) {
      issues.push(makeIssue('warning', 'LEGACY_NOTE_STRUCTURE', note.relativePath, 'starter note predates the current heading contract; headings were not enforced as hard errors'));
      continue;
    }

    const headings = new Set(scanHeadings(note.content));
    for (const requiredHeading of STRUCTURE_REQUIRED_HEADINGS[structureKind]) {
      if (!headings.has(requiredHeading)) {
        issues.push(makeIssue('error', 'MISSING_REQUIRED_HEADING', note.relativePath, `missing heading "${requiredHeading}"`));
      }
    }
  }

  return buildSummary('validate-note-structure', checkedNotes, skippedNotes, issues);
};

const validateRequiredLinks = (notes: readonly ParsedNote[]): ValidationSummary => {
  const issues: ValidationIssue[] = [];
  let checkedNotes = 0;
  let skippedNotes = 0;

  for (const note of notes) {
    const noteType = note.noteType ?? note.classification.inferredType;
    if (!noteType || !['step', 'bug', 'session', 'decision'].includes(noteType)) {
      skippedNotes++;
      continue;
    }

    if (isTemplateNote(note.relativePath)) {
      skippedNotes++;
      continue;
    }

    checkedNotes++;
    const severity: ValidationSeverity = 'error';

    if (noteType === 'step') {
      if (!hasLinkTo(note, (target) => /^02_Phases\/.+\/Phase$/i.test(target))) {
        issues.push(makeIssue(severity, 'MISSING_PHASE_LINK', note.relativePath, 'step note must link to its parent phase'));
      }
      if (!hasLinkTo(note, (target) => target.startsWith('01_Architecture/'))) {
        issues.push(makeIssue(severity, 'MISSING_ARCHITECTURE_LINK', note.relativePath, 'step note must link to at least one architecture note'));
      }
      continue;
    }

    if (noteType === 'bug') {
      if (!hasLinkTo(note, (target) => target.startsWith('02_Phases/'))) {
        issues.push(makeIssue('warning', 'MISSING_RELATED_EXECUTION_LINK', note.relativePath, 'bug note should link to a related step or phase once the note is populated'));
      }
      continue;
    }

    if (noteType === 'session') {
      if (!hasLinkTo(note, (target) => /^02_Phases\/.+\/Steps\//i.test(target))) {
        issues.push(makeIssue(severity, 'MISSING_PRIMARY_STEP_LINK', note.relativePath, 'session note must link to a primary step'));
      }
      continue;
    }

    if (!hasLinkTo(note, (target) => /^(?:01_Architecture|02_Phases|03_Bugs|04_Decisions|05_Sessions)\//.test(target))) {
      issues.push(makeIssue(severity, 'MISSING_RELATED_NOTE_LINK', note.relativePath, 'decision note must link to at least one related note'));
    }
  }

  return buildSummary('validate-required-links', checkedNotes, skippedNotes, issues);
};

const detectOrphans = (notes: readonly ParsedNote[]): ValidationSummary => {
  const graphNotes: GraphNote[] = notes
    .filter((note) => !note.relativePath.startsWith('.obsidian/'))
    .map((note) => ({
      ...note,
      outboundLinks: collectLinks(note),
      canonicalTarget: note.relativePath.replace(/\.md$/i, ''),
    }));

  const inboundCounts = new Map<string, number>();
  const canonicalTargets = new Set(graphNotes.map((note) => note.canonicalTarget));
  for (const note of graphNotes) {
    for (const target of note.outboundLinks) {
      if (!canonicalTargets.has(target)) {
        continue;
      }
      inboundCounts.set(target, (inboundCounts.get(target) ?? 0) + 1);
    }
  }

  const issues: ValidationIssue[] = [];
  for (const note of graphNotes) {
    const inbound = inboundCounts.get(note.canonicalTarget) ?? 0;
    const outbound = [...note.outboundLinks].filter((target) => canonicalTargets.has(target)).length;

    if (inbound === 0 && outbound === 0) {
      issues.push(makeIssue('warning', 'ORPHAN_NOTE', note.relativePath, 'note has no meaningful inbound or outbound links'));
      continue;
    }
    if (inbound === 0) {
      issues.push(makeIssue('warning', 'NO_INBOUND_LINKS', note.relativePath, 'note has outbound links but nothing else in the vault links back to it'));
      continue;
    }
    if (outbound === 0) {
      issues.push(makeIssue('warning', 'NO_OUTBOUND_LINKS', note.relativePath, 'note is linked from elsewhere but does not link out to other vault notes'));
    }
  }

  return buildSummary('detect-orphans', graphNotes.length, 0, issues);
};

const runValidation = async (
  environment: AgentVaultCommandEnvironment,
  runner: (notes: readonly ParsedNote[]) => ValidationSummary,
): Promise<number> => {
  const io = environment.io ?? DEFAULT_IO;
  try {
    const vaultRoot = getVaultRoot(environment);
    const notes = await readAllNotes(vaultRoot);
    return writeSummary(runner(notes), io);
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
};

export async function handleValidateFrontmatterCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('validate-frontmatter'));
    return 0;
  }
  return runValidation(environment, validateFrontmatter);
}

export async function handleValidateNoteStructureCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('validate-note-structure'));
    return 0;
  }
  return runValidation(environment, validateStructure);
}

export async function handleValidateRequiredLinksCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('validate-required-links'));
    return 0;
  }
  return runValidation(environment, validateRequiredLinks);
}

export async function handleDetectOrphansCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('detect-orphans'));
    return 0;
  }
  return runValidation(environment, detectOrphans);
}

export async function handleValidateAllCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('validate-all'));
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
    await handleValidateFrontmatterCommand([], nestedEnvironment),
    await handleValidateNoteStructureCommand([], nestedEnvironment),
    await handleValidateRequiredLinksCommand([], nestedEnvironment),
    await handleDetectOrphansCommand([], nestedEnvironment),
  ];

  for (const message of stdout) {
    io.stdout(message);
  }

  for (const message of stderr) {
    io.stderr(message);
  }

  if (exitCodes.some((code) => code !== 0)) {
    return 1;
  }

  io.stdout('Validated all Agent Vault note integrity checks.');
  return 0;
}

export async function handleVaultDoctorCommand(
  argv: string[],
  environment: AgentVaultCommandEnvironment = {},
): Promise<number> {
  const io = environment.io ?? DEFAULT_IO;
  if (argv.includes('--help') || argv.includes('-h')) {
    io.stdout(formatCommandHelp('vault-doctor'));
    return 0;
  }

  try {
    const vaultRoot = getVaultRoot(environment);
    // In standalone package mode, we skip wrapper script checks since
    // commands are accessed via MCP tools, not shell wrappers.
    // Just run validation.

    const stdout: string[] = [];
    const stderr: string[] = [];
    const validationExitCode = await handleValidateAllCommand([], {
      ...environment,
      vaultRoot,
      io: {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      },
    });

    const hasValidationWarnings = stdout.some((message) => message.includes('WARN '));
    const hasValidationErrors = stdout.some((message) => message.includes('ERROR ')) || stderr.length > 0 || validationExitCode !== 0;

    io.stdout('Agent Vault doctor report');
    io.stdout(`- Vault root: ${vaultRoot}`);
    io.stdout(`- Validation status: ${hasValidationErrors ? 'errors detected' : hasValidationWarnings ? 'warnings detected' : 'clean'}`);
    for (const message of stdout) {
      io.stdout(message);
    }
    for (const message of stderr) {
      io.stderr(message);
    }

    if (hasValidationWarnings || hasValidationErrors) {
      io.stderr('Agent Vault doctor found issues that should be fixed before handoff.');
      return 1;
    }

    io.stdout('Agent Vault doctor found no issues.');
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
