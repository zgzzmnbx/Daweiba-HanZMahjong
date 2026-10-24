/** Real players/AI + public snapshots + cached Qwen WAV decoding/output. Own rooms only. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameTool} from './game-ui-tools.mjs';
const local=!process.env.PUBLIC_ORIGIN,base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3156',version=JSON.parse(await readFile('package.json','utf8')).version,prefix=process.env.EVIDENCE_PREFIX??`${local?'':'public-'}discard-speech-${version}`;
await mkdir('Codex-Temp',{recursive:true});const dir=await mkdtemp(resolve('Codex-Temp/discard-speech-'));let clock=Date.now();
const server=local?createGameServer({dbPath:join(dir,'game.sqlite'),staticDir:resolve('dist/web'),publicOrigin:base,automaticTimers:false,now:()=>clock,speech:{directory:process.env.SPEECH_CACHE_DIR??join(dir,'audio')}}):null;if(server)await server.listen(3156);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']}),contexts=[],rooms=[],checks=[],errors=[];
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS',name);};
const wait=async(fn)=>{for(let i=0;i<180;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('wait timed out');};
async function member(viewport={width:1280,height:800}){
 const context=await browser.newContext({viewport,extraHTTPHeaders:{Origin:base}});contexts.push(context);
 await context.addInitScript(()=>{
  localStorage.setItem('hanz-speech','on');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));
  window.__voice={words:[],starts:[],tracks:[],peak:0};
  const request=window.fetch,connect=AudioNode.prototype.connect,start=AudioBufferSourceNode.prototype.start;
  window.fetch=function(input,...args){const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);if(/^\/api\/speech\/tiles\/[^/]+\/[^/]+$/.test(u.pathname))window.__voice.words.push(decodeURIComponent(u.pathname.split('/').at(-1)));return request.call(this,input,...args);};
  AudioNode.prototype.connect=function(target,...args){if(this instanceof AudioBufferSourceNode&&target instanceof AudioDestinationNode){const analyser=this.context.createAnalyser();analyser.fftSize=2048;connect.call(this,analyser);connect.call(analyser,target);window.__voice.tracks.push(analyser);return target;}return connect.call(this,target,...args);};
  AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>=.9){const pcm=this.buffer.getChannelData(0);let hash=2166136261;for(let i=0;i<pcm.length;i+=37)hash=Math.imul(hash^Math.round(pcm[i]*32767),16777619);window.__voice.starts.push({duration:this.buffer.duration,hash:hash>>>0,at:performance.now()});}return start.apply(this,args);};
  setInterval(()=>{for(const a of window.__voice.tracks){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);for(const v of data)window.__voice.peak=Math.max(window.__voice.peak,Math.abs(v));}},16);
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));return{context,page};
}
const snap=async p=>(await p.context.request.get(`${base}/api/rooms/${p.room}/snapshot`)).json();
const audio=async p=>p.page.evaluate(()=>({words:window.__voice.words,starts:window.__voice.starts,peak:window.__voice.peak}));
const reset=async ps=>{for(const p of ps)await p.page.evaluate(()=>{window.__voice.words=[];window.__voice.starts=[];window.__voice.peak=0;});};
async function setup(capacity=3,humans=3){
 const ps=[];for(let i=0;i<humans;i++)ps.push(await member(i===1?{width:390,height:844}:undefined));
 const r=await ps[0].context.request.post(base+'/api/rooms',{data:{actionId:randomUUID(),capacity,nickname:'报牌语音验收1'}});assert(r.ok());const room=(await r.json()).snapshot.public.roomId;
 for(const [i,p]of ps.entries()){p.room=room;if(i)assert((await p.context.request.post(`${base}/api/rooms/${room}/join`,{data:{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:`报牌语音验收${i+1}`}})).ok());await p.page.goto(`${base}/room/${room}`);await p.page.getByRole('button',{name:'准备好了',exact:true}).waitFor();p.id=(await snap(p)).private.playerId;}
 rooms.push(ps);
 for(let i=humans;i<capacity;i++){await ps[0].page.getByRole('button',{name:`将座位 ${i+1} 设为 AI`,exact:true}).click();await ps[0].page.getByRole('button',{name:`移除座位 ${i+1} 的 AI，留给朋友`,exact:true}).waitFor();}
 for(const p of ps){await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await p.page.getByRole('button',{name:'取消准备',exact:true}).waitFor();}
 await ps[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(ps[0])).public.phase.kind==='TURN_ACTION');return ps;
}
async function observe(room){const p=await member({width:390,height:844});await p.page.goto(`${base}/watch/${room}`);await p.page.locator('.canvas-host canvas').waitFor();await p.page.keyboard.press('Shift');await p.page.waitForTimeout(100);assert.equal((await audio(p)).starts.length,0);return p;}
async function response(ps){
 let e=await snap(ps[0]);if(e.public.phase.kind!=='DISCARD_RESPONSE')return;
 for(const p of ps){e=await snap(p);if(e.legalActions.includes('RESPOND')){await p.page.getByRole('button',{name:/^(摸|过)$/}).click();await wait(async()=>{const s=await snap(p);return s.private.ownResponse==='PASS'||s.public.phase.kind!=='DISCARD_RESPONSE';});}}
 if(local){e=await snap(ps[0]);if(e.public.phase.kind==='DISCARD_RESPONSE'){clock=e.public.phase.deadline.endsAt;await server.tick();}}
 await wait(async()=> (await snap(ps[0])).public.phase.kind==='TURN_ACTION');
}
async function discard(ps,drag=false){
 const s=await snap(ps[0]),p=ps.find(p=>p.id===s.public.phase.actorId);assert(p);const tile=(await snap(p)).private.hand.find(t=>t.tileId!==(s.private?.forbiddenImmediateDiscardTileId));
 if(drag){await p.page.setViewportSize({width:390,height:844});await p.page.waitForTimeout(250);const r=await p.page.locator(`[data-tile-id="${tile.tileId}"]`).boundingBox(),z=await p.page.locator('.discard-drop-zone').boundingBox();await p.page.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.page.mouse.down();await p.page.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:12});await p.page.mouse.up();}
 else{await p.page.locator(`[data-tile-id="${tile.tileId}"]`).click();await p.page.getByRole('button',{name:'出这张',exact:true}).click();}
 await wait(async()=> (await snap(p)).public.discards.at(-1)?.tile.tileId===tile.tileId);return{p,tile};
}
async function heard(ps,char){
 await wait(async()=>{for(const p of ps){const a=await audio(p);if(a.starts.length!==1||a.peak<.001)return false;}return true;});
 const values=await Promise.all(ps.map(audio));for(const a of values){assert.deepEqual(a.words,[char]);assert.equal(a.starts.length,1);assert(Math.abs(a.starts[0].duration-1.1)<.001);}
 assert(values.every(a=>a.starts[0].hash===values[0].starts[0].hash));return values;
}
async function mute(p,on){await(await gameTool(p.page,on?'关闭游戏语音':'开启游戏语音')).click();await p.page.getByRole('button',{name:'关闭面板',exact:true}).click();}
async function close(ps){
 if(ps[0].page.isClosed())return;for(const p of ps.slice(1))if(!p.page.isClosed())await p.page.close();
 await wait(async()=>{const s=await snap(ps[0]);return s.legalActions.includes('END_UNSCORED')||s.legalActions.includes('CLOSE_ROOM')||s.public.phase.kind==='ROOM_CLOSED';});
 let s=await snap(ps[0]);if(s.legalActions.includes('END_UNSCORED')){await(await gameTool(ps[0].page,'结束本局（不计分）')).click();await ps[0].page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(ps[0])).public.phase.kind==='ROUND_FINISHED');}
 s=await snap(ps[0]);if(s.legalActions.includes('CLOSE_ROOM')){await(await gameTool(ps[0].page,'关闭房间')).click();await ps[0].page.getByRole('button',{name:'确认关闭',exact:true}).click();}await wait(async()=> (await snap(ps[0])).public.phase.kind==='ROOM_CLOSED');await ps[0].page.close();
}
try{
 const ps=await setup(),observer=await observe(ps[0].room),all=[...ps,observer];
 assert((await ps[0].context.request.get(base+'/api/speech/tiles')).ok());await reset(all);
 let state=await snap(ps[0]),actor=ps.find(p=>p.id===state.public.phase.actorId),tile=(await snap(actor)).private.hand[0];
 await actor.page.locator(`[data-tile-id="${tile.tileId}"]`).click();await actor.page.keyboard.press('Enter');await actor.page.waitForTimeout(250);for(const p of all){assert.deepEqual((await audio(p)).words,[]);assert.deepEqual((await audio(p)).starts,[]);}assert.equal((await snap(actor)).public.discards.length,0);pass('clicking and keyboard-selecting a private hand tile are silent for everyone');
 let event=await discard(ps);pass('button discard plays the same real Qwen WAV once on three players and observer',{char:event.tile.char,audio:await heard(all,event.tile.char)});await response(ps);await actor.page.waitForTimeout(1200);
 await reset(all);const editable=ps[0],id=(await snap(editable)).private.hand[0].tileId;await editable.page.locator(`[data-tile-id="${id}"]`).focus();await editable.page.keyboard.press('ArrowRight');await editable.page.waitForTimeout(750);for(const p of all)assert.equal((await audio(p)).starts.length,0);pass('draft save, repeated spectator polls and subsequent snapshots never repeat the discarded word');
 event=await discard(ps,true);pass('actual phone drag to table center speaks on all players and observer',{char:event.tile.char,audio:await heard(all,event.tile.char)});await response(ps);await actor.page.waitForTimeout(1200);
 await mute(ps[2],true);await reset(all);event=await discard(ps);await heard([ps[0],ps[1],observer],event.tile.char);assert.equal((await audio(ps[2])).starts.length,0);assert.deepEqual((await audio(ps[2])).words,[]);await response(ps);await mute(ps[2],false);await ps[2].page.waitForTimeout(250);assert.equal((await audio(ps[2])).starts.length,0);pass('per-player voice mute is respected; re-enabling does not replay missed discards');
 await ps[1].page.reload();await ps[1].page.locator('.game-shell').waitFor();await observer.page.reload();await observer.page.locator('.canvas-host canvas').waitFor();await ps[1].page.keyboard.press('Shift');await observer.page.keyboard.press('Shift');await ps[0].page.waitForTimeout(1250);assert.equal((await audio(ps[1])).starts.length,0);assert.equal((await audio(observer)).starts.length,0);pass('player restoration and anonymous observer reload establish silent baselines');
 await reset(all);event=await discard(ps);await heard(all,event.tile.char);await response(ps);await actor.page.waitForTimeout(1200);pass('the first genuine discard after restoration is heard by the restored player and observer');
 // A delayed real cache response must not finish playing after the listener mutes.
 const victim=ps[2];let requested=false;await victim.page.route('**/api/speech/tiles/*/*',async route=>{requested=true;const response=await route.fetch();await new Promise(r=>setTimeout(r,800));await route.fulfill({response}).catch(()=>{});});
 await reset(all);event=await discard(ps);await wait(()=>requested);await mute(victim,true);await heard([ps[0],ps[1],observer],event.tile.char);await victim.page.waitForTimeout(900);assert.equal((await audio(victim)).starts.length,0);await victim.page.unroute('**/api/speech/tiles/*/*');await mute(victim,false);await response(ps);pass('muting cancels a real in-flight audio response instead of starting it late');
 if(local){
  await ps[0].page.waitForTimeout(1200);await reset(all);const first=await discard(ps);await response(ps);const second=await discard(ps);await response(ps);
  await wait(async()=>{for(const p of all)if((await audio(p)).starts.length!==2)return false;return true;});
  for(const p of all){const a=await audio(p);assert.deepEqual(a.words,[first.tile.char,second.tile.char]);assert(a.starts[1].at-a.starts[0].at>=1000,'discard words must play in sequence');}pass('rapid consecutive discards queue in public order without cutting the first word short');
 }
 await observer.page.close();await close(ps);
 const aiPlayers=await setup(3,2),aiObserver=await observe(aiPlayers[0].room),aiAll=[...aiPlayers,aiObserver];
 for(let turn=0;turn<4;turn++){
  state=await snap(aiPlayers[0]);const who=state.public.players.find(p=>p.playerId===state.public.phase.actorId);if(who.isBotSeat)break;
  event=await discard(aiPlayers);await heard(aiAll,event.tile.char);await response(aiPlayers);await aiPlayers[0].page.waitForTimeout(1150);await reset(aiAll);
 }
 state=await snap(aiPlayers[0]);const ai=state.public.players.find(p=>p.playerId===state.public.phase.actorId);assert(ai.isBotSeat);await reset(aiAll);const previousCount=state.public.discards.length;
 if(local){clock=state.public.phase.deadline.endsAt;await server.tick();}
 await wait(async()=> (await snap(aiPlayers[0])).public.discards.length>previousCount);state=await snap(aiPlayers[0]);const aiDiscard=state.public.discards.at(-1);assert.equal(aiDiscard.playerId,ai.playerId);assert.equal(state.public.lastAutomaticDiscard.reason,'BOT');
 pass('designated AI authoritative discard is spoken once on both human players and observer',{char:aiDiscard.tile.char,audio:await heard(aiAll,aiDiscard.tile.char)});await response(aiPlayers);
 await aiPlayers[0].page.waitForTimeout(1200);state=await snap(aiPlayers[0]);const delegated=aiPlayers.find(p=>p.id===state.public.phase.actorId);assert(delegated);
 await(await gameTool(delegated.page,'主动 AI 托管')).click();await wait(async()=> (await snap(delegated)).public.players.find(p=>p.playerId===delegated.id).autoPlay===true);await reset(aiAll);state=await snap(delegated);const count=state.public.discards.length;
 if(local){clock=state.public.phase.deadline.endsAt;await server.tick();}await wait(async()=> (await snap(delegated)).public.discards.length>count);state=await snap(delegated);const delegatedDiscard=state.public.discards.at(-1);assert.equal(delegatedDiscard.playerId,delegated.id);
 pass('voluntary AI-controlled human discard is heard on all clients after the control epoch changes',{char:delegatedDiscard.tile.char,audio:await heard(aiAll,delegatedDiscard.tile.char)});await(await gameTool(delegated.page,'取消托管')).click();await response(aiPlayers);
 await aiObserver.page.close();await close(aiPlayers);pass('all verification-owned rooms closed without scoring or book entries');
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:local?'isolated SQLite + real Chrome players, AI and observer, read-only existing Qwen tile cache, controlled game clock':'actual HTTPS/WSS, real AI five-second deadline, Chrome decoded Qwen buffer hashes and live output analyser; no mocked audio or public data changes',checks,errors},null,2)+'\n');
}catch(error){await writeFile('Codex-Temp/discard-speech-failure.json',JSON.stringify({error:String(error),checks,errors},null,2));for(const [i,p] of contexts.flatMap(c=>c.pages()).entries()){await p.screenshot({path:`Codex-Temp/discard-speech-failure-${i}.png`}).catch(()=>{});console.log('failure surface',i,p.url(),await p.locator('.game-shell').count(),await p.locator('.notice,.connection-message,.hall-status').allTextContents());}throw error;
}finally{for(const ps of rooms)await close(ps).catch(()=>{});for(const c of contexts)await c.close();await browser.close();await server?.close();await rm(dir,{recursive:true,force:true});}
