/* 부쉬 + 나무 비교 (2026-11-10 · 사용자: 색 바꾼 고사리로 · 나무 자체를 제대로 만들고 고사리랑 같이 쓸지 고민)
   고사리 수풀: 바닥 모양 가로 약 4.6m · 세로 약 3.4m · 높이 약 1.7m (1층 기체가 묻힘) · 초원 빛깔 · 밑동에 풀과 들꽃
   나무: 넓은 잎 나무 — 뿌리가 땅을 움켜쥠 · 밑이 굵고 위로 가늘어지는 몸통(꼬인 껍질결 · 그늘쪽 이끼) · 두세 번 갈라지는 가지 · 가지 끝 잎 뭉치가 겹친 둥근 지붕
   비교: 나무 혼자 · 고사리 + 나무 한 그루 · 고사리 + 나무 두 그루 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101629';
import { makePerf } from './perf.js?v=11101629';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101629';

const $ = s => document.querySelector(s);
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const SUN = new THREE.Vector3(-.45, .78, .44).normalize();
const SPACING = 11, HB = 1.7;   /* 비교 자리 간격(나무 지붕이 넓어서) · 덤불 높이(m) */

/* 바닥 모양: 동그라미 셋을 합친 덩이 (안쪽 +, 대략 가장자리까지 거리 m) — 다섯 개 모두 같은 모양 */
const shape = (x, z) => { let d = -99; for (const [cx, cz, r] of [[0, 0, 1.75], [1.3, .55, 1.25], [-1.25, -.35, 1.15]]) d = smax(d, r - Math.hypot(x - cx, z - cz), .8); return d + .14 * fbm(x * 1.6, z * 1.6, 2); };
/* 덩이 안 높이 윤곽: 가장자리에서 둥글게 솟아 가운데가 가장 높음 */
const dome = (x, z) => { const s = shape(x, z); return s <= 0 ? 0 : HB * Math.pow(Math.min(1, s / 1.1), .5) * (.9 + .1 * fbm(x * 1.3 + 5, z * 1.3, 2)); };

/* 칠 공통 (초원 섬과 같은 빛: 해 · 하늘빛 · 땅 반사) */
const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT;
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 } };
/* 잎 · 풀잎 칠: 꼭짓점마다 색 · 바람에 흔들리는 정도(aS) · 잎이면 해를 등질 때 빛이 비쳐 보임(aTr) · 빛나는 꽃(aE) */
const VEGV = `attribute vec3 color, aD; attribute float aS, aTr, aE, aU; uniform float uT; varying vec3 vC, vN, vP, vD; varying float vTr, vE, vU;
  void main(){ vec4 w = modelMatrix * vec4(position, 1.); float ph = w.x * .7 + w.z * .4;
    w.xz += vec2(sin(uT * 1.4 + ph), cos(uT * 1.1 + ph * 1.3)) * .045 * aS + vec2(sin(uT * .6 + w.x * .25), 0.) * .06 * aS * aS;   /* 잔바람 + 큰 바람 물결 (가지는 천천히 크게) */
    w.xyz += vec3(sin(uT * 4.7 + w.y * 9. + w.x * 7.), sin(uT * 5.3 + w.z * 8.) * .6, cos(uT * 4.1 + w.x * 6. - w.y * 5.)) * .012 * aS * aTr;   /* 잎 뭉치마다 따로 살랑임 */
    vC = color; vN = normalize(mat3(modelMatrix) * normal); vD = aD; vU = aU; vP = w.xyz; vTr = aTr; vE = aE; gl_Position = projectionMatrix * viewMatrix * w; }`;   /* aD: 덩어리 전체의 둥근 면 방향 (잎 하나하나보다 큰 덩어리로 빛을 받게 · 0이면 제 면 그대로 — 나무껍질) · aU: 햇빛 받는 정도(덩어리 위쪽일수록 1) */
const VEGF = GL + `varying vec3 vC, vN, vP, vD; varying float vTr, vE, vU;
  void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; if (dot(vD, vD) > .01) n = normalize(mix(n, normalize(vD), .7));   /* 잎결 자글거림을 줄이고 큰 덩어리로 부드럽게 칠한 느낌 (초원 땅과 같은 결) */
    float up = vU; vec3 al = vC * mix(.78, 1.12, up) + vec3(.06, .07, .0) * up * up;   /* 밑은 짙은 풀빛 · 위는 햇빛 받은 노란 연두 */
    vec3 c = lit(al, n, 1., mix(.7, 1., up));
    c += vC * vec3(1., 1.25, .55) * pow(max(0., dot(-n, uSun)), 1.5) * vTr * .7;   /* 해를 등진 잎은 빛이 비쳐 보임 */
    c += vC * vE * (1.8 + .5 * sin(uT * 1.7 + vP.x * 3. + vP.z * 2.));             /* 빛나는 꽃 */
    gl_FragColor = vec4(c, 1.); }`;
const vegM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEGV, fragmentShader: VEGF, side: THREE.DoubleSide });

/* 조각 모으기: 꼭짓점 · 색 · 흔들림 · 비침 · 빛남을 한 그물로 */
/* 덤불 덩이의 둥근 면 방향 · 햇빛 받는 정도 (기본값: 고사리 수풀 덩이 기준) */
const bushSoft = p => { const d = new THREE.Vector3(p[0] * .32, 1, p[2] * .42).normalize(); const u = Math.min(1, Math.max(0, (p[1] - .1) / (HB - .1))); return [d.x, d.y, d.z, u * u * (3 - 2 * u)]; };
function Bag() { const P = [], C = [], S = [], T = [], E = [], D = [], Uu = [], I = []; const B = {
  soft: bushSoft,   /* 지금 붙이는 조각의 둥근 면 함수 (나무 잎 뭉치는 나무 지붕 기준으로 바꿔 끼움) */
  v(p, c, s, tr = 0, e = 0, sd = B.soft(p)) { P.push(...p); C.push(...c); S.push(s); T.push(tr); E.push(e); D.push(sd[0], sd[1], sd[2]); Uu.push(sd[3]); return P.length / 3 - 1; },   /* 꼭짓점 하나 (나눠 쓰면 면이 매끈하게 이어짐) */
  idx(a, b, c) { I.push(a, b, c); },
  tri(a, b, c, ca, cb, cc, sa, sb, sc, tr = 0, e = 0) { I.push(B.v(a, ca, sa, tr, e), B.v(b, cb, sb, tr, e), B.v(c, cc, sc, tr, e)); },
  quad(a, b, c, d, ca, cb, cc, cd, sa, sb, sc, sd, tr = 0, e = 0) { const o = B.v(a, ca, sa, tr, e), o1 = B.v(b, cb, sb, tr, e), o2 = B.v(c, cc, sc, tr, e), o3 = B.v(d, cd, sd, tr, e); I.push(o, o1, o2, o, o2, o3); },
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aTr', new THREE.Float32BufferAttribute(T, 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 1)); g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(Uu, 1)); g.setIndex(I); g.computeVertexNormals(); return g; },
  get tris() { return I.length / 3; } }; return B; }
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* 속 덩이: 바닥 모양대로 솟은 어두운 덩이 — 잎 사이로 속이 비쳐 보이지 않게  */
function core(col, inset = .25, hk = .82) { const P = [], C = [], I = [], key = new Map(), S = .12;
  const nx = Math.ceil(6.4 / S), nz = Math.ceil(5 / S), x0 = -3.2, z0 = -2.5;
  /* 속 덩이는 경계 안쪽 칸만 (바닥에 네모 계단이 비치지 않게 · 가장자리는 잎이 덮음) */
  const h = (x, z) => { const s = shape(x, z) - inset; return s <= 0 ? .02 : .02 + HB * hk * Math.pow(Math.min(1, s / 1.0), .55) + .12 * fbm(x * 2.2, z * 2.2, 2) * Math.min(1, s * 3); };
  const vid = (i, j) => { const k = i + ',' + j; if (key.has(k)) return key.get(k); const x = x0 + i * S, z = z0 + j * S, id = P.length / 3; P.push(x, h(x, z), z); const s = shape(x, z) - inset, d = Math.min(1, Math.max(0, s / 1.2)); C.push(...mul(col, .45 + .55 * d)); key.set(k, id); return id; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S; if (Math.min(shape(x, z), shape(x + S, z), shape(x, z + S), shape(x + S, z + S)) - inset < 0) continue; I.push(vid(i, j), vid(i, j + 1), vid(i + 1, j + 1), vid(i, j), vid(i + 1, j + 1), vid(i + 1, j)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); const n = P.length / 3;
  g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aTr', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1));
  const D = [], Uu = []; for (let k = 0; k < n; k++) { const sd = bushSoft([P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]); D.push(sd[0], sd[1], sd[2]); Uu.push(sd[3]); }
  g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(Uu, 1)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 덩이 안에서 고르게 흩은 자리 (가장자리 쪽을 더 촘촘히 · 경계가 또렷하게) */
function scatter(r, n, edgeBias = 0) { const out = []; for (let k = 0; out.length < n && k < n * 40; k++) { const x = -2.9 + r() * 5.8, z = -2.2 + r() * 4.4, s = shape(x, z); if (s < .05) continue; if (edgeBias && s > .6 && r() < edgeBias) continue; out.push([x, z, s]); } return out; }

/* 잎 하나 (끝이 뾰족한 타원 잎: 가운데 접혀 입체감) — 공 둘레에 바깥을 보게 붙임 */
function leaf(B, c, nrm, size, col, sway, tr = .5, e = 0) { const t = new THREE.Vector3().crossVectors(nrm, Math.abs(nrm.y) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), b = new THREE.Vector3().crossVectors(nrm, t);
  const rot = Math.random() * 6.283, d1 = t.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b, Math.sin(rot)), d2 = new THREE.Vector3().crossVectors(nrm, d1);
  const p0 = c.clone().addScaledVector(d1, -size * .5), p1 = c.clone().addScaledVector(d1, size * .55).addScaledVector(nrm, size * .12), m = c.clone().addScaledVector(nrm, size * .08);
  const l = c.clone().addScaledVector(d2, size * .3), rr = c.clone().addScaledVector(d2, -size * .3), dark = mul(col, .7);
  B.tri(p0.toArray(), l.toArray(), m.toArray(), dark, col, col, sway, sway, sway, tr, e); B.tri(l.toArray(), p1.toArray(), m.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr, e);
  B.tri(p0.toArray(), m.toArray(), rr.toArray(), dark, col, col, sway, sway, sway, tr, e); B.tri(m.toArray(), p1.toArray(), rr.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr, e); }
/* ── 3. 큰 잎 고사리 수풀: 어른 키만 한 고사리 잎이 겹겹이 우산처럼 펼쳐짐 · 잎 아래는 그늘 · 위는 햇빛에 비침 ── */
function ferns() { const r = rngOf(33), B = Bag(), F0 = lin(0x5c8f2c), F1 = lin(0xa0c856);
  const crowns = scatter(r, 16, .3);
  for (const [cx, cz] of crowns) { const nF = 9 + (r() * 4 | 0);
    for (let f = 0; f < nF; f++) { const a = f / nF * 6.283 + r() * .4, L = 1.1 + r() * .7, up = .9 + r() * .5, col = mix3(F0, F1, r() * .7), dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-dir.z, 0, dir.x);
      const at = t => new THREE.Vector3(cx, .05, cz).addScaledVector(dir, L * t).add(new THREE.Vector3(0, Math.sin(Math.min(1, t * 1.25) * 1.75) * up * (1 - t * .35), 0));   /* 솟았다 끝이 처지는 잎줄기 */
      for (let k = 0; k < 14; k++) { const t0 = k / 14, t1 = (k + 1) / 14, p0 = at(t0), p1 = at(t1), w = .26 * Math.sin(Math.min(1, t0 * 1.15) * Math.PI) * (1 - t0 * .25), sw = t0 * t0;
        B.quad(p0.clone().addScaledVector(side, -.012).toArray(), p0.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, -.012).toArray(), mul(col, .5), mul(col, .5), mul(col, .55), mul(col, .55), sw, sw, sw, sw);
        for (const sd of [-1, 1]) { const tipP = p0.clone().lerp(p1, .5).addScaledVector(side, sd * w).addScaledVector(dir, w * .35).add(new THREE.Vector3(0, -w * .25, 0)), shade = .65 + .5 * t0;   /* 작은 잎(우상엽) 한 쌍 */
          B.tri(p0.toArray(), p1.toArray(), tipP.toArray(), mul(col, shade * .8), mul(col, shade * .9), mul(col, shade * 1.1), sw, sw, sw + .1, .9); } } } }
  return { leaves: B.geo(), core: core(lin(0x46702a), .45, .5) }; }

/* ── 나무: 넓은 잎 나무 ──
   몸통 — 밑동이 넓게 퍼졌다가 위로 가늘어짐 · 껍질 골이 살짝 꼬여 올라감 · 해를 등진 아래쪽에 이끼
   뿌리 — 밑동에서 갈래 지어 땅을 움켜쥐듯 퍼지다 땅속으로
   가지 — 몸통 위에서 서너 갈래 → 두세 번 더 갈라짐 · 굵은 가지는 위로 휘고 잔가지 끝은 무게로 살짝 처짐
   잎 — 가지 끝마다 잎 뭉치 · 뭉치가 겹쳐 둥근 지붕 · 위는 햇빛 받은 노란 연두, 지붕 속은 그늘 · 속에 짙은 잎 한 겹(하늘이 숭숭 비치지 않게) */
const BARK0 = lin(0x3a2c20), BARK1 = lin(0x7d6a52), MOSS = lin(0x5d7a2c), TLF0 = lin(0x4c7c26), TLF1 = lin(0x9cc44c);
/* 굵기가 변하는 매끈한 관 (가지 · 몸통 · 뿌리) — 꼭짓점을 나눠 써서 둥글게 이어짐 · 끝은 한 점으로 모임 */
function limb(B, pts, rad, sides, sway, along0 = 0) {
  const curve = new THREE.CatmullRomCurve3(pts), segs = Math.max(4, Math.round(curve.getLength() / .18)), fr = curve.computeFrenetFrames(segs, false), len = curve.getLength(), rings = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs, c = curve.getPointAt(t), R = rad(t), ring = [], along = along0 + len * t;
    for (let k = 0; k < sides; k++) { const a = k / sides * 6.283, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)), p = c.clone().addScaledVector(n, R);
      const tw = a + along * .55, ridge = fbm(Math.cos(tw) * 2.4 + 7, Math.sin(tw) * 2.4 + along * .7, 3);   /* 껍질 골: 둘레를 따라 촘촘 · 길이 따라 천천히 · 살짝 꼬임 */
      let col = mix3(BARK0, BARK1, Math.min(1, Math.max(0, .5 + ridge * 1.1)));
      const shadeSide = Math.max(0, -(n.x * SUN.x + n.z * SUN.z) / Math.hypot(SUN.x, SUN.z)), moss = shadeSide * Math.max(0, 1 - p.y / 1.4) * Math.max(0, .4 + fbm(p.x * 3, p.y * 3 + p.z * 2, 2));
      col = mix3(col, MOSS, Math.min(.85, moss * 1.3));                        /* 그늘 쪽 아래에 이끼 */
      col = mul(col, .55 + .45 * Math.min(1, Math.max(0, p.y / .9)));          /* 땅 가까이는 어둡게 (풀 그늘 · 흙) */
      ring.push(B.v(p.toArray(), col, sway(t), 0, 0, [0, 0, 0, .45])); }
    rings.push(ring); }
  for (let i = 0; i < segs; i++) for (let k = 0; k < sides; k++) { const a = rings[i][k], b = rings[i][(k + 1) % sides], c = rings[i + 1][(k + 1) % sides], d = rings[i + 1][k]; B.idx(a, b, c); B.idx(a, c, d); }
  return { end: curve.getPointAt(1), dir: curve.getTangentAt(1), len }; }
function tree(seed, S = 1, ox = 0, oz = 0) { const r = rngOf(seed), B = Bag(), tips = [];
  const R0 = .24 * S, T = (2.3 + r() * .4) * S, la = r() * 6.283, lean = .3 * S;
  /* 몸통 */
  const tp = []; for (let q = 0; q <= 6; q++) { const t = q / 6; tp.push(new THREE.Vector3(ox + Math.cos(la) * lean * t * t + .06 * S * Math.sin(t * 7 + seed), T * t - .05, oz + Math.sin(la) * lean * t * t + .06 * S * Math.cos(t * 6 + seed))); }
  const trunkR = t => R0 * (1 - .42 * t) * (1 + .75 * Math.exp(-t * 10));
  const top = limb(B, tp, trunkR, 12, t => .02 * t);
  /* 뿌리: 밑동에서 갈래 지어 퍼지며 땅속으로 */
  const nR = 5 + (r() * 2 | 0); for (let k = 0; k < nR; k++) { const a = k / nR * 6.283 + r() * .5, ca = Math.cos(a), sa = Math.sin(a), L = (.75 + r() * .45) * S;
    limb(B, [new THREE.Vector3(ox + ca * R0 * .4, .42 * S, oz + sa * R0 * .4), new THREE.Vector3(ox + ca * (R0 + .12 * S), .2 * S, oz + sa * (R0 + .12 * S)), new THREE.Vector3(ox + ca * L * .6, .06, oz + sa * L * .6), new THREE.Vector3(ox + ca * L, -.08, oz + sa * L)],
      t => (.13 * S) * (1 - .8 * t) + .012, 7, () => 0); }
  /* 가지: 굵은 가지는 위로 휘고 · 잔가지 끝은 처짐 */
  const grow = (p, d, L, rad, depth) => { const pts = [p.clone()], q = p.clone(), dd = d.clone();
    for (let i = 0; i < 5; i++) { dd.y += depth < 2 ? .07 : -.06; dd.x += (r() - .5) * .18; dd.z += (r() - .5) * .18; dd.normalize(); q.addScaledVector(dd, L / 5); pts.push(q.clone()); }
    const sw0 = [.03, .1, .22][depth], sw1 = [.1, .22, .4][depth], end = rad * (depth === 2 ? .25 : .62);
    const g = limb(B, pts, t => rad + (end - rad) * t, [9, 7, 5][depth], t => sw0 + (sw1 - sw0) * t);
    if (depth === 2) { tips.push([g.end, g.dir, 1]); return; }
    if (depth === 1) tips.push([g.end, g.dir, .8]);   /* 갈라지는 자리에도 잎 뭉치 (지붕 속이 비지 않게) */
    const n = 2 + (r() < .45 ? 1 : 0); for (let c = 0; c < n; c++) { const ax = new THREE.Vector3().crossVectors(g.dir, new THREE.Vector3(r() - .5, r() - .5, r() - .5)).normalize(), nd = g.dir.clone().applyAxisAngle(ax, .45 + r() * .4).applyAxisAngle(g.dir, c / n * 6.283);
      grow(g.end, nd, L * (.62 + r() * .15), end * .85, depth + 1); }
    if (depth === 0 && r() < .7) { const mid = pts[3], sd = new THREE.Vector3(r() - .5, .25, r() - .5).normalize(); grow(mid, sd, L * .5, rad * .45, 2); } };   /* 가지 중간에서 옆으로 난 잔가지 */
  const nL = 3 + (r() < .5 ? 1 : 0), topR = trunkR(1);
  for (let k = 0; k < nL; k++) { const a = k / nL * 6.283 + r() * .6, e = (38 + r() * 17) * Math.PI / 180; grow(top.end, new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), (1.3 + r() * .5) * S, topR * .78, 0); }
  grow(top.end, new THREE.Vector3((r() - .5) * .3, 1, (r() - .5) * .3).normalize(), 1.2 * S, topR * .7, 1);   /* 위로 곧게 이어지는 줄기 */
  /* 잎 지붕: 가지 끝 잎 뭉치들의 둘레 */
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9); for (const [p] of tips) { lo.min(p); hi.max(p); }
  const cc = lo.clone().add(hi).multiplyScalar(.5), cr = hi.clone().sub(lo).multiplyScalar(.5).addScalar(.65 * S);
  B.soft = p => { const v = new THREE.Vector3(p[0] - cc.x, p[1] - cc.y, p[2] - cc.z).divide(cr), u = Math.min(1, Math.max(0, (v.y + .9) / 1.8)); v.normalize(); return [v.x, v.y, v.z, u * u * (3 - 2 * u)]; };   /* 지붕 전체를 큰 덩어리로 · 위일수록 햇빛 */
  for (const [p, d, sz] of tips) { const c = p.clone().addScaledVector(d, .12 * S).add(new THREE.Vector3(0, .12 * S, 0)), R = (.5 + r() * .22) * S * sz, col0 = mix3(TLF0, TLF1, r() * .55);
    for (let k = 0; k < 125; k++) { const u = r() * 2 - 1, a = r() * 6.283, sq = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(sq * Math.cos(a), u * .85 + .1, sq * Math.sin(a)).normalize(); if (nrm.y < -.55 && r() < .6) continue;
      const lp = c.clone().add(new THREE.Vector3(nrm.x * R, nrm.y * R * .78, nrm.z * R).multiplyScalar(.85 + r() * .25)), rel = lp.clone().sub(cc).divide(cr), occ = Math.min(1, Math.max(.25, rel.length()));   /* 지붕 속일수록 그늘 */
      leaf(B, lp, nrm, (.16 + r() * .05) * S, mul(col0, (.5 + .5 * occ) * (.95 + r() * .1)), .45 + .3 * occ, .55); }
    for (let k = 0; k < 34; k++) { const u = r() * 2 - 1, a = r() * 6.283, sq = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(sq * Math.cos(a), u, sq * Math.sin(a));   /* 속 잎: 짙은 한 겹 */
      leaf(B, c.clone().addScaledVector(nrm, R * .5), nrm, .2 * S, mul(col0, .42), .35, .2); } }
  return { geo: B.geo(), height: hi.y + .7 * S, canopy: { x: cc.x, y: cc.y, z: cc.z, rx: cr.x, rz: cr.z }, trunk: { x: ox, z: oz, h: T, w: R0 * 2.2 } }; }

/* 밑동: 덤불(또는 나무) 둘레에 땅과 같은 풀이 둘러 자라고 들꽃이 핌 → 땅에서 솟아난 것처럼 이어짐 */
function skirt(seed, foot = shape) { const r = rngOf(seed), B = Bag(), GR0 = [.16, .36, .07], GR1 = [.40, .58, .12], FL = [[1.1, 1.05, .95], [1.1, .9, .3], [.85, .65, 1.1]];
  for (let k = 0, n = 0; k < 9000 && n < 900; k++) { const x = -3.3 + r() * 6.6, z = -2.7 + r() * 5.4, s = foot(x, z); if (s < -.45 || s > .3) continue; n++;
    const a = r() * 6.283, h = (.22 + r() * .28) * (1 - Math.max(0, -s) * 1.2), w = .03, lean = .12 + r() * .1, ox = Math.cos(a), oz = Math.sin(a), col = mix3(GR0, GR1, r());
    B.tri([x - oz * w, 0, z + ox * w], [x + oz * w, 0, z - ox * w], [x + ox * lean * h, h, z + oz * lean * h], mul(col, .7), mul(col, .7), mul(col, 1.15), 0, 0, 1, .4);
    if (r() < .07) { const c = FL[(r() * 3) | 0], y = h + .02; for (let q = 0; q < 5; q++) { const an = q / 5 * 6.283, d = [Math.cos(an) * .04, 0, Math.sin(an) * .04], d2 = [Math.cos(an + 1.2) * .04, 0, Math.sin(an + 1.2) * .04];
      B.tri([x + ox * lean * h, y, z + oz * lean * h], [x + ox * lean * h + d[0], y + .01, z + oz * lean * h + d[2]], [x + ox * lean * h + d2[0], y + .01, z + oz * lean * h + d2[2]], c, c, c, 1, 1, 1, .2); } } }
  return B.geo(); }

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  /* 바닥: 초원 섬과 같은 풀밭 (풀결 · 들꽃 · 덤불 밑 그늘) */
  /* 땅 그늘: 덤불 · 나무 지붕(잎 사이로 햇빛이 새는 얼룩 그늘) · 나무 몸통 — 해 방향으로 비켜 드리움 */
  const NE = 8, NC = 4, uE = { value: Array.from({ length: NE }, () => new THREE.Vector4(0, 0, 1, 1)) }, uEk = { value: new Array(NE).fill(0) }, uC = { value: Array.from({ length: NC }, () => new THREE.Vector4()) }, uCw = { value: new Array(NC).fill(0) };
  const SX = -SUN.x / SUN.y, SZ = -SUN.z / SUN.y; let ne = 0, nc = 0;
  const addBushShade = x => { uE.value[ne].set(x + .25, -.25, 3.1, 2.4); uEk.value[ne++] = .45; };
  const addTreeShade = (x, T) => { const c = T.canopy; uE.value[ne].set(x + c.x + SX * c.y, c.z + SZ * c.y, c.rx * 1.1, c.rz * 1.1); uEk.value[ne++] = -.6;
    const t = T.trunk; uC.value[nc].set(x + t.x, t.z, x + t.x + SX * t.h, t.z + SZ * t.h); uCw.value[nc++] = t.w; };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 34, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { ...U, uE, uEk, uC, uCw },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.); }',
    fragmentShader: GL + `uniform vec4 uE[${NE}], uC[${NC}]; uniform float uEk[${NE}], uCw[${NC}]; varying vec3 vP; void main(){ vec2 q = vP.xz; float g1 = fb(q * .14), g2 = fb(q * .8 + 4.), g3 = vn(q * 6.6);
      vec3 c = mix(vec3(.16, .36, .07), vec3(.40, .58, .12), g1); c = mix(c, vec3(.10, .27, .06), smoothstep(.5, .78, g2) * .55) * (.82 + .3 * g3);
      vec2 fc = q * 3.8, id = floor(fc), f = fract(fc) - .5, o = vec2(h21(id + 1.7), h21(id + 3.3)) - .5; float on = step(h21(id), .12 * smoothstep(.45, .72, fb(q * .1 + 9.))) * smoothstep(.13, .05, length(f - o * .6));
      c = mix(c, h21(id + 5.) < .5 ? vec3(1.1, 1.05, .95) : vec3(1.1, .9, .3), on);
      float sh = 1.;
      for (int i = 0; i < ${NE}; i++) { float k = uEk[i]; if (k == 0.) continue; float d = length((q - uE[i].xy) / uE[i].zw);
        float m = k > 0. ? smoothstep(1.1, .35, d) : smoothstep(1.05, .55, d) * mix(.45, 1., smoothstep(.35, .62, fb(q * 1.9 + vec2(sin(uT * .5), cos(uT * .4)) * .08)));   /* 나무 그늘은 잎 사이로 새는 햇빛 얼룩 · 바람에 살짝 일렁 */
        sh *= 1. - abs(k) * m; }
      for (int i = 0; i < ${NC}; i++) { if (uCw[i] == 0.) continue; vec2 a = uC[i].xy, ab = uC[i].zw - a; float h = clamp(dot(q - a, ab) / dot(ab, ab), 0., 1.); float d = length(q - a - ab * h);
        sh *= 1. - .5 * smoothstep(uCw[i] * (1. - .5 * h), uCw[i] * .3, d); }
      gl_FragColor = vec4(lit(c, vec3(0., 1., 0.), sh, sh), 1.); }` }));
  scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: 'varying vec3 vD; void main(){ gl_FragColor = vec4(mix(vec3(.66, .78, .9), vec3(.32, .54, .84), smoothstep(-.1, .6, vD.y)), 1.); }' })); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  onProgress(.2); await new Promise(r => setTimeout(r, 20));
  const NAMES = ['나무 혼자', '고사리 + 나무 한 그루', '고사리 + 나무 두 그루'], N = NAMES.length, X = k => (k - (N - 1) / 2) * SPACING, info = [];
  const SETS = [[[101, 1, 0, 0]], [[101, 1, .55, .2]], [[202, .86, -1.35, -.25], [303, .74, 1.7, .75]]];   /* 나무: [씨앗, 크기, 자리 x, z] */
  for (let k = 0; k < N; k++) { const t0 = performance.now(), g = new THREE.Group(); g.position.x = X(k); let tris = 0, top = HB;
    const add = geo => { g.add(new THREE.Mesh(geo, vegM)); tris += geo.index.count / 3; };
    if (k > 0) { const F = ferns(); add(F.core); add(F.leaves); add(skirt(70 + k)); addBushShade(X(k)); }
    for (const [sd, sc, tx, tz] of SETS[k]) { const T = tree(sd, sc, tx, tz); add(T.geo); top = Math.max(top, T.height); addTreeShade(X(k), T);
      if (k === 0) add(skirt(90, (x, z) => .5 * sc - Math.hypot(x - tx, z - tz))); }   /* 나무 혼자일 때 밑동 둘레 풀 · 들꽃 */
    scene.add(g); info.push({ g, tris, top, ms: Math.round(performance.now() - t0) });
    onProgress(.2 + .25 * (k + 1)); await new Promise(r => setTimeout(r, 10)); }
  /* 크기 비교용 기체 (지금 고른 스킨) — 1층 높이(땅 위 1.2m)에서 덤불 옆에 떠 있음 */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId))); scene.add(FG.root); FG.root.position.set(X(1) - 3.2, 1.2, 2.7); FG.root.rotation.y = .4;
  onProgress(.95);

  /* 카메라: 게임과 같은 시점 (시야각 20° · 45° 내려봄) · 단추로 하나씩 · 끌어서 옆으로 */
  const cfg = { ang: 45, dist: 24, focus: -1 }; const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180); const cam = { x: 0, z: 0, d: 60 };
  { const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 32px)';
    const mk = (label, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'font-size:12px;padding:6px 11px;border:1px solid rgba(185,255,74,.45);border-radius:12px;color:#eaffd2;background:rgba(4,10,6,.6)';
      b.onclick = () => { cfg.focus = k; [...bar.children].forEach(c => c.style.background = 'rgba(4,10,6,.6)'); b.style.background = 'rgba(120,180,40,.45)'; }; bar.append(b); return b; };
    mk('모두', -1).style.background = 'rgba(120,180,40,.45)'; NAMES.forEach((n, k) => mk(n, k)); $('#ui').append(bar); }
  const labels = NAMES.map(n => { const d = document.createElement('div'); d.textContent = n; d.style.cssText = 'position:absolute;transform:translate(-50%,-100%);font-size:12px;color:#fff;padding:3px 8px;border-radius:9px;background:rgba(4,8,16,.55);pointer-events:none;white-space:nowrap'; $('#ui').append(d); return d; });
  const drag = { id: null, x: 0, off: 0 }; addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; drag.id = e.pointerId; drag.x = e.clientX; });
  addEventListener('pointermove', e => { if (e.pointerId !== drag.id) return; drag.off -= (e.clientX - drag.x) * cam.d * .0016; drag.x = e.clientX; }); addEventListener('pointerup', () => { drag.id = null; });
  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  const say = $('#where'), v = new THREE.Vector3();
  renderer.setAnimationLoop(now => { const t = now / 1000; U.uT.value = t;
    const tx = (cfg.focus < 0 ? 0 : X(cfg.focus)) + drag.off, td = cfg.focus < 0 ? 58 : cfg.dist; cam.x += (tx - cam.x) * .08; cam.d += (td - cam.d) * .08;
    FG.root.position.x += ((cfg.focus < 0 ? X(1) : X(cfg.focus)) - 3.2 - FG.root.position.x) * .08;   /* 덤불 왼쪽 앞 1층 높이 */
    const a = cfg.ang * Math.PI / 180; camera.position.set(cam.x, 1.6 + cam.d * Math.sin(a), cam.z + cam.d * Math.cos(a)); camera.lookAt(cam.x, 1.6, cam.z); camera.updateMatrixWorld(); sky.position.copy(camera.position);
    info.forEach((I, k) => { v.set(X(k), I.top + .4, 0).project(camera); const L = labels[k]; L.style.left = ((v.x * .5 + .5) * 100) + '%'; L.style.top = ((-v.y * .5 + .5) * 100) + '%'; L.style.display = v.z < 1 ? '' : 'none'; });
    if (say) say.style.display = 'none'; labels.forEach((L, k) => { L.textContent = cfg.focus === k ? `${NAMES[k]} · 삼각형 ${info[k].tris.toLocaleString()}개` : NAMES[k]; });
    FG.step(.016, t, { moving: false, fire: false }); FG.preRender(camera);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, false); perf.tick(1 / 60); });
  onProgress(1); console.log('[부쉬 나무]', JSON.stringify(info.map(I => ({ tris: I.tris, ms: I.ms }))));
  window.__bush = { cfg, info, camera, THREE };
}
