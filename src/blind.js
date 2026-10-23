import { REAL } from './realdata.js';
import { generate } from './engine.js';
import { mulberry32 } from './rng.js';

function decodeReal(i) {
  const bin = atob(REAL[i]);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  const dv = new DataView(bytes.buffer);
  const leads = [];
  for (let l = 0; l < 12; l++) {
    const s = new Float32Array(1000);
    for (let k = 0; k < 1000; k++) s[k] = dv.getInt16((l * 1000 + k) * 2, true) / 1000;
    leads.push(s);
  }
  return { fs: 100, n: 1000, duration: 10, leads };
}

// Simulated normal ECG brought to the same sampling rate as the real recordings,
// so that line density does not give it away.
function decodeSim(seed) {
  const r = mulberry32(seed);
  const hr = Math.round(50 + 42 * r());
  const sig = generate({ rhythm: 'sinus', hr, seed, noise: 'low', duration: 10 });
  const leads = sig.leads.map((s) => {
    const o = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) {
      let a = 0;
      for (let j = 0; j < 5; j++) a += s[i * 5 + j];
      o[i] = a / 5;
    }
    return o;
  });
  return { fs: 100, n: 1000, duration: 10, leads };
}

// 10 real and 10 simulated, random order. Nothing in the list says which is which until reveal.
export function makeBlindSet(count = 20) {
  const half = count / 2;
  const ids = REAL.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, half);
  const items = ids.map((i) => ({ real: true, make: () => decodeReal(i) }));
  for (let k = 0; k < half; k++) {
    const seed = 5000 + Math.floor(Math.random() * 90000);
    items.push({ real: false, make: () => decodeSim(seed) });
  }
  return items.sort(() => Math.random() - 0.5);
}
