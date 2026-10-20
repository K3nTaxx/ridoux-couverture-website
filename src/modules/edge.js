/* Bord supérieur au profil d'un rang de tuiles romanes (le recouvrement d'un rang sur l'autre) */

export function tileEdge(svg) {
  const draw = () => {
    const w = window.innerWidth;
    const h = 62, base = 36, r = 24, pan = 78;
    const period = pan + r * 2;
    let d = `M0 ${h} L0 ${base}`;
    let x = 0;
    while (x < w + period) {
      d += ` L${x + pan} ${base}`;
      d += ` A${r} ${r} 0 0 1 ${x + pan + 2 * r} ${base}`;
      x += period;
    }
    d += ` L${x} ${h} Z`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.querySelector('path').setAttribute('d', d);
  };
  draw();
  window.addEventListener('resize', draw);
}
