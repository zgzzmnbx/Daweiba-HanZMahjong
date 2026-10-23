import {useEffect,useRef,useState} from 'react';
import {AdminPanel,type KickRequest} from './AdminPanel';
import {adminApi} from './admin-client';
import type {DeckSetCatalog} from '../../../packages/contracts/deck';
import type {PlayerCount,ResyncEnvelope} from '../../../packages/contracts/types';
import {GameLobby,type LobbyPanel,type LobbyTable} from './GameLobby';
import {GameTable} from './GameTable';import {OnlineClient,api} from './game-client';
export default function OnlineApp(){
 const [adminOpen,setAdminOpen]=useState(false),[adminAuth,setAdminAuth]=useState(false),[adminKick,setAdminKick]=useState<KickRequest|null>(null);
 const adminProbe=useRef<AbortController|null>(null);
 const changeAdminAuth=(value:boolean)=>{adminProbe.current?.abort();setAdminAuth(value);};
 useEffect(()=>{const request=new AbortController();adminProbe.current=request;void adminApi('/session',undefined,request.signal).then(s=>{if(!request.signal.aborted)setAdminAuth(s.authenticated);}).catch(()=>{});return()=>request.abort();},[]);
 const openAdmin=()=>{setAdminKick(null);setAdminOpen(true);};
 const kickFromHall=(roomId:string,seat:number)=>{setAdminKick({roomId,seat});setAdminOpen(true);};
 const [deckCatalog,setDeckCatalog]=useState<DeckSetCatalog|null>(null),[deckSetId,setDeckSetId]=useState(''),[deckLoading,setDeckLoading]=useState(false),[deckLoadError,setDeckLoadError]=useState(''),[deckReload,setDeckReload]=useState(0);
 const [panel,setPanel]=useState<LobbyPanel>(null),[tableNumber,setTableNumber]=useState(1),[tables,setTables]=useState<LobbyTable[]|null>(null),[lobbyError,setLobbyError]=useState('');
 const [,render]=useState(0),[env,setEnv]=useState<ResyncEnvelope|null>(null),[nickname,setNickname]=useState(''),[capacity,setCapacity]=useState<PlayerCount>(4),[roomId,setRoomId]=useState(()=>location.pathname.match(/^\/room\/([A-Za-z0-9]+)$/)?.[1]??''),[seat,setSeat]=useState(0),[seats,setSeats]=useState<{capacity:number;seats:number[];inProgress:boolean;closed:boolean}|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[recover,setRecover]=useState(false),[recoveryInput,setRecoveryInput]=useState(''),[delivery,setDelivery]=useState('');
 const client=useRef<OnlineClient>();if(!client.current)client.current=new OnlineClient(()=>{setEnv(client.current!.envelope);render(n=>n+1);},setDelivery,setStatus);const c=client.current,initialAction=useRef(crypto.randomUUID()),operation=useRef(0),requestController=useRef<AbortController|null>(null);
 const begin=()=>{requestController.current?.abort();const controller=new AbortController();requestController.current=controller;return{signal:controller.signal,token:++operation.current};};
 const enter=(snapshot:ResyncEnvelope,recovery?:{recoveryCode:string}|null,token=operation.current)=>{if(token!==operation.current)return;setStatus('');setSeats(null);setPanel(null);setRoomId(snapshot.public.roomId);history.replaceState(null,'',`/room/${snapshot.public.roomId}`);c.start(snapshot);if(recovery)setDelivery(recovery.recoveryCode);};
 useEffect(()=>{const {signal,token}=begin();void(async()=>{try{const session=await api('/api/session',undefined,signal);const wanted=location.pathname.match(/^\/room\/([A-Za-z0-9]+)$/)?.[1];if(session.roomId&&(!wanted||wanted===session.roomId)){const result=await api(`/api/rooms/${session.roomId}/restore`,{actionId:initialAction.current,roomId:session.roomId,proof:{kind:'SESSION'}},signal);if(token===operation.current&&result.snapshot.public.phase.kind!=='ROOM_CLOSED')enter(result.snapshot,null,token);}else if(wanted&&token===operation.current)await inspect(wanted,signal,token);}catch(e){if(!signal.aborted&&token===operation.current)setStatus((e as Error).message);}})();return()=>{operation.current++;requestController.current?.abort();c.close();};},[]);
 const inRoom=!!env&&env.private.seat!==null;
 useEffect(()=>{
  if(inRoom)return;let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
  const load=async()=>{if(timer)clearTimeout(timer);controller?.abort();const request=new AbortController();controller=request;try{const result=await api('/api/lobby',undefined,request.signal);if(!stopped&&!request.signal.aborted){setTables(result.tables);setLobbyError('');}}catch{if(!stopped&&!request.signal.aborted)setLobbyError('大厅暂时连接不上，正在重新连接…');}finally{if(!stopped&&!request.signal.aborted)timer=setTimeout(()=>void load(),document.hidden?15000:2000);}};
  const visible=()=>{if(!document.hidden)void load();};void load();window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{stopped=true;if(timer)clearTimeout(timer);controller?.abort();window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[inRoom]);
 const run=async(work:(signal:AbortSignal,token:number)=>Promise<void>)=>{if(busy)return;const {signal,token}=begin();setBusy(true);setStatus('正在连接…');try{await work(signal,token);}catch(e){if(!signal.aborted&&token===operation.current)setStatus((e as Error).message);}finally{if(token===operation.current)setBusy(false);}};
 async function inspect(code=roomId,signal?:AbortSignal,token=operation.current){const id=code.trim().toUpperCase();const result=await api(`/api/rooms/${encodeURIComponent(id)}/seats`,undefined,signal);if(token!==operation.current)return;setPanel('join');setRoomId(id);setSeats(result);setCapacity(result.capacity);const first=Array.from({length:result.capacity},(_,i)=>i).find(i=>!result.seats.includes(i));setSeat(first??0);setStatus(result.closed?'房间已关闭。':result.inProgress?'本局进行中。原成员请使用恢复码找回座位。':first===undefined?'这张桌已坐满，请选择其他桌；原成员可以找回座位。':'选择一个空座，和朋友围坐。');}
 useEffect(()=>{if(panel!=='create')return;const controller=new AbortController();setDeckLoading(true);setDeckLoadError('');void api('/api/deck-sets',undefined,controller.signal).then((list:DeckSetCatalog)=>{if(controller.signal.aborted)return;setDeckCatalog(list);setDeckSetId(list.defaultSetId);}).catch(()=>{if(!controller.signal.aborted)setDeckLoadError('麻将套组暂时未载入，请重试。');}).finally(()=>{if(!controller.signal.aborted)setDeckLoading(false);});return()=>controller.abort();},[panel,deckReload]);
 const create=()=>run(async(signal,token)=>{const result=await api('/api/rooms',{actionId:crypto.randomUUID(),capacity,nickname,tableNumber,deckSetId},signal);enter(result.snapshot,result.recovery,token);});
 const join=()=>run(async(signal,token)=>{const result=await api(`/api/rooms/${roomId}/join`,{actionId:crypto.randomUUID(),roomId,requestedSeat:seat,nickname:nickname||env?.public.players.find(p=>p.playerId===env.private.playerId)?.nickname||'归来的朋友'},signal);enter(result.snapshot,result.recovery,token);});
 const restore=()=>run(async(signal,token)=>{const id=roomId.trim().toUpperCase();const result=await api(`/api/rooms/${id}/restore`,{actionId:crypto.randomUUID(),roomId:id,proof:{kind:'RECOVERY_CODE',code:recoveryInput.trim()}},signal);if(token!==operation.current)return;setRecoveryInput('');enter(result.snapshot,null,token);});
 const leave=()=>{operation.current++;requestController.current?.abort();setBusy(false);c.close();setEnv(null);setDelivery('');setSeats(null);setPanel(null);setRecover(false);setRecoveryInput('');setRoomId('');setStatus('已离开页面。进行中的座位会保留，掉线缓冲后由AI代打。');history.replaceState(null,'','/');};
 const openPanel=(next:Exclude<LobbyPanel,null>,table=1)=>{operation.current++;requestController.current?.abort();setBusy(false);setTableNumber(table);setPanel(next);setStatus('');if(next==='create'){setSeats(null);setRecover(false);setCapacity(4);}};
 const openTable=(table:LobbyTable)=>{if(table.status==='EMPTY'){openPanel('create',table.tableNumber);return;}if(table.roomId){setRecover(false);setRoomId(table.roomId);void run(async(signal,token)=>{const session=await api('/api/session',undefined,signal);if(session.roomId===table.roomId){const result=await api(`/api/rooms/${table.roomId}/restore`,{actionId:crypto.randomUUID(),roomId:table.roomId,proof:{kind:'SESSION'}},signal);enter(result.snapshot,null,token);}else await inspect(table.roomId!,signal,token);});}};
 const closePanel=()=>{if(busy)return;setPanel(null);setRecoveryInput('');setStatus('');};
 const form=<section className="entry">
  <label>你的称呼<input autoComplete="nickname" autoFocus value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} placeholder="朋友怎么叫你"/></label>
  {panel==='create'?<>
   <label>一桌几人<select value={capacity} onChange={e=>setCapacity(Number(e.target.value) as PlayerCount)}>{[2,3,4,5,6].map(i=><option key={i} value={i}>{i} 人</option>)}</select></label>
   <label>麻将套组<select aria-label="麻将套组" value={deckSetId} disabled={busy||deckLoading||!!deckLoadError} onChange={e=>setDeckSetId(e.target.value)}>{deckCatalog?.sets.map(s=><option key={s.id} value={s.id}>{s.name}{s.id===deckCatalog.defaultSetId?' · 默认':''}</option>)}</select></label>
   {deckLoading?<p role="status">正在载入套组…</p>:deckLoadError?<p role="alert">{deckLoadError} <button disabled={busy} onClick={()=>setDeckReload(n=>n+1)}>重试载入套组</button></p>:<p className="deck-choice-note">{deckCatalog?.sets.find(s=>s.id===deckSetId)?.charCount} 个汉字 · {capacity} 人桌 {deckCatalog?.sets.find(s=>s.id===deckSetId)?.totals[String(capacity) as '2'|'3'|'4'|'5'|'6']} 张牌</p>}
   <p>此房间会显示在公共大厅，其他玩家可直接入座。也可以添加 AI；一位真人时可胡牌练习，但不计分；AI 评审有 70% 概率赞成。</p>
   <button className="primary" disabled={busy||!nickname.trim()||deckLoading||!!deckLoadError||!deckSetId} onClick={create}>{busy?'正在创建…':'创建房间'}</button>
  </>:<>
   <label>已有房间码<input value={roomId} onChange={e=>{setRoomId(e.target.value.toUpperCase());setSeats(null);}} placeholder="输入朋友发来的房间码" autoCapitalize="characters"/></label>
   <button disabled={busy||!roomId} onClick={()=>run((signal,token)=>inspect(roomId,signal,token))}>查看空座</button>
   {seats&&!seats.closed&&!seats.inProgress&&<><fieldset className="seat-picker"><legend>选择空座（座次按出牌方向固定）</legend>{Array.from({length:seats.capacity},(_,i)=><button key={i} disabled={seats.seats.includes(i)} className={i===seat?'primary':''} onClick={()=>setSeat(i)} aria-pressed={i===seat}>座位 {i+1}{seats.seats.includes(i)?' · 已占':''}</button>)}</fieldset><button className="primary" disabled={busy||seats.seats.includes(seat)||(!nickname.trim()&&!env)} onClick={join}>坐在这里</button></>}
   <button className="quiet" onClick={()=>setRecover(x=>!x)}>找回我的座位</button>
   {recover&&<><label>私密恢复码<input type="password" autoComplete="off" value={recoveryInput} onChange={e=>setRecoveryInput(e.target.value)} placeholder="仅在本机输入，不会公开"/></label><button disabled={busy||!roomId||!recoveryInput} onClick={restore}>恢复身份</button></>}
  </>}
  <p role="status">{status}</p>
  {env?.private.seat===null&&<button onClick={()=>run((signal,token)=>inspect(env.public.roomId,signal,token))}>重新选择空座</button>}
 </section>;
 return <>{env&&env.private.seat!==null?<><GameTable envelope={env} transport={c} connected={c.connected} controlled={c.controlled} onLeave={leave} onAdmin={openAdmin} adminActive={adminAuth}/>{status&&<div className="connection-message" role="status">{status}</div>}{!c.connected&&c.controlled&&<button className="reconnect" onClick={()=>c.restore()}>重新连接</button>}</>:<GameLobby onAdmin={openAdmin} adminActive={adminAuth} onKick={kickFromHall} panel={panel} tableNumber={tableNumber} tables={tables} error={lobbyError} busy={busy} status={status} onOpen={openPanel} onTable={openTable} onClose={closePanel}>{form}</GameLobby>}

 {adminOpen&&<AdminPanel kickRequest={adminKick} onAuth={changeAdminAuth} onClose={()=>setAdminOpen(false)}/>}
 {delivery&&<div className="modal-backdrop recovery-delivery"><section className="confirm" role="dialog" aria-modal="true" aria-label="保存私密恢复码"><h2>把你的座位，留给自己。</h2><p>恢复码仅此一次展示。换设备时，输入房间码与恢复码即可回来；请保存到自己的密码管理器。</p><label>房间码<input readOnly value={env?.public.roomId??roomId}/></label><label>私密恢复码<input readOnly value={delivery} autoComplete="off" onFocus={e=>e.currentTarget.select()}/></label><button onClick={()=>navigator.clipboard?.writeText(delivery)}>复制私密恢复码</button><button className="primary" onClick={()=>setDelivery('')}>我已妥善保存</button></section></div>}
 </>;
}
