import { send, allowed, readBody } from './_util.js';

const LIMIT = 4 * 1024 * 1024; // Vercel allows 4.5 MB request bodies
const EXT = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3' };

// Hint words help the recogniser with medical terms.
const VOCAB =
  'EKG, Sinusrhythmus, Vorhofflimmern, Vorhofflattern, AV-Block, Wenckebach, Mobitz, Linksschenkelblock, Rechtsschenkelblock, ' +
  'Hemiblock, STEMI, ST-Hebung, ST-Senkung, T-Welle, P-Welle, QRS-Komplex, PQ-Zeit, QT-Zeit, Lagetyp, Linkstyp, Steiltyp, Rechtstyp, ' +
  'Extrasystolen, Kammertachykardie, Kammerflimmern, Asystolie, Hyperkaliämie, Hypokaliämie, Perikarditis, Brugada, Wellens, Deltawelle.';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!allowed(req, res)) return;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return send(res, 503, { error: 'not_configured', message: 'Die Spracherkennung ist auf dem Server noch nicht eingerichtet (OPENAI_API_KEY fehlt).' });

  let buf;
  try {
    buf = await readBody(req, LIMIT);
  } catch (e) {
    return send(res, 413, { error: 'too_large', message: 'Die Aufnahme ist zu groß. Bitte kürzer sprechen.' });
  }
  if (buf.length < 2000) return send(res, 400, { error: 'too_short', message: 'Die Aufnahme ist leer oder zu kurz.' });

  const type = String(req.headers['x-audio-type'] || 'audio/webm').split(';')[0].trim();
  const ext = EXT[type] || 'webm';
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), `aufnahme.${ext}`);
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
  form.append('language', 'de');
  form.append('temperature', '0');
  form.append('prompt', VOCAB);

  try {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j && j.error && j.error.message ? j.error.message : `Fehler ${r.status}`;
      return send(res, 502, { error: 'upstream', message: `Spracherkennung fehlgeschlagen: ${msg}` });
    }
    return send(res, 200, { text: String(j.text || '').trim() });
  } catch (e) {
    return send(res, 502, { error: 'upstream', message: 'Die Spracherkennung ist nicht erreichbar.' });
  }
}
