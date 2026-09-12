import {verifyTicketRequest,REGISTRY_VERSION} from './shared/ticket-request.mjs';
import {createEthersIO} from './shared/ethers-adapter.mjs';
import {parseRequestEmail,membershipName,MAX_EMAIL_BYTES} from './shared/request-email.mjs';
import {requestPolicy} from './member-catalog.mjs';
const $=id=>document.getElementById(id),cfg=window.AGI_CONFIG||{};
let epoch=0,timer=null;
const errors={
 WALLET_OR_LIBRARY_UNAVAILABLE:'Ouvrez le site construit avec un navigateur compatible avec votre wallet.',
 WRONG_ORIGIN:'Utilisez uniquement l’origine HTTPS officielle configurée.',
 BODY_TOO_LARGE:'Le reçu dépasse la taille autorisée.',INVALID_JSON:'Collez la demande complète préparée par le site ou le reçu JSON original.',
 INVALID_EMAIL_IDENTITY:'Le sous-nom affiché dans le courriel ne correspond pas au reçu. Demandez la copie originale complète.',
 POLICY_NOT_CONFIGURED:'L’origine, le contrat ou les avantages autorisés ne sont pas configurés correctement.',
 POLICY_VERSION_MISMATCH:'La version du vérificateur doit correspondre au contrat approuvé.',
 WAITING_FOR_FINALITY:'Le claim attend la finalité Ethereum. Réessayez plus tard.',
 FINALITY_UNAVAILABLE:'La finalité Ethereum est indisponible. Réessayez avec votre fournisseur habituel.',
 REQUEST_EXPIRED:'Demande expirée. Le membre doit préparer une nouvelle demande pour le même claim.',
 CLAIM_NOT_CURRENT:'Ce claim est révoqué, modifié ou attribué à un autre wallet.',
 WRONG_CHAIN:'Ethereum mainnet est requis.',WRONG_REGISTRY:'Le contrat ne correspond pas au registre approuvé.',
 INVALID_SIGNATURE:'La signature ne valide pas ce reçu pour le bénéficiaire du claim.',
 RECIPIENT_COMMITMENT_MISMATCH:'Les coordonnées ne correspondent pas à la demande signée.',
 CHAIN_CHANGED_RETRY:'L’état Ethereum a changé pendant la vérification. Réessayez.',
 ENTITLEMENT_NOT_ENABLED:'Cet avantage ne figure pas dans la configuration approuvée.',
};
function touch(){clearTimeout(timer);timer=setTimeout(clear,600000);}
function clear(){epoch++;$('packetText').value='';$('verifyResult').textContent='';$('verifyStatus').textContent='Données effacées de cette page.';clearTimeout(timer);}
$('clearReceipt').addEventListener('click',clear);
$('packetText').addEventListener('input',()=>{epoch++;$('verifyResult').textContent='';$('verifyStatus').textContent='Reçu modifié. Relancez la vérification.';touch();});
for(const e of ['pagehide','pageshow','beforeunload'])window.addEventListener(e,clear);
if(window.ethereum?.on)for(const e of ['accountsChanged','chainChanged','disconnect'])window.ethereum.on(e,clear);
$('verifyReceipt').addEventListener('click',async()=>{
 const button=$('verifyReceipt');if(button.disabled)return;button.disabled=true;const at=epoch;
 touch();$('verifyResult').textContent='';$('verifyStatus').textContent='Vérification en cours. Aucun billet autorisé.';
 try{
  if(!window.ethers||!window.ethereum?.request)throw Error('WALLET_OR_LIBRARY_UNAVAILABLE');
  if(location.origin!==cfg.expectedOrigin||!cfg.expectedOrigin?.startsWith('https://'))throw Error('WRONG_ORIGIN');
  const raw=$('packetText').value;if(new TextEncoder().encode(raw).length>MAX_EMAIL_BYTES)throw Error('BODY_TOO_LARGE');
  const packet=parseRequestEmail(raw);
  await window.ethereum.request({method:'eth_requestAccounts'});
  if(at!==epoch)return;
  const provider=new ethers.BrowserProvider(window.ethereum);
  try{
   const policy=requestPolicy(cfg,ethers,REGISTRY_VERSION);
   const result=await verifyTicketRequest(packet,policy,createEthersIO(ethers,provider,cfg.registryAddress));
   if(at!==epoch)throw Error('INPUT_CHANGED');
   $('verifyResult').textContent=JSON.stringify({status:result.status,membership:membershipName(result.payload.membershipLabel),claimKey:result.claimKey,claimRevision:result.payload.claimRevision,name:result.recipient.name,email:result.recipient.email,finalizedBlock:result.finalizedBlock,ticketIssued:false,mailboxControlVerified:false},null,2);
   $('verifyStatus').textContent='Signature et droit vérifiés. Contrôlez les doublons dans votre registre privé AVANT de créer un billet.';
  }finally{provider.destroy();}
 }catch(e){if(at===epoch){$('verifyResult').textContent='';const code=Object.hasOwn(errors,e?.code)?e.code:Object.hasOwn(errors,e?.message)?e.message:null;$('verifyStatus').textContent='NON VALIDÉ : '+(code?errors[code]:'Reçu invalide ou vérification indisponible. Aucun billet autorisé.');}}
 finally{button.disabled=false;}
});
