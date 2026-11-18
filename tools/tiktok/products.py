#!/usr/bin/env python3
"""Merge TikTok product-level GMV (Partner Center "Product Analytics", Olala MCN) into tiktok/data/.

Usage:
  python3 tools/tiktok/products.py --data tiktok/data --rows product_rows.csv --items product_items.csv

product_rows.csv  date,creator,product_id,gmv,live_direct_gmv,video_direct_gmv,items,orders
                  one row per day x creator x product with GMV > 0 (window.__tp.csv of ttProd in pull_partner.js)
product_items.csv product_id,name,shop   (window.__tp.items)

Writes
  product_daily.csv  date,creator,channel,product_id,gmv,live_direct_gmv,video_direct_gmv,items,orders
                     every (date, creator) in the input replaces the stored rows for that date & creator
  products.csv       product_id,name,shop,brand   (upsert by product_id; brand recomputed for every product)

Brand: the shop name, cleaned ("La Roche-Posay Việt Nam" -> "La Roche-Posay"), except for HannahOlala's own shop, which sells
several brands: there the brand is read from the product name ("[HANNAH] THE WHOO - ..." -> "THE WHOO").
tools/tiktok/brand_map.csv (kind,key,brand) overrides both: kind "shop" matches a shop name exactly, kind "name" matches
a text inside an own-shop product name (case-insensitive, first match in file order wins).
Only the standard library is used.
"""
import argparse, csv, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OWN_SHOPS = {'HannahOlala'}
HO_CREATORS = {'hannaholala'}
# brands sold in HannahOlala's own shop, matched inside the product name (longest first)
OWN_BRANDS = ['THE WHOO', 'WHOO', 'DAVID HEALTH', 'CNP', 'OHUI', 'SU:M37', 'SUM37', 'BELIF', 'SULWHASOO', 'INNISFREE',
              'LANEIGE', 'HERA', 'ESTEE LAUDER', 'LANCOME', 'KIEHL', 'SHISEIDO', 'CLINIQUE', 'DR.JART', 'AHC', 'MEDIHEAL']
STRIP = re.compile(r'\s*(-\s*)?(official\s*(store|shop)?|offical\s*store|store|mall|shop\s*&\s*more|chính hãng|việt nam|vietnam|viet nam|vn)\s*$', re.I)


def read(p):
    if not p or not os.path.exists(p):
        return []
    with open(p, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write(p, header, rows):
    with open(p, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def clean_shop(s):
    s = (s or '').strip()
    for _ in range(3):
        t = STRIP.sub('', s).strip(' -')
        if t == s:
            break
        s = t
    if re.fullmatch(r'[a-z]+vietnam', s.lower()):
        s = s[:-7]
    return s or 'Chưa xác định'


def own_brand(name, rules):
    up = (name or '').upper()
    for key, brand in rules:
        if key.upper() in up:
            return brand
    for b in sorted(OWN_BRANDS, key=len, reverse=True):
        if b in up:
            return 'THE WHOO' if b == 'WHOO' else ('SU:M37' if b == 'SUM37' else b)
    m = re.match(r'^(?:[^\[]*)\[[^\]]*\]\s*(?:COMBO\s*\d+\s*-\s*)?([^-–\[]{2,30}?)\s*[-–]', name or '')
    return m.group(1).strip().upper() if m else 'HannahOlala (khác)'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--rows')
    ap.add_argument('--items')
    a = ap.parse_args()
    over = read(os.path.join(HERE, 'brand_map.csv'))
    shop_map = {r['key']: r['brand'] for r in over if r.get('kind') == 'shop'}
    name_rules = [(r['key'], r['brand']) for r in over if r.get('kind') == 'name']

    ip = os.path.join(a.data, 'products.csv')
    info = {r['product_id']: r for r in read(ip)}
    for r in read(a.items):
        old = info.get(r['product_id'], {})
        info[r['product_id']] = {'product_id': r['product_id'], 'name': r.get('name') or old.get('name', ''),
                                 'shop': r.get('shop') or old.get('shop', '')}
    for r in info.values():
        shop = r.get('shop', '')
        r['brand'] = shop_map.get(shop) or (own_brand(r.get('name', ''), name_rules) if shop in OWN_SHOPS else clean_shop(shop))
    write(ip, ['product_id', 'name', 'shop', 'brand'],
          [[r['product_id'], r['name'], r['shop'], r['brand']] for r in sorted(info.values(), key=lambda r: r['product_id'])])

    dp = os.path.join(a.data, 'product_daily.csv')
    hd = ['date', 'creator', 'channel', 'product_id', 'gmv', 'live_direct_gmv', 'video_direct_gmv', 'items', 'orders']
    new = read(a.rows)
    rep = {(r['date'], r['creator']) for r in new}
    rows = [r for r in read(dp) if (r['date'], r['creator']) not in rep]
    for r in new:
        r['channel'] = 'HO' if r['creator'].lower() in HO_CREATORS else 'MCN'
        rows.append(r)
    rows.sort(key=lambda r: (r['date'], r['creator'], -float(r['gmv'] or 0)))
    write(dp, hd, [[r.get(h, '') for h in hd] for r in rows])

    miss = {r['product_id'] for r in new} - set(info)
    by = {}
    for r in rows:
        b = info.get(r['product_id'], {}).get('brand', 'Chưa xác định')
        by[b] = by.get(b, 0) + float(r['gmv'] or 0)
    days = sorted({r['date'] for r in rows})
    print(f'product_daily.csv: {len(rows)} dòng, {days[0] if days else "-"}..{days[-1] if days else "-"}; '
          f'{len(rep)} ngày x creator mới; products.csv: {len(info)} sản phẩm, {len(set(r["brand"] for r in info.values()))} brand')
    print('Top brand:', ', '.join(f'{b} {v/1e9:.2f} tỷ' for b, v in sorted(by.items(), key=lambda x: -x[1])[:12]))
    if miss:
        print('CẢNH BÁO: sản phẩm không có trong products.csv:', len(miss))
        sys.exit(2)


if __name__ == '__main__':
    main()
