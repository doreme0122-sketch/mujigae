/* 새 초원 섬 하나 (2026-11-10 · 첫 시험) — 모양은 islefield.js, 여기서는 보이는 것을 만듦
   느낌: 신비로움(안개 사이 작은 빛) · 풍성함(이끼 · 나무 · 물) · 깊이(위아래 겹겹) · 맑은 낮빛
   가볍게 만드는 법:
   · 진짜 불빛 없음 — 해 · 하늘빛 · 그늘(오목한 곳 · 나무 밑 · 해 가림)을 로딩 때 꼭짓점마다 구워 두고 화면 칸에서는 무늬만 그림
   · 같은 것끼리 한 번에 그림 (나무 종류마다 한 번 · 풀 한 번 · 안개 한 번 · 빛 알갱이 한 번)
   · 땅은 촘촘히 만든 뒤 평평한 곳만 줄임 (절벽 · 가장자리 모양은 그대로) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js';
import { makeField, Y, SPOT, LAYERS, fbm, noise2, smoothstep } from './islefield.js?v=11101629';

const SUN = new THREE.Vector3(-.45, .78, .44).normalize();   /* 왼쪽 위 앞에서 (카메라 쪽 절벽 면이 비스듬히 빛을 받아 결이 드러남) */
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };   /* three가 색을 선형으로 바꿔 줌 */

/* 칠 공통: 잡음 · 구운 빛 · 아래로 갈수록 안개 */
const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT; uniform sampler2D uRay; uniform vec2 uVC; uniform float uVR, uK, uVOn;   /* uRay: 보이는 칸 지도 · uVC: 지도 왼쪽 위 모서리(세상 좌표) · uVR: 지도 한 변 길이 */
const vec3 SUNC = vec3(1.55, 1.45, 1.28), SKYC = vec3(.50, .62, .80), GNDC = vec3(.20, .22, .12), MIST = vec3(.50, .64, .80);
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
/* 시야 (2D 좌표 · 사용자 2026-11-10): 높이와 상관없이 그 자리의 x, z가 시야 안이면 밝고 밖이면 어둠 — 땅 · 절벽 · 나무 · 물 모두 자기 자리로 */
float seen(vec3 lp){ vec2 uv = (lp.xz * uK - uVC) / uVR; float v = texture2D(uRay, uv).r; return mix(1., v * step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.), uVOn); }   /* 칸 지도(번지게 한 것)에서 그 자리 x, z 값을 읽음 */
vec3 fogged(vec3 c, vec3 wp){ float k = smoothstep(-16., -64., wp.y); c = mix(c, MIST, k * .85); return mix(c * vec3(.13, .15, .24), c, seen(wp)); }
`;
const U = { uSun: { value: SUN }, uT: { value: 0 }, uPush: { value: new THREE.Vector4(0, 0, 1, 0) }, uRay: { value: null }, uVC: { value: new THREE.Vector2() }, uVR: { value: 12 }, uK: { value: 1 }, uVOn: { value: 0 } };   /* uPush: 기체가 오르내릴 때 밑의 풀·덤불을 미는 바람 (x, z, 반지름, 세기 · 섬 안 단위) */

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
  /* ② 낮은 식물 자리 (사용자 2026-11-10: 나무 한 그루씩은 부쉬와 헷갈려서 넣지 않음 → 숨을 수 없다는 게 한눈에 보이는 낮은 식물로)
     · 고사리: 절벽 밑 · 돌탑 둘레 · 연못가 · 부쉬 가장자리 그늘 / 꽃무더기: 풀밭에 무리 지어 / 이끼 돌: 절벽 밑 · 풀밭 군데군데 */
  const plants = [];
  const farFrom = (L, x, z, d) => L.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > d * d);
  const okAt = (x, z, lim) => F.mask(x, z) > 1.2 && nAt(x, z, .5).y > lim && F.pond(x, z) < -.8 && F.chan(x, z) < -.6 && F.brush(x, z) < -.4;
  const nearCliff = (x, z) => nAt(x + 1.6, z, .8).y < .6 || nAt(x - 1.6, z, .8).y < .6 || nAt(x, z + 1.6, .8).y < .6 || nAt(x, z - 1.6, .8).y < .6;
  for (let k = 0; k < 20000 && plants.filter(p => p.v === 'fern').length < 420; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .72)) continue;
    const want = nearCliff(x, z) || F.pond(x, z) > -3.5 || F.brush(x, z) > -2.2; if (!want && rnd() > .06) continue; if (!farFrom(plants, x, z, .7)) continue;
    plants.push({ x, z, y: hAt(x, z), s: .75 + rnd() * .6, r: rnd() * 6.283, v: 'fern' }); }
  for (let k = 0; k < 20000 && plants.filter(p => p.v.startsWith('fl')).length < 260; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .85)) continue;
    const pat = fbm(x * .07 + 11, z * .07, 3); if (pat < .12 && rnd() > .04) continue; if (!farFrom(plants, x, z, .55)) continue;   /* 꽃은 무리 지어 핌 */
    plants.push({ x, z, y: hAt(x, z), s: .7 + rnd() * .5, r: rnd() * 6.283, v: 'fl' + (fbm(x * .05, z * .05 + 3, 2) > .1 ? 0 : fbm(x * .05 + 9, z * .05, 2) > 0 ? 1 : 2) }); }
  for (let k = 0; k < 20000 && plants.filter(p => p.v === 'stone').length < 80; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .6)) continue;
    if (!nearCliff(x, z) && rnd() > .25) continue; if (!farFrom(plants, x, z, 1)) continue;
    plants.push({ x, z, y: hAt(x, z), s: .35 + rnd() * rnd() * .9, r: rnd() * 6.283, v: 'stone' }); }

  /* ③ 빛 굽기: 오목한 곳(사방 땅이 얼마나 막는지) · 해 가림(해 쪽으로 걸어가며 땅에 막히는지) · 나무 밑 그늘 */
  const AOg = new Float32Array(NX * NZ), SHg = new Float32Array(NX * NZ);
  const DIRS = Array.from({ length: 10 }, (_, k) => [Math.cos(k * .6283), Math.sin(k * .6283)]), sx = SUN.x / Math.hypot(SUN.x, SUN.z), sz = SUN.z / Math.hypot(SUN.x, SUN.z), slope = SUN.y / Math.hypot(SUN.x, SUN.z);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = gi(i, j); if (Mg[k] < -1.5) continue; const x = gx(i), z = gz(j), h = Hg[k];
    let oc = 0; for (const [dx, dz] of DIRS) { let m = 0; for (const r of [.8, 2, 4.5, 9]) { const hh = Mg[gi(Math.min(NX - 1, Math.max(0, i + Math.round(dx * r / S))), Math.min(NZ - 1, Math.max(0, j + Math.round(dz * r / S))))] > -1.5 ? hAt(x + dx * r, z + dz * r) : -99; m = Math.max(m, (hh - h) / r); } oc += Math.min(1, Math.max(0, m)); }
    AOg[k] = 1 - .62 * oc / DIRS.length;
    let s = 1; for (let d = .6; d < 26; d += .6) { const hx = x + sx * d, hz = z + sz * d; if (F.mask(hx, hz) < -.5) break; const hh = hAt(hx, hz); if (hh > h + d * slope + .25) { s = Math.max(.12, 1 - (d < 3 ? .6 : .85)); break; } }
    SHg[k] = s; }
  const treeShade = (x, z) => 1 - .4 * smoothstep(-1.6, .2, F.brush(x, z));   /* 부쉬 가장자리 밑 그늘 */

  /* ④ 땅 그물: 칸을 삼각형으로 나누고, 섬 밖에 걸친 삼각형은 가장자리에서 잘라 매끈한 테두리 */
  const P = [], key = new Map(), isEdge = [];
  const vGrid = (i, j) => { const k = 'g' + i + ',' + j; if (key.has(k)) return key.get(k); const id = P.length / 3; P.push(gx(i), Hg[gi(i, j)], gz(j)); isEdge.push(0); key.set(k, id); return id; };
  const vCut = (i0, j0, i1, j1) => { const a = gi(i0, j0) < gi(i1, j1) ? [i0, j0, i1, j1] : [i1, j1, i0, j0], k = 'e' + a.join(','); if (key.has(k)) return key.get(k);
    const m0 = Mg[gi(a[0], a[1])], m1 = Mg[gi(a[2], a[3])], t = m0 / (m0 - m1), x = gx(a[0]) + (gx(a[2]) - gx(a[0])) * t, z = gz(a[1]) + (gz(a[3]) - gz(a[1])) * t;
    const id = P.length / 3; P.push(x, F.top(x, z), z); isEdge.push(1); key.set(k, id); return id; };
  const IDX = [];
  const tri = (A, B, C) => { const T = [A, B, C], inn = T.map(([i, j]) => Mg[gi(i, j)] >= 0); const n = inn.filter(Boolean).length; if (!n) return;
    if (n === 3) { IDX.push(vGrid(...A), vGrid(...B), vGrid(...C)); return; }
    const poly = []; for (let q = 0; q < 3; q++) { const a = T[q], b = T[(q + 1) % 3]; if (inn[q]) poly.push(vGrid(...a)); if (inn[q] !== inn[(q + 1) % 3]) poly.push(vCut(...a, ...b)); }
    for (let q = 1; q + 1 < poly.length; q++) IDX.push(poly[0], poly[q], poly[q + 1]); };
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { if ((i + j) & 1) { tri([i, j], [i, j + 1], [i + 1, j]); tri([i + 1, j], [i, j + 1], [i + 1, j + 1]); } else { tri([i, j], [i, j + 1], [i + 1, j + 1]); tri([i, j], [i + 1, j + 1], [i + 1, j]); } }
  const NV = P.length / 3, pos = new Float32Array(P);

  /* ⑤ 위 땅 칠 정보 (풀 · 바위 · 이끼 · 흙의 섞임) · 구운 빛 */
  const nrm = new Float32Array(NV * 3), W = new Float32Array(NV * 4), L = new Float32Array(NV * 2);
  for (let v = 0; v < NV; v++) { const x = pos[v * 3], h = pos[v * 3 + 1], z = pos[v * 3 + 2], n = nAt(x, z, .34); nrm.set([n.x, n.y, n.z], v * 3);
    const u = Math.min(NX - 1, Math.max(0, Math.round((x - X0) / S))), w = Math.min(NZ - 1, Math.max(0, Math.round((z - Z0) / S))), k = gi(u, w);
    const flat = smoothstep(.62, .82, n.y), wet = Math.max(smoothstep(-3.5, 0, F.pond(x, z)), smoothstep(-2.5, 0, F.chan(x, z))), m = F.mask(x, z);
    const ledge = (1 - flat) * smoothstep(.2, .55, n.y), base = smoothstep(-2.2, -.3, -Math.abs(F.plateau(x, z) + 2.2)) * flat * .7;   /* 절벽 턱 · 절벽 밑 */
    let gr = flat * (1 - .55 * wet), rk = (1 - flat) * (1 - .75 * ledge), ms = ledge + .8 * wet * (1 - flat) + .25 * wet * flat + (1 - smoothstep(0, 1.6, m)) * .4,
      dt = base + .55 * smoothstep(-1.2, 0, F.pond(x, z)) * flat + .35 * smoothstep(.55, .72, fbm(x * .06 + 3, z * .06, 3) * .5 + .5) * flat;
    if (h < Y.WATER + .15 && (F.pond(x, z) > -1 || F.chan(x, z) > -.5)) { dt += .6; gr *= .2; }   /* 물 밑 바닥 (낮은 단은 아님) */
    const sum = gr + rk + ms + dt + 1e-4; W.set([gr / sum, rk / sum, ms / sum, dt / sum], v * 4);
    const ts = treeShade(x, z); L[v * 2] = (isEdge[v] ? .85 : AOg[k]) * (.6 + .4 * ts); L[v * 2 + 1] = (isEdge[v] ? 1 : SHg[k]) * ts; }
  /* 평평한 곳만 줄임 (테두리 고정) — 꼭짓점 정보는 그대로라 칠이 안 번짐 */
  let I = new Uint32Array(IDX); const fullT = I.length / 3;
  [I] = MO.simplify(I, pos, 3, 0, .045, ['LockBorder', 'ErrorAbsolute']);
  const topG = new THREE.BufferGeometry(); topG.setAttribute('position', new THREE.BufferAttribute(pos, 3)); topG.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  topG.setAttribute('aW', new THREE.BufferAttribute(W, 4)); topG.setAttribute('aL', new THREE.BufferAttribute(L, 2)); topG.setIndex(new THREE.BufferAttribute(I, 1)); topG.computeBoundingSphere();
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
        vec3 an = abs(n); an /= an.x + an.y + an.z;                                                  /* 절벽은 옆에서 본 무늬 (위에서 찍은 무늬가 세로로 늘어나지 않게) */
        float tr = fb(vP.zy * .9) * an.x + fb(q * .9) * an.y + fb(vP.xy * .9) * an.z, tr2 = vn(vP.zy * 4.) * an.x + vn(q * 4.) * an.y + vn(vP.xy * 4.) * an.z;
        float band = sin(vP.y * 2.4 + tr * 5.) * .5 + .5, crack = smoothstep(.04, 0., abs(vn(vec2(vP.x + vP.z, vP.y * 2.6) * 1.7) - .5));   /* 바위 층 결 · 갈라진 틈 */
        float drip = smoothstep(.55, .8, vn(vec2((vP.x + vP.z) * 2.2, vP.y * .12))) * (1. - an.y);                                         /* 턱에서 흘러내린 젖은 이끼 줄 */
        vec3 rock = mix(vec3(.30, .25, .20), vec3(.58, .51, .42), band) * (.7 + .45 * tr) * (.85 + .25 * tr2) * (1. - .45 * crack);
        rock = mix(rock, vec3(.12, .22, .07) * (.8 + .4 * tr2), drip * .7);
        vec3 moss = mix(vec3(.10, .25, .05), vec3(.26, .42, .10), g2) * (.8 + .35 * g3);
        vec3 dirt = mix(vec3(.30, .22, .13), vec3(.44, .35, .23), g3) * (.85 + .25 * g4);
        vec3 al = grass * vW.x + rock * vW.y + moss * vW.z + dirt * vW.w;
        vec3 c = lit(al, n, vL.y, vL.x);
        gl_FragColor = vec4(fogged(c, vP), 1.); }` });
  const top = new THREE.Mesh(topG, topM); top.name = 'isleTop'; G.add(top);

  /* ⑥ 아래 바위 몸통: 같은 꼭짓점 자리에서 아래로 (테두리는 위 땅과 꼭 맞물림) · 거의 안 보이는 안쪽은 많이 줄임 */
  const bpos = new Float32Array(NV * 3), bL = new Float32Array(NV);
  for (let v = 0; v < NV; v++) { const x = pos[v * 3], z = pos[v * 3 + 2], m = Math.max(0, F.mask(x, z)), h = pos[v * 3 + 1]; bpos.set([x, isEdge[v] ? h : F.bottom(x, z, Math.min(h, Y.MEADOW + 1), m), z], v * 3); }
  let BI = new Uint32Array(IDX.length); for (let q = 0; q < IDX.length; q += 3) { BI[q] = IDX[q]; BI[q + 1] = IDX[q + 2]; BI[q + 2] = IDX[q + 1]; }
  [BI] = MO.simplify(BI, bpos, 3, 0, .35, ['LockBorder', 'ErrorAbsolute']);
  const botG = new THREE.BufferGeometry(); botG.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); botG.setIndex(new THREE.BufferAttribute(BI, 1)); botG.computeVertexNormals();
  { const nn = botG.attributes.normal; for (let v = 0; v < NV; v++) { const y = bpos[v * 3 + 1], x = bpos[v * 3], z = bpos[v * 3 + 2]; bL[v] = .55 + .45 * smoothstep(-1, .6, nn.getY(v) * -1 + .3) * (.7 + .3 * noise2(x * .2, z * .2)); } botG.setAttribute('aL', new THREE.BufferAttribute(bL, 1)); }
  const botM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute float aL; varying vec3 vP, vN; varying float vL; void main(){ vP = position; vN = normal; vL = aL; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec3 vP, vN; varying float vL;
      void main(){ vec3 n = normalize(vN); float band = sin(vP.y * 1.7 + fb(vP.xz * .12) * 6.) * .5 + .5, b2 = sin(vP.y * 5.3 + fb(vP.xz * .4) * 3.) * .5 + .5;
        vec3 rock = mix(vec3(.22, .18, .15), vec3(.46, .40, .33), band) * (.8 + .2 * b2) * (.75 + .4 * fb(vec2(vP.x + vP.z, vP.y) * .6));
        float top = smoothstep(${(Y.MEADOW - 3.5).toFixed(1)}, ${(Y.MEADOW - .5).toFixed(1)}, vP.y);                 /* 테두리 바로 밑은 이끼 · 흙 */
        rock = mix(rock, mix(vec3(.12, .24, .06), vec3(.30, .24, .15), vn(vP.xz * 2.)), top * .8);
        vec3 c = lit(rock, n, .8, vL) * mix(.55, 1., smoothstep(-45., -8., vP.y));
        gl_FragColor = vec4(fogged(c, vP), 1.); }` });
  const bot = new THREE.Mesh(botG, botM); bot.name = 'isleBottom'; G.add(bot);

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
  const mergeAll = parts => mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g));
  const inst = (geo, list, name) => { if (!list.length) return; const m = new THREE.InstancedMesh(geo, vegM, list.length), q = new THREE.Matrix4(), e = new THREE.Euler();
    list.forEach((t, k) => { q.compose(new THREE.Vector3(t.x, t.y - .15, t.z), new THREE.Quaternion().setFromEuler(e.set(0, t.r, 0)), new THREE.Vector3(t.s, t.s * (.9 + (k % 5) * .05), t.s)); m.setMatrixAt(k, q); });
    m.computeBoundingSphere(); m.name = name; G.add(m); };
  /* 낮은 식물 · 이끼 돌 (종류마다 한 번에 그림) */
  { const G0 = []; const frond = (a, L, w, lean) => { const p = [], c = [], sw = [], idx = []; const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-dir.z, 0, dir.x);
      for (let k = 0; k <= 6; k++) { const f = k / 6, q = dir.clone().multiplyScalar(L * f).add(new THREE.Vector3(0, Math.sin(f * 1.9) * L * lean, 0)), ww = w * Math.sin(Math.min(1, f * 1.4) * Math.PI) * (1 - f * .3);
        for (const sd of [-1, 1]) { const v = q.clone().addScaledVector(side, sd * ww); p.push(v.x, v.y, v.z); const sh = .55 + .5 * f; c.push(.12 * sh, .32 * sh, .08 * sh); sw.push(f); } }
      for (let k = 0; k < 6; k++) { const a0 = k * 2; idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sw, 1)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    const fern = mergeAll(Array.from({ length: 8 }, (_, k) => frond(k * .785 + (k % 2) * .3, .75 + (k % 3) * .15, .13, .55 + (k % 2) * .2)));   /* 고사리: 잎줄기 여덟 개가 둥글게 휘어 퍼짐 */
    const flower = col => { const parts = []; for (let k = 0; k < 6; k++) { const a = k * 1.05, d = .12 + (k % 3) * .08, h = .32 + (k % 3) * .1, x = Math.cos(a) * d, z = Math.sin(a) * d;
        const st = new THREE.BufferGeometry(); st.setAttribute('position', new THREE.Float32BufferAttribute([x - .015, 0, z, x + .015, 0, z, x, h, z], 3)); st.setAttribute('color', new THREE.Float32BufferAttribute([.1, .25, .06, .1, .25, .06, .2, .4, .1], 3)); st.setAttribute('aS', new THREE.Float32BufferAttribute([0, 0, 1], 1)); st.computeVertexNormals(); parts.push(st);
        const hd = new THREE.IcosahedronGeometry(.06 + (k % 2) * .02, 0); hd.deleteAttribute('uv'); hd.translate(x, h, z); const n = hd.attributes.position.count; hd.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => col[i % 3] * (.85 + .3 * ((i / 3 | 0) % 2))), 3)); hd.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(1), 1)); parts.push(hd); }
      return mergeAll(parts); };
    const stone = (() => { const g = new THREE.IcosahedronGeometry(.5, 1); g.deleteAttribute('uv'); const p = g.attributes.position, c = [], v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const n = v.clone().normalize(), d = 1 + .25 * noise2(n.x * 2.3 + 4, n.z * 2.3 + n.y), y = n.y * .62; v.set(n.x * d * .5, Math.max(-.1, y * d * .5), n.z * d * .5); p.setXYZ(k, v.x, v.y, v.z);
        const moss = smoothstep(.3, .75, n.y + .15 * noise2(n.x * 6, n.z * 6)), g0 = .38 + .12 * noise2(n.x * 5, n.y * 5); c.push(...[g0 * 1.05, g0, g0 * .9].map((q, i) => q * (1 - moss) + [.16, .32, .08][i] * moss)); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(p.count).fill(0), 1)); g.computeVertexNormals(); return g; })();
    inst(fern, plants.filter(p => p.v === 'fern'), 'ferns');
    [lin(0xf4f0e6), lin(0xffd24a), lin(0xc49bff)].forEach((c, k) => inst(flower(c), plants.filter(p => p.v === 'fl' + k), 'flowers' + k));
    inst(stone, plants.filter(p => p.v === 'stone'), 'stones'); }

  /* ⑧-2 부쉬: 덩이 모양 그대로 빈틈없이 덮은 덤불 무리 — 가장자리 = 숨는 경계 (사용자 2026-11-10: 경계가 정확해야 · 띄엄띄엄이면 어설픔)
     · 덩이 모양 하나로 칸을 잘라 덮개를 만들고, 가장자리에서 1층 높이를 넘게 둥글게 솟음 · 위는 잎 뭉치가 울퉁불퉁 · 바람에 물결 */
  { const P = [], A = [], IDX = [], key = new Map(), BS = .3, HB = 2.7, CL = [];   /* CL: 덤불 포기 자리 */
    const lump = (x, z) => .75 * fbm(x * .7, z * .7, 3) + .4 * Math.abs(fbm(x * 1.6 + 7, z * 1.6, 2)) + .18 * fbm(x * 3.4, z * 3.4, 2);   /* 덤불 뭉치가 몽글몽글 (매끈한 언덕이 아니게) */
    const hB = (x, z, sd) => hAt(x, z) + .12 + HB * Math.pow(smoothstep(0, 1.25, sd), .55) + lump(x, z) * smoothstep(0, .9, sd);
    for (const Z of SPOT.brush) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [cx, cz, r] of Z) { x0 = Math.min(x0, cx - r - 2); z0 = Math.min(z0, cz - r - 2); x1 = Math.max(x1, cx + r + 2); z1 = Math.max(z1, cz + r + 2); }
      const nx = Math.ceil((x1 - x0) / BS) + 1, nz = Math.ceil((z1 - z0) / BS) + 1, E = new Float32Array(nx * nz); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) E[j * nx + i] = F.brush(x0 + i * BS, z0 + j * BS);
      const vtx = (x, z, sd) => { const id = P.length / 3; P.push(x, hB(x, z, Math.max(0, sd)), z); A.push(Math.max(0, sd), lump(x, z)); return id; };
      const vG = (i, j) => { const k = 'g' + Z[0][0] + ',' + i + ',' + j; if (!key.has(k)) key.set(k, vtx(x0 + i * BS, z0 + j * BS, E[j * nx + i])); return key.get(k); };
      const vC = (i0, j0, i1, j1) => { const a = j0 * nx + i0, b = j1 * nx + i1, k = 'e' + Z[0][0] + ',' + Math.min(a, b) + ',' + Math.max(a, b); if (!key.has(k)) { const t = E[a] / (E[a] - E[b]), x = x0 + (i0 + (i1 - i0) * t) * BS, z = z0 + (j0 + (j1 - j0) * t) * BS; key.set(k, vtx(x, z, 0)); } return key.get(k); };
      const tri = (T) => { const inn = T.map(([i, j]) => E[j * nx + i] >= 0), n = inn.filter(Boolean).length; if (!n) return; if (n === 3) { IDX.push(...T.map(q => vG(...q))); return; }
        const poly = []; for (let q = 0; q < 3; q++) { const a = T[q], b = T[(q + 1) % 3]; if (inn[q]) poly.push(vG(...a)); if (inn[q] !== inn[(q + 1) % 3]) poly.push(vC(...a, ...b)); } for (let q = 1; q + 1 < poly.length; q++) IDX.push(poly[0], poly[q], poly[q + 1]); };
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { tri([[i, j], [i, j + 1], [i + 1, j + 1]]); tri([[i, j], [i + 1, j + 1], [i + 1, j]]); }
      /* 덤불 포기: 가장자리를 따라 세 단으로 빽빽이 (옆에서 봐도 잎 벽) + 위는 잎 지붕 — 포기 중심은 경계 안쪽이라 잎 끝이 경계에 딱 맞음 */
      for (let z = z0; z <= z1; z += .7) for (let x = x0; x <= x1; x += .7) { const jx = x + (rnd() - .5) * .45, jz = z + (rnd() - .5) * .45, sd = F.brush(jx, jz), g = hAt(jx, jz);
        if (sd > .55 && sd < 1.25) for (const yy of [.75, 1.95]) CL.push({ x: jx, z: jz, y: g + yy + (rnd() - .5) * .3, s: .95 + rnd() * .3, r: rnd() * 6.283, v: (rnd() * 3) | 0 });
        else if (sd >= 1.25 && (Math.round(x / .7) + Math.round(z / .7)) % 2 === 0) CL.push({ x: jx, z: jz, y: hB(jx, jz, sd) - .3, s: 1.05 + rnd() * .35, r: rnd() * 6.283, v: (rnd() * 3) | 0 }); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aB', new THREE.Float32BufferAttribute(A, 2)); g.setIndex(IDX); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: `attribute vec2 aB; uniform float uT; uniform vec4 uPush; varying vec3 vP, vN; varying vec2 vB; void main(){ vec3 p = position; float k = smoothstep(0., 1.2, aB.x);
        p.xz += vec2(sin(uT * 1.1 + p.x * .5 + p.z * .3), cos(uT * .9 + p.z * .45)) * .06 * k;                                                       /* 바람에 잎 물결 */
        { vec2 d = p.xz - uPush.xy; float r2 = dot(d, d), w = uPush.w * exp(-r2 / (uPush.z * uPush.z)); p.xz += d / sqrt(r2 + .5) * w * k * .8; p.y -= w * k * .6; }   /* 오르내리는 바람에 눌림 */
        vP = p; vN = normal; vB = aB; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
      fragmentShader: GL + `varying vec3 vP, vN; varying vec2 vB;
        void main(){ vec3 n = normalize(vN); vec2 q = vP.xz;
          vec3 an = abs(n); an /= an.x + an.y + an.z; vec3 P3 = vP * 2.6;
          float b0 = vn(P3.zy) * an.x + vn(P3.xz) * an.y + vn(P3.xy) * an.z, bx = vn(P3.zy + vec2(.15, 0.)) * an.x + vn(P3.xz + vec2(.15, 0.)) * an.y + vn(P3.xy + vec2(.15, 0.)) * an.z, bz = vn(P3.zy + vec2(0., .15)) * an.x + vn(P3.xz + vec2(0., .15)) * an.y + vn(P3.xy + vec2(0., .15)) * an.z;
          n = normalize(n + vec3(b0 - bx, 0., b0 - bz) * 2.2);                                                                                     /* 잎 뭉치마다 빛이 갈라짐 */
          float c1 = vn(q * 3.1 + vP.y * 1.3), c2 = vn(q * 8.7 - vP.y * 2.1), c3 = vn(q * 21.);                                                     /* 잎 뭉치 · 잎 · 잎결 */
          vec3 al = mix(vec3(.04, .13, .04), vec3(.18, .34, .08), smoothstep(-.4, .7, vB.y) * .65 + c1 * .35) * (.5 + .55 * c2) * (.8 + .35 * c3) * (.55 + .6 * b0);   /* 속은 잎 포기들 사이로 보이는 그늘진 안쪽 */
          al += vec3(.35, .45, .1) * step(.9, c3) * smoothstep(.3, .9, n.y) * .4;                                                                 /* 해 받은 잎 끝 */
          float ao = mix(.45, 1., smoothstep(0., 1.3, vB.x)) * (.7 + .3 * smoothstep(-.4, .5, vB.y));                                              /* 가장자리 밑 · 뭉치 사이 그늘 */
          vec3 c = lit(al, n, 1., ao); c += al * vec3(.9, 1.2, .4) * pow(max(0., dot(-n, uSun)), 2.) * .2;
          gl_FragColor = vec4(fogged(c, vP), 1.); }` }));
    m.name = 'brush'; G.add(m);
    const LEAF = [lin(0x3c7a22), lin(0x56892a), lin(0x2c6526)];
    for (let v = 0; v < 3; v++) { const r = rngOf(300 + v); inst(blob(0, 0, 0, .62, .82, LEAF[v].map(q => q * (.85 + r() * .3)), new THREE.Vector3(0, -.35, 0), .8, .7, 1), CL.filter(c => c.v === v), 'brushLeaves' + v); } }   /* 잎 뭉치 하나 = 울퉁불퉁한 공 하나 (가볍게) */

  /* ⑨ 풀 포기: 가장자리 · 절벽 턱 · 나무 밑에 모여 남 (평평한 풀밭은 칠로 충분) */
  { const bl = [], c = [], s = []; for (let k = 0; k < 6; k++) { const a = k * 1.05 + (k % 2) * .3, lx = Math.cos(a), lz = Math.sin(a), h = .45 + (k % 3) * .14, w = .05;
      bl.push(-lz * w, 0, lx * w, lz * w, 0, -lx * w, lx * h * .45, h, lz * h * .45); c.push(.08, .2, .04, .08, .2, .04, .42, .62, .16); s.push(0, 0, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals();
    const L2 = []; for (let k = 0; k < 30000 && L2.length < 2600; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (F.mask(x, z) < .3 || F.brush(x, z) > 0) continue; const n = nAt(x, z, .3); if (n.y < .66) continue; const h = hAt(x, z); if (h < Y.WATER + .1) continue;
      const edge = F.mask(x, z) < 2.5 || nAt(x + 1, z, .6).y < .6 || nAt(x - 1, z, .6).y < .6 || nAt(x, z + 1, .6).y < .6 || nAt(x, z - 1, .6).y < .6, near = F.brush(x, z) > -2.5 || F.pond(x, z) > -2.5;
      if (!edge && !near && rnd() > .1) continue; L2.push({ x, z, y: h + .02, s: .7 + rnd() * .8, r: rnd() * 6.283 }); }
    const m = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEG.v, fragmentShader: GL + `varying vec3 vC, vN, vP; varying float vS; void main(){ vec3 c = lit(vC, vec3(0., 1., 0.), 1., 1.); gl_FragColor = vec4(fogged(c, vP), 1.); }`, side: THREE.DoubleSide }), L2.length);
    const q = new THREE.Matrix4(); L2.forEach((t, k) => { q.compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r), new THREE.Vector3(t.s, t.s, t.s)); m.setMatrixAt(k, q); });
    m.computeBoundingSphere(); m.name = 'grass'; G.add(m); }

  /* ⑩ 늘어진 뿌리 · 담쟁이: 섬 테두리 밑과 고원 절벽에 늘어짐 (위아래 깊이 · 오래된 섬 느낌) */
  { const parts = [], ROOT = lin(0x4b3a28), IVY = [lin(0x2f5f1c), lin(0x497a22)];
    const edgeV = []; for (let v = 0; v < NV; v++) if (isEdge[v] && rnd() < .07) edgeV.push(v);
    for (const v of edgeV) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], n = nAt(x, z, 1.5), out = new THREE.Vector3(n.x, 0, n.z); if (out.lengthSq() < 1e-4) out.set(x, 0, z); out.normalize();
      const Lh = 2 + rnd() * rnd() * 9, pts = []; for (let k = 0; k <= 7; k++) { const f = k / 7; pts.push(new THREE.Vector3(x + out.x * (.15 + Math.sin(f * 3.1) * .5 * rnd()) , y - .3 - f * Lh, z + out.z * (.15 + Math.sin(f * 3.1) * .5)).add(new THREE.Vector3(Math.sin(f * 4 + v) * .25, 0, Math.cos(f * 3 + v) * .25))); }
      parts.push(tube(pts, .16 + rnd() * .12, .03, 5, rnd() < .45 ? IVY[0] : ROOT, .2, 1)); }
    /* 고원 · 돌탑 절벽 담쟁이: 턱에서 시작해 절벽 면을 따라 내려옴 · 잎 조각이 엇갈려 붙음 */
    const leafG = []; for (let k = 0; k < 1400; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0), h = hAt(x, z); if (h < -1 || F.mask(x, z) < 1) continue; const n = nAt(x, z, .4); if (n.y > .55 || n.y < .05) continue;
      const out = new THREE.Vector3(n.x, 0, n.z).normalize(), Lh = 1.5 + rnd() * 5, col = IVY[(rnd() * 2) | 0];
      for (let q = 0; q < Lh / .3; q++) { const yy = h - q * .3; const px = x + out.x * .25, pz = z + out.z * .25; const hh = hAt(px - out.x * .1, pz - out.z * .1); if (yy < hh - 6) break;
        const sx2 = (q % 2 ? 1 : -1) * .18, a = new THREE.Vector3(-out.z, 0, out.x); const c0 = new THREE.Vector3(px + a.x * sx2, yy, pz + a.z * sx2);
        const sz = .16 + rnd() * .1, sh = .7 + rnd() * .4; leafG.push([c0, out, a, sz, [col[0] * sh, col[1] * sh, col[2] * sh]]); } if (leafG.length > 5200) break; }
    { const p = [], c = [], s = []; for (const [c0, out, a, sz, col] of leafG) { const up = new THREE.Vector3(0, 1, 0); const A = c0.clone().addScaledVector(up, sz), B = c0.clone().addScaledVector(a, sz * .8).addScaledVector(out, .05), C = c0.clone().addScaledVector(up, -sz * .6), D = c0.clone().addScaledVector(a, -sz * .8).addScaledVector(out, .05);
        for (const q of [A, B, C, A, C, D]) { p.push(q.x, q.y, q.z); c.push(...col); s.push(.4); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals(); parts.push(g); }
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
        const y = base + (apex - base) * sn; pts.push(new THREE.Vector3(x, y, z)); ra.push(1.55 - .6 * sn); }
      const sides = 10, p = [], idx = [], t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      pts.forEach((q, k) => { t.subVectors(pts[Math.min(N, k + 1)], pts[Math.max(0, k - 1)]).normalize(); a.crossVectors(t, up).normalize(); if (a.lengthSq() < .5) a.set(1, 0, 0); b.crossVectors(a, t);
        for (let e = 0; e <= sides; e++) { const an = e / sides * 6.283, ca = Math.cos(an), sa = Math.sin(an), r = ra[k] * (1 + .22 * noise2(k * .7 + ax, e * .9) + .1 * noise2(k * 2.1, e * 2.3 + az)) * (Math.abs(ca) > .7 ? 1.18 : 1);   /* 울퉁불퉁 · 납작한 바위 띠 */
          p.push(q.x + (a.x * ca + b.x * sa) * r, q.y + (a.y * ca + b.y * sa) * r, q.z + (a.z * ca + b.z * sa) * r); } });
      for (let k = 0; k < N; k++) for (let e = 0; e < sides; e++) { const A = k * (sides + 1) + e, B = A + sides + 1; idx.push(A, B, A + 1, A + 1, B, B + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); parts.push(g);
      pts.forEach((q, k) => { if (k % 2 === 0) F.obstacles.push([q.x, q.y, q.z, ra[k] * 1.1]); });
      F.archLegs.push([ax, az, ra[0] * .95, apex], [bx, bz, ra[N] * .95, apex]); }   /* 시야: 다리 바닥 자리만 */
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
  let best = null; for (let a = 0; a < 6.283; a += .02) { for (let d = 0; d < 30; d += .2) { const x = SPOT.pond[0] + Math.cos(a) * d, z = SPOT.pond[1] + Math.sin(a) * d; if (F.plateau(x, z) > 3.3) { if (!best || d < best.d) best = { d, x, z }; break; } } }
  const fallSpots = [];
  if (best) { const n = nAt(best.x - (best.x - SPOT.pond[0]) * .15, best.z - (best.z - SPOT.pond[1]) * .15, 1.5), out = new THREE.Vector3(SPOT.pond[0] - best.x, 0, SPOT.pond[1] - best.z).normalize(); const P0 = new THREE.Vector3(best.x, hAt(best.x, best.z) + .1, best.z);
    for (const [w, wid] of [[1, 2.2], [.8, 1.4], [1.15, 1.1]]) fall(P0.clone().addScaledVector(new THREE.Vector3(-out.z, 0, out.x), (wid - 1.6) * .6), out, P0.y - Y.WATER, w, wid);
    fallSpots.push(P0.clone().addScaledVector(out, 1.6).setY(Y.WATER + .2)); }
  { const [ax, az, bx, bz] = SPOT.channel; let ex = ax, ez = az; for (let t = 0; t <= 1; t += .005) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (F.mask(x, z) < .2) break; ex = x; ez = z; }
    const out = new THREE.Vector3(bx - ax, 0, bz - az).normalize(), P0 = new THREE.Vector3(ex, Y.WATER, ez); for (const [w, wid] of [[1.3, 2], [1, 1.4]]) fall(P0, out, 34, w, wid); fallSpots.push(P0.clone().addScaledVector(out, 2).setY(Y.WATER - 26)); }

  /* ⑬ 안개: 폭포 밑 물보라 · 섬 아래 · 구름 띠 (흐릿한 덩이가 천천히 흘러감) */
  { const L3 = []; for (const s of fallSpots) for (let k = 0; k < 10; k++) L3.push([s.x + (rnd() - .5) * 4.5, s.y + .3 + rnd() * 2.2, s.z + (rnd() - .5) * 4.5, 1.8 + rnd() * 2.4, .9]);   /* 물보라 */
    for (let k = 0; k < 26; k++) { const a = rnd() * 6.283, d = 18 + rnd() * 30; L3.push([Math.cos(a) * d, -18 - rnd() * 22, Math.sin(a) * d, 9 + rnd() * 10, .5]); }
    for (let k = 0; k < 14; k++) { const a = rnd() * 6.283, d = 40 + rnd() * 20; L3.push([Math.cos(a) * d, -9 - rnd() * 6, Math.sin(a) * d, 7 + rnd() * 6, .35]); }
    const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(L3.flatMap(q => [q[0], q[1], q[2]])), 3)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(new Float32Array(L3.flatMap(q => [q[3], q[4]])), 2)); g.instanceCount = L3.length;
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 iP; attribute vec2 iS; uniform float uT; varying vec2 vU; varying float vA, vS; varying vec3 vW; void main(){ vU = position.xy; vA = iS.y; vS = iS.x;
        vec3 c = iP + vec3(sin(uT * .05 + iP.z) * 2., sin(uT * .3 + iP.x) * .3, cos(uT * .04 + iP.x) * 2.); vW = c;
        vec4 mv = viewMatrix * modelMatrix * vec4(c, 1.); mv.xy += position.xy * iS.x * length(modelMatrix[0].xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL + `varying vec2 vU; varying float vA, vS; varying vec3 vW; void main(){ float r = length(vU), n = fb(vU * 1.3 + vec2(uT * .03, vS)); float a = smoothstep(1., .2, r) * (.35 + .65 * n) * vA, sv = seen(vW);
        gl_FragColor = vec4(mix(vec3(.1, .12, .18), vec3(.86, .92, .97), sv), a * .7 * (.4 + .6 * sv)); }` })); m.frustumCulled = false; m.renderOrder = 4; FX.add(m); }

  /* ⑭ 작은 빛: 숲 · 연못 · 폭포 둘레에 떠다니는 빛 알갱이 (신비로움) — 깜빡이며 천천히 오르내림 */
  { const L4 = []; const pick = (cx, cz, r, n, y0, y1) => { for (let k = 0; k < n; k++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (F.mask(x, z) < 0) continue; L4.push(x, hAt(x, z) + y0 + rnd() * (y1 - y0), z, rnd()); } };
    for (const Z of SPOT.brush) pick(Z[0][0], Z[0][1], Z[0][2] + 2.5, 22, .8, 4.5); pick(SPOT.pond[0], SPOT.pond[1], 9, 30, .3, 3); if (best) pick(best.x, best.z, 6, 16, 1, 9);
    const g = new THREE.BufferGeometry(); const a = new Float32Array(L4); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L4.length / 4 * 3), 3)); g.setAttribute('iP', new THREE.BufferAttribute(a, 4));
    for (let k = 0; k < L4.length / 4; k++) g.attributes.position.setXYZ(k, L4[k * 4], L4[k * 4 + 1], L4[k * 4 + 2]);
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...U, uPx: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 iP; uniform float uT, uPx; varying float vA, vK; varying vec3 vW; void main(){ float ph = iP.w * 40.; vec3 p = position + vec3(sin(uT * .4 + ph) * .6, sin(uT * .7 + ph * 1.3) * .5, cos(uT * .35 + ph) * .6);
        vA = .55 + .45 * sin(uT * (1.5 + iP.w * 2.) + ph); vK = iP.w; vW = p; vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * .16 * length(modelMatrix[0].xyz) / -mv.z; }`,
      fragmentShader: GL + `varying float vA, vK; varying vec3 vW; void main(){ vec2 q = gl_PointCoord - .5; float r = dot(q, q); float k = exp(-r * 28.) + exp(-r * 260.) * 1.5;
        vec3 c = mix(vec3(1., .9, .55), vec3(.6, 1., .85), step(.6, vK)); gl_FragColor = vec4(c * k * vA * 1.4 * seen(vW), 1.); }` }));
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

  G.scale.setScalar(K); U.uK.value = K;   /* 모양 · 무늬 · 안개 높이는 섬 안 좌표로 계산하고 통째로 줄임 → 들꽃 · 잎 무늬까지 같이 작아짐 */
  G.traverse(o => { if (o.isMesh || o.isPoints) { st.draws++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; st.tris += o.isInstancedMesh ? n * o.count : o.isPoints ? 0 : (g.instanceCount ? n * g.instanceCount : n); } });
  st.ground = { full: fullT, kept: I.length / 3, bottom: BI.length / 3 }; st.plants = plants.length;
  return { group: G, K, field: F, H: (x, z) => hAt(x / K, z / K) * K, mask: (x, z) => F.mask(x / K, z / K) * K, blocked: (x, z, L = 1) => F.blocked(x / K, z / K, L), sightBlock: (x, z, L) => F.sightBlock(x / K, z / K, L), inBrush: (x, z) => F.brush(x / K, z / K) > 0, brushZone: (x, z) => F.brushZone(x / K, z / K), setSight: (tex, x, z, R, on) => { U.uRay.value = tex; U.uVC.value.set(x, z); U.uVR.value = R; U.uVOn.value = on; }, layers: LAYERS.map(y => y * K), push: (x, z, r, k) => U.uPush.value.set(x / K, z / K, r / K, k / K), stats: st, sky, setPx: px => { G.userData.motes.material.uniforms.uPx.value = px; }, update: t => { U.uT.value = t; } };
}
