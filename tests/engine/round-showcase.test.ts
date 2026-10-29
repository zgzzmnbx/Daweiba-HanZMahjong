import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {pid,ok,actor,sentence,vote,discard,respond} from './helpers';
function game(n=4){const g=E.createGame('showcase',n,pid(0),'甲','s0','a'.repeat(64),0,1);for(let i=1;i<n;i++)E.joinGame(g,pid(i),'人'+i,i,'s'+i,'b'.repeat(64),0);for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});return g;}
function approve(g:E.Game,i:number){ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});for(const p of [...g.review!.reviewers])vote(g,Number(p.slice(1)));}
for(let n=2;n<=6;n++)test(`${n} players: reveal only after approval, sorted humans then winner, original order/commas frozen across restart and next deal`,()=>{
 let g=game(n),i=actor(g),other=(i+1)%n,p=g.players.get(pid(other))!;
 const draft={orderedTileIds:[...p.hand].reverse(),commaAfterTileIds:[p.hand[5],p.hand[4],p.hand[3]]};ok(g,other,{kind:'SAVE_DRAFT',draft,expectedDraftVersion:p.draftVersion});
 assert.equal(g.public.roundShowcase,undefined);ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});assert.equal(g.public.roundShowcase,undefined);
 for(const reviewer of [...g.review!.reviewers])vote(g,Number(reviewer.slice(1)));
 const shown=structuredClone(g.public.roundShowcase!);assert.equal(shown.hands.length,n);assert.equal(shown.hands.at(-1)!.playerId,pid(i));assert.deepEqual(shown.hands.find(h=>h.playerId===pid(other))!.draft,draft);assert(shown.hands.slice(0,-1).every(h=>h.tiles.length===13));assert.equal(shown.hands.at(-1)!.tiles.length,14);
 g=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));assert.deepEqual(g.public.roundShowcase,shown);for(let j=0;j<n;j++)ok(g,j,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});assert.equal(g.public.roundShowcase,undefined);assert.deepEqual(g.archive.at(-1)!.roundShowcase,shown);E.assertGame(g);
});
test('rejected, interrupted and unscored endings never disclose other hands',()=>{for(const outcome of ['reject','withdraw','unscored']){const g=game(2),i=actor(g);if(outcome==='unscored'){E.disconnect(g,pid(1),'s1',0);ok(g,0,{kind:'END_UNSCORED'});}else{ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});if(outcome==='reject')vote(g,1-i,'REJECT');else E.disconnect(g,pid(i),'s'+i,0);}assert.equal(g.public.roundShowcase,undefined);}});
test('designated AI excluded; human-owned BOT remains, and borrowed winner uses approved 14 tiles',()=>{
 const g=game(4);for(let j=0;j<39;j++){discard(g);respond(g);}const from=discard(g),next=(from+1)%4;respond(g,{[next]:'HU'});assert.equal(g.public.phase.kind,'HU_COMPOSE');
 const phase=g.public.phase as any,own=g.players.get(pid(next))!,borrowed=g.response!.discardId,disc=g.public.discards.find(d=>d.discardId===borrowed)!;
 ok(g,next,{kind:'SUBMIT_DISCARD_SENTENCE',source:phase.source,sentence:{orderedTileIds:[...own.hand,disc.tile.tileId],commaAfterTileIds:[]}});
 const voters=[...g.review!.reviewers];for(const id of voters.slice(0,-1))vote(g,Number(id.slice(1)));
 const bot=g.public.players.find(p=>p.playerId===voters[0])!,managed=g.public.players.find(p=>p.playerId===voters[1])!;
 bot.isBotSeat=true;managed.presence='BOT';
 vote(g,Number(voters.at(-1)!.slice(1)));
 const shown=g.public.roundShowcase!;assert(!shown.hands.some(h=>h.playerId===bot.playerId));assert(shown.hands.some(h=>h.playerId===managed.playerId&&h.managed));assert.equal(shown.hands.at(-1)!.tiles.length,14);assert.deepEqual(shown.hands.at(-1)!.draft,g.public.history.at(-1)!.snapshot.sentence);
});
test('actual assigned AI and voluntarily managed human retain their distinct display ownership',()=>{
 const g=E.createGame('mixed-showcase',3,pid(0),'甲','s0','h',0,1);E.joinGame(g,pid(1),'乙',1,'s1','h',0);ok(g,0,{kind:'ASSIGN_BOT',seat:2});for(let i=0;i<2;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});
 // Controlled fixture makes the human host the dealer, without changing entities.
 const from=g.public.phase.kind==='TURN_ACTION'?g.public.phase.actorId:null;
 if(from!==pid(0)){const a=g.players.get(pid(0))!,b=g.players.get(from!)!;[a.hand,b.hand]=[b.hand,a.hand];[a.draft,b.draft]=[b.draft,a.draft];g.public.players.find(p=>p.playerId===pid(0))!.handCount=14;g.public.players.find(p=>p.playerId===from)!.handCount=13;(g.public.phase as any).actorId=pid(0);}
 ok(g,1,{kind:'SET_AUTOPLAY',enabled:true});ok(g,0,{kind:'DECLARE_SELF_HU',sentence:sentence(g,0)});const p=(g.public.phase as any).proposal,bot=g.public.players.find(p=>p.isBotSeat)!;
 assert(E.applyAiJudgment(g,p.proposalId,{pass:true,roast:'勉强算句子。'},100,'ERROR',bot.playerId));assert.equal(g.public.roundShowcase!.hands.length,2);assert(g.public.roundShowcase!.hands[0].managed);assert.equal(g.public.roundShowcase!.hands[0].playerId,pid(1));E.assertGame(g);
});
