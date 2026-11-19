(function () {
  const W = window.W;
  const { esc, icon, fmt, Z } = W;
  const ui = (W.ui = {});

  ui.zoneHex = (z) => ({ Hijau: '#6dba54', Kuning: '#f7c443', Merah: '#e5383b' }[z] || '#d9cfcd');
  const ZVAR = { Hijau: 'var(--h-map)', Kuning: 'var(--k-map)', Merah: 'var(--m-map)' };

  // ---------------------------------------------------------------
  // Kalimat sederhana
  // ---------------------------------------------------------------
  ui.sentence = (kode, i) => {
    const D = W.D;
    const z = D.zone(kode, i), v = D.pred(kode, i), thr = D.thr.get(kode);
    const when = D.weeks[i].d === 0 ? 'minggu ini' : D.weeks[i].d === 1 ? 'minggu depan' : `pada ${D.weeks[i].range}`;
    if (!z) return 'Perkiraan untuk kecamatan ini belum tersedia.';
    if (D.lowBase(kode) && v < 1) return `Kasus DBD di sini sangat jarang. Perkiraan ${when}: ${W.kasusText(v)}, sedikit di atas biasanya.`;
    let s = `Diperkirakan ${W.kasusText(v)} DBD ${when}, ${Z[z].msg}.`;
    const b = z !== 'Hijau' ? D.bands(kode, D.weeks[i].w) : null;
    if (b) s += ` Biasanya ${b.low < 1 ? 'hampir tidak ada kasus' : `sekitar ${Math.round(b.low)} kasus`} per minggu${W.method === 'ec' ? ' di waktu ini' : ''}.`;
    return s;
  };

  ui.brief = (kode, i) => {
    const D = W.D, z = D.zone(kode, i);
    if (!z) return 'Perkiraan belum tersedia.';
    if (D.lowBase(kode) && D.pred(kode, i) < 1) return 'Kasus di sini sangat jarang, tapi perkiraan sedikit di atas biasanya.';
    return Z[z].tip;
  };
  // Ringkasan untuk minggu lampau (kasus tercatat)
  ui.briefObs = (kode, wk) => {
    const D = W.D, z = D.zoneAt(kode, wk);
    if (!z) return wk.src === 'none' ? 'Dinkes belum merilis kasus minggu ini.' : 'Data minggu ini belum tersedia.';
    if (D.lowBase(kode) && (D.valueAt(kode, wk) ?? 0) < 3) return 'Kasus di sini sangat jarang, jadi 1–2 kasus pun sudah dihitung tinggi.';
    return `Kasus tercatat ${Z[z].msg}.`;
  };

  ui.outlookSummary = (kode) => {
    const D = W.D;
    const idx = D.ahead;
    if (!idx.length) return '';
    const z0 = D.zone(kode, idx[0]);
    if (!z0) return '';
    const change = idx.find((i) => D.zone(kode, i) !== z0);
    const last = D.weeks[idx[idx.length - 1]];
    if (change == null) return `Risiko diperkirakan <b>tetap ${Z[z0].label.toLowerCase()}</b> sampai ${fmt.dmLong(last.end)}.`;
    const z1 = D.zone(kode, change);
    const naik = Z[z1].rank > Z[z0].rank;
    return `Risiko diperkirakan <b>${naik ? 'naik' : 'turun'} ke ${Z[z1].label.toLowerCase()}</b> mulai ${fmt.dmLong(D.weeks[change].start)}.`;
  };

  // ---------------------------------------------------------------
  // Kartu risiko (merah/kuning/hijau)
  // ---------------------------------------------------------------
  // i: indeks minggu prakiraan. wk: objek D.wk() untuk minggu mana pun (prakiraan atau kasus tercatat).
  ui.riskCard = (kode, { i = W.D.ci, wk = null, link = true, compact = false } = {}) => {
    const D = W.D;
    const obs = !!wk && wk.src !== 'fc';
    const z = wk ? D.zoneAt(kode, wk) : D.zone(kode, i);
    const wr = wk || D.weeks[i];
    const v = wk ? D.valueAt(kode, wk) : D.pred(kode, i);
    let lbl;
    if (obs) lbl = wk.src === 'none' ? `Minggu ${wk.range}` : `Tingkat risiko ${wk.range} ${wk.y}`;
    else lbl = wr.d === 0 ? 'Tingkat risiko saat ini' : `Tingkat risiko ${wr.d === 1 ? 'minggu depan' : wr.range}`;
    const desc = obs ? ui.briefObs(kode, wk) : ui.brief(kode, wk ? wk.fi : i);
    const val = v == null ? '–' : obs ? `${W.kasusObs(v)} tercatat${D.finalAt(kode, wk) ? '' : ' (sementara)'}` : W.kasusText(v);
    return `<div class="risk ${z ? 'z-' + z : 'z-none'} ${compact ? 'compact' : ''}">
      <div class="risk-top">
        <div class="mos">${W.mosq()}</div>
        <div class="tx"><small>${esc(lbl)}</small><b>${z ? Z[z].label.toUpperCase() : 'BELUM ADA DATA'}</b></div>
        ${link ? `<a class="go" href="#/kec/${kode}" aria-label="Lihat detail">${icon('chev')}</a>` : ''}
      </div>
      <div class="risk-desc">${esc(desc)}</div>
      <div class="risk-meta"><span>${v == null ? '–' : `<b>${esc(val)}</b>`}</span><span>${esc(obs ? `W${wr.w} · ${wr.y}` : wr.range || '')} · ${esc(W.METHODS[W.method].name)}</span></div>
    </div>`;
  };

  // ---------------------------------------------------------------
  // Grafik garis 5 minggu ke depan
  // ---------------------------------------------------------------
  function smooth(pts, top, bot) {
    if (pts.length < 3) return 'M' + pts.map((p) => p.join(',')).join('L');
    const cl = (y) => Math.max(top, Math.min(bot, y));
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  ui.fiveWeeks = (kode, { showSummary = true } = {}) => {
    const D = W.D;
    const idx = D.ahead;
    const vals = idx.map((i) => D.pred(kode, i) ?? 0);
    const Wd = 340, H = 214, ml = 30, mr = 14, mt = 30, mb = 38;
    const iw = Wd - ml - mr, ih = H - mt - mb;
    const rawMax = Math.max(2, ...vals);
    const step = rawMax <= 6 ? 2 : rawMax <= 15 ? 5 : rawMax <= 40 ? 10 : rawMax <= 100 ? 25 : 50;
    const max = Math.ceil((rawMax * 1.18) / step) * step;
    const x = (j) => ml + (idx.length === 1 ? iw / 2 : (j * iw) / (idx.length - 1));
    const y = (v) => mt + ih - (v / max) * ih;
    let g = '';
    for (let t = 0; t <= max; t += step) {
      g += `<line x1="${ml}" x2="${Wd - mr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-dasharray="${t ? '3 4' : ''}"/>`;
      g += `<text x="${ml - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${t}</text>`;
    }
    const pts = vals.map((v, j) => [x(j), y(v)]);
    const line = smooth(pts, mt, mt + ih);
    g += `<defs><linearGradient id="fwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c0111f" stop-opacity=".26"/><stop offset="100%" stop-color="#c0111f" stop-opacity="0"/></linearGradient></defs>`;
    g += `<path d="${line}L${pts[pts.length - 1][0]},${mt + ih}L${pts[0][0]},${mt + ih}Z" fill="url(#fwg)"/>`;
    g += `<path d="${line}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    idx.forEach((wi, j) => {
      const z = D.zone(kode, wi);
      g += `<circle cx="${pts[j][0]}" cy="${pts[j][1]}" r="6.5" fill="${ZVAR[z] || 'var(--n)'}" stroke="#fff" stroke-width="2.5"/>`;
      g += `<text x="${pts[j][0]}" y="${pts[j][1] - 13}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink)">${vals[j] < 1 ? '<1' : Math.round(vals[j])}</text>`;
      const w = D.weeks[wi];
      g += `<text x="${pts[j][0]}" y="${H - 18}" text-anchor="middle" font-size="12" font-weight="800" fill="${w.d === 0 ? 'var(--brand)' : 'var(--ink-2)'}">${w.d === 0 ? 'Ini' : 'W' + w.w}</text>`;
      g += `<text x="${pts[j][0]}" y="${H - 4}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">${fmt.dm(w.start)}</text>`;
    });
    return `<div class="fw"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Grafik perkiraan kasus beberapa minggu ke depan">${g}</svg></div>
      ${showSummary ? `<p class="fw-sum">${ui.outlookSummary(kode)}</p>` : ''}`;
  };

  ui.pill = (z) => (z ? `<span class="pill z-${z}">${Z[z].short}</span>` : '<span class="pill">–</span>');

  // ---------------------------------------------------------------
  // Grafik batang: kasus terlapor + perkiraan (halaman detail)
  // ---------------------------------------------------------------
  ui.chart = (kode, recent) => {
    const D = W.D;
    const bars = recent.map((r) => ({ v: r.kasus, lbl: fmt.dm(W.epi.weekStart(r.tahun, r.minggu)), kind: r.is_final ? 'a' : 'p', idx: W.epi.weekIdx(r.tahun, r.minggu) }));
    const lastIdx = bars.length ? bars[bars.length - 1].idx : -Infinity;
    let hasGap = false;
    D.weeks.forEach((w, i) => {
      if (w.idx <= lastIdx) return;
      // Minggu yang datanya belum dirilis Dinkes dan belum masuk perkiraan: beri tanda kosong, jangan dilompati
      const prev = bars.length ? bars[bars.length - 1].idx : w.idx - 1;
      for (let g = prev + 1; g < w.idx && bars.length; g++) { bars.push({ v: 0, lbl: fmt.dm(W.epi.idxToStart(g)), kind: 'g', idx: g }); hasGap = true; }
      const z = D.zone(kode, i);
      bars.push({ v: D.pred(kode, i) ?? 0, lbl: fmt.dm(w.start), kind: 'f', color: ZVAR[z] || 'var(--n)', d: w.d, idx: w.idx });
    });
    const Wd = 340, H = 196, ml = 26, mr = 6, mt = 22, mb = 30;
    const iw = Wd - ml - mr, ih = H - mt - mb;
    const max = Math.max(3, ...bars.map((b) => b.v)) * 1.15;
    const step = Math.max(1, Math.ceil(max / 3 / (max > 15 ? 5 : 1)) * (max > 15 ? 5 : 1));
    const n = bars.length, bw = iw / n;
    const y = (v) => mt + ih - (v / max) * ih;
    let g = '';
    for (let t = 0; t <= max; t += step) {
      g += `<line x1="${ml}" x2="${Wd - mr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-dasharray="${t ? '3 3' : ''}"/>`;
      g += `<text x="${ml - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10.5" fill="var(--ink-3)">${t}</text>`;
    }
    const fcStart = bars.findIndex((b) => b.kind === 'f');
    if (fcStart >= 0) {
      g += `<rect x="${ml + fcStart * bw}" y="${mt - 16}" width="${iw - fcStart * bw}" height="${ih + 16}" fill="var(--brand-soft)" opacity=".8" rx="8"/>`;
      g += `<text x="${ml + fcStart * bw + 6}" y="${mt - 4}" font-size="10.5" font-weight="800" fill="var(--brand)">PERKIRAAN</text>`;
    }
    bars.forEach((b, j) => {
      const x = ml + j * bw + bw * 0.16, w = bw * 0.68, yy = y(b.v), h = Math.max(b.v > 0 ? 2 : 0, mt + ih - yy);
      if (b.kind === 'g') {
        g += `<rect x="${x}" y="${mt + ih - 22}" width="${w}" height="22" rx="4" fill="none" stroke="#c2b4b4" stroke-dasharray="3 2"/>`;
        g += `<text x="${x + w / 2}" y="${mt + ih - 7}" text-anchor="middle" font-size="12" font-weight="800" fill="#b3a4a4">?</text>`;
      } else if (b.kind === 'a') g += `<rect x="${x}" y="${mt + ih - h}" width="${w}" height="${h}" rx="4" fill="#c2b4b4"/>`;
      else if (b.kind === 'p') g += `<rect x="${x}" y="${mt + ih - h}" width="${w}" height="${h}" rx="4" fill="#ece3e2" stroke="#c2b4b4" stroke-dasharray="3 2"/>`;
      else {
        g += `<rect x="${x}" y="${mt + ih - h}" width="${w}" height="${h}" rx="4" fill="${b.color}"/>`;
        g += `<text x="${x + w / 2}" y="${mt + ih - h - 4}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--ink-2)">${b.v < 1 ? '<1' : Math.round(b.v)}</text>`;
      }
      if (b.d === 0) g += `<text x="${x + w / 2}" y="${H - 2}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--brand)">INI</text>`;
      if (j % 2 === (n - 1) % 2 || n <= 7) g += `<text x="${x + w / 2}" y="${H - 15}" text-anchor="middle" font-size="10" fill="var(--ink-3)">${b.lbl}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Grafik kasus mingguan dan perkiraan">${g}</svg></div>
      <div class="ch-legend"><span><i style="background:#c2b4b4"></i>Terlapor</span><span><i style="background:#ece3e2;outline:1px dashed #c2b4b4"></i>Sementara</span><span><i style="background:var(--brand)"></i>Perkiraan</span>${hasGap ? '<span><i style="background:transparent;outline:1px dashed #c2b4b4"></i>Belum dirilis</span>' : ''}</div>`;
  };

  // ---------------------------------------------------------------
  // Peta dari GeoJSON: siluet (welcome) dan peta mini berpin (beranda)
  // ---------------------------------------------------------------
  function geoFrame() {
    const feats = window.RADENSA_GEO.features.filter((f) => f.properties.kab_kode !== 6);
    const polysOf = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    feats.forEach((f) => polysOf(f).forEach((p) => p.forEach((ring) => ring.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }))));
    const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
    const VW = 400, sx = VW / ((x1 - x0) * k), VH = Math.round((y1 - y0) * sx);
    const P = ([x, y]) => [(x - x0) * k * sx, (y1 - y) * sx];
    const pathOf = (f) => polysOf(f).map((p) => p.map((ring) => 'M' + ring.map((c) => P(c).map((n) => n.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
    const centroid = (f) => {
      let best = null;
      polysOf(f).forEach((p) => { if (!best || p[0].length > best.length) best = p[0]; });
      const s = best.reduce((a, c) => { const q = P(c); return [a[0] + q[0], a[1] + q[1]]; }, [0, 0]);
      return [s[0] / best.length, s[1] / best.length];
    };
    return { feats, VW, VH, pathOf, centroid };
  }
  ui.silhouette = (fill) => {
    const { feats, VW, VH, pathOf } = geoFrame();
    const paths = feats.map((f) => `<path d="${pathOf(f)}" fill="${fill(f.properties.kode_kec)}"><title>${esc(f.properties.nama)}</title></path>`).join('');
    return `<svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Peta risiko DBD Jakarta minggu ini">${paths}</svg>`;
  };
  ui.miniMap = (kode) => {
    const D = W.D;
    const { feats, VW, VH, pathOf, centroid } = geoFrame();
    const me = feats.find((f) => f.properties.kode_kec === kode);
    // Kepulauan Seribu ada di luar peta daratan: tampilkan seluruh Jakarta, pin di pesisir utara.
    const island = !me;
    const [cx, cy] = me ? centroid(me) : [VW * 0.42, 6];
    const w = island ? VW : 230, h = island ? VH : 118;
    const vx = island ? 0 : Math.max(0, Math.min(VW - w, cx - w / 2)), vy = island ? 0 : Math.max(0, Math.min(VH - h, cy - h / 2));
    const draw = (f, cls) => `<path ${cls ? `class="${cls}"` : ''} d="${pathOf(f)}" fill="${ui.zoneHex(D.zone(f.properties.kode_kec))}"/>`;
    const paths = feats.filter((f) => f !== me).map((f) => draw(f)).join('') + (me ? draw(me, 'me') : '');
    const pin = `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})"><ellipse cx="0" cy="1" rx="5" ry="1.8" fill="rgba(0,0,0,.28)"/><path d="M0 0C-3.5-7-10-12-10-19a10 10 0 0 1 20 0C10-12 3.5-7 0 0Z" fill="#c0111f" stroke="#fff" stroke-width="1.6"/><circle cx="0" cy="-19" r="3.8" fill="#fff"/></g>`;
    const vb = island ? `-40 -34 ${VW + 80} ${VH + 40}` : `${vx.toFixed(1)} ${vy.toFixed(1)} ${w} ${h}`;
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid ${island ? 'meet' : 'slice'}" role="img" aria-label="Peta lokasi kecamatanmu">${paths}${pin}</svg>`;
  };

  // ---------------------------------------------------------------
  // Peringatan (lonceng): perubahan zona di kecamatanmu dan yang dipantau
  // ---------------------------------------------------------------
  ui.alerts = () => {
    const D = W.D, A = W.app;
    const codes = [...new Set([A.myKec(), ...A.pantauan()].filter((k) => k && D.by.has(k)))];
    const out = [];
    for (const k of codes) {
      const cur = D.zone(k);
      if (!cur) continue;
      let ch = null;
      for (const i of D.ahead.slice(1)) { const z = D.zone(k, i); if (z && z !== cur) { ch = { i, z }; break; } }
      if (ch) out.push({ k, type: Z[ch.z].rank > Z[cur].rank ? 'up' : 'dn', from: cur, to: ch.z, i: ch.i });
      else if (cur === 'Merah') out.push({ k, type: 'same', from: cur, to: cur, i: D.ci });
    }
    const sev = { up: 3, same: 2, dn: 1 };
    return out.sort((a, b) => sev[b.type] - sev[a.type]);
  };
  ui.openAlerts = () => {
    const D = W.D;
    const list = ui.alerts();
    const html = list.length ? list.map((a) => {
      const nm = esc(D.by.get(a.k).nm), w = D.weeks[a.i];
      const t = a.type === 'up' ? `${nm} naik ke ${Z[a.to].label}` : a.type === 'dn' ? `${nm} membaik ke ${Z[a.to].label}` : `${nm} masih ${Z.Merah.label}`;
      const s = a.type === 'same' ? 'Sampai akhir perkiraan' : `Mulai ${fmt.dmLong(w.start)}`;
      return `<a class="notif" href="#/kec/${a.k}" data-close><i class="${a.type === 'dn' ? 'dn' : a.type === 'same' ? 'same' : ''}">${icon(a.type === 'dn' ? 'arrDown' : a.type === 'same' ? 'alert' : 'arrUp')}</i><div><b>${t}</b><span>${s}</span></div></a>`;
    }).join('') : `<div class="empty-card"><b>Belum ada peringatan</b>Risiko di kecamatanmu dan yang kamu pantau diperkirakan stabil.</div>`;
    const s = ui.sheet({ title: 'Peringatan', html, flush: true });
    s.el.querySelectorAll('[data-close]').forEach((a) => a.addEventListener('click', () => s.close()));
  };

  // ---------------------------------------------------------------
  // Header aplikasi (logo, lonceng, avatar)
  // ---------------------------------------------------------------
  ui.header = () => {
    const A = W.app, nm = A.name();
    const hot = ui.alerts().some((a) => a.type !== 'dn');
    return `<div class="hdr">
      <a class="brand" href="#/beranda"><img src="icons/logo.png" alt="" width="34" height="34"><b>DENGUARD</b></a>
      <button class="icon-btn sol" id="bell" aria-label="Peringatan">${icon('bell')}${hot ? '<span class="dot"></span>' : ''}</button>
      <a class="avatar" href="#/profil" aria-label="Profil">${esc(nm ? fmt.initials(nm) : '?')}</a>
    </div>`;
  };
  ui.wireHeader = (root) => {
    const b = root.querySelector('#bell');
    if (b) b.onclick = ui.openAlerts;
  };

  // ---------------------------------------------------------------
  // Bottom sheet, picker, toast
  // ---------------------------------------------------------------
  ui.sheet = ({ title, sub, html, flush = false, onClose }) => {
    const root = document.getElementById('sheet-root');
    const ov = document.createElement('div');
    ov.className = 'sheet-ov';
    const el = document.createElement('div');
    el.className = 'sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="sheet-handle"></div>
      <div class="sheet-h"><div class="tt"><h3>${esc(title || '')}</h3>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</div><button class="icon-btn" data-close-btn aria-label="Tutup">${icon('x')}</button></div>
      <div class="sheet-b ${flush ? 'flush' : ''}">${html}</div>`;
    root.append(ov, el);
    document.body.style.overflow = 'hidden';
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add('closing');
      ov.style.opacity = '0';
      setTimeout(() => { ov.remove(); el.remove(); if (!root.children.length) document.body.style.overflow = ''; }, 190);
      onClose && onClose();
    };
    ov.onclick = close;
    el.querySelector('[data-close-btn]').onclick = close;
    // geser ke bawah untuk menutup
    let sy = null;
    el.querySelector('.sheet-handle').addEventListener('touchstart', (e) => { sy = e.touches[0].clientY; }, { passive: true });
    el.querySelector('.sheet-handle').addEventListener('touchend', (e) => { if (sy != null && e.changedTouches[0].clientY - sy > 60) close(); sy = null; });
    const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    return { el, body: el.querySelector('.sheet-b'), close };
  };

  // Pil kecil penanda metode zonasi yang sedang dipakai
  ui.methodPill = (id = 'mp') => `<button class="methpill" id="${id}" type="button" aria-label="Metode zonasi: ${esc(W.METHODS[W.method].name)}. Ketuk untuk mengganti."><small>Metode</small><b>${esc(W.METHODS[W.method].name)}</b>${icon('down', 'ch')}</button>`;

  // Pilih metode zonasi (EWARS / Kanal Endemis) dengan penjelasan awam
  ui.methodSheet = (onChange) => {
    const card = (m) => {
      const M = W.METHODS[m], on = W.method === m;
      return `<button class="meth ${on ? 'on' : ''}" data-m="${m}" role="radio" aria-checked="${on}">
        <span class="rd"></span>
        <span class="mt"><b>${esc(M.name)}<em>${esc(M.tag)}</em></b><span>${M.what}</span>
        <ul>${M.rule.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></span></button>`;
    };
    const s = ui.sheet({
      title: 'Cara menilai risiko',
      html: `<p class="muted" style="margin:0 0 12px">Dua cara ini sama-sama lazim dipakai dalam pemantauan DBD. Warna di seluruh aplikasi mengikuti pilihanmu.</p>
        <div class="meths" role="radiogroup">${card('ewars')}${card('ec')}</div>`,
    });
    s.el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
      const m = b.dataset.m;
      if (m === W.method) { s.close(); return; }
      W.setMethod(m);
      s.close();
      ui.toast(`Metode: ${W.METHODS[m].name}`);
      if (onChange) onChange(m);
    }));
    return s;
  };

  // Pilih tanggal (sejak awal data, 2017) -> onPick('YYYY-MM-DD')
  ui.datePicker = ({ value, onPick }) => {
    const E = W.epi, today = E.todayJkt();
    const minD = E.parseDay(W.config.historyStart || '2017-01-01'), max = E.isoDay(today), min = E.isoDay(minD);
    const years = []; for (let y = minD.getUTCFullYear(); y <= today.getUTCFullYear(); y++) years.push(y);
    const s = ui.sheet({
      title: 'Lihat tanggal lain',
      html: `<p class="muted" style="margin:0 0 12px">Pilih tanggal sejak Januari 2017. Kami tampilkan minggu itu dan 4 minggu sesudahnya.</p>
        <input class="input date" id="dp-in" type="date" min="${min}" max="${max}" value="${esc(value || max)}" aria-label="Tanggal">
        <div class="dp-info" id="dp-info"></div>
        <div class="dp-lbl">Lompat ke tahun</div>
        <div class="chips tight" id="dp-years">${years.slice().reverse().map((y) => `<button class="chip" data-y="${y}">${y}</button>`).join('')}</div>
        <div class="dp-lbl">Atau</div>
        <div class="chips tight" id="dp-quick">${[['Hari ini', 0], ['1 bulan lalu', 30], ['3 bulan lalu', 91], ['1 tahun lalu', 364]].map(([l, n]) => `<button class="chip" data-n="${n}">${l}</button>`).join('')}</div>
        <button class="btn primary block" id="dp-go" style="margin-top:6px">Tampilkan</button>`,
    });
    const inp = s.el.querySelector('#dp-in'), info = s.el.querySelector('#dp-info'), go = s.el.querySelector('#dp-go');
    const clamp = (str) => (str < min ? min : str > max ? max : str);
    const refresh = () => {
      const d = E.parseDay(inp.value);
      const ok = !!d && inp.value >= min && inp.value <= max;
      go.disabled = !ok;
      if (!ok) { info.innerHTML = `Pilih tanggal antara ${fmt.dmy(minD)} dan hari ini.`; return; }
      const [y, w] = E.dateToEpi(d);
      info.innerHTML = `<b>Minggu ke-${w} tahun ${y}</b> <span>${esc(fmt.range(y, w))}</span>`;
      s.el.querySelectorAll('[data-y]').forEach((c) => c.classList.toggle('on', +c.dataset.y === d.getUTCFullYear()));
    };
    inp.oninput = refresh;
    s.el.querySelectorAll('[data-y]').forEach((c) => (c.onclick = () => { inp.value = clamp(`${c.dataset.y}-01-01`); refresh(); }));
    s.el.querySelectorAll('[data-n]').forEach((c) => (c.onclick = () => { inp.value = clamp(E.isoDay(new Date(today.getTime() - +c.dataset.n * E.DAY))); refresh(); }));
    go.onclick = () => { const v = inp.value; s.close(); onPick(v); };
    refresh();
    return s;
  };

  ui.kecPicker = ({ title = 'Pilih kecamatan', selected, onPick }) => {
    const D = W.D;
    const s = ui.sheet({
      title, flush: true,
      html: `<div class="search">${icon('search')}<input class="input" type="search" placeholder="Cari nama kecamatan" autocomplete="off" aria-label="Cari kecamatan"></div>
        <button class="geo-row" data-geo>${icon('locate')}<span>Gunakan lokasi saya<small>Deteksi kecamatan dari GPS ponsel</small></span></button>
        <div data-list></div>`,
    });
    const list = s.el.querySelector('[data-list]');
    const draw = (q = '') => {
      const ql = q.trim().toLowerCase();
      let html = '', last = null;
      for (const k of D.kec) {
        if (ql && !k.nm.toLowerCase().includes(ql) && !k.kota.toLowerCase().includes(ql)) continue;
        if (k.kota !== last) { html += `<div class="grp-h">${esc(k.kota)}</div>`; last = k.kota; }
        html += `<button class="pick-row ${k.kode === selected ? 'sel' : ''}" data-k="${k.kode}">${esc(k.nm)}${k.kode === selected ? icon('check') : ''}</button>`;
      }
      list.innerHTML = html || '<div class="empty-card"><b>Tidak ditemukan</b>Coba ketik nama lain, misalnya "Tebet".</div>';
      list.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => { s.close(); onPick(b.dataset.k); }));
    };
    s.el.querySelector('input').oninput = (e) => draw(e.target.value);
    s.el.querySelector('[data-geo]').onclick = (e) => {
      const btn = e.currentTarget;
      if (!navigator.geolocation) { ui.toast('Perangkat tidak mendukung lokasi.'); return; }
      btn.querySelector('small').textContent = 'Mencari lokasimu…';
      navigator.geolocation.getCurrentPosition((pos) => {
        const kode = W.kecFromPoint(pos.coords.longitude, pos.coords.latitude);
        if (!kode) { btn.querySelector('small').textContent = 'Lokasimu di luar DKI Jakarta. Pilih manual di bawah.'; return; }
        ui.toast(`Kamu berada di ${D.by.get(kode).nm}`);
        s.close();
        onPick(kode);
      }, (err) => {
        btn.querySelector('small').textContent = err.code === 1 ? 'Izin lokasi ditolak. Pilih manual di bawah.' : 'Lokasi tidak ditemukan. Pilih manual di bawah.';
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    };
    draw();
    return s;
  };

  let toastT = null;
  ui.toast = (msg) => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 2800);
  };

  ui.nav = (active) => `<nav class="nav" aria-label="Navigasi utama">${[
    ['beranda', 'home', 'Beranda'], ['jelajah', 'map', 'Peta'], ['prakiraan', 'trend', 'Prakiraan'], ['panduan', 'shield', 'Cegah'],
  ].map(([id, ic, lb]) => `<a href="#/${id}" class="${active === id ? 'on' : ''}" ${active === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${lb}</span></a>`).join('')}</nav>`;

  ui.btnBusy = (btn, busy, label) => {
    if (busy) { btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="spin"></span>${label || ''}`; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.label || btn.innerHTML; btn.disabled = false; }
  };

  // ---------------------------------------------------------------
  // Leaflet dimuat saat peta pertama kali dibuka (hemat kuota)
  // ---------------------------------------------------------------
  let leafletP = null;
  ui.loadLeaflet = () => {
    if (window.L) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = () => res(window.L);
      s.onerror = () => { leafletP = null; rej(new Error('Peta gagal dimuat')); };
      document.head.appendChild(s);
    });
    return leafletP;
  };
})();
