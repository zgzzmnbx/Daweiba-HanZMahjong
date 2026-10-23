/** Real HTTPS/WSS smoke test against the authorized deployment; creates only its own rooms. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { io } from 'socket.io-client';
const origin=process.env.PUBLIC_ORIGIN??'https://118.196.107.182:1240';
const all=[],results=[];
const wait=async(fn,label,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw new Error(`Timeout: ${label}`);};
class Player{
 cookie='';snapshot=null;recovery=null;socket=null;revoked=false;
 async http(path,body,expected=200){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(this.cookie?{Cookie:this.cookie}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,`${path}: ${data.error??''}`);if(expected===200){const cookie=r.headers.get('set-cookie');if(cookie){assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=Lax/i);this.cookie=cookie.split(';')[0];}if(data.snapshot)this.snapshot=data.snapshot;if(data.recovery)this.recovery=data.recovery.recoveryCode;}return data;}
 async open(){this.socket=io(origin,{transports:['websocket'],reconnection:false,extraHeaders:{Origin:origin,Cookie:this.cookie}});all.push(this);this.socket.on('message',e=>{if(e.type==='RESYNC')this.snapshot=e.payload;if(e.type==='CONTROL_REVOKED')this.revoked=true;});await new Promise((resolve,reject)=>{this.socket.once('connect',resolve);this.socket.once('connect_error',reject);});await wait(()=>this.snapshot?.public.players.find(p=>p.playerId===this.snapshot.private.playerId)?.connected,'connected snapshot');}
 async fresh(){this.snapshot=await this.http(`/api/rooms/${this.snapshot.public.roomId}/snapshot`);return this.snapshot;}
 async command(fields,previous){await this.fresh();const s=this.snapshot;const c=previous??{...fields,actionId:randomUUID(),roomId:s.public.roomId,roundId:s.public.roundId,phaseId:s.public.phase.phaseId,controlEpoch:s.private.controlEpoch,expectedStateVersion:s.public.stateVersion};const result=await this.socket.timeout(10000).emitWithAck('message',{type:'COMMAND',command:c});assert.equal(result.ok,true,JSON.stringify(result));await this.fresh();return c;}
}
try{
 const health=await fetch(origin+'/readyz');assert.equal(health.status,200);assert.equal((await health.json()).ready,true);
 let priorRoom=null;
 for(const n of [2,3,4,5,6]){
  const ps=Array.from({length:n},()=>new Player());
  await ps[0].http('/api/rooms',{actionId:randomUUID(),capacity:n,nickname:`公网验收${n}-1`});await ps[0].open();const room=ps[0].snapshot.public.roomId;
  if(priorRoom)await ps[0].http(`/api/rooms/${priorRoom}/snapshot`,undefined,403);
  for(let i=1;i<n;i++){await ps[i].http(`/api/rooms/${room}/join`,{actionId:randomUUID(),roomId:room,requestedSeat:i,nickname:`公网验收${n}-${i+1}`});await ps[i].open();}
  const stranger=new Player();await stranger.http(`/api/rooms/${room}/snapshot`,undefined,403);
  for(const p of ps)await p.command({kind:'READY',ready:true});await ps[0].command({kind:'START_ROUND'});for(const p of ps)await p.fresh();
  const expectedWall={2:93,3:104,4:115,5:126,6:137}[n];assert.equal(ps[0].snapshot.public.wallRemaining,expectedWall);
  const actorId=ps[0].snapshot.public.phase.actorId;let actor=ps.find(p=>p.snapshot.private.playerId===actorId);assert(actor);assert.equal(actor.snapshot.private.hand.length,14);
  for(const p of ps){const json=JSON.stringify(p.snapshot);for(const other of ps){if(p===other)continue;for(const t of other.snapshot.private.hand)assert(!json.includes(t.tileId),'opponent private tile leaked');assert(!json.includes(other.recovery),'recovery leaked');}assert(!/"(?:sessionId|recoveryHash|ballots|rng|wall|pendingJobs)"/.test(json),'server-only field leaked');}
  const seat=actor.snapshot.private.seat;await actor.command({kind:'DISCARD',tileId:actor.snapshot.private.hand[0].tileId});
  for(const p of ps.filter(p=>p!==actor)){await p.fresh();await p.command({kind:'RESPOND',responseWindowId:p.snapshot.public.phase.responseWindowId,response:'PASS'});}
  for(const p of ps)await p.fresh();actor=ps.find(p=>p.snapshot.private.playerId===p.snapshot.public.phase.actorId);assert.equal(actor.snapshot.private.seat,(seat+1)%n);assert.equal(actor.snapshot.public.wallRemaining,expectedWall-1);
  const draft={orderedTileIds:actor.snapshot.private.hand.map(t=>t.tileId).reverse(),commaAfterTileIds:[]};draft.commaAfterTileIds=[draft.orderedTileIds[3],draft.orderedTileIds[7]];
  await actor.command({kind:'SAVE_DRAFT',draft,expectedDraftVersion:actor.snapshot.private.draftVersion});assert.deepEqual(actor.snapshot.private.draft,draft);
  await actor.command({kind:'DECLARE_SELF_HU',sentence:draft});const proposal=actor.snapshot.public.phase.proposal;assert.equal(proposal.reviewerCount,n-1);assert.equal(proposal.threshold,Math.floor((n-1)/2)+1);
  let lastCommand,lastVoter;const reviewers=ps.filter(p=>p!==actor);
  for(let i=0;i<reviewers.length;i++){lastVoter=reviewers[i];lastCommand=await lastVoter.command({kind:'VOTE',proposalId:proposal.proposalId,ballot:{choice:'APPROVE'}});if(n===3&&i===0){await actor.fresh();assert.equal(actor.snapshot.public.phase.kind,'HU_VOTE');assert.equal(actor.snapshot.public.phase.proposal.submittedBallotCount,1);assert(!JSON.stringify(actor.snapshot).includes('"choice":"APPROVE"'),'vote choice attribution leaked');}}
  await actor.fresh();assert.equal(actor.snapshot.public.phase.kind,'ROUND_FINISHED');assert.equal(actor.snapshot.public.phase.reason,'WIN');assert.equal(actor.snapshot.public.players.find(p=>p.playerId===actor.snapshot.private.playerId).wins,1);
  await lastVoter.command({},lastCommand);await actor.fresh();assert.equal(actor.snapshot.public.players.find(p=>p.playerId===actor.snapshot.private.playerId).wins,1,'duplicate victory');
  const old=ps[1],restored=new Player(),oldId=old.snapshot.private.playerId,epoch=old.snapshot.private.controlEpoch;await restored.http(`/api/rooms/${room}/restore`,{actionId:randomUUID(),roomId:room,proof:{kind:'RECOVERY_CODE',code:old.recovery}});await restored.open();assert.equal(restored.snapshot.private.playerId,oldId);assert(restored.snapshot.private.controlEpoch>epoch);await wait(()=>old.revoked,'old control revoked');await old.http(`/api/rooms/${room}/snapshot`,undefined,403);assert.equal(restored.snapshot.public.phase.kind,'ROUND_FINISHED');
  await ps[0].command({kind:'CLOSE_ROOM'});for(const p of [...ps,restored])p.socket?.disconnect();priorRoom=room;
  results.push({players:n,transport:'HTTPS + secure WebSocket',initialWall:expectedWall,play:'ready/start/discard/pass/auto-draw/draft/self-hu/unanimous-vote',privacy:true,idempotentVote:true,recoveryCodeTakeover:true,oldSessionRejected:true,closed:true,status:'PASS'});
 }
 await mkdir('docs/evidence',{recursive:true});const report={at:new Date().toISOString(),origin,scope:'Real public HTTP and independent authenticated Socket.IO clients; not browser/UI or physical phone acceptance',node:process.version,tlsCertificateValidation:true,results};await writeFile('docs/evidence/public-network-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const p of all)p.socket?.disconnect();}
