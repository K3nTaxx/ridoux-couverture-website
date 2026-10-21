/* Partenaires : les logos défilent en boucle, lentement ; le défilement de la page les pousse un instant,
   le survol les ralentit pour qu'on puisse en regarder un. */

export function initPartners({ gsap, lenis }) {
  const band = document.querySelector('.prt-band');
  if (!band) return;
  const track = band.querySelector('.prt-track');
  const base = [...track.children];
  let setW = 0, x = 0, boost = 0, hover = false, visible = false;

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

  band.addEventListener('pointerenter', () => { hover = true; });
  band.addEventListener('pointerleave', () => { hover = false; });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(band);
  lenis.on('scroll', ({ velocity }) => { boost = Math.max(boost, Math.min(520, Math.abs(velocity) * 26)); });

  let speed = 36;
  gsap.ticker.add((time, dt) => {
    if (!visible || !setW) return;
    speed += ((hover ? 6 : 36) - speed) * Math.min(1, dt / 240);
    x -= ((speed + boost) * dt) / 1000;
    boost *= Math.pow(0.9, dt / 16.7);
    if (x <= -setW) x += setW;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  });
}
