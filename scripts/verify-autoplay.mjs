/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3139',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
let clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3139);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=`${local?'':'public-'}autoplay-${applicationVersion}`;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<100;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function member(nickname,viewport={width:1440,height:900},reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return {context,page,nickname};
}
async function setup(options=[{},{}]){
 const ps=[];for(let i=0;i<options.length;i++)ps.push(await member(`亮相验收${i+1}`,options[i].viewport,options[i].reducedMotion));
 const created=await ps[0].context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:ps.length,nickname:ps[0].nickname}});assert(created.ok());const r=await created.json();const room=r.snapshot.public.roomId;
 for(const [i,p] of ps.entries()){p.room=room;if(i){const joined=await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:p.nickname}});assert(joined.ok());}await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snapshot(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function closeDialog(p){await p.page.waitForTimeout(100);const button=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await button.isVisible())await button.click();}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}await wait(async()=> (await snapshot(ps[0])).public.phase.kind!=='HU_VOTE');for(const p of ps)if(!p.page.isClosed())await closeDialog(p);for(const p of ps.slice(1))await p.page.close();const host=ps[0];if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
try{
 const ps=await setup([{}, {}, {viewport:{width:390,height:844}}]);
 const first=await snapshot(ps[0]),actor=ps.find(p=>p.id===first.public.phase.actorId),deadline=first.public.phase.deadline.endsAt;
 const help=actor.page.getByRole('button',{name:'标点说明',exact:true});await help.hover();
 await actor.page.getByRole('tooltip').filter({hasText:'标点符号只是为了让自己和其他朋友便于理解你句子意思，不是胡牌必须'}).waitFor();
 await help.focus();await actor.page.keyboard.press('Escape');assert.equal(await actor.page.getByRole('tooltip').count(),0);
 await help.click();await actor.page.getByRole('tooltip').waitFor();
 assert.equal(await actor.page.getByText('拖动添加标点',{exact:true}).count(),1);
 assert.equal(await actor.page.getByText('私密手牌',{exact:true}).count(),0);assert.equal(await actor.page.getByText(/^我的字/).count(),0);
 pass('punctuation help supports hover, keyboard, click and exact wording; redundant rack labels removed');
 await (await gameTool(actor.page,'主动 AI 托管')).click();
 await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay===true);
 let e=await snapshot(actor);assert.equal(e.public.phase.deadline.endsAt,clock+3000);assert.equal(e.public.players.find(p=>p.playerId===actor.id).presence,'HUMAN');
 await actor.page.getByRole('status').filter({hasText:'AI 托管中'}).waitFor();assert.equal(await actor.page.locator('[data-tile-id]:enabled').count(),0);
 pass('tools enable authority-owned delegation, keep human online, disable manual card commands');
 await actor.page.reload();await actor.page.getByRole('status').filter({hasText:'AI 托管中'}).waitFor();
 await (await gameTool(actor.page,'取消托管')).click();await wait(async()=> !(await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay);
 e=await snapshot(actor);assert.equal(e.public.phase.deadline.endsAt,deadline);assert(e.legalActions.includes('DISCARD'));
 pass('reload preserves voluntary delegation; cancel resumes original human deadline and control');
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:667,height:375}]){
  await actor.page.setViewportSize(viewport);await actor.page.waitForTimeout(200);
  await actor.page.getByRole('button',{name:'标点说明',exact:true}).click();await actor.page.getByRole('tooltip').waitFor();
  const box=await actor.page.getByRole('tooltip').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,JSON.stringify({viewport,box}));
  const dimensions=await actor.page.evaluate(()=>({h:innerHeight,w:innerWidth,sh:document.documentElement.scrollHeight,sw:document.documentElement.scrollWidth}));assert(dimensions.sh<=dimensions.h+1&&dimensions.sw<=dimensions.w+1,JSON.stringify(dimensions));
  await actor.page.screenshot({path:`docs/evidence/${prefix}-${viewport.width}.png`});
 }pass('four screen sizes keep game and punctuation explanation within viewport');
 await (await gameTool(actor.page,'主动 AI 托管')).click();await wait(async()=> (await snapshot(actor)).public.players.find(p=>p.playerId===actor.id).autoPlay);
 clock+=2999;await server.tick();assert.equal((await snapshot(actor)).public.discards.length,0);
 clock+=1;await server.tick();await wait(async()=> (await snapshot(actor)).public.discards.length===1);assert.equal((await snapshot(actor)).public.lastAutomaticDiscard.reason,'BOT');
 pass('real browser player is auto-discarded exactly at three seconds, never early');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',checks,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
