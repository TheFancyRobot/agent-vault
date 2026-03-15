import yaml from 'js-yaml';

/**
 * Conservative text-level mutations for Agent Vault notes.
 *
 * These helpers intentionally touch only explicit frontmatter ranges,
 * named generated blocks, or leaf heading sections. If a note shape is
 * ambiguous, they fail instead of attempting a broad rewrite.
 */

export type MutationErrorCode =
  | 'MISSING_FRONTMATTER'
  | 'UNTERMINATED_FRONTMATTER'
  | 'INVALID_FRONTMATTER'
  | 'DUPLICATE_BLOCK'
  | 'MISSING_BLOCK'
  | 'MALFORMED_BLOCK'
  | 'DUPLICATE_HEADING'
  | 'MISSING_HEADING'
  | 'MALFORMED_SECTION'
  | 'INVALID_UPDATE';

export class AgentVaultMutationError extends Error {
  readonly code: MutationErrorCode;
  readonly notePath: string;

  constructor(code: MutationErrorCode, message: string, notePath = '(memory)') {
    super(`${notePath}: ${message}`);
    this.name = 'AgentVaultMutationError';
    this.code = code;
    this.notePath = notePath;
  }
}

export interface NoteMutation {
  readonly start: number;
  readonly end: number;
  readonly replacement: string;
}

export interface MutationResult {
  readonly content: string;
  readonly changed: boolean;
  readonly mutation: NoteMutation;
}

export interface ParsedFrontmatter {
  readonly data: Record<string, unknown>;
  readonly rawYaml: string;
  readonly start: number;
  readonly end: number;
  readonly bodyStart: number;
  readonly lineEnding: '\n' | '\r\n';
}

interface HeadingMatch {
  readonly text: string;
  readonly level: number;
  readonly start: number;
  readonly lineEnd: number;
  readonly contentStart: number;
}

interface ResolvedGeneratedBlockRange {
  readonly lineEnding: '\n' | '\r\n';
  readonly contentStart: number;
  readonly contentEnd: number;
}

const GENERATED_MARKER_PATTERN = /<!-- AGENT-(START|END):([A-Za-z0-9._-]+) -->/g;
const HEADING_PATTERN = /^( {0,3})(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?[ \t]*$/;
const DEFAULT_NOTE_PATH = '(memory)';

const mutationError = (code: MutationErrorCode, message: string, notePath: string): never => {
  throw new AgentVaultMutationError(code, message, notePath);
};

const detectLineEnding = (content: string): '\n' | '\r\n' => (content.includes('\r\n') ? '\r\n' : '\n');

const toNoteLineEnding = (content: string, lineEnding: '\n' | '\r\n'): string =>
  content.replace(/\r\n|\r|\n/g, lineEnding);

const trimBoundaryNewlines = (content: string): string => content.replace(/^(?:\r\n|\r|\n)+|(?:\r\n|\r|\n)+$/g, '');

const applyMutation = (content: string, mutation: NoteMutation): MutationResult => {
  const nextContent = content.slice(0, mutation.start) + mutation.replacement + content.slice(mutation.end);

  return {
    content: nextContent,
    changed: nextContent !== content,
    mutation,
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getClosingFrontmatterDelimiter = (
  content: string,
  searchFrom: number
): { yamlEnd: number; bodyStart: number } | null => {
  let cursor = searchFrom;

  while (cursor < content.length) {
    const markerIndex = content.indexOf('\n---', cursor);
    if (markerIndex === -1) {
      return null;
    }

    const afterDashes = markerIndex + 4;
    const nextChar = content[afterDashes];
    if (nextChar === '\n') {
      return { yamlEnd: markerIndex, bodyStart: afterDashes + 1 };
    }
    if (nextChar === '\r' && content[afterDashes + 1] === '\n') {
      return { yamlEnd: markerIndex, bodyStart: afterDashes + 2 };
    }
    if (afterDashes === content.length) {
      return { yamlEnd: markerIndex, bodyStart: afterDashes };
    }

    cursor = markerIndex + 1;
  }

  return null;
};

/** Parse required YAML frontmatter and capture precise ranges for safe patching. */
export const parseYamlFrontmatter = (content: string, notePath = DEFAULT_NOTE_PATH): ParsedFrontmatter => {
  let yamlStart = 0;
  let lineEnding: '\n' | '\r\n' = '\n';

  if (content.startsWith('---\n')) {
    yamlStart = 4;
  } else if (content.startsWith('---\r\n')) {
    yamlStart = 5;
    lineEnding = '\r\n';
  } else {
    mutationError('MISSING_FRONTMATTER', 'note must start with YAML frontmatter', notePath);
  }

  const resolvedDelimiter = getClosingFrontmatterDelimiter(content, yamlStart);
  if (resolvedDelimiter === null) {
    throw new AgentVaultMutationError('UNTERMINATED_FRONTMATTER', 'unterminated YAML frontmatter', notePath);
  }

  const rawYaml = content.slice(yamlStart, resolvedDelimiter.yamlEnd);

  let loaded: unknown;
  try {
    loaded = yaml.load(rawYaml);
  } catch (error) {
    mutationError(
      'INVALID_FRONTMATTER',
      `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      notePath
    );
  }

  if (!isPlainObject(loaded)) {
    mutationError('INVALID_FRONTMATTER', 'YAML frontmatter must be an object', notePath);
  }

  const frontmatterData = loaded as Record<string, unknown>;

  return {
    data: frontmatterData,
    rawYaml,
    start: 0,
    end: resolvedDelimiter.bodyStart,
    bodyStart: resolvedDelimiter.bodyStart,
    lineEnding,
  };
};

const dumpFrontmatter = (data: Record<string, unknown>, lineEnding: '\n' | '\r\n'): string => {
  const dumped = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  const normalized = toNoteLineEnding(dumped, lineEnding);
  const withTrailingLine = normalized.endsWith(lineEnding) ? normalized : `${normalized}${lineEnding}`;

  return `---${lineEnding}${withTrailingLine}---${lineEnding}`;
};

const lineStartAt = (content: string, index: number): number => {
  const newlineIndex = content.lastIndexOf('\n', index - 1);
  return newlineIndex === -1 ? 0 : newlineIndex + 1;
};

const nextLineBreakLength = (content: string, index: number): number => {
  if (content.startsWith('\r\n', index)) return 2;
  if (content[index] === '\n') return 1;
  return 0;
};

const ensureStandaloneLine = (content: string, tokenIndex: number, token: string, notePath: string): void => {
  if (lineStartAt(content, tokenIndex) !== tokenIndex) {
    mutationError('MALFORMED_BLOCK', `marker ${token} must start at the beginning of a line`, notePath);
  }

  const afterToken = tokenIndex + token.length;
  const lineBreakLength = nextLineBreakLength(content, afterToken);
  if (lineBreakLength === 0 && afterToken !== content.length) {
    mutationError('MALFORMED_BLOCK', `marker ${token} must occupy a line by itself`, notePath);
  }
};

const collectStandaloneTokenIndexes = (content: string, token: string, notePath: string): number[] => {
  const indexes: number[] = [];
  let fromIndex = 0;

  while (fromIndex < content.length) {
    const tokenIndex = content.indexOf(token, fromIndex);
    if (tokenIndex === -1) break;
    ensureStandaloneLine(content, tokenIndex, token, notePath);
    indexes.push(tokenIndex);
    fromIndex = tokenIndex + token.length;
  }

  return indexes;
};

const normalizeInsertedContent = (content: string, lineEnding: '\n' | '\r\n'): string =>
  toNoteLineEnding(trimBoundaryNewlines(content), lineEnding);

const trailingWhitespace = (content: string): string => {
  const match = /(\s*)$/.exec(content);
  return match === null ? '' : match[1];
};

const leadingBlankLines = (content: string): string => {
  const match = /^(?:\r\n|\r|\n)+/.exec(content);
  return match === null ? '' : match[0];
};

const buildSectionReplacement = (
  nextBody: string,
  existingBody: string,
  lineEnding: '\n' | '\r\n',
  hasFollowingHeading: boolean
): string => {
  const normalized = normalizeInsertedContent(nextBody, lineEnding);
  const prefix = existingBody.trim().length === 0 ? existingBody : leadingBlankLines(existingBody);
  const suffix = (() => {
    const currentSuffix = trailingWhitespace(existingBody);
    if (currentSuffix.length > 0) return currentSuffix;
    return hasFollowingHeading ? lineEnding : '';
  })();

  if (normalized.length === 0) {
    return prefix.length > 0 ? prefix : suffix;
  }

  return `${prefix}${normalized}${suffix}`;
};

const buildAppendedSectionReplacement = (
  existingBody: string,
  appendBody: string,
  lineEnding: '\n' | '\r\n',
  hasFollowingHeading: boolean
): string => {
  const normalizedAppend = normalizeInsertedContent(appendBody, lineEnding);
  if (normalizedAppend.length === 0) {
    return existingBody;
  }

  const suffix = trailingWhitespace(existingBody);
  const bodyWithoutSuffix = existingBody.slice(0, existingBody.length - suffix.length);
  const bodyHasContent = bodyWithoutSuffix.trim().length > 0;
  const joinedBody = bodyHasContent ? `${bodyWithoutSuffix}${lineEnding}${normalizedAppend}` : normalizedAppend;
  const replacementSuffix = suffix.length > 0 ? suffix : hasFollowingHeading ? lineEnding : '';

  return `${joinedBody}${replacementSuffix}`;
};

const scanHeadings = (content: string, bodyStart: number): HeadingMatch[] => {
  const headings: HeadingMatch[] = [];
  let index = bodyStart;
  let activeFence: string | null = null;

  while (index <= content.length) {
    const lineEnd = (() => {
      const nextNewline = content.indexOf('\n', index);
      return nextNewline === -1 ? content.length : nextNewline;
    })();

    const rawLine = content.slice(index, lineEnd);
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    const trimmed = line.trimStart();
    const fenceMatch = /^(?:```+|~~~+)/.exec(trimmed);

    if (fenceMatch !== null) {
      if (activeFence === null) {
        activeFence = fenceMatch[0][0];
      } else if (fenceMatch[0][0] === activeFence) {
        activeFence = null;
      }
    } else if (activeFence === null) {
      const headingMatch = HEADING_PATTERN.exec(line);
      if (headingMatch !== null) {
        const lineBreakLength = nextLineBreakLength(content, lineEnd);
        headings.push({
          text: headingMatch[3].trim(),
          level: headingMatch[2].length,
          start: index,
          lineEnd,
          contentStart: lineEnd + lineBreakLength,
        });
      }
    }

    if (lineEnd === content.length) break;
    index = lineEnd + 1;
  }

  return headings;
};

const resolveHeadingRange = (
  content: string,
  headingText: string,
  notePath: string
): {
  target: HeadingMatch;
  sectionEnd: number;
  hasNestedHeadings: boolean;
} => {
  const frontmatter = parseYamlFrontmatter(content, notePath);
  const headings = scanHeadings(content, frontmatter.bodyStart);
  const matches = headings.filter((heading) => heading.text === headingText);

  if (matches.length === 0) {
    mutationError('MISSING_HEADING', `heading "${headingText}" was not found`, notePath);
  }

  if (matches.length > 1) {
    mutationError('DUPLICATE_HEADING', `heading "${headingText}" appears multiple times`, notePath);
  }

  const target = matches[0];
  const followingHeading = headings.find((heading) => heading.start > target.start && heading.level <= target.level);
  const sectionEnd = followingHeading?.start ?? content.length;
  const hasNestedHeadings = headings.some((heading) => heading.start > target.start && heading.start < sectionEnd);

  return {
    target,
    sectionEnd,
    hasNestedHeadings,
  };
};

const resolveGeneratedBlockRange = (
  content: string,
  blockName: string,
  notePath: string
): ResolvedGeneratedBlockRange => {
  parseYamlFrontmatter(content, notePath);

  const lineEnding = detectLineEnding(content);
  const startToken = `<!-- AGENT-START:${blockName} -->`;
  const endToken = `<!-- AGENT-END:${blockName} -->`;
  const startMatches = collectStandaloneTokenIndexes(content, startToken, notePath);
  const endMatches = collectStandaloneTokenIndexes(content, endToken, notePath);

  if (startMatches.length === 0 || endMatches.length === 0) {
    mutationError('MISSING_BLOCK', `generated block "${blockName}" was not found`, notePath);
  }

  if (startMatches.length > 1 || endMatches.length > 1) {
    mutationError('DUPLICATE_BLOCK', `generated block "${blockName}" appears multiple times`, notePath);
  }

  const startIndex = startMatches[0];
  const endIndex = endMatches[0];
  if (endIndex <= startIndex) {
    mutationError('MALFORMED_BLOCK', `generated block "${blockName}" ends before it starts`, notePath);
  }

  const contentStart = startIndex + startToken.length + nextLineBreakLength(content, startIndex + startToken.length);
  const contentEnd = lineStartAt(content, endIndex);
  const innerContent = content.slice(contentStart, contentEnd);
  GENERATED_MARKER_PATTERN.lastIndex = 0;
  if (GENERATED_MARKER_PATTERN.test(innerContent)) {
    mutationError('MALFORMED_BLOCK', `generated block "${blockName}" contains nested or stray agent markers`, notePath);
  }

  return {
    lineEnding,
    contentStart,
    contentEnd,
  };
};

/** Merge frontmatter updates while preserving unknown keys and note line endings. */
export const updateFrontmatter = (
  content: string,
  updates: Record<string, unknown>,
  notePath = DEFAULT_NOTE_PATH
): MutationResult => {
  if (Object.values(updates).some((value) => value === undefined)) {
    mutationError('INVALID_UPDATE', 'frontmatter updates must not contain undefined values', notePath);
  }

  const frontmatter = parseYamlFrontmatter(content, notePath);
  const nextData: Record<string, unknown> = { ...frontmatter.data };

  for (const [key, value] of Object.entries(updates)) {
    nextData[key] = value;
  }

  return applyMutation(content, {
    start: frontmatter.start,
    end: frontmatter.end,
    replacement: dumpFrontmatter(nextData, frontmatter.lineEnding),
  });
};

/** Replace only the contents of a named generated block. */
export const replaceGeneratedBlock = (
  content: string,
  blockName: string,
  nextBlockContent: string,
  notePath = DEFAULT_NOTE_PATH
): MutationResult => {
  const { lineEnding, contentStart, contentEnd } = resolveGeneratedBlockRange(content, blockName, notePath);

  const normalized = normalizeInsertedContent(nextBlockContent, lineEnding);

  return applyMutation(content, {
    start: contentStart,
    end: contentEnd,
    replacement: normalized.length === 0 ? '' : `${normalized}${lineEnding}`,
  });
};

/** Read the contents of a named generated block without mutating the note. */
export const readGeneratedBlockContent = (
  content: string,
  blockName: string,
  notePath = DEFAULT_NOTE_PATH
): string => {
  const { contentStart, contentEnd } = resolveGeneratedBlockRange(content, blockName, notePath);
  return content.slice(contentStart, contentEnd);
};

/** Replace the body of a leaf heading section without disturbing neighboring sections. */
export const replaceHeadingSection = (
  content: string,
  headingText: string,
  nextSectionContent: string,
  notePath = DEFAULT_NOTE_PATH
): MutationResult => {
  const { target, sectionEnd, hasNestedHeadings } = resolveHeadingRange(content, headingText, notePath);
  if (hasNestedHeadings) {
    mutationError(
      'MALFORMED_SECTION',
      `heading section "${headingText}" contains nested headings and cannot be safely replaced as a whole`,
      notePath
    );
  }

  const lineEnding = detectLineEnding(content);
  const existingBody = content.slice(target.contentStart, sectionEnd);

  return applyMutation(content, {
    start: target.contentStart,
    end: sectionEnd,
    replacement: buildSectionReplacement(nextSectionContent, existingBody, lineEnding, sectionEnd < content.length),
  });
};

/** Append to a leaf heading section while preserving surrounding manual prose. */
export const appendToAppendOnlySection = (
  content: string,
  headingText: string,
  appendedContent: string,
  notePath = DEFAULT_NOTE_PATH
): MutationResult => {
  const { target, sectionEnd, hasNestedHeadings } = resolveHeadingRange(content, headingText, notePath);
  if (hasNestedHeadings) {
    mutationError(
      'MALFORMED_SECTION',
      `heading section "${headingText}" contains nested headings and cannot be safely treated as append-only`,
      notePath
    );
  }

  const lineEnding = detectLineEnding(content);
  const existingBody = content.slice(target.contentStart, sectionEnd);

  return applyMutation(content, {
    start: target.contentStart,
    end: sectionEnd,
    replacement: buildAppendedSectionReplacement(existingBody, appendedContent, lineEnding, sectionEnd < content.length),
  });
};
