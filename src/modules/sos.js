/* SOS Toiture : la maquette revient, vue depuis le pignon, comme une maison sous la pluie.
   Le pignon suit la section ; la pluie frappe les tuiles, ruisselle vers l'égout et goutte des chéneaux. */

const ABOVE = 0.55; // la pluie commence 55 % d'écran au-dessus de la section
const EAVE = 0.46;  // bas du pignon, en fraction d'écran sous le haut de la section (= --eave)
const BIN = 6;

export function initSos(ctx) {
  const { gsap, ScrollTrigger, maquette } = ctx;
  const st = maquette.st;
  const section = document.querySelector('.sos');
  const canvas = section.querySelector('.sos-rain');
  const c = canvas.getContext('2d');
  const cv = ctx.canvasVis;
  const canvasEl = document.querySelector('.maquette');
  let W = 0, H = 0, dpr = 1, off = 0;
  let top = new Float32Array(0), bot = new Float32Array(0);
  let roofX0 = 0, roofX1 = 0, apexX = 0, wallX0 = 0, wallX1 = 0, wallTop = 0;
  let o = null;
  const drops = [], runs = [], splashes = [], drips = [];
  const N = 260;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    off = window.innerHeight * ABOVE;
    W = section.offsetWidth;
    H = section.offsetHeight + off;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    top = new Float32Array(Math.ceil(W / BIN) + 2);
    bot = new Float32Array(Math.ceil(W / BIN) + 2);
  }
  const spawn = (d, initial) => {
    d.x = Math.random() * (W + 160) - 80;
    d.y = initial ? Math.random() * H * 0.6 : -20 - Math.random() * 60;
    d.v = 900 + Math.random() * 520;
    d.l = 14 + Math.random() * 16;
    d.a = 0.16 + Math.random() * 0.26;
    d.hit = Math.pow(Math.random(), 1.5);
  };
  size();
  for (let i = 0; i < N; i++) { const d = {}; spawn(d, true); drops.push(d); }
  window.addEventListener('resize', size);

  /* silhouette du toit, recalculée à chaque image depuis la maquette */
  const segY = (a, b, x) => (b.x === a.x ? Math.min(a.y, b.y) : a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x));
  function outline() {
    o = maquette.getSosOutline();
    if (!ctx.cam.sosOn) {
      // maison pas encore à l'écran : la pluie tombe sans obstacle
      roofX0 = roofX1 = wallX0 = wallX1 = -1e4;
      return false;
    }
    const sy = section.getBoundingClientRect().top - off; // haut du canevas dans la fenêtre
    for (const k in o) o[k] = { x: o[k].x, y: o[k].y - sy };
    const segs = [
      [o.nearL, o.nearApex], [o.nearApex, o.nearR], [o.farL, o.farApex], [o.farApex, o.farR],
      [o.nearApex, o.farApex], [o.nearL, o.farL], [o.nearR, o.farR],
    ];
    roofX0 = Math.min(o.nearL.x, o.farL.x);
    roofX1 = Math.max(o.nearR.x, o.farR.x);
    apexX = o.nearApex.x;
    wallX0 = o.wallL.x; wallX1 = o.wallR.x; wallTop = Math.min(o.wallL.y, o.wallR.y);
    for (let i = 0; i < top.length; i++) {
      const x = i * BIN;
      let t = Infinity;
      for (const [a, b] of segs) {
        const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
        if (x >= lo && x <= hi) t = Math.min(t, segY(a, b, x));
      }
      top[i] = t;
      bot[i] = x <= apexX ? segY(o.nearL, o.nearApex, Math.max(x, o.nearL.x)) : segY(o.nearApex, o.nearR, Math.min(x, o.nearR.x));
      if (bot[i] < t) bot[i] = t;
    }
    return true;
  }
  const binOf = (x) => Math.min(top.length - 1, Math.max(0, Math.round(x / BIN)));
  const onRoof = (x, y) => x > roofX0 && x < roofX1 && y > top[binOf(x)];
  const onWall = (x, y) => x > wallX0 && x < wallX1 && y > wallTop;

  let running = false, last = 0, dripClock = 0;
  function frame() {
    if (!running) return;
    const t = performance.now();
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    const house = outline();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const wind = 0.08;
    const fade = off * 0.8;

    // pluie
    c.lineWidth = 1;
    for (const d of drops) {
      const ny = d.y + d.v * dt;
      const nx = d.x + d.v * wind * dt;
      if (nx > roofX0 && nx < roofX1) {
        const b = binOf(nx);
        const yHit = top[b] + d.hit * (bot[b] - top[b]);
        if (ny >= yHit && d.y < yHit + 4) {
          for (let k = 0; k < 3; k++) splashes.push({ x: nx, y: yHit, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 70, life: 0.28 });
          if (runs.length < 140 && Math.random() < 0.5) {
            const tgt = nx < apexX ? o.nearL : o.nearR;
            const dx = tgt.x - o.nearApex.x, dy = tgt.y - o.nearApex.y;
            const len = Math.hypot(dx, dy) || 1;
            runs.push({ x: nx, y: yHit, ux: dx / len, uy: dy / len, v: 60 + Math.random() * 60, side: nx < apexX ? -1 : 1 });
          }
          spawn(d, false);
          continue;
        }
      }
      d.x = nx; d.y = ny;
      if (d.y > H + 30) { spawn(d, false); continue; }
      const a = d.a * Math.min(1, Math.max(0, d.y / fade));
      if (a < 0.01) continue;
      const light = onRoof(d.x, d.y) || onWall(d.x, d.y);
      c.strokeStyle = light ? `rgba(232, 238, 240, ${(a * 0.8).toFixed(3)})` : `rgba(38, 46, 49, ${a.toFixed(3)})`;
      c.beginPath();
      c.moveTo(d.x, d.y);
      c.lineTo(d.x - d.l * wind, d.y - d.l);
      c.stroke();
    }

    // ruissellement le long des tuiles, jusqu'à l'égout
    c.strokeStyle = 'rgba(236, 242, 244, .55)';
    c.lineWidth = 1.2;
    for (let i = runs.length - 1; i >= 0; i--) {
      const r = runs[i];
      r.v += 220 * dt;
      r.x += r.ux * r.v * dt;
      r.y += r.uy * r.v * dt;
      // a-t-on passé la ligne d'égout (du coin avant au coin arrière) ?
      const e0 = r.side < 0 ? o.nearL : o.nearR, e1 = r.side < 0 ? o.farL : o.farR;
      const cross = (e1.x - e0.x) * (r.y - e0.y) - (e1.y - e0.y) * (r.x - e0.x);
      const past = r.side < 0 ? cross > 0 : cross < 0;
      if (past || r.x < roofX0 - 4 || r.x > roofX1 + 4) { runs.splice(i, 1); continue; }
      const tail = 6 + r.v * 0.05;
      c.beginPath();
      c.moveTo(r.x, r.y);
      c.lineTo(r.x - r.ux * tail, r.y - r.uy * tail);
      c.stroke();
    }

    // gouttes qui tombent des chéneaux
    dripClock -= dt;
    if (house && dripClock <= 0) {
      dripClock = 0.09 + Math.random() * 0.16;
      const g = Math.random() < 0.5 ? o.gutL : o.gutR;
      drips.push({ x: g.x + (Math.random() - 0.5) * 4, y: g.y, v: 40 });
    }
    c.strokeStyle = 'rgba(38, 46, 49, .5)';
    c.lineWidth = 1.4;
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      d.v += 1400 * dt;
      d.y += d.v * dt;
      if (d.y > H) { drips.splice(i, 1); continue; }
      c.beginPath();
      c.moveTo(d.x, d.y);
      c.lineTo(d.x, d.y - Math.min(26, 4 + d.v * 0.02));
      c.stroke();
    }

    // éclaboussures
    c.fillStyle = 'rgba(240, 244, 246, .75)';
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.life -= dt;
      if (s.life <= 0) { splashes.splice(i, 1); continue; }
      s.vy += 600 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      c.fillRect(s.x - 0.7, s.y - 0.7, 1.4, 1.4);
    }

    // la navigation passe en sombre au-dessus du mur
    const navLine = 42 - (section.getBoundingClientRect().top - off);
    const overWall = house && navLine > wallTop && navLine < o.wallB.y - (o.wallB.y - wallTop) * 0.35;
    section.dataset.navdark = overWall ? '1' : '';
  }
  gsap.ticker.add(frame);

  /* la maquette suit la section : le pignon se dresse pendant l'arrivée,
     et la maison monte avec son texte, d'un seul bloc */
  const inner = section.querySelector('.sos-inner');
  const telNum = section.querySelector('.sos-tel-num');
  const drive = () => {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8)));
    const e = 1 - Math.pow(1 - p, 3);
    const rise = (1 - e) * vh * 0.24;
    ctx.cam.sosP = p;
    st.sosY = r.top + vh * EAVE + rise;
    inner.style.transform = `translate3d(-50%, ${rise.toFixed(1)}px, 0)`;
    inner.style.opacity = String(Math.min(1, Math.max(0, (p - 0.35) / 0.4)));
    telNum.style.setProperty('--tel-u', `${(Math.min(1, Math.max(0, (p - 0.6) / 0.4)) * 100).toFixed(1)}%`);
    ctx.updateCam();
  };
  ScrollTrigger.create({
    trigger: section,
    start: () => `top bottom+=${window.innerHeight * ABOVE}`,
    end: 'bottom top',
    onUpdate: drive,
    onToggle: (self) => {
      running = self.isActive;
      if (running) { size(); last = performance.now(); }
      else section.dataset.navdark = '';
    },
  });
  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      ctx.cam.sosOn = self.isActive;
      cv.sos = self.isActive ? 1 : 0;
      if (self.isActive) { canvasEl.style.transform = ''; drive(); }
      else ctx.updateCam();
      ctx.applyCanvas();
      ctx.setSosVisible(self.isActive);
    },
  });
  window.addEventListener('resize', () => { if (ctx.cam.sosOn) drive(); });

}
