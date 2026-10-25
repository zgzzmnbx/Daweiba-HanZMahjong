import {useState} from 'react';
import {MusicControls} from './MusicControls';
import {SoundControls} from './SoundControls';
import type {useRoomMusic} from './use-room-music';
import type {useGameSfx} from './use-game-sfx';
import type {useGameSpeech} from '../speech-client';
import type {ProposalId} from '../../../../packages/contracts/types';
export function RoomAudioPanel({music,sfx,speech,proposalId}:{music:ReturnType<typeof useRoomMusic>;sfx:ReturnType<typeof useGameSfx>;speech:ReturnType<typeof useGameSpeech>;proposalId?:ProposalId}){
 const [section,setSection]=useState<'music'|'sound'>('music');
 return <><div className="music-settings-switch" role="group" aria-label="音乐与声音"><button aria-pressed={section==='music'} onClick={()=>setSection('music')}>音乐</button><button aria-pressed={section==='sound'} onClick={()=>setSection('sound')}>音效与语音</button></div><div hidden={section!=='music'}><MusicControls music={music} standalone/></div><section hidden={section!=='sound'} className="music-sound-settings" aria-label="音效与语音设置"><h3>游戏音效</h3><SoundControls sfx={sfx}/><h3>报字与朗读</h3><button onClick={speech.toggle}>{speech.enabled?'关闭游戏语音':'开启游戏语音'}</button>{proposalId&&<button disabled={!speech.enabled} onClick={()=>speech.replayHu(proposalId)}>朗读胡牌句子</button>}{speech.message&&<p role="status">{speech.message}</p>}<p>设置仅影响自己。音乐为出牌音效和朗读让位。</p></section></>;
}
