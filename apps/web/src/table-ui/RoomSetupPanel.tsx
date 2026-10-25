import {useState} from 'react';
import {NewPlayerGuide,skipsNewPlayerGuide} from './NewPlayerGuide';
import {ReadyBadge} from './ReadyBadge';
import {playerDisplayName} from '../../../../packages/contracts/browser-return';
import type {ResyncEnvelope} from '../../../../packages/contracts/types';
import type {SeatView} from '../../../../packages/contracts/table-view';
import type {SentenceRackController} from './SentenceRackController';
import './room-setup.css';

/** One pre-game panel; all actions retain the existing authoritative controller checks. */
export function RoomSetupPanel({envelope,seats,controller:c,practice,aiReview}:{envelope:ResyncEnvelope;seats:readonly SeatView[];controller:SentenceRackController;practice?:boolean;aiReview:boolean}){
 const phase=envelope.public.phase,finished=phase.kind==='ROUND_FINISHED';
 const self=envelope.public.players.find(p=>p.playerId===envelope.private.playerId),host=envelope.public.hostId===envelope.private.playerId;
 const [guideOpen,setGuideOpen]=useState(()=>!finished&&!self?.ready&&!skipsNewPlayerGuide()),[acknowledged,setAcknowledged]=useState(false);
 const prepare=()=>{if(!finished&&self?.ready){void c.command({kind:'READY',ready:false});return;}if(!acknowledged&&!skipsNewPlayerGuide()){setGuideOpen(true);return;}void c.command({kind:'READY',ready:true});};
 const confirmGuide=()=>{setAcknowledged(true);setGuideOpen(false);void c.command({kind:'READY',ready:true});};
 const history=envelope.public.history.at(-1),hasAI=envelope.public.players.some(p=>p.isBotSeat);
 return <>{guideOpen&&<NewPlayerGuide preparing disabled={!c.allowed('READY')} onConfirm={confirmGuide}/>}<section className={'table-overlay room-setup-panel'+(!finished?' lobby-panel':'')} aria-label={finished?'下一局设置':'开局设置'}>
  <header className="room-setup-heading"><span className="eyebrow">{finished?'这一局，留个念想':'好友房'}</span><h2>{finished?(phase.reason==='WIN'?'好句，胡了！':'本局已结束'):'人齐，开一桌。'}</h2><p>{finished?(practice?'练习局 · 不累计胜局':'结果已记录'):`${envelope.public.players.length} / ${seats.length} 席已入座 · 坐满并准备后开局`}</p></header>
  <div className="room-setup-body">
   {finished&&history&&<p className="room-last-sentence">{history.snapshot.sentence.orderedTileIds.map(id=>history.snapshot.tiles.find(t=>t.tileId===id)?.char).join('')}</p>}
   <section className="seat-management" aria-label="座位安排"><div className="rack-label"><strong>同桌座位{envelope.public.deckSetName&&<small className="room-deck-name" title={envelope.public.deckSetName}> · {envelope.public.deckSetName}</small>}</strong><span>{host?'空位可安排 AI':'由房主安排空位'}</span></div>
    <div className="seat-list">{[...seats].sort((a,b)=>a.logicalSeat-b.logicalSeat).map(s=><div className="seat-row" key={s.logicalSeat} data-seat={s.logicalSeat}><span className="seat-number">{s.logicalSeat+1}</span><div className="seat-person"><span className="seat-person-heading"><strong>{s.player?playerDisplayName(s.player):'等待好友'}</strong>{s.player?.ready&&<ReadyBadge/>}</span><small>{s.player?.isBotSeat?'AI · 自动准备':s.player?s.player.ready?'真人':'真人 · 未准备':'空位'}</small></div>{!s.player&&envelope.legalActions.includes('ASSIGN_BOT')&&<button disabled={!c.allowed('ASSIGN_BOT')} onClick={()=>c.command({kind:'ASSIGN_BOT',seat:s.logicalSeat})} aria-label={`将座位 ${s.logicalSeat+1} 设为 AI`}>设为 AI</button>}{s.player?.isBotSeat&&envelope.legalActions.includes('REMOVE_BOT')&&<button disabled={!c.allowed('REMOVE_BOT')} onClick={()=>c.command({kind:'REMOVE_BOT',seat:s.logicalSeat})} aria-label={`移除座位 ${s.logicalSeat+1} 的 AI，留给朋友`}>移除 AI</button>}</div>)}</div>
    {envelope.public.rulesVersion==='1.0.0'&&<p className="seat-help">旧规则房间不支持 AI 空位，可返回大厅新建房间。</p>}
    {hasAI&&<p className="seat-help">{envelope.public.rulesVersion!=='1.0.0'?'AI 自动准备；DeepSeek 宽松判句、犀利吐槽，10秒未答按70%赞成兜底。':'本房沿用旧规则；新建房间可使用 AI 评审。'}</p>}
   </section>
  </div>
  <footer className="room-setup-actions">{!finished&&<button onClick={()=>navigator.clipboard?.writeText(location.href)}>复制邀请链接</button>}<button disabled={!c.allowed('READY')} onClick={prepare}>{finished?'准备下一局':self?.ready?'取消准备':'准备好了'}</button><button className="primary" disabled={!c.allowed('START_ROUND')} onClick={()=>c.command({kind:'START_ROUND'})}>{finished?'再开一局':'开始牌局'}</button></footer>
 </section></>;
}
