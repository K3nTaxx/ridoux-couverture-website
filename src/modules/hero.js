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
  // H0 : la toiture flotte dans le ciel ; HC : la caméra a plongé au-dessus du faîtage, dans l'axe de la photo réelle
  const H0 = { az: 66, el: 14, dist: 19.4, tx: -0.5, ty: 0.15, tz: 0, shiftX: 0.21, shiftY: -0.03, sunAz: 100, sunEl: 14, yaw: 0, exposure: 1.04 };
  const HC = { az: 90, el: 25, dist: 4.4, tx: -0.6, ty: 0.62, tz: 0, shiftX: 0, shiftY: 0, sunAz: 150, sunEl: 34, yaw: 0, exposure: 1.06 };
  const H1 = { az: 60, el: 27, dist: 16.5, tx: -0.5, ty: -0.2, tz: 0, shiftX: 0.14, shiftY: -0.02, sunAz: 100, sunEl: 13, yaw: 0, exposure: 1.02 };
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
    } else if (cam.cpeP > 0) {
      const p = cam.cpeP;
      if (p < 0.5) mixState(H1, C1, io(clamp01(p / 0.45)));
      else mixState(C1, C2, clamp01((p - 0.5) / 0.5));
      st.explode = io(clamp01((p - 0.08) / 0.5));
      st.sos = 0;
    } else {
      // plongée : interpolation logarithmique de la distance, pour un travelling régulier
      const c = io(clamp01((cam.heroP - 0.06) / 0.66));
      mixState(H0, HC, c);
      st.dist = H0.dist * Math.pow(HC.dist / H0.dist, c);
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

  /* ---------- la plongée, au défilement ----------
     le texte s'efface, la caméra plonge vers le faîtage, le ciel s'éloigne,
     puis la vraie toiture se pose par rangs, de l'égout au faîtage */
  const vis = { hero: true, cpe: false, sos: false };
  const apply = () => maquette.setActive(vis.hero || vis.cpe || vis.sos);
  const copy = document.querySelector('.hero-copy');
  const bands = [...document.querySelectorAll('.hero-band')];
  const real = document.querySelector('.hero-real');
  const realCopy = document.querySelector('.hero-real-copy');
  const N = bands.length;
  const cord = document.querySelector('.hero-cord');
  function heroScroll(p) {
    cam.heroP = p;
    ctx.updateCam();
    const pc = clamp01(p / 0.24);
    copy.style.transform = `translate3d(0, ${(-70 * io(pc)).toFixed(1)}px, 0)`;
    copy.style.opacity = String(1 - pc);
    copy.style.pointerEvents = pc > 0.5 ? 'none' : '';
    const ps = io(clamp01(p / 0.75));
    skyImg.style.transform = `translate3d(0, ${(-7 * ps).toFixed(2)}%, 0) scale(${(1 + 0.22 * ps).toFixed(4)})`;
    // la photo réelle, rang par rang, du bas vers le haut : un rang se pose, puis le suivant,
    // le cordeau orange marque le rang en cours
    const q = clamp01((p - 0.58) / 0.26);
    const t = q * N;
    bands.forEach((b, i) => {
      const row = N - 1 - i;
      const pb = io(clamp01(t - row));
      b.style.clipPath = `inset(${((1 - pb) * 100).toFixed(2)}% 0 0 -1px)`;
    });
    const edgeRow = Math.min(N - 1, Math.floor(t));
    const edgeP = io(clamp01(t - edgeRow));
    const edgeY = (N - edgeRow - edgeP) / N;
    cord.style.transform = `translate3d(0, ${(edgeY * 100).toFixed(3)}vh, 0)`;
    cord.style.opacity = q > 0 && q < 1 ? '1' : '0';
    real.style.setProperty('--shade', clamp01((p - 0.8) / 0.12).toFixed(3));
    realCopy.style.opacity = clamp01((p - 0.82) / 0.1).toFixed(3);
    realCopy.style.transform = `translate3d(0, ${(18 * (1 - clamp01((p - 0.82) / 0.1))).toFixed(1)}px, 0)`;
    // la maquette et le ciel s'arrêtent une fois la photo posée
    const covered = q >= 1;
    cv.sky = covered ? 0 : 1;
    if (vis.hero === covered) { vis.hero = !covered; apply(); }
    cv.heroShown = covered ? 0 : 1;
    if (cv.heroReady) { cv.hero = cv.heroShown; applyCanvas(); }
  }
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: '+=150%',
    pin: true,
    scrub: 0.7,
    onUpdate: (self) => heroScroll(self.progress),
  });
  // une fois la page entièrement dépassée, plus rien ne tourne pour le haut de page
  ScrollTrigger.create({
    trigger: '.fam',
    start: 'top top',
    onEnter: () => { vis.hero = false; apply(); cv.hero = 0; applyCanvas(); },
    onLeaveBack: () => heroScroll(1),
  });
  ctx.setCoupeVisible = (v) => { vis.cpe = v; apply(); };
  ctx.setSosVisible = (v) => { vis.sos = v; apply(); };
}
