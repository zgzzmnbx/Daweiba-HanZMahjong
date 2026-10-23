#!/usr/bin/env python3
"""Check handoff file syntax and relative links, not the future game implementation."""
from pathlib import Path
import ast
import json
import plistlib
import re
import tomllib
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM_SNAPSHOT = ROOT / 'references/englishmahjong/source-snapshot'
counts = {"json": 0, "svg": 0, "toml": 0, "plist": 0, "python": 0, "markdown_links": 0}
errors = []
for path in sorted(ROOT.rglob('*')):
    if not path.is_file():
        continue
    try:
        if path.suffix == '.json':
            json.loads(path.read_text(encoding='utf-8'))
            counts['json'] += 1
        elif path.suffix == '.svg':
            ET.parse(path)
            counts['svg'] += 1
        elif path.name.endswith('.toml.example'):
            tomllib.loads(path.read_text(encoding='utf-8'))
            counts['toml'] += 1
        elif path.name.endswith('.plist.example'):
            plistlib.loads(path.read_bytes())
            counts['plist'] += 1
        elif path.suffix == '.py':
            ast.parse(path.read_text(encoding='utf-8'))
            counts['python'] += 1
        elif path.suffix == '.md':
            # The byte-exact, deliberately partial upstream research snapshot
            # keeps original links to files/assets not redistributed here.
            # verify-snapshot.py checks its integrity; authored docs below
            # still have every relative file target checked.
            if path.is_relative_to(UPSTREAM_SNAPSHOT):
                continue
            for raw in re.findall(r'!?\[[^\]]*\]\(([^\s)]+)\)', path.read_text(encoding='utf-8')):
                target = raw.split('#')[0]
                if not target or re.match(r'^[a-zA-Z]+:', target):
                    continue
                counts['markdown_links'] += 1
                if not (path.parent / target).exists():
                    errors.append(f'{path.relative_to(ROOT)} -> {raw}: missing file')
    except Exception as exc:
        errors.append(f'{path.relative_to(ROOT)}: {exc}')

server = tomllib.loads((ROOT/'deploy/frps.toml.example').read_text())
client = tomllib.loads((ROOT/'deploy/frpc.toml.example').read_text())
assert server['proxyBindAddr'] == '127.0.0.1'
assert server['bindPort'] == client['serverPort'] == 7000
assert server['allowPorts'] == [{'single': 7300}]
assert client['proxies'][0]['remotePort'] == 7300
assert client['proxies'][0]['localPort'] == 3000
assert server['transport']['tls']['force'] is True
assert client['transport']['tls']['enable'] is True
assert client['transport']['tls']['trustedCaFile']
if errors:
    raise SystemExit('\n'.join(errors))
print('PASS package formats and links: ' + json.dumps(counts, ensure_ascii=False))
print('PASS template port chain: cloud 7000 + loopback 7300 -> Mac 3000; TLS placeholders present')
print('Scope: file syntax/link checks only; no actual Mac, frp, Caddy or game deployment was run.')
