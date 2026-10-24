import defaults from '../contracts/rules.defaults.json';
import type {RulesVersion} from '../contracts/types';
/** Old rounds keep their original timing for every later phase, including after recovery. */
export function timingForRules(version:RulesVersion){
 if(version==='1.4.0'||version==='1.4.1'||version==='1.5.0')return {turnMs:defaults.turnMs,composeMs:defaults.composeMs,postHuDiscardMs:defaults.postHuDiscardMs,botActionDelayMs:version==='1.4.0'?5000:defaults.botActionDelayMs,voteMs:defaults.voteMs};
 return {turnMs:60000,composeMs:45000,postHuDiscardMs:30000,botActionDelayMs:800,voteMs:version==='1.3.0'?60000:45000};
}
