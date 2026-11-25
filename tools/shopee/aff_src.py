"""Affiliate NMV split by source (Live / Video / other) -> shopee/data/aff_src_daily.csv
   columns: date,acc,brand,src,aff_gmv,aff_orders,aff_gmv_placed   (src: live | video | other)

aff_brand_daily.csv has no Live / Video split; this file lets the dashboard apply the "Live / Video" filter to
Affiliate NMV. Source = referrer internal_source of each conversion (Shopeelive-Shopee -> live,
Shopeevideo-Shopee -> video, anything else -> other).

Usage: python3 tools/shopee/aff_src.py --data shopee/data ACC=/path/ACC_aff_YYYY-MM-DD.csv [...]
   or: python3 tools/shopee/aff_src.py --data shopee/data --scan ~/Downloads   (every <acc>_aff_<date>.csv, oldest first)
update.py calls update() with its --aff files. Each file replaces that acc's rows in the file's date range.
Brand = items.csv brand of the item, else shop_brand.csv brand of the shop, else 'Khác' (same as aff_brand_daily).
"""
import argparse, glob, os, re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
COLS = ['date', 'acc', 'brand', 'src', 'aff_gmv', 'aff_orders', 'aff_gmv_placed']
SRC = {'Shopeelive-Shopee': 'live', 'Shopeevideo-Shopee': 'video'}


def update(data, files):
    D = os.path.join(data, '')
    out = D + 'aff_src_daily.csv'
    cur = pd.read_csv(out, dtype=str) if os.path.exists(out) else pd.DataFrame(columns=COLS)
    items = pd.read_csv(D + 'items.csv', dtype=str).drop_duplicates('item_id').set_index('item_id').brand
    sb = pd.read_csv(os.path.join(HERE, 'shop_brand.csv'), dtype=str).drop_duplicates('shop_id').set_index('shop_id').brand
    rep = []
    for acc, p in files:
        A = pd.read_csv(p, dtype={'item_id': str, 'shop_id': str})
        if A.empty or 'source' not in A.columns:
            rep.append(f'{acc} aff src: bỏ qua {os.path.basename(p)} (không có cột source)'); continue
        f, t = A.date.min(), A.date.max()
        A['brand'] = [items.get(i) if isinstance(items.get(i), str) else sb.get(s) if isinstance(sb.get(s), str) else 'Khác' for i, s in zip(A.item_id, A.shop_id)]
        A['src'] = A.source.map(SRC).fillna('other')
        if 'refund' not in A.columns: A['refund'] = 0   # see update.py: NMV = all actual_amount, placed = NMV + refunded
        A['refund'] = A.refund.fillna(0)
        A['o_ok'], A['pl'] = A.orders.where(A.gmv > 0, 0), A.gmv + A.refund
        k = A.groupby(['date', 'brand', 'src']).agg(aff_gmv=('gmv', 'sum'), aff_orders=('o_ok', 'sum'), aff_gmv_placed=('pl', 'sum')).reset_index().assign(acc=acc)
        for c in ['aff_gmv', 'aff_orders', 'aff_gmv_placed']: k[c] = k[c].round().astype('int64').astype(str)
        cur = pd.concat([cur[~((cur.acc == acc) & (cur.date >= f) & (cur.date <= t))], k[COLS]])
        s = k.assign(g=k.aff_gmv.astype(int)).groupby('src').g.sum()
        rep.append(f'{acc} aff src {f}..{t}: ' + ', '.join(f'{x} {v/1e9:.2f} tỷ' for x, v in s.items()))
    cur.sort_values(['date', 'acc', 'brand', 'src']).to_csv(out, index=False)
    return rep


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--data', required=True); ap.add_argument('--scan'); ap.add_argument('files', nargs='*')
    a = ap.parse_args()
    files = [tuple(x.split('=', 1)) for x in a.files]
    if a.scan:
        ps = sorted(glob.glob(os.path.join(os.path.expanduser(a.scan), '*_aff_*.csv')), key=os.path.getmtime)
        files += [(re.match(r'(.+)_aff_\d{4}-\d\d-\d\d\.csv$', os.path.basename(p)).group(1), p) for p in ps if re.match(r'.+_aff_\d{4}-\d\d-\d\d\.csv$', os.path.basename(p))]
    print('\n'.join(update(a.data, files)))


if __name__ == '__main__':
    main()
