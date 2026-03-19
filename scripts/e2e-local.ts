import { runLocalE2E } from './e2e-local-shared.js';

await runLocalE2E({
  cliArgs: process.argv.slice(2),
  tempRootName: 'agent-vault-e2e-local',
  uninstallAfterInstall: false,
  successLabel: 'Local install E2E completed successfully.',
});
