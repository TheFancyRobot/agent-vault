import { isAbsolute } from 'path';
import { readVaultConfig } from './vault-config';

export const DEFAULT_CONTEXT_DENYLIST = Object.freeze([
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.p12',
  '*.sqlite',
  '.git/',
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  'vendor/',
  'generated/',
  'secrets/',
  'credentials/',
  'tokens/',
  '*.lock',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'bun.lockb',
  '*secret*',
  '*credential*',
  '*token*',
  '*private-key*',
  'id_rsa',
  'id_dsa',
  'id_ed25519',
  '.npmrc',
  '.pypirc',
]);

export interface ContextSafetyConfig {
  /** Additional path globs to deny. Defaults are always active. */
  readonly denylist?: readonly string[];
  /** Explicit path globs allowed to override a denylist match. */
  readonly allowlist?: readonly string[];
}

export interface ContextSafetyPolicy {
  readonly denylist: readonly string[];
  readonly allowlist: readonly string[];
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '');

const normalizePattern = (value: string): string => normalizePath(value.trim());

const uniquePatterns = (patterns: readonly string[]): string[] => [
  ...new Set(patterns.map(normalizePattern).filter((pattern) => pattern.length > 0)),
];

export const createContextSafetyPolicy = (config: ContextSafetyConfig = {}): ContextSafetyPolicy => ({
  denylist: uniquePatterns([
    ...DEFAULT_CONTEXT_DENYLIST,
    ...(config.denylist ?? []),
  ]),
  allowlist: uniquePatterns(config.allowlist ?? []),
});

const globToRegExp = (pattern: string): RegExp => {
  let source = '^';
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // `**/` matches zero or more leading directories so patterns like
        // `**/experimental/**` also cover root-level `experimental/...`.
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index++;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }
    source += /[\\^$+?.()|{}[\]]/.test(character) ? `\\${character}` : character;
  }
  return new RegExp(`${source}$`, 'i');
};

const matchesPattern = (path: string, rawPattern: string): boolean => {
  const pattern = normalizePattern(rawPattern);
  if (pattern.length === 0) return false;

  const directoryPattern = pattern.endsWith('/');
  const patternWithoutSlash = directoryPattern ? pattern.slice(0, -1) : pattern;
  if (directoryPattern && !patternWithoutSlash.includes('*')) {
    // Match complete path segments at any depth: `secrets/` must deny
    // `secrets/a.md`, `packages/app/secrets/a.md`, and the directory itself.
    return `/${path}/`.includes(`/${patternWithoutSlash}/`);
  }

  const matcher = globToRegExp(patternWithoutSlash);
  if (patternWithoutSlash.includes('/')) {
    return matcher.test(path);
  }

  return matcher.test(path.split('/').at(-1) ?? '');
};

export const isContextPathAllowed = (
  path: string,
  policy: ContextSafetyPolicy = createContextSafetyPolicy(),
): boolean => policy.allowlist.some((pattern) => matchesPattern(path, pattern));

export const getContextPathExclusion = (
  path: string,
  policy: ContextSafetyPolicy = createContextSafetyPolicy(),
): string | undefined => {
  const normalizedPath = normalizePath(path);
  if (isContextPathAllowed(normalizedPath, policy)) return undefined;
  const matched = policy.denylist.find((pattern) => matchesPattern(normalizedPath, pattern));
  return matched ? `path matches context denylist pattern ${matched}` : undefined;
};

export const assertSafeRelativeContextPath = (value: string, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (value.includes('\0')) {
    throw new Error(`${label} contains a NUL byte.`);
  }
  if (value.includes('\\')) {
    throw new Error(`${label} must use forward slashes, not backslashes.`);
  }
  if (/%(?:2f|5c)/i.test(value)) {
    throw new Error(`${label} must not contain encoded path separators.`);
  }
  if (/(^|\/)%(?:2e){1,2}(?:\/|$)/i.test(value)) {
    throw new Error(`${label} contains an unsafe encoded segment.`);
  }

  const normalized = value.trim();
  if (isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error(`${label} must be relative: ${value}`);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`${label} contains an unsafe segment: ${value}`);
  }
  return normalized;
};

export const assertContextPathAllowed = (
  value: string,
  label: string,
  policy: ContextSafetyPolicy = createContextSafetyPolicy(),
): string => {
  const path = assertSafeRelativeContextPath(value, label);
  const exclusion = getContextPathExclusion(path, policy);
  if (exclusion) {
    throw new Error(`Refusing excluded context path ${path} (secret-like or generated/vendor): ${exclusion}`);
  }
  return path;
};

export const readContextSafetyPolicy = async (vaultRoot: string): Promise<ContextSafetyPolicy> => {
  const config = await readVaultConfig(vaultRoot);
  return createContextSafetyPolicy(config.context_safety);
};
