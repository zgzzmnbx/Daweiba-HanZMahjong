import {GameIcon} from '../GameIcon';
import type {useGameSfx} from './use-game-sfx';
import './sound-controls.css';
export function SoundControls({sfx}:{sfx:ReturnType<typeof useGameSfx>}){return <div className="sound-controls"><div><button onClick={sfx.toggle} aria-pressed={sfx.enabled}><GameIcon kind={sfx.enabled?'muted':'sound'}/>{sfx.enabled?'关闭游戏音效':'开启游戏音效'}</button><button disabled={!sfx.enabled||sfx.volume===0} onClick={sfx.preview}><GameIcon kind="play"/>试听音效</button></div><label>音效音量 <input aria-label="音效音量" type="range" min="0" max="100" step="5" value={Math.round(sfx.volume*100)} onChange={e=>sfx.setVolume(Number(e.target.value)/100)}/><output>{Math.round(sfx.volume*100)}%</output></label><small>{sfx.unavailable?'浏览器未能播放音效，可点击试听重试。':'音效与朗读分别控制 · 朗读时自动降低音效'}</small></div>;}
