import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const projectRoot = fileURLToPath(new URL('..', import.meta.url));
export const sha256 = data => createHash('sha256').update(data).digest('hex');
export function sourceDigest(root = projectRoot) {
  const records = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)) {
      const p = path.join(dir,ent.name), rel = path.relative(root,p).split(path.sep).join('/');
      if (ent.isSymbolicLink()) throw Error('Source symlink not allowed: '+rel);
      if (ent.isDirectory()) {
        if (ent.name === '__pycache__' || rel === 'frontend/vendor') continue;
        walk(p);
      } else if (!ent.name.endsWith('.pyc')) records.push({path:rel,sha256:sha256(fs.readFileSync(p))});
    }
  }
  for (const folder of ['contracts','shared','frontend','scripts','tools','test','vendor','.github']) {
    if (fs.existsSync(path.join(root,folder))) walk(path.join(root,folder));
  }
  for (const file of ['package.json','package-lock.json','hardhat.config.ts','VERSION','.npmrc','.nvmrc','LICENSE','PRIVACY.md','docs/LEGAL_RELEASE_REVIEW.md']) {
    if (fs.existsSync(path.join(root,file))) records.push({path:file,sha256:sha256(fs.readFileSync(path.join(root,file)))});
  }
  records.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return {sourceSha256:sha256(records.map(r=>r.path+'\0'+r.sha256+'\n').join('')), files:records};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync('qualification',{recursive:true}); const result=sourceDigest();
  fs.writeFileSync('qualification/SOURCE_DIGEST.json',JSON.stringify(result,null,2)+'\n'); console.log(result.sourceSha256);
}
