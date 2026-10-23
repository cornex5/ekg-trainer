import { generate } from './src/engine.js';
import { paperSvg } from './src/render.js';
import { SCENARIOS, CATEGORIES } from './src/scenarios.js';
import { measure, NORMAL_RANGES } from './src/measure.js';
import { mulberry32 } from './src/rng.js';
import { RHYTHMS, AXES, FINDINGS, TRUTH } from './src/truth.js';
import { CONTEXT } from './src/context.js';
import { LIVE, SEG_SECONDS } from './src/livescen.js';
import { grade, truthSummary } from './src/grade.js';
import { ERRORS, applyError, NOISE_FOR } from './src/errors.js';
import { makeBlindSet } from './src/blind.js';
import { record, stats, pick, exportJson, reset } from './src/store.js';
import { apiStatus, transcribe, evaluate, startRecording, micSupported, getCode, setCode, MAX_SECONDS } from './src/voice.js';

const $ = (id) => document.getElementById(id);
const LEVELS = ['rs', 'notsan', 'arzt', 'experte'];
const state = {
  tab: 'read',
  sc: SCENARIOS[0],
  seedOffset: 0,
  noise: 'low',
  mode: 'paper',
  sig: null,
  graded: false,
  quiz: { blitz: false, n: 0, right: 0, t0: 0, answered: false },
};

// ---------- helpers ----------
const level = () => $('level').value;
const catIdx = () => ($('cat').value === '' ? null : Number($('cat').value));
function pool() {
  const max = LEVELS.indexOf(level());
  const c = catIdx();
  return SCENARIOS.filter((s) => LEVELS.indexOf(s.level) <= max && (c === null || s.cat === c));
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mm = (v) => (v * 10).toFixed(1);
function fmt(v, lo, hi) {
  const ok = v >= lo && v <= hi;
  return `<span style="color:var(${ok ? '--ok' : '--warn'})">${v}</span>`;
}

// ---------- static fills ----------
$('cat').innerHTML = '<option value="">alle Kategorien</option>' + CATEGORIES.map((c, i) => `<option value="${i}">${esc(c)}</option>`).join('');
$('fRhythm').innerHTML = '<option value="">bitte wählen</option>' + RHYTHMS.map((r) => `<option value="${r[0]}">${esc(r[1])}</option>`).join('');
$('fAxis').innerHTML = '<option value="">bitte wählen</option>' + AXES.map((a) => `<option value="${a[0]}">${esc(a[1])}</option>`).join('');
$('fFind').innerHTML = Object.entries(FINDINGS)
  .map(([id, f]) => `<label><input type="checkbox" value="${id}"> ${esc(f[0])}</label>`)
  .join('');

function fillScenarios() {
  const sel = $('scenario');
  sel.innerHTML = '';
  CATEGORIES.forEach((cat, ci) => {
    const list = SCENARIOS.filter((s) => s.cat === ci);
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

// ---------- drawing, explanation layer, caliper ----------
const tools = { caliper: false, explain: false, pts: [] };

function marksFor(sig) {
  if (!sig.sched || sig.sched.vf) return [];
  const out = [];
  const vent = sig.sched.ventricular.filter((b) => b.t > 0.2 && b.t < sig.duration - 0.6);
  const atr = sig.sched.atrial.filter((a) => a.t > 0.2 && a.t < sig.duration - 0.3);
  const D = sig.morph.qrs;
  let first = 0;
  for (const a of atr) out.push({ t0: a.t, t1: a.t + 0.1, color: '#1f5fa8', label: first++ < 2 ? 'P' : '' });
  first = 0;
  for (let bi = 0; bi < vent.length; bi++) {
    const b = vent[bi];
    const next = vent[bi + 1] ? vent[bi + 1].t - 0.03 : Infinity;
    const lab = first++ < 2;
    const pvc = b.morph === 'pvc';
    out.push({ t0: b.t, t1: b.t + (pvc ? 0.14 : D), color: '#a8201a', label: lab ? (pvc ? 'VES' : 'QRS') : '' });
    const qt = Math.max(0.2, sig.morph.qtc * Math.cbrt(b.rr || 0.8));
    out.push({ t0: b.t + (pvc ? 0.14 : D), t1: Math.min(b.t + qt, next), color: '#1f6b3a', label: lab ? 'ST und T' : '', low: true });
  }
  return out;
}

function updateStageInfo() {
  const mon = state.mode === 'monitor';
  $('stageInfo').textContent = mon ? `Monitor, Ableitung II · ${$('gain').value} mm/mV` : `12 Ableitungen · ${$('speed').value} mm/s · ${$('gain').value} mm/mV`;
}

function redrawPaper() {
  updateStageInfo();
  if (!state.sig) return;
  const marks = tools.explain && state.tab !== 'blind' ? marksFor(state.sig) : [];
  $('paper').innerHTML = paperSvg(state.sig, { speed: Number($('speed').value), gain: Number($('gain').value), marks });
  const svg = $('paper').querySelector('svg');
  if (svg) svg.classList.toggle('cal', tools.caliper);
  drawCaliper();
}

function svgPoint(e) {
  const svg = $('paper').querySelector('svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [q.x, q.y];
}

function drawCaliper() {
  const svg = $('paper').querySelector('svg');
  const old = svg && svg.querySelector('#calLayer');
  if (old) old.remove();
  if (!svg || !tools.pts.length) {
    $('calRead').textContent = tools.caliper ? 'Messzirkel: zwei Punkte im EKG anklicken. Dritter Klick beginnt neu.' : '';
    return;
  }
  const speed = Number($('speed').value);
  const gain = Number($('gain').value);
  let g = '<g id="calLayer" stroke="#0a58c2" fill="#0a58c2" font-family="Arial, sans-serif">';
  for (const [x, y] of tools.pts) g += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.7"/><path d="M${x.toFixed(2)} ${(y - 6).toFixed(2)}V${(y + 6).toFixed(2)}" stroke-width="0.2" stroke-dasharray="1 1"/>`;
  if (tools.pts.length === 2) {
    const [[x1, y1], [x2, y2]] = tools.pts;
    g += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" stroke-width="0.35"/>`;
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const ms = Math.round((dx / speed) * 1000);
    const mv = (dy / gain).toFixed(2).replace('.', ',');
    $('calRead').innerHTML = `Messzirkel: <b>${ms} ms</b> (${dx.toFixed(1)} mm waagerecht, entspricht ${ms ? Math.round(60000 / ms) : '-'}/min als Abstand), <b>${mv} mV</b> (${dy.toFixed(1)} mm senkrecht).`;
  } else {
    $('calRead').textContent = 'Zweiten Punkt anklicken.';
  }
  g += '</g>';
  svg.insertAdjacentHTML('beforeend', g);
}

function setExplainAvail(avail, reset = false) {
  $('btnExplain').disabled = !avail;
  if (!avail || reset) {
    if (reset || !avail) tools.explain = false;
    $('btnExplain').setAttribute('aria-pressed', 'false');
  }
}

// ---------- signal ----------
function build() {
  const base = state.sc;
  const seed = (base.seed ?? 1) + state.seedOffset * 101;
  const sc = { ...base, noise: state.noise, seed };
  // Trainer modes vary the rate a little so a repeated case does not look identical.
  if (state.tab !== 'cat' && base.hr && base.rhythm !== 'af') {
    const r = mulberry32(seed + 7)();
    sc.hr = Math.round(base.hr * (0.92 + 0.16 * r));
  }
  state.sig = generate(sc);
  tools.pts = [];
  redrawPaper();
  startMonitor();
}

function newCase() {
  const p = pool();
  if (!p.length) return;
  state.sc = pick(p, state.sc.id);
  state.seedOffset = Math.floor(Math.random() * 900);
  build();
}

// ---------- Befunden ----------
function resetForm() {
  setExplainAvail(false);
  $('fRhythm').value = '';
  $('fRate').value = '';
  $('fAxis').value = '';
  $('fQrs').value = '';
  for (const c of $('fFind').querySelectorAll('input')) c.checked = false;
  $('result').classList.add('hidden');
  $('btnNext').classList.add('hidden');
  $('btnGrade').classList.remove('hidden');
  $('gradeHint').textContent = '';
  setFormDisabled(false);
  state.graded = false;
  const simple = level() === 'rs';
  $('wAxis').classList.toggle('hidden', simple);
  $('wQrs').classList.toggle('hidden', simple);
}
function setFormDisabled(d) {
  for (const el of $('form').querySelectorAll('select,input')) el.disabled = d;
}

function readCase() {
  newCase();
  resetForm();
  showContext();
}

function doGrade() {
  if (state.graded) return;
  if (!$('fRhythm').value) {
    $('gradeHint').textContent = 'Wähle zuerst einen Rhythmus.';
    return;
  }
  const ans = {
    rhythm: $('fRhythm').value,
    rate: $('fRate').value,
    axis: $('fAxis').value,
    qrs: $('fQrs').value,
    findings: [...$('fFind').querySelectorAll('input:checked')].map((c) => c.value),
  };
  const g = grade(state.sig, state.sc, ans, level());
  state.graded = true;
  setExplainAvail(true);
  setFormDisabled(true);
  record(state.sc.id, g.pct, 'read');
  const rows = g.items
    .map((i) => {
      let extra = '';
      if (i.reasons && i.reasons.length) extra += `<div class="small">Übersehen: ${i.reasons.map(esc).join(' ')}</div>`;
      if (i.extra && i.extra.length) extra += `<div class="small">Nicht zutreffend angekreuzt: ${i.extra.map(esc).join(', ')}</div>`;
      if (i.note) extra += `<div class="small">${esc(i.note)}</div>`;
      return `<div class="res-item"><div class="res-head"><span>${esc(i.label)}</span><span class="${i.ok ? 'ok' : 'bad'}">${i.pts} von ${i.max}</span></div>
        <div class="small">Deine Antwort: ${esc(i.answer)}</div><div class="small">Richtig: ${esc(i.right)}</div>${extra}</div>`;
    })
    .join('');
  $('result').innerHTML = `<div class="score">${g.pct} %</div><div class="small">${esc(state.sc.title)}</div>${rows}
    <div class="res-item"><div class="res-head"><span>Lösung im Zusammenhang</span></div><ul class="sol">${state.sc.solution.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  $('result').classList.remove('hidden');
  $('btnNext').classList.remove('hidden');
  $('btnGrade').classList.add('hidden');
  renderStats();
}

// ---------- Quiz ----------
function quizQuestion() {
  newCase();
  setExplainAvail(false);
  showContext();
  state.quiz.answered = false;
  const p = pool();
  const key = (s) => TRUTH[s.id].rhythm + '|' + TRUTH[s.id].findings.join(',');
  const own = key(state.sc);
  const others = p.filter((s) => s.id !== state.sc.id && key(s) !== own);
  const near = others.filter((s) => s.cat === state.sc.cat).sort(() => Math.random() - 0.5);
  const far = others.filter((s) => s.cat !== state.sc.cat).sort(() => Math.random() - 0.5);
  const dist = [...near.slice(0, 2), ...far].slice(0, 3);
  // fall back to the whole catalogue when a narrow pool has too few distractors
  if (dist.length < 3) {
    const rest = SCENARIOS.filter((s) => s.id !== state.sc.id && key(s) !== own && !dist.includes(s)).sort(() => Math.random() - 0.5);
    dist.push(...rest.slice(0, 3 - dist.length));
  }
  const options = [state.sc, ...dist].sort(() => Math.random() - 0.5);
  $('opts').innerHTML = options.map((s) => `<button data-id="${s.id}">${esc(s.title)}</button>`).join('');
  $('quizFb').classList.add('hidden');
  $('btnQNext').classList.add('hidden');
  $('quizHint').textContent = state.quiz.blitz ? `Blitz: Frage ${state.quiz.n + 1} von 10` : '';
}

function quizAnswer(id) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  setExplainAvail(true);
  const right = id === state.sc.id;
  for (const b of $('opts').querySelectorAll('button')) {
    if (b.dataset.id === state.sc.id) b.classList.add('right');
    else if (b.dataset.id === id) b.classList.add('wrong');
  }
  record(state.sc.id, right ? 100 : 0, 'quiz');
  state.quiz.n += 1;
  if (right) state.quiz.right += 1;
  $('quizFb').innerHTML = `<strong class="${right ? 'ok' : 'bad'}">${right ? 'Richtig.' : 'Nicht ganz.'}</strong> ${esc(state.sc.title)}<ul class="sol">${state.sc.solution.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  $('quizFb').classList.remove('hidden');
  if (state.quiz.blitz && state.quiz.n >= 10) {
    const sec = Math.round((Date.now() - state.quiz.t0) / 1000);
    $('quizHint').textContent = `Blitz beendet: ${state.quiz.right} von 10 richtig in ${sec} s.`;
    state.quiz.blitz = false;
    state.quiz.n = 0;
    state.quiz.right = 0;
    $('btnBlitz').setAttribute('aria-pressed', 'false');
  }
  $('btnQNext').classList.remove('hidden');
  renderStats();
}

// ---------- Blindtest ----------
const blind = { items: [], i: 0, hits: 0, answered: false, log: [] };
function blindStart() {
  blind.items = makeBlindSet(20);
  blind.i = 0;
  blind.hits = 0;
  blind.log = [];
  blindShow();
}
function blindShow() {
  const it = blind.items[blind.i];
  state.sig = it.make();
  blind.answered = false;
  tools.pts = [];
  redrawPaper();
  $('blindFb').classList.add('hidden');
  $('btnBlindNext').classList.add('hidden');
  $('btnBlindReal').disabled = false;
  $('btnBlindSim').disabled = false;
  $('blindHint').textContent = `EKG ${blind.i + 1} von ${blind.items.length}`;
}
function blindAnswer(guessReal) {
  if (blind.answered) return;
  blind.answered = true;
  const it = blind.items[blind.i];
  const ok = guessReal === it.real;
  if (ok) blind.hits += 1;
  blind.log.push({ real: it.real, guess: guessReal });
  $('btnBlindReal').disabled = true;
  $('btnBlindSim').disabled = true;
  const last = blind.i + 1 >= blind.items.length;
  let txt = `<strong class="${ok ? 'ok' : 'bad'}">${ok ? 'Richtig.' : 'Daneben.'}</strong> Das war ${it.real ? 'eine echte Aufnahme' : 'eine Simulation'}.`;
  if (last) {
    const pct = Math.round((blind.hits / blind.items.length) * 100);
    const realHit = blind.log.filter((l) => l.real && l.guess).length;
    const simHit = blind.log.filter((l) => !l.real && !l.guess).length;
    const nReal = blind.log.filter((l) => l.real).length;
    const nSim = blind.log.length - nReal;
    txt += `<div class="score">${pct} %</div><div class="small">Echte erkannt: ${realHit} von ${nReal}. Simulierte erkannt: ${simHit} von ${nSim}. Bei 20 Bildern liegt reines Raten mit 95 Prozent Wahrscheinlichkeit zwischen 30 und 70 Prozent.</div>`;
  }
  $('blindFb').innerHTML = txt;
  $('blindFb').classList.remove('hidden');
  if (!last) $('btnBlindNext').classList.remove('hidden');
}

// ---------- Fehlerquellen ----------
const err = { cur: null, answered: false };
function errorCase() {
  setExplainAvail(false);
  err.answered = false;
  err.cur = ERRORS[Math.floor(Math.random() * ERRORS.length)];
  const id = err.cur[0];
  const seed = 100 + Math.floor(Math.random() * 9000);
  const base = { rhythm: 'sinus', hr: 66 + Math.floor(Math.random() * 22), seed, noise: NOISE_FOR[id] ?? 'low', id: 'fehler' };
  const sig = generate(base);
  sig.leads = applyError(sig.leads, id);
  state.sig = sig;
  tools.pts = [];
  redrawPaper();
  $('errOpts').innerHTML = ERRORS.map((e) => `<button data-id="${e[0]}">${esc(e[1])}</button>`).join('');
  $('errFb').classList.add('hidden');
  $('btnErrNext').classList.add('hidden');
}
function errorAnswer(id) {
  if (err.answered) return;
  err.answered = true;
  const right = id === err.cur[0];
  for (const b of $('errOpts').querySelectorAll('button')) {
    if (b.dataset.id === err.cur[0]) b.classList.add('right');
    else if (b.dataset.id === id) b.classList.add('wrong');
  }
  record('fehler-' + err.cur[0], right ? 100 : 0, 'fehler');
  setExplainAvail(false);
  $('errFb').innerHTML = `<strong class="${right ? 'ok' : 'bad'}">${right ? 'Richtig.' : 'Nicht ganz.'}</strong> ${esc(err.cur[1])}<div class="small">${esc(err.cur[2])}</div>`;
  $('errFb').classList.remove('hidden');
  $('btnErrNext').classList.remove('hidden');
  renderStats();
}

// ---------- Monitor live ----------
const live = { running: false, total: 0, story: null, answers: [] };
const MON_RHYTHMS = [...RHYTHMS, ['pvc', 'Sinusrhythmus mit Extrasystolen']];
const monTruth = (id) => (TRUTH[id].findings.includes('pvc') ? 'pvc' : TRUTH[id].rhythm);
const monLabel = (r) => MON_RHYTHMS.find((x) => x[0] === r)[1];

function liveSetup() {
  $('liveStory').innerHTML = LIVE.map((l, i) => `<option value="${i}">${esc(l.title)}</option>`).join('');
  $('liveAns').innerHTML = MON_RHYTHMS.map((r) => `<option value="${r[0]}">${esc(r[1])}</option>`).join('');
  $('liveStory').querySelectorAll('option').forEach((o) => (o.textContent = 'Szenario ' + (Number(o.value) + 1)));
  live.running = false;
  $('liveRes').classList.add('hidden');
  $('liveCtl').classList.add('hidden');
  cancelAnimationFrame(raf);
}

function startLive() {
  const story = LIVE[Number($('liveStory').value)];
  live.story = story;
  live.answers = [];
  const parts = story.segs.map((id) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    return generate({ ...sc, seed: 100 + Math.floor(Math.random() * 90000), duration: SEG_SECONDS, noise: 'low' }).leads[1];
  });
  const fs = 500;
  const all = new Float32Array(parts.length * SEG_SECONDS * fs);
  parts.forEach((p, k) => all.set(p.subarray(0, SEG_SECONDS * fs), k * SEG_SECONDS * fs));
  live.total = parts.length * SEG_SECONDS;
  state.sig = { fs, n: all.length, duration: live.total, leads: [null, all] };
  live.running = true;
  $('liveRes').classList.add('hidden');
  $('liveCtl').classList.remove('hidden');
  $('liveLog').textContent = 'Läuft. Beim Rhythmuswechsel sofort ansagen.';
  setMode('monitor');
  startMonitor();
}

function liveAnswer() {
  if (!live.running) return;
  live.answers.push({ t: monClock, r: $('liveAns').value });
  $('liveLog').textContent = `Angesagt: ${monLabel($('liveAns').value)}`;
}

function finishLive() {
  live.running = false;
  cancelAnimationFrame(raf);
  $('liveCtl').classList.add('hidden');
  let hits = 0;
  const rows = live.story.segs
    .map((id, i) => {
      const truth = monTruth(id);
      const a0 = i * SEG_SECONDS;
      const a1 = a0 + SEG_SECONDS;
      const mine = live.answers.filter((a) => a.t >= a0 && a.t < a1 + (i < live.story.segs.length - 1 ? 3 : 0));
      const okA = mine.find((a) => a.r === truth && a.t >= (i === 0 ? 0 : a0 - 3));
      const wrong = mine.filter((a) => a.r !== truth).length;
      const prevCovered = live.answers.some((a) => a.r === truth && a.t >= a0 - 3 && a.t < a0);
      if (okA || prevCovered) hits += 1;
      record(id, okA ? 100 : 0, 'live');
      const t = okA ? `erkannt nach ${Math.max(0, okA.t - a0).toFixed(1).replace('.', ',')} s` : 'nicht erkannt';
      return `<div class="res-item"><div class="res-head"><span>Abschnitt ${i + 1}: ${esc(monLabel(truth))}</span><span class="${okA ? 'ok' : 'bad'}">${t}</span></div>${wrong ? `<div class="small">${wrong} falsche Ansage(n) in diesem Abschnitt</div>` : ''}</div>`;
    })
    .join('');
  $('liveRes').innerHTML = `<div class="score">${hits} von ${live.story.segs.length}</div><div class="small">${esc(live.story.title)}</div>${rows}`;
  $('liveRes').classList.remove('hidden');
  renderStats();
}

function showContext() {
  const on = $('chkCtx').checked && (state.tab === 'read' || state.tab === 'voice' || state.tab === 'quiz');
  const t = CONTEXT[state.sc.id];
  if (on && t) {
    $('ctxBox').innerHTML = `<div class="panel-head" style="margin-bottom:6px"><h2>Fallgeschichte</h2></div><div>${esc(t)}</div>`;
    $('ctxBox').classList.remove('hidden');
  } else $('ctxBox').classList.add('hidden');
}

// ---------- Katalog ----------
function runCatalog() {
  build();
  const m = measure(state.sig);
  const normal = state.sc.id === 'sinus';
  $('kv').innerHTML = `<span>Frequenz <b>${m.hr ?? '-'}</b>/min</span>${m.hr === null ? '' : `<span>QRS-Breite <b>${m.qrsMs}</b> ms</span>`}<span>Lagetyp (QRS-Achse) <b>${normal ? fmt(m.axis, ...NORMAL_RANGES.axis) : m.axis}</b>&deg;</span>`;
  let rows = '<tr><th>Ableitung</th><th>R (mm)</th><th>S (mm)</th><th>ST +60 ms (mm)</th><th>T (mm)</th></tr>';
  for (const l of m.perLead) rows += `<tr><td>${l.name}</td><td>${mm(l.r)}</td><td>${mm(l.s)}</td><td>${mm(l.st)}</td><td>${mm(l.t)}</td></tr>`;
  $('tbl').innerHTML = rows;
  $('rangeNote').textContent = normal
    ? 'Farbig: Lagetyp gegen den Erwachsenen-Normbereich von -30 bis 90 Grad. Das ist eine Plausibilitätsprüfung, kein Beweis, dass ein Bild echt aussieht. Der Beweis kommt vom Blindtest gegen echte Aufnahmen.'
    : 'Werte stammen aus dem simulierten Signal ohne Störungen. Für pathologische Fälle gibt es keine allgemeinen Normbereiche, hier zählt der Vergleich mit dem erwarteten Befundmuster.';
  $('sol').innerHTML = state.sc.solution.map((t) => `<li>${esc(t)}</li>`).join('');
}

// ---------- Monitor ----------
let raf = 0;
let monT0 = 0;
let monClock = 0;
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
  const m = state.tab === 'cat' ? measure(sig) : { hr: null };
  monT0 = performance.now();
  // the live rate number would give the answer away while reading, so it is only shown in the catalogue
  const showHr = state.tab === 'cat';

  function frame(now) {
    const t = (now - monT0) / 1000;
    monClock = t;
    if (state.tab === 'live' && live.running && t >= live.total) {
      finishLive();
      return;
    }
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
      const y = y0 - s[i] * pxPerMv * (Number($('gain').value) / 10);
      if (!pen) {
        ctx.moveTo(x, y);
        pen = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#4dff88';
    ctx.font = '600 20px IBM Plex Sans, Arial, sans-serif';
    ctx.fillText('II', 24, 36);
    if (showHr) {
      ctx.font = '700 56px IBM Plex Sans, Arial, sans-serif';
      ctx.fillText(String(m.hr ?? '--'), W - 170, 74);
      ctx.font = '16px IBM Plex Sans, Arial, sans-serif';
      ctx.fillText('HF /min', W - 168, 98);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}

function setMode(mode) {
  if (state.tab === 'blind' || state.tab === 'fehler') mode = 'paper';
  state.mode = mode;
  $('paper').classList.toggle('hidden', mode !== 'paper');
  $('monitor').classList.toggle('hidden', mode !== 'monitor');
  $('modePaper').setAttribute('aria-pressed', String(mode === 'paper'));
  $('modeMonitor').setAttribute('aria-pressed', String(mode === 'monitor'));
  updateStageInfo();
  startMonitor();
}

// ---------- tabs and stats ----------
function renderStats() {
  const s = stats();
  $('statline').innerHTML = `<span class="chip"><b>${s.done}</b> bearbeitet</span><span class="chip">Schnitt <b>${s.done ? s.avg + ' %' : '-'}</b></span><span class="chip"><b>${s.due}</b> fällig</span>`;
}

const GROUP = { read: 'befund', voice: 'befund', quiz: 'quiz', live: 'live', fehler: 'fehler', blind: 'labor', cat: 'labor' };
const GROUP_DEFAULT = { befund: 'read', quiz: 'quiz', live: 'live', fehler: 'fehler', labor: 'blind' };
const PANELS = { read: 'panelRead', voice: 'panelVoice', quiz: 'panelQuiz', blind: 'panelBlind', fehler: 'panelFehler', live: 'panelLive', cat: 'panelCat' };
let lastBefund = 'read';

function setTab(tab) {
  const prev = state.tab;
  state.tab = tab;
  if (prev === 'live' && tab !== 'live') {
    live.running = false;
    setMode('paper');
  }
  if (prev === 'voice' && tab !== 'voice') voiceStop(true);
  const group = GROUP[tab];
  if (group === 'befund') lastBefund = tab;
  for (const b of $('nav').querySelectorAll('button')) {
    if (b.dataset.group === group) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('subBefund').classList.toggle('hidden', group !== 'befund');
  $('subLabor').classList.toggle('hidden', group !== 'labor');
  for (const [id, t] of [['tabRead', 'read'], ['tabVoice', 'voice'], ['tabBlind', 'blind'], ['tabCat', 'cat']]) $(id).setAttribute('aria-pressed', String(t === tab));
  for (const [t, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', t !== tab);
  if (tab !== 'read' && tab !== 'voice' && tab !== 'quiz') $('ctxBox').classList.add('hidden');
  const trainer = tab === 'read' || tab === 'voice' || tab === 'quiz';
  $('wLevel').classList.toggle('hidden', !trainer);
  $('wCat').classList.toggle('hidden', !trainer);
  $('wCtx').classList.toggle('hidden', !trainer);
  const noMode = tab === 'blind' || tab === 'fehler';
  $('modeWrap').classList.toggle('hidden', noMode || tab === 'live');
  if (noMode) setMode('paper');
  if (tab === 'read') readCase();
  else if (tab === 'voice') voiceCase();
  else if (tab === 'quiz') quizQuestion();
  else if (tab === 'blind') {
    setExplainAvail(false);
    blindStart();
  } else if (tab === 'fehler') errorCase();
  else if (tab === 'live') {
    setExplainAvail(false);
    liveSetup();
  } else {
    fillScenarios();
    setExplainAvail(true);
    runCatalog();
  }
}

// ---------- Laut befunden ----------
const voice = { rec: null, busy: false, evaluated: false, status: null, blob: null };
const GUIDE = {
  rs: ['Rhythmus: regelmäßig oder unregelmäßig, Sinusrhythmus oder nicht', 'Frequenz pro Minute', 'Breiter oder schmaler Komplex', 'Auffälligstes Zeichen und was daraus folgt'],
  notsan: ['Rhythmus und Frequenz', 'P-Welle vorhanden, Bezug zum QRS', 'QRS schmal oder breit', 'ST-Strecke: Hebung oder Senkung, in welchen Ableitungen', 'Gesamteindruck und nächster Schritt'],
  arzt: ['Rhythmus, Frequenz, Regelmäßigkeit', 'Lagetyp', 'P-Welle und PQ-Zeit', 'QRS-Breite und Morphologie', 'ST-Strecke und T-Welle, regional zugeordnet', 'QT-Zeit', 'Zusammenfassende Beurteilung'],
  experte: ['Rhythmus, Frequenz, Überleitung', 'Lagetyp und Hinweise auf Blöcke', 'P-Welle, PQ, QRS-Morphologie, Zeiten', 'ST-T je Region mit Spiegelbildern', 'Besonderheiten (Delta, Epsilon, U, Brugada und andere)', 'Differenzialdiagnosen', 'Klinische Konsequenz'],
};
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function voiceGuide() {
  $('vGuide').innerHTML = GUIDE[level()].map((t) => `<li>${esc(t)}</li>`).join('');
}

function setPill() {
  const st = voice.status;
  const pill = $('vPill');
  pill.className = 'pill';
  if (!st) {
    pill.textContent = 'Server nicht erreichbar';
    pill.classList.add('off');
  } else if (!st.transcribe || !st.evaluate) {
    pill.textContent = `Nicht eingerichtet: ${[!st.transcribe && 'Spracherkennung', !st.evaluate && 'Bewertung'].filter(Boolean).join(', ')}`;
    pill.classList.add('off');
  } else {
    pill.textContent = 'Bereit';
    pill.classList.add('on');
  }
  $('vCodeWrap').classList.toggle('hidden', !(st && st.needsCode));
}

async function voiceCase() {
  voiceStop(true);
  newCase();
  setExplainAvail(false);
  showContext();
  voiceGuide();
  voice.evaluated = false;
  $('vText').value = '';
  $('vText').disabled = false;
  $('vEval').disabled = false;
  $('vEval').classList.remove('hidden');
  $('vNew').classList.add('hidden');
  $('vResult').classList.add('hidden');
  $('vErr').classList.add('hidden');
  $('vHint').textContent = '';
  $('vTimer').textContent = '0:00';
  $('vState').textContent = micSupported() ? 'Bereit. Zum Starten auf das Mikrofon tippen.' : 'Dieser Browser kann nicht aufnehmen. Tippe den Befund stattdessen ein.';
  $('vRec').disabled = !micSupported();
  voice.status = await apiStatus();
  setPill();
}

function voiceError(msg) {
  $('vErr').textContent = msg;
  $('vErr').classList.remove('hidden');
}

function micMessage(e) {
  if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) return 'Der Zugriff auf das Mikrofon wurde nicht erlaubt. Erlaube ihn in den Browsereinstellungen für diese Seite oder tippe den Befund ein.';
  if (e && e.name === 'NotFoundError') return 'Es wurde kein Mikrofon gefunden. Tippe den Befund stattdessen ein.';
  return 'Die Aufnahme konnte nicht gestartet werden. Tippe den Befund stattdessen ein.';
}

async function voiceToggle() {
  if (voice.busy || voice.evaluated) return;
  $('vErr').classList.add('hidden');
  if (voice.rec) {
    await voiceStop(false);
    return;
  }
  try {
    voice.rec = await startRecording({
      onLevel: (v) => ($('vMeter').style.width = `${Math.round(v * 100)}%`),
      onTick: (s) => ($('vTimer').textContent = fmtTime(s)),
      onAutoStop: () => voiceStop(false),
    });
  } catch (e) {
    voice.rec = null;
    voiceError(micMessage(e));
    return;
  }
  $('vRec').setAttribute('aria-pressed', 'true');
  $('vRec').setAttribute('aria-label', 'Aufnahme beenden');
  $('vState').textContent = `Aufnahme läuft (höchstens ${fmtTime(MAX_SECONDS)}). Zum Beenden erneut tippen.`;
}

// discard = true drops the recording without transcribing (case change, tab change)
async function voiceStop(discard) {
  const rec = voice.rec;
  if (!rec) return;
  voice.rec = null;
  $('vRec').setAttribute('aria-pressed', 'false');
  $('vRec').setAttribute('aria-label', 'Aufnahme starten');
  $('vMeter').style.width = '0';
  const blob = await rec.stop();
  if (discard) return;
  voice.blob = blob;
  if (blob.size < 2000) {
    $('vState').textContent = 'Die Aufnahme war zu kurz.';
    return;
  }
  voice.busy = true;
  $('vRec').disabled = true;
  $('vState').innerHTML = '<span class="spin"></span>Wird in Text umgewandelt …';
  try {
    const text = await transcribe(blob);
    const cur = $('vText').value.trim();
    $('vText').value = cur ? `${cur} ${text}` : text;
    $('vState').textContent = text ? 'Text erstellt. Prüfen, bei Bedarf korrigieren, dann auswerten.' : 'Es wurde nichts erkannt. Bitte noch einmal aufnehmen oder tippen.';
  } catch (e) {
    $('vState').textContent = 'Die Umwandlung ist fehlgeschlagen.';
    voiceError(e.message + ' Du kannst den Befund auch eintippen.');
  } finally {
    voice.busy = false;
    $('vRec').disabled = !micSupported() || voice.evaluated;
  }
}

function renderVoiceResult(b) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(b.punkte) || 0)));
  const rows = (b.items || [])
    .map(
      (i) => `<div class="res-item"><div class="res-head"><span>${esc(i.aspekt)}</span><span class="verdict v-${esc(i.urteil)}">${esc(i.urteil)}</span></div>
      <div class="cols"><div><span>Du hast gesagt</span>${esc(i.gesagt)}</div><div><span>Erwartet</span>${esc(i.erwartet)}</div></div>
      ${i.kommentar ? `<div class="small" style="margin-top:4px">${esc(i.kommentar)}</div>` : ''}</div>`,
    )
    .join('');
  const invented = (b.erfunden || []).length
    ? `<div class="res-item"><div class="res-head"><span>Nicht zum EKG passend</span></div><ul class="sol">${b.erfunden.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`
    : '';
  $('vResult').innerHTML = `<div class="score">${pct} %</div><p style="margin:6px 0 10px">${esc(b.zusammenfassung)}</p>${rows}${invented}
    <div class="res-item"><div class="res-head"><span>Musterbefund</span></div><blockquote>${esc(b.musterbefund)}</blockquote></div>
    <div class="res-item"><div class="res-head"><span>Lösung im Zusammenhang</span></div><ul class="sol">${state.sc.solution.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  $('vResult').classList.remove('hidden');
  return pct;
}

async function voiceEvaluate() {
  if (voice.busy || voice.evaluated) return;
  if (voice.rec) await voiceStop(false);
  const text = $('vText').value.trim();
  $('vErr').classList.add('hidden');
  if (text.length < 8) {
    $('vHint').textContent = 'Sprich oder tippe zuerst Deinen Befund.';
    return;
  }
  $('vHint').textContent = '';
  voice.busy = true;
  $('vEval').disabled = true;
  $('vState').innerHTML = '<span class="spin"></span>Claude bewertet den Befund …';
  try {
    const ctxText = $('chkCtx').checked ? CONTEXT[state.sc.id] : undefined;
    const b = await evaluate({ transcript: text, level: level(), fall: truthSummary(state.sig, state.sc, ctxText) });
    const pct = renderVoiceResult(b);
    record(state.sc.id, pct, 'voice');
    voice.evaluated = true;
    setExplainAvail(true);
    $('vText').disabled = true;
    $('vRec').disabled = true;
    $('vEval').classList.add('hidden');
    $('vNew').classList.remove('hidden');
    $('vState').textContent = 'Bewertung fertig.';
    renderStats();
    $('vResult').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) {
    voiceError(e.message);
    if (e.kind === 'access_code') $('vCodeWrap').classList.remove('hidden');
    $('vState').textContent = 'Die Bewertung ist fehlgeschlagen. Der Text bleibt erhalten, Du kannst es erneut versuchen.';
    $('vEval').disabled = false;
  } finally {
    voice.busy = false;
  }
}

// ---------- events ----------
$('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const g = b.dataset.group;
  setTab(g === 'befund' ? lastBefund : GROUP_DEFAULT[g]);
});
$('tabRead').addEventListener('click', () => setTab('read'));
$('tabVoice').addEventListener('click', () => setTab('voice'));
$('tabBlind').addEventListener('click', () => setTab('blind'));
$('tabCat').addEventListener('click', () => setTab('cat'));
$('vRec').addEventListener('click', voiceToggle);
$('vEval').addEventListener('click', voiceEvaluate);
$('vNew').addEventListener('click', voiceCase);
$('vClear').addEventListener('click', () => {
  if (!voice.evaluated) $('vText').value = '';
});
$('vCode').addEventListener('change', (e) => setCode(e.target.value));
$('btnLiveStart').addEventListener('click', startLive);
$('btnLiveAns').addEventListener('click', liveAnswer);
$('chkCtx').addEventListener('change', () => {
  try {
    localStorage.setItem('ekg-ctx', $('chkCtx').checked ? '1' : '0');
  } catch (e) {
    /* ignore */
  }
  showContext();
});
$('errOpts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) errorAnswer(b.dataset.id);
});
$('btnErrNext').addEventListener('click', errorCase);
$('btnBlindReal').addEventListener('click', () => blindAnswer(true));
$('btnBlindSim').addEventListener('click', () => blindAnswer(false));
$('btnBlindNext').addEventListener('click', () => {
  blind.i += 1;
  blindShow();
});
$('btnBlindStart').addEventListener('click', blindStart);
$('btnCaliper').addEventListener('click', () => {
  tools.caliper = !tools.caliper;
  tools.pts = [];
  $('btnCaliper').setAttribute('aria-pressed', String(tools.caliper));
  redrawPaper();
});
$('btnExplain').addEventListener('click', () => {
  if ($('btnExplain').disabled) return;
  tools.explain = !tools.explain;
  $('btnExplain').setAttribute('aria-pressed', String(tools.explain));
  redrawPaper();
});
$('paper').addEventListener('click', (e) => {
  if (!tools.caliper || !$('paper').querySelector('svg')) return;
  if (tools.pts.length >= 2) tools.pts = [];
  tools.pts.push(svgPoint(e));
  drawCaliper();
});
$('btnGrade').addEventListener('click', doGrade);
$('btnNext').addEventListener('click', readCase);
$('btnQNext').addEventListener('click', quizQuestion);
$('opts').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) quizAnswer(b.dataset.id);
});
$('btnBlitz').addEventListener('click', () => {
  state.quiz = { blitz: true, n: 0, right: 0, t0: Date.now(), answered: false };
  $('btnBlitz').setAttribute('aria-pressed', 'true');
  quizQuestion();
});
$('level').addEventListener('change', () => setTab(state.tab));
$('cat').addEventListener('change', () => setTab(state.tab));
function refresh() {
  if (state.tab === 'blind' || state.tab === 'fehler') redrawPaper();
  else if (state.tab === 'cat') runCatalog();
  else build();
}
$('noise').addEventListener('change', (e) => {
  state.noise = e.target.value;
  refresh();
});
$('speed').addEventListener('change', refresh);
$('gain').addEventListener('change', refresh);
$('scenario').addEventListener('change', (e) => {
  state.sc = SCENARIOS.find((s) => s.id === e.target.value);
  state.seedOffset = 0;
  runCatalog();
});
$('reseed').addEventListener('click', () => {
  state.seedOffset += 1;
  runCatalog();
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
$('btnExport').addEventListener('click', () => {
  let box = $('exportBox');
  if (!box) {
    box = document.createElement('textarea');
    box.id = 'exportBox';
    box.readOnly = true;
    box.rows = 6;
    box.style.cssText = 'width:100%;margin-top:8px;font:12px var(--mono);background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:6px';
    $('btnExport').parentElement.appendChild(box);
  }
  box.value = exportJson();
  box.select();
});
$('btnReset').addEventListener('click', () => {
  reset();
  renderStats();
});

try {
  $('chkCtx').checked = localStorage.getItem('ekg-ctx') === '1';
} catch (e) {
  /* ignore */
}
try {
  $('vCode').value = getCode();
} catch (e) {
  /* ignore */
}
renderStats();
setTab('read');
