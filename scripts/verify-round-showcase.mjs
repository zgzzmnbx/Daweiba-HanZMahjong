/** Isolated real HTTP/Socket game + Chromium. Winning tests never touch the public book. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {io} from 'socket.io-client';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool,gameAction} from './game-ui-tools.mjs';
const base='http://127.0.0.1:3187',prefix=process.env.EVIDENCE_PREFIX||'round-showcase-local',version=JSON.parse(await readFile('package.json')).version;
const server=createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web'),automaticTimers:false});await server.listen(3187);
const browser=await chromium.launch({headless:true}),clients=[],checks=[],errors=[];let room;
const snap=async c=>(await c.context.request.get(`${base}/api/rooms/${room}/snapshot`)).json();
const send=async(c,payload)=>{if(c.page){c.socket.disconnect();const cookie=(await c.context.cookies()).map(x=>`${x.name}=${x.value}`).join(';');c.socket=io(base,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:base,Cookie:cookie}});await new Promise((resolve,reject)=>{c.socket.once('connect_error',reject);c.socket.on('message',e=>{if(e.type==='RESYNC')resolve();});});}const e=await snap(c);const result=await c.socket.timeout(5000).emitWithAck('message',{type:'COMMAND',command:{roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,expectedStateVersion:e.public.stateVersion,controlEpoch:e.private.controlEpoch,actionId:randomUUID(),...payload}});assert(result.ok,JSON.stringify(result));};
const wait=async fn=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('timeout');};
const pass=name=>{checks.push(name);console.log('PASS',name);};
try{
 for(let seat=0;seat<6;seat++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,extraHTTPHeaders:{Origin:base}});await context.addInitScript(()=>{localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));localStorage.setItem('hanz-music-v1',JSON.stringify({enabled:false,volume:.6}));});
  const c={context,seat};clients.push(c);const r=await context.request.post(base+(seat?`/api/rooms/${room}/join`:'/api/rooms'),{data:seat?{roomId:room,requestedSeat:seat,nickname:'只差一句的苏东坡'+seat,actionId:randomUUID()}:{capacity:6,nickname:'月下写诗的李太白',actionId:randomUUID()}});assert(r.ok());const data=await r.json();room=data.snapshot.public.roomId;c.id=data.snapshot.private.playerId;
  const cookie=(await context.cookies()).map(c=>`${c.name}=${c.value}`).join(';');c.socket=io(base,{transports:['websocket'],reconnection:false,extraHeaders:{Cookie:cookie,Origin:base}});await new Promise((resolve,reject)=>{c.socket.once('connect_error',reject);c.socket.on('message',e=>{if(e.type==='RESYNC')resolve();});});
  if(seat<2){c.page=await context.newPage();c.page.on('pageerror',e=>errors.push(e.message));await c.page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await c.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();}
 }
 for(const c of clients)await send(c,{kind:'READY',ready:true});await send(clients[0],{kind:'START_ROUND'});
 for(const c of clients){const e=await snap(c),ordered=[...e.private.draft.orderedTileIds].reverse();await send(c,{kind:'SAVE_DRAFT',draft:{orderedTileIds:ordered,commaAfterTileIds:ordered.slice(1,4)},expectedDraftVersion:e.private.draftVersion});}
 const before=await snap(clients[0]);assert(!before.public.roundShowcase);const actor=clients.find(c=>c.id===before.public.phase.actorId),own=await snap(actor);
 await send(actor,{kind:'DECLARE_SELF_HU',sentence:own.private.draft});assert(!(await snap(clients[0])).public.roundShowcase);const proposal=(await snap(clients[0])).public.phase.proposal;
 for(const c of clients.filter(c=>c!==actor))await send(c,{kind:'VOTE',proposalId:proposal.proposalId,ballot:{choice:'APPROVE',comment:'这一句，留着下桌再琢磨。'}});
 const final=await snap(clients[0]);assert.equal(final.public.phase.kind,'ROUND_FINISHED');const frozen=final.public.roundShowcase;assert.equal(frozen.hands.length,6);assert.equal(frozen.hands.at(-1).playerId,actor.id);assert.deepEqual(frozen.hands.at(-1).draft,proposal.snapshot.sentence);pass('real six-player vote reveals frozen hands only after approval');
 const page=clients[0].page;
 for(const [width,height]of [[320,480],[390,844],[667,375],[1280,800]]){await page.setViewportSize({width,height});await page.waitForTimeout(350);const buttons=page.locator('.hu-review-dialog .review-result-buttons button');for(const button of await buttons.all()){const b=await button.boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,JSON.stringify(b));}}pass('existing review result actions remain within all four viewports');
 await page.setViewportSize({width:390,height:844});await page.locator('.hu-review-dialog').getByRole('button',{name:'看看大家的牌',exact:true}).click();await page.getByRole('region',{name:'散局晒牌',exact:true}).waitFor();
 for(const [width,height]of [[320,480],[390,844],[667,375],[1280,800]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(500);const album=page.locator('.round-showcase-page');
  const geometry=await album.evaluate(el=>{const r=el.getBoundingClientRect(),scroll=el.querySelector('.showcase-scroll'),bad=[...el.querySelectorAll('.showcase-tile')].filter(t=>{const b=t.getBoundingClientRect(),row=t.closest('.showcase-tiles').getBoundingClientRect();return b.left<row.left-1||b.right>row.right+1;});return{rect:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},horizontal:el.scrollWidth>el.clientWidth+1||scroll.scrollWidth>scroll.clientWidth+1,bad:bad.length,bodyOverflow:document.documentElement.scrollHeight>innerHeight+1};});assert(!geometry.horizontal&&!geometry.bad&&!geometry.bodyOverflow,JSON.stringify(geometry));assert(geometry.rect.x>=0&&geometry.rect.y>=0&&geometry.rect.right<=width+1&&geometry.rect.bottom<=height+1);
  for(const card of await page.locator('.showcase-hand').all()){await card.scrollIntoViewIfNeeded();assert.equal(await card.locator('.showcase-row').count(),2);await card.locator('.showcase-row').last().scrollIntoViewIfNeeded();}
  await page.locator('.showcase-scroll').evaluate(el=>el.scrollTop=0);await page.waitForTimeout(650);await page.screenshot({path:`docs/evidence/${prefix}-${width}x${height}.png`,timeout:15000});
  const close=page.getByRole('button',{name:'收起晒牌'}),b=await close.boundingBox();assert(b&&b.width>=40&&b.height>=40);pass(`six cards, punctuation, controls and scrolling fit ${width}x${height}`);
 }
 // Chat stays above the independent page, and a peer receives a real message.
 await page.setViewportSize({width:390,height:844});await gameAction(page,'同桌聊天');await page.getByRole('textbox',{name:'聊天内容'}).fill('看看这一手，差点成诗。');await page.getByRole('button',{name:'发送聊天',exact:true}).click();await page.locator('.chat-history').getByText('看看这一手，差点成诗。',{exact:true}).waitFor();await page.getByRole('button',{name:'收起聊天',exact:true}).click();assert(await page.locator('.round-showcase-page').isVisible());pass('chat remains usable over the showcase page');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.game-shell').waitFor();await gameAction(page,'散局晒牌');await page.locator('.showcase-hand').first().waitFor();assert.deepEqual((await snap(clients[0])).public.roundShowcase,frozen);pass('refresh reopens identical persistent result from menu');
 await page.getByRole('button',{name:'下一局设置'}).click();assert(!await page.locator('.round-showcase-page').count());for(const c of clients)await send(c,{kind:'READY',ready:true});await send(clients[0],{kind:'START_ROUND'});await gameAction(page,'散局晒牌');await page.locator('.showcase-hand').first().waitFor();assert.equal((await snap(clients[0])).public.roundShowcase,undefined);assert.deepEqual((await (await clients[0].context.request.get(`${base}/api/rooms/${room}/showcases`)).json()).showcases,[frozen]);pass('next deal preserves prior showcase without disclosing current hands');
 // Real font use: actual rendered Chinese face, not only a CSS declaration.
 const session=await page.context().newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');const doc=await session.send('DOM.getDocument'),node=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.showcase-tile:not(.is-mark)'});const fonts=await session.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});assert(fonts.fonts.some(f=>f.postScriptName==='LXGWWenKai-Medium'&&f.glyphCount>0),JSON.stringify(fonts));pass('actual DOM glyph uses WenKai Medium');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}.json`,JSON.stringify({at:new Date().toISOString(),version,browser:browser.version(),scope:'isolated in-memory server, real six-player commands and Chromium touch viewport; no production book writes',checks,errors},null,2)+'\n');
}catch(e){if(clients[0]?.page)await clients[0].page.screenshot({path:`Codex-Temp/${prefix}-failure.png`,timeout:5000}).catch(()=>{});throw e;}finally{for(const c of clients){c.socket?.disconnect();await c.context.close();}await browser.close();await server.close();}
