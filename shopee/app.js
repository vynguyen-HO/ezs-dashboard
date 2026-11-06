dash.calc('sub_month', {
  inputs: ['shp_monthly'],
  title: 'GMV theo tháng & sub-channel',
  description: 'Mỗi tháng × sub-channel: GMV.seller, GMV Buyer, tỷ lệ Buyer ÷ đơn đặt, plan (có từ T8) và % đạt plan.',
  fn: (shp_monthly) => {
    const KEY = { '[HO] Live Mega (DD)': 'mega', '[HO] Live BAU': 'bau', '[HO] Video': 'hovid', '[MCN] Live': 'mcnlive', '[MCN] Video': 'mcnvid' };
    return shp_monthly.map(r => {
      const seller = Number(r.seller_gmv), buyer = Number(r.buyer_gmv), plan = r.plan === '' || r.plan == null ? null : Number(r.plan);
      return { month: r.month, key: KEY[r.sub_channel], sub_channel: r.sub_channel, account: r.account, format: r.format,
        seller, buyer, buyer_ratio: seller ? buyer / seller : null, plan, vs_plan: plan ? buyer / plan : null };
    });
  }
});

dash.calc('month_total', {
  inputs: ['sub_month', 'shp_month_plan'],
  title: 'GMV Shopee theo tháng',
  description: 'Cộng 5 sub-channel mỗi tháng, so với plan Shopee; tháng chưa hết (T10) có thêm run rate = % đạt × số ngày tháng ÷ số ngày đã có số. sheet_total là Shopee Actual trong tab PFM_YTD_AllChannel để đối chiếu.',
  fn: (sub_month, shp_month_plan) => shp_month_plan.map(p => {
    const rs = sub_month.filter(r => r.month === p.month), s = f => rs.reduce((a, r) => a + r[f], 0), k = (key) => (rs.find(r => r.key === key) || {}).buyer || 0;
    const seller = s('seller'), buyer = s('buyer'), plan = Number(p.plan), dim = Number(p.days_in_month), days = Number(p.days_counted);
    const vs = plan ? buyer / plan : null, partial = days < dim;
    return { month: p.month, seller, buyer, plan, vs_plan: vs, partial, days_counted: days, days_in_month: dim,
      run_rate: vs == null ? null : vs * dim / days, perf: vs == null ? null : (partial ? vs * dim / days : vs),
      mega: k('mega'), bau: k('bau'), video: k('hovid') + k('mcnvid'), mcn_live: k('mcnlive'),
      sheet_total: Number(p.sheet_buyer_total), sheet_diff: Number(p.sheet_buyer_total) - buyer };
  })
});

dash.calc('sub_ytd', {
  inputs: ['sub_month'],
  title: 'Overall YTD theo sub-channel',
  description: 'Cộng YTD theo sub-channel và tổng; tỷ trọng trên GMV Buyer; % đạt plan chỉ tính các tháng có plan sub-channel (T8–T10).',
  fn: (sub_month) => {
    const tot = sub_month.reduce((a, r) => a + r.buyer, 0);
    const agg = (rs, key, name) => {
      const seller = rs.reduce((a, r) => a + r.seller, 0), buyer = rs.reduce((a, r) => a + r.buyer, 0);
      const q = rs.filter(r => r.plan != null), buyer_q = q.reduce((a, r) => a + r.buyer, 0), plan_q = q.reduce((a, r) => a + r.plan, 0);
      return { key, sub_channel: name, format: rs[0].format, account: rs[0].account, seller, buyer, buyer_ratio: buyer / seller, share: buyer / tot, buyer_q, plan_q, vs_plan_q: plan_q ? buyer_q / plan_q : null };
    };
    const keys = [...new Set(sub_month.map(r => r.key))];
    return [...keys.map(k => { const rs = sub_month.filter(r => r.key === k); return agg(rs, k, rs[0].sub_channel); }), { ...agg(sub_month, 'total', 'Tổng'), format: '', account: '' }];
  }
});

dash.calc('as_of', {
  inputs: ['shp_mtd'],
  title: 'Số đến ngày',
  description: 'Ngày chốt số MTD trong tab GMV_Data.',
  fn: (shp_mtd) => { const d = shp_mtd[0].as_of; return [{ date: d, month: d.slice(0, 7), day: Number(d.slice(8)), label: Number(d.slice(8)) + '/' + Number(d.slice(5, 7)) + '/' + d.slice(0, 4), month_label: 'Tháng ' + Number(d.slice(5, 7)) + '/' + d.slice(0, 4) }]; }
});

dash.calc('ytd_sum', {
  inputs: ['month_total', 'sub_ytd', 'sub_month'],
  title: 'Tổng YTD',
  description: 'GMV Buyer và đơn đã đặt YTD; plan YTD = plan các tháng đã qua + plan tháng này chia theo số ngày đã có số; tỷ trọng Live, Video, MCN, Mega; tháng Mega cao nhất.',
  fn: (month_total, sub_ytd, sub_month) => {
    const t = sub_ytd.find(r => r.key === 'total'), g = k => sub_ytd.filter(r => k(r)).reduce((a, r) => a + r.buyer, 0);
    const plan = month_total.reduce((a, r) => a + r.plan * r.days_counted / r.days_in_month, 0);
    const mega = sub_month.filter(r => r.key === 'mega'), top = mega.reduce((a, r) => r.buyer > a.buyer ? r : a);
    return [{ buyer: t.buyer, seller: t.seller, plan, vs_plan: t.buyer / plan,
      live_share: g(r => r.format === 'Live') / t.buyer, video_share: g(r => r.format === 'Video') / t.buyer, mcn_share: g(r => r.account === 'MCN') / t.buyer,
      mega_buyer: g(r => r.key === 'mega'), mega_share: g(r => r.key === 'mega') / t.buyer, mega_top_month: 'T' + Number(top.month.slice(5)), mega_top: top.buyer }];
  }
});

dash.calc('mtd_rows', {
  inputs: ['shp_mtd', 'shp_month_plan', 'as_of'],
  title: 'MTD theo sub-channel',
  description: 'Tháng hiện tại: % đạt = Buyer MTD ÷ plan; run rate = % đạt × số ngày tháng ÷ ngày đã qua; cần/ngày = (plan − Buyer MTD) ÷ số ngày còn lại; hôm qua = GMV Buyer ngày chốt số.',
  fn: (shp_mtd, shp_month_plan, as_of) => {
    const KEY = { '[HO] Live Mega (DD)': 'mega', '[HO] Live BAU': 'bau', '[HO] Video': 'hovid', '[MCN] Live': 'mcnlive', '[MCN] Video': 'mcnvid' };
    const dim = Number(shp_month_plan.find(p => p.month === as_of[0].month).days_in_month), dp = as_of[0].day, left = dim - dp;
    return shp_mtd.map(r => { const plan = Number(r.plan), buyer = Number(r.buyer_mtd), vs = buyer / plan;
      return { key: KEY[r.sub_channel], sub_channel: r.sub_channel, plan, seller: Number(r.seller_mtd), buyer, vs_plan: vs, run_rate: vs * dim / dp,
        need_day: left > 0 ? Math.max(0, plan - buyer) / left : null, yesterday: Number(r.buyer_yesterday), days_passed: dp, days_in_month: dim, pace: dp / dim }; });
  }
});

dash.calc('mtd_total', {
  inputs: ['mtd_rows'],
  title: 'MTD tổng Shopee',
  description: 'Cộng 5 sub-channel tháng hiện tại; run rate và cần/ngày tính như từng sub-channel.',
  fn: (mtd_rows) => {
    const s = f => mtd_rows.reduce((a, r) => a + r[f], 0), r0 = mtd_rows[0], plan = s('plan'), buyer = s('buyer'), vs = buyer / plan, left = r0.days_in_month - r0.days_passed;
    return [{ key: 'total', sub_channel: 'Tổng', plan, seller: s('seller'), buyer, vs_plan: vs, run_rate: vs * r0.days_in_month / r0.days_passed,
      need_day: left > 0 ? Math.max(0, plan - buyer) / left : null, yesterday: s('yesterday'), days_passed: r0.days_passed, days_in_month: r0.days_in_month }];
  }
});

dash.calc('daily_rows', {
  inputs: ['shp_daily'],
  title: 'GMV Shopee theo ngày',
  description: 'GMV Buyer mỗi ngày; ngày sheet ghi 0 để trống; ngày đôi = ngày trùng số tháng; TB ngày thường của tháng không tính D-1, D, D+1 ngày đôi và ngày trống.',
  fn: (shp_daily) => {
    const rows = shp_daily.map(r => { const d = r.date, day = Number(d.slice(8)), mon = Number(d.slice(5, 7));
      return { date: d, month: d.slice(0, 7), buyer: r.buyer_gmv === '' ? null : Number(r.buyer_gmv), dup: r.same_as_prev_day === 'yes', is_dd: day === mon, near_dd: Math.abs(day - mon) <= 1 }; });
    const avg = {};
    [...new Set(rows.map(r => r.month))].forEach(m => { const n = rows.filter(r => r.month === m && r.buyer != null && !r.near_dd); avg[m] = n.length ? n.reduce((a, r) => a + r.buyer, 0) / n.length : null; });
    return rows.map(r => ({ ...r, avg: avg[r.month], vs_avg: r.buyer != null && avg[r.month] ? r.buyer / avg[r.month] : null,
      tag: [r.is_dd ? 'Ngày đôi' : '', r.buyer == null ? 'Sheet ghi 0 / thiếu số' : '', r.dup ? 'Trùng ngày trước' : ''].filter(Boolean).join(' · ') }));
  }
});

dash.calc('daily_month', {
  inputs: ['daily_rows'],
  title: 'Tổng theo ngày từng tháng',
  description: 'Mỗi tháng: tổng các ngày có số, số ngày có số, TB ngày thường, ngày cao nhất.',
  fn: (daily_rows) => [...new Set(daily_rows.map(r => r.month))].map(m => {
    const rs = daily_rows.filter(r => r.month === m), ok = rs.filter(r => r.buyer != null), top = ok.reduce((a, r) => !a || r.buyer > a.buyer ? r : a, null);
    return { month: m, sum: ok.reduce((a, r) => a + r.buyer, 0), days: ok.length, missing: rs.length - ok.length, avg: rs[0].avg,
      top_day: top ? Number(top.date.slice(8)) + '/' + Number(top.date.slice(5, 7)) : null, top: top ? top.buyer : null };
  })
});

dash.calc('dd_month', {
  inputs: ['sub_month', 'month_total'],
  title: 'Live Mega theo tháng',
  description: 'Live Mega (ngày đôi) mỗi tháng: đơn đã đặt, Buyer, tỷ lệ Buyer ÷ đơn đặt, % GMV Buyer Shopee, plan Mega (từ T8).',
  fn: (sub_month, month_total) => sub_month.filter(r => r.key === 'mega').map(r => {
    const t = month_total.find(x => x.month === r.month);
    return { month: r.month, seller: r.seller, buyer: r.buyer, buyer_ratio: r.buyer_ratio, share: t.buyer ? r.buyer / t.buyer : null, plan: r.plan, vs_plan: r.vs_plan };
  })
});

dash.calc('dd_window', {
  inputs: ['daily_rows'],
  title: 'Quanh ngày đôi',
  description: 'GMV Buyer D-1, ngày đôi, D+1 và TB ngày thường cùng tháng; Ngày đôi ÷ TB.',
  fn: (daily_rows) => daily_rows.filter(r => r.is_dd).map(r => {
    const i = daily_rows.indexOf(r), v = j => daily_rows[j] && daily_rows[j].buyer;
    return { date: r.date, d_minus: v(i - 1) ?? null, d0: r.buyer, d_plus: v(i + 1) ?? null, avg: r.avg, uplift: r.buyer != null && r.avg ? r.buyer / r.avg : null, tag: r.dup ? 'Trùng số ngày trước' : '' };
  })
});

(function () {
  const SUBS = [['mega', '[HO] Live Mega (DD)'], ['bau', '[HO] Live BAU'], ['hovid', '[HO] Video'], ['mcnlive', '[MCN] Live'], ['mcnvid', '[MCN] Video']];
  const vnd = v => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ' : (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
  const vshort = v => v == null || isNaN(v) ? '—' : Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' tr';
  const pct = v => v == null || isNaN(v) ? '—' : (v * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  const pct0 = v => v == null || isNaN(v) ? '—' : Math.round(v * 100).toLocaleString('vi-VN') + '%';
  const xx = v => v == null || isNaN(v) ? '—' : v.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '×';
  const mlabel = m => 'T' + Number(m.slice(5, 7));
  const dlabel = d => Number(d.slice(8)) + '/' + Number(d.slice(5, 7));
  const fmt = { vs_plan: pct, run_rate: pct, perf: pct, share: pct, live_share: pct, video_share: pct, mcn_share: pct, mega_share: pct, buyer_ratio: pct, vs_plan_q: pct, vs_avg: xx, uplift: xx,
    label: String, month_label: String, mega_top_month: String, top_day: String, days_passed: String, days_in_month: String, days: String };
  const color = k => dash.colors[SUBS.findIndex(s => s[0] === k)];
  const planCls = v => v == null ? '' : v >= 1 ? 'ok' : v >= 0.6 ? 'warn' : 'bad';
  const enc = s => encodeURIComponent(s);
  const FS = 11;

  function fillMarks() {
    document.querySelectorAll('.sr [data-field][data-source]').forEach(el => {
      if (el.tagName === 'TH') return;
      const d = dash.data(el.getAttribute('data-source'));
      if (d.status !== 'ok') { el.textContent = '—'; return; }
      let row;
      if (el.hasAttribute('data-row')) row = d.data[Number(el.getAttribute('data-row'))];
      else { const conds = el.getAttribute('data-where').split('&').map(p => p.split('=').map(decodeURIComponent)); row = d.data.find(r => conds.every(([k, v]) => String(r[k]) === v)); }
      const f = el.getAttribute('data-field');
      el.textContent = row ? (fmt[f] || vnd)(row[f]) : '—';
      el.classList.remove('dash-skeleton');
    });
    document.querySelectorAll('.sr .nm i[data-k]').forEach(i => { i.style.background = color(i.dataset.k); });
  }

  // Sub-channel cards, built once (values come from marks)
  const cards = document.getElementById('sub-cards');
  SUBS.forEach(([k, name]) => {
    const c = document.createElement('div'); c.className = 'ch'; c.id = 'card-' + k;
    c.innerHTML = `<div class="nm"><i data-k="${k}"></i>${name}</div>
      <div class="big"><span class="v dash-skeleton" data-source="sub_ytd" data-field="buyer" data-where="key=${k}">—</span><span class="lb">Buyer YTD</span></div>
      <dl><div><dt>Đơn đã đặt</dt><dd data-source="sub_ytd" data-field="seller" data-where="key=${k}">—</dd></div>
      <div><dt>Tỷ trọng</dt><dd data-source="sub_ytd" data-field="share" data-where="key=${k}">—</dd></div>
      <div><dt>Tháng này</dt><dd data-source="mtd_rows" data-field="vs_plan" data-where="key=${k}">—</dd></div></dl>
      <div class="spark" data-spark="${k}" data-source="sub_month"></div><div class="lb">GMV Buyer theo tháng · "Tháng này" = % đạt plan MTD</div>`;
    cards.appendChild(c);
  });

  function seg(id, opts, get, set) {
    const box = document.getElementById(id);
    const sig = opts.map(o => o.v).join('|');
    if (box.dataset.sig !== sig) { box.innerHTML = ''; box.dataset.sig = sig; opts.forEach(o => { const b = document.createElement('button'); b.textContent = o.t; b.dataset.v = o.v; b.addEventListener('click', () => { set(o.v); draw(); }); box.appendChild(b); }); }
    [...box.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === get())));
  }

  function legend(id, items) {
    const lg = d3.select(id); lg.selectAll('*').remove();
    items.forEach(it => { const s = lg.append('span'); const i = s.append('i'); if (it.line) i.attr('class', it.dash ? 'dash' : 'ln').style('border-color', it.color); else i.style('background', it.color); s.append('span').text(it.name); });
  }

  function prep(el, ...ds) {
    el.innerHTML = ''; el.classList.remove('dash-skeleton');
    const bad = ds.find(d => d.status !== 'ok');
    if (bad) { if (bad.status === 'error' || bad.status === 'connect') d3.select(el).append('div').attr('class', 'fail').text('Failed to load'); else el.classList.add('dash-skeleton'); return false; }
    return true;
  }

  function textW(svg, s) { const t = svg.append('text').attr('font-size', FS).text(s); const w = t.node().getComputedTextLength(); t.remove(); return w; }

  function frame(el, H) {
    const W = Math.max(280, el.clientWidth);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
    const tip = d3.select(el).append('div').attr('class', 'tip');
    return { W, H, svg, tip };
  }

  function showTip(el, tip, ev, head, lines) {
    const [px, py] = d3.pointer(ev, el);
    tip.html(''); tip.append('div').attr('class', 'h').text(head);
    lines.forEach(l => { const r = tip.append('div'); if (l.color) r.append('i').style('background', l.color); r.append('span').text(l.text); });
    tip.style('display', 'block');
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    tip.style('left', Math.min(Math.max(0, px + 14), el.clientWidth - tw) + 'px').style('top', Math.max(0, Math.min(py - th - 8, el.clientHeight - th)) + 'px');
  }

  function xAxis(svg, keys, x, label, H, m, W) {
    const lw = d3.max(keys, k => textW(svg, label(k))) + 8;
    const every = Math.max(1, Math.ceil(keys.length / Math.max(1, Math.floor((W - m.l - m.r) / lw))));
    svg.append('g').selectAll('text').data(keys.filter((k, i) => i % every === 0)).join('text')
      .attr('x', k => x(k) + (x.bandwidth ? x.bandwidth() / 2 : 0)).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(label);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', H - m.b).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-axis)');
  }

  function yGrid(svg, y, fmtY, m, W) {
    const ticks = y.ticks(4);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', m.l - 6).attr('y', d => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(fmtY);
  }

  // Stacked bars: series [{name, color, get(key)}]; opt.ref(key) draws a dashed marker per bar; opt.hline a dashed horizontal line
  function stacked(el, keys, label, series, opt = {}) {
    const H = opt.H || 260;
    const { W, svg, tip } = frame(el, H);
    const tot = keys.map(k => d3.sum(series, s => s.get(k) || 0));
    const refs = opt.ref ? keys.map(opt.ref).filter(v => v != null) : [];
    const y = d3.scaleLinear([0, d3.max([...tot, ...refs, opt.hline || 0]) || 1], [H - 26, 10]).nice();
    const m = { t: 10, r: 8, b: 26, l: d3.max(y.ticks(4), t => textW(svg, vshort(t))) + 12 };
    const x = d3.scaleBand(keys, [m.l, W - m.r]).paddingInner(0.28).paddingOuter(0.1);
    yGrid(svg, y, vshort, m, W);
    const g = svg.append('g');
    keys.forEach(k => {
      let acc = 0; const parts = series.map(s => ({ s, v: s.get(k) || 0 })).filter(p => p.v > 0);
      parts.forEach((p, i) => {
        const top = i === parts.length - 1, y0 = y(acc), y1 = y(acc + p.v), h = Math.max(0, y0 - y1 - (i ? 2 : 0));
        if (top && h > 4) {
          const bw = x.bandwidth(), r = Math.min(4, bw / 2), x0 = x(k);
          g.append('path').attr('fill', p.s.color).attr('d', `M${x0},${y1 + h}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + bw - r}Q${x0 + bw},${y1} ${x0 + bw},${y1 + r}V${y1 + h}Z`);
        } else g.append('rect').attr('x', x(k)).attr('width', x.bandwidth()).attr('y', y1).attr('height', h).attr('fill', p.s.color);
        acc += p.v;
      });
      if (opt.ref && opt.ref(k) != null) g.append('line').attr('x1', x(k) - 3).attr('x2', x(k) + x.bandwidth() + 3).attr('y1', y(opt.ref(k))).attr('y2', y(opt.ref(k))).attr('stroke', 'var(--color-fg)').attr('stroke-width', 2).attr('stroke-dasharray', '4 3');
    });
    if (opt.hline) svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(opt.hline)).attr('y2', y(opt.hline)).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    xAxis(svg, keys, x, label, H, m, W);
    svg.append('g').selectAll('rect').data(keys).join('rect').attr('x', k => x(k) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', m.t).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('mousemove', (ev, k) => {
        const ls = series.filter(s => s.get(k) != null && (series.length === 1 || s.get(k))).map(s => ({ color: series.length > 1 ? s.color : null, text: (series.length > 1 ? s.name + ': ' : '') + vnd(s.get(k)) }));
        if (opt.ref && opt.ref(k) != null) ls.push({ text: (opt.refName || 'Plan') + ': ' + vnd(opt.ref(k)) });
        if (opt.extra) ls.push(...opt.extra(k));
        showTip(el, tip, ev, (opt.head || label)(k) + (series.length > 1 ? ' · tổng ' + vnd(d3.sum(series, s => s.get(k) || 0)) : ''), ls);
      })
      .on('mouseleave', () => tip.style('display', 'none'));
  }

  // Lines (percent): series [{name, color, get(key)}], ref = horizontal reference value
  function lines(el, keys, label, series, fmtV, ref) {
    const H = 260;
    const { W, svg, tip } = frame(el, H);
    const vals = series.flatMap(s => keys.map(s.get)).filter(v => v != null && !isNaN(v));
    const y = d3.scaleLinear([0, d3.max([...vals, ref || 0]) || 1], [H - 26, 12]).nice();
    const m = { t: 12, r: 12, b: 26, l: d3.max(y.ticks(4), t => textW(svg, fmtV(t))) + 12 };
    const x = d3.scalePoint(keys, [m.l + 10, W - m.r - 10]);
    yGrid(svg, y, fmtV, m, W);
    if (ref != null) svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(ref)).attr('y2', y(ref)).attr('stroke', 'var(--cds-chart-reference)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    xAxis(svg, keys, x, label, H, m, W);
    const line = d3.line().defined(d => d.v != null && !isNaN(d.v)).x(d => x(d.k)).y(d => y(d.v));
    series.forEach(s => {
      const pts = keys.map(k => ({ k, v: s.get(k) }));
      svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      svg.append('g').selectAll('circle').data(pts.filter(p => p.v != null && !isNaN(p.v))).join('circle').attr('cx', p => x(p.k)).attr('cy', p => y(p.v)).attr('r', 3).attr('fill', s.color).attr('stroke', 'var(--color-panel)').attr('stroke-width', 1.5);
    });
    const rule = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--cds-chart-reference)').style('display', 'none');
    svg.append('rect').attr('x', m.l).attr('width', W - m.l - m.r).attr('y', m.t).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('mousemove', ev => {
        const [px] = d3.pointer(ev); const k = keys[d3.minIndex(keys, kk => Math.abs(x(kk) - px))];
        rule.attr('x1', x(k)).attr('x2', x(k)).style('display', null);
        showTip(el, tip, ev, label(k), series.map(s => ({ color: series.length > 1 ? s.color : null, text: (series.length > 1 ? s.name + ': ' : '') + fmtV(s.get(k)) })));
      })
      .on('mouseleave', () => { tip.style('display', 'none'); rule.style('display', 'none'); });
  }

  function spark(el, vals, c) {
    el.innerHTML = ''; el.classList.remove('dash-skeleton');
    const W = Math.max(120, el.clientWidth), H = 44, ok = vals.filter(v => v.v != null);
    if (!ok.length) return;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const last = ok[ok.length - 1], lab = mlabel(last.k) + ' ' + vshort(last.v);
    const tw = textW(svg, lab) + 10;
    const x = d3.scalePoint(vals.map(v => v.k), [4, W - tw]), y = d3.scaleLinear([0, d3.max(ok, v => v.v)], [H - 4, 6]);
    svg.append('path').attr('d', d3.line().defined(d => d.v != null).x(d => x(d.k)).y(d => y(d.v))(vals)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    svg.append('circle').attr('cx', x(last.k)).attr('cy', y(last.v)).attr('r', 3).attr('fill', c);
    svg.append('text').attr('x', x(last.k) + 6).attr('y', y(last.v)).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(lab);
  }

  // 100% horizontal bars: rows [{label, parts:[{name,color,v}]}]
  function mix(el, rows) {
    const H = rows.length * 46 + 8;
    const { W, svg, tip } = frame(el, H);
    const lw = d3.max(rows, r => textW(svg, r.label)) + 12;
    const x = d3.scaleLinear([0, 1], [lw, W - 4]);
    rows.forEach((r, i) => {
      const tot = d3.sum(r.parts, p => p.v) || 1, yy = 8 + i * 46;
      svg.append('text').attr('x', 0).attr('y', yy + 14).attr('dy', '0.32em').attr('font-size', FS + 1).attr('fill', 'var(--color-fg)').text(r.label);
      let acc = 0;
      r.parts.forEach((p, j) => {
        const sh = p.v / tot, x0 = x(acc), w = Math.max(0, x(acc + sh) - x0 - (j < r.parts.length - 1 ? 2 : 0));
        svg.append('rect').attr('x', x0).attr('y', yy).attr('width', w).attr('height', 28).attr('rx', 4).attr('fill', p.color)
          .on('mousemove', ev => showTip(el, tip, ev, r.label, [{ color: p.color, text: p.name + ': ' + vnd(p.v) + ' · ' + pct(sh) }]))
          .on('mouseleave', () => tip.style('display', 'none'));
        const t = pct0(sh);
        if (w > textW(svg, p.name + ' ' + t) + 12) svg.append('text').attr('x', x0 + 8).attr('y', yy + 14).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-bg)').attr('pointer-events', 'none').text(p.name + ' ' + t);
        else if (w > textW(svg, t) + 10) svg.append('text').attr('x', x0 + 5).attr('y', yy + 14).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-bg)').attr('pointer-events', 'none').text(t);
        acc += sh;
      });
    });
  }

  // Progress bars vs plan with pace line
  function progress(el, rows, pace) {
    const H = rows.length * 34 + 30;
    const { W, svg, tip } = frame(el, H);
    const lw = d3.max(rows, r => textW(svg, r.label)) + 12, rw = d3.max(rows, r => textW(svg, pct(r.v))) + 10;
    const x = d3.scaleLinear([0, Math.max(1, d3.max(rows, r => r.v))], [lw, W - rw]);
    rows.forEach((r, i) => {
      const yy = 6 + i * 34;
      svg.append('text').attr('x', 0).attr('y', yy + 11).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-fg)').text(r.label);
      svg.append('rect').attr('x', lw).attr('y', yy).attr('width', x(1) - lw).attr('height', 22).attr('rx', 4).attr('fill', 'var(--cds-chart-grid)');
      svg.append('rect').attr('x', lw).attr('y', yy).attr('width', Math.max(2, x(r.v) - lw)).attr('height', 22).attr('rx', 4).attr('fill', r.color)
        .on('mousemove', ev => showTip(el, tip, ev, r.label, r.tip)).on('mouseleave', () => tip.style('display', 'none'));
      svg.append('text').attr('x', x(r.v) + 6).attr('y', yy + 11).attr('dy', '0.32em').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text(pct(r.v));
    });
    svg.append('line').attr('x1', x(pace)).attr('x2', x(pace)).attr('y1', 0).attr('y2', rows.length * 34).attr('stroke', 'var(--color-fg)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    svg.append('text').attr('x', Math.min(x(pace), W - 60)).attr('y', rows.length * 34 + 14).attr('text-anchor', 'middle').attr('font-size', FS).attr('fill', 'var(--color-fg-muted)').text('Nhịp cần ' + pct0(pace));
  }

  function fillTable(sel, rows, cols, keyOf, rowCls) {
    const tb = d3.select(sel).select('tbody'); tb.selectAll('*').remove();
    rows.forEach(r => { const tr = tb.append('tr').attr('data-key', keyOf(r)); if (rowCls) tr.attr('class', rowCls(r));
      cols.forEach(c => { const td = tr.append('td').text(c.f ? c.f(r[c.k]) : (r[c.k] == null || r[c.k] === '' ? '—' : r[c.k])); const cl = [c.cls ? c.cls(r[c.k]) : '', c.l ? 'l' : ''].filter(Boolean).join(' '); if (cl) td.attr('class', cl); }); });
  }

  let monthSub = 'all', dayMonth = null;
  const subLegend = id => legend(id, SUBS.map(([k, n]) => ({ name: n, color: color(k) })));

  function drawOverall() {
    const sm = dash.data('sub_month'), mt = dash.data('month_total'), sy = dash.data('sub_ytd');
    document.querySelectorAll('.sr .spark').forEach(el => { if (sm.status === 'ok') { const k = el.dataset.spark; spark(el, sm.data.filter(r => r.key === k).map(r => ({ k: r.month, v: r.buyer })), color(k)); } else el.innerHTML = ''; });
    const elG = document.getElementById('ch-gmv-month');
    if (prep(elG, sm, mt)) {
      const months = mt.data.map(r => r.month), get = k => m => (sm.data.find(r => r.month === m && r.key === k) || {}).buyer;
      stacked(elG, months, m => mlabel(m) + (mt.data.find(r => r.month === m).partial ? '*' : ''), SUBS.map(([k, n]) => ({ name: n, color: color(k), get: get(k) })),
        { ref: m => mt.data.find(r => r.month === m).plan, refName: 'Plan Shopee', head: m => mlabel(m) + (mt.data.find(r => r.month === m).partial ? ' (MTD)' : '') });
      legend('#lg-gmv-month', [...SUBS.map(([k, n]) => ({ name: n, color: color(k) })), { name: 'Plan', color: 'var(--color-fg)', line: true, dash: true }]);
    }
    const elP = document.getElementById('ch-plan-month');
    if (prep(elP, mt)) {
      lines(elP, mt.data.map(r => r.month), m => mlabel(m) + (mt.data.find(r => r.month === m).partial ? '*' : ''), [{ name: '% đạt plan', color: dash.colors[0], get: m => mt.data.find(r => r.month === m).perf }], pct0, 1);
      legend('#lg-plan-month', [{ name: '% đạt plan (T10*: run rate)', color: dash.colors[0], line: true }, { name: '100% plan', color: 'var(--cds-chart-reference)', line: true, dash: true }]);
    }
    const elM = document.getElementById('ch-mix');
    if (prep(elM, sy)) {
      const s = sy.data.filter(r => r.key !== 'total'), by = f => v => s.filter(r => r[f] === v).reduce((a, r) => a + r.buyer, 0);
      mix(elM, [
        { label: 'Sub-channel', parts: s.map(r => ({ name: r.sub_channel, color: color(r.key), v: r.buyer })) },
        { label: 'Live / Video', parts: [{ name: 'Live', color: dash.colors[0], v: by('format')('Live') }, { name: 'Video', color: dash.colors[2], v: by('format')('Video') }] },
        { label: 'HO / MCN', parts: [{ name: 'HO', color: dash.colors[5], v: by('account')('HO') }, { name: 'MCN', color: dash.colors[6], v: by('account')('MCN') }] }
      ]);
    }
    if (sy.status === 'ok') fillTable('#tbl-overall', sy.data, [{ k: 'sub_channel' }, { k: 'seller', f: vnd }, { k: 'buyer', f: vnd }, { k: 'buyer_ratio', f: pct }, { k: 'share', f: pct }, { k: 'buyer_q', f: vnd }, { k: 'plan_q', f: vnd }, { k: 'vs_plan_q', f: pct, cls: planCls }], r => r.key, r => r.key === 'total' ? 'total' : '');
    seg('seg-month', [{ t: 'Tổng Shopee', v: 'all' }, ...SUBS.map(([k, n]) => ({ t: n, v: k }))], () => monthSub, v => { monthSub = v; });
    document.getElementById('wrap-month-all').hidden = monthSub !== 'all';
    document.getElementById('wrap-month-sub').hidden = monthSub === 'all';
    if (monthSub === 'all') { if (mt.status === 'ok') fillTable('#tbl-month-all', mt.data, [{ k: 'month', f: m => mlabel(m) + (mt.data.find(r => r.month === m).partial ? ' (MTD)' : '') }, { k: 'seller', f: vnd }, { k: 'buyer', f: vnd }, { k: 'plan', f: vnd }, { k: 'vs_plan', f: pct, cls: planCls }, { k: 'mega', f: vnd }, { k: 'bau', f: vnd }, { k: 'video', f: vnd }, { k: 'mcn_live', f: vnd }], r => r.month); }
    else if (sm.status === 'ok') fillTable('#tbl-month-sub', sm.data.filter(r => r.key === monthSub), [{ k: 'month', f: mlabel }, { k: 'sub_channel', l: true }, { k: 'seller', f: vnd }, { k: 'buyer', f: vnd }, { k: 'buyer_ratio', f: pct }, { k: 'plan', f: vnd }, { k: 'vs_plan', f: pct, cls: planCls }], r => enc(r.month) + ',' + enc(r.key));
  }

  function dailyChart(el, rows, avg) {
    const ddColor = dash.colors[0], normal = 'var(--cds-chart-muted)';
    stacked(el, rows.map(r => r.date), dlabel, [
      { name: 'Ngày thường', color: normal, get: d => { const r = rows.find(x => x.date === d); return r.is_dd ? null : r.buyer; } },
      { name: 'Ngày đôi', color: ddColor, get: d => { const r = rows.find(x => x.date === d); return r.is_dd ? r.buyer : null; } }
    ], { hline: avg, head: d => { const r = rows.find(x => x.date === d); return dlabel(d) + (r.tag ? ' · ' + r.tag : ''); }, extra: d => { const r = rows.find(x => x.date === d); return r.vs_avg != null ? [{ text: 'So TB ngày thường: ' + xx(r.vs_avg) }] : []; } });
  }

  function drawMtd() {
    const mr = dash.data('mtd_rows'), dr = dash.data('daily_rows'), ao = dash.data('as_of');
    const elP = document.getElementById('ch-progress');
    if (prep(elP, mr)) progress(elP, mr.data.map(r => ({ label: r.sub_channel, v: r.vs_plan, color: color(r.key), tip: [{ text: 'Buyer MTD: ' + vnd(r.buyer) }, { text: 'Plan: ' + vnd(r.plan) }, { text: 'Run rate: ' + pct(r.run_rate) }] })), mr.data[0].pace);
    const elD = document.getElementById('ch-mtd-day');
    if (prep(elD, dr, ao)) {
      const rows = dr.data.filter(r => r.month === ao.data[0].month);
      dailyChart(elD, rows, rows[0] ? rows[0].avg : null);
      legend('#lg-mtd-day', [{ name: 'Ngày thường', color: 'var(--cds-chart-muted)' }, { name: 'Ngày đôi', color: dash.colors[0] }, { name: 'TB ngày thường', color: 'var(--cds-chart-reference)', line: true, dash: true }]);
    }
    if (mr.status === 'ok') {
      const tot = dash.data('mtd_total'), all = tot.status === 'ok' ? [...mr.data, tot.data[0]] : mr.data;
      fillTable('#tbl-mtd', all, [{ k: 'sub_channel' }, { k: 'plan', f: vnd }, { k: 'seller', f: vnd }, { k: 'buyer', f: vnd }, { k: 'vs_plan', f: pct }, { k: 'run_rate', f: pct, cls: planCls }, { k: 'need_day', f: vnd }, { k: 'yesterday', f: vnd }], r => r.key, r => r.key === 'total' ? 'total' : '');
    }
  }

  function drawDay() {
    const dr = dash.data('daily_rows'), dm = dash.data('daily_month');
    if (dm.status === 'ok') {
      const months = dm.data.map(r => r.month);
      if (!dayMonth || !months.includes(dayMonth)) dayMonth = months[months.length - 1];
      seg('seg-day', months.map(m => ({ t: mlabel(m), v: m })), () => dayMonth, v => { dayMonth = v; });
      const w = 'month=' + dayMonth;
      [['t-day-sum', 'sum'], ['t-day-avg', 'avg'], ['t-day-top', 'top_day'], ['t-day-topv', 'top']].forEach(([id, f]) => { const el = document.getElementById(id); el.setAttribute('data-field', f); el.setAttribute('data-where', w); });
      const r = dm.data.find(x => x.month === dayMonth);
      document.getElementById('t-day-n').textContent = r.days + ' ngày có số' + (r.missing ? ', ' + r.missing + ' ngày trống' : '');
      fillMarks();
    }
    const el = document.getElementById('ch-daily');
    if (prep(el, dr, dm)) {
      const rows = dr.data.filter(r => r.month === dayMonth);
      dailyChart(el, rows, rows[0] ? rows[0].avg : null);
      legend('#lg-daily', [{ name: 'Ngày thường', color: 'var(--cds-chart-muted)' }, { name: 'Ngày đôi', color: dash.colors[0] }, { name: 'TB ngày thường', color: 'var(--cds-chart-reference)', line: true, dash: true }]);
    }
    if (dr.status === 'ok') fillTable('#tbl-daily', dr.data.filter(r => r.month === dayMonth), [{ k: 'date', f: dlabel }, { k: 'buyer', f: vnd }, { k: 'vs_avg', f: xx }, { k: 'tag', l: true }], r => r.date);
  }

  function drawDD() {
    const sm = dash.data('sub_month'), dd = dash.data('dd_month'), dw = dash.data('dd_window');
    const elM = document.getElementById('ch-mega');
    if (prep(elM, sm)) {
      const rows = sm.data.filter(r => r.key === 'mega');
      stacked(elM, rows.map(r => r.month), mlabel, [{ name: 'GMV Buyer', color: color('mega'), get: m => rows.find(r => r.month === m).buyer }],
        { ref: m => rows.find(r => r.month === m).plan, refName: 'Plan Mega', extra: m => [{ text: 'Đơn đã đặt: ' + vnd(rows.find(r => r.month === m).seller) }] });
      legend('#lg-mega', [{ name: 'GMV Buyer Live Mega', color: color('mega') }, { name: 'Plan Mega', color: 'var(--color-fg)', line: true, dash: true }]);
    }
    const elS = document.getElementById('ch-mega-share');
    if (prep(elS, dd)) lines(elS, dd.data.map(r => r.month), mlabel, [{ name: '% GMV Shopee', color: color('mega'), get: m => dd.data.find(r => r.month === m).share }], pct0, null);
    if (dd.status === 'ok') fillTable('#tbl-dd', dd.data, [{ k: 'month', f: mlabel }, { k: 'seller', f: vnd }, { k: 'buyer', f: vnd }, { k: 'buyer_ratio', f: pct }, { k: 'share', f: pct }, { k: 'plan', f: vnd }, { k: 'vs_plan', f: pct, cls: planCls }], r => r.month);
    if (dw.status === 'ok') fillTable('#tbl-ddw', dw.data, [{ k: 'date', f: dlabel }, { k: 'd_minus', f: vnd }, { k: 'd0', f: vnd }, { k: 'd_plus', f: vnd }, { k: 'avg', f: vnd }, { k: 'uplift', f: xx }, { k: 'tag', l: true }], r => r.date);
  }

  let current = 'overall';
  function draw() {
    fillMarks();
    if (current === 'overall') drawOverall();
    if (current === 'thang-nay') drawMtd();
    if (current === 'theo-ngay') drawDay();
    if (current === 'ngay-doi') drawDD();
  }
  function show(page) {
    current = page;
    document.querySelectorAll('.sr .page').forEach(p => { p.hidden = p.id !== page; });
    document.querySelectorAll('.sr .tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.page === page)));
    dash.setLink(page);
    draw();
  }
  document.querySelectorAll('.sr .tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.page)));
  dash.onData(draw);
  const named = location.hash.slice(1);
  if (['thang-nay', 'theo-ngay', 'ngay-doi'].includes(named)) show(named);
})();
