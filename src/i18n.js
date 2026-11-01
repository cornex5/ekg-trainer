// Tiny gettext-style translation. German source strings are the keys,
// English comes from src/en.js. Unknown strings fall back to the key.
import { EN } from './en.js';

const KEY = 'ekg-lang';
export const LANGS = ['de', 'en'];

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch (e) {
    /* ignore */
  }
  const list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
  for (const l of list) {
    const code = String(l || '').toLowerCase().slice(0, 2);
    if (code === 'de') return 'de';
    if (code === 'en') return 'en';
  }
  return 'en';
}

let lang = detect();
const listeners = [];

export const getLang = () => lang;

export function t(de, params) {
  let s = de;
  if (lang === 'en') {
    if (EN[de] !== undefined) s = EN[de];
    else if (typeof window !== 'undefined' && de) (window.__i18nMissing = window.__i18nMissing || new Set()).add(de);
  }
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  return s;
}

export function setLang(l) {
  if (!LANGS.includes(l) || l === lang) return;
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch (e) {
    /* ignore */
  }
  applyDom();
  listeners.forEach((f) => f(l));
}

export function onLang(f) {
  listeners.push(f);
}

// Static markup: data-t="German text" (content), data-t-attr="attr:German text;attr2:..." for attributes.
export function applyDom(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-t]').forEach((el) => {
    const de = el.getAttribute('data-t');
    el.textContent = t(de);
  });
  root.querySelectorAll('[data-t-attr]').forEach((el) => {
    el.getAttribute('data-t-attr')
      .split('|')
      .forEach((pair) => {
        const i = pair.indexOf(':');
        el.setAttribute(pair.slice(0, i), t(pair.slice(i + 1)));
      });
  });
  root.querySelectorAll('[data-lang-btn]').forEach((b) => {
    const on = b.getAttribute('data-lang-btn') === lang;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// Decimal comma in German, point in English.
export const dec = (s) => (lang === 'de' ? String(s).replace('.', ',') : String(s));
