// Site-wide gate: every page and API route needs the ACCESS_CODE, entered on a login page.
// A successful login sets an HttpOnly cookie. HTTP Basic (any user name) still works for scripts.
// Remove this file (or unset ACCESS_CODE) to open the site to the public.
export const config = { matcher: '/:path*' };

const COOKIE = 'ekg-access';
const NEXT = { headers: { 'x-middleware-next': '1' } };

async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return new Uint8Array(buf);
}
const hex = (u) => Array.from(u, (b) => b.toString(16).padStart(2, '0')).join('');

async function same(a, b) {
  const x = await sha(a);
  const y = await sha(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function safeNext(v) {
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/__') ? v : '/';
}

function loginPage(next, failed) {
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>EKG-Trainer</title>
<style>
@font-face{font-family:'Hanken Grotesk';font-weight:400;src:url(/fonts/hanken-grotesk-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'Hanken Grotesk';font-weight:700;src:url(/fonts/hanken-grotesk-latin-700-normal.woff2) format('woff2')}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f5f7;color:#33454f;font:17px/1.5 'Hanken Grotesk','Helvetica Neue',Arial,sans-serif;padding:20px}
.card{background:#fff;border:1px solid #d5dee4;border-radius:12px;padding:32px;width:100%;max-width:400px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:22px;color:#0f2230;margin-bottom:20px}
h1{font-size:20px;color:#0f2230;margin:0 0 6px}
p{margin:0 0 18px}
label{display:block;font-weight:700;color:#0f2230;font-size:15px;margin-bottom:6px}
input{width:100%;font:inherit;padding:12px;border:1.5px solid #c3d0d8;border-radius:8px;min-height:48px}
button{margin-top:16px;width:100%;font:inherit;font-weight:700;font-size:18px;color:#fff;background:#0b6f6b;border:0;border-radius:8px;min-height:48px;cursor:pointer}
button:hover{background:#07514e}
:focus-visible{outline:3px solid #0b6f6b;outline-offset:3px}
.err{color:#8c1f18;background:#f8dcd9;border-radius:8px;padding:10px 12px;margin:0 0 16px;font-size:15px}
.en{display:none}
html[lang=en] .en{display:inline}html[lang=en] .de{display:none}
</style></head><body>
<form class="card" method="post" action="/__login">
<div class="brand"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="8" fill="#0b6f6b"/><path d="M5 18h6l3-8 5 15 3-7h7" fill="none" stroke="#e8fbf9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>EKG-Trainer</div>
<h1><span class="de">Zugang mit Code</span><span class="en">Access with code</span></h1>
<p><span class="de">Diese Seite ist noch nicht öffentlich. Gib den Zugangscode ein.</span><span class="en">This site is not public yet. Enter the access code.</span></p>
${failed ? '<div class="err" role="alert"><span class="de">Der Code ist falsch.</span><span class="en">The code is wrong.</span></div>' : ''}
<label for="c"><span class="de">Zugangscode</span><span class="en">Access code</span></label>
<input id="c" name="code" type="password" autocomplete="current-password" required autofocus>
<input type="hidden" name="next" value="${next.replace(/[&"<>]/g, (ch) => '&#' + ch.charCodeAt(0) + ';')}">
<button type="submit"><span class="de">Weiter</span><span class="en">Continue</span></button>
</form>
<script>(function(){var l='de';try{var v=localStorage.getItem('ekg-lang');if(v==='de'||v==='en')l=v;else if(!/^de/i.test(navigator.language||''))l='en';}catch(e){}document.documentElement.lang=l;})();</script>
</body></html>`;
  return new Response(html, {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });
}

export default async function middleware(request) {
  const code = process.env.ACCESS_CODE;
  if (!code) return new Response(null, NEXT);

  const url = new URL(request.url);
  if (url.pathname.startsWith('/fonts/')) return new Response(null, NEXT);

  const token = hex(await sha('ekg-access:' + code));

  if (url.pathname === '/__login' && request.method === 'POST') {
    let given = '';
    let next = '/';
    try {
      const form = await request.formData();
      given = String(form.get('code') || '');
      next = safeNext(String(form.get('next') || '/'));
    } catch (e) {
      /* fall through to the failed page */
    }
    if (given && (await same(given, code))) {
      return new Response(null, {
        status: 303,
        headers: {
          location: next,
          'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
          'cache-control': 'no-store',
        },
      });
    }
    return loginPage(next, true);
  }

  const cookies = request.headers.get('cookie') || '';
  const m = cookies.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([0-9a-f]{64})'));
  let ok = !!m && (await same(m[1], token));

  if (!ok) {
    const auth = request.headers.get('authorization') || '';
    if (auth.startsWith('Basic ')) {
      try {
        const raw = atob(auth.slice(6));
        ok = await same(raw.slice(raw.indexOf(':') + 1), code);
      } catch (e) {
        ok = false;
      }
    }
  }

  if (ok) return new Response(null, { headers: { 'x-middleware-next': '1', 'x-robots-tag': 'noindex, nofollow' } });

  const wantsHtml = request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html');
  if (wantsHtml) return loginPage(safeNext(url.pathname + url.search), false);
  return new Response(JSON.stringify({ error: 'Zugang nur mit Code.' }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
  });
}
