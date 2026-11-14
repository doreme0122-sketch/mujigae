/* 돌산 · 절벽 시험 구역 (사용자 2026-11-14 '작업해')
   · 받은 트라이포 돌산 조각 14개만으로 이어 만듦 (조각마다 삼각형 약 4,500 · 그림 1024 · 같은 조각은 한 번에 그림)
   · 위 평지(돌산 · 둘레 절벽) → 절벽 중간에 튀어나온 평지(14번 · 1층) → 그 위 절벽 쪽 보물방 입구(11번 아치) → 맨 아래 협곡 물길(못 내려감) · 평지 개울이 동 · 서 절벽에서 폭포로 떨어짐
   · 절벽 잇기: 조각끼리 겹치고 파고들게 · 돌리고 크기를 조금씩 바꿔 반복 티 안 나게 · 꼭대기 이끼가 평지 풀과 이어지게 · 틈은 작은 바위(9번)로
   · 조작은 게임과 같음: 왼쪽 아래 조이스틱 · 오른쪽 위 칸 위아래로 쓸어 높이 바꾸기(E · Q) — 높이 셋: 절벽 중간(1층) · 평지 · 평지 위 하늘
   · 카메라 게임과 같음 (56° · 세로 22) · 위 = 12시 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFlight, FLY, padZone } from './flight.js?v=11141600';
import { makeForgeShip, forgeList } from './forgeship.js?v=11141600';

const $ = s => document.querySelector(s);
const fract = x => x - Math.floor(x), hash = (a, b) => fract(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b); return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };
const pnoise = (x, y, P) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b), H = (p, q) => hash(((p % P) + P) % P, ((q % P) + P) % P); return (H(i, j) * (1 - u) + H(i + 1, j) * u) * (1 - v) + (H(i, j + 1) * (1 - u) + H(i + 1, j + 1) * u) * v; };
const fbm = (x, y) => .5 * noise(x, y) + .25 * noise(x * 2.1 + 5, y * 2.1) + .125 * noise(x * 4.3, y * 4.3 + 9);

/* ── 배치 (단위: 게임 m · y 위 · −z = 12시) ── */
const SC = .5, TOP = 0, LEDGE = -10, MIST = -22;   /* 배치는 큰 숫자로 적고 통째로 0.5배 (기체 길이 2m에 맞춘 크기) */
const PLATEAU0 = [[-50, -44], [50, -44], [57, -12], [50, 12], [26, 15], [13, 13], [-13, 13], [-26, 15], [-50, 12], [-57, -12]];
const PLATEAU = (() => { const out = []; for (let i = 0; i < PLATEAU0.length; i++) { const [ax, az] = PLATEAU0[i], [bx, bz] = PLATEAU0[(i + 1) % PLATEAU0.length], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 9)), nx = (bz - az) / L, nz = -(bx - ax) / L;
  for (let k = 0; k < n; k++) { const t = k / n, keep = Math.abs(ax + (bx - ax) * t) < 15 && az + (bz - az) * t > 10, w = keep ? 0 : (Math.sin(i * 7.1 + k * 2.3) * .5 + Math.sin(i * 3.7 + k * 5.9) * .5) * 4.5 * (k ? 1 : 0);   /* 가장자리를 굽이지게 (입구 둘레는 반듯) */
    out.push([ax + (bx - ax) * t + nx * w, az + (bz - az) * t + nz * w]); } } return out; })();   /* 위 평지 가장자리 (남쪽 가운데가 튀어나온 평지 자리) */   /* 위 평지 가장자리 (남쪽 가운데가 튀어나온 평지 자리) */
const LEDGE_AREA = [[-11, 13.5], [11, 13.5], [12, 22], [6, 28], [-6, 28], [-12, 22]];   /* 튀어나온 평지 (14번 판 윗면) */
const ARCH = { x: 0, z: 16.5, w: 13 };   /* z = 절벽 앞면 */   /* 보물방 입구 (11번) — 절벽 면에 붙음 · 앞이 남쪽 */
const WATER = -30;   /* 협곡 바닥 물 높이 (평지에서 15m 아래) — 섬 사이를 흐르는 물길 (사용자 2026-11-14 그림: 협곡엔 물 · 절벽에서 폭포) */

/* 돌산 (사용자 2026-11-14: 높은 산은 가장자리로 빼서 안정감 · 가운데는 낮은 것만)
   · 북쪽(12시) 가장자리 = 높은 산줄기: 섬의 뒷벽 — 플레이어는 6시에서 들어와 12시로 나아가므로 늘 앞에 높은 산이 보임
     봉우리(3) 둘을 양쪽에 두고 가운데는 비탈(6)과 낮은 덩어리(12)로 내려앉은 안장 → 같은 높이가 줄지어 서지 않게
   · ∧자(5)는 산줄기 안쪽 모서리를 메움 — 남쪽으로 열린 품 안에 샘이 솟음 (서쪽 개울의 시작)
   · 보물방 위 산은 남쪽 가장자리(입구 아치 바로 뒤)라 중간 높이 — 보물방을 품고 있다는 표시만 */
/* [조각, x, z, 크기, 돌림, 꼭대기 높이(평지 기준), 막힘 반지름, 높은 산(1) / 중간(0)] */
const RIDGE = [
  [12, -40, -39, 16, .4, 13, 9, 1], [5, -31, -37, 12, 0, 10, 8, 1], [3, -22, -40, 26, .5, 24, 11, 1], [6, -10, -38, 12, Math.PI, 11, 8, 1],
  [12, 2, -41, 12, 2.8, 9, 8, 1], [6, 14, -38, 10, 0, 9, 7, 1], [3, 25, -41, 22, 2.2, 20, 10, 1], [13, 36, -38, 19, .3, 17, 6, 1], [12, 41, -42, 15, 1.2, 12, 8, 1],
  [12, 0, 6, 11, Math.PI / 2, 9, 8, 0], [6, -13, 8, 7, 0, 5.5, 6, 0], [6, 13, 8, 7, Math.PI, 5.5, 6, 0]];
/* 모서리 (사용자 2026-11-14: 꺾인 조각은 절벽 · 돌산 모서리 조립에만) — PLATEAU0 꼭짓점 번호 · V자(4)는 바깥으로 뾰족 · 양 팔이 두 절벽면을 따라감 */
const CORNERS = [[0, 4, 15, 9], [1, 4, 15, 9], [3, 4, 2.5, 8], [8, 4, 2.5, 8], [2, 2, 5, 7], [9, 2, 5, 7]];   /* [꼭짓점, 조각, 꼭대기 높이, 막힘 반지름] · 동서 끝은 계단 바위(2)로 중간 높이 */
/* 길: 생물이 다닌 자국 — 서쪽 들머리 → 옛 돌판 자리에서 갈라짐 → 남쪽 가장자리 전망(보물방 입구로 내려가는 곳) / 동쪽 들머리 */
const PATHS = [[[-56, -12], [-42, -10], [-30, -3], [-20, 1], [-23, 9]], [[-20, 1], [-6, -6], [10, -8], [24, -4], [38, 2], [55, 3]]];
/* 평지 가운데 낮은 돌 (무릎~허리 · 사용자 2026-11-14) — 길이 꺾인 까닭: 꺾인 곳 안쪽에 돌이 있어 길이 돌아감
   [길, 꺾인 점, 조각, 크기] · 7번 돌판은 갈림길에 반쯤 묻힌 옛 돌판 (길이 거기서 갈라짐 · 낮아서 막지 않음) */
const LOW_SPEC = [[0, 1, 9, 3], [0, 2, 1, 4.2], [1, 1, 6, 4], [1, 2, 9, 3.4], [1, 3, 1, 3.6], [1, 4, 9, 2.8]];
const SZ = { 1: [2.16, 1.44], 2: [1.5, 1.16], 6: [1.78, 1.2], 7: [2.16, 2.18], 9: [1.56, 1.5] };   /* 조각 바닥 크기 (높이 1 기준) */
const LOW = LOW_SPEC.map(([p, k, i, s]) => { const L = PATHS[p], [ax, az] = L[k - 1], [vx, vz] = L[k], [bx, bz] = L[k + 1], la = Math.hypot(vx - ax, vz - az), lb = Math.hypot(bx - vx, bz - vz);
  let ix = (bx - vx) / lb - (vx - ax) / la, iz = (bz - vz) / lb - (vz - az) / la; const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;   /* 꺾이는 쪽 = 안쪽 */
  const r = Math.max(...SZ[i]) * s * .42; return [vx + ix * (r + 2.4), vz + iz * (r + 2.4), r, i, s]; });
/* 개울 (사용자 그림: 평지의 물이 절벽 끝에서 폭포로 떨어짐) — 북쪽 산에서 녹은 물이 산기슭 샘에서 솟아 평지를 가로질러 동 · 서 절벽으로 떨어짐 */
const STREAMS = [[[24, -27], [28, -22], [36, -20], [46, -17], [52, -15]], [[-31, -26], [-37, -22], [-46, -21], [-51, -20]]];
const PILLARS = [[-42, 25, 5], [37, 27, 5], [66, 2, 4], [-67, 4, 4], [-22, 31, 3.5], [60, -30, 4]];   /* 기둥 바위: 평지가 깎여 나가고 남은 조각 — 절벽 선 바로 바깥을 따라 섬 */
export const LAYERS = [LEDGE * SC + 1.2, TOP + 1.2, TOP + 4.5], LNAME = ['절벽 중간 · 1층 (튀어나온 평지)', '평지 높이', '평지 위 하늘'], LCOL = [[.45, 1, .38], [.42, .82, 1], [1, .8, .32]];

const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const distPoly = (P, x, z) => { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return inPoly(P, x, z) ? -d : d; };
const outward = (x, z) => { const e = .5, gx = distPoly(PLATEAU, x + e, z) - distPoly(PLATEAU, x - e, z), gz = distPoly(PLATEAU, x, z + e) - distPoly(PLATEAU, x, z - e), l = Math.hypot(gx, gz) || 1; return [gx / l, gz / l]; };
/* 개울을 촘촘히 · 끝은 절벽 끝까지 이어 폭포 자리(입술)를 구함 */
const STREAM = STREAMS.map(cp => { const pts = []; for (let k = 0; k < cp.length - 1; k++) { const p0 = cp[Math.max(0, k - 1)], p1 = cp[k], p2 = cp[k + 1], p3 = cp[Math.min(cp.length - 1, k + 2)];
    for (let i = 0; i < 6; i++) { const t = i / 6, t2 = t * t, t3 = t2 * t; pts.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  let [x, z] = cp[cp.length - 1]; const [px, pz] = cp[cp.length - 2], l = Math.hypot(x - px, z - pz), dx = (x - px) / l, dz = (z - pz) / l;
  while (distPoly(PLATEAU, x, z) < -1.6) { pts.push([x, z]); x += dx * .8; z += dz * .8; }   /* 땅이 끝나는 곳까지 */
  const end = [x, z]; while (distPoly(PLATEAU, x, z) < 0) { x += dx * .25; z += dz * .25; }
  const [ox, oz] = outward(x, z); return { pts, end, src: cp[0], lip: { x: x + ox * 1.2, z: z + oz * 1.2, ox, oz } }; });
const segDist = (L, x, z) => { let m = 1e9; for (let k = 1; k < L.length; k++) { const [ax, az] = L[k - 1], [bx, bz] = L[k], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
const rimDrop = d => 7 * Math.max(0, Math.min(1, (d + 7) / 7)) ** 2.2;   /* 가장자리 7m에서 땅이 둥글게 내려감 */
const LIP_Y = TOP - rimDrop(-1.6) - .5;   /* 폭포가 떨어지는 물 높이 */
export function blockedAt(x, z, L) { x /= SC; z /= SC;
  if (x < -95 || x > 95 || z < -85 || z > 95) return true;
  for (const [px, pz, r] of PILLARS) if (Math.hypot(x - px, z - pz) < r) return true;
  if (L === 0) return distPoly(PLATEAU, x, z) < 1.5 && !inPoly(LEDGE_AREA, x, z);   /* 절벽 중간: 위 평지 밑은 바위 · 튀어나온 평지와 협곡 하늘만 */
  for (const m of RIDGE) if (Math.hypot(x - m[1], z - m[2]) < m[6] * (L === 2 ? (m[7] ? .75 : .35) : 1)) return true;   /* 높은 산은 하늘 높이에서도 막음 · 중간 산은 꼭대기만 */
  for (const [k, , , r] of CORNERS) if (Math.hypot(x - PLATEAU0[k][0], z - PLATEAU0[k][1]) < r * (L === 2 ? .6 : 1)) return true;
  if (L === 1) for (const [lx, lz, r] of LOW) if (Math.hypot(x - lx, z - lz) < r) return true;   /* 낮은 돌: 평지 높이만 막음 (위로 넘어감) */
  return false;
}

/* 조각 크기 (높이 1로 맞춘 모양 → 게임 m) · 역할 */
const PIECE = { 1: 'ledgeCrown', 2: 'stepCliff', 3: 'peak', 4: 'vCorner', 5: 'alcove', 6: 'slope', 7: 'platform', 8: 'overhang', 9: 'boulders', 10: 'pillar', 11: 'arch', 12: 'cliffBlock', 13: 'cliffColumn', 14: 'ledgeSlab', 15: 'wideCliff' };

export async function buildCliffZone(THREE_, renderer) {
  const L = new GLTFLoader(), G = new THREE.Group(), src = {};
  for (let i = 1; i <= 15; i++) { const g = await L.loadAsync(`_mf/rock/opt/R${i}.glb?v=11141600`); let m; g.scene.traverse(o => { if (o.isMesh) m = o; });
    m.material.roughness = .95; m.material.metalness = 0; m.geometry.computeBoundingBox(); src[i] = m; }
  const inst = {}; const put = (i, x, y, z, yaw, s, sy = s) => { (inst[i] ||= []).push([x, y, z, yaw, s, sy]); };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const size = i => { const b = src[i].geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]; };

  /* 위 평지 둘레 절벽: 가장자리를 따라 걷으며 조각을 겹쳐 세움
     A줄(본 벽): 12 · 13 번갈아 · 꼭대기가 평지보다 조금 위 · 앞면이 바깥 · 조각 깊이의 절반쯤 안으로 묻음
     B줄(아래 벽): 13 · 10 · 12 · 꼭대기가 A줄 밑동보다 위 (겹침) · 바깥으로 조금 · 밑은 안개 속
     C줄(꼭대기 돌): 1 · 2 · 9 작은 것 · 평지 가장자리 위에 얹어 꼭대기 선을 들쭉날쭉하게 · 이음새 가림 */
  /* 절벽 높이 섞기 (사용자 2026-11-14: 높은 절벽을 복사해 붙인 것 같음) — 둘레를 18~34m 구간으로 나누고 구간마다 생김새를 바꿈 (이웃 구간은 같은 생김새 안 됨)
     · 솟은 바위 턱(tall): 본 벽 꼭대기가 평지보다 3.5~6m 솟음 — 가장자리가 바위 담처럼
     · 평평(plain): 꼭대기 이끼가 평지 높이 — 풀밭이 그대로 낭떠러지로 이어짐
     · 계단(step): 본 벽 앞에 계단 바위(2)가 4m 아래로 한 칸 내려앉음
     · 낮은 턱(shelf): 낮고 넓은 바위(1)가 6m 아래에 선반처럼 튀어나옴
     · 폭포 자리(notch): 개울이 떨어지는 곳은 벽 꼭대기를 물 높이까지 깎아 내림 (물이 넘쳐 흐르는 까닭)
     · 북쪽 산줄기 밑 · 모서리 · 보물방 입구 위는 평평 (산 · 모서리 조각 · 아치가 모양을 맡음) */
  const ring = PLATEAU.concat([PLATEAU[0]]), TYPES = ['tall', 'plain', 'step', 'shelf'];
  let cum = 0, sec = { end: -1, type: 'plain' }, prevA = 0, prevB = 0;
  const pick = (pool, prev) => { const p = pool.filter(i => i !== prev); return p[Math.floor(rnd() * p.length)]; };
  for (let e = 0; e < ring.length - 1; e++) { const [ax, az] = ring[e], [bx, bz] = ring[e + 1], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, nx = tz, nz = -tx;   /* 바깥 방향 (시계 반대로 돈 다각형 → 오른쪽이 바깥) */
    const out = inPoly(PLATEAU, (ax + bx) / 2 + nx * 2, (az + bz) / 2 + nz * 2) ? -1 : 1, ox = nx * out, oz = nz * out, yawOut = Math.atan2(ox, oz);
    for (let s = rnd() * 3; s < len; s += 8.5 + rnd() * 2.5) {   /* 큰 덩어리를 성기게 (반복되는 거품 느낌 없게 · 가볍게) */ const x = ax + tx * s, z = az + tz * s, arc = cum + s;
      if (arc > sec.end) { let t; do t = TYPES[Math.floor(rnd() * TYPES.length)]; while (t === sec.type); sec = { end: arc + 18 + rnd() * 16, type: t }; }
      const lipD = Math.min(...STREAM.map(S => Math.hypot(x - S.lip.x, z - S.lip.z))), cornD = Math.min(...CORNERS.map(([k]) => Math.hypot(x - PLATEAU0[k][0], z - PLATEAU0[k][1])));
      const type = lipD < 8 ? 'notch' : (z < -34 || cornD < 9 || (Math.abs(x) < 15 && z > 10)) ? 'plain' : sec.type;
      const topA = type === 'notch' ? LIP_Y - .35 : type === 'shelf' ? TOP - 1.2 : TOP - .1;
      /* A줄(본 벽): 앞면이 가장자리 1m 바깥 · 조각이 안쪽으로 깊으니(약 24m) 꼭대기는 늘 땅 밑 — 솟은 턱은 따로 얹음 */
      const ia = pick([15, 15, 12, 13], prevA), sa = ia === 15 ? 14 + rnd() * 5 : ia === 13 ? 16 + rnd() * 5 : 14 + rnd() * 4, da = size(ia)[2] * sa, ha = sa; prevA = ia;
      put(ia, x - ox * (da / 2 - 1), topA - ha, z - oz * (da / 2 - 1), yawOut + (rnd() - .5) * .9, sa);
      /* B줄(아래 벽): 꼭대기가 A줄 밑동보다 2.5m 위로 겹침 → 끊김 없이 한 벽 · 밑동은 물속까지 (모자라면 세로로 늘림) */
      const ib = pick([15, 13, 12], prevB), sb = ib === 15 ? 17 + rnd() * 5 : ib === 13 ? 21 + rnd() * 5 : 17 + rnd() * 4, db = size(ib)[2] * sb, topB = topA - ha + 2.5, hb = Math.max(sb, topB - (WATER - 3)); prevB = ib;
      put(ib, x + tx * 4 - ox * (db / 2 + .5), topB - hb, z + tz * 2.6 - oz * (db / 2 - 1.6), yawOut + (rnd() - .5) * .9, sb, hb);
      if (type === 'tall') { const ic = rnd() < .55 ? 13 : 12, sc2 = ic === 13 ? 12 + rnd() * 4 : 9 + rnd() * 3, dc = size(ic)[2] * sc2; put(ic, x - ox * (dc / 2 - 1.5), TOP + 3.5 + rnd() * 2.5 - sc2, z - oz * (dc / 2 - 1.5), yawOut + (rnd() - .5) * 1.2, sc2); }   /* 솟은 바위 턱: 가장자리에만 좁게 */
      if (type === 'step') { const s2 = 9 + rnd() * 3; put(2, x + ox * 2.2, TOP - 4 - rnd() * 1.5 - s2, z + oz * 2.2, yawOut + Math.PI * .75 + (rnd() - .5) * .5, s2); }   /* 계단 바위: 높은 쪽이 벽에 붙고 바깥으로 내려감 */
      if (type === 'shelf') { const s1 = 5.5 + rnd() * 2; put(1, x + ox * 3, TOP - 6 - rnd() * 1.5 - s1 * .8, z + oz * 3, yawOut + (rnd() - .5) * .6, s1); }   /* 낮은 선반 바위 */
    } cum += len; }

  /* 모서리: V자(4)는 뾰족한 끝이 바깥 · 두 팔이 양쪽 절벽면을 따라감 / 동서 끝은 계단 바위(2) */
  for (const [k, i, top] of CORNERS) { const n = PLATEAU0.length, [cx, cz] = PLATEAU0[k], [px, pz] = PLATEAU0[(k + n - 1) % n], [qx, qz] = PLATEAU0[(k + 1) % n];
    let bx = (cx - px) / Math.hypot(cx - px, cz - pz) - (qx - cx) / Math.hypot(qx - cx, qz - cz), bz = (cz - pz) / Math.hypot(cx - px, cz - pz) - (qz - cz) / Math.hypot(qx - cx, qz - cz); const l = Math.hypot(bx, bz); bx /= l; bz /= l;   /* 바깥 이등분 방향 */
    if (inPoly(PLATEAU0, cx + bx * 3, cz + bz * 3)) { bx = -bx; bz = -bz; }
    if (i === 4) { const s = 15; put(4, cx - bx * (s * .7 - 2.5), TOP + top - s, cz - bz * (s * .7 - 2.5), Math.atan2(bx, bz), s); }
    else { const s = 13; put(2, cx - bx * 3, TOP + top - s, cz - bz * 3, Math.atan2(-bz, bx) + (rnd() - .5) * .3, s); } }

  /* 튀어나온 평지 (14번 판) · 그 밑을 받치는 바위 · 보물방 입구 (11번) */
  { const s = 5.6, [w, h, d] = size(14); put(14, 0, LEDGE - s * .82, 13 + d * s * .42, 0, s * 1.05, s); }   /* 튀어나온 평지: 입구 앞 마당 (내려와 들어가는 자리) */
  put(13, -9, LEDGE - 4 - 18, 17, .3, 18); put(12, 8, LEDGE - 3 - 21, 18, -.4, 15, 21); put(10, 0, LEDGE - 6 - 20, 24, .1, 20);   /* 판 밑 받침 (밑동은 안개 속) */
  { const s = ARCH.w / size(11)[0]; put(11, ARCH.x, LEDGE - .2, ARCH.z - size(11)[2] * s * .35, 0, s); }   /* 아치 뒤쪽은 절벽 속 · 앞만 드러남 */
  put(9, -9.5, LEDGE - .6, 24, .6, 3.2); put(9, 10, LEDGE - .6, 21, -1.1, 2.6); put(1, 11, LEDGE - .8, 15.5, -.9, 2.2);   /* 판 가장자리 돌 */

  /* 돌산: 북쪽 산줄기 (높음) · 보물방 위 (중간) — 꼭대기 높이에 맞춰 밑동을 땅에 묻음 */
  for (const [i, x, z, s, yaw, top] of RIDGE) put(i, x, TOP + top - s, z, yaw, s);
  for (const [x, z, s] of [[-15, -29, 2.6], [6, -31, 2.8], [42, -30, 3], [17, 2, 2.3]]) put(9, x, TOP - .5, z, rnd() * 6, s);   /* 산기슭에 굴러 떨어진 돌 (산 바로 앞에만) */
  /* 평지 가운데 낮은 돌 · 갈림길 옛 돌판 (반쯤 묻혀 윗면만 0.8m 드러남) · 샘가 돌 */
  for (const [x, z, , i, s] of LOW) put(i, x, TOP - .3, z, rnd() * 6, s);
  put(7, PATHS[0][3][0], TOP + 1.6 - 3.4, PATHS[0][3][1], .4, 3.4);
  for (const S of STREAM) { const [sx, sz] = S.src; put(9, sx + 3, TOP - .6, sz - 1.5, rnd() * 6, 2.2); }
  { const S = STREAM[0], [x, z] = S.pts[Math.floor(S.pts.length * .45)]; put(9, x - 1, TOP - .6, z + 4, 1.3, 2.6); }   /* 개울이 돌아 흐르는 바위 */

  /* 협곡 기둥 바위 (10번 · 밑동은 안개 속) */
  for (const [x, z, r] of PILLARS) { const s = 24 + r * 2; put(10, x, TOP - 7 - s + r, z, rnd() * 6, s * .9, s); }

  /* 같은 조각은 한 번에 그림 */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3(); let tris = 0, draws = 0;
  for (const [i, list] of Object.entries(inst)) { const m = src[i], im = new THREE.InstancedMesh(m.geometry, m.material, list.length); im.name = 'rock' + i;
    list.forEach(([x, y, z, yaw, s, sy], k) => { e.set(0, yaw, 0); q.setFromEuler(e); m4.compose(pos.set(x, y, z), q, sc.set(s, sy, s)); im.setMatrixAt(k, m4); });
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); G.add(im); tris += m.geometry.index.count / 3 * list.length; draws++; }

  /* 위 평지 땅: 조각(14번 풀밭 판) 윗면 그림을 그대로 떠서 깔아 바위 조각과 칠 · 결이 같게 (위에서 찍어 무늬로) · 절벽 가까이는 돌판 무늬(7번)가 드러남 · 길은 흙 */
  const grab = (i, frac) => { const m = src[i], b = m.geometry.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = Math.min(b.max.x - b.min.x, b.max.z - b.min.z) * frac / 2;
    const sc = new THREE.Scene(), mm = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ map: m.material.map })); sc.add(mm);
    const cam = new THREE.OrthographicCamera(cx - h, cx + h, -cz + h, -cz - h, .01, 10); cam.position.set(0, b.max.y + 2, 0); cam.up.set(0, 0, -1); cam.lookAt(0, -1, 0);
    cam.left = cx - h; cam.right = cx + h; cam.top = -(cz - h); cam.bottom = -(cz + h); cam.updateProjectionMatrix();
    const rt = new THREE.WebGLRenderTarget(1024, 1024, { colorSpace: THREE.SRGBColorSpace, wrapS: THREE.MirroredRepeatWrapping, wrapT: THREE.MirroredRepeatWrapping, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });   /* 반복 방식은 만들 때 정해야 먹힘 */ const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(prev); renderer.setClearColor(0x9fd0ef, 1);
    const t = rt.texture; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const grassTex = grab(1, .42), sandTex = grab(14, .5), stoneTex = grab(7, .45);   /* 풀 = 1번 꼭대기 이끼 · 얼룩 = 14번 풀밭 판 (모래 섞임) · 돌 = 7번 돌판 */
  { const fine = new THREE.PlaneGeometry(120, 100, 120, 100); fine.rotateX(-Math.PI / 2); fine.translate(0, 0, -15);
    const P = fine.attributes.position, keep = [], col = [], W2 = [];
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let v = 0; v < P.count; v++) { const x = P.getX(v), z = P.getZ(v), d = distPoly(PLATEAU, x, z);
      const sd = Math.min(...STREAM.map(S => Math.min(segDist(S.pts, x, z), Math.hypot(x - S.src[0], z - S.src[1]) - 1.6))), bed = sm(2.6, 1.0, sd);   /* 개울 바닥: 물이 깎아 낸 골 */
      P.setY(v, TOP + .15 * fbm(x * .2, z * .2) - rimDrop(d) - 1.3 * bed);   /* 가장자리 7m에서 땅이 둥글게 내려가 절벽 꼭대기 이끼 밑으로 숨음 (땅 끝 계단이 안 보임) */
      const pd = Math.min(...PATHS.map(L => segDist(L, x, z)));
      const path = Math.max(0, Math.min(1, (2.6 + 1.2 * (noise(x * .5, z * .5) - .5) - pd) / 1.4)) * (1 - bed), rocky = Math.max(Math.max(0, Math.min(1, (d + 4) / 3)) * (.4 + .6 * noise(x * .15, z * .15)) * .7, bed * .95), k = (.78 + .2 * fbm(x * .05, z * .05)) * (1 - .25 * sm(5.5, 2, sd)), sand = Math.max(0, Math.min(1, (fbm(x * .035 + 11, z * .035) - .45) * 4));   /* 개울가는 젖어 어둡고 바닥은 돌 */
      col.push(k, k, sand); W2.push(path, rocky); }   /* 색 r=g=밝기 · b=모래 얼룩 정도 (칠에서 꺼내 씀) */
    const ix = []; const W = 121; for (let j = 0; j < 100; j++) for (let i = 0; i < 120; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1, cx = (P.getX(a) + P.getX(d)) / 2, cz = (P.getZ(a) + P.getZ(d)) / 2; if (distPoly(PLATEAU, cx, cz) > -1.5) continue;   /* 땅 끝은 절벽 꼭대기 밑에 숨음 */ ix.push(a, c, b, b, c, d); }
    fine.setIndex(ix); fine.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); fine.computeVertexNormals();
    fine.setAttribute('aMix', new THREE.Float32BufferAttribute(W2, 2));
    { const U = fine.attributes.uv; for (let v = 0; v < P.count; v++) U.setXY(v, P.getX(v) / 9, -P.getZ(v) / 9); U.needsUpdate = true; }   /* 무늬 좌표 = 땅 위치 (9m마다 한 번) */
    const gm = new THREE.MeshStandardMaterial({ map: grassTex, vertexColors: true, roughness: 1, metalness: 0 });
    gm.onBeforeCompile = sh => { sh.uniforms.tStone = { value: stoneTex }; sh.uniforms.tSand = { value: sandTex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aMix; varying vec2 vMix; varying vec2 vW;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMix = aMix; vW = (modelMatrix * vec4(position, 1.)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tStone, tSand; varying vec2 vMix; varying vec2 vW;')
        .replace('#include <map_fragment>', `vec2 gu = vMapUv, gr = mat2(.77, -.64, .64, .77) * gu * .41 + .37;   /* 두 번째는 돌리고 크기를 바꿔 겹침 → 거울 무늬 티가 안 남 */
          vec3 g1 = texture2D(map, gu).rgb, g2 = texture2D(map, gr).rgb, sd = texture2D(tSand, mat2(.5, .87, -.87, .5) * gu * .63 + .29).rgb, st = texture2D(tStone, gu * 1.28).rgb;
          vec3 grass = mix(g1, g2, .5); grass = mix(grass, sd, vColor.b * .8);
          vec3 dirt = mix(sd, vec3(.46, .35, .22), .6);   /* 흙길: 모래 무늬에 흙빛 */
          vec3 c = mix(grass, st, vMix.y); c = mix(c, dirt, vMix.x * .85); diffuseColor.rgb = c * vColor.r;`); };
    const ground = new THREE.Mesh(fine, gm); ground.receiveShadow = true; ground.name = 'plateau'; G.add(ground); tris += ix.length / 3; draws++; }

  /* 보물방 입구 속: 아치 안쪽이 깊은 어둠 (들어가면 보물 맵으로 바뀌니 속은 안 만듦) */
  { const [aw, ah, ad] = size(11).map(v => v * ARCH.w / size(11)[0]), w = aw * .36, h = ah * .5, sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({ color: 0x070b0d })); m.position.set(ARCH.x, LEDGE - .4, ARCH.z - ad * .5); G.add(m); draws++; }   /* 아치 구멍 모양(둥근 위)의 어둠 · 아치 틀 뒤에 숨어 가장자리가 안 보임 */

  /* ── 물 (사용자 2026-11-14 그림: 협곡 바닥은 물길 · 평지 개울이 절벽에서 폭포로) ──
     물결 무늬 하나(이어지는 잡음)를 협곡 물 · 개울 · 폭포가 같이 씀 · 셋 다 빛 계산 없이 색만 (가벼움) */
  const nzTex = (() => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), id = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N; let a = 0; for (let k = 0; k < 4; k++) { const f = 2 ** k * 4; a += pnoise(u * f, v * f, f) / 2 ** k; } const p = (y * N + x) * 4, q = Math.min(255, a / 1.875 * 255); id.data[p] = id.data[p + 1] = id.data[p + 2] = id.data[p + 3] = q; }
    g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t; })();
  const U = { t: { value: 0 }, nz: { value: nzTex }, px: { value: 600 } };
  const shade = (vs, fs, o = {}) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs + '', ...o });
  const OUT = `\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n`;
  const falls = STREAM.map(S => ({ ...S.lip, base: [S.lip.x, S.lip.z] }));
  /* 협곡 물: 절벽 · 기둥 밑동 가까이는 얕은 청록 + 흰 물거품 (밑동이 물에 닿는 곳을 감춤) · 멀어질수록 깊은 물빛 · 폭포 떨어지는 곳은 거품이 큼 */
  { const W = 320, D = 300, geo = new THREE.PlaneGeometry(W, D, 110, 104); geo.rotateX(-Math.PI / 2); geo.translate(0, WATER, -8); const P = geo.attributes.position, dd = [];
    for (let v = 0; v < P.count; v++) { const x = P.getX(v), z = P.getZ(v); let d = Math.min(distPoly(PLATEAU, x, z) - 2.5, distPoly(LEDGE_AREA, x, z) - 6);
      for (const [px, pz, r] of PILLARS) d = Math.min(d, Math.hypot(x - px, z - pz) - (24 + r * 2) * .9 * .3);
      for (const f of falls) d = Math.min(d, Math.hypot(x - f.x - f.ox * 6, z - f.z - f.oz * 6) - 5);
      dd.push(d); }
    geo.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    const m = new THREE.Mesh(geo, shade(`attribute float aD; varying float vD; varying vec2 vW; void main(){ vD = aD; vW = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      `uniform float t; uniform sampler2D nz; varying float vD; varying vec2 vW;
       void main(){ vec2 p = vW * .018; float n1 = texture2D(nz, p + vec2(t * .010, t * .006)).r, n2 = texture2D(nz, p * 1.9 - vec2(t * .007, -t * .011)).r, n = (n1 + n2) * .5;
         float near = smoothstep(26., 0., vD), edge = smoothstep(7., 0., vD);
         vec3 deep = vec3(.020, .17, .26), shallow = vec3(.05, .42, .50), c = mix(deep, shallow, near * .85 + (n - .5) * .35);
         float n3 = texture2D(nz, vW * .07 + vec2(-t * .02, t * .015)).r;
         float foam = smoothstep(.60, .74, n3 + edge * .4 - .25) * smoothstep(3.5, -1.5, vD);   /* 밑동에 닿아 부서지는 거품 (얼룩져 끊김 · 띠로 칠하지 않음) */
         float glint = smoothstep(.80, .90, n2) * .18 * (1. - near * .5);
         gl_FragColor = vec4(mix(c, vec3(.82, .93, .96), clamp(foam, 0., 1.) * .7) + glint, 1.);
         ${OUT} }`));
    m.name = 'canyonWater'; G.add(m); tris += 110 * 104 * 2; draws++; }

  /* 개울: 샘(물웅덩이)에서 시작해 골을 따라 흐름 · 끝에선 절벽 끝까지 이어져 폭포가 됨 · 흐르는 방향으로 물결 무늬가 밀려감 */
  { const pos = [], uv = [], idx = []; let base = 0;
    for (const S of STREAM) { const L = S.pts.concat([S.end, [S.lip.x - S.lip.ox * .2, S.lip.z - S.lip.oz * .2]]); let acc = 0;
      for (let k = 0; k < L.length; k++) { const [x, z] = L[k], [ax, az] = L[Math.max(0, k - 1)], [bx, bz] = L[Math.min(L.length - 1, k + 1)], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l;
        if (k) acc += Math.hypot(x - L[k - 1][0], z - L[k - 1][1]);
        const d = distPoly(PLATEAU, x, z), y = d < -1.6 ? TOP + .15 * fbm(x * .2, z * .2) - rimDrop(d) - .45 : LIP_Y, w = 2 + .3 * Math.sin(acc * .4) + (k < 3 ? .6 : 0);
        pos.push(x + nx * w, y, z + nz * w, x - nx * w, y, z - nz * w); uv.push(acc, 0, acc, 1); if (k) { const a = base + (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      base += L.length * 2;
      /* 샘 웅덩이 */ const [sx, sz] = S.src, y0 = TOP + .15 * fbm(sx * .2, sz * .2) - .5, c0 = base; pos.push(sx, y0, sz); uv.push(0, .5);
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

  /* 폭포: 절벽 끝에서 바깥으로 휘어 나간 뒤 거의 곧게 떨어짐 (벽 앞면에서 떨어져 벽을 뚫지 않음) · 아래로 갈수록 넓어지고 흩어짐 · 물줄기 무늬가 빠르게 내려감 */
  { const pos = [], uv = [], idx = []; let base = 0, N = 34;
    for (const f of falls) { const H = LIP_Y - WATER, tx = -f.oz, tz = f.ox;
      for (let j = 0; j <= N; j++) { const dy = H * (j / N) ** 1.25, off = 5.2 * Math.sqrt(Math.min(1, dy / 7)) + dy * .05, w = 1.9 + dy * .07, cx = f.x + f.ox * off, cz = f.z + f.oz * off, y = LIP_Y - dy;
        for (let i = 0; i <= 4; i++) { const u = i / 4, bow = Math.sin(u * Math.PI) * .7; pos.push(cx + tx * (u - .5) * 2 * w + f.ox * bow, y, cz + tz * (u - .5) * 2 * w + f.oz * bow); uv.push(u, dy / 5); }
        if (j) for (let i = 0; i < 4; i++) { const a = base + (j - 1) * 5 + i; idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6); } }
      base += (N + 1) * 5; f.base = [f.x + f.ox * (5.2 + H * .05), f.z + f.oz * (5.2 + H * .05)]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, shade(`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      `uniform float t; uniform sampler2D nz; varying vec2 vUv;
       void main(){ float s = texture2D(nz, vec2(vUv.x * .9, vUv.y * .10 - t * .55)).r, s2 = texture2D(nz, vec2(vUv.x * 1.7 + .3, vUv.y * .18 - t * .9)).r;
         float side = smoothstep(0., .2, vUv.x) * smoothstep(1., .8, vUv.x), lip = smoothstep(0., .12, vUv.y);
         float a = side * (.55 + .45 * smoothstep(.35, .7, s)) * (.75 + .25 * lip);
         vec3 c = mix(vec3(.55, .80, .86), vec3(.97, 1., 1.), smoothstep(.45, .75, s2) * .9 + (1. - lip) * .3);
         gl_FragColor = vec4(c, a); ${OUT} }`, { side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    m.name = 'falls'; m.renderOrder = 3; G.add(m); tris += idx.length / 3; draws++; }

  /* 폭포 밑 물보라: 떨어진 물이 부서져 하얗게 피어오름 (점 여러 개가 부풀며 올라가다 사라짐) */
  { const pos = [], ph = [];
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
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.9); sun.position.set(40, 90, 60); sun.castShadow = true; Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 300 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .4; scene.add(sun, sun.target);
  onProgress(.2);
  const Z = await buildCliffZone(THREE, renderer); scene.add(Z.group); window.__ZONE = Z; console.log('[절벽 시험 구역]', JSON.stringify(Z.stats)); onProgress(.6);

  /* 기체 (게임과 같은 고르기) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  const LV = { cur: 1, to: 1, f: 1, dur: .33, dir: 0, y: LAYERS[1], y0: LAYERS[1], flash: 0 };
  const B = { blocked: (x, z) => blockedAt(x, z, LV.cur) || (LV.to !== LV.cur && blockedAt(x, z, LV.to)), region: () => 0 };
  const START = [-10, 2], fly = await makeFlight(renderer, B, START, 0, FG); scene.add(fly); const FS = fly.userData.S; fly.userData.respawn(START[0], START[1], 0); window.__FS = FS; window.__LV = LV;
  fly.traverse(o => { if (o.isMesh) o.castShadow = true; });
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

  /* 카메라: 게임과 같음 (56° · 세로 22m · 높을수록 조금 물러남) */
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
    { const f = [.95, 1, 1.25][LV.to]; camD += (cfg.dist * CAMK * f - camD) * Math.min(1, dt * 3); }
    const a = cfg.ang * Math.PI / 180, vx = cam.x, vz = cam.z - camD / CAMK * .15, cy = LV.y;
    if (window.__shotCam) { const c = window.__shotCam; camera.position.set(...c.p); camera.lookAt(...c.t); } else { camera.position.set(vx, cy + camD * Math.sin(a), vz + camD * Math.cos(a)); camera.lookAt(vx, cy, vz); }
    camera.updateMatrixWorld(); sun.position.set(cam.x + 40, 90, cam.z + 60); sun.target.position.set(cam.x, 0, cam.z); sun.target.updateMatrixWorld();
    FG.preRender?.(camera); renderer.render(scene, camera);
    acc.n++; acc.ms += performance.now() - c0; acc.tt += dt; if (acc.tt > .5 && info) { info.textContent = `그리기 ${renderer.info.render.calls}번 · 삼각형 ${renderer.info.render.triangles.toLocaleString()}개 · 계산 ${(acc.ms / acc.n).toFixed(1)}ms`; acc.n = acc.ms = acc.tt = 0; } });
}
