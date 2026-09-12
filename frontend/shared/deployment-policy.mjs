/** Pure plan binding, used by the approval page and deployment scripts. */
export const PLAN_FIELDS = Object.freeze(['schema','chainId','contract','sourceSha256','creationCodeHash','runtimeCodeHash','deployer','admin','nonce','predictedAddress','gasLimit','maxFeePerGas','maxPriorityFeePerGas','maxCostWei','createdAt','expiresAt','evidenceSha256']);
const h32=/^0x[0-9a-f]{64}$/,sha=/^[0-9a-f]{64}$/,address=/^0x[0-9a-f]{40}$/,dec=/^(0|[1-9][0-9]*)$/;
export function validatePlan(plan, now=Math.floor(Date.now()/1000)) {
 if(!plan||typeof plan!=='object'||Array.isArray(plan)||Object.keys(plan).sort().join()!==[...PLAN_FIELDS].sort().join())throw Error('Invalid deployment-plan fields');
 if(plan.schema!=='AGIClubDeploymentPlan/2'||plan.chainId!==1||plan.contract!=='contracts/AGIClubEntitlementRegistryMainnet.sol:AGIClubEntitlementRegistryMainnet')throw Error('Wrong production scope');
 if(!sha.test(plan.sourceSha256)||!sha.test(plan.evidenceSha256)||!h32.test(plan.creationCodeHash)||!h32.test(plan.runtimeCodeHash))throw Error('Invalid hash');
 for(const k of ['deployer','admin','predictedAddress'])if(!address.test(plan[k])||/^0x0{40}$/.test(plan[k]))throw Error('Invalid '+k);
 if(plan.deployer===plan.admin)throw Error('Disposable deployer must differ from root administrator');
 for(const k of ['nonce','gasLimit','maxFeePerGas','maxPriorityFeePerGas','maxCostWei'])if(typeof plan[k]!=='string'||!dec.test(plan[k])||plan[k].length>78)throw Error('Invalid '+k);
 for(const k of ['nonce','gasLimit','maxFeePerGas','maxPriorityFeePerGas','maxCostWei'])if(BigInt(plan[k])>=(1n<<256n))throw Error('Integer overflow: '+k);
 if(BigInt(plan.nonce)>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Nonce exceeds safe conversion range');
 if(BigInt(plan.gasLimit)===0n||BigInt(plan.maxFeePerGas)===0n||BigInt(plan.maxPriorityFeePerGas)>BigInt(plan.maxFeePerGas))throw Error('Invalid gas bounds');
 if(BigInt(plan.maxCostWei)!==BigInt(plan.gasLimit)*BigInt(plan.maxFeePerGas))throw Error('Cost does not match signed bounds');
 if(!Number.isSafeInteger(plan.createdAt)||!Number.isSafeInteger(plan.expiresAt)||plan.createdAt>now+60||plan.expiresAt<=now||plan.expiresAt<=plan.createdAt||plan.expiresAt-plan.createdAt>3600)throw Error('Expired/invalid deployment approval window');
 return plan;
}
export function deploymentMessage(plan, now=Math.floor(Date.now()/1000)) {
 validatePlan(plan,now);const ordered={};for(const field of PLAN_FIELDS)ordered[field]=plan[field];
 return 'AGI CLUB — EMPTY REGISTRY DEPLOYMENT APPROVAL\n'+JSON.stringify(ordered)+'\nI approve ONLY this exact contract creation, signer, nonce, fee ceiling and time window. The registry starts empty. No benefit creation, member launch, fulfillment, token approval, transfer or upgrade is authorized.';
}
