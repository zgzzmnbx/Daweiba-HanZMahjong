import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {room,pid,ok,error,forceActor,discard,respond,sentence,vote} from './helpers';
function game(n=3){const g=room(n,false);g.public.rulesVersion='1.5.1';for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});g.public.rulesVersion='1.5.1';return g;}
test('2–6 seats: every opponent discard can be borrowed without declaring listening',()=>{
 for(let n=2;n<=6;n++)for(let d=0;d<n;d++)for(let who=0;who<n;who++){if(d===who)continue;const g=game(n);forceActor(g,d);discard(g);respond(g,{[who]:'HU'});assert.equal(g.public.phase.kind,'HU_COMPOSE');assert.equal((g.public.phase as any).applicantId,pid(who));assert.equal(g.players.get(pid(who))!.hand.length,13);assert.equal(g.players.get(pid(who))!.candidateDraft!.sentence.orderedTileIds.length,14);E.assertGame(g);}
});
test('retired listening command is absent and cannot mutate the current turn',()=>{
 const g=game();forceActor(g,0);const before=structuredClone(E.encodeGame(g));assert(!E.legalActions(g,pid(0)).some(a=>String(a)==='SET_LISTENING'));error(g,0,{kind:'SET_LISTENING',enabled:true},'PHASE_CLOSED');assert.deepEqual(E.encodeGame(g),before);
});
test('legacy listening flags are stripped and 1.5.0 is repealed without changing ongoing play',()=>{
 for(const stage of ['TURN_ACTION','DISCARD_RESPONSE','HU_COMPOSE','HU_VOTE']){const g=game();forceActor(g,0);if(stage!=='TURN_ACTION')discard(g);if(stage==='HU_COMPOSE'||stage==='HU_VOTE')respond(g,{2:'HU'});if(stage==='HU_VOTE'){const ph=g.public.phase as any;ok(g,2,{kind:'SUBMIT_DISCARD_SENTENCE',source:ph.source,sentence:g.players.get(pid(2))!.candidateDraft!.sentence});}
  g.public.rulesVersion='1.5.0';(g.public.players[0] as any).listening=true;(g.public.players[1] as any).listening=false;const encoded=JSON.parse(JSON.stringify(E.encodeGame(g))),expected=structuredClone(encoded);expected.public.rulesVersion='1.5.1';for(const p of expected.public.players)delete p.listening;
  const restored=E.decodeGame(encoded);assert.deepEqual(E.encodeGame(restored),expected);assert.deepEqual(E.encodeGame(E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(restored))))),expected);E.assertGame(restored);
 }
});
test('migrated non-previous-seat borrower can respond immediately; eating and self-discard restrictions remain',()=>{
 const g=game();forceActor(g,0);discard(g);g.public.rulesVersion='1.5.0';(g.public.players[2] as any).listening=false;const restored=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));const responseWindowId=restored.response!.windowId;
 error(restored,0,{kind:'RESPOND',responseWindowId,response:'HU'},'NOT_ACTOR');error(restored,2,{kind:'RESPOND',responseWindowId,response:'EAT'},'EAT_NOT_NEXT_SEAT');respond(restored,{2:'HU'});assert.equal((restored.public.phase as any).applicantId,pid(2));
});
test('historical results retain rule versions; self HU and next-round upgrade remain available',()=>{
 const g=game(2);g.public.rulesVersion='1.5.0';forceActor(g,0);ok(g,0,{kind:'DECLARE_SELF_HU',sentence:sentence(g,0)});vote(g,1);assert.equal(g.public.phase.kind,'ROUND_FINISHED');const history=structuredClone(g.public.history);g.archive.push(structuredClone(g.public));(g.archive[0].players[0] as any).listening=true;
 const restored=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));assert.deepEqual(restored.public.history,history);assert.equal(restored.archive[0].rulesVersion,'1.5.0');assert(!('listening' in restored.archive[0].players[0]));for(let i=0;i<2;i++)ok(restored,i,{kind:'READY',ready:true});ok(restored,0,{kind:'START_ROUND'});assert.equal(restored.public.rulesVersion,'1.7.1');
 const legacy=game(2);legacy.public.rulesVersion='1.4.0';const restoredLegacy=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(legacy))));assert.equal(restoredLegacy.public.rulesVersion,'1.4.0');assert.deepEqual(restoredLegacy.public.phase,legacy.public.phase);
});
