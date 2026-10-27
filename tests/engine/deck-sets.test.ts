import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../packages/engine/index';
import {validateDeckEntries} from '../../packages/engine/deck';
import type {DeckSetSnapshot} from '../../packages/contracts/deck';
import {pid,ok,command,send} from './helpers';
const id='set-00000000-0000-0000-0000-000000000001',other='set-00000000-0000-0000-0000-000000000002';
function set(revision=0):DeckSetSnapshot{return{id,name:`套组 ${revision}`,revision,version:`${id}-r${revision}`,...validateDeckEntries(Array.from({length:5},(_,i)=>({char:i===0?'我':i===1?'吃':String.fromCodePoint(0x20000+i+revision*5),copiesByPlayers:{'2':20,'3':20,'4':20,'5':20,'6':20}})))};}
let serial=0;
function room(n=2){const g=E.createGame(`set-engine-${++serial}`,n,pid(0),'房主','s0','x',0,1);g.public.deckSetId=id;g.public.deckSetName='建房名字';for(let seat=1;seat<n;seat++)ok(g,0,{kind:'ASSIGN_BOT',seat});ok(g,0,{kind:'READY',ready:true});return g;}
function start(g:E.Game,deck:DeckSetSnapshot){const c=command(g,0,{kind:'START_ROUND'}),result=E.applyCommand(g,pid(0),'s0',c,JSON.stringify(c),0,deck);assert.equal(result.ok,true);return{c,result};}

test('2–6 seat named sets freeze exact ID/name/version/configuration and all physical tile ownership',()=>{for(let n=2;n<=6;n++){const g=room(n),s=set();start(g,s);assert.equal(g.public.deckSetId,id);assert.equal(g.public.deckSetName,s.name);assert.equal(g.public.deckVersion,s.version);assert.deepEqual(g.roundDeck,s);assert.equal(g.tiles.size,100);assert.equal(g.public.wallRemaining,100-13*n-1);assert.ok([...g.tiles.values()].every(t=>t.tileId.includes(s.version)&&s.entries.some(e=>e.char===t.char)));const recovered=E.decodeGame(JSON.parse(JSON.stringify(E.encodeGame(g))));E.restart(recovered,1000,'restart');assert.deepEqual(recovered.roundDeck,s);assert.deepEqual(recovered.wall,g.wall);assert.equal(recovered.public.deckSetName,s.name);E.assertGame(recovered);}});

test('next START uses same-set latest revision/name and archives prior frozen metadata before changing them',()=>{const g=room(),first=set(),next=set(1);start(g,first);const oldTiles=structuredClone([...g.tiles]);ok(g,0,{kind:'END_UNSCORED'});assert.deepEqual([...g.tiles],oldTiles);ok(g,0,{kind:'READY',ready:true});start(g,next);assert.equal(g.archive.length,1);assert.equal(g.archive[0].deckSetName,first.name);assert.equal(g.archive[0].deckVersion,first.version);assert.equal(g.public.deckSetName,next.name);assert.equal(g.public.deckVersion,next.version);assert.deepEqual(g.roundDeck,next);});

test('named binding cannot switch set even with valid metadata, and committed START action cannot redraw after a later revision',()=>{const g=room(),before=structuredClone(E.encodeGame(g)),s=set(),wrong={...s,id:other,version:`${other}-r0`};assert.throws(()=>start(g,wrong),/IMMUTABLE_DECK_SET_BINDING/);assert.deepEqual(E.encodeGame(g),before);const{c,result}=start(g,s),wall=[...g.wall],round=g.public.roundId;assert.deepEqual(E.applyCommand(g,pid(0),'s0',c,JSON.stringify(c),0,set(1)),result);assert.deepEqual(g.wall,wall);assert.equal(g.public.roundId,round);assert.deepEqual(g.roundDeck,s);});

test('codec rejects inconsistent frozen set identity/name/version rather than silently relabeling current tiles',()=>{const g=room();start(g,set());for(const change of [(json:any)=>json.public.deckSetId=other,(json:any)=>json.public.deckSetName='被替换的名字',(json:any)=>json.roundDeck.id=other]){const json=JSON.parse(JSON.stringify(E.encodeGame(g)));change(json);assert.throws(()=>E.decodeGame(json),/INVALID_DECK_SET/);}assert.equal(send(g,0,{kind:'SAVE_DRAFT',expectedDraftVersion:g.players.get(pid(0))!.draftVersion,draft:g.players.get(pid(0))!.draft}).ok,true);});
