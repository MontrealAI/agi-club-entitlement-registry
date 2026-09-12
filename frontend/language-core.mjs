/** Public language preferences only. No form values, receipts or storage access. */
export const LANGUAGES = Object.freeze(['fr', 'en']);
export const PAGES = Object.freeze(['index', 'member', 'admin', 'verify', 'privacy', 'legal', 'deployment', 'etherscan']);
export function chooseLanguage(search = '', preferences = []) {
  const explicit = new URLSearchParams(search).getAll('lang');
  if (explicit.length === 1 && LANGUAGES.includes(explicit[0])) return explicit[0];
  for (const preference of preferences) {
    const language = String(preference).toLowerCase().split('-')[0];
    if (LANGUAGES.includes(language)) return language;
  }
  return 'fr';
}
export function languageLink(href, language, base) {
  if (!LANGUAGES.includes(language)) throw Error('UNSUPPORTED_LANGUAGE');
  if (href.startsWith('#')) return href;
  const url = new URL(href, base), origin = new URL(base);
  const directory = origin.pathname.slice(0, origin.pathname.lastIndexOf('/') + 1);
  if (url.origin !== origin.origin || !PAGES.some(page => url.pathname === directory + page + '.html')) return href;
  url.search = '?lang=' + language;
  return url.pathname + url.search + url.hash;
}
export function translate(messages, key, language) {
  if (!LANGUAGES.includes(language) || !Object.hasOwn(messages, key)) throw Error('MISSING_TRANSLATION');
  return messages[key][language];
}
export function benefitTitle(entry, language) {
  return language === 'en' ? (entry.en || entry.fr || entry.title || entry.id) : (entry.fr || entry.title || entry.en || entry.id);
}
