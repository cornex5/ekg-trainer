// Technical errors the trainee should recognise before reading the ECG.
// Limb electrode swaps are done on the potentials of the three limb electrodes
// (RA, LA, LL), chest leads reference the Wilson terminal and do not change.
export const ERRORS = [
  ['ok', 'Korrekt abgeleitet, kein Fehler', 'P-Welle und QRS positiv in I und II, negativ in aVR, R-Zacke nimmt von V1 bis V4 zu. Dann ist die Ableitung stimmig.'],
  ['ra_la', 'Arm-Elektroden rechts und links vertauscht', 'Alles negativ in Ableitung I (P, QRS, T), aVR zeigt positive Ausschläge, II und III sind vertauscht. Bei Dextrokardie wäre zusätzlich die R-Progression über der Brust rückläufig, hier bleibt sie normal.'],
  ['ra_ll', 'Rechter Arm und linkes Bein vertauscht', 'Ableitung II ist umgekehrt (negative P und QRS), I und III sind vertauscht und invertiert.'],
  ['la_ll', 'Linker Arm und linkes Bein vertauscht', 'I und II sind vertauscht, III ist invertiert. Sieht oft unauffällig aus, deshalb leicht zu übersehen: Achte auf eine ungewöhnlich große P in III.'],
  ['v12', 'V1 und V2 vertauscht', 'Die R-Zacke nimmt von V1 nach V2 ab statt zu, die rS-Konfiguration beginnt erst in V1 mit höherem R als in V2.'],
  ['v23', 'V2 und V3 vertauscht', 'Die R-Progression ist gestört: V2 hat ein größeres R als V3, der Übergang springt zurück.'],
  ['wander', 'Grundlinienschwankung (Atmung, Bewegung)', 'Die gesamte Linie wandert langsam auf und ab, alle Ableitungen gleichzeitig, die Kurvenform selbst bleibt erhalten.'],
  ['mains', 'Netzbrummen (50 Hz)', 'Regelmäßige feine Wellen mit 50 Hz auf der ganzen Kurve (etwa 2,5 Wellen pro 1 mm Papier bei 25 mm/s), meist durch schlechten Kontakt oder Störquellen.'],
  ['emg', 'Muskelzittern oder Tremor', 'Unregelmäßige, schnelle, zackige Auslenkungen auf der Grundlinie, von Ableitung zu Ableitung unterschiedlich, die P-Wellen gehen darin unter.'],
];

export function applyError(leads, id) {
  const L = leads.map((s) => Float32Array.from(s));
  const n = L[0].length;
  const out = L.map((s) => new Float32Array(s));
  const swap = (a, b) => {
    const t = out[a];
    out[a] = out[b];
    out[b] = t;
  };
  if (id === 'v12') swap(6, 7);
  if (id === 'v23') swap(7, 8);
  if (['ra_la', 'ra_ll', 'la_ll'].includes(id)) {
    // reference RA = 0 at the start, LA = I, LL = II
    for (let i = 0; i < n; i++) {
      let ra = 0;
      let la = L[0][i];
      let ll = L[1][i];
      if (id === 'ra_la') [ra, la] = [la, ra];
      if (id === 'ra_ll') [ra, ll] = [ll, ra];
      if (id === 'la_ll') [la, ll] = [ll, la];
      out[0][i] = la - ra;
      out[1][i] = ll - ra;
      out[2][i] = ll - la;
      out[3][i] = ra - (la + ll) / 2;
      out[4][i] = la - (ra + ll) / 2;
      out[5][i] = ll - (ra + la) / 2;
    }
  }
  return out;
}

export const NOISE_FOR = { wander: 'only_wander', mains: 'only_mains', emg: 'only_emg' };
