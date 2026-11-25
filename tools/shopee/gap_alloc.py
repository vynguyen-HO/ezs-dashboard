"""Split the live GMV that Creator Center's product list misses (capped at 1,000 products / day) over brands.
-> shopee/data/live_gap_alloc.csv  (date, acc, brand, gmv)   [estimate]

The gap of a day = live_overview_daily.placed (official total) - sum of sku_daily.lp for that acc / day.
Products missing from the product list are the ones with Affiliate live orders in the session window that are not in
that day's list. The gap is split over brands in proportion to those products' Affiliate GMV (placed = gmv + refund).
Window = the gap day until the day before the next day with its own Creator Center live sales (max 4 days), because
Creator Center books a whole session on its start day. Checked on 09/11/2026 olalamedia2 megalive: Creator Center /
Affiliate ratio is 1.93 for listed products and 1.97 for the missing part, so the proportional split is consistent.

Usage: python3 tools/shopee/gap_alloc.py --data shopee/data ACC=/path/ACC_aff_....csv [...]
Only gaps > max(5 tr, 2 %) are split; a file replaces the rows of its acc for the gap days it covers.
"""
import argparse, os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--data', required=True); ap.add_argument('files', nargs='+')
    a = ap.parse_args(); D = os.path.join(a.data, '')
    ov = pd.read_csv(D + 'live_overview_daily.csv')
    sd = pd.read_csv(D + 'sku_daily.csv', dtype={'item_id': str})
    items = pd.read_csv(D + 'items.csv', dtype=str).drop_duplicates('item_id').set_index('item_id').brand
    sb = pd.read_csv(os.path.join(HERE, 'shop_brand.csv'), dtype=str).drop_duplicates('shop_id').set_index('shop_id').brand
    out_p = D + 'live_gap_alloc.csv'
    cur = pd.read_csv(out_p) if os.path.exists(out_p) else pd.DataFrame(columns=['date', 'acc', 'brand', 'gmv'])
    for spec in a.files:
        acc, path = spec.split('=', 1)
        A = pd.read_csv(path, dtype={'item_id': str, 'shop_id': str})
        if 'refund' not in A.columns: A['refund'] = 0
        A = A[A.source == 'Shopeelive-Shopee'].assign(pl=lambda x: x.gmv + x.refund.fillna(0))
        s = sd[sd.acc == acc]; lp = s.groupby('date').lp.sum()
        o = ov[ov.acc == acc].set_index('date').placed
        for day, placed in o.items():
            gap = placed - lp.get(day, 0)
            if gap <= max(5e6, 0.02 * placed) or not (A.date.min() <= day <= A.date.max()): continue
            later = sorted(d for d in lp[lp > 0].index if d > day)
            end = min([(pd.Timestamp(day) + pd.Timedelta(days=3)).strftime('%Y-%m-%d')] + [(pd.Timestamp(later[0]) - pd.Timedelta(days=1)).strftime('%Y-%m-%d')] if later else [])
            listed = set(s[(s.date == day) & ((s.lp > 0) | (s.lc > 0))].item_id)
            W = A[A.date.between(day, end) & ~A.item_id.isin(listed)].copy()
            if W.pl.sum() <= 0: print(f'{acc} {day}: thiếu {gap/1e9:.2f} tỷ nhưng không có sản phẩm Affiliate ngoài danh sách'); continue
            W['brand'] = [items.get(i) if isinstance(items.get(i), str) and items.get(i) != 'Chưa xác định' else sb.get(sh, 'Khác') for i, sh in zip(W.item_id, W.shop_id)]
            g = W.groupby('brand').pl.sum(); g = (g / g.sum() * gap).round().astype('int64')
            cur = pd.concat([cur[~((cur.acc == acc) & (cur.date == day))], pd.DataFrame({'date': day, 'acc': acc, 'brand': g.index, 'gmv': g.values})])
            print(f'{acc} {day} (đơn {day}..{end}): chia {gap/1e9:.2f} tỷ cho {len(g)} brand, tỉ lệ CC/Aff {gap/W.pl.sum():.2f}; top: '
                  + ', '.join(f'{b} {v/1e9:.2f}' for b, v in g.sort_values(ascending=False).head(5).items()))
    cur.sort_values(['date', 'acc', 'gmv'], ascending=[True, True, False]).to_csv(out_p, index=False)


if __name__ == '__main__':
    main()
