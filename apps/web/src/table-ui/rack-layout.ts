import type {Draft,TileId} from '../../../../packages/contracts/types';
export type RackItem={key:string;kind:'tile'|'comma';tileId:TileId;x:number;y:number;width:number;height:number;row:number};
export const COMMA_WIDTH_RATIO=.7;
/** Punctuation has its own narrower slot and stays on the same row as its anchor. */
export function rackLayout(draft:Draft,tileWidth:number,height:number,gap:number,maxWidth=Infinity,rowGap=10){
 const items:RackItem[]=[];let x=0,row=0,width=0;const commas=new Set(draft.commaAfterTileIds);
 for(const tileId of draft.orderedTileIds){const comma=commas.has(tileId),group=tileWidth+(comma?gap+tileWidth*COMMA_WIDTH_RATIO:0);if(x&&x+group>maxWidth+.01){row++;x=0;}items.push({key:`tile:${tileId}`,kind:'tile',tileId,x,y:row*(height+rowGap),width:tileWidth,height,row});x+=tileWidth;
 if(comma){x+=gap;items.push({key:`comma:${tileId}`,kind:'comma',tileId,x,y:row*(height+rowGap),width:tileWidth*COMMA_WIDTH_RATIO,height,row});x+=tileWidth*COMMA_WIDTH_RATIO;}width=Math.max(width,x);x+=gap;}
 return{items,width,height:items.length?(row+1)*height+row*rowGap:0};
}
export function movePreview(draft:Draft,tileId:TileId,index:number):Draft{const order=[...draft.orderedTileIds],from=order.indexOf(tileId);if(from<0)return draft;order.splice(from,1);order.splice(Math.max(0,Math.min(index,order.length)),0,tileId);return{orderedTileIds:order,commaAfterTileIds:draft.commaAfterTileIds.filter(id=>id!==order.at(-1)) as unknown as Draft['commaAfterTileIds']};}
/** null target returns a comma to its tray; invalid anchors leave the draft unchanged. */
export function commaPreview(draft:Draft,from:TileId|null,to:TileId|null):Draft{if(to&&(to===draft.orderedTileIds.at(-1)||!draft.orderedTileIds.includes(to)||to!==from&&Array.from(draft.commaAfterTileIds).includes(to)))return draft;const commas=draft.commaAfterTileIds.filter(id=>id!==from);if(to){if(commas.length>=3)return draft;commas.push(to);}return{orderedTileIds:[...draft.orderedTileIds],commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']};}
export type RackRect={tileId:TileId;left:number;top:number;width:number;height:number};
/** Choose a stable slot by row then horizontal center, never by animated DOM hit testing. */
export function nearestSlot(rects:readonly RackRect[],x:number,y:number){let result:RackRect|undefined,distance=Infinity;for(const r of rects){const dx=x-r.left-r.width/2,dy=y-r.top-r.height/2,d=Math.abs(dy)*4+Math.abs(dx);if(d<distance){distance=d;result=r;}}return result?.tileId??null;}

/** Only explicit nearby rack targets may reorder; dragging across the table must not shuffle cards. */
export function insideRect(r:{left:number;top:number;width:number;height:number}|null|undefined,x:number,y:number,pad=0){return !!r&&x>=r.left-pad&&x<=r.left+r.width+pad&&y>=r.top-pad&&y<=r.top+r.height+pad;}
export function nearRackSlot(rects:readonly RackRect[],x:number,y:number){return rects.some(r=>insideRect(r,x,y,28))?nearestSlot(rects,x,y):null;}
