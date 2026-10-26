import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../../apps/web/src/fixture';
import {isNextDrawer,borrowedHuVisible,canEatDiscard} from '../../apps/web/src/table-ui/response-action';
test('for every 2–6 seat table only the next logical seat labels PASS as drawing',()=>{for(let n=2;n<=6;n++)for(let discarder=0;discarder<n;discarder++)for(let seat=0;seat<n;seat++){const e=fixture(n as any,seat as any,'DISCARD_RESPONSE');(e.public.phase as any).discarderId=`demo-p${discarder}`;assert.equal(isNextDrawer(e),seat===(discarder+1)%n);}});
test('ordinary turns, composing, review, waiting and spectators cannot offer a draw response',()=>{for(const phase of ['TURN_ACTION','HU_COMPOSE','HU_VOTE','LOBBY','ROUND_FINISHED'])assert.equal(isNextDrawer(fixture(4,0,phase)),false);const e=fixture(4,0,'DISCARD_RESPONSE');(e.private as any).seat=null;assert.equal(isNextDrawer(e),false);});

test('borrowed HU appears at ten circuits for 2–6 seats and survives resync and claimed tiles',()=>{
 for(let n=2;n<=6;n++){
  const e=fixture(n as any,0,'DISCARD_RESPONSE'),tile=e.public.discards[0];
  for(const count of [0,n*10-1,n*10,n*10+1]){
   (e.public as any).discards=Array.from({length:count},(_,i)=>({...tile,status:i%2?'CLAIMED':'AVAILABLE'})) as any;
   assert.equal(borrowedHuVisible(e.public),count>=n*10);assert.equal(borrowedHuVisible(structuredClone(e.public)),count>=n*10);
  }
  (e.public as any).discards=[];assert.equal(borrowedHuVisible(e.public),false);
 }
});

test('drag EAT eligibility uses upstream seats for 2–6 people including global HU response windows',()=>{
 for(let n=2;n<=6;n++)for(let discarder=0;discarder<n;discarder++)for(let seat=0;seat<n;seat++){
  const e=fixture(n as any,seat as any,'DISCARD_RESPONSE');(e.public as any).rulesVersion='1.7.0';(e.public.phase as any).discarderId=`demo-p${discarder}`;
  assert.equal(canEatDiscard(e),seat===(discarder+1)%n);
 }
});
test('drag EAT preserves old round limits and rejects spent responses, autoplay, pause and non-response phases',()=>{
 const e=fixture(4,0,'DISCARD_RESPONSE');(e.public.phase as any).discarderId='demo-p3';const self=e.public.players.find(p=>p.playerId===e.private.playerId)!;(self as any).eatCount=3;assert(!canEatDiscard(e));(e.public as any).rulesVersion='1.7.0';assert(canEatDiscard(e));
 (self as any).autoPlay=true;assert(!canEatDiscard(e));(self as any).autoPlay=false;(e as any).legalActions=[];assert(!canEatDiscard(e));(e as any).legalActions=['RESPOND'];(e.public.suspension as any).kind='PAUSED';assert(!canEatDiscard(e));
 for(const phase of ['TURN_ACTION','HU_COMPOSE','HU_VOTE','LOBBY','ROUND_FINISHED'])assert(!canEatDiscard(fixture(4,0,phase)));
});
