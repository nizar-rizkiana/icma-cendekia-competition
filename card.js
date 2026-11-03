/* card.js — Kartu peserta 9 x 11 cm (PDF). Dipakai oleh website (setelah daftar) dan admin.
   Pustaka jsPDF & qrcode-generator dimuat hanya saat dibutuhkan (lazy load dari CDN).
   Data kartu: { id, sig, name, gender, genderLabel, school, cabang }.  Isi QR: ICMA26|<id>|<sig> */
(() => {
  'use strict';
  const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat pustaka PDF. Periksa koneksi internet lalu coba lagi.')); document.head.appendChild(s); });
  let libs; const ensure = () => libs ||= Promise.all([window.jspdf ? 0 : load(LIBS[0]), window.qrcode ? 0 : load(LIBS[1])]).catch(e => { libs = null; throw e; });
  const logoCache = {};
  const logo = url => !url ? Promise.resolve(null) : (logoCache[url] ||= new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); res({ d: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }); }; im.onerror = () => res(null); im.src = url; }));
  const payload = c => `ICMA26|${c.id}|${c.sig}`;
  const NAVY = [7, 27, 73], BLUE = [17, 80, 248], CYAN = [46, 190, 255], BG = [3, 10, 34];

  function draw(doc, c, lg, seed) {
    const op = v => doc.setGState(new doc.GState({ opacity: v })), W = 90, H = 110;
    // latar antariksa
    doc.setFillColor(...BG); doc.rect(0, 0, W, H, 'F');
    op(.35); doc.setFillColor(...BLUE); doc.circle(80, 8, 34, 'F'); doc.circle(4, 108, 26, 'F');
    op(1); let r = seed * 9301 + 49297; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    doc.setFillColor(255, 255, 255); for (let i = 0; i < 46; i++) { op(.25 + rnd() * .6); doc.circle(rnd() * W, rnd() * H, .12 + rnd() * .28, 'F'); }
    op(1);
    // kepala: logo + judul + planet kecil
    doc.setFillColor(255, 255, 255); doc.circle(15, 13.5, 9.2, 'F');
    if (lg) { const h = 14.5, w = h * lg.w / lg.h; doc.addImage(lg.d, 'PNG', 15 - w / 2, 13.5 - h / 2, w, h); }
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text('ICMA CENDEKIA', 27, 11.5);
    doc.setTextColor(...CYAN); doc.setFontSize(7.4); doc.text('COMPETITION 2026', 27, 16);
    doc.setTextColor(190, 215, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.text('SMP IT ICMA  ·  Be Cendekia, Be an Inspiration', 27, 20.2);
    doc.setFillColor(127, 183, 230); doc.circle(80, 12, 4.2, 'F'); op(.55); doc.setFillColor(255, 255, 255); doc.circle(78.8, 10.8, 1.5, 'F'); op(1);
    doc.setDrawColor(255, 225, 170); doc.setLineWidth(.35); doc.ellipse(80, 12, 7, 1.7, 'S');
    // panel putih
    doc.setFillColor(234, 244, 255); doc.roundedRect(6, 26, 78, 67, 4, 4, 'F');
    doc.setFillColor(...BLUE); const cab = String(c.cabang || '').toUpperCase(); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
    const pw = Math.min(70, doc.getTextWidth(cab) + 9); doc.roundedRect(45 - pw / 2, 29, pw, 6.2, 3.1, 3.1, 'F'); doc.setTextColor(255, 255, 255); doc.text(cab, 45, 33.2, { align: 'center' });
    // data peserta (kolom kiri)
    const lab = (t, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(5.2); doc.setTextColor(90, 110, 150); doc.text(t, 10, y); };
    const val = (t, y, size, lines) => { doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(size); doc.text(doc.splitTextToSize(String(t || '-'), 39).slice(0, lines), 10, y, { lineHeightFactor: 1.15 }); };
    const nm = String(c.name || '-'); lab('NAMA', 42); val(nm, 45.8, nm.length > 34 ? 6.6 : nm.length > 22 ? 7.6 : 8.8, 3);
    lab(c.genderLabel || 'JENIS KELAMIN', 57); val(c.gender, 60.6, 7.6, 1);
    lab('ASAL SEKOLAH', 67); val(c.school, 70.6, String(c.school || '').length > 34 ? 6 : 7, 3);
    // QR
    const q = window.qrcode(0, 'M'); q.addData(payload(c)); q.make(); const n = q.getModuleCount(), S = 31, x0 = 51, y0 = 39.5, cell = S / n;
    doc.setFillColor(255, 255, 255); doc.roundedRect(x0 - 2, y0 - 2, S + 4, S + 4, 2, 2, 'F'); doc.setFillColor(...NAVY);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (q.isDark(i, j)) doc.rect(x0 + j * cell, y0 + i * cell, cell + .03, cell + .03, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(90, 110, 150); doc.text('Pindai untuk validasi', x0 + S / 2, y0 + S + 5, { align: 'center' });
    // ID registrasi
    doc.setDrawColor(190, 210, 240); doc.setLineWidth(.2); doc.line(10, 78.5, 80, 78.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4); doc.setTextColor(90, 110, 150); doc.text('NO. PESERTA / ID REGISTRASI', 45, 82.4, { align: 'center' });
    doc.setFont('courier', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...BLUE); doc.text(String(c.id), 45, 89.4, { align: 'center' });
    // pemberitahuan
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...CYAN); doc.text('WAJIB DIBAWA SAAT PELAKSANAAN LOMBA', 45, 99, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.4); doc.setTextColor(210, 228, 255);
    doc.text('Kartu ini akan dipindai panitia dan dinyatakan valid setelah', 45, 102.8, { align: 'center' }); doc.text('pembayaran diverifikasi. Jaga agar QR tidak rusak.', 45, 106, { align: 'center' });
    doc.setFillColor(...CYAN); doc.rect(0, 109, W, 1, 'F');
  }
  async function build(cards, logoUrl) {
    await ensure(); const lg = await logo(logoUrl), { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [90, 110], orientation: 'portrait' });
    cards.forEach((c, i) => { if (i) doc.addPage([90, 110], 'portrait'); draw(doc, c, lg, i + 3); });
    doc.setProperties({ title: 'Kartu Peserta ICMA Cendekia Competition 2026' }); return doc;
  }
  window.ICMA_card = {
    payload,
    async download(cards, filename, logoUrl) { if (!cards.length) throw new Error('Tidak ada kartu untuk dibuat.'); (await build(cards, logoUrl)).save(filename || 'Kartu-Peserta.pdf'); },
    async print(cards, logoUrl) {
      if (!cards.length) throw new Error('Tidak ada kartu untuk dicetak.');
      const w = window.open('', '_blank'); // dibuka segera agar tidak diblokir pop-up
      try { const doc = await build(cards, logoUrl); doc.autoPrint(); const url = doc.output('bloburl'); if (w) w.location.href = url; else doc.save('Kartu-Peserta.pdf'); }
      catch (e) { w?.close(); throw e; }
    }
  };
})();
