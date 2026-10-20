/* Réalisations : la ligne de partage, inclinée à la pente du toit, balaie l'avant pour révéler l'après
   puis suit le curseur pour comparer. */

export function initRealisations({ gsap, ScrollTrigger }) {
  const items = [...document.querySelectorAll('.rea-item')];

  items.forEach((item, idx) => {
    const frame = item.querySelector('.rea-frame');
    const before = item.querySelector('.rea-before');
    const cut = item.querySelector('.rea-cut');
    const pitch = Number(item.dataset.pitch || 12);
    const state = { c: 112 };
    let w = 1, h = 1;
    const measure = () => { w = frame.offsetWidth; h = frame.offsetHeight; render(); };

    function render() {
      // décalage horizontal (en %) induit par l'inclinaison de la ligne
      const dx = (Math.tan((pitch * Math.PI) / 180) * h * 0.5) / w * 100;
      const c = state.c;
      before.style.clipPath = `polygon(0% 0%, ${c + dx}% 0%, ${c - dx}% 100%, 0% 100%)`;
      cut.style.transform = `translate3d(${(c / 100) * w - 1}px, 0, 0) rotate(${pitch}deg)`;
      cut.style.opacity = c > -8 && c < 108 ? '1' : '0';
      frame.style.setProperty('--avant-o', c > 18 ? '1' : '0');
    }
    measure();
    window.addEventListener('resize', measure);

    let hovering = false;
    // la ligne colle au curseur, avec juste assez de souplesse pour rester fluide
    const to = (c) => gsap.to(state, { c, duration: 0.16, ease: 'power2.out', onUpdate: render, overwrite: true });

    // entrée : on voit l'avant, puis la ligne passe et laisse l'après
    ScrollTrigger.create({
      trigger: item,
      start: 'top 78%',
      onEnter: () => {
        if (hovering) return;
        gsap.fromTo(state, { c: 112 }, { c: -12, duration: 1.7, delay: (idx % 3) * 0.14, ease: 'power3.inOut', onUpdate: render, overwrite: true });
      },
      onLeaveBack: () => { gsap.killTweensOf(state); state.c = 112; render(); },
    });

    frame.addEventListener('pointermove', (e) => {
      hovering = true;
      const r = frame.getBoundingClientRect();
      const y = (e.clientY - r.top) / r.height - 0.5;
      const dx = (Math.tan((pitch * Math.PI) / 180) * r.height) / r.width;
      to(((e.clientX - r.left) / r.width + y * dx) * 100);
    });
    frame.addEventListener('pointerleave', () => {
      hovering = false;
      gsap.to(state, { c: -12, duration: 1.1, ease: 'power3.inOut', onUpdate: render, overwrite: true });
    });
  });

  gsap.from('.rea-item figcaption', {
    opacity: 0,
    y: 10,
    duration: 0.9,
    stagger: 0.06,
    scrollTrigger: { trigger: '.rea-grid', start: 'top 70%', toggleActions: 'play none none reverse' },
  });

  /* réfection en trois temps : le cordeau relie les étapes, chaque photo se découvre à son tour */
  const steps = [...document.querySelectorAll('.rea-steps-row figure')];
  const cord = document.querySelector('.rea-steps-cord');
  gsap.set(cord, { scaleX: 0, transformOrigin: 'left center' });
  const placeCord = () => {
    const img = steps[0].querySelector('img');
    const top = img.getBoundingClientRect().bottom - cord.parentElement.getBoundingClientRect().top + 16;
    cord.style.top = `${top - 5}px`;
    cord.style.bottom = 'auto';
  };
  placeCord();
  window.addEventListener('resize', placeCord);
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.rea-steps', start: 'top 72%', end: 'bottom 70%', scrub: 0.6 },
  });
  steps.forEach((f, i) => {
    tl.fromTo(f.querySelector('img'), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.out' }, i * 0.55)
      .fromTo(f.querySelector('figcaption'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i * 0.55 + 0.45);
  });
  tl.to(cord, { scaleX: 1, duration: steps.length * 0.55 + 0.5, ease: 'none' }, 0);
}
