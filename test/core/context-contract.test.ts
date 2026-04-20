import { describe, expect, it } from 'vitest';
import {
  CONTEXT_HANDOFF_SECTION_HEADING,
  CONTEXT_LAST_ACTION_TYPES,
  CONTEXT_MANUAL_COMMANDS,
  CONTEXT_PREPARE_AUTO_WRITE_FIELDS,
  CONTEXT_RESUME_TARGET_TYPES,
  CONTEXT_STATUS_VALUES,
  STEP_MIRROR_CONTEXT_ID_KEY,
  STEP_MIRROR_SESSION_ID_KEY,
  STEP_MIRROR_STATUS_KEY,
  STEP_MIRROR_SUMMARY_KEY,
  STEP_MIRROR_REQUIRED_KEYS,
  buildStepMirror,
  createDefaultSessionContext,
  isValidContextStatus,
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
    expect(SESSION_TEMPLATE).toContain('context:');
  });

  it('builds the default canonical session context shape', () => {
    expect(createDefaultSessionContext({
      sessionId: 'SESSION-2026-03-14-150926',
      stepLink: '[[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]',
      updatedAt: '2026-03-14T15:09:26.000Z',
    })).toEqual({
      context_id: 'SESSION-2026-03-14-150926',
      status: 'active',
      updated_at: '2026-03-14T15:09:26.000Z',
      current_focus: {
        summary: 'Advance [[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]].',
        target: '[[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]',
      },
      resume_target: {
        type: 'step',
        target: '[[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]',
        section: 'Context Handoff',
      },
      last_action: {
        type: 'saved',
      },
    });
  });

  describe('step mirrors', () => {
    it('exports step-mirror key constants', () => {
      expect(STEP_MIRROR_CONTEXT_ID_KEY).toBe('context_id');
      expect(STEP_MIRROR_SESSION_ID_KEY).toBe('active_session_id');
      expect(STEP_MIRROR_STATUS_KEY).toBe('context_status');
      expect(STEP_MIRROR_SUMMARY_KEY).toBe('context_summary');
    });

    it('exports the full list of required step-mirror keys', () => {
      expect(STEP_MIRROR_REQUIRED_KEYS).toEqual([
        'context_id', 'active_session_id', 'context_status', 'context_summary',
      ]);
    });

    it('builds step-mirror frontmatter from canonical session state', () => {
      const mirror = buildStepMirror({
        sessionId: '05_Sessions/SESSION-2026-04-20-014040-implement-canonical-session-context-persistence-pi',
        contextId: 'SESSION-2026-04-20-014040',
        status: 'active',
        summary: 'Advance STEP-01-02.',
      });
      expect(mirror).toEqual({
        context_id: 'SESSION-2026-04-20-014040',
        active_session_id: '05_Sessions/SESSION-2026-04-20-014040-implement-canonical-session-context-persistence-pi',
        context_status: 'active',
        context_summary: 'Advance STEP-01-02.',
      });
    });

    it('validates context status values correctly', () => {
      expect(isValidContextStatus('active')).toBe(true);
      expect(isValidContextStatus('paused')).toBe(true);
      expect(isValidContextStatus('blocked')).toBe(true);
      expect(isValidContextStatus('completed')).toBe(true);
      expect(isValidContextStatus('invalid')).toBe(false);
      expect(isValidContextStatus('')).toBe(false);
      expect(isValidContextStatus(undefined)).toBe(false);
      expect(isValidContextStatus(42)).toBe(false);
    });
  });
});
