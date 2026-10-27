import {ThirdCircuitHint,RoundMilestoneHint} from './table-ui/TileHint';
import {completedCircuits} from '../../../packages/contracts/response-policy';
import {DraggableDiscardTile,type EatDragControls} from './table-ui/DraggableDiscardTile';
import {DeckViewer} from './table-ui/DeckViewer';
import {GameIcon} from './GameIcon';
import {CircuitProgress} from './table-ui/CircuitProgress';
import {ChatStickerProvider} from './ChatStickers';
import {usesDeepSeekRules} from '../../../packages/contracts/response-policy';
import {NewPlayerGuide} from './table-ui/NewPlayerGuide';
import {useRoomMusic} from './audio/use-room-music';
import type {MusicTransport} from '../../../packages/contracts/music';
import {PortraitMenu,MenuIcon} from './table-ui/PortraitMenu';
import type {DoodleControls,DoodleStatus} from './RoomDoodle';
import './portrait-game.css';
import './table-ui/discard-guide.css';
import './table-ui/portrait-action-bar.css';
import {TurnHud} from './table-ui/TurnHud';
import {phaseClock,turnHint} from './table-ui/turn-hud';
import {useGameSfx} from './audio/use-game-sfx';
import {RoomAudioPanel} from './audio/RoomAudioPanel';
import {RoomDoodle} from './RoomDoodle';
import type {DoodleTransport} from '../../../packages/contracts/doodle';
import {RoomChat} from './RoomChat';
import type {RoomChatTransport} from '../../../packages/contracts/chat';
import {useGameSpeech} from './speech-client';
import {PunctuationHelp} from './table-ui/PunctuationHelp';
import {RoomSetupPanel} from './table-ui/RoomSetupPanel';
import {SeatBadges} from './table-ui/SeatBadges';
import {isNextDrawer,borrowedHuVisible,canEatDiscard} from './table-ui/response-action';
import {isTurnUrgent} from './table-ui/turn-attention';
import './table-ui/turn-attention.css';
import {HuReviewDialog} from './table-ui/HuReviewDialog';
import {huPresentation,type HuPresentation} from './table-ui/hu-presentation';
import {FlightLayer} from './table-ui/flight-layer';
import {tableMotions,sameMotionSession,publicReveal,type MotionAnchors} from './table-ui/table-motion';
import {createPortal} from 'react-dom';
import {COMMA_WIDTH_RATIO,mobileRackLayout,adaptiveRackLayout,insertTilePreview,rackInsertion,commaPreview,nearRackSlot,insideRect,type RackTargetRect,type RackInsertion} from './table-ui/rack-layout';
import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import type { ResyncEnvelope,PlayerCount,SeatIndex,TileId,Draft,Sentence } from '../../../packages/contracts/types';
import type { TableView } from '../../../packages/contracts/table-view';
import { MainView,type Hit,type Label } from './table3d/main-view';
import { tableViewAdapter,seatTemplate } from './table3d/adapter';
import {rackInteractionStamp} from './table-ui/rack-interaction';
import {SentenceTiles} from './table-ui/SentenceTiles';
import { SentenceRackController,type GameTransport } from './table-ui/SentenceRackController';


type RackPointer={kind:'tile'|'comma';id:TileId|null;targetId:TileId|null;stamp:string;pointerId:number;source:Draft;preview:Draft;rects:RackTargetRect[];insertion:RackInsertion|null;started:boolean;status:'held'|'drop';x:number;y:number;startX:number;startY:number;offsetX:number;offsetY:number;width:number;height:number;char:string;dom:boolean;external:boolean;overDiscard:boolean;overRack:boolean;overReturn:boolean};
const phases:Record<string,string>={LOBBY:'好友入座',TURN_ACTION:'轮到你了',DISCARD_RESPONSE:'弃牌响应',HU_COMPOSE:'借字排句',HU_VOTE:'共同评审',ROUND_FINISHED:'本局结束',ROOM_CLOSED:'房间已关闭'};
const relations:Record<string,string>={SELF:'本人',NEXT:'下家',PREVIOUS:'上家',NEXT_AND_PREVIOUS:'上家 / 下家',OTHER:'同桌'};
export function GameTable({envelope,transport,connected=true,controlled=true,onLeave,onAdmin,adminActive,chat,doodle,musicEvents}: {envelope:ResyncEnvelope;transport:GameTransport;connected?:boolean;controlled?:boolean;onLeave?:()=>void;onAdmin?:()=>void;adminActive?:boolean;chat?:RoomChatTransport;doodle?:DoodleTransport;musicEvents?:MusicTransport}){
 // Ordinary draw/discard phases update live controls, not the user's navigation.
 // A proposal keeps its identity when it moves into history, so the result does
 // not close a menu again. Identity/round changes and room closure still reset it.
 const menuResetKey=[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch,controlled,envelope.public.phase.kind==='ROOM_CLOSED',envelope.public.phase.kind==='HU_VOTE'?envelope.public.phase.proposal.proposalId:envelope.public.history.at(-1)?.proposalId].join('|');
 const [guideHelpOpen,setGuideHelpOpen]=useState(false);
 useEffect(()=>setGuideHelpOpen(false),[menuResetKey]);
 const chatDock=useRef<HTMLSpanElement>(null),doodleControls=useRef<DoodleControls>(null);
 const [punctuationNotice,setPunctuationNotice]=useState({serial:0,text:''});
 useEffect(()=>{if(!punctuationNotice.text)return;const timer=setTimeout(()=>setPunctuationNotice(n=>({...n,text:''})),2800);return()=>clearTimeout(timer);},[punctuationNotice]);
 const [punctuationOpen,setPunctuationOpen]=useState(false),[doodleStatus,setDoodleStatus]=useState<DoodleStatus>({visible:true,count:0,ready:false});
 const [,redraw]=useState(0),[rackExpanded,setRackExpanded]=useState<boolean|null>(null),[fallback,setFallback]=useState(''),[generation,setGeneration]=useState(0),[low,setLow]=useState(false),[screen,setScreen]=useState({width:innerWidth,height:innerHeight}),[hits,setHits]=useState<Hit[]>([]),[labels,setLabels]=useState<Label[]>([]),[now,setNow]=useState(Date.now());
 const mobile=screen.width<700||screen.height<600,compact=screen.height<500;
 const compose=rackExpanded??mobile;
 const rackOpenButton=useRef<HTMLButtonElement>(null),rackCloseButton=useRef<HTMLButtonElement>(null),rackFocusRequested=useRef(false);
 const shell=useRef<HTMLDivElement>(null),flights=useRef<FlightLayer>(),motionPrevious=useRef<{envelope:ResyncEnvelope;anchors:MotionAnchors;layout:string}|null>(null),captureMotion=useRef<()=>void>(()=>{});
 const controllerRef=useRef<SentenceRackController>();if(!controllerRef.current)controllerRef.current=new SentenceRackController(envelope,transport,()=>redraw(n=>n+1));const c=controllerRef.current;
 const host=useRef<HTMLDivElement>(null),renderer=useRef<MainView>(),pointer=useRef<RackPointer|null>(null),rangeStart=useRef<number|null>(null);
 const [drag,setDrag]=useState<RackPointer|null>(null),[rackSize,setRackSize]=useState(innerWidth-34);
 const [tableCenter,setTableCenter]=useState<{x:number;y:number;width:number}>();
 const rackHost=useRef<HTMLDivElement>(null),discardZone=useRef<HTMLDivElement>(null),dropTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [huShow,setHuShow]=useState<HuPresentation|null>(null);
 const [reviewOpenId,setReviewOpenId]=useState<string|null>(envelope.public.phase.kind==='HU_VOTE'?envelope.public.phase.proposal.proposalId:null);
 const reviewSeen=useRef({session:[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch].join('|'),history:envelope.public.history.at(-1)?.proposalId});
 useEffect(()=>{const session=[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch].join('|'),last=envelope.public.history.at(-1),same=reviewSeen.current.session===session;
  if(envelope.public.phase.kind==='HU_VOTE'&&controlled)setReviewOpenId(envelope.public.phase.proposal.proposalId);
  else if(same&&last&&last.proposalId!==reviewSeen.current.history&&controlled&&connected)setReviewOpenId(last.proposalId);
  else if(!same||!controlled||envelope.public.phase.kind==='ROOM_CLOSED')setReviewOpenId(null);
  reviewSeen.current={session,history:last?.proposalId};
 },[envelope,controlled,connected]);
 const reviewProposal=envelope.public.phase.kind==='HU_VOTE'?envelope.public.phase.proposal:envelope.public.history.find(p=>p.proposalId===reviewOpenId);

 const [huConfirm,setHuConfirm]=useState<{kind:'DECLARE_SELF_HU'|'SUBMIT_DISCARD_SENTENCE';sentence:Sentence;key:string}|null>(null),huConfirmRef=useRef<HTMLDialogElement>(null);
 const huKey=[envelope.public.roomId,envelope.public.roundId,envelope.public.phase.phaseId,envelope.private.playerId,envelope.private.controlEpoch].join('|');
 useEffect(()=>{setHuConfirm(null);},[huKey,connected,controlled,envelope.public.suspension.kind]);
 useEffect(()=>{const el=huConfirmRef.current;if(!el)return;if(huConfirm&&connected&&controlled){if(!el.open)el.showModal();}else if(el.open)el.close();},[huConfirm,connected,controlled]);
 useEffect(()=>{setHuShow(null);},[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch,connected,controlled,envelope.public.suspension.kind]);
 useEffect(()=>{if(envelope.public.phase.kind==='ROOM_CLOSED')setHuShow(null);},[envelope.public.phase.kind]);
 const [roomConfirm,setRoomConfirm]=useState<'END_UNSCORED'|'CLOSE_ROOM'|null>(null);const roomConfirmRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=roomConfirmRef.current;if(!el)return;if(roomConfirm&&controlled){if(!el.open)el.showModal();}else if(el.open)el.close();},[roomConfirm,controlled]);
 useEffect(()=>setRoomConfirm(null),[envelope.public.roomId,envelope.public.roundId,envelope.public.phase.phaseId,controlled]);
 const [panel,setPanel]=useState<'arrange'|'display'|'room'|'autoplay'|'history'|'help'|'music'|'deck'|null>(null);const panelRef=useRef<HTMLDialogElement>(null);const [menuRequest,setMenuRequest]=useState(0);
 const returnToMenu=()=>{panelRef.current?.close();setPanel(null);setMenuRequest(n=>n+1);};
 useEffect(()=>{const el=panelRef.current;if(!el)return;if(panel&&controlled){if(!el.open)el.showModal();}else if(el.open)el.close();},[panel,controlled]);
 useEffect(()=>setPanel(null),[menuResetKey]);
 const askDissolve=()=>{if(!c.allowed('CLOSE_ROOM'))return;setReviewOpenId(null);setHuShow(null);setPanel(null);setRoomConfirm('CLOSE_ROOM');};
 const eatDragControls=useRef<EatDragControls>(null);
 const cancelDrag=()=>{eatDragControls.current?.cancel();pointer.current=null;setDrag(null);if(dropTimer.current)clearTimeout(dropTimer.current);dropTimer.current=null;renderer.current?.setRackPreview(null,null);};
 const stamp=rackInteractionStamp(envelope);
 useLayoutEffect(()=>{cancelDrag();c.finish();rangeStart.current=null;},[stamp,controlled,compose,fallback,mobile]);
 useLayoutEffect(()=>{c.replace(envelope);},[envelope]);c.connected=connected;c.controlled=controlled;
 useEffect(()=>{if(!controlled)c.revoke();},[controlled]);
 const eventHandlers=useRef({move:(_e:PointerEvent)=>{},up:(_e:PointerEvent)=>{}});
 useEffect(()=>{const resize=()=>{setScreen({width:innerWidth,height:innerHeight});cancelDrag();};const blur=()=>{cancelDrag();c.finish();};const move=(e:PointerEvent)=>eventHandlers.current.move(e),up=(e:PointerEvent)=>eventHandlers.current.up(e),cancel=()=>cancelDrag(),key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancelDrag();};window.addEventListener('resize',resize);window.addEventListener('blur',blur);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('keydown',key);const timer=setInterval(()=>setNow(Date.now()),500);return()=>{window.removeEventListener('resize',resize);window.removeEventListener('blur',blur);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',key);clearInterval(timer);if(dropTimer.current)clearTimeout(dropTimer.current);};},[]);
 const draftHash=JSON.stringify(c.draft),savedHash=useRef(draftHash);
 useEffect(()=>{const serverHash=JSON.stringify(envelope.private.candidateDraft?.sentence??envelope.private.draft);if(draftHash===serverHash){savedHash.current=draftHash;return;}if(savedHash.current===draftHash||!connected||!controlled||drag)return;const timer=setTimeout(()=>{const kind=envelope.private.candidateDraft?'SAVE_CANDIDATE_DRAFT':'SAVE_DRAFT';if(!pointer.current&&c.allowed(kind)){savedHash.current=draftHash;void c.saveDraft();}},500);return()=>clearTimeout(timer);},[draftHash,connected,controlled,c.pending?.actionId,envelope,!!drag]);
 const input={public:envelope.public,self:{...envelope.private,...(c.envelope!==envelope?{}:envelope.private.candidateDraft?{candidateDraft:{...envelope.private.candidateDraft,sentence:c.sentence()}}:{draft:c.draft})}};
 const projection=tableViewAdapter.project(input,seatTemplate,c.revision),view=projection.kind==='READY'?projection.view:null;
 const dom=compose||!!fallback||envelope.public.phase.kind==='HU_COMPOSE'||envelope.public.phase.kind==='HU_VOTE';
 useLayoutEffect(()=>{if(!host.current||fallback||!controlled)return;let disposed=false;try{renderer.current=new MainView(host.current,(h,l,center)=>{if(!disposed){setHits(h);setLabels(l);setTableCenter(center);captureMotion.current();}},()=>{flights.current?.clear();motionPrevious.current=null;setFallback('三维绘图上下文已中断，已保留当前草稿。');},low);if(import.meta.env.DEV)(window as any).__tableRenderer=renderer.current;}catch{setFallback('当前设备无法启动 WebGL，已切换可操作牌桌。');}return()=>{disposed=true;renderer.current?.dispose();renderer.current=undefined;if(import.meta.env.DEV)(window as any).__tableRenderer=null;};},[generation,fallback,low,controlled,!!view]);

 const phase=envelope.public.phase;
 useEffect(()=>setPunctuationOpen(false),[stamp,connected,controlled]);
 const nextDrawer=isNextDrawer(envelope),autoPlay=envelope.public.players.find(p=>p.playerId===envelope.private.playerId)?.autoPlay===true;
 const speech=useGameSpeech(envelope.public,[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch].join('|'),connected&&controlled&&envelope.public.suspension.kind==='RUNNING'&&phase.kind!=='ROOM_CLOSED',envelope.serverNow);
 const sfx=useGameSfx(envelope.public,[envelope.public.roomId,envelope.private.playerId,envelope.private.controlEpoch].join('|'),connected&&controlled,envelope.serverNow,speech.playing);
 const music=useRoomMusic(envelope.public.roomId,[envelope.public.roomId,envelope.private.playerId,envelope.private.controlEpoch].join('|'),!!musicEvents&&connected&&controlled&&envelope.public.phase.kind!=='ROOM_CLOSED',sfx,speech.playing,musicEvents);
 const waiting=phase.kind==='LOBBY'||phase.kind==='ROUND_FINISHED';
 const bottomControls=screen.width<700&&screen.height>screen.width&&dom&&!waiting&&phase.kind!=='ROOM_CLOSED';

 const humanCount=envelope.public.players.filter(p=>!p.isBotSeat).length;
 const hasAssignedBot=envelope.public.players.some(p=>p.isBotSeat);
 const practice=phase.kind==='LOBBY'?humanCount===1&&hasAssignedBot:envelope.public.practiceMode;
 const aiReview=['1.2.0','1.3.0','1.4.0','1.4.1','1.5.0','1.5.1','1.6.0','1.6.1','1.7.0','1.7.1','1.8.0'].includes(envelope.public.rulesVersion);
 const latestReview=envelope.public.history.at(-1);
 const [reviewNotice,setReviewNotice]=useState(false);
 useEffect(()=>{setReviewNotice(!!latestReview?.result);const timer=setTimeout(()=>setReviewNotice(false),10000);return()=>clearTimeout(timer);},[envelope.public.roomId,envelope.public.roundId,latestReview?.proposalId]);
 // Calibrate once per envelope; local clock never advances any game state.
 const offset=useRef({envelope,ms:Date.now()-envelope.serverNow});if(offset.current.envelope!==envelope)offset.current={envelope,ms:Date.now()-envelope.serverNow};
 const estimatedNow=Math.max(envelope.serverNow,now-offset.current.ms);
 const urgent=connected&&controlled&&isTurnUrgent(envelope,estimatedNow);
 const clock=phaseClock(envelope.public,estimatedNow),seconds=clock.seconds;
 const doodleBlocked=waiting||(phase.kind==='TURN_ACTION'&&phase.actorId===envelope.private.playerId&&seconds!==null&&seconds<=10)||phase.kind==='DISCARD_RESPONSE'||phase.kind==='HU_VOTE'||phase.kind==='HU_COMPOSE'||phase.kind==='ROOM_CLOSED'||!!reviewOpenId||!!huConfirm||!!roomConfirm;
 const [announcement,setAnnouncement]=useState('');const announcedPhase=useRef('');
 useEffect(()=>{if(announcedPhase.current!==phase.phaseId){announcedPhase.current=phase.phaseId;setAnnouncement(phases[phase.kind]??'牌局阶段已更新');}else if(seconds===10)setAnnouncement('本阶段还剩10秒，请及时操作。');},[phase.phaseId,seconds]);
 const own=view?.rack;
 const canGuide=c.allowed('DISCARD')&&!autoPlay;
 const heldTile=drag?.started&&drag.kind==='tile'&&drag.status==='held';
 const forbidden=!!own?.cells.find(x=>x.tile.tileId===(heldTile?drag.id:c.selected))?.forbiddenToDiscard;
 const showDiscardProtection=forbidden&&!(heldTile&&drag.overRack&&!drag.overDiscard);
 const interaction={selected:!!c.selected,forbidden,dragging:!!heldTile,overDiscard:!!drag?.overDiscard,overRack:!!drag?.overRack};
 const acquisition=c.acquisition();
 const latestDiscard=phase.kind==='DISCARD_RESPONSE'?envelope.public.discards.find(d=>d.discardId===phase.discardId):envelope.public.discards.at(-1);
 const discardPlayer=latestDiscard?envelope.public.players.find(p=>p.playerId===latestDiscard.playerId):null;
 const canEat=c.allowed('RESPOND')&&canEatDiscard(envelope);
 const eatDiscard=()=>{if(phase.kind==='DISCARD_RESPONSE'&&canEat)void c.command({kind:'RESPOND',responseWindowId:phase.responseWindowId,response:'EAT'});};

 const preview=drag?.started&&drag.stamp===stamp?drag.preview:c.draft;
 // A normal hand-count change retains the last arranged frame, even if a comma disappears.
 const handFrame=useRef({key:'',count:0,hash:'',draft:c.draft});
 const frameKey=[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId,envelope.private.controlEpoch,screen.width,screen.height].join('|'),frameHash=JSON.stringify(c.draft),frameCount=c.draft.orderedTileIds.length;
 const oldFrame=handFrame.current;
 handFrame.current={key:frameKey,count:frameCount,hash:frameHash,draft:oldFrame.key!==frameKey||oldFrame.count===frameCount&&oldFrame.hash!==frameHash?c.draft:oldFrame.draft};
 const frameReference=drag?.started&&drag.stamp===stamp?preview:handFrame.current.draft;
 // Mobile hands use seven physical character tiles per row, including punctuation space.
 const mobileLayout=mobileRackLayout(preview,rackSize,compact,true);
 const rackHeightBudget=Math.max(96,Math.min(320,screen.height*.34));
 const desktopLayout=adaptiveRackLayout(preview,rackSize,rackHeightBudget,160,64,6,8,'stable',frameReference);
 const rackWidth=mobile?mobileLayout.tileWidth:desktopLayout.tileWidth;
 const makeRackLayout=(draft:Draft)=>mobile?mobileRackLayout(draft,rackSize,compact,true):adaptiveRackLayout(draft,rackSize,rackHeightBudget,160,64,6,8,'stable',frameReference);
 const rackReserve=(mobile?mobileLayout.reserve:desktopLayout.reserve)+(compact?4:14);
 const layout=makeRackLayout(preview);
 useLayoutEffect(()=>{const el=dom?rackHost.current:shell.current?.querySelector('main');if(!el)return;const update=()=>{const style=getComputedStyle(el);setRackSize(el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();},[!!view,dom,phase.kind==='LOBBY']);
 useEffect(()=>{if(!renderer.current)return;const p=drag?.started&&drag.stamp===stamp&&drag.status==='held'?drag:null,rect=host.current?.getBoundingClientRect();renderer.current.setRackPreview(p?.preview??null,p&&rect?{key:`${p.kind}:${p.targetId??p.id}`,x:p.x-rect.left,y:p.y-rect.top,external:p.external||(p.kind==='comma'&&!p.id)}:null);},[drag,stamp,dom]);
 const motionLayout=[fallback,generation,low,mobile,bottomControls].join('|');
 const readMotionAnchors=():MotionAnchors=>{const anchors=renderer.current?.motionAnchors()??{};for(const el of shell.current?.querySelectorAll<HTMLElement>('[data-flight-rect][data-motion-anchor]')??[]){if(!dom&&el.classList.contains('projected-tile'))continue;const r=el.getBoundingClientRect();if(r.width&&r.height)anchors[el.dataset.motionAnchor!]={x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height};}if(bottomControls){const latest=shell.current?.querySelector<HTMLElement>('.latest-discard'),tile=latest?.querySelector('.latest-tile');if(latest?.dataset.motionAnchor&&tile){const r=tile.getBoundingClientRect();anchors[latest.dataset.motionAnchor]={x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height};}}if(dom&&rackHost.current){const r=rackHost.current.getBoundingClientRect(),ids=[...preview.orderedTileIds];while(ids.length<=14)ids.push(`presentation-slot-${ids.length}` as TileId);for(let i=0;i<=14;i++){const real=anchors[`tile:${ids[i]}`];if(real){anchors[`hand:${envelope.private.playerId}:${i}`]=real;continue;}const l=makeRackLayout({orderedTileIds:ids.slice(0,i+1),commaAfterTileIds:preview.commaAfterTileIds}),slot=l.items.find(t=>t.kind==='tile'&&t.tileId===ids[i]);if(slot)anchors[`hand:${envelope.private.playerId}:${i}`]={x:r.left+slot.x+slot.width/2,y:r.top+slot.y+slot.height/2,width:slot.width,height:slot.height};}}return anchors;};
 captureMotion.current=()=>{const previous=motionPrevious.current;if(previous&&previous.envelope===envelope)previous.anchors=readMotionAnchors();};
 useLayoutEffect(()=>{if(!shell.current||!controlled)return;flights.current=new FlightLayer(shell.current,keys=>renderer.current?.setMotionHidden(keys));const reset=()=>{flights.current?.clear();motionPrevious.current=null;};window.addEventListener('resize',reset);window.addEventListener('scroll',reset,true);return()=>{window.removeEventListener('resize',reset);window.removeEventListener('scroll',reset,true);flights.current?.dispose();flights.current=undefined;motionPrevious.current=null;};},[controlled,!!view]);
 const motionCoherent=c.envelope===envelope;
 useLayoutEffect(()=>{if(!view||!motionCoherent)return;renderer.current?.replace(view,!dom,c.selected,c.acquisition()?.tileId??null,urgent);const anchors=readMotionAnchors(),previous=motionPrevious.current;
  if(!connected||!controlled||envelope.public.suspension.kind!=='RUNNING'||envelope.public.phase.kind==='ROOM_CLOSED'){flights.current?.clear();motionPrevious.current=null;return;}
  if(previous&&previous.layout===motionLayout&&sameMotionSession(previous.envelope,envelope)){const events=tableMotions(previous.envelope,envelope),presentation=huPresentation(previous.envelope,envelope,previous.anchors);if(presentation){setRoomConfirm(null);setHuConfirm(null);setHuShow(presentation);}flights.current?.start(events.filter(e=>e.kind!=='HU'),previous.anchors,anchors);}else flights.current?.clear();
  motionPrevious.current={envelope,anchors,layout:motionLayout};flights.current?.refreshHidden();
 },[envelope,c.revision,dom,generation,low,fallback,connected,controlled,motionCoherent,urgent]);
 const reveal=publicReveal(envelope),showReveal=!!reveal&&!['LOBBY','DISCARD_RESPONSE','HU_COMPOSE'].includes(phase.kind)&&(phase.kind==='HU_VOTE'||phase.kind==='ROUND_FINISHED'||reviewNotice||reveal.proposalId!==publicReveal(motionPrevious.current?.envelope??envelope)?.proposalId);
 const askHu=(kind:'DECLARE_SELF_HU'|'SUBMIT_DISCARD_SENTENCE')=>{if(!c.allowed(kind))return;cancelDrag();c.finish();setHuConfirm({kind,sentence:structuredClone(c.sentence()),key:huKey});};
 const confirmHu=()=>{if(!huConfirm||huConfirm.key!==huKey||JSON.stringify(c.sentence())!==JSON.stringify(huConfirm.sentence)||!c.allowed(huConfirm.kind))return;
  if(huConfirm.kind==='DECLARE_SELF_HU')void c.command({kind:'DECLARE_SELF_HU',sentence:huConfirm.sentence});
  else if(phase.kind==='HU_COMPOSE'&&phase.source.kind==='DISCARD')void c.command({kind:'SUBMIT_DISCARD_SENTENCE',source:phase.source,sentence:huConfirm.sentence});
  setHuConfirm(null);
 };
 const select=(id:TileId)=>c.select(id);
 const key=(e:React.KeyboardEvent,id:TileId)=>{if(autoPlay)return;if(pointer.current)cancelDrag();if(e.key===' '){e.preventDefault();c.select(id);c.begin();}if(e.key.startsWith('Arrow')){e.preventDefault();c.move(id,c.draft.orderedTileIds.indexOf(id)+(e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-7:7));}if(e.key==='Escape'){c.cancel();}if(e.key==='Enter'){c.finish();select(id);}};
 const beginDrag=(e:React.PointerEvent,kind:'tile'|'comma',id:TileId|null)=>{
  if(e.button!==0||!controlled||autoPlay||!own||pointer.current)return;eatDragControls.current?.cancel();e.preventDefault();setPunctuationOpen(false);c.finish();if(dropTimer.current)clearTimeout(dropTimer.current);
  const rect=e.currentTarget.getBoundingClientRect(),scope=dom?rackHost.current:host.current?.parentElement,rects:Array<RackTargetRect>=[...(scope?.querySelectorAll<HTMLElement>('[data-rack-kind]')??[])].map(el=>{const r=el.getBoundingClientRect();return{tileId:el.dataset.rackId as TileId,kind:el.dataset.rackKind as RackTargetRect['kind'],left:r.left,top:r.top,width:r.width,height:r.height};});
  const p:RackPointer={kind,id,targetId:id,stamp,pointerId:e.pointerId,source:structuredClone(c.draft),preview:structuredClone(c.draft),rects,insertion:null,started:false,status:'held',x:rect.left+rect.width/2,y:rect.top+rect.height/2,startX:e.clientX,startY:e.clientY,offsetX:rect.left+rect.width/2-e.clientX,offsetY:rect.top+rect.height/2-e.clientY,width:kind==='comma'?(dom?rackWidth*COMMA_WIDTH_RATIO:rect.width):rect.width,height:rect.height,char:kind==='comma'?'，':own.cells.find(c=>c.tile.tileId===id)?.tile.char??'',dom,external:false,overDiscard:false,overRack:false,overReturn:false};pointer.current=p;setDrag({...p});
 };
 eventHandlers.current.move=(e:PointerEvent)=>{const p=pointer.current;if(!p||p.pointerId!==e.pointerId||p.stamp!==stamp)return;if(!p.started&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<7)return;if(p.kind==='comma'&&!p.id&&p.source.commaAfterTileIds.length>=3){cancelDrag();setPunctuationNotice(n=>({serial:n.serial+1,text:'最多只能用3个逗号'}));return;}p.started=true;p.x=e.clientX+p.offsetX;p.y=e.clientY+p.offsetY-18;
  // Freeze the return target with the insertion slots: preview layout must not move it away.
  p.overReturn=p.kind==='comma'&&p.rects.some(r=>r.kind==='period'&&insideRect(r,e.clientX,e.clientY));
  const insertion=p.kind==='tile'?rackInsertion(p.rects,e.clientX,e.clientY,p.insertion):null,target=p.kind==='comma'&&!p.overReturn?nearRackSlot(p.rects.filter(r=>r.kind==='tile'),e.clientX,e.clientY):null;p.insertion=insertion;p.overRack=!!(insertion||target);p.overDiscard=p.kind==='tile'&&insideRect(discardZone.current?.getBoundingClientRect(),e.clientX,e.clientY);
  if(p.overDiscard||p.overReturn||!p.overRack){p.preview=p.source;p.targetId=p.id;}else if(p.kind==='tile'&&p.id&&insertion){p.preview=insertTilePreview(p.source,p.id,insertion);p.targetId=p.id;}else if(p.kind==='comma'){p.preview=commaPreview(p.source,p.id,target);p.targetId=p.preview===p.source?p.id:target;}
  const area=host.current?.getBoundingClientRect();p.external=!p.dom&&!!area&&(p.x<area.left||p.x>area.right||p.y<area.top||p.y>area.bottom);setDrag({...p});
 };
 eventHandlers.current.up=(e:PointerEvent)=>{const p=pointer.current;if(!p||p.pointerId!==e.pointerId)return;if(p.started)eventHandlers.current.move(e);if(pointer.current!==p)return;pointer.current=null;if(p.stamp!==stamp){cancelDrag();return;}if(!p.started){setDrag(null);if(p.kind==='tile'&&p.id)select(p.id);else if(p.id)c.select(p.id);else setPunctuationOpen(true);return;}
  if(p.overDiscard){cancelDrag();if(p.id&&c.allowed('DISCARD')&&!own?.cells.find(x=>x.tile.tileId===p.id)?.forbiddenToDiscard){c.select(p.id);void c.discard(p.id);}return;}
  if(p.overReturn&&p.id){c.draft=commaPreview(p.source,p.id,null);c.changed();cancelDrag();return;}
  if(!p.overRack&&p.preview===p.source){cancelDrag();return;}
  c.draft=p.preview;c.selected=p.kind==='tile'?p.id:p.targetId;c.changed();renderer.current?.setRackPreview(null,null);
  if(p.dom&&p.targetId){const item=makeRackLayout(p.preview).items.find(i=>i.key===`${p.kind}:${p.targetId}`),area=rackHost.current?.getBoundingClientRect();if(item&&area){setDrag({...p,status:'drop',x:area.left+item.x+item.width/2,y:area.top+item.y+item.height/2});dropTimer.current=setTimeout(()=>{setDrag(null);dropTimer.current=null;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:220);return;}}
  setDrag(null);
 };
 const rackForced=!!fallback||phase.kind==='HU_COMPOSE'||phase.kind==='HU_VOTE';
 const toggleRack=()=>{if(rackForced)return;cancelDrag();rackFocusRequested.current=true;setRackExpanded(!dom);setPanel(null);};
 useLayoutEffect(()=>{if(!rackFocusRequested.current)return;rackFocusRequested.current=false;(dom?rackCloseButton.current:rackOpenButton.current)?.focus({preventScroll:true});},[dom]);
 const tileProps=(id:TileId)=>({disabled:autoPlay,onPointerEnter:()=>c.dismissAcquisition(id),onFocus:()=>c.dismissAcquisition(id),onPointerDown:(e:React.PointerEvent)=>{c.dismissAcquisition(id);beginDrag(e,'tile',id);},onKeyDown:(e:React.KeyboardEvent)=>key(e,id),'data-rack-kind':'tile','data-rack-id':id,'data-tile-id':id,'data-motion-anchor':`tile:${id}`,'data-flight-rect':true});
 const commaProps=(id:TileId)=>({disabled:autoPlay,onPointerDown:(e:React.PointerEvent)=>beginDrag(e,'comma',id),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();cancelDrag();c.draft=commaPreview(c.draft,id,null);c.changed();}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cancelDrag();const to=c.draft.orderedTileIds[c.draft.orderedTileIds.indexOf(id)+(e.key==='ArrowLeft'?-1:1)];if(to){c.draft=commaPreview(c.draft,id,to);c.changed();}}else if(e.key==='Escape')cancelDrag();},'data-rack-kind':'comma','data-rack-id':id,'data-anchor-id':id,'aria-label':`第 ${c.draft.orderedTileIds.indexOf(id)+1} 字后的逗号，左右键移动，Delete 收回`});
 const periodProps={'data-rack-kind':'period','data-rack-id':preview.orderedTileIds.at(-1),'data-returning':drag?.overReturn||undefined,'aria-label':'句号牌','aria-describedby':punctuationOpen?'punctuation-help':undefined,'aria-expanded':punctuationOpen,title:'拖出逗号 · 拖回收起 · 点击说明',disabled:autoPlay,onPointerDown:(e:React.PointerEvent)=>beginDrag(e,'comma',null),onClick:(e:React.MouseEvent)=>{if(e.detail===0)setPunctuationOpen(v=>!v);}};
 if(!controlled)return <section className="notice" role="status">已在其他设备恢复。此页面已清除私密操作区。</section>;
 if(!view)return <section className="notice">正在同步完整牌局 · {projection.kind==='WAIT_FOR_COHERENT_RESYNC'?projection.reason:''}</section>;
 const tableInteraction=<>
   {canGuide&&!showReveal&&<div ref={discardZone} style={!bottomControls&&!fallback&&tableCenter?{left:tableCenter.x,top:tableCenter.y,width:Math.max(136,Math.min(340,tableCenter.width*1.15))}:undefined} className={'discard-drop-zone visible '+(heldTile?'dragging ':'')+(drag?.overDiscard&&!forbidden?'over ':'')+(showDiscardProtection?'forbidden':'')} aria-label={bottomControls?"拖入出牌区":"桌中央出牌区"}><GameIcon className="discard-guide-icon" kind="drop"/><span className="discard-guide-copy" key={c.selected??'unselected'}><b>{showDiscardProtection||forbidden?'换张牌再出':heldTile&&drag.overDiscard?'松手出牌':heldTile&&drag.overRack?'松手调整顺序':'拖到这里出牌'}</b></span></div>}
   {latestDiscard&&!waiting&&!showReveal&&!canGuide&&phase.kind!=='ROOM_CLOSED'&&<div key={latestDiscard.discardId} style={!bottomControls&&!fallback&&tableCenter?{left:tableCenter.x,top:tableCenter.y}:undefined} data-motion-anchor={`discard:${latestDiscard.discardId}`} className={'latest-discard '+(phase.kind==='DISCARD_RESPONSE'?'responding ':'')+(drag?.started&&drag.kind==='tile'?'drag-obscured':'')} role="status" aria-live="polite" aria-atomic="true" aria-label={`${discardPlayer?.nickname??'同桌'}${phase.kind==='DISCARD_RESPONSE'?'刚出':'上张弃牌'}：${latestDiscard.tile.char}`}><span className="latest-player"><span className="latest-player-name">{latestDiscard.playerId===envelope.private.playerId?'你':discardPlayer?.nickname??'同桌'}</span><small className={canEat?'eat-hint':undefined}>{canEat?'上家的字':phase.kind==='DISCARD_RESPONSE'?'刚刚打出':latestDiscard.status==='CLAIMED'?'已被吃走':'上张弃牌'}</small></span><DraggableDiscardTile char={latestDiscard.tile.char} enabled={canEat&&!panel&&!reviewOpenId&&!huConfirm&&!roomConfirm&&(!phase.deadline||phase.deadline.endsAt>estimatedNow)} resetKey={[stamp,phase.phaseId,latestDiscard.discardId].join('|')} controls={eatDragControls} onStart={cancelDrag} onEat={eatDiscard}/></div>}
   <div className="table-action-dock" style={!bottomControls&&!(screen.height<500&&screen.width>=500)&&!fallback&&tableCenter?{left:tableCenter.x,top:tableCenter.y+(screen.width>=700?54:compact?30:40)}:undefined} aria-label="牌桌操作">
  {envelope.legalActions.includes('DISCARD')&&<button aria-label="出这张" className="game-action discard-action" disabled={!c.allowed('DISCARD')||!c.selected||own?.cells.find(x=>x.tile.tileId===c.selected)?.forbiddenToDiscard} onClick={()=>{if(c.selected)void c.discard(c.selected);}}><b aria-hidden="true">打</b><span>出这张</span></button>}
  {envelope.legalActions.includes('DECLARE_SELF_HU')&&<button aria-label="申请胡牌" title="把14个字排成完整的一句话，再申请胡牌" className="game-action hu-action" disabled={!c.allowed('DECLARE_SELF_HU')} onClick={()=>askHu('DECLARE_SELF_HU')}><b aria-hidden="true">胡</b><span>申请胡牌</span></button>}
  {phase.kind==='DISCARD_RESPONSE'&&(['PASS','EAT','HU'] as const).filter(response=>c.allowed('RESPOND')&&(response==='EAT'?nextDrawer:response==='HU'?borrowedHuVisible(envelope.public)&&(!practice||aiReview):nextDrawer||borrowedHuVisible(envelope.public))).map(response=><button key={response} className={'game-action response-action '+(response==='HU'?'hu-action':'')} aria-label={response==='EAT'?'吃上家的字':response==='HU'?'借字申请胡':nextDrawer?'摸':'过'} title={response==='PASS'?(nextDrawer?'放弃吃胡，响应结束后由你摸牌':'放弃这张弃牌，继续等待自己的回合'):undefined} disabled={!c.allowed('RESPOND')||(response==='EAT'&&!canEat)} onClick={()=>{cancelDrag();if(response==='EAT')eatDiscard();else void c.command({kind:'RESPOND',responseWindowId:phase.responseWindowId,response});}}><b aria-hidden="true">{response==='EAT'?'吃':response==='HU'?'胡':nextDrawer?'摸':'过'}</b><span>{response==='EAT'?'上家的字':response==='HU'?'借字申请':nextDrawer?'随机摸一张':'放弃这张字'}</span></button>)}
  {phase.kind==='HU_COMPOSE'&&phase.source.kind==='DISCARD'&&<><button className="primary" disabled={!c.allowed('SUBMIT_DISCARD_SENTENCE')} onClick={()=>askHu('SUBMIT_DISCARD_SENTENCE')}>提交这句话</button><button disabled={!c.allowed('WITHDRAW_DISCARD_HU')} onClick={()=>phase.source.kind==='DISCARD'&&c.command({kind:'WITHDRAW_DISCARD_HU',source:phase.source})}>放弃借字</button></>}
   </div>
 </>;
 return <ChatStickerProvider identity={envelope.public.roomId+envelope.private.playerId+envelope.private.controlEpoch} blocked={!connected||!controlled||phase.kind==='ROOM_CLOSED'||phase.kind==='HU_VOTE'||phase.kind==='HU_COMPOSE'||!!reviewOpenId||!!huConfirm||!!roomConfirm}><div ref={shell} className={"game-shell "+(compact?"compact-game":"")} data-phase={phase.kind} data-bottom-controls={bottomControls} >{reviewProposal&&controlled&&<HuReviewDialog sfx={sfx} speech={speech} key={reviewProposal.proposalId} proposal={reviewProposal} presentation={huShow?.proposal.proposalId===reviewProposal.proposalId?huShow:null} clock={clock} envelope={envelope} controller={c} onDissolve={askDissolve} onClose={()=>{setReviewOpenId(null);setHuShow(null);}}/>}{drag?.started&&(drag.dom||drag.external||drag.kind==='comma'&&!drag.id)&&createPortal(<div aria-hidden="true" className={'rack-drag-ghost '+(drag.kind==='comma'?'comma-ghost ':'')+(drag.status==='drop'?'dropping':'')} style={{width:drag.width,height:drag.height,fontSize:drag.width*.78,transform:`translate3d(${drag.x-drag.width/2}px,${drag.y-drag.height/2}px,0)`}}>{drag.kind==='comma'?<span className="rack-mark" style={{fontSize:drag.width*2.8}}>，</span>:drag.char}</div>,document.body)}<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
  {guideHelpOpen&&<NewPlayerGuide onConfirm={()=>setGuideHelpOpen(false)} onClose={()=>setGuideHelpOpen(false)}/>}
  <ThirdCircuitHint identity={[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId].join('|')} circuit={completedCircuits(envelope.public)+1} active={connected&&controlled&&!autoPlay&&!waiting&&envelope.public.suspension.kind==='RUNNING'&&!panel&&!reviewOpenId&&!huConfirm&&!roomConfirm&&!guideHelpOpen&&!punctuationOpen&&!drag?.started&&phase.kind!=='HU_COMPOSE'&&phase.kind!=='HU_VOTE'&&phase.kind!=='ROOM_CLOSED'} anchor={()=>shell.current?.querySelector<HTMLElement>('.period-tile')??null}/>
  <RoundMilestoneHint identity={[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId].join('|')} kind="borrow" text="第十圈，开启全场点炮胡牌" eligible={borrowedHuVisible(envelope.public)} active={connected&&controlled&&!autoPlay&&!waiting&&envelope.public.suspension.kind==='RUNNING'&&!panel&&!reviewOpenId&&!huConfirm&&!roomConfirm&&!guideHelpOpen&&!punctuationOpen&&!drag?.started&&phase.kind!=='HU_COMPOSE'&&phase.kind!=='HU_VOTE'&&phase.kind!=='ROOM_CLOSED'} anchor={()=>shell.current?.querySelector<HTMLElement>('.circuit-trigger')??null}/>
  {punctuationOpen&&<PunctuationHelp anchor={()=>shell.current?.querySelector<HTMLElement>('.period-tile')??null} onClose={()=>setPunctuationOpen(false)}/>}
  {punctuationNotice.text&&createPortal(<div key={punctuationNotice.serial} className="punctuation-notice" role="status">{punctuationNotice.text}</div>,document.body)}
  <header className="topbar game-hud"><button onClick={onLeave} className="hud-tool portrait-secondary" aria-label="离开牌桌"><MenuIcon kind="back"/><small>大厅</small></button><CircuitProgress envelope={envelope} controller={c} resetKey={menuResetKey} onOpen={()=>{cancelDrag();setPunctuationOpen(false);}}/><div className="wordmark">字间</div><div className="room-meta"><span className="room-code">{envelope.public.roomId}</span><span className={connected?'online':'offline'} aria-label={connected?'已连接':'连接中断'}>{connected?'● 联机':'● 断线'}</span></div><button className="hud-tool top-deck" aria-label="牌组" onClick={()=>{cancelDrag();setPunctuationOpen(false);setPanel('deck');}}><MenuIcon kind="arrange"/><small>牌组</small></button><button className="hud-tool top-music" aria-label="同桌音乐" onClick={()=>{cancelDrag();setPunctuationOpen(false);setPanel('music');}}><MenuIcon kind="music"/><small>音乐</small></button>{chat&&<span className="chat-dock" ref={chatDock}/>}  <PortraitMenu responsive openRequest={menuRequest} label="游戏菜单" meta={`${envelope.public.roomId} · ${connected?'联机':'断线'} · ${envelope.public.players.find(p=>p.playerId===envelope.private.playerId)?.nickname??'我的牌桌'} · ${view.seats.length} 人 · 余 ${view.wall.count} 张`} resetKey={menuResetKey} onOpen={()=>{cancelDrag();setPunctuationOpen(false);}} actions={[
 ...(doodle?[{label:'桌面涂鸦',shortLabel:'涂鸦',priority:1,icon:'brush' as const,run:()=>doodleControls.current?.open(),disabled:!!fallback||doodleBlocked||!connected||!doodleStatus.ready}]:[]),
 {label:'牌桌帮助',shortLabel:'帮助',priority:2,icon:'help',run:()=>setPanel('help')},
 {label:'牌局记录',shortLabel:'记录',priority:2,icon:'history',run:()=>setPanel('history')},
 ...(onAdmin?[{label:adminActive?'管理员模式':'管理员入口',shortLabel:'管理',priority:2,icon:'admin' as const,run:onAdmin}]:[]),
 {label:'标点',icon:'comma',run:()=>setPunctuationOpen(true)},
 {label:'画面设置',icon:'display',run:()=>setPanel('display')},
 {label:'整理句子',icon:'arrange',run:()=>setPanel('arrange')},
 ...(envelope.legalActions.includes('SET_AUTOPLAY')?[{label:'托管设置',icon:'autoplay' as const,run:()=>setPanel('autoplay')}]:[]),
 {label:'房间设置',icon:'room',run:()=>setPanel('room')},
 ...(doodle&&doodleStatus.count>0?[{label:doodleStatus.visible?'隐藏涂鸦':'显示涂鸦',icon:'brush' as const,run:()=>doodleControls.current?.toggleVisibility()}]:[]),
 {label:'离开牌桌',icon:'exit',run:()=>onLeave?.()}

 ]}/></header>
  {chat&&<RoomChat onOpen={()=>{cancelDrag();setPunctuationOpen(false);}} key={envelope.public.roomId+envelope.private.playerId} transport={chat} selfId={envelope.private.playerId} dock={chatDock} connected={connected} controlled={controlled} closed={phase.kind==='ROOM_CLOSED'} quiet={phase.kind==='HU_VOTE'||!!reviewOpenId||!!huConfirm||!!roomConfirm||phase.kind==='HU_COMPOSE'||(phase.kind==='TURN_ACTION'&&phase.actorId===envelope.private.playerId&&!!phase.deadline&&phase.deadline.endsAt-estimatedNow<10000)} selfSeat={envelope.private.seat??-1} selfName={envelope.public.players.find(p=>p.playerId===envelope.private.playerId)?.nickname??''}/>}
  <main>
  <div className="table-stage"><div className={'viewport '+(fallback?'fallback':'')}>
   {!fallback&&<div ref={host} className="canvas-host"/>}
   {fallback&&<div className="fallback-table"><span>字 间</span><strong>余牌 {view.wall.count}</strong><div className="fallback-wall" aria-hidden="true">{Array.from({length:Math.min(12,view.wall.count)},(_,i)=><i key={i} data-motion-anchor={i===Math.min(12,view.wall.count)-1?'wall:tail':undefined} data-flight-rect="true"/>)}</div><div className="fallback-discards">{view.discards.filter(d=>d.status!=='CLAIMED').map(d=><span key={d.discardId} data-motion-anchor={`discard:${d.discardId}`} data-flight-rect="true">{d.tile.char}</span>)}</div></div>}
   {doodle&&!fallback&&<RoomDoodle controls={doodleControls} onStatusChange={setDoodleStatus} transport={doodle} renderer={renderer} connected={connected&&controlled} blocked={doodleBlocked} identity={envelope.public.roomId+envelope.private.playerId+envelope.private.controlEpoch} seat={envelope.private.seat??0} nickname={envelope.public.players.find(p=>p.playerId===envelope.private.playerId)?.nickname??''}/>}
   <SeatBadges waiting={waiting} seats={view.seats} labels={labels} fallback={!!fallback} now={estimatedNow}/>
   {!dom&&<div className="hit-layer">{hits.map(h=>{const cell=own?.cells.find(x=>x.tile.tileId===h.tileId);return h.kind==='period'?<button key="period" {...periodProps} className="projected-comma period-tile" style={{left:h.x,top:h.y,width:h.width,height:h.height}}/>:h.kind==='comma'?<button key={`comma:${h.tileId}`} {...commaProps(h.tileId as TileId)} className="projected-comma" style={{left:h.x,top:h.y,width:h.width,height:h.height}}/>:<button key={h.tileId} {...tileProps(h.tileId as TileId)} aria-label={`第 ${(cell?.position??0)+1} 张 ${cell?.tile.char}${acquisition?.tileId===h.tileId?acquisition.kind==='EAT'?'，新吃的牌':'，新摸的牌':''}`} aria-pressed={c.selected===h.tileId} className={'projected-tile '+(c.selected===h.tileId?'selected ':'')+(acquisition?.tileId===h.tileId?'fresh-tile':'')} data-acquired={acquisition?.tileId===h.tileId?acquisition.kind:undefined} style={{left:h.x,top:h.y,width:h.width,height:h.height}}/>;})}</div>}

   {showReveal&&reveal&&<section className="table-public-reveal" aria-label="公开胡牌句子"><span>{envelope.public.players.find(p=>p.playerId===reveal.applicantId)?.nickname??'同桌'} · {phase.kind==='HU_VOTE'?'请大家评审':'本次胡牌句子'}</span><div>{[0,7].map(start=><div className="reveal-row" key={start}>{reveal.snapshot.sentence.orderedTileIds.slice(start,start+7).map(id=><span className="reveal-unit" key={id}><b data-motion-anchor={`reveal:${reveal.proposalId}:${id}`} data-flight-rect="true">{reveal.snapshot.tiles.find(t=>t.tileId===id)?.char}</b>{Array.from(reveal.snapshot.sentence.commaAfterTileIds).includes(id)&&<i>，</i>}</span>)}</div>)}</div></section>}
   {!bottomControls&&tableInteraction}
   {phase.kind==='ROOM_CLOSED'&&<div className="table-overlay"><h2>房间已关闭</h2><p>本局已记录的结果与胜局已保留。</p><button onClick={onLeave}>回到首页</button></div>}
  </div>
  {waiting&&<RoomSetupPanel key={[envelope.public.roomId,envelope.public.roundId,envelope.private.playerId].join('|')} envelope={envelope} seats={view.seats} controller={c} practice={!!practice} aiReview={aiReview} onDissolve={askDissolve}/>}
  </div>{bottomControls&&<section className="portrait-action-bar" aria-label="出牌与响应">{tableInteraction}</section>}<div className="hand-zone" data-expanded={dom&&!!own?.cells.length&&phase.kind!=='LOBBY'}>{dom&&!!own?.cells.length&&phase.kind!=='LOBBY'&&<button ref={rackCloseButton} className="rack-collapse" aria-label="收起整理区" title={rackForced?'当前排句需要保留手牌':'收起整理区'} disabled={rackForced} aria-expanded="true" aria-controls="private-sentence-rack" onClick={toggleRack}><GameIcon kind="down"/></button>}<div className="turn-hud-row"><TurnHud clock={clock} hint={bottomControls?turnHint(envelope,connected,controlled,interaction).replaceAll("桌中央","出牌区"):turnHint(envelope,connected,controlled,interaction)} connected={connected}/></div>
  {own&&phase.kind!=='LOBBY'&&<section id="private-sentence-rack" style={{'--rack-reserve':`${rackReserve}px`} as React.CSSProperties} className={'rack-area '+(dom?'expanded ':'')+(urgent?'turn-urgent':'')} aria-label="私密排句">
   {dom&&<div ref={rackHost} className="sentence-rack" data-sentence-rows={mobile?2:desktopLayout.rows} style={{height:layout.height}}>{layout.items.map(item=>{const cell=own.cells.find(c=>c.tile.tileId===item.tileId);if(!cell)return null;const lifted=drag?.started&&(drag.kind==='tile'&&drag.id===item.tileId&&item.kind==='tile'||drag.kind==='comma'&&drag.targetId===item.tileId&&item.kind==='comma');const style={width:item.width,height:item.height,minHeight:item.height,fontSize:item.kind!=='tile'?item.width*(item.kind==='comma'?2.8:1.8):mobile?Math.min(compact?28:35,item.width*.74):item.width*.78,transform:`translate3d(${item.x}px,${item.y-(item.kind==='tile'&&c.selected===item.tileId?3:0)}px,0)`};return item.kind==='period'?<button key={item.key} {...periodProps} className="comma-tile period-tile" style={style}><span className="rack-mark">。</span></button>:item.kind==='comma'?<button key={item.key} {...commaProps(item.tileId)} className={'comma-tile '+(lifted?'drag-vacancy':'')} style={style}><span className="rack-mark">，</span></button>:<button key={item.key} {...tileProps(item.tileId)} aria-label={`第 ${preview.orderedTileIds.indexOf(item.tileId)+1} 张 ${cell.tile.char}${cell.borrowedReference?'，借用':''}${acquisition?.tileId===item.tileId?acquisition.kind==='EAT'?'，新吃的牌':'，新摸的牌':''}`} aria-pressed={c.selected===item.tileId} data-acquired={acquisition?.tileId===item.tileId?acquisition.kind:undefined} className={'tile '+(acquisition?.tileId===item.tileId?'fresh-tile ':'')+(c.selected===item.tileId?'selected':'')+(cell.borrowedReference?' borrowed':'')+(lifted?' drag-vacancy':'')} style={style}>{cell.tile.char}{cell.borrowedReference&&<small>借用</small>}</button>;})}</div>}

  </section>}

  <footer className="action-bar" data-message={!!c.message}><div role="status" className="status">{c.message|| (c.selected?`已选「${own?.cells.find(x=>x.tile.tileId===c.selected)?.tile.char??''}」 · 可拖到桌中央出牌`:'拖动排句 · 自动保存')}</div>{c.pending&&<button onClick={()=>c.retry()}>重试提交</button>}</footer></div>
  {!dom&&!!own?.cells.length&&phase.kind!=='LOBBY'&&<div className="rack-tab-rail"><button ref={rackOpenButton} className="rack-expand-tab" aria-expanded="false" aria-controls="private-sentence-rack" onClick={toggleRack}><MenuIcon kind="arrange"/><span>放大麻将</span><GameIcon kind="up"/></button></div>}
  <dialog ref={panelRef} className={'table-dialog game-menu-panel'+(panel==='music'?' music-dialog':panel==='deck'?' deck-view-dialog':'')} aria-label={panel?({deck:'牌组',music:'同桌音乐',arrange:'整理句子',display:'画面设置',room:'房间设置',autoplay:'托管设置',history:'牌局记录',help:'牌桌帮助'}[panel]+'面板'):undefined} onCancel={()=>setPanel(null)} onClose={()=>setPanel(null)}><div className="table-dialog-heading"><button className="hud-tool" aria-label="返回菜单" onClick={returnToMenu}><GameIcon kind="left"/></button><h2>{panel&&({deck:'牌组',music:'同桌音乐',arrange:'整理句子',display:'画面设置',room:'房间设置',autoplay:'托管设置',history:'牌局记录',help:'怎么玩'}[panel])}</h2><button className="hud-tool" aria-label="关闭面板" onClick={()=>setPanel(null)}><GameIcon kind="close"/></button></div>
   {panel==='music'&&<RoomAudioPanel music={music} sfx={sfx} speech={speech} proposalId={reviewProposal?.proposalId}/>}
   {panel==='autoplay'&&<><button disabled={!c.allowed('SET_AUTOPLAY')} onClick={()=>{setPanel(null);void c.command({kind:'SET_AUTOPLAY',enabled:!autoPlay});}}>{autoPlay?'取消托管':'主动 AI 托管'}</button><p>AI 只摸打，不吃、不申胡；当前未完成的胡牌申请会撤回。</p></>}{panel==='deck'&&<DeckViewer roomId={envelope.public.roomId} roundId={envelope.public.roundId}/>}
  {panel==='arrange'&&<><button aria-pressed={dom} disabled={rackForced||!own?.cells.length} onClick={toggleRack}>{dom?'收起整理区':'放大麻将'}</button><p>拖拽后自动保存。选中一张字牌，可在这里微调。</p><div className="tool-grid"><button disabled={!c.selected} onClick={()=>c.selected&&c.move(c.selected,c.draft.orderedTileIds.indexOf(c.selected)-1)} aria-label="← 左移"><GameIcon kind="arrowLeft"/> 左移一格</button><button disabled={!c.selected} onClick={()=>c.selected&&c.move(c.selected,c.draft.orderedTileIds.indexOf(c.selected)+1)} aria-label="右移 →">右移一格 <GameIcon kind="arrowRight"/></button><button disabled={!c.selected} onClick={()=>c.selected&&c.toggleComma(c.selected)} aria-label="放 / 收逗号">放 / 收逗号</button><button disabled={!c.allowed(envelope.private.candidateDraft?'SAVE_CANDIDATE_DRAFT':'SAVE_DRAFT')} onClick={()=>c.saveDraft()} aria-label="保存排列">立即同步排列</button></div></>}{panel==='display'&&<>{fallback&&<p role="status">{fallback}</p>}<div className="tool-grid"><button onClick={()=>setLow(x=>!x)}>{low?'标准画质':'低画质'}</button>{fallback?<button onClick={()=>{setFallback('');setGeneration(x=>x+1);setPanel(null);}}>重试 3D</button>:<button onClick={()=>{setFallback('已主动切换二维模式。');setPanel(null);}}>二维模式</button>}</div></>}{panel==='room'&&<>{envelope.public.deckSetName&&<p>麻将套组：{envelope.public.deckSetName}</p>}<div className="tool-grid">
  {envelope.legalActions.includes('END_UNSCORED')&&<button disabled={!c.allowed('END_UNSCORED')} onClick={()=>{setPanel(null);setRoomConfirm('END_UNSCORED');}}>结束本局（不计分）</button>}
  {envelope.legalActions.includes('CLOSE_AFTER_ROUND')&&<button disabled={!c.allowed('CLOSE_AFTER_ROUND')||envelope.public.closeAfterRound} onClick={()=>{setPanel(null);c.command({kind:'CLOSE_AFTER_ROUND'});}}>{envelope.public.closeAfterRound?'本局结束后关闭':'本局后关闭房间'}</button>}
  {envelope.legalActions.includes('CLOSE_ROOM')&&<button disabled={!c.allowed('CLOSE_ROOM')} onClick={()=>{setPanel(null);setRoomConfirm('CLOSE_ROOM');}}>关闭房间</button>}
</div><p>用原浏览器从大厅返回房间，即可找回自己的座位。</p></>}
   {panel==='history'&&<><p>公开句子与弃牌记录；1.3 起显示实名评审，旧局保持匿名。</p>  {envelope.public.history.length>0&&<details className="proposal-history" open><summary>本局公开句子与评审 · {envelope.public.history.length} 条</summary>{envelope.public.history.map(h=><article key={h.proposalId}><strong>{envelope.public.players.find(p=>p.playerId===h.applicantId)?.nickname??'原成员'} · {h.outcome==='APPROVED'?'通过':h.outcome==='REJECTED'?'未通过':'申请已撤回'}</strong><p>{h.snapshot.sentence.orderedTileIds.map((id,i)=><span key={id} className={h.result?.mergedObjectionRanges.some(r=>i>=r.start&&i<r.endExclusive)?'anonymous-objection':''}>{h.snapshot.tiles.find(t=>t.tileId===id)?.char}{(h.snapshot.sentence.commaAfterTileIds as readonly TileId[]).includes(id)?'，':''}</span>)}</p>{h.result&&<p>赞成 {h.result.approveCount} · 反对 {h.result.rejectCount} · 未投 {h.result.abstainCount} · 通过需 {h.result.threshold}/{h.result.reviewerCount} 票。<small>下划线为合并异议；旧规则不公开评审身份。</small></p>}</article>)}</details>}
  {view.discards.length>0&&<details className="discard-history"><summary>弃牌记录 · {view.discards.length} 张（桌面显示最近 24 张）</summary><div>{view.discards.map(d=><span key={d.discardId}>{d.tile.char}<small>{d.status==='CLAIMED'?'已吃':d.status==='RESERVED'?'预留':'弃牌'}</small></span>)}</div></details>}
{!envelope.public.history.length&&!view.discards.length&&<p className="empty-record">这一桌的故事，还没开始。</p>}</>}
   {panel==='help'&&<div className="table-help"><button onClick={()=>{setPanel(null);setGuideHelpOpen(true);}}>查看新手指南</button><h3>排好 14 个字，等一句好意思。</h3><p>拖动字牌，旁边的牌会让位；放手才保存排列。牌序会自动保存，辅助微调在“整理句子”中。选牌后点桌上的“打”，或把牌拖到桌中央，即可出牌，无需二次确认。</p><h3>标点也是一张牌</h3><p>最多 3 个逗号，与字牌同宽同高；句号固定在最后。从句号牌拖出逗号，放到一个字后；把已有逗号拖回句号即可收起。点击句号可查看说明。拖字到逗号左半边插在逗号前，右半边插在逗号后；句号附近可插到末尾。移动字牌时逗号留在原处；逗号可单独拖动，拖回句号收回。标点不参与胡牌，只帮助自己和朋友理解句意。</p><p>键盘：字牌 Space 拿起、方向键移动、Enter 放下、Escape 取消。逗号左右键移动，Delete 收回。</p><h3>摸与吃</h3><p>上家刚出的字，可以拖到自己的手牌区或「吃」按钮，松手即可吃牌；拖到别处会取消，仍可直接点「吃」。</p><p>“摸”表示不吃、不胡这张弃牌；轮到自己时摸一张。如果其他玩家吃或胡，先处理他们的响应。</p><h3>借字胡</h3><p>全桌累计出牌满10圈后显示“借字胡”，可以借任何对手当前打出的字排句。每桌人数次出牌算一圈，吃牌后出牌也计入；新一局重新计圈。自己14字成句仍可随时申请胡牌，吃牌只限上家的字。</p><h3>二十圈，妙笔改字</h3><p>左上角可查看当前圈数。满20圈后，每人每局能改一次字：在自己的出牌回合，点击圈数，选一张自己的手牌并输入一个汉字，确认后生效。改字不增加时间，刚吃的牌仍不能立即打出；旧牌局下一局启用。</p><h3>共同评审</h3><p>自摸胡或借字排好提交时，先确认句子。确认后全桌同步逐字亮牌；可收起亮相直接评审，计时照常。刷新不重播旧亮相。</p><p>点击字牌圈选异议，最多三段，再投反对票；逗号不计入字的位置。新规则评审限时一分钟，实名投票与圈词实时公开；旧局保持匿名。</p><h3>AI 与恢复</h3><p>{usesDeepSeekRules(envelope.public.rulesVersion)?'指定 AI 宽松判句，犀利吐槽；新局每位独立判断、留言。最多等10秒，超时或失败时每位独立70%赞成；真人仍独立投票，超过全部评审的一半才通过。吐槽同步闲聊。AI不主动吃胡。':aiReview?'可以向 AI 申请胡牌：每位指定 AI 独立有 70% 概率赞成，超过全部评审的一半即通过；这是随机评审，不判断句意。AI 不主动吃牌或申请胡牌。':envelope.public.rulesVersion==='1.1.0'?'本局沿用旧规则；此房间下一局可让 AI 参与胡牌评审。':'此房间沿用旧规则；新建房间可使用 AI 评审。'} {aiReview?'只有一位真人时为练习局，胡牌可以结束本局，但不累计胜局。':'只有一位真人时为练习局，不累计胜局。'}真人掉线后的托管不代投票。</p><p>网络中断仍可整理草稿。用原浏览器从大厅打开原房间，点击自己的托管座位即可接管；旧页面会失去控制。服务端管理期限，动画不延长时间。</p><small>规则 {envelope.public.rulesVersion}</small></div>}
  </dialog>
  <dialog ref={huConfirmRef} className="table-dialog hu-confirm" aria-label="胡牌确认" onCancel={()=>setHuConfirm(null)} onClose={()=>setHuConfirm(null)}>
   <div className="table-dialog-heading"><h2>您确认这是一句完整的人话吗？</h2></div>
   {huConfirm&&<SentenceTiles className="hu-confirm-sentence" mode="confirm" label="即将提交的句子" sentence={huConfirm.sentence} renderTile={id=><b>{own?.cells.find(cell=>cell.tile.tileId===id)?.tile.char}</b>}/>}
   <p>确认后，全桌都会看到这句话，并一起评审。</p><div className="actions"><button autoFocus onClick={()=>setHuConfirm(null)}>再琢磨一下</button><button className="primary" disabled={!huConfirm||huConfirm.key!==huKey||!c.allowed(huConfirm.kind)||JSON.stringify(c.sentence())!==JSON.stringify(huConfirm.sentence)} onClick={confirmHu}>确认，亮给大家看</button></div>
  </dialog>
  <dialog ref={roomConfirmRef} className="table-dialog room-confirm" aria-label={roomConfirm==='END_UNSCORED'?'结束本局确认':'关闭房间确认'} onCancel={()=>setRoomConfirm(null)} onClose={()=>setRoomConfirm(null)}><div className="table-dialog-heading"><h2>{roomConfirm==='END_UNSCORED'?'这一局，先到这里？':'关闭这张牌桌？'}</h2><button className="hud-tool" aria-label="取消房间操作" onClick={()=>setRoomConfirm(null)}><GameIcon kind="close"/></button></div><p>{roomConfirm==='END_UNSCORED'?'结束当前练习局，不计入胜局。结束后仍可准备下一局。':'房间关闭后不能继续开局，已经记录的结果会保留。'}</p><div className="actions"><button onClick={()=>setRoomConfirm(null)}>再想想</button><button className="primary" disabled={!roomConfirm||!c.allowed(roomConfirm)} onClick={()=>{if(roomConfirm)c.command({kind:roomConfirm});setRoomConfirm(null);}}>{roomConfirm==='END_UNSCORED'?'确认结束':'确认关闭'}</button></div></dialog>

 </main></div></ChatStickerProvider>;
}
