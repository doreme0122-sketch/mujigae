/* 돌산 · 절벽 섬 (사용자 2026-11-14 '작업해': 땅 모양은 코드로 한 덩어리 · 받은 조각은 눈에 띄는 자리 약 10개만 · 층 높이 차이를 크게)
   · 코드로 만드는 것: 위 평지 · 둘레 절벽 · 북쪽(12시) 높은 산줄기 · 보물방 위 중간 산 · 평지 낮은 둔덕 — 이음새 없는 땅 하나 + 절벽 벽 하나
     바위 = 덩어리를 쌓은 모양 · 덩어리마다 다른 회색 (받은 조각과 같은 빛깔) · 평평한 곳은 풀 (1번 이끼 · 14번 풀밭 · 7번 돌판 그림)
   · 받은 조각: 11 아치(보물방 입구) · 14 판(튀어나온 평지) · 10 기둥 바위 셋(절벽 바깥) · 9 바위 셋(길 꺾인 곳) · 7 옛 돌판(갈림길)
   · 평지 개울이 동 · 서 절벽에서 폭포로 · 맨 아래 협곡 물길(못 내려감)
   · 높이 셋: 1층 절벽 중간 판(평지보다 8m 아래) · 2층 평지 · 3층 하늘(땅에서 9m) — 3층에서도 북쪽 산줄기(14m 넘음)는 못 넘음
   · 조작 · 카메라 게임과 같음 (56° · 세로 22) · 위 = 12시 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFlight, FLY } from './flight.js?v=11141600';
import { makeForgeShip, forgeList } from './forgeship.js?v=11141600';

const $ = s => document.querySelector(s);
const fract = x => x - Math.floor(x), hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b); return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };
const pnoise = (x, y, P) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b), H = (p, q) => hash(((p % P) + P) % P, ((q % P) + P) % P); return (H(i, j) * (1 - u) + H(i + 1, j) * u) * (1 - v) + (H(i, j + 1) * (1 - u) + H(i + 1, j + 1) * u) * v; };
const fbm = (x, y) => .5 * noise(x, y) + .25 * noise(x * 2.1 + 5, y * 2.1) + .125 * noise(x * 4.3, y * 4.3 + 9);
const clamp01 = x => Math.max(0, Math.min(1, x)), sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ── 배치 (단위: 섬 안 단위 · 통째로 0.5배 = 게임 m · y 위 · −z = 12시) ── */
const SC = .5, TOP = 0, LEDGE = -16, WATER = -30;   /* 튀어나온 평지(1층)는 평지보다 16단위(8m) 아래 · 물은 30단위(15m) 아래 */
const PLATEAU0 = [[-50, -44], [50, -44], [57, -12], [50, 12], [26, 15], [13, 13], [-13, 13], [-26, 15], [-50, 12], [-57, -12]];
const PLATEAU = (() => { const out = []; for (let i = 0; i < PLATEAU0.length; i++) { const [ax, az] = PLATEAU0[i], [bx, bz] = PLATEAU0[(i + 1) % PLATEAU0.length], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 9)), nx = (bz - az) / L, nz = -(bx - ax) / L;
  for (let k = 0; k < n; k++) { const t = k / n, keep = Math.abs(ax + (bx - ax) * t) < 15 && az + (bz - az) * t > 10, w = keep ? 0 : (Math.sin(i * 7.1 + k * 2.3) * .5 + Math.sin(i * 3.7 + k * 5.9) * .5) * 4.5 * (k ? 1 : 0);   /* 가장자리를 굽이지게 (입구 둘레는 반듯) */
    out.push([ax + (bx - ax) * t + nx * w, az + (bz - az) * t + nz * w]); } } return out; })();
const LEDGE_AREA = [[-11, 13.5], [11, 13.5], [12, 22], [6, 28], [-6, 28], [-12, 22]];   /* 튀어나온 평지 (14번 판 윗면) */
const ARCH = { x: 0, z: 17.2, w: 13, face: 13.7 };   /* face = 입구 둘레 깎은 벽면 · 아치는 앞 절반이 벽 밖으로 나옴 */   /* 보물방 입구 (11번) — 절벽 면에 붙음 · 앞이 남쪽 */
/* 길: 생물이 다닌 자국 — 서쪽 들머리 → 옛 돌판 자리에서 갈라짐 → 남쪽 가장자리 전망(보물방 입구로 내려가는 곳) / 동쪽 들머리 */
const PATHS = [[[-56, -12], [-42, -10], [-30, -3], [-20, 1], [-23, 9]], [[-20, 1], [-6, -6], [10, -8], [24, -4], [38, 2], [55, 3]]];
/* 길이 꺾인 까닭: 꺾인 곳 안쪽에 바위(9번)나 낮은 둔덕(코드)이 있어 길이 돌아감 */
const bendAt = (p, k, r) => { const L = PATHS[p], [ax, az] = L[k - 1], [vx, vz] = L[k], [bx, bz] = L[k + 1], la = Math.hypot(vx - ax, vz - az), lb = Math.hypot(bx - vx, bz - vz);
  let ix = (bx - vx) / lb - (vx - ax) / la, iz = (bz - vz) / lb - (vz - az) / la; const l = Math.hypot(ix, iz) || 1; return [vx + ix / l * (r + 2.4), vz + iz / l * (r + 2.4)]; };
const BOULDERS = [[0, 1, 3], [1, 2, 3.4], [1, 4, 2.8]].map(([p, k, s]) => { const r = 1.56 * s * .42, [x, z] = bendAt(p, k, r); return [x, z, r, s]; });   /* [x, z, 막힘 반지름, 크기] */
const MOUNDS = [[0, 2, 3.4, 6.5], [1, 1, 4, 7], [1, 3, 3.2, 6]].map(([p, k, h, r]) => { const [x, z] = bendAt(p, k, r * .55); return [x, z, h, r]; });   /* 낮은 둔덕 (무릎~허리 · 2층은 막고 3층은 넘음) */
const HILL = [0, 4, 8, 15];   /* 보물방 위 중간 산 (보물방은 입구 아치 바로 뒤 절벽 속 → 산도 그 위 · 3층에선 넘어감) */
/* 북쪽 산줄기: 가장자리 띠 전체가 솟음 (14m 넘음 = 3층도 못 넘음) · 봉우리 넷은 높이를 달리해 같은 높이가 줄지어 서지 않게 */
const PEAKS = [[-21, -41, 8, 9], [23, -40, 7, 9], [-41, -42, 4, 7], [6, -42, 3, 8]];
const STREAMS = [[[24, -27], [28, -22], [36, -20], [46, -17], [52, -15]], [[-31, -26], [-37, -22], [-46, -21], [-51, -20]]];   /* 산에서 녹은 물이 산기슭 샘에서 솟아 동 · 서 절벽으로 */
const PILLARS = [[-42, 25, 5], [37, 27, 5], [64, -28, 4]];   /* 기둥 바위: 평지가 깎여 나가고 남은 조각 — 절벽 선 바로 바깥 */
export const LAYERS = [LEDGE * SC + 1.2, TOP + 1.2, TOP + 9], LNAME = ['1층 · 절벽 중간 튀어나온 평지', '2층 · 평지', '3층 · 하늘'], LCOL = [[.45, 1, .38], [.42, .82, 1], [1, .8, .32]];

const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const nearPoly = (P, x, z) => { let d = 1e9, px = 0, pz = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)), qx = ax + dx * t, qz = az + dz * t, e = Math.hypot(x - qx, z - qz); if (e < d) { d = e; px = qx; pz = qz; } } return [d, px, pz]; };
const distPoly = (P, x, z) => { const d = nearPoly(P, x, z)[0]; return inPoly(P, x, z) ? -d : d; };
const outward = (x, z) => { const e = .5, gx = distPoly(PLATEAU, x + e, z) - distPoly(PLATEAU, x - e, z), gz = distPoly(PLATEAU, x, z + e) - distPoly(PLATEAU, x, z - e), l = Math.hypot(gx, gz) || 1; return [gx / l, gz / l]; };
const segDist = (L, x, z) => { let m = 1e9; for (let k = 1; k < L.length; k++) { const [ax, az] = L[k - 1], [bx, bz] = L[k], dx = bx - ax, dz = bz - az, t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };

/* ── 땅 높이 (코드) ── */
const terr = (h, k, a = .4) => h <= 0 ? h : (Math.floor(h / k) + sm(a, 1 - a, fract(h / k))) * k;   /* 층층이 쌓인 바위 단 (받은 조각처럼 단마다 이끼 낀 턱) */
export function relief(x, z) {   /* 평지보다 솟은 부분 (산 · 둔덕) */
  const p = sm(-26, -42, z + 5 * (noise(x * .07, 4.1) - .5)) ** 1.4;   /* 산기슭이 굽이지게 들어왔다 나감 */
  const rg = (a, b) => 1 - Math.abs(2 * noise(a, b) - 1);   /* 능선 잡음: 날카로운 바위 등줄기 */
  let r = p * (19 + 6 * rg(x * .05 + 3, z * .05) + 7 * rg(x * .12, z * .12 + 7) * rg(x * .07 + 1, z * .07) + 3.5 * rg(x * .26 + 4, z * .26) + 2 * fbm(x * .3, z * .3));   /* 큰 등줄기 · 골짜기 · 잔 바위 결 */   /* 등줄기 11~16m + 봉우리 */
  for (const [px, pz, ph, pr] of PEAKS) { const q = 1 - ((x - px) ** 2 + (z - pz) ** 2) / (pr * pr); if (q > 0) r += ph * q * q * p; }
  let m = 0; for (const [mx, mz, mh, mr] of MOUNDS.concat([HILL])) { const a = Math.atan2(z - mz, x - mx), rr = mr * (.8 + .35 * noise(Math.cos(a) * 1.3 + mx, Math.sin(a) * 1.3 + mz)), dd = Math.hypot(x - mx, z - mz) / rr; if (dd < 1) m = Math.max(m, mh * (.5 + .5 * Math.cos(Math.PI * dd)) * (.9 + .25 * noise(x * .4, z * .4))); }   /* 둥근 언덕: 위는 풀 · 가파른 옆만 바위 */
  return terr(r, 5, .3) + m;   /* 산은 5단위마다 이끼 낀 턱 (부드럽게) */
}
const STREAM = STREAMS.map(cp => { const pts = []; for (let k = 0; k < cp.length - 1; k++) { const p0 = cp[Math.max(0, k - 1)], p1 = cp[k], p2 = cp[k + 1], p3 = cp[Math.min(cp.length - 1, k + 2)];
    for (let i = 0; i < 6; i++) { const t = i / 6, t2 = t * t, t3 = t2 * t; pts.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  let [x, z] = cp[cp.length - 1]; const [px, pz] = cp[cp.length - 2], l = Math.hypot(x - px, z - pz), dx = (x - px) / l, dz = (z - pz) / l;
  while (distPoly(PLATEAU, x, z) < -.5) { pts.push([x, z]); x += dx * .8; z += dz * .8; }
  const end = [x, z]; while (distPoly(PLATEAU, x, z) < 0) { x += dx * .25; z += dz * .25; }
  const [ox, oz] = outward(x, z); return { pts, end, src: cp[0], edge: [x, z], lip: { x: x + ox * 1.4, z: z + oz * 1.4, ox, oz } }; });
const bedAt = (x, z) => sm(2.6, 1.0, Math.min(...STREAM.map(S => Math.min(segDist(S.pts, x, z), Math.hypot(x - S.src[0], z - S.src[1]) - 1.6))));
const rimDrop = d => 1.6 * clamp01((d + 3) / 3) ** 2;   /* 가장자리 3m에서 땅이 살짝 둥글게 내려가 절벽 머리로 이어짐 */
const groundH = (x, z, bed = true) => TOP + .15 * fbm(x * .2, z * .2) - rimDrop(distPoly(PLATEAU, x, z)) + relief(x, z) - (bed ? 1.3 * bedAt(x, z) : 0);
for (const S of STREAM) S.y = groundH(S.end[0], S.end[1], false) - .45;   /* 폭포가 떨어지는 물 높이 */

/* ── 절벽 둘레 (가장자리를 0.9단위마다 따라가며 구간별 생김새) ──
   · 솟은 바위 턱(raise): 절벽 머리가 평지보다 2~2.5m 솟아 바위 담처럼
   · 계단(step): 절벽 면이 위에서 3~5m 내려간 곳에서 바깥으로 한 칸 튀어나와 이끼 턱이 생김
   · 낮은 선반(shelf): 더 아래(6~8m)에서 크게 튀어나옴
   · 폭포 자리 · 산줄기 밑 · 모서리 · 보물방 입구 위는 그대로 (이웃 구간은 같은 생김새 안 됨) */
const BND = (() => { const ring = PLATEAU.concat([PLATEAU[0]]), out = []; let s = 0;
  for (let e = 0; e < ring.length - 1; e++) { const [ax, az] = ring[e], [bx, bz] = ring[e + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / .9));
    for (let k = 0; k < n; k++) { const t = k / n; out.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, s: s + len * t }); } s += len; }
  const N = out.length; for (let i = 0; i < N; i++) { const a = out[(i + N - 2) % N], b = out[(i + 2) % N], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz); let nx = tz / l, nz = -tx / l; if (inPoly(PLATEAU, out[i].x + nx * 2, out[i].z + nz * 2)) { nx = -nx; nz = -nz; } out[i].nx = nx; out[i].nz = nz; }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const TYPES = ['plain', 'raise', 'step', 'shelf'];
  let sec = { end: -1, type: 'plain', a: 0, b: 0 }; const raw = out.map(p => { if (p.s > sec.end) { let ty; do ty = TYPES[Math.floor(rnd() * 4)]; while (ty === sec.type); sec = { end: p.s + 16 + rnd() * 16, type: ty, a: rnd(), b: rnd() }; }
    const lip = Math.min(...STREAM.map(S => Math.hypot(p.x - S.edge[0], p.z - S.edge[1]))), corner = Math.min(...PLATEAU0.map(([cx, cz]) => Math.hypot(p.x - cx, p.z - cz))), ledge = Math.abs(p.x) < 15 && p.z > 10;
    const ty = (lip < 7 || p.z < -36 || corner < 7 || ledge) ? 'plain' : sec.type; p.lip = sm(9, 3, lip); p.ledge = ledge;
    return { raise: ty === 'raise' ? 4 + sec.a * 1.5 : 0, stepD: ty === 'step' ? 6 + sec.a * 4 : ty === 'shelf' ? 12 + sec.a * 4 : 99, stepO: ty === 'step' ? 2.6 + sec.b : ty === 'shelf' ? 4 + sec.b * 1.5 : 0 }; });
  for (let i = 0; i < N; i++) { let r = 0, sd = 0, so = 0, w = 0; for (let k = -5; k <= 5; k++) { const q = raw[(i + k + N) % N], c = 1 - Math.abs(k) / 6; r += q.raise * c; so += q.stepO * c; sd += Math.min(q.stepD, 30) * c; w += c; } out[i].raise = r / w; out[i].stepO = so / w; out[i].stepD = sd / w; }   /* 구간 끝은 부드럽게 이어짐 */
  return out; })();

export function blockedAt(x, z, L) { x /= SC; z /= SC;
  if (x < -95 || x > 95 || z < -85 || z > 95) return true;
  for (const [px, pz, r] of PILLARS) if (Math.hypot(x - px, z - pz) < r) return true;
  const d = distPoly(PLATEAU, x, z);
  if (L === 0) return d < 1.5 && !inPoly(LEDGE_AREA, x, z);   /* 1층: 위 평지 밑은 바위 · 튀어나온 평지와 협곡 하늘만 */
  if (d > 1.5) return false;   /* 협곡 하늘 */
  const r = relief(x, z);
  if (L === 1) { if (r > 2.2) return true; for (const [bx, bz, br] of BOULDERS) if (Math.hypot(x - bx, z - bz) < br) return true;
    if (d > -1.5) { let best = 1e9, rr = 0; for (const p of BND) { const e = (p.x - x) ** 2 + (p.z - z) ** 2; if (e < best) { best = e; rr = p.raise; } } if (rr > 1.5) return true; }   /* 솟은 바위 턱 */
    return false; }
  return r > 16.5;   /* 3층: 북쪽 산줄기만 막음 */
}
/* 기체 그림자를 떨어뜨릴 높이 (게임 m) */
export function floorAt(xm, zm) { const x = xm / SC, z = zm / SC; if (inPoly(PLATEAU, x, z)) return groundH(x, z) * SC; if (inPoly(LEDGE_AREA, x, z)) return (LEDGE + 1) * SC; return WATER * SC; }

export async function buildCliffZone(THREE_, renderer) {
  const Ld = new GLTFLoader(), G = new THREE.Group(), src = {};
  for (const i of [1, 7, 9, 10, 11, 14]) { const g = await Ld.loadAsync(`_mf/rock/opt/R${i}.glb?v=11141600`); let m; g.scene.traverse(o => { if (o.isMesh) m = o; });
    m.material.roughness = .95; m.material.metalness = 0; m.geometry.computeBoundingBox(); src[i] = m; }
  const inst = {}; const put = (i, x, y, z, yaw, s, sy = s) => { (inst[i] ||= []).push([x, y, z, yaw, s, sy]); };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const size = i => { const b = src[i].geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]; };
  let tris = 0, draws = 0;

  /* 조각 그림 뜨기: 위에서(풀 · 모래 · 돌판) · 앞에서(바위 기둥 옆면) — 반복 방식은 만들 때 정해야 먹힘 */
  const shoot = (m, cam) => { const sc = new THREE.Scene(); sc.add(new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ map: m.material.map })));
    const rt = new THREE.WebGLRenderTarget(1024, 1024, { colorSpace: THREE.SRGBColorSpace, wrapS: THREE.MirroredRepeatWrapping, wrapT: THREE.MirroredRepeatWrapping, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(prev); renderer.setClearColor(0x9fd0ef, 1); return rt.texture; };
  const grabTop = (i, frac) => { const b = src[i].geometry.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = Math.min(b.max.x - b.min.x, b.max.z - b.min.z) * frac / 2;
    const cam = new THREE.OrthographicCamera(cx - h, cx + h, -(cz - h), -(cz + h), .01, 10); cam.position.set(0, b.max.y + 2, 0); cam.up.set(0, 0, -1); cam.lookAt(0, -1, 0); cam.updateProjectionMatrix(); return shoot(src[i], cam); };
  const grassTex = grabTop(1, .42), sandTex = grabTop(14, .5), stoneTex = grabTop(7, .45);
  const nzTex = (() => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), id = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let a = 0; for (let k = 0; k < 4; k++) { const f = 2 ** k * 4; a += pnoise(u * f, v * f, f) / 2 ** k; } const p = (y * N + x) * 4, q = Math.min(255, a / 1.875 * 255); id.data[p] = id.data[p + 1] = id.data[p + 2] = id.data[p + 3] = q; }
    g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t; })();

  /* 땅 · 절벽 칠: 평평한 곳은 풀(길 · 모래 · 돌판 섞임) · 기운 곳은 바위 (세 방향에서 비춰 늘어짐 없음) · 단 위 턱엔 이끼 */
  const terrainMat = (side, mossAt, flat) => { const m = new THREE.MeshStandardMaterial({ map: grassTex, vertexColors: true, roughness: 1, metalness: 0, flatShading: flat, side });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, { tStone: { value: stoneTex }, tSand: { value: sandTex }, tNz: { value: nzTex } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aMix; attribute vec3 aTone; attribute float aMoss; varying vec2 vMix; varying vec3 vP; varying vec3 vTone; varying vec3 vN; varying float vMoss;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMix = aMix; vP = position; vTone = aTone; vN = normal; vMoss = aMoss;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tStone, tSand, tNz; varying vec2 vMix; varying vec3 vP; varying vec3 vTone; varying vec3 vN; varying float vMoss;')
        .replace('#include <color_fragment>', '').replace('#include <map_fragment>', `
          vec3 nn = ${flat ? 'normalize(cross(dFdx(vP), dFdy(vP)))' : 'normalize(vN)'}; float up = abs(nn.y);
          vec3 w = pow(abs(nn), vec3(4.)); w /= (w.x + w.y + w.z);
          vec2 gu = vP.xz / 9., gr = mat2(.77, -.64, .64, .77) * gu * .41 + .37;
          vec3 grass = mix(texture2D(map, gu).rgb, texture2D(map, gr).rgb, .5), sd = texture2D(tSand, mat2(.5, .87, -.87, .5) * gu * .63 + .29).rgb;
          grass = mix(grass, sd, vColor.b * .8);
          vec3 top = mix(grass, texture2D(tStone, gu * 1.28).rgb, vMix.y); top = mix(top, mix(sd, vec3(.46, .35, .22), .6), vMix.x * .85);
          float g1 = texture2D(tNz, vP.zy * .13).r * w.x + texture2D(tNz, vP.xy * .13).r * w.z + texture2D(tNz, vP.xz * .13).r * w.y;
          float g2 = texture2D(tNz, vP.zy * .035 + .3).r * w.x + texture2D(tNz, vP.xy * .035 + .3).r * w.z + texture2D(tNz, vP.xz * .035 + .3).r * w.y;
          float fh = fract(sin(dot(floor(vP * .8), vec3(12.9, 78.2, 37.7))) * 43758.5);
          vec3 rock = vTone * (.78 + .34 * g1 + .22 * (g2 - .5)) * ${flat ? '(.9 + .2 * fh)' : '1.'};   /* 바위: 덩어리마다 다른 회색 + 잔결 · 큰 얼룩 · 깎인 면마다 조금씩 다른 밝기 */
          float moss = max(smoothstep(${mossAt.toFixed(2)}, ${(mossAt + .16).toFixed(2)}, up + (g2 - .5) * .25), smoothstep(.15, .55, vMoss - g1 * .5));   /* 절벽 머리는 이끼가 덮고 아래로 흘러내림 */   /* 위를 보는 면은 이끼 · 풀 */
          diffuseColor.rgb = mix(rock, top * vColor.r, moss);`); };
    return m; };

  /* 위 평지 땅 + 산 + 둔덕: 격자 · 가장자리 밖으로 나간 점은 가장자리 위로 끌어와 땅 끝이 가장자리와 딱 맞음 */
  { const X0 = -66, Z0 = -52, NX = 132, NZ = 72, pos = [], col = [], mix = [], tone = [], idx = [], inside = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { let x = X0 + i, z = Z0 + j; const d = distPoly(PLATEAU, x, z); inside.push(d < .8);
      if (d > 0) { const [, px, pz] = nearPoly(PLATEAU, x, z); x = px; z = pz; }
      const bed = bedAt(x, z); pos.push(x, groundH(x, z), z);
      const pd = Math.min(...PATHS.map(L => segDist(L, x, z))), dd = distPoly(PLATEAU, x, z);
      const path = clamp01((2.6 + 1.2 * (noise(x * .5, z * .5) - .5) - pd) / 1.4) * (1 - bed), rocky = Math.max(clamp01((dd + 1.6) / 1.6) * (.4 + .6 * noise(x * .15, z * .15)) * .45, bed * .95);
      const sdist = Math.min(...STREAM.map(S => segDist(S.pts, x, z))), k = (.78 + .2 * fbm(x * .05, z * .05)) * (1 - .25 * sm(5.5, 2, sdist));
      col.push(k, k, clamp01((fbm(x * .035 + 11, z * .035) - .45) * 4)); mix.push(path, rocky);
      const rv = relief(x, z), lap = 4 * rv - relief(x + 1.2, z) - relief(x - 1.2, z) - relief(x, z + 1.2) - relief(x, z - 1.2);   /* 볼록한 등줄기는 밝게 · 오목한 골은 어둡게 */
      const tn = (.21 + .06 * noise(x * .09 + 40, z * .09)) * Math.max(.5, Math.min(1.25, .9 + lap * .2)), wm = noise(x * .05, z * .05 + 20) - .5; tone.push(tn * (.98 + wm * .1), tn * .97, tn * (1.06 - wm * .1)); }
    const W = NX + 1; for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; if (!(inside[a] || inside[b] || inside[c] || inside[d])) continue; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('aMix', new THREE.Float32BufferAttribute(mix, 2)); geo.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 3)); geo.setAttribute('aMoss', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3), 1)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, terrainMat(THREE.FrontSide, .52, false));   /* 땅: 57°보다 완만하면 풀 (둔덕은 풀 언덕 · 산은 가파른 곳만 바위) */ m.castShadow = m.receiveShadow = true; m.name = 'plateau'; G.add(m); tris += idx.length / 3; draws++; }

  /* 절벽 벽: 가장자리 한 바퀴를 세로 띠로 — 받은 조각처럼 바위 덩어리를 쌓은 모양
     · 둘레를 폭 3.5~7.5m 바위 기둥으로 나누고, 기둥마다 높이 3~8.5m 덩어리를 쌓음 — 덩어리마다 튀어나온 정도 · 회색이 다름
     · 기둥 사이 · 덩어리 사이는 안으로 깎여 어두운 틈 · 튀어나온 덩어리 윗면엔 이끼
     · 머리는 둥글게 바깥으로 말려 평지 풀과 이어짐 · 밑동은 물속에서 넓어짐 · 계단 · 선반 구간은 한 칸 크게 튀어나옴
     · 보물방 입구 밑(튀어나온 평지 아래)은 바위가 크게 튀어나와 판을 받침 · 폭포 자리는 물에 닳아 매끈 */
  { const N = BND.length, crown = [[0, -2.6], [.12, -.8], [.45, .2], [1.1, 1.05], [2, 1.6], [3, 1.95]], R = 74, pos = [], col = [], mix = [], tone = [], mossA = [], idx = [];
    let sd = 31; const r2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const SL = BND[N - 1].s + Math.hypot(BND[0].x - BND[N - 1].x, BND[0].z - BND[N - 1].z), cols = [];
    for (let s0 = 0; s0 < SL;) { const w = Math.min(3 + r2() * 7, SL - s0), blocks = []; for (let d = (r2() - .5) * 6; d < 110;) { const h = 4.5 + r2() * 10; blocks.push({ d0: d, d1: d + h, off: r2() * 1.8 - .6, lean: (r2() - .5) * .16, tone: .2 + r2() * .1, warm: r2() - .5 }); d += h; } cols.push({ s0, s1: s0 + w, off: r2() * 3.4, blocks }); s0 += w; }   /* 기둥 폭 · 덩어리 높이 · 기울기를 크게 섞어 벽돌처럼 줄지어 보이지 않게 */
    const rows = crown.length + R; let ci = 0;
    for (let i = 0; i < N; i++) { const p = BND[i], Ht = groundH(p.x, p.z) + p.raise, body = Ht - 3 - (WATER - 5);
      while (ci < cols.length - 1 && p.s >= cols[ci].s1) ci++; const c = cols[ci], e = Math.min(p.s - c.s0, c.s1 - p.s), st = 1 - .65 * p.lip;
      for (let r = 0; r < rows; r++) { let y, off, tn = .26, wm = 0, ao = 1;
        if (r === 0) { y = Ht - p.raise - .6; off = -2.6; }
        else if (r < crown.length) { const [dy, o] = crown[r]; y = Ht + .1 - dy; off = o; }
        else { const dep = 3 + (r - crown.length + 1) / R * body; y = Ht - dep;
          let bi = 0; while (bi < c.blocks.length - 1 && dep >= c.blocks[bi].d1) bi++; const b = c.blocks[bi], bd = Math.min(dep - b.d0, b.d1 - dep);
          const gap = (1 - sm(0, 1.5, e)) * 1.1 + (1 - sm(0, 1.1, bd)) * .6;   /* 기둥 사이 · 덩어리 사이 깎인 틈 */
          off = 1.95 + st * (c.off + b.off + b.lean * (dep - b.d0) - gap + .8 * (fbm(p.s * 1.1, y * 1.1) - .5)) + p.stepO * sm(p.stepD, p.stepD + .9, dep) + Math.max(0, dep - 22) * .07;
          if (p.ledge) { const k = sm(10, 7, Math.abs(p.x)) * sm(LEDGE - 2, LEDGE - .5, y) * sm(LEDGE + 13, LEDGE + 10, y); off = off * (1 - k) + (.6 + .25 * (fbm(p.s, y) - .5)) * k;   /* 보물방 입구 둘레: 옛사람이 깎아 낸 판판한 면 (아치가 벽에 묻히지 않게) */
            off += Math.max(0, 11.5 * (1 - (p.x / 12.5) ** 2)) * sm(LEDGE - 1.2, LEDGE - 3.2, y); }
          tn = b.tone; wm = b.warm; ao = (1 - .38 * gap / 1.7) * (1 - .28 * sm(6, 45, dep)) * (y < WATER + 2.5 ? .75 : 1); }
        pos.push(p.x + p.nx * off, y, p.z + p.nz * off);
        col.push(.95, .95, 0); mix.push(0, r < crown.length ? .08 : .3); mossA.push(r < crown.length ? [1, 1, 1, .95, .8, .6][r] : Math.max(0, .6 - (Ht - 3 - y) * .12) * (.4 + .8 * noise(p.s * .45, 2.7))); const t = tn * ao; tone.push(t * (.98 + wm * .1), t * .97, t * (1.06 - wm * .1));   /* 받은 조각처럼 살짝 푸른 회색 */ } }
    for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; for (let r = 0; r < rows - 1; r++) { const a = i * rows + r, b = i2 * rows + r; idx.push(a, b, a + 1, b, b + 1, a + 1); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('aMix', new THREE.Float32BufferAttribute(mix, 2)); geo.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 3)); geo.setAttribute('aMoss', new THREE.Float32BufferAttribute(mossA, 1)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, terrainMat(THREE.DoubleSide, .68, true)); m.castShadow = m.receiveShadow = true; m.name = 'cliffWall'; G.add(m); tris += idx.length / 3; draws++; }

  /* 받은 조각 (약 10개): 튀어나온 평지 · 보물방 입구 · 기둥 바위 · 길 꺾인 곳 바위 · 갈림길 옛 돌판 */
  { const s = 5.6, [, , d] = size(14); put(14, 0, LEDGE - s * .82, 13 + d * s * .42, 0, s * 1.05, s); }
  { const s = ARCH.w / size(11)[0]; put(11, ARCH.x, LEDGE - .2, ARCH.z - size(11)[2] * s * .35, 0, s); }   /* 아치 뒤쪽은 절벽 속 · 앞만 드러남 */
  for (const [x, z, r] of PILLARS) { const s = 24 + r * 2; put(10, x, TOP - 7 - s + r, z, rnd() * 6, s * .9, s); }   /* 밑동은 물속 */
  for (const [x, z, , s] of BOULDERS) put(9, x, groundH(x, z) - .4, z, rnd() * 6, s);
  { const [fx, fz] = PATHS[0][3]; put(7, fx, groundH(fx, fz) + .8 - 3.4, fz, .4, 3.4); }   /* 반쯤 묻혀 윗면만 0.8m — 막지 않음 */
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (const [i, list] of Object.entries(inst)) { const m = src[i], im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.name = 'rock' + i;
      list.forEach(([x, y, z, yaw, s, sy], k) => { e.set(0, yaw, 0); q.setFromEuler(e); m4.compose(p.set(x, y, z), q, sc.set(s, sy, s)); im.setMatrixAt(k, m4); });
      im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); G.add(im); tris += m.geometry.index.count / 3 * list.length; draws++; } }

  /* 보물방 입구 속: 아치 안쪽이 깊은 어둠 (들어가면 보물 맵으로 바뀌니 속은 안 만듦) */
  { const [aw, ah, ad] = size(11).map(v => v * ARCH.w / size(11)[0]), w = aw * .36, h = ah * .5, sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({ color: 0x070b0d })); m.position.set(ARCH.x, LEDGE - .4, ARCH.face + .08);   /* 깎은 벽면 바로 앞 (아치 틀 안쪽) */ G.add(m); draws++; }

  /* ── 물: 협곡 물 · 개울 · 폭포 · 물보라 (빛 계산 없이 색만 · 물결 무늬 하나를 같이 씀) ── */
  const U = { t: { value: 0 }, nz: { value: nzTex }, px: { value: 600 } };
  const shade = (vs, fs, o = {}) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, ...o });
  const OUT = `\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n`;
  const falls = STREAM.map(S => ({ ...S.lip, y: S.y }));
  { const geo = new THREE.PlaneGeometry(320, 300, 110, 104); geo.rotateX(-Math.PI / 2); geo.translate(0, WATER, -8); const P = geo.attributes.position, dd = [];
    for (let v = 0; v < P.count; v++) { const x = P.getX(v), z = P.getZ(v); let d = Math.min(distPoly(PLATEAU, x, z) - 6, distPoly(LEDGE_AREA, x, z) - 2);
      for (const [px, pz, r] of PILLARS) d = Math.min(d, Math.hypot(x - px, z - pz) - (24 + r * 2) * .9 * .3);
      for (const f of falls) d = Math.min(d, Math.hypot(x - f.x - f.ox * 7, z - f.z - f.oz * 7) - 5); dd.push(d); }
    geo.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    const m = new THREE.Mesh(geo, shade(`attribute float aD; varying float vD; varying vec2 vW; void main(){ vD = aD; vW = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      `uniform float t; uniform sampler2D nz; varying float vD; varying vec2 vW;
       void main(){ vec2 p = vW * .018; float n1 = texture2D(nz, p + vec2(t * .010, t * .006)).r, n2 = texture2D(nz, p * 1.9 - vec2(t * .007, -t * .011)).r, n = (n1 + n2) * .5;
         float near = smoothstep(26., 0., vD), edge = smoothstep(7., 0., vD);
         vec3 c = mix(vec3(.020, .17, .26), vec3(.05, .42, .50), near * .85 + (n - .5) * .35);
         float n3 = texture2D(nz, vW * .07 + vec2(-t * .02, t * .015)).r;
         float foam = smoothstep(.60, .74, n3 + edge * .4 - .25) * smoothstep(3.5, -1.5, vD);   /* 밑동에 닿아 부서지는 거품 */
         float glint = smoothstep(.80, .90, n2) * .18 * (1. - near * .5);
         gl_FragColor = vec4(mix(c, vec3(.82, .93, .96), clamp(foam, 0., 1.) * .7) + glint, 1.); ${OUT} }`));
    m.name = 'canyonWater'; G.add(m); tris += 110 * 104 * 2; draws++; }
  { const pos = [], uv = [], idx = []; let base = 0;   /* 개울: 샘 웅덩이에서 골을 따라 · 끝은 절벽 머리를 넘어 폭포로 */
    for (const S of STREAM) { const L = S.pts.concat([S.end, [S.lip.x - S.lip.ox * .2, S.lip.z - S.lip.oz * .2]]); let acc = 0;
      for (let k = 0; k < L.length; k++) { const [x, z] = L[k], [ax, az] = L[Math.max(0, k - 1)], [bx, bz] = L[Math.min(L.length - 1, k + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
        if (k) acc += Math.hypot(x - L[k - 1][0], z - L[k - 1][1]);
        const y = k < L.length - 2 ? groundH(x, z, false) - .45 : S.y, w = 2 + .3 * Math.sin(acc * .4) + (k < 3 ? .6 : 0);
        pos.push(x + nx * w, y, z + nz * w, x - nx * w, y, z - nz * w); uv.push(acc, 0, acc, 1); if (k) { const a = base + (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      base += L.length * 2;
      const [sx, sz] = S.src, y0 = groundH(sx, sz, false) - .5, c0 = base; pos.push(sx, y0, sz); uv.push(0, .5);   /* 샘 웅덩이 */
      for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2, r = 2.3 + .4 * Math.sin(a * 3); pos.push(sx + Math.cos(a) * r, y0, sz + Math.sin(a) * r); uv.push(Math.cos(a) * .6, .5 + Math.sin(a) * .5); if (i) idx.push(c0, c0 + i + 1, c0 + i); }
      base += 22; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, shade(`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      `uniform float t; uniform sampler2D nz; varying vec2 vUv;
       void main(){ float n = texture2D(nz, vec2(vUv.x * .09 - t * .16, vUv.y * .35)).r, m = texture2D(nz, vec2(vUv.x * .05 - t * .09 + .5, vUv.y * .2 + .3)).r;
         float bank = smoothstep(.0, .22, vUv.y) * smoothstep(1., .78, vUv.y);
         vec3 c = mix(vec3(.025, .22, .30), vec3(.06, .40, .46), m); c = mix(c, vec3(.80, .93, .96), smoothstep(.68, .84, n) * .75 + (1. - bank) * .25);
         gl_FragColor = vec4(c, 1.); ${OUT} }`, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.name = 'streams'; G.add(m); tris += idx.length / 3; draws++; }
  { const pos = [], uv = [], idx = []; let base = 0; const N = 34;   /* 폭포: 절벽 머리에서 바깥으로 휘어 나간 뒤 거의 곧게 떨어짐 (벽에서 떨어져 벽을 뚫지 않음) */
    for (const f of falls) { const H = f.y - WATER, tx = -f.oz, tz = f.ox;
      for (let j = 0; j <= N; j++) { const dy = H * (j / N) ** 1.25, off = 4.6 * Math.sqrt(Math.min(1, dy / 7)) + dy * .08, w = 1.9 + dy * .07, cx = f.x + f.ox * off, cz = f.z + f.oz * off, y = f.y - dy;
        for (let i = 0; i <= 4; i++) { const u = i / 4, bow = Math.sin(u * Math.PI) * .7; pos.push(cx + tx * (u - .5) * 2 * w + f.ox * bow, y, cz + tz * (u - .5) * 2 * w + f.oz * bow); uv.push(u, dy / 5); }
        if (j) for (let i = 0; i < 4; i++) { const a = base + (j - 1) * 5 + i; idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); } }
      base += (N + 1) * 5; f.base = [f.x + f.ox * (4.6 + H * .08), f.z + f.oz * (4.6 + H * .08)]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, shade(`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      `uniform float t; uniform sampler2D nz; varying vec2 vUv;
       void main(){ float s = texture2D(nz, vec2(vUv.x * .9, vUv.y * .10 - t * .55)).r, s2 = texture2D(nz, vec2(vUv.x * 1.7 + .3, vUv.y * .18 - t * .9)).r;
         float side = smoothstep(0., .2, vUv.x) * smoothstep(1., .8, vUv.x), lip = smoothstep(0., .12, vUv.y);
         float a = side * (.55 + .45 * smoothstep(.35, .7, s)) * (.75 + .25 * lip);
         vec3 c = mix(vec3(.55, .80, .86), vec3(.97, 1., 1.), smoothstep(.45, .75, s2) * .9 + (1. - lip) * .3);
         gl_FragColor = vec4(c, a); ${OUT} }`, { side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    m.name = 'falls'; m.renderOrder = 3; G.add(m); tris += idx.length / 3; draws++; }
  { const pos = [], ph = [];   /* 폭포 밑 물보라 */
    for (const f of falls) for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 1 + (k % 4) * 1.1; pos.push(f.base[0] + Math.cos(a) * r, WATER + .5, f.base[1] + Math.sin(a) * r); ph.push(k / 14); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aP', new THREE.Float32BufferAttribute(ph, 1));
    const m = new THREE.Points(geo, shade(`uniform float t, px; attribute float aP; varying float vA;
       void main(){ float k = fract(t * .35 + aP); vec3 p = position + vec3(0., k * 4.5, 0.); vA = sin(k * 3.1416) * .55; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = (3.5 + k * 6.) * px / -mv.z; gl_Position = projectionMatrix * mv; }`,
      `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.95, .99, 1.), vA * smoothstep(.5, .15, d)); ${OUT} }`, { transparent: true, depthWrite: false }));
    m.name = 'spray'; m.renderOrder = 4; m.frustumCulled = false; G.add(m); draws++; }

  G.scale.setScalar(SC);
  return { group: G, stats: { tris: Math.round(tris), draws, pieces: Object.fromEntries(Object.entries(inst).map(([k, v]) => [k, v.length])) },
    update: (t, dt) => { U.t.value = t; }, setPx: px => { U.px.value = px * SC; } };
}

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0x9fd0ef, 1); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(5, 1, 20, 3000);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .25; pm.dispose(); }
  /* 맑은 판타지 낮: 하늘빛 위 · 땅빛 아래 · 해는 남동쪽 위 (카메라 쪽 절벽 면이 빛을 받게) */
  scene.add(new THREE.HemisphereLight(0xe4f2ff, 0x4a5a34, .75));
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.9); sun.position.set(62, 84, 42); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .4; scene.add(sun, sun.target);
  onProgress(.2);
  const Z = await buildCliffZone(THREE, renderer); scene.add(Z.group); window.__ZONE = Z; console.log('[절벽 시험 구역]', JSON.stringify(Z.stats)); onProgress(.6);

  /* 기체 (게임과 같은 고르기) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  const LV = { cur: 1, to: 1, f: 1, dur: .45, dir: 0, y: LAYERS[1], y0: LAYERS[1], flash: 0 };
  const B = { blocked: (x, z) => blockedAt(x, z, LV.cur) || (LV.to !== LV.cur && blockedAt(x, z, LV.to)), region: () => 0 };
  const START = [-10, 2], fly = await makeFlight(renderer, B, START, 0, FG); scene.add(fly); const FS = fly.userData.S; fly.userData.respawn(START[0], START[1], 0); window.__FS = FS; window.__LV = LV; window.__LAYERS = LAYERS;
  fly.traverse(o => { if (o.isMesh) o.castShadow = true; });
  /* 바로 밑 그림자: 높이 날수록 커지고 흐려짐 (해 그림자는 높을수록 기체에서 멀리 떨어짐) — 높이 차이가 눈에 보이게 */
  const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x0b1a10, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); blob.rotation.x = -Math.PI / 2; blob.renderOrder = 5; scene.add(blob);
  onProgress(.85);

  /* 높이 바꾸기: 오른쪽 위 세로 칸 (게임과 같은 자리 · 같은 막대 셋) · E 위 · Q 아래 */
  const zone = document.createElement('div'); zone.style.cssText = 'position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 76px);width:min(120px,20vw);height:42%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;pointer-events:none;filter:drop-shadow(0 0 3px rgba(0,0,0,.45))';
  const arrow = up => `<svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true"><path d="${up ? 'M1.5 6.5 7 1.5 12.5 6.5' : 'M1.5 1.5 7 6.5 12.5 1.5'}" fill="none" stroke="rgba(214,222,232,.62)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  zone.innerHTML = arrow(true) + '<span id="pips" style="display:flex;flex-direction:column-reverse;gap:6px"><i></i><i></i><i></i></span>' + arrow(false); $('#ui').append(zone);
  const pips = [...zone.querySelectorAll('#pips i')]; pips.forEach(p => p.style.cssText = 'display:block;width:28px;height:7px;border-radius:4px;background:rgba(255,255,255,.18)');
  const drawPips = () => pips.forEach((p, k) => { const c = LCOL[k].map(v => v * 255 | 0); p.style.background = k === LV.to ? `rgb(${c})` : LV.flash > 0 ? 'rgba(255,80,80,.55)' : 'rgba(255,255,255,.18)'; p.style.boxShadow = k === LV.to ? `0 0 8px rgb(${c})` : 'none'; }); drawPips();
  const say = $('#where'); const tell = () => { if (say) say.textContent = LNAME[LV.to]; }; tell();
  const bodyFree = (x, z, L) => { if (blockedAt(x, z, L)) return false; for (let k = 0; k < 8; k++) if (blockedAt(x + Math.cos(k * .785) * FLY.R * .55, z + Math.sin(k * .785) * FLY.R * .55, L)) return false; return true; };
  const tryLayer = d => { if (LV.cur !== LV.to) return; const to = LV.cur + d; if (to < 0 || to > 2 || !bodyFree(FS.x, FS.z, to)) { LV.flash = .5; drawPips(); return; }   /* 평지 위에서 아래로 = 바위 속 → 안 됨 (빨갛게 깜빡) */
    LV.to = to; LV.f = 0; LV.y0 = LV.y; LV.dir = d; drawPips(); tell(); };
  { const inZone = (x, y) => { const r = zone.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; }; let sw = null;
    addEventListener('pointerdown', e => { if (inZone(e.clientX, e.clientY)) sw = { id: e.pointerId, y: e.clientY, done: false }; });
    addEventListener('pointermove', e => { if (!sw || e.pointerId !== sw.id || sw.done) return; const dy = e.clientY - sw.y; if (Math.abs(dy) > 26) { sw.done = true; tryLayer(dy < 0 ? 1 : -1); } });
    addEventListener('pointerup', e => { if (sw && e.pointerId === sw.id) sw = null; });
    addEventListener('keydown', e => { if (e.key === 'e' || e.key === 'E') tryLayer(1); if (e.key === 'q' || e.key === 'Q') tryLayer(-1); }); }

  /* 카메라: 게임과 같음 (56° · 세로 22m) · 층을 바꿔도 거의 안 물러남 (물러나면 높이 차이가 화면에서 사라짐) */
  const cfg = { ang: 56, dist: 22 }, CAMK = .5 / Math.tan(2.5 * Math.PI / 180); let camD = cfg.dist * CAMK; const cam = { x: START[0], z: START[1] };
  function size() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); const px = r.height * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360)); fly.userData.setPx?.(px); Z.setPx(px); }
  addEventListener('resize', size); size();
  const info = $('#info');
  renderer.compile(scene, camera); onProgress(1);
  let t = 0, last = performance.now(), acc = { n: 0, ms: 0, tt: 0 };
  renderer.setAnimationLoop(now => { const c0 = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (LV.f < 1) { LV.f = Math.min(1, LV.f + dt / LV.dur); const k = LV.f * LV.f * (3 - 2 * LV.f); LV.y = LV.y0 + (LAYERS[LV.to] - LV.y0) * k; if (LV.f >= 1) LV.cur = LV.to; }
    if (LV.flash > 0) { LV.flash -= dt; if (LV.flash <= 0) drawPips(); }
    fly.position.y = LV.y - FLY.HOVER; fly.updateMatrixWorld(true); fly.userData.update(t, dt);
    { const S = fly.children[0], e = LV.f < 1 ? Math.sin(LV.f * Math.PI) : 0; S.rotateX(LV.dir * .52 * e); S.updateMatrixWorld(true); }
    FG.step(dt, t, { moving: Math.hypot(FS.vx, FS.vz) > 1.5, fire: false }); Z.update(t, dt);
    const sp = fly.children[0].position; { const k = Math.min(1, dt * 4); cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; }
    { const fy = floorAt(FS.x, FS.z), hd = Math.max(0, LV.y - fy), s = .9 + hd * .09; blob.position.set(FS.x, fy + .06, FS.z); blob.scale.setScalar(s); blob.material.opacity = .32 * clamp01(1 - hd / 13); blob.visible = hd < 13; }
    { const f = [1, 1, 1.06][LV.to]; camD += (cfg.dist * CAMK * f - camD) * Math.min(1, dt * 3); }
    const a = cfg.ang * Math.PI / 180, vx = cam.x, vz = cam.z - camD / CAMK * .15, cy = LV.y;
    if (window.__shotCam) { const c = window.__shotCam; camera.position.set(...c.p); camera.lookAt(...c.t); } else { camera.position.set(vx, cy + camD * Math.sin(a), vz + camD * Math.cos(a)); camera.lookAt(vx, cy, vz); }
    camera.updateMatrixWorld(); sun.position.set(cam.x + 62, 84, cam.z + 42);   /* 해를 조금 옆으로: 깎인 면이 밝고 어둡게 갈려 모양이 읽힘 */ sun.target.position.set(cam.x, 0, cam.z); sun.target.updateMatrixWorld();
    FG.preRender?.(camera); renderer.render(scene, camera);
    acc.n++; acc.ms += performance.now() - c0; acc.tt += dt; if (acc.tt > .5 && info) { info.textContent = `그리기 ${renderer.info.render.calls}번 · 삼각형 ${renderer.info.render.triangles.toLocaleString()}개 · 계산 ${(acc.ms / acc.n).toFixed(1)}ms`; acc.n = acc.ms = acc.tt = 0; } });
}
