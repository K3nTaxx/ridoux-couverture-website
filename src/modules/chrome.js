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
  // lien courant (dans la navigation et dans le menu du téléphone)
  document.querySelectorAll('.nav-links a, .menu-links a').forEach((a) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => a.classList.toggle('is-current', self.isActive),
    });
  });

  /* ---------- menu du téléphone : un rideau ardoise qui descend, les liens se posent un à un ---------- */
  const burger = nav.querySelector('.nav-burger');
  const menu = document.querySelector('.menu');
  if (burger && menu) {
    const links = [...menu.querySelectorAll('.menu-links a, .menu-foot > *')];
    const veil = document.createElement('div');
    veil.className = 'menu-veil';
    menu.before(veil);
    let open = false;
    const set = (v) => {
      open = v;
      burger.setAttribute('aria-expanded', String(v));
      nav.classList.toggle('is-open', v);
      veil.classList.toggle('is-on', v);
      nav.classList.remove('is-hidden');
      gsap.killTweensOf([menu, links]);
      if (v) {
        menu.hidden = false;
        lenis.stop();
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.75, ease: 'expo.out' });
        gsap.fromTo(links, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.035, ease: 'expo.out', delay: 0.1 });
      } else {
        lenis.start();
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'power3.in', onComplete: () => { if (!open) menu.hidden = true; } });
      }
    };
    burger.addEventListener('click', () => {
      set(!open);
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    // un lien du menu le referme ; le défilement vers la section suit (gestionnaire des ancres, plus bas)
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    // un geste à côté du menu (sur la page assombrie) le referme aussi
    document.addEventListener('pointerdown', (e) => { if (open && !menu.contains(e.target) && !burger.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { set(false); burger.focus(); } });
  }

  /* ---------- ancres : défilement doux ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    let target = document.querySelector(id);
    if (!target) return;
    // une section absente de cette version (la coupe, au téléphone) : on va à la suivante, les prestations
    if (!target.offsetParent && target !== document.body) target = document.querySelector('#prestations');
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
      // au doigt, le bouton ne bouge pas
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.18); yTo(dy * 0.28); ixTo(dx * 0.06);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); ixTo(0); });
  });
}
