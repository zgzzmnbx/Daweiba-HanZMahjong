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
 return {server,clients,setNow:(value:number)=>now=value,async close(){for(const c of clients)c.socket.disconnect();await server.close();rmSync(dir,{recursive:true,force:true});}};
}

test('HTTP/WSS delegation is persisted atomically, cancelled without resetting human time, and idempotent across retries',async()=>{
 const f=await fixture(3);try{
  const e=await f.clients[0].snapshot(),actor=f.clients.find(c=>c.id===e.public.phase.actorId);
  f.setNow(1000);f.server.store.failNextCommit=true;
  assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).error,'PERSISTENCE_UNAVAILABLE');
  assert.equal((await actor.snapshot()).public.players.find((p:any)=>p.playerId===actor.id).autoPlay,undefined);
  assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).ok,true);
  let current=await actor.snapshot();assert.equal(current.private.controlEpoch,e.private.controlEpoch+1);
  assert.equal(current.public.phase.deadline.endsAt,6000);
  assert.equal(f.server.store.load()[0].public.players.find(p=>p.playerId===actor.id)!.autoPlay,true);
  assert(!current.legalActions.includes('DISCARD'));assert.equal(current.public.suspension.kind,'RUNNING');
  f.setNow(2000);assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:false})).ok,true);
  current=await actor.snapshot();assert.equal(current.public.phase.deadline.endsAt,120000);assert(current.legalActions.includes('DISCARD'));
  assert.equal(f.server.store.load()[0].public.players.find(p=>p.playerId===actor.id)!.autoPlay,false);
  f.setNow(6000);await f.server.tick();assert.equal((await actor.snapshot()).public.discards.length,0);
  f.setNow(7000);assert.equal((await actor.send({kind:'SET_AUTOPLAY',enabled:true})).ok,true);
  f.setNow(11999);await f.server.tick();assert.equal((await actor.snapshot()).public.discards.length,0);
  f.setNow(12000);await f.server.tick();current=await actor.snapshot();assert.equal(current.public.discards.length,1);assert.equal(current.public.lastAutomaticDiscard.reason,'BOT');
 }finally{await f.close();}
});
