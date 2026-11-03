/* 떠다니는 알갱이 — 땅마다 공중에 떠 있는 것이 달라서, 바닥을 보지 않아도 '어디에 왔는지' 몸으로 느껴짐
   · 바닥이 아니라 공중(0.5~7m)에 떠 있음 → 나중에 깔 수풀·시야 안개와 겹치지 않고 그 위로 보임
   · 땅마다 이유 있는 움직임:
     먼지 들판 = 바람에 천천히 떠도는 먼지 · 떠도는 바위숲 = 느리게 구르는 돌 부스러기 · 유성 낙하지 = 비스듬히 떨어지는 불똥
     안개 늪 = 숨 쉬듯 깜빡이며 떠오르는 포자 · 블랙홀 협곡 = 한 점으로 빨려 들며 도는 알갱이 · 고철 언덕 = 뒤집히며 번쩍이는 쇳조각
     얼음 성운 = 좌우로 흔들리며 내리는 눈 · 용암 균열 = 흔들리며 솟는 불티 · 결정 협곡 = 반짝 켜졌다 꺼지는 결정 가루
     함선 묘지 = 식어 가며 떨어지는 재 · 폭풍 고원 = 옆으로 빠르게 날리는 빗방울 같은 바람 알갱이
     보물 땅 = 금가루·별빛·보랏빛 티끌이 천천히 반짝 · 무너진 중심부 = 붉은 재와 불씨
   · 알갱이는 태어난 땅의 것으로 살다 사라짐 → 경계에선 두 땅 알갱이가 자연스럽게 섞여 넘어감(칸칸이 끊기지 않음)
   · 무게: 점 360개 한 묶음(그리기 1번). 화면 둘레에서만 살고, 멀어지면 다시 둘레에 태어남 */
import * as THREE from 'three';

/* 땅마다: 색 · 크기 · 움직임(0 떠돎 1 떨어짐 2 솟음 3 소용돌이 4 옆바람) · 속도 · 반짝임(0 은은 1 깜빡 2 번쩍) · 많이(0~1) */
const K = [
  { c: [1, .92, .75], s: .07, m: 0, v: .35, tw: 0, n: .7 },      // 먼지 들판
  { c: [.7, .72, .78], s: .09, m: 0, v: .2, tw: 0, n: .5 },      // 떠도는 바위숲
  { c: [1.4, .6, .2], s: .07, m: 1, v: 3.2, tw: 1, n: .45 },     // 유성 낙하지
  { c: [.45, 1.2, .9], s: .1, m: 2, v: .35, tw: 1, n: .8 },      // 안개 늪
  { c: [1.2, .8, .4], s: .07, m: 3, v: 1.2, tw: 0, n: .8 },      // 블랙홀 협곡
  { c: [1.1, .85, .55], s: .07, m: 0, v: .3, tw: 2, n: .5 },     // 고철 언덕
  { c: [.95, 1.05, 1.3], s: .09, m: 1, v: .9, tw: 0, n: 1 },     // 얼음 성운
  { c: [1.5, .5, .12], s: .08, m: 2, v: 1.6, tw: 1, n: .9 },     // 용암 균열
  { c: [1.1, .95, 1.4], s: .07, m: 0, v: .15, tw: 2, n: .8 },    // 결정 협곡
  { c: [.6, .55, .55], s: .08, m: 1, v: .45, tw: 0, n: .6 },     // 함선 묘지
  { c: [.8, .9, 1.3], s: .06, m: 4, v: 9, tw: 0, n: .9 },        // 폭풍 고원
  { c: [1.4, 1.1, .45], s: .07, m: 0, v: .2, tw: 2, n: .7 },     // 보물 동굴
  { c: [1.1, .6, 1.4], s: .08, m: 3, v: .6, tw: 1, n: .7 },      // 웜홀 정원
  { c: [1.3, 1, .6], s: .07, m: 0, v: .15, tw: 2, n: .6 },       // 고대 금고
  { c: [1.2, 1.2, 1.4], s: .06, m: 0, v: .1, tw: 2, n: .8 },     // 별빛 광산
  { c: [.85, .75, 1.2], s: .07, m: 0, v: .2, tw: 1, n: .5 },     // 숨은 동굴
  { c: [1.4, .35, .15], s: .08, m: 2, v: .9, tw: 1, n: .8 },     // 무너진 중심부
  { c: [0, 0, 0], s: 0, m: 0, v: 0, tw: 0, n: 0 }];              // 소행성 잔해: 없음

export function makeMotes(B, centers = [], NUM = 360) {   /* centers: [[땅 번호, x, z], …] 소용돌이 알갱이가 도는 가운데 */
  const pos = new Float32Array(NUM * 3), col = new Float32Array(NUM * 3), aux = new Float32Array(NUM * 4);   /* aux: 크기, 밝기, 반짝임 종류, 위상 */
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.BufferAttribute(col, 3)); g.setAttribute('aX', new THREE.BufferAttribute(aux, 4));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uPx: { value: 600 } },
    vertexShader: `attribute vec3 aC; attribute vec4 aX; uniform float uT, uPx; varying vec3 vC; varying float vA;
      void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
        float tw = aX.z<.5 ? .75+.25*sin(uT*1.3+aX.w*6.28)                                   /* 은은하게 */
                 : aX.z<1.5 ? .35+.65*max(0.,sin(uT*2.2+aX.w*6.28))                          /* 숨 쉬듯 깜빡 */
                 : .2+1.6*pow(max(0.,sin(uT*3.1+aX.w*40.)), 12.);                            /* 면이 빛을 받는 순간만 번쩍 */
        vC=aC; vA=aX.y*tw; gl_PointSize=max(2., uPx*aX.x*6./max(.5,-mv.z)); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float r=dot(q,q); float k=exp(-r*18.); if(k<.02) discard; gl_FragColor=vec4(vC*k*vA*1.5,1.); }` });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 7;
  const P = Array.from({ length: NUM }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, k: 17, life: 0, max: 1, ph: Math.random() }));
  const R = 46;                                                                                    /* 화면 둘레 반지름 (날아 보기 화면을 덮음) */
  let cx = 0, cz = 0;
  function born(p, near) {
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * 6.28, r = near ? Math.sqrt(Math.random()) * R : R * (.75 + Math.random() * .25);
      p.x = cx + Math.cos(a) * r; p.z = cz + Math.sin(a) * r; p.k = B.region(p.x, p.z);
      if (Math.random() < K[p.k].n) break; p.k = 17; }
    const k = K[p.k]; p.c = k.m === 3 ? centerOf(p.k, p.x, p.z) : null; p.y = .5 + Math.random() * 6.5; p.life = 0; p.max = 4 + Math.random() * 6; p.ph = Math.random();
    const a = Math.random() * 6.28;
    p.vx = Math.cos(a) * k.v * .4; p.vz = Math.sin(a) * k.v * .4; p.vy = 0;
    if (k.m === 1) { p.vy = -k.v; p.vx += k.v * .25; p.y = 2 + Math.random() * 6; }                 /* 떨어짐: 높은 곳에서 */
    if (k.m === 2) { p.vy = k.v; p.y = .3 + Math.random() * 3; }                                    /* 솟음: 낮은 곳에서 */
    if (k.m === 4) { p.vx = k.v; p.vz = k.v * .35; p.vy = -.4; }                                    /* 옆바람: 한 방향으로 */
  }
  const centerOf = (k, x, z) => { let b = null, bd = 1e9; for (const c of centers) if (c[0] === k) { const d = Math.hypot(c[1] - x, c[2] - z); if (d < bd) { bd = d; b = c; } } return b ? [b[1], b[2]] : [x, z]; };
  P.forEach(p => born(p, true));
  return { mesh: pts,
    setPx(px) { mat.uniforms.uPx.value = px; },
    update(t, dt, fx, fz) { cx = fx; cz = fz; mat.uniforms.uT.value = t;
      for (let i = 0; i < NUM; i++) { const p = P[i], k = K[p.k];
        p.life += dt;
        if (p.life > p.max || Math.hypot(p.x - cx, p.z - cz) > R * 1.1 || p.y < 0 || p.y > 9) born(p, true);   /* 둘레 어디서나 서서히 생겨남 */
        if (k.m === 0) { p.vx += Math.sin(t * .3 + p.ph * 9) * .05 * dt; p.vz += Math.cos(t * .27 + p.ph * 7) * .05 * dt; p.vy = Math.sin(t * .5 + p.ph * 6) * .08; }
        else if (k.m === 1) p.vx = k.v * .25 + Math.sin(t * 1.4 + p.ph * 9) * k.v * .2;              /* 내리며 좌우로 흔들림 */
        else if (k.m === 2) { p.vx = Math.sin(t * 2 + p.ph * 9) * .35; p.vz = Math.cos(t * 1.7 + p.ph * 7) * .35; }   /* 솟으며 흔들림 */
        else if (k.m === 3) { const dx = p.x - p.c[0], dz = p.z - p.c[1], d = Math.hypot(dx, dz) || 1; p.vx = (-dz / d) * k.v - dx / d * k.v * .25; p.vz = (dx / d) * k.v - dz / d * k.v * .25; }   /* 돌며 빨려 듦 */
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const fade = Math.min(1, p.life / .8, (p.max - p.life) / 1.2);                                /* 생겨날 때·사라질 때 서서히 */
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        col[i * 3] = k.c[0]; col[i * 3 + 1] = k.c[1]; col[i * 3 + 2] = k.c[2];
        aux[i * 4] = k.s; aux[i * 4 + 1] = Math.max(0, fade); aux[i * 4 + 2] = k.tw; aux[i * 4 + 3] = p.ph; }
      g.attributes.position.needsUpdate = g.attributes.aC.needsUpdate = g.attributes.aX.needsUpdate = true; } };
}
