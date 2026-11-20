// Deal Compare core: parse sheets → rows, map barcode, PFM, score, MoM. Shared by the page and node tests.
const CORE = (() => {
  const TH = {auto: 80, min: 65};   // calibrated vs rapidfuzz run on 18/11 data: ~95% same barcode at ≥80
  const strip = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  function num(s) {
    s = String(s ?? '').trim().replace(/đ|VND/g, '');
    if (!s || s.includes('#')) return null;
    s = s.replace('%', '');
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else s = s.replace(',', '.');
    const v = Number(s); return Number.isFinite(v) ? v : null;
  }
  const STOP = /\b(OFFICIAL|STORE|VIET ?NAM|VN|LABORATORY|PROFESSIONAL|BEAUTY|PARIS|HOA TAY TU)\b/g;
  const ALIAS = {THEWHOO: 'WHOO', EAUTHERMALEAVENE: 'AVENE', PAULASCHOICE: 'PAULACHOICE', CHAKOLABVN: 'CHAKOLAB', NARCISO: 'NARCISORODRIGUEZ'};
  function bkey(b) { const k = strip(b).toUpperCase().replace(/_/g, ' ').replace(STOP, ' ').replace(/[^A-Z0-9]/g, ''); return ALIAS[k] || k; }
  function pn(s) {
    return strip(s).toUpperCase().replace(/\[[^\]]*\]/g, ' ')
      .replace(/\b(DEAL\s*\d+|HANNAH( OLALA)?|DOC QUYEN|FLASH DEAL|LIVE|X HANNAH|PHIEN BAN \d{4})\b/g, ' ')
      .replace(/[^A-Z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const sizes = s => new Set([...s.matchAll(/(\d+(?:\.\d+)?)\s?(ML|G|GR|KG|L|GOI|VIEN|MIENG|TUI)\b/g)].map(m => m[1] + m[2]));
  const multi = s => /\b(COMBO|BO DOI|SET|X ?[2-9]|[2-9] ?X)\b|\*[2-9]/.test(s);
  const tri = s => { const t = new Set(), x = ' ' + s + ' '; for (let i = 0; i < x.length - 2; i++) t.add(x.slice(i, i + 3)); return t; };
  const inter = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
  // shortcut: token-containment + trigram dice instead of rapidfuzz LCS (fast enough for 3k rows in-browser)
  function sim(qT, qG, cT, cG) {
    if (!qT.size || !cT.size) return 0;
    const contain = inter(qT, cT) / Math.min(qT.size, cT.size);
    const dice = 2 * inter(qG, cG) / (qG.size + cG.size);
    return 100 * (0.55 * contain + 0.45 * dice);
  }
  const toks = s => new Set(s.split(' ').filter(w => w.length > 1 || /\d/.test(w)));

  // ---- header lookup: exact (normalized) first, then regex ----
  const hn = s => strip(s).toUpperCase().replace(/\s+/g, ' ').trim();
  function findHeader(values, must) {
    for (let i = 0; i < Math.min(8, values.length); i++) {
      const row = (values[i] || []).map(hn);
      if (must.every(m => row.some(c => m.test(c)))) return i;
    }
    return -1;
  }
  function col(head, specs) {
    const H = head.map(hn);
    for (const s of specs) {
      const i = typeof s === 'string' ? H.indexOf(hn(s)) : H.findIndex(c => s.test(c));
      if (i >= 0) return i;
    }
    return -1;
  }
  const g = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');

  // ---- SKU tracking index ----
  function skuIndex(values) {
    const h = findHeader(values, [/^BRAND$/, /BARCODE/]); if (h < 0) throw new Error('SKU TRACKING: không thấy header BRAND/BARCODE');
    const H = values[h], c = {brand: col(H, ['BRAND']), name: col(H, ['SẢN PHẨM']), variant: col(H, ['BIẾN THỂ']), cat: col(H, ['CATEGORY']),
      bc: col(H, [/BARCODE/]), full: col(H, [/TEN GOC/]),
      // TOTAL SKU file adds channel IDs; SKU TRACKING has none (col = -1)
      shp: col(H, [/^SHOPEE ITEM ID \(MOI NHAT\)/]), shpm: col(H, [/^SHOPEE MODEL ID/]), shpo: col(H, [/^SHOPEE ITEM ID CU KHAC/]),
      tts: col(H, [/^TIKTOK PID \(MOI NHAT\)/]), ttso: col(H, [/^TIKTOK PID CU KHAC/])};
    const brands = {}, byBrand = {}, bcInfo = {}, exact = {}, ids = {SHP: {i: {}, im: {}}, TTS: {i: {}, im: {}}};
    const addId = (ch, id, bc) => { if (!id) return; const l = ids[ch].i[id] ??= []; if (!l.includes(bc)) l.push(bc); };
    for (const r of values.slice(h + 1)) {
      const b = g(r, c.brand), bc = g(r, c.bc); if (!b) continue;
      brands[bkey(b)] = b; if (!bc) continue;
      const v = g(r, c.variant), full = g(r, c.full);
      bcInfo[bc] ??= {brand: b, name: g(r, c.name), variant: v};
      const a = pn(full), bb = pn(g(r, c.name) + ' ' + (/^(STANDARD|DEFAULT)$/i.test(v) ? '' : v)), vv = pn(v);
      (byBrand[b] ??= []).push({bc, a, b: bb, v: vv, aT: toks(a), aG: tri(a), bT: toks(bb), bG: tri(bb), ss: sizes(a + ' ' + bb), m: multi(a)});
      (exact[a] ??= []).push({bc, v: vv});
      const si = g(r, c.shp), sm = g(r, c.shpm);
      addId('SHP', si, bc); if (si && sm) ids.SHP.im[si + '|' + sm] = bc;
      addId('TTS', g(r, c.tts), bc);
      for (const o of g(r, c.shpo).split(/[,\s]+/)) addId('SHP', o, bc);
      for (const o of g(r, c.ttso).split(/[,\s]+/)) addId('TTS', o, bc);
    }
    return {brands, byBrand, bcInfo, exact, ids};
  }
  function brandOf(idx, b) {
    const k = bkey(b); if (idx.brands[k]) return idx.brands[k];
    if (k.length >= 4) { let best = null; for (const sk in idx.brands) if (sk.length >= 4 && (k.startsWith(sk) || sk.startsWith(k)) && (!best || sk.length > best.length)) best = sk; if (best) return idx.brands[best]; }
    return null;
  }
  function match(idx, brand, name, variant) {
    const cands = brand && idx.byBrand[brand]; if (!cands) return [null, 0];
    const q = pn(name), qv = pn(variant), qT = toks(q), qG = tri(q), qs = sizes(q), qm = multi(q);
    let best = [null, 0];
    for (const c of cands) {
      let sc = Math.max(sim(qT, qG, c.aT, c.aG), sim(qT, qG, c.bT, c.bG));
      if (qs.size && c.ss.size && ![...qs].some(x => c.ss.has(x))) sc -= 25;
      if (qm !== c.m) sc -= 8;
      if (c.v && !/^(STANDARD|DEFAULT)$/.test(c.v) && qv) sc += (qv.includes(c.v) || c.v.includes(qv)) ? 6 : -6;
      if (sc > best[1]) best = [c.bc, sc];
    }
    return [best[0], Math.round(Math.max(0, Math.min(100, best[1])))];
  }

  // Item ID (+Model ID) → barcode from TOTAL SKU; several barcodes on one listing → pick by variant name
  function byId(idx, ch, item, model, variant) {
    const I = idx.ids[ch]; if (!item) return [null, 0];
    if (model && I.im[item + '|' + model]) return [I.im[item + '|' + model], 100];
    const l = I.i[item]; if (!l) return [null, 0];
    if (l.length === 1) return [l[0], 100];
    const qv = pn(variant), qT = toks(qv);
    let best = [l[0], 0];
    for (const bc of l) { const v = pn(idx.bcInfo[bc]?.variant), vT = toks(v);
      const s = !qv || !v ? 0 : v === qv ? 2 : inter(qT, vT) / Math.max(1, Math.min(qT.size, vT.size));
      if (s > best[1]) best = [bc, s]; }
    return [best[0], best[1] >= 0.5 ? 95 : 75];   // 75 → ⚠ KA duyệt biến thể
  }

  // ---- channel parsers: values (2D) → raw rows ----
  const SPEC = {
    SCOM: {must: [/TEN SAN PHAM/, /GIA GOC/], cols: {brand: [/THUONG HIEU/], name: ['TÊN SẢN PHẨM'], variant: ['BIẾN THỂ'], type: ['TYPE DEAL'],
      base: ['GIÁ GỐC'], gift: ['GIÁ QUÀ'], price: [/^GIA WEB/], stock: ['Kho', /^KHO/]}},
    SHP: {must: [/ITEM ID/, /GIA GOC/], cols: {brand: [/^TEN THUONG HIEU/], item: [/^MA SAN PHAM/], name: ['Tên sản phẩm'], model: [/^MA PHAN LOAI/],
      variant: ['Tên phân loại'], base: ['Giá gốc'], price: [/^GIA BAN/], stock0: [/^SO LUONG TON KHO$/], giftname: [/^QUA TANG KEM/],
      gift: [/^GIA TRI QUA TANG KEM$/], ka: [/^KA\b/], pick: [/STATUS PICK/], final: [/^GIA BRAND SAU VOUCHER SELLER/], stock: ['STOCK'], img: [/^LINK HINH ANH SAN PHAM CHINH/]}},
    TTS: {must: [/^BRAND$/, /TEN SAN PHAM/], cols: {brand: ['BRAND'], ka: ['KA'], item: [/^MA SAN PHAM/], name: ['Tên sản phẩm'], variant: ['Tên phân loại'],
      base: ['Giá gốc'], price: ['Giá bán'], stock: ['Stock'], giftname: ['Gift'], gift: ['Value Gift'], type: ['DEAL TYPE'], final: ['GIÁ CUỐI'], pick: [/^STATUS PICK/], img: [/^LINK HINH ANH SAN PHAM CHINH/]}},
  };
  function parseDeals(ch, values, idx) {
    const sp = SPEC[ch], h = findHeader(values, sp.must);
    if (h < 0) throw new Error(`Deal list ${ch}: không thấy dòng tiêu đề (cần cột ${sp.must.map(String).join(', ')})`);
    const c = {}; for (const k in sp.cols) c[k] = col(values[h], sp.cols[k]);
    const miss = ['name', 'base', 'price'].filter(k => c[k] < 0); if (miss.length) throw new Error(`Deal list ${ch}: thiếu cột ${miss.join(', ')}`);
    const rows = [], cache = {};
    for (const r of values.slice(h + 1)) {
      const name = g(r, c.name); if (!name) continue;
      const pick = g(r, c.pick);
      if (ch === 'SHP' && c.pick >= 0 && !/^(ATC|REVIEW)$/i.test(pick)) continue;   // Shopee: chỉ deal được pick
      const rawBrand = g(r, c.brand), brand = brandOf(idx, rawBrand), variant = g(r, c.variant);
      let bc = null, conf = 0;
      const ex = ch === 'SCOM' && idx.exact[pn(name)];
      if (ex) { bc = (ex.find(x => x.v === pn(variant)) || ex[0]).bc; conf = 100; }
      else if (idx.ids?.[ch] && ([bc, conf] = byId(idx, ch, g(r, c.item), g(r, c.model), variant))[0]) { /* ghép theo Item ID/PID từ TOTAL SKU */ }
      else { const k = brand + '|' + name + '|' + variant; [bc, conf] = cache[k] ??= match(idx, brand, name, variant); }
      const base = num(g(r, c.base)), price = num(g(r, c.price));
      rows.push({brand: brand || rawBrand.toUpperCase(), name, variant, item: g(r, c.item), model: g(r, c.model), ka: g(r, c.ka), pick, type: g(r, c.type),
        base, gift: num(g(r, c.gift)), price, final: num(g(r, c.final)) || price, stock: num(g(r, c.stock)) ?? num(g(r, c.stock0)),
        giftname: g(r, c.giftname).slice(0, 120), img: c.img >= 0 ? g(r, c.img) : '', bc: conf >= TH.min ? bc : null, bg: bc, conf,
        sn: conf >= TH.min && idx.bcInfo[bc] ? idx.bcInfo[bc].name + (/^(STANDARD|DEFAULT|)$/i.test(idx.bcInfo[bc].variant) ? '' : ' · ' + idx.bcInfo[bc].variant) : ''});
    }
    return rows;
  }
  // ---- PFM parsers → map key → {gmv, units} ----
  function parsePfm(ch, values, months = 3) {
    const out = {};
    if (ch === 'SCOM') {
      const h = findHeader(values, [/^BARCODE$/, /DOANH THU THUAN/]); if (h < 0) throw new Error('PFM Scom: cần cột Barcode, Doanh thu thuần');
      const H = values[h], cb = col(H, ['Barcode']), cg = col(H, ['Doanh thu thuần']), cu = col(H, ['Số sản phẩm']);
      for (const r of values.slice(h + 1)) { const k = g(r, cb); if (!k || k.includes('#')) continue;
        const o = out[k] ??= {gmv: 0, units: 0}; o.gmv += (num(g(r, cg)) || 0) / months; o.units += (num(g(r, cu)) || 0) / months; }
    } else if (ch === 'SHP') {
      const h = findHeader(values, [/^ITEM ID$/, /^GMV /]); if (h < 0) throw new Error('PFM Shopee: cần cột Item ID, GMV …');
      const H = values[h].map(hn), ci = H.indexOf('ITEM ID');
      const cg = H.map((x, i) => /^GMV /.test(x) ? i : -1).filter(i => i >= 0).pop(), cu = H.map((x, i) => /^DON /.test(x) ? i : -1).filter(i => i >= 0).pop() ?? -1;
      for (const r of values.slice(h + 1)) { const k = g(r, ci); if (k) out[k] = {gmv: num(g(r, cg)) || 0, units: num(g(r, cu)) || 0}; }
    } else {
      const h = findHeader(values, [/^PRODUCT ID$/, /^GMV$/]); if (h < 0) throw new Error('PFM TikTok: cần cột Product ID, GMV');
      const H = values[h], ci = col(H, ['Product ID']), cg = col(H, ['GMV']), cu = col(H, ['Items sold']);
      for (const r of values.slice(h + 1)) { const k = g(r, ci); if (/^\d{10,}$/.test(k)) out[k] = {gmv: num(g(r, cg)) || 0, units: num(g(r, cu)) || 0}; }
    }
    return out;
  }
  function attachPfm(ch, rows, pfm) {
    const cnt = {}; if (ch !== 'SCOM') for (const r of rows) cnt[r.item] = (cnt[r.item] || 0) + 1;
    for (const r of rows) {
      const p = ch === 'SCOM' ? (r.bc && pfm[r.bc]) : pfm[r.item], n = ch === 'SCOM' ? 1 : cnt[r.item];
      r.pfm_gmv = p ? Math.round(p.gmv / n) : 0; r.pfm_units = p ? Math.round(p.units / n * 10) / 10 : 0;
    }
  }

  // ---- saving / forecast / score ----
  function sav(base, gift, price) {
    if (!base || !price) return null;
    if (gift && gift > 5 * base) gift = 0;   // cột quà điền nhầm Item ID
    return Math.round((1 - price / (base + (gift || 0))) * 1e4) / 1e4;
  }
  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  function rankFn(vals) { const s = [...vals].sort((a, b) => a - b), n = s.length;
    return x => { if (n < 2) return 0; let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; s[m] < x ? lo = m + 1 : hi = m; } return lo / (n - 1); }; }
  function enrich(rows) {
    for (const r of rows) { r.sav = sav(r.base, r.gift, r.price); r.sav_final = sav(r.base, r.gift, r.final); }
    const med = median(rows.map(r => r.sav_final).filter(v => v != null));
    const bu = {}; for (const r of rows) if (r.pfm_units) (bu[r.brand] ??= []).push(r.pfm_units);
    const chMed = median(rows.map(r => r.pfm_units).filter(Boolean));
    for (const r of rows) {
      const f = Math.max(.6, Math.min(1.6, 1 + 1.5 * ((r.sav_final || 0) - med)));
      let base, src;
      if (r.pfm_units) [base, src] = [r.pfm_units * .8, 'hist'];
      else if (bu[r.brand]) [base, src] = [median(bu[r.brand]) * .5, 'brand'];
      else [base, src] = [chMed * .3, 'channel'];
      let u = base * f; if (r.stock != null) u = Math.min(u, r.stock);
      r.fc_units = Math.round(u); r.fc_src = src; r.fc_gmv = Math.round(r.fc_units * (r.final || 0));
    }
    const rp = rankFn(rows.map(r => r.pfm_gmv)), rf = rankFn(rows.map(r => r.fc_gmv)), rs = rankFn(rows.map(r => r.sav_final || 0));
    for (const r of rows) {
      const st = !r.stock ? 0 : Math.min(1, r.stock / Math.max(r.fc_units, 1));
      r.score = Math.round(1000 * (.30 * rp(r.pfm_gmv) + .25 * rf(r.fc_gmv) + .25 * rs(r.sav_final || 0) + .20 * st)) / 10;
    }
    const n = rows.length;
    [...rows].sort((a, b) => b.score - a.score).forEach((r, i) => { r.rank = i + 1;
      r.tier = i < n * .15 && r.stock ? 'TOP' : i < n * .5 ? 'NÊN BÁN' : i < n * .8 ? 'THEO DÕI' : 'KHÔNG ƯU TIÊN'; });
    // stable MoM key: same deal across snapshots
    const seen = {};
    for (const r of rows) { const k0 = r.item ? r.item + '|' + (r.model || pn(r.variant)) : (r.bc || pn(r.name)) + '|' + pn(r.variant);
      seen[k0] = (seen[k0] || 0) + 1; r.key = seen[k0] > 1 ? k0 + '#' + seen[k0] : k0; }
    return rows;
  }

  // ---- MoM ----
  const RULE = {savDrop: -0.02, stockDrop: -0.3};
  function mom(cur, prev) {
    if (!prev) { for (const r of cur) r.alerts = []; return {gone: [], counts: null}; }
    const P = new Map(prev.map(r => [r.key, r])), seen = new Set();
    const counts = {sav: 0, stock: 0, gone: 0, new: 0};
    for (const r of cur) {
      const p = P.get(r.key); r.alerts = [];
      if (!p) { r.isNew = true; counts.new++; continue; }
      seen.add(r.key);
      r.p_sav = p.sav; r.p_sav_final = p.sav_final; r.p_stock = p.stock;
      const ds = r.sav_final != null && p.sav_final != null ? r.sav_final - p.sav_final : null;
      r.d_sav = r.sav != null && p.sav != null ? r.sav - p.sav : null;
      if ((r.d_sav != null && r.d_sav <= RULE.savDrop + 1e-9) || (ds != null && ds <= RULE.savDrop + 1e-9)) { r.alerts.push('SAVING_GIẢM'); counts.sav++; }
      r.d_stock = r.stock != null && p.stock ? (r.stock - p.stock) / p.stock : null;
      if (r.stock === 0 || (r.d_stock != null && r.d_stock <= RULE.stockDrop)) { r.alerts.push(r.stock === 0 ? 'HẾT STOCK' : 'STOCK_GIẢM'); counts.stock++; }
    }
    const gone = prev.filter(p => !seen.has(p.key)); counts.gone = gone.length;
    return {gone, counts};
  }

  // ---- summary by barcode across channels ----
  function summary(cur, bcInfo) {
    const S = {};
    for (const ch of ['SCOM', 'SHP', 'TTS']) for (const r of cur[ch] || []) {
      if (!r.bc) continue;
      const info = bcInfo[r.bc] || {}, [nm, va] = (r.sn || '').split(' · ');
      const s = S[r.bc] ??= {bc: r.bc, brand: info.brand || r.brand, name: info.name || nm || r.name, variant: info.variant || va || ''};
      for (const key of ['sav', 'sav_final']) { const k = ch + '_' + key;
        if (r[key] != null && (s[k] == null || r[key] > s[k])) { s[k] = r[key]; if (key === 'sav_final') s[ch + '_conf'] = r.conf; } }
      s[ch + '_n'] = (s[ch + '_n'] || 0) + 1;
      const pk = ch + '_pfm'; s[pk] = ch === 'SCOM' ? Math.max(s[pk] || 0, r.pfm_gmv) : (s[pk] || 0) + r.pfm_gmv;
    }
    for (const s of Object.values(S)) s.pfm = (s.SCOM_pfm || 0) + (s.SHP_pfm || 0) + (s.TTS_pfm || 0);
    return Object.values(S);
  }

  // ---- compact storage ----
  const F = ['brand', 'name', 'variant', 'item', 'model', 'ka', 'pick', 'type', 'base', 'gift', 'price', 'final', 'stock', 'giftname', 'bc', 'bg', 'conf', 'pfm_gmv', 'pfm_units', 'sn'];
  const pack = rows => rows.map(r => F.map(f => r[f] ?? ''));
  const unpack = arr => arr.map(a => { const r = {}; F.forEach((f, i) => { const v = a[i]; r[f] = v === '' && !['brand', 'name', 'variant', 'item', 'model', 'ka', 'pick', 'type', 'giftname', 'sn'].includes(f) ? null : v; }); return r; });

  return {num, bkey, pn, skuIndex, brandOf, match, parseDeals, parsePfm, attachPfm, sav, enrich, mom, summary, pack, unpack, F, RULE, TH};
})();
if (typeof module !== 'undefined') module.exports = CORE;
