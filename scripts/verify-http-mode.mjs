/** Real non-secure-context browser flow; localhost would hide HTTP API failures. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {networkInterfaces} from 'node:os';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createGameServer} from '../apps/server/server.ts';
import {hashAdminPassword} from '../apps/server/admin-auth.ts';
import {gameTool,gameAction} from './game-ui-tools.mjs';
const address=networkInterfaces().en0?.find(x=>x.family==='IPv4'&&!x.internal)?.address;
const base=process.env.PUBLIC_ORIGIN||`http://${address}:3198`;
if(!process.env.PUBLIC_ORIGIN&&!address)throw Error('A non-loopback LAN address is required');
const version=JSON.parse(await readFile('package.json')).version,prefix=process.env.EVIDENCE_PREFIX||`http-${version}-local`,password=randomUUID();
const server=process.env.PUBLIC_ORIGIN?null:createGameServer({dbPath:':memory:',publicOrigin:base,production:true,allowInsecureHttp:true,staticDir:resolve('dist/web'),automaticTimers:false,adminPasswordHash:await hashAdminPassword(password)});
if(server)await server.listen(3198,'0.0.0.0');
const browser=await chromium.launch({headless:true}),clients=[],checks=[],errors=[];let room;
await mkdir(`Codex-Temp/${prefix}`,{recursive:true});
async function snap(p){const r=await p.context.request.get(`${base}/api/rooms/${room}/snapshot`);assert(r.ok());return r.json();}
async function wait(fn){for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('state timeout');}
async function cleanup(){if(!room||!clients.length)return;const e=await snap(clients[0]),host=clients.find(p=>p.id===e.public.hostId)||clients[0];for(const p of clients)if(p!==host&&!p.page.isClosed())await p.page.close();if(e.public.phase.kind!=='ROOM_CLOSED'){
 await wait(async()=>{const s=await snap(host);return s.legalActions.includes('END_UNSCORED')||s.legalActions.includes('CLOSE_ROOM');});
 if((await snap(host)).legalActions.includes('END_UNSCORED')){await(await gameTool(host.page,'结束本局（不计分）')).click();await host.page.getByRole('button',{name:'确认结束',exact:true}).click();await wait(async()=>(await snap(host)).public.phase.kind==='ROUND_FINISHED');}
 await(await gameTool(host.page,'关闭房间')).click();await host.page.getByRole('button',{name:'确认关闭',exact:true}).click();await wait(async()=>(await snap(host)).public.phase.kind==='ROOM_CLOSED');}
 for(let i=0;i<clients.length;i++)await rm(`Codex-Temp/${prefix}/${i}-identity.json`,{force:true});room=null;
}
try{
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders:{Origin:base}});
  await context.addInitScript(()=>{localStorage.setItem('hanz-new-player-guide-v1','skip');localStorage.setItem('hanz-speech','off');localStorage.setItem('hanz-sfx-v1',JSON.stringify({enabled:false,volume:.55}));});
  const page=await context.newPage(),p={page,context};clients.push(p);page.on('pageerror',e=>errors.push(e.message));
  if(i===0){await page.goto(base);const secure=await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,clipboard:typeof navigator.clipboard}));assert.deepEqual(secure,{secure:false,uuid:'undefined',clipboard:'undefined'});checks.push({insecureContext:secure});
   await page.getByRole('button',{name:'创建房间',exact:true}).first().click();await page.getByLabel('一桌几人').selectOption('2');await page.locator('.room-create-form').getByRole('button',{name:'创建房间',exact:true}).click();await page.getByRole('button',{name:'准备好了',exact:true}).waitFor();room=new URL(page.url()).pathname.split('/').at(-1);
  }else{const r=await context.request.post(`${base}/api/rooms/${room}/join`,{data:{roomId:room,requestedSeat:1,nickname:'HTTP验收乙',actionId:randomUUID()}});assert(r.ok());await page.goto(`${base}/room/${room}`);await page.getByRole('button',{name:'准备好了',exact:true}).waitFor();}
  p.id=(await snap(p)).private.playerId;await context.storageState({path:`Codex-Temp/${prefix}/${i}-identity.json`});
  const cookies=await context.cookies();assert(cookies.some(c=>c.name==='hanz_mahjong_session_http'&&!c.secure&&c.httpOnly)||cookies.some(c=>c.name.endsWith('_http')&&!c.secure&&c.httpOnly));
 }
 checks.push({uiCreateWithUuidFallback:true,joinAndWebsocket:true});
 const [a,b]=clients;
 await a.page.getByRole('button',{name:'复制邀请链接',exact:true}).click();await a.page.getByRole('button',{name:'已复制邀请链接',exact:true}).waitFor();checks.push({httpClipboardFallback:true});
 for(const p of clients)await p.page.getByRole('button',{name:'准备好了',exact:true}).click();await a.page.getByRole('button',{name:'开始牌局',exact:true}).click();await wait(async()=>(await snap(a)).public.phase.kind==='TURN_ACTION');
 await gameAction(a.page,'同桌聊天');await a.page.getByRole('textbox',{name:'聊天内容'}).fill('HTTP 同桌聊天验收');await a.page.getByRole('button',{name:'发送聊天',exact:true}).click();await gameAction(b.page,'同桌聊天');await b.page.locator('.chat-history').getByText('HTTP 同桌聊天验收',{exact:true}).waitFor();checks.push({chatDeliveredToOtherPlayer:true});
 for(const p of clients)await p.page.getByRole('button',{name:'收起聊天',exact:true}).click();
 await a.page.reload();await a.page.getByRole('button',{name:'圈数与阶段规则'}).waitFor();assert.equal((await snap(a)).private.playerId,a.id);checks.push({sameBrowserRestore:true});
 if(server){await gameAction(a.page,'管理员入口');await a.page.getByLabel('管理员密码').fill(password);await a.page.getByRole('button',{name:'进入管理员模式',exact:true}).click();await wait(async()=>{const r=await a.context.request.get(base+'/api/admin/session');return(await r.json()).authenticated;});checks.push({adminHttpLogin:true});await a.page.getByRole('button',{name:'关闭管理员面板',exact:true}).click();}
 const e=await snap(a),actor=clients.find(p=>p.id===e.public.phase.actorId),next=clients.find(p=>p!==actor);assert.equal(e.public.rulesVersion,JSON.parse(await readFile('packages/contracts/rules.defaults.json')).rulesVersion);
 await actor.page.locator('[data-tile-id]:visible').first().click();await actor.page.getByRole('button',{name:'出这张',exact:true}).click();await next.page.getByRole('button',{name:'吃上家的字',exact:true}).waitFor();const response=await snap(next);assert(Math.abs(response.public.phase.deadline.endsAt-response.serverNow-15000)<1500);const bar=next.page.getByRole('progressbar',{name:'本阶段剩余时间'});assert(Number(await bar.getAttribute('aria-valuenow'))>85);
 await next.page.waitForTimeout(8500);assert.equal((await snap(next)).public.phase.kind,'DISCARD_RESPONSE');assert(await next.page.getByRole('button',{name:'吃上家的字',exact:true}).isEnabled());assert(Number(await bar.getAttribute('aria-valuenow'))<50);await next.page.screenshot({path:`docs/evidence/${prefix}-response.png`});
 await next.page.getByRole('button',{name:'吃上家的字',exact:true}).click();await wait(async()=>(await snap(next)).private.hand.length===14);assert.equal((await snap(next)).public.discards.at(-1).status,'CLAIMED');checks.push({response15Seconds:true,eatAfterOld8SecondDeadline:true,progressTracks15Seconds:true});
 await cleanup();assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}.json`,JSON.stringify({at:new Date().toISOString(),version,origin:base,browser:browser.version(),checks,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
}catch(e){for(let i=0;i<clients.length;i++)if(!clients[i].page.isClosed())await clients[i].page.screenshot({path:`Codex-Temp/${prefix}/failure-${i}.png`}).catch(()=>{});throw e;}finally{try{await cleanup();}catch(e){console.error('Cleanup failed; private identities retained:',e.message);}await browser.close();await server?.close();}
