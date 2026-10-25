import type {PublicRoomSnapshot,ResyncEnvelope} from '../../../../packages/contracts/types';
import defaults from '../../../../packages/contracts/rules.defaults.json';
import {timingForRules} from '../../../../packages/engine/timing';
import {isNextDrawer,borrowedHuVisible} from './response-action';

/** Display only. Denominator comes from the frozen rule version, never from mount time. */
export function phaseClock(p:PublicRoomSnapshot,now:number){
 const ph=p.phase,t=timingForRules(p.rulesVersion),actor=ph.kind==='TURN_ACTION'?p.players.find(x=>x.playerId===ph.actorId):undefined;
 const total=ph.kind==='TURN_ACTION'?(['1.4.0','1.4.1','1.5.0','1.5.1'].includes(p.rulesVersion)&&(actor?.isBotSeat||actor?.autoPlay||actor?.presence==='BOT')?t.botActionDelayMs:ph.mustDiscard?t.postHuDiscardMs:t.turnMs):ph.kind==='HU_COMPOSE'?t.composeMs:ph.kind==='HU_VOTE'?t.voteMs:defaults.responseMs;
 const remaining=ph.deadline?Math.max(0,ph.deadline.remainingMsWhenPaused??ph.deadline.endsAt-now):null;
 const ratio=remaining===null?0:Math.min(1,remaining/total);
 const paused=p.suspension.kind!=='RUNNING';
 return {seconds:remaining===null?null:Math.ceil(remaining/1000),ratio,paused,tone:paused||remaining===null?'idle':ratio<=.2?'danger':ratio<=.5?'warning':'calm'} as const;
}
export type TurnInteraction={selected?:boolean;forbidden?:boolean;dragging?:boolean;overDiscard?:boolean;overRack?:boolean};
export function turnHint(e:ResyncEnvelope,connected=true,controlled=true,interaction:TurnInteraction={}){
 const p=e.public,ph=p.phase,self=e.private,can=(a:ResyncEnvelope['legalActions'][number])=>e.legalActions.includes(a);
 if(ph.kind==='ROOM_CLOSED')return '房间已关闭';
 if(!connected)return '正在重连，请稍候';
 if(!controlled)return '请在当前控制窗口操作';
 if(p.suspension.kind!=='RUNNING')return '牌局暂停，等待恢复';
 const me=p.players.find(x=>x.playerId===self.playerId),name=(id:string)=>p.players.find(x=>x.playerId===id)?.nickname??'同桌';
 switch(ph.kind){
  case 'LOBBY':return me?.ready?'等大家准备好，就开局':'准备好了就入局';
  case 'ROUND_FINISHED':return '本局结束，再来一局？';
  case 'TURN_ACTION':return ph.actorId!==self.playerId?`等${name(ph.actorId)}出牌`:me?.autoPlay?'AI 正在替你出牌':can('DISCARD')?(interaction.dragging?(interaction.overDiscard?(interaction.forbidden?'刚吃的牌不能立即打出':'松手出牌'):interaction.overRack?'松手调整顺序':'拖进桌中央出牌'):interaction.forbidden?'刚吃的牌不能立即打出':interaction.selected?'拖进桌中央，或点击「打」':'选一张牌，拖到桌中央出牌'):'等待牌局更新';
  case 'DISCARD_RESPONSE':
   if(ph.discarderId===self.playerId)return '等大家回应这张牌';
   if(self.ownResponse||!can('RESPOND'))return '已回应，等其他玩家';
   if(isNextDrawer(e))return me&&me.eatCount<3?(borrowedHuVisible(p)?'摸新字、吃这张，或借字胡':'要这张点「吃」，不要点「摸」'):borrowedHuVisible(p)?'点「摸」抽新字，或借字胡':'点「摸」，随机摸一张';
   return borrowedHuVisible(p)?'凑得成句可借字胡，否则点「过」':'还没轮到你，点「过」继续';
  case 'HU_COMPOSE':return ph.applicantId===self.playerId?'排齐14字成一句话，再提交':`等${name(ph.applicantId)}排句`;
  case 'HU_VOTE':return can('VOTE')?'这句话通顺吗？请投票':self.ownBallot?'已投票，等大家评审':ph.proposal.applicantId===self.playerId?'你的句子，等大家评审':'等同桌完成评审';
 }
}
export function spectatorHint(p:PublicRoomSnapshot){
 const ph=p.phase;
 if(p.suspension.kind!=='RUNNING')return '牌局暂停，等待恢复';
 if(ph.kind==='TURN_ACTION')return `观看${p.players.find(x=>x.playerId===ph.actorId)?.nickname??'同桌'}出牌`;
 return {LOBBY:'等待开局',ROOM_CLOSED:'房间已关闭',DISCARD_RESPONSE:borrowedHuVisible(p)?'等待吃牌或借字胡':'等待同桌吃牌或摸牌',HU_COMPOSE:'观看借字排句',HU_VOTE:'等待同桌评审',ROUND_FINISHED:'本局结束'}[ph.kind];
}
