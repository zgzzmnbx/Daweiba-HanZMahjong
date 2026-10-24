import test from 'node:test';import assert from 'node:assert/strict';
import {room,pid,actor,discard,respond} from '../engine/helpers';
import {snapshot} from '../../packages/engine/index';
import {fixture} from '../../apps/web/src/fixture';
import {rackInteractionStamp} from '../../apps/web/src/table-ui/rack-interaction';
import {SentenceRackController} from '../../apps/web/src/table-ui/SentenceRackController';
test('2–6 seats keep held selection across opponent discards/draws; own draw invalidates and commands use the latest phase',async()=>{
 for(let n=2;n<=6;n++)for(let offset=1;offset<n;offset++){
  const g=room(n),holder=(actor(g)+offset)%n,e=snapshot(g,pid(holder),1000),sent:any[]=[],c=new SentenceRackController(e,{send:async command=>{sent.push(command);return{ok:true,actionId:command.actionId,stateVersion:command.expectedStateVersion,status:'RECORDED',needsResync:false};}},()=>{}),id=e.private.hand[0].tileId,stamp=rackInteractionStamp(e);c.select(id);
  discard(g);const after=snapshot(g,pid(holder),2000);assert.notEqual(e.public.phase.phaseId,after.public.phase.phaseId);assert.equal(rackInteractionStamp(after),stamp);c.replace(after);assert.equal(c.selected,id);await c.saveDraft();assert.equal(sent[0].phaseId,after.public.phase.phaseId);assert.equal(sent[0].expectedStateVersion,after.public.stateVersion);
  respond(g);const drawn=snapshot(g,pid(holder),3000);c.replace(drawn);if(offset===1){assert.notEqual(rackInteractionStamp(drawn),stamp);assert.equal(c.selected,null);}else{assert.equal(rackInteractionStamp(drawn),stamp);assert.equal(c.selected,id);}
 }
});
test('physical hand, identity, authority, pause and HU transitions invalidate a held preview',()=>{
 const e=fixture(),stamp=rackInteractionStamp(e);const change=(mutate:(v:any)=>void)=>{const next=structuredClone(e);mutate(next);assert.notEqual(rackInteractionStamp(next),stamp);};
 change(e=>e.private.hand.pop());change(e=>e.private.hand[0].tileId='replacement');change(e=>e.private.controlEpoch++);change(e=>e.private.playerId='different');change(e=>e.public.roundId='next');change(e=>e.public.suspension.kind='PAUSED_CLAIMANT_GRACE');change(e=>e.public.players.find((p:any)=>p.playerId===e.private.playerId).autoPlay=true);change(e=>e.private.draftVersion++);
 for(const kind of ['HU_COMPOSE','HU_VOTE','ROOM_CLOSED'] as const)assert.notEqual(rackInteractionStamp(fixture(4,0,kind)),stamp);
 const reordered=structuredClone(e);(reordered.private as any).hand=[...e.private.hand].reverse();assert.equal(rackInteractionStamp(reordered),stamp);
});
