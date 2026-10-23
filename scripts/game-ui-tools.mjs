/** Select a secondary action through the same visible game-tools entry a player uses. */
export async function gameTool(page,name){
 const button=page.getByRole('button',{name,exact:true});
 if(!await button.isVisible()&&!await page.getByRole('dialog',{name:'牌桌工具面板',exact:true}).isVisible())await page.getByRole('button',{name:'牌桌工具',exact:true}).click();
 return button;
}
