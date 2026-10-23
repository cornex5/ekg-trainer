import { gaussian } from './rng.js';

const LEVELS = {
  none: { wander: 0, mains: 0, emg: 0, step: 0 },
  low: { wander: 0.05, mains: 0.004, emg: 0.006, step: 0 },
  medium: { wander: 0.12, mains: 0.012, emg: 0.02, step: 0 },
  high: { wander: 0.25, mains: 0.03, emg: 0.05, step: 0.15 },
};

// Noise is added after projection per lead, like it reaches the electrodes: wander and
// mains are mostly shared, muscle noise differs per lead.
export function applyArtifacts(leads, fs, level, rng) {
  const L = LEVELS[level] ?? LEVELS.none;
  if (level === 'none' || !LEVELS[level]) return leads.map((s) => Float32Array.from(s));
  const n = leads[0].length;
  const respF = 0.2 + 0.1 * rng();
  const respPh = 6.28 * rng();
  const slowF = 0.05 + 0.05 * rng();
  const slowPh = 6.28 * rng();
  const mainsPh = 6.28 * rng();
  const stepAt = L.step > 0 ? Math.floor(n * (0.3 + 0.4 * rng())) : -1;
  return leads.map((s, k) => {
    const out = new Float32Array(n);
    const gw = 0.7 + 0.6 * rng();
    const gm = 0.5 + rng();
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const t = i / fs;
      const wander = L.wander * gw * (0.7 * Math.sin(6.28 * respF * t + respPh) + 0.5 * Math.sin(6.28 * slowF * t + slowPh));
      const mains = L.mains * gm * Math.sin(6.28 * 50 * t + mainsPh + k * 0.3);
      const white = gaussian(rng);
      prev = 0.55 * prev + 0.45 * white;
      const emg = L.emg * prev * 1.6;
      const step = stepAt >= 0 && i > stepAt ? L.step * gw : 0;
      out[i] = s[i] + wander + mains + emg + step;
    }
    return out;
  });
}
