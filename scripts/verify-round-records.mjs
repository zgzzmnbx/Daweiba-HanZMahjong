import {hashAdminPassword} from '../apps/server/admin-auth.ts';
/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base='http://127.0.0.1:3138',local=true;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
let clock=Date.now();
const server=local?createGameServer({adminPasswordHash:await hashAdminPassword('records-ui-test-password'),now:()=>clock,automaticTimers:false,dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3138);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=`${local?'':'public-'}round-records-${applicationVersion}`;
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
let adminPage;
try{
 const ps=await setup([{}, {viewport:{width:390,height:844}}]),before=await snapshot(ps[0]),acting=ps.find(p=>p.id===before.public.phase.actorId),voter=ps.find(p=>p!==acting);
 const admin=await browser.newContext({extraHTTPHeaders:{Origin:base}});contexts.push(admin);assert((await admin.request.post(base+'/api/admin/login',{data:{password:'records-ui-test-password'}})).ok());adminPage=await admin.newPage();adminPage.on('pageerror',e=>errors.push(e.message));await adminPage.goto(base);await adminPage.getByRole('button',{name:'管理员模式',exact:true}).click();await adminPage.getByRole('button',{name:'对局记录',exact:true}).click();await adminPage.locator('.admin-round-record').first().waitFor();
 const first=(await (await admin.request.get(base+'/api/admin/records')).json()).records[0];assert.equal(first.startedAt,clock);assert.equal(first.finishedAt,null);assert.equal(first.members.length,2);assert.equal(first.reason,null);pass('admin records tab shows actual frozen members and authoritative start timestamp for a running round');
 const draft=(await snapshot(acting)).private.draft,tiles=(await snapshot(acting)).private.hand,text=draft.orderedTileIds.map(id=>tiles.find(t=>t.tileId===id).char+(draft.commaAfterTileIds.includes(id)?'，':'')).join('');
 await acting.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await acting.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await voter.page.getByRole('button',{name:'意思成立',exact:true}).waitFor();clock+=1234;await voter.page.getByRole('button',{name:'意思成立',exact:true}).click();await wait(async()=> (await snapshot(acting)).public.phase.kind==='ROUND_FINISHED');
 await adminPage.getByRole('button',{name:'刷新对局记录',exact:true}).click();await adminPage.getByText(text,{exact:false}).first().waitFor();const done=(await (await admin.request.get(base+'/api/admin/records')).json()).records[0];assert.equal(done.finishedAt,clock);assert.equal(done.winningText,text);assert.equal(done.sentences.length,1);pass('completed real HU records exact finish time, members and all fourteen characters');
 for(const [width,height] of [[1440,900],[390,844],[320,480],[667,375]]){await adminPage.setViewportSize({width,height});await adminPage.waitForTimeout(100);const g=await adminPage.evaluate(()=>({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,dialog:(()=>{const r=document.querySelector('.admin-dialog').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()}));assert(g.scrollW<=width+1&&g.scrollH<=height+1);assert(g.dialog.x>=0&&g.dialog.y>=0&&g.dialog.right<=width+1&&g.dialog.bottom<=height+1);await adminPage.screenshot({path:`docs/evidence/${prefix}-${width}.png`,fullPage:false});pass(`${width}x${height} records dialog stays in viewport`,g);}
 assert.equal((await ps[0].context.request.get(base+'/api/admin/records')).status(),401);pass('ordinary real player session is rejected by the records endpoint');
 await admin.request.post(base+'/api/admin/logout',{data:{}});await adminPage.getByLabel('管理员密码',{exact:true}).waitFor();assert.equal(await adminPage.getByRole('region',{name:'管理员对局记录',exact:true}).count(),0);assert.equal(await adminPage.locator('.admin-round-record').count(),0);pass('revoked admin session clears rendered record data and returns to password entry');
 await closeRoom(ps);pass('own real verification room closed');assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'actual Chrome clients + real local HTTP/Socket/SQLite and controlled server clock; test-only admin password',checks,errors},null,2)+'\n');console.log('PASS',checks.length,'records UI flows');
}catch(error){await adminPage?.screenshot({path:'Codex-Temp/round-records-browser-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
