import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const r = await build({ entryPoints: ['app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let html = readFileSync('index.html', 'utf8');
html = html.replace('<script type="module" src="./app.js"></script>', () => `<script>${js}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html', html.length, 'bytes');
if (!process.argv.includes('--artifact')) process.exit(0);

// The artifact host supplies doctype, head and body itself, so only content is kept.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\n?/, '').replace(/<meta name="viewport"[^>]*>\n?/, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/artifact.html', head + body);
console.log('artifact/artifact.html written');
