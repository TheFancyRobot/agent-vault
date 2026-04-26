import { mkdtemp, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { extractVaultNoteTarget } from '../../src/core/vault-extract';

describe('vault targeted extraction', () => {
  const makeVault = async () => {
    const vaultRoot = await mkdtemp(join(tmpdir(), 'agent-vault-extract-'));
    await mkdir(join(vaultRoot, 'Notes'), { recursive: true });
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
    return vaultRoot;
  };

  it('extracts a requested heading section by vault-relative note path', async () => {
    const vaultRoot = await makeVault();

    const result = await extractVaultNoteTarget(vaultRoot, {
      notePath: 'Notes/Target.md',
      heading: 'Execution Brief',
    });

    expect(result).toEqual({
      notePath: 'Notes/Target.md',
      selector: 'heading:Execution Brief',
      content: [
        '## Execution Brief',
        '',
        '- Include this.',
        '',
        '### Nested Detail',
        '',
        '- Include nested content too.',
        '',
        '',
      ].join('\n'),
    });
  });

  it('extracts a generated block with markers by default', async () => {
    const vaultRoot = await makeVault();

    const result = await extractVaultNoteTarget(vaultRoot, {
      notePath: 'Notes/Target.md',
      block: 'machine-block',
    });

    expect(result.selector).toBe('block:machine-block');
    expect(result.content).toBe([
      '<!-- AGENT-START:machine-block -->',
      '- Generated content.',
      '<!-- AGENT-END:machine-block -->',
      '',
    ].join('\n'));
  });

  it('requires exactly one selector', async () => {
    const vaultRoot = await makeVault();

    await expect(extractVaultNoteTarget(vaultRoot, {
      notePath: 'Notes/Target.md',
      heading: 'Execution Brief',
      block: 'machine-block',
    })).rejects.toThrow('exactly one selector');
  });
});
