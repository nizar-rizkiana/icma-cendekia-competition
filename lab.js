/* lab.js — Laboratorium orbit: pilih planet, lihat fakta, hitung bobot di planet itu. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const P = [
    { n: 'Merkurius', k: 'rock', d: '4.879 km', g: .38, f: 'Planet terkecil di tata surya dan paling dekat dengan Matahari.' },
    { n: 'Venus', k: 'venus', d: '12.104 km', g: .90, f: 'Planet terpanas: suhu permukaannya sekitar 465 °C karena atmosfernya yang tebal memerangkap panas.' },
    { n: 'Bumi', k: 'ocean', d: '12.742 km', g: 1, moon: 1, f: 'Satu-satunya tempat yang kita ketahui memiliki kehidupan, dengan air cair di permukaannya.' },
    { n: 'Mars', k: 'mars', d: '6.779 km', g: .38, f: 'Tampak merah karena permukaannya kaya besi oksida, alias karat.' },
    { n: 'Jupiter', k: 'jup', d: '139.820 km', g: 2.53, f: 'Planet terbesar. Bintik Merah Besarnya adalah badai raksasa yang telah berlangsung berabad-abad.' },
    { n: 'Saturnus', k: 'sand', ring: 1, d: '116.460 km', g: 1.07, f: 'Terkenal dengan cincinnya yang tersusun dari es dan bongkahan batuan.' },
    { n: 'Uranus', k: 'ice', d: '50.724 km', g: .89, f: 'Berputar miring pada sisinya, sehingga tampak menggelinding mengelilingi Matahari.' },
    { n: 'Neptunus', k: 'neptune', d: '49.244 km', g: 1.14, f: 'Planet terjauh dari Matahari, dengan angin yang termasuk paling kencang di tata surya.' }
  ];
  const fmt = (n, d = 1) => n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  let cur = 2;
  const pick = $('#labPick');
  pick.innerHTML = P.map((p, i) => `<button type="button" data-i="${i}" aria-label="${p.n}" title="${p.n}">${window.ICMA_planet(p.k, 34, { ring: p.ring })}</button>`).join('');
  function show(i) {
    cur = i; const p = P[i];
    [...pick.children].forEach((b, j) => { b.classList.toggle('on', j === i); b.setAttribute('aria-pressed', j === i); });
    $('#labStage').innerHTML = window.ICMA_planet(p.k, 150, { ring: p.ring, moon: p.moon });
    $('#labName').textContent = p.n; $('#labDia').textContent = p.d; $('#labGrav').textContent = fmt(p.g, 2); $('#labFact').textContent = p.f;
    calc();
  }
  function calc() {
    const kg = parseFloat($('#labKg').value), out = $('#labOut');
    out.textContent = kg > 0 && kg <= 200 ? `${fmt(kg * P[cur].g)} kg di ${P[cur].n}` : 'Masukkan 1–200 kg';
  }
  pick.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
  $('#labKg').addEventListener('input', calc);
  show(cur);
})();
