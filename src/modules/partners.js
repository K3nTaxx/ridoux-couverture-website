/* Partenaires : les logos défilent en boucle, lentement et sans jamais s'arrêter ;
   le défilement de la page les pousse un instant. */

export function initPartners({ gsap, lenis }) {
  const band = document.querySelector('.prt-band');
  if (!band) return;
  const track = band.querySelector('.prt-track');
  const base = [...track.children];
  let setW = 0, x = 0, boost = 0, visible = false;

  // une série = les logos d'origine ; on la recopie (copies muettes) jusqu'à couvrir la bande deux fois
  function fill() {
    setW = base.reduce((w, li) => w + li.offsetWidth, 0);
    track.querySelectorAll('[data-copy]').forEach((li) => li.remove());
    let w = setW;
    while (w < band.offsetWidth + setW * 1.5) {
      base.forEach((li) => {
        const c = li.cloneNode(true);
        c.dataset.copy = '1';
        c.setAttribute('aria-hidden', 'true');
        c.querySelector('img').alt = '';
        track.append(c);
      });
      w += setW;
    }
  }
  fill();
  window.addEventListener('resize', fill);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(band);
  lenis.on('scroll', ({ velocity }) => { boost = Math.max(boost, Math.min(520, Math.abs(velocity) * 26)); });

  const SPEED = 36; // pixels par seconde
  gsap.ticker.add((time, dt) => {
    if (!visible || !setW) return;
    x -= ((SPEED + boost) * dt) / 1000;
    boost *= Math.pow(0.9, dt / 16.7);
    if (x <= -setW) x += setW;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  });
}
