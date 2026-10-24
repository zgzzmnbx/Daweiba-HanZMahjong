import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {canBorrowDiscard} from '../../packages/contracts/listening';
import {room,pid,ok,error,command,send,forceActor,discard,respond,sentence,vote} from './helpers';
function game(n=3){const g=room(n,false);g.public.rulesVersion='1.5.0';for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});return g;}
test('2–6 seats: unannounced borrowers can claim only the previous seat; denied HU does not consume response',()=>{
 for(let n=2;n<=6;n++)for(let d=0;d<n;d++)for(let who=0;who<n;who++){if(d===who)continue;const g=game(n);forceActor(g,d);discard(g);const allowed=who===(d+1)%n;assert.equal(canBorrowDiscard(g.public,pid(who),pid(d)),allowed);const c={kind:'RESPOND',responseWindowId:g.response!.windowId,response:'HU'};
  if(allowed){respond(g,{[who]:'HU'});assert.equal(g.public.phase.kind,'HU_COMPOSE');assert.equal((g.public.phase as any).applicantId,pid(who));}
  else{const version=g.public.stateVersion;error(g,who,c,'LISTENING_REQUIRED');assert.equal(g.public.stateVersion,version);assert(!g.response!.intents.has(pid(who)));ok(g,who,{...c,response:'PASS'});}
  E.assertGame(g);
 }
});
test('2–6 seats: prior listening declaration admits every opponent discard and cannot borrow own discard',()=>{
 for(let n=2;n<=6;n++)for(let d=0;d<n;d++)for(let who=0;who<n;who++){if(d===who)continue;const g=game(n);forceActor(g,who);ok(g,who,{kind:'SET_LISTENING',enabled:true});forceActor(g,d);discard(g);assert(canBorrowDiscard(g.public,pid(who),pid(d)));assert(!canBorrowDiscard(g.public,pid(d),pid(d)));respond(g,{[who]:'HU'});assert.equal(g.public.phase.kind,'HU_COMPOSE');assert.equal((g.public.phase as any).applicantId,pid(who));assert.equal(g.players.get(pid(who))!.hand.length,13);E.assertGame(g);}
});
test('listening is authoritative, own-turn-only, validated and idempotent without extending deadlines',()=>{
 const g=game();forceActor(g,0);const deadline=g.public.phase.deadline!.endsAt;
 error(g,1,{kind:'SET_LISTENING',enabled:true},'NOT_ACTOR');error(g,0,{kind:'SET_LISTENING',enabled:'yes'},'INVALID_LISTENING');
 const c=command(g,0,{kind:'SET_LISTENING',enabled:true}),r=send(g,0,c);assert(r.ok);assert.equal(g.public.players[0].listening,true);assert.deepEqual(send(g,0,c,1000),r);assert.equal(g.public.phase.deadline!.endsAt,deadline);
 ok(g,0,{kind:'SET_LISTENING',enabled:false},1000);assert.equal(g.public.players[0].listening,false);assert.deepEqual(send(g,0,c,1100),r);assert.equal(g.public.players[0].listening,false);
 discard(g,1200);error(g,1,{kind:'SET_LISTENING',enabled:true},'PHASE_CLOSED',1300);assert(!E.legalActions(g,pid(1)).includes('SET_LISTENING'));respond(g);forceActor(g,0);error(g,0,{kind:'SET_LISTENING',enabled:true},'PHASE_CLOSED',g.public.phase.deadline!.endsAt);
 const h=game();forceActor(h,0);ok(h,0,{kind:'SET_AUTOPLAY',enabled:true});error(h,0,{kind:'SET_LISTENING',enabled:true},'AUTOPLAY_ACTIVE');
});
test('listening persists across draft rearrangement, serialization, restart and original-player restoration',()=>{
 let g=game();forceActor(g,0);ok(g,0,{kind:'SET_LISTENING',enabled:true});const p=g.players.get(pid(0))!;ok(g,0,{kind:'SAVE_DRAFT',expectedDraftVersion:p.draftVersion,draft:{orderedTileIds:[...p.hand].reverse(),commaAfterTileIds:[]}});discard(g);g=E.decodeGame(E.encodeGame(g));E.restart(g,1000,'restart');E.connect(g,pid(0),'restored',2000,true);assert.equal(E.snapshot(g,pid(0),2000).public.players[0].listening,true);E.assertGame(g);
});
test('self HU stays available without listening; settlement and next round clear declaration',()=>{
 const g=game(2);forceActor(g,0);assert(E.legalActions(g,pid(0)).includes('DECLARE_SELF_HU'));ok(g,0,{kind:'SET_LISTENING',enabled:true});ok(g,0,{kind:'DECLARE_SELF_HU',sentence:sentence(g,0)});vote(g,1);assert.equal(g.public.phase.kind,'ROUND_FINISHED');assert(g.public.players.every(p=>!p.listening));for(let i=0;i<2;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});assert(g.public.players.every(p=>!p.listening));
});
test('active legacy 1.4.1 retains all-seat borrowing; only next START upgrades to listening rules',()=>{
 const g=game();g.public.rulesVersion='1.4.1';forceActor(g,0);error(g,0,{kind:'SET_LISTENING',enabled:true},'LISTENING_NOT_SUPPORTED');discard(g);respond(g,{2:'HU'});assert.equal((g.public.phase as any).applicantId,pid(2));E.assertGame(E.decodeGame(E.encodeGame(g)));
 const h=game(2);h.public.rulesVersion='1.4.1';forceActor(h,0);ok(h,0,{kind:'DECLARE_SELF_HU',sentence:sentence(h,0)});vote(h,1);for(let i=0;i<2;i++)ok(h,i,{kind:'READY',ready:true});ok(h,0,{kind:'START_ROUND'});assert.equal(h.archive.at(-1)!.rulesVersion,'1.4.1');assert.equal(h.public.rulesVersion,'1.5.0');
});
