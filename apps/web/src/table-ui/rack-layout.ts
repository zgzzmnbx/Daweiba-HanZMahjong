import type {Draft,TileId} from '../../../../packages/contracts/types';
export type RackItem={key:string;kind:'tile'|'comma'|'period';tileId:TileId;x:number;y:number;width:number;height:number;row:number};
export const COMMA_WIDTH_RATIO=1;
/** Punctuation occupies a full tile and stays on the same row as its anchor. */
export function rackLayout(draft:Draft,tileWidth:number,height:number,gap:number,maxWidth=Infinity,rowGap=10,includePeriod=false){
 const items:RackItem[]=[];let x=0,row=0,width=0;const commas=new Set(draft.commaAfterTileIds);
 for(const tileId of draft.orderedTileIds){const comma=commas.has(tileId),period=includePeriod&&tileId===draft.orderedTileIds.at(-1),group=tileWidth+((comma?1:0)+(period?1:0))*(gap+tileWidth*COMMA_WIDTH_RATIO);if(x&&x+group>maxWidth+.01){row++;x=0;}items.push({key:`tile:${tileId}`,kind:'tile',tileId,x,y:row*(height+rowGap),width:tileWidth,height,row});x+=tileWidth;
 if(comma){x+=gap;items.push({key:`comma:${tileId}`,kind:'comma',tileId,x,y:row*(height+rowGap),width:tileWidth*COMMA_WIDTH_RATIO,height,row});x+=tileWidth*COMMA_WIDTH_RATIO;}if(period){x+=gap;items.push({key:'period',kind:'period',tileId,x,y:row*(height+rowGap),width:tileWidth*COMMA_WIDTH_RATIO,height,row});x+=tileWidth*COMMA_WIDTH_RATIO;}width=Math.max(width,x);x+=gap;}
 return{items,width,height:items.length?(row+1)*height+row*rowGap:0};
}
/** Seven characters per row; punctuation shares its anchor's row without adding a third row.
 * Reserve seven character slots even for a thirteen-tile hand, so drawing does not resize it. */
export function mobileRackLayout(draft:Draft,maxWidth:number,compact=false,center=false){
 const gap=4,rowGap=8,maxHeight=compact?42:58,commas=new Set(draft.commaAfterTileIds);
 const rows=Array.from({length:Math.ceil(draft.orderedTileIds.length/7)},(_,i)=>draft.orderedTileIds.slice(i*7,i*7+7));
 const punctuation=Math.max(0,...rows.map((row,i)=>row.filter(id=>commas.has(id)).length+(i===rows.length-1?1:0)));
 const tileWidth=Math.min(48,Math.max(1,(maxWidth-gap*(6+punctuation))/(7+punctuation*COMMA_WIDTH_RATIO)));
 const height=Math.min(maxHeight,tileWidth/.7);
 const items:RackItem[]=[];let width=0;
 rows.forEach((ids,row)=>{const line=rackLayout({orderedTileIds:ids,commaAfterTileIds:draft.commaAfterTileIds},tileWidth,height,gap,Infinity,10,row===rows.length-1);
  const budget=line.width+(7-ids.length)*(tileWidth+gap),offset=center?Math.max(0,(maxWidth-budget)/2):0;
  for(const item of line.items)items.push({...item,row,x:item.x+offset,y:row*(height+rowGap)});width=Math.max(width,line.width);
 });
 return{items,width,height:rows.length?rows.length*height+(rows.length-1)*rowGap:0,tileWidth,reserve:2*maxHeight+rowGap};
}
/** Moving a character leaves punctuation at its old gap, rather than carrying it. */
export function movePreview(draft:Draft,tileId:TileId,index:number):Draft{
 const order=[...draft.orderedTileIds],from=order.indexOf(tileId);if(from<0)return draft;
 const to=Math.max(0,Math.min(index,order.length-1));if(from===to)return draft;
 order.splice(from,1);order.splice(to,0,tileId);
 const commas=draft.commaAfterTileIds.map(id=>id===tileId?draft.orderedTileIds[from-1]:id);
 return{orderedTileIds:order,commaAfterTileIds:[...new Set(commas)].filter((id):id is TileId=>!!id&&id!==order.at(-1)) as unknown as Draft['commaAfterTileIds']};
}
/** null target returns a comma to the period; invalid anchors leave the draft unchanged. */
export function commaPreview(draft:Draft,from:TileId|null,to:TileId|null):Draft{if(to&&(to===draft.orderedTileIds.at(-1)||!draft.orderedTileIds.includes(to)||to!==from&&Array.from(draft.commaAfterTileIds).includes(to)))return draft;const commas=draft.commaAfterTileIds.filter(id=>id!==from);if(to){if(commas.length>=3)return draft;commas.push(to);}return{orderedTileIds:[...draft.orderedTileIds],commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']};}
export type RackRect={tileId:TileId;left:number;top:number;width:number;height:number};
export type RackTargetRect=RackRect&{kind:'tile'|'comma'|'period'};
export type RackInsertion={tileId:TileId;kind:RackTargetRect['kind'];after:boolean};
/** Freeze all visual slots at pickup, choose the row first, then either half of a tile.
 * Keep the previous side near its midpoint so small finger movements do not flip the preview. */
export function rackInsertion(rects:readonly RackTargetRect[],x:number,y:number,previous:RackInsertion|null=null):RackInsertion|null{
 if(!rects.length)return null;
 const row=rects.reduce((a,b)=>Math.abs(y-b.top-b.height/2)<Math.abs(y-a.top-a.height/2)?b:a);
 const line=rects.filter(r=>Math.abs(r.top+r.height/2-row.top-row.height/2)<Math.min(r.height,row.height)/2);
 if(!line.some(r=>insideRect(r,x,y,28)))return null;
 const target=line.reduce((a,b)=>Math.abs(x-b.left-b.width/2)<Math.abs(x-a.left-a.width/2)?b:a),dx=x-target.left-target.width/2;
 const after=target.kind!=='period'&&(previous?.tileId===target.tileId&&previous.kind===target.kind&&Math.abs(dx)<Math.min(6,target.width*.15)?previous.after:dx>=0);
 return{tileId:target.tileId,kind:target.kind,after};
}
/** Insert among visual tokens, so the two sides of a comma remain distinct gaps. */
export function insertTilePreview(draft:Draft,tileId:TileId,target:RackInsertion):Draft{
 const placed=new Set(draft.commaAfterTileIds),tokens=draft.orderedTileIds.flatMap(id=>[{kind:'tile' as const,tileId:id},...(placed.has(id)?[{kind:'comma' as const,tileId:id}]:[])]);
 const from=tokens.findIndex(t=>t.kind==='tile'&&t.tileId===tileId);
 let at=target.kind==='period'?tokens.length:tokens.findIndex(t=>t.kind===target.kind&&t.tileId===target.tileId);
 if(from<0||at<0)return draft;
 if(target.after&&target.kind!=='period')at++;
 const [held]=tokens.splice(from,1);tokens.splice(at-(from<at?1:0),0,held);
 const order=tokens.filter(t=>t.kind==='tile').map(t=>t.tileId),commas:TileId[]=[];let anchor:TileId|null=null;
 for(const token of tokens)if(token.kind==='tile')anchor=token.tileId;else if(anchor&&anchor!==order.at(-1)&&!commas.includes(anchor))commas.push(anchor);
 if(order.every((id,i)=>id===draft.orderedTileIds[i])&&commas.length===placed.size&&commas.every(id=>placed.has(id)))return draft;
 return{orderedTileIds:order,commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']};
}
/** Choose a stable slot by row then horizontal center, never by animated DOM hit testing. */
export function nearestSlot(rects:readonly RackRect[],x:number,y:number){let result:RackRect|undefined,distance=Infinity;for(const r of rects){const dx=x-r.left-r.width/2,dy=y-r.top-r.height/2,d=Math.abs(dy)*4+Math.abs(dx);if(d<distance){distance=d;result=r;}}return result?.tileId??null;}

/** Only explicit nearby rack targets may reorder; dragging across the table must not shuffle cards. */
export function insideRect(r:{left:number;top:number;width:number;height:number}|null|undefined,x:number,y:number,pad=0){return !!r&&x>=r.left-pad&&x<=r.left+r.width+pad&&y>=r.top-pad&&y<=r.top+r.height+pad;}
export function nearRackSlot(rects:readonly RackRect[],x:number,y:number){return rects.some(r=>insideRect(r,x,y,28))?nearestSlot(rects,x,y):null;}

/** At most two rows. Stable hands choose rows from fourteen characters plus the period,
 * independently of commas; tighten gaps then compress tile bodies within .6–.7 aspect.
 * Keep the same row-height budget while editing punctuation and drawing/discarding. */
export function adaptiveRackLayout(draft:Draft,maxWidth:number,maxHeight=Infinity,maxTileHeight=76,minTileWidth=46,gap=6,rowGap=8,center:boolean|'stable'=false,reference:Draft=draft){
 const stable=center==='stable',punctuation=stable?new Set(reference.commaAfterTileIds).size+1:4,baseMarks=stable?1:punctuation;
 const one=Math.max(1,Math.min(maxTileHeight*.7,(maxWidth-gap*(13+baseMarks))/(14+baseMarks*COMMA_WIDTH_RATIO),maxHeight*.7));
 const two=Math.max(1,Math.min(maxTileHeight*.7,(maxWidth-gap*(6+baseMarks))/(7+baseMarks*COMMA_WIDTH_RATIO),(maxHeight-rowGap)/2*.7));
 const rows=draft.orderedTileIds.length?one<minTileWidth*(stable ? .9 : 1)&&two>one?2:1:0,baseWidth=rows===2?two:one,slots=(rows===2?7:14)+punctuation;
 const actualGap=stable?Math.max(Math.min(2,gap),Math.min(gap,(maxWidth-slots*baseWidth)/(slots-1))):gap;
 const tileWidth=stable?Math.max(1,Math.min(baseWidth,(maxWidth-actualGap*(slots-1))/slots)):baseWidth;
 const tileHeight=stable?Math.min(baseWidth/.7,tileWidth/.6):tileWidth/.7,rowHeight=stable?baseWidth/.7:tileHeight;
 const groups=rows===2?[draft.orderedTileIds.slice(0,7),draft.orderedTileIds.slice(7)]:[draft.orderedTileIds];
 const items:RackItem[]=[];let width=0;
 groups.filter(ids=>ids.length).forEach((ids,row)=>{const line=rackLayout({orderedTileIds:ids,commaAfterTileIds:draft.commaAfterTileIds},tileWidth,tileHeight,actualGap,Infinity,rowGap,row===groups.length-1);
  // Hand rows keep a fourteen/seven-character reference while HU sentences may center their actual content.
  const referenceIds=rows===2?reference.orderedTileIds.slice(row*7,row*7+7):reference.orderedTileIds,marks=referenceIds.filter(id=>Array.from(reference.commaAfterTileIds).includes(id)).length+(row===groups.length-1?1:0),capacity=(rows===2?7:14)+marks;
  const budget=stable?capacity*tileWidth+(capacity-1)*actualGap:line.width,offset=center?Math.max(0,(maxWidth-budget)/2):0;
  for(const item of line.items)items.push({...item,row,x:item.x+offset,y:row*(rowHeight+rowGap)});width=Math.max(width,line.width);
 });
 return{items,width,height:rows?rows*rowHeight+(rows-1)*rowGap:0,tileWidth,tileHeight,rows,gap:actualGap,reserve:rows?rows*(stable?rowHeight:maxTileHeight)+(rows-1)*rowGap:0};
}
