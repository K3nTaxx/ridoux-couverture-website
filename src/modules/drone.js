/* Vérification par drone : la maquette revient au milieu de la page, un drone décolle devant la maison.
   On bascule dans sa caméra, il balaie le toit d'un pignon à l'autre et se verrouille sur ce qu'il repère,
   puis il monte pour montrer tout le toit. La section est épinglée ; la maquette la suit à l'entrée et à la sortie,
   et peint elle-même l'ardoise du fond. Dans la vue du drone, la caméra est fixe : seul le curseur soulève les tuiles. */

const DRN_VH = 2.6;

export function initDrone(ctx) {
  const { gsap, ScrollTrigger, maquette, lenis } = ctx;
  const section = document.querySelector('.drn');
  const canvasEl = document.querySelector('.maquette');
  const hud = section.querySelector('.drn-hud');
  const blink = section.querySelector('.drn-blink');
  const pct = hud.querySelector('.drn-pct');
  const time = hud.querySelector('.drn-time');
  const tape = hud.querySelector('.drn-tape');
  const cross = hud.querySelector('.drn-cross');
  const box = section.querySelector('.drn-marks');
  const marks = [...box.querySelectorAll('li')].map((el) => ({ el, key: el.dataset.mark, on: false, at: 0 }));
  const says = section.querySelector('.drn-says');
  const title = section.querySelector('.drn-title');
  const lead = section.querySelector('.drn-lead');
  const cv = ctx.canvasVis;
  const cam = ctx.cam;
  const st = maquette.st;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const ramp = (x, a, b) => clamp01((x - a) / (b - a));
  const io = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const bump = (x, a, b, c, d) => io(ramp(x, a, b)) * (1 - io(ramp(x, c, d)));

  // la bande du compas : un trait tous les 5°, un plus long tous les 45°, deux tours pour boucler
  const STEP = 12 / 5; // pixels par degré
  for (let d = 0; d < 720; d += 5) {
    const sp = document.createElement('span');
    if (d % 45 === 0) sp.classList.add('is-major');
    tape.append(sp);
  }
  const compassW = () => tape.parentElement.offsetWidth;

  let p = 0, active = false, t0 = 0, bx = 0, by = 0, hx = 0, hy = 0;
  // positions de repos : le cadre des repères et le cadre de visée
  const measure = () => {
    const s = section.getBoundingClientRect();
    const r = box.getBoundingClientRect();
    bx = r.left - s.left; by = r.top - s.top;
    const h = hud.getBoundingClientRect();
    hx = h.left - s.left; hy = h.top - s.top;
  };
  measure();
  window.addEventListener('resize', measure);


  /* l'état de l'écran, selon l'avancement */
  function state() {
    // la caméra entre dans le drone : un battement d'obturateur, puis le cadre se referme sur l'image
    // un battement à l'entrée (on passe dans le drone) et un plus léger à la sortie (on en ressort)
    blink.style.setProperty('--blink', Math.max(0.88 * bump(p, 0.37, 0.4, 0.405, 0.44), 0.55 * bump(p, 0.765, 0.785, 0.79, 0.82)).toFixed(3));
    hud.style.setProperty('--hud', (io(ramp(p, 0.4, 0.47)) * (1 - io(ramp(p, 0.76, 0.84)))).toFixed(3));
    hud.style.setProperty('--snap', (1 - io(ramp(p, 0.4, 0.51))).toFixed(3));
    hud.style.setProperty('--hello', bump(p, 0.4, 0.43, 0.48, 0.52).toFixed(3));
    const scan = ramp(p, 0.43, 0.72);
    hud.style.setProperty('--scan', scan.toFixed(4));
    pct.textContent = `${Math.round(scan * 100)} %`;
    section.classList.toggle('is-done', p > 0.93);
    // le titre et la phrase s'effacent sur place dès qu'on défile ; ils reviennent quand on sort du drone
    if (p < 0.76) {
      const t = ramp(p, 0.015, 0.09), l = ramp(p, 0.01, 0.07);
      title.style.transform = `translate3d(0, ${(-18 * io(t)).toFixed(1)}px, 0)`;
      title.style.opacity = (1 - t).toFixed(3);
      lead.style.opacity = (1 - l).toFixed(3);
      lead.style.transform = `translate3d(0, ${(-14 * l).toFixed(1)}px, 0)`;
    } else {
      const back = io(ramp(p, 0.88, 0.95)), back2 = io(ramp(p, 0.9, 0.97));
      title.style.transform = `translate3d(0, ${((1 - back) * 24).toFixed(1)}px, 0)`;
      title.style.opacity = back.toFixed(3);
      lead.style.opacity = back2.toFixed(3);
      lead.style.transform = `translate3d(0, ${((1 - back2) * 18).toFixed(1)}px, 0)`;
    }
    // une seule légende, au milieu du balayage
    const fin = ramp(p, 0.52, 0.55), fout = 1 - ramp(p, 0.68, 0.71);
    says.style.opacity = Math.min(fin, fout).toFixed(3);
    says.style.transform = `translate3d(0, ${((1 - fin) * 22 - (1 - fout) * 22).toFixed(1)}px, 0)`;
  }

  /* la maquette suit la section : elle monte avec elle à l'arrivée et repart avec elle à la sortie */
  function follow() {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const on = r.top < vh && r.bottom > 0;
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
    // translation au pixel près : le bord de l'ardoise reste net, sans liseré qui clignote
    if (on) canvasEl.style.transform = Math.abs(r.top) < 0.5 ? '' : `translate3d(0, ${Math.round(r.top)}px, 0)`;
    // la navigation passe en sombre dès que l'ardoise est sous elle
    section.dataset.navdark = r.top <= 42 && r.bottom >= 42 ? '1' : '';
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

  /* à chaque image : croix et repères projetés depuis la maquette, minuteur, compas */
  gsap.ticker.add(() => {
    if (!active) return;
    const s = Math.floor((performance.now() - t0) / 1000);
    time.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const heading = 200 + p * 46 + st.droneScan * 8;
    tape.style.transform = `translate3d(${(compassW() / 2 - heading * STEP - 6).toFixed(1)}px, 0, 0)`;
    if (p < 0.4) {
      for (const m of marks) if (m.on) { m.on = false; m.el.classList.remove('is-on'); }
      return;
    }
    // la croix se pose sur le toit, à la verticale du drone : c'est là que passe le trait de balayage
    const sp = maquette.getScanPoint();
    const line = sp.x - bx;
    if (st.droneCam > 0.5) cross.style.transform = `translate3d(${(sp.x - hx).toFixed(1)}px, ${(sp.y - hy).toFixed(1)}px, 0)`;
    const a = maquette.getAnchors();
    for (const m of marks) {
      const q = a[m.key];
      const x = q.x - bx, y = q.y - by;
      m.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      // le toit défile vers la droite sous le trait : un repère se verrouille quand le trait l'a franchi,
      // et reste verrouillé ; il ne s'éteint que si l'on remonte avant ce moment
      let on = m.on;
      if (!on && st.droneScan > 0.001 && (x >= line - 2 || st.droneScan > 0.999)) { on = true; m.at = Math.min(p, 0.72); }
      if (on && p < m.at - 0.002) on = false;
      if (on !== m.on) { m.on = on; m.el.classList.toggle('is-on', on); }
    }
  });

  state();
}
