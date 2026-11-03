/* story.js — Tema "Misi Antariksa Cendekia": bab misi, jejak misi, medan bintang
   (parallax + bintang jatuh), tilt orbit & kartu, counter, dan ledakan bintang.
   Semua gerakan dimatikan bila pengguna memilih "kurangi animasi". */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CH = {
    home: ['Misi 1 · Peluncuran', 'Hitung mundur dimulai. Para pelajar Pandeglang diundang menjelajahi galaksi pengetahuan.'],
    tentang: ['Misi 2 · Perbekalan', 'Sebelum lepas landas, kenali tujuan misi dan pangkalan peluncurannya.'],
    lab: ['Misi 3 · Laboratorium orbit', 'Sains dimulai dari rasa ingin tahu. Jelajahi planet dan hitung bobotmu di sana.'],
    perlombaan: ['Misi 4 · Pilih planet tujuan', 'Lima planet menunggu para penjelajah. Ke mana kamu akan mendarat?'],
    juknis: ['Misi 5 · Peta bintang', 'Peta navigasi dan aturan misi siap diunduh.'],
    informasi: ['Misi 6 · Persiapan kru', 'Periksa jadwal, bahan bakar (biaya), dan perlengkapan sebelum berangkat.'],
    pendaftaran: ['Misi 7 · Check-in kru', 'Lima pos pemeriksaan. Lengkapi semuanya agar namamu masuk daftar kru.'],
    faq: ['Misi 8 · Pusat kendali', 'Ada yang belum jelas? Pusat kendali menjawab pertanyaan yang sering masuk.'],
    puncak: ['Misi 9 · Pendaratan', '']
  };
  const secs = $$('section[id]').filter(s => CH[s.id]);

  /* 1) Label misi + narasi */
  secs.forEach(sec => {
    const [tag, story] = CH[sec.id], anchor = $('.hero-kicker', sec) || $('.section-title', sec) || $('.summit-title', sec);
    if (!anchor) return;
    const p = document.createElement('p'); p.className = 'chapter'; p.textContent = tag; anchor.before(p);
    if (sec.id === 'home') { const d = $('.hero-tag', sec); if (d) d.insertAdjacentHTML('afterend', `<p class="story">${story}</p>`); }
    else if (story) { const n = document.createElement('p'); n.className = 'story'; n.textContent = story; anchor.after(n); }
  });

  /* 2) Judul hero muncul kata demi kata */
  const ht = $('.hero-title'); if (ht) { let i = 0; ht.innerHTML = ht.innerHTML.split(/<br\s*\/?>/i).map(l => l.trim().split(' ').map(w => `<span class="w" style="--i:${i++}"><span>${w}</span></span>`).join(' ')).join('<br>'); }
  addEventListener('load', () => setTimeout(() => document.body.classList.add('ready'), 450));

  /* 3) Jejak misi (kanan) + progress bar + penanda bintang */
  const trail = $('#trail'); trail.innerHTML = '<i class="line"></i><i class="fill"></i><i class="star"></i>' + secs.map(s => `<a href="#${s.id}" data-id="${s.id}"><span>${CH[s.id][0].split(' · ')[1]}</span></a>`).join('');
  const fill = $('.fill', trail), star = $('.star', trail), bar = $('#progress');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? Math.min(1, scrollY / max) : 0;
    bar.style.transform = `scaleX(${p})`; fill.style.transform = `scaleY(${p})`; star.style.top = `${p * 100}%`;
    let cur = secs[0].id; secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id; });
    const idx = secs.findIndex(s => s.id === cur);
    $$('a', trail).forEach((a, i) => { a.classList.toggle('on', i === idx); a.classList.toggle('past', i < idx); });
    trail.classList.toggle('show', scrollY > 200);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $$('a', trail).forEach((a, i, all) => a.style.top = `${i / (all.length - 1) * 100}%`);

  /* 4) Reveal + counter */
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; e.target.classList.add('in'); if (e.target.dataset.count) count(e.target); io.unobserve(e.target); }), { threshold: .35 });
  $$('.chapter,.story,.timeline,.summit,.fact strong').forEach(el => { if (/^\d+$/.test(el.textContent.trim()) && el.closest('.fact')) el.dataset.count = el.textContent.trim(); io.observe(el); });
  function count(el) { const to = +el.dataset.count; if (calm) return; const t0 = performance.now(); (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }

  /* 5) Medan bintang (kanvas di belakang konten) */
  const cv = $('#fx'), g = cv.getContext('2d'), bc = $('#burst'), bg = bc.getContext('2d');
  let W, H, stars = [], mx = 0, my = 0, tx = 0, ty = 0, shoot = null, nextShoot = 4000, sparks = [], raf = 0;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    [cv, bc].forEach(c => { c.width = W * d; c.height = H * d; }); g.setTransform(d, 0, 0, d, 0, 0); bg.setTransform(d, 0, 0, d, 0, 0);
    stars = Array.from({ length: W < 600 ? 70 : 150 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .2 + Math.random() * .8, tw: Math.random() * 6, c: Math.random() < .18 ? '#9be4ff' : '#fff' }));
    if (calm) draw(0);
  }
  function draw(t) {
    g.clearRect(0, 0, W, H); mx += (tx - mx) * .05; my += (ty - my) * .05;
    stars.forEach(s => {
      let y = (s.y - scrollY * s.z * .18 - my * s.z * 14) % H; if (y < 0) y += H;
      g.globalAlpha = Math.min(1, calm ? .8 * s.z : (.35 + .65 * Math.abs(Math.sin(t / 900 * s.z + s.tw))) * s.z);
      g.fillStyle = s.c; g.beginPath(); g.arc(s.x - mx * s.z * 14, y, s.z * 1.4, 0, 6.283); g.fill();
    });
    if (calm) return;
    if (!shoot && t > nextShoot) { shoot = { x: W * (.3 + Math.random() * .7), y: Math.random() * H * .4, l: 0 }; nextShoot = t + 7000 + Math.random() * 6000; }
    if (shoot) { const a = 1 - shoot.l / 40, x = shoot.x - shoot.l * 14, y = shoot.y + shoot.l * 6, gr = g.createLinearGradient(x, y, x + 120, y - 52); gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 1; g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 120, y - 52); g.stroke(); if (++shoot.l > 40) shoot = null; }
  }
  function loop(t) {
    draw(t); bg.clearRect(0, 0, W, H);
    sparks = sparks.filter(p => p.life > 0); sparks.forEach(p => { p.vy += .1; p.x += p.vx; p.y += p.vy; p.life--; bg.globalAlpha = Math.min(1, p.life / 40); bg.fillStyle = p.c; bg.beginPath(); bg.arc(p.x, p.y, p.r, 0, 6.283); bg.fill(); });
    raf = requestAnimationFrame(loop);
  }
  size(); addEventListener('resize', size);
  if (!calm) raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!calm && !raf) raf = requestAnimationFrame(loop); });

  /* 6) Ledakan bintang saat pendaftaran sukses */
  new MutationObserver(() => {
    if ($('#regDone').hidden || calm) return;
    const cols = ['#2EBEFF', '#1150F8', '#fff', '#9be4ff', '#ffe08a'];
    for (let i = 0; i < 120; i++) sparks.push({ x: W / 2, y: H * .4, vx: (Math.random() - .5) * 13, vy: -Math.random() * 9 - 2, r: 1.5 + Math.random() * 2.5, life: 80 + Math.random() * 60, c: cols[i % 5] });
  }).observe($('#regDone'), { attributes: true, attributeFilter: ['hidden'] });

  if (calm) return;

  /* 7) Interaksi pointer: orbit hero miring mengikuti kursor, kartu planet tilt */
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => { tx = e.clientX / W - .5; ty = e.clientY / H - .5; }, { passive: true });
    const orbit = $('#orbit'), home = $('#home');
    home.addEventListener('pointermove', () => { orbit.style.transform = `rotateY(${tx * 14}deg) rotateX(${-ty * 14}deg)`; });
    home.addEventListener('pointerleave', () => orbit.style.transform = '');
    const grid = $('#cardGrid');
    grid.addEventListener('pointermove', e => { const c = e.target.closest('.comp-card'); if (!c) return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`; });
    grid.addEventListener('pointerout', e => { const c = e.target.closest('.comp-card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
  }
})();
