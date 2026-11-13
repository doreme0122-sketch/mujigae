/* 보스 구역 블랙홀 + 소용돌이 흐름 (사용자 2026-11-03 회의: 욕조 물 빠지는 구멍처럼 둘레 공간이 빙글빙글 돎)
   · 블랙홀: 보스 구역(반지름 약 30m) 안을 천천히 떠돌아다님 → 싸우는 자리가 계속 바뀜
     생김새: 빛도 못 빠져나오는 검은 가운데 + 그 둘레를 휘감아 도는 뜨거운 빛 원반(블랙홀에 가까운 쪽이 더 밝고 빠름) + 둘레 공간이 휘어 보임(화면 일그러짐)
   · 흐름 (왜 빨라지나 = 블랙홀이 돌며 둘레 공간을 끌고 돎):
     - 블랙홀을 중심으로 둘레 공간이 빙글빙글 돌며 빨려 듦(사용자: 중심은 블랙홀). 보스 구역 + 안쪽 둥근 길(반지름 ~46m) 안에서만. 바닥에 선을 긋지 않고 혜성 먼지가 흘러가는 걸로 보여 줌
     - 블랙홀에 가까울수록 물살이 셈 → 블랙홀이 움직이면 소용돌이 전체가 같이 옮겨 감
     - 흐름을 따라가면 빨라지고 거슬러 가면 느려짐
     - 블랙홀 바로 둘레(약 12m): 가운데로 끌려 듦 + 휘감아 돎 → 스치듯 지나가면 휙 빨라지며 튕겨 나감
   · 한가운데(약 2.2m)까지 빨려 들면: 기체가 빙글빙글 작아지며 사라짐 → 카메라가 맵 아무 곳으로 날아감 → 그곳 공간이 일그러지며 열리고 튀어나옴 (체력 약 20% 깎임)
     나오는 곳: 다닐 수 있는 땅 중 남의 태어나는 방 · 벽 속 · 보스 구역은 뺌
   무게: 별빛 먼지 1600알 한 번에 · 원반 한 장 · 검은 가운데 한 장 */
import * as THREE from 'three';
import * as A from '../core/audio.js?v=11131300';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
export const BH = { ZONE: 30, RING: 46, FLOW: 9, CORE: 1.25, GRAB: 7.5, CATCH: 2.8, SC: .57 };   /* 사용자 2026-11-03: 블랙홀이 너무 커서 보스방 주인공 같음 → 생김새·끌어당김 모두 약 0.57배 (SC: 생김새 크기)   /* CATCH: 여기까지 들어오면 못 빠져나가고 감겨 들어감 */

function whoom(up) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(up ? 50 : 220, t0); o.frequency.exponentialRampToValueAtTime(up ? 260 : 40, t0 + .7); o.connect(g); A.env(g, t0, .02, .3, .8); A.out(g, .5); o.start(t0); o.stop(t0 + .9);
  const s = A.noise(.8), bp = c.createBiquadFilter(), g2 = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(up ? 300 : 3000, t0); bp.frequency.exponentialRampToValueAtTime(up ? 3000 : 200, t0 + .7); s.connect(bp); bp.connect(g2); A.env(g2, t0, .03, .12, .7); A.out(g2, .6); s.start(t0); }

export function makeBlackHole(B, opt = {}) {
  const G = new THREE.Group();
  /* 검은 가운데: 화면을 보는 원판. 가장자리에 빛이 감겨 얇게 빛남(빛이 휘어 도는 자리) */
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uS: { value: 1 } },
    vertexShader: `uniform float uS; varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * 9. * ${BH.SC.toFixed(3)} * uS; gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float uT; varying vec2 vP; void main(){ float r = length(vP) * 2.05;                      /* 반지름 1 = 2.2m (빨려 드는 한가운데와 같은 크기) */
      float hole = 1. - smoothstep(.92, 1.02, r); float d = (r - 1.06) / .07, ring = exp(-d * d);
      float a = atan(vP.y, vP.x + 1e-5), flick = .8 + .2 * sin(a * 7. + uT * 5.);
      vec3 c = vec3(1.2, .95, .8) * ring * 1.6 * flick; float al = max(hole, 0.);
      gl_FragColor = vec4(c, al + ring * .8); }` }));
  core.renderOrder = 12; core.frustumCulled = false; G.add(core);
  /* 빛 원반: 바닥과 나란히 누운 원반, 휘감아 도는 뜨거운 결. 안쪽은 하얗게 뜨겁고 바깥은 주황 → 붉게 식음 */
  const disk = new THREE.Mesh(new THREE.RingGeometry(2.3, 9, 96, 1), new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5), u = (r - 2.3) / 6.7;
        float spin = a - uT * (3.4 / (r * .3 + .2)) - log(r) * 3.;                                              /* 흐름과 같은 쪽으로 돌며, 나선 팔이 안쪽으로 감겨 들어감 (안쪽일수록 빠름) */
        vec2 q = vec2(cos(spin), sin(spin));                                                                     /* 각도를 돌린 자리로 결을 뜸 → 한 바퀴 이음매가 없음 */
        float arms = pow(max(0., .5 + .5 * cos(spin * 3.)), 3.);                                                  /* 또렷한 나선 팔 셋: 빨려 드는 방향이 보임 */
        float streak = n(q * (2.5 + r * .2) + r * .9) * .5 + n(q * (7. + r * .6) - r * 2.1) * .35 + arms * 1.1;
        float lit = pow(max(1. - u, 0.), 2.2) * smoothstep(0., .04, u);
        float side = .65 + .35 * sin(a + .6);                                                                    /* 다가오는 쪽이 더 밝음 */
        vec3 hot = mix(vec3(1.3, 1.15, 1.), vec3(1.1, .45, .12), smoothstep(.05, .5, u)); hot = mix(hot, vec3(.45, .08, .05), smoothstep(.5, 1., u));
        gl_FragColor = vec4(hot * lit * (.15 + streak) * side * 1.5, 1.); }` }));
  disk.rotation.x = -Math.PI / 2; disk.position.y = .6; disk.scale.setScalar(BH.SC); disk.renderOrder = 11; G.add(disk);
  /* 나오는 구멍: 같은 블랙홀이 작게 열렸다 닫힘 (사용자: 블랙홀 같은 일그러짐이 열리며 나옴) */
  const core2 = new THREE.Mesh(core.geometry, core.material.clone()), disk2 = new THREE.Mesh(disk.geometry, disk.material.clone());
  core2.renderOrder = 12; core2.frustumCulled = false; disk2.rotation.x = -Math.PI / 2; disk2.renderOrder = 11; core2.visible = disk2.visible = false; G.add(core2, disk2);
  /* 화면 어두워짐 (검은 가운데를 지나는 동안) */
  const veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%, rgba(0,0,0,.55), rgba(0,0,0,.97) 70%);opacity:0;z-index:5'; document.body.appendChild(veil);
  /* 별빛 먼지: 흐름을 따라 떠다님 — 둥근 점이 아니라 꼬리 달린 혜성 모양(가는 방향이 보임). 빠를수록 길게 늘어나고 밝음
     절반은 블랙홀 둘레에 모여 나선을 그리며 가운데로 빨려 듦 (빨려 드는 방향이 또렷하게) */
  const ND = 1800, ib = new THREE.InstancedBufferGeometry(); ib.instanceCount = ND;
  ib.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3)); ib.setIndex([0, 2, 1, 1, 2, 3]);
  const dP = new Float32Array(ND * 3), dV = new Float32Array(ND * 3), dA = new Float32Array(ND), dl = new Float32Array(ND);
  ib.setAttribute('iP', new THREE.InstancedBufferAttribute(dP, 3)); ib.setAttribute('iV', new THREE.InstancedBufferAttribute(dV, 3)); ib.setAttribute('iA', new THREE.InstancedBufferAttribute(dA, 1));
  const dust = new THREE.Mesh(ib, new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 iP, iV; attribute float iA; varying float vA, vU, vX;
      void main(){ float sp = length(iV); vec3 dir = sp > 1e-3 ? iV / sp : vec3(1., 0., 0.); float L = .25 + sp * .16;       /* 꼬리 길이 = 빠르기 */
        vec3 side = normalize(cross(dir, normalize(cameraPosition - iP))) * (.05 + .05 * iA);
        vec3 p = iP - dir * position.x * L + side * position.y * (1. - position.x * .85);
        vA = iA; vU = position.x; vX = position.y; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
    fragmentShader: `varying float vA, vU, vX; void main(){ float head = exp(-vU * 3.5), w = 1. - vX * vX;
      vec3 c = mix(vec3(.5, .6, 1.1), vec3(1.2, .9, .7), vA) * (head * 1.2 + .25) * w * (1. - vU);
      gl_FragColor = vec4(c * vA, 1.); }` }));
  dust.frustumCulled = false; dust.renderOrder = 10; G.add(dust);
  const spawnDust = i => { let x, z; if (i % 2) { const a = Math.random() * 6.283, r = 3 + Math.random() * 11; x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r; }
    else { for (let k = 0; k < 6; k++) { const a = Math.random() * 6.283, r = 6 + Math.sqrt(Math.random()) * 34; x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r; if (Math.hypot(x, z) < BH.RING) break; } }   /* 블랙홀 둘레에 퍼져 있다가 휘감겨 들어감 */
    dP[i * 3] = x; dP[i * 3 + 1] = .3 + Math.random() * 1.2; dP[i * 3 + 2] = z; dl[i] = 2 + Math.random() * 4; };
  const P = new THREE.Vector3();
  for (let i = 0; i < ND; i++) { spawnDust(i); dl[i] *= Math.random(); }
  /* 흐름: 가운데 둘레 소용돌이 + 블랙홀 둘레 끌림 (세상 좌표 x,z에서의 바람) */
  function flow(x, z, out) {                                                 /* 소용돌이의 중심 = 블랙홀 (사용자: 블랙홀이 빨아들이는 중심) — 맵 가운데가 아님 */
    const r = Math.hypot(x, z), dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz) + 1e-4, ux = dx / d, uz = dz / d;
    const mask = 1 - THREE.MathUtils.smoothstep(r, BH.RING - 3, BH.RING + 4);                         /* 보스 구역 + 안쪽 둥근 길 안에서만 */
    const swirl = BH.FLOW * 1.7 * Math.exp(-d / 12) * (d / (d + 1.6)) * mask, pull = 2.6 * Math.exp(-d / 9) * mask;   /* 블랙홀에 가까울수록 세게 돎 + 조금씩 끌려 듦 */
    let fx = -uz * swirl + ux * pull, fz = ux * swirl + uz * pull;
    if (d < BH.GRAB) { const k = 1 - d / BH.GRAB; fx += ux * 16 * k * k - uz * 10 * k; fz += uz * 16 * k * k + ux * 10 * k; }
    out[0] = fx; out[1] = fz; return d; }
  const tmp = [0, 0];
  let wanderT = Math.random() * 100;
  const S = { phase: 0, t0: 0, dest: null, from: null };    /* phase 0 평소 · 1 빨려 듦 · 2 날아감 · 3 튀어나옴 */
  /* 나오는 자리: 다닐 수 있는 땅 중 아무 곳 (남의 방 · 보스 구역 · 벽 속 뺌) */
  function pickDest() { const rooms = opt.rooms || [], mine = opt.mine || 0;
    for (let k = 0; k < 400; k++) { const x = (Math.random() - .5) * 320, z = (Math.random() - .5) * 320, r = Math.hypot(x, z);
      if (r < BH.RING + 4 || r > 150 || B.blocked(x, z) || B.field(x, z) > .2) continue;
      let clear = true; for (let q = 0; q < 8 && clear; q++) { const a = q / 8 * 6.283; if (B.field(x + Math.cos(a) * 7, z + Math.sin(a) * 7) > .2) clear = false; } if (!clear) continue;   /* 둘레 7m가 트인 곳에서만 열림 (벽에 박혀 나오지 않게) */
      if (rooms.some(([rx, rz], i) => i !== mine && Math.hypot(x - rx, z - rz) < 20)) continue; return [x, z]; } return [0, -120]; }
  G.userData.S = S; G.userData.P = P;
  G.userData.update = (t, dt, fly, fs, cam, bloom, Wd, Hd, hud) => {
    /* 떠돎: 서로 다른 물결 둘을 겹쳐 보스 구역 안을 돎 (사용자: 더 빠르게 — 초속 2~3m) */
    wanderT += dt; P.set(Math.cos(wanderT * .1) * 13 + Math.sin(wanderT * .16 + 1) * 7, 0, Math.sin(wanderT * .085) * 13 + Math.cos(wanderT * .13) * 7);
    core.position.set(P.x, 1.6, P.z); disk.position.set(P.x, .6, P.z);
    for (const m of [core, disk, core2, disk2]) m.material.uniforms.uT.value = t;
    const shipM = fly.children[0]; if (!shipM.userData.base) shipM.userData.base = shipM.scale.clone(); const base = shipM.userData.base;   /* 기체 원래 크기 (커지는 문제 고침) */
    /* 먼지 흐름 */
    for (let i = 0; i < ND; i++) { const x = dP[i * 3], z = dP[i * 3 + 2]; const d = flow(x, z, tmp);
      dP[i * 3] += tmp[0] * dt; dP[i * 3 + 2] += tmp[1] * dt; dl[i] -= dt; dV[i * 3] = tmp[0]; dV[i * 3 + 1] = 0; dV[i * 3 + 2] = tmp[1];
      if (dl[i] <= 0 || d < BH.CORE * .8 || Math.hypot(dP[i * 3], dP[i * 3 + 2]) > BH.RING + 4) spawnDust(i);
      const sp = Math.hypot(tmp[0], tmp[1]); dA[i] = Math.min(1, .2 + sp / 16) * Math.min(1, dl[i]) * Math.min(1, d / 3); }
    ib.attributes.iP.needsUpdate = ib.attributes.iV.needsUpdate = ib.attributes.iA.needsUpdate = true;
    /* 기체에 흐름 싣기 → 너무 가까이 가면 붙잡혀 감겨 들어감 */
    if (S.phase === 0) { const d = flow(fs.x, fs.z, tmp); fs.ex = tmp[0]; fs.ez = tmp[1];
      if (d < BH.CATCH) { S.phase = 1; S.t0 = t; S.r0 = d; S.ang = Math.atan2(fs.z - P.z, fs.x - P.x); S.dest = pickDest(); whoom(false); } }
    else fs.ex = fs.ez = 0;
    let lensK = .22, veilA = 0;
    if (S.phase === 1) {                                                   /* ① 감겨 듦: 빛 원반을 따라 점점 빠르게 두세 바퀴 돌며 가운데로, 블랙홀 쪽으로 길게 늘어나며 빛 꼬리로 풀림 */
      const k = Math.min(1, (t - S.t0) / 1.3), w = 2.5 + 16 * k * k; S.ang += w * dt; const r = S.r0 * Math.pow(1 - k, 1.4);
      fs.x = P.x + Math.cos(S.ang) * r; fs.z = P.z + Math.sin(S.ang) * r; fs.vx = fs.vz = 0;
      fs.head = Math.atan2(Math.sin(S.ang), -Math.cos(S.ang));                                                    /* 머리는 도는 방향 */
      shipM.scale.set(base.x * (1 - .7 * k), base.y * (1 - .7 * k), base.z * (1 + 2.6 * k * k));
      for (let j = 0; j < 6; j++) { const i = (Math.random() * ND) | 0; dP[i * 3] = fs.x + (Math.random() - .5) * .6; dP[i * 3 + 1] = 1 + Math.random() * .4; dP[i * 3 + 2] = fs.z + (Math.random() - .5) * .6; dl[i] = 1.2; }   /* 기체가 빛 부스러기로 풀려 같이 빨려 듦 */
      lensK = .3 + .6 * k; veilA = Math.max(0, (k - .85) / .15) * .92;
      if (k >= 1) { S.phase = 2; S.t0 = t; shipM.visible = false; bloom?.warp(.5, .5, 0, 0); S.flash = t; } }
    else if (S.phase === 2) {                                              /* ② 검은 가운데를 지남: 화면이 어두운 채 나올 곳으로 날아감 */
      const k = Math.min(1, (t - S.t0) / 1.0), s = k * k * (3 - 2 * k); fs.x = P.x + (S.dest[0] - P.x) * s; fs.z = P.z + (S.dest[1] - P.z) * s; fs.vx = fs.vz = 0; veilA = .92;
      if (k >= 1) { S.phase = 3; S.t0 = t; fs.x = S.dest[0]; fs.z = S.dest[1]; S.out = Math.atan2(-S.dest[1], -S.dest[0]) + (Math.random() - .5) * 1.2;   /* 가운데 쪽(트인 쪽)으로 튀어나옴 */ core2.visible = disk2.visible = true; whoom(true); } }
    else if (S.phase === 3) {                                              /* ③ 나옴: 그 자리에 작은 블랙홀이 열림 → 기체가 늘어난 채 튀어나와 원래 크기로 → 구멍이 닫힘 */
      const e = t - S.t0, open = e < .35 ? Math.sin(e / .35 * Math.PI / 2) : e < .7 ? 1 : Math.max(0, 1 - (e - .7) / .6), hs = .55 * open;
      core2.position.set(S.dest[0], 1.6, S.dest[1]); disk2.position.set(S.dest[0], .6, S.dest[1]); core2.material.uniforms.uS.value = Math.max(.001, hs); disk2.scale.setScalar(Math.max(.001, hs) * BH.SC);
      veilA = Math.max(0, .92 * (1 - e / .35));
      if (e > .35) { const u = Math.min(1, (e - .35) / .5), ease = 1 - Math.pow(1 - u, 3); shipM.visible = true;
        fs.x = S.dest[0] + Math.cos(S.out) * 4.5 * ease; fs.z = S.dest[1] + Math.sin(S.out) * 4.5 * ease; fs.vx = fs.vz = 0; fs.head = Math.atan2(-Math.cos(S.out), -Math.sin(S.out));
        shipM.scale.set(base.x * (.35 + .65 * ease), base.y * (.35 + .65 * ease), base.z * (3.2 - 2.2 * ease));
        if (!S.said) { S.said = 1; if (hud) hud('블랙홀을 지나 튀어나옴 · 체력 -20%'); } }
      if (e > 1.35) { S.phase = 0; S.said = 0; shipM.scale.copy(base); core2.visible = disk2.visible = false; } }
    veil.style.opacity = veilA.toFixed(3);
    /* 화면: 블랙홀 둘레가 휘어 보임 + 나오는 자리에서 공간이 일그러지며 열림 */
    if (bloom && cam) { const v = P.clone().setY(1.2).project(cam); const vis = v.z < 1 && Math.abs(v.x) < 1.4 && Math.abs(v.y) < 1.4;
      const pr = new THREE.Vector3(P.x + 6 * BH.SC, 1.2, P.z).project(cam), R = Math.abs(pr.x - v.x) * .5 * (Wd / Hd);
      bloom.lens(v.x * .5 + .5, v.y * .5 + .5, Math.min(.5, R), vis ? lensK : 0, Wd / Hd);
      if (S.phase === 3) { const w = new THREE.Vector3(S.dest[0], 1, S.dest[1]).project(cam), e = t - S.t0; bloom.warp(w.x * .5 + .5, w.y * .5 + .5, .05 + e * .55, .04 * Math.max(0, 1 - e / 1.2), Wd / Hd); }   /* 나오는 자리 공간이 일그러지며 열림 */
      else if (S.phase === 1 && t - S.t0 > 1.1) { const e = (t - S.t0 - 1.1) / .2; bloom.warp(v.x * .5 + .5, v.y * .5 + .5, .02 + e * .2, .05, Wd / Hd); }   /* 검은 가운데에 닿는 순간 번쩍 일그러짐 */
      else bloom.warp(.5, .5, 0, 0, Wd / Hd); } };
  return G;
}
