import test from 'node:test';import assert from 'node:assert/strict';import {chatPanelFrame} from '../../apps/web/src/chat-panel-layout';
test('chat frame follows a shrinking/panned visual viewport and keeps its composer budget',()=>{
 for(const shellTop of [0,60,120])for(const height of [180,230,300,400,650]){
  const r=chatPanelFrame({shellTop,shellBottom:shellTop+height,visibleTop:shellTop,visibleHeight:height,anchorBottom:shellTop+160,maxHeight:360});
  assert(r.top>=8);assert(r.height>=Math.min(220,height-16));assert(r.top+r.height<=height-8);assert(r.height<=360);
 }
 // A browser may shrink only the visible viewport while the outer game remains tall.
 const r=chatPanelFrame({shellTop:0,shellBottom:650,visibleTop:80,visibleHeight:260,anchorBottom:160,maxHeight:360});assert(r.top>=88);assert(r.top+r.height<=332);assert(r.height>=220);
});
test('chat stays below the danmaku in normal height, and tolerates an almost fully covered window',()=>{
 assert.deepEqual(chatPanelFrame({shellTop:0,shellBottom:844,visibleTop:0,visibleHeight:844,anchorBottom:160,maxHeight:360}),{top:166,height:360});
 for(const h of [0,20,100]){const r=chatPanelFrame({shellTop:0,shellBottom:h,visibleTop:0,visibleHeight:h,anchorBottom:160,maxHeight:360});assert(r.top>=0&&r.height>=0&&r.top+r.height<=h);}
});
