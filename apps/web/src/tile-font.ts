/** Font roles shared by all Canvas labels. CSS roles mirror these names. */
export const TILE_FONT_FAMILY='"Hanz WenKai","Hanz PingFang",sans-serif';
export const UI_FONT_FAMILY='"Hanz PingFang","PingFang SC",sans-serif';
export const TILE_FONT_WEIGHT=500;
export const tileCanvasFont=(size:number)=>`${TILE_FONT_WEIGHT} ${size}px ${TILE_FONT_FAMILY}`;
export const uiCanvasFont=(size:number,weight=400)=>`${weight} ${size}px ${UI_FONT_FAMILY}`;
// Failed requests are evicted: a later snapshot/repaint may retry without blocking play.
const requested=new Map<string,Promise<FontFace[]>>();
function ensure(font:string,text:string){
 const key=font+':'+text;if(requested.has(key))return;
 const request=document.fonts.load(font,text);requested.set(key,request);
 void request.then(faces=>{if(!faces.length)requested.delete(key);},()=>requested.delete(key));
}
export function ensureTileGlyph(text:string){ensure(tileCanvasFont(32),text);}
export function ensureUiGlyphs(text:string,weight=400){ensure(uiCanvasFont(32,weight),text);}
