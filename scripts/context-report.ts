import { cwd } from 'process';
import { resolve } from 'path';
import { formatContextFootprintReport, generateContextFootprintReport } from '../src/core/context-footprint';

const root = resolve(process.argv[2] ?? cwd());

const report = await generateContextFootprintReport(root);
console.log(formatContextFootprintReport(report));
