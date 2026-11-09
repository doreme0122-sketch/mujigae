/* 초프리미엄 스킨 (사용자 작품 THEME_FORGE.html) — build/forge-extract.js 가 원본에서 그대로 옮겨 만든 파일이라 직접 고치지 않음
   makeForge(renderer, camera) → { CATALOG(기체 9종), buildShip(종류, 모양, 칠), ENV(작업대와 같은 방 빛), PRISM_U, setNoFx } */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function makeForge(renderer, camera) {
let NOFX = false;
const scene = new THREE.Scene();   /* 만들 때 잠깐 올려 두는 곳 (그리지 않음) */
const ENV = (() => { const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; })();
const TAU = Math.PI * 2, MODES = ['cruise', 'boost', 'combat'];
let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
/* ---------- procedural hull texture ---------- */
function hullTex({ base, line, accent, accent2, num, grime = .05 }) {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { x.fillStyle = rnd() < .5 ? `rgba(255,255,255,${rnd() * grime * .8})` : `rgba(0,0,0,${rnd() * grime})`; x.fillRect(rnd() * S, rnd() * S, 40 + rnd() * 220, 30 + rnd() * 160); }
  x.strokeStyle = line; x.fillStyle = line;
  const split = (x0, y0, w, h, d) => {
    if (d > 5 || w < 70 || h < 70 || (d > 2 && rnd() < .25)) {
      x.lineWidth = 2.6; x.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
      if (rnd() < .45) { const n = Math.floor(w / 18); for (let i = 1; i < n; i++) { x.beginPath(); x.arc(x0 + i * w / n, y0 + 7, 1.8, 0, TAU); x.fill(); } }
      if (rnd() < .12 && w > 90 && h > 60) { x.lineWidth = 3; for (let i = 0; i < 6; i++) { const yy = y0 + h * .3 + i * 7; x.beginPath(); x.moveTo(x0 + w * .25, yy); x.lineTo(x0 + w * .75, yy); x.stroke(); } }
      if (rnd() < .08) { x.lineWidth = 2; x.strokeRect(x0 + w * .3, y0 + h * .3, 26, 26); x.beginPath(); x.moveTo(x0 + w * .3, y0 + h * .3); x.lineTo(x0 + w * .3 + 26, y0 + h * .3 + 26); x.stroke(); }
      return;
    }
    if (w > h * (0.7 + rnd() * .6)) { const cx = Math.round(w * (.3 + rnd() * .4)); split(x0, y0, cx, h, d + 1); split(x0 + cx, y0, w - cx, h, d + 1); }
    else { const cy = Math.round(h * (.3 + rnd() * .4)); split(x0, y0, w, cy, d + 1); split(x0, y0 + cy, w, h - cy, d + 1); }
  };
  split(0, 0, S, S, 0);
  x.fillStyle = accent; x.fillRect(0, 640, S, 34); x.fillRect(0, 690, S, 9);
  x.fillStyle = accent2; x.fillRect(0, 300, S, 12);
  x.fillStyle = accent; for (let i = 0; i < 18; i++) { x.beginPath(); const xx = 60 + i * 55; x.moveTo(xx, 860); x.lineTo(xx + 26, 860); x.lineTo(xx + 46, 880); x.lineTo(xx + 20, 880); x.closePath(); x.fill(); }
  x.font = 'bold 120px sans-serif'; x.fillStyle = accent2; x.textAlign = 'center';
  x.save(); x.translate(256, 470); x.rotate(-Math.PI / 2); x.fillText(num, 0, 40); x.restore();
  x.save(); x.translate(768, 470); x.rotate(Math.PI / 2); x.fillText(num, 0, 40); x.restore();
  x.font = 'bold 22px sans-serif'; x.fillStyle = line; ['NO STEP', 'UNF-08', 'DANGER · THRUST', 'EJECT'].forEach((s, i) => x.fillText(s, 180 + i * 220, 560 + (i % 2) * 220));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  { const src = x.getImageData(0, 0, S, S).data, Hh = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) Hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
    const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
      const hx = Hh[yy * S + Math.min(S - 1, xx + 1)] - Hh[yy * S + Math.max(0, xx - 1)], hy = Hh[Math.min(S - 1, yy + 1) * S + xx] - Hh[Math.max(0, yy - 1) * S + xx];
      let a = -hx * 4, b = -hy * 4, cc = 1; const L = Math.hypot(a, b, cc);
      const o = (yy * S + xx) * 4; nd[o] = (a / L * .5 + .5) * 255; nd[o + 1] = (b / L * .5 + .5) * 255; nd[o + 2] = (cc / L * .5 + .5) * 255; nd[o + 3] = 255;
    }
    nx.putImageData(ni, 0, 0); const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.anisotropy = 4; t.userData.nrm = nt; }
  return t;
}

/* ---------- geometry generators ---------- */
function loft(secs, { seg = 28, flat = false } = {}) {
  const pos = [], uv = [], idx = [], S = secs.length;
  secs.forEach((s, i) => {
    const n = s.n ?? 2.6;
    for (let j = 0; j <= seg; j++) {
      const th = j / seg * TAU, c = Math.cos(th), sn = Math.sin(th);
      const px = (s.x || 0) + s.w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const py = (s.y || 0) + (sn >= 0 ? s.ht : s.hb) * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      pos.push(px, py, s.z); uv.push(j / seg, i / (S - 1));
    }
  });
  const R = seg + 1;
  for (let i = 0; i < S - 1; i++) for (let j = 0; j < seg; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  [0, S - 1].forEach((i, k) => {
    const s = secs[i], ci = pos.length / 3; pos.push(s.x || 0, s.y || 0, s.z); uv.push(.5, k);
    for (let j = 0; j < seg; j++) { const a = i * R + j; k ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a); }
  });
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  if (!flat) g.userData.grid = { rows: S, cols: R };
  if (flat) g = g.toNonIndexed();
  g.computeVertexNormals(); return g;
}
function airfoil(K, kind) {
  const H = K / 2, pts = [];
  for (let j = 0; j <= H; j++) { const xc = (1 - Math.cos(Math.PI * j / H)) / 2; pts.push([xc, kind === 'diamond' ? (xc < .45 ? xc / .45 : (1 - xc) / .55) * .5 : 2.6 * Math.sqrt(xc) * (1 - xc) * .5]); }
  for (let j = H - 1; j >= 1; j--) { const p = pts[j]; pts.push([p[0], -p[1] * (kind === 'diamond' ? .8 : .85)]); }
  return pts;
}
function makeWing({ span, rootC, tipC, sweep, thick, tipThick, dihedral = 0, kind = 'lens', K = 14, flat = false, s = 1 }) {
  const loop = airfoil(K, kind), L = loop.length, pos = [], uv = [], idx = [];
  const tt = tipThick ?? thick * .5;
  [0, 1].forEach(st => {
    const x = span * st, zle = sweep * st, ch = lerp(rootC, tipC, st), t = lerp(thick, tt, st), y = dihedral * span * st;
    loop.forEach((p, j) => { pos.push(x, y + p[1] * t * 2, zle + p[0] * ch); uv.push(j / L, st); });
  });
  for (let j = 0; j < L; j++) { const a = j, b = (j + 1) % L; idx.push(a, L + a, b, L + a, L + b, b); }
  [0, 1].forEach(st => { const o = st * L; for (let j = 1; j < L - 1; j++) st ? idx.push(o, o + j, o + j + 1) : idx.push(o, o + j + 1, o + j); });
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g = g.toNonIndexed(); if (s < 0) g.scale(-1, 1, 1);
  g.computeVertexNormals(); return g;
}

/* ---------- shared materials ---------- */
const MAT = {
  dark: new THREE.MeshStandardMaterial({ color: 0x15171d, metalness: .7, roughness: .35, side: THREE.DoubleSide }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8a909c, metalness: .95, roughness: .28, side: THREE.DoubleSide }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xe9eef8, metalness: 1, roughness: .1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd3a64c, metalness: 1, roughness: .25, side: THREE.DoubleSide }),
  intake: new THREE.MeshBasicMaterial({ color: 0x020203, side: THREE.DoubleSide }),
  glass: new THREE.MeshStandardMaterial({ color: 0x0b1a2c, metalness: .95, roughness: .04, envMapIntensity: 2.4 }),
  glassGold: new THREE.MeshStandardMaterial({ color: 0x3a2a08, metalness: 1, roughness: .05, envMapIntensity: 2.4 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: .8, roughness: .3 })
};
const glowMat = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const box = (w, h, d, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * .32), m);
const cyl = (r1, r2, h, m, seg = 16) => {
  const y0 = -h / 2, b = Math.min(r1, r2, h) * .22, rr = t => r2 + (r1 - r2) * t;
  const P = [[0, y0], [rr(0) * .82, y0], [rr(0), y0 + b]];
  [.22, .3, .62, .7].forEach((t, i) => { const y = y0 + h * t; P.push([rr(t) * (i % 2 ? 1 : 1), y - b * .3], [rr(t) * .9, y], [rr(t) * .9, y + b * .5], [rr(t), y + b * .8]); });
  P.push([rr(1), -y0 - b], [rr(1) * .82, -y0], [0, -y0]);
  const g = new THREE.LatheGeometry(P.map(a => new THREE.Vector2(a[0], a[1])), seg); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, m);
};

/* flame shader */
const flameGeo = (() => { const g = new THREE.CylinderGeometry(1, .15, 1, 20, 8, true); g.rotateX(-Math.PI / 2); g.translate(0, 0, .5); return g; })();
function makeFlameMat(c1, c2) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uI: { value: 1 }, uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; varying vec3 vN; varying vec3 vV; void main(){ vU=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uT,uI; uniform vec3 uC1,uC2; varying vec2 vU; varying vec3 vN; varying vec3 vV;
      void main(){ float v=vU.y; float f=abs(dot(normalize(vN),normalize(vV)));
        float fl=.75+.25*sin(uT*47.+v*23.)*sin(uT*31.-vU.x*40.);
        float diamonds=.6+.4*pow(abs(sin(v*18.-uT*30.)),3.);
        float a=pow(v,1.6)*pow(f,1.5)*fl*diamonds*uI;
        vec3 col=mix(uC2,uC1,pow(v,3.))*a;
        gl_FragColor=vec4(col*1.6,a); }`
  });
}
function nozzleGeo(r) {
  const p = [[r * .78, -.02], [r * 1.0, .02], [r * 1.08, .18], [r * 1.12, .42], [r * 1.02, .44], [r * .9, .2], [r * .72, .06]].map(a => new THREE.Vector2(a[0], a[1]));
  const g = new THREE.LatheGeometry(p, 28); g.rotateX(Math.PI / 2); return g;
}

/* ---------- ship ---------- */
class Ship {
  constructor(cfg) {
    this.cfg = cfg; this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.parts = []; this.flames = []; this.guns = []; this.navs = []; this.glows = []; this.extras = []; this.mode = 'cruise'; this.mt = 99; this.dock = () => V(0, 0, 0); this._pc = new THREE.Color();
  }
  wpart(obj, poses, parent, spin) { const o = this.part(obj, poses, parent, spin); this.parts[this.parts.length - 1].w = true; return o; }
  part(obj, poses, parent = this.body, spin) {
    const P = {};
    for (const m of MODES) { const a = poses[m] || poses.cruise; P[m] = { p: V(a[0], a[1], a[2]), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(a[3] || 0, a[4] || 0, a[5] || 0)), s: a[6] ?? 1 }; }
    obj.position.copy(P.cruise.p); obj.quaternion.copy(P.cruise.q); obj.scale.setScalar(P.cruise.s);
    parent.add(obj); this.parts.push({ obj, P, spin, ang: V(0, 0, 0) }); return obj;
  }
  engine(parent, x, y, z, r, opt = {}) {
    const [c1, c2] = this.P.flame;
    const g = new THREE.Group(); g.position.set(x, y, z);
    if (opt.square) { opt.bare = true; opt.flatY = .75; for (const k of [1, -1]) { const sp = box(.03, r * 2.1, .45, MAT.steel); sp.position.set(k * r * 1.1, 0, .2); g.add(sp); } const ig = box(r * 2, r * 1.6, .02, glowMat(new THREE.Color(c2).multiplyScalar(1.2))); g.add(ig); }
    if (!opt.bare) { const nz = new THREE.Mesh(nozzleGeo(r), MAT.steel); g.add(nz); }
    if (!opt.bare) { const inner = new THREE.Mesh(new THREE.CircleGeometry(r * .78, 24), glowMat(new THREE.Color(c2).multiplyScalar(1.3))); g.add(inner); }
    const petals = opt.bare ? 0 : 10;
    for (let k = 0; k < petals; k++) { const b = box(r * .22, .02, .3, MAT.dark); const a = k / petals * TAU; b.position.set(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, .3); b.rotation.z = a + Math.PI / 2; b.rotation.x = .12 * Math.cos(a); g.add(b); }
    const fm = makeFlameMat(c1, c2);
    const fl = new THREE.Mesh(flameGeo, fm); fl.scale.set(r * .78 * (opt.flatX || 1), r * .78 * (opt.flatY || 1), 1.5); g.add(fl);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color(c2).multiplyScalar(.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(r * 4.2 * (opt.flatX || 1) * (opt.bare ? 2.2 : 1), r * 4.2 * (opt.bare ? .5 : 1), 1); halo.position.z = .1; g.add(halo);
    parent.add(g); this.flames.push({ fl, fm, halo, r, len: opt.len || 1.6, k: 1 });
    return g;
  }
  nav(parent, x, y, z, color, blink = 0) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(.35); s.position.set(x, y, z); parent.add(s);
    this.navs.push({ s, blink, ph: rnd() * 2 }); return s;
  }
  gun(obj, opt) { this.guns.push(Object.assign({ obj, cd: 0 }, opt)); }
  setMode(m) { this.mode = m; this.mt = 0; }
  update(dt, t) {
    this.mt += dt;
    const m = this.mode, k = 1 - Math.exp(-dt * 4.5);
    for (const p of this.parts) {
      const T = p.P[p.w && this.fire ? 'combat' : m];
      p.obj.position.lerp(T.p, k); p.obj.quaternion.slerp(T.q, k);
      const sc = p.obj.scale.x + (T.s - p.obj.scale.x) * k; p.obj.scale.setScalar(sc);
      if (p.spin) {
        const sp = p.spin[m] || [0, 0, 0], ch = p.obj.children[0];
        ['x', 'y', 'z'].forEach((a, j) => { if (sp[j]) p.ang[a] += sp[j] * dt; else p.ang[a] += (Math.round(p.ang[a] / TAU) * TAU - p.ang[a]) * k; });
        if (ch) ch.rotation.set(p.ang.x, p.ang.y, p.ang.z);
      }
    }
    const thr = this.cfg.thrust[m];
    for (const f of this.flames) {
      f.k += (thr - f.k) * (1 - Math.exp(-dt * 3));
      f.fm.uniforms.uT.value = t + f.r * 10; f.fm.uniforms.uI.value = .7 + .5 * f.k;
      f.fl.scale.z = f.len * f.k * (.92 + .08 * Math.sin(t * 40 + f.r * 9));
      f.halo.material.opacity = .55 + .3 * f.k;
    }
    for (const n of this.navs) n.s.material.opacity = n.blink ? (((t + n.ph) % 1.2) < .08 ? 1 : .05) : .55 + .45 * Math.sin(t * 3 + n.ph);
    // flight motion
    const b = this.body;
    const roll = m === 'boost' ? Math.sin(t * .9) * .05 : Math.sin(t * .6) * .12;
    const mv = this.cfg.moving === m;
    const pitch = mv ? -.03 + Math.sin(t * .7) * .015 : Math.sin(t * .5) * .02;
    const sh = 0;
    b.rotation.z += (roll - b.rotation.z) * k; b.rotation.x += (pitch - b.rotation.x) * k;
    b.position.set(0, Math.sin(t * 1.1) * (mv ? .05 : .09), mv ? .08 : 0);
    for (const f of this.extras) f(this, dt, t);
    if (this.P && this.P.prism) { this._pc.setHSL((t * .12) % 1, .85, .6).multiplyScalar(2.2); for (const g of this.glows) if (g && g.material && g.material.color) g.material.color.copy(this._pc); for (const f of this.flames) f.fm.uniforms.uC2.value.setHSL((t * .12 + .5) % 1, .9, .55); }
  }
}

/* ---------- tracer pool (world space) ---------- */
const tracerGeo = new THREE.CapsuleGeometry(1, 2, 4, 10); tracerGeo.rotateX(Math.PI / 2);
/* ---------- paints ---------- */
const PRISM_U = { uT: { value: 0 } };
function prismify(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPT = PRISM_U.uT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 pv=normalize(vViewPosition); float pf=1.-abs(dot(normalize(normal),pv));
        float ph=pf*1.5+dot(normal,vec3(.35,.55,.2))*.7+uPT*.05;
        vec3 rb=.55+.45*cos(6.2831853*(ph+vec3(0.,.33,.67)));
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*rb*1.3,.9);
        totalEmissiveRadiance+=rb*pow(pf,3.)*.4; }`);
  };
  mat.customProgramCacheKey = () => 'prism';
}
const PAINTS = {
  valkyr: [
    { name: '아크틱', sw: '#d9dde4', base: '#d9dde4', line: 'rgba(40,50,70,.55)', accent: '#1f7fe0', accent2: '#0c2a55', m: .45, r: .36, glow: [.4, 1.6, 2.4], flame: [0xffffff, 0x2a9dff] },
    { name: '블랙 이글', sw: '#23262d', base: '#23262d', line: 'rgba(0,0,0,.65)', accent: '#e8b53a', accent2: '#f2c14a', m: .6, r: .32, glow: [2.4, 1.6, .4], flame: [0xffffff, 0xff9a30] },
    { name: '크림슨', sw: '#9a1f27', base: '#9a1f27', line: 'rgba(30,0,0,.55)', accent: '#f1f1f1', accent2: '#ffffff', m: .5, r: .34, glow: [2.4, .5, .4], flame: [0xffffff, 0xff4030] },
    { name: '프리즘', sw: 'prism', base: '#e4e8ee', line: 'rgba(60,70,90,.4)', accent: '#ffffff', accent2: '#9aa6b8', m: .9, r: .16, glow: [2, 2, 2], flame: [0xffffff, 0xa070ff], prism: true }
  ],
  aegis: [
    { name: '건메탈', sw: '#4a4f58', base: '#4a4f58', line: 'rgba(15,17,22,.7)', accent: '#e8892a', accent2: '#f2c14a', m: .6, r: .45, glow: [2.4, 1.2, .4], flame: [0xfff1d0, 0xff7a20] },
    { name: '데저트', sw: '#b59a6a', base: '#b59a6a', line: 'rgba(60,40,15,.6)', accent: '#5a3a1a', accent2: '#3a2610', m: .35, r: .55, glow: [2.4, 1.6, .6], flame: [0xfff1d0, 0xffa040] },
    { name: '네이비', sw: '#2c3e57', base: '#2c3e57', line: 'rgba(5,10,20,.65)', accent: '#e8e8e8', accent2: '#d33a3a', m: .55, r: .4, glow: [.6, 1.4, 2.6], flame: [0xffffff, 0x4aa0ff] },
    { name: '프리즘', sw: 'prism', base: '#d6dbe2', line: 'rgba(50,60,80,.45)', accent: '#ffffff', accent2: '#8a95a8', m: .9, r: .2, glow: [2, 2, 2], flame: [0xffffff, 0xa070ff], prism: true }
  ],
  spectre: [
    { name: '섀도우', sw: '#141519', base: '#141519', line: 'rgba(80,85,100,.35)', accent: '#2a0c10', accent2: '#5a1a22', m: .55, r: .5, glow: [2.4, .25, .35], flame: [0xffe0e0, 0xff2040] },
    { name: '고스트', sw: '#62666e', base: '#62666e', line: 'rgba(25,28,34,.5)', accent: '#3a3e46', accent2: '#2a2e36', m: .5, r: .55, glow: [.4, 1.8, 2.4], flame: [0xe0f8ff, 0x30c0ff] },
    { name: '옵시디언', sw: '#1c1426', base: '#1c1426', line: 'rgba(90,60,120,.35)', accent: '#2a1838', accent2: '#4a2a66', m: .6, r: .45, glow: [1.6, .5, 2.6], flame: [0xf0e0ff, 0x9040ff] },
    { name: '프리즘', sw: 'prism', base: '#9ea4ae', line: 'rgba(30,34,44,.45)', accent: '#c8ccd4', accent2: '#6a7080', m: .95, r: .18, glow: [2, 2, 2], flame: [0xffffff, 0xa070ff], prism: true }
  ],
  halcyon: [
    { name: '펄', sw: '#ece8de', base: '#ece8de', line: 'rgba(120,100,60,.45)', accent: '#c9a24a', accent2: '#7a5a1c', m: .25, r: .3, glow: [2.2, 1.6, .6], flame: [0xffffff, 0xffc24a] },
    { name: '스카이', sw: '#bcd6ee', base: '#bcd6ee', line: 'rgba(40,70,110,.45)', accent: '#ffffff', accent2: '#2a5fa0', m: .3, r: .32, glow: [.6, 1.6, 2.6], flame: [0xffffff, 0x5ab0ff] },
    { name: '로즈', sw: '#e7c4c4', base: '#e7c4c4', line: 'rgba(110,60,60,.45)', accent: '#b8786a', accent2: '#7a3a34', m: .55, r: .28, glow: [2.6, 1.0, 1.2], flame: [0xffffff, 0xff7aa0] },
    { name: '프리즘', sw: 'prism', base: '#eef0f4', line: 'rgba(70,80,100,.4)', accent: '#ffffff', accent2: '#a0a8b8', m: .85, r: .14, glow: [2, 2, 2], flame: [0xffffff, 0xa070ff], prism: true }
  ]
};
const NUMS = { valkyr: '07', aegis: '21', spectre: '00', halcyon: '12' };
const paintCache = {};
function getPaint(id, i) {
  const k = id + i; if (paintCache[k]) return paintCache[k];
  const d = PAINTS[id][i];
  const tex = hullTex({ base: d.base, line: d.line, accent: d.accent, accent2: d.accent2, num: NUMS[id], grime: id === 'aegis' ? .09 : .05 });
  const mk = (flat) => { const m = new THREE.MeshStandardMaterial({ map: tex, metalness: d.m, roughness: d.r, side: THREE.DoubleSide, flatShading: !!flat }); if (d.prism) prismify(m); m.userData.keep = true; return m; };
  return paintCache[k] = { d, hull: mk(false), hullFlat: mk(true), glow: new THREE.Color(...d.glow), flame: d.flame, prism: !!d.prism };
}

/* ---------- hard-surface weapon kit ---------- */
MAT.gun = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: .85, roughness: .32 });
MAT.copper = new THREE.MeshStandardMaterial({ color: 0xc07a3e, metalness: 1, roughness: .28 });
MAT.ceramic = new THREE.MeshStandardMaterial({ color: 0xdcd9d2, metalness: .15, roughness: .45 });
MAT.band = new THREE.MeshStandardMaterial({ color: 0xc8452a, metalness: .3, roughness: .5 });
const shp = pts => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
const pth = pts => { const s = new THREE.Path(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
const chamferPts = (w, h, c, x = 0, y = 0) => [[x - w / 2 + c, y - h / 2], [x + w / 2 - c, y - h / 2], [x + w / 2, y - h / 2 + c], [x + w / 2, y + h / 2 - c], [x + w / 2 - c, y + h / 2], [x - w / 2 + c, y + h / 2], [x - w / 2, y + h / 2 - c], [x - w / 2, y - h / 2 + c]];
const polyPts = (n, r, rot = 0, x = 0, y = 0) => [...Array(n)].map((_, i) => [x + Math.cos(rot + i / n * TAU) * r, y + Math.sin(rot + i / n * TAU) * r]);
const circ = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); return p; };
function ext(shape, depth, mat, bev = .01, curve = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
}
const frame = (outer, inner) => { const s = shp(outer); s.holes.push(pth(inner)); return s; };
const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };

/* autocannon: receiver, slatted cooling shroud, collars, slotted muzzle brake */
function makeAutocannon(len = 1.1, fair = true) {
  const g = new THREE.Group();
  if (fair) g.add(new THREE.Mesh(loft([{ z: .75, w: .02, ht: .02, hb: .02 }, { z: .55, w: .085, ht: .085, hb: .085, n: 3 }, { z: -.1, w: .095, ht: .095, hb: .095, n: 3 }, { z: -.25, w: .07, ht: .07, hb: .07, n: 3 }], { seg: 18 }), MAT.dark));
  g.add(at(ext(shp(chamferPts(.15, .17, .035)), .5, MAT.gun, .008), 0, 0, .05));
  g.add(at(ext(shp(chamferPts(.06, .11, .018)), .28, MAT.dark, .006), .095, -.01, .12));
  for (let k = 0; k < 3; k++) g.add(at(box(.035, .02, .035, MAT.steel), .132, -.04 + k * .04, .12));
  const bz = -.25 - len / 2;
  const brl = cyl(.026, .026, len + .1, MAT.steel, 14); brl.position.z = bz; g.add(brl);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; const sl = ext(shp([[-.018, -.01], [.018, -.01], [.013, .01], [-.013, .01]]), len * .62, MAT.gun, .004); sl.position.set(Math.cos(a) * .052, Math.sin(a) * .052, bz + .05); sl.rotation.z = a - Math.PI / 2; g.add(sl); }
  [-.2, bz + .05 - len * .31, bz + .05 + len * .31].forEach(z => g.add(at(ext(frame(polyPts(12, .074, Math.PI / 12), polyPts(12, .044, Math.PI / 12)), .045, MAT.dark, .006), 0, 0, z)));
  const mb = shp([[0, -.05], [.2, -.05], [.2, .05], [0, .05]]);
  [.035, .085, .135].forEach(x => mb.holes.push(pth([[x, -.034], [x + .03, -.034], [x + .03, .034], [x, .034]])));
  const brake = ext(mb, .08, MAT.gun, .006); brake.rotation.y = Math.PI / 2; brake.position.set(0, 0, bz - len / 2 + .02); g.add(brake);
  const tip = new THREE.Object3D(); tip.position.z = bz - len / 2 - .22; g.add(tip);
  return { g, tip };
}

/* rotary cannon: housing, hex clamp plates, 6 barrels in a rotor */
function makeGatling() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(loft([{ z: .45, w: .03, ht: .03, hb: .03 }, { z: .3, w: .12, ht: .11, hb: .12, n: 3 }, { z: -.3, w: .15, ht: .14, hb: .15, n: 3.5 }, { z: -.75, w: .12, ht: .12, hb: .12, n: 3 }], { seg: 18 }), MAT.gun));
  for (let k = 0; k < 4; k++) g.add(at(box(.05, .03, .14, MAT.dark), (k % 2 ? 1 : -1) * .14, k < 2 ? .05 : -.05, -.1));
  g.add(at(ext(frame(polyPts(10, .14, 0), polyPts(10, .1, 0)), .06, MAT.dark, .008), 0, 0, -.72));
  const rotor = new THREE.Group();
  const plate = holes => { const s = shp(polyPts(6, .095, Math.PI / 6)); polyPts(6, .055).forEach(([x, y]) => s.holes.push(circ(x, y, .021))); s.holes.push(circ(0, 0, .02)); return s; };
  rotor.add(at(ext(plate(), .04, MAT.steel, .006), 0, 0, -.82));
  rotor.add(at(ext(plate(), .035, MAT.steel, .005), 0, 0, -1.25));
  rotor.add(at(ext(plate(), .03, MAT.gun, .005), 0, 0, -1.62));
  polyPts(6, .055).forEach(([x, y]) => { const b = cyl(.019, .019, .9, MAT.steel, 10); b.position.set(x, y, -1.25); rotor.add(b); });
  const hub = cyl(.03, .03, .9, MAT.dark, 10); hub.position.z = -1.22; rotor.add(hub);
  const spin = new THREE.Group(); spin.add(rotor); g.add(spin);
  const tip = new THREE.Object3D(); tip.position.z = -1.8; g.add(tip);
  return { g, spin, tip };
}

/* missile: ogive lathe, seeker, accent band, cruciform fins */
function makeMissile() {
  const g = new THREE.Group();
  const P = [[0, -.3], [.012, -.295], [.03, -.26], [.045, -.2], [.054, -.13], [.056, -.05], [.056, .17], [.05, .22], [.042, .25], [.028, .26], [0, .26]];
  const lg = new THREE.LatheGeometry(P.map(a => new THREE.Vector2(a[0], a[1])), 16); lg.rotateX(Math.PI / 2); g.add(new THREE.Mesh(lg, MAT.ceramic));
  const bg = new THREE.LatheGeometry([[.0575, -.08], [.0575, -.04]].map(a => new THREE.Vector2(a[0], a[1])), 16); bg.rotateX(Math.PI / 2); g.add(new THREE.Mesh(bg, MAT.band));
  const sk = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), MAT.glassGold); sk.position.z = -.285; g.add(sk);
  for (let k = 0; k < 4; k++) { const f = new THREE.Group(); f.rotation.z = k * Math.PI / 2 + Math.PI / 4; const w = new THREE.Mesh(makeWing({ span: .06, rootC: .12, tipC: .06, sweep: .05, thick: .012, s: 1 }), MAT.gun); w.position.set(.05, 0, .1); f.add(w); g.add(f); }
  const nz = cyl(.03, .026, .04, MAT.dark, 12); nz.position.z = .27; g.add(nz);
  const tip = new THREE.Object3D(); tip.position.z = -.33; g.add(tip);
  return { g, tip };
}

/* rocket pod: armored octagonal ribs, honeycomb launch face, recessed rocket heads */
function makeRocketPod(H) {
  const g = new THREE.Group();
  const body = cyl(.27, .25, 1.4, H, 24); g.add(body);
  [-.45, .05, .55].forEach(z => g.add(at(ext(frame(polyPts(8, .305, Math.PI / 8), polyPts(16, .262)), .07, MAT.gun, .01), 0, 0, z)));
  const pos = [[0, 0]]; for (let k = 0; k < 6; k++) pos.push([Math.cos(k / 6 * TAU) * .16, Math.sin(k / 6 * TAU) * .16]);
  const face = shp(polyPts(8, .29, Math.PI / 8)); pos.forEach(([x, y]) => face.holes.push(circ(x, y, .055)));
  g.add(at(ext(face, .06, MAT.gun, .01), 0, 0, -.72));
  const tips = [];
  pos.forEach(([x, y]) => {
    const tube = new THREE.Mesh(new THREE.CircleGeometry(.055, 14), MAT.intake); tube.position.set(x, y, -.66); tube.rotation.y = Math.PI; g.add(tube);
    const rh = new THREE.Mesh(new THREE.ConeGeometry(.04, .09, 12), MAT.ceramic); rh.rotation.x = -Math.PI / 2; rh.position.set(x, y, -.7); g.add(rh);
    const t = new THREE.Object3D(); t.position.set(x, y, -.8); g.add(t); tips.push(t);
  });
  g.add(at(ext(shp(polyPts(8, .25, Math.PI / 8)), .05, MAT.gun, .01), 0, 0, .73));
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4; g.add(at(box(.06, .03, .9, MAT.dark), Math.cos(a) * .27, Math.sin(a) * .27, .05, 0, 0, a)); }
  // armored nose cover (two halves)
  const covers = [];
  for (const sd of [1, -1]) {
    const cg = new THREE.LatheGeometry([[0, 0], [.27, 0], [.27, .06], [.2, .2], [.08, .3], [0, .32]].map(a => new THREE.Vector2(a[0], a[1])), 16, sd > 0 ? 0 : Math.PI, Math.PI);
    cg.rotateX(-Math.PI / 2);
    const c = new THREE.Mesh(cg, H); const hp = new THREE.Group(); c.position.x = -sd * .27; hp.add(c); covers.push({ hp, sd });
  }
  return { g, tips, covers };
}

/* railgun: armored receiver, fin-stack heat sinks, profiled rails with copper contacts,
   machined brace frames, copper accelerator coils, pronged muzzle, plasma between rails */
function makeRailgun(glowCol) {
  const g = new THREE.Group();
  g.add(at(ext(shp(chamferPts(.32, .26, .075)), 1.0, MAT.gun, .012), 0, 0, .15));
  g.add(at(ext(shp(chamferPts(.22, .08, .03)), .7, MAT.dark, .008), 0, .16, .2));
  const lens = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), MAT.glassGold); lens.position.set(.06, .17, -.16); g.add(lens);
  const comb = []; comb.push([0, 0]); for (let k = 0; k < 13; k++) { const x0 = .02 + k * .066; comb.push([x0, .035], [x0, .15], [x0 + .03, .15], [x0 + .03, .035]); } comb.push([.9, .035], [.9, 0]);
  for (const s of [1, -1]) {
    const hs = ext(shp(comb), .05, MAT.steel, .004); hs.rotation.y = -Math.PI / 2; hs.position.set(s * .2, -.08, -.3); g.add(hs);
    for (let k = 0; k < 3; k++) g.add(at(box(.05, .05, .16, MAT.dark), s * .175, .09, .45 - k * .24));
  }
  const railP = shp([[-.055, 0], [.055, 0], [.065, .035], [.03, .07], [-.03, .07], [-.065, .035]]);
  const L = 2.3, zc = -1.25;
  for (const k of [1, -1]) {
    const r = ext(railP, L, MAT.steel, .006); r.position.set(0, k * .055, zc); if (k < 0) r.rotation.z = Math.PI; g.add(r);
    const cu = ext(shp(chamferPts(.05, .014, .004)), L - .1, MAT.copper, .003); cu.position.set(0, k * .052, zc); g.add(cu);
  }
  [-.45, -.95, -1.45, -1.95].forEach(z => {
    g.add(at(ext(frame(chamferPts(.27, .3, .06), chamferPts(.15, .19, .03)), .08, MAT.dark, .01), 0, 0, z));
    for (const s of [1, -1]) g.add(at(box(.03, .05, .05, MAT.steel), s * .14, .1, z));
  });
  [-.7, -1.2, -1.7].forEach(z => {
    g.add(at(ext(frame(polyPts(8, .15, Math.PI / 8), polyPts(8, .118, Math.PI / 8)), .22, MAT.copper, .008), 0, 0, z));
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.add(at(box(.02, .035, .2, MAT.dark), Math.cos(a) * .152, Math.sin(a) * .152, z, 0, 0, a)); }
  });
  g.add(at(ext(frame(chamferPts(.34, .36, .08), chamferPts(.16, .2, .04)), .14, MAT.gun, .012), 0, 0, -2.42));
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * TAU + Math.PI / 4; const pr = ext(shp([[-.03, 0], [.03, 0], [.012, .22], [-.012, .22]]), .05, MAT.steel, .006);
    pr.rotation.set(-Math.PI / 2, 0, 0); const pg = new THREE.Group(); pg.add(pr); pr.position.set(0, 0, 0);
    pg.position.set(Math.cos(a) * .13, Math.sin(a) * .13, -2.5); pg.rotation.z = a - Math.PI / 2; g.add(pg);
  }
  const plasmaMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uI: { value: 0 }, uC: { value: glowCol.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT,uI; uniform vec3 uC; varying vec2 vU;
      void main(){ float y=vU.y-.5; float x=vU.x;
        float arc=0.; for(int i=0;i<3;i++){ float fi=float(i); float c=sin(x*(23.+fi*11.)+uT*(31.+fi*7.))*.18+sin(x*57.-uT*43.+fi)*.06; arc+=exp(-pow((y-c)/.05,2.)); }
        float core=exp(-pow(y/.18,2.))*.5; float a=(arc*.6+core)*uI*smoothstep(0.,.05,x)*smoothstep(1.,.92,x);
        gl_FragColor=vec4(uC*a*1.4,a); }`
  });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(L - .1, .1), plasmaMat); pl.rotation.y = Math.PI / 2; pl.position.z = zc; g.add(pl);
  const tip = new THREE.Object3D(); tip.position.z = -2.6; g.add(tip);
  return { g, tip, plasmaMat };
}

/* beam emitter: faceted housing, stepped focusing frames, radial fins, crystal lens */
function makeEmitter() {
  const g = new THREE.Group();
  g.add(at(ext(shp(polyPts(6, .13, Math.PI / 6)), .7, MAT.dark, .012), 0, 0, 0));
  [0, 1, 2].forEach(k => g.add(at(ext(frame(polyPts(6, .16 - k * .02, Math.PI / 6), polyPts(6, .1 - k * .018, Math.PI / 6)), .05, MAT.gun, .006), 0, 0, -.38 - k * .08)));
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + Math.PI / 2; const f = ext(shp([[0, -.15], [.12, .1], [0, .2]]), .02, MAT.gun, .004); f.rotation.set(0, Math.PI / 2, 0); const fg = new THREE.Group(); fg.add(f); f.position.set(0, .13, 0); fg.rotation.z = a - Math.PI / 2; g.add(fg); }
  const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.06, 0), MAT.glassGold); cr.scale.set(1, 1, 1.8); cr.position.z = -.62; g.add(cr);
  return g;
}

/* support drone: faceted hull, three swept fins, rotating sensor collar, eye */
function makeDrone(eyeMat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(loft([{ z: .22, w: .06, ht: .06, hb: .06, n: 1.4 }, { z: .1, w: .16, ht: .14, hb: .14, n: 1.4 }, { z: -.12, w: .14, ht: .12, hb: .12, n: 1.4 }, { z: -.24, w: .05, ht: .05, hb: .05, n: 1.4 }], { seg: 6, flat: true }), MAT.chrome));
  for (let k = 0; k < 3; k++) { const f = new THREE.Group(); f.rotation.z = k / 3 * TAU + Math.PI / 2; const w = new THREE.Mesh(makeWing({ span: .2, rootC: .22, tipC: .08, sweep: .16, thick: .025, s: 1 }), MAT.gold); w.position.set(.1, 0, -.02); f.add(w); g.add(f); }
  const collar = new THREE.Group(); collar.add(ext(frame(polyPts(8, .13, Math.PI / 8), polyPts(8, .105, Math.PI / 8)), .05, MAT.gun, .006)); collar.position.z = -.1; g.add(collar);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), eyeMat); eye.position.z = -.24; g.add(eye);
  const nz = cyl(.04, .035, .05, MAT.dark, 10); nz.position.z = .24; g.add(nz);
  const tip = new THREE.Object3D(); tip.position.z = -.3; g.add(tip);
  return { g, collar, tip };
}

/* ---------- builder helpers ---------- */
function canopy(B, { y, z, sx, sy, sz, frames = [], mat = MAT.glass, frameMat = MAT.frame, oct = false }) {
  const can = oct ? new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat) : new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), mat);
  can.scale.set(sx, sy, sz); can.position.set(0, y, z); B.add(can);
  frames.forEach(fz => { const r = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 6, 24, Math.PI), frameMat); const k = Math.sqrt(Math.max(0, 1 - Math.pow((fz - z) / sz, 2))); r.scale.set(sx * 1.02 * k, sy * 1.02 * k, .3); r.position.set(0, y, fz); B.add(r); });
  if (!oct) { const sill = new THREE.Mesh(new THREE.TorusGeometry(1, .03, 6, 48), frameMat); sill.rotation.x = Math.PI / 2; sill.scale.set(sx * 1.04, sz * 1.02, 1); sill.position.set(0, y, z); B.add(sill); }
}
function glowLine(parent, x0, z0, x1, z1, y, col, w = .018) {
  const b = box(w, w, 1, glowMat(col)); const dx = x1 - x0, dz = z1 - z0;
  b.scale.z = Math.hypot(dx, dz); b.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); b.rotation.y = Math.atan2(dx, dz); parent.add(b); return b;
}
function wingtipCannon(S, parent, s, x, y, z, zc) {
  const { g: cg, tip } = makeAutocannon(1.0, true);
  S.part(cg, { cruise: [s * x, y, z], boost: [s * x, y, z], combat: [s * x, y, zc] }, parent);
  S.gun(tip, { rate: .07, speed: 60, life: .6, r: .03, len: 1.4, color: S.P.glow.clone().multiplyScalar(1.2) });
}
const navC = s => s > 0 ? new THREE.Color(.2, 2, .4) : new THREE.Color(2, .2, .2);
const WHITE_NAV = new THREE.Color(1.8, 1.8, 2);

/* ---------- alien bio-cell texture (tileable voronoi scales) ---------- */
function alienTex({ base, seam, hi, spot }) {
  const S = 384, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const img = x.createImageData(S, S), d = img.data;
  const pts = []; for (let i = 0; i < 52; i++) pts.push([rnd() * S, rnd() * S]);
  const B = new THREE.Color(base), Sm = new THREE.Color(seam), Hi = new THREE.Color(hi), HF = new Float32Array(S * S);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) { let dx = Math.abs(xx - px), dy = Math.abs(yy - py); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; const dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; }
    const e = Math.sqrt(d2) - Math.sqrt(d1);
    const edge = 1 - Math.min(1, e / 2.6), dome = Math.max(0, 1 - Math.sqrt(d1) / 30);
    HF[yy * S + xx] = Math.sqrt(dome) * .9 - edge * 1.1;
    const k = .5 + .5 * Math.sin(xx * .021 + yy * .013) * Math.sin(yy * .017 - xx * .008);
    let r = B.r * (.9 + .12 * k) + Hi.r * dome * .18, g = B.g * (.9 + .12 * k) + Hi.g * dome * .18, b = B.b * (.9 + .12 * k) + Hi.b * dome * .18;
    r = r * (1 - edge * .7) + Sm.r * edge * .7; g = g * (1 - edge * .7) + Sm.g * edge * .7; b = b * (1 - edge * .7) + Sm.b * edge * .7;
    const o = (yy * S + xx) * 4; d[o] = Math.min(255, r * 255); d[o + 1] = Math.min(255, g * 255); d[o + 2] = Math.min(255, b * 255); d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.fillStyle = spot;
  for (let i = 0; i < 40; i++) { const [px, py] = pts[i % pts.length]; const r = 2 + rnd() * 4; x.globalAlpha = .5 + rnd() * .4; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 4;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const hx = HF[yy * S + (xx + 1) % S] - HF[yy * S + (xx - 1 + S) % S], hy = HF[((yy + 1) % S) * S + xx] - HF[((yy - 1 + S) % S) * S + xx];
    let a = -hx * 5, b = -hy * 5, cc = 1; const L = Math.hypot(a, b, cc); a /= L; b /= L; cc /= L;
    const o = (yy * S + xx) * 4; nd[o] = (a * .5 + .5) * 255; nd[o + 1] = (b * .5 + .5) * 255; nd[o + 2] = (cc * .5 + .5) * 255; nd[o + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(2, 2);
  return { map: t, nrm: nt };
}

/* ---------- curved sweep generator (horns, organic wings, helices, crescents) ---------- */
function sweep(pts, sec, { segs = 40, rad = 14, up = V(0, 1, 0), closed = false, flat = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', .5);
  const pos = [], uv = [], idx = [], P = V(0, 0, 0), T = V(0, 0, 0), A = V(0, 0, 0), Bv = V(0, 0, 0);
  const ends = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(Math.min(t, .9999), P); curve.getTangentAt(Math.min(t, .9999), T);
    const u = typeof up === 'function' ? up(t, P) : up;
    A.crossVectors(T, u); if (A.lengthSq() < 1e-8) A.set(1, 0, 0); A.normalize(); Bv.crossVectors(A, T).normalize();
    const s = sec(t), n = s.n ?? 2.2, tw = s.tw || 0, ca = Math.cos(tw), sa = Math.sin(tw);
    for (let j = 0; j <= rad; j++) {
      const th = j / rad * TAU, c = Math.cos(th), sn = Math.sin(th);
      const a = s.w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      let b = s.h * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) - (s.arch || 0) * (a * a) / Math.max(1e-6, s.w * s.w);
      const a2 = a * ca - b * sa, b2 = a * sa + b * ca;
      pos.push(P.x + A.x * a2 + Bv.x * b2, P.y + A.y * a2 + Bv.y * b2, P.z + A.z * a2 + Bv.z * b2); uv.push(j / rad, t);
    }
    if (i === 0 || i === segs) ends.push(P.clone());
  }
  const R = rad + 1;
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * R + j, b = a + R; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  if (!closed) [0, segs].forEach((i, k) => { const ci = pos.length / 3, e = ends[k]; pos.push(e.x, e.y, e.z); uv.push(.5, k); for (let j = 0; j < rad; j++) { const a = i * R + j; k ? idx.push(ci, a, a + 1) : idx.push(ci, a + 1, a); } });
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  if (!flat) g.userData.grid = { rows: segs + 1, cols: rad + 1 };
  if (flat) g = g.toNonIndexed();
  g.computeVertexNormals(); return g;
}
/* mesh whose pivot sits at `pv` (so it can rotate about its root) */
function pivoted(geo, mat, pv) { geo.translate(-pv.x, -pv.y, -pv.z); const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat)); return g; }
const lp = (a, b, t) => a + (b - a) * t;
function lathe(prof, seg, mat) { const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), seg); g.rotateX(Math.PI / 2); g.userData.grid = { rows: prof.length, cols: seg + 1, T: true }; return new THREE.Mesh(g, mat); }
function trumpet(r, len, mat) { return lathe([[r * .75, -.02], [r, .08], [r * 1.25, len * .55], [r * 1.6, len], [r * 1.46, len * 1.03], [r * 1.1, len * .58], [r * .82, .12]], 24, mat); }
function shardGeo(len, w, flat = true) { return loft([{ z: len * .5, w: .004, ht: .004, hb: .004, n: 1 }, { z: len * .18, w, ht: w * .55, hb: w * .55, n: 1 }, { z: -len * .12, w: w * .8, ht: w * .45, hb: w * .45, n: 1 }, { z: -len * .5, w: .003, ht: .003, hb: .003, n: 1 }], { seg: 6, flat }); }
function orb(parent, x, y, z, r, S) {
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), MAT.glass); shell.position.set(x, y, z); parent.add(shell);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * .55, 1), glowMat(S.P.glow)); core.position.set(x, y, z); parent.add(core); S.glows.push(core);
  return shell;
}
/* ---------- crystal: studio env + dispersion shader ---------- */
const crystalEnv = (() => {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3550'); g.addColorStop(.45, '#0c1020'); g.addColorStop(.55, '#06080f'); g.addColorStop(1, '#140c22');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const strip = (cx, cy, w, h, a, col) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h)); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.translate(cx, cy); x.scale(w / Math.max(w, h), h / Math.max(w, h)); x.translate(-cx, -cy); x.globalAlpha = a; x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, Math.max(w, h), 0, TAU); x.fill(); x.restore(); };
  strip(90, 50, 70, 14, 1, '#ffffff'); strip(300, 40, 120, 10, .9, '#ffffff'); strip(430, 70, 40, 30, .8, '#cfe8ff');
  strip(200, 120, 160, 6, .55, '#9fd8ff'); strip(60, 180, 50, 8, .5, '#ffc8f0'); strip(360, 200, 90, 10, .45, '#ffe6a8');
  for (let i = 0; i < 60; i++) { x.globalAlpha = .4 + rnd() * .6; x.fillStyle = '#fff'; x.beginPath(); x.arc(rnd() * W, rnd() * H * .9, .6 + rnd() * 1.4, 0, TAU); x.fill(); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
})();
function crystalMat(S, op = .32) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uEnv: { value: crystalEnv }, uTint: { value: S.P.glow.clone().multiplyScalar(.28).lerp(new THREE.Color(1, 1, 1), .55) }, uGlow: { value: S.P.glow.clone().multiplyScalar(.22) }, uT: PRISM_U.uT, uOp: { value: op }, uPrism: { value: S.P.prism ? 1 : 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
      void main(){ vec4 wp=modelMatrix*vec4(position,1.); vWP=wp.xyz; vWN=normalize(mat3(modelMatrix)*normal); vLP=position; gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D uEnv; uniform vec3 uTint,uGlow; uniform float uT,uOp,uPrism;
      varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
      vec2 eq(vec3 d){ d=normalize(d); return vec2(atan(d.z,d.x)/6.2831853+.5, asin(clamp(d.y,-1.,1.))/3.14159265+.5); }
      void main(){
        vec3 N=normalize(vWN); if(!gl_FrontFacing) N=-N;
        vec3 V=normalize(cameraPosition-vWP);
        float ndv=clamp(dot(N,V),0.,1.);
        float F=.05+.95*pow(1.-ndv,4.);
        vec3 R=reflect(-V,N);
        vec3 refl=texture2D(uEnv,eq(R)).rgb;
        vec3 tr=vec3(texture2D(uEnv,eq(refract(-V,N,.66))).r, texture2D(uEnv,eq(refract(-V,N,.64))).g, texture2D(uEnv,eq(refract(-V,N,.615))).b);
        vec3 tint=uTint;
        if(uPrism>.5) tint=mix(tint,.55+.45*cos(6.2831853*(dot(N,vec3(.3,.6,.2))*1.5+uT*.06+vec3(0.,.33,.67))),.85);
        float h=fract(sin(dot(floor(N*9.+.5),vec3(12.9898,78.233,37.719)))*43758.5453);
        float spec=pow(max(dot(R,normalize(vec3(.35,.85,.4))),0.),80.)*2.6+pow(max(dot(R,normalize(vec3(-.6,.3,-.7))),0.),40.)*.9;
        float twinkle=step(.86,h)*pow(.5+.5*sin(uT*2.3+h*61.),6.)*1.4;
        float depth=1.-ndv;
        vec3 col=tr*tint*1.35+refl*F*1.6+uGlow*(.35+depth*1.1)+vec3(spec+twinkle)*mix(vec3(1.),tint,.3);
        float a=clamp(uOp+F*.55+(spec+twinkle)*.4+depth*.18,0.,1.);
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  return m;
}

function membraneMat(S) {
  return new THREE.MeshStandardMaterial({ color: S.P.glow.clone().multiplyScalar(.3).lerp(new THREE.Color(1, 1, 1), .5), metalness: .4, roughness: .15, transparent: true, opacity: .36, emissive: S.P.glow.clone().multiplyScalar(.12), side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2 });
}
function leafGeo(len, w) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  s.bezierCurveTo(w * .9, len * .08, w * 1.1, len * .55, w * .25, len); s.bezierCurveTo(-w * .2, len * .8, -w * .55, len * .35, 0, 0);
  const g = new THREE.ShapeGeometry(s, 24); g.rotateX(-Math.PI / 2); return g;
}
const bolt = (S, extra = {}) => Object.assign({ rate: .14, speed: 55, life: .7, r: .05, len: .8, color: S.P.glow.clone().multiplyScalar(1.3) }, extra);
function tipAt(parent, x, y, z) { const t = new THREE.Object3D(); t.position.set(x, y, z); parent.add(t); return t; }

/* ---------- surface detailer: segmented carapace slabs + hex scale plates ---------- */
const hexDomeGeo = (() => { const g = new THREE.LatheGeometry([[0, .02], [.034, .016], [.054, .006], [.06, 0], [.05, -.008], [0, -.008]].map(a => new THREE.Vector2(a[0], a[1])), 6); return g; })();
const spikeGeo = (() => { const g = new THREE.ConeGeometry(.035, .16, 5); g.translate(0, .07, 0); return g; })();
function gridOf(geo) {
  const G = geo.userData.grid; if (!G || !geo.index) return null;
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  const at = G.T ? (r, c) => c * G.rows + r : (r, c) => r * G.cols + c;
  let sum = 0;
  for (const r of [Math.floor(G.rows * .3), Math.floor(G.rows * .5), Math.floor(G.rows * .7)]) {
    let cx = 0, cy = 0, cz = 0; for (let c = 0; c < G.cols; c++) { const i = at(r, c) * 3; cx += P[i]; cy += P[i + 1]; cz += P[i + 2]; }
    cx /= G.cols; cy /= G.cols; cz /= G.cols;
    for (let c = 0; c < G.cols; c++) { const i = at(r, c) * 3; sum += (P[i] - cx) * N[i] + (P[i + 1] - cy) * N[i + 1] + (P[i + 2] - cz) * N[i + 2]; }
  }
  return { rows: G.rows, cols: G.cols, P, N, at, lathe: !!G.T, sg: sum < 0 ? -1 : 1 };
}
function slabGeo(grd, bands, t0, t1) {
  const out = [], { P, N, at } = grd;
  const v = (r, c, t) => { const i = at(r, c) * 3; return [P[i] + N[i] * t, P[i + 1] + N[i + 1] * t, P[i + 2] + N[i + 2] * t]; };
  const quad = (a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (const [r0, r1, c0, c1, tt] of bands) {
    const T1 = t1 * tt;
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
      quad(v(r, c, T1), v(r + 1, c, T1), v(r + 1, c + 1, T1), v(r, c + 1, T1));
      quad(v(r, c, t0), v(r, c + 1, t0), v(r + 1, c + 1, t0), v(r + 1, c, t0));
    }
    for (let r = r0; r < r1; r++) { quad(v(r, c0, t0), v(r + 1, c0, t0), v(r + 1, c0, T1), v(r, c0, T1)); quad(v(r, c1, T1), v(r + 1, c1, T1), v(r + 1, c1, t0), v(r, c1, t0)); }
    for (let c = c0; c < c1; c++) { quad(v(r0, c, T1), v(r0, c + 1, T1), v(r0, c + 1, t0), v(r0, c, t0)); quad(v(r1, c, t0), v(r1, c + 1, t0), v(r1, c + 1, T1), v(r1, c, T1)); }
  }
  if (!out.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.computeVertexNormals(); return g;
}
function detailMesh(S, mesh) {
  const grd = gridOf(mesh.geometry); if (!grd) return;
  mesh.geometry.computeBoundingSphere(); const R = mesh.geometry.boundingSphere.radius; if (R < .12) return;
  const { rows, cols } = grd, C = cols - 1;
  const t1 = Math.min(.045, Math.max(.014, R * .022)), t0 = t1 * .18;
  const ranges = grd.lathe ? [[.03, .22], [.28, .47], [.53, .72], [.78, .97]] : [[.07, .24], [.26, .43], [.57, .74], [.76, .93]];
  const covered = new Uint8Array(rows * cols);
  const bands = [];
  const step = rows > 14 ? Math.max(3, Math.round(rows / 9)) : 2;
  ranges.forEach(([u0, u1], ri) => {
    const c0 = Math.max(0, Math.round(u0 * C)), c1 = Math.min(C, Math.round(u1 * C)); if (c1 - c0 < 1) return;
    for (let r = 1 + (ri % 2); r + 1 < rows - 1; r += step) {
      const r1 = Math.min(rows - 2, r + step - 1); if (r1 <= r) continue;
      const tt = .75 + rnd() * .5;
      bands.push([r, r1, c0, c1, tt]);
      for (let rr = r; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) covered[rr * cols + cc] = 1;
    }
  });
  const sg = slabGeo(grd, bands, t0 * grd.sg, t1 * grd.sg);
  if (sg) mesh.add(new THREE.Mesh(sg, S.P.trim));
  // scale plates on the uncovered skin
  const free = []; for (let r = 1; r < rows - 1; r++) for (let c = 0; c < C; c++) if (!covered[r * cols + c]) free.push([r, c]);
  const n = Math.min(320, Math.round(free.length * .6)); if (!n) return;
  const inst = new THREE.InstancedMesh(hexDomeGeo, S.P.scale, n);
  const d = new THREE.Object3D(), nv = V(0, 0, 0), col = new THREE.Color();
  const sz = Math.min(1.3, Math.max(.45, R * .32));
  for (let k = 0; k < n; k++) {
    const [r, c] = free[Math.floor(rnd() * free.length)];
    const fr = rnd(), fc = rnd(), r2 = Math.min(rows - 1, r + 1), c2 = Math.min(cols - 1, c + 1);
    const i00 = grd.at(r, c) * 3, i10 = grd.at(r2, c) * 3, i01 = grd.at(r, c2) * 3, i11 = grd.at(r2, c2) * 3;
    const bl = j => lp(lp(grd.P[i00 + j], grd.P[i10 + j], fr), lp(grd.P[i01 + j], grd.P[i11 + j], fr), fc);
    d.position.set(bl(0), bl(1), bl(2));
    nv.set(grd.N[i00], grd.N[i00 + 1], grd.N[i00 + 2]).normalize().multiplyScalar(grd.sg);
    d.position.addScaledVector(nv, .003);
    d.quaternion.setFromUnitVectors(UPV, nv); d.rotateY(rnd() * TAU);
    const s = sz * (.55 + rnd() * .7); d.scale.set(s, s * (.8 + rnd() * .5), s); d.updateMatrix(); inst.setMatrixAt(k, d.matrix);
    col.setScalar(.8 + rnd() * .35); inst.setColorAt(k, col);
  }
  inst.frustumCulled = false; mesh.add(inst);
}
const UPV = V(0, 1, 0);
function detailShip(S) {
  const list = [];
  S.root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && (o.material === S.P.hull) && o.geometry.userData.grid) list.push(o); });
  list.forEach(m => detailMesh(S, m));
}

/* ---------- alien paints ---------- */
const APAINT = (name, sw, base, seam, hi, spot, m, r, glow, flame, prism) => ({ name, sw, base, seam, hi, spot, m, r, glow, flame, prism });
const PAINTS2 = {
  nautile: [APAINT('심해', '#1f3d52', '#1f3d52', '#0a1520', '#7fd8ff', '#7fe8ff', .45, .3, [.4, 1.8, 2.4], [0xffffff, 0x30c8ff]),
            APAINT('산호', '#c86a5a', '#c86a5a', '#4a1a14', '#ffd0b0', '#ffe2a0', .3, .35, [2.4, 1.2, .6], [0xffffff, 0xff8a50]),
            APAINT('흑진주', '#1b1a24', '#1b1a24', '#050508', '#b9a0ff', '#c8a8ff', .7, .18, [1.4, .7, 2.6], [0xffffff, 0x9a5aff]),
            APAINT('프리즘', 'prism', '#dfe6ee', '#7a8698', '#ffffff', '#ffffff', .85, .14, [2, 2, 2], [0xffffff, 0xa070ff], true)],
  seraphe: [APAINT('백은', '#dfe3ea', '#dfe3ea', '#8a93a3', '#ffffff', '#a8e8ff', .7, .18, [.6, 1.8, 2.6], [0xffffff, 0x60d0ff]),
            APAINT('여명', '#e9c9a0', '#e9c9a0', '#7a5430', '#fff4d8', '#ffd890', .8, .22, [2.6, 1.7, .7], [0xffffff, 0xffb040]),
            APAINT('성운', '#4a3a7a', '#4a3a7a', '#1a1030', '#d8b8ff', '#ff9ae8', .55, .25, [2.4, .7, 2.2], [0xffffff, 0xff50d0]),
            APAINT('프리즘', 'prism', '#eef0f6', '#8a92a6', '#ffffff', '#ffffff', .9, .12, [2, 2, 2], [0xffffff, 0xa070ff], true)],
  chitin: [APAINT('에메랄드', '#1f5a3a', '#1f5a3a', '#06180e', '#b8ffb0', '#d8ff70', .6, .25, [1.2, 2.4, .6], [0xffffff, 0x8aff40]),
           APAINT('호박', '#8a5a1a', '#8a5a1a', '#2a1806', '#ffd890', '#ffb040', .5, .28, [2.6, 1.4, .4], [0xffffff, 0xff9a20]),
           APAINT('흑요', '#151417', '#151417', '#000000', '#ff9a8a', '#ff4a3a', .65, .2, [2.6, .4, .35], [0xffffff, 0xff3020]),
           APAINT('프리즘', 'prism', '#e2e8e4', '#7a887e', '#ffffff', '#ffffff', .85, .14, [2, 2, 2], [0xffffff, 0xa070ff], true)],
  helix: [APAINT('백자', '#e8ecef', '#e8ecef', '#9aa6b0', '#ffffff', '#80f0e0', .2, .28, [.5, 2.2, 2.0], [0xffffff, 0x40ffd8]),
          APAINT('청자', '#7fa89a', '#7fa89a', '#2a4a40', '#e0fff0', '#b0ffd8', .3, .26, [.8, 2.4, 1.4], [0xffffff, 0x60ffa0]),
          APAINT('자수정', '#5a3a6a', '#5a3a6a', '#1a0a24', '#f0c8ff', '#e0a0ff', .6, .2, [1.8, .8, 2.6], [0xffffff, 0xc060ff]),
          APAINT('프리즘', 'prism', '#f0f2f4', '#9aa2ae', '#ffffff', '#ffffff', .85, .12, [2, 2, 2], [0xffffff, 0xa070ff], true)],
  lunaris: [APAINT('월광', '#cfd6e4', '#cfd6e4', '#6a7488', '#ffffff', '#c8e8ff', .75, .16, [1.4, 1.9, 2.6], [0xffffff, 0x8ad0ff]),
            APAINT('일식', '#1c1c24', '#1c1c24', '#000000', '#ffe0a0', '#ffc850', .7, .2, [2.6, 1.9, .7], [0xffffff, 0xffc040]),
            APAINT('혈월', '#6a1a22', '#6a1a22', '#1a0306', '#ffb0a0', '#ff6a50', .6, .22, [2.6, .5, .4], [0xffffff, 0xff4030]),
            APAINT('프리즘', 'prism', '#e6eaf2', '#8a92a4', '#ffffff', '#ffffff', .9, .12, [2, 2, 2], [0xffffff, 0xa070ff], true)]
};
const paintCache2 = {};
function getPaint2(id, i) {
  const k = id + i; if (paintCache2[k]) return paintCache2[k];
  const d = PAINTS2[id][i];
  const tx = alienTex({ base: d.base, seam: d.seam, hi: d.hi, spot: d.spot });
  const mk = flat => { const m = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.nrm, normalScale: new THREE.Vector2(1.3, 1.3), metalness: d.m, roughness: d.r, side: THREE.DoubleSide, flatShading: !!flat }); if (d.prism) prismify(m); m.userData.keep = true; return m; };
  const bc = new THREE.Color(d.base), sc = new THREE.Color(d.seam), hc = new THREE.Color(d.hi);
  const trim = new THREE.MeshStandardMaterial({ color: bc.clone().lerp(sc, .55), metalness: Math.min(1, d.m + .3), roughness: Math.max(.1, d.r - .08), normalMap: tx.nrm, normalScale: new THREE.Vector2(.6, .6), side: THREE.DoubleSide, flatShading: true });
  const scale = new THREE.MeshStandardMaterial({ color: bc.clone().lerp(hc, .22), metalness: Math.min(1, d.m + .15), roughness: Math.max(.1, d.r - .05), flatShading: true });
  [trim, scale].forEach(m => { if (d.prism) prismify(m); m.userData.keep = true; });
  return paintCache2[k] = { d, hull: mk(false), hullFlat: mk(true), trim, scale, glow: new THREE.Color(...d.glow), flame: d.flame, prism: !!d.prism };
}

function quartzGeo(len, w, tipX = 0, k = 1) {
  const W = w * k, tx = tipX * W;
  return loft([
    { z: -len * .5, w: W * .8, ht: W * .72, hb: W * .72, n: 2 },
    { z: -len * .44, w: W, ht: W * .9, hb: W * .9, n: 2 },
    { z: len * .16, w: W * .97, ht: W * .87, hb: W * .87, n: 2, x: tx * .08 },
    { z: len * .2, w: W * .95, ht: W * .85, hb: W * .85, n: 2, x: tx * .1 },
    { z: len * .5, w: .002, ht: .002, hb: .002, n: 2, x: tx * .45 }
  ], { seg: 6, flat: true });
}
function quartzPoint(S, len, w, mat, tipX, phantom = true) {
  const g = new THREE.Group();
  if (phantom) {
    const ph = new THREE.Mesh(quartzGeo(len * .78, w, tipX, .5), S._phM || (S._phM = glowMat(S.P.glow, .55))); ph.position.z = -len * .06; ph.renderOrder = 1; g.add(ph); S.glows.push(ph);
    const ph2 = new THREE.Mesh(quartzGeo(len * .55, w, tipX, .26), S._ph2M || (S._ph2M = glowMat(new THREE.Color(1.6, 1.6, 1.7), .5))); ph2.position.z = -len * .1; ph2.renderOrder = 1; g.add(ph2);
  }
  const shell = new THREE.Mesh(quartzGeo(len, w, tipX), mat); shell.renderOrder = 3; g.add(shell);
  return g;
}
function crystalBlade(S, len, w, mat, sockMat = sockMat) {
  const g = new THREE.Group(), tipX = (rnd() - .5) * .9;
  g.add(quartzPoint(S, len, w, mat, tipX));
  // inclusions: tiny bright flecks floating inside
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.TetrahedronGeometry(w * .07), S._ph2M); f.position.set((rnd() - .5) * w * .7, (rnd() - .5) * w * .6, lp(-len * .35, len * .15, rnd())); f.rotation.set(rnd() * 3, rnd() * 3, 0); f.renderOrder = 2; g.add(f); }
  // secondary points growing from the lower half
  const nSub = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < nSub; i++) {
    const sl = len * (.2 + rnd() * .28), sw = w * (.32 + rnd() * .28);
    const side = i % 2 ? -1 : 1, ang = rnd() * TAU, z = lp(-len * .42, len * .05, rnd());
    const dir = V(Math.cos(ang) * (.5 + rnd() * .5), Math.sin(ang) * (.5 + rnd() * .5), 1).normalize();
    const sub = quartzPoint(S, sl, sw, mat, (rnd() - .5) * .7, sl > len * .3);
    sub.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
    sub.position.set(Math.cos(ang) * w * .4, Math.sin(ang) * w * .35, z).addScaledVector(dir, sl * .42);
    g.add(sub);
  }
  // druzy: small points clustered around the root
  for (let i = 0; i < 8; i++) {
    const ang = i / 8 * TAU + rnd() * .4, sl = len * (.07 + rnd() * .07), d = V(Math.cos(ang), Math.sin(ang), .5 + rnd()).normalize();
    const p = new THREE.Mesh(quartzGeo(sl, w * .16), mat); p.renderOrder = 3;
    p.quaternion.setFromUnitVectors(V(0, 0, 1), d); p.position.set(Math.cos(ang) * w * .55, Math.sin(ang) * w * .5, -len * .45).addScaledVector(d, sl * .4); g.add(p);
  }
  // gold socket with claw prongs
  const sock = lathe([[0, -.05], [w * .48, -.045], [w * .66, 0], [w * .6, .05], [w * .46, .07], [w * .4, .03]], 18, sockMat);
  sock.position.z = -len * .5; g.add(sock);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + .3, cl = new THREE.Group();
    cl.add(new THREE.Mesh(sweep([V(0, 0, 0), V(0, w * .2, w * .55), V(0, w * .1, w * 1.1)], t => ({ w: lp(.024, .005, t), h: lp(.032, .006, t), n: 2.4 }), { segs: 10, rad: 8, up: V(1, 0, 0) }), sockMat));
    cl.position.set(Math.cos(a) * w * .46, Math.sin(a) * w * .46, -len * .5 + .03); cl.rotation.z = a - Math.PI / 2; g.add(cl);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(w * .16, 0), S._phM); gem.position.z = -len * .5 - .035; g.add(gem);
  return bake(S, g);
}
function bake(S, g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), buckets = new Map(), removed = new Set(), M4 = new THREE.Matrix4();
  g.traverse(o => {
    if (!o.isMesh) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.applyMatrix4(M4.multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, { geos: [], ro: o.renderOrder, glow: S.glows.includes(o) });
    const b = buckets.get(o.material); b.geos.push(geo); b.glow = b.glow || S.glows.includes(o); removed.add(o);
    if (o.geometry !== hexDomeGeo) o.geometry.dispose();
  });
  S.glows = S.glows.filter(x => !removed.has(x));
  const out = new THREE.Group();
  buckets.forEach((b, mat) => { const m = new THREE.Mesh(mergeGeometries(b.geos), mat); m.renderOrder = b.ro; out.add(m); if (b.glow) S.glows.push(m); b.geos.forEach(x => x.dispose()); });
  return out;
}

function crescent(S, R, th, chord, thick) {
  const pts = []; const N = 18;
  for (let i = 0; i <= N; i++) { const a = lp(-th, th, i / N); pts.push(V(R * Math.sin(a), 0, -R * (1 - Math.cos(a)))); }
  return sweep(pts, t => { const k = Math.pow(Math.cos((t - .5) * Math.PI), .85); return { w: chord * k + .03, h: thick * k + .012, n: 2.2 }; }, { segs: 70, rad: 14 });
}
function ringWing(R, chord, thick, H, phiStart = 0, phiLen = TAU) {
  const prof = airfoil(16, 'lens').map(p => new THREE.Vector2(R + p[1] * thick, p[0] * chord - chord / 2));
  prof.push(prof[0].clone());
  const g = new THREE.LatheGeometry(prof, Math.max(12, Math.round(72 * phiLen / TAU)), phiStart, phiLen); g.rotateX(Math.PI / 2);
  return new THREE.Mesh(g, H);
}
function panelGeo(grd, bands, t0, t1) {
  const out = [], { P, N, at } = grd;
  const v = (r, c, fr, t) => { const i = at(r, c) * 3, j = at(Math.min(grd.rows - 1, r + 1), c) * 3; return [lp2(P[i], P[j], fr) + N[i] * t, lp2(P[i + 1], P[j + 1], fr) + N[i + 1] * t, lp2(P[i + 2], P[j + 2], fr) + N[i + 2] * t]; };
  const q = (a, b, c, d) => out.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (const [r0, f0, r1, f1, c0, c1] of bands) {
    const pt = (r, f, c, t) => v(r, c, f, t);
    const rowsL = [[r0, f0]]; for (let r = r0 + 1; r <= r1; r++) rowsL.push([r, 0]); rowsL.push([r1, f1]);
    for (let k = 0; k < rowsL.length - 1; k++) for (let c = c0; c < c1; c++) {
      const [ra, fa] = rowsL[k], [rb, fb] = rowsL[k + 1];
      q(pt(ra, fa, c, t1), pt(rb, fb, c, t1), pt(rb, fb, c + 1, t1), pt(ra, fa, c + 1, t1));
    }
    for (let k = 0; k < rowsL.length - 1; k++) { const [ra, fa] = rowsL[k], [rb, fb] = rowsL[k + 1]; q(pt(ra, fa, c0, t0), pt(rb, fb, c0, t0), pt(rb, fb, c0, t1), pt(ra, fa, c0, t1)); q(pt(ra, fa, c1, t1), pt(rb, fb, c1, t1), pt(rb, fb, c1, t0), pt(ra, fa, c1, t0)); }
    for (let c = c0; c < c1; c++) { q(pt(r0, f0, c, t1), pt(r0, f0, c + 1, t1), pt(r0, f0, c + 1, t0), pt(r0, f0, c, t0)); q(pt(r1, f1, c, t0), pt(r1, f1, c + 1, t0), pt(r1, f1, c + 1, t1), pt(r1, f1, c, t1)); }
  }
  if (!out.length) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const uv = new Float32Array(out.length / 3 * 2); for (let i = 0; i < out.length / 3; i++) { uv[i * 2] = out[i * 3] * .35 + out[i * 3 + 2] * .1; uv[i * 2 + 1] = out[i * 3 + 2] * .35 + out[i * 3 + 1] * .1; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
const lp2 = (a, b, t) => a + (b - a) * t;
function armorShip(S) {
  const list = []; S.root.traverse(o => { if (o.isMesh && o.material === S.P.hull && o.geometry.userData.grid) list.push(o); });
  for (const mesh of list) {
    const grd = gridOf(mesh.geometry); if (!grd) continue;
    mesh.geometry.computeBoundingSphere(); const Rr = mesh.geometry.boundingSphere.radius; if (Rr < .5) continue;
    const C = grd.cols - 1, t1 = Math.min(.03, Math.max(.012, Rr * .009)) * grd.sg, t0 = t1 * .15;
    const bands = [];
    [[.1, .2], [.3, .4], [.6, .7], [.8, .9]].forEach(([u0, u1], ri) => {
      const c0 = Math.round(u0 * C), c1 = Math.round(u1 * C); if (c1 - c0 < 1) return;
      for (let r = 0; r < grd.rows - 1; r++) { if ((r + ri) % 2) continue; bands.push([r, .12, r, .88, c0, c1]); }
    });
    const pg = panelGeo(grd, bands, t0, t1); if (pg) mesh.add(new THREE.Mesh(pg, S.P.trim));
  }
}

/* =========================================================
   THEME FX LIBRARY
   ========================================================= */
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false };
function plasmaMat(col) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: col.clone() } }, ...ADD, side: THREE.FrontSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vP=position; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec3 p=normalize(vP)*3.;
        float f1=abs(sin(p.x*3.1+uT*3.3+sin(p.y*2.7-uT*2.1)*2.2)*sin(p.z*2.9+uT*2.6+sin(p.x*1.7)*1.5));
        float f2=abs(sin(p.y*4.3-uT*4.1+sin(p.z*3.3+uT*1.7)*2.)*sin(p.x*3.7-uT*2.9));
        float fil=pow(1.-f1,10.)+pow(1.-f2,12.)*.8;
        float fr=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.);
        vec3 col=uC*(fil*2.2+fr*1.3+.25)+vec3(1.)*fil*.9;
        gl_FragColor=vec4(col,clamp(fil+fr*.8+.15,0.,1.)); }`
  });
}
function flameMat(S) {
  if (S._flm) return S._flm;
  return S._flm = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC1: { value: new THREE.Color(S.P.flame[0]).multiplyScalar(1.6) }, uC2: { value: S.P.glow.clone() } }, ...ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; uniform float uT; void main(){ vU=uv; vec3 p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC1,uC2; varying vec2 vU;
      void main(){ float v=vU.y; float u=vU.x;
        float n=.5+.5*sin(v*16.-uT*9.+sin(u*18.+uT*5.)*1.6); float n2=.5+.5*sin(v*31.-uT*14.+u*40.);
        float a=pow(1.-v,1.1)*(.45+.4*n+.25*n2);
        vec3 col=mix(uC2,uC1,pow(1.-v,2.2)*(.6+.4*n));
        gl_FragColor=vec4(col*a*1.5,a*.9); }`
  });
}
function auroraMat(S) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: S.P.glow.clone() } }, ...ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; uniform float uT; void main(){ vU=uv; vec3 p=position; p.x+=sin(uv.y*7.-uT*2.4)*.12*uv.y; p.y+=sin(uv.y*5.+uT*1.7)*.08*uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vU;
      void main(){ float band=.5+.5*sin(vU.x*24.+uT*3.+sin(vU.y*6.-uT)*3.); float fade=(1.-vU.y)*smoothstep(0.,.08,vU.y)*smoothstep(0.,.25,vU.x)*smoothstep(1.,.75,vU.x);
        vec3 c=mix(uC,vec3(1.,.35,.9),vU.x*.8)*(.6+.8*band); float a=fade*(.35+.45*band);
        gl_FragColor=vec4(c*a*1.3,a); }`
  });
}
/* jagged electric arcs between anchor objects */
/* branching volumetric lightning between anchor objects */
function arcs(S, pairs, col, opt = {}) {
  if (S.fxOff && !opt.force) return;
  const NM = 22, NB = 8, BR = 2;
  const mkGeo = () => {
    const strips = [NM, NB, NB].slice(0, 1 + BR), vcount = strips.reduce((a, n) => a + (n + 1) * 2, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vcount * 3), 3));
    const uv = new Float32Array(vcount * 2), idx = []; let o = 0;
    strips.forEach(n => { for (let i = 0; i <= n; i++) { uv.set([0, i / n, 1, i / n], (o + i * 2) * 2); if (i < n) { const k = o + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } o += (n + 1) * 2; });
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return { g, strips };
  };
  const list = pairs.map(([a, b]) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: col.clone() }, uA: { value: 0 } }, ...ADD, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uC; uniform float uA; varying vec2 vU;
        void main(){ float x=abs(vU.x-.5)*2.; float core=exp(-x*x*38.); float glow=exp(-x*x*3.5);
          float a=(glow*.5+core)*uA; vec3 c=uC*glow*1.1+vec3(1.15,1.18,1.25)*core*1.4; gl_FragColor=vec4(c*a,a); }`
    });
    const { g, strips } = mkGeo(), me = new THREE.Mesh(g, mat); me.frustumCulled = false; me.renderOrder = 6; S.root.add(me);
    const flare = () => { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col.clone().multiplyScalar(1.2), ...ADD })); S.root.add(f); return f; };
    return { a, b, me, mat, strips, fa: flare(), fb: flare(), main: [], br: [], alpha: 0 };
  });
  const A = V(0, 0, 0), B = V(0, 0, 0), cam = V(0, 0, 0), p = V(0, 0, 0), q = V(0, 0, 0), tg = V(0, 0, 0), sd = V(0, 0, 0);
  const rv = k => V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(k);
  const regen = L => {
    // midpoint-displacement main channel (stored as t + offset in units of length)
    const pts = [{ t: 0, o: V(0, 0, 0) }, { t: 1, o: V(0, 0, 0) }];
    let rough = .28;
    while (pts.length < NM + 1) { for (let i = pts.length - 1; i > 0; i--) { if (pts.length >= NM + 1) break; const m = { t: (pts[i - 1].t + pts[i].t) / 2, o: pts[i - 1].o.clone().add(pts[i].o).multiplyScalar(.5).add(rv(rough)) }; pts.splice(i, 0, m); } rough *= .55; }
    L.main = pts;
    L.br = [...Array(BR)].map(() => { const i0 = 3 + Math.floor(Math.random() * (NM - 8)), dir = rv(1).normalize(), len = .2 + Math.random() * .25; const arr = [{ i0, o: V(0, 0, 0) }]; for (let k = 1; k <= NB; k++) arr.push({ o: dir.clone().multiplyScalar(len * k / NB).add(rv(.06 * k / NB)) }); return arr; });
  };
  let tm = 0;
  S.extras.push((sh, dt, t) => {
    tm -= dt; const strike = tm <= 0; if (strike) tm = .05 + Math.random() * .07;
    cam.copy(camera.position); sh.root.worldToLocal(cam);
    for (const L of list) {
      if (strike && Math.random() < (sh.fire ? (opt.pf || .85) : (opt.p || .5))) { if (opt.onStrike) opt.onStrike(list.indexOf(L)); regen(L); L.alpha = 1; }
      L.alpha *= Math.exp(-dt * (sh.fire ? 9 : 12)); const vis = L.alpha > .03 && L.main.length;
      L.me.visible = vis; L.fa.visible = L.fb.visible = vis; if (!vis) continue;
      L.a.getWorldPosition(A); L.b.getWorldPosition(B); sh.root.worldToLocal(A); sh.root.worldToLocal(B);
      const d = A.distanceTo(B), arr = L.me.geometry.attributes.position.array, W = Math.min(.16, .05 + d * .03) * (sh.fire ? 1.35 : 1) * (opt.w || 1);
      L.mat.uniforms.uA.value = Math.min(1, L.alpha * 1.4) * (.8 + Math.random() * .2);
      const put = (o, i, n, P, Pn, w) => { tg.subVectors(Pn, P); if (tg.lengthSq() < 1e-8) tg.set(0, 0, 1); tg.normalize(); sd.subVectors(cam, P).cross(tg).normalize().multiplyScalar(w); arr.set([P.x + sd.x, P.y + sd.y, P.z + sd.z, P.x - sd.x, P.y - sd.y, P.z - sd.z], (o + i * 2) * 3); };
      const mp = L.main.map(m => A.clone().lerp(B, m.t).addScaledVector(m.o, d));
      for (let i = 0; i <= NM; i++) put(0, i, NM, mp[i], i < NM ? mp[i + 1] : mp[i].clone().multiplyScalar(2).sub(mp[i - 1]), W * Math.pow(.3 + .7 * Math.sin(Math.PI * i / NM), .6));
      let o = (NM + 1) * 2;
      L.br.forEach(br => {
        const base = mp[br[0].i0], bp = br.map(b => base.clone().addScaledVector(b.o, d));
        for (let k = 0; k <= NB; k++) { const nx = k < NB ? bp[k + 1] : bp[k].clone().multiplyScalar(2).sub(bp[k - 1]); put(o, k, NB, bp[k], nx, W * .55 * (1 - k / NB) + .004); }
        o += (NB + 1) * 2;
      });
      L.me.geometry.attributes.position.needsUpdate = true;
      L.fa.position.copy(A); L.fb.position.copy(B); const fs = (.25 + d * .08) * L.alpha * (opt.fl || 1); L.fa.scale.setScalar(fs); L.fb.scale.setScalar(fs);
    }
  });
}
/* world-space particle trail (embers / sparks / snow) */
function particles(S, emitters, { color, size = .08, rate = 60, life = 1.2, vel = () => V(0, 0, 0), up = 0 }) {
  if (S.fxOff) return;
  const N = Math.ceil(rate * life) + 8, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), P = [];
  for (let i = 0; i < N; i++) P.push({ p: V(0, -999, 0), v: V(0, 0, 0), l: 0, L: life });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dotTex, vertexColors: true, ...ADD })); pts.frustumCulled = false; S.root.add(pts);
  let acc = 0, ci = 0; const w = V(0, 0, 0);
  S.extras.push((sh, dt, t) => {
    acc += dt * rate * (sh.fire ? 1.5 : 1);
    const drift = sh.mode === sh.cfg.moving ? 7 : 1.2;
    while (acc > 1) { acc--; const q = P[ci++ % N], e = emitters[Math.floor(Math.random() * emitters.length)]; e.getWorldPosition(w); q.p.copy(w); q.v.copy(vel()); q.l = q.L * (.6 + Math.random() * .4); }
    for (let i = 0; i < N; i++) {
      const q = P[i];
      if (q.l > 0) { q.l -= dt; q.p.addScaledVector(q.v, dt); q.p.z += drift * dt; q.p.y += up * dt; }
      const k = Math.max(0, q.l / q.L);
      pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.l > 0 ? q.p.y : -999; pos[i * 3 + 2] = q.p.z;
      col[i * 3] = color.r * k; col[i * 3 + 1] = color.g * k; col[i * 3 + 2] = color.b * k;
    }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  });
}
const emitter = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
/* tesla coil: machined base, copper winding stack, top toroid, plasma node */
function teslaCoil(S, parent, x, y, z, h = .5, rot = [0, 0, 0]) {
  const g = new THREE.Group();
  g.add(rotX(lathe([[0, 0], [.1, 0], [.11, .035], [.075, .07], [.05, .09], [.045, h * .9], [.03, h]], 18, MAT.gun)));
  const n = Math.max(3, Math.round(h / .07));
  for (let k = 0; k < n; k++) { const d = ext(frame(polyPts(16, .068 - k * .003), polyPts(16, .044)), .028, MAT.copper, .004); d.rotation.x = Math.PI / 2; d.position.y = .11 + k * (h * .72 / n); g.add(d); }
  const tor = rotX(lathe([...Array(13)].map((_, i) => { const a = i / 12 * TAU; return [.085 + Math.cos(a) * .028, h + Math.sin(a) * .028]; }), 22, MAT.chrome)); g.add(tor);
  const node = new THREE.Mesh(new THREE.IcosahedronGeometry(.045, 2), plasmaMat(S.P.glow)); node.position.y = h + .03; g.add(node);
  g.position.set(x, y, z); g.rotation.set(...rot); parent.add(g);
  return { g, node };
}
const rotX = m => { m.geometry.rotateX(-Math.PI / 2); return m; };
/* capacitor orb: glass housing + plasma core + clamp ring */
function capOrb(S, parent, x, y, z, r) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(r * .82, 3), plasmaMat(S.P.glow)));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), S._glassT || (S._glassT = new THREE.MeshStandardMaterial({ color: 0x9fb8d8, metalness: .9, roughness: .02, transparent: true, opacity: .22, depthWrite: false, envMapIntensity: 2.5 }))));
  for (const k of [0, 1]) { const rg = ext(frame(polyPts(24, r * 1.12), polyPts(24, r * .96)), r * .14, MAT.gun, .006); rg.rotation.set(k ? Math.PI / 2 : 0, 0, 0); g.add(rg); }
  g.position.set(x, y, z); parent.add(g); return g;
}
/* flame fin: obsidian blade core + animated fire aura */
function flameFin(S, parent, pts, w, h, coreMat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(sweep(pts, t => ({ w: lp(w, .012, Math.pow(t, .9)), h: lp(h, .006, t), n: 2.2 }), { segs: 26, rad: 10 }), coreMat || S.P.trim));
  const au = new THREE.Mesh(sweep(pts, t => ({ w: lp(w * 1.9, .04, t) + .03, h: lp(h * 3.5, .03, t) + .02, n: 2 }), { segs: 26, rad: 10 }), flameMat(S)); au.renderOrder = 4; g.add(au);
  parent.add(g); return g;
}
/* crack emissive map for magma hulls */
const crackTex = (() => {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
  const pts = []; for (let i = 0; i < 40; i++) pts.push([Math.random() * S, Math.random() * S]);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    let d1 = 1e9, d2 = 1e9; for (const [px, py] of pts) { let dx = Math.abs(xx - px), dy = Math.abs(yy - py); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy; const dd = dx * dx + dy * dy; if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd; }
    const e = Math.sqrt(d2) - Math.sqrt(d1), v = Math.max(0, 1 - e / 3.5), glow = Math.max(0, 1 - e / 14) * .35;
    const o = (yy * S + xx) * 4, k = Math.min(1, v + glow); d[o] = 255 * k; d[o + 1] = 255 * k * .75; d[o + 2] = 255 * k * .45; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
/* snowflake: six extruded dendrite arms */
function snowflake(S, r, mat) {
  const g = new THREE.Group(), k = r / .5;
  const arm = shp([[-.022, 0], [-.022, .2], [-.09, .27], [-.075, .29], [-.022, .24], [-.022, .34], [-.07, .4], [-.058, .415], [-.02, .38], [-.02, .45], [0, .5], [.02, .45], [.02, .38], [.058, .415], [.07, .4], [.022, .34], [.022, .24], [.075, .29], [.09, .27], [.022, .2], [.022, 0]].map(([a, b]) => [a * k, b * k]));
  const geo = new THREE.ExtrudeGeometry(arm, { depth: .025 * k, bevelEnabled: true, bevelThickness: .01 * k, bevelSize: .008 * k, bevelSegments: 1 }); geo.translate(0, 0, -.0125 * k);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(geo, mat); m.rotation.z = i / 6 * TAU; g.add(m); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.06 * k, .06 * k, .04 * k, 6), mat); hub.rotation.x = Math.PI / 2; g.add(hub);
  return bake(S, g);
}
/* icicle row along a line (hangs from a trailing edge) */
function icicles(S, parent, a, b, n, len, mat, dir = V(0, -.4, 1)) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, L = len * (.5 + rnd() * .7), q = new THREE.Mesh(quartzGeo(L, .03 + rnd() * .025, (rnd() - .5) * .5), mat);
    q.quaternion.setFromUnitVectors(V(0, 0, 1), dir.clone().add(V((rnd() - .5) * .3, (rnd() - .5) * .3, 0)).normalize());
    q.position.lerpVectors(a, b, t).addScaledVector(dir.clone().normalize(), L * .42); g.add(q);
  }
  parent.add(bake(S, g));
}
/* generic helpers */
function wingSet(S, o) {
  const out = [];
  for (const s of [1, -1]) {
    const wp = new THREE.Group();
    wp.add(new THREE.Mesh(makeWing({ span: o.span, rootC: o.rootC, tipC: o.tipC, sweep: o.sweep, thick: o.thick, tipThick: o.tipThick, dihedral: o.dihedral || 0, kind: o.kind || 'lens', K: o.K || 14, s }), o.mat || S.P.hull));
    const tip = V(s * o.span, (o.dihedral || 0) * o.span, o.sweep + o.tipC * .5);
    if (o.each) o.each(wp, s, tip);
    const P = o.pos, mv = o.move ?? -.28;
    S.part(wp, { cruise: [s * P[0], P[1], P[2], 0, 0, s * (o.roll || 0)], boost: [s * P[0], P[1], P[2] + .05, 0, s * mv, s * (o.roll || 0)], combat: [s * P[0], P[1], P[2], 0, 0, s * (o.roll || 0)] });
    out.push({ wp, s, tip });
  }
  return out;
}
function finSet(S, o) {
  for (const s of (o.single ? [1] : [1, -1])) {
    const fp = new THREE.Group(); fp.add(new THREE.Mesh(makeWing({ span: o.span, rootC: o.rootC, tipC: o.tipC, sweep: o.sweep, thick: o.thick || .06, kind: o.kind || 'lens', K: o.K || 14, s: o.single ? 1 : s }), o.mat || S.P.hull));
    const cant = o.single ? Math.PI / 2 : s * (Math.PI / 2 - (o.cant ?? .3));
    S.part(fp, { cruise: [o.single ? 0 : s * o.x, o.y, o.z, 0, 0, cant], boost: [o.single ? 0 : s * o.x, o.y, o.z + .06, 0, 0, o.single ? cant : cant - s * .15], combat: [o.single ? 0 : s * o.x, o.y, o.z, 0, 0, cant] });
    if (o.each) o.each(fp, s);
  }
}
function engine2(S, B, x, y, z, r, opt = {}) { const e = S.engine(B, x, y, z, r, opt); return e; }
const tracerC = S => S.P.glow.clone().multiplyScalar(1.3);

/* =========================================================
   THEME PAINTS
   ========================================================= */
const TP = (name, base, accent, accent2, glow, flame, m = .6, r = .32, line = 'rgba(0,0,0,.5)') => ({ name, sw: base, base, line, accent, accent2, m, r, glow, flame });
const TPR = (base = '#dfe4ea') => ({ name: '프리즘', sw: 'prism', base, line: 'rgba(60,70,90,.4)', accent: '#ffffff', accent2: '#9aa6b8', m: .9, r: .14, glow: [2, 2, 2], flame: [0xffffff, 0xa070ff], prism: true });
const PAINTS3 = {
  volt: [TP('스톰 블루', '#2a3550', '#5ab0ff', '#9fd8ff', [.5, 1.6, 2.8], [0xffffff, 0x4ab0ff]), TP('바이올렛', '#3a3446', '#b88aff', '#e0c8ff', [1.6, .8, 2.8], [0xffffff, 0xa060ff]), TP('화이트 볼트', '#d8dde6', '#1a3a6a', '#0c1c3a', [.6, 1.8, 2.8], [0xffffff, 0x60c0ff], .45, .3, 'rgba(30,40,60,.5)'), TPR()],
  thunderhead: [TP('아이언 네이비', '#283246', '#e8c84a', '#f2e090', [.6, 1.6, 2.8], [0xffffff, 0x4ab0ff]), TP('썬더 옐로', '#c9a23a', '#151515', '#2a2a2a', [2.6, 2.2, .6], [0xffffff, 0xffd040], .5, .35, 'rgba(40,30,0,.55)'), TP('블랙', '#16181d', '#3ad8ff', '#1a6a8a', [.4, 2.2, 2.8], [0xffffff, 0x30e0ff]), TPR()],
  stormray: [TP('실버', '#c8ccd4', '#2a5fa0', '#0c2a55', [.6, 1.6, 2.8], [0xffffff, 0x60b0ff], .8, .22, 'rgba(30,40,60,.5)'), TP('코발트', '#24407a', '#e0e8ff', '#ffffff', [1.2, 1.8, 2.8], [0xffffff, 0x80c0ff]), TP('퍼플 스톰', '#3a2456', '#ff7ae0', '#ffc8f0', [2.4, .8, 2.6], [0xffffff, 0xff50e0]), TPR()],
  cinder: [TP('블랙 엠버', '#1a1414', '#ff7a2a', '#ffc070', [2.8, 1.2, .3], [0xfff0c0, 0xff6a20], .55, .4), TP('크림슨', '#6a1a14', '#ffb040', '#ffe0a0', [2.8, 1.6, .4], [0xfff0c0, 0xff9a30]), TP('애쉬', '#4a4a4e', '#ff3a2a', '#ff9a8a', [2.8, .6, .3], [0xffe0c0, 0xff3a20], .5, .45), TPR()],
  magma: [TP('바살트', '#1e1c1c', '#ff6a1a', '#ffb060', [2.8, 1.0, .25], [0xfff0c0, 0xff5a10], .45, .55), TP('마그마 레드', '#5a1810', '#ffc040', '#ffe8a0', [2.8, 1.8, .4], [0xfff0c0, 0xffa030], .45, .5), TP('브론즈', '#6a4a24', '#2a1a0a', '#ffb040', [2.8, 1.3, .3], [0xfff0c0, 0xff7a20], .85, .3), TPR('#d8d2cc')],
  phoenix: [TP('골드', '#b8862e', '#7a1a0a', '#ffe0a0', [2.8, 1.4, .35], [0xfff0c0, 0xff7a20], .9, .26), TP('루비', '#7a1020', '#ffc040', '#ffe8b0', [2.8, .9, .5], [0xfff0d0, 0xff5040], .6, .3), TP('화이트 플레임', '#e0dcd4', '#2a5fa0', '#80c0ff', [.8, 1.6, 2.8], [0xffffff, 0x50a0ff], .45, .3, 'rgba(60,50,40,.45)'), TPR()],
  frostbite: [TP('아이스 화이트', '#e6eef4', '#3a8ac0', '#a0d8ff', [.6, 2.0, 2.8], [0xffffff, 0x60d0ff], .4, .28, 'rgba(40,60,80,.45)'), TP('글레이셜 블루', '#3a6a9a', '#e8f6ff', '#ffffff', [1.2, 2.2, 2.8], [0xffffff, 0xa0e8ff]), TP('미드나잇', '#1a2236', '#7ad8ff', '#c8f0ff', [.5, 1.8, 2.8], [0xffffff, 0x50c8ff]), TPR()],
  glacier: [TP('퍼마프로스트', '#c8d6e2', '#2a4a6a', '#5a8ab0', [.7, 1.9, 2.8], [0xffffff, 0x70d0ff], .45, .32, 'rgba(30,50,70,.5)'), TP('딥 아이스', '#2a4a6a', '#c8f0ff', '#ffffff', [1.0, 2.2, 2.8], [0xffffff, 0x90e0ff]), TP('스틸 프로스트', '#5a6470', '#a8e8ff', '#e0f8ff', [.8, 2.0, 2.8], [0xffffff, 0x80d8ff], .8, .28), TPR()],
  aurora: [TP('오로라 그린', '#1e3a3a', '#5affc0', '#c0ffe8', [.5, 2.6, 1.5], [0xffffff, 0x50ffb0]), TP('폴라 퍼플', '#3a2a5a', '#d8a0ff', '#f0e0ff', [1.8, .8, 2.8], [0xffffff, 0xb070ff]), TP('스노우', '#f0f4f8', '#2a8a8a', '#7ad8d8', [.5, 2.4, 2.4], [0xffffff, 0x50f0e0], .4, .3, 'rgba(40,60,70,.45)'), TPR()]
};
const NUM3 = { volt: '01', thunderhead: '02', stormray: '03', cinder: '11', magma: '12', phoenix: '13', frostbite: '21', glacier: '22', aurora: '23' };
const paintCache3 = {};
/* ---------- creature skin: painted feather vanes + relief ---------- */
function featherTex(d) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const base = new THREE.Color(d.base), dark = base.clone().multiplyScalar(.45), lite = base.clone().lerp(new THREE.Color(1, 1, 1), .28), acc = new THREE.Color(d.accent);
  const css = (col, a = 1) => `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},${a})`;
  const gr = x.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, css(lite)); gr.addColorStop(.5, css(base)); gr.addColorStop(1, css(dark)); x.fillStyle = gr; x.fillRect(0, 0, S, S);
  const fw = 46, fh = 64;
  for (let row = -1; row < S / fh * 1.6 + 1; row++) for (let col = -1; col < S / fw + 1; col++) {
    const cx = col * fw + (row % 2) * fw / 2, cy = row * fh * .62;
    x.save(); x.translate(cx, cy);
    const vg = x.createLinearGradient(0, -fh * .5, 0, fh * .55); vg.addColorStop(0, css(lite)); vg.addColorStop(.65, css(base)); vg.addColorStop(.9, css(dark)); vg.addColorStop(1, css(acc.clone().lerp(dark, .4)));
    x.fillStyle = vg; x.beginPath(); x.moveTo(0, -fh * .5); x.bezierCurveTo(fw * .62, -fh * .3, fw * .58, fh * .3, 0, fh * .55); x.bezierCurveTo(-fw * .58, fh * .3, -fw * .62, -fh * .3, 0, -fh * .5); x.fill();
    x.strokeStyle = css(dark, .35); x.lineWidth = .8;
    for (let k = -6; k <= 6; k++) { if (!k) continue; const yy = -fh * .35 + Math.abs(k) * 2 + (k > 0 ? 0 : 3); for (let j = 0; j < 7; j++) { const y0 = yy + j * fh * .12; x.beginPath(); x.moveTo(0, y0); x.lineTo(Math.sign(k) * fw * .5 * (1 - Math.abs(y0) / (fh * .7)), y0 + fh * .09); x.stroke(); } }
    x.strokeStyle = css(lite, .8); x.lineWidth = 1.6; x.beginPath(); x.moveTo(0, -fh * .45); x.quadraticCurveTo(1.5, 0, 0, fh * .5); x.stroke();
    x.restore();
  }
  for (let i = 0; i < 260; i++) { x.fillStyle = css(acc, .25 + Math.random() * .35); x.beginPath(); x.arc(Math.random() * S, Math.random() * S, .6 + Math.random() * 1.4, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 4;
  const src = x.getImageData(0, 0, S, S).data, Hh = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) Hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const hx = Hh[yy * S + (xx + 1) % S] - Hh[yy * S + (xx - 1 + S) % S], hy = Hh[((yy + 1) % S) * S + xx] - Hh[((yy - 1 + S) % S) * S + xx]; let a = -hx * 3, b = -hy * 3, cc = 1; const L = Math.hypot(a, b, cc); const o = (yy * S + xx) * 4; nd[o] = (a / L * .5 + .5) * 255; nd[o + 1] = (b / L * .5 + .5) * 255; nd[o + 2] = (cc / L * .5 + .5) * 255; nd[o + 3] = 255; }
  nx.putImageData(ni, 0, 0); const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(2, 2);
  return { map: t, nrm: nt };
}
function getCreaturePaint(id, i) {
  const k = 'cr' + id + i; if (paintCache3[k]) return paintCache3[k];
  const d = PAINTS3[id][i], tx = featherTex(d);
  const hull = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.nrm, normalScale: new THREE.Vector2(.9, .9), metalness: d.prism ? .6 : .12, roughness: d.prism ? .25 : .55, side: THREE.DoubleSide });
  const hullFlat = hull.clone(); hullFlat.flatShading = true;
  const horn = new THREE.Color(d.base).multiplyScalar(.28).lerp(new THREE.Color(d.accent), .12);
  const trim = new THREE.MeshStandardMaterial({ color: horn, metalness: .25, roughness: .22, side: THREE.DoubleSide });
  const scale = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.base).lerp(new THREE.Color(1, 1, 1), .1), metalness: .1, roughness: .5, flatShading: true });
  [hull, hullFlat, trim, scale].forEach(m => { if (d.prism) prismify(m); m.userData.keep = true; });
  return paintCache3[k] = { d, hull, hullFlat, trim, scale, glow: new THREE.Color(...d.glow), flame: d.flame, prism: !!d.prism };
}
function getPaint3(theme, id, i) {
  const k = id + i; if (paintCache3[k]) return paintCache3[k];
  const d = PAINTS3[id][i];
  const tex = hullTex({ base: d.base, line: d.line, accent: d.accent, accent2: d.accent2, num: NUM3[id], grime: theme === 'fire' ? .1 : .05 });
  if (theme === 'ice') { // frost bloom painted onto the hull
    const c = tex.image, x = c.getContext('2d');
    for (let n = 0; n < 160; n++) { const px = rnd() * c.width, py = rnd() * c.height, r = 6 + rnd() * 40; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(235,248,255,.35)'); g.addColorStop(1, 'rgba(235,248,255,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    x.fillStyle = 'rgba(255,255,255,.8)'; for (let n = 0; n < 500; n++) { x.fillRect(rnd() * c.width, rnd() * c.height, 1.5, 1.5); }
    tex.needsUpdate = true;
  }
  const opts = { map: tex, normalMap: tex.userData.nrm, normalScale: new THREE.Vector2(1.1, 1.1), metalness: d.m, roughness: d.r, side: THREE.DoubleSide };
  if (theme === 'fire') Object.assign(opts, { emissive: new THREE.Color(...d.glow).multiplyScalar(.45), emissiveMap: crackTex, emissiveIntensity: 1 });
  const mk = flat => { const m = new THREE.MeshStandardMaterial({ ...opts, flatShading: !!flat }); if (d.prism) prismify(m); m.userData.keep = true; return m; };
  const trim = new THREE.MeshStandardMaterial({ map: tex, normalMap: tex.userData.nrm, color: new THREE.Color(.78, .8, .84), metalness: Math.min(1, d.m + .25), roughness: Math.max(.12, d.r - .12), side: THREE.DoubleSide, flatShading: true, ...(theme === 'fire' ? { emissive: new THREE.Color(...d.glow).multiplyScalar(.3), emissiveMap: crackTex } : {}) });
  const scale = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.base).lerp(new THREE.Color(1, 1, 1), .15), metalness: Math.min(1, d.m + .15), roughness: d.r, flatShading: true });
  [trim, scale].forEach(m => { if (d.prism) prismify(m); m.userData.keep = true; });
  return paintCache3[k] = { d, hull: mk(false), hullFlat: mk(true), trim, scale, glow: new THREE.Color(...d.glow), flame: d.flame, prism: !!d.prism };
}

/* =========================================================
   ⚡ THUNDER
   ========================================================= */
function nacelleT(S, B, x, y, z0, z1, r) {
  const H = S.P.hull;
  B.add(new THREE.Mesh(loft([{ z: z0, w: r * .72, ht: r * .72, hb: r * .72, x, y, n: 3 }, { z: z0 + .5, w: r, ht: r, hb: r, x, y, n: 3 }, { z: z1 - .9, w: r * 1.05, ht: r * 1.05, hb: r * 1.05, x, y, n: 3 }, { z: z1, w: r * .86, ht: r * .86, hb: r * .86, x, y, n: 3 }], { seg: 24 }), H));
  const ring = ext(frame(polyPts(24, r * .86), polyPts(24, r * .7)), .08, MAT.steel, .01); ring.position.set(x, y, z0 - .02); B.add(ring);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(r * .7, 20), MAT.intake); fan.position.set(x, y, z0 + .1); fan.rotation.y = Math.PI; B.add(fan);
  S.engine(B, x, y, z1 + .02, r * .72, { len: 1.6 });
}
/* =========================================================
   🔥 FIRE
   ========================================================= */
const emberOpts = S => ({ color: new THREE.Color(S.P.flame[1]).multiplyScalar(1.4), size: .07, rate: 55, life: 1.3, up: .9, vel: () => V((Math.random() - .5) * .6, Math.random() * .5, Math.random() * 1.5) });
function phoenixBody(S) {
  const B = S.body, H = S.P.hull;
  B.add(new THREE.Mesh(loft([{ z: 1.9, w: .2, ht: .18, hb: .16 }, { z: 1.2, w: .4, ht: .3, hb: .26 }, { z: .2, w: .48, ht: .38, hb: .3 }, { z: -.8, w: .36, ht: .32, hb: .24 }, { z: -1.5, w: .24, ht: .26, hb: .16, y: .02 }, { z: -2.1, w: .1, ht: .08, hb: .05, y: -.04 }, { z: -2.5, w: .02, ht: .015, hb: .01, y: -.1 }], { seg: 32 }), H));
  canopy(B, { y: .26, z: -.7, sx: .22, sy: .22, sz: .65, mat: MAT.glassGold, frameMat: MAT.gold });
  for (let k = 0; k < 3; k++) flameFin(S, B, [V(0, .3, -1.3 + k * .15), V(0, .55 + k * .05, -1.0 + k * .2), V(0, .7 + k * .08, -.4 + k * .3)], .05, .025);
  S.emb = [emitter(B, 0, .8, -.2)];
  S.gun(tipAt(B, 0, -.1, -2.55), { ...bolt(S, { rate: .12 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) });
  S.extras.push((sh, dt, t) => { sh.P.hull.emissiveIntensity = .6 + .4 * Math.sin(t * 2.6); });
}
function featherWing(S, s, root, n, len0, spread, lift, sweepB) {
  const g = new THREE.Group(), core = new THREE.Group(), aura = [];
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), a = lp(-.25, spread, t), L = len0 * (1 - Math.abs(t - .45) * .55);
    const base = V(s * (.15 + t * .35), .02 + t * .03, t * .55);
    const dir = V(s * Math.cos(a), lift * t, Math.sin(a) + sweepB);
    const pts = [base, base.clone().addScaledVector(dir.clone().normalize(), L * .5).add(V(0, .05, 0)), base.clone().addScaledVector(dir.clone().normalize(), L)];
    core.add(new THREE.Mesh(sweep(pts, u => ({ w: lp(.13, .02, Math.pow(u, 1.3)), h: lp(.025, .006, u), n: 2.4 }), { segs: 18, rad: 8, up: V(0, 1, 0) }), S.P.hull));
    const fa = new THREE.Mesh(sweep(pts, u => ({ w: lp(.22, .05, u) + .02, h: lp(.07, .02, u) + .02, n: 2 }), { segs: 18, rad: 8 }), flameMat(S)); fa.renderOrder = 4; core.add(fa);
    if (k % 2 === 0) S.emb.push(emitter(g, pts[2].x, pts[2].y, pts[2].z));
  }
  g.add(bake(S, core)); g.position.copy(root); return g;
}
const PHOENIX_V = [
  { name: 'A · 펼친 날개', desc: '불꽃에 휩싸인 깃털 7장씩으로 이뤄진 넓은 날개와, 길게 늘어진 꼬리 깃 3장의 불사조형이에요. 무빙 때 날개를 뒤로 접으며 날아가요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = featherWing(S, s, V(s * .35, .05, -.2), 7, 2.4, .9, .35, 0); S.part(w, { cruise: [s * .35, .05, -.2], boost: [s * .35, .05, -.1, 0, -s * .55, 0] }); S.extras.push((sh, dt, t) => { w.children[0].rotation.z = s * Math.sin(t * 1.6) * (sh.mode === 'cruise' ? .12 : .05); }); S.gun(tipAt(w, s * .5, 0, -.2), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      for (let k = -1; k <= 1; k++) { flameFin(S, B, [V(k * .1, .05, 1.8), V(k * .35, .1 + Math.abs(k) * .1, 2.8), V(k * .55, .2, 3.8)], .1, .03); S.emb.push(emitter(B, k * .55, .2, 3.8)); }
      S.engine(B, 0, 0, 1.95, .16, { len: 1.3 });
      particles(S, S.emb, emberOpts(S)); } },
  { name: 'B · 솟은 날개', desc: '깃털 날개가 V자로 높이 솟아오른 형태예요. 꼬리는 부채처럼 펼친 불꽃 깃 5장이에요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = featherWing(S, s, V(s * .3, .1, -.1), 6, 2.2, .5, 1.6, .2); S.part(w, { cruise: [s * .3, .1, -.1, 0, 0, s * .15], boost: [s * .3, .1, 0, 0, -s * .4, s * .05] }); S.gun(tipAt(w, s * .4, 0, -.1), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      for (let k = -2; k <= 2; k++) { flameFin(S, B, [V(k * .06, .05, 1.8), V(k * .3, .08, 2.5), V(k * .55, .1, 3.2)], .09, .025); }
      S.emb.push(emitter(B, 0, .1, 3.2));
      S.engine(B, 0, 0, 1.95, .16, { len: 1.3 });
      particles(S, S.emb, emberOpts(S)); } },
  { name: 'C · 쌍익', desc: '크고 작은 깃털 날개 두 쌍을 위아래로 단 형태예요. 꼬리에서는 한 줄기 긴 불꽃 깃이 흔들려요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { [[.12, 2.0, .6, .3, -.3], [-.08, 1.4, 1.0, -.1, .4]].forEach(([y, L, sp, lift, z], i) => { const w = featherWing(S, s, V(s * .3, y, z), 5, L, sp, lift, i * .3); S.part(w, { cruise: [s * .3, y, z], boost: [s * .3, y, z + .1, 0, -s * (.4 + i * .1), 0] }); if (!i) S.gun(tipAt(w, s * .4, 0, -.1), { ...bolt(S, { rate: .18 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }); }
      const tail = new THREE.Group(); flameFin(S, tail, [V(0, 0, 0), V(0, .1, .9), V(0, .05, 1.8), V(0, .2, 2.6)], .12, .03); tail.position.set(0, .05, 1.8); B.add(tail); S.emb.push(emitter(tail, 0, .2, 2.6));
      S.extras.push((sh, dt, t) => { tail.rotation.y = Math.sin(t * 1.4) * .15; });
      S.engine(B, 0, 0, 1.95, .16, { len: 1.3 });
      particles(S, S.emb, emberOpts(S)); } }
];

/* =========================================================
   ❄ ICE
   ========================================================= */
const snowOpts = S => ({ color: new THREE.Color(1.4, 1.6, 1.8), size: .06, rate: 35, life: 1.8, up: -.15, vel: () => V((Math.random() - .5) * .5, (Math.random() - .5) * .3, Math.random() * .6) });
function iceMat(S, op = .3) { return S._iceM || (S._iceM = crystalMat(S, op)); }
function iceCluster(S, parent, x, y, z, dir, len, w) { const b = crystalBlade(S, len, w, iceMat(S), MAT.chrome); b.quaternion.setFromUnitVectors(V(0, 0, 1), dir.clone().normalize()); b.position.set(x, y, z).addScaledVector(dir.clone().normalize(), len * .45); parent.add(b); return b; }
function ribbon(S, parent, x, y, z, len = 3.2, w = .5) {
  const g = new THREE.PlaneGeometry(w, len, 4, 24); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const m = new THREE.Mesh(g, S._aur || (S._aur = auroraMat(S))); m.position.set(x, y, z); m.renderOrder = 5; m.frustumCulled = false; parent.add(m); return m;
}
/* =========================================================
   ELEMENT-FORM LIBRARY
   ========================================================= */
function rockGeo(r, seed = 1, sx = 1, sy = 1, sz = 1, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, v = V(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const n = .8 + .2 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.3) * Math.sin(v.z * 3.3 + seed * .7) + .1 * Math.sin(v.x * 7 + v.y * 5 + seed * 2.1) + .05 * Math.sin(v.z * 11 - v.x * 9 + seed);
    p.setXYZ(i, v.x * n * r * sx, v.y * n * r * sy, v.z * n * r * sz);
  }
  g.computeVertexNormals(); return g;
}
function lavaMat(S) {
  return S._lava || (S._lava = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: S.P.glow.clone() }, uH: { value: new THREE.Color(S.P.flame[0]) } },
    vertexShader: `varying vec2 vU; varying vec3 vP; void main(){ vU=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC,uH; varying vec2 vU; varying vec3 vP;
      void main(){ float f=vU.y*6.-uT*.9; float n=.5+.5*sin(f*3.+sin(vU.x*12.+f)*1.5); float n2=.5+.5*sin(f*7.3-vU.x*20.);
        float crust=smoothstep(.62,.9,n*n2); vec3 hot=mix(uC*1.3,uH*1.6,pow(n,3.));
        vec3 col=mix(hot,vec3(.05,.02,.02),crust*.85);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
}
function cloudMat(S) {
  return S._cloud || (S._cloud = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uFlash: { value: 0 }, uC: { value: new THREE.Color(S.P.d.base).lerp(new THREE.Color(.35, .38, .48), .45) }, uL: { value: S.P.glow.clone() } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uT,uFlash; uniform vec3 uC,uL; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float f=abs(dot(normalize(vN),normalize(vV)));
        float n=.5+.5*sin(vP.x*4.+uT*.6)*sin(vP.y*5.-uT*.45)*sin(vP.z*4.5+uT*.5);
        float n2=.5+.5*sin(vP.x*11.-uT*.9+vP.z*7.);
        float top=clamp(vN.y*.5+.5,0.,1.);
        vec3 col=uC*(.45+.55*top)*(.75+.35*n)+uL*uFlash*(.35+.9*n2*f);
        float a=pow(f,1.4)*(.78+.22*n);
        gl_FragColor=vec4(col,a);
        #include <colorspace_fragment>
      }`
  }));
}
function fieldMat(S) {
  return S._field || (S._field = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: S.P.glow.clone() }, uI: { value: 1 } }, ...ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; varying vec3 vP; void main(){ vU=uv; vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT,uI; uniform vec3 uC; varying vec2 vU; varying vec3 vP;
      void main(){ float d=length(vP.xz);
        float w=abs(sin(vP.x*9.+sin(vP.z*7.+uT*6.)*1.6-uT*4.))*abs(sin(vP.z*8.-uT*5.+vP.x*3.));
        float fil=pow(1.-w,14.);
        float a=(fil*.85+.08)*uI;
        gl_FragColor=vec4(uC*a*1.4+vec3(fil*.6*uI),a); }`
  }));
}
/* ⚡ bolt segment: extruded zigzag of electric glass with a burning core */
const boltPts = [[-.16, .5], [.14, .5], [.02, .12], [.24, .12], [-.14, -.5], [-.02, -.06], [-.22, -.06]];
function boltGeo(size, depth, k = 1) {
  const g = new THREE.ExtrudeGeometry(shp(boltPts.map(([x, y]) => [x * size * k, y * size])), { depth: depth * k, bevelEnabled: true, bevelThickness: depth * .35 * k, bevelSize: depth * .3 * k, bevelSegments: 2 });
  g.translate(0, 0, -depth * k / 2); g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); return g;
}
function boltSeg(S, size, mat) {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(boltGeo(size, .09), mat); sh.renderOrder = 3; g.add(sh);
  const core = new THREE.Mesh(boltGeo(size * .92, .03, .55), S._boltCore || (S._boltCore = glowMat(S.P.glow.clone().lerp(new THREE.Color(2.5, 2.5, 2.8), .4), .9))); core.renderOrder = 1; g.add(core); S.glows.push(core);
  const a = emitter(g, size * .5, 0, 0), b = emitter(g, -size * .5, 0, 0);
  return { g, a, b };
}
/* branching lightning from one node to several targets */
function boltTree(S, root, targets) { const pr = []; targets.forEach((t, i) => { pr.push([root, t]); if (i) pr.push([targets[i - 1], t]); }); arcs(S, pr, S.P.glow); }
/* lava stream between two points (sweep tube with flowing lava) */
function lavaStream(S, parent, pts, r = .05) { const m = new THREE.Mesh(sweep(pts, t => ({ w: r * (1 - t * .4), h: r * (1 - t * .4) }), { segs: 18, rad: 8, up: V(0, 1, 0) }), lavaMat(S)); parent.add(m); return m; }
function ironCore(S, B, len = 1.6, r = .26) {
  B.add(new THREE.Mesh(loft([{ z: len * .55, w: r * .5, ht: r * .5, hb: r * .5 }, { z: len * .3, w: r, ht: r, hb: r * .9 }, { z: -len * .3, w: r * .9, ht: r, hb: r * .8 }, { z: -len * .55, w: r * .3, ht: r * .35, hb: r * .25 }, { z: -len * .65, w: .02, ht: .02, hb: .02 }], { seg: 24 }), S.P.hull));
  canopy(B, { y: r * .75, z: -len * .2, sx: r * .7, sy: r * .6, sz: len * .3 });
}

/* =========================================================
   ⚡ THUNDER — the ship IS electricity
   ========================================================= */
function voltBody(S) {
  const B = S.body;
  ironCore(S, B, 3.4, .32);
  S.engine(B, 0, 0, 1.95, .2, { len: 1.6 });
  S.orb = capOrb(S, B, 0, .32, .55, .13);
  S.sparkEm = [S.orb];
  S.gun(tipAt(B, 0, -.05, -2.3), { ...bolt(S, { rate: .09, speed: 70, r: .035, len: 1.3 }), color: tracerC(S) });
  S._em = crystalMat(S, .28);
}
function boltWing(S, s, segs, startX, z0, dz, rise, sz, gunEvery = 99) {
  const g = new THREE.Group(), nodes = [];
  segs.forEach((k, i) => {
    const seg = boltSeg(S, sz * k, S._em);
    const x = s * (startX + i * sz * .95), z = z0 + i * dz, y = i * rise;
    seg.g.position.set(x, y, z); seg.g.rotation.y = s * Math.atan2(dz, sz) * -1; seg.g.scale.x = s;
    g.add(seg.g); nodes.push(seg.b, seg.a);
    S.extras.push((sh, dt, t) => { seg.g.position.y = y + Math.sin(t * 1.6 + i + s) * .04; });
    if (i % gunEvery === gunEvery - 1) S.gun(seg.a, { ...bolt(S, { rate: .2 }), color: tracerC(S) });
    S.sparkEm.push(seg.a);
  });
  return { g, nodes };
}
const VOLT_V = [
  { name: 'A · 번개 날개', desc: '공중에 뜬 번개 조각 3개가 뒤로 이어져 날개가 되고, 조각과 조각 사이를 전기 아크가 이어 붙여요. 조각 안에서 번개 심지가 타올라요.',
    build(S) { const B = S.body, all = [];
      for (const s of [1, -1]) { const w = boltWing(S, s, [1, .85, .7], .55, -.1, .45, .04, .8, 3); S.part(w.g, { cruise: [0, 0, 0], boost: [0, 0, .15, 0, -s * .2, 0] }); boltTree(S, S.orb, [w.nodes[0]]); arcs(S, [[w.nodes[1], w.nodes[2]], [w.nodes[3], w.nodes[4]]], S.P.glow); all.push(w); }
      const tail = boltSeg(S, .7, S._em); tail.g.rotation.z = Math.PI / 2; tail.g.position.set(0, .45, 1.5); B.add(tail.g); arcs(S, [[S.orb, tail.a]], S.P.glow);
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 55, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .3) * 2, (Math.random() - .5) * 2) }); } },
  { name: 'B · 삼중 뇌전', desc: '번개 조각이 위·가운데·아래 세 층으로 부채처럼 펼쳐진 날개예요. 층과 층 사이로도 아크가 수직으로 튀어요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const ws = [[.14, .1, 0], [0, .35, .15], [-.14, .6, .3]].map(([y, dz0, r], i) => { const w = boltWing(S, s, [.85, .7], .5, -.3 + i * .35, .4 + i * .1, 0, .75, i === 1 ? 2 : 99); w.g.position.y = y; w.g.rotation.z = s * (i - 1) * -.18; S.part(w.g, { cruise: [0, y, 0, 0, 0, s * (i - 1) * -.18], boost: [0, y, .1, 0, -s * .2, s * (i - 1) * -.1] }); return w; });
        arcs(S, [[S.orb, ws[1].nodes[0]], [ws[0].nodes[1], ws[1].nodes[1]], [ws[1].nodes[1], ws[2].nodes[1]], [ws[0].nodes[3], ws[2].nodes[3]]], S.P.glow); }
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 60, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .3) * 2, (Math.random() - .5) * 2) }); } },
  { name: 'C · 역뇌', desc: '번개 조각이 앞쪽을 향해 V자로 뻗은 전진형이에요. 꼬리에는 세로로 선 번개 조각 두 개가 아크로 이어져 있어요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = boltWing(S, s, [.9, .8, .65], .5, .5, -.42, .05, .75, 3); S.part(w.g, { cruise: [0, 0, 0], boost: [0, 0, .25, 0, s * .15, 0] }); boltTree(S, S.orb, [w.nodes[0]]); arcs(S, [[w.nodes[1], w.nodes[2]], [w.nodes[3], w.nodes[4]]], S.P.glow); }
      const t1 = boltSeg(S, .6, S._em), t2 = boltSeg(S, .6, S._em); [t1, t2].forEach((t, i) => { t.g.rotation.z = Math.PI / 2 + (i ? .4 : -.4); t.g.position.set(i ? -.25 : .25, .45, 1.55); B.add(t.g); }); arcs(S, [[t1.a, t2.a], [S.orb, t1.b]], S.P.glow);
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 55, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .3) * 2, (Math.random() - .5) * 2) }); } }
];
function thunderheadBody(S) {
  const B = S.body;
  B.add(new THREE.Mesh(loft([{ z: 1.8, w: .4, ht: .3, hb: .3, n: 4 }, { z: 1.2, w: .62, ht: .44, hb: .38, n: 4 }, { z: -.4, w: .66, ht: .46, hb: .36, n: 4 }, { z: -1.5, w: .44, ht: .32, hb: .24, n: 3.5 }, { z: -2.2, w: .16, ht: .12, hb: .1 }, { z: -2.4, w: .03, ht: .03, hb: .03 }], { seg: 28 }), S.P.hull));
  canopy(B, { y: .38, z: -.9, sx: .26, sy: .2, sz: .55, frames: [-.65, -1.15] });
  for (const s of [1, -1]) S.engine(B, s * .3, 0, 1.85, .2, { len: 1.6 });
  S.cloud = new THREE.Group(); B.add(S.cloud); S.cloudNodes = [];
  S.gun(tipAt(B, 0, -.05, -2.45), { ...bolt(S, { rate: .1, r: .05 }), color: tracerC(S) });
}
function cloudMass(S, list) {
  const cm = cloudMat(S), geo = new THREE.IcosahedronGeometry(1, 3);
  list.forEach(([x, y, z, r], i) => { const m = new THREE.Mesh(geo, cm); m.position.set(x, y, z); m.scale.setScalar(r); m.renderOrder = 2 + (i % 3); S.cloud.add(m); const n = emitter(S.cloud, x * .95, y, z * .95); S.cloudNodes.push(n);
    S.extras.push((sh, dt, t) => { const k = 1 + Math.sin(t * .7 + i * 1.7) * .05; m.scale.setScalar(r * k); }); });
  let fl = 0, nx = 1;
  S.extras.push((sh, dt, t) => {
    nx -= dt; if (nx < 0) { fl = 1.6; nx = (sh.fire ? .25 : .7) + Math.random() * (sh.fire ? .4 : 1.6); }
    fl = Math.max(0, fl - dt * 6); cm.uniforms.uFlash.value = fl * (.6 + .4 * Math.random());
  });
  const nodes = S.cloudNodes, pr = []; for (let i = 0; i < 6; i++) pr.push([nodes[(i * 5) % nodes.length], nodes[(i * 7 + 3) % nodes.length]]);
  arcs(S, pr, S.P.glow);
  particles(S, nodes, { color: S.P.glow.clone().multiplyScalar(.7), size: .07, rate: 40, life: .5, vel: () => V((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 3) });
  nodes.filter((_, i) => i % 4 === 0).slice(0, 3).forEach(n => S.gun(n, { ...bolt(S, { rate: .3, r: .06 }), color: tracerC(S) }));
}
const THUNDERHEAD_V = [
  { name: 'A · 적란운', desc: '장갑 동체를 거대한 먹구름이 감싸고, 위로 모루 모양 구름이 솟아 있어요. 구름 속에서 번개가 번쩍이며 안을 비추고, 구름 사이로 아크가 튀어요.',
    build(S) { const L = [];
      for (const s of [1, -1]) { L.push([s * .7, .1, .2, .55], [s * 1.25, 0, .5, .48], [s * 1.7, -.05, .9, .38], [s * .55, .55, .5, .45], [s * 1.0, .45, .9, .4], [s * .3, .2, -.6, .4]); }
      L.push([0, .9, .6, .55], [.5, 1.25, .7, .45], [-.5, 1.25, .7, .45], [0, 1.45, .4, .4], [.9, 1.3, .3, .35], [-.9, 1.3, .3, .35], [0, -.25, .6, .45]);
      cloudMass(S, L); } },
  { name: 'B · 폭풍 전선', desc: '구름이 좌우로 길고 낮게 깔린 폭풍 전선형이에요. 날개처럼 펼쳐진 구름 띠 끝에서 번개가 가장 자주 쳐요.',
    build(S) { const L = [];
      for (const s of [1, -1]) for (let k = 0; k < 6; k++) { const x = s * (.55 + k * .42); L.push([x, .05 + Math.sin(k) * .08, .2 + k * .18, .42 - k * .035]); if (k % 2 === 0) L.push([x, .32, .35 + k * .18, .3 - k * .02]); }
      L.push([0, .4, .8, .45], [0, -.2, .9, .4]);
      cloudMass(S, L); S.part(S.cloud, { cruise: [0, 0, 0], boost: [0, 0, .3, 0, 0, 0, .92] }); } },
  { name: 'C · 소용돌이', desc: '동체 둘레를 구름 덩어리 고리가 소용돌이치며 돌고, 무빙 때 더 빠르게 감겨요. 소용돌이 중심으로 번개가 빨려 들어가요.',
    build(S) { const L = [];
      for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, r = 1.35 + Math.sin(k * 2.3) * .15; L.push([Math.cos(a) * r, Math.sin(a) * r * .35 + .1, .3 + Math.sin(a) * .5, .38 + (k % 3) * .06]); }
      cloudMass(S, L); const sp = new THREE.Group(); S.body.remove(S.cloud); sp.add(S.cloud); S.part(sp, { cruise: [0, 0, 0] }, S.body, { cruise: [0, .5, 0], boost: [0, 1.6, 0] }); } }
];
function stormrayBody(S) {
  const B = S.body;
  B.add(new THREE.Mesh(loft([{ z: 1.5, w: .25, ht: .1, hb: .08 }, { z: 1.0, w: .7, ht: .2, hb: .14 }, { z: .1, w: .9, ht: .28, hb: .16 }, { z: -.8, w: .7, ht: .24, hb: .14 }, { z: -1.5, w: .32, ht: .14, hb: .1 }, { z: -1.8, w: .04, ht: .03, hb: .03 }], { seg: 36 }), S.P.hull));
  const can = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), MAT.glass); can.scale.set(.3, .18, .5); can.position.set(0, .2, -.45); B.add(can);
  S.core = capOrb(S, B, 0, .26, .45, .17);
  S.engine(B, 0, 0, 1.52, .15, { len: 1.3 });
  S.sparkEm = [S.core];
}
function rayFin(S, s, pts, nBranch) {
  const g = new THREE.Group(), beads = [];
  pts.forEach((p, i) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.05 + (i === pts.length - 1 ? .03 : 0), 2), plasmaMat(S.P.glow)); b.position.copy(p); g.add(b); beads.push(b); S.sparkEm.push(b); });
  // translucent field membrane spanning root→perimeter
  const shape = new THREE.Shape(); shape.moveTo(0, 0); pts.forEach(p => shape.lineTo(p.x, p.z)); shape.lineTo(0, pts[pts.length - 1].z * .9); shape.closePath();
  const fg = new THREE.ShapeGeometry(shape, 12); fg.rotateX(Math.PI / 2); const fm = new THREE.Mesh(fg, fieldMat(S)); fm.renderOrder = 4; g.add(fm);
  const root = emitter(g, 0, 0, 0);
  const pr = []; beads.forEach((b, i) => { if (i % nBranch === 0) pr.push([root, b]); if (i) pr.push([beads[i - 1], b]); }); arcs(S, pr, S.P.glow);
  return { g, beads };
}
const STORMRAY_V = [
  { name: 'A · 전기 가오리', desc: '원반 몸체 양옆으로 전기장 막이 가오리 지느러미처럼 펼쳐져 있어요. 가장자리의 플라즈마 구슬들을 따라 번개가 가지를 치며 흘러요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const pts = [V(s * .9, 0, -.7), V(s * 1.6, .02, -.4), V(s * 2.2, .05, .1), V(s * 2.5, .08, .7), V(s * 2.1, .06, 1.1), V(s * 1.4, .03, 1.2)];
        const f = rayFin(S, s, pts.map(p => p.clone().sub(V(s * .6, 0, 0))), 2); f.g.position.x = s * .6; S.part(f.g, { cruise: [s * .6, 0, 0], boost: [s * .6, 0, .15, 0, -s * .25, 0], combat: [s * .6, 0, 0] });
        S.extras.push((sh, dt, t) => { f.g.rotation.z = s * Math.sin(t * 1.4) * (sh.mode === 'cruise' ? .1 : .04); });
        S.gun(f.beads[3], { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 60, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2) }); } },
  { name: 'B · 십자 전기장', desc: '전기장 지느러미 네 장이 X자로 펼쳐진 형태예요. 위아래 지느러미까지 번개 가지가 입체적으로 퍼져요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) for (const u of [1, -1]) { const pts = [V(s * .5, 0, -.3), V(s * 1.0, 0, -.1), V(s * 1.5, 0, .35), V(s * 1.55, 0, .9), V(s * .9, 0, 1.1)]; const f = rayFin(S, s, pts, 2); f.g.rotation.z = u * s * .55; f.g.position.set(s * .3, u * .12, 0); S.part(f.g, { cruise: [s * .3, u * .12, 0, 0, 0, u * s * .55], boost: [s * .3, u * .12, .2, 0, -s * .2, u * s * .35] }); if (u > 0) S.gun(f.beads[2], { ...bolt(S, { rate: .22 }), color: tracerC(S) }); }
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 65, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2) }); } },
  { name: 'C · 번개 꼬리', desc: '좁은 전기장 지느러미와, 뒤로 길게 늘어진 플라즈마 구슬 꼬리를 가진 형태예요. 꼬리 구슬 사이로 번개가 사슬처럼 이어지며 흔들려요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const pts = [V(s * .7, 0, -.5), V(s * 1.4, .02, -.2), V(s * 1.8, .04, .3), V(s * 1.3, .03, .7)]; const f = rayFin(S, s, pts, 2); S.part(f.g, { cruise: [0, 0, 0], boost: [0, 0, .15, 0, -s * .2, 0] }); S.gun(f.beads[2], { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      const tail = new THREE.Group(), beads = []; for (let k = 0; k < 8; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(.07 - k * .005, 2), plasmaMat(S.P.glow)); tail.add(b); beads.push(b); S.sparkEm.push(b); }
      tail.position.set(0, 0, 1.6); B.add(tail);
      S.extras.push((sh, dt, t) => beads.forEach((b, k) => b.position.set(Math.sin(t * 2 - k * .6) * .12 * k, Math.sin(t * 1.5 - k * .5) * .05 * k, k * .38)));
      arcs(S, beads.map((b, k) => [k ? beads[k - 1] : S.core, b]), S.P.glow);
      particles(S, S.sparkEm, { color: S.P.glow.clone(), size: .05, rate: 60, life: .4, vel: () => V((Math.random() - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2) }); } }
];

/* =========================================================
   🔥 FIRE — molten rock & living flame
   ========================================================= */
function cometTail(S, parent, z0, len, r, offset = V(0, 0, 0)) {
  const prof = [[r, 0], [r * 1.4, len * .15], [r * 1.9, len * .45], [r * 1.6, len * .75], [r * .6, len * .95], [0, len]];
  const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 28, 0, TAU); g.rotateX(Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i));
  const m = new THREE.Mesh(g, flameMat(S)); m.position.set(offset.x, offset.y, z0 + offset.z); m.renderOrder = 4; parent.add(m);
  S.extras.push((sh, dt, t) => { m.scale.set(1 + Math.sin(t * 7) * .04, 1 + Math.cos(t * 6) * .04, (sh.mode === sh.cfg.moving ? 1.25 : 1) * (1 + Math.sin(t * 9) * .03)); });
  return m;
}
function cinderBody(S) {
  const B = S.body;
  const head = new THREE.Mesh(rockGeo(.62, 3.3, 1, .82, 1.35, 2), S.P.hullFlat); head.position.z = -.6; B.add(head);
  const can = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), MAT.glassGold); can.scale.set(.2, .13, .38); can.position.set(0, .38, -.75); B.add(can);
  for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(rockGeo(.1 + rnd() * .08, k * 2.1, 1, 1, 2.2), S.P.hullFlat); sp.position.set((rnd() - .5) * .8, (rnd() - .3) * .5, -.3 + rnd() * .6); sp.quaternion.setFromUnitVectors(V(0, 0, 1), sp.position.clone().normalize()); B.add(sp); }
  S.emb = [emitter(B, 0, 0, .4), emitter(B, .3, .2, .2), emitter(B, -.3, .2, .2)];
  S.gun(tipAt(B, 0, 0, -1.5), { ...bolt(S, { rate: .1, r: .05 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) });
  S.extras.push((sh, dt, t) => { sh.P.hullFlat.emissiveIntensity = 1.2 + .7 * Math.sin(t * 2.4) + (sh.fire ? .5 : 0); });
}
const CINDER_V = [
  { name: 'A · 혜성', desc: '녹아내리는 운석 머리 뒤로 거대한 혜성 불꼬리가 뻗고, 양옆으로 불꽃 날개 두 장이 휘날려요. 꼬리는 무빙 때 더 길어져요.',
    build(S) { const B = S.body; cometTail(S, B, .3, 3.6, .42);
      for (const s of [1, -1]) { const w = new THREE.Group(); flameFin(S, w, [V(0, 0, 0), V(s * .9, .1, .5), V(s * 1.7, .2, 1.4), V(s * 2.1, .25, 2.4)], .32, .05, S.P.hullFlat); S.part(w, { cruise: [s * .4, 0, -.2], boost: [s * .35, 0, -.1, 0, -s * .35, 0] }); S.emb.push(emitter(w, s * 2.1, .25, 2.4)); S.gun(tipAt(w, s * .6, 0, .2), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      particles(S, S.emb, { ...emberOpts(S), rate: 80 }); } },
  { name: 'B · 분열 혜성', desc: '운석 머리 뒤로 불꼬리가 세 갈래로 갈라져 뻗는 형태예요. 갈래마다 작은 운석 파편이 달려 함께 불타요.',
    build(S) { const B = S.body;
      [[0, .1], [.75, -.05], [-.75, -.05]].forEach(([x, y], i) => { const p = V(x, y, i ? .4 : 0); cometTail(S, B, .3, i ? 2.8 : 3.3, i ? .26 : .36, p); if (i) { const rk = new THREE.Mesh(rockGeo(.22, i * 4, 1, .9, 1.2), S.P.hullFlat); rk.position.set(x, y, .35); B.add(rk); S.emb.push(emitter(B, x, y, .5)); S.gun(tipAt(B, x, y, .1), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); } });
      particles(S, S.emb, { ...emberOpts(S), rate: 85 }); } },
  { name: 'C · 궤도 파편', desc: '운석 머리 둘레를 불붙은 바위 파편들이 공전하고, 나선으로 꼬인 불꼬리 두 줄기가 뒤로 휘감겨요.',
    build(S) { const B = S.body;
      const orb = new THREE.Group(), inner = new THREE.Group(); orb.add(inner);
      for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rk = new THREE.Mesh(rockGeo(.13 + (k % 3) * .04, k * 1.9), S.P.hullFlat); rk.position.set(Math.cos(a) * 1.05, Math.sin(a) * .4, Math.sin(a) * .3 - .5); inner.add(rk); S.emb.push(emitter(inner, rk.position.x, rk.position.y, rk.position.z)); if (k % 3 === 0) S.gun(rk, { ...bolt(S, { rate: .25 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      S.part(orb, { cruise: [0, 0, 0] }, B, { cruise: [0, 0, .9], boost: [0, 0, 2.2] });
      for (const s of [1, -1]) { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = s * t * TAU * .9; pts.push(V(Math.cos(a) * .35 * (1 + t), Math.sin(a) * .35 * (1 + t), .3 + t * 3.2)); } flameFin(S, B, pts, .22, .05, S.P.hullFlat); }
      particles(S, S.emb, { ...emberOpts(S), rate: 80 }); } }
];
function magmaBody(S) {
  const B = S.body;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 3), lavaMat(S)); core.position.set(0, 0, .1); B.add(core);
  S.extras.push((sh, dt, t) => { core.rotation.y = t * .3; core.scale.setScalar(1 + Math.sin(t * 2) * .04); });
  const cock = new THREE.Mesh(rockGeo(.42, 7.7, 1, .8, 1.5, 2), S.P.hullFlat); cock.position.set(0, .15, -1.15); B.add(cock);
  const can = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), MAT.glassGold); can.scale.set(.18, .12, .32); can.position.set(0, .45, -1.25); B.add(can);
  lavaStream(S, B, [V(0, .1, -.8), V(0, .05, -.45), V(0, 0, -.15)], .07);
  S.emb = [emitter(B, 0, .45, .1)];
  S.gun(tipAt(B, 0, .1, -1.9), { ...bolt(S, { rate: .12, r: .06 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) });
  S.engine(B, 0, 0, 1.25, .2, { len: 1.5, bare: true });
  S.extras.push((sh, dt, t) => { sh.P.hullFlat.emissiveIntensity = 1.1 + .6 * Math.sin(t * 1.7) + (sh.fire ? .5 : 0); });
}
function floatRock(S, parent, x, y, z, r, seed, link) {
  const g = new THREE.Group(); const m = new THREE.Mesh(rockGeo(r, seed, 1.1, .8, 1.2, 2), S.P.hullFlat); g.add(m); g.position.set(x, y, z); parent.add(g);
  S.extras.push((sh, dt, t) => { m.position.y = Math.sin(t * 1.1 + seed) * .06; m.rotation.y = Math.sin(t * .4 + seed) * .15; });
  if (link) lavaStream(S, parent, [link.clone(), link.clone().lerp(V(x, y, z), .5).add(V(0, -.12, 0)), V(x, y, z)], .045);
  return g;
}
const MAGMA_V = [
  { name: 'A · 부유 화산', desc: '맥동하는 용암 핵 둘레에 바위 덩어리들이 떠 있고, 용암 줄기가 바위와 핵을 이어요. 양옆의 큰 바위판 날개 아래로 용암이 흘러내리고, 꼭대기 분화구에서 불씨가 솟아요.',
    build(S) { const B = S.body, c = V(0, 0, .1);
      const top = floatRock(S, B, 0, .55, .2, .35, 2.2, c); S.emb.push(emitter(top, 0, .3, 0));
      [[.55, -.2, .55, .3], [-.55, -.2, .55, .3], [0, -.35, .7, .28]].forEach(([x, y, z, r], i) => floatRock(S, B, x, y, z, r, i * 3.1 + 1, c));
      for (const s of [1, -1]) { const w = new THREE.Group(); const pl = new THREE.Mesh(rockGeo(1, s * 5, 1.3, .22, .9, 2), S.P.hullFlat); w.add(pl); lavaStream(S, w, [V(-s * .9, 0, 0), V(-s * .3, -.05, .15), V(s * .5, -.1, .2), V(s * 1.1, -.4, .3)], .05); S.part(w, { cruise: [s * 1.6, -.05, .1, 0, 0, s * .1], boost: [s * 1.55, -.05, .3, 0, -s * .25, s * .05] }); S.emb.push(emitter(w, s * 1.1, -.4, .3)); S.gun(tipAt(w, s * .3, 0, -.8), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      particles(S, S.emb, { ...emberOpts(S), rate: 70 }); } },
  { name: 'B · 용암 폭포', desc: '좌우로 길게 늘어선 바위 덩어리들을 용암 줄기가 차례로 잇고, 끝에서 용암 폭포가 아래로 쏟아지는 날개형이에요.',
    build(S) { const B = S.body, c = V(0, 0, .1);
      for (const s of [1, -1]) { let prev = c; for (let k = 0; k < 4; k++) { const x = s * (.6 + k * .55), z = .1 + k * .2, y = -.05 + k * .03; floatRock(S, B, x, y, z, .3 - k * .04, k * 2 + s, prev); prev = V(x, y, z); if (k === 3) { lavaStream(S, B, [prev, prev.clone().add(V(0, -.4, .1)), prev.clone().add(V(0, -.9, .25))], .04); S.emb.push(emitter(B, x, y - .9, z + .25)); S.gun(tipAt(B, x, y, z - .3), { ...bolt(S, { rate: .2 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); } } }
      floatRock(S, B, 0, .55, .3, .32, 9, c); S.emb.push(emitter(B, 0, .85, .3));
      particles(S, S.emb, { ...emberOpts(S), rate: 70 }); } },
  { name: 'C · 화산 고리', desc: '용암 핵 둘레를 바위 고리가 천천히 돌며, 고리의 바위마다 용암 줄기가 핵으로 이어져 있어요. 무빙 때 고리가 빨라져요.',
    build(S) { const B = S.body, ring = new THREE.Group(), inner = new THREE.Group(); ring.add(inner);
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, x = Math.cos(a) * 1.35, y = Math.sin(a) * 1.35; floatRock(S, inner, x, y, 0, .26 + (k % 2) * .06, k * 1.7, V(0, 0, 0)); S.emb.push(emitter(inner, x, y, 0)); if (k % 2 === 0) S.gun(tipAt(inner, x, y, -.2), { ...bolt(S, { rate: .25 }), color: new THREE.Color(S.P.flame[1]).multiplyScalar(2) }); }
      S.part(ring, { cruise: [0, 0, .15] }, B, { cruise: [0, 0, .3], boost: [0, 0, 1.2] });
      particles(S, S.emb, { ...emberOpts(S), rate: 70 }); } }
];

/* =========================================================
   ❄ ICE — crystal spear, iceberg, snowflake
   ========================================================= */
function frostbiteBody(S) {
  const B = S.body, im = iceMat(S);
  const spear = quartzPoint(S, 4.2, .42, im, 0); spear.rotation.y = Math.PI; spear.position.z = -.3; B.add(spear);
  const pod = new THREE.Mesh(loft([{ z: .6, w: .02, ht: .02, hb: .02 }, { z: .3, w: .16, ht: .14, hb: .14 }, { z: -.6, w: .16, ht: .15, hb: .13 }, { z: -.9, w: .02, ht: .02, hb: .02 }], { seg: 16 }), S.P.hull); pod.position.set(0, .05, -.4); pod.renderOrder = 0; B.add(pod);
  const pc = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), MAT.glass); pc.scale.set(.11, .09, .3); pc.position.set(0, .16, -.6); B.add(pc);
  const tail = lathe([[.0, -.1], [.2, -.05], [.26, .2], [.2, .35], [.12, .3]], 18, MAT.chrome); tail.position.z = 1.65; B.add(tail);
  S.engine(B, 0, 0, 1.95, .17, { len: 1.5 });
  S.snow = [emitter(B, 0, 0, 1.9)];
  S.gun(tipAt(B, 0, 0, -2.5), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
}
const FROSTBITE_V = [
  { name: 'A · 빙창', desc: '기체 전체가 하나의 거대한 얼음 결정 창이에요. 투명한 결정 안에 조종 포드가 비쳐 보이고, 양옆으로 결정 군집 날개가 뻗어 있어요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = new THREE.Group(); iceCluster(S, w, 0, 0, 0, V(s, .05, .6), 2.3, .22); S.part(w, { cruise: [s * .25, 0, -.3], boost: [s * .25, 0, -.2, 0, -s * .3, 0] }); S.snow.push(emitter(w, s * 1.8, 0, 1.0)); S.gun(tipAt(w, s * .5, 0, -.2), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'B · 설화창', desc: '얼음 창 둘레로 작은 결정 가시 여섯 개가 눈송이처럼 방사형으로 뻗어 있어요. 가시들이 천천히 회전해요.',
    build(S) { const B = S.body, g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; iceCluster(S, inner, Math.cos(a) * .2, Math.sin(a) * .2, 0, V(Math.cos(a), Math.sin(a), .35), 1.3, .12); if (k % 2 === 0) S.gun(tipAt(inner, Math.cos(a) * 1.2, Math.sin(a) * 1.2, .3), { ...bolt(S, { rate: .25 }), color: tracerC(S) }); }
      S.part(g, { cruise: [0, 0, .2], boost: [0, 0, .5, 0, 0, 0, .85] }, B, { cruise: [0, 0, .3], boost: [0, 0, 1.4] });
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'C · 쌍창', desc: '가운데 얼음 창 양옆으로 창 두 자루가 더 나란히 떠 있는 삼지창형이에요. 무빙 때 양쪽 창이 모이고, 전투 때 벌어져요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const g = new THREE.Group(); const sp = quartzPoint(S, 3.0, .26, iceMat(S), 0); sp.rotation.y = Math.PI; g.add(sp); S.wpart(g, { cruise: [s * .75, 0, .1], boost: [s * .55, 0, .3], combat: [s * 1.0, 0, -.1] }); S.gun(tipAt(g, 0, 0, -1.6), { ...bolt(S, { rate: .16 }), color: tracerC(S) }); S.snow.push(emitter(g, 0, 0, 1.4));
        iceCluster(S, B, s * .2, 0, .2, V(s, 0, .1), .6, .07); }
      particles(S, S.snow, snowOpts(S)); } }
];
function glacierBody(S) {
  const B = S.body, im = iceMat(S);
  const berg = new THREE.Mesh(rockGeo(1, 4.4, 1.0, .6, 1.9, 2), im); berg.renderOrder = 3; B.add(berg);
  const inner = new THREE.Mesh(rockGeo(.72, 4.4, 1.0, .55, 1.8, 1), S.P.hullFlat); B.add(inner);
  const cap = new THREE.Mesh(rockGeo(.95, 6.1, 1.0, .25, 1.75, 2), S.P.hullFlat); cap.position.y = .32; B.add(cap);
  const glow = new THREE.Mesh(rockGeo(.5, 1.1, 1.0, .4, 1.4, 1), glowMat(S.P.glow, .5)); glow.renderOrder = 1; B.add(glow); S.glows.push(glow);
  icicles(S, B, V(-.7, -.45, -1.0), V(.7, -.45, 1.0), 12, .5, im, V(0, -1, .2));
  const can = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), MAT.glass); can.scale.set(.22, .13, .4); can.position.set(0, .55, -1.0); B.add(can);
  S.engine(B, 0, 0, 1.9, .26, { len: 1.6 });
  S.snow = [emitter(B, 0, .6, .5), emitter(B, .6, .3, -.5), emitter(B, -.6, .3, -.5)];
  S.gun(tipAt(B, 0, 0, -2.0), { ...bolt(S, { rate: .13, r: .06, len: 1.3 }), color: tracerC(S) });
}
function floe(S, parent, x, y, z, sx, seed) {
  const g = new THREE.Group(), im = iceMat(S);
  const ice = new THREE.Mesh(rockGeo(1, seed, sx, .14, .7, 2), im); ice.renderOrder = 3; g.add(ice);
  const snow = new THREE.Mesh(rockGeo(.94, seed + 1, sx, .07, .66, 1), S.P.hullFlat); snow.position.y = .06; g.add(snow);
  icicles(S, g, V(-sx * .8, -.1, .5), V(sx * .8, -.1, .5), 7, .35, im, V(0, -1, .3));
  g.position.set(x, y, z); parent.add(g); return g;
}
const GLACIER_V = [
  { name: 'A · 빙산 요새', desc: '반투명한 빙산 덩어리 자체가 동체예요. 속에서 푸른 빛이 새어 나오고, 눈 덮인 윗면과 고드름 달린 아랫면이 있어요. 양옆에 빙판 날개가 떠 있어요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const f = floe(S, B, 0, 0, 0, 1.0, s * 3); S.part(f, { cruise: [s * 1.7, -.05, .1, 0, 0, s * .12], boost: [s * 1.6, -.05, .3, 0, -s * .25, s * .06] }); S.snow.push(emitter(f, s * .9, .1, 0)); S.gun(tipAt(f, s * .2, 0, -.7), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'B · 유빙 편대', desc: '빙산 둘레에 크고 작은 유빙 다섯 조각이 떠다니며 함께 날아요. 유빙들이 천천히 오르내려요.',
    build(S) { const B = S.body;
      [[1.6, .2, -.2, .7], [-1.6, .2, -.2, .7], [1.2, -.4, .9, .5], [-1.2, -.4, .9, .5], [0, .8, .9, .55]].forEach(([x, y, z, sx], i) => { const f = floe(S, B, x, y, z, sx, i * 2.3 + 1); S.extras.push((sh, dt, t) => { f.position.y = y + Math.sin(t * 1.1 + i) * .08; }); S.snow.push(emitter(f, 0, .1, 0)); if (i < 2) S.gun(tipAt(f, 0, 0, -.6), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); });
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'C · 빙벽', desc: '빙산 앞에 거대한 얼음 결정 벽 두 장이 비스듬히 서 있는 방패형이에요. 전투 때 벽이 열리며 사이로 쏴요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const g = new THREE.Group(); const wall = new THREE.Mesh(rockGeo(1, s * 7, .16, 1.1, .9, 2), iceMat(S)); wall.renderOrder = 3; g.add(wall); iceCluster(S, g, 0, .9, 0, V(s * .2, 1, -.2), .7, .07);
        S.wpart(g, { cruise: [s * .55, .1, -1.6, 0, s * .5, 0], boost: [s * .9, .1, -1.0, 0, s * .9, 0], combat: [s * 1.0, .1, -1.6, 0, s * .9, 0] }); S.snow.push(emitter(g, 0, .9, 0)); }
      particles(S, S.snow, snowOpts(S)); } }
];
function auroraBody(S) {
  const B = S.body;
  B.add(new THREE.Mesh(loft([{ z: .9, w: .1, ht: .1, hb: .1 }, { z: .5, w: .28, ht: .24, hb: .22 }, { z: -.3, w: .3, ht: .28, hb: .22 }, { z: -1.0, w: .14, ht: .12, hb: .1 }, { z: -1.3, w: .02, ht: .02, hb: .02 }], { seg: 28 }), S.P.hull));
  canopy(B, { y: .18, z: -.3, sx: .2, sy: .2, sz: .5 });
  S.engine(B, 0, 0, .95, .13, { len: 1.2 });
  S.snow = [emitter(B, 0, 0, .9)];
  S.gun(tipAt(B, 0, 0, -1.35), { ...bolt(S, { rate: .12 }), color: tracerC(S) });
}
function bigFlake(S, r, arms = 6) {
  const g = new THREE.Group(), im = iceMat(S);
  for (let i = 0; i < arms; i++) {
    const a = i / arms * TAU, arm = new THREE.Group(); arm.rotation.z = a;
    const sp = new THREE.Mesh(quartzGeo(r, .07, 0), im); sp.quaternion.setFromUnitVectors(V(0, 0, 1), V(1, 0, 0)); sp.position.x = r * .5; sp.renderOrder = 3; arm.add(sp);
    [.35, .6, .82].forEach((t, k) => { const L = r * (.32 - k * .08); for (const sd of [1, -1]) { const b = new THREE.Mesh(quartzGeo(L, .04, 0), im); const d = V(Math.cos(sd * .9), Math.sin(sd * .9), 0); b.quaternion.setFromUnitVectors(V(0, 0, 1), d); b.position.set(r * t, 0, 0).addScaledVector(d, L * .48); b.renderOrder = 3; arm.add(b); } });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), S._phM || (S._phM = glowMat(S.P.glow, .55))); gem.position.x = r * .55; arm.add(gem);
    g.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .2, r * .2, .1, 6), im); hub.rotation.x = Math.PI / 2; hub.renderOrder = 3; g.add(hub);
  const baked = bake(S, g);
  baked.userData.tips = [...Array(arms)].map((_, i) => { const a = i / arms * TAU; return V(Math.cos(a) * r, Math.sin(a) * r, 0); });
  return baked;
}
const AURORA_V = [
  { name: 'A · 육각 설화', desc: '조종 포드를 품은 거대한 눈송이 결정 자체가 날개예요. 여섯 갈래 끝마다 오로라 장막이 휘날리고, 결정이 천천히 회전해요.',
    build(S) { const B = S.body, f = new THREE.Group(), flake = bigFlake(S, 2.0, 6); f.add(flake);
      flake.userData.tips.forEach((p, i) => { ribbon(S, flake, p.x, p.y, p.z, 2.6, .4).rotation.x = Math.PI / 2; S.snow.push(emitter(flake, p.x, p.y, 0)); if (i === 0 || i === 3) S.gun(tipAt(flake, p.x, p.y, 0), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); });
      f.rotation.x = -Math.PI / 2;
      S.part(f, { cruise: [0, 0, 0, -Math.PI / 2, 0, 0], boost: [0, 0, .2, -Math.PI / 2 + .25, 0, 0, .9] }, B, { cruise: [0, 0, .25], boost: [0, 0, .8] });
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'B · 쌍설화', desc: '크기가 다른 눈송이 결정 두 장이 겹쳐 서로 반대로 도는 형태예요. 바깥 결정 끝에서 오로라가 흘러요.',
    build(S) { const B = S.body;
      [[2.0, 6, .45], [1.3, 6, -.8]].forEach(([r, n, sp], i) => { const f = new THREE.Group(), flake = bigFlake(S, r, n); f.add(flake); if (!i) flake.userData.tips.forEach((p, k) => { ribbon(S, flake, p.x, p.y, 0, 2.4, .35).rotation.x = Math.PI / 2; S.snow.push(emitter(flake, p.x, p.y, 0)); if (k % 3 === 0) S.gun(tipAt(flake, p.x, p.y, 0), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); });
        S.part(f, { cruise: [0, i ? .12 : 0, i ? -.2 : .1, -Math.PI / 2, i ? Math.PI / 6 : 0, 0], boost: [0, i ? .12 : 0, .3, -Math.PI / 2 + .2, 0, 0, .9] }, B, { cruise: [0, 0, sp], boost: [0, 0, sp * 2.5] }); });
      particles(S, S.snow, snowOpts(S)); } },
  { name: 'C · 수직 설화', desc: '눈송이 결정이 세로로 서서 기체 뒤에 후광처럼 펼쳐져 있어요. 양옆에 작은 결정 날개가 있고, 오로라가 위아래로 흘러내려요.',
    build(S) { const B = S.body, f = new THREE.Group(), flake = bigFlake(S, 1.7, 6); f.add(flake);
      flake.userData.tips.forEach((p, k) => { ribbon(S, flake, p.x, p.y, 0, 2.2, .35); S.snow.push(emitter(flake, p.x, p.y, 0)); });
      S.part(f, { cruise: [0, 0, .9], boost: [0, 0, 1.2, .3, 0, 0, .85] }, B, { cruise: [0, 0, .3], boost: [0, 0, 1.0] });
      for (const s of [1, -1]) { const w = new THREE.Group(); iceCluster(S, w, 0, 0, 0, V(s, 0, .2), 1.2, .1); S.part(w, { cruise: [s * .25, 0, -.2], boost: [s * .25, 0, -.1, 0, -s * .3, 0] }); S.gun(tipAt(w, s * .4, 0, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      particles(S, S.snow, snowOpts(S)); } }
];

/* =========================================================
   ⚡ THUNDERBIRD — mythic storm bird (sample at Phoenix grade)
   ========================================================= */
function elecMat(S) {
  return S._elec || (S._elec = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: S.P.glow.clone() }, uK: { value: 1 } }, ...ADD, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT,uK; uniform vec3 uC; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      vec3 sp3(vec3 x){return x-floor(x*(1./289.))*289.;} vec2 sp2(vec2 x){return x-floor(x*(1./289.))*289.;} vec3 sperm(vec3 x){return sp3(((x*34.)+1.)*x);}
      float sn2(vec2 v){ const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
        vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
        vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=sp2(i);
        vec3 p=sperm(sperm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
        vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;
        vec3 x=2.*fract(p*C.www)-1.; vec3 hh=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;
        m*=1.79284291400159-.85373472095314*(a0*a0+hh*hh);
        vec3 g; g.x=a0.x*x0.x+hh.x*x0.y; g.yz=a0.yz*x12.xz+hh.yz*x12.yw; return 130.*dot(m,g); }
      void main(){ float v=vU.y, u=vU.x;
        vec2 q=vec2(u*2.6,v*4.2-uT*2.2);
        q+=.55*vec2(sn2(q*.7+vec2(0.,uT*.4)),sn2(q*.7+vec2(5.2,-uT*.35)));
        float nn=.5+.5*(sn2(q)*.6+sn2(q*2.1+vec2(uT*1.1,0.))*.28+sn2(q*4.4-vec2(0.,uT*2.))*.12);
        float plasma=smoothstep(.52,.88,nn);
        plasma+=pow(1.-abs(sn2(q*1.4+3.)),9.)*.6;
        float spark=0.;
        for(int L=0;L<2;L++){ float fl=float(L);
          vec2 g=vec2(u*(9.+fl*5.), v*(16.+fl*8.)+uT*(5.+fl*3.));
          vec2 id=floor(g), f=fract(g)-.5;
          vec2 c=vec2(h(id+1.7+fl),h(id+4.3+fl))-.5;
          float d=length((f-c*.55)*vec2(1.,.55));
          float on=step(.86-fl*.04,h(id+fl*9.1));
          float tw=.6+.4*sin(uT*9.+h(id)*30.);
          spark+=on*smoothstep(.2,.0,d)*tw*(1.-fl*.35); }
        spark*=smoothstep(0.,.25,1.-v);
        float body=pow(1.-v,1.25);
        float rootFade=smoothstep(0.,.16,v)*smoothstep(1.,.9,v);
        float a=(body*.28+plasma*body*.75+spark*.9)*uK*rootFade;
        vec3 col=mix(uC,vec3(1.5,1.6,1.8),plasma*.35+spark*.8)*a*1.45;
        gl_FragColor=vec4(col,a); }`
  }));
}
function elecFin(S, parent, pts, w, h, coreMat) {
  const g = new THREE.Group();
  const rt = t => .12 + .88 * Math.min(1, t / .18);
  g.add(new THREE.Mesh(sweep(pts, t => ({ w: lp(w, .012, Math.pow(t, .9)) * rt(t), h: lp(h, .006, t) * rt(t), n: 2.3 }), { segs: 24, rad: 10 }), coreMat || S.P.hull));
  if (!S.fxOff) { const au = new THREE.Mesh(sweep(pts, t => ({ w: (lp(w * 1.8, .035, t) + .025) * rt(t), h: (lp(h * 3.2, .025, t) + .02) * rt(t), n: 2 }), { segs: 24, rad: 10 }), elecMat(S)); au.renderOrder = 4; g.add(au); }
  parent.add(g); return g;
}
/* zig-zag kinked feather path (lightning-shaped quill) */
function quillPts(base, dir, L, s, bend) {
  const d = dir.clone().normalize(), side = V(-d.z, 0, d.x).multiplyScalar(s), b = Math.abs(bend);
  return [base.clone(),
    base.clone().addScaledVector(d, L * .33).addScaledVector(side, b * L * .35).add(V(0, .03, 0)),
    base.clone().addScaledVector(d, L * .66).addScaledVector(side, b * L * .55).add(V(0, .035, 0)),
    base.clone().addScaledVector(d, L).addScaledVector(side, b * L * .6).add(V(0, .02, 0))];
}
function thunderWing(S, s, root, o) {
  const g = new THREE.Group(), core = new THREE.Group(), tips = [];
  const { n, len0, spread, lift, sweepB = 0, kink = .06 } = o;
  // armoured wing arm (leading-edge bone) that the quills grow from
  const arm = [V(0, 0, 0), V(s * .45, .06, .1), V(s * .85, .1 + lift * .1, .3), V(s * 1.05, .1 + lift * .2, .55)];
  core.add(new THREE.Mesh(sweep(arm, t => ({ w: lp(.16, .07, t), h: lp(.11, .05, t), n: 2.6 }), { segs: 22, rad: 12 }), S.P.trim));
  for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(quartzGeo(.16, .035), S.P.trim); const p = new THREE.CatmullRomCurve3(arm).getPointAt(.2 + k * .22); sp.position.copy(p).add(V(0, .07, 0)); sp.quaternion.setFromUnitVectors(V(0, 0, 1), V(s * .3, 1, .8).normalize()); core.add(sp); }
  // primaries (long, kinked, electric aura)
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), a = lp(spread + .25, -.25, t), L = len0 * lp(.5, 1, Math.pow(t, .75)) * (k === n - 1 ? .93 : 1);
    const base = new THREE.CatmullRomCurve3(arm).getPointAt(.12 + t * .88);
    const dir = V(s * Math.cos(a), lift * (.15 + t * .45), Math.sin(a) + sweepB);
    const pts = quillPts(base, dir, L, s, .07);
    core.add(new THREE.Mesh(sweep(pts, u => ({ w: lp(.2, .03, Math.pow(u, 1.6)), h: lp(.03, .007, u), n: 2.4 }), { segs: 22, rad: 8, up: V(0, 1, 0) }), S.P.hull));
    const shaft = new THREE.Mesh(sweep(pts, u => ({ w: lp(.025, .006, u), h: lp(.04, .008, u) }), { segs: 22, rad: 6, up: V(0, 1, 0) }), S.P.trim); shaft.position.y = .012; core.add(shaft);
    const au = new THREE.Mesh(sweep(pts, u => ({ w: lp(.3, .06, u) + .02, h: lp(.08, .02, u) + .02, n: 2 }), { segs: 22, rad: 8, up: V(0, 1, 0) }), elecMat(S)); au.renderOrder = 4; core.add(au);
    tips.push(emitter(g, pts[3].x, pts[3].y, pts[3].z));
  }
  // coverts (short overlapping upper layer)
  for (let k = 0; k < n - 2; k++) {
    const t = k / (n - 3), base = new THREE.CatmullRomCurve3(arm).getPointAt(.06 + t * .8).add(V(0, .05, .02));
    const a = lp(spread + .25, .05, t), dir = V(s * Math.cos(a), lift * (.1 + t * .3), Math.sin(a) + sweepB), L = len0 * lp(.3, .4, t);
    const pts = quillPts(base, dir, L, s, .05);
    core.add(new THREE.Mesh(sweep(pts, u => ({ w: lp(.17, .035, Math.pow(u, 1.5)), h: lp(.03, .008, u), n: 2.4 }), { segs: 12, rad: 8, up: V(0, 1, 0) }), (k % 3 === 1) ? S.P.trim : S.P.hull));
  }
  const fl = new THREE.Group(); g.add(fl); fl.add(bake(S, core)); tips.forEach(e => fl.add(e)); g.position.copy(root);
  const pr = []; for (let k = 1; k < tips.length; k++) if (k % 2) pr.push([tips[k - 1], tips[k]]);
  arcs(S, pr, S.P.glow);
  S.sparkEm.push(...tips);
  return { g, tips };
}
const TB_SECS = [{ z: 2.75, w: .012, ht: .012, hb: .012, y: .07 }, { z: 2.45, w: .05, ht: .05, hb: .045, y: .06 }, { z: 2.15, w: .1, ht: .1, hb: .09, y: .04 }, { z: 1.85, w: .17, ht: .16, hb: .14, y: .02 }, { z: 1.25, w: .36, ht: .27, hb: .26 }, { z: .55, w: .46, ht: .36, hb: .4 }, { z: -.15, w: .56, ht: .42, hb: .48 }, { z: -.7, w: .44, ht: .37, hb: .36 }, { z: -1.05, w: .26, ht: .26, hb: .22, y: .08 }, { z: -1.3, w: .21, ht: .22, hb: .18, y: .13 }];
const TB_HEAD = [{ z: -1.18, w: .19, ht: .2, hb: .16, y: .15 }, { z: -1.45, w: .27, ht: .27, hb: .2, y: .17 }, { z: -1.72, w: .25, ht: .25, hb: .17, y: .15 }, { z: -1.93, w: .17, ht: .17, hb: .12, y: .12 }, { z: -2.05, w: .1, ht: .1, hb: .07, y: .1 }, { z: -2.1, w: .03, ht: .03, hb: .03, y: .1 }];
function secAt(secs, z) {
  const a = [...secs].sort((p, q) => p.z - q.z);
  if (z <= a[0].z) return a[0]; if (z >= a[a.length - 1].z) return a[a.length - 1];
  for (let i = 0; i < a.length - 1; i++) if (z >= a[i].z && z <= a[i + 1].z) { const t = (z - a[i].z) / (a[i + 1].z - a[i].z), L = k => lp(a[i][k] || 0, a[i + 1][k] || 0, t); return { w: L('w'), ht: L('ht'), hb: L('hb'), y: L('y') }; }
}
function plumage(S, B, secs, z0, z1, rows, perRow, len, thMax = 1.95, th0 = 0, wMul = 1, trimEvery = 5) {
  const g = new THREE.Group();
  for (let r = 0; r < rows; r++) {
    const z = lp(z0, z1, r / Math.max(1, rows - 1)), sc = secAt(secs, z), off = (r % 2) * .5;
    const sz = Math.max(.4, Math.min(1.15, (sc.w + sc.ht) * 1.35));
    for (let k = 0; k < perRow; k++) {
      const th = th0 + lp(-thMax, thMax, (k + off) / perRow);
      const c = Math.cos(th), sn = Math.sin(th), hh = c >= 0 ? sc.ht : sc.hb;
      const P = V(sc.w * sn * .99, (sc.y || 0) + hh * c * .99, z), N = V(sn / Math.max(sc.w, .05), c / Math.max(hh, .05), 0).normalize();
      const L = len * sz * (.88 + rnd() * .24), d = V(0, 0, 1).addScaledVector(N, .22).normalize();
      const pts = [P, P.clone().addScaledVector(d, L * .5).addScaledVector(N, .025), P.clone().addScaledVector(d, L).addScaledVector(N, .01)];
      g.add(new THREE.Mesh(sweep(pts, u => ({ w: lp(.08, .013, Math.pow(u, 1.4)) * sz * wMul, h: lp(.014, .004, u), n: 2.4 }), { segs: 6, rad: 6, up: N }), S.elecBody ? ((r + k) % trimEvery === 0 ? S.P.trim : elecMat(S)) : ((r + k) % trimEvery === 0 ? S.P.trim : S.P.hull)));
    }
  }
  B.add(bake(S, g));
}
function arch(S, g, pts, w, h, archK, mat) { g.add(new THREE.Mesh(sweep(pts, t => ({ w: typeof w === 'function' ? w(t) : w, h, arch: archK, n: 2.6 }), { segs: 14, rad: 14 }), mat)); }
function tbDress(S) {
  const B = S.body, T = S.P.hull, A = S.P.trim, g = new THREE.Group();
  // feathered skin: back/flanks, dense neck, armoured breast
  plumage(S, B, TB_SECS, -1.0, 1.8, 14, 13, .32);
  plumage(S, B, TB_SECS, -1.3, -.75, 4, 14, .3, 2.6, 0, 1.15, 3);
  plumage(S, B, TB_SECS, -.85, .7, 7, 7, .36, .75, Math.PI, 1.6, 2);
  plumage(S, B, TB_HEAD, -1.72, -1.2, 4, 9, .2, 1.5, 0, .9, 4);
  // dorsal saddle armour around the canopy with graded spine spikes
  if (!S.elecBody) for (let k = 0; k < 3; k++) { const z = -.05 + k * .38, sc = secAt(TB_SECS, z); arch(S, g, [V(0, sc.ht + .04, z - .16), V(0, sc.ht + .07, z), V(0, sc.ht + .05, z + .18)], t => sc.w * 1.05 * (1 - Math.abs(t - .5) * .4), .03, .11, k === 1 ? T : A); }
  if (!S.elecBody) for (let k = 0; k < 9; k++) { const z = lp(-.1, 1.65, k / 8), sc = secAt(TB_SECS, z), L = lp(.3, .13, k / 8); const sp = new THREE.Mesh(quartzGeo(L, .045), A); sp.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, 1, .9).normalize()); sp.position.set(0, (sc.y || 0) + sc.ht + .07 + L * .22, z); g.add(sp); }
  // layered pauldrons + shoulder horns
  if (!S.elecBody) for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) { const hg = V(s * (.36 + k * .05), .3 - k * .05, -.55 + k * .2); arch(S, g, [hg, hg.clone().add(V(s * .13, .03, .25)), hg.clone().add(V(s * .19, -.03, .55))], t => lp(.22 - k * .03, .07, t), .032, .07, k === 1 ? T : A); }
    const sp = new THREE.Mesh(quartzGeo(.34, .055), A); sp.quaternion.setFromUnitVectors(V(0, 0, 1), V(s * .7, .85, .55).normalize()); sp.position.set(s * .5, .44, -.42); g.add(sp);
  }
  // flank vents (recessed slots with inner glow)
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) { const z = .35 + k * .22, sc = secAt(TB_SECS, z);
    const gl = new THREE.Mesh(sweep([V(s * sc.w * .97, .1, z + .05), V(s * sc.w * .99, 0, z + .08), V(s * sc.w * .97, -.1, z + .11)], () => ({ w: .012, h: .012 }), { segs: 8, rad: 6, up: V(s, 0, 0) }), S._ventM || (S._ventM = glowMat(S.P.glow, .9))); g.add(gl); S.glows.push(gl); }
  // storm heart gripped by six rib-claws under the breast
  const hc = V(0, -.42, -.3);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, d = V(Math.cos(a), Math.sin(a) * .8, 0);
    g.add(new THREE.Mesh(sweep([hc.clone().add(V(d.x * .08, .2, d.y * .1 - .05)), hc.clone().add(V(d.x * .24, d.y * .16 + .06, -.02)), hc.clone().add(V(d.x * .2, d.y * .2 - .04, -.18)), hc.clone().add(V(d.x * .1, d.y * .1 - .06, -.26))], t => ({ w: lp(.04, .01, t), h: lp(.03, .008, t) }), { segs: 12, rad: 8, up: V(0, 0, 1) }), A)); }
  // tail-root coverts fan
  for (let k = 0; k < 9; k++) { const a = (k - 4) * .2, base = V(Math.sin(a) * .12, .1, 1.6), d = V(Math.sin(a) * .8, .12, 1).normalize(); g.add(new THREE.Mesh(sweep([base, base.clone().addScaledVector(d, .27).add(V(0, .03, 0)), base.clone().addScaledVector(d, .52)], u => ({ w: lp(.11, .02, u), h: lp(.02, .005, u) }), { segs: 8, rad: 6, up: V(0, 1, 0) }), k % 2 ? T : A)); }
  // armoured collar ring at the neck
  if (!S.elecBody) for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, c0 = V(Math.cos(a) * .3, Math.sin(a) * .28 + .1, -1.02); const d = V(Math.cos(a), Math.sin(a), 0); g.add(new THREE.Mesh(sweep([c0.clone().addScaledVector(d, -.02), c0.clone().addScaledVector(d, .03).add(V(0, 0, .08)), c0.clone().addScaledVector(d, .05).add(V(0, 0, .2))], t => ({ w: lp(.09, .03, t), h: lp(.025, .008, t), arch: .02, n: 2.4 }), { segs: 8, rad: 10, up: d }), A)); }
  B.add(bake(S, g));
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.05, 0), plasmaMat(S.P.glow)); gem.position.set(0, -.2, -1.05); B.add(gem);
}
function tbHead(S) {
  const B = S.body, T = S.P.hull, A = S.P.trim, g = new THREE.Group();
  if (S.elecBody) { const hk = new THREE.Mesh(loft(TB_HEAD, { seg: 36 }), plasmaSkin(S)); hk.renderOrder = 5; B.add(hk); B.add(new THREE.Mesh(loft(TB_HEAD.map(q => ({ ...q, w: q.w * .6, ht: q.ht * .6, hb: q.hb * .6 })), { seg: 20 }), S._darkCore)); } else B.add(new THREE.Mesh(loft(TB_HEAD, { seg: 30 }), T));
  // helmet: three overlapping arched plates and a central ridge
  if (!S.elecBody) [[-1.85, -1.55, .2], [-1.62, -1.32, .23], [-1.4, -1.1, .21]].forEach(([z0, z1, w], k) => { const sc = secAt(TB_HEAD, (z0 + z1) / 2); arch(S, g, [V(0, (sc.y || 0) + sc.ht + .02, z0), V(0, (sc.y || 0) + sc.ht + .045, (z0 + z1) / 2), V(0, (sc.y || 0) + sc.ht + .03, z1 + .05)], t => w * (1 - Math.abs(t - .5) * .5), .028, .12, k === 1 ? T : A); });
  if (!S.elecBody) g.add(new THREE.Mesh(sweep([V(0, .45, -1.9), V(0, .5, -1.6), V(0, .48, -1.3), V(0, .4, -1.05)], t => ({ w: .022, h: lp(.03, .05, t), n: 2.6 }), { segs: 14, rad: 8 }), A));
  // cere + nostril at the beak root
  arch(S, g, [V(0, .2, -2.02), V(0, .22, -1.9), V(0, .24, -1.78)], .1, .025, .05, A);
  for (const s of [1, -1]) { const ns = new THREE.Mesh(sweep([V(s * .06, .2, -1.97), V(s * .07, .2, -1.9)], () => ({ w: .012, h: .008 }), { segs: 3, rad: 6 }), MAT.intake); g.add(ns); }
  // hooked upper beak with ridge, lower mandible slightly open with a glowing maw
  g.add(new THREE.Mesh(sweep([V(0, .16, -1.95), V(0, .13, -2.25), V(0, .04, -2.52), V(0, -.08, -2.62), V(0, -.13, -2.56)], t => ({ w: lp(.12, .012, Math.pow(t, .9)), h: lp(.085, .012, t), n: 1.9 }), { segs: 22, rad: 12 }), A));
  g.add(new THREE.Mesh(sweep([V(0, .22, -1.95), V(0, .2, -2.25), V(0, .1, -2.5)], t => ({ w: .02, h: lp(.02, .008, t) }), { segs: 12, rad: 6 }), T));
  g.add(new THREE.Mesh(sweep([V(0, .0, -1.86), V(0, -.06, -2.12), V(0, -.1, -2.32)], t => ({ w: lp(.1, .02, t), h: lp(.04, .01, t), n: 2 }), { segs: 14, rad: 10 }), A));
  const maw = new THREE.Mesh(sweep([V(0, .05, -1.9), V(0, .02, -2.12), V(0, -.02, -2.3)], t => ({ w: lp(.07, .015, t), h: .012 }), { segs: 10, rad: 8 }), S._ventM || (S._ventM = glowMat(S.P.glow, .9))); g.add(maw); S.glows.push(maw);
  for (const s of [1, -1]) {
    const ep = V(s * .23, .24, -1.62);
    const ring = ext(frame(polyPts(14, .075), polyPts(14, .052)), .03, A, .006); ring.position.copy(ep); ring.lookAt(ep.clone().add(V(s, .1, -.25))); g.add(ring);
    if (!S.elecBody) arch(S, g, [V(s * .1, .36, -1.82), V(s * .22, .37, -1.66), V(s * .3, .35, -1.45), V(s * .33, .3, -1.25)], t => lp(.06, .03, t), .03, .02, A);
    if (!S.elecBody) arch(S, g, [V(s * .13, .1, -1.9), V(s * .25, .12, -1.65), V(s * .3, .1, -1.35)], t => lp(.04, .07, t), .022, .02, A);
    const tuft = quillPts(V(s * .22, .38, -1.4), V(s * .5, .5, 1), .5, s, .05); elecFin(S, B, tuft, .05, .015, A);
  }
  B.add(bake(S, g));
  for (const s of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(.05, 2), plasmaMat(S.P.glow)); eye.scale.set(1, .75, 1.25); eye.position.set(s * .235, .245, -1.63); B.add(eye);
    elecFin(S, B, [V(s * .26, .23, -1.58), V(s * .32, .22, -1.4), V(s * .36, .18, -1.18), V(s * .37, .14, -.98)], .02, .006, A);
  }
}
function plasmaSkin(S) {
  return S._pskin || (S._pskin = new THREE.ShaderMaterial({
    uniforms: { uT: PRISM_U.uT, uC: { value: S.P.glow.clone() }, uK: { value: 1 } }, ...ADD, side: THREE.FrontSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vP=position; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uT,uK; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      vec3 m3(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 m4(vec4 x){return x-floor(x*(1./289.))*289.;} vec4 pm(vec4 x){return m4(((x*34.)+1.)*x);} vec4 ti(vec4 r){return 1.79284291400159-.85373472095314*r;}
      float sn3(vec3 v){ const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
        vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=m3(i);
        vec4 p=pm(pm(pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
        float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
        vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
        vec4 nr=ti(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w;
        vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
        return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
      void main(){
        float f=1.-abs(dot(normalize(vN),normalize(vV)));
        vec3 q=vP*2.4+vec3(0.,0.,uT*1.3);
        q+=.5*vec3(sn3(q*.6+vec3(uT*.3,0.,0.)),sn3(q*.6+vec3(4.1,uT*.25,0.)),sn3(q*.6+vec3(0.,7.3,-uT*.3)));
        float n=.5+.5*(sn3(q)*.58+sn3(q*2.1-vec3(uT*1.1,uT*.7,0.))*.28+sn3(q*4.4+vec3(0.,uT*1.8,0.))*.14);
        float plasma=smoothstep(.5,.86,n);
        float veins=pow(1.-abs(n*2.-1.),12.);
        float flick=.85+.15*sin(uT*31.+vP.z*7.);
        float a=(.1+pow(f,2.)*.85+plasma*.55+veins*.5)*uK*flick;
        vec3 col=mix(uC,vec3(1.5,1.6,1.8),plasma*.45+veins*.6+pow(f,5.)*.4)*a*1.35;
        gl_FragColor=vec4(col,a); }`
  }));
}
function thunderbirdBody(S) {
  const B = S.body, H = S.P.hull;
  S.sparkEm = [];
  if (S.elecBody) {
    const sk = new THREE.Mesh(loft(TB_SECS, { seg: 40 }), plasmaSkin(S)); sk.renderOrder = 5; B.add(sk);
    const core = new THREE.Mesh(loft(TB_SECS.map(q => ({ ...q, w: q.w * .62, ht: q.ht * .6, hb: q.hb * .6 })), { seg: 24 }), S._darkCore || (S._darkCore = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.P.d.base).multiplyScalar(.25), metalness: .3, roughness: .4 }))); B.add(core);
    for (let k = 0; k < 6; k++) { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(.07 + (k % 2) * .03, 2), plasmaMat(S.P.glow)); o.position.set(0, .05, lp(-1.0, 1.4, k / 5)); B.add(o); S.sparkEm.push(o); }
  } else B.add(new THREE.Mesh(loft(TB_SECS, { seg: 32 }), H));
  tbHead(S); tbDress(S);
  if (S.elecBody) {
    const pts = []; for (let k = 0; k < 16; k++) { const z = lp(-1.6, 1.6, rnd()), th = (rnd() - .5) * 3.6, sc = z < -1.15 ? secAt(TB_HEAD, z) : secAt(TB_SECS, z), c = Math.cos(th), hh = c >= 0 ? sc.ht : sc.hb; pts.push(emitter(B, sc.w * Math.sin(th) * 1.02, (sc.y || 0) + hh * c * 1.02, z)); }
    pts.sort((a, b) => a.position.z - b.position.z);
    const pr = []; for (let k = 0; k < pts.length - 1; k++) if (k % 2 === 0 || rnd() < .4) pr.push([pts[k], pts[k + 1]]);
    arcs(S, pr, S.P.glow); S.sparkEm.push(...pts);
    for (const [x, y] of [[0, .1], [-.18, .08], [.18, .08]]) { const st = new THREE.Mesh(sweep([V(0, .05, 1.3), V(x * .5, y, 2.0), V(x, y + .03, 2.7), V(x * 1.3, y + .06, 3.3)], t => ({ w: lp(.15, .015, Math.pow(t, .8)), h: lp(.13, .015, Math.pow(t, .8)) }), { segs: 24, rad: 12 }), plasmaSkin(S)); st.renderOrder = 5; B.add(st); }
  }
  { const gm = crystalMat(S, .3); const gem = quartzPoint(S, .75, .17, gm, 0); gem.rotation.set(-Math.PI / 2 + .25, 0, 0); gem.scale.set(1, 1, 1); gem.position.set(0, .46, -.45); gem.rotation.x = Math.PI + .2; B.add(gem); }
  // lightning crest
  const crest = [];
  for (let k = 0; k < 5; k++) { const a = (k - 2) * .18, p = quillPts(V(Math.sin(a) * .1, .42, -1.3 + Math.abs(k - 2) * .06), V(Math.sin(a) * .6, .5, 1), .95 - Math.abs(k - 2) * .14, 1, .02); elecFin(S, B, p, .06, .02, S.P.trim); crest.push(emitter(B, p[3].x, p[3].y, p[3].z)); }
  arcs(S, [[crest[0], crest[2]], [crest[2], crest[4]]], S.P.glow);
  // double neck ruff
  for (const [rz, rr, n, L] of [[-1.0, .3, 10, .45], [-.82, .4, 12, .4]]) for (let k = 0; k < n; k++) { const a = k / n * TAU, d = V(Math.cos(a) * .9, Math.sin(a) * .9, 1); const b = V(Math.cos(a) * rr, Math.sin(a) * rr * .95 + .08, rz); elecFin(S, B, [b, b.clone().addScaledVector(d.clone().normalize(), L * .5), b.clone().addScaledVector(d.clone().normalize(), L)], .06, .015, S.P.trim); }
  S.heart = capOrb(S, B, 0, -.42, -.3, .15);
  S.extras.push((sh, dt, t) => { sh._elec && (sh._elec.uniforms.uK.value = sh.fire ? 1.4 : 1); });
  S.engine(B, 0, 0, 2.0, .14, { len: 1.2, bare: true });
  S.gun(tipAt(B, 0, -.08, -2.66), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
  S.sparkEm.push(...crest, S.heart);
}

function tbTail(S, B, list) {
  const tips = [];
  list.forEach(([x, y, L, spread, kink]) => { const p = quillPts(V(x * .2, .05, 1.75), V(x * spread, y, 1), L, x >= 0 ? 1 : -1, kink); elecFin(S, B, p, .14, .03); tips.push(emitter(B, p[3].x, p[3].y, p[3].z)); });
  const pr = []; for (let i = 1; i < tips.length; i++) pr.push([tips[i - 1], tips[i]]); arcs(S, pr, S.P.glow);
  S.sparkEm.push(...tips); return tips;
}
function tbFlap(S, w, s, amp = .14, sp = 1.5) { S.extras.push((sh, dt, t) => { w.children[0].rotation.z = s * Math.sin(t * sp) * (sh.mode === 'cruise' ? amp : amp * .35); }); }
const sparkOpts = S => ({ color: S.P.glow.clone().lerp(new THREE.Color(2, 2, 2.2), .3), size: .05, rate: 70, life: .4, vel: () => V((Math.random() - .5) * 2.4, (Math.random() - .3) * 2.4, (Math.random() - .5) * 2.4) });
const THUNDERBIRD_V = [
  { name: 'A · 폭풍 날개', desc: '지그재그로 꺾인 번개 깃털 8장과 그 위를 덮는 짧은 덮깃이 겹친 거대한 날개예요. 깃털 끝을 따라 번개가 기어 다니고, 날갯짓할 때마다 불티가 튀어요. 꼬리는 번개 깃 3가닥이에요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = thunderWing(S, s, V(s * .3, .08, -.35), { n: 8, len0: 2.5, spread: .95, lift: .35 }); S.part(w.g, { cruise: [s * .3, .08, -.35], boost: [s * .3, .08, -.25, 0, -s * .55, 0] }); tbFlap(S, w.g, s); S.gun(tipAt(w.g, s * .7, .05, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      tbTail(S, B, [[-1, .15, 2.2, .35, .07], [0, .1, 2.6, 0, .06], [1, .15, 2.2, .35, .07]]);
      particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'B · 뇌전 V익', desc: '깃털 날개가 V자로 높이 솟구친 형태예요. 꼬리는 부채처럼 펼친 번개 깃 5가닥이고, 깃 끝끼리 아크로 이어져 전기 부채를 이뤄요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) { const w = thunderWing(S, s, V(s * .28, .14, -.3), { n: 7, len0: 2.3, spread: .55, lift: 1.8, sweepB: .2, kink: .07 }); S.part(w.g, { cruise: [s * .28, .14, -.3, 0, 0, s * .12], boost: [s * .28, .14, -.2, 0, -s * .45, s * .05] }); tbFlap(S, w.g, s, .1, 1.3); S.gun(tipAt(w.g, s * .6, .1, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      tbTail(S, B, [-2, -1, 0, 1, 2].map(k => [k * .5, .1 + Math.abs(k) * .04, 1.9 - Math.abs(k) * .12, .5, .05]));
      particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'C · 사익 뇌조', desc: '크고 작은 번개 날개 두 쌍을 위아래로 단 형태예요. 아래 날개는 위 날개와 엇박자로 날갯짓하고, 꼬리는 한 가닥 긴 번개 깃이 꿈틀대요.',
    build(S) { const B = S.body;
      for (const s of [1, -1]) {
        const up = thunderWing(S, s, V(s * .3, .12, -.4), { n: 7, len0: 2.3, spread: .8, lift: .5 }); S.part(up.g, { cruise: [s * .3, .12, -.4], boost: [s * .3, .12, -.3, 0, -s * .5, 0] }); tbFlap(S, up.g, s, .14, 1.5);
        const lo = thunderWing(S, s, V(s * .25, -.12, .35), { n: 5, len0: 1.5, spread: 1.0, lift: -.3, sweepB: .3 }); S.part(lo.g, { cruise: [s * .25, -.12, .35, 0, 0, -s * .1], boost: [s * .25, -.12, .45, 0, -s * .55, -s * .05] });
        S.extras.push((sh, dt, t) => { lo.g.children[0].rotation.z = -s * Math.sin(t * 1.5 + 1.4) * (sh.mode === 'cruise' ? .12 : .04); });
        S.gun(tipAt(up.g, s * .6, .05, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) });
      }
      const tail = new THREE.Group(); B.add(tail); tail.position.set(0, .05, 1.7);
      const p = []; for (let i = 0; i <= 6; i++) p.push(V(Math.sin(i * .7) * .07, i * .03, i * .5));
      elecFin(S, tail, p, .16, .035); const tt = emitter(tail, p[6].x, p[6].y, p[6].z); S.sparkEm.push(tt);
      S.extras.push((sh, dt, t) => { tail.rotation.y = Math.sin(t * 1.3) * .15; tail.rotation.x = Math.sin(t * .9) * .06; });
      arcs(S, [[S.heart, tt]], S.P.glow);
      particles(S, S.sparkEm, sparkOpts(S)); } }
];

PAINTS3.frosteagle = [TP('빙하', '#0c2236', '#5ab8ff', '#cdeeff', [.4, 1.2, 2.6], [0xffffff, 0x5ab8ff]), TP('서리', '#3a4656', '#e8f2ff', '#ffffff', [1.8, 2, 2.4], [0xffffff, 0xcfe6ff]), TP('극광', '#062a2a', '#3ff0d0', '#c8fff2', [.3, 2.2, 1.9], [0xffffff, 0x3ff0d0]), { ...TPR(), pv: 1 }];
PAINTS3.blazeeagle = [TP('인페르노', '#2a0c04', '#ff7a1a', '#ffd070', [2.8, 1.2, .3], [0xffe0a0, 0xff6010]), TP('청염', '#060c22', '#3a9aff', '#bfe4ff', [.5, 1.4, 2.8], [0xffffff, 0x3a8aff]), TP('흑염', '#0a0410', '#b040ff', '#f0c0ff', [1.9, .6, 2.6], [0xffd8ff, 0xa030ff]), { ...TPR(), pv: 1 }];
PAINTS3.thunderbird = PAINTS3.volt; NUM3.thunderbird = '01'; PAINTS3.thunderbird_e = [PAINTS3.volt[0], PAINTS3.volt[1], { ...TP('골드', '#3a2c10', '#ffc040', '#ffe6a0', [2.6, 1.55, .4], [0xfff0c0, 0xffa020]), gold: true }, TPR()];   /* thunderbird Λ only: gold replaces white volt */
/* =========================================================
   ⚡ THUNDERBIRD Λ — a living mass of lightning (no armour, no machinery)
   ========================================================= */
// wing whose bones and feathers are lightning bolts, with a faint plasma vane between them
function spiritWing(S, s, root, o) {
  const { n, len0, spread, lift, sweepB = 0 } = o, g = new THREE.Group(), fl = new THREE.Group(), core = new THREE.Group(), tips = [];
  const hr = (a, b) => { const v = Math.sin(a * 53.1 + b * 17.9 + s * 3.3) * 43758.5; return v - Math.floor(v); };
  const jag = (a, b, m, amp, sd) => { const out = [a.clone()], d = V().subVectors(b, a); for (let i = 1; i < m; i++) out.push(a.clone().addScaledVector(d, i / m).add(V((hr(i, sd) - .5) * 2 * amp, (hr(i, sd + 1) - .5) * amp, (hr(i, sd + 2) - .5) * 2 * amp))); out.push(b.clone()); return out; };
  const armEnd = V(s * 1.05, .1 + lift * .2, .5), arm = jag(V(0, 0, 0), armEnd, 5, .05, 7);
  boltHorn(S, core, arm, .055, .03);
  const armC = new THREE.CatmullRomCurve3(arm), vaneM = S._vaneM || (S._vaneM = elecMat(S));
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1), a = lp(spread + .25, -.25, t), L = len0 * lp(.5, 1, Math.pow(t, .75));
    const base = armC.getPointAt(.1 + t * .9), dir = V(s * Math.cos(a), lift * (.15 + t * .45), Math.sin(a) + sweepB).normalize();
    const end = base.clone().addScaledVector(dir, L), pts = jag(base, end, 6, .06 + L * .025, k * 11);
    boltHorn(S, core, pts, .034, .004);
    // one fork per feather
    const kb = 2 + (k % 3), fd = dir.clone().add(V(0, .15, .35 * (k % 2 ? 1 : -1))).normalize();
    boltHorn(S, core, jag(pts[kb], pts[kb].clone().addScaledVector(fd, L * .32), 3, .04, k * 7 + 3), .018, .003);
    // faint plasma vane so the wing still reads as a wing
    const vane = new THREE.Mesh(sweep([base, base.clone().lerp(end, .5), end], u => ({ w: lp(.16, .03, Math.pow(u, 1.3)), h: .008, n: 2 }), { segs: 12, rad: 6, up: V(0, 1, 0) }), vaneM); vane.renderOrder = 3; core.add(vane);
    tips.push(emitter(fl, end.x, end.y, end.z));
  }
  fl.add(bake(S, core)); g.add(fl); g.position.copy(root);
  const pr = []; for (let k = 1; k < tips.length; k += 2) pr.push([tips[k - 1], tips[k]]);
  arcs(S, pr, S.P.glow, { force: true, w: .45, fl: .5, p: .35, pf: .6 });
  S.sparkEm.push(...tips);
  return { g, tips };
}
function tbSpirit(S) {
  const B = S.body; S.sparkEm = [];
  // calmer bolt colours on this creature so the silhouette isn't washed out white
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  S._boltCore = new THREE.MeshBasicMaterial({ color: gl.clone().lerp(new THREE.Color(1, 1, 1), .45).multiplyScalar(1.3), toneMapped: false });
  S._boltBody = glowMat(gl.clone().multiplyScalar(.85), .8); S._boltHalo = glowMat(gl.clone().multiplyScalar(.5), .14);
  const ps = plasmaSkin(S); ps.fragmentShader = ps.fragmentShader.replace('plasma*.45+veins*.6+pow(f,5.)*.4', 'plasma*.2+veins*.35+pow(f,5.)*.25');
  // body + head: churning plasma shell around a dark storm core (gives a readable silhouette)
  const coreM = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.P.d.base).multiplyScalar(.3), emissive: gl.clone().multiplyScalar(.12), metalness: .2, roughness: .5 });
  for (const secs of [TB_SECS, TB_HEAD]) {
    const sk = new THREE.Mesh(loft(secs, { seg: 40 }), ps); sk.renderOrder = 5; B.add(sk);
    B.add(new THREE.Mesh(loft(secs.map(q => ({ ...q, w: q.w * .6, ht: q.ht * .58, hb: q.hb * .58 })), { seg: 24 }), coreM));
  }
  S.extras.push((sh) => { ps.uniforms.uK.value = sh.fire ? 1.25 : .9; });
  const bg = new THREE.Group();
  // beak drawn as two hooked bolts, eyes as hot plasma points
  boltHorn(S, bg, [V(0, .2, -1.98), V(.01, .19, -2.18), V(0, .14, -2.36), V(0, .05, -2.5), V(0, -.03, -2.44)], .05, .012);
  boltHorn(S, bg, [V(0, .03, -1.98), V(.01, .01, -2.16), V(0, -.02, -2.3)], .035, .01);
  for (const s of [1, -1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(gl, .3).multiplyScalar(1.6), toneMapped: false })); e.scale.set(1.3, .7, 1); e.position.set(s * .17, .25, -1.75); B.add(e);
    const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: gl.clone().multiplyScalar(.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); eg.scale.setScalar(.28); eg.position.copy(e.position); B.add(eg);
    // brow bolts sweeping back over the eyes
    boltHorn(S, bg, zig(V(s * .1, .34, -1.9), V(s * .3, .5, -1.25), 4, .03, s, 2), .03, .005);
  }
  // crest: lightning horns raking back from the crown
  for (let k = 0; k < 5; k++) { const a = (k - 2) * .2, b = V(Math.sin(a) * .1, .42, -1.32 + Math.abs(k - 2) * .06); boltHorn(S, bg, zig(b, b.clone().add(V(Math.sin(a) * .55, .55 - Math.abs(k - 2) * .1, .95 - Math.abs(k - 2) * .15)), 5, .05, 1, k * 2.1), .04, .005); }
  // double ruff of bolts around the neck
  for (const [rz, rr, n, L] of [[-1.0, .3, 10, .5], [-.8, .4, 12, .42]]) for (let k = 0; k < n; k++) { const a = k / n * TAU, d = V(Math.cos(a) * .9, Math.sin(a) * .9, 1).normalize(), b = V(Math.cos(a) * rr, Math.sin(a) * rr * .95 + .08, rz); boltHorn(S, bg, zig(b, b.clone().addScaledVector(d, L), 3, .04, 1, k + rz * 9), .028, .004); }
  B.add(bake(S, bg));
  // heart: a lightning pearl crackling inside the chest
  S.heart = dragonPearl(S, B, V(0, -.02, -.35), .16, 7);
  // thin crackling arcs crawling over the plasma body
  const pairs = []; for (let i = 0; i < 8; i++) pairs.push([emitter(B, 0, 0, 0), emitter(B, 0, 0, 0)]);
  const onSkin = (o, z, th, lift) => { const sc = z < -1.15 ? secAt(TB_HEAD, z) : secAt(TB_SECS, z), c = Math.cos(th), hh = c >= 0 ? sc.ht : sc.hb; o.position.set(sc.w * Math.sin(th) * (1.02 + lift), (sc.y || 0) + hh * c * (1.02 + lift), z); };
  arcs(S, pairs, S.P.glow, { force: true, w: .4, fl: .5, p: .45, pf: .75, onStrike: i => { const z = lp(-1.9, 2.3, Math.random()), th = (Math.random() - .5) * 5.5, air = Math.random() < .3; onSkin(pairs[i][0], z, th, 0); onSkin(pairs[i][1], z + (Math.random() - .5) * .7, th + (Math.random() - .5) * 1.6, air ? 1.5 + Math.random() * 2 : 0); } });
  S.gun(tipAt(B, 0, .05, -2.52), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
}
// tail: flickering lightning strands streaming from the rump
function tbBoltTail(S, n, len, spread) {
  const B = S.body, hr = (a, b) => { const v = Math.sin(a * 78.23 + b * 19.17) * 43758.5; return v - Math.floor(v); };
  const path = (a, b, m, amp, sd) => { const out = [a.clone()], d = V().subVectors(b, a); for (let i = 1; i < m; i++) out.push(a.clone().addScaledVector(d, i / m).add(V((hr(i, sd + 1) - .5) * 2 * amp, (hr(i, sd + 2) - .5) * 2 * amp, 0))); out.push(b.clone()); return out; };
  const holder = new THREE.Group(); holder.position.set(0, .07, 2.4); B.add(holder); const vars = [];
  for (let v = 0; v < 3; v++) { const g = new THREE.Group(); for (let b = 0; b < n; b++) { const ang = (b - (n - 1) / 2) * spread + (hr(b, v * 13 + 3) - .5) * .15, L = len * (b === (n - 1) / 2 ? 1 : .75 + hr(b, v + 6) * .2); boltHorn(S, g, path(V(0, 0, -.1), V(Math.sin(ang) * L, (hr(b, v * 7 + 4) - .4) * .25 * L, Math.cos(ang) * L), 8, .07, v * 13 + b * 11), .032, .003); } const bgp = bake(S, g); bgp.visible = !v; holder.add(bgp); vars.push(bgp); }
  let cur = 0, tk = .1; S.extras.push((sh, dt, t) => { holder.rotation.y = Math.sin(t * 1.2) * .1; tk -= dt; if (tk < 0) { vars[cur].visible = false; cur = (cur + 1 + Math.floor(Math.random() * 2)) % 3; vars[cur].visible = true; tk = .06 + Math.random() * (sh.fire ? .12 : .28); } });
}
const TBL_V = [
  { name: 'A · 폭풍 날개', desc: '몸 전체가 소용돌이치는 플라즈마 덩어리이고, 가슴 속 번개 구슬이 심장처럼 번쩍여요. 날개뼈와 깃털 9장이 모두 갈라지는 번개 줄기이고, 그 사이를 옅은 전기막이 이어요. 부리·볏·목 갈기도 번개, 꼬리는 깜빡이는 번개 세 가닥이에요.',
    build(S) { for (const s of [1, -1]) { const w = spiritWing(S, s, V(s * .3, .08, -.35), { n: 9, len0: 2.6, spread: .95, lift: .35 }); S.part(w.g, { cruise: [s * .3, .08, -.35], boost: [s * .3, .08, -.25, 0, -s * .55, 0] }); tbFlap(S, w.g, s); S.gun(tipAt(w.g, s * .6, .05, .1), { ...bolt(S, { rate: .22 }), color: tracerC(S) }); }
      tbBoltTail(S, 3, 2.2, .35); particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'B · 뇌전 V익', desc: '번개 날개가 V자로 높이 솟구친 형태예요. 꼬리는 부채처럼 펼친 번개 다섯 가닥이에요.',
    build(S) { for (const s of [1, -1]) { const w = spiritWing(S, s, V(s * .28, .14, -.3), { n: 8, len0: 2.4, spread: .55, lift: 1.8, sweepB: .2 }); S.part(w.g, { cruise: [s * .28, .14, -.3, 0, 0, s * .12], boost: [s * .28, .14, -.2, 0, -s * .45, s * .05] }); tbFlap(S, w.g, s, .1, 1.3); S.gun(tipAt(w.g, s * .5, .3, .1), { ...bolt(S, { rate: .22 }), color: tracerC(S) }); }
      tbBoltTail(S, 5, 1.9, .3); particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'C · 사익 뇌조', desc: '크고 작은 번개 날개 두 쌍이 위아래로 엇박자 날갯짓을 해요. 꼬리는 길게 꿈틀대는 번개 한 가닥이에요.',
    build(S) { for (const s of [1, -1]) {
        const up = spiritWing(S, s, V(s * .3, .12, -.4), { n: 8, len0: 2.4, spread: .8, lift: .5 }); S.part(up.g, { cruise: [s * .3, .12, -.4], boost: [s * .3, .12, -.3, 0, -s * .5, 0] }); tbFlap(S, up.g, s, .14, 1.5);
        const lo = spiritWing(S, s, V(s * .25, -.12, .35), { n: 6, len0: 1.6, spread: 1.0, lift: -.3, sweepB: .3 }); S.part(lo.g, { cruise: [s * .25, -.12, .35, 0, 0, -s * .1], boost: [s * .25, -.12, .45, 0, -s * .55, -s * .05] });
        S.extras.push((sh, dt, t) => { lo.g.children[0].rotation.z = -s * Math.sin(t * 1.5 + 1.4) * (sh.mode === 'cruise' ? .12 : .04); });
        S.gun(tipAt(up.g, s * .6, .05, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); }
      tbBoltTail(S, 1, 2.8, 0); particles(S, S.sparkEm, sparkOpts(S)); } }
];
/* =========================================================
   ⚡ THUNDERBIRD Λ v2 — stylised lightning eagle: zig-zag feather blades in a deep-blue → cyan gradient,
      each outlined with a glowing white rim; layered wings, crest, talons, fan tail.
   ========================================================= */
// one lightning-blade feather outline (length along +Y, width along X)
function zFeatherShape(L, W, teeth, sd) {
  const h = (a, b) => { const v = Math.sin(a * 41.7 + b * 13.3 + sd * 7.1) * 43758.5; return v - Math.floor(v); };
  const half = y => W * .5 * Math.sin(Math.min(1, y / L * 2.2) * Math.PI / 2) * Math.pow(Math.max(0, 1 - y / L), .55) + W * .06 * (1 - y / L);
  const left = [], right = [];
  for (let i = 1; i <= teeth; i++) { const y = L * (i - .3 + h(i, 1) * .25) / (teeth + .4), x = half(y); left.push([-x, y], [-x * (.38 + h(i, 2) * .15), y + L * (.05 + h(i, 3) * .03)]); }
  const rt = Math.max(1, teeth - 1);
  for (let i = 1; i <= rt; i++) { const y = L * (i + .15 + h(i, 4) * .2) / (rt + .6), x = half(y) * .92; right.push([x, y], [x * (.42 + h(i, 5) * .15), y + L * (.05 + h(i, 6) * .03)]); }
  const tipX = W * (h(9, 9) - .5) * .12, pts = [[-W * .09, 0], ...left, [tipX, L], ...right.reverse(), [W * .09, 0]];
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}
// accumulates many feathers and merges them into two draw calls: gradient fill + glowing rim
function featherBatch(S) {
  const d = S.P.d, gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const W1 = new THREE.Color(1, 1, 1), root = new THREE.Color(d.base).lerp(gl, .3).multiplyScalar(.55), mid = gl.clone().multiplyScalar(.72).lerp(new THREE.Color(d.base), .15), tip = gl.clone().lerp(W1, .42);
  const fills = [], rims = [], M = new THREE.Matrix4(), col = new THREE.Color();
  return {
    gl, tip,
    add(pos, dir, normal, L, W, teeth, sd, shade = 1, rimK = 1) {
      const pts = zFeatherShape(L, W, teeth, sd), sh = new THREE.Shape(pts), fg = new THREE.ShapeGeometry(sh, 1);
      const c = new Float32Array(fg.attributes.position.count * 3);
      for (let i = 0; i < fg.attributes.position.count; i++) { const t = Math.max(0, Math.min(1, fg.attributes.position.getY(i) / L)); col.copy(t < .5 ? root : mid).lerp(t < .5 ? mid : tip, t < .5 ? t * 2 : (t - .5) * 2).multiplyScalar(shade); c.set([col.r, col.g, col.b], i * 3); }
      fg.setAttribute('color', new THREE.BufferAttribute(c, 3));
      // rim = the outline grown outward, with the feather itself cut out as a hole (so it never covers the fill)
      const g = .022 * rimK, cy = L * .45, outer = pts.map(p => new THREE.Vector2(p.x * (1 + g / Math.max(.02, W * .25) * .5) + Math.sign(p.x) * g * .4, cy + (p.y - cy) * (1 + g / L * 2.2) - (p.y < .001 ? g * .6 : 0)));
      const rs = new THREE.Shape(outer); rs.holes.push(new THREE.Path([...pts].reverse())); const rg = new THREE.ShapeGeometry(rs, 1);
      const side = V().crossVectors(dir, normal).normalize(), nn = V().crossVectors(side, dir).normalize();
      M.makeBasis(side, dir.clone().normalize(), nn).setPosition(pos); fg.applyMatrix4(M); rg.applyMatrix4(M);
      fills.push(fg); rims.push(rg);
    },
    build(parent) {
      if (!fills.length) return;
      const fm = S._featFill || (S._featFill = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      const rm = S._featRim || (S._featRim = new THREE.MeshBasicMaterial({ color: W1.clone().lerp(gl, .18).multiplyScalar(1.35), side: THREE.DoubleSide, toneMapped: false }));
      const f = new THREE.Mesh(mergeGeometries(fills.map(g => { g.deleteAttribute('uv'); return g; })), fm), r = new THREE.Mesh(mergeGeometries(rims.map(g => { g.deleteAttribute('uv'); return g; })), rm);
      parent.add(f, r); S.glows.push(r); fills.length = rims.length = 0;
    }
  };
}
function zWing(S, s, root, o) {
  const { lift = .3, span = 1, sweepB = 0 } = o, g = new THREE.Group(), fl = new THREE.Group(), fb = featherBatch(S), up = V(0, 1, 0), tips = [];
  const sh = V(0, 0, 0), wrist = V(s * 1.15 * span, .12 + lift * .25, .02), hand = V(s * 1.75 * span, .2 + lift * .45, .15);
  const lead = new THREE.CatmullRomCurve3([sh, V(s * .6 * span, .1 + lift * .1, -.08), wrist, hand]);
  // primaries: long blades fanning from the hand
  const NP = 9; for (let k = 0; k < NP; k++) { const t = k / (NP - 1), base = lead.getPointAt(lp(.62, 1, t)), a = lp(.12, 1.25, t), dir = V(s * Math.cos(a) * .95, lift * .25 * (1 - t) + .02, Math.sin(a) + sweepB * t).normalize(); const L = (1.3 + .6 * Math.sin(t * Math.PI * .8)) * span; fb.add(base.clone().add(V(0, -.01 * k, 0)), dir, up, L, .34 * span, 3, k + s * 3, 1); const e = base.clone().addScaledVector(dir, L); tips.push(emitter(fl, e.x, e.y, e.z)); }
  // secondaries along the arm, pointing back
  const NS = 8; for (let k = 0; k < NS; k++) { const t = k / (NS - 1), base = lead.getPointAt(lp(.05, .62, t)), dir = V(s * lp(.12, .45, t), .02, 1 + sweepB).normalize(); fb.add(base.clone().add(V(0, -.02, 0)), dir, up, (1.0 + .15 * Math.sin(t * Math.PI)) * span, .3 * span, 3, 40 + k + s, .95); }
  // two rows of coverts layered on top, shorter and darker toward the leading edge
  for (const [row, Lk, sh2, off] of [[0, .62, .88, .035], [1, .38, .8, .065]]) { const N = 10 - row * 2; for (let k = 0; k < N; k++) { const t = k / (N - 1), base = lead.getPointAt(lp(.04, .8, t)), dir = V(s * lp(.15, .7, t), .02, 1).normalize(); fb.add(base.clone().add(V(0, off, -.02)), dir, up, Lk * span * (.9 + .2 * Math.sin(t * 3)), .26 * span, 2, 80 + row * 20 + k + s, sh2, .8); } }
  fb.build(fl); g.add(fl); g.position.copy(root);
  const pr = []; for (let k = 1; k < tips.length; k += 2) pr.push([tips[k - 1], tips[k]]);
  arcs(S, pr, S.P.glow, { force: true, w: .35, fl: .4, p: .3, pf: .55 });
  return { g, tips };
}
/* ---- eagle head for the lightning eagle: sculpted skull, brow shelf, almond glowing eye, hooked open beak, zig-zag feather crest ---- */
function eagleHead(S, B) {
  const h = new THREE.Group(); h.position.set(0, .2, -1.42); B.add(h);
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const skinM = new THREE.MeshStandardMaterial({ color: gl.clone().multiplyScalar(.42).lerp(new THREE.Color(S.P.d.base), .25), emissive: gl.clone().multiplyScalar(.16), metalness: .1, roughness: .55, side: THREE.DoubleSide });
  // skull: round crown, heavy brow shelf over a recessed eye, flat cheek, narrowing to the cere
  const HS = [{ z: .38, w: .19, ht: .2, hb: .17 }, { z: .2, w: .25, ht: .26, hb: .2 }, { z: 0, w: .27, ht: .27, hb: .19 }, { z: -.16, w: .24, ht: .23, hb: .15, y: -.01 }, { z: -.28, w: .18, ht: .16, hb: .11, y: -.02 }, { z: -.36, w: .11, ht: .1, hb: .08, y: -.025 }, { z: -.4, w: .03, ht: .03, hb: .03, y: -.03 }];
  const F = [];
  fSeg(F, V(.05, .21, -.3), V(.2, .25, -.15), .05, .07);       // brow shelf, low at the inner end → fierce scowl
  fSeg(F, V(.2, .25, -.15), V(.25, .2, .02), .045, .045);
  fPt(F, V(.18, .12, -.19), V(.065, .05, .06), -.05);           // eye socket under the shelf
  fPt(F, V(.21, -.03, -.06), V(.07, .06, .1), .03);             // cheek
  fSeg(F, V(.02, .2, -.33), V(.04, .26, -.2), .012, -.014);     // frown groove between brows
  fPt(F, V(0, .28, .05), V(.13, .05, .15), .02, false);         // crown
  h.add(new THREE.Mesh(sculptGeo(HS, F, { nz: 56, nr: 40 }), skinM));
  // beak: big hooked upper mandible, lower mandible dropped open, dark gape between
  const beakM = new THREE.MeshStandardMaterial({ color: new THREE.Color(.86, .9, 1), emissive: gl.clone().multiplyScalar(.12), metalness: .15, roughness: .3 });
  const gapeM = new THREE.MeshStandardMaterial({ color: 0x0a0f26, emissive: gl.clone().multiplyScalar(.08), roughness: .6, side: THREE.DoubleSide });
  const upPts = [V(0, .07, -.3), V(0, .08, -.46), V(0, .04, -.62), V(0, -.05, -.74), V(0, -.15, -.77), V(0, -.21, -.72)];
  h.add(new THREE.Mesh(sweep(upPts, t => ({ w: lp(.12, .006, Math.pow(t, .85)), h: lp(.1, .008, t), n: 1.7, arch: .015 }), { segs: 30, rad: 14 }), beakM));
  h.add(new THREE.Mesh(sweep([V(0, .12, -.32), V(0, .12, -.48), V(0, .07, -.63)], t => ({ w: lp(.025, .006, t), h: lp(.02, .006, t) }), { segs: 12, rad: 6 }), beakM)); // culmen ridge
  const cere = new THREE.Mesh(sweep([V(-.1, .02, -.3), V(0, .13, -.33), V(.1, .02, -.3)], t => ({ w: .03, h: .025 }), { segs: 12, rad: 8, up: V(0, 0, -1) }), skinM); h.add(cere);
  for (const s of [1, -1]) h.add(new THREE.Mesh(sweep([V(s * .06, .07, -.38), V(s * .055, .065, -.44)], () => ({ w: .012, h: .007 }), { segs: 3, rad: 6 }), gapeM)); // nostril slits
  const jaw = new THREE.Group(); jaw.position.set(0, -.04, -.3); h.add(jaw);
  jaw.add(new THREE.Mesh(sweep([V(0, 0, 0), V(0, -.03, -.16), V(0, -.07, -.3), V(0, -.09, -.36)], t => ({ w: lp(.1, .012, Math.pow(t, .9)), h: lp(.045, .008, t), n: 2 }), { segs: 18, rad: 12 }), beakM));
  const gape = new THREE.Mesh(sweep([V(0, .02, .02), V(0, .0, -.18), V(0, -.03, -.33)], t => ({ w: lp(.085, .01, t), h: lp(.05, .005, t), n: 2 }), { segs: 12, rad: 10 }), gapeM); jaw.add(gape);
  const tongue = new THREE.Mesh(sweep([V(0, .01, -.02), V(0, .01, -.14), V(0, .03, -.24)], t => ({ w: lp(.035, .01, t), h: .012 }), { segs: 8, rad: 8 }), new THREE.MeshStandardMaterial({ color: 0x5a2a6a, emissive: gl.clone().multiplyScalar(.1), roughness: .4 })); jaw.add(tongue);
  let open = .3; S.extras.push((sh, dt, t) => { open += ((sh.fire ? .55 : .28) - open) * (1 - Math.exp(-dt * 4)); jaw.rotation.x = -open + Math.sin(t * 2.3) * .02; });
  // eyes: slanted almond of white light under the shelf, dark lid line, blue halo
  for (const s of [1, -1]) {
    const eg = new THREE.Group(); eg.position.set(s * .2, .125, -.215); eg.rotation.set(0, s * (Math.PI - .75), s * -.32); // face outward-forward h.add(eg);
    const almond = new THREE.Shape(); const A = .075, Bt = .03, Bb = .022; almond.moveTo(-A, 0); almond.quadraticCurveTo(-A * .2, Bt * 2, A, Bt * .3); almond.quadraticCurveTo(A * .1, -Bb * 2.1, -A, 0);
    const eye = new THREE.Mesh(new THREE.ShapeGeometry(almond, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(gl, .12).multiplyScalar(1.7), toneMapped: false, side: THREE.DoubleSide })); eye.position.z = .002; if (s < 0) eye.scale.x = -1; eg.add(eye);
    const lid = new THREE.Mesh(new THREE.ShapeGeometry((() => { const o = new THREE.Shape(); o.moveTo(-A * 1.18, -.003); o.quadraticCurveTo(-A * .2, Bt * 2.55, A * 1.15, Bt * .4); o.quadraticCurveTo(A * .1, -Bb * 2.7, -A * 1.18, -.003); o.holes.push(almond); return o; })(), 12), new THREE.MeshBasicMaterial({ color: 0x050a1c, side: THREE.DoubleSide })); lid.position.z = .001; if (s < 0) lid.scale.x = -1; eg.add(lid);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: gl.clone().multiplyScalar(.75), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.set(.34, .2, 1); eg.add(halo);
  }
  // zig-zag feathers: crest sweeping back off the crown, brow tufts, cheek & jowl blades, throat and nape
  const fb = featherBatch(S);
  for (let k = 0; k < 9; k++) { const a = (k - 4) * .16, z = -.12 + Math.abs(k - 4) * .05 + (k % 2) * .06; fb.add(V(Math.sin(a) * .2, .25 - Math.abs(k - 4) * .015, z), V(Math.sin(a) * .7, .28 + (k % 2) * .08, 1).normalize(), V(Math.sin(a) * 1.4, 1, -.2).normalize(), .9 - Math.abs(k - 4) * .07, .22, 4, 700 + k, 1.05, .9); }
  for (const s of [1, -1]) {
    for (let k = 0; k < 3; k++) fb.add(V(s * (.12 + k * .05), .27 - k * .015, -.22 + k * .08), V(s * .55, .55, 1).normalize(), V(s * .4, 1, -.1).normalize(), .32 + k * .06, .12, 2, 760 + k + s * 7, 1.12, .8);
    for (let k = 0; k < 6; k++) { const z = -.14 + k * .075, y = .06 - k * .035; fb.add(V(s * (.24 + k * .006), y, z), V(s * .45, -.35 - k * .05, 1).normalize(), V(s, -.1, -.1).normalize(), .38 + k * .05, .15, 3, 800 + k + s * 11, .95 + (k % 2) * .1, .75); }
    for (let k = 0; k < 3; k++) fb.add(V(s * .1, .06 - k * .02, -.31 + k * .02), V(s * .7, .15, 1).normalize(), V(s, .4, -.2).normalize(), .18, .07, 2, 860 + k + s, 1, .6); // lores at the beak root
  }
  for (let k = 0; k < 5; k++) { const x = (k - 2) * .07; fb.add(V(x, -.15, -.1 + Math.abs(k - 2) * .05), V(x * 2, -.6, 1).normalize(), V(x, -1, -.3).normalize(), .4, .15, 2, 900 + k, .9, .7); }
  for (let k = 0; k < 8; k++) { const a = Math.PI * .15 + k / 7 * Math.PI * .7, d = V(Math.cos(a) * .6, Math.sin(a) * .5, 1).normalize(); fb.add(V(Math.cos(a) * .2, Math.sin(a) * .2 + .03, .28), d, V(Math.cos(a), Math.sin(a), -.3).normalize(), .5, .2, 3, 950 + k, 1, .8); }
  fb.build(h);
  S.gun(tipAt(h, 0, -.12, -.78), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
  return h;
}
function tbEagle(S) {
  const B = S.body, fb = featherBatch(S), gl = fb.gl; S.sparkEm = [];
  const skin = new THREE.MeshStandardMaterial({ color: gl.clone().multiplyScalar(.35).lerp(new THREE.Color(S.P.d.base), .3), emissive: gl.clone().multiplyScalar(.18), metalness: .1, roughness: .6 });
  B.add(new THREE.Mesh(loft(TB_SECS, { seg: 32 }), skin)); eagleHead(S, B);
  // body feathers: layered blades over back, flanks and breast
  for (let r = 0; r < 11; r++) { const z = lp(-1.05, 1.75, r / 10), sc = secAt(TB_SECS, z), n = 11, sz = Math.max(.45, Math.min(1.1, (sc.w + sc.ht) * 1.5));
    for (let k = 0; k < n; k++) { const th = lp(-2.9, 2.9, (k + (r % 2) * .5) / n), c = Math.cos(th), sn = Math.sin(th), hh = c >= 0 ? sc.ht : sc.hb;
      const P = V(sc.w * sn, (sc.y || 0) + hh * c, z), N = V(sn / Math.max(sc.w, .05), c / Math.max(hh, .05), 0).normalize(), dir = V(0, 0, 1).addScaledVector(N, .25).normalize();
      fb.add(P.addScaledVector(N, .01 + r * .002), dir, N, .42 * sz, .2 * sz, 2, r * 13 + k, .85 + .15 * (c > 0 ? 1 : .6), .7); } }
  // neck ruff of longer blades
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, d = V(Math.cos(a) * .7, Math.sin(a) * .7 + .1, 1).normalize(), b = V(Math.cos(a) * .3, Math.sin(a) * .27 + .1, -1.05); fb.add(b, d, V(Math.cos(a), Math.sin(a), -.4).normalize(), .55, .2, 3, 300 + k, 1, .8); }
  // fan tail
  for (let k = 0; k < 7; k++) { const a = (k - 3) * .2, b = V(Math.sin(a) * .1, .08, 1.7); fb.add(b, V(Math.sin(a) * 1.3, .04, 1).normalize(), V(0, 1, 0), 1.5 - Math.abs(k - 3) * .14, .3, 3, 400 + k, 1); }
  // thighs with talons reaching forward
  const clawM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(gl, .15).multiplyScalar(1.4), toneMapped: false }), legM = skin, lg = new THREE.Group();
  for (const s of [1, -1]) {
    const hip = V(s * .2, -.25, -.1), knee = V(s * .26, -.52, -.42), foot = V(s * .24, -.62, -.7);
    for (let k = 0; k < 4; k++) fb.add(hip.clone().add(V(s * .03 * k, -.05 * k, -.06 * k)), V(s * .1, -.6, .5).normalize(), V(s, 0, -.3).normalize(), .35, .16, 2, 500 + k + s * 5, .9, .7);
    lg.add(new THREE.Mesh(sweep([hip, knee, foot], t => ({ w: lp(.07, .035, t), h: lp(.07, .035, t) }), { segs: 10, rad: 8 }), legM));
    for (let c = 0; c < 4; c++) { const back = c === 3, a = back ? Math.PI : (c - 1) * .55, dv = V(Math.sin(a) * s * .8, -.25, -Math.cos(a)).normalize(), k0 = foot.clone().addScaledVector(dv, .1), k1 = k0.clone().addScaledVector(dv, .08).add(V(0, -.03, 0)), k2 = k1.clone().add(V(0, -.09, 0)).addScaledVector(dv, -.03);
      lg.add(new THREE.Mesh(sweep([foot, k0], () => ({ w: .022, h: .02 }), { segs: 4, rad: 6 }), legM)); lg.add(new THREE.Mesh(sweep([k0, k1, k2], t => ({ w: lp(.02, .003, t), h: lp(.024, .003, t) }), { segs: 10, rad: 6, up: V(s, 0, 0) }), clawM)); }
  }
  B.add(bake(S, lg));
  fb.build(B);

  // heart glow & a few thin crackles across the body
  S.heart = emitter(B, 0, -.05, -.35);
  const pairs = []; for (let i = 0; i < 5; i++) pairs.push([emitter(B, 0, 0, 0), emitter(B, 0, 0, 0)]);
  arcs(S, pairs, S.P.glow, { force: true, w: .35, fl: .4, p: .3, pf: .6, onStrike: i => { const z = lp(-1.6, 1.8, Math.random()), sc = secAt(TB_SECS, z), th = (Math.random() - .5) * 5; pairs[i][0].position.set(sc.w * Math.sin(th) * 1.1, (sc.y || 0) + sc.ht * Math.cos(th) * 1.1, z); const th2 = th + (Math.random() - .5) * 2; pairs[i][1].position.set(sc.w * Math.sin(th2) * (1.1 + Math.random() * 2.5), (sc.y || 0) + sc.ht * Math.cos(th2) * (1.1 + Math.random() * 2.5), z + (Math.random() - .5)); } });
}
const TBZ_V = [
  { name: 'A · 폭풍 날개', desc: '번개 모양으로 톱니가 진 깃털이 짙은 파랑에서 하늘색으로 물들고, 깃털마다 하얗게 빛나는 테두리가 둘려 있어요. 칼날 깃 9장·둘째 깃 8장·덮깃 두 줄이 겹친 큰 날개, 뒤로 뻗은 볏, 빛나는 눈과 갈고리 부리, 앞으로 내민 빛나는 발톱, 부채꼴 꼬리를 가졌어요.',
    build(S) { for (const s of [1, -1]) { const w = zWing(S, s, V(s * .28, .1, -.35), { lift: .35 }); S.part(w.g, { cruise: [s * .28, .1, -.35], boost: [s * .28, .1, -.25, 0, -s * .55, 0] }); tbFlap(S, w.g, s); S.gun(tipAt(w.g, s * .7, .1, .1), { ...bolt(S, { rate: .22 }), color: tracerC(S) }); } } },
  { name: 'B · 뇌전 V익', desc: '같은 번개 깃털 날개를 V자로 높이 치켜든 형태예요.',
    build(S) { for (const s of [1, -1]) { const w = zWing(S, s, V(s * .26, .16, -.3), { lift: 1.6, span: .92, sweepB: .15 }); S.part(w.g, { cruise: [s * .26, .16, -.3, 0, 0, s * .45], boost: [s * .26, .16, -.2, 0, -s * .45, s * .25] }); tbFlap(S, w.g, s, .1, 1.3); S.gun(tipAt(w.g, s * .6, .3, .1), { ...bolt(S, { rate: .22 }), color: tracerC(S) }); } } },
  { name: 'C · 사익 뇌조', desc: '크고 작은 번개 깃털 날개 두 쌍이 위아래로 엇박자 날갯짓을 해요.',
    build(S) { for (const s of [1, -1]) {
        const up = zWing(S, s, V(s * .28, .12, -.4), { lift: .5 }); S.part(up.g, { cruise: [s * .28, .12, -.4], boost: [s * .28, .12, -.3, 0, -s * .5, 0] }); tbFlap(S, up.g, s, .14, 1.5);
        const lo = zWing(S, s, V(s * .24, -.12, .4), { lift: -.25, span: .62, sweepB: .3 }); S.part(lo.g, { cruise: [s * .24, -.12, .4, 0, 0, -s * .1], boost: [s * .24, -.12, .5, 0, -s * .55, -s * .05] });
        S.extras.push((sh, dt, t) => { lo.g.children[0].rotation.z = -s * Math.sin(t * 1.5 + 1.4) * (sh.mode === 'cruise' ? .12 : .04); });
        S.gun(tipAt(up.g, s * .6, .05, -.1), { ...bolt(S, { rate: .2 }), color: tracerC(S) }); } } }
];
/* =========================================================
   ⚡ THUNDERBIRD Λ v3 — faceted crystal lightning eagle (from the user's turnaround sheet):
      low-poly blue body, wings of big jagged crystal spikes, gold lightning marks, gold hooked beak & talons
   ========================================================= */
const CE_LAYOUT = {"wing": [{"b": [0.3, 0.1, -0.2], "yaw": -12, "pitch": 24, "L": 2.05, "W": 0.85, "t": 3, "tone": 1.0}, {"b": [0.42, 0.08, -0.12], "yaw": 8, "pitch": 16, "L": 1.75, "W": 0.75, "t": 3, "tone": 0.95}, {"b": [0.5, 0.05, -0.02], "yaw": 26, "pitch": 8, "L": 1.55, "W": 0.7, "t": 3, "tone": 0.9}, {"b": [0.52, 0.02, 0.1], "yaw": 44, "pitch": 0, "L": 1.35, "W": 0.62, "t": 3, "tone": 0.88}, {"b": [0.5, 0.0, 0.2], "yaw": 62, "pitch": -6, "L": 1.15, "W": 0.55, "t": 3, "tone": 0.86}, {"b": [0.42, -0.02, 0.28], "yaw": 80, "pitch": -12, "L": 0.95, "W": 0.48, "t": 2, "tone": 0.84}, {"b": [0.3, 0.0, 0.3], "yaw": 96, "pitch": -16, "L": 0.75, "W": 0.4, "t": 2, "tone": 0.82}], "covert": [{"b": [0.3, 0.16, -0.18], "yaw": 2, "pitch": 10, "L": 1.0, "W": 0.62, "t": 2, "tone": 0.7}, {"b": [0.34, 0.14, -0.04], "yaw": 30, "pitch": 4, "L": 0.85, "W": 0.56, "t": 2, "tone": 0.68}, {"b": [0.32, 0.12, 0.1], "yaw": 60, "pitch": -6, "L": 0.7, "W": 0.5, "t": 2, "tone": 0.66}], "gold": [[0.32, 0.2, -0.12], [0.7, 0.24, -0.2], [0.82, 0.25, -0.05], [1.25, 0.32, -0.12], [1.4, 0.33, 0.0]], "tail": [{"b": [0, 0.0, 0.95], "yaw": 90, "pitch": -25, "L": 1.25, "W": 0.55, "t": 3, "tone": 0.95}, {"b": [0.08, 0.02, 0.92], "yaw": 72, "pitch": -30, "L": 0.95, "W": 0.42, "t": 2, "tone": 0.9}, {"b": [-0.08, 0.02, 0.92], "yaw": 108, "pitch": -30, "L": 0.95, "W": 0.42, "t": 2, "tone": 0.9}], "crest": [{"b": [0, 0.42, -1.05], "yaw": 90, "pitch": 35, "L": 0.75, "W": 0.2, "t": 2, "tone": 1.0}, {"b": [0.1, 0.4, -1.02], "yaw": 70, "pitch": 30, "L": 0.6, "W": 0.17, "t": 2, "tone": 0.95}, {"b": [-0.1, 0.4, -1.02], "yaw": 110, "pitch": 30, "L": 0.6, "W": 0.17, "t": 2, "tone": 0.95}, {"b": [0.17, 0.34, -0.98], "yaw": 55, "pitch": 20, "L": 0.45, "W": 0.14, "t": 2, "tone": 0.9}, {"b": [-0.17, 0.34, -0.98], "yaw": 125, "pitch": 20, "L": 0.45, "W": 0.14, "t": 2, "tone": 0.9}]};
// lightning-blade spike outline (length +Y, width X) — same function as the 2D preview used to check the layout
function ceBolt(L, W, teeth) {
  const half = y => W * .5 * Math.pow(1 - y / L, .85), left = [], right = [];
  for (let i = 1; i <= teeth; i++) { const y = L * i / (teeth + 1), x = half(y); left.push([-x, y - L * .06], [-x * .35, y + L * .04]); }
  for (let i = 1; i <= teeth; i++) { const y = L * (i - .45) / (teeth + .6), x = half(y); right.push([x * .4, y - L * .03], [x * 1.05, y + L * .08]); }
  return [[-W * .5, 0], ...left, [W * .02, L], ...right.reverse(), [W * .5, 0]].map(([x, y]) => new THREE.Vector2(x, y));
}
function ceKit(S) {
  if (S._ce) return S._ce;
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const base = new THREE.Color(S.P.d.base).lerp(gl, .55);
  /* lightning body colour per paint: storm blue = electric blue, white volt = white-hot core with a thin blue cast, violet = purple, prism = white crystal (rainbow added in ceStorm) */
  const W1 = new THREE.Color(1, 1, 1), pb = new THREE.Color(S.P.d.base), hot = S.P.d.prism || (pb.r + pb.g + pb.b) / 3 > .6;
  const gold = !!S.P.d.gold;   /* real metal gold: deep warm amber, very metallic, low self-glow so reflections read as polished gold, not flat yellow */
  const lc = gold ? new THREE.Color(1, .66, .2) : S.P.d.prism ? new THREE.Color(1, 1, 1) : hot ? gl.clone().lerp(W1, .85) : gl.clone().lerp(W1, .3);
  const le = gold ? new THREE.Color(.32, .16, .02) : S.P.d.prism ? new THREE.Color(.3, .3, .3) : hot ? gl.clone().lerp(W1, .75).multiplyScalar(.6) : gl.clone().multiplyScalar(.6);
  const crys = t => new THREE.MeshStandardMaterial({ color: gl.clone().lerp(new THREE.Color(1, 1, 1), .25 * t).multiplyScalar(.55 + .45 * t), emissive: gl.clone().multiplyScalar(.28 + .25 * t), metalness: .15, roughness: .18, flatShading: true, side: THREE.DoubleSide });
  const bodyM = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(.75), emissive: gl.clone().multiplyScalar(.12), metalness: .2, roughness: .32, flatShading: true, side: THREE.DoubleSide });
  return S._ce = {
    gl, lc, le, met: gold ? .92 : .25, rough: gold ? .22 : .25, crystal: bodyM, crystalDim: bodyM,
    body: new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(.75), emissive: gl.clone().multiplyScalar(.12), metalness: .2, roughness: .32, flatShading: true, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c94c, emissive: new THREE.Color(.35, .25, .02), metalness: .55, roughness: .28, flatShading: true, side: THREE.DoubleSide }),
    edge: new THREE.LineBasicMaterial({ color: gl.clone().lerp(new THREE.Color(1, 1, 1), .5), transparent: true, opacity: .32 }),
    edges: [], mats: {}
  };
}
// a crystal spike placed from layout data (b = base, yaw/pitch in degrees, s = side ±1)
function ceSpike(S, parent, sp, s, mat, thick = .06) {
  const K = ceKit(S), shape = new THREE.Shape(ceBolt(sp.L, sp.W, sp.t));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: thick * .45, bevelSize: Math.min(.03, sp.W * .06), bevelSegments: 1, steps: 1 });
  geo.translate(0, 0, -thick / 2);
  const yaw = sp.yaw * Math.PI / 180, pit = sp.pitch * Math.PI / 180, d = V(s * Math.cos(yaw) * Math.cos(pit), Math.sin(pit), Math.sin(yaw) * Math.cos(pit)).normalize();
  // blade lies in the plane of d and sp.ref (default: horizontal)
  const side = sp.ref ? V(...sp.ref).addScaledVector(d, -V(...sp.ref).dot(d)).normalize() : V().crossVectors(d, V(0, 1, 0)).normalize(), nrm = V().crossVectors(side, d).normalize();
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(side, d, nrm).setPosition(V(s * sp.b[0], sp.b[1], sp.b[2])));
  const m = new THREE.Mesh(geo, mat || (sp.tone > .8 ? K.crystal : K.crystalDim)); parent.add(m);
  K.edges.push({ geo, parent }); return m;
}
// zig-zag gold lightning mark: a flat ribbon along a polyline, extruded a little
function ceGoldMark(S, parent, pts, w, up = V(0, 1, 0)) {
  const K = ceKit(S), L = [], R = [];
  pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = V().subVectors(b, a).normalize(), sd = V().crossVectors(t, up).normalize(), ww = w * (i === pts.length - 1 ? .15 : 1); L.push(p.clone().addScaledVector(sd, ww)); R.push(p.clone().addScaledVector(sd, -ww)); });
  const poly = [...L, ...R.reverse()], pos = [], idx = [], n = poly.length, top = .02;
  poly.forEach(p => pos.push(p.x, p.y + top, p.z)); poly.forEach(p => pos.push(p.x, p.y - .005, p.z));
  const half = pts.length; for (let i = 0; i < half - 1; i++) { const a = i, b = i + 1, c = n - 2 - i, d = n - 1 - i; idx.push(a, b, d, b, c, d, a + n, d + n, b + n, b + n, d + n, c + n); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, i + n, j, j, i + n, j + n); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, K.gold); m.material.side = THREE.DoubleSide; parent.add(m); return m;
}
// faceted tube along a path: few sides + flat shading = low-poly crystal look
function ceTube(pts, rFn, sides = 6, { tri = false, up = V(0, 1, 0), jit = 0, rot = 0 } = {}) {
  const pos = [], idx = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const t = V().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize(), sd = V().crossVectors(t, up); if (sd.lengthSq() < 1e-6) sd.set(1, 0, 0); sd.normalize(); const u2 = V().crossVectors(sd, t).normalize(), [rx, ry] = rFn(i / (n - 1));
    for (let j = 0; j < sides; j++) { const a = j / sides * TAU + (tri ? Math.PI / 2 : 0) + rot, jj = jit ? 1 + Math.sin(i * 12.9 + j * 7.3) * jit : 1; pos.push(pts[i].x + (sd.x * Math.cos(a) * rx + u2.x * Math.sin(a) * ry) * jj, pts[i].y + (sd.y * Math.cos(a) * rx + u2.y * Math.sin(a) * ry) * jj, pts[i].z + (sd.z * Math.cos(a) * rx + u2.z * Math.sin(a) * ry) * jj); if (i < n - 1) { const p = i * sides + j, q = i * sides + (j + 1) % sides; idx.push(p, q, p + sides, q, q + sides, p + sides); } }
  }
  for (const [i, sg] of [[0, 1], [n - 1, -1]]) { const c = pos.length / 3; pos.push(pts[i].x, pts[i].y, pts[i].z); for (let j = 0; j < sides; j++) { const p = i * sides + j, q = i * sides + (j + 1) % sides; sg > 0 ? idx.push(c, q, p) : idx.push(c, p, q); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* feathered lightning wing geometry (pure math, no three.js): returns { pos:[...], fid:[...] } for side s (+1 right / -1 left)
   big eagle wing: thick bone along the leading edge, long secondaries hanging back from the arm,
   long fanned primaries ("fingers") from the hand, three overlapping rows of coverts on top */
function ceWingGeo(s) {
  const pos = [], fid = []; let F = 0;
  const hr = (a, b) => { const v = Math.sin(a * 71.9 + b * 19.3 + 5.7) * 43758.5; return v - Math.floor(v); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const lerp = (a, b, t) => a + (b - a) * t, lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c); fid.push(F, F, F); };
  /* one thick feather blade: diamond cross-section (two edges + raised top ridge + lower ridge), widest near the base, needle tip, slight droop */
  const blade = (b, dir, L, w, t, droop) => {
    dir = nrm(dir); const side = nrm(crs([0, 1, 0], dir)), up = nrm(crs(dir, side));
    const U = [0, .18, .5, .8, 1], W = [.55, 1, .8, .45, 0], TH = [1, 1, .75, .45, 0];
    const R = U.map((u, i) => { const c = add(add(b, mul(dir, u * L)), mul(up, -droop * u * u * L)); return [add(c, mul(side, -w * W[i] / 2)), add(c, mul(up, t * TH[i])), add(c, mul(side, w * W[i] / 2)), add(c, mul(up, -t * .45 * TH[i]))]; });
    for (let i = 0; i < U.length - 1; i++) for (let k = 0; k < 4; k++) { const a = R[i][k], bb = R[i][(k + 1) % 4], c = R[i + 1][(k + 1) % 4], d = R[i + 1][k]; tri(a, bb, c); tri(a, c, d); }
    tri(R[0][0], R[0][1], R[0][2]); tri(R[0][0], R[0][2], R[0][3]); F++;
  };
  const X = p => [s * p[0], p[1], p[2]];
  const SH = [.22, .2, -.38], EL = [.6, .27, -.44], WR = [1.0, .31, -.5], TP = [1.5, .29, -.36];
  const bone = u => u < .35 ? lerp3(SH, EL, u / .35) : u < .7 ? lerp3(EL, WR, (u - .35) / .35) : lerp3(WR, TP, (u - .7) / .3);
  /* five huge diamond feathers rooted along the arm from the shoulder out: rhombus outline (narrow root, widest at ~30%, needle tip),
     diamond cross-section with a raised top ridge; no flat plate — the wide shoulders of neighbouring diamonds overlap into one wing */
  const diamond = (b, dir, L, w, t, droop) => {
    dir = nrm(dir); const side = nrm(crs([0, 1, 0], dir)), up = nrm(crs(dir, side));
    const U = [0, .3, .65, 1], WF = [.3, 1, .5, 0], WB = [1.1, 1, .5, 0], TH = [.7, 1, .6, 0], fs = side[2] < 0 ? 1 : -1;   /* root widens only toward the back, so it fills under the spar without poking ahead of the leading edge */
    const R = U.map((u, i) => { const c = add(add(b, mul(dir, u * L)), mul(up, -droop * u * u * L)), ws = fs > 0 ? [WF[i], WB[i]] : [WB[i], WF[i]]; return [add(c, mul(side, -w * ws[1] / 2)), add(c, mul(up, t * TH[i])), add(c, mul(side, w * ws[0] / 2)), add(c, mul(up, -t * .5 * TH[i]))]; });
    for (let i = 0; i < U.length - 1; i++) for (let k = 0; k < 4; k++) { const a = R[i][k], bb = R[i][(k + 1) % 4], c = R[i + 1][(k + 1) % 4], d = R[i + 1][k]; tri(a, bb, c); tri(a, c, d); }
    tri(R[0][0], R[0][1], R[0][2]); tri(R[0][0], R[0][2], R[0][3]); F++; };
  /* slim at the body, broadening outward: inner feathers short and narrow, outer ones long and wide */
  [[.1, 1.0, .6, .3], [.3, .75, 1.1, .5], [.5, .6, 1.7, .7], [.7, .78, 2.1, .8], [.9, 1.2, 2.2, .8]].forEach(([u, a, L, w], i) => {
    diamond(X(add(bone(u), [0, .02 + i * .01, -.04])),   /* roots tucked up under the spar */
      X([Math.sin(a), .02, Math.cos(a)]), L, w, .11, .06); });
  /* single layer: no covert rows on top */
  /* sharp leading edge: a knife-edged spar along the front of the wing, its front rim a forward-pointing sawtooth */
  { const N = 20, R = [];
    for (let i = 0; i <= N; i++) { const u = i / N, c = add(bone(u), [0, .07, 0]), d = nrm(sub(bone(Math.min(1, u + .02)), bone(Math.max(0, u - .02))));
      let fw = nrm(crs(d, [0, 1, 0])); if (fw[2] > 0) fw = mul(fw, -1);
      const k = lerp(1, .35, u), saw = i % 2 ? .04 : lerp(.08, .42, u), bk = mul(fw, -1);   /* teeth short at the body, growing toward the tip, raked outward */
      const ang = lerp(Math.PI / 4, Math.PI * .4, u), tdir = add(mul(fw, Math.cos(ang)), mul(d, Math.sin(ang)));   /* 45° at the body, swinging round toward the tail out at the tip */
      R.push([i % 2 ? add(c, mul(fw, saw)) : add(add(c, mul(fw, .04)), mul(tdir, saw)), add(add(c, [0, .055 * k, 0]), mul(bk, .05)), add(add(c, mul(bk, .34 * k)), [0, -.03, 0]), add(add(c, [0, -.045 * k, 0]), mul(bk, .05))].map(X)); }
    for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const a = R[i][k], b = R[i][(k + 1) % 4], c = R[i + 1][(k + 1) % 4], d = R[i + 1][k]; tri(a, b, c); tri(a, c, d); }
    tri(R[0][0], R[0][1], R[0][2]); tri(R[0][0], R[0][2], R[0][3]); const e = X(add(TP, [.12, .02, -.06])); for (let k = 0; k < 4; k++) tri(R[N][k], R[N][(k + 1) % 4], e); F++; }
  return { pos, fid, bone: [SH, EL, WR, TP].map(X) };
}
/* tail: a fan of seven long diamond feathers (same blade as the wings) rooted in the rump, middle ones longest */
function ceTailGeo() {
  const pos = [], fid = []; let F = 0;
  const hr = (a, b) => { const v = Math.sin(a * 53.7 + b * 23.1 + 1.3) * 43758.5; return v - Math.floor(v); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }, crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const tri = (a, b, c) => { pos.push(...a, ...b, ...c); fid.push(F, F, F); };
  const diamond = (b, dir, L, w, t) => {
    dir = nrm(dir); const side = nrm(crs([0, 1, 0], dir)), up = nrm(crs(dir, side));
    const U = [0, .3, .65, 1], W = [.3, 1, .5, 0], TH = [.7, 1, .6, 0];
    const R = U.map((u, i) => { const c = add(b, mul(dir, u * L)); return [add(c, mul(side, -w * W[i] / 2)), add(c, mul(up, t * TH[i])), add(c, mul(side, w * W[i] / 2)), add(c, mul(up, -t * .5 * TH[i]))]; });
    for (let i = 0; i < U.length - 1; i++) for (let k = 0; k < 4; k++) { const a = R[i][k], bb = R[i][(k + 1) % 4], c = R[i + 1][(k + 1) % 4], d = R[i + 1][k]; tri(a, bb, c); tri(a, c, d); }
    tri(R[0][0], R[0][1], R[0][2]); tri(R[0][0], R[0][2], R[0][3]); F++; };
  for (let k = -3; k <= 3; k++) { const ak = Math.abs(k), ph = k * .21 + (hr(k, 1) - .5) * .05;
    diamond([k * .045, .1 + (3 - ak) * .012, .42], [Math.sin(ph), -.04 + ak * .01, Math.cos(ph)], (1.75 - ak * .16) * (.92 + .16 * hr(k, 2)), .38, .09); }
  return { pos, fid };
}
/* thunderbird storm: many very irregular bolts — crawling over the plumage, jumping between body / wings / tail,
   and leaping out into the air all around; every strike flashes the whole bird and a soft halo, so it reads as a body made of lightning */
/* prism for the lightning bird: rainbow per facet (from the flat face normal + view angle), drifting with time, applied to colour AND glow */
function prismLight(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPT = PRISM_U.uT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 pv=normalize(vViewPosition); vec3 nn=normalize(normal); float pf=1.-abs(dot(nn,pv));
        float ph=dot(nn,vec3(.9,1.7,.6))*.9+pf*1.2+uPT*.25;
        vec3 rb=clamp(.5+.62*cos(6.2831853*(ph+vec3(0.,.33,.67))),0.,1.);   /* fully saturated spectrum per facet */
        rb=rb/max(max(rb.r,rb.g),max(rb.b,.001));
        diffuseColor.rgb=rb*.9;                                            /* body colour IS the rainbow (no white base) */
        float e=max(max(totalEmissiveRadiance.r,totalEmissiveRadiance.g),totalEmissiveRadiance.b);
        totalEmissiveRadiance=rb*min(e,.9)*1.15+rb*pow(pf,2.)*.6; }`);   /* glow tinted by the rainbow and capped so it never washes out to white */
  };
  mat.customProgramCacheKey = () => 'prismLight';
}
function ceStorm(S, on = 1, opt = {}) { if (NOFX) return;   /* on = storm strength: 1 full (B), ~.35 faint (A) */
  const B = S.body, anch = [];
  if (!on) { if (S.P.d.prism) B.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.emissive) { prismLight(o.material); o.material.needsUpdate = true; } }); return; }   /* style A: no storm, prism still applies */
  B.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(B.matrixWorld).invert(), v = V();
  B.traverse(o => { if (!o.isMesh || !o.geometry.attributes.position) return; const pa = o.geometry.attributes.position, step = Math.max(1, Math.floor(pa.count / 60));
    for (let i = 0; i < pa.count; i += step) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); anch.push(v.clone()); } });
  if (!anch.length) return;
  const pick = () => anch[Math.floor(Math.random() * anch.length)], N = Math.max(4, Math.round(18 * on)), pairs = [];
  for (let i = 0; i < N; i++) { const a = new THREE.Object3D(), b = new THREE.Object3D(); B.add(a); B.add(b); pairs.push([a, b]); }
  let flash = 0; S._ceKick = k => { flash = Math.min(2.4, flash + k); };   /* lets C effects flash the whole bird */
  arcs(S, pairs, S.P.glow, { force: true, w: .42 * (.55 + .45 * on), fl: .6 * on, p: .32 * on, pf: .55 * on, onStrike: i => {
    const [a, b] = pairs[i], A = pick(), r = Math.random(); a.position.copy(A); flash = Math.min(1.6 * on, flash + (.35 + Math.random() * .4) * on);
    if (r < .35) b.position.copy(A).add(V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.6));        /* short crawl over the skin */
    else if (r < .6) b.position.copy(pick());                                                                                           /* jump across the body */
    else b.position.copy(A).add(V(Math.random() - .5, (Math.random() - .5) * .8, Math.random() - .5).normalize().multiplyScalar((1.2 + Math.random() * 2.6) * (.4 + .6 * on)));   /* leap into the air */
  } });
  const mats = []; B.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.isMeshStandardMaterial && !o.material.userData.noFlash) mats.push(o.material); });   /* armour scales never flash */
  if (S.P.d.prism && !opt.noPrism) { for (const m of mats) { prismLight(m); m.needsUpdate = true; } }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: S.P.glow.clone().multiplyScalar(.5), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(5.5); halo.position.set(0, .15, -.1); B.add(halo);
  const halo2 = new THREE.Sprite(halo.material.clone()); halo2.material.color = new THREE.Color(1, 1, 1).lerp(S.P.glow, .5).multiplyScalar(.5); halo2.scale.setScalar(2.4); halo2.position.set(0, .2, -.3); B.add(halo2);
  const pc = new THREE.Color();
  S.extras.push((sh, dt, t) => { flash *= Math.exp(-dt * 7); const k = .45 * on + flash;
    if (S.P.d.prism) { pc.setHSL((t * .15) % 1, .9, .6); halo.material.color.copy(pc).multiplyScalar(.6); halo2.material.color.setHSL((t * .15 + .33) % 1, .9, .7).multiplyScalar(.6); }   /* runs after each part's own flicker: lifts every surface on each strike */
    for (const m of mats) { const u = m.userData; if (u.ceSet === m.emissiveIntensity) m.emissiveIntensity -= u.ceAdd; m.emissiveIntensity += k; u.ceAdd = k; u.ceSet = m.emissiveIntensity; }   /* never accumulates on materials nobody else resets */
    const hk = opt.haloK ?? 1; halo.material.opacity = ((.32 + .1 * Math.sin(t * 3.3)) * on + flash * .45) * hk; halo2.material.opacity = (.25 * on + flash * .55) * hk; halo.scale.setScalar(5.5 + flash * 1.5); });
}
/* ===== thunderbird contrails (style C1–C3) =====
   ribbons live in the ship's root space: points are emitted at a moving source (wing tip / tail) and carried back by the airflow
   (faster when moving), always facing the camera; the shader shapes them (soft vapour, crackling plasma) with noise break-up */
const TRAIL_VS = `attribute float aT; attribute float aV; varying float vT; varying float vV; void main(){ vT=aT; vV=aV; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const TRAIL_FS = `uniform vec3 uCol; uniform vec3 uCore; uniform float uTime; uniform float uA; uniform float uKind; uniform float uSeed; varying float vT; varying float vV;
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ return .55*n2(p)+.3*n2(p*2.1+3.)+.15*n2(p*4.3+7.); }
  void main(){
    float head = smoothstep(0., .035, vT), tail = pow(1.-vT, 1.5), ax = abs(vV);
    if (uKind < .5) {                       /* vapour: soft rolling cloud with a dense bright core, breaking up as it ages */
      float nz = fbm(vec2(vT*9. - uTime*.6 + uSeed, vV*1.7 + uTime*.15));
      float body = smoothstep(1., .15 + .35*vT, ax + (nz-.5)*.55*vT);
      float core = exp(-ax*ax*28.) * (1.-vT);
      float a = (body*(.35 + .65*nz) + core*.9) * head * tail * uA;
      gl_FragColor = vec4(mix(uCore, uCol, clamp(vT*1.4 + ax*.4, 0., 1.)) * (1. + core*.8), a);
    } else {                                /* plasma: glowing sheath with a jagged lightning filament that re-strikes every few frames */
      float k = floor(uTime*24. + uSeed*7.);
      float j = (n2(vec2(vT*26., k)) - .5)*1.3 + (n2(vec2(vT*70., k+5.)) - .5)*.45;
      float d = abs(vV - j*(.15 + .85*vT)*.55);
      float bolt = exp(-d*d*(260. - 180.*vT)) * step(.15, n2(vec2(k, uSeed)));
      float sheath = exp(-ax*ax*3.2) * (.45 + .55*fbm(vec2(vT*6. - uTime*2.5, vV + uSeed)));
      float a = (bolt*1.6 + sheath*.55) * head * tail * uA;
      gl_FragColor = vec4(mix(uCol, uCore, clamp(bolt, 0., 1.)) * (1. + bolt), a);
    } }`;
function ceTrail(S, src, o) { if (NOFX) return;
  const N = o.n || 70, life = o.life, pts = [], pos = new Float32Array(N * 2 * 3), aT = new Float32Array(N * 2), aV = new Float32Array(N * 2), idx = [];
  for (let i = 0; i < N; i++) { aV[i * 2] = -1; aV[i * 2 + 1] = 1; if (i < N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(aT, 1)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ vertexShader: TRAIL_VS, fragmentShader: TRAIL_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: o.col.clone() }, uCore: { value: o.core.clone() }, uTime: { value: 0 }, uA: { value: o.alpha || 1 }, uKind: { value: o.kind || 0 }, uSeed: { value: Math.random() * 10 } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 5; S.root.add(mesh);
  const w = V(), cam = V(), tg = V(), vw = V(), sd = V(), off = V(); let acc = 0;
  S.extras.push((sh, dt, t) => {
    dt = Math.min(dt, .05); m.uniforms.uTime.value = t;
    if (o.prism) { m.uniforms.uCol.value.setHSL((t * .12 + (o.hue || 0)) % 1, .9, .62); }
    src.getWorldPosition(w); sh.root.worldToLocal(w);
    const spd = sh.mode === sh.cfg.moving ? (o.move || 16) : (o.idle || 5);
    for (const q of pts) { q.age += dt; q.p.z += spd * dt; q.p.x += q.vx * dt; q.p.y += q.vy * dt; }
    acc += dt; const de = life / (N - 1);
    while (acc >= de) { acc -= de; pts.unshift({ p: w.clone(), age: 0, vx: (Math.random() - .5) * (o.spread || .2), vy: (Math.random() - .5) * (o.spread || .2) + (o.rise || 0), ph: Math.random() * TAU }); }
    while (pts.length > N || (pts.length && pts[pts.length - 1].age > life)) pts.pop();
    if (pts.length) pts[0].p.copy(w);
    cam.copy(camera.position); sh.root.worldToLocal(cam);
    const n = pts.length;
    for (let i = 0; i < N; i++) {
      const q = pts[Math.min(i, n - 1)] || { p: w, age: 0, ph: 0 }, a = Math.min(1, q.age / life);
      const pa = pts[Math.max(0, i - 1)] ? pts[Math.max(0, i - 1)].p : q.p, pb = pts[Math.min(n - 1, i + 1)] ? pts[Math.min(n - 1, i + 1)].p : q.p;
      tg.subVectors(pa, pb); if (tg.lengthSq() < 1e-8) tg.set(0, 0, -1); tg.normalize();
      off.set(0, 0, 0); if (o.swirl) { const ang = q.age * 9 + q.ph * .2; off.set(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(o.swirl * a); }   /* wingtip vortex: the ribbon corkscrews as it ages */
      const c = q.p.clone().add(off); vw.subVectors(cam, c); sd.crossVectors(tg, vw).normalize();
      const wd = lp(o.w0, o.w1, Math.pow(a, .7)) * (i >= n ? 0 : 1);
      pos.set([c.x - sd.x * wd, c.y - sd.y * wd, c.z - sd.z * wd, c.x + sd.x * wd, c.y + sd.y * wd, c.z + sd.z * wd], i * 6);
      aT[i * 2] = aT[i * 2 + 1] = i >= n ? 1 : a;
    }
    g.attributes.position.needsUpdate = true; g.attributes.aT.needsUpdate = true;
  });
}
/* C3: shed feather sparks — little four-point stars peel off the wing tips, trailing edges and tail, tumble back in the airflow and twinkle out */
function ceSparkTrail(S, srcs, o) { if (NOFX) return;
  const N = o.n || 360, pos = new Float32Array(N * 3), age = new Float32Array(N), life = new Float32Array(N), sz = new Float32Array(N), vel = [], ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { age[i] = 9; life[i] = 1; vel.push(V()); ph[i] = Math.random() * TAU; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(N), 1)); g.setAttribute('aS', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aP', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: o.col.clone() }, uCore: { value: o.core.clone() }, uTime: { value: 0 }, uPx: { value: innerHeight * .5 } },
    vertexShader: `attribute float aA; attribute float aS; attribute float aP; varying float vA; varying float vP; uniform float uPx; void main(){ vA=aA; vP=aP; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize = aS * (1.-aA*.7) * uPx / -mv.z; }`,
    fragmentShader: `uniform vec3 uCol; uniform vec3 uCore; uniform float uTime; varying float vA; varying float vP;
      void main(){ if (vA >= 1.) discard; vec2 q = gl_PointCoord*2.-1.; float r = length(q);
        float c = cos(vP + uTime*3.), s = sin(vP + uTime*3.); vec2 u = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
        float star = max(exp(-abs(u.x)*14.) * exp(-abs(u.y)*2.6), exp(-abs(u.y)*14.) * exp(-abs(u.x)*2.6));
        float glow = exp(-r*r*5.);
        float tw = .65 + .35*sin(uTime*18. + vP*9.);
        float a = (star*1.3 + glow*.45) * (1.-vA) * tw;
        gl_FragColor = vec4(mix(uCore, uCol, vA + r*.5), a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; S.root.add(pts);
  const w = V(); let k = 0, acc = 0;
  S.extras.push((sh, dt, t) => {
    dt = Math.min(dt, .05); m.uniforms.uTime.value = t; if (o.prism) m.uniforms.uCol.value.setHSL((t * .15) % 1, .9, .62);
    const mv = sh.mode === sh.cfg.moving, spd = mv ? 14 : 4, rate = (mv ? 240 : 110) * (sh.fire ? 1.4 : 1);
    acc += dt * rate;
    while (acc >= 1) { acc -= 1; const sc = srcs[Math.floor(Math.random() * srcs.length)]; sc.getWorldPosition(w); sh.root.worldToLocal(w);
      w.add(V((Math.random() - .5) * .25, (Math.random() - .5) * .15, (Math.random() - .5) * .25)); pos.set([w.x, w.y, w.z], k * 3);
      vel[k].set((Math.random() - .5) * 1.4, (Math.random() - .5) * 1 + .2, spd * (.55 + Math.random() * .6)); age[k] = 0; life[k] = .7 + Math.random() * 1.1; sz[k] = .07 + Math.random() * .16; ph[k] = Math.random() * TAU; k = (k + 1) % N; }
    const aA = g.attributes.aA.array;
    for (let i = 0; i < N; i++) { if (age[i] > life[i]) { aA[i] = 1; continue; } age[i] += dt; vel[i].x *= 1 - dt * 1.5; vel[i].y *= 1 - dt * 1.5;
      pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; aA[i] = Math.min(1, age[i] / life[i]); }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; g.attributes.aS.needsUpdate = true; g.attributes.aP.needsUpdate = true;
  });
}
function ceContrail(S, kind) { if (NOFX) return;
  const tips = S._ceTips || [], tail = S._ceTailTip, gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b)); const prism = !!S.P.d.prism, W1 = new THREE.Color(1, 1, 1);
  if (kind === 1) {   /* C1 vortex vapour: classic wing-tip contrails — thin bright core that swells into a soft, corkscrewing, breaking-up cloud */
    tips.forEach((tp, i) => { ceTrail(S, tp, { kind: 0, life: 1.6, n: 80, w0: .025, w1: .5, swirl: .12, spread: .12, col: gl.clone().lerp(W1, .55).multiplyScalar(.55), core: W1.clone().multiplyScalar(.9), alpha: .85, prism, hue: i * .5 }); });
    if (tail) ceTrail(S, tail, { kind: 0, life: .9, n: 50, w0: .05, w1: .35, spread: .25, col: gl.clone().lerp(W1, .4).multiplyScalar(.35), core: W1.clone().multiplyScalar(.5), alpha: .55, prism });
  } else if (kind === 2) {   /* C2 lightning wake: a glowing plasma sheath from the tail and wing tips with jagged bolts re-striking inside */
    if (tail) ceTrail(S, tail, { kind: 1, life: 1.0, n: 70, w0: .32, w1: .7, spread: .05, col: gl.clone().multiplyScalar(.8), core: W1.clone().lerp(gl, .25).multiplyScalar(1.4), alpha: 1, prism, move: 18 });
    tips.forEach((tp, i) => ceTrail(S, tp, { kind: 1, life: .7, n: 50, w0: .1, w1: .3, spread: .05, col: gl.clone().multiplyScalar(.7), core: W1.clone().multiplyScalar(1.3), alpha: .85, prism, hue: i * .5, move: 18 }));
  } else {   /* C3 feather afterglow: star-shaped sparks shed from the wings and tail, over a faint glowing wake */
    const srcs = [...tips, ...(S._ceWingEdge || []), ...(tail ? [tail, tail] : [])];
    if (srcs.length) ceSparkTrail(S, srcs, { n: 380, col: gl.clone().multiplyScalar(.85), core: W1.clone().lerp(gl, .2).multiplyScalar(1.3), prism });
    if (tail) ceTrail(S, tail, { kind: 0, life: .8, n: 40, w0: .12, w1: .4, spread: .1, col: gl.clone().multiplyScalar(.4), core: gl.clone().lerp(W1, .5).multiplyScalar(.6), alpha: .5, prism });
    tips.forEach(tp => ceTrail(S, tp, { kind: 0, life: .6, n: 34, w0: .03, w1: .16, col: gl.clone().multiplyScalar(.45), core: W1.clone().multiplyScalar(.7), alpha: .6, prism }));
  }
}
/* ===== wake lightning (style C1–C3 = B + irregular electric trail) =====
   bolts are left behind in the ship's root space and carried back by the airflow; each one is a jagged camera-facing strand
   that flickers, sometimes re-strikes, then dies — so the wake is a broken, irregular trail of electricity, never a straight line */
const WAKE_VS = `attribute float aV; attribute float aA; varying float vV; varying float vA; void main(){ vV=aV; vA=aA; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const WAKE_FS = `uniform vec3 uCol; uniform vec3 uCore; varying float vV; varying float vA;
  void main(){ float core = exp(-vV*vV*38.), glow = exp(-vV*vV*3.)*.38; float a = (core*1.5 + glow)*vA; if (a < .003) discard; gl_FragColor = vec4(mix(uCol, uCore, core), a); }`;
function ceWakeBolts(S, mode) { if (NOFX) return;
  const P = 110, M = 14, NV = P * M * 2, pos = new Float32Array(NV * 3), aV = new Float32Array(NV), aA = new Float32Array(NV), idx = [];
  for (let s = 0; s < P; s++) for (let i = 0; i < M; i++) { const v = (s * M + i) * 2; aV[v] = -1; aV[v + 1] = 1; if (i < M - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1)); g.setIndex(idx);
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const m = new THREE.ShaderMaterial({ vertexShader: WAKE_VS, fragmentShader: WAKE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: gl.clone().multiplyScalar(.9) }, uCore: { value: new THREE.Color(1, 1, 1).lerp(gl, .15).multiplyScalar(1.5) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; S.root.add(mesh);
  const srcs = [...(S._ceTips || []), ...(S._ceTips || []), ...(S._ceWingEdge || []), ...(S._ceTailTip ? [S._ceTailTip, S._ceTailTip, S._ceTailTip] : [])];
  if (!srcs.length) return;
  const strands = []; for (let s = 0; s < P; s++) strands.push({ pts: [], age: 9, life: 1, w: .03, fl: 1 });
  let next = 0; const take = () => { const st = strands[next]; next = (next + 1) % P; return st; };
  const R = () => Math.random(), rv = k => V((R() - .5) * k, (R() - .5) * k, (R() - .5) * k);
  const jag = (a, b, n, amp) => { const out = [], d = V().subVectors(b, a); for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().addScaledVector(d, t); if (i && i < n) p.add(rv(amp * 2 * (.4 + .6 * Math.sin(Math.PI * t)))); out.push(p); } return out; };
  const spawn = (pts, life, w) => { const st = take(); st.pts = pts.slice(0, M); st.age = 0; st.life = life; st.w = w; st.fl = 1; st.a = pts[0].clone(); st.b = pts[st.pts.length - 1].clone(); st.amp = st.a.distanceTo(st.b) * .22; return st; };
  const wp = V(), srcPos = () => { srcs[Math.floor(R() * srcs.length)].getWorldPosition(wp); return S.root.worldToLocal(wp.clone()); };
  const hist = []; let ht = 0, acc = 0;
  const cam = V(), tg = V(), vw = V(), sd = V();
  S.extras.push((sh, dt, t) => {
    dt = Math.min(dt, .05);
    if (S.P.d.prism) m.uniforms.uCol.value.setHSL((t * .15) % 1, .9, .6);
    const mv = sh.mode === sh.cfg.moving, spd = mv ? 16 : 5, boost = (mv ? 1.7 : 1) * (sh.fire ? 1.3 : 1);
    for (const st of strands) if (st.age < st.life) { st.age += dt; for (const p of st.pts) p.z += spd * dt; st.a && (st.a.z += spd * dt, st.b.z += spd * dt); }
    for (const h of hist) { h.age += dt; h.p.z += spd * dt; } while (hist.length && hist[0].age > .9) hist.shift();
    ht += dt; if (ht > .025) { ht = 0; for (const sc of [...new Set(srcs)]) { sc.getWorldPosition(wp); hist.push({ p: S.root.worldToLocal(wp.clone()), age: 0 }); } }
    /* irregular spawning: bursts and lulls (rate itself wanders) */
    const rate = (mode === 1 ? 14 : mode === 2 ? 26 : 9) * boost * (.35 + 1.3 * Math.pow(.5 + .5 * Math.sin(t * 2.3 + Math.sin(t * 5.1) * 2), 2));
    acc += dt * rate;
    while (acc >= 1) { acc -= 1;
      if (mode === 1) {          /* C1 lingering bolts: jagged forks torn off the wings / tail, hanging in the wake */
        const a = srcPos(), L = .5 + R() * 1.5, dir = V((R() - .5) * 1.4, (R() - .5) * .9, .6 + R() * .8).normalize(), b = a.clone().addScaledVector(dir, L);
        const main = jag(a, b, 7 + Math.floor(R() * 6), L * .16), life = .45 + R() * .8; spawn(main, life, .028 + R() * .02);
        if (R() < .65) { const k = 2 + Math.floor(R() * (main.length - 3)), d2 = dir.clone().add(rv(1.6)).normalize(), l2 = L * (.3 + R() * .4); spawn(jag(main[k], main[k].clone().addScaledVector(d2, l2), 4 + Math.floor(R() * 3), l2 * .2), life * .8, .018); }
      } else if (mode === 2) {   /* C2 chain lightning: arcs snapping between random points of the recent flight path, criss-crossing the wake */
        if (hist.length < 6) continue;
        const h1 = hist[Math.floor(R() * hist.length)], cand = hist.filter(h => h !== h1 && Math.abs(h.age - h1.age) > .05 && Math.abs(h.age - h1.age) < .45);
        if (!cand.length) continue; const h2 = cand[Math.floor(R() * cand.length)], d = h1.p.distanceTo(h2.p);
        if (d < .15 || d > 4) continue;
        spawn(jag(h1.p, h2.p, 8 + Math.floor(R() * 5), d * .18), .2 + R() * .45, .024 + R() * .02);
      } else {                   /* C3 discharge knots: little star-bursts of crackling electricity scattered behind, popping and fading */
        const c = srcPos().add(V((R() - .5) * .7, (R() - .5) * .5, .15 + R() * 1.3)), nb = 3 + Math.floor(R() * 3), life = .3 + R() * .55;
        for (let k = 0; k < nb; k++) { const d = rv(2).normalize(), l = .14 + R() * .36; spawn(jag(c, c.clone().addScaledVector(d, l), 3 + Math.floor(R() * 3), l * .25), life * (.7 + R() * .5), .02 + R() * .015); }
      } }
    cam.copy(camera.position); sh.root.worldToLocal(cam);
    for (let s = 0; s < P; s++) { const st = strands[s], alive = st.age < st.life;
      if (alive) { if (R() < dt * 7 && st.a) { const n = st.pts.length - 1; st.pts = jag(st.a, st.b, n, st.amp); }   /* re-strike: same ends, new zigzag */
        st.fl = R() < .18 ? .25 + R() * .4 : 1; }
      const n = st.pts.length, k = alive ? Math.pow(1 - st.age / st.life, 1.3) * st.fl * Math.min(1, st.age * 40 + .4) : 0;
      for (let i = 0; i < M; i++) { const v = (s * M + i) * 2, q = st.pts[Math.min(i, n - 1)];
        if (!alive || !q) { aA[v] = aA[v + 1] = 0; pos.fill(0, v * 3, v * 3 + 6); continue; }
        const pa = st.pts[Math.max(0, Math.min(i, n - 1) - 1)], pb = st.pts[Math.min(n - 1, i + 1)];
        tg.subVectors(pb, pa); if (tg.lengthSq() < 1e-8) tg.set(0, 0, 1); tg.normalize(); vw.subVectors(cam, q); sd.crossVectors(tg, vw).normalize();
        const wd = (i >= n ? 0 : st.w * 4) * (1 - .5 * i / M);
        pos.set([q.x - sd.x * wd, q.y - sd.y * wd, q.z - sd.z * wd, q.x + sd.x * wd, q.y + sd.y * wd, q.z + sd.z * wd], v * 3);
        aA[v] = aA[v + 1] = i >= n ? 0 : k; } }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
  });
}
/* ===== lightning trail (style C = B + trail): the two wing tips and the tail each leave ONE continuous line of electricity
   exactly along the path they flew — straight overall, but the line shivers with a fine irregular zig-zag that re-strikes ~20×/s,
   never breaking; bright at the bird, fading toward the old end ===== */
function ceTrailBolts(S) { if (NOFX) return;
  const P = 3, M = 40, NV = P * M * 2, pos = new Float32Array(NV * 3), aV = new Float32Array(NV), aA = new Float32Array(NV), idx = [];
  for (let s = 0; s < P; s++) for (let i = 0; i < M; i++) { const v = (s * M + i) * 2; aV[v] = -1; aV[v + 1] = 1; if (i < M - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1)); g.setIndex(idx);
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const m = new THREE.ShaderMaterial({ vertexShader: WAKE_VS, fragmentShader: WAKE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: gl.clone().multiplyScalar(.9) }, uCore: { value: new THREE.Color(1, 1, 1).lerp(gl, .15).multiplyScalar(1.5) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; S.root.add(mesh);
  const srcs = [...(S._ceTips || []).slice(0, 2), ...(S._ceTailTip ? [S._ceTailTip] : [])]; if (!srcs.length) return;
  const hist = srcs.map(() => []), jit = srcs.map(() => [...Array(M)].map(() => ({ o: V(), du: 0, w: 1, a: 1 }))), stT = srcs.map(() => 0), R = () => Math.random();
  const wp = V(), cam = V(), tg = V(), vw = V(), sd = V(); let ht = 0;
  const along = (H, u) => { const x = u * (H.length - 1), i = Math.min(H.length - 2, Math.floor(x)); return H[i].p.clone().lerp(H[i + 1].p, x - i); };
  S.extras.push((sh, dt, t) => {
    dt = Math.min(dt, .05); if (S.P.d.prism) m.uniforms.uCol.value.setHSL((t * .15) % 1, .9, .6);
    const mv = sh.mode === sh.cfg.moving, spd = mv ? 16 : 5, life = mv ? .55 : .8;
    hist.forEach(H => { for (const h of H) { h.age += dt; h.p.z += spd * dt; } while (H.length > 2 && H[H.length - 1].age > life) H.pop(); });
    ht += dt; if (ht > .016) { ht = 0; srcs.forEach((sc, i) => { sc.getWorldPosition(wp); hist[i].unshift({ p: S.root.worldToLocal(wp.clone()), age: 0 }); }); }
    srcs.forEach((sc, i) => { if (hist[i].length) { sc.getWorldPosition(wp); hist[i][0].p.copy(S.root.worldToLocal(wp)); } });
    /* re-strike each trail on its own random clock; every strike is a different irregular line:
       amplitude wanders along the length with random sharp kinks, sides flip unevenly, vertex spacing is uneven, width / brightness vary per point */
    jit.forEach((J, s) => { stT[s] -= dt; if (stT[s] > 0) return; stT[s] = .025 + R() * .07 + (R() < .1 ? .1 : 0);
      const lvl = .5 + R() * 1.1; let sgn = R() < .5 ? 1 : -1, env = R();
      J.forEach((v, i) => { env = env * .6 + R() * .4; if (R() < .72) sgn = -sgn;
        let a = (.018 + .055 * (i / M)) * lvl * (.25 + 1.5 * env); if (R() < .12) a *= 2.6 + R() * 1.5;
        v.o.set(sgn * a, (R() - .5) * 2 * a, (R() - .5) * a * .8); v.du = (R() - .5) * .7 / M; v.w = .6 + R() * .8; v.a = R() < .1 ? .35 + R() * .3 : .8 + R() * .4;
        if (i === 0) { v.o.set(0, 0, 0); v.du = 0; } }); });
    cam.copy(camera.position); sh.root.worldToLocal(cam);
    for (let s = 0; s < P; s++) { const H = hist[s] || [], J = jit[s] || [], flick = .7 + .3 * R() + (R() < .08 ? .6 : 0);
      for (let i = 0; i < M; i++) { const v = (s * M + i) * 2;
        if (H.length < 3) { aA[v] = aA[v + 1] = 0; pos.fill(0, v * 3, v * 3 + 6); continue; }
        const u = Math.min(1, Math.max(0, i / (M - 1) + J[i].du)), q = along(H, u).add(J[i].o), qa = along(H, Math.max(0, u - .02)), qb = along(H, Math.min(1, u + .02));
        tg.subVectors(qb, qa); if (tg.lengthSq() < 1e-8) tg.set(0, 0, 1); tg.normalize(); vw.subVectors(cam, q); sd.crossVectors(tg, vw).normalize();
        const wd = lp(.11, .05, u) * J[i].w;
        pos.set([q.x - sd.x * wd, q.y - sd.y * wd, q.z - sd.z * wd, q.x + sd.x * wd, q.y + sd.y * wd, q.z + sd.z * wd], v * 3);
        aA[v] = aA[v + 1] = Math.pow(1 - u, 1.3) * flick * J[i].a * Math.min(1, u * 30 + .3); } }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true;
  });
}
/* ===== C effects (B + one of these). shared jagged-strand renderer in root space ===== */
function ceFX(S, P = 80, M = 30) { if (NOFX) return;
  const NV = P * M * 2, pos = new Float32Array(NV * 3), aV = new Float32Array(NV), aA = new Float32Array(NV), idx = [];
  for (let s = 0; s < P; s++) for (let i = 0; i < M; i++) { const v = (s * M + i) * 2; aV[v] = -1; aV[v + 1] = 1; if (i < M - 1) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1)); g.setIndex(idx);
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const m = new THREE.ShaderMaterial({ vertexShader: WAKE_VS, fragmentShader: WAKE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: gl.clone().multiplyScalar(.9) }, uCore: { value: new THREE.Color(1, 1, 1).lerp(gl, .12).multiplyScalar(1.6) } } });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 6; S.root.add(mesh);
  const cam = V(), tg = V(), vw = V(), sd = V(), R = Math.random;
  const fx = { list: [], gl, R, rv: k => V((R() - .5) * k, (R() - .5) * k, (R() - .5) * k),
    jag(a, b, n, amp) { const out = [], d = V().subVectors(b, a); for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().addScaledVector(d, t); if (i && i < n) p.add(fx.rv(amp * 2 * (.35 + .65 * Math.sin(Math.PI * t)))); out.push(p); } return out; },
    ring(c, r, n, amp, ax = 'y', ph = 0) { const out = []; for (let i = 0; i <= n; i++) { const a = ph + i / n * TAU, rr = r + (i && i < n ? (R() - .5) * 2 * amp : 0); const p = ax === 'y' ? V(Math.cos(a) * rr, (R() - .5) * amp, Math.sin(a) * rr) : V(Math.cos(a) * rr, Math.sin(a) * rr, (R() - .5) * amp); out.push(p.add(c)); } out[n] = out[0].clone(); return out; },
    render(sh, t) {
      if (S.P.d.prism) m.uniforms.uCol.value.setHSL((t * .15) % 1, .9, .6);
      cam.copy(camera.position); sh.root.worldToLocal(cam);
      for (let s = 0; s < P; s++) { const st = fx.list[s];
        for (let i = 0; i < M; i++) { const v = (s * M + i) * 2;
          if (!st || i >= st.pts.length) { aA[v] = aA[v + 1] = 0; pos.fill(0, v * 3, v * 3 + 6); continue; }
          const n = st.pts.length, q = st.pts[i], pa = st.pts[Math.max(0, i - 1)], pb = st.pts[Math.min(n - 1, i + 1)];
          tg.subVectors(pb, pa); if (tg.lengthSq() < 1e-8) tg.set(0, 1, 0); tg.normalize(); vw.subVectors(cam, q); sd.crossVectors(tg, vw).normalize();
          const wd = st.w * 4 * (st.taper ? 1 - .6 * i / n : 1);
          pos.set([q.x - sd.x * wd, q.y - sd.y * wd, q.z - sd.z * wd, q.x + sd.x * wd, q.y + sd.y * wd, q.z + sd.z * wd], v * 3);
          aA[v] = aA[v + 1] = st.a * (st.fade ? 1 - .7 * i / n : 1); } }
      g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; } };
  return fx;
}
const ceFlare = (S, c) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); S.root.add(sp); return sp; };
/* C1 낙뢰 소환: heavy bolts slam down from the sky onto / right beside the bird at random, re-striking 2–3 times, with an impact flare and a spray of sparks */
function ceSkyStrike(S) { if (NOFX) return;
  const fx = ceFX(S, 40, 30), B = S.body, anch = [], v = V(); B.updateMatrixWorld(true);
  B.traverse(o => { if (!o.isMesh || !o.geometry.attributes.position) return; const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += Math.max(1, pa.count / 30 | 0)) anch.push({ o, i }); });
  const flare = ceFlare(S, fx.gl.clone().lerp(new THREE.Color(1, 1, 1), .5)), ev = []; let next = .4;
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05); next -= dt;
    if (next <= 0) { next = .5 + fx.R() * 1.6 + (fx.R() < .25 ? 1.2 : 0);
      const an = anch[Math.floor(fx.R() * anch.length)], tgt = v.fromBufferAttribute(an.o.geometry.attributes.position, an.i).applyMatrix4(an.o.matrixWorld).clone(); sh.root.worldToLocal(tgt);
      if (fx.R() < .35) tgt.add(V((fx.R() - .5) * 3, 0, (fx.R() - .5) * 3));
      ev.push({ tgt, top: tgt.clone().add(V((fx.R() - .5) * 3, 9 + fx.R() * 3, (fx.R() - .5) * 2)), age: 0, life: .42 + fx.R() * .25, hits: 2 + Math.floor(fx.R() * 2), rt: 0 }); }
    fx.list.length = 0; let fl = 0;
    for (let k = ev.length - 1; k >= 0; k--) { const e = ev[k]; e.age += dt; if (e.age > e.life) { ev.splice(k, 1); continue; }
      e.rt -= dt; if (e.rt <= 0 || !e.main) { e.rt = e.life / e.hits; e.main = fx.jag(e.top, e.tgt, 28, 1.1); e.br = [];
        for (let b = 0; b < 4; b++) { const i = 4 + Math.floor(fx.R() * 18), p = e.main[i]; e.br.push(fx.jag(p, p.clone().add(V((fx.R() - .5) * 4, -1.5 - fx.R() * 2.5, (fx.R() - .5) * 2)), 8, .35)); }
        e.sp = []; for (let b = 0; b < 6; b++) { const d = fx.rv(2).normalize(); d.y = Math.abs(d.y) * .6; e.sp.push(fx.jag(e.tgt, e.tgt.clone().addScaledVector(d, .3 + fx.R() * .6), 4, .12)); }
        S._ceKick && S._ceKick(.9); }
      const ph = (e.age % (e.life / e.hits)) / (e.life / e.hits), a = (1 - ph) * (fx.R() < .2 ? .5 : 1);
      fx.list.push({ pts: e.main, w: .07, a: a * 1.3 }); e.br.forEach(b => fx.list.push({ pts: b, w: .03, a: a * .8, taper: 1, fade: 1 })); e.sp.forEach(b => fx.list.push({ pts: b, w: .025, a, taper: 1, fade: 1 }));
      if (a > fl) { fl = a; flare.position.copy(e.tgt); } }
    flare.material.opacity = fl * .9; flare.scale.setScalar(1.5 + fl * 3.5);
    fx.render(sh, t); });
}
/* C2 날갯짓 방전: every wing beat (top and bottom of the stroke) bursts a fan of forked bolts out of the feather tips */
function ceWingDischarge(S) { if (NOFX) return;
  const fx = ceFX(S, 70, 12), srcs = [...(S._ceTips || []), ...(S._ceWingEdge || [])], wp = V(), sh0 = V(); let prev = 0, bursts = [];
  if (!srcs.length) return;
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05);
    const c = Math.cos(t * 1.4), beat = (prev > 0) !== (c > 0) && false; const s = Math.sin(t * 1.4);
    if ((prev < .97 && Math.abs(s) >= .97) || (sh.fire && fx.R() < dt * 2)) {   /* stroke extremes (+ extra pops while attacking) */
      srcs.forEach(sc => { sc.getWorldPosition(wp); const p = sh.root.worldToLocal(wp.clone()); sc.parent.getWorldPosition(sh0); sh.root.worldToLocal(sh0);
        const out = V().subVectors(p, sh0).setY(0).normalize(); for (let k = 0; k < 2 + Math.floor(fx.R() * 2); k++) { const d = out.clone().add(fx.rv(1.3)).add(V(0, (fx.R() - .5) * .8, .3)).normalize(), L = .6 + fx.R() * 1.1;
          bursts.push({ pts: fx.jag(p, p.clone().addScaledVector(d, L), 10, L * .16), age: 0, life: .22 + fx.R() * .2, w: .03 + fx.R() * .015 }); } });
      S._ceKick && S._ceKick(.5); }
    prev = Math.abs(s);
    fx.list.length = 0; const spd = sh.mode === sh.cfg.moving ? 10 : 2;
    bursts = bursts.filter(b => (b.age += dt) < b.life); bursts.forEach(b => { b.pts.forEach(p => p.z += spd * dt); if (fx.R() < dt * 25) { const a = b.pts[0], z = b.pts[b.pts.length - 1]; b.pts = fx.jag(a, z, 10, a.distanceTo(z) * .16); }
      fx.list.push({ pts: b.pts, w: b.w, a: (1 - b.age / b.life) * (fx.R() < .2 ? .5 : 1.2), taper: 1, fade: 1 }); });
    fx.render(sh, t); });
}
/* C3 전격 충격파: crackling rings of lightning pulse out from the body and expand away, every 1–3 s (double pulses sometimes) */
function ceShockwave(S) { if (NOFX) return;
  const fx = ceFX(S, 8, 64), B = S.body, c = V(); let next = .3, rings = [];
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05); next -= dt;
    if (next <= 0) { next = 1 + fx.R() * 2; const two = fx.R() < .35; rings.push({ age: 0, life: .75, tilt: (fx.R() - .5) * .5 }); if (two) rings.push({ age: -.16, life: .75, tilt: (fx.R() - .5) * .5 }); S._ceKick && S._ceKick(.6); }
    B.getWorldPosition(c); sh.root.worldToLocal(c); c.y += .15;
    fx.list.length = 0; rings = rings.filter(r => (r.age += dt) < r.life);
    rings.forEach(r => { if (r.age < 0) return; const u = r.age / r.life, rad = .4 + 4.2 * (1 - Math.pow(1 - u, 2.2)), pts = fx.ring(c, rad, 62, .06 + rad * .05, 'y', t * .5);
      const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), r.tilt); pts.forEach(p => p.sub(c).applyQuaternion(q).add(c));
      fx.list.push({ pts, w: lp(.05, .02, u), a: (1 - u) * 1.3 * (fx.R() < .15 ? .5 : 1) }); });
    fx.render(sh, t); });
}
/* C4 번개 후광: a ring of lightning behind the bird's back, slowly turning, with short bolts radiating out like sun-rays */
function ceHalo(S) {
  const fx = ceFX(S, 14, 64), B = S.body, c = V(), glow = ceFlare(S, fx.gl.clone().multiplyScalar(.5)); let rt = 0, ring = null, rays = [];
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05);
    B.getWorldPosition(c); sh.root.worldToLocal(c); c.y += .75; c.z += .45;
    rt -= dt; if (rt <= 0 || !ring) { rt = .04 + fx.R() * .05; const ph = t * .4;
      ring = fx.ring(V(), 1.55, 62, .07, 'z', ph);
      rays = []; for (let k = 0; k < 12; k++) { const a = ph + k / 12 * TAU, r0 = 1.62, L = .25 + fx.R() * .45 + (k % 3 === 0 ? .3 : 0); rays.push(fx.jag(V(Math.cos(a) * r0, Math.sin(a) * r0, 0), V(Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L), 0), 4, .06)); } }
    fx.list.length = 0; const pulse = .75 + .25 * Math.sin(t * 2.4) + (fx.R() < .06 ? .5 : 0);
    fx.list.push({ pts: ring.map(p => p.clone().add(c)), w: .04, a: pulse });
    fx.list.push({ pts: fx.ring(V(), 1.25, 62, .05, 'z', -t * .6).map(p => p.add(c)), w: .018, a: pulse * .55 });
    rays.forEach(r => fx.list.push({ pts: r.map(p => p.clone().add(c)), w: .022, a: pulse * .8, taper: 1, fade: 1 }));
    glow.position.copy(c); glow.material.opacity = .25 * pulse; glow.scale.setScalar(4.2);
    fx.render(sh, t); });
}
function ceFeatherWing(S, s) {
  const K = ceKit(S), r = ceWingGeo(s), sh = V(s * .22, .2, -.38), g = new THREE.Group(), fl = new THREE.Group(); fl.position.copy(sh); g.add(fl);
  const pos = new Float32Array(r.pos), col = new Float32Array(r.pos.length);
  for (let i = 0; i < r.fid.length; i++) { const id = r.fid[i], v = .68 + .5 * (Math.sin(id * 12.9 + s * 4.1) * .5 + .5); col.set([v, v, v], i * 3); }
  for (let i = 0; i < pos.length; i += 3) { pos[i] -= sh.x; pos[i + 1] -= sh.y; pos[i + 2] -= sh.z; }   /* pivot at the shoulder so the flap swings from the body */
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone(), vertexColors: true, metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide });
  S.extras.push((shp, dt, t) => { m.emissiveIntensity = .7 + .25 * Math.sin(t * 6.7 + s) * Math.sin(t * 2.5) + (Math.random() < dt * 5 ? 1.4 : 0); });
  if (S._fire) tipAttrIds(geo, r.fid); fl.add(new THREE.Mesh(geo, m));
  if (S._fire) { const best = {}; for (let i = 0; i < r.fid.length; i++) { const id = r.fid[i], d = pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2; if (!best[id] || d > best[id][0]) best[id] = [d, i]; }
    (S._fWing || (S._fWing = [])).push({ fl, pts: Object.values(best).map(([, i]) => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])) }); }
  /* contrail sources: the outermost wing tip, plus the tips of the long feathers along the trailing edge */
  { let bi = 0; for (let i = 0; i < pos.length; i += 3) if (s * pos[i] > s * pos[bi]) bi = i;
    (S._ceTips || (S._ceTips = [])).push(emitter(fl, pos[bi], pos[bi + 1], pos[bi + 2]));
    const ft = {}; for (let i = 0; i < r.fid.length; i++) { const id = r.fid[i], d = pos[i * 3] * pos[i * 3] + pos[i * 3 + 2] * pos[i * 3 + 2]; if (!ft[id] || d > ft[id][0]) ft[id] = [d, i]; }
    for (const id in ft) { const i = ft[id][1]; if (pos[i * 3 + 2] > .3) (S._ceWingEdge || (S._ceWingEdge = [])).push(emitter(fl, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); } }
  return { g, fl };
}
function ceWing(S, s) {
  const g = new THREE.Group(), sh = V(s * .3, .1, -.2), fl = new THREE.Group(); fl.position.copy(sh); g.add(fl);
  const inner = new THREE.Group(); inner.position.copy(sh).multiplyScalar(-1); fl.add(inner);
  CE_LAYOUT.covert.forEach(sp => ceSpike(S, inner, sp, s, ceKit(S).crystalDim, .05));
  CE_LAYOUT.wing.forEach(sp => ceSpike(S, inner, sp, s));
  ceGoldMark(S, inner, CE_LAYOUT.gold.map(p => V(s * p[0], p[1] + .03, p[2])), .07);
  const tips = CE_LAYOUT.wing.slice(0, 4).map(sp => { const yaw = sp.yaw * Math.PI / 180, pit = sp.pitch * Math.PI / 180; return emitter(inner, s * sp.b[0] + s * Math.cos(yaw) * Math.cos(pit) * sp.L, sp.b[1] + Math.sin(pit) * sp.L, sp.b[2] + Math.sin(yaw) * Math.cos(pit) * sp.L); });
  arcs(S, [[tips[0], tips[1]], [tips[2], tips[3]]], S.P.glow, { force: true, w: .35, fl: .4, p: .25, pf: .5 });
  return { g, fl };
}
/* eye options for the crystal eagle (picked with the 눈 buttons) */
/* eye COLOUR options for the thunderbird (shape stays the lightning slit); compared with the 눈 buttons */
const CE_EYE_COL = [['노랑', 0xffd21a], ['백색', 0xffffff], ['적색', 0xff2a2a], ['주황', 0xff7a12], ['청록', 0x2affe0], ['자주', 0xd040ff], ['청색', 0x2a7aff], ['흑안', 0x101018]];
const CE_EYES = CE_EYE_COL.map(c => c[0]);
let ceEyeIdx = 4;   /* 청록 chosen */
function ceEyes(S, B, kind) {
  const K = ceKit(S), gl = K.gl, hot = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, side: THREE.DoubleSide });
  const glow = (sx, sy, c, o = .85) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.scale.set(sx, sy, 1); return sp; };
  const almond = (A, Bt, Bb) => { const s = new THREE.Shape(); s.moveTo(-A, 0); s.quadraticCurveTo(-A * .1, Bt * 2, A, Bt * .35); s.quadraticCurveTo(A * .05, -Bb * 2, -A, 0); return s; };
  for (const s of [1, -1]) {
    // stick the eye onto the actual faceted face: cast a ray at the head and sit the eye on the facet it hits
    let pos = V(s * .12, .3, -1.2), n = V(s, .1, -.2).normalize();
    if (S._ceHead) { const rc = new THREE.Raycaster(V(s * 1.5, .3, -1.2), V(-s, 0, 0)), hit = rc.intersectObject(S._ceHead)[0]; if (hit) { pos = hit.point.clone(); n = hit.face.normal.clone(); if (n.x * s < 0) n.negate(); } }
    pos.addScaledVector(n, .002); // sit on the facet surface
    const xa = V().crossVectors(V(0, 1, 0), n).normalize(), ya = V().crossVectors(n, xa);
    const eg = new THREE.Group(); eg.position.copy(pos); eg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, n)); B.add(eg);
    const g = new THREE.Group(); g.rotation.z = -s * .3; g.position.z = .004; eg.add(g);  // slant: the corner nearest the beak sits lower
    if (kind === 0) {        // white-hot faceted slit
      // slit eye in the lightning colour (bigger), no halo
      // the slit is draped onto the face: every vertex is projected onto the actual head surface, so no part can stick out past the face
      // finely subdivided diamond slit so it can bend with the face
      const NU = 16, NV = 4, sp2 = [], si = []; for (let a = 0; a <= NU; a++) for (let b = 0; b <= NV; b++) { const u = a / NU * 2 - 1, v = b / NV * 2 - 1; sp2.push(u * .11, v * .028 * (1 - Math.abs(u)), 0); if (a < NU && b < NV) { const p = a * (NV + 1) + b, q = p + NV + 1; si.push(p, q, p + 1, q, q + 1, p + 1); } }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp2, 3)); sg.setIndex(si); g.updateMatrixWorld(true); eg.updateMatrixWorld(true);
      const toB = new THREE.Matrix4().copy(eg.matrix).multiply(g.matrix), pa = sg.attributes.position, rc2 = new THREE.Raycaster(), vv = V();
      for (let q = 0; q < pa.count; q++) { vv.set(pa.getX(q), pa.getY(q), 0).applyMatrix4(toB); if (S._ceHead) { rc2.set(vv.clone().addScaledVector(n, .3), n.clone().negate()); const h2 = rc2.intersectObject(S._ceHead)[0]; if (h2) vv.copy(h2.point).addScaledVector(n, .004); } pa.setXYZ(q, vv.x, vv.y, vv.z); }
      sg.computeVertexNormals();
      { const ec = CE_EYE_COL[ceEyeIdx] || CE_EYE_COL[0], em = new THREE.MeshBasicMaterial({ color: (S._fireEye ? S._fireEye.clone() : new THREE.Color(ec[1])).multiplyScalar(ec[1] === 0x101018 ? 1 : 1.25), toneMapped: false, side: THREE.DoubleSide }); B.add(new THREE.Mesh(sg, em)); const base = em.color.clone(); S.extras.push((sh, dt, t) => { em.color.copy(base).multiplyScalar(.9 + .25 * Math.random() + (Math.random() < dt * 3 ? .8 : 0)); }); }
    } else if (kind === 1) { // glowing almond with a dark lid line
      const sh = almond(.07, .028, .02), e = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), hot(new THREE.Color(1, 1, 1).lerp(gl, .12).multiplyScalar(1.7))); g.add(e);
      const o = almond(.082, .036, .028); o.holes.push(sh); const lid = new THREE.Mesh(new THREE.ShapeGeometry(o, 10), new THREE.MeshBasicMaterial({ color: 0x060a1a, side: THREE.DoubleSide })); lid.position.z = -.001; g.add(lid); g.add(glow(.3, .17, gl.clone().multiplyScalar(.75)));
    } else if (kind === 2) { // gem eye: blue crystal set in a faceted gold ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.05, .014, 4, 8), K.gold); g.add(ring);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.042, 0), new THREE.MeshStandardMaterial({ color: gl.clone().lerp(new THREE.Color(1, 1, 1), .3), emissive: gl.clone().multiplyScalar(1.2), metalness: .2, roughness: .05, flatShading: true })); gem.scale.set(1, 1, .7); g.add(gem);
      S.extras.push((sh, dt, t) => { gem.rotation.z = t * .8; }); g.add(glow(.26, .26, gl.clone().multiplyScalar(.7)));
    } else if (kind === 3) { // raptor eye: gold iris, black pupil, glint, heavy dark brow wedge
      g.add(new THREE.Mesh(new THREE.CircleGeometry(.046, 16), hot(new THREE.Color(1, .78, .2).multiplyScalar(1.2))));
      const p = new THREE.Mesh(new THREE.CircleGeometry(.02, 12), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })); p.position.set(.006, 0, .001); g.add(p);
      const gl1 = new THREE.Mesh(new THREE.CircleGeometry(.008, 8), hot(new THREE.Color(2, 2, 2))); gl1.position.set(-.012, .014, .002); g.add(gl1);
      const brow = new THREE.Shape(); brow.moveTo(-.075, .02); brow.lineTo(.075, .055); brow.lineTo(.07, .012); brow.lineTo(-.06, .036); const bw = new THREE.Mesh(new THREE.ShapeGeometry(brow), K.body); bw.position.z = .006; g.add(bw);
    } else {                 // black eye with a glowing lightning slit
      const sh = almond(.07, .03, .022); g.add(new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), new THREE.MeshBasicMaterial({ color: 0x03050c, side: THREE.DoubleSide })));
      const sl = new THREE.Shape(); sl.moveTo(-.006, .028); sl.lineTo(.008, .004); sl.lineTo(-.002, .002); sl.lineTo(.008, -.026); sl.lineTo(-.008, -.002); sl.lineTo(.002, -.002); sl.closePath();
      const slit = new THREE.Mesh(new THREE.ShapeGeometry(sl), hot(gl.clone().lerp(new THREE.Color(1, 1, 1), .3).multiplyScalar(1.8))); slit.position.z = .001; g.add(slit); g.add(glow(.22, .22, gl.clone().multiplyScalar(.6), .7));
    }
  }
}
/* per-vertex 'how far along the feather' (0 root -> 1 tip), used by the fire material.
   blade soups (mane / body plumage): 6 triangles per blade, tip vertex at slots 2,5,8,11, ridge at 1,3,17.
   id-tagged feathers (wing / tail): distance from the feather's own tip, normalised per feather. */
function tipAttrBlades(g) { const n = g.attributes.position.count, a = new Float32Array(n);
  for (let v = 0; v < n; v++) { const s = v % 18; a[v] = (s === 2 || s === 5 || s === 8 || s === 11) ? 1 : (s === 1 || s === 3 || s === 17) ? .4 : 0; }
  g.setAttribute('aTip', new THREE.BufferAttribute(a, 1)); }
function tipAttrIds(g, fid) { const p = g.attributes.position, n = p.count, tip = {}, far = {}, P = V(), a = new Float32Array(n);
  for (let v = 0; v < n; v++) { const id = fid[v], d = P.fromBufferAttribute(p, v).lengthSq(); if (!tip[id] || d > tip[id][0]) tip[id] = [d, P.clone()]; }
  for (let v = 0; v < n; v++) { const id = fid[v], d = P.fromBufferAttribute(p, v).distanceTo(tip[id][1]); far[id] = Math.max(far[id] || 0, d); }
  for (let v = 0; v < n; v++) { const id = fid[v]; a[v] = 1 - P.fromBufferAttribute(p, v).distanceTo(tip[id][1]) / (far[id] || 1); }
  g.setAttribute('aTip', new THREE.BufferAttribute(a, 1)); }
function ceEagle(S) {
  S._ceTips = []; S._ceWingEdge = []; S._ceTailTip = null;
  if (!S._fire) S._fTips = null; S._fWing = []; S._fTail = null;
  const B = S.body, K = ceKit(S); S.sparkEm = []; K.edges = [];
  // body: streamlined bird form — a slim neck rising from the head, full rounded breast, then one long taper to the tail
  { /* bird body: short egg-shaped trunk, flat back, deep keeled breast (taller than wide), thick short neck into the head, ends at the rump */
    const T = [[-.74, .19, .19, .18, .18], [-.62, .14, .22, .19, .22], [-.48, .08, .26, .2, .26], [-.3, .05, .28, .2, .28], [-.1, .06, .28, .19, .26], [.12, .08, .25, .17, .21], [.32, .1, .19, .13, .15], [.5, .11, .11, .08, .08], [.6, .11, .03, .02, .02]];
    const at = (z, k) => { let i = 0; while (i < T.length - 2 && z > T[i + 1][0]) i++; const h = T[i + 1][0] - T[i][0], t = Math.min(1, Math.max(0, (z - T[i][0]) / h));
      const sl = j => { const a = T[Math.max(0, j - 1)], b = T[Math.min(T.length - 1, j + 1)]; return (b[k] - a[k]) / (b[0] - a[0]) * h; };   /* smooth hermite: no ripples between keys */
      const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * T[i][k] + (t3 - 2 * t2 + t) * sl(i) + (-2 * t3 + 3 * t2) * T[i + 1][k] + (t3 - t2) * sl(i + 1); };
    const NR = 18, NS = 10, zs = [...Array(NR)].map((_, i) => lp(-.74, .6, i / (NR - 1))), pos = [];
    const ring = zs.map(z => { const cy = at(z, 1), rx = at(z, 2), rt = at(z, 3), rb = at(z, 4); return [...Array(NS)].map((_, k) => { const th = Math.PI / 2 + k / NS * TAU, c = Math.cos(th), s = Math.sin(th);
      const keel = s < 0 ? 1 - .5 * Math.pow(-s, 1.6) : 1;   /* sides pinch in toward the keel line under the breast */
      return V(rx * c * keel, cy + (s > 0 ? rt * Math.pow(s, .8) : rb * s), z); }); });
    const q = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let r = 0; r < NR - 1; r++) for (let k = 0; k < NS; k++) { const a = ring[r][k], b = ring[r][(k + 1) % NS], c = ring[r + 1][(k + 1) % NS], d = ring[r + 1][k]; q(a, b, c); q(a, c, d); }
    const tail = V(0, at(.6, 1), .64); for (let k = 0; k < NS; k++) q(ring[NR - 1][k], ring[NR - 1][(k + 1) % NS], tail);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const trunkM = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone(), metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide });   /* trunk in lightning colour too */
    S.extras.push((sh, dt, t) => { trunkM.emissiveIntensity = .7 + .25 * Math.sin(t * 4.7 + 3) * Math.sin(t * 1.9) + (Math.random() < dt * 4 ? 1.3 : 0); });
    S._ceBody = new THREE.Mesh(g, trunkM); B.add(S._ceBody); S._ceBodyAt = at; }
  /* body plumage: dense, irregular spike feathers (same thick blade as the neck mane) covering the whole trunk.
     each row is a closed ring raycast onto the body; neighbouring blades share base corners so no skin shows;
     rows are packed closer than the blade length so they shingle; angle, length, lift and sweep are all randomised */
  { const hr = (a, b) => { const v = Math.sin(a * 61.3 + b * 27.9 + 3.1) * 43758.5; return v - Math.floor(v); }, rc = new THREE.Raycaster(), pos = [], at = S._ceBodyAt;
    const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    const onBody = (z, th) => { const cy = at(z, 1), from = V(Math.cos(th) * 2, cy + Math.sin(th) * 2, z); rc.set(from, V(0, cy, z).sub(from).normalize()); const h = rc.intersectObject(S._ceBody)[0]; return h ? h.point : V(Math.cos(th) * at(z, 2), cy + Math.sin(th) * at(z, 3), z); };
    const NRW = 22;
    for (let r = 0; r < NRW; r++) {
      const u = r / (NRW - 1), z0 = lp(-.77, .5, u), n = Math.round(lp(13, 9, u)), a0 = hr(r, 1) * TAU, Lk = lp(.62, .17, Math.pow(u, .6));   /* first rows match the mane's size, then shrink smoothly toward the tail */
      const P = []; for (let k = 0; k < n; k++) { const th = a0 + (k + (hr(r, k + 20) - .5) * .5) / n * TAU; P.push(onBody(z0 + (hr(r, k + 40) - .5) * .05, th)); } P.push(P[0]);
      const C = V(0, at(z0, 1), z0);
      for (let k = 0; k < n; k++) {
        const a = P[k], b = P[k + 1], m = a.clone().lerp(b, .5), out = V().subVectors(m, C).setZ(0).normalize();
        const L = Lk * (.6 + .8 * hr(r, k + 60)), lift = lp(.75, .2, u) + .35 * hr(r, k + 80), th = lp(.09, .04, u);
        const d = out.clone().multiplyScalar(lift).add(V((hr(r, k + 100) - .5) * .35, (hr(r, k + 120) - .5) * .2, 1)).normalize();
        const tip = m.clone().addScaledVector(d, L); if (S._fTips && (k + r) % 2 === 0) S._fTips.push(tip.clone()); const inner = m.clone().addScaledVector(out, -th).add(V(0, 0, th * 1.6)), ridge = m.clone().addScaledVector(out, th * 1.1).addScaledVector(d, L * .3);
        tri(a, ridge, tip); tri(ridge, b, tip); tri(b, inner, tip); tri(inner, a, tip); tri(a, inner, b); tri(a, b, ridge);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); const cl = new Float32Array(pos.length), c = new THREE.Color();   /* per-blade brightness so the plumage crackles unevenly */
    for (let t = 0; t < pos.length / 9; t++) { const bl = Math.floor(t / 6), v = .7 + .5 * hr(bl, 7); c.setRGB(v, v, v); for (let q = 0; q < 3; q++) cl.set([c.r, c.g, c.b], t * 9 + q * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    const plumeM = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone(), vertexColors: true, metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide });
    S.extras.push((sh, dt, t) => { const fl = Math.random() < dt * 5 ? 1.4 : 0; plumeM.emissiveIntensity = .7 + .25 * Math.sin(t * 7.3) * Math.sin(t * 2.3) + fl; });
    if (S._fire) tipAttrBlades(g); B.add(new THREE.Mesh(g, plumeM)); }
  // head: faceted skull, neck, crest of crystal spikes with a gold mark
  // head + beak as ONE smooth piece: a straight pointed beak whose top line runs on up the forehead to the crown, then breaks down into the neck.
  // colour fades from body blue to gold along the beak (vertex colours), so there is no seam between face and beak
  { const NZ = 12, Z = [...Array(NZ)].map((_, i) => lp(-.72, -1.34, i / (NZ - 1))).map((z, i, A) => { const j = A.reduce((b, v, k) => Math.abs(v + .93) < Math.abs(A[b] + .93) ? k : b, 0); return i === j ? -.93 : z; }) /* exactly one ring on the crown peak */, RXk = [-.72, -.82, -.93, -1.05, -1.2, -1.34, -1.45, -1.57, -1.68, -1.77], RXv = [.2, .19, .18, .16, .13, .1, .078, .052, .026, .004];
    const RX = Z.map(z => { let i = 0; while (i < RXk.length - 2 && z < RXk[i + 1]) i++; return lp(RXv[i], RXv[i + 1], (RXk[i] - z) / (RXk[i] - RXk[i + 1])); });
    const top = z => z > -.93 ? lp(.37, .55, (z + .72) / -.21) : lp(.55, .205, (z + .93) / -.84), bot = z => z > -.93 ? lp(0, .07, (z + .72) / -.21) : lp(.07, .2, Math.pow((z + .93) / -.84, 1.4));
    const pts = Z.map(z => V(0, (top(z) + bot(z)) / 2, z)), geo = ceTube(pts, u => { const i = Math.round(u * (Z.length - 1)); const tp = 1 - THREE.MathUtils.smoothstep(-Z[i], 1.16, 1.32) * .6; return [RX[i] * tp, Math.max(.004, (top(Z[i]) - bot(Z[i])) / 2) * tp]; }, 8, { rot: Math.PI / 8 }); /* a flat facet faces each side, so the eye sits on a face, not on an edge */ // face narrows into the beak root so no end face shows // evenly spaced rings, 8 symmetric sides, no random jitter → regular facets
    const blue = K.lc.clone(), gold = new THREE.Color(0xf2c94c), pa = geo.attributes.position, col = new Float32Array(pa.count * 3), c = new THREE.Color();
    for (let k = 0; k < pa.count; k++) { const t = 0; /* face stays blue; the gold hooked beak is a separate piece */ c.copy(blue).lerp(gold, t); col.set([c.r, c.g, c.b], k * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const headM = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide, emissive: K.le.clone() });   /* head in lightning colour, same flicker as the feathers */
    S.extras.push((sh, dt, t) => { const fl = Math.random() < dt * 4 ? 1.3 : 0; headM.emissiveIntensity = .7 + .25 * Math.sin(t * 5.3 + 2) * Math.sin(t * 2.1) + fl; });
    S._ceHead = new THREE.Mesh(geo, headM); B.add(S._ceHead); }
  // the earlier gold hooked beak: triangular section, thick run then one bend into the hook, lower beak tucked under it
  // beak in lightning colour: pale electric crystal that flickers like a live charge, with zig-zag bolt lines inlaid along both sides
  const boltBeakM = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone().multiplyScalar(1.2), metalness: K.met, roughness: K.rough * .8, flatShading: true, side: THREE.DoubleSide }); boltBeakM.userData.beak = true;
  { const lineM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(K.gl, .15).multiplyScalar(1.6), toneMapped: false });
    S.extras.push((sh, dt, t) => { const fl = Math.random() < dt * 4 ? 1.6 : 0; boltBeakM.emissiveIntensity = .75 + .25 * Math.sin(t * 9) * Math.sin(t * 3.1) + fl; lineM.color.setScalar(1).lerp(K.gl, .15).multiplyScalar(1.3 + .5 * Math.random() * (fl ? 2 : 1)); }); }
  B.add(new THREE.Mesh(ceTube([V(0, .255, -1.2), V(0, .26, -1.32), V(0, .26, -1.42), V(0, .23, -1.52), V(0, .15, -1.6), V(0, .06, -1.6)], u => { const k = u < .5 ? lp(.88, 1, u / .5) : lp(1, .05, (u - .5) / .5); return [.11 * k, .1 * k]; }, 3, { tri: true }), boltBeakM)); // root starts inside the face
  B.add(new THREE.Mesh(ceTube([V(0, .19, -1.18), V(0, .18, -1.34), V(0, .17, -1.44), V(0, .16, -1.5)], u => [lp(.095, .015, u), lp(.065, .01, u)], 3, { tri: true, up: V(0, -1, 0) }), boltBeakM)); // closed against the upper beak
  ceEyes(S, B, 0);   /* shape fixed: lightning slit; ceEyeIdx only picks the colour */
  // mane: a CONTINUOUS serrated collar that follows the face outline — neighbouring spike bases share their corners,
  // so the fringe has no gaps; two staggered rows, big irregular spikes swept back and out in every direction
  { const hr = (a, b) => { const v = Math.sin(a * 91.7 + b * 37.3) * 43758.5; return v - Math.floor(v); }, rc = new THREE.Raycaster(), pos = [];
    const ringOn = (z, n, a0) => { const pts = []; for (let k = 0; k <= n; k++) { const th = a0 + k / n * TAU, cy = .26, from = V(Math.cos(th) * 2, cy + Math.sin(th) * 2, z); rc.set(from, V(0, cy, z).sub(from).normalize()); const h = rc.intersectObject(S._ceHead)[0]; pts.push(h ? h.point : V(Math.cos(th) * .18, cy + Math.sin(th) * .15, z)); } return pts; };
    const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (const [z, n, Lk, a0, row] of [[-1.0, 13, .85, .15, 0], [-.93, 13, .95, .39, 1], [-.86, 13, .85, .63, 2], [-.79, 13, .7, .87, 3]]) { // starts behind the eyes, 4 tight staggered rows so no skin shows between
      const P = ringOn(z, n, a0), C = V(0, .26, z);
      for (let k = 0; k < n; k++) {
        const a = P[k], b = P[k + 1], m = a.clone().lerp(b, .5), out = V().subVectors(m, C).setZ(0).normalize(), th = Math.atan2(out.y, out.x);
        const L = Lk * (.55 + .65 * hr(k, row + 3)) * (Math.sin(th) > -.45 ? 1 : .45), d = out.clone().multiplyScalar(.85).add(V(0, .2, .95 + row * .2 + hr(k, row + 7) * .35)).add(V((hr(k, row + 1) - .5) * .35, (hr(k, row + 2) - .5) * .35, 0)).normalize();
        const tip = m.clone().addScaledVector(d, L); if (S._fTips) S._fTips.push(tip.clone()); const inner = m.clone().addScaledVector(out, -.09).add(V(0, 0, .16)), ridge = m.clone().addScaledVector(out, .1).addScaledVector(d, L * .3);
        tri(a, ridge, tip); tri(ridge, b, tip); tri(b, inner, tip); tri(inner, a, tip); tri(a, inner, b); tri(a, b, ridge);   // thick blade: raised outer ridge + back faces + base
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); const cl = new Float32Array(pos.length), c = new THREE.Color();   /* mane in lightning colour too, per-blade brightness */
    for (let t = 0; t < pos.length / 9; t++) { const v = .7 + .5 * hr(Math.floor(t / 6), 11); c.setRGB(v, v, v); for (let q = 0; q < 3; q++) cl.set([c.r, c.g, c.b], t * 9 + q * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
    const maneM = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone(), vertexColors: true, metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide });
    S.extras.push((sh, dt, t) => { const fl = Math.random() < dt * 5 ? 1.4 : 0; maneM.emissiveIntensity = .7 + .25 * Math.sin(t * 6.1 + 1) * Math.sin(t * 2.7) + fl; });
    if (S._fire) tipAttrBlades(g); B.add(new THREE.Mesh(g, maneM)); }
  // faint facet lines over the crystals (merged into one draw call per parent at build end)
  { const r = ceTailGeo(), piv = V(0, .1, .42), tg = new THREE.Group(); tg.position.copy(piv); B.add(tg);
    const pos = new Float32Array(r.pos), col = new Float32Array(r.pos.length);
    for (let i = 0; i < r.fid.length; i++) { const v = .7 + .45 * (Math.sin(r.fid[i] * 9.7 + 2) * .5 + .5); col.set([v, v, v], i * 3); }
    for (let i = 0; i < pos.length; i += 3) { pos[i] -= piv.x; pos[i + 1] -= piv.y; pos[i + 2] -= piv.z; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const tm = new THREE.MeshStandardMaterial({ color: K.lc.clone(), emissive: K.le.clone(), vertexColors: true, metalness: K.met, roughness: K.rough, flatShading: true, side: THREE.DoubleSide });
    if (S._fire) tipAttrIds(geo, r.fid); tg.add(new THREE.Mesh(geo, tm));
    { let bi = 0; for (let i = 0; i < pos.length; i += 3) if (pos[i + 2] > pos[bi + 2]) bi = i; S._ceTailTip = emitter(tg, 0, pos[bi + 1], pos[bi + 2] * .9); }
    if (S._fire) { const best = {}; for (let i = 0; i < r.fid.length; i++) { const id = r.fid[i], d = pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2; if (!best[id] || d > best[id][0]) best[id] = [d, i]; } S._fTail = { tg, pts: Object.values(best).map(([, i]) => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])) }; }
    S.extras.push((sh, dt, t) => { tm.emissiveIntensity = .7 + .25 * Math.sin(t * 5.9 + 4) * Math.sin(t * 2.2) + (Math.random() < dt * 4 ? 1.3 : 0); tg.rotation.y = Math.sin(t * 1.1) * .06; tg.rotation.x = Math.sin(t * 1.4 + 1) * .04; }); }
  S.gun(tipAt(B, 0, .12, -1.64), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
}
function ceFinish(S) {
  return; // facet edge lines removed (they read as black outlines)
  const K = ceKit(S), byParent = new Map();
  for (const { geo, parent } of K.edges) { if (!byParent.has(parent)) byParent.set(parent, []); byParent.get(parent).push(new THREE.EdgesGeometry(geo, 25)); }
  byParent.forEach((list, p) => { const m = new THREE.LineSegments(mergeGeometries(list), K.edge); p.add(m); });
}
/* ===== STORM DRAKE · 번개 서양룡 (four-legged western dragon) — built part by part; HEAD first =====
   same sculpting pipeline as the eastern thunder dragon (superellipse sections + gaussian features, scale skin that turns
   to fine hide on the muzzle, socketed shader eyes with lids, hinged jaw with cheek skin, real teeth, tongue)
   but a western reptile: long tapering wedge snout, heavy angular brow shelf, high cheekbones, ridged swept-back horns, cheek frill */
/* armour skin for the storm drake: angular overlapping plates (jittered voronoi), bevelled, with glowing lightning fissures
   running irregularly through the gaps between plates — dark armour with electricity trapped inside */
const WD_TEX = (() => {
  const N = 512, cell = 6, R = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const pts = []; for (let j = -1; j <= cell; j++) for (let i = -1; i <= cell; i++) { const ii = (i + cell) % cell, jj = (j + cell) % cell; pts.push([(i + .15 + .7 * R(ii, jj)) / cell, (j + .15 + .7 * R(ii + 9, jj + 3)) / cell, R(ii + 4, jj + 7)]); }
  const col = document.createElement('canvas'), em = document.createElement('canvas'), nm = document.createElement('canvas'); [col, em, nm].forEach(c => c.width = c.height = N);
  const ci = col.getContext('2d').createImageData(N, N), ei = em.getContext('2d').createImageData(N, N), ni = nm.getContext('2d').createImageData(N, N);
  const H = new Float32Array(N * N);
  const nz = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = R(xi, yi), b = R(xi + 1, yi), c = R(xi, yi + 1), d = R(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N; let d1 = 9, d2 = 9, k1 = 0;
    for (let k = 0; k < pts.length; k++) { const dx = u - pts[k][0], dy = (v - pts[k][1]) * 1.25, d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d; }
    const edge = Math.sqrt(d2) - Math.sqrt(d1), o = (y * N + x) * 4;               /* distance to the plate border */
    const tone = .55 + .45 * pts[k1][2], bev = Math.min(1, edge * 22), slope = (v - pts[k1][1]) * 2;   /* plates shingle: lower edge raised */
    const h = Math.pow(bev, .5) * (.75 + .25 * slope) + nz(u * 40, v * 40) * .06; H[y * N + x] = h;
    const c = (.17 + .08 * tone) * (.55 + .45 * bev) * (1 + nz(u * 60, v * 60) * .15);
    ci.data[o] = c * 255 * .95; ci.data[o + 1] = c * 255 * 1.0; ci.data[o + 2] = c * 255 * 1.12; ci.data[o + 3] = 255;
    const live = Math.sin(TAU * (u * 2 + .3 * Math.sin(TAU * v * 2))) + .6 * Math.sin(TAU * (v * 3 + u)) > .1 ? 1 : .12,   /* periodic so the tile seams match */ crack = Math.exp(-edge * edge * 9000) * live;  /* only some seams carry current */
    const sp = R(x >> 3, y >> 3) > .985 ? .6 : 0, e = Math.min(1, crack * 1.4 + sp * crack);
    ei.data[o] = ei.data[o + 1] = ei.data[o + 2] = e * 255; ei.data[o + 3] = 255;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const hx = H[y * N + ((x + 1) % N)] - H[y * N + ((x - 1 + N) % N)], hy = H[((y + 1) % N) * N + x] - H[((y - 1 + N) % N) * N + x], o = (y * N + x) * 4;
    const nx = -hx * 6, ny = -hy * 6, l = Math.hypot(nx, ny, 1); ni.data[o] = (nx / l * .5 + .5) * 255; ni.data[o + 1] = (ny / l * .5 + .5) * 255; ni.data[o + 2] = (1 / l * .5 + .5) * 255; ni.data[o + 3] = 255; }
  col.getContext('2d').putImageData(ci, 0, 0); em.getContext('2d').putImageData(ei, 0, 0); nm.getContext('2d').putImageData(ni, 0, 0);
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  /* horn veins: jagged lightning cracks running up the horn, brighter toward the tip (v = along the horn) */
  const hv = document.createElement('canvas'); hv.width = 128; hv.height = 256; const hx = hv.getContext('2d'); hx.fillStyle = '#000'; hx.fillRect(0, 0, 128, 256);
  for (let k = 0; k < 7; k++) { let x = (k + .5) / 7 * 128 + (R(k, 1) - .5) * 10; hx.beginPath(); hx.moveTo(x, 256); for (let y = 256; y > 0; y -= 10 + R(k, y) * 14) { x += (R(k, y + 3) - .5) * 22; hx.lineTo(x, y); }
    hx.strokeStyle = '#fff'; hx.lineWidth = 1.6; hx.shadowColor = '#fff'; hx.shadowBlur = 4; hx.stroke(); }
  const gr = hx.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,.92)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  hx.globalCompositeOperation = 'source-atop'; hx.shadowBlur = 0; hx.fillStyle = gr; hx.fillRect(0, 0, 128, 256);
  return { map: T(col, true), em: T(em, false), nrm: T(nm, false), horn: T(hv, false) };
})();
/* scale colours per paint — strongly tinted by the paint so each colour reads clearly (storm blue = steel blue,
   흑뢰 = near-black violet, gold = burnished gold, prism = pale pearl that the rainbow shader colours) */
function wdCol(S) {
  if (S._wdCol) return S._wdCol; const d = S.P.d, b0 = new THREE.Color(d.base), ac = new THREE.Color(d.accent);
  const base = d.prism ? new THREE.Color(.82, .84, .9) : d.gold ? new THREE.Color(.78, .55, .2) : d.name === '흑뢰' ? new THREE.Color(.035, .035, .045) : S._ice ? ac.clone().lerp(b0, .6).multiplyScalar(1.1) : S._fire ? b0.clone().multiplyScalar(1.7) : ac.clone().lerp(b0, .5).multiplyScalar(1.15);   /* 흑뢰: true glossy black */
  const blk = d.name === '흑뢰', tip = S._ice && !d.prism ? base.clone().lerp(new THREE.Color(1, 1, 1), .45) : S._fire && !d.prism ? base.clone().lerp(ac, .16) : d.gold ? new THREE.Color(1, .86, .5) : blk ? new THREE.Color(.11, .11, .13) : base.clone().lerp(ac, .4).lerp(new THREE.Color(1, 1, 1), .25), root = blk ? new THREE.Color(.02, .02, .025) : base.clone().multiplyScalar(.42);
  return S._wdCol = { base, tip, root };
}
function wdArmorMat(S) {
  if (S._wdArmor) return S._wdArmor;
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const tint = wdCol(S).base.clone().multiplyScalar(1.3);
  const m = new THREE.MeshStandardMaterial({ map: WD_TEX.map, color: tint, normalMap: WD_TEX.nrm, normalScale: new THREE.Vector2(1.4, 1.4), emissiveMap: WD_TEX.em, emissive: gl.clone(), emissiveIntensity: 1.2,
    metalness: S.P.d.gold ? .85 : .45, roughness: .34, side: THREE.DoubleSide });
  [m.map, m.normalMap, m.emissiveMap].forEach(t => t.repeat.set(4, 2));
  /* bare dark flesh inside the mouth (no plates, no cracks) */
  m.onBeforeCompile = sh => { sh.uniforms.uWT2 = WD_T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMouth; varying float vMouth;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMouth = aMouth;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMouth; uniform float uWT2;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(.22,.05,.08), clamp(vMouth,0.,1.));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float cr = texture2D(emissiveMap, vEmissiveMapUv).r; float fl = .55 + .45 * sin(vEmissiveMapUv.y * 7. - uWT2 * 4.) * sin(vEmissiveMapUv.x * 5. + uWT2 * 1.7); totalEmissiveRadiance = emissive * (.7 * fl + cr * .8); }\ntotalEmissiveRadiance *= 1. - clamp(vMouth,0.,1.);');   /* the skin itself is lightning: it glows on its own and shows in the gaps between the armour scales */
  };
  m.customProgramCacheKey = () => 'wdArmor2';
  if (S.P.d.prism) { const prev = m.onBeforeCompile; prismify(m); const pr = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { prev(sh, r); pr(sh, r); }; m.customProgramCacheKey = () => 'wdArmorP'; }
  return S._wdArmor = m;
}
/* reptile eye: whole eye glows (no white), vertical slit pupil, radial fibres, darker rim */
function wdEyeMat(S) {
  const gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  return new THREE.ShaderMaterial({ uniforms: { uC: { value: gl }, uT: { value: 0 }, uR: { value: EYE_R } }, toneMapped: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT, uR; varying vec3 vP;
      void main(){ vec2 q = vP.xy / uR; float r = length(q), a = atan(q.y, q.x);
        float fib = .75 + .25 * sin(a * 38. + sin(a * 7.) * 2.) * (1. - r);
        vec3 c = mix(vec3(1.,1.,.95), uC, smoothstep(.0, .55, r)) * fib * (1.6 - r * .9);
        c *= .85 + .3 * sin(uT * 9. + r * 12.) * .3;
        float pw = .1 * sqrt(max(0., 1. - q.y * q.y * 1.1));
        float pupil = smoothstep(pw + .02, pw - .01, abs(q.x));
        c = mix(c, vec3(.01,.01,.02), pupil);
        c *= 1. - smoothstep(.75, 1., r) * .6;
        if (vP.z < 0.) c *= .1;
        gl_FragColor = vec4(c, 1.); }` });
}
function wdHead(S) {
  const h = new THREE.Group(), g = new THREE.Group(), T = S.P.trim, Bo = S.P.bone;
  const H = wdArmorMat(S), eyeM = dragonEyeMat(S._fireEye || S.P.glow, 1), ES = 1.4;
  /* eyelids: armour-textured but NOT glowing (the glowing skin material made the lids read as big bare glowing patches) */
  const lidM = new THREE.MeshStandardMaterial({ map: WD_TEX.map, normalMap: WD_TEX.nrm, color: new THREE.Color(S.P.d.base).lerp(new THREE.Color(1, 1, 1), .25).multiplyScalar(1.3), metalness: .4, roughness: .38, side: THREE.DoubleSide });   /* same glowing eye as the eastern thunder dragon (no pupil), bigger */
  const gl0 = S.P.glow.clone(); gl0.multiplyScalar(1 / Math.max(gl0.r, gl0.g, gl0.b));
  /* horns: dark bone split by glowing lightning veins that get brighter toward the tip */
  const hornM = S._wdHornM || (S._wdHornM = (() => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.P.d.base).multiplyScalar(.3).lerp(new THREE.Color(.6, .6, .62), .25), metalness: .35, roughness: .3, emissiveMap: WD_TEX.horn, emissive: gl0.clone(), emissiveIntensity: 1.6, side: THREE.DoubleSide }); if (S.P.d.prism) prismify(m); return m; })());
  const toothM = S._wdToothM || (S._wdToothM = new THREE.MeshStandardMaterial({ color: new THREE.Color(.9, .88, .82), metalness: .15, roughness: .28, emissive: gl0.clone().multiplyScalar(.08) }));
  /* skull sections (z forward negative): high back skull, brow shelf, then a long wedge that narrows and drops to the nose */
  /* lizard-shaped skull (girdled-lizard reference): short, broad and flat, a triangle from the wide jaw/temples to a short blunt snout */
  const HS = [{ z: .12, w: .3, ht: .2, hb: .22 }, { z: -.04, w: .34, ht: .24, hb: .22 }, { z: -.22, w: .33, ht: .25, hb: .2 }, { z: -.4, w: .28, ht: .23, hb: .16, y: -.01 },
              { z: -.56, w: .21, ht: .18, hb: .12, y: -.03 }, { z: -.7, w: .15, ht: .14, hb: .09, y: -.045 }, { z: -.8, w: .1, ht: .1, hb: .07, y: -.055 }, { z: -.87, w: .05, ht: .06, hb: .05, y: -.06 }, { z: -.9, w: .015, ht: .03, hb: .03, y: -.062 }];
  const F = [];
  fPt(F, V(.255, .1, -.45), V(.07, .05, .075), -.03);   /* shallow socket: no glowing pit around the eye */                  // eye socket out on the side of the head
  fSeg(F, V(.16, .19, -.6), V(.27, .17, -.47), .04, .05);              // bony brow over the eye
  fSeg(F, V(.27, .17, -.47), V(.32, .15, -.25), .04, .04);
  fPt(F, V(0, .25, -.5), V(.08, .03, .1), -.012, false);               // shallow dip between the brows (flat head top)
  fPt(F, V(.3, -.02, -.05), V(.09, .11, .15), .06);                    // broad temple / jaw-muscle bulge that makes the head triangular
  fSeg(F, V(.2, .04, -.6), V(.32, .03, -.15), .04, .035);              // cheekbone
  fSeg(F, V(.18, -.01, -.62), V(.3, -.02, -.15), .016, -.016);         // groove under it
  fPt(F, V(.15, .22, .08), .07, .03);                                  // occipital boss
  fSeg(F, V(.07, .08, -.8), V(.15, .13, -.5), .018, .015);             // canthal ridge from nostril to eye
  fPt(F, V(.05, .05, -.8), V(.03, .025, .035), .025);                  // small nostril bump near the snout tip
  fPt(F, V(.055, .06, -.83), V(.014, .012, .016), -.035);              // nostril
  fSeg(F, V(.07, -.04, -.84), V(.3, -.08, -.06), .02, .015);           // upper lip roll
  fSeg(F, V(.06, -.07, -.84), V(.3, -.12, -.05), .012, -.02);          // lip line, long and slightly downturned
  for (let k = 0; k < 3; k++) fSeg(F, V(.29, -.06, -.12 + k * .03), V(.34, .0 + k * .03, -.06 + k * .04), .009, -.01);   // folds at the mouth corner
  for (let k = 0; k < 3; k++) fSeg(F, V(.28, .12, -.45), V(.32, .07 + k * .035, -.33 + k * .01), .008, -.01);             // creases behind the eye
  const skull = new THREE.Mesh(sculptGeo(HS, F, { mask: (x, y, z) => smoothstep(-.88, -.3, z), mouth: { side: -1, zMax: .06 } }), H); h.add(skull);
  /* teeth: thick flattened blades with serrated (sawtooth) edges */
  const tooth = (len, r) => sweep([V(0, .01, 0), V(0, -len * .5, -len * .05), V(0, -len, len * .1)], t => { const k = (r * 1.45) * Math.pow(1 - t, .8) * (1 + .16 * Math.max(0, Math.sin(t * 9 * Math.PI))) + .0015; return { w: k * .55, h: k, n: 1.6 }; }, { segs: 18, rad: 8, up: V(1, 0, 0) });
  for (const s of [1, -1]) for (let k = 0; k < 14; k++) {
    const z = -.82 + k * .05, fang = k === 2, len = fang ? .16 : lp(.07, .045, k / 13), x = secInterp(HS, z).w * .8 * s;
    const m = new THREE.Mesh(tooth(len, fang ? .036 : lp(.022, .014, k / 14)), toothM); m.position.set(x, secSurfY(HS, z, x, -1) + .006, z); m.rotation.z = s * .06; g.add(m); }
  /* lower jaw on its own hinge */
  const JS = [{ z: .08, w: .29, ht: .06, hb: .13, y: -.27 }, { z: -.25, w: .25, ht: .05, hb: .11, y: -.24 }, { z: -.5, w: .17, ht: .045, hb: .08, y: -.2 }, { z: -.7, w: .11, ht: .04, hb: .06, y: -.17 }, { z: -.82, w: .06, ht: .03, hb: .045, y: -.16 }, { z: -.86, w: .025, ht: .02, hb: .03, y: -.155 }];
  const JF = []; fPt(JF, V(.27, -.27, -.02), V(.08, .08, .12), .045); fSeg(JF, V(.06, -.18, -.8), V(.25, -.17, -.08), .012, -.013); fSeg(JF, V(.12, -.33, -.65), V(.27, -.36, 0), .022, .018);
  fSeg(JF, V(0, -.3, -.82), V(0, -.37, -.3), .02, .012, false);       // chin keel
  const hinge = V(0, -.14, .06), jp = new THREE.Group(), jg = new THREE.Group(); jp.position.copy(hinge); jg.position.copy(hinge).multiplyScalar(-1); jp.add(jg);
  const jm0 = new THREE.Mesh(sculptGeo(JS, JF, { nz: 48, nr: 36, mask: (x, y, z) => smoothstep(-.88, -.3, z), mouth: { side: 1, zMax: .04 } }), H); jm0.position.copy(hinge).multiplyScalar(-1); jp.add(jm0);
  const tY = z => secSurfY(JS, z, 0, 1) + .006;
  /* no tongue: the throat is a well of lightning instead */
  for (const s of [1, -1]) for (let k = 0; k < 12; k++) {
    const z = -.78 + k * .055, fang = k === 1, len = fang ? .13 : lp(.065, .04, k / 11), x = secInterp(JS, z).w * .78 * s;
    const m = new THREE.Mesh(tooth(len, fang ? .03 : lp(.02, .014, k / 12)), toothM); m.position.set(x, secSurfY(JS, z, x, 1) - .006, z); m.rotation.x = Math.PI; m.rotation.z = -s * .06; jg.add(m); }
  /* chin spikes along the jaw underside */
  for (const s of [1, -1]) for (let k = 0; k < 4; k++) { const z = -.55 + k * .15, x = s * secInterp(JS, z).w * .7, y = secSurfY(JS, z, x, -1);
    jg.add(new THREE.Mesh(sweep([V(x, y, z), V(x * 1.15, y - .06, z + .05), V(x * 1.3, y - .1, z + .14)], t => ({ w: lp(.022, .002, t), h: lp(.022, .002, t) }), { segs: 6, rad: 6, up: V(0, 0, 1) }), hornM)); }
  const jb = bake(S, jg); jb.position.copy(jg.position); jp.remove(jg); jp.add(jb); h.add(jp);
  /* ---- real 3D scales (girdled-lizard armour, from the reference photos) ----
     top of the head: large flat bevelled shield plates; sides of the face and jaw: rows of keeled, pointed scales lying back
     and overlapping like shingles, smaller toward the snout; back of the skull: big spiny scales that start the neck collar.
     every scale is raycast onto the sculpted surface, darker at the root and paler at the tip */
  { h.updateMatrixWorld(true);
    const rc = new THREE.Raycaster(), Zf = V(0, 0, 1), W1 = new THREE.Color(1, 1, 1);
    const eyeC = [1, -1].map(s => { const r0 = new THREE.Raycaster(V(s * 2, .1, -.45), V(-s, 0, 0)), hh = r0.intersectObject(skull)[0]; return V(hh ? hh.point.x - s * EYE_R * ES * .82 : s * .2, .1, -.45); });
    const inEye = p => eyeC.some(c => c.distanceTo(p) < EYE_R * ES * 1.04);   /* only the visible eye disc is left open; scales come right up to its rim */
    const base = wdCol(S).base, tipC = wdCol(S).tip, rootC = wdCol(S).root;
    const gl1 = S.P.glow.clone(); gl1.multiplyScalar(1 / Math.max(gl1.r, gl1.g, gl1.b));
    const lum = c => c.r * .3 + c.g * .59 + c.b * .11;
    const mkM = () => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: S.P.d.gold ? .8 : S.P.d.name === '흑뢰' ? .18 : .3, roughness: S.P.d.name === '흑뢰' ? .06 : .42, envMapIntensity: S.P.d.name === '흑뢰' ? 2.2 : 1, flatShading: true,   /* 흑뢰 = obsidian: glassy black facets with sharp mirror highlights */ side: THREE.DoubleSide, emissive: gl1.clone(), emissiveIntensity: 1.4 });
      /* lightning light leaking out from under the armour: each scale's root edge (darkest vertex colour) glows, fading to nothing at the tip */
      m.onBeforeCompile = sh => { sh.uniforms.uRL = { value: lum(rootC) }; sh.uniforms.uBL = { value: lum(base) }; sh.uniforms.uWT3 = WD_T;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uRL, uBL, uWT3;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { float l = dot(vColor.rgb, vec3(.3,.59,.11)), g = clamp((uBL - l) / max(.001, uBL - uRL), 0., 1.); g = g * g * g;
            float fl = .6 + .4 * sin(uWT3 * 3.1 + gl_FragCoord.x * .013) * sin(uWT3 * 2.3 + gl_FragCoord.y * .017);
            totalEmissiveRadiance = emissive * emissiveIntensity * g * fl; }`); };
      m.onBeforeCompile = () => {}; m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; m.userData.noFlash = true; m.customProgramCacheKey = () => 'wdScale'; if (S.P.d.prism) { m.emissive = new THREE.Color(.35, .35, .35); prismLight(m); } return m; };   /* prism: strong per-facet rainbow (own cache key, so it can't reuse the plain program) */   /* armour scales: plain, unlit */
    const scM = S._wdScaleM || (S._wdScaleM = mkM());
    const hit = (mesh, z, th, cy) => { const from = V(Math.cos(th) * 3, cy + Math.sin(th) * 3, z), dir = V(0, cy, z).sub(from).normalize(); rc.set(from, dir); const r = rc.intersectObject(mesh)[0]; if (!r) return null; const n = r.face.normal.clone().transformDirection(mesh.matrixWorld); if (n.dot(dir) > 0) n.negate(); return { p: r.point, n }; };
    const frame = (n, lean = 0) => { const back = Zf.clone().addScaledVector(n, -Zf.dot(n)); if (back.lengthSq() < 1e-6) back.set(0, -1, 0); back.normalize(); back.addScaledVector(n, lean).normalize(); const side = V().crossVectors(n, back).normalize(); return { back, side }; };
    const build = (list, toLocal) => { const pos = [], col = [];
      const T = (a, ca, b, cb, c, cc) => { for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { const v = toLocal ? toLocal(p.clone()) : p; pos.push(v.x, v.y, v.z); col.push(q.r, q.g, q.b); } };
      for (const s of list) {
        if (s.plate) { /* bevelled hexagonal shield: raised top face, sloped sides down to the skin */
          const { p, n, r } = s, { back, side } = frame(n), top = [], bot = [], tc = rootC.clone().lerp(tipC, .35 + .3 * s.j), bc = rootC;
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + s.rot, d = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(back, Math.sin(a) * 1.15);
            bot.push(p.clone().addScaledVector(d, r).addScaledVector(n, -.004)); top.push(p.clone().addScaledVector(d, r * .78).addScaledVector(n, s.h)); }
          const c = p.clone().addScaledVector(n, s.h * 1.15);
          for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; T(c, tc, top[k], tc, top[k2], tc); T(top[k], tc, bot[k], bc, bot[k2], bc); T(top[k], tc, bot[k2], bc, top[k2], tc); }
        } else {   /* keeled pointed scale: diamond base on the skin, tip pulled back past the rear edge and lifted */
          const { p, n, sz } = s, { back, side } = frame(n, s.lean || 0), w = sz * .55;
          const fr = p.clone().addScaledVector(back, -sz * .55), le = p.clone().addScaledVector(side, w), ri = p.clone().addScaledVector(side, -w), re = p.clone().addScaledVector(back, sz * .35);
          const tip = p.clone().addScaledVector(back, sz * (.95 + s.ext)).addScaledVector(n, s.ht), keel = p.clone().addScaledVector(back, sz * .2).addScaledVector(n, s.ht * .75);
          const tc = tipC.clone().lerp(W1, .1 * s.j);
          T(fr, rootC, le, rootC, keel, base); T(ri, rootC, fr, rootC, keel, base); T(le, rootC, tip, tc, keel, base); T(keel, base, tip, tc, ri, rootC); T(le, rootC, re, rootC, tip, tc); T(re, rootC, ri, rootC, tip, tc);
        } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return new THREE.Mesh(g, scM); };
    const J = (a, b) => { const v = Math.sin(a * 37.7 + b * 91.3) * 43758.5; return v - Math.floor(v); };
    const top = [], sides = [];
    /* shield plates over the top of the head, alternating rows like the photo's head tiles */
    for (let r = 0; r < 19; r++) { const z = lp(-.89, .1, r / 18), cy = secInterp(HS, z).y, n = Math.round(lp(3, 8, smoothstep(-.89, -.3, z)));
      for (let k = 0; k < n; k++) { const th = Math.PI / 2 + ((k + .5) / n - .5) * lp(.9, 1.7, smoothstep(-.86, -.4, z)) + (r % 2 ? .08 : -.08), q = hit(skull, z, th, cy); if (!q) continue;
        top.push({ plate: 1, p: q.p, n: q.n, r: lp(.032, .06, smoothstep(-.89, -.2, z)) * (.9 + .25 * J(r, k)), h: lp(.009, .017, smoothstep(-.86, -.2, z)), rot: J(k, r) * .5, j: J(r, k + 5) }); } }
    /* keeled scales down the sides of the face (above the lip line), small at the snout, larger and spikier toward the back */
    for (const sg of [1, -1]) for (let r = 0; r < 30; r++) { const z = lp(-.89, .1, r / 29), cy = secInterp(HS, z).y, a = smoothstep(-.89, .1, z);
      for (let k = 0; k < 10; k++) { const el = lp(-.62, 1.0, (k + (r % 2) * .5) / 10), th = sg > 0 ? el : Math.PI - el, q = hit(skull, z, th, cy); if (!q) continue;
        if (inEye(q.p)) continue;   /* keep the eye clear */
        const sz = lp(.026, .058, a) * (.85 + .3 * J(r, k + sg)); sides.push({ p: q.p, n: q.n, sz, ht: sz * lp(.25, .5, a), ext: lp(.1, .4, a) * (.7 + .6 * J(k, r)), j: J(r + 3, k), lean: .15 }); } }
    /* big spiny scales at the back of the skull, fanning out to start the neck collar */
    for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) { const z = .02 + r * .06, th = -.5 + (k + (r % 2) * .5) / 14 * (Math.PI + 1), cy = secInterp(HS, z).y, q = hit(skull, z, th, cy); if (!q) continue;
      const sz = .09 + r * .015 + J(k, r) * .03; sides.push({ p: q.p, n: q.n, sz, ht: sz * .8, ext: .7 + J(r, k) * .5, j: J(k + 7, r), lean: .35 }); }
    /* gap filler: an even grid of side rays over the whole side of the face, from the lip line up past the eye,
       so the cheeks and the area under the eye are covered regardless of how the section angles fall */
    { const rcH = new THREE.Raycaster();
      for (const sg of [1, -1]) for (let yi = 0; yi <= 9; yi++) for (let zi = 0; zi <= 24; zi++) {
        const y = lp(-.09, .24, yi / 9), z = lp(-.86, .06, zi / 24) + (yi % 2) * .018; rcH.set(V(sg * 2, y, z), V(-sg, 0, 0)); const hh = rcH.intersectObject(skull)[0]; if (!hh) continue;
        if (inEye(hh.point)) continue;
        const n = hh.face.normal.clone(); if (n.x * sg < 0) n.negate(); const a = smoothstep(-.86, .06, z), sz = lp(.026, .05, a) * (.85 + .3 * J(yi * 31 + zi, sg));
        sides.push({ p: hh.point, n, sz, ht: sz * lp(.25, .45, a), ext: lp(.1, .35, a) * (.7 + .6 * J(zi, yi)), j: J(yi + 3, zi), lean: .15 }); } }

    /* COVERAGE PASS — guarantees no bare skin: walk every vertex of the sculpted surface; wherever no scale centre lies
       within the cover radius, put a scale right there (skips the mouth interior and the eye opening) */
    const coverPass = (mesh, list, rFn, eyeSkip) => { const pa = mesh.geometry.attributes.position, na = mesh.geometry.attributes.normal, mo = mesh.geometry.attributes.aMouth, M = mesh.matrixWorld;
      const cell = .04, grid = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
      const put = p => { const k = key(p.x, p.y, p.z); (grid.get(k) || grid.set(k, []).get(k)).push(p); };
      const near = (p, r) => { const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell), R = Math.ceil(r / cell);
        for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) { const L = grid.get(`${cx + a},${cy + b},${cz + c}`); if (L) for (const q of L) if (q.distanceToSquared(p) < r * r) return true; } return false; };
      for (const s of list) put(s.p); for (const s of (list === sides ? top : [])) put(s.p);
      const P = V(), N = V(), C = V();
      for (let v = 0; v < pa.count; v++) { if (mo && mo.getX(v) > .3) continue;
        P.fromBufferAttribute(pa, v).applyMatrix4(M); N.fromBufferAttribute(na, v).transformDirection(M);
        if (eyeSkip && inEye(P)) continue;
        C.set(0, P.y, P.z); const out = P.clone().sub(C); out.x *= 1.0; if (N.dot(out) < 0) N.negate();
        const r = rFn(P.z); if (near(P, r)) continue;
        const sz = r * 1.25 * (.9 + .2 * J(v, 7)), q = P.clone(); list.push({ p: q, n: N.clone(), sz, ht: sz * .35, ext: .25 + .3 * J(v, 3), j: J(v, 1), lean: .15 }); put(q); } };
    coverPass(skull, sides, z => lp(.018, .032, smoothstep(-.88, .1, z)), true);
    h.add(build(top)); h.add(build(sides));
    /* lower jaw: keeled scales along its sides and underside, attached to the jaw so they open with it */
    jp.updateMatrixWorld(true); const jl = [];
    for (const sg of [1, -1]) for (let r = 0; r < 24; r++) { const z = lp(-.84, .06, r / 23), cy = secInterp(JS, z).y, a = smoothstep(-.84, .06, z);
      for (let k = 0; k < 7; k++) { const el = lp(-1.45, .1, (k + (r % 2) * .5) / 7), th = sg > 0 ? el : Math.PI - el, q = hit(jm0, z, th, cy); if (!q) continue;
        const sz = lp(.024, .05, a) * (.85 + .3 * J(r, k + 9)); jl.push({ p: q.p, n: q.n, sz, ht: sz * .4, ext: lp(.15, .45, a), j: J(r, k), lean: .1 }); } }
    /* same even side grid on the lower jaw */
    { const rcJ = new THREE.Raycaster();
      for (const sg of [1, -1]) for (let yi = 0; yi <= 6; yi++) for (let zi = 0; zi <= 22; zi++) {
        const y = lp(-.4, -.17, yi / 6), z = lp(-.84, .06, zi / 22) + (yi % 2) * .018; rcJ.set(V(sg * 2, y, z), V(-sg, 0, 0)); const hh = rcJ.intersectObject(jm0)[0]; if (!hh) continue;
        const n = hh.face.normal.clone().transformDirection(jm0.matrixWorld); if (n.x * sg < 0) n.negate(); const a = smoothstep(-.84, .06, z), sz = lp(.024, .046, a) * (.85 + .3 * J(yi * 17 + zi, sg + 5));
        jl.push({ p: hh.point, n, sz, ht: sz * .4, ext: lp(.15, .4, a), j: J(zi, yi + 9), lean: .1 }); } }
    jm0.updateMatrixWorld(true); coverPass(jm0, jl, z => lp(.02, .034, smoothstep(-.86, .06, z)), false);
    const inv = new THREE.Matrix4().copy(jp.matrixWorld).invert(); jp.add(build(jl, v => v.applyMatrix4(inv))); }

  const throat = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 10), glowMat(S.P.glow, 1)); throat.scale.set(1.5, .55, 2.6); throat.position.set(0, -.18, -.12); h.add(throat); S.glows.push(throat);
  const tSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: gl0.clone().multiplyScalar(.8), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); tSpr.position.set(0, -.17, -.28); h.add(tSpr);
  /* crackling arcs inside the mouth between the palate and the jaw floor, stronger when attacking */
  { const pairs = []; for (let k = 0; k < 4; k++) { const a = emitter(h, (Math.random() - .5) * .15, -.1, -.12 - k * .14), b = emitter(jp, (Math.random() - .5) * .15, -.07, -.14 - k * .14); pairs.push([a, b]); }
    if (S._fire) flamePoints(S, h, [...Array(9)].map((_, k) => V((Math.random() - .5) * .16, -.1 - Math.random() * .04, -.14 - k * .055)), .07);   /* fire drake: flames lick inside the mouth */
    else arcs(S, pairs, S.P.glow, { force: true, w: .35, fl: .4, p: .12, pf: .7 }); }
  /* cheek skin joining skull and jaw at the back of the mouth (re-stretched as the jaw opens) */
  let jaw = 0; const NZ = 12, NC = 6, cheeks = [];
  for (const s of [1, -1]) { const cp = new Float32Array((NZ + 1) * (NC + 1) * 3), cuv = [], cix = [];
    for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NC; j++) { cuv.push(i / NZ * 1.4, j / NC * .25); if (i < NZ && j < NC) { const a = i * (NC + 1) + j, b = a + NC + 1; cix.push(a, b, a + 1, b, b + 1, a + 1); } }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2)); cg.setIndex(cix);
    const cm = new THREE.Mesh(cg, S._cheekM || (S._cheekM = new THREE.MeshStandardMaterial({ color: 0x4a1a24, roughness: .5, metalness: 0, side: THREE.DoubleSide }))); cm.frustumCulled = false; h.add(cm); cheeks.push({ s, cp, cg }); }
  const cU = V(), cL = V(), cT = V();
  const updCheeks = () => { const ca = Math.cos(-jaw), sa = Math.sin(-jaw);
    for (const { s, cp, cg } of cheeks) { for (let i = 0; i <= NZ; i++) { const z = lp(-.3, .1, i / NZ), wh = secInterp(HS, z).w * .72, wj = secInterp(JS, z).w * .72;
        cU.set(s * wh, secSurfY(HS, z, wh, -1) + .02, z); cL.set(s * wj, secSurfY(JS, z, wj, 1) - .02, z);
        const dy = cL.y - hinge.y, dz = cL.z - hinge.z; cL.y = hinge.y + dy * ca - dz * sa; cL.z = hinge.z + dy * sa + dz * ca;
        const k = smoothstep(-.28, -.14, z); cL.lerp(cU, 1 - k);
        for (let j = 0; j <= NC; j++) { const t = j / NC, o = (i * (NC + 1) + j) * 3; cT.copy(cU).lerp(cL, t); cT.x -= s * Math.sin(t * Math.PI) * .02 * k; cp[o] = cT.x; cp[o + 1] = cT.y; cp[o + 2] = cT.z; } }
      cg.attributes.position.needsUpdate = true; cg.computeVertexNormals(); } };
  updCheeks();
  S.extras.push((sh, dt) => { jaw += ((sh.fire ? .5 : .02) - jaw) * (1 - Math.exp(-dt * 3)); jp.rotation.x = -jaw; updCheeks(); });
  /* ridged horn: thick root, growth rings, curling sweep, sharp tip */
  /* every horn / spike root is snapped onto the skull surface (raycast toward the head axis) and sunk a little, so nothing floats */
  const rcS = new THREE.Raycaster();
  const snap = pts => { skull.updateMatrixWorld(true); const p0 = pts[0], cy = secInterp(HS, p0.z).y, dir = V(0, cy, p0.z).sub(p0); dir.x *= 1; dir.normalize();
    rcS.set(p0.clone().addScaledVector(dir, -2), dir); const hh = rcS.intersectObject(skull)[0]; if (!hh) return pts; const d = hh.point.clone().addScaledVector(dir, .015).sub(p0); return pts.map(q => q.clone().add(d)); };
  /* head horns are made of lightning (same glowing bolt material as the eastern dragon's horns): smooth curve, root snapped onto the skull */
  const horn = (pts0, r0) => { const pts = snap(pts0), cv = new THREE.CatmullRomCurve3(pts), N = Math.max(6, Math.round(cv.getLength() / .05)), P = cv.getSpacedPoints(N);
    /* core + body only (no wide halo blob at the root, which looked like a bare hole in the armour) */
    const core = S._boltCore || boltHorn(S, new THREE.Group(), [V(), V(0, .01, 0)], .001, .001) || S._boltCore;
    [[S._boltCore, .38, 6], [S._boltBody, 1, 6]].forEach(([m, k, sgm], li) => { const me = new THREE.Mesh(polyTube(P, t => lp(r0 * .8, .003, t) * k, sgm), m); me.renderOrder = 5 + li; h.add(me); S.glows.push(me); }); };
  /* armour spikes (brow, cheek frill, crest) stay as solid ridged bone */
  const spikeB = (pts0, r0, rings = 4) => { const pts = snap(pts0); g.add(new THREE.Mesh(sweep(pts, t => { const k = r0 * Math.pow(1 - t, .85) * (1 + .09 * Math.max(0, Math.sin(t * rings * Math.PI)) * (1 - t)) + .002; return { w: k, h: k * .82, n: 2.2 }; }, { segs: 20, rad: 10, up: V(0, 1, 0) }), hornM)); };
  for (const s of [1, -1]) {
    /* eye: socketed shader eyeball with lids (same construction as the eastern dragon) */
    const gaze = V(s * .95, .02, -.3).normalize(), up = V(0, 1, 0), xa = V().crossVectors(up, gaze).normalize(), ya = V().crossVectors(gaze, xa);
    /* sink the eye into the face: find the skull surface at the eye spot and set the eyeball centre well inside it, so only the lidded front shows */
    let ex = s * .25; { skull.updateMatrixWorld(true); const rc0 = new THREE.Raycaster(V(s * 2, .1, -.45), V(-s, 0, 0)), hh = rc0.intersectObject(skull)[0]; if (hh) ex = hh.point.x - s * EYE_R * ES * .82; }   /* eyeball sunk deep: only a slim glowing almond shows through the face */
    const eg = new THREE.Group(); eg.position.set(ex, .1, -.45); eg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, gaze)); eg.scale.setScalar(ES); g.add(eg);
    const NA = 40, NR = 7, lp3 = [], luv = [], lix = [], rimPts = [];
    const alm = a => { const x = -Math.cos(a) * EYE.A; return V(x, eyeY(x, Math.sin(a) > 0, s), 0); };
    for (let i = 0; i <= NA; i++) { const a = i / NA * TAU, b = alm(a), top = Math.sin(a) > 0;
      for (let j = 0; j <= NR; j++) { const t = j / NR, k = lp(1, 1.28, t), x = b.x * lp(1, 1.08, t), y = b.y * k + (top ? .005 : -.003) * t;   /* narrow lid ring: it must not spread over the face scales */
        const rr = EYE_R + .004 + .012 * Math.sin(Math.min(1, t * 1.6) * Math.PI) * (top ? 1.4 : .6), z = Math.sqrt(Math.max(0, rr * rr - x * x - y * y)) - t * t * .05;
        lp3.push(x, y, z); luv.push(i / NA * 2, t * .4); if (i < NA && j < NR) { const p0 = i * (NR + 1) + j, p1 = p0 + NR + 1; lix.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); } }
      if (i < NA) { const z0 = Math.sqrt(Math.max(0, (EYE_R + .006) ** 2 - b.x * b.x - b.y * b.y)); rimPts.push(V(b.x, b.y, z0)); } }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp3, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2)); lg.setIndex(lix); lg.computeVertexNormals();
    /* no separate eyelid / rim meshes: the face skin and scales frame the eye directly */
    const eye = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 32, 20), s > 0 ? eyeM : dragonEyeMat(S._fireEye || S.P.glow, -1)); eye.position.copy(eg.position); eye.quaternion.copy(eg.quaternion); eye.scale.setScalar(ES); h.add(eye);
    /* main horns: from the back corners of the skull, sweeping back, curving down then the tips hooking up */
    horn([V(s * .18, .22, -.05), V(s * .28, .33, .16), V(s * .35, .38, .46), V(s * .37, .31, .74), V(s * .38, .35, .98), V(s * .37, .48, 1.1)], .075, 16);
    /* second pair below, shorter, flaring out */
    horn([V(s * .3, .12, .0), V(s * .42, .15, .18), V(s * .53, .15, .38), V(s * .6, .21, .54)], .045, 10);
    /* brow spikes: short row of points along the top of the brow shelf */
    for (let k = 0; k < 3; k++) { const b = V(s * (.2 + k * .04), .27 - k * .01, -.5 + k * .1); spikeB([b, b.clone().add(V(s * .05, .07, .07)), b.clone().add(V(s * .08, .1, .16))], .022 - k * .002, 3); }
    /* cheek frill: fan of back-swept spikes from the cheekbone / jaw corner */
    for (let k = 0; k < 5; k++) { const a = k / 4, b = V(s * lp(.35, .31, a), lp(.08, -.14, a), lp(-.1, .06, a)); const d = V(s * .7, lp(.35, -.4, a), .75).normalize(), L = .26 + .1 * Math.sin(a * Math.PI);
      spikeB([b, b.clone().addScaledVector(d, L * .55).add(V(0, .02, 0)), b.clone().addScaledVector(d, L)], .03, 4); }
    /* nose horn pair */
    { const b = V(s * .05, secInterp(HS, -.72).y + secInterp(HS, -.72).ht - .01, -.72); horn([b, b.clone().add(V(s * .02, .06, .02)), b.clone().add(V(s * .025, .1, .07))], .022, 3); }
  }
  /* crest of plates running back from the top of the skull (continues into the neck later) */
  for (let k = 0; k < 4; k++) { const z = -.2 + k * .12, y = secInterp(HS, z).y + secInterp(HS, z).ht + .02; spikeB([V(0, y - .02, z - .03), V(0, y + .06 + k * .01, z + .05), V(0, y + .09 + k * .015, z + .14)], .03, 3); }
  h.add(bake(S, g));
  S.extras.push((sh, dt, t) => { if (S._fire) { H.emissiveIntensity = 0; S._wdFlash = 0; hornM.emissiveIntensity = .25; return; }   /* fire/ice drakes: no crackling lightning glow in the skin */
    H.emissiveIntensity = 1.7 + .5 * Math.sin(t * 3.7) * Math.sin(t * 1.3) + (Math.random() < dt * 3 ? 1.4 : 0); S._wdFlash = H.emissiveIntensity; hornM.emissiveIntensity = 1.4 + .4 * Math.sin(t * 4.3) + (Math.random() < dt * 3 ? 1 : 0);
    tSpr.material.opacity = (sh.fire ? .75 : .3) * (.8 + .4 * Math.random()); tSpr.scale.setScalar(sh.fire ? .9 : .5); });
  return h;
}
/* ---- storm drake NECK + BODY: long S-curved neck into a deep-chested trunk, all in girdled-lizard armour ----
   skin: armour-plate tube (same glowing-fissure material as the face) along a spine curve;
   on top of it real 3D scales placed ring by ring: big bevelled shield plates down the back, keeled pointed scales on the flanks,
   flat ventral scutes under the belly, and every few rings on the neck a girdle of long spines (like the reference lizard);
   a row of dorsal spikes runs down the midline, tallest over the shoulders */
function wdTrunk(S, B) {
  let skinG = null;
  const H = wdArmorMat(S), hornM = S._wdHornM, scM = S._wdScaleM;
  const spine = [V(0, 0, -.05), V(0, -.03, .35), V(0, -.16, .75), V(0, -.3, 1.15), V(0, -.33, 1.55), V(0, -.3, 2.1), V(0, -.26, 2.7), V(0, -.26, 3.25)];
  const cv = new THREE.CatmullRomCurve3(spine, false, 'catmullrom', .5), Len = cv.getLength();
  /* section half-width / half-height (top, bottom) along the spine distance d */
  const KEY = [[0, .21, .16, .3], [.22, .19, .16, .25], [.5, .165, .16, .17], [.9, .155, .15, .15],   /* deep throat at the start so the underside runs on from the lower jaw */ [1.3, .2, .19, .2], [1.7, .33, .28, .3], [2.2, .42, .32, .38], [2.7, .4, .3, .35], [3.05, .3, .25, .26], [3.45, .19, .17, .16]];   /* hips narrow into the tail root */
  const prof = d => { let i = 0; while (i < KEY.length - 2 && d > KEY[i + 1][0]) i++; const a = KEY[i], b = KEY[i + 1], t = smoothstep(a[0], b[0], d); return { w: lp(a[1], b[1], t), ht: lp(a[2], b[2], t), hb: lp(a[3], b[3], t) }; };
  const UP = V(0, 1, 0), NS = 40, NZ = 90, n = 2.4;
  const frame = d => { const u = Math.min(1, Math.max(0, d / Len)), c = cv.getPointAt(u), T = cv.getTangentAt(u), N = UP.clone().addScaledVector(T, -UP.dot(T)).normalize(), Sd = V().crossVectors(N, T).normalize(); return { c, T, N, Sd }; };
  const surf = (fr, pr, th) => { const cs = Math.cos(th), sn = Math.sin(th); return fr.c.clone().addScaledVector(fr.Sd, pr.w * spw(cs, 2 / n)).addScaledVector(fr.N, (sn >= 0 ? pr.ht : pr.hb) * spw(sn, 2 / n)); };
  /* skin tube */
  { const pos = [], uv = [], idx = [];
    for (let i = 0; i <= NZ; i++) { const d = i / NZ * Len, fr = frame(d), pr = prof(d); let arc = 0, prev = null;
      for (let j = 0; j <= NS; j++) { const th = j / NS * TAU - Math.PI / 2, p = surf(fr, pr, th); if (prev) arc += p.distanceTo(prev); prev = p; pos.push(p.x, p.y, p.z); uv.push(arc / 2, -d); if (i < NZ && j < NS) { const a = i * (NS + 1) + j, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    B.add(new THREE.Mesh(g, H)); skinG = g; }
  /* scales */
  const base = wdCol(S).base, tipC = wdCol(S).tip, rootC = wdCol(S).root, W1 = new THREE.Color(1, 1, 1);
  const J = (a, b) => { const v = Math.sin(a * 41.3 + b * 77.9) * 43758.5; return v - Math.floor(v); };
  const pos = [], col = [];
  const T3 = (a, ca, b, cb, c, cc) => { for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { pos.push(p.x, p.y, p.z); col.push(q.r, q.g, q.b); } };
  const centers = [];
  const plate = (p, nn, back, side, r, h, j, flatK = 1.15) => { centers.push(p.clone()); const top = [], bot = [], tc = rootC.clone().lerp(tipC, .35 + .3 * j);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, dd = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(back, Math.sin(a) * flatK); bot.push(p.clone().addScaledVector(dd, r).addScaledVector(nn, -.005)); top.push(p.clone().addScaledVector(dd, r * .78).addScaledVector(nn, h)); }
    const c = p.clone().addScaledVector(nn, h * 1.15); for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; T3(c, tc, top[k], tc, top[k2], tc); T3(top[k], tc, bot[k], rootC, bot[k2], rootC); T3(top[k], tc, bot[k2], rootC, top[k2], tc); } };
  const spike = (p, nn, back, side, sz, ht, ext, j) => { centers.push(p.clone()); const w = sz * .55, fr = p.clone().addScaledVector(back, -sz * .55), le = p.clone().addScaledVector(side, w), ri = p.clone().addScaledVector(side, -w), re = p.clone().addScaledVector(back, sz * .35);
    const tip = p.clone().addScaledVector(back, sz * (.95 + ext)).addScaledVector(nn, ht), keel = p.clone().addScaledVector(back, sz * .2).addScaledVector(nn, ht * .75), tc = tipC.clone().lerp(W1, .1 * j);
    T3(fr, rootC, le, rootC, keel, base); T3(ri, rootC, fr, rootC, keel, base); T3(le, rootC, tip, tc, keel, base); T3(keel, base, tip, tc, ri, rootC); T3(le, rootC, re, rootC, tip, tc); T3(re, rootC, ri, rootC, tip, tc); };
  let d = .08, ring = 0;
  while (d < Len - .06) {
    const fr = frame(d), pr = prof(d), neck = d < 1.45, girdle = neck && ring % 3 === 0, sz = lp(.055, .085, smoothstep(.4, 2.2, d)) * (girdle ? 1.25 : 1);
    const per = Math.PI * (pr.w + (pr.ht + pr.hb) / 2), cnt = Math.max(10, Math.round(per / (sz * 1.05)));
    for (let k = 0; k < cnt; k++) {
      const th = (k + (ring % 2) * .5) / cnt * TAU - Math.PI / 2, sn = Math.sin(th), p = surf(fr, pr, th);
      const pa = surf(fr, pr, th + .01), pb = surf(fr, pr, th - .01), tA = pa.sub(pb).normalize(), nn = V().crossVectors(fr.T, tA).normalize();
      if (nn.dot(p.clone().sub(fr.c)) < 0) nn.negate();
      const back = fr.T.clone().addScaledVector(nn, -fr.T.dot(nn)).normalize(), side = V().crossVectors(nn, back).normalize(), j = J(ring, k);
      if (sn < -.62 && !neck) plate(p, nn, back, side, sz * .62, .008, j, 1.6);                                                     /* belly: wide flat ventral scutes */
            else if (girdle) spike(p, nn, back.clone().addScaledVector(nn, .45).normalize(), side, sz, sz * .9, .9 + .5 * j, j);             /* neck girdle: long raised spines */
      else spike(p, nn, back.clone().addScaledVector(nn, .12).normalize(), side, sz * (.85 + .3 * j), sz * lp(.3, .5, sn * .5 + .5), .3 + .35 * j, j);   /* keeled pointed scales on the flanks AND the back */
    }
    d += sz * (girdle ? .95 : .78); ring++;
  }
  /* COVERAGE PASS on the neck/body skin: every skin vertex without a scale nearby gets one (no bare glowing patches,
     especially where the neck joins the back of the head) */
  { const pa = skinG.attributes.position, na = skinG.attributes.normal, cell = .05, grid = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    const put = q => { const k = key(q.x, q.y, q.z); (grid.get(k) || grid.set(k, []).get(k)).push(q); };
    const near = (q, r) => { const cx = Math.floor(q.x / cell), cy = Math.floor(q.y / cell), cz = Math.floor(q.z / cell), Rr = Math.ceil(r / cell); for (let a = -Rr; a <= Rr; a++) for (let b = -Rr; b <= Rr; b++) for (let c = -Rr; c <= Rr; c++) { const L = grid.get(`${cx + a},${cy + b},${cz + c}`); if (L) for (const o of L) if (o.distanceToSquared(q) < r * r) return true; } return false; };
    centers.forEach(put); const P = V(), N = V();
    for (let v = 0; v < pa.count; v++) { P.fromBufferAttribute(pa, v); N.fromBufferAttribute(na, v); const dd = Math.floor(v / (NS + 1)) / NZ * Len, fr = frame(dd); if (N.dot(P.clone().sub(fr.c)) < 0) N.negate();
      const r = lp(.035, .05, smoothstep(.3, 2.2, dd)); if (near(P, r)) continue;
      const back = fr.T.clone().addScaledVector(N, -fr.T.dot(N)).normalize(), side = V().crossVectors(N, back).normalize(), jj = J(v, 11), sz = r * 1.3;
      spike(P.clone(), N.clone(), back.clone().addScaledVector(N, .12).normalize(), side, sz, sz * .4, .3 + .3 * jj, jj); put(P.clone()); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); B.add(new THREE.Mesh(g, scM));
  /* dorsal spikes down the midline: short behind the head, tallest over the shoulders, shrinking toward the hips */
  { const dg = new THREE.Group();
    for (let dd = .35; dd < Len - .1; dd += .14) { const fr = frame(dd), pr = prof(dd), p = surf(fr, pr, Math.PI / 2).addScaledVector(fr.N, -.01), hgt = lp(.06, .26, smoothstep(.3, 1.9, dd)) * (1 - .55 * smoothstep(2.2, 3.4, dd)) * (.85 + .3 * J(dd * 10, 3));
      const tip = p.clone().addScaledVector(fr.N, hgt).addScaledVector(fr.T, hgt * .7), mid = p.clone().lerp(tip, .5).addScaledVector(fr.T, -hgt * .08);
      dg.add(new THREE.Mesh(sweep([p, mid, tip], t => { const k = hgt * .28 * Math.pow(1 - t, .9) + .002; return { w: k * .45, h: k, n: 1.8 }; }, { segs: 10, rad: 8, up: V(1, 0, 0) }), hornM)); }
    B.add(bake(S, dg)); }
  S._wdSpine = { cv, Len, prof, frame, surf };
}
/* ---- storm drake TAIL: long tapering tail carrying on from the hips, girdled with whorls of big spiky scales (the reference
   lizard's tail), dorsal spikes shrinking toward the tip, and a fan of lightning-veined blades at the end.
   it sways in a travelling wave done in the vertex shader (attribute aTail = 0 at the root → 1 at the tip), so it costs nothing on the CPU */
const WD_T = { value: 0 };
function wdBend(m) {
  if (m.userData.wdBend) return; m.userData.wdBend = true;
  const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uWT = WD_T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTail; uniform float uWT;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float a = aTail; transformed.x += sin(uWT * 1.6 - a * 4.2) * .34 * a * a; transformed.y += sin(uWT * 1.15 - a * 3.) * .09 * a * a; }'); };
  m.customProgramCacheKey = () => key0 + '|wdBend';
}
function wdTail(S, B) {
  const H = wdArmorMat(S), hornM = S._wdHornM, scM = S._wdScaleM, SP = S._wdSpine; [H, hornM, scM].forEach(wdBend);
  const end = SP.frame(SP.Len), p0 = SP.prof(SP.Len), c0 = end.c;
  const cv = new THREE.CatmullRomCurve3([c0.clone().addScaledVector(end.T, -.02), c0.clone().add(V(0, .01, .65)), c0.clone().add(V(0, .07, 1.35)), c0.clone().add(V(0, .16, 2.05)), c0.clone().add(V(0, .26, 2.75)), c0.clone().add(V(0, .34, 3.35))], false, 'catmullrom', .5), TL = cv.getLength();
  const prof = d => { const a = Math.min(1, d / TL), k = Math.pow(1 - a, 1.15) * .94 + .06 * (1 - a); return { w: p0.w * k + .006, ht: p0.ht * k + .006, hb: p0.hb * k + .006 }; };
  const UP = V(0, 1, 0), NS = 32, NZ = 80, n = 2.4;
  const frame = d => { const u = Math.min(1, Math.max(0, d / TL)), c = cv.getPointAt(u), T = cv.getTangentAt(u), N = UP.clone().addScaledVector(T, -UP.dot(T)).normalize(), Sd = V().crossVectors(N, T).normalize(); return { c, T, N, Sd }; };
  const surf = (fr, pr, th) => { const cs = Math.cos(th), sn = Math.sin(th); return fr.c.clone().addScaledVector(fr.Sd, pr.w * spw(cs, 2 / n)).addScaledVector(fr.N, (sn >= 0 ? pr.ht : pr.hb) * spw(sn, 2 / n)); };
  const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; B.add(o); return o; };
  /* skin tube, closed at the tip */
  { const pos = [], uv = [], at = [], idx = [];
    for (let i = 0; i <= NZ; i++) { const d = i / NZ * TL, fr = frame(d), pr = prof(d); let arc = 0, prev = null;
      for (let j = 0; j <= NS; j++) { const p = surf(fr, pr, j / NS * TAU - Math.PI / 2); if (prev) arc += p.distanceTo(prev); prev = p; pos.push(p.x, p.y, p.z); uv.push(arc / 2, -(SP.Len + d)); at.push(d / TL); if (i < NZ && j < NS) { const a = i * (NS + 1) + j, b = a + NS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } } }
    const tip = cv.getPointAt(1), ci = pos.length / 3; pos.push(tip.x, tip.y, tip.z); uv.push(0, 0); at.push(1); for (let j = 0; j < NS; j++) idx.push(ci, NZ * (NS + 1) + j + 1, NZ * (NS + 1) + j);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aTail', new THREE.Float32BufferAttribute(at, 1)); g.setIndex(idx); g.computeVertexNormals(); mesh(g, H); }
  /* whorls of spiky scales */
  const base = wdCol(S).base, tipC = wdCol(S).tip, rootC = wdCol(S).root, W1 = new THREE.Color(1, 1, 1);
  const J = (a, b) => { const v = Math.sin(a * 53.1 + b * 19.7) * 43758.5; return v - Math.floor(v); };
  const pos = [], col = [], at = [];
  const T3 = (a, ca, b, cb, c, cc, t) => { for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { pos.push(p.x, p.y, p.z); col.push(q.r, q.g, q.b); at.push(t); } };
  const spike = (p, nn, back, side, sz, ht, ext, j, t) => { const w = sz * .55, fr = p.clone().addScaledVector(back, -sz * .55), le = p.clone().addScaledVector(side, w), ri = p.clone().addScaledVector(side, -w), re = p.clone().addScaledVector(back, sz * .35);
    const tip = p.clone().addScaledVector(back, sz * (.95 + ext)).addScaledVector(nn, ht), keel = p.clone().addScaledVector(back, sz * .2).addScaledVector(nn, ht * .75), tc = tipC.clone().lerp(W1, .1 * j);
    T3(fr, rootC, le, rootC, keel, base, t); T3(ri, rootC, fr, rootC, keel, base, t); T3(le, rootC, tip, tc, keel, base, t); T3(keel, base, tip, tc, ri, rootC, t); T3(le, rootC, re, rootC, tip, tc, t); T3(re, rootC, ri, rootC, tip, tc, t); };
  let d = .04, ring = 0;
  while (d < TL - .12) {
    const fr = frame(d), pr = prof(d), a = d / TL, sz = lp(.062, .03, Math.pow(a, .8)),   /* tail scales start smaller than the body's so the root reads slimmer */ per = Math.PI * (pr.w + (pr.ht + pr.hb) / 2), cnt = Math.max(6, Math.round(per / (sz * 1.0)));
    for (let k = 0; k < cnt; k++) {
      const th = (k + (ring % 2) * .5) / cnt * TAU - Math.PI / 2, sn = Math.sin(th), p = surf(fr, pr, th);
      const pa = surf(fr, pr, th + .01), pb = surf(fr, pr, th - .01), tA = pa.sub(pb).normalize(), nn = V().crossVectors(fr.T, tA).normalize(); if (nn.dot(p.clone().sub(fr.c)) < 0) nn.negate();
      const back = fr.T.clone().addScaledVector(nn, -fr.T.dot(nn)).normalize(), side = V().crossVectors(nn, back).normalize(), j = J(ring, k), under = sn < -.55;
      /* every scale in a whorl is a raised spine (lower and flatter underneath) */
      spike(p, nn, back.clone().addScaledVector(nn, under ? .1 : .4).normalize(), side, sz * (.9 + .25 * j), sz * (under ? .3 : lp(.55, .85, Math.min(1, a * 4))), under ? .3 : .6 + .45 * j, j, a);
    }
    d += sz * .9; ring++;
  }
  { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aTail', new THREE.Float32BufferAttribute(at, 1)); g.computeVertexNormals(); mesh(g, scM); }
  /* dorsal spikes continuing down the tail + the lightning blade fan at the tip */
  const tubes = [];
  /* tail-tip fan: made of the same glowing bolt material as the claws (lightning on the storm drake, fire on the blaze drake),
     with the tail's sway (wdBend) so the blades swing with the tail */
  if (!S._boltCore) boltHorn(S, new THREE.Group(), [V(), V(0, .01, 0)], .001, .001);
  const gMs = S._wdTailGlow || (S._wdTailGlow = [S._boltCore, S._boltBody, S._boltHalo].map(m => { const c = m.clone(); if (c.uniforms && c.uniforms.uFT) c.uniforms.uFT = FIRE_T; wdBend(c); return c; }));
  const glowBlade = (pts0, r0, a0, a1) => { const P = []; for (let i = 0; i < pts0.length - 1; i++) for (let k = 0; k < 4; k++) P.push(pts0[i].clone().lerp(pts0[i + 1], k / 4)); P.push(pts0[pts0.length - 1].clone());
    [[gMs[0], .38, 6], [gMs[1], 1, 6], [gMs[2], 2.1, 8]].forEach(([m, k, seg], li) => { const g = polyTube(P, t => lp(r0, .002, t) * k, seg), A = new Float32Array(g.attributes.position.count);
      for (let i = 0; i < P.length; i++) for (let j = 0; j <= seg; j++) A[i * (seg + 1) + j] = lp(a0, a1, i / (P.length - 1));
      g.setAttribute('aTail', new THREE.BufferAttribute(A, 1)); const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 5 + li; B.add(me); S.glows.push(me); }); };
  const blade = (pts, r0, a0, a1, flat = .45) => { const g = sweep(pts, t => { const k = r0 * Math.pow(1 - t, .9) + .002; return { w: k * flat, h: k, n: 1.8 }; }, { segs: 12, rad: 8, up: V(1, 0, 0) }), c = g.attributes.position.count, A = new Float32Array(c), uvv = g.attributes.uv;
    for (let i = 0; i < c; i++) A[i] = lp(a0, a1, uvv.getY(i)); g.setAttribute('aTail', new THREE.BufferAttribute(A, 1)); tubes.push(g); };
  for (let dd = .12; dd < TL - .3; dd += .16) { const fr = frame(dd), pr = prof(dd), p = surf(fr, pr, Math.PI / 2).addScaledVector(fr.N, -.01), hgt = lp(.12, .03, dd / TL) * (.85 + .3 * J(dd * 10, 5)), tip = p.clone().addScaledVector(fr.N, hgt).addScaledVector(fr.T, hgt * .8);
    blade([p, p.clone().lerp(tip, .5).addScaledVector(fr.T, -hgt * .08), tip], hgt * .28, dd / TL, (dd + hgt) / TL); }
  { const fr = frame(TL * .97), c = fr.c; for (const [sx, sy, L] of [[0, 1, .55], [1, .35, .45], [-1, .35, .45], [.6, -.6, .35], [-.6, -.6, .35]]) {
      const dir = fr.T.clone().multiplyScalar(1).addScaledVector(fr.Sd, sx * .55).addScaledVector(fr.N, sy * .45).normalize(), tip = c.clone().addScaledVector(dir, L);
      glowBlade([c.clone().addScaledVector(fr.T, -.06), c.clone().lerp(tip, .5).addScaledVector(fr.N, .02), tip], .016, .97, 1.05); } }
  for (const g of tubes) mesh(g, hornM);
  S.extras.push((sh, dt, t) => { WD_T.value = t * (sh.mode === sh.cfg.moving ? 1.6 : 1); });
}
/* ---- storm drake LEGS: four thick lizard limbs folded for flight — forelegs tucked under the chest, hind legs trailing back
   along the tail root. each bone is an armour-skin tube armoured with rings of big keeled spines pointing down the limb
   (the reference lizard's spiky forearms), knobbly joints, splayed toes and curved lightning-veined claws ---- */
function wdLimbs(S, B) {
  const H = wdArmorMat(S), hornM = S._wdHornM, scM = S._wdScaleM;
  const base = wdCol(S).base, tipC = wdCol(S).tip, rootC = wdCol(S).root, W1 = new THREE.Color(1, 1, 1);
  const J = (a, b) => { const v = Math.sin(a * 29.3 + b * 61.7) * 43758.5; return v - Math.floor(v); };
  const pos = [], col = [], lg = new THREE.Group();
  const T3 = (a, ca, b, cb, c, cc) => { for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { pos.push(p.x, p.y, p.z); col.push(q.r, q.g, q.b); } };
  const spike = (p, nn, back, side, sz, ht, ext, j) => { const w = sz * .55, fr = p.clone().addScaledVector(back, -sz * .55), le = p.clone().addScaledVector(side, w), ri = p.clone().addScaledVector(side, -w), re = p.clone().addScaledVector(back, sz * .35);
    const tip = p.clone().addScaledVector(back, sz * (.95 + ext)).addScaledVector(nn, ht), keel = p.clone().addScaledVector(back, sz * .2).addScaledVector(nn, ht * .75), tc = tipC.clone().lerp(W1, .1 * j);
    T3(fr, rootC, le, rootC, keel, base); T3(ri, rootC, fr, rootC, keel, base); T3(le, rootC, tip, tc, keel, base); T3(keel, base, tip, tc, ri, rootC); T3(le, rootC, re, rootC, tip, tc); T3(re, rootC, ri, rootC, tip, tc); };
  /* one limb bone: tube + scale rings. 'out' = the limb's outer side (gets the biggest spines) */
  const bone = (pts, r0, r1, out, seed, spiny = 1) => {
    const cv = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5), L = cv.getLength(), rad = t => lp(r0, r1, t) * (1 + .12 * Math.sin(Math.PI * t));
    lg.add(new THREE.Mesh(sweep(pts, t => ({ w: rad(t), h: rad(t) * .92, n: 2.2 }), { segs: 24, rad: 14, up: out }), H));
    let d = .03, ring = 0;
    while (d < L - .02) { const t = d / L, c = cv.getPointAt(t), T = cv.getTangentAt(t), r = rad(t), A = out.clone().addScaledVector(T, -out.dot(T)).normalize(), Bv = V().crossVectors(T, A).normalize();
      const sz = Math.max(.028, r * .5), cnt = Math.max(8, Math.round(TAU * r / (sz * .85)));   /* denser so thick bones (thigh) stay fully covered */
      for (let k = 0; k < cnt; k++) { const th = (k + (ring % 2) * .5) / cnt * TAU, nn = A.clone().multiplyScalar(Math.cos(th)).addScaledVector(Bv, Math.sin(th)), p = c.clone().addScaledVector(nn, r * .97);
        const side = V().crossVectors(nn, T).normalize(), j = J(seed + ring, k), outer = Math.max(0, Math.cos(th));   /* spines get big on the outer face */
        spike(p, nn, T.clone().addScaledVector(nn, .25 + .35 * outer * spiny).normalize(), side, sz * (.85 + .3 * j + .35 * outer * spiny), sz * (.35 + .6 * outer * spiny), .3 + .6 * outer * spiny + .3 * j, j); }
      d += sz * .7; ring++; }
    return cv; };
  /* knobbly joint, fully scaled: keeled scales spread over the sphere (golden-spiral points), all lying toward the limb's end */
  const joint = (p, r, dir = V(0, -1, 0)) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), H); m.position.copy(p); lg.add(m);
    const sz = Math.max(.028, r * .45), N = Math.round(4 * Math.PI * r * r / (sz * sz * .55)), dd = dir.clone().normalize();
    for (let i = 0; i < N; i++) { const yv = 1 - 2 * (i + .5) / N, rr = Math.sqrt(1 - yv * yv), ph = i * 2.39996, nn = V(Math.cos(ph) * rr, yv, Math.sin(ph) * rr);
      const back = dd.clone().addScaledVector(nn, -dd.dot(nn)); if (back.lengthSq() < 1e-3) back.set(nn.y, -nn.x, 0); back.normalize();
      const side = V().crossVectors(nn, back).normalize(), j = J(i, r * 100);
      spike(p.clone().addScaledVector(nn, r * .96), nn, back.clone().addScaledVector(nn, .3).normalize(), side, sz * (.85 + .3 * j), sz * .45, .35 + .3 * j, j); } };
  const claw = (p, dir, L, r) => { const d = dir.clone().normalize(), dn = V(0, -1, 0).addScaledVector(d, -d.y).normalize(), tip = p.clone().addScaledVector(d, L * .6).addScaledVector(dn, L * .55);
    lg.add(new THREE.Mesh(sweep([p, p.clone().addScaledVector(d, L * .45).addScaledVector(dn, L * .1), tip], t => { const k = r * Math.pow(1 - t, .8) + .002; return { w: k * .7, h: k, n: 1.8 }; }, { segs: 12, rad: 8, up: V(0, 1, 0) }), hornM)); };
  const foot = (w, dirs, toeL, toeR) => { dirs.forEach((dv, i) => { const d = dv.clone().normalize(), e = w.clone().addScaledVector(d, toeL * (i === 0 ? .7 : 1)).add(V(0, -.03, 0));
      bone([w.clone(), w.clone().lerp(e, .5).add(V(0, .015, 0)), e], toeR, toeR * .7, V(0, 1, 0), 90 + i * 7, .3); claw(e, d, toeL * .55, toeR * .9); }); };
  for (const s of [1, -1]) {
    const X = (x, y, z) => V(s * x, y, z), OUT = V(s, .2, 0).normalize();
    /* foreleg: shoulder → elbow folded back → forearm forward → hand hanging with claws curled down */
    const sh = X(.27, -.46, 1.72), el = X(.47, -.66, 2.1), wr = X(.43, -.83, 1.78);
    joint(sh, .13, el.clone().sub(sh)); bone([sh, X(.4, -.56, 1.93), el], .12, .09, OUT, 10 * s);
    joint(el, .095, wr.clone().sub(el)); bone([el, X(.47, -.78, 1.95), wr], .085, .06, OUT, 30 * s, 1.4);
    joint(wr, .065, X(0, -1, -.3)); foot(wr, [X(-.25, -.5, -1), X(0, -.6, -1), X(.3, -.55, -1), X(.55, -.4, -.7)], .17, .028);
    /* hind leg: hip → knee → shin trailing back → foot pointing back along the tail */
    const hp = X(.25, -.38, 3.02), kn = X(.44, -.6, 3.25), an = X(.36, -.72, 3.8);
    joint(hp, .16, kn.clone().sub(hp)); bone([hp, X(.37, -.5, 3.1), kn], .15, .11, OUT, 50 * s);
    joint(kn, .1, an.clone().sub(kn)); bone([kn, X(.42, -.7, 3.5), an], .095, .065, OUT, 70 * s, 1.2);
    joint(an, .07, X(0, -.3, 1)); foot(an, [X(-.2, -.25, 1), X(0, -.3, 1), X(.25, -.25, 1), X(.5, -.1, .7)], .2, .03);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); lg.add(new THREE.Mesh(g, scM));
  B.add(lg);
}
/* ---- storm drake WINGS: big bat wings. arm (humerus + forearm) in scaled armour, four long finger bones in lightning-veined
   horn, thin dark membrane stretched between them with a scalloped trailing edge and a slight billow. branching lightning veins
   run through the membrane and pulses of light travel out along them toward the wing edge. the inner membrane panel is re-stretched
   every frame between the body flank and the flapping wing so it never tears away from the body ---- */
/* leathery wing-membrane texture (u = along the fingers, v = across a panel):
   fine stretch creases running along the fingers, a pebbly leather grain, darker thick skin near the bones,
   thinner lighter skin in the middle of each panel. colour + normal maps, both generated here */
const WD_MEM = (() => {
  const W = 512, Hh = 256, R = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nz = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = R(xi, yi), b = R(xi + 1, yi), c = R(xi, yi + 1), d = R(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => .5 * nz(x, y) + .3 * nz(x * 2.1 + 5, y * 2.1) + .2 * nz(x * 4.3, y * 4.3 + 3);
  const hgt = new Float32Array(W * Hh), col = document.createElement('canvas'), nm = document.createElement('canvas'); col.width = nm.width = W; col.height = nm.height = Hh;
  const ci = col.getContext('2d').createImageData(W, Hh), ni = nm.getContext('2d').createImageData(W, Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const u = x / W, v = y / Hh;
    const warp = fbm(u * 6, v * 3) * 2.2, crease = Math.pow(Math.abs(Math.sin((v * 34 + warp) * Math.PI)), 6) * (.4 + .6 * nz(u * 9, v * 30));     /* long thin creases along the fingers */
    const cell = (() => { const gx = u * 120, gy = v * 60, ix = Math.floor(gx), iy = Math.floor(gy); let m = 9; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const px = ix + a + R(ix + a, iy + b), py = iy + b + R(iy + b, ix + a + 7), d = (gx - px) ** 2 + (gy - py) ** 2; if (d < m) m = d; } return Math.sqrt(m); })();
    const h = -crease * .7 + (1 - Math.min(1, cell * 1.4)) * .25 + fbm(u * 20, v * 10) * .2; hgt[y * W + x] = h;
    const edge = Math.min(v, 1 - v), thick = 1 - Math.min(1, edge * 6), mid = Math.sin(Math.PI * v) * Math.min(1, u * 3);
    const c = (.55 + .25 * fbm(u * 8, v * 4)) * (1 - .35 * thick) * (1 - .4 * crease) * (.9 + .25 * mid), o = (y * W + x) * 4;
    ci.data[o] = c * 255; ci.data[o + 1] = c * 255; ci.data[o + 2] = c * 255; ci.data[o + 3] = 255; }
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const hx = hgt[y * W + Math.min(W - 1, x + 1)] - hgt[y * W + Math.max(0, x - 1)], hy = hgt[Math.min(Hh - 1, y + 1) * W + x] - hgt[Math.max(0, y - 1) * W + x], o = (y * W + x) * 4, nx = -hx * 5, ny = -hy * 5, l = Math.hypot(nx, ny, 1);
    ni.data[o] = (nx / l * .5 + .5) * 255; ni.data[o + 1] = (ny / l * .5 + .5) * 255; ni.data[o + 2] = (1 / l * .5 + .5) * 255; ni.data[o + 3] = 255; }
  col.getContext('2d').putImageData(ci, 0, 0); nm.getContext('2d').putImageData(ni, 0, 0);
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  return { map: T(col, true), nrm: T(nm, false) };
})();
function wdWings(S, B) {
  const H = wdArmorMat(S), hornM = S._wdHornM, gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  /* membrane: leathery, darker and thicker along the bones, thinner in the middle of each panel where light glows through
     (fake translucency: the thin skin picks up a dim warm/glow tint that grows when seen against the light) */
  const memM = new THREE.MeshStandardMaterial({ map: WD_MEM.map, normalMap: WD_MEM.nrm, normalScale: new THREE.Vector2(1.1, 1.1), color: wdCol(S).base.clone().multiplyScalar(.7),
    metalness: .05, roughness: .62, side: THREE.DoubleSide, emissive: gl.clone().lerp(new THREE.Color(1, .55, .4), .35), emissiveIntensity: .0 });
  const uT = { value: 0 };
  const uFG = { value: S._fire ? gl.clone().multiplyScalar(.45) : new THREE.Color(0, 0, 0) };
  memM.onBeforeCompile = sh => { sh.uniforms.uWV = uT; sh.uniforms.uFG = uFG;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWV; uniform vec3 uFG;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float thin = sin(3.14159 * vMapUv.y) * smoothstep(.0, .35, vMapUv.x);
        vec3 Vv = normalize(vViewPosition); float back = pow(1. - abs(dot(normal, Vv)), 1.5);
        totalEmissiveRadiance += diffuseColor.rgb * thin * (.18 + .35 * back) * vec3(1.2, .75, .7);
        totalEmissiveRadiance += uFG * (.35 + .65 * thin) * (.75 + .25 * sin(uWV * 3.1 + vMapUv.x * 9. + vMapUv.y * 5.)); }`); };   /* fire version: the membrane glows with the fire behind it */
  memM.customProgramCacheKey = () => 'wdMembrane2';
  if (S.P.d.prism) { const prev = memM.onBeforeCompile; prismify(memM); const pr = memM.onBeforeCompile; memM.onBeforeCompile = (sh, r) => { prev(sh, r); pr(sh, r); }; memM.customProgramCacheKey = () => 'wdMembrane2P'; }
  const tube = (pts, r0, r1, mat, parent) => { const m = new THREE.Mesh(sweep(pts, t => { const k = lp(r0, r1, t) * (1 + .15 * Math.sin(Math.PI * t)) + .003; return { w: k, h: k * .85, n: 2 }; }, { segs: 18, rad: 10, up: V(0, 1, 0) }), mat); parent.add(m); return m; };
  /* membrane panel between two edge curves a(u) and b(u); the far row scallops inward; billows along the normal */
  const panel = (A, Bc, nu, nv, sag, bil, out) => { const pos = out || new Float32Array((nu + 1) * (nv + 1) * 3), uv = [], idx = [], P = V(), Q = V(), W = V();
    for (let i = 0; i <= nu; i++) { const u = i / nu, a = A(u), b = Bc(u);
      for (let j = 0; j <= nv; j++) { const v = j / nv; P.copy(a).lerp(b, v);
        if (u > .7) { const k = (u - .7) / .3, mid = a.clone().lerp(b, .5); W.copy(mid).sub(P); P.addScaledVector(W, 0); P.add(Q.copy(A(.62)).lerp(Bc(.62), v).sub(P).multiplyScalar(sag * k * k * Math.sin(Math.PI * v))); }
        P.y -= bil * Math.sin(Math.PI * v) * Math.sin(Math.PI * Math.min(1, u * 1.2));
        P.y += .011 * Math.sin(v * Math.PI * 9 + u * 4) * Math.sin(Math.PI * v) * (.4 + .6 * u) + .006 * Math.sin(u * 37 + v * 5) * Math.sin(Math.PI * v);   /* tension wrinkles running along the fingers */
        pos.set([P.x, P.y, P.z], (i * (nv + 1) + j) * 3); if (!out) { uv.push(u, v); if (i < nu && j < nv) { const p0 = i * (nv + 1) + j, p1 = p0 + nv + 1; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); } } } }
    if (out) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const poly = pts => { const c = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .5); return u => c.getPointAt(Math.min(1, Math.max(0, u))); };
  const hemM = new THREE.MeshStandardMaterial({ color: new THREE.Color(S.P.d.base).multiplyScalar(.35), metalness: .2, roughness: .5, emissive: gl.clone(), emissiveIntensity: .25 });
  const scM = S._wdScaleM, base = wdCol(S).base, tipC = wdCol(S).tip, rootC = wdCol(S).root;
  /* keeled scales ringed round a bone (same scale as the body), added to the given parent */
  const armScales = (parent, pts, r0, r1, sd) => { const cv = new THREE.CatmullRomCurve3(pts), Ln = cv.getLength(), pos = [], col = [];
    const T3 = (a, ca, b, cb, c, cc) => { for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) { pos.push(p.x, p.y, p.z); col.push(q.r, q.g, q.b); } };
    let d = .02, ring = 0; while (d < Ln - .02) { const t = d / Ln, c = cv.getPointAt(t), T = cv.getTangentAt(t), r = lp(r0, r1, t), A = V(0, 1, 0).addScaledVector(T, -T.y).normalize(), Bv = V().crossVectors(T, A).normalize(), sz = Math.max(.024, r * .5), cnt = Math.max(10, Math.round(TAU * r / (sz * .78)));   /* dense: no bare skin on the arm */
      for (let k = 0; k < cnt; k++) { const th = (k + (ring % 2) * .5) / cnt * TAU, nn = A.clone().multiplyScalar(Math.cos(th)).addScaledVector(Bv, Math.sin(th)), p = c.clone().addScaledVector(nn, r), side = V().crossVectors(nn, T).normalize(), back = T.clone().addScaledVector(nn, .3).normalize(), w = sz * .55;
        const fr = p.clone().addScaledVector(back, -sz * .55), le = p.clone().addScaledVector(side, w), ri = p.clone().addScaledVector(side, -w), re = p.clone().addScaledVector(back, sz * .35), tip = p.clone().addScaledVector(back, sz * 1.3).addScaledVector(nn, sz * .4), kl = p.clone().addScaledVector(back, sz * .2).addScaledVector(nn, sz * .3);
        T3(fr, rootC, le, rootC, kl, base); T3(ri, rootC, fr, rootC, kl, base); T3(le, rootC, tip, tipC, kl, base); T3(kl, base, tip, tipC, ri, rootC); T3(le, rootC, re, rootC, tip, tipC); T3(re, rootC, ri, rootC, tip, tipC); }
      d += sz * .6; ring++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); parent.add(new THREE.Mesh(g, scM)); };
  const wings = [];
  for (const s of [1, -1]) {
    const X = (x, y, z) => V(s * x, y, z), sh0 = (() => { const SP = S._wdSpine; let d = 1.2; while (d < SP.Len && SP.frame(d).c.z < 1.72) d += .01; const fr = SP.frame(d), pr = SP.prof(d), p = SP.surf(fr, pr, .75); p.x *= s; return p.addScaledVector(fr.N, -.04).add(V(-s * .05, 0, 0)); })(), piv = new THREE.Group();   /* shoulder sunk into the upper flank of the trunk */ piv.position.copy(sh0); piv.scale.setScalar(1.2); B.add(piv);
    const L = (x, y, z) => X(x, y, z);   /* wing-local coordinates (pivot at the shoulder) */
    const el = L(.78, .28, .28), wr = L(1.72, .42, -.12);
    const tips = [L(3.25, .36, .08), L(3.05, .22, .86), L(2.45, .06, 1.46), L(1.55, -.04, 1.86)];
    const fing = tips.map((tp, i) => [wr, wr.clone().lerp(tp, .5).add(V(0, .05 - i * .015, 0)), tp]);
    /* arm bones (armour skin) + a row of leading-edge spikes, finger bones (lightning-veined horn), thumb claw */
    tube([L(0, 0, 0), L(.4, .18, .16), el], .085, .065, H, piv); tube([el, L(1.25, .4, .08), wr], .065, .045, H, piv);
    for (const p of [el, wr]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.075, 1), H); m.position.copy(p); piv.add(m); }
    for (let k = 0; k < 7; k++) { const cA = poly([L(0, 0, 0), el, wr]), p = cA(.08 + k * .13), tip = p.clone().add(L(.06, .14 + k * .012, -.12 - k * .01)); boltHorn(S, piv, [p, p.clone().lerp(tip, .5), tip], .022, .002); }   /* leading-edge spikes: lightning */
    fing.forEach((f, i) => { const c = poly(f);
      boltHorn(S, piv, [...Array(13)].map((_, k) => c(k / 12)), .036, .014);   /* finger bones made of the same glowing bolt as the claws (lightning / fire) */
      for (const u of [.04, .34, .66]) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(lp(.05, .025, u), 1), S._boltBody); m.position.copy(c(u)); m.scale.set(1, .8, 1); piv.add(m); }   /* knuckles */
      /* lightning-bone spur past the membrane: a jagged glowing bolt, long and needle-sharp, with a small fork */
      /* straight, needle-sharp spike made of lightning (glowing bolt material), slight downward hook at the very end */
      const tp = c(1), dir = c(1).clone().sub(c(.9)).normalize(), Ls = .62 - i * .08, end = tp.clone().addScaledVector(dir, Ls).add(V(0, -.05, 0));
      boltHorn(S, piv, [tp, tp.clone().lerp(end, .55).add(V(0, .015, 0)), end], .03, .002); });
    /* arm armour: rings of keeled scales on humerus and forearm, big shoulder muscle */
    { armScales(piv, [L(0, 0, 0), L(.4, .18, .16), el], .1, .07, s); armScales(piv, [el, L(1.25, .4, .08), wr], .072, .05, s); }
    /* arm armour: rings of keeled scales on humerus and forearm, big shoulder muscle */

    { const c0 = wr.clone().add(L(.02, .04, -.05)), c1 = c0.clone().add(L(.14, .1, -.2)), c2 = c1.clone().add(L(.08, -.06, -.12)); boltHorn(S, piv, [c0, c1, c2], .032, .002); }   /* wrist thumb claw: lightning */
    /* outer membrane panels between neighbouring fingers (static in the wing) + the arm-to-first-finger leading panel */
    const fc = fing.map(poly);
    for (let i = 0; i < 3; i++) { const g = panel(fc[i], fc[i + 1], 26, 14, .38, .06); piv.add(new THREE.Mesh(g, memM));
      /* thickened trailing-edge hem following the scallop */
      const pa = g.attributes.position.array, hem = []; for (let j = 0; j <= 14; j++) { const o = (26 * 15 + j) * 3; hem.push(V(pa[o], pa[o + 1], pa[o + 2])); }
      piv.add(new THREE.Mesh(sweep(hem, () => ({ w: .012, h: .008, n: 2 }), { segs: 28, rad: 6, up: V(0, 1, 0) }), hemM)); }
    piv.add(new THREE.Mesh(panel(poly([L(0, 0, 0), el, wr]), poly([L(.1, -.06, .3), L(.9, .12, .7), fing[3][2].clone().lerp(wr, .55)]), 18, 10, 0, .03), memM));
    /* inner panel: last finger → body flank, re-stretched each frame as the wing flaps */
    const body = poly([X(.3, -.04, 1.86), X(.31, -.06, 2.02), X(.3, -.08, 2.18)]), NU = 22, NV = 12,   /* short root on the flank: the wing starts narrow and widens outward */ ip = new Float32Array((NU + 1) * (NV + 1) * 3);
    const f4w = u => fc[3](u).clone().applyMatrix4(piv.matrix);
    piv.updateMatrix(); const ig = panel(f4w, body, NU, NV, .3, .05); const im = new THREE.Mesh(ig, memM); im.frustumCulled = false; B.add(im);
    wings.push({ s, piv, ig, ip, f4w, body, NU, NV }); (S._wdWingG || (S._wdWingG = [])).push(piv, im);
  }
  S.extras.push((sh, dt, t) => { uT.value = t;
    const mv = sh.mode === sh.cfg.moving, sp = mv ? 2.2 : 1.25, amp = mv ? .42 : .3;
    for (const w of wings) { const a = Math.sin(t * sp) * amp + .08; w.piv.rotation.set(0, w.s * Math.sin(t * sp - .6) * .06, w.s * a); w.piv.updateMatrix();
      panel(w.f4w, w.body, w.NU, w.NV, .3, .05, w.ig.attributes.position.array); w.ig.attributes.position.needsUpdate = true; w.ig.computeVertexNormals(); } });
}
function wdBody(S) {
  const B = new THREE.Group(), h = wdHead(S); B.position.z = -2.4; S.body.add(B);   /* offset group centres the long body on the stage */
  h.scale.setScalar(.75); B.add(h); wdTrunk(S, B);   /* head smaller relative to the body */ wdTail(S, B); wdLimbs(S, B); wdWings(S, B);
  wdAura(S, B);
  S.gun(tipAt(h, 0, -.1, -.95), { ...bolt(S, { rate: .1, speed: 70, r: .04, len: 1.3 }), color: tracerC(S) });
}
/* the lightning skin's light spreading outward: soft additive halos strung along the neck, body and tail, plus a few
   glow-coloured point lights inside the body that wash the armour scales with blue light; all pulse with the skin */
function wdAura(S, B) {
  const SP = S._wdSpine, gl = S.P.glow.clone(); gl.multiplyScalar(1 / Math.max(gl.r, gl.g, gl.b));
  const halos = [];
  const add = (p, sc, op) => { const m = new THREE.SpriteMaterial({ map: dotTex, color: gl.clone().multiplyScalar(.55), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(m); s.position.copy(p); s.scale.setScalar(sc); s.renderOrder = 4; B.add(s); halos.push({ s, sc, op, ph: Math.random() * TAU }); };
  for (let d = .15; d < SP.Len; d += .32) { const fr = SP.frame(d), pr = SP.prof(d); add(fr.c, (pr.w + pr.ht) * 3.4, .22); }
  for (let k = 0; k < 5; k++) add(SP.frame(SP.Len).c.clone().add(V(0, .06 * k, .55 + k * .6)), lp(1.1, .4, k / 4), .18);   /* along the tail */
  add(V(0, .05, -.3), 1.6, .2);   /* round the head */
  const kL = S.P.d.name === '흑뢰' ? .2 : 1, lights = [[.6, .9 * kL], [2.2, 1.3 * kL], [3.2, 1.1 * kL]].map(([d, i]) => {   /* 흑뢰: inner light kept faint so the armour stays black */ const L = new THREE.PointLight(gl, i, 2.6, 1.6); L.position.copy(SP.frame(d).c); B.add(L); return { L, i }; });
  S.extras.push((sh, dt, t) => { const f = (S._wdFlash || 1.7) / 1.7;
    for (const h of halos) { const k = f * (.8 + .25 * Math.sin(t * 2.6 + h.ph)); h.s.material.opacity = h.op * k; h.s.scale.setScalar(h.sc * (.95 + .1 * k)); }
    for (const l of lights) l.L.intensity = l.i * f * (.85 + .15 * Math.sin(t * 5 + l.i)); });
}
const WD_V = [
  { name: 'A · 스톰 드레이크', desc: '박쥐 날개 막에 번개 핏줄이 흐르는 날개를 퍼덕이며 날아요. 네 다리는 비행 자세로 접혀 있고, 바깥쪽에 큰 가시 비늘이 솟은 굵은 다리 끝에 번개 균열 갈고리 발톱이 달려 있어요. 꼬리는 가시 비늘 고리가 촘촘히 감싸고 끝에 번개 균열 칼날 5개가 부채처럼 펼쳐져요. 꼬리는 물결치듯 흔들려요. S자로 휜 긴 목과 가슴이 깊은 몸통을 갑옷도마뱀 비늘로 덮었어요(등은 방패 비늘판, 옆구리는 용골 비늘, 배는 넓은 배비늘, 목에는 3줄마다 긴 가시 고리, 등 가운데 가시 줄). 갑옷도마뱀처럼 넓고 납작한 삼각형 얼굴에 짧고 뭉툭한 주둥이, 눈 위로 튀어나온 두꺼운 이마 능선, 높은 광대뼈를 가진 서양룡 머리예요. 마디진 뿔 두 쌍, 이마 가시, 볼 프릴, 코 뿔, 번개 균열이 흐르는 각진 갑옷 비늘판, 세로 동공의 빛나는 파충류 눈, 번개 균열이 갈라진 뿔, 톱니 이빨이 있어요. 공격할 때 입을 벌리면 목 안에서 번개가 차오르고 입안에서 전기가 튀어요.',
    build(S) { ceFinish(S); } },
  { name: 'B · 뇌전 드레이크', desc: 'A에 번개 효과를 더했어요. 몸 주변으로 번개가 아주 불규칙하고 자주 쳐서 비늘 위를 기어가고, 몸·날개·꼬리 사이를 건너뛰고, 공중으로 튀어나가요. 칠 때마다 몸 전체가 번쩍여요.',
    build(S) { ceStorm(S, 1, { noPrism: true, haloK: .15 }); ceFinish(S); } },
  { name: 'C · 뇌운 드레이크', desc: 'B에 번개 치는 먹구름을 더했어요. 몸 양옆으로 먹구름이 깔리고 구름 속에서 번개가 번쩍이며, 무빙 때는 구름이 빠르게 스쳐 지나가요.',
    build(S) { ceStorm(S, 1, { noPrism: true, haloK: .15 }); dragonStormClouds(S, null, { spread: 2.3, size: 1.5, side: 2.7, z0: -6, z1: 3, coreK: .45 }); ceFinish(S); } },   /* coreK: the in-cloud flash glow stays inside the cloud (it used to spill over the wing roots) */
];
PAINTS3.blazedrake = [TP('인페르노', '#2a0c04', '#ff7a1a', '#ffd070', [2.8, 1.2, .3], [0xffe0a0, 0xff6010]), TP('청염', '#060c22', '#3a9aff', '#bfe4ff', [.5, 1.4, 2.8], [0xffffff, 0x3a8aff]), TP('흑염', '#0a0410', '#b040ff', '#f0c0ff', [1.9, .6, 2.6], [0xffd8ff, 0xa030ff]), { ...TPR(), pv: 1 }];
PAINTS3.stormdrake = [TP('스톰 블루', '#2a3550', '#5ab0ff', '#9fd8ff', [.5, 1.6, 2.8], [0xffffff, 0x4ab0ff]), TP('흑뢰', '#0b0b0e', '#cfe4ff', '#ffffff', [2.2, 2.45, 2.8], [0xffffff, 0xbfe0ff]), { ...TP('골드', '#3a2c10', '#ffc040', '#ffe6a0', [2.6, 1.55, .4], [0xfff0c0, 0xffa020]), gold: true }, TPR()];
/* ===== BLAZE EAGLE · 불꽃 독수리 — the fire-element version of Thunderbird Λ (same body, burning instead of electric) =====
   - every feather / plate gets a living fire material: charred dark base, emissive fire that flows up and back through it
     (3D value-noise in object space, two octaves scrolling at different speeds), coloured by a 4-stop heat ramp
     (deep red → orange → gold → white-hot) so each paint can be a different fire (inferno / blue fire / black fire / prism)
   - flame tongues burn on the tips of every mane, body, wing and tail feather (camera-facing point flames: teardrop shape,
     wobbling, flickering, hottest at the root), moving with the wing flap and tail sway
   - embers stream off the body and drift back and up; soft orange heat halos pulse around the body */
const FIRE_GLSL = `
  float fh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float fn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
    return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }
  vec3 framp(float h, vec3 c0, vec3 c1, vec3 c2, vec3 c3){ return h < .4 ? mix(c0, c1, h / .4) : h < .75 ? mix(c1, c2, (h - .4) / .35) : mix(c2, c3, (h - .75) / .25); }
  vec3 rbw(float x){ return clamp(abs(fract(x + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.); }`;
const FIRE_T = { value: 0 };
let _fireNoise = null;
function fireNoise3D() { if (_fireNoise) return _fireNoise; const N = 32, d = new Uint8Array(N * N * N); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 255;
  const t = new THREE.Data3DTexture(d, N, N, N); t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType; t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping; t.unpackAlignment = 1; t.needsUpdate = true; return _fireNoise = t; }
function fireRamp(S) {
  const d = S.P.d;
  if (S._ice) { const C = (a, b, c) => new THREE.Color(a, b, c);   /* cold ramps (deep -> mid -> bright -> white core), same as ICE LAB */
    if (d.name === '서리') return [C(.03, .04, .08), C(.35, .45, .62), C(.75, .85, .98), C(1, 1, 1)];
    if (d.name === '극광') return [C(0, .06, .08), C(0, .5, .55), C(.3, .95, .85), C(.85, 1, .95)];
    return [C(0, .03, .12), C(.05, .3, .75), C(.35, .75, 1), C(.85, .97, 1)]; }
  if (d.name === '청염') return [new THREE.Color(.02, .06, .35), new THREE.Color(.1, .45, 1.4), new THREE.Color(.5, 1.3, 2), new THREE.Color(1.8, 2.2, 2.4)];
  if (d.prism && d.pv >= 2) return [new THREE.Color(.12, .12, .16), new THREE.Color(.6, .62, .72), new THREE.Color(1.35, 1.35, 1.45), new THREE.Color(2, 2, 2.1)];   /* silver-white fire */
  if (d.name === '흑염') return [new THREE.Color(0, 0, 0), new THREE.Color(.05, .025, .07), new THREE.Color(.2, .13, .26), new THREE.Color(.55, .45, .65)];   /* black fire: dark smoky flames with only a faint violet core */
  return [new THREE.Color(.35, .02, 0), new THREE.Color(1.25, .32, .02), new THREE.Color(1.9, 1.05, .18), new THREE.Color(2.3, 2.05, 1.4)];
}
/* feather fire: dark crimson at the root, the feather itself turns to flame toward the tip (orange -> gold -> white-hot edge),
   fine streaks of fire racing from root to tip, a hot fresnel rim. non-feather surfaces (head, body, beak) are charred
   obsidian-black skin split by glowing lava veins that slowly breathe */
function fireMat(S, src, feather) {
  const BK = S.P.d.name === '흑염' && !S._ice, R = fireRamp(S), m = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1), vertexColors: !!src.vertexColors, metalness: BK ? 0 : feather ? .15 : .35, roughness: BK ? .3 : feather ? .5 : .28, envMapIntensity: BK ? .5 : 1, flatShading: true, side: THREE.DoubleSide, emissive: new THREE.Color(1, 1, 1) });
  const U = { uFT: FIRE_T, uEK: { value: BK ? .05 : 1 }, uPrism: { value: S.P.d.prism ? 1 : 0 }, uC0: { value: R[0] }, uC1: { value: R[1] }, uC2: { value: R[2] }, uC3: { value: R[3] } };
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; attribute float aTip; varying float vTip;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position; vTip = aTip;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', '#include <aomap_fragment>\ntotalEmissiveRadiance *= uEK;' + (BK ? '\nreflectedLight.directSpecular *= .12; reflectedLight.indirectSpecular *= .25; reflectedLight.directDiffuse *= .5;' : '')).replace('#include <color_fragment>', '#include <color_fragment>' + (BK ? '\ndiffuseColor.rgb = vec3(.016, .015, .02);' : '')).replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying float vTip; uniform float uFT, uPrism, uEK; uniform vec3 uC0, uC1, uC2, uC3;' + FIRE_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (BK ? 'diffuseColor.rgb = vec3(.016, .015, .02);' : feather ? (S._ice ? 'diffuseColor.rgb = mix(vec3(.12,.2,.3), vec3(.5,.65,.8), vTip);' : 'diffuseColor.rgb = mix(vec3(.22,.07,.025), vec3(.3,.1,.03), vTip);') : (S._ice ? 'diffuseColor.rgb = vec3(.1,.16,.24);' : 'diffuseColor.rgb = vec3(.035,.03,.032);')))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float fr = pow(1. - abs(dot(normal, normalize(vViewPosition))), 2.2);
        ${feather ? `float streak = fn(vec3(vOP.x * 16., vOP.y * 16. - uFT * 2.5, vOP.z * 7. - uFT * 6.));
        float flow = fn(vOP * 3.2 + vec3(0., -uFT * 1.4, uFT * 2.4));
        float h = clamp(.52 + vTip * .46 + (streak - .5) * .38 + (flow - .5) * .3 + fr * .22, 0., 1.);   /* roots glow too (no dark leading edge) */
        totalEmissiveRadiance = framp(h, uC0, uC1, uC2, uC3) * (.2 + .95 * h * h);
        if (uPrism > .5) totalEmissiveRadiance = mix(totalEmissiveRadiance, rbw(fn(vOP * 4.) * 2. + uFT * .05) * (.1 + .7 * h * h), .35);`   /* body: the normal fire with only a soft rainbow sheen */
        : `float r1 = 1. - abs(fn(vOP * 6.5 + vec3(0., 0., uFT * .15)) * 2. - 1.), r2 = 1. - abs(fn(vOP * 15. + 3.1) * 2. - 1.);
        float vein = pow(r1, 14.) + pow(r2, 22.) * .6, br = .75 + .25 * sin(uFT * 2.2 + vOP.z * 5.);
        totalEmissiveRadiance = framp(clamp(.45 + vein * .5, 0., 1.), uC0, uC1, uC2, uC3) * vein * 2. * br + framp(.15, uC0, uC1, uC2, uC3) * (fr * .5 + .12);`}
      }`);
  };
  m.customProgramCacheKey = () => (feather ? 'fireFeather' : 'fireLava') + (S.P.d.prism ? 'P' : '') + (S._ice ? 'I' : '') + (BK ? 'K' : '');
  return m;
}
/* flame tongues: a camera-facing ribbon per feather tip, stretched up-and-back (the way flames trail off a flying bird),
   drawn with scrolling turbulence: a hot white-gold core, orange body, licking red edges that break into wisps */
function flamePoints(S, parent, pts, size) {
  if (!pts.length) return; const R = fireRamp(S), pos = [], cor = [], sd = [], idx = [];
  pts.forEach((p, i) => { const s = Math.random() * 100, sc = .75 + Math.random() * .5; [[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach(c => { pos.push(p.x, p.y, p.z); cor.push(c[0], c[1]); sd.push(s, sc); }); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cor, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 2)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uFT: FIRE_T, uSz: { value: size }, uDir: { value: V(0, .62, .78) }, uC0: { value: R[0] }, uC1: { value: R[1] }, uC2: { value: R[2] }, uC3: { value: R[3] } },
    vertexShader: `attribute vec2 aC, aS; varying vec2 vC; varying float vS; uniform float uFT, uSz; uniform vec3 uDir;
      void main(){ vC = aC; vS = aS.x; vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 d = normalize((viewMatrix * vec4(uDir, 0.)).xyz), sd = normalize(cross(d, vec3(0., 0., 1.)));
        float L = uSz * aS.y * (1.6 + .35 * sin(uFT * 7. + aS.x) + .2 * sin(uFT * 17. + aS.x * 2.)), W = uSz * aS.y * .42;
        mv.xyz += sd * aC.x * W + d * (aC.y * L - .08 * L); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vC; varying float vS; uniform float uFT; uniform vec3 uC0, uC1, uC2, uC3;` + FIRE_GLSL + `
      void main(){ float y = vC.y, x = vC.x;
        float n = fn(vec3(x * 2.2, y * 3.5 - uFT * 5.5, vS)) * .6 + fn(vec3(x * 5., y * 7. - uFT * 9., vS + 7.)) * .4;
        float w = mix(.95, .05, pow(y, .8)) * (1. - .15 * y);
        float shape = 1. - abs(x + (n - .5) * .6 * y) / max(w, .001);
        float f = clamp(shape * 1.3 + (n - .5) * .9 - y * .55, 0., 1.) * smoothstep(0., .12, y + .04);
        if (f < .02) discard;
        float h = clamp(f * 1.15 - y * .2, 0., 1.);
        gl_FragColor = vec4(framp(h, uC0, uC1, uC2, uC3) * (.6 + h), f * (1. - y * .35)); }` });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 7; parent.add(me);
}
/* embers: little sparks peel off the body and wings, rise, drift back and fade */
function fireEmbers(S, srcs, n = 260) {
  const R = fireRamp(S), pos = new Float32Array(n * 3), age = new Float32Array(n).fill(9), life = new Float32Array(n).fill(1), vel = [...Array(n)].map(() => V()), aA = new Float32Array(n);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(aA, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: innerHeight * .5 }, uC1: { value: R[1] }, uC3: { value: R[3] }, uRb: { value: S.P.d.pv === 3 ? 1 : 0 } },
    vertexShader: 'attribute float aA; varying float vA, vH; uniform float uPx, uRb; void main(){ vA = aA; vH = fract(sin(float(gl_VertexID) * 12.9898) * 43758.5); vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = (uRb > .5 ? .09 : .06) * (1. - aA * .6) * uPx / -mv.z; }',
    fragmentShader: 'varying float vA, vH; uniform vec3 uC1, uC3; uniform float uRb; void main(){ if (vA >= 1.) discard; float r = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., 0., r) * (1. - vA); vec3 c = mix(uC3, uC1, vA); if (uRb > .5) c = mix(clamp(abs(fract(vH + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.) * 1.6, vec3(1.6), (1. - r) * .35); gl_FragColor = vec4(c, a); }' });   /* ③ rainbow embers */
  const pt = new THREE.Points(g, m); pt.frustumCulled = false; pt.renderOrder = 8; S.root.add(pt);
  const w = V(); let k = 0, acc = 0;
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05); const mv = sh.mode === sh.cfg.moving; acc += dt * (mv ? 140 : 70);
    while (acc >= 1) { acc -= 1; const sc = srcs[Math.floor(Math.random() * srcs.length)]; sc.o.localToWorld(w.copy(sc.p)); sh.root.worldToLocal(w);
      pos.set([w.x, w.y, w.z], k * 3); vel[k].set((Math.random() - .5) * .6, .5 + Math.random() * .9, (mv ? 7 : 1.5) * (.6 + Math.random() * .6)); age[k] = 0; life[k] = .6 + Math.random() * 1.2; k = (k + 1) % n; }
    for (let i = 0; i < n; i++) { if (age[i] > life[i]) { aA[i] = 1; continue; } age[i] += dt; vel[i].x += (Math.random() - .5) * dt * 3; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; aA[i] = Math.min(1, age[i] / life[i]); }
    g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; });
}
/* ASH TRAIL (FIRE LAB embers + burning ash): hot spark streaks and charred ash flakes torn off the burning body.
   flakes glow orange at first, cool to dark grey and crumble away; everything streams far back while moving
   (lazily drifts up when hovering). CPU-simulated in the ship's root space, drawn as instanced quads */
function fireAsh(S, srcs0, nE = 1400, nA = 0) {
  const srcs = S._emberSrc && S._emberSrc.length ? S._emberSrc : srcs0;
  const R = fireRamp(S), w = V(), mk = (n, kind) => {
    const g = new THREE.BufferGeometry(), cor = new Float32Array(n * 12), ix = [];
    for (let i = 0; i < n; i++) { cor.set([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], i * 12); const b = i * 4; ix.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    g.setAttribute('position', new THREE.BufferAttribute(cor, 3)); g.setIndex(ix);
    const iP = new THREE.BufferAttribute(new Float32Array(n * 12), 3), iV = new THREE.BufferAttribute(new Float32Array(n * 12), 3), iA = new THREE.BufferAttribute(new Float32Array(n * 8), 2);
    [iP, iV, iA].forEach(a => a.setUsage(THREE.DynamicDrawUsage)); g.setAttribute('iP', iP); g.setAttribute('iV', iV); g.setAttribute('iA', iA);
    for (let i = 0; i < n; i++) { const sd = Math.random(); for (let c = 0; c < 4; c++) { iA.array[(i * 4 + c) * 2] = 1; iA.array[(i * 4 + c) * 2 + 1] = sd; } }
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: kind ? THREE.NormalBlending : THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uSz: { value: kind ? .05 : .055 }, uC0: { value: R[0] }, uC1: { value: R[1] }, uC2: { value: R[2] }, uC3: { value: R[3] }, uFT: FIRE_T },
      vertexShader: `attribute vec3 iP, iV; attribute vec2 iA; uniform float uSz; varying vec2 vC; varying float vA, vS;
        void main(){ vC = position.xy; vA = iA.x; vS = iA.y; vec4 a = modelViewMatrix * vec4(iP, 1.);
          ${kind ? `float r = vS * 30. + vA * (vS - .5) * 16.; vec2 c = mat2(cos(r), -sin(r), sin(r), cos(r)) * (position.xy * vec2(1., .5 + .45 * fract(vS * 13.)));
          a.xy += c * uSz * (.5 + 1. * fract(vS * 5.)) * (1. - vA * .35);`
          : `vec4 b = modelViewMatrix * vec4(iP - iV * .05, 1.); vec2 dir = a.xy - b.xy; float L = length(dir); dir = L > 1e-5 ? dir / L : vec2(0., 1.);
          float wd = uSz * (1. - vA * .5) * (.6 + .8 * fract(vS * 7.)); a.xy += vec2(-dir.y, dir.x) * position.x * wd + dir * position.y * (wd + L * 1.4);`}
          gl_Position = projectionMatrix * a; }`,
      fragmentShader: `varying vec2 vC; varying float vA, vS; uniform float uFT; uniform vec3 uC0, uC1, uC2, uC3;` + FIRE_GLSL + `
        void main(){ if (vA >= 1.) discard;
          ${kind ? `float n = fn(vec3(vC * 2.6 + vS * 17., vS * 9.)), d = length(vC) + (n - .5) * .7;
          float sh = smoothstep(1., .75, d); if (sh < .01) discard;
          float heat = clamp(1. - vA * 2.4, 0., 1.), rim = smoothstep(.45, .95, d);
          vec3 c = mix(vec3(.05, .045, .042), framp(.35 + .5 * heat, uC0, uC1, uC2, uC3) * (.6 + .8 * rim), heat * (.35 + .65 * rim));
          c += framp(.4, uC0, uC1, uC2, uC3) * .25 * smoothstep(.55, .25, vA) * step(.82, fn(vec3(vC * 7. + vS * 31., uFT * 3.)));
          float crumble = smoothstep(vA * 1.15 - .1, vA * 1.15 + .05, n);
          gl_FragColor = vec4(c, sh * crumble * smoothstep(0., .04, vA) * (1. - smoothstep(.7, 1., vA)) * .95);`
          : `float d = length(vC); float sh = smoothstep(1., 0., d); if (sh < .01) discard;
          float tw = .6 + .4 * sin(uFT * 23. + vS * 60.);
          vec3 c = mix(uC3, uC1, .15 + vA * .7) * 2.2 * tw + vec3(.4) * pow(sh, 4.) * (1. - vA);   /* hot white-gold centre */
          gl_FragColor = vec4(c, sh * smoothstep(0., .05, vA) * (1. - vA * vA));`} }` });
    const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = kind ? 7 : 9; S.root.add(me);
    return { n, iP, iV, iA, P: new Float32Array(n * 3), Vv: new Float32Array(n * 3), age: new Float32Array(n).fill(9), life: new Float32Array(n).fill(1), k: 0, acc: 0, kind };
  };
  const E = mk(nE, 0), A = nA > 0 ? mk(nA, 1) : null;
  const spawnPos = out => { const sc = srcs[Math.floor(Math.random() * srcs.length)];
    if (sc.src && sc.src[0].userData.liveFire) { const [mm, a, b, c] = sc.src, q = mm.geometry.attributes.position.array; for (let k = 0; k < 3; k++) w.setComponent(k, q[a * 3 + k] + (q[b * 3 + k] - q[a * 3 + k]) * sc.u + (q[c * 3 + k] - q[a * 3 + k]) * sc.v); }
    else if (sc.i != null && sc.o.userData.liveFire) { const q = sc.o.geometry.attributes.position.array; w.set(q[sc.i * 3], q[sc.i * 3 + 1], q[sc.i * 3 + 2]); } else w.copy(sc.p);
    sc.o.localToWorld(w); S.root.worldToLocal(w); out.copy(w); };
  const P = V();
  S.extras.push((sh, dt, t) => { dt = Math.min(dt, .05); const mv = sh.mode === sh.cfg.moving;
    for (const Q of [E, A]) { if (!Q) continue;
      Q.acc += dt * (Q.kind ? (mv ? 230 : 55) : (mv ? 480 : 130)) * (1 + (S._flare || 0) * 2.5);
      while (Q.acc >= 1) { Q.acc -= 1; const i = Q.k; Q.k = (Q.k + 1) % Q.n; spawnPos(P); Q.P.set([P.x, P.y, P.z], i * 3);
        Q.Vv.set([(Math.random() - .5) * 2.2, .2 + Math.random() * 1.1, (mv ? 3 : .6) * (.5 + Math.random())], i * 3);   /* sparks burst outward in every direction before the wind takes them */
        Q.age[i] = 0; Q.life[i] = Q.kind ? 1.8 + Math.random() * 2.2 : 1.4 + Math.random() * 2.2; }
      const p = Q.P, v = Q.Vv, a = Q.iA.array, gp = Q.iP.array, gv = Q.iV.array, wz = mv ? 9 : .5, up = Q.kind ? .35 : .9, k = 1 - Math.exp(-dt * (Q.kind ? 1.6 : 1.1));
      for (let i = 0; i < Q.n; i++) { if (Q.age[i] > Q.life[i]) { for (let c = 0; c < 4; c++) a[(i * 4 + c) * 2] = 1; continue; } Q.age[i] += dt; const o = i * 3;
        const fl = Math.sin(t * 2.3 + i * 1.7) * (Q.kind ? 1.1 : .9);
        v[o] += (fl - v[o]) * k + (Math.random() - .5) * dt * 4; v[o + 1] += (up - v[o + 1]) * k + (Math.random() - .5) * dt * 2; v[o + 2] += (wz * (Q.kind ? .9 : 1) - v[o + 2]) * k;
        p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt; const ag = Math.min(1, Q.age[i] / Q.life[i]);
        for (let c = 0; c < 4; c++) { const q = (i * 4 + c) * 3; gp[q] = p[o]; gp[q + 1] = p[o + 1]; gp[q + 2] = p[o + 2]; gv[q] = v[o]; gv[q + 1] = v[o + 1]; gv[q + 2] = v[o + 2]; a[(i * 4 + c) * 2] = ag; } }
      Q.iP.needsUpdate = Q.iV.needsUpdate = Q.iA.needsUpdate = true; } });
}
/* REAL FLAMES: a stateless GPU particle fire that engulfs the bird. thousands of soft flame puffs are born on the actual
   feather / body surface (emitter points sampled from the meshes, so they ride along with the flapping wings and the tail),
   rise up-and-back, swell and curl with turbulence, burn from white-gold through orange to dark red and die into a faint smoke.
   everything is computed in the vertex shader from (emitter, seed, time) — no per-frame CPU work */
/* shared wind history for a ship: wind speed + integrated wind distance, sampled every 0.1 s (last 4 s) */
function windHist(S) { if (S._wh) return S._wh; const NH = 40, ST = .1, D = new Float32Array(NH), X = new Float32Array(NH), W = { u: { uD: { value: D }, uX: { value: X }, uDn: { value: .4 }, uXn: { value: 0 }, uPh: { value: 0 } }, NH, ST };
  let w = .4, x = 0, acc = 0;
  S.extras.push((sh, dt) => { dt = Math.min(dt, .05); w += ((sh.mode === sh.cfg.moving ? 7 : .4) - w) * (1 - Math.exp(-dt * 3)); x += w * dt; acc += dt;
    while (acc >= ST) { acc -= ST; D.copyWithin(1, 0, NH - 1); D[0] = w; X.copyWithin(1, 0, NH - 1); X[0] = x; } W.u.uDn.value = w; W.u.uXn.value = x; W.u.uPh.value = acc; });
  return S._wh = W; }
/* SPARKS (반짝이는 불씨, FIRE LAB style streaks): hovering they spark out a little around the body and slowly die there
   (top-down view, so they don't fly up); moving they stream back with the wind. each spark keeps the wind of its own
   moment (no snapping back when the ship stops). shares the flame emitters, so they come off the whole surface */
function fireSparks(S, parent, cand, FU, k) {
  const WH = windHist(S), NH = WH.NH, ST = WH.ST, n = Math.max(40, Math.round(cand.length * k)), pos = [], cor = [], sd = [], idx = [], live = [];
  for (let i = 0; i < n; i++) { const p = cand[Math.floor(Math.random() * cand.length)], s4 = [Math.random(), Math.random(), Math.random(), Math.random()];
    const q = p; live.push([i, p.src, p.u, p.v]);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { pos.push(q.x, q.y, q.z); cor.push(c[0], c[1]); sd.push(...s4); }); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cor, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 4)); g.setIndex(idx);
  const SU = { uFT: FIRE_T, uFl: { value: 0 }, uDir: { value: V(0, 0, 1) }, uPrism: { value: S.P.d.prism ? 1 : 0 }, uC2: FU.uC2, uC3: FU.uC3, ...WH.u };
  const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, uniforms: SU,   /* DoubleSide: the streak quad flips winding with its direction */
    vertexShader: `attribute vec2 aC; attribute vec4 aS; uniform float uFT, uFl, uDn, uXn, uPh; uniform float uD[${NH}], uX[${NH}]; uniform vec3 uDir;
      varying vec2 vC; varying float vA, vR, vM;
      vec3 P(float T, vec3 b0, vec4 s, float tw, float m){
        vec3 bd = normalize(vec3(fract(s.z * 91.7) - .5, (fract(s.w * 47.3) - .5) * .5, fract(s.x * 63.1) - .5));   /* spark out sideways, not up (top-down view) */
        vec3 drift = vec3(sin(T * (1.3 + s.y) + s.w * 20.), 0., cos(T * (1.1 + s.z) + s.z * 17.)) * .12 * T;
        bd.z = mix(bd.z, abs(bd.z), m); bd *= 1. - .6 * m;   /* moving: no forward burst, sparks only peel off backwards */
        return b0 + bd * (1. - exp(-T * 1.6)) * .32 + drift * (1. - .7 * m); }   /* wind straight back */
      float wind(float T){ float kk = max(0., T - uPh) / ${ST}; int i0 = int(min(${NH - 2}., floor(kk))); float tq = T / max(uPh, 1e-4);
        float Db = T < uPh ? mix(uDn, uD[0], tq) : mix(uD[i0], uD[i0 + 1], fract(kk)), Xb = T < uPh ? mix(uXn, uX[0], tq) : mix(uX[i0], uX[i0 + 1], fract(kk));
        return max(Db * T, uXn - Xb); }
      void main(){
        float life = 1.6 + 1.8 * fract(aS.y * 5.3), age = fract(uFT / life + aS.x * 3.1), T = age * life, T0 = max(0., T - .018);
        vec3 b0 = position;
        float w1 = wind(T), w0 = wind(T0) * (T0 / max(T, 1e-4)), m = clamp(w1 / max(T * 4., 1e-3), 0., 1.);
        vec3 wv = (viewMatrix * vec4(uDir, 0.)).xyz;   /* wind blows along the ship's back axis in world space, whatever the part's own rotation */
        vec4 a = modelViewMatrix * vec4(P(T, b0, aS, w1, m), 1.), b = modelViewMatrix * vec4(P(T0, b0, aS, min(w0, w1), m), 1.); a.xyz += wv * w1; b.xyz += wv * min(w0, w1);
        vec2 dir = a.xy - b.xy; float L = length(dir); dir = L > 1e-5 ? dir / L : vec2(0., 1.);
        float wd = .022 * (1. - age * .5) * (.6 + .8 * fract(aS.z * 7.));
        a.xy += vec2(-dir.y, dir.x) * aC.x * wd + dir * aC.y * (wd + L * .9);
        gl_Position = projectionMatrix * a; vC = aC; vA = age; vR = aS.w; vM = m; }`,
    fragmentShader: `varying vec2 vC; varying float vA, vR, vM; uniform float uFT, uPrism; uniform vec3 uC2, uC3;
      void main(){ float d = length(vC); float sh = 1. - smoothstep(0., 1., d); if (sh < .01) discard;
        float tw = .6 + .4 * sin(uFT * 23. + vR * 60.);
        vec3 c = mix(mix(uC2, uC3, .45), uC2 * .9, vA) * 1.25 * tw;
        if (uPrism > .5) c = (clamp(abs(fract(vR * 7.13 + vA * .3 + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.) * 1.3 + .25) * tw;   /* prism: every spark its own rainbow colour */
        gl_FragColor = vec4(c, sh * smoothstep(0., mix(.05, .16, vM), vA) * (1. - smoothstep(.35, 1., vA))); }   /* moving: they light up only once they've left the surface */` });   /* slow fade */
  const sp = new THREE.Mesh(g, sm); sp.frustumCulled = false; sp.renderOrder = 9; parent.add(sp);
  const dW = V(), qW = new THREE.Quaternion();
  S.extras.push(() => { SU.uFl.value = S._flare || 0; S.root.getWorldQuaternion(qW); SU.uDir.value.copy(dW.set(0, 0, 1).applyQuaternion(qW)); });
  /* live surfaces (serpent body re-shaped every frame): keep each spark's emitter on its triangle */
  const lv = live.filter(([, sr]) => sr && sr[0].userData.liveFire);
  if (lv.length) { const pa = g.attributes.position; pa.setUsage(THREE.DynamicDrawUsage);
    S.extras.push(() => { const arr = pa.array; for (const [i, [mm, a, b2, c], u, v] of lv) { const q = mm.geometry.attributes.position.array;
        for (let k = 0; k < 3; k++) { const val = q[a * 3 + k] + (q[b2 * 3 + k] - q[a * 3 + k]) * u + (q[c * 3 + k] - q[a * 3 + k]) * v; arr[i * 12 + k] = arr[i * 12 + 3 + k] = arr[i * 12 + 6 + k] = arr[i * 12 + 9 + k] = val; } }
      pa.needsUpdate = true; }); }
}
function fireBurn(S, parent, meshes, density, size) {
  /* emitters spread UNIFORMLY over the whole surface: triangles picked in proportion to their area, random point inside each */
  const R = fireRamp(S), tris = [], cum = []; let tot = 0; const A = V(), Bv = V(), Cv = V(), e1 = V(), e2 = V();
  for (const me of meshes) { me.updateMatrix(); const pa = me.geometry.attributes.position, ix = me.geometry.index, n = ix ? ix.count : pa.count, tb = me.material.userData.wdBend ? me.geometry.attributes.aTail : null;
    for (let t = 0; t < n; t += 3) { const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, c = ix ? ix.getX(t + 2) : t + 2;
      A.fromBufferAttribute(pa, a).applyMatrix4(me.matrix); Bv.fromBufferAttribute(pa, b).applyMatrix4(me.matrix); Cv.fromBufferAttribute(pa, c).applyMatrix4(me.matrix);
      const ar = e1.subVectors(Bv, A).cross(e2.subVectors(Cv, A)).length() * .5; if (ar < 1e-7) continue; tot += ar; const tr = [A.clone(), Bv.clone(), Cv.clone()]; tr.b = tb ? [tb.getX(a), tb.getX(b), tb.getX(c)] : [0, 0, 0]; tr.src = [me, a, b, c]; tris.push(tr); cum.push(tot); } }
  if (!tris.length) return;
  const count = Math.round(Math.min(3200, Math.max(250, tot * density))), cand = [];
  for (let i = 0; i < count; i++) { const r = Math.random() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const tr = tris[lo], [a, b, c] = tr; let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const p = a.clone().addScaledVector(e1.subVectors(b, a), u).addScaledVector(e2.subVectors(c, a), v); p.b = tr.b[0] + (tr.b[1] - tr.b[0]) * u + (tr.b[2] - tr.b[0]) * v; p.src = tr.src; p.u = u; p.v = v; cand.push(p); }
  const pos = [], cor = [], sd = [], idx = [], bw = [];
  for (let i = 0; i < count; i++) { const p = cand[i], s = Math.random(), l = .55 + Math.random() * .6, z = .7 + Math.random() * .6;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { pos.push(p.x, p.y, p.z); cor.push(c[0], c[1]); sd.push(s, l, z, Math.random()); bw.push(p.b || 0); }); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cor, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 4)); g.setAttribute('aB', new THREE.Float32BufferAttribute(bw, 1)); g.setIndex(idx);
  const lay = S._fireLayer || { len: 1, op: 1 };
  const U = { uFT: FIRE_T, uSz: { value: size }, uLen: { value: .45 * lay.len }, uOp: { value: lay.op }, uPrism: { value: S.P.d.prism ? (S.P.d.pv || 1) : 0 }, uDir: { value: V(0, .3, .95).normalize() },   /* flames lean mostly backward, only slightly up */ uC0: { value: R[0] }, uC1: { value: R[1] }, uC2: { value: R[2] }, uC3: { value: R[3] } };
  /* each particle is a TONGUE of flame, not a round puff: the quad is stretched along the rising direction (projected on screen),
     its shape is a tapering teardrop eaten away by domain-warped noise that scrolls upward, with a hot core and wispy ragged edges */
  { let mR = 0; for (const c of cand) mR = Math.max(mR, c.length()); const tf = lay.tipFrom;
    U.uTip = { value: V(0, tf == null ? -1 : tf * mR, tf == null ? -.5 : mR) }; U._tipK = lay.tipK || 0; }   /* wing tips / tail: longer flames */
  U.uN = { value: fireNoise3D() }; U.uWT = WD_T;
  /* FIRE LAB flames: soft rotating puffs eroded by noise, carried back along the body with turbulence, cooling white-gold -> orange -> red;
     neighbouring emitters share a flickering cut-off so the fire breaks into tongues. noise comes from a baked 3D texture (cheap) */
  const BLK = S.P.d.name === '흑염' && !S._ice; U.uBlk = { value: BLK ? 1 : 0 };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: BLK ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: U,   /* 흑염: real black flames (painted over, not added as light) */
    vertexShader: `
attribute vec2 aC; attribute vec4 aS; attribute float aB;
uniform float uFT, uSz, uLen, uWT; uniform vec3 uDir, uTip; uniform highp sampler3D uN;
varying vec2 vC; varying float vA, vR, vHeat, vCut, vRot; varying vec3 vE;
float tn(vec3 p){ return texture(uN, p * .03125).r; }
float fbmT(vec3 p){ return tn(p) * .55 + tn(p * 2.03 + 7.1) * .3 + tn(p * 4.1 + 3.3) * .15; }
void main(){
  float life = mix(.55, 1.05, fract(aS.y * 7.3));
  float age = fract(uFT / life + aS.x); vA = age; vR = aS.w; vC = aC; vE = position;
  vec3 bp = position; bp.x += sin(uWT * 1.6 - aB * 4.2) * .34 * aB * aB; bp.y += sin(uWT * 1.15 - aB * 3.) * .09 * aB * aB;   /* ride the tail's sway */
  vec4 mv = modelViewMatrix * vec4(bp, 1.);
  vec3 d = normalize((viewMatrix * vec4(uDir, 0.)).xyz);
  float tk = 1. + uTip.x * smoothstep(uTip.y, uTip.z, length(position));
  float run = uLen * tk * (.6 + .6 * aS.z) * (age * .45 + age * age * .75);
  vec3 q = position * 2.2 + vec3(0., 0., -uFT * 1.6);
  vec3 tb = (vec3(fbmT(q), fbmT(q + 11.3), fbmT(q + 23.1)) - .5) * (.18 * uLen + .04) * age * 2.;
  vec3 r = position * 7. + aS.x * 5. + vec3(0., 0., -uFT * 3.5);
  tb += (vec3(fbmT(r), fbmT(r + 5.2), fbmT(r + 19.7)) - .5) * .06 * (.3 + age);
  mv.xyz += d * run + (viewMatrix * vec4(tb, 0.)).xyz;
  /* tongues: neighbouring emitters share a flickering cut-off height, so the fire breaks into licking tongues */
  vCut = .22 + .85 * smoothstep(.3, .7, fbmT(position * 3.4 + vec3(0., uFT * 2.2, 0.)));
  vHeat = clamp((1. - age * 1.5) * (.85 + .25 * aS.w), 0., 1.);
  vec2 ax = normalize(d.xy + vec2(1e-4, 0.)), pp = vec2(-ax.y, ax.x);
  float s = uSz * 1.6 * (.6 + .6 * aS.z) * (.45 + .65 * sin(3.14159 * min(1., age * 1.25)));
  mv.xy += pp * aC.x * s * .75 + ax * (aC.y + .35) * s * 2.1;
  vRot = aS.x * 40. + uFT * (aS.y - .5) * 3.;
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `
varying vec2 vC; varying float vA, vR, vHeat, vCut, vRot; varying vec3 vE;
uniform float uFT, uOp, uPrism, uBlk; uniform vec3 uC0, uC1, uC2, uC3; uniform highp sampler3D uN;
float tn(vec3 p){ return texture(uN, p * .03125).r; }
float fbmT(vec3 p){ return tn(p) * .55 + tn(p * 2.03 + 7.1) * .3 + tn(p * 4.1 + 3.3) * .15; }
vec3 framp(float h){ return h < .4 ? mix(uC0, uC1, h / .4) : h < .75 ? mix(uC1, uC2, (h - .4) / .35) : mix(uC2, uC3, (h - .75) / .25); }
vec3 rbw(float x){ return clamp(abs(fract(x + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.); }
void main(){
  float dd = length(vC); if (dd > 1.) discard;
  vec2 rc = mat2(cos(vRot), -sin(vRot), sin(vRot), cos(vRot)) * vC;
  float n = fbmT(vec3(rc * 1.8 + vR * 9., uFT * 1.3 + vR * 5.));
  float shape = smoothstep(.8, .4, dd + (n - .5) * 1.3);
  float cut = smoothstep(vCut, vCut - .25, vA);
  float a = shape * cut * smoothstep(0., .15, vA) * (1. - smoothstep(.5, 1., vA)) * .16 * uOp;
  if (a < .002) discard;
  float h = clamp(vHeat * (.6 + .8 * n) * (1. - .35 * dd), 0., 1.);
  vec3 c = framp(h) * (.09 + .78 * h * h);
  if (uPrism > .5) { float hue = fbmT(vE * .9 + vec3(0., 0., uFT * .12)) * 2.2 + fbmT(vE * 2.3) * .35; c = mix(rbw(hue + vA * .1), vec3(1.), h * h * .3) * (.06 + .75 * h * h); }
  gl_FragColor = uBlk > .5 ? vec4(mix(vec3(.012, .01, .016), c * 2.6, smoothstep(.45, 1., h) * .6), min(1., a * 1.3)) : vec4(c, a);
}` });
  { const L = S._emberSrc || (S._emberSrc = []); for (let i = 0; i < cand.length; i += 6) { const c = cand[i]; L.push({ o: parent, p: c.clone(), src: c.src, u: c.u, v: c.v }); } }   /* ember sources spread evenly over the whole surface */
  /* live surfaces (the serpent body is re-shaped on the CPU every frame): re-seat every emitter on its triangle each frame */
  if (meshes.some(x => x.userData.liveFire)) { const pa = g.attributes.position; pa.setUsage(THREE.DynamicDrawUsage); const live = cand.map((p, i) => [i, p.src, p.u, p.v]).filter(([, sr]) => sr[0].userData.liveFire);
    S.extras.push(() => { const arr = pa.array; for (const [i, [mm, a, b, c], u, v] of live) { const q = mm.geometry.attributes.position.array, ia = a * 3, ib = b * 3, ic = c * 3;
        for (let k = 0; k < 3; k++) { const val = q[ia + k] + (q[ib + k] - q[ia + k]) * u + (q[ic + k] - q[ia + k]) * v; arr[i * 12 + k] = arr[i * 12 + 3 + k] = arr[i * 12 + 6 + k] = arr[i * 12 + 9 + k] = val; } }
      pa.needsUpdate = true; }); }
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 6; me.layers.enable(1); parent.add(me);
  if (lay.sparks) fireSparks(S, parent, cand, U, lay.sparks);
  S.extras.push(sh => { const fx = S._flare || 0; U.uLen.value += ((sh.mode === sh.cfg.moving ? 2.4 : .45) * lay.len * (1 + fx * .9) - U.uLen.value) * (fx > .05 ? .2 : .05); U.uOp.value = lay.op * (1 + fx * .6); U.uTip.value.x += ((sh.mode === sh.cfg.moving ? 1 : .2) * U._tipK - U.uTip.value.x) * .05; });   /* longer flames */
}
/* smoke: dark, soft, slow puffs carried off above the flames (normal blending, so it adds contrast instead of light) */
function fireSmoke(S, parent, meshes, density) {
  const tris = [], cum = []; let tot = 0; const A = V(), Bv = V(), Cv = V(), e1 = V(), e2 = V();
  for (const me of meshes) { me.updateMatrix(); const pa = me.geometry.attributes.position, ix = me.geometry.index, n = ix ? ix.count : pa.count;
    for (let t = 0; t < n; t += 3) { const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, c = ix ? ix.getX(t + 2) : t + 2;
      A.fromBufferAttribute(pa, a).applyMatrix4(me.matrix); Bv.fromBufferAttribute(pa, b).applyMatrix4(me.matrix); Cv.fromBufferAttribute(pa, c).applyMatrix4(me.matrix);
      const ar = e1.subVectors(Bv, A).cross(e2.subVectors(Cv, A)).length() * .5; if (ar < 1e-7) continue; tot += ar; tris.push([A.clone(), Bv.clone(), Cv.clone()]); cum.push(tot); } }
  if (!tris.length) return; const count = Math.round(Math.min(700, Math.max(60, tot * density))), pos = [], cor = [], sd = [], idx = [];
  for (let i = 0; i < count; i++) { const r = Math.random() * tot; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const [a, b, c] = tris[lo]; let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const p = a.clone().addScaledVector(e1.subVectors(b, a), u).addScaledVector(e2.subVectors(c, a), v), s = Math.random(), l = 1.4 + Math.random();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(cc => { pos.push(p.x, p.y, p.z); cor.push(cc[0], cc[1]); sd.push(s, l, .7 + Math.random() * .6, Math.random()); }); const bb = i * 4; idx.push(bb, bb + 1, bb + 2, bb, bb + 2, bb + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cor, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 4)); g.setIndex(idx);
  const U = { uFT: FIRE_T, uLen: { value: 1.2 }, uDir: { value: V(0, .45, .9).normalize() }, uSC0: { value: S._ice ? V(.32, .42, .52) : V(.05, .045, .045) }, uSC1: { value: S._ice ? V(.1, .15, .2) : V(.06, .03, .01) } };
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `attribute vec2 aC; attribute vec4 aS; varying vec2 vC; varying float vA, vR; uniform float uFT, uLen; uniform vec3 uDir;` + FIRE_GLSL + `
      void main(){ float age = fract(uFT / aS.y + aS.x); vA = age; vR = aS.w; vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 d = (viewMatrix * vec4(uDir, 0.)).xyz;
        mv.xyz += d * ((.35 + age) * uLen * aS.z) + vec3(fn(vec3(aS.x * 30., uFT * .6, 0.)) - .5, fn(vec3(aS.w * 30., uFT * .5, 2.)) - .5, 0.) * .3 * age;
        float s = .12 * aS.z * (.6 + 1.6 * age); mv.xy += aC * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vC; varying float vA, vR; uniform float uFT; uniform vec3 uSC0, uSC1;` + FIRE_GLSL + `
      void main(){ float r = length(vC), n = fn(vec3(vC * 2.2 + vR * 7., uFT * .7 + vR * 4.));
        float a = smoothstep(1., .2, r + (n - .5) * .7) * smoothstep(0., .2, vA) * (1. - vA) * .16; if (a < .004) discard;
        gl_FragColor = vec4(uSC0 + uSC1 * (1. - vA), a); }` });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 5; parent.add(me);
  S.extras.push(sh => { U.uLen.value += ((sh.mode === sh.cfg.moving ? 2.4 : 1.2) - U.uLen.value) * .05; });
}
/* ===== FROST EAGLE · 얼음 독수리 — Thunderbird Λ in ice: frost-crystal feathers glowing cold from inside, an aura of icy
   vapour rising off the whole body (ICE LAB cold flames), frost mist trailing, diamond dust + tumbling snow crystals around ===== */
function frostEagle(S) { S._fire = true; S._ice = true; S._fireEye = new THREE.Color(.55, .95, 1.1); S._fTips = []; ceEagle(S); }
function iceGlitter(S, nD = 700, nF = 70) { if (NOFX) return;
  /* wind history: each particle is carried back by the wind that blew SINCE it was born (integrated distance),
     so when the ship stops, what already streamed back stays back and fades, and new ones form on the body */
  const NH = 80, ST = .1, DH = new Float32Array(NH), XH = new Float32Array(NH), UD = { value: DH }, UX = { value: XH }, UDn = { value: 0 }, UXn = { value: 0 }, UPh = { value: 0 }, Uw = { value: .15 }; let Dn = 0, Xn = 0, acc = 0;
  S.extras.push((sh, dt) => { Uw.value += ((sh.mode === sh.cfg.moving ? 4 : .15) - Uw.value) * .04; Dn = Uw.value; Xn += Uw.value * Math.min(dt, .05); acc += Math.min(dt, .05);
    while (acc >= ST) { acc -= ST; DH.copyWithin(1, 0, NH - 1); DH[0] = Dn; XH.copyWithin(1, 0, NH - 1); XH[0] = Xn; } UDn.value = Dn; UXn.value = Xn;   /* history of the wind speed: each particle keeps the speed it was born with */ UPh.value = acc; });
  const mk = (n, kind) => { const pos = [], cor = [], sd = [], idx = [];
    for (let i = 0; i < n; i++) { const s4 = [Math.random(), Math.random(), Math.random(), Math.random()]; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => { pos.push(0, 0, 0); cor.push(c[0], c[1]); sd.push(...s4); }); const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(cor, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sd, 4)); g.setIndex(idx);
    const R = fireRamp(S), U = { uFT: FIRE_T, uPr: { value: S.P.d.prism ? 1 : 0 }, uW: Uw, uD: UD, uDn: UDn, uX: UX, uXn: UXn, uPh: UPh, uK2: { value: R[2] }, uK3: { value: R[3] }, uR: { value: S.cfg.radius || 3.4 } };
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: U,
      vertexShader: `attribute vec2 aC; attribute vec4 aS; uniform float uFT, uW, uR, uDn, uXn, uPh; uniform float uD[${NH}], uX[${NH}]; varying float vFd, vH; varying vec2 vC; varying float vTw, vAge, vGl;
        mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
        void main(){ float life = ${kind ? '4.5 + 3.' : '3. + 3.5'} * aS.y, age = fract(uFT / life + aS.x), T = age * life;
          float kk = max(0., T - uPh) / ${ST}; int i0 = int(min(${NH - 2}., floor(kk))); float tq = T / max(uPh, 1e-4);
          float Db = T < uPh ? mix(uDn, uD[0], tq) : mix(uD[i0], uD[i0 + 1], fract(kk)), Xb = T < uPh ? mix(uXn, uX[0], tq) : mix(uX[i0], uX[i0 + 1], fract(kk));   /* wind at birth */
          float th = aS.z * 6.2831853, cp = aS.w * 2. - 1., sp = sqrt(1. - cp * cp), rr = pow(fract(aS.x * 7.3), .33) * mix(1., .55, clamp(Db / 4., 0., 1.));   /* spread decided at birth too: a stopping ship never fans the trail out */
          vec3 p = vec3(cos(th) * sp * .95, cp * .42, sin(th) * sp * .9) * rr * uR;   /* soft ellipsoid round the body; when moving they start on the body and only stream BACK */
          p += vec3(sin(T * .7 + aS.z * 20.) * .25, T * .22, cos(T * .6 + aS.w * 17.) * .2) + vec3(0., 0., 0.);
          { float dz = max(Db * T, uXn - Xb);   /* starts moving at once with the wind; after a stop keeps the speed it had */ p.z += dz; vFd = 1. - (1. - clamp(uW / 3.5, 0., 1.)) * smoothstep(.35 * uR, 1.1 * uR, dz); }   /* phase-correct wind travel; when the ship stops, what is left behind melts away fast */
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          ${kind ? `float tilt = uFT * (.6 + 1.2 * aS.w) + aS.x * 30., ct = cos(tilt); vGl = pow(abs(ct), 30.); vTw = 0.;
          mv.xy += rot(aS.y * 6.283 + uFT * (aS.z - .5)) * aC * vec2(1., max(.12, abs(ct))) * (.05 + .05 * fract(aS.z * 13.));`
          : `float tw = pow(max(0., sin(uFT * (1.3 + 3. * fract(aS.y * 31.)) + aS.x * 60.)), 24.); vTw = tw; vGl = 0.;
          mv.xy += rot(.4 + aS.x * 3.) * aC * (.012 + .07 * tw) * (.6 + .8 * fract(aS.z * 7.));`}
          vH = fract(aS.z * 5.31 + aS.w * 2.7); gl_Position = projectionMatrix * mv; vC = ${kind ? 'rot(-(aS.y * 6.283)) * aC' : 'aC'}; vAge = age; }`,
      fragmentShader: `varying vec2 vC; varying float vTw, vAge, vGl, vFd, vH; uniform vec3 uK2, uK3; uniform float uPr;
        vec3 RB(){ return clamp(abs(fract(vH + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.); }
        float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return 1. - smoothstep(w * .3, w, length(pa - ba * h)); }
        void main(){ float life = smoothstep(0., .1, vAge) * (1. - smoothstep(.75, 1., vAge)) * vFd; if (life < .01) discard;
          ${kind ? `float r = length(vC); if (r > 1.) discard; float an = atan(vC.y, vC.x); an = mod(an + .5236, 1.0472) - .5236; vec2 q = vec2(cos(an), abs(sin(an))) * r;
          float sh = seg(q, vec2(0.), vec2(.92, 0.), .055);
          for (int k = 1; k <= 3; k++) { float x0 = .22 * float(k); sh = max(sh, seg(q, vec2(x0, 0.), vec2(x0, 0.) + vec2(.5, .866) * .34 * (1. - x0 * .7), .04)); }
          sh = max(sh, (1. - smoothstep(.16, .2, r)) * .9); if (sh < .02) discard;
          vec3 k2 = uPr > .5 ? RB() * 1.2 + .15 : uK2, k3 = uPr > .5 ? mix(RB(), vec3(1.), .45) * 1.3 : uK3;   /* prism: rainbow snow crystals */
          gl_FragColor = vec4((mix(k2 * .7, k3, .4) * (.3 + .3 * (1. - r)) + k3 * vGl * 1.6) * sh * life, 1.);`
          : `vec2 p = abs(vC); float star = exp(-p.x * 16.) * exp(-p.y * 2.2) + exp(-p.y * 16.) * exp(-p.x * 2.2) + exp(-dot(p, p) * 30.) * 1.6;
          vec3 k2 = uPr > .5 ? RB() * 1.3 + .1 : uK2, k3 = uPr > .5 ? mix(RB(), vec3(1.), .3) * 1.4 : uK3;   /* prism: rainbow glints */
          gl_FragColor = vec4(mix(k2, k3, .5 + .5 * vTw) * star * (.15 + 1.5 * vTw) * life, 1.);`} }` });
    const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 9; S.root.add(me);
  };
  mk(nD, 0); mk(nF, 1);
}
function frostDrake(S) { S._fire = true; S._ice = true; S._fireEye = new THREE.Color(.55, .95, 1.1); wdBody(S); }
function frostDragonBody(S) { S._fire = true; S._ice = true; S._fireEye = new THREE.Color(.55, .95, 1.1); S.fxOff = true; S.sparkEm = []; S.extras.push(sh => { sh.P.hull.emissiveIntensity = 0; }); }
const FD_V = [
  { name: 'A · 서리 드레이크', desc: '스톰 드레이크의 얼음 버전이에요. 얼음빛 갑옷 비늘 사이로 차가운 빛이 새어 나오고, 뿔·발톱·날개 뼈·꼬리 칼날은 속에서 빛나는 얼음 결정이에요. 온몸에서 냉기가 피어올라 뒤로 흐르고, 다이아몬드 더스트와 눈 결정이 주변에 날려요.',
    build(S) { fireEngulf(S, S.body, 11000, 4000, .95, 1.2); iceGlitter(S, 900, 90); ceFinish(S); } },
];
const FDR_V = [
  { name: 'A · 빙룡', desc: '뇌룡의 얼음 버전이에요. 하늘을 헤엄치는 긴 몸 전체에서 냉기가 피어올라 뒤로 흐르고, 뿔·등 가시·꼬리 칼날·수염은 속에서 빛나는 얼음 결정이에요. 주변에 다이아몬드 더스트와 눈 결정이 반짝이며 날려요.',
    build(S) { ZIG_K = .3; try { dragonCore(S, { pearls: false }); } finally { ZIG_K = 1; } fireEngulf(S, S.body, 8000, 3000, .85, 1.1); iceGlitter(S, 800, 80); } },
];
PAINTS3.frostdrake = [TP('빙하', '#0c2236', '#5ab8ff', '#cdeeff', [.4, 1.2, 2.6], [0xffffff, 0x5ab8ff]), TP('서리', '#3a4656', '#e8f2ff', '#ffffff', [1.8, 2, 2.4], [0xffffff, 0xcfe6ff]), TP('극광', '#062a2a', '#3ff0d0', '#c8fff2', [.3, 2.2, 1.9], [0xffffff, 0x3ff0d0]), { ...TPR(), pv: 1 }];
PAINTS3.frostdragon = [TP('빙하', '#0c2236', '#5ab8ff', '#cdeeff', [.4, 1.2, 2.6], [0xffffff, 0x5ab8ff]), TP('서리', '#3a4656', '#e8f2ff', '#ffffff', [1.8, 2, 2.4], [0xffffff, 0xcfe6ff]), TP('극광', '#062a2a', '#3ff0d0', '#c8fff2', [.3, 2.2, 1.9], [0xffffff, 0x3ff0d0]), { ...TPR(), pv: 1 }];
const FE_V = [
  { name: 'A · 얼음 독수리', desc: '썬더버드 Λ의 얼음 버전이에요. 깃털이 속에서부터 차갑게 빛나는 서리 결정이 되고, 온몸에서 냉기가 혀처럼 피어올라 뒤로 흘러요. 서리 안개가 꼬리처럼 남고, 주변에 다이아몬드 더스트가 반짝이며 눈 결정이 빙글빙글 날려요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } fireify(S); iceGlitter(S); ceFinish(S); } },
];
function fireEagle(S) { S._fire = true; S._sparks = true; S._fireEye = new THREE.Color(1, .1, .04); S._fTips = []; ceEagle(S); }
/* turn the built bird into the burning one: swap every glowing material for fire, light the feather tips, add embers + heat halos */
function fireify(S) {
  const swaps = new Map(), B = S.body;
  /* face and beak burn with the same feather fire (not lava veins): give them a constant mid 'along-the-feather' value */
  B.traverse(o => { if (o.isMesh && (o === S._ceHead || (o.material && o.material.userData && o.material.userData.beak)) && !o.geometry.attributes.aTip) o.geometry.setAttribute('aTip', new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count).fill(.6), 1)); });
  B.traverse(o => { if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial || !o.material.emissive) return;
    const src = o.material, fea = !!o.geometry.attributes.aTip, key = src.uuid + fea; if (!swaps.has(key)) swaps.set(key, fireMat(S, src, fea)); o.material = swaps.get(key); });
  S.extras.push((sh, dt, t) => { FIRE_T.value = t; });
  /* the bird is ENGULFED: particle flames rising off the body, each wing and the tail (emitters ride with each part) */
  { const groups = new Map(); B.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position && o.material && o.material.isMeshStandardMaterial) { const pr = o.parent; (groups.get(pr) || groups.set(pr, []).get(pr)).push(o); } });
    for (const [pr, ms] of groups) { const n = ms.reduce((s, me) => s + me.geometry.attributes.position.count, 0); if (n < 60) continue;
      const isWing = (S._fWing || []).some(w => w.fl === pr), isTail = S._fTail && S._fTail.tg === pr;
      const tip = isWing ? { tipK: 1.6, tipFrom: .4 } : isTail ? { tipK: 1.2, tipFrom: null } : {};
      S._fireLayer = { len: .55, op: 1.2, sparks: S._sparks ? .16 : 0, ...tip }; fireBurn(S, pr, ms, 380, isWing ? .055 : .05);      /* inner layer: dense short tongues licking the surface */
      S._fireLayer = { len: .95, op: .75, ...tip }; fireBurn(S, pr, ms, 170, isWing ? .085 : .075); S._fireLayer = null;
      fireSmoke(S, pr, ms, 45); } }
  /* firelight: flickering orange lights inside the body and out on each wing, washing the bird in its own fire */
  { const R0 = fireRamp(S), fl = [], mk = (par, x, y, z, i) => { const L = new THREE.PointLight(R0[1].clone().multiplyScalar(.6), i, 3.2, 1.6); L.position.set(x, y, z); par.add(L); fl.push({ L, i, ph: Math.random() * 9 }); };
    mk(B, 0, .25, -.3, .9); mk(B, 0, .2, .5, .7); (S._fWing || []).forEach(w => { const p = w.pts.reduce((a, b) => a.add(b), V()).multiplyScalar(1 / Math.max(1, w.pts.length)); mk(w.fl, p.x * .6, p.y + .15, p.z * .6, .6); });
    S.extras.push((sh, dt, t) => { for (const o of fl) o.L.intensity = o.i * (.75 + .25 * Math.sin(t * 13 + o.ph) * Math.sin(t * 7.3 + o.ph * 2) + (Math.random() < .08 ? .25 : 0)); }); }   /* outer layer: fewer, taller flames streaming off */
  const tipsB = S._fTips || [], emSrc = [];
  tipsB.forEach(p => emSrc.push({ o: B, p }));
  (S._fWing || []).forEach(w => { w.pts.forEach(p => emSrc.push({ o: w.fl, p })); });
  if (S._fTail) { S._fTail.pts.forEach(p => emSrc.push({ o: S._fTail.tg, p })); }
  /* embers: off until a version that draws correctly is ready */
  const R = fireRamp(S), halos = [[0, .15, -.3, 3.4, .3], [0, .3, -.9, 1.6, .25], [0, .1, .6, 2.2, .22]].map(([x, y, z, s, op]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: R[1].clone().multiplyScalar(.5), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.position.set(x, y, z); sp.scale.setScalar(s); B.add(sp); return { sp, op, s }; });
  S.extras.push((sh, dt, t) => { for (const h of halos) { const k = .8 + .2 * Math.sin(t * 7 + h.s) * Math.sin(t * 3.1); h.sp.material.opacity = h.op * k; h.sp.scale.setScalar(h.s * (.95 + .08 * k)); } });
}
/* ===== BLAZE DRAKE · 화염 드레이크 — Storm Drake's body, burning: charred dark scales, the skin under them glows like lava,
   lava veins in the wing membranes, and real particle flames rising off the whole body, wings, legs and tail ===== */
function fireDrake(S) { S._fire = true; S._sparks = true; S._fireEye = new THREE.Color(1, .1, .04); wdBody(S); }
function fireEngulf(S, B, budIn, budOut, szK, lenK) { if (NOFX) return;
  const groups = new Map(); B.traverse(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position && o.material && o.material.isMeshStandardMaterial) { const pr = o.parent; (groups.get(pr) || groups.set(pr, []).get(pr)).push(o); } });
  const e1 = V(), e2 = V(), A = V(), Bv = V(), Cv = V(), area = new Map(); let tot = 0;
  for (const [pr, ms] of groups) { let a = 0; for (const me of ms) { me.updateMatrix(); const pa = me.geometry.attributes.position, ix = me.geometry.index, n = ix ? ix.count : pa.count;
      for (let t = 0; t < n; t += 3) { const i0 = ix ? ix.getX(t) : t, i1 = ix ? ix.getX(t + 1) : t + 1, i2 = ix ? ix.getX(t + 2) : t + 2;
        A.fromBufferAttribute(pa, i0).applyMatrix4(me.matrix); Bv.fromBufferAttribute(pa, i1).applyMatrix4(me.matrix); Cv.fromBufferAttribute(pa, i2).applyMatrix4(me.matrix); a += e1.subVectors(Bv, A).cross(e2.subVectors(Cv, A)).length() * .5; } }
    area.set(pr, a); tot += a; }
  const emSrc = [];
  const wingSet = new Set(S._wdWingG || []);
  for (const [pr, ms0] of groups) { const a = area.get(pr); if (a < tot * .02) continue; const isW = m => wingSet.has(m) || wingSet.has(m.parent), parts = [ms0.filter(isW), ms0.filter(m => !isW(m))].filter(p => p.length);
    for (const ms of parts) { const wg = isW(ms[0]), wk = wg ? 2.2 : 1, ws = wg ? 1.25 : 1;   /* the whole budget is shared by surface area, so big dragons stay inside the frame budget */
    S._fireLayer = { len: .55 * lenK, op: 1.2, sparks: S._ice ? 0 : .1 }; fireBurn(S, pr, ms, budIn / tot * wk, .05 * szK * ws);
    S._fireLayer = { len: .95 * lenK, op: .75 * (wg ? 1.2 : 1) }; fireBurn(S, pr, ms, budOut / tot * wk, .078 * szK * ws); S._fireLayer = null; }
    fireSmoke(S, pr, ms0, 600 / tot);
    for (let k = 0; k < 40; k++) { const me = ms0[Math.floor(Math.random() * ms0.length)], pa = me.geometry.attributes.position, vi = Math.floor(Math.random() * pa.count); emSrc.push({ o: me, i: vi, p: V().fromBufferAttribute(pa, vi) }); } }
  /* embers: off until a version that draws correctly is ready */
  S.extras.push((sh, dt, t) => { FIRE_T.value = t; });
}
const BD_V = [
  { name: 'A · 화염 드레이크', desc: '스톰 드레이크의 화염 버전이에요. 그을린 검붉은 갑옷 비늘 사이로 용암처럼 달아오른 피부가 빛나고, 날개 막에는 용암 핏줄이 흘러요. 몸통·목·날개·다리·꼬리 전체에서 불길이 뒤로 흘러 타오르고, 불티와 연기가 흩날려요. 눈은 붉게 타올라요.',
    build(S) { fireEngulf(S, S.body, 11000, 4000, .95, 1.2); ceFinish(S); } },
  { name: 'B · 폭염 드레이크', desc: 'A에 불길 폭발을 더했어요. 불규칙하게 온몸의 불길이 확 치솟아 두 배로 길고 굵게 타오르고, 재와 불티가 한꺼번에 뜯겨 날아가며 불빛이 번쩍여요.',
    build(S) { fireEngulf(S, S.body, 11000, 4000, .95, 1.2); fireFlare(S); ceFinish(S); } },
  { name: 'C · 화산 드레이크', desc: 'B에 화산재 구름을 더했어요. 몸 양옆으로 시커먼 화산재 구름이 깔리고 구름 속에서 불빛이 번쩍이며, 무빙 때는 구름이 빠르게 스쳐 지나가요.',
    build(S) { fireEngulf(S, S.body, 11000, 4000, .95, 1.2); fireFlare(S); dragonStormClouds(S, null, { spread: 2.3, size: 1.5, side: 2.7, z0: 3.4, z1: 12, coreK: .45, tones: ASH_TONES }); ceFinish(S); } },
];
/* FIRE STYLE B: flare-ups — every so often the fire ERUPTS: all flames leap up twice as long and thicker, a burst of
   ash and sparks is torn off, the firelight flashes. irregular, sometimes two in a row (like the thunder B strikes) */
function fireFlare(S) { if (NOFX) return;
  const R0 = fireRamp(S), L = new THREE.PointLight(R0[2].clone().multiplyScalar(.5), 0, 6, 1.6); L.position.set(0, .3, 0); S.body.add(L);
  let nx = .6, f = 0;
  S.extras.push((sh, dt) => { nx -= dt; if (nx < 0) { f = Math.min(1.3, f + .8 + Math.random() * .4); nx = .7 + Math.random() * 1.8; if (Math.random() < .3) nx = .18; }
    f = Math.max(0, f - dt * 1.6); S._flare = f; L.intensity = f * 2.2 * (.85 + .3 * Math.random()); });
}
/* FIRE STYLE C: B + banks of smouldering volcanic ash cloud, lit from inside by the fire (orange glow flashes in them) */
const ASH_TONES = [new THREE.Color(.13, .1, .09), new THREE.Color(.19, .13, .1), new THREE.Color(.24, .15, .11), new THREE.Color(.32, .25, .21), new THREE.Color(.08, .07, .065)];
const FB_V = [
  { name: 'A · 불꽃 독수리', desc: '썬더버드 Λ의 화염 버전이에요. 깃털과 몸 전체가 안에서부터 타오르고, 불길이 깃털을 따라 뒤로 흘러요. 갈기·몸통·날개·꼬리 깃털 끝마다 불꽃이 너울거리고, 불티가 흩날려요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } fireify(S); ceFinish(S); } },
  { name: 'B · 폭염 독수리', desc: 'A에 불길 폭발을 더했어요. 불규칙하게 불길이 확 치솟아 두 배로 길고 굵게 타오르고, 그때마다 재와 불티가 한꺼번에 뜯겨 날아가며 불빛이 번쩍여요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } fireify(S); fireFlare(S); ceFinish(S); } },
  { name: 'C · 화산 독수리', desc: 'B에 화산재 구름을 더했어요. 시커먼 화산재 구름이 주변에 깔리고 구름 속에서 불빛이 번쩍이며, 무빙 때는 구름이 빠르게 뒤로 스쳐 지나가요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } fireify(S); fireFlare(S); dragonStormClouds(S, null, { spread: 1.9, size: 1.3, side: 2.2, z0: 2.6, z1: 10, tones: ASH_TONES, coreK: .6 }); ceFinish(S); } },
];
const CE_V = [
  { name: 'A · 번개 뇌조', desc: '갈기·몸통·날개·꼬리가 모두 뾰족한 번개 깃털로 덮인 번개 독수리예요. 번개색 몸과 부리, 노란 번개 칼눈, 앞날 톱니가 선 다이아몬드 깃털 날개, 부채꼴 꼬리를 가졌어요. 몸 주변으로 약한 번개가 가끔 튀어요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } ceStorm(S, .35); ceFinish(S); } },
  { name: 'B · 뇌운 뇌조', desc: 'A에 번개 효과를 더했어요. 몸 주변으로 번개가 아주 불규칙하고 자주 쳐서 깃털 위를 기어가고, 몸·날개·꼬리 사이를 건너뛰고, 공중으로 튀어나가요. 번개가 칠 때마다 몸 전체와 빛무리가 번쩍여요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } ceStorm(S, 1); ceFinish(S); } },
  { name: 'C · 먹구름 뇌조', desc: 'B에 번개 치는 먹구름을 더했어요. 여러 톤의 먹구름이 새 주변과 아래에 깔리고, 구름 속에서 번개가 번쩍이며 구름 아랫면이 번개색으로 빛나요. 무빙 때는 구름이 빠르게 뒤로 스쳐 지나가요.',
    build(S) { for (const s of [1, -1]) { const w = ceFeatherWing(S, s); B_add(S, w, s); } ceStorm(S, 1); dragonStormClouds(S, null, { spread: 1.9, size: 1.3, side: 2.2, z0: -5, z1: 2.5 }); ceFinish(S); } },
];
function B_add(S, w, s) { S.part(w.g, { cruise: [0, 0, 0], boost: [0, 0, .08, 0, -s * .3, 0] }); S.extras.push((sh, dt, t) => { w.fl.rotation.z = s * Math.sin(t * 1.4) * (sh.mode === 'cruise' ? .14 : .05); }); S.gun(tipAt(w.g, s * 1.2, .2, -.3), { ...bolt(S, { rate: .22 }), color: tracerC(S) }); }
/* =========================================================
   ⚡ THUNDER DRAGON — serpentine storm dragon
   ========================================================= */
function scaleTex(d) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const base = new THREE.Color(d.base), dark = base.clone().multiplyScalar(.32), lite = base.clone().lerp(new THREE.Color(1, 1, 1), .38), acc = new THREE.Color(d.accent), belly = new THREE.Color(d.base).lerp(new THREE.Color(.92, .9, .84), .62);
  const css = (col, a = 1) => `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},${a})`;
  // u: 0 side → .25 dorsal → .5 side → .75 belly ; v wraps along the body
  const zone = u => { const dor = Math.max(0, Math.cos((u - .25) * TAU)), bel = Math.max(0, Math.cos((u - .75) * TAU)); return { dor, bel }; };
  x.fillStyle = css(dark.clone().multiplyScalar(.6)); x.fillRect(0, 0, S, S);
  const rnd = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  // overlapping round fish-scales (like painted golden dragons): free edge toward the tail (+v),
  // drawn tail-row first so each head-ward row overlaps the next; dark heart, bright gilded rim
  const ec = document.createElement('canvas'); ec.width = ec.height = S; const e = ec.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, S, S); e.save(); e.translate(0, S); e.scale(1, -1);
  x.save(); x.translate(0, S); x.scale(1, -1); // canvas is flipped onto v, so mirror to point free edges tail-ward
  const cols = 6, sw = S / cols, rows = 12, sh = S / rows, rr = 60, wx = sw * .62 / rr; // wide scales: horizontally stretched
  // paint one long strip in strict overlap order (no wrapped copies): every row sees the same neighbours, so the tile repeats seamlessly
  for (let row = rows + 6; row >= -6; row--) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * sw + (row & 1) * sw / 2, cy = row * sh, u = (((cx / S) % 1) + 1) % 1, z = zone(u), j = rnd(((row % rows) + rows) % rows, ((col % cols) + cols) % cols);
      const col0 = base.clone().lerp(acc.clone().multiplyScalar(.6), .12 * z.dor).multiplyScalar(lp(1.05, .82, z.dor) * (.92 + .16 * j));
      const heart = col0.clone().multiplyScalar(.42), mid = col0.clone(), edge = col0.clone().lerp(new THREE.Color(1, 1, 1), .22), rim = col0.clone().lerp(acc, .35).lerp(new THREE.Color(1, 1, 1), .45);
      for (const oy of [0]) {
        const yy = cy + oy; if (yy < -rr * 2 || yy > S + rr * 2) continue;
        x.save(); x.translate(cx, yy); x.scale(wx, 1);
        // soft shadow cast on the scale behind
        x.beginPath(); x.arc(0, 3, rr, 0, Math.PI); x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.45)'; x.stroke();
        x.beginPath(); x.arc(0, 0, rr, 0, TAU);
        const gr = x.createRadialGradient(0, -rr * .35, rr * .1, 0, -rr * .1, rr * 1.02); gr.addColorStop(0, css(heart)); gr.addColorStop(.45, css(mid)); gr.addColorStop(.85, css(edge)); gr.addColorStop(1, css(rim));
        x.fillStyle = gr; x.fill();
        // gilded rim and a thin inner line along the free edge
        x.beginPath(); x.arc(0, 0, rr - 1.2, Math.PI * .05, Math.PI * .95); x.lineWidth = 2.4; x.strokeStyle = css(rim, .95); x.stroke();
        x.beginPath(); x.arc(0, -rr * .08, rr * .72, Math.PI * .2, Math.PI * .8); x.lineWidth = 1; x.strokeStyle = css(edge, .35); x.stroke();
        x.restore();
        // glow mask: same overlap order, so only the exposed free edge of each scale lights up
        e.save(); e.translate(cx, yy); e.scale(wx, 1); e.beginPath(); e.arc(0, 0, rr, 0, TAU); e.fillStyle = '#000'; e.fill();
        e.beginPath(); e.arc(0, 0, rr - 1.5, Math.PI * .08, Math.PI * .92); e.lineWidth = 3; e.strokeStyle = 'rgba(255,255,255,.35)'; e.stroke(); e.lineWidth = 1.4; e.strokeStyle = '#fff'; e.stroke(); e.restore();
      }
    }
  }
  x.restore(); e.restore();
  // dorsal stripe of darker scutes
  const gs = x.createLinearGradient(0, 0, S, 0); gs.addColorStop(0, 'rgba(0,0,0,0)'); gs.addColorStop(.18, 'rgba(0,0,0,0)'); gs.addColorStop(.25, 'rgba(0,0,0,.32)'); gs.addColorStop(.32, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gs; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  const src = x.getImageData(0, 0, S, S).data, Hh = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) Hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const hx = Hh[yy * S + (xx + 1) % S] - Hh[yy * S + (xx - 1 + S) % S], hy = Hh[((yy + 1) % S) * S + xx] - Hh[((yy - 1 + S) % S) * S + xx]; let a = -hx * 5, b = -hy * 5, cc = 1; const L = Math.hypot(a, b, cc); const o = (yy * S + xx) * 4; nd[o] = (a / L * .5 + .5) * 255; nd[o + 1] = (b / L * .5 + .5) * 255; nd[o + 2] = (cc / L * .5 + .5) * 255; nd[o + 3] = 255; }
  nx.putImageData(ni, 0, 0); const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
  const et = new THREE.CanvasTexture(ec); et.wrapS = et.wrapT = THREE.RepeatWrapping;
  return { map: t, nrm: nt, em: et };
}
function getScalePaint(id, i) {
  const k = 'sc' + id + i; if (paintCache3[k]) return paintCache3[k];
  const d = PAINTS3[id][i], tx = scaleTex(d);
  const hull = new THREE.MeshStandardMaterial({ map: tx.map, normalMap: tx.nrm, normalScale: new THREE.Vector2(1.5, 1.5), metalness: d.prism ? .6 : .35, roughness: d.prism ? .22 : .32, side: THREE.DoubleSide, emissive: new THREE.Color(...d.glow).multiplyScalar(.6), emissiveMap: tx.em, emissiveIntensity: .9 });
  const hullFlat = hull.clone(); hullFlat.flatShading = true;
  const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.base).multiplyScalar(.3).lerp(new THREE.Color(d.accent), .15), metalness: .3, roughness: .22, side: THREE.DoubleSide });
  const bone = new THREE.MeshStandardMaterial({ color: new THREE.Color(.86, .84, .78).lerp(new THREE.Color(d.accent), .12), metalness: .1, roughness: .35 });
  const scale = trim.clone();
  const bc = document.createElement('canvas'); bc.width = 64; bc.height = 128; const bx = bc.getContext('2d'), bcol = new THREE.Color(.96, .86, .58).lerp(new THREE.Color(d.accent), .1), bcss = (k, a = 1) => `rgba(${bcol.r * 255 * k | 0},${bcol.g * 255 * k | 0},${bcol.b * 255 * k | 0},${a})`;
  const bgr = bx.createLinearGradient(0, 0, 0, 128); bgr.addColorStop(0, bcss(.5)); bgr.addColorStop(.14, bcss(1.05)); bgr.addColorStop(.65, bcss(.92)); bgr.addColorStop(.9, bcss(.6)); bgr.addColorStop(1, bcss(.38)); bx.fillStyle = bgr; bx.fillRect(0, 0, 64, 128);
  for (let i = 0; i < 40; i++) { bx.strokeStyle = bcss(.7, .25); bx.lineWidth = 1; const yy = 20 + Math.random() * 90; bx.beginPath(); bx.moveTo(Math.random() * 64, yy); bx.lineTo(Math.random() * 64, yy + (Math.random() - .5) * 6); bx.stroke(); }
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.wrapS = bt.wrapT = THREE.RepeatWrapping;
  const belly = new THREE.MeshStandardMaterial({ map: bt, roughness: .42, metalness: .05, side: THREE.DoubleSide });
  [hull, hullFlat, trim, bone, scale, belly].forEach(m => { if (d.prism) prismify(m); m.userData.keep = true; });
  return paintCache3[k] = { d, hull, hullFlat, trim, bone, scale, belly, glow: new THREE.Color(...d.glow), flame: d.flame, prism: !!d.prism };
}
/* live serpentine spine: tube whose rings follow an animated curve; attachments ride its frames */
function serpent(S, o) {
  const N = o.rings, R = 16, B = S.body;
  const pos = new Float32Array((N + 1) * (R + 1) * 3), uv = new Float32Array((N + 1) * (R + 1) * 2), idx = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= R; j++) { uv.set([j / R, i / N * o.uvRep], (i * (R + 1) + j) * 2); if (i < N && j < R) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, S.P.hull); mesh.frustumCulled = false; mesh.userData.liveFire = true; B.add(mesh);
  // smooth segmented belly band hugging the underside (ribbed, tapering with the body)
  const BC = 12, RB = o.ribs || 46, bpos = new Float32Array((N + 1) * (BC + 1) * 3), buv = [], bidx = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= BC; j++) { buv.push(j / BC, i / N * RB); if (i < N && j < BC) { const a = i * (BC + 1) + j, b = a + BC + 1; bidx.push(a, a + 1, b, b, a + 1, b + 1); } }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2)); bg.setIndex(bidx);
  const bm = new THREE.Mesh(bg, S.P.belly || S.P.bone); bm.frustumCulled = false; bm.userData.liveFire = true; B.add(bm);
  const ribK = s => 1.03 + .04 * Math.pow(Math.abs(Math.sin(s * RB * Math.PI)), .35);
  const att = [], k = { ax: o.ax, ay: o.ay, w: o.w }, P = V(0, 0, 0), T = V(0, 0, 0), U = V(0, 0, 0), Bn = V(0, 0, 0), q = V(0, 0, 0), M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  let ph = 0; const spine = (s, t, out) => { const env = o.env(s); return out.set(Math.sin(s * TAU * o.f - ph) * k.ax * env, Math.sin(s * TAU * o.f2 - ph * .8 + 1.3) * k.ay * env, lp(o.z0, o.z1, s)); };
  const frame = (s, t) => { spine(s, t, P); spine(Math.min(1, s + .01), t, q); T.subVectors(q, P); if (s >= .99) { spine(s - .01, t, q); T.subVectors(P, q); } T.normalize(); U.set(0, 1, 0).addScaledVector(T, -T.y).normalize(); Bn.crossVectors(U, T).normalize(); };
  const api = {
    attach(obj, s, off = V(0, 0, 0), lq = null) { const e = { obj, s, off, lq }; att.push(e); B.add(obj); obj.userData.att = e; return obj; },
    r: o.r
  };
  const upd = (sh, dt, t) => {
    const mv = sh.mode === sh.cfg.moving, kk = 1 - Math.exp(-dt * 1.2);
    // idle: the body holds a still S-pose · moving: one smooth travelling wave (phase is integrated, so speed changes never jerk)
    k.ax += ((mv ? o.ax : o.ax * .85) - k.ax) * kk; k.w += ((mv ? o.w : 0) - k.w) * kk; k.ay += ((mv ? o.ay : o.ay * .7) - k.ay) * kk; ph += k.w * dt;
    for (let i = 0; i <= N; i++) {
      const s = i / N; frame(s, t); const r = o.r(s), rx = r * 1.12, ry = r * (.95);
      for (let j = 0; j <= R; j++) { const th = j / R * TAU, c = Math.cos(th), sn = Math.sin(th), yy = sn >= 0 ? ry * sn + r * .2 * Math.pow(sn, 12) : ry * .78 * sn; const o3 = (i * (R + 1) + j) * 3; pos[o3] = P.x + Bn.x * rx * c + U.x * yy; pos[o3 + 1] = P.y + Bn.y * rx * c + U.y * yy; pos[o3 + 2] = P.z + Bn.z * rx * c + U.z * yy; }
      const rk = ribK(s);
      for (let j = 0; j <= BC; j++) { const th = Math.PI + .5 + j / BC * (Math.PI - 1), c = Math.cos(th), sn = Math.sin(th), xx = rx * c * rk, yy = ry * .78 * sn * rk; const o3 = (i * (BC + 1) + j) * 3; bpos[o3] = P.x + Bn.x * xx + U.x * yy; bpos[o3 + 1] = P.y + Bn.y * xx + U.y * yy; bpos[o3 + 2] = P.z + Bn.z * xx + U.z * yy; }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); bg.attributes.position.needsUpdate = true; bg.computeVertexNormals();
    for (const a of att) { frame(a.s, t); M.makeBasis(Bn, U, T); Q.setFromRotationMatrix(M); a.obj.quaternion.copy(Q); if (a.lq) a.obj.quaternion.multiply(a.lq); a.obj.position.copy(P).addScaledVector(Bn, a.off.x).addScaledVector(U, a.off.y).addScaledVector(T, a.off.z); }
  };
  upd({ mode: 0, cfg: { moving: 1 } }, 0, 0);   /* pose the body once at build time (so surface emitters can be sampled from it) */
  S.extras.push(upd);
  return api;
}
/* ---------- sculpted dragon head: lofted skull + gaussian sculpt features (brows, sockets, cheekbones, nostril flares, lip lines) ---------- */
const cmr = (p0, p1, p2, p3, t) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function secInterp(secs, z) {
  let i = 0; while (i < secs.length - 2 && z < secs[i + 1].z) i++;
  const a = secs[Math.max(0, i - 1)], b = secs[i], c = secs[i + 1], d = secs[Math.min(secs.length - 1, i + 2)], t = Math.min(1, Math.max(0, (b.z - z) / (b.z - c.z)));
  const o = {}; for (const k of ['w', 'ht', 'hb', 'y']) o[k] = cmr(a[k] || 0, b[k] || 0, c[k] || 0, d[k] || 0, t); return o;
}
const spw = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
// surface point on the superellipse section at lateral x, top (+1) or bottom (-1)
function secSurfY(secs, z, x, side, n = 2.5) { const s = secInterp(secs, z), c = Math.min(.999, Math.pow(Math.min(1, Math.abs(x) / s.w), n / 2)), sn = Math.sqrt(1 - c * c); return s.y + side * (side > 0 ? s.ht : s.hb) * Math.pow(sn, 2 / n); }
function sculptGeo(secs, feats, { nz = 72, nr = 44, n = 2.5, uvRep = 2, mask = null, mouth = null } = {}) {
  const SN = [];
  const z0 = secs[0].z, z1 = secs[secs.length - 1].z, pos = new Float32Array((nz + 1) * (nr + 1) * 3), uv = [], idx = [];
  for (let i = 0; i <= nz; i++) {
    const u = i / nz, z = lp(z0, z1, Math.pow(u, .92)), s = secInterp(secs, z);
    for (let j = 0; j <= nr; j++) {
      const th = j / nr * TAU - Math.PI / 2, c = Math.cos(th), sn = Math.sin(th); SN.push(sn);
      const o = (i * (nr + 1) + j) * 3; pos[o] = s.w * spw(c, 2 / n); pos[o + 1] = s.y + (sn >= 0 ? s.ht : s.hb) * spw(sn, 2 / n); pos[o + 2] = z;
      uv.push(j / nr, u * uvRep); if (i < nz && j < nr) { const a = i * (nr + 1) + j, b = a + nr + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const seam = () => { const nm = g.attributes.normal.array; for (let i = 0; i <= nz; i++) { const a = i * (nr + 1) * 3, b = (i * (nr + 1) + nr) * 3; for (let k = 0; k < 3; k++) { const m = (nm[a + k] + nm[b + k]) / 2; nm[a + k] = nm[b + k] = m; } } };
  g.computeVertexNormals(); seam();
  const nm = g.attributes.normal.array, P = V(0, 0, 0), q = V(0, 0, 0), ab = V(0, 0, 0);
  const disp = new Float32Array(pos.length / 3);
  for (let v = 0; v < disp.length; v++) {
    P.set(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); let d = 0;
    for (const f of feats) {
      if (f.b) { ab.subVectors(f.b, f.c); const t = Math.min(1, Math.max(0, q.subVectors(P, f.c).dot(ab) / ab.lengthSq())); q.copy(f.c).addScaledVector(ab, t); const r = P.distanceTo(q) / f.r; d += f.a * Math.exp(-r * r); }
      else { const dx = (P.x - f.c.x) / f.r.x, dy = (P.y - f.c.y) / f.r.y, dz = (P.z - f.c.z) / f.r.z; d += f.a * Math.exp(-(dx * dx + dy * dy + dz * dz)); }
    }
    disp[v] = d;
  }
  for (let v = 0; v < disp.length; v++) for (let k = 0; k < 3; k++) pos[v * 3 + k] += nm[v * 3 + k] * disp[v];
  // close the front tip so the inside can't be seen
  { const i = nz, s = secInterp(secs, z1); for (let j = 0; j <= nr; j++) { const o = (i * (nr + 1) + j) * 3; pos[o] = 0; pos[o + 1] = s.y; pos[o + 2] = z1 - .004; } }
  // uniform scale size: u = arc length around each ring, v = distance along the head
  const uvA = g.attributes.uv;
  // u = surface distance sideways from the top midline, v = surface distance along each lengthwise line:
  // keeps the scales square-on instead of shearing where the head narrows or steps up at the brow
  { const P3 = k => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], dist = (a, b) => { const A = P3(a), B = P3(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }, mid = nr / 2, U = new Float32Array((nz + 1) * (nr + 1)), Vv = new Float32Array((nz + 1) * (nr + 1));
    for (let i = 0; i <= nz; i++) { const b = i * (nr + 1); U[b + mid] = 0; for (let j = mid + 1; j <= nr; j++) U[b + j] = U[b + j - 1] + dist(b + j, b + j - 1); for (let j = mid - 1; j >= 0; j--) U[b + j] = U[b + j + 1] - dist(b + j, b + j + 1); }
    for (let j = 0; j <= nr; j++) for (let i = 1; i <= nz; i++) Vv[i * (nr + 1) + j] = Vv[(i - 1) * (nr + 1) + j] + dist(i * (nr + 1) + j, (i - 1) * (nr + 1) + j);
    for (let k = 0; k < U.length; k++) uvA.setXY(k, U[k] / 2.0, -Vv[k] / 1.0); }
  uvA.needsUpdate = true;
  // mouth mask: the inner surface (palate on the skull, tongue bed on the jaw) is bare flesh, no scales
  { const mo = new Float32Array(pos.length / 3); if (mouth) for (let v = 0; v < mo.length; v++) mo[v] = smoothstep(.42, .72, mouth.side * SN[v]) * (1 - smoothstep(mouth.zMax - .08, mouth.zMax, pos[v * 3 + 2])); g.setAttribute('aMouth', new THREE.BufferAttribute(mo, 1)); }
  if (mask) { const mk = new Float32Array(pos.length / 3); for (let v = 0; v < mk.length; v++) mk[v] = mask(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); g.setAttribute('aMask', new THREE.BufferAttribute(mk, 1)); }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals(); seam();
  return g;
}
// feature builders (mirrored across x)
const fPt = (L, c, r, a, mir = true) => { const rv = typeof r === 'number' ? V(r, r, r) : r; L.push({ c, r: rv, a }); if (mir && c.x) L.push({ c: V(-c.x, c.y, c.z), r: rv, a }); };
const fSeg = (L, c, b, r, a, mir = true) => { L.push({ c, b, r, a }); if (mir && (c.x || b.x)) L.push({ c: V(-c.x, c.y, c.z), b: V(-b.x, b.y, b.z), r, a }); };
const EYE_SHAPES = [
  { name: '흰자 + 홍채', mode: 1 },
  { name: '파충류 눈', mode: 0 },
  { name: '빛나는 눈', mode: 2 },
  { name: '흑안', mode: 3 }];
let eyeIdx = 2; const EYE = { A: .078, BT: .058, BB: .05, SL: .006, pw: .2, round: 1, mode: 2 }; const EYE_R = .088;
// almond eye opening (local eye frame, x across, y up): inner corner (x*side>0) sits lower → scowl
const eyeY = (x, top, side) => { const X = Math.min(1, Math.abs(x) / EYE.A); return (top ? EYE.BT : -EYE.BB) * Math.pow(1 - X * X, .7) - EYE.SL * (x / EYE.A) * side; };
function dragonEyeMat(col, side = 1) {
  const c = col.clone(); c.multiplyScalar(1 / Math.max(c.r, c.g, c.b, 1e-3));
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: c }, uS: { value: side }, uE: { value: new THREE.Vector4(EYE.A, EYE.BT, EYE.BB, EYE.SL) }, uP: { value: new THREE.Vector2(EYE.pw, EYE.round) }, uM: { value: EYE.mode } },
    vertexShader: `varying vec3 vL; varying vec3 vN; varying vec3 vV; void main(){ vL=position; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uS; uniform vec4 uE; uniform vec2 uP; uniform float uM; varying vec3 vL; varying vec3 vN; varying vec3 vV;
      void main(){ float X=vL.x/uE.x; if(abs(X)>1. || vL.z<0.) discard; float sh=pow(1.-X*X,.7), sl=-uE.w*X*uS; if(vL.y>uE.y*sh+sl || vL.y<-uE.z*sh+sl) discard;
        vec3 p=normalize(vL); float r=length(p.xy); float ang=atan(p.y,p.x);
        float fib=.55+.45*sin(ang*41.+sin(ang*7.)*2.3+r*26.); float fib2=.5+.5*sin(ang*17.-r*40.);
        vec3 col=mix(uC*1.9+vec3(.25), uC*.55, smoothstep(.12,.78,r))*(.62+.38*fib)*(.85+.3*fib2);
        col=mix(col, vec3(1.,.92,.7)*1.3, (1.-smoothstep(.0,.3,r))*.35);
        col*=1.-smoothstep(.7,.9,r)*.88;
        float pup, rim;
        if(uP.y>.5){ pup=1.-smoothstep(uP.x,uP.x+.03,r); rim=exp(-pow((r-uP.x-.035)/.035,2.)); }
        else { float py=clamp(abs(p.y)/.66,0.,1.); float pw=uP.x*(1.-py*py); pup=(1.-smoothstep(pw,pw+.02,abs(p.x)))*step(abs(p.y),.66); rim=exp(-pow((abs(p.x)-pw-.02)/.03,2.))*step(abs(p.y),.6); }
        col+=uC*1.4*rim*(1.-pup);
        col=mix(col,vec3(.0,.0,.01),pup);
        if(uM>.5 && uM<1.5){ // white sclera, coloured iris disc, round pupil
          float ir=.5; vec3 scl=vec3(.93,.9,.84)*(1.-.55*smoothstep(.55,1.,r)); scl=mix(scl,vec3(.85,.35,.3),.15*smoothstep(.7,1.,r));
          vec3 iris=mix(uC*1.7+vec3(.15),uC*.45,smoothstep(.0,ir,r))*(.65+.35*fib);
          float pp=1.-smoothstep(.17,.2,r); iris=mix(iris,vec3(0.),pp); iris+=uC*exp(-pow((r-.21)/.03,2.))*(1.-pp);
          col=mix(iris,scl,smoothstep(ir-.02,ir+.02,r)); col*=1.-.75*exp(-pow((r-ir)/.03,2.)); }
        else if(uM>1.5 && uM<2.5){ // solid glowing eye, no pupil
          col=mix(vec3(1.),uC*1.6,smoothstep(.0,.8,r))*(.9+.1*fib)*1.3; }
        else if(uM>2.5){ // black eye with a burning iris ring and slit
          float ring=exp(-pow((r-.36)/.08,2.)); col=vec3(.02,.02,.03)+uC*1.8*ring*(.7+.3*fib); float sl2=(1.-smoothstep(.04,.06,abs(p.x)))*step(abs(p.y),.5); col=mix(col,vec3(0.),sl2*ring); }
        col*=step(-.1,p.z)+.0;
        vec3 N=normalize(vN),Vv=normalize(vV),L=normalize(vec3(.35,.75,.55));
        col+=vec3(1.)*pow(max(dot(reflect(-L,N),Vv),0.),90.)*1.8+vec3(1.)*pow(max(dot(reflect(-normalize(vec3(-.5,.2,.8)),N),Vv),0.),40.)*.25;
        col+=uC*pow(1.-max(dot(N,Vv),0.),3.)*.35;
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`
  });
}
function hornMesh(S, pts, r0, ridges = 48) {
  const geo = sweep(pts, t => { const k = r0 * lp(1, .07, Math.pow(t, .85)) * (1 + .1 * Math.pow(Math.max(0, Math.sin(t * ridges)), 3) * (1 - t)); return { w: k, h: k * .82, n: 2.2 }; }, { segs: 56, rad: 12 });
  const uvA = geo.attributes.uv, cols = new Float32Array(uvA.count * 3), c0 = new THREE.Color(S.P.d.base).multiplyScalar(.35).lerp(new THREE.Color(S.P.d.accent), .1), c1 = S.P.bone.color.clone().multiplyScalar(1.12), tmp = new THREE.Color();
  for (let i = 0; i < uvA.count; i++) { const t = uvA.getY(i), rg = Math.pow(Math.max(0, Math.sin(t * ridges)), 3) * (1 - t); tmp.copy(c0).lerp(c1, smoothstep(.05, .7, t)).multiplyScalar(.82 + .25 * rg); cols.set([tmp.r, tmp.g, tmp.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = S._hornMat || (S._hornMat = (() => { const mm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .3, metalness: .1, emissive: S.P.glow.clone().multiplyScalar(.9) });
    mm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= .15 + 1.1 * smoothstep(.25, .95, dot(vColor.rgb, vec3(.333)));'); };
    S.extras.push((sh, dt, t) => { mm.emissiveIntensity = .8 + .25 * Math.sin(t * 2.4) + (sh.fire ? .6 : 0); }); return mm; })());
  return new THREE.Mesh(geo, m);
}
/* a horn that IS a lightning bolt: faceted zig-zag segments with a hot white core, coloured body and soft halo */
// one continuous faceted tube through a zig-zag polyline, mitred at each kink so nothing overlaps
function polyTube(pts, rad, seg) {
  const n = pts.length, pos = [], idx = [], A = V(), Bv = V(), T = V(), t0 = V(), t1 = V(), up = V(0, 1, 0);
  for (let i = 0; i < n; i++) {
    t0.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    let mk = 1; if (i > 0 && i < n - 1) { t1.subVectors(pts[i], pts[i - 1]).normalize(); T.subVectors(pts[i + 1], pts[i]).normalize(); mk = 1 / Math.max(.5, Math.sqrt((1 + t1.dot(T)) / 2)); }
    A.crossVectors(t0, up); if (A.lengthSq() < 1e-6) A.set(1, 0, 0); A.normalize(); Bv.crossVectors(A, t0).normalize();
    const r = rad(i / (n - 1)) * (i === n - 1 ? .05 : 1);
    for (let j = 0; j <= seg; j++) { const a = j / seg * TAU, c = Math.cos(a) * r * mk, s = Math.sin(a) * r; pos.push(pts[i].x + A.x * c + Bv.x * s, pts[i].y + A.y * c + Bv.y * s, pts[i].z + A.z * c + Bv.z * s); if (i < n - 1 && j < seg) { const p = i * (seg + 1) + j, q = p + seg + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); } }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* fire version of the bolt material: molten horn — flickering flame noise that streams along the horn,
   white-gold core, orange/red body, soft red halo (additive, same three layers as the lightning bolt) */
function fireGlowMat(S, kind) {
  const R = fireRamp(S), U = { uFT: FIRE_T, uC0: { value: R[0] }, uC1: { value: R[1] }, uC2: { value: R[2] }, uC3: { value: R[3] }, uK: { value: kind } };
  const m = new THREE.ShaderMaterial({ uniforms: U, transparent: kind > 0, depthWrite: kind === 0, blending: kind > 0 ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `#include <common>
varying vec3 vP;
void main(){
#include <begin_vertex>
  vP = position;
#include <project_vertex>
}`,
    fragmentShader: `uniform float uFT, uK; uniform vec3 uC0, uC1, uC2, uC3; varying vec3 vP;` + FIRE_GLSL + `
      void main(){ float n = fn(vP * 22. + vec3(0., -uFT * 5., uFT * 3.)) * .6 + fn(vP * 55. + vec3(uFT * 2., -uFT * 9., 0.)) * .4;
        vec3 c; float a = 1.;
        if (uK < .5) c = mix(framp(.8, uC0, uC1, uC2, uC3), framp(1., uC0, uC1, uC2, uC3), n) * .75;
        else if (uK < 1.5) { c = framp(.35 + .45 * n, uC0, uC1, uC2, uC3) * (.55 + .5 * n); a = .85; }
        else { c = framp(.25 + .3 * n, uC0, uC1, uC2, uC3) * .5; a = .22 * (.6 + .8 * n); }
        gl_FragColor = vec4(c, a); }` });
  m.userData.fireGlow = true; return m;
}
function boltHorn(S, parent, pts, r0, r1) {
  if (S._fire && !S._boltCore) { S._boltCore = fireGlowMat(S, 0); S._boltBody = fireGlowMat(S, 1); S._boltHalo = fireGlowMat(S, 2); }
  const core = S._boltCore || (S._boltCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(S.P.glow.clone().multiplyScalar(.3), .25), toneMapped: false }));
  const body = S._boltBody || (S._boltBody = glowMat(S.P.glow.clone().multiplyScalar(.75), .85));
  const halo = S._boltHalo || (S._boltHalo = glowMat(S.P.glow.clone().multiplyScalar(.5), .22));
  // densify each straight run so the taper is smooth while the corners stay sharp
  const P = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 3; k++) P.push(pts[i].clone().lerp(pts[i + 1], k / 3)); P.push(pts[pts.length - 1].clone());
  [[core, .38, 6], [body, 1, 6], [halo, 2.1, 8]].forEach(([m, k, seg], li) => { const me = new THREE.Mesh(polyTube(P, t => lp(r0, r1, t) * k, seg), m); me.renderOrder = 5 + li; parent.add(me); S.glows.push(me); });
}
let ZIG_K = 1;   /* fire builds soften the lightning zigzags into gently wavering molten horns */
const zig = (a, b, n, amp0, side, seed = 0) => { const amp = amp0 * ZIG_K, out = [a.clone()], d = V().subVectors(b, a), sx = V().crossVectors(d, V(0, 1, 0)).normalize(), sy = V().crossVectors(sx, d).normalize(); for (let i = 1; i < n; i++) { const t = i / n, k = (i % 2 ? 1 : -1) * amp * (1 - t * .4) * (.75 + .5 * Math.abs(Math.sin(i * 12.9 + seed))); out.push(a.clone().addScaledVector(d, t).addScaledVector(sx, k * side * .6).addScaledVector(sy, k * .8)); } out.push(b.clone()); return out; };
/* long barbel whisker that streams back and flutters: a tapered tube whose spine is re-solved every frame */
function liveWhisker(S, parent, base, side, len) {
  const N = 40, R = 6, pos = new Float32Array((N + 1) * (R + 1) * 3), idx = [], uv = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= R; j++) { uv.push(j / R, i / N); if (i < N && j < R) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, S._whiskM || (S._whiskM = new THREE.MeshBasicMaterial({ color: S.P.glow.clone().multiplyScalar(.6), toneMapped: false }))); m.frustumCulled = false; parent.add(m); S.glows.push(m);
  const P = [], T = V(), A = V(), Bv = V(), up = V(0, 1, 0); for (let i = 0; i <= N; i++) P.push(V());
  let ph = 0, k = 0;
  S.extras.push((sh, dt, t) => {
    const mv = sh.mode === sh.cfg.moving; k += ((mv ? 1 : 0) - k) * (1 - Math.exp(-dt * 2)); ph += dt * (2.2 + 2.4 * k);
    for (let i = 0; i <= N; i++) {
      const u = i / N, d = u * len, amp = Math.pow(u, 1.3);
      // out to the side, then sweeping back along the body; trailing waves grow toward the tip
      P[i].set(base.x + side * (Math.sin(Math.min(1, u * 2.2) * Math.PI / 2) * .55 * lp(1, .6, k) + Math.sin(u * 7 - ph) * .12 * amp),
               base.y - .05 * Math.sin(u * Math.PI) + Math.sin(u * 9 - ph * 1.3 + side) * .16 * amp - .1 * u * (1 - k),
               base.z + d * lp(.75, .95, k) - .25 * Math.sin(Math.min(1, u * 3) * Math.PI) * (1 - u));
    }
    for (let i = 0; i <= N; i++) {
      const u = i / N, r = lp(.016, .003, Math.pow(u, .8));
      T.subVectors(P[Math.min(N, i + 1)], P[Math.max(0, i - 1)]).normalize(); A.crossVectors(T, up).normalize(); Bv.crossVectors(A, T);
      for (let j = 0; j <= R; j++) { const a = j / R * TAU, c = Math.cos(a) * r, sn = Math.sin(a) * r, o = (i * (R + 1) + j) * 3; pos[o] = P[i].x + A.x * c + Bv.x * sn; pos[o + 1] = P[i].y + A.y * c + Bv.y * sn; pos[o + 2] = P[i].z + A.z * c + Bv.z * sn; }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  });
  return m;
}
function pebbleTex(d) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const base = new THREE.Color(d.base), acc = new THREE.Color(d.accent), css = (col, a = 1) => `rgba(${Math.min(255, col.r * 255) | 0},${Math.min(255, col.g * 255) | 0},${Math.min(255, col.b * 255) | 0},${a})`;
  x.fillStyle = css(base.clone().multiplyScalar(.38)); x.fillRect(0, 0, S, S);
  const rn = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < 420; i++) {
    const px = rn(i) * S, py = rn(i + 999) * S, rx = 5 + rn(i + 77) * 7, ry = rx * (.75 + rn(i + 55) * .4), ro = rn(i + 33) * Math.PI, k = .9 + rn(i + 11) * .25;
    const mid = base.clone().multiplyScalar(k), edge = mid.clone().lerp(new THREE.Color(1, 1, 1), .2).lerp(acc, .12), heart = mid.clone().multiplyScalar(.6);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const cx = px + ox, cy = py + oy; if (cx < -20 || cx > S + 20 || cy < -20 || cy > S + 20) continue;
      x.save(); x.translate(cx, cy); x.rotate(ro); x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU);
      const gr = x.createRadialGradient(-rx * .2, -ry * .3, 1, 0, 0, rx); gr.addColorStop(0, css(edge)); gr.addColorStop(.5, css(mid)); gr.addColorStop(1, css(heart));
      x.fillStyle = gr; x.fill(); x.lineWidth = 1.2; x.strokeStyle = css(base.clone().multiplyScalar(.3), .8); x.stroke(); x.restore();
    }
  }
  const src = x.getImageData(0, 0, S, S).data, Hh = new Float32Array(S * S); for (let i = 0; i < S * S; i++) Hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S), nd = ni.data;
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const hx = Hh[yy * S + (xx + 1) % S] - Hh[yy * S + (xx - 1 + S) % S], hy = Hh[((yy + 1) % S) * S + xx] - Hh[((yy - 1 + S) % S) * S + xx]; let a = -hx * 4, b = -hy * 4, cc = 1; const L = Math.hypot(a, b, cc); const o = (yy * S + xx) * 4; nd[o] = (a / L * .5 + .5) * 255; nd[o + 1] = (b / L * .5 + .5) * 255; nd[o + 2] = (cc / L * .5 + .5) * 255; nd[o + 3] = 255; }
  nx.putImageData(ni, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping;
  return { map: t, nrm: nt };
}
function faceMat(S) {
  const m = S.P.hull.clone(), pb = { map: null, nrm: null };
  m.emissiveMap = null; m.emissiveIntensity = 0; m.userData.keep = true;
  const prev = S.P.d.prism ? (prismify(m), m.onBeforeCompile) : null;
  m.onBeforeCompile = (sh, rd) => {
    if (prev) prev(sh, rd);
    sh.uniforms.uPebM = { value: pb.map }; sh.uniforms.uPebN = { value: pb.nrm }; sh.uniforms.uPebRep = { value: 4.0 };
    sh.uniforms.uFlesh = { value: new THREE.Color(0x9a3a4c) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMask; attribute float aMouth; varying float vMask; varying float vMouth;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = aMask; vMouth = aMouth;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uPebM, uPebN; uniform float uPebRep; uniform vec3 uFlesh; varying float vMask; varying float vMouth;')
      .replace('#include <map_fragment>', 'float mq = clamp(vMask, 0., 1.) * 3.; vec4 c0 = texture2D(map, vMapUv * 4.), c1 = texture2D(map, vMapUv * 2.6), c2 = texture2D(map, vMapUv * 1.6), c3 = texture2D(map, vMapUv); vec4 sC = mq < 1. ? mix(c0, c1, mq) : mq < 2. ? mix(c1, c2, mq - 1.) : mix(c2, c3, mq - 2.); diffuseColor *= sC; diffuseColor.rgb = mix(diffuseColor.rgb, uFlesh, vMouth);')
      .replace('#include <normal_fragment_maps>', 'vec3 n0 = texture2D(normalMap, vNormalMapUv * 4.).xyz, n1 = texture2D(normalMap, vNormalMapUv * 2.6).xyz, n2 = texture2D(normalMap, vNormalMapUv * 1.6).xyz, n3 = texture2D(normalMap, vNormalMapUv).xyz; vec3 nC = (mq < 1. ? mix(n0, n1, mq) : mq < 2. ? mix(n1, n2, mq - 1.) : mix(n2, n3, mq - 2.)) * 2. - 1.; vec3 mapN = normalize(mix(nC, vec3(0., 0., 1.), vMouth)); mapN.xy *= normalScale; normal = normalize(tbn * mapN);');
  };
  m.customProgramCacheKey = () => 'dragonFace' + (S.P.d.prism ? 'P' : '');
  return m;
}
function dragonHead(S, scale = 1) {
  const boltG = new THREE.Group();
  const h = new THREE.Group(), g = new THREE.Group(), T = S.P.trim, Bo = S.P.bone;
  // face skin: scales from the forehead back; the muzzle and brow get a fine pebbled hide in the same colours (blended per vertex)
  const H = S._faceM || (S._faceM = faceMat(S));
  const mouthM = S._mouthM || (S._mouthM = new THREE.MeshStandardMaterial({ color: 0x9a3a4c, roughness: .38, metalness: 0, emissive: S.P.glow.clone().multiplyScalar(.05), side: THREE.DoubleSide }));
  const tongueM = S._tongueM || (S._tongueM = new THREE.MeshStandardMaterial({ color: 0x6a1c30, roughness: .3, metalness: 0 }));
  // long, boxy eastern-dragon muzzle that stays wide to a blunt nose pad (no lizard taper)
  // profile: low snout, then a steep step UP at the stop where the eyes sit facing forward, then the high skull runs back
  const HS = [{ z: .14, w: .26, ht: .27, hb: .2 }, { z: -.05, w: .31, ht: .34, hb: .21 }, { z: -.28, w: .33, ht: .38, hb: .2 }, { z: -.43, w: .31, ht: .36, hb: .18 }, { z: -.5, w: .26, ht: .25, hb: .16, y: -.01 }, { z: -.58, w: .18, ht: .16, hb: .14, y: -.02 }, { z: -.85, w: .155, ht: .145, hb: .13, y: -.03 }, { z: -1.02, w: .165, ht: .16, hb: .13, y: -.03 }, { z: -1.14, w: .15, ht: .155, hb: .12, y: -.03 }, { z: -1.22, w: .1, ht: .11, hb: .09, y: -.035 }, { z: -1.27, w: .03, ht: .035, hb: .04, y: -.04 }];
  const F = [];
  fPt(F, V(.15, .26, -.47), V(.095, .08, .07), -.065);                 // forward-facing eye socket in the step face
  fSeg(F, V(.04, .34, -.52), V(.2, .41, -.45), .05, .07);              // heavy brow shelf over the eye, low at the inner end → scowl
  fSeg(F, V(.2, .41, -.45), V(.31, .36, -.22), .05, .055);
  fSeg(F, V(.31, .36, -.22), V(.34, .3, -.02), .04, .04);
  fSeg(F, V(.04, .28, -.52), V(.07, .36, -.47), .012, -.018);           // frown furrows between the brows
  fSeg(F, V(.015, .26, -.54), V(.025, .35, -.48), .01, -.014);
  fPt(F, V(.17, .15, -.5), V(.08, .03, .05), .024);                    // under-eye bag
  fSeg(F, V(.26, .03, -.58), V(.34, .0, -.1), .05, .045);              // cheekbone
  fPt(F, V(.3, -.07, -.02), V(.07, .08, .12), .055);                   // jaw muscle
  fPt(F, V(.22, .33, -.12), .06, -.025);                               // temple
  fPt(F, V(.085, .155, -1.1), V(.055, .05, .07), .07);                // big flared nostril mound on top of the nose
  fPt(F, V(.09, .2, -1.135), V(.024, .019, .028), -.05);
  fPt(F, V(.125, .1, -1.1), V(.03, .03, .035), .025);                 // whisker root mound             // nostril pit
  fPt(F, V(0, .14, -1.2), V(.08, .05, .06), .025, false);              // nose pad between the nostrils
  fSeg(F, V(.06, .19, -1.0), V(.1, .2, -.8), .012, -.012);             // nostril crease
  fSeg(F, V(0, .13, -.98), V(0, .14, -.6), .018, -.008, false);        // narrow nasal groove
  fSeg(F, V(.13, .05, -1.05), V(.17, .04, -.55), .02, -.014);         // muzzle groove
  fSeg(F, V(.13, -.06, -1.2), V(.24, -.09, -.22), .026, .022);         // upper lip roll
  fSeg(F, V(.12, -.095, -1.19), V(.23, -.13, -.2), .012, -.022);       // lip line
  fPt(F, V(0, .4, -.22), V(.12, .05, .14), .02, false);                // forehead plate
  fSeg(F, V(0, .41, -.42), V(0, .36, .06), .016, -.012, false);        // forehead crease
  for (let k = 0; k < 3; k++) fSeg(F, V(.25, .26, -.42), V(.31, .2 + k * .045, -.28 + k * .01), .009, -.011); // crow's-feet wrinkles
  for (let k = 0; k < 5; k++) fSeg(F, V(.04, .13, -.98 + k * .07), V(.13, .11, -.96 + k * .07), .009, -.009); // snout ridges across the muzzle
  fPt(F, V(.18, .27, .08), .07, .02);                                  // occipital
  h.add(new THREE.Mesh(sculptGeo(HS, F, { mask: (x, y, z) => smoothstep(-1.25, -.2, z), mouth: { side: -1, zMax: .06 } }), H));
  // palate (inside of the mouth), sitting just under the skull's underside
  const pal = (secs, side, zA, zB, wk, off) => { const sh = new THREE.Shape(), N = 18; for (let i = 0; i <= N; i++) { const z = lp(zA, zB, i / N); sh[i ? 'lineTo' : 'moveTo'](secInterp(secs, z).w * wk, z); } for (let i = N; i >= 0; i--) { const z = lp(zA, zB, i / N); sh.lineTo(-secInterp(secs, z).w * wk, z); }
    const geo = new THREE.ShapeGeometry(sh, 6), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); p.setXYZ(i, x, secSurfY(secs, z, x, side) + off, z); } geo.computeVertexNormals(); return geo; };
  // thick conical fangs: smooth single curve (frame taken from the z axis so it never twists thin at the bend)
  const tooth = (len, r, down) => { const geo = sweep([V(0, .01, 0), V(0, -len * .5, -len * .03), V(0, -len, len * .13)], t => { const k = r * Math.pow(1 - t, .85) * (1 + .18 * Math.sin(Math.min(1, t * 1.6) * Math.PI)) + .0015; return { w: k, h: k * .9, n: 2 }; }, { segs: 16, rad: 10, up: V(0, 0, 1) }); if (!down) geo.scale(1, -1, 1); return geo; };
  for (const s of [1, -1]) for (let k = 0; k < 14; k++) {
    const z = -1.17 + k * .066, fang = k === 3, inc = k < 3, len = fang ? .27 : inc ? .07 : lp(.12, .06, (k - 4) / 9), x = secInterp(HS, z).w * .8 * s;
    const m = new THREE.Mesh(tooth(len, fang ? .044 : inc ? .018 : lp(.026, .017, (k - 4) / 9), true), Bo); m.position.set(x, secSurfY(HS, z, x, -1) + .006, z); m.rotation.z = s * .08; g.add(m);
  }
  // front incisors around the tip of the upper jaw (the side rows stop where the snout curves round)
  for (let k = 0; k < 6; k++) { const a = lp(-1.05, 1.05, k / 5), z = -1.17 - Math.cos(a) * .065, x = Math.sin(a) * Math.min(.11, secInterp(HS, z).w * .85); const m = new THREE.Mesh(tooth(.075 - Math.abs(a) * .01, .017, true), Bo); m.position.set(x, secSurfY(HS, z, x, -1) + .006, z); m.rotation.y = a * .6; g.add(m); }
  // lower jaw on its own hinge, so the mouth can open in combat
  const JS = [{ z: .06, w: .25, ht: .06, hb: .1, y: -.27 }, { z: -.3, w: .21, ht: .05, hb: .095, y: -.26 }, { z: -.65, w: .15, ht: .045, hb: .08, y: -.215 }, { z: -.95, w: .135, ht: .045, hb: .075, y: -.215 }, { z: -1.1, w: .12, ht: .04, hb: .065, y: -.205 }, { z: -1.18, w: .075, ht: .03, hb: .05, y: -.2 }, { z: -1.22, w: .02, ht: .02, hb: .02, y: -.2 }];
  const JF = []; fPt(JF, V(0, -.33, -1.0), V(.06, .03, .06), .02, false); fPt(JF, V(.22, -.25, -.05), V(.06, .07, .1), .035); fSeg(JF, V(.1, -.215, -1.05), V(.22, -.18, -.12), .012, -.013); fSeg(JF, V(.17, -.32, -.9), V(.24, -.31, 0), .022, .016);
  for (let k = 0; k < 5; k++) fPt(JF, V(.09 + k * .025, -.34 + k * .004, -.95 + k * .1), .02, .012);  // chin barbel bumps
  const hinge = V(0, -.14, .06), jp = new THREE.Group(), jg = new THREE.Group(); jp.position.copy(hinge); jg.position.copy(hinge).multiplyScalar(-1); jp.add(jg);
  { const jm0 = new THREE.Mesh(sculptGeo(JS, JF, { nz: 48, nr: 36, mask: (x, y, z) => smoothstep(-1.25, -.2, z), mouth: { side: 1, zMax: .04 } }), H); jm0.position.copy(hinge).multiplyScalar(-1); jp.add(jm0); } // kept out of the bake so its blend mask survives
  // tongue lying on the floor of the mouth: its spine follows the jaw's inner surface, rooted back into the throat
  const tY = z => secSurfY(JS, z, 0, 1) + .006;
  const tPts = [.04, -.15, -.35, -.55, -.72].map(z => V(0, tY(z), z));
  const tg = new THREE.Mesh(sweep(tPts, t => ({ w: lp(.09, .045, t), h: lp(.03, .018, t), n: 2.4, arch: -.008 }), { segs: 20, rad: 12, up: V(0, 1, 0) }), tongueM); jg.add(tg);
  for (const s of [1, -1]) jg.add(new THREE.Mesh(sweep([V(0, tY(-.7), -.7), V(s * .02, tY(-.8) + .004, -.8), V(s * .05, tY(-.9) + .012, -.9)], t => ({ w: lp(.024, .004, t), h: lp(.016, .004, t) }), { segs: 8, rad: 8, up: V(0, 1, 0) }), tongueM));
  for (const s of [1, -1]) for (let k = 0; k < 13; k++) {
    const z = -1.08 + k * .066, fang = k === 2, len = fang ? .21 : lp(.09, .05, k / 12), x = secInterp(JS, z).w * .78 * s;
    const m = new THREE.Mesh(tooth(len, fang ? .038 : lp(.022, .015, k / 12), false), Bo); m.position.set(x, secSurfY(JS, z, x, 1) - .006, z); m.rotation.z = -s * .08; jg.add(m);
  }
  for (let k = 0; k < 5; k++) { const a = lp(-1, 1, k / 4), z = -1.08 - Math.cos(a) * .065, x = Math.sin(a) * Math.min(.1, secInterp(JS, z).w * .85); const m = new THREE.Mesh(tooth(.06, .015, false), Bo); m.position.set(x, secSurfY(JS, z, x, 1) - .006, z); m.rotation.y = a * .6; jg.add(m); }
  const jb = bake(S, jg); jb.position.copy(jg.position); jp.remove(jg); jp.add(jb); h.add(jp);
  const throat = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 10), S._ventM || (S._ventM = glowMat(S.P.glow, .9))); throat.scale.set(1.4, .5, 1); throat.position.set(0, -.19, .02); h.add(throat); S.glows.push(throat);
  let jaw = 0; const jx = new THREE.Group(); jx.position.copy(hinge).multiplyScalar(-1); jp.add(jx); // parts that must move with the lower jaw
  // cheek skin joining skull and lower jaw at the back of the mouth, re-stretched every frame as the jaw opens
  const NZ = 14, NC = 6, cheeks = [];
  for (const s of [1, -1]) {
    const cp = new Float32Array((NZ + 1) * (NC + 1) * 3), cuv = [], cix = [];
    for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NC; j++) { cuv.push(i / NZ * 1.4, j / NC * .25); if (i < NZ && j < NC) { const a = i * (NC + 1) + j, b = a + NC + 1; cix.push(a, b, a + 1, b, b + 1, a + 1); } }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(cuv, 2)); cg.setIndex(cix);
    const cm = new THREE.Mesh(cg, S._cheekM || (S._cheekM = new THREE.MeshStandardMaterial({ color: 0x5a1e2a, roughness: .5, metalness: 0, side: THREE.DoubleSide }))); cm.frustumCulled = false; h.add(cm); cheeks.push({ s, cp, cg });
  }
  const cU = V(), cL = V(), cT = V();
  const updCheeks = () => {
    const ca = Math.cos(-jaw), sa = Math.sin(-jaw);
    for (const { s, cp, cg } of cheeks) {
      for (let i = 0; i <= NZ; i++) {
        const z = lp(-.5, .1, i / NZ), wh = secInterp(HS, z).w * .72, wj = secInterp(JS, z).w * .72;
        cU.set(s * wh, secSurfY(HS, z, wh, -1) + .02, z);
        cL.set(s * wj, secSurfY(JS, z, wj, 1) - .02, z);
        // rotate the jaw-edge point about the hinge, the same way the jaw is rotated
        const dy = cL.y - hinge.y, dz = cL.z - hinge.z; cL.y = hinge.y + dy * ca - dz * sa; cL.z = hinge.z + dy * sa + dz * ca;
        const k = smoothstep(-.48, -.28, z); cL.lerp(cU, 1 - k);
        for (let j = 0; j <= NC; j++) { const t = j / NC, o = (i * (NC + 1) + j) * 3; cT.copy(cU).lerp(cL, t); cT.x -= s * Math.sin(t * Math.PI) * .02 * k; cp[o] = cT.x; cp[o + 1] = cT.y; cp[o + 2] = cT.z; }
      }
      cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
    }
  };
  updCheeks();
  S.extras.push((sh, dt) => { jaw += ((sh.fire ? .55 : 0) - jaw) * (1 - Math.exp(-dt * 3)); jp.rotation.x = -jaw; updCheeks(); });
  // blade scales: brow crest, cheek fan, snout keel
  const blade = (p0, p1, wM, up, mat = T, lift = .02) => g.add(new THREE.Mesh(sweep([p0, p0.clone().lerp(p1, .5).add(V(0, lift, 0)), p1], t => ({ w: wM * Math.pow(Math.sin(Math.PI * Math.min(.98, .08 + t * .92)), .65) + .003, h: .011, n: 2.6, arch: wM * .25 }), { segs: 12, rad: 10, up }), mat));
  const brow = new THREE.CatmullRomCurve3([V(.14, .3, -.5), V(.24, .32, -.32), V(.31, .3, -.12), V(.34, .26, .06)]);
  for (const s of [1, -1]) {
    // eye: socketed shader eyeball with scaled lids
    const gaze = V(s * .3, .06, -.95).normalize(), up = V(0, 1, 0), xa = V().crossVectors(up, gaze).normalize(), ya = V().crossVectors(gaze, xa);
    const eg = new THREE.Group(); eg.position.set(s * .15, .245, -.4); eg.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, gaze)); g.add(eg);
    // eyelid skin: a ring that hugs the eyeball at the almond opening and sinks back into the skull, heavy upper lid
    const NA = 40, NR = 7, lp3 = [], luv = [], lix = [], rimPts = [];
    const alm = a => { const x = -Math.cos(a) * EYE.A; return V(x, eyeY(x, Math.sin(a) > 0, s), 0); };
    for (let i = 0; i <= NA; i++) {
      const a = i / NA * TAU, b = alm(a), top = Math.sin(a) > 0;
      for (let j = 0; j <= NR; j++) {
        const t = j / NR, k = lp(1, 1.7, t), x = b.x * lp(1, 1.15, t), y = b.y * k + (top ? .006 : -.004) * t;
        const rr = EYE_R + .004 + .014 * Math.sin(Math.min(1, t * 1.6) * Math.PI) * (top ? 1.4 : .6), z = Math.sqrt(Math.max(0, rr * rr - x * x - y * y)) - t * t * .1;
        lp3.push(x, y, z); luv.push(i / NA * 2, t * .4); if (i < NA && j < NR) { const p0 = i * (NR + 1) + j, p1 = p0 + NR + 1; lix.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
      }
      if (i < NA) { const z0 = Math.sqrt(Math.max(0, (EYE_R + .006) ** 2 - b.x * b.x - b.y * b.y)); rimPts.push(V(b.x, b.y, z0)); }
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp3, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2)); lg.setIndex(lix); lg.computeVertexNormals();
    eg.add(new THREE.Mesh(lg, H));
    eg.add(new THREE.Mesh(sweep(rimPts, () => ({ w: .007, h: .008 }), { segs: 60, rad: 8, closed: true, up: V(0, 0, 1) }), T));
    // upper-lid crease fold
    const crease = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (.08 + .84 * i / 12), b = alm(a); const x = b.x * 1.08, y = b.y * 1.35 + .006; crease.push(V(x, y, Math.sqrt(Math.max(0, (EYE_R + .016) ** 2 - x * x - y * y)))); }
    eg.add(new THREE.Mesh(sweep(crease, t => ({ w: .006 * Math.sin(t * Math.PI) + .001, h: .006 * Math.sin(t * Math.PI) + .001 }), { segs: 24, rad: 6, up: V(0, 0, 1) }), H));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 32, 20), dragonEyeMat(S._fireEye || S.P.glow, s)); eye.position.copy(eg.position); eye.quaternion.copy(eg.quaternion); h.add(eye);
    // nostril openings
    // solid horns: ridged, swept back, with two tines; dark root fading to pale tip
    const P = [V(s * .16, .29, -.14), V(s * .25, .43, .04), V(s * .32, .56, .32), V(s * .36, .66, .62), V(s * .36, .74, .95)];
    const hp = new THREE.Group(); h.add(hp);
    const main = zig(V(s * .17, .36, -.18), V(s * .4, 1.12, .52), 6, .07, s, s);
    if (S._ice) {   /* ice: a cluster of hexagonal crystals growing up and back */
      const gs = [iceCrystal(V(s * .17, .34, -.2), V(s * .42, 1.15, .55), .075), iceCrystal(V(s * .25, .55, -.02), V(s * .6, .95, .2), .045), iceCrystal(V(s * .3, .75, .2), V(s * .52, 1.1, .5), .035),
        iceCrystal(V(s * .2, .45, -.1), V(s * .12, .9, .25), .04), iceCrystal(V(s * .33, .9, .32), V(s * .3, 1.18, .72), .03)];
      hp.add(new THREE.Mesh(mergeGeometries(gs.map(g => g.toNonIndexed())), iceCrystalMat(S)));
    } else if (S._fire) {   /* fire: long swept-back obsidian horns split by glowing lava veins (flames rise off them) */
      const c = new THREE.CatmullRomCurve3([V(s * .17, .34, -.2), V(s * .3, .62, -.05), V(s * .4, .88, .25), V(s * .43, 1.02, .62), V(s * .4, 1.08, .95)]).getPoints(14);
      const hm = hornMesh(S, c, .06, 30); hm.material = obsidianLavaMat(S); hp.add(hm);
      const t1 = new THREE.CatmullRomCurve3([c[5], c[5].clone().add(V(s * .14, .12, .02)), c[5].clone().add(V(s * .22, .2, .14))]).getPoints(8), m1 = hornMesh(S, t1, .028, 14); m1.material = obsidianLavaMat(S); hp.add(m1);
    } else {
    boltHorn(S, hp, main, .05, .008);
    boltHorn(S, hp, zig(main[2], main[2].clone().add(V(s * .22, .2, .05)), 3, .04, s, 3), .028, .005);
    boltHorn(S, hp, zig(main[4], main[4].clone().add(V(s * .14, .24, .12)), 3, .035, s, 7), .022, .004);
    boltHorn(S, hp, zig(main[3], main[3].clone().add(V(-s * .06, .2, .1)), 2, .03, s, 5), .018, .004); }
    S.extras.push((sh, dt, t) => { const f = .85 + .15 * Math.sin(t * 7 + s) + (Math.random() < dt * 3 ? .4 : 0); S._boltHalo.opacity = .2 * f + (sh.fire ? .12 : 0); S._boltBody.opacity = .75 + .15 * f; });
    for (let k = 0; k < 3; k++) boltHorn(S, boltG, zig(V(s * (.3 + k * .02), -.06 - k * .06, -.05 + k * .05), V(s * (.46 + k * .02), -.13 - k * .07, .24 + k * .06), 3, .03, s, k * 2.3), .022 - k * .003, .004);
  }
  // shaggy mane framing the face: tapered locks sweeping back from cheeks, temples and under the jaw
  const maneM = S._maneM || (S._maneM = (() => { const c = new THREE.Color(S.P.d.accent).lerp(new THREE.Color(1, .95, .8), .45); return new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .05, side: THREE.DoubleSide, emissive: S.P.glow.clone().multiplyScalar(.04) }); })());
  const lock = (p0, d, L, w, curl, tg = g) => { const p1 = p0.clone().addScaledVector(d, L * .5).add(V(0, curl * .5, 0)), p2 = p0.clone().addScaledVector(d, L).add(V(0, curl, 0)); tg.add(new THREE.Mesh(sweep([p0, p1, p2], t => ({ w: lp(w, .002, Math.pow(t, .7)), h: lp(w * .35, .002, t), n: 2, tw: t * .6 }), { segs: 10, rad: 6, up: V(0, 1, 0) }), maneM)); };
  const jm = new THREE.Group();
  for (const s of [1, -1]) {
    for (let k = 0; k < 6; k++) { const a = k / 5, p0 = V(s * .3 * (1 + .15 * Math.sin(a * Math.PI)), lp(.2, -.26, a), lp(-.1, .02, Math.sin(a * Math.PI)) + .02), d = V(s * (.75 + .2 * Math.sin(k * 2.1)), lp(.35, -.55, a), .7).normalize(), Ln = .42 + .14 * Math.sin(a * Math.PI); boltHorn(S, boltG, zig(p0, p0.clone().addScaledVector(d, Ln), 4, .035, s, k * 1.3 + s), .026, .004); }
    for (let k = 0; k < 4; k++) { const a = k / 3, p0 = V(s * lp(.24, .34, a), lp(.32, .24, a), lp(-.28, .02, a)); boltHorn(S, boltG, zig(p0, p0.clone().addScaledVector(V(s * .5, .55, .75).normalize(), .3 + .07 * k), 3, .03, s, k * 2.7), .022, .004); }
  }
  const jmb = bake(S, jm); jx.add(jmb);
  h.add(bake(S, g));
  for (const s of [1, -1]) {
    // electric whiskers trailing from the upper lip
    { const wz = -1.1, wx = s * .125, wy = secSurfY(HS, wz, wx, 1) - .012; liveWhisker(S, h, V(wx, wy, wz), s, 3.8); }
  }
  // lightning-bolt neck ruff
  for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + .3, d = V(Math.cos(a) * .9, Math.sin(a) * .9 + .2, 1).normalize(); const b0 = V(Math.cos(a) * .25, Math.sin(a) * .22, .1); boltHorn(S, boltG, zig(b0, b0.clone().addScaledVector(d, .55), 4, .045, 1, k * 1.7), .03, .006); }
  h.add(bake(S, boltG));
  h.scale.setScalar(scale);
  S.gun(tipAt(h, 0, -.16, -1.2), { ...bolt(S, { rate: .1, speed: 70, r: .045, len: 1.3 }), color: tracerC(S) });
  return h;
}
function dragonMane(S, sp, n, s0, s1, size = 1) {
  const tips = [];
  for (let i = 0; i < n; i++) {
    const s = lp(s0, s1, i / (n - 1)), r = sp.r(s), k = size * lp(1, .45, (s - s0) / (s1 - s0));
    const fin = new THREE.Group();
    for (const lean of [-.35, 0, .35]) { if (lean && i % 2) continue; const L = (lean ? .38 : .55) * k; elecFin(S, fin, [V(0, 0, 0), V(lean * L * .4, L * .55, L * .45), V(lean * L * .7, L * .85, L * 1.05)], .07 * k, .016, S.P.trim); }
    const e = emitter(fin, 0, .85 * .55 * k, 1.05 * .55 * k); tips.push(e);
    sp.attach(fin, s, V(0, r * .9, 0));
  }
  const pr = []; for (let i = 2; i < tips.length; i += 3) pr.push([tips[i - 2], tips[i]]); arcs(S, pr, S.P.glow);
  S.sparkEm.push(...tips);
}
function dragonBelly(S, sp, n, s0, s1) {
  for (let i = 0; i < n; i++) { const s = lp(s0, s1, i / (n - 1)), r = sp.r(s); const p = new THREE.Mesh(sweep([V(-r * .85, -r * .62, 0), V(0, -r * .86, .03), V(r * .85, -r * .62, 0)], t => ({ w: r * .28, h: .018, arch: .01 }), { segs: 10, rad: 10, up: V(0, 1, 0) }), S.P.bone); sp.attach(p, s, V(0, 0, 0)); }
}
function dragonTailFan(S, sp, n = 5, size = 1) {
  const fan = new THREE.Group(), tips = [];
  for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * .32, d = V(Math.sin(a), .25 + Math.cos(a) * .15, 1).normalize(), L = (k === (n - 1) / 2 ? 1.2 : .9) * size; const p = [V(0, 0, 0), d.clone().multiplyScalar(L * .5).add(V(0, .05, 0)), d.clone().multiplyScalar(L)]; elecFin(S, fan, p, .12 * size, .025, S.P.trim); tips.push(emitter(fan, p[2].x, p[2].y, p[2].z)); }
  sp.attach(fan, 1, V(0, 0, 0));
  const pr = []; for (let k = 1; k < tips.length; k++) pr.push([tips[k - 1], tips[k]]); arcs(S, pr, S.P.glow); S.sparkEm.push(...tips);
}
/* four clawed legs: what makes it a dragon instead of a serpent */
function dragonLeg(S, sp, s, side, size, hind, phase, pearl = true) {
  let RG; const r = sp.r(s), outer = new THREE.Group(), piv = new THREE.Group(), g = new THREE.Group(); outer.add(piv);
  const H = S.P.hull, Bo = S.P.bone, T = S.P.trim, k = size;
  const E = V(side * .34, -.2, hind ? .14 : -.04).multiplyScalar(k), W = V(side * .4, -.52, hind ? -.02 : -.26).multiplyScalar(k);
  // muscled upper limb and forearm
  const limbW = t => t < .5 ? lp(.13, .078, t / .5) + .012 * Math.sin(t / .5 * Math.PI) : lp(.078, .05, (t - .5) / .5) + .008 * Math.sin((t - .5) / .5 * Math.PI);
  g.add(new THREE.Mesh(sweep([V(0, .04, 0), V(side * .17, -.06, hind ? .1 : 0).multiplyScalar(k), E, E.clone().lerp(W, .5).add(V(side * .03 * k, 0, 0)), W], t => ({ w: limbW(t) * k, h: limbW(t) * 1.1 * k, n: 2.2 }), { segs: 28, rad: 12 }), H));
  const PR = .11 * size, PC = W.clone().add(V(0, -PR * 1.12, -.02 * size));
  if (!pearl) {
    // open hand: palm and four hooked talons
    const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(.07 * k, 2), H); palm.scale.set(1.15, .7, 1.25); palm.position.copy(W); g.add(palm);
    for (let fi = 0; fi < 4; fi++) {
      const a = (fi - 1.5) * .42, thumb = fi === 0, dir = thumb ? V(-side * .4, -.1, .9).normalize() : V(Math.sin(a) * side, -.25, -Math.cos(a)).normalize();
      const L = (thumb ? .1 : .16 - Math.abs(fi - 1.8) * .02) * k, K = W.clone().addScaledVector(dir, L * .55);
      g.add(new THREE.Mesh(sweep([W, K, W.clone().addScaledVector(dir, L)], t => ({ w: .026 * k, h: .024 * k }), { segs: 6, rad: 8 }), H));
      const c0 = W.clone().addScaledVector(dir, L), c1 = c0.clone().addScaledVector(dir, .06 * k).add(V(0, -.02 * k, 0)), c2 = c1.clone().addScaledVector(dir, .02 * k).add(V(0, -.07 * k, 0));
      g.add(new THREE.Mesh(sweep([c0, c1, c2], t => ({ w: lp(.024, .003, Math.pow(t, .8)) * k, h: lp(.03, .003, Math.pow(t, .8)) * k, n: 2 }), { segs: 10, rad: 8, up: V(side, 0, 0) }), Bo));
    }
  } else {
  // palm cupped over the 여의주, with fingers and talons wrapped around it so the pearl is gripped, not hung
  RG = PR * 1.12;
  const palm = new THREE.Mesh(new THREE.IcosahedronGeometry(.072 * k, 2), H); palm.scale.set(1.2, .55, 1.25); palm.position.copy(W).add(V(0, -.01 * k, 0)); g.add(palm);
  const onBall = (th, el, rr = RG) => { const c = Math.cos(el); return PC.clone().add(V(Math.sin(th) * side * c * rr, Math.sin(el) * rr, -Math.cos(th) * c * rr)); };
  const D = Math.PI / 180;
  for (let fi = 0; fi < 4; fi++) {
    const thumb = fi === 0, th = thumb ? Math.PI - .5 : (fi - 2) * .72;
    const els = thumb ? [55, 30, 5] : [72, 48, 22];
    const skin = els.map(e => onBall(th, e * D));
    g.add(new THREE.Mesh(sweep([W.clone().lerp(skin[0], .4), ...skin], t => ({ w: .025 * k, h: .023 * k }), { segs: 12, rad: 8, up: (t, P) => V().subVectors(P, PC).normalize() }), H));
    const cl = (thumb ? [5, -15, -32] : [22, -5, -30]).map((e, i) => onBall(th, e * D, RG * (1 - i * .05)));
    g.add(new THREE.Mesh(sweep(cl, t => ({ w: lp(.022, .003, Math.pow(t, .8)) * k, h: lp(.027, .003, Math.pow(t, .8)) * k, n: 2 }), { segs: 10, rad: 8, up: (t, P) => V().subVectors(P, PC).normalize() }), Bo));
  }
  }
  piv.add(bake(S, g));
  // each claw clutches a 여의주
  if (pearl) dragonPearl(S, piv, PC, PR, (hind ? 2 : 0) + (side > 0 ? 1 : 0));
  // electric feather tufts at the elbow and wrist, trailing back like the thunderbird plumage
  sp.attach(outer, s, V(side * r * .72, -r * .42, 0));
  let ax = 0, az = 0;
  S.extras.push((sh, dt, t) => {
    const mv = sh.mode === sh.cfg.moving, kk = 1 - Math.exp(-dt * 2.2);
    // idle: still grasp pose grasp · moving: tucked back, streamlined · combat: claws thrust forward
    const tx = sh.fire && !hind ? .6 : mv ? (hind ? -1.1 : -.85) : (hind ? -.1 : .12);
    const tz = mv ? -side * .3 : side * (sh.fire && !hind ? .2 : .1);
    ax += (tx - ax) * kk; az += (tz - az) * kk; piv.rotation.set(ax, 0, az);
  });
}
/* backward-hooked bone spines along the dorsal ridge, between the electric mane */
function dragonSpines(S, sp, n, s0, s1, size = 1) {
  const geo = sweep([V(0, -.02, -.06), V(0, .14, .02), V(0, .24, .16)], t => ({ w: lp(.035, .003, t), h: lp(.08, .004, Math.pow(t, .7)), n: 2 }), { segs: 10, rad: 8, up: V(1, 0, 0) });
  for (let i = 0; i < n; i++) { const s = lp(s0, s1, (i + .5) / n), r = sp.r(s), m = new THREE.Mesh(geo, S.P.bone); m.scale.setScalar(size * lp(1.25, .5, i / n) * (r / .3 * .6 + .4)); sp.attach(m, s, V(0, r * 1.12, 0)); }
}
/* lightning tail: thin, irregular forking bolts streaming from the tail tip; three variants flicker like a live discharge */
/* 여의주: glowing pearl clutched in a claw, lightning crackling out of it in random directions */
function dragonPearl(S, parent, pos, rad, seed) {
  const g = new THREE.Group(); g.position.copy(pos); parent.add(g);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(rad * .78, 3), S._pearlCore || (S._pearlCore = plasmaMat(S.P.glow))); g.add(core);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 18), S._pearlShell || (S._pearlShell = new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1).lerp(S.P.glow.clone().multiplyScalar(.4), .3), metalness: .2, roughness: .05, transparent: true, opacity: .32, depthWrite: false }))));
  // soft light bloom: camera-facing radial falloff (not a sphere), flaring when a bolt fires
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: S.P.glow.clone().multiplyScalar(.55), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo.scale.setScalar(rad * 6); halo.renderOrder = 8; g.add(halo);
  const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: new THREE.Color(1, 1, 1), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); halo2.scale.setScalar(rad * 2.6); halo2.renderOrder = 9; g.add(halo2); let flare = 0;
  const hr = (a, b) => { const v = Math.sin(a * 63.71 + b * 17.29 + seed * 5.3) * 43758.5; return v - Math.floor(v); };
  const path = (a, b, n, amp, sd) => { const out = [a.clone()], d = V().subVectors(b, a); for (let i = 1; i < n; i++) out.push(a.clone().addScaledVector(d, i / n).add(V((hr(i, sd) - .5) * 2 * amp, (hr(i, sd + 1) - .5) * 2 * amp, (hr(i, sd + 2) - .5) * 2 * amp))); out.push(b.clone()); return out; };
  const vars = [];
  for (let v = 0; v < 4; v++) {
    const vg = new THREE.Group();
    for (let b = 0; b < 4; b++) {
      const sd = v * 31 + b * 7, dir = V(hr(b, sd) - .5, hr(b, sd + 3) - .5, hr(b, sd + 4) - .5).normalize(), L = rad * (2.2 + hr(b, sd + 5) * 2.2), p0 = dir.clone().multiplyScalar(rad * .9);
      const main = path(p0, p0.clone().addScaledVector(dir, L), 5, rad * .45, sd);
      boltHorn(S, vg, main, rad * .16, rad * .02);
      if (hr(b, sd + 6) > .4) { const k = 2 + Math.floor(hr(b, sd + 8) * 2), d2 = dir.clone().add(V(hr(b, sd + 9) - .5, hr(b, sd + 10) - .5, hr(b, sd + 11) - .5)).normalize(); boltHorn(S, vg, path(main[k], main[k].clone().addScaledVector(d2, L * .45), 3, rad * .3, sd + 50), rad * .09, rad * .015); }
    }
    const bg = bake(S, vg); bg.visible = false; g.add(bg); vars.push(bg);
  }
  let cur = -1, tk = hr(1, 2) * .3;
  S.extras.push((sh, dt, t) => {
    core.rotation.y = t * 1.3 + seed; flare = Math.max(0, flare - dt * 7); const fl = .45 + .08 * Math.sin(t * 9 + seed * 3) + flare * .7; halo.material.opacity = fl; halo2.material.opacity = .35 + flare * .5; halo.scale.setScalar(rad * (5.5 + flare * 2.5));
    tk -= dt; if (tk < 0) { if (cur >= 0) vars[cur].visible = false; cur = Math.random() < (sh.fire ? .9 : .7) ? Math.floor(Math.random() * 4) : -1; if (cur >= 0) { vars[cur].visible = true; flare = 1; } tk = .05 + Math.random() * (sh.fire ? .1 : .22); }
  });
  return g;
}
/* lightning crawling over the whole body: a few slots that pop up at random places along the skin, flicker, and vanish */
function dragonSkinBolts(S, sp, slots = 6) { if (NOFX) return;
  const hr = (a, b) => { const v = Math.sin(a * 41.3 + b * 97.1) * 43758.5; return v - Math.floor(v); };
  const path = (n, amp, sd) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, e = i === 0 || i === n ? 0 : 1; out.push(V((hr(i, sd) - .5) * 2 * amp * e, (hr(i, sd + 1) - .3) * amp * .5 * e, lp(-.5, .5, t + (hr(i, sd + 2) - .5) * .3 / n * e))); } return out; };
  const templates = [];
  for (let v = 0; v < 4; v++) {
    const g = new THREE.Group(), sd = v * 17 + 3, main = path(7, .13, sd);
    boltHorn(S, g, main, .022, .005);
    const k = 2 + v % 3, d = V((hr(v, 9) - .5) * 2, .1, hr(v, 8) * .6 + .2).normalize();
    boltHorn(S, g, [main[k], main[k].clone().addScaledVector(d, .14).add(V((hr(v, 4) - .5) * .06, .01, 0)), main[k].clone().addScaledVector(d, .3)], .013, .003);
    templates.push(bake(S, g));
  }
  for (let i = 0; i < slots; i++) {
    const holder = new THREE.Group(), vars = templates.map(t => { const c = t.clone(); c.visible = false; holder.add(c); return c; });
    const lq = new THREE.Quaternion(); sp.attach(holder, .5, V(0, 0, 0), lq); const e = holder.userData.att;
    let wait = Math.random() * .8, life = 0, flick = 0, cur = 0;
    S.extras.push((sh, dt) => {
      if (life > 0) {
        life -= dt; flick -= dt;
        if (flick < 0) { vars[cur].visible = false; cur = Math.floor(Math.random() * 4); vars[cur].visible = Math.random() < .8; flick = .03 + Math.random() * .06; }
        if (life <= 0) { vars.forEach(v => v.visible = false); wait = (sh.fire ? .05 : .15) + Math.random() * (sh.fire ? .35 : .8); }
        return;
      }
      wait -= dt; if (wait > 0) return;
      // new strike: random spot along the body, mostly on the back and flanks
      const s = .04 + Math.random() * .9, r = sp.r(s), a = Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.5, len = r * (2.2 + Math.random() * 2.2) / .3 * .3;
      e.s = s; e.off.set(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.0, 0); lq.setFromAxisAngle(V(0, 0, 1), a - Math.PI / 2);
      holder.scale.set(len * .9, len * .9, len); life = .18 + Math.random() * .3; flick = 0;
    });
  }
}
/* lightning around the dragon: long forking bolts that leap off the body into the surrounding air, with a flash at the root */
function dragonAirBolts(S, sp, slots = 6) { if (NOFX) return;
  const hr = (a, b) => { const v = Math.sin(a * 23.9 + b * 71.7) * 43758.5; return v - Math.floor(v); };
  const path = (a, b, n, amp, sd) => { const out = [a.clone()], d = V().subVectors(b, a); for (let i = 1; i < n; i++) out.push(a.clone().addScaledVector(d, i / n + (hr(i, sd + 7) - .5) * .4 / n).add(V((hr(i, sd) - .5) * 2 * amp, (hr(i, sd + 1) - .5) * amp * .6, (hr(i, sd + 2) - .5) * 2 * amp))); out.push(b.clone()); return out; };
  const templates = [];
  for (let v = 0; v < 5; v++) {
    const g = new THREE.Group(), sd = v * 29 + 5, main = path(V(0, 0, 0), V((hr(v, 1) - .5) * .5, 1, (hr(v, 2) - .5) * .5), 9, .1, sd);
    boltHorn(S, g, main, .024, .004);
    for (let b = 0; b < 2; b++) { const k = 2 + Math.floor(hr(b, sd + 3) * 6), d = V((hr(b, sd + 4) - .5) * 2, .6, (hr(b, sd + 5) - .5) * 2).normalize(), L = .2 + hr(b, sd + 6) * .3; boltHorn(S, g, path(main[k], main[k].clone().addScaledVector(d, L), 4, .05, sd + b * 13), .013, .003); }
    templates.push(bake(S, g));
  }
  for (let i = 0; i < slots; i++) {
    const holder = new THREE.Group(), vars = templates.map(t => { const c = t.clone(); c.visible = false; holder.add(c); return c; });
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: S.P.glow.clone().multiplyScalar(.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flash.scale.setScalar(.5); holder.add(flash);
    const lq = new THREE.Quaternion(), q2 = new THREE.Quaternion(); sp.attach(holder, .5, V(0, 0, 0), lq); const e = holder.userData.att;
    let wait = .3 + Math.random() * 1.2, life = 0, flick = 0, cur = 0;
    S.extras.push((sh, dt) => {
      if (life > 0) {
        life -= dt; flick -= dt; flash.material.opacity = Math.max(0, flash.material.opacity - dt * 4);
        if (flick < 0) { vars[cur].visible = false; cur = Math.floor(Math.random() * 5); vars[cur].visible = Math.random() < .85; flick = .04 + Math.random() * .07; if (vars[cur].visible) flash.material.opacity = .5; }
        if (life <= 0) { vars.forEach(v => v.visible = false); flash.material.opacity = 0; wait = (sh.fire ? .2 : .5) + Math.random() * (sh.fire ? .8 : 2); }
        return;
      }
      wait -= dt; if (wait > 0) return;
      const s = .05 + Math.random() * .85, r = sp.r(s), a = Math.random() * TAU, tilt = (Math.random() - .5) * 1.4, len = .7 + Math.random() * 1.0;
      e.s = s; e.off.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      lq.setFromAxisAngle(V(0, 0, 1), a - Math.PI / 2); q2.setFromAxisAngle(V(1, 0, 0), tilt); lq.multiply(q2);
      holder.scale.setScalar(len); flash.scale.setScalar(.45 / len * 1.6); life = .2 + Math.random() * .35; flick = 0;
    });
  }
}
/* thunderbird-style crackling arcs (thin volumetric bolts, re-drawn every strike): some crawl between two points on the skin, some leap off into the air */
/* dragon storm (style B): the thunderbird-B treatment on the serpent — many very irregular bolts crawling over the scales,
   jumping between distant parts of the body and leaping into the air all around; every strike flashes the body and soft halos along the spine */
function dragonStorm(S, sp, n = 18) { if (NOFX) return;
  const pairs = [];
  for (let i = 0; i < n; i++) { const a = new THREE.Object3D(), b = new THREE.Object3D(); sp.attach(a, .5); sp.attach(b, .5); pairs.push([a, b]); }
  const place = (o, s, ang, lift) => { const e = o.userData.att, r = sp.r(s); e.s = Math.min(.99, Math.max(.01, s)); e.off.set(Math.cos(ang) * r * (1.05 + lift), Math.sin(ang) * r * (1.05 + lift), 0); };
  let flash = 0;
  arcs(S, pairs, S.P.glow, { force: true, w: .42, fl: .6, p: .32, pf: .55, onStrike: i => {
    const [a, b] = pairs[i], s = .02 + Math.random() * .95, ang = Math.random() * TAU, r = Math.random(); flash = Math.min(1.4, flash + .3 + Math.random() * .35);
    place(a, s, ang, 0);
    if (r < .35) place(b, s + (Math.random() - .5) * .14, ang + (Math.random() - .5) * 2.4, 0);                 /* crawl over the scales */
    else if (r < .6) place(b, Math.random(), Math.random() * TAU, 0);                                         /* jump to another part of the body */
    else place(b, s + (Math.random() - .5) * .2, ang + (Math.random() - .5) * 1.4, 3 + Math.random() * 7);   /* leap out into the air */
  } });
  const HS = [.15, .25, .35, .45, .55, .65, .75, .85, .95], halos = HS.map(s => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: S.P.glow.clone().multiplyScalar(.45), transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.attach(h, s); return h; });
  const mats = []; S.body.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.emissive) mats.push(o.material); });
  S.extras.push((sh, dt, t) => { flash *= Math.exp(-dt * 7);
    for (const m of mats) { const u = m.userData; if (u.dsSet === m.emissiveIntensity) m.emissiveIntensity -= u.dsAdd; const k = flash * .9; m.emissiveIntensity += k; u.dsAdd = k; u.dsSet = m.emissiveIntensity; }
    halos.forEach((h, i) => { if (S.P.d.prism) h.material.color.setHSL((t * .15 + i * .12) % 1, 1, .5).multiplyScalar(1.4);   /* prism: the body glow runs through the rainbow along the dragon */
      h.material.opacity = (.22 + .06 * Math.sin(t * 3 + i * 1.3) + flash * .4) * (i ? .6 : 1);   /* body halos overlap, so each is a bit fainter */ h.scale.setScalar(sp.r(HS[i]) * 9 + flash * 1.5); }); });   /* glow all along the body, like the face */
}
function dragonBodyArcs(S, sp, n = 10) { if (NOFX) return;
  const pairs = [];
  for (let i = 0; i < n; i++) { const a = new THREE.Object3D(), b = new THREE.Object3D(); sp.attach(a, .5); sp.attach(b, .5); pairs.push([a, b]); }
  const place = (o, s, ang, lift) => { const e = o.userData.att, r = sp.r(s); e.s = Math.min(.99, Math.max(.01, s)); e.off.set(Math.cos(ang) * r * (1.05 + lift), Math.sin(ang) * r * (1.05 + lift), 0); };
  arcs(S, pairs, S.P.glow, { force: true, w: .45, fl: .55, p: .42, pf: .7, onStrike: i => {
    const [a, b] = pairs[i], s = .03 + Math.random() * .93, ang = Math.random() * TAU;
    if (Math.random() < .62) { const ds = (.03 + Math.random() * .1) * (Math.random() < .5 ? -1 : 1); place(a, s, ang, 0); place(b, s + ds, ang + (Math.random() - .5) * 2.2, 0); }   // crawling over the skin
    else { place(a, s, ang, 0); place(b, s + (Math.random() - .5) * .12, ang + (Math.random() - .5) * .9, 2 + Math.random() * 4); }                                          // leaping into the air
  } });
}
/* ---- storm clouds: layered billowing puffs (fbm-noise textures, several tones), lit from inside by lightning ---- */
const CLOUD_TEX = (() => {
  // dense cauliflower puffs: overlapping round lobes, each lit from above with a shadowed underside, edges eroded by noise
  const out = [];
  const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  const noise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s) => { let t = 0, a = .5, f = 1; for (let o = 0; o < 4; o++) { t += a * noise(x * f, y * f, s + o * 7); f *= 2.1; a *= .5; } return t; };
  for (let k = 0; k < 4; k++) {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N * 2 - 1, v = j / N * 2 - 1, r = Math.hypot(u * 1.05, v * 1.15);
      const n = fbm(i / N * 4 + k * 3.1, j / N * 4 - k * 1.7, k), n2 = fbm(i / N * 9 + 5, j / N * 9 + k, k + 11);
      let a = (n * 1.35 - .25) - Math.pow(r, 1.6) * 1.05 + (k % 2 ? .05 : 0); a = Math.max(0, Math.min(1, a * 1.9));
      const lum = Math.max(0, Math.min(1, .38 + .5 * (n - .45) - v * .32 + (n2 - .5) * .25));
      const o = (j * N + i) * 4; d[o] = d[o + 1] = d[o + 2] = lum * 255; d[o + 3] = a * 255;
    }
    x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; out.push(t);
  }
  return out;
})();
function dragonStormClouds(S, sp, o = {}) { if (NOFX) return;   /* o.spread / o.size scale the banks for wider ships (thunderbird) */
  const K1 = o.spread || 1, K2 = o.size || 1;
  const tones = o.tones || [new THREE.Color(.13, .14, .18), new THREE.Color(.2, .23, .33), new THREE.Color(.25, .2, .31), new THREE.Color(.36, .38, .46), new THREE.Color(.1, .1, .13)];
  const glow = S.P.glow.clone(); glow.multiplyScalar(1 / Math.max(glow.r, glow.g, glow.b));
  // banks sit in the ship's space, NOT on the body: the dragon swims through them; they drift back past it (faster when moving) and wrap around
  const banks = [], Z0 = o.z0 ?? -4, Z1 = o.z1 ?? 8, hb = (a, b) => { const v = Math.sin(a * 91.3 + b * 47.9) * 43758.5; return v - Math.floor(v); };
  // the dragon flies THROUGH the storm: banks scattered around it drift back past it (fast when moving) and wrap round with a fade
  const BANKS = []; for (let i = 0; i < 32; i++) { const ang = -Math.PI / 2 + (hb(i, 1) - .5) * 3.4, dist = .75 + hb(i, 2) * .7; BANKS.push([Math.cos(ang) * dist * 1.2 * K1, Math.sin(ang) * dist * .8 * K1 - .2, lp(-1.3 * K1, 1.3 * K1, (i + hb(i, 3) * .6) / 32), (.42 + hb(i, 4) * .3) * K2, 3 + Math.floor(hb(i, 5) * 2)]);   /* many small banks -> an even stream, not big lumps */ }   /* home: gathered round the body */
  BANKS.forEach(([bx, by, bz, size, n], bi) => {
    if (bi % 3 === 2) { bx = (hb(bi, 8) - .5) * 1.4 * K1; by = -.55 * K1 - hb(bi, 9) * .3 * K1; }   /* centre banks: fill the middle, sitting just under the body */
    else if (o.side) { const sg = bi % 2 ? 1 : -1; bx = sg * Math.max(Math.abs(bx), o.side + Math.abs(bx) * .4); }   /* keep the banks out at the sides, clear of the view behind */
    const g = new THREE.Group(); g.position.set(bx, by, bz); S.root.add(g);
    const puffs = [];
    for (let i = 0; i < n; i++) {
      const h = (Math.sin(bi * 12.3 + i * 7.7) * .5 + .5), up = (i / (n - 1)) * 2 - 1;
      const tone = tones[(bi + i) % 3].clone().lerp(up > .3 ? tones[3] : tones[4], Math.abs(up) * .55);
      const m = new THREE.SpriteMaterial({ map: CLOUD_TEX[(bi + i) % 4], color: tone, transparent: true, opacity: .82 + h * .15, depthWrite: false, rotation: h * TAU });
      const p = new THREE.Sprite(m), sc = size * (.55 + h * .7) * 1.5;
      p.position.set((h - .5) * size * 1.6, up * size * .35 + (h - .5) * .15, (Math.cos(i * 2.4 + bi) * .5) * size * 1.5); p.scale.setScalar(sc); p.renderOrder = 1;
      g.add(p); puffs.push({ p, m, base: tone, sc, rs: (h - .5) * .12, ph: i + bi, up });
    }
    // inner light that blooms when lightning flashes inside the cloud
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: glow.clone().multiplyScalar(.9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); core.scale.setScalar(size * 3.4 * (o.coreK || 1)); core.renderOrder = 2; g.add(core);
    banks.push({ g, puffs, core, fl: 0, nx: Math.random() * 2, size, op: puffs.map(q => q.m.opacity), v: 0, life: 3 + Math.random() * 3, age: 0 }); { const L = banks[banks.length - 1]; L.age = Math.random() * L.life; }
  });
  const tmp = new THREE.Color(); let drift = .15;
  S.extras.push((sh, dt, t) => {
    const mv = sh.mode === sh.cfg.moving; drift += ((mv ? 7 : .12) - drift) * (1 - Math.exp(-dt * (mv ? 4 : 2)));
    const RX = o.side ? o.side * 1.05 : 1.8 * K1;
    for (const b of banks) {
      /* like the fire embers: every bank is a particle with its own life, born somewhere round the body.
         the wind pushes them back while moving; once stopped, banks already moving keep their speed and fade out,
         while new ones are born round the body with no speed - so the storm just carries on naturally */
      const z = b.g.position;
      b.v = Math.max(b.v * Math.exp(-dt * .15), drift); z.z += b.v * dt; b.age += dt;
      if (b.age >= b.life) {
        const an = Math.random() * TAU, r = .3 + Math.sqrt(Math.random()) * .8;
        z.set(Math.cos(an) * r * RX, -.2 * K1 - Math.random() * .6 * K1, Math.sin(an) * r * 1.4 * K1 - (mv ? .6 * K1 : 0));
        b.v = drift; b.age = 0; b.life = mv ? 1.4 + Math.random() * 1.3 : 2.8 + Math.random() * 3;
      }
      const u = b.age / b.life, edge = Math.min(1, b.age / .35) * Math.min(1, (1 - u) / .4);
      b.puffs.forEach((q, i) => q.m.opacity = b.op[i] * Math.max(0, edge));
      b.nx -= dt; if (b.nx < 0) { b.fl = 1; b.nx = (sh.fire ? .25 : .6) + Math.random() * (sh.fire ? .9 : 2.4); if (Math.random() < .4) b.nx = .06; } // occasional double flash
      b.fl = Math.max(0, b.fl - dt * 4.5); const f = b.fl * (.7 + .3 * Math.random());
      b.core.material.opacity = f * .85 * (o.coreK || 1);
      for (const q of b.puffs) {
        q.m.rotation += q.rs * dt; const br = 1 + .06 * Math.sin(t * .5 + q.ph);
        q.p.scale.set(q.sc * br, q.sc * br, 1); q.p.position.x += Math.sin(t * (.6 + drift) + q.ph) * .0015; q.p.position.y += Math.cos(t * (.5 + drift) + q.ph * 1.7) * .0012;
        // lit from inside: undersides glow in the lightning colour, tops catch a paler flash
        tmp.copy(q.base).lerp(glow, f * (q.up < .2 ? .55 : .3)).multiplyScalar(1 + f * 1.6); q.m.color.copy(tmp);
      }
    }
  });
}
/* element parts for the eastern dragon (fire = 화룡, ice = 빙룡) */
function iceCrystalMat(S) { if (S._iceMat) return S._iceMat; const R = fireRamp(S);
  const m = new THREE.MeshStandardMaterial({ color: R[2].clone().lerp(new THREE.Color(1, 1, 1), .35), emissive: R[1].clone().multiplyScalar(.55), roughness: .07, metalness: .35, flatShading: true, envMapIntensity: 1.6 });
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float fr = pow(1. - abs(dot(normal, normalize(vViewPosition))), 2.5); totalEmissiveRadiance += emissive * fr * 2.2; }'); };   /* bright frosty rim */
  m.customProgramCacheKey = () => 'iceCrystal'; return S._iceMat = m; }
function obsidianLavaMat(S) { return S._obsM || (S._obsM = fireMat(S, new THREE.MeshStandardMaterial(), false)); }
/* hexagonal ice crystal from a to b (pointed tip), optional width */
function iceCrystal(a, b, r) { const L = a.distanceTo(b), g = new THREE.CylinderGeometry(0, r, L, 6, 1); g.translate(0, L / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V().subVectors(b, a).normalize()); g.applyQuaternion(q); g.translate(a.x, a.y, a.z); return g; }
/* fire tail: a big flame banner — leaf-shaped blades of living fire fanned at the tail tip, swaying, with real flames streaming off */
function dragonTailFire(S, sp, len = 1.15) {
  const holder = new THREE.Group(), fins = [], core = fireGlowMat(S, 0), body = S._boltBody || fireGlowMat(S, 1);
  for (let b = 0; b < 7; b++) { const a = (b - 3) / 3, ang = a * .55, up = (1 - Math.abs(a)) * .35 + .05, L = len * (1 - Math.abs(a) * .35);
    const c = new THREE.CatmullRomCurve3([V(0, 0, -.05), V(Math.sin(ang) * L * .35, up * L * .5, L * .35), V(Math.sin(ang) * L * .75, up * L * .9, L * .72), V(Math.sin(ang) * L, up * L * 1.05, L)]);
    const P = c.getPoints(16), pv = new THREE.Group(); holder.add(pv);
    [[body, 1], [core, .4]].forEach(([m, k]) => { const g = polyTube(P, t => (.012 + .11 * Math.sin(Math.PI * Math.pow(t, .7)) * (1 - t * .55)) * k, 8); g.scale(.3, 1, 1); const me = new THREE.Mesh(g, m); me.renderOrder = 6; pv.add(me); if (m === body) fins.push(me); });
    pv.userData.ph = b * 1.3; }
  sp.attach(holder, 1, V(0, 0, 0));
  S._fireLayer = { len: .9, op: 1 }; fireBurn(S, holder, fins, 260, .045); S._fireLayer = null;
  S.extras.push((sh, dt, t) => { holder.children.forEach(pv => { if (pv.userData.ph == null) return; const f = pv.userData.ph; pv.rotation.set(Math.sin(t * 3.1 + f) * .12, Math.sin(t * 2.3 + f * 1.7) * .16, Math.sin(t * 4.2 + f) * .08); }); });
}
/* ice tail: a fan of hexagonal ice-crystal blades growing from the tail tip, with small crystals clustered at their roots */
function dragonTailIce(S, sp, len = 1.1) {
  const holder = new THREE.Group(), geos = [], m = iceCrystalMat(S);
  for (let b = 0; b < 7; b++) { const a = (b - 3) / 3, ang = a * .6, up = (1 - Math.abs(a)) * .3 + .03, L = len * (1 - Math.abs(a) * .3);
    geos.push(iceCrystal(V(0, 0, -.04), V(Math.sin(ang) * L, up * L, Math.cos(ang) * L), .055 * (1 - Math.abs(a) * .3)));
    for (let k = 0; k < 2; k++) { const r0 = V(Math.sin(ang) * .12, .02, .1 + k * .08), d = V(Math.sin(ang + (k - .5) * .7) * .4, .25 + k * .1, .3).normalize(); geos.push(iceCrystal(r0, r0.clone().addScaledVector(d, .22 + .1 * k), .025)); } }
  holder.add(new THREE.Mesh(mergeGeometries(geos.map(g => g.toNonIndexed())), m)); sp.attach(holder, 1, V(0, 0, 0));
}
function dragonTailBolt(S, sp, len = 1.05) {
  if (S._fire) return S._ice ? dragonTailIce(S, sp) : dragonTailFire(S, sp);
  const hr = (a, b) => { const v = Math.sin(a * 78.23 + b * 19.17) * 43758.5; return v - Math.floor(v); };
  const path = (a, b, n, amp, sd) => { const out = [a.clone()], d = V().subVectors(b, a); for (let i = 1; i < n; i++) { const t = i / n + (hr(i, sd) - .5) * .5 / n; out.push(a.clone().addScaledVector(d, t).add(V((hr(i, sd + 1) - .5) * 2 * amp, (hr(i, sd + 2) - .5) * 2 * amp, 0))); } out.push(b.clone()); return out; };
  const holder = new THREE.Group(), vars = [];
  for (let v = 0; v < 3; v++) {
    const g = new THREE.Group(), sd = v * 13 + 2;
    // three strands fanning from the tail tip, each irregular and slightly different in length
    for (let b = 0; b < 3; b++) { const ang = (b - 1) * .32 + (hr(b, sd + 3) - .5) * .2, L = len * (b === 1 ? 1 : .72 + hr(b, sd + 6) * .2), end = V(Math.sin(ang) * L, (hr(b, sd + 4) - .4) * .3 * L, Math.cos(ang) * L);
      boltHorn(S, g, path(V(0, 0, -.04), end, 7, .07, sd + b * 11), b === 1 ? .026 : .02, .003); }
    const bg = bake(S, g); bg.visible = v === 0; holder.add(bg); vars.push(bg);
  }
  sp.attach(holder, 1, V(0, 0, 0));
  let cur = 0, tk = .15;
  S.extras.push((sh, dt) => { tk -= dt; if (tk < 0) { vars[cur].visible = false; cur = (cur + 1 + Math.floor(Math.random() * 2)) % 3; vars[cur].visible = true; tk = .06 + Math.random() * (sh.fire ? .12 : .3); } });
}
/* lightning-bolt dorsal crest: three rows (centre tallest), dense, uneven heights that still fall toward the tail.
   Drawn as 3 instanced meshes (core / body / halo), so ~90 spikes cost 3 draw calls. */
function dragonBoltSpines(S, sp, o = {}) {
  const core = S._boltCore || (S._boltCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).lerp(S.P.glow.clone().multiplyScalar(.3), .25), toneMapped: false }));
  const body = S._boltBody || (S._boltBody = glowMat(S.P.glow.clone().multiplyScalar(.75), .85));
  const halo = S._boltHalo || (S._boltHalo = glowMat(S.P.glow.clone().multiplyScalar(.5), .22));
  const pts = S._fire ? new THREE.CatmullRomCurve3([V(0, -.06, 0), V(0, .45, .28), V(0, .8, .7), V(0, 1, 1.05)]).getPoints(10) : zig(V(0, -.06, 0), V(0, 1, 1.0), 4, .09, 1, 1.7), P = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 3; k++) P.push(pts[i].clone().lerp(pts[i + 1], k / 3)); P.push(pts[pts.length - 1].clone());   /* fire/ice: smooth swept fin instead of a zig-zag bolt */
  const hr = (a, b) => { const v = Math.sin(a * 91.7 + b * 37.3) * 43758.5; return v - Math.floor(v); };
  const list = [];
  const row = (n, s0, s1, side, k, sh) => { for (let i = 0; i < n; i++) { const a = i / (n - 1), s = lp(s0, s1, a) + sh, j = hr(i, side + 3); list.push({ s, side, h: k * lp(.46, .08, Math.pow(a, .8)) * (.72 + .56 * j), yaw: (hr(i, side + 7) - .5) * .5 }); } };
  row(o.n || 34, .03, .97, 0, 1, 0); row(o.n || 34, .03, .97, 1, .62, 0); row(o.n || 34, .03, .97, -1, .62, 0);
  const LAY = S._ice ? [[iceCrystalMat(S), 1, 6]] : S._fire ? [[core, .4, 6], [body, 1, 8]] : [[core, .38, 6], [body, 1, 6], [halo, 2.1, 8]];
  const layers = LAY.map(([m, k, seg], li) => { const geo = S._ice ? iceCrystal(V(0, -.06, 0), V(0, .9, .75), .09) : polyTube(P, t => (S._fire ? .02 + .13 * Math.sin(Math.PI * Math.pow(t, .6)) * (1 - t * .6) : lp(.1, .016, t)) * k, seg); if (S._fire) geo.scale(.35, 1, 1);   /* fire: flat flame fin; ice: hex crystal spike */
    const im = new THREE.InstancedMesh(geo, m, list.length); im.frustumCulled = false; im.renderOrder = 5 + li; S.body.add(im); S.glows.push(im); return im; });
  const items = list.map(it => { const r = sp.r(it.s), an = new THREE.Object3D(), ch = new THREE.Object3D();
    sp.attach(an, it.s, V(0, r * 1.0, 0));
    ch.rotation.set(0, it.yaw * (it.side ? .4 : 1), -it.side * .8); ch.scale.set(it.h * (it.side ? .85 : 1), it.h, it.h); ch.updateMatrix(); return { an, ch }; });
  const M = new THREE.Matrix4();
  S.extras.push(() => { items.forEach((it, i) => { it.an.updateMatrix(); M.multiplyMatrices(it.an.matrix, it.ch.matrix); for (const l of layers) l.setMatrixAt(i, M); }); for (const l of layers) l.instanceMatrix.needsUpdate = true; });
}
/* body silhouette: slim neck → deep chest → waist → hips → long whip tail */
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dragonR = (k = 1) => s => k * (.22 * (s < .45 ? 1 : Math.pow(1 - (s - .45) / .55, 1.1)) + .008);
function dragonCore(S, o) {
  const sp = serpent(S, { rings: o.rings || 72, uvRep: o.uvRep || 7, z0: o.z0 ?? -1, z1: o.z1 ?? 4.6, f: o.f ?? 1.75, f2: o.f2 ?? .7, ax: o.ax ?? .54, ay: o.ay ?? .12, w: o.w ?? 3.6,   /* faster wriggle when moving */ env: o.env || (s => .35 + .65 * s), r: dragonR(o.k || 1) });
  const head = dragonHead(S, o.head || .8); sp.attach(head, 0, V(0, .05, -.04), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), .12));
  const lk = (o.legK || 1) * .78;
  for (const s of [1, -1]) { dragonLeg(S, sp, .16, s, 1.0 * lk, false, s > 0 ? 0 : Math.PI, !!o.pearls); dragonLeg(S, sp, .5, s, .82 * lk, true, s > 0 ? Math.PI : 0, !!o.pearls); }
  dragonBoltSpines(S, sp, { n: o.spines || 34 }); dragonTailBolt(S, sp); dragonBodyArcs(S, sp, 10); if (o.bolts) dragonStorm(S, sp); if (o.storm) dragonStormClouds(S, sp);
  dragonClouds(S, sp, o.clouds || DRAGON_CLOUDS);
  return { sp, head };
}
/* storm clouds the dragon swims through: puffs ride the spine, flash from inside, arcs leap to the body */
function dragonClouds(S, sp, list) {
  if (S.fxOff) return;
  const cm = cloudMat(S), geo = new THREE.IcosahedronGeometry(1, 3), nodes = [];
  list.forEach(([s, x, y, z, r], i) => {
    const m = new THREE.Mesh(geo, cm); m.renderOrder = 2 + (i % 3); const holder = new THREE.Group(); holder.add(m); m.scale.set(r * 1.35, r * .8, r * 1.1);
    sp.attach(holder, s, V(x, y, z)); nodes.push(emitter(holder, 0, 0, 0));
    S.extras.push((sh, dt, t) => { const mv = sh.mode === sh.cfg.moving, k = 1 + Math.sin(t * .6 + i * 1.9) * .06; m.scale.set(r * 1.35 * k, r * .8 * k, r * (mv ? 1.7 : 1.1) * k); m.position.z = mv ? r * .5 : 0; });
  });
  let fl = 0, nx = 1;
  S.extras.push((sh, dt, t) => { nx -= dt; if (nx < 0) { fl = 1.7; nx = (sh.fire ? .3 : .8) + Math.random() * (sh.fire ? .5 : 1.8); } fl = Math.max(0, fl - dt * 5); cm.uniforms.uFlash.value = fl * (.6 + .4 * Math.random()); });
  const pr = []; for (let i = 1; i < nodes.length; i += 2) pr.push([nodes[i - 1], nodes[i]]);
  arcs(S, pr, S.P.glow); S.sparkEm.push(...nodes);
}
const DRAGON_CLOUDS = [[.3, .35, -.45, 0, .42], [.36, -.4, -.5, .1, .38], [.44, 0, -.62, .2, .46], [.62, .3, -.4, 0, .36], [.68, -.32, -.45, .1, .34], [.84, 0, -.35, 0, .3], [.94, .15, -.2, .1, .26], [.97, -.18, -.15, .2, .24]];
function thunderDragonBody(S) { if (S.P.hull.emissiveMap) { S.P.hull.emissiveMap = null; S.P.hull.needsUpdate = true; }   /* the body glows evenly with each strike, exactly like the face (no rim-only pattern) */
  S.fxOff = true; /* lightning FX hidden while the form is being refined — flip to false to restore */ S.sparkEm = []; let fk = 0; S.extras.push((sh, dt, t) => { sh._elec && (sh._elec.uniforms.uK.value = sh.fire ? 1.45 : 1); fk = Math.random() < dt * 2.5 ? 1 : Math.max(0, fk - dt * 4); sh.P.hull.emissiveIntensity = 0; /* scale-rim glow tried and cancelled */ }); }
const TDRAGON_V = [
  { name: 'A · 천뢰룡', desc: '여의주 없이 네 발의 갈고리 발톱을 펼친 기본형이에요. 번개 뿔과 등을 따라 이어지는 3갈래 번개 뿔, 빛나는 눈, 나풀거리는 번개 수염, 세 가닥 번개 꼬리를 가졌어요.',
    build(S) { dragonCore(S, { pearls: false }); particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'B · 사주룡', desc: '네 발 모두 번개를 품은 여의주를 움켜쥔 형이에요. 여의주에서 번개가 사방으로 튀고, 번개가 튈 때마다 빛이 번져요. 몸 주변으로 번개가 아주 불규칙하고 자주 쳐서 비늘 위를 기어가고, 몸 여기저기를 건너뛰고, 공중으로 튀어나가요. 칠 때마다 몸 전체가 번쩍여요.',
    build(S) { dragonCore(S, { pearls: true, bolts: true }); particles(S, S.sparkEm, sparkOpts(S)); } },
  { name: 'C · 운주룡', desc: 'B(네 발 여의주 + 몸 주변 번개)에 먹구름을 더한 형이에요. 용이 번개 치는 먹구름 사이를 뚫고 날아가고, 무빙 때 구름이 빠르게 뒤로 스쳐 지나가요.',
    build(S) { dragonCore(S, { pearls: true, bolts: true, storm: true }); particles(S, S.sparkEm, sparkOpts(S)); } },
];

/* ===== BLAZE DRAGON · 화룡 — the sky-swimming eastern dragon, burning: molten horns / spines / tail blades / whiskers,
   red eyes, and FIRE LAB flames rising off the whole serpent body (emitters re-seated on the moving body every frame) ===== */
function fireDragonBody(S) { S._fire = true; S._sparks = true; S._fireEye = new THREE.Color(1, .1, .04); S.fxOff = true; S.sparkEm = []; S.extras.push(sh => { sh.P.hull.emissiveIntensity = 0; }); }
const BDR_V = [
  { name: 'A · 화룡', desc: '뇌룡의 화염 버전이에요. 하늘을 헤엄치는 긴 몸 전체에서 불길이 뒤로 흘러 타오르고, 뿔·등 가시·꼬리 칼날·수염은 녹은 용암처럼 일렁이며 빛나요. 눈은 붉게 타오르고 불티와 연기가 흩날려요.',
    build(S) { ZIG_K = .3; try { dragonCore(S, { pearls: false }); } finally { ZIG_K = 1; } fireEngulf(S, S.body, 8000, 3000, .85, 1.1); } },
  { name: 'B · 폭염 화룡', desc: 'A에 불길 폭발을 더했어요. 불규칙하게 긴 몸 전체의 불길이 확 치솟아 두 배로 길고 굵게 타오르고, 재와 불티가 한꺼번에 뜯겨 날아가며 불빛이 번쩍여요.',
    build(S) { ZIG_K = .3; try { dragonCore(S, { pearls: false }); } finally { ZIG_K = 1; } fireEngulf(S, S.body, 8000, 3000, .85, 1.1); fireFlare(S); } },
  { name: 'C · 화산 화룡', desc: 'B에 화산재 구름을 더했어요. 용이 시커먼 화산재 구름 사이를 헤엄치고, 구름 속에서 불빛이 번쩍이며 무빙 때 구름이 빠르게 뒤로 스쳐 지나가요.',
    build(S) { ZIG_K = .3; try { dragonCore(S, { pearls: false }); } finally { ZIG_K = 1; } fireEngulf(S, S.body, 8000, 3000, .85, 1.1); fireFlare(S); dragonStormClouds(S, null, { spread: 2.0, size: 1.4, side: 2.4, z0: 5, z1: 13, tones: ASH_TONES, coreK: .6 }); } },
];
PAINTS3.blazedragon = [TP('인페르노', '#2a0c04', '#ff7a1a', '#ffd070', [2.8, 1.2, .3], [0xffe0a0, 0xff6010]), TP('청염', '#060c22', '#3a9aff', '#bfe4ff', [.5, 1.4, 2.8], [0xffffff, 0x3a8aff]), TP('흑염', '#0a0410', '#b040ff', '#f0c0ff', [1.9, .6, 2.6], [0xffd8ff, 0xa030ff]), { ...TPR(), pv: 1 }];
PAINTS3.thunderdragon = [TP('천둥 청룡', '#1e3a5a', '#7ad0ff', '#c8ecff', [.5, 1.7, 2.8], [0xffffff, 0x4ab0ff]), TP('흑뢰', '#18181f', '#9a8aff', '#d8d0ff', [1.4, .9, 2.8], [0xffffff, 0x9a70ff]), TP('금뢰', '#7a5a1e', '#ffe08a', '#fff2c8', [2.6, 2.2, .7], [0xffffff, 0xffd050]), TPR()];
/* final versions: lightning creatures keep only style C, fire creatures keep only style A (other styles kept in code) */
[CE_V, WD_V, TDRAGON_V].forEach(a => a.splice(0, a.length - 1)); [FB_V, BD_V, BDR_V].forEach(a => a.splice(1));
/* ---------- catalogue ---------- */
const THEMES = [
  { id: 'thunder', name: '번개', ic: '⚡', color: '#7ac8ff' },
  { id: 'fire', name: '화염', ic: '🔥', color: '#ff8a3a' },
  { id: 'ice', name: '얼음', ic: '❄', color: '#bfeaff' }
];
const CATALOG = [
  { theme: 'thunder', id: 'thunderbird_e', code: 'THUNDERBIRD Λ', kname: '썬더버드 Λ · 크리스탈 번개 독수리', cls: '신화 · 수정체', body: ceEagle, V: CE_V, radius: 4.0, detail: 'none', skin: 'feather' },
  { theme: 'thunder', id: 'stormdrake', code: 'STORM DRAKE', kname: '스톰 드레이크 · 번개 서양룡', cls: '신화 · 용', body: wdBody, V: WD_V, radius: 5.8, detail: 'none', skin: 'scale' },
  { theme: 'thunder', id: 'thunderdragon', code: 'THUNDER DRAGON', kname: '뇌룡 · 하늘을 헤엄치는 번개용', cls: '신화 · 용', body: thunderDragonBody, V: TDRAGON_V, radius: 4.1, detail: 'none', skin: 'scale' },
  { theme: 'fire', id: 'blazeeagle', code: 'BLAZE EAGLE', kname: '블레이즈 이글 · 불꽃 독수리', cls: '신화 · 화염체', body: fireEagle, V: FB_V, radius: 3.4, detail: 'none', skin: 'feather', fireFX: true },
  { theme: 'fire', id: 'blazedrake', code: 'BLAZE DRAKE', kname: '블레이즈 드레이크 · 화염 서양룡', cls: '신화 · 용', body: fireDrake, V: BD_V, radius: 5.8, detail: 'none', skin: 'scale', fireFX: true },
  { theme: 'fire', id: 'blazedragon', code: 'BLAZE DRAGON', kname: '블레이즈 드래곤 · 하늘을 헤엄치는 화룡', cls: '신화 · 용', body: fireDragonBody, V: BDR_V, radius: 4.1, detail: 'none', skin: 'scale', fireFX: true },
  { theme: 'ice', id: 'frosteagle', code: 'FROST EAGLE', kname: '프로스트 이글 · 얼음 독수리', cls: '신화 · 빙결체', body: frostEagle, V: FE_V, radius: 3.4, detail: 'none', skin: 'feather', fireFX: true },
  { theme: 'ice', id: 'frostdrake', code: 'FROST DRAKE', kname: '프로스트 드레이크 · 서리 서양룡', cls: '신화 · 용', body: frostDrake, V: FD_V, radius: 5.8, detail: 'none', skin: 'scale', fireFX: true },
  { theme: 'ice', id: 'frostdragon', code: 'FROST DRAGON', kname: '프로스트 드래곤 · 하늘을 헤엄치는 빙룡', cls: '신화 · 용', body: frostDragonBody, V: FDR_V, radius: 4.1, detail: 'none', skin: 'scale', fireFX: true },
];
CATALOG.forEach(c => { c.moving = 'boost'; c.thrust = { cruise: .7, boost: 1.45, combat: 1.45 }; });

function disposeShip(S) {
  S.root.traverse(o => {
    if (o.geometry && o.geometry !== flameGeo && o.geometry !== tracerGeo && o.geometry !== hexDomeGeo && o.geometry !== spikeGeo) o.geometry.dispose();
    if (o.material && !o.material.userData.keep && !Object.values(MAT).includes(o.material)) o.material.dispose();
  });
  scene.remove(S.root);
}
function buildShip(fi, vi, pi) {
  const c = CATALOG[fi];
  seed = 3 + fi * 101 + vi * 7;
  const S = new Ship({ id: c.id, radius: c.radius, thrust: Object.assign({ boost: 1.45, combat: 1.45 }, c.thrust), moving: c.moving, fireFX: !!c.fireFX });
  S.P = c.skin === 'feather' ? getCreaturePaint(c.id, pi) : c.skin === 'scale' ? getScalePaint(c.id, pi) : getPaint3(c.theme, c.id, pi);
  c.body(S); c.V[vi].build(S); if (c.detail === 'armor') armorShip(S); else if (c.detail === 'bio') detailShip(S);
  scene.add(S.root); return S;
}
return { CATALOG, buildShip, ENV, PRISM_U, FIRE_T, WD_T, scene, setNoFx: v => { NOFX = v; } };
}
