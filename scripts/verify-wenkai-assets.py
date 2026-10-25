#!/usr/bin/env python3
"""Verify delivered subsets, pinned source and current deck glyph coverage; never exports database records."""
import argparse,hashlib,io,json,sqlite3,zipfile
from pathlib import Path
from fontTools.ttLib import TTFont
p=argparse.ArgumentParser();p.add_argument('--zip',type=Path,required=True);p.add_argument('--database',type=Path);p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];folder=root/'apps/web/public/fonts/wenkai';manifest=json.loads((folder/'manifest.json').read_text())
assert hashlib.sha256(a.zip.read_bytes()).hexdigest()==manifest['sourcePackageSha256']
with zipfile.ZipFile(a.zip) as z:data=z.read(manifest['sourceFile'])
assert hashlib.sha256(data).hexdigest()==manifest['sourceFileSha256'];source=TTFont(io.BytesIO(data));codes=set();source_cmap=source.getBestCmap()
for record in manifest['subsets']:
 b=(folder/record['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==record['sha256'];font=TTFont(io.BytesIO(b));subset=set(font.getBestCmap());assert not codes&subset;codes|=subset;assert font['OS/2'].usWeightClass==500;assert font['name'].getDebugName(6)=='LXGWWenKai-Medium'
assert codes==set(source_cmap)
chars=set('一人口赢藏警未末己已巳，。');count=0
for path in (root/'handoff/fixtures').glob('*deck*.json'):
 d=json.loads(path.read_text());chars.update(e['char'] for e in d.get('entries',[]))
if a.database:
 db=sqlite3.connect('file:'+str(a.database.resolve())+'?mode=ro',uri=True)
 for (data,) in db.execute('SELECT r.data FROM deck_sets s JOIN deck_set_revisions r ON s.id=r.set_id AND s.revision=r.revision'):
  d=json.loads(data);chars.update(e['char'] for e in d['entries']);count+=1
 db.close()
missing=sorted(c for c in chars if ord(c) not in codes);assert not missing,missing
result={'version':json.loads((root/'package.json').read_text())['version'],'sourceVersion':manifest['version'],'sourceSha256':manifest['sourceFileSha256'],'subsets':len(manifest['subsets']),'codepoints':len(codes),'deckSetsChecked':count,'requiredUniqueGlyphs':len(chars),'missingGlyphs':missing,'fontWeight':500,'status':'PASS'}
a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
