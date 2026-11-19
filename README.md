# DENGUARD Warga

Aplikasi web **DENGUARD** (*Dengue Geospatial Early Warning and Risk Detection*) untuk warga, khusus tampilan HP: cek risiko DBD di kecamatan DKI Jakarta untuk minggu ini dan 4 minggu ke depan, lengkap dengan langkah pencegahan.

Progressive Web App (PWA) statis (HTML, CSS, JavaScript), **tanpa build step**. Perkiraan dihitung oleh pipeline di repositori backend `radensa-agc` dan dibaca dari Supabase.

## Fitur

- **Beranda**: kartu risiko kecamatanmu (Rendah, Waspada, Tinggi), peta mini, grafik 5 minggu.
- **Peta**: daftar dan peta semua kecamatan. Bisa memilih tanggal historis sejak 2017 (kasus tercatat), atau melihat perkiraan 5 minggu.
- **Prakiraan**: rincian per minggu untuk satu kecamatan, dengan grafik kasus mingguan.
- **Cegah**: langkah pencegahan mingguan yang **menyesuaikan zona** (makin tinggi risiko, makin banyak dan ketat langkahnya), plus edukasi DBD.
- **Dua cara menilai risiko** yang bisa dipilih: EWARS (persentil) atau Kanal Endemis (musiman).
- Mode tamu, atau akun dengan **nama + kata sandi** (tanpa email; Supabase Auth memakai email samaran di balik layar).
- Bisa dipasang di layar utama dan tetap terbuka offline (hanya di HTTPS atau `localhost`).

## Menjalankan di komputer

Service worker hanya aktif di `http://localhost` atau HTTPS, jadi pakai server statis (bukan membuka berkas langsung):

```bash
python -m http.server 8000
# lalu buka http://localhost:8000 dan kecilkan jendela ke ukuran HP
```

## Konfigurasi

`assets/js/config.js`:

| Kunci | Fungsi |
|---|---|
| `supabaseUrl`, `anonKey` | Alamat proyek dan **kunci publik** (*publishable/anon*), dibatasi Row Level Security. |
| `authEmailDomain` | Domain email samaran untuk login nama + kata sandi. |
| `historyStart` | Awal data historis (2017-01-01). |

Di Supabase (Authentication):

1. Matikan **Confirm email** agar pendaftaran nama + kata sandi langsung aktif.
2. Isi **Site URL** dan **Redirect URLs** dengan alamat aplikasi setelah di-deploy.

> **Jangan pernah** menaruh kunci `service_role` di repositori ini.

## Deploy

Situs statis (mis. Netlify): *publish directory* = akar repositori, tanpa perintah build. **Naikkan `VERSION` di `sw.js` setiap rilis** supaya pengguna lama mendapat versi terbaru, bukan cache lama.

## Catatan

- Minggu memakai **minggu epidemiologi MMWR** (Minggu–Sabtu), sama dengan Dinkes DKI.
- Kecamatan dengan kasus sangat jarang (mis. Kepulauan Seribu) bisa tampil "Risiko Tinggi" walau perkiraan di bawah 1 kasus, karena ambang historisnya di bawah 1 kasus. Aplikasi memberi keterangan di tempat itu.
- Frekuensi langkah yang dinaikkan di zona Waspada dan Tinggi adalah kebijakan kehati-hatian DENGUARD; dasarnya pedoman PSN 3M Plus Kemenkes RI dan panduan dengue WHO.

## Struktur

```
index.html
manifest.webmanifest
sw.js            service worker (cache + offline)
assets/
  css/app.css
  js/            config, util, content, api, ui, screens, app
data/            batas 44 kecamatan (GeoJSON)
icons/           logo dan ikon aplikasi
```

DENGUARD adalah alat bantu kewaspadaan, bukan diagnosis. Bila sakit, segera periksa ke fasilitas kesehatan.
