"""Ghép head.part + app.part + core.js + dữ liệu baseline thành 1 file HTML.
  python3 assemble.py            -> deal-compare.html (bản publish lên Claude Artifact, có link sheet mặc định)
  python3 assemble.py --public   -> ../../deal/index.html (bản xem trên EZS Dashboard / GitHub Pages)
Bản --public xoá link Google Sheet mặc định (repo public), thêm noindex và skeleton HTML đầy đủ.
"""
import json, re, sys
h = open('head.part').read(); s = open('app.part').read()
B = open('baseline.json').read().replace('</', '<\\/'); BC = open('bcinfo.json').read().replace('</', '<\\/'); C = open('core.js').read()
out = h + '\n' + s.replace('/*BASELINE*/', B).replace('/*BCINFO*/', BC).replace('/*CORE*/', C)
assert '�' not in out, 'ký tự lỗi U+FFFD trong dữ liệu'
# link Google Sheet mặc định nằm ngoài repo (links.local.json, không commit); bản --public để trống
try: LINKS = json.load(open('links.local.json'))
except FileNotFoundError: LINKS = {}
out = re.sub(r"'(LINK_\d+)'", lambda m: repr('' if '--public' in sys.argv else LINKS.get(m.group(1), '')), out)
if '--public' in sys.argv:
    out = re.sub(r"'https://docs\.google\.com/spreadsheets/[^']*'", "''", out)
    out = out.replace('<meta name="claude:viewport-fit-sides" content="cover">', '<meta name="robots" content="noindex">\n<meta name="claude:viewport-fit-sides" content="cover">', 1)
    out = out.replace("'Chế độ chỉ xem: không kết nối được kho dữ liệu, đang hiện baseline.'",
                      "'Bản xem trên EZS Dashboard · dữ liệu baseline Mega 11.11 (import 18/11). Update deal mới làm trên artifact Deal Compare gốc.'")
    assert 'docs.google.com/spreadsheets' not in out
    skel = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}'
            'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n')
    out = skel + out + '\n</body></html>'
    dst = '../../deal/index.html'
else:
    dst = 'deal-compare.html'
open(dst, 'w').write(out); print(dst, len(out))
