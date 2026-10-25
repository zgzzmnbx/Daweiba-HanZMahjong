import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {LITERARY_NICKNAMES} from '../../packages/contracts/avatars';
import {playerDisplayName} from '../../packages/contracts/browser-return';
import {pid,ok,command} from './helpers';

function room(capacity=6){return E.createGame('literary-ai',capacity,pid(0),'房主','s0','x',0,654321);}
function checkNames(g:E.Game){
 const bots=g.public.players.filter(p=>p.isBotSeat);
 assert.equal(new Set(bots.map(p=>p.nickname)).size,bots.length);
 for(const p of bots){assert(p.nickname.startsWith('AI · '));assert(LITERARY_NICKNAMES.some(n=>n===p.nickname.slice(5)));assert.equal(g.players.get(p.playerId)!.nickname,p.nickname);}
}
for(let capacity=2;capacity<=6;capacity++)test(`${capacity} seats: AI names come from the shared library without consuming game RNG`,()=>{
 const g=room(capacity),rng=g.rng;
 for(let seat=1;seat<capacity;seat++)ok(g,0,{kind:'ASSIGN_BOT',seat});
 checkNames(g);assert.equal(g.rng,rng);
 const before=g.public.players.map(p=>p.nickname);
 const restored=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));
 E.restart(restored,100,'names-restart');checkNames(restored);
 assert.deepEqual(restored.public.players.map(p=>p.nickname),before);
});
test('AI skips a human using its first-choice name, with or without the prefix',()=>{
 const probe=room();ok(probe,0,{kind:'ASSIGN_BOT',seat:1});const first=probe.public.players[1].nickname;
 for(const name of [first,first.slice(5)]){
  const g=room();g.public.players[0].nickname=name;g.players.get(pid(0))!.nickname=name;
  ok(g,0,{kind:'ASSIGN_BOT',seat:1});checkNames(g);assert.notEqual(g.public.players[1].nickname,first);
 }
});
test('retrying assignment does not rename or allocate an extra AI',()=>{
 const g=room(),c=command(g,0,{kind:'ASSIGN_BOT',seat:1});ok(g,0,c);
 const before=JSON.stringify(E.encodeGame(g));ok(g,0,c);assert.equal(JSON.stringify(E.encodeGame(g)),before);
});
test('admin replacement AI gets a library name while the departed identity remains unchanged',()=>{
 const g=room(3);E.joinGame(g,pid(1),'被替换的朋友',1,'s1','y',0);ok(g,0,{kind:'ASSIGN_BOT',seat:2});
 ok(g,0,{kind:'READY',ready:true});ok(g,1,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});
 const rng=g.rng;E.kickSeat(g,1,1);checkNames(g);assert.equal(g.rng,rng);
 assert.equal(g.players.get(pid(1))!.nickname,'被替换的朋友');assert.equal(g.players.get(pid(1))!.seat,null);E.assertGame(g);
});
test('legacy upgrade changes only designated live seats and remains stable across restarts',()=>{
 const g=room();g.public.players[0].nickname='AI 2';g.players.get(pid(0))!.nickname='AI 2';
 for(let seat=1;seat<6;seat++){ok(g,0,{kind:'ASSIGN_BOT',seat});const p=g.public.players[seat];p.nickname=`AI ${seat+1}`;g.players.get(p.playerId)!.nickname=p.nickname;}
 g.archive.push(structuredClone(g.public));const archive=JSON.stringify(g.archive),rng=g.rng;
 E.restart(g,100,'upgrade');checkNames(g);assert.equal(g.public.players[0].nickname,'AI 2');assert.equal(g.rng,rng);assert.equal(JSON.stringify(g.archive),archive);
 const names=g.public.players.map(p=>p.nickname);E.restart(g,200,'again');assert.deepEqual(g.public.players.map(p=>p.nickname),names);
 g.public.players[0].presence='BOT';assert.equal(playerDisplayName(g.public.players[0]),'AI 2（AI托管）');
});
