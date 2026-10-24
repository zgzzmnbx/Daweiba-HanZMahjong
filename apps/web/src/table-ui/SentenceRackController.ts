import type { ResyncEnvelope,Draft,TileId,ClientCommand,CommandMeta,CommandResult,ObjectionRange,AtMostThree,Sentence } from '../../../../packages/contracts/types';
import {rackPhaseKey} from './rack-interaction';
import { reconcileOwnDraft } from '../../../../packages/contracts/table-view';
type Payload=ClientCommand extends infer C?C extends ClientCommand?Omit<C,keyof CommandMeta>:never:never;
export interface GameTransport { send(command:ClientCommand):Promise<CommandResult>; }
export class SentenceRackController {
  envelope:ResyncEnvelope;draft:Draft;selected:TileId|null=null;ranges:ObjectionRange[]=[];
  connected=true;controlled=true;pending:ClientCommand|null=null;message='';revision=0;
  private original:Draft|null=null;private notify:()=>void;private dismissedAcquisition:string|null=null;
  constructor(envelope:ResyncEnvelope,readonly transport:GameTransport,notify:()=>void){this.envelope=envelope;this.draft=envelope.private.candidateDraft?.sentence??envelope.private.draft;this.notify=notify;}
  changed(){this.revision++;this.notify();}
  replace(e:ResyncEnvelope){
    const old=this.envelope;
    const changed=old.public.roomId!==e.public.roomId||old.public.roundId!==e.public.roundId||old.private.controlEpoch!==e.private.controlEpoch||old.public.phase.phaseId!==e.public.phase.phaseId;
    const candidate=e.public.phase.kind==='HU_COMPOSE'?e.private.candidateDraft:null;
    const oldCandidate=old.public.phase.kind==='HU_COMPOSE'?old.private.candidateDraft:null;
    const sameIdentity=old.public.roomId===e.public.roomId&&old.public.roundId===e.public.roundId&&old.private.playerId===e.private.playerId;
    const handChanged=old.private.hand.length!==e.private.hand.length||old.private.hand.some(t=>!e.private.hand.some(n=>n.tileId===t.tileId));
    this.envelope=e;
    if(candidate){
      const sameSource=oldCandidate?.source.discardId===candidate.source.discardId&&oldCandidate?.source.borrowedTileId===candidate.source.borrowedTileId;
      const borrowed=e.public.discards.find(d=>d.discardId===candidate.source.discardId)?.tile;
      this.draft=!sameIdentity||!sameSource||candidate.candidateDraftVersion!==oldCandidate?.candidateDraftVersion?candidate.sentence:reconcileOwnDraft([...e.private.hand,...(borrowed?[borrowed]:[])],this.draft);
    }else this.draft=!sameIdentity||!!oldCandidate||(!handChanged&&e.private.draftVersion!==old.private.draftVersion)?e.private.draft:reconcileOwnDraft(e.private.hand,this.draft);
    if(changed){if(!sameIdentity||old.private.controlEpoch!==e.private.controlEpoch||handChanged||rackPhaseKey(old.public.phase)!==rackPhaseKey(e.public.phase))this.selected=null;this.ranges=[];this.original=null;this.pending=null;}
    if(this.selected&&!this.draft.orderedTileIds.includes(this.selected))this.selected=null;this.changed();
  }
  revoke(){this.envelope={...this.envelope,private:{...this.envelope.private,hand:[],draft:{orderedTileIds:[],commaAfterTileIds:[]},candidateDraft:null,ownBallot:null}};this.controlled=false;this.pending=null;this.selected=null;this.ranges=[];this.original=null;this.draft={orderedTileIds:[],commaAfterTileIds:[]};this.message='已在其他设备恢复，此页面已撤销控制。';this.changed();}
  private acquiredTile(){const phase=this.envelope.public.phase,hand=this.envelope.private.hand;if(phase.kind!=='TURN_ACTION'||phase.actorId!==this.envelope.private.playerId||hand.length!==14)return null;const tileId=this.envelope.private.forbiddenImmediateDiscardTileId??hand.at(-1)!.tileId;return{tileId,kind:this.envelope.private.forbiddenImmediateDiscardTileId?'EAT' as const:'DRAW' as const};}
  private acquisitionKey(tileId:TileId){const e=this.envelope;return JSON.stringify([e.public.roomId,e.public.roundId,e.public.phase.phaseId,e.private.playerId,e.private.controlEpoch,tileId]);}
  acquisition(){const acquired=this.acquiredTile();return acquired&&this.dismissedAcquisition!==this.acquisitionKey(acquired.tileId)?acquired:null;}
  dismissAcquisition(tileId:TileId){const acquired=this.acquisition();if(!acquired||acquired.tileId!==tileId)return;this.dismissedAcquisition=this.acquisitionKey(tileId);this.changed();}
  discard(tileId:TileId){if(!this.envelope.private.hand.some(t=>t.tileId===tileId)||this.envelope.private.forbiddenImmediateDiscardTileId===tileId){this.message='这张牌当前不能打出。';this.changed();return;}return this.command({kind:'DISCARD',tileId});}
  saveDraft(){const candidate=this.envelope.private.candidateDraft;if(candidate&&this.envelope.public.phase.kind==='HU_COMPOSE')return this.command({kind:'SAVE_CANDIDATE_DRAFT',source:candidate.source,expectedCandidateDraftVersion:candidate.candidateDraftVersion,sentence:this.sentence()});return this.command({kind:'SAVE_DRAFT',draft:this.draft,expectedDraftVersion:this.envelope.private.draftVersion});}
  select(id:TileId){if(this.draft.orderedTileIds.includes(id)){this.selected=id;this.changed();}}
  move(id:TileId,to:number){const order=[...this.draft.orderedTileIds],from=order.indexOf(id);if(from<0)return;order.splice(from,1);order.splice(Math.max(0,Math.min(to,order.length)),0,id);this.draft={orderedTileIds:order,commaAfterTileIds:this.draft.commaAfterTileIds.filter(t=>t!==order.at(-1)) as unknown as Draft['commaAfterTileIds']};this.changed();}
  toggleComma(id:TileId){const commas=[...this.draft.commaAfterTileIds];if(commas.includes(id))commas.splice(commas.indexOf(id),1);else if(id!==this.draft.orderedTileIds.at(-1)&&this.draft.orderedTileIds.includes(id)&&commas.length<3)commas.push(id);else{this.message='逗号只能放在非末尾字后，最多三个。';this.changed();return;}this.draft={...this.draft,commaAfterTileIds:commas as unknown as Draft['commaAfterTileIds']};this.changed();}
  begin(){this.original=structuredClone(this.draft);}
  cancel(){if(this.original)this.draft=this.original;this.original=null;this.changed();}
  finish(){this.original=null;this.changed();}
  addRange(start:number,endExclusive:number){const all=[...this.ranges,{start:Math.min(start,endExclusive-1),endExclusive:Math.max(start+1,endExclusive)}].sort((a,b)=>a.start-b.start);const merged:ObjectionRange[]=[];for(const r of all){const last=merged.at(-1);if(last&&r.start<=last.endExclusive)merged[merged.length-1]={start:last.start,endExclusive:Math.max(last.endExclusive,r.endExclusive)};else merged.push(r);}if(merged.length<=3&&merged.every(r=>r.start>=0&&r.endExclusive<=14)){this.ranges=merged;this.changed();}else{this.message='最多圈选三段异议。';this.changed();}}
  allowed(kind:ClientCommand['kind']){return this.connected&&this.controlled&&!this.pending&&(kind==='SET_AUTOPLAY'||this.envelope.public.suspension.kind==='RUNNING')&&this.envelope.legalActions.includes(kind);}
  sentence(){return this.draft as Sentence;}
  async command(payload:Payload){if(!this.allowed(payload.kind)){this.message='当前不可操作：请等待连接、同步或行动权限。';this.changed();return;}const e=this.envelope;
    const command={...payload,roomId:e.public.roomId,roundId:e.public.roundId,actionId:crypto.randomUUID(),expectedStateVersion:e.public.stateVersion,phaseId:e.public.phase.phaseId,controlEpoch:e.private.controlEpoch} as ClientCommand;
    this.pending=command;this.message='正在提交…';this.changed();await this.transmit(command);
  }
  private async transmit(command:ClientCommand){try{const result=await this.transport.send(command);if(this.pending?.actionId!==command.actionId)return;this.message=result.ok?'':`未提交：${result.code}`;this.pending=null;}catch{if(this.pending?.actionId!==command.actionId)return;this.message='提交结果未知，请重试（沿用同一动作编号）。';}this.changed();}
  retry(){if(this.pending&&this.connected&&this.controlled&&this.pending.phaseId===this.envelope.public.phase.phaseId&&this.pending.controlEpoch===this.envelope.private.controlEpoch)return this.transmit(this.pending);}
  vote(approve:boolean){const p=this.envelope.public.phase;if(p.kind!=='HU_VOTE')return;if(approve){this.ranges=[];return this.command({kind:'VOTE',proposalId:p.proposal.proposalId,ballot:{choice:'APPROVE'}});}return this.command({kind:'VOTE',proposalId:p.proposal.proposalId,ballot:{choice:'REJECT',objectionRanges:this.ranges as unknown as AtMostThree<ObjectionRange>}});}
}
