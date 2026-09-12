/** Loopback preview of a trusted public build; reject paths outside its real root. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function siteServer(root=path.resolve('dist/site')) {
 root=path.resolve(root);
 if(!fs.existsSync(path.join(root,'ASSET_MANIFEST.json')))throw Error('Run npm run build:site first. The unbuilt frontend is not a deployable site.');
 root=fs.realpathSync(root);
 const insideRoot=file=>{
  const relative=path.relative(root,file);
  return relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
 };
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
 return http.createServer((req,res)=>{
  const reply=(status,body='')=>{res.writeHead(status);res.end(body);};
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.setHeader('Allow','GET, HEAD');
   return reply(405);
  }
  let file;
  try {
   const url=new URL(req.url,'http://127.0.0.1');
   file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(file.includes('\0'))return reply(400,'Bad request');
  } catch {return reply(400,'Bad request');}
  try {
   if(!insideRoot(file)||fs.lstatSync(file).isSymbolicLink())return reply(404);
   // A leaf-only symlink check misses links in parent directories (and junctions).
   file=fs.realpathSync(file);
   if(!insideRoot(file)||!fs.statSync(file).isFile())return reply(404);
   res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   res.setHeader('Referrer-Policy','no-referrer');
   if(req.method==='HEAD')return reply(200);
   const stream=fs.createReadStream(file);
   stream.once('error',()=>{
    if(res.headersSent)res.destroy();
    else reply(500,'Unable to read public asset');
   });
   res.once('close',()=>stream.destroy());
   stream.pipe(res);
  } catch(error) {
   const missing=['ENOENT','ENOTDIR','ELOOP','EACCES','EPERM'].includes(error.code);
   reply(missing?404:500);
  }
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=siteServer();server.listen(8080,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:8080 — demonstration only until official HTTPS origin is configured.'));}
