import { generate } from './src/engine.js';
import { paperSvg } from './src/render.js';
import { SCENARIOS, CATEGORIES } from './src/scenarios.js';
import { measure, NORMAL_RANGES } from './src/measure.js';
import { mulberry32 } from './src/rng.js';
import { RHYTHMS, AXES, FINDINGS, TRUTH } from './src/truth.js';
import { CONTEXT } from './src/context.js';
import { LIVE, SEG_SECONDS } from './src/livescen.js';
import { grade, truthSummary, caseFacts } from './src/grade.js';
import { ERRORS, applyError, NOISE_FOR } from './src/errors.js';
import { record, stats, pick, exportJson, reset } from './src/store.js';
import { apiStatus, evaluate, getCode, setCode } from './src/api.js';
import { stepsFor, derive, answersToForm, labelOf, review, hintParams, checkStep } from './src/wizard.js';
import { hintText, wrongChoiceText, learnScore, FEHLER_CHECK } from './src/learn.js';
import { createZoom } from './src/zoom.js';
import { t, getLang, setLang, onLang, applyDom, dec } from './src/i18n.js';

const $ = (id) => document.getElementById(id);
const LEVELS = ['rs', 'notsan', 'arzt', 'experte'];
function savedLevel() {
  try {
    const v = localStorage.getItem('ekg-level');
    if (LEVELS.includes(v)) return v;
  } catch (e) {
    /* ignore */
  }
  return 'rs';
}
const state = {
  level: savedLevel(),
  tab: 'read',
  sc: SCENARIOS[0],
  seedOffset: 0,
  noise: 'low',
  mode: 'paper',
  sig: null,
  graded: false,
  quiz: { blitz: false, n: 0, right: 0, t0: 0, answered: false },
};

function loadLearn() {
  try {
    return localStorage.getItem('ekg-learn') === '1';
  } catch (e) {
    return false;
  }
}
const learn = { on: loadLearn(), hints: 0, mistakes: 0 };
const learnOn = () => learn.on && !state.quiz.blitz;

// ---------- helpers ----------
const level = () => state.level;
const catIdx = () => ($('cat').value === '' ? null : Number($('cat').value));
function pool() {
  const max = LEVELS.indexOf(level());
  const c = catIdx();
  return SCENARIOS.filter((s) => LEVELS.indexOf(s.level) <= max && (c === null || s.cat === c));
}
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const mm = (v) => (v * 10).toFixed(1);
function fmt(v, lo, hi) {
  const ok = v >= lo && v <= hi;
  return `<span style="color:var(${ok ? '--ok' : '--warn'})">${v}</span>`;
}

// ---------- static fills ----------
const ttl = (sc) => t(sc.title);
const sols = (sc) => sc.solution.map((x) => t(x));
const li = (list) => list.map((x) => `<li>${esc(x)}</li>`).join('');

function fillStatic() {
  const cat = $('cat').value;
  $('cat').innerHTML = `<option value="">${esc(t('alle Kategorien'))}</option>` + CATEGORIES.map((c, i) => `<option value="${i}">${esc(t(c))}</option>`).join('');
  $('cat').value = cat;
  const pick1 = `<option value="">${esc(t('bitte wählen'))}</option>`;
  $('fRhythm').innerHTML = pick1 + RHYTHMS.map((r) => `<option value="${r[0]}">${esc(t(r[1]))}</option>`).join('');
  $('fAxis').innerHTML = pick1 + AXES.map((a) => `<option value="${a[0]}">${esc(t(a[1]))}</option>`).join('');
  $('fFind').innerHTML = Object.entries(FINDINGS)
    .map(([id, f]) => `<label><input type="checkbox" value="${id}"> ${esc(t(f[0]))}</label>`)
    .join('');
}
fillStatic();

function fillScenarios() {
  const sel = $('scenario');
  sel.innerHTML = '';
  CATEGORIES.forEach((cat, ci) => {
    const list = SCENARIOS.filter((s) => s.cat === ci);
    if (!list.length) return;
    const g = document.createElement('optgroup');
    g.label = t(cat);
    for (const s of list) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = ttl(s);
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
  for (const a of atr) out.push({ t0: a.t, t1: a.t + 0.1, color: '#1f5fa8', label: first++ < 2 ? t('P') : '' });
  first = 0;
  for (let bi = 0; bi < vent.length; bi++) {
    const b = vent[bi];
    const next = vent[bi + 1] ? vent[bi + 1].t - 0.03 : Infinity;
    const lab = first++ < 2;
    const pvc = b.morph === 'pvc';
    out.push({ t0: b.t, t1: b.t + (pvc ? 0.14 : D), color: '#a8201a', label: lab ? (pvc ? t('VES') : t('QRS')) : '' });
    const qt = Math.max(0.2, sig.morph.qtc * Math.cbrt(b.rr || 0.8));
    out.push({ t0: b.t + (pvc ? 0.14 : D), t1: Math.min(b.t + qt, next), color: '#1f6b3a', label: lab ? t('ST und T') : '', low: true });
  }
  return out;
}

function updateStageInfo() {
  const mon = state.mode === 'monitor';
  $('btnZoom').disabled = mon;
  $('stageInfo').textContent = mon ? `${t('Monitor, Ableitung II')} · ${$('gain').value} mm/mV` : `${t('12 Ableitungen')} · ${$('speed').value} mm/s · ${$('gain').value} mm/mV · ${t('Frequenz = {n} geteilt durch große Kästchen', { n: Number($('speed').value) * 12 })}`;
}

function redrawPaper() {
  updateStageInfo();
  if (!state.sig) return;
  const marks = tools.explain ? marksFor(state.sig) : [];
  state.svgStr = paperSvg(state.sig, { speed: Number($('speed').value), gain: Number($('gain').value), marks });
  $('paper').innerHTML = state.svgStr;
  const svg = $('paper').querySelector('svg');
  if (svg) {
    svg.classList.toggle('cal', tools.caliper);
    svg.classList.toggle('zoomable', !tools.caliper);
  }
  if (zoomUi.open) zoomer.load(state.svgStr, true);
  drawCaliper();
}

const zoomUi = { open: false };
let zoomer = null;

function svgPoint(e) {
  if (zoomUi.open) return zoomer.point(e);
  const svg = $('paper').querySelector('svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [q.x, q.y];
}

function setCalText(text, html) {
  for (const id of ['calRead', 'zoomRead']) {
    if (html) $(id).innerHTML = html;
    else $(id).textContent = text;
  }
}

function drawCaliper() {
  const svgs = [$('paper').querySelector('svg'), zoomUi.open ? zoomer.svg() : null].filter(Boolean);
  for (const svg of svgs) {
    const old = svg.querySelector('#calLayer');
    if (old) old.remove();
  }
  if (!svgs.length || !tools.pts.length) {
    setCalText(tools.caliper ? t('Messzirkel: zwei Punkte im EKG anklicken. Ein dritter Klick beginnt neu.') : '');
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
    const mv = dec((dy / gain).toFixed(2));
    setCalText('', t('Messzirkel: <b>{ms} ms</b> ({dx} mm waagerecht, entspricht {bpm}/min als Abstand), <b>{mv} mV</b> ({dy} mm senkrecht).', { ms, dx: dec(dx.toFixed(1)), bpm: ms ? Math.round(60000 / ms) : '-', mv, dy: dec(dy.toFixed(1)) }));
  } else {
    setCalText(t('Zweiten Punkt anklicken.'));
  }
  g += '</g>';
  for (const svg of svgs) svg.insertAdjacentHTML('beforeend', g);
}

function syncTools() {
  for (const id of ['btnCaliper', 'zCaliper']) $(id).setAttribute('aria-pressed', String(tools.caliper));
  for (const id of ['btnExplain', 'zExplain']) {
    $(id).setAttribute('aria-pressed', String(tools.explain));
    $(id).disabled = $('btnExplain').disabled;
  }
  $('zoom').classList.toggle('cal', tools.caliper);
}
function toggleCaliper() {
  tools.caliper = !tools.caliper;
  tools.pts = [];
  syncTools();
  redrawPaper();
}
function toggleExplain() {
  if ($('btnExplain').disabled) return;
  tools.explain = !tools.explain;
  syncTools();
  redrawPaper();
}
function openZoom() {
  if (state.mode !== 'paper' || !state.svgStr || !$('paper').querySelector('svg')) return;
  zoomUi.open = true;
  $('zoom').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  zoomer.load(state.svgStr, false);
  syncTools();
  drawCaliper();
  $('zClose').focus();
}
function closeZoom() {
  if (!zoomUi.open) return;
  zoomUi.open = false;
  $('zoom').classList.add('hidden');
  document.body.style.overflow = '';
  drawCaliper();
}

function setExplainAvail(avail, reset = false) {
  const was = tools.explain;
  $('btnExplain').disabled = !avail;
  if (!avail || reset) tools.explain = false;
  syncTools();
  if (was && !tools.explain) redrawPaperIfReady();
}
function redrawPaperIfReady() {
  if (state.sig && $('paper').querySelector('svg')) redrawPaper();
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
const LEVEL_DE = { rs: 'Rettungssanitäter', notsan: 'Notfallsanitäter', arzt: 'Arzt', experte: 'Experte' };
// English names carry the German job title as a hint, except for Expert.
const levelName = (l) => (getLang() === 'en' && l !== 'experte' ? `${t(LEVEL_DE[l])} (${LEVEL_DE[l]})` : t(LEVEL_DE[l]));
const read = { mode: 'wz', wz: { a: {}, i: 0 }, step: 0, alt: false, status: undefined };
const ST_STEPS = 3;

function readMode() {
  if (level() === 'rs') return 'wz';
  if (level() === 'notsan') return 'steps';
  return read.alt ? 'steps' : 'free';
}

function dots(el, total, cur) {
  el.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"></i>`).join('');
}

function resetRead() {
  setExplainAvail(false);
  state.graded = false;
  read.mode = readMode();
  for (const [m, id] of [['wz', 'modeWz'], ['steps', 'modeSteps'], ['free', 'modeFree']]) $(id).classList.toggle('hidden', m !== read.mode);
  $('result').classList.add('hidden');
  $('btnNext').classList.add('hidden');
  const kind = { wz: 'Schritt für Schritt', steps: 'Schritt-Formular', free: 'Freitext, ausgewertet von Claude' }[read.mode];
  $('readTag').textContent = `${levelName(level())}: ${t(kind)}`;
  if (read.mode === 'wz') {
    read.wz = { a: {}, i: 0 };
    renderWz();
  } else if (read.mode === 'steps') {
    $('fRhythm').value = '';
    $('fRate').value = '';
    $('fAxis').value = '';
    $('fQrs').value = '';
    for (const c of $('fFind').querySelectorAll('input')) c.checked = false;
    setFormDisabled(false);
    read.step = 0;
    showStep();
    $('stFree').classList.toggle('hidden', level() === 'rs' || level() === 'notsan');
  } else {
    $('freeText').value = '';
    $('freeText').disabled = false;
    $('freeGo').disabled = false;
    $('freeGo').classList.remove('hidden');
    $('freeAlt').classList.remove('hidden');
    $('freeErr').classList.add('hidden');
    $('freeHint').textContent = '';
    $('fGuide').innerHTML = li(GUIDE[level()].map((x) => t(x)));
    checkStatus();
  }
}

const GUIDE = {
  arzt: ['Rhythmus, Frequenz, Regelmäßigkeit', 'Lagetyp', 'P-Welle und PQ-Zeit', 'QRS-Breite und Morphologie', 'ST-Strecke und T-Welle, regional zugeordnet', 'QT-Zeit', 'Zusammenfassende Beurteilung'],
  experte: ['Rhythmus, Frequenz, Überleitung', 'Lagetyp und Hinweise auf Blöcke', 'P-Welle, PQ, QRS-Morphologie, Zeiten', 'ST-T je Region mit Spiegelbildern', 'Besonderheiten (Delta, Epsilon, U, Brugada und andere)', 'Differenzialdiagnosen', 'Klinische Konsequenz'],
};

async function checkStatus() {
  if (read.status === undefined) read.status = await apiStatus();
  const st = read.status;
  $('vCodeWrap').classList.toggle('hidden', !(st && st.needsCode));
  if (read.mode !== 'free') return;
  if (!st) showFreeErr(t('Der Server ist nicht erreichbar. Nutze solange das Schritt-Formular.'));
  else if (!st.evaluate) showFreeErr(t('Die Bewertung ist auf dem Server noch nicht eingerichtet. Nutze solange das Schritt-Formular.'));
}
function showFreeErr(msg) {
  $('freeErr').textContent = msg;
  $('freeErr').classList.remove('hidden');
}

function readCase() {
  newCase();
  resetRead();
  showContext();
  resetLearn();
  if ($('work').getBoundingClientRect().top < 0) $('work').scrollIntoView({ block: 'start' });
}

// ----- wizard (Rettungssanitäter)
function renderWz() {
  const w = read.wz;
  const steps = stepsFor(w.a);
  dots($('wzDots'), steps.length + 1, w.i);
  $('wzBack').disabled = w.i === 0;
  const done = steps.slice(0, w.i).map((s) => (s.id === 'rate' ? t('{n}/min', { n: w.a.rate }) : labelOf(s.id, w.a[s.id])));
  $('wzSum').innerHTML = done.map((x) => `<span>${esc(x)}</span>`).join('');
  if (w.fb) {
    $('wzBack').disabled = false;
    $('wzBody').innerHTML = `<div class="fbstep ${w.fb.ok ? 'ok' : 'bad'}"><strong>${esc(t(w.fb.ok ? 'Richtig.' : 'Nicht ganz.'))}</strong> ${esc(w.fb.text)}</div><div class="actions"><button class="primary" data-fbnext="1">${esc(t('Weiter'))}</button></div>`;
    return;
  }
  if (w.i >= steps.length) {
    const sug = derive(w.a);
    $('wzBody').innerHTML = `<p class="wq">${esc(t('Dein Befund'))}</p><p class="wh">${esc(t('Aus Deinen Antworten ergibt sich dieser Rhythmus. Du kannst ihn ändern, bevor Du auswertest.'))}</p>
      <label>${esc(t('Rhythmus'))}<select id="wzRhythm">${RHYTHMS.map((r) => `<option value="${r[0]}"${r[0] === sug ? ' selected' : ''}>${esc(t(r[1]))}</option>`).join('')}</select></label>
      <div class="actions"><button class="primary" data-go="1">${esc(t('Auswerten'))}</button></div>`;
    return;
  }
  const s = steps[w.i];
  let body = `<p class="wq">${esc(t(s.q))}</p><p class="wh">${esc(s.hint ? t(s.hint, hintParams(Number($('speed').value))) : '')}</p>`;
  if (s.type === 'number') {
    body += `<div class="numrow"><input type="number" id="wzRate" min="10" max="400" inputmode="numeric" value="${esc(w.a.rate ?? '')}" aria-label="${esc(t('Frequenz pro Minute'))}"><span class="small">${esc(t('pro Minute'))}</span><button class="primary" data-rate="1">${esc(t('Weiter'))}</button></div><div class="small" id="wzErr" style="margin-top:6px"></div>`;
  } else {
    body += `<div class="big">${s.opts.map(([v, x]) => `<button data-v="${v}" class="${w.a[s.id] === v ? 'sel' : ''}">${esc(t(x))}</button>`).join('')}</div>`;
  }
  $('wzBody').innerHTML = body;
  const inp = $('wzRate');
  if (inp) inp.focus({ preventScroll: true });
}
function wzAnswer(v) {
  const w = read.wz;
  const s = stepsFor(w.a)[w.i];
  w.a[s.id] = v;
  if (learnOn()) {
    const facts = caseFacts(state.sig, state.sc);
    if (s.id === 'rate' && facts.rate === null) {
      w.fb = { ok: false, text: t('In diesem EKG gibt es keine einzelnen QRS-Komplexe, eine Frequenz ist nicht messbar.') };
    } else if (s.id === 'rate') {
      const ok = Math.abs(Number(v) - facts.rate) <= Math.max(5, 0.1 * facts.rate);
      const speed = Number($('speed').value);
      w.fb = { ok, text: ok ? t('Passt. Gemessen sind etwa {n}/min.', { n: facts.rate }) : t('Gemessen sind etwa {n}/min. Rechne bei {s} mm/s: {k} geteilt durch die Zahl großer Kästchen zwischen zwei R-Zacken.', { n: facts.rate, s: speed, k: speed * 12 }) };
    } else {
      const c = checkStep(s.id, v, facts);
      w.fb = { ok: c.ok, text: c.ok ? c.why : `${t('Richtig wäre:')} ${c.right}. ${c.why}` };
    }
    renderWz();
    return;
  }
  w.i += 1;
  renderWz();
}
function wzRate() {
  const v = Number($('wzRate').value);
  if (!Number.isFinite(v) || $('wzRate').value === '' || v < 10 || v > 400) {
    $('wzErr').textContent = t('Gib eine Frequenz zwischen 10 und 400 ein.');
    return;
  }
  wzAnswer(String(Math.round(v)));
}
function gradeWz() {
  const a = read.wz.a;
  const ans = answersToForm(a, $('wzRhythm').value);
  const g = grade(state.sig, state.sc, ans, 'rs');
  const route = review(a, caseFacts(state.sig, state.sc));
  finishRead(g, route);
}

// ----- step form (Notfallsanitäter)
function showStep() {
  for (const el of $('form').querySelectorAll('.fstep')) el.classList.toggle('hidden', Number(el.dataset.step) !== read.step);
  dots($('stDots'), ST_STEPS, read.step);
  $('stBack').disabled = read.step === 0;
  $('stNext').textContent = t(read.step === ST_STEPS - 1 ? 'Auswerten' : 'Weiter');
}
function stepNext() {
  if (read.step === 0 && !$('fRhythm').value) {
    $('fRhythm').focus();
    return;
  }
  if (read.step < ST_STEPS - 1) {
    read.step += 1;
    showStep();
  } else gradeSteps();
}
function setFormDisabled(d) {
  for (const el of $('form').querySelectorAll('select,input')) el.disabled = d;
}
function gradeSteps() {
  const ans = {
    rhythm: $('fRhythm').value,
    rate: $('fRate').value,
    axis: $('fAxis').value,
    qrs: $('fQrs').value,
    findings: [...$('fFind').querySelectorAll('input:checked')].map((c) => c.value),
  };
  finishRead(grade(state.sig, state.sc, ans, level()), null);
  setFormDisabled(true);
}

// ----- free text (Arzt, Experte)
async function gradeFree() {
  const text = $('freeText').value.trim();
  $('freeErr').classList.add('hidden');
  if (text.length < 8) {
    $('freeHint').textContent = t('Schreibe zuerst Deinen Befund.');
    return;
  }
  $('freeHint').innerHTML = `<span class="spin"></span>${esc(t('Claude bewertet den Befund ...'))}`;
  $('freeGo').disabled = true;
  try {
    const ctxText = $('chkCtx').checked ? CONTEXT[state.sc.id] : undefined;
    const b = await evaluate({ text, level: level(), lang: getLang(), fall: truthSummary(state.sig, state.sc, ctxText) });
    const pct = Math.max(0, Math.min(100, Math.round(Number(b.punkte) || 0)));
    $('result').innerHTML = freeResultHtml(b, pct);
    afterGrade(pct);
    $('freeText').disabled = true;
    $('freeGo').classList.add('hidden');
    $('freeAlt').classList.add('hidden');
    $('freeHint').textContent = '';
  } catch (e) {
    showFreeErr(e.message);
    if (e.kind === 'access_code') $('vCodeWrap').classList.remove('hidden');
    $('freeHint').textContent = t('Der Text bleibt erhalten, Du kannst es erneut versuchen.');
    $('freeGo').disabled = false;
  }
}

function freeResultHtml(b, pct) {
  const rows = (b.items || [])
    .map(
      (i) => `<div class="res-item"><div class="res-head"><span>${esc(i.aspekt)}</span><span class="verdict v-${esc(i.urteil)}">${esc(t(i.urteil))}</span></div>
      <div class="cols"><div><span>${esc(t('Du hast geschrieben'))}</span>${esc(i.gesagt)}</div><div><span>${esc(t('Erwartet'))}</span>${esc(i.erwartet)}</div></div>
      ${i.kommentar ? `<div class="small" style="margin-top:4px">${esc(i.kommentar)}</div>` : ''}</div>`,
    )
    .join('');
  const invented = (b.erfunden || []).length
    ? `<div class="res-item"><div class="res-head"><span>${esc(t('Nicht zum EKG passend'))}</span></div><ul class="sol">${li(b.erfunden)}</ul></div>`
    : '';
  return `<div class="score">${pct} %</div><p style="margin:6px 0 10px">${esc(b.zusammenfassung)}</p>${rows}${invented}
    <div class="res-item"><div class="res-head"><span>${esc(t('Musterbefund'))}</span></div><blockquote>${esc(b.musterbefund)}</blockquote></div>
    <div class="res-item"><div class="res-head"><span>${esc(t('Lösung im Zusammenhang'))}</span></div><ul class="sol">${li(sols(state.sc))}</ul></div>`;
}

// ----- shared result
function afterGrade(pct) {
  state.graded = true;
  setExplainAvail(true);
  const used = learnOn() ? learn.hints : 0;
  record(state.sc.id, used ? Math.round(pct * (1 - 0.15 * used)) : pct, 'read');
  if (learnOn()) {
    closeLearnRound('read');
    if (!tools.explain) toggleExplain();
  }
  $('result').classList.remove('hidden');
  $('btnNext').classList.remove('hidden');
  renderStats();
  $('side').scrollTop = 0;
}

function finishRead(g, route) {
  const rows = g.items
    .map((i) => {
      let extra = '';
      if (i.reasons && i.reasons.length) extra += `<div class="small">${esc(t('Übersehen:'))} ${i.reasons.map(esc).join(' ')}</div>`;
      if (i.extra && i.extra.length) extra += `<div class="small">${esc(t('Nicht zutreffend angekreuzt:'))} ${i.extra.map(esc).join(', ')}</div>`;
      if (i.note) extra += `<div class="small">${esc(i.note)}</div>`;
      return `<div class="res-item"><div class="res-head"><span>${esc(i.label)}</span><span class="${i.ok ? 'ok' : 'bad'}">${esc(t('{pts} von {max}', { pts: i.pts, max: i.max }))}</span></div>
        <div class="small">${esc(t('Deine Antwort:'))} ${esc(i.answer)}</div><div class="small">${esc(t('Richtig:'))} ${esc(i.right)}</div>${extra}</div>`;
    })
    .join('');
  const path = route
    ? `<div class="res-item"><div class="res-head"><span>${esc(t('Dein Weg'))}</span></div><ul class="route">${route
        .map((r) => `<li><span class="mk ${r.ok ? 'ok' : 'bad'}" aria-label="${esc(t(r.ok ? 'richtig' : 'falsch'))}">${r.ok ? '✓' : '✗'}</span><span><b>${esc(r.label)}:</b> ${esc(r.mine)}${r.ok ? '' : `. ${esc(t('Richtig wäre:'))} ${esc(r.right)}`}<br><span class="small">${esc(r.why)}</span></span></li>`)
        .join('')}</ul></div>`
    : '';
  $('result').innerHTML = `<div class="score">${g.pct} %</div><div class="small">${esc(ttl(state.sc))}</div>${path}${rows}
    <div class="res-item"><div class="res-head"><span>${esc(t('Lösung im Zusammenhang'))}</span></div><ul class="sol">${li(sols(state.sc))}</ul></div>`;
  if (read.mode === 'wz') $('modeWz').classList.add('hidden');
  afterGrade(g.pct);
}

// ---------- Learn mode ----------
const HINT_IDS = { read: 'hintRead', quiz: 'hintQuiz', fehler: 'hintFehler' };
const roundOpen = (kind) => (kind === 'read' ? !state.graded : kind === 'quiz' ? !state.quiz.answered : !err.answered);

function resetLearn() {
  learn.hints = 0;
  learn.mistakes = 0;
  for (const [kind, id] of Object.entries(HINT_IDS)) {
    const bar = $(id);
    bar.classList.toggle('hidden', !(learnOn() && state.tab === kind && roundOpen(kind)));
    const box = bar.querySelector('.hintbox');
    box.classList.add('hidden');
    box.innerHTML = '';
    bar.querySelector('button').disabled = false;
  }
}
function closeLearnRound(kind) {
  $(HINT_IDS[kind]).classList.add('hidden');
}
// Cross out wrong options, but always leave the right one and at least one wrong one.
function eliminate(container, rightId, count) {
  const wrong = [...container.querySelectorAll('button:not(:disabled)')].filter((b) => b.dataset.id !== rightId);
  const k = Math.min(count, wrong.length - 1);
  wrong.sort(() => Math.random() - 0.5).slice(0, Math.max(0, k)).forEach((b) => {
    b.disabled = true;
    b.classList.add('gone');
  });
}
function showHint(kind) {
  const max = kind === 'fehler' ? 2 : 3;
  if (learn.hints >= max || !learnOn()) return;
  learn.hints += 1;
  const n = learn.hints;
  const bar = $(HINT_IDS[kind]);
  let text;
  if (kind === 'fehler') text = n === 1 ? t(FEHLER_CHECK) : t('Die Hälfte der falschen Antworten ist jetzt ausgeblendet.');
  else text = hintText(n, kind, state.sig, state.sc, level());
  const box = bar.querySelector('.hintbox');
  box.classList.remove('hidden');
  box.insertAdjacentHTML('beforeend', `<p>${esc(text)}</p>`);
  if (kind === 'quiz' && n === 3) eliminate($('opts'), state.sc.id, 2);
  if (kind === 'fehler' && n === 2) eliminate($('errOpts'), err.cur[0], Math.floor(ERRORS.length / 2));
  if (n >= max) bar.querySelector('button').disabled = true;
}
function showWrongFeedback(box, html) {
  box.innerHTML = html;
  box.classList.remove('hidden');
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
  $('opts').innerHTML = options.map((s) => `<button data-id="${s.id}">${esc(ttl(s))}</button>`).join('');
  $('quizFb').classList.add('hidden');
  $('btnQNext').classList.add('hidden');
  $('quizHint').textContent = state.quiz.blitz ? t('Blitz: Frage {n} von 10', { n: state.quiz.n + 1 }) : '';
  resetLearn();
}

function quizAnswer(id) {
  if (state.quiz.answered) return;
  const right = id === state.sc.id;
  const help = learnOn();
  if (help && !right) {
    learn.mistakes += 1;
    const b = $('opts').querySelector(`button[data-id="${id}"]`);
    b.classList.add('wrong');
    b.disabled = true;
    const opt = SCENARIOS.find((s) => s.id === id);
    showWrongFeedback($('quizFb'), `<strong class="bad">${esc(t('Nicht ganz.'))}</strong> ${esc(wrongChoiceText(opt, state.sig, state.sc, level()))}<div class="small">${esc(t('Versuche es noch einmal.'))}</div>`);
    return;
  }
  state.quiz.answered = true;
  setExplainAvail(true);
  for (const b of $('opts').querySelectorAll('button')) {
    if (b.dataset.id === state.sc.id) b.classList.add('right');
    else if (b.dataset.id === id) b.classList.add('wrong');
  }
  record(state.sc.id, help ? learnScore(learn.mistakes, learn.hints) : right ? 100 : 0, 'quiz');
  if (help) {
    closeLearnRound('quiz');
    if (!tools.explain) toggleExplain();
  }
  state.quiz.n += 1;
  if (right) state.quiz.right += 1;
  $('quizFb').innerHTML = `<strong class="${right ? 'ok' : 'bad'}">${esc(t(right ? 'Richtig.' : 'Nicht ganz.'))}</strong> ${esc(ttl(state.sc))}<ul class="sol">${li(sols(state.sc))}</ul>`;
  $('quizFb').classList.remove('hidden');
  if (state.quiz.blitz && state.quiz.n >= 10) {
    const sec = Math.round((Date.now() - state.quiz.t0) / 1000);
    $('quizHint').textContent = t('Blitz beendet: {r} von 10 richtig in {s} s.', { r: state.quiz.right, s: sec });
    state.quiz.blitz = false;
    state.quiz.n = 0;
    state.quiz.right = 0;
    $('btnBlitz').setAttribute('aria-pressed', 'false');
  }
  $('btnQNext').classList.remove('hidden');
  renderStats();
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
  $('errOpts').innerHTML = ERRORS.map((e) => `<button data-id="${e[0]}">${esc(t(e[1]))}</button>`).join('');
  $('errFb').classList.add('hidden');
  $('btnErrNext').classList.add('hidden');
  resetLearn();
}
function errorAnswer(id) {
  if (err.answered) return;
  const right = id === err.cur[0];
  const help = learnOn();
  if (help && !right) {
    learn.mistakes += 1;
    const b = $('errOpts').querySelector(`button[data-id="${id}"]`);
    b.classList.add('wrong');
    b.disabled = true;
    const opt = ERRORS.find((e) => e[0] === id);
    showWrongFeedback($('errFb'), `<strong class="bad">${esc(t('Nicht ganz.'))}</strong> ${esc(t('Das wäre: {l}', { l: t(opt[1]) }))}<div class="small">${esc(t(opt[2]))}</div><div class="small">${esc(t('Versuche es noch einmal.'))}</div>`);
    return;
  }
  err.answered = true;
  for (const b of $('errOpts').querySelectorAll('button')) {
    if (b.dataset.id === err.cur[0]) b.classList.add('right');
    else if (b.dataset.id === id) b.classList.add('wrong');
  }
  record('fehler-' + err.cur[0], help ? learnScore(learn.mistakes, learn.hints) : right ? 100 : 0, 'fehler');
  if (help) closeLearnRound('fehler');
  setExplainAvail(false);
  $('errFb').innerHTML = `<strong class="${right ? 'ok' : 'bad'}">${esc(t(right ? 'Richtig.' : 'Nicht ganz.'))}</strong> ${esc(t(err.cur[1]))}<div class="small">${esc(t(err.cur[2]))}</div>`;
  $('errFb').classList.remove('hidden');
  $('btnErrNext').classList.remove('hidden');
  renderStats();
}

// ---------- Monitor live ----------
const live = { running: false, total: 0, story: null, answers: [] };
const MON_RHYTHMS = [...RHYTHMS, ['pvc', 'Sinusrhythmus mit Extrasystolen']];
const monTruth = (id) => (TRUTH[id].findings.includes('pvc') ? 'pvc' : TRUTH[id].rhythm);
const monLabel = (r) => t(MON_RHYTHMS.find((x) => x[0] === r)[1]);

function liveSetup() {
  $('liveStory').innerHTML = LIVE.map((l, i) => `<option value="${i}">${esc(t('Szenario {n}', { n: i + 1 }))}</option>`).join('');
  $('liveAns').innerHTML = MON_RHYTHMS.map((r) => `<option value="${r[0]}">${esc(t(r[1]))}</option>`).join('');
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
  $('liveLog').textContent = t('Läuft. Beim Rhythmuswechsel sofort ansagen.');
  setMode('monitor');
  startMonitor();
}

function liveAnswer() {
  if (!live.running) return;
  live.answers.push({ t: monClock, r: $('liveAns').value });
  $('liveLog').textContent = t('Angesagt: {r}', { r: monLabel($('liveAns').value) });
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
      const when = okA ? t('erkannt nach {s} s', { s: dec(Math.max(0, okA.t - a0).toFixed(1)) }) : t('nicht erkannt');
      return `<div class="res-item"><div class="res-head"><span>${esc(t('Abschnitt {n}: {r}', { n: i + 1, r: monLabel(truth) }))}</span><span class="${okA ? 'ok' : 'bad'}">${esc(when)}</span></div>${wrong ? `<div class="small">${esc(t('{n} falsche Ansage(n) in diesem Abschnitt', { n: wrong }))}</div>` : ''}</div>`;
    })
    .join('');
  $('liveRes').innerHTML = `<div class="score">${esc(t('{a} von {b}', { a: hits, b: live.story.segs.length }))}</div><div class="small">${esc(t(live.story.title))}</div>${rows}`;
  $('liveRes').classList.remove('hidden');
  renderStats();
}

function showContext() {
  const on = $('chkCtx').checked && (state.tab === 'read' || state.tab === 'quiz');
  const ctx = CONTEXT[state.sc.id];
  if (on && ctx) {
    $('ctxBox').innerHTML = `<span class="k">${esc(t('Fallvignette'))}</span><span class="v">${esc(t(ctx))}</span>`;
    $('ctxBox').classList.remove('hidden');
  } else $('ctxBox').classList.add('hidden');
}

// ---------- Katalog ----------
function runCatalog() {
  build();
  const m = measure(state.sig);
  const normal = state.sc.id === 'sinus';
  $('kv').innerHTML = `<span>${esc(t('Frequenz'))} <b>${m.hr ?? '-'}</b>/min</span>${m.hr === null ? '' : `<span>${esc(t('QRS-Breite'))} <b>${m.qrsMs}</b> ms</span>`}<span>${esc(t('Lagetyp (QRS-Achse)'))} <b>${normal ? fmt(m.axis, ...NORMAL_RANGES.axis) : m.axis}</b>&deg;</span>`;
  let rows = `<tr><th>${esc(t('Ableitung'))}</th><th>R (mm)</th><th>S (mm)</th><th>ST +60 ms (mm)</th><th>T (mm)</th></tr>`;
  for (const l of m.perLead) rows += `<tr><td>${l.name}</td><td>${mm(l.r)}</td><td>${mm(l.s)}</td><td>${mm(l.st)}</td><td>${mm(l.t)}</td></tr>`;
  $('tbl').innerHTML = rows;
  $('rangeNote').textContent = t(
    normal
      ? 'Farbig: Lagetyp gegen den Erwachsenen-Normbereich von -30 bis 90 Grad. Das ist eine Plausibilitätsprüfung, kein Beweis, dass ein Bild echt aussieht.'
      : 'Werte stammen aus dem simulierten Signal ohne Störungen. Für pathologische Fälle gibt es keine allgemeinen Normbereiche, hier zählt der Vergleich mit dem erwarteten Befundmuster.',
  );
  $('sol').innerHTML = li(sols(state.sc));
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
    const tm = (now - monT0) / 1000;
    monClock = tm;
    if (state.tab === 'live' && live.running && tm >= live.total) {
      finishLive();
      return;
    }
    const cyc = Math.floor(tm / sweep);
    const phase = (tm % sweep) / sweep;
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
    ctx.font = '600 20px Hanken Grotesk, Arial, sans-serif';
    ctx.fillText('II', 24, 36);
    if (showHr) {
      ctx.font = '700 56px Hanken Grotesk, Arial, sans-serif';
      ctx.fillText(String(m.hr ?? '--'), W - 170, 74);
      ctx.font = '16px Hanken Grotesk, Arial, sans-serif';
      ctx.fillText(t('HF /min'), W - 168, 98);
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}

function setMode(mode) {
  if (state.tab === 'fehler') mode = 'paper';
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
  $('statline').innerHTML = s.done
    ? `<div>${esc(t('bearbeitet'))}: <b>${s.done}</b></div><div>${esc(t('Schnitt'))}: <b>${s.avg} %</b></div><div>${esc(t('fällig'))}: <b>${s.due}</b></div>`
    : `<div>${esc(t('Noch kein Fall bearbeitet'))}</div>`;
}

const PANELS = { read: 'panelRead', quiz: 'panelQuiz', fehler: 'panelFehler', live: 'panelLive', cat: 'panelCat' };
const TITLES = { read: 'Befunden', quiz: 'Quiz', live: 'Monitor live', fehler: 'Fehlerquellen', cat: 'Katalog und Realismus' };

function updateHead() {
  const tab = state.tab;
  $('pageTitle').textContent = t(TITLES[tab]);
  const trainer = tab === 'read' || tab === 'quiz';
  const c = catIdx();
  $('pageMeta').textContent = trainer ? `${levelName(level())} · ${c === null ? t('alle Kategorien') : t(CATEGORIES[c])}${learn.on ? ` · ${t('Lernmodus')}` : ''}` : '';
  for (const b of $('levels').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.level === level()));
}

function setTab(tab) {
  const prev = state.tab;
  state.tab = tab;
  if (prev === 'live' && tab !== 'live') {
    live.running = false;
    setMode('paper');
  }
  for (const b of $('nav').querySelectorAll('button')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  for (const [k, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', k !== tab);
  if (tab !== 'read' && tab !== 'quiz') $('ctxBox').classList.add('hidden');
  const trainer = tab === 'read' || tab === 'quiz';
  $('work').classList.toggle('single', tab === 'cat');
  $('wLevel').classList.toggle('hidden', !trainer);
  $('wLearn').classList.toggle('hidden', !(trainer || tab === 'fehler'));
  $('wCat').classList.toggle('hidden', !trainer);
  $('wCtx').classList.toggle('hidden', !trainer);
  $('btnNew').classList.toggle('hidden', !(trainer || tab === 'fehler'));
  const noMode = tab === 'fehler';
  $('modeWrap').classList.toggle('hidden', noMode || tab === 'live');
  if (noMode) setMode('paper');
  updateHead();
  if (tab === 'read') readCase();
  else if (tab === 'quiz') quizQuestion();
  else if (tab === 'fehler') errorCase();
  else if (tab === 'live') {
    setExplainAvail(false);
    liveSetup();
  } else {
    fillScenarios();
    setExplainAvail(true);
    runCatalog();
  }
}

// ---------- events ----------
$('nav').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setTab(b.dataset.tab);
});
$('levels').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.level === state.level) return;
  state.level = b.dataset.level;
  try {
    localStorage.setItem('ekg-level', state.level);
  } catch (err) {
    /* ignore */
  }
  read.alt = false;
  setTab(state.tab);
});
$('btnNew').addEventListener('click', () => {
  if (state.tab === 'read') readCase();
  else if (state.tab === 'quiz') quizQuestion();
  else if (state.tab === 'fehler') errorCase();
});
for (const b of document.querySelectorAll('[data-lang-btn]')) b.addEventListener('click', () => setLang(b.dataset.langBtn));
onLang(() => {
  fillStatic();
  renderStats();
  setTab(state.tab);
  $('solToggle').textContent = t($('solToggle').getAttribute('aria-pressed') === 'true' ? 'Lösung verbergen' : 'Lösung zeigen');
});
document.addEventListener('click', (e) => {
  const d = $('wMore');
  if (d.open && !d.contains(e.target)) d.open = false;
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
function placePoint(e) {
  if (tools.pts.length >= 2) tools.pts = [];
  tools.pts.push(svgPoint(e));
  drawCaliper();
}
zoomer = createZoom($('zoomView'), { onTap: (e) => tools.caliper && placePoint(e), allowDouble: () => !tools.caliper });
$('btnCaliper').addEventListener('click', toggleCaliper);
$('zCaliper').addEventListener('click', toggleCaliper);
$('btnExplain').addEventListener('click', toggleExplain);
$('zExplain').addEventListener('click', toggleExplain);
$('btnZoom').addEventListener('click', openZoom);
$('zClose').addEventListener('click', closeZoom);
$('zIn').addEventListener('click', () => zoomer.zoomBy(1.5));
$('zOut').addEventListener('click', () => zoomer.zoomBy(1 / 1.5));
$('zReset').addEventListener('click', () => zoomer.reset());
document.addEventListener('keydown', (e) => {
  if (!zoomUi.open) return;
  if (e.key === 'Escape') closeZoom();
  else if (e.key === '+' || e.key === '=') zoomer.zoomBy(1.4);
  else if (e.key === '-') zoomer.zoomBy(1 / 1.4);
  else if (e.key === '0') zoomer.reset();
});
$('paper').addEventListener('click', (e) => {
  if (!$('paper').querySelector('svg')) return;
  if (tools.caliper) placePoint(e);
  else openZoom();
});
$('wzBody').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.v) wzAnswer(b.dataset.v);
  else if (b.dataset.rate) wzRate();
  else if (b.dataset.go) gradeWz();
  else if (b.dataset.fbnext) {
    read.wz.fb = null;
    read.wz.i += 1;
    renderWz();
  }
});
$('wzBody').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'wzRate') wzRate();
});
$('wzBack').addEventListener('click', () => {
  if (read.wz.fb) {
    read.wz.fb = null;
    renderWz();
  } else if (read.wz.i > 0) {
    read.wz.i -= 1;
    renderWz();
  }
});
$('stNext').addEventListener('click', stepNext);
$('stBack').addEventListener('click', () => {
  if (read.step > 0) {
    read.step -= 1;
    showStep();
  }
});
$('stFree').addEventListener('click', () => {
  read.alt = false;
  readCase();
});
$('freeGo').addEventListener('click', gradeFree);
$('freeAlt').addEventListener('click', () => {
  read.alt = true;
  readCase();
});
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
$('cat').addEventListener('change', () => setTab(state.tab));
function refresh() {
  if (state.tab === 'fehler') redrawPaper();
  else if (state.tab === 'cat') runCatalog();
  else build();
}
$('noise').addEventListener('change', (e) => {
  state.noise = e.target.value;
  refresh();
});
$('speed').addEventListener('change', () => {
  refresh();
  if (state.tab === 'read' && read.mode === 'wz' && !state.graded) renderWz();
});
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
  $('solToggle').textContent = t(on ? 'Lösung verbergen' : 'Lösung zeigen');
  $('sol').classList.toggle('hidden', !on);
  $('solHidden').classList.toggle('hidden', on);
});
function syncLearn() {
  $('btnLearn').setAttribute('aria-pressed', String(learn.on));
}
$('btnLearn').addEventListener('click', () => {
  learn.on = !learn.on;
  try {
    localStorage.setItem('ekg-learn', learn.on ? '1' : '0');
  } catch (e) {
    /* ignore */
  }
  syncLearn();
  updateHead();
  resetLearn();
});
for (const b of document.querySelectorAll('.hintbar button')) b.addEventListener('click', () => showHint(b.dataset.hint));
$('btnExport').addEventListener('click', () => {
  let box = $('exportBox');
  if (!box) {
    box = document.createElement('textarea');
    box.id = 'exportBox';
    box.readOnly = true;
    box.rows = 6;
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
applyDom();
syncLearn();
renderStats();
setTab('read');
