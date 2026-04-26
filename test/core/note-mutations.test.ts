import { describe, expect, it } from 'vitest';
import {
  AgentVaultMutationError,
  appendToAppendOnlySection,
  parseYamlFrontmatter,
  readGeneratedBlockContent,
  readGeneratedBlockWithMarkers,
  readHeadingSectionContent,
  replaceGeneratedBlock,
  replaceHeadingSection,
  updateFrontmatter,
} from '../../src/core/note-mutations';

describe('Agent Vault note mutations', () => {
  it('parses and updates frontmatter while preserving unknown keys', () => {
    const note = `---
title: Sample
status: planned
owner: human
custom_flag: true
related:
  - one
---

# Sample

Body.
`;

    const updated = updateFrontmatter(note, {
      status: 'done',
      updated: '2026-03-14',
    });

    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data).toEqual({
      title: 'Sample',
      status: 'done',
      owner: 'human',
      custom_flag: true,
      related: ['one'],
      updated: '2026-03-14',
    });
    expect(updated.content).toContain('owner: human');
  });

  it('writes nested frontmatter objects while preserving unknown keys', () => {
    const note = `---
title: Session
status: in-progress
owner: human
custom_flag: true
---

# Session
`;

    const updated = updateFrontmatter(note, {
      context: {
        context_id: 'SESSION-2026-03-14-150926',
        status: 'active',
        updated_at: '2026-03-14T15:09:26.000Z',
        current_focus: {
          summary: 'Advance step.',
          target: '[[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]]',
        },
        resume_target: {
          type: 'step',
          target: '[[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]]',
          section: 'Context Handoff',
        },
        last_action: {
          type: 'saved',
        },
      },
    });

    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data).toMatchObject({
      owner: 'human',
      custom_flag: true,
      context: {
        context_id: 'SESSION-2026-03-14-150926',
        status: 'active',
        updated_at: '2026-03-14T15:09:26.000Z',
      },
    });
    expect(updated.content).toContain('current_focus:');
    expect(updated.content).toContain('resume_target:');
  });

  it('deep-merges dot-path keys into existing nested objects', () => {
    const note = `---
title: Session
context:
  context_id: SESSION-001
  status: active
  updated_at: '2026-03-14T15:00:00.000Z'
---

# Session
`;

    // Update only context.status without touching other nested fields
    const updated = updateFrontmatter(note, { 'context.status': 'completed' });
    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data.context).toEqual({
      context_id: 'SESSION-001',
      status: 'completed',
      updated_at: '2026-03-14T15:00:00.000Z',
    });
  });

  it('creates intermediate nested objects for dot-path keys that do not exist yet', () => {
    const note = `---
title: Step
status: planned
---

# Step
`;

    const updated = updateFrontmatter(note, { 'context.status': 'active' });
    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data.context).toEqual({ status: 'active' });
    expect(parsed.data.title).toBe('Step');
    expect(parsed.data.status).toBe('planned');
  });

  it('handles triple-nested dot-path keys', () => {
    const note = `---
title: Session
context:
  current_focus:
    summary: Old summary
    target: Old target
  status: active
---

# Session
`;

    const updated = updateFrontmatter(note, { 'context.current_focus.summary': 'New summary' });
    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data.context).toEqual({
      current_focus: { summary: 'New summary', target: 'Old target' },
      status: 'active',
    });
  });

  it('preserves flat keys and dot-path keys in the same update call', () => {
    const note = `---
title: Step
status: planned
context:
  status: active
---

# Step
`;

    const updated = updateFrontmatter(note, {
      status: 'done',
      'context.status': 'completed',
    });
    const parsed = parseYamlFrontmatter(updated.content);
    expect(parsed.data.status).toBe('done');
    expect(parsed.data.context.status).toBe('completed');
  });

  it('preserves CRLF line endings when updating generated content', () => {
    const note = [
      '---',
      'title: Windows',
      'status: planned',
      '---',
      '',
      '# Windows',
      '',
      '## Snapshot',
      '',
      '<!-- AGENT-START:block -->',
      '- old',
      '<!-- AGENT-END:block -->',
      '',
      '## Human Notes',
      '',
      '- keep this',
    ].join('\r\n');

    const updated = replaceGeneratedBlock(note, 'block', '- new\n- newer');

    expect(updated.content).toContain('\r\n- new\r\n- newer\r\n<!-- AGENT-END:block -->');
    expect(updated.content).toContain('## Human Notes\r\n\r\n- keep this');
  });

  it('replaces only the target generated block body', () => {
    const note = `---
title: Session
status: in-progress
---

# Session

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 09:00 - Started.
<!-- AGENT-END:session-execution-log -->

## Human Notes

- Preserve this context.
`;

    const updated = replaceGeneratedBlock(note, 'session-execution-log', '- 09:05 - Updated log.');

    expect(updated.content).toContain('- 09:05 - Updated log.');
    expect(updated.content).toContain('## Human Notes\n\n- Preserve this context.');
    expect(updated.content).not.toContain('- 09:00 - Started.');
  });

  it('reads generated block content without mutating surrounding prose', () => {
    const note = `---
title: Session
status: in-progress
---

# Session

## Execution Log

<!-- AGENT-START:session-execution-log -->
- 09:00 - Started.
<!-- AGENT-END:session-execution-log -->

## Human Notes

- Preserve this context.
`;

    expect(readGeneratedBlockContent(note, 'session-execution-log')).toBe('- 09:00 - Started.\n');
  });

  it('reads a generated block with markers for targeted context excerpts', () => {
    const note = `---
title: Session
status: in-progress
---

# Session

Intro prose.

<!-- AGENT-START:session-execution-log -->
- 09:00 - Started.
<!-- AGENT-END:session-execution-log -->

## Human Notes

- Preserve this context.
`;

    expect(readGeneratedBlockWithMarkers(note, 'session-execution-log')).toBe([
      '<!-- AGENT-START:session-execution-log -->',
      '- 09:00 - Started.',
      '<!-- AGENT-END:session-execution-log -->',
      '',
    ].join('\n'));
  });

  it('reads a heading section without loading neighboring sections', () => {
    const note = `---
title: Step
status: planned
---

# Step

## Execution Brief

- Load this.

### Details

- Nested content is part of the requested section.

## Validation Plan

- Do not load this.
`;

    expect(readHeadingSectionContent(note, 'Execution Brief')).toBe([
      '## Execution Brief',
      '',
      '- Load this.',
      '',
      '### Details',
      '',
      '- Nested content is part of the requested section.',
      '',
      '',
    ].join('\n'));
  });

  it('fails safely on nested generated markers inside the target block', () => {
    const note = `---
title: Broken
status: planned
---

# Broken

<!-- AGENT-START:outer -->
<!-- AGENT-START:inner -->
- nested
<!-- AGENT-END:inner -->
<!-- AGENT-END:outer -->
`;

    expect(() => replaceGeneratedBlock(note, 'outer', '- replacement')).toThrow(AgentVaultMutationError);
    expect(() => replaceGeneratedBlock(note, 'outer', '- replacement')).toThrow('contains nested or stray agent markers');
  });

  it('replaces a leaf heading section and preserves neighboring sections', () => {
    const note = `---
title: Step
status: planned
---

# Step

## Implementation Notes

- Old fact.

## Human Notes

- Keep judgment here.
`;

    const updated = replaceHeadingSection(note, 'Implementation Notes', '- New fact.\n- Another fact.');

    expect(updated.content).toContain('## Implementation Notes\n\n- New fact.\n- Another fact.\n\n## Human Notes');
    expect(updated.content).toContain('- Keep judgment here.');
  });

  it('fails safely when a heading section contains nested headings', () => {
    const note = `---
title: Nested
status: planned
---

# Nested

## Findings

- Parent fact.

### Deep Dive

- Child fact.

## Next

- Follow up.
`;

    expect(() => replaceHeadingSection(note, 'Findings', '- overwrite')).toThrow(AgentVaultMutationError);
    expect(() => replaceHeadingSection(note, 'Findings', '- overwrite')).toThrow('contains nested headings');
  });

  it('appends to an append-only section without disturbing surrounding sections', () => {
    const note = `---
title: Session
status: in-progress
---

# Session

## Findings

- Existing fact.

## Completion Summary

- Pending.
`;

    const updated = appendToAppendOnlySection(note, 'Findings', '- New fact.');

    expect(updated.content).toContain('## Findings\n\n- Existing fact.\n- New fact.\n\n## Completion Summary');
    expect(updated.content).toContain('## Completion Summary\n\n- Pending.');
  });

  it('fails safely when frontmatter is missing', () => {
    expect(() => parseYamlFrontmatter('# No frontmatter')).toThrow(AgentVaultMutationError);
    expect(() => parseYamlFrontmatter('# No frontmatter')).toThrow('note must start with YAML frontmatter');
  });
});
