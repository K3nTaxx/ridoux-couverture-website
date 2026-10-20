/* ==========================================================
   Maquette 3D — une toiture à deux pans, couche par couche
   charpente · isolation · écran · liteaux · cordeaux · tuiles
   faîtage · chéneaux · planches de rive
   ========================================================== */
import * as THREE from 'three';

const DEG = Math.PI / 180;

// dimensions (mètres « maquette »)
const PITCH = 30 * DEG;
const S = 2.0;                       // demi-portée horizontale
const HR = S * Math.tan(PITCH);      // hauteur du faîtage
const R = S / Math.cos(PITCH);       // longueur du rampant
const TW = 0.24;                     // largeur utile d'une tuile
const TL = 0.42;                     // longueur d'une tuile
const TP = 0.31;                     // pureau (pas entre rangs)
const COLS = 17;
const L = COLS * TW;                 // longueur du toit le long du faîtage
const OVER = 0.12;                   // débord à l'égout
const VMAX = R + OVER;
const NC = Math.ceil((VMAX - 0.16) / TP); // nombre de rangs
const NR = 9;                        // chevrons par pan
const TILT = 3.2 * DEG;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* profil d'une tuile romane : rebord, plat légèrement creux, rouleau */
function tileGeometry() {
  const t = 0.014;
  const top = [];
  const W = 0.262;
  const lipEnd = 0.022, panEnd = 0.142, rollC = 0.2, rr = 0.058;
  for (let i = 0; i <= 3; i++) top.push([(lipEnd * i) / 3, 0.006]);
  for (let i = 1; i <= 10; i++) {
    const x = lipEnd + ((panEnd - lipEnd) * i) / 10;
    top.push([x, -0.007 * Math.sin((Math.PI * (x - lipEnd)) / (panEnd - lipEnd))]);
  }
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (Math.PI * i) / 16;
    top.push([rollC + rr * Math.cos(a), rr * Math.sin(a)]);
  }
  top.push([W, -0.012]);
  const bottom = [];
  for (let i = top.length - 1; i >= 0; i--) {
    const [x, y] = top[i];
    let by = y - t;
    if (x > panEnd && x < rollC + rr) {
      const dx = x - rollC;
      const inner = rr - t;
      by = Math.abs(dx) < inner ? Math.sqrt(inner * inner - dx * dx) : y - t;
    }
    bottom.push([x, by]);
  }
  const shape = new THREE.Shape();
  shape.moveTo(top[0][0] - W / 2, top[0][1]);
  for (let i = 1; i < top.length; i++) shape.lineTo(top[i][0] - W / 2, top[i][1]);
  for (let i = 0; i < bottom.length; i++) shape.lineTo(bottom[i][0] - W / 2, bottom[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: TL,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.0025,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.computeVertexNormals();
  return geo;
}

/* grain de terre cuite : variations de teinte dans l'espace monde */
function addGrain(material, amount = 0.12) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainPos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 gp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          gp = instanceMatrix * gp;
        #endif
        vGrainPos = (modelMatrix * gp).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vGrainPos;
        float gHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float gNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(gHash(i+vec3(0,0,0)), gHash(i+vec3(1,0,0)), f.x), mix(gHash(i+vec3(0,1,0)), gHash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(gHash(i+vec3(0,0,1)), gHash(i+vec3(1,0,1)), f.x), mix(gHash(i+vec3(0,1,1)), gHash(i+vec3(1,1,1)), f.x), f.y), f.z); }`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float gn = gNoise(vGrainPos * 7.0) * 0.6 + gNoise(vGrainPos * 38.0) * 0.4;
        float speck = step(0.93, gHash(floor(vGrainPos * 160.0)));
        diffuseColor.rgb *= (1.0 - ${amount.toFixed(3)} * 0.5) + ${amount.toFixed(3)} * gn - speck * 0.06;`
      );
  };
  return material;
}

export function createMaquette(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // pas de carte d'environnement : son précalcul coûtait près d'une seconde au chargement.
  // L'ambiance vient de la lumière hémisphérique, renforcée en conséquence.
  const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 80);

  /* ---------- matériaux ---------- */
  const M = {
    tile: addGrain(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0 }), 0.16),
    ridge: addGrain(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0, side: THREE.DoubleSide }), 0.16),
    rafter: addGrain(new THREE.MeshStandardMaterial({ color: 0xc39a66, roughness: 0.8 }), 0.1),
    truss: addGrain(new THREE.MeshStandardMaterial({ color: 0xa97f4e, roughness: 0.82 }), 0.1),
    batten: addGrain(new THREE.MeshStandardMaterial({ color: 0xd3ae7b, roughness: 0.8 }), 0.12),
    ecran: new THREE.MeshStandardMaterial({ color: 0x4a5357, roughness: 0.92 }),
    insul: addGrain(new THREE.MeshStandardMaterial({ color: 0xd9cba3, roughness: 1 }), 0.22),
    zinc: new THREE.MeshStandardMaterial({ color: 0xa5aeb1, roughness: 0.42, metalness: 0.18, side: THREE.DoubleSide }),
    rive: new THREE.MeshStandardMaterial({ color: 0xdfe2de, roughness: 0.55 }),
    cord: new THREE.MeshBasicMaterial({ color: 0xe8641c }),
  };

  const root = new THREE.Group();
  scene.add(root);
  const model = new THREE.Group();
  root.add(model);
  model.position.y = -HR * 0.45;

  const layers = {
    charpente: new THREE.Group(),
    isolation: new THREE.Group(),
    ecran: [],
    liteaux: [],
    tuiles: [],
    rive: [],
    faitage: new THREE.Group(),
    chenau: [],
  };
  model.add(layers.charpente, layers.isolation, layers.faitage);

  const layerMats = {
    charpente: [M.rafter, M.truss],
    isolation: [M.insul],
    liteaux: [M.batten, M.cord],
    ecran: [M.ecran],
    tuiles: [M.tile],
    faitage: [M.ridge],
    chenau: [M.zinc],
    rive: [M.rive],
  };

  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- pans ---------- */
  const rand = rng(42);
  const tileGeo = tileGeometry();
  const tileBase = new THREE.Color('#ad5a3c');
  const slopes = [];
  const dummy = new THREE.Object3D();

  for (const side of [1, -1]) {
    const slope = new THREE.Group();
    slope.position.set(0, HR, 0);
    slope.rotation.order = 'YXZ';
    if (side < 0) slope.rotation.y = Math.PI;
    slope.rotation.x = PITCH;
    model.add(slope);

    const g = {
      rafters: new THREE.Group(),
      ecran: new THREE.Group(),
      liteaux: new THREE.Group(),
      tuiles: new THREE.Group(),
      rive: new THREE.Group(),
    };
    Object.values(g).forEach((x) => slope.add(x));
    layers.ecran.push(g.ecran);
    layers.liteaux.push(g.liteaux);
    layers.tuiles.push(g.tuiles);
    layers.rive.push(g.rive);

    // chevrons
    const rafterGeo = new THREE.BoxGeometry(0.075, 0.13, R + 0.08);
    rafterGeo.translate(0, -0.065, (R + 0.08) / 2 - 0.04);
    const rafters = shadowy(new THREE.InstancedMesh(rafterGeo, M.rafter, NR));
    const rafterX = [];
    for (let i = 0; i < NR; i++) {
      const x = -L / 2 + 0.06 + (i * (L - 0.12)) / (NR - 1);
      rafterX.push(x);
      dummy.position.set(x, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rafters.setMatrixAt(i, dummy.matrix);
    }
    g.rafters.add(rafters);
    layers.charpente.attach ? null : null;

    // écran sous-toiture (se déroule depuis le faîtage)
    const ecranGeo = new THREE.BoxGeometry(L + 0.02, 0.006, R + 0.06);
    ecranGeo.translate(0, 0.003, (R + 0.06) / 2);
    const ecran = shadowy(new THREE.Mesh(ecranGeo, M.ecran));
    g.ecran.add(ecran);

    // contre-liteaux
    const clGeo = new THREE.BoxGeometry(0.036, 0.02, R);
    clGeo.translate(0, 0.016, R / 2);
    const cl = shadowy(new THREE.InstancedMesh(clGeo, M.batten, NR));
    rafterX.forEach((x, i) => { dummy.position.set(x, 0, 0); dummy.updateMatrix(); cl.setMatrixAt(i, dummy.matrix); });
    g.liteaux.add(cl);

    // liteaux + cordeaux (un par rang)
    const litGeo = new THREE.BoxGeometry(L, 0.024, 0.042);
    litGeo.translate(L / 2, 0.038, 0);
    const lit = shadowy(new THREE.InstancedMesh(litGeo, M.batten, NC));
    const cordGeo = new THREE.BoxGeometry(L, 0.007, 0.022);
    cordGeo.translate(L / 2, 0.053, 0);
    const cord = new THREE.InstancedMesh(cordGeo, M.cord, NC);
    const litZ = [];
    for (let j = 0; j < NC; j++) {
      const vBottom = VMAX - j * TP;
      const z = Math.max(0.05, vBottom - TL + 0.05);
      litZ.push(z);
      dummy.position.set(-L / 2, 0, z);
      dummy.updateMatrix();
      lit.setMatrixAt(j, dummy.matrix);
      dummy.position.set(-L / 2, 0, Math.max(0.04, vBottom - 0.02));
      dummy.updateMatrix();
      cord.setMatrixAt(j, dummy.matrix);
    }
    g.liteaux.add(lit, cord);

    // tuiles
    const tiles = shadowy(new THREE.InstancedMesh(tileGeo, M.tile, COLS * NC));
    const tileInfo = [];
    const c = new THREE.Color();
    let k = 0;
    for (let j = 0; j < NC; j++) {
      const vBottom = VMAX - j * TP;
      const zTop = vBottom - TL;
      for (let i = 0; i < COLS; i++) {
        const x = -L / 2 + TW * (i + 0.5);
        tileInfo.push({ i, j, x, z: zTop });
        const r = rand();
        c.copy(tileBase);
        c.offsetHSL((rand() - 0.5) * 0.012, (rand() - 0.5) * 0.05, (r - 0.5) * 0.045 - (r > 0.95 ? 0.035 : 0));
        tiles.setColorAt(k, c);
        k++;
      }
    }
    tiles.instanceColor.needsUpdate = true;
    g.tuiles.add(tiles);

    // planches de rive (aux deux pignons)
    const riveGeo = new THREE.BoxGeometry(0.018, 0.15, R + OVER + 0.06);
    riveGeo.translate(0, 0.02, (R + OVER + 0.06) / 2 - 0.03);
    const riveL = shadowy(new THREE.Mesh(riveGeo, M.rive));
    const riveR = shadowy(new THREE.Mesh(riveGeo, M.rive));
    riveL.position.x = -L / 2 - 0.016;
    riveR.position.x = L / 2 + 0.016;
    g.rive.add(riveL, riveR);

    slopes.push({ side, slope, g, rafters, ecran, cl, lit, cord, tiles, tileInfo, litZ, riveL, riveR });
  }

  // les chevrons font partie de la charpente pour la vue éclatée
  slopes.forEach((s) => layers.charpente.userData[`r${s.side}`] = s.g.rafters);

  /* ---------- charpente : fermes, panne faîtière, sablières ---------- */
  const box = (w, h, d, mat) => shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  const panne = box(L + 0.16, 0.2, 0.13, M.truss);
  panne.position.set(0, HR - 0.19, 0);
  layers.charpente.add(panne);
  for (const sz of [1, -1]) {
    const sab = box(L + 0.06, 0.11, 0.16, M.truss);
    sab.position.set(0, -0.17, sz * (S - 0.2));
    layers.charpente.add(sab);
  }
  const trussX = [-L / 2 + 0.06, 0, L / 2 - 0.06];
  for (const x of trussX) {
    const entrait = box(0.09, 0.15, 2 * S + 0.16, M.truss);
    entrait.position.set(x, -0.075 - 0.13, 0);
    layers.charpente.add(entrait);
    const poincon = box(0.09, HR + 0.02, 0.11, M.truss);
    poincon.position.set(x, (HR - 0.15) / 2 - 0.13 + 0.02, 0);
    layers.charpente.add(poincon);
    for (const sz of [1, -1]) {
      // contrefiche du pied du poinçon vers le milieu de l'arbalétrier
      const zr = 0.55 * S;
      const yr = HR - zr * Math.tan(PITCH) - 0.15 / Math.cos(PITCH);
      const y0 = -0.06, z0 = 0.06;
      const len = Math.hypot(zr - z0, yr - y0);
      const strut = box(0.08, 0.1, len, M.truss);
      strut.position.set(x, (y0 + yr) / 2, sz * (z0 + zr) / 2);
      strut.rotation.x = -sz * Math.atan2(yr - y0, zr - z0);
      layers.charpente.add(strut);
    }
  }
  // les pans de chevrons rejoignent le groupe charpente (même mouvement)
  // (ils restent dans leur pan pour l'orientation, on les pilote avec la charpente)

  /* ---------- isolation des combles ---------- */
  const insul = box(L - 0.14, 0.17, 2 * S - 0.62, M.insul);
  insul.position.set(0, -0.13 + 0.085, 0);
  layers.isolation.add(insul);

  /* ---------- faîtage ---------- */
  const RT_N = Math.ceil(L / 0.36) + 1;
  const ridgeGeo = new THREE.CylinderGeometry(0.118, 0.128, 0.42, 24, 1, true, -Math.PI / 2, Math.PI);
  ridgeGeo.rotateZ(-Math.PI / 2);
  ridgeGeo.rotateX(-Math.PI / 2);
  const ridgeTiles = shadowy(new THREE.InstancedMesh(ridgeGeo, M.ridge, RT_N));
  const ridgeInfo = [];
  for (let i = 0; i < RT_N; i++) {
    const x = -L / 2 + 0.16 + i * ((L - 0.32) / (RT_N - 1));
    ridgeInfo.push({ x });
    const cc = new THREE.Color('#a8563a').offsetHSL(0, 0, (rand() - 0.5) * 0.06);
    ridgeTiles.setColorAt(i, cc);
  }
  ridgeTiles.instanceColor.needsUpdate = true;
  layers.faitage.add(ridgeTiles);
  layers.faitage.position.y = HR + 0.085;

  /* ---------- chéneaux ---------- */
  const gutterGeo = new THREE.CylinderGeometry(0.078, 0.078, L + 0.1, 24, 1, true, Math.PI / 2, Math.PI);
  gutterGeo.rotateZ(-Math.PI / 2);
  gutterGeo.rotateX(-Math.PI / 2);
  const lipGeo = new THREE.TorusGeometry(0.01, 0.01, 6, 8);
  const gutters = [];
  for (const sz of [1, -1]) {
    const gg = new THREE.Group();
    const gut = shadowy(new THREE.Mesh(gutterGeo, M.zinc));
    gg.add(gut);
    const ez = VMAX * Math.cos(PITCH);
    const ey = HR - VMAX * Math.sin(PITCH);
    gg.position.set(0, ey - 0.03, sz * (ez + 0.035));
    model.add(gg);
    layers.chenau.push(gg);
    gutters.push({ gg, sz, y: gg.position.y, z: gg.position.z });
  }
  void lipGeo;

  /* ---------- lumière ---------- */
  const hemi = new THREE.HemisphereLight(0xe2e9ec, 0x7d6e63, 1.05);
  scene.add(hemi);
  // remplace la lumière diffuse qu'apportait la carte d'environnement
  const amb = new THREE.AmbientLight(0xf3eee8, 1.5);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffe0c0, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -4.2; sc.right = 4.2; sc.top = 4.2; sc.bottom = -4.2; sc.near = 1; sc.far = 24;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.022;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xc9d6de, 0.45);
  scene.add(fill, fill.target);

  // ombre portée au sol, très légère
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.13, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -HR * 0.45 - 0.42;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- ancres pour les étiquettes de la coupe ---------- */
  const front = slopes[0];
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
  // à droite de l'écran : le pan arrière et l'extrémité +x ; à gauche : le pan avant et l'extrémité -x
  const back = slopes[1];
  const anchors = {
    faitage: anchor(layers.faitage, L * 0.3, 0.13, 0),
    tuiles: anchor(back.g.tuiles, -L * 0.18, 0.1, R * 0.42),
    liteaux: anchor(back.g.liteaux, -L * 0.3, 0.05, R * 0.8),
    rive: anchor(back.riveL, 0, 0.09, R * 0.55),
    charpente: anchor(layers.charpente, -L / 2 + 0.06, HR * 0.42, 0),
    isolation: anchor(layers.isolation, -L * 0.2, 0.09, S * 0.6),
    chenau: anchor(gutters[0].gg, -L * 0.36, 0.04, 0),
  };

  /* ---------- SOS : le pignon devient un mur, la pluie mouille les tuiles ---------- */
  const WALL_X = L / 2 + 0.07;
  const yUnder = (z) => HR - Math.abs(z) * Math.tan(PITCH) - 0.16;
  const WALL_H = 3.1;
  const wallGeo = new THREE.BufferGeometry();
  {
    const wallCol = new THREE.Color('#262E31');
    const pos = [], col = [], idx = [];
    const push = (z, y, a) => { pos.push(WALL_X, y, z); col.push(wallCol.r, wallCol.g, wallCol.b, a); return pos.length / 3 - 1; };
    // pignon (triangle sous la toiture)
    const a0 = push(-S, yUnder(S), 1), a1 = push(S, yUnder(S), 1), a2 = push(0, yUnder(0), 1);
    idx.push(a0, a1, a2);
    // mur, découpé en bandes pour un fondu doux vers le bas
    const N = 24;
    const y0 = yUnder(S);
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const y = y0 - t * WALL_H;
      const f = Math.min(1, Math.max(0, (t - 0.52) / 0.48));
      const alpha = 1 - f * f * (3 - 2 * f);
      const l = push(-S, y, alpha), r = push(S, y, alpha);
      if (prev) idx.push(prev[0], prev[1], r, prev[0], r, l);
      prev = [l, r];
    }
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    wallGeo.setIndex(idx);
  }
  const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  wall.visible = false;
  model.add(wall);
  const eaveTop = HR - VMAX * Math.sin(PITCH) + 0.06;
  const eaveZ = VMAX * Math.cos(PITCH);
  const sosPts = {
    nearApex: anchor(model, L / 2 + 0.02, HR + 0.2, 0),
    nearL: anchor(model, L / 2 + 0.02, eaveTop, eaveZ),
    nearR: anchor(model, L / 2 + 0.02, eaveTop, -eaveZ),
    farApex: anchor(model, -L / 2 - 0.02, HR + 0.2, 0),
    farL: anchor(model, -L / 2 - 0.02, eaveTop, eaveZ),
    farR: anchor(model, -L / 2 - 0.02, eaveTop, -eaveZ),
    gutL: anchor(model, L / 2 + 0.06, eaveTop - 0.12, eaveZ + 0.04),
    gutR: anchor(model, L / 2 + 0.06, eaveTop - 0.12, -eaveZ - 0.04),
    wallL: anchor(model, WALL_X, yUnder(S), S),
    wallR: anchor(model, WALL_X, yUnder(S), -S),
    wallB: anchor(model, WALL_X, yUnder(S) - WALL_H, 0),
  };
  const sosEave = sosPts.wallL;
  const sun0 = new THREE.Color(0xffe0c0), sunWet = new THREE.Color(0xcfdbe4);
  const hemi0 = new THREE.Color(0xe2e9ec), hemiWet = new THREE.Color(0xb9c7cf);

  /* ---------- état piloté par GSAP ---------- */
  const st = {
    build: 0,
    explode: 0,
    yaw: 0,
    pitch: 0,
    az: 66, el: 17, dist: 18.5,
    tx: -0.5, ty: 0.15, tz: 0,
    shiftX: 0.23, shiftY: -0.02,
    sunAz: 100, sunEl: 13,
    floor: 0,
    exposure: 1.02,
    sos: 0,
    sosY: 0,
  };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let focus = null;
  let lastBuild = -1, lastExplode = -1;

  function applyBuild() {
    const b = st.build, e = st.explode;
    const eo = easeOut(e);
    for (const s of slopes) {
      // chevrons
      const pr = seg(b, 0.0, 0.14);
      for (let i = 0; i < NR; i++) {
        const p = easeOutExpo(seg(pr, i / NR * 0.5, i / NR * 0.5 + 0.5));
        dummy.position.set(-L / 2 + 0.06 + (i * (L - 0.12)) / (NR - 1), 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, Math.max(0.0001, p), Math.max(0.0001, p));
        dummy.updateMatrix();
        s.rafters.setMatrixAt(i, dummy.matrix);
      }
      s.rafters.instanceMatrix.needsUpdate = true;
      // écran
      const pe = easeOut(seg(b, 0.1, 0.24));
      s.ecran.scale.set(1, 1, Math.max(0.0001, pe));
      s.ecran.visible = pe > 0.001;
      // liteaux (de l'égout vers le faîtage)
      const pl = seg(b, 0.18, 0.34);
      for (let j = 0; j < NC; j++) {
        const p = easeOutExpo(seg(pl, j / NC * 0.6, j / NC * 0.6 + 0.4));
        dummy.position.set(-L / 2, 0, s.litZ[j]);
        dummy.scale.set(Math.max(0.0001, p), 1, 1);
        dummy.updateMatrix();
        s.lit.setMatrixAt(j, dummy.matrix);
      }
      s.lit.instanceMatrix.needsUpdate = true;
      const pcl = easeOut(seg(b, 0.16, 0.26));
      for (let i = 0; i < NR; i++) {
        dummy.position.set(-L / 2 + 0.06 + (i * (L - 0.12)) / (NR - 1), 0, 0);
        dummy.scale.set(1, 1, Math.max(0.0001, pcl));
        dummy.updateMatrix();
        s.cl.setMatrixAt(i, dummy.matrix);
      }
      s.cl.instanceMatrix.needsUpdate = true;
      // cordeaux : claqués d'un coup, rang après rang
      const pc = seg(b, 0.3, 0.46);
      for (let j = 0; j < NC; j++) {
        const p = easeOutExpo(seg(pc, j / NC * 0.7, j / NC * 0.7 + 0.3));
        const vBottom = VMAX - j * TP;
        dummy.position.set(-L / 2, 0, Math.max(0.04, vBottom - 0.02));
        dummy.scale.set(Math.max(0.0001, p), 1, 1);
        dummy.updateMatrix();
        s.cord.setMatrixAt(j, dummy.matrix);
      }
      s.cord.instanceMatrix.needsUpdate = true;
      // tuiles : rang par rang, de l'égout au faîtage
      const pt = seg(b, 0.44, 0.92);
      const span = NC + 1.4;
      for (let k = 0; k < s.tileInfo.length; k++) {
        const t = s.tileInfo[k];
        const local = pt * span - t.j - (t.i / COLS) * 1.2;
        const p = easeOut(clamp01(local));
        const lift = (1 - p) * 0.42;
        dummy.position.set(t.x, 0.05 + lift, t.z - (1 - p) * 0.12);
        dummy.rotation.set(-TILT - (1 - p) * 0.25, 0, 0);
        const sc2 = p <= 0 ? 0.0001 : 1;
        dummy.scale.set(sc2, sc2, sc2);
        dummy.updateMatrix();
        s.tiles.setMatrixAt(k, dummy.matrix);
      }
      s.tiles.instanceMatrix.needsUpdate = true;
      // planches de rive
      const prv = easeOut(seg(b, 0.88, 1));
      s.riveL.scale.set(1, 1, Math.max(0.0001, prv));
      s.riveR.scale.set(1, 1, Math.max(0.0001, prv));

      // vue éclatée : chaque couche s'écarte le long de la normale du pan
      s.g.ecran.position.y = 0.32 * eo;
      s.g.liteaux.position.y = 0.66 * eo;
      s.g.tuiles.position.y = 1.08 * eo;
      s.g.rive.position.y = 1.08 * eo;
      s.riveL.position.x = -L / 2 - 0.016 - 0.5 * eo;
      s.riveR.position.x = L / 2 + 0.016 + 0.5 * eo;
    }
    // faîtage
    const pf = seg(b, 0.86, 1);
    for (let i = 0; i < RT_N; i++) {
      const p = easeOut(seg(pf, (i / RT_N) * 0.6, (i / RT_N) * 0.6 + 0.4));
      dummy.position.set(ridgeInfo[i].x, (1 - p) * 0.35, 0);
      dummy.rotation.set(0, 0, 0);
      const k2 = p <= 0 ? 0.0001 : 1;
      dummy.scale.set(k2, k2, k2);
      dummy.updateMatrix();
      ridgeTiles.setMatrixAt(i, dummy.matrix);
    }
    ridgeTiles.instanceMatrix.needsUpdate = true;
    layers.faitage.position.y = HR + 0.085 + 1.62 * eo;
    // charpente (fermes) visibles avec les chevrons
    const pch = easeOutExpo(seg(b, 0.02, 0.16));
    layers.charpente.scale.set(1, Math.max(0.0001, pch), 1);
    layers.charpente.visible = pch > 0.001;
    // isolation
    const pi = easeOut(seg(b, 0.06, 0.18));
    layers.isolation.scale.set(1, Math.max(0.0001, pi), 1);
    layers.isolation.position.y = -0.78 * eo;
    // chéneaux
    const pg = easeOut(seg(b, 0.9, 1));
    for (const gt of gutters) {
      gt.gg.scale.set(Math.max(0.0001, pg), 1, 1);
      gt.gg.position.y = gt.y - 0.36 * eo;
      gt.gg.position.z = gt.z + gt.sz * 0.52 * eo;
    }
  }

  /* survol d'une étiquette : la couche s'éclaire, les autres deviennent transparentes */
  const allMats = [...new Set(Object.values(layerMats).flat())];
  const glowMats = allMats.filter((m) => m.isMeshStandardMaterial);
  // chaque matière s'éclaire dans sa propre teinte, pour briller sans pâlir
  const glowTint = new Map([
    [M.tile, '#d0602f'], [M.ridge, '#d0602f'], [M.rafter, '#c08a4c'], [M.truss, '#c08a4c'], [M.batten, '#c99a5c'],
    [M.ecran, '#5c686d'], [M.insul, '#c2b183'], [M.zinc, '#a9b8be'], [M.rive, '#c9cdc9'],
  ]);
  glowMats.forEach((m) => { m.emissive = new THREE.Color(glowTint.get(m) || '#ffffff'); m.emissiveIntensity = 0; m.userData.glow = 0; });
  allMats.forEach((m) => { m.userData.alpha = 1; });
  const DIM = 0.14;
  function setFocus(name) {
    if (focus === name) return;
    focus = name;
    const lit = name ? new Set([...layerMats[name], ...(name === 'liteaux' ? layerMats.ecran : [])]) : null;
    for (const m of allMats) {
      const on = !lit || lit.has(m);
      m.userData.glow = lit && on ? 0.55 : 0;
      m.userData.alpha = on ? 1 : DIM;
    }
  }
  function stepGlow() {
    for (const m of allMats) {
      if (m.isMeshStandardMaterial) {
        const d = m.userData.glow - m.emissiveIntensity;
        m.emissiveIntensity = Math.abs(d) > 0.002 ? m.emissiveIntensity + d * 0.14 : m.userData.glow;
      }
      const da = m.userData.alpha - m.opacity;
      if (da === 0) continue;
      m.opacity = Math.abs(da) > 0.003 ? m.opacity + da * 0.14 : m.userData.alpha;
      const see = m.opacity < 0.999;
      if (see !== m.transparent) {
        m.transparent = see;
        m.depthWrite = !see;
        m.needsUpdate = true;
      }
    }
  }


  /* ---------- caméra ---------- */
  const target = new THREE.Vector3();
  let W = 1, H = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function updateCamera() {
    const az = (st.az + pointer.sx * 9) * DEG;
    const el = (st.el - pointer.sy * 3.5) * DEG;
    target.set(st.tx, st.ty, st.tz);
    camera.position.set(
      target.x + st.dist * Math.cos(el) * Math.sin(az),
      target.y + st.dist * Math.sin(el),
      target.z + st.dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(target);
    camera.setViewOffset(W, H, -W * st.shiftX, -H * st.shiftY, W, H);
    root.rotation.y = (st.yaw + pointer.sx * 4 * (1 - st.sos)) * DEG;
    const sosOn = st.sos > 0.001;
    wall.visible = sosOn;
    if (sosOn) {
      // le bas du pignon suit la section qui défile
      root.updateMatrixWorld();
      camera.updateMatrixWorld();
      sosEave.getWorldPosition(v).project(camera);
      const y0 = (-v.y * 0.5 + 0.5) * H;
      camera.setViewOffset(W, H, -W * st.shiftX, -H * st.shiftY - (st.sosY - y0), W, H);
    }
    const w = st.sos;
    M.tile.roughness = 0.66 - 0.34 * w;
    M.ridge.roughness = 0.66 - 0.34 * w;
    sun.color.copy(sun0).lerp(sunWet, w);
    hemi.color.copy(hemi0).lerp(hemiWet, w);
    // soleil
    const sAz = (st.sunAz + pointer.sx * 26) * DEG;
    const sEl = st.sunEl * DEG;
    sun.position.set(Math.cos(sEl) * Math.sin(sAz) * 12, Math.sin(sEl) * 12, Math.cos(sEl) * Math.cos(sAz) * 12);
    sun.intensity = 3.2 - 0.8 * w;
    sun.target.position.set(0, 0, 0);
    fill.position.set(-sun.position.x, 4, -sun.position.z);
    floor.material.opacity = 0.13 * st.floor;
    floor.visible = st.floor > 0.001;
    renderer.toneMappingExposure = st.exposure;
  }

  /* ---------- projection des ancres ---------- */
  const v = new THREE.Vector3();
  function getAnchors() {
    const out = {};
    for (const [k, o] of Object.entries(anchors)) {
      o.getWorldPosition(v);
      v.project(camera);
      out[k] = { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
    }
    return out;
  }

  function getSosOutline() {
    const out = {};
    for (const [k, o] of Object.entries(sosPts)) {
      o.getWorldPosition(v);
      v.project(camera);
      out[k] = { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
    }
    return out;
  }

  /* ---------- boucle ---------- */
  let active = false;
  let onFrame = null;
  function render() {
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    stepGlow();
    if (st.build !== lastBuild || st.explode !== lastExplode) {
      applyBuild();
      lastBuild = st.build;
      lastExplode = st.explode;
    }
    updateCamera();
    renderer.render(scene, camera);
    if (onFrame) onFrame();
  }
  function tick() { if (active && !document.hidden) render(); }

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // compilation des shaders avant la première image
  applyBuild();
  updateCamera();
  // compilation des shaders sans bloquer la page (compilation parallèle quand le pilote la permet)
  const ready = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));

  return {
    ready,
    st,
    render,
    tick,
    setActive(v2) { active = v2; },
    isActive: () => active,
    setFocus,
    getAnchors,
    getSosOutline,
    set onFrame(fn) { onFrame = fn; },
    renderer,
  };
}
