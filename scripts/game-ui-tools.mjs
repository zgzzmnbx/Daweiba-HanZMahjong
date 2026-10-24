/** Select a secondary action through the same visible game-tools entry a player uses. */
export async function gameTool(page,name){
 const button=page.getByRole('button',{name,exact:true});
 if(!await button.isVisible()){
  const label=/音效|语音|朗读/.test(name)?'声音设置':/画质|二维|3D/.test(name)?'画面设置':/托管/.test(name)?'托管设置':/左移|右移|逗号|排列/.test(name)?'整理句子':'房间设置';
  const current=page.getByRole('button',{name:'关闭面板',exact:true});
  if(await current.isVisible())await current.click();
  await gameAction(page,label);
 }
 return button;
}

export async function gameAction(page,name){
 const entry=page.getByRole('button',{name,exact:true});
 if(['声音设置','画面设置','托管设置','房间设置','整理句子'].includes(name)&&!await entry.isVisible())await gameAction(page,'游戏设置');
 else if(!await entry.isVisible())await page.getByRole('button',{name:'游戏菜单',exact:true}).click();
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
