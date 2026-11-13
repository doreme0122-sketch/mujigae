/* 보물 동굴 아래층 맵 — 이어진 땅을 자르지 않고 따로 완성한 한 덩어리 (사용자 2026-11-14)
   · 생김새는 기존 보물 동굴 그대로 이어감: 같은 S자 굽이 길 · 같은 보물방 자리 · 같은 칠(이끼 낀 바위 · 풀 바닥) · 입구는 기존 앙코르풍 유적 문
   · 새로 만든 것: 바닥 한 장 + 길 · 방 테두리를 따라 한 장으로 이어 세운 바위 벽 (속이 찬 덩어리처럼 앞면 · 꼭대기 턱 · 윗면 · 바깥면)
   · 벽 높이: 바깥 산 높이와 상관없이 일정 — 꼭대기 = 3층 나는 높이보다 위 (모두 같은 높이 · 꼭대기 선 수평)
   · 카메라 쪽 벽(바닥보다 화면 아래쪽 = 남쪽)은 처음부터 무릎 높이 바위 담으로 (보이는 높이만 낮음 · 판정은 그대로 막힘)
   · 천장 없음 · 바깥 산(덮개)은 동굴 안에서 통째로 숨음 (엔진 규칙) · 덮개 산 새로 만들기는 이 맵 오케이 뒤
   · 칠은 엔진 땅 칠과 같은 것을 씀 (기존 동굴과 같은 느낌) — 동굴 안에서만 그려짐
   · 단위: 섬 안 단위 (게임에서 0.5배 = m) */

const fract = x => x - Math.floor(x), sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (i, j) => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);
const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };
const fbm = (x, y, o = 3) => { let s = 0, a = .5, f = 1; for (let k = 0; k < o; k++) { s += a * noise(x * f + k * 17.3, y * f - k * 9.1); f *= 2.03; a *= .5; } return s; };

export const CAVEMAP = { TOP: 15, KNEE: 1.6, CAP: 5.4, STEP: 1, ENTER_T: .012 };   /* 꼭대기 = 3층(12.4) 위 · 무릎 0.8m · 윗면 폭 2.7m · 벽 칸 0.5m (가볍게) */

/* 걸어 다니는 곳 (양수 = 안): 기존 골짜기 · 보물방 그대로 (판정과 같은 자리) */
const regionOf = (F, i) => (x, z) => Math.max(F.gorgeI(i, x, z).d, F.basinI(i, x, z));

/* 테두리 한 줄: 네모 칸 0.5로 따고 → 가장 긴 고리 → 입구(길 첫머리)에서 끊어 열린 줄 → 부드럽게 · 고른 간격 */
function outline(F, i, g) {
  const b = F.gorgeBB(i), x0 = b[0] - 30, x1 = b[1] + 30, z0 = b[2] - 30, z1 = b[3] + 30, S = .5, NX = Math.ceil((x1 - x0) / S) + 1, NZ = Math.ceil((z1 - z0) / S) + 1, V = new Float32Array(NX * NZ);
  for (let j = 0; j < NZ; j++) for (let k = 0; k < NX; k++) V[j * NX + k] = g(x0 + k * S, z0 + j * S);
  const segs = [], P = (k, j) => [x0 + k * S, z0 + j * S], lerp = (a, c, fa, fc) => { const t = fa / (fa - fc); return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]; };
  for (let j = 0; j < NZ - 1; j++) for (let k = 0; k < NX - 1; k++) { const c = [[k, j], [k + 1, j], [k + 1, j + 1], [k, j + 1]], fv = c.map(([a, q]) => V[q * NX + a]), pts = [];
    for (let e = 0; e < 4; e++) { const a = e, q = (e + 1) % 4; if ((fv[a] > 0) !== (fv[q] > 0)) pts.push(lerp(P(...c[a]), P(...c[q]), fv[a], fv[q])); }
    if (pts.length === 2) segs.push(pts); else if (pts.length === 4) { segs.push([pts[0], pts[1]]); segs.push([pts[2], pts[3]]); } }
  const key = p => p[0].toFixed(3) + ',' + p[1].toFixed(3), adj = new Map();
  for (const [a, c] of segs) for (const [p, q] of [[a, c], [c, a]]) { const k = key(p); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(q); }
  const used = new Set(); let best = [];
  for (const [a] of segs) { if (used.has(key(a))) continue; const loop = [a]; used.add(key(a)); let cur = a;
    for (;;) { const nx = (adj.get(key(cur)) || []).find(q => !used.has(key(q))); if (!nx) break; used.add(key(nx)); loop.push(nx); cur = nx; }
    if (loop.length > best.length) best = loop; }
  /* 입구에서 끊기: 길 맨 첫머리(유적 문 앞)만 비움 — 벽 끝은 유적 문 기둥 속으로 들어가 끝 단면이 안 보임 */
  const n = best.length, isGate = p => { const q = F.gorgeI(i, p[0], p[1]); return q.t < CAVEMAP.ENTER_T && q.d > -12 && F.basinI(i, p[0], p[1]) < -12; }, gate = best.map(isGate);
  const st = gate.findIndex((c, k) => c && !gate[(k + 1) % n]); let line = [];
  if (st < 0) line = best; else for (let k = 1; k <= n; k++) { const p = best[(st + k) % n]; if (isGate(p)) break; line.push(p); }
  for (let it = 0; it < 40; it++) line = line.map((p, k) => k === 0 || k === line.length - 1 ? p : [(line[k - 1][0] + 2 * p[0] + line[k + 1][0]) / 4, (line[k - 1][1] + 2 * p[1] + line[k + 1][1]) / 4]);
  const acc = [0]; for (let k = 1; k < line.length; k++) acc.push(acc[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
  const TL = acc[acc.length - 1], out = []; let k = 0;
  for (let s = 0; s <= TL; s += CAVEMAP.STEP) { while (k < acc.length - 2 && acc[k + 1] < s) k++; const t = (s - acc[k]) / Math.max(1e-6, acc[k + 1] - acc[k]); out.push([line[k][0] + (line[k + 1][0] - line[k][0]) * t, line[k][1] + (line[k + 1][1] - line[k][1]) * t]); }
  return out;
}

/* 길이 방향으로 부드럽게 (반지름 r칸 평균) */
const smooth1 = (A, r) => A.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - r); k <= Math.min(A.length - 1, i + r); k++) { s += A[k]; n++; } return s / n; });

export function buildCaveMap(THREE, isle) {
  const F = isle.field, G = new THREE.Group(); G.name = 'caveMap';
  const low = isle.group.getObjectByName('caveLower'); if (!low) return null;
  const mat = low.material, info = [];   /* 엔진 땅과 같은 칠 (동굴 안에서만 그려짐) */
  const { TOP, KNEE, CAP } = CAVEMAP;
  for (let i = 0; i < F.gorges.length; i++) {
    const id = i + 1, g = regionOf(F, i), pts = outline(F, i, g), N = pts.length; if (N < 8) continue;
    /* 바깥 방향 (걸어 다니는 곳 반대쪽) */
    const NR = pts.map((p, k) => { const a = pts[Math.max(0, k - 1)], c = pts[Math.min(N - 1, k + 1)], tx = c[0] - a[0], tz = c[1] - a[1], l = Math.hypot(tx, tz) || 1; return [tz / l, -tx / l]; });
    { let s = 0; for (let k = 0; k < N; k += 5) { const [x, z] = pts[k], [nx, nz] = NR[k]; s += g(x - nx, z - nz) - g(x + nx, z + nz); } if (s < 0) for (const n of NR) { n[0] = -n[0]; n[1] = -n[1]; } }
    { const ax = smooth1(NR.map(n => n[0]), 7), az = smooth1(NR.map(n => n[1]), 7); for (let k = 0; k < N; k++) { const l = Math.hypot(ax[k], az[k]) || 1; NR[k] = [ax[k] / l, az[k] / l]; } }
    /* 바닥 높이 (벽 바로 앞) · 카메라 쪽 정도 (바깥이 남쪽 = 화면 아래를 보면 낮은 담) */
    const FY = smooth1(pts.map(([x, z], k) => isle.hAtL(x - NR[k][0] * 1.4, z - NR[k][1] * 1.4)), 4), FY0 = FY.reduce((a, b) => a + b, 0) / N;
    /* 낮은 담 = 이 벽이 카메라(남쪽)에서 바닥을 가리는 곳: 벽 자리에서 12시 쪽(−z)으로 높은 벽이 가리는 거리(약 8m) 안에 걸어 다니는 곳이 있으면 낮춤
       (자기 길 쪽이든 굽이 너머 다음 길이든 똑같이 — 화면에서 바닥이 안 가려지게) */
    const HIDE = (TOP - FY0) / Math.tan(56 * Math.PI / 180) + 4, KN0 = pts.map(([x, z], k) => { const [nx, nz] = NR[k]; for (let d = .5; d < HIDE + CAP; d += .5) { const sx = x + nx * Math.min(d, CAP) * 0, zz = z - d; if (g(x, zz) > 0) return 1; } return 0; });
    const KN = smooth1(smooth1(KN0, 6), 6).map(v => sm(.15, .85, v));
    const S = [0]; for (let k = 1; k < N; k++) S.push(S[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    /* 단면 (바깥으로 o, 바닥에서 위로 u 비율) — 앞면 줄들 · 꼭대기 턱 · 평평한 윗면 · 바깥면 */
    const FACE = 22, PROF = [];
    for (let r = 0; r <= FACE; r++) PROF.push({ face: 1, u: r / FACE, o: 0 });
    PROF.push({ face: .35, top: 1, o: .35, dy: -.12 }, { face: .15, top: 1, o: .9, dy: 0 });
    for (const o of [1.6, 2.4, 3.2, 4.0, 4.7, CAP]) PROF.push({ face: 0, top: 1, cap: 1, o, dy: 0 });
    PROF.push({ face: 0, top: 1, o: CAP + .5, dy: -.5, out: 1 }, { face: 0, o: CAP + .9, u: .55, out: 1 }, { face: 0, o: CAP + 1, u: 0, out: 1 });
    const M = PROF.length, pos = new Float32Array(N * M * 3), AW = new Float32Array(N * M * 4), AL = new Float32Array(N * M * 2), CV = new Float32Array(N * M * 3), REC = new Float32Array(N * M), idx = [];
    for (let k = 0; k < N; k++) { const s = S[k], [x, z] = pts[k], [nx, nz] = NR[k], fy = FY[k], kn = KN[k], top = TOP * (1 - kn) + (fy + KNEE) * kn, H = top - fy, ph = fbm(s * .02 + 7, 1.3, 2) * 1.5;
      let dTop = 0;
      for (let r = 0; r < M; r++) { const p = PROF[r]; let o = p.o, y, d = 0;
        if (p.face === 1) { const yRel = -1.2 + p.u * (H + 1.2 - .25); y = fy + yRel;
          /* 앞면 바위 결: 큰 불룩함 · 가로 층 턱 · 층마다 바위 덩이 · 잔 결 · 밑동 퍼짐 · 위로 살짝 뒤로 (낮은 담은 결을 작게) */
          const L = yRel / 2.4 + ph, band = Math.floor(L), amp = .45 + .55 * (1 - kn);
          const big = (fbm(s * .03, yRel * .04 + 3, 3) - .5) * 2.6, ledge = (sm(.72, .96, fract(L)) - .5) * .8, block = (noise(s * .1 + band * 5.3, band * 1.7) - .5) * 1.1, fine = (noise(s * .8, yRel * .8) - .5) * .25;
          const flare = -1.8 * (1 - sm(-1.2, 2.4, yRel)), lean = Math.max(0, yRel) * .035, rim = 1 - .55 * sm(H - 2.4, H - .2, yRel);   /* 꼭대기 바로 밑은 결을 줄여 꼭대기 선이 반듯 */
          d = (big + ledge + block + fine) * amp * rim + flare + lean; REC[k * M + r] = (ledge + block + fine) * amp * rim + flare * .3;
          if (r === FACE) dTop = d; }
        else { y = p.out && p.u !== undefined ? fy - .4 + p.u * (top - fy) : top + (p.dy || 0); d = dTop * (p.cap ? Math.max(0, 1 - (o - 1.6) / 4) : 1) + (p.cap ? (noise(s * .25, o * 1.3) - .5) * .5 : 0); }   /* 윗면 높이는 정확히 같게 · 가장자리 선만 살짝 들고 남 */
        const q = (k * M + r) * 3, oo = o + d; pos[q] = x + nx * oo; pos[q + 1] = y; pos[q + 2] = z + nz * oo;
        CV[q] = id; CV[q + 1] = p.top ? 1 : 0; CV[q + 2] = p.out ? 1 : p.cap ? sm(2.6, CAP, o) * .92 : 0; } }
    for (let k = 0; k < N - 1; k++) for (let r = 0; r < M - 1; r++) { const a = k * M + r, c = a + M; idx.push(a, a + 1, c, a + 1, c + 1, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    { /* 면이 걸어 다니는 쪽을 보는지 확인 (아니면 뒤집기) */ const nn = geo.attributes.normal; let ok = 0; for (let k = 2; k < N - 2; k += 9) { const v = k * M + (FACE >> 1); ok += nn.getX(v) * -NR[k][0] + nn.getZ(v) * -NR[k][1]; }
      if (ok < 0) { for (let q = 0; q < idx.length; q += 3) { const t = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t; } geo.setIndex(idx); geo.computeVertexNormals(); } }
    /* 칠 무게 (풀 · 바위 · 이끼 · 흙) · 그늘 */
    const nn = geo.attributes.normal;
    for (let k = 0; k < N; k++) for (let r = 0; r < M; r++) { const v = k * M + r, ny = nn.getY(v), p = PROF[r];
      let gr = 0, rk, ms, dt;
      if (p.top) { ms = .62 + .25 * sm(.4, .7, fbm(S[k] * .09, p.o * .4, 2)); rk = 1 - ms; dt = .04; gr = .06 * sm(.5, .8, noise(S[k] * .2, p.o)); }
      else { ms = sm(.42, .85, ny) * .9 + .05; rk = 1 - ms; dt = p.face === 1 && p.u < .12 ? .35 * (1 - p.u / .12) : .03; }
      const sum = gr + rk + ms + dt; AW.set([gr / sum, rk / sum, ms / sum, dt / sum], v * 4);
      AL[v * 2] = p.face === 1 ? .62 + .38 * sm(-.7, .35, REC[v]) : .95; AL[v * 2 + 1] = 1; }
    geo.setAttribute('aW', new THREE.BufferAttribute(AW, 4)); geo.setAttribute('aL', new THREE.BufferAttribute(AL, 2)); geo.setAttribute('aCv', new THREE.BufferAttribute(CV, 3)); geo.computeBoundingSphere();
    const wall = new THREE.Mesh(geo, mat); wall.name = 'caveMapWall'; G.add(wall);

    /* 바닥: 걸어 다니는 곳 + 벽 밑까지 한 장 (기존 바닥 높이 그대로 · 풀 · 흙) */
    { const b = F.gorgeBB(i), ST = 1, x0 = b[0] - 22, z0 = b[2] - 22, NX = Math.ceil((b[1] - b[0] + 44) / ST), NZ = Math.ceil((b[3] - b[2] + 44) / ST), vid = new Int32Array((NX + 1) * (NZ + 1)).fill(-1), P = [], W4 = [], L2 = [], C3 = [], ix = [];
      for (let j = 0; j <= NZ; j++) for (let k = 0; k <= NX; k++) { const x = x0 + k * ST, z = z0 + j * ST, gv = g(x, z); if (gv < -.6) continue;   /* 벽 밑동 바로 밑까지만 (낮은 담 너머로 바닥 칸이 비치지 않게) */ const q = F.gorgeI(i, x, z); if (q.t < .02 && q.d > -12 && F.basinI(i, x, z) < -12 && z > b[3] - 2) continue;
        vid[j * (NX + 1) + k] = P.length / 3; P.push(x, isle.hAtL(x, z) + .06, z); const dn = fbm(x * .05, z * .05, 3); W4.push(.72 - .2 * dn, .03, .08, .17 + .2 * dn); L2.push(.72 + .28 * sm(-.6, 3.5, gv), 1); C3.push(id, 0, 0); }
      for (let j = 0; j < NZ; j++) for (let k = 0; k < NX; k++) { const a = vid[j * (NX + 1) + k], c = vid[j * (NX + 1) + k + 1], d = vid[(j + 1) * (NX + 1) + k], e = vid[(j + 1) * (NX + 1) + k + 1]; if (a < 0 || c < 0 || d < 0 || e < 0) continue; ix.push(a, d, c, c, d, e); }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); fg.setIndex(ix); fg.computeVertexNormals();
      { const n2 = fg.attributes.normal; let up = 0; for (let v = 0; v < n2.count; v += 11) up += n2.getY(v); if (up < 0) { for (let q = 0; q < ix.length; q += 3) { const t = ix[q + 1]; ix[q + 1] = ix[q + 2]; ix[q + 2] = t; } fg.setIndex(ix); fg.computeVertexNormals(); } }
      fg.setAttribute('aW', new THREE.Float32BufferAttribute(W4, 4)); fg.setAttribute('aL', new THREE.Float32BufferAttribute(L2, 2)); fg.setAttribute('aCv', new THREE.Float32BufferAttribute(C3, 3)); fg.computeBoundingSphere();
      const fl = new THREE.Mesh(fg, mat); fl.name = 'caveMapFloor'; G.add(fl); info.push({ cave: id, wallTris: idx.length / 3, floorTris: ix.length / 3, len: +(S[N - 1] * .5).toFixed(1) }); }
  }
  isle.group.add(G);
  return { group: G, info, update: () => { if (low.visible) low.visible = false; } };   /* 땅에서 뽑던 예전 아래층은 안 씀 */
}
