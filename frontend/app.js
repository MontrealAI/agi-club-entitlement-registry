import {uint,utcSeconds} from './etherscan-tools.mjs';
'use strict';
(() => {
const $=id=>document.getElementById(id), CFG=window.AGI_CONFIG||{}, PAGE=document.body.dataset.page;
if(PAGE!=='admin')return;
const ENS='0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', WRAPPER='0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401';
const ABI=[
'function VERSION() view returns(string)','function CANONICAL_ENS() view returns(address)','function CANONICAL_WRAPPER() view returns(address)',
'function ensRegistry() view returns(address)','function adminNameWrapper() view returns(address)','function admin() view returns(address)','function paused() view returns(bool)',
'function CLUB_AGI_ETH_NODE() view returns(bytes32)','function entitlementCount() view returns(uint256)','function entitlementIdsPage(uint256,uint256) view returns(bytes32[])',
'function entitlement(bytes32) view returns(bytes32,bytes32,uint64,uint64,uint64,uint64,uint64,uint8,bool)',
'function titleFR(bytes32) view returns(string)','function titleEN(bytes32) view returns(string)','function metadataURI(bytes32) view returns(string)',
'function claimRecord(bytes32,bytes32) view returns(address,uint64,uint64,uint64,uint32,uint8)',
'function claimNodesPage(bytes32,uint256,uint256) view returns(bytes32[])','function claimNodeCount(bytes32) view returns(uint256)',
'function createEntitlement(bytes32,bytes32,uint64,uint64,uint64,uint8,bytes32)',
'function duplicateEntitlement(bytes32,bytes32)','function setEntitlementState(bytes32,uint8)','function setCapacity(bytes32,uint64)','function setWindow(bytes32,uint64,uint64)',
'function setCategory(bytes32,bytes32)','function setDescriptor(bytes32,string,string,string,bytes32)',
'function adminGrantBatchToCurrentOwners(bytes32,string[])','function adminGrantClaimOverride(bytes32,string,address,bytes32)',
'function revokeBatch(bytes32,string[],bytes32)','function reinstateClaim(bytes32,string)','function reassignRevokedClaim(bytes32,string,address)',
'function setSupportedNameWrapper(address,bool)','function pause()','function unpause()',
'error AdminUnavailable()','error NotClubAdmin(address,address)','error ClaimRejected(uint8)','error CapacityFull(bytes32)','error CapacityBelowActiveClaims(uint64,uint64)',
'error EntitlementAlreadyExists(bytes32)','error InvalidDescriptor()','error InvalidBatchSize()','error InvalidTimeWindow(uint64,uint64)','error EnforcedPause()'
];
let provider, signer, contract, account='', root='', demo=false, selected='', entries=[], auditRows=[], txPlan=null, catalogQueue=Promise.resolve(), connected=false, requestEpoch=0, walletPromptEpoch=null, txInFlight=false, txProvider=null;
const logEntries=[];const states=['Inconnu','Brouillon','Ouvert','Fermé','Archivé'];
function status(s,bad=false){if($('status')){$('status').textContent=s;$('status').style.color=bad?'var(--red)':'var(--green)';}}
function log(s){logEntries.push({time:new Date().toISOString(),message:s});if($('log'))$('log').textContent=logEntries.slice(-30).map(x=>x.time+' · '+x.message).join('\n');}
function showError(e){let text=e?.shortMessage||e?.reason||e?.message||String(e);status(text,true);log('ERREUR : '+text);}
function bind(id,fn){const el=$(id);if(!el)return;el.addEventListener('click',async()=>{if(el.dataset.busy==='1')return;el.dataset.busy='1';el.setAttribute('aria-busy','true');try{await fn();}catch(e){showError(e);}finally{delete el.dataset.busy;el.removeAttribute('aria-busy');}});}
function download(name,value,type='application/json'){const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function needEthers(){if(!window.ethers)throw Error('Le portail n’a pas été construit correctement (ethers absent). Aucune transaction n’est possible. Contactez l’organisateur. La démonstration reste fictive.');}
function key(raw){raw=String(raw).trim();if(/^0x[0-9a-fA-F]{64}$/.test(raw))return raw;if(!/^[A-Z0-9][A-Z0-9_-]{0,127}$/.test(raw))throw Error('Identifiant : lettres majuscules, chiffres, tirets ou soulignés, 128 caractères maximum.');if(demo)return 'DEMO:'+raw;needEthers();return ethers.id(raw);}
function label(raw){let a=String(raw).trim().toLowerCase().replace(/\.club\.agi\.eth$/,'');if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(a))throw Error('Saisissez un unique label ASCII AGI Club. Les noms Unicode ne sont pas pris en charge dans cette version.');return a;}
function integer(id){try{return BigInt(uint($(id).value.trim(),64));}catch{throw Error('Choisissez un quota entier entre 0 et 18446744073709551615, sans arrondi ni notation exponentielle. 0 = sans plafond.');}}
function time(id){try{return BigInt(utcSeconds($(id).value.trim()));}catch{throw Error('Utilisez une date UTC réelle AAAA-MM-JJTHH:mm:ssZ ou un entier de secondes Unix ; vide = sans limite.');}}
function dates(){let a=time('opens'),b=time('closes');if(a&&b&&b<=a)throw Error('La fermeture doit suivre l’ouverture.');return[a,b];}
function iso(n){const value=BigInt(n);if(!value)return '';if(value>253402300799n)return value.toString();return new Date(Number(value)*1000).toISOString().replace('.000','');}
function vals(id){if(!$(id))return'';return $(id).value.trim();}
function idRequired(){if(!selected)throw Error('Sélectionnez un avantage du catalogue.');return selected;}
function members(){let x=vals('labels').split(/[\n,]/).map(x=>x.trim()).filter(Boolean).map(label);if(!x.length||x.length>50||new Set(x).size!==x.length)throw Error('De 1 à 50 memberships distincts sont requis.');return x;}
function oneMember(){let l=members();if(l.length!==1)throw Error('Cette correction exige exactement un membership.');return l[0];}
function hashReason(){if(!vals('reason'))throw Error('Indiquez une référence de correction sans renseignement personnel.');return demo?'DEMO:REASON':ethers.id(vals('reason'));}
function recipient(){needEthers();if(!ethers.isAddress(vals('recipient'))||vals('recipient')===ethers.ZeroAddress)throw Error('Wallet destinataire non valide.');return ethers.getAddress(vals('recipient'));}
function clearTransaction(){
  txPlan=null;
  if($('confirm')?.open)$('confirm').close();
  for(const id of ['confirmText','confirmData'])if($(id))$(id).textContent='';
}
function resetSession(){
  requestEpoch++;walletPromptEpoch=null;catalogQueue=Promise.resolve();
  connected=false;demo=false;contract=null;signer=null;
  // The active transaction owns its provider until confirmation tracking settles.
  if(provider!==txProvider)provider?.destroy?.();
  provider=null;account='';root='';
  selected='';entries=[];window.totalCount=0;resetEditor();
  if($('modeNotice'))$('modeNotice').textContent='Connectez le wallet pour vérifier le réseau, le contrat et les sources d’autorité.';
  clearTransaction();renderAuthority();renderCatalog();
}
async function assertWallet(expectedAccount){
  needEthers();
  if(!CFG.expectedOrigin||!CFG.expectedOrigin.startsWith('https://')||location.origin!==CFG.expectedOrigin)throw Error('Origine officielle HTTPS absente ou différente. Aucune transaction autorisée par cette interface.');
  if(BigInt(await window.ethereum.request({method:'eth_chainId'}))!==1n)throw Error('Ethereum mainnet requis.');
  const accounts=await window.ethereum.request({method:'eth_accounts'});
  if(!accounts?.[0]||accounts[0].toLowerCase()!==expectedAccount.toLowerCase())throw Error('Le wallet a changé : reconnectez-vous.');
}
async function assertLive(){
  const epoch=requestEpoch;
  if(!connected||demo||!provider||!contract||!signer)throw Error('Connectez le wallet en mode réel.');
  await assertWallet(account);
  if(epoch!==requestEpoch||!connected)throw Error('Le wallet a changé : reconnectez-vous.');
}
async function connect(){
  resetSession();
  const epoch=requestEpoch;
  let candidateProvider=null;
  try{
    needEthers();
    if(!ethers.isAddress(CFG.registryAddress||'')||CFG.registryAddress===ethers.ZeroAddress)throw Error('Le contrat n’est pas configuré. Aucun déploiement n’est fourni. Utilisez la démonstration ou renseignez config.js après déploiement.');
    if(!window.ethereum?.request)throw Error('Ouvrez la page dans un navigateur avec wallet Ethereum. Sur mobile, utilisez le navigateur de votre wallet.');
    // Permission and network prompts can emit events before verification starts.
    walletPromptEpoch=epoch;
    await window.ethereum.request({method:'eth_requestAccounts'});
    if(epoch!==requestEpoch)return;
    if(BigInt(await window.ethereum.request({method:'eth_chainId'}))!==1n)await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x1'}]});
    if(epoch!==requestEpoch)return;
    candidateProvider=new ethers.BrowserProvider(window.ethereum);
    const candidateSigner=await candidateProvider.getSigner();
    const candidateAccount=await candidateSigner.getAddress();
    if(epoch!==requestEpoch)return;
    walletPromptEpoch=null;
    const candidateContract=new ethers.Contract(CFG.registryAddress,ABI,candidateSigner);
    await assertWallet(candidateAccount);
    const deployedCode=await candidateProvider.getCode(CFG.registryAddress);
    if(deployedCode==='0x')throw Error('Aucun contrat à cette adresse.');
    if(!/^0x[0-9a-f]{64}$/.test(CFG.registryCodeHash||'')||ethers.keccak256(deployedCode)!==CFG.registryCodeHash)throw Error('Empreinte du contrat absente ou différente du code approuvé. Ne signez pas.');
    const[ver,ens,wrap,ce,cw,rn]=await Promise.all([candidateContract.VERSION(),candidateContract.ensRegistry(),candidateContract.adminNameWrapper(),candidateContract.CANONICAL_ENS(),candidateContract.CANONICAL_WRAPPER(),candidateContract.CLUB_AGI_ETH_NODE()]);
    if(ver!=='2.1.1'||ens.toLowerCase()!==ENS.toLowerCase()||ce.toLowerCase()!==ENS.toLowerCase()||wrap.toLowerCase()!==WRAPPER.toLowerCase()||cw.toLowerCase()!==WRAPPER.toLowerCase()||rn!==ethers.namehash('club.agi.eth'))throw Error('Contrat ou sources d’autorité inattendus. Ne signez pas.');
    await assertWallet(candidateAccount);
    if(epoch!==requestEpoch)return;
    provider=candidateProvider;candidateProvider=null;
    signer=candidateSigner;account=candidateAccount;contract=candidateContract;connected=true;
    if($('modeNotice'))$('modeNotice').textContent='Mode réel. Réseau, contrat et sources d’autorité vérifiés pour cette session.';
    await refresh();
    if(epoch===requestEpoch)log('Configuration de production et chaîne vérifiées. Cela ne constitue pas un audit du bytecode.');
  }catch(error){if(epoch===requestEpoch)throw error;}
  finally{candidateProvider?.destroy?.();if(walletPromptEpoch===epoch)walletPromptEpoch=null;}
}
function renderAuthority(){if(!$('authority'))return;$('authority').textContent=demo?'DÉMONSTRATION — aucun droit réel':!connected?'Non connecté':root&&root.toLowerCase()===account.toLowerCase()?'ADMIN · club.agi.eth':'LECTURE SEULE';$('authority').className='tag '+(demo?'warn':root&&root.toLowerCase()===account.toLowerCase()?'good':'');if($('connection'))$('connection').textContent=demo?'Simulation locale · aucun wallet · aucune transaction':connected?`Wallet : ${account}\nAdmin actuel : ${root}\nContrat : ${CFG.registryAddress}`:'';}
function renderCatalog(){if(!$('catalog'))return;$('catalog').replaceChildren();if($('catalogEmpty'))$('catalogEmpty').hidden=entries.length>0;for(const e of entries){const box=document.createElement('article');box.className='benefit';let d=document.createElement('div'),h=document.createElement('h3'),t=document.createElement('p'),code=document.createElement('code'),btn=document.createElement('button');h.textContent=e.fr||e.id; t.className='small muted';t.textContent=states[e.state]+' · '+e.active+' réclamations actives · '+(BigInt(e.cap)?e.cap+' places':'sans plafond');code.textContent=e.id;btn.textContent='Gérer';btn.onclick=()=>select(e);d.append(h,t,code);box.append(d,btn);$('catalog').append(box);}if($('count'))$('count').textContent=String(entries.length)+(entries.length<Number(window.totalCount||entries.length)?'+':'');}
function select(e){clearTransaction();selected=e.id;$('canonical').readOnly=true;$('selected').textContent='Identifiant : '+e.id;$('canonical').value=e.name||e.id;$('category').value=demo&&e.category?.startsWith('DEMO:')?e.category.slice(5):e.category||'';$('state').value=String(e.state);$('capacity').value=String(e.cap);$('opens').value=iso(e.opens);$('closes').value=iso(e.closes);$('titleFR').value=e.fr||'';$('titleEN').value=e.en||'';$('metadataURI').value=e.uri||'';$('metadataHash').value=e.hash==='0x'+'0'.repeat(64)?'':e.hash||'';$('stateStat').textContent=states[e.state];$('claimsStat').textContent=String(e.active);$('remainingStat').textContent=BigInt(e.cap)?String(BigInt(e.cap)>BigInt(e.active)?BigInt(e.cap)-BigInt(e.active):0n):'∞';$('create').disabled=true;}
// Serialize catalog reads and commit a complete result only while the wallet
// session is current. A failed page must not advance the next load-more offset.
function updateCatalog(append=false){
  const registry=contract,epoch=requestEpoch;
  const isCurrent=()=>registry===contract&&epoch===requestEpoch&&!demo;
  const load=async()=>{
    if(!isCurrent())return;
    try{
      await assertLive();
      const total=Number(await registry.entitlementCount());
      const start=append?entries.length:0;
      const target=Math.min(total,append?start+50:Math.max(entries.length,50));
      const next=append?[...entries]:[];
      for(let offset=start;offset<target;offset+=50){
        const ids=await registry.entitlementIdsPage(offset,Math.min(50,target-offset));
        for(const id of ids){
          const[e,fr,en,uri]=await Promise.all([registry.entitlement(id),registry.titleFR(id),registry.titleEN(id),registry.metadataURI(id)]);
          if(!isCurrent())return;
          next.push({id,category:e[0],hash:e[1],cap:BigInt(e[2]),active:BigInt(e[3]),unique:BigInt(e[4]),opens:e[5],closes:e[6],state:Number(e[7]),fr,en,uri});
        }
      }
      const paused=await registry.paused();
      if(!isCurrent())return;
      entries=next;window.totalCount=total;renderCatalog();
      if(!append){const item=entries.find(e=>e.id===selected);if(item)select(item);}
      status(paused?'Les réclamations publiques sont en pause.':'Registre lu sur Ethereum.');
    }catch(error){if(isCurrent())throw error;}
  };
  const pending=catalogQueue.then(load);
  catalogQueue=pending.catch(()=>{});
  return pending;
}
async function refresh(){
  if(demo){renderCatalog();renderAuthority();return;}
  if(!contract){status('Connectez le wallet ou ouvrez la démonstration.');return;}
  const registry=contract,epoch=requestEpoch;
  await assertLive();
  const nextRoot=await registry.admin();
  if(registry!==contract||epoch!==requestEpoch||demo)return;
  root=nextRoot;renderAuthority();
  if(PAGE==='admin')await updateCatalog();
}
function startDemo(){resetSession();demo=true;connected=false;contract=null;provider=null;signer=null;account='DEMO-ADMIN';root='DEMO-ADMIN';selected='';entries=[];resetEditor();renderAuthority();renderCatalog();if($('modeNotice'))$('modeNotice').textContent='DÉMONSTRATION LOCALE. Données fictives ; aucun droit réel, aucune preuve blockchain, aucun courriel envoyé. Actualiser la page remet la démonstration à zéro.';status('Explorez les commandes sans signature et sans frais.');log('Mode démonstration activé.');}
async function preview(method,args,summary){
  clearTransaction();
  if(demo){if(!confirm('DÉMONSTRATION uniquement\n'+summary+'\nSimuler cette action ?'))return;demoMutation(method,args);return;}
  const epoch=requestEpoch;
  await assertLive();
  const registry=contract;
  const admin=await registry.admin();
  if(admin===ethers.ZeroAddress)throw Error('Autorité indisponible : vérifiez la détention ENS et son échéance.');
  const data=registry.interface.encodeFunctionData(method,args);
  let plan;
  if(admin.toLowerCase()!==account.toLowerCase()){
    if((await provider.getCode(admin))==='0x')throw Error('Lecture seule : le wallet connecté ne détient pas club.agi.eth.');
    plan={method,args,data,summary,safe:true,from:admin,epoch};
  }else plan={method,args,data,summary,safe:false,from:account,epoch};
  await assertLive();
  if(epoch!==requestEpoch||registry!==contract)throw Error('Le wallet a changé : préparez une nouvelle transaction.');
  root=admin;renderAuthority();txPlan=plan;
  $('confirmText').textContent=summary+(plan.safe?'\nL’administrateur est un contrat : exportez et exécutez la transaction depuis ce wallet.':'');
  $('confirmData').textContent=JSON.stringify({chainId:1,contract:CFG.registryAddress,from:plan.from,method,args},(_,v)=>typeof v==='bigint'?v.toString():v,2);
  $('approveConfirm').disabled=plan.safe;$('exportConfirm').hidden=false;$('confirm').showModal();
}
async function approve(){
  if(txInFlight)throw Error('Une transaction est déjà en cours. Attendez sa confirmation.');
  const plan=txPlan;clearTransaction();if(!plan)return;
  txInFlight=true;txProvider=provider;
  try{
    const registry=contract;
    const assertPlan=async()=>{
      await assertLive();
      if(plan.safe||plan.epoch!==requestEpoch||registry!==contract||plan.from.toLowerCase()!==account.toLowerCase())throw Error('Le wallet a changé : préparez une nouvelle transaction.');
    };
    await assertPlan();
    if((await registry.admin()).toLowerCase()!==account.toLowerCase())throw Error('L’administrateur a changé. Transaction refusée.');
    status('Simulation de la transaction…');
    await registry[plan.method].staticCall(...plan.args);
    const gas=await registry[plan.method].estimateGas(...plan.args);
    await assertPlan();
    status('Confirmez la transaction dans votre wallet.');
    const sent=await registry[plan.method](...plan.args,{gasLimit:gas*120n/100n});
    log('Transaction soumise : '+sent.hash);
    if(plan.epoch===requestEpoch)status('Transaction en attente. Ne soumettez pas de doublon.\n'+sent.hash);
    await sent.wait(2);log('Deux confirmations : '+sent.hash);
    if(plan.epoch===requestEpoch){status('Transaction confirmée.');if(PAGE==='admin')await refresh();}
  }finally{if(txProvider!==provider)txProvider?.destroy?.();txProvider=null;txInFlight=false;}
}
function demoMutation(method,a){let e=entries.find(e=>e.id===a[0]);if(method==='createEntitlement'){if(entries.some(x=>x.id===a[0]))throw Error('Identifiant déjà utilisé.');entries.push({id:a[0],name:a[0].slice(5),fr:a[0].slice(5),en:'',category:a[1],cap:BigInt(a[2]),active:0n,unique:0n,opens:a[3],closes:a[4],state:1,hash:'',uri:''});e=entries.at(-1);}
else if(method==='duplicateEntitlement'){if(!e)throw Error('Avantage absent.');if(entries.some(x=>x.id===a[1]))throw Error('Identifiant déjà utilisé.');entries.push({...e,id:a[1],name:a[1].slice(5),fr:'Copie à configurer',en:'',state:1,active:0n,unique:0n,opens:0,closes:0,hash:'',uri:''});e=entries.at(-1);}
else if(method==='setEntitlementState')e.state=Number(a[1]);else if(method==='setCapacity'){if(BigInt(a[1])&&BigInt(a[1])<e.active)throw Error('Quota inférieur aux réclamations actives.');e.cap=BigInt(a[1]);}else if(method==='setWindow'){e.opens=a[1];e.closes=a[2];}else if(method==='setCategory')e.category=a[1];else if(method==='setDescriptor'){[e.fr,e.en,e.uri,e.hash]=a.slice(1);}else if(method==='adminGrantBatchToCurrentOwners'){if(e.cap&&e.active+BigInt(a[1].length)>e.cap)throw Error('Contingent complet.');e.active+=BigInt(a[1].length);e.unique+=BigInt(a[1].length);}else{status('Action simulée : '+method+'. Consultez les tests EVM pour les garanties réelles.');}log('DÉMO : '+method);renderCatalog();if(e&&PAGE==='admin')select(e);}
async function audit(){if(demo){auditRows=[{simulation:true,note:'Relevé fictif uniquement',entitlement:selected,active:entries.find(x=>x.id===selected)?.active||0}];$('auditData').textContent=JSON.stringify(auditRows,(_,v)=>typeof v==='bigint'?v.toString():v,2);return;}await assertLive();const id=idRequired();let n=Number(await contract.claimNodeCount(id));auditRows=[];for(let o=0;o<n;o+=100){for(const node of await contract.claimNodesPage(id,o,100)){const r=await contract.claimRecord(id,node);auditRows.push({entitlementId:id,membershipNode:node,claimant:r[0],status:Number(r[5])===1?'ACTIVE':'REVOKED',revision:Number(r[4]),firstClaimedAt:iso(r[1]),lastActivatedAt:iso(r[2]),revokedAt:iso(r[3])});}}$('auditData').textContent=JSON.stringify(auditRows,(_,v)=>typeof v==='bigint'?v.toString():v,2);}
bind('connect',connect);bind('demo',startDemo);bind('refresh',refresh);
bind('cancelConfirm',clearTransaction);bind('approveConfirm',approve);bind('exportConfirm',async()=>{await assertLive();if(txPlan?.epoch!==requestEpoch)throw Error('Préparez une nouvelle transaction.');if(!txPlan)throw Error('Aucune transaction préparée.');download('AGI_CLUB_UNSIGNED_TRANSACTION.json',{chainId:1,to:CFG.registryAddress,value:'0',from:txPlan.from,data:txPlan.data,description:txPlan.summary});});
function resetEditor(){clearTransaction();selected='';$('canonical').readOnly=false;$('selected').textContent='Nouvel avantage · Choisissez un identifiant permanent';for(const f of ['canonical','category','capacity','titleFR','titleEN','metadataURI','metadataHash','opens','closes'])if($(f))$(f).value='';$('state').value='1';$('stateStat').textContent='Nouveau';$('claimsStat').textContent='0';$('remainingStat').textContent='—';$('create').disabled=false;}
bind('showCreate',resetEditor);
bind('loadMore',async()=>{if(demo)return;if(!contract)throw Error('Connectez le wallet.');await updateCatalog(true);});
bind('create',()=>{const d=dates();return preview('createEntitlement',[key(vals('canonical')),key(vals('category')),integer('capacity'),...d,1,demo?'DEMO:ZERO':ethers.ZeroHash],'Créer un avantage en brouillon, sans aucune réclamation. Vous l’ouvrirez après vérification.');});
bind('updateState',()=>preview('setEntitlementState',[idRequired(),Number(vals('state'))],'Modifier l’état de cet avantage. Les droits déjà enregistrés ne sont pas supprimés.'));
bind('updateCap',()=>preview('setCapacity',[idRequired(),integer('capacity')],'Modifier le quota. Une valeur nulle signifie sans plafond.'));
bind('updateWindow',()=>preview('setWindow',[idRequired(),...dates()],'Modifier la période de réclamation, en UTC.'));
bind('updateCategory',()=>preview('setCategory',[idRequired(),key(vals('category'))],'Modifier la catégorie publique.'));
bind('duplicate',()=>{let n=prompt('Choisissez un identifiant unique pour le nouvel avantage');if(n)return preview('duplicateEntitlement',[idRequired(),key(n)],'Créer une copie en brouillon. Aucune réclamation, date ou métadonnée ne sera reprise.');});
bind('descriptor',()=>{let hash=vals('metadataHash')||(demo?'DEMO:ZERO':ethers.ZeroHash);if(!demo&&!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('Hash de 32 octets requis.');return preview('setDescriptor',[idRequired(),vals('titleFR'),vals('titleEN'),vals('metadataURI'),hash],'Publier le titre et les métadonnées sur Ethereum. Aucun renseignement personnel.');});
bind('grant',()=>preview('adminGrantBatchToCurrentOwners',[idRequired(),members()],'Attribuer le droit aux détenteurs actuels. Toute entrée non valide annule le lot entier.'));
bind('override',()=>preview('adminGrantClaimOverride',[idRequired(),oneMember(),demo?'DEMO:RECIPIENT':recipient(),hashReason()],'EXCEPTION ADMINISTRATIVE : ce droit peut être attribué sans preuve de détention du membership. Ne pas présenter cette opération comme une auto-réclamation membre.'));
bind('revoke',()=>preview('revokeBatch',[idRequired(),members(),hashReason()],'Révoquer les droits actifs. Les billets Eventbrite déjà émis doivent être traités séparément.'));
bind('reinstate',()=>preview('reinstateClaim',[idRequired(),oneMember()],'Rétablir le droit révoqué du même bénéficiaire, sous réserve du quota.'));
bind('reassign',()=>preview('reassignRevokedClaim',[idRequired(),oneMember(),demo?'DEMO:RECIPIENT':recipient()],'Réattribuer un droit révoqué. L’ancienne demande doit être invalidée dans le registre d’émission hors chaîne.'));
bind('pause',()=>preview('pause',[],'Suspendre les auto-réclamations publiques. Les fonctions de lecture et de réparation restent actives.'));
bind('unpause',()=>preview('unpause',[],'Reprendre les auto-réclamations publiques.'));
bind('wrapperPolicy',()=>{if(demo)return preview('setSupportedNameWrapper',['DEMO:WRAPPER',true],'Simulation de support wrapper membre.');needEthers();const w=vals('wrapperAddress');if(!ethers.isAddress(w))throw Error('Adresse de wrapper non valide.');return preview('setSupportedNameWrapper',[ethers.getAddress(w),$('wrapperEnabled').checked],'Modifier la source de vérification des memberships. Ce réglage ne change jamais la source d’autorité de club.agi.eth. Revue du code et essai de régression obligatoires avant activation.');});
bind('audit',audit);bind('exportAudit',()=>download('AGI_CLUB_CLAIMS.json',auditRows));
if($('modeNotice'))$('modeNotice').textContent=CFG.registryAddress?'Configuration présente. Connectez le wallet pour vérifier le réseau, le contrat et les sources d’autorité.':'NON DÉPLOYÉ / NON CONFIGURÉ. La démonstration fonctionne sans wallet. Aucun avantage réel ne peut être réclamé avant déploiement et qualification.';
if(window.ethereum?.on)for(const event of ['accountsChanged','chainChanged','disconnect'])window.ethereum.on(event,()=>{
  if(event!=='disconnect'&&walletPromptEpoch===requestEpoch)return;
  resetSession();
  status('Wallet ou réseau modifié. Reconnectez-vous avant de poursuivre.',true);
});
})();
