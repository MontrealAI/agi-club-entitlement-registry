import {translate} from '../frontend/language-core.mjs';
import {RUNTIME_MESSAGES} from '../frontend/translations.mjs';
export function languageFixture(initial='fr') {
  let language=initial;const listeners=new Set();
  return {t:key=>translate(RUNTIME_MESSAGES,key,language),tr:(fr,en)=>language==='fr'?fr:en,getLanguage:()=>language,
    onLanguageChange:fn=>listeners.add(fn),changeLanguage:next=>{language=next;for(const listener of listeners)listener();}};
}
