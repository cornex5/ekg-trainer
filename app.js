import { generate } from './src/engine.js';
import { paperSvg } from './src/render.js';
import { SCENARIOS, CATEGORIES } from './src/scenarios.js';
import { measure, NORMAL_RANGES } from './src/measure.js';

const $ = (id) => document.getElementById(id);
const state = { sc: SCENARIOS[0], seedOffset: 0, noise: 'low', mode: 'paper', sig: null };

const LEVELS = ['rs', 'notsan', 'arzt', 'experte'];

function fillScenarios() {
  const max = LEVELS.indexOf($('level').value);
  const sel = $('scenario');
  sel.innerHTML = '';
  CATEGORIES.forEach((cat, ci) => {
    const list = SCENARIOS.filter((s) => s.cat === ci && LEVELS.indexOf(s.level) <= max);
    if (!list.length) return;
    const g = document.createElement('optgroup');
    g.label = cat;
    for (const s of list) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.title;
      g.appendChild(o);
    }
    sel.appendChild(g);
  });
  if (![...sel.options].some((o) => o.value === state.sc.id)) state.sc = SCENARIOS.find((s) => s.id === sel.options[0].value);
  sel.value = state.sc.id;
}
fillScenarios();

function mm(v) {
  return (v * 10).toFixed(1);
}

function fmt(v, lo, hi) {
  const ok = v >= lo && v <= hi;
  return `<span style="color:var(${ok ? '--ok' : '--warn'})">${v}</span>`;
}

function run() {
  const sc = { ...state.sc, noise: state.noise, seed: (state.sc.seed ?? 1) + state.seedOffset * 101 };
  state.sig = generate(sc);
  const m = measure(state.sig);

  $('paper').innerHTML = paperSvg(state.sig);

  const normal = state.sc.id === 'sinus';
  $('kv').innerHTML = `<span>Frequenz <b>${m.hr ?? '-'}</b>/min</span>${m.hr === null ? '' : `<span>QRS-Breite <b>${m.qrsMs}</b> ms</span>`}<span>Lagetyp (QRS-Achse) <b>${normal ? fmt(m.axis, ...NORMAL_RANGES.axis) : m.axis}</b>&deg;</span>`;

  let rows = '<tr><th>Ableitung</th><th>R (mm)</th><th>S (mm)</th><th>ST +60 ms (mm)</th><th>T (mm)</th></tr>';
  for (const l of m.perLead) {
    rows += `<tr><td>${l.name}</td><td>${mm(l.r)}</td><td>${mm(l.s)}</td><td>${mm(l.st)}</td><td>${mm(l.t)}</td></tr>`;
  }
  $('tbl').innerHTML = rows;
  $('rangeNote').textContent = normal
    ? 'Farbig: Lagetyp gegen den Erwachsenen-Normbereich von -30 bis 90 Grad. Das ist eine Plausibilitätsprüfung, kein Beweis, dass ein Bild echt aussieht. Der Beweis kommt vom Blindtest gegen echte Aufnahmen.'
    : 'Werte stammen aus dem simulierten Signal ohne Störungen. Für pathologische Fälle gibt es keine allgemeinen Normbereiche, hier zählt der Vergleich mit dem erwarteten Befundmuster.';

  $('sol').innerHTML = state.sc.solution.map((t) => `<li>${t}</li>`).join('');
  startMonitor();
}

let raf = 0;
function startMonitor() {
  cancelAnimationFrame(raf);
  if (state.mode !== 'monitor' || !state.sig) return;
  const cv = $('monitor');
  const ctx = cv.getContext('2d');
  const sig = state.sig;
  const s = sig.leads[1];
  const W = cv.width;
  const H = cv.height;
  const sweep = 6;
  const gapPx = 40;
  const pxPerMv = 130;
  const y0 = 200;
  const m = measure(sig);

  function frame(now) {
    const t = now / 1000;
    const cyc = Math.floor(t / sweep);
    const phase = (t % sweep) / sweep;
    const headX = Math.floor(phase * W);
    ctx.fillStyle = '#05080a';
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#4dff88';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    for (let x = 0; x < W; x++) {
      if (x > headX && x < headX + gapPx) {
        pen = false;
        continue;
      }
      const sweepIdx = x <= headX ? cyc : cyc - 1;
      const secs = (((sweepIdx * sweep + (x / W) * sweep) % sig.duration) + sig.duration) % sig.duration;
      const i = Math.min(sig.n - 1, Math.floor(secs * sig.fs));
      const y = y0 - s[i] * pxPerMv;
      if (!pen) {
        ctx.moveTo(x, y);
        pen = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#4dff88';
    ctx.font = '600 20px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText('II', 24, 36);
    ctx.font = '700 56px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText(String(m.hr ?? '--'), W - 170, 74);
    ctx.font = '16px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText('HF /min', W - 168, 98);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}

function setMode(mode) {
  state.mode = mode;
  $('paper').classList.toggle('hidden', mode !== 'paper');
  $('monitor').classList.toggle('hidden', mode !== 'monitor');
  $('modePaper').setAttribute('aria-pressed', String(mode === 'paper'));
  $('modeMonitor').setAttribute('aria-pressed', String(mode === 'monitor'));
  startMonitor();
}

$('level').addEventListener('change', () => {
  const before = state.sc.id;
  fillScenarios();
  if (state.sc.id !== before) {
    state.seedOffset = 0;
    run();
  }
});
$('scenario').addEventListener('change', (e) => {
  state.sc = SCENARIOS.find((s) => s.id === e.target.value);
  state.seedOffset = 0;
  run();
});
$('noise').addEventListener('change', (e) => {
  state.noise = e.target.value;
  run();
});
$('reseed').addEventListener('click', () => {
  state.seedOffset += 1;
  run();
});
$('modePaper').addEventListener('click', () => setMode('paper'));
$('modeMonitor').addEventListener('click', () => setMode('monitor'));
$('solToggle').addEventListener('click', () => {
  const on = $('solToggle').getAttribute('aria-pressed') !== 'true';
  $('solToggle').setAttribute('aria-pressed', String(on));
  $('solToggle').textContent = on ? 'Lösung verbergen' : 'Lösung zeigen';
  $('sol').classList.toggle('hidden', !on);
  $('solHidden').classList.toggle('hidden', on);
});

run();
