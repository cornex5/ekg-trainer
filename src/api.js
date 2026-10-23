// Calls to the server function that evaluates free-text findings with Claude.
const CODE_KEY = 'ekg-code';

export function getCode() {
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch (e) {
    return '';
  }
}
export function setCode(v) {
  try {
    localStorage.setItem(CODE_KEY, v);
  } catch (e) {
    /* ignore */
  }
}

export async function apiStatus() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

export async function evaluate(payload) {
  const h = { 'Content-Type': 'application/json' };
  const c = getCode();
  if (c) h['x-access-code'] = c;
  let r;
  try {
    r = await fetch('/api/evaluate', { method: 'POST', headers: h, body: JSON.stringify(payload) });
  } catch (e) {
    const err = new Error('Der Server ist nicht erreichbar. Prüfe Deine Verbindung.');
    err.kind = 'network';
    throw err;
  }
  let j = {};
  try {
    j = await r.json();
  } catch (e) {
    /* not json */
  }
  if (!r.ok) {
    const err = new Error(j.message || `Serverfehler ${r.status}`);
    err.kind = j.error || 'http';
    throw err;
  }
  return j.bewertung;
}
