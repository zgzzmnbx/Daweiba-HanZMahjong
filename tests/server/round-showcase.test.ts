import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {createGameServer} from '../../apps/server/server';
import {initialDeck} from '../../packages/engine/deck';
import {isNominalTile,tilePartOfSpeech} from '../../packages/engine/tile-pos';
import {assertGame,encodeGame} from '../../packages/engine/index';
import fixed from '../../【牌库】/默认麻将套组-配置-v1.0-【codex】.json';
import suzhi from '../../【牌库】/素质满满-配置-v2.0-【codex】.json';
const origin='http://opening.test';
async function table(capacity:number,entries=initialDeck.entries){
 const server=createGameServer({dbPath:':memory:',publicOrigin:origin,automaticTimers:false,now:()=>0});await server.listen(0);
 const url=`http://127.0.0.1:${(server.http.address() as any).port}`;const clients:{socket:Socket;request:(path:string,body?:unknown)=>Promise<any>;snapshot:()=>Promise<any>;send:(payload:any,command?:any)=>Promise<any>}[]=[];let room='';
 server.store.deckSets.save('classic',0,'词性验收',entries,0,'fixture');
 try{for(let seat=0;seat<capacity;seat++){
  let cookie='';const request=async(path:string,body?:unknown)=>{const r=await fetch(url+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie')!.split(';')[0];return r.json();};
  if(!seat)room=(await request('/api/rooms',{capacity,nickname:'词性'+seat,actionId:randomUUID()})).snapshot.public.roomId;else await request(`/api/rooms/${room}/join`,{roomId:room,requestedSeat:seat,nickname:'词性'+seat,actionId:randomUUID()});
  const socket=io(url,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:origin,Cookie:cookie}});
  await new Promise<void>((resolve,reject)=>{socket.once('connect_error',reject);socket.on('message',e=>{if(e.type==='RESYNC')resolve();});});
  const snapshot=()=>request(`/api/rooms/${room}/snapshot`),send=async(payload:any,c?:any)=>{const e=await snapshot();return socket.timeout(3000).emitWithAck('message',{type:'COMMAND',command:c??{roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,expectedStateVersion:e.public.stateVersion,controlEpoch:e.private.controlEpoch,actionId:randomUUID(),...payload}});};
  clients.push({socket,request,snapshot,send});
 }for(const c of clients)assert((await c.send({kind:'READY',ready:true})).ok);
 return{server,clients,get room(){return room;},async close(){for(const c of clients)c.socket.disconnect();await server.close();}};
 }catch(e){for(const c of clients)c.socket.disconnect();await server.close();throw e;}
}
test('showcases are authenticated, atomic with approval, durable, and archived without exposing next-round hands',async()=>{
 const t=await table(6);try{
  const url=`http://127.0.0.1:${(t.server.http.address() as any).port}`,path=`/api/rooms/${t.room}/showcases`;
  assert.notEqual((await fetch(url+path,{headers:{Origin:origin}})).status,200);
  assert((await t.clients[0].send({kind:'START_ROUND'})).ok);
  assert.deepEqual(await t.clients[0].request(path),{showcases:[]});
  const envelopes=await Promise.all(t.clients.map(c=>c.snapshot()));const actor=envelopes.findIndex(e=>e.private.playerId===e.public.phase.actorId),own=envelopes[actor];
  assert((await t.clients[actor].send({kind:'DECLARE_SELF_HU',sentence:{orderedTileIds:own.private.hand.map((t:any)=>t.tileId),commaAfterTileIds:[]}})).ok);
  assert.deepEqual(await t.clients[1].request(path),{showcases:[]});
  const voters=t.clients.filter((_,i)=>i!==actor),payload={kind:'VOTE',proposalId:(await t.clients[0].snapshot()).public.phase.proposal.proposalId,ballot:{choice:'APPROVE'}};
  // Strict majority of five is three; a failed deciding transaction must disclose nothing.
  for(const c of voters.slice(0,2))assert((await c.send(payload)).ok);
  const before=encodeGame(t.server.games.get(t.room)!);t.server.store.failNextCommit=true;
  assert.equal((await voters[2].send(payload)).error,'PERSISTENCE_UNAVAILABLE');assert.deepEqual(encodeGame(t.server.games.get(t.room)!),before);assert.deepEqual(await t.clients[0].request(path),{showcases:[]});
  assert((await voters[2].send(payload)).ok);
  // The engine waits for all frozen ballots, even once the majority is known.
  for(const c of voters.slice(3))if((await c.snapshot()).public.phase.kind==='HU_VOTE')assert((await c.send(payload)).ok);
  const album=(await t.clients[0].request(path)).showcases;assert.equal(album.length,1);assert.equal(album[0].hands.length,6);assert.equal(album[0].hands.at(-1).playerId,own.private.playerId);
  assert.deepEqual(t.server.store.load().find(g=>g.public.roomId===t.room)!.public.roundShowcase,album[0]);
  for(const c of t.clients)assert((await c.send({kind:'READY',ready:true})).ok);assert((await t.clients[0].send({kind:'START_ROUND'})).ok);
  const next=await t.clients[0].snapshot();assert.equal(next.public.roundShowcase,undefined);assert.deepEqual((await t.clients[1].request(path)).showcases,album);assert(!JSON.stringify(album).includes(next.private.hand[0].tileId));
 }finally{await t.close();}
});
