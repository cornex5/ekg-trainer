// Building blocks: waves as vectors in time. Units are mV for amplitudes, seconds for time.
export function newVec(n) {
  return { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n) };
}

function addGauss(H, fs, c, s1, s2, v) {
  const n = H.x.length;
  const lo = Math.max(0, Math.floor((c - 6 * s1) * fs));
  const hi = Math.min(n - 1, Math.ceil((c + 6 * s2) * fs));
  for (let i = lo; i <= hi; i++) {
    const d = i / fs - c;
    const s = d < 0 ? s1 : s2;
    const g = Math.exp((-0.5 * d * d) / (s * s));
    H.x[i] += v[0] * g;
    H.y[i] += v[1] * g;
    H.z[i] += v[2] * g;
  }
}

const sig = (u) => 1 / (1 + Math.exp(-u));

function addPlateau(H, fs, ts, te, e1, e2, v) {
  const n = H.x.length;
  const lo = Math.max(0, Math.floor((ts - 8 * e1) * fs));
  const hi = Math.min(n - 1, Math.ceil((te + 8 * e2) * fs));
  for (let i = lo; i <= hi; i++) {
    const t = i / fs;
    const g = sig((t - ts) / e1) * (1 - sig((t - te) / e2));
    H.x[i] += v[0] * g;
    H.y[i] += v[1] * g;
    H.z[i] += v[2] * g;
  }
}

export const NORMAL_MORPH = {
  qrs: 0.09,
  qtc: 0.41,
  p1: [0.06, 0.11, 0.04],
  p2: [0.03, 0.02, -0.045],
  q: [-0.221, 0.037, 0.267],
  r: [0.902, 0.371, 0.318],
  s: [0.145, 0.434, -0.722],
  t: [0.149, 0.169, 0.323],
  st: [-0.031, -0.008, 0.097],
  extraQ: null,
};

const scaleV = (v, k) => [v[0] * k, v[1] * k, v[2] * k];

export function addAtrial(H, fs, tOnset, m, retro = false) {
  const k = m.pScale ?? 1;
  if (retro) {
    // retrograde atrial activation runs upward, so the P wave is inverted in the inferior leads
    addGauss(H, fs, tOnset + 0.03, 0.02, 0.02, [-0.05, -0.1, -0.04]);
    return;
  }
  addGauss(H, fs, tOnset + 0.04, 0.022, 0.022, scaleV(m.p1, k));
  addGauss(H, fs, tOnset + 0.068, 0.018, 0.018, scaleV(m.p2, k));
  // atrial repolarization opposes the P wave and produces the PR depression of pericarditis
  if (m.prDepress) addGauss(H, fs, tOnset + 0.12, 0.05, 0.05, scaleV(m.p1, -m.prDepress));
}

// Flutter waves: slow descent, abrupt return, so they form a sawtooth in the inferior leads.
export function addFlutter(H, fs, duration, cycle, v) {
  for (let t = -cycle; t < duration + cycle; t += cycle) {
    addGauss(H, fs, t + 0.65 * cycle, 0.3 * cycle, 0.06 * cycle, v);
  }
}

// t0 is QRS onset. Fridericia correction ties QT to the preceding RR.
export function addVentricular(H, fs, t0, rr, m, ampScale = 1) {
  const D = m.qrs;
  const qt = m.qt ?? m.qtc * Math.cbrt(rr);
  const sc = (v) => [v[0] * ampScale, v[1] * ampScale, v[2] * ampScale];
  addGauss(H, fs, t0 + 0.14 * D, 0.085 * D, 0.085 * D, sc(m.q));
  if (m.broad) {
    // A conduction delay smears the activation front, so the main deflection is a blunt,
    // slightly notched hump instead of one narrow spike.
    addGauss(H, fs, t0 + 0.28 * D, 0.17 * D, 0.17 * D, sc(m.r.map((x) => x * 0.6)));
    addGauss(H, fs, t0 + 0.66 * D, 0.17 * D, 0.17 * D, sc(m.r.map((x) => x * 0.56)));
  } else {
    addGauss(H, fs, t0 + 0.4 * D, 0.15 * D, 0.15 * D, sc(m.r));
  }
  addGauss(H, fs, t0 + 0.68 * D, 0.115 * D, 0.115 * D, sc(m.s));
  if (m.extraQ) addGauss(H, fs, t0 + 0.12 * D, 0.1 * D, 0.1 * D, m.extraQ);
  // terminal delay, e.g. the late anterior-right force of a right bundle branch block
  if (m.late) addGauss(H, fs, t0 + 0.84 * D, 0.12 * D, 0.12 * D, sc(m.late));
  // pre-excitation: slurred early upstroke before the normal onset
  if (m.delta) addGauss(H, fs, t0 + m.delta.c, m.delta.s, m.delta.s, m.delta.v);

  const j = t0 + 1.02 * D;
  const tc = t0 + 0.7 * qt;
  const tw = m.tWidth ?? 1;
  addPlateau(H, fs, j, tc - 0.02, 0.008, 0.05, m.st);
  addGauss(H, fs, tc, 0.135 * qt * tw, 0.095 * qt * tw, m.t);
  if (m.u) addGauss(H, fs, t0 + qt + 0.09, 0.04, 0.05, m.u);
}

// Fibrillatory waves: several drifting oscillators with a bias toward the anterior axis,
// so they read largest in V1 and visibly smaller in the limb leads.
export function addFibrillation(H, fs, duration, rng, amp, o = {}) {
  const comps = [];
  const bias = o.bias ?? [0.25, 0.4, 0.9];
  const fLo = o.fLo ?? 4.2;
  const fSpan = o.fSpan ?? 3.6;
  for (let k = 0; k < (o.count ?? 5); k++) {
    const dir = [0, 0, 0].map((_, i) => bias[i] * (0.6 + 0.8 * rng()) * (i === 2 || rng() > 0.25 ? 1 : -1));
    comps.push({
      f: fLo + fSpan * rng(),
      ph: 6.28 * rng(),
      mod: (o.modLo ?? 0.15) + (o.modSpan ?? 0.35) * rng(),
      modPh: 6.28 * rng(),
      am: 0.6 + 0.8 * rng(),
      amF: 0.1 + 0.25 * rng(),
      amPh: 6.28 * rng(),
      dir,
    });
  }
  const n = H.x.length;
  const norm = amp / Math.sqrt(comps.length);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    for (const c of comps) {
      const env = 0.55 + 0.45 * Math.sin(6.28 * c.amF * t + c.amPh);
      const val = norm * c.am * env * Math.sin(6.28 * c.f * t + c.ph + (o.fm ?? 0.8) * Math.sin(6.28 * c.mod * t + c.modPh) + (o.fm2 ?? 0) * Math.sin(6.28 * c.mod * 2.7 * t + c.modPh * 1.7));
      H.x[i] += val * c.dir[0];
      H.y[i] += val * c.dir[1];
      H.z[i] += val * c.dir[2];
    }
  }
}
