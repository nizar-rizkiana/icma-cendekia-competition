/* ==========================================================================
   config.js — SATU-SATUNYA file yang perlu diedit untuk pengaturan awal.
   Nilai di bagian `settings` adalah DEFAULT. Setelah admin menekan "Simpan"
   di dashboard, nilai dari Google Sheets (sheet PENGATURAN) menimpa default ini.
   Semua isian kosong ("") = placeholder, belum ada informasi resmi.
   ========================================================================== */
window.ICMA_CONFIG = {
  // URL Web App Google Apps Script (akhiran /exec). Wajib diisi setelah deploy.
  appsScriptUrl:
    "https://script.google.com/macros/s/AKfycbzIgJ6mAY-L5hXwik90NI-YrL4U12ExpeGH9xpUKYhfSunWzgEjMV4LQ_QhlLh_u3_C/exec",

  // Batas teknis form (PLACEHOLDER: sesuaikan dengan juknis Mini Soccer & kebijakan panitia).
  // maxEntries = batas peserta/tim dalam satu pendaftaran kategori Sekolah.
  limits: { maxFileMB: 2, minPlayers: 5, maxPlayers: 12, maxEntries: 10 },

  settings: {
    school: {
      name: "SMP IT ICMA",
      logo: "assets/logo.png", // logo SMP IT ICMA (dipakai di navbar & kartu peserta)
      address: "", // PLACEHOLDER: alamat resmi sekolah
      kabupatenDefault: "Pandeglang",
    },
    contact: {
      whatsapp: "6285782977825", // format internasional tanpa +, contoh: 6281234567890
      whatsappLabel: "Panitia ICMA Cendekia",
      instagram: "https://www.instagram.com/smpiticma/",
      youtube: "https://www.youtube.com/@siticma8706",
      facebook: "",
      tiktok: "https://www.tiktok.com/@sit_icma",
    },
    // Tanggal pelaksanaan lomba. Kosong = "menunggu konfirmasi". Format: 2026-12-05T08:00:00+07:00
    eventDate: "",
    techMeetingDate: "2026-11-16",
    periods: [
      {
        id: "w1",
        label: "Gelombang 1",
        start: "2026-11-02",
        end: "2026-11-14",
      },
      {
        id: "w2",
        label: "Gelombang 2",
        start: "2026-11-15",
        end: "2026-11-21",
      },
    ],
    // Biaya per cabang & gelombang (key = id cabang, key gelombang = id periode)
    fees: {
      tahfidz: { w1: 15000, w2: 25000 },
      vocab: { w1: 15000, w2: 25000 },
      spelling: { w1: 15000, w2: 25000 },
      mufrodaat: { w1: 15000, w2: 25000 },
      soccer: { w1: 75000, w2: 85000 },
    },
    payment: {
      bank: "BSI (Bank Syariah Indonesia)",
      accountName: "Eneng Nurul Prihatini",
      accountNumber: "7276022697",
    },

    // Daftar cabang. Tambah cabang baru: salin satu objek, ganti id/code/name, lalu tambah biaya di `fees`.
    // type: "individual" | "team". Array kosong ([]) akan tampil sebagai "menunggu informasi panitia".
    // waGroup = link grup WhatsApp lomba (diisi lewat Admin › Pengaturan; hanya dikirim ke peserta setelah mendaftar)
    competitions: [
      {
        id: "tahfidz",
        code: "THF",
        type: "individual",
        icon: "quran",
        unit: "peserta",
        name: "Tahfidz Al-Qur'an",
        short: "Lomba hafalan Al-Qur'an bagi siswa SD/MI.",
        category: "Putra & Putri, kelas 4–6 SD/MI",
        juknisUrl:
          "https://drive.google.com/file/d/1f-ydARZy1BiMZpuf7BAeWO7mXgwe5MCh/view?usp=drive_link",
        waGroup: "https://chat.whatsapp.com/JAzIkLwTsRL3Ur8MaVu2Jn",
        detail: {
          deskripsi:
            "Lomba Tahfidz Al-Qur’an merupakan ajang uji hafalan Al-Qur’an Juz 30 bagi siswa-siswi tingkat SD/MI. Lomba ini diselenggarakan untuk menguji ketepatan, kelancaran, serta keindahan bacaan sesuai tajwid dan adab tilawah",
          tujuan: [
            "•	Menumbuhkan rasa cinta generasi muda terhadap Al-Qur’an.",
            "•	Memotivasi peserta didik untuk terus menjaga hafalan Al-Qur’an.",
            "•	Membentuk karakter Islami yang beradab dan percaya diri",
          ],
          persyaratan: [
            "Siswa SD/MI kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
            "Setiap sekolah / rumah tahfidz dapat mengirimkan beberapa peserta.",
            "•	Peserta dapat juga berasal dari individu yang duduk di kelas 4-6 SD/MI",
            "•	Mengisi formulir pendaftaran yang disediakan oleh panitia.",
            "•	Peserta membayar biaya pendaftaran Gelombang 1 Rp 15.000/peserta, atau Gelombang 2 Rp 25.000/peserta",
          ],
          ketentuan: [
            "1.	Peserta wajib berpakaian sopan dan Islami",
            "2.	Peserta membawa Al-Qur’an sendiri.",
            "3.	Urutan tampil ditentukan melalui undian pada saat technical meeting.",
            "4.	Peserta wajib hadir sesuai jadwal yang telah ditentukan panitia.",
          ],
          teknis: [
            "•	Peserta akan diuji hafalan oleh dewan juri dari potongan ayat yang ditentukan secara acak",
            "•	Setiap peserta mendapatkan waktu ±5 menit.",
            "•	Peserta diberi kesempatan 2 kali apabila melakukan kesalahan. Kesalahan ke 3 dilanjutkan ke soal selanjutnya.",
            "•	Juara I, II, dan III ditentukan berdasarkan nilai tertinggi hasil rekap juri.",
            "•	Keputusan juri bersifat final.",
          ],
          materi: ["Hafalan Juz 30 ( Surat An Naas s.d Surat Al-A’la)."],
          penilaian: [
            "Kelancaran Hafalan      (30%)",
            "Tajwid dan Makhraj      (25%)",
            "Suara dan Irama         (20%)",
            "Adab Tilawah dan Sikap  (15%)",
            "Kepercayaan Diri        (10%)",
          ],
          perlengkapan: [
            "•	Mushaf Al-Qur’an pribadi (dipergunakan sebelum tampil / persiapan).",
            "•	Kartu/Nomor Peserta (diberikan oleh panitia).",
          ],
          hadiah: [
            "•	Juara I mendapatkan piala, sertifikat, dan uang pembinaan.",
            "•	Juara II mendapatkan piala, sertifikat, dan uang pembinaan.",
            "•	Juara III mendapatkan piala, sertifikat, dan uang pembinaan. ",
          ],
        },
      },
      {
        id: "vocab",
        code: "VOC",
        type: "individual",
        icon: "chat",
        unit: "peserta",
        name: "Vocabulary Memorizing",
        short: "Lomba menghafal kosakata (vocabulary) bagi siswa SD/MI.",
        category: "Putra & Putri, kelas 4–6 SD/MI",
        juknisUrl: "",
        waGroup: "",
        detail: {
          deskripsi: "",
          tujuan: [],
          persyaratan: [
            "Siswa SD/MI kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
          ],
          ketentuan: [],
          teknis: [],
          materi: [],
          penilaian: [],
          perlengkapan: [],
          hadiah: "",
        },
      },
      {
        id: "spelling",
        code: "SPL",
        type: "individual",
        icon: "chat",
        unit: "peserta",
        name: "Spelling Bee",
        short: "Lomba mengeja kata (spelling bee) bagi siswa SD/MI.",
        category: "Putra & Putri, kelas 4–6 SD/MI",
        juknisUrl: "",
        waGroup: "",
        detail: {
          deskripsi: "",
          tujuan: [],
          persyaratan: [
            "Siswa SD/MI kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
          ],
          ketentuan: [],
          teknis: [],
          materi: [],
          penilaian: [],
          perlengkapan: [],
          hadiah: "",
        },
      },
      {
        id: "mufrodaat",
        code: "MUF",
        type: "individual",
        icon: "arab",
        unit: "peserta",
        name: "Hifdzul Mufrodaat",
        short:
          "Lomba menghafal kosakata (mufrodaat) Bahasa Arab bagi siswa SD/MI.",
        category: "Putra & Putri, kelas 4–6 SD/MI",
        juknisUrl: "",
        waGroup: "",
        detail: {
          deskripsi: "",
          tujuan: [],
          persyaratan: [
            "Siswa SD/MI kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
          ],
          ketentuan: [],
          teknis: [],
          materi: [],
          penilaian: [],
          perlengkapan: [],
          hadiah: "",
        },
      },
      {
        id: "soccer",
        code: "MSC",
        type: "team",
        icon: "ball",
        unit: "tim",
        name: "Mini Soccer",
        short: "Pertandingan sepak bola mini antar tim sekolah.",
        category: "Tim sekolah, kelas 4–6 SD/MI",
        juknisUrl: "",
        waGroup: "",
        detail: {
          deskripsi: "",
          tujuan: [],
          persyaratan: [
            "Siswa SD/MI kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
            "Melampirkan surat keterangan aktif peserta didik/siswa saat pendaftaran.",
          ],
          ketentuan: [],
          teknis: [],
          materi: [],
          penilaian: [],
          perlengkapan: [],
          hadiah: "",
        },
      },
    ],

    faq: [
      {
        q: "Siapa yang boleh mengikuti kompetisi?",
        a: "Siswa Sekolah Dasar (SD) atau Madrasah Ibtidaiyah kelas 4–6 di wilayah sekitar Kabupaten Pandeglang.",
      },
      {
        q: "Bagaimana cara mendaftar?",
        a: "Isi formulir pendaftaran online di bagian Pendaftaran: pilih kategori pendaftar, isi data sekolah, pilih cabang lomba, isi data pendamping, lalu unggah bukti transfer. Nomor registrasi akan muncul setelah data terkirim.",
      },
      {
        q: "Apa beda pendaftar Individu dan Sekolah?",
        a: "Pendaftar Individu mendaftarkan satu peserta atau satu tim. Pendaftar Sekolah (pembina) dapat mendaftarkan lebih dari satu siswa atau tim sekaligus dalam satu pendaftaran dengan satu bukti transfer.",
      },
      {
        q: "Apakah boleh mengikuti lebih dari satu lomba?",
        a: "Ketentuan ini mengikuti juknis tiap lomba dan keputusan panitia. Silakan hubungi panitia melalui WhatsApp untuk kepastian.",
      },
      {
        q: "Bagaimana cara pembayaran?",
        a: "Transfer ke rekening BSI yang tertera di bagian Informasi sesuai nominal yang ditampilkan di formulir, lalu unggah bukti transfer.",
      },
      {
        q: "Apakah harus mengunggah bukti transfer?",
        a: "Ya. Bukti transfer (JPG, JPEG, PNG, atau PDF) diunggah pada langkah Pembayaran agar panitia dapat memverifikasi.",
      },
      {
        q: "Di mana mendapatkan juknis?",
        a: "Juknis tiap lomba tersedia di bagian Juknis dan pada detail masing-masing lomba. Dokumen resmi akan diunggah oleh panitia.",
      },
      {
        q: "Kapan Technical Meeting dilaksanakan?",
        a: "Technical Meeting dilaksanakan pada 16 November 2026 di SMP IT ICMA.",
      },
    ],
  },
};
