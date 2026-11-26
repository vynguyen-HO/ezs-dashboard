#!/usr/bin/env python3
"""Category cấp 1 / 2 / 3 theo sản phẩm cho dashboard v2 -> category/data/item_cat.csv  (pf,id,c1,c2,c3,est)

  pf  sh = Shopee item_id, tt = TikTok product_id, wb = mã SKU Haravan (Hannaholala.com)
  est 0 = category Shopee của chính sản phẩm (global category lv1/lv2/lv3 trong báo cáo Affiliate)
      1 = ước tính: TikTok và Haravan không có category, lấy category của sản phẩm Shopee cùng brand có tên gần nhất
          (trùng từ trong tên); không có sản phẩm cùng brand đủ gần thì lấy sản phẩm Shopee gần nhất mọi brand nếu đủ giống.

Usage: python3 tools/category/build.py --scan ~/Downloads [--data .]
  --scan: đọc mọi <acc>_cats_<date>.csv (tools/shopee/pull_cats.js: item_id,cat1,cat2,cat3) và <acc>_aff_<date>.csv có cột cat1/cat2[/cat3]
  Category đã lưu trong item_cat.csv được giữ khi file mới không có sản phẩm đó; file mới (mtime sau) ghi đè.
  Shopee item chưa có trong file nào: lấy cột category (cấp 2) của shopee/data/items.csv và cấp 1 suy từ cấp 2.
Chỉ dùng thư viện chuẩn.
"""
import argparse, csv, glob, os, re, unicodedata
from collections import Counter, defaultdict


def read(p):
    if not os.path.exists(p): return []
    with open(p, newline='', encoding='utf-8-sig') as f: return list(csv.DictReader(f))


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '')).replace('đ', 'd').replace('Đ', 'D')
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().translate(CYR)


CYR = str.maketrans('аеорсухіјѕкмтнв', 'aeopcyxijskmthb')   # chữ Kirin giống Latin (như v2/app.js)


BSTOP = re.compile(r'(laboratory|laboratories|officialstore|official|store|vietnam|vn|paris|professional|beauty|cosmetics|korea)$')
import sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'brand'))
from alias import load as _load_alias  # noqa: E402
BALIAS = _load_alias()[0]   # tools/brand/brand_alias.csv


def bk(s):   # same brand key as v2/app.js bk()
    k = re.sub(r'[^a-z0-9]', '', norm(s))
    if len(k) >= 6 and k.startswith('the'): k = k[3:]
    for _ in range(2):
        k2 = BSTOP.sub('', k)
        if len(k2) >= 3: k = k2
    return BALIAS.get(k, k)


STOPW = set('va cho cua voi the and with for set bo combo hop chai tuyp deal hang chinh hannah official mall qua tang'.split())


def toks(s):
    s = re.sub(r'^\s*(deal\s*\d+\s*:|\[[^\]]*\]|【[^】]*】)\s*', '', norm(s))
    return {t for t in re.findall(r'[a-z]+|\d+', s) if (len(t) >= 2 or t.isdigit()) and t not in STOPW and not re.fullmatch(r'\d{5,}', t)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--scan', required=True); ap.add_argument('--data', default='.')
    a = ap.parse_args(); R = a.data
    out_p = os.path.join(R, 'category/data/item_cat.csv')
    old = {(r['pf'], r['id']): r for r in read(out_p)}
    cat = {k[1]: (r['c1'], r['c2'], r['c3']) for k, r in old.items() if k[0] == 'sh' and r['est'] == '0'}
    files = sorted(glob.glob(os.path.join(os.path.expanduser(a.scan), '*_cats_*.csv')) + glob.glob(os.path.join(os.path.expanduser(a.scan), '*_aff_*.csv')), key=os.path.getmtime)
    for p in files:
        for r in read(p):
            if not r.get('cat1') or not r.get('item_id'): continue
            c = (r['cat1'].strip(), (r.get('cat2') or '').strip(), (r.get('cat3') or '').strip())
            prev = cat.get(r['item_id'])
            if prev and prev[2] and not c[2]: continue   # file cũ không có cấp 3: giữ bản có cấp 3
            cat[r['item_id']] = c
    # cấp 2 -> cấp 1 (cho item chỉ có cột category cũ)
    up = Counter((c[1], c[0]) for c in cat.values() if c[1])
    c2to1 = {}
    for (c2, c1), n in up.most_common():
        c2to1.setdefault(c2, c1)
    items = read(os.path.join(R, 'shopee/data/items.csv'))
    rows, sh = [], []
    for it in items:
        i = it['item_id']; c = cat.get(i); est = '0'
        if not c and it.get('category') and it['category'] in c2to1: c = (c2to1[it['category']], it['category'], '')
        if not c: continue
        rows.append(['sh', i, *c, est])
        sh.append((bk(it.get('brand')), toks(it.get('title')), c))
    # index Shopee items theo brand và theo từ
    byb, byt = defaultdict(list), defaultdict(set)
    for n, (b, ts, c) in enumerate(sh):
        byb[b].append(n)
        for t in ts: byt[t].add(n)

    def guess(brand, name):
        ts = toks(name)
        if not ts: return None
        best, bs = None, 0
        for n in byb.get(bk(brand), []):
            j = len(ts & sh[n][1]) / len(ts | sh[n][1]) if sh[n][1] else 0
            if j > bs: best, bs = n, j
        if best is not None and bs >= .15: return sh[best][2]
        cand = Counter(n for t in ts for n in byt.get(t, ()))
        for n, _ in cand.most_common(40):
            j = len(ts & sh[n][1]) / len(ts | sh[n][1])
            if j > bs: best, bs = n, j
        if best is not None and bs >= .35: return sh[best][2]
        if byb.get(bk(brand)):   # brand chỉ có một nhóm hàng trên Shopee: lấy category phổ biến nhất của brand
            cc = Counter(sh[n][2] for n in byb[bk(brand)]); (top, k), = cc.most_common(1)
            if k / sum(cc.values()) >= .6: return top
        return None

    n_tt = n_wb = 0
    tt = read(os.path.join(R, 'tiktok/data/products.csv'))
    for p in tt:
        c = guess(p.get('brand'), p.get('name'))
        if c: rows.append(['tt', p['product_id'], *c, '1']); n_tt += 1
    wb = read(os.path.join(R, 'website/data/web_items.csv'))
    for p in wb:
        c = guess(p.get('brand'), p.get('name'))
        if c: rows.append(['wb', p['sku'], *c, '1']); n_wb += 1
    os.makedirs(os.path.dirname(out_p), exist_ok=True)
    with open(out_p, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['pf', 'id', 'c1', 'c2', 'c3', 'est']); w.writerows(rows)
    n_sh = sum(1 for r in rows if r[0] == 'sh')
    print(f'Shopee {n_sh}/{len(items)} item (cấp 3: {sum(1 for r in rows if r[0]=="sh" and r[4])}) · TikTok {n_tt}/{len(tt)} · Scom {n_wb}/{len(wb)} -> {out_p}')


if __name__ == '__main__':
    main()
