"""Tải ảnh sản phẩm, tách nền, giữ SP chính, đặt lên nền trắng → ../../deal/thumbs/<key>.webp (128px).
key = barcode (chung 3 kênh) hoặc key kênh (SHP-<item>, TTS-<pid>, SCOM-n<hash>) cho dòng chưa có barcode.
Nguồn (theo thứ tự): thumbs_src.json (thumbs.js: ảnh tách nền Drive, ảnh hannaholala.com) rồi thumbs_extra.json {key: [url ảnh tìm trên web]}.
Bỏ qua key đã có file, trừ khi chạy với --force. Cần: pip install "rembg[cpu]" pillow scipy
"""
import io, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session

OUT = '../../deal/thumbs'
PRE = 'https://cdn.hstatic.net/products/1000312510/'
SIZE, PAD = 128, 6
SESS = new_session('isnet-general-use')

def url(s):
    if s.startswith('d:'): return f'https://drive.google.com/thumbnail?id={s[2:]}&sz=w600'
    if s.startswith('http'): return s
    stem, ext = s.rsplit('.', 1); return f'{PRE}{stem}_large.{ext}'

def fetch(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*'})
    return Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read()))

def main_object(cut, banner):
    a = np.array(cut.getchannel('A')); lab, n = ndimage.label(a > 40)
    if n > 1:
        H, W = a.shape; idx = range(1, n + 1)
        area = np.array(ndimage.sum_labels(np.ones_like(a), lab, idx)); cy, cx = np.array(ndimage.center_of_mass(a > 40, lab, idx)).T
        # banner hannaholala.com: SP chính ở dưới-trái, quà bên phải, chữ phía trên
        zone = (cx < 0.6 * W) & (cy > 0.3 * H) if banner else np.ones(n, bool)
        sc = np.where(zone, area, area * 0.2); m = sc.argmax()
        keep = 1 + np.flatnonzero((area >= 0.5 * area[m]) & (zone == zone[m]) & (np.abs(cx - cx[m]) < 0.35 * W))
        a[~np.isin(lab, keep)] = 0; cut.putalpha(Image.fromarray(a))
    return cut

def make(src):
    im = fetch(url(src))
    if im.mode in ('RGBA', 'LA', 'P') and sum(im.convert('RGBA').getchannel('A').histogram()[:30]) >= 0.05 * im.width * im.height:
        cut = im.convert('RGBA')                                   # đã tách nền sẵn (ảnh Drive của KA)
    else:
        cut = main_object(remove(im.convert('RGB'), session=SESS), banner=not src.startswith(('d:', 'http')))
    bb = cut.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bb or (bb[2] - bb[0]) * (bb[3] - bb[1]) < 0.03 * cut.width * cut.height: raise ValueError('không thấy SP')
    cut = cut.crop(bb); cut.thumbnail((SIZE - 2 * PAD, SIZE - 2 * PAD), Image.LANCZOS)
    bg = Image.new('RGB', (SIZE, SIZE), 'white'); bg.paste(cut, ((SIZE - cut.width) // 2, (SIZE - cut.height) // 2), cut)
    return bg

def job(item):
    key, srcs = item
    for s in srcs:
        try:
            make(s).save(f'{OUT}/{key}.webp', 'WEBP', quality=82, method=6); return key, s
        except Exception:
            continue
    return key, None

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    src = json.load(open('thumbs_src.json')) if os.path.exists('thumbs_src.json') else {}
    if os.path.exists('thumbs_extra.json'):
        for k, us in json.load(open('thumbs_extra.json')).items(): src[k] = src.get(k, []) + us
    todo = [(k, v) for k, v in src.items() if '--force' in sys.argv or not os.path.exists(f'{OUT}/{k}.webp')]
    ok = fail = 0
    with ThreadPoolExecutor(4) as ex:
        for i, (k, s) in enumerate(ex.map(job, todo), 1):
            ok += bool(s); fail += not s
            if i % 100 == 0: print(i, '/', len(todo), 'ok', ok, 'lỗi', fail, flush=True)
    print('xong: ok', ok, 'lỗi', fail, '· tổng file', len(os.listdir(OUT)))
