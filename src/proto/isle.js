/* 새 초원 섬 하나 (2026-11-10 · 첫 시험) — 모양은 islefield.js, 여기서는 보이는 것을 만듦
   느낌: 신비로움(안개 사이 작은 빛) · 풍성함(이끼 · 나무 · 물) · 깊이(위아래 겹겹) · 맑은 낮빛
   가볍게 만드는 법:
   · 진짜 불빛 없음 — 해 · 하늘빛 · 그늘(오목한 곳 · 나무 밑 · 해 가림)을 로딩 때 꼭짓점마다 구워 두고 화면 칸에서는 무늬만 그림
   · 같은 것끼리 한 번에 그림 (나무 종류마다 한 번 · 풀 한 번 · 안개 한 번 · 빛 알갱이 한 번)
   · 땅은 촘촘히 만든 뒤 평평한 곳만 줄임 (절벽 · 가장자리 모양은 그대로) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js';
import { makeField, Y, SPOT, LAYERS, fbm, noise2, smoothstep } from './islefield.js?v=11101440';

const SUN = new THREE.Vector3(-.45, .78, .44).normalize();   /* 왼쪽 위 앞에서 (카메라 쪽 절벽 면이 비스듬히 빛을 받아 결이 드러남) */
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };   /* three가 색을 선형으로 바꿔 줌 */

/* 칠 공통: 잡음 · 구운 빛 · 아래로 갈수록 안개 */
const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT;
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12), MIST = vec3(.50, .64, .80);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
vec3 fogged(vec3 c, vec3 wp){ float k = smoothstep(-30., -105., wp.y); return mix(c, MIST, k * .85); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 }, uPush: { value: new THREE.Vector4(0, 0, 1, 0) } };   /* uPush: 기체가 오르내릴 때 밑의 풀·덤불을 미는 바람 (x, z, 반지름, 세기 · 섬 안 단위) */

export async function buildIsle({ K = 1 } = {}) {   /* K: 섬 전체 크기 (기체는 그대로 · 사용자 2026-11-10: 기체에 비해 땅이 너무 큼) */
  await MO.ready;
  const F = makeField(), G = new THREE.Group(), rnd = rngOf(20261110), st = { tris: 0, draws: 0 };
  const X0 = -52, X1 = 52, Z0 = -48, Z1 = 46, S = .34, NX = Math.round((X1 - X0) / S) + 1, NZ = Math.round((Z1 - Z0) / S) + 1;
  const gi = (i, j) => j * NX + i, gx = i => X0 + i * S, gz = j => Z0 + j * S;
  /* ① 칸마다 높이 · 안쪽 거리 미리 계산 */
  const Hg = new Float32Array(NX * NZ), Mg = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = gx(i), z = gz(j), m = F.mask(x, z); Mg[gi(i, j)] = m; Hg[gi(i, j)] = m > -2 ? F.top(x, z) : -40; }
  const hAt = (x, z) => { const u = Math.min(NX - 1.001, Math.max(0, (x - X0) / S)), w = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / S)), i = u | 0, j = w | 0, a = u - i, b = w - j;
    return (Hg[gi(i, j)] * (1 - a) + Hg[gi(i + 1, j)] * a) * (1 - b) + (Hg[gi(i, j + 1)] * (1 - a) + Hg[gi(i + 1, j + 1)] * a) * b; };
  const nAt = (x, z, e = .3) => new THREE.Vector3(hAt(x - e, z) - hAt(x + e, z), 2 * e, hAt(x, z - e) - hAt(x, z + e)).normalize();

  /* ② 나무 자리 먼저 (나무 밑 그늘을 땅에 굽기 위해) */
  const trees = [], bushes = [];
  const flatOK = (x, z, lim = .8) => F.mask(x, z) > 2.2 && nAt(x, z, .8).y > lim && F.pond(x, z) < -1.5 && F.chan(x, z) < -1.5 && F.tierAt(x, z)?.name !== 'wall';   /* 낮은 바위 벽 위에는 안 심음 */
  const farFrom = (L, x, z, d) => L.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > d * d);
  for (const [cx, cz, r] of SPOT.forest) for (let k = 0; k < r * r * .55; k++) {   /* 숲 덩이: 가운데 빽빽 · 가장자리 듬성 (숨는 곳) */
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (flatOK(x, z, .75) && farFrom(trees, x, z, 2.1 + d / r * 1.2)) trees.push({ x, z, y: hAt(x, z), s: (1.15 - .45 * d / r) * (.85 + rnd() * .3), r: rnd() * 6.283, v: (rnd() * 3) | 0 }); }
  for (let k = 0; k < 900 && trees.length < 95; k++) {   /* 외톨이 나무 · 고원 위 · 가장자리 */
    const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!flatOK(x, z, .82) || !farFrom(trees, x, z, 7)) continue;
    const onTop = hAt(x, z) > 0; if (!onTop && rnd() < .55) continue;
    trees.push({ x, z, y: hAt(x, z), s: .7 + rnd() * .45, r: rnd() * 6.283, v: onTop ? 3 : (rnd() * 3) | 0 }); }
  for (const [cx, cz, r] of SPOT.brush) for (let k = 0; k < r * r * 1.4; k++) {   /* 부쉬 덩이: 1층 높이까지 덮는 키 큰 덤불 무리 (숨는 곳) */
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!flatOK(x, z, .7) || !farFrom(bushes, x, z, 1.25)) continue; bushes.push({ x, z, y: hAt(x, z), s: (2.3 - .7 * d / r) * (.85 + rnd() * .3), r: rnd() * 6.283, v: (rnd() * 2) | 0, tall: 1 }); }
  for (let k = 0; k < 4000 && bushes.length < 260; k++) {   /* 작은 덤불: 나무 둘레 · 절벽 위 끝 · 연못가 */
    const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (F.mask(x, z) < 1 || nAt(x, z, .5).y < .7 || F.pond(x, z) > -.6 || F.chan(x, z) > -.4 || F.tierAt(x, z)?.name === 'wall') continue;
    const nearT = !farFrom(trees, x, z, 4.5), rim = nAt(x + 2, z, 1).y < .6 || nAt(x - 2, z, 1).y < .6 || nAt(x, z + 2, 1).y < .6 || nAt(x, z - 2, 1).y < .6, shore = F.pond(x, z) > -3.5;
    if (!(nearT || rim || shore) && rnd() > .12) continue; if (!farFrom(trees, x, z, 1.4) || !farFrom(bushes, x, z, 1.1)) continue;
    bushes.push({ x, z, y: hAt(x, z), s: .55 + rnd() * .6, r: rnd() * 6.283, v: (rnd() * 2) | 0 }); }

  /* ③ 빛 굽기: 오목한 곳(사방 땅이 얼마나 막는지) · 해 가림(해 쪽으로 걸어가며 땅에 막히는지) · 나무 밑 그늘 */
  const AOg = new Float32Array(NX * NZ), SHg = new Float32Array(NX * NZ);
  const DIRS = Array.from({ length: 10 }, (_, k) => [Math.cos(k * .6283), Math.sin(k * .6283)]), sx = SUN.x / Math.hypot(SUN.x, SUN.z), sz = SUN.z / Math.hypot(SUN.x, SUN.z), slope = SUN.y / Math.hypot(SUN.x, SUN.z);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = gi(i, j); if (Mg[k] < -1.5) continue; const x = gx(i), z = gz(j), h = Hg[k];
    let oc = 0; for (const [dx, dz] of DIRS) { let m = 0; for (const r of [.8, 2, 4.5, 9]) { const hh = Mg[gi(Math.min(NX - 1, Math.max(0, i + Math.round(dx * r / S))), Math.min(NZ - 1, Math.max(0, j + Math.round(dz * r / S))))] > -1.5 ? hAt(x + dx * r, z + dz * r) : -99; m = Math.max(m, (hh - h) / r); } oc += Math.min(1, Math.max(0, m)); }
    AOg[k] = 1 - .62 * oc / DIRS.length;
    let s = 1; for (let d = .6; d < 26; d += .6) { const hx = x + sx * d, hz = z + sz * d; if (F.mask(hx, hz) < -.5) break; const hh = hAt(hx, hz); if (hh > h + d * slope + .25) { s = Math.max(.12, 1 - (d < 3 ? .6 : .85)); break; } }
    SHg[k] = s; }
  const treeShade = (x, z) => { let s = 1; for (const t of trees) { const R = 3.2 * t.s, dx = x - (t.x - SUN.x / SUN.y * 4 * t.s), dz = z - (t.z - SUN.z / SUN.y * 4 * t.s), d2 = dx * dx + dz * dz; if (d2 < R * R) s *= .55 + .45 * Math.sqrt(d2) / R; } for (const b of bushes) { const R = 1.3 * b.s, dx = x - b.x, dz = z - b.z; if (dx * dx + dz * dz < R * R) s *= .8; } return s; };

  /* ④ 단마다 모양값을 칸에 미리 (보이는 모양) · 그 단이 맨 위인 곳 = 그 단 안 ∧ 섬 안 ∧ 더 위 단들 밖 */
  const SD = F.TIERS.map(T => { const A = new Float32Array(NX * NZ).fill(-99); const [bx0, bz0, bx1, bz1] = T.box || [X0, Z0, X1, Z1];
    const i0 = Math.max(0, Math.floor((bx0 - X0) / S)), i1 = Math.min(NX - 1, Math.ceil((bx1 - X0) / S)), j0 = Math.max(0, Math.floor((bz0 - Z0) / S)), j1 = Math.min(NZ - 1, Math.ceil((bz1 - Z0) / S));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) A[gi(i, j)] = T === F.TIERS[F.TIERS.length - 1] ? Mg[gi(i, j)] : T.sd(gx(i), gz(j)); return A; });
  const EX = F.TIERS.map((T, t) => { const A = new Float32Array(NX * NZ); for (let k = 0; k < A.length; k++) { let e = Math.min(SD[t][k], Mg[k]); for (let u = 0; u < t; u++) e = Math.min(e, -SD[u][k]); A[k] = e; } return A; });
  /* 칸을 삼각형으로 나누고 경계에 걸친 삼각형은 경계에서 잘라 매끈한 테두리 (E ≥ 0 인 곳만) */
  const clipMesh = (E, hf) => { const P = [], key = new Map(), edge = [], IDX = [];
    const vG = (i, j) => { const k = gi(i, j); if (key.has(k)) return key.get(k); const id = P.length / 3; P.push(gx(i), hf(gx(i), gz(j)), gz(j)); edge.push(0); key.set(k, id); return id; };
    const vC = (i0, j0, i1, j1) => { const a = gi(i0, j0), b = gi(i1, j1), k = 'e' + Math.min(a, b) + ',' + Math.max(a, b); if (key.has(k)) return key.get(k);
      const [p, q] = a < b ? [[i0, j0], [i1, j1]] : [[i1, j1], [i0, j0]], e0 = E[gi(...p)], e1 = E[gi(...q)], t = e0 / (e0 - e1), x = gx(p[0]) + (gx(q[0]) - gx(p[0])) * t, z = gz(p[1]) + (gz(q[1]) - gz(p[1])) * t;
      const id = P.length / 3; P.push(x, hf(x, z), z); edge.push(1); key.set(k, id); return id; };
    const tri = (A, B, C) => { const T = [A, B, C], inn = T.map(([i, j]) => E[gi(i, j)] >= 0), n = inn.filter(Boolean).length; if (!n) return;
      if (n === 3) { IDX.push(vG(...A), vG(...B), vG(...C)); return; }
      const poly = []; for (let q = 0; q < 3; q++) { const a = T[q], b = T[(q + 1) % 3]; if (inn[q]) poly.push(vG(...a)); if (inn[q] !== inn[(q + 1) % 3]) poly.push(vC(...a, ...b)); }
      for (let q = 1; q + 1 < poly.length; q++) IDX.push(poly[0], poly[q], poly[q + 1]); };
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const k = gi(i, j); if (E[k] < -1 && E[k + 1] < -1 && E[k + NX] < -1 && E[k + NX + 1] < -1) continue;
      if ((i + j) & 1) { tri([i, j], [i, j + 1], [i + 1, j]); tri([i + 1, j], [i, j + 1], [i + 1, j + 1]); } else { tri([i, j], [i, j + 1], [i + 1, j + 1]); tri([i, j], [i + 1, j + 1], [i + 1, j]); } }
    return { pos: new Float32Array(P), idx: IDX, edge }; };

  /* ⑤ 위 땅: 단마다 평평한 윗면 (풀 · 이끼 · 흙의 섞임 · 구운 빛) — 평평하니 많이 줄여도 모양이 안 변함 */
  const TP = [], TN = [], TW = [], TL = [], TI = []; let fullT = 0;
  F.TIERS.forEach((T, t) => { const M = clipMesh(EX[t], T.h), NV = M.pos.length / 3; if (!M.idx.length) return; fullT += M.idx.length / 3;
    const nrm = new Float32Array(NV * 3), W = new Float32Array(NV * 4), L = new Float32Array(NV * 2), base = TP.length / 3;
    for (let v = 0; v < NV; v++) { const x = M.pos[v * 3], h = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2], e = .3, n = new THREE.Vector3(T.h(x - e, z) - T.h(x + e, z), 2 * e, T.h(x, z - e) - T.h(x, z + e)).normalize(); nrm.set([n.x, n.y, n.z], v * 3);
      const u = Math.min(NX - 1, Math.max(0, Math.round((x - X0) / S))), w = Math.min(NZ - 1, Math.max(0, Math.round((z - Z0) / S))), k = gi(u, w), ed = EX[t][k];
      const rim = 1 - smoothstep(0, 1.4, ed), wet = Math.max(smoothstep(-3.5, 0, F.pond(x, z)), smoothstep(-2.5, 0, F.chan(x, z))) * (T.name === 'meadow' ? 1 : 0);
      let gr = 1 - .55 * wet, rk = 0, ms = .25 * wet + .55 * rim, dt = .35 * smoothstep(.55, .72, fbm(x * .06 + 3, z * .06, 3) * .5 + .5);
      if (T.name === 'wall') { rk = .9; ms += .8; gr = .35; dt = .1; }   /* 낮은 바위 벽 위: 이끼 낀 바위 */
      if (T.name.startsWith('spire')) { ms += .5; gr = .7; }
      if (h < Y.WATER + .15 && wet > .3) { dt += .7; gr *= .2; }   /* 물 밑 바닥 */
      const sum = gr + rk + ms + dt + 1e-4; W.set([gr / sum, rk / sum, ms / sum, dt / sum], v * 4);
      const ts = treeShade(x, z); L[v * 2] = (M.edge[v] ? .8 : AOg[k]) * (.6 + .4 * ts); L[v * 2 + 1] = (M.edge[v] ? 1 : SHg[k]) * ts; }
    const [I] = MO.simplify(new Uint32Array(M.idx), M.pos, 3, 0, .05, ['LockBorder', 'ErrorAbsolute']);
    for (const q of M.pos) TP.push(q); for (const q of nrm) TN.push(q); for (const q of W) TW.push(q); for (const q of L) TL.push(q); for (const q of I) TI.push(q + base); });
  const topG = new THREE.BufferGeometry(); topG.setAttribute('position', new THREE.Float32BufferAttribute(TP, 3)); topG.setAttribute('normal', new THREE.Float32BufferAttribute(TN, 3));
  topG.setAttribute('aW', new THREE.Float32BufferAttribute(TW, 4)); topG.setAttribute('aL', new THREE.Float32BufferAttribute(TL, 2)); topG.setIndex(TI); topG.computeBoundingSphere();
  const topM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute vec4 aW; attribute vec2 aL; varying vec3 vP, vN; varying vec4 vW; varying vec2 vL; void main(){ vP = position; vN = normal; vW = aW; vL = aL; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec3 vP, vN; varying vec4 vW; varying vec2 vL;
      void main(){ vec3 n = normalize(vN); vec2 q = vP.xz;
        float g1 = fb(q * .07), g2 = fb(q * .42 + 4.), g3 = vn(q * 3.3), g4 = vn(q * 11.);
        vec3 grass = mix(vec3(.16, .36, .07), vec3(.40, .58, .12), g1);                             /* 넓게 번지는 연두 · 짙은 초록 얼룩 */
        grass = mix(grass, vec3(.10, .27, .06), smoothstep(.5, .78, g2) * .55) * (.82 + .3 * g3) * (.9 + .2 * g4);   /* 풀결 */
        vec2 fc = q * 1.9, id = floor(fc), f = fract(fc) - .5, o = vec2(h21(id + 1.7), h21(id + 3.3)) - .5;   /* 들꽃: 풀밭 군데군데 모여 핌 */
        float on = step(h21(id), .16 * smoothstep(.45, .72, fb(q * .05 + 9.))) * smoothstep(.13, .05, length(f - o * .6));
        vec3 fcol = h21(id + 5.) < .45 ? vec3(1., .97, .9) : h21(id + 9.) < .5 ? vec3(1., .82, .25) : vec3(.78, .55, 1.);
        grass = mix(grass, fcol * 1.2, on * smoothstep(.5, .9, vW.x));
        vec3 rock = mix(vec3(.30, .25, .20), vec3(.56, .50, .42), fb(q * .6)) * (.8 + .3 * g3);
        vec3 moss = mix(vec3(.10, .25, .05), vec3(.26, .42, .10), g2) * (.8 + .35 * g3);
        vec3 dirt = mix(vec3(.30, .22, .13), vec3(.44, .35, .23), g3) * (.85 + .25 * g4);
        vec3 al = grass * vW.x + rock * vW.y + moss * vW.z + dirt * vW.w;
        gl_FragColor = vec4(fogged(lit(al, n, vL.y, vL.x), vP), 1.); }` });
  const top = new THREE.Mesh(topG, topM); top.name = 'isleTop'; G.add(top);

  /* ⑤-2 단 사이 세로 벽: 단의 둘레 선을 따라 위 단 높이에서 아래 단 높이까지 바위벽을 세움
     · 층층이 튀어나온 턱 · 바위 결 · 턱 위 이끼 · 흘러내린 젖은 줄 · 담쟁이 (늘인 삼각형 대신 진짜 벽) */
  const WP = [], WV = [], WI = [], IVY = [];
  const contour = A => { const pt = new Map(), nb = new Map(); const link = (a, b) => { (nb.get(a) || nb.set(a, []).get(a)).push(b); (nb.get(b) || nb.set(b, []).get(b)).push(a); };
    const ek = (i0, j0, i1, j1) => { const a = gi(i0, j0), b = gi(i1, j1), k = Math.min(a, b) + ',' + Math.max(a, b); if (!pt.has(k)) { const e0 = A[a], e1 = A[b], t = e0 / (e0 - e1); pt.set(k, [gx(i0) + (gx(i1) - gx(i0)) * t, gz(j0) + (gz(j1) - gz(j0)) * t]); } return k; };
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = A[gi(i, j)] >= 0, b = A[gi(i + 1, j)] >= 0, c = A[gi(i + 1, j + 1)] >= 0, d = A[gi(i, j + 1)] >= 0; if (a === b && b === c && c === d) continue;
      const E = []; if (a !== b) E.push(ek(i, j, i + 1, j)); if (b !== c) E.push(ek(i + 1, j, i + 1, j + 1)); if (c !== d) E.push(ek(i + 1, j + 1, i, j + 1)); if (d !== a) E.push(ek(i, j + 1, i, j));
      if (E.length === 2) link(E[0], E[1]);
      else if (E.length === 4) { const ctr = (A[gi(i, j)] + A[gi(i + 1, j)] + A[gi(i + 1, j + 1)] + A[gi(i, j + 1)]) / 4 >= 0; if (ctr === a) { link(E[0], E[1]); link(E[2], E[3]); } else { link(E[3], E[0]); link(E[1], E[2]); } } }
    const seen = new Set(), lines = []; const walk = s0 => { const L = [s0]; seen.add(s0); let cur = s0; for (;;) { const nx = (nb.get(cur) || []).find(q => !seen.has(q)); if (!nx) break; seen.add(nx); L.push(nx); cur = nx; } return L; };
    for (const [k, v] of nb) if (v.length === 1 && !seen.has(k)) lines.push(walk(k)); for (const k of nb.keys()) if (!seen.has(k)) { const L = walk(k); const a = pt.get(L[0]), z = pt.get(L[L.length - 1]); if (Math.hypot(a[0] - z[0], a[1] - z[1]) < 1) L.push(L[0]); lines.push(L); }   /* 고리는 끝이 처음과 가까울 때만 닫음 (멀리 건너뛰는 긴 벽이 생기지 않게) */
    return lines.map(L => L.map(k => pt.get(k))); };
  const resample = (L, sp) => { const out = [L[0]]; let acc = 0; for (let k = 1; k < L.length; k++) { const [ax, az] = L[k - 1], [bx, bz] = L[k]; let d = Math.hypot(bx - ax, bz - az), t0 = 0; while (acc + d * (1 - t0) >= sp) { const need = sp - acc; t0 += need / d; acc = 0; out.push([ax + (bx - ax) * t0, az + (bz - az) * t0]); } acc += d * (1 - t0); } if (acc > sp * .3) out.push(L[L.length - 1]); return out; };
  const leaf = (c, face, side, sz, col) => { const up = new THREE.Vector3(0, 1, 0), A = c.clone().addScaledVector(up, sz), B = c.clone().addScaledVector(side, sz * .8).addScaledVector(face, .06), C = c.clone().addScaledVector(up, -sz * .6), D = c.clone().addScaledVector(side, -sz * .8).addScaledVector(face, .06); IVY.push([[A, B, C, A, C, D], col]); };
  const IVYC = [lin(0x2f5f1c), lin(0x497a22), lin(0x3b6b1e)];
  F.TIERS.forEach((T, t) => { if (T.name === 'meadow') return;
    for (const raw of contour(SD[t])) { const Lr = resample(raw, .7); let seg = [];
      const flush = () => { if (seg.length < 2) { seg = []; return; } const Rn = Math.max(4, Math.min(24, Math.ceil(Math.max(...seg.map(q => q.top - q.bot)) / 1.15) + 1)), base = WP.length / 3;
        let along = 0; seg.forEach((q, i) => { if (i) along += Math.hypot(q.x - seg[i - 1].x, q.z - seg[i - 1].z);
          for (let r = 0; r < Rn; r++) { const f = r / (Rn - 1), y = q.top - (q.top - q.bot + .9) * f, sh = fbm(along * .25 + t * 7, y * .35, 3), big = fbm(along * .07 + t * 3, y * .06, 2);
            const led = Math.pow(Math.max(0, Math.sin(y * .62 + fbm(along * .05 + t, y * .1, 2) * 6 + big * 4)), 3) * (.4 + .6 * (fbm(along * .11, y * .2 + t, 2) * .5 + .5));   /* 턱: 높이 · 세기 제각각 (가지런한 층 무늬가 되지 않게) */
            const d = r === 0 ? 0 : r === 1 ? .12 + .1 * sh : .2 + .38 * (sh * .5 + .5) + .7 * led + .55 * (big * .5 + .5) + .12 * f;   /* 위 가장자리는 땅과 딱 맞물리고 · 큰 바위 덩이가 들쭉날쭉 튀어나옴 */
            WP.push(q.x + q.fx * d, y, q.z + q.fz * d); WV.push(f, d); } });
        for (let i = 0; i + 1 < seg.length; i++) for (let r = 0; r + 1 < Rn; r++) { const a = base + i * Rn + r, b = a + Rn; if (seg[i].s > 0) WI.push(a, a + 1, b, b, a + 1, b + 1); else WI.push(a, b, a + 1, b, b + 1, a + 1); }   /* 낮은 단 벽은 안쪽을 보므로 면 방향을 뒤집음 */
        seg.forEach((q, i) => { if (rnd() > .06) return; const face = new THREE.Vector3(q.fx, 0, q.fz), side = new THREE.Vector3(-q.fz, 0, q.fx), col = IVYC[(rnd() * 3) | 0], Lh = (q.top - q.bot) * (.25 + rnd() * .5);   /* 담쟁이: 턱에서 벽을 따라 늘어짐 */
          for (let yy = 0; yy < Lh; yy += .32) { const r = Math.min(Rn - 1, Math.round(yy / (q.top - q.bot + .9) * (Rn - 1))), k3 = (base + i * Rn + r) * 3; const c = new THREE.Vector3(WP[k3], q.top - yy - .1, WP[k3 + 2]).addScaledVector(face, .28).addScaledVector(side, ((yy / .32) % 2 ? 1 : -1) * .16);
            const sh = .7 + rnd() * .45; leaf(c, face, side, .17 + rnd() * .1, [col[0] * sh, col[1] * sh, col[2] * sh]); } });
        seg = []; };
      for (const [x, z] of Lr) { const e = .25, gxn = T.sd(x + e, z) - T.sd(x - e, z), gzn = T.sd(x, z + e) - T.sd(x, z - e), gl = Math.hypot(gxn, gzn) || 1, nx = -gxn / gl, nz = -gzn / gl;   /* 바깥 방향 */
        const Tin = F.tierAt(x - nx * .5, z - nz * .5), To = F.tierAt(x + nx * 1.2, z + nz * 1.2);
        if (!To || Tin !== T || To === T || F.mask(x, z) < .2) { flush(); continue; }
        const hin = T.h(x, z), hout = To.h(x, z), top = Math.max(hin, hout), bot = Math.min(hin, hout); if (top - bot < .5) { flush(); continue; }
        const s = hin > hout ? 1 : -1; if (seg.length && (seg[seg.length - 1].s !== s || Math.hypot(seg[seg.length - 1].x - x, seg[seg.length - 1].z - z) > 1.6)) flush(); seg.push({ x, z, top, bot, s, fx: nx * s, fz: nz * s }); }
      flush(); } });
  const wallG = new THREE.BufferGeometry(); wallG.setAttribute('position', new THREE.Float32BufferAttribute(WP, 3)); wallG.setAttribute('aV', new THREE.Float32BufferAttribute(WV, 2)); wallG.setIndex(WI); wallG.computeVertexNormals();
  const wallM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute vec2 aV; varying vec3 vP, vN; varying vec2 vV; void main(){ vP = position; vN = normal; vV = aV; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec3 vP, vN; varying vec2 vV;
      void main(){ vec3 n = normalize(vN), an = abs(n); an /= an.x + an.y + an.z;
        float tr = fb(vP.zy * .8) * an.x + fb(vP.xz * .8) * an.y + fb(vP.xy * .8) * an.z, tr2 = vn(vP.zy * 4.) * an.x + vn(vP.xz * 4.) * an.y + vn(vP.xy * 4.) * an.z;
        float band = sin(vP.y * 1.25 + tr * 7. + tr2 * 2.) * .5 + .5, crack = smoothstep(.05, 0., abs(vn(vec2(vP.x + vP.z, vP.y * 2.4) * 1.5) - .5));   /* 바위 층 결(굵고 들쭉날쭉) · 갈라진 틈 */
        float drip = smoothstep(.7, .9, vn(vec2((vP.x + vP.z) * 1.3, vP.y * .25))) * smoothstep(.5, .1, vV.x) * (1. - an.y);           /* 턱 아래로 짧게 흘러내린 젖은 자국 (위쪽에만 · 듬성듬성) */
        vec3 rock = mix(vec3(.38, .32, .26), vec3(.58, .51, .42), band) * (.66 + .5 * tr) * (.85 + .25 * tr2) * (1. - .5 * crack);
        rock = mix(rock, vec3(.14, .22, .09) * (.8 + .4 * tr2), drip * .45);
        float moss = smoothstep(.25, .6, n.y + (tr2 - .5) * .4) + smoothstep(.1, .0, vV.x) * .9;                                  /* 턱 위 · 맨 윗가장자리 이끼 */
        rock = mix(rock, mix(vec3(.10, .25, .05), vec3(.28, .44, .11), tr2), clamp(moss, 0., 1.));
        float ao = mix(1., .45, smoothstep(.55, 1., vV.x)) * (.75 + .25 * smoothstep(.0, .5, vV.y));                              /* 벽 밑 · 움푹한 곳 어둡게 */
        gl_FragColor = vec4(fogged(lit(rock, n, 1., ao), vP), 1.); }` });
  const walls = new THREE.Mesh(wallG, wallM); walls.name = 'walls'; G.add(walls);

  /* ⑥ 아래 바위 몸통: 섬 테두리에서 아래로 (테두리는 위 땅과 꼭 맞물림) · 거의 안 보이는 안쪽은 많이 줄임 */
  const { pos: bposTop, idx: BIDX, edge: isEdge } = clipMesh(Mg, (x, z) => F.top(x, z)); const NV = bposTop.length / 3, pos = bposTop;
  const bpos = new Float32Array(NV * 3), bL = new Float32Array(NV);
  for (let v = 0; v < NV; v++) { const x = pos[v * 3], z = pos[v * 3 + 2], m = Math.max(0, F.mask(x, z)), h = pos[v * 3 + 1]; bpos.set([x, isEdge[v] ? h : F.bottom(x, z, Math.min(h, Y.MEADOW + 1), m), z], v * 3); }
  let BI = new Uint32Array(BIDX.length); for (let q = 0; q < BIDX.length; q += 3) { BI[q] = BIDX[q]; BI[q + 1] = BIDX[q + 2]; BI[q + 2] = BIDX[q + 1]; }
  [BI] = MO.simplify(BI, bpos, 3, 0, .35, ['LockBorder', 'ErrorAbsolute']);
  const botG = new THREE.BufferGeometry(); botG.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); botG.setIndex(new THREE.BufferAttribute(BI, 1)); botG.computeVertexNormals();
  { const nn = botG.attributes.normal; for (let v = 0; v < NV; v++) { const x = bpos[v * 3], z = bpos[v * 3 + 2]; bL[v] = .55 + .45 * smoothstep(-1, .6, nn.getY(v) * -1 + .3) * (.7 + .3 * noise2(x * .2, z * .2)); } botG.setAttribute('aL', new THREE.BufferAttribute(bL, 1)); }
  const botM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute float aL; varying vec3 vP, vN; varying float vL; void main(){ vP = position; vN = normal; vL = aL; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec3 vP, vN; varying float vL;
      void main(){ vec3 n = normalize(vN); float band = sin(vP.y * 1.7 + fb(vP.xz * .12) * 6.) * .5 + .5, b2 = sin(vP.y * 5.3 + fb(vP.xz * .4) * 3.) * .5 + .5;
        vec3 rock = mix(vec3(.22, .18, .15), vec3(.46, .40, .33), band) * (.8 + .2 * b2) * (.75 + .4 * fb(vec2(vP.x + vP.z, vP.y) * .6));
        float top = smoothstep(${(Y.MEADOW - 3.5).toFixed(1)}, ${(Y.MEADOW - .5).toFixed(1)}, vP.y);                 /* 테두리 바로 밑은 이끼 · 흙 */
        rock = mix(rock, mix(vec3(.12, .24, .06), vec3(.30, .24, .15), vn(vP.xz * 2.)), top * .8);
        vec3 c = lit(rock, n, .8, vL) * mix(.55, 1., smoothstep(-60., -18., vP.y));
        gl_FragColor = vec4(fogged(c, vP), 1.); }` });
  const bot = new THREE.Mesh(botG, botM); bot.name = 'isleBottom'; G.add(bot);
  const fullT0 = fullT;

  /* ⑦ 물: 연못 · 물길 (얕으면 맑은 청록 · 깊으면 짙음 · 물가 거품 · 잔물결에 하늘빛) */
  { const wp = [], wd = [], wi = []; const idm = new Map(); const WS = .5;
    for (let z = Z0; z <= Z1; z += WS) for (let x = X0; x <= X1; x += WS) { const d = Y.WATER - hAt(x, z); if (d > -.35 && F.mask(x, z) > 0 && (F.pond(x, z) > -2 || F.chan(x, z) > -1.5)) { idm.set(x.toFixed(2) + ',' + z.toFixed(2), wp.length / 3); wp.push(x, Y.WATER, z); wd.push(d); } }
    const g = (x, z) => idm.get(x.toFixed(2) + ',' + z.toFixed(2));
    for (let z = Z0; z < Z1; z += WS) for (let x = X0; x < X1; x += WS) { const a = g(x, z), b = g(x + WS, z), c = g(x, z + WS), d = g(x + WS, z + WS); if ([a, b, c, d].every(v => v !== undefined)) wi.push(a, c, b, b, c, d); }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('aD', new THREE.Float32BufferAttribute(wd, 1)); wg.setIndex(wi);
    const wm = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
      vertexShader: `attribute float aD; varying float vD; varying vec3 vP; void main(){ vD = aD; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying float vD; varying vec3 vP;
        void main(){ vec2 q = vP.xz; float r = fb(q * .9 + vec2(uT * .25, -uT * .18)) + fb(q * 1.7 - vec2(uT * .2, uT * .31)) * .5;
          vec3 c = mix(vec3(.25, .62, .60), vec3(.04, .20, .28), smoothstep(.0, 1.6, vD)) * (.85 + .3 * r);
          float sky = smoothstep(.95, 1.25, r) * .5; c += vec3(.75, .88, 1.) * sky;                    /* 하늘이 비친 잔물결 */
          float foam = smoothstep(.22, .0, vD + (r - .7) * .12); c = mix(c, vec3(.92, .97, 1.), foam * .8);   /* 물가 거품 */
          float a = clamp(.55 + vD * .35, 0., .92) * smoothstep(-.3, .02, vD) + foam * .3;
          gl_FragColor = vec4(fogged(c * 1.15, vP), min(a, .95)); }` });
    const water = new THREE.Mesh(wg, wm); water.renderOrder = 2; water.name = 'water'; G.add(water); }

  /* ⑧ 나무: 줄기(굽은 원기둥 + 가지) + 잎 덩이(울퉁불퉁한 공 여럿) · 덩이 안쪽·아래는 어둡게 구움 · 바람에 끝이 흔들림 */
  const VEG = { v: `attribute vec3 color; attribute float aS; uniform float uT; uniform vec4 uPush; varying vec3 vC, vN, vP; varying float vS;
      void main(){ vec4 w = instanceMatrix * vec4(position, 1.); float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .23;
        w.xz += vec2(sin(uT * 1.3 + ph + position.y * .4), cos(uT * 1.1 + ph * 1.3)) * .07 * aS * aS * length(instanceMatrix[1].xyz);   /* 바람: 위로 갈수록 */
        { vec2 d = w.xz - uPush.xy; float r2 = dot(d, d), k = uPush.w * exp(-r2 / (uPush.z * uPush.z)); w.xz += d / sqrt(r2 + .5) * k * aS * min(2.5, length(instanceMatrix[1].xyz)); w.y -= k * aS * .25; }   /* 오르내리는 바람에 밀려 눕고 다시 일어남 */
        vC = color; vN = normalize(mat3(instanceMatrix) * normal); vP = w.xyz; vS = aS; gl_Position = projectionMatrix * viewMatrix * modelMatrix * w; }`,
    f: GL + `varying vec3 vC, vN, vP; varying float vS;
      void main(){ vec3 n = normalize(vN); vec3 an = abs(n); an /= an.x + an.y + an.z;
        float lf = (vn(vP.zy * 7.) * an.x + vn(vP.xz * 7.) * an.y + vn(vP.xy * 7.) * an.z) * .6 + (vn(vP.zy * 17.) * an.x + vn(vP.xz * 17.) * an.y + vn(vP.xy * 17.) * an.z) * .4;   /* 잎 뭉치 무늬 */
        float sp = step(.93, vn(vP.xz * 23. + vP.y * 11.));                                                                                   /* 햇빛 받은 잎 끝 */
        vec3 al = vC * mix(1., .6 + .75 * lf + sp * .35 * n.y, step(.01, vS));
        vec3 c = lit(al, n, 1., 1.); float back = pow(max(0., dot(-n, uSun)), 2.) * .25 * step(.01, vS); c += vC * vec3(1.1, 1.3, .6) * back;   /* 해를 등진 잎은 빛이 비쳐 보임 */
        gl_FragColor = vec4(fogged(c, vP), 1.); }` };
  const vegM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEG.v, fragmentShader: VEG.f });
  const tube = (pts, r0, r1, sides, col, sway0, sway1) => { const p = [], c = [], s = [], idx = []; const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    pts.forEach((q, k) => { const k1 = Math.min(pts.length - 1, k + 1), k0 = Math.max(0, k - 1); t.subVectors(pts[k1], pts[k0]).normalize(); a.crossVectors(t, Math.abs(t.y) > .9 ? new THREE.Vector3(1, 0, 0) : up).normalize(); b.crossVectors(t, a);
      const f = k / (pts.length - 1), r = r0 + (r1 - r0) * f; for (let e = 0; e <= sides; e++) { const an = e / sides * 6.283, ca = Math.cos(an), sa = Math.sin(an); p.push(q.x + (a.x * ca + b.x * sa) * r, q.y + (a.y * ca + b.y * sa) * r, q.z + (a.z * ca + b.z * sa) * r);
        const sh = .55 + .45 * f; c.push(col[0] * sh, col[1] * sh, col[2] * sh); s.push(sway0 + (sway1 - sway0) * f); } });
    for (let k = 0; k < pts.length - 1; k++) for (let e = 0; e < sides; e++) { const A = k * (sides + 1) + e, B = A + sides + 1; idx.push(A, B, A + 1, A + 1, B, B + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const blob = (cx, cy, cz, r, sq, col, ctr, R, sway, det = 1) => { const g = new THREE.IcosahedronGeometry(r, det); g.deleteAttribute('uv'); const p = g.attributes.position, c = [], s = [], v = new THREE.Vector3(), o = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = v.clone().normalize(); const d = 1 + .3 * noise2(n.x * 3.1 + cx * 7, n.y * 3.1 + n.z * 2.3 + cz * 5) + .14 * noise2(n.x * 7 + n.z * 3, n.y * 7 + cy);   /* 잎 뭉치 울퉁불퉁 */
      v.copy(n).multiplyScalar(r * d); v.y *= sq; v.x += cx; v.y += cy; v.z += cz; p.setXYZ(k, v.x, v.y, v.z);
      o.set(v.x - ctr.x, (v.y - ctr.y) * 1.3, v.z - ctr.z); const out = Math.min(1, o.length() / R), upk = .5 + .5 * n.y;
      const ao = (.38 + .62 * Math.pow(out, 1.4)) * (.62 + .38 * upk); c.push(col[0] * ao, col[1] * ao, col[2] * ao); s.push(sway); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1));
    { const nn = []; for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); o.set((v.x - cx) / r, (v.y - cy) / (r * sq), (v.z - cz) / r).normalize(); o.lerp(new THREE.Vector3(v.x - ctr.x, v.y - ctr.y, v.z - ctr.z).normalize(), .35).normalize(); nn.push(o.x, o.y, o.z); } g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); }   /* 매끈한 덩이 빛 (각진 면 없음) · 나무 전체로 둥글게 */
    return g; };
  const LEAF = [lin(0x3f7a22), lin(0x5b8f26), lin(0x2f6a2a), lin(0x6d9a2c)], BARK = lin(0x5a4330);
  const makeTree = (v, seed) => { const r = rngOf(seed), parts = [], H = [6.2, 5.0, 7.4, 4.2][v], lean = new THREE.Vector3((r() - .5) * .8, 0, (r() - .5) * .8);
    const trunk = []; for (let k = 0; k <= 6; k++) { const f = k / 6; trunk.push(new THREE.Vector3(lean.x * f * f + Math.sin(f * 3 + seed) * .12, f * H * .72, lean.z * f * f)); }
    parts.push(tube(trunk, .34 * H / 6, .12 * H / 6, 7, BARK, 0, .35));
    const top = trunk[6], ctr = new THREE.Vector3(top.x, H * .78, top.z), tips = [top.clone()];
    const nb = v === 2 ? 4 : 3; for (let k = 0; k < nb; k++) { const a = k / nb * 6.283 + r() * .8, base = trunk[3 + (k % 3)], L = H * (.28 + r() * .12);
      const tip = base.clone().add(new THREE.Vector3(Math.cos(a) * L, L * .55, Math.sin(a) * L)); const mid = base.clone().lerp(tip, .5).add(new THREE.Vector3(0, .25, 0));
      parts.push(tube([base, mid, tip], .1 * H / 6, .05 * H / 6, 5, BARK, .25, .6)); tips.push(tip); }
    const R = H * .42, col0 = LEAF[v]; const nClump = v === 2 ? 18 : 15;   /* 작은 잎 뭉치를 많이 겹쳐 둥근 공 대신 풍성한 잎 덩어리 */
    for (let k = 0; k < nClump; k++) { const t = tips[k % tips.length], j = new THREE.Vector3((r() - .5), (r() - .25) * .8, (r() - .5)).multiplyScalar(H * .3);
      const hue = .85 + r() * .3, col = [col0[0] * hue, col0[1] * (.9 + r() * .2), col0[2] * hue];
      parts.push(blob(t.x + j.x, t.y + j.y + H * .05, t.z + j.z, H * (.12 + r() * .06), .8, col, ctr, R, 1, 1)); }
    return mergeAll(parts); };
  const makeBush = (v, seed) => { const r = rngOf(seed), parts = [], ctr = new THREE.Vector3(0, .35, 0), col0 = [lin(0x3c7524), lin(0x557f2a)][v];
    for (let k = 0; k < 5; k++) { const a = r() * 6.283, d = r() * .55; const hue = .85 + r() * .3; parts.push(blob(Math.cos(a) * d, .35 + r() * .25, Math.sin(a) * d, .42 + r() * .2, .8, [col0[0] * hue, col0[1], col0[2] * hue], ctr, .9, .6, 1)); }
    return mergeAll(parts); };
  const mergeAll = parts => mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
  const inst = (geo, list, name) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, vegM, list.length), q = new THREE.Matrix4(), e = new THREE.Euler();
    list.forEach((t, k) => { q.compose(new THREE.Vector3(t.x, t.y - .15, t.z), new THREE.Quaternion().setFromEuler(e.set(0, t.r, 0)), new THREE.Vector3(t.s, t.s * (.9 + (k % 5) * .05), t.s)); m.setMatrixAt(k, q); });
    m.computeBoundingSphere(); m.name = name; G.add(m); };
  for (let v = 0; v < 4; v++) inst(makeTree(v, 11 + v * 7), trees.filter(t => t.v === v), 'trees' + v);
  for (let v = 0; v < 2; v++) inst(makeBush(v, 91 + v * 5), bushes.filter(t => t.v === v), 'bush' + v);

  /* ⑨ 풀 포기: 가장자리 · 절벽 턱 · 나무 밑에 모여 남 (평평한 풀밭은 칠로 충분) */
  { const bl = [], c = [], s = []; for (let k = 0; k < 6; k++) { const a = k * 1.05 + (k % 2) * .3, lx = Math.cos(a), lz = Math.sin(a), h = .45 + (k % 3) * .14, w = .05;
      bl.push(-lz * w, 0, lx * w, lz * w, 0, -lx * w, lx * h * .45, h, lz * h * .45); c.push(.08, .2, .04, .08, .2, .04, .42, .62, .16); s.push(0, 0, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals();
    const L2 = []; for (let k = 0; k < 30000 && L2.length < 2600; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (F.mask(x, z) < .3) continue; const n = nAt(x, z, .3); if (n.y < .66) continue; const h = hAt(x, z); if (h < Y.WATER + .1) continue;
      const edge = F.mask(x, z) < 2.5 || nAt(x + 1, z, .6).y < .6 || nAt(x - 1, z, .6).y < .6 || nAt(x, z + 1, .6).y < .6 || nAt(x, z - 1, .6).y < .6, near = !farFrom(trees, x, z, 3.2) || F.pond(x, z) > -2.5;
      if (!edge && !near && rnd() > .1) continue; L2.push({ x, z, y: h + .02, s: .7 + rnd() * .8, r: rnd() * 6.283 }); }
    const m = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEG.v, fragmentShader: GL + `varying vec3 vC, vN, vP; varying float vS; void main(){ vec3 c = lit(vC, vec3(0., 1., 0.), 1., 1.); gl_FragColor = vec4(fogged(c, vP), 1.); }`, side: THREE.DoubleSide }), L2.length);
    const q = new THREE.Matrix4(); L2.forEach((t, k) => { q.compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r), new THREE.Vector3(t.s, t.s, t.s)); m.setMatrixAt(k, q); });
    m.computeBoundingSphere(); m.name = 'grass'; G.add(m); }

  /* ⑩ 늘어진 뿌리 · 담쟁이: 섬 테두리 밑과 고원 절벽에 늘어짐 (위아래 깊이 · 오래된 섬 느낌) */
  { const parts = [], ROOT = lin(0x4b3a28), RIVY = [lin(0x2f5f1c), lin(0x497a22)];
    const edgeV = []; for (let v = 0; v < NV; v++) if (isEdge[v] && rnd() < .07) edgeV.push(v);
    for (const v of edgeV) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], n = nAt(x, z, 1.5), out = new THREE.Vector3(n.x, 0, n.z); if (out.lengthSq() < 1e-4) out.set(x, 0, z); out.normalize();
      const Lh = 2 + rnd() * rnd() * 9, pts = []; for (let k = 0; k <= 7; k++) { const f = k / 7; pts.push(new THREE.Vector3(x + out.x * (.15 + Math.sin(f * 3.1) * .5 * rnd()) , y - .3 - f * Lh, z + out.z * (.15 + Math.sin(f * 3.1) * .5)).add(new THREE.Vector3(Math.sin(f * 4 + v) * .25, 0, Math.cos(f * 3 + v) * .25))); }
      parts.push(tube(pts, .16 + rnd() * .12, .03, 5, rnd() < .45 ? RIVY[0] : ROOT, .2, 1)); }
    { const p = [], c = [], sw = []; for (const [Q, col] of IVY) for (const q of Q) { p.push(q.x, q.y, q.z); c.push(...col); sw.push(.4); }   /* 벽에서 만든 담쟁이 잎 */
      if (p.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sw, 1)); g.computeVertexNormals(); parts.push(g); } }
    const g = mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)); const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 color; attribute float aS; uniform float uT; varying vec3 vC, vN, vP; void main(){ vec3 p = position; p.xz += vec2(sin(uT * .9 + p.x * .3 + p.y * .2), cos(uT * .7 + p.z * .3)) * .05 * aS; vC = color; vN = normal; vP = p; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
      fragmentShader: GL + `varying vec3 vC, vN, vP; void main(){ vec3 n = normalize(vN); n *= sign(dot(n, uSun) + .3); gl_FragColor = vec4(fogged(lit(vC, n, 1., .9), vP), 1.); }` })); m.name = 'roots'; G.add(m); }

  /* ⑪ 다리: 고원 끝에서 돌탑까지 (기체가 그 밑으로 날아 지나감) · 널빤지 하나하나 다르게 · 밧줄 */
  {
    const A0 = new THREE.Vector3(-14, 0, -20), B0 = new THREE.Vector3(SPOT.spires[0][0], 0, SPOT.spires[0][1]);
    const rim = (from, to, minH) => { const d = new THREE.Vector3().subVectors(to, from); let q = from.clone(); for (let t = 0; t <= 1; t += .005) { const x = from.x + d.x * t, z = from.z + d.z * t; if (hAt(x, z) < minH) break; q.set(x, 0, z); } return q; };   /* 꼭대기 가장자리 (절벽 밑이 아니라) */
    const A = rim(A0, B0, Y.PLATEAU - .7), B = rim(B0, A0, SPOT.spires[0][3] - 1.6); A.y = hAt(A.x, A.z) + .02; B.y = Math.min(hAt(B.x, B.z), A.y + 1.4) + .02;
    const parts = [], WOOD = lin(0x7a5a38), ROPE = lin(0x8a7350), r = rngOf(77), dir = new THREE.Vector3().subVectors(B, A), len = dir.length(); dir.normalize(); const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const at = t => new THREE.Vector3().lerpVectors(A, B, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * len * .07, 0));
    const N = Math.round(len / .42); for (let k = 0; k < N; k++) { if (r() < .05 && k > 2 && k < N - 3) continue; const t = (k + .5) / N, p = at(t), q = at(t + .01), sl = Math.atan2(q.y - p.y, .01 * len);
      const g = new THREE.BoxGeometry(.34, .07, 1.5 + (r() - .5) * .25); g.deleteAttribute('uv'); g.rotateZ(sl); g.rotateY(Math.atan2(-dir.z, dir.x)); g.rotateY((r() - .5) * .08); g.translate(p.x, p.y + (r() - .5) * .03, p.z);
      const sh = .7 + r() * .45, col = [WOOD[0] * sh, WOOD[1] * sh, WOOD[2] * sh], c = []; for (let e = 0; e < g.attributes.position.count; e++) c.push(...col); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(0), 1)); parts.push(g.toNonIndexed()); }
    for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 24; k++) { const t = k / 24, p = at(t); pts.push(p.add(side.clone().multiplyScalar(sd * .78)).add(new THREE.Vector3(0, .85 - Math.sin(t * Math.PI) * .15, 0))); } parts.push(tube(pts, .035, .035, 4, ROPE, 0, 0).toNonIndexed());
      for (let k = 1; k < 12; k++) { const t = k / 12, p = at(t).add(side.clone().multiplyScalar(sd * .76)); parts.push(tube([p, p.clone().add(new THREE.Vector3(0, .85 - Math.sin(t * Math.PI) * .15, 0))], .02, .02, 3, ROPE, 0, 0).toNonIndexed()); }
      for (const E of [A, B]) { const p = E.clone().add(side.clone().multiplyScalar(sd * .8)); parts.push(tube([p.clone().add(new THREE.Vector3(0, -.3, 0)), p.clone().add(new THREE.Vector3(0, 1.15, 0))], .09, .07, 6, WOOD, 0, 0).toNonIndexed()); } }
    const g = mergeGeometries(parts.map(q => { for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'color', 'aS'].includes(k)) q.deleteAttribute(k); return q; })); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: `attribute vec3 color; varying vec3 vC, vN, vP; void main(){ vC = color; vN = normal; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec3 vC, vN, vP; void main(){ vec3 n = normalize(vN); float gr = vn(vec2(vP.x + vP.z, vP.y) * 14.) * .3 + .85; gl_FragColor = vec4(fogged(lit(vC * gr, n, 1., .95), vP), 1.); }` }));
    m.name = 'bridge'; G.add(m); G.userData.bridge = { A, B };
    for (let t = 0; t <= 1.001; t += .04) { const p = at(t); F.obstacles.push([p.x, p.y + .35, p.z, 1.05]); } }   /* 다리: 2층은 밑으로 · 3층은 위로 · 그 높이만 막힘 */

  /* ⑫-0 돌 아치: 땅에서 솟아 휘어 넘어가는 바위 띠 — 2층은 그 밑으로 빠져나가고, 다리 · 돌탑과 함께 2층의 장애물 */
  { const parts = [];
    for (const [ax, az, bx, bz, apex] of SPOT.arches) { const pts = [], N = 26, ra = [];
      for (let k = 0; k <= N; k++) { const f = k / N, x = ax + (bx - ax) * f, z = az + (bz - az) * f, g = hAt(x, z), base = Math.min(hAt(ax, az), hAt(bx, bz)) - 1.2, sn = Math.pow(Math.sin(f * Math.PI), .75);
        const y = base + (apex - base) * sn; pts.push(new THREE.Vector3(x, y, z)); ra.push(2.3 - 1. * sn); }
      const sides = 10, p = [], idx = [], t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      pts.forEach((q, k) => { t.subVectors(pts[Math.min(N, k + 1)], pts[Math.max(0, k - 1)]).normalize(); a.crossVectors(t, up).normalize(); if (a.lengthSq() < .5) a.set(1, 0, 0); b.crossVectors(a, t);
        for (let e = 0; e <= sides; e++) { const an = e / sides * 6.283, ca = Math.cos(an), sa = Math.sin(an), r = ra[k] * (1 + .22 * noise2(k * .7 + ax, e * .9) + .1 * noise2(k * 2.1, e * 2.3 + az)) * (Math.abs(ca) > .7 ? 1.18 : 1);   /* 울퉁불퉁 · 납작한 바위 띠 */
          p.push(q.x + (a.x * ca + b.x * sa) * r, q.y + (a.y * ca + b.y * sa) * r, q.z + (a.z * ca + b.z * sa) * r); } });
      for (let k = 0; k < N; k++) for (let e = 0; e < sides; e++) { const A = k * (sides + 1) + e, B = A + sides + 1; idx.push(A, B, A + 1, A + 1, B, B + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); parts.push(g);
      pts.forEach((q, k) => { if (k % 2 === 0) F.obstacles.push([q.x, q.y, q.z, ra[k] * 1.1]); }); }
    const m = new THREE.Mesh(mergeGeometries(parts), new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: `varying vec3 vP, vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec3 vP, vN; void main(){ vec3 n = normalize(vN), an = abs(n); an /= an.x + an.y + an.z;
        float tr = fb(vP.zy * .9) * an.x + fb(vP.xz * .9) * an.y + fb(vP.xy * .9) * an.z, tr2 = vn(vP.zy * 4.) * an.x + vn(vP.xz * 4.) * an.y + vn(vP.xy * 4.) * an.z;
        float band = sin(vP.y * 2.4 + tr * 5.) * .5 + .5; vec3 rock = mix(vec3(.30, .25, .20), vec3(.58, .51, .42), band) * (.7 + .45 * tr) * (.85 + .25 * tr2);
        float moss = smoothstep(.35, .75, n.y + (tr2 - .5) * .5); rock = mix(rock, mix(vec3(.12, .27, .06), vec3(.30, .45, .12), tr2), moss);   /* 위쪽 면엔 이끼 */
        float ao = .55 + .45 * smoothstep(-.8, .4, n.y); gl_FragColor = vec4(fogged(lit(rock, n, 1., ao), vP), 1.); }` }));
    m.name = 'arches'; G.add(m); }

  /* ⑫ 폭포 두 줄기: 고원에서 연못으로 · 물길 끝에서 섬 밖 안개 속으로 — 물줄기 결이 흘러내리고 아래는 흩어짐 */
  const FX = new THREE.Group(); G.add(FX); const fallM = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float aV; attribute float aU; varying vec2 vU; varying vec3 vP; void main(){ vU = vec2(aU, aV); vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec2 vU; varying vec3 vP;
      void main(){ float x = vU.x, v = vU.y; float s = vn(vec2(x * 9., v * 1.2 - uT * 2.6)) * .6 + vn(vec2(x * 23., v * 3. - uT * 4.1)) * .4;   /* 흘러내리는 물줄기 결 */
        float edge = smoothstep(0., .18, x) * smoothstep(1., .82, x), a = (.35 + .65 * smoothstep(.3, .8, s)) * edge;
        a *= smoothstep(0., .04, v) * (1. - smoothstep(.75, 1., v) * .7);
        vec3 c = mix(vec3(.62, .82, .9), vec3(1.), smoothstep(.45, .85, s)) * 1.25;
        gl_FragColor = vec4(fogged(c, vP), a * .85); }` });
  const fall = (P0, out, H, w, wid) => { const p = [], u = [], vv = [], ix = [], side = new THREE.Vector3(-out.z, 0, out.x), N = 22;
    for (let k = 0; k <= N; k++) { const f = k / N, c = P0.clone().addScaledVector(out, (2.6 * Math.sqrt(f) + 1.2 * f) * w).add(new THREE.Vector3(0, -H * f, 0)), ww = wid * (1 + f * .6);
      for (const e of [0, 1]) { const q = c.clone().addScaledVector(side, (e - .5) * ww); p.push(q.x, q.y, q.z); u.push(e); vv.push(f * H / 8); } }
    for (let k = 0; k < N; k++) { const a = k * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1)); g.setAttribute('aV', new THREE.Float32BufferAttribute(vv.map((x, i) => x / (H / 8)), 1)); g.setIndex(ix);
    const m = new THREE.Mesh(g, fallM); m.renderOrder = 3; FX.add(m); };
  /* 고원 남쪽 가장자리에서 연못에 가장 가까운 곳 */
  let best = null; for (let a = 0; a < 6.283; a += .02) { for (let d = 0; d < 30; d += .2) { const x = SPOT.pond[0] + Math.cos(a) * d, z = SPOT.pond[1] + Math.sin(a) * d; if (F.plateau(x, z) > .4 && F.tierAt(x, z)?.name === 'plateau') { if (!best || d < best.d) best = { d, x, z }; break; } } }
  const fallSpots = [];
  if (best) { const n = nAt(best.x - (best.x - SPOT.pond[0]) * .15, best.z - (best.z - SPOT.pond[1]) * .15, 1.5), out = new THREE.Vector3(SPOT.pond[0] - best.x, 0, SPOT.pond[1] - best.z).normalize(); const P0 = new THREE.Vector3(best.x, hAt(best.x, best.z) + .1, best.z);
    for (const [w, wid] of [[1, 2.2], [.8, 1.4], [1.15, 1.1]]) fall(P0.clone().addScaledVector(new THREE.Vector3(-out.z, 0, out.x), (wid - 1.6) * .6), out, P0.y - Y.WATER, w, wid);
    fallSpots.push(P0.clone().addScaledVector(out, 1.6).setY(Y.WATER + .2)); }
  { const [ax, az, bx, bz] = SPOT.channel; let ex = ax, ez = az; for (let t = 0; t <= 1; t += .005) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (F.mask(x, z) < .2) break; ex = x; ez = z; }
    const out = new THREE.Vector3(bx - ax, 0, bz - az).normalize(), P0 = new THREE.Vector3(ex, Y.WATER, ez); for (const [w, wid] of [[1.3, 2], [1, 1.4]]) fall(P0, out, 52, w, wid); fallSpots.push(P0.clone().addScaledVector(out, 2.5).setY(Y.WATER - 40)); }

  /* ⑬ 안개: 폭포 밑 물보라 · 섬 아래 · 구름 띠 (흐릿한 덩이가 천천히 흘러감) */
  { const L3 = []; for (const s of fallSpots) for (let k = 0; k < 10; k++) L3.push([s.x + (rnd() - .5) * 4.5, s.y + .3 + rnd() * 2.2, s.z + (rnd() - .5) * 4.5, 1.8 + rnd() * 2.4, .9]);   /* 물보라 */
    for (let k = 0; k < 26; k++) { const a = rnd() * 6.283, d = 18 + rnd() * 30; L3.push([Math.cos(a) * d, -40 - rnd() * 30, Math.sin(a) * d, 11 + rnd() * 12, .5]); }
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.283, d = 40 + rnd() * 20; L3.push([Math.cos(a) * d, -24 - rnd() * 10, Math.sin(a) * d, 8 + rnd() * 7, .35]); }
    const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(L3.flatMap(q => [q[0], q[1], q[2]])), 3)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(new Float32Array(L3.flatMap(q => [q[3], q[4]])), 2)); g.instanceCount = L3.length;
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 iP; attribute vec2 iS; uniform float uT; varying vec2 vU; varying float vA, vS; void main(){ vU = position.xy; vA = iS.y; vS = iS.x;
        vec3 c = iP + vec3(sin(uT * .05 + iP.z) * 2., sin(uT * .3 + iP.x) * .3, cos(uT * .04 + iP.x) * 2.);
        vec4 mv = viewMatrix * modelMatrix * vec4(c, 1.); mv.xy += position.xy * iS.x * length(modelMatrix[0].xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL + `varying vec2 vU; varying float vA, vS; void main(){ float r = length(vU), n = fb(vU * 1.3 + vec2(uT * .03, vS)); float a = smoothstep(1., .2, r) * (.35 + .65 * n) * vA;
        gl_FragColor = vec4(vec3(.86, .92, .97), a * .7); }` })); m.frustumCulled = false; m.renderOrder = 4; FX.add(m); }

  /* ⑭ 작은 빛: 숲 · 연못 · 폭포 둘레에 떠다니는 빛 알갱이 (신비로움) — 깜빡이며 천천히 오르내림 */
  { const L4 = []; const pick = (cx, cz, r, n, y0, y1) => { for (let k = 0; k < n; k++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (F.mask(x, z) < 0) continue; L4.push(x, hAt(x, z) + y0 + rnd() * (y1 - y0), z, rnd()); } };
    for (const [cx, cz, r] of SPOT.forest) pick(cx, cz, r + 2, 26, .6, 4.5); pick(SPOT.pond[0], SPOT.pond[1], 9, 30, .3, 3); if (best) pick(best.x, best.z, 6, 16, 1, 9);
    const g = new THREE.BufferGeometry(); const a = new Float32Array(L4); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L4.length / 4 * 3), 3)); g.setAttribute('iP', new THREE.BufferAttribute(a, 4));
    for (let k = 0; k < L4.length / 4; k++) g.attributes.position.setXYZ(k, L4[k * 4], L4[k * 4 + 1], L4[k * 4 + 2]);
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...U, uPx: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 iP; uniform float uT, uPx; varying float vA, vK; void main(){ float ph = iP.w * 40.; vec3 p = position + vec3(sin(uT * .4 + ph) * .6, sin(uT * .7 + ph * 1.3) * .5, cos(uT * .35 + ph) * .6);
        vA = .55 + .45 * sin(uT * (1.5 + iP.w * 2.) + ph); vK = iP.w; vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * .16 * length(modelMatrix[0].xyz) / -mv.z; }`,
      fragmentShader: `varying float vA, vK; void main(){ vec2 q = gl_PointCoord - .5; float r = dot(q, q); float k = exp(-r * 28.) + exp(-r * 260.) * 1.5;
        vec3 c = mix(vec3(1., .9, .55), vec3(.6, 1., .85), step(.6, vK)); gl_FragColor = vec4(c * k * vA * 1.4, 1.); }` }));
    m.frustumCulled = false; m.renderOrder = 6; m.name = 'motes'; FX.add(m); G.userData.motes = m; }

  /* 바탕: 맑은 하늘 + 저 아래 구름 바다 (섬이 떠 있는 높이가 느껴지게) */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: GL + `varying vec3 vD; void main(){ float y = vD.y; vec3 c = mix(vec3(.66, .80, .92), vec3(.32, .54, .84), smoothstep(0., .6, y));
      vec3 deep = mix(vec3(.46, .62, .80), vec3(.24, .40, .64), smoothstep(-.05, -.8, y));                 /* 아래: 저 멀리 깊은 하늘빛 */
      vec2 q = vD.xz / max(.06, -y) * 2.; float cl = fb(q * .35 + vec2(uT * .006, 0.)) * .65 + fb(q * 1.3 - vec2(0., uT * .01)) * .35;   /* 구름 바다: 덩이 사이로 깊은 하늘이 보임 */
      vec3 cloud = mix(vec3(.80, .86, .93), vec3(.98, .99, 1.), smoothstep(.55, .85, cl));
      deep = mix(deep, cloud, smoothstep(.48, .62, cl) * smoothstep(-.02, -.25, y));
      c = y > 0. ? c : mix(vec3(.66, .78, .90), deep, smoothstep(0., -.12, y));
      gl_FragColor = vec4(c, 1.); }` })); sky.renderOrder = -10; sky.frustumCulled = false; sky.name = 'sky';   /* 하늘은 섬 크기와 상관없이 카메라를 감쌈 (섬 무리에 넣지 않음) */

  G.scale.setScalar(K);   /* 모양 · 무늬 · 안개 높이는 섬 안 좌표로 계산하고 통째로 줄임 → 들꽃 · 잎 무늬까지 같이 작아짐 */
  G.traverse(o => { if (o.isMesh || o.isPoints) { st.draws++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; st.tris += o.isInstancedMesh ? n * o.count : o.isPoints ? 0 : (g.instanceCount ? n * g.instanceCount : n); } });
  st.ground = { full: fullT0, kept: TI.length / 3, walls: WI.length / 3, bottom: BI.length / 3 }; st.trees = trees.length; st.bushes = bushes.length;
  return { group: G, K, field: F, H: (x, z) => hAt(x / K, z / K) * K, mask: (x, z) => F.mask(x / K, z / K) * K, blocked: (x, z, L = 1) => F.blocked(x / K, z / K, L), layers: LAYERS.map(y => y * K), push: (x, z, r, k) => U.uPush.value.set(x / K, z / K, r / K, k / K), stats: st, sky, setPx: px => { G.userData.motes.material.uniforms.uPx.value = px; }, update: t => { U.uT.value = t; } };
}
