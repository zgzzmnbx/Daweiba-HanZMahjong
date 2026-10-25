import {PlayerAvatar} from './PlayerAvatar';
import {PortraitMenu} from './table-ui/PortraitMenu';
import {playerDisplayName} from '../../../packages/contracts/browser-return';
import {HuBook,BookIcon} from './HuBook';
import {releaseNotes} from './release-notes';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {LobbyTable} from '../../../packages/contracts/lobby';
import './lobby-game.css';
export type {LobbyTable} from '../../../packages/contracts/lobby';
export type LobbyPanel='create'|'join'|null;
const statusLabels={EMPTY:'空桌',WAITING:'等待入座',PLAYING:'对局中',FINISHED:'本局结束'};
function HallIcon({kind}:{kind:'entry'|'help'|'plus'|'close'}){return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='entry'?<><path d="M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4"/></>:kind==='help'?<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/></>:kind==='plus'?<path d="M12 5v14M5 12h14"/>:<path d="m6 6 12 12M18 6 6 18"/>}</svg>;}
export function GameLobby({panel,tableNumber,tables,error,busy,status,onOpen,onTable,onClose,children,onAdmin,adminActive,onKick,onWatch,remembered}:{
 panel:LobbyPanel;tableNumber:number;tables:LobbyTable[]|null;error:string;busy:boolean;status:string;
 onOpen:(panel:Exclude<LobbyPanel,null>,table?:number)=>void;onTable:(table:LobbyTable)=>void;onClose:()=>void;children:ReactNode;onAdmin?:()=>void;adminActive?:boolean;onKick?:(roomId:string,seat:number)=>void;onWatch?:(roomId:string)=>void;remembered?:ReactNode;
}){
 const dialog=useRef<HTMLDialogElement>(null),helpDialog=useRef<HTMLDialogElement>(null);const [help,setHelp]=useState(false);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(panel&&!d.open){d.showModal();d.querySelector('input')?.focus();}else if(!panel&&d.open)d.close();},[panel]);
 useEffect(()=>{const d=helpDialog.current;if(help&&!d?.open)d?.showModal();else if(!help&&d?.open)d.close();},[help]);
 const [updates,setUpdates]=useState(false),updatesDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=updatesDialog.current;if(updates&&!d?.open)d?.showModal();else if(!updates&&d?.open)d.close();},[updates]);
 const empty=tables?.find(t=>t.status==='EMPTY');
 const [book,setBook]=useState(false);
 return <div className="game-lobby game-hall">
  <header className="topbar"><div className="wordmark"><span className="hall-logo-tile" aria-hidden="true">字</span><div>字间 <small>文字麻将</small></div></div><nav aria-label="大厅工具"><button className="hall-tool" onClick={()=>setBook(true)} aria-label="胡牌天书"><BookIcon/><span>天书</span></button><button className="hall-tool hall-secondary" onClick={()=>setUpdates(true)} aria-label="更新日志"><span aria-hidden="true">▤</span><span>更新</span></button><button className="hall-tool hall-secondary" onClick={()=>onOpen('join')} aria-label="加入 / 找回房间"><HallIcon kind="entry"/><span>房间</span></button><button className="hall-tool hall-secondary" onClick={()=>setHelp(true)} aria-label="玩法帮助"><HallIcon kind="help"/><span>玩法</span></button>{onAdmin&&<button className="hall-tool hall-secondary" onClick={onAdmin} aria-label={adminActive?'管理员模式':'管理员入口'}><span aria-hidden="true">♜</span><span>管理</span></button>}</nav><PortraitMenu label="大厅菜单" meta="选一桌，和朋友排一句好话" resetKey={panel??'hall'} actions={[{label:'加入 / 找回房间',icon:'room',run:()=>onOpen('join')},{label:'更新日志',icon:'updates',run:()=>setUpdates(true)},{label:'玩法帮助',icon:'help',run:()=>setHelp(true)},...(onAdmin?[{label:adminActive?'管理员模式':'管理员入口',icon:'admin' as const,run:onAdmin}]:[])]}/></header>
  <main className="hall-content">
   {book&&<HuBook adminActive={!!adminActive} onClose={()=>setBook(false)}/>}
   <div className="hall-heading"><div className="hall-title-plaque"><h1>游戏大厅</h1><span className={'hall-live '+(error?'unavailable':'')}><i/>{error?'连接中断':tables?'公共牌桌':'连接中'}</span></div><button className="primary hall-create" disabled={!empty||!!error||busy} onClick={()=>empty&&onTable(empty)}><HallIcon kind="plus"/>{tables&&!empty?'已满桌':'创建房间'}</button></div>
   {remembered}
   <section className="hall-tables" aria-label="六张公共牌桌" aria-busy={!tables}>
    {Array.from({length:6},(_,i)=>{const table=tables?.find(t=>t.tableNumber===i+1),full=table&&table.occupied===(table.capacity??0),action=!table?'连接中':table.status==='EMPTY'?'创建房间':table.status==='PLAYING'?'查看牌局':full?'查看房间':'入座';return <article key={i} className="hall-table-slot"><button className={`hall-table ${table?.status==='EMPTY'?'':'occupied'} ${table?.status==='PLAYING'?'in-play':''}`} disabled={!table||!!error||busy} aria-label={`${i+1} 号桌，${table?statusLabels[table.status]:'加载中'}，${action}`} onClick={()=>table&&onTable(table)}>
     <span className="hall-table-top"><strong>{String(i+1).padStart(2,'0')}<span className="sr-only">号桌</span></strong><span className={`hall-empty ${table?.status==='PLAYING'?'playing':''}`}>{table?statusLabels[table.status]:'加载中'}</span></span>
     <span className="hall-table-art" aria-hidden="true"><span className="hall-chair north"/><span className="hall-chair south"/><span className="hall-chair west"/><span className="hall-chair east"/><span className="hall-felt"><span className="felt-mark">字間</span>{table&&table.status!=='EMPTY'&&<span className="felt-tiles"><i>字</i><i>間</i><i>樂</i></span>}</span></span>
     <span className="hall-seats" aria-hidden="true">{Array.from({length:table?.capacity??6},(_,seat)=><i key={seat} className={seat<(table?.occupied??0)?'filled':''}/>)}</span>
     <span className="hall-table-action">{table?.status==='EMPTY'&&<span aria-hidden="true">＋ </span>}{action}</span><span className="hall-table-capacity">{table&&table.status!=='EMPTY'?`${table.occupied} / ${table.capacity} 已入座`:'2–6 人'}</span>
    </button>{table&&table.status!=='EMPTY'&&<div className="hall-player-list" aria-label={`${i+1} 号桌座位`}>{Array.from({length:table.capacity??0},(_,seat)=>{const player=table.players?.find(p=>p.seat===seat);return <div key={seat} className={player?'filled':'empty'}><span className="hall-seat-number">{seat+1}</span>{player&&<span className="hall-seat-avatar"><PlayerAvatar avatarId={player.avatarId} name={player.nickname}/></span>}<span className="hall-player-name" title={player?playerDisplayName(player):'空位'}>{player?playerDisplayName(player):'空位'}</span>{player?.isBotSeat&&<small>AI</small>}{adminActive&&player&&onKick&&<button className="hall-kick" aria-label={`踢出 ${i+1} 号桌的 ${player.nickname}`} disabled={table.status==='PLAYING'&&player.isBotSeat} onClick={()=>onKick(table.roomId!,seat)}>踢出</button>}</div>;})}</div>}{table?.roomId&&(table.allowSpectators||adminActive)&&onWatch&&<button className="hall-watch" disabled={busy} onClick={()=>onWatch(table.roomId!)} aria-label={`观战 ${i+1} 号桌`}>观战</button>}</article>;})}
   </section>
   {error&&<p className="hall-status hall-error" role="alert">{error}</p>}
   {!panel&&status&&<p className="hall-status" role="status">{status}</p>}
  </main>
  <dialog ref={dialog} className="hall-dialog" aria-labelledby="hall-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
   <div className="hall-dialog-heading"><div><span className="eyebrow">{panel==='create'?`${String(tableNumber).padStart(2,'0')} 号公共桌`:'回到牌桌'}</span><h2 id="hall-dialog-title">{panel==='create'?'创建公共房间':'加入 / 找回房间'}</h2></div><button className="hall-tool" aria-label="关闭房间窗口" disabled={busy} onClick={onClose}><HallIcon kind="close"/></button></div>
   {children}
  </dialog>
  <dialog ref={updatesDialog} className="hall-dialog hall-updates" aria-labelledby="updates-title" onCancel={()=>setUpdates(false)} onClose={()=>setUpdates(false)}><div className="hall-dialog-heading"><div><span className="eyebrow">每一局，都更顺手</span><h2 id="updates-title">更新日志</h2></div><button className="hall-tool" aria-label="关闭更新日志" onClick={()=>setUpdates(false)}>×</button></div><div className="release-list">{releaseNotes.map((r,i)=><article key={r.version}><div className="release-meta"><b>v{r.version}</b><time dateTime={r.date}>{r.date}</time>{i===0&&<span>当前版本</span>}</div><h3>{r.title}</h3><ul>{r.features.map(f=><li key={f}>{f}</li>)}</ul></article>)}</div></dialog>
  <dialog ref={helpDialog} className="hall-dialog hall-help" aria-labelledby="hall-help-title" onCancel={e=>{e.preventDefault();setHelp(false);}}><div className="hall-dialog-heading"><h2 id="hall-help-title">字间玩法</h2><button className="hall-tool" aria-label="关闭玩法帮助" onClick={()=>setHelp(false)}><HallIcon kind="close"/></button></div><div className="help-hand" aria-hidden="true"><span>字</span><span>里</span><span>行</span><span>间</span></div><p>用十四个字和最多三个逗号，排一句让同桌点头的话。</p><ul><li>摸一个字，出一个字；只能吃上家的牌。</li><li>空位可设为 AI。和 AI 也能胡牌；每位 AI 独立宽松判句；10秒未答按70%赞成兜底，吐槽同步闲聊。</li><li>点击空桌创建房间，点击有人的桌入座。</li><li>六张公共桌共享，人数含 AI，状态每 2 秒同步。</li><li>掉线后，用原浏览器在大厅打开原房间，点击自己的托管座位即可回来。</li></ul><button className="primary" onClick={()=>setHelp(false)}>去选一桌</button></dialog>
 </div>;
}
