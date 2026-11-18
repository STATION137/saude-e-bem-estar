/* ==========================================================================
   Sound — efeitos e trilha suave gerados com Web Audio API (sem arquivos).
   Para usar arquivos .mp3/.ogg próprios, troque as funções abaixo por
   new Audio('assets/audio/arquivo.mp3').play().
   ========================================================================== */
window.Sound = (() => {
  'use strict';

  /* Trilha de fundo. Se o arquivo não
     carregar, a trilha sintetizada (Web Audio) entra como reserva. */
  const MUSIC_FILE = 'assets/audio/musica-fundo.mp3';
  const MUSIC_VOLUME = 0.35;
  let musicEl = null;
  let musicFailed = false;
  function musicElement() {
    if (musicEl || musicFailed || !MUSIC_FILE) return musicEl;
    musicEl = new Audio(MUSIC_FILE);
    musicEl.loop = true;
    musicEl.preload = 'auto';
    musicEl.volume = MUSIC_VOLUME;
    musicEl.addEventListener('error', () => {
      musicFailed = true; musicEl = null;
      if (enabled && wantMusic) { ensure(); startTimer(); }
    });
    return musicEl;
  }
  function playFile() {
    const el = musicElement();
    if (!el) return false;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  }
  function pauseFile() { if (musicEl) musicEl.pause(); }

  let ctx = null;
  let master = null;
  let musicBus = null;
  let enabled = true;
  let wantMusic = false;
  let musicTimer = null;
  let step = 0;

  try { enabled = localStorage.getItem('sb-sound') !== 'off'; } catch (_) { /* ignore */ }

  const NOTE = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5 };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, o = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const { t = 0, dur = 0.18, type = 'sine', vol = 0.2, to = null, bus = master, attack = 0.012 } = o;
    const t0 = c.currentTime + t;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function click(o = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const { t = 0, dur = 0.05, vol = 0.25, freq = 2200 } = o;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.1;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(c.currentTime + t);
  }

  /* ---------- Efeitos ---------- */
  const fx = {
    flip() {
      click({ dur: 0.05, vol: 0.28, freq: 2400 });
      tone(540, { to: 840, dur: 0.1, type: 'triangle', vol: 0.12 });
    },
    flipBack() {
      click({ dur: 0.05, vol: 0.18, freq: 1500 });
      tone(720, { to: 420, dur: 0.11, type: 'triangle', vol: 0.09 });
    },
    match() {
      [NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => {
        tone(f, { t: i * 0.09, dur: 0.28, type: 'triangle', vol: 0.2 });
        tone(f * 2, { t: i * 0.09, dur: 0.2, type: 'sine', vol: 0.05 });
      });
    },
    miss() {
      tone(330, { to: 262, dur: 0.22, type: 'triangle', vol: 0.16 });
      tone(262, { t: 0.18, to: 196, dur: 0.3, type: 'triangle', vol: 0.14 });
    },
    begin() {
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
        tone(f, { t: i * 0.08, dur: 0.22, type: 'square', vol: 0.06 });
        tone(f, { t: i * 0.08, dur: 0.26, type: 'triangle', vol: 0.16 });
      });
    },
    reveal() {
      [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6].forEach((f, i) => tone(f, { t: i * 0.11, dur: 0.18, type: 'sine', vol: 0.1 }));
    },
    tick() { tone(880, { dur: 0.1, type: 'sine', vol: 0.2 }); },
    go() {
      tone(NOTE.C6, { dur: 0.14, type: 'triangle', vol: 0.2 });
      tone(NOTE.E6, { t: 0.12, dur: 0.3, type: 'triangle', vol: 0.22 });
    },
    click() { tone(660, { to: 900, dur: 0.07, type: 'triangle', vol: 0.12 }); },
    win() {
      const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6, NOTE.E6];
      seq.forEach((f, i) => tone(f, { t: i * 0.12, dur: 0.3, type: 'triangle', vol: 0.2 }));
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => tone(f, { t: 0.9, dur: 1.1, type: 'sine', vol: 0.13 }));
      [NOTE.E6, NOTE.C6, NOTE.G5].forEach((f, i) => tone(f * 2, { t: 1.0 + i * 0.1, dur: 0.4, type: 'sine', vol: 0.04 }));
    },
  };

  /* ---------- Trilha suave (pentatônica) ---------- */
  const penta = [NOTE.C4, NOTE.D4, NOTE.E4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.E5];
  const melody = [0, 2, 4, 2, 5, 4, 2, 4, 3, 2, 0, 2, 4, 5, 4, 2];
  const bass = [130.81, 98.0, 110.0, 87.31];

  function musicStep() {
    if (!enabled || !wantMusic) return;
    const i = step % melody.length;
    if (step % 2 === 0 || Math.random() > 0.35) {
      tone(penta[melody[i]], { dur: 0.7, type: 'triangle', vol: 0.07, bus: musicBus, attack: 0.03 });
    }
    if (i % 4 === 0) {
      tone(bass[(step / 4) % bass.length | 0], { dur: 1.6, type: 'sine', vol: 0.1, bus: musicBus, attack: 0.05 });
    }
    step++;
  }

  function startTimer() {
    if (playFile()) return;
    if (musicTimer) return;
    musicTimer = setInterval(musicStep, 430);
  }
  function stopTimer() {
    pauseFile();
    clearInterval(musicTimer);
    musicTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseFile();
    else if (enabled && wantMusic) playFile();
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (enabled) ctx.resume().catch(() => {});
  });

  return {
    unlock() { ensure(); },
    isEnabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('sb-sound', enabled ? 'on' : 'off'); } catch (_) { /* ignore */ }
      if (!enabled) stopTimer();
      else { ensure(); if (wantMusic) startTimer(); }
      return enabled;
    },
    startMusic() {
      wantMusic = true;
      if (enabled) { ensure(); startTimer(); }
    },
    stopMusic() {
      wantMusic = false;
      stopTimer();
    },
    ...fx,
  };
})();
