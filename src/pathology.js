import { NORMAL_MORPH } from './model.js';

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
};

export function morphFor(sc) {
  const m = structuredClone(NORMAL_MORPH);
  if (sc.rhythm === 'avblock3' && sc.escape) Object.assign(m, structuredClone(ESCAPE_MORPHS[sc.escape]));
  if (sc.stemi) applyStemi(m, sc.stemi);
  if (sc.qtc) m.qtc = sc.qtc;
  return m;
}
