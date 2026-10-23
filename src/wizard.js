// Decision wizard for the lowest level: a chain of simple questions that ends in a rhythm.
export const STEPS = [
  {
    id: 'base',
    q: 'Was siehst Du auf dem EKG?',
    hint: 'Erst das Gesamtbild, dann die Details.',
    opts: [
      ['complexes', 'Erkennbare Herzschläge (QRS-Komplexe)'],
      ['chaos', 'Chaotische Zacken, keine einzelnen Komplexe'],
      ['flat', 'Fast eine gerade Linie'],
    ],
  },
  {
    id: 'regular',
    q: 'Sind die Abstände zwischen den Herzschlägen gleich?',
    hint: 'Vergleiche die Abstände von R-Zacke zu R-Zacke. Mit dem Messzirkel kannst Du nachmessen.',
    opts: [
      ['regular', 'Ja, regelmäßig'],
      ['irregular', 'Nein, unregelmäßig'],
    ],
    when: (a) => a.base === 'complexes',
  },
  {
    id: 'rate',
    type: 'number',
    q: 'Wie viele Herzschläge pro Minute?',
    hint: 'Regelmäßig: 300 geteilt durch die Zahl großer Kästchen zwischen zwei R-Zacken. Unregelmäßig: Schläge in 6 Sekunden (30 große Kästchen) mal 10.',
    when: (a) => a.base === 'complexes',
  },
  {
    id: 'qrs',
    q: 'Sind die Komplexe schmal oder breit?',
    hint: 'Ab drei kleinen Kästchen (120 ms) gilt ein QRS-Komplex als breit.',
    opts: [
      ['narrow', 'Schmal'],
      ['wide', 'Breit'],
    ],
    when: (a) => a.base === 'complexes',
  },
  {
    id: 'p',
    q: 'Wie sieht es mit den P-Wellen aus?',
    hint: 'Die P-Welle ist die kleine Welle vor dem QRS-Komplex.',
    opts: [
      ['each', 'Vor jedem Komplex eine P-Welle'],
      ['none', 'Keine erkennbaren P-Wellen'],
      ['dissociated', 'P-Wellen vorhanden, aber unabhängig vom QRS'],
    ],
    when: (a) => a.base === 'complexes',
  },
  {
    id: 'early',
    q: 'Gibt es einzelne vorzeitige, verbreiterte Schläge?',
    hint: 'Schläge, die zu früh kommen und anders aussehen als die übrigen.',
    opts: [
      ['no', 'Nein'],
      ['yes', 'Ja'],
    ],
    when: (a) => a.base === 'complexes',
  },
  {
    id: 'st',
    q: 'Siehst Du eine ST-Hebung?',
    hint: 'Die ST-Strecke folgt auf den QRS-Komplex. Gehoben heißt: deutlich über der Grundlinie.',
    opts: [
      ['none', 'Nein'],
      ['inf', 'Ja, in II, III und aVF'],
      ['ant', 'Ja, in V1 bis V5'],
      ['lat', 'Ja, in I, aVL, V5 und V6'],
    ],
    when: (a) => a.base === 'complexes',
  },
];

export const stepsFor = (a) => STEPS.filter((s) => !s.when || s.when(a));

// Rhythm that follows from the answers, as a suggestion the user may change.
export function derive(a) {
  if (a.base === 'chaos') return 'vf';
  if (a.base === 'flat') return 'asystole';
  const rate = Number(a.rate);
  if (a.p === 'dissociated') return 'avb3';
  if (a.p === 'none') {
    if (a.regular === 'irregular') return 'af';
    if (a.qrs === 'wide') return rate < 50 ? 'idiov' : 'vt';
    return rate >= 100 ? 'svt' : 'junctional';
  }
  return 'sinus';
}

export function answersToForm(a, rhythm) {
  const findings = [];
  if (a.early === 'yes') findings.push('pvc');
  if (a.st && a.st !== 'none') findings.push({ inf: 'stemi_inf', ant: 'stemi_ant', lat: 'stemi_lat' }[a.st]);
  return { rhythm, rate: a.rate ?? '', axis: '', qrs: '', findings };
}

const LABEL = {
  base: { complexes: 'Erkennbare Komplexe', chaos: 'Chaotische Zacken', flat: 'Gerade Linie' },
  regular: { regular: 'regelmäßig', irregular: 'unregelmäßig' },
  qrs: { narrow: 'schmal', wide: 'breit' },
  p: { each: 'vor jedem QRS eine P-Welle', none: 'keine P-Wellen', dissociated: 'P-Wellen unabhängig vom QRS' },
  early: { no: 'keine', yes: 'vorzeitige Schläge' },
  st: { none: 'keine Hebung', inf: 'Hebung unten (II, III, aVF)', ant: 'Hebung Vorderwand (V1 bis V5)', lat: 'Hebung Seitenwand (I, aVL, V5, V6)' },
};
export const labelOf = (step, v) => (LABEL[step] && LABEL[step][v]) || v;

const NAME = { base: 'Gesamtbild', regular: 'Regelmäßigkeit', qrs: 'QRS-Breite', p: 'P-Wellen', early: 'Vorzeitige Schläge', st: 'ST-Strecke' };
const WHY = {
  base: { complexes: 'Es sind einzelne QRS-Komplexe zu erkennen.', chaos: 'Keine einzelnen Komplexe, nur chaotische Zacken: Kammerflimmern.', flat: 'Keine elektrische Aktivität: Asystolie.' },
  regular: { regular: 'Die R-R-Abstände sind gleich.', irregular: 'Die R-R-Abstände schwanken.' },
  qrs: { narrow: 'Unter 120 ms, die Erregung läuft über das normale Leitungssystem.', wide: '120 ms oder mehr, die Erregung läuft nicht über das normale Leitungssystem.' },
  p: { each: 'Vor jedem QRS steht eine P-Welle, die Vorhöfe führen den Rhythmus.', none: 'Keine erkennbare P-Welle, die Vorhöfe geben den Takt nicht vor.', dissociated: 'P-Wellen und QRS laufen unabhängig voneinander.' },
  early: { no: 'Alle Schläge sehen gleich aus und kommen rechtzeitig.', yes: 'Einzelne Schläge kommen zu früh und sehen anders aus.' },
  st: { none: 'Die ST-Strecke liegt auf der Grundlinie.', inf: 'Hebung in II, III, aVF.', ant: 'Hebung in V1 bis V5.', lat: 'Hebung in I, aVL, V5, V6.' },
};

// facts: from caseFacts(); returns one line per answered step with a verdict.
export function review(a, facts) {
  const rows = [];
  const truth = {
    base: facts.arrest ? (facts.rhythm === 'vf' ? 'chaos' : 'flat') : 'complexes',
    regular: facts.regular ? 'regular' : 'irregular',
    qrs: facts.qrsWide ? 'wide' : 'narrow',
    p: facts.p === 'dissociated' ? 'dissociated' : facts.p === 'each' ? 'each' : 'none',
    early: facts.findings.includes('pvc') ? 'yes' : 'no',
    st: facts.findings.includes('stemi_inf') ? 'inf' : facts.findings.includes('stemi_ant') ? 'ant' : facts.findings.includes('stemi_lat') ? 'lat' : 'none',
  };
  for (const s of stepsFor(a)) {
    if (s.id === 'rate' || a[s.id] === undefined) continue;
    const ok = a[s.id] === truth[s.id];
    rows.push({ label: NAME[s.id], mine: labelOf(s.id, a[s.id]), right: labelOf(s.id, truth[s.id]), ok, why: WHY[s.id][truth[s.id]] });
  }
  return rows;
}
