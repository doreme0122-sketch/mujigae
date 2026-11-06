/* 넓은 땅 (사용자 2026-11-06: 몬스터 있는 곳·정글은 대지가 더 넓어야 함 · 기존 모델로 비슷한 퀄리티를 가볍게)
   · 땅 판은 새로 만들되 그림체는 받은 초원 섬 그대로: 각진 풀밭 윗면(색은 받은 섬의 풀색·흙색에서 뽑음) · 흙 자리 ·
     가장자리 풀 턱 · 층층이 안쪽으로 깎여 내려가는 바위 몸통(받은 섬의 바위색, 아래로 갈수록 어둡게) · 끝은 뾰족한 용골
   · 면은 평평하게(로우폴리) · 꼭짓점 색은 면마다 하나 → 같은 칠 방식으로 그려짐
   · 꾸밈(나무·덤불·바위·풀꽃·늘어진 뿌리)은 받은 섬에서 떼어 낸 원래 모델을 올림 (meadow.js에서) */
import * as THREE from 'three';

const rnd = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const smooth = t => t * t * (3 - 2 * t);
/* 둘레를 따라 매끈하게 이어지는 들쭉날쭉 (각도 → -1..1) */
const ring = (R, n) => { const v = Array.from({ length: n }, () => R() * 2 - 1); return a => { const x = (a / (Math.PI * 2)) * n, i = Math.floor(x), f = smooth(x - i); return v[((i % n) + n) % n] * (1 - f) + v[(((i + 1) % n) + n) % n] * f; }; };
/* 평면 값 잡음 */
const field = (R, cell) => { const H = new Map(), h = (i, j) => { const k = i * 7919 + j; if (!H.has(k)) H.set(k, R()); return H.get(k); };
  return (x, z) => { const u = x / cell, v = z / cell, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
    return (h(i, j) * (1 - fu) + h(i + 1, j) * fu) * (1 - fv) + (h(i, j + 1) * (1 - fu) + h(i + 1, j + 1) * fu) * fv; }; };

/* 받은 섬에서 색 뽑기: 위를 보는 면 = 풀·흙 · 옆을 보는 면 = 바위 (많이 쓰인 색 순) */
export function paletteFrom(prims) {
  const up = new Map(), side = new Map(), c = new THREE.Color(), n = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (const p of prims) { if (p.mat !== 'Terrain') continue; const P = p.geo.attributes.position, C = p.geo.attributes.color, I = p.geo.index;
    for (let i = 0; i < I.count; i += 3) { const i0 = I.getX(i), i1 = I.getX(i + 1), i2 = I.getX(i + 2);
      a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); d.fromBufferAttribute(P, i2); n.crossVectors(b.sub(a), d.sub(a)); const ar = n.length(); if (ar < 1e-6) continue; n.divideScalar(ar);
      c.setRGB(C.getX(i0), C.getY(i0), C.getZ(i0)); const key = c.getHex(), M = n.y > .8 ? up : Math.abs(n.y) < .45 ? side : null; if (M) M.set(key, (M.get(key) || 0) + ar); } }
  const top = (M, k) => [...M.entries()].sort((p, q) => q[1] - p[1]).slice(0, k).map(([h]) => new THREE.Color(h));
  const ups = top(up, 10), green = ups.filter(x => x.g > x.r * 1.08), dirt = ups.filter(x => x.r >= x.g * .98);
  return { grass: green.length ? green : ups, dirt: dirt.length ? dirt : [new THREE.Color(.42, .3, .2)], rock: top(side, 8) };
}

/* 땅 한 판 → Terrain 한 덩어리 (위 = y 0 근처 · 아래로 약 10m) */
export function makeLand(seed, radius, pal, opt = {}) {
  const R = rnd(seed), edge = ring(R, 11), edge2 = ring(R, 23), bump = field(R, radius * .45), patch = field(R, Math.max(2.5, radius * .2)), tint = field(R, 2.2);
  const NA = Math.max(40, Math.round(radius * 4.6)), rad = a => radius * (1 + edge(a) * .16 + edge2(a) * .06);
  const pos = [], col = [], C = new THREE.Color();
  const pick = (list, t) => list[Math.min(list.length - 1, Math.floor(t * list.length))];
  const tri = (A, B, D, c) => { pos.push(...A, ...B, ...D); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b); };
  const clear = opt.clear || 0;   /* 가운데 평평하게 비울 반지름 (둥지·싸움 자리) */
  /* 윗면: 가운데 → 가장자리로 고리를 몇 겹, 고리마다 점을 조금씩 흔듦 */
  const RINGS = [0, .1, .19, .28, .37, .46, .55, .63, .71, .78, .85, .91, .96, 1];
  const pts = RINGS.map((f, ri) => { const n = ri === 0 ? 1 : Math.max(8, Math.round(NA * Math.min(1, f + .15))), ph = R() * 6.28;
    return Array.from({ length: n }, (_, k) => { const a = ri === 0 ? 0 : ph + (k + (R() - .5) * .5) / n * Math.PI * 2, rr = ri === 0 ? 0 : rad(a) * f * (ri === RINGS.length - 1 ? 1 : 1 + (R() - .5) * .06);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, dc = Math.hypot(x, z), flat = clear ? smooth(Math.min(1, Math.max(0, (dc - clear) / 3))) : 1;
      const y = ((bump(x, z) - .5) * .7 + (R() - .5) * .12) * flat * (1 - smooth(Math.max(0, f - .85) / .15) * .6) - (f >= 1 ? .12 : 0);
      return { a: ri === 0 ? 0 : a, p: [x, y, z] }; }).sort((p, q) => p.a - q.a); });
  const grassCol = (x, z) => { const t = tint(x, z), d = patch(x, z); if (!opt.noDirt && d > .8) return C.copy(pick(pal.dirt, (t * 1.7) % 1)).multiplyScalar(.95 + t * .1);
    return C.copy(pick(pal.grass, t)).multiplyScalar(.93 + (R() * .1)); };
  const face = (A, B, D) => { const cx = (A[0] + B[0] + D[0]) / 3, cz = (A[2] + B[2] + D[2]) / 3; tri(A, B, D, grassCol(cx, cz)); };
  /* 고리 사이 띠: 각도 순으로 두 고리를 지퍼처럼 엮음 */
  const zip = (I, O) => { if (I.length === 1) { for (let k = 0; k < O.length; k++) face(I[0].p, O[(k + 1) % O.length].p, O[k].p); return; }
    let i = 0, o = 0; const ni = I.length, no = O.length, ang = (L, k) => L[k % L.length].a + Math.floor(k / L.length) * Math.PI * 2;
    while (i < ni || o < no) { const ai = ang(I, i + 1), ao = ang(O, o + 1);
      if (o >= no || (i < ni && ai < ao)) { face(I[i % ni].p, I[(i + 1) % ni].p, O[o % no].p); i++; } else { face(I[i % ni].p, O[(o + 1) % no].p, O[o % no].p); o++; } } };
  for (let r = 0; r < pts.length - 1; r++) zip(pts[r], pts[r + 1]);
  const TOPN = pos.length;
  /* 가장자리 풀 턱: 윗면 끝에서 살짝 바깥·아래로 접힌 진한 풀 */
  const rim = pts[pts.length - 1], lip = rim.map(q => { const [x, y, z] = q.p, k = 1.03; return { a: q.a, p: [x * k, y - .38, z * k] }; });
  for (let k = 0; k < rim.length; k++) { const A = rim[k].p, B = rim[(k + 1) % rim.length].p, A2 = lip[k].p, B2 = lip[(k + 1) % rim.length].p, g = C.copy(pick(pal.grass, .85)).multiplyScalar(.78);
    tri(A, A2, B, g); tri(B, A2, B2, g.clone().multiplyScalar(.96)); }
  /* 바위 몸통: 층마다 안쪽으로 깎이며 내려감 · 층 끝마다 살짝 튀어나온 턱 · 아래로 갈수록 어둡게 */
  const TIERS = [[-.38, -2.4, 1.03, .93], [-2.4, -2.7, .93, .97], [-2.7, -5.0, .97, .78], [-5.0, -5.2, .78, .8], [-5.2, -7.6, .8, .5], [-7.6, -10.5, .5, .06]];
  const prof = rim.map(q => ({ a: q.a, r: Math.hypot(q.p[0], q.p[2]) / (Math.hypot(Math.cos(q.a), Math.sin(q.a)) || 1) }));
  const jag = ring(R, 37);
  let prev = lip.map(q => q.p);
  TIERS.forEach(([y0, y1, k0, k1], ti) => { const ROWS = ti % 2 ? 1 : 2;
    for (let row = 1; row <= ROWS; row++) { const u = row / ROWS, y = y0 + (y1 - y0) * u, kk = k0 + (k1 - k0) * u;
      const next = prof.map((q, i) => { const j = 1 + jag(q.a + ti * 1.7 + row) * .07 + (R() - .5) * .05, r = q.r * kk * j * (ti === TIERS.length - 1 && row === ROWS ? .05 : 1);
        return [Math.cos(q.a) * r, y + (R() - .5) * .35 * (ti < TIERS.length - 1 ? 1 : 0), Math.sin(q.a) * r]; });
      for (let k = 0; k < next.length; k++) { const A = prev[k], B = prev[(k + 1) % prev.length], A2 = next[k], B2 = next[(k + 1) % next.length];
        const dark = 1 - (ti / TIERS.length) * .38, rc = C.copy(pick(pal.rock, (tint(Math.cos(prof[k].a) * 9 + ti, y) * 1.3) % 1)).multiplyScalar(dark * (.92 + R() * .12));
        const moss = ti === 1 && R() < .5; if (moss) rc.lerp(pick(pal.grass, .6), .45);     /* 첫 턱 위엔 이끼 */
        tri(A, A2, B, rc); tri(B, A2, B2, rc.clone().multiplyScalar(.95)); }
      prev = next; } });
  /* 면 방향 맞추기: 윗면은 위로 · 옆면은 바깥으로 (그리는 쪽이 앞면) */
  for (let i = 0; i < pos.length; i += 9) { const ax = pos[i], ay = pos[i + 1], az = pos[i + 2], ux = pos[i + 3] - ax, uy = pos[i + 4] - ay, uz = pos[i + 5] - az, vx = pos[i + 6] - ax, vy = pos[i + 7] - ay, vz = pos[i + 8] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, cx = (ax + pos[i + 3] + pos[i + 6]) / 3, cz = (az + pos[i + 5] + pos[i + 8]) / 3;
    const bad = i < TOPN ? ny < 0 : (nx * cx + nz * cz) < 0;
    if (bad) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();   /* 겹친 점이 없으므로 면 법선 = 평평한 면 */
  const ix = new Uint32Array(pos.length / 3); for (let i = 0; i < ix.length; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1));
  return { geo: g, rim: rim.map(q => q.p), lip: lip.map(q => q.p), radius, rad };
}
