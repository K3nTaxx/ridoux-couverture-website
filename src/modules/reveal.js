/* Apparitions : un seul langage pour toute la suite de la page (après le drone), ordinateur et téléphone.
   - les titres : leurs lignes montent derrière un masque (main.js) ;
   - les textes qui les accompagnent : un léger fondu qui monte ;
   - les photos : la photo descend dans son cadre et le remplit de haut en bas, comme on découvre un toit.
     (un simple déplacement dans un cadre qui la masque : la carte graphique s'en charge, rien n'est repeint)
   Tout se joue une fois, à l'arrivée. Les photos sont demandées deux écrans à l'avance, et une photo
   n'apparaît qu'une fois prête : plus d'image qui arrive après son titre. */

// les cadres (ils masquent ce qui dépasse) ; ce qu'ils contiennent descend à sa place
const PHOTOS = ['.lav-frame', '.lav-col figure', '.lav-pro-mask', '.rea-frame', '.rea-steps-row figure', '.ext-facade-frame'];
// placés par leur propre animation (la ligne avant / après, le niveau de la façade) : on n'y touche pas
const OWN = '.rea-cut, .ext-level';
const TEXTS = [
  '.lav-lead', '.lav-pro figcaption',
  '.rea-lead', '.rea-item figcaption',
  '.prt-lead', '.prt-band',
  '.ext-lead', '.ext-item',
  '.zone-lead', '.zone-list li', '.zone-ask',
  '.ctc-lead', '.ctc-ways > div', '.ctc-form',
];

// une photo (ou la vidéo) est prête quand elle est chargée et décodée
function ready(el) {
  const media = [...el.querySelectorAll('img, video')];
  const one = (m) => {
    if (m.tagName === 'IMG') {
      if (m.complete && m.naturalWidth) return Promise.resolve();
      m.loading = 'eager';
      return m.decode().catch(() => {});
    }
    if (m.readyState < 2) return new Promise((r) => m.addEventListener('loadeddata', r, { once: true }));
    return Promise.resolve();
  };
  // au plus 1,2 s d'attente : une image lente ne bloque pas la suite
  return Promise.race([Promise.all(media.map(one)), new Promise((r) => setTimeout(r, 1200))]);
}

export function initReveal({ gsap, ScrollTrigger }) {
  /* préchargement : chaque image différée est demandée quand elle arrive à deux écrans de la vue */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.loading = 'eager';
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px 200% 0px' });
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => io.observe(img));

  /* photos */
  const frames = gsap.utils.toArray(PHOTOS.join(','));
  const inside = (f) => [...f.children].filter((c) => !c.matches(OWN));
  // tout le contenu remonte d'une hauteur de cadre (les étiquettes aussi, quelle que soit leur taille)
  frames.forEach((f) => gsap.set(inside(f), { y: () => -f.offsetHeight - 2, force3D: true }));
  // le fond gris des cadres ne se montre pas avant la photo : on ne voit jamais de case vide
  gsap.set(frames, { backgroundColor: 'transparent' });
  frames.forEach((f) => f.classList.add('is-arriving'));
  ScrollTrigger.batch(frames, {
    start: 'top 86%',
    once: true,
    onEnter: (batch) => batch.forEach((f, i) => {
      ready(f).then(() => gsap.to(inside(f), {
        y: 0,
        duration: 1.5,
        delay: i * 0.12,
        ease: 'expo.inOut',
        force3D: true,
        clearProps: 'transform',
        onComplete: () => { gsap.set(f, { clearProps: 'backgroundColor' }); f.classList.remove('is-arriving'); },
      }));
    }),
  });

  /* textes */
  const texts = gsap.utils.toArray(TEXTS.join(','));
  gsap.set(texts, { opacity: 0, y: 18 });
  ScrollTrigger.batch(texts, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, delay: 0.12, ease: 'expo.out', clearProps: 'transform' }),
  });
}
