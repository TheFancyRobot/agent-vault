import { describe, expect, it } from 'vitest';
import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';

interface RegisteredTool {
  name: string;
  execute: unknown;
}

interface MockExtensionAPI {
  tools: Map<string, RegisteredTool>;
  registerTool(tool: {
    name: string;
    execute?: unknown;
  }): void;
}

const createMockExtensionAPI = (): MockExtensionAPI & ExtensionAPI => {
  const api = {
    tools: new Map<string, RegisteredTool>(),
    registerTool(this: MockExtensionAPI, tool: { name: string; execute?: unknown }) {
      this.tools.set(tool.name, {
        name: tool.name,
        execute: tool.execute,
      });
    },
  } as MockExtensionAPI & ExtensionAPI;
  return api;
};

describe('vault_help pi extension', () => {
  it('returns a structured error for unknown commands instead of throwing', async () => {
    const pi = createMockExtensionAPI();
    const extension = await import('../../pi-package/extensions/index.js');
    extension.default(pi);

    const tool = pi.tools.get('vault_help');
    expect(tool).toBeTruthy();

    const execute = tool!.execute as (
      toolCallId: string,
      params: { command: string },
      signal: AbortSignal | undefined,
      onUpdate: unknown,
      ctx: unknown,
    ) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

    const result = await execute('test-call', { command: 'not-a-real-command' }, undefined, undefined, undefined);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown Agent Vault command: not-a-real-command');
  });
});
