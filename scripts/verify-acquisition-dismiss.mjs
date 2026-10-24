/** UI-only dev fixtures, separate from authoritative multiplayer validation. */
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const vite=await createServer({configFile:resolve('vite.config.ts'),server:{host:'127.0.0.1',port:5127,strictPort:true}});
await vite.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],errors=[];
await mkdir('Codex-Temp',{recursive:true});
await mkdir('docs/evidence',{recursive:true});
let page;
try{
 for(const mode of ['3D hover','DOM hover','keyboard focus','touch tap']){
  const mobile=mode!=='3D hover',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mode==='touch tap',isMobile:mode==='touch tap'});
  page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.mouse.move(0,0);await page.goto('http://127.0.0.1:5127/dev/baseline');
  const tile=page.locator('[data-acquired]').first();await tile.waitFor();
  const id=await tile.getAttribute('data-tile-id');assert(id);
  if(mode==='keyboard focus')await tile.focus();
  else if(mode==='touch tap'){const r=await tile.boundingBox();await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);}
  else await tile.hover();
  await page.waitForFunction(()=>!document.querySelector('[data-acquired]'));
  assert.equal(await page.locator(`[data-tile-id="${id}"]`).count(),1);
  assert.equal(await page.evaluate(()=>window.__lastDemoCommand??null),null,'Acknowledgement must not submit a game command');
  const geometry=await page.evaluate(()=>({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight}));
  assert(geometry.scrollW<=geometry.w+1&&geometry.scrollH<=geometry.h+1,'Game must remain within viewport');
  await page.screenshot({path:`docs/evidence/acquisition-dismiss-${mode.replaceAll(' ','-')}.png`,fullPage:false});
  checks.push({mode,tileId:id,status:'PASS',geometry});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile('docs/evidence/acquisition-dismiss-results.json',JSON.stringify({at:new Date().toISOString(),status:'PASS',scope:'real Chrome interaction against explicit dev fixtures, not multiplayer acceptance',checks,errors},null,2)+'\n');
 console.log('PASS',checks.length,'acquisition acknowledgement UI paths');
}catch(error){await page?.screenshot({path:'Codex-Temp/acquisition-dismiss-failure.png'}).catch(()=>{});throw error;}
finally{await browser.close();await vite.close();}
