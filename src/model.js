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
  q: [-0.12, 0.08, 0.25],
  r: [1.15, 1.0, -0.42],
  s: [-0.15, -0.35, -0.22],
  t: [0.3, 0.26, -0.04],
  st: [0, 0, 0],
  extraQ: null,
};

export function addAtrial(H, fs, tOnset, m) {
  addGauss(H, fs, tOnset + 0.04, 0.022, 0.022, m.p1);
  addGauss(H, fs, tOnset + 0.068, 0.018, 0.018, m.p2);
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

  const j = t0 + 1.02 * D;
  const tc = t0 + 0.7 * qt;
  addPlateau(H, fs, j, tc - 0.02, 0.008, 0.05, m.st);
  addGauss(H, fs, tc, 0.135 * qt, 0.095 * qt, m.t);
}

// Fibrillatory waves: several drifting oscillators with a bias toward the anterior axis,
// so they read largest in V1 and visibly smaller in the limb leads.
export function addFibrillation(H, fs, duration, rng, amp) {
  const comps = [];
  const bias = [0.25, 0.4, 0.9];
  for (let k = 0; k < 5; k++) {
    const dir = [0, 0, 0].map((_, i) => bias[i] * (0.6 + 0.8 * rng()) * (i === 2 || rng() > 0.25 ? 1 : -1));
    comps.push({
      f: 4.2 + 3.6 * rng(),
      ph: 6.28 * rng(),
      mod: 0.15 + 0.35 * rng(),
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
      const val = norm * c.am * env * Math.sin(6.28 * c.f * t + c.ph + 0.8 * Math.sin(6.28 * c.mod * t + c.modPh));
      H.x[i] += val * c.dir[0];
      H.y[i] += val * c.dir[1];
      H.z[i] += val * c.dir[2];
    }
  }
}
