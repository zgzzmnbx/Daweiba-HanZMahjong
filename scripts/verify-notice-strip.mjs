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
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',ignoreDefaultArgs:['--hide-scrollbars'],headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=process.env.EVIDENCE_PREFIX??`${local?'':'public-'}notice-strip-${applicationVersion}`;
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
 rooms.push(ps);if(!local){await writeFile(`Codex-Temp/${prefix}-room.txt`,room);for(const [i,p]of ps.entries())await p.context.storageState({path:`Codex-Temp/${prefix}-${i}-identity.json`});}for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function closeDialog(p){await p.page.waitForTimeout(100);const button=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await button.isVisible())await button.click();}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}await wait(async()=> (await snapshot(ps[0])).public.phase.kind!=='HU_VOTE');for(const p of ps)if(!p.page.isClosed())await closeDialog(p);const currentHost=(await snapshot(ps[0])).public.hostId;const host=ps.find(p=>p.id===currentHost)??ps[0];for(const p of ps.filter(p=>p!==host))if(!p.page.isClosed())await p.page.close();if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
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

try{
 const ps=await setup([{},{}]);
 for(const [width,height]of [[1280,720],[1024,600],[390,844],[320,480],[667,375]]){
  for(const p of ps){await p.page.setViewportSize({width,height});await p.page.waitForTimeout(150);assert.equal(await p.page.locator('.table-notices').count(),0);assert(await p.page.locator('.turn-hud-row .turn-hud').isVisible());}
  await startSampling(ps);await discardAndPass(ps);await stopSampling(ps,`no top strip, real draw/discard keeps table stable at ${width}x${height}`);
  if([1280,390].includes(width))await ps[0].page.screenshot({path:`docs/evidence/${prefix}-${width}.png`});
 }
 const actor=ps[0];await startSampling(ps);await (await gameTool(actor.page,'主动 AI 托管')).click();await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay===true);assert.equal(await actor.page.locator('.table-notices').count(),0);await (await gameTool(actor.page,'取消托管')).click();await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay===false);await stopSampling(ps,'autoplay toggle works without top strip or geometry shifts');
 if(local){clock+=120001;await server.tick();await wait(async()=> (await snapshot(actor)).public.lastAutomaticDiscard?.reason==='TIMEOUT');assert.equal(await actor.page.locator('.table-notices').count(),0);pass('authoritative timeout no longer creates clipped scrolling notice');}
 await actor.context.setOffline(true);await wait(async()=> (await actor.page.locator('.turn-hud-row .turn-hint').innerText()).includes('重连'));assert.equal(await actor.page.locator('.table-notices').count(),0);await actor.context.setOffline(false);await wait(async()=> !(await actor.page.locator('.turn-hud-row .turn-hint').innerText()).includes('重连'));pass('network loss and reconnect remain visible in existing turn HUD');
 await closeRoom(ps);pass('test room closed without scoring');assert.deepEqual(errors,[]);
 await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version:applicationVersion,origin:base,browser:browser.version(),checks,errors,scope:'real private room, two clients; mobile Chromium viewport simulation'},null,2)+'\n');
}finally{for(const ps of rooms){try{if(!ps[0].page.isClosed())await closeRoom(ps);}catch(e){console.error('Cleanup',e.message);}}for(const context of contexts)await context.close();await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
