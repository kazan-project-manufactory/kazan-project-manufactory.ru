#!/usr/bin/env python3
"""Extract Tilda Zero Block (t396) structure from the wget mirror into JSON.

Usage: python3 tools/extract_zero.py [page.html ...]   (default: all pages in tilda/)
Output: extract/<slug>.json — records → artboard → nested flex groups → elements
with base (1200+) and 320 values plus atom CSS pulled from the inline <style> blocks.
"""
import json, re, sys, html
from pathlib import Path
from lxml import html as lh

ROOT = Path(__file__).resolve().parent.parent
MIRROR = ROOT / 'tilda' / 'kazan-project-manufactory.ru'
OUT = ROOT / 'extract'
STYLE_KEYS = ('font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color',
              'background-image', 'border-radius', 'text-transform', 'letter-spacing', 'text-align',
              'opacity', 'border-width', 'border-color', 'background-size', 'background-position')


def parse_css(text):
    """Return {(media, selector): {prop: val}} for all rules in a stylesheet string."""
    rules = {}
    # split media blocks first
    pos = 0
    for m in re.finditer(r'@media[^{]*\{', text):
        # rules before this media block are base
        base = text[pos:m.start()]
        _collect(base, '', rules)
        depth, i = 1, m.end()
        while depth and i < len(text):
            if text[i] == '{': depth += 1
            elif text[i] == '}': depth -= 1
            i += 1
        media = re.search(r'max-width:\s*(\d+)px', m.group(0))
        _collect(text[m.end():i - 1], media.group(1) if media else m.group(0), rules)
        pos = i
    _collect(text[pos:], '', rules)
    return rules


def _collect(block, media, rules):
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', block):
        props = {}
        for p in body.split(';'):
            if ':' in p:
                k, v = p.split(':', 1)
                props[k.strip()] = v.strip()
        for s in sel.split(','):
            rules.setdefault((media, s.strip()), {}).update(props)


def atom_styles(rules, rec, elem_id):
    out = {}
    for media in ('', '1199', '959', '639', '479'):
        sel = f'#{rec} .tn-elem[data-elem-id="{elem_id}"] .tn-atom'
        props = rules.get((media, sel), {})
        picked = {k: v for k, v in props.items() if k in STYLE_KEYS}
        if picked:
            out[media or 'base'] = picked
    return out


def field(el, name, res=None):
    key = f'data-field-{name}-res-{res}-value' if res else f'data-field-{name}-value'
    return el.get(key)


def group_attr(el, name, res=None):
    key = f'data-group-{name}-res-{res}-value' if res else f'data-group-{name}-value'
    v = el.get(key)
    if v is None and res is None:
        v = el.get(f'data-group-{name}')
    return v


def elem_json(el, rules, rec):
    eid = el.get('data-elem-id')
    etype = el.get('data-elem-type')
    atom = el.find('.//*[@class="tn-atom"]')
    if atom is None:
        atom = el.find('.//div') if etype != 'form' else el
    d = {
        'id': eid, 'type': etype,
        'base': {k: field(el, k) for k in ('top', 'left', 'width', 'height', 'fontsize', 'widthmode', 'heightmode', 'textfit')},
        'r320': {k: field(el, k, 320) for k in ('top', 'left', 'width', 'height', 'fontsize')},
        'r960': {k: field(el, k, 960) for k in ('width', 'fontsize')},
        'styles': atom_styles(rules, rec, eid),
    }
    d['base'] = {k: v for k, v in d['base'].items() if v is not None}
    d['r320'] = {k: v for k, v in d['r320'].items() if v is not None}
    d['r960'] = {k: v for k, v in d['r960'].items() if v is not None}
    if etype == 'text' and atom is not None:
        inner = lh.tostring(atom, encoding='unicode', method='html')
        inner = re.sub(r'^<[^>]+>|</[^>]+>$', '', inner.strip())
        d['html'] = inner.strip()
        d['text'] = html.unescape(re.sub(r'<br\s*/?>', '\n', re.sub(r'<(?!br)[^>]+>', '', inner))).strip()
    elif etype == 'image':
        img = el.find('.//img')
        if img is not None:
            d['src'] = img.get('src') or img.get('data-original')
            d['alt'] = img.get('alt', '')
        a = el.find('.//a')
        if a is not None: d['href'] = a.get('href')
    elif etype == 'button':
        a = el.find('.//a')
        if a is not None:
            d['href'] = a.get('href'); d['text'] = a.text_content().strip()
    elif etype == 'vector':
        svg = el.find('.//svg')
        if svg is not None: d['svg'] = lh.tostring(svg, encoding='unicode')
    elif etype == 'form':
        d['form'] = lh.tostring(el, encoding='unicode')[:4000]
        inputs = [(i.get('name'), i.get('placeholder')) for i in el.iter('input', 'textarea') if i.get('type') != 'hidden']
        d['inputs'] = inputs
    return d


def group_json(g, rules, rec):
    d = {
        'kind': 'group', 'id': g.get('data-group-id'),
        'flex': {k: group_attr(g, k) for k in ('flexdirection', 'flexalignitems', 'flexjustifycontent', 'padding', 'widthmode', 'heightmode', 'width', 'height', 'top', 'left', 'gap', 'flexwrap')},
        'r320': {k: group_attr(g, k, 320) for k in ('width', 'height', 'top', 'left')},
        'children': [],
    }
    if g.get('href'): d['href'] = g.get('href')
    d['flex'] = {k: v for k, v in d['flex'].items() if v is not None}
    d['r320'] = {k: v for k, v in d['r320'].items() if v is not None}
    mol = next((c for c in g if 'tn-molecule' in c.get('class', '')), None)
    container = mol if mol is not None else g
    if mol is not None:
        gid = g.get('data-group-id')
        d['tag'] = mol.tag
        if mol.get('href'): d['href'] = mol.get('href')
        if mol.get('style'): d['inline'] = mol.get('style')
        cls = mol.get('class', '').replace('tn-molecule', '').strip()
        if cls: d['class'] = cls
        st = {}
        for media in ('', '1199', '959', '639', '479'):
            props = rules.get((media, f'#{rec} .tn-group[data-group-id="{gid}"] #molecule-{gid}'), {})
            picked = {k: v for k, v in props.items() if k in STYLE_KEYS + ('padding', 'row-gap', 'column-gap', 'gap', 'justify-content', 'align-items', 'flex-direction', 'overflow', 'border-style', 'box-shadow')}
            if picked: st[media or 'base'] = picked
        if st: d['styles'] = st
    for child in container:
        cls = child.get('class', '')
        if 'tn-group' in cls:
            d['children'].append(group_json(child, rules, rec))
        elif 'tn-elem' in cls:
            d['children'].append(elem_json(child, rules, rec))
    return d


def page_json(path):
    doc = lh.fromstring(path.read_text(encoding='utf-8', errors='surrogateescape'))
    css = '\n'.join(s.text_content() for s in doc.iter('style'))
    rules = parse_css(css)
    title = doc.findtext('.//title') or ''
    desc = next((m.get('content') for m in doc.iter('meta') if m.get('name') == 'description'), '')
    recs = []
    for rec in doc.xpath('//div[starts-with(@id,"rec") and contains(@class,"t-rec")]'):
        rid = rec.get('id')
        ab = rec.find('.//*[@data-artboard-recid]')
        if ab is None or 't396__artboard' not in ab.get('class', ''):
            recs.append({'rec': rid, 'class': rec.get('class'), 'note': 'non-zero block', 'html': lh.tostring(rec, encoding='unicode')[:600]})
            continue
        r = {
            'rec': rid, 'rec_class': rec.get('class'),
            'artboard': {k: ab.get(f'data-artboard-{k}') for k in ('height', 'heightmode', 'padding', 'flexdirection', 'flexalignitems', 'flexjustifycontent', 'upscale', 'valign')},
            'artboard_320': {k: ab.get(f'data-artboard-{k}-res-320') for k in ('height', 'padding')},
            'bg': rules.get(('', f'#{rid} .t396__artboard'), {}),
            'children': [],
        }
        for child in ab:
            cls = child.get('class', '')
            if 'tn-group' in cls:
                r['children'].append(group_json(child, rules, rid))
            elif 'tn-elem' in cls:
                r['children'].append(elem_json(child, rules, rid))
        recs.append(r)
    return {'slug': path.stem, 'title': title, 'description': desc, 'records': recs}


def summary(pages):
    fonts, colors, sizes = {}, {}, {}
    def walk(n):
        if isinstance(n, dict):
            st = n.get('styles', {}).get('base', {})
            if 'font-family' in st: fonts[st['font-family']] = fonts.get(st['font-family'], 0) + 1
            for k in ('color', 'background-color'):
                if k in st: colors[st[k]] = colors.get(st[k], 0) + 1
            if n.get('type') == 'text' and 'font-size' in st:
                key = f"{st['font-size']}/{st.get('font-weight','')}/{st.get('line-height','')}"
                sizes[key] = sizes.get(key, 0) + 1
            for c in n.get('children', []): walk(c)
        elif isinstance(n, list):
            for c in n: walk(c)
    for p in pages: walk(p['records'])
    return {'fonts': fonts, 'colors': dict(sorted(colors.items(), key=lambda x: -x[1])), 'text_styles': dict(sorted(sizes.items(), key=lambda x: -x[1]))}


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    files = [Path(a) for a in sys.argv[1:]] or sorted(MIRROR.glob('*.html'))
    pages = []
    for f in files:
        p = page_json(f)
        pages.append(p)
        (OUT / f'{f.stem}.json').write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding='utf-8')
        n = sum(1 for _ in json.dumps(p).split('"type":')) - 1
        print(f'{f.stem}: {len(p["records"])} records, {n} elements')
    (OUT / '_summary.json').write_text(json.dumps(summary(pages), ensure_ascii=False, indent=1), encoding='utf-8')
    print('summary → extract/_summary.json')
