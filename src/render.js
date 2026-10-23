import { LEAD_NAMES } from './leads.js';

const GRID_BG = '#fdf4f1';
const GRID_MINOR = '#f3c4c0';
const GRID_MAJOR = '#e58f8c';

function path(sig, k, i0, i1, x0, y0, mmPerSec, mmPerMv, fs, stride = 1) {
  const s = sig[k];
  let d = '';
  for (let i = i0; i < i1; i += stride) {
    const x = x0 + ((i - i0) / fs) * mmPerSec;
    const y = y0 - s[i] * mmPerMv;
    d += (i === i0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}

// Standard 3x4 layout plus a lead II rhythm strip. Units are millimetres, so 1 unit equals
// 1 mm of printed paper and the grid is exact at 25 mm/s and 10 mm/mV.
export function paperSvg(sig, o = {}) {
  const mmPerSec = o.speed ?? 25;
  const mmPerMv = o.gain ?? 10;
  const fs = sig.fs;
  const marginL = 16;
  const marginT = 16;
  const rowH = 32;
  const stripSec = sig.duration;
  const width = marginL + stripSec * mmPerSec + 6;
  const height = marginT + rowH * 4 + 6;
  const order = [
    [0, 3, 6, 9],
    [1, 4, 7, 10],
    [2, 5, 8, 11],
  ];
  const colSec = stripSec / 4;
  const rowY = (r) => marginT + rowH * (r + 0.58);
  const lines = [];

  lines.push(`<rect width="${width}" height="${height}" fill="${GRID_BG}"/>`);
  let g = '';
  for (let x = 0; x <= width; x += 1) {
    g += `M${x} 0V${height}`;
  }
  for (let y = 0; y <= height; y += 1) {
    g += `M0 ${y}H${width}`;
  }
  lines.push(`<path d="${g}" stroke="${GRID_MINOR}" stroke-width="0.12" fill="none"/>`);
  let gm = '';
  for (let x = 0; x <= width; x += 5) {
    gm += `M${x} 0V${height}`;
  }
  for (let y = 0; y <= height; y += 5) {
    gm += `M0 ${y}H${width}`;
  }
  lines.push(`<path d="${gm}" stroke="${GRID_MAJOR}" stroke-width="0.28" fill="none"/>`);

  const trace = [];
  const labels = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const k = order[r][c];
      const i0 = Math.round(c * colSec * fs);
      const i1 = Math.round((c + 1) * colSec * fs);
      const x0 = marginL + c * colSec * mmPerSec;
      trace.push(path(sig.leads, k, i0, i1, x0, rowY(r), mmPerSec, mmPerMv, fs));
      labels.push(`<text x="${(x0 + 1.2).toFixed(1)}" y="${(rowY(r) - 11.5).toFixed(1)}" font-size="3.6" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#1b1b1b">${LEAD_NAMES[k]}</text>`);
      if (c > 0) {
        trace.push(`M${x0.toFixed(2)} ${(rowY(r) - 2).toFixed(2)}V${(rowY(r) + 2).toFixed(2)}`);
      }
    }
  }
  trace.push(path(sig.leads, 1, 0, sig.n, marginL, rowY(3), mmPerSec, mmPerMv, fs));
  labels.push(`<text x="${marginL + 1.2}" y="${(rowY(3) - 11.5).toFixed(1)}" font-size="3.6" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#1b1b1b">II</text>`);

  // calibration pulse: 1 mV high, 0.2 s wide, at the start of every row
  for (let r = 0; r < 4; r++) {
    const y = rowY(r);
    const x = 3;
    const w = 0.2 * mmPerSec;
    trace.push(`M${x} ${y}H${x + 1}V${y - mmPerMv}H${x + 1 + w}V${y}H${x + 2 + w}`);
  }
  for (const mk of o.marks ?? []) {
    const x = marginL + mk.t0 * mmPerSec;
    const w = Math.max(0.4, (mk.t1 - mk.t0) * mmPerSec);
    const y = rowY(3);
    lines.push(`<rect x="${x.toFixed(2)}" y="${(y - 13).toFixed(1)}" width="${w.toFixed(2)}" height="26" fill="${mk.color}" fill-opacity="0.2"/>`);
    if (mk.label) lines.push(`<text x="${(x + w / 2).toFixed(2)}" y="${(y + (mk.low ? 17 : -14.5)).toFixed(1)}" text-anchor="middle" font-size="2.7" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${mk.color}">${mk.label}</text>`);
  }
  lines.push(`<path d="${trace.join('')}" stroke="#141414" stroke-width="0.34" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`);
  lines.push(...labels);
  const head = o.header ?? `${mmPerSec} mm/s   ${mmPerMv} mm/mV   0,5 bis 150 Hz`;
  lines.push(`<text x="${marginL}" y="9" font-size="3.4" font-family="Arial, Helvetica, sans-serif" fill="#3a3a3a">${head}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}">${lines.join('')}</svg>`;
}

export function monitorSvg(sig, o = {}) {
  const fs = sig.fs;
  const w = 1000;
  const h = 330;
  const secs = o.seconds ?? 8;
  const n = Math.min(sig.n, Math.round(secs * fs));
  const lead = o.lead ?? 1;
  const mx = 32;
  const pxPerSec = (w - 2 * mx) / secs;
  const pxPerMv = 120;
  const y0 = 190;
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = mx + (i / fs) * pxPerSec;
    const y = y0 - sig.leads[lead][i] * pxPerMv;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  const hr = o.hr ?? '--';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#05080a"/><text x="${mx}" y="40" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#4dff88">${LEAD_NAMES[lead]}</text><text x="${w - 200}" y="70" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#4dff88">${hr}</text><text x="${w - 200}" y="96" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#4dff88">HF /min</text><path d="${d}" stroke="#4dff88" stroke-width="2.2" fill="none" stroke-linejoin="round"/></svg>`;
}
