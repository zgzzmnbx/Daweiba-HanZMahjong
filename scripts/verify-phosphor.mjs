/** Phosphor visual audit plus real two-player controls, chat, drawing and review. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGameServer} from '../apps/server/server.ts';
import {gameAction,gameTool,rejectReview} from './game-ui-tools.mjs';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3193',local=!process.env.PUBLIC_ORIGIN;
const version=JSON.parse(await readFile('package.json','utf8')).version,prefix=process.env.EVIDENCE_PREFIX??`phosphor-${version}`;
const screens=process.env.SCREENSHOT_DIR??'docs/evidence';await mkdir(screens,{recursive:true});await mkdir('docs/evidence',{recursive:true});await mkdir('Codex-Temp',{recursive:true});
const server=local?createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3193);
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_BROWSERS_PATH?'chromium':'chrome',headless:true}),clients=[],checks=[],errors=[];let room;
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name);};
async function audit(page,selector='body'){
 await page.evaluate(()=>document.fonts.ready);
 const bar=page.locator('.game-shell .topbar');
 if(await bar.isVisible()){
  const geometry=await bar.evaluate(el=>{const r=el.getBoundingClientRect();return {w:innerWidth,h:innerHeight,height:r.height,overflow:el.scrollWidth-el.clientWidth,buttons:[...el.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width&&getComputedStyle(b).visibility!=='hidden').map(b=>{const q=b.getBoundingClientRect();return {name:b.getAttribute('aria-label'),round:b.classList.contains('hud-tool'),width:q.width,height:q.height,top:q.top-r.top,bottom:r.bottom-q.bottom,left:q.left-r.left,right:r.right-q.right};})};});
  assert(geometry.overflow<=1,'toolbar overflows '+JSON.stringify(geometry));
  for(const b of geometry.buttons){assert(b.left>=0&&b.right>=0,'toolbar clips '+JSON.stringify(b));if(b.round){assert(Math.abs(b.width-b.height)<.6);if(geometry.w<700){assert(b.width>=44);assert(b.top>=5&&b.bottom>=5,'toolbar needs vertical space '+JSON.stringify(b));}}}
  if(geometry.w<700)assert.equal(geometry.height,geometry.h<=549?56:64);
 }
 const result=await page.locator(selector).evaluate(root=>{
  const modal=document.querySelector('dialog:modal:last-of-type');
  const rows=[...root.querySelectorAll('svg')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(el).visibility!=='hidden'&&(!modal||modal.contains(el));}).map(el=>{
   const r=el.getBoundingClientRect(),s=getComputedStyle(el),b=el.getBBox(),parent=el.parentElement,p=parent.getBoundingClientRect(),ps=getComputedStyle(parent),onlyIcon=parent.tagName==='BUTTON'&&parent.children.length===1&&!parent.textContent.trim(),column=parent.tagName==='BUTTON'&&ps.display.includes('flex')&&ps.flexDirection==='column';return {name:el.dataset.phosphorIcon,viewBox:el.getAttribute('viewBox'),w:r.width,h:r.height,ink:b.width*b.height,fill:s.fill,stroke:s.stroke,hidden:el.getAttribute('aria-hidden'),focusable:el.getAttribute('focusable'),parent:el.parentElement.className,centerX:onlyIcon||column?r.x+r.width/2-p.x-p.width/2:null,centerY:onlyIcon?r.y+r.height/2-p.y-p.height/2:null};
  });return rows;
 });
 assert(result.length,'expected visible Phosphor icons in '+selector);
 for(const i of result){assert(i.name,'legacy SVG '+i.parent);assert.equal(i.viewBox,'0 0 256 256');assert(i.ink>0,'empty icon '+i.name);assert(Math.abs(i.w-i.h)<.6,'squashed icon '+JSON.stringify(i));assert.notEqual(i.fill,'none','invisible icon '+i.name);assert.equal(i.stroke,'none','legacy stroke applied '+i.name);assert.equal(i.hidden,'true');assert.equal(i.focusable,'false');if(i.centerX!==null)assert(Math.abs(i.centerX)<.6,'horizontal icon drift '+JSON.stringify(i));if(i.centerY!==null)assert(Math.abs(i.centerY)<.6,'vertical icon drift '+JSON.stringify(i));}
 return [...new Set(result.map(i=>i.name))];
}
async function auditLatestDiscard(page,width,height){
 const initial=await page.locator('.sentence-rack').isVisible();
 for(const expanded of [true,false]){
  const visible=await page.locator('.sentence-rack').isVisible();
  if(visible!==expanded)await page.getByRole('button',{name:expanded?'放大麻将':'收起整理区',exact:true}).click();
  await page.waitForTimeout(350);
  const g=await page.locator('.latest-discard').evaluate(el=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   return {box:rect(el),table:rect(document.querySelector('.canvas-host')),actions:rect(document.querySelector('.table-action-dock')),tile:rect(el.querySelector('.latest-tile')),name:el.querySelector('.latest-player-name').textContent,pointer:getComputedStyle(el).pointerEvents};
  });
  assert(Math.abs(g.box.x+g.box.width/2-(g.table.x+g.table.width/2))<1,'latest discard is off table center '+JSON.stringify(g));
  assert(g.box.x>=0&&g.box.right<=width&&g.box.y>=0&&g.box.bottom<=height,'latest discard clipped '+JSON.stringify(g));
  assert(!(g.box.x<g.actions.right&&g.box.right>g.actions.x&&g.box.y<g.actions.bottom&&g.box.bottom>g.actions.y),'latest discard overlaps action dock '+JSON.stringify(g));
  assert.equal(g.pointer,'none');assert(g.tile.x>=g.box.x&&g.tile.right<=g.box.right&&g.tile.bottom<=g.box.bottom);
  await page.screenshot({path:`${screens}/${prefix}-${width}-latest-${expanded?'rack':'table'}.png`});
  pass(`${width}x${height} latest discard centered with ${expanded?'expanded':'collapsed'} rack`,g);
 }
 if(await page.locator('.sentence-rack').isVisible()!==initial)await page.getByRole('button',{name:initial?'放大麻将':'收起整理区',exact:true}).click();
}
async function hallCheck(page,width,height){
 await page.setViewportSize({width,height});await page.goto(base);await page.getByRole('button',{name:'胡牌天书',exact:true}).waitFor();await page.waitForTimeout(180);
 const iconNames=await audit(page,'.game-hall');
 for(const [label,close] of [['更新日志','关闭更新日志'],['玩法帮助','关闭玩法帮助'],['管理员入口','关闭管理员面板']]){
  const b=page.getByRole('button',{name:label,exact:true});if(!await b.isVisible())await page.getByRole('button',{name:'大厅菜单',exact:true}).click();await b.click();await page.getByRole('button',{name:close,exact:true}).waitFor();await audit(page);await page.getByRole('button',{name:close,exact:true}).click();
 }
 await page.getByRole('button',{name:'胡牌天书',exact:true}).click();await page.getByRole('button',{name:'关闭胡牌天书',exact:true}).waitFor();await audit(page);await page.getByRole('button',{name:'关闭胡牌天书',exact:true}).click();
 await page.screenshot({path:`${screens}/${prefix}-${width}-hall.png`});pass(`${width}x${height} hall, book, updates, help, admin icons`,{iconNames});
}
async function wait(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('condition timeout');}
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${room}/snapshot`);assert(r.ok());return r.json();}
async function closeNavigation(p){for(const label of ['关闭新手指南','关闭面板','收起菜单']){const b=p.page.getByRole('button',{name:label,exact:true});if(await b.isVisible())await b.click();}}
async function open(p,label){await closeNavigation(p);if(label==='游戏菜单')await p.page.getByRole('button',{name:label,exact:true}).click();else if(label==='新手指南'){await gameAction(p.page,'牌桌帮助');await p.page.getByRole('button',{name:'查看新手指南',exact:true}).click();}else await gameAction(p.page,label);return p.page.getByRole('dialog',{name:label+(['游戏菜单','新手指南'].includes(label)?'':'面板'),exact:true});}
async function discard(p){const tile=p.page.locator('[data-tile-id]:visible').first();await tile.click();await p.page.getByRole('button',{name:'出这张',exact:true}).click();await wait(async()=> (await snap(p)).public.phase.kind==='DISCARD_RESPONSE');}
async function cleanup(){if(!room||!clients.length)return;for(const p of clients){await closeNavigation(p);if((await snap(p)).legalActions.includes('VOTE')){const skip=p.page.getByRole('button',{name:'收起亮相 · 看评审',exact:true});if(await skip.isVisible())await skip.click();await rejectReview(p.page);}}
 for(const p of clients){const back=p.page.getByRole('button',{name:'回到牌桌',exact:true});if(await back.isVisible())await back.click();}
 const e=await snap(clients[0]);if(e.public.phase.kind!=='ROOM_CLOSED'){const host=clients.find(p=>p.id===e.public.hostId);assert(host);const other=clients.find(p=>p!==host);if(!['LOBBY','ROUND_FINISHED'].includes(e.public.phase.kind)){await other.page.goto('about:blank');await wait(async()=> (await snap(host)).legalActions.includes('END_UNSCORED'));await host.page.getByRole('button',{name:'游戏菜单',exact:true}).waitFor();await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=> (await snap(host)).public.phase.kind==='ROUND_FINISHED');await other.page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await other.page.getByRole('button',{name:'游戏菜单',exact:true}).waitFor();await host.page.locator('.player-badge .presence-dot.online').waitFor({state:'attached'});}

 await open(other,'游戏菜单');
 for(let attempt=0;attempt<3;attempt++){
  if((await snap(host)).public.phase.kind==='ROOM_CLOSED')break;
  const failureStart=host.commandFailures.length;
  await closeNavigation(host);await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();
  await wait(async()=>{if((await snap(host)).public.phase.kind==='ROOM_CLOSED')return true;const failure=host.commandFailures.slice(failureStart).find(f=>f.kind==='CLOSE_ROOM');if(!failure)return false;if(failure.code!=='STALE_STATE_VERSION')throw Error(JSON.stringify(failure));return true;});
 }
 assert.equal((await snap(host)).public.phase.kind,'ROOM_CLOSED','cleanup exhausted fresh-state retries');await wait(async()=>!await other.page.getByRole('dialog',{name:'游戏菜单',exact:true}).isVisible());pass('room closure dismisses obsolete navigation');}
 for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}-${i}-identity.json`,{force:true});room=null;
}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},hasTouch:true,extraHTTPHeaders:{Origin:base}});await context.addInitScript(()=>{if(!/^https?:$/.test(location.protocol))return;localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));localStorage.setItem('hanz-music-v1',JSON.stringify({enabled:false,volume:.25}));});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',e=>errors.push(e.message));const p={context,page,commands:new Map(),commandFailures:[]};clients.push(p);
  page.on('websocket',socket=>{socket.on('framesent',({payload})=>{try{const data=JSON.parse(String(payload).slice(String(payload).indexOf('['))),c=data[1]?.command;if(c){p.commands.set(c.actionId,c.kind);if(c.kind==='CLOSE_ROOM')console.log('CLOSE sent',c.expectedStateVersion);}}catch{}});socket.on('framereceived',({payload})=>{try{const data=JSON.parse(String(payload).slice(String(payload).indexOf('['))),result=data[1]?.type==='COMMAND_RESULT'?data[1].result:null;if(result&&!result.ok){const failure={kind:p.commands.get(result.actionId),code:result.code};p.commandFailures.push(failure);console.log('COMMAND REJECTED',JSON.stringify(failure));}}catch{}});});
  if(i===0)for(const [w,h] of [[320,480],[390,844],[667,375],[1280,800]])await hallCheck(page,w,h);
  const r=await context.request.post(base+(room?`/api/rooms/${room}/join`:'/api/rooms'),{data:room?{roomId:room,requestedSeat:1,nickname:'AI · 稼轩拍桌子',actionId:randomUUID()}:{capacity:2,nickname:'AI · 东坡不想加班',actionId:randomUUID()}});assert(r.ok());room=(await r.json()).snapshot.public.roomId;p.id=(await snap(p)).private.playerId;
  await writeFile(`Codex-Temp/${prefix}-${i}-identity.json`,JSON.stringify(await context.storageState()),{mode:0o600});await page.goto(`${base}/room/${room}`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'准备好了',exact:true}).waitFor({timeout:30000});
 }
 await clients[0].page.locator('.seat-person-heading strong').filter({hasText:'AI · 稼轩拍桌子'}).waitFor();
 for(const p of clients)await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await clients[0].page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=> (await snap(clients[0])).public.phase.kind==='TURN_ACTION');
 for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]]){
  for(const p of clients){await p.page.setViewportSize({width,height});await p.page.evaluate(()=>document.fonts.ready);}
  const page=clients[0].page;await page.waitForTimeout(200);await audit(page);await page.screenshot({path:`${screens}/${prefix}-${width}-table.png`});
  await page.getByRole('button',{name:'同桌聊天',exact:true}).click();await page.getByRole('button',{name:'收起聊天',exact:true}).waitFor();await audit(page,'.chat-panel');
  await page.getByRole('button',{name:'表情包',exact:true}).click();await page.getByRole('button',{name:'表情包',exact:true}).click();
  await page.getByRole('textbox',{name:'聊天内容',exact:true}).fill('图标验收 '+width);await page.getByRole('button',{name:'发送聊天',exact:true}).click();await page.getByRole('button',{name:'收起聊天',exact:true}).click();
  await gameAction(page,'桌面涂鸦');await page.getByRole('group',{name:'选择画笔',exact:true}).waitFor();await audit(page,'.doodle-popover');await page.getByRole('button',{name:'完成 · 继续打牌',exact:true}).click();pass(`${width}x${height} chat send, sticker picker, drawing controls and table SVGs`);

  for(const label of ['游戏菜单','同桌音乐','牌组','牌局记录','牌桌帮助','新手指南','画面设置','房间设置','托管设置','整理句子']){
   const before=await snap(clients[0]),actor=clients.find(p=>p.id===before.public.phase.actorId),observer=clients.find(p=>p!==actor);assert(actor);
   const dialog=await open(observer,label);await dialog.waitFor();await audit(observer.page);
   const focus=label==='同桌音乐'?observer.page.getByRole('slider',{name:'音效音量',exact:true}):label==='新手指南'?observer.page.getByRole('button',{name:'关闭新手指南',exact:true}):label==='游戏菜单'?observer.page.getByRole('button',{name:'收起菜单',exact:true}):observer.page.getByRole('button',{name:'关闭面板',exact:true});
   if(label==='同桌音乐'){await observer.page.getByRole('button',{name:'音效与语音',exact:true}).click();await focus.fill('35');}
   await focus.focus();
   const scroll=await dialog.evaluate(el=>{el.scrollTop=23;return el.scrollTop;});
   await discard(actor);await observer.page.locator('.game-shell[data-phase="DISCARD_RESPONSE"]').waitFor();await observer.page.waitForTimeout(180);
   assert(await dialog.isVisible());assert(await dialog.evaluate(el=>el.matches(':modal')));assert(await focus.evaluate(el=>document.activeElement===el));assert.equal(await dialog.evaluate(el=>el.scrollTop),scroll);
   if(label==='同桌音乐'){assert.equal(await focus.inputValue(),'35');assert.equal(await observer.page.getByRole('button',{name:'音效与语音',exact:true}).getAttribute('aria-pressed'),'true');}
   const after=await snap(observer);assert.notEqual(after.public.phase.phaseId,before.public.phase.phaseId);assert.equal(after.public.discards.length,before.public.discards.length+1);assert(after.legalActions.includes('RESPOND'));const deadline=after.public.phase.deadline;
   if(label==='游戏菜单'||label==='同桌音乐')await observer.page.screenshot({timeout:30000,path:`${screens}/${prefix}-${width}-${label==='游戏菜单'?'menu':'music'}.png`});
   await closeNavigation(observer);if(label==='游戏菜单')await auditLatestDiscard(observer.page,width,height);
   const actorMenu=await open(actor,'游戏菜单');await observer.page.getByRole('button',{name:'摸',exact:true}).click();await actor.page.locator('.game-shell[data-phase="TURN_ACTION"]').waitFor();await actor.page.waitForTimeout(150);assert(await actorMenu.isVisible());const drawn=await snap(observer);assert.equal(drawn.public.phase.actorId,observer.id);assert.equal(drawn.public.wallRemaining,after.public.wallRemaining-1);assert.equal(drawn.private.hand.length,14);
   await closeNavigation(actor);pass(`${width}x${height} ${label}: discard preserves modal, focus, scroll; draw preserves menu`,{phaseBefore:before.public.phase.phaseId,phaseAfter:after.public.phase.phaseId,deadline});
  }
  // A mandatory review must still supersede navigation, including after prior rejected proposals.
  const state=await snap(clients[0]),actor=clients.find(p=>p.id===state.public.phase.actorId),observer=clients.find(p=>p!==actor),label=width===320?'游戏菜单':width===390?'同桌音乐':width===667?'新手指南':'牌局记录';
  const old=await open(observer,label);await actor.page.getByRole('button',{name:'申请胡牌',exact:true}).click();await actor.page.getByRole('button',{name:'确认，亮给大家看',exact:true}).click();await observer.page.getByRole('dialog',{name:'胡牌评审',exact:true}).waitFor();await wait(async()=>!await old.isVisible());assert(await observer.page.getByRole('dialog',{name:'胡牌评审',exact:true}).evaluate(el=>el.matches(':modal')));
  const skip=observer.page.getByRole('button',{name:'收起亮相 · 看评审',exact:true});if(await skip.isVisible())await skip.click();await audit(observer.page);await rejectReview(observer.page);await observer.page.locator('.review-verdict.lose').waitFor();await observer.page.waitForTimeout(800);await audit(observer.page);await observer.page.screenshot({path:`${screens}/${prefix}-${width}-review.png`});for(const p of clients)await p.page.getByRole('button',{name:'回到牌桌',exact:true}).click();assert.equal((await snap(actor)).public.history.at(-1).outcome,'REJECTED');pass(`${width}x${height}: new review supersedes ${label}, voting and return work`);
 }
 const observer=await browser.newPage({ignoreHTTPSErrors:true});await observer.goto(`${base}/watch/${room}`);await observer.getByRole('button',{name:'返回大厅',exact:true}).waitFor();await audit(observer);await observer.getByText('声音',{exact:true}).click();await audit(observer,'.spectator-audio');await observer.getByRole('button',{name:'返回大厅',exact:true}).click();await observer.close();pass('public-only spectator uses shared icons and return action');
 await cleanup();assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),checks,errors},null,2)+'\n');
}catch(e){for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({timeout:30000,path:`Codex-Temp/${prefix}-${i}-failed.png`}).catch(()=>{});throw e;}finally{try{await cleanup();}catch(e){console.error('cleanup requires saved private identity',e.message);}await browser.close();await server?.close();}
