import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { EN_LANDING } from '../src/en-landing.js';

const r = await build({ entryPoints: ['app.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let html = readFileSync('index.html', 'utf8');
html = html.replace('<script type="module" src="./app.js"></script>', () => `<script>${js}</script>`);
mkdirSync('dist/app', { recursive: true });
writeFileSync('dist/app/index.html', html);
console.log('dist/app/index.html', html.length, 'bytes');
cpSync('fonts', 'dist/fonts', { recursive: true });
const landing = readFileSync('landing.html', 'utf8').replace('@@STEMI@@', readFileSync('tools/stemi-strip.txt', 'utf8').trim())
  .replace('@@EN@@', () => JSON.stringify(EN_LANDING));
writeFileSync('dist/index.html', landing);
console.log('dist/index.html', landing.length, 'bytes');
