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
test('real HTTP/WSS/SQLite 2–6 human tables enforce two minutes and preserve next-seat-only drawing',async()=>{for(let n=2;n<=6;n++){const f=await fixture(n);try{const first=await f.clients[0].snapshot();assert.equal(first.public.rulesVersion,'1.7.0');assert.equal(first.public.phase.deadline.endsAt,120000);const actor=f.clients.find(c=>c.id===first.public.phase.actorId),other=f.clients.find(c=>c!==actor);const denied=await other.send({kind:'DISCARD',tileId:(await other.snapshot()).private.hand[0].tileId});assert.equal(denied.ok,false);assert.equal(denied.code,'NOT_ACTOR');f.setNow(119999);await f.server.tick();assert.equal((await actor.snapshot()).public.discards.length,0);f.setNow(120000);await f.server.tick();const e=await actor.snapshot(),cursor=f.server.games.get(e.public.roomId)!.cursor;assert.equal(e.public.lastAutomaticDiscard.reason,'TIMEOUT');assert(e.public.players.every((p:any)=>p.handCount===13));const respondents=f.clients.filter(c=>c.seat===(actor.seat+1)%n);for(let i=0;i<respondents.length;i++){assert.equal((await respondents[i].send({kind:'RESPOND',responseWindowId:e.public.phase.responseWindowId,response:'PASS'})).ok,true);if(i<respondents.length-1)assert.equal(f.server.games.get(e.public.roomId)!.cursor,cursor);}const next=await actor.snapshot();assert.equal(next.public.phase.actorId,f.clients[(actor.seat+1)%n].id);assert.equal(next.public.phase.deadline.endsAt,240000);assert.equal(f.server.games.get(e.public.roomId)!.cursor,cursor+1);assert.equal(f.server.store.load()[0].public.rulesVersion,'1.7.0');}finally{await f.close();}}});
test('real HTTP/WSS/SQLite designated AI on 2–6 seats acts at 1.5 seconds and never earlier',async()=>{for(let n=2;n<=6;n++){const f=await fixture(n,true);try{const c=f.clients[0];let e=await c.snapshot();if(e.public.phase.actorId===c.id){assert.equal((await c.send({kind:'DISCARD',tileId:e.private.hand[0].tileId})).ok,true);e=await c.snapshot();}assert(e.public.players.find((p:any)=>p.playerId===e.public.phase.actorId).isBotSeat);const before=e.public.discards.length;f.setNow(1499);await f.server.tick();assert.equal((await c.snapshot()).public.discards.length,before);f.setNow(1500);await f.server.tick();const after=await c.snapshot();assert.equal(after.public.discards.length,before+1);assert.equal(after.public.lastAutomaticDiscard.reason,'BOT');assert.equal(after.public.lastAutomaticDiscard.at,1500);}finally{await f.close();}}});
