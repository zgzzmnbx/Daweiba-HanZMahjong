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
test('HTTP/WebSocket/SQLite 2–6 seats on three decks persist disjoint POS openings, private hands and unchanged draw authority',async()=>{
 for(const deck of [initialDeck,fixed,suzhi])for(let n=2;n<=6;n++){
  const t=await table(n,deck.entries);try{assert((await t.clients[0].send({kind:'START_ROUND'})).ok);const seen=new Set<string>();let actor=0;
   for(let seat=0;seat<n;seat++){const e=await t.clients[seat].snapshot();assert.equal(e.public.rulesVersion,'1.8.0');assert.equal(e.private.playerId,e.public.players[seat].playerId);if(e.public.phase.actorId===e.private.playerId)actor=seat;const chars=e.private.draft.orderedTileIds.slice(0,3).map((id:string)=>e.private.hand.find((x:any)=>x.tileId===id).char);assert(isNominalTile(chars[0]));assert.equal(tilePartOfSpeech(chars[1]),'verb');assert(isNominalTile(chars[2]));for(const tile of e.private.hand){assert(!seen.has(tile.tileId));seen.add(tile.tileId);}assert(!JSON.stringify(e.public).includes('orderedTileIds'));}
   const g=t.server.games.get(t.room)!,persisted=t.server.store.load().find(g=>g.public.roomId===t.room)!;assert.deepEqual(encodeGame(persisted),encodeGame(g));assert.equal(g.cursor,n*13+1);assertGame(g);
   let e=await t.clients[actor].snapshot();assert((await t.clients[actor].send({kind:'DISCARD',tileId:e.private.hand.at(-1).tileId})).ok);const next=(actor+1)%n;e=await t.clients[next].snapshot();assert((await t.clients[next].send({kind:'RESPOND',responseWindowId:e.public.phase.responseWindowId,response:'PASS'})).ok);assert.equal(t.server.games.get(t.room)!.cursor,n*13+2);assertGame(t.server.games.get(t.room)!);
  }finally{await t.close();}
 }
});
test('an unsupported deck sends an actionable START error without a partial deal; later deck repair can start',async()=>{
 const copies={'2':100,'3':100,'4':100,'5':100,'6':100},t=await table(2,[{char:'的',copiesByPlayers:copies}]);try{
  const before=encodeGame(t.server.games.get(t.room)!),result=await t.clients[0].send({kind:'START_ROUND'});assert.equal(result.code,'INSUFFICIENT_OPENING_POS');assert.deepEqual(encodeGame(t.server.games.get(t.room)!),before);assert.equal((await t.clients[0].snapshot()).public.phase.kind,'LOBBY');
  t.server.store.deckSets.save('classic',1,'已补词性',initialDeck.entries,0,'fixture');assert((await t.clients[0].send({kind:'START_ROUND'})).ok);assert.equal((await t.clients[0].snapshot()).public.rulesVersion,'1.8.0');
 }finally{await t.close();}
});
test('failed persistence rolls back dealing/RNG; same action retry commits one exact opening and never deals twice',async()=>{
 const t=await table(2);try{const e=await t.clients[0].snapshot(),c={kind:'START_ROUND',roomId:t.room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,expectedStateVersion:e.public.stateVersion,controlEpoch:e.private.controlEpoch,actionId:randomUUID()},before=encodeGame(t.server.games.get(t.room)!);
  t.server.store.failNextCommit=true;assert.equal((await t.clients[0].send({},c)).error,'PERSISTENCE_UNAVAILABLE');assert.deepEqual(encodeGame(t.server.games.get(t.room)!),before);const accepted=await t.clients[0].send({},c);assert(accepted.ok);const once=encodeGame(t.server.games.get(t.room)!);assert.deepEqual(await t.clients[0].send({},c),accepted);assert.deepEqual(encodeGame(t.server.games.get(t.room)!),once);
 }finally{await t.close();}
});
