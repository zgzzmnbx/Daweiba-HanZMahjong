import defaults from '../contracts/rules.defaults.json';
import type {RulesVersion} from '../contracts/types';
/** Old rounds keep their original timing for every later phase, including after recovery. */
export function timingForRules(version:RulesVersion){
 if(version==='1.4.0'||version==='1.4.1'||version==='1.5.0'||version==='1.5.1'||version==='1.6.0'||version==='1.6.1'||(version==='1.7.0'||version==='1.7.1'))return {responseMs:version==='1.7.1'?15000:8000,turnMs:defaults.turnMs,composeMs:defaults.composeMs,postHuDiscardMs:defaults.postHuDiscardMs,botActionDelayMs:version==='1.4.0'?5000:(version==='1.6.1'||(version==='1.7.0'||version==='1.7.1'))?defaults.botActionDelayMs:3000,voteMs:defaults.voteMs};
 return {responseMs:8000,turnMs:60000,composeMs:45000,postHuDiscardMs:30000,botActionDelayMs:800,voteMs:version==='1.3.0'?60000:45000};
}
