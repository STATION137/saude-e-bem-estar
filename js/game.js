/* ==========================================================================
   Jogo da Memória — Saúde e Bem-Estar (ODS 3)
   • Prévia inicial idêntica ao layout (3×3, "0 / 6")
   • Ao clicar em COMEÇAR: 12 cartas (6 pares), memorização e jogo
   • Para trocar as imagens das cartas, edite a lista PAIRS (src) abaixo.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuração ---------- */
  const BACK_SRC = 'assets/img/card_back.png';
  const PAIRS = [
    { id: 'heart',  src: 'assets/img/card_heart.png',  color: '#E2574C', label: 'Coração' },
    { id: 'apple',  src: 'assets/img/card_apple.png',  color: '#F2B21C', label: 'Maçã' },
    { id: 'shoe',   src: 'assets/img/card_shoe.png',   color: '#5DAA46', label: 'Tênis' },
    { id: 'water',  src: 'assets/img/card_water.png',  color: '#4AA8D8', label: 'Água' },
    { id: 'sun',    src: 'assets/img/card_sun.png',    color: '#F58A2B', label: 'Sol' },
    { id: 'flower', src: 'assets/img/card_flower.png', color: '#D95F9A', label: 'Flor' },
  ];
  const TOTAL = PAIRS.length;
  const SPARK_COLORS = ['#F9C74F', '#F58A2B', '#E2574C', '#4AA8D8', '#5DAA46', '#D95F9A'];

  /* ---------- Elementos ---------- */
  const board = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const panel = document.getElementById('gameCard');
  const soundBtn = document.getElementById('soundBtn');
  const soundIcon = document.getElementById('soundIcon');

  /* ---------- Estado ---------- */
  let state = 'idle';   // idle | preview | playing | won
  let runId = 0;        // invalida timers de partidas anteriores
  let locked = true;
  let first = null;
  let matched = 0;
  let moves = 0;
  let cards = [];

  /* ---------- Utilidades ---------- */
  const wait = (ms, id) => new Promise((res) => setTimeout(() => res(id === runId), ms));

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const setStatus = (txt) => { statusEl.textContent = txt; };
  const updateStatus = () => setStatus(`Pares encontrados: ${matched} / ${TOTAL}`);
  const setButton = (txt) => { startBtn.textContent = txt; };

  /* ---------- Cartas ---------- */
  function buildCard(def, i) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card enter';
    el.style.setProperty('--c', def.color);
    el.style.setProperty('--i', i);
    el.setAttribute('aria-label', `Carta ${i + 1}: virada para baixo`);
    el.innerHTML = `
      <span class="card-inner">
        <span class="card-face card-back"><img src="${BACK_SRC}" alt="" draggable="false"></span>
        <span class="card-face card-front"><img src="${def.src}" alt="${def.label}" draggable="false"></span>
      </span>`;
    el.addEventListener('animationend', (e) => {
      if (e.target === el && e.animationName === 'cardIn') el.classList.remove('enter');
    });
    const card = { el, id: def.id, def, index: i };
    el._card = card;
    return card;
  }

  function setFace(card, up) {
    card.el.classList.toggle('is-flipped', up);
    card.el.setAttribute(
      'aria-label',
      up ? `Carta ${card.index + 1}: ${card.def.label}` : `Carta ${card.index + 1}: virada para baixo`
    );
  }

  function burst(el) {
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.4;
      const d = 58 + Math.random() * 34;
      s.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      s.style.setProperty('--dx', `calc(${(Math.cos(a) * d).toFixed(1)} * var(--u))`);
      s.style.setProperty('--dy', `calc(${(Math.sin(a) * d).toFixed(1)} * var(--u))`);
      el.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  /* ---------- Fluxo do jogo ---------- */
  async function startGame() {
    Sound.unlock();
    const id = ++runId;
    Confetti.stop();
    panel.classList.remove('is-won');

    state = 'preview';
    locked = true;
    first = null;
    matched = 0;
    moves = 0;

    board.dataset.state = 'preview';
    setButton('REINICIAR');
    Sound.stopMusic();
    Sound.begin();

    cards = shuffle([...PAIRS, ...PAIRS]).map(buildCard);
    board.replaceChildren(...cards.map((c) => c.el));
    setStatus('Prepare-se…');

    if (!(await wait(750, id))) return;

    // Revela todas para memorizar
    Sound.reveal();
    cards.forEach((c, i) => setTimeout(() => { if (id === runId) setFace(c, true); }, i * 70));
    if (!(await wait(cards.length * 70 + 500, id))) return;

    for (let n = 3; n >= 1; n--) {
      setStatus(`Memorize as cartas… ${n}`);
      Sound.tick();
      if (!(await wait(850, id))) return;
    }

    setStatus('Agora é com você!');
    Sound.go();
    cards.forEach((c, i) => setTimeout(() => { if (id === runId) setFace(c, false); }, i * 45));
    if (!(await wait(cards.length * 45 + 600, id))) return;

    state = 'playing';
    board.dataset.state = 'playing';
    locked = false;
    updateStatus();
    Sound.startMusic();
  }

  function onBoardClick(e) {
    const el = e.target.closest('.card');
    if (!el) return;

    // Antes de começar (ou depois de vencer) → chama atenção para o botão
    if (state === 'idle' || state === 'won') {
      nudgeStart();
      return;
    }
    if (state !== 'playing' || locked) return;

    const card = el._card;
    if (!card || el.classList.contains('is-flipped')) return;

    setFace(card, true);
    Sound.flip();

    if (!first) { first = card; return; }

    const a = first;
    first = null;
    locked = true;
    moves++;
    resolvePair(a, card);
  }

  function resolvePair(a, b) {
    const id = runId;

    if (a.id === b.id) {
      setTimeout(() => {
        if (id !== runId) return;
        a.el.classList.add('is-matched');
        b.el.classList.add('is-matched');
        matched++;
        Sound.match();
        burst(a.el);
        burst(b.el);
        updateStatus();
        if (matched === TOTAL) win();
        else locked = false;
      }, 380);
    } else {
      setTimeout(() => {
        if (id !== runId) return;
        a.el.classList.add('is-wrong');
        b.el.classList.add('is-wrong');
        Sound.miss();
      }, 420);
      setTimeout(() => {
        if (id !== runId) return;
        a.el.classList.remove('is-wrong');
        b.el.classList.remove('is-wrong');
        setFace(a, false);
        setFace(b, false);
        Sound.flipBack();
        locked = false;
      }, 1050);
    }
  }

  function win() {
    const id = runId;
    state = 'won';
    locked = true;
    board.dataset.state = 'won';
    Sound.stopMusic();
    panel.classList.add('is-won');
    setStatus(`🎉 Parabéns! ${moves} jogadas`);
    setButton('JOGAR DE NOVO');
    setTimeout(() => {
      if (id !== runId) return;
      Sound.win();
      Confetti.burst();
    }, 450);
  }

  function nudgeStart() {
    Sound.unlock();
    Sound.click();
    startBtn.classList.remove('nudge');
    void startBtn.offsetWidth;
    startBtn.classList.add('nudge');
  }

  /* ---------- Confete ---------- */
  const Confetti = (() => {
    const cv = document.getElementById('confetti');
    const c = cv.getContext('2d');
    const colors = ['#FF6A00', '#F9C74F', '#E2574C', '#4AA8D8', '#5DAA46', '#D95F9A', '#FFFFFF'];
    let parts = [];
    let raf = 0;

    function fit() {
      const r = window.devicePixelRatio || 1;
      cv.width = Math.floor(window.innerWidth * r);
      cv.height = Math.floor(window.innerHeight * r);
      c.setTransform(r, 0, 0, r, 0, 0);
    }
    window.addEventListener('resize', fit);
    fit();

    function burstConfetti() {
      const b = board.getBoundingClientRect();
      const ox = b.left + b.width / 2;
      const oy = Math.min(Math.max(b.top + b.height / 2, 80), window.innerHeight - 80);
      for (let i = 0; i < 170; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const v = 6 + Math.random() * 11;
        parts.push({
          x: ox, y: oy,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 6 + Math.random() * 7, h: 4 + Math.random() * 5,
          r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.45,
          color: colors[i % colors.length], life: 0, max: 150 + Math.random() * 90,
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function tick() {
      c.clearRect(0, 0, window.innerWidth, window.innerHeight);
      parts = parts.filter((p) => p.life < p.max && p.y < window.innerHeight + 30);
      for (const p of parts) {
        p.vy += 0.26;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life++;
        c.save();
        c.globalAlpha = Math.max(0, 1 - p.life / p.max);
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.color;
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }

    function stop() {
      parts = [];
      cancelAnimationFrame(raf);
      raf = 0;
      c.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    return { burst: burstConfetti, stop };
  })();

  /* ---------- Som (botão) ---------- */
  function syncSound() {
    const on = Sound.isEnabled();
    soundBtn.setAttribute('aria-pressed', String(!on));
    soundBtn.title = on ? 'Desativar som' : 'Ativar som';
    soundIcon.src = on ? 'assets/img/icon-sound-on.png' : 'assets/img/icon-sound-off.png';
  }

  soundBtn.addEventListener('click', () => {
    Sound.unlock();
    Sound.toggle();
    syncSound();
    if (Sound.isEnabled()) {
      Sound.click();
      if (state === 'playing') Sound.startMusic();
    }
  });

  /* ---------- Eventos ---------- */
  board.addEventListener('click', onBoardClick);
  startBtn.addEventListener('click', startGame);
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  syncSound();
})();
