import {RUNTIME_MESSAGES} from '../frontend/translations.mjs';
import {languageFixture} from './language-fixture.mjs';
import {benefitTitle} from '../frontend/language-core.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ENS, WRAPPER, ROOT, REGISTRY_VERSION} from '../shared/ticket-request.mjs';
import {MEMBER_ABI} from '../frontend/contract-abi.mjs';
import {PrivateMemory} from '../frontend/private-memory.mjs';
import {uint,utcSeconds} from '../frontend/etherscan-tools.mjs';
import {readCatalogPage,requestPolicy} from '../frontend/member-catalog.mjs';

// Actual UI handlers with simulated wallet, contract, and DOM boundaries.
// These fixtures never send a transaction or verify real Ethereum bytecode.
class Element {
  constructor(tag = '') { this.tagName = tag.toUpperCase(); }
  children = [];
  listeners = new Map();
  attributes = new Map();
  dataset = {};
  style = {};
  classList = {toggle() {}};
  textContent = '';
  _value = '';
  disabled = false;
  checked = false;
  open = false;
  get value() { return this._value || (this.tagName === 'SELECT' ? this.children[0]?.value || '' : ''); }
  set value(value) { this._value = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; if (this.tagName === 'SELECT') this._value = ''; }
  addEventListener(name, handler) { this.listeners.set(name, [...(this.listeners.get(name) || []), handler]); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  async emit(name) { for (const handler of this.listeners.get(name) || []) await handler(); }
  async click() { if (!this.disabled) { await this.onclick?.(); await this.emit('click'); } }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function fixture(page) {
 const language=languageFixture('fr');
  const html = readFileSync(new URL(`../frontend/${page}.html`, import.meta.url), 'utf8');
  const filename = page === 'admin' ? 'app.js' : 'member.js';
  const source = readFileSync(new URL(`../frontend/${filename}`, import.meta.url), 'utf8');
  const elements = new Map();
  for (const [tag, name, id] of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const element = new Element(name);
    element.value = tag.match(/\bvalue="([^"]*)"/)?.[1] || '';
    element.disabled = /\sdisabled(?:\s|>)/.test(tag);
    elements.set(id, element);
  }
  if (page === 'member') elements.get('benefitSelect').value = 'IA101_2026_09_22';
  const hash = n => '0x' + BigInt(n).toString(16).padStart(64, '0');
  const account = '0x' + '11'.repeat(20);
  const state = {code: '0x6000', codeHash: hash(88), version: REGISTRY_VERSION, ens: ENS, wrapper: WRAPPER, root: ROOT, chain: '0x1', permissionEvent: false,catalogCount:0};
  const calls = [], sent = [], providers = [], waits = new Map(), walletListeners = new Map(), pageListeners = new Map();
  async function call(name, result) {
    calls.push(name);
    const wait = waits.get(name);
    if (wait) { waits.delete(name); wait.started.resolve(); await wait.pending.promise; }
    return result;
  }
  const transaction = name => Object.assign(
    async (...args) => { sent.push({name, args}); return {hash: hash(42), wait: async () => call(`${name}.wait`)}; },
    {staticCall: async () => call(`${name}.staticCall`), estimateGas: async () => call(`${name}.estimateGas`, 21000n)},
  );
  const registry = {
    VERSION: async () => call('VERSION', state.version),
    CANONICAL_ENS: async () => state.ens, ensRegistry: async () => state.ens,
    CANONICAL_WRAPPER: async () => state.wrapper, adminNameWrapper: async () => state.wrapper,
    CLUB_AGI_ETH_NODE: async () => state.root, admin: async () => account,
    entitlementCount: async () => BigInt(state.catalogCount), entitlementIdsPage: async (offset,limit) => call('catalogPage',Array.from({length:Math.min(limit,state.catalogCount-offset)},(_,i)=>hash(1000+offset+i))),
    paused: async () => false, titleEN: async () => state.catalogEnglishTitle||'', titleFR: async () => {if(state.failCatalog)throw Error('Fixture read failure');return state.catalogTitle||'Fictitious benefit';},
    entitlement: async () => [hash(1),hash(0),50n,0n,0n,0n,0n,2n,true],
    claimability: async () => call('claimability', [0]),
    claimRecord: async () => [account, 0n, 0n, 0n, 0n, 0n],
    interface: {encodeFunctionData: () => '0x12345678'},
    pause: transaction('pause'), claim: transaction('claim'),
  };
  const ethers = {
    ZeroAddress: '0x' + '00'.repeat(20), ZeroHash: hash(0),
    isAddress: value => /^0x[0-9a-fA-F]{40}$/.test(value),
    namehash: name => name === 'club.agi.eth' ? ROOT : hash(77),
    keccak256: () => state.codeHash, id: () => hash(99),
    BrowserProvider: class {
      constructor() { providers.push(this); }
      async getSigner() { return {getAddress: async () => account}; }
      async getCode() { return call('getCode', state.code); }
      destroy() { this.destroyed = true; }
    },
    Contract: class { constructor() { return registry; } },
  };
  const window = {
    ethers, addEventListener: (event, handler) => pageListeners.set(event, handler),
    AGI_CONFIG: {registryAddress: '0x' + '22'.repeat(20), registryCodeHash: hash(88), expectedOrigin: 'https://claims.example.org', allowedEntitlements: ['IA101_2026_09_22']},
    ethereum: {
      request: async ({method}) => {
        if (method === 'eth_chainId') return state.chain;
        if (method === 'eth_requestAccounts' && state.permissionEvent) walletListeners.get('accountsChanged')?.([account]);
        if (method === 'wallet_switchEthereumChain') {
          state.chain = '0x1';
          walletListeners.get('chainChanged')?.(state.chain);
          return null;
        }
        return [account];
      },
      on: (event, handler) => walletListeners.set(event, handler),
    },
  };
  // Import declarations are supplied below; the member handler body is unchanged.
  runInNewContext(source.replace(/^import .*;\r?\n/gm, ''), {
    ...language,RUNTIME_MESSAGES,benefitTitle,window, ethers, ENS, WRAPPER, ROOT, REGISTRY_VERSION, MEMBER_ABI, PrivateMemory, uint,utcSeconds,readCatalogPage,requestPolicy,
    location: {origin: window.AGI_CONFIG.expectedOrigin},
    document: {
      body: {dataset: {page}}, addEventListener() {},
      getElementById: id => elements.get(id) || null,
      createElement: tag => new Element(tag),
    },
    confirm: () => true, setTimeout: () => 1, clearTimeout() {},
  }, {filename: `frontend/${filename}`});
  return {
    changeLanguage:language.changeLanguage,state, calls, sent, providers,config:window.AGI_CONFIG,
    el: id => elements.get(id), click: id => elements.get(id).click(),
    walletEvent: event => walletListeners.get(event)?.([]),
    pageEvent: event => pageListeners.get(event)?.(),
    acknowledgeUsage: async () => { const input=elements.get('usageConsent'); input.checked=true; await input.emit('change'); },
    pause: name => {
      const started = Promise.withResolvers(), pending = Promise.withResolvers();
      waits.set(name, {started, pending});
      return {started: started.promise, release: pending.resolve};
    },
  };
}

async function chooseBenefit(ui){ui.el('benefitSelect').value=ui.el('benefitSelect').children[1]?.value||'';await ui.el('benefitSelect').emit('input');}

async function attemptTransaction(ui, page) {
  if (page === 'admin') { await ui.click('pause'); await ui.click('approveConfirm'); }
  else { ui.el('benefitSelect').value=ui.el('benefitSelect').children[1]?.value||'';await ui.el('benefitSelect').emit('input');ui.el('memberLabel').value = 'alice'; await ui.click('verify'); await ui.acknowledgeUsage(); await ui.click('claim'); }
}

for (const page of ['admin', 'member']) {
  test(`${page}: a verified connection still supports a transaction`, async () => {
    const ui = fixture(page);
    await ui.click('connect');
    await attemptTransaction(ui, page);
    assert.equal(ui.sent.length, 1);
  });

  for (const prompt of ['account permission', 'network switch']) {
    test(`${page}: ${prompt} events allow initial verification to complete`, async () => {
      const ui = fixture(page);
      if (prompt === 'account permission') ui.state.permissionEvent = true;
      else ui.state.chain = '0x7a69';
      await ui.click('connect');
      await attemptTransaction(ui, page);
      assert.equal(ui.sent.length, 1);
    });
  }

  test(`${page}: a failed reconnect cannot reuse the previous verified session`, async () => {
    const ui = fixture(page);
    await ui.click('connect');
    ui.state.version = '0.0.0';
    await ui.click('connect');
    await attemptTransaction(ui, page);
    assert.equal(ui.sent.length, 0);
    assert.ok(ui.providers.every(provider => provider.destroyed));
  });

  test(`${page}: a disconnected provider stays alive until an already-submitted transaction settles`, async () => {
    const ui = fixture(page);
    await ui.click('connect');
    const confirmation = ui.pause(page === 'admin' ? 'pause.wait' : 'claim.wait');
    const action = attemptTransaction(ui, page);
    await confirmation.started;
    assert.equal(ui.sent.length, 1);
    ui.walletEvent('disconnect');
    const status = ui.el('status').textContent;
    assert.notEqual(ui.providers[0].destroyed, true);
    confirmation.release();
    await action;
    assert.equal(ui.providers[0].destroyed, true);
    assert.equal(ui.el('status').textContent, status);
    assert.equal(ui.sent.length, 1);
  });

  for (const [field, value] of [['code', '0x'], ['codeHash', '0x' + 'ff'.repeat(32)], ['version', '0.0.0'], ['ens', '0x' + 'aa'.repeat(20)], ['wrapper', '0x' + 'bb'.repeat(20)], ['root', '0x' + 'cc'.repeat(32)]]) {
    test(`${page}: failed ${field} verification leaves no transaction-capable session`, async () => {
      const ui = fixture(page);
      ui.state[field] = value;
      await ui.click('connect');
      await attemptTransaction(ui, page);
      assert.equal(ui.sent.length, 0, 'a rejected connection must never submit a transaction');
      assert.equal(ui.providers[0].destroyed, true, 'release the rejected provider');
      if (page === 'member') assert.equal(ui.el('contactInputs').disabled, true);
    });
  }

  test(`${page}: disconnect during verification cannot restore a connected UI`, async () => {
    const ui = fixture(page), validation = ui.pause('VERSION');
    const connecting = ui.click('connect');
    await validation.started;
    ui.walletEvent('disconnect');
    const status = ui.el('status').textContent;
    validation.release();
    await connecting;
    assert.equal(ui.el('status').textContent, status);
    assert.equal(ui.el('connection').textContent, '');
    assert.equal(ui.providers[0].destroyed, true);
    await attemptTransaction(ui, page);
    assert.equal(ui.sent.length, 0);
  });
}

test('admin: demo activation cancels an outstanding connection attempt', async () => {
  const ui = fixture('admin'), validation = ui.pause('getCode');
  const connecting = ui.click('connect');
  await validation.started;
  await ui.click('demo');
  const status = ui.el('status').textContent;
  validation.release();
  await connecting;
  assert.equal(ui.el('status').textContent, status);
  assert.match(ui.el('authority').textContent, /DÉMONSTRATION/);
  assert.equal(ui.providers[0].destroyed, true);
});

for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) {
  test(`admin: ${event} discards a prepared transaction before reconnecting`, async () => {
    const ui = fixture('admin');
    await ui.click('connect');
    await ui.click('pause');
    assert.equal(ui.el('confirm').open, true);
    ui.walletEvent(event);
    assert.equal(ui.el('confirm').open, false);
    assert.equal(ui.el('confirmData').textContent, '');
    await ui.click('connect');
    await ui.click('approveConfirm');
    assert.equal(ui.sent.length, 0);
  });
}

test('admin: reconnecting during gas estimation cannot submit the old transaction', async () => {
  const ui = fixture('admin');
  await ui.click('connect');
  await ui.click('pause');
  const estimation = ui.pause('pause.estimateGas');
  const approving = ui.click('approveConfirm');
  await estimation.started;
  ui.walletEvent('accountsChanged');
  await ui.click('connect');
  estimation.release();
  await approving;
  assert.equal(ui.sent.length, 0);
});

test('member: editing the membership during inspection discards the old eligibility', async () => {
  const ui = fixture('member');
  await ui.click('connect');
  await chooseBenefit(ui);ui.el('memberLabel').value = 'alice';
  const inspection = ui.pause('claimability');
  const inspecting = ui.click('verify');
  await inspection.started;
  ui.el('memberLabel').value = 'bob';
  await ui.el('memberLabel').emit('input');
  inspection.release();
  await inspecting;
  assert.equal(ui.el('claim').disabled, true);
  assert.equal(ui.el('contactInputs').disabled, true);
  await ui.click('claim');
  assert.equal(ui.sent.length, 0);
});

test('member: editing the membership during gas estimation cancels the old claim', async () => {
  const ui = fixture('member');
  await ui.click('connect');
  await chooseBenefit(ui);ui.el('memberLabel').value = 'alice';
  await ui.click('verify');
  const estimation = ui.pause('claim.estimateGas');
  await ui.acknowledgeUsage();
  const claiming = ui.click('claim');
  await estimation.started;
  ui.el('memberLabel').value = 'bob';
  await ui.el('memberLabel').emit('input');
  estimation.release();
  await claiming;
  assert.equal(ui.sent.length, 0);
});

test('member: public reads need no acknowledgement but a claim does', async () => {
  const ui=fixture('member');await ui.click('connect');
  await chooseBenefit(ui);ui.el('memberLabel').value='alice';await ui.click('verify');
  assert.equal(ui.el('usageConsent').checked,false);
  await ui.click('claim');assert.equal(ui.sent.length,0);
  assert(!ui.calls.includes('claim.staticCall'));
  assert.match(ui.el('status').textContent,/conditions/);
});

for(const cancel of ['withdraw','withdraw and acknowledge again','clear','pagehide','pageshow','beforeunload']) {
 test('member: '+cancel+' during gas estimation invalidates the pending claim',async()=>{
  const ui=fixture('member');await ui.click('connect');
  await chooseBenefit(ui);ui.el('memberLabel').value='alice';await ui.click('verify');await ui.acknowledgeUsage();
  const estimation=ui.pause('claim.estimateGas'),claiming=ui.click('claim');await estimation.started;
  if(cancel.startsWith('withdraw')){ui.el('usageConsent').checked=false;await ui.el('usageConsent').emit('change');if(cancel.endsWith('again'))await ui.acknowledgeUsage();}
  else if(cancel==='clear')await ui.click('clearPrivate');
  else ui.pageEvent(cancel);
  estimation.release();await claiming;assert.equal(ui.sent.length,0);
 });
}
for(const event of ['accountsChanged','chainChanged','disconnect'])test('member: '+event+' clears the reading acknowledgement',async()=>{
 const ui=fixture('member');await ui.click('connect');await ui.acknowledgeUsage();
 ui.walletEvent(event);assert.equal(ui.el('usageConsent').checked,false);
});

test('member: empty registry is usable without offering or selecting a fictitious event',async()=>{
 const ui=fixture('member');ui.config.entitlementMode='registry';ui.config.allowedEntitlements=[];
 await ui.click('connect');assert.equal(ui.el('benefitSelect').disabled,true);assert.equal(ui.el('verify').disabled,true);assert.equal(ui.el('claim').disabled,true);
 assert.equal(ui.el('refreshBenefits').disabled,false);assert.match(ui.el('catalogStatus').textContent,/registre est vide/);
 ui.state.catalogCount=1;await ui.click('refreshBenefits');assert.equal(ui.el('benefitSelect').children.length,2);assert.equal(ui.el('benefitSelect').value,'');
 await attemptTransaction(ui,'member');assert.equal(ui.sent.length,1);
});
test('member: catalogue pages preserve selection and reflect admin title changes on refresh',async()=>{
 const ui=fixture('member');ui.config.entitlementMode='registry';ui.config.allowedEntitlements=[];ui.state.catalogCount=61;
 await ui.click('connect');assert.equal(ui.el('benefitSelect').children.length,26);assert.equal(ui.el('verify').disabled,true);
 await ui.click('loadBenefits');await ui.click('loadBenefits');assert.equal(ui.el('benefitSelect').children.length,62);
 ui.el('benefitSelect').value=ui.el('benefitSelect').children[60].value;await ui.el('benefitSelect').emit('input');const selected=ui.el('benefitSelect').value;
 ui.state.catalogTitle='Modified public title';await ui.click('refreshBenefits');assert.equal(ui.el('benefitSelect').value,selected);assert.equal(ui.el('benefitSelect').children.length,62);
 assert.match(ui.el('benefitSelect').children[60].textContent,/Modified public title/);assert.equal(ui.el('loadBenefits').disabled,true);
});
test('member: failed page can be retried without skipping benefits',async()=>{
 const ui=fixture('member');ui.config.entitlementMode='registry';ui.config.allowedEntitlements=[];ui.state.catalogCount=31;
 await ui.click('connect');ui.state.failCatalog=true;await ui.click('loadBenefits');assert.equal(ui.el('benefitSelect').children.length,26);
 assert.match(ui.el('status').textContent,/Catalogue indisponible/);
 ui.state.failCatalog=false;await ui.click('loadBenefits');assert.equal(ui.el('benefitSelect').children.length,32);
});
test('member: disconnect during a catalogue page cannot restore the old options or status',async()=>{
 const ui=fixture('member');ui.config.entitlementMode='registry';ui.config.allowedEntitlements=[];ui.state.catalogCount=31;
 await ui.click('connect');const paused=ui.pause('catalogPage'),loading=ui.click('loadBenefits');await paused.started;ui.walletEvent('disconnect');const status=ui.el('status').textContent;
 paused.release();await loading;assert.equal(ui.el('benefitSelect').children.length,1);assert.equal(ui.el('benefitSelect').disabled,true);assert.equal(ui.el('status').textContent,status);
});

for(const page of ['member','admin'])test(page+': language change during gas estimation cancels the prepared transaction',async()=>{
 const ui=fixture(page);await ui.click('connect');
 const wait=ui.pause(page==='member'?'claim.estimateGas':'pause.estimateGas'),pending=attemptTransaction(ui,page);
 await wait.started;ui.changeLanguage('en');wait.release();await pending;
 assert.equal(ui.sent.length,0);assert.match(ui.el('status').textContent,/changed|cancel|connect|Operation unconfirmed/i);
});
test('Member runtime errors and eligibility use the selected language',async()=>{
 const ui=fixture('member');ui.changeLanguage('en');await ui.click('connect');await chooseBenefit(ui);
 ui.el('memberLabel').value='alice';await ui.click('verify');assert.match(ui.el('eligibility').textContent,/Available/);
 ui.el('memberLabel').value='invalid.name';await ui.click('verify');assert.match(ui.el('status').textContent,/Enter a single AGI Club label/);
});
