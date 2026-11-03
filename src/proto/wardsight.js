/* 맵 위 와드 10개 + 차지 · 와드 시야 물결
   · 자리: 샛길과 바깥 둥근 길이 만나는 길목, 보물 땅 앞문 바로 앞 (보물 땅 줄 MID 각도, 반지름 약 96m)
   · 차지: 내 기체가 와드 둘레 5m 안에 10초 머묾 → 빛 원이 차오름. 벗어나면 빠르게 줄어 처음부터 (맞으면 끊김은 적이 생기면 연결)
   · 차지 완료: 와드 효과(빛 원 닫힘 → 힘이 치솟음 → 꼭대기에서 눈 뜸) → 그 순간 땅을 따라 빛 물결이 퍼짐
     물결은 그 와드가 밝히는 땅에만 퍼짐 = 앞 보물 땅 + 양옆 정글 둘 + 와드 둘레 길목 + 와드 옆 샛길 끝까지(안쪽 둥근 길까지) (사용자: 파동이 밝히는 지역만)
     벽을 돌아 실제로 갈 수 있는 길을 따라 빠르게 번지고(초속 약 45m), 물결이 지나간 칸부터 차례로 안개 시야가 걷힘 (사용자: 순서대로 보이게)
     걷힌 곳은 계속 보임(그 와드가 내 것인 동안) · 그 안의 숨을 곳 속도 보임
   무게: 길 거리 계산은 와드마다 처음 한 번(250×250 칸) · 물결 그림은 바닥 위 한 장 */
import * as THREE from 'three';
import { makeWard, WCOL } from './ward.js?v=11032049';

const A0 = -Math.PI / 2, ANG = Array.from({ length: 10 }, (_, k) => A0 + k * Math.PI / 5), MID = ANG.map(a => a + Math.PI / 10);
const angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const WARDS = { R: 96, CAP: 10, NEAR: 5, SPEED: 45 };

/* 작은 최소 힙 (거리 순으로 칸 꺼내기) */
function heap() { const a = [], d = []; return { push(i, v) { a.push(i); d.push(v); let k = a.length - 1; while (k) { const p = (k - 1) >> 1; if (d[p] <= d[k]) break; [a[p], a[k]] = [a[k], a[p]]; [d[p], d[k]] = [d[k], d[p]]; k = p; } },
  pop() { const top = a[0], tv = d[0], li = a.pop(), lv = d.pop(); if (a.length) { a[0] = li; d[0] = lv; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < a.length && d[l] < d[m]) m = l; if (r < a.length && d[r] < d[m]) m = r; if (m === k) break; [a[m], a[k]] = [a[k], a[m]]; [d[m], d[k]] = [d[k], d[m]]; k = m; } } return [top, tv]; }, get size() { return a.length; } }; }

export function makeWardsOnMap(B, vision, uT) {
  const G = new THREE.Group(), N = vision.N, cm = vision.cellM, W = vision.W;
  const cx = i => -W / 2 + (i + .5) * cm;
  /* 와드 자리 */
  const list = MID.map((m, k) => { let r = WARDS.R; while (r > 80 && B.blocked(Math.cos(m) * r, Math.sin(m) * r)) r -= 1;
    const w = makeWard(uT); w.position.set(Math.cos(m) * r, 0, Math.sin(m) * r); w.rotation.y = Math.atan2(-Math.cos(m), -Math.sin(m));   /* 정면(주황 세모)이 가운데 쪽을 봄 */
    G.add(w); return { k, m, w, x: w.position.x, z: w.position.z, field: null, order: null, waveT: -1, ptr: 0 }; });
  /* 와드가 밝히는 땅: 앞 보물 땅 + 양옆 정글 둘 + 와드 둘레 길목. 물결은 그쪽 부채꼴 안의 다닐 수 있는 땅을 따라 번짐 */
  function build(o) {
    const D = new Float64Array(N * N).fill(Infinity)   /* 64비트: 32비트면 저장할 때 반올림돼 '더 먼 길'로 잘못 보고 못 퍼짐 */, H = heap(), inR = new Uint8Array(N * N), pass = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = cx(i), z = cx(j), c = j * N + i, r = Math.hypot(x, z), dm = angD(Math.atan2(z, x), o.m);
      if (dm > Math.PI / 5 + .05 || r < 30 || r > 160) continue; const free = !B.blocked(x, z), rg = B.region(x, z);
      if (free) pass[c] = 1;
      const side = Math.abs(-x * Math.sin(o.m) + z * Math.cos(o.m)), along = x * Math.cos(o.m) + z * Math.sin(o.m);     /* 와드 옆 샛길: 와드가 그 길 위에 서 있으니 안쪽 둥근 길까지 끝까지 보임 (사용자) */
      if ((rg >= 11 && rg <= 15 && dm < Math.PI / 10) || (rg === 3 && dm < Math.PI / 5) || Math.hypot(x - o.x, z - o.z) < 26 || (side < 6.5 && along > 30 && along < 100)) inR[c] = 1; }
    const si = Math.floor((o.x + W / 2) / cm), sj = Math.floor((o.z + W / 2) / cm), s = sj * N + si; D[s] = 0; H.push(s, 0);
    const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (H.size) { const [c, d] = H.pop(); if (d > D[c]) continue; const i = c % N, j = (c / N) | 0;
      for (const [di, dj, w] of NB) { const i2 = i + di, j2 = j + dj; if (i2 < 0 || j2 < 0 || i2 >= N || j2 >= N) continue; const c2 = j2 * N + i2, nd = d + w * cm;
        if (!pass[c2]) { if (nd < D[c2] && pass[c]) D[c2] = nd; continue; }                                                     /* 벽 앞면까지는 닿되 넘지 않음 */
        if (nd < D[c2]) { D[c2] = nd; H.push(c2, nd); } } }
    /* 보일 칸 = 밝히는 땅 안에서 닿은 칸 + 그 칸에 붙은 벽 */
    const cells = [];
    for (let c = 0; c < N * N; c++) { if (!isFinite(D[c])) continue; let ok = inR[c]; if (!ok && !pass[c]) { const i = c % N, j = (c / N) | 0; for (const [di, dj] of NB) { const c2 = (j + dj) * N + (i + di); if (c2 >= 0 && c2 < N * N && inR[c2] && pass[c2]) { ok = 1; break; } } } if (ok) cells.push(c); }
    cells.sort((a, b) => D[a] - D[b]); o.field = D; o.order = cells; o.maxD = cells.length ? D[cells[cells.length - 1]] : 1;
    /* 물결 그림용 거리 지도 (밝히는 땅만, 나머지 255) */
    const t8 = new Uint8Array(N * N).fill(255); for (const c of cells) t8[c] = Math.min(254, D[c] / o.maxD * 254);
    o.tex = new THREE.DataTexture(t8, N, N, THREE.RedFormat); o.tex.minFilter = o.tex.magFilter = THREE.LinearFilter; o.tex.needsUpdate = true; }
  /* 물결: 바닥 위 한 장 — 지나가는 앞머리는 밝은 띠, 지나간 자리는 잠깐 은은히 남았다 사라짐 */
  const waveMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uD: { value: null }, uMax: { value: 1 }, uFront: { value: -99 }, uCol: { value: WCOL.mine.clone() }, uT: { value: 0 }, uI: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform sampler2D uD; uniform float uMax, uFront, uT, uI; uniform vec3 uCol; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 uv = vec2(vU.x, 1. - vU.y); float v = texture2D(uD, uv).r; float inside = smoothstep(.998, .975, v);          /* 밝히는 땅 가장자리는 부드럽게 (칸 모양이 안 보이게) */
        if (inside <= 0.) discard; float d = min(v, .996) * 254. / 255. * uMax + (n(uv * 900.) - .5) * 2.2;                          /* 앞머리가 매끈한 동그라미가 아니라 물결지게 */
        float q = (d - uFront) / 2.2, front = exp(-q * q) * step(d, uFront + 5.);
        float trail = step(d, uFront) * exp(-(uFront - d) * .12) * .35;                                                              /* 바로 뒤만 잠깐 남음 */
        float ripple = .7 + .3 * sin(d * 1.3 - uT * 12.);
        gl_FragColor = vec4((uCol * uCol * 1.5 + .3) * (front * 1.6 * ripple + trail) * uI * inside, 1.); }` });
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(W, W), waveMat); wave.rotation.x = -Math.PI / 2; wave.position.y = .25; wave.renderOrder = 6; wave.visible = false; G.add(wave);
  let active = null;
  list.forEach(o => { o.w.userData.onHit = t => { if (!o.field) build(o); o.waveT = t; o.ptr = 0; active = o; waveMat.uniforms.uD.value = o.tex; waveMat.uniforms.uMax.value = o.maxD; wave.visible = true; }; });
  G.userData.list = list;
  G.userData.update = (t, dt, px, pz) => {
    for (const o of list) { const S = o.w.userData.S, near = Math.hypot(px - o.x, pz - o.z) < WARDS.NEAR;
      if (S.own !== 'mine') { if (near) { if (S.cap < 0) { S.cap = 0; if (!o.field) build(o); } S.cap = Math.min(1, S.cap + dt / WARDS.CAP); if (S.cap >= 1) { S.cap = -1; S.own = 'mine'; o.w.userData.complete(t); } }
        else if (S.cap >= 0) { S.cap -= dt * .6; if (S.cap <= 0) S.cap = -1; } }                                                     /* 벗어나면 빠르게 줄어듦 */
      o.w.userData.update(t, dt);
      if (o.waveT >= 0) { const front = (t - o.waveT) * WARDS.SPEED;                                                                 /* 물결이 지나간 칸부터 시야가 걷힘 */
        while (o.ptr < o.order.length && o.field[o.order[o.ptr]] <= front) vision.reveal(o.order[o.ptr++]);
        if (o === active) { waveMat.uniforms.uFront.value = front; waveMat.uniforms.uT.value = t; waveMat.uniforms.uI.value = Math.max(0, 1 - Math.max(0, front - o.maxD) / 30); if (front > o.maxD + 30) { wave.visible = false; active = null; } }
        if (o.ptr >= o.order.length && front > o.maxD + 30) o.waveT = -1; } } };
  G.userData.nearest = (px, pz) => { let b = null, bd = 1e9; for (const o of list) { const d = Math.hypot(px - o.x, pz - o.z); if (d < bd) { bd = d; b = o; } } return [b, bd]; };
  return G;
}
