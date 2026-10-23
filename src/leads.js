// Heart vector frame: x = patient left, y = inferior (feet), z = anterior.
// Every lead is a fixed vector, the lead signal is the dot product with the heart vector.
// Using one shared vector for all leads keeps the 12 leads consistent with each other.
export const LEAD_NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

const frontal = [
  [1, 0, 0],
  [0.5, 0.8660254, 0],
  [-0.5, 0.8660254, 0],
  [-0.8660254, -0.5, 0],
  [0.8660254, -0.5, 0],
  [0, 1, 0],
];

// angle from anterior toward left in degrees, y share, gain (closer electrodes read larger)
const chest = [
  [-40, -0.15, 0.85],
  [-10, -0.12, 1.4],
  [25, -0.05, 1.5],
  [50, 0.0, 1.5],
  [70, 0.08, 1.3],
  [88, 0.12, 1.1],
];

export const LEAD_VECTORS = frontal.concat(
  chest.map(([deg, y, g]) => {
    const a = (deg * Math.PI) / 180;
    return [g * Math.sin(a), y, g * Math.cos(a)];
  }),
);

export function project(H, n) {
  const out = [];
  for (const lv of LEAD_VECTORS) {
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = lv[0] * H.x[i] + lv[1] * H.y[i] + lv[2] * H.z[i];
    out.push(s);
  }
  return out;
}
