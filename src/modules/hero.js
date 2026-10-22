/* Haut de page : la toiture se pose rang par rang dans le soir ; dès qu'on défile, elle se transforme sur place
   en vue éclatée, couche par couche, pendant que le ciel passe à l'heure bleue.
   Ce module dirige aussi la caméra de la maquette pour toute la page (haut de page, coupe, drone, SOS). */
import { onResize } from './resize.js';

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
    // le ciel reste derrière la coupe : on ne quitte jamais le soir pour un aplat
    sky.style.opacity = String(Math.max(cv.hero, cv.cpe) * cv.sky);
  };
  ctx.canvasVis = cv;
  ctx.applyCanvas = applyCanvas;

  gsap.set('.hero-line > span', { yPercent: 110 });
  gsap.set('.hero-lead', { opacity: 0, y: 16 });
  gsap.set('.hero-title .t-u', { backgroundSize: '0% 0.07em' });

  /* ---------- directeur de caméra ----------
     le haut de page et la coupe se mesurent en écrans défilés : HERO_VH pour la transformation, CPE_VH pour la coupe.
     Une seule courbe pour les deux : la caméra ne s'arrête jamais en passant de l'un à l'autre. */
  const HERO_VH = 1, CPE_VH = 0.5;
  const C = HERO_VH;
  ctx.journey = { HERO_VH, CPE_VH };
  // la transformation s'achève juste avant la coupe ; le demi-tour, et la légère descente pendant qu'il tourne
  const END = 0.92, TURN = -180, DIP = 0.05;
  // H0 : la toiture au milieu du soir ; C1 → C2 : la vue éclatée, qui tourne lentement pendant qu'on lit
  const H0 = { az: 60, el: 12, dist: 16.5, tx: 0, ty: 0.1, tz: 0, shiftX: 0, shiftY: 0.02, sunAz: 100, sunEl: 14, yaw: 0, exposure: 1.04 };
  const C1 = { az: 52, el: 17, dist: 25.5, tx: 0, ty: 0.6, tz: 0, shiftX: 0.035, shiftY: -0.03, sunAz: 70, sunEl: 30, yaw: -10, exposure: 1.12 };
  const C2 = { ...C1, az: 57, yaw: -24 };
  // drone : la maison de trois quarts, en haut à droite, le drone posé devant elle
  const DR = { az: 30, el: 19, dist: 17.5, tx: 0, ty: 0.9, tz: 0, shiftX: 0.2, shiftY: -0.05, sunAz: 115, sunEl: 34, yaw: 0, exposure: 1.06 };
  // SOS : la maquette vue depuis le pignon, comme une maison sous la pluie
  const S0 = { az: 90, el: 34, dist: 12.8, tx: 2.0, ty: 0.2, tz: 0, shiftX: 0, shiftY: 0, sunAz: 140, sunEl: 38, yaw: 0, exposure: 0.98 };
  const S1 = { ...S0, el: 13, dist: 11.4 };
  // téléphone : une couverture qui ne bouge pas (la maison au centre, sous le titre, les tuiles qui volent)
  // et le drone sous son texte ; ni transformation, ni coupe, ni maison sous la pluie
  if (ctx.mobile) {
    Object.assign(H0, { dist: 37, shiftX: -0.01, shiftY: 0.03 });
    Object.assign(DR, { dist: 39, shiftX: -0.01, shiftY: 0.18 });
  }
  // tablette en paysage : la vue éclatée tient entre ses deux colonnes d'étiquettes, la maison du drone à côté du texte
  if (ctx.compact) {
    Object.assign(C1, { dist: 34, shiftX: -0.015 });
    Object.assign(C2, { ...C1, az: 57, yaw: -24 });
    Object.assign(DR, { dist: 20.5, shiftX: 0.23 });
  }
  // et la distance suit la proportion de l'écran (un téléphone plus étroit recule un peu plus)
  // (mesurée seulement quand la largeur change : la barre d'adresse qui bouge ne fait pas sauter la maquette)
  let fit = 1, fitW = 0;
  const measureFit = () => {
    if (!ctx.mobile || canvas.clientWidth === fitW || !canvas.clientHeight) return;
    fitW = canvas.clientWidth;
    fit = Math.min(1.3, Math.max(0.8, 0.462 / (canvas.clientWidth / canvas.clientHeight)));
  };
  measureFit();
  const keys = Object.keys(H0);
  const intro = { dist: 0, el: 0, az: 0 };
  // dT, dScan, dLaser : la mission du drone, jouée en boucle par drone.js
  const cam = { heroP: 0, cpeP: 0, sosP: 0, sosOn: false, droneOn: false, dT: 0, dScan: 0, dLaser: 0 };
  // écrans défilés depuis le haut de page (la coupe enchaîne sans coupure)
  ctx.journeyS = () => (cam.cpeP > 0 ? C + cam.cpeP * CPE_VH : cam.heroP * HERO_VH);
  const lerp = (a, b, t) => a + (b - a) * t;
  const io = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const ramp = (s, a, b) => clamp01((s - a) / (b - a));
  function mixState(A, B, t) { for (const k of keys) st[k] = lerp(A[k], B[k], t); }

  ctx.updateCam = () => {
    st.drone = 0; st.droneCam = 0; st.droneAim = 0; st.droneFov = 0; st.rigK = 0; st.scan = 0; st.defect = 0; st.floor = 0; st.fov = 22;
    st.pathMix = 0; st.hole = 0; st.lath = 0; st.tear = 0; st.inside = 0; st.dark = 0; st.glowLath = 0; st.glowEcran = 0;
    if (cam.droneOn) {
      // vérification par drone : la caméra ne bouge pas (sauf au curseur) ; le drone joue sa mission tout seul
      mixState(DR, DR, 0);
      st.explode = 0; st.sos = 0; st.air = 0;
      st.drone = 1;
      st.floor = 1;
      st.defect = 1;
      st.droneT = cam.dT;
      st.droneScan = cam.dScan;
      st.droneUp = 0;
      st.scan = cam.dLaser;
    } else if (cam.sosOn) {
      mixState(S0, S1, 1 - Math.pow(1 - clamp01(cam.sosP), 3));
      st.explode = 0;
      st.sos = 1;
      st.air = 0;
    } else {
      const s = ctx.journeyS();
      // dès qu'on défile, la toiture se transforme sur place : elle fait un demi-tour sur elle-même en descendant
      // un peu, la caméra recule et passe un peu au-dessus, le toit se sépare couche par couche (voir maquette.js)
      const k = smooth(ramp(s, 0.02, END));
      if (s <= END) {
        mixState(H0, C1, k);
        const arc = Math.sin(Math.PI * k);
        st.el += 9 * arc;
        st.shiftY += DIP * arc;
      } else mixState(C1, C2, ramp(s, END, C + CPE_VH));
      st.yaw += TURN * k;
      st.explode = smooth(ramp(s, 0.06, END));
      // les tuiles en suspens s'envolent pendant que le toit s'ouvre
      st.air = 1 - ramp(s, 0.02, 0.6);
      st.sos = 0;
    }
    st.dist += intro.dist; st.el += intro.el; st.az += intro.az;
    st.dist *= fit;
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

  /* ---------- la transformation, au défilement ----------
     le grand titre se sépare comme les couches du toit (la première ligne monte, la seconde descend),
     les tuiles en suspens s'envolent, la toiture s'ouvre couche par couche et le ciel passe à l'heure bleue.
     La coupe « couche par couche » prend la suite sans casser le mouvement. */
  const vis = { hero: true, cpe: false, drone: false, sos: false };
  const apply = () => maquette.setActive(vis.hero || vis.cpe || vis.drone || vis.sos);
  const copy = document.querySelector('.hero-copy');
  const lineA = back.querySelector('.hero-line--a');
  const lineB = back.querySelector('.hero-line--b');
  const place = back.querySelector('.hero-line--place');
  function heroScroll(p) {
    cam.heroP = p;
    ctx.updateCam();
    const s = p * HERO_VH;
    const pc = io(ramp(s, 0, 0.3));
    copy.style.transform = `translate3d(0, ${(-40 * pc).toFixed(1)}px, 0)`;
    copy.style.opacity = String(1 - pc);
    copy.style.pointerEvents = pc > 0.5 ? 'none' : '';
    const sep = io(ramp(s, 0, 0.5));
    lineA.style.transform = `translate3d(0, ${(-110 * sep).toFixed(1)}px, 0)`;
    lineB.style.transform = `translate3d(0, ${(80 * sep).toFixed(1)}px, 0)`;
    place.style.opacity = String(1 - pc);
    const fade = io(ramp(s, 0.06, 0.5));
    back.style.opacity = String(1 - fade);
    back.style.visibility = fade >= 1 ? 'hidden' : '';
    const ps = io(ramp(s, 0, C));
    glow.style.transform = `translate3d(0, ${(-4 * ps).toFixed(2)}%, 0) scale(${(1 + 0.2 * ps).toFixed(4)})`;
    sky.style.setProperty('--night', io(ramp(s, 0.05, C)).toFixed(3));
    if (cv.heroReady) applyCanvas();
  }
  ctx.setCoupeVisible = (v) => { vis.cpe = v; apply(); };
  ctx.setSosVisible = (v) => { vis.sos = v; apply(); };
  ctx.setDroneVisible = (v) => { vis.drone = v; apply(); };

  /* ---------- téléphone : une couverture qui ne bouge pas ----------
     pas d'épinglage ni de transformation : on défile, la page monte, la maison reste telle quelle.
     La toile n'est pas fixée à l'écran (un calque fixé, recalé à chaque défilement, tremble sur un téléphone) :
     elle est posée dans le haut de page et défile avec lui ; le drone la reprend dans sa section. */
  if (ctx.mobile) {
    const heroEl = document.querySelector('.hero');
    let placed = heroEl;
    ctx.placeCanvas = (section) => {
      placed = section;
      canvas.style.top = `${section.offsetTop}px`;
      canvas.style.height = `${section.offsetHeight}px`;
      maquette.resize();
      measureFit();
      ctx.updateCam();
    };
    ctx.placeCanvas(heroEl);
    onResize(() => ctx.placeCanvas(placed), true);
    ScrollTrigger.create({
      trigger: heroEl,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => { vis.hero = self.isActive; apply(); },
    });
    return;
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
}
