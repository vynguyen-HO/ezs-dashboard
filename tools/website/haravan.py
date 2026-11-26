#!/usr/bin/env python3
"""Scom (Hannaholala.com) từ báo cáo Haravan -> website/data  (thay nguồn sheet Get Last, từ 26/11/2026)

Hai báo cáo xuất trong Haravan admin > Báo cáo (nút Xuất, file .xlsx về Downloads):
  --daily  "Tháng hiện tại" (reports/sales/100755): Ngày, Đơn hàng, Doanh thu, ... — tổng mọi kênh Haravan,
           đã bỏ đơn huỷ (bộ lọc của báo cáo). Xuất được cả khoảng dài trong 1 file (1 dòng / ngày).
  --sku    "EZS Dashboard – Scom theo ngày" (reports/sales/1000061407): Ngày, Sản phẩm, Thương hiệu, Loại sản phẩm,
           Barcode, Đơn hàng, Doanh thu — theo sản phẩm. Chỉ xuất được 1 ngày / file (khoảng dài thì Haravan không trả file).

Ghi:
  web_daily.csv      mỗi ngày có trong --daily: 1 dòng kênh 'web' (= Scom, mọi kênh Haravan): orders, gmv = Doanh thu
                     (số Haravan, không còn tách harasocial / livestream); qty để trống (báo cáo không có số lượng)
  web_sku_daily.csv  mỗi ngày có trong --sku: thay các dòng của ngày đó; sku = Barcode (trống thì tên SP), camp = Loại SP,
                     orders = đơn có SP đó (một đơn nhiều SP được đếm ở mỗi SP), gmv = Doanh thu
  web_items.csv      sku -> brand, tên SP
--merge-channels: gộp kênh harasocial / livestream của các dòng cũ (từ sheet) vào 'web', để Scom = mọi kênh Haravan.
Chỉ có số tổng hợp, không có thông tin khách. Cần openpyxl (~/.venvs/ezs/bin/python).

Usage: ~/.venvs/ezs/bin/python tools/website/haravan.py --data website/data --daily ~/Downloads/thang-hien-tai_….xlsx --sku ~/Downloads/ezs-dashboard-scom-theo-ngay_….xlsx [...]
"""
import argparse, os, sys
from collections import defaultdict
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update import read_csv, write_csv  # noqa: E402

HD = ['date', 'channel', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv']
HS = ['date', 'channel', 'sku', 'brand', 'camp', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv']


def dmy(s):
    s = str(s).strip()[:10]
    d, m, y = s.split('/') if '/' in s else (s[8:10], s[5:7], s[:4])
    return f'{int(y):04d}-{int(m):02d}-{int(d):02d}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--daily', nargs='*', default=[])
    ap.add_argument('--sku', nargs='*', default=[])
    ap.add_argument('--merge-channels', action='store_true')
    a = ap.parse_args()
    p_d, p_s, p_i = (os.path.join(a.data, f) for f in ('web_daily.csv', 'web_sku_daily.csv', 'web_items.csv'))
    D, S = read_csv(p_d), read_csv(p_s)
    items = {r['sku']: (r['brand'], r['name']) for r in read_csv(p_i)}

    # --sku: product rows per day
    new_s, qty = {}, defaultdict(int)
    for p in a.sku:
        x = pd.read_excel(os.path.expanduser(p), dtype=str).fillna('')
        for r in x.itertuples(index=False):
            r = dict(zip(x.columns, r))
            if not r.get('Ngày'):
                continue
            d = dmy(r['Ngày']); sku = (r.get('Barcode') or '').strip()
            if not sku or sku == '--':
                sku = (r.get('Sản phẩm') or '').strip()[:80]
            brand = (r.get('Thương hiệu') or '').strip() or 'Chưa xác định'
            k = (d, sku, brand, (r.get('Loại sản phẩm') or '').strip() or '–')
            o, g = int(float(r.get('Đơn hàng') or 0)), float(r.get('Doanh thu') or 0)
            v = new_s.setdefault(d, defaultdict(lambda: [0, 0.0]))[k]; v[0] += o; v[1] += g
            qty[d] += o
            items[sku] = (brand, (r.get('Sản phẩm') or '').strip()[:150])
        print(f'sku {os.path.basename(p)}: {len(x)} dòng')
    if new_s:
        S = [r for r in S if r['date'] not in new_s]
        for d, m in new_s.items():
            S += [dict(zip(HS, [d, 'web', sku, b, c, o, '', str(int(round(g))), 0, 0])) for (d_, sku, b, c), (o, g) in m.items()]

    # --daily: one row per day (all Haravan channels, cancelled excluded)
    new_d = {}
    for p in a.daily:
        x = pd.read_excel(os.path.expanduser(p))
        for r in x.itertuples(index=False):
            r = dict(zip(x.columns, r))
            if pd.isna(r.get('Ngày')) or not str(r['Ngày'])[:2].strip().isdigit():
                continue
            new_d[dmy(r['Ngày'])] = (int(r['Đơn hàng']), float(r['Doanh thu']))
        print(f'daily {os.path.basename(p)}: {len(x)} ngày')
    if new_d:
        D = [r for r in D if r['date'] not in new_d]
        D += [dict(zip(HD, [d, 'web', o, '', str(int(round(g))), 0, 0])) for d, (o, g) in new_d.items()]

    if a.merge_channels:
        m = defaultdict(lambda: [0, 0, 0.0, 0, 0.0])
        for r in S:
            k = (r['date'], r['sku'], r['brand'], r['camp'])
            for i, f in enumerate(['orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv']):
                m[k][i] += float(r[f] or 0)
        S = [dict(zip(HS, [d, 'web', s, b, c, int(v[0]), int(v[1]), int(round(v[2])), int(v[3]), int(round(v[4]))])) for (d, s, b, c), v in m.items()]
        md = defaultdict(lambda: [0, 0, 0.0, 0, 0.0])
        for r in D:
            for i, f in enumerate(['orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv']):
                md[r['date']][i] += float(r[f] or 0)
        D = [dict(zip(HD, [d, 'web', int(v[0]), int(v[1]), int(round(v[2])), int(v[3]), int(round(v[4]))])) for d, v in md.items()]

    D.sort(key=lambda r: (r['date'], r['channel'])); S.sort(key=lambda r: (r['date'], r['channel'], -float(r['gmv'] or 0), r['sku']))
    write_csv(p_d, HD, [[r[h] for h in HD] for r in D])
    write_csv(p_s, HS, [[r[h] for h in HS] for r in S])
    write_csv(p_i, ['sku', 'brand', 'name'], [[k, b, n] for k, (b, n) in sorted(items.items())])
    mo, mg = defaultdict(int), defaultdict(float)
    for r in D:
        mo[r['date'][:7]] += int(float(r['orders'] or 0)); mg[r['date'][:7]] += float(r['gmv'] or 0)
    print('web_daily theo tháng: ' + ', '.join(f'{k} {mo[k]} đơn {mg[k] / 1e9:.2f} tỷ' for k in sorted(mo)))
    if new_s:
        for d in sorted(new_s):
            t = sum(g for o, g in new_s[d].values()); dd = new_d.get(d) or next(((int(r['orders']), float(r['gmv'])) for r in D if r['date'] == d), (0, 0))
            print(f'  {d}: tổng theo SP {t / 1e6:.1f} tr, tổng ngày {dd[1] / 1e6:.1f} tr' + ('' if abs(t - dd[1]) < 1 else '  (LỆCH)'))


if __name__ == '__main__':
    main()
