import test from 'node:test';
import assert from 'node:assert/strict';
import {deckError,playerCounts} from '../../apps/web/src/admin-client';
import {validateDeckEntries} from '../../packages/engine/deck';
import type {DeckEntry} from '../../packages/contracts/deck';
const entry=(char:string,count:number):DeckEntry=>({char,copiesByPlayers:{'2':count,'3':count,'4':count,'5':count,'6':count}});
test('frontend and engine accept repeated characters above twenty through the total wall budget',()=>{
 for(const count of [20,21,100,900]){const entries=[entry('我',count),entry('你',100)];assert.equal(deckError(entries),'');assert.equal(validateDeckEntries(entries).totals['6'],count+100);}
 const single=[entry('我',1000)];assert.equal(deckError(single),'');assert.equal(validateDeckEntries(single).totals['2'],1000);
});
test('removing per-character cap preserves aggregate limits and rejects non-integer input for every capacity',()=>{
 for(const n of playerCounts)for(const count of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,1001]){
  const original=entry('我',100),entries=[{...original,copiesByPlayers:{...original.copiesByPlayers,[n]:count}}];assert.notEqual(deckError(entries),'');assert.throws(()=>validateDeckEntries(entries),/INVALID_DECK/);
 }
 const over=[entry('我',501),entry('你',500)];assert.match(deckError(over),/总牌数/);assert.throws(()=>validateDeckEntries(over));
 const short=[entry('我',98)];assert.match(deckError(short),/6 人桌/);assert.throws(()=>validateDeckEntries(short));
});
