/** Select a secondary action through the same visible game-tools entry a player uses. */
export async function gameTool(page,name){
 const button=page.getByRole('button',{name,exact:true});
 if(!await button.isVisible()&&!await page.getByRole('dialog',{name:'牌桌工具面板',exact:true}).isVisible()){
  const entry=page.getByRole('button',{name:'牌桌工具',exact:true});
  if(!await entry.isVisible())await page.getByRole('button',{name:'游戏菜单',exact:true}).click();
  await entry.click();
 }
 const section=page.locator('.tool-section:not([open])').filter({has:page.getByRole('button',{name,exact:true,includeHidden:true})});
 if(await section.count())await section.locator('summary').click();
 return button;
}

/** Follow the two-step objection UI; a draft selection is never itself a ballot. */
export async function rejectReview(page){
 const begin=page.getByRole('button',{name:'写的什么玩意',exact:true});
 if(await begin.isVisible())await begin.click();
 if(await page.locator('.review-tile[aria-pressed=true]').count()===0)await page.locator('.review-tile').first().click();
 await page.getByRole('button',{name:'确认，投反对票',exact:true}).click();
}
