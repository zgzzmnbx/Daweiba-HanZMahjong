import test from 'node:test';import assert from 'node:assert/strict';import {COMMA_WIDTH_RATIO,rackLayout,mobileRackLayout,adaptiveRackLayout,movePreview,commaPreview,nearestSlot,nearRackSlot,insideRect} from '../../apps/web/src/table-ui/rack-layout';import type {Draft,TileId} from '../../packages/contracts/types';
const ids=Array.from({length:14},(_,i)=>`id-${i}` as TileId);const draft:Draft={orderedTileIds:ids,commaAfterTileIds:[ids[2],ids[6],ids[10]]};
test('drag preview moves only the character and leaves its comma at the old gap',()=>{const original=structuredClone(draft);const moved=movePreview(draft,ids[2],9);assert.equal(moved.orderedTileIds[9],ids[2]);assert.equal(new Set(moved.orderedTileIds).size,14);assert.deepEqual(moved.commaAfterTileIds,[ids[1],ids[6],ids[10]]);assert.deepEqual(draft,original);assert.ok(!Array.from(movePreview(draft,ids[2],13).commaAfterTileIds).includes(ids[2]));});
test('wider punctuation occupies disjoint slots and always shares its anchor row at 390/430',()=>{for(const [width,tile]of [[356,44],[396,48]]){const l=rackLayout(draft,tile,58,8,width);assert.equal(l.items.length,17);assert.ok(l.width<=width);for(const a of l.items){assert.ok(a.x>=0&&a.x+a.width<=width+.01);if(a.kind==='comma'){const anchor=l.items.find(b=>b.key===`tile:${a.tileId}`)!;assert.equal(a.width,anchor.width*COMMA_WIDTH_RATIO);assert.equal(a.row,anchor.row);assert.ok(a.x>=anchor.x+anchor.width);}}for(const a of l.items)for(const b of l.items)if(a!==b&&a.row===b.row)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x);}});
test('desktop 3D rack budget includes three independent commas and no fixed 14-slot overlap',()=>{const l=rackLayout(draft,12,18,.5);assert.ok(Math.abs(l.width-201.2)<.001);assert.equal(l.height,18);assert.equal(l.items.filter(i=>i.kind==='tile').length,14);});
test('comma moving, returning, duplicate/last anchors and three-comma cap are atomic previews',()=>{const original=structuredClone(draft),moved=commaPreview(draft,ids[2],ids[4]);assert.ok(Array.from(moved.commaAfterTileIds).includes(ids[4])&&!Array.from(moved.commaAfterTileIds).includes(ids[2]));assert.equal(commaPreview(draft,ids[2],null).commaAfterTileIds.length,2);assert.equal(commaPreview(draft,null,ids[4]),draft);assert.equal(commaPreview(draft,ids[2],ids[6]),draft);assert.equal(commaPreview(draft,ids[2],ids[13]),draft);assert.deepEqual(draft,original);});
test('drag targets remain stable across rows without sampling moving hit elements',()=>{const rs=[{tileId:ids[0],left:0,top:0,width:44,height:58},{tileId:ids[1],left:52,top:0,width:44,height:58},{tileId:ids[2],left:0,top:68,width:44,height:58}];assert.equal(nearestSlot(rs,75,29),ids[1]);assert.equal(nearestSlot(rs,20,95),ids[2]);assert.equal(nearestSlot([],0,0),null);});

test('discard target and rack target are distinct: table-center and off-table drags never reorder the hand',()=>{const rs=[{tileId:ids[0],left:100,top:500,width:44,height:58},{tileId:ids[1],left:152,top:500,width:44,height:58}];const center={left:200,top:200,width:160,height:100};assert.equal(nearRackSlot(rs,175,520),ids[1]);assert.equal(nearRackSlot(rs,250,250),null);assert.equal(insideRect(center,250,250),true);assert.equal(insideRect(center,175,520),false);assert.equal(nearRackSlot(rs,900,700),null);assert.equal(insideRect(null,250,250),false);});

test('mobile 14 tiles always form 7+7, including every placement of up to three commas',()=>{
 const cases:TileId[][]=[[]];for(let a=0;a<13;a++){cases.push([ids[a]]);for(let b=a+1;b<13;b++){cases.push([ids[a],ids[b]]);for(let c=b+1;c<13;c++)cases.push([ids[a],ids[b],ids[c]]);}}
 for(const width of [284,300,340,370,410,647])for(const compact of [false,true])for(const commaAfterTileIds of cases){
  const l=mobileRackLayout({orderedTileIds:ids,commaAfterTileIds:commaAfterTileIds as unknown as Draft['commaAfterTileIds']},width,compact);
  assert.deepEqual([0,1].map(row=>l.items.filter(i=>i.kind==='tile'&&i.row===row).length),[7,7]);assert(l.height<=l.reserve);assert.ok(l.width<=width+.01);assert(l.items.filter(i=>i.kind==='tile').every(i=>i.width/i.height>=.7-1e-9));assert.equal(l.items.filter(i=>i.kind==='period').length,1);assert.equal(l.items.at(-1)!.kind,'period');assert.equal(l.items.at(-1)!.tileId,ids[13]);assert.equal(l.items.at(-1)!.row,1);
  for(const item of l.items){assert.ok(item.x>=0&&item.x+item.width<=width+.01);if(item.kind==='comma')assert.equal(item.row,l.items.find(i=>i.kind==='tile'&&i.tileId===item.tileId)!.row);}
  for(const row of [0,1]){const items=l.items.filter(i=>i.row===row);for(let i=1;i<items.length;i++)assert.ok(items[i].x>=items[i-1].x+items[i-1].width);}
 }
});
test('drawing the fourteenth tile preserves mobile row and tile sizing',()=>{for(const width of [300,370,410]){const a=mobileRackLayout({...draft,orderedTileIds:ids.slice(0,13)},width),b=mobileRackLayout(draft,width);assert.equal(a.tileWidth,b.tileWidth);assert.equal(a.height,b.height);assert.deepEqual(a.items.filter(i=>i.kind!=='period'),b.items.filter(i=>i.kind!=='period').slice(0,-1));assert.equal(a.items.at(-1)!.tileId,ids[12]);assert.equal(b.items.at(-1)!.tileId,ids[13]);}});

test('first and adjacent comma gaps return only the unsupported comma to the tray; no-op leaves them intact',()=>{
 const d:Draft={orderedTileIds:ids,commaAfterTileIds:[ids[0],ids[1],ids[6]]};
 assert.equal(movePreview(d,ids[0],0),d);assert.deepEqual(movePreview(d,ids[0],5).commaAfterTileIds,[ids[1],ids[6]]);
 assert.deepEqual(movePreview(d,ids[1],9).commaAfterTileIds,[ids[0],ids[6]]);
 assert.deepEqual(movePreview(d,ids[6],13).commaAfterTileIds,[ids[0],ids[1],ids[5]]);
});
test('the end marker is one narrow final slot, never a character or a comma in the saved draft',()=>{
 for(const order of [ids.slice(0,13),ids,movePreview(draft,ids[13],0).orderedTileIds]){
  const d={...draft,orderedTileIds:order},original=structuredClone(d),l=rackLayout(d,12,18,.5,Infinity,10,true),end=l.items.at(-1)!;
  assert.equal(l.items.filter(i=>i.kind==='tile').length,order.length);assert.equal(l.items.filter(i=>i.kind==='period').length,1);assert.equal(end.kind,'period');assert.equal(end.tileId,order.at(-1));assert.equal(end.width,12*COMMA_WIDTH_RATIO);assert.deepEqual(d,original);
 }
 assert.equal(rackLayout({orderedTileIds:[],commaAfterTileIds:[]},12,18,.5,Infinity,10,true).items.length,0);
});

test('adaptive sentence has only one or two rows, correct tile aspect and real punctuation widths',()=>{
 for(const width of [210,284,370,500,700,926,1060])for(const height of [50,90,160,400])for(const commas of [[],[ids[0]],[ids[0],ids[6],ids[12]],[ids[7],ids[9],ids[11]]]){
  const d={orderedTileIds:ids,commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']},l=adaptiveRackLayout(d,width,height,110,48,3,8,true);
  assert(l.rows===1||l.rows===2);assert.equal(l.items.filter(i=>i.kind==='tile').length,14);assert(l.height<=height+.01);
  for(const i of l.items){assert(i.x>=-.01&&i.x+i.width<=width+.01);assert(i.y>=0&&i.y+i.height<=height+.01);assert(Math.abs(i.width/i.height-(i.kind==='tile'?.7:.49))<1e-9);}
  for(const row of [0,1]){const items=l.items.filter(i=>i.row===row);for(let i=1;i<items.length;i++)assert(items[i].x>=items[i-1].x+items[i-1].width);}
 }
});
test('wide arranging switches before becoming thin; short HU chooses the more readable of two bounded layouts',()=>{
 assert.equal(adaptiveRackLayout(draft,700).rows,2);assert.equal(adaptiveRackLayout(draft,1060).rows,1);
 assert.equal(adaptiveRackLayout(draft,450,130,110,48,3).rows,2);assert.equal(adaptiveRackLayout(draft,450,35,110,48,3).rows,1);
 for(const width of [500,700,926,1060])for(const commas of [[],[ids[0],ids[6],ids[11]]]){
  const d={...draft,commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']},a=adaptiveRackLayout({...d,orderedTileIds:ids.slice(0,13)},width),b=adaptiveRackLayout(d,width);
  assert.equal(a.rows,b.rows);assert.equal(a.reserve,b.reserve);assert.equal(a.tileWidth,b.tileWidth);assert.equal(a.tileHeight,b.tileHeight);
 }
});
