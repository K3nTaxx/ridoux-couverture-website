/* Chargement puis envol du logo (≈ 1,4 s une fois la 3D prête).
   Pendant le chargement, tout est en CSS : le logo est là dès la première image, l'anneau orange tourne.
   Dès que la 3D est prête : le nom s'efface, l'anneau se referme pendant que la marque prend une inspiration,
   puis elle s'envole en courbe (elle monte d'abord, puis glisse vers la gauche et se pose à l'horizontale)
   jusqu'au logo de la navigation ; l'anneau s'enroule et disparaît au moment où elle se pose.
   Le voile s'efface pendant le vol et le haut de page se lève derrière. */

export async function playIntro({ gsap }, onReveal) {
  const intro = document.querySelector('.intro');
  const veil = intro.querySelector('.intro-veil');
  const mark = intro.querySelector('.intro-mark');
  const circle = intro.querySelector('.intro-ring circle');
  const logo = intro.querySelector('.intro-logo');
  const name = intro.querySelector('.intro-name');
  const navLogo = document.querySelector('.nav-logo');

  // on laisse finir l'apparition du logo et du nom (si la page est prête très vite), puis GSAP prend la main
  await Promise.all([logo, name].flatMap((el) => el.getAnimations().map((a) => a.finished))).catch(() => {});
  logo.style.animation = 'none';
  name.style.animation = 'none';

  gsap.set('.nav-links a, .nav-actions > *, .nav-wordmark', { opacity: 0 });
  gsap.set(navLogo, { opacity: 0 });

  // une seule mesure : du centre de la marque au centre du logo de navigation
  const a = mark.getBoundingClientRect();
  const b = navLogo.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const end = b.width / logo.offsetWidth;

  const ring = { v: 0.26, o: 0 };
  const drawRing = () => {
    circle.style.strokeDasharray = `${ring.v.toFixed(4)} 1`;
    circle.style.strokeDashoffset = ring.o.toFixed(4);
  };

  // la courbe du vol : départ souple, pic de vitesse tôt, arrivée très longue ; l'accélération ne casse jamais
  // (lissage du 5e degré appliqué à un temps déjà freiné vers la fin)
  const glide = (t) => {
    const u = 1 - Math.pow(1 - t, 1.4);
    return u * u * u * (u * (u * 6 - 15) + 10);
  };

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve });
    tl
      // le nom se retire, l'arc se referme, la marque inspire
      .to(name, { opacity: 0, y: -10, duration: 0.35, ease: 'power2.in' }, 0)
      .to(ring, { v: 1, duration: 0.4, ease: 'power2.inOut', onUpdate: drawRing }, 0)
      .to(mark, { scale: 1.06, duration: 0.35, ease: 'sine.out' }, 0)
      // l'envol : la montée part la première et finit plus tôt, le glissement vers la gauche part un souffle après
      // et finit plus tard ; la trajectoire décrit une courbe et l'arrivée se fait à l'horizontale
      .to(mark, { y: dy, duration: 0.82, ease: glide }, 0.35)
      .to(mark, { x: dx, duration: 1.0, ease: glide }, 0.4)
      .to(mark, { scale: end, duration: 1.05, ease: glide }, 0.35)
      .add(onReveal, 0.4)
      .to(veil, { opacity: 0, duration: 0.85, ease: 'sine.inOut' }, 0.4)
      // à l'approche, l'anneau s'enroule autour du logo et disparaît
      .to(ring, { v: 0, o: -0.4, duration: 0.4, ease: 'power2.in', onUpdate: drawRing }, 0.95)
      // posé : le vrai logo prend le relais au même endroit, le nom et les liens se déposent à sa suite
      .set(navLogo, { opacity: 1 }, 1.4)
      .set(intro, { display: 'none' }, 1.4)
      .fromTo('.nav-wordmark', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' }, 1.15)
      .fromTo('.nav-links a, .nav-actions > *', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.04, ease: 'expo.out' }, 1.2);
  });
}
