import {isAvatarId} from '../../packages/contracts/avatars';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {createGameServer,COOKIE} from '../../apps/server/server';
import {RETURN_COOKIE} from '../../apps/server/browser-return';
import {kickSeat,closeGame} from '../../packages/engine/index';
import type {PlayerId} from '../../packages/contracts/types';
const origin='http://return.test';
const delay=()=>new Promise(r=>setTimeout(r,20));
async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'browser-return-'));let clock=0;
 const options={dbPath:join(dir,'game.sqlite'),publicOrigin:origin,automaticTimers:false,now:()=>clock};
 let server=createGameServer(options);await server.listen(0);let url=`http://127.0.0.1:${(server.http.address() as any).port}`;
 const sockets:Socket[]=[];
 async function request(path:string,body?:unknown,cookie=''){
  const r=await fetch(url+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return{status:r.status,body:await r.json() as any,cookies:r.headers.getSetCookie(),cache:r.headers.get('cache-control')};
 }
 const cookie=(r:{cookies:string[]},name:string)=>r.cookies.find(s=>s.startsWith(name+'='))?.split(';')[0]??'';
 async function create(){const r=await request('/api/rooms',{actionId:randomUUID(),capacity:2,nickname:'原玩家',tableNumber:server.store.lobbyBindings().find(t=>!t.roomId)?.tableNumber});assert.equal(r.status,200);return{r,room:r.body.snapshot.public.roomId as string,pid:r.body.snapshot.private.playerId as PlayerId,session:cookie(r,COOKIE),proof:cookie(r,RETURN_COOKIE)};}
 async function open(header:string){const socket=io(url,{transports:['websocket'],extraHeaders:{Origin:origin,Cookie:header},reconnection:false});sockets.push(socket);await new Promise<void>((resolve,reject)=>{socket.once('connect',()=>resolve());socket.once('connect_error',reject);});await delay();return socket;}
 async function command(room:string,session:string,socket:Socket,payload:any){const e=(await request(`/api/rooms/${room}/snapshot`,undefined,session)).body;const ack=await socket.timeout(2000).emitWithAck('message',{type:'COMMAND',command:{...payload,actionId:randomUUID(),roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,controlEpoch:e.private.controlEpoch,expectedStateVersion:e.public.stateVersion}});assert.equal(ack.ok,true,JSON.stringify(ack));}
 const restore=(a:{room:string;proof:string},actionId=randomUUID(),header=a.proof)=>request(`/api/rooms/${a.room}/restore`,{actionId,roomId:a.room,proof:{kind:'BROWSER'}},header);
 return{get server(){return server;},request,cookie,create,open,command,restore,setNow(t:number){clock=t;},async restart(){sockets.forEach(s=>s.disconnect());await server.close();server=createGameServer(options);await server.listen(0);url=`http://127.0.0.1:${(server.http.address() as any).port}`;},async close(){sockets.forEach(s=>s.disconnect());await server.close();rmSync(dir,{recursive:true,force:true});}};
}
test('browser credential is HttpOnly, room-scoped, private and cannot be forged by nickname or seat',async()=>{
 const f=await fixture();try{const a=await f.create(),cookie=a.r.cookies.find(s=>s.startsWith(RETURN_COOKIE+'='))!;assert.match(cookie,new RegExp(`Path=/api/rooms/${a.room}`));assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Max-Age=2592000/);
 const own=await f.request(`/api/rooms/${a.room}/seats`,undefined,a.proof),stranger=await f.request(`/api/rooms/${a.room}/seats`);assert.equal(own.body.returnSeat,0);assert.equal(own.body.returnMethod,'BROWSER');assert.equal(stranger.body.returnSeat,null);assert.equal(stranger.body.returnMethod,null);assert.equal(own.cache,'no-store');assert.deepEqual(own.body.players.map(({avatarId,...p}:any)=>{assert(isAvatarId(avatarId));return p;}),[{seat:0,nickname:'原玩家',isBotSeat:false,isManaged:false}]);
 for(const header of ['',RETURN_COOKIE+'='+'A'.repeat(43)])assert.equal((await f.restore(a,randomUUID(),header)).status,403);
 assert.equal((await f.request(`/api/rooms/${a.room}/restore`,{actionId:randomUUID(),roomId:a.room,proof:{kind:'BROWSER'},nickname:'原玩家',seat:0})).status,403);
 const pub=JSON.stringify([a.r.body.snapshot,own.body,stranger.body,(await f.request('/api/lobby')).body]);for(const secret of [a.proof.split('=')[1],'browserReturnHash',f.server.games.get(a.room)!.players.get(a.pid)!.browserReturnHash!])assert(!pub.includes(secret));
 }finally{await f.close();}
});
test('disconnect -> AI -> original browser restores the same tiles/draft, revokes old control and does not replay on retry',async()=>{
 const f=await fixture();try{const a=await f.create(),socket=await f.open(a.session);const b=await f.request(`/api/rooms/${a.room}/join`,{actionId:randomUUID(),roomId:a.room,requestedSeat:1,nickname:'朋友'}),bs=f.cookie(b,COOKIE),friend=await f.open(bs);assert(f.cookie(b,RETURN_COOKIE));
 await f.command(a.room,a.session,socket,{kind:'READY',ready:true});await f.command(a.room,bs,friend,{kind:'READY',ready:true});await f.command(a.room,a.session,socket,{kind:'START_ROUND'});
 const before=(await f.request(`/api/rooms/${a.room}/snapshot`,undefined,a.session)).body;socket.disconnect();await delay();f.setNow(15001);await f.server.tick();const managed=await f.request(`/api/rooms/${a.room}/seats`,undefined,a.proof);assert.equal(managed.body.players[0].isManaged,true);assert.equal((await f.request('/api/lobby')).body.tables[0].players[0].isManaged,true);
 const actionId=randomUUID(),restored=await f.restore(a,actionId);assert.equal(restored.status,200);assert.equal(restored.body.snapshot.private.playerId,a.pid);assert.deepEqual(restored.body.snapshot.private.hand,before.private.hand);assert.deepEqual(restored.body.snapshot.private.draft,before.private.draft);assert(restored.body.snapshot.private.controlEpoch>before.private.controlEpoch);assert.equal(restored.body.snapshot.public.players[0].presence,'HUMAN');assert.equal(f.server.games.get(a.room)!.botDue,null);assert.equal((await f.request(`/api/rooms/${a.room}/snapshot`,undefined,a.session)).status,403);
 const retry=await f.restore(a,actionId);assert.equal(retry.status,200);assert.equal(retry.body.snapshot.private.controlEpoch,restored.body.snapshot.private.controlEpoch);const session=f.cookie(retry,COOKIE);const again=await f.restore(a,actionId,`${a.proof}; ${session}`);assert.equal(again.status,200);assert.equal(again.body.snapshot.private.controlEpoch,restored.body.snapshot.private.controlEpoch);assert.equal(again.cookies.length,0);
 }finally{await f.close();}
});
test('room credentials survive a different global room session and SQLite restart; wrong-room proof cannot claim a seat',async()=>{
 const f=await fixture();try{const a=await f.create(),b=await f.create();assert.equal((await f.restore(b,randomUUID(),a.proof)).status,403);assert.equal((await f.request(`/api/rooms/${a.room}/seats`,undefined,`${a.proof}; ${b.session}`)).body.returnSeat,0);f.setNow(1000);await f.restart();const r=await f.restore(a,randomUUID(),`${a.proof}; ${b.session}`);assert.equal(r.status,200);assert.equal(r.body.snapshot.private.playerId,a.pid);assert.equal((await f.restore(b)).status,200);
 }finally{await f.close();}
});
test('legacy session transparently provisions browser identity only after a successful transaction',async()=>{
 const f=await fixture();try{const a=await f.create();delete f.server.games.get(a.room)!.players.get(a.pid)!.browserReturnHash;assert.equal((await f.request(`/api/rooms/${a.room}/seats`,undefined,a.session)).body.returnMethod,'SESSION');
 const body={actionId:randomUUID(),roomId:a.room,proof:{kind:'SESSION'}};f.server.store.failNextCommit=true;const failed=await f.request(`/api/rooms/${a.room}/restore`,body,a.session);assert.equal(failed.status,503);assert.deepEqual(failed.cookies,[]);assert.equal(f.server.games.get(a.room)!.players.get(a.pid)!.browserReturnHash,undefined);
 const r=await f.request(`/api/rooms/${a.room}/restore`,body,a.session);assert.equal(r.status,200);const proof=f.cookie(r,RETURN_COOKIE);assert(proof);assert.equal((await f.restore({...a,proof})).status,200);
 }finally{await f.close();}
});
test('kicked and closed seats cannot be claimed with a remembered browser credential; assigned AI has no credential',async()=>{
 const f=await fixture();try{const a=await f.create(),s=await f.open(a.session);await f.command(a.room,a.session,s,{kind:'ASSIGN_BOT',seat:1});const g=f.server.games.get(a.room)!,bot=g.public.players.find(p=>p.isBotSeat)!;assert.equal(g.players.get(bot.playerId)!.browserReturnHash,undefined);kickSeat(g,0,0);assert.equal((await f.restore(a)).status,403);assert.equal((await f.request(`/api/rooms/${a.room}/seats`,undefined,a.proof)).body.returnSeat,null);
 const b=await f.create();closeGame(f.server.games.get(b.room)!,0);assert.equal((await f.restore(b)).status,403);
 }finally{await f.close();}
});
test('production return cookie has Secure',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'browser-return-secure-')),s=createGameServer({dbPath:join(dir,'game.sqlite'),production:true,publicOrigin:origin,automaticTimers:false});try{await s.listen(0);const r=await fetch(`http://127.0.0.1:${(s.http.address() as any).port}/api/rooms`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({actionId:randomUUID(),capacity:2,nickname:'玩家'})});assert.equal(r.status,200);assert.match(r.headers.getSetCookie().find(s=>s.startsWith(RETURN_COOKIE+'='))!,/; Secure/);}finally{await s.close();rmSync(dir,{recursive:true,force:true});}
});
