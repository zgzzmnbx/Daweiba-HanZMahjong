/** Deterministic delivery derivatives; keep the original v1 portraits untouched.
 * Run with sharp available via NODE_PATH (or a local development install).
 * Published mobile-v1 files are immutable: change the directory for future encodings.
 */
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
(async()=>{
 const source=JSON.parse(fs.readFileSync('docs/avatar-manifest-v1.json','utf8'));
 const directory='apps/web/public/avatars/mobile-v1';fs.mkdirSync(directory,{recursive:true});
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
 for(const a of source.assets){
  const raw=fs.readFileSync(`apps/web/public/avatars/v1/${a.id}.webp`);
  if(hash(raw)!==a.webSha256)throw Error('Original source changed: '+a.id);
  const bytes=await sharp(raw).resize(128,128,{fit:'cover'}).webp({quality:76,effort:6}).toBuffer();
  fs.writeFileSync(`${directory}/${a.id}.webp`,bytes);
  assets.push({id:a.id,sourceSha256:hash(raw),sha256:hash(bytes),sourceBytes:raw.length,bytes:bytes.length});
 }
 const originalBytes=assets.reduce((n,a)=>n+a.sourceBytes,0),mobileBytes=assets.reduce((n,a)=>n+a.bytes,0);
 fs.writeFileSync('docs/avatar-mobile-manifest-v1.json',JSON.stringify({source:'avatar-manifest-v1.json',directory:'/avatars/mobile-v1/',size:128,format:'webp',quality:76,sharp:sharp.versions.sharp,webp:sharp.versions.webp,originalBytes,mobileBytes,assets},null,2)+'\n');
 console.log({count:assets.length,originalBytes,mobileBytes,savingPercent:Math.round(100*(1-mobileBytes/originalBytes))});
})();
