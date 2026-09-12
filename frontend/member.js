import {t, tr, getLanguage, onLanguageChange} from './language.mjs';
import {SCHEMA,REGISTRY_VERSION,ENS,WRAPPER,ROOT,DEFAULT_TTL_SECONDS,randomHex,preparePacket,validatePacket,verifyEntitlementRequest} from './shared/entitlement-request.mjs';
import {createEthersIO} from './shared/ethers-adapter.mjs';
import {benefitTitle} from './language-core.mjs';
import {MEMBER_ABI} from './contract-abi.mjs';
import {PrivateMemory} from './private-memory.mjs';
import {formatRequestEmail} from './shared/request-email.mjs';
import {readCatalogPage,requestPolicy} from './member-catalog.mjs';
const $=id=>document.getElementById(id), cfg=window.AGI_CONFIG||{}, memory=new PrivateMemory();
let provider=null,signer=null,contract=null,account='',member=null,demo=false,busy=false,timer=null,sessionEpoch=0,membershipEpoch=0,usageEpoch=0,walletPromptEpoch=null,txProvider=null;
let catalog=[],catalogTotal=0;
const claimStates=['Disponible','En pause','Nom non admissible','Avantage inconnu','En préparation','Fermé','Archivé','Pas encore ouvert','Terminé','Déjà réclamé','Révoqué','Membership absent','Autre détenteur','Droit expiré','Contingent complet'];
const status=(text,bad=false)=>{$('status').textContent=text;$('status').classList.toggle('error',bad);};
const message=text=>{$('requestStatus').textContent=text;};
function invalidate(clearInputs=false) {
  memory.clear();$('requestPreview').value='';$('copyRequest').disabled=true;
  if(clearInputs){$('requestName').value='';$('requestEmail').value='';$('consent').checked=false;$('copyConsent').checked=false;}
  message(t('Aucune demande conservée par la page. Vous pouvez préparer une nouvelle demande sans refaire le claim.'));
}
function clearPrivate() { usageEpoch++;$('usageConsent').checked=false;invalidate(true);clearTimeout(timer); }
function assertUsage(){if(!$('usageConsent').checked)throw Error('USAGE_NOTICE');}
function touch(){clearTimeout(timer);timer=setTimeout(()=>{clearPrivate();message(t('Les coordonnées ont été effacées après 10 minutes d’inactivité. Aucune demande n’a été envoyée par cette page.'));},600000);}
function lockContact(enabled){$('contactInputs').disabled=!enabled;$('prepareRequest').disabled=!enabled;}
function disconnect(){
  sessionEpoch++;membershipEpoch++;walletPromptEpoch=null;
  clearPrivate();
  // The active transaction owns its provider until confirmation tracking settles.
  if(provider!==txProvider)provider?.destroy?.();
  provider=null;signer=null;contract=null;account='';member=null;demo=false;
  catalog=[];catalogTotal=0;renderCatalog();
  lockContact(false);$('claim').disabled=true;$('connection').textContent='';$('authority').textContent=t('Non connecté');
  $('modeNotice').textContent=t('Connectez le wallet pour vérifier le réseau et le contrat.');
  $('eligibility').textContent=t('Vérifiez votre membership après la connexion.');
  status(t('Reconnectez le wallet puis vérifiez votre membership.'));
}
function label(){const s=$('memberLabel').value.trim().toLowerCase().replace(/\.club\.agi\.eth$/,'');if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s))throw Error('INVALID_MEMBERSHIP');return s;}
function benefitId(){const v=$('benefitSelect').value;if(!catalog.some(e=>e.id===v))throw Error('CHOOSE_BENEFIT');return v;}
function policy(){return requestPolicy(cfg,ethers,REGISTRY_VERSION);}
function renderCatalog(previous=''){
  const option=document.createElement('option');option.value='';option.textContent=catalog.length?t('Choisissez votre avantage…'):t('Aucun avantage chargé');
  const options=catalog.map(e=>{const o=document.createElement('option');o.value=e.id;o.lang=getLanguage()==='en'&&e.en?'en':'fr';o.textContent=benefitTitle(e,getLanguage())+' — '+['',t('Brouillon'),t('Ouvert'),t('Fermé'),t('Archivé')][e.state];return o;});
  $('benefitSelect').replaceChildren(option,...options);$('benefitSelect').value=catalog.some(e=>e.id===previous)?previous:'';
  $('benefitSelect').disabled=!catalog.length;$('verify').disabled=!demo&&!$('benefitSelect').value;
  $('loadBenefits').disabled=!contract||catalog.length>=catalogTotal;$('refreshBenefits').disabled=!contract;
  $('catalogStatus').textContent=catalog.length?catalog.length+t(' avantage(s) chargé(s) sur ')+catalogTotal+t('. Le statut sera vérifié avant toute transaction.'):contract?t('Le registre est vide. Aucun avantage n’a été créé. Revenez après sa publication par l’administrateur.'):t('Connectez le wallet pour lire le catalogue officiel. Aucun avantage n’est préconfiguré.');
}
async function loadBenefits(append=false){
  await assertSession();const epoch=sessionEpoch,registry=contract;
  const offset=append?catalog.length:0,target=append?offset+25:Math.max(catalog.length,25);
  if(!append){membershipEpoch++;clearPrivate();member=null;lockContact(false);$('claim').disabled=true;}
  try{
    const next=append?[...catalog]:[];let page;
    do{
      page=await readCatalogPage(registry,cfg,ethers,next.length);
      if(epoch!==sessionEpoch||registry!==contract)return;
      next.push(...page.rows);
    }while(next.length<Math.min(target,page.total));
    await assertWallet(account);if(epoch!==sessionEpoch||registry!==contract)return;
    if(new Set(next.map(e=>e.id)).size!==next.length)throw Error('CATALOG_UNAVAILABLE');
    catalog=next;catalogTotal=page.total;renderCatalog($('benefitSelect').value);
    status(catalog.length?t('Choisissez un avantage puis vérifiez votre membership.'):t('Aucun avantage publié. Vous pouvez actualiser le catalogue plus tard.'));
  }catch(error){if(epoch===sessionEpoch&&registry===contract)throw error;}
}
async function assertWallet(expectedAccount){
  if(location.origin!==cfg.expectedOrigin||!cfg.expectedOrigin?.startsWith('https://'))throw Error('WRONG_ORIGIN');
  if(BigInt(await window.ethereum.request({method:'eth_chainId'}))!==1n)throw Error('WRONG_CHAIN');
  const accounts=await window.ethereum.request({method:'eth_accounts'});
  if(!accounts?.[0]||accounts[0].toLowerCase()!==expectedAccount.toLowerCase())throw Error('WALLET_CHANGED');
}
async function assertSession(){
  const epoch=sessionEpoch;
  if(demo||!provider||!signer||!contract)throw Error('CONNECT_FIRST');
  await assertWallet(account);
  if(epoch!==sessionEpoch||demo||!contract)throw Error('WALLET_CHANGED');
}
const errors={
 INVALID_MEMBERSHIP:'Saisissez un seul label AGI Club (lettres, chiffres, tirets internes).',
 CONNECT_FIRST:'Connectez le wallet avant de poursuivre.',WRONG_ORIGIN:'Cette page doit être sur l’origine HTTPS officielle configurée.',
 WRONG_CHAIN:'Ethereum mainnet est requis.',WALLET_CHANGED:'Le wallet a changé. Reconnectez-vous.',
 INVALID_CONTACT:'Laissez les coordonnées inutiles vides. Vérifiez le nom ou le courriel fourni, sans saut de ligne.',
 WAITING_FOR_FINALITY:'Le claim attend la finalité Ethereum. Revenez un peu plus tard et préparez une nouvelle demande ; ne réclamez pas une seconde fois.',
 CLAIM_NOT_CURRENT:'Cette réclamation n’est plus active pour ce wallet ou a été modifiée. Vérifiez-la à nouveau.',
 REQUEST_EXPIRED:'Demande expirée. Reprenez l’étape de signature, sans refaire de transaction.',
 INVALID_SIGNATURE:'La signature n’a pas pu être vérifiée pour ce wallet.',
 EDITED:'Des informations ont changé pendant l’opération. Recommencez la préparation.',
 WALLET_MISSING:'Utilisez le navigateur intégré de votre wallet ou une extension Ethereum. Ne saisissez jamais de clé privée ici.',
 LIBRARY_MISSING:'Les dépendances du portail ne sont pas construites. Consultez le guide de publication.',
 NOT_CONFIGURED:'Le contrat et son origine officielle ne sont pas configurés. La démonstration reste disponible.',
 CONSENT:'Confirmez la préparation locale de cette demande.',
 USAGE_NOTICE:'Lisez les conditions et confirmez les frais réseau et le caractère public du claim avant de poursuivre.',
 COPY_CONSENT:'Confirmez que la copie place le reçu privé dans le presse-papiers de votre appareil.',
 COPY_UNAVAILABLE:'Copie automatique indisponible. Sélectionnez la demande dans le cadre, copiez-la vous-même puis effacez les données.',
 NO_PACKET:'Préparez d’abord la demande signée.',UNKNOWN:'Opération non confirmée. Vérifiez votre wallet et réessayez. Aucune demande n’a été envoyée.'
 ,CHOOSE_BENEFIT:'Choisissez un avantage du catalogue avant de vérifier votre membership.',
 CATALOG_UNAVAILABLE:'Catalogue indisponible ou incomplet. Actualisez pour réessayer ; aucune transaction n’a été envoyée.'
};
function publicError(e){const code=Object.hasOwn(errors,e?.code)?e.code:Object.hasOwn(errors,e?.message)?e.message:'UNKNOWN';status(t(errors[code]),true);}
function on(id,fn){$(id).addEventListener('click',async()=>{if(busy)return;busy=true;$(id).setAttribute('aria-busy','true');let operationEpoch=sessionEpoch;try{const operation=fn();operationEpoch=sessionEpoch;await operation;}catch(e){if(operationEpoch===sessionEpoch)publicError(e);}finally{busy=false;$(id).removeAttribute('aria-busy');}});}
async function connect(){
  disconnect();
  const epoch=sessionEpoch;
  let candidateProvider=null;
  try{
    if(!window.ethers)throw Error('LIBRARY_MISSING');
    if(!ethers.isAddress(cfg.registryAddress||'')||cfg.registryAddress===ethers.ZeroAddress||!/^0x[0-9a-f]{64}$/.test(cfg.registryCodeHash||'')||!cfg.expectedOrigin)throw Error('NOT_CONFIGURED');
    if(!window.ethereum?.request)throw Error('WALLET_MISSING');
    if(location.origin!==cfg.expectedOrigin||!cfg.expectedOrigin.startsWith('https://'))throw Error('WRONG_ORIGIN');
    // Permission and network prompts can emit events before verification starts.
    walletPromptEpoch=epoch;
    await window.ethereum.request({method:'eth_requestAccounts'});
    if(epoch!==sessionEpoch)return;
    if(BigInt(await window.ethereum.request({method:'eth_chainId'}))!==1n)await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x1'}]});
    if(epoch!==sessionEpoch)return;
    candidateProvider=new ethers.BrowserProvider(window.ethereum);
    const candidateSigner=await candidateProvider.getSigner();
    const candidateAccount=await candidateSigner.getAddress();
    if(epoch!==sessionEpoch)return;
    walletPromptEpoch=null;
    const candidateContract=new ethers.Contract(cfg.registryAddress,MEMBER_ABI,candidateSigner);
    await assertWallet(candidateAccount);
    const [version,ens,wrapper,root,code]=await Promise.all([candidateContract.VERSION(),candidateContract.CANONICAL_ENS(),candidateContract.CANONICAL_WRAPPER(),candidateContract.CLUB_AGI_ETH_NODE(),candidateProvider.getCode(cfg.registryAddress)]);
    if(code==='0x'||version!==REGISTRY_VERSION||ens.toLowerCase()!==ENS||wrapper.toLowerCase()!==WRAPPER||root!==ROOT||ethers.keccak256(code)!==cfg.registryCodeHash)throw Error('NOT_CONFIGURED');
    const page=await readCatalogPage(candidateContract,cfg,ethers);
    await assertWallet(candidateAccount);
    if(epoch!==sessionEpoch)return;
    provider=candidateProvider;candidateProvider=null;signer=candidateSigner;account=candidateAccount;contract=candidateContract;
    $('connection').textContent=t('Wallet : ')+account+t(' · Ethereum mainnet');$('authority').textContent=t('Wallet connecté');
    catalog=page.rows;catalogTotal=page.total;renderCatalog();
    $('modeNotice').textContent=t('Mode réel. Les preuves de claim sont publiques. Vos coordonnées ne sont jamais envoyées par le site.');
    status(catalog.length?t('Wallet connecté. Choisissez un avantage puis vérifiez votre membership.'):t('Wallet connecté. Aucun avantage publié pour le moment.'));
  }catch(error){if(epoch===sessionEpoch)throw error;}
  finally{candidateProvider?.destroy?.();if(walletPromptEpoch===epoch)walletPromptEpoch=null;}
}
async function inspectMember(){
  member=null;$('claim').disabled=true;invalidate();lockContact(false);
  const l=label(),epoch=sessionEpoch,selection=membershipEpoch;
  if(demo){member={label:l,id:'DEMO_ONLY',claimed:true};$('eligibility').textContent=t('DÉMONSTRATION — droit fictif. Aucune vérification Ethereum.');$('claim').disabled=true;lockContact(true);return;}
  await assertSession();
  const registry=contract,id=benefitId(),node=ethers.namehash(l+'.club.agi.eth');
  const [r,c]=await Promise.all([registry.claimability(id,account,l),registry.claimRecord(id,node)]);
  if(epoch!==sessionEpoch||selection!==membershipEpoch||registry!==contract)return;
  const claimed=Number(c[5])===1&&c[0].toLowerCase()===account.toLowerCase();member={label:l,id,node,claimed,revision:Number(c[4])};
  $('eligibility').textContent=(claimed?t('Droit actif pour ce wallet'):t(claimStates[Number(r[0])]))+' — '+l+'.club.agi.eth';
  $('claim').disabled=Number(r[0])!==0;lockContact(claimed);status(claimed?t('Votre droit est actif. Suivez les conditions de l’avantage ; préparez une demande privée uniquement si nécessaire. Aucun nouveau claim n’est requis.'):t('Vérification terminée.'));
}
async function claim(){
  txProvider=provider;
  try{
    const epoch=sessionEpoch,selection=membershipEpoch,notice=usageEpoch,claimMember=member;
    const current=()=>epoch===sessionEpoch&&selection===membershipEpoch&&notice===usageEpoch;
    const assertClaim=async()=>{
      assertUsage();
      await assertSession();
      assertUsage();
      if(!current()||!claimMember||member!==claimMember)throw Error('EDITED');
    };
    await assertClaim();
    if(!confirm(t('Réclamer une fois cet avantage sur Ethereum ? Votre wallet, votre membership et ce claim seront publics. Aucun nom/courriel n’est inclus. Frais réseau applicables.')))return;
    const registry=contract,{id,label:l}=claimMember;
    await registry.claim.staticCall(id,l);
    const gas=await registry.claim.estimateGas(id,l);
    await assertClaim();
    const tx=await registry.claim(id,l,{gasLimit:gas*120n/100n});
    if(current())status(t('Transaction soumise. Ne créez pas de doublon : ')+tx.hash);
    await tx.wait(2);
    if(current()){await inspectMember();if(current())status(t('Transaction confirmée ; la vérification du reçu attendra aussi la finalité Ethereum.'));}
  }finally{if(txProvider!==provider)txProvider?.destroy?.();txProvider=null;}
}
async function prepare(){
  assertUsage();
  if(!$('consent').checked)throw Error('CONSENT');
  if(demo){message(t('DÉMONSTRATION uniquement. Aucune signature, copie de demande, transaction ou transmission. Pour explorer la confidentialité, saisissez uniquement des coordonnées fictives puis utilisez Effacer.'));return;}
  const epoch=memory.epoch,contact={name:$('requestName').value,email:$('requestEmail').value};
  await assertSession();if(!member?.claimed)throw Error('CLAIM_NOT_CURRENT');
  const current=await contract.claimRecord(member.id,member.node);if(Number(current[5])!==1||current[0].toLowerCase()!==account.toLowerCase())throw Error('CLAIM_NOT_CURRENT');
  const issuedAt=Math.floor(Date.now()/1000);
  const unsigned=await preparePacket({origin:cfg.expectedOrigin,chainId:1,registry:cfg.registryAddress.toLowerCase(),entitlementId:member.id,membershipLabel:member.label,membershipNode:member.node,claimant:account.toLowerCase(),claimRevision:Number(current[4]),issuedAt,expiresAt:issuedAt+DEFAULT_TTL_SECONDS,nonce:randomHex(16)},contact);
  contact.name='';contact.email='';
  await validatePacket({...unsigned,signature:'0x01'},policy(),ethers);
  assertUsage();
  if(epoch!==memory.epoch)throw Error('EDITED');
  status(t('Signez la demande : le wallet reçoit une empreinte salée, pas votre nom ni votre courriel.'));
  const signature=await signer.signMessage(unsigned.message);
  await assertSession();if(epoch!==memory.epoch)throw Error('EDITED');
  const packet={...unsigned,signature};
  await verifyEntitlementRequest(packet,policy(),createEthersIO(ethers,provider,cfg.registryAddress));
  assertUsage();
  if(!memory.set(packet,epoch))throw Error('EDITED');
  $('requestPreview').value=formatRequestEmail(packet);$('copyRequest').disabled=false;
  message(t('Demande vérifiée, uniquement dans cette page. Copiez-la vous-même dans un courriel à president@montreal.ai. Le site ne l’envoie pas.'));
  status(t('Prête à copier. Le reçu contient en clair toute coordonnée fournie : gardez-le privé.'));touch();
}
async function copy(){
  if(!$('copyConsent').checked)throw Error('COPY_CONSENT');const packet=memory.packet;if(!packet)throw Error('NO_PACKET');
  if(!navigator.clipboard?.writeText)throw Error('COPY_UNAVAILABLE');
  try{await navigator.clipboard.writeText(formatRequestEmail(packet));}catch{throw Error('COPY_UNAVAILABLE');}
  clearPrivate();message(t('Copiée dans le presse-papiers. Les champs et références de la page ont été effacés. Collez la demande dans votre messagerie puis envoyez-la à president@montreal.ai. Envoi non confirmé par le site.'));
  status(t('Presse-papiers sous votre contrôle. Évitez un appareil partagé ; effacez-le après l’envoi.'));
}
on('connect',connect);on('verify',inspectMember);on('claim',claim);on('prepareRequest',prepare);on('copyRequest',copy);
on('refreshBenefits',()=>loadBenefits());on('loadBenefits',()=>loadBenefits(true));
$('clearPrivate').addEventListener('click',()=>{clearPrivate();status(t('Coordonnées effacées de la page. Le presse-papiers et votre messagerie ne sont pas effacés par cette action.'));});
on('demo',()=>{disconnect();demo=true;$('verify').disabled=false;$('authority').textContent=t('Démonstration');$('modeNotice').textContent=t('DÉMONSTRATION — catalogue vide, sans wallet, transaction ni envoi. Utilisez des données fictives.');$('memberLabel').value='exemple';status(t('Cliquez sur Vérifier pour explorer la confidentialité avec un droit fictif. Aucun avantage n’est créé.'));});
for(const f of ['requestName','requestEmail'])$(f).addEventListener('input',()=>{invalidate();touch();});
$('consent').addEventListener('change',()=>invalidate());
$('usageConsent').addEventListener('change',()=>{usageEpoch++;invalidate(true);touch();});
for(const f of ['memberLabel','benefitSelect'])$(f).addEventListener('input',()=>{membershipEpoch++;clearPrivate();member=null;lockContact(false);$('claim').disabled=true;$('verify').disabled=!demo&&!$('benefitSelect').value;$('eligibility').textContent=t('Vérifiez de nouveau le membership et l’avantage sélectionnés.');});
for(const e of ['pointerdown','keydown'])document.addEventListener(e,touch,{passive:true});
window.addEventListener('pagehide',clearPrivate);
window.addEventListener('pageshow',()=>{clearPrivate();});
window.addEventListener('beforeunload',clearPrivate);
if(window.ethereum?.on)for(const event of ['accountsChanged','chainChanged','disconnect'])window.ethereum.on(event,()=>{
  if(event!=='disconnect'&&walletPromptEpoch===sessionEpoch)return;
  disconnect();
});
lockContact(false);clearPrivate();renderCatalog();
$('modeNotice').textContent=cfg.registryAddress?t('Contrat configuré. Vérifiez l’adresse officielle avant de connecter le wallet.'):t('NON DÉPLOYÉ / NON CONFIGURÉ. La démonstration n’émet aucun droit.');

onLanguageChange(()=>{
  disconnect();
  status(tr('Langue modifiée. Les coordonnées temporaires et demandes préparées sont effacées. Reconnectez le wallet pour continuer ; refusez aussi toute demande en attente dans celui-ci.','Language changed. Temporary contact details and prepared requests were cleared. Reconnect your wallet to continue; also reject any pending request in the wallet.'));
});
