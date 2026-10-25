import type {phaseClock} from './turn-hud';
import './turn-hud.css';
export function TurnHud({clock,hint,connected=true,finished=false}:{clock:ReturnType<typeof phaseClock>;hint:string;connected?:boolean;finished?:boolean}){
 const idle=finished||clock.seconds===null,held=clock.paused||!connected;
 const label=finished?'已结算':!connected?'重连中':clock.paused?'已暂停':idle?'—':clock.seconds===0?'待结算':`${clock.seconds}`;
 const text=!idle&&!held&&clock.seconds===0?'时间到，等待结算':hint;
 return <div className="turn-hud" data-tone={held||idle?'idle':clock.tone}>
  <span className="turn-hint" role="status" title={text}><i aria-hidden="true"/><span>{text.match(/[^，]+，?/g)?.map((clause,index)=><span className="turn-hint-clause" key={index}>{clause.split(/(「[^」]+」|拖到桌中央|拖进桌中央|松手出牌|请投票|排齐14字)/g).map((part,i)=>i%2?<strong className="turn-hint-key" key={i}>{part}</strong>:part)}</span>)}</span></span>
  <div className="turn-clock" aria-label="阶段倒计时"><div className="turn-clock-number"><b>{label}</b>{!idle&&!held&&clock.seconds!==0&&<small>秒</small>}</div>
   <div className="turn-clock-track" role="progressbar" aria-label="本阶段剩余时间" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((idle?0:clock.ratio)*100)} aria-valuetext={idle?label:`${held?label+'，':''}剩余 ${clock.seconds} 秒`}><span style={{transform:`scaleX(${idle?0:clock.ratio})`}}/></div>
  </div>
 </div>;
}
