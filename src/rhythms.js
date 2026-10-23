import { gaussian } from './rng.js';

// A schedule is the conduction layer: when the atria fire (P onset), when the ventricles
// are depolarized (QRS onset) and the RR interval each beat sits in.
export function sinusSchedule(sc, rng) {
  const out = { atrial: [], ventricular: [] };
  const base = 60 / sc.hr;
  const pr = sc.pr ?? 0.16;
  const rsa = sc.rsa ?? 0.04;
  let t = -1.2;
  while (t < sc.duration + 1.5) {
    const rr = base * (1 + rsa * Math.sin(2 * Math.PI * 0.25 * t + 0.7) + 0.012 * gaussian(rng));
    out.atrial.push({ t });
    out.ventricular.push({ t: t + pr, rr });
    t += rr;
  }
  return out;
}

export function afSchedule(sc, rng) {
  const out = { atrial: [], ventricular: [], fibrillation: true };
  const mean = 60 / sc.hr;
  const cv = sc.cv ?? 0.22;
  let t = -1.0;
  while (t < sc.duration + 1.5) {
    let rr;
    do {
      rr = mean * Math.exp(cv * gaussian(rng) - (cv * cv) / 2);
    } while (rr < 0.26);
    out.ventricular.push({ t, rr });
    t += rr;
  }
  return out;
}

// Complete AV dissociation: atria and ventricles run on their own clocks.
export function avBlock3Schedule(sc, rng) {
  const out = { atrial: [], ventricular: [] };
  const pp = 60 / sc.atrialRate;
  let t = -1.0 * rng();
  while (t < sc.duration + 1.5) {
    out.atrial.push({ t });
    t += pp * (1 + 0.012 * gaussian(rng));
  }
  const rr0 = 60 / sc.escapeRate;
  t = -rr0 * rng();
  while (t < sc.duration + 1.5) {
    const rr = rr0 * (1 + 0.02 * gaussian(rng));
    out.ventricular.push({ t, rr });
    t += rr;
  }
  return out;
}

export const SCHEDULES = {
  sinus: sinusSchedule,
  af: afSchedule,
  avblock3: avBlock3Schedule,
};
