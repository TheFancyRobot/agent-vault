import { runLocalE2E } from './e2e-local-shared.js';

await runLocalE2E({
  cliArgs: process.argv.slice(2),
  tempRootName: 'agent-vault-e2e-uninstall',
  uninstallAfterInstall: true,
  successLabel: 'Local uninstall E2E completed successfully.',
});
