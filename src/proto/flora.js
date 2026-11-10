/* 부쉬 만들기 (2026-11-10 · 사용자: 갈대로 · 잎을 넓게 하고 더 줄여 · 부쉬에 들어가도 잎이 반응 안 하게)
   부쉬 보기 화면(bushlab.js)과 초원 섬(isle.js)이 같은 것을 씀 — 모양 · 칠 · 흔들림이 어디서나 똑같음
   단위는 m · 땅은 y=0 (섬에서는 gy로 그 자리 땅 높이를 더함)
   · 갈대 부쉬: 넓은 갈대 잎 열두 장쯤이 한 포기로 모여 나고, 포기 70개쯤이 바닥 모양(foot) 안을 채움 — 보이는 가장자리 = 숨는 경계 = 시야 가림
   · 금빛 이삭은 일부 포기에만 · 속은 어두운 덩이(포기 틈으로 숨은 기체가 비치지 않게) · 밑동 둘레에 땅과 같은 풀과 들꽃
   · 기체가 들어가거나 층을 오르내려도 잎은 밀리지 않음 — 자연 바람에만 살랑임 */
import * as THREE from 'three';

export const SUN = new THREE.Vector3(-.45, .78, .44).normalize();   /* 왼쪽 위 앞에서 (섬과 같은 해) */
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const lin = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const hash2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const noise2 = (x, z) => { const i = Math.floor(x), j = Math.floor(z), u = sm(x - i), v = sm(z - j), a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1); return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1; };
const fbm = (x, z, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise2(x * f + k * 17.3, z * f - k * 9.1); f *= 2.03; a *= .5; } return s; };
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = t => Math.min(1, Math.max(0, t));

/* ── 칠: 갈대 잎 · 이삭 · 풀잎 (꼭짓점마다 색 · 흔들림 aS · 해를 등지면 비침 aTr · 덩어리 둥근 면 aD · 햇빛 받는 정도 aU)
   GL: 쓰는 쪽의 공통 칠(lit 포함) · finish: 마지막 색에 덧입힐 것(섬은 안개 · 시야 어둠) */
export function vegShader(GL, finish = 'c') { return {
  vertexShader: `attribute vec3 color, aD; attribute float aS, aTr, aU; uniform float uT; varying vec3 vC, vN, vP, vD, vL; varying float vTr, vU;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.); float ph = w.x * .7 + w.z * .4;
      w.xz += vec2(sin(uT * 1.4 + ph), cos(uT * 1.1 + ph * 1.3)) * .045 * aS + vec2(sin(uT * .6 + w.x * .25), 0.) * .06 * aS * aS;   /* 잔바람 + 큰 바람 물결 (끝으로 갈수록 크게) */
      vC = color; vN = normalize(mat3(modelMatrix) * normal); vD = aD; vU = aU; vP = w.xyz; vL = position; vTr = aTr; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: GL + `varying vec3 vC, vN, vP, vD, vL; varying float vTr, vU;
    void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; if (dot(vD, vD) > .01) n = normalize(mix(n, normalize(vD), .6));   /* 잎결 자글거림을 줄이고 큰 덩어리로 부드럽게 칠한 느낌 */
      float up = vU; vec3 al = vC * mix(.78, 1.12, up) + vec3(.06, .07, .0) * up * up;                 /* 밑은 짙은 풀빛 · 위는 햇빛 받은 노란 연두 */
      vec3 c = lit(al, n, 1., mix(.7, 1., up));
      c += vC * vec3(1., 1.2, .6) * pow(max(0., dot(-n, uSun)), 1.5) * vTr * .7;                     /* 해를 등진 잎 · 이삭은 빛이 비쳐 보임 */
      gl_FragColor = vec4(${finish}, 1.); }` }; }

/* 조각 모으기: soft(p) = 그 자리의 둥근 면 방향 · 햇빛 받는 정도 / gy(x, z) = 땅 높이 */
function Bag(soft, gy) { const P = [], C = [], S = [], T = [], D = [], Uu = [], I = []; const B = {
  soft,
  v(p, c, s, tr = 0, sd = B.soft(p)) { P.push(p[0], p[1] + gy(p[0], p[2]), p[2]); C.push(...c); S.push(s); T.push(tr); D.push(sd[0], sd[1], sd[2]); Uu.push(sd[3]); return P.length / 3 - 1; },   /* 꼭짓점 하나 (나눠 쓰면 면이 매끈하게 이어짐) */
  idx(a, b, c) { I.push(a, b, c); },
  tri(a, b, c, ca, cb, cc, sa, sb, sc, tr = 0) { I.push(B.v(a, ca, sa, tr), B.v(b, cb, sb, tr), B.v(c, cc, sc, tr)); },
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aTr', new THREE.Float32BufferAttribute(T, 1)); g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(Uu, 1)); g.setIndex(I); g.computeVertexNormals(); return g; } }; return B; }

/* ── 갈대 부쉬 ──
   foot(x, z): 안쪽 + (대략 가장자리까지 거리 m) · box: [x0, z0, x1, z1] 바닥 모양을 감싸는 네모 · cx, cz: 덩이 가운데 · HB: 높이(1층 기체가 묻힘)
   돌려줌: geo(한 번에 그림) · top(가장 높은 곳) · tris */
export function reedBush({ foot, box, cx = 0, cz = 0, seed = 11, HB = 1.7, gy = () => 0 }) {
  const r = rngOf(seed), [x0, z0, x1, z1] = box, G0 = lin(0x5a8a2a), G1 = lin(0x9cbf4a), GOLD = lin(0xd8c46a), PLUME = lin(0xc9b48a);
  const soft = p => { const d = new THREE.Vector3((p[0] - cx) * .32, 1, (p[2] - cz) * .42).normalize(), u = clamp01((p[1] - .1) / (HB - .1)); return [d.x, d.y, d.z, sm(u)]; };   /* 덩이 전체의 둥근 면 · 위일수록 햇빛 */
  const B = Bag(soft, gy);
  const dome = (x, z) => { const s = foot(x, z); return s <= 0 ? 0 : HB * Math.pow(Math.min(1, s / 1.1), .5) * (.9 + .1 * fbm(x * 1.3 + 5, z * 1.3, 2)); };   /* 가장자리에서 둥글게 솟아 가운데가 가장 높음 */
  const outward = (x, z) => { const gx = foot(x + .05, z) - foot(x - .05, z), gz = foot(x, z + .05) - foot(x, z - .05), l = Math.hypot(gx, gz) || 1; return [-gx / l, -gz / l]; };
  /* 포기 자리: 넓이에 맞춰 (가장자리를 더 촘촘히 · 경계가 또렷하게) · 서로 너무 붙지 않게 */
  let area = 0; for (let z = z0; z < z1; z += .25) for (let x = x0; x < x1; x += .25) if (foot(x, z) > 0) area += .0625;
  const want = Math.round(area * 5.6), clumps = [];
  for (let k = 0; clumps.length < want && k < want * 80; k++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), s = foot(x, z); if (s < .12) continue; if (s > .7 && r() < .45) continue;
    if (clumps.some(c => (c[0] - x) ** 2 + (c[1] - z) ** 2 < .09)) continue; clumps.push([x, z, s]); }
  /* 갈대 잎 한 장: 가운데 잎맥이 살짝 솟아 접힌 넓은 잎 · 위로 솟다가 끝이 바깥으로 휘어 늘어짐 · 끝으로 갈수록 뾰족 */
  const blade = (bx, bz, dirX, dirZ, H, W, col, tip) => { const SEG = 5, sx = -dirZ, sz = dirX, rows = [];
    for (let i = 0; i <= SEG; i++) { const f = i / SEG, bend = f * f * f, y = H * (f - .18 * bend), px = bx + dirX * H * (.16 * f * f + .3 * bend), pz = bz + dirZ * H * (.16 * f * f + .3 * bend);
      const w = W * (1 - Math.pow(f, 1.6) * .94), fold = W * .35 * (1 - f), c = mix3(mul(col, .55 + .45 * f), GOLD, Math.max(0, f - .6) * 2.2 * tip), sway = f * f;
      rows.push([B.v([px - sx * w, y - fold * .4, pz - sz * w], mul(c, .82), sway, .6), B.v([px, y + fold * .25, pz], c, sway, .6), B.v([px + sx * w, y - fold * .4, pz + sz * w], mul(c, .9), sway, .6)]); }
    for (let i = 0; i < SEG; i++) { const [a0, m0, b0] = rows[i], [a1, m1, b1] = rows[i + 1]; B.idx(a0, m0, m1); B.idx(a0, m1, a1); B.idx(m0, b0, b1); B.idx(m0, b1, m1); } };
  /* 이삭: 잎보다 조금 높이 올라온 가는 줄기 끝에 깃털처럼 늘어진 금빛 이삭 */
  const plume = (bx, bz, dirX, dirZ, H) => { const top = [bx + dirX * H * .22, H, bz + dirZ * H * .22], mid = [bx + dirX * H * .08, H * .55, bz + dirZ * H * .08], sx = -dirZ * .008, sz = dirX * .008, STEM = lin(0x8a8a4a);
    const s0 = B.v([bx - sx, 0, bz - sz], STEM, 0), s1 = B.v([bx + sx, 0, bz + sz], STEM, 0), s2 = B.v([mid[0] + sx, mid[1], mid[2] + sz], STEM, .3), s3 = B.v([mid[0] - sx, mid[1], mid[2] - sz], STEM, .3), s4 = B.v([top[0], top[1], top[2]], STEM, 1);
    B.idx(s0, s1, s2); B.idx(s0, s2, s3); B.idx(s3, s2, s4);
    for (let q = 0; q < 20; q++) { const f = q / 20, a = r() * 6.283, L = .16 + .14 * Math.sin(f * Math.PI), hx = top[0] - dirX * .32 * f, hz = top[2] - dirZ * .32 * f, hy = top[1] - .3 * f * f + .02;   /* 끝에서 바깥으로 휘어 늘어진 이삭 다발 */
      const ex = hx + Math.cos(a) * L * .45 + dirX * L * .4, ez = hz + Math.sin(a) * L * .45 + dirZ * L * .4, ey = hy - L * .5, c = mul(PLUME, .8 + .35 * r());
      B.tri([hx - .02, hy, hz], [hx + .02, hy, hz + .02], [ex, ey, ez], mul(c, .85), c, mul(c, 1.15), 1, 1, 1.1, .9); } };
  let top = HB;
  for (const [x, z, s] of clumps) { const nB = 10 + (r() * 5 | 0), Hc = (dome(x, z) + .3) * (.88 + r() * .24), [ox, oz] = outward(x, z), edge = 1 - Math.min(1, s / .9), col0 = mix3(G0, G1, r() * .6), tip = r() < .5 ? .5 + r() * .5 : 0;
    for (let b = 0; b < nB; b++) { const a = b / nB * 6.283 + r() * .5, lean = .35 + edge * .6, dx = Math.cos(a) + ox * lean * 1.4, dz = Math.sin(a) + oz * lean * 1.4, l = Math.hypot(dx, dz) || 1, rr = .03 + r() * .06;   /* 가장자리 포기는 바깥으로 기울어 경계가 부드럽게 또렷 */
      blade(x + Math.cos(a) * rr, z + Math.sin(a) * rr, dx / l, dz / l, Hc * (.7 + r() * .4), .05 + r() * .025, mix3(col0, G1, r() * .3), tip); }
    if (r() < .35) for (let q = 0, n = 1 + (r() * 2 | 0); q < n; q++) { const a = r() * 6.283, H = Hc * (1.12 + r() * .12); top = Math.max(top, H); plume(x + Math.cos(a) * .05, z + Math.sin(a) * .05, Math.cos(a) * .5 + ox * .5, Math.sin(a) * .5 + oz * .5, H); } }
  /* 속 덩이: 경계 안쪽 칸만 (바닥에 네모 계단이 비치지 않게 · 가장자리는 잎이 덮음) */
  { const S = .12, inset = .35, hk = .55, col = lin(0x4a7424), nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S), key = new Map();
    const h = (x, z) => { const s = foot(x, z) - inset; return s <= 0 ? .02 : .02 + HB * hk * Math.pow(Math.min(1, s / 1.0), .55) + .12 * fbm(x * 2.2, z * 2.2, 2) * Math.min(1, s * 3); };
    const vid = (i, j) => { const k = i + ',' + j; if (key.has(k)) return key.get(k); const x = x0 + i * S, z = z0 + j * S, d = clamp01((foot(x, z) - inset) / 1.2), id = B.v([x, h(x, z), z], mul(col, .45 + .55 * d), 0); key.set(k, id); return id; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * S, z = z0 + j * S; if (Math.min(foot(x, z), foot(x + S, z), foot(x, z + S), foot(x + S, z + S)) - inset < 0) continue; B.idx(vid(i, j), vid(i, j + 1), vid(i + 1, j + 1)); B.idx(vid(i, j), vid(i + 1, j + 1), vid(i + 1, j)); } }
  /* 밑동: 둘레에 땅과 같은 풀이 둘러 자라고 들꽃이 핌 (foot −0.45 ~ +0.3 사이) */
  { const GR0 = [.16, .36, .07], GR1 = [.40, .58, .12], FL = [[1.1, 1.05, .95], [1.1, .9, .3], [.85, .65, 1.1]], count = 900 * Math.max(.6, area / 12.5); B.soft = p => [0, 1, 0, clamp01(p[1] / .5) * .4];
    for (let k = 0, n = 0; k < count * 12 && n < count; k++) { const x = x0 - .5 + r() * (x1 - x0 + 1), z = z0 - .5 + r() * (z1 - z0 + 1), s = foot(x, z); if (s < -.45 || s > .3) continue; n++;
      const a = r() * 6.283, h = (.22 + r() * .28) * (1 - Math.max(0, -s) * 1.2), w = .03, lean = .12 + r() * .1, ox = Math.cos(a), oz = Math.sin(a), col = mix3(GR0, GR1, r()), tx = x + ox * lean * h, tz = z + oz * lean * h;
      B.tri([x - oz * w, 0, z + ox * w], [x + oz * w, 0, z - ox * w], [tx, h, tz], mul(col, .7), mul(col, .7), mul(col, 1.15), 0, 0, 1, .4);
      if (r() < .07) { const c = FL[(r() * 3) | 0], y = h + .02; for (let q = 0; q < 5; q++) { const an = q / 5 * 6.283;
        B.tri([tx, y, tz], [tx + Math.cos(an) * .04, y + .01, tz + Math.sin(an) * .04], [tx + Math.cos(an + 1.2) * .04, y + .01, tz + Math.sin(an + 1.2) * .04], c, c, c, 1, 1, 1, .2); } } }
    B.soft = soft; }
  const geo = B.geo(); return { geo, top, tris: geo.index.count / 3, clumps: clumps.length }; }
