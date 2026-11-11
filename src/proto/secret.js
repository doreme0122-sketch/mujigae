/* 비밀길 (사용자 2026-11-11 저녁 회의): 동굴 산을 가로로 뚫는 1층 터널 · 협곡 둔덕의 '턱과 굴' 판돌 · 입구 부쉬의 청록 꽃
   · 터널 관: 바위 아치 (안쪽 면 + 두꺼운 겉면) + 흙 바닥 — 산 속에 묻혀 밖에선 안 보이고, 기체가 들어가면 위가 내 화면에서만 걷힘 (isleview)
     입구는 산이 끝나는 바로 그 자리 (startlab이 땅 높이를 재서 정함) · 입구 앞면은 울퉁불퉁한 바위 테
   · 판돌: 둔덕 꼭대기 한가운데 · 이끼 낀 둥근 돌 · 무늬 '턱과 굴' (_---_ 솟은 턱 + 그 밑 굴 입구) 를 깊게 팜 · 홈 가장자리에서 청록빛이 옅게 흐름 (유적 룬과 같은 빛)
     모든 비밀길에 똑같은 무늬 → 한 번 배우면 '이게 있으면 밑은 무조건 터널' (사용자)
   · 청록 꽃: 비밀길 입구 부쉬에만 몇 송이 (판돌 빛과 같은 색 · 가까이 가야 보임) — 다른 부쉬엔 절대 없음 */
import * as THREE from 'three';
import { noise2, smoothstep } from './islefield.js?v=11120129';

export const SECRET = { FLOOR: -7.4, TOP: -1.2, WALL: 2.4, TEAL: [.22, .95, .8] };

/* 꺾은선을 촘촘하고 부드럽게 (모서리를 둥글게) */
function smooth(pts, step = 1.2) { const out = []; for (let k = 0; k < pts.length - 1; k++) { const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)], n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
  for (let i = 0; i < n; i++) { const t = i / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
  out.push(pts[pts.length - 1]); return out; }

/* 터널 관 하나 */
function tube(S, seed, hAt) { const P = smooth(S.pts);
  /* 입구는 절벽 면에서 딱 끝남 (사용자 2026-11-11: 입구 바위 · 관이 산 밖으로 튀어나왔음) — 관 천장보다 땅이 낮은(산이 덮지 않는) 끝 부분은 잘라 냄 */
  if (hAt) { const cov = (k, n) => { const p = P[k], q = P[n], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, sx = -dz / l, sz = dx / l, r = S.w + 3.6;   /* 가운데와 양옆 겉 두께 자리까지 모두 산이 덮어야 남김 */
      return [0, -1, 1, -.5, .5].every(u => hAt(p[0] + sx * r * u, p[1] + sz * r * u) > SECRET.TOP + 1.4); };
    while (P.length > 4 && !cov(0, 1)) P.shift(); while (P.length > 4 && !cov(P.length - 1, P.length - 2)) P.pop(); }
  const fl = SECRET.FLOOR, wi = S.w + .9, H = SECRET.TOP - fl, NA = 18, M = 2 * (NA + 1), pos = [], ix = [];
  const frame = k => { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return { x: P[k][0], z: P[k][1], fx: dx / l, fz: dz / l, sx: -dz / l, sz: dx / l }; };
  const ring = (k, outer) => { const f = frame(k), o = []; for (let a = 0; a <= NA; a++) { const th = a / NA * Math.PI, n = noise2(th * 3 + k * .7 + seed, k * .4 - seed), W = outer ? wi + SECRET.WALL + .8 * n : wi + .25 * Math.abs(n), Hh = outer ? H + SECRET.WALL + .6 * n : H * (1 + .06 * Math.abs(n));
    const c = Math.cos(th) * W, y = fl - (outer ? .6 : .2) + Math.sin(th) * Hh; let x = f.x + f.sx * c, z = f.z + f.sz * c;
    if (outer && hAt && hAt(x, z) < y + .5) { const ci = Math.cos(th) * (wi + .35), yi = fl - .2 + Math.sin(th) * (H + .3); x = f.x + f.sx * ci; z = f.z + f.sz * ci; o.push([x, Math.min(y, yi), z]); continue; }   /* 겉 두께가 땅 밖으로 나오면 안쪽 면에 바짝 붙임 (산 속에만 두께) */
    o.push([x, y, z]); } return o; };
  for (let k = 0; k < P.length; k++) { const I = ring(k, false), O = ring(k, true); for (const q of I) pos.push(...q); for (let a = NA; a >= 0; a--) pos.push(...O[a]); }
  for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < M; i++) { const A = k * M + i, B = k * M + (i + 1) % M, C = A + M, D = B + M; ix.push(A, C, B, B, C, D); }
  /* 입구 앞면: 안쪽 아치와 겉면 사이를 바위 테로 막음 (바깥으로 불룩 · 울퉁불퉁) */
  for (const [k, sg] of [[0, -1], [P.length - 1, 1]]) { const f = frame(k), mid = []; for (let a = 0; a <= NA; a++) { const iv = k * M + a, ov = k * M + (M - 1 - a), th = a / NA * Math.PI, bul = -.15 - .25 * Math.abs(noise2(th * 2.7 + seed, k));   /* 입구 테: 절벽 면 안쪽으로 살짝 들어감 (밖으로 불룩 X) */
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
function slab(x, y, z, Rs, seed) { const NR = 46, NS = 200, pos = [], gl = [], ix = [], rim = th => Rs * (1 + .06 * noise2(th * 2.2 + seed, 3) + .03 * noise2(th * 7, seed));
  pos.push(0, .42, 0); gl.push(2);
  for (let i = 1; i <= NR; i++) for (let j = 0; j < NS; j++) { const th = j / NS * Math.PI * 2, rr = rim(th) * i / NR, lx = Math.cos(th) * rr, lz = Math.sin(th) * rr, q = glyphD(lx / Rs, -lz / Rs);
    const dish = .42 - .08 * Math.pow(i / NR, 3) + .03 * noise2(lx * 1.7 + seed, lz * 1.7), cut = .4 * (1 - smoothstep(-.012, .022, q)) + .05 * Math.min(1, Math.max(0, -q) * 20);   /* 홈 가장자리를 부드럽게 비탈지게 (사용자 2026-11-11: 무늬가 톱니처럼 뜯겨 보였음) */
    pos.push(lx, dish - cut, lz); gl.push(2 + Math.max(0, 1 - Math.abs(q - .004) / .03) * 1 + (q < -.02 ? .4 : 0)); }   /* 2 + 빛: 판돌 표시 (isle.js 깎은 돌 칠) */
  for (let j = 0; j < NS; j++) ix.push(0, 1 + (j + 1) % NS, 1 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NS; j++) { const A = 1 + (i - 1) * NS + j, B = 1 + (i - 1) * NS + (j + 1) % NS, C = A + NS, D = B + NS; ix.push(A, B, C, B, D, C); }
  const s0 = pos.length / 3; for (let j = 0; j < NS; j++) { const th = j / NS * Math.PI * 2, rr = rim(th) * 1.04; pos.push(Math.cos(th) * rr, -.35 + .1 * noise2(th * 3, seed), Math.sin(th) * rr); gl.push(2); }   /* 옆면 (땅에 반쯤 묻힘) */
  const top0 = 1 + (NR - 1) * NS; for (let j = 0; j < NS; j++) { const A = top0 + j, B = top0 + (j + 1) % NS, C = s0 + j, D = s0 + (j + 1) % NS; ix.push(A, B, C, B, D, C); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(gl, 1)); g.setIndex(ix);
  g.rotateY(seed * .07 % .3 - .15); g.translate(x, y, z); const g2 = g.toNonIndexed(); g2.computeVertexNormals(); return g2; }

export function buildSecret({ LO, F, hAt, U, GL }) {
  const rock = [], stone = [], obstacles = [], TB = []; if (!LO.secret) return { rock, stone, flowers: null, wind: null, decor: [] };
  LO.secret.forEach((S, k) => { const T = tube(S, k * 7.3 + 1, hAt); rock.push(T.g, T.fg); TB.push({ ...T, w: S.w + .9, seed: k * 7.3 + 1 });
    /* 입구 아치 테 (사용자 2026-11-12 · 그림 ⑤): 절벽 면에 박힌 큰 바위 덩이들이 아치를 두름 — 오래된 돌문 같지 않게 거칠고 크기가 저마다 다름 */
    const P = T.P; for (const [e, n] of [[0, 1], [P.length - 1, P.length - 2]]) { const fx = P[e][0] - P[n][0], fz = P[e][1] - P[n][1], fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl, sx = -uz, sz = ux, wi = S.w + .9, Hh = SECRET.TOP - SECRET.FLOOR;
      for (let i = 0; i <= 8; i++) { const th = i / 8 * Math.PI, sd = k * 31 + e * 7 + i, rx = 1.1 + .5 * Math.abs(noise2(sd, 1)), ry = .9 + .4 * Math.abs(noise2(sd, 2)), g = new THREE.BoxGeometry(rx * 2, ry * 2, 1.6 + .6 * Math.abs(noise2(sd, 3)), 2, 2, 2); g.deleteAttribute('uv');
        const pa = g.attributes.position; for (let v = 0; v < pa.count; v++) { const a = pa.getX(v), b = pa.getY(v), c = pa.getZ(v), m = 1 + .22 * noise2(a * 1.7 + sd, b * 1.7 + c); pa.setXYZ(v, a * m, b * m, c * m); }
        const cx = Math.cos(th) * (wi + .55), cy = SECRET.FLOOR - .2 + Math.sin(th) * (Hh + .5), M4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(-Math.sin(th) * sx, Math.cos(th), -Math.sin(th) * sz), new THREE.Vector3(Math.cos(th) * sx, Math.sin(th), Math.cos(th) * sz), new THREE.Vector3(ux, 0, uz));
        M4.setPosition(P[e][0] + sx * cx - ux * .35, cy, P[e][1] + sz * cx - uz * .35); g.applyMatrix4(M4); g.computeVertexNormals(); rock.push(g); } } });
  /* 둔덕 판돌: 협곡이 비밀길 위를 지나는 자리 (gorge.rune.t) 둔덕 꼭대기 한가운데 */
  const slabs = []; (F.gorges || []).forEach((C, gi) => { if (!C.rune) return; const [x, z] = F.gorgeAtI(gi, C.rune.t); let y = -99; for (let a = 0; a < 6.283; a += .4) for (const d of [0, 2, 4]) y = Math.max(y, hAt(x + Math.cos(a) * d, z + Math.sin(a) * d)); stone.push(slab(x, y - .15, z, 4.2, gi * 13 + 5));   /* 판돌 밑 가장 높은 땅에 맞춰 얹음 (울퉁불퉁한 둔덕에 묻히지 않게) */ slabs.push([x, y, z, gi]); });
  /* 판돌 둘레 틈 바람: 몇 초마다 한 번 옅은 바람 줄기가 틈에서 훅 새어 올라 흩어짐 (밑의 터널로 바람이 지나서 · 아는 사람에겐 확인 도장) */
  let wind = null; if (slabs.length && U) { const P = [], Q = [], ix = []; for (const [x, y, z, gi] of slabs) for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + gi, r0 = 2.9, b = P.length / 3, ph = k * .13 + gi * .5;
      for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { P.push(x + Math.cos(a) * r0, y + .3, z + Math.sin(a) * r0); Q.push(u, v, a, ph); } ix.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(Q, 4)); g.setIndex(ix);
    wind = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 aQ; uniform float uT; varying vec2 vQ; varying float vA; void main(){ float cyc = mod(uT * .2 + aQ.w * .05, 1.), g = smoothstep(0., .04, cyc) * smoothstep(.32, .08, cyc), lift = cyc * 9.;   /* 5초마다 한 번 · 1.5초쯤 */
        vec3 od = vec3(cos(aQ.z), 0., sin(aQ.z)); vec3 p = position + od * (lift * .25 + aQ.y * .6) + vec3(0., aQ.y * (1.8 + lift * .35) + lift * .25, 0.);
        vec3 w = (modelMatrix * vec4(p, 1.)).xyz, vd = normalize(cameraPosition - w), sd = normalize(cross(vec3(0., 1., 0.), vd)); p += sd * aQ.x * (.22 + aQ.y * .3);
        vQ = aQ.xy; vA = g; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float uBlk; varying vec2 vQ; varying float vA; void main(){ float e = 1. - vQ.x * vQ.x, a = e * e * smoothstep(0., .25, vQ.y) * smoothstep(1., .4, vQ.y) * vA; gl_FragColor = vec4(vec3(.85, .97, .95) * a * .32 * (1. - uBlk), 1.); }` }));   /* 터널 안에선 터널 밖이 모두 까맣게 → 바람도 꺼짐 */
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
  const decor = U && GL ? buildDecor({ TB, slabs, rock, U, GL }) : [];
  return { rock, stone, flowers, wind, obstacles, decor }; }

/* ── 터널 안 분위기 (사용자 2026-11-11 '다': 자연 동굴 바탕 + 오래된 흔적 · 빛은 이끼 · 청록 꽃 · 룬에서만) ──
   모두 터널 물체 (uMine = 1): 터널 안에선 이것들과 관만 보이고 나머지는 까맣게. 밖에선 산 속에 묻혀 안 보임.
   · 뿌리: 벽 윗부분 틈에서 비집고 나와 무게로 처져 늘어짐 (위에 땅 · 풀이 있으니까)
   · 이끼: 벽 밑동 축축한 곳에 무리 지어 · 스스로 옅게 빛남 (터널의 주된 빛)
   · 청록 꽃: 이끼 무리 틈에 몇 송이 (입구 부쉬 꽃과 같은 꽃 → 입구에서 본 꽃이 안까지 이어짐)
   · 벽 룬: '턱과 굴' 작은 무늬가 숨 쉬듯 천천히 밝아졌다 어두워짐 (양쪽 벽 번갈아) — 터널을 만든 이들의 길 표시
   · 가운데 큰 룬: 협곡 둔덕(판돌) 바로 밑 바닥 — 위 판돌과 같은 무늬 · 같은 박자로 빛남 (위와 아래가 한 짝이라는 것)
   · 반쯤 묻힌 판돌: 무너진 옛 돌 몇 장이 바닥에 비스듬히
   · 먼지: 바람이 한쪽으로 지나가니 (판돌 틈 바람의 근원) 먼지가 한 방향으로 천천히 흘러감
   · 물방울: 천장에서 맺혀 떨어지고 바닥에 작은 물결 */
const GLYPH = `float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
float glyph(vec2 p){ float d = 9.; d = min(d, seg(p, vec2(-.74, -.06), vec2(-.36, -.06))); d = min(d, seg(p, vec2(-.36, -.06), vec2(-.24, .22))); d = min(d, seg(p, vec2(-.24, .22), vec2(.24, .22)));
  d = min(d, seg(p, vec2(.24, .22), vec2(.36, -.06))); d = min(d, seg(p, vec2(.36, -.06), vec2(.74, -.06))); d -= .055;
  float rect = max(abs(p.x) - .15, max(-.52 - p.y, p.y + .34)), cap = length(p - vec2(0., -.34)) - .15; return min(d, abs(min(rect, cap)) - .035); }   `;   /* 턱 = 굵은 획 · 굴 = 아치 테두리 (속은 비어 어두운 구멍) */
function buildDecor({ TB, slabs, rock, U, GL }) {
  const out = [], UM = { ...U, uMine: { value: 1 } }, fl = SECRET.FLOOR, H = SECRET.TOP - fl, T3 = new THREE.Color(...SECRET.TEAL);
  let sd = 91; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const frame = (P, k) => { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return { x: P[k][0], z: P[k][1], fx: dx / l, fz: dz / l, sx: -dz / l, sz: dx / l }; };
  /* 벽 위 한 점 (관 단면 각도 th: 0 = 오른쪽 바닥 · π/2 = 천장 · π = 왼쪽 바닥) · 안쪽으로 in만큼 */
  const wall = (T, k, th, inn = 0) => { const f = frame(T.P, k), W = T.w - inn, y = fl - .2 + Math.sin(th) * (H - inn), c = Math.cos(th) * W; return { p: [f.x + f.sx * c, y, f.z + f.sz * c], n: [-f.sx * Math.cos(th), -Math.sin(th), -f.sz * Math.cos(th)], f }; };
  const quads = [], QA = [];   /* 벽에 붙는 판 (이끼 · 룬 · 바닥 룬 · 물결) — aK: 종류, 크기, 박자, 짝 */
  const quad = (c, n, up, w, h, kind, ph, ex = 0) => { const nl = Math.hypot(...n), N = n.map(v => v / nl), R = [up[1] * N[2] - up[2] * N[1], up[2] * N[0] - up[0] * N[2], up[0] * N[1] - up[1] * N[0]], rl = Math.hypot(...R) || 1, Rn = R.map(v => v / rl), V = [N[1] * Rn[2] - N[2] * Rn[1], N[2] * Rn[0] - N[0] * Rn[2], N[0] * Rn[1] - N[1] * Rn[0]];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { quads.push(c[0] + N[0] * .06 + Rn[0] * u * w + V[0] * v * h, c[1] + N[1] * .06 + Rn[1] * u * w + V[1] * v * h, c[2] + N[2] * .06 + Rn[2] * u * w + V[2] * v * h); QA.push(u, v, kind, ph + ex); } };
  const roots = [], dust = [], drips = [];
  TB.forEach((T, ti) => { const P = T.P, n = P.length;
    /* 가운데 = 판돌 바로 밑 (가장 가까운 점) */
    let mid = n >> 1, best = 1e9; for (const [x, , z] of slabs) for (let k = 0; k < n; k++) { const d = Math.hypot(P[k][0] - x, P[k][1] - z); if (d < best) { best = d; mid = k; } }
    const f0 = frame(P, mid); quad([f0.x, fl + .02, f0.z], [0, 1, 0], [0, 0, -1], 3.4, 3.4, 2, 0);   /* 위 판돌과 같은 방향 (화면 위 = 12시) */   /* 바닥 큰 룬 (위 판돌과 같은 박자) */
    for (let k = 3; k < n - 3; k++) {
      /* 뿌리: 2.2칸마다 한 번쯤 · 천장 양옆 틈에서 */
      if (rnd() < .42) { const side = rnd() < .5 ? 1 : -1, th = Math.PI / 2 - side * (.95 + rnd() * .3), w0 = wall(T, k, th, -.2), L = 1.6 + rnd() * 3.4, r0 = .09 + rnd() * .1, tw = rnd() * 6.283;
        const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, out = Math.sin(t * 1.8) * L * .35, drop = t * t * L * .9 + t * L * .25, wig = Math.sin(t * 5 + tw) * .25 * t;
          pts.push([w0.p[0] + w0.n[0] * out + w0.f.fx * wig, w0.p[1] + w0.n[1] * out * .3 - drop, w0.p[2] + w0.n[2] * out + w0.f.fz * wig, r0 * (1 - t * .85)]); }
        roots.push(pts); if (rnd() < .5) { const j = 2 + (rnd() * 3 | 0), q = pts[j], sub = []; for (let i = 0; i <= 4; i++) { const t = i / 4; sub.push([q[0] + w0.f.fx * t * .9 * side, q[1] - t * t * 1.4, q[2] + w0.f.fz * t * .9 * side, q[3] * (1 - t * .9)]); } roots.push(sub); } }
      /* 이끼 무리: 벽 밑동 (양쪽) · 크기 들쭉날쭉 */
      for (const side of [0, 1]) if (rnd() < .5) { const th = side ? Math.PI - .18 - rnd() * .3 : .18 + rnd() * .3, w0 = wall(T, k, th, .02), s = .6 + rnd() * 1.1; quad(w0.p, w0.n, [0, 1, 0], s * 1.5, s, 0, rnd() * 6.283, rnd()); }
      /* 벽 룬: 7칸마다 · 양쪽 번갈아 · 가운데 근처는 비움 (큰 룬이 주인공) */
      if (k % 7 === 0 && Math.abs(k - mid) > 4) { const side = (k / 7) % 2 ? 1 : -1, w0 = wall(T, k, Math.PI / 2 - side * 1.1, .02); quad(w0.p, w0.n, [0, 1, 0], .85, .85, 1, k * .37); }
      /* 먼지: 관 속 아무 데나 */
      for (let i = 0; i < 2; i++) { const f = frame(P, k), u = (rnd() * 2 - 1) * T.w * .8, y = fl + .4 + rnd() * H * .75; dust.push([f.x + f.sx * u, y, f.z + f.sz * u, f.fx, f.fz, rnd()]); }
      /* 물방울: 6칸마다 한 번쯤 · 천장 가까이에서 */
      if (rnd() < .16) { const f = frame(P, k), u = (rnd() * 2 - 1) * T.w * .5, top = fl - .2 + H * Math.sqrt(Math.max(0, 1 - (u / T.w) ** 2)) - .25; drips.push([f.x + f.sx * u, top, f.z + f.sz * u, 2.6 + rnd() * 2.8, rnd()]); }
    }
    /* 반쯤 묻힌 옛 판돌: 터널마다 넷 · 벽 가까이 비스듬히 */
    for (let i = 0; i < 4; i++) { const k = 4 + ((i + .5) / 4 * (n - 8) | 0), f = frame(P, k), side = i % 2 ? 1 : -1, u = side * (T.w - 1.4 - rnd() * .6), r = 1 + rnd() * .7;
      const g = new THREE.CylinderGeometry(r, r * 1.05, .38, 11, 1); g.deleteAttribute('uv'); const pa = g.attributes.position; for (let j = 0; j < pa.count; j++) { const x = pa.getX(j), z = pa.getZ(j); pa.setY(j, pa.getY(j) + .06 * noise2(x * 2 + i, z * 2)); pa.setX(j, x * (1 + .1 * noise2(z + i * 3, 1))); }
      g.rotateZ(side * (.25 + rnd() * .3)); g.rotateY(rnd() * 6.283); g.translate(f.x + f.sx * u, fl + .02, f.z + f.sz * u); g.computeVertexNormals(); rock.push(g); }
  });
  /* 뿌리 덩이 (가는 관 · 끝으로 갈수록 가늘게) */
  if (roots.length) { const pos = [], ix = []; for (const R of roots) { const b = pos.length / 3; R.forEach(([x, y, z, r], i) => { const a = R[Math.max(0, i - 1)], c = R[Math.min(R.length - 1, i + 1)]; let tx = c[0] - a[0], ty = c[1] - a[1], tz = c[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        let ux = -tz, uy = 0, uz = tx; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
        for (let s = 0; s < 5; s++) { const a2 = s / 5 * 6.283, c2 = Math.cos(a2) * r, s2 = Math.sin(a2) * r; pos.push(x + ux * c2 + vx * s2, y + uy * c2 + vy * s2, z + uz * c2 + vz * s2); } });
      for (let i = 0; i < R.length - 1; i++) for (let s = 0; s < 5; s++) { const A = b + i * 5 + s, B = b + i * 5 + (s + 1) % 5, C = A + 5, D = B + 5; ix.push(A, B, C, B, D, C); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(ix); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: UM, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vP, vN; void main(){ vP = position; vN = normal; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec3 vP, vN; void main(){ if (cutAway(vP)) discard; if (uBlk > .5 && vP.y > ${(SECRET.FLOOR + 3.85).toFixed(2)}) discard; vec3 n = normalize(vN); float g = vn(vec2(vP.x + vP.z, vP.y) * 9.) * .35 + .75;
        vec3 c = vec3(.27, .19, .12) * g; gl_FragColor = vec4(fogged(lit(c, n, .35, .6) + c * vec3(.1, .45, .38) * .5, vP), 1.); }` }));   /* 젖은 나무뿌리 · 햇빛은 약하게, 청록 이끼빛을 받음 */
    m.name = 'secretRoots'; out.push(m); }
  /* 벽 판: 이끼 (0) · 벽 룬 (1) · 바닥 큰 룬 (2) */
  if (quads.length) { const g = new THREE.BufferGeometry(), n = quads.length / 3, ix = []; for (let b = 0; b < n; b += 4) ix.push(b, b + 1, b + 2, b, b + 2, b + 3);
    g.setAttribute('position', new THREE.Float32BufferAttribute(quads, 3)); g.setAttribute('aQ', new THREE.Float32BufferAttribute(QA, 4)); g.setIndex(ix);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: UM, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aQ; varying vec4 vQ; varying vec3 vP; void main(){ vQ = aQ; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + GLYPH + `varying vec4 vQ; varying vec3 vP; const vec3 TEAL = vec3(${[...T3.toArray()].map(v => v.toFixed(3)).join(',')});
        void main(){ if (cutAway(vP)) discard; vec2 q = vQ.xy; float kind = vQ.z, ph = vQ.w, a = 0.; vec3 c = vec3(0.);
          if (kind < .5) { float r = length(q * vec2(1., 1.3)), n = fb(q * 2.3 + ph * 7.), body = smoothstep(.95, .35, r + (n - .5) * .7);   /* 이끼: 덩어리진 가장자리 · 알갱이 */
            float spec = smoothstep(.62, .8, vn(q * 9. + ph * 3.)) * body; c = vec3(.10, .32, .14) * body * (.5 + .5 * n) + TEAL * spec * (.55 + .45 * sin(uT * .9 + ph * 6.)) * .9; }
          else { float S = kind < 1.5 ? 1. : 1., br = kind < 1.5 ? .55 + .45 * sin(uT * 1.1 + ph) : .5 + .5 * sin(uT * 1.256);   /* 벽 룬: 저마다 다른 박자로 숨 쉼 · 바닥 큰 룬: 판돌과 같은 5초 박자 */
            float d = glyph(q * S), line = smoothstep(.05, 0., d), halo = exp(-max(d, 0.) * 9.) * .55, ring = kind > 1.5 ? smoothstep(.04, 0., abs(length(q) - .93)) * .5 + exp(-abs(length(q) - .93) * 14.) * .2 : 0.;
            float fade = smoothstep(1., .82, max(abs(q.x), abs(q.y)) * (kind > 1.5 ? .9 : 1.)); c = TEAL * (line * (.6 + 1.1 * br) + (halo + ring) * (.25 + .75 * br)) * fade * (kind > 1.5 ? 1.3 : 1.); }
          gl_FragColor = vec4(c * max(seen(vP), uBlk), 1.); }` }));
    m.renderOrder = 7; m.frustumCulled = false; m.name = 'secretGlow'; out.push(m); }
  /* 청록 꽃 (이끼 무리 틈) — 작은 다섯 잎 꽃을 벽 밑동에 */
  { const petal = new THREE.CircleGeometry(.12, 6); petal.scale(1, 1.7, 1); petal.translate(0, .17, 0); const parts = []; for (let i = 0; i < 5; i++) { const p = petal.clone(); p.rotateZ(i / 5 * Math.PI * 2); parts.push(p.toNonIndexed()); } parts.push(new THREE.CircleGeometry(.07, 6).toNonIndexed());
    const cnt = parts.reduce((s, p) => s + p.attributes.position.count, 0), arr = new Float32Array(cnt * 3); let o = 0; for (const p of parts) { arr.set(p.attributes.position.array, o); o += p.attributes.position.array.length; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(arr, 3)); fg.rotateX(-Math.PI / 2 + .5);
    const spots = []; for (let i = 0; i < quads.length / 12; i++) { if (QA[i * 16 + 2] !== 0 || rnd() > .4) continue; const b = i * 12; const cx = (quads[b] + quads[b + 6]) / 2, cy = (quads[b + 1] + quads[b + 7]) / 2, cz = (quads[b + 2] + quads[b + 8]) / 2;
      for (let j = 0, m = 1 + (rnd() * 3 | 0); j < m; j++) spots.push([cx + (rnd() - .5) * 1.2, cy - .2 + rnd() * .5, cz + (rnd() - .5) * 1.2, rnd() * 6.283, .7 + rnd() * .5]); }
    if (spots.length) { const m = new THREE.InstancedMesh(fg, new THREE.MeshBasicMaterial({ color: T3.clone().multiplyScalar(1.5), side: THREE.DoubleSide, toneMapped: false }), spots.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      spots.forEach(([x, y, z, a, s], i) => { e.set(0, a, 0); q.setFromEuler(e); M4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)); m.setMatrixAt(i, M4); }); m.name = 'secretFlowersIn'; out.push(m); } }
  /* 먼지: 한 방향으로 천천히 흘러감 (6칸 구간을 지나며 나타났다 사라짐) */
  if (dust.length) { const g = new THREE.BufferGeometry(), P = [], A = []; for (const [x, y, z, fx, fz, ph] of dust) { P.push(x, y, z); A.push(fx, fz, ph, 0); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(A, 4));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: UM, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aD; uniform float uT; varying float vA; varying vec3 vP; void main(){ float c = fract(uT * .045 + aD.z), L = 7.; vec3 p = position + vec3(aD.x, 0., aD.y) * (c - .5) * L + vec3(0., sin(uT * .7 + aD.z * 20.) * .25, 0.);
        vA = sin(c * 3.1416); vP = p; vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_PointSize = clamp(60. / -mv.z, 1., 5.); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL + `varying float vA; varying vec3 vP; void main(){ if (cutAway(vP)) discard; vec2 q = gl_PointCoord - .5; float a = exp(-dot(q, q) * 14.) * vA; gl_FragColor = vec4(vec3(.55, .72, .68) * a * .45 * max(seen(vP), uBlk), 1.); }` }));
    m.frustumCulled = false; m.renderOrder = 8; m.name = 'secretDust'; out.push(m); }
  /* 물방울: 맺힘 → 떨어짐 → 바닥 물결 (aW: 주기, 박자, 천장 높이) */
  if (drips.length) { const g = new THREE.BufferGeometry(), P = [], A = []; for (const [x, y, z, per, ph] of drips) { P.push(x, y, z); A.push(per, ph, y - fl, 0); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(A, 4));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: UM, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aW; uniform float uT; varying float vA; varying vec3 vP; void main(){ float c = fract(uT / aW.x + aW.y), td = sqrt(aW.z / 9.8), t = (c - 1. + td / aW.x) * aW.x, dy = t > 0. ? 9.8 * t * t : 0.;   /* 바닥에 닿는 순간 = 주기 끝 (물결과 맞춤) */
        vec3 p = position - vec3(0., dy, 0.); vA = smoothstep(.2, .7, c) * (t > 0. ? 1. : .6); vP = p;   /* 천장에 맺혀 점점 커지다 → 떨어짐 */
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.); gl_PointSize = clamp(70. / -mv.z, 1.5, 6.) * (t > 0. ? .8 : .4 + .5 * smoothstep(.2, .9, c)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: GL + `varying float vA; varying vec3 vP; void main(){ if (cutAway(vP)) discard; vec2 q = gl_PointCoord - .5; float a = exp(-dot(q, q) * 20.) * vA; gl_FragColor = vec4(vec3(.6, .95, .9) * a * .8, 1.); }` }));
    m.frustumCulled = false; m.renderOrder = 8; m.name = 'secretDrips'; out.push(m);
    /* 바닥 물결: 떨어진 직후 0.7초 동안 둥글게 퍼짐 */
    const rp = [], ra = []; for (const [x, , z, per, ph] of drips) { const b = rp.length / 3; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { rp.push(x + u * .9, fl + .05, z + v * .9); ra.push(u, v, per, ph); } }
    const rg = new THREE.BufferGeometry(), ri = []; for (let b = 0; b < rp.length / 3; b += 4) ri.push(b, b + 1, b + 2, b, b + 2, b + 3); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('aR', new THREE.Float32BufferAttribute(ra, 4)); rg.setIndex(ri);
    const rm = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: UM, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aR; uniform float uT; varying vec2 vQ; varying float vC; varying vec3 vP; void main(){ vQ = aR.xy; float c = fract(uT / aR.z + aR.w); vC = c * aR.z; vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`,
      fragmentShader: GL + `varying vec2 vQ; varying float vC; varying vec3 vP; void main(){ if (cutAway(vP)) discard; float t = vC / .7, r = length(vQ), ring = exp(-pow((r - t * .9) * 14., 2.)) * (1. - smoothstep(.5, 1., t));   /* vC: 떨어진 뒤 지난 초 */
        gl_FragColor = vec4(vec3(.5, .9, .85) * ring * .35, 1.); }` }));
    rm.renderOrder = 7; rm.name = 'secretRipple'; out.push(rm); }
  return out; }

/* ── 터널 소리 (사용자 2026-11-11 '다'): 들어가면 서서히 · 나오면 서서히
   · 동굴 웅웅: 아주 낮게 걸러 낸 바람 소리 + 낮은 두 음이 살짝 어긋나 천천히 일렁임
   · 물방울: 몇 초마다 '똑' — 짧게 높아졌다 떨어지는 맑은 소리 + 동굴 울림
   · 위 싸움 소리: 협곡 바로 밑(가운데)에 가까울수록 · 위에서 나는 소리가 흙을 지나 먹먹하게 (낮게 걸러 낸 쿵 · 웅성) */
export function tunnelSound(getCtx) { let A = null, M = null, on = 0, nextDrip = 0, nextThud = 0;
  const init = () => { A = getCtx(); if (!A) return; const sr = A.sampleRate, nb = A.createBuffer(1, sr * 4, sr), d = nb.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = b * .985 + (Math.random() * 2 - 1) * .015; d[i] = b * 6; }
    M = A.createGain(); M.gain.value = 0; M.connect(A.destination);
    const verbIR = A.createBuffer(2, sr * 1.8 | 0, sr); for (let c = 0; c < 2; c++) { const v = verbIR.getChannelData(c); for (let i = 0; i < v.length; i++) v[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / v.length, 3); }
    const verb = A.createConvolver(); verb.buffer = verbIR; const vg = A.createGain(); vg.gain.value = .55; verb.connect(vg); vg.connect(M); M.verb = verb;
    const s = A.createBufferSource(); s.buffer = nb; s.loop = true; const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160; const hg = A.createGain(); hg.gain.value = .5; s.connect(lp); lp.connect(hg); hg.connect(M); s.start();
    for (const [f, g] of [[55, .05], [55.6, .05], [82.4, .02]]) { const o = A.createOscillator(); o.frequency.value = f; const og = A.createGain(); og.gain.value = g; o.connect(og); og.connect(M); o.start(); }
    M.nb = nb; };
  const drip = t => { const o = A.createOscillator(), g = A.createGain(), p = A.createStereoPanner(), f = 900 + Math.random() * 700; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 2.1, t + .06);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.12, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .16); p.pan.value = Math.random() * 1.4 - .7; o.connect(g); g.connect(p); p.connect(M); p.connect(M.verb); o.start(t); o.stop(t + .2); };
  const thud = (t, k) => { const s = A.createBufferSource(); s.buffer = M.nb; const lp = A.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110 + Math.random() * 60; const g = A.createGain(); const big = Math.random() < .35;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime((big ? .9 : .4) * k, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + (big ? .9 : .4)); s.connect(lp); lp.connect(g); g.connect(M); g.connect(M.verb); s.start(t, Math.random() * 3); s.stop(t + 1); };
  /* 매 프레임: inside = 터널 안인지, under = 협곡 밑 가까운 정도 (0~1) */
  return (inside, under = 0) => { if (!A) { if (!inside) return; init(); if (!A) return; } if (A.state !== 'running') return; const t = A.currentTime;
    if (!!inside !== !!on) { on = inside ? 1 : 0; M.gain.cancelScheduledValues(t); M.gain.setTargetAtTime(on * .9, t, inside ? .5 : .35); }
    if (!on) return; if (t > nextDrip) { drip(t + .01); nextDrip = t + 1.2 + Math.random() * 3.2; }
    if (under > .05 && t > nextThud) { thud(t + .01, under); nextThud = t + .5 + Math.random() * (2.5 - under * 1.5); } }; }

