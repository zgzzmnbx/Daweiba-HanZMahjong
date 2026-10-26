/** Asset loading does not move or disable the live lobby. No rooms are mutated. */
import assert from 'node:assert/strict';import {chromium} from 'playwright';import {createGameServer} from '../apps/server/server.ts';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3182',prefix=process.env.EVIDENCE_PREFIX??'hall-art-1.30.7-assets',local=!process.env.PUBLIC_ORIGIN;
const server=local?createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')}):null;if(server)await server.listen(3182);
const browser=await chromium.launch({headless:true}),checks=[];await mkdir('docs/evidence',{recursive:true});
try{
 for(const [width,height,expected] of [[390,844,'480'],[1280,800,'960']]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,ignoreHTTPSErrors:true}),page=await context.newPage(),requests=[];page.on('request',r=>{if(r.url().includes('/lobby/v1/'))requests.push(r.url());});
  await page.goto(base);await page.locator('.hall-tables[aria-busy=false]').waitFor();await page.locator('.hall-scene img').first().evaluate(i=>i.decode());
  const images=await page.locator('.hall-scene img').evaluateAll(es=>es.map(i=>({src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0,fit:getComputedStyle(i).objectFit})));assert.equal(images.length,6);assert(images.every(i=>i.loaded&&i.src.endsWith(`table-${expected}.webp`)&&i.fit==='contain'));assert.equal(requests.length,1,'six tables share one asset request');
  await page.mouse.move(0,0);await page.screenshot({path:`docs/evidence/${prefix}-${width}.png`});checks.push({width,height,expected,requests:requests.length,images});await context.close();
 }
 for(const fail of [false,true]){
  const context=await browser.newContext({viewport:{width:320,height:480},ignoreHTTPSErrors:true}),page=await context.newPage();let release;
  const gate=new Promise(r=>release=r);await page.route('**/lobby/v1/**',async r=>{await gate;if(fail)await r.abort();else await r.continue();});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.hall-tables[aria-busy=false]').waitFor();await page.mouse.move(0,0);await page.waitForTimeout(300);const before=await page.locator('.hall-scene').first().boundingBox();await page.locator('.hall-table').first().click({trial:true});await page.mouse.move(0,0);await page.waitForTimeout(250);release();
  if(fail){await page.locator('.hall-art-fallback').first().waitFor();assert.equal(await page.locator('.hall-art-fallback').count(),6);}else await page.locator('.hall-scene img').first().evaluate(i=>i.decode());
  const after=await page.locator('.hall-scene').first().boundingBox();for(const key of ['x','y','width','height'])assert(Math.abs(after[key]-before[key])<.5,JSON.stringify({after,before}));await page.locator('.hall-table').last().scrollIntoViewIfNeeded();await page.locator('.hall-table').last().click({trial:true});
  checks.push({mode:fail?'download failure':'delayed download',geometryStable:true,entryReachable:true});await context.close();
 }
 await writeFile(`docs/evidence/${prefix}.json`,JSON.stringify({at:new Date().toISOString(),version:JSON.parse(await readFile('package.json')).version,origin:base,browser:browser.version(),scope:'read-only lobby; loading and failure simulated with browser routes',checks},null,2)+'\n');console.log('PASS',checks.length,'asset loading checks');
}finally{await browser.close();await server?.close();}
