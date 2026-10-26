/* Resize/encode only: artwork is generated with the built-in image tool. */
const fs=require('node:fs'),crypto=require('node:crypto'),sharp=require('sharp');
const source=process.argv[2];if(!source)throw Error('Pass the original transparent PNG path');
(async()=>{const raw=fs.readFileSync(source),meta=await sharp(raw).metadata();if(!meta.hasAlpha||meta.width/meta.height!==1.5)throw Error('Expected transparent 3:2 original');
 fs.mkdirSync('apps/web/public/lobby/v1',{recursive:true});const assets=[];
 for(const width of [480,960]){const file=`table-${width}.webp`,path='apps/web/public/lobby/v1/'+file;await sharp(raw).resize({width}).webp({quality:85,alphaQuality:90,effort:6}).toFile(path);const bytes=fs.readFileSync(path);assets.push({file,width,height:width/1.5,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
 const manifest={version:1,source:'OpenAI built-in image generation',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),sourceSize:[meta.width,meta.height],processing:'Proportional resize and WebP encoding only; alpha retained',assets};fs.writeFileSync('docs/lobby-art-manifest-v1.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));})();
