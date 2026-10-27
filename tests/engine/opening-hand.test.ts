import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {initialDeck,validateDeckEntries} from '../../packages/engine/deck';
import {tilePartOfSpeech,isNominalTile} from '../../packages/engine/tile-pos';
import {posOpeningWall,supportsPosOpening} from '../../packages/engine/opening-hand';
import type {PlayerCount,RulesVersion,Tile,TileId} from '../../packages/contracts/types';
import {pid,ok,send,command} from './helpers';
import fixed from '../../【牌库】/默认麻将套组-配置-v1.0-【codex】.json';
import suzhi from '../../【牌库】/素质满满-配置-v2.0-【codex】.json';
function prepared(n:PlayerCount,seed=123456,version:RulesVersion='1.8.0'){
 const g=E.createGame('opening',n,pid(0),'甲','s0','a'.repeat(64),0,seed,version);
 for(let i=1;i<n;i++)E.joinGame(g,pid(i),'玩家'+i,i,'s'+i,'b'.repeat(64),0);
 for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});return g;
}
function verify(g:E.Game){
 const seen=new Set<string>();for(const pub of g.public.players){const p=g.players.get(pub.playerId)!;assert.equal(p.hand.length,pub.seat===g.public.dealerSeat?14:13);const chars=p.draft.orderedTileIds.map(id=>g.tiles.get(id)!.char);assert(isNominalTile(chars[0]),chars.join(''));assert.equal(tilePartOfSpeech(chars[1]),'verb',chars.join(''));assert(isNominalTile(chars[2]),chars.join(''));for(const id of p.hand){assert(!seen.has(id));seen.add(id);}}
 for(const id of g.wall.slice(g.cursor)){assert(!seen.has(id));seen.add(id);}assert.equal(seen.size,g.tiles.size);assert.equal(g.public.wallRemaining,g.tiles.size-(g.public.capacity*13+1));E.assertGame(g);
}
test('every current face has a primary POS, with common polysemy and bound/function words kept out of seeds',()=>{
 for(const d of [initialDeck,fixed,suzhi])for(const e of d.entries)assert.notEqual(tilePartOfSpeech(e.char),'other',e.char);
 for(const c of '我你他她它您')assert.equal(tilePartOfSpeech(c),'pronoun');for(const c of '吃喝爱看听说做想')assert.equal(tilePartOfSpeech(c),'verb');for(const c of '人花树家口钱水')assert.equal(tilePartOfSpeech(c),'noun');for(const c of '的地得了着们能会可')assert(!isNominalTile(c)&&tilePartOfSpeech(c)!=='verb');assert.equal(tilePartOfSpeech('𰻞'),'other');
});
test('2–6 humans get S/V/O roles on all three supplied decks across reproducible random seeds; no fixed phrases',()=>{
 const combinations=new Set<string>();for(const d of [initialDeck,...[fixed,suzhi].map(d=>({...initialDeck,...validateDeckEntries(d.entries)}))])for(let n=2;n<=6;n++)for(let seed=1;seed<=40;seed++){
  const g=prepared(n as PlayerCount,seed);const c=command(g,0,{kind:'START_ROUND'});assert(E.applyCommand(g,pid(0),'s0',c,JSON.stringify(c),0,d).ok);verify(g);for(const p of g.public.players)combinations.add(g.players.get(p.playerId)!.hand.slice(0,3).map(id=>g.tiles.get(id)!.char).join(''));
 }assert(combinations.size>100);
});
test('designated AI receives the same guarantee, without a session or extra tiles',()=>{
 for(let n=2;n<=6;n++){const g=E.createGame('ai-opening',n,pid(0),'甲','s0','a'.repeat(64),0,17);for(let i=1;i<n;i++)ok(g,0,{kind:'ASSIGN_BOT',seat:i});ok(g,0,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});verify(g);assert(g.public.players.filter(p=>p.isBotSeat).every(p=>g.players.get(p.playerId)!.sessionId===null));}
});
test('reservation does not reuse a nominal for both subject and object, and preserves residual shuffled order',()=>{
 const chars='我你他她爱吃的了着'.split(''),wall=chars.map((_,i)=>('t'+i) as TileId),tiles=new Map(wall.map((tileId,i)=>[tileId,{tileId,char:chars[i]} as Tile]));
 const ordered=posOpeningWall(wall,tiles,2);assert.deepEqual(ordered.slice(0,6),[wall[0],wall[1],wall[4],wall[5],wall[2],wall[3]]);assert.deepEqual(ordered.slice(6),wall.slice(6));assert.deepEqual(new Set(ordered),new Set(wall));
 assert.throws(()=>posOpeningWall(wall.slice(1),tiles,2),/INSUFFICIENT_OPENING_POS/);
});
test('an incompatible custom deck rejects START before mutating state, rules, RNG or a previous round',()=>{
 const d={...initialDeck,...validateDeckEntries([{char:'我',copiesByPlayers:{'2':100,'3':100,'4':100,'5':100,'6':100}}])};assert(!supportsPosOpening(d,6));
 for(const old of [false,true]){const g=prepared(2,1234,'1.7.1');if(old){ok(g,0,{kind:'START_ROUND'});E.disconnect(g,pid(1),'s1',0);ok(g,0,{kind:'END_UNSCORED'});E.connect(g,pid(1),'s1',0);for(let i=0;i<2;i++)ok(g,i,{kind:'READY',ready:true});g.public.rulesVersion='1.7.1';}
  const before=E.encodeGame(g),c=command(g,0,{kind:'START_ROUND'}),r=E.applyCommand(g,pid(0),'s0',c,'failed-start',0,d);assert(!r.ok);if(!r.ok)assert.equal(r.code,'INSUFFICIENT_OPENING_POS');assert.deepEqual(E.encodeGame(g),before);
 }
});
test('legacy active games roundtrip without redealing; next START archives and upgrades, retry never deals twice',()=>{
 let g=prepared(2);ok(g,0,{kind:'START_ROUND'});g.public.rulesVersion='1.7.1';const oldWall=[...g.wall],oldHands=[...g.players].map(([id,p])=>[id,[...p.hand]]);g=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));assert.equal(g.public.rulesVersion,'1.7.1');assert.deepEqual(g.wall,oldWall);assert.deepEqual([...g.players].map(([id,p])=>[id,[...p.hand]]),oldHands);
 // One online human permits an unscored finish without publishing a nonsense HU sentence.
 E.disconnect(g,pid(1),'s1',0);ok(g,0,{kind:'END_UNSCORED'});E.connect(g,pid(1),'s1',0);for(let i=0;i<2;i++)ok(g,i,{kind:'READY',ready:true});const c=command(g,0,{kind:'START_ROUND'});assert(send(g,0,c).ok);verify(g);assert.equal(g.public.rulesVersion,'1.8.0');assert.equal(g.archive.at(-1)!.rulesVersion,'1.7.1');const once=E.encodeGame(g);assert(send(g,0,c).ok);assert.deepEqual(E.encodeGame(g),once);
});
