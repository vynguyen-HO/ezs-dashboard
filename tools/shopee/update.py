"""Incremental update of the PFM Shopee dashboard data (shopee/data/*.csv).

Usage:
  python3 tools/shopee/update.py --data shopee/data \
      [--lv HO=/path/HO_lv_2026-10-20.csv --lv HT=/path/HT_lv_2026-10-20.csv] \
      [--aff HO=/path/HO_aff_2026-10-20.csv --aff HT=/path/HT_aff_2026-10-20.csv] \
      [--sheet-gmv gmv_data.json --sheet-daily daily_history.json]

--lv / --aff: files saved by pull_creator.js / pull_affiliate.js. For each file, every row of that channel
whose date falls inside the file's date range is replaced by the file's rows (so re-pulling the last ~10 days
refreshes order statuses).
--sheet-gmv: the JSON answer of Google Sheets get_values on GMV_Data!A1:L40 of GMV_Historical_HannahOlala.
--sheet-daily: the JSON answer of get_values on Daily_History!A1:E1000.
Prints a summary with checks; exits non-zero on a problem so nothing half-done gets published.
"""
import argparse, json, os, re, sys, calendar
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))

def clean(s):
    s = str(s)
    s = re.sub(r'(?i)\s*[-|]?\s*(official\s*store|official\s*shop|official|gian hàng chính hãng|chính hãng|store|mall|vietnam|việt nam|vn|flagship)\b', '', s)
    s = re.sub(r'\s+', ' ', s).strip(' -_|')
    return s or 'Khác'
FIX = {'CLUB CLIO': 'CLIO', 'Roborock by Hotek': 'Roborock', 'Hoa Tây Tử': 'Florasis', 'Florasis Hoa Tây Tử': 'Florasis', 'VN_Torriden': 'Torriden',
       'Nestlé Chính hãng': 'Nestlé', 'Bamozo_Official': 'Bamozo', 'LG Authorized': 'LG', 'SKINFOOD Authorized': 'SKINFOOD', 'Senka by FT': 'Senka', 'Tsubaki by FT': 'Tsubaki'}
def brand_of(shop):
    b = clean(shop); b = FIX.get(b, b); return re.sub(r'(?i)^gian hàng\s+', '', b)

def kv(items):
    out = []
    for s in items or []:
        acc, path = s.split('=', 1); out.append((acc.strip(), path.strip()))
    return out

def num(s):
    s = str(s or '').replace(',', '').strip()
    try: return float(s)
    except ValueError: return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True); ap.add_argument('--lv', action='append'); ap.add_argument('--aff', action='append')
    ap.add_argument('--sheet-gmv'); ap.add_argument('--sheet-daily')
    a = ap.parse_args(); D = a.data.rstrip('/') + '/'
    sd = pd.read_csv(D + 'sku_daily.csv', dtype={'item_id': str}); items = pd.read_csv(D + 'items.csv', dtype={'item_id': str})
    aff = pd.read_csv(D + 'aff_brand_daily.csv'); sb_path = os.path.join(HERE, 'shop_brand.csv')
    shop_brand = pd.read_csv(sb_path, dtype=str).set_index('shop_id').brand if os.path.exists(sb_path) else pd.Series(dtype=str)
    item_brand = items.set_index('item_id').brand
    report = []

    # affiliate first: it brings item -> shop names used for brands
    new_item_brand = {}
    affs = [(acc, pd.read_csv(p, dtype={'item_id': str, 'shop_id': str})) for acc, p in kv(a.aff)]
    for acc, A in affs:
        A = A[A.shop.notna()]
        for r in A.drop_duplicates('item_id').itertuples():
            new_item_brand[r.item_id] = brand_of(r.shop)
            if r.shop_id and r.shop_id not in shop_brand.index: shop_brand.loc[r.shop_id] = brand_of(r.shop)
    def brand_for(item_id, shop_id=None):
        b = new_item_brand.get(item_id)
        if b: return b
        b = item_brand.get(item_id)
        if isinstance(b, str) and b != 'Chưa xác định': return b
        if shop_id and shop_id in shop_brand.index: return shop_brand[shop_id]
        return 'Chưa xác định'

    # creator center (live + video)
    for acc, path in kv(a.lv):
        U = pd.read_csv(path, dtype={'item_id': str, 'shop_id': str})
        if U.empty: report.append(f'{acc} lv: empty file'); continue
        f, t = U.date.min(), U.date.max()
        L = U[U.kind == 'L']; V = U[U.kind == 'V']
        l = L.groupby(['date', 'item_id']).agg(lp=('placed_gmv', 'sum'), lc=('confirmed_gmv', 'sum'), lo=('placed_orders', 'sum'), lk=('clicks', 'sum'))
        v = V.groupby(['date', 'item_id']).agg(vp=('placed_gmv', 'sum'), vc=('confirmed_gmv', 'sum'))
        new = pd.concat([l, v], axis=1).fillna(0).reset_index().assign(acc=acc)
        for c in ['lp', 'lc', 'lo', 'lk', 'vp', 'vc']: new[c] = new[c].round().astype('int64')
        sd = pd.concat([sd[~((sd.acc == acc) & (sd.date >= f) & (sd.date <= t))], new[sd.columns]])
        # new / unmapped items
        vshop = V.drop_duplicates('item_id').set_index('item_id').shop_id
        known = set(items.item_id)
        add = []
        for r in U.drop_duplicates('item_id').itertuples():
            if r.item_id not in known:
                add.append({'item_id': r.item_id, 'title': str(r.title or '')[:120], 'brand': brand_for(r.item_id, vshop.get(r.item_id)), 'category': ''})
        if add: items = pd.concat([items, pd.DataFrame(add)])
        report.append(f'{acc} lv {f}..{t}: live {L.placed_gmv.sum()/1e9:.2f} tỷ, video {V.placed_gmv.sum()/1e9:.2f} tỷ, {len(add)} SKU mới')
    # refresh brands of items still unmapped
    m = items.brand == 'Chưa xác định'
    items.loc[m, 'brand'] = [brand_for(i) for i in items.loc[m, 'item_id']]
    item_brand = items.set_index('item_id').brand

    for acc, A in affs:
        if A.empty: report.append(f'{acc} aff: empty file'); continue
        f, t = A.date.min(), A.date.max()
        A = A.copy(); A['brand'] = [brand_for(i, s) for i, s in zip(A.item_id, A.shop_id)]
        k = A[A.cancelled == 0].groupby(['date', 'brand']).agg(aff_gmv=('gmv', 'sum'), aff_commission=('commission', 'sum'), aff_orders=('orders', 'sum')).reset_index().assign(acc=acc)
        for c in ['aff_gmv', 'aff_commission', 'aff_orders']: k[c] = k[c].round().astype('int64')
        aff = pd.concat([aff[~((aff.acc == acc) & (aff.date >= f) & (aff.date <= t))], k[aff.columns]])
        report.append(f'{acc} aff {f}..{t}: {k.aff_gmv.sum()/1e9:.2f} tỷ GMV, hoa hồng {k.aff_commission.sum()/1e9:.2f} tỷ')

    # sheet numbers
    if a.sheet_gmv and a.sheet_daily:
        G = json.load(open(a.sheet_gmv)); G = G.get('values', G)
        H = json.load(open(a.sheet_daily)); H = H.get('values', H)
        daily = [(r[0], num(r[4]) if len(r) > 4 else None) for r in H[1:] if r and re.match(r'\d{4}-\d{2}-\d{2}', str(r[0]))]
        as_of = max(d for d, _ in daily); month = as_of[:7]; day = int(as_of[8:])
        blk_i = next(i for i, r in enumerate(G) if len(r) > 1 and r[1] == 'Seller_MTD')
        sub = {r[0]: r for r in G[:blk_i] if r and r[0].startswith('[') and len(r) > 7}
        blk = {r[0]: r for r in G[blk_i + 1: blk_i + 8] if r and r[0].startswith('[')}
        shopee = next(r for r in G if r and r[0] == 'Shopee')
        keys = [('[HO] Live Mega (DD)', 'HO', 'Live', '[HO] Shopee_Live_Mega', '[HO] Live_SPIKE'), ('[HO] Live BAU', 'HO', 'Live', '[HO] Shopee_Live_BAU', '[HO] Live_BAU'),
                ('[HO] Video', 'HO', 'Video', '[HO] Shopee_Video', '[HO] Video'), ('[MCN] Live', 'MCN', 'Live', '[MCN] Shopee_Live', '[MCN] Shopee_Live'),
                ('[MCN] Video', 'MCN', 'Video', '[MCN] Shopee_Video', '[MCN] Shopee_Video')]
        mon = pd.read_csv(D + 'shp_monthly.csv'); mon = mon[mon.month != month]
        mtd_rows, new_mon = [], []
        for name, acc, fmt, sk, bk in keys:
            plan = num(sub[sk][6]); b = blk[bk]
            seller, buyer = num(b[1]), num(b[3]); sy = num(b[2]) or 0; by = num(b[6]) if len(b) > 6 else 0
            # Live Mega only runs on double days (11/11, 12/12…): before the first Mega of the month its MTD is a real 0
            if bk == '[HO] Live_SPIKE' and seller == 0 and buyer == 0:
                report.append(f'{name}: MTD = 0 (chưa có phiên Mega trong tháng)')
            elif not seller or not buyer: sys.exit(f'sheet: missing MTD for {bk}')
            new_mon.append({'month': month, 'sub_channel': name, 'account': acc, 'format': fmt, 'seller_gmv': int(seller), 'buyer_gmv': int(buyer), 'plan': int(plan) if plan else ''})
            mtd_rows.append({'sub_channel': name, 'account': acc, 'format': fmt, 'plan': int(plan or 0), 'seller_mtd': int(seller), 'buyer_mtd': int(buyer), 'seller_yesterday': int(sy), 'buyer_yesterday': int(by or 0), 'as_of': as_of})
        out = pd.concat([mon, pd.DataFrame(new_mon)]).sort_values(['month'], kind='stable')
        out['plan'] = pd.to_numeric(out.plan, errors='coerce').astype('Int64')
        out.to_csv(D + 'shp_monthly.csv', index=False)
        pd.DataFrame(mtd_rows).to_csv(D + 'shp_mtd.csv', index=False)
        pl = pd.read_csv(D + 'shp_month_plan.csv'); pl = pl[pl.month != month]
        dim = calendar.monthrange(int(month[:4]), int(month[5:]))[1]
        pl = pd.concat([pl, pd.DataFrame([{'month': month, 'plan': int(num(shopee[6])), 'sheet_buyer_total': int(num(shopee[7])), 'days_in_month': dim, 'days_counted': day}])]).sort_values('month')
        pl.to_csv(D + 'shp_month_plan.csv', index=False)
        rows, prev = [], None
        for d, v in sorted(daily):
            if d < '2026-07-21': continue
            rows.append({'date': d, 'buyer_gmv': round(v) if v else '', 'same_as_prev_day': 'yes' if v and v == prev else ''}); prev = v
        pd.DataFrame(rows).to_csv(D + 'shp_daily.csv', index=False)
        tot = sum(r['buyer_mtd'] for r in mtd_rows)
        report.append(f'sheet: số đến {as_of}, GMV Buyer MTD {tot/1e9:.2f} tỷ / plan {num(shopee[6])/1e9:.1f} tỷ (Shopee MTD trong sheet {num(shopee[7])/1e9:.2f} tỷ)')
        if abs(tot - num(shopee[7])) > 1e6: report.append('CẢNH BÁO: tổng 5 sub-channel lệch số Shopee trong sheet')

    sd = sd.sort_values(['date', 'acc', 'item_id']); sd.to_csv(D + 'sku_daily.csv', index=False)
    items.drop_duplicates('item_id').to_csv(D + 'items.csv', index=False)
    aff.sort_values(['date', 'acc', 'brand']).to_csv(D + 'aff_brand_daily.csv', index=False)
    shop_brand.rename('brand').rename_axis('shop_id').reset_index().to_csv(sb_path, index=False)
    for f in ['sku_daily.csv', 'aff_brand_daily.csv', 'items.csv']:
        s = os.path.getsize(D + f); report.append(f'{f}: {s/1e6:.1f} MB');
        if s > 7.9e6: report.append(f'CẢNH BÁO: {f} gần giới hạn 8 MB của dashboard claude.ai')
    report.append('max date: sku ' + sd.date.max() + ', aff ' + aff.date.max())
    print('\n'.join(report))

if __name__ == '__main__':
    main()
