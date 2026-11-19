(function () {
  const W = window.W;

  // Langkah mingguan yang BERTINGKAT menurut zona. Zona lebih tinggi = semua langkah
  // zona di bawahnya (sebagian dengan frekuensi lebih sering) ditambah langkah baru.
  // tag: 'up' = ditingkatkan dari zona sebelumnya, 'new' = langkah tambahan.
  // Dasar: pedoman PSN 3M Plus Kemenkes RI dan panduan dengue WHO. Frekuensi yang
  // dinaikkan di zona Waspada/Tinggi adalah kebijakan DENGUARD, bukan angka baku Kemenkes.
  const S = (id, icon, judul, desc, tag = null) => ({ id, icon, judul, desc, tag });
  W.STEPS = {
    Hijau: [
      S('psn', 'droplet', 'PSN 3M Plus seminggu sekali', 'Kuras bak mandi dan tempat air, tutup rapat, dan singkirkan barang bekas penampung air. Cukup 15 menit.'),
      S('jentik', 'search', 'Cek jentik di rumah', 'Lihat bak mandi, vas bunga, tatakan dispenser, dan talang air. Jentik terlihat seperti cacing kecil yang bergerak.'),
      S('info', 'calendar', 'Pantau info tiap minggu', 'Risiko bisa berubah cepat saat musim hujan. Buka DENGUARD seminggu sekali.'),
    ],
    Kuning: [
      S('psn', 'droplet', 'PSN 3M Plus dua kali seminggu', 'Dari telur sampai nyamuk dewasa butuh sekitar 7–10 hari. Sering menguras memutus siklusnya. Sikat dinding bak, jangan hanya membuang airnya.', 'up'),
      S('jentik', 'search', 'Cek jentik dua kali seminggu', 'Periksa juga tempat yang sering terlupa: dispenser, pot, ban bekas, dan penampung air AC atau kulkas.', 'up'),
      S('losion', 'shield', 'Pakai losion antinyamuk pagi dan sore', 'Nyamuk DBD menggigit di siang hari, paling aktif pagi dan sore. Lindungi anak-anak lebih dulu.', 'new'),
      S('rt', 'users', 'Ajak tetangga kerja bakti', 'Nyamuk bisa terbang dari rumah tetangga. Bersihkan lingkungan RT bersama-sama.', 'new'),
      S('demam', 'thermo', 'Demam lebih dari 2 hari? Periksa', 'Datang ke Puskesmas untuk pemeriksaan. Jangan menunggu sampai lemas.', 'new'),
      S('info', 'calendar', 'Pantau info dua kali seminggu', 'Buka DENGUARD di awal dan tengah minggu untuk melihat perubahan risiko.', 'up'),
    ],
    Merah: [
      S('psn', 'droplet', 'PSN 3M Plus dua kali seminggu', 'Kuras, sikat dinding bak, tutup rapat, dan singkirkan genangan. Jangan ada tempat air yang terlewat.', 'up'),
      S('serentak', 'users', 'PSN serentak bersama RT/RW', 'Kasus diperkirakan tinggi. Bersihkan sarang nyamuk serentak di seluruh lingkungan, karena satu rumah yang terlewat bisa jadi sumber.', 'new'),
      S('jentik', 'search', 'Cek jentik tiap 3 hari', 'Periksa semua tempat air, termasuk di pekarangan dan rumah kosong di sekitarmu.', 'up'),
      S('lindungi', 'shield', 'Lindungi anak dan lansia seharian', 'Losion antinyamuk pagi dan sore, baju lengan panjang, kelambu saat tidur siang, dan kasa pada ventilasi.', 'up'),
      S('demam', 'thermo', 'Demam tinggi mendadak? Segera ke Puskesmas', 'Jangan menunggu 2 hari. Penanganan cepat mencegah DBD menjadi berat. Kenali tanda bahaya.', 'up'),
      S('lapor', 'megaphone', 'Laporkan jentik dan kasus', 'Hubungi kader Jumantik atau Puskesmas bila ada tetangga sakit DBD. Puskesmas yang menilai perlu tidaknya fogging fokus.', 'new'),
      S('info', 'calendar', 'Pantau info setiap hari', 'Risiko bisa berubah dalam hitungan hari. Cek DENGUARD tiap hari selama zona Tinggi.', 'up'),
    ],
  };
  W.STEP_TAG = { up: 'Ditingkatkan', new: 'Tambahan' };

  // Tiga tips singkat di Beranda
  W.TIPS = [
    { icon: 'droplet', label: 'Kuras bak mandi rutin' },
    { icon: 'shield', label: 'Pakai losion antinyamuk' },
    { icon: 'trash', label: 'Jaga lingkungan bersih' },
  ];

  W.GUIDE = [
    {
      id: 'zona', icon: 'info', title: 'Arti warna risiko',
      body: () => `<div class="zone-ex">
        <div><span class="pill z-Hijau">Rendah</span><span>Kasus masih wajar untuk kecamatan itu. Tetap kuras dan tutup tempat air.</span></div>
        <div><span class="pill z-Kuning">Waspada</span><span>Kasus lebih tinggi dari biasanya. Tingkatkan pencegahan.</span></div>
        <div><span class="pill z-Merah">Tinggi</span><span>Kasus jauh di atas biasanya. Bersihkan sarang nyamuk serentak dan periksa bila demam.</span></div>
      </div>
      <p class="small muted" style="margin-top:12px">Saat ini warna mengikuti metode <b>${W.METHODS[W.method].name}</b>: ${W.METHODS[W.method].what} Ganti metode di Profil atau di halaman Peta.</p>`,
    },
    {
      id: 'tingkat', icon: 'layers', title: 'Langkah tiap tingkat risiko',
      body: `<table class="cmp">
        <thead><tr><th></th><th><span class="pill z-Hijau">Rendah</span></th><th><span class="pill z-Kuning">Waspada</span></th><th><span class="pill z-Merah">Tinggi</span></th></tr></thead>
        <tbody>
          <tr><th>Kuras &amp; 3M Plus</th><td>1× seminggu</td><td>2× seminggu</td><td>2× + serentak RT/RW</td></tr>
          <tr><th>Cek jentik</th><td>1× seminggu</td><td>2× seminggu</td><td>Tiap 3 hari</td></tr>
          <tr><th>Antinyamuk</th><td>–</td><td>Losion pagi &amp; sore</td><td>+ lengan panjang, kelambu, kasa</td></tr>
          <tr><th>Bila demam</th><td>Pantau</td><td>&gt; 2 hari periksa</td><td>Segera ke Puskesmas</td></tr>
          <tr><th>Cek DENGUARD</th><td>Mingguan</td><td>2× seminggu</td><td>Harian</td></tr>
        </tbody></table>
      <p class="small muted" style="margin-top:10px">Dasarnya pedoman PSN 3M Plus Kemenkes RI dan panduan dengue WHO. Frekuensi yang dinaikkan di zona Waspada dan Tinggi adalah kebijakan kehati-hatian DENGUARD.</p>`,
    },
    {
      id: 'gejala', icon: 'thermo', title: 'Gejala DBD',
      body: `<ul>
        <li><b>Demam tinggi mendadak</b> 2–7 hari</li>
        <li>Sakit kepala, nyeri di belakang mata</li>
        <li>Nyeri otot dan sendi</li>
        <li>Mual, muntah, tidak nafsu makan</li>
        <li>Bintik merah di kulit</li>
      </ul>
      <p style="margin-top:12px"><b>Saat demam:</b> banyak minum, istirahat, dan parasetamol bila perlu. <b>Hindari aspirin dan ibuprofen</b> karena bisa menambah risiko pendarahan. Tetap periksakan ke Puskesmas.</p>`,
    },
    {
      id: 'bahaya', icon: 'alert', title: 'Tanda bahaya: segera ke IGD', danger: true, open: true,
      body: `<p style="margin-bottom:10px">Waspadai <b>hari ke-3 sampai ke-7</b> sakit, terutama saat demam mulai turun. Di fase ini DBD bisa menjadi berat.</p>
      <ul>
        <li><b>Nyeri perut hebat</b></li>
        <li><b>Muntah terus-menerus</b>, tidak bisa minum</li>
        <li>Mimisan, <b>gusi berdarah</b>, BAB atau muntah hitam</li>
        <li><b>Lemas sekali</b>, gelisah, atau sangat mengantuk</li>
        <li>Tangan dan kaki <b>dingin</b>, jarang buang air kecil</li>
      </ul>`,
    },
    {
      id: '3m', icon: 'droplet', title: 'Cegah dengan 3M Plus',
      body: `<ul>
        <li><b>Menguras</b> bak mandi dan tempat air minimal seminggu sekali</li>
        <li><b>Menutup</b> rapat tandon, ember, dan gentong</li>
        <li><b>Mendaur ulang</b> barang bekas penampung air hujan</li>
        <li><b>Plus:</b> losion antinyamuk, kelambu, ikan pemakan jentik, abate, dan <b>1 Rumah 1 Jumantik</b></li>
      </ul>`,
    },
    {
      id: 'jam', icon: 'clock', title: 'Kapan nyamuk menggigit?',
      body: `<p>Nyamuk <i>Aedes aegypti</i> menggigit di <b>siang hari</b>, bukan malam. Menurut Kemenkes, paling aktif sekitar <b>08.00–10.00</b> pagi dan <b>15.00–17.00</b> sore.</p>
      <p style="margin-top:8px">Jamnya bisa sedikit berbeda antar penelitian, dan ia kadang menggigit di luar jam itu, jadi lindungi diri sepanjang siang. Ia suka tempat gelap dan lembap: balik lemari, gantungan baju, kolong tempat tidur. Telurnya bisa bertahan berbulan-bulan di dinding bak kering, jadi sikat dindingnya saat menguras.</p>`,
    },
    {
      id: 'darurat', icon: 'phone', title: 'Nomor penting',
      body: `<div class="call">
        <a href="tel:112"><b>112</b><span>Jakarta Siaga, gawat darurat</span></a>
        <a href="tel:119"><b>119</b><span>Ambulans (PSC 119)</span></a>
      </div>
      <p class="small muted" style="margin-top:10px">Untuk pemeriksaan biasa, datangi Puskesmas kecamatan atau kelurahan terdekat.</p>`,
    },
    {
      id: 'tentang', icon: 'shieldCheck', title: 'Tentang DENGUARD',
      body: `<p><b>DENGUARD</b> (Dengue Geospatial Early Warning and Risk Detection) memperkirakan kasus DBD di setiap kecamatan DKI Jakarta untuk <b>minggu ini dan 4 minggu sesudahnya</b> (5 minggu). Perkiraan dihitung model kecerdasan buatan dari data kasus Dinas Kesehatan DKI sejak 2017, cuaca satelit, dan kasus di kecamatan sekitar. Data diperbarui otomatis tiap minggu.</p>
      <p style="margin-top:8px">Di halaman Peta kamu juga bisa melihat kasus yang tercatat di minggu-minggu lalu sejak 2017. Warna risiko dihitung dengan dua cara yang bisa dipilih, EWARS atau Kanal Endemis.</p>
      <p class="disclaimer">DENGUARD adalah alat bantu kewaspadaan, bukan diagnosis. Perkiraan bisa meleset. Bila kamu atau keluarga sakit, segera periksa ke fasilitas kesehatan.</p>`,
    },
  ];
})();
