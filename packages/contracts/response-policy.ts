import type {PublicRoomSnapshot,RulesVersion} from './types';
export const BORROW_HU_CIRCUITS=10;
export function borrowedHuVisible(p:Pick<PublicRoomSnapshot,'capacity'|'discards'>){return p.discards.length>=p.capacity*BORROW_HU_CIRCUITS;}
export function usesDeepSeekRules(version:RulesVersion){return version==='1.6.0'||version==='1.6.1'||version==='1.7.0';}

export const REWRITE_CIRCUITS=20;
export const completedCircuits=(p:Pick<PublicRoomSnapshot,'capacity'|'discards'>)=>Math.floor(p.discards.length/p.capacity);
export const supportsRewrite=(version:RulesVersion)=>version==='1.7.0';
export const rewriteUnlocked=(p:Pick<PublicRoomSnapshot,'rulesVersion'|'capacity'|'discards'>)=>supportsRewrite(p.rulesVersion)&&completedCircuits(p)>=REWRITE_CIRCUITS;
