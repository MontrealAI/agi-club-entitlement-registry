import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chooseLanguage,languageLink,translate,benefitTitle,PAGES} from '../frontend/language-core.mjs';
import {PAGE_MESSAGES,RUNTIME_MESSAGES} from '../frontend/translations.mjs';

test('Explicit supported language wins; browser preferences and French fallback are deterministic',()=>{
  assert.equal(chooseLanguage('?lang=fr',['en-US']),'fr');assert.equal(chooseLanguage('?lang=en',['fr-CA']),'en');
  assert.equal(chooseLanguage('', ['de-DE','en-CA','fr']),'en');assert.equal(chooseLanguage('', ['fr-CA','en']),'fr');
  for(const search of ['?lang=de','?lang=en&lang=fr','?lang=__proto__','?lang=%3Cscript%3E'])assert.equal(chooseLanguage(search,[]),'fr');
});
test('Internal language navigation discards every unrelated query and preserves the site subdirectory',()=>{
  const base='https://example.org/club/member.html?lang=fr';
  assert.equal(languageLink('verify.html?email=FICTITIOUS%40example.org&lang=fr#main','en',base),'/club/verify.html?lang=en#main');
  assert.equal(languageLink('#step-private','en',base),'#step-private');
  for(const href of ['https://etherscan.io/address/0x123#writeContract','mailto:president@montreal.ai?subject=AGI','https://other.example.org/member.html','../member.html'])assert.equal(languageLink(href,'en',base),href);
  assert.throws(()=>languageLink('member.html','de',base),/UNSUPPORTED_LANGUAGE/);
});
test('All marked public text, titles, placeholders and accessible labels have complete immutable translations',()=>{
  for(const page of PAGES){
    const html=fs.readFileSync('frontend/'+page+'.html','utf8');
    assert(html.includes('id="languageChoice"'));assert(html.includes('data-language="fr"'));assert(html.includes('data-language="en"'));
    assert(html.includes('src="language.mjs"'));
    for(const match of html.matchAll(/data-l10n(?:-aria-label|-placeholder|-title)?="([^"]+)"/g))for(const lang of ['fr','en'])assert(translate(PAGE_MESSAGES,match[1],lang).trim(),page+' '+match[1]);
  }
  for(const messages of [PAGE_MESSAGES,RUNTIME_MESSAGES]){
    assert(Object.isFrozen(messages));
    for(const pair of Object.values(messages)){assert(Object.isFrozen(pair));assert.deepEqual(Object.keys(pair).sort(),['en','fr']);for(const value of Object.values(pair))assert.equal(typeof value,'string');}
  }
  assert.throws(()=>translate(RUNTIME_MESSAGES,'__proto__','en'),/MISSING_TRANSLATION/);
});
test('A benefit uses the published title in the chosen language with an explicit available-title fallback',()=>{
  const e={id:'public-id',fr:'Avantage fictif',en:'Fictitious benefit'};
  assert.equal(benefitTitle(e,'fr'),e.fr);assert.equal(benefitTitle(e,'en'),e.en);
  assert.equal(benefitTitle({...e,en:''},'en'),e.fr);assert.equal(benefitTitle({id:e.id},'en'),e.id);
});
test('Translations do not change the canonical signed protocol or private email envelope',()=>{
  for(const file of ['ticket-request.mjs','request-email.mjs','deployment-policy.mjs'])assert.equal(fs.readFileSync('shared/'+file,'utf8'),fs.readFileSync('frontend/shared/'+file,'utf8'));
  for(const file of ['frontend/language.mjs','frontend/language-core.mjs']){
    const source=fs.readFileSync(file,'utf8');
    for(const sink of [/\.value\b/,/innerHTML/,/MutationObserver/,/localStorage\s*\./,/sessionStorage\s*\./,/fetch\s*\(/,/\.cookie\s*=/])assert(!sink.test(source),file+' '+sink);
  }
});
