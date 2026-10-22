/* Contact : chaque champ repose sur un cordeau qui se tend quand on écrit ; le pied de page reçoit son rang de tuiles */
import { tileEdge } from './edge.js';

export function initContact({ gsap, mobile }) {
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

  // envoi : formulaires Netlify (le formulaire est déclaré dans la page, Netlify le reconnaît au déploiement)
  const status = form.querySelector('.ctc-status');
  const say = (text, error) => {
    status.textContent = text;
    status.classList.toggle('is-error', !!error);
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach((inp) => {
      const bad = inp.value.trim() === '';
      inp.closest('.ctc-field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { form.querySelector('.is-invalid input')?.focus(); return; }
    if (form.classList.contains('is-sending')) return;
    form.classList.add('is-sending');
    say('Envoi en cours…');
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      form.querySelectorAll('.ctc-field').forEach((f) => f.classList.remove('is-filled'));
      say('Merci, votre demande est envoyée. Nous vous rappelons pour fixer un rendez-vous.');
    } catch (err) {
      say('L’envoi n’a pas abouti. Appelez-nous directement au 06 03 94 66 58.', true);
    } finally {
      form.classList.remove('is-sending');
    }
  });

  // les cordeaux des champs se tendent une première fois à l'arrivée, puis se relâchent
  const cords = [...form.querySelectorAll('.ctc-cord')];
  gsap.timeline({ scrollTrigger: { trigger: form, start: 'top 72%', toggleActions: 'play none none none' } })
    .fromTo(cords, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut', stagger: 0.07 })
    .to(cords, { scaleX: 0, transformOrigin: 'right center', duration: 0.8, ease: 'expo.inOut', stagger: 0.07, clearProps: 'transform,transformOrigin' }, 0.55);

  /* pied de page */
  tileEdge(document.querySelector('.foot-edge'), mobile);
  gsap.from('.foot-logo', {
    rotate: -24, scale: 0.8, opacity: 0, duration: 1.3, ease: 'expo.out',
    scrollTrigger: { trigger: '.foot', start: 'top 85%', toggleActions: 'play none none none' },
  });
}
