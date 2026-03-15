import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseYamlFrontmatter } from '../../src/core/note-mutations';
import {
  handleAppendSectionCommand,
  handleCreateBugCommand,
  handleCreateDecisionCommand,
  handleCreatePhaseCommand,
  handleCreateSessionCommand,
  handleRefreshAllHomeNotesCommand,
  handleCreateStepCommand,
  handleRefreshActiveContextCommand,
  handleRebuildBugsIndexCommand,
  handleRebuildDecisionsIndexCommand,
  handleUpdateFrontmatterCommand,
} from '../../src/core/note-generators';
import { copyTemplate, copyHomeNote, makeIo } from '../helpers';

const FIXED_NOW = new Date('2026-03-14T15:09:26Z');

// Compute expected timestamp using local time (matches formatTimestamp in note-generators)
const pad2 = (n: number) => String(n).padStart(2, '0');
const EXPECTED_DATE = `${FIXED_NOW.getFullYear()}-${pad2(FIXED_NOW.getMonth() + 1)}-${pad2(FIXED_NOW.getDate())}`;
const EXPECTED_TIMESTAMP = `${EXPECTED_DATE}-${pad2(FIXED_NOW.getHours())}${pad2(FIXED_NOW.getMinutes())}${pad2(FIXED_NOW.getSeconds())}`;
const EXPECTED_SESSION_ID = `SESSION-${EXPECTED_TIMESTAMP}`;

const tempRoots: string[] = [];

const writeFoundationPhaseNote = async (tempVaultRoot: string): Promise<void> => {
  await writeFile(join(tempVaultRoot, '02_Phases', 'Phase_01_Foundation', 'Phase.md'), [
    '---',
    'note_type: phase',
    'template_version: 2',
    'contract_version: 1',
    'title: "Foundation"',
    'phase_id: "PHASE-01"',
    'status: active',
    'owner: ""',
    'created: "2026-03-14"',
    'updated: "2026-03-14"',
    'depends_on: []',
    'related_architecture: []',
    'related_decisions: []',
    'related_bugs: []',
    'tags:',
    '  - agent-vault',
    '  - phase',
    '---',
    '',
    '# Phase 01 Foundation',
    '',
    '## Objective',
    '',
    '- Build the vault foundation.',
    '',
    '## Why This Phase Exists',
    '',
    '- Establish the starter vault shape.',
    '',
    '## Scope',
    '',
    '- Create starter notes.',
    '',
    '## Non-Goals',
    '',
    '- Ship runtime code.',
    '',
    '## Dependencies',
    '',
    '- None.',
    '',
    '## Acceptance Criteria',
    '',
    '- Starter vault exists.',
    '',
    '## Linear Context',
    '',
    '<!-- AGENT-START:phase-linear-context -->',
    '- Previous phase: none.',
    '- Current phase status: active',
    '- Next phase: none yet.',
    '<!-- AGENT-END:phase-linear-context -->',
    '',
    '## Related Architecture',
    '',
    '<!-- AGENT-START:phase-related-architecture -->',
    '- None yet.',
    '<!-- AGENT-END:phase-related-architecture -->',
    '',
    '## Related Decisions',
    '',
    '<!-- AGENT-START:phase-related-decisions -->',
    '- None yet.',
    '<!-- AGENT-END:phase-related-decisions -->',
    '',
    '## Related Bugs',
    '',
    '<!-- AGENT-START:phase-related-bugs -->',
    '- None yet.',
    '<!-- AGENT-END:phase-related-bugs -->',
    '',
    '## Steps',
    '',
    '<!-- AGENT-START:phase-steps -->',
    '- No step notes yet.',
    '<!-- AGENT-END:phase-steps -->',
    '',
    '## Notes',
    '',
    '- Starter phase note.',
  ].join('\n'), 'utf-8');
};

const createTempVault = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-vault-'));
  tempRoots.push(root);
  await mkdir(join(root, '02_Phases', 'Phase_01_Foundation'), { recursive: true });
  await mkdir(join(root, '02_Phases', 'Phase_01_Foundation', 'Steps'), { recursive: true });
  await mkdir(join(root, '03_Bugs'), { recursive: true });
  await mkdir(join(root, '04_Decisions'), { recursive: true });
  await mkdir(join(root, '05_Sessions'), { recursive: true });
  await writeFoundationPhaseNote(root);
  await copyTemplate(root, 'Step_Template.md');
  await copyTemplate(root, 'Phase_Template.md');
  await copyTemplate(root, 'Session_Template.md');
  await copyTemplate(root, 'Bug_Template.md');
  await copyTemplate(root, 'Decision_Template.md');
  await copyHomeNote(root, 'Active_Context.md');
  await copyHomeNote(root, 'Bugs_Index.md');
  await copyHomeNote(root, 'Decisions_Index.md');
  return root;
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Agent Vault note generators', () => {
  it('prints rich help for create-step', async () => {
    const harness = makeIo();

    const exitCode = await handleCreateStepCommand(['--help'], { io: harness.io });

    expect(exitCode).toBe(0);
    expect(harness.stdout.join('\n')).toContain('Usage: create-step <phase-number> <step-number> <title>');
    expect(harness.stdout.join('\n')).toContain('Examples:');
  });

  it('create-phase creates the next phase folder and links the previous phase forward', async () => {
    const vaultRoot = await createTempVault();
    const harness = makeIo();

    const exitCode = await handleCreatePhaseCommand(
      ['Workflow Adoption'],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    const phasePath = join(vaultRoot, '02_Phases', 'Phase_02_workflow_adoption', 'Phase.md');
    const phaseContent = await readFile(phasePath, 'utf-8');
    const phaseFrontmatter = parseYamlFrontmatter(phaseContent, phasePath).data;

    expect(phaseFrontmatter.note_type).toBe('phase');
    expect(phaseFrontmatter.phase_id).toBe('PHASE-02');
    expect(phaseFrontmatter.depends_on).toEqual([
      '[[02_Phases/Phase_01_Foundation/Phase|PHASE-01 Foundation]]',
    ]);
    expect(phaseContent).toContain('# Phase 02 Workflow Adoption');
    expect(phaseContent).toContain('- Previous phase: [[02_Phases/Phase_01_Foundation/Phase|PHASE-01 Foundation]]');
    expect(harness.stdout[0]).toBe('Created 02_Phases/Phase_02_workflow_adoption/Phase.md');

    const previousPhaseContent = await readFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Phase.md'), 'utf-8');
    expect(previousPhaseContent).toContain('- Next phase: [[02_Phases/Phase_02_workflow_adoption/Phase|PHASE-02 Workflow Adoption]]');
  });

  it('create-step builds a step note inside the phase steps folder', async () => {
    const vaultRoot = await createTempVault();
    const harness = makeIo();

    const exitCode = await handleCreateStepCommand(
      ['1', '2', 'Add Agent Vault generators'],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    const notePath = join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_02_add-agent-vault-generators.md');
    const content = await readFile(notePath, 'utf-8');
    const frontmatter = parseYamlFrontmatter(content, notePath).data;

    expect(frontmatter.note_type).toBe('step');
    expect(frontmatter.title).toBe('Add Agent Vault generators');
    expect(frontmatter.step_id).toBe('STEP-01-02');
    expect(frontmatter.phase).toBe('[[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]]');
    expect(content).toContain('# Step 02 - Add Agent Vault generators');
    expect(content).toContain('- No sessions yet.');
    expect(harness.stdout[0]).toBe('Created 02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators.md');

    const phaseContent = await readFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Phase.md'), 'utf-8');
    expect(phaseContent).toContain('- [ ] [[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]');
  });

  it('rejects mutation paths that escape the vault root', async () => {
    const vaultRoot = await createTempVault();
    const harness = makeIo();

    const updateExitCode = await handleUpdateFrontmatterCommand(
      ['../outside.md', '--set', 'status=active'],
      { vaultRoot, io: harness.io },
    );
    const appendExitCode = await handleAppendSectionCommand(
      ['../outside.md', '--heading', 'Notes', '--content', 'oops'],
      { vaultRoot, io: harness.io },
    );

    expect(updateExitCode).toBe(1);
    expect(appendExitCode).toBe(1);
    expect(harness.stderr.some((line) => line.includes('escapes the vault root'))).toBe(true);
  });

  it('create-session resolves a step by id and creates a timestamped session note', async () => {
    const vaultRoot = await createTempVault();
    const createStepIo = makeIo();
    await handleCreateStepCommand(
      ['1', '2', 'Add Agent Vault generators'],
      { vaultRoot, io: createStepIo.io, now: () => FIXED_NOW },
    );

    const harness = makeIo();
    const exitCode = await handleCreateSessionCommand(
      ['STEP-01-02', '--agent', 'OpenCode'],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    const sessionFilename = `${EXPECTED_TIMESTAMP}-add-agent-vault-generators-opencode.md`;
    const notePath = join(vaultRoot, '05_Sessions', sessionFilename);
    const content = await readFile(notePath, 'utf-8');
    const frontmatter = parseYamlFrontmatter(content, notePath).data;

    expect(frontmatter.note_type).toBe('session');
    expect(frontmatter.title).toBe('OpenCode session for Add Agent Vault generators');
    expect(frontmatter.session_id).toBe(EXPECTED_SESSION_ID);
    expect(frontmatter.owner).toBe('OpenCode');
    expect(content).toContain('[[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]');
    expect(harness.stdout[0]).toBe(`Created 05_Sessions/${sessionFilename}`);

    const stepContent = await readFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_02_add-agent-vault-generators.md'), 'utf-8');
    const stepFrontmatter = parseYamlFrontmatter(stepContent).data;
    const sessionTarget = `05_Sessions/${sessionFilename.replace('.md', '')}`;
    const sessionLinkAlias = `${EXPECTED_SESSION_ID} OpenCode session for Add Agent Vault generators`;
    expect(stepFrontmatter.related_sessions).toEqual([
      `[[${sessionTarget}|${sessionLinkAlias}]]`,
    ]);
    expect(stepContent).toContain(`- ${EXPECTED_DATE} - [[${sessionTarget}|${sessionLinkAlias}]] - Session created.`);
  });

  it('create-bug auto-generates the next bug id and links related step and session notes', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0003_existing.md'), '---\nbug_id: BUG-0003\ntitle: Existing\nnote_type: bug\n---\n', 'utf-8');

    await handleCreateStepCommand(
      ['1', '2', 'Add Agent Vault generators'],
      { vaultRoot, io: makeIo().io, now: () => FIXED_NOW },
    );
    await handleCreateSessionCommand(
      ['STEP-01-02'],
      { vaultRoot, io: makeIo().io, now: () => FIXED_NOW },
    );

    const harness = makeIo();
    const exitCode = await handleCreateBugCommand(
      [
        'Generator links are missing',
        '--step',
        'STEP-01-02',
        '--session',
        EXPECTED_SESSION_ID,
      ],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    const notePath = join(vaultRoot, '03_Bugs', 'BUG-0004_generator-links-are-missing.md');
    const content = await readFile(notePath, 'utf-8');
    const frontmatter = parseYamlFrontmatter(content, notePath).data;

    expect(frontmatter.note_type).toBe('bug');
    expect(frontmatter.bug_id).toBe('BUG-0004');
    const sessionBasename = `${EXPECTED_TIMESTAMP}-add-agent-vault-generators`;
    expect(frontmatter.related_notes).toEqual([
      '[[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]',
      `[[05_Sessions/${sessionBasename}|${EXPECTED_SESSION_ID} Session for Add Agent Vault generators]]`,
    ]);
    expect(content).toContain('- Phase: [[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]]');
    expect(content).toContain('- Step: [[02_Phases/Phase_01_Foundation/Steps/Step_02_add-agent-vault-generators|STEP-01-02 Add Agent Vault generators]]');
    expect(content).toContain(`- Session: [[05_Sessions/${sessionBasename}|${EXPECTED_SESSION_ID} Session for Add Agent Vault generators]]`);
    expect(harness.stdout[0]).toBe('Created 03_Bugs/BUG-0004_generator-links-are-missing.md');
  });

  it('create-decision auto-generates the next decision id and links related phase, session, and bug notes', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '04_Decisions', 'DEC-0002_existing.md'), '---\ndecision_id: DEC-0002\ntitle: Existing\nnote_type: decision\n---\n', 'utf-8');

    await handleCreateStepCommand(
      ['1', '2', 'Add Agent Vault generators'],
      { vaultRoot, io: makeIo().io, now: () => FIXED_NOW },
    );
    await handleCreateSessionCommand(
      ['STEP-01-02'],
      { vaultRoot, io: makeIo().io, now: () => FIXED_NOW },
    );
    await handleCreateBugCommand(
      ['Generator links are missing', '--step', 'STEP-01-02', '--session', EXPECTED_SESSION_ID],
      { vaultRoot, io: makeIo().io, now: () => FIXED_NOW },
    );

    const harness = makeIo();
    const exitCode = await handleCreateDecisionCommand(
      [
        'Generate linked decision records',
        '--phase',
        'PHASE-01',
        '--session',
        EXPECTED_SESSION_ID,
        '--bug',
        'BUG-0001',
      ],
      { vaultRoot, io: harness.io, now: () => FIXED_NOW },
    );

    expect(exitCode).toBe(0);
    const decisionPath = join(vaultRoot, '04_Decisions', 'DEC-0003_generate-linked-decision-records.md');
    const decisionContent = await readFile(decisionPath, 'utf-8');
    const decisionFrontmatter = parseYamlFrontmatter(decisionContent, decisionPath).data;

    const decSessionBasename = `${EXPECTED_TIMESTAMP}-add-agent-vault-generators`;
    expect(decisionFrontmatter.note_type).toBe('decision');
    expect(decisionFrontmatter.decision_id).toBe('DEC-0003');
    expect(decisionFrontmatter.related_notes).toEqual([
      '[[02_Phases/Phase_01_Foundation/Phase|PHASE-01 Foundation]]',
      `[[05_Sessions/${decSessionBasename}|${EXPECTED_SESSION_ID} Session for Add Agent Vault generators]]`,
      '[[03_Bugs/BUG-0001_generator-links-are-missing|BUG-0001 Generator links are missing]]',
    ]);
    expect(harness.stdout[0]).toBe('Created 04_Decisions/DEC-0003_generate-linked-decision-records.md');
  });

  it('rebuild-bugs-index derives a readable table from bug frontmatter and preserves surrounding notes', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0002_generator-links-are-missing.md'), [
      '---',
      'note_type: bug',
      'title: Generator links are missing',
      'bug_id: BUG-0002',
      'status: investigating',
      'severity: sev-1',
      'reported_on: "2026-03-14"',
      'fixed_on: ""',
      'linear_id: FRED-22',
      '---',
      '',
      '# BUG-0002 - Generator links are missing',
    ].join('\n'), 'utf-8');
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0001_old-regression.md'), [
      '---',
      'note_type: bug',
      'title: Old regression',
      'bug_id: BUG-0001',
      'status: closed',
      'severity: sev-3',
      'reported_on: "2026-03-10"',
      'fixed_on: "2026-03-12"',
      '---',
      '',
      '# BUG-0001 - Old regression',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleRebuildBugsIndexCommand([], { vaultRoot, io: harness.io, now: () => FIXED_NOW });

    expect(exitCode).toBe(0);
    const indexPath = join(vaultRoot, '00_Home', 'Bugs_Index.md');
    const content = await readFile(indexPath, 'utf-8');

    expect(content).toContain('## Triage Rules');
    expect(content).toContain('## Useful Links');
    expect(content).toContain('<!-- AGENT-START:bugs-index -->');
    expect(content).toContain('_Last rebuilt: 2026-03-14._');
    expect(content).toContain('| Id | Title | Status | Severity | Reported | Fixed | Linear |');
    const bugRowOne = '| BUG-0002 | [Generator links are missing](../03_Bugs/BUG-0002_generator-links-are-missing.md) | investigating | sev-1 | 2026-03-14 | - | FRED-22 |';
    const bugRowTwo = '| BUG-0001 | [Old regression](../03_Bugs/BUG-0001_old-regression.md) | closed | sev-3 | 2026-03-10 | 2026-03-12 | - |';
    expect(content).toContain(bugRowOne);
    expect(content).toContain(bugRowTwo);
    expect(content.indexOf(bugRowOne)).toBeLessThan(content.indexOf(bugRowTwo));
    expect(harness.stdout[0]).toBe('Updated 00_Home/Bugs_Index.md');
  });

  it('rebuild-decisions-index derives a readable table from decision frontmatter', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '04_Decisions', 'DEC-0002_indexes-are-generated.md'), [
      '---',
      'note_type: decision',
      'title: Indexes are generated',
      'decision_id: DEC-0002',
      'status: accepted',
      'decided_on: "2026-03-14"',
      'updated: "2026-03-14"',
      'linear_id: FRED-30',
      '---',
      '',
      '# DEC-0002 - Indexes are generated',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleRebuildDecisionsIndexCommand([], { vaultRoot, io: harness.io, now: () => FIXED_NOW });

    expect(exitCode).toBe(0);
    const content = await readFile(join(vaultRoot, '00_Home', 'Decisions_Index.md'), 'utf-8');
    expect(content).toContain('| Id | Title | Status | Decided | Updated | Linear |');
    expect(content).toContain('DEC-0002');
    expect(harness.stdout[0]).toBe('Updated 00_Home/Decisions_Index.md');
  });

  it('refresh-active-context derives focus, blockers, and critical bugs from metadata', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Phase.md'), [
      '---',
      'note_type: phase',
      'title: Foundation',
      'phase_id: PHASE-01',
      'status: in-progress',
      'owner: Platform Team',
      'created: "2026-03-10"',
      'updated: "2026-03-14"',
      '---',
      '',
      '# Phase 01 Foundation',
    ].join('\n'), 'utf-8');
    await writeFile(join(vaultRoot, '02_Phases', 'Phase_01_Foundation', 'Steps', 'Step_02_add-indexes.md'), [
      '---',
      'note_type: step',
      'title: Add indexes',
      'step_id: STEP-01-02',
      'phase: "[[02_Phases/Phase_01_Foundation/Phase|Phase 01 Foundation]]"',
      'status: in-progress',
      'owner: OpenCode',
      'created: "2026-03-12"',
      'updated: "2026-03-14"',
      '---',
      '',
      '# Step 02 - Add indexes',
    ].join('\n'), 'utf-8');
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0007_release-blocker.md'), [
      '---',
      'note_type: bug',
      'title: Release blocker',
      'bug_id: BUG-0007',
      'status: investigating',
      'severity: sev-1',
      'reported_on: "2026-03-14"',
      'linear_id: FRED-77',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      '---',
      '',
      '# BUG-0007 - Release blocker',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleRefreshActiveContextCommand([], { vaultRoot, io: harness.io, now: () => FIXED_NOW });

    expect(exitCode).toBe(0);
    const content = await readFile(join(vaultRoot, '00_Home', 'Active_Context.md'), 'utf-8');
    expect(content).toContain('<!-- AGENT-START:current-focus -->');
    expect(content).toContain('_Last refreshed: 2026-03-14._');
    expect(content).toContain('Active phase: [[02_Phases/Phase_01_Foundation/Phase|PHASE-01 Foundation]]');
    expect(content).toContain('<!-- AGENT-START:critical-bugs -->');
    expect(content).toContain('BUG-0007 Release blocker');
    expect(harness.stdout[0]).toBe('Updated 00_Home/Active_Context.md');
  });

  it('refresh-all-home-notes runs all three home refreshers', async () => {
    const vaultRoot = await createTempVault();
    await writeFile(join(vaultRoot, '03_Bugs', 'BUG-0001_release-blocker.md'), [
      '---',
      'note_type: bug',
      'title: Release blocker',
      'bug_id: BUG-0001',
      'status: investigating',
      'severity: sev-1',
      'reported_on: "2026-03-14"',
      'linear_id: FRED-99',
      'created: "2026-03-14"',
      'updated: "2026-03-14"',
      '---',
      '',
      '# BUG-0001 - Release blocker',
    ].join('\n'), 'utf-8');
    await writeFile(join(vaultRoot, '04_Decisions', 'DEC-0001_generate-home-notes.md'), [
      '---',
      'note_type: decision',
      'title: Generate home notes',
      'decision_id: DEC-0001',
      'status: accepted',
      'decided_on: "2026-03-14"',
      'updated: "2026-03-14"',
      '---',
      '',
      '# DEC-0001 - Generate home notes',
    ].join('\n'), 'utf-8');

    const harness = makeIo();
    const exitCode = await handleRefreshAllHomeNotesCommand([], { vaultRoot, io: harness.io, now: () => FIXED_NOW });

    expect(exitCode).toBe(0);
    expect(harness.stdout).toEqual([
      'Updated 00_Home/Bugs_Index.md',
      'Updated 00_Home/Decisions_Index.md',
      'Updated 00_Home/Active_Context.md',
      'Refreshed all home notes.',
    ]);
  });
});
