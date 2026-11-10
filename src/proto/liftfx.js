/* 층 오르내리기 연출 (공용 블록 · 2026-11-10 사용자 확정: "딱 좋아")
   초원 섬(isleview)과 연출 시안(liftlab)이 같은 것을 씀
   · 올라갈 때: 박차고 떠난 높이에서 작은 충격파(태어날 때 운석 충격파를 작게) + 세로 빛줄기(아래로 흐름)
   · 내려갈 때: 세로 빛줄기만(위로 흐름)
   · 기체와 빛줄기는 휘지 않음: 충격파가 도는 동안만 기체를 뺀 풍경을 먼저 그리고, 물결 자리만 휘게 옮겨 그린 뒤(깊이 포함), 기체 · 빛줄기를 그 위에 그림
     충격파가 없을 땐 한 번에 그림 (폰에서 가볍게)
   쓰는 법: const fx = makeLiftFx(renderer, scene) · 기체(와 기체에 붙은 것)는 fx.mine(물체)로 겹을 나눔
     fx.go(dir, x, y, z) — 오르내리기 시작할 때 (dir +1 위 · −1 아래)
     fx.step(dt, { moving, f, x, y, z, left }) — 매 장면 (f 0~1 · left 도착까지 남은 시간 s) · fx.size(W, H) · fx.render(camera, 그릴 곳) */
import * as THREE from 'three';

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const ME = 1;   /* 기체 · 빛줄기 겹 (충격파에 휘지 않음) */

/* ── 세로 빛줄기 ──
   공기 속에 잠깐 맺히는 빛 (기체가 지나는 길 둘레 · 땅에 붙어 있음) → 기체를 따라가는 카메라에는 반대로 흘러 보임
   한 가닥 = 바람에 찢긴 빛: 조각들이 끊어지며 흐르는 쪽으로 미끄러짐 · 가운데 아주 가는 흰 심 + 옅은 푸른 번짐 · 꼬리 쪽은 흐려짐
   빛 알갱이 하나가 줄기를 따라 빠르게 미끄러짐 · 곧은 직선 · 늘 카메라를 봄(세로축은 그대로)
   출발하는 순간 바로 가장 밝고 → 이동하는 동안 옅어져 → 도착하면 0.1초 안에 사라짐 (사용자 2026-11-10: 도착한 뒤에 나오면 의미 없음) */
function Streaks(scene, N) {
  const g = new THREE.InstancedBufferGeometry(), P = [], I = [], SEG = 24;
  for (let k = 0; k <= SEG; k++) { const v = k / SEG; P.push(-1, v, 0, 1, v, 0); if (k < SEG) I.push(k * 2, k * 2 + 1, k * 2 + 3, k * 2, k * 2 + 3, k * 2 + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
  const iA = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iB = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4), iC = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2); [iA, iB, iC].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iA', iA); g.setAttribute('iB', iB); g.setAttribute('iC', iC); g.instanceCount = 0;   /* iA: 아래 끝 x, y, z · 길이  /  iB: 굵기 · 밝기 · 나이(0~1) · 흐름(+1 아래로 흘러 보임 · −1 위로)  /  iC: 씨앗 · 미끄러지는 빠르기 */
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 iA, iB; attribute vec2 iC; varying vec2 vQ; varying float vB, vV, vAg, vS, vSp, vL;
      void main(){ float v = position.y, taper = pow(sin(v * 3.14159), .55);                                           /* 양 끝이 가늘게 */
        vec3 w = iA.xyz + vec3(0., v * iA.w, 0.); vec3 side = normalize(cross(vec3(0., 1., 0.), cameraPosition - w));   /* 세로축은 그대로 두고 카메라 쪽으로 돌림 */
        w += side * position.x * iB.x * (1.6 + 1.4 * taper);   /* 번짐까지 담는 폭 · 곧은 직선 (사용자 2026-11-10: 흔들림 때문에 휘어 보임 → 뺌) */
        float ag = clamp(iB.z, 0., 1.);
        vB = iB.y * smoothstep(0., .06, ag) * pow(1. - ag, 1.3) * taper; vV = iB.w > 0. ? v : 1. - v; vAg = ag; vS = iC.x; vSp = iC.y; vL = iA.w;   /* vV: 0 = 머리(흘러가는 쪽 끝 · 아래로 흐르면 아래 끝) → 1 = 꼬리 */
        vQ = vec2(position.x * (1.6 + 1.4 * taper), v); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `varying vec2 vQ; varying float vB, vV, vAg, vS, vSp, vL;
      float h(float x){ return fract(sin(x * 127.1) * 43758.55); }
      float vn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h(i), h(i + 1.), f); }
      void main(){ float u = vQ.x, s = vV;
        float fl = s * vL * 2.2 + vAg * vSp * 3.2;                                                                       /* 조각들이 머리 쪽(흐르는 쪽)으로 미끄러짐 */
        float piece = smoothstep(.32, .62, vn1(fl + vS * 50.)) * (.6 + .4 * vn1(fl * 2.7 + vS * 9.));                     /* 바람에 찢긴 빛 조각 (끊어짐 · 길이 제각각) */
        float tail = pow(1. - s, 1.3) * smoothstep(0., .06, s) + .05;                                                    /* 머리가 밝고 꼬리로 흐려짐 */
        float core = exp(-u * u * 60.) * piece, halo = exp(-u * u * 4.) * (.18 + .3 * piece);
        float bp = 1. - fract(vS * 7.3 + vAg * (1.6 + vSp)), bead = exp(-pow((s - bp) * vL / .09, 2.)) * exp(-u * u * 14.) * 1.8;   /* 줄기를 따라 미끄러지는 빛 알갱이 */
        vec3 c = vec3(1.) * core * 2.6 + mix(vec3(.45, .66, 1.), vec3(.62, .55, 1.), s) * halo * 1.6 + vec3(.9, .96, 1.) * bead * 1.5;
        gl_FragColor = vec4(c * tail * vB, 1.); }` }));
  m.frustumCulled = false; m.renderOrder = 9; m.layers.set(ME); scene.add(m);   /* 기체와 같은 겹: 충격파에 휘지 않음 (사용자 2026-11-10) */
  const L = [];
  return {
    emit(o) { if (L.length >= N) L.shift(); L.push({ ...o, age: 0 }); },
    update(dt) { let n = 0; for (let i = L.length - 1; i >= 0; i--) { L[i].age += dt; if (L[i].age >= L[i].life) L.splice(i, 1); }
      for (const q of L) { iA.array.set([q.x, q.y, q.z, q.len], n * 4); iB.array.set([q.w, q.b, q.age / q.life, q.flow], n * 4); iC.array.set([q.seed, q.sp], n * 2); n++; }
      g.instanceCount = n; iA.needsUpdate = iB.needsUpdate = iC.needsUpdate = true; } }; }

export function makeLiftFx(renderer, scene) {
  const SK = Streaks(scene, 48);
  /* 충격파 (태어날 때 운석 충격파를 작게): 박차고 떠난 높이의 수평 고리(위에서 비스듬히 보면 납작한 타원)로 퍼짐
     · 센 첫 물결 + 뒤따르는 약한 물결 둘 (운석과 같은 모양) · 물마루에서 빛이 살짝 갈라지고 밝아짐 · 0.45초에 약 3m까지 퍼지며 사라짐 */
  const rtW = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(2, 2) });
  const shockU = { tC: { value: rtW.texture }, tD: { value: rtW.depthTexture }, uS: { value: new THREE.Vector4(.5, .5, .1, .1) }, uK: { value: 0 } };
  const shockQ = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, uniforms: shockU, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth,
    vertexShader: 'in vec3 position; in vec2 uv; out vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; precision highp sampler2D; in vec2 vU; out vec4 o; uniform sampler2D tC, tD; uniform vec4 uS; uniform float uK;
      float g(float x, float c, float s){ return exp(-((x - c) / s) * ((x - c) / s)); }
      void main(){ vec2 uv = vU; vec3 c;
        if (uK > 0.) { vec2 e = max(uS.zw, vec2(1e-4)), d = (uv - uS.xy) / e; float r = length(d) + 1e-5, W = .16;              /* r = 1 이 물결 앞머리 (타원을 둥글게 펴서 잼) */
          float w = g(r, 1., W) - g(r, 1. - W * 1.3, W) * .6 + (g(r, .72, W * .85) - g(r, .72 - W * 1.1, W * .85) * .6) * .45 + g(r, .48, W * .7) * .2;
          vec2 dir = d / r * e; float k = uK * .5;                                                              /* 물결 앞머리는 바깥으로 · 뒤는 안으로 밀림 → 공기가 눌렸다 풀림 */
          uv -= dir * w * k; float ca = max(w, 0.) * uK * .5;
          c = vec3(texture(tC, uv + dir * ca * .02).r, texture(tC, uv).g, texture(tC, uv - dir * ca * .02).b) * (1. + .3 * max(w, 0.) * uK); }
        else c = texture(tC, uv).rgb;
        o = vec4(c, 1.); gl_FragDepth = texture(tD, vU).r; }` }));
  shockQ.frustumCulled = false; const shockS = new THREE.Scene(); shockS.add(shockQ); const shockC = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const S = { dir: 0, left: 0, acc: 0, burst: false, shock: 9, sx: 0, sy: 0, sz: 0 }, c = new THREE.Vector3(), px = new THREE.Vector3(), pz = new THREE.Vector3();
  return {
    mine(o) { o.traverse(q => q.layers.set(ME)); },
    size(W, H) { rtW.setSize(W, H); },
    go(dir, x, y, z) { S.dir = dir; S.burst = false; S.acc = 0; if (dir > 0) { S.shock = 0; S.sx = x; S.sy = y - .3; S.sz = z; } },   /* 올라갈 때만: 박차는 자리에서 충격파 */
    /* 세로 빛줄기: 출발하는 순간 여러 가닥이 한꺼번에 맺히고, 이동 앞쪽 절반 동안 조금 더 맺힘 · 모두 도착 뒤 0.1초 안에 사라지게 수명을 맞춤
       공기에 붙어 있어 기체를 따라가는 화면에선 반대로 흘러 보임 · 기체에 가까운 건 굵고 밝고 빠르게 · 먼 건 가늘고 흐리고 느리게 (깊이) */
    step(dt, { moving, f, x, y, z, left }) {
      if (moving) { const n = S.burst ? 0 : 9; S.burst = true; if (f < .55) S.acc += dt * 30; let k = n + Math.floor(S.acc); S.acc -= Math.floor(S.acc);
        for (; k > 0; k--) { const a = rnd() * 6.283, near = rnd(), r = .75 + near * 1.6, len = (2.6 - near * 1.1) * (.8 + rnd() * .5);
          SK.emit({ x: x + Math.cos(a) * r, y: y + S.dir * (rnd() * 2.4) - len * .5, z: z + Math.sin(a) * r, len, w: .06 - near * .03 + rnd() * .012, b: (1.5 - near * .9) * (.8 + rnd() * .4), flow: S.dir, life: (left + .1) * (.85 + rnd() * .15), seed: rnd(), sp: 1.8 - near * 1.1 + rnd() * .4 }); } }
      SK.update(dt); S.shock += dt; },
    render(camera, target) {
      const k = S.shock / .45;
      if (k >= 1) { camera.layers.enableAll(); renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera); return; }   /* 충격파가 없을 땐 한 번에 */
      const e = 1 - Math.pow(1 - k, 3), rw = .3 + 2.7 * e; c.set(S.sx, S.sy, S.sz).project(camera); px.set(S.sx + rw, S.sy, S.sz).project(camera); pz.set(S.sx, S.sy, S.sz + rw).project(camera);   /* 수평 고리 → 화면에서 가로 · 세로 반지름을 따로 잼 */
      const rx = Math.abs(px.x - c.x) * .5; shockU.uS.value.set(c.x * .5 + .5, c.y * .5 + .5, rx, Math.max(Math.abs(pz.y - c.y) * .5, .25 * rx)); shockU.uK.value = Math.pow(1 - k, 1.6) * Math.min(1, k * 12);
      camera.layers.set(0); renderer.setRenderTarget(rtW); renderer.clear(); renderer.render(scene, camera);          /* ① 기체를 뺀 풍경 */
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(shockS, shockC);                              /* ② 물결 자리만 휘게 옮겨 그림 (깊이 포함) */
      camera.layers.set(ME); renderer.render(scene, camera); camera.layers.enableAll(); } };                          /* ③ 기체 · 세로 빛줄기는 휘지 않게 그 위에 */
}
