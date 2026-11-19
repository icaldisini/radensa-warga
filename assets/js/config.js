window.W = window.W || {};

// Kunci publik (publishable/anon) — aman di frontend karena dibatasi RLS.
W.config = {
  supabaseUrl: 'https://tawdmkdkrswlbiylgdxu.supabase.co',
  anonKey: 'sb_publishable_Syyaa8VK74hH09p73Ach2A_-RHKo39U',
  minPassword: 8,
  // Awal data kasus DBD di Supabase (minggu epidemiologi 1 tahun 2017).
  historyStart: '2017-01-01',
  // Fase seleksi nasional: login pakai Nama + Kata Sandi saja (tanpa email).
  // Supabase Auth tetap butuh "email" di baliknya, jadi dibuat email samaran
  // dari slug nama di domain ini -- TIDAK PERNAH dikirimi apa pun.
  // WAJIB matikan "Confirm email" di Supabase Auth supaya akun bisa aktif.
  // Nanti kalau sudah lolos ke Singapura dan mau pakai email asli, ganti
  // pendekatan ini di W.auth.signUp/signIn (lihat api.js) dan aktifkan lagi
  // alur konfirmasi email + lupa kata sandi.
  authEmailDomain: 'akun.radensa.app',
};
