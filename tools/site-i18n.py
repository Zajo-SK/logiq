# -*- coding: utf-8 -*-
"""Post-processes translated website pages (info/<code>/<page>.html, translated from the Slovak pages in info/):
 - fixes relative URLs for the extra directory level, sets <html lang/dir>, loads rtl css, adds a language switcher.
Usage: python3 tools/site-i18n.py"""
import io, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'info')
LANGS = [('sk', 'Slovenčina'), ('en', 'English'), ('cs', 'Čeština'), ('pl', 'Polski'), ('hu', 'Magyar'), ('uk', 'Українська'), ('de', 'Deutsch'), ('es', 'Español'), ('fr', 'Français'), ('pt', 'Português'), ('ru', 'Русский'), ('zh', '中文'), ('ja', '日本語'), ('hi', 'हिन्दी'), ('ar', 'العربية')]
PAGES = ['index.html', 'pre-nadanych.html', 'svp.html', 'pre-ucitelov.html', 'pre-rodicov.html', 'faq.html']

def switcher(code, page):
    opts = ''.join('<option value="%s"%s>%s</option>' % (('../%s/%s' % (c, page)) if c != 'sk' else ('../' + page), ' selected' if c == code else '', n) for c, n in LANGS)
    return '<label class="langsel"><span aria-hidden="true">🌐</span><select aria-label="Language" onchange="location.href=this.value">%s</select></label>' % opts

for code, _ in LANGS:
    if code == 'sk':
        continue
    d = os.path.join(ROOT, code)
    if not os.path.isdir(d):
        continue
    for page in PAGES:
        p = os.path.join(d, page)
        if not os.path.exists(p):
            continue
        s = io.open(p, encoding='utf-8').read()
        s = re.sub(r'<html lang="[^"]*"', '<html lang="%s" dir="%s"' % (code, 'rtl' if code == 'ar' else 'ltr'), s, count=1)
        s = s.replace('href="site.css"', 'href="../site.css"').replace('../icons/', '../../icons/')
        s = re.sub(r'href="\.\./(#/[^"]*)?"', lambda m: 'href="../../%s"' % (m.group(1) or ''), s)
        s = s.replace('href="../#/', 'href="../../#/') if False else s
        s = re.sub(r'<label class="langsel">.*?</label>', '', s, flags=re.S)
        s = s.replace('<a class="btn gold" href="../../">', switcher(code, page) + '<a class="btn gold" href="../../">', 1)
        io.open(p, 'w', encoding='utf-8').write(s)
    print('processed', code)
# Slovak pages get the switcher too
for page in PAGES:
    p = os.path.join(ROOT, page); s = io.open(p, encoding='utf-8').read(); s = re.sub(r'<label class="langsel">.*?</label>', '', s, flags=re.S)
    opts = ''.join('<option value="%s"%s>%s</option>' % ((c + '/' + page) if c != 'sk' else page, ' selected' if c == 'sk' else '', n) for c, n in LANGS if c == 'sk' or os.path.isdir(os.path.join(ROOT, c)))
    s = s.replace('<a class="btn gold" href="../">', '<label class="langsel"><span aria-hidden="true">🌐</span><select aria-label="Language" onchange="location.href=this.value">%s</select></label><a class="btn gold" href="../">' % opts, 1)
    io.open(p, 'w', encoding='utf-8').write(s)
print('done')
