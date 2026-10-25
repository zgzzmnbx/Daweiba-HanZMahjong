import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {createGameServer} from '../../apps/server/server';
import type * as C from '../../packages/contracts/types';

const origin='http://ai-review.test';
async function fixture(aiJudge:import('../../apps/server/ai-judge').AiJudge){
 const directory=mkdtempSync(join(tmpdir(),'ai-review-'));let clock=0;
 let server=createGameServer({dbPath:join(directory,'game.sqlite'),publicOrigin:origin,aiJudge,automaticTimers:false,now:()=>clock});await server.listen(0);let url=`http://127.0.0.1:${(server.http.address() as any).port}`;const clients:Client[]=[];
 class Client{
  room='';code='';cookie='';socket:Socket|null=null;
  async request(path:string,body?:unknown){const response=await fetch(url+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:this.cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];return{status:response.status,data:await response.json()};}
  async create(n:number){const r=await this.request('/api/rooms',{actionId:randomUUID(),capacity:n,nickname:'申请人'});assert.equal(r.status,200);this.room=r.data.snapshot.public.roomId;this.code=r.data.recovery.recoveryCode;await this.open();}
  async join(room:string){const r=await this.request(`/api/rooms/${room}/join`,{actionId:randomUUID(),roomId:room,requestedSeat:1,nickname:'真人评审'});assert.equal(r.status,200);this.room=room;this.code=r.data.recovery.recoveryCode;await this.open();}
  async open(){this.socket=io(url,{transports:['websocket'],extraHeaders:{Origin:origin,Cookie:this.cookie},reconnection:false});await new Promise<void>((resolve,reject)=>{this.socket!.once('connect_error',reject);this.socket!.on('message',e=>{if(e.type==='RESYNC')resolve();});});}
  async snapshot(){const r=await this.request(`/api/rooms/${this.room}/snapshot`);assert.equal(r.status,200);return r.data as C.ResyncEnvelope;}
  async command(payload:any){const e=await this.snapshot();const command={roomId:this.room,roundId:e.public.roundId,phaseId:e.public.phase.phaseId,expectedStateVersion:e.public.stateVersion,controlEpoch:e.private.controlEpoch,actionId:randomUUID(),...payload};return{command,result:await this.raw(command)};}
  raw(command:any){return this.socket!.timeout(2000).emitWithAck('message',{type:'COMMAND',command});}
  async restore(){const r=await this.request(`/api/rooms/${this.room}/restore`,{actionId:randomUUID(),roomId:this.room,proof:{kind:'RECOVERY_CODE',code:this.code}});assert.equal(r.status,200);await this.open();return r.data.snapshot as C.ResyncEnvelope;}
 }
 const client=()=>{const c=new Client();clients.push(c);return c;};
 return{client,async advance(ms:number){clock=ms;await server.tick();},get server(){return server;},async seed(room:string,rng:number,legacy?:C.RulesVersion){await server.serial(room,()=>{const g=server.games.get(room)!;g.rng=rng;if(legacy)g.public.rulesVersion=legacy;server.store.commit(g,'CONTROLLED_TEST_FIXTURE',clock);});},async restart(){for(const c of clients)c.socket?.disconnect();await server.close();clock=1000;server=createGameServer({dbPath:join(directory,'game.sqlite'),publicOrigin:origin,aiJudge,automaticTimers:false,now:()=>clock});await server.listen(0);url=`http://127.0.0.1:${(server.http.address() as any).port}`;},async close(){for(const c of clients)c.socket?.disconnect();await server.close();rmSync(directory,{recursive:true,force:true});}};
}
async function start(t:Awaited<ReturnType<typeof fixture>>,players:any[],n:number){const a=players[0];for(let i=players.length;i<n;i++)assert.equal((await a.command({kind:'ASSIGN_BOT',seat:i})).result.ok,true);for(const p of players)assert.equal((await p.command({kind:'READY',ready:true})).result.ok,true);await t.seed(a.room,1);assert.equal((await a.command({kind:'START_ROUND'})).result.ok,true);assert.equal((await a.snapshot()).public.phase.actorId,(await a.snapshot()).private.playerId);}


const wait=async(fn:()=>boolean|Promise<boolean>)=>{for(let i=0;i<400;i++){if(await fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('wait timeout');};
const declare=async(a:any)=>{const e=await a.snapshot();return a.command({kind:'DECLARE_SELF_HU',sentence:{orderedTileIds:e.private.hand.map((t:any)=>t.tileId),commaAfterTileIds:[]}});};
test('async shared request does not block human voting; result/chat reach all members once; DB failure retries result without model recall',async()=>{
 let calls=0,resolve!:(v:{pass:boolean;roast:string})=>void;
 const t=await fixture(async()=>{calls++;return new Promise(r=>resolve=r);});
 try{const a=t.client(),b=t.client();await a.create(4);await b.join(a.room);await start(t,[a,b],4);await t.seed(a.room,1);
 const received:any[][]=[[],[]];a.socket!.on('chat:message',m=>received[0].push(m));b.socket!.on('chat:message',m=>received[1].push(m));
 const cmd=await declare(a);assert.equal(cmd.result.ok,true);await wait(()=>calls===1);assert.equal((await b.snapshot()).public.phase.kind,'HU_VOTE');
 const e=await b.snapshot();assert.equal((e.public.phase as any).proposal.submittedBallotCount,0);
 assert.equal((await b.command({kind:'VOTE',proposalId:(e.public.phase as any).proposal.proposalId,ballot:{choice:'REJECT',objectionRanges:[{start:0,endExclusive:1}]}})).result.ok,true);
 t.server.store.failNextCommit=true;resolve({pass:true,roast:'字数凑齐了，语法还在排队。'});
 await wait(()=>received.every(r=>r.length===1));const end=await a.snapshot();assert.equal(end.public.history[0].result!.approveCount,2);assert.equal(end.public.history[0].result!.rejectCount,1);assert.deepEqual(received[0],received[1]);assert.equal(received[0][0].kind,'AI_REVIEW');
 await a.raw(cmd.command);assert.equal(calls,1);assert.equal(t.server.store.chat.history(a.room).length,1);assert.equal(t.server.store.load()[0].public.history.length,1);
 await t.restart();await a.restore();await b.restore();assert.equal(calls,1);assert.equal(t.server.store.chat.history(a.room).length,1);
 }finally{await t.close();}
});
test('timeout at persisted 10 seconds, late reply ignored, closed room receives no late chat',async()=>{
 let calls=0,resolve!:(v:{pass:boolean;roast:string})=>void;
 const t=await fixture(async()=>{calls++;return new Promise(r=>resolve=r);});
 try{const a=t.client();await a.create(2);await start(t,[a],2);await t.seed(a.room,1);await declare(a);await wait(()=>calls===1);await t.advance(9999);assert.equal(t.server.games.get(a.room)!.review!.ballots.size,0);await t.advance(10000);const g=t.server.games.get(a.room)!;assert.equal((g.public.history[0].aiJudgment as any).source,'TIMEOUT');const rng=g.rng;resolve({pass:false,roast:'迟到的反对。'});await new Promise(r=>setTimeout(r,30));assert.equal(t.server.games.get(a.room)!.rng,rng);assert.equal(t.server.store.chat.history(a.room).length,1);
 }finally{await t.close();}
});
test('claimed request survives restart without another paid call or an extended 10-second budget',async()=>{
 let calls=0;
 const t=await fixture(async(_s,signal)=>{calls++;return new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));});
 try{const a=t.client();await a.create(2);await start(t,[a],2);await t.seed(a.room,1);await declare(a);await wait(()=>calls===1);await t.restart();await a.restore();assert.equal(calls,1);await t.advance(10000);const g=t.server.games.get(a.room)!;assert.equal((g.public.history[0].aiJudgment as any).source,'TIMEOUT');assert.equal(t.server.store.chat.history(a.room).length,1);
 }finally{await t.close();}
});
test('provider error uses independent fallback, labels system message honestly and never calls twice',async()=>{
 let calls=0;const t=await fixture(async()=>{calls++;throw Error('provider unavailable');});try{const a=t.client();await a.create(3);await start(t,[a],3);await t.seed(a.room,123456);await declare(a);await wait(()=>t.server.games.get(a.room)!.public.history.length===1);assert.equal(calls,1);assert.equal((t.server.games.get(a.room)!.public.history[0].aiJudgment as any).source,'ERROR');assert(t.server.store.chat.history(a.room)[0].nickname.includes('兜底'));}finally{await t.close();}
});
