/** Real room/socket check: sender and receiver see new chat above the open panel. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3183',local=!process.env.PUBLIC_ORIGIN;
const version=JSON.parse(await readFile('package.json','utf8')).version,prefix=process.env.EVIDENCE_PREFIX??`chat-visibility-${version}`;
await mkdir('docs/evidence',{recursive:true});await mkdir('Codex-Temp',{recursive:true});
const server=local?createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3183);
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',headless:true}),clients=[],checks=[],errors=[];let room;
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name);};
async function wait(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('condition timeout');}
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${room}/snapshot`);assert(r.ok());return r.json();}
async function open(p){if(!await p.page.locator('.chat-panel').isVisible())await p.page.getByRole('button',{name:'同桌聊天',exact:true}).click();}
async function send(p,text){await open(p);await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).fill(text);await p.page.getByRole('button',{name:'发送聊天',exact:true}).click();await wait(async()=>await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).inputValue()==='');}
async function cleanup(){if(!room||!clients.length)return;const e=await snap(clients[0]);if(e.public.phase.kind!=='ROOM_CLOSED'){const host=clients.find(p=>p.id===e.public.hostId);assert(host);if(await host.page.locator('.chat-panel').isVisible())await host.page.getByRole('button',{name:'收起聊天',exact:true}).click();await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROOM_CLOSED');}for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}-${i}-identity.json`,{force:true});room=null;}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,extraHTTPHeaders:{Origin:base}});await context.addInitScript(()=>localStorage.setItem('hanz-new-player-guide-v1','skip'));
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));const p={context,page};clients.push(p);
  const r=await context.request.post(base+(room?`/api/rooms/${room}/join`:'/api/rooms'),{data:room?{roomId:room,requestedSeat:1,nickname:'小陈',actionId:randomUUID()}:{capacity:2,nickname:'弹幕验收',actionId:randomUUID()}});assert(r.ok());room=(await r.json()).snapshot.public.roomId;p.id=(await snap(p)).private.playerId;
  await writeFile(`Codex-Temp/${prefix}-${i}-identity.json`,JSON.stringify(await context.storageState()),{mode:0o600});await page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'准备好了',exact:true}).waitFor({timeout:30000});await page.evaluate(()=>document.fonts.ready);await open(p);
 }
 const [a,b]=clients;
 for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]]){
  for(const p of clients){await p.page.setViewportSize({width,height});await p.page.waitForTimeout(150);await open(p);}
  const before=(await snap(a)).public.stateVersion,text=`${width}：我发的闲聊也能飘过`;
  await send(a,text);
  for(const p of clients){const flight=p.page.locator('.chat-danmaku').filter({hasText:text});await flight.waitFor();await p.page.waitForTimeout(900);const one=await flight.boundingBox();await p.page.waitForTimeout(500);const two=await flight.boundingBox();assert(one&&two&&one.x-two.x>15);assert.equal(await flight.count(),1);assert.equal(await p.page.locator('.chat-history').getByText(text,{exact:true}).count(),1);
   const geometry=await p.page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};};const air=document.querySelector('.chat-airspace'),bubble=document.querySelector('.chat-danmaku');return{air:r(air),panel:r(document.querySelector('.chat-panel')),send:r(document.querySelector('.chat-send')),input:r(document.querySelector('.chat-composer textarea')),bubble:r(bubble),font:parseFloat(getComputedStyle(bubble).fontSize),pointer:getComputedStyle(air).pointerEvents,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight};});
   assert(geometry.air.bottom<=geometry.panel.y);assert.equal(geometry.pointer,'none');assert(geometry.font>=13);assert(geometry.bubble.x<width&&geometry.bubble.right>0);assert(geometry.sw<=width+1&&geometry.sh<=height+1);for(const key of ['panel','send','input']){const r=geometry[key];assert(r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,JSON.stringify(geometry));}
   await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).click();assert(await p.page.getByRole('textbox',{name:'聊天内容',exact:true}).evaluate(el=>document.activeElement===el));
   if(p===a)await p.page.screenshot({timeout:30000,path:`docs/evidence/${prefix}-${width}.png`});
  }
  assert.equal((await snap(a)).public.stateVersion,before);pass(`sender and receiver see one moving bubble above open, usable chat ${width}x${height}`);
  for(const p of clients){await p.page.getByRole('button',{name:'关闭弹幕',exact:true}).click();await p.page.getByRole('button',{name:'开启弹幕',exact:true}).click();}
 }
 await b.page.getByRole('button',{name:'关闭弹幕',exact:true}).click();await send(a,'关掉弹幕也保留聊天记录');await b.page.getByRole('log').getByText('关掉弹幕也保留聊天记录',{exact:true}).waitFor();assert.equal(await b.page.locator('.chat-danmaku').count(),0);pass('explicit preference still suppresses bubbles without losing messages');
 await b.page.getByRole('button',{name:'开启弹幕',exact:true}).click();await b.page.reload({waitUntil:'domcontentloaded'});await b.page.getByRole('button',{name:'同桌聊天',exact:true}).click();await b.page.getByRole('log').getByText('关掉弹幕也保留聊天记录',{exact:true}).waitFor();assert.equal(await b.page.locator('.chat-danmaku').count(),0);pass('reload restores history without replay');
 await cleanup();assert.deepEqual(errors,[]);pass('isolated verification room closed');await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),checks,errors},null,2)+'\n');
}catch(e){for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({timeout:30000,path:`Codex-Temp/${prefix}-${i}-failed.png`}).catch(()=>{});throw e;}finally{try{await cleanup();}catch(e){console.error('cleanup requires private saved identity',e.message);}await browser.close();await server?.close();}
