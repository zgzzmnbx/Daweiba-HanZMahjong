/** Test actual loaded face coverage, including recovered copies of previously failed faces. */
export function unicodeRangeContains(range:string,point:number){
 return range.split(',').some(part=>{const token=part.trim().replace(/^U\+/i,''),[a,b]=token.split('-'),low=parseInt(a.replace(/\?/g,'0'),16),high=parseInt((b??a).replace(/\?/g,'F'),16);return point>=low&&point<=high;});
}
function glyphsReady(text:string){
 const faces=Array.from(document.fonts).filter(f=>f.family.replace(/["']/g,'')==='Hanz WenKai'&&f.weight==='500'&&f.status==='loaded');
 return Array.from(text).every(char=>faces.some(face=>unicodeRangeContains(face.unicodeRange,char.codePointAt(0)!)));
}
/** Bounded batch load: the viewer reveals one font choice for its entire lifetime. */
export function prepareDeckFont(text:string,signal:AbortSignal,timeout=2000):Promise<boolean>{
 if(signal.aborted)return Promise.resolve(false);if(glyphsReady(text))return Promise.resolve(true);
 return new Promise(resolve=>{
  let done=false;const finish=(ok:boolean)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);resolve(ok);},abort=()=>finish(false),timer=setTimeout(()=>finish(false),timeout);
  signal.addEventListener('abort',abort,{once:true});void document.fonts.load('500 32px "Hanz WenKai"',text).then(()=>finish(glyphsReady(text)),()=>finish(glyphsReady(text)));
 });
}
