/* Partenaires : les logos défilent en boucle, lentement, toujours à la même vitesse,
   quoi qu'on fasse sur la page. */
import { onResize } from './resize.js';

export function initPartners({ gsap, mobile }) {
  const band = document.querySelector('.prt-band');
  if (!band) return;
  const track = band.querySelector('.prt-track');
  const base = [...track.children];
  let setW = 0, x = 0, visible = false;

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
  onResize(fill, mobile);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(band);

  const SPEED = 36; // pixels par seconde
  gsap.ticker.add((time, dt) => {
    if (!visible || !setW) return;
    x -= (SPEED * dt) / 1000;
    if (x <= -setW) x += setW;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  });
}
