import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../packages/engine/index';
import {pid,ok,command} from '../tests/engine/helpers';
const bytes=readFileSync('【牌库】/默认麻将套组-（基于文字失明）-v1.0.txt');
const cfg=JSON.parse(readFileSync('【牌库】/默认麻将套组-配置-v1.0-【codex】.json','utf8'));
const id='set-00000000-0000-0000-0000-000000000144';
const deck={id,name:cfg.name,revision:1,version:`${id}-r1`,entries:cfg.entries,totals:{'2':144,'3':144,'4':144,'5':144,'6':144}};
assert.equal(createHash('sha256').update(bytes).digest('hex'),cfg.sourceSha256);
const expected=new Map<string,number>();for(const ch of bytes.toString().replace(/\s/gu,''))expected.set(ch,(expected.get(ch)??0)+1);
for(let n=2;n<=6;n++){
 const g=E.createGame(`fixed-deck-${n}`,n,pid(0),'验收','s0','x',0,1);g.public.deckSetId=deck.id;g.public.deckSetName=deck.name;
 for(let seat=1;seat<n;seat++)ok(g,0,{kind:'ASSIGN_BOT',seat});ok(g,0,{kind:'READY',ready:true});
 const c=command(g,0,{kind:'START_ROUND'});assert.equal(E.applyCommand(g,pid(0),'s0',c,JSON.stringify(c),0,deck).ok,true);
 assert.equal(g.tiles.size,144);assert.equal(g.public.wallRemaining,144-13*n-1);
 const actual=new Map<string,number>();for(const t of g.tiles.values())actual.set(t.char,(actual.get(t.char)??0)+1);
 assert.deepEqual(actual,expected);E.assertGame(g);
 console.log(`PASS ${n} seats: 144 physical tiles, 142 unique characters, exact duplicate counts, wall ${g.public.wallRemaining}, ownership invariant`);
}
