#!/usr/bin/env python3
"""Subset user-supplied PingFang web fonts without changing their outlines or names."""
import argparse,copy,hashlib,io,json,re,zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
p=argparse.ArgumentParser();p.add_argument('--zip',type=Path,required=True);p.add_argument('--root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
out=a.output/'apps/web/public/fonts/pingfang';out.mkdir(parents=True,exist_ok=True)
css=[];records=[];sources=[];preloads=[]
core={int(x,16) for x in (a.root/'scripts/pingfang-font-core.txt').read_text().split()}
def ranges(codes):
 result=[];start=last=None
 for c in sorted(codes):
  if last is not None and c==last+1:last=c;continue
  if last is not None:result.append(f'U+{start:X}'+(f'-{last:X}' if last!=start else ''))
  start=last=c
 if last is not None:result.append(f'U+{start:X}'+(f'-{last:X}' if last!=start else ''))
 return ','.join(result)
with zipfile.ZipFile(a.zip) as z:
 for weight,kind in [(400,'regular'),(500,'medium'),(600,'semibold')]:
  filename=f'pingfang-sc-{kind}.woff2';entry=next(n for n in z.namelist() if n.endswith('/'+filename));data=z.read(entry);font=TTFont(io.BytesIO(data));codes=set(font.getBestCmap());present=core&codes
  sources.append({'file':filename,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'weight':weight,'family':font['name'].getDebugName(1),'postscriptName':font['name'].getDebugName(6),'codepoints':len(codes)})
  chunks={'core':present}
  for c in sorted(codes-present):chunks.setdefault(f'u{c//4096:03x}',set()).add(c)
  for name,chars in chunks.items():
   f=copy.deepcopy(font);options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.recalc_timestamp=False
   s=subset.Subsetter(options=options);s.populate(unicodes=chars);s.subset(f);f.flavor='woff2';temp=out/f'tmp-{weight}-{name}.woff2';f.save(temp);data=temp.read_bytes();sha=hashlib.sha256(data).hexdigest();target=f'pingfang-{weight}-{name}-{sha[:10]}.woff2';temp.rename(out/target);assert set(TTFont(out/target).getBestCmap())==chars
   record={'file':target,'weight':weight,'bytes':len(data),'sha256':sha,'codepoints':len(chars),'unicodeRange':ranges(chars)};records.append(record)
   css.append('@font-face{font-family:"Hanz PingFang";font-style:normal;font-weight:'+('600 900' if weight==600 else str(weight))+';font-display:swap;src:url("/fonts/pingfang/'+target+'") format("woff2");unicode-range:'+ranges(chars)+'}')
   if name=='core':preloads.append(target)
   print(weight,name,len(chars),len(data),flush=True)
(a.output/'apps/web/src').mkdir(parents=True,exist_ok=True)
(a.output/'apps/web/src/pingfang-faces.css').write_text('/* Generated from the user-supplied PingFang font package. */\n'+'\n'.join(css)+'\n')
(out/'manifest.json').write_text(json.dumps({'family':'Hanz PingFang','sourcePackage':a.zip.name,'sourcePackageSha256':hashlib.sha256(a.zip.read_bytes()).hexdigest(),'source':'User-supplied font archive for this internal test project; original outlines and font names retained.','files':sources,'preloads':preloads,'subsets':records},ensure_ascii=False,indent=2)+'\n')
print('TOTAL',len(records),sum(r['bytes'] for r in records),'CORE',sum(r['bytes'] for r in records if '-core-' in r['file']),flush=True)

html=a.output/'apps/web/index.html';html.parent.mkdir(parents=True,exist_ok=True)
text=(html if html.exists() else a.root/'apps/web/index.html').read_text()
text=re.sub(r'<link rel="preload" href="/fonts/pingfang/[^"]+" as="font" type="font/woff2" crossorigin/>','',text)
tags=''.join('<link rel="preload" href="/fonts/pingfang/'+name+'" as="font" type="font/woff2" crossorigin/>' for name in preloads)
html.write_text(text.replace('</head>',tags+'</head>'))
