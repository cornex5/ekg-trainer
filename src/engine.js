import { mulberry32 } from './rng.js';
import { SCHEDULES } from './rhythms.js';
import { morphFor } from './pathology.js';
import { newVec, addAtrial, addVentricular, addFibrillation } from './model.js';
import { project, LEAD_NAMES } from './leads.js';
import { applyArtifacts } from './artifacts.js';

export const FS = 500;

export function generate(sc) {
  const duration = sc.duration ?? 10;
  const full = { ...sc, duration };
  const rng = mulberry32(sc.seed ?? 1);
  const sched = SCHEDULES[sc.rhythm](full, rng);
  const morph = morphFor(sc);
  const n = Math.round(duration * FS);
  const H = newVec(n);

  for (const a of sched.atrial) addAtrial(H, FS, a.t, morph);
  for (const v of sched.ventricular) {
    const amp = 1 + 0.04 * Math.sin(2 * Math.PI * 0.25 * v.t + 1.3);
    addVentricular(H, FS, v.t, v.rr, morph, amp);
  }
  if (sched.fibrillation) addFibrillation(H, FS, duration, rng, sc.fAmp ?? 0.1);

  const clean = project(H, n);
  const leads = applyArtifacts(clean, FS, sc.noise ?? 'low', rng);
  return { fs: FS, n, duration, names: LEAD_NAMES, leads, clean, sched, morph, scenario: sc };
}
