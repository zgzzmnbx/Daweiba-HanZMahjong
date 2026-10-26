/** Read-only regression: card contents, not just outer slots, must fit at scroll edges. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createGameServer} from '../apps/server/server.ts';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const base=process.env.PUBLIC_ORIGIN??'http://127.0.0.1:3183';
const prefix=process.env.EVIDENCE_PREFIX??'hall-clip-1.30.8-local';
const server=process.env.PUBLIC_ORIGIN?null:createGameServer({dbPath:':memory:',publicOrigin:base,staticDir:resolve('dist/web')});
if(server)await server.listen(3183);
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']});
const page=await browser.newPage({ignoreHTTPSErrors:true});
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function bounds(){return page.locator('.hall-table').evaluateAll(cards=>cards.map(card=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
 return {card:rect(card),slot:rect(card.parentElement),children:[...card.querySelectorAll('.hall-table-top strong,.hall-empty,.hall-scene,.hall-seats,.hall-table-action,.hall-table-capacity')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({name:e.className||e.tagName,...rect(e)}))};
}));}
function checkContents(data,label){for(const [i,{card,slot,children}] of data.entries()){
 assert(card.top>=slot.top-1&&card.bottom<=slot.bottom+1,`${label} card ${i+1} outside slot: ${JSON.stringify({card,slot})}`);
 for(const r of children)assert(r.top>=card.top+1&&r.bottom<=card.bottom-1&&r.left>=card.left&&r.right<=card.right,`${label} card ${i+1} clipped ${r.name}: ${JSON.stringify({card,r})}`);
}}
try{
 await mkdir('docs/evidence',{recursive:true});await page.goto(base);await page.locator('.hall-tables[aria-busy=false]').waitFor();await page.locator('.hall-scene img').first().evaluate(i=>i.decode());await page.evaluate(()=>document.fonts.ready);
 for(const [width,height] of [[1280,600],[1366,768],[1280,800],[1000,600],[700,500],[667,375],[320,480],[390,844]]){
  await page.setViewportSize({width,height});await page.mouse.move(0,0);await page.waitForFunction(()=>Math.abs(document.querySelector('#root').getBoundingClientRect().width-innerWidth)<1);await page.waitForTimeout(250);
  const normal=await bounds();checkContents(normal,`${width} normal`);
  for(const index of [0,5]){
   const card=page.locator('.hall-table').nth(index);await card.scrollIntoViewIfNeeded();await card.hover();await page.waitForTimeout(220);checkContents(await bounds(),`${width} hover`);
   await card.focus();await page.waitForTimeout(50);checkContents(await bounds(),`${width} focus`);
   const visible=await card.evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.hall-tables').getBoundingClientRect();return {top:a.top,bottom:a.bottom,listTop:b.top,listBottom:b.bottom};});
   assert(visible.top>=visible.listTop-1&&visible.bottom<=visible.listBottom+1,JSON.stringify({width,index,visible}));
   await card.click({trial:true});
  }
  await page.locator('.hall-tables').evaluate(e=>e.scrollTop=0);await page.locator('.hall-table').first().hover();await page.waitForTimeout(220);
  const documentBounds=await page.evaluate(()=>({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}));assert(documentBounds.w<=width&&documentBounds.h<=height);
  await page.screenshot({path:`docs/evidence/${prefix}-${width}x${height}.png`});checks.push({width,height,normal,hoverAndFocus:true,firstAndLastFullyVisible:true});console.log('PASS',width,height);
 }
 assert.deepEqual(errors,[]);await writeFile(`docs/evidence/${prefix}.json`,JSON.stringify({at:new Date().toISOString(),version:JSON.parse(await readFile('package.json')).version,origin:base,browser:browser.version(),scope:'read-only lobby; no room mutations; real hover, focus and scroll',checks,errors},null,2)+'\n');
}finally{await browser.close();await server?.close();}
