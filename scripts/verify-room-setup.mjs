/** Real room lifecycle and central-menu geometry; own rooms only when PUBLIC_ORIGIN is set. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3139',local=!process.env.PUBLIC_ORIGIN;
await mkdir('Codex-Temp',{recursive:true});await mkdir('docs/evidence',{recursive:true});
const dir=await mkdtemp(resolve('Codex-Temp/setup-browser-')),clock=Date.now();
const server=local?createGameServer({now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3139);
const browser=await chromium.launch({channel:'chrome',headless:true}),contexts=[],checks=[],errors=[];
const prefix=(local?'':'public-')+'room-setup-20261024';
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function member(name){const context=await browser.newContext({viewport:{width:1440,height:900},extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return{context,page,name};}
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function geometry(page,capacity,phase){
 assert.equal(await page.locator('.room-setup-panel').count(),1);assert.equal(await page.locator('.room-setup-panel .seat-row').count(),capacity);assert.equal(await page.locator('main > .seat-management').count(),0);
 const r=await page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return {panel:box(document.querySelector('.room-setup-panel')),buttons:[...document.querySelectorAll('.room-setup-actions button')].map(box),stage:box(document.querySelector('.table-stage')),width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,body:box(document.querySelector('.room-setup-body'))};});
 assert(r.sw<=r.width+1&&r.sh<=r.height+1);assert(r.panel.x>=0&&r.panel.y>=r.stage.y&&r.panel.right<=r.width&&r.panel.bottom<=r.stage.bottom+1);assert(r.body.height>70,'seat list must retain a usable internal viewport');
 for(const b of r.buttons)assert(b.x>=r.panel.x&&b.y>=r.panel.y&&b.right<=r.panel.right+1&&b.bottom<=r.panel.bottom+1&&b.height>=36,JSON.stringify(r));
 pass('central panel and fixed actions fit viewport',{capacity,phase,width:r.width,height:r.height});
}
try{
 for(const n of [2,3,4,5,6]){
  const host=await member('开局面板验收');const res=await host.context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:n,nickname:host.name}});assert(res.ok());host.room=(await res.json()).snapshot.public.roomId;
  await host.page.goto(`${base}/room/${host.room}`);await host.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();await host.page.setViewportSize({width:390,height:844});
  let guest=null;if(n===6){guest=await member('同桌好友');guest.room=host.room;const joined=await guest.context.request.post(`${base}/api/rooms/${host.room}/join`,{data:{actionId:randomUUID(),roomId:host.room,requestedSeat:5,nickname:guest.name}});assert(joined.ok());await guest.page.goto(`${base}/room/${guest.room}`);await guest.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();assert.equal(await guest.page.getByRole('button',{name:/设为 AI|移除座位/}).count(),0);assert(await guest.page.getByRole('button',{name:'开始牌局',exact:true}).isDisabled());pass('non-host sees the shared seats but has no AI controls or start authority');await guest.page.getByRole('button',{name:'准备好了',exact:true}).click();await guest.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();await host.page.locator('.seat-row').filter({hasText:guest.name}).getByText('真人 · 已准备',{exact:true}).waitFor();}
  for(let seat=2;seat<=n-(guest?1:0);seat++){await host.page.getByRole('button',{name:`将座位 ${seat} 设为 AI`,exact:true}).click();await host.page.getByRole('button',{name:`移除座位 ${seat} 的 AI，留给朋友`,exact:true}).waitFor();}
  await host.page.getByRole('button',{name:'移除座位 2 的 AI，留给朋友',exact:true}).click();await host.page.getByRole('button',{name:'将座位 2 设为 AI',exact:true}).waitFor();await host.page.getByRole('button',{name:'将座位 2 设为 AI',exact:true}).click();await host.page.getByRole('button',{name:'移除座位 2 的 AI，留给朋友',exact:true}).waitFor();
  await geometry(host.page,n,'LOBBY');assert.equal((await snapshot(host)).public.players.filter(p=>p.isBotSeat).length,n-(guest?2:1));pass('central seat list assigns/removes/reassigns AI with authoritative updates',{capacity:n});
  if(guest){await wait(async()=>await guest.page.locator('.room-setup-panel .seat-person strong').filter({hasText:'AI'}).count()===4);for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,480],[667,375],[844,390]]){await host.page.setViewportSize({width,height});await host.page.waitForTimeout(100);await geometry(host.page,n,'LOBBY');if([1440,390,667].includes(width))await host.page.screenshot({path:`docs/evidence/${prefix}-${width}.png`});}await guest.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}
  await host.page.getByRole('button',{name:'准备好了',exact:true}).click();await host.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();await host.page.getByRole('button',{name:'开始牌局',exact:true}).click();await host.page.locator('.room-setup-panel').waitFor({state:'hidden'});assert.equal(await host.page.locator('.seat-management').count(),0);assert([13,14].includes((await snapshot(host)).private.hand.length));pass('ready/start uses the same authoritative controller and removes the setup panel',{capacity:n});
  if(guest){await guest.page.close();await wait(async()=> (await snapshot(host)).legalActions.includes('END_UNSCORED'));}
  await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await host.page.getByRole('button',{name:'准备下一局',exact:true}).waitFor();
  if(n===6){for(const [width,height] of [[1440,900],[390,844],[320,480],[667,375]]){await host.page.setViewportSize({width,height});await host.page.waitForTimeout(100);await geometry(host.page,n,'ROUND_FINISHED');}}
  await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.context.close();if(guest)await guest.context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),scope:'real Chrome, HTTP/Socket.IO and SQLite; only private verification rooms',checks,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
