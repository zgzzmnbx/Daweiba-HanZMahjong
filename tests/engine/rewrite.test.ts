import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {borrowedHuVisible,completedCircuits,rewriteUnlocked} from '../../packages/contracts/response-policy';
import {pid,ok,error,send,command,discard,respond,actor,sentence,vote} from './helpers';
function game(n=2){const g=E.createGame('rewrite-'+n,n,pid(0),'甲','s0','hash',0,1);for(let i=1;i<n;i++)E.joinGame(g,pid(i),'人'+i,i,'s'+i,'hash',0);for(let i=0;i<n;i++)ok(g,i,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});return g;}
function advance(g:E.Game,count:number){for(let i=0;i<count;i++){discard(g);respond(g);}}
const different=(g:E.Game,id:any)=>g.tiles.get(id)!.char==='妙'?'诗':'妙';
for(let n=2;n<=6;n++)test(`${n} seats: real 10/20 circuit boundaries, private rewrite keeps tile count and deadline`,()=>{
 const g=game(n);advance(g,n*10-1);assert.equal(completedCircuits(g.public),9);assert(!borrowedHuVisible(g.public));discard(g);assert(borrowedHuVisible(g.public));respond(g);advance(g,n*10-1);
 const before=actor(g),earlyTile=g.players.get(pid(before))!.hand[0];assert(!rewriteUnlocked(g.public));error(g,before,{kind:'REWRITE_TILE',tileId:earlyTile,char:different(g,earlyTile)},'REWRITE_LOCKED');
 discard(g);respond(g);assert.equal(completedCircuits(g.public),20);assert(rewriteUnlocked(g.public));const i=actor(g),p=g.players.get(pid(i))!,tileId=p.hand[0],char=different(g,tileId),deadline=structuredClone(g.public.phase.deadline),count=g.tiles.size,hand=[...p.hand],draft=structuredClone(p.draft),cursor=g.cursor;
 const c=command(g,i,{kind:'REWRITE_TILE',tileId,char});ok(g,i,c);assert.equal(g.tiles.get(tileId)!.char,char);assert.equal(g.tiles.size,count);assert.deepEqual(p.hand,hand);assert.deepEqual(p.draft,draft);assert.equal(g.cursor,cursor);assert.deepEqual(g.public.phase.deadline,deadline);assert.equal(E.snapshot(g,pid(i),0).private.hand.find(t=>t.tileId===tileId)!.char,char);
 const other=E.snapshot(g,pid((i+1)%n),0);assert(!JSON.stringify(other).includes(tileId),'no new private card leak');assert(g.public.players.find(p=>p.playerId===pid(i))!.rewriteUsed);const v=g.public.stateVersion;ok(g,i,c);assert.equal(g.public.stateVersion,v);error(g,i,{kind:'REWRITE_TILE',tileId:p.hand[1],char:'诗'},'REWRITE_USED');
 E.assertGame(E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g)))));
});
test('rewrite validates phase, actor, ownership, single Han input, no-op, paused and autoplay without spending',()=>{
 const g=game();advance(g,40);const i=actor(g),p=g.players.get(pid(i))!,tileId=p.hand[0];error(g,1-i,{kind:'REWRITE_TILE',tileId:g.players.get(pid(1-i))!.hand[0],char:'妙'},'NOT_ACTOR');error(g,i,{kind:'REWRITE_TILE',tileId:g.wall[g.cursor],char:'妙'},'ILLEGAL_TILE');
 for(const char of ['', '你好','a','，','1',' 妙','妙\n',null,{}])error(g,i,{kind:'REWRITE_TILE',tileId,char},'INVALID_REWRITE_CHAR');error(g,i,{kind:'REWRITE_TILE',tileId,char:g.tiles.get(tileId)!.char},'REWRITE_UNCHANGED');assert(!g.public.players.find(p=>p.playerId===pid(i))!.rewriteUsed);
 const deadline=g.public.phase.deadline!.endsAt;error(g,i,{kind:'REWRITE_TILE',tileId,char:'妙'},'PHASE_CLOSED',deadline);ok(g,i,{kind:'SET_AUTOPLAY',enabled:true});error(g,i,{kind:'REWRITE_TILE',tileId,char:'妙'},'AUTOPLAY_ACTIVE');ok(g,i,{kind:'SET_AUTOPLAY',enabled:false});
 g.public.suspension={kind:'PAUSED_ALL_OFFLINE',expiresAt:999999 as any};error(g,i,{kind:'REWRITE_TILE',tileId,char:'妙'},'ROOM_PAUSED');g.public.suspension={kind:'RUNNING'};discard(g);error(g,i,{kind:'REWRITE_TILE',tileId:p.hand[0],char:'妙'},'PHASE_CLOSED');
});
test('rewriting an eaten tile preserves old discard glyph and immediate-discard protection',()=>{
 const g=game();advance(g,39);const from=discard(g),to=1-from,d=g.public.discards.at(-1)!,old=d.tile.char;respond(g,{[to]:'EAT'});assert.equal(d.status,'CLAIMED');assert.equal(completedCircuits(g.public),20);ok(g,to,{kind:'REWRITE_TILE',tileId:d.tile.tileId,char:different(g,d.tile.tileId)});assert.equal(d.tile.char,old);error(g,to,{kind:'DISCARD',tileId:d.tile.tileId},'EAT_TILE_PROTECTED');E.assertGame(g);
});
test('personal grants persist across restart, do not mutate a past HU sentence, and reset only on next START',()=>{
 let g=game();advance(g,40);const i=actor(g),tileId=g.players.get(pid(i))!.hand[0],old=g.tiles.get(tileId)!.char;ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});vote(g,1-i,'REJECT');ok(g,i,{kind:'REWRITE_TILE',tileId,char:different(g,tileId)});assert.equal(g.public.history[0].snapshot.tiles.find(t=>t.tileId===tileId)!.char,old);
 g=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));assert(g.public.players.find(p=>p.playerId===pid(i))!.rewriteUsed);assert(!g.public.players.find(p=>p.playerId===pid(1-i))!.rewriteUsed);const d=g.players.get(pid(i))!.hand.find(t=>t!==tileId)!;ok(g,i,{kind:'DISCARD',tileId:d});respond(g);const next=actor(g),nextTile=g.players.get(pid(next))!.hand[0];ok(g,next,{kind:'REWRITE_TILE',tileId:nextTile,char:different(g,nextTile)});ok(g,next,{kind:'DECLARE_SELF_HU',sentence:sentence(g,next)});vote(g,1-next);for(let j=0;j<2;j++)ok(g,j,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});assert(g.public.players.every(p=>p.rewriteUsed===false));assert.equal(completedCircuits(g.public),0);assert(g.archive.at(-1)!.players.every(p=>p.rewriteUsed));E.assertGame(g);
});
test('active 1.6.1 stays frozen through recovery, and upgrades on next START',()=>{
 let g=game();g.public.rulesVersion='1.6.1';advance(g,40);g=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));const i=actor(g),tileId=g.players.get(pid(i))!.hand[0];assert(!E.legalActions(g,pid(i)).includes('REWRITE_TILE'));error(g,i,{kind:'REWRITE_TILE',tileId,char:different(g,tileId)},'REWRITE_LOCKED');ok(g,i,{kind:'DECLARE_SELF_HU',sentence:sentence(g,i)});vote(g,1-i);for(let j=0;j<2;j++)ok(g,j,{kind:'READY',ready:true});ok(g,0,{kind:'START_ROUND'});assert.equal(g.public.rulesVersion,'1.8.0');assert.equal(g.archive.at(-1)!.rulesVersion,'1.6.1');assert(g.public.players.every(p=>p.rewriteUsed===false));
});
