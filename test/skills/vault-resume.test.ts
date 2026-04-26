import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const { vaultResume } = require('../../pi-package/skills/vault-resume/index.js') as {
  vaultResume: (params?: { session?: string }) => Promise<{
    continuationTarget?: { type: string; description: string };
  } | null>;
};

const tempRoots: string[] = [];
const originalCwd = process.cwd();

const writeNote = async (root: string, relativePath: string, content: string): Promise<void> => {
  const absolutePath = join(root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
};

const createResumeVault = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'agent-vault-resume-'));
  tempRoots.push(root);
  await mkdir(join(root, '.agent-vault', '05_Sessions'), { recursive: true });
  await mkdir(join(root, '.agent-vault', '02_Phases', 'Phase_01_Foundation', 'Steps'), { recursive: true });
  return root;
};

const phaseNote = (status = 'in-progress'): string => `---
phase_id: PHASE-01
status: ${status}
---

# Phase 01 Foundation
`;

const stepNote = (id: string, status: string, sessionId: string): string => `---
step_id: ${id}
status: ${status}
related_sessions: ["${sessionId}"]
---

# ${id}
`;

const sessionNote = (sessionId: string): string => `---
session_id: ${sessionId}
status: in-progress
phase: "02_Phases/Phase_01_Foundation/Phase"
related_bugs: []
related_decisions: []
---

## Execution Log
- last action

## Follow-Up Work
- continue

## Completion Summary
Paused for resume test.
`;

describe('vault-resume skill', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('resumes work from steps stored under the phase Steps folder', async () => {
    const root = await createResumeVault();
    process.chdir(root);

    await writeNote(root, '.agent-vault/02_Phases/Phase_01_Foundation/Phase.md', phaseNote());
    await writeNote(
      root,
      '.agent-vault/02_Phases/Phase_01_Foundation/Steps/Step_02_Configuration.md',
      stepNote('STEP-01-02', 'in-progress', 'SESSION-STEP'),
    );
    await writeNote(
      root,
      '.agent-vault/05_Sessions/2026-04-20-010000-step-session.md',
      sessionNote('SESSION-STEP'),
    );

    const result = await vaultResume({ session: 'SESSION-STEP' });

    expect(result?.continuationTarget?.type).toBe('step');
    expect(result?.continuationTarget?.description).toContain('Step_02_Configuration');
  });

  it('selects the newest hyphenated session filename when no session id is provided', async () => {
    const root = await createResumeVault();
    process.chdir(root);

    await writeNote(root, '.agent-vault/02_Phases/Phase_01_Foundation/Phase.md', phaseNote());
    await writeNote(
      root,
      '.agent-vault/02_Phases/Phase_01_Foundation/Steps/Step_01_Older.md',
      stepNote('STEP-01-01', 'in-progress', 'SESSION-OLDER'),
    );
    await writeNote(
      root,
      '.agent-vault/02_Phases/Phase_01_Foundation/Steps/Step_02_Newer.md',
      stepNote('STEP-01-02', 'in-progress', 'SESSION-NEWER'),
    );
    // Create files with explicit timestamp names - locatePreviousSession sorts by filename timestamp
    await writeNote(
      root,
      '.agent-vault/05_Sessions/2026-04-20-010000-older-session.md',
      sessionNote('SESSION-OLDER'),
    );
    await writeNote(
      root,
      '.agent-vault/05_Sessions/2026-04-20-020000-newer-session.md',
      sessionNote('SESSION-NEWER'),
    );

    // No ESM-namespace spy needed - real fs + timestamp sort gives correct newest-first order
    const result = await vaultResume();

    expect(result?.continuationTarget?.type).toBe('step');
    expect(result?.continuationTarget?.description).toContain('Step_02_Newer');
  });
});
