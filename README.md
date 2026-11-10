# ICMA Cendekia Competition 2026 — Panduan Pemasangan

## Isi paket
| File | Fungsi |
|---|---|
| `index.html`, `style.css`, `script.js` | Website publik + formulir pendaftaran 5 langkah |
| `config.js` | **Satu-satunya file konfigurasi**: URL Apps Script, WhatsApp, tanggal lomba, biaya, cabang, FAQ |
| `admin.html`, `admin.css`, `admin.js` | Dashboard admin (login dari server) |
| `card.js` | Pembuat kartu peserta PDF 9×11 cm (+ QR) untuk website & admin |
| `scan.html`, `scan.js` | Halaman validasi QR untuk tim registrasi |
| `assets/` | `logo.png` (logo SMP IT ICMA), foto kampus |
| `Code.gs` | Backend Google Apps Script (Sheets + Drive) |

## A. Pasang backend (±10 menit)
1. Buat Google Spreadsheet baru → **Extensions › Apps Script**.
2. Hapus isi default, tempel seluruh `Code.gs`, simpan.
3. Pilih fungsi `setup` → **Run** → izinkan akses. Ini membuat sheet REGISTRASI, DETAIL PESERTA, TIM MINI SOCCER, PEMBAYARAN, REKAP, PENGATURAN dan folder Drive privat untuk bukti transfer.
4. Buka `setAdminPassword`, ganti `'GANTI_PASSWORD'` dengan password kuat (≥10 karakter), **Run**, lalu **hapus password dari kode** dan simpan lagi.
5. **Deploy › New deployment › Web app** — Execute as: *Me*; Who has access: *Anyone*. Salin URL berakhiran `/exec`.
6. Setiap Code.gs diubah, buat **New version** pada deployment agar perubahan aktif.

## B. Pasang website
1. Isi `appsScriptUrl` di `config.js` dengan URL `/exec`.
2. Isi `contact.whatsapp` (mis. `6281234567890`), alamat sekolah, tanggal lomba bila sudah ada (atau isi nanti lewat admin).
3. Unggah semua file ke shared hosting (folder `public_html`). Tidak perlu server khusus.
4. Buka `admin.html`, login, lalu **Pengaturan › Simpan pengaturan** sekali agar sheet PENGATURAN sinkron dengan config.

## C. Mengelola konten
- Tanggal lomba, WhatsApp, biaya, periode, rekening, FAQ, info lomba, tautan juknis: **Admin › Pengaturan**.
- Juknis PDF: unggah ke Google Drive (“Siapa saja yang memiliki link”), tempel tautan di kolom juknis tiap cabang.
- Logo sponsor: letakkan file logo di folder `assets/`, lalu di `index.html` pada bagian `<!-- SPONSOR -->`, ganti teks `Slot Sponsor N` dengan `<img src="assets/nama-logo.png" alt="Nama Sponsor">`. Duplikasi satu kolom slot jika perlu menambah tempat. Perubahan ini hanya pada file website; struktur spreadsheet dan backend tidak berubah.
- Cabang baru: **Tambah cabang** lalu isi biaya dan simpan.
- Bukti transfer tersimpan **privat** di Drive; hanya terlihat lewat dashboard admin.

## C2. Kategori pendaftar & surat keterangan aktif
- **Individu**: satu peserta atau satu tim per pendaftaran.
- **Sekolah**: guru pembina menambahkan banyak peserta/tim ke daftar (maks. `limits.maxEntries` di `config.js`, awal 10), dengan **satu bukti transfer** untuk semuanya. Total biaya = jumlah biaya tiap entri pada gelombang berjalan.
- **Mini Soccer**: wajib mengunggah *surat keterangan aktif peserta didik/siswa* (JPG/JPEG/PNG/PDF) per tim. File tersimpan privat di Drive dan dapat dibuka di Admin › Pendaftar › Detail.
- Nomor registrasi kini per pendaftaran (contoh `ICMA26-0012`); tiap peserta/tim mendapat ID entri (`ICMA26-0012-01`, `-02`, …). Verifikasi pembayaran di admin otomatis berlaku untuk seluruh entri dalam satu pendaftaran.
- **Jika sheet REGISTRASI sudah berisi data uji lama**: kosongkan dulu atau hapus sheet, lalu jalankan ulang `setup()` agar kolom baru (T–W: ID Grup, Kategori Pendaftar, Link/ID Surat Aktif) terbentuk. Deploy ulang Apps Script sebagai versi baru.

## C3. Lima lomba, kartu peserta, scan QR, grup WhatsApp
- **Lomba**: Tahfidz, Vocabulary Memorizing, Spelling Bee, Hifdzul Mufrodaat (Rp15.000/Rp25.000 per peserta) dan Mini Soccer (Rp75.000/Rp85.000 per tim). Jika sebelumnya Anda pernah menekan *Simpan pengaturan* di admin, buka **Admin › Pengaturan** lalu sesuaikan/simpan ulang agar daftar 4 lomba lama di sheet PENGATURAN tergantikan (atau kosongkan sel A2 sheet PENGATURAN).
- **Kartu peserta (9×11 cm)**: muncul di halaman sukses pendaftaran (unduh PDF / cetak, satu kartu per peserta/tim). Admin bisa mencetak per peserta (tombol *Kartu* di tabel atau di Detail) atau massal lewat *Cetak kartu (hasil filter)*. Berisi logo, ID registrasi, nama, jenis kelamin, sekolah, lomba, QR, dan pemberitahuan wajib dibawa. Pustaka PDF/QR dimuat dari CDN saat dibutuhkan, jadi perlu internet.
- **QR** berisi `ICMA26|<ID>|<tanda tangan>`. Tanda tangan dibuat server dengan rahasia di Script Properties (`QR_SECRET`, dibuat otomatis), sehingga QR tidak bisa dipalsukan hanya dengan menebak ID.
- **Halaman scan (`scan.html`)**: buat password tim registrasi dengan menjalankan `setScannerPassword` di Apps Script (ganti `'GANTI_PASSWORD_PANITIA'`, Run, lalu hapus dari kode). Password admin juga bisa dipakai masuk ke halaman scan, tetapi password panitia tidak bisa membuka dashboard admin. Hasil: centang hijau = valid (pembayaran terverifikasi), tanda peringatan kuning = belum membayar, silang merah = tidak ditemukan (atau pendaftaran ditolak/dibatalkan). Kamera butuh **HTTPS**; tersedia input ID manual sebagai cadangan.
- **Grup WhatsApp**: isi link tiap lomba di **Admin › Pengaturan › Cabang lomba** (harus diawali `https://`). Tombol hanya tampil di halaman sukses untuk lomba yang dipilih peserta; link tidak ikut dalam pengaturan publik website.
- Deploy ulang Apps Script sebagai **versi baru** setelah mengganti `Code.gs`.

## D. Catatan penting & batasan
- **Belum diuji end-to-end** terhadap Google Apps Script sungguhan: kode sudah lolos pemeriksaan sintaks, tetapi alur kirim data, upload Drive, dan login baru terbukti setelah Anda memasang URL deployment. Gunakan daftar uji di bawah.
- Nilai placeholder: jumlah pemain Mini Soccer (`limits.minPlayers/maxPlayers`) dan batas file 2 MB — sesuaikan dengan juknis. Jika mengubah `maxFileMB`, ubah juga `MAX_FILE_MB` di `Code.gs`.
- Kuota Apps Script gratis cukup untuk ratusan pendaftar; upload dibatasi ±2 MB per bukti.
- Perubahan `competitions`/`fees` dari admin dipakai server; nama cabang di sheet REKAP dibuat ulang saat menyimpan.
- Email pendamping hanya disimpan; belum ada email otomatis.

## E. Daftar uji
1. Buka website → countdown tampil “Menunggu konfirmasi panitia”; kartu & modal detail terbuka.
2. Daftar lomba individu dengan file JPG → muncul nomor registrasi; cek baris di REGISTRASI, DETAIL PESERTA, PEMBAYARAN, dan file di Drive.
3. Daftar Mini Soccer → baris pemain di TIM MINI SOCCER.
4. Tekan kirim dua kali cepat → hanya satu data.
5. Admin: login salah 5× → terkunci 15 menit; login benar → data tampil; ubah status bayar → sheet ikut berubah; buka bukti; export CSV.
6. Ubah tanggal lomba di Pengaturan → countdown website berubah setelah refresh.
7. Ubah tanggal sistem/periode untuk menguji Gelombang 2 dan “ditutup”.
