// Shared helpers for the serverless functions. Files starting with an underscore are not routes.
import crypto from 'node:crypto';

export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// Optional access code (environment variable ACCESS_CODE). Keeps strangers from spending the API budget.
function basicPassword(req) {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Basic ')) return '';
  const raw = Buffer.from(auth.slice(6), 'base64').toString('utf8');
  return raw.slice(raw.indexOf(':') + 1);
}

function sameSecret(given, code) {
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(code).digest();
  return crypto.timingSafeEqual(a, b);
}

// True when the browser already passed the site-wide gate (middleware.js) with the same code.
export function passedGate(req) {
  const code = process.env.ACCESS_CODE;
  return !!code && sameSecret(basicPassword(req), code);
}

export function allowed(req, res) {
  const code = process.env.ACCESS_CODE;
  if (!code) return true;
  if (passedGate(req)) return true;
  const given = String(req.headers['x-access-code'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(code).digest();
  if (crypto.timingSafeEqual(a, b)) return true;
  send(res, 401, { error: 'access_code', message: 'Zugangscode fehlt oder ist falsch.' });
  return false;
}

export async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) {
      const e = new Error('too_large');
      e.code = 'too_large';
      throw e;
    }
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

