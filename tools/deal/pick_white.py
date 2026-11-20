"""Chỉ giữ ảnh nền trắng: chọn ảnh nền trắng nhất cho mỗi barcode lấy ảnh từ web (thumbs_cand.json do thumbs.js tạo), ghi đè vào thumbs.json.
Điểm = tỉ lệ pixel viền ảnh gần trắng (hoặc trong suốt). Cần Pillow.  Chạy: python pick_white.py
"""
import json, io, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
PRE = 'https://cdn.hstatic.net/products/1000312510/'

def url(f):
    if f.startswith('d:'): return f'https://drive.google.com/thumbnail?id={f[2:]}&sz=w200'   # ảnh tách nền trên Drive
    return PRE + f.rsplit('.', 1)[0] + '_compact.' + f.rsplit('.', 1)[1]

def white(f):
    try:
        req = urllib.request.Request(url(f), headers={'User-Agent': 'Mozilla/5.0'})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGBA')
    except Exception:
        return -1
    w, h = im.size; px = im.load()
    # đã tách nền (nhiều pixel trong suốt) → đặt trên ô trắng là nền trắng, kể cả khi SP chạm mép ảnh
    if sum(im.getchannel('A').histogram()[:30]) >= 0.05 * w * h: return 1.0
    edge = [px[x, y] for x in range(w) for y in (0, 1, h - 2, h - 1)] + [px[x, y] for y in range(h) for x in (0, 1, w - 2, w - 1)]
    return sum(1 for r, g, b, a in edge if a < 30 or min(r, g, b) >= 235) / len(edge)

out, cand = json.load(open('thumbs.json')), json.load(open('thumbs_cand.json'))
cand.update({bc: [v] for bc, v in out.items() if v.startswith('d:')})
files = sorted({f for fs in cand.values() for f in fs})
with ThreadPoolExecutor(16) as ex: score = dict(zip(files, ex.map(white, files)))
WHITE = 0.9   # tỉ lệ viền trắng tối thiểu; banner deal nền màu bị loại, ô ảnh để chữ brand
n_white = 0
for bc, fs in cand.items():
    best = max(fs, key=lambda f: score[f])
    if score[best] >= WHITE: out[bc] = best; n_white += 1
    else: out.pop(bc, None)
json.dump(out, open('thumbs.json', 'w'), separators=(',', ':'))
print('ảnh tải', len(files), 'barcode xét', len(cand), 'giữ (nền trắng)', n_white, '· tổng barcode có ảnh', len(out))
