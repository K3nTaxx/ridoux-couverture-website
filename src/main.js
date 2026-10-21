import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import 'lenis/dist/lenis.css';
import './styles/base.css';
import './styles/sections.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

import { createMaquette } from './modules/maquette.js';
import { initChrome } from './modules/chrome.js';
import { initBackground } from './modules/background.js';
import { playIntro } from './modules/intro.js';
import { initHero } from './modules/hero.js';
import { initFamille } from './modules/famille.js';
import { initCoupe } from './modules/coupe.js';
import { initServices } from './modules/services.js';
import { initDrone } from './modules/drone.js';
import { initLavage } from './modules/lavage.js';
import { initRealisations } from './modules/realisations.js';
import { initExterieurs } from './modules/exterieurs.js';
import { initSos } from './modules/sos.js';
import { initZone } from './modules/zone.js';
import { initContact } from './modules/contact.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'expo.out', duration: 1.1 });
ScrollTrigger.config({ ignoreMobileResize: true });
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------- défilement lissé : Lenis sur le ticker GSAP ---------- */
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

// la carte est demandée dès le départ, en même temps que tout le reste
const zoneData = fetch('/geo/zone.json').then((r) => r.json());
const ctx = { gsap, ScrollTrigger, SplitText, lenis, zoneData };

async function boot() {
  // la 3D (ciel d'éclairage puis shaders) se prépare pendant que les polices arrivent
  const maquette = createMaquette(document.querySelector('.maquette'));
  await Promise.all([document.fonts.ready, maquette.ready]);
  performance.mark('ridoux:3d');
  gsap.ticker.add(maquette.tick);
  ctx.maquette = maquette;

  initBackground(ctx);
  initHero(ctx);
  initFamille(ctx);
  initCoupe(ctx);
  initServices(ctx);
  initDrone(ctx);
  initLavage(ctx);
  initRealisations(ctx);
  initExterieurs(ctx);
  initSos(ctx);
  await initZone(ctx);
  initContact(ctx);
  initChrome(ctx);
  initTitles(ctx);

  ScrollTrigger.refresh();
  performance.mark('ridoux:modules');

  const params = new URLSearchParams(location.search);
  if (params.has('nointro')) {
    gsap.set('.intro', { display: 'none' });
    document.body.classList.remove('is-loading');
    ctx.heroEnter(true);
    lenis.start();
    const s = params.get('s');
    if (s) lenis.scrollTo(Number(s) || `#${s}`, { immediate: true, force: true });
  } else {
    // première image de la 3D calculée derrière le voile, puis on attend que le navigateur soit au calme :
    // l'intro ne démarre qu'après trois images régulières d'affilée (0,8 s d'attente au plus)
    // la maquette est rendue une fois entière puis vide : tous les programmes sont prêts avant la construction
    maquette.st.build = 1;
    maquette.render();
    maquette.st.build = 0;
    maquette.render();
    performance.mark('ridoux:warm');
    await waitForSteadyFrames(3, 800);
    performance.mark('ridoux:intro');
    // pendant l'intro, une image lente ralentit l'animation au lieu de la faire sauter
    gsap.ticker.lagSmoothing(200, 33);
    // ?freeze : l'intro démarre figée, pour la vérifier image par image
    if (params.has('freeze')) {
      const t0 = gsap.globalTimeline.time();
      gsap.globalTimeline.pause();
      window.__seek = (t) => { gsap.globalTimeline.time(t0 + t); };
    }
    playIntro(ctx, () => ctx.heroEnter(false)).then(() => {
      gsap.ticker.lagSmoothing(0);
      document.body.classList.remove('is-loading');
      lenis.start();
    });
  }
  window.__ridoux = ctx;
}

function waitForSteadyFrames(count, maxMs) {
  return new Promise((resolve) => {
    const start = performance.now();
    let last = start, steady = 0;
    const step = (t) => {
      steady = t - last < 34 ? steady + 1 : 0;
      last = t;
      if (steady >= count || t - start > maxMs) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- titres de section : lignes masquées ---------- */
function initTitles({ gsap, SplitText }) {
  document.querySelectorAll('main h2:not(.sos-title)').forEach((h) => {
    const split = SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'title-line' });
    const underlines = h.querySelectorAll('.t-u');
    const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 86%', toggleActions: 'play none none reverse' } });
    tl.from(split.lines, { yPercent: 112, duration: 1.15, stagger: 0.09, ease: 'expo.out' });
    // le souligné se trace une fois la ligne posée, au moment où on la lit
    if (underlines.length) {
      tl.fromTo(underlines, { backgroundSize: '0% 0.07em' }, { backgroundSize: '100% 0.07em', duration: 0.9, ease: 'power3.inOut' }, 0.55);
    }
  });
}

boot();
