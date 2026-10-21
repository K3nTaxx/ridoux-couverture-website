/* Savoir-faire : la maquette s'éclate couche par couche, chaque couche reçoit son étiquette.
   Chaque trait part de son étiquette, longe la colonne, puis rejoint son point sur la bonne couche. */

const SVGNS = 'http://www.w3.org/2000/svg';

export function initCoupe(ctx) {
  const { gsap, ScrollTrigger, maquette } = ctx;
  const section = document.querySelector('.cpe');
  const pin = section.querySelector('.cpe-pin');
  const labels = [...section.querySelectorAll('.cpe-label')];
  const svg = section.querySelector('.cpe-leaders');
  const LABEL_W = 236;

  // côté et ordre fixes : l'ordre suit la hauteur des couches, il ne change jamais pendant la rotation
  const ORDER = {
    right: ['faitage', 'tuiles', 'rive', 'liteaux'],
    left: ['charpente', 'chenau', 'isolation'],
  };
  const plan = {};
  for (const side of ['left', 'right']) ORDER[side].forEach((name, rank) => { plan[name] = { side, rank }; });
  const items = labels.map((el) => {
    const name = el.dataset.layer;
    const g = document.createElementNS(SVGNS, 'g');
    const line = document.createElementNS(SVGNS, 'polyline');
    const halo = document.createElementNS(SVGNS, 'circle');
    const dot = document.createElementNS(SVGNS, 'circle');
    halo.setAttribute('r', '8');
    halo.setAttribute('class', 'cpe-halo');
    dot.setAttribute('r', '3.6');
    dot.setAttribute('class', 'cpe-dot');
    g.append(line, halo, dot);
    svg.append(g);
    const { side, rank } = plan[name];
    el.classList.add(side === 'right' ? 'is-right' : 'is-left');
    return { el, name, g, line, halo, dot, side, rank, h: 0, y: 0 };
  });

  const measure = () => items.forEach((it) => { it.h = it.el.offsetHeight; });
  measure();
  window.addEventListener('resize', measure);

  /* placement des étiquettes à chaque image, d'après les ancres projetées.
     Elles se tracent pendant que les dernières couches s'écartent, avant que la coupe ne s'épingle :
     tant que la section monte encore sous le haut de page, on compense son décalage pour les garder sur la maquette. */
  const labelsBox = section.querySelector('.cpe-labels');
  const head = section.querySelector('.cpe-head');
  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const m = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--m')) || 64;
    const a = maquette.getAnchors();
    const reveal = gsap.utils.clamp(0, 1, (ctx.journeyS() - 0.6) / 0.4);
    const off = Math.max(0, pin.getBoundingClientRect().top);
    const shift = off ? `translate3d(0, ${(-off).toFixed(1)}px, 0)` : '';
    svg.style.transform = shift;
    labelsBox.style.transform = shift;
    // le titre aussi reste à sa place (translate, qui s'ajoute au mouvement de son apparition)
    head.style.translate = off ? `0 ${(-off).toFixed(1)}px` : '';
    const xRight = W - m - LABEL_W;
    const xLeft = Math.max(m, W * 0.235 - LABEL_W);
    for (const side of ['left', 'right']) {
      const group = items.filter((i) => i.side === side).sort((p, q) => p.rank - q.rank);
      let minY = side === 'left' ? H * 0.5 : 120;
      for (const it of group) {
        it.y = Math.max(a[it.name].y - 22, minY);
        minY = it.y + it.h + 22;
      }
      const overflow = minY - (H - 36);
      if (overflow > 0) group.forEach((it) => { it.y -= overflow; });
    }
    for (const it of items) {
      const anchor = a[it.name];
      const right = it.side === 'right';
      const order = it.rank + (right ? 0 : 0.5);
      const p = gsap.utils.clamp(0, 1, reveal * 6 - order);
      const x = right ? xRight : xLeft;
      it.el.style.transform = `translate3d(${x + (1 - p) * (right ? 14 : -14)}px, ${it.y}px, 0)`;
      it.el.style.opacity = p;
      // trait : horizontal depuis l'étiquette jusqu'au-dessus du point, puis un court coude vers lui
      const sx = right ? xRight - 12 : xLeft + LABEL_W + 12;
      const sy = it.y + 21;
      const kx = right ? Math.min(sx - 24, anchor.x + 26) : Math.max(sx + 24, anchor.x - 26);
      const ex = sx + (anchor.x - sx) * p;
      const ey = sy + (anchor.y - sy) * p;
      const kxp = sx + (kx - sx) * Math.min(1, p * 1.6);
      it.line.setAttribute('points', p < 0.62 ? `${sx},${sy} ${kxp},${sy}` : `${sx},${sy} ${kx},${sy} ${ex},${ey}`);
      it.g.style.opacity = p;
      const dp = p >= 0.98 ? 1 : 0;
      it.dot.setAttribute('cx', anchor.x);
      it.dot.setAttribute('cy', anchor.y);
      it.halo.setAttribute('cx', anchor.x);
      it.halo.setAttribute('cy', anchor.y);
      it.dot.style.opacity = dp;
      it.halo.style.opacity = dp;
    }
  }

  /* survol : la couche s'éclaire dans la maquette */
  let current = null;
  const setOn = (it) => {
    if (current === it) return;
    current = it;
    items.forEach((x) => {
      const on = x === it;
      x.el.classList.toggle('is-on', on);
      x.g.classList.toggle('is-on', on);
    });
    maquette.setFocus(it ? it.name : null);
  };
  // un léger délai à la sortie évite le clignotement quand la souris passe d'une étiquette à l'autre
  let leaveTimer = 0;
  items.forEach((it) => {
    it.el.addEventListener('pointerenter', () => { clearTimeout(leaveTimer); setOn(it); });
    it.el.addEventListener('pointerleave', () => { leaveTimer = setTimeout(() => setOn(null), 120); });
  });

  /* séquence épinglée : la progression pilote la caméra et la vue éclatée */
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${ctx.journey.CPE_VH * 100}%`,
    pin,
    anticipatePin: 1,
    onUpdate: (self) => {
      ctx.cam.cpeP = self.progress;
      ctx.updateCam();
    },
  });

  /* entrée / sortie de la maquette dans la coupe */
  ScrollTrigger.create({
    trigger: section,
    start: 'top 85%',
    end: 'bottom 15%',
    onToggle: (self) => ctx.setCoupeVisible(self.isActive),
  });
  const cv = ctx.canvasVis;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 45%',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      const total = self.end - self.start;
      const y = self.progress * total;
      const fadeIn = Math.min(1, y / (window.innerHeight * 0.35));
      const fadeOut = Math.min(1, Math.max(0, (total - y) / (window.innerHeight * 0.08)));
      cv.cpe = Math.min(fadeIn, fadeOut);
      ctx.applyCanvas();
    },
    onLeave: () => { cv.cpe = 0; ctx.applyCanvas(); },
    onLeaveBack: () => { cv.cpe = 0; ctx.applyCanvas(); },
  });
  // la maquette remonte avec la section quand le panneau des prestations la recouvre
  const canvasEl = document.querySelector('.maquette');
  ScrollTrigger.create({
    trigger: section,
    start: 'bottom bottom',
    end: 'bottom top',
    onUpdate: (self) => { canvasEl.style.transform = `translate3d(0, ${(-self.progress * window.innerHeight).toFixed(1)}px, 0)`; },
    onLeaveBack: () => { canvasEl.style.transform = ''; },
  });
  // le titre de la coupe apparaît quand la toiture finit de s'ouvrir (la section arrive par-dessous le haut de page)
  gsap.fromTo('.cpe-head', { opacity: 0, y: 24 }, {
    opacity: 1,
    y: 0,
    duration: 1.1,
    ease: 'expo.out',
    // pendant que les étiquettes se tracent, à sa place définitive
    scrollTrigger: { trigger: section, start: 'top 32%', toggleActions: 'play none none reverse' },
  });

  maquette.onFrame = () => {
    const r = section.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) layout();
  };
}
