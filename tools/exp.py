#!/usr/bin/env python3
"""Design experiments on lab. The baseline site lives at the repo root, each experiment in exp/<slug>/.

  python3 tools/exp.py new <slug>   copy every baseline page + styles.css into exp/<slug>/,
                                    keep /assets shared, rewrite internal links to stay inside
                                    the experiment, add a badge with a link back to the original
  python3 tools/exp.py index        rebuild exp/index.html from exp/REGISTRY.md
  python3 tools/exp.py sync         pull the baseline site from the prod repo (git remote `upstream`)
                                    into the root, leaving exp/, tools/, README, CNAME and robots alone
"""
import html, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXP = ROOT / 'exp'
BADGE_CSS = ('.exp-badge{position:fixed;left:16px;bottom:16px;z-index:9999;padding:8px 14px;border-radius:50px;'
             'background:#1e1e3d;color:#fff;font:400 13px/1.2 Onest,Arial,sans-serif;text-decoration:none;'
             'box-shadow:0 6px 20px rgba(30,30,61,.25)}.exp-badge:hover{background:#3939ff}')
README = """# Эксперимент: {slug}

**Идея:** …
**Источник:** … (ссылка на репо / «crazy»)
**Цель:** что должно измениться для посетителя.

## План
1. …

## Что проверять
- …

## Откат
Папка `exp/{slug}/` удаляется целиком, корень сайта не менялся.
"""


def pages():
    yield ROOT / 'index.html'
    for d in sorted(ROOT.iterdir()):
        if d.is_dir() and d.name not in ('exp', 'assets', 'tools') and (d / 'index.html').exists():
            yield d / 'index.html'


def new(slug):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', slug):
        sys.exit('slug: only a-z, 0-9, -')
    dst = EXP / slug
    if dst.exists():
        sys.exit(f'{dst} already exists')
    base = f'/exp/{slug}/'
    for src in pages():
        rel = src.relative_to(ROOT)
        text = src.read_text(encoding='utf-8')
        # root-relative links/forms stay inside the experiment; shared assets stay shared
        text = re.sub(r'((?:href|src|action)=")/(?!assets/|exp/)', r'\g<1>' + base, text)
        orig = '/' + (str(rel.parent) + '/' if rel.parent != Path('.') else '')
        badge = (f'<style>{BADGE_CSS}</style>\n<a class="exp-badge" href="{orig}" title="Открыть оригинал">'
                 f'🧪 эксперимент «{slug}» · оригинал →</a>\n</body>')
        text = text.replace('</body>', badge, 1)
        out = dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding='utf-8')
    # font urls in styles.css are relative to the root; keep them pointing at the shared /assets
    css = (ROOT / 'styles.css').read_text(encoding='utf-8').replace('url("assets/', 'url("/assets/')
    (dst / 'styles.css').write_text(css, encoding='utf-8')
    (dst / 'README.md').write_text(README.format(slug=slug), encoding='utf-8')
    print(f'exp/{slug}/: {sum(1 for _ in pages())} pages + styles.css + README.md → edit there, then `exp.py index`')


def index():
    rows = []
    for line in (EXP / 'REGISTRY.md').read_text(encoding='utf-8').splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 6 and cells[0].isdigit():
            rows.append(cells)
    items = ''.join(
        f'<li><a href="/exp/{c[2]}/"><b>{html.escape(c[3])}</b></a> <small>№{c[0]} · {c[1]} · {html.escape(c[5])}</small>'
        f'<br><span>{html.escape(c[4])}</span></li>\n' for c in reversed(rows))
    (EXP / 'index.html').write_text(f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Эксперименты — lab.kazan-project-manufactory.ru</title>
<link rel="stylesheet" href="/styles.css">
<style>.exp{{max-width:900px;margin:0 auto;padding:48px 20px}}.exp li{{padding:16px 0;border-bottom:1px solid #dbdbdb}}.exp small{{color:#8b8b9a}}.exp a{{color:var(--accent)}}</style>
</head><body><main class="exp"><h1 class="h2">Эксперименты</h1>
<p class="lead">Полигон дизайн-экспериментов. Оригинал сайта — <a href="/">в корне</a>. Реестр — <code>exp/REGISTRY.md</code>.</p>
<ul>{items}</ul></main></body></html>''', encoding='utf-8')
    print(f'exp/index.html: {len(rows)} experiments')


def sync():
    """Copy the baseline pages from the prod repo into the root. Not a merge: prod deleted exp/ and
    tools/exp.py, and merging that deletion would wipe the experiments."""
    paths = ['index.html', 'styles.css', 'assets'] + [str(f.parent.name) for f in pages() if f.parent != ROOT]
    subprocess.run(['git', 'fetch', 'upstream'], cwd=ROOT, check=True)
    subprocess.run(['git', 'checkout', 'upstream/main', '--'] + paths, cwd=ROOT, check=True)
    changed = subprocess.run(['git', 'status', '--porcelain'], cwd=ROOT, capture_output=True, text=True).stdout
    print(f'synced from upstream/main: {len(paths)} paths')
    print(changed or '(корень уже совпадает с продом)')


if __name__ == '__main__':
    cmd = sys.argv[1:2]
    if cmd == ['new'] and len(sys.argv) == 3: new(sys.argv[2])
    elif cmd == ['index']: index()
    elif cmd == ['sync']: sync()
    else: sys.exit(__doc__)
