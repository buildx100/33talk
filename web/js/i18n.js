import { STORAGE_LANG } from './config.js';
import * as storage from './storage.js';
import { en } from './locales/en.js';
import { zh } from './locales/zh.js';
import { ja } from './locales/ja.js';

/* A plain dictionary, no framework.

   The language buttons change the CHROME only. The paper is never
   translated: the type drum has 64 uppercase ASCII characters and
   physically cannot print Chinese or Japanese. The help dialog says so. */

export const T = { en, zh, ja };

let lang = 'en';
const listeners = [];

export function current() { return lang; }
export function dict() { return T[lang]; }
export function t(key) { const v = T[lang][key]; return v === undefined ? key : v; }

/* For the parts of the UI that are not a static string: the cheat bar
   labels, the verdict text. Registered by main.js. */
export function onChange(fn) { listeners.push(fn); }

export function detect() {
  const saved = storage.get(STORAGE_LANG);
  if (saved && T[saved]) return saved;
  const list = (navigator.languages && navigator.languages.length)
    ? navigator.languages : [navigator.language || 'en'];
  for (const raw of list) {
    const code = String(raw).toLowerCase();
    if (code.indexOf('zh') === 0) return 'zh';
    if (code.indexOf('ja') === 0) return 'ja';
    if (code.indexOf('en') === 0) return 'en';
  }
  return 'en';
}

/* Four attributes, applied generically, so adding a string never means
   editing this function:
     data-t        textContent
     data-t-html   innerHTML  (the help dialog body is markup)
     data-t-aria   aria-label
     data-t-title  title      */
export function apply(next, persist) {
  lang = T[next] ? next : 'en';
  const d = T[lang];
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-t]').forEach(el => {
    const v = d[el.dataset.t];
    if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll('[data-t-html]').forEach(el => {
    const v = d[el.dataset.tHtml];
    if (v !== undefined) el.innerHTML = v;
  });
  document.querySelectorAll('[data-t-aria]').forEach(el => {
    const v = d[el.dataset.tAria];
    if (v !== undefined) el.setAttribute('aria-label', v);
  });
  document.querySelectorAll('[data-t-title]').forEach(el => {
    const v = d[el.dataset.tTitle];
    if (v !== undefined) el.setAttribute('title', v);
  });
  document.querySelectorAll('[data-lang]').forEach(b => {
    b.classList.toggle('on', b.dataset.lang === lang);
  });

  if (persist) storage.set(STORAGE_LANG, lang);
  listeners.forEach(fn => fn(lang));
}
