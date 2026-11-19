(function () {
  const W = window.W;
  const DAY = 86400000, WEEK = 7 * DAY;

  // Kalender epidemiologi MMWR (Minggu–Sabtu), port dari radensa/epiweek.py
  const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const cache = new Map();
  function yStart(y) {
    if (cache.has(y)) return cache.get(y);
    const jan1 = utc(y, 0, 1), sun = addDays(jan1, -jan1.getUTCDay());
    let res = null;
    for (const c of [sun, addDays(sun, 7)]) {
      let n = 0;
      for (let i = 0; i < 7; i++) { const d = addDays(c, i); if (d.getUTCFullYear() === y && d.getUTCMonth() === 0) n++; }
      if (n >= 4) { res = c; break; }
    }
    cache.set(y, res);
    return res;
  }
  const weekStart = (y, w) => addDays(yStart(y), 7 * (w - 1));
  const weekEnd = (y, w) => addDays(weekStart(y, w), 6);
  function dateToEpi(d) {
    const Y = d.getUTCFullYear();
    for (const y of [Y + 1, Y, Y - 1]) {
      const s = yStart(y);
      if (d >= s && d < yStart(y + 1)) return [y, Math.floor((d - s) / WEEK) + 1];
    }
    return null;
  }
  const EPOCH = utc(1970, 0, 4);
  const weekIdx = (y, w) => Math.round((weekStart(y, w) - EPOCH) / WEEK);
  function todayJkt() {
    const n = new Date(Date.now() + 7 * 3600000);
    return utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  }
  const idxToStart = (idx) => new Date(EPOCH.getTime() + idx * WEEK);
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const parseDay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? utc(+m[1], +m[2] - 1, +m[3]) : null; };
  W.epi = { weekStart, weekEnd, dateToEpi, weekIdx, todayJkt, idxToStart, isoDay, parseDay, DAY };

  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  W.fmt = {
    BLN,
    range(y, w) {
      const s = weekStart(y, w), e = weekEnd(y, w);
      if (s.getUTCMonth() === e.getUTCMonth()) return `${s.getUTCDate()}–${e.getUTCDate()} ${BLN[e.getUTCMonth()]}`;
      return `${s.getUTCDate()} ${BLN[s.getUTCMonth()]} – ${e.getUTCDate()} ${BLN[e.getUTCMonth()]}`;
    },
    dm(d) { return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]}`; },
    dmLong(d) { return `${d.getUTCDate()} ${BLN_P[d.getUTCMonth()]}`; },
    dmy(d) { return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
    // "W1-23" untuk minggu 1 tahun epi 2023
    wy(y, w) { return `W${w}-${String(y).slice(2)}`; },
    today() { const d = todayJkt(); return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BLN_P[d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
    wib(iso) {
      if (!iso) return '–';
      const d = new Date(new Date(iso).getTime() + 7 * 3600000);
      return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}.${String(d.getUTCMinutes()).padStart(2, '0')} WIB`;
    },
    kota(k) {
      if (!k) return '';
      if (k.toUpperCase() === 'KEPULAUAN SERIBU') return 'Kepulauan Seribu';
      return k.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    },
    initials(name) {
      const p = String(name || '').trim().split(/\s+/).filter(Boolean);
      return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    },
    first(name) { return String(name || '').trim().split(/\s+/)[0] || ''; },
  };

  // Bahasa awam untuk zona
  W.Z = {
    Hijau: { label: 'Risiko Rendah', short: 'Rendah', rank: 1, msg: 'masih dalam batas biasa', tip: 'Aman, tetap rutin kuras dan tutup tempat air.' },
    Kuning: { label: 'Waspada', short: 'Waspada', rank: 2, msg: 'lebih tinggi dari biasanya', tip: 'Tingkatkan pencegahan di rumah dan sekitar.' },
    Merah: { label: 'Risiko Tinggi', short: 'Tinggi', rank: 3, msg: 'jauh di atas biasanya', tip: 'Lakukan pencegahan sekarang dan waspadai demam.' },
  };
  W.kasusText = (v) => {
    if (v == null) return 'belum ada perkiraan';
    if (v < 0.5) return 'hampir tidak ada kasus';
    if (v < 1) return 'kurang dari 1 kasus';
    const r = Math.round(v);
    return `sekitar ${r} kasus`;
  };
  // Kasus yang benar-benar tercatat (bukan perkiraan)
  W.kasusObs = (n) => (n == null ? 'belum ada data' : n === 0 ? 'tidak ada kasus' : `${n} kasus`);

  W.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  W.$ = (s, r = document) => r.querySelector(s);
  W.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  W.store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penyimpanan penuh/diblokir */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };

  // Titik di dalam poligon (ray casting) untuk deteksi kecamatan dari GPS
  function inRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > pt[1]) !== (yj > pt[1])) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inPoly(pt, coords) {
    if (!inRing(pt, coords[0])) return false;
    for (let h = 1; h < coords.length; h++) if (inRing(pt, coords[h])) return false;
    return true;
  }
  // Nama -> "email" samaran untuk Supabase Auth (fase ini belum pakai email
  // asli; lihat W.auth.signUp). Tabrakan nama ditangani sebagai error saat daftar.
  W.usernameSlug = (nama) => {
    const slug = String(nama || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '').slice(0, 40);
    return slug || 'warga' + Math.floor(Math.random() * 1e6);
  };

  W.kecFromPoint = (lon, lat) => {
    for (const f of window.RADENSA_GEO.features) {
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      if (polys.some((p) => inPoly([lon, lat], p))) return f.properties.kode_kec;
    }
    return null;
  };

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 7h7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>',
    starF: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" fill="currentColor"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    locate: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    map: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4.5"/><path d="M12 17.5v.01"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/>',
    shieldCheck: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    siren: '<path d="M6 18v-6a6 6 0 0 1 12 0v6"/><path d="M4 21h16"/><path d="M12 3V2M4.2 6.2l-.7-.7M19.8 6.2l.7-.7"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z"/>',
    droplet: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3Z"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    megaphone: '<path d="M3 10v4l3 .5V9.5L3 10Z"/><path d="M6 9.5 18 5v14L6 14.5"/><path d="M8 15l1 5h3l-1-4.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 3.5h3.5l1.5 4-2 1.5a11 11 0 0 0 7 7l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.5v.5"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    search2: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    package: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    hospital: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M12 8v6M9 11h6"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    chart: '<rect x="3.5" y="12" width="4" height="8.5" rx="1"/><rect x="10" y="7" width="4" height="13.5" rx="1"/><rect x="16.5" y="3.5" width="4" height="17" rx="1"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>',
    arrUp: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    arrDown: '<path d="M7 7l10 10"/><path d="M17 8v9H8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  };
  W.icon = (n, cls = '') => `<svg class="${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.info}</svg>`;

  // Siluet nyamuk Aedes (mengikuti currentColor)
  W.mosq = (cls = '') => `<svg class="${cls}" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
    <g opacity=".3"><ellipse cx="60" cy="31" rx="23" ry="7.5" transform="rotate(-30 60 31)"/><ellipse cx="68" cy="39" rx="21" ry="6" transform="rotate(-9 68 39)"/></g>
    <path d="M27 37 8 24" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" fill="none"/>
    <circle cx="31" cy="39" r="6.6"/>
    <ellipse cx="46" cy="45" rx="11.5" ry="8.2" transform="rotate(-18 46 45)"/>
    <ellipse cx="69" cy="57" rx="20" ry="6.6" transform="rotate(27 69 57)"/>
    <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M40 51 30 65 19 85"/><path d="M46 53 42 71 35 91"/><path d="M53 52 57 69 67 87"/><path d="M29 33 23 23"/>
    </g></svg>`;
})();
