import { LEAD_NAMES } from './leads.js';

// Reads numbers back out of the noise-free signal, not from the model parameters, so the
// check panel tests what the picture actually shows.
export function measure(sig) {
  const fs = sig.fs;
  const beats = sig.sched.ventricular.filter((b) => b.t > 1 && b.t + 0.6 < sig.duration);
  const D = sig.morph.qrs;
  const rrs = [];
  const all = sig.sched.ventricular;
  for (let i = 1; i < all.length; i++) {
    if (all[i].t > 0 && all[i].t < sig.duration) rrs.push(all[i].t - all[i - 1].t);
  }
  const hr = rrs.length ? 60 / (rrs.reduce((a, b) => a + b, 0) / rrs.length) : null;

  const perLead = LEAD_NAMES.map((name, k) => {
    const rows = beats.map((b) => {
      const s = sig.clean[k];
      const i0 = Math.round((b.t - 0.012) * fs);
      const base = s[i0];
      const a = Math.round(b.t * fs);
      const e = Math.round((b.t + D) * fs);
      let mx = -1e9;
      let mn = 1e9;
      let area = 0;
      for (let i = a; i <= e; i++) {
        const v = s[i] - base;
        if (v > mx) mx = v;
        if (v < mn) mn = v;
        area += v / fs;
      }
      const jIdx = Math.round((b.t + 1.02 * D + 0.06) * fs);
      const st = s[jIdx] - base;
      const tw0 = Math.round((b.t + D + 0.05) * fs);
      const tw1 = Math.round((b.t + 0.7 * (b.rr ? sig.morph.qtc * Math.cbrt(b.rr) : 0.4) + 0.12) * fs);
      let tPeak = 0;
      for (let i = tw0; i <= Math.min(tw1, s.length - 1); i++) {
        const v = s[i] - base;
        if (Math.abs(v) > Math.abs(tPeak)) tPeak = v;
      }
      return { r: Math.max(0, mx), s: Math.min(0, mn), area, st, t: tPeak };
    });
    const med = (key) => {
      const v = rows.map((r) => r[key]).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : 0;
    };
    return { name, r: med('r'), s: med('s'), area: med('area'), st: med('st'), t: med('t') };
  });

  const i1 = perLead[0].area;
  const aVF = perLead[5].area;
  const axis = Math.round((Math.atan2(aVF, i1) * 180) / Math.PI);
  return { hr: hr ? Math.round(hr) : null, axis, perLead, qrsMs: Math.round(D * 1000) };
}

// Broad adult reference ranges for a plausibility check. This shows whether a simulated
// normal ECG falls into the range of real ones, it does not prove realism on its own.
export const NORMAL_RANGES = {
  axis: [-30, 90],
  rV1: [0, 0.7],
  sV1: [-2.0, 0],
  rV5: [0.4, 2.6],
  rI: [0.2, 1.5],
};
