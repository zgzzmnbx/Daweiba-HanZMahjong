/** Explicit UI fixtures: validates actual Three.js tint/motion and DOM behavior, not live server timing. */
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const vite=await createServer({configFile:resolve('vite.config.ts'),server:{host:'127.0.0.1',port:5128,strictPort:true}});await vite.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
try{
 for(const [mode,width,height,reducedMotion] of [['3D',1440,900,'no-preference'],['DOM',390,844,'no-preference'],['3D-reduced',1440,900,'reduce'],['DOM-reduced',390,844,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const base=Date.now();await page.clock.setFixedTime(new Date(base));await page.goto('http://127.0.0.1:5128/dev/baseline');await page.locator('.canvas-host canvas').waitFor();
  assert.equal(await page.locator('.turn-urgent').count(),0);
  await page.clock.setFixedTime(new Date(base+50500));await page.locator('.turn-urgent').waitFor({state:'attached'});
  let details;
  if(mode.startsWith('3D')){
   const sample=()=>page.evaluate(()=>[...window.__tableRenderer.own.values()].filter(n=>n.kind==='tile').map(n=>({x:n.mesh.position.x,target:n.target.x,color:n.mesh.children[0].material.color.getHex()})));
   await page.waitForFunction(()=>{const own=[...window.__tableRenderer.own.values()].filter(n=>n.kind==='tile');return own.length===14&&own.every(n=>n.mesh.children[0].material.color.getHex()===0xf47b73);});
   const first=await sample();assert.equal(first.length,14);assert(first.every(n=>n.color===0xf47b73));
   await page.waitForTimeout(90);const second=await sample();const moves=first.some((n,i)=>Math.abs(n.x-second[i].x)>.001);
   assert.equal(moves,reducedMotion!=='reduce');details={color:'f47b73',tiles:first.length,shakes:moves};
  }else{
   const appearance=await page.locator('.sentence-rack .tile').first().evaluate(el=>({color:getComputedStyle(el).backgroundColor,animation:getComputedStyle(el).animationName}));
   assert.equal(appearance.color,'rgb(244, 123, 115)');assert.equal(appearance.animation,reducedMotion==='reduce'?'none':'turn-tile-shake');details=appearance;
  }
  const viewport=await page.evaluate(()=>({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight}));assert(viewport.scrollW<=width+1&&viewport.scrollH<=height+1);
  await page.screenshot({path:`docs/evidence/turn-attention-${mode}.png`,fullPage:false});
  await page.clock.setFixedTime(new Date(base+61000));await page.waitForFunction(()=>!document.querySelector('.turn-urgent'));
  assert.equal(await page.evaluate(()=>window.__lastDemoCommand??null),null);
  checks.push({mode,details,viewport,expiredWarningCleared:true});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile('docs/evidence/turn-attention-results.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'real Chrome dev fixtures; Date-only clock override preserves native animations and Socket timers; authority timing tested separately',checks,errors},null,2)+'\n');console.log('PASS',checks.length,'real warning paths');
}finally{await browser.close();await vite.close();}
