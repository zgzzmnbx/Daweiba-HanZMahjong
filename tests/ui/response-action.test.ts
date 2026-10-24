import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../../apps/web/src/fixture';
import {isNextDrawer} from '../../apps/web/src/table-ui/response-action';
test('for every 2–6 seat table only the next logical seat labels PASS as drawing',()=>{for(let n=2;n<=6;n++)for(let discarder=0;discarder<n;discarder++)for(let seat=0;seat<n;seat++){const e=fixture(n as any,seat as any,'DISCARD_RESPONSE');(e.public.phase as any).discarderId=`demo-p${discarder}`;assert.equal(isNextDrawer(e),seat===(discarder+1)%n);}});
test('ordinary turns, composing, review, waiting and spectators cannot offer a draw response',()=>{for(const phase of ['TURN_ACTION','HU_COMPOSE','HU_VOTE','LOBBY','ROUND_FINISHED'])assert.equal(isNextDrawer(fixture(4,0,phase)),false);const e=fixture(4,0,'DISCARD_RESPONSE');(e.private as any).seat=null;assert.equal(isNextDrawer(e),false);});
