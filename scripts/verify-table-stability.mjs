/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3151',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
let clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3151);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=process.env.EVIDENCE_PREFIX??`${local?'':'public-'}table-stability-${applicationVersion}`;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<100;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function member(nickname,viewport={width:1440,height:900},reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return {context,page,nickname};
}
async function setup(options=[{},{}]){
 const ps=[];for(let i=0;i<options.length;i++)ps.push(await member(`稳定桌面验收${i+1}`,options[i].viewport,options[i].reducedMotion));
 const created=await ps[0].context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:ps.length,nickname:ps[0].nickname}});assert(created.ok());const r=await created.json();const room=r.snapshot.public.roomId;
 for(const [i,p] of ps.entries()){p.room=room;if(i){const joined=await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:p.nickname}});assert(joined.ok());}await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snapshot(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function closeDialog(p){await p.page.waitForTimeout(100);const button=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await button.isVisible())await button.click();}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}await wait(async()=> (await snapshot(ps[0])).public.phase.kind!=='HU_VOTE');for(const p of ps)if(!p.page.isClosed())await closeDialog(p);for(const p of ps.slice(1))await p.page.close();const host=ps[0];if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
async function measure(p){return p.page.evaluate(()=>{const r=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;};return {stage:r('.table-stage'),table:r('.viewport'),rack:r('.rack-area.expanded'),rail:document.querySelector('.player-badges')?.dataset.rail,phase:document.querySelector('.game-shell')?.dataset.phase};});}
async function startSampling(ps){for(const p of ps)await p.page.evaluate(()=>{
 window.__samples=[];window.__sampling=true;const canvas=document.querySelector('.canvas-host canvas');
 const sample=()=>{if(!window.__sampling)return;const el=document.querySelector('.viewport'),s=document.querySelector('.table-stage'),r=el.getBoundingClientRect(),b=s.getBoundingClientRect();window.__samples.push({x:r.x,y:r.y,width:r.width,height:r.height,stage:b.height,stageY:b.y,pending:!!document.querySelector('.action-bar button'),sameCanvas:canvas===document.querySelector('.canvas-host canvas'),phase:document.querySelector('.game-shell').dataset.phase});requestAnimationFrame(sample);};sample();
 });}
async function stopSampling(ps,name){
 const samples=await Promise.all(ps.map(p=>p.page.evaluate(()=>{window.__sampling=false;return window.__samples;})));
 const stats=samples.map(rows=>Object.fromEntries(['width','height','x','y','stage','stageY'].map(k=>[k,{min:Math.min(...rows.map(r=>r[k])),max:Math.max(...rows.map(r=>r[k]))}])));
 for(const r of stats)for(const [key,value]of Object.entries(r))assert(value.max-value.min<=.1,`${name}: ${key} moved ${JSON.stringify(value)}`);
 for(const rows of samples){assert(rows.length>0);assert(rows.every(r=>r.sameCanvas),'canvas remounted during play');}
 for(const p of ps){const bounds=await p.page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,scrollY}));assert(bounds.sw<=bounds.w+1&&bounds.sh<=bounds.h+1&&bounds.scrollY===0);}
 pass(name,{stats,frames:samples.map(rows=>rows.length),pendingFrames:samples.map(rows=>rows.filter(r=>r.pending).length),phases:samples.map(rows=>[...new Set(rows.map(r=>r.phase))])});
}
async function discardAndPass(ps){
 const first=await snapshot(ps[0]),acting=ps.find(p=>p.id===first.public.phase.actorId);assert(acting);const id=(await snapshot(acting)).private.hand[0].tileId;
 await acting.page.locator(`[data-tile-id="${id}"]`).click();await acting.page.getByRole('button',{name:'出这张',exact:true}).click();await wait(async()=> (await snapshot(acting)).public.phase.kind==='DISCARD_RESPONSE');
 for(const other of ps.filter(p=>p!==acting)){await other.page.getByRole('button',{name:/^(摸|过)$/}).click();await wait(async()=>{const s=await snapshot(other);return s.private.ownResponse==='PASS'||s.public.phase.kind==='TURN_ACTION';});}
 await wait(async()=> (await snapshot(acting)).public.phase.kind==='TURN_ACTION');await acting.page.waitForTimeout(220);
}
async function punctuation(p){
 const s=await snapshot(p),ids=s.private.draft.orderedTileIds;
 for(const i of [1,6,10]){
  await p.page.locator(`[data-tile-id="${ids[i]}"]`).click();await (await gameTool(p.page,'放 / 收逗号')).click();await p.page.getByRole('button',{name:'关闭面板',exact:true}).click();
  await wait(async()=> (await snapshot(p)).private.draft.commaAfterTileIds.length===([1,6,10].indexOf(i)+1));
 }
 const last=p.page.locator(`[data-tile-id="${ids.at(-1)}"]`);await last.click();await p.page.keyboard.press('ArrowLeft');await p.page.waitForTimeout(650);
 while(await p.page.locator('.sentence-rack .comma-tile').count()){await p.page.locator('.sentence-rack .comma-tile').first().focus();await p.page.keyboard.press('Delete');}await wait(async()=> (await snapshot(p)).private.draft.commaAfterTileIds.length===0);
}
try{
 const ps=await setup([{},{}]);
 for(const size of [[1440,900],[1280,720],[1024,600],[800,600],[390,844],[320,568],[844,390],[667,375],[320,480]]){
  for(const p of ps){await p.page.setViewportSize({width:size[0],height:size[1]});await p.page.waitForTimeout(250);}
  await startSampling(ps);for(let i=0;i<4;i++)await discardAndPass(ps);await stopSampling(ps,`four real draw/discard cycles at ${size.join('x')}`);
  if(size[0]<500){await startSampling(ps);await punctuation(ps[0]);await stopSampling(ps,`three commas, wrap, last-tile focus and keyboard reorder at ${size.join('x')}`);}
  if(size[0]===1280||size[0]===390||size[0]===320&&size[1]===480)await ps[0].page.screenshot({path:`docs/evidence/${prefix}-${size.join('x')}.png`});
 }
 // Automatic DOM composition/review must not change the 3D table frame.
 for(const p of ps){await p.page.setViewportSize({width:1280,height:720});await p.page.waitForTimeout(250);}
 await startSampling(ps);
 const current=await snapshot(ps[0]),actor=ps.find(p=>p.id===current.public.phase.actorId),peer=ps.find(p=>p!==actor);
 await actor.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await actor.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await wait(async()=> (await snapshot(actor)).public.phase.kind==='HU_VOTE');
 const skip=peer.page.getByRole('button',{name:'跳过亮相，直接评审',exact:true});if(await skip.isVisible())await skip.click();await peer.page.getByRole('button',{name:'写的什么玩意',exact:true}).click();await wait(async()=> (await snapshot(actor)).public.phase.kind==='TURN_ACTION');for(const p of ps)await closeDialog(p);
 await stopSampling(ps,'self HU, automatic DOM rack, review and rejected return');
 await startSampling(ps);
 const returned=await snapshot(ps[0]),discarder=ps.find(p=>p.id===returned.public.phase.actorId),borrower=ps.find(p=>p!==discarder),tile=(await snapshot(discarder)).private.hand[0].tileId;
 await discarder.page.locator(`[data-tile-id="${tile}"]`).click();await discarder.page.getByRole('button',{name:'出这张',exact:true}).click();await borrower.page.getByRole('button',{name:'借字申请胡',exact:true}).click();await wait(async()=> (await snapshot(borrower)).public.phase.kind==='HU_COMPOSE');await borrower.page.getByRole('button',{name:'放弃借字',exact:true}).click();await wait(async()=> (await snapshot(borrower)).public.phase.kind==='TURN_ACTION');await borrower.page.waitForTimeout(250);
 await stopSampling(ps,'borrowed 13+1 composition and withdrawal keep the table frame');

 await startSampling(ps);await (await gameTool(actor.page,'主动 AI 托管')).click();await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay===true);await (await gameTool(actor.page,'取消托管')).click();await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay===false);await stopSampling(ps,'autoplay notice appears and disappears without moving table');
 if(local){await startSampling(ps);clock+=120001;await server.tick();await wait(async()=> (await snapshot(actor)).public.lastAutomaticDiscard?.reason==='TIMEOUT');await actor.page.waitForTimeout(250);await stopSampling(ps,'authoritative timeout notice does not resize table');}
 await closeRoom(ps);
 if(local)for(const capacity of [3,4,5,6]){
  const members=await setup(Array.from({length:capacity},()=>({viewport:{width:capacity%2?1280:390,height:capacity%2?720:844}})));
  await members[0].page.waitForTimeout(300);await startSampling(members);for(let i=0;i<capacity;i++)await discardAndPass(members);await stopSampling(members,`${capacity} real players complete a full turn around the table`);await closeRoom(members);
 }
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:local?'real Chrome / HTTP / Socket.IO / isolated SQLite; fixed clock advanced only for timeout':'public Chrome / HTTP / Socket.IO; real clock; own private room closed without scoring',checks,errors},null,2)+'\n');
}catch(e){const p=contexts.flatMap(c=>c.pages()).find(p=>!p.isClosed());if(p)await p.screenshot({path:'Codex-Temp/table-stability-failure.png'});await writeFile('Codex-Temp/table-stability-failure.json',JSON.stringify({error:String(e),checks,errors},null,2));throw e;
}finally{for(const context of contexts)await context.close();await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
