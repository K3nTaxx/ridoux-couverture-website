/* Haut de page : la toiture se pose rang par rang dans le soir, puis on entre dedans.
   Ce module dirige aussi la caméra de la maquette pour toute la page (haut de page, coupe, drone, SOS). */

export function initHero(ctx) {
  const { gsap, ScrollTrigger, maquette } = ctx;
  const st = maquette.st;
  const canvas = document.querySelector('.maquette');
  const sky = document.querySelector('.sky');
  const glow = sky.querySelector('.sky-glow');
  const back = document.querySelector('.hero-back');
  const cv = { hero: 0, cpe: 0, drone: 0, sos: 0, sky: 1 };
  const applyCanvas = () => {
    canvas.style.opacity = String(Math.max(cv.hero, cv.cpe, cv.drone, cv.sos));
    sky.style.opacity = String(cv.hero * cv.sky);
  };
  ctx.canvasVis = cv;
  ctx.applyCanvas = applyCanvas;

  gsap.set('.hero-line > span', { yPercent: 110 });
  gsap.set('.hero-lead', { opacity: 0, y: 16 });
  gsap.set('.hero-title .t-u', { backgroundSize: '0% 0.07em' });

  /* ---------- directeur de caméra ----------
     tout le voyage se mesure en écrans défilés : le haut de page en dure HERO_VH, la coupe CPE_VH.
     Une seule courbe pour les deux : la caméra ne s'arrête jamais en passant de l'un à l'autre. */
  // plus court qu'avant : on passe des liteaux directement dans la charpente
  const HERO_VH = 2.3, CPE_VH = 1.8;
  ctx.journey = { HERO_VH, CPE_VH };
  // H0 : la toiture au milieu du soir ; HI : la lumière plonge dans le trou ouvert
  const H0 = { az: 60, el: 12, dist: 16.5, tx: 0, ty: 0.1, tz: 0, shiftX: 0, shiftY: 0.02, sunAz: 100, sunEl: 14, yaw: 0, exposure: 1.04 };
  const HI = { ...H0, shiftY: 0, sunAz: 12, sunEl: 52, exposure: 1.08 };
  const C1 = { az: 52, el: 17, dist: 25.5, tx: 0, ty: 0.6, tz: 0, shiftX: 0.035, shiftY: -0.03, sunAz: 70, sunEl: 30, yaw: -10, exposure: 1.12 };
  const C2 = { ...C1, az: 57, yaw: -24 };
  // drone : la maison de trois quarts, d'abord à droite du titre, puis au centre une fois le titre effacé
  const D0 = { az: 34, el: 13, dist: 18, tx: 0.2, ty: 0.45, tz: 0, shiftX: 0.2, shiftY: 0.03, sunAz: 115, sunEl: 34, yaw: 0, exposure: 1.06 };
  const D1 = { ...D0, az: 46, el: 20, dist: 13, shiftX: 0 };
  // SOS : la maquette vue depuis le pignon, comme une maison sous la pluie
  const S0 = { az: 90, el: 34, dist: 12.8, tx: 2.0, ty: 0.2, tz: 0, shiftX: 0, shiftY: 0, sunAz: 140, sunEl: 38, yaw: 0, exposure: 0.98 };
  const S1 = { ...S0, el: 13, dist: 11.4 };
  const keys = Object.keys(H0);
  const intro = { dist: 0, el: 0, az: 0 };
  const cam = { heroP: 0, cpeP: 0, sosP: 0, sosOn: false, droneP: 0, droneOn: false };
  const lerp = (a, b, t) => a + (b - a) * t;
  const io = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const ramp = (s, a, b) => clamp01((s - a) / (b - a));
  const bump = (s, a, b, c, d) => io(ramp(s, a, b)) * (1 - io(ramp(s, c, d)));
  function mixState(A, B, t) { for (const k of keys) st[k] = lerp(A[k], B[k], t); }

  // interpolation cubique monotone : la caméra ralentit sur chaque couche sans jamais s'arrêter
  function spline(knots) {
    const n = knots.length, xs = knots.map((k) => k[0]), ys = knots.map((k) => k[1]);
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m.push(d[0]);
    for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    m.push(d[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  // écrans défilés → point de la trajectoire (voir maquette.js) :
  // tuiles, liteaux, puis l'écran se déchire et l'on plonge entre deux chevrons dans les combles,
  // enfin la sortie par le pignon dans la coupe (C = début de la coupe)
  const C = HERO_VH;
  const pathU = spline([[0, 0], [0.7, 1], [0.95, 2], [1.2, 3], [1.36, 4], [1.48, 5], [1.62, 6], [1.9, 7], [C, 8], [C + 0.3, 9], [C + 0.72, 10], [C + 1.15, 11]]);

  ctx.updateCam = () => {
    st.drone = 0; st.droneCam = 0; st.droneFov = 0; st.scan = 0; st.defect = 0; st.floor = 0; st.fov = 22;
    if (cam.droneOn) {
      // vérification par drone : il décolle devant la maison, la caméra le rejoint et regarde sous lui,
      // il balaie le toit d'un pignon à l'autre, puis monte pour le montrer en entier
      const p = cam.droneP;
      // la sortie du drone s'étale sur un quart de la section, avec une courbe douce aux deux bouts
      const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
      const e = smooth(ramp(p, 0.76, 1));
      if (p < 0.76) mixState(D0, D1, io(ramp(p, 0.02, 0.3)));
      else {
        // en sortant du drone, la vue s'incline vers 45° et tourne pendant qu'elle s'éloigne ;
        // la maison repasse à droite pour laisser revenir le texte
        st.az = lerp(0, -66, e); st.el = lerp(85, 40, e); st.dist = lerp(6.5, 19.5, e);
        st.tx = lerp(-1.7, 0.1, e); st.ty = lerp(0.5, 0.9, e); st.tz = 0;
        st.shiftX = 0.2 * e; st.shiftY = 0;
        st.sunAz = D0.sunAz; st.sunEl = D0.sunEl; st.yaw = 0; st.exposure = D0.exposure;
      }
      st.explode = 0; st.sos = 0;
      st.pathMix = 0; st.hole = 0; st.lath = 0; st.tear = 0; st.inside = 0; st.dark = 0; st.air = 0;
      st.drone = 1;
      st.floor = 1;
      st.defect = 1;
      st.droneT = io(ramp(p, 0.04, 0.34));
      const inPov = io(ramp(p, 0.3, 0.46));
      st.droneCam = inPov * (1 - e);
      st.droneFov = inPov * (1 - e);
      st.droneScan = io(ramp(p, 0.46, 0.74));
      st.droneUp = e;
      // le laser s'éteint doucement pendant que la caméra commence à quitter le drone
      st.scan = io(ramp(p, 0.43, 0.48)) * (1 - smooth(ramp(p, 0.72, 0.86)));
    } else if (cam.sosOn) {
      mixState(S0, S1, 1 - Math.pow(1 - clamp01(cam.sosP), 3));
      st.explode = 0;
      st.sos = 1;
      st.pathMix = 0; st.hole = 0; st.lath = 0; st.tear = 0; st.inside = 0; st.dark = 0; st.air = 0;
    } else {
      const s = cam.cpeP > 0 ? C + cam.cpeP * CPE_VH : cam.heroP * HERO_VH;
      const k = io(ramp(s, 0.03, 0.6));          // de l'orbite à la trajectoire
      const out = io(ramp(s, C + 0.25, C + 1.1)); // de la trajectoire à l'orbite de la coupe
      if (s < C + 0.25) mixState(H0, HI, k);
      else if (s < C + 1.1) mixState(HI, C1, out);
      else mixState(C1, C2, ramp(s, C + 1.1, C + CPE_VH));
      // les liteaux en lumière rasante, puis le soleil se redresse pour plonger dans la déchirure
      const rake = bump(s, 0.55, 0.8, 1.15, 1.45);
      st.sunAz = lerp(st.sunAz, 4, rake);
      st.sunEl = lerp(st.sunEl, 19, rake);
      st.pathMix = k * (1 - out);
      st.u = pathU(s);
      // on ouvre couche par couche, et la coupe referme dans l'ordre inverse
      st.hole = io(ramp(s, 0.25, 0.65)) * (1 - io(ramp(s, C + 0.4, C + 0.95)));
      st.lath = io(ramp(s, 0.95, 1.25)) * (1 - io(ramp(s, C + 0.28, C + 0.65)));
      st.tear = io(ramp(s, 1.22, 1.45)) * (1 - io(ramp(s, C + 0.1, C + 0.38)));
      st.inside = io(ramp(s, 1.4, 1.65)) * (1 - io(ramp(s, C + 0.1, C + 0.5)));
      st.dark = s >= HERO_VH ? 1 : st.inside;
      st.explode = io(ramp(s, C + 0.9, C + 1.55));
      st.glowLath = 0.32 * bump(s, 0.62, 0.8, 0.92, 1.12);
      st.glowEcran = 0;
      st.air = 1 - ramp(s, 0.1, 0.45);
      // dans les combles, un objectif plus large : on voit la charpente, on n'a plus l'impression d'être collé dessus
      st.fov = 22 + 16 * st.inside;
      st.sos = 0;
    }
    st.dist += intro.dist; st.el += intro.el; st.az += intro.az;
  };
  ctx.cam = cam;
  ctx.updateCam();
  maquette.placeFloaters();

  ctx.heroEnter = (skip) => {
    maquette.setActive(true);
    if (skip) {
      st.build = 1;
      st.float = 1;
      cv.hero = 1;
      cv.heroReady = true;
      applyCanvas();
      gsap.set('.hero-line > span', { yPercent: 0 });
      gsap.set('.hero-lead', { opacity: 1, y: 0 });
      gsap.set('.hero-title .t-u', { backgroundSize: '100% 0.07em' });
      return;
    }
    const tl = gsap.timeline();
    tl.to(cv, { hero: 1, duration: 0.9, ease: 'power2.out', onUpdate: applyCanvas, onComplete: () => { cv.heroReady = true; } }, 0)
      .fromTo(st, { build: 0.0 }, { build: 1, duration: 3.1, ease: 'power1.inOut' }, 0)
      .fromTo(st, { float: 0 }, { float: 1, duration: 2.8, ease: 'power2.out' }, 0.3)
      .fromTo(intro, { dist: 3, el: 7, az: -8 }, { dist: 0, el: 0, az: 0, duration: 3.6, ease: 'expo.out', onUpdate: ctx.updateCam }, 0)
      .to('.hero-line > span', { yPercent: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, 0.2)
      .to('.hero-lead', { opacity: 1, y: 0, duration: 1.1 }, 0.8)
      // le souligné claque comme un cordeau, au moment où la maquette claque les siens
      .to('.hero-title .t-u', { backgroundSize: '100% 0.07em', duration: 0.32, stagger: 0.16, ease: 'power4.out' }, 1.2);
  };

  /* ---------- l'entrée dans la toiture, au défilement ----------
     le titre s'efface, la caméra plonge, les tuiles s'envolent, puis les liteaux sont déposés,
     l'écran se déchire, on passe entre deux chevrons et l'on recule le long de la charpente.
     La coupe « couche par couche » reprend ce mouvement sans le casser. */
  const vis = { hero: true, cpe: false, drone: false, sos: false };
  const apply = () => maquette.setActive(vis.hero || vis.cpe || vis.drone || vis.sos);
  const copy = document.querySelector('.hero-copy');
  const layersBox = document.querySelector('.hero-layers');
  const layers = [...layersBox.querySelectorAll('li')];
  // fenêtres d'apparition de chaque couche traversée, en écrans défilés
  const windows = [[0.25, 0.72], [0.72, 1.25], [1.6, 2.3]];
  const FADE = 0.12;
  function heroScroll(p) {
    cam.heroP = p;
    ctx.updateCam();
    const s = p * HERO_VH;
    const pc = io(ramp(s, 0, 0.34));
    copy.style.transform = `translate3d(0, ${(-50 * pc).toFixed(1)}px, 0)`;
    copy.style.opacity = String(1 - pc);
    copy.style.pointerEvents = pc > 0.5 ? 'none' : '';
    // le grand titre s'écarte comme si l'on passait au travers
    back.style.transform = `translate3d(0, ${(-70 * pc).toFixed(1)}px, 0) scale(${(1 + 0.08 * pc).toFixed(4)})`;
    back.style.opacity = String(1 - pc);
    back.style.visibility = pc >= 1 ? 'hidden' : '';
    const ps = io(ramp(s, 0, 1.6));
    glow.style.transform = `translate3d(0, ${(-6 * ps).toFixed(2)}%, 0) scale(${(1 + 0.35 * ps).toFixed(4)})`;
    cv.sky = 1 - st.inside;
    let scrim = 0;
    layers.forEach((li, i) => {
      const [a, b] = windows[i];
      const fin = ramp(s, a, a + FADE), fout = 1 - ramp(s, b - FADE, b);
      const v = Math.min(fin, fout);
      scrim = Math.max(scrim, v);
      li.style.opacity = v.toFixed(3);
      li.style.transform = `translate3d(0, ${((1 - fin) * 24 - (1 - fout) * 24).toFixed(1)}px, 0)`;
    });
    layersBox.style.setProperty('--scrim', scrim.toFixed(3));
    if (cv.heroReady) applyCanvas();
  }
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: `+=${HERO_VH * 100}%`,
    pin: true,
    onUpdate: (self) => heroScroll(self.progress),
  });
  // la coupe prend le relais de la maquette quand elle atteint le haut de l'écran
  ScrollTrigger.create({
    trigger: '.cpe',
    start: 'top top',
    onEnter: () => { vis.hero = false; apply(); cv.hero = 0; applyCanvas(); },
    onLeaveBack: () => { vis.hero = true; apply(); cv.hero = 1; applyCanvas(); },
  });
  ctx.setCoupeVisible = (v) => { vis.cpe = v; apply(); };
  ctx.setSosVisible = (v) => { vis.sos = v; apply(); };
  ctx.setDroneVisible = (v) => { vis.drone = v; apply(); };
}
