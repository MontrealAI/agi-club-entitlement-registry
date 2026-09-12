import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readReceipt} from '../tools/read-receipt.mjs';
import {MAX_PACKET_BYTES,preparePacket,validatePacket} from '../shared/entitlement-request.mjs';
import {MAX_EMAIL_BYTES} from '../shared/request-email.mjs';
import {fixture,NOW} from './fixtures.mjs';
import {signMessage} from './crypto-reference.mjs';

test('CLI input preserves a signed UTF-8 receipt across every byte boundary',async()=>{
  const f=await fixture();
  const unsigned=await preparePacket(f.packet.payload,{name:'Zoë Montréal 🧪',email:'zoe@example.org'});
  const expected={...unsigned,signature:signMessage(unsigned.message)};
  const bytes=Buffer.from(JSON.stringify(expected));
  const packet=await readReceipt(Readable.from(Array.from(bytes,byte=>Buffer.of(byte))));
  assert.deepEqual(packet,expected);
  await validatePacket(packet,f.policy,f.io.crypto,{now:NOW});
});

test('CLI input accepts exactly the byte limit',async()=>{
  const bytes=Buffer.from(' '.repeat(MAX_PACKET_BYTES-2)+'{}');
  assert.deepEqual(await readReceipt(Readable.from([bytes])),{});
});

test('CLI input rejects oversized data before reading the remaining stream',async()=>{
  let resumed=false;
  async function* input(){yield Buffer.alloc(MAX_EMAIL_BYTES+1,32);resumed=true;yield Buffer.from('{}');}
  await assert.rejects(()=>readReceipt(input()),{message:'BODY_TOO_LARGE'});
  assert.equal(resumed,false);
});

for(const bytes of [Buffer.from([34,0xc3,0x28,34]),Buffer.from([34,0xf0,0x9f])]){
  test('CLI input rejects malformed or truncated UTF-8: '+bytes.toString('hex'),async()=>{
    await assert.rejects(()=>readReceipt(Readable.from([bytes])),{message:'INVALID_UTF8'});
  });
}

test('CLI JSON errors do not echo private input',async()=>{
  await assert.rejects(()=>readReceipt(Readable.from([Buffer.from('{"name":"FICTITIOUS PRIVATE INPUT",bad}')])),{message:'INVALID_JSON'});
});

test('The operator CLI reports input failures without exposing receipt text or contacting RPC',async()=>{
  const f=await fixture(),dir=mkdtempSync(join(tmpdir(),'agi-receipt-input-'));
  try {
    const policyFile=join(dir,'public-test-policy.json');
    writeFileSync(policyFile,JSON.stringify(f.policy));
    const env={...process.env};delete env.RPC_URL;
    for(const [input,code] of [[Buffer.from([34,0xc3,0x28,34]),'INVALID_UTF8'],[Buffer.from('{"name":"FICTITIOUS PRIVATE INPUT",bad}'),'INVALID_JSON']]) {
      const run=spawnSync(process.execPath,[fileURLToPath(new URL('../tools/verify_entitlement_request.mjs',import.meta.url)),policyFile],{input,env,encoding:'utf8',timeout:10000});
      assert.equal(run.status,1);assert.equal(run.stdout,'');
      const result=JSON.parse(run.stderr.split('\n').find(line=>line.startsWith('{')));
      assert.equal(result.status,'NOT_VERIFIED');assert.equal(result.error,code);
      assert.doesNotMatch(run.stderr,/FICTITIOUS PRIVATE INPUT/);
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
