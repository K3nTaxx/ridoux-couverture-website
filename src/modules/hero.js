/* Haut de page : la toiture se pose rang par rang, puis on descend la pente.
   Ce module dirige aussi la caméra de la maquette pour toute la page (haut de page, coupe, SOS). */

export function initHero(ctx) {
  const { gsap, ScrollTrigger, maquette } = ctx;
  const st = maquette.st;
  const canvas = document.querySelector('.maquette');
  const cv = { hero: 0, cpe: 0, sos: 0 };
  const applyCanvas = () => { canvas.style.opacity = String(Math.max(cv.hero, cv.cpe, cv.sos)); };
  ctx.canvasVis = cv;
  ctx.applyCanvas = applyCanvas;

  gsap.set('.hero-line > span', { yPercent: 110 });
  gsap.set('.hero-lead, .hero-copy .btn', { opacity: 0, y: 16 });
  gsap.set('.hero-title .t-u', { backgroundSize: '0% 0.07em' });

  /* ---------- directeur de caméra ---------- */
  // maquette plus présente dans le cadre : plus proche, un peu plus haute, lumière rasante
  const H0 = { az: 64, el: 1.6, dist: 22, tx: -0.2, ty: -0.1, shiftX: 0.19, shiftY: -0.02, sunAz: 112, sunEl: 10, yaw: 0, exposure: 1.04 };
  const H1 = { ...H0, az: 58, el: 24, dist: 16, ty: -0.25, shiftX: 0.12, shiftY: 0 };
  const C1 = { az: 52, el: 17, dist: 25.5, tx: 0, ty: 0.6, shiftX: 0.035, shiftY: -0.03, sunAz: 70, sunEl: 30, yaw: -10, exposure: 1.12 };
  const C2 = { ...C1, az: 57, yaw: -24 };
  // SOS : la maquette vue depuis le pignon, comme une maison sous la pluie
  const S0 = { az: 90, el: 34, dist: 12.8, tx: 2.0, ty: 0.2, shiftX: 0, shiftY: 0, sunAz: 140, sunEl: 38, yaw: 0, exposure: 0.98 };
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
      st.land = 0;
    } else if (cam.cpeP > 0) {
      const p = cam.cpeP;
      if (p < 0.5) mixState(H1, C1, io(clamp01(p / 0.45)));
      else mixState(C1, C2, clamp01((p - 0.5) / 0.5));
      st.explode = io(clamp01((p - 0.08) / 0.5));
      st.sos = 0;
      st.land = 0;
    } else {
      mixState(H0, H1, cam.heroP);
      st.explode = 0;
      st.sos = 0;
      st.land = 1;
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
      applyCanvas();
      gsap.set('.hero-line > span', { yPercent: 0 });
      gsap.set('.hero-lead, .hero-copy .btn', { opacity: 1, y: 0 });
      gsap.set('.hero-title .t-u', { backgroundSize: '100% 0.07em' });
      return;
    }
    const tl = gsap.timeline();
    tl.to(cv, { hero: 1, duration: 0.9, ease: 'power2.out', onUpdate: applyCanvas }, 0)
      .fromTo(st, { build: 0.0 }, { build: 1, duration: 3.1, ease: 'power1.inOut' }, 0)
      .fromTo(intro, { dist: 3, el: 7, az: -8 }, { dist: 0, el: 0, az: 0, duration: 3.6, ease: 'expo.out', onUpdate: ctx.updateCam }, 0)
      .to('.hero-line > span', { yPercent: 0, duration: 1.25, stagger: 0.09, ease: 'expo.out' }, 0.25)
      .to('.hero-lead', { opacity: 1, y: 0, duration: 1.1 }, 0.6)
      .to('.hero-copy .btn', { opacity: 1, y: 0, duration: 1.1 }, 0.7)
      // le souligné claque comme un cordeau, au moment où la maquette claque les siens
      .to('.hero-title .t-u', { backgroundSize: '100% 0.07em', duration: 0.32, stagger: 0.16, ease: 'power4.out' }, 1.2);
  };

  /* sortie : la caméra descend la pente pendant que la section suivante recouvre */
  gsap.to('.hero-copy', {
    yPercent: -16,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.6,
    onUpdate: (self) => { cam.heroP = self.progress; ctx.updateCam(); },
  });

  /* rendu WebGL actif seulement là où la maquette se voit */
  const vis = { hero: true, cpe: false, sos: false };
  const apply = () => maquette.setActive(vis.hero || vis.cpe || vis.sos);
  ScrollTrigger.create({
    trigger: '.fam',
    start: 'top top',
    onEnter: () => { vis.hero = false; apply(); cv.heroSaved = cv.hero; cv.hero = 0; applyCanvas(); },
    onLeaveBack: () => { vis.hero = true; apply(); cv.hero = cv.heroSaved ?? 1; applyCanvas(); },
  });
  ctx.setCoupeVisible = (v) => { vis.cpe = v; apply(); };
  ctx.setSosVisible = (v) => { vis.sos = v; apply(); };
}
