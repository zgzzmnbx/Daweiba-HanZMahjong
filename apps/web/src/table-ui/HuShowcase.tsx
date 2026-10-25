import {GameIcon} from '../GameIcon';
import {SentenceTiles} from './SentenceTiles';
import {useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {HU_FLIGHT_MS,HU_INTRO_MS,HU_SHOW_MS,HU_STEP_MS,type HuPresentation} from './hu-presentation';
import './hu-showcase.css';

/** Presentation only: no command, vote, or authority clock is delayed by the spectacle. */
export function HuShowcase({presentation,onClose}:{presentation:HuPresentation;onClose:()=>void}){
 const root=useRef<HTMLDialogElement>(null),close=useRef(onClose);close.current=onClose;
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;if(!el.open)el.showModal();delete el.dataset.ready;
  const started=performance.now()-presentation.age;
  const frame=requestAnimationFrame(()=>{for(const [i,unit] of [...el.querySelectorAll<HTMLElement>('.hu-slam-unit')].entries()){
   const rect=unit.querySelector('b')!.getBoundingClientRect(),origin=presentation.origins[presentation.sourceKeys[i]];
   unit.style.setProperty('--from-x',`${origin?origin.x-rect.left-rect.width/2:0}px`);
   unit.style.setProperty('--from-y',`${origin?origin.y-rect.top-rect.height/2:120}px`);
   unit.style.setProperty('--from-scale',String(origin?Math.max(.25,origin.width/rect.width):.5));
   unit.style.setProperty('--delay',`${HU_INTRO_MS+i*HU_STEP_MS-(performance.now()-started)}ms`);
   unit.style.setProperty('--impact-delay',`${HU_INTRO_MS+i*HU_STEP_MS+HU_FLIGHT_MS*.72-(performance.now()-started)}ms`);
  }
  el.style.setProperty('--final-impact-delay',`${HU_INTRO_MS+13*HU_STEP_MS+HU_FLIGHT_MS*.72-presentation.age}ms`);
  el.dataset.ready='true';});
  const timer=setTimeout(()=>close.current(),Math.max(0,HU_SHOW_MS-presentation.age));
  const resize=()=>close.current(),key=(e:KeyboardEvent)=>{if(e.key==='Escape')close.current();};
  window.addEventListener('resize',resize);window.addEventListener('keydown',key);
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);};
 },[presentation]);
 const p=presentation.proposal,commas=new Set(p.snapshot.sentence.commaAfterTileIds);
 const sentence=p.snapshot.sentence.orderedTileIds.map(id=>(p.snapshot.tiles.find(t=>t.tileId===id)?.char??'')+(commas.has(id)?'，':'')).join('');
 return createPortal(<dialog ref={root} onCancel={e=>{e.preventDefault();onClose();}} className="hu-showcase" aria-label={`${presentation.nickname} 胡牌亮相`} data-proposal-id={p.proposalId}>
  <div className="hu-burst-lines" aria-hidden="true"/>
  <header className="hu-show-heading"><span className="hu-seal" aria-hidden="true">胡</span><div><small>{presentation.nickname} · 亮牌请评</small><h2>这句，听好了。</h2></div></header>
  <p className="sr-only" role="status">{presentation.nickname} 申请胡牌：{sentence}。请大家评审。</p>
  <SentenceTiles className="hu-slam-rack" mode="showcase" sentence={p.snapshot.sentence} renderTile={id=><b>{p.snapshot.tiles.find(t=>t.tileId===id)?.char}</b>} decoration={()=><>   <GameIcon className="hu-impact-spark" kind="spark"/><span className="hu-impact-ring"/></>}/>
  <footer><span>十四个字，亮出我的意思。</span><button className="hu-skip" onClick={onClose}>收起亮相 · 看评审</button></footer>
 </dialog>,document.body);
}
