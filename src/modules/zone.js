/* Zone d'intervention : la Loire et la Haute-Loire se posent, les trajets se tracent au cordeau
   depuis Le Chambon-Feugerolles (contours IGN Admin Express via france-geojson) */

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

export async function initZone({ gsap }) {
  const svg = document.querySelector('.zone-svg');
  let data;
  try {
    data = await fetch('/geo/zone.json').then((r) => r.json());
  } catch (e) {
    return;
  }
  // cadrage : Rhône-Alpes + Haute-Loire, un peu resserré
  const vb = { x: 40, y: 20, w: 900, h: data.h - 40 };
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);

  const gBase = el('g', {}, svg);
  const gCore = el('g', {}, svg);
  const gRoutes = el('g', {}, svg);
  const gNames = el('g', {}, svg);

  const core = [];
  const targets = [];
  data.deps.forEach((d) => {
    const cls = ['zone-dep'];
    if (d.ra) cls.push('is-ra');
    const p = el('path', { d: d.d, class: cls.join(' ') }, gBase);
    if (d.core) {
      const f = el('path', { d: d.d, class: 'zone-dep is-core' }, gCore);
      core.push(f);
    }
    void p;
    if (d.ra || d.code === '43') targets.push(d);
  });

  const [bx, by] = data.base;
  // trajets : lignes droites, tirées au cordeau, du siège vers chaque département
  const routes = targets
    .filter((d) => d.code !== '42')
    .sort((a, b) => Math.hypot(a.cx - bx, a.cy - by) - Math.hypot(b.cx - bx, b.cy - by))
    .map((d) => {
      const len = Math.hypot(d.cx - bx, d.cy - by);
      const line = el('line', { x1: bx, y1: by, x2: d.cx, y2: d.cy, class: 'zone-route', 'stroke-dasharray': len, 'stroke-dashoffset': len }, gRoutes);
      const end = el('circle', { cx: d.cx, cy: d.cy, r: 3.2, class: 'zone-base' }, gRoutes);
      return { line, end, len, d };
    });

  // noms
  data.deps.forEach((d) => {
    if (d.core) {
      const t = el('text', { x: d.cx, y: d.cy + (d.code === '42' ? -34 : 30), 'text-anchor': 'middle', class: 'zone-name', 'font-size': 19 }, gNames);
      t.textContent = d.nom;
    } else if (d.ra) {
      const t = el('text', { x: d.cx, y: d.cy - 10, 'text-anchor': 'middle', class: 'zone-name zone-name--minor', 'font-size': 14 }, gNames);
      t.textContent = d.nom;
    }
  });
  const ring = el('circle', { cx: bx, cy: by, r: 12, class: 'zone-base-ring' }, gNames);
  const dot = el('circle', { cx: bx, cy: by, r: 5, class: 'zone-base' }, gNames);
  const baseName = el('text', { x: bx - 14, y: by - 16, 'text-anchor': 'end', class: 'zone-name zone-name--base', 'font-size': 17 }, gNames);
  baseName.textContent = 'Le Chambon-Feugerolles';

  gsap.set(core, { opacity: 0 });
  gsap.set(gNames.querySelectorAll('.zone-name'), { opacity: 0 });
  gsap.set([ring, dot], { scale: 0, transformOrigin: '50% 50%' });
  routes.forEach((r) => gsap.set(r.end, { scale: 0, transformOrigin: '50% 50%' }));

  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.zone', start: 'top 62%', end: 'center 52%', scrub: 0.8 },
  });
  tl.to([dot, ring], { scale: 1, duration: 0.3, ease: 'expo.out' }, 0)
    .to(baseName, { opacity: 1, duration: 0.25 }, 0.05)
    .to(core, { opacity: 1, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, 0.1);
  routes.forEach((r, i) => {
    tl.to(r.line, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 0.3 + i * 0.12)
      .to(r.end, { scale: 1, duration: 0.15, ease: 'power2.out' }, 0.3 + i * 0.12 + 0.45);
  });
  tl.to(gNames.querySelectorAll('.zone-name:not(.zone-name--base)'), { opacity: 1, duration: 0.4, stagger: 0.05 }, 0.5);


}
