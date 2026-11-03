/* scan.js — Halaman validasi kartu peserta untuk tim registrasi.
   Kamera: BarcodeDetector bila ada, jika tidak memakai jsQR (dimuat saat dibutuhkan).
   Validasi dilakukan SERVER (Apps Script): tanda tangan QR + status pembayaran dari spreadsheet. */
(() => {
  'use strict';
  const C = window.ICMA_CONFIG, $ = (s, r = document) => r.querySelector(s), esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let TOKEN = sessionStorage.getItem('icma_scan_tok') || '', stream = null, facing = 'environment', scanning = false, busy = false, last = { code: '', t: 0 }, det = null, timer = 0, autoNext = 0, hist = [];

  async function api(action, data = {}) {
    if (!C.appsScriptUrl) throw new Error('URL Apps Script belum diisi di config.js.');
    const r = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: TOKEN, ...data }) });
    const j = await r.json(); if (!j.ok) { if (j.code === 'AUTH') logout(true); throw new Error(j.error || 'Permintaan gagal.'); } return j;
  }
  const show = on => { $('#loginView').hidden = on; $('#scanView').hidden = !on; };
  function logout(silent) { stopCam(); TOKEN = ''; sessionStorage.removeItem('icma_scan_tok'); show(false); if (silent) $('#loginErr').textContent = 'Sesi berakhir. Silakan login kembali.'; }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#loginBtn'); b.disabled = true; b.textContent = 'Memeriksa…'; $('#loginErr').textContent = '';
    try { const j = await api('login', { role: 'scanner', password: $('#pw').value }); TOKEN = j.token; sessionStorage.setItem('icma_scan_tok', TOKEN); $('#pw').value = ''; show(true); }
    catch (err) { $('#loginErr').textContent = err.message === 'Failed to fetch' ? 'Tidak dapat terhubung ke server.' : err.message; }
    finally { b.disabled = false; b.textContent = 'Masuk'; }
  });
  $('#btnLogout').addEventListener('click', () => logout());

  /* ---------- kamera & pemindaian ---------- */
  const loadJsQR = () => window.jsQR ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat pemindai QR. Periksa internet.')); document.head.appendChild(s); });
  async function startCam() {
    const msg = $('#camMsg'); msg.className = 'small text-muted mb-3';
    if (!navigator.mediaDevices?.getUserMedia) { msg.textContent = 'Browser tidak mendukung kamera atau halaman belum memakai HTTPS. Gunakan input ID manual.'; msg.classList.add('text-warning'); return; }
    try {
      stopCam();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 } }, audio: false });
      const v = $('#video'); v.srcObject = stream; await v.play();
      if ('BarcodeDetector' in window) { try { det = new BarcodeDetector({ formats: ['qr_code'] }); } catch { det = null; } }
      if (!det) await loadJsQR();
      scanning = true; $('#vpIdle').hidden = true; $('#viewport').classList.add('on'); $('#btnCam').textContent = 'Hentikan kamera'; $('#btnFlip').disabled = false; msg.textContent = 'Kamera aktif. Arahkan ke QR code pada kartu.'; loop();
    } catch (err) {
      msg.classList.add('text-warning'); msg.textContent = err.name === 'NotAllowedError' ? 'Izin kamera ditolak. Izinkan kamera pada pengaturan browser, atau gunakan input ID manual.' : (err.message || 'Kamera tidak dapat dibuka.');
    }
  }
  function stopCam() { scanning = false; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()); stream = null; $('#video').srcObject = null; $('#vpIdle').hidden = false; $('#viewport').classList.remove('on'); $('#btnCam').textContent = 'Mulai kamera'; $('#btnFlip').disabled = true; }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  async function loop() {
    if (!scanning) return;
    const v = $('#video');
    if (!busy && v.readyState >= 2 && v.videoWidth) {
      try {
        let code = '';
        if (det) { const r = await det.detect(v); code = r[0]?.rawValue || ''; }
        else { const k = Math.min(1, 640 / v.videoWidth); cv.width = v.videoWidth * k; cv.height = v.videoHeight * k; cx.drawImage(v, 0, 0, cv.width, cv.height); const d = cx.getImageData(0, 0, cv.width, cv.height), q = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' }); code = q?.data || ''; }
        if (code && !(code === last.code && Date.now() - last.t < 4000)) { last = { code, t: Date.now() }; check(code, false); }
      } catch { /* abaikan frame gagal */ }
    }
    timer = setTimeout(loop, 120);
  }
  $('#btnCam').addEventListener('click', () => scanning ? stopCam() : startCam());
  $('#btnFlip').addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; startCam(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && scanning) stopCam(); });

  /* ---------- validasi & hasil ---------- */
  const ICO = {
    valid: '<svg viewBox="0 0 120 120"><circle class="c" cx="60" cy="60" r="52" fill="none" stroke="#2fd3a0" stroke-width="8"/><path class="m" d="M36 62l16 16 32-34" fill="none" stroke="#2fd3a0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg viewBox="0 0 120 120"><circle class="c" cx="60" cy="60" r="52" fill="none" stroke="#ff5a6e" stroke-width="8"/><path class="m" d="M40 40l40 40" fill="none" stroke="#ff5a6e" stroke-width="10" stroke-linecap="round"/><path class="m m2" d="M80 40L40 80" fill="none" stroke="#ff5a6e" stroke-width="10" stroke-linecap="round"/></svg>',
    warn: '<svg viewBox="0 0 120 120"><path class="c" d="M60 12L110 100H10z" fill="none" stroke="#ffc857" stroke-width="8" stroke-linejoin="round"/><path class="m" d="M60 44v28" stroke="#ffc857" stroke-width="10" stroke-linecap="round"/><circle class="dot" cx="60" cy="86" r="6" fill="#ffc857"/></svg>'
  };
  function beep(kind) {
    try {
      const A = window.AudioContext || window.webkitAudioContext, a = beep.a ||= new A(), seq = kind === 'valid' ? [[660, 0], [880, .12]] : kind === 'warn' ? [[520, 0], [520, .18]] : [[200, 0], [150, .15]];
      seq.forEach(([f, t]) => { const o = a.createOscillator(), g = a.createGain(); o.type = kind === 'bad' ? 'sawtooth' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.15, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + t + .14); o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + .15); });
    } catch { /* audio opsional */ }
    navigator.vibrate?.(kind === 'valid' ? 80 : kind === 'warn' ? [120, 60, 120] : [300]);
  }
  async function check(code, manual) {
    if (busy) return; busy = true; $('#camMsg').textContent = 'Memeriksa…';
    try { const r = await api('validate', { code, manual }); showResult(r); }
    catch (err) { showResult({ state: 'error', error: err.message }); }
    finally { $('#camMsg').textContent = scanning ? 'Kamera aktif. Arahkan ke QR code pada kartu.' : 'Siap memeriksa.'; }
  }
  function showResult(r) {
    const kind = r.state === 'valid' ? 'valid' : r.state === 'unpaid' ? 'warn' : 'bad';
    const T = {
      valid: ['Valid', 'Pembayaran terverifikasi. Peserta boleh masuk.'],
      unpaid: ['Belum membayar', 'Peringatan: status pembayaran peserta belum diverifikasi.'],
      notfound: ['Data tidak ditemukan', 'QR code tidak dikenali atau tidak sesuai dengan data registrasi.'],
      rejected: ['Tidak valid', `Status pendaftaran: ${r.reg || '-'}.`],
      error: ['Gagal memeriksa', r.error || 'Terjadi kesalahan.']
    }[r.state];
    $('#resCard').className = `res-card ${kind}`; $('#resIco').innerHTML = ICO[kind]; $('#resTitle').textContent = T[0]; $('#resMsg').textContent = T[1];
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
    $('#resDet').innerHTML = r.id ? row('Nama', r.nama) + row('ID', r.id) + row('Lomba', r.cabang) + row('Sekolah', r.sekolah) + row('Pembayaran', r.pay) : '';
    $('#res').hidden = false; beep(kind); $('#resNext').focus();
    hist.unshift({ t: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), kind, label: r.id ? `${r.nama} · ${r.id}` : T[0] }); hist = hist.slice(0, 10); renderHist();
    clearTimeout(autoNext); autoNext = setTimeout(closeResult, kind === 'valid' ? 3500 : 7000); // peringatan/gagal ditampilkan lebih lama
  }
  function closeResult() { clearTimeout(autoNext); $('#res').hidden = true; busy = false; last.t = Date.now(); }
  $('#resNext').addEventListener('click', closeResult);
  $('#res').addEventListener('click', e => { if (e.target.id === 'res') closeResult(); });
  function renderHist() {
    $('#histCount').textContent = `${hist.length} terakhir`;
    $('#hist').innerHTML = hist.map(h => `<div class="qrow"><div class="t"><b>${esc(h.label)}</b><small>${h.t}</small></div><span class="pill ${h.kind === 'valid' ? 's-ok' : h.kind === 'bad' ? 's-no' : ''}">${h.kind === 'valid' ? 'Valid' : h.kind === 'bad' ? 'Ditolak' : 'Belum bayar'}</span></div>`).join('') || '<div class="empty">Belum ada scan.</div>';
  }
  $('#manualForm').addEventListener('submit', e => { e.preventDefault(); const v = $('#manualId').value.trim().toUpperCase(); if (!v) return; $('#manualId').value = ''; check(v, true); });

  /* bintang latar (sama dengan halaman admin) */
  (function () { const c = $('#stars'), g = c.getContext('2d'); let W, H, S = []; const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; S = Array.from({ length: W < 600 ? 50 : 100 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7 })); draw(); }; function draw() { g.clearRect(0, 0, W, H); g.fillStyle = '#fff'; S.forEach(s => { g.globalAlpha = .6 * s.z; g.beginPath(); g.arc(s.x, s.y, s.z * 1.3, 0, 6.283); g.fill(); }); } size(); addEventListener('resize', size); })();

  if (TOKEN) show(true);
})();
