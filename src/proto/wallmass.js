/* 한 덩어리 벽 (사용자 2026-11-04: 여러 개를 빼곡히 세운 느낌보다 한 덩어리 · 높낮이가 물결 · 뒷줄 높게 · 문 양옆 우뚝)
   · 몸통: 길을 따라 끊기지 않고 이어지는 능선 하나. 단면은 두 겹 — 우주 쪽(바깥) 높은 등성이 + 땅 쪽(안) 낮은 등성이 → 위에서 봐도 두께가 읽힘
   · 높이: 길이를 따라 물결치듯 오르내림(긴 물결 + 짧은 물결) · 문 쪽 끝은 가장 높이 솟았다가 절벽처럼 끊김(문기둥 없이도 문이 보임)
   · 봉우리: 몸통 위에 몇 군데만 크게 솟음(빼곡하지 않게) — 종류마다 그 벽의 덩어리 모양을 크게 써서 같은 재질로
   · 겉면: 잔 울퉁불퉁(3D 잡음) · 얼음·결정·흑요석·유적은 면이 각지게(깨진 면), 산호는 매끈하게(자란 살)
   · 재질은 승인된 벽 다섯 가지 그대로(인스턴스 하나로 그려 같은 셰이더가 그대로 돎)
   · 무게: 벽 한 줄 = 몸통 1번 + 봉우리 1번 그리기 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rockMaterial, chunk } from './rocks.js?v=11042108';
import { iceMaterial, block } from './ice.js?v=11042108';
import { crystalMaterial, prism } from './crystal.js?v=11042108';
import { ruinMaterial, pillar } from './ruins.js?v=11042108';
import { coralMaterial, coral } from './coral.js?v=11042108';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };

export const STYLES = {
  obsidian: { name: '용암 흑요석', col: [.0095, .0085, .0125], mat: uT => rockMaterial('obsidian', uT), peak: i => chunk('obsidian', i + 61, 3), H: 4.4, facet: true, rough: .45, peaks: 1 / 9, peakK: [1.6, 3.4] },
  ice: { name: '빙하 얼음', mat: iceMaterial, peak: i => block(i + 1), H: 4, facet: true, rough: .4, peaks: 1 / 8, peakK: [1.5, 3.6], tall: 1.6 },
  crystal: { name: '자수정 무리', mat: crystalMaterial, peak: i => prism(i + 1), H: 3.6, facet: true, rough: .3, peaks: 1 / 6, peakK: [1.4, 3], tall: 2.2 },
  ruins: { name: '고대 유적', mat: ruinMaterial, peak: i => pillar(i + 1), H: 3.8, facet: true, rough: .12, step: .55, peaks: 1 / 10, peakK: [1.1, 1.8] },
  coral: { name: '성운 산호', mat: coralMaterial, peak: i => coral(i + 1, true), H: 3.4, facet: false, rough: .55, peaks: 1 / 7, peakK: [1.3, 2.4] } };

/* path: [[x,z],…] · out: 바깥(우주) 쪽 부호 함수 (x,z,nx,nz) → ±1 · doors: [시작이 문, 끝이 문]
   몸통 = 길을 따라 길쭉하게 늘린 큰 덩어리를 반 넘게 겹쳐 이어 붙임 → 틈 없는 한 덩어리 능선 (얇은 판이 아니라 속이 찬 바위)
   · 뒷줄(바깥): 높은 등성이 · 앞줄(안): 낮은 등성이 · 높이는 길이를 따라 물결 · 문 양옆 가장 높음 · 봉우리는 몇 군데만 */
export function makeMassWall(kind, path, opt = {}) {
  const S = STYLES[kind], uT = opt.uT || { value: 0 }, seed = opt.seed || 1;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), !!opt.closed, 'centripetal'), len = curve.getLength();
  const doors = opt.doors || [true, true];
  const Hb = d => { const a = S.H * (1 + .25 * Math.sin(d * .17 + seed) + .12 * Math.sin(d * .49 + seed * 2.1));
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, dd = Math.min(ds, de);
    return a + Math.exp(-dd * dd / 12) * S.H * .8; };                                           /* 문 양옆: 가장 높이 */
  const R = (() => { let s = seed * 7919 + 13; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const mat = opt.mat || S.mat(uT);
  const geos = [0, 1, 2, 3].map(i => S.peak(i + seed * 3)); geos.forEach(g => { g.computeBoundingBox(); });
  const per = geos.map(() => []);
  const p = new THREE.Vector3(), tg = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pp = new THREE.Vector3(), e = new THREE.Euler();
  const put = (d, side, h, wid, along, tilt) => { const u = THREE.MathUtils.clamp(d / len, 0, 1); curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    let nx = -tg.z, nz = tg.x; const sgn = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sgn; nz *= sgn;
    const gi = Math.floor(R() * geos.length), bb = geos[gi].boundingBox, gh = Math.max(.3, bb.max.y - bb.min.y), gw = Math.max(.3, bb.max.x - bb.min.x), gd = Math.max(.3, bb.max.z - bb.min.z);
    pp.set(p.x + nx * side, -bb.min.y * (h / gh) - .25, p.z + nz * side);
    const yaw = Math.atan2(tg.x, tg.z); e.set((R() - .5) * tilt, yaw + (R() - .5) * .3, (R() - .5) * tilt, 'YXZ'); q.setFromEuler(e);
    sc.set(wid / gw, h / gh, along / gd); m4.compose(pp, q, sc); per[gi].push(m4.clone()); };
  /* 몸통: 뒷줄은 크게 반 넘게 겹치며, 앞줄은 낮게 */
  for (let d = .6; d < len - .4; d += 1.7 + R() * .6) { const h = Hb(d); put(d, .9 + R() * .35, h * (.85 + R() * .2), 3 + R() * .8, 3.6 + R() * 1.2, .16); }
  for (let d = 1.4; d < len - .4; d += 2.1 + R() * .8) { const h = Hb(d) * .5; put(d, -1. - R() * .35, h * (.8 + R() * .3), 2.6 + R() * .7, 3.2 + R() * 1, .2); }
  /* 봉우리: 몇 군데만 · 문 양옆은 꼭 */
  const cnt = Math.max(1, Math.round(len * S.peaks)); const spots = [];
  for (let k = 0; k < cnt; k++) spots.push([(k + .2 + R() * .6) / cnt * len, 0]);
  if (doors[0]) spots.push([1, 1]); if (doors[1]) spots.push([len - 1, 1]);
  for (const [d, big] of spots) { const h = Hb(d) * (S.tall || 1.35) * (big ? 1.25 : .95 + R() * .3); put(d, .8 + R() * .4, h, 2 + R() * .6, 2 + R() * .6, .3); }
  const grp = new THREE.Group();
  geos.forEach((gg, i) => { if (!per[i].length) return;
    if (kind === 'obsidian' && !gg.attributes.color) { const c = new Float32Array(gg.attributes.position.count * 3); for (let j = 0; j < c.length; j += 3) { c[j] = .009; c[j + 1] = .008; c[j + 2] = .012; } gg.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
    const im = new THREE.InstancedMesh(gg, mat, per[i].length); per[i].forEach((mm, j) => im.setMatrixAt(j, mm)); im.computeBoundingSphere(); grp.add(im); });
  grp.userData = { kind, len };
  return grp;
}
