/* ==========================================================
   Maquette 3D — une toiture à deux pans, couche par couche
   charpente · isolation · écran · liteaux · cordeaux · tuiles
   faîtage · chéneaux · planches de rive
   ========================================================== */
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

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
// les liteaux sont coupés au droit de chaque chevron : une travée peut être déposée seule
const RAFTER_X = Array.from({ length: NR }, (_, i) => -L / 2 + 0.06 + (i * (L - 0.12)) / (NR - 1));
const CUTS = [-L / 2, ...RAFTER_X.slice(1, -1), L / 2];
const BAYS = CUTS.length - 1;

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

/* uniformes partagés par toutes les matières : le temps et la force des ombres de nuages */
const U = {
  uTime: { value: 0 },
  uCloud: { value: 1 },
  // le trou ouvert dans la toiture : centre (monde) et rayon
  uHole: { value: new THREE.Vector4(0, 0, 0, 0) },
};

/* bord déchiré du trou, partagé par les matières et par leurs ombres */
const HOLE_GLSL = `
  uniform vec4 uHole;
  float hHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.17, 0.53, 0.29)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float hNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hHash(i), hHash(i+vec3(1,0,0)), f.x), mix(hHash(i+vec3(0,1,0)), hHash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hHash(i+vec3(0,0,1)), hHash(i+vec3(1,0,1)), f.x), mix(hHash(i+vec3(0,1,1)), hHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
  bool inHole(vec3 w){
    if (uHole.w <= 0.0) return false;
    float rag = hNoise(w * 7.0) * 0.12 + hNoise(w * 19.0) * 0.05;
    return distance(w, uHole.xyz) < uHole.w + rag - 0.06;
  }`;

/* les ombres de l'écran et des liteaux respectent le trou : la lumière entre dans les combles */
function holeDepthMaterial() {
  const m = new THREE.MeshDepthMaterial();
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHole = U.uHole;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 gp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          gp = instanceMatrix * gp;
        #endif
        vWPos = (modelMatrix * gp).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\n' + HOLE_GLSL)
      .replace('void main() {', 'void main() {\n  if (inHole(vWPos)) discard;');
  };
  m.customProgramCacheKey = () => 'ridoux-hole-depth';
  return m;
}

/* grain de terre cuite (variations de teinte dans l'espace monde) et ombres de nuages :
   un bruit qui dérive avec le vent masque une partie de la lumière du soleil, jamais la lumière ambiante */
function patchMaterial(material, grain = 0, hole = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = U.uTime;
    shader.uniforms.uCloud = U.uCloud;
    shader.uniforms.uHole = U.uHole;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 gp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          gp = instanceMatrix * gp;
        #endif
        vWPos = (modelMatrix * gp).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        uniform float uTime;
        uniform float uCloud;
        ${HOLE_GLSL}
        float gHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float gNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(gHash(i+vec3(0,0,0)), gHash(i+vec3(1,0,0)), f.x), mix(gHash(i+vec3(0,1,0)), gHash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(gHash(i+vec3(0,0,1)), gHash(i+vec3(1,0,1)), f.x), mix(gHash(i+vec3(0,1,1)), gHash(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float cHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float cNoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), f.x), mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), f.x), f.y); }
        float cloudShade(vec3 w){
          // des nuages assez petits pour qu'il y en ait toujours un ou deux sur le toit, aux bords très doux
          vec2 q = w.xz * 0.36 + vec2(uTime * 0.075, uTime * 0.028);
          float n = cNoise(q) * 0.68 + cNoise(q * 1.9 + 3.7) * 0.32;
          return 1.0 - smoothstep(0.42, 0.78, n) * 0.6 * uCloud;
        }`
      )
      .replace(
        '#include <aomap_fragment>',
        `float cShade = cloudShade(vWPos);
        reflectedLight.directDiffuse *= cShade;
        reflectedLight.directSpecular *= cShade;
        #include <aomap_fragment>`
      );
    if (hole) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  if (inHole(vWPos)) discard;');
    }
    if (grain > 0) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float gn = gNoise(vWPos * 7.0) * 0.6 + gNoise(vWPos * 38.0) * 0.4;
        float speck = step(0.93, gHash(floor(vWPos * 160.0)));
        diffuseColor.rgb *= (1.0 - ${grain.toFixed(3)} * 0.5) + ${grain.toFixed(3)} * gn - speck * 0.06;`
      );
    }
  };
  material.customProgramCacheKey = () => `ridoux-${grain}-${hole ? 'h' : ''}`;
  return material;
}

export function createMaquette(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap n'existe plus : three.js le remplaçait au premier rendu et recompilait tous les shaders
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // en ligne, on ne relit pas les journaux de compilation : ANGLE y laisse des avertissements sans gravité,
  // et chaque lecture force le navigateur à attendre la fin de la compilation
  renderer.debug.checkShaderErrors = import.meta.env.DEV;

  const scene = new THREE.Scene();
  // pas de carte d'environnement : son précalcul coûtait près d'une seconde au chargement.
  // L'ambiance vient de la lumière hémisphérique, renforcée en conséquence.
  const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 80);

  /* ---------- matériaux ---------- */
  const M = {
    tile: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0 }), 0.16),
    ridge: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.66, metalness: 0, side: THREE.DoubleSide }), 0.16),
    rafter: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xc39a66, roughness: 0.8 }), 0.1),
    truss: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xa97f4e, roughness: 0.82 }), 0.1),
    batten: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xd3ae7b, roughness: 0.8 }), 0.12),
    ecran: patchMaterial(new THREE.MeshStandardMaterial({ color: 0x4a5357, roughness: 0.92, side: THREE.DoubleSide }), 0, true),
    insul: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xc8b88f, roughness: 1 }), 0.22),
    zinc: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xa5aeb1, roughness: 0.42, metalness: 0.18, side: THREE.DoubleSide })),
    rive: patchMaterial(new THREE.MeshStandardMaterial({ color: 0xdfe2de, roughness: 0.55 })),
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
  const holeDepth = holeDepthMaterial();

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
    ecran.customDepthMaterial = holeDepth;
    g.ecran.add(ecran);

    // contre-liteaux
    const clGeo = new THREE.BoxGeometry(0.036, 0.02, R);
    clGeo.translate(0, 0.016, R / 2);
    const cl = shadowy(new THREE.InstancedMesh(clGeo, M.batten, NR));
    rafterX.forEach((x, i) => { dummy.position.set(x, 0, 0); dummy.updateMatrix(); cl.setMatrixAt(i, dummy.matrix); });
    g.liteaux.add(cl);

    // liteaux + cordeaux : un par rang, en pièces d'une travée (d'un chevron à l'autre)
    const litGeo = new THREE.BoxGeometry(1, 0.024, 0.042);
    litGeo.translate(0, 0.038, 0);
    const lit = shadowy(new THREE.InstancedMesh(litGeo, M.batten, NC * BAYS));
    const cordGeo = new THREE.BoxGeometry(1, 0.007, 0.022);
    cordGeo.translate(0, 0.053, 0);
    const cord = new THREE.InstancedMesh(cordGeo, M.cord, NC * BAYS);
    const litZ = [], cordZ = [];
    for (let j = 0; j < NC; j++) {
      const vBottom = VMAX - j * TP;
      litZ.push(Math.max(0.05, vBottom - TL + 0.05));
      cordZ.push(Math.max(0.04, vBottom - 0.02));
    }
    const pieceR = Float32Array.from({ length: NC * BAYS * 3 }, () => rand());
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
        tileInfo.push({ i, j, x, z: zTop, r1: rand(), r2: rand(), r3: rand() });
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

    slopes.push({
      side, slope, g, rafters, ecran, cl, lit, cord, tiles, tileInfo, litZ, cordZ, pieceR, riveL, riveR,
      litP: new Float32Array(NC),
      lift: new Float32Array(tileInfo.length), vel: new Float32Array(tileInfo.length),
      snapAt: new Float32Array(NC).fill(-1), snapped: new Uint8Array(NC),
    });
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

  /* ---------- craie du cordeau : une bouffée orange à chaque cordeau claqué ---------- */
  const DUST_N = 1100;
  const dPos = new Float32Array(DUST_N * 3);
  const dVel = new Float32Array(DUST_N * 3);
  const dAge = new Float32Array(DUST_N).fill(1);
  const dMax = new Float32Array(DUST_N).fill(1);
  const dAlpha = new Float32Array(DUST_N);
  const dSize = new Float32Array(DUST_N);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dAlpha, 1));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#e8641c') }, uScale: { value: 1 }, uNear: { value: 0 } },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uScale;
      uniform float uNear;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = aAlpha * smoothstep(uNear, uNear + 0.7, -mv.z);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.visible = false;
  model.add(dust);
  let dustHead = 0, dustAlive = 0;
  const tmpV = new THREE.Vector3();
  function puff(s, j) {
    const zc = Math.max(0.04, VMAX - j * TP - 0.02);
    for (let n = 0; n < 34; n++) {
      const i = dustHead; dustHead = (dustHead + 1) % DUST_N;
      tmpV.set(-L / 2 + Math.random() * L, 0.07, zc + (Math.random() - 0.5) * 0.05).applyMatrix4(s.slope.matrix);
      dPos[i * 3] = tmpV.x; dPos[i * 3 + 1] = tmpV.y; dPos[i * 3 + 2] = tmpV.z;
      dVel[i * 3] = (Math.random() - 0.5) * 0.5;
      dVel[i * 3 + 1] = 0.25 + Math.random() * 0.75;
      dVel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      dAge[i] = 0;
      dMax[i] = 0.8 + Math.random() * 0.9;
      dSize[i] = 0.025 + Math.random() * 0.05;
    }
    dustAlive = 1;
  }
  function stepDust(dt) {
    if (!dustAlive) return;
    let alive = 0;
    for (let i = 0; i < DUST_N; i++) {
      if (dAge[i] >= dMax[i]) { dAlpha[i] = 0; continue; }
      alive++;
      dAge[i] += dt;
      const k = i * 3;
      dVel[k + 1] -= 0.55 * dt;
      const drag = Math.pow(0.35, dt);
      dVel[k] *= drag; dVel[k + 1] *= drag; dVel[k + 2] *= drag;
      dPos[k] += dVel[k] * dt; dPos[k + 1] += dVel[k + 1] * dt; dPos[k + 2] += dVel[k + 2] * dt;
      const t = dAge[i] / dMax[i];
      dAlpha[i] = Math.min(1, dAge[i] / 0.06) * Math.pow(1 - Math.min(1, t), 1.6) * 0.8;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.aAlpha.needsUpdate = true;
    dustGeo.attributes.aSize.needsUpdate = true;
    dust.visible = alive > 0;
    dustAlive = alive > 0 ? 1 : 0;
  }

  /* ---------- le ciel réel éclaire la toiture ----------
     « Evening Road 01 (Pure Sky) », Poly Haven, CC0, réduit à 256 px : il pèse peu et arrive avant
     la compilation des shaders, pour que rien ne se recompile pendant l'animation.
     S'il tarde (réseau lent), on s'en passe : la lumière ambiante fait le travail. */
  let envReady = false;
  const envLoaded = new Promise((resolve) => {
    let late = false;
    const giveUp = setTimeout(() => { late = true; resolve(); }, 2500);
    new HDRLoader().load('/env/ciel-256.hdr', (hdr) => {
      if (late) return;
      clearTimeout(giveUp);
      const pmrem = new THREE.PMREMGenerator(renderer);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environmentRotation.y = -1.1;
      hdr.dispose();
      pmrem.dispose();
      envReady = true;
      resolve();
    }, undefined, () => { clearTimeout(giveUp); resolve(); });
  });

  /* ---------- lumière ---------- */
  const hemi = new THREE.HemisphereLight(0xe2e9ec, 0x7d6e63, 1.05);
  scene.add(hemi);
  // remplace la lumière diffuse qu'apportait la carte d'environnement
  const amb = new THREE.AmbientLight(0xf3eee8, 1.5);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffd8b0, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -7.5; sc.right = 7.5; sc.top = 7.5; sc.bottom = -7.5; sc.near = 1; sc.far = 30;
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
  const sun0 = new THREE.Color(0xffd8b0), sunWet = new THREE.Color(0xcfdbe4);
  const hemi0 = new THREE.Color(0xe2e9ec), hemiWet = new THREE.Color(0xb9c7cf);

  /* ---------- l'entrée dans la toiture ----------
     la caméra plonge vers le pan avant, passe entre deux chevrons et se retrouve dans les combles,
     le regard le long du faîtage */
  const ENTRY = { x: (-L / 2 + 0.06) + 5.5 * ((L - 0.12) / (NR - 1)), z: 1.05 };
  const frontSlope = slopes[0].slope;
  frontSlope.updateMatrix();
  const onSlope = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(frontSlope.matrix);
  const nrm = new THREE.Vector3(0, Math.cos(PITCH), Math.sin(PITCH));
  const E_m = onSlope(ENTRY.x, 0.1, ENTRY.z);
  const B_m = onSlope(ENTRY.x, -0.2, ENTRY.z);
  // chaque point est une étape ; le haut de page et la coupe avancent d'un point à l'autre (st.u = indice du point)
  const EX = ENTRY.x, EZ = ENTRY.z;
  const camPath = new THREE.CatmullRomCurve3([
    onSlope(EX + 2.4, 6.6, EZ + 5.0),
    onSlope(EX + 0.9, 3.4, EZ + 2.3),        // les tuiles s'envolent
    onSlope(EX + 0.55, 2.3, EZ + 1.6),       // les liteaux, en lumière rasante
    onSlope(EX + 0.3, 1.95, EZ + 1.25),
    onSlope(EX + 0.12, 1.45, EZ + 0.75),     // l'écran, puis sa déchirure
    onSlope(EX + 0.02, 0.55, EZ + 0.2),
    onSlope(EX, -0.28, EZ - 0.05),           // entre deux chevrons
    new THREE.Vector3(1.15, 0.56, -0.2),     // dans les combles
    new THREE.Vector3(1.7, 0.58, -0.36),     // fin du haut de page : on recule le long de la charpente
    new THREE.Vector3(2.55, 0.64, -0.42),    // on ressort par le pignon
    new THREE.Vector3(4.3, 1.4, 0.3),
    new THREE.Vector3(7.2, 2.9, 2.9),
  ], false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3([
    onSlope(EX, 0.05, EZ),
    onSlope(EX, 0.05, EZ),
    onSlope(EX, 0.03, EZ - 0.15),
    onSlope(EX, 0.02, EZ - 0.2),
    onSlope(EX, 0.0, EZ - 0.12),
    onSlope(EX, -0.4, EZ - 0.35),
    // en passant le trou, le regard se tourne déjà vers la charpente, pas vers le plancher
    new THREE.Vector3(0.3, 0.48, 0.45),
    new THREE.Vector3(-1.2, 0.48, 0.12),
    new THREE.Vector3(-2.5, 0.52, 0.15),
    new THREE.Vector3(-2.2, 0.56, 0.08),
    new THREE.Vector3(-0.6, 0.8, 0),
    new THREE.Vector3(0, 1.0, 0),
  ], false, 'centripetal');
  const PATH_N = camPath.points.length;
  const pathP = new THREE.Vector3(), pathQ = new THREE.Vector3();
  const entryWorld = new THREE.Vector3();

  // rai de lumière qui tombe du trou dans les combles
  const BEAM_L = 2.6;
  const beamGeo = new THREE.CylinderGeometry(0.42, 0.8, BEAM_L, 40, 1, true);
  beamGeo.translate(0, -BEAM_L / 2, 0);
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      varying float vFace;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFace = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uAlpha;
      varying vec2 vUv;
      varying float vFace;
      void main() {
        float along = pow(vUv.y, 1.4);
        float a = uAlpha * along * pow(vFace, 2.2) * 0.16;
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.visible = false;
  beam.frustumCulled = false;
  scene.add(beam);
  // poussières en suspension dans le rai
  const MOTES = 260;
  const mPos = new Float32Array(MOTES * 3);
  const mAlpha = new Float32Array(MOTES);
  const mSize = new Float32Array(MOTES);
  const mSeed = [];
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    const y = -Math.random() * BEAM_L;
    const rad = 0.42 + (0.8 - 0.42) * (-y / BEAM_L);
    mSeed.push({ a, r: r * rad * 0.9, y, sp: 0.02 + Math.random() * 0.05, ph: Math.random() * 6.28 });
    mSize[i] = 0.004 + Math.random() * 0.01;
  }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
  motesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(mAlpha, 1));
  motesGeo.setAttribute('aSize', new THREE.BufferAttribute(mSize, 1));
  const motesMat = dustMat.clone();
  motesMat.uniforms.uColor.value = new THREE.Color('#ffe2bd');
  motesMat.blending = THREE.AdditiveBlending;
  motesMat.uniforms.uNear.value = 0.55;
  const motes = new THREE.Points(motesGeo, motesMat);
  motes.frustumCulled = false;
  beam.add(motes);

  /* ---------- haut de page : des tuiles en suspens autour de la toiture, et la poussière du soir ----------
     placées dans le cadre du haut de page (x, y à l'écran, distance à la caméra, taille) */
  // les plus proches restent sur les bords, loin du titre et des textes du bas
  const FLOAT_SPEC = [
    [-0.97, -0.3, 6.2, 1], [0.96, -0.12, 7, 1], [-0.12, -1.06, 6.4, 1],
    [-0.74, 0.08, 11.5, 1], [0.76, 0.02, 12.5, 1], [-0.52, -0.46, 10.5, 1], [0.54, -0.44, 13, 1], [-0.88, -0.56, 14, 1],
    [-0.5, 0.6, 22, 1], [0.3, 0.5, 25, 1], [0.86, 0.14, 23, 1], [-0.72, -0.34, 27, 1], [0.16, -0.5, 21, 1], [-0.16, 0.68, 29, 1],
  ];
  const floaters = new THREE.InstancedMesh(tileGeo, M.tile, FLOAT_SPEC.length);
  floaters.frustumCulled = false;
  floaters.visible = false;
  scene.add(floaters);
  const fInfo = FLOAT_SPEC.map((f, i) => {
    floaters.setColorAt(i, new THREE.Color(tileBase).offsetHSL(0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05));
    return {
      base: new THREE.Vector3(), out: new THREE.Vector3(), size: f[3],
      // les tuiles proches suivent en partie la caméra : un peu de profondeur au curseur, sans qu'elles traversent l'écran
      follow: 1 - Math.min(1, Math.max(0.3, f[2] / 22)),
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28)),
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      spin: (0.08 + rand() * 0.14) * (rand() > 0.5 ? 1 : -1), ph: rand() * 6.28, w: 0.25 + rand() * 0.25, delay: rand() * 0.35,
    };
  });
  floaters.instanceColor.needsUpdate = true;
  const AIR_N = 420;
  const aPos = new Float32Array(AIR_N * 3), aBase = new Float32Array(AIR_N * 3);
  const aAlpha = new Float32Array(AIR_N), aSize = new Float32Array(AIR_N), aPh = new Float32Array(AIR_N);
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
  airGeo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
  airGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  const airMat = dustMat.clone();
  airMat.uniforms.uColor.value = new THREE.Color('#ffd7a6');
  airMat.blending = THREE.AdditiveBlending;
  airMat.uniforms.uNear.value = 1.2;
  const air = new THREE.Points(airGeo, airMat);
  air.frustumCulled = false;
  air.visible = false;
  scene.add(air);
  const qSpin = new THREE.Quaternion();
  const Y_UP = new THREE.Vector3(0, 1, 0), elAxis = new THREE.Vector3();
  // une fois la caméra du haut de page en place, on répartit les tuiles et la poussière dans son cadre
  function placeFloaters() {
    updateCamera();
    camera.updateMatrixWorld();
    const center = new THREE.Vector3(0, 0.3, 0);
    FLOAT_SPEC.forEach((f, i) => {
      v.set(f[0], f[1], 0.5).unproject(camera).sub(camera.position).normalize();
      fInfo[i].base.copy(camera.position).addScaledVector(v, f[2]);
      fInfo[i].out.copy(fInfo[i].base).sub(center).normalize();
    });
    for (let i = 0; i < AIR_N; i++) {
      const d = 3 + Math.pow(Math.random(), 0.7) * 26;
      v.set(Math.random() * 2.2 - 1.1, Math.random() * 2.2 - 1.1, 0.5).unproject(camera).sub(camera.position).normalize();
      v.multiplyScalar(d).add(camera.position);
      aBase[i * 3] = v.x; aBase[i * 3 + 1] = v.y; aBase[i * 3 + 2] = v.z;
      aSize[i] = 0.012 + Math.random() * 0.03;
      aPh[i] = Math.random() * 6.28;
    }
    airGeo.attributes.aSize.needsUpdate = true;
  }
  function stepFloaters() {
    const vis = st.float * st.air;
    floaters.visible = vis > 0.001;
    air.visible = floaters.visible;
    if (!floaters.visible) return;
    // la part du mouvement de caméra (curseur) que chaque tuile suit
    const orbit = pointer.sx * 9 * DEG;
    const tilt = -pointer.sy * 3.5 * DEG;
    const az = st.az * DEG + orbit;
    elAxis.set(-Math.cos(az), 0, Math.sin(az));
    fInfo.forEach((f, i) => {
      const arrive = easeOut(clamp01((st.float - f.delay) / 0.65));
      dummy.position.copy(f.base).addScaledVector(f.out, (1 - arrive) * 5);
      dummy.position.sub(target).applyAxisAngle(Y_UP, orbit * f.follow).applyAxisAngle(elAxis, tilt * f.follow).add(target);
      dummy.position.x += Math.sin(clock * f.w + f.ph) * 0.1;
      dummy.position.y += Math.sin(clock * f.w * 0.8 + f.ph * 2) * 0.16;
      qSpin.setFromAxisAngle(f.axis, clock * f.spin + f.ph);
      dummy.quaternion.copy(f.q0).multiply(qSpin);
      const k = Math.max(0.0001, f.size * arrive * st.air);
      dummy.scale.set(k, k, k);
      dummy.updateMatrix();
      floaters.setMatrixAt(i, dummy.matrix);
    });
    floaters.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < AIR_N; i++) {
      const t = clock * 0.05 + aPh[i];
      aPos[i * 3] = aBase[i * 3] + Math.sin(t * 1.3) * 0.3 + clock * 0.02;
      aPos[i * 3 + 1] = aBase[i * 3 + 1] + Math.sin(t * 0.9 + 1) * 0.22;
      aPos[i * 3 + 2] = aBase[i * 3 + 2] + Math.cos(t) * 0.3;
      aAlpha[i] = vis * (0.18 + 0.5 * Math.sin(clock * 0.7 + aPh[i] * 3) ** 2);
    }
    airGeo.attributes.position.needsUpdate = true;
    airGeo.attributes.aAlpha.needsUpdate = true;
  }

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
    pathMix: 0,   // 0 : caméra en orbite ; 1 : caméra sur la trajectoire d'entrée
    u: 0,         // avancement sur la trajectoire (indice du point, avec les décimales)
    hole: 0,      // les tuiles s'envolent autour du point d'entrée
    lath: 0,      // puis les liteaux sont déposés, travée par travée
    tear: 0,      // puis l'écran se déchire
    inside: 0,    // dans les combles
    dark: 0,      // fond ardoise derrière la maquette
    glowLath: 0,  // la couche traversée s'éclaire un instant
    glowEcran: 0,
    float: 0,     // les tuiles en suspens arrivent (intro)
    air: 1,       // et s'effacent quand on plonge
  };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false };
  let clock = 0;
  let lastNow = performance.now();
  slopes.forEach((s) => { s.cordP = new Float32Array(NC); s.pt = 0; s.lifting = false; });
  let focus = null;
  let lastBuild = -1, lastExplode = -1, lastHole = 0, lastLath = 0;

  /* liteaux et cordeaux, travée par travée : posés de gauche à droite pendant la construction,
     déposés autour du point d'entrée quand on entre dans le toit.
     Une fois claqués, les cordeaux vibrent une fraction de seconde. */
  function piece(mesh, k, x0, x1, grow, z, y, o, r1, r2, r3, ux, uz) {
    const len = Math.min(x1 - x0, Math.max(0, grow * L - (x0 + L / 2)));
    if (o > 0) {
      const sw = o * o, tt = clock * (0.5 + r2 * 0.4) + r1 * 6.28;
      dummy.position.set((x0 + x1) / 2 + ux * o * (0.4 + r2 * 0.5), y + o * (0.8 + r3 * 1.1) + Math.sin(tt) * 0.08 * sw, z + uz * o * (0.4 + r2 * 0.5));
      dummy.rotation.set(o * (r1 - 0.5) * 1.4 + Math.sin(tt * 0.7) * 0.3 * sw, o * (r2 - 0.5) * 1.6, o * (0.5 + r3) * (r1 > 0.5 ? 1 : -1) + Math.cos(tt * 0.6) * 0.3 * sw);
      dummy.scale.set(Math.max(0.0001, len * (1 - o * 0.2)), 1 - o * 0.2, 1 - o * 0.2);
    } else {
      dummy.position.set(x0 + len / 2, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(Math.max(0.0001, len), 1, 1);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(k, dummy.matrix);
  }
  function writeLath(s) {
    const open = s === slopes[0] && st.lath > 0;
    for (let j = 0; j < NC; j++) {
      const age = s.snapAt[j] < 0 ? 9 : clock - s.snapAt[j];
      const vib = age < 0.7 ? Math.sin(age * 62) * Math.exp(-age * 7) * 0.035 : 0;
      for (let b = 0; b < BAYS; b++) {
        const k = j * BAYS + b;
        const x0 = CUTS[b], x1 = CUTS[b + 1];
        const r1 = s.pieceR[k * 3], r2 = s.pieceR[k * 3 + 1], r3 = s.pieceR[k * 3 + 2];
        let o = 0, oc = 0, ux = 0, uz = 0;
        if (open) {
          const dx = (x0 + x1) / 2 - ENTRY.x;
          const lift = (z) => {
            const d = Math.hypot(dx, z - ENTRY.z);
            const v = clamp01((st.lath * 0.95 - d + r1 * 0.22) / 0.3);
            return v * v * (3 - 2 * v);
          };
          const d = Math.max(0.05, Math.hypot(dx, s.litZ[j] - ENTRY.z));
          ux = dx / d; uz = (s.litZ[j] - ENTRY.z) / d;
          o = lift(s.litZ[j]);
          oc = lift(s.cordZ[j]);
        }
        piece(s.lit, k, x0, x1, s.litP[j], s.litZ[j], 0, o, r1, r2, r3, ux, uz);
        piece(s.cord, k, x0, x1, s.cordP[j], s.cordZ[j], vib, oc, r2, r3, r1, ux, uz);
      }
    }
    s.lit.instanceMatrix.needsUpdate = true;
    s.cord.instanceMatrix.needsUpdate = true;
  }

  /* tuiles : position de pose, plus le soulèvement sous le curseur */
  function writeTiles(s) {
    const span = NC + 1.4;
    for (let k = 0; k < s.tileInfo.length; k++) {
      const t = s.tileInfo[k];
      const local = s.pt * span - t.j - (t.i / COLS) * 1.2;
      const p = easeOut(clamp01(local));
      const fall = (1 - p) * 0.42;
      const lf = s.lift[k];
      // le couvreur ouvre le toit : autour du point d'entrée, les tuiles se soulèvent et s'envolent
      let o = 0;
      if (s === slopes[0] && st.hole > 0) {
        const dx = t.x - ENTRY.x, dz = t.z + TL * 0.5 - ENTRY.z;
        const d = Math.hypot(dx, dz);
        o = clamp01((st.hole * 1.25 - d + t.r1 * 0.25) / 0.35);
        o = o * o * (3 - 2 * o);
        if (o > 0) {
          const k2 = 1 / Math.max(d, 0.05);
          // en l'air, la tuile ne se fige jamais : elle tangue et dérive doucement, même sans défilement
          const sw = o * o, tt = clock * (0.55 + t.r2 * 0.5) + t.r1 * 6.28;
          dummy.position.set(
            t.x + dx * k2 * o * (0.8 + t.r2 * 0.9) + Math.cos(tt * 0.6) * 0.07 * sw,
            0.05 + fall + lf * 0.3 + o * (1.1 + t.r3 * 1.4) + Math.sin(tt) * 0.1 * sw,
            t.z - (1 - p) * 0.12 + dz * k2 * o * (0.8 + t.r2 * 0.9) + Math.sin(tt * 0.8 + 1) * 0.07 * sw
          );
          dummy.rotation.set(
            -TILT - lf * 1.9 - o * (1.6 + t.r1 * 2.4) + Math.sin(tt * 0.7) * 0.45 * sw,
            o * (t.r2 - 0.5) * 3 + Math.sin(tt * 0.5 + 2) * 0.35 * sw,
            o * (t.r3 - 0.5) * 2.4 + Math.cos(tt * 0.6) * 0.4 * sw
          );
          const sc3 = 1 - o * 0.25;
          dummy.scale.set(sc3, sc3, sc3);
          dummy.updateMatrix();
          s.tiles.setMatrixAt(k, dummy.matrix);
          continue;
        }
      }
      dummy.position.set(t.x, 0.05 + fall + lf * 0.3, t.z - (1 - p) * 0.12);
      dummy.rotation.set(-TILT - (1 - p) * 0.25 - lf * 1.9, 0, 0);
      const sc2 = p <= 0 ? 0.0001 : 1;
      dummy.scale.set(sc2, sc2, sc2);
      dummy.updateMatrix();
      s.tiles.setMatrixAt(k, dummy.matrix);
    }
    s.tiles.instanceMatrix.needsUpdate = true;
  }

  /* la main du couvreur : sous le curseur, les tuiles se soulèvent puis retombent en vague amortie */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const invM = new THREE.Matrix4();
  const lo = new THREE.Vector3();
  const ld = new THREE.Vector3();
  let hover = 0;
  function probeRoof() {
    if (!pointer.inside) return null;
    ndc.set(pointer.x, -pointer.y);
    root.updateMatrixWorld();
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    let hit = null, best = Infinity;
    for (const s of slopes) {
      invM.copy(s.g.tuiles.matrixWorld).invert();
      lo.copy(ray.ray.origin).applyMatrix4(invM);
      ld.copy(ray.ray.direction).transformDirection(invM);
      if (Math.abs(ld.y) < 1e-5) continue;
      const t = (0.1 - lo.y) / ld.y;
      if (t <= 0 || t >= best) continue;
      const x = lo.x + ld.x * t, z = lo.z + ld.z * t;
      if (x < -L / 2 - 0.25 || x > L / 2 + 0.25 || z < -0.15 || z > VMAX + 0.15) continue;
      best = t;
      hit = { s, x, z };
    }
    return hit;
  }
  function stepLift(dt) {
    const allowed = st.build >= 0.999 && st.explode < 0.001 && st.sos < 0.001 && st.hole < 0.001 && st.pathMix < 0.01;
    const hit = allowed ? probeRoof() : null;
    hover += ((hit ? 1 : 0) - hover) * Math.min(1, dt * 6);
    const f = Math.min(1, dt * 60);
    for (const s of slopes) {
      let energy = 0;
      for (let k = 0; k < s.tileInfo.length; k++) {
        const t = s.tileInfo[k];
        let target = 0;
        if (hit && hit.s === s) {
          const dx = t.x - hit.x, dz = t.z + TL * 0.5 - hit.z;
          target = 0.13 * hover * Math.exp(-(dx * dx + dz * dz) / 0.26);
        }
        s.vel[k] = s.vel[k] * Math.pow(0.8, f) + (target - s.lift[k]) * 0.14 * f;
        s.lift[k] += s.vel[k] * f;
        energy += Math.abs(s.lift[k]) + Math.abs(s.vel[k]);
      }
      if (energy > 1e-4 || s.lifting) {
        writeTiles(s);
        s.lifting = energy > 1e-4;
      }
    }
  }

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
      for (let j = 0; j < NC; j++) s.litP[j] = easeOutExpo(seg(pl, j / NC * 0.6, j / NC * 0.6 + 0.4));
      const pcl = easeOut(seg(b, 0.16, 0.26));
      for (let i = 0; i < NR; i++) {
        dummy.position.set(-L / 2 + 0.06 + (i * (L - 0.12)) / (NR - 1), 0, 0);
        dummy.scale.set(1, 1, Math.max(0.0001, pcl));
        dummy.updateMatrix();
        s.cl.setMatrixAt(i, dummy.matrix);
      }
      s.cl.instanceMatrix.needsUpdate = true;
      // cordeaux : claqués d'un coup, rang après rang (chaque claquement lâche sa craie)
      const pc = seg(b, 0.3, 0.46);
      const growing = b > lastBuild && b - lastBuild < 0.2;
      for (let j = 0; j < NC; j++) {
        const p = easeOutExpo(seg(pc, j / NC * 0.7, j / NC * 0.7 + 0.3));
        if (p > 0.97 && !s.snapped[j]) {
          s.snapped[j] = 1;
          if (growing) { s.snapAt[j] = clock; puff(s, j); }
        } else if (p < 0.5) {
          s.snapped[j] = 0;
        }
        s.cordP[j] = p;
      }
      writeLath(s);
      // tuiles : rang par rang, de l'égout au faîtage
      s.pt = seg(b, 0.44, 0.92);
      writeTiles(s);
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
  glowMats.forEach((m) => { m.emissive = new THREE.Color(glowTint.get(m) || '#ffffff'); m.emissiveIntensity = 0; m.userData.glow = 0; m.userData.g = 0; });
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
        const u = m.userData;
        const d = u.glow - u.g;
        u.g = Math.abs(d) > 0.002 ? u.g + d * 0.14 : u.glow;
        m.emissiveIntensity = u.g + (m === M.batten ? st.glowLath : m === M.ecran ? st.glowEcran : 0);
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
    dustMat.uniforms.uScale.value = (H / (2 * Math.tan((camera.fov * DEG) / 2))) * DPR;
    motesMat.uniforms.uScale.value = dustMat.uniforms.uScale.value;
    airMat.uniforms.uScale.value = dustMat.uniforms.uScale.value;
  }
  resize();
  window.addEventListener('resize', resize);

  function updateCamera() {
    // respiration très lente de la caméra et du soleil, effacée dans la coupe et au SOS
    const calm = (1 - st.explode) * (1 - st.sos);
    const az = (st.az + pointer.sx * 9 + Math.sin(clock * 0.21) * 1.6 * calm) * DEG;
    const el = (st.el - pointer.sy * 3.5 + Math.sin(clock * 0.16 + 1.3) * 0.7 * calm) * DEG;
    U.uCloud.value = (1 - 0.85 * st.sos) * (1 - 0.45 * st.explode);
    root.rotation.y = (st.yaw + pointer.sx * 4 * (1 - st.sos) * (1 - st.pathMix)) * DEG;
    root.updateMatrixWorld();
    target.set(st.tx, st.ty, st.tz);
    camera.position.set(
      target.x + st.dist * Math.cos(el) * Math.sin(az),
      target.y + st.dist * Math.sin(el),
      target.z + st.dist * Math.cos(el) * Math.cos(az)
    );
    if (st.pathMix > 0.0001) {
      // sur la trajectoire, la souris ne fait qu'incliner légèrement le regard
      const t = clamp01(st.u / (PATH_N - 1));
      camPath.getPoint(t, pathP);
      lookPath.getPoint(t, pathQ);
      pathQ.x += pointer.sx * 0.25 * st.pathMix;
      pathQ.y -= pointer.sy * 0.12 * st.pathMix;
      model.localToWorld(pathP);
      model.localToWorld(pathQ);
      camera.position.lerp(pathP, st.pathMix);
      target.lerp(pathQ, st.pathMix);
    }
    camera.lookAt(target);
    camera.setViewOffset(W, H, -W * st.shiftX, -H * st.shiftY, W, H);
    // le trou suit la toiture
    entryWorld.copy(E_m);
    model.localToWorld(entryWorld);
    U.uHole.value.set(entryWorld.x, entryWorld.y - 0.1, entryWorld.z, st.tear * 0.62);
    renderer.setClearColor(0x262e31, st.dark);
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
    // avec le ciel réel, la lumière ambiante s'efface au profit de l'environnement ;
    // dans les combles, la pénombre : seul le rai de lumière éclaire
    const dim = 1 - 0.8 * Math.max(st.inside, 0.75 * st.tear);
    amb.intensity = (envReady ? 0.55 : 1.5) * dim;
    hemi.intensity = (envReady ? 0.55 : 1.05) * dim;
    scene.environmentIntensity = (envReady ? 0.85 : 0) * dim;
    M.tile.roughness = 0.66 - 0.34 * w;
    M.ridge.roughness = 0.66 - 0.34 * w;
    sun.color.copy(sun0).lerp(sunWet, w);
    hemi.color.copy(hemi0).lerp(hemiWet, w);
    // soleil
    // le soleil glisse avec le curseur sans jamais plonger le pan avant dans l'ombre
    const sAz = (st.sunAz - pointer.sx * 14 + Math.sin(clock * 0.07) * 7 * (1 - st.sos)) * DEG;
    const sEl = st.sunEl * DEG;
    sun.position.set(Math.cos(sEl) * Math.sin(sAz) * 12, Math.sin(sEl) * 12, Math.cos(sEl) * Math.cos(sAz) * 12);
    sun.intensity = 3.2 - 0.8 * w;
    sun.target.position.set(0, 0, 0);
    // le rai suit la direction du soleil
    beam.visible = st.tear > 0.05;
    if (beam.visible) {
      tmpV.copy(sun.position).normalize().negate();
      beam.position.copy(entryWorld).addScaledVector(tmpV, -0.15);
      beam.quaternion.setFromUnitVectors(UP_NEG, tmpV);
      // distance de la caméra à l'axe du rai : on l'efface quand on passe dedans
      axisTmp.copy(camera.position).sub(beam.position);
      const along = axisTmp.dot(tmpV);
      axisTmp.addScaledVector(tmpV, -along);
      const near = THREE.MathUtils.smoothstep(axisTmp.length(), 0.4, 1.3);
      beamMat.uniforms.uAlpha.value = st.tear * (0.35 + 0.65 * st.inside) * near;
    }
    fill.position.set(-sun.position.x, 4, -sun.position.z);
    floor.material.opacity = 0.13 * st.floor;
    floor.visible = st.floor > 0.001;
    renderer.toneMappingExposure = st.exposure;
  }

  const UP_NEG = new THREE.Vector3(0, -1, 0);
  const axisTmp = new THREE.Vector3();
  function stepMotes(dt) {
    if (!beam.visible) return;
    const a = beamMat.uniforms.uAlpha.value;
    for (let i = 0; i < MOTES; i++) {
      const m = mSeed[i];
      m.y -= m.sp * dt * 0.4;
      if (m.y < -BEAM_L) m.y += BEAM_L;
      m.a += dt * 0.08;
      mPos[i * 3] = Math.cos(m.a) * m.r + Math.sin(clock * 0.6 + m.ph) * 0.03;
      mPos[i * 3 + 1] = m.y;
      mPos[i * 3 + 2] = Math.sin(m.a) * m.r;
      mAlpha[i] = a * (0.45 + 0.55 * Math.sin(clock * 1.3 + m.ph * 3) ** 2) * Math.min(1, -m.y / 0.4);
    }
    motesGeo.attributes.position.needsUpdate = true;
    motesGeo.attributes.aAlpha.needsUpdate = true;
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
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    clock += dt;
    U.uTime.value = clock;
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    stepGlow();
    if (st.build !== lastBuild || st.explode !== lastExplode) {
      applyBuild();
      lastBuild = st.build;
      lastExplode = st.explode;
    } else {
      for (const s of slopes) if (s.snapAt.some((t) => t >= 0 && clock - t < 0.7)) writeLath(s);
    }
    updateCamera();
    // tant que des tuiles ou des liteaux sont en l'air, on les réécrit à chaque image : ils flottent
    if (st.hole > 0 || st.hole !== lastHole) { writeTiles(slopes[0]); lastHole = st.hole; }
    if (st.lath > 0 || st.lath !== lastLath) { writeLath(slopes[0]); lastLath = st.lath; }
    stepLift(dt);
    stepDust(dt);
    stepMotes(dt);
    stepFloaters();
    renderer.render(scene, camera);
    if (onFrame) onFrame();
  }
  function tick() { if (active && !document.hidden) render(); }

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.inside = true;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; });

  // compilation des shaders avant la première image
  applyBuild();
  updateCamera();
  // compilation des shaders sans bloquer la page (compilation parallèle quand le pilote la permet)
  // la craie et le mur du SOS sont rendus visibles le temps de la compilation, pour ne rien compiler en pleine animation
  dust.visible = true;
  wall.visible = true;
  beam.visible = true;
  floaters.visible = true;
  air.visible = true;
  // les ombres ont leurs propres shaders (la profondeur vue du soleil) : on les prépare aussi en parallèle,
  // dans les conditions de la passe d'ombre (rendu dans une cible, sans tone mapping)
  const shadowPrep = [];
  function compileShadows() {
    const pre = new THREE.Scene();
    const box = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const back = new THREE.MeshDepthMaterial({ side: THREE.BackSide });
    const both = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
    const inst = (mat, color) => { const m = new THREE.InstancedMesh(box, mat, 1); if (color) m.setColorAt(0, new THREE.Color()); return m; };
    holeDepth.side = THREE.DoubleSide;
    pre.add(new THREE.Mesh(box, back), inst(back), inst(back, true), new THREE.Mesh(box, both), inst(both, true), new THREE.Mesh(box, holeDepth));
    shadowPrep.push(pre); // gardés en mémoire : libérés, leurs programmes le seraient aussi
    const rt = new THREE.WebGLRenderTarget(4, 4);
    renderer.setRenderTarget(rt);
    const done = renderer.compileAsync(pre, camera, scene);
    renderer.setRenderTarget(null);
    return done.then(() => rt.dispose());
  }
  const ready = envLoaded
    .then(() => {
      updateCamera();
      if (!renderer.compileAsync) return renderer.compile(scene, camera);
      return Promise.all([renderer.compileAsync(scene, camera), compileShadows()]);
    })
    .then(() => { dust.visible = false; wall.visible = false; beam.visible = false; floaters.visible = false; air.visible = false; });

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
    placeFloaters,
    set onFrame(fn) { onFrame = fn; },
    renderer,
  };
}
