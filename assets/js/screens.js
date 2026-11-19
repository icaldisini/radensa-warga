(function () {
  const W = window.W;
  const { esc, icon, fmt, Z, ui, store } = W;
  const S = (W.screens = {});
  const app = () => W.app;

  const backBtn = (fallback) => `<button class="icon-btn" data-back="${fallback}" aria-label="Kembali">${icon('back')}</button>`;
  function wireBack(root) {
    root.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => {
      if (W.navDepth > 1) history.back(); else location.hash = b.dataset.back;
    }));
  }
  const errBox = (msg) => `<div class="err-msg" role="alert">${icon('alert')}<span>${esc(msg)}</span></div>`;
  function eyeToggle(root) {
    root.querySelectorAll('[data-eye]').forEach((b) => (b.onclick = () => {
      const inp = root.querySelector('#' + b.dataset.eye);
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      b.innerHTML = icon(show ? 'eyeOff' : 'eye');
      b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    }));
  }
  const pwField = (id, label, auto, hint) => `<div class="field"><label for="${id}">${label}</label>
    <div class="input-wrap"><input class="input" id="${id}" type="password" autocomplete="${auto}" required>
    <button type="button" class="icon-btn eye" data-eye="${id}" aria-label="Tampilkan kata sandi">${icon('eye')}</button></div>
    ${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;

  function metaFoot() {
    const D = W.D;
    return `<p class="meta-foot">Diperbarui ${esc(fmt.wib(D.at))}<br>Sumber: Dinkes DKI Jakarta · model DENGUARD</p>`;
  }
  function statusBanners() {
    let h = '';
    if (W.offline) h += `<div class="offline">${icon('info')}<span>Kamu offline. Menampilkan data terakhir yang tersimpan.</span></div>`;
    if (W.D.stale) h += `<div class="banner warn">${icon('info')}<span>Perkiraan minggu ini belum terbit. Menampilkan yang terakhir.</span></div>`;
    return h;
  }
  const locPill = (k, id = 'loc') => `<button class="locpill" id="${id}" type="button">${icon('pin')}<span class="t">${k ? esc(k.nm) : 'Pilih kecamatan'}<small>${k ? esc(k.kota) : 'Ketuk untuk memilih lokasi'}</small></span>${icon('down', 'ch')}</button>`;

  // =================================================================
  // Selamat datang
  // =================================================================
  S.welcome = (root) => {
    const D = W.D;
    root.className = 'welcome';
    root.innerHTML = `
      <div class="wl-top"><a class="brand" href="#/selamat-datang"><img src="icons/logo.png" alt="" width="34" height="34"><b>DENGUARD</b></a></div>
      <div class="wl-hero">
        <div class="wl-map">${ui.silhouette((k) => ui.zoneHex(D.zone(k)))}</div>
        <div class="wl-cap"><span class="live"></span>Risiko DBD Jakarta · ${esc(D.weekLabel(D.ci).toLowerCase())}</div>
      </div>
      <h1 class="wl-h">Waspada dengue <em>lebih awal.</em></h1>
      <p class="wl-p">Cek risiko DBD di kecamatanmu untuk beberapa minggu ke depan.</p>
      <div class="wl-actions">
        <a class="btn primary block" href="#/daftar">Daftar gratis</a>
        <a class="btn outline block" href="#/masuk">Saya sudah punya akun</a>
        <div class="wl-guest"><button class="textlink" data-guest>Lihat dulu tanpa akun</button></div>
      </div>`;
    root.querySelector('[data-guest]').onclick = () => ui.kecPicker({
      title: 'Kamu tinggal di kecamatan mana?',
      onPick: (k) => { app().startGuest(k); location.hash = '#/beranda'; },
    });
  };

  // =================================================================
  // Daftar (2 langkah)
  // =================================================================
  S.daftar = (root) => {
    const d = W.draft;
    d.step = d.step || 1;
    if (!d.kode && W.S.guest?.kode_kec) d.kode = W.S.guest.kode_kec;

    function draw(err) {
      const D = W.D, k = d.kode ? D.by.get(d.kode) : null;
      if (d.step === 1) {
        root.innerHTML = `
          <div class="topbar">${backBtn('#/selamat-datang')}</div>
          <div class="steps" aria-label="Langkah 1 dari 2"><i class="on"></i><i></i></div>
          <h1 class="auth-h">Kenalan dulu, yuk</h1>
          <p class="auth-p">Nama ini dipakai untuk masuk nanti, jadi ingat-ingat ya.</p>
          ${err ? errBox(err) : ''}
          <div class="field"><label for="nama">Nama</label><input class="input" id="nama" autocomplete="name" placeholder="Contoh: Siti Rahma" value="${esc(d.nama || '')}" maxlength="60">
          <span class="hint">Pakai nama lengkap supaya unik.</span></div>
          <div class="field"><label>Kecamatan tempat tinggal</label>
            <button type="button" class="picker" id="pick">${k ? `<span class="val">${esc(k.nm)}<small>${esc(k.kota)}</small></span>` : '<span class="ph">Pilih kecamatan</span>'}${icon('down')}</button>
            <span class="hint">Bisa diubah kapan saja.</span></div>
          <button class="btn primary block" id="next" style="margin-top:8px">Lanjut</button>
          <p class="auth-alt">Sudah punya akun? <a href="#/masuk"><b>Masuk</b></a></p>`;
        wireBack(root);
        root.querySelector('#nama').oninput = (e) => { d.nama = e.target.value; };
        root.querySelector('#pick').onclick = () => ui.kecPicker({ selected: d.kode, title: 'Kecamatan tempat tinggal', onPick: (kk) => { d.kode = kk; draw(); } });
        root.querySelector('#next').onclick = () => {
          d.nama = root.querySelector('#nama').value.trim();
          if (d.nama.length < 2) return draw('Tulis namamu (minimal 2 huruf).');
          if (!d.kode) return draw('Pilih kecamatan tempat tinggalmu.');
          d.step = 2; draw();
        };
      } else {
        root.innerHTML = `
          <div class="topbar"><button class="icon-btn" id="prev" aria-label="Kembali">${icon('back')}</button></div>
          <div class="steps" aria-label="Langkah 2 dari 2"><i class="on"></i><i class="on"></i></div>
          <h1 class="auth-h">Buat akunmu, ${esc(fmt.first(d.nama))}</h1>
          <p class="auth-p">Pilihanmu tersimpan dan bisa dibuka dari HP mana saja.</p>
          ${err ? errBox(err) : ''}
          <form id="f" novalidate>
            ${pwField('pw', 'Kata sandi', 'new-password', `Minimal ${W.config.minPassword} karakter, huruf dan angka.`)}
            <label class="check"><input type="checkbox" id="agree" ${d.agree ? 'checked' : ''}><span>Saya setuju nama dan kecamatan saya dipakai untuk layanan info DBD DENGUARD. Data tidak dibagikan ke pihak lain.</span></label>
            <button class="btn primary block" id="go" type="submit">Daftar</button>
          </form>
          <p class="auth-alt">Sudah punya akun? <a href="#/masuk"><b>Masuk</b></a></p>`;
        eyeToggle(root);
        root.querySelector('#prev').onclick = () => { d.step = 1; draw(); };
        root.querySelector('#f').onsubmit = async (e) => {
          e.preventDefault();
          const pw = root.querySelector('#pw').value;
          d.agree = root.querySelector('#agree').checked;
          if (pw.length < W.config.minPassword) return draw(`Kata sandi minimal ${W.config.minPassword} karakter.`);
          if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return draw('Kata sandi perlu gabungan huruf dan angka.');
          if (!d.agree) return draw('Centang persetujuan dulu untuk melanjutkan.');
          const btn = root.querySelector('#go');
          ui.btnBusy(btn, true, 'Mendaftarkan…');
          try {
            const res = await W.auth.signUp({ nama: d.nama, password: pw, kode_kec: d.kode, pantauan: W.S.guest?.pantauan || [] });
            if (!res.session) throw new Error('confirm email masih aktif');
            await app().afterLogin(res.session.user);
            W.draft = {};
            ui.toast(`Selamat datang, ${fmt.first(res.session.user.user_metadata?.nama || '')}!`);
            location.hash = '#/beranda';
          } catch (er) {
            ui.btnBusy(btn, false);
            draw(W.authError(er));
          }
        };
      }
    }
    root.className = 'screen no-nav';
    draw();
  };

  // =================================================================
  // Masuk
  // =================================================================
  S.masuk = (root) => {
    root.className = 'screen no-nav';
    function draw(err, nama = '') {
      root.innerHTML = `
        <div class="topbar">${backBtn('#/selamat-datang')}</div>
        <h1 class="auth-h">Selamat datang kembali</h1>
        <p class="auth-p">Masuk untuk melihat risiko DBD di kecamatanmu.</p>
        ${err ? errBox(err) : ''}
        <form id="f" novalidate>
          <div class="field"><label for="nama">Nama</label><input class="input" id="nama" autocomplete="name" placeholder="Nama saat daftar" value="${esc(nama)}"></div>
          ${pwField('pw', 'Kata sandi', 'current-password')}
          <button class="btn primary block" id="go" type="submit" style="margin-top:8px">Masuk</button>
        </form>
        <p class="auth-alt">Belum punya akun? <a href="#/daftar"><b>Daftar</b></a></p>`;
      wireBack(root);
      eyeToggle(root);
      root.querySelector('#f').onsubmit = async (e) => {
        e.preventDefault();
        const nm = root.querySelector('#nama').value.trim(), pw = root.querySelector('#pw').value;
        if (nm.length < 2) return draw('Masukkan nama yang kamu pakai saat daftar.', nm);
        if (!pw) return draw('Masukkan kata sandimu.', nm);
        const btn = root.querySelector('#go');
        ui.btnBusy(btn, true, 'Masuk…');
        try {
          const res = await W.auth.signIn(nm, pw);
          await app().afterLogin(res.user);
          ui.toast(`Halo, ${fmt.first(app().name()) || 'selamat datang'}!`);
          location.hash = '#/beranda';
        } catch (er) { draw(W.authError(er), nm); }
      };
    }
    draw();
  };

  // =================================================================
  // Beranda
  // =================================================================
  S.beranda = (root) => {
    const D = W.D, A = app();
    const kode = A.myKec();
    const nm = A.name();
    root.className = 'screen';
    const k = kode ? D.by.get(kode) : null;
    const pant = A.pantauan().filter((x) => D.by.has(x));

    root.innerHTML = `
      ${ui.header()}
      ${statusBanners()}
      ${A.mode() === 'guest' ? `<div class="banner">${icon('user')}<span><b>Mode tamu.</b> Daftar supaya pilihanmu tersimpan.</span><a class="btn primary" href="#/daftar">Daftar</a></div>` : ''}
      <div class="title">
        ${nm ? `<div class="hi">Halo, ${esc(fmt.first(nm))}</div>` : ''}
        <h1>Waspada dengue lebih awal.</h1>
        <p>Cek risiko di wilayahmu dan cegah sejak dini.</p>
      </div>
      ${locPill(k)}
      ${kode ? `
        ${ui.riskCard(kode)}
        <div class="minimap">${ui.miniMap(kode)}
          <a class="exp" href="#/jelajah" aria-label="Buka peta">${icon('expand')}</a>
          <div class="cap"><span><i style="background:var(--h-map)"></i>Rendah</span><span><i style="background:var(--k-map)"></i>Waspada</span><span><i style="background:var(--m-map)"></i>Tinggi</span></div>
        </div>
        <section class="sec">
          <div class="sec-h"><h2><i>${icon('chart')}</i>${D.ahead.length} Minggu ke Depan</h2><a class="link" href="#/prakiraan">Rincian${icon('chev')}</a></div>
          <div class="card">${ui.fiveWeeks(kode)}</div>
        </section>` : `<div class="card empty-card" style="margin-top:14px"><b>Pilih kecamatanmu</b>Supaya kami bisa menampilkan risiko DBD di tempat tinggalmu.</div>`}

      <section class="sec">
        <div class="sec-h"><h2><i>${icon('shield')}</i>Tips Pencegahan</h2><a class="link" href="#/panduan">Lihat semua${icon('chev')}</a></div>
        <div class="tips">${W.TIPS.map((t) => `<a class="tip-t" href="#/panduan/3m"><i>${icon(t.icon)}</i><span>${esc(t.label)}</span></a>`).join('')}</div>
      </section>

      <section class="sec">
        <div class="sec-h"><h2><i>${icon('star')}</i>Kecamatan Dipantau</h2></div>
        ${pant.length ? `<div class="hscroll">${pant.map((x) => {
          const kk = D.by.get(x), zz = D.zone(x);
          return `<a class="pcard ${zz ? 'z-' + zz : ''}" href="#/kec/${x}"><b>${esc(kk.nm)}</b><span class="k">${esc(kk.kota)}</span>${ui.pill(zz)}</a>`;
        }).join('')}<a class="pcard add" href="#/jelajah">${icon('star')}<span>Tambah kecamatan</span></a></div>`
        : `<div class="card pad" style="display:flex;gap:14px;align-items:center"><span style="flex:1;font-size:14.5px;color:var(--ink-2)">Pantau kecamatan keluarga, sekolah, atau kantormu.</span><a class="btn primary btn-sm" href="#/jelajah">${icon('star')}Pilih</a></div>`}
      </section>

      <a class="dangerlink" href="#/panduan/bahaya"><i>${icon('alert')}</i><span style="flex:1"><b>Kenali tanda bahaya DBD</b><span>Kapan harus segera ke IGD</span></span>${icon('chev', 'chev')}</a>
      ${metaFoot()}`;

    ui.wireHeader(root);
    root.querySelector('#loc').onclick = () => ui.kecPicker({
      selected: kode, title: 'Kecamatan tempat tinggal',
      onPick: async (kk) => {
        try { await A.setMyKec(kk); S.beranda(root); } catch (e) { ui.toast(W.authError(e)); }
      },
    });
  };

  // =================================================================
  // Peta (jelajah daftar & peta) -- prakiraan 5 minggu ATAU kasus historis sejak 2017
  // =================================================================
  const JL = { view: 'list', filter: 'all', q: '', anchor: null, sel: null };
  S.jelajah = (root) => {
    const D = W.D, A = app(), E = W.epi;
    root.className = A.mode() ? 'screen' : 'screen no-nav';
    root.innerHTML = `
      ${A.mode() ? ui.header() : `<div class="topbar">${backBtn('#/selamat-datang')}</div>`}
      ${statusBanners()}
      <div class="title"><h1>Peta Risiko</h1><p>${D.kec.length} kecamatan di DKI Jakarta</p></div>
      <div class="seg" role="tablist"><button data-v="list">${icon('list')}Daftar</button><button data-v="map">${icon('map')}Peta</button></div>
      <div id="ctl"></div>
      <div id="body"></div>`;
    ui.wireHeader(root);

    // Jendela 5 minggu: live (minggu berjalan + 4) atau mulai dari tanggal yang dipilih
    const windowWeeks = () => {
      if (!JL.anchor) return D.ahead.map((i) => D.wk(D.weeks[i].y, D.weeks[i].w));
      const d = E.parseDay(JL.anchor);
      return [0, 1, 2, 3, 4].map((n) => { const [y, w] = E.dateToEpi(new Date(d.getTime() + n * 7 * E.DAY)); return D.wk(y, w); });
    };
    let wks = windowWeeks();
    // Default: minggu pertama di jendela (live = minggu berjalan, historis = minggu dari tanggal pilihan)
    if (!wks.some((w) => w.idx === JL.sel)) JL.sel = wks[0].idx;
    const curWk = () => wks.find((w) => w.idx === JL.sel) || wks[0];
    const zoneOf = (kode) => D.zoneAt(kode, curWk());
    const hist = () => !!JL.anchor;

    function chipLabel(w) {
      if (hist()) return [fmt.dm(w.start), fmt.wy(w.y, w.w)];
      return [w.d === 0 ? 'Ini' : w.d === 1 ? 'Depan' : fmt.dm(w.start), 'W' + w.w];
    }
    function drawControls() {
      const h = hist(), a = h ? E.parseDay(JL.anchor) : null;
      root.querySelector('#ctl').innerHTML = `
        <div class="ctl">
          <button class="datepill ${h ? 'hist' : ''}" id="dp" type="button">${icon('calendar')}<span class="t"><b>${h ? esc(fmt.dmy(a)) : 'Hari ini'}</b><small>${h ? 'Data historis' : 'Prakiraan · pilih tanggal lain'}</small></span>${h ? '' : icon('down', 'ch')}</button>
          ${h ? `<button class="nowbtn" id="dp-now" type="button" aria-label="Kembali ke hari ini">Hari ini</button>` : ''}
          ${ui.methodPill('mp')}
        </div>
        <div class="wk5" id="weeks" style="--n:${wks.length}">${wks.map((w) => {
          const [l1, l2] = chipLabel(w);
          return `<button class="wkc ${w.idx === JL.sel ? 'on' : ''} ${w.src === 'none' ? 'na' : ''}" data-i="${w.idx}" aria-label="${esc(w.range)}"><b>${esc(l1)}</b><span>${esc(l2)}</span></button>`;
        }).join('')}</div>`;
      root.querySelector('#dp').onclick = () => ui.datePicker({ value: hist() ? JL.anchor : null, onPick: pickDate });
      const nb = root.querySelector('#dp-now');
      if (nb) nb.onclick = () => { JL.anchor = null; JL.sel = null; S.jelajah(root); };
      root.querySelector('#mp').onclick = () => ui.methodSheet(() => S.jelajah(root));
      root.querySelectorAll('#weeks .wkc').forEach((b) => (b.onclick = () => {
        JL.sel = +b.dataset.i;
        drawControls();
        if (JL.view === 'map' && mapApi && curWk().src !== 'none') mapApi.refresh(); else drawBody();
      }));
    }
    function pickDate(str) {
      const d = E.parseDay(str);
      if (!d) return;
      const [y, w] = E.dateToEpi(d);
      JL.anchor = E.weekIdx(y, w) >= D.curIdx ? null : str;
      JL.sel = null;
      S.jelajah(root);
    }

    const drawSeg = () => root.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === JL.view));
    root.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { JL.view = b.dataset.v; drawSeg(); drawBody(); }));

    let mapApi = null;
    function rowText(kode) {
      const w = curWk(), v = D.valueAt(kode, w);
      if (w.src === 'fc') return D.lowBase(kode) && (v ?? 0) < 1 ? 'Kasus sangat jarang di sini' : W.kasusText(v);
      const n = W.kasusObs(v) + (v != null && !D.finalAt(kode, w) ? ' · sementara' : '');
      return D.lowBase(kode) && v != null ? `${n} · di sini sangat jarang` : n;
    }
    function emptyWeek() {
      const w = curWk();
      return `<div class="card empty-card"><b>Data W${w.w} belum tersedia</b>Dinkes belum merilis kasus minggu ini, dan perkiraan dimulai dari minggu berjalan.<br><button class="btn outline" id="go-now" style="margin-top:12px">Lihat minggu ini</button></div>`;
    }
    function drawBody() {
      const body = root.querySelector('#body');
      mapApi = null;
      if (curWk().src === 'none') {
        body.innerHTML = emptyWeek();
        body.querySelector('#go-now').onclick = () => { JL.anchor = null; JL.sel = null; S.jelajah(root); };
        return;
      }
      if (JL.view === 'map') return drawMap(body);
      const cnt = { Merah: 0, Kuning: 0, Hijau: 0 };
      D.kec.forEach((k) => { const z = zoneOf(k.kode); if (z) cnt[z]++; });
      body.innerHTML = `
        <div class="search">${icon('search')}<input class="input" type="search" id="q" placeholder="Cari kecamatan" value="${esc(JL.q)}" autocomplete="off" aria-label="Cari"></div>
        <div class="flt" id="flt">${[['all', 'Semua', null], ['Merah', 'Tinggi', 'var(--m-map)', cnt.Merah], ['Kuning', 'Waspada', 'var(--k-map)', cnt.Kuning], ['Hijau', 'Rendah', 'var(--h-map)', cnt.Hijau]]
          .map(([v, l, c, n]) => `<button class="chip ${JL.filter === v ? 'on' : ''}" data-f="${v}">${c ? `<span class="dot" style="background:${c}"></span>` : ''}${l}${n != null ? `<em>${n}</em>` : ''}</button>`).join('')}</div>
        <div class="card" id="list"></div>`;
      body.querySelector('#q').oninput = (e) => { JL.q = e.target.value; drawList(); };
      body.querySelectorAll('#flt .chip').forEach((b) => (b.onclick = () => { JL.filter = b.dataset.f; body.querySelectorAll('#flt .chip').forEach((x) => x.classList.toggle('on', x === b)); drawList(); }));
      drawList();
    }
    function drawList() {
      const ql = JL.q.trim().toLowerCase();
      let html = '', last = null;
      for (const k of D.kec) {
        const z = zoneOf(k.kode);
        if (JL.filter !== 'all' && z !== JL.filter) continue;
        if (ql && !k.nm.toLowerCase().includes(ql) && !k.kota.toLowerCase().includes(ql)) continue;
        if (k.kota !== last) { html += `<div class="grp-h">${esc(k.kota)}</div>`; last = k.kota; }
        const on = A.mode() && A.isPantau(k.kode);
        html += `<div class="row" data-k="${k.kode}" role="link" tabindex="0">
          <span class="zb ${z ? 'z-' + z : ''}"></span>
          <span class="t"><b>${esc(k.nm)}${k.kode === A.myKec() ? ' <span class="small muted">· kamu</span>' : ''}</b><span>${esc(rowText(k.kode))}</span></span>
          ${ui.pill(z)}
          ${A.mode() ? `<button class="star ${on ? 'on' : ''}" data-star="${k.kode}" aria-label="${on ? 'Berhenti memantau' : 'Pantau'} ${esc(k.nm)}" aria-pressed="${on}">${icon(on ? 'starF' : 'star')}</button>` : ''}
        </div>`;
      }
      const list = root.querySelector('#list');
      list.innerHTML = html || '<div class="empty-card"><b>Tidak ditemukan</b>Coba kata kunci atau filter lain.</div>';
      list.querySelectorAll('.row').forEach((r) => {
        r.onclick = () => { location.hash = '#/kec/' + r.dataset.k; };
        r.onkeydown = (e) => { if (e.key === 'Enter') location.hash = '#/kec/' + r.dataset.k; };
      });
      list.querySelectorAll('[data-star]').forEach((b) => (b.onclick = async (e) => {
        e.stopPropagation();
        const on = await A.togglePantau(b.dataset.star);
        b.classList.toggle('on', on);
        b.innerHTML = icon(on ? 'starF' : 'star');
        b.setAttribute('aria-pressed', String(on));
      }));
    }
    async function drawMap(body) {
      body.innerHTML = `<div class="mapwrap"><div id="map" style="height:100%"></div><div class="map-loading" id="ml">Memuat peta…</div>
        <div class="map-legend"><span><i style="background:var(--m-map)"></i>Tinggi</span><span><i style="background:var(--k-map)"></i>Waspada</span><span><i style="background:var(--h-map)"></i>Rendah</span></div></div>
        <p class="small muted" style="margin-top:10px">Ketuk kecamatan untuk detail. Kepulauan Seribu ada di tab Daftar.</p>`;
      let L;
      try { L = await ui.loadLeaflet(); } catch (e) { body.querySelector('#ml').textContent = 'Peta gagal dimuat. Periksa koneksi internet.'; return; }
      if (!body.isConnected || JL.view !== 'map') return;
      body.querySelector('#ml').remove();
      const map = L.map(body.querySelector('#map'), { zoomControl: false, attributionControl: true, zoomSnap: 0.25 });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16, maxZoom: 18, opacity: 0.5, attribution: 'Esri, HERE, Garmin, © OpenStreetMap',
      }).addTo(map);
      const geo = { type: 'FeatureCollection', features: window.RADENSA_GEO.features.filter((f) => f.properties.kab_kode !== 6) };
      const mine = A.myKec();
      const style = (f) => ({ fillColor: ui.zoneHex(zoneOf(f.properties.kode_kec)), fillOpacity: 0.92, color: f.properties.kode_kec === mine ? '#1f1517' : '#fff', weight: f.properties.kode_kec === mine ? 2.6 : 1.2 });
      const layer = L.geoJSON(geo, {
        style,
        onEachFeature: (f, l) => {
          l.bindTooltip(f.properties.nama, { direction: 'center', className: 'kt' });
          l.on('click', () => preview(f.properties.kode_kec));
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [8, 8] });
      mapApi = { refresh: () => layer.setStyle(style) };
      setTimeout(() => map.invalidateSize(), 50);
    }
    function preview(kode) {
      const k = D.by.get(kode);
      const on = A.mode() && A.isPantau(kode);
      const s = ui.sheet({
        title: k.nm,
        sub: `${k.kota}${kode === A.myKec() ? ' · kecamatanmu' : ''}`,
        html: `${ui.riskCard(kode, { wk: curWk(), link: false, compact: true })}
          <div class="actions"><a class="btn primary" href="#/kec/${kode}">Lihat detail</a>
          ${A.mode() ? `<button class="btn outline" id="pv-star">${icon(on ? 'starF' : 'star')}${on ? 'Dipantau' : 'Pantau'}</button>` : `<a class="btn outline" href="#/daftar">Daftar</a>`}</div>`,
      });
      s.el.querySelector('a.btn.primary').onclick = () => s.close();
      const st = s.el.querySelector('#pv-star');
      if (st) st.onclick = async () => { const v = await A.togglePantau(kode); st.innerHTML = `${icon(v ? 'starF' : 'star')}${v ? 'Dipantau' : 'Pantau'}`; };
    }

    // Muat kasus tercatat untuk jendela historis (satu permintaan), lalu gambar
    drawSeg();
    drawControls();
    const need = wks.some((w) => w.src === 'obs' && !W.hist.has(w.idx));
    if (!need) { drawBody(); return; }
    const body = root.querySelector('#body');
    const attempt = () => {
      body.innerHTML = '<div class="card empty-card"><span class="spin dark"></span>Memuat data historis…</div>';
      W.data.loadWindow(wks).then(() => { if (root.isConnected) { drawControls(); drawBody(); } })
        .catch(() => {
          if (!root.isConnected) return;
          body.innerHTML = `<div class="card empty-card"><b>Data historis belum bisa dimuat</b>Periksa koneksi internetmu.<br><button class="btn outline" id="retry" style="margin-top:12px">Coba lagi</button></div>`;
          body.querySelector('#retry').onclick = attempt;
        });
    };
    attempt();
  };

  // =================================================================
  // Prakiraan
  // =================================================================
  const PK = { kode: null };
  S.prakiraan = (root) => {
    const D = W.D, A = app();
    root.className = 'screen';
    const kode = PK.kode && D.by.has(PK.kode) ? PK.kode : A.myKec() || D.kec[0].kode;
    const k = D.by.get(kode);
    const pant = A.pantauan().filter((x) => D.by.has(x) && x !== kode);

    root.innerHTML = `
      ${ui.header()}
      ${statusBanners()}
      <div class="title"><h1>Prakiraan</h1><p>Risiko DBD minggu ini dan ${Math.max(0, D.ahead.length - 1)} minggu berikutnya.</p></div>
      <div class="ctl">${locPill(k)}${ui.methodPill('mp')}</div>
      <section class="sec">
        <div class="sec-h"><h2><i>${icon('chart')}</i>Perkiraan Kasus</h2></div>
        <div class="card">${ui.fiveWeeks(kode)}</div>
      </section>
      <section class="sec">
        <div class="sec-h"><h2><i>${icon('calendar')}</i>Per Minggu</h2></div>
        <div class="card wk-list">${D.ahead.map((i) => {
          const z = D.zone(kode, i), w = D.weeks[i];
          return `<div class="wk ${w.d === 0 ? 'now' : ''}"><div class="d"><b>W${w.w}</b><span>${esc(w.range)}</span></div>
            <div class="t"><b>${esc(W.kasusText(D.pred(kode, i)))}</b></div>${ui.pill(z)}</div>`;
        }).join('')}</div>
      </section>
      <section class="sec">
        <div class="sec-h"><h2><i>${icon('activity')}</i>Kasus Mingguan</h2></div>
        <div class="card pad"><div id="chart"><p class="muted small" style="padding:30px 0;text-align:center">Memuat grafik…</p></div></div>
      </section>
      ${pant.length ? `<section class="sec"><div class="sec-h"><h2><i>${icon('star')}</i>Bandingkan</h2></div>
        <div class="card rows">${pant.map((x) => {
          const kk = D.by.get(x), zz = D.zone(x);
          return `<a class="row" href="#/kec/${x}"><span class="zb ${zz ? 'z-' + zz : ''}"></span><span class="t"><b>${esc(kk.nm)}</b><span>${esc(kk.kota)} · ${W.kasusText(D.pred(x))}</span></span>${ui.pill(zz)}${icon('chev', 'chev')}</a>`;
        }).join('')}</div></section>` : ''}
      ${metaFoot()}`;

    ui.wireHeader(root);
    root.querySelector('#loc').onclick = () => ui.kecPicker({ selected: kode, title: 'Lihat prakiraan untuk', onPick: (kk) => { PK.kode = kk; S.prakiraan(root); } });
    root.querySelector('#mp').onclick = () => ui.methodSheet(() => S.prakiraan(root));
    W.data.recent(kode).then((rec) => { const el = root.querySelector('#chart'); if (el) el.innerHTML = ui.chart(kode, rec); })
      .catch(() => { const el = root.querySelector('#chart'); if (el) el.innerHTML = ui.chart(kode, []); });
  };

  // =================================================================
  // Detail kecamatan
  // =================================================================
  S.kec = (root, params) => {
    const D = W.D, A = app();
    const kode = params[0];
    const k = D.by.get(kode);
    root.className = A.mode() ? 'screen' : 'screen no-nav';
    if (!k) {
      root.innerHTML = `<div class="topbar">${backBtn('#/')}<h1>Tidak ditemukan</h1></div><div class="card empty-card"><b>Kecamatan tidak ditemukan</b>Tautan mungkin salah.<br><a class="btn primary" href="#/">Ke beranda</a></div>`;
      wireBack(root);
      return;
    }
    const z = D.zone(kode), band = D.bands(kode, D.weeks[D.ci].w);
    const zE = D.zone(kode, D.ci, 'ewars'), zC = D.zone(kode, D.ci, 'ec');
    const mine = A.myKec() === kode;
    const steps = z ? W.STEPS[z] : [];
    const nbs = (D.nb.get(kode) || []).map((c) => D.by.get(c)).filter(Boolean);
    const pant = A.mode() && A.isPantau(kode);

    root.innerHTML = `
      <div class="topbar">${backBtn(A.mode() ? '#/jelajah' : '#/selamat-datang')}<h1>${esc(k.nm)}</h1><button class="icon-btn" id="share" aria-label="Bagikan">${icon('share')}</button></div>
      ${statusBanners()}
      ${!A.mode() ? `<div class="banner">${icon('star')}<span>Daftar gratis untuk memantau kecamatanmu.</span><a class="btn primary" href="#/daftar">Daftar</a></div>` : ''}
      <div class="small muted" style="margin:-2px 0 4px 2px">${esc(k.kota)}${mine ? ' · kecamatanmu' : ''}</div>
      ${ui.riskCard(kode, { link: false })}
      <section class="sec"><div class="sec-h"><h2><i>${icon('chart')}</i>${D.ahead.length} Minggu ke Depan</h2></div><div class="card">${ui.fiveWeeks(kode)}</div></section>
      <section class="sec"><div class="sec-h"><h2><i>${icon('activity')}</i>Kasus Mingguan</h2></div>
        <div class="card pad"><div id="chart"><p class="muted small" style="padding:30px 0;text-align:center">Memuat grafik…</p></div>
        ${band ? `<div class="normal">${W.method === 'ec' ? `Biasanya di minggu ke-${D.weeks[D.ci].w}, ${esc(k.nm)}` : `Normal di ${esc(k.nm)}`}: <b>${band.low < 1 ? 'hampir tidak ada kasus' : `sampai ${Math.round(band.low)} kasus`}</b> per minggu. Di atas <b>${band.high < 1 ? '1 kasus' : Math.round(band.high) + ' kasus'}</b> dianggap tinggi.</div>` : ''}</div>
      </section>
      <section class="sec"><div class="sec-h"><h2><i>${icon('layers')}</i>Dua Cara Menilai</h2></div>
        <div class="card rows">${['ewars', 'ec'].map((m) => { const zz = m === 'ewars' ? zE : zC; return `<button class="row" data-m="${m}" type="button"><span class="zb ${zz ? 'z-' + zz : ''}"></span><span class="t"><b>${esc(W.METHODS[m].name)}${W.method === m ? ' <span class="small muted">· dipakai</span>' : ''}</b><span>${esc(W.METHODS[m].one)}</span></span>${ui.pill(zz)}</button>`; }).join('')}</div>
        <p class="small muted" style="margin-top:8px">${zE && zC && zE !== zC ? 'Hasilnya berbeda minggu ini. Itu wajar: satu membandingkan dengan sepanjang tahun, satunya dengan minggu yang sama.' : 'Kedua cara memberi hasil yang sama minggu ini.'} Ketuk untuk memakai salah satunya.</p></section>
      ${steps.length ? `<section class="sec"><div class="sec-h"><h2><i>${icon('shield')}</i>Yang Dianjurkan</h2><a class="link" href="#/panduan">Lengkap${icon('chev')}</a></div>
        <div class="card rows">${steps.map((r) => `<div class="row" style="align-items:flex-start;cursor:default"><span style="color:var(--brand);margin-top:2px">${icon(r.icon)}</span><span class="t"><b style="white-space:normal">${esc(r.judul)}${r.tag ? `<em class="stag ${r.tag}">${W.STEP_TAG[r.tag]}</em>` : ''}</b><span style="display:block;color:var(--ink-2);font-size:14px;margin-top:2px">${esc(r.desc)}</span></span></div>`).join('')}</div></section>` : ''}
      ${nbs.length ? `<section class="sec"><div class="sec-h"><h2><i>${icon('layers')}</i>Kecamatan Sekitar</h2></div>
        <div class="nb-wrap">${nbs.map((n) => `<a class="nb" href="#/kec/${n.kode}" style="text-decoration:none;color:inherit"><i class="${D.zone(n.kode) ? 'z-' + D.zone(n.kode) : ''}"></i>${esc(n.nm)}</a>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">Nyamuk tidak mengenal batas wilayah, jadi risiko sekitar ikut diperhitungkan.</p></section>` : ''}
      <div class="actions">
        ${A.mode() ? `<button class="btn outline" id="star">${icon(pant ? 'starF' : 'star')}${pant ? 'Dipantau' : 'Pantau'}</button>
        ${mine ? '<button class="btn outline" disabled>Kecamatanmu</button>' : '<button class="btn outline" id="mine">Jadikan milikku</button>'}`
        : '<a class="btn outline full" href="#/daftar" id="reg">Daftar &amp; pantau kecamatan ini</a>'}
        <button class="btn wa full" id="wa">${icon('share')}Bagikan ke WhatsApp</button>
      </div>
      ${metaFoot()}`;
    wireBack(root);

    W.data.recent(kode).then((rec) => {
      const el = root.querySelector('#chart');
      if (el) el.innerHTML = ui.chart(kode, rec);
    }).catch(() => {
      const el = root.querySelector('#chart');
      if (el) el.innerHTML = ui.chart(kode, []);
    });

    const shareText = () => {
      const url = /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}#/kec/${kode}` : '';
      return { text: `Info DBD ${k.nm} (${D.weekLabel(D.ci).toLowerCase()}, ${D.weeks[D.ci].range}): ${z ? Z[z].label.toUpperCase() : '-'}. ${ui.sentence(kode, D.ci)} Cek kecamatanmu di DENGUARD${url ? ': ' + url : '.'}`, url };
    };
    root.querySelector('#wa').onclick = () => { window.open('https://wa.me/?text=' + encodeURIComponent(shareText().text), '_blank', 'noopener'); };
    root.querySelector('#share').onclick = async () => {
      const t = shareText();
      if (navigator.share) { try { await navigator.share({ title: `Info DBD ${k.nm}`, text: t.text }); } catch (e) { /* dibatalkan */ } }
      else { try { await navigator.clipboard.writeText(t.text); ui.toast('Teks disalin. Tempel di WhatsApp atau media sosial.'); } catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(t.text), '_blank', 'noopener'); } }
    };
    const reg = root.querySelector('#reg');
    if (reg) reg.onclick = () => { W.draft.kode = kode; };
    const st = root.querySelector('#star');
    if (st) st.onclick = async () => { const v = await A.togglePantau(kode); st.innerHTML = `${icon(v ? 'starF' : 'star')}${v ? 'Dipantau' : 'Pantau'}`; };
    root.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
      if (b.dataset.m === W.method) return;
      W.setMethod(b.dataset.m);
      ui.toast(`Metode: ${W.METHODS[W.method].name}`);
      S.kec(root, params);
    }));
    const mn = root.querySelector('#mine');
    if (mn) mn.onclick = async () => {
      ui.btnBusy(mn, true);
      try { await A.setMyKec(kode); ui.toast(`${k.nm} sekarang kecamatanmu.`); S.kec(root, params); }
      catch (e) { ui.btnBusy(mn, false); ui.toast(W.authError(e)); }
    };
  };

  // =================================================================
  // Cegah (panduan + langkah minggu ini)
  // =================================================================
  S.panduan = (root, params) => {
    const D = W.D, A = app();
    const open = params[0];
    root.className = A.mode() ? 'screen' : 'screen no-nav';
    const kode = A.myKec();
    const z = kode ? D.zone(kode) : null;
    const k = kode ? D.by.get(kode) : null;
    const wk = D.weeks[D.ci];
    const todoKey = kode && wk ? `radensa-todo-${wk.y}-${wk.w}-${kode}` : null;
    // Langkah mengikuti zona kecamatanmu: makin tinggi, makin banyak dan ketat
    const recs = z ? W.STEPS[z] : [];
    const nUp = recs.filter((r) => r.tag === 'up').length, nNew = recs.filter((r) => r.tag === 'new').length;
    const lvl = !z ? '' : z === 'Hijau'
      ? 'Risiko rendah, jadi cukup pencegahan rutin.'
      : `Karena risikonya ${Z[z].short.toLowerCase()}, langkah rutin diperketat: ${nUp} ditingkatkan dan ${nNew} tambahan.`;

    root.innerHTML = `
      ${A.mode() ? ui.header() : `<div class="topbar">${backBtn('#/selamat-datang')}</div>`}
      <div class="title"><h1>Cegah DBD</h1><p>Langkah mudah untuk keluarga dan lingkunganmu.</p></div>
      ${recs.length ? `<section class="sec" style="margin-top:6px">
        <div class="sec-h"><h2><i>${icon('check')}</i>Langkah Minggu Ini</h2><span class="progress" id="prog"></span></div>
        <div class="lvl z-${z}"><span class="pill z-${z}">${esc(Z[z].short)}</span><span class="lv-t"><b>${esc(k.nm)}</b>${esc(lvl)}</span></div>
        <div class="card todo" id="todo">${recs.map((r) => `
          <div class="todo-item" data-id="${esc(r.id)}" role="checkbox" tabindex="0" aria-checked="false">
            <span class="ck">${icon('check')}</span><div><b>${esc(r.judul)}${r.tag ? `<em class="stag ${r.tag}">${W.STEP_TAG[r.tag]}</em>` : ''}</b><p>${esc(r.desc)}</p></div>
          </div>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">Langkah berubah otomatis mengikuti tingkat risiko kecamatanmu tiap minggu.</p>
      </section>` : `<div class="card pad" style="margin-top:6px;display:flex;gap:14px;align-items:center"><span style="flex:1;font-size:14.5px;color:var(--ink-2)">Pilih kecamatanmu supaya langkah pencegahan disesuaikan dengan tingkat risikonya.</span><a class="btn primary btn-sm" href="${A.mode() ? '#/profil' : '#/selamat-datang'}">${A.mode() ? 'Pilih' : 'Mulai'}</a></div>`}
      <section class="sec">
        <div class="sec-h"><h2><i>${icon('book')}</i>Panduan</h2></div>
        ${W.GUIDE.map((g) => `<details class="acc ${g.danger ? 'danger' : ''}" id="g-${g.id}" ${(open ? open === g.id : g.open) ? 'open' : ''}>
          <summary><span class="ic">${icon(g.icon)}</span>${esc(g.title)}${icon('chev', 'ar')}</summary>
          <div class="body">${typeof g.body === 'function' ? g.body() : g.body}</div></details>`).join('')}
      </section>`;
    wireBack(root);
    ui.wireHeader(root);
    if (open) setTimeout(() => root.querySelector('#g-' + open)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);

    if (todoKey && recs.length) {
      const done = new Set(store.get(todoKey, []));
      const sync = () => {
        root.querySelectorAll('.todo-item').forEach((el) => {
          const on = done.has(el.dataset.id);
          el.classList.toggle('done', on);
          el.setAttribute('aria-checked', String(on));
        });
        const n = recs.filter((r) => done.has(r.id)).length;
        const p = root.querySelector('#prog');
        if (p) p.innerHTML = `${n}/${recs.length} <i style="--p:${(n / recs.length) * 100}%"></i>`;
      };
      root.querySelectorAll('.todo-item').forEach((el) => {
        const toggle = () => {
          const id = el.dataset.id;
          if (done.has(id)) done.delete(id); else done.add(id);
          store.set(todoKey, [...done]);
          sync();
          if (recs.every((r) => done.has(r.id))) ui.toast('Mantap! Semua langkah minggu ini sudah dilakukan.');
        };
        el.onclick = toggle;
        el.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
      });
      sync();
    }
  };

  // =================================================================
  // Profil
  // =================================================================
  S.profil = (root) => {
    const D = W.D, A = app(), st = W.S;
    root.className = 'screen';
    const kode = A.myKec(), k = kode ? D.by.get(kode) : null;
    const pant = A.pantauan().filter((x) => D.by.has(x));
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const canInstall = !standalone && (W.installEvt || isIos);

    const rows = `
      <button class="set-row" id="r-kec"><span class="ic">${icon('pin')}</span><span class="t"><b>Kecamatan saya</b><span>${k ? `${esc(k.nm)} · ${esc(k.kota)}` : 'Belum dipilih'}</span></span>${icon('chev', 'chev')}</button>
      ${A.mode() === 'user' ? `<button class="set-row" id="r-nama"><span class="ic">${icon('edit')}</span><span class="t"><b>Nama</b><span>${esc(A.name() || 'Belum diisi')}</span></span>${icon('chev', 'chev')}</button>` : ''}
      <button class="set-row" id="r-pant"><span class="ic">${icon('star')}</span><span class="t"><b>Kecamatan dipantau</b><span>${pant.length ? `${pant.length} kecamatan` : 'Belum ada'}</span></span>${icon('chev', 'chev')}</button>`;
    const more = `
        <button class="set-row" id="r-meth"><span class="ic">${icon('layers')}</span><span class="t"><b>Cara menilai risiko</b><span>${esc(W.METHODS[W.method].name)} · ${esc(W.METHODS[W.method].tag)}</span></span>${icon('chev', 'chev')}</button>
        ${canInstall ? `<button class="set-row" id="r-inst"><span class="ic">${icon('download')}</span><span class="t"><b>Pasang di layar utama</b><span>Buka DENGUARD seperti aplikasi</span></span>${icon('chev', 'chev')}</button>` : ''}
        <a class="set-row" href="#/panduan/darurat"><span class="ic">${icon('phone')}</span><span class="t"><b>Nomor darurat</b><span>112 · 119</span></span>${icon('chev', 'chev')}</a>
        <a class="set-row" href="#/panduan/tentang"><span class="ic">${icon('info')}</span><span class="t"><b>Tentang DENGUARD</b><span>Cara kerja &amp; sumber data</span></span>${icon('chev', 'chev')}</a>`;

    root.innerHTML = A.mode() === 'user' ? `
      <div class="topbar">${backBtn('#/beranda')}<h1>Profil</h1></div>
      <div class="prof-head"><span class="avatar lg">${esc(fmt.initials(A.name()))}</span><h1>${esc(A.name() || 'Warga DENGUARD')}</h1><p>Akun DENGUARD Warga</p></div>
      <div class="card set">${rows}</div>
      <div class="card set" style="margin-top:14px">${more}</div>
      <button class="btn danger block" id="logout" style="margin-top:20px">${icon('logout')}Keluar</button>
      ${metaFoot()}` : `
      <div class="topbar">${backBtn('#/beranda')}<h1>Profil</h1></div>
      <div class="prof-head"><span class="avatar lg" style="background:var(--ink-3);box-shadow:none">?</span><h1>Mode tamu</h1><p>Pilihanmu hanya tersimpan di HP ini.</p></div>
      <div class="card pad" style="margin-bottom:14px"><b style="display:block;margin-bottom:4px">Simpan pilihanmu dengan akun</b><span class="small muted">Gratis. Kecamatan dan pantauanmu tetap ada walau ganti HP.</span>
        <div class="actions"><a class="btn primary" href="#/daftar">Daftar</a><a class="btn outline" href="#/masuk">Masuk</a></div></div>
      <div class="card set">${rows}</div>
      <div class="card set" style="margin-top:14px">${more}</div>
      <button class="btn outline block" id="endguest" style="margin-top:20px">Keluar dari mode tamu</button>
      ${metaFoot()}`;
    wireBack(root);

    root.querySelector('#r-kec').onclick = () => ui.kecPicker({
      selected: kode, title: 'Kecamatan tempat tinggal',
      onPick: async (kk) => { try { await A.setMyKec(kk); ui.toast('Kecamatan diperbarui.'); S.profil(root); } catch (e) { ui.toast(W.authError(e)); } },
    });
    root.querySelector('#r-meth').onclick = () => ui.methodSheet(() => S.profil(root));
    const rn = root.querySelector('#r-nama');
    if (rn) rn.onclick = () => {
      const s = ui.sheet({ title: 'Ubah nama', html: `<div data-err></div><div class="field"><input class="input" id="nn" maxlength="60" autocomplete="name" value="${esc(A.name())}"></div><button class="btn primary block" id="ns">Simpan</button>` });
      const b = s.el.querySelector('#ns');
      b.onclick = async () => {
        const v = s.el.querySelector('#nn').value.trim();
        if (v.length < 2) { s.el.querySelector('[data-err]').innerHTML = errBox('Nama minimal 2 huruf.'); return; }
        ui.btnBusy(b, true);
        try { await W.auth.updateProfile(st.user.id, { nama: v }); st.profile = { ...st.profile, nama: v }; s.close(); ui.toast('Nama diperbarui.'); S.profil(root); }
        catch (e) { ui.btnBusy(b, false); s.el.querySelector('[data-err]').innerHTML = errBox(W.authError(e)); }
      };
    };
    root.querySelector('#r-pant').onclick = () => {
      const list = A.pantauan().filter((x) => D.by.has(x));
      const s = ui.sheet({
        title: 'Kecamatan dipantau', flush: true,
        html: list.length ? `<div class="rows">${list.map((x) => `<div class="row"><span class="zb ${D.zone(x) ? 'z-' + D.zone(x) : ''}"></span><span class="t"><b>${esc(D.by.get(x).nm)}</b><span>${esc(D.by.get(x).kota)}</span></span><button class="btn btn-sm danger" data-rm="${x}">Hapus</button></div>`).join('')}</div>
          <div style="padding:14px 20px"><a class="btn outline block" href="#/jelajah">${icon('star')}Tambah dari Peta</a></div>`
          : `<div class="empty-card"><b>Belum ada kecamatan dipantau</b>Ketuk bintang di halaman Peta.<br><a class="btn primary" href="#/jelajah">Buka Peta</a></div>`,
        onClose: () => { if (root.isConnected && location.hash === '#/profil') S.profil(root); },
      });
      s.el.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => s.close()));
      s.el.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = async () => { await A.togglePantau(b.dataset.rm); b.closest('.row').remove(); }));
    };
    const ri = root.querySelector('#r-inst');
    if (ri) ri.onclick = async () => {
      if (W.installEvt) { W.installEvt.prompt(); const r = await W.installEvt.userChoice; if (r.outcome === 'accepted') ui.toast('DENGUARD dipasang di layar utama.'); W.installEvt = null; S.profil(root); }
      else ui.sheet({ title: 'Pasang di iPhone', html: `<ol style="margin:0;padding-left:20px;display:grid;gap:10px;color:var(--ink-2)"><li>Ketuk tombol <b>Bagikan</b> di bawah layar Safari.</li><li>Pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>. Ikon DENGUARD akan muncul di layar utama.</li></ol>` });
    };
    const lo = root.querySelector('#logout');
    if (lo) lo.onclick = () => {
      const s = ui.sheet({ title: 'Keluar dari akun?', html: `<p class="muted" style="margin-bottom:16px">Kamu bisa masuk lagi kapan saja dengan nama dan kata sandimu.</p><div class="btn-row"><button class="btn danger block" id="yes">Ya, keluar</button><button class="btn outline block" id="no">Batal</button></div>` });
      s.el.querySelector('#no').onclick = s.close;
      s.el.querySelector('#yes').onclick = async () => { s.close(); await A.signOut(); location.hash = '#/selamat-datang'; };
    };
    const eg = root.querySelector('#endguest');
    if (eg) eg.onclick = () => { A.endGuest(); location.hash = '#/selamat-datang'; };
  };
})();
