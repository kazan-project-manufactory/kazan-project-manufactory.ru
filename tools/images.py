#!/usr/bin/env python3
"""Copy images referenced in extract/*.json from the Tilda mirror into assets/img/<slug>/
as webp sized to ~2x the displayed width (cap 1920). Writes assets/img/manifest.json (tilda path → local path).

Usage: python3 tools/images.py
"""
import json, re, subprocess, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIRROR = ROOT / 'tilda' / 'kazan-project-manufactory.ru'
OUT = ROOT / 'assets' / 'img'
refs = {}  # src → {slug, width}


def walk(n, slug):
    if isinstance(n, dict):
        w = int(n.get('base', {}).get('width') or 0)
        if n.get('src'):
            refs.setdefault(n['src'], {'slug': slug, 'width': 0})
            refs[n['src']]['width'] = max(refs[n['src']]['width'], w)
        bg = n.get('styles', {}).get('base', {}).get('background-image', '') + ' ' + n.get('inline', '')
        gw = int(n.get('flex', {}).get('width') or 0)
        for m in re.finditer(r"url\('?([^')]+)'?\)", bg):
            refs.setdefault(m.group(1), {'slug': slug, 'width': 0})
            refs[m.group(1)]['width'] = max(refs[m.group(1)]['width'], w, gw)
        for c in n.get('children', []): walk(c, slug)
    elif isinstance(n, list):
        for c in n: walk(c, slug)


for f in sorted((ROOT / 'extract').glob('*.json')):
    if f.name.startswith('_'): continue
    walk(json.load(open(f))['records'], f.stem)

manifest = {}
for src, info in refs.items():
    p = (MIRROR / src).resolve()
    if not p.exists():
        print('MISSING', src); continue
    slug = info['slug']
    d = OUT / slug
    d.mkdir(parents=True, exist_ok=True)
    stem = hashlib.md5(src.encode()).hexdigest()[:8]
    if p.suffix.lower() == '.svg':
        dst = d / f'{stem}.svg'
        dst.write_bytes(p.read_bytes())
    else:
        dst = d / f'{stem}.webp'
        width = min(1920, max(640, info['width'] * 2)) if info['width'] else 1600
        subprocess.run(['cwebp', '-quiet', '-q', '82', '-resize', str(width), '0', str(p), '-o', str(dst)], check=True)
    manifest[src] = str(dst.relative_to(ROOT))
    print(f'{slug}/{dst.name}  {p.stat().st_size // 1024}K → {dst.stat().st_size // 1024}K')

(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
total = sum(Path(ROOT / v).stat().st_size for v in manifest.values())
print(f'{len(manifest)} images, total {total // 1024} KB → assets/img/manifest.json')
