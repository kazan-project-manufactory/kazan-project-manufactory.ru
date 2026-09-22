#!/usr/bin/env python3
"""Build a case/privacy page from extract/<slug>.json into <slug>/index.html.

Tilda Zero Block flex groups map to flex <div>s, elements to typographic classes from styles.css.
Header, contact form and footer records are replaced by shared partials (same markup as index.html).

Usage: python3 tools/build_page.py ranepa [more slugs...]   |   python3 tools/build_page.py --all
"""
import json, re, sys, html as H
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAN = json.load(open(ROOT / 'assets' / 'img' / 'manifest.json'))
LOGO = (ROOT / 'assets' / 'logo.svg').read_text().split('?>', 1)[-1].strip()
NL = '\n'


def px(v, default=None):
    """'var(--uc-typo-fontsize-x,24px)' → 24 ; '60px' → 60"""
    if not v: return default
    m = re.findall(r'(\d+)px', v)
    return int(m[-1]) if m else default


def color(v):
    if not v: return ''
    m = re.findall(r'#[0-9a-fA-F]{6}', v)
    return m[-1].lower() if m else ''


def elems(n, acc):
    if isinstance(n, list):
        for c in n: elems(c, acc)
    elif n.get('kind') == 'group':
        for c in n['children']: elems(c, acc)
    else:
        acc.append(n)
    return acc


def text_html(e):
    """Tilda text atom html → class + inner html (keep <br>, <a>, <b>)."""
    inner = e.get('html', '') or H.escape(e.get('text', ''))
    inner = re.sub(r'<(?!/?(br|a|b|strong|i|em|u|span|ul|ol|li|p)\b)[^>]+>', '', inner)
    inner = re.sub(r'<span[^>]*>', '<span>', inner)
    inner = inner.replace('index.html', '/').replace('.html', '/')
    return inner.strip()


def elem_html(e):
    t = e['type']
    st = e.get('styles', {}).get('base', {})
    if t == 'text':
        txt = e.get('text', '').strip()
        if not txt:  # Tilda spacer texts (height 10)
            return f'<div class="sp" style="height:{e["base"].get("height", 10)}px"></div>'
        fs = px(st.get('font-size'), 16)
        fw = px(st.get('font-weight'), 400) if 'px' in (st.get('font-weight') or '') else int(re.findall(r'\d+', st.get('font-weight', '400') or '400')[-1])
        col = color(st.get('color'))
        fam = 'ANS' if 'ANS' in (st.get('font-family') or '') else 'Onest'
        style = ''
        if col and col not in ('#1e1e3d', '#ffffff'): style = f' style="color:{col}"'
        if fs >= 56: return f'<h1 class="h1"{style}>{text_html(e)}</h1>'
        if fs >= 36:
            cls = 'h2 accent' if col == '#3939ff' else 'h2'
            return f'<h2 class="{cls}"{style}>{text_html(e)}</h2>'
        if fs >= 28: return f'<h3 class="h3"{style}>{text_html(e)}</h3>'
        if fs >= 22: return f'<p class="lead"{style}>{text_html(e)}</p>'
        if fs >= 18 and fam == 'ANS': return f'<p class="small"{style}>{text_html(e)}</p>'
        if fw >= 600: return f'<p class="strong"{style}>{text_html(e)}</p>'
        if fam == 'ANS' and (st.get('text-transform') == 'uppercase'): return f'<p class="caps"{style}>{text_html(e)}</p>'
        return f'<p{style}>{text_html(e)}</p>'
    if t == 'image':
        src = MAN.get(e.get('src'))
        if not src: return f'<!-- missing image {e.get("src")} -->'
        w, h = e['base'].get('width'), e['base'].get('height')
        img = f'<img class="pic" src="/{src}" alt="{H.escape(e.get("alt") or "")}" width="{w}" height="{h}" loading="lazy">'
        if e.get('href'):
            return f'<a href="{e["href"].replace("index.html", "/").replace(".html", "/")}">{img}</a>'
        return img
    if t == 'button':
        href = (e.get('href') or '#').replace('index.html', '/').replace('.html', '/')
        dark = color(st.get('color')) == '#ffffff' and color(st.get('background-color')) not in ('', '#ffffff')
        return f'<a class="btn btn--{"dark" if dark else "light"}" href="{href}">{H.escape(e.get("text", ""))}</a>'
    if t == 'vector':
        return e.get('svg', '')
    return ''


def group_html(g, depth=0):
    f = g.get('flex', {})
    st = g.get('styles', {}).get('base', {})
    direction = f.get('flexdirection') or st.get('flex-direction') or 'column'
    styles = []
    gap = st.get('row-gap') if direction == 'column' else st.get('column-gap')
    gap = gap or st.get('gap')
    if gap and gap not in ('0', '0px'): styles.append(f'gap:{gap}')
    if direction == 'row': styles.append('flex-direction:row')
    if direction == 'wrap': styles.append('flex-direction:row;flex-wrap:wrap')
    pad = st.get('padding')
    if pad and pad.strip() not in ('0', '0px', '0px 0px 0px 0px', '0 0 0 0'): styles.append(f'padding:{pad.strip()}')
    bg = st.get('background-color')
    if bg and 'transparent' not in bg: styles.append(f'background:{bg}')
    bgi = st.get('background-image', '')
    inline = g.get('inline', '')
    m = re.search(r"url\('?([^')]+)'?\)", inline) or re.search(r"url\('?([^')]+)'?\)", bgi)
    if m and MAN.get(m.group(1)):
        styles.append(f"background-image:url('/{MAN[m.group(1)]}');background-size:cover;background-position:center")
    if 'gradient' in bgi and not m: styles.append(f'background-image:{bgi}')
    r = st.get('border-radius')
    if r and r.split()[0] not in ('0', '0px'): styles.append(f'border-radius:{r.split()[0]}')
    ai = st.get('align-items')
    if ai and ai != 'flex-start': styles.append(f'align-items:{ai}')
    jc = st.get('justify-content')
    if jc and jc not in ('flex-start',): styles.append(f'justify-content:{jc}')
    wm = f.get('widthmode')
    if wm == 'hug': styles.append('width:auto')
    kids = NL.join(child_html(c, depth + 1) for c in g['children'])
    tag = 'a' if g.get('href') else 'div'
    href = f' href="{g["href"].replace("index.html", "/").replace(".html", "/")}"' if g.get('href') else ''
    style = f' style="{";".join(styles)}"' if styles else ''
    ind = '  ' * depth
    return f'{ind}<{tag} class="g"{href}{style}>{NL}{kids}{NL}{ind}</{tag}>'


def child_html(c, depth):
    if c.get('kind') == 'group': return group_html(c, depth)
    h = elem_html(c)
    return ('  ' * depth + h) if h else ''


def is_header(r):
    es = elems(r['children'], [])
    return any(e['type'] == 'image' and (e.get('src') or '').endswith('.svg') for e in es) and sum(e['type'] == 'button' for e in es) >= 2 and r['records_index'] == 0


def record_html(r):
    if 'note' in r:
        m = re.search(r't-rec_p([tb])_(\d+)', r.get('class') or '')
        if m: return f'<div class="sp" style="height:{m.group(2)}px"></div>'
        return ''
    es = elems(r['children'], [])
    types = [e['type'] for e in es]
    if r['records_index'] == 0 and 'button' in types:
        return HEADER
    if 'form' in types:
        title = next((e for e in es if e['type'] == 'text' and px(e['styles'].get('base', {}).get('font-size'), 0) >= 56), None)
        lead = next((e for e in es if e['type'] == 'text' and 20 <= px(e['styles'].get('base', {}).get('font-size'), 0) < 30), None)
        return contact_html(text_html(title) if title else 'Обсудим проект?', text_html(lead) if lead else '')
    if (r.get('bg') or {}).get('background-color') == '#1e1e3d':
        return FOOTER
    pad = (r.get('artboard') or {}).get('padding') or '0px 20px 0px 20px'
    p = pad.split()
    top, bottom = p[0], p[2] if len(p) > 2 else p[0]
    style = f' style="padding-top:{top};padding-bottom:{bottom}"' if (top != '0px' or bottom != '0px') else ''
    body = NL.join(child_html(c, 2) for c in r['children'])
    return f'<section class="rec"{style}>{NL}  <div class="wrap">{NL}{body}{NL}  </div>{NL}</section>'


HEADER = f'''<header class="pill-header">
  <div class="wrap">
    <div class="pill">
      <a class="logo" href="/" aria-label="Казанская проектная мануфактура">{LOGO}</a>
      <nav class="nav">
        <a class="caps" href="/#projects">Проекты</a>
        <a class="caps" href="/#ai">ИИ-решения</a>
        <a class="btn btn--light" href="#form">Связаться</a>
      </nav>
    </div>
  </div>
</header>'''

FOOTER = f'''<footer class="footer">
  <div class="wrap">
    <a class="logo" href="/" aria-label="Казанская проектная мануфактура">{LOGO}</a>
    <div class="footer__links">
      <a href="/privacypolicy/">Политика обработки персональных данных</a>
      <span>ООО “Казанская проектная мануфактура” © 2026</span>
    </div>
  </div>
</footer>'''


def contact_html(title, lead):
    return f'''<section class="section section--contact" id="form">
  <div class="wrap contact">
    <div class="contact__head">
      <h2 class="h1">{title}</h2>
      <p class="lead">{lead}</p>
    </div>
    <div class="contact__grid">
      <form class="panel form" id="lead-form">
        <div class="form__fields">
          <input type="text" name="name" placeholder="Имя" autocomplete="name">
          <input type="text" name="contact" placeholder="Почта, телефон или мессенджер" required>
          <textarea name="task" placeholder="Краткое описание задачи"></textarea>
        </div>
        <div class="form__trap" aria-hidden="true"><input type="text" name="form-spec-comments" tabindex="-1" autocomplete="off"></div>
        <button class="btn btn--dark" type="submit">Отправить</button>
        <p class="form__consent">Нажимая на&nbsp;кнопку, вы соглашаетесь с <a href="/privacypolicy/">политикой обработки персональных данных</a></p>
        <p class="form__consent form__status" role="status" aria-live="polite"></p>
      </form>
      <div class="contact__side">
        <div class="panel contact__card">
          <p class="lead">Телефон</p>
          <div><p><a href="tel:+79172848737">+7 917 284-87-37</a></p><p>09:00-20:00 (МСК)<br>С понедельника по пятницу</p></div>
        </div>
        <div class="panel contact__card">
          <p class="lead">Почта</p>
          <p><a href="mailto:alex@kazan-project-manufactory.ru">alex@kazan-project-manufactory.ru</a></p>
        </div>
      </div>
    </div>
  </div>
</section>'''

FORM_JS = '<script src="/assets/form.js" defer></script>'


def build(slug):
    p = json.load(open(ROOT / 'extract' / f'{slug}.json'))
    for i, r in enumerate(p['records']): r['records_index'] = i
    body = NL.join(x for x in (record_html(r) for r in p['records']) if x)
    title = H.escape(p['title'] or slug)
    desc = H.escape(p['description'] or '')
    og = next((MAN.get(e.get('src')) for e in elems([r['children'] for r in p['records'] if 'note' not in r], []) if e['type'] == 'image' and e.get('src') and MAN.get(e.get('src'), '').endswith('.webp')), 'assets/og.png')
    page = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{title} — Казанская Проектная Мануфактура</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://kazan-project-manufactory.ru/{og}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="icon" type="image/svg+xml" href="/assets/favicon-light.svg" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="/assets/favicon-dark.svg" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="page">

{body}

{FORM_JS}
</body>
</html>
'''
    out = ROOT / slug / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding='utf-8')
    print(f'{slug}/index.html  {len(page) // 1024} KB, {len(p["records"])} records')


if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['--all']:
        args = [f.stem for f in sorted((ROOT / 'extract').glob('*.json')) if not f.name.startswith('_') and f.stem != 'index']
    for s in args: build(s)
