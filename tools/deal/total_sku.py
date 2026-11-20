"""TOTAL SKU Hannah: Scom barcode + latest Shopee Item ID + latest TikTok PID; new barcodes for SHP/TTS-only products.
Inputs: data/*.json (Sheets dumps). Output: total_sku.xlsx
"""
import json, re, collections
exec(open('build.py').read().split('def sav(')[0])   # reuse num/cell/bkey/brand_of/pn/sizes/multi/match/sku_rows/BARCODE
from rapidfuzz import fuzz
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

# ---------- Scom master ----------
CODE = {}                     # brand -> code (from existing barcodes)
MAXSEQ = collections.Counter()
skus = collections.OrderedDict()
for r in sku_rows:
    bc = r[4].strip()
    if not bc: continue
    m = re.fullmatch(r'([A-Z0-9]+)-(\d{6})', bc)
    if m:
        CODE.setdefault(r[0], m.group(1)); MAXSEQ[m.group(1)] = max(MAXSEQ[m.group(1)], int(m.group(2)))
    s = skus.setdefault(bc, dict(brand=r[0], name=r[1], variant=r[2] or 'STANDARD', cat=r[3], bc=bc, haravan=[], full=r[6], status='CÓ SẴN SCOM'))
    if r[5].strip(): s['haravan'].append(r[5].strip())
BRAND_CAT = collections.defaultdict(collections.Counter)
for s in skus.values(): BRAND_CAT[s['brand']][s['cat']] += 1

pf_scom = collections.Counter()
for r in L('pfm_scom.json')[1:]:
    if cell(r, 12) and '#' not in cell(r, 12): pf_scom[cell(r, 12)] += num(cell(r, 6)) or 0

# ---------- channel entries (only products with PFM, + BF new PIDs) ----------
entries = []   # dict(ch, brand_raw, name, variant, id, model, rank, gmv, src)
shp_pf = {}
for r in L('pfm_shp.json')[1:]:
    it = cell(r, 1)
    if not it: continue
    g = {m: num(cell(r, i)) or 0 for m, i in (('9.9', 4), ('10.10', 5), ('11.11', 6))}
    last = max([m for m in g if g[m]] or ['9.9'], key=['9.9', '10.10', '11.11'].index)
    shp_pf[it] = dict(brand=cell(r, 0), name=cell(r, 2), gmv=g, last=last)
RANK = {'9.9': 1, '10.10': 2, '11.11': 3}
seen = set()
for r in L('shp.json')[1:]:
    it = cell(r, 3)
    if it not in shp_pf: continue
    new_it = cell(r, 53) if re.fullmatch(r'\d{8,}', cell(r, 53)) else (cell(r, 33) if re.fullmatch(r'\d{8,}', cell(r, 33)) else it)
    new_md = cell(r, 54) if re.fullmatch(r'\d{6,}', cell(r, 54)) else cell(r, 6)
    k = (new_it, new_md)
    if k in seen: continue
    seen.add(k)
    p = shp_pf[it]
    entries.append(dict(ch='SHP', brand_raw=cell(r, 1), name=cell(r, 5), variant=cell(r, 7), id=new_it, model=new_md,
                        rank=4, gmv=p['gmv']['11.11'], src='Deal list 11.11'))
in_deal = {e['id'] for e in entries} | {cell(r, 3) for r in L('shp.json')[1:]}
for it, p in shp_pf.items():
    if it in in_deal: continue
    entries.append(dict(ch='SHP', brand_raw=p['brand'], name=p['name'], variant='', id=it, model='', rank=RANK[p['last']],
                        gmv=p['gmv']['11.11'], src='PFM ' + p['last']))

tts_pf = {cell(r, 0): dict(brand=cell(r, 1), name=cell(r, 2), gmv=num(cell(r, 4)) or 0) for r in L('pfm_tts.json')[1:] if re.fullmatch(r'\d{10,}', cell(r, 0))}
for r in L('raw_tts.json')[1:]:
    if re.fullmatch(r'\d{10,}', cell(r, 3)): tts_pf.setdefault(cell(r, 3), dict(brand=cell(r, 5), name=cell(r, 4), gmv=num(cell(r, 6)) or 0))
seen = set()
for r in L('tts.json')[1:]:
    pid = cell(r, 3)
    if pid not in tts_pf or (pid, cell(r, 5)) in seen: continue
    seen.add((pid, cell(r, 5)))
    entries.append(dict(ch='TTS', brand_raw=cell(r, 1), name=cell(r, 4), variant=cell(r, 5), id=pid, model='', rank=3, gmv=tts_pf[pid]['gmv'], src='Deal list 11.11'))
in_deal = {cell(r, 3) for r in L('tts.json')[1:]}
for pid, p in tts_pf.items():
    if pid not in in_deal:
        entries.append(dict(ch='TTS', brand_raw=p['brand'], name=p['name'], variant='', id=pid, model='', rank=3, gmv=p['gmv'], src='PFM 11.11'))
BF_NEW = [  # Black Friday tab: PIDs not in any 11.11 file (no PFM yet, newest listings)
    ('1738387659638408437', 'SULWHASOO', 'SON DƯỠNG SULWHASOO PERFECTING TINTED LIP OIL 5G'),
    ('1738607837459219701', 'SULWHASOO', '[PHIÊN BẢN LỄ HỘI] PHẤN NƯỚC TRANG ĐIỂM MỎNG NHẸ MỊN LÌ 15GX2 (KÈM LÕI THAY THẾ)'),
    ('1731730138536380181', 'INNISFREE', 'SERUM VITAMIN C SÁNG DA, MỜ THÂM MỤN INNISFREE GREEN TEA ENZYME BRIGHTENING SERUM 30ML & KEM DƯỠNG VITAMIN C SÁNG DA, MỜ THÂM DẠNG GEL INNISFREE GREEN TEA ENZYME BRIGHTENING CREAM 50ML'),
    ('1731945732969498389', 'INNISFREE', 'SERUM VITAMIN C SÁNG DA, MỜ THÂM MỤN INNISFREE GREEN TEA ENZYME BRIGHTENING SERUM 30ML & KEM CHỐNG NẮNG NÂNG TÔNG KIỀM DẦU INNISFREE TONE UP NO SEBUM SUNSCREEN SPF50+ PA++++ 50ML'),
    ('1738601022873569003', 'TORRIDEN', 'TONER DƯỠNG DA TORRIDEN 200ML'),
    ('1738600897367803627', 'TORRIDEN', 'KEM DƯỠNG TRẮNG SÁNG VIÊN NANG 5D VITA TORRIDEN 50ML'),
    ('1738601023611438827', 'TORRIDEN', 'KEM DƯỠNG TRẮNG SÁNG DA CHO ĐỐM NÂU & VẾT THÂM MỤN SẢN PHẨM DƯỠNG DA 30ML'),
]
for pid, b, n in BF_NEW:
    entries.append(dict(ch='TTS', brand_raw=b, name=n, variant='', id=pid, model='', rank=4, gmv=0, src='Black Friday (chưa PFM)'))

# ---------- brands: existing or new code ----------
NEWB = {}   # bkey -> display name
def canon_brand(raw):
    if bkey(raw) == 'THEHISTORYOFWHOO': return 'WHOO'
    b = brand_of(raw)
    if b: return b
    k = bkey(raw)
    if k in NEWB: return NEWB[k]
    for nk in list(NEWB):
        if len(nk) >= 4 and len(k) >= 4 and (k.startswith(nk) or nk.startswith(k)):
            if len(k) < len(nk): NEWB[k] = NEWB.pop(nk)   # keep shorter key (SAMSUNG over SAMSUNGAV)
            return NEWB[min(k, nk, key=len)] if min(k, nk, key=len) in NEWB else NEWB[k]
    name = re.sub(r'(?i)(official( store)?|\bstore\b|vi[eệ]t ?nam|_official|[^\x00-\u024f])', ' ', raw.replace('_', ' '))
    name = re.sub(r'\s+', ' ', name).strip().upper()
    NEWB[k] = name or raw.upper()
    return NEWB[k]
used = set(CODE.values())
def new_code(brand):
    w = re.sub(r'[^A-Z0-9]', '', unidecode(brand).upper())
    cands = [w[:3]] if len(w) <= 3 else []
    cons = w[0] + re.sub(r'[AEIOUY]', '', w[1:])
    cands += [cons[:3], w[:3], w[0] + w[2:4]]
    cands += [w[0] + w[i] + w[j] for i in range(1, len(w)) for j in range(i + 1, len(w))]
    for c in cands:
        if len(c) == 3 or (len(w) <= 3 and c == w):
            if c not in used: used.add(c); return c
    raise ValueError('no code for ' + brand)
NEW_BRAND_CODES = {}
def code_of(brand):
    if brand not in CODE:
        CODE[brand] = new_code(brand); NEW_BRAND_CODES[brand] = CODE[brand]
    return CODE[brand]

# ---------- short name (loại SP + tên tiếng Anh) ----------
VN = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.I)
NOISE = re.compile(r'(?i)\[[^\]]*\]|\([^)]*\)|\b(hannah( olala)?|x hannah|độc quyền|deal \d+|flash ?deal|live|mua \d.*)\b')
def short_name(name, brand, raw=''):
    s = NOISE.sub(' ', name)
    s = re.sub(r'\s*[-–|:]\s*', ' ', s); s = re.sub(r'\s+', ' ', s).strip()
    pats = [re.escape(x) for x in {brand, raw, *(brand.split() if len(brand.split()) == 1 else [])} if x and len(x) > 1]
    m = re.search(r'(?i)(?<![\w])(' + '|'.join(pats) + r')(?![\w])', s) if pats else None
    if m and m.start() > 0:       # "Loại SP" + BRAND + "English name …"
        before = s[:m.start()].split()[-6:]
        after = []
        for t in s[m.end():].split():
            if VN.search(t): break
            after.append(t)
        out = ' '.join(before + after[:8]).strip(' ,&+')
        if after: return out.upper()[:90]
    if m: s = (s[:m.start()] + ' ' + s[m.end():]).strip()
    toks = s.split()
    vn = []
    for t in toks:           # leading Vietnamese words = product type (max 4)
        if VN.search(t) or t.lower() in ('kem', 'son', 'gel', 'toner', 'serum', 'combo', 'set', 'bo', 'may', 'nuoc'):
            vn.append(t)
            if len(vn) >= 4: break
        elif vn: break
    en, best = [], []
    for t in toks:           # longest run of non-Vietnamese tokens = English name
        if VN.search(t): best = max(best, en, key=len); en = []
        else: en.append(t)
    best = max(best, en, key=len)
    best = [t for t in best if t not in vn][:8]
    out = ' '.join(vn + best).strip(' ,&+') or s
    return re.sub(r'\s+', ' ', out).upper()[:90]

def infer_cat(brand, name):
    if BRAND_CAT[brand]: return BRAND_CAT[brand].most_common(1)[0][0]
    n = unidecode(name).upper()
    for kw, c in (('KEM DANH RANG|BAN CHAI|NUOC SUC MIENG', 'ORAL CARE'), ('MAY |TAI NGHE|DIEN THOAI|LOA |SAC |CAP |ROBOT|TU LANH|MAY GIAT|TIVI|LAPTOP|DONG HO THONG MINH|VONG DEO TAY THONG MINH|DIEU HOA', 'ELECTRONICS & HOME'), ('NUOC HOA|EDP|EDT|PARFUM', 'FRAGRANCE'), ('SON |PHAN |CUSHION|MASCARA|KE MAT|MAKEUP', 'MAKEUP'), ('DAU GOI|DAU XA|GOI |TOC', 'HAIRCARE'),
                  ('SUA TAM|DUONG THE|BODY', 'BODYCARE'), ('KEM|SERUM|TONER|CHONG NANG|SUA RUA MAT|TAY TRANG|MAT NA|TINH CHAT', 'SKINCARE'),
                  ('SUA |VIEN UONG|THUC PHAM|YEN|TPCN|VITAMIN|TA/BIM|BIM |TA |BANH|KEO|NUOC GIAT|NUOC RUA', 'FMCG & HEALTH'), ('MAY |TAI NGHE|DIEN THOAI|LOA|SAC|ROBOT|NOI|QUAT', 'ELECTRONICS & HOME'),
                  ('VALI|GIAY|DEP|TUI|BALO|AO |QUAN ', 'FASHION & TRAVEL')):
        if re.search(kw, n): return c
    return 'CHƯA PHÂN LOẠI'

# ---------- map entries → existing barcode, else cluster into new SKUs ----------
NEW = []   # new sku dicts with tokens for clustering
for e in entries:
    e['brand'] = canon_brand(e['brand_raw']) if e['brand_raw'] else '(KHÔNG RÕ BRAND)'
    bc, conf = match(brand_of(e['brand_raw']) if e['brand_raw'] else None, e['name'], e['variant'])
    e['conf'] = conf
    if bc and conf >= 70:
        e['bc'] = bc; continue
    q, qv, qs = pn(e['name']), pn(e['variant']), sizes(pn(e['name']))
    hit = None
    for n in NEW:   # same product across SHP/TTS (or two listings) → one new barcode
        if n['brand'] != e['brand'] or n['qv'] != qv: continue
        if n['qs'] and qs and not (n['qs'] & qs): continue
        if fuzz.token_set_ratio(q, n['q']) >= 90: hit = n; break
    if not hit:
        hit = dict(raw=e['brand_raw'], brand=e['brand'], q=q, qv=qv, qs=qs, name_src=e['name'], variant=e['variant'] or 'STANDARD')
        NEW.append(hit)
    e['bc'] = None; e['new'] = hit
for n in NEW:
    c = code_of(n['brand']); MAXSEQ[c] += 1
    n['bc'] = f'{c}-{MAXSEQ[c]:06d}'
    skus[n['bc']] = dict(brand=n['brand'], name=short_name(n['name_src'], n['brand'], n.get('raw', '')), variant=n['variant'].upper(), cat=infer_cat(n['brand'], n['name_src']),
                         bc=n['bc'], haravan=[], full=n['name_src'].upper(), status='MỚI – CHỜ DUYỆT' + (' (mã brand mới)' if n['brand'] in NEW_BRAND_CODES else ''))
for e in entries:
    if e.get('new'): e['bc'] = e['new']['bc']; e['conf'] = 0

# ---------- pick latest ID per barcode per channel ----------
by = collections.defaultdict(lambda: collections.defaultdict(list))
for e in entries: by[e['bc']][e['ch']].append(e)
rows = []
for bc, s in skus.items():
    out = dict(s)
    for ch in ('SHP', 'TTS'):
        es = sorted(by[bc][ch], key=lambda e: (-e['rank'], -e['gmv']))
        if es:
            b = es[0]
            out[ch] = b; out[ch + '_old'] = ', '.join(sorted({e['id'] for e in es[1:] if e['id'] != b['id']}))
            out[ch + '_gmv'] = sum({e['id']: e['gmv'] for e in es}.values())
    rows.append(out)
# keep only "đang chạy": Scom SKUs + any SKU with SHP/TTS presence (Scom master kept whole)
order = {'MỚI': 1}
rows.sort(key=lambda r: (r['brand'], r['bc']))

# ---------- write xlsx ----------
H = ['BRAND', 'MÃ BRAND', 'SẢN PHẨM', 'BIẾN THỂ', 'CATEGORY', 'BARCODE (MÃ SẢN PHẨM)', 'TRẠNG THÁI', 'SKU HARAVAN',
     'SHOPEE ITEM ID (mới nhất)', 'SHOPEE MODEL ID', 'SHOPEE NGUỒN', 'SHOPEE ĐỘ TIN CẬY MAP', 'SHOPEE ITEM ID CŨ KHÁC',
     'TIKTOK PID (mới nhất)', 'TIKTOK NGUỒN', 'TIKTOK ĐỘ TIN CẬY MAP', 'TIKTOK PID CŨ KHÁC',
     'GMV SCOM Q3', 'GMV SHOPEE 11.11', 'GMV TIKTOK 11.11', 'TÊN GỐC (THAM KHẢO)', 'TÊN SHOPEE', 'TÊN TIKTOK']
def conf_lbl(e): return '' if not e else ('Mã mới' if e.get('new') else e['conf'] if e['conf'] < 85 else 'OK')
wb = Workbook(); ws = wb.active; ws.title = 'TOTAL SKU'
ws.append(H)
for r in rows:
    S, T = r.get('SHP'), r.get('TTS')
    ws.append([r['brand'], CODE.get(r['brand'], r['bc'].split('-')[0]), r['name'], r['variant'], r['cat'], r['bc'], r['status'], ', '.join(r['haravan']),
               S and S['id'], S and S['model'], S and S['src'], conf_lbl(S), r.get('SHP_old', ''),
               T and T['id'], T and T['src'], conf_lbl(T), r.get('TTS_old', ''),
               round(pf_scom.get(r['bc'], 0)) or None, round(r.get('SHP_gmv', 0)) or None, round(r.get('TTS_gmv', 0)) or None,
               r['full'], S and S['name'], T and T['name']])
ws2 = wb.create_sheet('TOTAL BRAND'); ws2.append(['BRAND', 'MÃ BRAND', 'TRẠNG THÁI', 'SỐ SKU', 'CÓ SHOPEE', 'CÓ TIKTOK'])
cnt = collections.Counter(r['brand'] for r in rows)
for b in sorted(cnt):
    ws2.append([b, CODE.get(b), 'MÃ BRAND MỚI – CHỜ DUYỆT' if b in NEW_BRAND_CODES else 'CÓ SẴN', cnt[b],
                sum(1 for r in rows if r['brand'] == b and r.get('SHP')), sum(1 for r in rows if r['brand'] == b and r.get('TTS'))])
ws3 = wb.create_sheet('CẦN DUYỆT'); ws3.append(['LÝ DO'] + H)
for r in rows:
    why = []
    if r['status'].startswith('MỚI'): why.append('Barcode mới')
    for ch, lab in (('SHP', 'Shopee'), ('TTS', 'TikTok')):
        e = r.get(ch)
        if e and not e.get('new') and e['conf'] < 85: why.append(f'Map {lab} {e["conf"]}')
    if why:
        S, T = r.get('SHP'), r.get('TTS')
        ws3.append(['; '.join(why), r['brand'], CODE.get(r['brand']), r['name'], r['variant'], r['cat'], r['bc'], r['status'], ', '.join(r['haravan']),
                    S and S['id'], S and S['model'], S and S['src'], conf_lbl(S), r.get('SHP_old', ''), T and T['id'], T and T['src'], conf_lbl(T), r.get('TTS_old', ''),
                    round(pf_scom.get(r['bc'], 0)) or None, round(r.get('SHP_gmv', 0)) or None, round(r.get('TTS_gmv', 0)) or None, r['full'], S and S['name'], T and T['name']])
ws4 = wb.create_sheet('GHI CHÚ')
for line in [
    ['TOTAL SKU Hannah – tạo 19/11/2026 bởi Claude'],
    ['Nguồn: SCOM_DATA_SKU_TRACKING (TOTAL DATA SKU, DATAPFM Q3) · Deal List SHOPEE LIVE 11.11 · SO SÁNH 3 MEGA (BY SKU) · TTS x HO (2. Deal List 11.11, Black Friday) · Plan BF (SKU 11.11, Raw 10&11)'],
    ['Phạm vi: toàn bộ SKU Scom + mọi sản phẩm Shopee/TikTok có PFM (Shopee 9.9/10.10/11.11, TikTok 11.11) + PID mới ở tab Black Friday.'],
    ['Item ID/PID mới nhất: ưu tiên Black Friday > deal list 11.11 (cột Final Item ID/Model ID nếu có) > PFM 11.11 > 10.10 > 9.9; trùng thì lấy GMV cao hơn. ID khác của cùng barcode ghi ở cột "CŨ KHÁC".'],
    ['Độ tin cậy map: OK = ≥85 điểm; 70–84 = cần KA duyệt; dưới 70 = tạo barcode mới.'],
    ['Barcode mới: MÃ BRAND-6 số, nối tiếp số lớn nhất của brand trong SKU TRACKING. Brand chưa có mã: Claude đặt mã 3 ký tự không trùng mã cũ.'],
    ['Tên rút gọn (SẢN PHẨM) của barcode mới tạo tự động theo quy tắc "loại SP + tên tiếng Anh" → KA cần rà lại trước khi đưa vào SKU TRACKING.'],
    ['File này KHÔNG ghi vào SKU TRACKING gốc.'],
]: ws4.append(line)
hdr = PatternFill('solid', fgColor='1F2937')
for w in (ws, ws2, ws3):
    for c in w[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = hdr; c.alignment = Alignment(wrap_text=True, vertical='center')
    w.freeze_panes = 'A2'; w.auto_filter.ref = w.dimensions
    for col in w.columns:
        w.column_dimensions[col[0].column_letter].width = min(48, max(10, max(len(str(c.value or '')) for c in col[:200]) + 2))
for w, idcols in ((ws, 'IJN'), (ws3, 'JKO')):
    for L_ in idcols:
        for c in w[L_][1:]: c.number_format = '@'; c.value = None if c.value is None else str(c.value)
new_fill = PatternFill('solid', fgColor='FFF4D6')
for row in ws.iter_rows(min_row=2):
    if str(row[6].value).startswith('MỚI'):
        for c in row[:8]: c.fill = new_fill
wb.save('total_sku.xlsx')

# ---------- self-check ----------
bcs = [r['bc'] for r in rows]
assert len(bcs) == len(set(bcs)), 'duplicate barcode'
assert all(re.fullmatch(r'[A-Z0-9]+-\d{6}', b) for b in bcs if b in {n['bc'] for n in NEW})
print('rows', len(rows), 'existing', sum(1 for r in rows if r['status'] == 'CÓ SẴN SCOM'), 'new', len(NEW),
      'new brands', len(NEW_BRAND_CODES), '| with SHP', sum(1 for r in rows if r.get('SHP')), 'with TTS', sum(1 for r in rows if r.get('TTS')),
      '| entries', len(entries), collections.Counter(e['ch'] for e in entries))
print(dict(list(NEW_BRAND_CODES.items())[:40]))
