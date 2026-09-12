/** TEST-ONLY Ethereum crypto reference. NEVER shipped in the public site or Worker.
 * Production uses ethers. This dependency-free implementation permits independent
 * message-binding tests offline, with public throwaway keys and known vectors.
 */
import {createHash} from 'node:crypto';
const mask=(1n<<64n)-1n;
const rc=[1n,0x8082n,0x800000000000808an,0x8000000080008000n,0x808bn,0x80000001n,0x8000000080008081n,0x8000000000008009n,0x8an,0x88n,0x80008009n,0x8000000an,0x8000808bn,0x800000000000008bn,0x8000000000008089n,0x8000000000008003n,0x8000000000008002n,0x8000000000000080n,0x800an,0x800000008000000an,0x8000000080008081n,0x8000000000008080n,0x80000001n,0x8000000080008008n];
const rot=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const rol=(a,n)=>n?((a<<BigInt(n))|(a>>BigInt(64-n)))&mask:a;
function perm(s){for(const r of rc){const c=Array.from({length:5},(_,x)=>s[x]^s[x+5]^s[x+10]^s[x+15]^s[x+20]),b=Array(25).fill(0n);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]^=c[(x+4)%5]^rol(c[(x+1)%5],1);for(let y=0;y<5;y++)for(let x=0;x<5;x++)b[y+5*((2*x+3*y)%5)]=rol(s[x+5*y],rot[x+5*y]);for(let y=0;y<5;y++)for(let x=0;x<5;x++)s[x+5*y]=(b[x+5*y]^((~b[(x+1)%5+5*y]&mask)&b[(x+2)%5+5*y]))&mask;s[0]^=r;}}
export function keccak(bytes){bytes=Buffer.from(bytes);const rate=136, pad=rate-(bytes.length%rate),data=Buffer.concat([bytes,Buffer.alloc(pad)]);data[bytes.length]=1;data[data.length-1]|=128;const s=Array(25).fill(0n);for(let o=0;o<data.length;o+=rate){for(let i=0;i<rate;i++)s[Math.floor(i/8)]^=BigInt(data[o+i])<<BigInt(8*(i%8));perm(s);}const out=Buffer.alloc(32);for(let i=0;i<32;i++)out[i]=Number((s[Math.floor(i/8)]>>BigInt(8*(i%8)))&255n);return '0x'+out.toString('hex');}
export const id=s=>keccak(Buffer.from(s));
export function namehash(name){let node=Buffer.alloc(32);for(const label of name.split('.').reverse())node=Buffer.from(keccak(Buffer.concat([node,Buffer.from(id(label).slice(2),'hex')])).slice(2),'hex');return '0x'+node.toString('hex');}
export function hashMessage(message){const b=Buffer.from(message,'utf8');return keccak(Buffer.concat([Buffer.from('\x19Ethereum Signed Message:\n'+b.length),b]));}
const P=0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const N=0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const G={x:0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,y:0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n};
const mod=(x,m=P)=>(x%m+m)%m;
function pow(a,b,m=P){let out=1n;a=mod(a,m);while(b){if(b&1n)out=out*a%m;a=a*a%m;b>>=1n;}return out;}
const inv=(a,m=P)=>{if(mod(a,m)===0n)throw Error('zero inverse');return pow(a,m-2n,m);};
function add(a,b){if(!a)return b;if(!b)return a;if(a.x===b.x&&mod(a.y+b.y)===0n)return null;const m=a.x===b.x?mod(3n*a.x*a.x*inv(2n*a.y)):mod((b.y-a.y)*inv(b.x-a.x));const x=mod(m*m-a.x-b.x);return {x,y:mod(m*(a.x-x)-a.y)};}
function mul(n,p=G){let out=null;while(n){if(n&1n)out=add(out,p);p=add(p,p);n>>=1n;}return out;}
const word=n=>n.toString(16).padStart(64,'0');
const addressOfPoint=q=>'0x'+keccak(Buffer.from(word(q.x)+word(q.y),'hex')).slice(-40);
export function walletAddress(key){return addressOfPoint(mul(BigInt(key)));}
export function publicKey(key){const p=mul(BigInt(key));return '04'+word(p.x)+word(p.y);}
export function signMessage(message,key=1n){const z=BigInt(hashMessage(message)),d=BigInt(key);let i=0;for(;;){const k=(BigInt('0x'+createHash('sha256').update('TEST ONLY '+d+' '+message+' '+i++).digest('hex'))%(N-1n))+1n,R=mul(k);if(R.x>=N)continue;const r=R.x;let s=mod(inv(k,N)*(z+r*d),N),v=Number(R.y&1n);if(!r||!s)continue;if(s>N/2n){s=N-s;v^=1;}return '0x'+word(r)+word(s)+(27+v).toString(16);}}
export function verifyMessage(message,sig){if(!/^0x[0-9a-f]{130}$/i.test(sig))throw Error('signature length');const r=BigInt('0x'+sig.slice(2,66)),s=BigInt('0x'+sig.slice(66,130)),v=parseInt(sig.slice(130),16)-27;if(r<=0n||r>=N||s<=0n||s>N/2n||v<0||v>1)throw Error('signature range');const x=r;let y=pow(mod(x*x*x+7n),(P+1n)/4n);if(mod(y*y)!==mod(x*x*x+7n))throw Error('point');if(Number(y&1n)!==v)y=P-y;const R={x,y};const Q=mul(inv(r,N),add(mul(s,R),mul(mod(-BigInt(hashMessage(message)),N))));if(!Q)throw Error('infinity');return addressOfPoint(Q);}
