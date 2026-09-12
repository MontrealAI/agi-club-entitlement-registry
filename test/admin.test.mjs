import {RUNTIME_MESSAGES} from '../frontend/translations.mjs';
import {languageFixture} from './language-fixture.mjs';
import {benefitTitle} from '../frontend/language-core.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {uint,utcSeconds} from '../frontend/etherscan-tools.mjs';

// Run the actual admin script with a minimal DOM and read-only wallet/registry
// fixtures. This checks UI state, not Ethereum cryptography or browser security.
const source = readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../frontend/admin.html', import.meta.url), 'utf8');
const hash = n => '0x' + BigInt(n).toString(16).padStart(64, '0');
const account = '0x' + '11'.repeat(20);
const ens = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const wrapper = '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';

class Element {
  children = [];
  dataset = {};
  style = {};
  attributes = new Map();
  listeners = new Map();
  textContent = '';
  value = '';
  disabled = false;
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(name, listener) {
    this.listeners.set(name, [...(this.listeners.get(name) || []), listener]);
  }
  async click() {
    if (this.disabled) return;
    await this.onclick?.();
    for (const listener of this.listeners.get('click') || []) await listener();
  }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function adminFixture(count = 2) {
 const language=languageFixture('fr');
  const elements = new Map();
  for (const [tag, id] of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const element = new Element();
    element.value = tag.match(/\bvalue="([^"]*)"/)?.[1] || '';
    elements.set(id, element);
  }
  const rows = Array.from({length: count}, (_, i) => ({
    id: hash(i + 1), category: hash(i + 1000), title: `Benefit ${i + 1}`,
  }));
  const pages = [];
  let failingId = null;
  let pausedRead = null;
  const walletListeners = new Map();
  const registry = {
    VERSION: async () => '2.1.1',
    ensRegistry: async () => ens,
    CANONICAL_ENS: async () => ens,
    adminNameWrapper: async () => wrapper,
    CANONICAL_WRAPPER: async () => wrapper,
    CLUB_AGI_ETH_NODE: async () => hash(77),
    admin: async () => account,
    paused: async () => false,
    entitlementCount: async () => BigInt(rows.length),
    entitlementIdsPage: async (start, size) => {
      assert.ok(size > 0 && size <= 100, 'contract page size must be 1–100');
      pages.push([start, size]);
      return rows.slice(start, start + size).map(row => row.id);
    },
    entitlement: async id => {
      if (id === pausedRead?.id) {
        const read = pausedRead;
        pausedRead = null;
        read.started();
        await read.pending;
      }
      if (id === failingId) throw Error('Fixture RPC read failed');
      const row = rows.find(row => row.id === id);
      assert.ok(row, 'requested entitlement must exist');
      return [row.category, hash(0), 50n, 0n, 0n, 0n, 0n, 1n, true];
    },
    titleFR: async id => rows.find(row => row.id === id).title,
    titleEN: async id => rows.find(row => row.id === id).title,
    metadataURI: async () => '',
    interface: {encodeFunctionData: () => '0x'},
  };
  const ethers = {
    ZeroAddress: '0x' + '00'.repeat(20), ZeroHash: hash(0),
    isAddress: value => /^0x[0-9a-fA-F]{40}$/.test(value),
    namehash: () => hash(77), keccak256: () => hash(88),
    id: () => hash(99),
    BrowserProvider: class {
      async getSigner() { return {getAddress: async () => account}; }
      async getCode() { return '0x6000'; }
    },
    Contract: class { constructor() { return registry; } },
  };
  const window = {
    ethers,
    AGI_CONFIG: {
      registryAddress: '0x' + '22'.repeat(20),
      registryCodeHash: hash(88), expectedOrigin: 'https://claims.example.org',
    },
    ethereum: {
      request: async ({method}) => method === 'eth_chainId' ? '0x1' : [account],
      on: (event, listener) => walletListeners.set(event, listener),
    },
  };
  runInNewContext(source.replace(/^import .*;\r?\n/gm,''), {...language,RUNTIME_MESSAGES,benefitTitle,uint,utcSeconds,
    window, ethers, location: {origin: window.AGI_CONFIG.expectedOrigin},
    document: {
      body: {dataset: {page: 'admin'}},
      getElementById: id => elements.get(id) || null,
      createElement: () => new Element(),
    },
    confirm: () => true,
  }, {filename: 'frontend/app.js'});
  return {
    changeLanguage:language.changeLanguage,rows, pages, el: id => elements.get(id),
    click: id => elements.get(id).click(),
    select: index => elements.get('catalog').children[index].children[1].click(),
    ids: () => elements.get('catalog').children.map(card => card.children[0].children[2].textContent),
    failRead: id => { failingId = id; },
    pauseRead: id => {
      const started = Promise.withResolvers();
      const pending = Promise.withResolvers();
      pausedRead = {id, started: started.resolve, pending: pending.promise};
      return {started: started.promise, release: pending.resolve};
    },
    walletChanged: () => walletListeners.get('accountsChanged')([]),
  };
}

test('selecting a benefit preserves its stored category in the transaction preview', async () => {
  const ui = adminFixture();
  await ui.click('connect');
  assert.equal(ui.ids().length, 2);
  for (const index of [1, 0]) {
    await ui.select(index);
    assert.equal(ui.el('category').value, ui.rows[index].category);
    await ui.click('updateCategory');
    assert.equal(ui.el('confirm').open, true);
    const plan = JSON.parse(ui.el('confirmData').textContent);
    assert.equal(plan.method, 'setCategory');
    assert.deepEqual(plan.args, [ui.rows[index].id, ui.rows[index].category]);
    await ui.click('cancelConfirm');
  }
});

for (const count of [123, 160]) {
  test(`refresh preserves all loaded pages and the selection in a ${count}-benefit catalog`, async () => {
    const ui = adminFixture(count);
    await ui.click('connect');
    assert.equal(ui.ids().length, 50);
    await ui.click('loadMore');
    await ui.click('loadMore');
    const expected = ui.rows.slice(0, 150).map(row => row.id);
    assert.deepEqual(ui.ids(), expected);
    await ui.select(120);
    ui.rows[120].title = 'Updated benefit';
    await ui.click('refresh');
    assert.deepEqual(ui.ids(), expected);
    assert.equal(ui.el('canonical').value, ui.rows[120].id);
    assert.equal(ui.el('titleFR').value, 'Updated benefit');
    await ui.click('loadMore');
    assert.deepEqual(ui.ids(), ui.rows.map(row => row.id));
    assert.doesNotMatch(ui.el('log').textContent, /ERREUR/);
  });
}

test('a failed refresh preserves the catalog so loading more cannot skip or duplicate benefits', async () => {
  const ui = adminFixture(123);
  await ui.click('connect');
  ui.failRead(ui.rows[10].id);
  await ui.click('refresh');
  assert.match(ui.el('status').textContent, /Opération non confirmée/);
  assert.deepEqual(ui.ids(), ui.rows.slice(0, 50).map(row => row.id));
  ui.failRead(null);
  await ui.click('loadMore');
  assert.deepEqual(ui.ids(), ui.rows.slice(0, 100).map(row => row.id));
});

test('an empty catalog can be refreshed and paginated', async () => {
  const ui = adminFixture(0);
  await ui.click('connect');
  await ui.click('refresh');
  await ui.click('loadMore');
  assert.deepEqual(ui.ids(), []);
  assert.equal(ui.el('count').textContent, '0');
  assert.doesNotMatch(ui.el('log').textContent, /ERREUR/);
});

test('a refresh overlapping load-more preserves complete, ordered pages', async () => {
  const ui = adminFixture(160);
  await ui.click('connect');
  const read = ui.pauseRead(ui.rows[60].id);
  const loading = ui.click('loadMore');
  await read.started;
  const refreshing = ui.click('refresh');
  read.release();
  await Promise.all([loading, refreshing]);
  assert.deepEqual(ui.ids(), ui.rows.slice(0, 100).map(row => row.id));
  assert.doesNotMatch(ui.el('log').textContent, /ERREUR/);
});

for (const change of ['demo', 'wallet']) {
  test(`a pending catalog read cannot overwrite state after a ${change} change`, async () => {
    const ui = adminFixture(123);
    await ui.click('connect');
    const read = ui.pauseRead(ui.rows[60].id);
    const loading = ui.click('loadMore');
    await read.started;
    if (change === 'demo') await ui.click('demo');
    else ui.walletChanged();
    const expectedIds = ui.ids();
    const expectedStatus = ui.el('status').textContent;
    read.release();
    await loading;
    assert.deepEqual(ui.ids(), expectedIds);
    assert.equal(ui.el('status').textContent, expectedStatus);
  });
}

test('demo categories remain editable after selection and repeated updates', async () => {
  const ui = adminFixture();
  await ui.click('demo');
  assert.equal(ui.ids().length,0);
  ui.el('canonical').value='FICTITIOUS_BENEFIT';ui.el('category').value='EVENT';ui.el('capacity').value='2';
  await ui.click('create');
  assert.equal(ui.el('category').value, 'EVENT');
  ui.el('category').value = 'BRIEFING';
  await ui.click('updateCategory');
  ui.el('category').value = 'PERK';
  await ui.select(0);
  assert.equal(ui.el('category').value, 'BRIEFING');
  await ui.click('updateCategory');
  assert.equal(ui.el('category').value, 'BRIEFING');
  assert.doesNotMatch(ui.el('log').textContent, /ERREUR/);
});

test('New benefit and demo start empty without inheriting a selected event or approval',async()=>{
 const ui=adminFixture();await ui.click('connect');await ui.select(0);await ui.click('updateCategory');
 assert.equal(ui.el('canonical').readOnly,true);await ui.click('showCreate');
 for(const field of ['canonical','category','capacity','titleFR','titleEN','metadataURI','metadataHash','opens','closes'])assert.equal(ui.el(field).value,'',field);
 assert.equal(ui.el('state').value,'1');assert.equal(ui.el('canonical').readOnly,false);assert.equal(ui.el('confirm').open,false);
 await ui.click('demo');assert.deepEqual(ui.ids(),[]);assert.equal(ui.el('capacity').value,'');
 await ui.click('create');assert.deepEqual(ui.ids(),[],'Blank defaults cannot create a benefit');
});
test('Administrator can preserve and modify quotas beyond Number precision without rounding',async()=>{
 const ui=adminFixture();await ui.click('demo');ui.el('canonical').value='FICTITIOUS_LARGE';ui.el('category').value='PERK';ui.el('capacity').value='18446744073709551615';await ui.click('create');
 assert.equal(ui.el('capacity').value,'18446744073709551615');assert.equal(ui.el('remainingStat').textContent,'18446744073709551615');
 ui.el('capacity').value='9007199254740993';await ui.click('updateCap');assert.equal(ui.el('capacity').value,'9007199254740993');
 ui.el('capacity').value='18446744073709551616';await ui.click('updateCap');await ui.select(0);assert.equal(ui.el('capacity').value,'9007199254740993');
});
test('Invalid calendar dates cannot silently roll into another month',async()=>{
 const ui=adminFixture();await ui.click('demo');ui.el('canonical').value='FICTITIOUS_DATES';ui.el('category').value='PERK';ui.el('capacity').value='1';ui.el('opens').value='2027-02-30T12:00:00Z';await ui.click('create');
 assert.deepEqual(ui.ids(),[]);assert.match(ui.el('status').textContent,/date UTC réelle/);
 ui.el('opens').value='18446744073709551615';await ui.click('create');assert.equal(ui.el('opens').value,'18446744073709551615');
});

test('Language changes keep public edits and discard the previous transaction preview',async()=>{
 const ui=adminFixture();await ui.click('connect');await ui.select(0);
 ui.el('titleEN').value='Edited public title';ui.el('capacity').value='9007199254740993';
 await ui.click('updateCap');assert(ui.el('confirm').open);
 ui.changeLanguage('en');assert(!ui.el('confirm').open);assert.equal(ui.el('confirmData').textContent,'');
 assert.equal(ui.el('titleEN').value,'Edited public title');assert.equal(ui.el('capacity').value,'9007199254740993');
 await ui.click('updateCap');assert.match(ui.el('confirmText').textContent,/Change the capacity/);
 assert.equal(JSON.parse(ui.el('confirmData').textContent).args[1],'9007199254740993');
});

test('Untrusted provider failures are localized without echoing provider details to the screen or session log',async()=>{
 const ui=adminFixture(2);await ui.click('connect');ui.failRead(ui.rows[0].id);ui.changeLanguage('en');await ui.click('refresh');
 assert.match(ui.el('status').textContent,/Operation unconfirmed/);assert.doesNotMatch(ui.el('log').textContent,/Fixture RPC read failed/);
});
