import { writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { generate } from '../src/engine.js';
import { paperSvg, monitorSvg } from '../src/render.js';
import { SCENARIOS } from '../src/scenarios.js';
import { measure } from '../src/measure.js';

const outDir = process.argv[2] ?? 'out';
mkdirSync(outDir, { recursive: true });
const only = process.argv[3];

for (const sc of SCENARIOS) {
  if (only && sc.id !== only) continue;
  const sig = generate(sc);
  const m = measure(sig);
  const svg = paperSvg(sig);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1700 } }).render().asPng();
  writeFileSync(`${outDir}/${sc.id}.png`, png);
  const mon = monitorSvg(sig, { hr: m.hr });
  writeFileSync(`${outDir}/${sc.id}-monitor.png`, new Resvg(mon).render().asPng());
  console.log(sc.id, 'hr', m.hr, 'axis', m.axis);
}
