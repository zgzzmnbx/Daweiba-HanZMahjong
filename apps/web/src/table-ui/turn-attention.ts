import type {ResyncEnvelope} from '../../../../packages/contracts/types';
/** Presentation only: never advances a phase or extends its server deadline. */
export function isTurnUrgent(envelope:ResyncEnvelope,serverNow:number):boolean{
 const {public:p,private:self,legalActions}=envelope,phase=p.phase;
 if(p.suspension.kind!=='RUNNING'||!phase.deadline||!self.hand.length)return false;
 const ownAction=phase.kind==='TURN_ACTION'&&phase.actorId===self.playerId&&legalActions.includes('DISCARD');
 const ownCompose=phase.kind==='HU_COMPOSE'&&phase.applicantId===self.playerId&&legalActions.includes('SUBMIT_DISCARD_SENTENCE');
 const remaining=phase.deadline.endsAt-serverNow;
 return (ownAction||ownCompose)&&remaining>0&&remaining<=10000;
}
