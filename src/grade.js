import { RHYTHMS, AXES, FINDINGS, TRUTH } from './truth.js';
import { measure } from './measure.js';
import { t } from './i18n.js';

const rhythmDe = (id) => RHYTHMS.find((r) => r[0] === id)[1];
const rhythmLabel = (id) => t(rhythmDe(id));
const axisOf = (deg) => AXES.find((a) => deg >= a[2] && deg < a[3]) ?? AXES[1];

// Compare one reading against the case. Every item carries its own points and a reason,
// so the feedback can say why a part was right or wrong.
export function grade(sig, sc, ans, level) {
  const truth = TRUTH[sc.id];
  const m = measure(sig);
  const arrest = truth.rhythm === 'vf' || truth.rhythm === 'asystole';
  const items = [];

  const rhythmOk = ans.rhythm === truth.rhythm || (truth.alt ?? []).includes(ans.rhythm);
  items.push({
    label: t('Rhythmus'),
    max: 30,
    pts: rhythmOk ? 30 : 0,
    ok: rhythmOk,
    answer: ans.rhythm ? rhythmLabel(ans.rhythm) : t('keine Angabe'),
    right: rhythmLabel(truth.rhythm),
  });

  if (!arrest) {
    const rate = Number(ans.rate);
    const tol = Math.max(8, m.hr * 0.1);
    const rateOk = Number.isFinite(rate) && ans.rate !== '' && Math.abs(rate - m.hr) <= tol;
    items.push({
      label: t('Frequenz'),
      max: 15,
      pts: rateOk ? 15 : 0,
      ok: rateOk,
      answer: ans.rate === '' ? t('keine Angabe') : t('{n}/min', { n: rate }),
      right: t('{n}/min (Toleranz plus/minus {tol})', { n: m.hr, tol: Math.round(tol) }),
    });
  }

  if (!arrest && level !== 'rs') {
    const a = axisOf(m.axis);
    const given = AXES.find((x) => x[0] === ans.axis);
    const near = given && (m.axis >= given[2] - 10 && m.axis < given[3] + 10);
    const full = given && given[0] === a[0];
    items.push({
      label: t('Lagetyp'),
      max: 10,
      pts: full ? 10 : near ? 6 : 0,
      ok: !!full,
      answer: given ? t(given[1]) : t('keine Angabe'),
      right: t('{a} (gemessen {d} Grad)', { a: t(a[1]), d: m.axis }),
      note: !full && near ? t('Grenzbereich: knapp daneben, Teilpunkte.') : undefined,
    });

    const wide = m.qrsMs >= 120;
    const border = m.qrsMs >= 110 && m.qrsMs <= 130;
    const qOk = ans.qrs === (wide ? 'wide' : 'narrow') || (border && ans.qrs);
    items.push({
      label: t('QRS-Breite'),
      max: 10,
      pts: qOk ? 10 : 0,
      ok: !!qOk,
      answer: ans.qrs === 'wide' ? t('breit (120 ms und mehr)') : ans.qrs === 'narrow' ? t('schmal (unter 120 ms)') : t('keine Angabe'),
      right: `${t(wide ? 'breit' : 'schmal')} (${m.qrsMs} ms)`,
    });
  }

  // Findings: each missed or invented finding costs, so ticking everything does not pay.
  const want = new Set(truth.findings);
  const got = new Set(ans.findings ?? []);
  const share = arrest || truth.findings.length === 0 ? 35 : 35;
  const hits = [...want].filter((f) => got.has(f)).length;
  const wrong = [...got].filter((f) => !want.has(f)).length;
  const missed = [...want].filter((f) => !got.has(f));
  let fPts;
  if (want.size === 0) fPts = share * Math.max(0, 1 - wrong * 0.5);
  else fPts = share * Math.max(0, (hits - wrong * 0.5) / want.size);
  fPts = Math.round(fPts);
  items.push({
    label: t('Zusatzbefunde'),
    max: share,
    pts: fPts,
    ok: fPts === share,
    answer: got.size ? [...got].map((f) => t(FINDINGS[f][0])).join(', ') : t('keine'),
    right: want.size ? [...want].map((f) => t(FINDINGS[f][0])).join(', ') : t('keine (kein weiterer Befund)'),
    reasons: missed.map((f) => `${t(FINDINGS[f][0])}: ${t(FINDINGS[f][1])}`),
    extra: [...got].filter((f) => !want.has(f)).map((f) => t(FINDINGS[f][0])),
  });

  const max = items.reduce((s, i) => s + i.max, 0);
  const pts = items.reduce((s, i) => s + i.pts, 0);
  return { items, pts, max, pct: Math.round((pts / max) * 100), measured: m };
}

// Facts about the case in plain German, sent to the evaluator of the oral mode.
export function truthSummary(sig, sc, context) {
  const truth = TRUTH[sc.id];
  const m = measure(sig);
  const arrest = truth.rhythm === 'vf' || truth.rhythm === 'asystole';
  const a = axisOf(m.axis);
  return {
    rhythmus: rhythmDe(truth.rhythm),
    rhythmus_auch_akzeptiert: (truth.alt ?? []).map(rhythmDe),
    frequenz_pro_min: arrest ? null : m.hr,
    lagetyp: arrest ? null : `${a[1]}, gemessen ${m.axis} Grad`,
    qrs_ms: arrest ? null : m.qrsMs,
    qrs: arrest ? null : m.qrsMs >= 120 ? 'breit' : 'schmal',
    zusatzbefunde: truth.findings.map((f) => ({ befund: FINDINGS[f][0], merkmale: FINDINGS[f][1] })),
    keine_zusatzbefunde: truth.findings.length === 0,
    erklaerung: sc.solution,
    fallgeschichte: context || undefined,
  };
}

// Observable features of the case, used to check the single steps of the wizard.
export function caseFacts(sig, sc) {
  const truth = TRUTH[sc.id];
  const m = measure(sig);
  const arrest = truth.rhythm === 'vf' || truth.rhythm === 'asystole';
  let regular = true;
  if (!arrest && sig.sched && sig.sched.ventricular) {
    const t = sig.sched.ventricular.map((b) => b.t).filter((x) => x > 0.2 && x < sig.duration - 0.3);
    const d = t.slice(1).map((x, i) => x - t[i]);
    if (d.length > 1) regular = (Math.max(...d) - Math.min(...d)) / (d.reduce((s, x) => s + x, 0) / d.length) <= 0.18;
  }
  const P = { sinus: 'each', avb2w: 'each', avb2m: 'each', af: 'none', flutter: 'saw', svt: 'none', junctional: 'none', avb3: 'dissociated', idiov: 'none', vt: 'none' };
  return { rhythm: truth.rhythm, arrest, regular, qrsWide: m.qrsMs >= 120, p: P[truth.rhythm] ?? 'none', findings: truth.findings, rate: m.hr };
}
