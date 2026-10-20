/* Prestations : chaque ligne se trace au cordeau au rythme de la lecture ; un clic prépare la demande de devis */

export function initServices({ gsap, ScrollTrigger }) {
  // le trait de coupe se tire au moment où le panneau recouvre la maquette
  gsap.fromTo('.svc-cut', { scaleX: 0 }, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.svc', start: 'top 92%', end: 'top 35%', scrub: 0.4 },
  });

  const rows = [...document.querySelectorAll('.svc-grid a')];
  ScrollTrigger.create({
    trigger: '.svc-grid',
    start: 'top 84%',
    end: 'bottom 70%',
    scrub: 0.5,
    onUpdate: (self) => {
      // deux colonnes : les lignes d'un même rang se tracent ensemble, rang après rang
      const n = Math.ceil(rows.length / 2);
      const p = self.progress * (n + 1.5);
      rows.forEach((a, i) => {
        const row = Math.floor(i / 2) + (i % 2) * 0.3;
        const l = Math.min(1, Math.max(0, p - row));
        a.style.setProperty('--l', l.toFixed(3));
        a.style.setProperty('--t', Math.min(1, Math.max(0, (l - 0.2) / 0.6)).toFixed(3));
      });
    },
  });

  document.querySelectorAll('a[data-service]').forEach((a) => {
    a.addEventListener('click', () => {
      const box = document.querySelector(`.ctc-chips input[value="${CSS.escape(a.dataset.service)}"]`);
      if (box) box.checked = true;
    });
  });
}
