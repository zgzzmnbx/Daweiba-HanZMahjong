/** Projection/DOM layout evidence uses explicit fixtures; live commands are checked separately. */
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {gameTool} from './game-ui-tools.mjs';
const prefix=process.env.EVIDENCE_PREFIX||'seat-directions-1.30.6';
const vite=await createServer({configFile:resolve('vite.config.ts'),server:{host:'127.0.0.1',port:5133,strictPort:true}});await vite.listen();
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('docs/evidence',{recursive:true});
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>2;
try{
for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]])for(const count of [2,3,4,5,6]){
 await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:5133/dev/baseline?n=${count}&phase=TURN_ACTION`);await page.locator('.player-badge').first().waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
 for(const expanded of [true,false]){
  if(expanded!==await page.locator('.sentence-rack').isVisible())await page.getByRole('button',{name:expanded?'放大麻将':'收起整理区',exact:true}).click();await page.waitForTimeout(250);
  const r=await page.evaluate(()=>{const box=e=>e.getBoundingClientRect().toJSON();return{badges:[...document.querySelectorAll('.player-badge')].map(e=>({...box(e),seat:Number(e.dataset.seat),label:e.getAttribute('aria-label'),pointer:getComputedStyle(e).pointerEvents,portrait:box(e.querySelector('.player-portrait'))})),stage:box(document.querySelector('.table-stage')),vp:box(document.querySelector('.viewport')),actions:[...document.querySelectorAll('.table-action-dock button:not(:disabled),.projected-tile,.sentence-rack [data-tile-id]')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{label:e.textContent,hit:!!hit&&e.contains(hit)};}),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};});
  assert.equal(r.badges.length,count-1);assert(r.scroll[0]<=width&&r.scroll[1]<=height);
  for(const b of r.badges){assert.equal(b.pointer,'none');assert(b.portrait.width>=30);assert(b.x>=0&&b.right<=width+1&&b.y>=r.stage.y-1&&b.bottom<=r.stage.bottom+1,JSON.stringify({width,height,count,expanded,b,stage:r.stage}));}
  for(let i=0;i<r.badges.length;i++)for(let j=i+1;j<r.badges.length;j++)assert(!overlap(r.badges[i],r.badges[j]),JSON.stringify({width,height,count,expanded,badges:r.badges}));
  const mid=r.vp.x+r.vp.width/2;
  if(count>=3){const prev=r.badges.find(b=>b.label.includes('，上家，')),next=r.badges.find(b=>b.label.includes('，下家，'));assert(prev.x+prev.width/2<mid&&next.x+next.width/2>mid,'upstream left, downstream right');}
  if(count%2===0){const opposite=r.badges.find(b=>b.label.includes('，对家，'));assert(Math.abs(opposite.x+opposite.width/2-mid)<2);if(count>2)assert(opposite.y<r.badges.find(b=>b.label.includes('，下家，')).y,'opposite above downstream');}
  assert(r.actions.every(b=>b.hit),JSON.stringify({width,height,count,expanded,actions:r.actions}));
  checks.push({width,height,count,expanded,...r});console.log('PASS',width,height,count,expanded);
  if(expanded&&[4,6].includes(count))await page.screenshot({path:`docs/evidence/${prefix}-${count}p-${width}.png`});
 }
}
for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]])for(const phase of ['DISCARD_RESPONSE','HU_COMPOSE']){
 await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:5133/dev/baseline?n=6&phase=${phase}`);await page.locator('.player-badge').first().waitFor();await page.waitForTimeout(250);
 const controls=await page.locator('.table-action-dock button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {text:e.textContent,...r.toJSON(),hit:!!hit&&e.contains(hit)};}));
 assert(controls.length>=2);for(const b of controls)assert(b.hit&&b.x>=0&&b.right<=width&&b.y>=0&&b.bottom<=height,JSON.stringify(controls));
 if(width<700&&height>width){const bar=await page.locator('.portrait-action-bar').boundingBox(),table=await page.locator('.table-stage').boundingBox(),hand=await page.locator('.hand-zone').boundingBox();assert(bar.y>=table.y+table.height-1&&bar.y+bar.height<=hand.y+1);}
 checks.push({width,height,count:6,phase,controls});console.log('PASS response/compose',width,height,phase);
}
for(const [width,height] of [[320,480],[390,844],[667,375],[1280,800]]){
 await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:5133/dev/baseline?n=6&phase=TURN_ACTION');await (await gameTool(page,'二维模式')).click();if(await page.getByRole('button',{name:'关闭面板',exact:true}).isVisible())await page.getByRole('button',{name:'关闭面板',exact:true}).click();await page.locator('.fallback-table').waitFor();await page.waitForTimeout(250);
 const badges=await page.locator('.player-badge').evaluateAll(es=>es.map(e=>({...e.getBoundingClientRect().toJSON(),label:e.getAttribute('aria-label')})));
 for(const b of badges)assert(b.x>=0&&b.right<=width&&b.y>=0&&b.bottom<=height,JSON.stringify(b));
 for(let i=0;i<badges.length;i++)for(let j=i+1;j<badges.length;j++)assert(!overlap(badges[i],badges[j]));
 checks.push({width,height,count:6,mode:'2D',badges});console.log('PASS fallback',width,height);
}
assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}-results.json`,JSON.stringify({at:new Date().toISOString(),browser:browser.version(),scope:'dev fixtures; real WebGL, bounds, directions and pointer hit tests',checks,errors},null,2)+'\n');
}catch(e){await page.screenshot({path:`Codex-Temp/${prefix}-failure.png`});throw e;}finally{await browser.close();await vite.close();}
