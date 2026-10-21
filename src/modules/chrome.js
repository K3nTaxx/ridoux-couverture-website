/* Navigation qui se cache, boutons magnétiques, ancres */

export function initChrome({ gsap, ScrollTrigger, lenis }) {
  const nav = document.querySelector('.nav');

  /* ---------- navigation ---------- */
  nav.classList.add('is-solid');
  let lastY = 0;
  lenis.on('scroll', ({ scroll, direction }) => {
    if (scroll > 160 && direction === 1 && scroll - lastY > 4) nav.classList.add('is-hidden');
    else if (direction === -1) nav.classList.remove('is-hidden');
    lastY = scroll;
  });
  // lien courant
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => a.classList.toggle('is-current', self.isActive),
    });
  });

  /* ---------- ancres : défilement doux ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: id === '#accueil' ? 0 : -8, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  });

  /* ---------- boutons magnétiques ---------- */
  document.querySelectorAll('.magnetic').forEach((el) => {
    const inner = el.querySelector('span') || el;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const ixTo = gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.18); yTo(dy * 0.28); ixTo(dx * 0.06);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); ixTo(0); });
  });
}
