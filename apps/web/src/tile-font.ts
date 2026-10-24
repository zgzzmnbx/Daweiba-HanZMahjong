/** One bundled font face and weight for DOM tiles and canvas textures. */
export const TILE_FONT_FAMILY='"Hanz Tile Sans",sans-serif';
export const TILE_FONT_WEIGHT=600;
export const tileCanvasFont=(size:number)=>`${TILE_FONT_WEIGHT} ${size}px ${TILE_FONT_FAMILY}`;
const requested=new Set<string>();
/** Canvas text does not reliably initiate CSS font downloads; request each visible glyph explicitly. */
export function ensureTileGlyph(char:string){
 if(requested.has(char))return;requested.add(char);
 void document.fonts.load(tileCanvasFont(32),char).catch(()=>{requested.delete(char);});
}
