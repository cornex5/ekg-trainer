// Learn mode: hint ladder, explanation of a wrong choice and the score after hints.
import { t } from './i18n.js';
import { measure } from './measure.js';
import { caseFacts } from './grade.js';
import { TRUTH, FINDINGS, AXES } from './truth.js';
import { CATEGORIES } from './scenarios.js';

const CHECK = {
  rs: 'Vorgehen: 1. Sind einzelne Herzschläge zu sehen? 2. Sind die Abstände gleich? 3. Wie viele Schläge pro Minute? 4. Sind die Komplexe schmal oder breit?',
  notsan: 'Vorgehen: Gesamtbild, Regelmäßigkeit, Frequenz, QRS-Breite, P-Welle vor jedem QRS, vorzeitige Schläge, ST-Strecke.',
  arzt: 'Vorgehen: Frequenz, Rhythmus, Lagetyp, QRS-Breite, PQ-Zeit, ST-Strecke und T-Welle, QT-Zeit. Danach das Gesamtbild.',
  experte: 'Vorgehen: Frequenz, Rhythmus und Vorhofaktivität, Achse, Intervalle (PQ, QRS, QT/QTc), Morphologie in allen 12 Ableitungen, ST-T, dann Differenzialdiagnose und Abgrenzung.',
};

const P_TEXT = { each: 'vor jedem QRS', none: 'keine erkennbar', dissociated: 'unabhängig vom QRS', saw: 'Sägezahn' };

// What can be read off the trace, without naming the diagnosis. Detail grows with the level.
export function measuredLine(sig, sc, lvl) {
  const f = caseFacts(sig, sc);
  if (f.arrest) return t('Achte darauf, ob überhaupt einzelne QRS-Komplexe zu erkennen sind.');
  const m = measure(sig);
  const parts = [t('Frequenz {n}/min', { n: m.hr }), t(f.regular ? 'regelmäßig' : 'unregelmäßig'), t(f.qrsWide ? 'QRS breit' : 'QRS schmal')];
  if (lvl !== 'rs') parts.push(t('P-Wellen: {p}', { p: t(P_TEXT[f.p] ?? 'keine erkennbar') }));
  if (lvl === 'arzt' || lvl === 'experte') {
    const a = AXES.find((x) => m.axis >= x[2] && m.axis < x[3]) ?? AXES[1];
    parts.push(t('Lagetyp: {a}', { a: t(a[1]) }));
  }
  if (lvl === 'experte') parts.push(t('QRS-Dauer {ms} ms', { ms: m.qrsMs }));
  return `${t('Gemessen:')} ${parts.join(', ')}.`;
}

// kind: 'quiz' | 'read'. Returns the text of hint number n (1 to 3), or null when there is none.
export function hintText(n, kind, sig, sc, lvl) {
  if (n === 1) return t(CHECK[lvl]);
  if (n === 2) return measuredLine(sig, sc, lvl);
  if (n === 3) {
    const cat = t('Kategorie: {c}.', { c: t(CATEGORIES[sc.cat]) });
    if (kind === 'quiz') return `${cat} ${t('Falsche Antworten sind jetzt ausgeblendet.')}`;
    const fs = TRUTH[sc.id].findings;
    return `${cat} ${fs.length ? t('Zusatzbefund(e): {l}', { l: fs.map((x) => t(FINDINGS[x][0])).join(', ') }) : t('Keine Zusatzbefunde.')}`;
  }
  return null;
}

export const wrongChoiceText = (optSc, sig, sc, lvl) =>
  `${t('Das wäre {title}: {line}', { title: t(optSc.title), line: t(optSc.solution[0]) })} ${t('Vergleiche mit dem Bild.')} ${measuredLine(sig, sc, lvl)}`;

// Result stored for spaced repetition: full marks only without help.
export const learnScore = (mistakes, hints) => {
  const k = mistakes + hints;
  return k === 0 ? 100 : k <= 2 ? 60 : 30;
};

export const FEHLER_CHECK =
  'Prüfe zuerst I, II und aVR: P und QRS sind in I und II positiv und in aVR negativ. Dann die Brustwand: Das R wächst von V1 bis V4. Wo die Regel bricht, liegt der Fehler.';
