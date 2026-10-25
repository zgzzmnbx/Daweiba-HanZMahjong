import shuffleSvg from '@phosphor-icons/core/assets/regular/shuffle.svg?raw';
import type {SVGProps} from 'react';
import backSvg from '@phosphor-icons/core/assets/regular/arrow-u-up-left.svg?raw';
import soundSvg from '@phosphor-icons/core/assets/regular/speaker-high.svg?raw';
import mutedSvg from '@phosphor-icons/core/assets/regular/speaker-slash.svg?raw';
import displaySvg from '@phosphor-icons/core/assets/regular/monitor.svg?raw';
import autoplaySvg from '@phosphor-icons/core/assets/regular/robot.svg?raw';
import arrangeSvg from '@phosphor-icons/core/assets/regular/cards.svg?raw';
import musicSvg from '@phosphor-icons/core/assets/regular/music-notes.svg?raw';
import chatSvg from '@phosphor-icons/core/assets/regular/chat-circle-text.svg?raw';
import brushSvg from '@phosphor-icons/core/assets/regular/paint-brush.svg?raw';
import commaSvg from '@phosphor-icons/core/assets/regular/quotes.svg?raw';
import historySvg from '@phosphor-icons/core/assets/regular/scroll.svg?raw';
import settingsSvg from '@phosphor-icons/core/assets/regular/sliders-horizontal.svg?raw';
import helpSvg from '@phosphor-icons/core/assets/regular/question.svg?raw';
import adminSvg from '@phosphor-icons/core/assets/regular/shield-check.svg?raw';
import exitSvg from '@phosphor-icons/core/assets/regular/sign-out.svg?raw';
import entrySvg from '@phosphor-icons/core/assets/regular/sign-in.svg?raw';
import bookSvg from '@phosphor-icons/core/assets/regular/book-open-text.svg?raw';
import roomSvg from '@phosphor-icons/core/assets/regular/door-open.svg?raw';
import updatesSvg from '@phosphor-icons/core/assets/regular/newspaper.svg?raw';
import menuSvg from '@phosphor-icons/core/assets/regular/list.svg?raw';
import closeSvg from '@phosphor-icons/core/assets/regular/x.svg?raw';
import plusSvg from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import minusSvg from '@phosphor-icons/core/assets/regular/minus.svg?raw';
import leftSvg from '@phosphor-icons/core/assets/regular/caret-left.svg?raw';
import upSvg from '@phosphor-icons/core/assets/regular/caret-up.svg?raw';
import downSvg from '@phosphor-icons/core/assets/regular/caret-down.svg?raw';
import arrowLeftSvg from '@phosphor-icons/core/assets/regular/arrow-left.svg?raw';
import arrowRightSvg from '@phosphor-icons/core/assets/regular/arrow-right.svg?raw';
import arrowDownSvg from '@phosphor-icons/core/assets/regular/arrow-down.svg?raw';
import sendSvg from '@phosphor-icons/core/assets/regular/paper-plane-tilt.svg?raw';
import smileSvg from '@phosphor-icons/core/assets/regular/smiley.svg?raw';
import danmakuSvg from '@phosphor-icons/core/assets/regular/subtitles.svg?raw';
import danmakuOffSvg from '@phosphor-icons/core/assets/regular/subtitles-slash.svg?raw';
import visibleSvg from '@phosphor-icons/core/assets/regular/eye.svg?raw';
import hiddenSvg from '@phosphor-icons/core/assets/regular/eye-slash.svg?raw';
import checkSvg from '@phosphor-icons/core/assets/regular/check.svg?raw';
import eggSvg from '@phosphor-icons/core/assets/duotone/egg-duotone.svg?raw';
import sparkSvg from '@phosphor-icons/core/assets/fill/star-four-fill.svg?raw';
import heartSvg from '@phosphor-icons/core/assets/regular/heart.svg?raw';
import heartFilledSvg from '@phosphor-icons/core/assets/fill/heart-fill.svg?raw';
import waitingSvg from '@phosphor-icons/core/assets/regular/dots-three.svg?raw';
import skipSvg from '@phosphor-icons/core/assets/regular/skip-forward.svg?raw';
import playSvg from '@phosphor-icons/core/assets/regular/play.svg?raw';
import uploadSvg from '@phosphor-icons/core/assets/regular/upload-simple.svg?raw';
import discSvg from '@phosphor-icons/core/assets/regular/vinyl-record.svg?raw';
import dropSvg from '@phosphor-icons/core/assets/regular/hand-deposit.svg?raw';
import undoSvg from '@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?raw';
import eraseSvg from '@phosphor-icons/core/assets/regular/eraser.svg?raw';
import trashSvg from '@phosphor-icons/core/assets/regular/trash.svg?raw';
import refreshSvg from '@phosphor-icons/core/assets/regular/arrows-clockwise.svg?raw';
import saveSvg from '@phosphor-icons/core/assets/regular/floppy-disk.svg?raw';

const sources = {
 shuffle: {name:"shuffle",weight:"regular",svg:shuffleSvg},
 back: {name:"arrow-u-up-left",weight:"regular",svg:backSvg},
 sound: {name:"speaker-high",weight:"regular",svg:soundSvg},
 muted: {name:"speaker-slash",weight:"regular",svg:mutedSvg},
 display: {name:"monitor",weight:"regular",svg:displaySvg},
 autoplay: {name:"robot",weight:"regular",svg:autoplaySvg},
 arrange: {name:"cards",weight:"regular",svg:arrangeSvg},
 music: {name:"music-notes",weight:"regular",svg:musicSvg},
 chat: {name:"chat-circle-text",weight:"regular",svg:chatSvg},
 brush: {name:"paint-brush",weight:"regular",svg:brushSvg},
 comma: {name:"quotes",weight:"regular",svg:commaSvg},
 history: {name:"scroll",weight:"regular",svg:historySvg},
 settings: {name:"sliders-horizontal",weight:"regular",svg:settingsSvg},
 help: {name:"question",weight:"regular",svg:helpSvg},
 admin: {name:"shield-check",weight:"regular",svg:adminSvg},
 exit: {name:"sign-out",weight:"regular",svg:exitSvg},
 entry: {name:"sign-in",weight:"regular",svg:entrySvg},
 book: {name:"book-open-text",weight:"regular",svg:bookSvg},
 room: {name:"door-open",weight:"regular",svg:roomSvg},
 updates: {name:"newspaper",weight:"regular",svg:updatesSvg},
 menu: {name:"list",weight:"regular",svg:menuSvg},
 close: {name:"x",weight:"regular",svg:closeSvg},
 plus: {name:"plus",weight:"regular",svg:plusSvg},
 minus: {name:"minus",weight:"regular",svg:minusSvg},
 left: {name:"caret-left",weight:"regular",svg:leftSvg},
 up: {name:"caret-up",weight:"regular",svg:upSvg},
 down: {name:"caret-down",weight:"regular",svg:downSvg},
 arrowLeft: {name:"arrow-left",weight:"regular",svg:arrowLeftSvg},
 arrowRight: {name:"arrow-right",weight:"regular",svg:arrowRightSvg},
 arrowDown: {name:"arrow-down",weight:"regular",svg:arrowDownSvg},
 send: {name:"paper-plane-tilt",weight:"regular",svg:sendSvg},
 smile: {name:"smiley",weight:"regular",svg:smileSvg},
 danmaku: {name:"subtitles",weight:"regular",svg:danmakuSvg},
 danmakuOff: {name:"subtitles-slash",weight:"regular",svg:danmakuOffSvg},
 visible: {name:"eye",weight:"regular",svg:visibleSvg},
 hidden: {name:"eye-slash",weight:"regular",svg:hiddenSvg},
 check: {name:"check",weight:"regular",svg:checkSvg},
 egg: {name:"egg",weight:"duotone",svg:eggSvg},
 spark: {name:"star-four",weight:"fill",svg:sparkSvg},
 heart: {name:"heart",weight:"regular",svg:heartSvg},
 heartFilled: {name:"heart",weight:"fill",svg:heartFilledSvg},
 waiting: {name:"dots-three",weight:"regular",svg:waitingSvg},
 skip: {name:"skip-forward",weight:"regular",svg:skipSvg},
 play: {name:"play",weight:"regular",svg:playSvg},
 upload: {name:"upload-simple",weight:"regular",svg:uploadSvg},
 disc: {name:"vinyl-record",weight:"regular",svg:discSvg},
 drop: {name:"hand-deposit",weight:"regular",svg:dropSvg},
 undo: {name:"arrow-counter-clockwise",weight:"regular",svg:undoSvg},
 erase: {name:"eraser",weight:"regular",svg:eraseSvg},
 trash: {name:"trash",weight:"regular",svg:trashSvg},
 refresh: {name:"arrows-clockwise",weight:"regular",svg:refreshSvg},
 save: {name:"floppy-disk",weight:"regular",svg:saveSvg},
};
export type GameIconKind = keyof typeof sources;
// Only the pinned package's explicit, local SVG imports enter this registry. Never accept user SVG/URLs.
const assets = Object.fromEntries(Object.entries(sources).map(([key,value])=>[key,{...value,body:value.svg.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')}]));
/** Decorative icon; the containing button keeps its visible text / accessible name. */
export function GameIcon({kind,className='',...props}:Omit<SVGProps<SVGSVGElement>,'children'|'dangerouslySetInnerHTML'> & {kind:GameIconKind}){
 const icon=assets[kind];
 return <svg {...props} className={'game-icon '+className} data-phosphor-icon={icon.name} data-icon-weight={icon.weight} viewBox="0 0 256 256" width="24" height="24" fill="currentColor" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:icon.body}}/>;
}
