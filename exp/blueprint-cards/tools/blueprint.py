#!/usr/bin/env python3.13
"""Прорись обложек карточек «Наши проекты»: линейный чертёж из того же изображения.

Конвейер на картинку: альфа-маска изделия (фоновый водяной знак отрезается) →
композит на цвет карточки → яркость → размытие → Canny (Собель, подавление
немаксимумов, гистерезис) → отсев мелких компонент → утолщение → уменьшение.
Выход — белые линии на прозрачном фоне, webp в ../assets/blueprint/<id>.webp.

Запуск из корня сайта:  python3.13 exp/blueprint-cards/tools/blueprint.py [--sheet out.png]
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SITE = Path(__file__).resolve().parents[3]
SRC = SITE / "assets/img/index"
OUT = Path(__file__).resolve().parents[1] / "assets/blueprint"
SIZE = 1000

# id: цвет карточки, sigma размытия, пороги гистерезиса (доли от p99 градиента),
# min_len — минимальная компонента в пикселях исходника, group — радиус, в котором
# соседние штрихи считаются одной компонентой (иначе буквы отсеиваются как шум),
# zones — прямоугольники исходника со своими параметрами (текст тоньше, фото грубее).
CARDS = {
    # ranepa: телефон, подписи иконок — буквы слова держатся вместе (group)
    "365343d9": dict(bg="#1e1e1e", sigma=1.0, lo=.05, hi=.15, min_len=30, group=3),
    # ncip-branding: вывеска и сетка фасада
    "c693ee17": dict(bg="#2a7dd3", sigma=1.0, lo=.05, hi=.15, min_len=30),
    # dubai: ноутбук на кубе; фактура куба даёт крошку — порог выше
    "c9d788f0": dict(bg="#1e1e1e", sigma=1.3, lo=.07, hi=.20, min_len=60, group=2),
    # ourfish: заголовок, корабль, волны
    "96d48274": dict(bg="#1e83b5", sigma=1.2, lo=.05, hi=.15, min_len=40, group=3),
    # region: заголовок тонко, пейзаж — только горизонт и берега реки
    "d9cf0671": dict(bg="#007ebd", sigma=4.0, lo=.10, hi=.30, min_len=200,
                     zones=[((150, 540, 1340, 1000), dict(sigma=1.0, lo=.05, hi=.15, min_len=30, group=4))]),
    # pediatric: экран целиком, фото младенца сводится к контуру
    "cfdaf5fd": dict(bg="#5fb85a", sigma=1.2, lo=.05, hi=.15, min_len=40, group=4),
    # ncip-web: абзацы читаются как строки; фото зала внизу — только крупные формы
    "93b05bba": dict(bg="#224db5", sigma=1.5, lo=.06, hi=.18, min_len=60, group=3,
                     zones=[((350, 1228, 1160, 1504), dict(sigma=3.0, lo=.10, hi=.30, min_len=150, group=0))]),
}


def hex_rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32)


def load(fid, bg):
    im = np.asarray(Image.open(SRC / f"{fid}.webp").convert("RGBA"), dtype=np.float32)
    rgb, a = im[..., :3], im[..., 3:] / 255
    if (a < 1).any():
        mask = a[..., 0] >= 200 / 255          # водяной знак фона — альфа 5–13, отрезаем
    else:                                      # RGB без альфы: фон по близости к цвету
        mask = np.linalg.norm(rgb - hex_rgb(bg), axis=-1) > 28
        mask = ndi.binary_opening(mask, iterations=2)
    comp = rgb * a + hex_rgb(bg) * (1 - a)
    comp[~mask] = hex_rgb(bg)
    lum = comp @ np.array([.299, .587, .114], dtype=np.float32)
    return lum, mask


def canny(lum, sigma, lo, hi):
    g = ndi.gaussian_filter(lum, sigma)
    gx, gy = ndi.sobel(g, 1), ndi.sobel(g, 0)
    mag = np.hypot(gx, gy)
    ang = (np.rad2deg(np.arctan2(gy, gx)) + 180) % 180
    q = np.zeros_like(mag, dtype=bool)
    p = np.pad(mag, 1)
    h, w = mag.shape
    nb = lambda dy, dx: p[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
    for (a0, a1), (dy, dx) in [((0, 22.5), (0, 1)), ((157.5, 180), (0, 1)),
                               ((22.5, 67.5), (1, 1)), ((67.5, 112.5), (1, 0)),
                               ((112.5, 157.5), (1, -1))]:
        sel = (ang >= a0) & (ang < a1)
        q |= sel & (mag >= nb(dy, dx)) & (mag >= nb(-dy, -dx))
    ref = np.percentile(mag[mag > 0], 99) if (mag > 0).any() else 1
    weak = q & (mag >= lo * ref)
    strong = q & (mag >= hi * ref)
    lab, n = ndi.label(weak, structure=np.ones((3, 3)))
    keep = np.zeros(n + 1, dtype=bool)
    keep[np.unique(lab[strong])] = True
    keep[0] = False
    return keep[lab]


def drop_small(edges, min_len, group=0):
    # group > 0: соседние штрихи (буквы одного слова) считаются одной компонентой
    near = ndi.binary_dilation(edges, iterations=group) if group else edges
    lab, n = ndi.label(near, structure=np.ones((3, 3)))
    sizes = ndi.sum(edges, lab, index=np.arange(n + 1))
    return edges & (sizes >= min_len)[lab]


def edges_for(lum, p):
    return drop_small(canny(lum, p["sigma"], p["lo"], p["hi"]), p["min_len"], p.get("group", 0))


def blueprint(fid, p):
    lum, mask = load(fid, p["bg"])
    edges = edges_for(lum, p)
    # зоны с текстом на скриншотах прорисовываются тоньше, чем фото вокруг
    for (x0, y0, x1, y1), over in p.get("zones", []):
        edges[y0:y1, x0:x1] = edges_for(lum[y0:y1, x0:x1], {**p, **over})
    # контур изделия — тоже линия чертежа (силуэт телефона, ноутбука, экрана)
    edges |= drop_small(mask ^ ndi.binary_erosion(mask, iterations=1), 200)
    edges = ndi.binary_dilation(edges, iterations=1)   # ~3 px на 1504 → ~2 px на 1000
    alpha = Image.fromarray((edges * 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)
    out = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", help="контактный лист прорисей поверх цветов карточек")
    ap.add_argument("only", nargs="*")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    tiles, total = [], 0
    for fid, p in CARDS.items():
        if args.only and fid not in args.only:
            continue
        bp = blueprint(fid, p)
        dst = OUT / f"{fid}.webp"
        bp.save(dst, "WEBP", quality=80, alpha_quality=70, method=6)
        kb = dst.stat().st_size / 1024
        total += kb
        print(f"{fid}  {kb:5.1f} KB")
        tile = Image.new("RGBA", (SIZE, SIZE), p["bg"])
        tile.alpha_composite(bp)
        tiles.append(tile.convert("RGB").resize((500, 500), Image.LANCZOS))
    print(f"total {total:.1f} KB")
    if args.sheet and tiles:
        sheet = Image.new("RGB", (4 * 500, ((len(tiles) + 3) // 4) * 500), "white")
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % 4) * 500, (i // 4) * 500))
        sheet.save(args.sheet)


if __name__ == "__main__":
    sys.exit(main())
