/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3156',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
let clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3156);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=process.env.EVIDENCE_PREFIX??`${local?'':'public-'}turn-hud-${applicationVersion}`;
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
async function textIs(p,selector,text){await wait(async()=>await p.page.locator(selector).innerText()===text);}
const hud='.turn-hud-row .turn-hud';
async function bounds(p,selector){return p.page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight};});}
try{
 const ps=await setup([{},{}]),initial=await snapshot(ps[0]),actor=ps.find(p=>p.id===initial.public.phase.actorId),peer=ps.find(p=>p!==actor);
 await textIs(actor,hud+' .turn-hint','请选择打什么牌');await textIs(peer,hud+' .turn-hint',`等${actor.nickname}出牌`);assert.equal(await actor.page.locator('.table-heading').count(),0);pass('real acting/waiting roles get distinct prompts, former top timer removed');
 for(const [width,height]of[[1280,720],[390,844],[320,480],[667,375]]){await actor.page.setViewportSize({width,height});await actor.page.waitForTimeout(200);const r=await bounds(actor,hud);assert(r.x>=0&&r.y>=height*.45&&r.right<=width&&r.bottom<=height&&r.sh<=height&&r.sw<=width,JSON.stringify(r));const actions=await bounds(actor,'.table-action-dock');assert(r.y>=actions.bottom||r.right<=actions.x||r.x>=actions.right,'HUD must not cover action buttons');const rack=actor.page.locator('.rack-area.expanded');if(await rack.count()){const b=await bounds(actor,'.rack-area.expanded');assert(r.bottom<=b.y,'HUD must not cover hand');}pass(`HUD fits lower table edge without obscuring actions/hand at ${width}x${height}`,r);}
 await actor.page.setViewportSize({width:1280,height:720});
 if(local){for(const [remaining,tone,pct]of[[90000,'calm',75],[50000,'warning',42],[15000,'danger',13]]){
  clock=initial.public.phase.deadline.endsAt-remaining;await actor.page.reload();await actor.page.locator(hud).waitFor();await wait(async()=>await actor.page.locator(hud).getAttribute('data-tone')===tone);const value=Number(await actor.page.locator(hud+' [role=progressbar]').getAttribute('aria-valuenow'));assert(Math.abs(value-pct)<=1);await actor.page.waitForTimeout(600);await actor.page.screenshot({path:`docs/evidence/${prefix}-${tone}.png`});pass(`server-time ${tone} progress survives reload`,{remaining,value});}
 }
 const s=await snapshot(actor);await actor.page.locator(`[data-tile-id="${s.private.hand[0].tileId}"]`).click();await actor.page.getByRole('button',{name:'出这张',exact:true}).click();await textIs(actor,hud+' .turn-hint','等大家回应这张牌');await textIs(peer,hud+' .turn-hint','吃这张，还是摸牌？');pass('discarder waits while the next player sees eat/draw choice');
 await peer.page.getByRole('button',{name:'借字申请胡',exact:true}).click();await textIs(peer,hud+' .turn-hint','排好这句话，再提交');await textIs(actor,hud+' .turn-hint',`等${peer.nickname}排句`);pass('borrowed composition prompts applicant and other player correctly');
 await peer.page.getByRole('button',{name:'提交这句话',exact:true}).click();await peer.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await textIs(actor,'dialog.hu-review-dialog .turn-hint','这句话通顺吗？请投票');await textIs(peer,'dialog.hu-review-dialog .turn-hint','你的句子，等大家评审');pass('review has one compact bottom timer with role-specific instruction');
 await actor.page.waitForTimeout(3900);
 for(const [width,height]of[[1280,720],[390,844],[320,480],[667,375]]){await actor.page.setViewportSize({width,height});await actor.page.waitForTimeout(100);const r=await bounds(actor,'dialog.hu-review-dialog .turn-hud');const d=await bounds(actor,'dialog.hu-review-dialog');assert(r.x>=d.x&&r.right<=d.right&&r.y>=d.y&&r.bottom<=d.bottom,JSON.stringify({r,d}));await actor.page.getByRole('button',{name:'写的什么玩意',exact:true}).click({trial:true});await actor.page.screenshot({path:`docs/evidence/${prefix}-review-${width}x${height}.png`});pass(`review timer and actionable vote fit 80% modal at ${width}x${height}`);}
 await actor.page.getByRole('button',{name:'写的什么玩意',exact:true}).click();await wait(async()=> (await snapshot(actor)).public.phase.kind==='TURN_ACTION');await textIs(actor,'dialog.hu-review-dialog .turn-clock-number','已结算');for(const p of ps)await closeDialog(p);pass('settled review never displays the next turn countdown');
 await actor.context.setOffline(true);await textIs(actor,hud+' .turn-hint','正在重连，请稍候');assert.equal(await actor.page.locator(hud).getAttribute('data-tone'),'idle');await actor.context.setOffline(false);await wait(async()=>!(await actor.page.locator(hud+' .turn-hint').innerText()).includes('重连'));pass('real network loss suspends urgency and reconnect restores authoritative prompt');
 await closeRoom(ps);assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),scope:local?'real Chrome/Socket.IO/HTTP, isolated SQLite and controlled server clock':'public real Chrome/Socket.IO/HTTP, own private room closed without scoring',checks,errors},null,2)+'\n');
}catch(e){const p=contexts.flatMap(c=>c.pages()).find(p=>!p.isClosed());if(p)await p.screenshot({path:'Codex-Temp/turn-hud-failure.png'});throw e;
}finally{for(const c of contexts)await c.close();await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
