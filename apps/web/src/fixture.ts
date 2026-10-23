/** Development-only synthetic snapshots. Never used as a service or rule engine. */
import type { ResyncEnvelope,PlayerCount,SeatIndex } from '../../../packages/contracts/types';
export function fixture(n:PlayerCount=4,seat:SeatIndex=0,kind='TURN_ACTION'):ResyncEnvelope{
 const ids=Array.from('今夜月明我和你一起看山河的我').map((char,i)=>({tileId:`demo-t${i}`,char}));
 const p=Array.from({length:n},(_,i)=>({playerId:`demo-p${i}`,seat:i,nickname:i===seat?'大尾巴':['青山','听雨','望月','小满','晚风','白露'][i],presence:'HUMAN',connected:true,ready:true,handCount:i===seat?14:13,eatCount:0,wins:0,graceEndsAt:null}));
 const source={kind:'DISCARD',playerId:`demo-p${(seat+n-1)%n}`,discardId:'demo-d1',responseWindowId:'demo-w1',borrowedTileId:'demo-borrow'};
 const hand=kind==='HU_COMPOSE'?ids.slice(0,13):ids;
 const draft={orderedTileIds:hand.map(t=>t.tileId),commaAfterTileIds:[]};
 const sentence={orderedTileIds:ids.map(t=>t.tileId),commaAfterTileIds:['demo-t3','demo-t9']};
 let phase:any={kind,phaseId:'demo-phase-'+kind,deadline:{endsAt:Date.now()+60000,remainingMsWhenPaused:null},actorId:`demo-p${seat}`,mustDiscard:false,isEatTurn:false};
 if(kind==='HU_VOTE')phase.proposal={proposalId:'demo-proposal',applicantId:`demo-p${(seat+1)%n}`,source:{kind:'SELF',playerId:`demo-p${(seat+1)%n}`},snapshot:{sentence,tiles:ids},reviewerCount:n-1,threshold:Math.floor((n-1)/2)+1,submittedBallotCount:0};
 if(kind==='HU_VOTE')phase.deadline.endsAt=Date.now()+45000;
 if(kind==='HU_COMPOSE'){phase.applicantId=`demo-p${seat}`;phase.source=source;phase.deadline.endsAt=Date.now()+45000;}
 if(kind==='ROUND_FINISHED'){phase.reason='DRAW';phase.winnerId=null;phase.deadline=null;}
 if(kind==='DISCARD_RESPONSE'){phase.responseWindowId='demo-w1';phase.discardId='demo-d1';phase.discarderId=source.playerId;phase.submittedResponseCount=0;phase.deadline.endsAt=Date.now()+8000;}
 return {serverNow:Date.now(),public:{visibility:'PUBLIC',roomId:'DEMO26',roundId:kind==='LOBBY'?null:'demo-round',stateVersion:1,rulesVersion:'1.0.0',deckVersion:'daily-v1',capacity:n,closeAfterRound:false,hostId:`demo-p${seat}`,dealerSeat:seat,players:p,wallRemaining:72+24*n-13*n-1,phase,suspension:{kind:'RUNNING'},discards:[{discardId:'demo-d1',playerId:source.playerId,tile:{tileId:'demo-borrow',char:'风'},status:kind==='HU_COMPOSE'?'RESERVED':'AVAILABLE'}],history:[]},private:{visibility:'PRIVATE_PLAYER',playerId:`demo-p${seat}`,controlEpoch:1,seat,basedOnStateVersion:1,hand,draft,draftVersion:1,candidateDraft:kind==='HU_COMPOSE'?{phaseId:phase.phaseId,source,candidateDraftVersion:1,sentence:{orderedTileIds:[...draft.orderedTileIds,'demo-borrow'],commaAfterTileIds:[]}}:null,forbiddenImmediateDiscardTileId:null,ownResponse:null,ownBallot:null,isFrozenReviewer:kind==='HU_VOTE'},legalActions:kind==='LOBBY'?['READY','START_ROUND']:kind==='HU_VOTE'?['SAVE_DRAFT','VOTE']:kind==='HU_COMPOSE'?['SAVE_CANDIDATE_DRAFT','SUBMIT_DISCARD_SENTENCE','WITHDRAW_DISCARD_HU']:kind==='DISCARD_RESPONSE'?['SAVE_DRAFT','RESPOND']:kind==='ROUND_FINISHED'?['READY','START_ROUND']:['SAVE_DRAFT','DISCARD','DECLARE_SELF_HU']} as unknown as ResyncEnvelope;
}
