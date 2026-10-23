import { mulberry32 } from './rng.js';
import { SCHEDULES } from './rhythms.js';
import { morphFor, pvcMorphFor } from './pathology.js';
import { newVec, addAtrial, addVentricular, addFibrillation, addFlutter } from './model.js';
import { project, LEAD_NAMES } from './leads.js';
import { applyArtifacts } from './artifacts.js';

export const FS = 500;

export function generate(sc) {
  const duration = sc.duration ?? 10;
  const full = { ...sc, duration };
  const rng = mulberry32(sc.seed ?? 1);
  const sched = SCHEDULES[sc.rhythm](full, rng);
  const morph = morphFor(sc);
  const morphs = { base: morph };
  if (sc.pvc) morphs.pvc = pvcMorphFor(sc);
  const n = Math.round(duration * FS);
  const H = newVec(n);

  for (const a of sched.atrial) {
    if (sc.noP) continue;
    addAtrial(H, FS, a.t, morph, a.retro);
  }
  for (const v of sched.ventricular) {
    const amp = 1 + 0.04 * Math.sin(2 * Math.PI * 0.25 * v.t + 1.3);
    addVentricular(H, FS, v.t, v.rr, morphs[v.morph ?? 'base'], amp);
  }
  if (sched.fibrillation) addFibrillation(H, FS, duration, rng, sc.fAmp ?? 0.1);
  if (sched.flutter) addFlutter(H, FS, duration, sched.flutter.cycle, sc.flutterV ?? [0.0, -0.2, 0.12]);
  if (sched.vf) {
    // coarse VF: irregular, fast, large, amplitude sagging over time like a dying rhythm
    addFibrillation(H, FS, duration, rng, sc.vfAmp ?? 1.1, { bias: [0.8, 0.9, 0.7], fLo: 3.2, fSpan: 3.4, count: 9, fm: 3.2, fm2: 1.6, modLo: 0.25, modSpan: 0.9 });
  }

  const clean = project(H, n);
  const leads = applyArtifacts(clean, FS, sc.noise ?? 'low', rng);
  return { fs: FS, n, duration, names: LEAD_NAMES, leads, clean, sched, morph, scenario: sc };
}
