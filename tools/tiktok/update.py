"""Update the Tiktok dashboard data (tiktok/data/*.csv) from the GMV sheet.

Usage:
  python3 tools/tiktok/update.py --data tiktok/data --sheet-gmv sheet_gmvdata.json --sheet-daily sheet_daily.json

--sheet-gmv:   the JSON answer of Google Sheets get_values on GMV_Data!A1:L40 of GMV_Historical_HannahOlala
               (same file the Media update saves as $RAW/sheet_gmvdata.json).
--sheet-daily: the JSON answer of get_values on Daily_History!A1:E1000 ($RAW/sheet_daily.json).

Only the standard library is used. Writes:
  tt_mtd.csv        current month per sub-channel: plan, MTD, yesterday, last month   (replaced every run)
  tt_month_plan.csv one row per month: TikTok plan, MTD in the sheet, days counted     (upsert by month)
  tt_monthly.csv    one row per month x sub-channel: GMV (MTD, final once the month ends) and plan (upsert by month)
  tt_sub_daily.csv  one row per day x sub-channel: the sheet's "GMV_Yesterday" column   (upsert by date)
"As of" follows the Shopee dashboard: the latest date in Daily_History, counted as the last day in the MTD.
Daily TikTok GMV and all ads numbers are not stored here: the page reads them from media/data/.
Prints a summary; exits non-zero on a problem so nothing half-done gets published.
"""
import argparse, calendar, csv, json, os, re, sys

SUBS = [  # (sheet row name, short name, account, format)
    ('[HO] TikTok_Live', '[HO] Live', 'HO', 'Live'),
    ('[HO] TikTok_Video', '[HO] Video', 'HO', 'Video'),
    ('[MCN] TikTok_Live', '[MCN] Live', 'MCN', 'Live'),
    ('[MCN] TikTok_Video', '[MCN] Video', 'MCN', 'Video'),
]


def num(s):
    s = str(s if s is not None else '').replace(',', '').replace('%', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def values(path):
    d = json.load(open(path, encoding='utf-8'))
    return d.get('values', d) if isinstance(d, dict) else d


def read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def write(path, header, rows):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=header, lineterminator='\n')
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, '') for k in header})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--sheet-gmv', required=True)
    ap.add_argument('--sheet-daily', required=True)
    a = ap.parse_args()
    D = a.data.rstrip('/') + '/'
    os.makedirs(D, exist_ok=True)

    G, H = values(a.sheet_gmv), values(a.sheet_daily)
    dates = [r[0] for r in H[1:] if r and re.match(r'^\d{4}-\d{2}-\d{2}$', str(r[0]))]
    if not dates:
        sys.exit('sheet-daily: no dates found')
    as_of = max(dates)
    month, day = as_of[:7], int(as_of[8:])
    dim = calendar.monthrange(int(month[:4]), int(month[5:]))[1]

    rows = {}  # first occurrence wins: the sheet repeats channel names in a link list further down
    for r in G:
        if r and str(r[0]).strip():
            rows.setdefault(str(r[0]).strip(), r)
    if 'TikTok' not in rows:
        sys.exit('sheet-gmv: no "TikTok" row in GMV_Data')
    # columns: 0 Channel, 5 Actual_GMV_LastMonth, 6 Target, 7 Actual_MTD, 8 GMV_Yesterday
    col = lambda r, i: num(r[i]) if len(r) > i else None
    report, mtd = [], []
    for sheet_name, name, acc, fmt in SUBS:
        r = rows.get(sheet_name)
        if not r:
            sys.exit(f'sheet-gmv: missing row {sheet_name}')
        plan, m, y, lm = col(r, 6), col(r, 7), col(r, 8), col(r, 5)
        if m is None:
            sys.exit(f'sheet-gmv: missing MTD for {sheet_name}')
        mtd.append({'sub_channel': name, 'account': acc, 'format': fmt, 'plan': int(plan or 0), 'mtd': int(m),
                    'yesterday': '' if y is None else int(y), 'last_month': '' if lm is None else int(lm), 'as_of': as_of})
    tt = rows['TikTok']
    t_plan, t_mtd, t_y = col(tt, 6), col(tt, 7), col(tt, 8)
    s_mtd = sum(r['mtd'] for r in mtd)
    s_y = sum(r['yesterday'] or 0 for r in mtd)

    write(D + 'tt_mtd.csv', ['sub_channel', 'account', 'format', 'plan', 'mtd', 'yesterday', 'last_month', 'as_of'], mtd)

    pl = [r for r in read(D + 'tt_month_plan.csv') if r['month'] != month]
    pl.append({'month': month, 'plan': int(t_plan or 0), 'sheet_mtd': int(t_mtd or 0), 'days_in_month': dim, 'days_counted': day})
    write(D + 'tt_month_plan.csv', ['month', 'plan', 'sheet_mtd', 'days_in_month', 'days_counted'], sorted(pl, key=lambda r: r['month']))

    mon = [r for r in read(D + 'tt_monthly.csv') if r['month'] != month]
    have = {r['month'] for r in mon}
    # seed last month once from the sheet's "Actual_GMV_LastMonth" column (rounded numbers in the sheet)
    lm_month = f'{int(month[:4]) - (month[5:] == "01")}-{12 if month[5:] == "01" else int(month[5:]) - 1:02d}'
    if lm_month not in have and all(r['last_month'] != '' for r in mtd):
        for r in mtd:
            mon.append({'month': lm_month, 'sub_channel': r['sub_channel'], 'account': r['account'], 'format': r['format'],
                        'gmv': r['last_month'], 'plan': '', 'note': 'số tháng trước làm tròn trong sheet'})
        report.append(f'tt_monthly: thêm {lm_month} từ cột Actual_GMV_LastMonth')
    for r in mtd:
        mon.append({'month': month, 'sub_channel': r['sub_channel'], 'account': r['account'], 'format': r['format'],
                    'gmv': r['mtd'], 'plan': r['plan'], 'note': f'MTD tới {as_of}'})
    order = {s[1]: i for i, s in enumerate(SUBS)}
    write(D + 'tt_monthly.csv', ['month', 'sub_channel', 'account', 'format', 'gmv', 'plan', 'note'],
          sorted(mon, key=lambda r: (r['month'], order.get(r['sub_channel'], 9))))

    sd = [r for r in read(D + 'tt_sub_daily.csv') if r['date'] != as_of]
    for r in mtd:
        if r['yesterday'] != '':
            sd.append({'date': as_of, 'sub_channel': r['sub_channel'], 'gmv': r['yesterday']})
    write(D + 'tt_sub_daily.csv', ['date', 'sub_channel', 'gmv'], sorted(sd, key=lambda r: (r['date'], order.get(r['sub_channel'], 9))))

    report.insert(0, f'sheet tới {as_of}: TikTok MTD {s_mtd/1e9:.2f} tỷ / plan {(t_plan or 0)/1e9:.2f} tỷ '
                     f'({s_mtd/(t_plan or 1)*100:.1f}%), hôm qua {s_y/1e6:.0f} tr')
    for r in mtd:
        report.append(f"  {r['sub_channel']}: MTD {r['mtd']/1e6:,.0f} tr / plan {r['plan']/1e6:,.0f} tr")
    if t_mtd is not None and abs(s_mtd - t_mtd) > 1e6:
        report.append(f'CẢNH BÁO: tổng 4 kênh con ({s_mtd:,.0f}) lệch dòng TikTok trong sheet ({t_mtd:,.0f})')
    if t_y is not None and abs(s_y - t_y) > 1e6:
        report.append(f'CẢNH BÁO: tổng "hôm qua" 4 kênh con lệch dòng TikTok trong sheet')
    print('\n'.join(report))


if __name__ == '__main__':
    main()
