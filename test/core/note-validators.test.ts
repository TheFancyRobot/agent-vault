import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  handleDetectOrphansCommand,
  handleVaultDoctorCommand,
  handleValidateAllCommand,
  handleValidateFrontmatterCommand,
  handleValidateNoteStructureCommand,
  handleValidateRequiredLinksCommand,
} from '../../src/core/note-validators';
import { copyTemplate, makeIo } from '../helpers';

const tempRoots: string[] = [];

const createTempVault = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-vault-validators-'));
  tempRoots.push(root);
  await mkdir(join(root, '00_Home'), { recursive: true });
  await mkdir(join(root, '01_Architecture'), { recursive: true });
  await mkdir(join(root, '02_Phases', 'Phase_01_Testing', 'Steps'), { recursive: true });
  await mkdir(join(root, '03_Bugs'), { recursive: true });
  await mkdir(join(root, '04_Decisions'), { recursive: true });
  await mkdir(join(root, '05_Sessions'), { recursive: true });
  await mkdir(join(root, '07_Templates'), { recursive: true });
  await copyTemplate(root, 'Step_Template.md');
  await copyTemplate(root, 'Session_Template.md');
  await copyTemplate(root, 'Decision_Template.md');
  await copyTemplate(root, 'Bug_Template.md');
  await copyTemplate(root, 'Architecture_Template.md');
  await copyTemplate(root, 'Phase_Template.md');
  await writeFile(join(root, '00_Home', 'Active_Context.md'), [
    '---',
    'note_type: home_context',
    'template_version: 1',
    'contract_version: 1',
    'title: Active Context',
    'status: active',
    'created: "2026-03-14"',
    'updated: "2026-03-14"',
    'tags:',
    '  - agent-vault',
    '---',
    '',
    '# Active Context',
    '',
    '## Current Objective',
    '',
    '<!-- AGENT-START:current-focus -->',
    '- None.',
    '<!-- AGENT-END:current-focus -->',
    '',
    '## Repo Snapshot',
    '',
    '## In Scope Right Now',
    '',
    '## Out Of Scope Right Now',
    '',
    '## Working Assumptions',
    '',
    '## Blockers',
    '',
    '## Open Questions',
    '',
    '## Critical Bugs',
    '',
    '## Next Actions',
  ].join('\n'), 'utf-8');
  await writeFile(join(root, '00_Home', 'Bugs_Index.md'), [
    '---',
    'note_type: home_index',
    'template_version: 1',
    'contract_version: 1',
    'title: Bugs Index',
    'status: active',
    'created: "2026-03-14"',
    'updated: "2026-03-14"',
    'tags:',
    '  - agent-vault',
    '---',
    '',
    '# Bugs Index',
    '',
    '## Triage Rules',
    '',
    '## Status Buckets',
    '',
    '<!-- AGENT-START:bugs-index -->',
    '- None.',
    '<!-- AGENT-END:bugs-index -->',
    '',
    '## Useful Links',
  ].join('\n'), 'utf-8');
  await writeFile(join(root, '00_Home', 'Decisions_Index.md'), [
    '---',
    'note_type: home_index',
    'template_version: 1',
    'contract_version: 1',
    'title: Decisions Index',
    'status: active',
    'created: "2026-03-14"',
    'updated: "2026-03-14"',
    'tags:',
    '  - agent-vault',
    '---',
    '',
    '# Decisions Index',
    '',
    '## Logging Rules',
    '',
    '## Starter Decision Candidates',
    '',
    '## Decision Log',
    '',
    '<!-- AGENT-START:decisions-index -->',
    '- None.',
    '<!-- AGENT-END:decisions-index -->',
    '',
    '## Useful Links',
  ].join('\n'), 'utf-8');
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Agent Vault note validators', () => {
  it('prints rich help for validate-all', async () => {
    const harness = makeIo();

    const exitCode = await handleValidateAllCommand(['--help'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: validate-all');
    expect(harness.stdout.join('\n')).toContain('Examples:');
  });

  it('vault-doctor reports validation status on temp vault', async () => {
    const vaultRoot = await createTempVault();
    const harness = makeIo();

    const exitCode = await handleVaultDoctorCommand([], { vaultRoot, io: harness.io });

    // Temp vault should pass validation (all notes have proper frontmatter)
    expect(harness.stdout[0]).toContain('Agent Vault doctor report');
  });

  it('validate-frontmatter errors on unknown note types and warns for legacy starter notes', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '01_Architecture', 'Legacy.md'), '# Legacy Architecture\n', 'utf-8');
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0001_bad.md'), [
      '---',
      'note_type: mystery',
      'title: Bad note',
      '---',
      '',
      '# Bad note',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateFrontmatterCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout[0]).toContain('validate-frontmatter');
    expect(harness.stdout.some((line) => line.includes('WARN LEGACY_MISSING_FRONTMATTER 01_Architecture/Legacy.md'))).toBe(true);
    expect(harness.stdout.some((line) => line.includes('ERROR UNKNOWN_NOTE_TYPE 03_Bugs/BUG-0001_bad.md'))).toBe(true);
  });

  it('validate-note-structure flags missing headings and unbalanced generated blocks', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0001_broken.md'), [
      '---',
      'note_type: bug',
      'template_version: 2',
      'contract_version: 1',
      'title: Broken bug',
      'bug_id: BUG-0001',
      'status: new',
      'severity: sev-2',
      'category: logic',
      'reported_on: "2026-03-14"',
      'fixed_on: ""',
      'owner: ""',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      'related_notes: []',
      'tags:',
      '  - agent-vault',
      '  - bug',
      '---',
      '',
      '# BUG-0001 - Broken bug',
      '',
      '## Summary',
      '',
      '<!-- AGENT-START:bug-related-notes -->',
      '- None yet.',
      '',
      '## Timeline',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateNoteStructureCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout.some((line) => line.includes('ERROR MISSING_REQUIRED_HEADING 03_Bugs/BUG-0001_broken.md - missing heading "Observed Behavior"'))).toBe(true);
    expect(harness.stdout.some((line) => line.includes('ERROR UNBALANCED_GENERATED_BLOCK 03_Bugs/BUG-0001_broken.md'))).toBe(true);
  });

  it('validate-frontmatter rejects session notes without canonical context', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '05_Sessions', '2026-03-14-session.md'), [
      '---',
      'note_type: session',
      'template_version: 2',
      'contract_version: 1',
      'title: Session without context',
      'session_id: SESSION-2026-03-14-01',
      'date: "2026-03-14"',
      'status: in-progress',
      'owner: ""',
      'branch: ""',
      'phase: "[[02_Phases/Phase_01_Testing/Phase|Phase 01 Testing]]"',
      'related_bugs: []',
      'related_decisions: []',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      'tags:',
      '  - agent-vault',
      '  - session',
      '---',
      '',
      '# Session without context',
      '',
      '## Objective',
      '',
      '- Advance [[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]].',
      '',
      '## Planned Scope',
      '',
      '- Investigate.',
      '',
      '## Execution Log',
      '',
      '<!-- AGENT-START:session-execution-log -->',
      '- 09:00 - Started.',
      '<!-- AGENT-END:session-execution-log -->',
      '',
      '## Findings',
      '',
      '- None yet.',
      '',
      '## Context Handoff',
      '',
      '- None yet.',
      '',
      '## Changed Paths',
      '',
      '<!-- AGENT-START:session-changed-paths -->',
      '- None yet.',
      '<!-- AGENT-END:session-changed-paths -->',
      '',
      '## Validation Run',
      '',
      '<!-- AGENT-START:session-validation-run -->',
      '- Command: not run yet',
      '- Result: not run',
      '- Notes: ',
      '<!-- AGENT-END:session-validation-run -->',
      '',
      '## Bugs Encountered',
      '',
      '<!-- AGENT-START:session-bugs-encountered -->',
      '- None.',
      '<!-- AGENT-END:session-bugs-encountered -->',
      '',
      '## Decisions Made or Updated',
      '',
      '<!-- AGENT-START:session-decisions-made-or-updated -->',
      '- None.',
      '<!-- AGENT-END:session-decisions-made-or-updated -->',
      '',
      '## Follow-Up Work',
      '',
      '<!-- AGENT-START:session-follow-up-work -->',
      '- [ ] Continue.',
      '<!-- AGENT-END:session-follow-up-work -->',
      '',
      '## Completion Summary',
      '',
      '- Pending.',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateFrontmatterCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout.some((line) => line.includes('ERROR MISSING_FRONTMATTER_KEY 05_Sessions/2026-03-14-session.md - missing required frontmatter key "context"'))).toBe(true);
  });

  it('validate-note-structure requires the canonical context handoff heading on sessions', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '05_Sessions', '2026-03-14-session.md'), [
      '---',
      'note_type: session',
      'template_version: 2',
      'contract_version: 1',
      'title: Session without handoff',
      'session_id: SESSION-2026-03-14-01',
      'date: "2026-03-14"',
      'status: in-progress',
      'owner: ""',
      'branch: ""',
      'phase: "[[02_Phases/Phase_01_Testing/Phase|Phase 01 Testing]]"',
      'context:',
      '  context_id: SESSION-2026-03-14-01',
      '  status: active',
      '  updated_at: "2026-03-14T09:00:00.000Z"',
      '  current_focus:',
      '    summary: "Advance [[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]]."',
      '    target: "[[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]]"',
      '  resume_target:',
      '    type: step',
      '    target: "[[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]]"',
      '    section: "Context Handoff"',
      '  last_action:',
      '    type: saved',
      'related_bugs: []',
      'related_decisions: []',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      'tags:',
      '  - agent-vault',
      '  - session',
      '---',
      '',
      '# Session without handoff',
      '',
      '## Objective',
      '',
      '- Advance [[02_Phases/Phase_01_Testing/Steps/Step_01_missing-links|STEP-01-01 Missing links]].',
      '',
      '## Planned Scope',
      '',
      '- Investigate.',
      '',
      '## Execution Log',
      '',
      '<!-- AGENT-START:session-execution-log -->',
      '- 09:00 - Started.',
      '<!-- AGENT-END:session-execution-log -->',
      '',
      '## Findings',
      '',
      '- None yet.',
      '',
      '## Changed Paths',
      '',
      '<!-- AGENT-START:session-changed-paths -->',
      '- None yet.',
      '<!-- AGENT-END:session-changed-paths -->',
      '',
      '## Validation Run',
      '',
      '<!-- AGENT-START:session-validation-run -->',
      '- Command: not run yet',
      '- Result: not run',
      '- Notes: ',
      '<!-- AGENT-END:session-validation-run -->',
      '',
      '## Bugs Encountered',
      '',
      '<!-- AGENT-START:session-bugs-encountered -->',
      '- None.',
      '<!-- AGENT-END:session-bugs-encountered -->',
      '',
      '## Decisions Made or Updated',
      '',
      '<!-- AGENT-START:session-decisions-made-or-updated -->',
      '- None.',
      '<!-- AGENT-END:session-decisions-made-or-updated -->',
      '',
      '## Follow-Up Work',
      '',
      '<!-- AGENT-START:session-follow-up-work -->',
      '- [ ] Continue.',
      '<!-- AGENT-END:session-follow-up-work -->',
      '',
      '## Completion Summary',
      '',
      '- Pending.',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateNoteStructureCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout.some((line) => line.includes('ERROR MISSING_REQUIRED_HEADING 05_Sessions/2026-03-14-session.md - missing heading "Context Handoff"'))).toBe(true);
  });

  it('validate-required-links enforces step, session, and decision links', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '02_Phases', 'Phase_01_Testing', 'Steps', 'Step_01_missing-links.md'), [
      '---',
      'note_type: step',
      'template_version: 2',
      'contract_version: 1',
      'title: Missing links',
      'step_id: STEP-01-01',
      'phase: "[[02_Phases/Phase_01_Testing/Phase|Phase 01 Testing]]"',
      'status: planned',
      'owner: ""',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      'depends_on: []',
      'related_sessions: []',
      'related_bugs: []',
      'tags:',
      '  - agent-vault',
      '  - step',
      '---',
      '',
      '# Step 01 - Missing links',
      '',
      '## Required Reading',
      '',
      '- Read the phase note.',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateRequiredLinksCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout.some((line) => line.includes('ERROR MISSING_ARCHITECTURE_LINK 02_Phases/Phase_01_Testing/Steps/Step_01_missing-links.md'))).toBe(true);
  });

  it('validate-required-links skips placeholder templates', async () => {
    const vaultRoot = await createTempVault();
    const harness = makeIo();

    const exitCode = await handleValidateRequiredLinksCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout[0]).toContain('validate-required-links: checked 0 notes');
    expect(harness.stdout.some((line) => line.includes('07_Templates/'))).toBe(false);
  });

  it('ignores nested step companion notes for strict step validation', async () => {
    const vaultRoot = await createTempVault();
    const companionDir = join(vaultRoot, '02_Phases', 'Phase_01_Testing', 'Steps', 'Step_01_missing-links');
    await mkdir(companionDir, { recursive: true });
    await writeFile(join(companionDir, 'Execution_Brief.md'), '# Execution Brief\n\nUnstructured helper note.\n', 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateAllCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.some((line) => line.includes('ERROR') && line.includes('Execution_Brief.md'))).toBe(false);
  });

  it('detect-orphans reports fully isolated notes as warnings', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '01_Architecture', 'Orphan.md'), [
      '---',
      'note_type: architecture',
      'template_version: 2',
      'contract_version: 1',
      'title: Orphan',
      'architecture_id: ARCH-0001',
      'status: active',
      'owner: ""',
      'reviewed_on: "2026-03-14"',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      'related_notes: []',
      'tags:',
      '  - agent-vault',
      '  - architecture',
      '---',
      '',
      '# Orphan',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleDetectOrphansCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.some((line) => line.includes('WARN ORPHAN_NOTE 01_Architecture/Orphan.md'))).toBe(true);
  });

  it('validate-all runs all validators and returns non-zero on errors', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0001_bad.md'), [
      '---',
      'note_type: mystery',
      'title: Bad note',
      '---',
      '',
      '# Bad note',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleValidateAllCommand([], { vaultRoot, io: harness.io });

    expect(exitCode).toBe(1);
    expect(harness.stdout[0]).toContain('validate-frontmatter');
    expect(harness.stdout.some((line) => line.includes('validate-note-structure:'))).toBe(true);
    expect(harness.stdout.some((line) => line.includes('validate-required-links:'))).toBe(true);
    expect(harness.stdout.some((line) => line.includes('detect-orphans:'))).toBe(true);
    expect(harness.stdout.some((line) => line.includes('Validated all Agent Vault note integrity checks.'))).toBe(false);
  });
});
