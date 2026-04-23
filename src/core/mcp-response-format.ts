import { encode } from '@toon-format/toon';
import type { VaultConfig } from './vault-config';
import type { InitResult } from '../scaffold/init';
import type { ScanResult } from '../scaffold/scan';

const pruneForToon = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const next = value
      .map((item) => pruneForToon(item))
      .filter((item) => item !== undefined);
    return next.length > 0 ? next : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, pruneForToon(item)] as const)
      .filter(([, item]) => item !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return value;
};

const encodePruned = (value: unknown): string =>
  encode(pruneForToon(value) ?? {}, { delimiter: '\t', keyFolding: 'safe' });

export const formatScanResultAsToon = (result: ScanResult): string =>
  encodePruned(result);

export const formatInitResultAsToon = (result: InitResult, config: VaultConfig): string =>
  encodePruned({
    vaultRoot: result.vaultRoot,
    created: result.created,
    filesWritten: result.filesWritten,
    config,
    scan: result.scan,
    ...(result.planningBackfill?.found ? { planningBackfill: result.planningBackfill } : {}),
    ...(result.codeGraph ? { codeGraph: result.codeGraph } : {}),
    ...(result.codeGraphWarning ? { codeGraphWarning: result.codeGraphWarning } : {}),
  });

export const formatVaultConfigAsToon = (config: VaultConfig): string =>
  encodePruned(config);
