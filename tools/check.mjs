// Cheap self-check: every case renders deterministically with finite samples, then the site builds.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { generate } from '../src/engine.js';
import { SCENARIOS, CATEGORIES } from '../src/scenarios.js';
import { RHYTHMS, AXES, FINDINGS } from '../src/truth.js';
import { CONTEXT } from '../src/context.js';
import { ERRORS } from '../src/errors.js';
import { LIVE } from '../src/livescen.js';
import { STEPS } from '../src/wizard.js';
import { EN } from '../src/en.js';
import { LESSONS } from '../src/lessons.js';

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

// Every German source string of the data must have an English entry.
const need = new Set([...CATEGORIES, ...Object.values(CONTEXT), ...LIVE.map((l) => l.title)]);
for (const sc of SCENARIOS) {
  need.add(sc.title);
  sc.solution.forEach((x) => need.add(x));
}
RHYTHMS.forEach((r) => need.add(r[1]));
AXES.forEach((a) => need.add(a[1]));
Object.values(FINDINGS).forEach((f) => f.forEach((x) => need.add(x)));
ERRORS.forEach((e) => need.add(e[1]));
ERRORS.forEach((e) => need.add(e[2]));
STEPS.forEach((st) => {
  need.add(st.q);
  if (st.hint) need.add(st.hint);
  (st.opts || []).forEach((o) => need.add(o[1]));
});
for (const l of LESSONS) {
  need.add(l.title);
  for (const lvl of ['rs', 'notsan', 'arzt', 'experte']) {
    const v = l.levels[lvl];
    if (!v || v.length !== 5) fail(`lesson ${l.id}/${lvl}: expected 5 texts`);
    else v.forEach((x) => need.add(x));
  }
  for (const id of l.examples) if (!SCENARIOS.some((sc) => sc.id === id)) fail(`lesson ${l.id}: unknown example ${id}`);
  if (l.cat !== null && !CATEGORIES[l.cat]) fail(`lesson ${l.id}: unknown category ${l.cat}`);
}
console.log(`${LESSONS.length} lessons checked`);
const gaps = [...need].filter((x) => EN[x] === undefined);
gaps.forEach((x) => fail(`no English text for: ${x}`));
console.log(`${need.size} data strings, ${gaps.length} without English`);

execFileSync(process.execPath, ['tools/bundle.mjs'], { stdio: 'inherit' });
for (const f of ['dist/index.html', 'dist/app/index.html']) {
  if (!existsSync(f)) fail(`${f} missing after build`);
}

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all checks passed');
