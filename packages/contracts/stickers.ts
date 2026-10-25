/** Original, self-hosted sticker assets. Never accept a client-supplied URL. */
export const CHAT_STICKERS = [
 {id:'proud',label:'得意一下'}, {id:'giggle',label:'偷偷乐'},
 {id:'confused',label:'啥意思'}, {id:'applause',label:'妙啊'},
 {id:'sad',label:'委屈巴巴'}, {id:'hurry',label:'快出牌'},
] as const;
export type StickerId=typeof CHAT_STICKERS[number]['id'];
export const chatSticker=(id:unknown)=>CHAT_STICKERS.find(s=>s.id===id);
export const stickerUrl=(id:unknown)=>chatSticker(id)?`/stickers/v1/${id}.webp`:null;
