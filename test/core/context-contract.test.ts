import { describe, expect, it } from 'vitest';
import {
  CONTEXT_HANDOFF_SECTION_HEADING,
  CONTEXT_LAST_ACTION_TYPES,
  CONTEXT_MANUAL_COMMANDS,
  CONTEXT_PREPARE_AUTO_WRITE_FIELDS,
  CONTEXT_RESUME_TARGET_TYPES,
  CONTEXT_STATUS_VALUES,
} from '../../src/core/context-contract';
import { SESSION_TEMPLATE } from '../../src/templates/note-templates';

describe('built-in context contract', () => {
  it('locks the v1 lifecycle and object enums', () => {
    expect(CONTEXT_STATUS_VALUES).toEqual(['active', 'paused', 'blocked', 'completed']);
    expect(CONTEXT_LAST_ACTION_TYPES).toEqual(['saved', 'switched', 'resumed', 'prepared', 'paused', 'completed']);
    expect(CONTEXT_RESUME_TARGET_TYPES).toEqual(['session', 'step', 'phase', 'handoff']);
  });

  it('locks canonical manual commands and back-compat aliases', () => {
    expect(CONTEXT_MANUAL_COMMANDS).toEqual([
      { canonical: 'save-context', aliases: ['checkpoint'] },
      { canonical: 'switch-context', aliases: ['transition'] },
      { canonical: 'resume-context', aliases: ['resume-prepare'] },
      { canonical: 'prepare-context', aliases: ['compact-research'] },
    ]);
  });

  it('locks prepare-context auto-write boundaries', () => {
    expect(CONTEXT_PREPARE_AUTO_WRITE_FIELDS).toEqual(['updated_at', 'last_action', 'current_focus', 'resume_target']);
  });

  it('reserves a single canonical handoff section on session notes', () => {
    expect(CONTEXT_HANDOFF_SECTION_HEADING).toBe('Context Handoff');
    expect(SESSION_TEMPLATE).toContain('## Context Handoff');
  });
});
