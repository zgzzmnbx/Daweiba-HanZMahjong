/** Select a secondary action through the same visible game-tools entry a player uses. */
export async function gameTool(page,name){
 const button=page.getByRole('button',{name,exact:true});
 if(!await button.isVisible()){
  const sound=/音效|语音|朗读/.test(name);
  const label=sound?'同桌音乐':/画质|二维|3D/.test(name)?'画面设置':/托管/.test(name)?'托管设置':/左移|右移|逗号|排列/.test(name)?'整理句子':'房间设置';
  const current=page.getByRole('button',{name:'关闭面板',exact:true});
  if(await current.isVisible())await current.click();
  await gameAction(page,label);
  if(sound)await page.getByRole('button',{name:'音效与语音',exact:true}).click();
 }
 return button;
}

export async function gameAction(page,name){
 const entry=page.getByRole('button',{name,exact:true});
 if(!await entry.isVisible())await page.getByRole('button',{name:'游戏菜单',exact:true}).click();
 await entry.click();
}

/** Follow the two-step objection UI; a draft selection is never itself a ballot. */
export async function rejectReview(page){
 const begin=page.getByRole('button',{name:'写的什么玩意',exact:true});
 if(await begin.isVisible())await begin.click();
 if(await page.locator('.review-tile[aria-pressed=true]').count()===0)await page.locator('.review-tile').first().click();
 await page.getByRole('button',{name:'确认，投反对票',exact:true}).click();
}

/** Music is always a direct header action, including portrait phones. */
export async function gameMusic(page){
 const entry=page.getByRole('button',{name:'同桌音乐',exact:true});
 await entry.waitFor();
 await entry.click();
 await page.getByRole('dialog',{name:'同桌音乐面板',exact:true}).waitFor();
}

/** Borrow a comma from the real period using the pointer path, never a draft API. */
export async function borrowComma(page,tileId){
 const a=await page.getByRole('button',{name:'句号牌',exact:true}).boundingBox(),b=await page.locator(`[data-tile-id="${tileId}"]`).boundingBox();
 if(!a||!b)throw Error('period and target character must both be visible');
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
}
