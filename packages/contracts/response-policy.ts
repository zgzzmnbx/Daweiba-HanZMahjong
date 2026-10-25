import type {PublicRoomSnapshot,RulesVersion} from './types';
export const BORROW_HU_CIRCUITS=10;
export function borrowedHuVisible(p:Pick<PublicRoomSnapshot,'capacity'|'discards'>){return p.discards.length>=p.capacity*BORROW_HU_CIRCUITS;}
export function usesDeepSeekRules(version:RulesVersion){return version==='1.6.0'||version==='1.6.1';}
