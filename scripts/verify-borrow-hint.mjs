/** Real two-client play reaches the tenth completed circuit without a fabricated snapshot. */
import assert from 'node:assert/strict';import {chromium} from 'playwright';import {createGameServer} from '../apps/server/server.ts';import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';import {resolve} from 'node:path';import {randomUUID} from 'node:crypto';import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN||'http://127.0.0.1:3199',version=JSON.parse(await readFile('package.json')).version,prefix=process.env.EVIDENCE_PREFIX||`borrow-hint-${version}-local`;
const server=process.env.PUBLIC_ORIGIN?null:createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web'),automaticTimers:false});if(server)await server.listen(3199);
await mkdir(`Codex-Temp/${prefix}`,{recursive:true});const browser=await chromium.launch({headless:true}),clients=[],checks=[],errors=[];let room;
async function snap(p){return(await p.context.request.get(`${base}/api/rooms/${room}/snapshot`)).json();}
async function wait(fn){for(let n=0;n<240;n++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('state timeout');}
async function close(){if(!room||!clients.length)return;const e=await snap(clients[0]),host=clients.find(p=>p.id===e.public.hostId)||clients[0];for(const p of clients)if(p!==host&&!p.page.isClosed())await p.page.close();if(e.public.phase.kind!=='ROOM_CLOSED'){
 await wait(async()=>{const e=await snap(host);return e.legalActions.includes('END_UNSCORED')||e.legalActions.includes('CLOSE_ROOM');});if((await snap(host)).legalActions.includes('END_UNSCORED')){await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=>(await snap(host)).public.phase.kind==='ROUND_FINISHED');}await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=>(await snap(host)).public.phase.kind==='ROOM_CLOSED');}
 for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}/${i}-identity.json`,{force:true});room=null;
}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,ignoreHTTPSErrors:false,extraHTTPHeaders:{Origin:base}});
  await context.addInitScript(()=>{localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const p={page,context};clients.push(p);const r=await context.request.post(base+(room?`/api/rooms/${room}/join`:'/api/rooms'),{data:room?{roomId:room,requestedSeat:1,nickname:'圈数验收乙',actionId:randomUUID()}:{capacity:2,nickname:'圈数验收甲',actionId:randomUUID()}});assert(r.ok());const e=(await r.json()).snapshot;room=e.public.roomId;p.id=e.private.playerId;await context.storageState({path:`Codex-Temp/${prefix}/${i}-identity.json`});await page.goto(`${base}/room/${room}`);await page.getByRole('button',{name:'准备好了',exact:true}).waitFor();
 }
 for(const p of clients)await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await clients[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=>(await snap(clients[0])).public.phase.kind==='TURN_ACTION');
 for(let n=1;n<=20;n++){
  const e=await snap(clients[0]),a=clients.find(p=>p.id===e.public.phase.actorId),b=clients.find(p=>p!==a);
  if(n===20){await(await gameTool(b.page,'同桌音乐')).click();await b.page.locator('dialog[open]').waitFor();}
  await a.page.locator('[data-tile-id]:visible').first().click();await a.page.getByRole('button',{name:'出这张',exact:true}).click();await b.page.getByRole('button',{name:'吃上家的字',exact:true}).waitFor();
  if(n<20){for(const p of clients)assert.equal(await p.page.locator('.borrow-micro-hint').count(),0,'must not announce before 10 completed circuits');}
  else{
   await a.page.locator('.borrow-micro-hint').waitFor();assert.equal(await b.page.locator('.borrow-micro-hint').count(),0,'open menu defers hint');
   await b.page.getByRole('button',{name:'关闭面板',exact:true}).click();await b.page.locator('.borrow-micro-hint').waitFor();
   for(const p of clients){const hint=p.page.locator('.borrow-micro-hint');assert.equal(await hint.innerText(),'第十圈，开启全场点炮胡牌');assert.equal(await hint.evaluate(el=>getComputedStyle(el).pointerEvents),'none');}
   assert(await b.page.getByRole('button',{name:'借字申请胡',exact:true}).isVisible());checks.push({unlockAt:20,capacity:2,noEarlyHint:true,menuNotInterrupted:true,bothPlayersInformed:true});
  }
  await b.page.getByRole('button',{name:'吃上家的字',exact:true}).click();await wait(async()=>{const v=await snap(b);return v.public.phase.kind==='TURN_ACTION'&&v.public.phase.actorId===b.id;});
 }
 // Capture both clients and viewport transitions before the three-second toast expires.
 for(const [index,width,height]of [[0,320,480],[1,390,844],[0,667,375],[1,1280,800]]){
  const p=clients[index];await p.page.setViewportSize({width,height});await p.page.waitForTimeout(80);const hint=p.page.locator('.borrow-micro-hint');await hint.waitFor();const r=await hint.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);assert.equal(await hint.getAttribute('data-below'),'true');
  await p.page.screenshot({path:`docs/evidence/${prefix}-${width}.png`});checks.push({width,height,bubbleFits:true,belowCircuitButton:true});
 }
 await clients[0].page.waitForTimeout(3100);for(const p of clients)assert.equal(await p.page.locator('.borrow-micro-hint').count(),0);checks.push({expiresAfterThreeSeconds:true});
 await clients[0].page.reload({waitUntil:'domcontentloaded'});await clients[0].page.getByRole('button',{name:'圈数与阶段规则'}).waitFor();await clients[0].page.waitForTimeout(400);assert.equal(await clients[0].page.locator('.borrow-micro-hint').count(),0);checks.push({refreshDoesNotReplay:true});
 await close();assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}.json`,JSON.stringify({at:new Date().toISOString(),version,browser:browser.version(),origin:base,checks,errors},null,2)+'\n');
}catch(e){for(let i=0;i<clients.length;i++)if(!clients[i].page.isClosed())await clients[i].page.screenshot({path:`Codex-Temp/${prefix}/failure-${i}.png`}).catch(()=>{});throw e;}finally{try{await close();}catch(e){console.error('Cleanup failed; private test identities retained',e.message);}await browser.close();await server?.close();}
