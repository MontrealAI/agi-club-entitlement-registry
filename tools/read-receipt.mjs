import {RequestError} from '../shared/ticket-request.mjs';
import {MAX_EMAIL_BYTES,parseRequestEmail} from '../shared/request-email.mjs';

// Decode incrementally without replacing malformed bytes or retaining a file.
export async function readReceipt(input) {
  const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
  let raw='',size=0;
  const decode=(bytes,stream)=>{
    try{return decoder.decode(bytes,{stream});}
    catch{throw new RequestError('INVALID_UTF8');}
  };
  for await(const part of input) {
    const bytes=typeof part==='string'?Buffer.from(part,'utf8'):part;
    size+=bytes.byteLength;
    if(size>MAX_EMAIL_BYTES)throw new RequestError('BODY_TOO_LARGE');
    raw+=decode(bytes,true);
  }
  raw+=decode(undefined,false);
  return parseRequestEmail(raw);
}
