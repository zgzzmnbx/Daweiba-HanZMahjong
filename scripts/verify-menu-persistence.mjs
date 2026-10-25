/** Actual two-player room: navigation must survive ordinary socket phase changes. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameAction,gameTool,rejectReview} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3184',local=!process.env.PUBLIC_ORIGIN;
const version=JSON.parse(await readFile('package.json','utf8')).version,prefix=process.env.EVIDENCE_PREFIX??`menu-persistence-${version}`;
await mkdir('docs/evidence',{recursive:true});await mkdir('Codex-Temp',{recursive:true});
const server=local?createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3184);
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',headless:true}),clients=[],checks=[],errors=[];let room;
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name);};
async function wait(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('condition timeout');}
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${room}/snapshot`);assert(r.ok());return r.json();}
async function closeNavigation(p){for(const label of ['关闭新手指南','关闭面板','收起菜单']){const b=p.page.getByRole('button',{name:label,exact:true});if(await b.isVisible())await b.click();}}
async function open(p,label){await closeNavigation(p);if(label==='游戏菜单')await p.page.getByRole('button',{name:label,exact:true}).click();else if(label==='新手指南'){await gameAction(p.page,'牌桌帮助');await p.page.getByRole('button',{name:'查看新手指南',exact:true}).click();}else await gameAction(p.page,label);return p.page.getByRole('dialog',{name:label+(['游戏菜单','新手指南'].includes(label)?'':'面板'),exact:true});}
async function discard(p){const tile=p.page.locator('[data-tile-id]:visible').first();await tile.click();await p.page.getByRole('button',{name:'出这张',exact:true}).click();await wait(async()=> (await snap(p)).public.phase.kind==='DISCARD_RESPONSE');}
async function cleanup(){if(!room||!clients.length)return;for(const p of clients){await closeNavigation(p);if((await snap(p)).legalActions.includes('VOTE')){const skip=p.page.getByRole('button',{name:'收起亮相 · 看评审',exact:true});if(await skip.isVisible())await skip.click();await rejectReview(p.page);}}
 for(const p of clients){const back=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await back.isVisible())await back.click();}
 const e=await snap(clients[0]);if(e.public.phase.kind!=='ROOM_CLOSED'){const host=clients.find(p=>p.id===e.public.hostId);assert(host);const other=clients.find(p=>p!==host);if(!['LOBBY','ROUND_FINISHED'].includes(e.public.phase.kind)){await other.page.goto('about:blank');await wait(async()=> (await snap(host)).legalActions.includes('END_UNSCORED'));await host.page.getByRole('button',{name:'游戏菜单',exact:true}).waitFor();await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROUND_FINISHED');await other.page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await other.page.getByRole('button',{name:'游戏菜单',exact:true}).waitFor();await host.page.locator('.player-badge .presence-dot.online').waitFor({state:'attached'});}

 await open(other,'游戏菜单');await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=>{const s=await snap(host);if(host.commandFailures.at(-1)?.kind==='CLOSE_ROOM')throw Error(JSON.stringify(host.commandFailures.at(-1)));return s.public.phase.kind==='ROOM_CLOSED';});await wait(async()=>!await other.page.getByRole('dialog',{name:'游戏菜单',exact:true}).isVisible());pass('room closure dismisses obsolete navigation');}
 for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}-${i}-identity.json`,{force:true});room=null;
}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,extraHTTPHeaders:{Origin:base}});await context.addInitScript(()=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));localStorage.setItem('hanz-music-v1',JSON.stringify({enabled:false,volume:.25}));});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));const p={context,page,commands:new Map(),commandFailures:[]};clients.push(p);
  page.on('websocket',socket=>{socket.on('framesent',({payload})=>{try{const data=JSON.parse(String(payload).slice(String(payload).indexOf('['))),c=data[1]?.command;if(c){p.commands.set(c.actionId,c.kind);if(c.kind==='CLOSE_ROOM')console.log('CLOSE sent',c.expectedStateVersion);}}catch{}});socket.on('framereceived',({payload})=>{try{const data=JSON.parse(String(payload).slice(String(payload).indexOf('['))),result=data[1]?.type==='COMMAND_RESULT'?data[1].result:null;if(result&&!result.ok){const failure={kind:p.commands.get(result.actionId),code:result.code};p.commandFailures.push(failure);console.log('COMMAND REJECTED',JSON.stringify(failure));}}catch{}});});
  const r=await context.request.post(base+(room?`/api/rooms/${room}/join`:'/api/rooms'),{data:room?{roomId:room,requestedSeat:1,nickname:'菜单验收乙',actionId:randomUUID()}:{capacity:2,nickname:'菜单验收甲',actionId:randomUUID()}});assert(r.ok());room=(await r.json()).snapshot.public.roomId;p.id=(await snap(p)).private.playerId;
  await writeFile(`Codex-Temp/${prefix}-${i}-identity.json`,JSON.stringify(await context.storageState()),{mode:0o600});await page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'准备好了',exact:true}).waitFor({timeout:30000});
 }
 await clients[0].page.locator('.seat-person-heading strong').filter({hasText:'菜单验收乙'}).waitFor();
 for(const p of clients)await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await clients[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(clients[0])).public.phase.kind==='TURN_ACTION');
 for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]]){
  for(const p of clients){await p.page.setViewportSize({width,height});await p.page.evaluate(()=>document.fonts.ready);}
  for(const label of ['游戏菜单','同桌音乐','牌局记录','牌桌帮助','新手指南','画面设置','房间设置','托管设置','整理句子']){
   const before=await snap(clients[0]),actor=clients.find(p=>p.id===before.public.phase.actorId),observer=clients.find(p=>p!==actor);assert(actor);
   const dialog=await open(observer,label);await dialog.waitFor();
   const focus=label==='同桌音乐'?observer.page.getByRole('slider',{name:'音效音量',exact:true}):label==='新手指南'?observer.page.getByRole('button',{name:'关闭新手指南',exact:true}):label==='游戏菜单'?observer.page.getByRole('button',{name:'收起菜单',exact:true}):observer.page.getByRole('button',{name:'关闭面板',exact:true});
   if(label==='同桌音乐'){await observer.page.getByRole('button',{name:'音效与语音',exact:true}).click();await focus.fill('35');}
   await focus.focus();
   const scroll=await dialog.evaluate(el=>{el.scrollTop=23;return el.scrollTop;});
   await discard(actor);await observer.page.locator('.game-shell[data-phase="DISCARD_RESPONSE"]').waitFor();await observer.page.waitForTimeout(180);
   assert(await dialog.isVisible());assert(await dialog.evaluate(el=>el.matches(':modal')));assert(await focus.evaluate(el=>document.activeElement===el));assert.equal(await dialog.evaluate(el=>el.scrollTop),scroll);
   if(label==='同桌音乐'){assert.equal(await focus.inputValue(),'35');assert.equal(await observer.page.getByRole('button',{name:'音效与语音',exact:true}).getAttribute('aria-pressed'),'true');}
   const after=await snap(observer);assert.notEqual(after.public.phase.phaseId,before.public.phase.phaseId);assert.equal(after.public.discards.length,before.public.discards.length+1);assert(after.legalActions.includes('RESPOND'));const deadline=after.public.phase.deadline;
   if(label==='游戏菜单'||label==='同桌音乐')await observer.page.screenshot({timeout:30000,path:`docs/evidence/${prefix}-${width}-${label==='游戏菜单'?'menu':'music'}.png`});
   await closeNavigation(observer);
   const actorMenu=await open(actor,'游戏菜单');await observer.page.getByRole('button',{name:'摸',exact:true}).click();await actor.page.locator('.game-shell[data-phase="TURN_ACTION"]').waitFor();await actor.page.waitForTimeout(150);assert(await actorMenu.isVisible());const drawn=await snap(observer);assert.equal(drawn.public.phase.actorId,observer.id);assert.equal(drawn.public.wallRemaining,after.public.wallRemaining-1);assert.equal(drawn.private.hand.length,14);
   await closeNavigation(actor);pass(`${width}x${height} ${label}: discard preserves modal, focus, scroll; draw preserves menu`,{phaseBefore:before.public.phase.phaseId,phaseAfter:after.public.phase.phaseId,deadline});
  }
  // A mandatory review must still supersede navigation, including after prior rejected proposals.
  const state=await snap(clients[0]),actor=clients.find(p=>p.id===state.public.phase.actorId),observer=clients.find(p=>p!==actor),label=width===320?'游戏菜单':width===390?'同桌音乐':width===667?'新手指南':'牌局记录';
  const old=await open(observer,label);await actor.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await actor.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await observer.page.getByRole('dialog',{name:'胡牌评审',exact:true}).waitFor();await wait(async()=>!await old.isVisible());assert(await observer.page.getByRole('dialog',{name:'胡牌评审',exact:true}).evaluate(el=>el.matches(':modal')));
  const skip=observer.page.getByRole('button',{name:'收起亮相 · 看评审',exact:true});if(await skip.isVisible())await skip.click();await rejectReview(observer.page);for(const p of clients)await p.page.getByRole('button',{name:'回到牌桌',exact:true}).click();assert.equal((await snap(actor)).public.history.at(-1).outcome,'REJECTED');pass(`${width}x${height}: new review supersedes ${label}, voting and return work`);
 }
 await cleanup();assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),checks,errors},null,2)+'\n');
}catch(e){for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({timeout:30000,path:`Codex-Temp/${prefix}-${i}-failed.png`}).catch(()=>{});throw e;}finally{try{await cleanup();}catch(e){console.error('cleanup requires saved private identity',e.message);}await browser.close();await server?.close();}
