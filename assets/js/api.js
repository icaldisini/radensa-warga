(function () {
  const W = window.W;
  const { epi, fmt } = W;

  const sb = window.supabase.createClient(W.config.supabaseUrl, W.config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'radensa-warga-auth' },
  });
  W.sb = sb;

  const CACHE_KEY = 'radensa-warga-data-v2';
  const METHOD_KEY = 'radensa-warga-metode';
  const emailOf = (nama) => `${W.usernameSlug(nama)}@${W.config.authEmailDomain}`;
  const ZONES = new Set(['Hijau', 'Kuning', 'Merah']);

  // ---------------------------------------------------------------
  // Metode zonasi: EWARS (persentil per kecamatan) atau Kanal Endemis
  // (rata-rata + 1 SD per minggu epidemiologi). Pilihan disimpan di HP.
  // ---------------------------------------------------------------
  W.METHODS = {
    ewars: {
      name: 'EWARS', tag: 'Persentil',
      what: 'Kasus dibandingkan dengan kasus <b>biasa</b> di kecamatan itu sepanjang tahun, sejak 2017.',
      rule: ['Rendah: sampai kasus tengah (median)', 'Waspada: di atas median sampai batas 75% minggu', 'Tinggi: di atas batas itu, termasuk 25% minggu terparah'],
      one: 'Dibanding kasus biasa kecamatan ini sepanjang tahun',
    },
    ec: {
      name: 'Kanal Endemis', tag: 'Musiman',
      what: 'Kasus dibandingkan dengan kasus <b>biasa di minggu yang sama</b> pada tahun-tahun sebelumnya, jadi pola musim hujan ikut diperhitungkan.',
      rule: ['Rendah: sampai rata-rata minggu itu', 'Waspada: sampai rata-rata ditambah 1 simpangan baku', 'Tinggi: di atas batas itu'],
      one: 'Dibanding kasus biasa di minggu yang sama tiap tahun',
    },
  };
  W.method = W.store.get(METHOD_KEY, 'ewars');
  if (!W.METHODS[W.method]) W.method = 'ewars';
  W.setMethod = (m) => { if (W.METHODS[m]) { W.method = m; W.store.set(METHOD_KEY, m); } };

  // Ambang Kanal Endemis per (kecamatan, minggu) -- tabel statis, dimuat sesuai kebutuhan.
  const EC = (W.EC = new Map());
  const ecRows = (rows) => { for (const r of rows || []) EC.set(`${r.kode_kec}|${r.minggu}`, { mean: r.ec_mean, up: r.ec_upper_yellow }); };
  // Kasus tercatat per minggu: idx minggu -> Map(kode -> {k, f})
  const HIST = (W.hist = new Map());

  // ---------------------------------------------------------------
  // Data publik (forecast, kecamatan, ambang) — cache di localStorage
  // ---------------------------------------------------------------
  async function fetchRaw() {
    const [kec, fc, thr, nb, last] = await Promise.all([
      sb.from('kecamatan').select('kode_kec,slug,nama_dinkes,kabupaten,kab_kode').order('kode_kec'),
      sb.from('forecast_terkini').select('kode_kec,tahun,minggu,horizon,kasus_pred,zona_ewars,zona_ec,dihitung_pada,model_versi'),
      sb.from('threshold_kecamatan').select('kode_kec,p50,p75,p90'),
      sb.from('kecamatan_tetangga').select('kode_kec,tetangga_kode').eq('tipe', 'queen'),
      sb.from('dbd_weekly').select('tahun,minggu').order('tahun', { ascending: false }).order('minggu', { ascending: false }).limit(1),
    ]);
    for (const r of [kec, fc, thr, nb]) if (r.error) throw r.error;
    // Ambang Kanal Endemis hanya untuk minggu-minggu perkiraan (kecil: ~220 baris)
    let ec = [];
    const wks = [...new Set(fc.data.map((r) => r.minggu))];
    if (wks.length) {
      const e = await sb.from('endemicity_channel').select('kode_kec,minggu,ec_mean,ec_upper_yellow').in('minggu', wks);
      if (!e.error) ec = e.data;
    }
    return { kec: kec.data, fc: fc.data, thr: thr.data, nb: nb.data, ec, last: last.error ? null : last.data?.[0] || null, savedAt: Date.now() };
  }

  function build(raw) {
    const D = { savedAt: raw.savedAt };
    D.kec = raw.kec.map((k) => ({ kode: k.kode_kec, nm: k.nama_dinkes, kota: fmt.kota(k.kabupaten), kab: k.kab_kode, slug: k.slug }))
      .sort((a, b) => a.kab - b.kab || a.nm.localeCompare(b.nm, 'id'));
    D.by = new Map(D.kec.map((k) => [k.kode, k]));
    D.kota = [...new Set(D.kec.map((k) => k.kota))];
    D.thr = new Map(raw.thr.map((t) => [t.kode_kec, t]));
    D.nb = new Map();
    for (const r of raw.nb) {
      if (!D.nb.has(r.kode_kec)) D.nb.set(r.kode_kec, []);
      D.nb.get(r.kode_kec).push(r.tetangga_kode);
    }
    const today = epi.todayJkt();
    const curIdx = epi.weekIdx(...epi.dateToEpi(today));
    const byH = new Map();
    for (const r of raw.fc) if (!byH.has(r.horizon)) byH.set(r.horizon, r);
    D.weeks = [...byH.values()].sort((a, b) => a.horizon - b.horizon).map((r) => {
      const idx = epi.weekIdx(r.tahun, r.minggu);
      return { h: r.horizon, y: r.tahun, w: r.minggu, idx, d: idx - curIdx, range: fmt.range(r.tahun, r.minggu), start: epi.weekStart(r.tahun, r.minggu), end: epi.weekEnd(r.tahun, r.minggu) };
    });
    D.fc = new Map(D.kec.map((k) => [k.kode, []]));
    for (const r of raw.fc) {
      const i = D.weeks.findIndex((w) => w.h === r.horizon);
      if (D.fc.has(r.kode_kec) && i >= 0) D.fc.get(r.kode_kec)[i] = r;
    }
    let ci = D.weeks.findIndex((w) => w.d === 0);
    D.stale = false;
    if (ci < 0) {
      if (D.weeks.length && D.weeks[D.weeks.length - 1].d < 0) { ci = D.weeks.length - 1; D.stale = true; }
      else ci = 0;
    }
    D.ci = ci;
    D.ahead = D.weeks.map((_, i) => i).filter((i) => i >= ci);
    D.at = raw.fc[0]?.dihitung_pada || null;
    ecRows(raw.ec);
    D.curIdx = curIdx;
    D.lastObs = raw.last ? epi.weekIdx(raw.last.tahun, raw.last.minggu) : -Infinity;
    D.lastObsWk = raw.last ? [raw.last.tahun, raw.last.minggu] : null;
    // Kecamatan dengan ambang < 1 kasus/minggu: perkiraan kecil pun dihitung tinggi
    D.lowBase = (kode) => (D.thr.get(kode)?.p75 ?? 1) < 1;
    const okZ = (z) => (ZONES.has(z) ? z : null);
    D.zone = (kode, i = D.ci, m = W.method) => {
      const r = D.fc.get(kode)?.[i];
      return r ? okZ(m === 'ec' ? r.zona_ec : r.zona_ewars) : null;
    };
    D.pred = (kode, i = D.ci) => D.fc.get(kode)?.[i]?.kasus_pred ?? null;
    D.weekLabel = (i) => {
      const d = D.weeks[i].d;
      return d === 0 ? 'Minggu ini' : d === 1 ? 'Minggu depan' : d === -1 ? 'Minggu lalu' : fmt.dm(D.weeks[i].start);
    };

    // Batas "biasa" dan "tinggi" untuk satu kecamatan di minggu epi tertentu, sesuai metode
    D.bands = (kode, w, m = W.method) => {
      if (m === 'ec') { const e = EC.get(`${kode}|${w}`); return e ? { low: e.mean, high: e.up } : null; }
      const t = D.thr.get(kode);
      return t ? { low: t.p50, high: t.p75 } : null;
    };
    // Zona dari jumlah kasus tercatat (aturan sama dengan pipeline: <= batas bawah Hijau, <= batas atas Kuning)
    D.zoneFromCases = (kode, w, kasus, m = W.method) => {
      if (kasus == null) return null;
      const b = D.bands(kode, w, m);
      if (!b) return null;
      return kasus <= b.low ? 'Hijau' : kasus <= b.high ? 'Kuning' : 'Merah';
    };

    // "Minggu tertentu": prakiraan (src fc), kasus tercatat (obs), atau belum ada keduanya (none)
    D.wk = (y, w) => {
      const idx = epi.weekIdx(y, w);
      const fi = D.weeks.findIndex((x) => x.idx === idx);
      const src = idx <= D.lastObs ? 'obs' : fi >= 0 ? 'fc' : 'none';
      return { y, w, idx, d: idx - curIdx, fi, src, start: epi.weekStart(y, w), end: epi.weekEnd(y, w), range: fmt.range(y, w) };
    };
    D.valueAt = (kode, wk) => (wk.src === 'fc' ? D.fc.get(kode)?.[wk.fi]?.kasus_pred ?? null : wk.src === 'obs' ? HIST.get(wk.idx)?.get(kode)?.k ?? null : null);
    D.zoneAt = (kode, wk, m = W.method) => (wk.src === 'fc' ? D.zone(kode, wk.fi, m) : wk.src === 'obs' ? D.zoneFromCases(kode, wk.w, D.valueAt(kode, wk), m) : null);
    D.finalAt = (kode, wk) => (wk.src === 'obs' ? HIST.get(wk.idx)?.get(kode)?.f !== false : true);
    return D;
  }

  W.data = {
    cached() { const raw = W.store.get(CACHE_KEY); return raw ? build(raw) : null; },
    async fresh() {
      const raw = await fetchRaw();
      W.store.set(CACHE_KEY, raw);
      return build(raw);
    },
  };

  // Muat kasus tercatat (dan ambang Kanal Endemis) untuk sekumpulan minggu.
  // wks: objek dari D.wk(); hanya yang src 'obs' dan belum di-cache yang diambil.
  W.data.loadWindow = async (wks) => {
    const need = wks.filter((w) => w.src === 'obs' && !HIST.has(w.idx));
    if (!need.length) return;
    const byYear = new Map();
    for (const w of need) { if (!byYear.has(w.y)) byYear.set(w.y, []); byYear.get(w.y).push(w.w); }
    const clause = [...byYear].map(([y, ws]) => `and(tahun.eq.${y},minggu.gte.${Math.min(...ws)},minggu.lte.${Math.max(...ws)})`).join(',');
    const weekNums = [...new Set(need.map((w) => w.w))];
    const [d, e] = await Promise.all([
      sb.from('dbd_weekly').select('kode_kec,tahun,minggu,kasus,is_final').or(clause),
      sb.from('endemicity_channel').select('kode_kec,minggu,ec_mean,ec_upper_yellow').in('minggu', weekNums),
    ]);
    if (d.error) throw d.error;
    if (!e.error) ecRows(e.data);
    for (const w of need) HIST.set(w.idx, new Map());
    for (const r of d.data) HIST.get(epi.weekIdx(r.tahun, r.minggu))?.set(r.kode_kec, { k: r.kasus, f: r.is_final });
  };

  const recentCache = new Map();
  W.data.recent = async (kode, n = 8) => {
    if (recentCache.has(kode)) return recentCache.get(kode);
    const { data, error } = await sb.from('dbd_weekly').select('tahun,minggu,kasus,is_final')
      .eq('kode_kec', kode).order('tahun', { ascending: false }).order('minggu', { ascending: false }).limit(n);
    if (error) throw error;
    const out = data.reverse();
    recentCache.set(kode, out);
    return out;
  };

  // ---------------------------------------------------------------
  // Auth & profil
  // ---------------------------------------------------------------
  async function ensureProfile(user) {
    const meta = user.user_metadata || {};
    const fallback = { nama: meta.nama || null, kode_kec: meta.kode_kec || null };
    const { data, error } = await sb.from('profiles').select('nama,kode_kec').eq('id', user.id).maybeSingle();
    if (error) return fallback;
    if (!data) {
      // Trigger SQL belum dipasang: buat profil dari metadata pendaftaran.
      const up = await sb.from('profiles').upsert({ id: user.id, ...fallback }).select('nama,kode_kec').maybeSingle();
      return up.data || fallback;
    }
    const patch = {};
    if (!data.nama && meta.nama) patch.nama = meta.nama;
    if (!data.kode_kec && meta.kode_kec) patch.kode_kec = meta.kode_kec;
    if (Object.keys(patch).length) await sb.from('profiles').update(patch).eq('id', user.id);
    return { ...data, ...patch };
  }

  W.auth = {
    ensureProfile,
    async signUp({ nama, password, kode_kec, pantauan = [] }) {
      const { data, error } = await sb.auth.signUp({
        email: emailOf(nama), password,
        options: { data: { nama, kode_kec, pantauan } },
      });
      if (error) throw error;
      // Nama (slug)-nya sudah dipakai orang lain -- Supabase mengembalikan
      // user tanpa identitas, bukan error, saat konfirmasi email nonaktif.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('User already registered');
      }
      return data;
    },
    async signIn(nama, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: emailOf(nama), password });
      if (error) throw error;
      return data;
    },
    async signOut() { await sb.auth.signOut(); },
    async updateProfile(uid, patch) {
      const { error } = await sb.from('profiles').upsert({ id: uid, ...patch });
      if (error) throw error;
      await sb.auth.updateUser({ data: patch });
    },
    async setPantauan(list) {
      const { error } = await sb.auth.updateUser({ data: { pantauan: list } });
      if (error) throw error;
    },
  };

  W.authError = (e) => {
    const m = String(e?.message || e || '').toLowerCase();
    if (m.includes('invalid login')) return 'Nama atau kata sandi salah.';
    if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return 'Nama ini sudah dipakai orang lain. Coba tambahkan kata lain, misalnya nama belakang.';
    if (e?.status === 429 || m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
    if (m.includes('weak') || m.includes('pwned')) return 'Kata sandi terlalu mudah ditebak. Pakai gabungan huruf dan angka.';
    if (m.includes('password') && (m.includes('at least') || m.includes('characters'))) return `Kata sandi minimal ${W.config.minPassword} karakter.`;
    if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Pendaftaran sedang ditutup.';
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) return 'Tidak ada koneksi internet. Periksa jaringanmu.';
    if (m.includes('confirm')) return 'Pendaftaran belum aktif. Minta admin mematikan "Confirm email" di Supabase.';
    return 'Terjadi kesalahan. Coba lagi sebentar lagi.';
  };
})();
