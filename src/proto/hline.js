/* 파란 높이선 (사용자 2026-11-07)
   · 왜: 위에서 내려다보면 높이가 안 느껴져서, 이 구조물이 '내 높이에서' 걸리는지 알기 어려움
   · 무엇: 막히는 구조물이 기체 높이와 만나는 둘레를 끊김 없는 파란 선 하나로 그림 — 선에 닿으면 막힘, 선이 없으면 지나감
   · 막힘 판정(25cm 칸 지도)을 그대로 따라 그리므로, 보이는 선 = 실제로 막히는 자리 (지형 테두리에 붙음)
   · 보이는 거리: 기체가 향하는 앞쪽은 24m(제 속도로 약 2초 앞)부터 (훑는 범위도 앞쪽으로 치우쳐 둠), 옆·뒤는 12m부터 → 부딪히기 전에 미리 알고, 화면은 어지럽지 않게
   · 멀리선 가늘고 은은하게 → 다가갈수록 두꺼워지고 밝아짐 (얼마나 가까운지 선만 봐도 앎)
   · 구조물 뒤로 가려지지 않게 늘 위에 그림(둘레 전체가 보여야 어디까지 막히는지 앎) · 무지개 벽·기지엔 안 그림 */
import * as THREE from 'three';

export function makeHeightLine(scene, blocked, Y) {
  const H = .25, RAD = 15.5, AHEAD = 9, M = Math.round(RAD * 2 / H) + 1, MAXP = 7000;
  const raw = new Uint8Array(M * M), f = new Float32Array(M * M), tmp = new Float32Array(M * M);
  const pos = new Float32Array(MAXP * 2 * 3), nrm = new Float32Array(MAXP * 2 * 2), side = new Float32Array(MAXP * 2), idx = new Uint32Array(MAXP * 6);
  for (let i = 0; i < MAXP; i++) side.set([-1, 1], i * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aN', new THREE.BufferAttribute(nrm, 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage)); g.setDrawRange(0, 0);
  const U = { uShip: { value: new THREE.Vector3() }, uHead: { value: new THREE.Vector2(0, -1) } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aN; attribute float aSide; uniform vec3 uShip; uniform vec2 uHead; varying float vS, vK;
      void main(){ vec2 d = position.xz - uShip.xz; float r = length(d), face = max(0., dot(d / max(r, .001), uHead));
        float range = mix(12., 24., face * face);                       /* 앞쪽은 멀리서부터, 옆·뒤는 가까이서만 */
        float k = smoothstep(range, range * .2, r); vK = k;              /* 0 = 막 보이기 시작 → 1 = 코앞 */
        float w = .04 + .11 * k * k;                                    /* 다가갈수록 두꺼워짐 */
        vec3 p = position; p.xz += aN * aSide * (w + .18 * k);           /* 바깥 번짐 몫까지 띠를 넓힘 */
        vS = aSide * (w + .18 * k) / max(w, .001);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: `varying float vS, vK;
      void main(){ float x = abs(vS); float core = 1. - smoothstep(.55, 1., x);   /* 또렷한 심 */
        float halo = exp(-(x - 1.) * (x - 1.) * .8) * step(1., x) * .25 * vK;      /* 가까울 때만 은은한 번짐 */
        float a = smoothstep(0., .3, vK) * (.55 + .75 * vK) * (core + halo);                          /* 다가갈수록 밝아짐 */
        gl_FragColor = vec4(vec3(.32, .7, 1.25) * a, 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 20; scene.add(mesh);
  const EP = new Float32Array(M * M * 2 * 2), link = new Int32Array(M * M * 2 * 2), used = new Uint8Array(M * M * 2), segs = [];
  let lx = 1e9, lz = 1e9, lh = 1e9, acc = 0;
  const rebuild = (sx, sz, head) => { lx = sx; lz = sz; lh = head;
    const cx = Math.round((sx - Math.sin(head) * AHEAD) / H) * H, cz = Math.round((sz - Math.cos(head) * AHEAD) / H) * H, x0 = cx - RAD, z0 = cz - RAD;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) raw[j * M + i] = blocked(x0 + i * H, z0 + j * H) ? 1 : 0;
    for (let k = 0; k < M * M; k++) f[k] = raw[k];   /* 흐리기 없음: 작은 돌기 하나도 선이 생기게 (막히는 칸 = 선 안쪽, 정확히 같음) · 각진 계단 모양은 아래 다듬기 두 번으로 둥글게 */
    /* 경계선(0.5)이 지나는 칸 변마다 점 하나 · 선분 = 두 변을 잇는 것 → 이어 붙여 한 줄로 */
    link.fill(-1); segs.length = 0;
    const eid = (i, j, v) => ((j * M + i) << 1) | v, put = (e, va, vb, xa, za, xb, zb) => { const t = (.5 - va) / (vb - va); EP[e * 2] = xa + (xb - xa) * t; EP[e * 2 + 1] = za + (zb - za) * t; return e; };
    const join = (a, b) => { segs.push(a, b); if (link[a * 2] < 0) link[a * 2] = b; else link[a * 2 + 1] = b; if (link[b * 2] < 0) link[b * 2] = a; else link[b * 2 + 1] = a; };
    for (let j = 0; j < M - 1; j++) for (let i = 0; i < M - 1; i++) {
      const a = f[j * M + i], b = f[j * M + i + 1], c = f[(j + 1) * M + i + 1], d = f[(j + 1) * M + i]; const code = (a > .5) | (b > .5) << 1 | (c > .5) << 2 | (d > .5) << 3; if (code === 0 || code === 15) continue;
      const X = x0 + i * H, Z = z0 + j * H, E = [];
      if ((a > .5) !== (b > .5)) E.push(put(eid(i, j, 0), a, b, X, Z, X + H, Z)); if ((b > .5) !== (c > .5)) E.push(put(eid(i + 1, j, 1), b, c, X + H, Z, X + H, Z + H));
      if ((d > .5) !== (c > .5)) E.push(put(eid(i, j + 1, 0), d, c, X, Z + H, X + H, Z + H)); if ((a > .5) !== (d > .5)) E.push(put(eid(i, j, 1), a, d, X, Z, X, Z + H));
      if (E.length === 2) join(E[0], E[1]); else if (E.length === 4) { join(E[0], E[1]); join(E[2], E[3]); } }
    /* 이어 붙이기 → 한 번 다듬기(모서리를 둥글게) → 띠 만들기 */
    used.fill(0); let np = 0, ni = 0;
    const emit = (P, closed) => { if (P.length < 4) return; let Q = P;   /* 다듬기 두 번 (25cm 칸 계단 → 매끈한 곡선) */
      for (let pass = 0; pass < 2; pass++) { const R = [], n = Q.length / 2, m = closed ? n : n - 1; if (!closed) R.push(Q[0], Q[1]); for (let k = 0; k < m; k++) { const ax = Q[k * 2], az = Q[k * 2 + 1], bx = Q[((k + 1) % n) * 2], bz = Q[((k + 1) % n) * 2 + 1]; R.push(ax * .75 + bx * .25, az * .75 + bz * .25, ax * .25 + bx * .75, az * .25 + bz * .75); } if (!closed) R.push(Q[(n - 1) * 2], Q[(n - 1) * 2 + 1]); Q = R; }
      const n = Q.length / 2; if (np + n + 1 > MAXP) return; const base = np, cnt = closed ? n + 1 : n;
      for (let k = 0; k < cnt; k++) { const kk = k % n, pk = closed ? (kk - 1 + n) % n : Math.max(0, kk - 1), nk = closed ? (kk + 1) % n : Math.min(n - 1, kk + 1);
        let tx = Q[nk * 2] - Q[pk * 2], tz = Q[nk * 2 + 1] - Q[pk * 2 + 1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        const v = (base + k) * 2; pos.set([Q[kk * 2], Y, Q[kk * 2 + 1], Q[kk * 2], Y, Q[kk * 2 + 1]], v * 3); nrm.set([-tz, tx, -tz, tx], v * 2);
        if (k > 0) { const a0 = v - 2; idx.set([a0, a0 + 1, v, a0 + 1, v + 1, v], ni); ni += 6; } }
      np += cnt; };
    for (let s = 0; s < segs.length; s++) { const st = segs[s]; if (used[st]) continue;
      /* 열린 줄이면 끝에서 시작 */
      let start = st; for (let q = st, pv = -1, gd = 0; gd < 20000; gd++) { if (link[q * 2 + 1] < 0) { start = q; break; } const nx = link[q * 2] !== pv ? link[q * 2] : link[q * 2 + 1]; if (nx === st || nx < 0) break; pv = q; q = nx; }
      const P = []; let cur = start, pv = -1, closed = false;
      for (let gd = 0; gd < 20000; gd++) { used[cur] = 1; P.push(EP[cur * 2], EP[cur * 2 + 1]); const a = link[cur * 2], b = link[cur * 2 + 1]; const nx = a !== pv ? a : b; if (nx < 0 || (nx === pv && b < 0)) break; if (nx === start) { closed = true; break; } if (used[nx]) break; pv = cur; cur = nx; }
      emit(P, closed); }
    g.attributes.position.needsUpdate = true; g.attributes.aN.needsUpdate = true; g.index.needsUpdate = true; g.setDrawRange(0, ni); };
  const update = (on, sx, sz, head, t, dt) => { mesh.visible = on; if (!on) return; U.uShip.value.set(sx, Y, sz); U.uHead.value.set(-Math.sin(head), -Math.cos(head));
    acc += dt; let dh = Math.abs(head - lh) % 6.2832; if (dh > 3.1416) dh = 6.2832 - dh;
    if (Math.hypot(sx - lx, sz - lz) > 2 || dh > .35 || acc > 1) { acc = 0; rebuild(sx, sz, head); } };   /* 2m 움직이거나 방향이 꺾일 때만 다시 그림 → 폰 부담 적음 */
  return { update, mesh };
}
