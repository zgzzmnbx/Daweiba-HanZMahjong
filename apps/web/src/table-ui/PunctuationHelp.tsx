import {createPortal} from 'react-dom';
import {useId,useRef,useState} from 'react';
import './punctuation-help.css';
export const punctuationExplanation='标点符号只是为了让自己和其他朋友便于理解你句子意思，不是胡牌必须';
export function PunctuationHelp(){
 const id=useId(),button=useRef<HTMLButtonElement>(null),[open,setOpen]=useState(false),[position,setPosition]=useState({left:8,top:8});
 const show=()=>{const r=button.current?.getBoundingClientRect();if(r)setPosition({left:Math.max(8,Math.min(innerWidth-226,r.right-210)),top:Math.max(8,Math.min(innerHeight-150,r.top-120))});setOpen(true);};
 return <div className="punctuation-heading"><span>拖动添加标点</span><span className="punctuation-help" onMouseEnter={show} onMouseLeave={()=>setOpen(false)}><button ref={button} type="button" className="punctuation-help-button" aria-label="标点说明" aria-expanded={open} aria-describedby={open?id:undefined} onFocus={show} onBlur={()=>setOpen(false)} onClick={show} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>?</button>{open&&createPortal(<span id={id} role="tooltip" className="punctuation-tooltip" style={position}>{punctuationExplanation}</span>,document.body)}</span></div>;
}
