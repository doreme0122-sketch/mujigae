/* 한 덩어리 벽 (사용자 2026-11-04: 여러 개를 빼곡히 세운 느낌보다 한 덩어리 · 높낮이가 물결 · 뒷줄 높게 · 문 양옆 우뚝)
   · 몸통: 길을 따라 끊기지 않고 이어지는 능선 하나. 단면은 두 겹 — 우주 쪽(바깥) 높은 등성이 + 땅 쪽(안) 낮은 등성이 → 위에서 봐도 두께가 읽힘
   · 높이: 길이를 따라 물결치듯 오르내림(긴 물결 + 짧은 물결) · 문 쪽 끝은 가장 높이 솟았다가 절벽처럼 끊김(문기둥 없이도 문이 보임)
   · 봉우리: 몸통 위에 몇 군데만 크게 솟음(빼곡하지 않게) — 종류마다 그 벽의 덩어리 모양을 크게 써서 같은 재질로
   · 겉면: 잔 울퉁불퉁(3D 잡음) · 얼음·결정·흑요석·유적은 면이 각지게(깨진 면), 산호는 매끈하게(자란 살)
   · 재질은 승인된 벽 다섯 가지 그대로(인스턴스 하나로 그려 같은 셰이더가 그대로 돎)
   · 무게: 벽 한 줄 = 몸통 1번 + 봉우리 1번 그리기 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rockMaterial, chunk } from './rocks.js?v=11111214';
import { iceMaterial, block } from './ice.js?v=11111214';
import { crystalMaterial, prism } from './crystal.js?v=11111214';
import { ruinMaterial, pillar } from './ruins.js?v=11111214';
import { coralMaterial, coral } from './coral.js?v=11111214';

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
   몸통과 봉우리를 처음부터 한 장의 겉면으로 만든다 (조각을 이어 붙이지 않음 → 이음매가 없음)
   · 높이 = 뒷줄 등성이 ∪ 앞줄 등성이 ∪ 봉우리들 (셋 중 높은 쪽) → 봉우리가 몸통에서 자라 나온 것처럼
   · 봉우리 모양은 종류마다: 얼음·결정 = 뾰족 · 흑요석 = 굵은 기둥(윗면 평평) · 유적 = 층진 단 · 산호 = 둥근 덩이
   · 겉면 울퉁불퉁: 큰 결(면 크기)과 잔결 두 겹 · 각진 재료는 면을 크게(깨진 면), 산호는 촘촘하고 매끈하게 */
export function makeMassWall(kind, path, opt = {}) {
  const S = STYLES[kind], uT = opt.uT || { value: 0 }, seed = opt.seed || 1;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), !!opt.closed, 'centripetal'), len = curve.getLength();
  const doors = opt.doors || [true, true], W = 7.4;
  const stepU = S.facet ? 1.15 : .45, NU = Math.max(6, Math.round(len / stepU)), NV = S.facet ? 9 : 20;
  const R = (() => { let s = seed * 7919 + 13; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const Hb = d => { const a = S.H * (1 + .22 * Math.sin(d * .17 + seed) + .1 * Math.sin(d * .49 + seed * 2.1));
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, dd = Math.min(ds, de);
    return a + Math.exp(-dd * dd / 12) * S.H * .55; };
  const sh = x => { const t = 1 - Math.abs(x); return t > 0 ? (S.facet ? Math.pow(t, .85) : Math.pow(1 - x * x, 1.3)) : 0; };   /* 각진 재료: 등줄기가 선 능선 · 산호: 둥근 둔덕 */
  /* 봉우리 자리: 몇 군데만 + 문 양옆 */
  const peaks = [], cnt = Math.max(1, Math.round(len * S.peaks));
  for (let k = 0; k < cnt; k++) peaks.push({ d: (k + .2 + R() * .6) / cnt * len, v: .7 + R() * .5, h: 1, w: 1.5 + R() * .6 });
  if (doors[0]) peaks.push({ d: 1.1, v: .6, h: 1.25, w: 1.9 }); if (doors[1]) peaks.push({ d: len - 1.1, v: .6, h: 1.25, w: 1.9 });
  const pk = r => { if (r >= 1) return 0;
    if (kind === 'ice' || kind === 'crystal') return Math.pow(1 - r, 1.15);                     /* 뾰족 */
    if (kind === 'obsidian') return r < .72 ? 1 : 1 - (r - .72) / .28 * .9;                      /* 굵은 기둥: 윗면 평평, 옆은 가파름 */
    if (kind === 'ruins') return Math.round((1 - r * r) * 4) / 4;                                 /* 층진 단 */
    return Math.pow(1 - r * r, 1.6); };                                                          /* 산호: 둥근 덩이 */
  const height = (d, v) => { const hb = Hb(d); let h = Math.max(hb * sh((v - .7) / 3.), hb * .48 * sh((v + 1.9) / 1.9));
    h *= .68;                                                                                    /* 몸통은 낮은 둔덕: 큰 덩어리가 여기서 솟음 */
    if (S.step) h = Math.round(h / S.step) * S.step * .8 + h * .2;
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, ed = Math.min(ds, de, d + 2, len - d + 2);   /* 끝: 문 쪽은 1m 안에서 급히 낮아짐(절벽) */
    const k = Math.min(1, ed / (doors[0] || doors[1] ? 1 : 2.5)); return h * (.15 + .85 * Math.min(1, Math.sqrt(k))); };
  const pos = [], dist = [], idx = [], p = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let i = 0; i <= NU; i++) { const u = i / NU, d = u * len; curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    let nx = -tg.z, nz = tg.x; const sgn = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sgn; nz *= sgn;
    for (let j = 0; j <= NV; j++) { const v = (j / NV - .5) * W, edge = j === 0 || j === NV || i === 0 || i === NU;
      let h = height(d, v), x = p.x + nx * v + tg.x * 0, z = p.z + nz * v;
      if (!edge) { const big = vn(x * .32 + seed, h * .32, z * .32) - .5, fine = vn(x * 1.1, h * 1.1 + 4, z * 1.1) - .5, k = S.rough * Math.min(1, h / 1.5);
        x += nx * big * k * 2.2 + tg.x * fine * k * 1.4; z += nz * big * k * 2.2 + tg.z * fine * k * 1.4; h += big * k * 1.4 + fine * k * .6; }
      else h = Math.min(h, .02) - .3;
      pos.push(x, Math.max(-.3, h), z); dist.push(Math.max(0, h) / (S.H * 1.8)); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  let g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(dist, 1)); g.setIndex(idx);
  if (S.facet) { g = g.toNonIndexed(); g.computeVertexNormals(); } else g.computeVertexNormals();
  const n = g.attributes.position.count, col = new Float32Array(n * 3), aS = new Float32Array(n), P = g.attributes.position;
  for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = .75 + .35 * vn(x * .4, y * .4, z * .4), c0 = S.col || [1, 1, 1];
    col[i * 3] = c0[0] * k; col[i * 3 + 1] = c0[1] * k; col[i * 3 + 2] = c0[2] * k; aS[i] = hs(Math.floor(x * .3), 0, Math.floor(z * .3)); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  const mat = opt.mat || S.mat(uT);
  const body = new THREE.InstancedMesh(g, mat, 1); body.setMatrixAt(0, new THREE.Matrix4()); body.computeBoundingSphere(); body.frustumCulled = false;
  const grp = new THREE.Group(); grp.add(body);
  /* 몸통에서 솟은 큰 덩어리: 몸통 속에 깊이 묻혀(아래 40%) 이음매가 몸통에 가려짐 · 크게, 드문드문, 서로 깊게 파고듦 */
  const geos = [0, 1, 2, 3].map(i => S.peak(i + seed * 3)); geos.forEach(gg => gg.computeBoundingBox()); const per = geos.map(() => []);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pp = new THREE.Vector3(), e = new THREE.Euler();
  const put = (d, side, h, wid, along, tilt, sink) => { const u = THREE.MathUtils.clamp(d / len, 0, 1); curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    let nx = -tg.z, nz = tg.x; const sgn = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sgn; nz *= sgn;
    const gi = Math.floor(R() * geos.length), bb = geos[gi].boundingBox, gh = Math.max(.3, bb.max.y - bb.min.y), gw = Math.max(.3, bb.max.x - bb.min.x), gd = Math.max(.3, bb.max.z - bb.min.z);
    pp.set(p.x + nx * side, -bb.min.y * (h / gh) - h * sink, p.z + nz * side);
    e.set((R() - .5) * tilt, Math.atan2(tg.x, tg.z) + (R() - .5) * .35, (R() - .5) * tilt, 'YXZ'); q.setFromEuler(e);
    sc.set(wid / gw, h / gh, along / gd); m4.compose(pp, q, sc); per[gi].push(m4.clone()); };
  for (let d = 1.2; d < len - .8; d += 3.2 + R() * 1.4) put(d, .7 + R() * .4, Hb(d) * (1.05 + R() * .25), 3.4 + R(), 4.6 + R() * 1.4, .15, .42);
  for (const q2 of peaks) put(q2.d, q2.v, Hb(q2.d) * (S.tall || 1.35) * q2.h * 1.05, 2.4 + R() * .6, 2.4 + R() * .6, .25, .3);
  geos.forEach((gg, i) => { if (!per[i].length) return;
    if (kind === 'obsidian') { const c = new Float32Array(gg.attributes.position.count * 3); for (let j = 0; j < c.length; j += 3) { c[j] = .009; c[j + 1] = .008; c[j + 2] = .012; } if (!gg.attributes.color) gg.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
    const im = new THREE.InstancedMesh(gg, mat, per[i].length); per[i].forEach((mm, j) => im.setMatrixAt(j, mm)); im.computeBoundingSphere(); grp.add(im); });
  grp.userData = { kind, len };
  return grp;
}
