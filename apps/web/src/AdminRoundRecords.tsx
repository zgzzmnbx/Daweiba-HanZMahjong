import {useEffect,useRef,useState} from 'react';
import type {AdminRoundRecord,AdminRoundRecords as Records} from '../../../packages/contracts/admin';
import {adminApi} from './admin-client';
import './round-records.css';
const reasonNames={WIN:'胡牌',DRAW:'流局',EXPIRED:'过期结束',TERMINATED:'不计分结束'};
const formatTime=(value:number|null)=>value===null?'未记录':new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
export function AdminRoundRecords({onError}:{onError:(e:unknown)=>void}){
 const [records,setRecords]=useState<AdminRoundRecord[]>([]),[next,setNext]=useState<number|null>(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const request=useRef<AbortController|null>(null),alive=useRef(true),fail=useRef(onError);fail.current=onError;
 const load=async(reset:boolean)=>{request.current?.abort();const current=new AbortController();request.current=current;setBusy(true);try{const result:Records=await adminApi(`/records?limit=20${!reset&&next!==null?`&before=${next}`:''}`,undefined,current.signal);if(!alive.current||current.signal.aborted)return;setRecords(old=>reset?result.records as AdminRoundRecord[]:[...old,...result.records.filter(r=>!old.some(p=>p.id===r.id))]);setNext(result.nextCursor);setLoaded(true);}catch(e){if(alive.current&&!current.signal.aborted)fail.current(e);}finally{if(alive.current&&request.current===current&&!current.signal.aborted)setBusy(false);}};
 useEffect(()=>{alive.current=true;void load(true);return()=>{alive.current=false;request.current?.abort();};},[]);
 return <section className="admin-records-panel" aria-label="管理员对局记录"><div className="admin-record-controls"><span>时间为北京时间</span><button disabled={busy} onClick={()=>void load(true)}>刷新对局记录</button></div><div className="admin-records" aria-busy={busy}>
  {!loaded?<p role="status">正在读取对局…</p>:!records.length?<p className="admin-empty">还没有开始过的对局。</p>:records.map(record=><article key={record.id} className="admin-round-record"><header><strong>{record.roomId}</strong><span>{record.reason?reasonNames[record.reason]:'进行中'}{record.practiceMode?' · 练习局':''}</span></header><div className="admin-record-time"><span>开始 {formatTime(record.startedAt)}</span><span>结束 {record.finishedAt===null&&!record.reason?'进行中':formatTime(record.finishedAt)}</span></div>{record.legacy&&<small>旧对局未完整保存时间，缺失项显示“未记录”。</small>}<div className="admin-record-members">{record.members.map((p,i)=><span key={i}>{p.seat+1} · {p.nickname}{p.isBotSeat?'（AI）':''}</span>)}</div><p className="admin-record-win">{record.winningText?<><b>{record.winnerNickname??'胡牌玩家'}</b> · {record.winningText}</>:'未胡牌'}</p>{record.sentences.length>0&&<details><summary>查看 {record.sentences.length} 条已公开胡牌申请</summary>{record.sentences.map((s,i)=><p key={i}>{s.nickname??'玩家'} · {s.outcome==='APPROVED'?'通过':s.outcome==='REJECTED'?'未通过':'撤回'}<br/>{s.text}</p>)}</details>}<footer>{record.deckSetName??'旧套组'} · {record.roundId}</footer></article>)}
  {next!==null&&<button disabled={busy} onClick={()=>void load(false)}>{busy?'正在载入…':'加载更早对局'}</button>}
 </div></section>;
}
