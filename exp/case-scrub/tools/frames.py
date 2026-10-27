#!/usr/bin/env python3.13
"""Frames for the case-scrub experiment: real case images -> 2:1 webp under the card cover box.

  python3.13 exp/case-scrub/tools/frames.py      (from the site repo root)

Source images stay in /assets/img/<case>/ (untouched); output goes to exp/case-scrub/assets/frames/<case>-N.webp.
Each entry: (file, anchor_y[, zoom]) — anchor 0 keeps the top of the screen, .5 the middle (cover crop like
object-fit: cover); zoom > 1 crops tighter around the centre, for screenshots where the page is a narrow column.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1] / 'assets' / 'frames'
W, H, Q = 1120, 560, 70
BUDGET = 1024 * 1024

FRAMES = {
    'ranepa': [('260621c4', .5), ('39912569', .5), ('80d12cb7', .5), ('201a6b9d', .5)],
    'ncip-branding': [('2a278f72', .5), ('d360945f', .5), ('f987cbac', .4), ('eaeab633', .45)],
    'dubai-real-estate': [('04e60703', 0, 1.3), ('38baafd5', .5, 1.3), ('1141bf7c', .4, 1.3)],
    'ourfish': [('d69ab9f0', 0, 1.35), ('6392a829', .65, 1.35), ('0563335e', .12, 1.35), ('fcfaa649', 0, 1.35)],
    'region': [('4ea12d30', 0, 1.2), ('9b327678', 0, 1.2), ('60013e78', 0, 1.2), ('bfaec00c', .5, 1.2)],
    'pediatric': [('3ce7bd75', 0, 1.3), ('b13e9ede', .4, 1.3)],
    'ncip-web': [('12198db1', 0, 1.2), ('1ff0760c', .2, 1.2), ('0524d2cd', .5, 1.2), ('f89eaa97', .5, 1.2)],
}


def cover(im, anchor_y, zoom=1.0):
    """Scale to fill W×H (times zoom), crop horizontally centred and vertically at anchor_y."""
    s = max(W / im.width, H / im.height) * zoom
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = round((im.height - H) * anchor_y)
    return im.crop((x, y, x + W, y + H))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for case, items in FRAMES.items():
        for n, (name, *crop) in enumerate(items, 1):
            src = ROOT / 'assets' / 'img' / case / f'{name}.webp'
            dst = OUT / f'{case}-{n}.webp'
            cover(Image.open(src).convert('RGB'), *crop).save(dst, 'WEBP', quality=Q, method=6)
            size = dst.stat().st_size
            total += size
            print(f'{dst.name:24} ← {case}/{name}.webp  {size / 1024:5.1f} KB')
    print(f'total: {total / 1024:.0f} KB of {BUDGET // 1024} KB')
    if total > BUDGET:
        raise SystemExit('over budget')


if __name__ == '__main__':
    main()
