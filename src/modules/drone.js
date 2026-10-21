/* Vérification par drone : la maquette revient au milieu de la page, un drone décolle devant la maison.
   On bascule dans sa caméra, il balaie le toit d'un pignon à l'autre en tirant un trait orange
   et se verrouille sur ce qu'il repère, puis il monte pour montrer tout le toit.
   La section est épinglée ; la maquette la suit à l'entrée et à la sortie, comme si elle y était posée. */

const DRN_VH = 2.6;

export function initDrone(ctx) {
  const { gsap, ScrollTrigger, maquette, lenis } = ctx;
  const section = document.querySelector('.drn');
  const canvasEl = document.querySelector('.maquette');
  const hud = section.querySelector('.drn-hud');
  const mode = hud.querySelector('.drn-mode');
  const pct = hud.querySelector('.drn-pct');
  const time = hud.querySelector('.drn-time');
  const tape = hud.querySelector('.drn-tape');
  const box = section.querySelector('.drn-marks');
  const marks = [...box.querySelectorAll('li')].map((el) => ({ el, key: el.dataset.mark, on: false, at: 0 }));
  const points = [...section.querySelectorAll('.drn-points li')];
  const cv = ctx.canvasVis;
  const cam = ctx.cam;
  const st = maquette.st;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const ramp = (x, a, b) => clamp01((x - a) / (b - a));
  const io = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // la bande du compas : un trait tous les 5°, les points cardinaux en lettres, deux tours pour boucler
  const CARD = { 0: 'N', 90: 'E', 180: 'S', 270: 'O' };
  const STEP = 12 / 5; // pixels par degré
  for (let d = 0; d < 720; d += 5) {
    const sp = document.createElement('span');
    const a = d % 360;
    if (a % 45 === 0) sp.classList.add('is-major');
    if (CARD[a] !== undefined) {
      const em = document.createElement('em');
      em.textContent = CARD[a];
      sp.append(em);
    }
    tape.append(sp);
  }
  const compassW = () => tape.parentElement.offsetWidth;

  let p = 0, active = false, t0 = 0, bx = 0, by = 0;
  const measure = () => { const r = box.getBoundingClientRect(), s = section.getBoundingClientRect(); bx = r.left - s.left; by = r.top - s.top; };
  measure();
  window.addEventListener('resize', measure);

  /* l'état de l'écran, selon l'avancement */
  function state() {
    const hudOn = io(ramp(p, 0.36, 0.48));
    const scan = ramp(p, 0.48, 0.84);
    hud.style.setProperty('--hud', hudOn.toFixed(3));
    hud.style.setProperty('--snap', (1 - io(ramp(p, 0.38, 0.54))).toFixed(3));
    hud.style.setProperty('--scan', scan.toFixed(4));
    pct.textContent = `${Math.round(scan * 100)} %`;
    const m = p < 0.3 ? 'Décollage' : p < 0.86 ? 'Vue de dessus' : 'Vue d’ensemble';
    if (mode.textContent !== m) mode.textContent = m;
    section.classList.toggle('is-scanning', p > 0.5);
    section.classList.toggle('is-done', p > 0.88);
    points.forEach((li, i) => li.classList.toggle('is-on', p > 0.52 + i * 0.075));
  }

  /* la maquette suit la section : elle monte avec elle à l'arrivée et repart avec elle à la sortie */
  function follow() {
    const r = section.getBoundingClientRect();
    const on = r.top < window.innerHeight && r.bottom > 0;
    if (on !== active) {
      active = on;
      cam.droneOn = on;
      cv.drone = on ? 1 : 0;
      ctx.setDroneVisible(on);
      if (on) { t0 = performance.now(); measure(); }
      else canvasEl.style.transform = '';
      ctx.updateCam();
      ctx.applyCanvas();
    }
    if (on) canvasEl.style.transform = Math.abs(r.top) < 0.5 ? '' : `translate3d(0, ${r.top.toFixed(1)}px, 0)`;
  }
  lenis.on('scroll', follow);

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: `+=${DRN_VH * 100}%`,
    pin: true,
    onUpdate: (self) => {
      p = self.progress;
      cam.droneP = p;
      if (active) ctx.updateCam();
      state();
    },
  });

  /* à chaque image : repères projetés depuis la maquette, minuteur, compas */
  gsap.ticker.add(() => {
    if (!active) return;
    const s = Math.floor((performance.now() - t0) / 1000);
    time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const heading = 200 + p * 46 + st.droneScan * 8;
    tape.style.transform = `translate3d(${(compassW() / 2 - heading * STEP - 6).toFixed(1)}px, 0, 0)`;
    if (st.droneCam < 0.5) {
      for (const m of marks) if (m.on) { m.on = false; m.el.classList.remove('is-on'); }
      return;
    }
    const a = maquette.getAnchors();
    // le trait de balayage reste au centre du cadre et le toit défile vers la droite : un repère s'allume quand il l'a franchi
    const line = box.offsetWidth / 2;
    for (const m of marks) {
      const q = a[m.key];
      const x = q.x - bx, y = q.y - by;
      m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // une fois franchi, le repère reste verrouillé ; il ne s'éteint que si l'on remonte avant ce moment
      let on = m.on;
      if (!on && st.droneScan > 0.001 && (x >= line - 2 || st.droneScan > 0.999)) { on = true; m.at = Math.min(p, 0.84); }
      if (on && p < m.at - 0.002) on = false;
      if (on !== m.on) { m.on = on; m.el.classList.toggle('is-on', on); }
    }
  });

  state();
}
