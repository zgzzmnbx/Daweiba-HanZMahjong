import test from 'node:test';
import assert from 'node:assert/strict';
import {discardSpeechEvents,type SpeechFrame} from '../../apps/web/src/discard-speech';
import {room,discard,respond} from '../engine/helpers';
const frame=(g:ReturnType<typeof room>,active=true):SpeechFrame=>({room:structuredClone(g.public),session:'player:epoch1',active});
test('a committed discard is spoken by every viewer regardless of actor or control mode',()=>{
 const g=room(3),a=frame(g);discard(g,20000);const b=frame(g),d=g.public.discards.at(-1)!;
 assert.deepEqual(discardSpeechEvents(a,b),[d]);
 for(const session of ['human-a','human-b','spectator'])assert.deepEqual(discardSpeechEvents({...a,session},{...b,session}),[d]);
 const bot=structuredClone(b);(bot.room.players.find(p=>p.playerId===d.playerId) as any).isBotSeat=true;
 assert.deepEqual(discardSpeechEvents(a,bot),[d]);
});
test('selection, draft updates, duplicate snapshots, stale snapshots and claimed-status changes are silent',()=>{
 const g=room(2),a=frame(g),draft=structuredClone(a);(draft.room as any).stateVersion++;
 assert.deepEqual(discardSpeechEvents(a,draft),[]);discard(g);const b=frame(g);
 assert.deepEqual(discardSpeechEvents(b,b),[]);assert.deepEqual(discardSpeechEvents(b,a),[]);
 const claimed=structuredClone(b);(claimed.room as any).stateVersion++;(claimed.room.discards[0] as any).status='CLAIMED';
 assert.deepEqual(discardSpeechEvents(b,claimed),[]);
});
test('refresh, reconnect, control transfer, suspension and new rounds do not read historical discards',()=>{
 const g=room(2),a=frame(g);discard(g);const b=frame(g);
 assert.deepEqual(discardSpeechEvents(null,b),[]);
 for(const [old,next]of [[{...a,active:false},b],[a,{...b,active:false}],[a,{...b,session:'player:epoch2'}],[a,{...b,room:{...b.room,roomId:'other' as any}}],[a,{...b,room:{...b.room,roundId:'other' as any}}],[a,{...b,room:{...b.room,suspension:{kind:'PAUSED_RECOVERY',expiresAt:100000} as any}}]] as [SpeechFrame,SpeechFrame][])assert.deepEqual(discardSpeechEvents(old,next),[]);
});
test('batched public snapshots retain every new discard in order, including repeated characters',()=>{
 const g=room(2),a=frame(g);discard(g);respond(g);discard(g);const b=frame(g);
 assert.equal(discardSpeechEvents(a,b).length,2);
 const repeated=structuredClone(b);(repeated.room.discards[1].tile as any).char=repeated.room.discards[0].tile.char;
 assert.deepEqual(discardSpeechEvents(a,repeated).map(d=>d.discardId),b.room.discards.map(d=>d.discardId));
});
