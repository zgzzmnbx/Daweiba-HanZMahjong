import {PlayerAvatar} from './PlayerAvatar';
import {useCallback,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {CHAT_HISTORY_LIMIT,CHAT_MAX_LENGTH,type RoomChatMessage,type RoomChatTransport} from '../../../packages/contracts/chat';
import {chatError} from './room-chat-client';
import './room-chat.css';
import {useDanmakuPreference} from './danmaku-preference';
const merge=(first:RoomChatMessage[],next:RoomChatMessage[])=>[...new Map([...first,...next].map(m=>[m.id,m])).values()].slice(-CHAT_HISTORY_LIMIT);
function ChatIcon(){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14a4 4 0 0 1-4 4H9l-5 3v-5a5 5 0 0 1-2-4V8a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v4a4 4 0 0 1-2 2Z"/><path d="M7 9h10M7 13h6"/></svg>;}
function ChatText({message:m}:{message:RoomChatMessage}){
 const chars=Array.from(m.text),[count,setCount]=useState(chars.length);
 useEffect(()=>{
  if(m.kind!=='AI_REVIEW'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const update=()=>setCount(Math.min(chars.length,Math.max(0,Math.floor((Date.now()-m.at)/28))));
  update();const timer=setInterval(update,28);const stop=setTimeout(()=>clearInterval(timer),Math.max(0,m.at+chars.length*28-Date.now()));
  return()=>{clearInterval(timer);clearTimeout(stop);};
 },[m.id,m.at,m.text,m.kind]);
 return <p aria-label={m.text}><span aria-hidden="true">{chars.slice(0,count).join('')}</span></p>;
}
export type ChatControls={open:()=>void};
type Flying={message:RoomChatMessage;lane:number;ends:number};
export function RoomChat({transport,dock,connected,controlled,quiet,closed,selfSeat,selfName,controls,onUnreadChange,onOpen}:{onOpen?:()=>void;controls?:React.Ref<ChatControls>;onUnreadChange?:(count:number)=>void;transport:RoomChatTransport;dock:RefObject<HTMLSpanElement>;connected:boolean;controlled:boolean;quiet:boolean;closed:boolean;selfSeat:number;selfName:string}){
 const [target,setTarget]=useState<HTMLElement|null>(null),[open,setOpen]=useState(false),[messages,setMessages]=useState<RoomChatMessage[]>([]),[unread,setUnread]=useState(0),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[loading,setLoading]=useState(true);
 const [danmakuEnabled,toggleDanmaku]=useDanmakuPreference(),muted=!danmakuEnabled;
 const [reduced,setReduced]=useState(false),[lanes,setLanes]=useState(2),[width,setWidth]=useState(800),[panelTop,setPanelTop]=useState(96),[flying,setFlying]=useState<Flying[]>([]);
 const panel=useRef<HTMLElement>(null),input=useRef<HTMLTextAreaElement>(null),list=useRef<HTMLDivElement>(null),air=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null),pending=useRef<{text:string;id:string}|null>(null),seen=useRef(new Set<string>()),queue=useRef<RoomChatMessage[]>([]),alive=useRef(true),atBottom=useRef(true);
 useImperativeHandle(controls,()=>({open:()=>{onOpen?.();setOpen(true);}}),[onOpen]);
 useEffect(()=>{onUnreadChange?.(unread);},[unread,onUnreadChange]);
 const openRef=useRef(open),quietRef=useRef(quiet);openRef.current=open;quietRef.current=quiet||muted||!connected||!controlled||closed;
 useLayoutEffect(()=>{setTarget(dock.current);},[dock]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width:699px), (max-height:499px)');const update=()=>{setReduced(m.matches);setLanes(small.matches?1:2);};update();m.addEventListener('change',update);small.addEventListener('change',update);return()=>{m.removeEventListener('change',update);small.removeEventListener('change',update);};},[]);
 useLayoutEffect(()=>{const el=air.current;if(!el)return;const update=()=>{setWidth(el.clientWidth);setPanelTop(el.offsetTop+el.offsetHeight+6);};const observer=new ResizeObserver(update);observer.observe(el);if(el.parentElement)observer.observe(el.parentElement);update();return()=>observer.disconnect();},[]);
 // Phase changes may move the strip without resizing it. Re-measure the panel anchor after layout.
 useLayoutEffect(()=>{const el=air.current;if(el)setPanelTop(el.offsetTop+el.offsetHeight+6);});
 useEffect(()=>{if(!controlled){setMessages([]);queue.current=[];setFlying([]);setOpen(false);setDraft('');pending.current=null;return;}if(!connected)return;const controller=new AbortController();setLoading(true);
  void transport.history(controller.signal).then(history=>{if(controller.signal.aborted)return;for(const m of history)seen.current.add(m.id);setMessages(old=>merge(history,old));setError('');}).catch(e=>{if(!controller.signal.aborted)setError(chatError((e as Error).message));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[transport,connected,controlled,reload]);
 const receive=useCallback((message:RoomChatMessage)=>{if(!controlled||seen.current.has(message.id))return;seen.current.add(message.id);setMessages(old=>merge(old,[message]));if(!openRef.current&&!(message.seat===selfSeat&&message.nickname===selfName))setUnread(n=>Math.min(99,n+1));if(!quietRef.current&&!document.hidden){queue.current=[...queue.current,message].slice(-6);}},[controlled,selfSeat,selfName]);
 useEffect(()=>transport.subscribe(receive),[transport,receive]);
 useEffect(()=>{if(quiet||muted||!connected||!controlled||closed){queue.current=[];setFlying([]);}},[quiet,muted,connected,controlled,closed]);
 useEffect(()=>{const clear=()=>{if(document.hidden){queue.current=[];setFlying([]);}};document.addEventListener('visibilitychange',clear);const timer=setInterval(()=>{setFlying(old=>{const now=Date.now(),next=old.filter(m=>m.ends>now&&m.lane<lanes);if(!quietRef.current&&!document.hidden)for(let lane=0;lane<lanes;lane++)if(!next.some(m=>m.lane===lane)&&queue.current.length)next.push({message:queue.current.shift()!,lane,ends:now+(reduced?4200:9000)});return next.length===old.length&&next.every((m,i)=>m===old[i])?old:next;});},200);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',clear);};},[lanes,reduced]);
 useEffect(()=>{if(open){setUnread(0);atBottom.current=true;input.current?.focus();}const away=(event:PointerEvent)=>{if(open&&!panel.current?.contains(event.target as Node)&&!dock.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',away);return()=>document.removeEventListener('pointerdown',away);},[open,dock]);
 useLayoutEffect(()=>{if(open&&atBottom.current&&list.current)list.current.scrollTop=list.current.scrollHeight;},[open,messages]);
 const close=()=>{setOpen(false);toggle.current?.focus();};
 const send=async()=>{const text=draft.trim();if(sending||!connected||!controlled||closed||!text||Array.from(text).length>CHAT_MAX_LENGTH)return;const request=pending.current?.text===text?pending.current:{text,id:crypto.randomUUID()};pending.current=request;setSending(true);setError('');try{const message=await transport.send(text,request.id);if(!alive.current)return;receive(message);pending.current=null;setDraft('');atBottom.current=true;}catch(e){if(alive.current)setError(chatError((e as Error).message));}finally{if(alive.current){setSending(false);input.current?.focus();}}};
 const count=Array.from(draft).length;
 return <>
  {target&&createPortal(<button ref={toggle} className={'hud-tool chat-toggle '+(open?'active':'')} aria-label="同桌聊天" title="闲聊" aria-expanded={open} aria-controls="room-chat-panel" onClick={()=>{if(!open)onOpen?.();setOpen(v=>!v);}} disabled={!controlled}><ChatIcon/><small>闲聊</small>{unread>0&&<span className="chat-unread" aria-label={`${unread} 条新消息`}>{unread>9?'9+':unread}</span>}</button>,target)}
  <div ref={air} className="chat-airspace" aria-hidden="true" data-quiet={quietRef.current} style={{'--chat-travel':`${width}px`} as CSSProperties}>{flying.map(({message:m,lane})=><div key={m.id} className={'chat-danmaku '+(reduced?'still':'')} style={{'--chat-lane':lane} as CSSProperties}><span className="chat-dot"/><b>{m.nickname}</b><span>{Array.from(m.text).slice(0,42).join('')}{Array.from(m.text).length>42?'…':''}</span></div>)}</div>
  {open&&<section ref={panel} id="room-chat-panel" className="chat-panel" style={{top:panelTop,maxHeight:`calc(100% - ${panelTop+8}px)`}} role="region" aria-label="同桌聊天记录" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}}}>
   <header><span className="chat-panel-title"><ChatIcon/><strong>同桌闲聊</strong><i className={connected?'live':''}/></span><div><button className="chat-mini" aria-label={muted?'开启弹幕':'关闭弹幕'} aria-pressed={!muted} title={muted?'开启弹幕':'关闭弹幕'} onClick={toggleDanmaku}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h18v14H3zM6 9h5m2 0h5M6 13h12"/>{muted&&<path d="m3 3 18 18"/>}</svg></button><button className="chat-mini" aria-label="收起聊天" onClick={close}>×</button></div></header>
   <div ref={list} className="chat-history" role="log" aria-label="聊天消息" aria-live="polite" aria-relevant="additions" onScroll={()=>{const el=list.current!;atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<30;}}>
    {!messages.length&&<p className="chat-empty">{loading?'正在找回聊天…':'说句话，和同桌打个招呼。'}</p>}
    {messages.map(m=><article key={m.id} data-chat-kind={m.kind} className={m.kind==='AI_REVIEW'||m.kind==='HU_REVIEW'?'ai-review-chat':m.seat===selfSeat&&m.nickname===selfName?'own':''}><span className="chat-avatar" aria-hidden="true"><PlayerAvatar avatarId={m.avatarId} name={m.nickname}/></span><div><div className="chat-meta"><b>{m.nickname}</b><time dateTime={new Date(m.at).toISOString()}>{new Date(m.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time></div><ChatText message={m}/></div></article>)}
   </div>
   <form onSubmit={e=>{e.preventDefault();void send();}}><div className="chat-composer"><textarea ref={input} aria-label="聊天内容" placeholder={connected?'和同桌说句话…':'重连后继续聊…'} rows={2} value={draft} disabled={sending||closed||!controlled} onChange={e=>{setDraft(e.target.value);if(pending.current?.text!==e.target.value.trim())pending.current=null;}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/><button type="submit" className="chat-send" aria-label="发送聊天" title="发送" disabled={sending||!connected||!controlled||closed||!draft.trim()||count>CHAT_MAX_LENGTH}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14"/></svg></button></div><div className="chat-caption"><span>{closed?'房间已关闭':!connected?'连接中，草稿已保留':muted?'弹幕已关闭':quiet?'弹幕暂避操作 · 记录正常接收':'弹幕已开启 · 仅同桌可见'}</span><small className={count>CHAT_MAX_LENGTH?'over':''}>{count}/{CHAT_MAX_LENGTH}</small></div>{error&&<p className="chat-error" role="status">{error}<button type="button" onClick={()=>setReload(n=>n+1)}>刷新记录</button></p>}</form>
  </section>}
 </>;
}
