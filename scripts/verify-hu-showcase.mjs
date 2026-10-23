/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3119',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/hu-browser-'));
const server=local?createGameServer({dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3119);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const prefix=local?'hu-showcase-1.10.0':'public-hu-showcase-1.10.0';
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
async function startNext(ps){for(const p of ps){await p.page.getByRole('button',{name:'准备下一局',exact:true}).click();await wait(async()=> (await snapshot(p)).public.players.find(x=>x.playerId===p.id).ready);}await ps[0].page.getByRole('button',{name:'再开一局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');}
async function actor(ps){const s=await snapshot(ps[0]);return ps.find(p=>p.id===s.public.phase.actorId);}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const show=p.page.locator('.hu-showcase');if(await show.isVisible())await p.page.getByRole('button',{name:'收起亮相 · 看评审'}).click();const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}for(const p of ps.slice(1))await p.page.close();const host=ps[0];if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
try{
 const ps=await setup([{}, {viewport:{width:390,height:844}}, {viewport:{width:430,height:932},reducedMotion:'reduce'}]);const a=await actor(ps);
 await a.page.getByRole('button',{name:'申请胡牌',exact:true}).click();const confirm=a.page.getByRole('dialog',{name:'胡牌确认',exact:true});await confirm.waitFor();assert.equal(await confirm.getByText('你确认你觉得这是一句完整的人话吗？',{exact:true}).count(),1);assert.equal(await confirm.locator('.hu-confirm-sentence b').count(),14);const before=await snapshot(a);assert.equal(before.public.phase.kind,'TURN_ACTION');await a.page.screenshot({path:`docs/evidence/${prefix}-confirm.png`});await confirm.getByRole('button',{name:'再琢磨一下',exact:true}).click();assert.equal((await snapshot(a)).public.phase.phaseId,before.public.phase.phaseId);pass('confirmation previews all 14 tiles; cancel sends no HU');
 // Observe insertions before confirming; no synthetic game events or page-internal transport.
 for(const p of ps)await p.page.evaluate(()=>{window.huObserved=[];new MutationObserver(()=>{const el=document.querySelector('.hu-showcase[data-ready=true]');if(el&&!window.huObserved.some(x=>x.id===el.dataset.proposalId))window.huObserved.push({id:el.dataset.proposalId,time:Date.now()});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready']});});
 await a.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await a.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await Promise.all(ps.map(p=>p.page.locator('.hu-showcase[open]').waitFor()));
 const observed=await Promise.all(ps.map(async p=>({events:await p.page.evaluate(()=>window.huObserved),tiles:await p.page.locator('.hu-slam-unit b').allTextContents(),timestamp:(await snapshot(p)).public.phase.proposal.revealedAt})));
 assert.equal(new Set(observed.map(x=>x.events[0].id)).size,1);assert.equal(new Set(observed.map(x=>x.timestamp)).size,1);assert.deepEqual(observed[0].tiles,observed[1].tiles);assert.equal(observed[0].tiles.length,14);const spread=Math.max(...observed.map(x=>x.events[0].time))-Math.min(...observed.map(x=>x.events[0].time));assert(spread<1500);
 const reduced=await ps[2].page.locator('.hu-slam-unit b').first().evaluate(el=>({animation:getComputedStyle(el).animationName,opacity:getComputedStyle(el).opacity}));assert.equal(reduced.animation,'none');assert.equal(reduced.opacity,'1');
 for(const p of ps){const size=await p.page.evaluate(()=>({w:innerWidth,scroll:document.querySelector('.hu-slam-rack').getBoundingClientRect().width,overlay:document.querySelector('.hu-showcase').getBoundingClientRect().width}));assert(size.scroll<=size.w+1);assert.equal(size.overlay,size.w);}
 await ps[0].page.waitForTimeout(700);await ps[0].page.screenshot({path:`docs/evidence/${prefix}-impact.png`});await ps[1].page.screenshot({path:`docs/evidence/${prefix}-mobile.png`});
 pass('3 actual clients receive one identical timed reveal; desktop/mobile/reduced motion', {spreadMs:spread,tiles:14});
 // Early dismissal must immediately allow the real vote; another viewer still sees the entrance.
 const reviewer=ps.find(p=>p!==a);await reviewer.page.getByRole('button',{name:'收起亮相 · 看评审'}).click();await reviewer.page.getByRole('button',{name:'意思成立',exact:true}).click();assert.equal((await snapshot(a)).public.phase.proposal.submittedBallotCount,1);pass('skip immediately permits voting during another player’s animation');
 for(const p of ps){await p.page.locator('.hu-showcase').waitFor({state:'hidden'});if(p!==a&&p!==reviewer)await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}
 await wait(async()=> (await snapshot(a)).public.phase.kind==='ROUND_FINISHED');await a.page.reload();await a.page.getByRole('button',{name:'准备下一局',exact:true}).waitFor();assert.equal(await a.page.locator('.hu-showcase').count(),0);pass('settlement and page restoration do not replay old HU');
 await startNext(ps);const d=await actor(ps),borrower=ps.find(p=>p!==d);await d.page.locator('.projected-tile,.sentence-rack .tile').first().click();await d.page.getByRole('button',{name:'出这张',exact:true}).click();for(const p of ps)if(p!==d)await p.page.getByRole('button',{name:p===borrower?'借字申请胡':'摸',exact:true}).click();await borrower.page.getByRole('button',{name:'提交这句话',exact:true}).click();await borrower.page.getByRole('dialog',{name:'胡牌确认',exact:true}).waitFor();assert.equal((await snapshot(borrower)).public.phase.kind,'HU_COMPOSE');await borrower.page.getByRole('button',{name:'再琢磨一下'}).click();assert.equal((await snapshot(borrower)).private.hand.length,13);await borrower.page.getByRole('button',{name:'提交这句话',exact:true}).click();await borrower.page.getByRole('button',{name:'确认，亮给大家看'}).click();await Promise.all(ps.map(p=>p.page.locator('.hu-showcase').waitFor()));pass('borrowed 13+1 sentence confirms only at final submission and reveals to all');
 await closeRoom(ps);
 const solo=await member('AI showcase');
 const created=await solo.context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:2,nickname:solo.nickname}});assert(created.ok());
 solo.room=(await created.json()).snapshot.public.roomId;rooms.push([solo]);await solo.page.goto(`${base}/room/${solo.room}`);
 await solo.page.getByRole('button',{name:'将座位 2 设为 AI',exact:true}).click();await solo.page.getByRole('button',{name:'移除座位 2 的 AI，留给朋友',exact:true}).waitFor();
 await solo.page.getByRole('button',{name:'准备好了',exact:true}).click();await solo.page.getByRole('button',{name:'开始牌局',exact:true}).click();
 await wait(async()=> ['TURN_ACTION','DISCARD_RESPONSE'].includes((await snapshot(solo)).public.phase.kind));
 if(!(await snapshot(solo)).legalActions.includes('DECLARE_SELF_HU'))await solo.page.getByRole('button',{name:'摸',exact:true}).click();
 await solo.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await solo.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await solo.page.locator('.hu-showcase[open]').waitFor();
 const ss=await snapshot(solo);assert.notEqual(ss.public.phase.kind,'HU_VOTE');assert.equal(ss.public.history.length,1);assert.equal(await solo.page.locator('.hu-slam-unit b').count(),14);
 await solo.page.waitForTimeout(2400);await solo.page.screenshot({path:`docs/evidence/${prefix}-full-sentence.png`});
 pass('AI instant approval/rejection still displays the full 14-tile entrance once',{passed:ss.public.history[0].result.passed});await closeRoom([solo]);
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),applicationVersion:'1.10.0',scope:local?'local production build, real HTTP/Socket/SQLite, independent browsers':'public HTTPS/WSS, independent browsers, own private room only',checks,errors},null,2)+'\n');
}catch(e){await writeFile(`Codex-Temp/${prefix}-failure.json`,JSON.stringify({error:String(e),checks,errors},null,2));throw e;}finally{for(const ps of rooms)try{if(!ps[0].page.isClosed())await closeRoom(ps);}catch(e){console.error('Cleanup:',String(e));}for(const c of contexts)await c.close();await browser.close();if(server)await server.close();await rm(dir,{recursive:true,force:true});}
