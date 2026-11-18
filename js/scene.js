/* Cenário reativo: o sol sobe e desce entre as montanhas conforme a rolagem. */
(() => {
  'use strict';
  const sun = document.querySelector('.sun');
  if (!sun || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const desktop = window.matchMedia('(min-width: 900px)');
  let ticking = false;

  function update() {
    ticking = false;
    const stage = document.querySelector('.stage');
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const span = Math.min(max, (stage ? stage.offsetHeight : 1000) * 0.7);   // distância de rolagem do pôr do sol
    const p = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    /* ease: desce devagar no início e some atrás das colinas ao rolar o pôster */
    const eased = p * p * (3 - 2 * p);
    const range = desktop.matches ? 215 : 150;   // em unidades do layout (--u)
    sun.style.setProperty('--sun', (eased * range).toFixed(1));
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
