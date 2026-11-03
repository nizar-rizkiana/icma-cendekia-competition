/* admin.js — Dashboard admin. Autentikasi diverifikasi SERVER (Apps Script); tidak ada password di sini.
   Token sesi disimpan di sessionStorage (hilang saat tab ditutup, kedaluwarsa 6 jam di server). */
(() => {
  'use strict';
  const C = window.ICMA_CONFIG, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  let TOKEN = sessionStorage.getItem('icma_tok') || '', D = { registrasi: [], peserta: [], tim: [], payStatuses: [], regStatuses: [] }, S = JSON.parse(JSON.stringify(C.settings)), dModal;

  async function api(action, data = {}) {
    if (!C.appsScriptUrl) throw new Error('URL Apps Script belum diisi di config.js.');
    const r = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: TOKEN, ...data }) });
    const j = await r.json();
    if (!j.ok) { if (j.code === 'AUTH') logout(true); throw new Error(j.error || 'Permintaan gagal.'); }
    return j;
  }
  function note(m, t = 'danger') { const a = $('#alertBox'); a.className = `alert alert-${t}`; a.textContent = m; if (t !== 'danger') setTimeout(() => a.className = 'alert d-none', 3000); }
  const merge = (b, o) => { Object.keys(o || {}).forEach(k => b[k] = (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? { ...b[k], ...o[k] } : o[k]); return b; };

  /* ---------- login ---------- */
  function show(on) { $('#loginView').hidden = on; $('#appView').hidden = !on; }
  async function enter() { show(true); await load(); }
  function logout(silent) { if (!silent && TOKEN) api('logout').catch(() => {}); TOKEN = ''; sessionStorage.removeItem('icma_tok'); show(false); if (silent) $('#loginErr').textContent = 'Sesi berakhir. Silakan login kembali.'; }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#loginBtn'); b.disabled = true; b.textContent = 'Memeriksa…'; $('#loginErr').textContent = '';
    try { const j = await api('login', { password: $('#pw').value }); TOKEN = j.token; sessionStorage.setItem('icma_tok', TOKEN); $('#pw').value = ''; await enter(); }
    catch (err) { $('#loginErr').textContent = err.message === 'Failed to fetch' ? 'Tidak dapat terhubung ke server.' : err.message; }
    finally { b.disabled = false; b.textContent = 'Masuk'; }
  });
  $('#btnLogout').addEventListener('click', () => logout());
  $('#btnRefresh').addEventListener('click', load); $('#btnRefresh2').addEventListener('click', load);

  /* ---------- load ---------- */
  async function load() {
    try {
      D = await api('list');
      try { const j = await api('getSettings'); merge(S, j.settings); } catch { }
      renderAll(); $('#syncTime').textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (err) { note(err.message); }
  }
  function renderAll() { renderDash(); fillFilters(); renderReg(); renderPeserta(); renderTim(); renderSekolah(); renderSettings(); }

  /* ---------- dashboard: KPI + visualisasi SVG/CSS (tanpa library) ---------- */
  const PAL = ['#1b8bd8', '#7b7bef', '#e0a15a', '#2fc2a0', '#8fc4f0', '#ef6a55']; // warna planet cabang, sama dengan website utama
  const PAYC = { 'Terverifikasi': '#2fd3a0', 'Belum Diverifikasi': '#ffc857', 'Ditolak': '#ff7a8a' };
  const stCls = v => v === 'Terverifikasi' || v === 'Diterima' ? 's-ok' : v === 'Ditolak' || v === 'Dibatalkan' ? 's-no' : 's-wait';
  const grpId = r => r['ID Grup'] || r['ID Registrasi'];
  const countBy = (arr, k) => arr.reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
  const empty = '<div class="empty">Belum ada data.</div>';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function groups() { // satu baris per pendaftaran (grup); entri dalam grup yang sama digabung
    const m = new Map();
    D.registrasi.forEach(r => { const g = grpId(r), o = m.get(g) || { id: g, first: r['ID Registrasi'], school: r['Nama Sekolah'], kat: r['Kategori Pendaftar'] || 'Individu', ts: String(r['Timestamp']), n: 0, fee: 0, pay: r['Status Pembayaran'] }; o.n++; o.fee += Number(r['Biaya'] || 0); m.set(g, o); });
    return [...m.values()];
  }
  const kpi = (l, n, sub, suf = '') => `<div class="kpi"><span class="kpi-l">${l}</span><b data-n="${n}" data-suf="${suf}">${n}${suf}</b><span class="kpi-s">${sub}</span></div>`;
  function countUp() { $$('[data-n]').forEach(el => { const n = +el.dataset.n, suf = el.dataset.suf || ''; if (calm) return; const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 800); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(f); })(t0); }); }

  function donut(items, center, sub, go) {
    const tot = items.reduce((a, i) => a + i.v, 0), r = 54, c = 2 * Math.PI * r; let off = 0;
    const segs = items.filter(i => i.v > 0).map(i => { const len = i.v / tot * c, s = `<circle class="seg" r="${r}" cx="70" cy="70" fill="none" stroke="${i.c}" stroke-width="16" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" ${go ? `data-go="${go}|${esc(i.l)}"` : ''}><title>${esc(i.l)}: ${i.v}</title></circle>`; off += len; return s; }).join('');
    return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(sub)}"><circle r="${r}" cx="70" cy="70" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16"/>${segs}<text x="70" y="70" text-anchor="middle" class="dn">${center}</text><text x="70" y="86" text-anchor="middle" class="ds">${esc(sub)}</text></svg>
      <ul class="legend">${items.map(i => `<li><i style="background:${i.c}"></i>${esc(i.l)} <b>${i.v}</b></li>`).join('')}</ul></div>`;
  }
  function hbars(rows, go) { // rows: [{l, v, c, e}]
    const mx = Math.max(1, ...rows.map(r => r.v));
    return rows.map(r => `<${go ? 'button type="button"' : 'div'} class="brow" ${go ? `data-go="${go}|${esc(r.l)}" title="Saring tabel: ${esc(r.l)}"` : ''}><span>${esc(r.l)}</span><div class="bar"><i style="width:${r.v / mx * 100}%;background:linear-gradient(90deg,${r.c},${r.c}aa)"></i></div><span><b>${r.v}</b> <em>${esc(r.e || '')}</em></span></${go ? 'button' : 'div'}>`).join('') || empty;
  }
  function trend(G) {
    if (!G.length) return empty;
    const by = {}; G.forEach(g => { const d = g.ts.slice(0, 10); by[d] = (by[d] || 0) + 1; });
    const days = Object.keys(by).sort(), list = [], fmt = d => [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
    for (let d = new Date(days[0] + 'T00:00:00'); fmt(d) <= days[days.length - 1] && list.length < 90; d.setDate(d.getDate() + 1)) list.push([fmt(d), by[fmt(d)] || 0]);
    let cum = 0; const cs = list.map(x => cum += x[1]), W = 600, H = 190, pl = 26, pr = 30, pt = 12, pb = 24, n = list.length, bw = (W - pl - pr) / n, mx = Math.max(...list.map(x => x[1])), tot = cum;
    const X = i => pl + bw * i + bw / 2, Yb = v => pt + (H - pt - pb) * (1 - v / mx), Yc = v => pt + (H - pt - pb) * (1 - v / tot);
    const short = d => d.slice(8) + '/' + d.slice(5, 7);
    return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik pendaftaran per hari">
      <line x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}" stroke="rgba(255,255,255,.15)"/>
      ${list.map((x, i) => `<rect class="bar-d" x="${X(i) - bw * .3}" y="${Yb(x[1])}" width="${bw * .6}" height="${H - pb - Yb(x[1])}" rx="3"><title>${short(x[0])}: ${x[1]} pendaftaran</title></rect>`).join('')}
      <polyline class="line-c" points="${cs.map((v, i) => `${X(i)},${Yc(v)}`).join(' ')}"/>
      <text x="${pl - 4}" y="${pt + 8}" text-anchor="end">${mx}</text><text x="${W - pr + 4}" y="${pt + 8}">${tot}</text>
      <text x="${pl}" y="${H - 6}">${short(list[0][0])}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${short(list[n - 1][0])}</text></svg>`;
  }

  function renderDash() {
    const R = D.registrasi, G = groups(), ver = R.filter(r => r['Status Pembayaran'] === 'Terverifikasi'), sek = G.filter(g => g.kat === 'Sekolah').length;
    const schools = new Set(R.map(r => String(r['Nama Sekolah']).trim().toLowerCase())).size, sum = a => a.reduce((t, r) => t + Number(r['Biaya'] || 0), 0);
    const pct = R.length ? Math.round(ver.length / R.length * 100) : 0, pes = D.peserta.length + D.tim.length;
    $('#kpis').innerHTML = kpi('Total pendaftaran', G.length, `${sek} sekolah · ${G.length - sek} individu`) + kpi('Peserta / tim', R.length, `${pes} anak terdata`) + kpi('Sekolah', schools, 'asal peserta') + kpi('Pembayaran terverifikasi', pct, `${rupiah(sum(ver))} dari ${rupiah(sum(R))}`, '%');
    countUp();
    // status pembayaran
    const pc = countBy(R, 'Status Pembayaran');
    $('#chPay').innerHTML = R.length ? donut(Object.keys(PAYC).map(k => ({ l: k, v: pc[k] || 0, c: PAYC[k] })), R.length, 'entri', 'fPay') : empty;
    // per cabang
    const cc = countBy(R, 'Cabang Lomba'), pes2 = {}; D.peserta.forEach(p => pes2[p['Cabang Lomba']] = (pes2[p['Cabang Lomba']] || 0) + 1); D.tim.forEach(p => { const r = R.find(x => x['ID Registrasi'] === p['ID Registrasi']); if (r) pes2[r['Cabang Lomba']] = (pes2[r['Cabang Lomba']] || 0) + 1; });
    $('#chCab').innerHTML = hbars(Object.keys(cc).map((k, i) => ({ l: k, v: cc[k], c: PAL[i % PAL.length], e: `entri · ${pes2[k] || 0} anak` })), 'fCab');
    // kategori + gelombang
    const wc = countBy(R, 'Gelombang');
    $('#chKat').innerHTML = G.length ? donut([{ l: 'Individu', v: G.length - sek, c: '#2EBEFF' }, { l: 'Sekolah', v: sek, c: '#7b7bef' }], G.length, 'pendaftaran', 'fKat') + '<div class="sub-t">Entri per gelombang</div>' + hbars(Object.keys(wc).map((k, i) => ({ l: k, v: wc[k], c: PAL[(i + 3) % PAL.length] })), 'fWave') : empty;
    // sekolah teratas
    const sm = {}; R.forEach(r => { const k = String(r['Nama Sekolah']).trim().toLowerCase(); (sm[k] ||= { l: r['Nama Sekolah'], v: 0, c: '#2EBEFF' }).v++; });
    $('#chSch').innerHTML = hbars(Object.values(sm).sort((a, b) => b.v - a.v).slice(0, 5).map(s => ({ ...s, e: 'entri' })));
    // tren harian
    $('#chTrend').innerHTML = trend(G);
    // antrian verifikasi
    const q = G.filter(g => g.pay === 'Belum Diverifikasi').sort((a, b) => a.ts < b.ts ? -1 : 1);
    $('#queue').innerHTML = q.length ? q.slice(0, 6).map(g => `<div class="qrow"><div class="t"><b>${esc(g.school)}</b><small>${esc(g.id)} · ${g.n} entri · ${rupiah(g.fee)} · ${esc(g.ts.slice(0, 16))}</small></div><div class="d-flex gap-2"><button class="btn btn-outline-primary" data-detail="${esc(g.first)}" type="button">Bukti</button><button class="btn btn-cyan" data-verify="${esc(g.first)}" data-school="${esc(g.school)}" type="button">Verifikasi</button></div></div>`).join('') + (q.length > 6 ? `<div class="small text-muted pt-2">+${q.length - 6} lainnya · <a href="#" data-go="fPay|Belum Diverifikasi">lihat semua</a></div>` : '') : '<div class="empty">Semua pembayaran sudah diverifikasi.</div>';
    // aktivitas terbaru
    $('#recent').innerHTML = G.slice().sort((a, b) => a.ts < b.ts ? 1 : -1).slice(0, 6).map(g => `<div class="qrow"><div class="t"><b>${esc(g.school)}</b><small>${g.n} entri · ${esc(g.ts.slice(0, 16))}</small></div><span class="pill k">${esc(g.kat)}</span></div>`).join('') || empty;
  }
  /* klik elemen grafik -> saring tabel pendaftar */
  function goFilter(sel, v) { $('#q').value = ''; ['fCab', 'fWave', 'fPay', 'fKat'].forEach(i => $('#' + i).value = ''); $('#' + sel).value = v; renderReg(); switchTab('reg'); }
  async function verifyGroup(first, school) {
    if (!confirm(`Tandai pembayaran "${school}" sebagai Terverifikasi?`)) return;
    try { await api('updateStatus', { id: first, field: 'payment', value: 'Terverifikasi' }); await load(); note('Pembayaran diverifikasi.', 'success'); } catch (err) { note(err.message); }
  }
  $('[data-pane=dash]').addEventListener('click', e => {
    const go = e.target.closest('[data-go]'), d = e.target.closest('[data-detail]'), v = e.target.closest('[data-verify]');
    if (go) { e.preventDefault(); const [s, val] = go.dataset.go.split('|'); goFilter(s, val); } else if (d) openDetail(d.dataset.detail); else if (v) verifyGroup(v.dataset.verify, v.dataset.school);
  });
  const TITLES = { dash: 'Pusat Kendali', reg: 'Data Pendaftar', peserta: 'Data Peserta', tim: 'Tim Mini Soccer', sekolah: 'Data Sekolah', set: 'Pengaturan' };
  function switchTab(name) { $$('#tabs .nav-item').forEach(x => x.classList.toggle('active', x.dataset.tab === name)); $$('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== name); $('#topTitle').textContent = TITLES[name]; scrollTo({ top: 0 }); }

  /* bintang latar (sama dengan website utama, versi ringan) */
  function stars() {
    const c = $('#stars'), g = c.getContext('2d'); let W, H, S = [];
    const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; S = Array.from({ length: W < 600 ? 60 : 120 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, p: Math.random() * 6 })); draw(0); };
    function draw(t) { g.clearRect(0, 0, W, H); S.forEach(s => { g.globalAlpha = calm ? .7 * s.z : (.3 + .7 * Math.abs(Math.sin(t / 1100 * s.z + s.p))) * s.z; g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, s.z * 1.3, 0, 6.283); g.fill(); }); if (!calm) requestAnimationFrame(draw); }
    size(); addEventListener('resize', size);
  }

  /* ---------- pendaftar ---------- */
  const opt = (arr, all) => `<option value="">${all}</option>` + arr.map(x => `<option>${esc(x)}</option>`).join('');
  function fillFilters() {
    const keep = ['fCab', 'fWave', 'fPay', 'fKat'].map(i => $('#' + i).value);
    $('#fCab').innerHTML = opt([...new Set(D.registrasi.map(r => r['Cabang Lomba']))], 'Semua cabang');
    $('#fWave').innerHTML = opt([...new Set(D.registrasi.map(r => r['Gelombang']))], 'Semua gelombang');
    $('#fPay').innerHTML = opt(D.payStatuses || [], 'Semua status bayar');
    $('#fKat').innerHTML = opt(['Individu', 'Sekolah'], 'Semua kategori');
    ['fCab', 'fWave', 'fPay', 'fKat'].forEach((i, n) => $('#' + i).value = keep[n]);
  }
  const filtered = () => { const q = $('#q').value.toLowerCase(), c = $('#fCab').value, w = $('#fWave').value, p = $('#fPay').value, k = $('#fKat').value; return D.registrasi.filter(r => (!k || r['Kategori Pendaftar'] === k) && (!c || r['Cabang Lomba'] === c) && (!w || r['Gelombang'] === w) && (!p || r['Status Pembayaran'] === p) && (!q || Object.values(r).slice(0, 12).join(' ').toLowerCase().includes(q))); };
  function renderReg() {
    const rows = filtered();
    $('#regTable').innerHTML = `<thead><tr><th>ID</th><th>Grup</th><th>Kategori</th><th>Waktu</th><th>Sekolah</th><th>Cabang</th><th>Peserta/Tim</th><th>WA</th><th>Gel.</th><th>Biaya</th><th>Bayar</th><th>Status</th><th></th></tr></thead><tbody>` + rows.map(r => `<tr>
      <td class="mono">${esc(r['ID Registrasi'])}</td><td class="mono">${esc(r['ID Grup'])}</td><td>${esc(r['Kategori Pendaftar'])}</td><td>${esc(r['Timestamp'])}</td><td>${esc(r['Nama Sekolah'])}</td><td>${esc(r['Cabang Lomba'])}</td><td>${esc(r['Nama Peserta/Tim'])}</td><td>${esc(r['WhatsApp'])}</td><td>${esc(r['Gelombang'])}</td><td>${rupiah(r['Biaya'])}</td>
      <td>${sel(r['ID Registrasi'], 'payment', D.payStatuses, r['Status Pembayaran'])}</td><td>${sel(r['ID Registrasi'], 'registration', D.regStatuses, r['Status Pendaftaran'])}</td>
      <td class="text-nowrap"><button class="btn btn-outline-primary btn-sm" data-detail="${esc(r['ID Registrasi'])}" type="button">Detail</button> <button class="btn btn-outline-primary btn-sm" data-card="${esc(r['ID Registrasi'])}" type="button">Kartu</button></td></tr>`).join('') + '</tbody>';
    $('#regCount').textContent = `${rows.length} dari ${D.registrasi.length} pendaftar`;
  }
  const sel = (id, f, list, cur) => `<select class="form-select form-select-sm ${stCls(cur)}" data-id="${esc(id)}" data-f="${f}" aria-label="${f} ${esc(id)}">${(list || []).map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  $('#regTable').addEventListener('change', async e => {
    const s = e.target.closest('select[data-f]'); if (!s) return; s.disabled = true;
    try { await api('updateStatus', { id: s.dataset.id, field: s.dataset.f, value: s.value }); const r = D.registrasi.find(x => x['ID Registrasi'] === s.dataset.id); r[s.dataset.f === 'payment' ? 'Status Pembayaran' : 'Status Pendaftaran'] = s.value; s.className = 'form-select form-select-sm ' + stCls(s.value); renderDash(); if (s.dataset.f === 'payment') await load(); note('Status diperbarui.', 'success'); }
    catch (err) { note(err.message); await load(); } finally { s.disabled = false; }
  });
  $('#regTable').addEventListener('click', e => { const b = e.target.closest('[data-detail]'), k = e.target.closest('[data-card]'); if (b) openDetail(b.dataset.detail); if (k) printCards([D.registrasi.find(x => x['ID Registrasi'] === k.dataset.card)]); });

  /* ---------- kartu peserta (9 x 11 cm) ---------- */
  function cardOf(r) {
    const p = D.peserta.find(x => x['ID Registrasi'] === r['ID Registrasi']), t = D.tim.filter(x => x['ID Registrasi'] === r['ID Registrasi']).length;
    return { id: r['ID Registrasi'], sig: r['Kode QR'], name: r['Nama Peserta/Tim'], gender: p ? p['Jenis Kelamin'] : `Tim · ${t} pemain`, genderLabel: p ? 'JENIS KELAMIN' : 'KATEGORI', school: r['Nama Sekolah'], cabang: r['Cabang Lomba'] };
  }
  async function printCards(rows) {
    rows = rows.filter(Boolean); if (!rows.length) return note('Tidak ada peserta untuk dicetak.');
    if (rows.length > 60 && !confirm(`Akan membuat PDF ${rows.length} kartu. Lanjutkan?`)) return;
    try { note('Menyiapkan kartu…', 'info'); await ICMA_card.print(rows.map(cardOf), S.school.logo); $('#alertBox').className = 'alert d-none'; } catch (err) { note(err.message); }
  }
  $('#btnCards').addEventListener('click', () => printCards(filtered()));
  ['q', 'fCab', 'fWave', 'fPay', 'fKat'].forEach(i => $('#' + i).addEventListener('input', renderReg));

  async function openDetail(id) {
    const r = D.registrasi.find(x => x['ID Registrasi'] === id), pes = D.peserta.filter(p => p['ID Registrasi'] === id), tim = D.tim.filter(p => p['ID Registrasi'] === id);
    $('#dTitle').textContent = id;
    $('#dBody').innerHTML = `<dl class="row small">${['Kategori Pendaftar', 'ID Grup', 'Nama Sekolah', 'Alamat Sekolah', 'Kecamatan', 'Kabupaten', 'Kepala Sekolah', 'Cabang Lomba', 'Nama Peserta/Tim', 'Kelas', 'Nama Pendamping', 'WhatsApp', 'Email Pendamping', 'Gelombang', 'Timestamp'].map(k => `<dt class="col-4">${k}</dt><dd class="col-8">${esc(r[k]) || '–'}</dd>`).join('')}</dl>
      ${pes.length ? `<h3 class="h6">Peserta</h3><ul>${pes.map(p => `<li>${esc(p['Nama Peserta'])} — ${esc(p['Jenis Kelamin'])}, ${esc(p['Kelas'])}${p['Tempat Tanggal Lahir'] ? ', ' + esc(p['Tempat Tanggal Lahir']) : ''}</li>`).join('')}</ul>` : ''}
      ${tim.length ? `<h3 class="h6">Pemain (${tim.length})</h3><ol>${tim.map(p => `<li>${esc(p['Nama Pemain'])} — ${esc(p['Kelas'])}</li>`).join('')}</ol>` : ''}
      <button class="btn btn-sm btn-outline-primary mb-3" id="dCard" type="button">Cetak kartu peserta</button><h3 class="h6">Bukti pembayaran</h3><div id="proofBox" class="text-muted small">Memuat…</div>${r['ID File Surat Aktif'] ? '<h3 class="h6 mt-3">Surat keterangan aktif</h3><div id="skaBox" class="text-muted small">Memuat…</div>' : ''}`;
    $('#dCard').onclick = () => printCards([r]);
    (dModal ||= new bootstrap.Modal('#dModal')).show();
    const showFile = async (fid, boxId) => {
      try {
        const p = await api('proof', { fileId: fid }), url = `data:${p.mime};base64,${p.data}`;
        $('#' + boxId).innerHTML = (p.mime === 'application/pdf' ? `<iframe src="${url}" style="width:100%;height:420px;border:1px solid #ddd" title="Berkas"></iframe>` : `<img src="${url}" class="img-fluid rounded border" alt="Berkas">`) + `<div class="mt-2"><a class="btn btn-sm btn-outline-primary" download="${esc(p.name)}" href="${url}">Unduh berkas</a></div>`;
      } catch (err) { $('#' + boxId).textContent = err.message; }
    };
    showFile(r['ID File Bukti'], 'proofBox'); if (r['ID File Surat Aktif']) showFile(r['ID File Surat Aktif'], 'skaBox');
  }

  /* ---------- tabel lain ---------- */
  function table(el, cols, rows) { el.innerHTML = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="text-muted">Belum ada data.</td></tr>`}</tbody>`; }
  const match = (r, q) => !q || Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase());
  const PES = ['ID Registrasi', 'Nama Peserta', 'Jenis Kelamin', 'Kelas', 'Cabang Lomba', 'Tempat Tanggal Lahir'], TIM = ['ID Registrasi', 'Nama Tim', 'Nama Pemain', 'Kelas', 'Nama Pendamping'], SCH = ['Nama Sekolah', 'Kecamatan', 'Kabupaten', 'Jumlah Pendaftaran'];
  const renderPeserta = () => table($('#pesTable'), PES, D.peserta.filter(r => match(r, $('#qPes').value)));
  const renderTim = () => table($('#timTable'), TIM, D.tim.filter(r => match(r, $('#qTim').value)));
  const schools = () => { const m = {}; D.registrasi.forEach(r => { const k = String(r['Nama Sekolah']).trim().toLowerCase(); (m[k] ||= { 'Nama Sekolah': r['Nama Sekolah'], 'Kecamatan': r['Kecamatan'], 'Kabupaten': r['Kabupaten'], 'Jumlah Pendaftaran': 0 })['Jumlah Pendaftaran']++; }); return Object.values(m); };
  const renderSekolah = () => table($('#schTable'), SCH, schools());
  $('#qPes').addEventListener('input', renderPeserta); $('#qTim').addEventListener('input', renderTim);

  /* ---------- CSV (BOM agar terbuka rapi di Excel) ---------- */
  function csv(name, cols, rows) {
    // awalan = + - @ diberi tanda petik agar tidak dieksekusi sebagai rumus di Excel
    const cell = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
    const body = [cols.map(cell).join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' })); a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('#btnCsv').addEventListener('click', () => csv('pendaftar', ['ID Registrasi', 'Timestamp', 'Nama Sekolah', 'Alamat Sekolah', 'Kecamatan', 'Kabupaten', 'Cabang Lomba', 'Nama Peserta/Tim', 'Kelas', 'Nama Pendamping', 'WhatsApp', 'Gelombang', 'Biaya', 'Link Bukti Pembayaran', 'Status Pembayaran', 'Status Pendaftaran', 'ID Grup', 'Kategori Pendaftar', 'Link Surat Keterangan Aktif'], filtered()));
  $$('[data-csv]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.csv; k === 'peserta' ? csv('peserta', PES, D.peserta) : k === 'tim' ? csv('tim-mini-soccer', TIM, D.tim) : csv('sekolah', SCH, schools()); }));

  /* ---------- tabs ---------- */
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); });

  /* ---------- pengaturan ---------- */
  const v = (id, val) => { const el = $('#' + id); if (val !== undefined) el.value = val ?? ''; return el.value.trim(); };
  function renderSettings() {
    v('s_event', S.eventDate ? S.eventDate.slice(0, 16) : ''); v('s_tm', S.techMeetingDate); v('s_wa', S.contact.whatsapp); v('s_addr', S.school.address);
    v('s_ig', S.contact.instagram); v('s_yt', S.contact.youtube); v('s_fb', S.contact.facebook); v('s_tt', S.contact.tiktok);
    v('s_bank', S.payment.bank); v('s_an', S.payment.accountName); v('s_no', S.payment.accountNumber);
    $('#feeEdit').innerHTML = `<thead><tr><th>Periode</th><th>ID</th><th>Label</th><th>Mulai</th><th>Selesai</th></tr></thead><tbody>${S.periods.map((p, i) => `<tr><td>${i + 1}</td><td class="mono">${esc(p.id)}</td><td><input class="form-control form-control-sm" data-p="${i}" data-k="label" value="${esc(p.label)}"></td><td><input type="date" class="form-control form-control-sm" data-p="${i}" data-k="start" value="${esc(p.start)}"></td><td><input type="date" class="form-control form-control-sm" data-p="${i}" data-k="end" value="${esc(p.end)}"></td></tr>`).join('')}</tbody>
      <thead><tr><th colspan="2">Biaya (Rp)</th>${S.periods.map(p => `<th>${esc(p.label)}</th>`).join('')}</tr></thead><tbody id="feeBody">${S.competitions.map(c => `<tr><td colspan="2">${esc(c.name)} <span class="text-muted">/${esc(c.unit || 'peserta')}</span></td>${S.periods.map(p => `<td><input type="number" min="0" step="1000" class="form-control form-control-sm" data-fee="${esc(c.id)}" data-per="${esc(p.id)}" value="${S.fees?.[c.id]?.[p.id] ?? ''}"></td>`).join('')}</tr>`).join('')}</tbody>`;
    $('#compEdit').innerHTML = S.competitions.map((c, i) => `<div class="border rounded p-3" data-comp="${i}"><div class="row g-2">
      <div class="col-md-4"><label class="form-label small">Nama</label><input class="form-control form-control-sm" data-c="name" value="${esc(c.name)}"></div>
      <div class="col-md-4"><label class="form-label small">Kategori</label><input class="form-control form-control-sm" data-c="category" value="${esc(c.category)}"></div>
      <div class="col-md-4"><label class="form-label small">Tautan juknis PDF</label><input class="form-control form-control-sm" data-c="juknisUrl" value="${esc(c.juknisUrl)}" placeholder="https://…"></div>
      <div class="col-12"><label class="form-label small">Link grup WhatsApp lomba <span class="text-muted">(tampil di halaman sukses setelah peserta mendaftar; harus diawali https://)</span></label><input class="form-control form-control-sm" data-c="waGroup" value="${esc(c.waGroup)}" placeholder="https://chat.whatsapp.com/…"></div>
      <div class="col-12"><label class="form-label small">Deskripsi singkat (kartu)</label><input class="form-control form-control-sm" data-c="short" value="${esc(c.short)}"></div>
      <div class="col-12"><label class="form-label small">Detail (JSON: deskripsi, tujuan, persyaratan, ketentuan, teknis, materi, penilaian, perlengkapan, hadiah)</label><textarea class="form-control form-control-sm mono" rows="6" data-c="detail">${esc(JSON.stringify(c.detail || {}, null, 2))}</textarea></div>
      <div class="col-12 small text-muted">ID: <span class="mono">${esc(c.id)}</span> · Tipe: ${esc(c.type)}</div></div></div>`).join('');
    $('#faqEdit').innerHTML = S.faq.map((f, i) => `<div class="border rounded p-3" data-faq="${i}"><input class="form-control form-control-sm mb-2" data-q value="${esc(f.q)}" aria-label="Pertanyaan"><textarea class="form-control form-control-sm mb-2" rows="2" data-a aria-label="Jawaban">${esc(f.a)}</textarea><button class="btn btn-outline-danger btn-sm" data-rmfaq="${i}" type="button">Hapus</button></div>`).join('');
  }
  function collect() {
    const o = JSON.parse(JSON.stringify(S));
    o.eventDate = v('s_event') ? v('s_event') + ':00+07:00' : ''; o.techMeetingDate = v('s_tm'); o.contact.whatsapp = v('s_wa').replace(/\D/g, ''); o.school.address = v('s_addr');
    Object.assign(o.contact, { instagram: v('s_ig'), youtube: v('s_yt'), facebook: v('s_fb'), tiktok: v('s_tt') }); Object.assign(o.payment, { bank: v('s_bank'), accountName: v('s_an'), accountNumber: v('s_no') });
    $$('#feeEdit [data-p]').forEach(i => o.periods[+i.dataset.p][i.dataset.k] = i.value);
    o.fees = {}; $$('#feeEdit [data-fee]').forEach(i => { (o.fees[i.dataset.fee] ||= {})[i.dataset.per] = i.value === '' ? null : Number(i.value); });
    $$('#compEdit [data-comp]').forEach(box => { const c = o.competitions[+box.dataset.comp]; $$('[data-c]', box).forEach(i => { if (i.dataset.c === 'detail') { try { c.detail = JSON.parse(i.value || '{}'); } catch { throw new Error(`JSON detail "${c.name}" tidak valid.`); } } else c[i.dataset.c] = i.value.trim(); }); });
    o.competitions.forEach(c => { if (c.waGroup && !/^https:\/\/\S+$/.test(c.waGroup)) throw new Error(`Link grup WhatsApp "${c.name}" harus diawali https://`); });
    o.faq = $$('#faqEdit [data-faq]').map(b => ({ q: $('[data-q]', b).value.trim(), a: $('[data-a]', b).value.trim() })).filter(f => f.q && f.a);
    o.periods.forEach(p => { if (!p.start || !p.end || p.start > p.end) throw new Error(`Tanggal ${p.label} tidak valid.`); });
    Object.values(o.fees).forEach(m => Object.keys(m).forEach(k => { if (m[k] !== null && (!isFinite(m[k]) || m[k] < 0)) throw new Error('Biaya tidak valid.'); }));
    return o;
  }
  $('#setForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#saveSet'); b.disabled = true;
    try { const o = collect(); await api('saveSettings', { settings: o }); S = o; note('Pengaturan tersimpan. Website publik akan memakai data ini.', 'success'); } catch (err) { note(err.message); } finally { b.disabled = false; }
  });
  $('#addFaq').addEventListener('click', () => { S = collectSafe(); S.faq.push({ q: '', a: '' }); renderSettings(); });
  $('#faqEdit').addEventListener('click', e => { const i = e.target.dataset.rmfaq; if (i === undefined) return; S = collectSafe(); S.faq.splice(+i, 1); renderSettings(); });
  $('#addComp').addEventListener('click', () => {
    const name = prompt('Nama cabang lomba baru:'); if (!name) return; S = collectSafe();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'cabang' + (S.competitions.length + 1), type = confirm('Lomba tim? (OK = tim, Batal = individu)') ? 'team' : 'individual';
    if (S.competitions.some(c => c.id === id)) return note('ID cabang sudah dipakai.');
    S.competitions.push({ id, code: id.slice(0, 3).toUpperCase(), type, icon: type === 'team' ? 'ball' : 'quran', unit: type === 'team' ? 'tim' : 'peserta', name, short: '', category: 'Kelas 4–6 SD/MI', juknisUrl: '', waGroup: '', detail: { deskripsi: '', tujuan: [], persyaratan: [], ketentuan: [], teknis: [], materi: [], penilaian: [], perlengkapan: [], hadiah: '' } });
    S.fees[id] = {}; renderSettings(); note('Cabang ditambahkan. Isi biaya lalu simpan. Catatan: formulir tim memakai input pemain; lomba individu memakai input peserta.', 'info');
  });
  function collectSafe() { try { return collect(); } catch { return S; } }

  /* ---------- init ---------- */
  stars(); $('#topDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (TOKEN) enter().catch(() => logout(true)); else show(false);
})();
