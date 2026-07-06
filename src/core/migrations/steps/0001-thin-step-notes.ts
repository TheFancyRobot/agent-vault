import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { basename, dirname, join, resolve } from 'path';
import {
  parseYamlFrontmatter,
  readGeneratedBlockContent,
  replaceGeneratedBlock,
  replaceHeadingSection,
  updateFrontmatter,
} from '../../note-mutations';
import { assertWithinVaultRoot, getRelativeNotePath, listMarkdownFiles } from '../../vault-files';
import type { MigrationStep, MigrationStepContext, MigrationStepPlan } from '../types';

const STEP_TEMPLATE_PATH = ['07_Templates', 'Step_Template.md'] as const;

interface ResolvedPhaseNote {
  readonly absolutePath: string;
}

interface ResolvedStepNote {
  readonly absolutePath: string;
  readonly vaultRelativePath: string;
}

interface ParsedTopLevelSections {
  readonly frontmatter: Record<string, unknown>;
  readonly title: string;
  readonly intro: string;
  readonly sections: Map<string, string>;
  readonly generatedBlocks: Map<string, string>;
}

export interface ThinStepNotesMigrationOptions {
  /** Optional standalone-command phase filter. Accepts phase id, directory, note path, or vault-relative path. */
  readonly phaseRef?: string;
  /** Optional standalone-command step filter. Accepts step id, basename, note path, or vault-relative path. */
  readonly stepRef?: string;
  /** Clock used only for generated thin step note metadata. */
  readonly now?: () => Date;
}

export interface ThinStepNotesMigrationResult {
  readonly migratedCount: number;
  readonly affectedPaths: readonly string[];
}

const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

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

const toWikiTarget = (vaultRelativePath: string): string => vaultRelativePath.replace(/\.md$/i, '');

const toWikiLink = (vaultRelativePath: string, alias: string): string => `[[${toWikiTarget(vaultRelativePath)}|${alias}]]`;

const parseStringField = (notePath: string, key: string, value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${notePath} is missing required frontmatter field "${key}".`);
  }
  return value.trim();
};

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
      if (frontmatter?.note_type === 'step' && frontmatter.step_id === reference) {
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

  return {
    absolutePath: notePath,
    vaultRelativePath: getRelativeNotePath(vaultRoot, notePath),
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
    const matches: string[] = [];
    for (const filePath of phaseFiles) {
      const frontmatter = await tryReadNoteFrontmatter(filePath);
      if (frontmatter?.note_type === 'phase' && frontmatter.phase_id === reference) {
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

  return { absolutePath: notePath };
};

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
    const bodyStart = afterFirstHeading.slice(start).startsWith('\n\n')
      ? start + 2
      : afterFirstHeading.slice(start).startsWith('\n')
        ? start + 1
        : start;
    const end = index + 1 < sectionMatches.length
      ? (sectionMatches[index + 1].index ?? afterFirstHeading.length)
      : afterFirstHeading.length;
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

export const isLegacyStepNoteContent = (content: string): boolean =>
  content.includes('## Execution Prompt') || content.includes('## Implementation Notes') || content.includes('## Outcome Summary');

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
  content = ensureHeadingSection(content, 'Required Reading', [
    `- ${phaseLink}`,
    `- ${companionLinks.executionBrief}`,
    `- ${companionLinks.validationPlan}`,
  ].join('\n'), 'Agent-Managed Snapshot');
  content = ensureHeadingSection(content, 'Companion Notes', [
    `- ${companionLinks.executionBrief} - Why the step exists, prerequisites, likely code paths, and the smallest execution checklist.`,
    `- ${companionLinks.validationPlan} - Acceptance checks, commands, edge cases, and regression expectations.`,
    `- ${companionLinks.implementationNotes} - Durable findings discovered while the step is being executed.`,
    `- ${companionLinks.outcome} - Final result, validation evidence, and explicit follow-up.`,
  ].join('\n'), 'Agent-Managed Snapshot');
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

const writeNewNote = async (filePath: string, content: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  try {
    await writeFile(filePath, content, { encoding: 'utf-8', flag: 'wx' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`Refusing to overwrite existing note: ${filePath}`);
    }
    throw error;
  }
};

const getCandidateStepFiles = async (
  vaultRoot: string,
  options: ThinStepNotesMigrationOptions = {},
): Promise<string[]> => {
  const stepFilter = options.stepRef ? await resolveStepReference(vaultRoot, options.stepRef) : undefined;
  const phaseFilter = options.phaseRef ? await resolvePhaseReference(vaultRoot, options.phaseRef) : undefined;
  const allStepFiles = await listMarkdownFiles(join(vaultRoot, '02_Phases'));

  return allStepFiles.filter((filePath) => {
    const relativePath = getRelativeNotePath(vaultRoot, filePath);
    if (!/^02_Phases\/[^/]+\/Steps\/[^/]+\.md$/.test(relativePath)) return false;
    if (stepFilter && relativePath !== stepFilter.vaultRelativePath) return false;
    if (phaseFilter) {
      const phaseDirectory = basename(dirname(phaseFilter.absolutePath));
      if (!relativePath.startsWith(`02_Phases/${phaseDirectory}/Steps/`)) return false;
    }
    return true;
  });
};

const getLegacyStepFiles = async (
  vaultRoot: string,
  options: ThinStepNotesMigrationOptions = {},
): Promise<string[]> => {
  const legacyFiles: string[] = [];
  for (const filePath of await getCandidateStepFiles(vaultRoot, options)) {
    const content = await readFile(filePath, 'utf-8');
    if (!isLegacyStepNoteContent(content) || content.includes('## Companion Notes')) continue;
    const frontmatter = parseYamlFrontmatter(content, filePath).data;
    if (frontmatter.note_type !== 'step') continue;
    legacyFiles.push(filePath);
  }
  return legacyFiles;
};

export const detectThinStepNotesMigration = async (
  context: MigrationStepContext,
  options: ThinStepNotesMigrationOptions = {},
): Promise<boolean> => (await getLegacyStepFiles(context.vaultRoot, options)).length > 0;

export const planThinStepNotesMigration = async (
  context: MigrationStepContext,
  options: ThinStepNotesMigrationOptions = {},
): Promise<MigrationStepPlan> => {
  const affectedPaths = (await getLegacyStepFiles(context.vaultRoot, options))
    .map((filePath) => getRelativeNotePath(context.vaultRoot, filePath))
    .sort();

  return {
    summary: affectedPaths.length === 0
      ? 'No legacy verbose step notes need splitting.'
      : `Split ${affectedPaths.length} legacy verbose step note${affectedPaths.length === 1 ? '' : 's'} into thin indexes and companion notes.`,
    affectedPaths,
  };
};

export const applyThinStepNotesMigration = async (
  context: MigrationStepContext,
  options: ThinStepNotesMigrationOptions = {},
): Promise<ThinStepNotesMigrationResult> => {
  const vaultRoot = context.vaultRoot;
  const template = await readFile(join(vaultRoot, ...STEP_TEMPLATE_PATH), 'utf-8');
  const date = formatDate(options.now?.() ?? new Date());
  const affectedPaths: string[] = [];

  for (const filePath of await getCandidateStepFiles(vaultRoot, options)) {
    const relativePath = getRelativeNotePath(vaultRoot, filePath);
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
    affectedPaths.push(relativePath);
  }

  return { migratedCount: affectedPaths.length, affectedPaths };
};

export const thinStepNotesMigration: MigrationStep = {
  id: '0001-thin-step-notes',
  from_version: 0,
  to_version: 1,
  category: 'safe-confirm',
  description: 'Split legacy verbose step notes into thin step indexes with companion notes.',
  detect: (context) => detectThinStepNotesMigration(context),
  plan: (context) => planThinStepNotesMigration(context),
  apply: async (context) => {
    await applyThinStepNotesMigration(context);
  },
};
