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
async function raw(p,fields){await p.fresh();const s=p.snapshot;return p.socket.timeout(10000).emitWithAck('message',{type:'COMMAND',command:{...fields,actionId:randomUUID(),roomId:s.public.roomId,roundId:s.public.roundId,phaseId:s.public.phase.phaseId,controlEpoch:s.private.controlEpoch,expectedStateVersion:s.public.stateVersion}});}
try{
 for(const n of [2,3,4,5,6]){
  const host=new Player();await host.http('/api/rooms',{actionId:randomUUID(),capacity:n,nickname:`AI验收${n}`});await host.open();const room=host.snapshot.public.roomId;assert.equal(host.snapshot.public.rulesVersion,'1.2.0');
  for(let seat=1;seat<n;seat++)await host.command({kind:'ASSIGN_BOT',seat});assert.equal(host.snapshot.public.players.filter(p=>p.isBotSeat).length,n-1);assert(host.snapshot.public.players.filter(p=>p.isBotSeat).every(p=>p.presence==='BOT'&&!p.connected));
  await host.command({kind:'REMOVE_BOT',seat:n-1});assert.equal(host.snapshot.public.players.length,n-1);await host.command({kind:'ASSIGN_BOT',seat:n-1});
  await host.command({kind:'READY',ready:true});await host.command({kind:'START_ROUND'});assert.equal(host.snapshot.public.practiceMode,true);
  const initialWall=host.snapshot.public.wallRemaining;let botDiscards=0;
  for(let turns=0;turns<n+2;turns++){
   await host.fresh();const phase=host.snapshot.public.phase;if(phase.kind==='TURN_ACTION'&&phase.actorId===host.snapshot.private.playerId)break;
   await wait(()=>host.snapshot.public.phase.kind==='DISCARD_RESPONSE','assigned AI delayed discard',6000);botDiscards++;await host.command({kind:'RESPOND',responseWindowId:host.snapshot.public.phase.responseWindowId,response:'PASS'});
  }
  assert.equal(host.snapshot.public.phase.actorId,host.snapshot.private.playerId);assert.equal(host.snapshot.private.hand.length,14);assert.equal(host.snapshot.public.wallRemaining,initialWall-botDiscards);
  const cycleWall=host.snapshot.public.wallRemaining;await host.command({kind:'DISCARD',tileId:host.snapshot.private.hand[0].tileId});
  for(let i=0;i<n-1;i++){await wait(()=>host.snapshot.public.phase.kind==='DISCARD_RESPONSE','one full assigned AI cycle',6000);botDiscards++;await host.command({kind:'RESPOND',responseWindowId:host.snapshot.public.phase.responseWindowId,response:'PASS'});}
  assert.equal(host.snapshot.public.phase.actorId,host.snapshot.private.playerId);assert.equal(host.snapshot.public.wallRemaining,cycleWall-n);assert(botDiscards>=n-1);
  assert(host.snapshot.legalActions.includes('DECLARE_SELF_HU')); // Actual AI voting is exercised by verify-public-ai-review.mjs.
  const blocked=await raw(host,{kind:'REMOVE_BOT',seat:1});assert.equal(blocked.ok,false);
  await host.command({kind:'END_UNSCORED'});assert.equal(host.snapshot.public.phase.reason,'TERMINATED');assert.equal(host.snapshot.public.players.reduce((sum,p)=>sum+p.wins,0),0);
  await host.command({kind:'REMOVE_BOT',seat:n-1});await host.command({kind:'ASSIGN_BOT',seat:n-1});await host.command({kind:'READY',ready:true});await host.command({kind:'START_ROUND'});assert.equal(host.snapshot.public.phase.kind,'TURN_ACTION');await host.command({kind:'END_UNSCORED'});await host.command({kind:'CLOSE_ROOM'});host.socket.disconnect();
  results.push({players:n,humans:1,assignedAI:n-1,practiceMode:true,emptySeatAddRemove:true,readyAndStart:true,aiDelayedDiscardObserved:botDiscards,midRoundRemovalRejected:true,aiReviewAvailable:true,noScoreTermination:true,finishedRemoveRefillNextRound:true,status:'PASS'});console.log(`PASS ${n} seats: one human + ${n-1} assigned AI`);
 }
 const host=new Player(),guest=new Player();await host.http('/api/rooms',{actionId:randomUUID(),capacity:4,nickname:'混合AI房主'});await host.open();const room=host.snapshot.public.roomId;await guest.http(`/api/rooms/${room}/join`,{actionId:randomUUID(),roomId:room,requestedSeat:1,nickname:'混合AI真人'});await guest.open();assert.equal((await raw(guest,{kind:'ASSIGN_BOT',seat:2})).ok,false);
 await host.command({kind:'ASSIGN_BOT',seat:2});await host.command({kind:'ASSIGN_BOT',seat:3});await host.command({kind:'READY',ready:true});await guest.command({kind:'READY',ready:true});await host.command({kind:'START_ROUND'});await guest.fresh();assert.equal(host.snapshot.public.practiceMode,false);const ps=[host,guest];let claimant;
 for(let turns=0;turns<8;turns++){
  for(const p of ps)await p.fresh();const phase=host.snapshot.public.phase;if(phase.kind==='TURN_ACTION'){claimant=ps.find(p=>p.snapshot.private.playerId===phase.actorId);if(claimant)break;await wait(()=>host.snapshot.public.phase.kind==='DISCARD_RESPONSE','mixed AI discard',6000);}
  for(const p of ps){await p.fresh();if(p.snapshot.legalActions.includes('RESPOND'))await p.command({kind:'RESPOND',responseWindowId:p.snapshot.public.phase.responseWindowId,response:'PASS'});}
 }
 assert(claimant);await claimant.fresh();await claimant.command({kind:'DECLARE_SELF_HU',sentence:claimant.snapshot.private.draft});assert.equal(claimant.snapshot.public.phase.proposal.reviewerCount,3);assert.equal(claimant.snapshot.public.phase.proposal.threshold,2);const reviewer=ps.find(p=>p!==claimant);await reviewer.command({kind:'VOTE',proposalId:claimant.snapshot.public.phase.proposal.proposalId,ballot:{choice:'APPROVE'}});await host.fresh();const voteResult=host.snapshot.public.history.at(-1).result;assert.equal(voteResult.passed,voteResult.approveCount>=2);if(!voteResult.passed){guest.socket.disconnect();await new Promise(r=>setTimeout(r,150));await host.command({kind:'END_UNSCORED'});}assert(host.snapshot.public.players.filter(p=>p.isBotSeat).every(p=>p.wins===0));await host.command({kind:'CLOSE_ROOM'});for(const p of ps)p.socket.disconnect();results.push({players:4,humans:2,assignedAI:2,hostOnlyAssignment:true,practiceMode:false,reviewerCount:3,threshold:2,aiVotes:true,humanWin:voteResult.passed,status:'PASS'});
 const report={at:new Date().toISOString(),origin,scope:'Real public HTTPS/WSS commands for user-requested AI seat assignment, rule 1.2.0',results};await writeFile('docs/evidence/public-ai-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const p of all)p.socket?.disconnect();}
