/** One bundled font face and weight for DOM tiles and canvas textures. */
export const TILE_FONT_FAMILY='"Hanz PingFang",sans-serif';
export const TILE_FONT_WEIGHT=600;
export const tileCanvasFont=(size:number)=>`${TILE_FONT_WEIGHT} ${size}px ${TILE_FONT_FAMILY}`;
const requested=new Set<string>();
/** Canvas text does not reliably initiate CSS font downloads; request each visible glyph explicitly. */
export function ensureTileGlyph(char:string){
 if(requested.has(char))return;requested.add(char);
 void document.fonts.load(tileCanvasFont(32),char).catch(()=>{requested.delete(char);});
}

/** Shared UI font for the small labels rendered into the 3D table. */
export const uiCanvasFont=(size:number,weight=400)=>`${weight} ${size}px ${TILE_FONT_FAMILY}`;
const requestedUi=new Set<string>();
export function ensureUiGlyphs(text:string,weight=400){
 const key=weight+':'+text;if(requestedUi.has(key))return;requestedUi.add(key);
 void document.fonts.load(uiCanvasFont(32,weight),text).catch(()=>requestedUi.delete(key));
}
