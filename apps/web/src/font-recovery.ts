/** Retry failed self-hosted faces without blocking controls or replacing font outlines. */
export function installFontRecovery(){
 const attempts=new Map<string,number>(),pending=new Set<string>();
 const rules=():CSSFontFaceRule[]=>{const found:CSSFontFaceRule[]=[];const walk=(list:CSSRuleList)=>{for(const rule of Array.from(list)){if(rule instanceof CSSFontFaceRule)found.push(rule);else if(rule instanceof CSSImportRule&&rule.styleSheet)walk(rule.styleSheet.cssRules);else if('cssRules' in rule)walk((rule as CSSGroupingRule).cssRules);}};for(const sheet of Array.from(document.styleSheets))try{walk(sheet.cssRules);}catch{/* Ignore unrelated cross-origin sheets. */}return found;};
 const clean=(s:string)=>s.replace(/["'\s]/g,'').toUpperCase();
 const retry=()=>{const failed=Array.from(document.fonts).filter(f=>f.status==='error'&&/Hanz (WenKai|PingFang)/.test(f.family));if(!failed.length)return;
  for(const rule of rules()){
   const s=rule.style,family=s.getPropertyValue('font-family'),weight=s.getPropertyValue('font-weight'),unicodeRange=s.getPropertyValue('unicode-range');
   if(!failed.some(f=>clean(f.family)===clean(family)&&clean(f.weight)===clean(weight)&&clean(f.unicodeRange)===clean(unicodeRange)))continue;
   const source=s.getPropertyValue('src'),key=family+weight+unicodeRange;if(pending.has(key)||(attempts.get(key)??0)>=2)continue;pending.add(key);attempts.set(key,(attempts.get(key)??0)+1);
   setTimeout(()=>{const face=new FontFace(family.replace(/["']/g,''),source,{weight,unicodeRange,style:'normal',display:'swap'});document.fonts.add(face);void face.load().then(()=>{pending.delete(key);document.dispatchEvent(new Event('hanz-font-ready'));},()=>{document.fonts.delete(face);pending.delete(key);});},1000);
  }
 };
 document.fonts.addEventListener('loadingerror',retry);
 window.addEventListener('online',()=>{attempts.clear();retry();});
}
