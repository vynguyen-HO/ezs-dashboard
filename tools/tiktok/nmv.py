#!/usr/bin/env python3
"""NMV TikTok theo tháng × shop -> tiktok/data/shop_nmv_monthly.csv  (month,shop_code,shop,gmv,nmv,orders)

Nguồn: sheet "Hannah Olala wkf" (id 11uxyUncQYxPqZ5eQmSb9SE3ZmtrfhhOl5ZwB1BGNtQ8), tab "PFM T1-T10 2026":
cột Tháng, Shop code, Shop name, Gross GMV ($), Order, Cancel GMV ($), NMV ($), GMV (VND), NMV (VND) (VND quy theo tỷ giá ô B1).
Đọc bằng Sheets get_values range 'PFM T1-T10 2026'!A4:L<n> (JSON {range, values}), năm mặc định 2026.
Dashboard dùng tỷ lệ NMV/GMV của shop trong tháng nhân với GMV từng sản phẩm của shop (products.csv cột shop);
shop không có trong sheet dùng tỷ lệ chung của tháng; tháng chưa có trong sheet thì NMV TikTok để trống.
Usage: python3 tools/tiktok/nmv.py --data tiktok/data --sheet values.json [--year 2026]
"""
import argparse, csv, json, os


def num(s):
    s = str(s or '').replace('$', '').replace(',', '').strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--data', required=True); ap.add_argument('--sheet', required=True); ap.add_argument('--year', default='2026')
    a = ap.parse_args()
    o = json.load(open(a.sheet, encoding='utf-8')); v = (o.get('content') or o)['values']
    new = {}
    for r in v:
        if len(r) < 9 or not str(r[0]).strip().isdigit():
            continue
        m = f'{a.year}-{int(r[0]):02d}'
        new[(m, r[1].strip())] = [m, r[1].strip(), r[2].strip(), round(num(r[7])), round(num(r[8])), int(num(r[4]))]
    out = os.path.join(a.data, 'shop_nmv_monthly.csv')
    old = {}
    if os.path.exists(out):
        for r in csv.DictReader(open(out, encoding='utf-8')):
            old[(r['month'], r['shop_code'])] = [r['month'], r['shop_code'], r['shop'], r['gmv'], r['nmv'], r['orders']]
    months = {k[0] for k in new}
    rows = {k: x for k, x in old.items() if k[0] not in months}; rows.update(new)
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['month', 'shop_code', 'shop', 'gmv', 'nmv', 'orders'])
        w.writerows(sorted(rows.values(), key=lambda x: (x[0], -float(x[3]))))
    agg = {}
    for x in rows.values():
        g = agg.setdefault(x[0], [0, 0]); g[0] += float(x[3]); g[1] += float(x[4])
    for m in sorted(agg):
        print(f'{m}: GMV {agg[m][0] / 1e9:.2f} tỷ, NMV {agg[m][1] / 1e9:.2f} tỷ, huỷ {1 - agg[m][1] / agg[m][0]:.1%}')


if __name__ == '__main__':
    main()
