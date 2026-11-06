/* 시작 기지 — 하늘에서 떨어지는 빛과 터지는 빛, 그 사이에서 나오는 기체
   기준점 H = 빛 물결이 판의 정중앙에 모이는 순간 = 빛이 판 가운데 땅에 닿는 순간
   떨어지는 빛 (H-0.75 → H)
   · 머리: 눈부신 흰 심 + 감싼 파란 빛 + 둘레가 열기처럼 일렁이는 빛 무리
   · 꼬리: 매끈한 줄이 아니라 불꽃처럼 갈라지고 흔들리는 빛 결이 위로 흩어지며 사라짐 (머리 쪽은 가늘고 짙게, 위로 갈수록 넓고 성기게)
   · 떨어지는 길에 빛 부스러기가 뒤로 떨어져 나가며 반짝이다 꺼짐 · 점점 빨라짐 · 땅이 가까워질수록 판 가운데가 미리 빛을 받음
   터지는 순간 (H)
   · 눈부신 섬광 한 번 · 빛 가닥 여럿이 제각각 다른 길이·속도로 갈라져 뻗음(대부분 옆으로, 몇은 위로)
   · 빛 조각이 튀어 올랐다 떨어지며 식음(흰 → 파랑 → 꺼짐) · 공간 일그러짐 충격파 · 판 쿵 · 금테 별 번쩍 · 바닥 판 선을 따라 빛이 달림
   · 빛이 가장 밝을 때 기체가 나오고, 빛이 걷히면 기체가 서 있음
   무게: 태어날 때 2초 남짓만 그림. 꼬리·빛 가닥은 각각 한 덩어리, 부스러기·조각은 점 묶음 한 번씩 */
import * as THREE from 'three';
import { makeMeteor, METEOR } from './meteor.js?v=11062253';

export const BIRTH = { PRE: METEOR.FALL, END: 2.0 };   /* 떨어지는 빛 = 유성 (meteor.js) */
const TOP = 16;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const NOISE = `float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;

/* 화면을 향한 빛 덩이: 흰 심 + 색 무리 + (선택) 열기처럼 일렁이는 가장자리 */
function glowSprite(core, halo, shimmer = 0) {
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uT: { value: 0 }, uCore: { value: new THREE.Color(...core) }, uHalo: { value: new THREE.Color(...halo) } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: `uniform float uI, uT; uniform vec3 uCore, uHalo; varying vec2 vU; ${NOISE}
      void main(){ float r=length(vU), a=atan(vU.y, vU.x+1e-5);   /* 한가운데서 atan(0,0)이 계산 안 되는 값이 되지 않게 */
        float wob=${shimmer.toFixed(2)}*(fbm(vec2(a*2.5+uT*3., r*4.-uT*6.))-.5);           /* 둘레가 일렁임 */
        float rr=max(0., r+wob*r);
        float core=exp(-rr*rr*90.)*2.2, mid=exp(-rr*rr*14.)*.9, halo=exp(-rr*rr*3.5)*.3*(.8+.4*fbm(vec2(a*3.,uT*2.)));
        float k=(core+mid+halo)*(1.-smoothstep(.75,1.,r));
        gl_FragColor=vec4((uCore*core+uHalo*(mid+halo))*uI*(1.-smoothstep(.75,1.,r)),1.); }` });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.frustumCulled = false; o.renderOrder = 9; return o;
}
/* 빛 알갱이 묶음: 크기·밝기·색이 제각각(aC: 0 흰 → 1 파랑 → 식음) */
function points(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(n), 1));
  const s = new Float32Array(n); for (let i = 0; i < n; i++) s[i] = .35 + Math.pow(Math.random(), 3) * 2.2; g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float aA, aS, aC; uniform float uPx; varying float vA, vC; void main(){ vA=aA; vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*uPx*.11/(-mv.z); }',
    fragmentShader: 'varying float vA, vC; void main(){ vec2 q=gl_PointCoord-.5; float r2=dot(q,q); float k=exp(-r2*40.)*1.3+exp(-r2*10.)*.4; vec3 c=mix(vec3(1.,.98,1.),vec3(.35,.6,1.4),clamp(vC,0.,1.)); gl_FragColor=vec4(c*k*vA,1.); }' });
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = 9; return o;
}

export function makeBirth(ship) {
  const G = new THREE.Group(), U = v => ({ value: v }), uT = U(0);

  /* ── 떨어지는 빛: 유성 ── 하늘 저 끝(비스듬히)에서 판 가운데로 */
  const C0 = new THREE.Vector3(0, .22, 0), met = makeMeteor(new THREE.Vector3(-14, 30, -9), C0); G.add(met);
  /* 땅이 미리 빛을 받음 (판 가운데 원) */
  const preM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: U(0), uT },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uI, uT; varying vec2 vP; ${NOISE} void main(){ float r=length(vP); float k=exp(-r*r*1.2)*(.85+.3*fbm(vP*3.+uT*2.)); gl_FragColor=vec4(vec3(.4,.65,1.4)*k*uI,1.); }` });
  const pre = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), preM); pre.rotation.x = -Math.PI / 2; pre.position.y = .23; pre.renderOrder = 7; G.add(pre);

  /* ── 터짐: 섬광 · 갈라져 뻗는 빛 가닥 · 튀는 빛 조각 · 판 위 빛 고리 ── */
  const flash = glowSprite([1, 1, 1.05], [.5, .72, 1.45], .25); G.add(flash);
  const NR = 46, rayM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uE: U(-1), uC: U(new THREE.Vector3()) },
    vertexShader: `attribute vec3 aDir; attribute vec4 aP; attribute float aU, aS; uniform float uE; uniform vec3 uC; varying float vU, vS, vA, vSeed;
      void main(){ vU=aU; vS=aS; vSeed=aP.w;
        float sp=aP.y, L=aP.x*(1.-exp(-max(uE,0.)*sp));                                      /* 빠르게 뻗었다 멈춤 */
        float fade=exp(-max(uE-aP.z,0.)*3.2)*step(0.,uE); vA=fade;
        vec3 a=(viewMatrix*(modelMatrix*vec4(uC,1.))).xyz, b=(viewMatrix*(modelMatrix*vec4(uC+aDir*L,1.))).xyz;   /* 부모가 옮겨지거나 줄어도 제자리 */
        vec3 d=normalize(b-a+vec3(1e-4)), n=cross(d, normalize(-a)); n = dot(n,n) > 1e-8 ? normalize(n) : vec3(1.,0.,0.);
        float w=.05*(1.-aU*.85)*(.6+aP.w*.8);
        gl_Position=projectionMatrix*vec4(mix(a,b,aU)+n*aS*w,1.); }`,
    fragmentShader: `uniform float uT; varying float vU, vS, vA, vSeed;
      void main(){ float across=exp(-vS*vS*4.);
        float flick=.75+.25*sin(vU*40.-uT*30.+vSeed*20.);                                   /* 가닥 안에서 빛이 달림 */
        float k=across*pow(max(1.-vU,0.),1.4)*flick*vA;
        gl_FragColor=vec4(mix(vec3(1.,1.,1.05),vec3(.35,.6,1.4),vU)*k*2.,1.); }` });
  const rayG = (() => { const pos = [], dir = [], P = [], au = [], as = [], idx = []; let b = 0;
    for (let r = 0; r < NR; r++) { const up = Math.random() < .2, a = Math.random() * 6.283, el = up ? .6 + Math.random() * .8 : Math.random() * .22;
      const d = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)], L = up ? 1.2 + Math.random() * 1.6 : 1.4 + Math.random() * 3.2, sp = 5 + Math.random() * 9, hold = .05 + Math.random() * .25, sd = Math.random();
      const N = 10; for (let i = 0; i <= N; i++) for (const s of [-1, 1]) { pos.push(0, 0, 0); dir.push(...d); P.push(L, sp, hold, sd); au.push(i / N); as.push(s); }
      for (let i = 0; i < N; i++) { const p = b + i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } b += (N + 1) * 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    g.setAttribute('aP', new THREE.Float32BufferAttribute(P, 4)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(as, 1)); g.setIndex(idx); return g; })();
  const rays = new THREE.Mesh(rayG, rayM); rays.frustumCulled = false; rays.renderOrder = 9; G.add(rays);
  const sparks = points(140), spS = Array.from({ length: 140 }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3() })); G.add(sparks);
  const ringM = new THREE.ShaderMaterial({ ...AB, uniforms: { uR: U(0), uI: U(0), uT },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uR, uI, uT; varying vec2 vP; ${NOISE}
      void main(){ float r=length(vP), a=atan(vP.y, vP.x+1e-5); float br=.6+.6*fbm(vec2(a*6., r*2.-uT*4.));         /* 고리도 결이 있게 */
        float k=(exp(-(((r-uR)/.1)*((r-uR)/.1)))*1.3+exp(-(((r-uR*.8)/.25)*((r-uR*.8)/.25)))*.25)*br; gl_FragColor=vec4(vec3(.5,.75,1.45)*k*uI,1.); }` });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(5, 128), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = .24; ring.renderOrder = 7; G.add(ring);

  let T0 = -99, active = false, shown = false;
  const C = new THREE.Vector3(0, .22, 0);                                                         /* 판 가운데 땅 */
  const S = { punch: 0, burst: 0, impR: 0, impK: 0, warpR: 0, warpS: 0 };
  const reset = () => { S.warpS = 0; S.impK = 0; S.burst = 0; S.punch = 0; };
  G.visible = false; G.userData.S = S;
  G.userData.start = t => { T0 = t; active = true; shown = false; G.visible = true; ship.visible = false; met.userData.reset(); spS.forEach(q => q.life = 0); };
  G.userData.stop = () => { active = false; G.visible = false; reset(); };
  G.userData.setPx = px => { met.userData.setPx(px); sparks.material.uniforms.uPx.value = px; };
  const emit = (arr, n, f) => { for (let j = 0, k = 0; j < arr.length && k < n; j++) if (arr[j].life <= 0) { f(arr[j]); k++; } };
  const flushPts = (pts, arr, col) => { const P = pts.geometry.attributes.position, A = pts.geometry.attributes.aA, Cc = pts.geometry.attributes.aC;
    arr.forEach((q, i) => { P.setXYZ(i, q.p.x, q.p.y, q.p.z); const k = Math.max(0, q.life / q.max); A.setX(i, q.life > 0 ? col(k, q) : 0); Cc.setX(i, 1 - k); }); P.needsUpdate = A.needsUpdate = Cc.needsUpdate = true; };

  G.userData.update = (t, dt) => { if (!active) return; uT.value = t; flash.material.uniforms.uT.value = t;
    const e = t - T0 - BIRTH.PRE;                                                                  /* 닿는 순간 0 */
    /* 떨어짐: 유성 (나타난 뒤 BIRTH.PRE 초에 꽂힘) */
    const M = met.userData.update(e + BIRTH.PRE, t, dt), f = M.uH, falling = e < 0;
    preM.uniforms.uI.value = falling ? Math.pow(f, 4) * 1.2 : Math.max(0, 1.2 - e * 2);
    /* 터짐 */
    const hit = e >= 0;
    if (hit && !shown) { shown = true; ship.visible = true;                                       /* 빛이 가장 밝은 순간 기체가 나옴 */
      emit(spS, 140, q => { const a = Math.random() * 6.283, up = .4 + Math.random() * 3.2, out = 1 + Math.random() * 4.5; q.max = q.life = .6 + Math.random() * .9;
        q.p.copy(C).add(new THREE.Vector3(0, .1, 0)); q.v.set(Math.cos(a) * out, up, Math.sin(a) * out); }); }
    spS.forEach(q => { if (q.life > 0) { q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.y -= 6 * dt; q.v.multiplyScalar(Math.exp(-1.2 * dt)); if (q.p.y < C.y) { q.p.y = C.y; q.v.y *= -.3; } } });
    flushPts(sparks, spS, k => k * 1.5);
    rayM.uniforms.uE.value = hit ? e : -1; rayM.uniforms.uC.value.copy(C); rays.visible = hit && e < 1.6;
    flash.visible = hit; flash.position.set(C.x, C.y + .6, C.z); flash.scale.setScalar(3.5 + e * 2.5);
    flash.material.uniforms.uI.value = hit ? (e < .08 ? 3 : 0) + Math.exp(-e * 3.5) * 2 : 0;
    ringM.uniforms.uR.value = Math.max(0, e) * 4.2; ringM.uniforms.uI.value = hit ? Math.max(0, 1 - e / 1.2) * 1.3 : 0;
    S.punch = hit && e < 1 ? -Math.sin(Math.min(1, e / .5) * Math.PI * 2) * Math.exp(-e * 4) * .07 : 0;
    S.burst = hit ? Math.exp(-e * 2.5) : 0;
    S.impR = Math.max(0, e) * 5.5; S.impK = hit ? Math.max(0, 1 - e / 1.4) : 0;
    S.warpR = Math.max(0, e) * .85; S.warpS = hit ? .028 * Math.max(0, 1 - e / 1.1) : 0;
    if (e > BIRTH.END) { active = false; G.visible = false; ship.visible = true; reset(); } };
  return G;
}
