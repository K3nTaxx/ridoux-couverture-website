/* Haut de page : la toiture se pose rang par rang, puis on descend la pente.
   Ce module dirige aussi la caméra de la maquette pour toute la page (haut de page, coupe, SOS). */

export function initHero(ctx) {
  const { gsap, ScrollTrigger, maquette } = ctx;
  const st = maquette.st;
  const canvas = document.querySelector('.maquette');
  const sky = document.querySelector('.sky');
  const skyImg = sky.querySelector('img');
  const cv = { hero: 0, cpe: 0, sos: 0, sky: 1 };
  const applyCanvas = () => {
    canvas.style.opacity = String(Math.max(cv.hero, cv.cpe, cv.sos));
    sky.style.opacity = String(cv.hero * cv.sky);
  };
  ctx.canvasVis = cv;
  ctx.applyCanvas = applyCanvas;

  gsap.set('.hero-line > span', { yPercent: 110 });
  gsap.set('.hero-lead, .hero-copy .btn', { opacity: 0, y: 16 });
  gsap.set('.hero-title .t-u', { backgroundSize: '0% 0.07em' });

  /* ---------- directeur de caméra ---------- */
  // H0 : la toiture flotte au-dessus des nuages ; HI : la lumière du soleil plonge dans le trou ouvert
  const H0 = { az: 66, el: 14, dist: 19.4, tx: -0.5, ty: 0.15, tz: 0, shiftX: 0.21, shiftY: -0.03, sunAz: 100, sunEl: 14, yaw: 0, exposure: 1.04 };
  const HI = { ...H0, shiftX: 0, shiftY: 0, sunAz: 12, sunEl: 52, exposure: 1.08 };
  const C1 = { az: 52, el: 17, dist: 25.5, tx: 0, ty: 0.6, tz: 0, shiftX: 0.035, shiftY: -0.03, sunAz: 70, sunEl: 30, yaw: -10, exposure: 1.12 };
  const C2 = { ...C1, az: 57, yaw: -24 };
  // SOS : la maquette vue depuis le pignon, comme une maison sous la pluie
  const S0 = { az: 90, el: 34, dist: 12.8, tx: 2.0, ty: 0.2, tz: 0, shiftX: 0, shiftY: 0, sunAz: 140, sunEl: 38, yaw: 0, exposure: 0.98 };
  const S1 = { ...S0, el: 13, dist: 11.4 };
  const keys = Object.keys(H0);
  const intro = { dist: 0, el: 0, az: 0 };
  const cam = { heroP: 0, cpeP: 0, sosP: 0, sosOn: false };
  const lerp = (a, b, t) => a + (b - a) * t;
  const io = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  function mixState(A, B, t) { for (const k of keys) st[k] = lerp(A[k], B[k], t); }
  ctx.updateCam = () => {
    if (cam.sosOn) {
      mixState(S0, S1, 1 - Math.pow(1 - clamp01(cam.sosP), 3));
      st.explode = 0;
      st.sos = 1;
      st.pathMix = 0; st.hole = 0; st.inside = 0; st.dark = 0;
    } else if (cam.cpeP > 0) {
      // la coupe commence là où le haut de page s'arrête : dans les combles.
      // la caméra ressort, le toit se referme, puis s'éclate couche par couche
      const p = cam.cpeP;
      if (p < 0.5) mixState(HI, C1, io(clamp01(p / 0.45)));
      else mixState(C1, C2, clamp01((p - 0.5) / 0.5));
      st.pathMix = 1 - io(clamp01(p / 0.42));
      st.u = 1;
      st.hole = 1 - io(clamp01((p - 0.04) / 0.3));
      st.inside = 1 - io(clamp01(p / 0.22));
      st.dark = 1;
      st.explode = io(clamp01((p - 0.14) / 0.48));
      st.sos = 0;
    } else {
      // le haut de page : la caméra plonge, le toit s'ouvre, on entre dans les combles
      const p = cam.heroP;
      const k = io(clamp01((p - 0.03) / 0.3));
      mixState(H0, HI, k);
      st.pathMix = k;
      st.u = io(clamp01((p - 0.03) / 0.8));
      st.hole = io(clamp01((p - 0.22) / 0.22));
      st.inside = io(clamp01((p - 0.38) / 0.2));
      st.dark = st.inside;
      st.explode = 0;
      st.sos = 0;
    }
    st.dist += intro.dist; st.el += intro.el; st.az += intro.az;
  };
  ctx.cam = cam;
  ctx.updateCam();

  ctx.heroEnter = (skip) => {
    maquette.setActive(true);
    if (skip) {
      st.build = 1;
      cv.hero = 1;
      cv.heroReady = true;
      applyCanvas();
      gsap.set('.hero-line > span', { yPercent: 0 });
      gsap.set('.hero-lead, .hero-copy .btn', { opacity: 1, y: 0 });
      gsap.set('.hero-title .t-u', { backgroundSize: '100% 0.07em' });
      return;
    }
    const tl = gsap.timeline();
    tl.to(cv, { hero: 1, duration: 0.9, ease: 'power2.out', onUpdate: applyCanvas, onComplete: () => { cv.heroReady = true; } }, 0)
      .fromTo(st, { build: 0.0 }, { build: 1, duration: 3.1, ease: 'power1.inOut' }, 0)
      .fromTo(intro, { dist: 3, el: 7, az: -8 }, { dist: 0, el: 0, az: 0, duration: 3.6, ease: 'expo.out', onUpdate: ctx.updateCam }, 0)
      .to('.hero-line > span', { yPercent: 0, duration: 1.25, stagger: 0.09, ease: 'expo.out' }, 0.25)
      .to('.hero-lead', { opacity: 1, y: 0, duration: 1.1 }, 0.6)
      .to('.hero-copy .btn', { opacity: 1, y: 0, duration: 1.1 }, 0.7)
      // le souligné claque comme un cordeau, au moment où la maquette claque les siens
      .to('.hero-title .t-u', { backgroundSize: '100% 0.07em', duration: 0.32, stagger: 0.16, ease: 'power4.out' }, 1.2);
  };

  /* ---------- l'entrée dans la toiture, au défilement ----------
     le texte s'efface, la caméra plonge, les tuiles s'envolent, l'écran se déchire,
     on passe entre deux chevrons et l'on se retrouve dans les combles, traversés par un rai de lumière.
     La coupe « couche par couche » reprend exactement là. */
  const vis = { hero: true, cpe: false, sos: false };
  const apply = () => maquette.setActive(vis.hero || vis.cpe || vis.sos);
  const heroEl = document.querySelector('.hero');
  const copy = document.querySelector('.hero-copy');
  const layersBox = document.querySelector('.hero-layers');
  const layers = [...layersBox.querySelectorAll('li')];
  // fenêtres d'apparition de chaque couche traversée
  const windows = [[0.2, 0.36], [0.36, 0.5], [0.56, 0.96]];
  function heroScroll(p) {
    cam.heroP = p;
    ctx.updateCam();
    const pc = clamp01(p / 0.12);
    copy.style.transform = `translate3d(0, ${(-60 * io(pc)).toFixed(1)}px, 0)`;
    copy.style.opacity = String(1 - pc);
    copy.style.pointerEvents = pc > 0.5 ? 'none' : '';
    const ps = io(clamp01(p / 0.6));
    skyImg.style.transform = `translate3d(0, ${(-9 * ps).toFixed(2)}%, 0) scale(${(1 + 0.3 * ps).toFixed(4)})`;
    cv.sky = 1 - st.inside;
    layers.forEach((li, i) => {
      const [a, b] = windows[i];
      const fin = clamp01((p - a) / 0.05), fout = 1 - clamp01((p - (b - 0.05)) / 0.05);
      const v = Math.min(fin, fout);
      li.style.opacity = v.toFixed(3);
      li.style.transform = `translate3d(0, ${((1 - fin) * 24 - (1 - fout) * 24).toFixed(1)}px, 0)`;
    });
    layersBox.classList.toggle('is-dark', st.inside > 0.5);
    heroEl.dataset.navdark = st.inside > 0.5 ? '1' : '';
    if (cv.heroReady) applyCanvas();
  }
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=220%',
    pin: true,
    scrub: 0.8,
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
}
