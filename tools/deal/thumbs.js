// Barcode → ảnh sản phẩm từ catalog công khai hannaholala.com (Haravan). Chung cho cả 3 kênh vì key là barcode.
// Thứ tự: barcode biến thể trên web → SKU Haravan trong TOTAL SKU → so tên trong cùng brand (≥ CORE.TH.auto).
// Ra thumbs.json {barcode: tên file ảnh}; trang ghép lại thành https://cdn.hstatic.net/products/<store>/<file>_compact.<ext>
const C = require('./core.js'), fs = require('fs');
const PRE = 'https://cdn.hstatic.net/products/1000312510/';

(async () => {
  const cat = [];
  for (let p = 1; ; p++) {
    const r = await fetch(`https://hannaholala.com/collections/all/products.json?limit=250&page=${p}`, {headers: {'User-Agent': 'Mozilla/5.0'}});
    if (!r.ok) throw new Error('catalog HTTP ' + r.status);
    const ps = (await r.json()).products; if (!ps.length) break; cat.push(...ps);
  }
  const total = JSON.parse(fs.readFileSync('data/total.json')).values, idx = C.skuIndex(total);
  const H = total[0], cs = H.indexOf('SKU HARAVAN'), cb = H.findIndex(h => /^BARCODE/.test(h));
  const skuBc = {}; for (const r of total.slice(1)) if (r[cs] && r[cb]) for (const s of r[cs].split(/[,\s]+/)) if (s) skuBc[s] = r[cb];

  // shortcut: ảnh ngoài CDN của store (hiếm) bị bỏ qua, nếu sau này có thì lưu URL đầy đủ
  const file = src => src && src.split('?')[0].replace(/^https?:/, 'https:').startsWith(PRE) ? src.split('?')[0].replace(/^https?:/, 'https:').slice(PRE.length) : null;
  const out = {}, cand = {}, how = {drive: 0, bc: 0, sku: 0, name: 0};
  // ưu tiên 1: ảnh tách nền KA gắn trong deal list Shopee/TikTok (cột "Link hình ảnh sản phẩm chính tách nền"), lưu dạng "d:<Drive file id>"
  for (const ch of ['SHP', 'TTS']) for (const r of C.parseDeals(ch, JSON.parse(fs.readFileSync(`data/${ch === 'SHP' ? 'shp' : 'tts'}.json`)).values, idx)) {
    const m = r.img.match(/\/file\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})/);
    if (m && r.bc && r.conf >= C.TH.auto && idx.bcInfo[r.bc] && !out[r.bc]) { out[r.bc] = 'd:' + (m[1] || m[2]); how.drive++; }
  }
  const put = (bc, f, k) => { if (bc && f && idx.bcInfo[bc] && !out[bc]) { out[bc] = f; cand[bc] = CANDS[f]; how[k]++; } };
  const CANDS = {};   // ảnh đại diện → mọi ảnh của SP đó (pick_white.py chọn ảnh nền trắng nhất)
  const vs = cat.flatMap(p => p.variants.map(v => {
    const all = [...new Set([v.featured_image?.src, ...p.images.map(i => i.src)].map(file).filter(Boolean))].slice(0, 6);
    return {p, v, f: all[0] && (CANDS[all[0]] ??= all, all[0])};
  }));
  for (const {v, f} of vs) put(v.barcode?.trim(), f, 'bc');
  for (const {v, f} of vs) put(skuBc[v.sku?.trim()], f, 'sku');
  for (const {p, v, f} of vs) {
    const [bc, sc] = C.match(idx, C.brandOf(idx, p.vendor), p.title, /^default/i.test(v.title) ? '' : v.title);
    if (sc >= C.TH.auto) put(bc, f, 'name');
  }
  // chiều ngược lại: barcode chưa có ảnh (thường là SP chỉ bán trên sàn) → tìm SP cùng brand trên web; "barcode" của index phụ là tên file ảnh
  const catIdx = C.skuIndex([['BRAND', 'SẢN PHẨM', 'BIẾN THỂ', 'BARCODE', 'TÊN GỐC'],
    ...vs.filter(x => x.f).map(({p, v, f}) => [p.vendor || '', p.title, /^default/i.test(v.title) ? 'STANDARD' : v.title, f, p.title])]);
  how.name2 = 0;
  for (const bc in idx.bcInfo) if (!out[bc]) {
    const b = idx.bcInfo[bc], [f, sc] = C.match(catIdx, C.brandOf(catIdx, b.brand), b.name, b.variant);
    if (sc >= C.TH.auto) put(bc, f, 'name2');
  }
  fs.writeFileSync('thumbs.json', JSON.stringify(out));
  fs.writeFileSync('thumbs_cand.json', JSON.stringify(cand));
  console.log('catalog', cat.length, 'variants', vs.length, 'barcodes có ảnh', Object.keys(out).length, '/', Object.keys(idx.bcInfo).length, how);
})();
