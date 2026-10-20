/* Entretien : le toit se nettoie passe après passe au défilement (photos réelles avant / après) ;
   à droite, une galerie de chantiers en deux colonnes qui défilent à des vitesses différentes. */

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function coverRect(iw, ih, w, h, posY = 0.5) {
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  return [(w - dw) / 2, (h - dh) * posY, dw, dh];
}

export function initLavage({ gsap, ScrollTrigger }) {
  const section = document.querySelector('.lav');
  const frame = section.querySelector('.lav-frame');
  const canvas = section.querySelector('.lav-canvas');
  const c = canvas.getContext('2d');
  // masque des passes calculé à demi-résolution (le flou y coûte quatre fois moins), puis appliqué à l'image « après »
  const mask = document.createElement('canvas');
  const mc = mask.getContext('2d');
  const tmp = document.createElement('canvas');
  const tc = tmp.getContext('2d');
  const MS = 0.5;
  const tagAvant = section.querySelector('.lav-tag--avant');
  const tagApres = section.querySelector('.lav-tag--apres');

  let before, after, W = 0, H = 0, dpr = 1, progress = 0, ready = false;
  const PASSES = 4;
  const TOP = 0.3; // les passes commencent au faîtage visible, pas sur le mur

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = frame.getBoundingClientRect();
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    canvas.width = W; canvas.height = H;
    tmp.width = W; tmp.height = H;
    mask.width = Math.round(W * MS); mask.height = Math.round(H * MS);
    draw();
  }

  /* une passe de lance : large bande aux bords irréguliers */
  function passPath(ctx2, k, t) {
    const bandH = (H * (1 - TOP)) / PASSES;
    const y0 = H * TOP + k * bandH;
    const ltr = k % 2 === 0;
    const x0 = ltr ? -0.06 * W : 1.06 * W;
    const x1 = ltr ? x0 + t * 1.12 * W : x0 - t * 1.12 * W;
    ctx2.beginPath();
    const steps = 20;
    const wob = (x, s) => Math.sin(x * 0.009 + k * 1.7 + s) * bandH * 0.06;
    const left = Math.min(x0, x1), right = Math.max(x0, x1);
    ctx2.moveTo(left, y0 - bandH * 0.12 + wob(left, 0));
    for (let i = 1; i <= steps; i++) {
      const x = left + ((right - left) * i) / steps;
      ctx2.lineTo(x, y0 - bandH * 0.12 + wob(x, 0));
    }
    for (let i = steps; i >= 0; i--) {
      const x = left + ((right - left) * i) / steps;
      ctx2.lineTo(x, y0 + bandH * 1.12 + wob(x, 2.1));
    }
    ctx2.closePath();
    return { x1, y: y0 + bandH / 2, bandH, ltr };
  }

  function draw() {
    if (!ready || !W) return;
    const [bx, by, bw, bh] = coverRect(before.width, before.height, W, H, 0.55);
    c.drawImage(before, bx, by, bw, bh);
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, mask.width, mask.height);
    mc.setTransform(MS, 0, 0, MS, 0, 0);
    mc.filter = `blur(${Math.round(14 * dpr * MS)}px)`;
    mc.fillStyle = '#fff';
    // la première passe nettoie aussi tout le haut du toit
    if (progress > 0) {
      mc.fillRect(-20, -20, W + 40, H * TOP * Math.min(1, progress * PASSES) + 20);
    }
    const total = progress * PASSES;
    let head = null;
    for (let k = 0; k < PASSES; k++) {
      const t = Math.min(1, Math.max(0, total - k));
      if (t <= 0) break;
      const info = passPath(mc, k, t);
      mc.fill();
      if (t < 1) head = info;
    }
    mc.filter = 'none';
    tc.globalCompositeOperation = 'source-over';
    tc.clearRect(0, 0, W, H);
    tc.drawImage(after, bx, by, bw, bh);
    tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(mask, 0, 0, W, H);
    c.drawImage(tmp, 0, 0);

    // la lance : une large bande orange qui avance avec la passe
    if (head && progress < 0.999) {
      c.save();
      const g = c.createLinearGradient(head.x1 - (head.ltr ? 60 : -60) * dpr, 0, head.x1, 0);
      g.addColorStop(0, 'rgba(232, 100, 28, 0)');
      g.addColorStop(1, 'rgba(232, 100, 28, .28)');
      c.fillStyle = g;
      const hx = head.ltr ? head.x1 - 60 * dpr : head.x1;
      c.fillRect(hx, head.y - head.bandH * 0.62, 60 * dpr, head.bandH * 1.24);
      c.fillStyle = '#E8641C';
      c.fillRect(head.x1 - 3 * dpr, head.y - head.bandH * 0.62, 6 * dpr, head.bandH * 1.24);
      c.restore();
    }
    tagAvant.style.opacity = String(Math.max(0, 1 - progress * 4));
    tagApres.style.opacity = String(Math.max(0, (progress - 0.85) / 0.15));
  }

  Promise.all([loadImg('/img/ra-chenau-avant.webp'), loadImg('/img/ra-chenau-apres.webp')]).then(([a, b]) => {
    before = a; after = b; ready = true; size();
  });
  window.addEventListener('resize', size);

  // le nettoyage se termine quand la grande image cesse d'être épinglée (bas du cadre à 94 % de l'écran),
  // au moment où la mosaïque de droite arrive à sa dernière image
  ScrollTrigger.create({
    trigger: '.lav-stage',
    start: 'top 34%',
    end: 'bottom 94%',
    scrub: 0.5,
    onUpdate: (self) => { progress = self.progress; draw(); },
  });

  /* entrée : le cadre s'ouvre comme une fenêtre de toit */
  gsap.fromTo(frame, { clipPath: 'inset(16% 20% 34% 20%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    ease: 'none',
    scrollTrigger: { trigger: '.lav-stage', start: 'top 95%', end: 'top 30%', scrub: 0.6 },
  });
  gsap.from('.lav-lead', {
    opacity: 0, y: 20, duration: 1.1,
    scrollTrigger: { trigger: '.lav-lead', start: 'top 85%', toggleActions: 'play none none reverse' },
  });

  /* mosaïque : la colonne de gauche défile plus vite et se pose quand le nettoyage se termine ;
     celle de droite reste calée sur le bas de la grande image */
  const colA = section.querySelector('.lav-col--a');
  gsap.fromTo(colA, { y: 110 }, {
    y: 0, ease: 'none',
    scrollTrigger: { trigger: '.lav-gallery', start: 'top bottom', endTrigger: '.lav-stage', end: 'bottom 94%', scrub: true },
  });
  section.querySelectorAll('.lav-col figure').forEach((f) => {
    gsap.fromTo(f, { clipPath: 'inset(12% 0% 12% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: f, start: 'top 98%', end: 'top 60%', scrub: 0.5 },
    });
  });

  /* vidéo : lecture seulement quand elle est à l'écran */
  const video = section.querySelector('video');
  ScrollTrigger.create({
    trigger: video,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { if (self.isActive) video.play().catch(() => {}); else video.pause(); },
  });

  /* bâtiment professionnel : l'image glisse en profondeur */
  const pro = section.querySelector('.lav-pro-mask');
  gsap.fromTo(pro.querySelector('img'), { yPercent: -14, scale: 1.18 }, {
    yPercent: 0,
    scale: 1,
    ease: 'none',
    scrollTrigger: { trigger: pro, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}
