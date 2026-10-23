import { generate } from './src/engine.js';
import { paperSvg } from './src/render.js';
import { SCENARIOS, CATEGORIES } from './src/scenarios.js';
import { measure, NORMAL_RANGES } from './src/measure.js';
import { mulberry32 } from './src/rng.js';
import { RHYTHMS, AXES, FINDINGS, TRUTH } from './src/truth.js';
import { grade } from './src/grade.js';
import { record, stats, pick, exportJson, reset } from './src/store.js';

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
  const max = LEVELS.indexOf(level());
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
  $('paper').innerHTML = paperSvg(state.sig, { speed: Number($('speed').value), gain: Number($('gain').value) });
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
  // the live rate number would give the answer away while reading, so it is only shown in the catalogue
  const showHr = state.tab === 'cat';

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
  state.mode = mode;
  $('paper').classList.toggle('hidden', mode !== 'paper');
  $('monitor').classList.toggle('hidden', mode !== 'monitor');
  $('modePaper').setAttribute('aria-pressed', String(mode === 'paper'));
  $('modeMonitor').setAttribute('aria-pressed', String(mode === 'monitor'));
  startMonitor();
}

// ---------- tabs and stats ----------
function renderStats() {
  const s = stats();
  $('statline').textContent = `Bearbeitet: ${s.done}   Schnitt: ${s.done ? s.avg + ' %' : '-'}   Fällig zur Wiederholung: ${s.due}`;
}

function setTab(tab) {
  state.tab = tab;
  for (const [id, t] of [['tabRead', 'read'], ['tabQuiz', 'quiz'], ['tabCat', 'cat']]) $(id).setAttribute('aria-pressed', String(t === tab));
  $('panelRead').classList.toggle('hidden', tab !== 'read');
  $('panelQuiz').classList.toggle('hidden', tab !== 'quiz');
  $('panelCat').classList.toggle('hidden', tab !== 'cat');
  for (const id of ['scenWrap', 'reseed', 'solToggle']) $(id).classList.toggle('hidden', tab !== 'cat');
  $('cat').parentElement.classList.toggle('hidden', tab === 'cat');
  if (tab === 'read') readCase();
  else if (tab === 'quiz') quizQuestion();
  else {
    fillScenarios();
    runCatalog();
  }
}

// ---------- events ----------
$('tabRead').addEventListener('click', () => setTab('read'));
$('tabQuiz').addEventListener('click', () => setTab('quiz'));
$('tabCat').addEventListener('click', () => setTab('cat'));
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
$('noise').addEventListener('change', (e) => {
  state.noise = e.target.value;
  if (state.tab === 'cat') runCatalog();
  else build();
});
$('speed').addEventListener('change', () => (state.tab === 'cat' ? runCatalog() : build()));
$('gain').addEventListener('change', () => (state.tab === 'cat' ? runCatalog() : build()));
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
  const blob = new Blob([exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ekg-trainer-lernstand.json';
  a.click();
});
$('btnReset').addEventListener('click', () => {
  reset();
  renderStats();
});

renderStats();
setTab('read');
