import {chooseLanguage, languageLink, translate, LANGUAGES} from './language-core.mjs';
import {PAGE_MESSAGES, RUNTIME_MESSAGES} from './translations.mjs';
let language = chooseLanguage(location.search, navigator.languages || [navigator.language]);
const listeners = new Set();
export const getLanguage = () => language;
export const t = key => translate(RUNTIME_MESSAGES, key, language);
export const tr = (fr, en) => language === 'fr' ? fr : en;
export function onLanguageChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function render() {
  document.documentElement.lang = language;
  // Only source-marked UI nodes are translated. Never inspect an input value,
  // a private receipt, a result, an arbitrary text node or a wallet message.
  for (const el of document.querySelectorAll('[data-l10n]')) el.textContent = translate(PAGE_MESSAGES, el.dataset.l10n, language);
  for (const el of document.querySelectorAll('[data-l10n-runtime]')) el.textContent = t(el.dataset.l10nRuntime);
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    for (const el of document.querySelectorAll('[data-l10n-' + attribute + ']')) el.setAttribute(attribute, translate(PAGE_MESSAGES, el.getAttribute('data-l10n-' + attribute), language));
  }
  for (const el of document.querySelectorAll('[data-language-content]')) el.hidden = el.dataset.languageContent !== language;
  for (const el of document.querySelectorAll('[data-language]')) el.setAttribute('aria-pressed', String(el.dataset.language === language));
  for (const el of document.querySelectorAll('a[href]')) el.setAttribute('href', languageLink(el.getAttribute('href'), language, location.href));
  const guide = document.querySelector('[data-operator-guide]');
  if (guide) guide.href = 'https://github.com/MontrealAI/agi-club-entitlement-registry/blob/main/docs/OPERATOR_GUIDE_' + language.toUpperCase() + '.md';
  // Replace, never append, a history entry. Carry only the public language and a
  // known in-page anchor; no query value supplied by a form is read or copied.
  const hash = /^#(?:main|step-membership|step-claim|step-private|step-send|english|conditions-en|conditions-fr)$/.test(location.hash) ? location.hash : '';
  history.replaceState(null, '', location.pathname + '?lang=' + language + hash);
}
export function setLanguage(next) {
  if (!LANGUAGES.includes(next)) throw Error('UNSUPPORTED_LANGUAGE');
  if (next === language) return;
  language = next;
  render();
  for (const listener of listeners) listener();
}
if (location.hash === '#english' && !new URLSearchParams(location.search).has('lang')) language = 'en';
render();
for (const el of document.querySelectorAll('[data-language]')) el.addEventListener('click', () => setLanguage(el.dataset.language));
document.getElementById('languageChoice').hidden = false;
