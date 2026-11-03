/* script.js — ICMA Cendekia Competition 2026 (public site).
   Alur: config.js (default) -> ambil pengaturan terbaru dari Apps Script -> render. */
(() => {
  'use strict';
  const C = window.ICMA_CONFIG;
  let S = JSON.parse(JSON.stringify(C.settings));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
  const todayJkt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
  const fmtDate = d => new Date(d + 'T00:00:00+07:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const comp = id => S.competitions.find(c => c.id === id);
  const WA_RE = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

  /* ---------- util ---------- */
  function toast(msg, type = 'dark') {
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`; el.role = 'status';
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
    $('#toastBox').appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3200 }); t.show(); el.addEventListener('hidden.bs.toast', () => el.remove());
  }
  const copy = async (text, ok) => { try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } toast(ok, 'success'); };
  const waLink = (msg = '') => S.contact.whatsapp ? `https://wa.me/${S.contact.whatsapp.replace(/\D/g, '')}${msg ? '?text=' + encodeURIComponent(msg) : ''}` : '';
  function openWA(msg) { const l = waLink(msg); l ? window.open(l, '_blank', 'noopener') : toast('Nomor WhatsApp panitia belum diatur.', 'warning'); }

  /* ---------- waves & fees ---------- */
  function currentPeriod() { const t = todayJkt(); return S.periods.find(p => t >= p.start && t <= p.end) || null; }
  function periodStatus() {
    const t = todayJkt(), p = currentPeriod(); if (p) return { open: true, period: p };
    const first = S.periods.reduce((a, b) => a.start < b.start ? a : b), last = S.periods.reduce((a, b) => a.end > b.end ? a : b);
    return { open: false, msg: t < first.start ? `Pendaftaran belum dibuka. Dimulai ${fmtDate(first.start)}.` : t > last.end ? 'Pendaftaran sudah ditutup.' : 'Saat ini tidak ada gelombang pendaftaran yang aktif.' };
  }
  const feeFor = (cid, pid) => S.fees?.[cid]?.[pid];

  /* ---------- render ---------- */
  const ICONS = {
    quran: '<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><path d="M8 14c8-3 17-2 24 3v37c-7-5-16-6-24-3z"/><path d="M56 14c-8-3-17-2-24 3v37c7-5 16-6 24-3z"/><path d="M32 8l3 5-3 5-3-5z" fill="#2EBEFF" stroke="none"/></svg>',
    chat: '<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><path d="M10 12h44v30H30l-12 10V42h-8z"/><text x="32" y="35" text-anchor="middle" fill="#fff" stroke="none" font-size="18" font-weight="700" font-family="Poppins,sans-serif">Aa</text></svg>',
    arab: '<svg viewBox="0 0 64 64"><text x="32" y="46" text-anchor="middle" fill="#fff" font-size="46" font-family="serif">ع</text></svg>',
    ball: '<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"><circle cx="32" cy="32" r="24"/><path d="M32 20l11 8-4 13H25l-4-13z" fill="#2EBEFF" stroke="none"/><path d="M32 8v12M43 28l12-4M39 41l8 10M25 41l-8 10M21 28l-12-4"/></svg>'
  };
  /* Planet CSS (dipakai kartu, orbit hero, lab, dan penutup). Warna ada di style.css (.k-*) */
  const KINDS = ['ocean', 'gas', 'sand', 'forest', 'ice', 'lava'];
  function planetHTML(kind, size, o = {}) {
    return `<span class="pw" style="--s:${size}px">${o.ring ? '<i class="pl-ring back"></i>' : ''}<span class="pl k-${kind}"></span>${o.ring ? '<i class="pl-ring front"></i>' : ''}${o.moon ? '<i class="moon"></i>' : ''}</span>`;
  }
  window.ICMA_planet = planetHTML;
  function renderOrbit() {
    const L = S.competitions.slice(0, 6), N = L.length, el = $('#orbit');
    el.innerHTML = '<div class="sun" aria-hidden="true"><b>ICMA</b></div>' + L.map((c, i) => `<div class="ring" style="--in:${N > 1 ? 30 - i * (28 / (N - 1)) : 10}%;--d:${26 + i * 9}s;--dir:${i % 2 ? 'reverse' : 'normal'};--o:${-(0.12 + i * 0.27).toFixed(2)}"><button type="button" class="opl" data-id="${esc(c.id)}" aria-label="${esc(c.name)}">${planetHTML(KINDS[i % 6], N > 4 ? 40 : 46, { ring: i % 6 === 1 })}<em>${esc(c.name)}</em></button></div>`).join('');
  }
  const priceText = c => { const p = currentPeriod() || S.periods[0]; const f = feeFor(c.id, p?.id); return f == null ? '<span class="text-muted">Biaya menyusul</span>' : `<span class="price">${rupiah(f)} <small>/${esc(c.unit || 'peserta')} · ${esc(p.label)}</small></span>`; };

  function renderCards() {
    $('#cardGrid').innerHTML = S.competitions.map((c, i) => `
      <div class="col-sm-6 col-xl-3" data-aos="fade-up" data-aos-delay="${i * 70}">
        <article class="comp-card" data-id="${esc(c.id)}">
          <div class="comp-art" aria-hidden="true">${planetHTML(KINDS[i % 6], 84, { ring: i % 6 === 1, moon: true })}</div>
          <div class="comp-body">
            <span class="chip align-self-start">${esc(c.type === 'team' ? 'Lomba tim' : 'Lomba individu')}</span>
            <h3>${esc(c.name)}</h3><p>${esc(c.short)}</p>
            <p class="small"><strong>Kategori:</strong> ${esc(c.category)}</p>
            ${priceText(c)}
            <div class="comp-actions">
              <button class="btn btn-outline-primary" data-act="detail" data-id="${esc(c.id)}" type="button">Lihat Detail</button>
              <button class="btn btn-primary" data-act="daftar" data-id="${esc(c.id)}" type="button">Daftar Lomba</button>
            </div>
          </div></article></div>`).join('');
  }
  function renderJuknis() {
    $('#juknisList').innerHTML = S.competitions.map(c => {
      const u = c.juknisUrl, prev = u && /drive\.google\.com\/file\/d\/([^/]+)/.exec(u);
      const preview = prev ? `https://drive.google.com/file/d/${prev[1]}/preview` : u;
      return `<div class="col-md-6"><div class="juknis-item"><div class="pdf-ico">PDF</div>
        <div class="flex-grow-1"><strong>Juknis ${esc(c.name)}</strong>${u ? '' : '<div class="small text-muted">Dokumen resmi belum diunggah panitia.</div>'}</div>
        <div class="d-flex gap-1 flex-wrap justify-content-end">
        ${u ? `<a class="btn btn-outline-primary" href="${esc(preview)}" target="_blank" rel="noopener">Preview</a><a class="btn btn-primary" href="${esc(u)}" target="_blank" rel="noopener" download>Download</a>`
            : `<button class="btn btn-outline-secondary" type="button" data-act="nojuknis">Belum tersedia</button>`}
        </div></div></div>`; }).join('');
  }
  function renderFees() {
    const cur = currentPeriod();
    $('#feeTable').innerHTML = `<thead><tr><th>Cabang</th>${S.periods.map(p => `<th class="${cur?.id === p.id ? 'active-wave' : ''}">${esc(p.label)}<div class="fw-normal small">${fmtDate(p.start).replace(/ 20\d\d$/, '')} – ${fmtDate(p.end).replace(/ 20\d\d$/, '')}</div></th>`).join('')}</tr></thead>
      <tbody>${S.competitions.map(c => `<tr><td>${esc(c.name)}</td>${S.periods.map(p => { const f = feeFor(c.id, p.id); return `<td class="${cur?.id === p.id ? 'active-wave' : ''}">${f == null ? '–' : rupiah(f) + '/' + esc(c.unit || 'peserta')}</td>`; }).join('')}</tr>`).join('')}</tbody>`;
  }
  function renderPayment() {
    const p = S.payment;
    ['payBank', 'payBank2'].forEach(i => $('#' + i).textContent = p.bank);
    ['payName', 'payName2'].forEach(i => $('#' + i).textContent = p.accountName);
    ['payNo', 'payNo2'].forEach(i => $('#' + i).textContent = p.accountNumber);
  }
  function renderTimeline() {
    const t = todayJkt(), items = [];
    S.periods.forEach(p => items.push({ d: p.start, h: `${fmtDate(p.start).replace(/ 20\d\d$/, '')}–${fmtDate(p.end)}`, t: `Pendaftaran ${p.label}`, now: t >= p.start && t <= p.end }));
    if (S.techMeetingDate) items.push({ d: S.techMeetingDate, h: fmtDate(S.techMeetingDate), t: 'Technical Meeting di SMP IT ICMA' });
    items.sort((a, b) => a.d < b.d ? -1 : 1);
    const ev = S.eventDate ? new Date(S.eventDate) : null;
    items.push(ev && !isNaN(ev) ? { h: ev.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }), t: 'Pelaksanaan lomba' } : { h: 'Menunggu konfirmasi panitia', t: 'Pelaksanaan lomba', tbd: true });
    $('#timeline').innerHTML = items.map(i => `<li class="${i.tbd ? 'tbd' : ''} ${i.now ? 'now' : ''}"><b>${esc(i.h)}</b>${esc(i.t)}</li>`).join('');
  }
  function renderFaq() {
    $('#faqAcc').innerHTML = S.faq.map((f, i) => `<div class="accordion-item"><h3 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#fq${i}" aria-expanded="false" aria-controls="fq${i}">${esc(f.q)}</button></h3>
      <div id="fq${i}" class="accordion-collapse collapse" data-bs-parent="#faqAcc"><div class="accordion-body">${esc(f.a)}</div></div></div>`).join('');
  }
  function renderFooter() {
    $('#ftAddress').textContent = S.school.address || 'Alamat sekolah menyusul.';
    const c = S.contact, links = [];
    if (c.whatsapp) links.push(`<a class="btn btn-outline-light" target="_blank" rel="noopener" href="${esc(waLink())}">WhatsApp</a>`);
    [['instagram', 'Instagram'], ['youtube', 'YouTube'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']].forEach(([k, n]) => c[k] && links.push(`<a class="btn btn-outline-light" target="_blank" rel="noopener" href="${esc(c[k])}">${n}</a>`));
    $('#ftContact').innerHTML = links.join('') || '<span class="small opacity-75">Kontak panitia akan diumumkan.</span>';
    const wa = $('#waFloat'); wa.href = waLink('Assalamu’alaikum, saya ingin bertanya tentang ICMA Cendekia Competition 2026.') || '#';
    wa.onclick = e => { if (!S.contact.whatsapp) { e.preventDefault(); toast('Nomor WhatsApp panitia belum diatur.', 'warning'); } };
    const logo = $('#brandLogo'); if (S.school.logo) logo.innerHTML = `<img src="${esc(S.school.logo)}" alt="Logo SMP IT ICMA">`;
  }
  function renderAll() { renderOrbit(); renderCards(); renderJuknis(); renderFees(); renderPayment(); renderTimeline(); renderFaq(); renderFooter(); renderCabangPick(); $$('.maxmb').forEach(e => e.textContent = C.limits.maxFileMB); startCountdown(); if (window.AOS) AOS.refreshHard(); }

  /* ---------- countdown ---------- */
  let cdTimer;
  function startCountdown() {
    clearInterval(cdTimer);
    const target = S.eventDate ? new Date(S.eventDate) : null, row = $('#cdRow'), sub = $('#cdSub'), lab = $('#cdLabel');
    const cell = (v, l) => `<div class="cd-cell"><b>${String(v).padStart(2, '0')}</b><small>${l}</small></div>`;
    const tick = () => {
      if (target && !isNaN(target)) {
        lab.textContent = 'Hitung mundur peluncuran lomba'; const ms = target - Date.now();
        if (ms <= 0) { row.innerHTML = '<div class="cd-pending">Lomba sedang/telah berlangsung</div>'; sub.textContent = ''; return; }
        const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
        row.innerHTML = cell(d, 'hari') + cell(h, 'jam') + cell(m, 'menit') + cell(s, 'detik'); sub.textContent = '';
      } else {
        lab.textContent = 'Jadwal peluncuran lomba'; row.innerHTML = '<div class="cd-pending">Menunggu konfirmasi panitia</div>';
        const p = currentPeriod(); sub.textContent = p ? `${p.label} dibuka sampai ${fmtDate(p.end)}` : '';
      }
    };
    tick(); cdTimer = setInterval(tick, 1000);
  }

  /* ---------- detail modal ---------- */
  let modal, modalComp;
  function openDetail(id) {
    const c = comp(id); if (!c) return; modalComp = c;
    $('#dmTitle').textContent = c.name; $('#dmCat').textContent = c.category;
    const d = c.detail || {}, sec = (t, v) => {
      const empty = !v || (Array.isArray(v) && !v.length), body = empty ? '<span class="placeholder-note">Menunggu informasi dari panitia.</span>' : Array.isArray(v) ? `<ul>${v.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="mb-0">${esc(v)}</p>`;
      return `<div class="detail-sec"><h3>${t}</h3>${body}</div>`; };
    $('#dmBody').innerHTML = sec('Deskripsi lomba', d.deskripsi || c.short) + sec('Tujuan perlombaan', d.tujuan) + sec('Persyaratan peserta', d.persyaratan) + sec('Ketentuan perlombaan', d.ketentuan) + sec('Teknis pelaksanaan', d.teknis) + sec('Materi lomba', d.materi) + sec('Kriteria penilaian', d.penilaian) + sec('Perlengkapan peserta', d.perlengkapan) + sec('Hadiah/penghargaan', d.hadiah);
    const j = $('#dmJuknis'); if (c.juknisUrl) { j.href = c.juknisUrl; j.classList.remove('disabled'); j.removeAttribute('aria-disabled'); j.textContent = 'Download Juknis PDF'; } else { j.removeAttribute('href'); j.classList.add('disabled'); j.setAttribute('aria-disabled', 'true'); j.textContent = 'Juknis belum tersedia'; }
    (modal ||= new bootstrap.Modal('#detailModal')).show();
  }
  function goRegister(id) { selectCabang(id); modal?.hide(); $('#pendaftaran').scrollIntoView({ behavior: 'smooth' }); }

  /* ---------- registration form ---------- */
  /* Dua kategori: "Individu" (1 peserta/tim, dibaca langsung dari form) dan "Sekolah"
     (pembina menambahkan banyak peserta/tim ke daftar F.entries sebelum lanjut). */
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
  const F = { step: 1, kategori: '', cabang: '', players: [], ska: null, file: null, entries: [], idem: uid() };
  const val = id => ($('#' + id)?.value || '').trim();
  const MAXE = () => C.limits.maxEntries || 10;

  function renderCabangPick() {
    $('#cabangPick').innerHTML = S.competitions.map(c => `<div class="col-6"><label class="pick"><input type="radio" name="cabang" value="${esc(c.id)}" ${F.cabang === c.id ? 'checked' : ''}><span>${esc(c.name)}<small>${c.type === 'team' ? 'Tim' : 'Individu'}</small></span></label></div>`).join('');
    $$('input[name=cabang]').forEach(r => r.addEventListener('change', () => selectCabang(r.value)));
  }
  function selectCabang(id) {
    F.cabang = id; const c = comp(id); if (!c) return;
    $$('input[name=cabang]').forEach(r => r.checked = r.value === id);
    $('#blockIndividual').hidden = c.type === 'team'; $('#blockTeam').hidden = c.type !== 'team';
    if (c.type === 'team' && !F.players.length) for (let i = 0; i < C.limits.minPlayers; i++) F.players.push({ nama: '', kelas: '' });
    if (c.type === 'team') { if (!val('f_tsekolah')) $('#f_tsekolah').value = val('f_sekolah'); renderPlayers(); }
  }
  function renderPlayers() {
    $('#playerRows').innerHTML = F.players.map((p, i) => `<div class="player-row"><div><input class="form-control" data-p="nama" data-i="${i}" value="${esc(p.nama)}" placeholder="Nama pemain ${i + 1}" aria-label="Nama pemain ${i + 1}" maxlength="100"></div>
      <select class="form-select" data-p="kelas" data-i="${i}" aria-label="Kelas pemain ${i + 1}"><option value="">Kelas</option>${['Kelas 4', 'Kelas 5', 'Kelas 6'].map(k => `<option ${p.kelas === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
      <button type="button" class="btn btn-outline-danger p-0" data-rm="${i}" aria-label="Hapus pemain ${i + 1}" ${F.players.length <= 1 ? 'disabled' : ''}>×</button></div>`).join('');
    $('#playerCount').textContent = `${F.players.length} pemain (min ${C.limits.minPlayers}, maks ${C.limits.maxPlayers})`;
    $('#addPlayer').disabled = F.players.length >= C.limits.maxPlayers;
  }

  /* --- kategori pendaftar --- */
  function applyKategori() {
    const sek = F.kategori === 'Sekolah';
    $('#entryBox').hidden = !sek || !F.entries.length; $('#btnAddEntry').hidden = !sek;
    $('#step2Legend').textContent = sek ? 'Tambahkan peserta/tim' : 'Pilih cabang lomba';
    renderEntries();
  }
  function setKategori(k) {
    if (k === F.kategori) return;
    if (k === 'Individu' && F.entries.length && !confirm('Daftar peserta yang sudah ditambahkan akan dihapus. Lanjutkan?')) { $$('input[name=kategori]').forEach(r => r.checked = r.value === F.kategori); return; }
    if (k === 'Individu') F.entries = [];
    F.kategori = k; applyKategori();
  }

  /* --- entri (peserta/tim) --- */
  function readEntry() {
    const c = comp(F.cabang); if (!c) return null;
    return c.type === 'team'
      ? { cabang: c.id, team: { nama: val('f_tnama'), sekolah: val('f_tsekolah'), pelatih: val('f_tpelatih'), wa: val('f_twa'), players: F.players.map(p => ({ nama: p.nama.trim(), kelas: p.kelas })) }, ska: F.ska }
      : { cabang: c.id, individual: { nama: val('f_pnama'), jk: val('f_pjk'), kelas: val('f_pkelas'), ttl: val('f_pttl') } };
  }
  const entryName = e => e.team ? e.team.nama : e.individual.nama;
  const getEntries = () => F.kategori === 'Sekolah' ? F.entries : [readEntry()].filter(Boolean);
  function entryHasData() {
    const c = comp(F.cabang); if (!c) return false;
    return c.type === 'team' ? !!(val('f_tnama') || val('f_tpelatih') || val('f_twa') || F.players.some(p => p.nama.trim()) || F.ska) : !!(val('f_pnama') || val('f_pjk') || val('f_pkelas'));
  }
  function resetEntryForm() {
    ['f_pnama', 'f_pjk', 'f_pkelas', 'f_pttl', 'f_tnama', 'f_tsekolah', 'f_tpelatih', 'f_twa', 'f_ska'].forEach(id => $('#' + id).value = '');
    $('#skaInfo').textContent = ''; F.players = []; F.ska = null; F.cabang = '';
    $$('input[name=cabang]').forEach(r => r.checked = false); $('#blockIndividual').hidden = $('#blockTeam').hidden = true;
    $$('#blockIndividual .is-invalid,#blockTeam .is-invalid').forEach(el => setErr(el, ''));
  }
  function renderEntries() {
    $('#entryBox').hidden = F.kategori !== 'Sekolah' || !F.entries.length;
    $('#entryList').innerHTML = F.entries.map((e, i) => { const c = comp(e.cabang); return `<div class="entry-item"><div><b>${i + 1}. ${esc(c?.name)}</b><div class="small text-muted">${esc(entryName(e))}${e.team ? ` · ${e.team.players.length} pemain` : ` · ${esc(e.individual.kelas)}`}</div></div><button type="button" class="btn btn-outline-danger btn-sm" data-rme="${i}" aria-label="Hapus entri ${i + 1}">Hapus</button></div>`; }).join('');
  }
  function addEntry() {
    if (!validateEntry()) return false;
    if (F.entries.length >= MAXE()) { showAlert(`Maksimal ${MAXE()} peserta/tim per pendaftaran.`); return false; }
    F.entries.push(readEntry()); resetEntryForm(); renderEntries(); hideAlert(); toast('Ditambahkan ke daftar.', 'success'); return true;
  }

  function setErr(el, msg) {
    if (!el) return; el.classList.toggle('is-invalid', !!msg);
    const n = el.parentElement.querySelector(':scope > .err'); n?.remove();
    if (msg) { const d = document.createElement('div'); d.className = 'err'; d.textContent = msg; el.insertAdjacentElement('afterend', d); }
  }
  function need(id, label, extra) { const el = $('#' + id), v = el.value.trim(); let m = ''; if (!v) m = `${label} wajib diisi.`; else if (extra) m = extra(v) || ''; setErr(el, m); return !m; }
  const waCheck = v => WA_RE.test(v.replace(/[\s-]/g, '')) ? '' : 'Nomor WhatsApp tidak valid (contoh: 081234567890).';

  /* validasi satu peserta/tim yang sedang diisi di form */
  function validateEntry() {
    let ok = true; const a = r => { if (!r) ok = false; }; hideAlert();
    const c = comp(F.cabang); if (!c) { showAlert('Pilih salah satu cabang lomba.'); return false; }
    if (c.type === 'team') {
      a(need('f_tnama', 'Nama tim')); a(need('f_tsekolah', 'Nama sekolah')); a(need('f_tpelatih', 'Nama pelatih/pendamping')); a(need('f_twa', 'Nomor WhatsApp', waCheck));
      const { minPlayers: mn, maxPlayers: mx } = C.limits; let pm = '';
      F.players.forEach(p => { if (!p.nama.trim() || !p.kelas) pm = 'Lengkapi nama dan kelas semua pemain.'; });
      if (F.players.length < mn) pm = `Jumlah pemain minimal ${mn}.`; if (F.players.length > mx) pm = `Jumlah pemain maksimal ${mx}.`;
      if (!pm && !F.ska) pm = 'Unggah surat keterangan aktif peserta didik/siswa untuk tim Mini Soccer.';
      if (pm) { showAlert(pm); ok = false; }
    } else { a(need('f_pnama', 'Nama lengkap peserta')); a(need('f_pjk', 'Jenis kelamin')); a(need('f_pkelas', 'Kelas')); }
    if (!ok && $('#regAlert').classList.contains('d-none')) showAlert('Periksa kembali isian yang ditandai merah.');
    return ok;
  }
  function validate(step) {
    let ok = true; const a = r => { if (!r) ok = false; };
    if (step === 1) {
      if (!F.kategori) { showAlert('Pilih kategori pendaftar terlebih dahulu.'); return false; }
      a(need('f_sekolah', 'Nama sekolah')); a(need('f_alamat', 'Alamat sekolah')); a(need('f_kec', 'Kecamatan')); a(need('f_kab', 'Kabupaten/Kota'));
    }
    if (step === 2) {
      let r;
      if (F.kategori === 'Sekolah') {
        r = !entryHasData() || addEntry();
        if (r && !F.entries.length) { showAlert('Tambahkan minimal satu peserta atau tim ke daftar.'); r = false; }
      } else r = validateEntry();
      if (r) hideAlert(); return r;
    }
    if (step === 3) { a(need('f_gnama', 'Nama pendamping')); a(need('f_gwa', 'Nomor WhatsApp', waCheck)); const e = $('#f_gemail'); if (e.value.trim()) { const m = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.value.trim()) ? '' : 'Format email tidak valid.'; setErr(e, m); if (m) ok = false; } }
    if (step === 4) {
      const st = periodStatus(); if (!st.open) { showAlert(st.msg); return false; }
      const t = totalInfo(); if (t?.miss) { showAlert('Biaya salah satu cabang belum diatur panitia. Hubungi panitia.'); return false; }
      if (!F.file) { showAlert('Unggah bukti transfer terlebih dahulu.'); ok = false; } else if (!$('#f_setuju').checked) { showAlert('Centang persetujuan data untuk melanjutkan.'); ok = false; }
    }
    if (!ok && step !== 4) showAlert('Periksa kembali isian yang ditandai merah.');
    else if (ok) hideAlert();
    return ok;
  }
  function showAlert(m, type = 'danger') { const a = $('#regAlert'); a.className = `alert alert-${type}`; a.textContent = m; a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  function hideAlert() { $('#regAlert').className = 'alert d-none'; }

  function goStep(n, scroll = true) {
    F.step = n; hideAlert();
    $$('fieldset.step').forEach(f => f.hidden = +f.dataset.step !== n);
    $$('#stepper li').forEach((li, i) => { li.classList.toggle('active', i + 1 === n); li.classList.toggle('done', i + 1 < n); });
    $('#btnPrev').style.visibility = n === 1 ? 'hidden' : 'visible';
    $('#btnNext').hidden = n === 5; $('#btnSubmit').hidden = n !== 5;
    if (n === 3) {
      const sek = F.kategori === 'Sekolah';
      $('fieldset[data-step="3"] legend').textContent = sek ? 'Data guru pembina' : 'Data pendamping';
      $('label[for=f_gnama]').textContent = (sek ? 'Nama guru pembina' : 'Nama guru/pendamping') + ' *';
      const last = F.entries[F.entries.length - 1]; const t = last?.team || (comp(F.cabang)?.type === 'team' ? { pelatih: val('f_tpelatih'), wa: val('f_twa') } : null);
      if (t) { if (!val('f_gnama')) $('#f_gnama').value = t.pelatih || ''; if (!val('f_gwa')) $('#f_gwa').value = t.wa || ''; }
    }
    if (n === 4) updatePay(); if (n === 5) renderSummary();
    if (scroll) $('#regShell').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function handleNext() { if (validate(F.step)) goStep(F.step + 1); }

  /* total biaya = jumlah biaya semua entri pada gelombang yang sedang berjalan */
  function totalInfo() {
    const st = periodStatus(); if (!st.open) return null;
    let total = 0, miss = false; const by = {};
    getEntries().forEach(e => { const f = feeFor(e.cabang, st.period.id); if (f == null) miss = true; else total += f; const b = by[e.cabang] ||= { n: 0, f }; b.n++; });
    return { period: st.period, total, miss, by };
  }
  function updatePay() {
    const t = totalInfo(); $('#payWave').textContent = t ? t.period.label : 'Ditutup';
    $('#payAmount').textContent = t && !t.miss ? rupiah(t.total) : '–';
    $('#payBreak').innerHTML = t ? Object.entries(t.by).map(([id, b]) => `<div>${esc(comp(id)?.name)}: ${b.n} ${esc(comp(id)?.unit || 'peserta')} × ${b.f == null ? '–' : rupiah(b.f)}</div>`).join('') : '';
    if (!t) showAlert(periodStatus().msg);
  }

  function renderSummary() {
    const t = totalInfo(), row = (k, v) => `<dt>${k}</dt><dd>${esc(v || '–')}</dd>`, list = getEntries();
    let h = `<div class="sum-title">Kategori pendaftar</div><dl class="sum-grid">${row('Kategori', F.kategori === 'Sekolah' ? 'Pendaftar dari Sekolah' : 'Pendaftar Individu')}</dl>`;
    h += `<div class="sum-title">Sekolah</div><dl class="sum-grid">${row('Nama sekolah', val('f_sekolah'))}${row('Alamat', val('f_alamat'))}${row('Kecamatan', val('f_kec'))}${row('Kabupaten/Kota', val('f_kab'))}${row('Kepala sekolah', val('f_kepsek'))}</dl>`;
    list.forEach((e, i) => {
      const c = comp(e.cabang); h += `<div class="sum-title">${list.length > 1 ? `${i + 1}. ` : ''}Lomba: ${esc(c.name)}</div><dl class="sum-grid">`;
      if (e.team) h += row('Nama tim', e.team.nama) + row('Pelatih', e.team.pelatih) + row('WhatsApp', e.team.wa) + row('Pemain', e.team.players.map((p, k) => `${k + 1}. ${p.nama} (${p.kelas})`).join('; ')) + row('Surat ket. aktif', e.ska?.name);
      else h += row('Nama peserta', e.individual.nama) + row('Jenis kelamin', e.individual.jk) + row('Kelas', e.individual.kelas) + row('TTL', e.individual.ttl);
      h += '</dl>';
    });
    h += `<div class="sum-title">${F.kategori === 'Sekolah' ? 'Guru pembina' : 'Pendamping'}</div><dl class="sum-grid">${row('Nama', val('f_gnama'))}${row('WhatsApp', val('f_gwa'))}${row('Email', val('f_gemail'))}</dl>`;
    h += `<div class="sum-title">Pembayaran</div><dl class="sum-grid">${row('Gelombang', t?.period.label)}${row('Jumlah entri', String(list.length))}${row('Total', t && !t.miss ? rupiah(t.total) : '')}${row('Bukti transfer', F.file?.name)}</dl>`;
    $('#summary').innerHTML = h;
  }

  const readFile = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = () => rej(new Error('Gagal membaca file.')); r.readAsDataURL(file); });
  /* validasi berkas unggahan (format & ukuran) -> File atau null */
  function pickFile(input, info) {
    const f = input.files[0]; info.className = 'small mt-1'; info.textContent = ''; if (!f) return null;
    const okType = /\.(jpe?g|png|pdf)$/i.test(f.name) && /^(image\/(jpeg|png)|application\/pdf)$/.test(f.type);
    if (!okType) { info.classList.add('text-danger'); info.textContent = 'Format harus JPG, JPEG, PNG, atau PDF.'; input.value = ''; return null; }
    if (f.size > C.limits.maxFileMB * 1048576) { info.classList.add('text-danger'); info.textContent = `Ukuran file maksimal ${C.limits.maxFileMB} MB.`; input.value = ''; return null; }
    info.classList.add('text-success'); info.textContent = `${f.name} (${(f.size / 1024).toFixed(0)} KB)`; return f;
  }
  const onFile = e => { F.file = pickFile(e.target, $('#fileInfo')); };
  const onSka = e => { F.ska = pickFile(e.target, $('#skaInfo')); };
  const fileData = async f => ({ name: f.name, mime: f.type, data: await readFile(f) });

  let submitting = false;
  async function submit(e) {
    e.preventDefault(); if (submitting) return;
    for (let s = 1; s <= 4; s++) if (!validate(s)) { goStep(s); return; }
    if (!C.appsScriptUrl) { showAlert('Sistem pendaftaran belum terhubung ke server. Hubungi panitia atau pengelola website (URL Apps Script belum diisi).'); return; }
    const list = getEntries(), files = [F.file, ...list.map(x => x.ska).filter(Boolean)];
    if (files.reduce((a, f) => a + f.size, 0) > 8 * 1048576) { showAlert('Total ukuran berkas terlalu besar (maks. 8 MB). Kurangi ukuran berkas atau daftarkan dalam beberapa pendaftaran.'); return; }
    submitting = true; $('#btnSubmit').disabled = true; $('#busy').hidden = false;
    try {
      const payload = {
        action: 'register', idemKey: F.idem, kategori: F.kategori,
        school: { nama: val('f_sekolah'), alamat: val('f_alamat'), kecamatan: val('f_kec'), kabupaten: val('f_kab'), kepsek: val('f_kepsek') },
        entries: await Promise.all(list.map(async x => ({ ...x, ska: x.ska ? await fileData(x.ska) : undefined }))),
        pendamping: { nama: val('f_gnama'), wa: val('f_gwa'), email: val('f_gemail') },
        proof: await fileData(F.file)
      };
      const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 90000);
      const res = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
      clearTimeout(to); const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'Pendaftaran gagal diproses.');
      $('#regForm').hidden = true; $('#stepper').hidden = true; hideAlert(); $('#regDone').hidden = false; $('#regId').textContent = out.id; F.doneId = out.id;
      F.cards = list.map((x, i) => ({ id: out.cards[i].id, sig: out.cards[i].sig, name: entryName(x), gender: x.team ? `Tim · ${x.team.players.length} pemain` : x.individual.jk, genderLabel: x.team ? 'KATEGORI' : 'JENIS KELAMIN', school: val('f_sekolah'), cabang: comp(x.cabang).name }));
      renderDone(out, list);
      toast('Pendaftaran berhasil dikirim.', 'success'); $('#regShell').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showAlert(err.name === 'AbortError' ? 'Koneksi terlalu lama. Periksa internet lalu kirim ulang (data tidak akan terdaftar ganda).' : (err.message === 'Failed to fetch' ? 'Tidak dapat terhubung ke server. Periksa internet Anda lalu coba lagi.' : err.message));
    } finally { submitting = false; $('#btnSubmit').disabled = false; $('#busy').hidden = true; }
  }
  /* setelah berhasil: daftar kartu peserta + tombol grup WhatsApp tiap lomba (link dari server, hanya muncul setelah mendaftar) */
  function renderDone(out, list) {
    $('#cardList').innerHTML = F.cards.map((c, i) => `<div class="entry-item"><div><b>${esc(c.name)}</b><div class="small text-muted">${esc(c.cabang)} · ${esc(c.id)}</div></div><button type="button" class="btn btn-outline-primary btn-sm" data-ci="${i}">Unduh</button></div>`).join('');
    const seen = new Set(), gl = [];
    list.forEach(x => { if (seen.has(x.cabang)) return; seen.add(x.cabang); const l = out.groups?.[x.cabang]; if (l && /^https:\/\//.test(l)) gl.push(`<a class="btn btn-wa" href="${esc(l)}" target="_blank" rel="noopener">Gabung Grup WhatsApp ${esc(comp(x.cabang).name)}</a>`); });
    $('#waGroups').innerHTML = gl.length ? `<div class="small mb-2">Gabung grup WhatsApp lomba untuk informasi dari panitia:</div><div class="d-flex flex-wrap gap-2 justify-content-center">${gl.join('')}</div>` : '<div class="small text-muted">Link grup WhatsApp lomba akan diinformasikan oleh panitia.</div>';
  }
  const cardAct = async fn => { try { await fn(); } catch (e) { toast(e.message, 'danger'); } };
  function resetForm() {
    $('#regForm').reset(); $('#regForm').hidden = false; $('#stepper').hidden = false; $('#regDone').hidden = true;
    Object.assign(F, { step: 1, kategori: '', cabang: '', players: [], ska: null, file: null, entries: [], idem: uid() });
    $('#blockIndividual').hidden = $('#blockTeam').hidden = true; $('#fileInfo').textContent = ''; $('#skaInfo').textContent = '';
    renderCabangPick(); applyKategori(); goStep(1);
  }

  /* ---------- settings from server ---------- */
  function merge(base, over) { Object.keys(over || {}).forEach(k => { base[k] = (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? { ...base[k], ...over[k] } : over[k]; }); return base; }
  async function loadRemote() {
    if (!C.appsScriptUrl) return;
    try { const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000); const r = await fetch(C.appsScriptUrl + '?action=settings', { signal: ctrl.signal }); clearTimeout(t); const j = await r.json(); if (j.ok && j.settings) { merge(S, j.settings); renderAll(); } } catch { /* pakai default config.js */ }
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderAll(); goStep(1, false);
    $('#kabDefault')?.remove(); $('#f_kab').value = S.school.kabupatenDefault || '';
    if (window.AOS) AOS.init({ duration: 600, once: true, offset: 60, disable: matchMedia('(prefers-reduced-motion: reduce)').matches });
    const nav = $('#mainNav'), onScroll = () => nav.classList.toggle('scrolled', scrollY > 30); onScroll(); addEventListener('scroll', onScroll, { passive: true });
    $$('#navMenu .nav-link').forEach(a => a.addEventListener('click', () => bootstrap.Collapse.getInstance($('#navMenu'))?.hide()));
    $('#orbit').addEventListener('click', e => { const b = e.target.closest('.opl'); if (b) openDetail(b.dataset.id); });
    $('#cardGrid').addEventListener('click', e => { const b = e.target.closest('[data-act]'); const card = e.target.closest('.comp-card'); if (b?.dataset.act === 'daftar') return goRegister(b.dataset.id); if (b?.dataset.act === 'detail') return openDetail(b.dataset.id); if (card) openDetail(card.dataset.id); });
    $('#juknisList').addEventListener('click', e => { if (e.target.closest('[data-act=nojuknis]')) toast('Juknis resmi belum diunggah panitia.', 'warning'); });
    $('#dmDaftar').addEventListener('click', () => modalComp && goRegister(modalComp.id));
    $('#dmJuknis').addEventListener('click', e => { if (e.currentTarget.classList.contains('disabled')) e.preventDefault(); });
    $('#btnCopyAcc').addEventListener('click', () => copy(S.payment.accountNumber, 'Nomor rekening disalin.'));
    $('#btnConfirmPay').addEventListener('click', () => S.contact.whatsapp ? openWA('Assalamu’alaikum, saya ingin konfirmasi pembayaran ICMA Cendekia Competition 2026.\nNo. registrasi: ') : (toast('Nomor WhatsApp belum diatur. Unggah bukti transfer lewat formulir pendaftaran.', 'warning'), $('#pendaftaran').scrollIntoView({ behavior: 'smooth' })));
    $('#btnNext').addEventListener('click', handleNext);
    $$('input[name=kategori]').forEach(r => r.addEventListener('change', () => setKategori(r.value)));
    $('#btnAddEntry').addEventListener('click', addEntry);
    $('#entryList').addEventListener('click', e => { const i = e.target.dataset.rme; if (i !== undefined) { F.entries.splice(+i, 1); renderEntries(); } });
    $('#f_ska').addEventListener('change', onSka);
    $('#btnPrev').addEventListener('click', () => goStep(F.step - 1));
    $('#regForm').addEventListener('submit', submit);
    $('#regForm').addEventListener('input', e => { if (e.target.classList.contains('is-invalid')) setErr(e.target, ''); const d = e.target.dataset; if (d.p) F.players[+d.i][d.p] = e.target.value; });
    $('#playerRows').addEventListener('click', e => { const i = e.target.dataset.rm; if (i !== undefined) { F.players.splice(+i, 1); renderPlayers(); } });
    $('#addPlayer').addEventListener('click', () => { if (F.players.length < C.limits.maxPlayers) { F.players.push({ nama: '', kelas: '' }); renderPlayers(); } });
    $('#f_bukti').addEventListener('change', onFile);
    $('#dlCards').addEventListener('click', () => cardAct(() => ICMA_card.download(F.cards, `Kartu-Peserta-${F.doneId}.pdf`, S.school.logo)));
    $('#prCards').addEventListener('click', () => cardAct(() => ICMA_card.print(F.cards, S.school.logo)));
    $('#cardList').addEventListener('click', e => { const i = e.target.dataset.ci; if (i !== undefined) cardAct(() => ICMA_card.download([F.cards[+i]], `Kartu-${F.cards[+i].id}.pdf`, S.school.logo)); });
    $('#copyRegId').addEventListener('click', () => copy(F.doneId, 'Nomor registrasi disalin.'));
    $('#waConfirm').addEventListener('click', () => openWA(`Assalamu’alaikum, saya sudah mendaftar ICMA Cendekia Competition 2026.\nNo. registrasi: ${F.doneId}`));
    $('#newReg').addEventListener('click', resetForm);
    addEventListener('beforeunload', e => { if (F.step > 1 && !submitting && !$('#regForm').hidden && ($('#f_sekolah').value)) { e.preventDefault(); e.returnValue = ''; } });
    loadRemote();
    setTimeout(() => $('#loader').classList.add('done'), 500);
  });
})();
