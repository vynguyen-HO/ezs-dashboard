"""Build data.json for Deal Compare 3 Channel artifact.
Inputs: data/*.json (Sheets get_values dumps). Output: data.json
"""
import json, re, statistics, collections
from unidecode import unidecode
from rapidfuzz import fuzz

D = 'data/'
L = lambda f: json.load(open(D + f))['values']

def num(s):
    s = (s or '').strip().replace('đ', '').replace('VND', '')
    if not s or '#' in s: return None
    s = s.replace('%', '')
    # VN format "1.316.072.806" or "1,316,072,806"; decimals like "11,6"
    if re.fullmatch(r'-?\d{1,3}([.,]\d{3})+', s): s = re.sub(r'[.,]', '', s)
    else: s = s.replace(',', '.')
    try: return float(s)
    except ValueError: return None

def cell(r, i): return r[i].strip() if len(r) > i and r[i] else ''

# ---------- brand normalization ----------
STOP = r'\b(OFFICIAL|STORE|VIET ?NAM|VN|LABORATORY|PROFESSIONAL|BEAUTY|PARIS|HOA TAY TU)\b'
ALIAS = {'THEWHOO': 'WHOO', 'EAUTHERMALEAVENE': 'AVENE', 'PAULASCHOICE': 'PAULACHOICE',
         'CHAKOLABVN': 'CHAKOLAB', 'NARCISO': 'NARCISORODRIGUEZ', 'YENVIET': 'YENVIET'}
def bkey(b):
    b = unidecode(b or '').upper().replace('_', ' ')
    b = re.sub(STOP, ' ', b)
    k = re.sub(r'[^A-Z0-9]', '', b)
    return ALIAS.get(k, k)

sku_rows = [r + [''] * 7 for r in L('sku.json')[1:] if r and r[0].strip()]
SKU_BRANDS = {bkey(r[0]): r[0] for r in sku_rows}
def brand_of(b):
    k = bkey(b)
    if k in SKU_BRANDS: return SKU_BRANDS[k]
    if len(k) >= 4:  # prefix match, longest wins (e.g. NARCISORODRIGUEZOFFICIAL)
        c = [sk for sk in SKU_BRANDS if len(sk) >= 4 and (k.startswith(sk) or sk.startswith(k))]
        if c: return SKU_BRANDS[max(c, key=len)]
    return None

# ---------- product name normalization ----------
def pn(s):
    s = unidecode(s or '').upper()
    s = re.sub(r'\[[^\]]*\]', ' ', s)                       # [Hannah x Ulike]
    s = re.sub(r'\b(DEAL\s*\d+|HANNAH( OLALA)?|DOC QUYEN|FLASH DEAL|LIVE|X HANNAH|PHIEN BAN \d{4})\b', ' ', s)
    s = re.sub(r'[^A-Z0-9+ ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()
def sizes(s): return set(re.findall(r'(\d+(?:\.\d+)?)\s?(ML|G|GR|KG|L|GOI|VIEN|MIENG|TUI)\b', s))
def multi(s): return bool(re.search(r'\b(COMBO|BO DOI|SET|X ?[2-9]|[2-9] ?X|\*[2-9])\b', s))

SKU_BY_BRAND = collections.defaultdict(list)
BARCODE = {}
for r in sku_rows:
    bc = r[4].strip()
    if not bc: continue
    BARCODE.setdefault(bc, {'brand': r[0], 'name': r[1], 'variant': r[2], 'cat': r[3], 'full': r[6]})
    a, b = pn(r[6]), pn(r[1] + ' ' + (r[2] if r[2].upper() not in ('STANDARD', 'DEFAULT') else ''))
    SKU_BY_BRAND[r[0]].append((bc, a, b, pn(r[2]), sizes(a + ' ' + b), multi(a)))

def match(brand, name, variant=''):
    """Return (barcode, confidence 0-100) within brand; shortcut: fuzzy only, KA reviews 70-85."""
    if not brand: return None, 0
    q, qv = pn(name), pn(variant)
    qs, qm = sizes(q), multi(q)
    best = (None, 0)
    for bc, a, b, v, ss, m in SKU_BY_BRAND.get(brand, []):
        sc = max(fuzz.token_set_ratio(q, a), fuzz.token_set_ratio(q, b) if b else 0) * .7 + \
             max(fuzz.token_sort_ratio(q, a), fuzz.token_sort_ratio(q, b) if b else 0) * .3
        if qs and ss and not (qs & ss): sc -= 25
        if qm != m: sc -= 8
        if v and v not in ('STANDARD', 'DEFAULT') and qv:
            sc += 6 if fuzz.partial_ratio(qv, v) >= 85 else -6
        if sc > best[1]: best = (bc, sc)
    return best[0], round(max(0, min(100, best[1])))

def sav(base, gift, price):
    if not base or not price: return None
    if gift and gift > 5 * base: gift = 0   # shortcut: cột quà bị điền Item ID → bỏ qua quà, KA cần sửa nguồn
    return round(1 - price / (base + (gift or 0)), 4)

# ---------- SCOM deal list ----------
exact = {}
for r in sku_rows:
    if r[4].strip():
        exact.setdefault(pn(r[6]), []).append((r[4].strip(), pn(r[2])))
scom = []
for r in L('scom.json')[1:]:
    if not cell(r, 4): continue
    brand = brand_of(cell(r, 3)) or cell(r, 3).strip().upper()
    nm, var = cell(r, 4), cell(r, 5)
    bc, conf = None, 0
    c = exact.get(pn(nm))
    if c:
        pick = [x for x in c if x[1] == pn(var)] or c
        bc, conf = pick[0][0], 100
    else:
        bc, conf = match(brand, nm, var)
    base, gift, price = num(cell(r, 6)), num(cell(r, 7)), num(cell(r, 9))
    scom.append(dict(ch='SCOM', brand=brand, name=nm, variant=var, type=cell(r, 1), base=base, gift=gift,
                     price=price, final=price, stock=num(cell(r, 11)), bc=bc if conf >= 70 else None,
                     bc_guess=bc, conf=conf, sav=sav(base, gift, price), sav_final=sav(base, gift, price)))

# ---------- SHOPEE deal list (picked only) ----------
shp = []
for r in L('shp.json')[1:]:
    if cell(r, 38) not in ('ATC', 'REVIEW'): continue
    brand = brand_of(cell(r, 1)) or cell(r, 1)
    nm, var = cell(r, 5), cell(r, 7)
    bc, conf = match(brand_of(cell(r, 1)), nm, var)
    base, gift, price = num(cell(r, 8)), num(cell(r, 14)), num(cell(r, 9))
    final = num(cell(r, 41)) or price   # col AP "Giá Brand Sau voucher Seller" (AT Final đang #REF!)
    shp.append(dict(ch='SHP', brand=brand, name=nm, variant=var, item=cell(r, 3), model=cell(r, 6),
                    ka=cell(r, 37), pick=cell(r, 38), base=base, gift=gift, price=price, final=final,
                    stock=num(cell(r, 52)) or num(cell(r, 10)), giftname=cell(r, 13)[:120],
                    bc=bc if conf >= 70 else None, bc_guess=bc, conf=conf,
                    sav=sav(base, gift, price), sav_final=sav(base, gift, final)))

# ---------- TIKTOK deal list ----------
tts = []
for r in L('tts.json')[1:]:
    if not cell(r, 4): continue
    brand = brand_of(cell(r, 1)) or cell(r, 1)
    nm, var = cell(r, 4), cell(r, 5)
    bc, conf = match(brand_of(cell(r, 1)), nm, var)
    base, gift, price = num(cell(r, 7)), num(cell(r, 12)), num(cell(r, 8))
    final = num(cell(r, 26)) or price
    tts.append(dict(ch='TTS', brand=brand, name=nm, variant=var, item=cell(r, 3), ka=cell(r, 2),
                    pick=cell(r, 29), type=cell(r, 16), base=base, gift=gift, price=price, final=final,
                    stock=num(cell(r, 10)), giftname=cell(r, 11)[:120],
                    bc=bc if conf >= 70 else None, bc_guess=bc, conf=conf,
                    sav=sav(base, gift, price), sav_final=sav(base, gift, final)))

# ---------- PFM ----------
pf_shp = {}
for r in L('pfm_shp.json')[1:]:
    if cell(r, 1):
        pf_shp[cell(r, 1)] = dict(gmv=num(cell(r, 6)) or 0, units=num(cell(r, 11)) or 0,
                                  gmv_prev=num(cell(r, 5)) or 0, cr=cell(r, 13))
pf_tts = {}
for r in L('pfm_tts.json')[1:]:
    if re.fullmatch(r'\d{10,}', cell(r, 0)):
        pf_tts[cell(r, 0)] = dict(gmv=num(cell(r, 4)) or 0, units=num(cell(r, 8)) or 0, ctr=cell(r, 9))
pf_scom = collections.defaultdict(lambda: dict(gmv=0, units=0))
for r in L('pfm_scom.json')[1:]:
    bc = cell(r, 12)
    if bc and '#' not in bc:
        pf_scom[bc]['gmv'] += (num(cell(r, 6)) or 0) / 3   # Q3 → TB/tháng
        pf_scom[bc]['units'] += (num(cell(r, 3)) or 0) / 3

def attach_pfm(rows, getp):
    for d in rows:
        p = getp(d)
        d['pfm_gmv'], d['pfm_units'] = (round(p['gmv']), round(p['units'])) if p else (0, 0)
attach_pfm(shp, lambda d: pf_shp.get(d['item']))
attach_pfm(tts, lambda d: pf_tts.get(d['item']))
attach_pfm(scom, lambda d: pf_scom.get(d['bc']) if d['bc'] else None)
# PFM per item is split across model rows: share equally so the item total is not counted N times
for rows in (shp, tts):
    cnt = collections.Counter(d['item'] for d in rows)
    for d in rows:
        n = cnt[d['item']]
        d['pfm_gmv'], d['pfm_units'] = round(d['pfm_gmv'] / n), round(d['pfm_units'] / n, 1)

# ---------- forecast + score ----------
def pct_rank(vals):
    s = sorted(vals); n = len(s)
    return lambda x: 0 if n < 2 else sum(1 for v in s if v < x) / (n - 1)

def score(rows):
    savs = [d['sav_final'] for d in rows if d['sav_final'] is not None]
    med = statistics.median(savs) if savs else 0
    brand_units = collections.defaultdict(list)
    for d in rows:
        if d['pfm_units']: brand_units[d['brand']].append(d['pfm_units'])
    all_units = [d['pfm_units'] for d in rows if d['pfm_units']]
    ch_med = statistics.median(all_units) if all_units else 0
    for d in rows:
        f = max(.6, min(1.6, 1 + 1.5 * ((d['sav_final'] or 0) - med)))
        if d['pfm_units']: base, src = d['pfm_units'] * .8, 'hist'          # post-mega decay 20%
        elif brand_units[d['brand']]: base, src = statistics.median(brand_units[d['brand']]) * .5, 'brand'
        else: base, src = ch_med * .3, 'channel'
        u = base * f
        if d['stock'] is not None: u = min(u, d['stock'])
        d['fc_units'], d['fc_src'] = round(u), src
        d['fc_gmv'] = round(u * (d['final'] or 0))
    r_p = pct_rank([d['pfm_gmv'] for d in rows]); r_f = pct_rank([d['fc_gmv'] for d in rows])
    r_s = pct_rank([d['sav_final'] or 0 for d in rows])
    for d in rows:
        st = 0 if not d['stock'] else min(1, d['stock'] / max(d['fc_units'], 1))
        d['score'] = round(100 * (.30 * r_p(d['pfm_gmv']) + .25 * r_f(d['fc_gmv']) +
                                  .25 * r_s(d['sav_final'] or 0) + .20 * st), 1)
    ranked = sorted(rows, key=lambda d: -d['score'])
    n = len(ranked)
    for i, d in enumerate(ranked):
        d['rank'] = i + 1
        d['tier'] = ('TOP' if i < n * .15 and d['stock'] else 'NÊN BÁN' if i < n * .5 else
                     'THEO DÕI' if i < n * .8 else 'KHÔNG ƯU TIÊN')
for rows in (scom, shp, tts): score(rows)

# ---------- summary by barcode ----------
summ = {}
for rows in (scom, shp, tts):
    for d in rows:
        if not d['bc']: continue
        s = summ.setdefault(d['bc'], dict(bc=d['bc'], brand=BARCODE[d['bc']]['brand'],
                                          name=BARCODE[d['bc']]['name'], variant=BARCODE[d['bc']]['variant'],
                                          cat=BARCODE[d['bc']]['cat']))
        for key in ('sav', 'sav_final'):
            k = f"{d['ch']}_{key}"
            if d[key] is not None and (s.get(k) is None or d[key] > s[k]):
                s[k] = d[key]
                if key == 'sav_final': s[d['ch'] + '_conf'] = d['conf']
        s[d['ch'] + '_n'] = s.get(d['ch'] + '_n', 0) + 1
        k = d['ch'] + '_pfm'   # SCOM rows share one barcode PFM → max; SHP/TTS rows are split per item → sum
        s[k] = max(s.get(k, 0), d['pfm_gmv']) if d['ch'] == 'SCOM' else s.get(k, 0) + d['pfm_gmv']
for s in summ.values(): s['pfm'] = sum(s.get(c + '_pfm', 0) for c in ('SCOM', 'SHP', 'TTS'))

out = dict(generated='2026-11-18', summary=list(summ.values()), SCOM=scom, SHP=shp, TTS=tts,
           meta=dict(scom_src='MIX CAMP T11 · DEAL LIST', shp_src='Deal List SHOPEE LIVE · 11.11 (ATC/REVIEW)',
                     tts_src='MEGA 11.11 TTS x HO · 2. Deal List 11.11',
                     pfm=dict(SHP='SO SÁNH 3 MEGA · BY SKU (GMV/Đơn 11.11)', TTS='Plan BF · SKU 11.11 (GMV/Items sold)',
                              SCOM='SKU TRACKING · DATAPFM Q3.2026 (TB/tháng)')))
for k in ('SCOM', 'SHP', 'TTS'):
    for d in out[k]:
        for f in list(d):
            if isinstance(d[f], float) and f not in ('sav', 'sav_final'): d[f] = round(d[f], 1)
json.dump(out, open('data.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------- self-check ----------
assert sav(586000, 160000, 420000) == round(1 - 420000 / 746000, 4)
assert num('1.316.072.806') == 1316072806 and num('11,6%') == 11.6 and num('9,390,000') == 9390000
for k in ('SCOM', 'SHP', 'TTS'):
    rs = out[k]; m = sum(1 for d in rs if d['bc'])
    rv = sum(1 for d in rs if d['bc'] and d['conf'] < 85)
    print(k, len(rs), 'mapped', m, 'review(70-84)', rv, 'pfm>0', sum(1 for d in rs if d['pfm_gmv']))
print('summary barcodes', len(summ), 'in>=2ch', sum(1 for s in summ.values() if sum(1 for c in ('SCOM','SHP','TTS') if s.get(c+'_n'))>=2))
