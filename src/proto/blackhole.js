/* 보스 구역 블랙홀 + 소용돌이 흐름 (사용자 2026-11-03 회의: 욕조 물 빠지는 구멍처럼 둘레 공간이 빙글빙글 돎)
   · 블랙홀: 보스 구역(반지름 약 30m) 안을 천천히 떠돌아다님 → 싸우는 자리가 계속 바뀜
     생김새: 빛도 못 빠져나오는 검은 가운데 + 그 둘레를 휘감아 도는 뜨거운 빛 원반(블랙홀에 가까운 쪽이 더 밝고 빠름) + 둘레 공간이 휘어 보임(화면 일그러짐)
   · 흐름 (왜 빨라지나 = 블랙홀이 돌며 둘레 공간을 끌고 돎):
     - 보스 구역과 안쪽 둥근 길(반지름 ~46m)의 공간이 한 방향(위에서 보아 시계 반대)으로 빙글빙글 흐름. 바닥에 선을 긋지 않고 별빛 먼지가 흘러가는 걸로 보여 줌
     - 블랙홀에 가까울수록 물살이 셈 → 블랙홀이 움직이면 센 구간도 따라 옮겨 감 (끊겼다 이어지는 게 아니라 부드럽게)
     - 흐름을 따라가면 빨라지고 거슬러 가면 느려짐
     - 블랙홀 바로 둘레(약 12m): 가운데로 끌려 듦 + 휘감아 돎 → 스치듯 지나가면 휙 빨라지며 튕겨 나감
   · 한가운데(약 2.2m)까지 빨려 들면: 기체가 빙글빙글 작아지며 사라짐 → 카메라가 맵 아무 곳으로 날아감 → 그곳 공간이 일그러지며 열리고 튀어나옴 (체력 약 20% 깎임)
     나오는 곳: 다닐 수 있는 땅 중 남의 태어나는 방 · 벽 속 · 보스 구역은 뺌
   무게: 별빛 먼지 1600알 한 번에 · 원반 한 장 · 검은 가운데 한 장 */
import * as THREE from 'three';
import * as A from '../core/audio.js';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
export const BH = { ZONE: 30, RING: 46, FLOW: 9, CORE: 2.2, GRAB: 12 };

function whoom(up) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(up ? 50 : 220, t0); o.frequency.exponentialRampToValueAtTime(up ? 260 : 40, t0 + .7); o.connect(g); A.env(g, t0, .02, .3, .8); A.out(g, .5); o.start(t0); o.stop(t0 + .9);
  const s = A.noise(.8), bp = c.createBiquadFilter(), g2 = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(up ? 300 : 3000, t0); bp.frequency.exponentialRampToValueAtTime(up ? 3000 : 200, t0 + .7); s.connect(bp); bp.connect(g2); A.env(g2, t0, .03, .12, .7); A.out(g2, .6); s.start(t0); }

export function makeBlackHole(B, opt = {}) {
  const G = new THREE.Group();
  /* 검은 가운데: 화면을 보는 원판. 가장자리에 빛이 감겨 얇게 빛남(빛이 휘어 도는 자리) */
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * 9.; gl_Position = projectionMatrix * c; }',
    fragmentShader: `uniform float uT; varying vec2 vP; void main(){ float r = length(vP) * 2.05;                      /* 반지름 1 = 2.2m (빨려 드는 한가운데와 같은 크기) */
      float hole = 1. - smoothstep(.92, 1.02, r); float d = (r - 1.06) / .07, ring = exp(-d * d);
      float a = atan(vP.y, vP.x), flick = .8 + .2 * sin(a * 7. + uT * 5.);
      vec3 c = vec3(1.2, .95, .8) * ring * 1.6 * flick; float al = max(hole, 0.);
      gl_FragColor = vec4(c, al + ring * .8); }` }));
  core.renderOrder = 12; core.frustumCulled = false; G.add(core);
  /* 빛 원반: 바닥과 나란히 누운 원반, 휘감아 도는 뜨거운 결. 안쪽은 하얗게 뜨겁고 바깥은 주황 → 붉게 식음 */
  const disk = new THREE.Mesh(new THREE.RingGeometry(2.3, 9, 96, 1), new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ float r = length(vP), a = atan(vP.y, vP.x), u = (r - 2.3) / 6.7;
        float spin = a + uT * (2.6 / (r * .35 + .2)) - log(r) * 3.;                                              /* 안쪽일수록 빨리 돎 + 나선으로 감김 */
        vec2 q = vec2(cos(spin), sin(spin));                                                                     /* 각도를 돌린 자리로 결을 뜸 → 한 바퀴 이음매가 없음 */
        float streak = n(q * (2.5 + r * .2) + r * .9) * .7 + n(q * (7. + r * .6) - r * 2.1) * .45;
        float lit = pow(max(1. - u, 0.), 2.2) * smoothstep(0., .04, u);
        float side = .65 + .35 * sin(a + .6);                                                                    /* 다가오는 쪽이 더 밝음 */
        vec3 hot = mix(vec3(1.3, 1.15, 1.), vec3(1.1, .45, .12), smoothstep(.05, .5, u)); hot = mix(hot, vec3(.45, .08, .05), smoothstep(.5, 1., u));
        gl_FragColor = vec4(hot * lit * (.4 + streak) * side * 1.4, 1.); }` }));
  disk.rotation.x = -Math.PI / 2; disk.position.y = .6; disk.renderOrder = 11; G.add(disk);
  /* 별빛 먼지: 흐름을 따라 떠다님 (흐름이 보이는 까닭) */
  const ND = 1600, dp = new Float32Array(ND * 3), da = new Float32Array(ND), dl = new Float32Array(ND), dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aA', new THREE.BufferAttribute(da, 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 800 } },
    vertexShader: 'attribute float aA; uniform float uPx; varying float vA; void main(){ vA = aA; vec4 v = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * v; gl_PointSize = uPx * .045 * (.5 + aA) / max(1., -v.z) * 6.; }',
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float k = max(0., 1. - length(d) * 2.); gl_FragColor = vec4(mix(vec3(.55, .6, 1.), vec3(1., .85, .7), vA) * k * k * vA * .9, 1.); }' }));
  dust.frustumCulled = false; dust.renderOrder = 10; G.add(dust);
  const spawnDust = i => { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (BH.RING + 2); dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = .3 + Math.random() * 1.4; dp[i * 3 + 2] = Math.sin(a) * r; dl[i] = 2 + Math.random() * 4; };
  for (let i = 0; i < ND; i++) { spawnDust(i); dl[i] *= Math.random(); }
  const P = new THREE.Vector3();
  /* 흐름: 가운데 둘레 소용돌이 + 블랙홀 둘레 끌림 (세상 좌표 x,z에서의 바람) */
  function flow(x, z, out) {
    const r = Math.hypot(x, z); let fx = 0, fz = 0;
    if (r < BH.RING + 4) { const near = .35 + .65 * Math.exp(-Math.hypot(x - P.x, z - P.z) / 22), edge = 1 - THREE.MathUtils.smoothstep(r, BH.RING - 3, BH.RING + 4);
      const v = BH.FLOW * near * edge * Math.min(1, r / 8); fx += -z / (r + 1e-3) * v; fz += x / (r + 1e-3) * v; }                   /* 시계 반대로 빙글 */
    const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz);
    if (d < BH.GRAB) { const k = 1 - d / BH.GRAB, pull = 16 * k * k, swirl = 12 * k; fx += dx / d * pull - dz / d * swirl; fz += dz / d * pull + dx / d * swirl; }
    out[0] = fx; out[1] = fz; return d; }
  const tmp = [0, 0];
  let wanderT = Math.random() * 100;
  const S = { phase: 0, t0: 0, dest: null, from: null };    /* phase 0 평소 · 1 빨려 듦 · 2 날아감 · 3 튀어나옴 */
  /* 나오는 자리: 다닐 수 있는 땅 중 아무 곳 (남의 방 · 보스 구역 · 벽 속 뺌) */
  function pickDest() { const rooms = opt.rooms || [], mine = opt.mine || 0;
    for (let k = 0; k < 400; k++) { const x = (Math.random() - .5) * 320, z = (Math.random() - .5) * 320, r = Math.hypot(x, z);
      if (r < BH.RING + 4 || r > 150 || B.blocked(x, z) || B.field(x, z) > .2) continue;
      if (rooms.some(([rx, rz], i) => i !== mine && Math.hypot(x - rx, z - rz) < 20)) continue; return [x, z]; } return [0, -120]; }
  G.userData.S = S; G.userData.P = P;
  G.userData.update = (t, dt, fly, fs, cam, bloom, Wd, Hd, hud) => {
    /* 떠돎: 서로 다른 느린 물결 둘을 겹쳐 보스 구역 안을 천천히 돎 (초속 1m 남짓) */
    wanderT += dt; P.set(Math.cos(wanderT * .045) * 13 + Math.sin(wanderT * .071 + 1) * 7, 0, Math.sin(wanderT * .038) * 13 + Math.cos(wanderT * .059) * 7);
    G.position.set(0, 0, 0); core.position.set(P.x, 1.6, P.z); disk.position.set(P.x, .6, P.z);
    core.material.uniforms.uT.value = t; disk.material.uniforms.uT.value = t; dust.material.uniforms.uPx.value = Hd;
    /* 먼지 흐름 */
    for (let i = 0; i < ND; i++) { const x = dp[i * 3], z = dp[i * 3 + 2]; const d = flow(x, z, tmp);
      dp[i * 3] += tmp[0] * dt; dp[i * 3 + 2] += tmp[1] * dt; dl[i] -= dt;
      if (dl[i] <= 0 || d < BH.CORE || Math.hypot(dp[i * 3], dp[i * 3 + 2]) > BH.RING + 4) spawnDust(i);
      const sp = Math.hypot(tmp[0], tmp[1]); da[i] = Math.min(1, .15 + sp / 14) * Math.min(1, dl[i]) * Math.min(1, d / 4); }
    dg.attributes.position.needsUpdate = da.needsUpdate = true; dg.attributes.aA.needsUpdate = true;
    /* 기체에 흐름 싣기 · 빨려 듦 */
    const shipM = fly.children[0];
    if (S.phase === 0) { const d = flow(fs.x, fs.z, tmp); fs.ex = tmp[0]; fs.ez = tmp[1];
      if (d < BH.CORE) { S.phase = 1; S.t0 = t; S.from = [fs.x, fs.z]; S.dest = pickDest(); whoom(false); } }
    else fs.ex = fs.ez = 0;
    if (S.phase === 1) { const e = (t - S.t0) / .7, k = Math.min(1, e), a = k * 9;           /* 빙글빙글 작아지며 가운데로 */
      fs.x = P.x + Math.cos(a) * (1 - k) * 2; fs.z = P.z + Math.sin(a) * (1 - k) * 2; fs.vx = fs.vz = 0; shipM.scale.setScalar(Math.max(.01, 1 - k)); shipM.rotation.y += dt * 12;
      if (k >= 1) { S.phase = 2; S.t0 = t; shipM.visible = false; } }
    else if (S.phase === 2) { const k = Math.min(1, (t - S.t0) / .9), s = k * k * (3 - 2 * k);   /* 카메라가 나올 곳으로 날아감 */
      fs.x = P.x + (S.dest[0] - P.x) * s; fs.z = P.z + (S.dest[1] - P.z) * s; fs.vx = fs.vz = 0;
      if (k >= 1) { S.phase = 3; S.t0 = t; fs.x = S.dest[0]; fs.z = S.dest[1]; whoom(true); if (hud) hud('블랙홀을 지나 튀어나옴 · 체력 -20%'); } }
    else if (S.phase === 3) { const e = t - S.t0, k = Math.min(1, e / .45); shipM.visible = e > .12; shipM.scale.setScalar(Math.max(.01, k < 1 ? 1.25 * Math.sin(k * Math.PI * .6) / Math.sin(Math.PI * .6) : 1));
      if (e > 1.1) { S.phase = 0; shipM.scale.setScalar(1); } }
    /* 화면: 블랙홀 둘레가 휘어 보임 + 나오는 자리에서 공간이 일그러지며 열림 */
    if (bloom && cam) { const v = P.clone().setY(1.2).project(cam); const vis = v.z < 1 && Math.abs(v.x) < 1.4 && Math.abs(v.y) < 1.4;
      const pr = new THREE.Vector3(P.x + 6, 1.2, P.z).project(cam), R = Math.abs(pr.x - v.x) * .5 * (Wd / Hd);
      bloom.lens(v.x * .5 + .5, v.y * .5 + .5, Math.min(.5, R), vis ? (S.phase === 1 ? .8 : .3) : 0, Wd / Hd);
      if (S.phase === 3) { const w = new THREE.Vector3(fs.x, 1, fs.z).project(cam), e = t - S.t0; bloom.warp(w.x * .5 + .5, w.y * .5 + .5, e * .7, .035 * Math.max(0, 1 - e / 1.1), Wd / Hd); }
      else if (S.phase === 1) { bloom.warp(v.x * .5 + .5, v.y * .5 + .5, .25 * (1 - (t - S.t0) / .7), .02, Wd / Hd); }
      else bloom.warp(.5, .5, 0, 0, Wd / Hd); } };
  return G;
}
