/* Chargement puis ouverture (≈ 1,3 s une fois la 3D prête).
   Pendant le chargement, tout est en CSS : le logo est là dès la première image, l'anneau orange tourne.
   Dès que la 3D est prête, l'anneau se referme, l'ensemble va se poser sur le logo de la navigation
   et le voile s'ouvre sur la toiture. */

export async function playIntro({ gsap }, onReveal) {
  const intro = document.querySelector('.intro');
  const mark = intro.querySelector('.intro-mark');
  const ring = intro.querySelector('.intro-ring');
  const circle = ring.querySelector('circle');
  const logo = intro.querySelector('.intro-logo');
  const name = intro.querySelector('.intro-name');
  const navLogo = document.querySelector('.nav-logo');

  // on laisse finir l'apparition du logo et du nom (si la page est prête très vite), puis GSAP prend la main
  await Promise.all([logo, name].flatMap((el) => el.getAnimations().map((a) => a.finished))).catch(() => {});
  logo.style.animation = 'none';
  name.style.animation = 'none';

  gsap.set('.nav-links a, .nav-actions > *, .nav-wordmark', { opacity: 0 });
  gsap.set(navLogo, { opacity: 0 });

  return new Promise((resolve) => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: resolve });
    // l'arc qui tournait se referme en anneau complet
    const arc = { v: 0.26 };
    tl.to(arc, { v: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: () => { circle.style.strokeDasharray = `${arc.v.toFixed(4)} 1`; } }, 0)
      .to(name, { opacity: 0, y: -6, duration: 0.35, ease: 'power2.in' }, 0.05)
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
      }, 0.5)
      .to(intro, { backgroundColor: 'rgba(27,35,38,0)', duration: 0.6, ease: 'power2.inOut' }, 0.56)
      .to(ring, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 1.0)
      .set(navLogo, { opacity: 1 }, 1.25)
      .set(intro, { display: 'none' }, 1.26)
      .to('.nav-wordmark', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 1.1)
      .to('.nav-links a, .nav-actions > *', { opacity: 1, duration: 0.6, stagger: 0.03, ease: 'power2.out' }, 1.0);
  });
}
