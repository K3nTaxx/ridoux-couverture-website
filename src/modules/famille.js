/* L'entreprise : le rang suivant recouvre le haut de page, la lettre, puis le suivi de A à Z
   qui se déroule tout seul, étape par étape, quand il arrive à l'écran. */
import { tileEdge } from './edge.js';
import { onResize } from './resize.js';

export function initFamille({ gsap, ScrollTrigger, mobile }) {
  const section = document.querySelector('.fam');
  tileEdge(section.querySelector('.fam-edge'), mobile);

  /* photo : se dévoile par le haut, comme on découvre un toit */
  const mask = section.querySelector('.fam-photo-mask');
  gsap.fromTo(mask, { clipPath: 'inset(0 0 100% 0)' }, {
    clipPath: 'inset(0 0 0% 0)',
    duration: 1.5,
    ease: 'expo.inOut',
    scrollTrigger: { trigger: mask, start: 'top 82%', toggleActions: mobile ? 'play none none none' : 'play none none reverse' },
  });
  // (au téléphone, rien ne suit le doigt : pas de glissement de la photo au défilement)
  if (!mobile) {
    gsap.fromTo(mask.querySelector('img'), { yPercent: -8 }, {
      yPercent: 0,
      ease: 'none',
      scrollTrigger: { trigger: mask, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* lettre : le texte arrive d'un bloc */
  gsap.from('.fam-text, .fam-sign', {
    opacity: 0,
    y: 24,
    duration: 1.2,
    stagger: 0.12,
    scrollTrigger: { trigger: '.fam-letter', start: 'top 72%', toggleActions: mobile ? 'play none none none' : 'play none none reverse' },
  });

  /* valeurs : le souligné se dépose au moment de la lecture */
  // (téléphone : les deux soulignés se tracent d'eux-mêmes, l'un après l'autre)
  if (mobile) {
    gsap.to(section.querySelectorAll('.fam-statement mark'), {
      backgroundSize: '100% 3px', duration: 0.9, stagger: 0.35, ease: 'power3.inOut',
      scrollTrigger: { trigger: '.fam-statement', start: 'top 78%', toggleActions: 'play none none none' },
    });
  } else {
    section.querySelectorAll('.fam-statement mark').forEach((m, i) => {
      gsap.to(m, {
        backgroundSize: '100% 4px',
        ease: 'none',
        scrollTrigger: { trigger: '.fam-statement', start: `top ${76 - i * 8}%`, end: `top ${56 - i * 8}%`, scrub: 0.6 },
      });
    });
  }

  /* suivi de A à Z : animation automatique, le cordeau se tend et coche chaque étape à son passage */
  const steps = [...section.querySelectorAll('.fam-az-steps li')];
  const cord = section.querySelector('.fam-az-cord');
  const track = section.querySelector('.fam-az-track');
  // téléphone : les étapes se lisent de haut en bas, le cordeau descend le long des coches
  const marks = () => {
    const tr = track.getBoundingClientRect();
    if (mobile) {
      const ys = steps.map((li) => { const r = li.querySelector('.fam-az-check').getBoundingClientRect(); return r.top + r.height / 2 - tr.top; });
      const len = ys[ys.length - 1] - ys[0];
      track.style.setProperty('--az-top', `${ys[0]}px`);
      track.style.setProperty('--az-len', `${len}px`);
      return ys.map((y) => (y - ys[0]) / len);
    }
    return steps.map((li) => (li.querySelector('.fam-az-check').getBoundingClientRect().left + 23 - tr.left) / tr.width);
  };
  const cordTo = (p, vars) => (mobile ? [track, { '--az': p, ...vars }] : [cord, { strokeDashoffset: 1000 - p * 1000, ...vars }]);

  gsap.set(steps, { opacity: 0.32 });
  let tl = null;
  const build = () => {
    const pos = marks();
    if (tl) tl.kill();
    gsap.set(...cordTo(0, {}));
    steps.forEach((li) => {
      const check = li.querySelector('.fam-az-check');
      gsap.set(check, { '--fill': 0 });
      gsap.set(check.querySelector('path'), { strokeDashoffset: 24 });
      gsap.set(li, { opacity: 0.32 });
    });
    tl = gsap.timeline({ paused: true });
    let t = 0;
    let prev = 0;
    pos.forEach((p, i) => {
      const li = steps[i];
      const check = li.querySelector('.fam-az-check');
      const path = check.querySelector('path');
      const d = i === 0 ? 0.35 : 0.5 + (p - prev) * 0.9;
      tl.to(...cordTo(p, { duration: d, ease: i === 0 ? 'power2.out' : 'power2.inOut' }), t);
      t += d;
      tl.to(check, { '--fill': 1, duration: 0.45, ease: 'expo.out' }, t - 0.05)
        .to(path, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, t + 0.08)
        .to(li, { opacity: 1, duration: 0.5, ease: 'power2.out' }, t - 0.05);
      t += 0.12;
      prev = p;
    });
    tl.to(...cordTo(1, { duration: 0.6, ease: 'power2.out' }), t);
  };
  build();
  onResize(() => { const played = tl.progress(); build(); tl.progress(played); }, mobile);
  ScrollTrigger.create({
    trigger: track,
    start: 'top 78%',
    onEnter: () => tl.play(0),
    // téléphone : joué une fois, il ne se rembobine pas quand on remonte
    onLeaveBack: () => { if (!mobile) tl.pause(0); },
    once: mobile,
  });
}
