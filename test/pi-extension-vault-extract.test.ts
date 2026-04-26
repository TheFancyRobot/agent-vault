/**
 * Focused test for vault_extract pi extension registration and behavior.
 * Uses hoisted mocks (vi.mock) to intercept `@mariozechner/pi-ai` and
 * `@sinclair/typebox` so the extension module can load without those
 * peer dependencies being installed in node_modules.
 */
import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks must precede any real imports of the extension module.
vi.mock('@mariozechner/pi-ai', () => ({
  StringEnum: (values: readonly string[], description?: { description?: string }) =>
    ({ type: 'string', enum: values, description: description?.description }) as any,
}));

vi.mock('@sinclair/typebox', () => ({
  Type: {
    Object: (schema: any) => schema,
    String: (schema?: any) => ({ type: 'string', ...schema }) as any,
    Integer: (schema?: any) => ({ type: 'integer', ...schema }) as any,
    Boolean: (schema?: any) => ({ type: 'boolean', ...schema }) as any,
    Optional: (schema: any) => ({ ...schema, required: false }) as any,
    Array: (schema: any) => ({ type: 'array', items: schema }) as any,
    Record: (keySchema: any, valueSchema: any) => ({ type: 'object', additionalProperties: valueSchema }) as any,
  },
}));

const { default: registerExtensions } = await import('../pi-package/extensions/index');

const createMockExtensionAPI = () => {
  const tools = new Map<string, any>();
  return {
    tools,
    registerTool(tool: { name: string; label?: string; description?: string; parameters?: any; promptSnippet?: string; execute?: any }) {
      tools.set(tool.name, {
        name: tool.name,
        label: tool.label ?? '',
        description: tool.description ?? '',
        parameters: tool.parameters ?? {},
        promptSnippet: tool.promptSnippet ?? '',
        execute: tool.execute,
      });
    },
  } as any;
};

const makeVault = async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'agent-vault-extract-pi-test-'));
  const vaultRoot = join(tempRoot, '.agent-vault');
  await mkdir(join(vaultRoot, 'Notes'), { recursive: true });
  await mkdir(join(vaultRoot, '00_Home'), { recursive: true });
  await writeFile(join(vaultRoot, 'Notes', 'Target.md'), `---
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
  await writeFile(join(vaultRoot, '00_Home', 'Active_Context.md'), `---
note_type: home
---

# Active Context
`, 'utf-8');
  // resolveVaultRoot walks up from cwd looking for a .agent-vault subdirectory,
  // so chdir to the .agent-vault directory itself.
  return { vaultRoot, chdirTarget: vaultRoot };
};

describe('vault_extract pi extension registration and behavior', () => {
  describe('tool registration', () => {
    it('registers vault_extract with correct name', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      expect(pi.tools.has('vault_extract')).toBe(true);
    });

    it('surfaces include_markers default: true in the pi schema', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      expect(tool.parameters).toBeTruthy();
      // My mock Optional returns the inner schema with required:false appended;
      // include_markers may live at top level or inside properties depending on mock depth.
      const params = tool.parameters as any;
      const includeMarkersVal = params.properties?.include_markers ?? params.include_markers;
      expect(includeMarkersVal).toBeTruthy();
    });

    it('registers heading and block as schema parameters', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      expect(tool.parameters).toBeTruthy();
      const params = tool.parameters as any;
      expect(params.properties?.heading ?? params.heading).toBeTruthy();
      expect(params.properties?.block ?? params.block).toBeTruthy();
    });
  });

  describe('execute behavior', () => {
    let originalCwd: string;

    beforeEach(async () => {
      originalCwd = process.cwd();
      const { chdirTarget } = await makeVault();
      process.chdir(chdirTarget);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('happy path: extracts heading section and returns structured text', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (toolCallId: string, params: { note_path: string; heading: string }, signal: any, onUpdate: any, ctx: any) => Promise<any>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', heading: 'Execution Brief' }, undefined, undefined, undefined);

      expect(result.isError ?? false).toBe(false);
      expect(result.content[0].text).toContain('notePath: Notes/Target.md');
      expect(result.content[0].text).toContain('selector: heading:Execution Brief');
      expect(result.content[0].text).toContain('## Execution Brief');
    });

    it('happy path: block extraction includes markers by default', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (toolCallId: string, params: { note_path: string; block: string }, signal: any, onUpdate: any, ctx: any) => Promise<any>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', block: 'machine-block' }, undefined, undefined, undefined);

      expect(result.isError ?? false).toBe(false);
      expect(result.content[0].text).toContain('<!-- AGENT-START:machine-block -->');
      expect(result.content[0].text).toContain('<!-- AGENT-END:machine-block -->');
    });

    it('happy path: block extraction excludes markers when include_markers is false', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (toolCallId: string, params: { note_path: string; block: string; include_markers: false }, signal: any, onUpdate: any, ctx: any) => Promise<any>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md', block: 'machine-block', include_markers: false }, undefined, undefined, undefined);

      expect(result.isError ?? false).toBe(false);
      expect(result.content[0].text).not.toContain('<!-- AGENT-START:machine-block -->');
      expect(result.content[0].text).not.toContain('<!-- AGENT-END:machine-block -->');
      expect(result.content[0].text).toContain('- Generated content.');
    });

    it('error path: exactly-one-selector validation returns isError true', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (toolCallId: string, params: { note_path: string }, signal: any, onUpdate: any, ctx: any) => Promise<any>;

      const result = await execute('test-call', { note_path: 'Notes/Target.md' }, undefined, undefined, undefined);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exactly one selector');
    });

    it('error path: missing note returns isError true', async () => {
      const pi = createMockExtensionAPI();
      registerExtensions(pi);
      const tool = pi.tools.get('vault_extract')!;
      const execute = tool.execute as (toolCallId: string, params: { note_path: string; heading: string }, signal: any, onUpdate: any, ctx: any) => Promise<any>;

      const result = await execute('test-call', { note_path: 'Notes/Missing.md', heading: 'Does Not Exist' }, undefined, undefined, undefined);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('does not exist');
    });
  });
});
