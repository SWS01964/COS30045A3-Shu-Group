/* Sticky chapter bar: marks the chapter in view and draws a reading-progress line.
   The progress line is off under prefers-reduced-motion (CSS hides it and no scroll listener is added). */
(function () {
  const links = Array.from(document.querySelectorAll('.chapbar a.ch'));
  const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
      });
    }, {rootMargin: '-45% 0px -50% 0px'});
    targets.forEach((t) => io.observe(t));
  }
  const bar = document.querySelector('.progress span');
  if (!bar || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let ticking = false;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
  window.addEventListener('resize', update);
  update();
})();
