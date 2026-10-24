import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const local=!process.env.PUBLIC_ORIGIN,base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3161';
const version=JSON.parse(await readFile('package.json','utf8')).version,prefix=`${local?'':'public-'}ai-speed-${version}`;
await mkdir('Codex-Temp',{recursive:true});await mkdir('docs/evidence',{recursive:true});
const dir=await mkdtemp(resolve('Codex-Temp/ai-speed-'));
const server=local?createGameServer({dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3161);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],checks=[],errors=[];
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async fn=>{for(let i=0;i<160;i++){const v=await fn();if(v)return v;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function setup(bots=false){const ps=[];for(let i=0;i<(bots?1:2);i++){const context=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));ps.push({context,page});}
 const r=await ps[0].context.request.post(base+'/api/rooms',{data:{actionId:randomUUID(),capacity:2,nickname:'三秒验收甲'}});assert(r.ok());const room=(await r.json()).snapshot.public.roomId;
 for(const [i,p]of ps.entries()){p.room=room;if(i)assert((await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:'三秒验收乙'}})).ok());await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snap(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}
 await wait(async()=>await ps[0].page.locator('.room-setup-panel .seat-row').filter({hasText:'真人 · 已准备'}).count()===ps.length);
 if(bots){await ps[0].page.getByRole('button',{name:'将座位 2 设为 AI',exact:true}).click();await ps[0].page.getByRole('button',{name:'移除座位 2 的 AI，留给朋友',exact:true}).waitFor();}
 const before=Date.now();await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(ps[0])).public.phase.kind==='TURN_ACTION');return{ps,before};
}
async function discard(p){const e=await snap(p);await p.page.locator(`[data-tile-id="${e.private.hand[0].tileId}"]`).click();const before=Date.now();await p.page.getByRole('button',{name:'出这张',exact:true}).click();return before;}
async function observeAi(p,before,label){const e=await snap(p),due=e.public.phase.deadline.endsAt,count=e.public.discards.length;assert.equal(e.public.rulesVersion,'1.5.0');assert.equal(e.public.phase.kind,'TURN_ACTION');assert(due-before>=3000&&due-before<4500,JSON.stringify({due,before}));const initialRemaining=due-e.serverNow;assert(initialRemaining>0&&initialRemaining<=3000);
 const result=await wait(async()=>{const s=await snap(p);if(s.public.discards.length===count){assert(s.serverNow<due+1500);return false;}return s;});const event=result.public.lastAutomaticDiscard;assert.equal(event.reason,'BOT');assert(event.at>=due&&event.at-due<1500,JSON.stringify({due,event}));assert.equal(result.public.discards.length,count+1);pass(label,{rules:e.public.rulesVersion,initialRemaining,due,discardAt:event.at,schedulerLagMs:event.at-due});return result;
}
async function close(ps){const p=ps[0];let s=await snap(p);if(s.public.phase.kind==='ROOM_CLOSED')return;for(const other of ps.slice(1))if(!other.page.isClosed())await other.page.close();if(s.public.players.find(x=>x.playerId===p.id).autoPlay){await(await gameTool(p.page,'取消托管')).click();}await wait(async()=>{s=await snap(p);return s.legalActions.includes('END_UNSCORED')||s.legalActions.includes('CLOSE_ROOM');});if(s.legalActions.includes('END_UNSCORED')){await(await gameTool(p.page,'结束本局（不计分）')).click();await p.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(p)).public.phase.kind==='ROUND_FINISHED');}s=await snap(p);if(s.legalActions.includes('CLOSE_ROOM')){await(await gameTool(p.page,'关闭房间')).click();await p.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snap(p)).public.phase.kind==='ROOM_CLOSED');}
try{
 const {ps}=await setup();let s=await snap(ps[0]);assert.equal(s.public.rulesVersion,'1.5.0');const actor=ps.find(p=>p.id===s.public.phase.actorId),other=ps.find(p=>p!==actor);
 await discard(actor);await other.page.getByRole('button',{name:'摸',exact:true}).waitFor();
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){await other.page.setViewportSize(viewport);const button=other.page.getByRole('button',{name:'摸',exact:true});assert.equal(await button.locator('span').innerText(),'随机摸一张');const b=await button.boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width&&b.y+b.height<=viewport.height);await other.page.screenshot({path:`docs/evidence/${prefix}-${viewport.width}.png`});pass('draw subtitle visible and button reachable at '+viewport.width);}
 await other.page.getByRole('button',{name:'摸',exact:true}).click();await wait(async()=> (await snap(other)).public.phase.actorId===other.id);assert.equal((await snap(other)).private.hand.length,14);pass('draw action still receives exactly one tile from the authoritative wall');
 const control=await gameTool(other.page,'主动 AI 托管');const before=Date.now();await control.click();await wait(async()=> (await snap(other)).public.players.find(p=>p.playerId===other.id).autoPlay);await observeAi(other,before,'voluntary AI discards after three seconds on real server clock');await close(ps);
 const botRoom=await setup(true),host=botRoom.ps[0];s=await snap(host);const botStart=s.public.phase.actorId===host.id?await discard(host):botRoom.before;await observeAi(host,botStart,'designated AI discards after three seconds on real server clock');await close(botRoom.ps);pass('all private verification rooms ended without score and closed');assert.deepEqual(errors,[]);
 await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),origin:base,version,scope:'real Chrome, HTTP/Socket.IO and server wall clock; simulated phone viewport',checks,errors},null,2)+'\n');
}finally{for(const ps of rooms)try{await close(ps);}catch{}await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
