import test from 'node:test';
import assert from 'node:assert/strict';
import deck from '../../【牌库】/素质满满-配置-v2.0-【codex】.json';
import original from '../../【牌库】/素质满满-原始配置-v1.0-【codex】.json';
import {validateDeckEntries} from '../../packages/engine/deck';
import {tileWord} from '../../apps/server/tile-words';
const count=(text:string)=>{const out=new Map<string,number>();for(const ch of text)out.set(ch,(out.get(ch)??0)+1);return out;};
test('expanded suzhi deck preserves all original characters, legal 2–6 player counts and role totals',()=>{
 const d=validateDeckEntries(deck.entries);assert.deepEqual(d.totals,deck.totals);assert.equal(d.entries.length,336);const stock=new Map(d.entries.map(e=>[e.char,e]));assert(original.entries.every(e=>stock.has(e.char)));assert.equal(d.entries.length-original.entries.length,187);
 for(const n of ['2','3','4','5','6'] as const){assert.equal(d.totals[n],672);const roles=new Map<string,number>();for(const e of d.entries){const role=(deck.roles as Record<string,string>)[e.char];assert(role);roles.set(role,(roles.get(role)??0)+e.copiesByPlayers[n]);}assert.deepEqual(Object.fromEntries(roles),deck.roleTotals);assert((roles.get('虚词与句式连接')??0)/d.totals[n]>.28);}
});
test('every promised slang phrase and fourteen-character example can be built from actual tile counts',()=>{
 const stock=new Map(deck.entries.map(e=>[e.char,e.copiesByPlayers['2']]));assert.equal(deck.phrases.length,165);assert.equal(new Set(deck.phrases).size,165);for(const text of [...deck.phrases,...deck.examples])for(const [ch,n]of count(text))assert((stock.get(ch)??0)>=n,`${text}: ${ch} needs ${n}`);assert(deck.examples.every(s=>[...s].length===14));
});
test('every expanded tile has a fixed two-Han spoken name beginning with its face',()=>{for(const e of deck.entries){const word=tileWord(e.char);assert(word,e.char);assert.match(word,/^\p{Unified_Ideograph}{2}$/u);assert.equal([...word][0],e.char);}});
