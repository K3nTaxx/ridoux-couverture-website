/* Vérification par drone : la maquette revient au milieu de la page, la maison en haut à droite (le curseur la fait
   tourner), le drone posé devant elle. Dès que la section est en face, sans qu'on ait à défiler, il joue sa mission
   en boucle : il décolle, balaie le toit au laser en se verrouillant sur chaque défaut, s'arrête au bout du toit
   (les quatre repères ensemble), revient se poser, attend deux secondes et repart.
   La maquette suit la section à l'entrée et à la sortie, et peint elle-même l'ardoise du fond. */

// la mission, en secondes
const PHASES = [
  ['sol', 0.7],      // à l'arrivée seulement : une fois la section en face, les hélices montent en régime
  ['montée', 2.6],
  ['balayage', 5.4],
  ['bilan', 2.6],    // en vol stationnaire au bout du toit : les quatre repères ensemble
  ['retour', 2.2],   // il revient au-dessus du pignon de départ
  ['descente', 2.4],
  ['repos', 2.0],    // posé : il attend deux secondes et repart
];
const SOL = PHASES[0][1];
// la boucle reprend au décollage : entre deux vols, il reste posé le temps du repos, deux secondes
const LOOP = PHASES.reduce((t, [, d]) => t + d, 0) - SOL;

export function initDrone(ctx) {
  const { gsap, maquette, lenis } = ctx;
  const section = document.querySelector('.drn');
  const canvasEl = document.querySelector('.maquette');
  const box = section.querySelector('.drn-marks');
  const marks = [...box.querySelectorAll('li')].map((el) => ({ el, key: el.dataset.mark, on: false }));
  const cv = ctx.canvasVis;
  const cam = ctx.cam;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // armed : la section est en face, la mission peut partir ; avant, le drone attend posé
  let active = false, armed = false, clock = 0, last = 0, bx = 0, by = 0;
  const measure = () => { const r = box.getBoundingClientRect(), s = section.getBoundingClientRect(); bx = r.left - s.left; by = r.top - s.top; };
  measure();
  window.addEventListener('resize', measure);

  /* la maquette suit la section : elle monte avec elle à l'arrivée et repart avec elle à la sortie */
  function follow() {
    const r = section.getBoundingClientRect();
    const on = r.top < window.innerHeight && r.bottom > 0;
    if (on !== active) {
      active = on;
      cam.droneOn = on;
      cv.drone = on ? 1 : 0;
      ctx.setDroneVisible(on);
      clock = 0;
      armed = false;
      if (on) measure();
      else canvasEl.style.transform = '';
      ctx.updateCam();
      ctx.applyCanvas();
    }
    // la mission démarre quand la section occupe l'écran ; elle repart du sol à chaque nouvelle arrivée
    if (on && !armed && Math.abs(r.top) < window.innerHeight * 0.2) { armed = true; clock = 0; last = performance.now(); }
    // translation au pixel près : le bord de l'ardoise reste net
    if (on) canvasEl.style.transform = Math.abs(r.top) < 0.5 ? '' : `translate3d(0, ${Math.round(r.top)}px, 0)`;
    section.dataset.navdark = r.top <= 42 && r.bottom >= 42 ? '1' : '';
  }
  lenis.on('scroll', follow);
  window.addEventListener('resize', follow);

  /* à chaque image : on avance la mission, puis les repères suivent la maquette */
  gsap.ticker.add(() => {
    if (!active) return;
    const now = performance.now();
    if (armed) clock += Math.min(0.1, (now - last) / 1000);
    last = now;
    let t = clock < SOL ? clock : SOL + ((clock - SOL) % LOOP), phase = PHASES[0][0], u = 0;
    for (const [name, d] of PHASES) {
      if (t < d) { phase = name; u = t / d; break; }
      t -= d;
    }
    let dT = 0, dScan = 0, laser = 0;
    if (phase === 'montée') dT = smooth(u);
    else if (phase === 'balayage') { dT = 1; dScan = sine(u); laser = smooth(clamp01(u / 0.08)) * (1 - smooth(clamp01((u - 0.9) / 0.1))); }
    else if (phase === 'bilan') { dT = 1; dScan = 1; }
    else if (phase === 'retour') { dT = 1; dScan = 1 - sine(u); }
    else if (phase === 'descente') dT = 1 - smooth(u);
    cam.dT = dT;
    cam.dScan = dScan;
    cam.dLaser = laser;
    ctx.updateCam();

    // les repères : un défaut se verrouille quand le laser l'a franchi ; ils restent jusqu'à l'atterrissage
    const showAll = phase === 'bilan' || phase === 'retour' || phase === 'descente';
    const a = maquette.getAnchors();
    const line = maquette.getScanPoint().x - bx;
    for (const m of marks) {
      const q = a[m.key];
      m.el.style.transform = `translate3d(${(q.x - bx).toFixed(1)}px, ${(q.y - by).toFixed(1)}px, 0)`;
      // téléphone : l'étiquette se range du côté où elle a la place
      if (ctx.mobile) {
        const side = q.x > window.innerWidth * 0.56 ? 'left' : '';
        if (m.el.dataset.side !== side) m.el.dataset.side = side;
      }
      const on = showAll || (phase === 'balayage' && laser > 0.2 && q.x - bx >= line - 2) || (phase === 'balayage' && m.on);
      if (on !== m.on) { m.on = on; m.el.classList.toggle('is-on', on); }
    }
  });

  follow();
}
