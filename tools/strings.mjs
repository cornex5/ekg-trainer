// Lists German source strings that are used in the UI code and have no English entry yet.
import { readFileSync, readdirSync } from 'node:fs';
import { EN } from '../src/en.js';

const files = ['app.js', ...readdirSync('src').filter((f) => f.endsWith('.js') && !f.startsWith('en')).map((f) => 'src/' + f), 'index.html'];
const found = new Map();
const add = (s, f) => {
  s = s.replace(/\\'/g, "'");
  if (!found.has(s)) found.set(s, f);
};
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // t('...') and t(cond ? '...' : '...')
  for (const m of src.matchAll(/\bt\(((?:[^()]|\([^()]*\))*?)(?:,\s*\{[^}]*\})?\)/g)) {
    for (const q of m[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) add(q[1] ?? q[2], f);
  }
  for (const m of src.matchAll(/data-t="([^"]*)"/g)) add(m[1], f);
  for (const m of src.matchAll(/data-t-attr="([^"]*)"/g)) for (const p of m[1].split('|')) add(p.slice(p.indexOf(':') + 1), f);
}
let missing = 0;
for (const [s, f] of found) {
  if (EN[s] === undefined) {
    missing++;
    console.log(f + '\t' + s);
  }
}
console.error(`${found.size} strings found, ${missing} without English`);
