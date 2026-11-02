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

export const BIRTH = { PRE: .75, END: 2.0 };
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
      void main(){ float r=length(vU), a=atan(vU.y,vU.x);
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

  /* ── 꼬리: 머리에서 위로, 화면을 향해 서는 불꽃 띠 ── */
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uHead: U(new THREE.Vector3()), uLen: U(1), uI: U(0) },
    vertexShader: `attribute float aU, aS; uniform vec3 uHead; uniform float uLen; varying float vU, vS;
      void main(){ vU=aU; vS=aS;
        vec3 a=(viewMatrix*vec4(uHead,1.)).xyz, b=(viewMatrix*vec4(uHead+vec3(0.,uLen,0.),1.)).xyz;
        vec3 d=normalize(b-a), n=normalize(cross(d, normalize(-a)));
        float w=mix(.16,.95,pow(aU,.7));                                                    /* 머리 쪽 가늘고 위로 넓어짐 */
        gl_Position=projectionMatrix*vec4(mix(a,b,aU)+n*aS*w,1.); }`,
    fragmentShader: `uniform float uT, uI, uLen; varying float vU, vS; ${NOISE}
      void main(){ float y=vU*uLen;
        vec2 q=vec2(vS*1.8, y*.9-uT*7.); q.x+=(fbm(q*.8+uT*.5)-.5)*1.2;                       /* 흔들리며 갈라지는 결 */
        float f=fbm(q*1.6), f2=fbm(q*3.4+3.);
        float body=smoothstep(.25+vU*.45, .9, f*(1.-abs(vS)*.9))*(1.-vU);                      /* 위로 갈수록 성기게 흩어짐 */
        float spine=exp(-vS*vS*28.)*pow(1.-vU,2.5)*1.6;                                       /* 머리 쪽 짙은 심 */
        float k=(body*(.8+f2*.6)+spine)*smoothstep(0.,.03,vU);
        vec3 c=mix(vec3(.95,.98,1.4),vec3(.3,.55,1.35),smoothstep(.0,.35,vU));
        gl_FragColor=vec4(c*k*uI*1.5,1.); }` });
  const tailG = (() => { const pos = [], au = [], as = [], N = 40; for (let i = 0; i <= N; i++) for (const s of [-1, 1]) { pos.push(0, 0, 0); au.push(i / N); as.push(s); }
    const idx = []; for (let i = 0; i < N; i++) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(as, 1)); g.setIndex(idx); return g; })();
  const tail = new THREE.Mesh(tailG, tailM); tail.frustumCulled = false; tail.renderOrder = 8; G.add(tail);
  const head = glowSprite([1, 1, 1.05], [.4, .65, 1.45], .45); G.add(head);
  const trail = points(90), trS = Array.from({ length: 90 }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3() })); G.add(trail);
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
        vec3 a=(viewMatrix*vec4(uC,1.)).xyz, b=(viewMatrix*vec4(uC+aDir*L,1.)).xyz;
        vec3 d=normalize(b-a+1e-5), n=normalize(cross(d, normalize(-a)));
        float w=.05*(1.-aU*.85)*(.6+aP.w*.8);
        gl_Position=projectionMatrix*vec4(mix(a,b,aU)+n*aS*w,1.); }`,
    fragmentShader: `uniform float uT; varying float vU, vS, vA, vSeed;
      void main(){ float across=exp(-vS*vS*4.);
        float flick=.75+.25*sin(vU*40.-uT*30.+vSeed*20.);                                   /* 가닥 안에서 빛이 달림 */
        float k=across*pow(1.-vU,1.4)*flick*vA;
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
      void main(){ float r=length(vP), a=atan(vP.y,vP.x); float br=.6+.6*fbm(vec2(a*6., r*2.-uT*4.));         /* 고리도 결이 있게 */
        float k=(exp(-pow((r-uR)/.1,2.))*1.3+exp(-pow((r-uR*.8)/.25,2.))*.25)*br; gl_FragColor=vec4(vec3(.5,.75,1.45)*k*uI,1.); }` });
  const ring = new THREE.Mesh(new THREE.CircleGeometry(5, 128), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = .24; ring.renderOrder = 7; G.add(ring);

  let T0 = -99, active = false, shown = false;
  const C = new THREE.Vector3(0, .22, 0);                                                         /* 판 가운데 땅 */
  const S = { punch: 0, burst: 0, impR: 0, impK: 0, warpR: 0, warpS: 0 };
  const reset = () => { S.warpS = 0; S.impK = 0; S.burst = 0; S.punch = 0; };
  G.visible = false; G.userData.S = S;
  G.userData.start = t => { T0 = t; active = true; shown = false; G.visible = true; ship.visible = false; trS.forEach(q => q.life = 0); spS.forEach(q => q.life = 0); };
  G.userData.stop = () => { active = false; G.visible = false; reset(); };
  G.userData.setPx = px => { trail.material.uniforms.uPx.value = px; sparks.material.uniforms.uPx.value = px; };
  const emit = (arr, n, f) => { for (let j = 0, k = 0; j < arr.length && k < n; j++) if (arr[j].life <= 0) { f(arr[j]); k++; } };
  const flushPts = (pts, arr, col) => { const P = pts.geometry.attributes.position, A = pts.geometry.attributes.aA, Cc = pts.geometry.attributes.aC;
    arr.forEach((q, i) => { P.setXYZ(i, q.p.x, q.p.y, q.p.z); const k = Math.max(0, q.life / q.max); A.setX(i, q.life > 0 ? col(k, q) : 0); Cc.setX(i, 1 - k); }); P.needsUpdate = A.needsUpdate = Cc.needsUpdate = true; };

  G.userData.update = (t, dt) => { if (!active) return; uT.value = t; head.material.uniforms.uT.value = t; flash.material.uniforms.uT.value = t;
    const e = t - T0 - BIRTH.PRE;                                                                  /* 닿는 순간 0 */
    /* 떨어짐: 점점 빨라지며 (y = TOP → 땅) */
    const f = Math.min(1, (e + BIRTH.PRE) / BIRTH.PRE), y = THREE.MathUtils.lerp(TOP, C.y, f * f * f), falling = e < 0;
    head.visible = tail.visible = falling;
    head.position.set(C.x, y, C.z); head.scale.setScalar(1.5 + f * .6); head.material.uniforms.uI.value = 1.4;
    tailM.uniforms.uHead.value.set(C.x, y, C.z); tailM.uniforms.uLen.value = Math.min(TOP - y + .5, 5.5); tailM.uniforms.uI.value = sm01(f * 4);
    if (falling) emit(trS, 3, q => { q.max = q.life = .5 + Math.random() * .6; q.p.set(C.x + (Math.random() - .5) * .25, y + Math.random() * .5, C.z + (Math.random() - .5) * .25); q.v.set((Math.random() - .5) * .9, 1.5 + Math.random() * 2, (Math.random() - .5) * .9); });
    trS.forEach(q => { if (q.life > 0) { q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-2 * dt)); } });
    flushPts(trail, trS, (k, q) => k * (.6 + .4 * Math.sin(t * 40 + q.max * 50)) * 1.4);     /* 반짝이다 꺼짐 */
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
