// Local server: serves dist/index.html and runs the api/ functions with a small req/res adapter.
// MOCK_EXTERNAL=1 replaces the call to the Anthropic API with a canned answer, for tests without a key.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const port = Number(process.env.PORT || 3000);
const root = path.resolve('.');

if (process.env.MOCK_EXTERNAL) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.anthropic.com')) {
      const body = JSON.parse(opts.body);
      const user = body.messages[0].content;
      globalThis.__lastEval = { system: body.system, user, model: body.model };
      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'tool_use',
              name: 'bewertung',
              input: {
                punkte: 82,
                zusammenfassung: 'Rhythmus und Frequenz stimmen, der Lagetyp fehlt.',
                items: [
                  { aspekt: 'Rhythmus', urteil: 'richtig', gesagt: 'Sinusrhythmus', erwartet: 'Sinusrhythmus', kommentar: 'P vor jedem QRS.' },
                  { aspekt: 'Lagetyp', urteil: 'fehlt', gesagt: 'nichts dazu gesagt', erwartet: 'Indifferenztyp', kommentar: 'Gehört zum Befund auf Arztniveau.' },
                ],
                erfunden: [],
                musterbefund: 'Sinusrhythmus mit 70 pro Minute, Indifferenztyp, schmaler QRS, keine Erregungsrückbildungsstörung.',
              },
            },
          ],
        }),
        { status: 200 },
      );
    }
    return real(url, opts);
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    try {
      const mod = await import(pathToFileURL(path.join(root, 'api', `${name}.js`)).href);
      await mod.default(req, res);
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }
  if (url.pathname.startsWith('/fonts/')) {
    res.setHeader('Content-Type', 'font/woff2');
    res.end(readFileSync(path.join(root, 'dist', 'fonts', path.basename(url.pathname))));
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const first = url.pathname.split('/')[1];
  const page = ['app', 'impressum', 'datenschutz'].includes(first) ? path.join(first, 'index.html') : 'index.html';
  res.end(readFileSync(path.join(root, 'dist', page)));
});
server.listen(port, () => console.log(`http://localhost:${port}`));
