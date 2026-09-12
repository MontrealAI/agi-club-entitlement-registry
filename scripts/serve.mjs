/** Public build only, loopback only; intentionally cannot serve repository secrets. */
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';
export function siteServer(root=path.resolve('dist/site')) {
 root=path.resolve(root);if(!fs.existsSync(path.join(root,'ASSET_MANIFEST.json')))throw Error('Run npm run build:site first. The unbuilt frontend is not a deployable site.');
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
 return http.createServer((req,res)=>{try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
  const u=new URL(req.url,'http://127.0.0.1'),p=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()||fs.lstatSync(p).isSymbolicLink()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(p)]||'text/plain','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});if(req.method==='HEAD')return res.end();fs.createReadStream(p).pipe(res);
 }catch{res.writeHead(400);res.end('Bad request');}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=siteServer();server.listen(8080,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:8080 — demonstration only until official HTTPS origin is configured.'));}
