/* Façade : un fil à plomb descend la section ; la façade se lave de haut en bas
   pendant qu'elle est entièrement à l'écran. */

export function initExterieurs({ gsap, ScrollTrigger, mobile }) {
  const section = document.querySelector('.ext');
  const inner = section.querySelector('.ext-inner');
  const line = section.querySelector('.ext-plumb-line');
  const bob = section.querySelector('.ext-plumb-bob');
  const plumb = section.querySelector('.ext-plumb');

  // (téléphone : pas de fil à plomb)
  if (!mobile) ScrollTrigger.create({
    trigger: inner,
    start: 'top 62%',
    end: 'bottom 80%',
    scrub: 0.5,
    onUpdate: (self) => {
      const p = self.progress;
      line.style.strokeDashoffset = String(1000 - 1000 * p);
      // le plomb oscille à peine en descendant, puis se stabilise
      const sway = Math.sin(p * 18) * 3 * (1 - p);
      bob.style.transform = `translate3d(0, ${p * plumb.offsetHeight - 8}px, 0) rotate(${sway.toFixed(2)}deg)`;
    },
  });

  /* façade : l'avant s'efface du haut vers le bas, une ligne de niveau marque le passage */
  const frame = section.querySelector('.ext-facade-frame');
  const before = section.querySelector('.ext-facade-before');
  const level = section.querySelector('.ext-level');
  const tagAvant = section.querySelector('.ext-tag--avant');
  const tagApres = section.querySelector('.ext-tag--apres');
  const wash = (p) => {
    before.style.clipPath = `inset(${(p * 100).toFixed(2)}% 0 0 0)`;
    level.style.transform = `translate3d(0, ${p * frame.offsetHeight - 1}px, 0)`;
    level.style.opacity = p > 0.002 && p < 0.998 ? '1' : '0';
    tagAvant.style.opacity = String(Math.max(0, 1 - p * 1.6));
    tagApres.style.opacity = String(Math.max(0, (p - 0.35) / 0.3));
  };
  if (mobile) {
    // téléphone : la façade se lave d'un seul geste quand elle est à l'écran, sans suivre le doigt
    const run = { p: 0 };
    wash(0);
    ScrollTrigger.create({
      trigger: frame,
      start: 'top 55%',
      once: true,
      onEnter: () => gsap.to(run, { p: 1, duration: 2.4, ease: 'power2.inOut', onUpdate: () => wash(run.p) }),
    });
  } else {
    ScrollTrigger.create({
      trigger: frame,
      start: 'bottom 98%',
      end: () => `top ${Math.round(document.querySelector('.nav').offsetHeight + 24)}px`,
      scrub: 0.6,
      onUpdate: (self) => wash(self.progress),
    });
  }

  gsap.from('.ext-item', {
    opacity: 0, y: 18, duration: 1, stagger: 0.12,
    scrollTrigger: { trigger: '.ext-facade-copy', start: 'top 85%', toggleActions: mobile ? 'play none none none' : 'play none none reverse' },
  });
}
