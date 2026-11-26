#!/usr/bin/env python3
"""Backfill website/data from old monthly "Get Last Sheet" files (one sheet per month, tab Final, same columns as the
live sheet in tools/website/UPDATE.md). The files overlap (an order can sit in two months' files, with a newer status
in the later one) and none holds a full history, so:

  * an order (Mã đơn hàng) is taken from the LAST file given that contains it (pass files oldest month first);
    all of its lines come from that file, so a line is never counted twice;
  * only days the archive does not have yet are added: days already archived come from the live sheet, whose
    cancel statuses are fresher (checked 26/11/2026: the OCT file overwrote 01-19/11 with ~250 more non-cancelled orders
    than Haravan's own report).

Inputs per file: the JSON results of the Sheets get_values tool for 3 ranges of tab Final, from row 3:
  A3:A<n>   Mã đơn hàng
  N3:T<n>   Kênh bán hàng, Ngày đặt hàng, Phí vận chuyển, Số tiền giảm, Mã Coupon, Trạng thái huỷ, Lý do huỷ
  V3:AA<n>  Tên sản phẩm, Mã sản phẩm, Hãng, Số lượng sản phẩm, Giá sản phẩm, Tên Camp
Privacy: order ids are only used in memory to de-duplicate and count orders; only per day / channel / SKU numbers
are written (the site is public).

Usage:
  python3 tools/website/backfill.py --data website/data --since 2025-12-30 --file JAN A.json NT.json VA.json --file FEB ... [--dry]
Done 26/11/2026 with the JAN..JUL and OCT 2026 sheets: archive from 30/12/2025 (earlier days only had stray orders).
"""
import argparse, os, sys
from collections import defaultdict
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update import CHANNELS, vals, cell, num, day, read_csv, write_csv  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--file', nargs=4, action='append', metavar=('LABEL', 'A', 'NT', 'VA'), required=True)
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--since', default='2020-01-01', help='bỏ đơn đặt trước ngày này (ngày lẻ ở đầu file)')
    a = ap.parse_args()

    orders = {}          # oid -> (label, [lines])
    names, skipped = {}, defaultdict(int)
    for label, pa, pnt, pva in a.file:
        A, NT, VA = vals(pa), vals(pnt), vals(pva)
        lens = [len(A), len(NT), len(VA)]
        if max(lens) - min(lens) > 3:
            sys.exit(f'{label}: các range lệch số dòng {lens}, đọc lại.')
        here, lo, hi = defaultdict(list), None, None
        for i in range(max(lens)):
            oid, ch, d = cell(A, i, 0), cell(NT, i, 0), day(cell(NT, i, 1))
            if not oid:
                continue
            if ch not in CHANNELS:
                skipped[f'{label} kênh lạ: {ch[:20]}'] += 1; continue
            if not d or d < a.since:
                skipped[f'{label} ngày lỗi'] += 1; continue
            name, sku, brand, qty, price, camp = (cell(VA, i, j) for j in range(6))
            here[oid].append((d, ch, sku, brand, num(qty), num(price), camp, cell(NT, i, 5) == 'Đã huỷ'))
            if sku:
                names[sku] = (brand, name[:150])
            lo, hi = min(lo or d, d), max(hi or d, d)
        dup = sum(1 for o in here if o in orders)
        for o, ls in here.items():
            orders[o] = (label, ls)
        print(f'{label}: {len(here)} đơn, {lo} → {hi}; {dup} đơn đã có ở file trước (lấy bản file này)')
    for k, v in skipped.items():
        print(f'  bỏ qua {v} dòng ({k})')

    dly, sku_agg, cnt = {}, {}, defaultdict(int)
    for oid, (_, ls) in orders.items():
        cnt[ls[0][0]] += 1
        for d, ch, sku, brand, q, p, camp, canc in ls:
            g = q * p
            for z in (dly.setdefault((d, ch), [set(), 0.0, 0.0, set(), 0.0]), sku_agg.setdefault((d, ch, sku, brand, camp), [set(), 0.0, 0.0, set(), 0.0])):
                if canc:
                    z[3].add(oid); z[4] += g
                else:
                    z[0].add(oid); z[1] += q; z[2] += g

    p_d, p_s, p_i = (os.path.join(a.data, f) for f in ('web_daily.csv', 'web_sku_daily.csv', 'web_items.csv'))
    old_d, old_s = read_csv(p_d), read_csv(p_s)
    old_n, new_n = defaultdict(int), defaultdict(int)
    for r in old_d:
        old_n[r['date']] += int(r['orders']) + int(r['cancel_orders'])
    for (d, ch), x in dly.items():
        new_n[d] += len(x[0]) + len(x[3])
    # ngày kho đã có (từ sheet đang chạy, trạng thái huỷ mới hơn) giữ nguyên; file cũ chỉ lấp ngày kho chưa có
    replace = {d for d in new_n if d not in old_n}
    kept = sorted(d for d in new_n if d not in replace)
    print(f'gộp: {len(orders)} đơn, {len(new_n)} ngày; ghi đè {len(replace)} ngày' + (f'; giữ bản trong kho {len(kept)} ngày (kho đã có): {kept[0]} → {kept[-1]}' if kept else ''))

    fmt = lambda v: str(int(round(v)))
    D = [[r['date'], r['channel'], r['orders'], r['qty'], r['gmv'], r['cancel_orders'], r['cancel_gmv']] for r in old_d if r['date'] not in replace]
    D += [[d, ch, len(x[0]), fmt(x[1]), fmt(x[2]), len(x[3]), fmt(x[4])] for (d, ch), x in dly.items() if d in replace]
    D.sort(key=lambda r: (r[0], r[1]))
    S = [[r['date'], r['channel'], r['sku'], r['brand'], r['camp'], r['orders'], r['qty'], r['gmv'], r['cancel_orders'], r['cancel_gmv']] for r in old_s if r['date'] not in replace]
    S += [[d, ch, sku, brand, camp, len(y[0]), fmt(y[1]), fmt(y[2]), len(y[3]), fmt(y[4])] for (d, ch, sku, brand, camp), y in sku_agg.items() if d in replace]
    S.sort(key=lambda r: (r[0], r[1], -int(r[7]), r[2]))

    days = sorted({r[0] for r in D})
    print(f'kho sau khi gộp: {days[0]} → {days[-1]}, {len(days)} ngày, {len(D)} dòng daily, {len(S)} dòng sku')
    gaps = [(d0, d) for d0, d in zip(days, days[1:]) if (date.fromisoformat(d) - date.fromisoformat(d0)).days > 1]
    if gaps:
        print('CẢNH BÁO ngày trống: ' + ', '.join(f'{x} → {y}' for x, y in gaps[:12]))
    for ch in sorted(CHANNELS):
        m, o = defaultdict(float), defaultdict(int)
        for r in D:
            if r[1] == ch:
                m[r[0][:7]] += float(r[4]); o[r[0][:7]] += int(r[2])
        print(f'  {ch}: ' + ', '.join(f'{k} {v / 1e9:.2f} tỷ/{o[k]} đơn' for k, v in sorted(m.items())))
    if a.dry:
        print('(--dry: chưa ghi)'); return
    write_csv(p_d, ['date', 'channel', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv'], D)
    write_csv(p_s, ['date', 'channel', 'sku', 'brand', 'camp', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv'], S)
    it = {r['sku']: (r['brand'], r['name']) for r in read_csv(p_i)}
    for k, v in names.items():
        it.setdefault(k, v)
    write_csv(p_i, ['sku', 'brand', 'name'], [[k, b, nm] for k, (b, nm) in sorted(it.items())])


if __name__ == '__main__':
    main()
