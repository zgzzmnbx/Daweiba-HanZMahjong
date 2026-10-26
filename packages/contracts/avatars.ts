/** Literary portraits v1. Original fictional interpretations, not historical likenesses. */
export const AVATARS = [
  {
    "id": "m-li-bai",
    "category": "男",
    "name": "李白",
    "nickname": "杯酒就胡"
  },
  {
    "id": "m-su-shi",
    "category": "男",
    "name": "苏轼",
    "nickname": "东坡不背锅"
  },
  {
    "id": "m-du-fu",
    "category": "男",
    "name": "杜甫",
    "nickname": "子美先别急"
  },
  {
    "id": "m-bai-juyi",
    "category": "男",
    "name": "白居易",
    "nickname": "乐天摸鱼中"
  },
  {
    "id": "m-tao-yuanming",
    "category": "男",
    "name": "陶渊明",
    "nickname": "五柳不加班"
  },
  {
    "id": "m-wang-wei",
    "category": "男",
    "name": "王维",
    "nickname": "摩诘佛系打"
  },
  {
    "id": "m-xin-qiji",
    "category": "男",
    "name": "辛弃疾",
    "nickname": "稼轩拍桌子"
  },
  {
    "id": "m-liu-yong",
    "category": "男",
    "name": "柳永",
    "nickname": "柳七慢慢来"
  },
  {
    "id": "m-lu-you",
    "category": "男",
    "name": "陆游",
    "nickname": "放翁还想胡"
  },
  {
    "id": "m-cao-zhi",
    "category": "男",
    "name": "曹植",
    "nickname": "子建才八斗"
  },
  {
    "id": "f-li-qingzhao",
    "category": "女",
    "name": "李清照",
    "nickname": "易安今天赢"
  },
  {
    "id": "f-shangguan-waner",
    "category": "女",
    "name": "上官婉儿",
    "nickname": "婉儿改卷中"
  },
  {
    "id": "f-cai-wenji",
    "category": "女",
    "name": "蔡文姬",
    "nickname": "文姬别催稿"
  },
  {
    "id": "f-xue-tao",
    "category": "女",
    "name": "薛涛",
    "nickname": "薛涛笺上见"
  },
  {
    "id": "f-yu-xuanji",
    "category": "女",
    "name": "鱼玄机",
    "nickname": "玄机有点多"
  },
  {
    "id": "f-zhu-shuzhen",
    "category": "女",
    "name": "朱淑真",
    "nickname": "淑真不认输"
  },
  {
    "id": "f-li-ye",
    "category": "女",
    "name": "李冶",
    "nickname": "季兰先落笔"
  },
  {
    "id": "f-ban-zhao",
    "category": "女",
    "name": "班昭",
    "nickname": "班昭有批注"
  },
  {
    "id": "f-zuo-fen",
    "category": "女",
    "name": "左棻",
    "nickname": "左棻不服卷"
  },
  {
    "id": "f-guan-daosheng",
    "category": "女",
    "name": "管道昇",
    "nickname": "道昇画个圈"
  },
  {
    "id": "a-cat",
    "category": "兽",
    "name": "东坡猫",
    "nickname": "东坡喵一声"
  },
  {
    "id": "a-fox",
    "category": "兽",
    "name": "太白狐",
    "nickname": "太白狐说话"
  },
  {
    "id": "a-panda",
    "category": "兽",
    "name": "子美熊",
    "nickname": "子美熊有理"
  },
  {
    "id": "a-crane",
    "category": "兽",
    "name": "摩诘鹤",
    "nickname": "摩诘鹤一下"
  },
  {
    "id": "a-rabbit",
    "category": "兽",
    "name": "易安兔",
    "nickname": "易安兔个胡"
  },
  {
    "id": "a-deer",
    "category": "兽",
    "name": "五柳鹿",
    "nickname": "五柳鹿过此"
  },
  {
    "id": "a-owl",
    "category": "兽",
    "name": "班昭鸮",
    "nickname": "班昭鸮得很"
  },
  {
    "id": "a-raccoon",
    "category": "兽",
    "name": "乐天浣熊",
    "nickname": "乐天浣个牌"
  },
  {
    "id": "a-tiger",
    "category": "兽",
    "name": "稼轩虎",
    "nickname": "稼轩虎一把"
  },
  {
    "id": "a-otter",
    "category": "兽",
    "name": "柳七獭",
    "nickname": "柳七獭着赢"
  }
] as const;
export type AvatarId=typeof AVATARS[number]['id'];
export const AVATAR_CATEGORIES=['男','女','兽'] as const;
export function isAvatarId(value:unknown):value is AvatarId{return typeof value==='string'&&AVATARS.some(a=>a.id===value);}
/** A deterministic fallback keeps legacy seats and AI stable without consuming game RNG. */
export function stableAvatarId(seed:string):AvatarId{let hash=2166136261;for(const char of seed){hash^=char.codePointAt(0)!;hash=Math.imul(hash,16777619);}return AVATARS[(hash>>>0)%AVATARS.length].id;}
export function avatarUrl(id:unknown,seed:string,size:'desktop'|'mobile'='desktop'){return (size==='mobile'?'/avatars/mobile-v1/':'/avatars/v1/')+(isAvatarId(id)?id:stableAvatarId(seed))+'.webp';}
export const LITERARY_NICKNAMES=AVATARS.map(a=>a.nickname);
