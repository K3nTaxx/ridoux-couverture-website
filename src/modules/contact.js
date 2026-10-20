/* Contact : chaque champ repose sur un cordeau qui se tend quand on écrit ; le pied de page reçoit son rang de tuiles */
import { tileEdge } from './edge.js';

export function initContact({ gsap }) {
  const form = document.querySelector('.ctc-form');
  form.querySelectorAll('.ctc-field input, .ctc-field textarea').forEach((input) => {
    const field = input.closest('.ctc-field');
    const sync = () => {
      field.classList.toggle('is-filled', input.value.trim() !== '');
      field.classList.remove('is-invalid');
    };
    input.addEventListener('input', sync);
    sync();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach((inp) => {
      const bad = inp.value.trim() === '';
      inp.closest('.ctc-field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) form.querySelector('.is-invalid input')?.focus();
    // l'envoi sera branché avec l'hébergement
  });

  // les cordeaux des champs se tendent une première fois à l'arrivée, puis se relâchent
  const cords = [...form.querySelectorAll('.ctc-cord')];
  gsap.timeline({ scrollTrigger: { trigger: form, start: 'top 72%', toggleActions: 'play none none reverse' } })
    .fromTo(cords, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut', stagger: 0.07 })
    .to(cords, { scaleX: 0, transformOrigin: 'right center', duration: 0.8, ease: 'expo.inOut', stagger: 0.07, clearProps: 'transform,transformOrigin' }, 0.55);
  gsap.from(form, {
    opacity: 0, y: 30, duration: 1.2,
    scrollTrigger: { trigger: form, start: 'top 88%', toggleActions: 'play none none reverse' },
  });

  /* pied de page */
  tileEdge(document.querySelector('.foot-edge'));
  gsap.from('.foot-logo', {
    rotate: -24, scale: 0.8, opacity: 0, duration: 1.3, ease: 'expo.out',
    scrollTrigger: { trigger: '.foot', start: 'top 85%', toggleActions: 'play none none reverse' },
  });
}
