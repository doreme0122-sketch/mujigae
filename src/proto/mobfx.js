/* 몹 효과 묶음 — 해파리 보기와 맵이 같이 씀
   · 빛 방울: 해파리가 뱉는 느린 탄. 비눗방울처럼 테두리가 밝고 속이 비치며 울렁임 → 기체에 닿으면 터짐
   · 경험치 알갱이: 쓰러진 자리에서 퍼졌다가 잠시 뒤 기체로 휘어 빨려 들어감
   · 떼 경보 신호: 맞은 해파리에서 떼 동무에게 빛 알갱이가 둥글게 날아가 닿음 (신호가 어디서 어디로 퍼지는지 보임)
   무게: 빛 방울 한 장 · 알갱이(경험치+신호) 한 장 */
import * as THREE from 'three';
import { JCOL } from './jelly.js?v=11101844';
import * as A from '../core/audio.js';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
export function makeMobFx() {
  const G = new THREE.Group();
  /* 빛 방울 */
  const NB = 64, bp = new Float32Array(NB * 3), ba = new Float32Array(NB * 2), bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('aA', new THREE.BufferAttribute(ba, 2));
  const bm = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uT: { value: 0 }, uC: { value: JCOL.alert } },
    vertexShader: 'attribute vec2 aA; uniform float uPx; varying vec2 vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aA.x > 0. ? uPx * .75 / max(.1, -mv.z) : 0.; }',
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vA;
      void main(){ vec2 q = gl_PointCoord - .5; float a = atan(q.y, q.x + 1e-5), r = length(q) * 2. * (1. + .06 * sin(a * 3. + uT * 7. + vA.y * 9.));
        float ring = exp(-(r - .72) * (r - .72) * 90.), inner = exp(-r * r * 3.) * .25, core = exp(-r * r * 30.) * .6;
        vec3 c = (uC * uC * 1.3 + .15) * (ring + inner) + vec3(1., .9, .8) * core;
        gl_FragColor = vec4(c * vA.x * step(r, 1.), 1.); }` });
  const bub = new THREE.Points(bg, bm); bub.frustumCulled = false; bub.renderOrder = 9; G.add(bub);
  const BL = Array.from({ length: NB }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, life: 0, seed: 0 }));
  /* 알갱이: 경험치(연두 · 하얀 심) + 경보 신호(붉은 주황) */
  const NO = 200, op = new Float32Array(NO * 3), oc = new Float32Array(NO * 4), og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(op, 3)); og.setAttribute('aC', new THREE.BufferAttribute(oc, 4));
  const om = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute vec4 aC; uniform float uPx; varying vec4 vC; void main(){ vC = aC; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = aC.w > 0. ? uPx * aC.w / max(.1, -mv.z) : 0.; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 q = gl_PointCoord - .5; float r2 = dot(q, q) * 4.; vec3 c = vec3(1.2, 1.15, .95) * exp(-r2 * 22.) + vC.rgb * exp(-r2 * 4.) * .7; gl_FragColor = vec4(c, 1.); }' });
  const orbs = new THREE.Points(og, om); orbs.frustumCulled = false; orbs.renderOrder = 10; G.add(orbs);
  const OR = Array.from({ length: NO }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, kind: 0, sig: null }));
  const free = () => OR.find(o => !o.on);
  /* 점액 (사용자 2026-11-04): 빛 방울이 지나간 바닥에 반투명 점액이 띠처럼 남고 4초쯤 지나 마르며 사라짐. 그 위를 지나면 30% 느려짐(겹쳐도 더 느려지지 않음)
     생김새: 가장자리가 울퉁불퉁한 끈적한 웅덩이가 이어진 띠 · 윗면에 젖은 빛이 비침 · 마를수록 가장자리부터 줄어들며 흐려짐 */
  const NG = 640, GOO = { LIFE: 4, R: .55, STEP: .6 }, gI = new Float32Array(NG * 4), gGeo = new THREE.InstancedBufferGeometry();
  { const pl = new THREE.PlaneGeometry(1, 1); gGeo.index = pl.index; gGeo.setAttribute('position', pl.attributes.position); gGeo.setAttribute('uv', pl.attributes.uv); }
  const gAttr = new THREE.InstancedBufferAttribute(gI, 4); gGeo.setAttribute('iG', gAttr); gGeo.instanceCount = NG;
  const gm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uC: { value: JCOL.alert } },
    vertexShader: `attribute vec4 iG; uniform float uT; varying vec2 vU; varying float vAge, vSeed;
      void main(){ vU = uv * 2. - 1.; vAge = (uT - iG.w) / ${GOO.LIFE.toFixed(1)}; vSeed = fract(iG.w * 13.7 + iG.x * .3);
        float c = cos(iG.z), s = sin(iG.z), sc = vAge >= 0. && vAge < 1. ? ${(GOO.R * 2).toFixed(2)} : 0.;
        vec2 p = vec2(position.x * 1.9, position.y) * sc; p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
        gl_Position = projectionMatrix * viewMatrix * vec4(iG.x + p.x, .06 + vSeed * .01, iG.y + p.y, 1.); }`,
    fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vU; varying float vAge, vSeed;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 q = vU * vec2(1., 1.); float a = atan(q.y, q.x + 1e-5), r = length(q * vec2(.62, 1.));
        float edge = .78 - vAge * .35 + (n(vec2(a * 2.2, vSeed * 9.)) - .5) * .28;                          /* 울퉁불퉁한 가장자리 · 마를수록 줄어듦 */
        float m = smoothstep(edge, edge - .12, r); if (m <= 0.) discard;
        float wet = 1. - vAge, sheen = smoothstep(.3, 1., n(q * 3. + vSeed * 5. + uT * .25)) * exp(-pow(r / max(edge, .05), 2.) * 1.5);   /* 윗면에 젖은 빛이 일렁임 */
        float rim = smoothstep(edge - .2, edge - .04, r) * m;                                                  /* 가장자리가 살짝 볼록 · 밝음 */
        vec3 col = uC * uC * (.25 + rim * .9) + vec3(1., .85, .75) * sheen * .35;
        gl_FragColor = vec4(col * (.6 + .4 * wet), m * (.42 + rim * .3) * wet * min(1., vAge * 12. + .2)); }` });
  const goo = new THREE.Mesh(gGeo, gm); goo.frustumCulled = false; goo.renderOrder = 3; G.add(goo);
  for (let i = 0; i < NG; i++) gI[i * 4 + 3] = -99;
  let gN = 0; const gooAdd = (x, z, ang, t) => { gI.set([x, z, ang, t], (gN % NG) * 4); gN++; gAttr.needsUpdate = true; };
  /* 점액에 붙은 기체 아래로 늘어나는 끈적한 실 셋: 기체 배 → 바닥에 붙은 자리. 멀어지면 툭 끊어지고 새로 붙음 */
  const NS = 3, SEG = 12, sp_ = new Float32Array(NS * SEG * 2 * 3), su = new Float32Array(NS * SEG * 2 * 2), si = [];
  for (let k = 0; k < NS; k++) for (let i = 0; i < SEG - 1; i++) { const p = (k * SEG + i) * 2; si.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sp_, 3)); sGeo.setAttribute('aU', new THREE.BufferAttribute(su, 2)); sGeo.setIndex(si);
  const sMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uC: { value: JCOL.alert } },
    vertexShader: 'attribute vec2 aU; varying vec2 vU; void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 uC; varying vec2 vU; void main(){ float x = vU.y, a = exp(-x * x * 3.) * vU.x; gl_FragColor = vec4(uC * uC * .5 + .25, a * .55); }' });
  const strands = new THREE.Mesh(sGeo, sMat); strands.frustumCulled = false; strands.renderOrder = 4; G.add(strands);
  const ST = Array.from({ length: NS }, (_, k) => ({ ax: 0, az: 0, on: false, k }));
  /* 쓰러지는 소리: 맞는 소리와 확실히 다르게 — 톡 터지는 소리 + 짧은 맑은 울림 */
  G.userData.pop = (big = false) => { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, f = big ? 520 : 820;
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 2.2, t0); o.frequency.exponentialRampToValueAtTime(f * .5, t0 + .06); o.connect(g); A.env(g, t0, .001, .12, .09); A.out(g, .2); o.start(t0); o.stop(t0 + .12);
    const n = A.noise(.05), hp = c.createBiquadFilter(), g2 = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; n.connect(hp); hp.connect(g2); A.env(g2, t0, .001, .08, .04); A.out(g2, .1); n.start(t0);
    [1568, 2093].forEach((ff, i) => { const o2 = c.createOscillator(), g3 = c.createGain(); o2.type = 'sine'; o2.frequency.value = ff * (big ? .75 : 1); o2.connect(g3); A.env(g3, t0 + .03 + i * .05, .003, .035, .5); A.out(g3, .5); o2.start(t0 + .03 + i * .05); o2.stop(t0 + .7); }); };
  G.userData.spit = (x, y, z, dx, dz, sp = 6.5) => { const q = BL.find(b => !b.on); if (!q) return; Object.assign(q, { on: true, x, y, z, vx: dx * sp, vz: dz * sp, life: 0, seed: Math.random() }); };
  /* 쓰러진 자리에서 경험치 알갱이 n개 */
  G.userData.burst = (x, y, z, n) => { for (let c = 0; c < n; c++) { const o = free(); if (!o) break; const a = Math.random() * 6.283, sp = 2 + Math.random() * 3; Object.assign(o, { on: true, kind: 0, x, y, z, vx: Math.cos(a) * sp, vy: 1.5 + Math.random() * 2, vz: Math.sin(a) * sp, age: -c * .04, sig: null }); } };
  /* 신호: 해파리 a → b, t0 → t1 */
  G.userData.signal = s => { const o = free(); if (!o) return; Object.assign(o, { on: true, kind: 1, sig: s, age: 0 }); };
  /* ship: {x,z} · onBub(q) 빛 방울이 기체에 닿음 · onOrb() 경험치 하나 들어옴 */
  G.userData.update = (t, dt, px, ship, onBub, onOrb) => { bm.uniforms.uPx.value = px; bm.uniforms.uT.value = t; om.uniforms.uPx.value = px;
    BL.forEach((q, i) => { if (q.on) { q.life += dt; q.x += q.vx * dt; q.z += q.vz * dt; q.y += (.75 - q.y) * Math.min(1, dt * 1.5);
        if (ship && Math.hypot(q.x - ship.x, q.z - ship.z) < 1.1) { q.on = false; onBub?.(q); } else if (q.life > 4) q.on = false; }
      if (q.on) { q.gd = (q.gd ?? 0) + Math.hypot(q.vx, q.vz) * dt; if (q.gd > GOO.STEP && q.y < 1.2) { q.gd = 0; gooAdd(q.x, q.z, Math.atan2(q.vz, q.vx), t); } }   /* 지나간 자리에 점액 */
      bp.set([q.x, q.y, q.z], i * 3); ba[i * 2] = q.on ? Math.min(1, q.life * 3, (4 - q.life) * 4) : 0; ba[i * 2 + 1] = q.seed; });
    OR.forEach((o, i) => { let w = 0;
      if (o.on && o.kind === 0) { o.age += dt; if (o.age > 0) { const dx = ship.x - o.x, dy = .9 - o.y, dz = ship.z - o.z, d = Math.hypot(dx, dy, dz) || 1, pull = Math.max(0, o.age - .35) * 60;   /* 퍼졌다가 잠시 뒤 기체로 휘어 들어감 */
          o.vx += dx / d * pull * dt; o.vy += dy / d * pull * dt; o.vz += dz / d * pull * dt; const dr = Math.exp(-dt * 2.5); o.vx *= dr; o.vy *= dr; o.vz *= dr; if (o.age < .35) o.vy -= dt * 2;
          o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; w = .42; if (d < .8 || o.age > 4) { o.on = false; w = 0; if (d < .8) onOrb?.(); } }
        oc.set([.55, 1, .35, w], i * 4); }
      else if (o.on && o.kind === 1) { const s = o.sig, k = (t - s.t0) / Math.max(.05, s.t1 - s.t0);                                 /* 둥글게 솟았다 내려앉으며 날아감 */
        if (k >= 1 || !s.b.on) { o.on = false; } else { const e = k * k * (3 - 2 * k); o.x = s.a.x + (s.b.x - s.a.x) * e; o.z = s.a.z + (s.b.z - s.a.z) * e; o.y = s.a.y + (s.b.y - s.a.y) * e + Math.sin(k * Math.PI) * 1.4; w = .32 * (1 - .4 * k); }
        oc.set([1.1, .38, .22, w], i * 4); }
      else oc[i * 4 + 3] = 0;
      op.set([o.x, o.y, o.z], i * 3); });
    for (const g of [bg, og]) for (const k in g.attributes) g.attributes[k].needsUpdate = true;
    gm.uniforms.uT.value = t;
    /* 기체가 점액 위에 있나 */
    let on = false; if (ship) { const R2 = (GOO.R + .35) * (GOO.R + .35); for (let i = 0; i < NG && !on; i++) { const age = t - gI[i * 4 + 3]; if (age < 0 || age > GOO.LIFE * .92) continue; const dx = ship.x - gI[i * 4], dz = ship.z - gI[i * 4 + 1]; if (dx * dx + dz * dz < R2) on = true; }
      const want = on || t < (ship.gooUntil || 0) ? 1 : 0; ship.goo = (ship.goo || 0) + (want - (ship.goo || 0)) * Math.min(1, dt * (want ? 30 : 2));   /* 밟는 순간 바로 붙잡히고 빠져나오면 0.5초에 걸쳐 풀림 */
      /* 끈적한 실 */
      const hy = .55, sx = ship.x, sz = ship.z;
      ST.forEach((st, k) => { const ox = Math.cos(k * 2.1 + .5) * .35, oz = Math.sin(k * 2.1 + .5) * .35;
        if (on && !st.on && Math.random() < dt * 6) { st.on = true; st.ax = sx + ox; st.az = sz + oz; }
        const d = Math.hypot(sx + ox - st.ax, sz + oz - st.az); if (st.on && (d > 1.4 + k * .3 || !on && d > .6)) st.on = false;   /* 늘어나다 툭 끊어짐 */
        for (let i = 0; i < SEG; i++) { const u = i / (SEG - 1), bx = st.ax + (sx + ox - st.ax) * u, bz = st.az + (sz + oz - st.az) * u, sag = Math.sin(u * Math.PI) * (.12 + d * .18);
          const by = .06 + (hy - .06) * u - sag, w = (.05 * (1 - d / 2.2) + .012) * (1.2 - Math.sin(u * Math.PI) * .7), j = (k * SEG + i) * 2;   /* 늘어날수록 가운데가 가늘어지고 처짐 */
          const ddx = sx + ox - st.ax, ddz = sz + oz - st.az, l = Math.hypot(ddx, ddz) || 1, px = -ddz / l * w, pz = ddx / l * w;
          sp_.set([bx + px, by, bz + pz, bx - px, by, bz - pz], j * 3); su.set([st.on ? 1 - d / 2.4 : 0, 1, st.on ? 1 - d / 2.4 : 0, -1], j * 2); } });
      sGeo.attributes.position.needsUpdate = sGeo.attributes.aU.needsUpdate = true; } };
  return G;
}
