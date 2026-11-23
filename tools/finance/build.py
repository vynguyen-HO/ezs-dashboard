#!/usr/bin/env python3
"""Finance module data -> finance/data/payments.csv
   columns: platform,account,date,amount,status,kind,doc

Usage: python3 tools/finance/build.py <raw dir> finance/data
Raw files (made by tools/finance/UPDATE.md, never committed):
  meta_<ACCOUNT>.csv     account,date,amount,status,kind,doc,subtotal,tax[,txn id]  (Billing Hub > Payment activity; kind card /
                         Ad credit; doc = VAT invoice id FBADS-…). Card digits, reference numbers, txn ids are NOT kept.
  tiktok_<ACCOUNT>.csv   account,date,amount,status,kind,doc,subtotal,tax   (TikTok Ads > Billing > Invoices)
  sp_<SHOP>.csv          date,group,type,amount,transaction_id  (only group 'topup' is kept) (Seller Center > Dịch vụ Hiển thị > Lịch sử giao dịch,
                         API /api/pas/v1/transaction_history/get/, amount already in VND)
A platform+account present in the raw dir replaces its rows in the date range of the raw file; other rows are kept.
"""
import csv, glob, os, sys

SP_KIND = {'topup_credit': 'Nạp tiền', 'free_ads_credit': 'Credit tặng', 'live_stream_deduction': 'Chi phí Live',
           'video_deduction': 'Chi phí Video', 'search_deduction': 'Chi phí Tìm kiếm', 'discovery_deduction': 'Chi phí Khám phá'}
HEAD = ['platform', 'account', 'date', 'amount', 'subtotal', 'tax', 'status', 'kind', 'doc']


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    raw, data = sys.argv[1:]
    new = {}
    for p in glob.glob(os.path.join(raw, 'meta_*.csv')) + glob.glob(os.path.join(raw, 'tiktok_*.csv')):
        pf = 'Meta' if os.path.basename(p).startswith('meta_') else 'TikTok'
        for r in csv.reader(open(p, encoding='utf-8')):
            if len(r) < 6 or not r[1][:4].isdigit():
                continue
            new.setdefault((pf, r[0]), []).append({'platform': pf, 'account': r[0], 'date': r[1], 'amount': r[2],
                                                   'subtotal': r[6] if len(r) > 6 else '', 'tax': r[7] if len(r) > 7 else '',
                                                   'status': r[3], 'kind': {'card': 'Thẻ'}.get(r[4], r[4]), 'doc': r[5]})
    for p in glob.glob(os.path.join(raw, 'sp_*.csv')):
        shop = os.path.basename(p)[3:-4]
        for r in csv.reader(open(p, encoding='utf-8')):
            if len(r) < 4 or not r[0][:4].isdigit():
                continue
            if r[1] != 'topup':      # chỉ giữ giao dịch nạp tiền (nạp + credit tặng), bỏ trừ phí quảng cáo
                continue
            amt = abs(int(r[3]))
            new.setdefault(('Shopee', shop), []).append({'platform': 'Shopee', 'account': shop, 'date': r[0], 'amount': str(amt), 'subtotal': '', 'tax': '',
                                                         'status': 'Thành công', 'kind': SP_KIND.get(r[2], r[2]), 'doc': ''})
    out = os.path.join(data, 'payments.csv')
    old = list(csv.DictReader(open(out, encoding='utf-8'))) if os.path.exists(out) else []
    rng = {k: (min(x['date'] for x in v), max(x['date'] for x in v)) for k, v in new.items()}
    keep = [r for r in old if not ((r['platform'], r['account']) in rng and rng[(r['platform'], r['account'])][0] <= r['date'] <= rng[(r['platform'], r['account'])][1])]
    rows = keep + [x for v in new.values() for x in v]
    rows.sort(key=lambda r: (r['platform'], r['account'], r['date']), reverse=True)
    os.makedirs(data, exist_ok=True)
    with open(out, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, HEAD)
        w.writeheader()
        w.writerows(rows)
    for (pf, acc), v in sorted(new.items()):
        print(f'{pf} {acc}: {len(v)} dòng {rng[(pf, acc)][0]}..{rng[(pf, acc)][1]}')
    print(f'payments.csv: {len(rows)} dòng')


if __name__ == '__main__':
    main()
