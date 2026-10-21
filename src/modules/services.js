/* Prestations : chaque ligne se trace au cordeau quand la liste arrive ; un clic prépare la demande de devis */

export function initServices({ gsap, ScrollTrigger }) {
  // le trait de coupe se tire au moment où le panneau recouvre la maquette
  gsap.fromTo('.svc-cut', { scaleX: 0 }, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.svc', start: 'top 92%', end: 'top 35%', scrub: 0.4 },
  });

  // la liste se pose d'un seul geste quand elle arrive : chaque ligne se tire au cordeau, rang après rang,
  // puis son texte monte. Jouée une fois, elle ne reste jamais à moitié affichée si l'on s'arrête de défiler.
  const rows = [...document.querySelectorAll('.svc-grid a')];
  const texts = rows.map((a) => [...a.querySelectorAll('.svc-name, .svc-mat')]);
  const side = ['.svc-lead', '.svc-hint', '.svc-guarantee', '.svc-more'];
  gsap.set(rows, { '--l': 0, '--t': 0 });
  texts.forEach((t) => gsap.set(t, { yPercent: 60, opacity: 0 }));
  gsap.set(side, { opacity: 0, y: 18 });
  const tl = gsap.timeline({
    paused: true,
    onComplete: () => texts.forEach((t) => gsap.set(t, { clearProps: 'transform,opacity' })),
  });
  rows.forEach((a, i) => {
    // deux colonnes : les lignes d'un même rang partent ensemble, la seconde un souffle après
    const at = Math.floor(i / 2) * 0.09 + (i % 2) * 0.05;
    tl.to(a, { '--l': 1, duration: 0.9, ease: 'expo.out' }, at)
      .to(a, { '--t': 1, duration: 0.7, ease: 'power2.out' }, at + 0.18)
      .to(texts[i], { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, at + 0.14);
  });
  tl.to(side, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.1);
  ScrollTrigger.create({ trigger: '.svc-grid', start: 'top 80%', once: true, onEnter: () => tl.play() });

  document.querySelectorAll('a[data-service]').forEach((a) => {
    a.addEventListener('click', () => {
      const box = document.querySelector(`.ctc-chips input[value="${CSS.escape(a.dataset.service)}"]`);
      if (box) box.checked = true;
    });
  });
}
