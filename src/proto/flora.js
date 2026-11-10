/* 부쉬 그룹 만들기 (2026-11-10 · 사용자: 고사리 수풀 + 나무 두 그루를 합쳐 부쉬 그룹 하나로)
   부쉬 비교 화면(bushlab.js)과 초원 섬(isle.js)이 같은 것을 씀 — 모양 · 칠 · 흔들림이 어디서나 똑같음
   단위는 m · 땅은 y=0 (섬에서는 gy로 그 자리 땅 높이를 더함)
   · 고사리 수풀: 바닥 모양(foot) 그대로 덮음 — 보이는 가장자리 = 숨는 경계 = 시야 가림 (판정은 바닥 모양 하나로만)
   · 나무: 꾸밈 — 멀리서도 숨을 곳이 보이게. 시야 · 숨기 판정에 넣지 않음
   · 밑동: 덤불 · 나무 둘레에 땅과 같은 풀과 들꽃 → 땅에서 솟아난 것처럼 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SUN = new THREE.Vector3(-.45, .78, .44).normalize();   /* 왼쪽 위 앞에서 (섬과 같은 해) */
export const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
export const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = t => Math.min(1, Math.max(0, t));

/* ── 칠: 잎 · 풀잎 · 나무껍질 (꼭짓점마다 색 · 흔들림 aS · 해를 등지면 비침 aTr · 빛남 aE · 덩어리 둥근 면 aD · 햇빛 받는 정도 aU)
   GL: 쓰는 쪽의 공통 칠(lit 포함) · finish: 마지막 색에 덧입힐 것(섬은 안개 · 시야 어둠) · uPush: 기체가 오르내릴 때 미는 바람(쓰는 쪽 단위) */
export function vegShader(GL, finish = 'c') { return {
  vertexShader: `attribute vec3 color, aD; attribute float aS, aTr, aE, aU; uniform float uT; uniform vec4 uPush; varying vec3 vC, vN, vP, vD, vL; varying float vTr, vE, vU;
    void main(){ vec3 p = position;
      { vec2 d = p.xz - uPush.xy; float r2 = dot(d, d), k = uPush.w * exp(-r2 / (uPush.z * uPush.z)); p.xz += d / sqrt(r2 + .5) * k * aS * .8; p.y -= k * aS * .3; }   /* 오르내리는 바람에 눌렸다 일어남 */
      vec4 w = modelMatrix * vec4(p, 1.); float ph = w.x * .7 + w.z * .4;
      w.xz += vec2(sin(uT * 1.4 + ph), cos(uT * 1.1 + ph * 1.3)) * .045 * aS + vec2(sin(uT * .6 + w.x * .25), 0.) * .06 * aS * aS;   /* 잔바람 + 큰 바람 물결 (가지는 천천히 크게) */
      w.xyz += vec3(sin(uT * 4.7 + w.y * 9. + w.x * 7.), sin(uT * 5.3 + w.z * 8.) * .6, cos(uT * 4.1 + w.x * 6. - w.y * 5.)) * .012 * aS * aTr;   /* 잎 뭉치마다 따로 살랑임 */
      vC = color; vN = normalize(mat3(modelMatrix) * normal); vD = aD; vU = aU; vP = w.xyz; vL = p; vTr = aTr; vE = aE; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GL + `varying vec3 vC, vN, vP, vD, vL; varying float vTr, vE, vU;
    void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; if (dot(vD, vD) > .01) n = normalize(mix(n, normalize(vD), .7));   /* 잎결 자글거림을 줄이고 큰 덩어리로 부드럽게 칠한 느낌 · 나무껍질은 제 면 그대로 */
      float up = vU; vec3 al = vC * mix(.78, 1.12, up) + vec3(.06, .07, .0) * up * up;                 /* 밑은 짙은 풀빛 · 위는 햇빛 받은 노란 연두 */
      vec3 c = lit(al, n, 1., mix(.7, 1., up));
      c += vC * vec3(1., 1.25, .55) * pow(max(0., dot(-n, uSun)), 1.5) * vTr * .7;                   /* 해를 등진 잎은 빛이 비쳐 보임 */
      c += vC * vE * (1.8 + .5 * sin(uT * 1.7 + vP.x * 3. + vP.z * 2.));
      gl_FragColor = vec4(${finish}, 1.); }` }; }

/* 조각 모으기: soft(p) = 그 자리의 둥근 면 방향 · 햇빛 받는 정도 / gy(x, z) = 땅 높이 */
export function Bag(soft, gy = () => 0) { const P = [], C = [], S = [], T = [], E = [], D = [], Uu = [], I = []; const B = {
  soft, gy,
  v(p, c, s, tr = 0, e = 0, sd = B.soft(p)) { P.push(p[0], p[1] + B.gy(p[0], p[2]), p[2]); C.push(...c); S.push(s); T.push(tr); E.push(e); D.push(sd[0], sd[1], sd[2]); Uu.push(sd[3]); return P.length / 3 - 1; },   /* 꼭짓점 하나 (나눠 쓰면 면이 매끈하게 이어짐) */
  idx(a, b, c) { I.push(a, b, c); },
  tri(a, b, c, ca, cb, cc, sa, sb, sc, tr = 0, e = 0) { I.push(B.v(a, ca, sa, tr, e), B.v(b, cb, sb, tr, e), B.v(c, cc, sc, tr, e)); },
  quad(a, b, c, d, ca, cb, cc, cd, sa, sb, sc, sd, tr = 0, e = 0) { const o = B.v(a, ca, sa, tr, e), o1 = B.v(b, cb, sb, tr, e), o2 = B.v(c, cc, sc, tr, e), o3 = B.v(d, cd, sd, tr, e); I.push(o, o1, o2, o, o2, o3); },
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aTr', new THREE.Float32BufferAttribute(T, 1)); g.setAttribute('aE', new THREE.Float32BufferAttribute(E, 1)); g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(Uu, 1)); g.setIndex(I); g.computeVertexNormals(); return g; } }; return B; }

/* 잎 하나 (끝이 뾰족한 타원 잎: 가운데 접혀 입체감) */
function leaf(B, r, c, nrm, size, col, sway, tr = .5) { const t = new THREE.Vector3().crossVectors(nrm, Math.abs(nrm.y) > .9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), b = new THREE.Vector3().crossVectors(nrm, t);
  const rot = r() * 6.283, d1 = t.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b, Math.sin(rot)), d2 = new THREE.Vector3().crossVectors(nrm, d1);
  const p0 = c.clone().addScaledVector(d1, -size * .5), p1 = c.clone().addScaledVector(d1, size * .55).addScaledVector(nrm, size * .12), m = c.clone().addScaledVector(nrm, size * .08);
  const l = c.clone().addScaledVector(d2, size * .3), rr = c.clone().addScaledVector(d2, -size * .3), dark = mul(col, .7);
  B.tri(p0.toArray(), l.toArray(), m.toArray(), dark, col, col, sway, sway, sway, tr); B.tri(l.toArray(), p1.toArray(), m.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr);
  B.tri(p0.toArray(), m.toArray(), rr.toArray(), dark, col, col, sway, sway, sway, tr); B.tri(m.toArray(), p1.toArray(), rr.toArray(), col, mul(col, 1.1), col, sway, sway, sway, tr); }

/* ── 고사리 수풀: 어른 키만 한 고사리 잎이 겹겹이 우산처럼 펼쳐짐 · 속은 어두운 덩이(잎 사이로 비쳐 보이지 않게) · 밑동에 풀과 들꽃 ──
   foot(x, z): 안쪽 + (대략 가장자리까지 거리 m) · box: [x0, z0, x1, z1] 바닥 모양을 감싸는 네모 · cx, cz: 덩이 가운데 · HB: 높이(1층 기체가 묻힘) */
export function fernBush({ foot, box, cx = 0, cz = 0, seed = 33, HB = 1.7, gy = () => 0 }) {
  const r = rngOf(seed), F0 = lin(0x5c8f2c), F1 = lin(0xa0c856), [x0, z0, x1, z1] = box;
  const soft = p => { const d = new THREE.Vector3((p[0] - cx) * .32, 1, (p[2] - cz) * .42).normalize(), u = clamp01((p[1] - .1) / (HB - .1)); return [d.x, d.y, d.z, sm(u)]; };   /* 덩이 전체의 둥근 면 · 위일수록 햇빛 */
  const B = Bag(soft, gy);
  /* 넓이에 맞춰 고사리 포기 수 (가장자리를 더 촘촘히 · 경계가 또렷하게) */
  let area = 0; for (let z = z0; z < z1; z += .25) for (let x = x0; x < x1; x += .25) if (foot(x, z) > 0) area += .0625;
  const crowns = []; for (let k = 0, n = Math.round(area * 1.3); crowns.length < n && k < n * 60; k++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), s = foot(x, z); if (s < .05) continue; if (s > .6 && r() < .3) continue; crowns.push([x, z]); }
  for (const [ccx, ccz] of crowns) { const nF = 9 + (r() * 4 | 0);
    for (let f = 0; f < nF; f++) { const a = f / nF * 6.283 + r() * .4, L = 1.1 + r() * .7, up = .9 + r() * .5, col = mix3(F0, F1, r() * .7), dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-dir.z, 0, dir.x);
      const at = t => new THREE.Vector3(ccx, .05, ccz).addScaledVector(dir, L * t).add(new THREE.Vector3(0, Math.sin(Math.min(1, t * 1.25) * 1.75) * up * (1 - t * .35), 0));   /* 솟았다 끝이 처지는 잎줄기 */
      for (let k = 0; k < 14; k++) { const t0 = k / 14, t1 = (k + 1) / 14, p0 = at(t0), p1 = at(t1), w = .26 * Math.sin(Math.min(1, t0 * 1.15) * Math.PI) * (1 - t0 * .25), sw = t0 * t0;
        B.quad(p0.clone().addScaledVector(side, -.012).toArray(), p0.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, .012).toArray(), p1.clone().addScaledVector(side, -.012).toArray(), mul(col, .5), mul(col, .5), mul(col, .55), mul(col, .55), sw, sw, sw, sw);
        for (const sd of [-1, 1]) { const tipP = p0.clone().lerp(p1, .5).addScaledVector(side, sd * w).addScaledVector(dir, w * .35).add(new THREE.Vector3(0, -w * .25, 0)), shade = .65 + .5 * t0;   /* 작은 잎(우상엽) 한 쌍 */
          B.tri(p0.toArray(), p1.toArray(), tipP.toArray(), mul(col, shade * .8), mul(col, shade * .9), mul(col, shade * 1.1), sw, sw, sw + .1, .9); } } } }
  /* 속 덩이: 경계 안쪽 칸만 (바닥에 네모 계단이 비치지 않게 · 가장자리는 잎이 덮음) */
  { const S = .12, inset = .45, hk = .5, col = lin(0x46702a), nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S), key = new Map();
    const h = (x, z) => { const s = foot(x, z) - inset; return s <= 0 ? .02 : .02 + HB * hk * Math.pow(Math.min(1, s / 1.0), .55) + .12 * fbm(x * 2.2, z * 2.2, 2) * Math.min(1, s * 3); };
    const vid = (i, j) => { const k = i + ',' + j; if (key.has(k)) return key.get(k); const x = x0 + i * S, z = z0 + j * S, d = clamp01((foot(x, z) - inset) / 1.2), id = B.v([x, h(x, z), z], mul(col, .45 + .55 * d), 0); key.set(k, id); return id; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S; if (Math.min(foot(x, z), foot(x + S, z), foot(x, z + S), foot(x + S, z + S)) - inset < 0) continue; B.idx(vid(i, j), vid(i, j + 1), vid(i + 1, j + 1)); B.idx(vid(i, j), vid(i + 1, j + 1), vid(i + 1, j)); } }
  skirt(B, r, foot, box, 900 * Math.max(.6, area / 12.5));
  return B.geo(); }

/* 밑동: 둘레에 땅과 같은 풀이 둘러 자라고 들꽃이 핌 (foot −0.45 ~ +0.3 사이) */
function skirt(B, r, foot, [x0, z0, x1, z1], count) { const GR0 = [.16, .36, .07], GR1 = [.40, .58, .12], FL = [[1.1, 1.05, .95], [1.1, .9, .3], [.85, .65, 1.1]], save = B.soft;
  B.soft = p => [0, 1, 0, clamp01(p[1] / .5) * .4];
  for (let k = 0, n = 0; k < count * 12 && n < count; k++) { const x = x0 - .5 + r() * (x1 - x0 + 1), z = z0 - .5 + r() * (z1 - z0 + 1), s = foot(x, z); if (s < -.45 || s > .3) continue; n++;
    const a = r() * 6.283, h = (.22 + r() * .28) * (1 - Math.max(0, -s) * 1.2), w = .03, lean = .12 + r() * .1, ox = Math.cos(a), oz = Math.sin(a), col = mix3(GR0, GR1, r()), tx = x + ox * lean * h, tz = z + oz * lean * h;
    B.tri([x - oz * w, 0, z + ox * w], [x + oz * w, 0, z - ox * w], [tx, h, tz], mul(col, .7), mul(col, .7), mul(col, 1.15), 0, 0, 1, .4);
    if (r() < .07) { const c = FL[(r() * 3) | 0], y = h + .02; for (let q = 0; q < 5; q++) { const an = q / 5 * 6.283;
      B.tri([tx, y, tz], [tx + Math.cos(an) * .04, y + .01, tz + Math.sin(an) * .04], [tx + Math.cos(an + 1.2) * .04, y + .01, tz + Math.sin(an + 1.2) * .04], c, c, c, 1, 1, 1, .2); } } }
  B.soft = save; }

/* ── 나무: 넓은 잎 나무 ──
   몸통 — 밑동이 넓게 퍼졌다가 위로 가늘어짐 · 껍질 골이 살짝 꼬여 올라감 · 해를 등진 아래쪽에 이끼
   뿌리 — 밑동에서 갈래 지어 땅을 움켜쥐듯 퍼지다 땅속으로
   가지 — 몸통 위에서 서너 갈래 → 두세 번 더 갈라짐 · 굵은 가지는 위로 휘고 잔가지 끝은 무게로 살짝 처짐
   잎 — 가지 끝과 갈림목마다 잎 뭉치 · 뭉치가 겹쳐 둥근 지붕 · 위는 햇빛 받은 노란 연두, 지붕 속은 그늘 · 속에 짙은 잎 한 겹(하늘이 숭숭 비치지 않게) */
const BARK0 = lin(0x3a2c20), BARK1 = lin(0x7d6a52), MOSS = lin(0x5d7a2c), TLF0 = lin(0x4c7c26), TLF1 = lin(0x9cc44c);
/* 굵기가 변하는 매끈한 관 (가지 · 몸통 · 뿌리) — 꼭짓점을 나눠 써서 둥글게 이어짐 */
function limb(B, pts, rad, sides, sway) {
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength(), segs = Math.max(4, Math.round(len / .18)), fr = curve.computeFrenetFrames(segs, false), rings = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs, c = curve.getPointAt(t), R = rad(t), ring = [], along = len * t;
    for (let k = 0; k < sides; k++) { const a = k / sides * 6.283, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a)), p = c.clone().addScaledVector(n, R);
      const tw = a + along * .55, ridge = fbm(Math.cos(tw) * 2.4 + 7, Math.sin(tw) * 2.4 + along * .7, 3);   /* 껍질 골: 둘레를 따라 촘촘 · 길이 따라 천천히 · 살짝 꼬임 */
      let col = mix3(BARK0, BARK1, clamp01(.5 + ridge * 1.1));
      const shadeSide = Math.max(0, -(n.x * SUN.x + n.z * SUN.z) / Math.hypot(SUN.x, SUN.z)), moss = shadeSide * Math.max(0, 1 - p.y / 1.4) * Math.max(0, .4 + fbm(p.x * 3, p.y * 3 + p.z * 2, 2));
      col = mix3(col, MOSS, Math.min(.85, moss * 1.3));                     /* 그늘 쪽 아래에 이끼 */
      col = mul(col, .55 + .45 * clamp01(p.y / .9));                        /* 땅 가까이는 어둡게 (풀 그늘 · 흙) */
      ring.push(B.v(p.toArray(), col, sway(t), 0, 0, [0, 0, 0, .45])); }
    rings.push(ring); }
  for (let i = 0; i < segs; i++) for (let k = 0; k < sides; k++) { const a = rings[i][k], b = rings[i][(k + 1) % sides], c = rings[i + 1][(k + 1) % sides], d = rings[i + 1][k]; B.idx(a, b, c); B.idx(a, c, d); }
  return { end: curve.getPointAt(1), dir: curve.getTangentAt(1) }; }
/* seed: 모양 · S: 크기 · (ox, oz): 자리 · gy: 밑동 땅 높이 (나무 전체를 그 높이에 세움) */
export function tree(seed, S = 1, ox = 0, oz = 0, gy = 0) { const r = rngOf(seed), B = Bag(() => [0, 0, 0, .45], () => gy), tips = [];
  const R0 = .24 * S, T = (2.3 + r() * .4) * S, la = r() * 6.283, lean = .3 * S;
  /* 몸통 */
  const tp = []; for (let q = 0; q <= 6; q++) { const t = q / 6; tp.push(new THREE.Vector3(ox + Math.cos(la) * lean * t * t + .06 * S * Math.sin(t * 7 + seed), T * t - .05, oz + Math.sin(la) * lean * t * t + .06 * S * Math.cos(t * 6 + seed))); }
  const trunkR = t => R0 * (1 - .42 * t) * (1 + .75 * Math.exp(-t * 10));
  const top = limb(B, tp, trunkR, 12, t => .02 * t);
  /* 뿌리: 밑동에서 갈래 지어 퍼지며 땅속으로 */
  const nR = 5 + (r() * 2 | 0); for (let k = 0; k < nR; k++) { const a = k / nR * 6.283 + r() * .5, ca = Math.cos(a), sa = Math.sin(a), L = (.75 + r() * .45) * S;
    limb(B, [new THREE.Vector3(ox + ca * R0 * .4, .42 * S, oz + sa * R0 * .4), new THREE.Vector3(ox + ca * (R0 + .12 * S), .2 * S, oz + sa * (R0 + .12 * S)), new THREE.Vector3(ox + ca * L * .6, .06, oz + sa * L * .6), new THREE.Vector3(ox + ca * L, -.08, oz + sa * L)],
      t => (.13 * S) * (1 - .8 * t) + .012, 7, () => 0); }
  /* 가지: 굵은 가지는 위로 휘고 · 잔가지 끝은 처짐 */
  const grow = (p, d, L, rad, depth) => { const pts = [p.clone()], q = p.clone(), dd = d.clone();
    for (let i = 0; i < 5; i++) { dd.y += depth < 2 ? .07 : -.06; dd.x += (r() - .5) * .18; dd.z += (r() - .5) * .18; dd.normalize(); q.addScaledVector(dd, L / 5); pts.push(q.clone()); }
    const sw0 = [.03, .1, .22][depth], sw1 = [.1, .22, .4][depth], end = rad * (depth === 2 ? .25 : .62);
    const g = limb(B, pts, t => rad + (end - rad) * t, [9, 7, 5][depth], t => sw0 + (sw1 - sw0) * t);
    if (depth === 2) { tips.push([g.end, g.dir, 1]); return; }
    if (depth === 1) tips.push([g.end, g.dir, .8]);   /* 갈라지는 자리에도 잎 뭉치 (지붕 속이 비지 않게) */
    const n = 2 + (r() < .45 ? 1 : 0); for (let c = 0; c < n; c++) { const ax = new THREE.Vector3().crossVectors(g.dir, new THREE.Vector3(r() - .5, r() - .5, r() - .5)).normalize(), nd = g.dir.clone().applyAxisAngle(ax, .45 + r() * .4).applyAxisAngle(g.dir, c / n * 6.283);
      grow(g.end, nd, L * (.62 + r() * .15), end * .85, depth + 1); }
    if (depth === 0 && r() < .7) { const sd = new THREE.Vector3(r() - .5, .25, r() - .5).normalize(); grow(pts[3], sd, L * .5, rad * .45, 2); } };   /* 가지 중간에서 옆으로 난 잔가지 */
  const nL = 3 + (r() < .5 ? 1 : 0), topR = trunkR(1);
  for (let k = 0; k < nL; k++) { const a = k / nL * 6.283 + r() * .6, e = (38 + r() * 17) * Math.PI / 180; grow(top.end, new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), (1.3 + r() * .5) * S, topR * .78, 0); }
  grow(top.end, new THREE.Vector3((r() - .5) * .3, 1, (r() - .5) * .3).normalize(), 1.2 * S, topR * .7, 1);   /* 위로 곧게 이어지는 줄기 */
  /* 잎 지붕: 가지 끝 잎 뭉치들의 둘레 */
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = new THREE.Vector3(-1e9, -1e9, -1e9); for (const [p] of tips) { lo.min(p); hi.max(p); }
  const cc = lo.clone().add(hi).multiplyScalar(.5), cr = hi.clone().sub(lo).multiplyScalar(.5).addScalar(.65 * S);
  B.soft = p => { const v = new THREE.Vector3(p[0] - cc.x, p[1] - cc.y, p[2] - cc.z).divide(cr), u = clamp01((v.y + .9) / 1.8); v.normalize(); return [v.x, v.y, v.z, sm(u)]; };   /* 지붕 전체를 큰 덩어리로 · 위일수록 햇빛 */
  for (const [p, d, sz] of tips) { const c = p.clone().addScaledVector(d, .12 * S).add(new THREE.Vector3(0, .12 * S, 0)), R = (.5 + r() * .22) * S * sz, col0 = mix3(TLF0, TLF1, r() * .55);
    for (let k = 0; k < 125; k++) { const u = r() * 2 - 1, a = r() * 6.283, sq = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(sq * Math.cos(a), u * .85 + .1, sq * Math.sin(a)).normalize(); if (nrm.y < -.55 && r() < .6) continue;
      const lp = c.clone().add(new THREE.Vector3(nrm.x * R, nrm.y * R * .78, nrm.z * R).multiplyScalar(.85 + r() * .25)), occ = Math.min(1, Math.max(.25, lp.clone().sub(cc).divide(cr).length()));   /* 지붕 속일수록 그늘 */
      leaf(B, r, lp, nrm, (.16 + r() * .05) * S, mul(col0, (.5 + .5 * occ) * (.95 + r() * .1)), .45 + .3 * occ, .55); }
    for (let k = 0; k < 34; k++) { const u = r() * 2 - 1, a = r() * 6.283, sq = Math.sqrt(1 - u * u), nrm = new THREE.Vector3(sq * Math.cos(a), u, sq * Math.sin(a));   /* 속 잎: 짙은 한 겹 */
      leaf(B, r, c.clone().addScaledVector(nrm, R * .5), nrm, .2 * S, mul(col0, .42), .35, .2); } }
  return { geo: B.geo(), height: hi.y + .7 * S, canopy: { x: cc.x, y: cc.y, z: cc.z, rx: cr.x, rz: cr.z }, trunk: { x: ox, z: oz, h: T, w: R0 * 2.2 } }; }

/* 나무 혼자 서 있을 때 밑동 둘레 풀 · 들꽃 */
export function treeSkirt(seed, S, ox, oz, gy = () => 0) { const r = rngOf(seed), B = Bag(() => [0, 1, 0, 0], gy); skirt(B, r, (x, z) => .5 * S - Math.hypot(x - ox, z - oz), [ox - 1, oz - 1, ox + 1, oz + 1], 450); return B.geo(); }

/* 부쉬 그룹 하나: 고사리 수풀 + 나무 두 그루 (사용자 2026-11-10: 두 그루) — 나무 자리는 덩이 안쪽에서 서로 떨어지게 · 크기는 하나 크게 하나 작게
   돌려줌: geo(한 번에 그림) · trees(땅 그늘 굽기용 지붕 · 몸통 자리) · top(가장 높은 곳) */
export function bushGroup({ foot, box, cx, cz, seed, HB = 1.7, gy = () => 0, trees = 2 }) {
  const r = rngOf(seed * 7 + 3), parts = [fernBush({ foot, box, cx, cz, seed, HB, gy })], T = [], spots = [];
  const [x0, z0, x1, z1] = box;
  for (let k = 0; k < 6000 && spots.length < trees; k++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), gap = 2.6 - k / 6000 * 1.2; if (foot(x, z) < .6) continue; if (spots.some(([a, b]) => Math.hypot(a - x, b - z) < gap)) continue; spots.push([x, z]); }   /* 처음엔 멀리 떨어진 자리를 찾다가 못 찾으면 조금씩 좁힘 */
  spots.forEach(([x, z], k) => { const S = k === 0 ? .95 + r() * .12 : .74 + r() * .12, t = tree(seed * 13 + k * 101, S, x, z, gy(x, z)); parts.push(t.geo); T.push(t); });
  return { geo: mergeGeometries(parts), trees: T, top: Math.max(HB, ...T.map(t => t.height)) }; }
