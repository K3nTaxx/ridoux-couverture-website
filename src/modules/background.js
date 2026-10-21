/* Le fond descend la maison : soir → ardoise (coupe) → zinc → ardoise (drone) → zinc → pierre → zinc.
   La navigation passe en sombre au-dessus des zones ardoise (coupe, mur du SOS, pied de page). */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const smooth = (t) => t * t * (3 - 2 * t);

export function initBackground({ lenis, gsap }) {
  const stops = [
    ['.hero', '#1E272B'],
    ['.cpe', '#252D30'],
    ['.svc', '#E3E6E3', 0.02, 0.12],
    ['.drn', '#1B2326'],
    ['.lav', '#E3E6E3'],
    ['.rea', '#E4E5E1'],
    ['.ext', '#D8D2C8'],
    ['.zone', '#E3E5E1'],
    ['.ctc', '#ECEEEC'],
  ].map(([sel, c, a = 0.9, b = 0.55]) => ({ el: document.querySelector(sel), c: hex(c), a, b })).filter((s) => s.el);

  const nav = document.querySelector('.nav');
  const foot = document.querySelector('.foot');
  const sos = document.querySelector('.sos');
  const hero = document.querySelector('.hero');
  let last = '';
  let baseDark = false;
  function update() {
    const vh = window.innerHeight;
    let col = stops[0].c;
    for (let i = 1; i < stops.length; i++) {
      const top = stops[i].el.getBoundingClientRect().top;
      const t = Math.min(1, Math.max(0, (vh * stops[i].a - top) / (vh * stops[i].b)));
      if (t <= 0) break;
      col = mix(col, stops[i].c, smooth(t));
    }
    const lum = (0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2]) / 255;
    const overFoot = foot.getBoundingClientRect().top < 42;
    baseDark = lum < 0.42 || overFoot;
    nav.classList.toggle('is-dark', baseDark || sos.dataset.navdark === '1' || hero.dataset.navdark === '1');
    const css = `rgb(${col.join(',')})`;
    if (css !== last) {
      document.body.style.backgroundColor = css;
      last = css;
    }
  }
  lenis.on('scroll', update);
  window.addEventListener('resize', update);
  gsap.ticker.add(() => nav.classList.toggle('is-dark', baseDark || sos.dataset.navdark === '1'));
  update();
}
