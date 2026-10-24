/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'https://118.196.107.182:1240',local=false;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
const clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3135);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=`${local?'':'public-'}browser-return-live-${applicationVersion}`;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<120;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,250));}throw Error('state wait timed out');};
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function member(nickname,viewport={width:1440,height:900},reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return {context,page,nickname};
}
async function setup(options=[{},{}]){
 const ps=[];for(let i=0;i<options.length;i++)ps.push(await member(`原浏览器回归${i+1}`,options[i].viewport,options[i].reducedMotion));
 const created=await ps[0].context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:ps.length,nickname:ps[0].nickname}});assert(created.ok());const r=await created.json();const room=r.snapshot.public.roomId;
 for(const [i,p] of ps.entries()){p.room=room;if(i){const joined=await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:p.nickname}});assert(joined.ok());}await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snapshot(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
try{
 const ps=await setup([{}, {viewport:{width:390,height:844}}]),first=await snapshot(ps[0]),missing=ps.find(p=>p.id!==first.public.phase.actorId),friend=ps.find(p=>p!==missing),saved=await snapshot(missing);
 await missing.page.getByRole('button',{name:'离开牌桌',exact:true}).click();await missing.page.getByRole('heading',{name:'游戏大厅',exact:true}).waitFor();
 const started=Date.now();await wait(async()=> (await snapshot(friend)).public.players.find(p=>p.playerId===missing.id).presence==='BOT');assert(Date.now()-started>=14000);
 const other=await browser.newContext({extraHTTPHeaders:{Origin:base}});contexts.push(other);const page=await other.newPage();await page.goto(`${base}/room/${missing.room}`);await page.locator('.return-seat').first().waitFor();assert.equal(await page.locator('.return-seat:not([disabled])').count(),0);
 const forged=await other.request.post(`${base}/api/rooms/${missing.room}/restore`,{data:{roomId:missing.room,actionId:randomUUID(),nickname:missing.nickname,seat:saved.private.seat,proof:{kind:'BROWSER'}}});assert.equal(forged.status(),403);pass('public browser without room credential cannot claim a matching nickname or managed seat');
 await missing.page.reload();await missing.page.getByRole('navigation',{name:'我的座位',exact:true}).getByRole('button',{name:new RegExp(missing.nickname)}).click();const returnButton=missing.page.getByRole('button',{name:new RegExp(`^接管 ${missing.nickname}`)});await returnButton.waitFor();
 assert.equal(await missing.page.getByRole('textbox',{name:'私密恢复码'}).count(),0);await missing.page.screenshot({path:`docs/evidence/${prefix}-seat.png`});await returnButton.click();await missing.page.locator('.game-shell').waitFor();
 const restored=await snapshot(missing);assert.equal(restored.private.playerId,saved.private.playerId);assert.deepEqual(restored.private.hand,saved.private.hand);assert.deepEqual(restored.private.draft,saved.private.draft);assert(restored.private.controlEpoch>saved.private.controlEpoch);assert.equal(restored.public.players.find(p=>p.playerId===missing.id).presence,'HUMAN');pass('real fifteen-second dropout + lobby My Seats + one click restores exact original player, hand and draft');
 const cookies=await missing.context.cookies(`${base}/api/rooms/${missing.room}/seats`),proof=cookies.find(c=>c.name==='hanz_mahjong_return_v1');assert(proof.httpOnly&&proof.secure&&proof.sameSite==='Lax');assert.equal(proof.path,`/api/rooms/${missing.room}`);pass('public identity cookie is Secure, HttpOnly, SameSite and scoped to its own room');
 let owner=ps.find(p=>p.id===restored.public.hostId);assert(owner);for(const p of ps)if(p!==owner)await p.page.close();await wait(async()=> (await snapshot(owner)).legalActions.includes('END_UNSCORED'));await (await gameTool(owner.page,'结束本局（不计分）')).click();await owner.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(owner)).public.phase.kind==='ROUND_FINISHED');await (await gameTool(owner.page,'关闭房间')).click();await owner.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=> (await snapshot(owner)).public.phase.kind==='ROOM_CLOSED');pass('only the script-owned verification room was closed without scoring');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'real production HTTPS/WSS/SQLite, independent Chrome browsers and actual elapsed grace time; no server clock mutation',checks,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
