/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3138',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
const clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3138);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=`${local?'':'public-'}seat-badges-live-${applicationVersion}`;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<100;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function member(nickname,viewport={width:1440,height:900},reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return {context,page,nickname};
}
async function setup(options=[{},{}]){
 const ps=[];for(let i=0;i<options.length;i++)ps.push(await member(`头像验收${i+1}`,options[i].viewport,options[i].reducedMotion));
 const created=await ps[0].context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:ps.length,nickname:ps[0].nickname}});assert(created.ok());const r=await created.json();const room=r.snapshot.public.roomId;
 for(const [i,p] of ps.entries()){p.room=room;if(i){const joined=await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:p.nickname}});assert(joined.ok());}await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snapshot(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function closeDialog(p){await p.page.waitForTimeout(100);const button=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await button.isVisible())await button.click();}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}await wait(async()=> (await snapshot(ps[0])).public.phase.kind!=='HU_VOTE');for(const p of ps)if(!p.page.isClosed())await closeDialog(p);for(const p of ps.slice(1))await p.page.close();const host=ps[0];if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
try{
 const ps=await setup([{}, {}, {viewport:{width:390,height:844}}, {viewport:{width:667,height:375}}]);
 for(const p of ps){
  await p.page.locator('.player-badge').nth(2).waitFor();
  const expected=ps.filter(other=>other!==p).map(other=>other.nickname).sort();
  assert.deepEqual((await p.page.locator('.player-nameplate strong').allTextContents()).sort(),expected);
  const geometry=await p.page.locator('.player-badge').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),a=e.querySelector('.player-portrait').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,portrait:a.width};}));
  assert(geometry.every(r=>r.portrait>=30&&r.x>=0&&r.y>=0));
 }
 pass('four independent live players see correct opponent names and visible circle avatars on desktop, portrait and landscape');
 const first=await snapshot(ps[0]),actor=ps.find(p=>p.id===first.public.phase.actorId),tile=(await snapshot(actor)).private.hand[0].tileId;
 await actor.page.locator(`[data-tile-id="${tile}"]`).click();await actor.page.getByRole('button',{name:'出这张',exact:true}).click();
 await wait(async()=> (await snapshot(actor)).public.phase.kind==='DISCARD_RESPONSE');
 pass('actual tile and discard button remain clickable through transparent avatar layer');
 await ps[0].page.screenshot({path:`docs/evidence/${prefix}-desktop.png`});
 await ps[2].page.screenshot({path:`docs/evidence/${prefix}-portrait.png`});
 await ps[3].page.reload();await ps[3].page.locator('.player-badge').nth(2).waitFor();
 assert.deepEqual((await ps[3].page.locator('.player-nameplate strong').allTextContents()).sort(),ps.slice(0,3).map(p=>p.nickname).sort());
 pass('reload restores authoritative names and avatar placement');
 await closeRoom(ps);pass('own verification room closed without scoring');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'real independent Chrome identities, HTTP/Socket.IO and SQLite',checks,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
