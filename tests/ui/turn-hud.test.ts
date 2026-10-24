import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../../apps/web/src/fixture';
import {phaseClock,turnHint,spectatorHint} from '../../apps/web/src/table-ui/turn-hud';

test('timer uses frozen phase duration, clamps expiry and grades remaining fraction',()=>{
 const e=fixture();(e.public as any).rulesVersion='1.4.0';const end=e.public.phase.deadline!.endsAt;
 for(const [remaining,ratio,tone]of [[120000,1,'calm'],[60000,.5,'warning'],[24000,.2,'danger'],[0,0,'danger'],[-1000,0,'danger']] as const){const c=phaseClock(e.public,end-remaining);assert.equal(c.ratio,ratio);assert.equal(c.tone,tone);assert.equal(c.seconds,Math.max(0,remaining/1000));}
 assert.equal(phaseClock(e.public,end-300000).ratio,1);
});
test('old rounds, mandatory discard, response, composition, review and AI keep distinct budgets',()=>{
 for(const [kind,version,total]of [['TURN_ACTION','1.0.0',60000],['HU_COMPOSE','1.0.0',45000],['HU_COMPOSE','1.4.0',120000],['HU_VOTE','1.2.0',45000],['HU_VOTE','1.3.0',60000],['DISCARD_RESPONSE','1.4.0',8000]] as const){const e=fixture(4,0,kind);(e.public as any).rulesVersion=version;assert.equal(phaseClock(e.public,e.public.phase.deadline!.endsAt-total/2).ratio,.5);}
 const e=fixture();(e.public.phase as any).mustDiscard=true;assert.equal(phaseClock(e.public,e.public.phase.deadline!.endsAt-15000).ratio,.5);
 (e.public as any).rulesVersion='1.4.0';(e.public.players[0] as any).autoPlay=true;assert.equal(phaseClock(e.public,e.public.phase.deadline!.endsAt-2500).ratio,.5);
});
test('pause freezes the bar, resync does not reset it and no deadline is idle',()=>{
 const e=fixture();(e.public as any).suspension={kind:'PAUSED_RECOVERY'};(e.public.phase.deadline as any).remainingMsWhenPaused=12000;
 assert.deepEqual(phaseClock(e.public,100),phaseClock(e.public,9999999999999));assert.equal(phaseClock(e.public,100).tone,'idle');
 (e.public as any).suspension={kind:'RUNNING'};(e.public.phase.deadline as any).remainingMsWhenPaused=null;
 const at=e.public.phase.deadline!.endsAt-12000;assert.deepEqual(phaseClock(e.public,at),phaseClock(structuredClone(e.public),at));
 assert.equal(phaseClock(fixture(4,0,'ROUND_FINISHED').public,at).seconds,null);
});
test('action hints distinguish self, opponent, autoplay, pause and lost control',()=>{
 const e=fixture();assert.equal(turnHint(e),'请选择打什么牌');(e.public.phase as any).actorId='demo-p1';assert.equal(turnHint(e),'等听雨出牌');
 (e.public.phase as any).actorId='demo-p0';(e.public.players[0] as any).autoPlay=true;assert.equal(turnHint(e),'AI 正在替你出牌');
 assert.equal(turnHint(e,false),'正在重连，请稍候');assert.equal(turnHint(e,true,false),'请在当前控制窗口操作');
 (e.public as any).suspension={kind:'PAUSED_RECOVERY'};assert.equal(turnHint(e),'牌局暂停，等待恢复');
});
test('only next eligible player is prompted to eat; submitted and discarder wait',()=>{
 const e=fixture(4,0,'DISCARD_RESPONSE');assert.equal(turnHint(e),'吃这张，还是摸牌？');
 (e.public.players[0] as any).eatCount=3;assert.equal(turnHint(e),'摸一张，还是借字胡？');
 (e.public.phase as any).discarderId='demo-p1';assert.equal(turnHint(e),'借字胡，还是过？');
 (e.private as any).ownResponse='PASS';assert.equal(turnHint(e),'已回应，等其他玩家');
 (e.public.phase as any).discarderId=e.private.playerId;assert.equal(turnHint(e),'等大家回应这张牌');
});
test('review and compose prompts respect roles; observer never receives a command',()=>{
 const e=fixture(4,0,'HU_VOTE');assert.equal(turnHint(e),'这句话通顺吗？请投票');(e as any).legalActions=[];(e.private as any).ownBallot={choice:'APPROVE'};assert.equal(turnHint(e),'已投票，等大家评审');
 (e.private as any).ownBallot=null;(e.public.phase as any).proposal.applicantId=e.private.playerId;assert.equal(turnHint(e),'你的句子，等大家评审');
 const c=fixture(4,0,'HU_COMPOSE');assert.equal(turnHint(c),'排好这句话，再提交');assert.equal(spectatorHint(c.public),'观看借字排句');
 assert.match(spectatorHint(fixture().public),/^观看.*出牌$/);
});

test('three-second AI progress uses the new budget while old rounds retain five seconds',()=>{for(const [version,total]of [['1.4.0',5000],['1.4.1',3000]] as const){const e=fixture();(e.public as any).rulesVersion=version;(e.public.players[0] as any).autoPlay=true;const end=e.public.phase.deadline!.endsAt;assert.equal(phaseClock(e.public,end-total).ratio,1);assert.equal(phaseClock(e.public,end-total/2).ratio,.5);assert.equal(phaseClock(e.public,end).ratio,0);}});
