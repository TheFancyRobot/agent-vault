import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';

const require = createRequire(import.meta.url);

// Mock ExtensionAPI that captures registered tools
interface RegisteredTool {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  promptSnippet: string;
  execute: unknown;
}

interface MockExtensionAPI {
  tools: Map<string, RegisteredTool>;
  registerTool(tool: {
    name: string;
    label?: string;
    description?: string;
    parameters?: unknown;
    promptSnippet?: string;
    execute?: unknown;
  }): void;
}

const createMockExtensionAPI = (): MockExtensionAPI & ExtensionAPI => {
  const api = {
    tools: new Map<string, RegisteredTool>(),
    registerTool(
      this: MockExtensionAPI,
      tool: {
        name: string;
        label?: string;
        description?: string;
        parameters?: unknown;
        promptSnippet?: string;
        execute?: unknown;
      }
    ) {
      this.tools.set(tool.name, {
        name: tool.name,
        label: tool.label ?? '',
        description: tool.description ?? '',
        parameters: tool.parameters ?? {},
        promptSnippet: tool.promptSnippet ?? '',
        execute: tool.execute,
      });
    },
  } as MockExtensionAPI & ExtensionAPI;
  return api;
};

const loadExtension = async (pi: MockExtensionAPI & ExtensionAPI) => {
  const extension = await import('../../pi-package/extensions/index.js');
  extension.default(pi);
};

// createResumeVault helper for reference: creates real vault structure with .agent-vault root
const makeVault = async () => {
  const vaultRoot = await mkdtemp(join(tmpdir(), 'agent-vault-extract-test-'));
  // Must create .agent-vault root so resolveVaultRoot(process.cwd()) can find it
  await mkdir(join(vaultRoot, '.agent-vault', 'Notes'), { recursive: true });
  await writeFile(join(vaultRoot, '.agent-vault', 'Notes', 'Target.md'), `---
title: Target
status: active
---

# Target

## Execution Brief

- Include this.

### Nested Detail

- Include nested content too.

## Validation Plan

- Exclude this.

<!-- AGENT-START:machine-block -->
- Generated content.
<!-- AGENT-END:machine-block -->
`, 'utf-8');
  return vaultRoot;
};

describe('vault_extract pi extension registration and behavior', () => {
  describe('tool registration', () => {
    it('registers vault_extract with correct name', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      expect(pi.tools.has('vault_extract')).toBe(true);
    });

    it('surfaces include_markers default: true in the pi schema', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      expect(tool.parameters).toBeTruthy();
      const params = tool.parameters as any;
      const includeMarkersVal = params.properties?.include_markers ?? params.include_markers;
      expect(includeMarkersVal).toBeTruthy();
    });

    it('registers heading and block as schema parameters', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      expect(tool.parameters).toBeTruthy();
      const params = tool.parameters as any;
      expect(params.properties?.heading ?? params.heading).toBeTruthy();
      expect(params.properties?.block ?? params.block).toBeTruthy();
    });
  });

  describe('execute behavior', () => {
    let vaultRoot: string;
    let originalCwd: string;

    beforeEach(async () => {
      vaultRoot = await makeVault();
      originalCwd = process.cwd();
      process.chdir(vaultRoot);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('happy path: extracts heading section and returns structured text', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (
        toolCallId: string,
        params: { note_path: string; heading: string },
        signal: AbortSignal | undefined,
        onUpdate: unknown,
        ctx: unknown
      ) => Promise<{ content: { type: string; text: string }[]; details: unknown; isError?: boolean }>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', heading: 'Execution Brief' }, undefined, undefined, undefined);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('notePath: Notes/Target.md');
      expect(result.content[0].text).toContain('selector: heading:Execution Brief');
      expect(result.content[0].text).toContain('## Execution Brief');
    });

    it('happy path: extracts block with markers by default (include_markers not provided)', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (
        toolCallId: string,
        params: { note_path: string; block: string },
        signal: AbortSignal | undefined,
        onUpdate: unknown,
        ctx: unknown
      ) => Promise<{ content: { type: string; text: string }[]; details: unknown; isError?: boolean }>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', block: 'machine-block' }, undefined, undefined, undefined);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('<!-- AGENT-START:machine-block -->');
      expect(result.content[0].text).toContain('<!-- AGENT-END:machine-block -->');
    });

    it('happy path: excludes markers when include_markers is explicitly false', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (
        toolCallId: string,
        params: { note_path: string; block: string; include_markers: false },
        signal: AbortSignal | undefined,
        onUpdate: unknown,
        ctx: unknown
      ) => Promise<{ content: { type: string; text: string }[]; details: unknown; isError?: boolean }>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', block: 'machine-block', include_markers: false }, undefined, undefined, undefined);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).not.toContain('<!-- AGENT-START:machine-block -->');
      expect(result.content[0].text).toContain('- Generated content.');
    });

    it('error path: missing selector returns isError true', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (
        toolCallId: string,
        params: { note_path: string },
        signal: AbortSignal | undefined,
        onUpdate: unknown,
        ctx: unknown
      ) => Promise<{ content: { type: string; text: string }[]; details: unknown; isError?: boolean }>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md' }, undefined, undefined, undefined);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exactly one selector');
    });

    it('error path: note does not exist returns isError true', async () => {
      const pi = createMockExtensionAPI();
      await loadExtension(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (
        toolCallId: string,
        params: { note_path: string; heading: string },
        signal: AbortSignal | undefined,
        onUpdate: unknown,
        ctx: unknown
      ) => Promise<{ content: { type: string; text: string }[]; details: unknown; isError?: boolean }>;

      const result = await execute('test-call', { note_path: 'Notes/Missing.md', heading: 'Does Not Exist' }, undefined, undefined, undefined);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('does not exist');
    });
  });
});
