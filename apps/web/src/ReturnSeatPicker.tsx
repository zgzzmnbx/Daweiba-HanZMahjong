import {PlayerAvatar} from './PlayerAvatar';
import {playerDisplayName,type RoomSeatDirectory} from '../../../packages/contracts/browser-return';
import './return-seat.css';
export function ReturnSeatPicker({directory,busy,onReturn}:{directory:RoomSeatDirectory;busy:boolean;onReturn:()=>void}){
 if(!directory.players?.length)return null;
 return <section className="return-seats" aria-label="房间内的玩家"><p>{directory.returnSeat!=null?'认出你了，点自己的座位回来。':'同桌玩家'}</p><div className="return-seat-grid">{directory.players.map(p=>{const own=p.seat===directory.returnSeat&&!!directory.returnMethod;return <button key={p.seat} className={'return-seat '+(own?'own':'')} disabled={busy||!own} autoFocus={own} onClick={onReturn} aria-label={own?`${p.isManaged?'接管':'回到'} ${playerDisplayName(p)} 的座位`:`座位 ${p.seat+1} · ${playerDisplayName(p)}`}><span className="return-portrait" aria-hidden="true"><PlayerAvatar avatarId={p.avatarId} name={p.nickname}/></span><span><strong>{playerDisplayName(p)}</strong><small>{p.seat+1} 号座 · {own?p.isManaged?'点击接管':'回到座位':p.isBotSeat?'AI 玩家':'已入座'}</small></span>{own&&<b aria-hidden="true">↩</b>}</button>;})}</div></section>;
}
