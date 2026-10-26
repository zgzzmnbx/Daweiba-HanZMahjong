import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {io} from 'socket.io-client';
import {createGameServer,COOKIE,ADMIN_COOKIE,BOOK_COOKIE} from '../../apps/server/server';
import {RETURN_COOKIE} from '../../apps/server/browser-return';
import {hashAdminPassword} from '../../apps/server/admin-auth';

test('production HTTP is explicit; HTTP cookies authenticate player, return, administrator and WS independently of old HTTPS names',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hanz-http-')),origin='http://mahjong.test',password=randomUUID();
 const options={dbPath:join(dir,'game.sqlite'),publicOrigin:origin,production:true,automaticTimers:false};
 assert.throws(()=>createGameServer(options),/explicit allowInsecureHttp/);
 const server=createGameServer({...options,allowInsecureHttp:true,adminPasswordHash:await hashAdminPassword(password)});
 let socket:ReturnType<typeof io>|undefined;
 try{
  await server.listen(0);const url=`http://127.0.0.1:${(server.http.address() as any).port}`,cookies=new Map<string,string>();
  const header=()=>[...cookies].map(([k,v])=>`${k}=${v}`).join('; ');
  async function request(path:string,body?:unknown,requestOrigin=origin){
   const r=await fetch(url+path,{method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,Cookie:header(),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const set=r.headers.getSetCookie();for(const c of set){assert.match(c,/HttpOnly/);assert.match(c,/SameSite=Lax/);assert(!c.includes('; Secure'));const [k,v]=c.split(';')[0].split('=');if(v)cookies.set(k,v);else cookies.delete(k);}
   return{status:r.status,data:await r.json() as any,set};
  }
  const created=await request('/api/rooms',{actionId:randomUUID(),capacity:2,nickname:'HTTP玩家'});assert.equal(created.status,200);const room=created.data.snapshot.public.roomId,pid=created.data.snapshot.private.playerId;
  assert(cookies.has(COOKIE+'_http'));assert(cookies.has(RETURN_COOKIE+'_http'));assert(!cookies.has(COOKIE));
  assert.match(created.set.find(c=>c.startsWith(RETURN_COOKIE+'_http='))!,new RegExp(`Path=/api/rooms/${room}`));
  cookies.set(COOKIE,'stale-https-session');cookies.set(RETURN_COOKIE,'stale-https-return');
  assert.equal((await request(`/api/rooms/${room}/snapshot`)).data.private.playerId,pid);
  socket=io(url,{transports:['websocket'],extraHeaders:{Origin:origin,Cookie:header()},reconnection:false});
  await new Promise<void>((resolve,reject)=>{socket!.once('connect',resolve);socket!.once('connect_error',reject);});
  const e=(await request(`/api/rooms/${room}/snapshot`)).data;
  const ack=await socket.timeout(2000).emitWithAck('message',{type:'COMMAND',command:{kind:'READY',ready:true,actionId:randomUUID(),roomId:room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,controlEpoch:e.private.controlEpoch,expectedStateVersion:e.public.stateVersion}});assert.equal(ack.ok,true);
  const returned=await request(`/api/rooms/${room}/restore`,{actionId:randomUUID(),roomId:room,proof:{kind:'BROWSER'}});assert.equal(returned.status,200);assert.equal(returned.data.snapshot.private.playerId,pid);
  assert.equal((await request('/api/admin/login',{password},'http://foreign.test')).status,403);
  assert.equal((await request('/api/admin/login',{password})).status,200);assert(cookies.has(ADMIN_COOKIE+'_http'));
  assert.equal((await request('/api/admin/session')).data.authenticated,true);assert.equal((await request('/api/admin/records')).status,200);
  assert.equal((await request('/api/admin/logout',{})).status,200);assert.equal((await request('/api/admin/session')).data.authenticated,false);
  assert.equal((await request('/api/hu-book')).status,200);assert(cookies.has(BOOK_COOKIE+'_http'));
 }finally{socket?.disconnect();await server.close();rmSync(dir,{recursive:true,force:true});}
});
