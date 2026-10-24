import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';
import {createGameServer} from '../../apps/server/server';
const origin='http://thinking.test';
async function fixture(capacity:number,bots=false){
 const dir=mkdtempSync(join(tmpdir(),'thinking-'));let now=0;
 const server=createGameServer({dbPath:join(dir,'game.sqlite'),publicOrigin:origin,automaticTimers:false,now:()=>now});await server.listen(0);
 const url=`http://127.0.0.1:${(server.http.address() as any).port}`,clients:any[]=[];
 let room='';
 async function client(seat:number){
  let cookie='';const request=async(path:string,body?:unknown)=>{const r=await fetch(url+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie')!.split(';')[0];assert.equal(r.status,200);return r.json();};
  if(!seat){const r=await request('/api/rooms',{capacity,nickname:`真人${seat}`,actionId:randomUUID()});room=r.snapshot.public.roomId;}else await request(`/api/rooms/${room}/join`,{roomId:room,requestedSeat:seat,nickname:`真人${seat}`,actionId:randomUUID()});
  const socket=io(url,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:origin,Cookie:cookie}});
  await new Promise<void>((resolve,reject)=>{socket.on('message',e=>{if(e.type==='RESYNC')resolve();});socket.once('connect_error',reject);});
  const snapshot=()=>request(`/api/rooms/${room}/snapshot`);
  const send=async(payload:any)=>{const e=await snapshot();return socket.timeout(2000).emitWithAck('message',{type:'COMMAND',command:{...payload,roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,controlEpoch:e.private.controlEpoch,expectedStateVersion:e.public.stateVersion,actionId:randomUUID()}});};
  const member={seat,socket,snapshot,send,id:(await snapshot()).private.playerId};clients.push(member);return member;
 }
 try{
  for(let i=0;i<(bots?1:capacity);i++)await client(i);
  if(bots)for(let seat=1;seat<capacity;seat++)assert.equal((await clients[0].send({kind:'ASSIGN_BOT',seat})).ok,true);
  for(const c of clients)assert.equal((await c.send({kind:'READY',ready:true})).ok,true);
  assert.equal((await clients[0].send({kind:'START_ROUND'})).ok,true);
 }catch(e){for(const c of clients)c.socket.disconnect();await server.close();rmSync(dir,{recursive:true,force:true});throw e;}
 return {server,clients,setNow:(value:number)=>now=value,async close(){for(const c of clients)c.socket.disconnect();if(server.store.db.isOpen)await server.close();rmSync(dir,{recursive:true,force:true});}};
}

test('HTTP/WSS delegation is persisted atomically, cancelled without resetting human time, and idempotent across retries',async()=>{
 const f=await fixture(3);try{
  const e=await f.clients[0].snapshot(),actor=f.clients.find(c=>c.id===e.public.phase.actorId);
  f.setNow(1000);f.server.store.failNextCommit=true;
  assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).error,'PERSISTENCE_UNAVAILABLE');
  assert.equal((await actor.snapshot()).public.players.find((p:any)=>p.playerId===actor.id).autoPlay,undefined);
  assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).ok,true);
  let current=await actor.snapshot();assert.equal(current.private.controlEpoch,e.private.controlEpoch+1);
  assert.equal(current.public.phase.deadline.endsAt,4000);
  assert.equal(f.server.store.load()[0].public.players.find(p=>p.playerId===actor.id)!.autoPlay,true);
  assert(!current.legalActions.includes('DISCARD'));assert.equal(current.public.suspension.kind,'RUNNING');
  f.setNow(2000);assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:false})).ok,true);
  current=await actor.snapshot();assert.equal(current.public.phase.deadline.endsAt,120000);assert(current.legalActions.includes('DISCARD'));
  assert.equal(f.server.store.load()[0].public.players.find(p=>p.playerId===actor.id)!.autoPlay,false);
  f.setNow(6000);await f.server.tick();assert.equal((await actor.snapshot()).public.discards.length,0);
  f.setNow(7000);assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).ok,true);
  f.setNow(9999);await f.server.tick();assert.equal((await actor.snapshot()).public.discards.length,0);
  f.setNow(10000);await f.server.tick();current=await actor.snapshot();assert.equal(current.public.discards.length,1);assert.equal(current.public.lastAutomaticDiscard.reason,'BOT');
 }finally{await f.close();}
});

test('real sockets borrow non-previous-seat discard without listening, atomically and with 14-tile candidate',async()=>{
 const f=await fixture(3);try{
  const initial=await f.clients[0].snapshot(),actor=f.clients.find(c=>c.id===initial.public.phase.actorId),other=f.clients[(actor.seat+2)%3],next=f.clients[(actor.seat+1)%3];
  assert(!initial.legalActions.includes('SET_LISTENING'));assert.equal((await actor.send({kind:'SET_LISTENING',enabled:true})).code,'PHASE_CLOSED');assert.equal((await actor.send({kind:'DISCARD',tileId:(await actor.snapshot()).private.hand[0].tileId})).ok,true);
  const responseWindowId=(await other.snapshot()).public.phase.responseWindowId;
  f.server.store.failNextCommit=true;assert.equal((await other.send({kind:'RESPOND',responseWindowId,response:'HU'})).error,'PERSISTENCE_UNAVAILABLE');assert.equal((await other.snapshot()).private.ownResponse,null);
  assert.equal((await other.send({kind:'RESPOND',responseWindowId,response:'HU'})).ok,true);assert.equal((await next.send({kind:'RESPOND',responseWindowId,response:'PASS'})).ok,true);
  const candidate=await other.snapshot();assert.equal(candidate.public.phase.kind,'HU_COMPOSE');assert.equal(candidate.public.phase.applicantId,other.id);assert.equal(candidate.private.hand.length,13);assert.equal(candidate.private.candidateDraft.sentence.orderedTileIds.length,14);assert.equal(f.server.store.load()[0].public.phase.kind,'HU_COMPOSE');
 }finally{await f.close();}
});

test('server startup persists removal of old flags while preserving hands and rule history',async()=>{
 const f=await fixture(3);let reopened:ReturnType<typeof createGameServer>|undefined;
 try{
  const g=f.server.games.values().next().value!;g.public.rulesVersion='1.5.0';(g.public.players[0] as any).listening=true;(g.public.players[1] as any).listening=false;
  f.server.store.commit(g,'LEGACY_LISTENING_FIXTURE',0);const hands=structuredClone([...g.players].map(([id,p])=>[id,p.hand,p.draft])),path=f.server.store.path;
  for(const c of f.clients)c.socket.disconnect();await f.server.close();
  reopened=createGameServer({dbPath:path,publicOrigin:origin,automaticTimers:false,now:()=>1000});
  const loaded=reopened.store.load()[0];assert.equal(loaded.public.rulesVersion,'1.5.1');assert(loaded.public.players.every(p=>!('listening' in p)));assert.deepEqual([...loaded.players].map(([id,p])=>[id,p.hand,p.draft]),hands);
  const raw=JSON.parse((reopened.store.db.prepare('SELECT data FROM room_snapshots').get() as any).data);assert(raw.public.players.every((p:any)=>!('listening' in p)));assert.equal(raw.public.rulesVersion,'1.5.1');
 }finally{await reopened?.close();await f.close();}
});
