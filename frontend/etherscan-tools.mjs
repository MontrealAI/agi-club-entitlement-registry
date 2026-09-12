import {EXPLORER_ABI} from './etherscan-abi.mjs';

export {EXPLORER_ABI};
export const ACTIONS = {
  createEntitlement: ['Créer un avantage', 'Create a benefit'],
  duplicateEntitlement: ['Dupliquer en brouillon', 'Duplicate as draft'],
  setEntitlementState: ['Ouvrir, fermer ou archiver', 'Open, close or archive'],
  setCapacity: ['Changer le quota', 'Change capacity'],
  setWindow: ['Changer les dates UTC', 'Change UTC dates'],
  setCategory: ['Changer la catégorie', 'Change category'],
  setMetadataHash: ['Changer le hash public', 'Change public metadata hash'],
  setDescriptor: ['Changer la présentation FR/EN', 'Change FR/EN presentation'],
  adminGrantClaimToCurrentOwner: ['Attribuer au détenteur actuel', 'Grant to current holder'],
  adminGrantBatchToCurrentOwners: ['Attribuer un lot', 'Grant a batch'],
  adminGrantClaimOverride: ['Attribution exceptionnelle', 'Grant an explicit exception'],
  revokeClaim: ['Révoquer un droit', 'Revoke a claim'],
  revokeBatch: ['Révoquer un lot', 'Revoke a batch'],
  reinstateClaim: ['Rétablir le même bénéficiaire', 'Reinstate the same claimant'],
  reassignRevokedClaim: ['Réattribuer un droit révoqué', 'Reassign a revoked claim'],
  setSupportedNameWrapper: ['Configurer un wrapper revu', 'Configure a reviewed wrapper'],
  pause: ['Suspendre les réclamations publiques', 'Pause public claims'],
  unpause: ['Reprendre les réclamations publiques', 'Resume public claims'],
  claim: ['Réclamer mon avantage', 'Claim my benefit'],
};
const fail = code => { throw Error(code); };
const bytes32 = /^(?:0x)[0-9a-fA-F]{64}$/;
const idFields = new Set(['id', 'entitlementId', 'sourceId', 'newId']);
export function memberLabel(value) {
  const label = value.trim().replace(/\.club\.agi\.eth$/, '');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) fail('LABEL');
  return label;
}
export function uint(value, bits) {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) fail('INTEGER');
  const n = BigInt(value); if (n >= 1n << BigInt(bits)) fail('INTEGER');
  return n.toString();
}
export function utcSeconds(value) {
  if (!value || value === '0') return '0';
  if (/^[0-9]+$/.test(value)) return uint(value, 64);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) fail('DATE');
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms < 0 || new Date(ms).toISOString() !== value.replace('Z', '.000Z')) fail('DATE');
  return uint(String(ms / 1000), 64);
}
export function explorerLinks(address, ethers) {
  if (!ethers.isAddress(address) || address.toLowerCase() === ethers.ZeroAddress) fail('ADDRESS');
  const base = 'https://etherscan.io/address/' + ethers.getAddress(address);
  return {code: base + '#code', read: base + '#readContract', write: base + '#writeContract'};
}
function publicHash(value, ethers, maxBytes = 128) {
  if (bytes32.test(value)) return value;
  if (!value || value.startsWith('0x') || ethers.toUtf8Bytes(value).length > maxBytes) fail('HASH');
  return ethers.id(value);
}
export function defaultValue(field, method) {
  if (idFields.has(field.name || 'entitlementId') && field.type === 'bytes32') return '';
  if (field.name === 'category' || field.name === 'newCategory') return '';
  if (['initialState', 'newState'].includes(field.name)) return '1';
  if (['capacity', 'newCapacity'].includes(field.name)) return '';
  if (['opensAt', 'closesAt'].includes(field.name)) return '';
  if (field.name === 'limit') return '25';
  if (field.type.startsWith('uint')) return '0';
  if (field.type === 'bool') return 'false';
  return '';
}
export function prepareExplorerCall(method, raw, address, ethers) {
  const iface = new ethers.Interface(EXPLORER_ABI), f = iface.getFunction(method);
  if (!f) fail('FUNCTION');
  const links = explorerLinks(address.trim(), ethers);
  const args = f.inputs.map((p, i) => {
    const value = String(raw[i] ?? '').trim();
    if (p.type === 'bytes32') {
      if (idFields.has(p.name || 'entitlementId') || p.name === 'category' || p.name === 'newCategory' || p.name === 'reasonHash') {
        if (!value && p.name === 'reasonHash' && method !== 'adminGrantClaimOverride') return ethers.ZeroHash;
        const hash = publicHash(value, ethers);
        if ((idFields.has(p.name || 'entitlementId') || (p.name === 'reasonHash' && method === 'adminGrantClaimOverride')) && hash === ethers.ZeroHash) fail('HASH');
        return hash;
      }
      if (p.name === 'node' && value && !value.startsWith('0x')) return ethers.namehash(memberLabel(value) + '.club.agi.eth');
      if (!value && ['metadataHash', 'newMetadataHash', 'digest'].includes(p.name)) return ethers.ZeroHash;
      if (!bytes32.test(value)) fail('HASH');
      return value;
    }
    if (p.type === 'address') {
      if (!ethers.isAddress(value)) fail('ADDRESS');
      const a = ethers.getAddress(value);
      if (!['view', 'pure'].includes(f.stateMutability) && a === ethers.ZeroAddress) fail('ADDRESS');
      return a;
    }
    if (p.type === 'string[]') {
      let labels;
      try { labels = value.startsWith('[') ? JSON.parse(value) : value.split(/[\n,]+/); } catch { fail('BATCH'); }
      if (!Array.isArray(labels) || labels.length < 1 || labels.length > 50 || labels.some(v => typeof v !== 'string')) fail('BATCH');
      labels = labels.map(memberLabel); if (new Set(labels).size !== labels.length) fail('BATCH');
      return labels;
    }
    if (p.type === 'bool') { if (!['true', 'false'].includes(value)) fail('BOOLEAN'); return value === 'true'; }
    if (p.type.startsWith('uint')) {
      const n = ['opensAt', 'closesAt'].includes(p.name) ? utcSeconds(value) : uint(value, Number(p.type.slice(4)));
      if (['initialState', 'newState'].includes(p.name) && !['1', '2', '3', '4'].includes(n)) fail('STATE');
      if (p.name === 'limit' && (BigInt(n) < 1n || BigInt(n) > 100n)) fail('PAGE');
      return n;
    }
    if (p.type === 'string') {
      if (p.name === 'label') return memberLabel(value);
      const length = ethers.toUtf8Bytes(value).length;
      if (p.name === 'canonicalName' && (!length || length > 128)) fail('HASH');
      if ((p.name === 'fr' && !length) || (['fr', 'en'].includes(p.name) && length > 160)) fail('TITLE');
      if (p.name === 'uri' && (length > 512 || (value && !/^(https:\/\/|ipfs:\/\/)/.test(value)))) fail('URI');
      return value;
    }
    fail('TYPE');
  });
  const get = name => args[f.inputs.findIndex(p => p.name === name)];
  if (['setWindow', 'createEntitlement'].includes(method) && get('opensAt') !== '0' && get('closesAt') !== '0' && BigInt(get('closesAt')) <= BigInt(get('opensAt'))) fail('WINDOW');
  const readOnly = ['view', 'pure'].includes(f.stateMutability);
  return {
    method, readOnly, link: readOnly ? links.read : links.write, links,
    fields: f.inputs.map((p, i) => ({name: p.name || 'entitlementId', type: p.type, value: Array.isArray(args[i]) ? JSON.stringify(args[i]) : String(args[i])})),
    args, transaction: {chainId: 1, to: ethers.getAddress(address.trim()), value: '0', data: iface.encodeFunctionData(f, args)},
  };
}
