import {GameIcon} from '../GameIcon';
import {createPortal} from 'react-dom';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import './punctuation-help.css';
export const punctuationExplanation='拖动句号牌可以添加逗号，拖回句号牌即可收起。最多3个逗号，不参与胡牌，仅便于自己和朋友理解。';
/** A small hint anchored to the real end marker; it never reserves table space. */
export function PunctuationHelp({anchor,onClose}:{anchor:()=>HTMLElement|null;onClose:()=>void}){
 const bubble=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:8,top:8,arrow:20});
 useLayoutEffect(()=>{const tile=anchor()?.getBoundingClientRect(),r=tile?.width&&tile.height?tile:document.querySelector('.game-shell .topbar .responsive-menu-trigger')?.getBoundingClientRect(),b=bubble.current?.getBoundingClientRect();if(!r||!b)return;const left=Math.max(8,Math.min(innerWidth-b.width-8,r.left+r.width/2-b.width/2));setPosition({left,top:Math.max(8,Math.min(innerHeight-b.height-8,r.top>=b.height+20?r.top-b.height-12:r.bottom+12)),arrow:Math.max(16,Math.min(b.width-16,r.left+r.width/2-left))});},[]);
 useEffect(()=>{const outside=(e:PointerEvent)=>{if(!(e.target instanceof Element)||e.target.closest('.punctuation-tooltip,.period-tile,.portrait-punctuation-trigger'))return;onClose();},key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('pointerdown',outside);window.addEventListener('keydown',key);window.addEventListener('resize',onClose);return()=>{window.removeEventListener('pointerdown',outside);window.removeEventListener('keydown',key);window.removeEventListener('resize',onClose);};},[onClose]);
 return createPortal(<div ref={bubble} id="punctuation-help" role="tooltip" className="punctuation-tooltip" style={{left:position.left,top:position.top,'--hint-arrow':`${position.arrow}px`} as React.CSSProperties}><strong>从句号，借一个逗号</strong><p>{punctuationExplanation}</p><button type="button" aria-label="关闭标点说明" onClick={onClose}><GameIcon kind="close"/></button></div>,document.body);
}
