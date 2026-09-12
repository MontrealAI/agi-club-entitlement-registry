#!/usr/bin/env node
/** Read-only operator tool. No request file written; use stdin. Default output redacts contacts.
 * Input/output shell redirection, terminal scrollback and mailbox retention are operator-controlled.
 */
import fs from 'node:fs/promises';
import {verifyEntitlementRequest,validatePolicy,RequestError} from '../shared/entitlement-request.mjs';
import {createEthersIO} from '../shared/ethers-adapter.mjs';
import {readReceipt} from './read-receipt.mjs';
import {membershipName} from '../shared/request-email.mjs';
let provider;
try{
 const [configFile,flag]=process.argv.slice(2);
 if(!configFile||![undefined,'--show-recipient'].includes(flag)||process.argv.length>4)throw Error('USAGE');
 const policy=validatePolicy(JSON.parse(await fs.readFile(configFile,'utf8')));
 const packet=await readReceipt(process.stdin);
 if(!process.env.RPC_URL?.startsWith('https://'))throw Error('HTTPS_RPC_URL_REQUIRED');
 const {ethers}=await import('ethers');const transport=new ethers.FetchRequest(process.env.RPC_URL);transport.timeout=10000;
 provider=new ethers.JsonRpcProvider(transport,undefined,{batchMaxCount:1});
 const result=await verifyEntitlementRequest(packet,policy,createEthersIO(ethers,provider,policy.registry));
 const out={status:result.status,membership:membershipName(result.payload.membershipLabel),entitlementId:result.payload.entitlementId,claimKey:result.claimKey,claimRevision:result.payload.claimRevision,finalizedBlock:result.finalizedBlock,fulfillmentConfirmed:false,mailboxControlVerified:false,recipient:flag==='--show-recipient'?result.recipient:'REDACTED',action:'Check the published entitlement terms and private fulfillment register. One claim key identifies the same allocation across signatures, contacts and revisions; verification does not confirm fulfillment.'};
 process.stdout.write(JSON.stringify(out,null,2)+'\n');
}catch(e){const code=e instanceof RequestError?e.code:/^[A-Z_]{3,80}$/.test(e.code||e.message)?(e.code||e.message):'VERIFICATION_FAILED';process.stderr.write(JSON.stringify({status:'NOT_VERIFIED',error:code,instruction:'Usage: node tools/verify_entitlement_request.mjs TRUSTED_POLICY.json [--show-recipient] < PRIVATE_RECEIPT.json. Do not upload receipt or terminal output.'})+'\n');process.exitCode=1;}
finally{provider?.destroy();}
