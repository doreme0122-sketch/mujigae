/* 새 초원 섬 하나 (2026-11-10 · 첫 시험) — 모양은 islefield.js, 여기서는 보이는 것을 만듦
   느낌: 신비로움(안개 사이 작은 빛) · 풍성함(이끼 · 나무 · 물) · 깊이(위아래 겹겹) · 맑은 낮빛
   가볍게 만드는 법:
   · 진짜 불빛 없음 — 해 · 하늘빛 · 그늘(오목한 곳 · 나무 밑 · 해 가림)을 로딩 때 꼭짓점마다 구워 두고 화면 칸에서는 무늬만 그림
   · 같은 것끼리 한 번에 그림 (갈대 부쉬 다섯 곳 한 번 · 낮은 식물 종류마다 한 번 · 풀 한 번 · 안개 한 번 · 빛 알갱이 한 번)
   · 땅은 촘촘히 만든 뒤 평평한 곳만 줄임 (절벽 · 가장자리 모양은 그대로) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier as MO } from '../../vendor/meshopt_simplifier.module.js';
import { makeField, Y, SPOT, LAYERS, fbm, noise2, smoothstep } from './islefield.js?v=11111614';
import { reedBush, vegShader } from './flora.js?v=11111614';
import { buildRuins } from './ruins.js?v=11111614';

const SUN = new THREE.Vector3(-.45, .78, .44).normalize();   /* 왼쪽 위 앞에서 (카메라 쪽 절벽 면이 비스듬히 빛을 받아 결이 드러남) */
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };   /* three가 색을 선형으로 바꿔 줌 */

/* 칠 공통: 잡음 · 구운 빛 · 아래로 갈수록 안개 */
const GL = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * .5 + vn(p * 2.07 + 3.1) * .25 + vn(p * 4.11 + 7.7) * .125 + vn(p * 8.3 + 1.3) * .0625; }
uniform vec3 uSun; uniform float uT; uniform sampler2D uRay; uniform vec2 uVC; uniform float uVR, uK, uVOn;   /* uRay: 보이는 칸 지도 · uVC: 지도 왼쪽 위 모서리(세상 좌표) · uVR: 지도 한 변 길이 */
const vec3 SUNC = vec3(1.6, 1.46, 1.22), SKYC = vec3(.47, .61, .84), GNDC = vec3(.20, .22, .12), MIST = vec3(.50, .64, .80);   /* 빛 마무리: 햇빛은 조금 더 따뜻하게 · 그늘(하늘빛)은 조금 더 푸르게 → 밝은 데와 그늘이 또렷 */
vec3 lit(vec3 al, vec3 n, float sh, float ao){ float d = max(dot(n, uSun), 0.); return al * (SUNC * d * sh + mix(GNDC, SKYC, .5 + .5 * n.y) * ao + .05); }
/* 시야 (2D 좌표 · 사용자 2026-11-10): 높이와 상관없이 그 자리의 x, z가 시야 안이면 밝고 밖이면 어둠 — 땅 · 절벽 · 나무 · 물 모두 자기 자리로 */
float seen(vec3 lp){ vec2 uv = (lp.xz * uK - uVC) / uVR; float v = texture2D(uRay, uv).r; return mix(1., v * step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.), uVOn); }   /* 칸 지도(번지게 한 것)에서 그 자리 x, z 값을 읽음 */
uniform vec4 uCutA, uCutB;   /* 화면 가림 걷기 (사용자 2026-11-11 · 내 화면에서만): A = 기체 자리(xyz) · 반지름(w) / B = 카메라 자리 — 기체와 카메라 사이 높은 산 · 동굴 천장을 점점이 걷어 냄 */
float bayer(vec2 f){ vec2 q = mod(floor(f), 4.); float b = mod(q.x * 2. + q.y * 3., 4.) * 4. + mod(q.x + q.y * 2., 4.); return (b + .5) / 16.; }   /* 고른 점 무늬 (지저분한 모래알이 아니게) */
bool cutAway(vec3 p){ if (uCutA.w <= 0.) return false; vec3 ab = uCutB.xyz - uCutA.xyz; float t = clamp(dot(p - uCutA.xyz, ab) / dot(ab, ab), 0., 1.);
  if (t < .01 || p.y < uCutA.y + 2.5) return false; float r = uCutA.w * (.7 + .3 * smoothstep(0., .25, t)), d = length(p - uCutA.xyz - ab * t); if (d > r) return false;
  return bayer(gl_FragCoord.xy) < smoothstep(r, r * .8, d) * uCutB.w; }   /* uCutB.w: 걷어 내는 양 (1 = 다 걷음 · 0.5 = 반쯤 비침) */
vec3 fogged(vec3 c, vec3 wp){ float k = smoothstep(-16., -64., wp.y); c = mix(c, MIST, k * .85); return mix(c * vec3(.13, .15, .24), c, seen(wp)); }
`;
/* 가림 걷기 무게 (꼭짓점 · 칸 공용): 기체 → 카메라 선에서 얼마나 가까운지 (1 = 한가운데) */
const CUTW = `uniform vec4 uCutA, uCutB; float cutW(vec3 p){ if (uCutA.w <= 0.) return 0.; vec3 ab = uCutB.xyz - uCutA.xyz; float t = clamp(dot(p - uCutA.xyz, ab) / dot(ab, ab), 0., 1.);
  float r = uCutA.w * (.7 + .3 * smoothstep(0., .25, t)); return smoothstep(r, r * .7, length(p - uCutA.xyz - ab * t)) * step(.01, t); }`;
const U = { uSun: { value: SUN }, uT: { value: 0 }, uPush: { value: new THREE.Vector4(0, 0, 1, 0) }, uWave: { value: new THREE.Vector4(0, 0, 0, 0) }, uRay: { value: null }, uVC: { value: new THREE.Vector2() }, uVR: { value: 12 }, uK: { value: 1 }, uVOn: { value: 0 }, uCutA: { value: new THREE.Vector4() }, uCutB: { value: new THREE.Vector4() } };   /* uPush: 기체가 오르내릴 때 밑의 풀·덤불을 미는 바람 (x, z, 반지름, 세기 · 섬 안 단위) · uWave: 한 점에서 둥글게 퍼지는 바람 (x, z, 앞머리 반지름, 세기 · 보물 상자가 열릴 때) */

export async function buildIsle({ K = 1, layout = SPOT } = {}) {   /* layout: 섬 배치 (기본 = 섬 하나 시험 · 초원 한 조각 체험판은 meadowsector.js) */
  const LO = layout, D = LO.dens || 1;   /* D: 넓이에 맞춰 식물 수를 늘림 */   /* K: 섬 전체 크기 (기체는 그대로 · 사용자 2026-11-10: 기체에 비해 땅이 너무 큼) */
  await MO.ready;
  const F = makeField(LO), G = new THREE.Group(), rnd = rngOf(20261110), st = { tris: 0, draws: 0 };
  const [X0, X1, Z0, Z1] = LO.box, S = .34, NX = Math.round((X1 - X0) / S) + 1, NZ = Math.round((Z1 - Z0) / S) + 1;
  const gi = (i, j) => j * NX + i, gx = i => X0 + i * S, gz = j => Z0 + j * S;
  /* ① 칸마다 높이 · 안쪽 거리 미리 계산 */
  const Hg = new Float32Array(NX * NZ), Mg = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = gx(i), z = gz(j), m = F.mask(x, z); Mg[gi(i, j)] = m; Hg[gi(i, j)] = m > -2 ? F.top(x, z) : -40; }
  const hAt = (x, z) => { const u = Math.min(NX - 1.001, Math.max(0, (x - X0) / S)), w = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / S)), i = u | 0, j = w | 0, a = u - i, b = w - j;
    return (Hg[gi(i, j)] * (1 - a) + Hg[gi(i + 1, j)] * a) * (1 - b) + (Hg[gi(i, j + 1)] * (1 - a) + Hg[gi(i + 1, j + 1)] * a) * b; };
  const nAt = (x, z, e = .3) => new THREE.Vector3(hAt(x - e, z) - hAt(x + e, z), 2 * e, hAt(x, z - e) - hAt(x, z + e)).normalize();

  /* ② 낮은 식물 자리 (사용자 2026-11-10: 나무 한 그루씩은 부쉬와 헷갈려서 넣지 않음 → 숨을 수 없다는 게 한눈에 보이는 낮은 식물로)
     · 고사리: 절벽 밑 · 돌탑 둘레 · 연못가 · 부쉬 가장자리 그늘 / 꽃무더기: 풀밭에 무리 지어 / 이끼 돌: 절벽 밑 · 풀밭 군데군데 */
  const plants = [];
  const farFrom = (L, x, z, d) => L.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > d * d);
  const okAt = (x, z, lim) => F.mask(x, z) > 1.2 && nAt(x, z, .5).y > lim && F.pond(x, z) < -.8 && F.chan(x, z) < -.6 && F.brush(x, z) < -.4;
  const nearCliff = (x, z) => nAt(x + 1.6, z, .8).y < .6 || nAt(x - 1.6, z, .8).y < .6 || nAt(x, z + 1.6, .8).y < .6 || nAt(x, z - 1.6, .8).y < .6;
  for (let k = 0; k < 20000 * D && plants.filter(p => p.v === 'fern').length < 420 * D; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .72)) continue;
    const want = nearCliff(x, z) || F.pond(x, z) > -3.5 || F.brush(x, z) > -2.2; if (!want && rnd() > .06) continue; if (!farFrom(plants, x, z, .7)) continue;
    plants.push({ x, z, y: hAt(x, z), s: .75 + rnd() * .6, r: rnd() * 6.283, v: 'fern' }); }
  for (let k = 0; k < 20000 * D && plants.filter(p => p.v.startsWith('fl')).length < 260 * D; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .85)) continue;
    const pat = fbm(x * .07 + 11, z * .07, 3); if (pat < .12 && rnd() > .04) continue; if (!farFrom(plants, x, z, .55)) continue;   /* 꽃은 무리 지어 핌 */
    plants.push({ x, z, y: hAt(x, z), s: .7 + rnd() * .5, r: rnd() * 6.283, v: 'fl' + (fbm(x * .05, z * .05 + 3, 2) > .1 ? 0 : fbm(x * .05 + 9, z * .05, 2) > 0 ? 1 : 2) }); }
  for (let k = 0; k < 20000 * D && plants.filter(p => p.v === 'stone').length < 80 * D; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (!okAt(x, z, .6)) continue;
    if (!nearCliff(x, z) && rnd() > .25) continue; if (!farFrom(plants, x, z, 1)) continue;
    plants.push({ x, z, y: hAt(x, z), s: .35 + rnd() * rnd() * .9, r: rnd() * 6.283, v: 'stone' }); }

  for (const Z of LO.brush) for (const [x, z, r] of Z) if (F.mask(x, z) < r) console.warn('[초원 섬] 부쉬가 섬 가장자리를 넘음', x, z, r);   /* 넘으면 잎이 허공으로 길게 늘어짐 */
  /* ②-2 갈대 부쉬 (사용자 2026-11-10 · 부쉬 보기 화면과 같은 것 · flora.js) — m 단위로 만들고 섬 안 단위로 바꿈(÷K) · 바닥 모양 = 숨는 판정 = 시야 가림 */
  const BUSH = LO.brush.map((Z, k) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, cx = 0, cz = 0, w = 0; for (const [x, z, r] of Z) { x0 = Math.min(x0, x - r - 1.5); z0 = Math.min(z0, z - r - 1.5); x1 = Math.max(x1, x + r + 1.5); z1 = Math.max(z1, z + r + 1.5); cx += x * r; cz += z * r; w += r; }
    const R = reedBush({ foot: (x, z) => F.brushZ(k, x / K, z / K) * K, box: [x0 * K, z0 * K, x1 * K, z1 * K], cx: cx / w * K, cz: cz / w * K, seed: 11 + k * 17, HB: 1.7, gy: (x, z) => hAt(x / K, z / K) * K });
    R.geo.scale(1 / K, 1 / K, 1 / K); return R; });

  /* ③ 빛 굽기: 오목한 곳(사방 땅이 얼마나 막는지) · 해 가림(해 쪽으로 걸어가며 땅에 막히는지) · 나무 밑 그늘 */
  const AOg = new Float32Array(NX * NZ), SHg = new Float32Array(NX * NZ);
  const DIRS = Array.from({ length: 10 }, (_, k) => [Math.cos(k * .6283), Math.sin(k * .6283)]), sx = SUN.x / Math.hypot(SUN.x, SUN.z), sz = SUN.z / Math.hypot(SUN.x, SUN.z), slope = SUN.y / Math.hypot(SUN.x, SUN.z);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = gi(i, j); if (Mg[k] < -1.5) continue; const x = gx(i), z = gz(j), h = Hg[k];
    let oc = 0; for (const [dx, dz] of DIRS) { let m = 0; for (const r of [.8, 2, 4.5, 9]) { const hh = Mg[gi(Math.min(NX - 1, Math.max(0, i + Math.round(dx * r / S))), Math.min(NZ - 1, Math.max(0, j + Math.round(dz * r / S))))] > -1.5 ? hAt(x + dx * r, z + dz * r) : -99; m = Math.max(m, (hh - h) / r); } oc += Math.min(1, Math.max(0, m)); }
    AOg[k] = 1 - .62 * oc / DIRS.length;
    let s = 1; for (let d = .6; d < 26; d += .6) { const hx = x + sx * d, hz = z + sz * d; if (F.mask(hx, hz) < -.5) break; const hh = hAt(hx, hz); if (hh > h + d * slope + .25) { s = Math.max(.12, 1 - (d < 3 ? .6 : .85)); break; } }
    SHg[k] = s; }
  const treeShade = (x, z) => 1 - .4 * smoothstep(-1.6, .2, F.brush(x, z));   /* 부쉬 가장자리 밑 그늘 */

  /* ④ 땅 그물 (사용자 2026-11-10: 층층이 깨져 보임 → 절벽은 촘촘히)
     · 칸을 반으로 더 잘게(0.17) 나누고, 가파른 칸 · 테두리 칸만 정확한 높이를 다시 잼 (평평한 곳은 큰 칸 높이를 고르게 이음 → 불러오기가 많이 늦어지지 않게)
     · 절벽 턱이 계단처럼 톱니지고 늘어진 삼각형이 비치던 것이 사라짐 · 섬 밖에 걸친 삼각형은 가장자리에서 잘라 매끈한 테두리 */
  const S2 = S / 2, GX = (NX - 1) * 2 + 1, GZ = (NZ - 1) * 2 + 1, fi = (i, j) => j * GX + i, fx = i => X0 + i * S2, fz = j => Z0 + j * S2;
  const mAt = (x, z) => { const u = Math.min(NX - 1.001, Math.max(0, (x - X0) / S)), w = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / S)), i = u | 0, j = w | 0, a = u - i, b = w - j;
    return (Mg[gi(i, j)] * (1 - a) + Mg[gi(i + 1, j)] * a) * (1 - b) + (Mg[gi(i, j + 1)] * (1 - a) + Mg[gi(i + 1, j + 1)] * a) * b; };
  const FH = new Float32Array(GX * GZ), FM = new Float32Array(GX * GZ), steep = new Uint8Array((NX - 1) * (NZ - 1));
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = gi(i, j), b = a + 1, c = a + NX, d = c + 1, hl = Math.min(Hg[a], Hg[b], Hg[c], Hg[d]), hh = Math.max(Hg[a], Hg[b], Hg[c], Hg[d]);
    steep[j * (NX - 1) + i] = hh - hl > .3 || (Math.min(Mg[a], Mg[b], Mg[c], Mg[d]) < 3 && Math.max(Mg[a], Mg[b], Mg[c], Mg[d]) > -2) ? 1 : 0; }   /* 가파른 칸 · 테두리 칸 */
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) { const k = fi(i, j);
    if (!(i & 1) && !(j & 1)) { FH[k] = Hg[gi(i >> 1, j >> 1)]; FM[k] = Mg[gi(i >> 1, j >> 1)]; continue; }
    let st = 0; for (let b = Math.max(0, (j - 1) >> 1); b <= Math.min(NZ - 2, j >> 1); b++) for (let a = Math.max(0, (i - 1) >> 1); a <= Math.min(NX - 2, i >> 1); a++) st |= steep[b * (NX - 1) + a];
    const x = fx(i), z = fz(j); if (st) { const m = F.mask(x, z); FM[k] = m; FH[k] = m > -2 ? F.top(x, z) : -40; } else { FM[k] = mAt(x, z); FH[k] = hAt(x, z); } }
  const P = [], VF = [], key = new Map(), edge0 = [];   /* VF: 잘게 나눈 칸 번호 (가장자리를 자른 점은 −1) */
  const vGrid = (i, j) => { const k = fi(i, j); if (key.has(k)) return key.get(k); const id = P.length / 3; P.push(fx(i), FH[k], fz(j)); VF.push(k); edge0.push(0); key.set(k, id); return id; };
  const vCut = (i0, j0, i1, j1) => { const a0 = fi(i0, j0), a1 = fi(i1, j1), k = 'e' + Math.min(a0, a1) + ',' + Math.max(a0, a1); if (key.has(k)) return key.get(k);
    const m0 = FM[a0], m1 = FM[a1], t = m0 / (m0 - m1), x = fx(i0) + (fx(i1) - fx(i0)) * t, z = fz(j0) + (fz(j1) - fz(j0)) * t;
    const id = P.length / 3; P.push(x, F.top(x, z), z); VF.push(-1); edge0.push(1); key.set(k, id); return id; };
  const IDX = [];
  const tri = (A, B, C) => { const T = [A, B, C], inn = T.map(([i, j]) => FM[fi(i, j)] >= 0); const n = inn.filter(Boolean).length; if (!n) return;
    if (n === 3) { IDX.push(vGrid(...A), vGrid(...B), vGrid(...C)); return; }
    const poly = []; for (let q = 0; q < 3; q++) { const a = T[q], b = T[(q + 1) % 3]; if (inn[q]) poly.push(vGrid(...a)); if (inn[q] !== inn[(q + 1) % 3]) poly.push(vCut(...a, ...b)); }
    for (let q = 1; q + 1 < poly.length; q++) IDX.push(poly[0], poly[q], poly[q + 1]); };
  for (let j = 0; j < GZ - 1; j++) for (let i = 0; i < GX - 1; i++) { if ((i + j) & 1) { tri([i, j], [i, j + 1], [i + 1, j]); tri([i + 1, j], [i, j + 1], [i + 1, j + 1]); } else { tri([i, j], [i, j + 1], [i + 1, j + 1]); tri([i, j], [i + 1, j + 1], [i + 1, j]); } }
  const pos0 = new Float32Array(P), fullT = IDX.length / 3;
  /* 평평한 곳만 줄이고(테두리 고정) 쓰는 꼭짓점만 남김 — 칠 정보는 남은 꼭짓점에서 그 자리 그대로 계산하니 번지지 않음 */
  const compact = (idx, src, extra) => { const map = new Int32Array(src.length / 3).fill(-1), out = [], ex = extra.map(() => []); let n = 0;
    for (let q = 0; q < idx.length; q++) { const v = idx[q]; if (map[v] < 0) { map[v] = n++; out.push(src[v * 3], src[v * 3 + 1], src[v * 3 + 2]); extra.forEach((e, k) => ex[k].push(e[v])); } idx[q] = map[v]; }
    return [new Float32Array(out), ...ex]; };
  let [I] = MO.simplify(new Uint32Array(IDX), pos0, 3, 0, .045, ['LockBorder', 'ErrorAbsolute']);
  const [pos, VFt, isEdge] = compact(I, pos0, [VF, edge0]), NV = pos.length / 3;

  /* ⑤ 위 땅 칠 정보 (풀 · 바위 · 이끼 · 흙의 섞임) · 구운 빛 */
  /* 면 방향: 잘게 나눈 칸의 높이로 (절벽 턱이 또렷하게) · 빛 굽기는 큰 칸에서 섬 안 칸끼리만 고르게 이어 읽음 */
  const fineN = (k, x, z) => { if (k < 0) return nAt(x, z, .34); const i = k % GX, j = (k / GX) | 0, h = FH[k], at = (a, b) => { const q = fi(Math.min(GX - 1, Math.max(0, a)), Math.min(GZ - 1, Math.max(0, b))); return FM[q] > -2 ? FH[q] : h; };
    return new THREE.Vector3(at(i - 1, j) - at(i + 1, j), 2 * S2, at(i, j - 1) - at(i, j + 1)).normalize(); };
  const bake = (arr, x, z) => { const u = Math.min(NX - 1.001, Math.max(0, (x - X0) / S)), w = Math.min(NZ - 1.001, Math.max(0, (z - Z0) / S)), i = u | 0, j = w | 0, a = u - i, b = w - j; let s = 0, ws = 0;
    for (const [di, dj, wt] of [[0, 0, (1 - a) * (1 - b)], [1, 0, a * (1 - b)], [0, 1, (1 - a) * b], [1, 1, a * b]]) { const k = gi(i + di, j + dj); if (Mg[k] < -1.5 || wt <= 0) continue; s += arr[k] * wt; ws += wt; } return ws > 0 ? s / ws : 1; };
  const nrm = new Float32Array(NV * 3), W = new Float32Array(NV * 4), L = new Float32Array(NV * 2);
  for (let v = 0; v < NV; v++) { const x = pos[v * 3], h = pos[v * 3 + 1], z = pos[v * 3 + 2], n = fineN(VFt[v], x, z); nrm.set([n.x, n.y, n.z], v * 3);
    const flat = smoothstep(.62, .82, n.y), wet = Math.max(smoothstep(-3.5, 0, F.pond(x, z)), smoothstep(-2.5, 0, F.chan(x, z))), m = F.mask(x, z);
    const ledge = (1 - flat) * smoothstep(.2, .55, n.y), base = smoothstep(-2.2, -.3, -Math.abs(F.plateau(x, z) + 2.2)) * flat * .7;   /* 절벽 턱 · 절벽 밑 */
    const lip = 1 - smoothstep(0, 1.4, m);   /* 섬 테두리 어깨: 풀이 성기고 흙 · 이끼가 드러남 */
    const sm = F.spireMoss(x, z) * (.55 + .45 * smoothstep(-.3, .3, fbm(x * .35, z * .35, 2)));   /* 이끼 덮인 굵은 탑: 벽까지 이끼가 덮음 (군데군데 바위가 비침) */
    let gr = flat * (1 - .55 * wet) * (1 - .6 * lip), rk = (1 - flat) * (1 - .75 * ledge) * (1 - .8 * sm), ms = ledge + .8 * wet * (1 - flat) + .25 * wet * flat + lip * .55 + sm * 1.6,
      dt = base + .55 * smoothstep(-1.2, 0, F.pond(x, z)) * flat + .35 * smoothstep(.55, .72, fbm(x * .06 + 3, z * .06, 3) * .5 + .5) * flat + lip * .45 * smoothstep(-.2, .4, fbm(x * .5, z * .5, 2));
    if (h < Y.WATER + .15 && (F.pond(x, z) > -1 || F.chan(x, z) > -.5)) { dt += .6; gr *= .2; }   /* 물 밑 바닥 (낮은 단은 아님) */
    const sum = gr + rk + ms + dt + 1e-4; W.set([gr / sum, rk / sum, ms / sum, dt / sum], v * 4);
    const ts = treeShade(x, z); L[v * 2] = (isEdge[v] ? .8 : bake(AOg, x, z)) * (.6 + .4 * ts) * (1 - .15 * lip); L[v * 2 + 1] = (isEdge[v] ? 1 : bake(SHg, x, z)) * ts; }
  const topG = new THREE.BufferGeometry(); topG.setAttribute('position', new THREE.BufferAttribute(pos, 3)); topG.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  topG.setAttribute('aW', new THREE.BufferAttribute(W, 4)); topG.setAttribute('aL', new THREE.BufferAttribute(L, 2)); topG.setIndex(new THREE.BufferAttribute(I, 1)); topG.computeBoundingSphere();
  const topM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: CUTW + `attribute vec4 aW; attribute vec2 aL; varying vec3 vP, vN; varying vec4 vW; varying vec2 vL; void main(){ vec3 p = position, n = normal; float w = cutW(p), top = uCutA.y + 2.2;   /* 가림 걷기: 산을 뚫지 않고 기체 바로 위 높이까지 눌러 내림 (속이 빈 산 너머 하늘이 비치지 않게) */
      if (w > 0. && p.y > top) { p.y = mix(p.y, top + (p.y - top) * .04, w); n = normalize(mix(n, vec3(0., 1., 0.), w)); }
      vP = p; vN = n; vW = aW; vL = aL; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
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
  /* 반투명 걷기: 눌러 내린 산의 원래 모양을 유리처럼 희미하게 (가장자리가 조금 더 밝게) — uCutB.w < 1 일 때만 */
  const ghostM = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: CUTW + `varying vec3 vP, vN; varying float vW; void main(){ vP = position; vN = normal; vW = cutW(position) * step(uCutA.y + 2.2, position.y); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec4 uCutB; varying vec3 vP, vN; varying float vW; void main(){ float a = vW * (1. - uCutB.w) * 2.; if (a < .02) discard; vec3 n = normalize(vN); float rim = 1. - abs(n.y);
      gl_FragColor = vec4(mix(vec3(.62, .78, .7), vec3(.9, 1., .95), rim), a * (.14 + .3 * rim)); }` });
  if (LO.cut) { const gh = new THREE.Mesh(topG, ghostM); gh.name = 'isleTop'; gh.renderOrder = 8; G.add(gh); }

  /* ⑥ 아래 바위 몸통: 같은 꼭짓점 자리에서 아래로 (테두리는 위 땅과 꼭 맞물림) · 거의 안 보이는 안쪽은 줄임
     · 테두리 바로 밑은 흙 띠(위 땅에서 얼마나 내려왔는지 aD로) — 칼로 자른 듯한 단면이 아니라 흙 · 뿌리 · 이끼가 드러난 언덕 끝 (사용자 2026-11-10) */
  const bpos0 = new Float32Array(pos0.length);
  for (let v = 0; v < pos0.length / 3; v++) { const x = pos0[v * 3], z = pos0[v * 3 + 2], m = Math.max(0, F.mask(x, z)), h = pos0[v * 3 + 1]; bpos0.set([x, edge0[v] ? h : F.bottom(x, z, Math.min(h, Y.MEADOW + 1), m), z], v * 3); }
  const topY0 = Array.from({ length: pos0.length / 3 }, (_, v) => pos0[v * 3 + 1]);
  let BI = new Uint32Array(IDX.length); for (let q = 0; q < IDX.length; q += 3) { BI[q] = IDX[q]; BI[q + 1] = IDX[q + 2]; BI[q + 2] = IDX[q + 1]; }
  [BI] = MO.simplify(BI, bpos0, 3, 0, .12, ['LockBorder', 'ErrorAbsolute']);
  const [bpos, topY] = compact(BI, bpos0, [topY0]), NB = bpos.length / 3, bL = new Float32Array(NB), bD = new Float32Array(NB);
  const botG = new THREE.BufferGeometry(); botG.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); botG.setIndex(new THREE.BufferAttribute(BI, 1)); botG.computeVertexNormals();
  { const nn = botG.attributes.normal; for (let v = 0; v < NB; v++) { const y = bpos[v * 3 + 1], x = bpos[v * 3], z = bpos[v * 3 + 2]; bL[v] = .55 + .45 * smoothstep(-1, .6, nn.getY(v) * -1 + .3) * (.7 + .3 * noise2(x * .2, z * .2)); bD[v] = topY[v] - y; }
    botG.setAttribute('aL', new THREE.BufferAttribute(bL, 1)); botG.setAttribute('aD', new THREE.BufferAttribute(bD, 1)); }
  const botM = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `attribute float aL, aD; varying vec3 vP, vN; varying float vL, vD; void main(){ vP = position; vN = normal; vL = aL; vD = aD; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec3 vP, vN; varying float vL, vD;
      void main(){ vec3 n = normalize(vN); float band = sin(vP.y * 1.7 + fb(vP.xz * .12) * 6.) * .5 + .5, b2 = sin(vP.y * 5.3 + fb(vP.xz * .4) * 3.) * .5 + .5;
        vec3 rock = mix(vec3(.22, .18, .15), vec3(.46, .40, .33), band) * (.8 + .2 * b2) * (.75 + .4 * fb(vec2(vP.x + vP.z, vP.y) * .6));
        float crack = smoothstep(.035, 0., abs(vn(vec2((vP.x - vP.z) * .9, vP.y * .35)) - .5)) * (.6 + .4 * vn(vP.xz * .7));          /* 아래로 길게 갈라진 틈 */
        float drip = smoothstep(.6, .85, vn(vec2((vP.x + vP.z) * 1.6, vP.y * .09))) * smoothstep(-40., -8., vP.y);                    /* 물이 흘러내린 어두운 얼룩 줄 */
        float lichen = smoothstep(.62, .8, fb(vec2(vP.x + vP.z, vP.y) * .9)) * smoothstep(-.2, .6, -n.y + .5);                          /* 바깥 면 군데군데 마른 이끼 */
        rock *= (1. - .55 * crack) * (1. - .3 * drip); rock = mix(rock, vec3(.42, .45, .30), lichen * .35);
        float a = atan(vP.z, vP.x) * 18., dd = vD + .5 * (fb(vec2(a * .35, vP.y * .4)) - .5);                         /* 위 땅에서 내려온 깊이 (경계가 고르지 않게) */
        float soil = 1. - smoothstep(1.1, 2.4, dd), turf = 1. - smoothstep(.15, .55, dd);                                       /* 흙 띠 · 맨 위 잔디 뿌리층 */
        vec3 dirt = mix(vec3(.20, .14, .09), vec3(.36, .27, .17), vn(vec2(a, vP.y * 3.))) * (.8 + .3 * vn(vec2(a * 3., vP.y * 9.)));
        float root = smoothstep(.72, .9, vn(vec2(a * 2.2, vP.y * .8))) * soil * (1. - turf);                                    /* 흙 사이로 비치는 잔뿌리 줄 */
        dirt = mix(dirt, vec3(.42, .33, .22), root * .7) * (1. - .25 * smoothstep(.3, 1.2, dd) * (1. - root));
        vec3 grassLip = mix(vec3(.12, .26, .06), vec3(.30, .44, .12), vn(vec2(a * 2., vP.y * 6.)));
        rock = mix(rock, dirt, soil); rock = mix(rock, grassLip, turf);
        vec3 c = lit(rock, n, .8, vL) * mix(.55, 1., smoothstep(-45., -8., vP.y));
        gl_FragColor = vec4(fogged(c, vP), 1.); }` });
  const bot = new THREE.Mesh(botG, botM); bot.name = 'isleBottom'; G.add(bot);

  const WFALL = { value: new THREE.Vector3(0, 0, 0) };   /* 폭포가 연못에 떨어지는 자리 (x, z, 켜짐) — 폭포를 놓을 때 채움 */
  /* ⑦ 물: 연못 · 물길 (얕으면 맑은 청록 · 깊으면 짙음 · 물가 거품 · 잔물결에 하늘빛)
     물가는 물 판을 땅 밑까지 넉넉히 깔고 땅이 가리게 함 → 물가 선이 땅 모양 그대로 매끈 (네모 칸이 계단처럼 비치지 않게 · 사용자 2026-11-10) */
  { const wp = [], wd = [], wi = []; const idm = new Map(); const WS = .35;
    for (let z = Z0; z <= Z1; z += WS) for (let x = X0; x <= X1; x += WS) { const d = Y.WATER - hAt(x, z); if (d > -1.6 && F.mask(x, z) > 0 && (F.pond(x, z) > -3 || F.chan(x, z) > -2.5)) { idm.set(x.toFixed(2) + ',' + z.toFixed(2), wp.length / 3); wp.push(x, Y.WATER, z); wd.push(d); } }
    const g = (x, z) => idm.get(x.toFixed(2) + ',' + z.toFixed(2));
    for (let z = Z0; z < Z1; z += WS) for (let x = X0; x < X1; x += WS) { const q = [g(x, z), g(x + WS, z), g(x, z + WS), g(x + WS, z + WS)]; if (q.some(v => v === undefined) || q.every(v => wd[v] < -.4)) continue; const [a, b, c, d] = q; wi.push(a, c, b, b, c, d); }   /* 넷 다 땅 밑이면 뺌 */
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('aD', new THREE.Float32BufferAttribute(wd, 1)); wg.setIndex(wi);
    const wm = new THREE.ShaderMaterial({ uniforms: { ...U, uFall: WFALL }, transparent: true, depthWrite: false,
      vertexShader: `attribute float aD; varying float vD; varying vec3 vP; void main(){ vD = aD; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `uniform vec3 uFall; varying float vD; varying vec3 vP;
        void main(){ vec2 q = vP.xz; float r = fb(q * .9 + vec2(uT * .25, -uT * .18)) + fb(q * 1.7 - vec2(uT * .2, uT * .31)) * .5;
          float fd = length(q - uFall.xy), ring = uFall.z * (.5 + .5 * sin(fd * 5.5 - uT * 7. + fb(q * 1.3) * 2.)) * exp(-fd * .45) * smoothstep(.6, 1.8, fd);   /* 폭포가 떨어지는 자리에서 퍼지는 잔물결 */
          r += ring * .6; float splash = uFall.z * smoothstep(2.2, .6, fd + (fb(q * 2. + uT * 1.5) - .5) * 1.2);                                              /* 떨어지는 자리 흰 물거품 */
          vec3 c = mix(vec3(.25, .62, .60), vec3(.04, .20, .28), smoothstep(.0, 1.6, vD)) * (.85 + .3 * r);
          float sky = smoothstep(.95, 1.25, r) * .5; c += vec3(.75, .88, 1.) * sky;                    /* 하늘이 비친 잔물결 */
          float foam = max(smoothstep(.22, .0, vD + (r - .7) * .12), splash * (.6 + .4 * vn(q * 7. - uT * 3.))); c = mix(c, vec3(.92, .97, 1.), foam * .8);   /* 물가 거품 · 폭포 밑 물거품 */
          float a = clamp(.55 + vD * .35, 0., .92) * smoothstep(-.3, .02, vD) + foam * .3;
          gl_FragColor = vec4(fogged(c * 1.15, vP), min(a, .95)); }` });
    const water = new THREE.Mesh(wg, wm); water.renderOrder = 2; water.name = 'water'; G.add(water); }

  /* ⑧ 낮은 식물 칠 (고사리 · 꽃 · 이끼 돌 · 풀): 바람에 끝이 흔들림 · 오르내리는 바람에 눌림 */
  const VEG = { v: `attribute vec3 color; attribute float aS; uniform float uT; uniform vec4 uPush, uWave; varying vec3 vC, vN, vP; varying float vS;
      void main(){ vec4 w = instanceMatrix * vec4(position, 1.); float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .23;
        w.xz += vec2(sin(uT * 1.3 + ph + position.y * .4), cos(uT * 1.1 + ph * 1.3)) * .07 * aS * aS * length(instanceMatrix[1].xyz);   /* 바람: 위로 갈수록 */
        { vec2 d = w.xz - uPush.xy; float r2 = dot(d, d), k = uPush.w * exp(-r2 / (uPush.z * uPush.z)); w.xz += d / sqrt(r2 + .5) * k * aS * min(2.5, length(instanceMatrix[1].xyz)); w.y -= k * aS * .25; }   /* 오르내리는 바람에 밀려 눕고 다시 일어남 */
        if (uWave.w > 0.) { vec2 d = w.xz - uWave.xy; float r = length(d) + .01, k = uWave.w * smoothstep(uWave.z + 3., uWave.z - 1.5, r) * exp(-max(0., uWave.z - r) / 10.); w.xz += d / r * k * aS * 1.4; w.y -= k * aS * .35; }   /* 퍼지는 바람: 앞머리가 지나가며 바깥으로 눕고 뒤에서 다시 일어남 */
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

  /* ⑧-2 갈대 부쉬 그리기: 다섯 곳을 한 번에 (②-2에서 만든 것 · 기체가 들어가거나 오르내려도 잎이 밀리지 않음) */
  { const m = new THREE.Mesh(mergeGeometries(BUSH.map(B => B.geo)), new THREE.ShaderMaterial({ uniforms: U, ...vegShader(GL, 'fogged(c, vL)'), side: THREE.DoubleSide })); m.name = 'brush'; G.add(m); }

  /* ⑨ 풀 포기: 가장자리 · 절벽 턱 · 나무 밑에 모여 남 (평평한 풀밭은 칠로 충분) */
  { const bl = [], c = [], s = []; for (let k = 0; k < 6; k++) { const a = k * 1.05 + (k % 2) * .3, lx = Math.cos(a), lz = Math.sin(a), h = .45 + (k % 3) * .14, w = .05;
      bl.push(-lz * w, 0, lx * w, lz * w, 0, -lx * w, lx * h * .45, h, lz * h * .45); c.push(.08, .2, .04, .08, .2, .04, .42, .62, .16); s.push(0, 0, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bl, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals();
    const L2 = []; for (let k = 0; k < 30000 * D && L2.length < 2600 * D; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0); if (F.mask(x, z) < .3 || F.brush(x, z) > 0) continue; const n = nAt(x, z, .3); if (n.y < .66) continue; const h = hAt(x, z); if (h < Y.WATER + .1) continue;
      const edge = F.mask(x, z) < 2.5 || nAt(x + 1, z, .6).y < .6 || nAt(x - 1, z, .6).y < .6 || nAt(x, z + 1, .6).y < .6 || nAt(x, z - 1, .6).y < .6, near = F.brush(x, z) > -2.5 || F.pond(x, z) > -2.5;
      if (!edge && !near && rnd() > .1) continue; L2.push({ x, z, y: h + .02, s: .7 + rnd() * .8, r: rnd() * 6.283 }); }
    const m = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VEG.v, fragmentShader: GL + `varying vec3 vC, vN, vP; varying float vS; void main(){ vec3 c = lit(vC, vec3(0., 1., 0.), 1., 1.); gl_FragColor = vec4(fogged(c, vP), 1.); }`, side: THREE.DoubleSide }), L2.length);
    const q = new THREE.Matrix4(); L2.forEach((t, k) => { q.compose(new THREE.Vector3(t.x, t.y, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r), new THREE.Vector3(t.s, t.s, t.s)); m.setMatrixAt(k, q); });
    m.computeBoundingSphere(); m.name = 'grass'; G.add(m); }

  /* 동굴 입구 틀 (L.gorge.tunnel): 골짜기 들머리 [0, to]를 따라 — inner: 열린 아치 (발은 바닥 밑 · 꼭대기 = 천장 밑면 top, 3층보다 높게) · outer: 두꺼운 바위 겉면 */
  let tunnelG = null; const TUN = LO.gorge && LO.gorge.tunnel ? (() => { const C = LO.gorge, T = C.tunnel, fl = C.floor - 2.5, wi = C.w + 1.6;
    const frame = t => { const [x, z] = F.gorgeAt(t), q = F.gorgeAt(Math.min(1, t + .01)), p = F.gorgeAt(Math.max(0, t - .01)), dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return { x, z, fx: dx / l, fz: dz / l, sx: -dz / l, sz: dx / l }; };
    const at = (t, th, W, H, amp) => { const f = frame(t), n = 1 + amp * noise2(th * 2.6 + t * 40, t * 30 + W) + amp * .5 * noise2(th * 7 + t * 90, W - t * 60) + amp * .25 * noise2(th * 15 + t * 170, W + t * 120), c = Math.cos(th) * W * n, y = fl + Math.sin(th) * H * (1 + (n - 1) * .5);
      return new THREE.Vector3(f.x + f.sx * c, y, f.z + f.sz * c); };
    return { to: T.to, top: T.top, wi, frame, inner: (t, th) => at(t, th, wi, T.top - fl, .09), outer: (t, th) => at(t, th, wi + 11, T.top - fl + 10, .2) }; })() : null;
  const RU = buildRuins({ F, hAt, LAYERS, Y, LO, TUN }); for (const o of RU.obstacles) F.obstacles.push(o);   /* 고대 수호자 유적 (끊어진 돌다리 · 입구 · 기둥 복도) — ruins.js */
  /* ⑩ 늘어진 뿌리 · 담쟁이 · 테두리 풀: 섬 테두리 밑과 고원 절벽에 늘어짐 (위아래 깊이 · 오래된 섬 느낌) */
  { const parts = [], ROOT = lin(0x4b3a28), IVY = [lin(0x2f5f1c), lin(0x497a22)];
    const edgeV = []; for (let v = 0; v < NV; v++) if (isEdge[v] && rnd() < .035) edgeV.push(v);   /* 테두리 점이 촘촘해져서 비율을 반으로 (뿌리 수는 그대로) */
    /* 테두리에서 늘어진 풀 · 이끼 (사용자 2026-11-10: 테두리가 칼로 자른 듯함): 어깨 너머로 풀이 넘쳐 아래로 휘어 늘어지고, 바로 밑 흙 띠에 이끼가 붙음 */
    { const p = [], c = [], s = [], GR0 = lin(0x2c5a16), GR1 = lin(0x9cbf4a), MOSS = [lin(0x24481a), lin(0x3d6a22)];
      for (let v = 0; v < NV; v++) { if (!isEdge[v] || rnd() > .2) continue; const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], n = nAt(x, z, 1.2), out = new THREE.Vector3(n.x, 0, n.z); if (out.lengthSq() < 1e-4) out.set(x, 0, z); out.normalize();
        const side = new THREE.Vector3(-out.z, 0, out.x);
        for (let b = 0, nb = 3 + (rnd() * 4 | 0); b < nb; b++) { const o = (rnd() - .5) * .5, L = .45 + rnd() * rnd() * 1.6, w = .045 + rnd() * .03, col = [GR0, GR1], tw = (rnd() - .5) * .6, rows = [];   /* 풀잎 한 가닥: 어깨 너머로 나가 무게로 휘어 늘어짐 */
          for (let q = 0; q <= 5; q++) { const f = q / 5, ox = .1 + .35 * Math.sin(f * 1.6) , dy = .12 * Math.sin(f * 2.2) - L * f * f;
            const c0 = new THREE.Vector3(x, y, z).addScaledVector(side, o + tw * f).addScaledVector(out, ox * (.6 + L * .4)).add(new THREE.Vector3(0, dy, 0)), ww = w * (1 - f * .85);
            rows.push([c0.clone().addScaledVector(side, -ww), c0.clone().addScaledVector(side, ww), [col[0][0] + (col[1][0] - col[0][0]) * f, col[0][1] + (col[1][1] - col[0][1]) * f, col[0][2] + (col[1][2] - col[0][2]) * f], f]); }
          for (let q = 0; q < 5; q++) { const [a0, b0, c0, f0] = rows[q], [a1, b1, c1, f1] = rows[q + 1]; for (const [P, C, F] of [[a0, c0, f0], [b0, c0, f0], [b1, c1, f1], [a0, c0, f0], [b1, c1, f1], [a1, c1, f1]]) { p.push(P.x, P.y, P.z); c.push(...C); s.push(F * F * 1.4); } } }
        for (let q = 0; q < 4; q++) { const yy = y - .12 - rnd() * .7, col = MOSS[(rnd() * 2) | 0], sz = .18 + rnd() * .14, c0 = new THREE.Vector3(x, yy, z).addScaledVector(out, .06).addScaledVector(side, (rnd() - .5) * .6), up = new THREE.Vector3(0, 1, 0);   /* 흙 띠에 붙은 이끼 */
          const A = c0.clone().addScaledVector(up, sz * .6), B = c0.clone().addScaledVector(side, sz).addScaledVector(out, .04), C = c0.clone().addScaledVector(up, -sz * .5), D = c0.clone().addScaledVector(side, -sz).addScaledVector(out, .04), sh = .75 + rnd() * .35;
          for (const P of [A, B, C, A, C, D]) { p.push(P.x, P.y, P.z); c.push(col[0] * sh, col[1] * sh, col[2] * sh); s.push(.15); } } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals(); parts.push(g); }
    for (const v of edgeV) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], n = nAt(x, z, 1.5), out = new THREE.Vector3(n.x, 0, n.z); if (out.lengthSq() < 1e-4) out.set(x, 0, z); out.normalize();
      const Lh = 2 + rnd() * rnd() * 9, pts = []; for (let k = 0; k <= 7; k++) { const f = k / 7; pts.push(new THREE.Vector3(x + out.x * (.15 + Math.sin(f * 3.1) * .5 * rnd()) , y - .3 - f * Lh, z + out.z * (.15 + Math.sin(f * 3.1) * .5)).add(new THREE.Vector3(Math.sin(f * 4 + v) * .25, 0, Math.cos(f * 3 + v) * .25))); }
      parts.push(tube(pts, .16 + rnd() * .12, .03, 5, rnd() < .45 ? IVY[0] : ROOT, .2, 1)); }
    /* 고원 · 돌탑 절벽 담쟁이: 턱에서 시작해 절벽 면을 따라 내려옴 · 잎 조각이 엇갈려 붙음 */
    const leafG = []; for (let k = 0; k < 1400 * D; k++) { const x = X0 + rnd() * (X1 - X0), z = Z0 + rnd() * (Z1 - Z0), h = hAt(x, z); if (h < -1 || F.mask(x, z) < 1) continue; const n = nAt(x, z, .4); if (n.y > .55 || n.y < .05) continue;
      const out = new THREE.Vector3(n.x, 0, n.z).normalize(), Lh = 1.5 + rnd() * 5, col = IVY[(rnd() * 2) | 0];
      for (let q = 0; q < Lh / .3; q++) { const yy = h - q * .3; const px = x + out.x * .25, pz = z + out.z * .25; const hh = hAt(px - out.x * .1, pz - out.z * .1); if (yy < hh - 6) break;
        const sx2 = (q % 2 ? 1 : -1) * .18, a = new THREE.Vector3(-out.z, 0, out.x); const c0 = new THREE.Vector3(px + a.x * sx2, yy, pz + a.z * sx2);
        const sz = .16 + rnd() * .1, sh = .7 + rnd() * .4; leafG.push([c0, out, a, sz, [col[0] * sh, col[1] * sh, col[2] * sh]]); } if (leafG.length > 5200 * D) break; }
    { const p = [], c = [], s = []; for (const [c0, out, a, sz, col] of leafG) { const up = new THREE.Vector3(0, 1, 0); const A = c0.clone().addScaledVector(up, sz), B = c0.clone().addScaledVector(a, sz * .8).addScaledVector(out, .05), C = c0.clone().addScaledVector(up, -sz * .6), D = c0.clone().addScaledVector(a, -sz * .8).addScaledVector(out, .05);
        for (const q of [A, B, C, A, C, D]) { p.push(q.x, q.y, q.z); c.push(...col); s.push(.4); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.computeVertexNormals(); parts.push(g); }
    { const r = rngOf(61); for (const q of RU.strands) parts.push(tube(q.pts, q.r, q.root ? q.r * .25 : .025, q.root ? 6 : 4, q.root ? ROOT : r() < .6 ? IVY[(r() * 2) | 0] : ROOT, q.root ? .05 : .3, q.root ? .2 : 1)); }   /* 유적 위에서 늘어진 굵은 뿌리 · 덩굴 · 끊어진 다리 끝 덩굴 */
    { const r = rngOf(67); for (const f of F.floats) for (let k = 0; k < Math.round(f.len * .5); k++) { const a = (r() - .5) * f.len * .9, px = f.x + f.dx * a + (r() - .5) * f.r * .6, pz = f.z + f.dz * a + (r() - .5) * f.r * .6, y0 = LAYERS[f.L] - f.r * .45, Lh = .8 + r() * r() * 2.6, pts = [];   /* 떠 있는 바위 밑에 늘어진 뿌리 */
        for (let e = 0; e <= 6; e++) { const f2 = e / 6; pts.push(new THREE.Vector3(px + Math.sin(f2 * 3 + a) * .2, y0 - f2 * Lh, pz + Math.cos(f2 * 2.4 + a) * .2)); }
        parts.push(tube(pts, .1 + r() * .07, .025, 4, r() < .4 ? IVY[0] : ROOT, .2, 1)); } }
    const g = mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)); const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 color; attribute float aS; uniform float uT; varying vec3 vC, vN, vP; void main(){ vec3 p = position; p.xz += vec2(sin(uT * .9 + p.x * .3 + p.y * .2), cos(uT * .7 + p.z * .3)) * .05 * aS; vC = color; vN = normal; vP = p; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
      fragmentShader: GL + `varying vec3 vC, vN, vP; void main(){ if (cutAway(vP)) discard; vec3 n = normalize(vN); n *= sign(dot(n, uSun) + .3); gl_FragColor = vec4(fogged(lit(vC, n, 1., .9), vP), 1.); }` })); m.name = 'roots'; G.add(m); }

  /* ⑪ 다리: 고원 끝에서 돌탑까지 (기체가 그 밑으로 날아 지나감) · 널빤지 하나하나 다르게 · 밧줄 */
  if (LO.bridge) {
    const A0 = new THREE.Vector3(-14, 0, -20), B0 = new THREE.Vector3(LO.spires[0][0], 0, LO.spires[0][1]);
    const rim = (from, to, minH) => { const d = new THREE.Vector3().subVectors(to, from); let q = from.clone(); for (let t = 0; t <= 1; t += .005) { const x = from.x + d.x * t, z = from.z + d.z * t; if (hAt(x, z) < minH) break; q.set(x, 0, z); } return q; };   /* 꼭대기 가장자리 (절벽 밑이 아니라) */
    const A = rim(A0, B0, Y.PLATEAU - .7), B = rim(B0, A0, LO.spires[0][3] - 1.6); A.y = hAt(A.x, A.z) + .02; B.y = Math.min(hAt(B.x, B.z), A.y + 1.4) + .02;
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
    /* 바위 띠 하나: 굵기가 변하는 관 · 둘레 울퉁불퉁함을 둘레를 따라 이어지게(시작과 끝이 같은 값 → 이음새 틈 없음 · 사용자 2026-11-10) · 옆으로 납작
       cap: 끝을 닫음 (무너진 아치의 끊긴 끝 — 들쭉날쭉한 부러진 면) */
    const band = (pts, ra, seed, cap, flat = 1) => {   /* flat: 위아래 두께 비율 (협곡 천장처럼 넓적한 바위 판) · cap: true = 끝만 · 'both' = 양 끝 */ const N = pts.length - 1, SD = 14, p = [], idx = [], t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      pts.forEach((q, k) => { t.subVectors(pts[Math.min(N, k + 1)], pts[Math.max(0, k - 1)]).normalize(); a.crossVectors(t, up).normalize(); if (a.lengthSq() < .5) a.set(1, 0, 0); b.crossVectors(a, t);
        for (let e = 0; e < SD; e++) { const an = e / SD * 6.283, ca = Math.cos(an), sa = Math.sin(an);
          const r = ra[k] * (1 + .2 * noise2(ca * 1.3 + k * .35 + seed, sa * 1.3 + seed * 2.1) + .08 * noise2(ca * 3 + k * 1.1, sa * 3 - seed)) * (1 + .18 * smoothstep(.55, .85, Math.abs(ca)));
          p.push(q.x + (a.x * ca + b.x * sa * flat) * r, q.y + (a.y * ca + b.y * sa * flat) * r, q.z + (a.z * ca + b.z * sa * flat) * r); } });
      for (let k = 0; k < N; k++) for (let e = 0; e < SD; e++) { const A = k * SD + e, B = A + SD, A1 = k * SD + (e + 1) % SD, B1 = A1 + SD; idx.push(A, B, A1, A1, B, B1); }   /* 둘레를 이어 붙임 (겹치는 꼭짓점 없음) */
      const capAt = (K, P) => { const q = pts[K], dir = new THREE.Vector3().subVectors(pts[K], pts[P]).normalize(), rr = ra[K] * Math.max(flat, .45), flip = K === 0;   /* 부러진 면: 가운데가 조금 튀어나온 들쭉날쭉한 덩어리 */
        const rim = [], ring = []; for (let e = 0; e < SD; e++) ring.push(K * SD + e);
        for (let e = 0; e < SD; e++) { const v = ring[e], vx = p[v * 3], vy = p[v * 3 + 1], vz = p[v * 3 + 2], j = .25 + .5 * Math.abs(noise2(e * .9 + seed + K, seed)); rim.push(p.length / 3); p.push(vx + dir.x * rr * j + (q.x - vx) * .35, vy + dir.y * rr * j + (q.y - vy) * .35, vz + dir.z * rr * j + (q.z - vz) * .35); }
        const tip = p.length / 3; p.push(q.x + dir.x * rr * .55, q.y + dir.y * rr * .55, q.z + dir.z * rr * .55);
        for (let e = 0; e < SD; e++) { const e1 = (e + 1) % SD; if (flip) idx.push(ring[e], ring[e1], rim[e], ring[e1], rim[e1], rim[e], rim[e], rim[e1], tip); else idx.push(ring[e], rim[e], ring[e1], ring[e1], rim[e], rim[e1], rim[e], tip, rim[e1]); } };
      if (cap) capAt(N, N - 1); if (cap === 'both') capAt(0, 1);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    for (const [ax, az, bx, bz, apex, kind] of LO.arches) {
      const N = 40, L = Math.hypot(bx - ax, bz - az), sx = -(bz - az) / L, sz = (bx - ax) / L, base = Math.min(hAt(ax, az), hAt(bx, bz)) - 1.2, seed = ax * .37 + az * .11;
      const R0 = kind === 'thin' ? 1.15 : kind === 'broken' ? 1.7 : 2.0, R1 = kind === 'thin' ? .45 : kind === 'broken' ? .6 : .8, ex = kind === 'thin' ? .9 : .75, sway = kind === 'thin' ? 1.1 : 0;
      const at = f => { const sn = Math.pow(Math.sin(f * Math.PI), ex), sw = Math.sin(f * Math.PI) * sway; return [new THREE.Vector3(ax + (bx - ax) * f + sx * sw, base + (apex - base) * sn, az + (bz - az) * f + sz * sw), R0 - R1 * sn]; };   /* 얇은 아치는 옆으로 살짝 휘어 돎 */
      const seg = (f0, f1, cap) => { const pts = [], ra = []; for (let k = 0; k <= N; k++) { const [q, r] = at(f0 + (f1 - f0) * k / N); pts.push(q); ra.push(r); }
        parts.push(band(pts, ra, seed + f0 * 7, cap)); pts.forEach((q, k) => F.obstacles.push([q.x, q.y, q.z, ra[k]])); return pts; };   /* 막힘: 보이는 두께 그대로 */
      if (kind === 'broken') { const A = seg(0, .58, true), B = seg(1, .86, true);   /* 한쪽은 높이 솟다 끊기고 · 맞은편은 짧은 그루터기 */
        F.archLegs.push([ax, az, R0 * .95, A[N].y], [bx, bz, R0 * .95, B[N].y]);
        const r = rngOf(31); for (let k = 0; k < 4; k++) { const f = .62 + r() * .2, [q] = at(f), x = q.x + (r() - .5) * 3, z = q.z + (r() - .5) * 3, s2 = .6 + r() * .8, g = new THREE.IcosahedronGeometry(s2, 1); g.deleteAttribute('uv');   /* 떨어진 바위 조각 */
          const pp = g.attributes.position; for (let v = 0; v < pp.count; v++) { const nx = pp.getX(v), ny = pp.getY(v), nz = pp.getZ(v), d = 1 + .3 * noise2(nx * 2.1 + k, nz * 2.1 + ny); pp.setXYZ(v, nx * d * 1.2, ny * d * .7, nz * d); }
          g.rotateY(r() * 6.28); g.translate(x, hAt(x, z) + s2 * .25, z); g.computeVertexNormals(); parts.push(g); } }
      else { seg(0, 1, false); F.archLegs.push([ax, az, R0 * .95, apex], [bx, bz, R0 * .95, apex]); } }   /* 시야: 땅에 박힌 다리 바닥 자리만 */
    /* 동굴 입구 (사용자 2026-11-11): 산 밑동이 크게 뚫린 자연 아치 · 들머리만 3층보다 높은 바위 천장 · 입구 앞면은 울퉁불퉁 튀어나온 바위 · 끝은 골짜기로 열림 */
    if (TUN) { const NA = 44, NT = 22, P = [], ix = [], M = 2 * (NA + 1), r = rngOf(83);
      for (let k = 0; k <= NT; k++) { const t = TUN.to * k / NT; for (let a = 0; a <= NA; a++) { const q = TUN.inner(t, a / NA * Math.PI); P.push(q.x, q.y, q.z); } for (let a = NA; a >= 0; a--) { const q = TUN.outer(t, a / NA * Math.PI); P.push(q.x, q.y, q.z); } }
      for (let k = 0; k < NT; k++) for (let i = 0; i < M; i++) { const A = k * M + i, B = k * M + (i + 1) % M, C = A + M, D = B + M; ix.push(A, C, B, B, C, D); }
      for (const [k, sg] of [[0, -1], [NT, 1]]) { const t = TUN.to * k / NT, f = TUN.frame(t), mid = [];   /* 앞 · 뒤 면: 가운데 줄을 밖으로 불룩하게 밀어 바위 덩이처럼 */
        for (let a = 0; a <= NA; a++) { const iv = k * M + a, ov = k * M + (M - 1 - a), th = a / NA * Math.PI, bul = (1.5 + 2.5 * Math.abs(noise2(th * 2.3 + k, 7))) * Math.sin(th) + .6;
          const x = (P[iv * 3] + P[ov * 3]) / 2 + f.fx * sg * bul, y = (P[iv * 3 + 1] + P[ov * 3 + 1]) / 2 + noise2(th * 3, k) * 1.2, z = (P[iv * 3 + 2] + P[ov * 3 + 2]) / 2 + f.fz * sg * bul; mid.push(P.length / 3); P.push(x, y, z); }
        for (let a = 0; a < NA; a++) { const i0 = k * M + a, i1 = i0 + 1, o0 = k * M + (M - 1 - a), o1 = o0 - 1, m0 = mid[a], m1 = mid[a + 1]; ix.push(i0, m0, i1, i1, m0, m1, m0, o0, m1, m1, o0, o1); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(ix); g.computeVertexNormals(); g.userData.double = true; tunnelG = g;
}
    /* 골짜기길 바닥: 무너진 돌계단 · 쓰러진 기둥 · 벽 밑 부러진 기둥 그루터기 (오래된 길이라는 흔적 · 낮아서 1층도 막지 않음) */
    if (LO.gorge && LO.gorge.ruins) { const C = LO.gorge, r = rngOf(91), slab = (x, y, z, w, h, d, rot) => { const gg = new THREE.BoxGeometry(w, h, d, 3, 1, 2); gg.deleteAttribute('uv'); const pp = gg.attributes.position;
        for (let v = 0; v < pp.count; v++) { const X = pp.getX(v), Y2 = pp.getY(v), Z = pp.getZ(v); pp.setXYZ(v, X + noise2(Y2 * 3 + x, Z * 3) * .12, Y2 + (Y2 > 0 ? noise2(X * 2.4 + z, Z * 2.4) * .12 : 0), Z + noise2(X * 3, Y2 * 3 + z) * .12); }
        gg.rotateY(rot); gg.translate(x, y, z); gg.computeVertexNormals(); parts.push(gg); };
      for (const ts of C.ruins.stairs) { const f = TUN ? TUN.frame(ts) : null; const [x, z] = F.gorgeAt(ts), q = F.gorgeAt(ts + .01), rot = Math.atan2(-(q[1] - z), q[0] - x) + Math.PI / 2;
        for (let k = 0; k < 5; k++) { if (r() < .22) continue; const fx = (q[0] - x), fz = (q[1] - z), l = Math.hypot(fx, fz), ox = x + fx / l * k * 1.5, oz = z + fz / l * k * 1.5; slab(ox + (r() - .5) * .8, hAt(ox, oz) + .25 + k * .22, oz + (r() - .5) * .8, C.w * (1.1 + r() * .5), .45, 1.3, rot + (r() - .5) * .18); } }
      for (const [ts, sd] of C.ruins.columns) { const [x, z] = F.gorgeAt(ts), q = F.gorgeAt(ts + .01), fx = q[0] - x, fz = q[1] - z, l = Math.hypot(fx, fz), sx = -fz / l, sz = fx / l, px = x + sx * sd * (C.w - 1.6), pz = z + sz * sd * (C.w - 1.6);
        const cg = new THREE.CylinderGeometry(.85, .95, 6.5, 12, 6); cg.deleteAttribute('uv'); const pp = cg.attributes.position; for (let v = 0; v < pp.count; v++) { const X = pp.getX(v), Y2 = pp.getY(v), Z = pp.getZ(v), an = Math.atan2(Z, X), d = 1 + .06 * Math.sin(an * 12) + .07 * noise2(Y2 + ts * 9, an); pp.setXYZ(v, X * d, Y2 + (Math.abs(Y2) > 3 ? noise2(an * 2, ts) * .5 : 0), Z * d); }   /* 홈 파인 기둥 · 부러진 끝 */
        cg.rotateZ(Math.PI / 2); cg.rotateY(Math.atan2(-fz, fx) + (r() - .5) * .6); cg.translate(px, hAt(px, pz) + .55, pz); cg.computeVertexNormals(); parts.push(cg);
        const st = new THREE.CylinderGeometry(.9, 1.05, 1.8, 12, 2); st.deleteAttribute('uv'); const sp = st.attributes.position; for (let v = 0; v < sp.count; v++) { const X = sp.getX(v), Y2 = sp.getY(v), Z = sp.getZ(v); sp.setY(v, Y2 > 0 ? Y2 + (noise2(X * 2, Z * 2 + ts) - .2) * .6 : Y2); }
        const qx = px + fx / l * 3.2, qz = pz + fz / l * 3.2; st.translate(qx, hAt(qx, qz) + .7, qz); st.computeVertexNormals(); parts.push(st); } }
    /* 바위 칠 (아치 · 협곡 천장 · 떠 있는 바위 같이 씀): 층진 결 · 위쪽 면엔 이끼 (lo, hi: 이끼가 덮이는 기울기) */
    const rockM = (lo, hi) => new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: `varying vec3 vP, vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec3 vP, vN; void main(){ if (cutAway(vP)) discard; vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n); an /= an.x + an.y + an.z;
        float tr = fb(vP.zy * .9) * an.x + fb(vP.xz * .9) * an.y + fb(vP.xy * .9) * an.z, tr2 = vn(vP.zy * 4.) * an.x + vn(vP.xz * 4.) * an.y + vn(vP.xy * 4.) * an.z;
        float band = sin(vP.y * 2.4 + tr * 5.) * .5 + .5; vec3 rock = mix(vec3(.30, .25, .20), vec3(.58, .51, .42), band) * (.7 + .45 * tr) * (.85 + .25 * tr2);
        float moss = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, n.y + (tr2 - .5) * .5); rock = mix(rock, mix(vec3(.12, .27, .06), vec3(.30, .45, .12), tr2), moss);   /* 위쪽 면엔 이끼 */
        float ao = .55 + .45 * smoothstep(-.8, .4, n.y); gl_FragColor = vec4(fogged(lit(rock, n, 1., ao), vP), 1.); }` });
    parts.push(...RU.rock);   /* 동굴 들머리 종유석 */
    if (parts.length) { const m = new THREE.Mesh(mergeAll(parts), rockM(.35, .75)); m.name = 'arches'; G.add(m); }   /* 바위가 하나도 없는 배치도 있음 */
    if (RU.geos.length) { const sm = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,   /* 깎은 돌 (유적): 밝은 사암빛 · 빗물 자국 세로 얼룩 · 오목한 곳 그늘 · 윗면 이끼 · 가는 금 */
        vertexShader: `attribute float aGlow; varying vec3 vP, vN; varying float vG; void main(){ vP = position; vN = normal; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
        fragmentShader: GL + `varying vec3 vP, vN; varying float vG; void main(){ if (cutAway(vP)) discard; vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n); an /= an.x + an.y + an.z;
          float tr = fb(vP.zy * 1.3) * an.x + fb(vP.xz * 1.3) * an.y + fb(vP.xy * 1.3) * an.z, tr2 = vn(vP.zy * 6.) * an.x + vn(vP.xz * 6.) * an.y + vn(vP.xy * 6.) * an.z;
          vec3 st = mix(vec3(.33, .31, .27), vec3(.55, .51, .44), tr) * (.84 + .22 * tr2);   /* 산 바위와 비슷한 톤 */
          float streak = vn(vec2(vP.x * 1.7 + vP.z * 1.3, vP.y * .18)); st *= .82 + .18 * smoothstep(.25, .7, streak);   /* 빗물 자국 */
          float crack = smoothstep(.035, .0, abs(vn(vP.xz * .9 + vP.y * .4) - .5)) * (1. - an.y); st *= 1. - .35 * crack;
          float lich = smoothstep(.7, .76, vn(vP.zy * 2.6 + vP.x * 1.9) * an.x + vn(vP.xy * 2.6 + vP.z * 1.9) * an.z + vn(vP.xz * 2.6) * an.y); st = mix(st, vec3(.78, .79, .7), lich * .4);   /* 바위옷 (희끗한 점무늬) */
          float moss = smoothstep(.62, .92, n.y + (tr2 - .5) * .4) * smoothstep(.42, .78, vn(vP.xz * .32 + vP.y * .1)) * .85; st = mix(st, mix(vec3(.14, .25, .08), vec3(.28, .40, .13), tr2), moss);   /* 이끼는 위를 보는 면에만 · 군데군데 */
          float ao = .5 + .5 * smoothstep(-.7, .5, n.y); vec3 c = lit(st, n, 1., ao);
          float flow = .35 + .65 * pow(.5 + .5 * sin(uT * 1.3 - vP.y * .7 + vP.x * .2), 3.);   /* 룬 빛: 아래에서 위로 천천히 흐름 */
          c += vec3(.22, .95, .8) * vG * flow * 1.4 * (.35 + .65 * seen(vP)); gl_FragColor = vec4(fogged(c, vP), 1.); }` });
      const rm = new THREE.Mesh(mergeAll(RU.geos), sm); rm.name = 'ruins'; G.add(rm); }
    if (tunnelG) { const tm = rockM(.55, .9); tm.side = THREE.DoubleSide; const t2 = new THREE.Mesh(tunnelG, tm); t2.name = 'cave'; G.add(t2); }
    /* 떠 있는 바위 (오르내리는 구역 · 사용자 2026-11-11): 바위 덩이 여럿이 줄지어 그 층 높이에 떠서 한 줄을 막음 (보이는 두께 = 막히는 두께)
       팽이처럼 위는 둥근 바위 언덕(꼭대기만 이끼) · 옆은 층진 바위 결 · 아래로 길게 뾰족한 바위 뿌리 — 늘인 판 하나가 아니게 */
    if (F.floats.length) { const fp = [], r = rngOf(71); for (const f of F.floats) { const n = Math.max(2, Math.round(f.len / 8.5)), seg = f.len / n;
      for (let c = 0; c < n; c++) { const a = -f.len / 2 + seg * (c + .5) + (r() - .5) * seg * .25, ax = seg * (.6 + r() * .14), az = f.r * (1 + r() * .15), up = 2 + r() * .8, keel = 3 + r() * 1.6, sd = r() * 50;
        const g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('uv'); const pp = g.attributes.position;
        for (let v = 0; v < pp.count; v++) { const nx = pp.getX(v), ny = pp.getY(v), nz = pp.getZ(v), d = 1 + .2 * noise2(nx * 2.4 + sd, nz * 2.4 + ny * 1.7) + .045 * noise2(nx * 5 + sd, ny * 5 - sd);
          const y = ny > 0 ? ny * up * (.7 + .3 * noise2(nx * 3 + sd, nz * 3)) : ny * keel * (.8 + .35 * noise2(nx * 2 + sd, nz * 2 + 5));   /* 위: 둥근 바위 언덕 · 아래: 길게 뾰족한 바위 뿌리 */
          const hk = ny < 0 ? 1 - .3 * Math.pow(-ny, 2) : 1; pp.setXYZ(v, nx * d * ax * hk, y * d - up * .35, nz * d * az * hk); }
        g.rotateZ((r() - .5) * .14); g.rotateY(-f.rot + (r() - .5) * .25); g.translate(f.x + f.dx * a, LAYERS[f.L] + (r() - .5) * .4, f.z + f.dz * a); g.computeVertexNormals(); fp.push(g); } }
      const fm = new THREE.Mesh(mergeAll(fp), rockM(.72, .98)); fm.name = 'floats'; G.add(fm); } }

  /* ⑫ 폭포 두 줄기: 고원에서 연못으로 · 물길 끝에서 섬 밖 안개 속으로 — 물줄기 결이 흘러내리고 아래는 흩어짐 */
  const FX = new THREE.Group(); G.add(FX); const fallM = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float aV, aU, aF, aT, aL; varying vec2 vU; varying vec3 vP; varying float vF, vT, vL; void main(){ vU = vec2(aU, aV); vP = position; vF = aF; vT = aT; vL = aL; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
    fragmentShader: GL + `varying vec2 vU; varying vec3 vP; varying float vF, vT, vL;   /* vF: 부딪히는 곳 물거품(수면 · 바위 턱) · vT: 허공으로 떨어지며 흩어지는 정도 */
      void main(){ float x = vU.x, v = vU.y, l = vL * .16; float s = vn(vec2(x * 9., l * 1.2 - uT * 2.6)) * .6 + vn(vec2(x * 23., l * 3. - uT * 4.1)) * .4;   /* 흘러내리는 물줄기 결 (흘러간 거리 기준 · 끊김 없이) */
        float edge = smoothstep(0., .18, x) * smoothstep(1., .82, x), brk = smoothstep(.15, .9, v);                                     /* 아래로 갈수록 물줄기가 갈라져 가닥이 됨 */
        float a = mix(.35 + .65 * smoothstep(.3, .8, s), smoothstep(.42, .7, s), brk * .8) * edge;
        a *= smoothstep(0., .04, v) * (1. - smoothstep(.75, 1., v) * .7);
        float lip = smoothstep(1.6, 0., vL), foam = vF * smoothstep(.3, .65, vn(vec2(x * 30., l * 6. - uT * 6.)));   /* 넘어가는 턱의 흰 물머리 · 실제로 부딪히는 곳(수면 · 턱)에만 물거품 */
        a *= 1. - vT * (.6 + .4 * smoothstep(.55, .3, s));                                                                     /* 허공으로 떨어지는 폭포는 점점 가늘게 흩어져 안개로 사라짐 */
        vec3 c = mix(vec3(.62, .82, .9), vec3(1.), max(smoothstep(.45, .85, s), max(lip * .9, foam))) * 1.25; a = min(1., a + lip * .35 * edge + foam * .3 * edge);
        gl_FragColor = vec4(fogged(c, vP), a * .85); }` });
  /* 물줄기 하나 (사용자 2026-11-10: 층진 턱에서 계단처럼 꺾임 · 섬 밖 폭포가 옆으로 기어감 · 물결이 잘려 보임)
     · 높이마다 바위 바깥으로 길을 잡되, 턱을 만나기 조금 전부터 미리 앞으로 둥글게 휘어 넘어감 (포물선처럼 · 꺾이지 않게)
     · 섬 밖으로 떨어지는 폭포는 섬 땅 속에 들어갈 때만 밀고, 테두리를 넘으면 곧게 떨어짐
     · 물결 무늬는 물줄기를 따라 흘러간 거리로 그림 → 휘어 넘어가는 곳에서도 같은 빠르기로 끊김 없이 흐름
     · 턱을 넘는 자리에 흰 물머리 · 수면에 닿으면 끝에서 물거품(intoWater) · 허공으로 떨어지면 흩어짐 */
  /* 폭포 길 (한 번만 계산 · 여러 장이 같은 길을 따름 → 층져 보이지 않게 · 사용자 2026-11-10)
     · 물줄기 폭 전체(왼쪽 끝 ~ 오른쪽 끝)가 바위에 묻히지 않게 확인 (가장자리가 턱 뒤로 숨던 것) · lo, hi: 가운데에서 옆으로 펼쳐진 범위 */
  const N_F = 64;
  const fallPath = (P0, out, H, w, lo, hi, intoWater) => { const side = new THREE.Vector3(-out.z, 0, out.x), need = [], hit = [0], D = [];
    for (let k = 0; k <= N_F; k++) { const f = k / N_F, y = P0.y - H * f, sp = 1 + f * .6; let d = (2.6 * Math.sqrt(f) + 1.2 * f) * w;
      const inRock = d => { for (let q = 0; q <= 4; q++) { const o = (lo + (hi - lo) * q / 4) * sp, x = P0.x + out.x * d + side.x * o, z = P0.z + out.z * d + side.z * o; if (hAt(x, z) > y - .35 && (intoWater || F.mask(x, z) > -.4)) return true; } return false; };   /* 섬 밖 폭포: 테두리 밖이면 바위 아님 */
      for (let q = 0; q < 300 && inRock(d); q++) d += .08; need.push(d); }
    for (let k = 1; k <= N_F; k++) { const raw = need[k]; need[k] = Math.max(need[k], need[k - 1]); hit[k] = smoothstep(.1, .6, raw - need[k - 1]); }
    for (let k = 0; k <= N_F; k++) { let d = need[k]; for (let j = k + 1; j <= Math.min(N_F, k + 10); j++) d = Math.max(d, need[j] - (j - k) * .32); D.push(d); }   /* 턱을 만나기 전부터 미리 휘어 나감 */
    for (let pass = 0; pass < 3; pass++) for (let k = 1; k < N_F; k++) D[k] = Math.max(need[k], (D[k - 1] + D[k] * 2 + D[k + 1]) / 4);   /* 꺾임을 둥글게 (바위 안으로는 안 들어감) */
    return { D, hit }; };
  /* 물줄기 한 장: 길을 따라 · lat 옆 자리 · dz 앞뒤로 살짝 겹침 · 물결 무늬는 흘러간 거리로 (끊김 없이)
     · 턱을 넘는 자리에 흰 물머리 · 수면에 닿으면 끝에서 물거품(intoWater) · 허공으로 떨어지면 점점 가늘게 흩어짐 */
  const fall = (P0, out, H, path, lat, wid, dz, intoWater) => { const side = new THREE.Vector3(-out.z, 0, out.x), p = [], u = [], vv = [], ll = [], fo = [], th = [], ix = []; let L = 0, prev = null, end = P0.clone();
    for (let k = 0; k <= N_F; k++) { const f = k / N_F, sp = 1 + f * .6, c = P0.clone().addScaledVector(out, path.D[k] + dz).addScaledVector(side, lat * sp).add(new THREE.Vector3(0, -H * f, 0)); if (prev) L += c.distanceTo(prev); prev = c; end = c;
      const ww = wid * sp, fz = Math.max(path.hit[k] * .8, intoWater ? smoothstep(.9, 0, H * (1 - f)) : 0);
      for (const e of [0, 1]) { const q = c.clone().addScaledVector(side, (e - .5) * ww); p.push(q.x, q.y, q.z); u.push(e); vv.push(f); ll.push(L); fo.push(fz); th.push(intoWater ? 0 : smoothstep(.25, 1, f)); } }
    for (let k = 0; k < N_F; k++) { const a = k * 2; ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(u, 1)); g.setAttribute('aV', new THREE.Float32BufferAttribute(vv, 1)); g.setAttribute('aL', new THREE.Float32BufferAttribute(ll, 1));
    g.setAttribute('aF', new THREE.Float32BufferAttribute(fo, 1)); g.setAttribute('aT', new THREE.Float32BufferAttribute(th, 1)); g.setIndex(ix);
    const m = new THREE.Mesh(g, fallM); m.renderOrder = 3; FX.add(m); return end; };   /* 끝자리 (물에 닿는 곳) */
  /* 고원 남쪽 가장자리에서 연못에 가장 가까운 곳 */
  let best = null; if (LO.pond) for (let a = 0; a < 6.283; a += .02) { for (let d = 0; d < 30; d += .2) { const x = LO.pond[0] + Math.cos(a) * d, z = LO.pond[1] + Math.sin(a) * d; if (F.plateau(x, z) > 3.3) { if (!best || d < best.d) best = { d, x, z }; break; } } }
  const fallSpots = [];
  if (best) { const n = nAt(best.x - (best.x - LO.pond[0]) * .15, best.z - (best.z - LO.pond[1]) * .15, 1.5), out = new THREE.Vector3(LO.pond[0] - best.x, 0, LO.pond[1] - best.z).normalize(); const P0 = new THREE.Vector3(best.x, hAt(best.x, best.z) + .1, best.z);
    const SH = [[.36, 2.2, 0], [-.12, 1.4, .1], [-.3, 1.1, -.08]], H = P0.y - Y.WATER, path = fallPath(P0, out, H, 1, Math.min(...SH.map(([l, w]) => l - w / 2)), Math.max(...SH.map(([l, w]) => l + w / 2)), true);   /* 세 장: 옆 자리 · 폭 · 앞뒤 겹침 */
    const ends = SH.map(([lat, wid, dz]) => fall(P0, out, H, path, lat, wid, dz, true));
    const q = ends[0]; fallSpots.push(new THREE.Vector3(q.x, Y.WATER + .2, q.z)); WFALL.value.set(q.x, q.z, 1); }   /* 물줄기 끝 = 물보라 · 수면 물거품 자리 */
  if (LO.channel) { const [ax, az, bx, bz] = LO.channel; let ex = ax, ez = az; for (let t = 0; t <= 1; t += .005) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (F.mask(x, z) < .2) break; ex = x; ez = z; }
    const out = new THREE.Vector3(bx - ax, 0, bz - az).normalize(), P0 = new THREE.Vector3(ex, Y.WATER, ez); const path = fallPath(P0, out, 34, 1.15, -1, 1, false); for (const [lat, wid, dz] of [[0, 2, 0], [.15, 1.4, .1]]) fall(P0, out, 34, path, lat, wid, dz, false);   /* 섬 밖 폭포: 허공 안개 덩어리는 뺌 (부딪힐 곳이 없어서 · 사용자 2026-11-10) — 물줄기가 스스로 흩어짐 */ }

  /* ⑫-2 동굴 · 골짜기 (사용자 2026-11-11: 멋지고 신비롭게) — 벽을 타고 떨어지는 가는 폭포 · 빛 이끼 · 돌기둥 문양 · 제단 금빛 테 · 하늘 틈으로 내려오는 햇빛 줄기 */
  const extraMist = [];
  if (LO.gorge) { const C = LO.gorge, r = rngOf(101);
    for (const [ft, sd] of C.falls || []) { const [x, z] = F.gorgeAt(ft), q = F.gorgeAt(ft + .01), fx = q[0] - x, fz = q[1] - z, l = Math.hypot(fx, fz), sx = -fz / l * sd, sz = fx / l * sd;   /* 벽 꼭대기 가장자리에서 골짜기 쪽으로 */
      let P0 = null; for (let d = C.w; d < C.w + 30; d += .3) { const px = x + sx * d, pz = z + sz * d; if (hAt(px, pz) > C.floor + 20) { P0 = new THREE.Vector3(px, hAt(px, pz) + .1, pz); break; } }
      if (!P0) continue; const out = new THREE.Vector3(-sx, 0, -sz), H = P0.y - C.floor - .3, path = fallPath(P0, out, H, .8, -.5, .5, false);
      for (const [lat, wid, dz] of [[0, 1.1, 0], [.12, .7, .08]]) fall(P0, out, H, path, lat, wid, dz, false);
      for (let k = 0; k < 5; k++) extraMist.push([x - sx * C.w * .4 + (r() - .5) * 3, C.floor + 1 + r() * 2.5, z - sz * C.w * .4 + (r() - .5) * 3, 2.2 + r() * 2, .55]); }
    if (TUN) { const f0 = TUN.frame(0); for (let k = 0; k < 16; k++) { const d = r() * 9, o = (r() - .5) * TUN.wi * 1.4; extraMist.push([f0.x - f0.fx * d + f0.sx * o, C.floor + .6 + r() * 3.5, f0.z - f0.fz * d + f0.sz * o, 2.6 + r() * 2.8, .5 + r() * .25]); } }   /* 굴에서 숨 쉬듯 흘러나오는 차가운 안개 */
    if (LO.mount) for (const [cx, cz, rr] of LO.mount.blobs) for (let k = 0; k < Math.round(rr / 6); k++) { const a = r() * 6.283, d = Math.sqrt(r()) * rr; extraMist.push([cx + Math.cos(a) * d, Y.MEADOW + LO.mount.peak * (.38 + r() * .22), cz + Math.sin(a) * d, 8 + r() * 7, .3 + r() * .15]); }   /* 산 중턱에 걸린 안개 띠 */
    /* 빛 무늬 (빛 번짐에 걸려 은은히 빛남): 유적 문양 */
    const gp = [], gc = [], gs = [], tri = (A, B, C2, col, ph) => { for (const v of [A, B, C2]) { gp.push(v.x, v.y, v.z); gc.push(...col); gs.push(ph); } };
    for (const [A, B, C2, col, ph] of RU.glow) tri(A, B, C2, col, ph);   /* 유적 빛 무늬: 기둥 · 상인방 문양 */
    if (gp.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(gs, 1));
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute vec3 color; attribute float aS; varying vec3 vC, vP; varying float vS; void main(){ vC = color; vS = aS; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
        fragmentShader: GL + `varying vec3 vC, vP; varying float vS; void main(){ if (cutAway(vP)) discard; float b = .55 + .45 * sin(uT * 1.3 - vS * 6.283); gl_FragColor = vec4(vC * b * (.25 + .75 * seen(vP)), 1.); }` })); m.renderOrder = 5; m.name = 'glow'; FX.add(m); }
    /* 햇빛 줄기: 골짜기 위 하늘 틈에서 해 쪽으로 비스듬히 내려와 바닥에 닿음 · 먼지에 비친 듯 결이 흐름 · 천천히 밝아졌다 흐려짐 (늘 카메라 쪽을 봄) */
    { const sp = [], sa = [], sc = [], ix2 = []; const n = 7; for (let k = 0; k < n; k++) { const t = (TUN ? TUN.to + .06 : .05) + (k + r() * .6) / n * (.95 - (TUN ? TUN.to + .06 : .05)), [x, z] = F.gorgeAt(t), L2 = 36 + r() * 14, w = 1.6 + r() * 2.2, o = (r() - .5) * C.w;
        const q = F.gorgeAt(Math.min(1, t + .01)), fx = q[0] - x, fz = q[1] - z, l = Math.hypot(fx, fz), bx = x - fz / l * o, bz = z + fx / l * o, b = sp.length / 3;
        for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { sp.push(bx, C.floor + .2, bz); sa.push(u * w, v * L2); sc.push(r() * 10); } ix2.push(b, b + 1, b + 2, b, b + 2, b + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(sa, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(sc, 1)); g.setIndex(ix2);
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute vec2 aQ; attribute float aS; uniform vec3 uSun; varying vec2 vQ; varying float vS; varying vec3 vP; void main(){ vec3 ax = normalize(uSun), base = position + ax * aQ.y;
          vec3 wpos = (modelMatrix * vec4(base, 1.)).xyz, vd = normalize(cameraPosition - wpos), sd = normalize(cross(ax, vd)); vec3 p = base + sd * aQ.x; vQ = vec2(aQ.x > 0. ? 1. : -1., aQ.y > 0. ? 1. : 0.); vS = aS; vP = p;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
        fragmentShader: GL + `varying vec2 vQ; varying float vS; varying vec3 vP; void main(){ float x = vQ.x, y = vQ.y; float edge = 1. - x * x, a = edge * edge * smoothstep(0., .12, y) * smoothstep(1., .45, y);
          float dust = .65 + .35 * vn(vec2(x * 3. + vS, y * 9. - uT * .25)), pulse = .55 + .45 * sin(uT * .35 + vS);
          gl_FragColor = vec4(vec3(1., .93, .72) * a * dust * pulse * .24 * (.3 + .7 * seen(vP)), 1.); }` })); m.frustumCulled = false; m.renderOrder = 7; m.name = 'shafts'; FX.add(m); } }
  /* ⑬ 안개: 폭포 밑 물보라 · 섬 아래 · 구름 띠 (흐릿한 덩이가 천천히 흘러감) */
  { const L3 = [...extraMist]; for (const s of fallSpots) for (let k = 0; k < 10; k++) L3.push([s.x + (rnd() - .5) * 4.5, s.y + .3 + rnd() * 2.2, s.z + (rnd() - .5) * 4.5, 1.8 + rnd() * 2.4, .9]);   /* 물보라 */
    for (const C of LO.islands) { const [cx, cz] = C[0], R = Math.max(...C.map(([x, z, r]) => Math.hypot(x - cx, z - cz) + r)), k2 = Math.min(1.6, R / 38);   /* 섬마다 그 밑과 둘레에 (큰 섬일수록 많이 · 넓게) */
      for (let k = 0; k < 26 * k2; k++) { const a = rnd() * 6.283, d = (18 + rnd() * 30) * k2; L3.push([cx + Math.cos(a) * d, -18 - rnd() * 22, cz + Math.sin(a) * d, 9 + rnd() * 10, .5]); }
      for (let k = 0; k < 14 * k2; k++) { const a = rnd() * 6.283, d = (40 + rnd() * 20) * k2; L3.push([cx + Math.cos(a) * d, -9 - rnd() * 6, cz + Math.sin(a) * d, 7 + rnd() * 6, .35]); } }
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
    for (const Z of LO.brush) pick(Z[0][0], Z[0][1], Z[0][2] + 2.5, 22, .8, 4.5); if (LO.pond) pick(LO.pond[0], LO.pond[1], 9, 30, .3, 3); if (LO.gorge) { for (let t = .05; t < 1; t += .06) { const [x, z] = F.gorgeAt(t); pick(x, z, LO.gorge.w, 6, 1, 12); } if (LO.gorge.basin) pick(LO.gorge.basin[0], LO.gorge.basin[1], LO.gorge.basin[2], 50, .8, 10); }   /* 골짜기 · 공터: 떠다니는 꽃가루가 빛을 받아 반짝임 */ if (best) pick(best.x, best.z, 6, 16, 1, 9);
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

  /* 넓은 맵은 칸(LO.tile)마다 나눠 그림 → 화면 밖 칸은 그리지 않음 (같은 모양 · 같은 칠 · 꼭짓점 묶음을 같이 씀) */
  if (LO.tile) { const T = LO.tile, key = (x, z) => Math.floor(x / T) + ',' + Math.floor(z / T), M4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const o of [...G.children]) { if (!(o.isMesh && ['isleTop', 'isleBottom', 'roots', 'brush', 'grass', 'ferns', 'flowers0', 'flowers1', 'flowers2', 'stones', 'arches'].includes(o.name))) continue;
      if (o.isInstancedMesh) { const grp = new Map(); for (let k = 0; k < o.count; k++) { o.getMatrixAt(k, M4); const q = key(M4.elements[12], M4.elements[14]); if (!grp.has(q)) grp.set(q, []); grp.get(q).push(M4.clone()); }
        for (const L of grp.values()) { const n = new THREE.InstancedMesh(o.geometry, o.material, L.length); L.forEach((q, i) => n.setMatrixAt(i, q)); n.computeBoundingSphere(); n.boundingSphere.radius += 1; n.name = o.name; G.add(n); } G.remove(o); continue; }
      const g = o.geometry, P = g.attributes.position, ix = g.index ? g.index.array : null, nT = (ix ? ix.length : P.count) / 3, grp = new Map();
      for (let t = 0; t < nT; t++) { const a = ix ? ix[t * 3] : t * 3, b = ix ? ix[t * 3 + 1] : t * 3 + 1, c = ix ? ix[t * 3 + 2] : t * 3 + 2, q = key((P.getX(a) + P.getX(b) + P.getX(c)) / 3, (P.getZ(a) + P.getZ(b) + P.getZ(c)) / 3); if (!grp.has(q)) grp.set(q, []); grp.get(q).push(a, b, c); }
      for (const L of grp.values()) { const ng = new THREE.BufferGeometry(); for (const k in g.attributes) ng.setAttribute(k, g.attributes[k]); ng.setIndex(new THREE.BufferAttribute(P.count > 65535 ? new Uint32Array(L) : new Uint16Array(L), 1));
        const bb = new THREE.Box3(); for (const i of L) bb.expandByPoint(v.fromBufferAttribute(P, i)); bb.expandByScalar(.6); ng.boundingBox = bb; ng.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
        const n = new THREE.Mesh(ng, o.material); n.name = o.name; n.renderOrder = o.renderOrder; G.add(n); } G.remove(o); } }
  G.scale.setScalar(K); U.uK.value = K;   /* 모양 · 무늬 · 안개 높이는 섬 안 좌표로 계산하고 통째로 줄임 → 들꽃 · 잎 무늬까지 같이 작아짐 */
  G.traverse(o => { if (o.isMesh || o.isPoints) { st.draws++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; st.tris += o.isInstancedMesh ? n * o.count : o.isPoints ? 0 : (g.instanceCount ? n * g.instanceCount : n); } });
  st.ground = { full: fullT, kept: I.length / 3, bottom: BI.length / 3 }; st.plants = plants.length;
  return { GL, U, hAtL: hAt, pxU: G.userData.motes.material.uniforms.uPx,   /* 보물 장소처럼 섬 위에 따로 얹는 것이 같은 칠 · 높이를 씀 */
    group: G, K, field: F, H: (x, z) => hAt(x / K, z / K) * K, mask: (x, z) => F.mask(x / K, z / K) * K, blocked: (x, z, L = 1) => F.blocked(x / K, z / K, L), where: (x, z) => F.where(x / K, z / K), inGorge: (x, z) => F.inGorge(x / K, z / K, .2), layout: LO, setCut: (s, c, R, amt = 1) => { U.uCutA.value.set(s.x / K, s.y / K, s.z / K, R / K); U.uCutB.value.set(c.x / K, c.y / K, c.z / K, amt); }, sightBlock: (x, z, L) => F.sightBlock(x / K, z / K, L), inBrush: (x, z) => F.brush(x / K, z / K) > 0, brushZone: (x, z) => F.brushZone(x / K, z / K), setSight: (tex, x, z, R, on) => { U.uRay.value = tex; U.uVC.value.set(x, z); U.uVR.value = R; U.uVOn.value = on; }, layers: LAYERS.map(y => y * K), push: (x, z, r, k) => U.uPush.value.set(x / K, z / K, r / K, k / K), stats: st, sky, setPx: px => { G.userData.motes.material.uniforms.uPx.value = px; }, update: t => { U.uT.value = t; } };
}
