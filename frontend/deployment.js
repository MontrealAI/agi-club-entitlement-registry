import {t, tr, getLanguage, onLanguageChange} from './language.mjs';
import { deploymentMessage, validatePlan } from './shared/deployment-policy.mjs';
const $ = id => document.getElementById(id);
let plan = null, selection = 0, epoch = 0, busy = false, observedWallet;
const downloads = new Set();
const updateButton = () => { $('sign').disabled = busy || !plan || !$('consent').checked; };
function invalidate(message) {
  epoch++; $('consent').checked = false; updateButton();
  $('status').textContent = message;
}
function observeWallet(wallet) {
  if (!wallet || wallet === observedWallet) return;
  observedWallet = wallet;
  for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) {
    wallet.on?.(event, () => {
      if (wallet === observedWallet) invalidate(t('Wallet changed. Reject any pending approval prompt, then review the plan again.'));
    });
  }
}
observeWallet(window.ethereum);
for (const event of ['pagehide', 'pageshow']) window.addEventListener(event, () => {
  selection++; plan = null; $('plan').value = ''; $('details').textContent = t('No plan loaded.');
  for (const url of downloads) URL.revokeObjectURL(url);
  downloads.clear();
  invalidate(t('Load and review the plan again before signing.'));
});
$('plan').addEventListener('change', async () => {
  const selected = ++selection;
  plan = null; $('details').textContent = '';
  invalidate(t('Loading plan…'));
  try {
    const file = $('plan').files[0];
    if (!file || file.size > 20000) throw Error(t('Invalid plan file'));
    const value = JSON.parse(await file.text());
    if (selected !== selection) return;
    plan = Object.freeze({ ...validatePlan(value) });
    $('details').textContent = JSON.stringify(plan, null, 2);
    $('status').textContent = t('Review every field before signing.');
  } catch {
    if (selected === selection) $('status').textContent = t('Invalid or expired plan. Prepare a fresh plan and load that file.');
  } finally { updateButton(); }
});
$('consent').addEventListener('change', () => {
  if (!$('consent').checked) invalidate(t('Approval cancelled. Reject any pending wallet prompt, then review the plan again.'));
  updateButton();
});
$('sign').addEventListener('click', async () => {
  if (busy || !plan || !$('consent').checked) return;
  const reviewed = plan, attempt = epoch, wallet = window.ethereum;
  let provider;
  busy = true; updateButton();
  const current = () => {
    if (attempt !== epoch || plan !== reviewed || !$('consent').checked || wallet !== window.ethereum) throw Error(t('Approval cancelled'));
    validatePlan(reviewed);
  };
  try {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') throw Error(t('Use a trusted HTTPS origin or local server'));
    const e = globalThis.ethers;
    if (!e || !wallet) throw Error(t('Compatible wallet required'));
    observeWallet(wallet);
    provider = new e.BrowserProvider(wallet, undefined, { cacheTimeout: -1 });
    await provider.send('eth_requestAccounts', []); current();
    const checkWallet = async () => {
      const chain = await wallet.request({ method: 'eth_chainId' }); current();
      if (BigInt(chain) !== 1n) throw Error(t('Ethereum mainnet required'));
      const accounts = await wallet.request({ method: 'eth_accounts' }); current();
      if (!Array.isArray(accounts) || accounts[0]?.toLowerCase() !== reviewed.admin) throw Error(t('Root-holder account required'));
    };
    const checkOwner = async () => {
      const node = e.namehash('club.agi.eth');
      const ens = new e.Contract('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', ['function owner(bytes32) view returns(address)'], provider);
      let owner = await ens.owner(node); current();
      if (owner.toLowerCase() === '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401') {
        const wrapper = new e.Contract(owner, ['function getData(uint256) view returns(address,uint32,uint64)'], provider);
        const data = await wrapper.getData(BigInt(node)); current();
        const block = await provider.getBlock('latest'); current();
        if (!block || (data[2] < BigInt(block.timestamp) && (data[1] & 65536n) !== 0n)) throw Error(t('Root ownership unavailable'));
        owner = data[0];
      }
      if (owner.toLowerCase() !== reviewed.admin) throw Error(t('Root holder changed'));
    };
    await checkWallet(); await checkOwner();
    const signer = await provider.getSigner(reviewed.admin); current();
    await checkWallet(); current();
    const message = deploymentMessage(reviewed);
    $('status').textContent = t('Check the exact plan in your wallet before approving.');
    const signature = await signer.signMessage(message); current();
    const code = await provider.getCode(reviewed.admin); current();
    if (code === '0x') {
      if (e.verifyMessage(message, signature).toLowerCase() !== reviewed.admin) throw Error(t('Invalid approval signature'));
    } else {
      const verifier = new e.Contract(reviewed.admin, ['function isValidSignature(bytes32,bytes) view returns(bytes4)'], provider);
      if (await verifier.isValidSignature(e.hashMessage(message), signature) !== '0x1626ba7e') throw Error(t('Contract-wallet approval rejected'));
      current();
    }
    await checkOwner(); await checkWallet(); current();
    const url = URL.createObjectURL(new Blob([JSON.stringify({ plan: reviewed, message, signature }, null, 2)], { type: 'application/json' }));
    downloads.add(url);
    const a = document.createElement('a'); a.href = url; a.download = 'deployment-approval.json'; a.click();
    setTimeout(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 10000);
    invalidate(t('Signed approval downloaded. No deployment transaction was sent. This approval expires at ') + new Date(reviewed.expiresAt * 1000).toLocaleString(getLanguage()==='fr'?'fr-CA':'en-CA'));
  } catch {
    if (attempt === epoch) invalidate(t('Approval stopped. Check mainnet, the current root-holder account and plan expiry, then review and try again. For a Safe, use its actual account and completed signature workflow.'));
  } finally {
    try { provider?.destroy(); } finally { busy = false; updateButton(); }
  }
});

onLanguageChange(()=>{
  invalidate(tr('Langue modifiée. Le plan reste chargé, mais l’autorisation est annulée. Refusez toute demande en attente dans le wallet, puis vérifiez le plan et confirmez à nouveau.','Language changed. The plan remains loaded, but approval is cancelled. Reject any pending wallet prompt, then review the plan and acknowledge it again.'));
});
