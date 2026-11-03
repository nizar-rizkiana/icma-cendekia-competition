/**
 * Code.gs — Backend ICMA Cendekia Competition 2026 (Google Apps Script Web App)
 *
 * Konfigurasi sensitif TIDAK ada di kode. Disimpan di Script Properties:
 *   SPREADSHEET_ID  (opsional bila script dibuat dari dalam Spreadsheet)
 *   DRIVE_FOLDER_ID (dibuat otomatis oleh setup())
 *   ADMIN_SALT, ADMIN_HASH (dibuat oleh setAdminPassword())
 *   SEQ (penghitung nomor registrasi)
 */
const TZ = 'Asia/Jakarta';
const MAX_FILE_MB = 2;
const MAX_BODY_CHARS = 14 * 1024 * 1024; // batas kasar ukuran request (bukti + surat aktif beberapa tim)

const H = {
  REGISTRASI: ['ID Registrasi', 'Timestamp', 'Nama Sekolah', 'Alamat Sekolah', 'Kecamatan', 'Kabupaten', 'Cabang Lomba', 'Nama Peserta/Tim', 'Kelas', 'Nama Pendamping', 'WhatsApp', 'Gelombang', 'Biaya', 'Link Bukti Pembayaran', 'Status Pembayaran', 'Status Pendaftaran', 'Kepala Sekolah', 'Email Pendamping', 'ID File Bukti', 'ID Grup', 'Kategori Pendaftar', 'Link Surat Keterangan Aktif', 'ID File Surat Aktif'],
  'DETAIL PESERTA': ['ID Registrasi', 'Nama Peserta', 'Jenis Kelamin', 'Kelas', 'Cabang Lomba', 'Tempat Tanggal Lahir'],
  'TIM MINI SOCCER': ['ID Registrasi', 'Nama Tim', 'Nama Pemain', 'Kelas', 'Nama Pendamping'],
  PEMBAYARAN: ['ID Registrasi', 'Nama Peserta/Tim', 'Nominal', 'Link Bukti Transfer', 'Status Verifikasi', 'Tanggal Verifikasi'],
  PENGATURAN: ['JSON Pengaturan (jangan diedit manual)']
};
const PAY_STATUS = ['Belum Diverifikasi', 'Terverifikasi', 'Ditolak'];
const REG_STATUS = ['Menunggu', 'Diterima', 'Ditolak', 'Dibatalkan'];

/* Cadangan bila sheet PENGATURAN belum pernah disimpan. Samakan dengan config.js,
   atau cukup buka Dashboard > Pengaturan > Simpan sekali untuk menyinkronkan. */
const DEFAULT_SETTINGS = {
  periods: [{ id: 'w1', label: 'Gelombang 1', start: '2026-11-02', end: '2026-11-14' }, { id: 'w2', label: 'Gelombang 2', start: '2026-11-15', end: '2026-11-21' }],
  fees: { tahfidz: { w1: 15000, w2: 25000 }, vocab: { w1: 15000, w2: 25000 }, spelling: { w1: 15000, w2: 25000 }, mufrodaat: { w1: 15000, w2: 25000 }, soccer: { w1: 75000, w2: 85000 } },
  competitions: [
    { id: 'tahfidz', code: 'THF', type: 'individual', name: "Tahfidz Al-Qur'an" }, { id: 'vocab', code: 'VOC', type: 'individual', name: 'Vocabulary Memorizing' },
    { id: 'spelling', code: 'SPL', type: 'individual', name: 'Spelling Bee' }, { id: 'mufrodaat', code: 'MUF', type: 'individual', name: 'Hifdzul Mufrodaat' },
    { id: 'soccer', code: 'MSC', type: 'team', name: 'Mini Soccer' }
  ],
  limits: { minPlayers: 5, maxPlayers: 12, maxEntries: 10 }
};

/* ============ SETUP (jalankan sekali dari editor) ============ */
function setup() {
  const ss = ss_();
  Object.keys(H).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, H[name].length).setValues([H[name]]).setFontWeight('bold').setBackground('#1150F8').setFontColor('#fff'); sh.setFrozenRows(1); // header selalu diperbarui (kolom baru ditambah di kanan)
  });
  buildRekap_(ss);
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('DRIVE_FOLDER_ID')) p.setProperty('DRIVE_FOLDER_ID', DriveApp.createFolder('ICMA Cendekia 2026 - Bukti Pembayaran').getId());
  if (!p.getProperty('QR_SECRET')) p.setProperty('QR_SECRET', Utilities.getUuid() + Utilities.getUuid());
  Logger.log('Setup selesai. Spreadsheet: ' + ss.getUrl());
}
/** Jalankan SEKALI dengan mengganti 'GANTI_PASSWORD', lalu HAPUS password dari kode. */
function setAdminPassword() {
  const pw = 'GANTI_PASSWORD';
  if (pw === 'GANTI_PASSWORD' || pw.length < 10) throw new Error('Isi password minimal 10 karakter terlebih dahulu.');
  const salt = Utilities.getUuid(), p = PropertiesService.getScriptProperties();
  p.setProperty('ADMIN_SALT', salt); p.setProperty('ADMIN_HASH', hash_(salt + pw));
  Logger.log('Password admin tersimpan. Hapus password dari kode sekarang.');
}
function buildRekap_(ss) {
  const sh = ss.getSheetByName('REKAP') || ss.insertSheet('REKAP'); sh.clear();
  const s = getSettings_(), rows = [['Indikator', 'Nilai'],
    ['Total pendaftaran (grup unik)', '=IFERROR(COUNTA(UNIQUE(FILTER(REGISTRASI!T2:T,REGISTRASI!T2:T<>""))),0)'],
    ['Total entri (peserta/tim terdaftar)', '=COUNTA(REGISTRASI!A2:A)'],
    ['Total peserta (individu + pemain tim)', "=COUNTA('DETAIL PESERTA'!A2:A)+COUNTA('TIM MINI SOCCER'!A2:A)"],
    ['Jumlah sekolah (unik)', '=IFERROR(COUNTA(UNIQUE(FILTER(REGISTRASI!C2:C,REGISTRASI!C2:C<>""))),0)'],
    ['Entri kategori Individu', '=COUNTIF(REGISTRASI!U2:U,"Individu")'],
    ['Entri kategori Sekolah', '=COUNTIF(REGISTRASI!U2:U,"Sekolah")']];
  s.competitions.forEach(c => rows.push(['Pendaftar ' + c.name, '=COUNTIF(REGISTRASI!G2:G,"' + c.name.replace(/"/g, '""') + '")']));
  s.periods.forEach(p => rows.push(['Pendaftar ' + p.label, '=COUNTIF(REGISTRASI!L2:L,"' + p.label + '")']));
  rows.push(['Entri pembayaran terverifikasi', '=COUNTIF(REGISTRASI!O2:O,"Terverifikasi")'], ['Entri pembayaran belum terverifikasi', '=B3-COUNTIF(REGISTRASI!O2:O,"Terverifikasi")']);
  sh.getRange(1, 1, rows.length, 2).setValues(rows); sh.getRange(1, 1, 1, 2).setFontWeight('bold'); sh.setColumnWidth(1, 320);
}

/* ============ ENTRY POINTS ============ */
function doGet(e) {
  try { if ((e.parameter || {}).action === 'settings') return json_({ ok: true, settings: publicSettings_() }); return json_({ ok: true, service: 'ICMA Cendekia API' }); }
  catch (err) { return fail_(err); }
}
function doPost(e) {
  try {
    const raw = (e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY_CHARS) throw user_('Ukuran data terlalu besar.');
    const b = JSON.parse(raw);
    switch (b.action) {
      case 'register': return json_(register_(b));
      case 'login': return json_(login_(b));
      case 'validate': requireScanner_(b.token); return json_(validate_(b)); // tim registrasi (scanner) atau admin
      default: requireAdmin_(b.token);
    }
    switch (b.action) {
      case 'list': return json_(listAll_());
      case 'updateStatus': return json_(updateStatus_(b));
      case 'proof': return json_(proof_(b));
      case 'getSettings': return json_({ ok: true, settings: getSettings_() }); // lengkap, termasuk link grup WA (khusus admin)
      case 'saveSettings': return json_(saveSettings_(b));
      case 'logout': CacheService.getScriptCache().remove('tok_' + b.token); return json_({ ok: true });
      default: throw user_('Aksi tidak dikenal.');
    }
  } catch (err) { return fail_(err); }
}

/* ============ REGISTRASI ============ */
/** Satu pendaftaran (grup) berisi 1..N entri (peserta/tim). Kategori "Individu" = tepat 1 entri,
 *  kategori "Sekolah" = pembina mendaftarkan banyak siswa/tim sekaligus dengan satu bukti transfer. */
function register_(b) {
  const cache = CacheService.getScriptCache();
  if (b.idemKey && typeof b.idemKey === 'string') { const prev = cache.get('idem_' + b.idemKey); if (prev) return JSON.parse(prev); } // cegah double submit
  const s = getSettings_(), per = currentPeriod_(s); if (!per) throw user_('Pendaftaran sedang tidak dibuka.');
  const lim = Object.assign({}, DEFAULT_SETTINGS.limits, s.limits || {});
  const kat = b.kategori; if (['Individu', 'Sekolah'].indexOf(kat) < 0) throw user_('Kategori pendaftar tidak valid.');
  const ents = Array.isArray(b.entries) ? b.entries : [];
  if (!ents.length) throw user_('Tambahkan minimal satu peserta atau tim.');
  if (kat === 'Individu' && ents.length !== 1) throw user_('Pendaftar individu hanya dapat mendaftarkan satu peserta atau tim.');
  if (ents.length > lim.maxEntries) throw user_('Maksimal ' + lim.maxEntries + ' peserta/tim per pendaftaran.');

  const sc = b.school || {}, pd = b.pendamping || {};
  const req = (v, n, max) => { v = String(v || '').trim(); if (!v) throw user_(n + ' wajib diisi.'); return v.slice(0, max || 200); };
  const school = { nama: req(sc.nama, 'Nama sekolah', 120), alamat: req(sc.alamat, 'Alamat sekolah', 300), kec: req(sc.kecamatan, 'Kecamatan', 80), kab: req(sc.kabupaten, 'Kabupaten/Kota', 80), kepsek: String(sc.kepsek || '').trim().slice(0, 100) };
  const pend = { nama: req(pd.nama, 'Nama pendamping', 100), wa: phone_(pd.wa), email: String(pd.email || '').trim().slice(0, 120) };
  if (pend.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pend.email)) throw user_('Format email tidak valid.');

  const items = ents.map(e => {
    const cab = s.competitions.find(c => c.id === e.cabang); if (!cab) throw user_('Cabang lomba tidak valid.');
    const fee = s.fees && s.fees[cab.id] && s.fees[cab.id][per.id]; if (typeof fee !== 'number') throw user_('Biaya untuk ' + cab.name + ' belum diatur.');
    const it = { cab: cab, fee: fee, indiv: null, team: null, ska: null };
    if (cab.type === 'team') {
      const t = e.team || {}, pl = Array.isArray(t.players) ? t.players : [];
      if (pl.length < lim.minPlayers || pl.length > lim.maxPlayers) throw user_('Jumlah pemain ' + cab.name + ' harus ' + lim.minPlayers + '–' + lim.maxPlayers + '.');
      it.team = { nama: req(t.nama, 'Nama tim', 80), players: pl.map(p => ({ nama: req(p.nama, 'Nama pemain', 100), kelas: klass_(p.kelas) })) };
      it.name = it.team.nama; it.kelas = Array.from(new Set(it.team.players.map(p => p.kelas))).join(', ');
      it.ska = file_(e.ska, 'Surat keterangan aktif peserta didik (tim ' + it.name + ')'); // wajib untuk tim
    } else {
      const i = e.individual || {};
      it.indiv = { nama: req(i.nama, 'Nama peserta', 100), jk: ['Laki-laki', 'Perempuan'].indexOf(i.jk) < 0 ? fail1_('Jenis kelamin tidak valid.') : i.jk, kelas: klass_(i.kelas), ttl: String(i.ttl || '').trim().slice(0, 100) };
      it.name = it.indiv.nama; it.kelas = it.indiv.kelas;
    }
    return it;
  });
  const proof = file_(b.proof, 'Bukti transfer');
  const total = items.reduce((a, it) => a + it.fee, 0);

  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    const props = PropertiesService.getScriptProperties(), seq = (parseInt(props.getProperty('SEQ') || '0', 10) + 1);
    const gid = 'ICMA26-' + ('0000' + seq).slice(-4);
    const folder = DriveApp.getFolderById(props.getProperty('DRIVE_FOLDER_ID'));
    const save = (f, nm) => folder.createFile(Utilities.newBlob(f.bytes, f.mime, nm.replace(/[^\w\- ]/g, '').slice(0, 60) + '.' + f.ext)); // privat, hanya pemilik
    const pf = save(proof, gid + '_bukti');
    const ss = ss_(), ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    items.forEach((it, n) => {
      const eid = gid + '-' + ('0' + (n + 1)).slice(-2);
      const sf = it.ska ? save(it.ska, eid + '_surat_aktif') : null;
      append_(ss.getSheetByName('REGISTRASI'), [eid, ts, school.nama, school.alamat, school.kec, school.kab, it.cab.name, it.name, it.kelas, pend.nama, pend.wa, per.label, it.fee, pf.getUrl(), 'Belum Diverifikasi', 'Menunggu', school.kepsek, pend.email, pf.getId(), gid, kat, sf ? sf.getUrl() : '', sf ? sf.getId() : ''], [1, 2, 11, 20]);
      if (it.indiv) append_(ss.getSheetByName('DETAIL PESERTA'), [eid, it.indiv.nama, it.indiv.jk, it.indiv.kelas, it.cab.name, it.indiv.ttl], [1]);
      if (it.team) it.team.players.forEach(p => append_(ss.getSheetByName('TIM MINI SOCCER'), [eid, it.team.nama, p.nama, p.kelas, pend.nama], [1]));
    });
    append_(ss.getSheetByName('PEMBAYARAN'), [gid, kat === 'Sekolah' ? school.nama + ' (' + items.length + ' entri)' : items[0].name, total, pf.getUrl(), 'Belum Diverifikasi', ''], [1]);
    props.setProperty('SEQ', String(seq));
    const groups = {}; items.forEach(it => { if (/^https:\/\//.test(it.cab.waGroup || '')) groups[it.cab.id] = it.cab.waGroup; }); // link grup WA hanya dikirim setelah mendaftar
    const out = { ok: true, id: gid, total: total, jumlah: items.length, gelombang: per.label, cards: items.map((it, n) => { const eid = gid + '-' + ('0' + (n + 1)).slice(-2); return { id: eid, sig: sig_(eid) }; }), groups: groups };
    if (b.idemKey) cache.put('idem_' + b.idemKey, JSON.stringify(out), 21600);
    return out;
  } finally { lock.releaseLock(); }
}
/** Validasi & decode berkas unggahan (JPG/PNG/PDF, maks MAX_FILE_MB). */
function file_(f, label) {
  f = f || {}; const mime = String(f.mime || '');
  if (['image/jpeg', 'image/png', 'application/pdf'].indexOf(mime) < 0) throw user_(label + ' harus berformat JPG, JPEG, PNG, atau PDF.');
  const bytes = Utilities.base64Decode(String(f.data || '')); if (!bytes.length) throw user_('Berkas ' + label + ' kosong.');
  if (bytes.length > MAX_FILE_MB * 1048576) throw user_('Ukuran berkas ' + label + ' maksimal ' + MAX_FILE_MB + ' MB.');
  return { bytes: bytes, mime: mime, ext: mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg' };
}

/* ============ ADMIN ============ */
function login_(b) {
  const scanner = b.role === 'scanner', cache = CacheService.getScriptCache(), p = PropertiesService.getScriptProperties(), fk = scanner ? 'sfails' : 'fails';
  const fails = parseInt(cache.get(fk) || '0', 10); if (fails >= 5) throw user_('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  const pw = String(b.password || ''), chk = (s, h) => { const salt = p.getProperty(s), hh = p.getProperty(h); return !!(salt && hh && hash_(salt + pw) === hh); };
  if (!p.getProperty('ADMIN_HASH') && !p.getProperty('SCAN_HASH')) throw user_('Password belum diatur di server.');
  // Halaman scan menerima password panitia registrasi (SCAN_*) atau password admin; dashboard admin hanya password admin
  const ok = scanner ? (chk('SCAN_SALT', 'SCAN_HASH') || chk('ADMIN_SALT', 'ADMIN_HASH')) : chk('ADMIN_SALT', 'ADMIN_HASH');
  if (!ok) { cache.put(fk, String(fails + 1), 900); throw user_('Password salah.'); }
  cache.remove(fk); const token = Utilities.getUuid() + Utilities.getUuid(); cache.put((scanner ? 'stk_' : 'tok_') + token, '1', 21600);
  return { ok: true, token: token };
}
function requireScanner_(t) { const k = CacheService.getScriptCache(); if (!t || !(k.get('stk_' + t) || k.get('tok_' + t))) throw user_('Sesi berakhir. Silakan login kembali.', 'AUTH'); }
function requireAdmin_(t) { if (!t || !CacheService.getScriptCache().get('tok_' + t)) throw user_('Sesi berakhir. Silakan login kembali.', 'AUTH'); }
function listAll_() {
  const ss = ss_(), rd = n => { const sh = ss.getSheetByName(n), v = sh.getDataRange().getValues(), hd = v.shift(); return v.filter(r => r[0] !== '').map(r => { const o = {}; hd.forEach((k, i) => o[k] = r[i] instanceof Date ? Utilities.formatDate(r[i], TZ, 'yyyy-MM-dd HH:mm:ss') : r[i]); return o; }); };
  const regs = rd('REGISTRASI'); regs.forEach(r => r['Kode QR'] = sig_(r['ID Registrasi']));
  return { ok: true, registrasi: regs, peserta: rd('DETAIL PESERTA'), tim: rd('TIM MINI SOCCER'), pembayaran: rd('PEMBAYARAN'), payStatuses: PAY_STATUS, regStatuses: REG_STATUS };
}
function updateStatus_(b) {
  const field = b.field, v = String(b.value || '');
  if (field === 'payment' && PAY_STATUS.indexOf(v) < 0) throw user_('Status tidak valid.');
  if (field === 'registration' && REG_STATUS.indexOf(v) < 0) throw user_('Status tidak valid.');
  if (field !== 'payment' && field !== 'registration') throw user_('Field tidak valid.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const ss = ss_(), reg = ss.getSheetByName('REGISTRASI'), n = Math.max(reg.getLastRow() - 1, 1);
    const ids = reg.getRange(2, 1, n, 1).getValues().map(r => r[0]), grp = reg.getRange(2, 20, n, 1).getValues().map(r => r[0]), i = ids.indexOf(b.id);
    if (i < 0) throw user_('ID registrasi tidak ditemukan.');
    if (field === 'registration') { reg.getRange(i + 2, 16).setValue(v); return { ok: true }; }
    // Pembayaran satu pendaftaran (grup) diverifikasi sekaligus: satu transfer untuk semua entri
    const gid = grp[i] || ids[i];
    ids.forEach((id, k) => { if ((grp[k] || id) === gid) reg.getRange(k + 2, 15).setValue(v); });
    const pay = ss.getSheetByName('PEMBAYARAN'), pid = pay.getRange(2, 1, Math.max(pay.getLastRow() - 1, 1), 1).getValues().map(r => r[0]), j = pid.indexOf(gid);
    if (j >= 0) { pay.getRange(j + 2, 5).setValue(v); pay.getRange(j + 2, 6).setValue(v === 'Belum Diverifikasi' ? '' : Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')); }
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function proof_(b) {
  const f = DriveApp.getFileById(String(b.fileId || '')), folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  const it = f.getParents(), inFolder = it.hasNext() && it.next().getId() === folderId; if (!inFolder) throw user_('File tidak ditemukan.'); // hanya file bukti
  const blob = f.getBlob(); return { ok: true, name: f.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}
function saveSettings_(b) {
  const s = b.settings; if (!s || typeof s !== 'object') throw user_('Data pengaturan tidak valid.');
  ['periods', 'fees', 'competitions'].forEach(k => { if (!s[k]) throw user_('Pengaturan "' + k + '" tidak boleh kosong.'); });
  s.competitions.forEach(c => { if (c.waGroup && !/^https:\/\/[^\s]+$/.test(c.waGroup)) throw user_('Link grup WhatsApp ' + c.name + ' harus diawali https://'); });
  const str = JSON.stringify(s); if (str.length > 45000) throw user_('Pengaturan terlalu besar.');
  const sh = ss_().getSheetByName('PENGATURAN'); sh.getRange(2, 1).setValue(str); buildRekap_(ss_());
  return { ok: true };
}

/* ============ HELPER ============ */
function ss_() { const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'); return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(); }
function getSettings_() {
  try { const sh = ss_().getSheetByName('PENGATURAN'), v = sh && sh.getLastRow() >= 2 ? sh.getRange(2, 1).getValue() : ''; if (v) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(v)); } catch (e) { console.error(e); }
  return DEFAULT_SETTINGS;
}
function currentPeriod_(s) { const t = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); return s.periods.filter(p => t >= p.start && t <= p.end)[0] || null; }
function hash_(str) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join(''); }
function phone_(v) { v = String(v || '').replace(/[\s-]/g, ''); if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(v)) throw user_('Nomor WhatsApp tidak valid.'); return v; }
function klass_(k) { if (['Kelas 4', 'Kelas 5', 'Kelas 6'].indexOf(k) < 0) throw user_('Kelas harus 4, 5, atau 6.'); return k; }
function fail1_(m) { throw user_(m); }
/** Cegah formula injection di Sheets: awalan = + - @ diberi tanda petik. */
function safe_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
function append_(sh, row, textCols) {
  const r = sh.getLastRow() + 1; (textCols || []).forEach(c => sh.getRange(r, c).setNumberFormat('@'));
  sh.getRange(r, 1, 1, row.length).setValues([row.map(safe_)]);
}
function user_(msg, code) { const e = new Error(msg); e.isUser = true; e.code = code || 'USER'; return e; }
function fail_(err) { if (err && err.isUser) return json_({ ok: false, error: err.message, code: err.code }); console.error(err && err.stack || err); return json_({ ok: false, error: 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi panitia.' }); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ============ KARTU PESERTA, QR & SCANNER ============ */
/** Tanda tangan pendek untuk QR: mencegah QR palsu dari ID yang ditebak. Rahasia ada di Script Properties. */
function sig_(id) {
  const p = PropertiesService.getScriptProperties(); let sec = p.getProperty('QR_SECRET');
  if (!sec) { sec = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('QR_SECRET', sec); }
  return hash_(sec + '|' + id).slice(0, 8);
}
/** Validasi QR kartu. Isi QR: ICMA26|<ID entri>|<sig>. b.manual=true: panitia mengetik ID (tanpa sig). */
function validate_(b) {
  const code = String(b.code || '').trim(), ps = code.split('|'); let id = '';
  if (ps.length === 3 && ps[0] === 'ICMA26') id = ps[2] === sig_(ps[1]) ? ps[1] : '';
  else if (b.manual === true && ps.length === 1) id = code;
  if (!id) return { ok: true, state: 'notfound' };
  const ss = ss_(), sh = ss.getSheetByName('REGISTRASI'), n = Math.max(sh.getLastRow() - 1, 1);
  const i = sh.getRange(2, 1, n, 1).getValues().map(r => r[0]).indexOf(id); if (i < 0) return { ok: true, state: 'notfound' };
  const hd = H.REGISTRASI, v = sh.getRange(i + 2, 1, 1, hd.length).getValues()[0], r = {}; hd.forEach((k, j) => r[k] = v[j]);
  const dp = ss.getSheetByName('DETAIL PESERTA'), dn = Math.max(dp.getLastRow() - 1, 1), dv = dp.getRange(2, 1, dn, 3).getValues().filter(x => x[0] === id)[0];
  const pay = r['Status Pembayaran'], reg = r['Status Pendaftaran'];
  const state = (reg === 'Ditolak' || reg === 'Dibatalkan') ? 'rejected' : pay === 'Terverifikasi' ? 'valid' : 'unpaid';
  return { ok: true, state: state, id: id, nama: r['Nama Peserta/Tim'], cabang: r['Cabang Lomba'], sekolah: r['Nama Sekolah'], jk: dv ? dv[2] : 'Tim', kelas: r['Kelas'], pay: pay, reg: reg };
}
/** Pengaturan publik: link grup WhatsApp dibuang (hanya dikirim ke peserta setelah mendaftar). */
function publicSettings_() {
  const s = JSON.parse(JSON.stringify(getSettings_())); (s.competitions || []).forEach(c => { delete c.waGroup; }); return s;
}
/** Jalankan SEKALI untuk password panitia registrasi (halaman scan.html), lalu HAPUS password dari kode. */
function setScannerPassword() {
  const pw = 'GANTI_PASSWORD_PANITIA';
  if (pw === 'GANTI_PASSWORD_PANITIA' || pw.length < 8) throw new Error('Isi password minimal 8 karakter terlebih dahulu.');
  const salt = Utilities.getUuid(), p = PropertiesService.getScriptProperties();
  p.setProperty('SCAN_SALT', salt); p.setProperty('SCAN_HASH', hash_(salt + pw));
  Logger.log('Password panitia scan tersimpan. Hapus password dari kode sekarang.');
}
