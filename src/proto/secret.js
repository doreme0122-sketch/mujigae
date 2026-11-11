/* 비밀길 (사용자 2026-11-11 저녁 회의): 동굴 산을 가로로 뚫는 1층 터널 · 협곡 둔덕의 '턱과 굴' 판돌 · 입구 부쉬의 청록 꽃
   · 터널 관: 바위 아치 (안쪽 면 + 두꺼운 겉면) + 흙 바닥 — 산 속에 묻혀 밖에선 안 보이고, 기체가 들어가면 위가 내 화면에서만 걷힘 (isleview)
     입구는 산이 끝나는 바로 그 자리 (startlab이 땅 높이를 재서 정함) · 입구 앞면은 울퉁불퉁한 바위 테
   · 판돌: 둔덕 꼭대기 한가운데 · 이끼 낀 둥근 돌 · 무늬 '턱과 굴' (_---_ 솟은 턱 + 그 밑 굴 입구) 를 깊게 팜 · 홈 가장자리에서 청록빛이 옅게 흐름 (유적 룬과 같은 빛)
     모든 비밀길에 똑같은 무늬 → 한 번 배우면 '이게 있으면 밑은 무조건 터널' (사용자)
   · 청록 꽃: 비밀길 입구 부쉬에만 몇 송이 (판돌 빛과 같은 색 · 가까이 가야 보임) — 다른 부쉬엔 절대 없음 */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11112144';

export const SECRET = { FLOOR: -7.4, TOP: -1.2, WALL: 2.4, TEAL: [.22, .95, .8] };

/* 꺾은선을 촘촘하고 부드럽게 (모서리를 둥글게) */
function smooth(pts, step = 1.2) { const out = []; for (let k = 0; k < pts.length - 1; k++) { const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
  for (let i = 0; i < n; i++) { const t = i / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(pts[pts.length - 1]); return out; }

/* 터널 관 하나 */
function tube(S, seed) { const P = smooth(S.pts), fl = SECRET.FLOOR, wi = S.w + .9, H = SECRET.TOP - fl, NA = 18, M = 2 * (NA + 1), pos = [], ix = [];
  const frame = k => { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return { x: P[k][0], z: P[k][1], fx: dx / l, fz: dz / l, sx: -dz / l, sz: dx / l }; };
  const ring = (k, outer) => { const f = frame(k), o = []; for (let a = 0; a <= NA; a++) { const th = a / NA * Math.PI, n = noise2(th * 3 + k * .7 + seed, k * .4 - seed), W = outer ? wi + SECRET.WALL + .8 * n : wi + .25 * Math.abs(n), Hh = outer ? H + SECRET.WALL + .6 * n : H * (1 + .06 * Math.abs(n));
    const c = Math.cos(th) * W, y = fl - (outer ? .6 : .2) + Math.sin(th) * Hh; o.push([f.x + f.sx * c, y, f.z + f.sz * c]); } return o; };
  for (let k = 0; k < P.length; k++) { const I = ring(k, false), O = ring(k, true); for (const q of I) pos.push(...q); for (let a = NA; a >= 0; a--) pos.push(...O[a]); }
  for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < M; i++) { const A = k * M + i, B = k * M + (i + 1) % M, C = A + M, D = B + M; ix.push(A, C, B, B, C, D); }
  /* 입구 앞면: 안쪽 아치와 겉면 사이를 바위 테로 막음 (바깥으로 불룩 · 울퉁불퉁) */
  for (const [k, sg] of [[0, -1], [P.length - 1, 1]]) { const f = frame(k), mid = []; for (let a = 0; a <= NA; a++) { const iv = k * M + a, ov = k * M + (M - 1 - a), th = a / NA * Math.PI, bul = (.6 + 1.2 * Math.abs(noise2(th * 2.7 + seed, k))) * Math.sin(th) + .3;
      mid.push(pos.length / 3); pos.push((pos[iv * 3] + pos[ov * 3]) / 2 + f.fx * sg * bul, (pos[iv * 3 + 1] + pos[ov * 3 + 1]) / 2 + noise2(th * 3, seed) * .5, (pos[iv * 3 + 2] + pos[ov * 3 + 2]) / 2 + f.fz * sg * bul); }
    for (let a = 0; a < NA; a++) { const i0 = k * M + a, i1 = i0 + 1, o0 = k * M + (M - 1 - a), o1 = o0 - 1, m0 = mid[a], m1 = mid[a + 1]; ix.push(i0, m0, i1, i1, m0, m1, m0, o0, m1, m1, o0, o1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals();
  /* 바닥: 다져진 흙 · 잔돌 (관 안쪽 폭) */
  const fp = [], fi = []; for (let k = 0; k < P.length; k++) { const f = frame(k); for (let j = 0; j <= 6; j++) { const u = (j / 6 * 2 - 1) * (wi + .1), y = fl - .12 + .12 * noise2(k * .9 + j, seed) + .1 * Math.abs(j / 3 - 1); fp.push(f.x + f.sx * u, y, f.z + f.sz * u); } }
  for (let k = 0; k < P.length - 1; k++) for (let j = 0; j < 6; j++) { const A = k * 7 + j, B = A + 1, C = A + 7, D = C + 1; fi.push(A, C, B, B, C, D); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals();
  return { g, fg, P }; }

/* '턱과 굴' 무늬 (화면 기준 위 = 맵 가운데 쪽 −z) — 판돌 반지름으로 나눈 좌표에서 획까지 거리 */
const LEDGE = [[-.74, -.06], [-.36, -.06], [-.24, .22], [.24, .22], [.36, -.06], [.74, -.06]];
function glyphD(x, y) { let d = 9; for (let k = 1; k < LEDGE.length; k++) { const [ax, ay] = LEDGE[k - 1], [bx, by] = LEDGE[k], dx = bx - ax, dy = by - ay, q = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(x - ax - dx * q, y - ay - dy * q) - .055); }
  const rect = Math.max(Math.abs(x) - .15, Math.max(-.52 - y, y + .34)), cap = Math.hypot(x, y + .34) - .15; return Math.min(d, rect, cap); }   /* 굴 입구 = 네모 + 둥근 지붕 */
/* 판돌: 둥근 돌 (테두리는 깨진 듯 들쭉날쭉) · 윗면에 무늬를 파냄 · 홈 가장자리 = 빛 (aGlow) */
function slab(x, y, z, Rs, seed) { const NR = 20, NS = 64, pos = [], gl = [], ix = [], rim = th => Rs * (1 + .06 * noise2(th * 2.2 + seed, 3) + .03 * noise2(th * 7, seed));
  pos.push(0, .42, 0); gl.push(2);
  for (let i = 1; i <= NR; i++) for (let j = 0; j < NS; j++) { const th = j / NS * Math.PI * 2, rr = rim(th) * i / NR, lx = Math.cos(th) * rr, lz = Math.sin(th) * rr, q = glyphD(lx / Rs, -lz / Rs);
    const dish = .42 - .08 * Math.pow(i / NR, 3) + .03 * noise2(lx * 1.7 + seed, lz * 1.7), cut = q < 0 ? .38 + .06 * Math.min(1, -q * 20) : q < .02 ? .38 * (1 - q / .02) : 0;
    pos.push(lx, dish - cut, lz); gl.push(2 + (q < .03 && q > -.035 ? 1 : q < 0 ? .45 : 0)); }   /* 2 + 빛: 판돌 표시 (isle.js 깎은 돌 칠) */
  for (let j = 0; j < NS; j++) ix.push(0, 1 + (j + 1) % NS, 1 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NS; j++) { const A = 1 + (i - 1) * NS + j, B = 1 + (i - 1) * NS + (j + 1) % NS, C = A + NS, D = B + NS; ix.push(A, B, C, B, D, C); }
  const s0 = pos.length / 3; for (let j = 0; j < NS; j++) { const th = j / NS * Math.PI * 2, rr = rim(th) * 1.04; pos.push(Math.cos(th) * rr, -.35 + .1 * noise2(th * 3, seed), Math.sin(th) * rr); gl.push(2); }   /* 옆면 (땅에 반쯤 묻힘) */
  const top0 = 1 + (NR - 1) * NS; for (let j = 0; j < NS; j++) { const A = top0 + j, B = top0 + (j + 1) % NS, C = s0 + j, D = s0 + (j + 1) % NS; ix.push(A, B, C, B, D, C); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(gl, 1)); g.setIndex(ix);
  g.rotateY(seed * .07 % .3 - .15); g.translate(x, y, z); const g2 = g.toNonIndexed(); g2.computeVertexNormals(); return g2; }

export function buildSecret({ LO, F, hAt, U }) {
  const rock = [], stone = [], obstacles = []; if (!LO.secret) return { rock, stone, flowers: null, wind: null };
  LO.secret.forEach((S, k) => { const T = tube(S, k * 7.3 + 1); rock.push(T.g, T.fg); });
  /* 둔덕 판돌: 협곡이 비밀길 위를 지나는 자리 (gorge.rune.t) 둔덕 꼭대기 한가운데 */
  const slabs = []; (F.gorges || []).forEach((C, gi) => { if (!C.rune) return; const [x, z] = F.gorgeAtI(gi, C.rune.t); let y = -99; for (let a = 0; a < 6.283; a += .4) for (const d of [0, 2, 4]) y = Math.max(y, hAt(x + Math.cos(a) * d, z + Math.sin(a) * d)); stone.push(slab(x, y - .15, z, 4.2, gi * 13 + 5));   /* 판돌 밑 가장 높은 땅에 맞춰 얹음 (울퉁불퉁한 둔덕에 묻히지 않게) */ slabs.push([x, y, z, gi]); });
  /* 판돌 둘레 틈 바람: 몇 초마다 한 번 옅은 바람 줄기가 틈에서 훅 새어 올라 흩어짐 (밑의 터널로 바람이 지나서 · 아는 사람에겐 확인 도장) */
  let wind = null; if (slabs.length && U) { const P = [], Q = [], ix = []; for (const [x, y, z, gi] of slabs) for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + gi, r0 = 2.9, b = P.length / 3, ph = k * .13 + gi * .5;
      for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { P.push(x + Math.cos(a) * r0, y + .3, z + Math.sin(a) * r0); Q.push(u, v, a, ph); } ix.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(Q, 4)); g.setIndex(ix);
    wind = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 aQ; uniform float uT; varying vec2 vQ; varying float vA; void main(){ float cyc = mod(uT * .2 + aQ.w * .05, 1.), g = smoothstep(0., .04, cyc) * smoothstep(.32, .08, cyc), lift = cyc * 9.;   /* 5초마다 한 번 · 1.5초쯤 */
        vec3 out = vec3(cos(aQ.z), 0., sin(aQ.z)); vec3 p = position + out * (lift * .25 + aQ.y * .6) + vec3(0., aQ.y * (1.8 + lift * .35) + lift * .25, 0.);
        vec3 w = (modelMatrix * vec4(p, 1.)).xyz, vd = normalize(cameraPosition - w), sd = normalize(cross(vec3(0., 1., 0.), vd)); p += sd * aQ.x * (.22 + aQ.y * .3);
        vQ = aQ.xy; vA = g; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
      fragmentShader: `varying vec2 vQ; varying float vA; void main(){ float e = 1. - vQ.x * vQ.x, a = e * e * smoothstep(0., .25, vQ.y) * smoothstep(1., .4, vQ.y) * vA; gl_FragColor = vec4(vec3(.85, .97, .95) * a * .32, 1.); }` }));
    wind.frustumCulled = false; wind.renderOrder = 6; wind.name = 'secretWind'; }
  /* 청록 꽃: 비밀길 입구 부쉬에만 (LO.secretBrush = brush 번호) — 다섯 잎 작은 꽃 · 덤불 사이 군데군데 */
  let flowers = null; const SB = LO.secretBrush || [];
  if (SB.length) { const petal = new THREE.CircleGeometry(.14, 6); petal.scale(1, 1.7, 1); petal.translate(0, .2, 0); const parts = []; for (let i = 0; i < 5; i++) { const p = petal.clone(); p.rotateZ(i / 5 * Math.PI * 2); parts.push(p); }
    const core = new THREE.CircleGeometry(.08, 6); parts.push(core); const fgeo = new THREE.BufferGeometry(); { const merged = parts.map(p => p.toNonIndexed()); const n = merged.reduce((s, p) => s + p.attributes.position.count, 0), a = new Float32Array(n * 3); let o = 0; for (const p of merged) { a.set(p.attributes.position.array, o); o += p.attributes.position.array.length; } fgeo.setAttribute('position', new THREE.BufferAttribute(a, 3)); }
    fgeo.rotateX(-Math.PI / 2 + .35);
    const spots = []; let sd = 17; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (const bi of SB) { const Z = LO.brush[bi]; if (!Z) continue; for (const [cx, cz, r] of Z) { const n = Math.round(r * 1.6); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, d = r * (.35 + rnd() * .55), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; spots.push([x, hAt(x, z) + 1.2 + rnd() * 1.6, z, rnd() * 6.283, .8 + rnd() * .5]); } } }
    const m = new THREE.InstancedMesh(fgeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(...SECRET.TEAL).multiplyScalar(1.6), side: THREE.DoubleSide, toneMapped: false }), spots.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    spots.forEach(([x, y, z, a, s], i) => { e.set(0, a, 0); q.setFromEuler(e); M4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); m.setMatrixAt(i, M4); });
    m.name = 'secretFlowers'; flowers = m; }
  return { rock, stone, flowers, wind, obstacles }; }
