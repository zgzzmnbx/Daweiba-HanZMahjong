import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {Store} from '../../apps/server/store';
import {room,pid,ok,error,selfVote,command,send} from '../engine/helpers';

function reviewing(){const g=room(4,false);g.public.rulesVersion='1.6.0';for(let i=0;i<4;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});const actor=selfVote(g),voters=[0,1,2,3].filter(i=>i!==actor),proposalId=(g.public.phase as any).proposal.proposalId;return{g,actor,voters,proposalId};}
test('both choices publish comments, eggs are optional, vote retry/restart preserves each comment',()=>{
 const {g,voters,proposalId}=reviewing();const c=command(g,voters[0],{kind:'VOTE',proposalId,ballot:{choice:'APPROVE',comment:'怪是怪，但意思到了。'}});assert.equal(send(g,voters[0],c).ok,true);assert.equal(send(g,voters[0],c).ok,true);
 ok(g,voters[1],{kind:'VOTE',proposalId,ballot:{choice:'REJECT',comment:'字没错，关系没处找。',objectionRanges:[]}});
 ok(g,voters[2],{kind:'VOTE',proposalId,ballot:{choice:'REJECT',comment:'这里接不上。',objectionRanges:[{start:2,endExclusive:4}]}});
 const h=E.decodeGame(E.encodeGame(g)).public.history[0];assert.deepEqual(h.reviewers!.map(v=>[v.choice,v.comment]),[['APPROVE','怪是怪，但意思到了。'],['REJECT','字没错，关系没处找。'],['REJECT','这里接不上。']]);assert.equal(h.result!.rejectCount,2);assert.deepEqual(h.reviewers![1].objectionRanges,[]);assert.deepEqual(h.reviewers![2].objectionRanges,[{start:2,endExclusive:4}]);
});
test('invalid comments do not consume the vote; 24 Unicode characters are allowed',()=>{
 const {g,voters,proposalId}=reviewing();for(const comment of ['字'.repeat(25),'  ','坏\n行','坏\u202e行',5])error(g,voters[0],{kind:'VOTE',proposalId,ballot:{choice:'APPROVE',comment}},'INVALID_OBJECTIONS');assert.equal(g.review!.ballots.size,0);ok(g,voters[0],{kind:'VOTE',proposalId,ballot:{choice:'APPROVE',comment:'😀'.repeat(24)}});assert.equal((g.public.phase as any).proposal.reviewers[0].comment,'😀'.repeat(24));
});
test('human comments and votes commit atomically, replay and history scans never duplicate chat',()=>{
 const store=new Store(':memory:');try{const {g,voters,proposalId}=reviewing();store.commit(g,'BEGIN',0);const n=structuredClone(g);ok(n,voters[0],{kind:'VOTE',proposalId,ballot:{choice:'APPROVE',comment:'这句有点东西。'}});store.failNextCommit=true;assert.throws(()=>store.commit(n,'VOTE',100));assert.equal(store.chat.history(g.public.roomId).length,0);assert.equal(store.load()[0].review!.ballots.size,0);const messages=store.commit(n,'VOTE',100);assert.equal(messages.length,1);assert.equal(messages[0].kind,'HU_REVIEW');assert.equal(messages[0].text,'赞成 · 这句有点东西。');assert.equal(messages[0].nickname,'人'+voters[0]);assert.equal(store.commit(n,'RETRY',200).length,0);assert.equal(store.commit(store.load()[0],'RELOAD',300).length,0);assert.equal(store.chat.history(g.public.roomId).length,1);}finally{store.close();}
});
