import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../../apps/web/src/fixture';
import {spectatorTableView} from '../../apps/web/src/table3d/spectator-view';
test('public spectator projection has no viewer identity or hand faces for all 2–6 seats',()=>{for(let n=2;n<=6;n++){const e=fixture(n as any),view=spectatorTableView(e.public);assert.equal(view.viewerId,null);assert.equal(view.rack,null);assert.equal(view.seats.length,n);assert(view.seats.every(s=>s.relation==='OTHER'&&s.concealed.kind==='COUNT_AND_GENERIC_BACKS'));const text=JSON.stringify(view);assert(!text.includes('OWN_HAND'));for(const tile of e.private.hand)assert(!text.includes(tile.tileId));}});
test('observers see only already-public HU proposal/history and can never compose or vote',()=>{const e=fixture(4,0,'HU_VOTE'),view=spectatorTableView(e.public);assert.equal(view.publicSentence!.proposalId,(e.public.phase as any).proposal.proposalId);assert.equal(view.publicSentence!.snapshot.tiles.length,14);assert.equal(view.rack,null);assert(!('legalActions'in view));});
