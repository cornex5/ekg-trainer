// Site-wide gate: every page and API route asks for the ACCESS_CODE (HTTP Basic, any user name).
// Remove this file (or unset ACCESS_CODE) to open the site to the public.
export const config = { matcher: '/:path*' };

async function digest(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

export default async function middleware(request) {
  const code = process.env.ACCESS_CODE;
  if (!code) return new Response(null, { headers: { 'x-middleware-next': '1' } });

  const auth = request.headers.get('authorization') || '';
  let given = '';
  if (auth.startsWith('Basic ')) {
    try {
      const raw = atob(auth.slice(6));
      given = raw.slice(raw.indexOf(':') + 1);
    } catch (e) {
      given = '';
    }
  }
  const a = await digest(given);
  const b = await digest(code);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];

  if (diff === 0) {
    return new Response(null, { headers: { 'x-middleware-next': '1', 'x-robots-tag': 'noindex, nofollow' } });
  }
  return new Response('Zugang nur mit Code.', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="EKG-Trainer", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
