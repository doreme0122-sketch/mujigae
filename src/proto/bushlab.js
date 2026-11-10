/* 부쉬 시안 5개 비교 (2026-11-10 · 사용자: 부쉬만 5개 비교하게)
   모두 같은 바닥 모양(가로 약 4.6m · 세로 약 3.4m) · 같은 높이(약 1.7m — 1층 기체가 묻힘) · 게임과 같은 시점
   다섯 개 다 지키는 것: 경계가 또렷함 · 위에서 봐도 숨는 곳으로 읽힘 · 낮은 풀꽃과 헷갈리지 않음 · 속이 비쳐 보이지 않음(어두운 속 덩이)
   1 갈대숲 · 2 둥근 관목 덤불 · 3 큰 잎 고사리 수풀 · 4 빛나는 꽃 덤불 · 5 덩굴 얽힌 가시덤불 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101615';
import { makePerf } from './perf.js?v=11101615';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101615';

const $ = s => document.querySelector(s);
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const smax = (a, b, k) => { const h = Math.max(0, Math.min(1, .5 + .5 * (a - b) / k)); return b + (a - b) * h + k * h * (1 - h); };
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const SUN = new THREE.Vector3(-.45, .78, .44).normalize();
const SPACING = 8, HB = 1.7;   /* 덤불 사이 간격 · 덤불 높이(m) */

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
const VEGV = `attribute vec3 color; attribute float aS, aTr, aE; uniform float uT; varying vec3 vC, vN, vP; varying float vTr, vE;
  void main(){ vec4 w = modelMatrix * vec4(position, 1.); float ph = w.x * .7 + w.z * .4;
    w.xz += vec2(sin(uT * 1.4 + ph), cos(uT * 1.1 + ph * 1.3)) * .045 * aS + vec2(sin(uT * .6 + w.x * .25), 0.) * .06 * aS * aS;   /* 잔바람 + 큰 바람 물결 */
    vC = color; vN = normalize(mat3(modelMatrix) * normal); vP = w.xyz; vTr = aTr; vE = aE; gl_Position = projectionMatrix * viewMatrix * w; }`;
const VEGF = GL + `varying vec3 vC, vN, vP; varying float vTr, vE;
  void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; vec3 c = lit(vC, n, 1., 1.);
    c += vC * vec3(1., 1.25, .55) * pow(max(0., dot(-n, uSun)), 1.5) * vTr * .7;   /* 해를 등진 잎은 빛이 비쳐 보임 */
    c += vC * vE * (1.8 + .5 * sin(uT * 1.7 + vP.x * 3. + vP.z * 2.));             /* 빛나는 꽃 */
    gl_FragColor = vec4(c, 1.); }`;
const vegM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEGV, fragmentShader: VEGF, side: THREE.DoubleSide });

/* 조각 모으기: 꼭짓점 · 색 · 흔들림 · 비침 · 빛남을 한 그물로 */
function Bag() { const P = [], C = [], S = [], T = [], E = [], I = []; return {
  tri(a, b, c, ca, cb, cc, sa, sb, sc, tr = 0, e = 0) { const o = P.length / 3; P.push(...a, ...b, ...c); C.push(...ca, ...cb, ...cc); S.push(sa, sb, sc); T.push(tr, tr, tr); E.push(e, e, e); I.push(o, o + 1, o + 2); },
  quad(a, b, c, d, ca, cb, cc, cd, sa, sb, sc, sd, tr = 0, e = 0) { const o = P.length / 3; P.push(...a, ...b, ...c, ...d); C.push(...ca, ...cb, ...cc, ...cd); S.push(sa, sb, sc, sd); T.push(tr, tr, tr, tr); E.push(e, e, e, e); I.push(o, o + 1, o + 2, o, o + 2, o + 3); },
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aTr', new THREE.Float32BufferAttribute(T, 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 1)); g.setIndex(I); g.computeVertexNormals(); return g; },
  get tris() { return I.length / 3; } }; }
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* 속 덩이: 바닥 모양대로 솟은 어두운 덩이 — 잎 사이로 속이 비쳐 보이지 않게 (모든 시안 공통 · 색만 다름) */
function core(col, inset = .25, hk = .82) { const P = [], C = [], I = [], key = new Map(), S = .12;
  const nx = Math.ceil(6.4 / S), nz = Math.ceil(5 / S), x0 = -3.2, z0 = -2.5;
  /* 속 덩이는 경계 안쪽 칸만 (바닥에 네모 계단이 비치지 않게 · 가장자리는 잎이 덮음) */
  const h = (x, z) => { const s = shape(x, z) - inset; return s <= 0 ? .02 : .02 + HB * hk * Math.pow(Math.min(1, s / 1.0), .55) + .12 * fbm(x * 2.2, z * 2.2, 2) * Math.min(1, s * 3); };
  const vid = (i, j) => { const k = i + ',' + j; if (key.has(k)) return key.get(k); const x = x0 + i * S, z = z0 + j * S, id = P.length / 3; P.push(x, h(x, z), z); const s = shape(x, z) - inset, d = Math.min(1, Math.max(0, s / 1.2)); C.push(...mul(col, .45 + .55 * d)); key.set(k, id); return id; };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S; if (Math.min(shape(x, z), shape(x + S, z), shape(x, z + S), shape(x + S, z + S)) - inset < 0) continue; I.push(vid(i, j), vid(i, j + 1), vid(i + 1, j + 1), vid(i, j), vid(i + 1, j + 1), vid(i + 1, j)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); const n = P.length / 3;
  g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aTr', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 덩이 안에서 고르게 흩은 자리 (가장자리 쪽을 더 촘촘히 · 경계가 또렷하게) */
function scatter(r, n, edgeBias = 0) { const out = []; for (let k = 0; out.length < n && k < n * 40; k++) { const x = -2.9 + r() * 5.8, z = -2.2 + r() * 4.4, s = shape(x, z); if (s < .05) continue; if (edgeBias && s > .6 && r() < edgeBias) continue; out.push([x, z, s]); } return out; }

/* ── 1. 키 큰 갈대숲: 가늘고 긴 풀잎이 빽빽이 서서 끝이 금빛으로 바램 · 바람에 물결 · 가장자리 잎은 바깥으로 기울어 경계가 부드럽게 또렷 ── */
function reeds() { const r = rngOf(11), B = Bag(), G0 = lin(0x2f5a1a), G1 = lin(0x6f9a2c), GOLD = lin(0xd9c070);
  for (const [x, z, s] of scatter(r, 5200)) { const edge = 1 - Math.min(1, s / .9), H = (dome(x, z) + .25) * (.85 + r() * .3), a = r() * 6.283, lean = .12 + edge * .5, w = .025 + r() * .02;
    const gx = shape(x + .05, z) - shape(x - .05, z), gz = shape(x, z + .05) - shape(x, z - .05), gl = Math.hypot(gx, gz) || 1, ox = -gx / gl * lean + Math.cos(a) * .12, oz = -gz / gl * lean + Math.sin(a) * .12;   /* 바깥쪽으로 기움 */
    const side = [Math.cos(a + 1.57) * w, Math.sin(a + 1.57) * w], tip = .5 + r() * .5, col = mix3(G0, G1, r() * .6);
    const pts = [0, .35, .7, 1].map(f => [x + ox * H * f * f, H * f, z + oz * H * f * f]);
    for (let k = 0; k < 3; k++) { const f0 = k / 3, f1 = (k + 1) / 3, w0 = 1 - f0 * .8, w1 = 1 - f1 * .8, a0 = pts[k], a1 = pts[k + 1];
      const c0 = mix3(mul(col, .55 + .45 * f0), GOLD, Math.max(0, f0 - .55) * 1.6 * tip), c1 = mix3(mul(col, .55 + .45 * f1), GOLD, Math.max(0, f1 - .55) * 1.6 * tip);
      B.quad([a0[0] - side[0] * w0, a0[1], a0[2] - side[1] * w0], [a0[0] + side[0] * w0, a0[1], a0[2] + side[1] * w0], [a1[0] + side[0] * w1, a1[1], a1[2] + side[1] * w1], [a1[0] - side[0] * w1, a1[1], a1[2] - side[1] * w1], c0, c0, c1, c1, f0 * f0, f0 * f0, f1 * f1, f1 * f1, .6); } }
  return { leaves: B.geo(), core: core(lin(0x1f3812), .35, .55) }; }

/* 잎 하나 (끝이 뾰족한 타원 잎: 가운데 접혀 입체감) — 공 둘레에 바깥을 보게 붙임 */
function leaf(B, c, nrm, size, col, sway, tr = .5, e = 0) { const t = new THREE.Vector3().crossVectors(nrm, Math.abs(nrm.y) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), b = new THREE.Vector3().crossVectors(nrm, t);
  const rot = Math.random() * 6.283, d1 = t.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b, Math.sin(rot)), d2 = new THREE.Vector3().crossVectors(nrm, d1);
  const p0 = c.clone().addScaledVector(d1, -size * .5), p1 = c.clone().addScaledVector(d1, size * .55).addScaledVector(nrm, size * .12), m = c.clone().addScaledVector(nrm, size * .08);
  const l = c.clone().addScaledVector(d2, size * .3), rr = c.clone().addScaledVector(d2, -size * .3), dark = mul(col, .7);
  B.tri(p0.toArray(), l.toArray(), m.toArray(), dark, col, col, sway, sway, sway, tr, e); B.tri(l.toArray(), p1.toArray(), m.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr, e);
  B.tri(p0.toArray(), m.toArray(), rr.toArray(), dark, col, col, sway, sway, sway, tr, e); B.tri(m.toArray(), p1.toArray(), rr.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr, e); }
/* 잎 뭉치 자리: 속 덩이 겉면을 따라 (가장자리는 아래까지 · 위는 지붕) */
function clumps(r, n, rad) { const out = []; for (const [x, z, s] of scatter(r, n, .55)) { const h = dome(x, z), y = Math.max(rad * .7, h - rad * .4 + (r() - .5) * .2); out.push(new THREE.Vector3(x, y, z)); if (s < .5) out.push(new THREE.Vector3(x, Math.max(rad * .6, y * .45), z)); } return out; }

/* ── 2. 둥근 관목 덤불: 작은 잎이 촘촘한 둥근 포기 여럿이 엉킨 덩어리 · 하얀 작은 꽃 · 가장자리 잎은 바깥으로 살짝 늘어짐 ── */
function shrub() { const r = rngOf(22), B = Bag(), L0 = lin(0x2e5e1e), L1 = lin(0x5c8c2c);
  for (const c of clumps(r, 70, .5)) { const R = .42 + r() * .16, col0 = mix3(L0, L1, r());
    for (let k = 0; k < 95; k++) { const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(s * Math.cos(a), u * .9 + .1, s * Math.sin(a)).normalize(); if (nrm.y < -.5) continue;
      const p = c.clone().addScaledVector(nrm, R * (.85 + r() * .25)), shade = .55 + .45 * (nrm.y * .5 + .5); leaf(B, p, nrm, .13 + r() * .05, mul(col0, shade * (.85 + r() * .3)), .35 + .4 * (nrm.y * .5 + .5)); }
    if (r() < .5) for (let k = 0; k < 4; k++) { const a = r() * 6.283, nrm = new THREE.Vector3(Math.cos(a) * .6, .8, Math.sin(a) * .6).normalize(), p = c.clone().addScaledVector(nrm, R * 1.05);   /* 하얀 작은 꽃 (다섯 꽃잎) */
      for (let q = 0; q < 5; q++) { const an = q / 5 * 6.283, d = new THREE.Vector3(Math.cos(an), 0, Math.sin(an)).multiplyScalar(.035); B.tri(p.toArray(), p.clone().add(d).add(new THREE.Vector3(0, .01, 0)).toArray(), p.clone().add(d.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), .9)).toArray(), [1, .98, .92], [1, 1, .95], [1, 1, .95], .5, .5, .5, .3); } } }
  return { leaves: B.geo(), core: core(lin(0x22401a)) }; }

/* ── 3. 큰 잎 고사리 수풀: 어른 키만 한 고사리 잎이 겹겹이 우산처럼 펼쳐짐 · 잎 아래는 그늘 · 위는 햇빛에 비침 ── */
function ferns() { const r = rngOf(33), B = Bag(), F0 = lin(0x2c5a1c), F1 = lin(0x6e9e30);
  const crowns = scatter(r, 16, .3);
  for (const [cx, cz] of crowns) { const nF = 9 + (r() * 4 | 0);
    for (let f = 0; f < nF; f++) { const a = f / nF * 6.283 + r() * .4, L = 1.1 + r() * .7, up = .9 + r() * .5, col = mix3(F0, F1, r() * .7), dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-dir.z, 0, dir.x);
      const at = t => new THREE.Vector3(cx, .05, cz).addScaledVector(dir, L * t).add(new THREE.Vector3(0, Math.sin(Math.min(1, t * 1.25) * 1.75) * up * (1 - t * .35), 0));   /* 솟았다 끝이 처지는 잎줄기 */
      for (let k = 0; k < 14; k++) { const t0 = k / 14, t1 = (k + 1) / 14, p0 = at(t0), p1 = at(t1), w = .26 * Math.sin(Math.min(1, t0 * 1.15) * Math.PI) * (1 - t0 * .25), sw = t0 * t0;
        B.quad(p0.clone().addScaledVector(side, -.012).toArray(), p0.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, -.012).toArray(), mul(col, .5), mul(col, .5), mul(col, .55), mul(col, .55), sw, sw, sw, sw);
        for (const sd of [-1, 1]) { const tipP = p0.clone().lerp(p1, .5).addScaledVector(side, sd * w).addScaledVector(dir, w * .35).add(new THREE.Vector3(0, -w * .25, 0)), shade = .65 + .5 * t0;   /* 작은 잎(우상엽) 한 쌍 */
          B.tri(p0.toArray(), p1.toArray(), tipP.toArray(), mul(col, shade * .8), mul(col, shade * .9), mul(col, shade * 1.1), sw, sw, sw + .1, .9); } } } }
  return { leaves: B.geo(), core: core(lin(0x1c3414), .45, .5) }; }

/* ── 4. 빛나는 꽃 덤불: 짙은 덤불 위에 푸른 · 보랏빛으로 은은히 빛나는 꽃송이 · 사이로 빛 알갱이 ── */
function glowBloom() { const r = rngOf(44), B = Bag(), L0 = lin(0x1d4426), L1 = lin(0x376b34), BL = [lin(0x7fd0ff), lin(0xb48cff), lin(0x9ff5e6)];
  for (const c of clumps(r, 64, .5)) { const R = .45 + r() * .15, col0 = mix3(L0, L1, r());
    for (let k = 0; k < 80; k++) { const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(s * Math.cos(a), u * .9 + .1, s * Math.sin(a)).normalize(); if (nrm.y < -.5) continue;
      leaf(B, c.clone().addScaledVector(nrm, R * (.85 + r() * .25)), nrm, .15 + r() * .06, mul(col0, (.5 + .4 * (nrm.y * .5 + .5)) * (.85 + r() * .3)), .4 + .4 * nrm.y); }
    if (c.y > .5) for (let k = 0; k < 2 + (r() * 3 | 0); k++) { const a = r() * 6.283, nrm = new THREE.Vector3(Math.cos(a) * .5, .85, Math.sin(a) * .5).normalize(), p = c.clone().addScaledVector(nrm, R * 1.08), col = BL[(r() * 3) | 0];   /* 꽃송이: 꽃잎 여섯 장이 오므린 종 모양 */
      for (let q = 0; q < 6; q++) { const an = q / 6 * 6.283, d = new THREE.Vector3(Math.cos(an), .9, Math.sin(an)).normalize().multiplyScalar(.09), d2 = d.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.05);
        B.tri(p.toArray(), p.clone().add(d).toArray(), p.clone().add(d2).toArray(), mul(col, .6), col, col, .7, .8, .8, .4, 1.); } } }
  return { leaves: B.geo(), core: core(lin(0x142c18)), motes: true }; }

/* ── 5. 덩굴 얽힌 가시덤불: 굵은 덩굴 · 가지가 엉킨 무더기 위를 짙은 잎이 덮음 · 가장자리로 덩굴 끝이 말려 나옴 ── */
function bramble() { const r = rngOf(55), B = Bag(), V0 = lin(0x4a3a22), V1 = lin(0x5d5a2a), L0 = lin(0x264a1c), L1 = lin(0x4c6e26), parts = [];
  const vine = (pts, r0, col) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 4, r0, 5, false); g.deleteAttribute('uv'); const n = g.attributes.position.count, c = [];
    for (let k = 0; k < n; k++) { const t = Math.floor(k / 6) / (pts.length * 4); c.push(...mul(col, .6 + .4 * t)); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(.3), 1)); g.setAttribute('aTr', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(new Array(n).fill(0), 1)); parts.push(g.toNonIndexed()); return pts; };
  for (let k = 0; k < 46; k++) {   /* 덩굴: 덩이 겉면을 따라 휘감기며 넘어감 */
    let [x, z] = scatter(r, 1)[0], a = r() * 6.283; const pts = []; for (let q = 0; q < 7; q++) { const h = dome(x, z); pts.push(new THREE.Vector3(x, Math.max(.08, h * (.75 + r() * .3)), z)); a += (r() - .5) * 1.4; x += Math.cos(a) * .45; z += Math.sin(a) * .45; if (shape(x, z) < .05) { a += 3.14; x += Math.cos(a) * .5; z += Math.sin(a) * .5; } }
    vine(pts, .035 + r() * .03, mix3(V0, V1, r()));
    for (let q = 1; q < pts.length - 1; q++) if (r() < .5) { const p = pts[q], d = new THREE.Vector3(r() - .5, r() * .8, r() - .5).normalize(); const tip = p.clone().addScaledVector(d, .1);   /* 가시 */
      const base = [p.x, p.y, p.z], s = new THREE.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(.02); B.tri([base[0] + s.x, base[1], base[2] + s.z], [base[0] - s.x, base[1], base[2] - s.z], tip.toArray(), V1, V1, lin(0xc8b48a), .3, .3, .3); } }
  for (let k = 0; k < 14; k++) {   /* 가장자리로 말려 나온 덩굴 끝 */
    const a = r() * 6.283; let x = Math.cos(a) * 3, z = Math.sin(a) * 2.4; for (let q = 0; q < 40 && shape(x, z) < .15; q++) { x *= .97; z *= .97; }
    const o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), p0 = new THREE.Vector3(x, Math.max(.3, dome(x, z) * .6), z), pts = [p0];
    for (let q = 1; q <= 5; q++) { const t = q / 5; pts.push(p0.clone().addScaledVector(o, .45 * t + .1 * Math.sin(t * 5)).add(new THREE.Vector3(Math.cos(t * 6) * .12 * t, .25 * Math.sin(t * 3.1) - .15 * t, Math.sin(t * 6) * .12 * t))); }
    vine(pts, .025, V1); }
  for (const c of clumps(r, 52, .45)) { const R = .4 + r() * .15, col0 = mix3(L0, L1, r());   /* 잎은 듬성듬성 (덩굴이 비쳐 보이게) */
    for (let k = 0; k < 55; k++) { const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(s * Math.cos(a), u * .9 + .15, s * Math.sin(a)).normalize(); if (nrm.y < -.3) continue;
      leaf(B, c.clone().addScaledVector(nrm, R * (.9 + r() * .3)), nrm, .17 + r() * .06, mul(col0, (.5 + .45 * (nrm.y * .5 + .5)) * (.85 + r() * .3)), .3 + .3 * nrm.y, .35); } }
  return { leaves: mergeGeometries([B.geo().toNonIndexed(), ...parts]), core: core(lin(0x1e2c12)) }; }

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  /* 바닥: 초원 섬과 같은 풀밭 (풀결 · 들꽃 · 덤불 밑 그늘) */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 30, 1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { ...U, uN: { value: 5 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.); }',
    fragmentShader: GL + `varying vec3 vP; void main(){ vec2 q = vP.xz; float g1 = fb(q * .14), g2 = fb(q * .8 + 4.), g3 = vn(q * 6.6);
      vec3 c = mix(vec3(.16, .36, .07), vec3(.40, .58, .12), g1); c = mix(c, vec3(.10, .27, .06), smoothstep(.5, .78, g2) * .55) * (.82 + .3 * g3);
      vec2 fc = q * 3.8, id = floor(fc), f = fract(fc) - .5, o = vec2(h21(id + 1.7), h21(id + 3.3)) - .5; float on = step(h21(id), .12 * smoothstep(.45, .72, fb(q * .1 + 9.))) * smoothstep(.13, .05, length(f - o * .6));
      c = mix(c, h21(id + 5.) < .5 ? vec3(1.1, 1.05, .95) : vec3(1.1, .9, .3), on);
      float lx = vP.x - floor(vP.x / ${SPACING.toFixed(1)} + .5) * ${SPACING.toFixed(1)}; vec2 b = vec2(lx, vP.z);   /* 덤불 밑 그늘 */
      float sh = 1. - .45 * smoothstep(1.6, -.3, length(b * vec2(.62, .8)) - 1.2);
      gl_FragColor = vec4(lit(c, vec3(0., 1., 0.), sh, sh), 1.); }` }));
  scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: 'varying vec3 vD; void main(){ gl_FragColor = vec4(mix(vec3(.66, .78, .9), vec3(.32, .54, .84), smoothstep(-.1, .6, vD.y)), 1.); }' })); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  onProgress(.2); await new Promise(r => setTimeout(r, 20));
  const NAMES = ['1 갈대숲', '2 둥근 관목 덤불', '3 큰 잎 고사리 수풀', '4 빛나는 꽃 덤불', '5 덩굴 가시덤불'], MAKERS = [reeds, shrub, ferns, glowBloom, bramble], X = k => (k - 2) * SPACING, info = [];
  for (let k = 0; k < 5; k++) { const t0 = performance.now(), B = MAKERS[k](), g = new THREE.Group(); g.position.x = X(k);
    const leaves = new THREE.Mesh(B.leaves, vegM), coreM = new THREE.Mesh(B.core, vegM); g.add(coreM, leaves);
    if (B.motes) { const n = 70, p = new Float32Array(n * 4), r = rngOf(9); for (let i = 0; i < n; i++) { let x, z; do { x = -2.6 + r() * 5.2; z = -2 + r() * 4; } while (shape(x, z) < .2); p.set([x, .4 + r() * 1.9, z, r()], i * 4); }   /* 빛 알갱이 */
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, i) => p[(i / 3 | 0) * 4 + i % 3]), 3)); pg.setAttribute('iP', new THREE.BufferAttribute(p, 4));
      const pm = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: { ...U, uPx: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute vec4 iP; uniform float uT, uPx; varying float vA; void main(){ float ph = iP.w * 40.; vec3 q = position + vec3(sin(uT * .5 + ph) * .25, sin(uT * .8 + ph) * .2, cos(uT * .4 + ph) * .25); vA = .5 + .5 * sin(uT * 2. + ph); vec4 mv = modelViewMatrix * vec4(q, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * .07 / -mv.z; }',
        fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float r = dot(q, q); gl_FragColor = vec4(vec3(.6, .85, 1.) * (exp(-r * 30.) + exp(-r * 200.)) * vA * 1.6, 1.); }' })); pm.frustumCulled = false; g.add(pm); B.pts = pm; }
    scene.add(g); const tris = (B.leaves.index ? B.leaves.index.count : B.leaves.attributes.position.count) / 3 + B.core.index.count / 3; info.push({ g, tris, ms: Math.round(performance.now() - t0), pts: B.pts });
    onProgress(.2 + .12 * (k + 1)); await new Promise(r => setTimeout(r, 10)); }
  /* 크기 비교용 기체 (지금 고른 스킨) — 1층 높이(땅 위 1.2m)에서 덤불 옆에 떠 있음 */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId))); scene.add(FG.root); FG.root.position.set(X(2), 1.2, 2.7); FG.root.rotation.y = .4;
  onProgress(.95);

  /* 카메라: 게임과 같은 시점 (시야각 20° · 45° 내려봄) · 단추로 하나씩 · 끌어서 옆으로 */
  const cfg = { ang: 45, dist: 20, focus: -1 }; const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180); const cam = { x: 0, z: 0, d: 60 };
  { const bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 32px)';
    const mk = (label, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'font-size:12px;padding:6px 11px;border:1px solid rgba(185,255,74,.45);border-radius:12px;color:#eaffd2;background:rgba(4,10,6,.6)';
      b.onclick = () => { cfg.focus = k; [...bar.children].forEach(c => c.style.background = 'rgba(4,10,6,.6)'); b.style.background = 'rgba(120,180,40,.45)'; }; bar.append(b); return b; };
    mk('모두', -1).style.background = 'rgba(120,180,40,.45)'; NAMES.forEach((n, k) => mk(n, k)); $('#ui').append(bar); }
  const labels = NAMES.map(n => { const d = document.createElement('div'); d.textContent = n; d.style.cssText = 'position:absolute;transform:translate(-50%,-100%);font-size:12px;color:#fff;padding:3px 8px;border-radius:9px;background:rgba(4,8,16,.55);pointer-events:none;white-space:nowrap'; $('#ui').append(d); return d; });
  const drag = { id: null, x: 0, off: 0 }; addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; drag.id = e.pointerId; drag.x = e.clientX; });
  addEventListener('pointermove', e => { if (e.pointerId !== drag.id) return; drag.off -= (e.clientX - drag.x) * cam.d * .0016; drag.x = e.clientX; }); addEventListener('pointerup', () => { drag.id = null; });
  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); const px = Hd / (2 * Math.tan(camera.fov * Math.PI / 360)); for (const I of info) if (I.pts) I.pts.material.uniforms.uPx.value = px; }
  addEventListener('resize', size); size();
  const say = $('#where'), v = new THREE.Vector3();
  renderer.setAnimationLoop(now => { const t = now / 1000; U.uT.value = t;
    const tx = (cfg.focus < 0 ? 0 : X(cfg.focus)) + drag.off, td = cfg.focus < 0 ? 64 : cfg.dist; cam.x += (tx - cam.x) * .08; cam.d += (td - cam.d) * .08;
    FG.root.position.x += ((cfg.focus < 0 ? X(2) : X(cfg.focus)) - FG.root.position.x) * .08;
    const a = cfg.ang * Math.PI / 180; camera.position.set(cam.x, .8 + cam.d * Math.sin(a), cam.z + cam.d * Math.cos(a)); camera.lookAt(cam.x, .8, cam.z); camera.updateMatrixWorld(); sky.position.copy(camera.position);
    info.forEach((I, k) => { v.set(X(k), HB + .5, 0).project(camera); const L = labels[k]; L.style.left = ((v.x * .5 + .5) * 100) + '%'; L.style.top = ((-v.y * .5 + .5) * 100) + '%'; L.style.display = v.z < 1 ? '' : 'none'; });
    if (say) say.style.display = 'none'; labels.forEach((L, k) => { L.textContent = cfg.focus === k ? `${NAMES[k]} · 삼각형 ${info[k].tris.toLocaleString()}개` : NAMES[k]; });
    FG.step(.016, t, { moving: false, fire: false }); FG.preRender(camera);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, false); perf.tick(1 / 60); });
  onProgress(1); console.log('[부쉬 시안]', JSON.stringify(info.map(I => ({ tris: I.tris, ms: I.ms }))));
  window.__bush = { cfg, info, camera, THREE };
}
