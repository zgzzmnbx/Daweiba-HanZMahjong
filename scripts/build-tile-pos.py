"""Extract single-Han primary POS from pinned Jieba data; no runtime NLP dependency."""
from pathlib import Path
import argparse,hashlib,json,unicodedata,urllib.request
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);a=p.parse_args()
expected='7197c3211ddd98962b036cdf40324d1ea2bfaa12bd028e68faa70111a88e12a8'
assert hashlib.sha256(a.source.read_bytes()).hexdigest()==expected,'Unexpected dictionary'
entries={}
for line in a.source.read_text().splitlines():
 word,freq,tag=line.rsplit(' ',2)
 if len(word)==1 and unicodedata.name(word,'').startswith('CJK UNIFIED IDEOGRAPH-'):entries[word]=tag
out=Path('packages/engine/tile-pos.jieba-v0.42.1.json');out.write_text(json.dumps(dict(sorted(entries.items())),ensure_ascii=False,separators=(',',':'))+'\n')
license=Path('apps/web/public/licenses/Jieba-MIT.txt');license.parent.mkdir(parents=True,exist_ok=True)
if not license.exists():license.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/fxsjy/jieba/v0.42.1/LICENSE',timeout=30).read())
print('Single-Han tags:',len(entries),'dictionary SHA256:',expected)
