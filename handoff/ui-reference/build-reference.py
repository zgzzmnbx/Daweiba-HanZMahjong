#!/usr/bin/env python3
"""Editable EnglishMahjong-derived visual studies; not a running game.
Pass a full Noto Sans CJK SC OTF to rebuild the bundled subset font.
"""
from pathlib import Path
from html import escape
import base64, json, sys
ROOT=Path(__file__).resolve().parent
C=dict(bg='#19110C',cream='#F4EBD4',muted='#B6AD93',gold='#FFD24A',cyan='#4FD1FF',felt='#1B654D',wood='#80512D',ink='#373329',panel='#0E251D',coral='#EC9B80')

def rect(x,y,w,h,fill,rx=0,stroke=None,sw=1,extra=''):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+f' {extra}/>'
def text(x,y,t,size=16,color=None,weight=400,anchor='start',extra=''):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color or C["cream"]}" font-weight="{weight}" text-anchor="{anchor}" {extra}>{escape(str(t))}</text>'
def line(x1,y1,x2,y2,color='#B18C59',width=1,extra=''):
 return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}" {extra}/>'
def circle(x,y,r,fill,stroke=None,sw=1):
 return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+'/>'
def poly(points,fill,stroke=None,sw=1,extra=''):
 return '<polygon points="'+' '.join(f'{x},{y}' for x,y in points)+'" fill="'+fill+'"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+f' {extra}/>'
def pill(x,y,w,label,fill=None,color=None,h=32,size=13,stroke=None):
 return rect(x,y,w,h,fill or C['panel'],h/2,stroke)+text(x+w/2,y+h/2+size*.35,label,size,color or C['cream'],500,'middle')
def han_tile(x,y,w,h,ch,selected=False,new=False,quiet=False,size=None,label_new=True):
 edge=C['gold'] if selected else C['cyan'] if new else '#C7BD91';d=7 if w>=60 else 5
 s=rect(x-1,y+d+5,w+3,h,'#050D09',8,extra='opacity=".23"')
 s+=rect(x,y+d,w,h,'url(#tileBase)',7,edge,1)+rect(x,y,w,h,'url(#ivory)',7,edge,2 if selected or new else 1)
 s+=rect(x+3,y+3,w-6,h-7,'none',5,'#FFFCED',1)+line(x+7,y+h-5,x+w-7,y+h-5,'#D6CBA6',1)
 fs=size or (38 if w>=60 else 28 if w>=44 else max(12,w*.56))
 s+=text(x+w/2,y+h/2+fs*.34,ch,fs,'#39372F' if not quiet else '#686459',500,'middle')
 if selected:s+=line(x+5,y+h+6,x+w-5,y+h+6,C['gold'],3)
 if new and label_new:s+=pill(x+w/2-21,y-19,42,'新摸','#123C36',C['cyan'],22,12,C['cyan'])
 return s
def comma_marker(cx,cy,r=11):
 # Center the visible punctuation shape; full-width glyph bearings vary by font.
 s=circle(cx,cy,r,'#153D31',C['gold'],1)
 return s+f'<path d="M {cx-2} {cy-5} C {cx+5} {cy-6} {cx+6} {cy+1} {cx+2} {cy+5} L {cx-2} {cy+8} L {cx-4} {cy+5} C {cx} {cy+3} {cx+1} {cy+1} {cx-2} {cy} Z" fill="{C["gold"]}"/>'
def backs(cx,cy,count=13,w=15,h=24,angle=0):
 total=count*(w+1)-1;s=f'<g transform="translate({cx} {cy}) rotate({angle})">'
 for i in range(count):
  x=-total/2+i*(w+1)
  s+=rect(x,-h/2+4,w,h,'#DED6A6',2,'#B5AE84',.5)+rect(x,-h/2,w,h,'url(#goldBack)',2,'#F2D260',.7)+line(x+2,-h/2+3,x+w-2,-h/2+3,'#FFEA88',.8)
 return s+'</g>'
def small_discards(cx,cy,chars,angle=0):
 total=len(chars)*28-3
 return f'<g transform="translate({cx} {cy}) rotate({angle})">'+''.join(han_tile(-total/2+i*28,-18,25,33,ch,quiet=True,size=15) for i,ch in enumerate(chars))+'</g>'
def seat(cx,cy,name,initial,relation='',status='在线',active=False,mini=False):
 r=24 if mini else 31;s=circle(cx,cy+3,r+5,'#090C08')
 s+=circle(cx,cy,r+3,'url(#avatarRing)',C['gold'] if active else '#896C46',1.4)+circle(cx,cy,r,'#244B3B')
 s+=text(cx,cy+9,initial,24 if not mini else 20,C['cream'],500,'middle')
 s+=circle(cx+r*.75,cy+r*.7,5,C['gold'] if active else C['cyan'] if '连' in status else '#8FAF83','#15251B',2)
 s+=pill(cx-70,cy+r+13,140,name+(' · '+relation if relation else ''),'#111C14',C['cream'],29,13,'#6D5B3B')
 s+=text(cx,cy+r+62,'13张 · '+status,12,C['cyan'] if '连' in status else C['muted'],anchor='middle')
 return s
def topbar(n):
 s=rect(0,0,1440,70,'#100C09',extra='opacity=".65"')
 s+=rect(28,20,91,34,'none',9,'#75634C')+text(73.5,43,'← 返回',14,C['cream'],500,'middle')
 s+=text(145,44,'字间',24,C['cream'],600)+text(204,44,'文字麻将',13,C['muted'])
 s+=pill(1021,22,146,'好友房 · 8K2M7','#211B13',C['muted'],31,12,'#5F513D')
 s+=pill(1180,22,79,f'{n} 人桌','#211B13',C['cream'],31,13,'#5F513D')
 return s+text(1290,43,'规则',13,C['muted'])+text(1378,43,'设置',13,C['muted'],anchor='end')
def table_surface():
 s='<ellipse cx="720" cy="799" rx="662" ry="137" fill="#050805" opacity=".55"/>'
 s+=poly([(268,205),(1172,205),(1430,888),(10,888)],'url(#woodTop)','#8E633D',1)
 s+=poly([(10,888),(1430,888),(1430,911),(10,911)],'url(#woodFront)','#4B2C17',1)
 s+=poly([(288,223),(1152,223),(1390,862),(50,862)],'#49351E')
 s+=poly([(295,230),(1145,230),(1380,853),(60,853)],'url(#felt)','#246A4F',1)
 s+=poly([(295,230),(1145,230),(1380,853),(60,853)],'url(#feltTexture)',extra='opacity=".12"')
 s+=poly([(319,248),(1121,248),(1346,829),(94,829)],'none','#68A78A',1,extra='opacity=".2"')
 for p in [[(513,282),(927,282),(939,302),(501,302)],[(261,447),(286,447),(232,631),(201,631)],[(1154,447),(1179,447),(1239,631),(1208,631)],[(411,701),(1029,701),(1041,729),(399,729)]]:s+=poly(p,'#0A4A36',extra='opacity=".23"')
 return s
def center_board():
 s=poly([(628,421),(812,421),(828,554),(612,554)],'url(#woodTop)','#9A7348',2)
 s+=poly([(641,433),(799,433),(811,540),(629,540)],'url(#centerScreen)','#0A140C',1)
 s+=text(720,461,'第 3 局',15,C['muted'],500,'middle')+text(720,495,'81',36,C['cream'],600,'middle')+text(720,520,'牌山剩余',12,'#A4BDAA',400,'middle')
 s+=line(643,534,798,534,C['gold'],3)+pill(622,573,196,'你的回合 · 42秒','#112E23',C['gold'],35,15,'#928449')
 return s+han_tile(867,440,49,67,'猫',size=29)+text(891,535,'最近弃字',11,'#B9CCB9',anchor='middle')
def own_hand():
 s=text(206,707,'大尾巴 · 你',14,C['cream'],500)+text(1234,707,'14 字 · 吃牌机会 3/3',12,C['muted'],anchor='end')
 chars='今天下班以后我想和你一起吃饭';x0=206;step=74
 for i,ch in enumerate(chars):s+=han_tile(x0+i*step,742-(9 if i==2 else 0),64,86,ch,selected=i==2,new=i==13)
 s+=comma_marker(x0+5*step+69,817)
 s+=rect(38,931,1364,57,'#15150F',14,'#635235',1)+text(60,966,'逗号 1/3',13,C['muted'])
 for i in range(3):s+=rect(144+i*47,938,40,44,'#2B3222' if i==0 else '#253C2D',9,'#5B6845',1)+text(164+i*47,967,'，',24,'#6F7760' if i==0 else C['gold'],600,'middle')
 s+=text(298,966,'拖动排字 · 点逗号后选字放置',12,C['muted'])
 s+=rect(786,938,137,44,'#253C2D',9,'#647956')+text(854.5,966,'整理句子',13,C['cream'],500,'middle')
 s+=rect(935,938,132,44,'#251E13',9,'#9B8656')+text(1001,966,'出牌',14,C['cream'],500,'middle')
 return s+rect(1080,938,298,44,'url(#goldButton)',9)+text(1229,966,'申请胡牌',14,'#302615',600,'middle')
def desktop(n):
 s=topbar(n)+table_surface()
 if n==4:
  s+=seat(720,116,'小陈','陈','对家')+seat(151,364,'阿白','白','上家')+seat(1289,364,'小林','林','下家')
  s+=backs(720,268,13,21,30)+backs(299,487,13,17,29,-72)+backs(1141,487,13,17,29,72)
  s+=small_discards(720,360,'雨月山')+small_discards(517,474,'走茶',-8)+small_discards(977,559,'家',8)
 else:
  s+=seat(720,111,'小陈','陈')+seat(384,131,'可可','可',status='重连 12秒',mini=True)+seat(1056,131,'阿喵','喵',status='AI托管',mini=True)
  s+=seat(147,497,'阿白','白','上家')+seat(1293,497,'小林','林','下家')
  s+=backs(720,266,13,15,23)+backs(443,316,13,14,24,-21)+backs(997,316,13,14,24,21)+backs(295,563,13,14,24,-68)+backs(1145,563,13,14,24,68)
  s+=small_discards(719,358,'雨月')+small_discards(491,417,'走茶',-12)+small_discards(994,417,'家',12)
  s+=pill(478,643,484,'可可重新连接中 · 缓冲结束后 AI 只摸牌、出牌','#0E2F24',C['cyan'],31,12,'#36796A')
 s+=center_board()+own_hand()+text(40,105,'EnglishMahjong 牌桌视觉 · 文字麻将适配',12,C['muted'])+text(1400,105,'V1.1 · 设计参考',12,C['muted'],anchor='end')
 return wrap(s,1440,1000,f'{n}人透视牌桌设计参考')
def vote():
 s=topbar(6)+table_surface()+backs(720,267,13,18,29)+seat(720,117,'阿白','白','申请胡牌')+rect(0,70,1440,930,'#0B100B',extra='opacity=".45"')
 s+=rect(111,192,1218,657,'#050D09',25,extra='opacity=".55"')+rect(111,179,1218,657,'url(#reviewPanel)',25,'#8A7750',1.2)
 s+=pill(156,218,106,'胡牌评审','#35452C',C['gold'],31,13)+pill(1152,218,130,'还剩 36 秒','#132B20',C['cream'],33,14,'#58664B')
 s+=text(156,304,'阿白说，这句话能胡。',32,C['cream'],600)+text(156,343,'读一读它的意思，再投下你这一票。',16,C['muted'])
 s+=text(156,393,'14 字全用',13,C['muted'])+text(1283,393,'需要 3 票赞成 · 已有 2/5 人提交',14,C['muted'],anchor='end')
 chars='我想把月亮装进你的口袋里带走';x0=177;w=66;step=78
 for i,ch in enumerate(chars):s+=han_tile(x0+i*step,420,w,88,ch)
 for a,b in [(3,5),(9,12)]:s+=rect(x0+a*step-5,411,(b-a)*w+(b-a-1)*(step-w)+10,111,'none',12,C['coral'],3)
 s+=text(156,570,'觉得哪里不合理？可圈选最多三段，也可以直接投反对票。',16,C['cream'])
 s+=pill(156,594,96,'月亮  ×','#422E24',C['coral'],36,14,'#875F47')+pill(264,594,118,'口袋里  ×','#422E24',C['coral'],36,14,'#875F47')+text(404,618,'已选 2/3 段',13,C['muted'])
 s+=line(156,657,1284,657,'#52614A')+text(156,706,'投票期间不显示他人的倾向',14,C['cream'])+text(156,735,'提交后不可修改 · 未投票不会算作反对',13,C['muted'])
 s+=rect(821,692,194,57,'url(#goldButton)',12)+text(918,729,'意思成立',18,'#302615',600,'middle')
 s+=rect(1033,692,250,57,'#3F2C23',12,'#B38562',1.4)+text(1158,729,'写的什么玩意',18,C['coral'],600,'middle')
 s+=text(156,800,'圈选仅用于展示操作，不代表这些表达应该被否决。',12,C['muted'])
 s+=pill(433,877,574,'本轮评审名单已固定 · 有人掉线仍需 3 票赞成','#1B281D',C['muted'],38,14,'#4E5D44')
 return wrap(s+text(720,962,'V1.1 设计参考 · 胡牌句为公开冻结数据，其他手牌仍不可见',12,C['muted'],anchor='middle'),1440,1000,'胡牌评审与圈选设计参考')
def mobile_seat(cx,cy,name,initial,state='',relation=''):
 s=circle(cx,cy,18,'#254B39','#8C7950',1)+text(cx,cy+6,initial,16,C['cream'],500,'middle')+text(cx,cy+33,name,12,C['cream'],500,'middle')
 if relation:s+=text(cx,cy+48,relation,12,C['gold'],anchor='middle')
 if state:s+=text(cx,cy+48,state,12,C['cyan'] if '连' in state else C['muted'],anchor='middle')
 return s
def mobile():
 s=rect(0,0,390,844,'url(#room)')+text(17,34,'字间',23,C['cream'],600)+text(74,34,'文字麻将',12,C['muted'])
 s+=pill(245,14,129,'8K2M7 · 6人桌','#251E15',C['muted'],30,12,'#68543A')+text(17,64,'第 3 局',12,C['muted'])+text(373,64,'V1.1 设计参考',12,C['muted'],anchor='end')
 s+=poly([(90,160),(300,160),(387,359),(3,359)],'url(#woodTop)','#916944',1)+poly([(3,359),(387,359),(387,371),(3,371)],'url(#woodFront)')
 s+=poly([(97,169),(293,169),(375,348),(15,348)],'url(#felt)','#2A7856',1)+poly([(97,169),(293,169),(375,348),(15,348)],'url(#feltTexture)',extra='opacity=".15"')
 s+=mobile_seat(195,99,'小陈','陈')+mobile_seat(70,124,'可可','可',state='重连12秒')+mobile_seat(320,124,'阿喵','喵',state='AI托管')
 s+=mobile_seat(35,247,'阿白','白',relation='上家')+mobile_seat(355,247,'小林','林',relation='下家')
 s+=backs(195,183,13,5.5,10)+backs(121,201,13,4.4,9,-18)+backs(269,201,13,4.4,9,18)+backs(85,285,13,4.4,9,-64)+backs(305,285,13,4.4,9,64)
 s+=rect(129,221,132,75,'#6D4728',5)+rect(136,227,118,62,'url(#centerScreen)',2)+text(195,251,'牌山 81',17,C['cream'],600,'middle')+text(195,275,'你的回合 · 42秒',12,C['gold'],500,'middle')
 s+=pill(77,316,236,'可可连接中，缓冲后 AI 接管','#133A2B',C['cyan'],25,12,'#406E58')
 s+=text(17,408,'排成你的意思',21,C['cream'],600)+text(373,407,'14字 · 吃牌 3/3',12,C['muted'],anchor='end')+text(17,434,'拖动排字，点选后出牌',12,C['muted'])
 chars='今天下班以后我想和你一起吃饭'
 for i,ch in enumerate(chars):s+=han_tile(17+(i%7)*52,454+(i//7)*79,44,58,ch,selected=i==2,new=i==13,size=28,label_new=False)
 s+=comma_marker(325,511,9)+pill(331,605,40,'新摸','#123C36',C['cyan'],20,12,C['cyan'])+text(17,638,'逗号 1/3',13,C['muted'])
 for i in range(3):s+=rect(126+i*54,611,44,44,'#283321' if i==0 else '#2B4230',10,'#6E784D',1)+text(148+i*54,642,'，',28,'#737960' if i==0 else C['gold'],600,'middle')
 s+=text(17,686,'点逗号，再选一个字放在它后面',13,C['muted'])+text(17,713,'只有自己能看见当前排列',12,'#8FA78F')
 s+=rect(17,742,111,54,'#2B251A',12,'#9D8A5A')+text(72.5,777,'出牌',17,C['cream'],500,'middle')+rect(140,742,233,54,'url(#goldButton)',12)+text(256.5,777,'申请胡牌',17,'#302615',600,'middle')
 return wrap(s+line(148,824,242,824,'#A2987B',4),390,844,'手机390竖屏三维桌面与排句区设计参考')
def wrap(body,w,h,title):
 defs='''<defs>
<radialGradient id="room"><stop stop-color="#3D2A1B"/><stop offset="1" stop-color="#110D09"/></radialGradient>
<linearGradient id="woodTop" x2="0" y2="1"><stop stop-color="#94633C"/><stop offset=".45" stop-color="#754A2A"/><stop offset="1" stop-color="#926039"/></linearGradient>
<linearGradient id="woodFront" x2="0" y2="1"><stop stop-color="#704424"/><stop offset="1" stop-color="#35200F"/></linearGradient>
<linearGradient id="felt" x2=".1" y2="1"><stop stop-color="#256E50"/><stop offset=".65" stop-color="#1B654D"/><stop offset="1" stop-color="#175A43"/></linearGradient>
<pattern id="feltTexture" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".55" fill="#99B393"/><circle cx="3.5" cy="3.5" r=".55" fill="#062A19"/></pattern>
<linearGradient id="ivory" x2=".8" y2="1"><stop stop-color="#FFF9E7"/><stop offset=".48" stop-color="#EEE8D8"/><stop offset="1" stop-color="#D9D4C4"/></linearGradient>
<linearGradient id="tileBase" x2="0" y2="1"><stop stop-color="#D6C870"/><stop offset=".5" stop-color="#EED98A"/><stop offset="1" stop-color="#B8A653"/></linearGradient>
<linearGradient id="goldBack" x2="0" y2="1"><stop stop-color="#F3D36B"/><stop offset="1" stop-color="#D0AF48"/></linearGradient>
<linearGradient id="goldButton" x2="1" y2="1"><stop stop-color="#E4CD85"/><stop offset="1" stop-color="#C3A65B"/></linearGradient>
<radialGradient id="centerScreen"><stop stop-color="#123829"/><stop offset="1" stop-color="#06140D"/></radialGradient>
<linearGradient id="reviewPanel" x2=".1" y2="1"><stop stop-color="#173A2C"/><stop offset="1" stop-color="#101E16"/></linearGradient>
<linearGradient id="avatarRing" x2="0" y2="1"><stop stop-color="#A88B50"/><stop offset="1" stop-color="#433622"/></linearGradient>
</defs>'''
 return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{escape(title)}"><title>{escape(title)}</title>{defs}<style>__FONT__text{{font-family:"WM CJK","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif}}</style>{rect(0,0,w,h,"url(#room)")}{body}</svg>'

svgs={'desktop-4p.svg':desktop(4),'desktop-6p.svg':desktop(6),'vote-objection.svg':vote(),'mobile-390.svg':mobile()}
font_path=ROOT/'ui-cjk-subset.woff'
if len(sys.argv)>1:
 from fontTools import subset
 from fontTools.ttLib import TTFont
 font=TTFont(sys.argv[1]);subsetter=subset.Subsetter(options=subset.Options())
 subsetter.populate(text=''.join(svgs.values())+Path(__file__).read_text(encoding='utf-8'))
 subsetter.subset(font);font.flavor='woff';font.save(font_path)
font_css=''
if font_path.exists():font_css="@font-face{font-family:'WM CJK';src:url(data:font/woff;base64,"+base64.b64encode(font_path.read_bytes()).decode()+") format('woff');font-style:normal;font-weight:100 900;}"
for name,content in svgs.items():(ROOT/name).write_text(content.replace('__FONT__',font_css),encoding='utf-8')
def inline_svg(content,index):
 # Keep gradient and pattern ids unique when all four SVGs share one HTML document.
 return content.replace('id="',f'id="ref{index}-').replace('url(#',f'url(#ref{index}-').replace('__FONT__',font_css)
panels=''.join(f'<section id="scene-{i}" class="scene'+(' active' if i==0 else '')+'">'+inline_svg(content,i)+'</section>' for i,content in enumerate(svgs.values()))
html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>文字麻将 V1.1 · EnglishMahjong 牌桌采用方案</title><style>
__FONT__*{box-sizing:border-box}body{margin:0;background:#130e0a;color:#f4ebd4;font-family:'WM CJK','Noto Sans CJK SC','PingFang SC','Microsoft YaHei',sans-serif}header{max-width:1480px;margin:auto;padding:26px 28px 18px}h1{font-size:25px;margin:0 0 10px}p{color:#b6ad93;line-height:1.7;margin:8px 0}nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:17px}button{font:inherit;min-height:44px;border:1px solid #68543a;background:#201c13;color:#f4ebd4;padding:8px 18px;border-radius:11px;cursor:pointer}button[aria-selected=true]{color:#302615;background:#d5bc74;border-color:#d5bc74}button:focus-visible{outline:3px solid #4fd1ff;outline-offset:3px}main{max-width:1480px;margin:auto;padding:0 20px}.scene{display:none}.scene.active{display:block}.scene svg{display:block;width:100%;height:auto;border:1px solid #5d492e;border-radius:18px}#scene-3 svg{width:390px;max-width:100%;margin:0 auto}aside{margin:25px 0 32px;padding:23px;background:#17251b;border:1px solid #596349;border-radius:18px}.states{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.state{padding:16px;background:#102017;border-radius:11px}.tag{color:#4fd1ff}.tag.bot{color:#c9b27a}.tag.ok{color:#f3ead2}h2{font-size:18px;margin:0 0 14px}small{color:#b6ad93;line-height:1.8}a{color:#e7ce83}@media(max-width:700px){header{padding:20px 15px}main{padding:0 9px}.states{grid-template-columns:1fr}aside{padding:16px}h1{font-size:21px}}
</style></head><body><header><h1>字间 · EnglishMahjong 牌桌采用方案</h1><p>V1.1 可编辑设计参考。木边绿绒、奶白厚牌、金色牌背、暖暗环境与透视构图沿用选定方向；汉字、2–6 人、逗号和投票按本项目定制。</p><p><small>本页只切换四幅静态设计图，不是 Three.js 运行演示，不代表联网、拖拽、投票或性能已完成。</small></p><nav role="tablist" aria-label="设计场景"><button role="tab" aria-selected="true" data-scene="0">四人 · 采用基线</button><button role="tab" aria-selected="false" data-scene="1">六人 · 扩展布局</button><button role="tab" aria-selected="false" data-scene="2">胡牌 · 圈词投票</button><button role="tab" aria-selected="false" data-scene="3">手机 · 390竖屏</button></nav></header><main>__PANELS__<aside><h2>实现时必须保持的边界</h2><div class="states"><div class="state"><span class="tag">同一份私人草稿</span><p>三维牌与排句区共用 tileId 顺序和逗号锚点。切换视图不能复制手牌或提交第二次动作。</p></div><div class="state"><span class="tag bot">AI 托管</span><p>15秒缓冲后只摸牌、出牌，不吃、不胡、不投票。本人回来后重建视觉快照。</p></div><div class="state"><span class="tag ok">按真实快照呈现</span><p>牌桌只接公共数据与本人的私密数据；对手牌背不藏有真实汉字。</p></div></div><p><small>原始视觉来源：<a href="https://github.com/Bruce-pac/EnglishMahjong-web">Bruce-pac/EnglishMahjong-web</a>，基准提交 6830301df3061cdd25350cf56807473e5505b311。上游源码与许可审计见 docs/11-ENGLISH-TABLE-ADOPTION.md；本项目规则见 docs/01-RULES.md。图中默认人物为中性昵称头像，不包含源项目人物模型。</small></p></aside></main><script>document.querySelectorAll('[data-scene]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-scene]').forEach(function(x){x.setAttribute('aria-selected',String(x===b))});document.querySelectorAll('.scene').forEach(function(s,i){s.classList.toggle('active',i===Number(b.dataset.scene))})})});</script></body></html>'''
(ROOT/'reference.html').write_text(html.replace('__FONT__',font_css).replace('__PANELS__',panels),encoding='utf-8')
print(json.dumps({'written':list(svgs)+['reference.html'],'font_bytes':font_path.stat().st_size if font_path.exists() else 0},ensure_ascii=False))
