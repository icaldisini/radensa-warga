(function () {
  const W = window.W;
  const { store, ui } = W;
  const GUEST_KEY = 'radensa-guest';

  const S = (W.S = { user: null, profile: null, guest: store.get(GUEST_KEY, null) });
  W.draft = {};
  W.navDepth = 0;

  const app = (W.app = {
    mode: () => (S.user ? 'user' : S.guest ? 'guest' : null),
    myKec: () => (S.user ? S.profile?.kode_kec || S.user.user_metadata?.kode_kec || null : S.guest?.kode_kec || null),
    name: () => (S.user ? S.profile?.nama || S.user.user_metadata?.nama || '' : ''),
    pantauan: () => (S.user ? S.user.user_metadata?.pantauan || [] : S.guest?.pantauan || []),
    isPantau: (k) => app.pantauan().includes(k),

    async togglePantau(k) {
      const list = app.pantauan();
      const was = list.includes(k);
      const next = was ? list.filter((x) => x !== k) : [...list, k];
      if (S.user) {
        const prev = S.user.user_metadata;
        S.user.user_metadata = { ...prev, pantauan: next };
        try { await W.auth.setPantauan(next); }
        catch (e) { S.user.user_metadata = prev; ui.toast(W.authError(e)); return was; }
      } else if (S.guest) {
        S.guest.pantauan = next;
        store.set(GUEST_KEY, S.guest);
      }
      ui.toast(was ? 'Dihapus dari pantauan.' : 'Ditambahkan ke pantauan.');
      return !was;
    },
    async setMyKec(k) {
      if (S.user) {
        await W.auth.updateProfile(S.user.id, { kode_kec: k });
        S.profile = { ...S.profile, kode_kec: k };
        S.user.user_metadata = { ...S.user.user_metadata, kode_kec: k };
      } else {
        S.guest = { pantauan: [], ...(S.guest || {}), kode_kec: k };
        store.set(GUEST_KEY, S.guest);
      }
    },
    startGuest(k) { S.guest = { kode_kec: k, pantauan: [] }; store.set(GUEST_KEY, S.guest); },
    endGuest() { S.guest = null; store.del(GUEST_KEY); },

    async afterLogin(user) {
      S.user = user;
      S.profile = await W.auth.ensureProfile(user).catch(() => ({ nama: user.user_metadata?.nama, kode_kec: user.user_metadata?.kode_kec }));
      // Bawa pantauan dari mode tamu ke akun bila akun belum punya
      if (S.guest?.pantauan?.length && !(user.user_metadata?.pantauan || []).length) {
        try { await W.auth.setPantauan(S.guest.pantauan); S.user.user_metadata = { ...S.user.user_metadata, pantauan: S.guest.pantauan }; } catch (e) { /* abaikan */ }
      }
      if (!S.profile?.kode_kec && S.guest?.kode_kec) {
        try { await app.setMyKec(S.guest.kode_kec); } catch (e) { /* abaikan */ }
      }
      app.endGuest();
    },
    async signOut() {
      await W.auth.signOut();
      S.user = null;
      S.profile = null;
    },
  });

  // ---------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------
  //            layar         akses        tab aktif
  const ROUTES = {
    'selamat-datang': ['welcome', 'public'],
    daftar: ['daftar', 'auth'],
    masuk: ['masuk', 'auth'],
    beranda: ['beranda', 'app', 'beranda'],
    jelajah: ['jelajah', 'open', 'jelajah'],
    prakiraan: ['prakiraan', 'app', 'prakiraan'],
    kec: ['kec', 'open', 'jelajah'],
    panduan: ['panduan', 'open', 'panduan'],
    profil: ['profil', 'app', 'profil'],
  };

  let ready = false;
  function route() {
    if (!ready) return;
    const h = location.hash;
    const [name, ...params] = h.replace(/^#\/?/, '').split('/');
    const r = ROUTES[name];
    const mode = app.mode();
    const home = mode ? '#/beranda' : '#/selamat-datang';
    if (!r) return location.replace(home);
    if (r[1] === 'app' && !mode) return location.replace('#/selamat-datang');
    if (r[1] === 'auth' && S.user) return location.replace('#/beranda');
    if (r[1] === 'public' && mode) return location.replace('#/beranda');

    document.querySelectorAll('#sheet-root > *').forEach((n) => n.remove());
    document.body.style.overflow = '';
    const rootEl = document.getElementById('app');
    rootEl.innerHTML = '';
    const scr = document.createElement('div');
    scr.className = 'screen';
    rootEl.appendChild(scr);
    W.screens[r[0]](scr, params.map(decodeURIComponent));
    if (r[2] && mode) rootEl.insertAdjacentHTML('beforeend', ui.nav(r[2]));
    if (!mode) scr.classList.add('no-nav');
    window.scrollTo(0, 0);
  }
  W.route = route;
  window.addEventListener('hashchange', () => { W.navDepth++; route(); });

  function fatal(msg) {
    document.getElementById('app').innerHTML = `<div class="welcome" style="justify-content:center;text-align:center">
      <div class="big-icon" style="margin:0 auto 18px">${W.icon('info')}</div>
      <h1 class="auth-h">Belum bisa memuat data</h1>
      <p class="auth-p">${W.esc(msg)}</p>
      <button class="btn primary block" onclick="location.reload()">Coba lagi</button></div>`;
  }

  // ---------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------
  async function boot() {
    W.sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'SIGNED_OUT') { S.user = null; S.profile = null; }
      if (ev === 'USER_UPDATED' && session && S.user) S.user = { ...session.user, user_metadata: { ...session.user.user_metadata } };
    });

    // 1) data: tampilkan cache dulu, segarkan di belakang
    W.D = W.data.cached();
    const freshP = W.data.fresh();
    if (!W.D) {
      try { W.D = await freshP; } catch (e) { return fatal('Periksa koneksi internetmu, lalu coba lagi.'); }
    } else {
      freshP.then((d) => {
        const changed = d.at !== W.D.at;
        W.D = d;
        const wasOffline = W.offline;
        W.offline = false;
        const onForm = /daftar|masuk/.test(location.hash);
        if ((changed || wasOffline) && !onForm && !document.querySelector('#sheet-root > *')) route();
      }).catch(() => { W.offline = true; if (!/daftar|masuk/.test(location.hash)) route(); });
    }

    // 2) sesi login yang tersimpan
    try {
      const { data } = await W.sb.auth.getSession();
      if (data.session) await app.afterLogin(data.session.user);
    } catch (e) { /* lanjut sebagai tamu/anonim */ }

    ready = true;
    if (!location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + location.search + (app.mode() ? '#/beranda' : '#/selamat-datang'));
    route();
  }

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); W.installEvt = e; });
  window.addEventListener('online', () => { if (W.offline) W.data.fresh().then((d) => { W.D = d; W.offline = false; route(); }).catch(() => {}); });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
