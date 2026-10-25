/** Actual HU requests/playback. Local provider is an explicitly synthetic WAV lifecycle fixture. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {encodeWav} from '../apps/server/speech-audio.ts';
import {gameTool,rejectReview} from './game-ui-tools.mjs';
const local=!process.env.PUBLIC_ORIGIN,base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3174',version=JSON.parse(await readFile('package.json')).version,prefix=process.env.EVIDENCE_PREFIX??`${local?'':'public-'}hu-speech-status-${version}`;
await mkdir('Codex-Temp',{recursive:true});await mkdir('docs/evidence',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/hu-speech-status-'));
const samples=Int16Array.from({length:24000*3},(_,i)=>Math.round(Math.sin(i*2*Math.PI*220/24000)*5000));
const server=local?createGameServer({dbPath:join(dir,'game.sqlite'),publicOrigin:base,staticDir:resolve('dist/web'),speech:{directory:join(dir,'speech'),synthesize:async()=>{await new Promise(r=>setTimeout(r,1000));return encodeWav(samples);}}}):null;if(server)await server.listen(3174);
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']}),clients=[],checks=[],errors=[];let room;
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async fn=>{for(let i=0;i<800;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('condition timeout');};
const snap=async p=>(await p.context.request.get(`${base}/api/rooms/${room}/snapshot`)).json();
const status=p=>p.page.locator('.hu-speech-status');
const stage=async(p,value)=>wait(async()=>await status(p).getAttribute('data-stage')===value);
const voices=p=>p.page.evaluate(()=>window.__huVoice);
const note=p=>p.page.getByRole('button',{name:'评审声音设置',exact:true});
async function panel(p){const replay=p.page.getByRole('button',{name:'朗读胡牌句子',exact:true});if(!await replay.isVisible())await note(p).click();return replay;}
async function cleanup(){if(!room||clients.length!==2)return;for(const p of clients){if(p.page.isClosed())continue;const e=await snap(p);if(e.legalActions.includes('VOTE'))await rejectReview(p.page);const back=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await back.isVisible())await back.click();}await wait(async()=> (await snap(clients[0])).public.phase.kind!=='HU_VOTE');const e=await snap(clients[0]),host=clients.find(p=>p.id===e.public.hostId);assert(host,'own host');for(const p of clients)if(p!==host&&!p.page.isClosed())await p.page.close();let s;await wait(async()=>{s=await snap(host);return s.legalActions.includes('END_UNSCORED')||s.legalActions.includes('CLOSE_ROOM')||s.public.phase.kind==='ROOM_CLOSED';});if(s.public.phase.kind==='ROOM_CLOSED')return;if(s.legalActions.includes('END_UNSCORED')){await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROUND_FINISHED');}await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROOM_CLOSED');}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:i?390:1280,height:i?844:800},hasTouch:true,extraHTTPHeaders:{Origin:base}});
  await context.addInitScript(()=>{
   localStorage.setItem('hanz-speech','on');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));localStorage.setItem('hanz-music-v1',JSON.stringify({enabled:false,volume:.25}));
   window.__huVoice={stages:[],starts:[],requests:0};
   const start=AudioBufferSourceNode.prototype.start,fetch=window.fetch;
   AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>.3)window.__huVoice.starts.push({duration:this.buffer.duration,at:performance.now()});return start.apply(this,args);};
   window.fetch=function(input,...args){const u=typeof input==='string'?input:input.url;if(u.includes('/speech/hu/'))window.__huVoice.requests++;return fetch.call(this,input,...args);};
   let last='';new MutationObserver(()=>{const el=document.querySelector('.hu-speech-status'),s=el?.dataset.stage;if(s&&s!==last){window.__huVoice.stages.push({stage:s,text:el.textContent,at:performance.now()});last=s;}}).observe(document,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-stage']});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));const p={context,page};clients.push(p);
  const r=await context.request.post(i?`${base}/api/rooms/${room}/join`:base+'/api/rooms',{data:i?{roomId:room,requestedSeat:i,nickname:'语音状态验收2',actionId:randomUUID()}:{capacity:2,nickname:'语音状态验收1',actionId:randomUUID()}});assert(r.ok(),await r.text());if(!i)room=(await r.json()).snapshot.public.roomId;p.id=(await snap(p)).private.playerId;
  await writeFile(`Codex-Temp/${prefix}-${i}-identity.json`,JSON.stringify(await context.storageState()),{mode:0o600});await writeFile(`Codex-Temp/${prefix}-room.txt`,room,{mode:0o600});
  await page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'准备好了',exact:true}).click();await page.getByRole('button',{name:'取消准备',exact:true}).waitFor();
 }
 await clients[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(clients[0])).public.phase.kind==='TURN_ACTION');const e=await snap(clients[0]),actor=clients.find(p=>p.id===e.public.phase.actorId),voter=clients.find(p=>p!==actor);
 await actor.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await actor.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();
 for(const p of clients){await stage(p,'complete');const a=await voices(p);assert.equal(a.requests,1);assert.equal(a.starts.length,1);for(const s of ['preparing','playing','complete'])assert(a.stages.some(v=>v.stage===s),JSON.stringify(a));assert(a.starts[0].duration>.3);}
 pass('new public HU proposal shows preparing, real decoded playback and completion on both players',{audio:await Promise.all(clients.map(voices))});
 await voter.page.locator('.hu-review-dialog:not(.intro)').waitFor();await rejectReview(voter.page);await wait(async()=> (await snap(actor)).public.phase.kind==='TURN_ACTION');await actor.page.waitForTimeout(500);
 for(const p of clients){await stage(p,'complete');assert.equal((await voices(p)).requests,1);}pass('rejected same proposal retains completion and never automatically replays');
 for(const [w,h]of [[320,480],[390,844],[667,375],[1280,720]]){await actor.page.setViewportSize({width:w,height:h});await actor.page.waitForTimeout(180);const g=await actor.page.locator('.hu-review-heading').evaluate(el=>{const r=el.getBoundingClientRect(),s=el.querySelector('.hu-speech-status'),n=el.querySelector('.review-audio-toggle'),a=s.getBoundingClientRect(),b=n.getBoundingClientRect();return{inside:a.left>=r.left&&b.right<=r.right+1&&a.top>=r.top&&a.bottom<=r.bottom+1,apart:a.right<=b.left,clipped:s.scrollWidth>s.clientWidth+1,note:{w:b.width,h:b.height}};});assert(g.inside&&g.apart&&!g.clipped,JSON.stringify(g));await actor.page.screenshot({path:`docs/evidence/${prefix}-${w}x${h}.png`});}pass('status fits beside square note at phone portrait, short landscape and desktop widths');
 await actor.page.setViewportSize({width:1280,height:800});await(await panel(actor)).click();await stage(actor,'playing');await stage(actor,'complete');assert.equal((await voices(actor)).starts.length,2);pass('explicit replay reuses same proposal and traverses real playback states');
 // Explicit transport fault; no successful audio response is fabricated.
 await actor.page.route('**/speech/hu/*',route=>route.abort('failed'));await(await panel(actor)).click();await stage(actor,'failed');assert.equal((await voices(actor)).starts.length,2);await actor.page.unroute('**/speech/hu/*');await(await panel(actor)).click();await stage(actor,'complete');assert.equal((await voices(actor)).starts.length,3);pass('injected network failure shows failure; explicit retry plays actual server audio');
 // Delay actual response, then mute; releasing it cannot resurrect playback/status.
 let requested=false,release;const gate=new Promise(r=>release=r);await actor.page.route('**/speech/hu/*',async route=>{const response=await route.fetch();requested=true;await gate;await route.fulfill({response}).catch(()=>{});});await(await panel(actor)).click();await wait(()=>requested);await stage(actor,'preparing');await actor.page.getByRole('button',{name:'关闭语音',exact:true}).click();await stage(actor,'disabled');release();await actor.page.waitForTimeout(800);assert.equal((await voices(actor)).starts.length,3);await actor.page.unroute('**/speech/hu/*');await actor.page.getByRole('button',{name:'开启语音',exact:true}).click();await stage(actor,'idle');await actor.page.waitForTimeout(300);assert.equal((await voices(actor)).starts.length,3);pass('muting cancels pending real response; late completion and re-enable cannot replay or overwrite status');
 await cleanup();assert((await snap(clients[0])).public.players.every(p=>p.wins===0));pass('own private test room closed unscored');assert.deepEqual(errors,[]);
 await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),scope:local?'real SQLite, two Chromium clients and actual server route; explicitly synthetic tone WAV provider for deterministic lifecycle, not Aliyun quality':'real HTTPS/WSS, configured Qwen sentence audio decoded and played; declared transport-failure and actual-response-delay cancellation cases; viewport simulation, not physical Safari',checks,errors},null,2)+'\n');
}catch(e){for(const [i,p]of clients.entries())if(!p.page.isClosed())await p.page.screenshot({path:`Codex-Temp/hu-speech-status-failure-${i}.png`}).catch(()=>{});throw e;}finally{try{await cleanup();if((await snap(clients[0])).public.phase.kind==='ROOM_CLOSED')for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}-${i}-identity.json`,{force:true});}catch(e){console.error('Own room cleanup requires saved identity:',e.message);}await browser.close();await server?.close();if(local)await rm(dir,{recursive:true,force:true});}
