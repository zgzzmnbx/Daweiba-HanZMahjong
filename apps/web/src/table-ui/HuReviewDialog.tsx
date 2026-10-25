import {ReviewDanmaku} from './ReviewDanmaku';
import {SentenceTiles} from './SentenceTiles';
import {TurnHud} from './TurnHud';
import {phaseClock,turnHint} from './turn-hud';
import type {useGameSfx} from '../audio/use-game-sfx';
import type {useGameSpeech} from '../speech-client';
import {useEffect,useLayoutEffect,useRef,useState,useId,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import type {PublicProposal,PublicHistoryEntry,ObjectionRange,ResyncEnvelope} from '../../../../packages/contracts/types';
import type {SentenceRackController} from './SentenceRackController';
import {HU_INTRO_MS,HU_STEP_MS,HU_FLIGHT_MS,HU_SHOW_MS,type HuPresentation} from './hu-presentation';
import './hu-showcase.css';
import './hu-review.css';

type Egg={key:string;x:number;y:number;dx:number;dy:number;delay:number};
export function HuReviewDialog({sfx,speech,proposal,presentation,clock,envelope,controller:c,onClose}:{sfx?:ReturnType<typeof useGameSfx>;speech?:ReturnType<typeof useGameSpeech>;proposal:PublicProposal|PublicHistoryEntry;presentation:HuPresentation|null;clock:ReturnType<typeof phaseClock>;envelope:ResyncEnvelope;controller:SentenceRackController;onClose:()=>void}){
 const speechStatusId=useId();
 const root=useRef<HTMLDialogElement>(null),seen=useRef(new Set<string>()),initialized=useRef(false);
 const [audioOpen,setAudioOpen]=useState(false),[intro,setIntro]=useState(false),[eggs,setEggs]=useState<Egg[]>([]),[comment,setComment]=useState(''),[hint,setHint]=useState(''),[rejecting,setRejecting]=useState(false);
 const result='result' in proposal?proposal.result:null,finished='outcome' in proposal,canVote=c.allowed('VOTE')&&!finished;
 const ai=proposal.aiJudgment;
 const votes=proposal.reviewers??[],ids=proposal.snapshot.sentence.orderedTileIds;
 const initialComments=useRef(new Set(presentation?[]:votes.filter(v=>v.comment).map(v=>v.playerId)));
 const animatedComments=useRef(new Set<string>());
 const [freshComments,setFreshComments]=useState<string[]>([]);
 useEffect(()=>{const fresh=votes.filter(v=>v.comment&&!initialComments.current.has(v.playerId)&&!animatedComments.current.has(v.playerId)).map(v=>v.playerId);if(!fresh.length)return;fresh.forEach(id=>animatedComments.current.add(id));setFreshComments(old=>[...old,...fresh]);},[votes]);
 useEffect(()=>{if(!freshComments.length)return;const timer=setTimeout(()=>setFreshComments([]),1400);return()=>clearTimeout(timer);},[freshComments]);
 const speechStage=!speech?.enabled?'disabled':speech.huStatus?.proposalId===proposal.proposalId?speech.huStatus.stage:'idle';
 const speechLabel={disabled:'语音关闭',idle:'待朗读',preparing:'准备语音',decoding:'准备播放',playing:'正在朗读',complete:'朗读完成',failed:'语音失败',blocked:'点击启用'}[speechStage];
 const nickname=envelope.public.players.find(p=>p.playerId===proposal.applicantId)?.nickname??'同桌';
 const own=envelope.private.ownBallot;
 const objectionNames=(index:number)=>votes.filter(v=>v.choice==='REJECT'&&v.objectionRanges.some(r=>index>=r.start&&index<r.endExclusive)).map(v=>v.nickname);
 useLayoutEffect(()=>{if(root.current&&!root.current.open)root.current.showModal();},[]);
 useLayoutEffect(()=>{
  const el=root.current;if(!el||!presentation)return;setIntro(true);delete el.dataset.ready;
  const started=performance.now()-presentation.age;
  const frame=requestAnimationFrame(()=>{for(const [i,unit] of [...el.querySelectorAll<HTMLElement>('.hu-slam-unit')].entries()){
   const rect=unit.querySelector('b')!.getBoundingClientRect(),origin=presentation.origins[presentation.sourceKeys[i]];
   unit.style.setProperty('--from-x',`${origin?origin.x-rect.left-rect.width/2:0}px`);unit.style.setProperty('--from-y',`${origin?origin.y-rect.top-rect.height/2:120}px`);unit.style.setProperty('--from-scale',String(origin?Math.max(.25,origin.width/rect.width):.5));
   unit.style.setProperty('--delay',`${HU_INTRO_MS+i*HU_STEP_MS-(performance.now()-started)}ms`);unit.style.setProperty('--impact-delay',`${HU_INTRO_MS+i*HU_STEP_MS+HU_FLIGHT_MS*.72-(performance.now()-started)}ms`);
  }
  el.dataset.ready='true';});const timer=setTimeout(()=>setIntro(false),Math.max(0,HU_SHOW_MS-presentation.age));return()=>{cancelAnimationFrame(frame);clearTimeout(timer);};
 },[presentation]);
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;const fresh=votes.filter(v=>v.choice==='REJECT'&&!seen.current.has(v.playerId));
  const animate=initialized.current||!!presentation;for(const v of votes)if(v.choice!=='PENDING')seen.current.add(v.playerId);initialized.current=true;
  if(!animate||!fresh.length)return;const rect=el.getBoundingClientRect(),next:Egg[]=[];
  for(const vote of fresh){const from=el.querySelector<HTMLElement>(`[data-voter="${CSS.escape(vote.playerId)}"]`)?.getBoundingClientRect();if(!from)continue;
   for(let i=0;i<14;i++)if(vote.objectionRanges.some(r=>i>=r.start&&i<r.endExclusive)){const to=el.querySelector<HTMLElement>(`[data-review-index="${i}"]`)!.getBoundingClientRect();next.push({key:`${vote.playerId}:${i}`,x:to.left+to.width/2-rect.left,y:to.top+to.height/2-rect.top,dx:from.left+from.width/2-to.left-to.width/2,dy:from.top+from.height/2-to.top-to.height/2,delay:next.length*55});}
  }setEggs(previous=>[...previous,...next]);
 },[proposal,presentation]);
 useEffect(()=>{if(!eggs.length)return;const t=setTimeout(()=>setEggs([]),1800+eggs.length*55);return()=>clearTimeout(t);},[eggs]);
 useEffect(()=>{const clear=()=>{setEggs([]);setIntro(false);sfx?.skipReveal();};window.addEventListener('resize',clear);return()=>window.removeEventListener('resize',clear);},[]);
 useEffect(()=>{if(!canVote){setRejecting(false);setHint('');setComment('');}},[canVote]);
 const cancelReject=()=>{setRejecting(false);setHint('');c.ranges=[];c.changed();};
 const toggle=(index:number)=>{if(!canVote||!rejecting)return;const selected=new Set<number>();for(const r of c.ranges)for(let i=r.start;i<r.endExclusive;i++)selected.add(i);if(selected.has(index))selected.delete(index);else selected.add(index);const ranges:ObjectionRange[]=[];for(const i of [...selected].sort((a,b)=>a-b)){const last=ranges.at(-1);if(last&&last.endExclusive===i)ranges[ranges.length-1]={start:last.start,endExclusive:i+1};else ranges.push({start:i,endExclusive:i+1});}if(ranges.length>3){setHint('最多圈选三段；点击已选的字可取消。');return;}setHint('');c.ranges=ranges;c.changed();};
 const showRanges=canVote&&rejecting?c.ranges:own?.choice==='REJECT'?own.objectionRanges:[];
 return createPortal(<dialog ref={root} className={'hu-showcase hu-review-dialog '+(votes.filter(v=>v.comment).length>=3?'dense-comments ':'')+(intro?'intro ':'')+(finished?(result?.passed?'approved':'rejected'):'voting')} aria-label="胡牌评审" data-proposal-id={proposal.proposalId} onCancel={e=>{e.preventDefault();if(finished)onClose();else if(rejecting)cancelReject();else {setIntro(false);sfx?.skipReveal();}}}>
  <div className="hu-burst-lines" aria-hidden="true"/>
  <header className="hu-review-heading"><span className="hu-seal" aria-hidden="true">胡</span><div><small>{nickname} · 亮牌请评</small><div className="review-title-slot"><h2>{finished?(result?.passed?'这句，胡了！':result?'这句，没过！':'本次申请已撤回'):'这句，大家评。'}</h2><ReviewDanmaku votes={votes} liveEntry={!!presentation} connected={c.connected&&c.controlled}/></div></div>{speech&&<div className="review-audio-group"><small id={speechStatusId} className="hu-speech-status" role="status" aria-live="polite" aria-atomic="true" data-stage={speechStage} title={speech.message||speechLabel}>{speechLabel}</small><button className="review-audio-toggle" aria-label="评审声音设置" aria-describedby={speechStatusId} aria-expanded={audioOpen} onClick={()=>setAudioOpen(x=>!x)}><span aria-hidden="true">♫</span><small>声音</small></button></div>}</header>
  <div className="hu-review-content">
   <SentenceTiles className={'hu-slam-rack '+(rejecting?'choosing-objection':'')} label="待评审句子" sentence={proposal.snapshot.sentence} unitClass={i=>{const names=objectionNames(i);return(names.length?'has-objection ':'')+(showRanges.some(r=>i>=r.start&&i<r.endExclusive)?'selected':'');}} renderTile={(id,i)=>{const char=proposal.snapshot.tiles.find(t=>t.tileId===id)?.char,names=objectionNames(i),selected=showRanges.some(r=>i>=r.start&&i<r.endExclusive);return <button className="review-tile" data-review-index={i} aria-label={`圈选第 ${i+1} 字 ${char}`} aria-pressed={selected} disabled={!canVote||!rejecting} title={names.length?`${names.join('、')}：这里不通顺`:undefined} onClick={()=>toggle(i)}><b>{char}</b>{names.length>0&&<span className="egg-stain" aria-label={`${names.join('、')}提出异议`}/>}</button>;}} decoration={()=><svg className="hu-impact-spark" viewBox="0 0 120 120" aria-hidden="true"><path d="M60 0 67 38 92 15 80 46 120 52 83 65 106 95 72 81 65 120 53 83 21 104 37 72 0 65 38 53 14 22 47 38Z"/></svg>}/>
   {speech&&<div className={'hu-speech-controls '+(audioOpen?'expanded':'')}>{sfx&&<button onClick={sfx.toggle}>{sfx.enabled?'关闭音效':'开启音效'}</button>}<button disabled={!speech.enabled} onClick={()=>speech.replayHu(proposal.proposalId)}>{speech.playing?'重新朗读':'朗读胡牌句子'}</button><button onClick={speech.toggle}>{speech.enabled?'关闭语音':'开启语音'}</button>{speech.message&&<small role="status">{speech.message}</small>}</div>}<div className="review-progress">{result?`赞成 ${result.approveCount} · 反对 ${result.rejectCount} · 未投 ${result.abstainCount} · 需 ${result.threshold} 票`:'submittedBallotCount' in proposal?`已投 ${proposal.submittedBallotCount} / ${proposal.reviewerCount} · 需 ${proposal.threshold} 票赞成`:''}</div>
   <section className="review-voters" aria-label="大家的投票">{votes.map(v=><article key={v.playerId} data-voter={v.playerId} data-speaking={freshComments.includes(v.playerId)||undefined} className={'review-voter '+v.choice.toLowerCase()}><span className="voter-icon" aria-hidden="true">{v.choice==='APPROVE'?'✓':v.choice==='REJECT'?'🥚':v.choice==='ABSTAIN'?'—':'…'}</span><div><strong title={v.nickname}>{v.nickname}{v.isBotSeat?' · AI':''}</strong><small>{v.choice==='APPROVE'?'赞成':v.choice==='REJECT'?'不赞成':v.choice==='ABSTAIN'?'未投票':v.isBotSeat&&ai?.status==='PENDING'?'读句中 · 最多10秒':'考虑中'}{v.choice==='REJECT'&&v.objectionRanges.length>0&&' · '+v.objectionRanges.map(r=>'「'+ids.slice(r.start,r.endExclusive).map(id=>proposal.snapshot.tiles.find(t=>t.tileId===id)?.char).join('')+'」').join('、')}</small>{v.comment&&<span className="review-voter-comment" data-fresh={freshComments.includes(v.playerId)||undefined}>{v.comment}</span>}</div></article>)}</section>

   {!votes.length&&<p>本局沿用旧版匿名评审（45 秒）。</p>}
   {finished&&<div className={'review-verdict '+(result?.passed?'win':'lose')} role="status"><b>{result?.passed?'胡牌通过':result?'胡牌未通过':'申请已撤回'}</b><span>{result?.passed?'好句，大家认了。':'再琢磨琢磨，下一句更精彩。'}</span>{Array.from({length:16},(_,i)=><i key={i} style={{'--i':i} as CSSProperties} aria-hidden="true"/>)}</div>}
  </div>
  <footer className="hu-review-actions">{!finished&&<TurnHud clock={clock} hint={rejecting?"可点牌砸鸡蛋，再确认投票":turnHint(envelope,c.connected,c.controlled)} connected={c.connected}/>}{finished?<button className="primary" onClick={onClose}>回到牌桌</button>:<>{canVote&&proposal.reviewers&&<label className="vote-comment-input"><span>留言</span><input aria-label="评审留言" placeholder="可选，最多24字" value={comment} onChange={e=>setComment(Array.from(e.target.value).slice(0,24).join(''))} onKeyDown={e=>e.stopPropagation()}/><small>{Array.from(comment).length}/24</small></label>}{canVote&&rejecting&&hint&&<p className="objection-prompt" role="status">{hint}</p>}<div className="review-vote-buttons">{rejecting&&canVote?<><button onClick={cancelReject}>返回</button><button className="reject" disabled={!canVote} onClick={()=>{if(canVote)c.vote(false,comment);}}>确认，投反对票</button></>:<><button className="primary" disabled={!canVote} onClick={()=>c.vote(true,comment)}>意思成立</button><button className="reject" disabled={!canVote} onClick={()=>{c.ranges=[];c.changed();setHint('');setRejecting(true);setIntro(false);sfx?.skipReveal();}}>写的什么玩意</button></>}{intro&&<button className="hu-skip" onClick={()=>{setIntro(false);sfx?.skipReveal();}}>收起亮相 · 看评审</button>}</div>{c.message&&!c.message.startsWith('已提交')&&<small role="status">{c.message}</small>}{!finished&&c.pending&&<button disabled={!c.connected||!c.controlled} onClick={()=>c.retry()}>重试提交</button>}</>}</footer>
  <div className="egg-layer" aria-hidden="true">{eggs.map(e=><span key={e.key} className="thrown-egg" style={{left:e.x,top:e.y,'--egg-dx':`${e.dx}px`,'--egg-dy':`${e.dy}px`,'--egg-delay':`${e.delay}ms`} as CSSProperties}>🥚<i>💥</i></span>)}</div>
 </dialog>,document.body);
}
