/** Packaging only: preserve generated originals, downsample for UI and build a review sheet. */
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
(async()=>{
 const sources=JSON.parse(fs.readFileSync(process.argv[2]||'Codex-Temp/avatar-sources.json'));
 fs.mkdirSync('apps/web/public/avatars/v1',{recursive:true});fs.mkdirSync('Codex-Temp/avatar-originals',{recursive:true});const assets=[];
 for(const a of sources){const raw=fs.readFileSync(a.sourcePath),dest='apps/web/public/avatars/v1/'+a.id+'.webp';fs.copyFileSync(a.sourcePath,'Codex-Temp/avatar-originals/'+a.id+'.png');await sharp(raw).resize(256,256,{fit:'cover'}).webp({quality:88,effort:6}).toFile(dest);assets.push({...a,sourcePath:undefined,originalSha256:crypto.createHash('sha256').update(raw).digest('hex'),webSha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),bytes:fs.statSync(dest).size});}
 fs.writeFileSync('docs/avatar-manifest-v1.json',JSON.stringify({generatedAt:'2026-10-26',tool:'native image_gen',modelIdReported:false,style:'Premium hand-painted 2.5D Chinese editorial portrait; jade green background; cream light; antique gold accents; close-up head and shoulders; no text; circle-safe framing.',size:256,assets},null,2)+'\n');
 const tiles=await Promise.all(assets.map(async(a,i)=>({input:await sharp('apps/web/public/avatars/v1/'+a.id+'.webp').resize(160,160).toBuffer(),left:(i%10)*166+3,top:Math.floor(i/10)*166+3})));
 await sharp({create:{width:1660,height:498,channels:3,background:'#122f25'}}).composite(tiles).webp({quality:90}).toFile('docs/assets/avatars-v1-contact-sheet.webp');console.log({count:assets.length,totalBytes:assets.reduce((s,a)=>s+a.bytes,0)});
})();
