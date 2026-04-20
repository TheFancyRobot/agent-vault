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

export const formatContextManualCommandSummary = (): string[] => [
  'Advanced/manual context primitives:',
  ...CONTEXT_MANUAL_COMMANDS.map(({ canonical, aliases }) => {
    const aliasLabel = aliases.length === 1 ? 'alias' : 'aliases';
    return `- ${canonical} (${aliasLabel}: ${aliases.join(', ')})`;
  }),
  'Normal /vault:* workflow commands remain the primary UX.',
];
