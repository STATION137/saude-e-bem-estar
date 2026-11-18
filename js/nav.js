/* Barra superior dinâmica (desktop): fica fixa ao rolar, ganha fundo opaco
   e destaca o link da seção que está visível. */
(() => {
  'use strict';
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const links = [...nav.querySelectorAll('.nav-links a')];
  const byHash = Object.fromEntries(links.map(a => [a.getAttribute('href'), a]));
  const stage  = document.querySelector('.stage');
  const sobre  = document.getElementById('sobre');
  const dicas  = document.getElementById('dicas');
  let ticking = false;

  function setActive(hash) {
    links.forEach(a => a.classList.toggle('is-active', a === byHash[hash]));
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 24);
    // fora do pôster (seções de largura total) a barra ocupa toda a largura da página
    if (stage) nav.classList.toggle('is-wide', stage.getBoundingClientRect().bottom <= nav.offsetHeight);

    const navH = nav.offsetHeight;
    const probe = y + navH + window.innerHeight * 0.25;      // linha de leitura
    const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;

    if (dicas && (atEnd || probe >= dicas.offsetTop)) setActive('#dicas');
    else if (sobre && probe >= sobre.offsetTop)       setActive('#sobre');
    else                                              setActive('#gameCard');
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
