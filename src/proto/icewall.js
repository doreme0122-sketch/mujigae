/* 빙하 얼음 벽 토막 (사용자 2026-11-04: 조각을 이어 붙인 티가 나면 안 됨 → 길이 10m 토막을 처음부터 한 덩어리로 깎음)
   깎는 순서 — 승인된 얼음 덩어리(ice.js block)와 같은 솜씨를 길게 늘인 것:
   ① 길쭉한 덩어리(타원체)를 바닥에 앉힘 (밑면 납작)
   ② 등줄기 높이가 길이를 따라 오르내림 + 봉우리 몇 개가 위로 솟음 (봉우리도 같은 겉면에서 자라남 → 이음매 없음)
   ③ 큰 결·잔결로 울퉁불퉁하게 (빙하가 밀려 생긴 혹)
   ④ 깨진 면: 겉면 곳곳을 평평한 칼로 저며 냄(얼음이 쪼개진 맑은 면) — 위쪽은 비스듬히, 옆은 세로로 길게, 봉우리는 뾰족하게
   ⑤ 면마다 각이 또렷하게(면 노멀)
   토막 끝은 낮고 좁게 줄어듦 → 다음 토막과 깊게 겹쳐 이으면 끝이 몸통 속에 묻혀 이음이 바위 틈처럼 보임
   종류: low 낮은 토막 · high 높은 토막(봉우리 큼) · door 문 옆 토막(한쪽 끝이 우뚝 솟고 절벽처럼 끊김)
   무게: 토막 모양은 종류마다 하나 → 벽 전체가 그리기 몇 번(InstancedMesh) */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { iceMaterial } from './ice.js';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };
const fbm = (x, y, z) => vn(x, y, z) * .55 + vn(x * 2.1, y * 2.1, z * 2.1) * .3 + vn(x * 4.3, y * 4.3, z * 4.3) * .15;

export const ICE_MOD = { L: 10, W: 4.6 };

export function iceModule(kind = 'low', seed = 1) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const L = ICE_MOD.L, W = ICE_MOD.W, H = kind === 'low' ? 3.4 : 4.6;
  let g = new THREE.IcosahedronGeometry(1, 5); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const P = g.attributes.position, v = new THREE.Vector3(), o = seed * 3.1;
  /* 봉우리 자리 (토막 길이 방향 x) */
  const spires = []; const ns = kind === 'low' ? 1 : 2;
  for (let i = 0; i < ns; i++) spires.push({ x: (R() - .5) * L * .55, w: .9 + R() * .7, h: (kind === 'low' ? .7 : 1.5) * (.8 + R() * .4), z: (R() - .3) * .8 });
  if (kind === 'door') spires.push({ x: L * .36, w: 1.35, h: 2.3, z: .2 });
  /* 깨진 면을 낼 칼 자리: 겉면 위 한 점 + 방향 + 깊이 */
  const topAt = x => { let r = 1 + .14 * Math.sin(x * .62 + o) + .08 * Math.sin(x * 1.4 + o * 2); for (const sp of spires) { const d = (x - sp.x) / sp.w; r += sp.h * Math.exp(-d * d) * 1.6; } return H * r; };
  const cuts = [];
  for (let i = 0; i < 80; i++) { const x = (R() - .5) * L * 1.05, side = R() < .5 ? -1 : 1, top = R() < .4;
    const n = top ? new THREE.Vector3((R() - .5) * .9, 1, side * (.2 + R() * .7)).normalize() : new THREE.Vector3((R() - .5) * .8, (R() - .25) * .8, side).normalize();
    const C = new THREE.Vector3(x, top ? 0 : topAt(x) * .35, 0);
    const k = top ? topAt(x) * (.62 + R() * .3) : W * .5 * (.55 + R() * .35);
    cuts.push({ C, n, k, r: 1.2 + R() * 2 }); }
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
    const ax = v.x;                                                                                  /* -1 … 1 (길이 방향) */
    let x = ax * L * .5, y = v.y, z = v.z * W * .5;
    /* ① 끝으로 갈수록 낮고 좁게 (다음 토막과 깊게 겹치도록) */
    const endK = 1 - Math.pow(Math.abs(ax), 3.2);
    const doorK = kind === 'door' && ax > 0 ? Math.max(endK, 1 - Math.pow(Math.max(0, ax - .55) / .45, 6)) : endK;   /* 문 옆: 바깥 끝은 줄지 않고 절벽 */
    /* ② 등줄기 높이 + 봉우리 */
    let ridge = 1 + .14 * Math.sin(x * .62 + o) + .08 * Math.sin(x * 1.4 + o * 2);
    for (const s of spires) { const d = (x - s.x) / s.w; ridge += s.h * Math.exp(-d * d) * Math.max(0, v.y) * 1.6; }
    y = y > 0 ? y * H * ridge * (.35 + .65 * doorK) : y * .45;
    z *= .55 + .45 * Math.sqrt(Math.max(0, kind === 'door' && ax > 0 ? Math.max(endK, .8) : endK));
    if (y > 0) z *= 1 - Math.min(.55, y / (H * 2.6)) * .9;                                          /* 위로 갈수록 좁아짐(능선) */
    /* ③ 혹 */
    const b = fbm(x * .28 + o, y * .28, z * .28) - .5, f = vn(x * 1.3, y * 1.3 + o, z * 1.3) - .5;
    const lift = Math.max(0, y) / H;
    z += Math.sign(z || 1) * (b * 1.1 + f * .35) * (.4 + .6 * lift); y += (b * .9 + f * .3) * lift; x += (vn(x * .5, y * .5, z * .5 + o) - .5) * .5;
    if (y < -.25) y = -.25 + (y + .25) * .15;                                                         /* 밑은 땅에 앉음 */
    v.set(x, y, z);
    /* ④ 깨진 면: 칼 둘레만 저며 냄 (평평한 면이 생김) */
    for (const c of cuts) { const dx = Math.abs(v.x - c.C.x); if (dx > c.r) continue;
      const h = (v.x - c.C.x) * c.n.x + (v.y - c.C.y) * c.n.y + v.z * c.n.z, kk = c.k + dx * dx * .12;   /* 칼 가장자리로 갈수록 덜 저밈 */
      if (h > kk) v.addScaledVector(c.n, -(h - kk)); }
    P.setXYZ(i, v.x, Math.max(-.25, v.y), v.z); }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); ng.computeBoundingBox(); return ng;
}

/* 벽: 길을 따라 토막을 깊게 겹쳐 이음 · 문 쪽 끝은 문 토막 */
export function makeIceWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || iceMaterial(uT), doors = opt.doors || [true, true];
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const R = (() => { let s = (opt.seed || 3) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const V = { low: [iceModule('low', 2), iceModule('low', 5)], high: [iceModule('high', 3), iceModule('high', 7)], door: [iceModule('door', 4)] };
  const lists = new Map(); const add = (geo, m) => { if (!lists.has(geo)) lists.set(geo, []); lists.get(geo).push(m); };
  const step = ICE_MOD.L * .62, n = Math.max(1, Math.ceil((len - ICE_MOD.L * .4) / step)), p = new THREE.Vector3(), tg = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i <= n; i++) { const d = THREE.MathUtils.clamp(ICE_MOD.L * .42 + i * (len - ICE_MOD.L * .84) / Math.max(1, n), 0, len), u = d / len;
    curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    const atStart = i === 0 && doors[0], atEnd = i === n && doors[1];
    let geo, flip = 1;
    if (atStart || atEnd) { geo = V.door[0]; flip = atStart ? -1 : 1; }                              /* 문 토막: 우뚝한 끝이 문 쪽을 봄 */
    else geo = (Math.sin(d * .09 + 1.3) > 0 ? V.high : V.low)[Math.floor(R() * 2)];
    let nx = -tg.z, nz = tg.x; const sgn = opt.out ? opt.out(p.x, p.z, nx, nz) : 1;
    const yaw = Math.atan2(-tg.z, tg.x) + (flip < 0 ? Math.PI : 0);
    q.setFromEuler(new THREE.Euler((R() - .5) * .04, yaw, (R() - .5) * .04, 'YXZ'));
    const zf = (flip < 0 ? -1 : 1) * sgn;                                                              /* 높은 등이 바깥(우주) 쪽 */
    s.set(.95 + R() * .12, .9 + R() * .2, .95 + R() * .1);   /* 음수 크기는 면이 뒤집혀 속이 비어 보임 → 쓰지 않음 */
    p.addScaledVector(new THREE.Vector3(nx, 0, nz).multiplyScalar(sgn), .35);
    add(geo, new THREE.Matrix4().compose(p.clone(), q.clone(), s.clone())); }
  const grp = new THREE.Group();
  for (const [geo, ms] of lists) { const im = new THREE.InstancedMesh(geo, mat, ms.length); ms.forEach((m, j) => im.setMatrixAt(j, m)); im.computeBoundingSphere(); grp.add(im); }
  grp.userData = { mods: V };
  return grp;
}
