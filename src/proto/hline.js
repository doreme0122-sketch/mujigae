/* 파란 높이선 (사용자 2026-11-07)
   · 왜: 위에서 내려다보면 높이가 안 느껴져서, 이 구조물이 '내 높이에서' 걸리는지 알기 어려움
   · 무엇: 막히는 구조물이 기체 높이와 만나는 둘레를 파란 띠로 그림 — 선에 닿으면 막힘, 선이 없으면 지나감
   · 막힘 판정(1m 칸 지도)을 그대로 따라 그리므로, 보이는 선과 실제로 막히는 자리가 똑같음
   · 구조물 뒤로 가려지지 않게 늘 위에 그림(둘레 전체가 보여야 어디까지 막히는지 앎)
   · 기체가 7m 안으로 오면 흐릿하게 생기고 가까울수록 진해짐 · 멀어지면 스르르 사라짐 · 기체가 향하는 쪽은 더 밝게(곧 부딪힐 것) */
import * as THREE from 'three';

export function makeHeightLine(scene, blocked, Y) {
  const RAD = 7.5, H = .5, M = Math.round(RAD * 2 / H) + 1, MAXS = 900;
  const raw = new Float32Array(M * M), f = new Float32Array(M * M);
  const pos = new Float32Array(MAXS * 4 * 3), dir = new Float32Array(MAXS * 4 * 2), side = new Float32Array(MAXS * 4), idx = new Uint32Array(MAXS * 6);
  for (let i = 0; i < MAXS; i++) { const v = i * 4; side.set([-1, 1, -1, 1], v); idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], i * 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
  const U = { uShip: { value: new THREE.Vector3() }, uHead: { value: new THREE.Vector2(0, -1) }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aDir; attribute float aSide; varying float vS; varying vec3 vW; uniform vec3 uShip;
      void main(){ vec3 p = position; float w = .32; p.xz += vec2(-aDir.y, aDir.x) * aSide * w; vS = aSide; vW = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: `varying float vS; varying vec3 vW; uniform vec3 uShip; uniform vec2 uHead; uniform float uT;
      void main(){ vec2 d = vW.xz - uShip.xz; float r = length(d);
        float near = smoothstep(7., 2.5, r);                                   /* 7m 안에서 생기고 가까울수록 진해짐 */
        float face = max(0., dot(d / max(r, .001), uHead));                    /* 기체가 향하는 쪽이 더 밝음 */
        float core = exp(-vS * vS * 45.), halo = exp(-vS * vS * 5.) * .45;     /* 가는 심 + 은은한 번짐 */
        float a = near * (.55 + .65 * face) * (core + halo) * 1.3;
        gl_FragColor = vec4(vec3(.35, .72, 1.25) * a, 1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 20; scene.add(mesh);
  let cx = 1e9, cz = 1e9, acc = 0;
  /* 막힘 칸을 0.5m로 훑고 → 살짝 흐려서(각진 칸 모양 대신 부드러운 둘레) → 경계선(0.5)을 따라 선분을 만듦 */
  const rebuild = (sx, sz) => { cx = Math.round(sx / H) * H; cz = Math.round(sz / H) * H; const x0 = cx - RAD, z0 = cz - RAD;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) raw[j * M + i] = blocked(x0 + i * H, z0 + j * H) ? 1 : 0;
    for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { let s = 0, w = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= M || jj >= M) continue; const k = (2 - Math.abs(di)) * (2 - Math.abs(dj)); s += raw[jj * M + ii] * k; w += k; } f[j * M + i] = s / w; }
    let n = 0; const P = [], edge = (va, vb, xa, za, xb, zb) => { const t = (.5 - va) / (vb - va); P.push(xa + (xb - xa) * t, za + (zb - za) * t); };
    for (let j = 0; j < M - 1 && n < MAXS; j++) for (let i = 0; i < M - 1 && n < MAXS; i++) {
      const a = f[j * M + i], b = f[j * M + i + 1], c = f[(j + 1) * M + i + 1], d = f[(j + 1) * M + i]; const code = (a > .5) | (b > .5) << 1 | (c > .5) << 2 | (d > .5) << 3; if (code === 0 || code === 15) continue;
      const X = x0 + i * H, Z = z0 + j * H; P.length = 0;
      if ((a > .5) !== (b > .5)) edge(a, b, X, Z, X + H, Z); if ((b > .5) !== (c > .5)) edge(b, c, X + H, Z, X + H, Z + H);
      if ((c > .5) !== (d > .5)) edge(c, d, X + H, Z + H, X, Z + H); if ((d > .5) !== (a > .5)) edge(d, a, X, Z + H, X, Z);
      for (let q = 0; q + 3 < P.length && n < MAXS; q += 4) { const ax = P[q], az = P[q + 1], bx = P[q + 2], bz = P[q + 3]; let dx = bx - ax, dz = bz - az; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const ex = dx * .16, ez = dz * .16, v = n * 4;   /* 이웃 선분과 겹치게 끝을 조금 늘림 → 이음매 끊김 없음 */
        pos.set([ax - ex, Y, az - ez, ax - ex, Y, az - ez, bx + ex, Y, bz + ez, bx + ex, Y, bz + ez], v * 3); dir.set([dx, dz, dx, dz, dx, dz, dx, dz], v * 2); n++; } }
    g.attributes.position.needsUpdate = true; g.attributes.aDir.needsUpdate = true; g.setDrawRange(0, n * 6); };
  const update = (on, sx, sz, head, t, dt) => { mesh.visible = on; if (!on) return; U.uShip.value.set(sx, Y, sz); U.uHead.value.set(-Math.sin(head), -Math.cos(head)); U.uT.value = t;
    acc += dt; if (Math.hypot(sx - cx, sz - cz) > .5 || acc > .5) { acc = 0; rebuild(sx, sz); } };
  return { update, mesh };
}
