// Lessons for the "Lernen" area. Every lesson has four separate versions, one per audience.
// A version is five texts: the key sentence, three points, and the typical pitfall.
// Texts are written as [German, English]; LESSONS holds the German strings, EN_LESSONS the
// dictionary for the English interface (German source string -> English).
// These texts are teaching material and need a clinical review before wider use.

const P = (de, en) => [de, en];

const RAW = [
  {
    id: 'basics',
    cat: null,
    examples: ['sinus', 'af', 'avb3', 'vt'],
    title: P('Systematik und Messen', 'Method and measuring'),
    levels: {
      rs: [
        P('Jedes EKG immer in der gleichen Reihenfolge ansehen: Schläge, Abstände, Frequenz, breit oder schmal.', 'Always read an ECG in the same order: beats, intervals, rate, wide or narrow.'),
        P('Regelmäßig oder unregelmäßig: Sind die Abstände zwischen den hohen Zacken (R-Zacken) gleich?', 'Regular or irregular: are the distances between the tall spikes (R waves) equal?'),
        P('Frequenz: Bei 50 mm/s teilt man 600 durch die Zahl großer Kästchen zwischen zwei R-Zacken, bei 25 mm/s teilt man 300.', 'Rate: at 50 mm/s divide 600 by the number of large boxes between two R waves; at 25 mm/s divide 300.'),
        P('Breit oder schmal: Ab 120 ms gilt der Komplex als breit (drei kleine Kästchen bei 25 mm/s, sechs bei 50 mm/s). Breite Komplexe sind ein Warnzeichen.', 'Wide or narrow: from 120 ms a complex counts as wide (three small boxes at 25 mm/s, six at 50 mm/s). Wide complexes are a warning sign.'),
        P('Falle: Das EKG allein bewerten. Immer den Patienten, den Puls und die Beschwerden mit einbeziehen.', 'Pitfall: judging the ECG on its own. Always include the patient, the pulse and the symptoms.'),
      ],
      notsan: [
        P('Systematik: Rhythmus, Frequenz, Lagetyp, Zeiten (PQ, QRS, QT), P-Welle zu jedem QRS, ST-Strecke und T-Welle.', 'Method: rhythm, rate, axis, intervals (PR, QRS, QT), a P wave for every QRS, ST segment and T wave.'),
        P('Frequenzregel: Papiergeschwindigkeit mal 12 geteilt durch große Kästchen (300 bei 25 mm/s, 600 bei 50 mm/s). Bei unregelmäßigem Rhythmus Schläge in 6 Sekunden mal 10.', 'Rate rule: paper speed times 12 divided by large boxes (300 at 25 mm/s, 600 at 50 mm/s). For an irregular rhythm count the beats in 6 seconds and multiply by 10.'),
        P('Zeiten: PQ 120 bis 200 ms, QRS unter 120 ms. Ein kleines Kästchen sind 40 ms bei 25 mm/s und 20 ms bei 50 mm/s.', 'Intervals: PR 120 to 200 ms, QRS under 120 ms. One small box is 40 ms at 25 mm/s and 20 ms at 50 mm/s.'),
        P('Lagetyp grob: positiver QRS in I und aVF entspricht normalem Lagetyp.', 'Rough axis: a positive QRS in I and aVF means a normal axis.'),
        P('Falle: Die Papiergeschwindigkeit nicht prüfen. Dann stimmt jede Frequenz und jede Zeit nicht.', 'Pitfall: not checking the paper speed. Then every rate and every interval is wrong.'),
      ],
      arzt: [
        P('Ein EKG wird vollständig befundet: Rhythmus, Frequenz, Lagetyp, Zeiten, Morphologie und Vergleich mit dem Vorbefund.', 'An ECG is reported completely: rhythm, rate, axis, intervals, morphology and comparison with the previous tracing.'),
        P('Die Zeiten brauchen Grenzwerte: PQ 120 bis 200 ms, QRS unter 120 ms, QTc je nach Quelle ab 450 ms (Männer) und 460 ms (Frauen) verlängert.', 'The intervals need cut-offs: PR 120 to 200 ms, QRS under 120 ms, QTc prolonged from about 450 ms (men) and 460 ms (women), depending on the source.'),
        P('Die QT-Zeit korrigiert man auf die Frequenz (zum Beispiel nach Bazett). Bei hohen und niedrigen Frequenzen überschätzt bzw. unterschätzt Bazett.', 'QT is corrected for rate (for example by Bazett). At high and low rates Bazett over- or underestimates.'),
        P('ST-Hebungen am J-Punkt messen und immer in zusammenhängenden Ableitungen suchen, nie in einer einzelnen.', 'Measure ST elevation at the J point and look for it in contiguous leads, never in a single lead.'),
        P('Falle: Der Automatikbefund des Geräts wird übernommen. Er ist ein Vorschlag und bei Rhythmusstörungen oft falsch.', 'Pitfall: taking the machine read-out at face value. It is a suggestion and is often wrong in arrhythmias.'),
      ],
      experte: [
        P('Befunden heißt, Hypothesen mit Kriterien zu prüfen: Was passt, was passt nicht, und was würde die Diagnose ändern?', 'Reporting means testing hypotheses against criteria: what fits, what does not, and what would change the diagnosis?'),
        P('Rhythmusanalyse über das Leiterdiagramm: P-Wellen, QRS, Überleitung und Pausen getrennt betrachten, bevor man benennt.', 'Analyse rhythm with a ladder diagram: consider P waves, QRS, conduction and pauses separately before naming.'),
        P('Technische Parameter gehören dazu: Gain, Papiergeschwindigkeit, Filter und Elektrodenposition verändern Amplituden und Intervalle.', 'Technical parameters matter: gain, paper speed, filters and electrode position change amplitudes and intervals.'),
        P('Wahrscheinlichkeit zählt: Dasselbe Bild hat je nach Vortestwahrscheinlichkeit eine andere Bedeutung.', 'Probability matters: the same pattern means something different depending on pre-test probability.'),
        P('Falle: Ankerfehler. Wer früh eine Diagnose hat, übersieht Zeichen, die dagegen sprechen.', 'Pitfall: anchoring. Whoever settles on a diagnosis early overlooks signs that argue against it.'),
      ],
    },
  },
  {
    id: 'rhythm',
    cat: 0,
    examples: ['sinus', 'sinus-brady', 'sinus-tachy'],
    title: P('Grundrhythmen', 'Basic rhythms'),
    levels: {
      rs: [
        P('Ein gesundes Herz schlägt regelmäßig, vor jedem Schlag steht eine kleine Welle (P), der Schlag ist schmal.', 'A healthy heart beats regularly, a small wave (P) comes before every beat, and the beat is narrow.'),
        P('Normale Frequenz in Ruhe: 60 bis 100 pro Minute.', 'Normal resting rate: 60 to 100 per minute.'),
        P('Unter 60 pro Minute heißt Bradykardie, über 100 pro Minute Tachykardie.', 'Under 60 per minute is bradycardia, over 100 per minute is tachycardia.'),
        P('Wie schlimm es ist, entscheidet nicht die Zahl allein, sondern wie es dem Patienten geht.', 'How serious it is does not depend on the number alone, but on how the patient is.'),
        P('Falle: Eine Tachykardie ist nicht automatisch eine Rhythmusstörung. Fieber, Schmerz, Angst und Blutverlust machen den Puls schnell.', 'Pitfall: a tachycardia is not automatically an arrhythmia. Fever, pain, fear and blood loss make the pulse fast.'),
      ],
      notsan: [
        P('Der Sinusrhythmus hat vor jedem QRS eine P-Welle, positiv in II, mit konstantem PQ-Intervall.', 'Sinus rhythm has a P wave before every QRS, positive in II, with a constant PR interval.'),
        P('Sinusbradykardie unter 60, Sinustachykardie über 100 pro Minute. Beide sind Befunde, keine Diagnosen.', 'Sinus bradycardia is under 60, sinus tachycardia over 100 per minute. Both are findings, not diagnoses.'),
        P('Die Tachykardie des Sinusknotens beginnt und endet langsam. Bei supraventrikulären Tachykardien setzt sie plötzlich ein und hört plötzlich auf.', 'Sinus tachycardia starts and stops gradually. Supraventricular tachycardias start and stop abruptly.'),
        P('Die Sinusarrhythmie (Frequenz schwankt mit der Atmung) ist bei Jüngeren normal.', 'Sinus arrhythmia (rate varies with breathing) is normal in younger people.'),
        P('Falle: Sinustachykardie bei Frequenz um 150 im Erwachsenenalter ist selten. Dann an Flattern mit 2:1-Überleitung oder SVT denken.', 'Pitfall: sinus tachycardia at about 150 in an adult is rare. Think of flutter with 2:1 conduction or SVT.'),
      ],
      arzt: [
        P('Sinusrhythmus ist definiert durch P-Wellen mit normaler Achse (positiv in I, II, aVF, negativ in aVR) vor jedem QRS.', 'Sinus rhythm is defined by P waves with a normal axis (positive in I, II, aVF, negative in aVR) before every QRS.'),
        P('Bei der Sinustachykardie sucht man die Ursache: Schmerz, Fieber, Hypovolämie, Anämie, Hyperthyreose, Lungenembolie, Medikamente.', 'In sinus tachycardia you look for the cause: pain, fever, hypovolaemia, anaemia, hyperthyroidism, pulmonary embolism, drugs.'),
        P('Bei der Sinusbradykardie zählen Medikamente (Betablocker, Verapamil, Digitalis), Ausdauertraining, Hypothyreose, Hirndruck und Ischämie des Sinusknotens.', 'In sinus bradycardia consider drugs (beta blockers, verapamil, digoxin), endurance training, hypothyroidism, raised intracranial pressure and sinus node ischaemia.'),
        P('Behandelt wird die Ursache, nicht die Zahl.', 'Treat the cause, not the number.'),
        P('Falle: Die Sinustachykardie mit Betablocker zu bremsen, ohne die Ursache zu klären. Das kann einen kompensatorischen Mechanismus unterdrücken.', 'Pitfall: slowing a sinus tachycardia with a beta blocker without clarifying the cause. That can suppress a compensatory mechanism.'),
      ],
      experte: [
        P('Die Sinusknotenfrequenz ist autonom moduliert. Fehlende Variabilität bei Bradykardie spricht für Sinusknotenerkrankung oder Medikamente.', 'Sinus node rate is autonomically modulated. Absent variability in bradycardia suggests sinus node disease or drugs.'),
        P('Sinusknotenerkrankung zeigt sich als Bradykardie, Sinusarrest, sinuatrialer Block oder Bradykardie-Tachykardie-Syndrom.', 'Sinus node disease presents as bradycardia, sinus arrest, sinoatrial block or tachycardia-bradycardia syndrome.'),
        P('Die inadäquate Sinustachykardie und die Reentry-Tachykardie des Sinusknotens sind Differenzialdiagnosen der Sinustachykardie.', 'Inappropriate sinus tachycardia and sinus node re-entry tachycardia are differential diagnoses of sinus tachycardia.'),
        P('P-Wellen-Morphologie unterscheidet Sinusrhythmus von atrialem Ersatzrhythmus oder ektoper atrialer Tachykardie.', 'P wave morphology separates sinus rhythm from an atrial escape rhythm or ectopic atrial tachycardia.'),
        P('Falle: Frequenzabhängige Zeiten werden ohne Korrektur verglichen. PQ und QT ändern sich mit der Frequenz.', 'Pitfall: comparing rate-dependent intervals without correction. PR and QT change with the rate.'),
      ],
    },
  },
  {
    id: 'brady',
    cat: 1,
    examples: ['av1', 'av2-wenck', 'av2-mobitz2', 'avb3'],
    title: P('Bradykardien und Blöcke', 'Bradycardias and blocks'),
    levels: {
      rs: [
        P('Ein sehr langsamer Puls mit Schwindel, Ohnmacht oder Schwäche ist ein Notfall, auch wenn das EKG regelmäßig aussieht.', 'A very slow pulse with dizziness, fainting or weakness is an emergency, even if the ECG looks regular.'),
        P('Beim AV-Block III schlagen Vorhof und Kammer unabhängig voneinander. Man sieht regelmäßige kleine Wellen und seltene breite Komplexe ohne feste Beziehung.', 'In third-degree AV block atria and ventricles beat independently. You see regular small waves and rare wide complexes with no fixed relationship.'),
        P('Handeln: Patienten überwachen, Zugang legen, Notarzt nachfordern, Pacer-Bereitschaft nach örtlichem Standard.', 'Act: monitor the patient, establish access, call for the emergency physician, have pacing ready according to local protocol.'),
        P('Sehr langsam und schlecht beieinander: nicht abwarten.', 'Very slow and unwell: do not wait.'),
        P('Falle: Ein Patient mit Puls 40 und gutem Befinden kann noch stabil sein. Aber er bleibt am Monitor, denn es kann schlagartig kippen.', 'Pitfall: a patient with a pulse of 40 who feels fine may still be stable. But keep him on the monitor, because it can change suddenly.'),
      ],
      notsan: [
        P('AV-Block I: PQ über 200 ms, jede P-Welle wird übergeleitet. Meist harmlos.', 'First-degree AV block: PR over 200 ms, every P wave is conducted. Usually harmless.'),
        P('AV-Block II Typ Wenckebach: PQ wird länger, dann fällt ein QRS aus. Gruppierte Schläge. Meist am AV-Knoten, oft gutartig.', 'Second-degree AV block, Wenckebach: PR lengthens until a QRS is dropped. Grouped beats. Usually at the AV node, often benign.'),
        P('AV-Block II Typ Mobitz II: PQ konstant, dann fällt ohne Vorwarnung ein QRS aus. Gefährlich, kann in einen AV-Block III übergehen.', 'Second-degree AV block, Mobitz II: PR constant, then a QRS is dropped without warning. Dangerous, may progress to third-degree block.'),
        P('AV-Block III: P-Wellen und QRS laufen unabhängig. Der Ersatzrhythmus ist schmal (junktional, 40 bis 60) oder breit (ventrikulär, 20 bis 40).', 'Third-degree AV block: P waves and QRS run independently. The escape rhythm is narrow (junctional, 40 to 60) or wide (ventricular, 20 to 40).'),
        P('Falle: Eine 2:1-Überleitung lässt sich im EKG nicht sicher als Wenckebach oder Mobitz zuordnen. Dann behandelt man nach dem Zustand des Patienten.', 'Pitfall: a 2:1 conduction cannot be reliably classified as Wenckebach or Mobitz on the ECG. Then treat according to the patient\'s condition.'),
      ],
      arzt: [
        P('Bradykardien werden nach Instabilität bewertet: Schock, Synkope, Ischämie, Herzinsuffizienz. Die Frequenz allein entscheidet nicht.', 'Bradycardias are judged by instability: shock, syncope, ischaemia, heart failure. The rate alone does not decide.'),
        P('Wenckebach sitzt im AV-Knoten, Mobitz II unterhalb davon (His-Purkinje). Deshalb ist der QRS bei Mobitz II häufig breit.', 'Wenckebach is in the AV node, Mobitz II below it (His-Purkinje). Therefore the QRS in Mobitz II is often wide.'),
        P('Bei infranodalem Block wirkt Atropin schlecht und kann schaden. Schrittmacher (transkutan, dann transvenös) ist die Therapie.', 'In infranodal block atropine works poorly and may harm. Pacing (transcutaneous, then transvenous) is the treatment.'),
        P('Ursachen suchen: Infarkt (inferior eher AV-Knoten, anterior eher infranodal), Medikamente, Hyperkaliämie, Borreliose, Myokarditis, Degeneration.', 'Look for causes: infarction (inferior more often AV node, anterior more often infranodal), drugs, hyperkalaemia, Lyme disease, myocarditis, degeneration.'),
        P('Falle: Atropin bei breitem Ersatzrhythmus und AV-Block III geben und auf Besserung hoffen.', 'Pitfall: giving atropine for a wide escape rhythm and third-degree block and hoping for improvement.'),
      ],
      experte: [
        P('Die Lokalisation des Blocks (supra-, intra-, infrahisär) bestimmt Prognose und Therapie.', 'The site of the block (supra-, intra-, infra-Hisian) determines prognosis and treatment.'),
        P('Bei 2:1-Block spricht ein schmaler QRS eher für einen AV-Knoten-Block, ein Schenkelblock eher für einen infranodalen Block. Ein Belastungs- oder Atropintest kann helfen.', 'In 2:1 block a narrow QRS suggests an AV-node block, a bundle branch block an infranodal one. An exercise or atropine test can help.'),
        P('Der AV-Block III mit schmalem Ersatzrhythmus liegt meist im AV-Knoten und ist stabiler. Ein breiter Ersatzrhythmus ist unzuverlässig.', 'Third-degree block with a narrow escape rhythm is usually at the AV node and more stable. A wide escape rhythm is unreliable.'),
        P('Hochgradiger AV-Block (zwei oder mehr aufeinanderfolgende nicht übergeleitete P-Wellen bei überwiegender Überleitung) wird wie Mobitz II behandelt.', 'High-grade AV block (two or more consecutive non-conducted P waves with otherwise preserved conduction) is managed like Mobitz II.'),
        P('Falle: Eine AV-Dissoziation mit Isorhythmie wird als AV-Block III gelesen. Beim AV-Block III ist die Vorhoffrequenz schneller als die Kammerfrequenz.', 'Pitfall: reading AV dissociation with isorhythmia as third-degree block. In third-degree block the atrial rate is faster than the ventricular rate.'),
      ],
    },
  },
  {
    id: 'tachy',
    cat: 2,
    examples: ['svt', 'af', 'flutter-41', 'vt'],
    title: P('Tachykardien', 'Tachycardias'),
    levels: {
      rs: [
        P('Ein sehr schneller Puls mit Luftnot, Brustschmerz oder Bewusstseinstrübung ist ein Notfall.', 'A very fast pulse with breathlessness, chest pain or reduced consciousness is an emergency.'),
        P('Regelmäßig schnell und schmal: meist supraventrikulär. Unregelmäßig und schnell: oft Vorhofflimmern. Regelmäßig schnell und breit: Kammertachykardie bis zum Beweis des Gegenteils.', 'Regular, fast and narrow: usually supraventricular. Irregular and fast: often atrial fibrillation. Regular, fast and wide: ventricular tachycardia until proven otherwise.'),
        P('Handeln: Puls tasten, Patienten überwachen, Notarzt, bei Bewusstlosigkeit ohne Puls Reanimation.', 'Act: feel the pulse, monitor, call the emergency physician, and start resuscitation if unconscious without a pulse.'),
        P('Die Kammertachykardie kann in Kammerflimmern übergehen.', 'Ventricular tachycardia can turn into ventricular fibrillation.'),
        P('Falle: Breit und schnell nicht ernst nehmen, weil der Patient noch spricht.', 'Pitfall: not taking wide and fast seriously because the patient is still talking.'),
      ],
      notsan: [
        P('Schmal und regelmäßig: SVT. Vagale Manöver sind der erste Schritt, wenn der Patient stabil ist.', 'Narrow and regular: SVT. Vagal manoeuvres are the first step if the patient is stable.'),
        P('Schmal und unregelmäßig: Vorhofflimmern. Keine P-Wellen, absolut unregelmäßige Abstände.', 'Narrow and irregular: atrial fibrillation. No P waves, absolutely irregular intervals.'),
        P('Vorhofflattern: regelmäßige Sägezahnwellen, oft mit fester Überleitung (2:1 ergibt etwa 150, 4:1 etwa 75 pro Minute).', 'Atrial flutter: regular sawtooth waves, often with fixed conduction (2:1 gives about 150, 4:1 about 75 per minute).'),
        P('Breit und regelmäßig: Kammertachykardie. Im Zweifel wird sie wie VT behandelt.', 'Wide and regular: ventricular tachycardia. When in doubt it is treated as VT.'),
        P('Falle: Eine Frequenz von genau 150 bei Erwachsenen ist verdächtig auf Flattern mit 2:1.', 'Pitfall: a rate of exactly 150 in an adult is suspicious for flutter with 2:1 conduction.'),
      ],
      arzt: [
        P('Die Entscheidung folgt dem Algorithmus: instabil bedeutet synchronisierte Kardioversion, stabil bedeutet Rhythmus klären und gezielt behandeln.', 'The decision follows the algorithm: unstable means synchronised cardioversion, stable means clarify the rhythm and treat specifically.'),
        P('Vorhofflimmern: Frequenzkontrolle oder Rhythmuskontrolle, Schlaganfallrisiko (CHA2DS2-VASc) und Antikoagulation bedenken.', 'Atrial fibrillation: rate or rhythm control, consider stroke risk (CHA2DS2-VASc) and anticoagulation.'),
        P('Breite regelmäßige Tachykardie bei Patienten mit Herzerkrankung ist bis zum Beweis des Gegenteils VT. Hinweise sind AV-Dissoziation, Capture- und Fusionsschläge.', 'A wide regular tachycardia in a patient with heart disease is VT until proven otherwise. Clues are AV dissociation, capture and fusion beats.'),
        P('Bei Präexzitation mit Vorhofflimmern (breit, unregelmäßig, sehr schnell) keine AV-Knoten-blockierenden Medikamente.', 'In pre-excited atrial fibrillation (wide, irregular, very fast) avoid AV-nodal blocking drugs.'),
        P('Falle: Verapamil bei breiter Tachykardie, weil sie "supraventrikulär mit Block" sein könnte. Das kann bei VT fatal enden.', 'Pitfall: giving verapamil in a wide tachycardia because it "could be supraventricular with a block". That can end fatally in VT.'),
      ],
      experte: [
        P('Das Ziel ist der Mechanismus: AVNRT, AVRT, atriale Tachykardie, Flattern, Flimmern oder VT, jeweils mit eigenem Therapiepfad.', 'The goal is the mechanism: AVNRT, AVRT, atrial tachycardia, flutter, fibrillation or VT, each with its own treatment path.'),
        P('Hinweise: Beginn mit einer Extrasystole, retrogrades P im oder direkt am Ende des QRS (AVNRT, Pseudo-r\' in V1) oder danach im ST-Segment (AVRT), Reaktion auf Adenosin.', 'Clues: onset with an extrasystole, retrograde P within or at the very end of the QRS (AVNRT, pseudo-r\' in V1) or afterwards in the ST segment (AVRT), response to adenosine.'),
        P('VT-Kriterien (Brugada, Vereckei) nutzen Konkordanz, RS-Intervall und Morphologie. Keine ist perfekt, die Klinik zählt mit.', 'VT criteria (Brugada, Vereckei) use concordance, RS interval and morphology. None is perfect, the clinical context counts too.'),
        P('Typisches Flattern ist gegen den Uhrzeigersinn: Sägezahn negativ in II, III, aVF.', 'Typical flutter is counterclockwise: negative sawtooth in II, III, aVF.'),
        P('Falle: Flatterwellen sind in manchen Ableitungen kaum zu sehen. Dann Flattern mit variabler Überleitung als Vorhofflimmern lesen. II, III, aVF und V1 prüfen.', 'Pitfall: flutter waves are barely visible in some leads, so flutter with variable conduction gets read as atrial fibrillation. Check II, III, aVF and V1.'),
      ],
    },
  },
  {
    id: 'ectopy',
    cat: 3,
    examples: ['pvc-sporadic', 'pvc-bigeminy'],
    title: P('Extrasystolen', 'Extrasystoles'),
    levels: {
      rs: [
        P('Extrasystolen sind vorzeitige Schläge. Man spürt sie als Stolpern oder Aussetzer.', 'Extrasystoles are premature beats. They are felt as stumbling or skipped beats.'),
        P('Ventrikuläre Extrasystolen sehen breit und verformt aus und kommen zu früh, danach folgt eine Pause.', 'Ventricular extrasystoles look wide and misshapen, come early and are followed by a pause.'),
        P('Einzelne Extrasystolen sind oft harmlos, besonders bei Gesunden.', 'Single extrasystoles are often harmless, especially in healthy people.'),
        P('Alarmzeichen sind viele Extrasystolen hintereinander, Beschwerden, Brustschmerz und Kreislaufprobleme.', 'Warning signs are many extrasystoles in a row, symptoms, chest pain and circulatory problems.'),
        P('Falle: Manche Extrasystolen erzeugen keinen tastbaren Puls. Der gefühlte Puls kann deutlich langsamer sein als die Anzeige am Monitor.', 'Pitfall: some extrasystoles produce no palpable pulse. The felt pulse can be much slower than the monitor display.'),
      ],
      notsan: [
        P('Ventrikuläre Extrasystole (VES): vorzeitig, breit, keine P-Welle davor, danach meist eine kompensatorische Pause.', 'Ventricular extrasystole (PVC): premature, wide, no P wave before it, usually followed by a compensatory pause.'),
        P('Bigeminus bedeutet abwechselnd normaler Schlag und VES, Trigeminus jeder dritte Schlag.', 'Bigeminy means alternating normal beat and PVC, trigeminy every third beat.'),
        P('Kritisch sind Salven (drei oder mehr), polymorphe VES, VES auf der T-Welle (R-auf-T) und gehäuftes Auftreten im Infarkt.', 'Critical are runs (three or more), polymorphic PVCs, PVCs on the T wave (R-on-T) and frequent PVCs in infarction.'),
        P('Supraventrikuläre Extrasystolen sind vorzeitig, aber schmal, mit veränderter P-Welle.', 'Supraventricular extrasystoles are premature but narrow, with an altered P wave.'),
        P('Falle: Eine schmale vorzeitige Welle mit Aberration (breit) wird als VES gelesen.', 'Pitfall: reading a narrow premature beat with aberration (wide) as a PVC.'),
      ],
      arzt: [
        P('Einzelne VES bei Herzgesunden brauchen meist keine Therapie, sondern Ursachensuche: Elektrolyte, Schilddrüse, Koffein, Ischämie.', 'Isolated PVCs in people without heart disease usually need no treatment but a search for causes: electrolytes, thyroid, caffeine, ischaemia.'),
        P('Bei strukturellen Herzerkrankungen bedeutet gehäufte VES ein erhöhtes Risiko. Echokardiographie, Langzeit-EKG und gegebenenfalls Bildgebung folgen.', 'In structural heart disease frequent PVCs mean increased risk. Echocardiography, long-term ECG and possibly imaging follow.'),
        P('Eine hohe VES-Last (grob mehr als 10 bis 15 Prozent der Schläge) kann eine Kardiomyopathie auslösen.', 'A high PVC burden (roughly more than 10 to 15 percent of beats) can cause cardiomyopathy.'),
        P('Im akuten Infarkt behandelt man Ischämie und Elektrolyte, nicht prophylaktisch die VES.', 'In acute infarction treat ischaemia and electrolytes, not the PVCs prophylactically.'),
        P('Falle: Antiarrhythmika zur Unterdrückung von VES nach Infarkt. Das erhöhte die Sterblichkeit (CAST-Studie).', 'Pitfall: antiarrhythmic drugs to suppress PVCs after infarction. This increased mortality (CAST trial).'),
      ],
      experte: [
        P('Die Morphologie der VES lokalisiert den Ursprung: Linksschenkelblock-Form kommt von rechts, Rechtsschenkelblock-Form von links.', 'PVC morphology locates the origin: a left bundle branch block pattern comes from the right, a right bundle branch block pattern from the left.'),
        P('Inferiore Achse mit Linksschenkelblock-Morphologie deutet auf den Ausflusstrakt (rechts oder links).', 'An inferior axis with left bundle branch block morphology points to the outflow tract (right or left).'),
        P('Eine feste Kopplungszeit spricht für Reentry oder getriggerte Aktivität, eine variable Kopplung für Parasystolie.', 'A fixed coupling interval suggests re-entry or triggered activity, a variable coupling interval suggests parasystole.'),
        P('Interpolierte VES schieben sich zwischen zwei Sinusschläge ohne kompensatorische Pause.', 'Interpolated PVCs slot between two sinus beats without a compensatory pause.'),
        P('Falle: Fusionsschläge und Pseudofusion beim Schrittmacher werden mit VES verwechselt.', 'Pitfall: fusion beats and pseudofusion with a pacemaker are confused with PVCs.'),
      ],
    },
  },
  {
    id: 'arrest',
    cat: 4,
    examples: ['vf', 'asystole'],
    title: P('Kreislaufstillstand', 'Cardiac arrest'),
    levels: {
      rs: [
        P('Bei Bewusstlosigkeit ohne normale Atmung gilt: Reanimation beginnen, nicht erst das EKG deuten.', 'If unconscious without normal breathing: start resuscitation, do not interpret the ECG first.'),
        P('Kammerflimmern sieht aus wie ein chaotisches Zittern, ohne erkennbare Komplexe. Hier hilft der Schock mit dem Defibrillator.', 'Ventricular fibrillation looks like chaotic trembling with no recognisable complexes. A shock with the defibrillator helps here.'),
        P('Asystolie sieht fast wie eine gerade Linie aus. Hier hilft kein Schock, sondern Reanimation und Medikamente.', 'Asystole looks almost like a flat line. A shock does not help; resuscitation and drugs do.'),
        P('Der AED analysiert selbst und sagt Schock oder keinen Schock.', 'The AED analyses by itself and says shock or no shock.'),
        P('Falle: Eine gerade Linie kann ein abgefallenes Kabel, eine lose Elektrode oder zu niedrige Verstärkung sein. Immer den Patienten prüfen.', 'Pitfall: a flat line can be a detached cable, a loose electrode or too low gain. Always check the patient.'),
      ],
      notsan: [
        P('Man unterscheidet schockbare Rhythmen (Kammerflimmern, pulslose Kammertachykardie) und nicht schockbare (Asystolie, pulslose elektrische Aktivität).', 'Shockable rhythms (ventricular fibrillation, pulseless ventricular tachycardia) are distinguished from non-shockable ones (asystole, pulseless electrical activity).'),
        P('Bei schockbarem Rhythmus: sofort defibrillieren, Kompressionen mit minimalen Pausen, nach Algorithmus Adrenalin und Amiodaron.', 'In a shockable rhythm: defibrillate immediately, compressions with minimal pauses, adrenaline and amiodarone according to the algorithm.'),
        P('Asystolie wird in zwei Ableitungen bestätigt, bei höherer Verstärkung. Feines Kammerflimmern kann so aussehen.', 'Asystole is confirmed in two leads at higher gain. Fine ventricular fibrillation can look like it.'),
        P('Reversible Ursachen (4 H und 4 HITS) laufen parallel zur Reanimation.', 'Reversible causes (4 Hs and 4 Ts) are addressed alongside resuscitation.'),
        P('Falle: Pulslose elektrische Aktivität (PEA) sieht im EKG normal aus. Der Puls entscheidet, nicht das Bild.', 'Pitfall: pulseless electrical activity (PEA) looks normal on the ECG. The pulse decides, not the picture.'),
      ],
      arzt: [
        P('Die Rhythmuserkennung steuert den Algorithmus, aber die Qualität der Kompressionen und die Zeit bis zum ersten Schock bestimmen das Überleben.', 'Rhythm recognition drives the algorithm, but the quality of compressions and the time to the first shock determine survival.'),
        P('Kammerflimmern grob oder fein, Torsade de pointes und polymorphe VT haben eigene Behandlungswege (Magnesium bei Torsade).', 'Coarse or fine ventricular fibrillation, torsade de pointes and polymorphic VT have their own treatment paths (magnesium in torsade).'),
        P('Asystolie und PEA haben eine schlechte Prognose, wenn keine reversible Ursache gefunden wird. Sonographie während der Pausen hilft.', 'Asystole and PEA have a poor prognosis unless a reversible cause is found. Ultrasound during the pauses helps.'),
        P('Nach Rückkehr des Kreislaufs folgen 12-Kanal-EKG, Koronarangiographie bei Verdacht auf Infarkt und gezieltes Temperaturmanagement.', 'After return of circulation: 12-lead ECG, coronary angiography when infarction is suspected, and targeted temperature management.'),
        P('Falle: Zu lange Rhythmusanalysen unterbrechen die Kompressionen.', 'Pitfall: long rhythm analyses interrupt compressions.'),
      ],
      experte: [
        P('Feines Kammerflimmern lässt sich von Asystolie nur mit Vorsicht abgrenzen, Artefakte durch Kompressionen verfälschen das Bild.', 'Fine ventricular fibrillation can only be cautiously separated from asystole; compression artefacts distort the tracing.'),
        P('Die Amplitude und Frequenz des Flimmerns sinken mit der Dauer. Grobes Flimmern spricht für frische Ereignisse und bessere Defibrillationschancen.', 'Amplitude and frequency of fibrillation fall with duration. Coarse fibrillation suggests a recent event and better chances of defibrillation.'),
        P('Refraktäres Kammerflimmern: Dual-sequentielle oder vektorveränderte Defibrillation sind in der Diskussion, ECMO bei geeigneten Patienten.', 'Refractory ventricular fibrillation: dual-sequential or vector-change defibrillation are under discussion, ECMO in suitable patients.'),
        P('Eine Asystolie mit P-Wellen (ventrikuläre Standstill) kann auf Schrittmacherbarkeit hinweisen.', 'Asystole with P waves (ventricular standstill) may indicate that pacing is possible.'),
        P('Falle: Rhythmusbeurteilung während der Kompressionen. Artefakte täuschen Flimmern oder elektrische Aktivität vor.', 'Pitfall: judging the rhythm during compressions. Artefacts mimic fibrillation or electrical activity.'),
      ],
    },
  },
  {
    id: 'ischemia',
    cat: 5,
    examples: ['stemi-inf', 'stemi-ant', 'stemi-lat', 'stemi-post', 'stemi-hyperacute', 'mi-old', 'wellens'],
    title: P('Ischämie und Infarkt', 'Ischaemia and infarction'),
    levels: {
      rs: [
        P('Brustschmerz mit Schweiß, Übelkeit oder Atemnot kann ein Herzinfarkt sein. Das EKG ist eine Hilfe, aber ein normales EKG schließt ihn nicht aus.', 'Chest pain with sweating, nausea or breathlessness can be a heart attack. The ECG helps, but a normal ECG does not rule it out.'),
        P('Typisch sind ST-Strecken, die über die Linie angehoben sind, oft wie ein Hügel.', 'Typical are ST segments lifted above the baseline, often like a hill.'),
        P('Handeln: Patienten schonen, 12-Kanal-EKG, Notarzt, Zielklinik mit Herzkatheter.', 'Act: keep the patient at rest, 12-lead ECG, emergency physician, target hospital with cath lab.'),
        P('Zeit ist Herzmuskel. Der EKG-Befund wird an die Klinik vorangemeldet.', 'Time is heart muscle. The ECG result is announced to the hospital in advance.'),
        P('Falle: Frauen, Ältere und Diabetiker haben oft untypische Beschwerden.', 'Pitfall: women, older people and diabetics often have atypical symptoms.'),
      ],
      notsan: [
        P('STEMI-Kriterium: ST-Hebung am J-Punkt in mindestens zwei benachbarten Ableitungen (grob 0,1 mV, in V2 und V3 mehr).', 'STEMI criterion: ST elevation at the J point in at least two contiguous leads (roughly 0.1 mV, more in V2 and V3).'),
        P('Zuordnung: II, III, aVF inferior (meist rechte Koronararterie), V1 bis V4 anterior (LAD), I, aVL, V5, V6 lateral.', 'Territories: II, III, aVF inferior (usually right coronary artery), V1 to V4 anterior (LAD), I, aVL, V5, V6 lateral.'),
        P('Spiegelbildliche ST-Senkungen in gegenüberliegenden Ableitungen stützen den Infarkt.', 'Mirror-image ST depression in opposite leads supports infarction.'),
        P('Bei Hinterwandinfarkt sieht man ST-Senkungen in V1 bis V3. Hier helfen die Ableitungen V7 bis V9.', 'In posterior infarction you see ST depression in V1 to V3. Leads V7 to V9 help here.'),
        P('Falle: Bei inferiorem Infarkt kann die rechte Kammer beteiligt sein (V4R). Dann Vorsicht mit Nitraten und Volumengabe bedenken.', 'Pitfall: in inferior infarction the right ventricle may be involved (V4R). Then be careful with nitrates and consider volume.'),
      ],
      arzt: [
        P('STEMI-Äquivalente gehören dazu: hochakute T-Wellen, De-Winter-Zeichen und Hinterwandinfarkt. Hochriskant ist auch ST-Hebung in aVR mit ausgedehnten Senkungen (Hauptstamm oder Mehrgefäßerkrankung).', 'STEMI equivalents belong here: hyperacute T waves, de Winter sign and posterior infarction. ST elevation in aVR with widespread depression is also high risk (left main or multivessel disease).'),
        P('Das Wellens-Zeichen (biphasische oder tief negative T-Wellen in V2 und V3 im schmerzfreien Intervall) zeigt eine kritische LAD-Stenose. Keine Belastungsuntersuchung.', 'The Wellens sign (biphasic or deeply inverted T waves in V2 and V3 in the pain-free interval) indicates a critical LAD stenosis. No stress test.'),
        P('Ein alter Infarkt zeigt Q-Zacken und manchmal persistierende ST-Hebung (Aneurysma). Der Vergleich mit dem Vorbefund entscheidet.', 'An old infarct shows Q waves and sometimes persistent ST elevation (aneurysm). Comparison with the previous tracing decides.'),
        P('Troponin ergänzt das EKG. Bei STEMI wartet man nicht darauf.', 'Troponin complements the ECG. In STEMI you do not wait for it.'),
        P('Falle: Ein Linksschenkelblock oder Schrittmacher maskiert Infarktzeichen. Die Sgarbossa-Kriterien helfen.', 'Pitfall: a left bundle branch block or a pacemaker masks infarct signs. The Sgarbossa criteria help.'),
      ],
      experte: [
        P('Die Schwellen sind alters- und geschlechtsabhängig: V2 und V3 ab 0,25 mV bei Männern unter 40, 0,2 mV bei Männern ab 40, 0,15 mV bei Frauen. In den übrigen Ableitungen 0,1 mV.', 'Thresholds depend on age and sex: V2 and V3 from 0.25 mV in men under 40, 0.2 mV in men from 40, 0.15 mV in women. In the other leads 0.1 mV.'),
        P('Hochakute T-Wellen sind breit, asymmetrisch und höher als die R-Zacke, oft das früheste Zeichen.', 'Hyperacute T waves are broad, asymmetric and taller than the R wave, often the earliest sign.'),
        P('Differenzialdiagnosen der ST-Hebung: frühe Repolarisation, Perikarditis, Aneurysma, Brugada, Hyperkaliämie, Takotsubo, Linksschenkelblock, LVH.', 'Differential diagnosis of ST elevation: early repolarisation, pericarditis, aneurysm, Brugada, hyperkalaemia, takotsubo, left bundle branch block, LVH.'),
        P('Die Lokalisation des Verschlusses lässt sich aus dem Verhältnis ST-Hebung in III zu II und aus aVL abschätzen.', 'The site of occlusion can be estimated from the ratio of ST elevation in III to II and from aVL.'),
        P('Falle: Ein Okklusionsinfarkt ohne ST-Hebung (zum Beispiel Circumflex) wird übersehen.', 'Pitfall: an occlusion infarct without ST elevation (for example circumflex) is missed.'),
      ],
    },
  },
  {
    id: 'conduction',
    cat: 6,
    examples: ['lbbb', 'rbbb', 'lahb', 'lvh'],
    title: P('Leitungsstörungen und Hypertrophie', 'Conduction disorders and hypertrophy'),
    levels: {
      rs: [
        P('Ein breiter QRS-Komplex bei regelmäßigem Rhythmus kann ein Schenkelblock sein. Er ist oft schon länger vorhanden.', 'A wide QRS complex in a regular rhythm may be a bundle branch block. It is often long-standing.'),
        P('Wichtig ist die Frage: War das EKG schon vorher so? Ein Vorbefund der Angehörigen, Hausärztin oder Klinik hilft.', 'The important question: was the ECG already like this? A previous tracing from relatives, the family doctor or hospital helps.'),
        P('Ein neuer Schenkelblock mit Brustschmerz wird wie ein möglicher Infarkt behandelt.', 'A new bundle branch block with chest pain is treated as a possible infarction.'),
        P('Solche Befunde muss man nicht benennen können, aber melden: breit und neu.', 'You do not need to name such findings, but report them: wide and new.'),
        P('Falle: Breit bedeutet nicht immer Kammertachykardie. Ohne Tachykardie spricht Breite eher für Schenkelblock oder Kalium.', 'Pitfall: wide does not always mean ventricular tachycardia. Without tachycardia, width suggests bundle branch block or potassium.'),
      ],
      notsan: [
        P('Schenkelblock: QRS ab 120 ms. Der Rechtsschenkelblock zeigt in V1 ein M (rSR\'), der Linksschenkelblock breite, gekerbte R-Zacken in I, aVL, V5, V6.', 'Bundle branch block: QRS from 120 ms. Right bundle branch block shows an M (rSR\') in V1, left bundle branch block broad, notched R waves in I, aVL, V5, V6.'),
        P('Beim Linksschenkelblock ist die ST-Strecke normalerweise entgegengesetzt zum QRS gerichtet (diskordant). Das ist kein Infarkt.', 'In left bundle branch block the ST segment is normally opposite to the QRS (discordant). This is not an infarction.'),
        P('Der linksanteriore Hemiblock zeigt einen überdrehten Linkstyp bei schmalem QRS.', 'Left anterior hemiblock shows a marked left axis deviation with a narrow QRS.'),
        P('Linksventrikuläre Hypertrophie: sehr hohe Ausschläge, oft mit ST-Senkungen und T-Negativierung links (Strain).', 'Left ventricular hypertrophy: very tall deflections, often with ST depression and T inversion on the left (strain).'),
        P('Falle: Ein neuer Linksschenkelblock bei passender Klinik ist verdächtig. Das EKG sagt nicht, wann er entstanden ist.', 'Pitfall: a new left bundle branch block with a fitting clinical picture is suspicious. The ECG does not tell when it arose.'),
      ],
      arzt: [
        P('Rechtsschenkelblock: QRS ab 120 ms, rSR\' in V1 bis V3, breites S in I und V6. Neu und mit Tachykardie bei Atemnot an Lungenembolie denken.', 'Right bundle branch block: QRS from 120 ms, rSR\' in V1 to V3, broad S in I and V6. New and with tachycardia and breathlessness, think of pulmonary embolism.'),
        P('Linksschenkelblock: breites, gekerbtes R in I, aVL, V5, V6, tiefes S in V1. Meist strukturelle Herzerkrankung, Herzinsuffizienz-Therapie mit Resynchronisation kann infrage kommen.', 'Left bundle branch block: broad notched R in I, aVL, V5, V6, deep S in V1. Usually structural heart disease; resynchronisation therapy may be considered in heart failure.'),
        P('Hemiblock: QRS unter 120 ms, linksanterior mit Achse zwischen minus 30 und minus 90 Grad (qR in aVL, rS in II, III, aVF).', 'Hemiblock: QRS under 120 ms, left anterior with an axis between minus 30 and minus 90 degrees (qR in aVL, rS in II, III, aVF).'),
        P('LVH nach Sokolow-Lyon (S in V1 plus R in V5 oder V6 über 3,5 mV) oder Cornell. Beide sind spezifisch, aber nicht sehr sensitiv.', 'LVH by Sokolow-Lyon (S in V1 plus R in V5 or V6 over 3.5 mV) or Cornell. Both are specific but not very sensitive.'),
        P('Falle: LVH und Schenkelblock verändern die ST-Strecke. Dadurch wird ein Infarkt leicht über- oder unterschätzt.', 'Pitfall: LVH and bundle branch block change the ST segment. An infarction is easily over- or underestimated.'),
      ],
      experte: [
        P('Die Sgarbossa-Kriterien (modifiziert nach Smith) erlauben beim Linksschenkelblock die Infarktdiagnose: konkordante ST-Hebung, konkordante Senkung in V1 bis V3, übermäßig diskordante Hebung.', 'The Sgarbossa criteria (modified by Smith) allow infarct diagnosis in left bundle branch block: concordant ST elevation, concordant depression in V1 to V3, excessively discordant elevation.'),
        P('Der Rechtsschenkelblock unterscheidet kompletten und inkompletten Block sowie Morphologie in V1. Bei Brugada-Muster kann er verwechselt werden.', 'Right bundle branch block distinguishes complete and incomplete block and the morphology in V1. It can be confused with a Brugada pattern.'),
        P('Bifaszikuläre Blöcke (Rechtsschenkelblock plus Hemiblock) und trifaszikuläre Zeichen erhöhen das Risiko eines kompletten AV-Blocks. Synkope verlangt Abklärung.', 'Bifascicular block (right bundle branch block plus hemiblock) and trifascicular signs raise the risk of complete AV block. Syncope requires work-up.'),
        P('Die Repolarisationsstörung bei LVH (Strain) ist asymmetrisch und folgt der Hauptausschlagsrichtung, im Gegensatz zur symmetrischen Ischämie-T-Negativierung.', 'Repolarisation change in LVH (strain) is asymmetric and follows the main deflection, unlike the symmetric ischaemic T inversion.'),
        P('Falle: Ein Schenkelblock wird mit ventrikulärem Schrittmacherrhythmus oder Präexzitation verwechselt.', 'Pitfall: confusing a bundle branch block with a ventricular paced rhythm or pre-excitation.'),
      ],
    },
  },
  {
    id: 'misc',
    cat: 7,
    examples: ['hyperk-mild', 'hyperk-sev', 'hypok', 'pericarditis', 'wpw', 'longqt', 'pe', 'brugada', 'digoxin'],
    title: P('Elektrolyte, Medikamente und Sonstiges', 'Electrolytes, drugs and other conditions'),
    levels: {
      rs: [
        P('Nicht jede EKG-Veränderung kommt vom Herzen. Auch Kalium, Medikamente und Lungenerkrankungen verändern das EKG.', 'Not every ECG change comes from the heart. Potassium, drugs and lung disease also change the ECG.'),
        P('Zu viel Kalium macht die T-Wellen hoch und spitz und kann den Rhythmus lebensbedrohlich stören. Das trifft besonders Dialysepatienten.', 'Too much potassium makes T waves tall and peaked and can disturb the rhythm dangerously. It particularly affects dialysis patients.'),
        P('Wichtig sind die Fragen nach Vorerkrankungen und Medikamenten (zum Beispiel Digitalis, Dialyse, Wassertabletten).', 'The questions about previous illnesses and medication matter (for example digoxin, dialysis, diuretics).'),
        P('Auffälliges EKG bei Dialysepatient: Notarzt und Klinik.', 'Abnormal ECG in a dialysis patient: emergency physician and hospital.'),
        P('Falle: Das EKG kann bei diesen Zuständen nur Hinweise geben. Der Blutwert entscheidet.', 'Pitfall: the ECG can only give hints in these conditions. The blood test decides.'),
      ],
      notsan: [
        P('Hyperkaliämie: hohe, spitze T-Wellen, später flache P-Wellen, verlängertes PQ, breiter QRS, zuletzt sinusförmiges Bild.', 'Hyperkalaemia: tall peaked T waves, later flat P waves, prolonged PR, wide QRS, finally a sine-wave pattern.'),
        P('Hypokaliämie: flache T-Welle, ST-Senkung, U-Welle, Neigung zu Rhythmusstörungen.', 'Hypokalaemia: flat T wave, ST depression, U wave, tendency to arrhythmias.'),
        P('Perikarditis: diffuse ST-Hebungen in vielen Ableitungen, nicht einem Gefäß zuordenbar, oft PQ-Senkung.', 'Pericarditis: diffuse ST elevation in many leads that cannot be assigned to one vessel, often PR depression.'),
        P('WPW: kurzes PQ und Delta-Welle (schräger Anstieg des QRS), Neigung zu Tachykardien.', 'WPW: short PR and delta wave (sloping rise of the QRS), tendency to tachycardias.'),
        P('Falle: Bei Verlängerung der QT-Zeit mit Synkope an Torsade-de-pointes-Risiko denken, besonders mit Medikamenten und Elektrolytmangel.', 'Pitfall: with prolonged QT and syncope think of torsade de pointes risk, especially with drugs and electrolyte deficiency.'),
      ],
      arzt: [
        P('Hyperkaliämie mit EKG-Veränderungen ist ein Notfall: Kalzium zum Membranschutz, dann Verschiebung (Insulin mit Glukose, Salbutamol) und Elimination.', 'Hyperkalaemia with ECG changes is an emergency: calcium for membrane protection, then shifting (insulin with glucose, salbutamol) and elimination.'),
        P('Langes QT: QTc über 500 ms bedeutet hohes Torsade-Risiko. Auslösende Medikamente absetzen, Kalium und Magnesium ausgleichen.', 'Long QT: QTc over 500 ms means high torsade risk. Stop triggering drugs, correct potassium and magnesium.'),
        P('Lungenembolie: Sinustachykardie ist häufigster Befund. S1Q3T3, neuer Rechtsschenkelblock und T-Negativierung V1 bis V4 sind seltener, aber hinweisend.', 'Pulmonary embolism: sinus tachycardia is the most common finding. S1Q3T3, new right bundle branch block and T inversion V1 to V4 are rarer but suggestive.'),
        P('Digitalis: muldenförmige ST-Senkung ist Wirkung, Rhythmusstörungen (Block, atriale Tachykardie mit Block, VES) sprechen für Intoxikation.', 'Digoxin: scooped ST depression is an effect; arrhythmias (block, atrial tachycardia with block, PVCs) point to toxicity.'),
        P('Falle: WPW mit Vorhofflimmern mit Adenosin, Verapamil oder Digitalis behandeln.', 'Pitfall: treating WPW with atrial fibrillation with adenosine, verapamil or digoxin.'),
      ],
      experte: [
        P('Die Hyperkaliämie-Stadien folgen oft nicht der Lehrbuchreihenfolge. Das EKG kann bei hohem Kalium noch normal sein.', 'Hyperkalaemia stages often do not follow the textbook order. The ECG can still be normal at high potassium.'),
        P('Brugada-Typ 1: nach oben gewölbte ST-Hebung (coved) von mindestens 2 mm in V1 oder V2 mit negativer T-Welle. Fieber kann es demaskieren, ein Provokationstest ist möglich. Risiko für Kammerflimmern.', 'Brugada type 1: coved ST elevation of at least 2 mm in V1 or V2 with a negative T wave. Fever can unmask it, a provocation test is possible. Risk of ventricular fibrillation.'),
        P('Perikarditis: PR-Senkung außer in aVR, dort PR-Hebung. Die ST-Hebung ist konkav. Im Gegensatz zum Infarkt fehlen spiegelbildliche Senkungen außer in aVR und V1.', 'Pericarditis: PR depression except in aVR, where PR is elevated. ST elevation is concave. Unlike infarction there are no reciprocal changes except in aVR and V1.'),
        P('WPW: Die Delta-Welle zeigt den Ort der Bahn. Orthodrome AVRT hat schmalen QRS, antidrome AVRT und präexzitiertes Flimmern haben breiten QRS.', 'WPW: the delta wave shows the location of the pathway. Orthodromic AVRT has a narrow QRS; antidromic AVRT and pre-excited fibrillation have a wide QRS.'),
        P('Falle: Die QT-Zeit wird bei breitem QRS ohne Anpassung gemessen (JT-Intervall oder Anpassung nötig).', 'Pitfall: measuring QT in a wide QRS without adjustment (JT interval or correction needed).'),
      ],
    },
  },
];

export const LESSONS = RAW.map((l) => ({
  id: l.id,
  cat: l.cat,
  examples: l.examples,
  title: l.title[0],
  levels: Object.fromEntries(Object.entries(l.levels).map(([k, v]) => [k, v.map((x) => x[0])])),
}));

export const EN_LESSONS = {};
for (const l of RAW) {
  EN_LESSONS[l.title[0]] = l.title[1];
  for (const v of Object.values(l.levels)) for (const [de, en] of v) EN_LESSONS[de] = en;
}
