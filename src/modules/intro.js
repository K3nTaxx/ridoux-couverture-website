/* Intro (≈ 1,8 s) : l'anneau orange se trace, le logo apparaît à l'intérieur, puis l'ensemble
   va se poser sur le logo de la navigation pendant que le voile s'ouvre sur la toiture.
   Le logo reste invisible tant qu'il n'est pas décodé : rien ne clignote au chargement. */

export async function playIntro({ gsap }, onReveal) {
  const intro = document.querySelector('.intro');
  const mark = intro.querySelector('.intro-mark');
  const circle = intro.querySelector('.intro-ring circle');
  const logo = intro.querySelector('.intro-logo');
  const navLogo = document.querySelector('.nav-logo');

  await logo.decode().catch(() => {});

  gsap.set('.nav-links a, .nav-actions > *, .nav-wordmark', { opacity: 0 });
  gsap.set(navLogo, { opacity: 0 });

  return new Promise((resolve) => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: resolve });
    // le tracé est piloté à la main : la feuille de style fixe le décalage, on l'écrase image par image
    const draw = { v: 1 };
    tl.to(draw, { v: 0, duration: 0.6, ease: 'power3.inOut', onUpdate: () => { circle.style.strokeDashoffset = draw.v.toFixed(4); } }, 0.05)
      .fromTo(logo, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.6 }, 0.3)
      .add(() => {
        // l'anneau et le logo rejoignent ensemble le logo de la navigation
        const a = mark.getBoundingClientRect();
        const b = navLogo.getBoundingClientRect();
        gsap.to(mark, {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: b.width / logo.offsetWidth,
          duration: 0.75,
          ease: 'expo.inOut',
        });
        onReveal();
      }, 0.8)
      .to(intro, { backgroundColor: 'rgba(236,238,236,0)', duration: 0.6, ease: 'power2.inOut' }, 0.88)
      .to(intro.querySelector('.intro-ring'), { opacity: 0, duration: 0.3, ease: 'power1.out' }, 1.35)
      .set(navLogo, { opacity: 1 }, 1.55)
      .set(intro, { display: 'none' }, 1.56)
      .to('.nav-wordmark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.4)
      .to('.nav-links a, .nav-actions > *', { opacity: 1, duration: 0.6, stagger: 0.03, ease: 'power2.out' }, 1.3);
  });
}
