/** Exclusive recovery checkpoint. Contains public transaction metadata, never signed bytes or keys. */
import fs from 'node:fs';
import path from 'node:path';

export function reserveBroadcast(file,record) {
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  // wx arbitrates concurrent invocations; flush must succeed before any RPC broadcast.
  // A partial/failed write stays in place and requires inspection, never automatic retry.
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600,flush:true});
}
