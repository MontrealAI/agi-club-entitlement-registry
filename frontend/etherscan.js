import {ACTIONS, EXPLORER_ABI, defaultValue, prepareExplorerCall} from './etherscan-tools.mjs';
const $ = id => document.getElementById(id), ethers = window.ethers;
const iface = new ethers.Interface(EXPLORER_ABI);
let language = 'fr', prepared = null, generation = 0;
const french = Object.fromEntries([...document.querySelectorAll('[data-i18n]')].map(el => [el.dataset.i18n, el.textContent]));
const english = {
  skipContent:'Skip to content', footerPrivacy:'Privacy', footerLegal:'Terms · Legal', footerVerify:'Verify a receipt', footerDeployment:'Deployment',
  home:'Home', admin:'Administration', member:'Members', title:'Your registry, through Etherscan.',
  intro:'Prepare exact values to read, configure or use the verified contract. Every operation remains subject to registry rules and your wallet confirmation.',
  privacy:'Public parameters only. No participant names, email addresses, private receipts or secrets. This helper connects to no wallet and sends no transaction.',
  stepsTitle:'Three steps', step1:'Check the approved deployment address, verified code and admin() on Etherscan.',
  step2:'Choose an operation below. Prepare and copy its public values.', step3:'Open Read Contract or Write Contract, find the function by name and use these values. For a write, check the wallet, then confirm the resulting state.',
  boundary:'Approved deployment and website configuration follow the Hardhat guide. Private receipts stay in the member application and private verifier. Etherscan does not replace those steps.',
  guide:'Complete FR / EN guide: verification, operations and troubleshooting', prepareTitle:'Prepare an operation', address:'Approved production registry address',
  addressNote:'The check below validates address format only. It does not establish contract identity, safety or deployment authorization.', operation:'Operation', prepare:'Prepare values', clear:'Clear everything', result:'Values to use on Etherscan',
  copyHint:'Copy each value into the field with the same name. Function numbering may change on Etherscan. Editing any input invalidates this preparation.', open:'Open the contract tab on Etherscan', advanced:'Call data for a contract wallet (advanced)',
  safe:'If admin() is a Safe or another contract wallet, that wallet must execute the call. Its individual signer receives no automatic privileges. Use the wallet’s own execution workflow with these data. Nothing is submitted here.', copyData:'Copy public call data', rulesTitle:'Essential reference',
  states:'States: 1 = Draft, 2 = Open, 3 = Closed, 4 = Archived. 0 is invalid.', capacity:'Capacity: 0 = unlimited. A positive capacity cannot be lower than the active claim count.',
  history:'Revoke, reinstate and reassign preserve history. An ENS transfer does not create a second claim.', batch:'Batches: 1–50 distinct labels. Any failure reverts the entire batch. Start small.',
  authority:'Every administrative write requires the current effective holder of club.agi.eth. The disposable deployer has no privileges. A zero admin() address blocks administration.',
  exceptions:'Administrative grants bypass public claim state, dates and pause, while respecting capacity. An override is an exception, not proof of ownership.', receipt:'Prepare my private receipt', verify:'Verify a private receipt', legal:'Terms and limits',
  footer:'Local preparation of public parameters · Ethereum mainnet, chain 1 · Etherscan code verification is not an audit or launch authorization.',
};
const errors = {
  ADDRESS:['Adresse Ethereum invalide ou interdite pour cette opération.','Invalid Ethereum address or address not allowed for this operation.'],
  LABEL:['Utilisez un label ASCII direct, en minuscules, de 1 à 63 caractères.','Use a direct lowercase ASCII label, 1–63 characters.'],
  INTEGER:['Utilisez un entier positif ou zéro, dans la plage du type indiqué.','Use a nonnegative integer within the displayed type’s range.'],
  HASH:['Utilisez un identifiant public non vide (128 octets maximum) ou un bytes32 exact. Aucun secret.','Use a nonempty public identifier (maximum 128 bytes) or exact bytes32. No secrets.'],
  DATE:['Utilisez des secondes Unix ou une date UTC exacte : 2026-09-22T16:00:00Z.','Use Unix seconds or an exact UTC date: 2026-09-22T16:00:00Z.'],
  WINDOW:['La fermeture doit suivre l’ouverture quand les deux dates sont définies.','Closing must follow opening when both dates are set.'],
  BATCH:['Utilisez 1 à 50 labels distincts, séparés par des virgules ou des lignes, ou un tableau JSON.','Use 1–50 distinct labels, separated by commas or lines, or a JSON array.'],
  STATE:['Choisissez un état de 1 à 4.','Choose a state from 1 to 4.'], PAGE:['La limite de page doit être entre 1 et 100.','Page limit must be between 1 and 100.'],
  BOOLEAN:['Choisissez true ou false.','Choose true or false.'], TITLE:['Titre FR obligatoire ; 160 octets UTF-8 maximum par titre.','FR title is required; each title allows up to 160 UTF-8 bytes.'],
  URI:['Utilisez une URI publique HTTPS ou IPFS de 512 octets maximum, ou laissez vide.','Use a public HTTPS or IPFS URI up to 512 bytes, or leave empty.'],
};
const tr = (fr, en) => language === 'fr' ? fr : en;
function invalidate() { generation++; prepared = null; $('result').hidden = true; $('values').replaceChildren(); $('transaction').textContent = ''; $('openExplorer').removeAttribute('href'); $('status').textContent = ''; }
function hint(p) {
  if (['opensAt','closesAt'].includes(p.name)) return tr('UTC : 2026-09-22T16:00:00Z, secondes Unix, ou vide/0 sans limite.','UTC: 2026-09-22T16:00:00Z, Unix seconds, or empty/0 for no bound.');
  if (['initialState','newState'].includes(p.name)) return tr('1 Brouillon · 2 Ouvert · 3 Fermé · 4 Archivé.','1 Draft · 2 Open · 3 Closed · 4 Archived.');
  if (p.type === 'bytes32') return ['id','entitlementId','sourceId','newId','category','newCategory','reasonHash'].includes(p.name || 'entitlementId')
    ? tr('Identifiant public lisible, sensible à la casse, ou hash bytes32 exact. Le hash préparé sera affiché.','Case-sensitive readable public identifier, or exact bytes32 hash. The prepared hash will be shown.')
    : p.name === 'node' ? tr('Label de membership ou node bytes32 exact.','Membership label or exact bytes32 node.') : tr('Hash Keccak-256 exact du fichier public. Vide = hash zéro pour les métadonnées.','Exact Keccak-256 hash of the public file. Empty = zero hash for metadata.');
  if (p.type === 'string[]') return tr('1–50 labels distincts, un par ligne ou séparés par des virgules.','1–50 distinct labels, one per line or comma-separated.');
  if (p.name === 'label') return tr('Label direct seulement, par exemple alice. Aucun nom civil ou courriel.','Direct label, for example alice. No personal name or email.');
  if (p.type === 'address') return tr('Adresse Ethereum 0x… ; utilisez le wallet, jamais le courriel.','Ethereum address 0x…; use the wallet address, never an email.');
  if (['capacity','newCapacity'].includes(p.name)) return tr('0 = sans plafond. Le contrat vérifie le nombre de droits actifs.','0 = unlimited. The contract checks the active claim count.');
  if (p.name === 'limit') return tr('1–100 entrées ; utilisez 25 pour commencer.','1–100 entries; start with 25.');
  return tr('Valeur publique uniquement. Respectez le type indiqué.','Public value only. Follow the displayed type.');
}
function fields() {
  invalidate(); const f = iface.getFunction($('operation').value); $('parameters').replaceChildren();
  const read = ['view','pure'].includes(f.stateMutability);
  $('role').textContent = read ? tr('Lecture gratuite : aucun wallet nécessaire.','Free read: no wallet required.') : f.name === 'claim'
    ? tr('Écriture membre : le wallet qui détient actuellement ce membership doit appeler claim. Frais réseau seulement.','Member write: the wallet currently holding this membership must call claim. Network fees only.')
    : tr('Écriture administrateur : le détenteur effectif actuel de club.agi.eth doit exécuter cet appel. Valeur ETH : 0.','Administrator write: the current effective holder of club.agi.eth must execute this call. ETH value: 0.');
  for (const [i,p] of f.inputs.entries()) {
    const label = document.createElement('label'); label.htmlFor = 'parameter-' + i; label.textContent = (p.name || 'entitlementId') + ' (' + p.type + ')';
    const input = document.createElement(p.type === 'string[]' ? 'textarea' : p.type === 'bool' || ['initialState','newState'].includes(p.name) ? 'select' : 'input'); input.id = label.htmlFor; input.autocomplete = 'off'; input.spellcheck = false;
    if (input.tagName === 'SELECT') for (const v of p.type === 'bool' ? ['false','true'] : ['1','2','3','4']) { const option = document.createElement('option'); option.value = v; option.textContent = p.type==='bool'?v:v+' — '+tr(['','Brouillon','Ouvert','Fermé','Archivé'][Number(v)],['','Draft','Open','Closed','Archived'][Number(v)]); input.append(option); }
    input.value = defaultValue(p, f.name); input.addEventListener('input', invalidate);
    const help = document.createElement('p'); help.id = 'hint-' + i; help.className = 'small muted'; help.textContent = hint(p); input.setAttribute('aria-describedby', help.id);
    $('parameters').append(label, input, help);
  }
}
function populate() {
  const selected = $('operation').value || 'createEntitlement'; $('operation').replaceChildren();
  for (const read of [false,true]) {
    const group = document.createElement('optgroup'); group.label = read ? tr('Lire le registre — 33 fonctions','Read the registry — 33 functions') : tr('Utiliser et administrer — 19 fonctions','Use and administer — 19 functions');
    for (const f of iface.fragments.filter(f => f.type === 'function' && ['view','pure'].includes(f.stateMutability) === read).sort((a,b) => a.name.localeCompare(b.name))) {
      const option = document.createElement('option'); option.value = f.name; option.textContent = ACTIONS[f.name] ? ACTIONS[f.name][language === 'fr' ? 0 : 1] + ' — ' + f.name : f.name; group.append(option);
    }
    $('operation').append(group);
  }
  $('operation').value = selected; fields();
}
async function copy(text) {
  const at = generation;
  try { await navigator.clipboard.writeText(text); if (at === generation) $('status').textContent = tr('Valeur publique copiée.','Public value copied.'); }
  catch { if (at === generation) $('status').textContent = tr('Sélectionnez et copiez la valeur manuellement.','Select and copy the value manually.'); }
}
$('prepare').addEventListener('click', () => {
  invalidate();
  try {
    const f = iface.getFunction($('operation').value);
    prepared = prepareExplorerCall(f.name, f.inputs.map((_,i) => $('parameter-' + i).value), $('registry').value, ethers);
    $('method').textContent = prepared.method + ' · ' + (prepared.readOnly ? 'Read Contract' : 'Write Contract');
    for (const field of prepared.fields) {
      const row = document.createElement('div'); row.className = 'prepared-value'; const name = document.createElement('strong'); name.textContent = field.name + ' (' + field.type + ')';
      const output = document.createElement('output'); output.className = 'mono'; output.textContent = field.value;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = tr('Copier cette valeur','Copy this value'); button.addEventListener('click', () => copy(field.value));
      row.append(name, output, button); $('values').append(row);
    }
    if (!prepared.fields.length) $('values').textContent = tr('Aucun paramètre à saisir.','No input parameters.');
    $('openExplorer').href = prepared.link; $('transaction').textContent = JSON.stringify(prepared.transaction, null, 2); $('result').hidden = false;
    $('status').textContent = tr('Valeurs préparées localement. Aucune lecture du réseau, simulation ou transaction effectuée.','Values prepared locally. No network read, simulation or transaction performed.');
  } catch (error) { $('status').textContent = (errors[error.message] || ['Vérifiez les champs et réessayez.','Check the fields and try again.'])[language === 'fr' ? 0 : 1]; }
});
$('copyTransaction').addEventListener('click', () => { if (prepared) copy(JSON.stringify(prepared.transaction, null, 2)); });
$('operation').addEventListener('change', fields); $('registry').addEventListener('input', invalidate);
function clear() { invalidate(); $('registry').value = ''; for (const el of $('parameters').querySelectorAll('input,textarea,select')) el.value = ''; }
$('clear').addEventListener('click', clear); window.addEventListener('pagehide', clear); window.addEventListener('pageshow', event => { if (event.persisted) clear(); });
$('language').addEventListener('click', () => {
  const inputs=iface.getFunction($('operation').value).inputs.map((_,i)=>$('parameter-'+i).value);
  language = language === 'fr' ? 'en' : 'fr'; document.documentElement.lang = language; $('language').textContent = language === 'fr' ? 'English' : 'Français';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = (language === 'fr' ? french : english)[el.dataset.i18n];
  document.querySelector('.brand').setAttribute('aria-label',tr('AGI Club — Accueil','AGI Club — Home'));
  document.querySelector('.header-tail').setAttribute('aria-label',tr('Navigation principale','Main navigation'));
  document.querySelector('.footer-links').setAttribute('aria-label',tr('Ressources du Club','Club resources'));
  populate();
  inputs.forEach((value,i)=>{$('parameter-'+i).value=value;});
});
$('registry').value = window.AGI_CONFIG?.registryAddress || ''; populate();
