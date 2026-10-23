import { NORMAL_MORPH } from './model.js';
import { mulberry32, gaussian } from './rng.js';

// ST vector direction per infarct territory. The reciprocal changes in the opposite leads
// come out of the projection by themselves, nothing is drawn per lead by hand.
const TERRITORY = {
  inferior: [-0.1, 0.9, 0.0],
  anterior: [0.45, -0.35, 0.8],
  lateral: [0.75, -0.45, -0.05],
  posterior: [-0.05, 0.1, -0.75],
};

const scale = (v, k) => v.map((x) => x * k);
const add = (a, b) => a.map((x, i) => x + b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => scale(v, 1 / Math.hypot(...v));

function applyStemi(m, { territory, stage = 'acute', severity = 0.3 }) {
  const dir = TERRITORY[territory];
  const u = unit(dir);
  if (stage === 'hyperacute') {
    m.st = scale(dir, severity * 0.35);
    m.t = add(m.t, scale(dir, severity * 1.5));
  } else if (stage === 'acute') {
    m.st = scale(dir, severity);
    m.t = add(m.t, scale(dir, severity * 0.5));
  } else if (stage === 'subacute') {
    m.st = scale(dir, severity * 0.35);
    m.t = add(m.t, scale(dir, -severity * 2.2));
    qLoss(m, u, 0.4);
  } else if (stage === 'old') {
    m.t = add(m.t, scale(dir, -severity * 0.8));
    qLoss(m, u, 0.5);
  }
}

// Dead myocardium stops contributing, so the forces point away from the territory.
function qLoss(m, u, k) {
  m.extraQ = scale(u, -0.55 * k);
  const proj = dot(m.r, u);
  if (proj > 0) m.r = add(m.r, scale(u, -proj * 0.45 * k));
}

export const ESCAPE_MORPHS = {
  junctional: { qrs: 0.09 },
  // wide, LBBB-like: no septal q, large late left forces, discordant T
  ventricular: {
    qrs: 0.15,
    broad: true,
    q: [0, 0, 0.08],
    r: [1.3, 0.35, -0.95],
    s: [0, 0, 0],
    t: [-0.5, -0.15, 0.32],
  },
  // monomorphic VT: wide, superior axis, T merged into the next complex
  vt: {
    qrs: 0.16,
    broad: true,
    q: [0, 0, 0],
    r: [1.0, -1.1, -0.55],
    s: [0, 0, 0],
    t: [-0.35, 0.45, 0.2],
  },
};

// Focal PVC shapes. Wide, large, T discordant to the main deflection.
export const PVC_MORPHS = {
  lv: {
    qrs: 0.14,
    broad: true,
    q: [0, 0, 0],
    r: [-0.9, 0.9, 0.7],
    s: [0, 0, 0],
    t: [0.55, -0.5, -0.4],
  },
  rvot: {
    qrs: 0.14,
    broad: true,
    q: [0, 0, 0],
    r: [0.9, 1.05, -0.8],
    s: [0, 0, 0],
    t: [-0.5, -0.55, 0.4],
  },
};

// Each finding is a function that edits the base complex. They stack, so a case can
// carry e.g. LVH with strain plus a long QT.
const FINDINGS = {
  lbbb(m) {
    Object.assign(m, structuredClone(ESCAPE_MORPHS.ventricular));
  },
  rbbb(m) {
    m.qrs = 0.13;
    m.late = [-0.6, 0.0, 1.0];
    m.s = [-0.5, -0.15, -0.1];
    m.t = [-0.05, 0.25, -0.35];
  },
  lahb(m) {
    m.q = [-0.1, 0.22, 0.1];
    m.r = [0.85, -0.8, -0.3];
    m.s = [-0.1, -0.1, -0.2];
    m.t = [0.18, -0.05, 0.0];
  },
  lvh(m, o) {
    const k = o.k ?? 1.8;
    m.r = scale(m.r, k);
    m.s = scale(m.s, k * 0.9);
    m.qrs = 0.1;
    m.st = scale(unit(m.r), -0.12);
    m.t = scale(unit(m.r), -0.5);
  },
  hyperk(m, o) {
    const sev = o.severity ?? 1;
    m.t = scale(m.t, 2.3);
    m.tWidth = 0.62;
    if (sev >= 2) {
      m.pScale = 0.35;
      m.qrs = 0.12;
    }
    if (sev >= 3) {
      m.pScale = 0;
      m.qrs = 0.17;
      m.broad = true;
      m.t = scale(m.t, 1.1);
      m.tWidth = 0.9;
    }
  },
  hypok(m, o) {
    const sev = o.severity ?? 1;
    m.t = scale(m.t, 0.35);
    m.st = scale(unit(m.r), -0.06 * sev);
    m.u = scale(m.t.map((x) => Math.abs(x) + 0.05), 2.4);
    m.u = [0.18, 0.2, 0.05];
  },
  pericarditis(m, o) {
    const dir = [0.55, 0.6, 0.3];
    m.st = scale(dir, o.severity ?? 0.2);
    m.prDepress = 0.6;
  },
  wpw(m) {
    m.qrs = 0.12;
    m.delta = { c: -0.035, s: 0.022, v: [0.5, 0.25, 0.15] };
    m.t = [0.05, 0.12, -0.15];
  },
  longqt(m, o) {
    m.qtc = o.qtc ?? 0.52;
    m.tWidth = 1.05;
  },
  pe(m) {
    m.q = [0.35, -0.35, 0];
    m.s = [-0.6, 0.2, -0.12];
    m.t = [0.2, 0.15, -0.35];
  },
  brugada(m) {
    m.late = [-0.15, 0, 0.45];
    m.st = [-0.1, -0.05, 0.3];
    m.t = [0.05, 0.05, -0.32];
  },
  wellens(m) {
    // anterior only: V2 and V3 turn negative, the lateral leads stay upright
    m.t = add(m.t, [-0.02, -0.08, -0.85]);
  },
  digoxin(m) {
    m.st = scale(unit(m.r), -0.15);
    m.qtc = 0.36;
    m.t = scale(m.t, 0.5);
  },
};

// Real hearts differ in size, position and chest wall. Spreads are taken from the width of
// the normal ECGs in PTB-XL (axis sd about 25 degrees, QRS amplitude sd about 0.3 in log terms).
// Findings that define the axis (hemiblock, bundle branch blocks) get amplitude spread only.
function individual(m, sc, fixedAxis) {
  const rng = mulberry32((sc.seed ?? 1) * 7919 + 13);
  const g = () => gaussian(rng);
  const clamp = (x) => Math.min(1.5, Math.max(0.67, x));
  const kq = clamp(Math.exp((fixedAxis ? 0.15 : 0.28) * g()));
  const kz = clamp(Math.exp((fixedAxis ? 0.12 : 0.25) * g()));
  const kt = clamp(Math.exp(0.25 * g()));
  const th = fixedAxis ? 0 : ((24 * g()) * Math.PI) / 180;
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
  for (const k of ['q', 'r', 's']) {
    const v = rot(m[k], th);
    m[k] = [v[0] * kq, v[1] * kq, v[2] * kq * kz];
  }
  const tv = rot(m.t, th * 0.5);
  m.t = [tv[0] * kt, tv[1] * kt, tv[2] * kt];
}

export function morphFor(sc) {
  const m = structuredClone(NORMAL_MORPH);
  if (sc.escape) Object.assign(m, structuredClone(ESCAPE_MORPHS[sc.escape]));
  for (const f of sc.findings ?? []) {
    const [id, opts] = Array.isArray(f) ? f : [f, {}];
    FINDINGS[id](m, opts);
  }
  if (sc.stemi) applyStemi(m, sc.stemi);
  if (sc.indiv !== false) {
    const ids = (sc.findings ?? []).map((f) => (Array.isArray(f) ? f[0] : f));
    const fixed = !!sc.escape || ids.some((i) => ['lahb', 'lbbb', 'rbbb', 'wpw', 'brugada'].includes(i));
    individual(m, sc, fixed);
  }
  if (sc.qtc && !sc.findings?.some((f) => (Array.isArray(f) ? f[0] : f) === 'longqt')) m.qtc = sc.qtc;
  return m;
}

export function pvcMorphFor(sc) {
  const base = structuredClone(NORMAL_MORPH);
  return Object.assign(base, structuredClone(PVC_MORPHS[sc.pvc?.shape ?? 'lv']));
}
