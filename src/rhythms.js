import { gaussian } from './rng.js';

// A schedule is the conduction layer: when the atria fire (P onset), when the ventricles
// are depolarized (QRS onset) and the RR interval each beat sits in.
// Events may carry a morph key (e.g. 'pvc') that selects a different complex shape.

function fillRR(events) {
  for (let i = 0; i < events.length; i++) {
    events[i].rr = i > 0 ? events[i].t - events[i - 1].t : events[i].rr ?? 0.8;
  }
}

export function sinusSchedule(sc, rng) {
  const out = { atrial: [], ventricular: [] };
  const base = 60 / sc.hr;
  const pr = sc.pr ?? 0.16;
  const rsa = sc.rsa ?? 0.04;
  let t = -1.2;
  let k = 0;
  while (t < sc.duration + 1.5) {
    const rr = base * (1 + rsa * Math.sin(2 * Math.PI * 0.25 * t + 0.7) + 0.012 * gaussian(rng));
    out.atrial.push({ t });
    const ppvc = sc.pvc;
    let isPvc = false;
    if (ppvc && t > -0.5) {
      if (ppvc.pattern === 'bigeminy') isPvc = k % 2 === 1;
      else if (ppvc.pattern === 'trigeminy') isPvc = k % 3 === 2;
      else isPvc = rng() < (ppvc.prob ?? 0.15);
    }
    if (isPvc) {
      // early beat: the PVC fires before the next sinus P can conduct, the sinus clock is unaffected
      out.ventricular.push({ t: t + pr - 0.3 * rr, rr, morph: 'pvc' });
    } else {
      out.ventricular.push({ t: t + pr, rr });
    }
    t += rr;
    k++;
  }
  out.ventricular.sort((a, b) => a.t - b.t);
  fillRR(out.ventricular);
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

// Second degree block. Wenckebach: PR grows until a beat drops. Mobitz II: fixed PR, sudden drop.
export function avBlock2Schedule(sc, rng) {
  const out = { atrial: [], ventricular: [] };
  const pp = 60 / sc.hr;
  const n = sc.ratio ?? 4;
  const wenck = sc.type !== 'mobitz2';
  const incs = [0, 0.1, 0.16, 0.2, 0.23, 0.25];
  const pr0 = sc.pr ?? 0.16;
  let t = -1.0;
  let k = 0;
  while (t < sc.duration + 1.5) {
    out.atrial.push({ t });
    const pos = k % n;
    if (pos !== n - 1) {
      const pr = wenck ? pr0 + incs[Math.min(pos, incs.length - 1)] : sc.pr ?? 0.2;
      out.ventricular.push({ t: t + pr });
    }
    t += pp * (1 + 0.01 * gaussian(rng));
    k++;
  }
  fillRR(out.ventricular);
  return out;
}

// Regular rhythms without an atrial driver in front: SVT, junctional, idioventricular, VT.
export function regularSchedule(sc, rng) {
  const out = { atrial: [], ventricular: [] };
  const rr0 = 60 / sc.hr;
  const cv = sc.cv ?? 0.008;
  let t = -rr0 * rng();
  while (t < sc.duration + 1.5) {
    const rr = rr0 * (1 + cv * gaussian(rng));
    out.ventricular.push({ t, rr });
    if (sc.retro) out.atrial.push({ t: t + sc.retro - 0.03, retro: true });
    t += rr;
  }
  return out;
}

// Atrial flutter with fixed or variable conduction.
export function flutterSchedule(sc, rng) {
  const out = { atrial: [], ventricular: [], flutter: { cycle: 60 / (sc.flutterRate ?? 300) } };
  const cyc = out.flutter.cycle;
  const ratio = sc.ratio ?? 4;
  let t = -1.0;
  let k = 0;
  let next = 0;
  while (t < sc.duration + 1.5) {
    if (k >= next) {
      const r = sc.variable ? [2, 3, 4, 4][Math.floor(rng() * 4)] : ratio;
      out.ventricular.push({ t: t + 0.14 });
      next = k + r;
    }
    t += cyc;
    k++;
  }
  fillRR(out.ventricular);
  return out;
}

export function asystoleSchedule() {
  return { atrial: [], ventricular: [] };
}

export function vfSchedule() {
  return { atrial: [], ventricular: [], vf: true };
}

export const SCHEDULES = {
  sinus: sinusSchedule,
  af: afSchedule,
  avblock3: avBlock3Schedule,
  avblock2: avBlock2Schedule,
  regular: regularSchedule,
  flutter: flutterSchedule,
  asystole: asystoleSchedule,
  vf: vfSchedule,
};
