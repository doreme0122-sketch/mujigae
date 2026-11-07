/* 하늘 맵 — 살아 있는 것들 (사용자 2026-11-06)
   · 새 떼: 작은 섬 위에 앉아 쪼다가 (갈매기 · 참새 · 꼬리 긴 파랑새), 기체가 가까이 오면 한꺼번에 놀라 날아올라 하늘을 한 바퀴 돌고 다시 내려앉음
   · 나비: 꽃밭 위를 팔랑이며 맴돎 · 꽃가루: 햇빛에 반짝이며 떠다님
   · 폭포 물보라: 폭포 끝에서 물안개가 피어오름
   · 떨어지는 흙·돌: 섬 가장자리에서 작은 돌 조각이 이따금 떨어져 구름 속으로 사라짐
   모두 한 종류마다 한 번에 그림 · 기체에서 먼 것은 움직임 계산을 건너뜀 */
import * as THREE from 'three';
import { makeChunk } from './land.js?v=11072203';

const rnd = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const smooth = t => t * t * (3 - 2 * t);
const LITV = `uniform vec3 uSun; varying vec3 vC;
  vec3 lit(vec3 c, vec3 n){ return c * (vec3(1., .94, .86) * .89 * max(dot(n, uSun), 0.) + mix(vec3(.11,.09,.06), vec3(.66,.7,.79), n.y * .5 + .5)); }`;

/* 새 (사용자 2026-11-06: 종류 몇 가지) — 몸통(마름모꼴) · 꼬리 깃 · 날개 둘(끝은 짙게) · 부리. 날개 점은 aW(-1 왼쪽 · 1 오른쪽 · 0 몸)
   종류마다 색 · 몸 크기 · 꼬리 길이 · 날개 길이가 다름 */
export const BIRDS = {
  gull:    { body: [.93, .93, .9], back: [.62, .66, .72], tip: [.24, .26, .3], beak: [.95, .72, .25], tail: .14, wing: .36, chest: [.95, .95, .93], scale: 2.4, flap: 9,  flapFly: .7,  glide: .55, n: [5, 7],  circle: 11, high: 7,  bob: .4,  look: '갈매기' },
  sparrow: { body: [.55, .42, .3],  back: [.42, .32, .22], tip: [.22, .17, .12], beak: [.3, .25, .2],   tail: .12, wing: .26, chest: [.86, .78, .64], scale: 1.1, flap: 26, flapFly: 1.15, glide: 0,   n: [9, 13], circle: 5,  high: 3.5, bob: 1.4, look: '참새' },
  blue:    { body: [.22, .45, .9],  back: [.15, .32, .72], tip: [.08, .12, .3], beak: [.2, .2, .22],   tail: .34, wing: .3,  chest: [.98, .55, .25], scale: 1.6, flap: 16, flapFly: .95, glide: .2,  n: [4, 6],  circle: 7,  high: 5,  bob: .9,  look: '파랑새(꼬리 긴)' } };
function birdGeo(sp) {
  const P = [], C = [], W = [], { body, back, tip, beak, chest, tail, wing } = sp;
  const t = (a, b, c, col, w = [0, 0, 0]) => { P.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { C.push(...col); W.push(w[i]); } };
  const N = [0, 0, .2], T = [0, .02, -.18], L = [-.055, 0, .02], Rr = [.055, 0, .02], U = [0, .065, .02], D = [0, -.05, .02];
  t(N, U, L, body); t(N, Rr, U, body); t(N, L, D, chest); t(N, D, Rr, chest); t(T, L, U, back); t(T, U, Rr, back); t(T, D, L, chest); t(T, Rr, D, chest);
  t([0, .01, .2], [-.015, 0, .26], [.015, 0, .26], beak);
  t([-.05, .02, -.15], [0, .03, -.15 - tail], [.05, .02, -.15], back); if (tail > .25) t([-.03, .02, -.15], [-.06, .03, -.15 - tail * .9], [0, .03, -.15 - tail], tip);   /* 긴 꼬리는 두 갈래 */
  for (const sd of [-1, 1]) { const r0 = [sd * .04, .03, .05], r1 = [sd * .04, .03, -.07], m = [sd * wing * .55, .035, -.02], tp = [sd * wing, .03, -.08];
    t(r0, m, r1, back, [0, sd * .55, 0]); t(m, tp, r1, tip, [sd * .55, sd, 0]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(W, 1));
  g.computeVertexNormals(); return g;
}

export function makeLife(scene, meadow, { R0, R1, HOVER = .7 } = {}) {
  const R = rnd(4242), U = { uT: { value: 0 }, uSun: { value: new THREE.Vector3(-9, 14, -8).normalize() } };
  const mids = meadow.LANDS.filter(L => L.layer === 'mid' && L.yAt);

  /* ── 새 떼 (사용자 2026-11-06: 넓은 곳 말고 작은 섬 위주): 가운데층 작은 섬 위에 한 무리씩 · 종류는 섬마다 운으로 ── */
  const SMALL = new Set(['Island_Small', 'Island_Chunk_Round', 'Island_Flat_Low', 'Island_Tilted_A', 'Island_Mushroom', 'Island_Medium', 'Island_Bowl', 'Island_Crag']);
  const KINDS = Object.keys(BIRDS), flocks = [];
  for (const p of meadow.place) { if (p.layer !== 'mid' || !SMALL.has(p.k) || R() > .32 || flocks.length >= 48) continue;
    const K = meadow.KIT[p.k], top = p.y + K.top * p.sy, rad = K.rad * p.s * .32, kind = KINDS[Math.floor(R() * KINDS.length)], S = BIRDS[kind], birds = [];
    const cnt = S.n[0] + Math.floor(R() * (S.n[1] - S.n[0] + 1));
    for (let i = 0; i < cnt; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * rad, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      birds.push({ hx: x, hy: top + .02, hz: z, yaw: R() * 6.28, ph: R() * 6.28, sp: .85 + R() * .3, peck: R() * 4 }); }
    flocks.push({ kind, S, cx: p.x, cz: p.z, cy: top, birds, t0: -1e9, dir: R() * 6.28 }); }
  const BM = {};
  for (const kind of KINDS) { const S = BIRDS[kind], NB = flocks.filter(f => f.kind === kind).reduce((a, f) => a + f.birds.length, 0), bg = birdGeo(S);
    const bF = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, NB) * 2), 2); bF.setUsage(THREE.DynamicDrawUsage); bg.setAttribute('aF', bF);
    const m = new THREE.ShaderMaterial({ uniforms: U, vertexColors: true, side: THREE.DoubleSide,
      vertexShader: `attribute float aW; attribute vec2 aF; ${LITV}
        void main(){ vec3 p = position; float ang = aF.y * sin(aF.x); float s = abs(aW);
          if (s > 0.) { float a = ang * sign(aW); p.y += sin(a) * abs(p.x) * 1.1; p.x *= cos(a * .8); p.y += aF.y * .02; }   /* 날갯짓: 날개 끝이 위아래로 크게 */
          if (s == 0. && aF.y == 0.) p.y += max(0., sin(aF.x)) * .015;                                                   /* 앉아 있을 땐 고개를 까딱 */
          mat4 M = modelMatrix * instanceMatrix; vec3 n = normalize(mat3(M) * normal);
          vC = lit(color, n); gl_Position = projectionMatrix * viewMatrix * M * vec4(p, 1.); }`,
      fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = linearToOutputTexel(vec4(vC, 1.)); }` });
    const mesh = new THREE.InstancedMesh(bg, m, Math.max(1, NB)); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh); BM[kind] = { mesh, bF }; }

  /* ── 나비 (날개 두 장) + 꽃가루 ── */
  const NBF = mids.length * 5, bfG = new THREE.InstancedBufferGeometry();
  { const P = [], W = []; for (const sd of [-1, 1]) { const q = [[0, 0, .05], [sd * .14, .01, .1], [sd * .16, .01, -.02], [0, 0, -.02], [sd * .1, 0, -.12]];
      P.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3], ...q[3], ...q[2], ...q[4]); for (let i = 0; i < 9; i++) W.push(sd); }
    bfG.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bfG.setAttribute('aW', new THREE.Float32BufferAttribute(W, 1)); }
  const bfH = new Float32Array(NBF * 4), bfC = new Float32Array(NBF * 3), PAL = [[1, .78, .3], [.95, .55, .75], [.6, .8, 1], [1, .98, .9], [.75, .95, .5]];
  for (let i = 0; i < NBF; i++) { const L = mids[Math.floor(i / 5)], a = R() * 6.28, d = Math.sqrt(R()) * L.radius * .7, x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d, y = L.yAt(x, z) ?? L.rim[0][1];
    bfH.set([x, y + .45, z, R() * 100], i * 4); bfC.set(PAL[Math.floor(R() * PAL.length)], i * 3); }
  bfG.setAttribute('aH', new THREE.InstancedBufferAttribute(bfH, 4)); bfG.setAttribute('aCol', new THREE.InstancedBufferAttribute(bfC, 3)); bfG.instanceCount = NBF;
  const bfM = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide,
    vertexShader: `attribute float aW; attribute vec4 aH; attribute vec3 aCol; uniform float uT; varying vec3 vC;
      void main(){ float s = aH.w, t = uT * (.5 + fract(s * 3.7) * .3) + s;
        vec3 c = aH.xyz + vec3(sin(t * .9) * 1.6 + sin(t * 2.3) * .3, sin(t * 3.1) * .25 + .4 + sin(t * .7) * .3, cos(t * .7) * 1.6 + cos(t * 1.9) * .3);   /* 꽃 위를 맴돌며 오르락내리락 */
        float yaw = atan(cos(t * .9) * .9 * 1.6, -sin(t * .7) * .7 * 1.6), fl = sin(uT * 22. + s * 9.) * 1.1;
        vec3 p = position; float a = fl * aW; p.y = abs(p.x) * sin(a); p.x = p.x * cos(a);
        p = vec3(p.x * cos(yaw) + p.z * sin(yaw), p.y, -p.x * sin(yaw) + p.z * cos(yaw));
        vC = aCol * (.8 + .2 * cos(a)); gl_Position = projectionMatrix * viewMatrix * vec4(c + p * 1.3, 1.); }`,
    fragmentShader: `varying vec3 vC; void main(){ gl_FragColor = linearToOutputTexel(vec4(vC, 1.)); }` });
  const bfMesh = new THREE.Mesh(bfG, bfM); bfMesh.frustumCulled = false; scene.add(bfMesh);

  const NP = mids.length * 26, pg = new THREE.BufferGeometry(), pa = new Float32Array(NP * 3), ps = new Float32Array(NP);
  for (let i = 0; i < NP; i++) { const L = mids[i % mids.length], a = R() * 6.28, d = Math.sqrt(R()) * L.radius * .85, x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d; pa.set([x, (L.yAt(x, z) ?? L.rim[0][1]) + .3 + R() * 1.6, z], i * 3); ps[i] = R() * 100; }
  pg.setAttribute('position', new THREE.BufferAttribute(pa, 3)); pg.setAttribute('aS', new THREE.BufferAttribute(ps, 1));
  const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const pollen = new THREE.Points(pg, new THREE.ShaderMaterial({ ...AB, uniforms: { ...U, uPx: { value: 600 } },
    vertexShader: `attribute float aS; uniform float uT, uPx; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uT * .3 + aS) * .8, sin(uT * .5 + aS * 2.) * .35, cos(uT * .27 + aS * 1.3) * .8);
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = (.5 + .5 * sin(uT * 2.2 + aS * 5.)) * smoothstep(90., 30., -mv.z); gl_PointSize = uPx * .06 / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float k = exp(-dot(q, q) * 22.); gl_FragColor = vec4(vec3(1., .95, .7) * k * vA * .9, 1.); }` }));
  pollen.frustumCulled = false; scene.add(pollen);

  /* ── 폭포 물보라: 물이 떨어지는 끝에서 안개가 피어오르며 퍼짐 ── */
  const NM = meadow.MIST.length * 26, mg = new THREE.BufferGeometry(), ma = new Float32Array(NM * 3), mS = new Float32Array(NM);
  meadow.MIST.forEach((m, j) => { for (let k = 0; k < 26; k++) { ma.set([m.x, m.y, m.z], (j * 26 + k) * 3); mS[j * 26 + k] = R() * 100; } });
  mg.setAttribute('position', new THREE.BufferAttribute(ma, 3)); mg.setAttribute('aS', new THREE.BufferAttribute(mS, 1));
  const mist = new THREE.Points(mg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { ...U, uPx: { value: 600 } },
    vertexShader: `attribute float aS; uniform float uT, uPx; varying float vA;
      void main(){ float life = fract(uT * .35 + fract(aS * 1.7)), a = aS * 6.28; vec3 p = position + vec3(cos(a) * life * 1.6, life * 1.4 - .3, sin(a) * life * 1.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = smoothstep(0., .15, life) * (1. - life); gl_PointSize = uPx * (.5 + life * 1.3) / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float k = smoothstep(.5, .1, length(q)); gl_FragColor = linearToOutputTexel(vec4(vec3(.95, .97, 1.), k * vA * .45)); }` }));
  mist.frustumCulled = false; mist.renderOrder = 25; scene.add(mist);

  /* ── 떨어지는 흙·돌: 기체 근처 땅 테두리에서 이따금 ── */
  const ND = 36, dGeo = makeChunk(919, meadow.PAL, false), dMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const debris = new THREE.InstancedMesh(dGeo, dMat, ND); debris.frustumCulled = false; debris.count = ND; scene.add(debris);
  const DS = Array.from({ length: ND }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: .1 })); let dI = 0, dT = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), sv2 = new THREE.Vector3(), ev = new THREE.Euler();

  const update = (t, dt, ship, cam) => { U.uT.value = t;
    /* 새: 종류마다 나는 법이 다름 — 갈매기는 크게 돌며 미끄러지듯(날갯짓을 쉬기도) · 참새는 낮고 좁게 통통 튀듯 빠르게 · 파랑새는 물결치듯 */
    const cntK = {}; for (const kind of KINDS) cntK[kind] = 0;
    for (const f of flocks) { const dC = Math.hypot(f.cx - cam.x, f.cz - cam.z); if (dC > 110) continue; const S = f.S, B = BM[f.kind], F = B.bF.array;
      const near = Math.hypot(f.cx - ship.x, f.cz - ship.z) < 8; if (near && t - f.t0 > 12) { f.t0 = t; f.dir = Math.atan2(f.cz - ship.z, f.cx - ship.x); }   /* 놀라서 기체 반대쪽으로 */
      const e = t - f.t0;
      for (const b of f.birds) { let x = b.hx, y = b.hy, z = b.hz, yaw = b.yaw, flapA = 0, ph = 0; const n = cntK[f.kind]++;
        if (e < 12) { const ee = Math.max(0, e - b.sp * .25), cr = S.circle + b.sp * S.circle * .3, H = S.high + b.sp * 2, w = ee * (5.5 / S.circle) * b.sp + b.ph * .15;
          const ox = f.cx + Math.cos(f.dir) * S.circle * .6, oz = f.cz + Math.sin(f.dir) * S.circle * .6;
          const fx = ox + Math.cos(w + f.dir) * cr, fz = oz + Math.sin(w + f.dir) * cr, fy = f.cy + H + Math.sin(w * 2 + b.ph) * S.bob * .6 + Math.abs(Math.sin(t * 5 + b.ph)) * S.bob * .25 * (f.kind === 'sparrow' ? 1 : 0);
          const upk = smooth(Math.min(1, ee / 1.6)), down = smooth(Math.max(0, (ee - 8.5) / 3)), k = upk * (1 - down);
          x = b.hx + (fx - b.hx) * k; y = b.hy + (fy - b.hy) * k; z = b.hz + (fz - b.hz) * k;
          yaw = Math.atan2(-Math.sin(w + f.dir), Math.cos(w + f.dir));
          const glide = S.glide > 0 && upk >= 1 && down === 0 && Math.sin(t * .9 + b.ph) > 1 - S.glide * 1.6;   /* 갈매기: 날개를 펴고 미끄러짐 */
          flapA = k > .02 ? (glide ? .08 : upk < 1 ? S.flapFly * 1.3 : S.flapFly) : 0; ph = t * (upk < 1 || down > 0 ? S.flap * 1.5 : S.flap) + b.ph; }
        else { ph = t * 3 + b.ph + Math.sin(t * .7 + b.peck) * 2; }
        m4.compose(sv.set(x, y + .02, z), q.setFromEuler(ev.set(0, yaw, 0)), sv2.set(S.scale, S.scale, S.scale)); m4.toArray(B.mesh.instanceMatrix.array, n * 16); F[n * 2] = ph; F[n * 2 + 1] = flapA; } }
    for (const kind of KINDS) { const B = BM[kind]; B.mesh.count = cntK[kind]; if (cntK[kind]) { B.mesh.instanceMatrix.needsUpdate = true; B.bF.needsUpdate = true; } }
    /* 떨어지는 돌 */
    dT -= dt; if (dT <= 0) { dT = .35 + Math.random() * .5; let L = null, best = 1e9; for (const l of mids) { const d = Math.hypot(l.x - ship.x, l.z - ship.z); if (d < best && d < 60) { best = d; L = l; } }
      if (L) { const e = L.rim[Math.floor(Math.random() * L.rim.length)], D = DS[dI++ % ND]; D.life = 4.5; D.p.set(e[0], e[1] - .3, e[2]); D.v.set((e[0] - L.x) * .02, -.2, (e[2] - L.z) * .02); D.w.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); D.s = .06 + Math.random() * .14; } }
    for (let i = 0; i < ND; i++) { const D = DS[i]; if (D.life > 0) { D.life -= dt; D.v.y -= 2.6 * dt; D.p.addScaledVector(D.v, dt); D.r.x += D.w.x * dt; D.r.y += D.w.y * dt; D.r.z += D.w.z * dt; }
      const s = D.life > 0 ? D.s * Math.min(1, D.life / 1.2) : 0; m4.compose(D.p, q.setFromEuler(D.r), sv.set(s, s, s)); m4.toArray(debris.instanceMatrix.array, i * 16); }
    debris.instanceMatrix.needsUpdate = true; };
  const setPx = px => { pollen.material.uniforms.uPx.value = px; mist.material.uniforms.uPx.value = px; };
  return { update, setPx, flocks };
}
