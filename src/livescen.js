// Monitor stories: segments run one after the other, the trainee announces the rhythm live.
export const LIVE = [
  { id: 'collapse', title: 'Kollaps: von der Tachykardie bis zum Stillstand', segs: ['sinus-tachy', 'vt', 'vf', 'asystole'] },
  { id: 'block', title: 'Zunehmender AV-Block', segs: ['sinus-brady', 'av2-wenck', 'av2-mobitz2', 'avb3'] },
  { id: 'narrow', title: 'Regelmäßig oder unregelmäßig: Schmalkomplex-Rhythmen', segs: ['sinus', 'svt', 'af', 'flutter-21'] },
  { id: 'pvc', title: 'Extrasystolen bis Kammerflimmern', segs: ['sinus', 'pvc-bigeminy', 'vt', 'vf'] },
];
export const SEG_SECONDS = 12;
