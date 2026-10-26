import {newActionId} from './browser-compat';
import {chatPanelFrame} from './chat-panel-layout';
import {GameIcon} from './GameIcon';
import {CHAT_STICKERS} from '../../../packages/contracts/stickers';
import {AvatarSticker,StickerImage,useChatSticker} from './ChatStickers';
import {PlayerAvatar} from './PlayerAvatar';
import {useCallback,useEffect,useImperativeHandle,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {CHAT_HISTORY_LIMIT,CHAT_MAX_LENGTH,type RoomChatMessage,type RoomChatTransport} from '../../../packages/contracts/chat';
import {chatError} from './room-chat-client';
import './room-chat.css';
import {useDanmakuPreference} from './danmaku-preference';
const merge=(first:RoomChatMessage[],next:RoomChatMessage[])=>[...new Map([...first,...next].map(m=>[m.id,m])).values()].slice(-CHAT_HISTORY_LIMIT);
function ChatIcon(){return <GameIcon kind="chat"/>;}
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
export function RoomChat({transport,dock,connected,controlled,quiet,closed,selfSeat,selfName,selfId,controls,onUnreadChange,onOpen}:{onOpen?:()=>void;controls?:React.Ref<ChatControls>;onUnreadChange?:(count:number)=>void;transport:RoomChatTransport;dock:RefObject<HTMLSpanElement>;connected:boolean;controlled:boolean;quiet:boolean;closed:boolean;selfSeat:number;selfName:string;selfId:string}){
 const [target,setTarget]=useState<HTMLElement|null>(null),[open,setOpen]=useState(false),[messages,setMessages]=useState<RoomChatMessage[]>([]),[unread,setUnread]=useState(0),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0),[loading,setLoading]=useState(true);
 const showSticker=useChatSticker(),stickerPending=useRef<{id:string;stickerId:string}|null>(null);
 const [picker,setPicker]=useState(false),focusAfterSend=useRef(false);
 const [danmakuEnabled,toggleDanmaku]=useDanmakuPreference(),muted=!danmakuEnabled;
 const [reduced,setReduced]=useState(false),[lanes,setLanes]=useState(2),[width,setWidth]=useState(800),[panelFrame,setPanelFrame]=useState({top:96,height:360}),[flying,setFlying]=useState<Flying[]>([]);
 const panel=useRef<HTMLElement>(null),input=useRef<HTMLTextAreaElement>(null),list=useRef<HTMLDivElement>(null),air=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null),pending=useRef<{text:string;id:string}|null>(null),seen=useRef(new Set<string>()),queue=useRef<RoomChatMessage[]>([]),alive=useRef(true),atBottom=useRef(true);
 useImperativeHandle(controls,()=>({open:()=>{onOpen?.();setOpen(true);}}),[onOpen]);
 useEffect(()=>{onUnreadChange?.(unread);},[unread,onUnreadChange]);
 const openRef=useRef(open),quietRef=useRef(quiet);openRef.current=open;quietRef.current=quiet||muted||!connected||!controlled||closed;
 useLayoutEffect(()=>{setTarget(dock.current);},[dock]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width:699px), (max-height:499px)');const update=()=>{setReduced(m.matches);setLanes(small.matches?1:2);};update();m.addEventListener('change',update);small.addEventListener('change',update);return()=>{m.removeEventListener('change',update);small.removeEventListener('change',update);};},[]);
 useLayoutEffect(()=>{const el=air.current;if(!el)return;const update=()=>{setWidth(el.clientWidth);};const observer=new ResizeObserver(update);observer.observe(el);if(el.parentElement)observer.observe(el.parentElement);update();return()=>observer.disconnect();},[]);
 // The keyboard may resize only visualViewport, without changing CSS media queries or innerHeight.
 const updatePanelFrame=useCallback(()=>{
  const el=air.current,shell=el?.closest('.game-shell');if(!el||!shell||!panel.current)return;
  const shellRect=shell.getBoundingClientRect(),v=window.visualViewport;
  const next=chatPanelFrame({shellTop:shellRect.top,shellBottom:shellRect.bottom,visibleTop:v?.offsetTop??0,visibleHeight:v?.height??innerHeight,anchorBottom:el.getBoundingClientRect().bottom,maxHeight:matchMedia('(max-width:699px), (max-height:499px)').matches?360:420});
  setPanelFrame(old=>Math.abs(old.top-next.top)<.5&&Math.abs(old.height-next.height)<.5?old:next);
 },[]);
 useLayoutEffect(()=>{updatePanelFrame();});
 useLayoutEffect(()=>{
  if(!open)return;const el=air.current,shell=el?.closest('.game-shell'),v=window.visualViewport;let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(updatePanelFrame);};
  const observer=new ResizeObserver(schedule);if(el)observer.observe(el);if(shell)observer.observe(shell);
  window.addEventListener('resize',schedule);v?.addEventListener('resize',schedule);v?.addEventListener('scroll',schedule);schedule();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);v?.removeEventListener('resize',schedule);v?.removeEventListener('scroll',schedule);};
 },[open,updatePanelFrame]);
 useEffect(()=>{if(!controlled){setMessages([]);queue.current=[];setFlying([]);setOpen(false);setDraft('');pending.current=null;return;}if(!connected)return;const controller=new AbortController();setLoading(true);
  void transport.history(controller.signal).then(history=>{if(controller.signal.aborted)return;for(const m of history)seen.current.add(m.id);setMessages(old=>merge(history,old));setError('');}).catch(e=>{if(!controller.signal.aborted)setError(chatError((e as Error).message));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[transport,connected,controlled,reload]);
 const receive=useCallback((message:RoomChatMessage)=>{if(!controlled||seen.current.has(message.id))return;seen.current.add(message.id);setMessages(old=>merge(old,[message]));if(!openRef.current&&!(message.seat===selfSeat&&message.nickname===selfName))setUnread(n=>Math.min(99,n+1));if(message.kind==='STICKER'){showSticker(message);return;}if(!quietRef.current&&!document.hidden){queue.current=[...queue.current,message].slice(-6);}},[controlled,selfSeat,selfName,showSticker]);
 useEffect(()=>transport.subscribe(receive),[transport,receive]);
 useEffect(()=>{if(quiet||muted||!connected||!controlled||closed){queue.current=[];setFlying([]);}},[quiet,muted,connected,controlled,closed]);
 useEffect(()=>{const clear=()=>{if(document.hidden){queue.current=[];setFlying([]);}};document.addEventListener('visibilitychange',clear);const timer=setInterval(()=>{setFlying(old=>{const now=Date.now(),next=old.filter(m=>m.ends>now&&m.lane<lanes);if(!quietRef.current&&!document.hidden)for(let lane=0;lane<lanes;lane++)if(!next.some(m=>m.lane===lane)&&queue.current.length)next.push({message:queue.current.shift()!,lane,ends:now+(reduced?4200:9000)});return next.length===old.length&&next.every((m,i)=>m===old[i])?old:next;});},200);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',clear);};},[lanes,reduced]);
 useEffect(()=>{if(open){setUnread(0);atBottom.current=true;input.current?.focus({preventScroll:true});}const away=(event:PointerEvent)=>{if(open&&!panel.current?.contains(event.target as Node)&&!dock.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',away);return()=>document.removeEventListener('pointerdown',away);},[open,dock]);
 useLayoutEffect(()=>{if(open&&atBottom.current&&list.current)list.current.scrollTop=list.current.scrollHeight;},[open,messages]);
 useLayoutEffect(()=>{if(!sending&&focusAfterSend.current){focusAfterSend.current=false;if(open)input.current?.focus({preventScroll:true});}},[sending,open]);
 const close=()=>{setOpen(false);toggle.current?.focus({preventScroll:true});};
 const send=async()=>{const text=draft.trim();if(sending||!connected||!controlled||closed||!text||Array.from(text).length>CHAT_MAX_LENGTH)return;const request=pending.current?.text===text?pending.current:{text,id:newActionId()};pending.current=request;setSending(true);setError('');try{const message=await transport.send(text,request.id);if(!alive.current)return;receive(message);pending.current=null;setDraft('');atBottom.current=true;}catch(e){if(alive.current)setError(chatError((e as Error).message));}finally{if(alive.current){focusAfterSend.current=true;setSending(false);}}};
 const sendSticker=async(stickerId:string)=>{if(sending||!connected||!controlled||closed)return;
  const request=stickerPending.current?.stickerId===stickerId?stickerPending.current:{stickerId,id:newActionId()};stickerPending.current=request;setSending(true);setError('');
  try{const message=await transport.sendSticker(stickerId,request.id);if(!alive.current)return;receive(message);stickerPending.current=null;setPicker(false);atBottom.current=true;}
  catch(e){if(alive.current)setError(chatError((e as Error).message)+' 再点这张表情重试。');}
  finally{if(alive.current)setSending(false);}
 };
 const count=Array.from(draft).length;
 return <>
  {target&&createPortal(<button ref={toggle} className={'hud-tool chat-toggle '+(open?'active':'')} aria-label="同桌聊天" title="闲聊" aria-expanded={open} aria-controls="room-chat-panel" onClick={()=>{if(!open)onOpen?.();setOpen(v=>!v);}} disabled={!controlled}><ChatIcon/><small>闲聊</small><AvatarSticker playerId={selfId}/>{unread>0&&<span className="chat-unread" aria-label={`${unread} 条新消息`}>{unread>9?'9+':unread}</span>}</button>,target)}
  <div ref={air} className="chat-airspace" aria-hidden="true" data-quiet={quietRef.current} style={{'--chat-travel':`${width}px`} as CSSProperties}>{flying.map(({message:m,lane})=><div key={m.id} className={'chat-danmaku '+(reduced?'still':'')} style={{'--chat-lane':lane} as CSSProperties}><span className="chat-dot"/><b>{m.nickname}</b><span>{Array.from(m.text).slice(0,42).join('')}{Array.from(m.text).length>42?'…':''}</span></div>)}</div>
  {open&&<section ref={panel} id="room-chat-panel" className="chat-panel" data-compact={panelFrame.height<260} style={{top:panelFrame.top,height:panelFrame.height,maxHeight:panelFrame.height}} role="region" aria-label="同桌聊天记录" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}}}>
   <header><span className="chat-panel-title"><ChatIcon/><strong>同桌闲聊</strong><i className={connected?'live':''}/></span><div><button className="chat-mini" aria-label={muted?'开启弹幕':'关闭弹幕'} aria-pressed={!muted} title={muted?'开启弹幕':'关闭弹幕'} onClick={toggleDanmaku}><GameIcon kind={muted?"danmakuOff":"danmaku"}/></button><button className="chat-mini" aria-label="收起聊天" onClick={close}><GameIcon kind="close"/></button></div></header>
   {picker?<div className="chat-sticker-picker" aria-label="麻将表情包"><p>小麻将精 · 点一下送给同桌</p>{CHAT_STICKERS.map(sticker=><button key={sticker.id} type="button" aria-label={`发送表情：${sticker.label}`} disabled={sending||!connected||closed} onClick={()=>void sendSticker(sticker.id)}><StickerImage id={sticker.id}/><small>{sticker.label}</small></button>)}</div>:<div ref={list} className="chat-history" role="log" aria-label="聊天消息" aria-live="polite" aria-relevant="additions" onScroll={()=>{const el=list.current!;atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<30;}}>
    {!messages.length&&<p className="chat-empty">{loading?'正在找回聊天…':'说句话，和同桌打个招呼。'}</p>}
    {messages.map(m=><article key={m.id} data-chat-kind={m.kind} className={m.kind==='AI_REVIEW'||m.kind==='HU_REVIEW'?'ai-review-chat':m.seat===selfSeat&&m.nickname===selfName?'own':''}><span className="chat-avatar" aria-hidden="true"><PlayerAvatar avatarId={m.avatarId} name={m.nickname}/></span><div><div className="chat-meta"><b>{m.nickname}</b><time dateTime={new Date(m.at).toISOString()}>{new Date(m.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time></div>{m.kind==='STICKER'&&m.stickerId?<StickerImage id={m.stickerId}/>:<ChatText message={m}/>}</div></article>)}
   </div>}
   <form onSubmit={e=>{e.preventDefault();void send();}}><div className="chat-composer"><button type="button" className="sticker-toggle" aria-label="表情包" aria-expanded={picker} title="小麻将精表情包" onClick={()=>setPicker(v=>!v)} disabled={closed||!controlled}><GameIcon kind="smile"/></button><textarea ref={input} aria-label="聊天内容" placeholder={connected?'和同桌说句话…':'重连后继续聊…'} rows={2} value={draft} disabled={sending||closed||!controlled} onChange={e=>{setDraft(e.target.value);if(pending.current?.text!==e.target.value.trim())pending.current=null;}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/><button type="submit" className="chat-send" aria-label="发送聊天" title="发送" disabled={sending||!connected||!controlled||closed||!draft.trim()||count>CHAT_MAX_LENGTH}><GameIcon kind="send"/></button></div><div className="chat-caption"><span>{closed?'房间已关闭':!connected?'连接中，草稿已保留':muted?'弹幕已关闭':quiet?'弹幕暂避操作 · 记录正常接收':'弹幕已开启 · 仅同桌可见'}</span><small className={count>CHAT_MAX_LENGTH?'over':''}>{count}/{CHAT_MAX_LENGTH}</small></div>{error&&<p className="chat-error" role="status">{error}<button type="button" onClick={()=>setReload(n=>n+1)}>刷新记录</button></p>}</form>
  </section>}
 </>;
}
