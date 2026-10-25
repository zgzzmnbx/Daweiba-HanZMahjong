/** Real room/socket check: sender and receiver see new chat above the open panel. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3190',local=!process.env.PUBLIC_ORIGIN;
const version=JSON.parse(await readFile('package.json','utf8')).version,prefix=process.env.EVIDENCE_PREFIX??`stickers-${version}`;
await mkdir('docs/evidence',{recursive:true});await mkdir('Codex-Temp',{recursive:true});
const server=local?createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3190);
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',headless:true}),clients=[],checks=[],errors=[];let room;
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name);};
async function wait(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('condition timeout');}
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${room}/snapshot`);assert(r.ok());return r.json();}
async function open(p){if(!await p.page.locator('.chat-panel').isVisible())await p.page.getByRole('button',{name:'同桌聊天',exact:true}).click();}
async function send(p,text){await open(p);await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).fill(text);await p.page.getByRole('button',{name:'发送聊天',exact:true}).click();await wait(async()=>await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).inputValue()==='');}
async function cleanup(){if(!room)return;let e=await snap(clients[0]);if(e.public.phase.kind==='ROOM_CLOSED')return;const host=clients.find(p=>p.id===e.public.hostId)??clients[0];for(const p of clients){if(p.page.isClosed())continue;if(await p.page.locator('.chat-panel').isVisible())await p.page.getByRole('button',{name:'收起聊天',exact:true}).click();const cancel=p.page.getByRole('button',{name:'再琢磨一下',exact:true});if(await cancel.isVisible())await cancel.click();const close=p.page.getByRole('button',{name:'关闭面板',exact:true});if(await close.isVisible())await close.click();if(p!==host)await p.page.close();}await wait(async()=>{e=await snap(host);return e.legalActions.includes('END_UNSCORED')||e.legalActions.includes('CLOSE_ROOM');});if(e.legalActions.includes('END_UNSCORED')){await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROUND_FINISHED');}await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROOM_CLOSED');for(const p of clients)await rm(`Codex-Temp/${prefix}-${clients.indexOf(p)}-identity.json`,{force:true});}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,extraHTTPHeaders:{Origin:base}});await context.addInitScript(()=>{localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));localStorage.setItem('hanz-music-v1',JSON.stringify({enabled:false,volume:.25}));});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));const p={context,page};clients.push(p);
  const r=await context.request.post(base+(room?`/api/rooms/${room}/join`:'/api/rooms'),{data:room?{roomId:room,requestedSeat:1,nickname:'小陈',actionId:randomUUID()}:{capacity:2,nickname:'弹幕验收',actionId:randomUUID()}});assert(r.ok());room=(await r.json()).snapshot.public.roomId;p.id=(await snap(p)).private.playerId;
  await writeFile(`Codex-Temp/${prefix}-${i}-identity.json`,JSON.stringify(await context.storageState()),{mode:0o600});await page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'准备好了',exact:true}).waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);await open(p);
 }
 const [a,b]=clients;
 const sizes=[[320,480],[390,844],[667,375],[1280,800]],labels=['得意一下','偷偷乐','啥意思','妙啊'];
 for(let i=0;i<sizes.length;i++){
  const [width,height]=sizes[i];for(const p of clients){await p.page.setViewportSize({width,height});await p.page.waitForTimeout(250);await open(p);}
  await a.page.getByRole('textbox',{name:'聊天内容',exact:true}).fill('保留这份文字草稿');
  await a.page.getByRole('button',{name:'表情包',exact:true}).click();assert.equal(await a.page.locator('.chat-sticker-picker button').count(),6);await a.page.waitForFunction(()=>[...document.querySelectorAll('.chat-sticker-picker img')].every(e=>e.complete&&e.naturalWidth===320));
  for(const button of await a.page.locator('.chat-sticker-picker button').all()){await button.click({trial:true});const box=await button.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);}
  await a.page.screenshot({path:`docs/evidence/${prefix}-picker-${width}.png`});
  const before=(await snap(a)).public.stateVersion;
  await a.page.getByRole('button',{name:`发送表情：${labels[i]}`,exact:true}).click();
  await a.page.getByRole('log').getByAltText(labels[i],{exact:true}).waitFor();await b.page.getByRole('log').getByAltText(labels[i],{exact:true}).waitFor();
  for(const p of clients){assert.equal(await p.page.getByRole('log').getByAltText(labels[i],{exact:true}).count(),1);await p.page.getByRole('log').getByAltText(labels[i],{exact:true}).evaluate(el=>el.decode());assert(await p.page.getByRole('log').getByAltText(labels[i],{exact:true}).evaluate(el=>el.complete&&el.naturalWidth===320));}
  const reaction=b.page.locator(`.seat-row .avatar-sticker[data-sticker-sender="${a.id}"]`);await reaction.waitFor();
  assert.equal(await reaction.evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.equal(await reaction.evaluate(el=>getComputedStyle(el).animationName),'sticker-pop');
  await reaction.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
  const geometry=await reaction.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.seat-person-avatar').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,pw:p.width,ph:p.height};});assert(geometry.w<=geometry.pw+2&&geometry.h<=geometry.ph+2);
  assert(await a.page.locator('.chat-toggle .avatar-sticker').isVisible());assert.equal(await a.page.getByRole('textbox',{name:'聊天内容',exact:true}).inputValue(),'保留这份文字草稿');assert.equal((await snap(a)).public.stateVersion,before);
  await b.page.getByRole('button',{name:'收起聊天',exact:true}).click();await b.page.screenshot({path:`docs/evidence/${prefix}-avatar-${width}.png`});
  await reaction.waitFor({state:'detached'});pass(`real sticker sync, one record, avatar animation, draft and geometry ${width}x${height}`);
 }
 await b.page.reload({waitUntil:'domcontentloaded'});await b.page.getByLabel('已连接',{exact:true}).waitFor();await open(b);await b.page.getByRole('log').getByAltText('妙啊',{exact:true}).waitFor();assert.equal(await b.page.locator('.avatar-sticker').count(),0);pass('reload restores images without replaying avatar animation');
 await send(a,'普通文字弹幕仍然正常');await b.page.locator('.chat-danmaku').filter({hasText:'普通文字弹幕仍然正常'}).waitFor();pass('text chat and danmaku still work');
 for(const p of clients){await p.page.getByRole('button',{name:'收起聊天',exact:true}).click();await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}
 await a.page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(a)).public.phase.kind==='TURN_ACTION');
 for(const p of clients)await p.page.evaluate(()=>document.fonts.ready);
 await open(a);await a.page.getByRole('button',{name:'表情包',exact:true}).click();await a.page.getByRole('button',{name:'发送表情：委屈巴巴',exact:true}).click();await b.page.locator(`.player-badge .avatar-sticker[data-sticker-sender="${a.id}"]`).waitFor();
 await b.page.locator('.player-portrait:has(.avatar-sticker)').screenshot({path:`docs/evidence/${prefix}-in-game-avatar.png`,animations:'disabled'});
 const e=await snap(a),active=clients.find(p=>p.id===e.public.phase.actorId);if(await active.page.locator('.chat-panel').isVisible())await active.page.getByRole('button',{name:'收起聊天',exact:true}).click();
 const tileId=(await snap(active)).private.hand[0].tileId;await active.page.locator(`[data-tile-id="${tileId}"]`).click();await active.page.getByRole('button',{name:'出这张',exact:true}).click();await wait(async()=> (await snap(active)).private.hand.length===13);pass('avatar reaction during active play does not block actual discard');
 await cleanup();assert.deepEqual(errors,[]);pass('isolated verification room closed');await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),checks,errors},null,2)+'\n');
}catch(e){for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({timeout:30000,path:`Codex-Temp/${prefix}-${i}-failed.png`}).catch(()=>{});throw e;}finally{try{await cleanup();}catch(e){console.error('cleanup requires private saved identity',e.message);}await browser.close();await server?.close();}
