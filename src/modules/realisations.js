/* Réalisations : la ligne de partage, inclinée à la pente du toit, balaie l'avant pour révéler l'après
   puis suit le curseur pour comparer. */
import { onResize } from './resize.js';

export function initRealisations({ gsap, ScrollTrigger, mobile }) {
  const items = [...document.querySelectorAll('.rea-item')];

  items.forEach((item, idx) => {
    const frame = item.querySelector('.rea-frame');
    const before = item.querySelector('.rea-before');
    const cut = item.querySelector('.rea-cut');
    const pitch = Number(item.dataset.pitch || 12);
    const state = { c: 112 };
    let w = 1, h = 1;
    const measure = () => { w = frame.offsetWidth; h = frame.offsetHeight; render(); };

    function render() {
      // décalage horizontal (en %) induit par l'inclinaison de la ligne
      const dx = (Math.tan((pitch * Math.PI) / 180) * h * 0.5) / w * 100;
      const c = state.c;
      before.style.clipPath = `polygon(0% 0%, ${c + dx}% 0%, ${c - dx}% 100%, 0% 100%)`;
      cut.style.transform = `translate3d(${(c / 100) * w - 1}px, 0, 0) rotate(${pitch}deg)`;
      cut.style.opacity = c > -8 && c < 108 ? '1' : '0';
      frame.style.setProperty('--avant-o', c > 18 ? '1' : '0');
    }
    measure();
    onResize(measure, mobile);

    let hovering = false;
    // la ligne colle au curseur, avec juste assez de souplesse pour rester fluide
    const to = (c) => gsap.to(state, { c, duration: 0.16, ease: 'power2.out', onUpdate: render, overwrite: true });

    // entrée : on voit l'avant, puis la ligne passe et laisse l'après
    ScrollTrigger.create({
      trigger: item,
      start: 'top 78%',
      onEnter: () => {
        if (hovering) return;
        // la ligne passe une fois la photo arrivée dans son cadre (reveal.js)
        gsap.fromTo(state, { c: 112 }, { c: -12, duration: 1.7, delay: 1.2 + (idx % 3) * 0.14, ease: 'power3.inOut', onUpdate: render, overwrite: true });
      },
      // (téléphone : jouée une fois, la ligne ne revient pas en arrière quand on remonte)
      onLeaveBack: () => { if (mobile) return; gsap.killTweensOf(state); state.c = 112; render(); },
      once: mobile,
    });

    frame.addEventListener('pointermove', (e) => {
      hovering = true;
      const r = frame.getBoundingClientRect();
      const y = (e.clientY - r.top) / r.height - 0.5;
      const dx = (Math.tan((pitch * Math.PI) / 180) * r.height) / r.width;
      to(((e.clientX - r.left) / r.width + y * dx) * 100);
    });
    frame.addEventListener('pointerleave', () => {
      hovering = false;
      gsap.to(state, { c: -12, duration: 1.1, ease: 'power3.inOut', onUpdate: render, overwrite: true });
    });
  });


  /* réfection en trois temps : les trois étapes sont là dès qu'on arrive, reliées par le cordeau */
  const steps = [...document.querySelectorAll('.rea-steps-row figure')];
  const cord = document.querySelector('.rea-steps-cord');
  const placeCord = () => {
    const img = steps[0].querySelector('img');
    const top = img.getBoundingClientRect().bottom - cord.parentElement.getBoundingClientRect().top + 16;
    cord.style.top = `${top - 5}px`;
    cord.style.bottom = 'auto';
  };
  placeCord();
  onResize(placeCord, mobile);
}
