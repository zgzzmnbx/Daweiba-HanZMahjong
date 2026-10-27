import dictionary from './tile-pos.jieba-v0.42.1.json';
/** A fixed primary use for dealing, not a context-sensitive grammatical judgment. */
export type TilePartOfSpeech='noun'|'pronoun'|'verb'|'adjective'|'adverb'|'preposition'|'conjunction'|'particle'|'numeral'|'classifier'|'interjection'|'onomatopoeia'|'direction'|'time'|'auxiliary'|'morpheme'|'other';
/** Common polysemous faces use their ordinary standalone meaning instead of surname/measure tags.
 * One category per face; auxiliaries and bound morphemes are never used as S/V/O seeds. */
const groups:Partial<Record<TilePartOfSpeech,string>>={
 noun:'天日月云儿家口花树物影河海山水风雨春夏秋冬星光夜梦人心手眼钱酒菜瓜烟火气头脑嘴脸皮骨腿肚鸡鸭鹅狗猫牛马羊猪狼龟蚌妈爹爷孙王鬼神男女人事话字语名路门城国球刀帽蛋屎屁粪货账坑槽浪渣滓囊窝肠肝肾种色病精毛丝麻谱意样模本德耻觉',
 pronoun:'我你他她它您咱俺谁这那哪啥己',
 verb:'爱吃喝看听说想做打杀跑飞来去回走坐睡醒哭笑活喜恋生养找认知算配当服忍跪舔装滚骂吹操靠欠揍扯放叫闭搞作犯耍怼喷骗丢逼住冒关开抽拍卖补弃防失死吊缺离撑惯迷无让损赖胡',
 adjective:'美好坏大大小多少冷热快慢白红黑明丑老年轻饱痛狂纯笨蠢傻贱臭烂破怂恶骚痴呆疯猥琐浑衰瘪吝满硬厚远淡欢',
 adverb:'不也就都又还再只才太很最总真却别瞎怎自乱极',
 preposition:'把被在为从向与以因比对跟给',
 conjunction:'和而但或所',
 particle:'的地得了着过吗吧呢嘛啊呀么之',
 numeral:'一二三四五六七八九十几',
 classifier:'个张套批',
 direction:'东南西北前后左右上下里外中',
 auxiliary:'能会可',
 morpheme:'们垃圾犊畜牲尼玛氓俄',
};
const overrides=new Map<string,TilePartOfSpeech>();
for(const [pos,chars]of Object.entries(groups))for(const char of chars){if(overrides.has(char)&&overrides.get(char)!==pos)throw new Error(`DUPLICATE_POS_OVERRIDE: ${char}`);overrides.set(char,pos as TilePartOfSpeech);}
export function tilePartOfSpeech(char:string):TilePartOfSpeech{
 const preferred=overrides.get(char);if(preferred)return preferred;
 const tag=(dictionary as Record<string,string>)[char];if(typeof tag!=='string')return 'other';
 if(tag.startsWith('n')||tag==='vn'||tag==='an'||tag==='s')return 'noun';
 if(tag.startsWith('v'))return 'verb';if(tag.startsWith('r'))return 'pronoun';
 if(tag.startsWith('a')||tag==='b'||tag==='z')return 'adjective';if(tag.startsWith('d'))return 'adverb';
 if(tag.startsWith('u')||tag==='y')return 'particle';if(tag.startsWith('m'))return 'numeral';if(tag==='q')return 'classifier';
 if(tag==='p')return 'preposition';if(tag==='c')return 'conjunction';if(tag==='e')return 'interjection';if(tag==='o')return 'onomatopoeia';
 if(tag==='f')return 'direction';if(tag.startsWith('t'))return 'time';return 'morpheme';
}
export const isNominalTile=(char:string)=>{const pos=tilePartOfSpeech(char);return pos==='noun'||pos==='pronoun';};
