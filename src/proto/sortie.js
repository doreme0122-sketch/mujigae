/* 시작 기지 — 출격: 엔진이 켜지고, 충격파와 함께 박차고 나가 맵으로. 무적 막 3초 · 빠른 이동 5초
   순서 (L = 박차고 나가는 순간)
   · L-0.55 엔진 점화: 깜빡깜빡 → 확 켜짐. 열기에 공기가 일렁임
   · L-0.2  웅크림: 기체가 살짝 뒤로 물러나며 머리를 숙임(힘을 모음)
   · L      박차고 나감: 뒤로 공간 일그러짐 충격파 + 진행 방향에 수직인 충격 고리 · 비눗방울 막이 '퐁' 하고 감쌈
   · L~L+3  무적: 막(얇은 막에 빛이 비쳐 생기는 무지개 결, 진행 방향으로 살짝 늘어남). 끝나기 1초 전부터 깜빡이며 옅어짐 → 작은 방울로 터짐
   · L~L+5  빠른 이동: 엔진 불꽃이 길고 밝게 + 긴 빛 꼬리. 끝나면 불꽃이 평소 크기로 줄어듦 (막이 터지는 3초와 따로 보임)
   지나간 길엔 짧은 엔진 빛 꼬리가 남았다 빠르게 사라짐. 적 탄이 막에 맞아 물결치는 것·실제 이동 속도는 맵이 생기면 연결
   무게: 불꽃·꼬리는 띠 몇 장, 막은 구 하나, 방울은 점 묶음 하나, 충격파 일그러짐은 빛 번짐 마무리 단계에 얹음 */
import * as THREE from 'three';
import { filmMaterial } from '../preview/fxmat.js?v=11050758';

export const SORTIE = { IGN: .55, SHIELD: 3, BOOST: 5 };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/* 화면을 향해 눕는 띠 A→B (불꽃): 뿌리는 하얗고 굵게, 끝은 파랗게 가늘어지며 흔들림 */
export function flameMesh() {
  const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uW: { value: .1 }, uI: { value: 0 }, uT: { value: 0 } },
    vertexShader: `uniform vec3 uA, uB; uniform float uW; varying vec2 vU;
      void main(){ vU = uv; vec3 P = mix(uA, uB, uv.y), ax = normalize(uB - uA + vec3(1e-4));
        vec3 s = cross(ax, normalize(cameraPosition - P)); s = dot(s,s) > 1e-8 ? normalize(s) : vec3(0.,1.,0.);
        float w = uW * mix(1., .25, uv.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(P + s * (uv.x - .5) * w * 2., 1.); }`,
    fragmentShader: `uniform float uI, uT; varying vec2 vU;
      void main(){ float x = abs(vU.x * 2. - 1.), y = vU.y;
        float flick = .8 + .2 * sin(y * 30. - uT * 60.) * sin(y * 11. + uT * 23.);
        float core = exp(-x * x * 14.) * (1. - y), body = exp(-x * x * 4.) * (1. - y * y) * .6;
        vec3 c = mix(vec3(1., 1., 1.05), vec3(.3, .55, 1.4), smoothstep(.0, .55, y)) * (core * 1.6 + body);
        gl_FragColor = vec4(c * flick * uI, 1.); }` });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 8).translate(.5, .5, 0), m); o.frustumCulled = false; o.renderOrder = 9; return o;
}

export function makeSortie(ship, sm, engines) {
  const G = new THREE.Group(), U = v => ({ value: v }), uT = U(0);
  const flames = engines.map(() => { const f = flameMesh(); G.add(f); return f; });
  /* 엔진 빛 꼬리: 지난 자리 기록 → 띠 하나 (화면을 향해 눕힘) */
  const NT = 48, tp = new Float32Array(NT * 2 * 3), ta = new Float32Array(NT * 2), ts = new Float32Array(NT * 2), tidx = [];
  for (let i = 0; i < NT; i++) { ts[i * 2] = -1; ts[i * 2 + 1] = 1; if (i < NT - 1) { const p = i * 2; tidx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aA', new THREE.BufferAttribute(ta, 1)); tg.setAttribute('aS', new THREE.BufferAttribute(ts, 1)); tg.setIndex(tidx);
  const trailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT },
    vertexShader: 'attribute float aA, aS; varying float vA, vS; void main(){ vA=aA; vS=aS; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying float vA, vS; void main(){ float x=max(0.,1.-vS*vS); float k=x*vA; vec3 c=mix(vec3(.3,.55,1.4),vec3(.95,.97,1.3),vA*vA); gl_FragColor=vec4(c*k*.9,1.); }' });
  const trail = new THREE.Mesh(tg, trailM); trail.frustumCulled = false; trail.renderOrder = 8; G.add(trail);
  const hist = [];                                                     /* {p, t} 엔진 뒤 지난 자리 */
  /* 충격 고리: 진행 방향에 수직으로 서서 퍼짐 (빨강 바깥 → 보라 안쪽으로 갈라진 얇은 고리) */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uR: U(0), uI: U(0) },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uR, uI; varying vec2 vP;
      void main(){ float r=length(vP); vec3 c=vec3(0.);
        for(int i=0;i<6;i++){ float w=float(i)/5.; float q=(r-uR*(1.+(w-.5)*.12))/.06; c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*exp(-q*q); }
        gl_FragColor=vec4(c/3.*uI,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(4, 96), shockM); shock.renderOrder = 9; G.add(shock);
  /* 무적 막 */
  const filmM = filmMaterial(), bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), filmM); bubble.renderOrder = 10; bubble.frustumCulled = false; G.add(bubble);
  const NB = 80, bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3)); bg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(NB), 1));
  const bM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: U(600) },
    vertexShader: 'attribute float aA; uniform float uPx; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uPx*.04/max(.1,-mv.z); }',
    fragmentShader: 'varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float r=length(q); float ring=exp(-(r-.32)*(r-.32)*300.)+exp(-r*r*60.)*.3; vec3 c=.6+.4*cos(6.2832*(r*2.+vec3(0.,.33,.67))); gl_FragColor=vec4(c*ring*vA,1.); }' });
  const drops = new THREE.Points(bg, bM); drops.frustumCulled = false; drops.renderOrder = 10; G.add(drops);
  const DR = Array.from({ length: NB }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));

  const box = new THREE.Box3(), size = new THREE.Vector3(), v = new THREE.Vector3(), fw = new THREE.Vector3(), cen = new THREE.Vector3();
  let L = 1e9, popped = false, pos0 = new THREE.Vector3(), launched = false;
  const S = { warpS: 0, warpR: 0, warpP: new THREE.Vector3(), boost: 0, flying: false };
  G.userData.S = S;
  G.userData.setPx = px => { bM.uniforms.uPx.value = px; };
  G.userData.start = launchAt => { L = launchAt; popped = false; launched = false; hist.length = 0; DR.forEach(d => d.life = 0); G.visible = true; };
  G.userData.stop = () => { L = 1e9; launched = false; G.visible = false; S.flying = false; S.warpS = 0; };
  /* 박차고 나갈 때 기체를 장면에 붙이라고 알려줌 */
  G.userData.onLaunch = null;
  G.userData.update = (t, dt) => { uT.value = t; if (L > 1e8) { G.visible = false; return; } const e = t - L;
    ship.updateMatrixWorld(true); fw.set(0, 0, -1).transformDirection(ship.matrixWorld);                   /* 기체 앞쪽 */
    /* 엔진: 점화(깜빡) → 확 켜짐 → 빠른 5초는 길고 밝게 → 평소 크기 */
    let I = 0, len = .5;
    if (e >= -SORTIE.IGN && e < -.25) I = Math.sin((e + SORTIE.IGN) * 70) > .2 ? .7 : .1;
    else if (e >= -.25) { const boost = e < SORTIE.BOOST ? 1 : Math.max(0, 1 - (e - SORTIE.BOOST) / .4); S.boost = boost;
      I = 1 + boost * .6 + (e >= 0 && e < .15 ? 1.5 : 0); len = .6 + boost * 1.3 + (e >= 0 && e < .25 ? 1.2 : 0); }
    flames.forEach((f, i) => { f.visible = I > 0; v.copy(engines[i]).applyMatrix4(sm.matrixWorld); f.material.uniforms.uA.value.copy(v);
      f.material.uniforms.uB.value.copy(v).addScaledVector(fw, -len * (.9 + .1 * Math.sin(t * 50 + i))); f.material.uniforms.uW.value = .1 + .05 * (I > 1 ? 1 : 0); f.material.uniforms.uI.value = I; f.material.uniforms.uT.value = t; });
    /* 박차고 나감 */
    if (e >= 0 && !launched) { launched = true; S.flying = true; if (G.userData.onLaunch) G.userData.onLaunch(); ship.updateMatrixWorld(true); pos0.setFromMatrixPosition(ship.matrixWorld);
      box.setFromObject(sm); box.getSize(size); }
    if (e >= -.25 && e < 0) { const k = sm01((e + .25) / .25); ship.rotation.z = -.06 * k; }              /* 웅크림: 머리를 숙임 */
    if (launched) {
      const vB = 16, vN = 7;                                                                               /* 빠른 이동 · 보통 (판 단위/초) */
      /* 충격파가 빵 터지는 순간 한 번에 확 튀어 나감(순간 속도 60 → 빠르게 잦아들어 빠른 이동 속도로) */
      const VD = 60, TAU = .12, eb = Math.min(e, SORTIE.BOOST);
      const dist = vB * eb + (VD - vB) * TAU * (1 - Math.exp(-e / TAU)) + Math.max(0, e - SORTIE.BOOST) * vN;
      ship.position.set(pos0.x + dist, pos0.y + Math.min(.5, e * 4) + Math.sin(e * 3) * .05, pos0.z);
      ship.rotation.z = e < .3 ? -.06 * (1 - e / .3) + .05 * Math.sin(e / .3 * Math.PI) : Math.sin(e * 2.3) * .02;
      ship.updateMatrixWorld(true); box.setFromObject(sm); box.getCenter(cen);
      /* 꼬리 기록 */
      v.copy(engines[0]).applyMatrix4(sm.matrixWorld); if (engines.length > 1) { v.set(0, 0, 0); engines.forEach(p => v.add(cen.clone().copy(p).applyMatrix4(sm.matrixWorld))); v.divideScalar(engines.length); }
      hist.unshift({ p: v.clone(), t }); if (hist.length > NT) hist.pop();
      /* 충격파: 기체 뒤에서 일그러짐 + 수직 충격 고리 */
      S.warpP.copy(pos0); S.warpR = e * .9; S.warpS = e < 1 ? .035 * (1 - e) : 0;
      shock.visible = e < .8; shock.position.copy(pos0).addScaledVector(fw, -.4); shock.lookAt(shock.position.clone().add(fw)); shockM.uniforms.uR.value = .4 + e * 5; shockM.uniforms.uI.value = Math.max(0, 1 - e / .8) * 1.4;
      /* 막: 퐁 → 3초 → 깜빡이며 옅어짐 → 터짐 */
      const inv = e < SORTIE.SHIELD;
      bubble.visible = inv; bubble.position.copy(cen);
      const R = Math.max(size.x, size.z) * .62, pop = e < .15 ? 1 + .25 * Math.sin(e / .15 * Math.PI) : 1, stretch = 1 + S.boost * .18;
      bubble.scale.set(R * stretch * pop, R * .62 * pop, R * pop);
      const blink = e > SORTIE.SHIELD - 1 ? (.55 + .45 * Math.cos((e - SORTIE.SHIELD + 1) * 26)) * (1 - (e - SORTIE.SHIELD + 1) * .5) : 1;
      filmM.uniforms.uT.value = t; filmM.uniforms.uI.value = sm01(e / .12) * blink * .9; filmM.uniforms.uCrack.value = e > SORTIE.SHIELD - .25 ? (e - SORTIE.SHIELD + .25) * 4 : 0;
      if (!inv && !popped) { popped = true; DR.forEach(d => { d.life = .5 + Math.random() * .4; d.p.copy(cen).add(v.randomDirection().multiply(new THREE.Vector3(R * stretch, R * .62, R))); d.v.copy(d.p).sub(cen).multiplyScalar(1.8).add(new THREE.Vector3(-vB * .3, 0, 0)); }); }
    } else { bubble.visible = false; shock.visible = false; S.warpS = 0; }
    /* 꼬리 띠: 지난 자리, 빠를 땐 오래(길게) 남고 보통이면 짧게 */
    { const life = .18 + S.boost * .3;
      for (let i = 0; i < NT; i++) { const h = hist[Math.min(i, hist.length - 1)]; const age = h ? t - h.t : 9, a = h ? Math.max(0, 1 - age / life) : 0;
        const p = h ? h.p : v, w = .12 * (1 - i / NT) + .02;
        tp[i * 6] = p.x; tp[i * 6 + 1] = p.y; tp[i * 6 + 2] = p.z + w; tp[i * 6 + 3] = p.x; tp[i * 6 + 4] = p.y; tp[i * 6 + 5] = p.z - w;   /* 위에서 보는 게임: 옆으로 넓은 띠 */ ta[i * 2] = ta[i * 2 + 1] = a; }
      tg.attributes.position.needsUpdate = tg.attributes.aA.needsUpdate = true; trail.visible = launched; }
    { const P = bg.attributes.position, A = bg.attributes.aA;
      DR.forEach((d, i) => { if (d.life > 0) { d.life -= dt; d.p.addScaledVector(d.v, dt); d.v.multiplyScalar(Math.exp(-3 * dt)); } P.setXYZ(i, d.p.x, d.p.y, d.p.z); A.setX(i, Math.max(0, d.life) * 2); });
      P.needsUpdate = A.needsUpdate = true; } };
  return G;
}
