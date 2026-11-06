/* 유성 — 하늘 저 끝에서 한 점(C)으로 내리꽂힘. 유성 시안 페이지와 시작 기지가 같이 쓴다.
   · 멀리서 작은 점으로 반짝 나타나 다가오다가, 땅에 가까워질수록 확 빨라져 내리꽂힘 (진행 u = (t/FALL)^EXP)
   · 머리: 하얗게 타는 심 + 둘레의 빛 안개(가장자리가 열기처럼 일렁임)
   · 꼬리 = 남는 흔적: 머리가 지나간 자리마다 빛 가닥이 남아, 그 자리의 '지난 시간'에 따라
     하얗게 뜨거움 → 파랗게 식음 → 빛이 갈라져 옅은 무지개로 풀리며 빠르게 흩어짐 (가닥마다 파장 하나, 칠한 색 아님)
   · 반짝이 부스러기가 흔적을 따라 남아 깜빡이다 꺼짐
   update(e): e = 나타난 뒤 지난 시간. e = FALL 이 꽂히는 순간. 그 뒤엔 새로 생기는 것 없이 흔적만 사라짐
   무게: 빛 가닥 700개 한 묶음(위치는 셰이더가 계산) + 점 묶음 하나 */
import * as THREE from 'three';

export const METEOR = { FALL: .8, EXP: 2.2, FADE: .6 };      /* FADE: 꽂힌 뒤 흔적이 다 사라지는 시간 */
const N = 700;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const NOISE = `float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;

export function makeMeteor(S0, C, opt = {}) {
  const { FALL, EXP } = METEOR, K = opt.scale || 1;
  const G = new THREE.Group();
  const U = { uS0: { value: S0.clone() }, uC: { value: C.clone() }, uT: { value: 0 }, uE: { value: -1 }, uK: { value: K } };
  const SEG = 14, pos = [], aA = [], aB = [], idx = [];
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.2832, r = Math.pow(Math.random(), .8), w = Math.random(), seed = Math.random(), reach = .2 + Math.pow(Math.random(), .5) * .5, wid = .5 + Math.pow(Math.random(), 4) * 2.5;
    for (let k = 0; k <= SEG; k++) for (const sd of [-1, 1]) { pos.push(0, 0, 0); aA.push(a, r, w, seed); aB.push(k / SEG, sd, reach, wid); }
    const b = i * (SEG + 1) * 2; for (let k = 0; k < SEG; k++) { const p = b + k * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 4)); tg.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 4)); tg.setIndex(idx);
  const trailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `attribute vec4 aA, aB; uniform vec3 uS0, uC; uniform float uT, uE, uK; varying float vX, vW, vAge, vA; ${NOISE}
      const float FALL=${FALL.toFixed(2)}, EXP=${EXP.toFixed(2)};
      void main(){ float ang=aA.x, r=aA.y, w=aA.z, seed=aA.w, s=aB.x, sd=aB.y, reach=aB.z, wid=aB.w; vX=sd; vW=w;
        float uH = pow(clamp(uE/FALL,0.,1.), EXP);                          /* 머리가 지금 있는 자리 */
        float u = uH*(1.-s*reach);                                            /* 이 가닥 점이 놓인 길 위 자리 */
        float tPass = pow(max(u,0.),1./EXP)*FALL;                             /* 머리가 그 자리를 지난 때 */
        float age = max(0., uE - tPass); vAge = age;
        vec3 D = normalize(uC-uS0), P1 = normalize(cross(D, vec3(0.,1.,.001))), P2 = cross(D,P1);
        float spread = r*(.03 + age*1.6 + age*age*2.)*uK;                      /* 빨리 사라지는 만큼 빨리 퍼짐 */
        float tb = (fbm(vec2(seed*7.+u*9., uT*.8))-.5)*age*2.*uK;
        float A = ang + (w-.5)*age*4.;
        vec3 off = (cos(A)*P1 + sin(A)*P2)*spread + (P1*.8+P2*.6)*tb + P1*(w-.5)*age*.9*uK;
        vec3 p = mix(uS0, uC, u) + off, q = mix(uS0, uC, max(u-.004,0.)) + off;
        vec3 a=(viewMatrix*(modelMatrix*vec4(p,1.))).xyz, b=(viewMatrix*(modelMatrix*vec4(q,1.))).xyz;   /* 부모가 옮겨지거나 줄어도 제자리 (하늘 맵의 기지는 0.69배·돌려 놓임) */
        vec3 n=cross(normalize(b-a+vec3(1e-4)), normalize(-a+vec3(1e-4))); n = dot(n,n) > 1e-8 ? normalize(n) : vec3(1.,0.,0.);
        a += n*sd*.01*wid*(1.+age*2.)*uK;
        float life = .12 + seed*.18;                                          /* 꼬리가 빠르게 잘리고 빠르게 사라짐 */
        vA = (uE>0.?1.:0.) * clamp(1.-age/life, 0., 1.) * (.5+.5*seed) * step(.0005, uH);
        gl_Position=projectionMatrix*vec4(a,1.); }`,
    fragmentShader: `uniform float uT; varying float vX, vW, vAge, vA; ${NOISE}
      void main(){ vec3 spec = .5+.5*cos(6.2832*(vW+vec3(0.,.33,.67)));
        vec3 c = mix(vec3(1.,1.,1.05), vec3(.32,.55,1.35), smoothstep(.01,.08,vAge));   /* 뜨거움 → 식음 */
        c = mix(c, spec*1.1, smoothstep(.08,.25,vAge)*.75);                              /* 무지개로 풀림 */
        float across = max(0., 1.-vX*vX);                                                 /* 0 아래로 내려가지 않게 */
        float flick = .7+.3*fbm(vec2(vAge*18.-uT*5., vW*40.));
        float heat = 1.6*exp(-vAge*25.) + .55;
        gl_FragColor = vec4(c*across*flick*heat*vA*.42, 1.); }` });
  const trail = new THREE.Mesh(tg, trailM); trail.frustumCulled = false; trail.renderOrder = 8; G.add(trail);
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: `uniform float uI, uT; varying vec2 vU; ${NOISE}
      void main(){ float r=length(vU), a=atan(vU.y, vU.x+1e-5);
        float wob=.3*(fbm(vec2(a*2.5+uT*5., r*5.-uT*9.))-.5); float rr=max(0., r*(1.+wob));
        float core=exp(-rr*rr*170.)*1.9, inner=exp(-rr*rr*40.)*.55, coma=exp(-rr*rr*9.)*.15;
        vec3 c=vec3(1.)*core+vec3(.82,.9,1.25)*inner+vec3(.45,.65,1.35)*coma;
        gl_FragColor=vec4(c*uI*(1.-smoothstep(.7,1.,r)),1.); }` });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), headM); head.frustumCulled = false; head.renderOrder = 9; G.add(head);
  const NP = 200, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(NP), 1)); pg.setAttribute('aW', new THREE.BufferAttribute(new Float32Array(NP), 1)); pg.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(NP), 1));
  { const s = new Float32Array(NP); for (let i = 0; i < NP; i++) s[i] = .4 + Math.pow(Math.random(), 3) * 2.2; pg.setAttribute('aS', new THREE.BufferAttribute(s, 1)); }
  const pM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uK: U.uK },
    vertexShader: 'attribute float aA, aS, aW, aC; uniform float uPx, uK; varying float vA, vW, vC; void main(){ vA=aA; vW=aW; vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*uPx*.09*uK/max(.1,-mv.z); }',
    fragmentShader: 'varying float vA, vW, vC; void main(){ vec2 q=gl_PointCoord-.5; float r2=dot(q,q); float k=exp(-r2*40.)*.9+exp(-r2*9.)*.12; vec3 spec=.5+.5*cos(6.2832*(vW+vec3(0.,.33,.67))); vec3 c=mix(vec3(1.), mix(vec3(.4,.62,1.35), spec, smoothstep(.5,1.,vC)), smoothstep(0.,.4,vC)); gl_FragColor=vec4(c*k*vA,1.); }' });
  const sparks = new THREE.Points(pg, pM); sparks.frustumCulled = false; sparks.renderOrder = 9; G.add(sparks);
  const SP = Array.from({ length: NP }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), w: Math.random() }));
  const H = new THREE.Vector3(), D = new THREE.Vector3().subVectors(C, S0).normalize(), J = new THREE.Vector3();
  G.userData.setPx = px => { pM.uniforms.uPx.value = px; };
  G.userData.reset = () => SP.forEach(q => q.life = 0);
  /* e: 나타난 뒤 지난 시간 (FALL 에서 꽂힘). 머리 위치를 돌려줌 */
  G.userData.update = (e, t, dt) => {
    const f = THREE.MathUtils.clamp(e / FALL, 0, 1), uH = Math.pow(f, EXP), falling = e >= 0 && e < FALL;
    G.visible = e >= 0 && e < FALL + METEOR.FADE;
    H.lerpVectors(S0, C, uH); U.uE.value = e; U.uT.value = t;
    head.visible = falling; head.position.copy(H); head.scale.setScalar((.6 + uH * 1.5) * K); headM.uniforms.uI.value = falling ? Math.min(1, f * 10) * (1 + .15 * Math.sin(t * 40)) : 0; headM.uniforms.uT.value = t;
    if (falling) for (let j = 0, k = 0; j < NP && k < 4; j++) if (SP[j].life <= 0) { const q = SP[j]; q.max = q.life = .1 + Math.random() * .2;
      q.p.copy(H).add(J.set((Math.random() - .5) * .3 * K, (Math.random() - .5) * .3 * K, (Math.random() - .5) * .3 * K)); q.v.copy(D).multiplyScalar(-(.5 + Math.random() * 1.5) * K).add(J.set((Math.random() - .5) * .8 * K, (Math.random() - .5) * .8 * K, (Math.random() - .5) * .8 * K)); k++; }
    const P = pg.attributes.position, A = pg.attributes.aA, W = pg.attributes.aW, Cc = pg.attributes.aC;
    SP.forEach((q, i) => { if (q.life > 0) { q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-1.5 * dt)); }
      const k = Math.max(0, q.life / q.max); P.setXYZ(i, q.p.x, q.p.y, q.p.z); A.setX(i, q.life > 0 ? k * (.5 + .5 * Math.sin(t * 30 + i * 7)) * 1.3 : 0); W.setX(i, q.w); Cc.setX(i, 1 - k); });
    P.needsUpdate = A.needsUpdate = W.needsUpdate = Cc.needsUpdate = true;
    return { head: H, uH, falling }; };
  return G;
}
