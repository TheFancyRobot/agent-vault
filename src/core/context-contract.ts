export const CONTEXT_STATUS_VALUES = ['active', 'paused', 'blocked', 'completed'] as const;

export const CONTEXT_LAST_ACTION_TYPES = [
  'saved',
  'switched',
  'resumed',
  'prepared',
  'paused',
  'completed',
] as const;

export const CONTEXT_RESUME_TARGET_TYPES = ['session', 'step', 'phase', 'handoff'] as const;

export const CONTEXT_HANDOFF_SECTION_HEADING = 'Context Handoff' as const;

/**
 * Step-mirror frontmatter keys.
 *
 * These fields are copied FROM the canonical session context ONTO step notes
 * to provide durable routing and continuity across sessions. They must NEVER
 * diverge from the canonical session — always read the source of truth from
 * the session note and mirror downstream.
 *
 * Mirrors update only on:
 * - Session creation linked to the step
 * - Session lifecycle transitions (active → paused, paused → active, etc.)
 * - Session completion
 * - A new session becoming the active session for the step
 *
 * Mirrors are intentionally minimal to avoid making the step note a second
 * source of truth (see DEC-0001).
 */
export const STEP_MIRROR_CONTEXT_ID_KEY = 'context_id' as const;
export const STEP_MIRROR_SESSION_ID_KEY = 'active_session_id' as const;
export const STEP_MIRROR_STATUS_KEY = 'context_status' as const;
export const STEP_MIRROR_SUMMARY_KEY = 'context_summary' as const;

export const STEP_MIRROR_REQUIRED_KEYS = [
  STEP_MIRROR_CONTEXT_ID_KEY,
  STEP_MIRROR_SESSION_ID_KEY,
  STEP_MIRROR_STATUS_KEY,
  STEP_MIRROR_SUMMARY_KEY,
] as const;

export interface StepMirrorState {
  readonly context_id: string;
  readonly active_session_id: string;
  readonly context_status: ContextStatus;
  readonly context_summary: string;
}

export interface BuildStepMirrorInput {
  readonly sessionId: string;
  readonly contextId: string;
  readonly status: ContextStatus;
  readonly summary: string;
}

/** Build the step-mirror frontmatter object from canonical session state. */
export const buildStepMirror = ({
  sessionId,
  contextId,
  status,
  summary,
}: BuildStepMirrorInput): Record<string, unknown> => ({
  [STEP_MIRROR_CONTEXT_ID_KEY]: contextId,
  [STEP_MIRROR_SESSION_ID_KEY]: sessionId,
  [STEP_MIRROR_STATUS_KEY]: status,
  [STEP_MIRROR_SUMMARY_KEY]: summary,
});

export const CONTEXT_PREPARE_AUTO_WRITE_FIELDS = [
  'updated_at',
  'last_action',
  'current_focus',
  'resume_target',
] as const;

export const CONTEXT_MANUAL_COMMANDS = [
  { canonical: 'save-context', aliases: ['checkpoint'] },
  { canonical: 'switch-context', aliases: ['transition'] },
  { canonical: 'resume-context', aliases: ['resume-prepare'] },
  { canonical: 'prepare-context', aliases: ['compact-research'] },
] as const;

export type ContextStatus = (typeof CONTEXT_STATUS_VALUES)[number];
export type ContextLastActionType = (typeof CONTEXT_LAST_ACTION_TYPES)[number];
export type ContextResumeTargetType = (typeof CONTEXT_RESUME_TARGET_TYPES)[number];

export interface ContextCommandDefinition {
  readonly canonical: string;
  readonly aliases: readonly string[];
}

export interface SessionContextFocus {
  readonly summary: string;
  readonly target: string;
}

export interface SessionContextResumeTarget {
  readonly type: ContextResumeTargetType;
  readonly target: string;
  readonly section: string;
}

export interface SessionContextLastAction {
  readonly type: ContextLastActionType;
}

export interface SessionContextState {
  readonly context_id: string;
  readonly status: ContextStatus;
  readonly updated_at: string;
  readonly current_focus: SessionContextFocus;
  readonly resume_target: SessionContextResumeTarget;
  readonly last_action: SessionContextLastAction;
}

export interface CreateDefaultSessionContextInput {
  readonly sessionId: string;
  readonly stepLink: string;
  readonly updatedAt: string;
}

export const createDefaultSessionContext = ({
  sessionId,
  stepLink,
  updatedAt,
}: CreateDefaultSessionContextInput): SessionContextState => ({
  context_id: sessionId,
  status: 'active',
  updated_at: updatedAt,
  current_focus: {
    summary: `Advance ${stepLink}.`,
    target: stepLink,
  },
  resume_target: {
    type: 'step',
    target: stepLink,
    section: CONTEXT_HANDOFF_SECTION_HEADING,
  },
  last_action: {
    type: 'saved',
  },
});

export const isValidContextStatus = (value: unknown): value is ContextStatus =>
  typeof value === 'string' && CONTEXT_STATUS_VALUES.includes(value as ContextStatus);

export const formatContextManualCommandSummary = (): string[] => [
  'Advanced/manual context primitives:',
  ...CONTEXT_MANUAL_COMMANDS.map(({ canonical, aliases }) => {
    const aliasLabel = aliases.length === 1 ? 'alias' : 'aliases';
    return `- ${canonical} (${aliasLabel}: ${aliases.join(', ')})`;
  }),
  'Normal /vault:* workflow commands remain the primary UX.',
];
