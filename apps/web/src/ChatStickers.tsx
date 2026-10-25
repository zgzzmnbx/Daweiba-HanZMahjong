import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import type {RoomChatMessage} from '../../../packages/contracts/chat';
import {CHAT_STICKERS,chatSticker,stickerUrl} from '../../../packages/contracts/stickers';
import './chat-stickers.css';
type Reaction={message:RoomChatMessage;until:number};
const Context=createContext<{reactions:Record<string,Reaction>;show:(message:RoomChatMessage)=>void}>({reactions:{},show:()=>{}});
export function ChatStickerProvider({children,blocked,identity}:{children:ReactNode;blocked:boolean;identity:string}){
 const [reactions,setReactions]=useState<Record<string,Reaction>>({});
 const show=useCallback((message:RoomChatMessage)=>{
  if(blocked||document.hidden||message.kind!=='STICKER'||!message.senderId||!chatSticker(message.stickerId))return;
  setReactions(old=>({...old,[message.senderId!]:{message,until:Date.now()+4200}}));
 },[blocked]);
 useEffect(()=>{setReactions({});},[identity]);
 useEffect(()=>{for(const sticker of CHAT_STICKERS){const image=new Image();image.src=stickerUrl(sticker.id)!;}},[]);
 useEffect(()=>{if(blocked)setReactions({});},[blocked]);
 useEffect(()=>{const clear=()=>{if(document.hidden)setReactions({});};document.addEventListener('visibilitychange',clear);
  const timer=setInterval(()=>setReactions(old=>{const next=Object.fromEntries(Object.entries(old).filter(([,r])=>r.until>Date.now()));return Object.keys(next).length===Object.keys(old).length?old:next;}),200);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',clear);};
 },[]);
 return <Context.Provider value={{reactions,show}}>{children}</Context.Provider>;
}
export const useChatSticker=()=>useContext(Context).show;
/** Only live role avatars opt in; historical chat portraits never animate. */
export function AvatarSticker({playerId}:{playerId:string}){
 const reaction=useContext(Context).reactions[playerId],m=reaction?.message,sticker=chatSticker(m?.stickerId);
 return m&&sticker?<span key={m.id} className="avatar-sticker" data-sticker-sender={playerId} role="img" aria-label={`${m.nickname}：${sticker.label}`}><img src={stickerUrl(sticker.id)!} alt="" draggable={false}/></span>:null;
}
export function StickerImage({id}:{id:string}){
 const sticker=chatSticker(id),[failed,setFailed]=useState(false);
 return sticker&&!failed?<img className="chat-sticker-image" src={stickerUrl(id)!} alt={sticker.label} draggable={false} onError={()=>setFailed(true)}/>:<span>{sticker?.label??'表情'}</span>;
}
