// Cheap self-check: every case renders deterministically with finite samples, then the site builds.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { generate } from '../src/engine.js';
import { SCENARIOS } from '../src/scenarios.js';

let failed = 0;
const fail = (msg) => {
  failed += 1;
  console.error('FAIL', msg);
};

for (const sc of SCENARIOS) {
  const a = generate(sc);
  const b = generate(sc);
  if (a.leads.length !== 12) fail(`${sc.id}: expected 12 leads, got ${a.leads.length}`);
  for (let l = 0; l < a.leads.length; l++) {
    const x = a.leads[l];
    const y = b.leads[l];
    if (x.length !== y.length) {
      fail(`${sc.id}: lead ${l} length differs between runs`);
      continue;
    }
    for (let i = 0; i < x.length; i++) {
      if (!Number.isFinite(x[i])) {
        fail(`${sc.id}: lead ${l} sample ${i} is not finite`);
        break;
      }
      if (x[i] !== y[i]) {
        fail(`${sc.id}: lead ${l} sample ${i} differs between runs`);
        break;
      }
    }
  }
}
console.log(`${SCENARIOS.length} cases checked`);

execFileSync(process.execPath, ['tools/bundle.mjs'], { stdio: 'inherit' });
for (const f of ['dist/index.html', 'dist/app/index.html']) {
  if (!existsSync(f)) fail(`${f} missing after build`);
}

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
