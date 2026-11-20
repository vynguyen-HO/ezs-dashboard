#!/usr/bin/env python3
"""Archive Haravan website (S.com / Hannaholala.com) orders from the "getlast" sheet into website/data.

The sheet "MIX NOV'2026 Get Last Sheet" (id 1190CMois1ezHXJn8yKvs-ZPGxE5dJ26XjRQW4Ae3kFY, tab Final) is refilled
by a flow and only keeps the most recent orders: when it reaches its row limit the oldest days are dropped. This
script keeps the history: every run merges the days present in the sheet into the CSVs in website/data and leaves
older days untouched.

Privacy: the sheet holds customer names, phones, emails and addresses. The site is public, so only aggregated
numbers (per day / channel / SKU) are written. Read only the columns listed below from the sheet.

Inputs are the JSON results of the Sheets get_values tool ({range, values}) for 4 ranges of tab Final, from row 3:
  --a   Final!A3:A<n>    Mã đơn hàng
  --no  Final!N3:O<n>    Kênh bán hàng, Ngày đặt hàng (dd/mm/yyyy HH:MM:SS)
  --pt  Final!P3:T<n>    Phí vận chuyển, Số tiền giảm, Mã Coupon, Trạng thái huỷ, Lý do huỷ
  --va  Final!V3:AA<n>   Tên sản phẩm, Mã sản phẩm, Hãng, Số lượng sản phẩm, Giá sản phẩm, Tên Camp
Fetch the 4 ranges one right after the other (in one batch): the flow keeps writing to the sheet, and ranges read
minutes apart would no longer line up row by row. The script checks the 4 ranges have the same number of rows.

Outputs (website/data):
  web_daily.csv      date,channel,orders,qty,gmv,cancel_orders,cancel_gmv
  web_sku_daily.csv  date,channel,sku,brand,camp,orders,qty,gmv,cancel_orders,cancel_gmv
  web_items.csv      sku,brand,name
GMV = quantity x unit price (Haravan line price), before order discounts; cancelled orders are counted apart.

Merge rule: a day found in the sheet replaces that day in the archive (order statuses change for a few days after
the order), except the sheet's oldest day, which may be cut off by the row limit: it only replaces the archive when
the sheet has at least as many orders for it as the archive.

Usage:
  python3 tools/website/update.py --data website/data --a A.json --no NO.json --pt PT.json --va VA.json
"""
import argparse, csv, json, os, re, sys
from collections import defaultdict
from datetime import date

CHANNELS = {'web', 'harasocial', 'livestream'}


def vals(path):
    with open(path, encoding='utf-8') as f:
        o = json.load(f)
    if isinstance(o, dict) and 'content' in o and 'values' not in o:  # wrapped tool result
        o = o['content']
    return o['values']


def cell(rows, i, j):
    r = rows[i] if i < len(rows) else []
    return r[j].strip() if j < len(r) and r[j] is not None else ''


def num(s):
    s = str(s).replace(',', '').strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def day(s):
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if not m:
        m2 = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
        return f'{m2[1]}-{m2[2]}-{m2[3]}' if m2 else None
    return f'{m[3]}-{int(m[2]):02d}-{int(m[1]):02d}'


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write_csv(path, header, rows):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    for k in ('a', 'no', 'pt', 'va'):
        ap.add_argument('--' + k, required=True)
    a = ap.parse_args()
    A, NO, PT, VA = vals(a.a), vals(a.no), vals(a.pt), vals(a.va)
    lens = [len(A), len(NO), len(PT), len(VA)]
    if max(lens) - min(lens) > 3:
        sys.exit(f'Các range lệch số dòng {lens}: sheet đã đổi giữa các lần đọc, đọc lại cả 4 range cùng lúc.')
    n = max(lens)

    lines, skipped, names = [], defaultdict(int), {}
    for i in range(n):
        oid, ch, d = cell(A, i, 0), cell(NO, i, 0), day(cell(NO, i, 1))
        if not oid and not ch:
            continue
        if ch not in CHANNELS:
            skipped['kênh lạ: ' + ch[:20]] += 1
            continue
        if not d or d < '2020-01-01':
            skipped['ngày lỗi'] += 1
            continue
        name, sku, brand, qty, price, camp = (cell(VA, i, j) for j in range(6))
        canc = cell(PT, i, 3) == 'Đã huỷ'
        lines.append((d, ch, oid, sku, brand, num(qty), num(price), camp, canc))
        if sku:
            names[sku] = (brand, name[:150])
    if not lines:
        sys.exit('Không có dòng nào đọc được, dừng.')

    # aggregate the pull
    dly, sku_agg, cnt = {}, {}, defaultdict(int)
    for d, ch, oid, sku, brand, q, p, camp, canc in lines:
        cnt[d] += 1
        g = q * p
        k = (d, ch)
        x = dly.setdefault(k, [set(), 0.0, 0.0, set(), 0.0])
        k2 = (d, ch, sku, brand, camp)
        y = sku_agg.setdefault(k2, [set(), 0.0, 0.0, set(), 0.0])
        for z in (x, y):
            if canc:
                z[3].add(oid); z[4] += g
            else:
                z[0].add(oid); z[1] += q; z[2] += g
    pull_days = sorted(cnt)
    dmin, dmax = pull_days[0], pull_days[-1]

    os.makedirs(a.data, exist_ok=True)
    p_d, p_s, p_i = (os.path.join(a.data, f) for f in ('web_daily.csv', 'web_sku_daily.csv', 'web_items.csv'))
    old_d, old_s = read_csv(p_d), read_csv(p_s)
    old_lines = defaultdict(int)  # archive's order count per day (all channels, cancelled included)
    for r in old_d:
        old_lines[r['date']] += int(r['orders']) + int(r['cancel_orders'])
    new_orders = defaultdict(int)
    for (d, ch), x in dly.items():
        new_orders[d] += len(x[0]) + len(x[3])

    replace = set(pull_days)
    if dmin in old_lines and new_orders[dmin] < old_lines[dmin]:
        replace.discard(dmin)  # sheet's first day is truncated, keep the archive's fuller copy

    def fmt(v):
        return str(int(round(v)))

    D = [[r['date'], r['channel'], r['orders'], r['qty'], r['gmv'], r['cancel_orders'], r['cancel_gmv']] for r in old_d if r['date'] not in replace]
    D += [[d, ch, len(x[0]), fmt(x[1]), fmt(x[2]), len(x[3]), fmt(x[4])] for (d, ch), x in dly.items() if d in replace]
    D.sort(key=lambda r: (r[0], r[1]))
    S = [[r['date'], r['channel'], r['sku'], r['brand'], r['camp'], r['orders'], r['qty'], r['gmv'], r['cancel_orders'], r['cancel_gmv']] for r in old_s if r['date'] not in replace]
    S += [[d, ch, sku, brand, camp, len(y[0]), fmt(y[1]), fmt(y[2]), len(y[3]), fmt(y[4])] for (d, ch, sku, brand, camp), y in sku_agg.items() if d in replace]
    S.sort(key=lambda r: (r[0], r[1], -int(r[7]), r[2]))
    write_csv(p_d, ['date', 'channel', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv'], D)
    write_csv(p_s, ['date', 'channel', 'sku', 'brand', 'camp', 'orders', 'qty', 'gmv', 'cancel_orders', 'cancel_gmv'], S)
    if names:
        it = {r['sku']: (r['brand'], r['name']) for r in read_csv(p_i)}
        it.update(names)
        write_csv(p_i, ['sku', 'brand', 'name'], [[k, b, nm] for k, (b, nm) in sorted(it.items())])

    # report
    print(f'sheet: {len(lines)} dòng, {dmin} → {dmax}; ghi đè {len(replace)} ngày' + ('' if dmin in replace else f' (giữ bản cũ của {dmin}: sheet {new_orders[dmin]} đơn < kho {old_lines[dmin]} đơn)'))
    for k, v in skipped.items():
        print(f'  bỏ qua {v} dòng ({k})')
    arch_days = sorted({r[0] for r in D})
    print(f'kho: {arch_days[0]} → {arch_days[-1]}, {len(arch_days)} ngày, {len(D)} dòng daily, {len(S)} dòng sku')
    gaps = [d for d0, d in zip(arch_days, arch_days[1:]) if (date.fromisoformat(d) - date.fromisoformat(d0)).days > 1]
    if gaps:
        print('CẢNH BÁO: kho có ngày bị trống trước: ' + ', '.join(gaps[:10]))
    for ch in sorted(CHANNELS):
        m = defaultdict(float)
        for r in D:
            if r[1] == ch:
                m[r[0][:7]] += float(r[4])
        print(f'  {ch}: ' + ', '.join(f'{k} {v / 1e9:.2f} tỷ' for k, v in sorted(m.items())))


if __name__ == '__main__':
    main()
