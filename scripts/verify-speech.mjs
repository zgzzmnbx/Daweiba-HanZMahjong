import {snapshot as engineSnapshot} from '../packages/engine/index.ts';
import {decodeWav} from '../apps/server/speech-audio.ts';
import {hashAdminPassword} from '../apps/server/admin-auth.ts';
/** Real browser UI and Socket.IO verification; isolated local DB, or own private rooms on PUBLIC_ORIGIN. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const base='http://127.0.0.1:3140',local=true;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/review-browser-'));
let clock=Date.now();
const server=local?createGameServer({adminPasswordHash:await hashAdminPassword('records-ui-test-password'),now:()=>clock,automaticTimers:false,speech:{directory:process.env.SPEECH_CACHE_DIR??join(dir,'audio'),apiKey:process.env.DASHSCOPE_API_KEY_FILE?(await readFile(process.env.DASHSCOPE_API_KEY_FILE,'utf8')).trim():undefined},dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3140);
const browser=await chromium.launch({channel:'chrome',headless:true});const contexts=[],rooms=[],errors=[],checks=[];
const applicationVersion=JSON.parse(await readFile('package.json','utf8')).version;const prefix=`${local?'':'public-'}speech-${applicationVersion}`;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<100;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('state wait timed out');};
async function snapshot(p){const r=await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`);assert(r.ok());return r.json();}
async function member(nickname,viewport={width:1440,height:900},reducedMotion='no-preference'){
 const context=await browser.newContext({viewport,reducedMotion,extraHTTPHeaders:{Origin:base}});contexts.push(context);const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>{window.__audioStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>=1)window.__audioStarts.push({duration:this.buffer.duration,at:Date.now()});return start.apply(this,args);};});return {context,page,nickname};
}
async function setup(options=[{},{}]){
 const ps=[];for(let i=0;i<options.length;i++)ps.push(await member(`亮相验收${i+1}`,options[i].viewport,options[i].reducedMotion));
 const created=await ps[0].context.request.post(`${base}/api/rooms`,{data:{actionId:randomUUID(),capacity:ps.length,nickname:ps[0].nickname}});assert(created.ok());const r=await created.json();const room=r.snapshot.public.roomId;
 for(const [i,p] of ps.entries()){p.room=room;if(i){const joined=await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:p.nickname}});assert(joined.ok());}await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snapshot(p)).private.playerId;}
 rooms.push(ps);for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snapshot(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function closeDialog(p){await p.page.waitForTimeout(100);const button=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await button.isVisible())await button.click();}
async function closeRoom(ps){for(const p of ps){if(p.page.isClosed())continue;const s=await snapshot(p);if(s.legalActions.includes('VOTE'))await p.page.getByRole('button',{name:'意思成立',exact:true}).click();}await wait(async()=> (await snapshot(ps[0])).public.phase.kind!=='HU_VOTE');for(const p of ps)if(!p.page.isClosed())await closeDialog(p);for(const p of ps.slice(1))await p.page.close();const host=ps[0];if(host.page.isClosed())return;let s=await snapshot(host);if(s.legalActions.includes('END_UNSCORED')){await (await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snapshot(host)).public.phase.kind==='ROUND_FINISHED');}s=await snapshot(host);if(s.legalActions.includes('CLOSE_ROOM')){await (await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snapshot(host)).public.phase.kind==='ROOM_CLOSED');await host.page.close();}
async function replay(page){const settings=page.getByRole('button',{name:'评审声音设置',exact:true});if(await settings.isVisible()&&await settings.getAttribute('aria-expanded')==='false')await settings.click();return page.getByRole('button',{name:/^(朗读胡牌句子|重新朗读)$/});}
let adminPage;
try{
 const ps=await setup([{}, {viewport:{width:390,height:844}}]);let before=await snapshot(ps[0]),acting=ps.find(p=>p.id===before.public.phase.actorId),voter=ps.find(p=>p!==acting);
 const manifest=await(await acting.context.request.get(base+'/api/speech/tiles')).json();let tile=(await snapshot(acting)).private.hand.find(t=>manifest.ready.includes(t.char));assert(tile,'needs at least one existing real tile speech cache');
 await acting.page.locator(`[data-tile-id="${tile.tileId}"]`).click();await acting.page.waitForTimeout(200);assert.equal(await acting.page.evaluate(()=>window.__audioStarts.length),0);await acting.page.getByRole('button',{name:'出这张',exact:true}).click();await wait(async()=>await acting.page.evaluate(()=>window.__audioStarts.length>0)&&await voter.page.evaluate(()=>window.__audioStarts.length>0));let starts=await acting.page.evaluate(()=>window.__audioStarts);assert(Math.abs(starts.at(-1).duration-1.1)<.001);pass('actual committed discard reads cached Qwen tile audio on both players; selection is silent');
 await voter.page.getByRole('button',{name:'摸',exact:true}).click();await wait(async()=> (await snapshot(voter)).public.phase.kind==='TURN_ACTION');[acting,voter]=[voter,acting];tile=(await snapshot(acting)).private.hand[0];
 await (await gameTool(acting.page,'关闭游戏语音')).click();const count=starts.length;await acting.page.getByRole('button',{name:'关闭面板',exact:true}).click();await acting.page.locator(`[data-tile-id="${tile.tileId}"]`).click();await acting.page.waitForTimeout(200);assert.equal(await acting.page.evaluate(()=>window.__audioStarts.length),count);
 await (await gameTool(acting.page,'开启游戏语音')).click();await acting.page.getByRole('button',{name:'关闭面板',exact:true}).click();pass('game voice switch mutes without changing card commands or timer');
 await acting.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await acting.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await voter.page.getByRole('button',{name:'意思成立',exact:true}).waitFor();
 await wait(()=>acting.page.evaluate(n=>window.__audioStarts.length>n,count));starts=await acting.page.evaluate(()=>window.__audioStarts);assert(starts.at(-1).duration>1.1);const proposal=(await snapshot(acting)).public.phase.proposal;
 const audio=await acting.context.request.post(`${base}/api/rooms/${acting.room}/speech/hu/${proposal.proposalId}`,{data:{text:'ignored client text'}});assert(audio.ok());const samples=decodeWav(Buffer.from(await audio.body()));assert(samples.length>24000);
 pass('new authoritative HU proposal triggers real Qwen full-sentence synthesis and decoded playback',{durationMs:Math.round(samples.length/24)});
 const beforeDeadline=(await snapshot(acting)).public.phase.deadline.endsAt;
 await(await replay(acting.page)).click();await wait(async()=>await acting.page.evaluate(()=>window.__audioStarts.length)>starts.length);assert.equal((await snapshot(acting)).public.phase.deadline.endsAt,beforeDeadline);pass('replay uses durable sentence cache and never extends review deadline');
 await acting.page.reload();await acting.page.locator('.hu-review-dialog[open]').waitFor();await acting.page.waitForTimeout(200);assert.equal(await acting.page.evaluate(()=>window.__audioStarts.length),0);pass('refresh does not auto-read old HU proposals');
 await(await replay(acting.page)).click();await wait(()=>acting.page.evaluate(()=>window.__audioStarts.length>0));
 const admin=await browser.newContext({extraHTTPHeaders:{Origin:base}});contexts.push(admin);assert((await admin.request.post(base+'/api/admin/login',{data:{password:'records-ui-test-password'}})).ok());adminPage=await admin.newPage();adminPage.on('pageerror',e=>errors.push(e.message));await adminPage.goto(base);await adminPage.getByRole('button',{name:'管理员模式',exact:true}).click();await adminPage.getByRole('button',{name:'麻将字库',exact:true}).click();const tag=adminPage.getByRole('button',{name:new RegExp('^试听 . 的语音$')}).first();await tag.waitFor();await tag.click();
 await wait(()=>adminPage.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='播放中')));await wait(()=>adminPage.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='♪ 语音')));pass('deck editor marks existing audio and plays real WAV from a user gesture');
 for(const [width,height] of [[1440,900],[390,844],[320,480],[667,375]]){await adminPage.setViewportSize({width,height});await adminPage.waitForTimeout(100);const d=await adminPage.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));assert(d.sw<=width+1&&d.sh<=height+1);await adminPage.screenshot({path:`docs/evidence/${prefix}-${width}.png`});}pass('audio controls and deck tags stay in four viewport sizes with internal scrolling');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'real cached Qwen tile voice + live Qwen authoritative HU sentence; Chrome HTMLAudio/WebAudio decoding and playback, HTTP/Socket/SQLite',checks,errors},null,2)+'\n');
}catch(error){await adminPage?.screenshot({path:'Codex-Temp/speech-ui-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
