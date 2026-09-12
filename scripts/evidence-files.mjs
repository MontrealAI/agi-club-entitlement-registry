/** Read evidence only from the selected repository directory; never follow links. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export function readEvidenceFile(root,relative,directory) {
  assert(typeof relative==='string','Evidence path required');
  const base=path.join(root,directory),file=path.resolve(root,relative);
  assert(file.startsWith(base+path.sep),'Evidence path escapes its directory');
  let part=root;
  for(const segment of path.relative(root,file).split(path.sep)) {
    part=path.join(part,segment);
    assert(!fs.lstatSync(part).isSymbolicLink(),'Evidence symlinks are not allowed');
  }
  assert(fs.statSync(file).isFile(),'Evidence must be a regular file');
  const bytes=fs.readFileSync(file);
  assert(bytes.length>0,'Evidence is empty');
  return bytes;
}
