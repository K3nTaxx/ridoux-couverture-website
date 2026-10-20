/* Intro (≈ 1,6 s) : l'anneau orange du logo se trace, puis va se poser sur le logo de la navigation
   pendant que le voile s'ouvre sur la toiture. Aucune image : rien ne peut s'afficher avant l'animation. */

export function playIntro({ gsap }, onReveal) {
  return new Promise((resolve) => {
    const intro = document.querySelector('.intro');
    const ring = intro.querySelector('.intro-ring');
    const circle = ring.querySelector('circle');
    const navLogo = document.querySelector('.nav-logo');

    gsap.set('.nav-links a, .nav-actions > *, .nav-wordmark', { opacity: 0 });
    gsap.set(navLogo, { opacity: 0, scale: 0.86 });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: resolve });
    // le tracé est piloté à la main : la feuille de style fixe le décalage, on l'écrase image par image
    const draw = { v: 1 };
    tl.to(draw, { v: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: () => { circle.style.strokeDashoffset = draw.v.toFixed(4); } }, 0.05)
      .add(() => {
        // l'anneau rejoint le logo de la navigation
        const a = ring.getBoundingClientRect();
        const b = navLogo.getBoundingClientRect();
        gsap.to(ring, {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: (b.width + 4) / a.width,
          duration: 0.7,
          ease: 'expo.inOut',
        });
        onReveal();
      }, 0.62)
      .to(intro, { backgroundColor: 'rgba(236,238,236,0)', duration: 0.6, ease: 'power2.inOut' }, 0.7)
      .to(navLogo, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' }, 1.18)
      .to(ring, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 1.3)
      .to('.nav-wordmark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.2)
      .to('.nav-links a, .nav-actions > *', { opacity: 1, duration: 0.6, stagger: 0.03, ease: 'power2.out' }, 1.1)
      .set(intro, { display: 'none' }, 1.62);
  });
}
