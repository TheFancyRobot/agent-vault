import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolveVaultRelativePath } from './vault-files';
import { readGeneratedBlockContent, readGeneratedBlockWithMarkers, readHeadingSectionContent } from './note-mutations';

export interface VaultNoteExtractionParams {
  readonly notePath: string;
  readonly heading?: string;
  readonly block?: string;
  readonly includeMarkers?: boolean;
}

export interface VaultNoteExtractionResult {
  readonly notePath: string;
  readonly selector: string;
  readonly content: string;
}

const normalizeNotePath = (notePath: string): string => {
  const normalized = notePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`;
};

const ensureExtractableNoteContent = (content: string): string =>
  content.startsWith('---\n') || content.startsWith('---\r\n')
    ? content
    : `---\nsynthetic: true\n---\n\n${content}`;

const countSelectors = (params: VaultNoteExtractionParams): number =>
  [params.heading, params.block].filter((value) => typeof value === 'string' && value.trim().length > 0).length;

export const extractVaultNoteTarget = async (
  vaultRoot: string,
  params: VaultNoteExtractionParams,
): Promise<VaultNoteExtractionResult> => {
  const notePath = normalizeNotePath(params.notePath);
  const selectorCount = countSelectors(params);
  if (selectorCount !== 1) {
    throw new Error('Targeted extraction requires exactly one selector: heading or block.');
  }

  const absolutePath = resolveVaultRelativePath(vaultRoot, notePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Note does not exist: ${notePath}`);
  }

  const content = await readFile(absolutePath, 'utf-8');
  const extractableContent = ensureExtractableNoteContent(content);
  const noteContext = notePath;

  if (params.heading && params.heading.trim().length > 0) {
    const heading = params.heading.trim();
    return {
      notePath,
      selector: `heading:${heading}`,
      content: readHeadingSectionContent(extractableContent, heading, noteContext),
    };
  }

  const block = params.block?.trim();
  if (!block) {
    throw new Error('Targeted extraction requires exactly one selector: heading or block.');
  }

  return {
    notePath,
    selector: `block:${block}`,
    content: params.includeMarkers === false
      ? readGeneratedBlockContent(extractableContent, block, noteContext)
      : readGeneratedBlockWithMarkers(extractableContent, block, noteContext),
  };
};
