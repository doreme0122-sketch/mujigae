/* 빙하 얼음 벽 토막 — 사용자 참고 그림(2026-11-04)대로
   ① 세로로 깎인 절벽: 얼음 기둥(5~7각) 다발이 세 줄로 붙어 섬 — 기둥마다 높이가 달라 세로 결이 생김 (뒷줄 높고 앞줄 낮음)
   ② 꼭대기는 평평한 단: 기둥 윗면이 높이 단계로 맞춰져 계단처럼 층짐 · 그 위에 두툼한 눈 덮개(가장자리가 살짝 넘쳐 흘러내림)
   ③ 고드름: 윗단 가장자리에서 촘촘히 늘어짐(길이 들쭉날쭉)
   ④ 속에서 빛나는 금: 얼음 속 갈라진 금이 늘 푸르게 빛남(겉보다 속이 밝음) — 맞으면 원래처럼 더 깨어남
   ⑤ 뾰족한 결정은 토막마다 한두 개만 윗단 위로
   ⑥ 넓은 밑동: 기둥 아래가 바깥으로 퍼지고, 눈 자락이 땅으로 흘러내리고, 떨어진 얼음 바위가 굴러 있음
   토막 끝은 낮아지고 눈 자락이 이어져 다음 토막과 깊게 겹침 → 이음이 기둥 사이 틈처럼 보임
   종류: low · high · door(+x 끝이 가장 높이 솟아 절벽) · doorL(-x 끝)
   무게: 토막마다 얼음 한 묶음 + 눈 한 묶음 (같은 모양은 InstancedMesh로) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { iceMaterial, block } from './ice.js';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };

export const ICE_MOD = { L: 10, W: 5 };
const only = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; };
const clean = g => { const n = only(g); n.computeVertexNormals(); return n; };

/* 얼음 기둥 하나: 아래가 퍼진 각기둥 · 옆면은 세로로 길게 저민 면 · 윗면은 살짝 기운 평면 */
function column(R, x, z, r, h, tilt) {
  const n = 5 + Math.floor(R() * 3), rings = [[-.3, 1.45], [h * .18, 1.12], [h * .55, 1], [h, .96]], P = [], I = [];
  const rad = []; for (let k = 0; k < n; k++) rad.push(r * (.75 + R() * .5));
  const a0 = R() * 6.28, tx = (R() - .5) * tilt, tz = (R() - .5) * tilt;
  rings.forEach(([y, s], ri) => { for (let k = 0; k < n; k++) { const a = a0 + k / n * 6.283, rr = rad[k] * s * (ri === 3 ? 1 : 1 + (R() - .5) * .08);
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; P.push(px, y + (ri === 3 ? (px - x) * tx + (pz - z) * tz : 0), pz); } });
  for (let ri = 0; ri < 3; ri++) for (let k = 0; k < n; k++) { const a = ri * n + k, b = ri * n + (k + 1) % n, c = a + n, d = b + n; I.push(a, c, b, b, c, d); }   /* 바깥을 보는 면 */
  const top = P.length / 3; P.push(x, h, z); for (let k = 0; k < n; k++) I.push(3 * n + k, top, 3 * n + (k + 1) % n);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const topRing = []; for (let k = 0; k < n; k++) topRing.push([P[(3 * n + k) * 3], P[(3 * n + k) * 3 + 1], P[(3 * n + k) * 3 + 2]]);
  return { g: clean(g), topRing, x, z, h };
}
/* 눈 덮개: 기둥 윗면보다 조금 넓고, 가운데가 도톰, 가장자리가 흘러내림 */
function snowCap(R, c) { const n = c.topRing.length, P = [], I = [], cx = c.x, cz = c.z;
  const rings = [[1.07, -.14], [1.05, .04], [.8, .13 + R() * .07], [.42, .19 + R() * .08]];
  rings.forEach(([s, dy]) => c.topRing.forEach(([x, y, z]) => { const w = (vn(x * 2.1, dy * 9, z * 2.1) - .5) * .1; P.push(cx + (x - cx) * s, y + dy + w, cz + (z - cz) * s); }));
  for (let ri = 0; ri < 3; ri++) for (let k = 0; k < n; k++) { const a = ri * n + k, b = ri * n + (k + 1) % n; I.push(a, a + n, b, b, a + n, b + n); }
  const t = P.length / 3; P.push(cx, c.h + .23 + R() * .07, cz); for (let k = 0; k < n; k++) I.push(3 * n + k, t, 3 * n + (k + 1) % n);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 고드름: 아래로 뾰족 */
function icicle(x, y, z, len, r) { const g = new THREE.ConeGeometry(r, len, 5, 1); g.rotateX(Math.PI); g.translate(x, y - len / 2, z); return clean(g); }

export function iceModule(kind = 'low', seed = 1) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const L = ICE_MOD.L, Hm = kind === 'low' ? 3.6 : 5, STEP = .55, o = seed * 1.7, dsgn = kind === 'doorL' ? -1 : 1, isDoor = kind === 'door' || kind === 'doorL';
  const prof = x => { const ax = Math.abs(x / (L * .5)); let e = 1 - Math.pow(Math.min(1, ax), 3) * .65;   /* 끝으로 갈수록 낮아짐 */
    if (isDoor && x * dsgn > 0) e = Math.max(e, 1 + Math.exp(-Math.pow((x * dsgn - L * .36) / 1.6, 2)) * .55);
    return Hm * e * (1 + .14 * Math.sin(x * .7 + o) + .07 * Math.sin(x * 1.9 + o * 2)); };
  const ice = [], snow = [], cols = [];
  /* ① 기둥 다발: 뒷줄(z+) 높게 · 가운데 · 앞줄(z-) 낮게 */
  for (const [zr, hk, rr] of [[1.25, 1, 1.05], [0, .82, 1.1], [-1.35, .55, .95]]) {
    for (let x = -L * .5 + .3 + R() * .4; x < L * .5 - .2; x += .95 + R() * .5) {
      const h0 = prof(x) * hk * (.85 + R() * .3), h = Math.max(.6, Math.round(h0 / STEP) * STEP + (R() - .5) * .08);   /* 단 높이로 맞춤 → 계단처럼 층 */
      const c = column(R, x + (R() - .5) * .3, zr + (R() - .5) * .45, (.62 + R() * .38) * rr, h, .1); cols.push(c); ice.push(c.g); } }
  /* ② 눈 덮개 · ③ 고드름 */
  for (const c of cols) { snow.push(snowCap(R, c));
    for (const [x, y, z] of c.topRing) { if (R() < .45) continue; const dz = z - c.z, dx = x - c.x, out = Math.hypot(dx, dz) || 1;
      const ix = c.x + dx / out * (out + .02), iz = c.z + dz / out * (out + .02), len = .35 + R() * R() * 1.5;
      ice.push(icicle(ix, y - .06, iz, len, .07 + R() * .08));
      if (R() < .5) ice.push(icicle(ix + (R() - .5) * .25, y - .06, iz + (R() - .5) * .25, len * .55, .05 + R() * .04)); } }
  /* ⑤ 뾰족한 결정 한두 개 */
  const tall = cols.filter(c => c.z > .6).sort((a, b) => b.h - a.h);
  for (let i = 0; i < (kind === 'low' ? 1 : 2) && i < tall.length; i++) { const c = tall[i * 2] || tall[i], hh = 1.6 + R() * 1.6;
    const g = new THREE.ConeGeometry(.38 + R() * .2, hh, 5, 1); g.rotateY(R() * 6); g.rotateZ((R() - .5) * .35); g.rotateX((R() - .5) * .25); g.translate(c.x, c.h + .2 + hh / 2, c.z); ice.push(clean(g)); }
  /* ⑥ 떨어진 얼음 바위 (발치) */
  for (let i = 0; i < 6; i++) { const g = only(block(seed * 7 + i).clone()), s = .45 + R() * .7;
    g.scale(s, s * (.7 + R() * .4), s); g.rotateY(R() * 6); g.translate((R() - .5) * L * .95, s * .15, (R() < .5 ? -1 : 1) * (2.3 + R() * .9)); ice.push(g); }
  /* 눈 자락: 기둥 발치를 감싸 땅으로 흘러내림 (넓은 밑동) */
  { const NX = 26, NZ = 10, P = [], I = [];
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const x = (i / NX - .5) * (L + 2.2), z = (j / NZ - .5) * 6.4, ex = Math.max(0, 1 - Math.pow(Math.abs(x) / (L * .5 + 1.1), 4));
      const zz = Math.abs(z) / (3.2 * (.7 + .5 * vn(x * .35 + o, 1, z > 0 ? 2 : 5))), h = (j === 0 || j === NZ || i === 0 || i === NX) ? -.05 : Math.max(-.05, (1 - zz * zz) * .55 * ex * (.7 + .5 * vn(x * .7 + o, 0, z * .7)) + vn(x * 2.3, 3, z * 2.3) * .1 - .12);   /* 가장자리가 들쭉날쭉한 낮은 자락 */
      P.push(x, h, z + (vn(x * .4, 7, o) - .5) * .5); }
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; I.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); snow.push(g); }
  const iceG = mergeGeometries(ice.map(only)); iceG.computeBoundingBox();
  const snowG = mergeGeometries(snow.map(only));
  return { ice: iceG, snow: snowG };
}

/* 얼음 재질 + 속에서 늘 빛나는 금 (승인된 얼음 재질에 덧붙임) */
export function iceWallMaterial(uT) {
  const m = iceMaterial(uT), prev = m.onBeforeCompile;
  m.onBeforeCompile = sh => { prev(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
      { vec3 q=vIw*vec3(.55,.32,.55); float c1=abs(inz(q)-.5), c2=abs(inz(q*2.3+7.)-.5);
        float crack=smoothstep(.035,.0,c1)*.9+smoothstep(.025,.0,c2)*.5;                       /* 속 갈라진 금 */
        float deep=smoothstep(3.5,.2,vIw.y)*.25;                                                 /* 아래쪽 속이 더 푸르게 */
        float ndv=abs(dot(normal,normalize(vViewPosition)));
        totalEmissiveRadiance+=vec3(.12,.5,1.)*(crack*.9+deep*.45)*(.45+.55*ndv); }`);
  };
  m.customProgramCacheKey = () => 'ice-wall-glow';
  return m;
}
export function snowMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x8ea3ba, roughness: .9, metalness: 0, envMapIntensity: .35, emissive: 0x060d18, emissiveIntensity: .5 });
}

/* 벽: 길 전체를 따라 한 장으로 뽑아낸 절벽 (토막·기둥을 잇지 않음 → 벽 한 줄 = 한 덩어리)
   단면(앞 → 위 → 뒤): 발치 자락 → 가파른 아래 절벽 → 수직 절벽 → 윗단 앞 모서리 → 윗단 가운데(살짝 도톰) → 윗단 뒤 모서리 → 뒤 절벽 → 뒤 발치
   · 세로 결: 앞·뒤 면이 길을 따라 깊이가 달라짐(세로로 길게 팬 홈과 튀어나온 등) — 높이 내내 같은 깊이라 세로 줄로 읽힘
   · 계단 윗단: 윗단 높이가 구간마다 한 단씩 달라짐 → 단 사이에 작은 절벽
   · 문 쪽 끝: 가장 높이 솟았다가 수직으로 끊김(끝 면을 막음) */
export function makeIceWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || iceWallMaterial(uT), smat = opt.smat || snowMaterial(), doors = opt.doors || [true, true];
  const seed = opt.seed || 3, R = (() => { let s = seed * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), o = seed * 1.3;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const Hm = opt.H || 4.6, W = 2.4, STEP = .6, DS = .32, N = Math.max(4, Math.round(len / DS));
  /* 윗단: 구간(2.5~5m)마다 높이 한 단씩 */
  const seg = []; for (let d = 0; d < len;) { const L2 = 2.5 + R() * 2.5; seg.push([d, d + L2, (R() - .5) * 2.4]); d += L2; }
  const topH = d => { const sgi = seg.find(q => d >= q[0] && d < q[1]) || seg[seg.length - 1];
    let h = Hm * (1 + .16 * Math.sin(d * .11 + o)) + sgi[2] * STEP;
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, dd = Math.min(ds, de); h += Math.exp(-dd * dd / 10) * Hm * .55;   /* 문 양옆 가장 높이 */
    if (!doors[0] && d < 2.5) h *= .45 + .55 * d / 2.5; if (!doors[1] && len - d < 2.5) h *= .45 + .55 * (len - d) / 2.5;
    return Math.round(h / STEP) * STEP; };
  const flute = (d, side) => { const a = vn(d * .9 + side * 17 + o, 0, 0), b = vn(d * 2.6 + side * 31, 3, 0); return (a - .5) * .9 + (b - .5) * .35 + Math.abs(Math.sin(d * 3.1 + side * 2 + o * 3)) * .18; };   /* 세로 결 깊이 */
  const p = new THREE.Vector3(), tg = new THREE.Vector3(), frames = [];
  for (let i = 0; i <= N; i++) { const d = i / N * len; curve.getPointAt(i / N, p); curve.getTangentAt(i / N, tg); let nx = -tg.z, nz = tg.x; const sg = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sg; nz *= sg;
    frames.push({ d, x: p.x, z: p.z, nx, nz, tx: tg.x, tz: tg.z, h: topH(d), sg }); }
  const FL = frames[0].sg < 0;   /* 바깥 방향을 뒤집었으면 면 순서도 뒤집음 (안 그러면 면이 안쪽을 봐 속이 비어 보임) */
  /* 단면 점: (v 바깥 방향 거리, y) — 앞(땅 쪽, v<0) … 뒤(우주 쪽, v>0) */
  const section = f => { const h = f.h, fr = flute(f.d, 0), bk = flute(f.d, 1), lean = .12 * Math.sin(f.d * .21 + o);
    return [[-W - 1.4, -.3], [-W - .55 + fr * .3, .7], [-W + fr, Math.min(h * .4, 1.8)], [-W + fr * .9 + lean, h - .35], [-W + .25 + fr * .6, h],
      [0, h + .12 + vn(f.d * .5, 9, o) * .2], [W - .3 + bk * .6, h + .05], [W + bk * .9 + lean, h - .4], [W + bk, Math.min(h * .4, 1.8)], [W + .6 + bk * .3, .7], [W + 1.5, -.3]]; };
  const P = [], put = (f, v, y) => P.push(f.x + f.nx * v, y, f.z + f.nz * v);
  const S0 = frames.map(section), M = S0[0].length;
  const tri = (a, b, c) => { FL ? P.push(...a, ...c, ...b) : P.push(...a, ...b, ...c); };
  const pt = (i, k) => { const f = frames[i], [v, y] = S0[i][k]; return [f.x + f.nx * v, y, f.z + f.nz * v]; };
  for (let i = 0; i < N; i++) for (let k = 0; k < M - 1; k++) { const a = pt(i, k), b = pt(i + 1, k), c = pt(i, k + 1), d = pt(i + 1, k + 1); tri(a, c, b); tri(b, c, d); }
  /* 끝 면 막기 (문 쪽은 수직 절벽) */
  for (const i of [0, N]) { const c = [frames[i].x, frames[i].h * .5, frames[i].z]; for (let k = 0; k < M - 1; k++) { const a = pt(i, k), b = pt(i, k + 1); i === 0 ? tri(a, c, b) : tri(a, b, c); } }
  const ice = []; { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); ice.push(g); }
  const snow = [];
  /* 눈 덮개: 윗단 위에 도톰하게, 앞뒤 모서리를 조금 넘쳐 흘러내림 */
  { const Q = [], sp = (i, k) => { const f = frames[i], s = S0[i]; const sec = [[s[3][0] - .12, s[3][1] - .18], [s[4][0] - .1, f.h + .08], [s[4][0] + .4, f.h + .26 + vn(f.d * 1.3, 2, o) * .14], [0, s[5][1] + .22], [s[6][0] - .4, f.h + .24 + vn(f.d * 1.3, 5, o) * .14], [s[6][0] + .1, f.h + .06], [s[7][0] + .12, s[7][1] - .2]][k]; return [f.x + f.nx * sec[0], sec[1], f.z + f.nz * sec[0]]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 6; k++) { const a = sp(i, k), b = sp(i + 1, k), c = sp(i, k + 1), d = sp(i + 1, k + 1); FL ? Q.push(...a, ...b, ...c, ...b, ...d, ...c) : Q.push(...a, ...c, ...b, ...b, ...c, ...d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.computeVertexNormals(); snow.push(g); }
  /* 고드름: 윗단 앞·뒤 모서리를 따라 촘촘히 (길이 들쭉날쭉) */
  for (let i = 0; i <= N; i += 1) for (const side of [-1, 1]) { if (R() < .35) continue; const f = frames[i], s = S0[i][side < 0 ? 3 : 7];
    const len2 = .3 + R() * R() * 1.7, v = s[0] + side * .1, y = s[1] - .05; ice.push(icicle(f.x + f.nx * v + f.tx * (R() - .5) * .2, y, f.z + f.nz * v + f.tz * (R() - .5) * .2, len2, .06 + R() * .07)); }
  /* 뾰족한 결정: 길이 8~12m마다 하나 (윗단 뒤쪽에서) */
  for (let d = 4 + R() * 4; d < len - 2; d += 8 + R() * 5) { const i = Math.round(d / len * N), f = frames[i], hh = 1.6 + R() * 1.8;
    const g = new THREE.ConeGeometry(.4 + R() * .2, hh, 5, 1); g.rotateY(R() * 6); g.rotateZ((R() - .5) * .35); g.rotateX((R() - .5) * .3); g.translate(f.x + f.nx * .8, f.h + hh / 2, f.z + f.nz * .8); ice.push(clean(g)); }
  /* 떨어진 얼음 바위 (앞·뒤 발치) */
  for (let d = 1 + R() * 2; d < len - 1; d += 2.2 + R() * 3) { const i = Math.round(d / len * N), f = frames[i], side = R() < .5 ? -1 : 1, sc = .4 + R() * .65, g = only(block(seed * 13 + Math.floor(d)).clone());
    g.scale(sc, sc * (.7 + R() * .4), sc); g.rotateY(R() * 6); const v = side * (W + 1.4 + R() * 1.1); g.translate(f.x + f.nx * v, sc * .12, f.z + f.nz * v); ice.push(g); }
  /* 눈 자락: 발치를 따라 들쭉날쭉 (양쪽) */
  { const Q = []; const sk = (i, k, side) => { const f = frames[i], w = (vn(f.d * .4 + side * 9, 1, o) * 1.6 + .8), vv = [W + .6, W + 1.3 + w * .5, W + 1.6 + w][k] * side, y = [.55 + vn(f.d, 4, o) * .3, .25, -.06][k]; return [f.x + f.nx * vv, y, f.z + f.nz * vv]; };
    for (const side of [-1, 1]) for (let i = 0; i < N; i++) for (let k = 0; k < 2; k++) { const a = sk(i, k, side), b = sk(i + 1, k, side), c = sk(i, k + 1, side), d = sk(i + 1, k + 1, side);
      if ((side < 0) !== FL) Q.push(...a, ...c, ...b, ...b, ...c, ...d); else Q.push(...a, ...b, ...c, ...b, ...d, ...c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.computeVertexNormals(); snow.push(g); }
  const iceG = mergeGeometries(ice.map(only)), snowG = mergeGeometries(snow.map(only));
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(iceG, mat), new THREE.Mesh(snowG, smat));
  grp.userData = { mat, smat, len };
  return grp;
}
