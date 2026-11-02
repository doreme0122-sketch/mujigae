/* 유성 시안 — 하늘 저 끝에서 판 가운데로 빠르게 내리꽂히는 유성. 꼬리가 길고, 지나간 자리에 흔적이 남았다가 흩어진다.
   · 잘 보이게: 멀리서 작은 점으로 반짝 나타나 점점 커지며 다가옴. 1초 남짓, 처음부터 거의 일정하게 빠르고 끝에서만 살짝 더 빨라짐
   · 머리: 하얗게 타는 심 + 둘레의 빛 안개(가장자리가 열기처럼 일렁임)
   · 꼬리 = 남는 흔적: 꼬리는 머리를 따라 움직이지 않는다. 머리가 지나간 자리마다 빛 가닥이 그 자리에 남고,
     그 자리의 '지난 시간'에 따라 변한다 — 막 지나간 곳은 하얗게 뜨겁고 가늘게 모여 있고, 시간이 지날수록 파랗게 식으며
     가닥이 퍼지고 흔들리다가, 끝내 빛이 갈라져 옅은 무지개로 풀리며 꺼진다(칠한 색이 아님: 가닥마다 파장 하나, 퍼질수록 파장마다 다르게 어긋남)
   · 반짝이는 부스러기가 흔적을 따라 남아 깜빡이다 꺼짐
   · 꽂힌 뒤엔 새로 생기는 것 없이, 흔적이 오래된 위쪽부터 빠르게 흩어짐(1초 안쪽) (충격파·태어남은 다음 단계)
   무게: 빛 가닥 700개는 한 묶음으로 한 번에(위치는 셰이더가 계산), 부스러기는 점 묶음 한 번 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11022048';
import { makePad } from '../core/hangar/pad.js?v=11022048';
import { makeGoldStar } from './goldstar.js?v=11022048';
import { makePerf } from './perf.js?v=11022048';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const N = 700, FALL = 1.1, LINGER = .8, REST = .7, CYCLE = REST + FALL + LINGER, EXP = 1.25;   /* 진행 u = (t/FALL)^EXP : 거의 일정, 끝에서 살짝 가속 */
const S0 = new THREE.Vector3(-14, 30, -9), C = new THREE.Vector3(0, .3, 0);
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const NOISE = `float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 300), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-6, 9, -4); scene.add(key);
  scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x120e18, .4));
  { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 1600; i++) { const r = Math.random(); g.fillStyle = `rgba(${200 + r * 55},${215 + r * 40},255,${.12 + Math.random() * .55})`; g.fillRect(Math.random() * 2048, Math.random() * 1024, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; scene.background = t; scene.backgroundIntensity = .45; }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshPhysicalMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3, clearcoat: .45, envMapIntensity: .9 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pad = makePad(); scene.add(pad); const star = makeGoldStar(); scene.add(star);
  const lightM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uR: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uI, uR; varying vec2 vP; void main(){ float r=length(vP)/uR; gl_FragColor=vec4(vec3(.55,.72,1.35)*exp(-r*r*2.5)*uI,1.); }' });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 96), lightM); pool.rotation.x = -Math.PI / 2; pool.position.y = .21; pool.renderOrder = 3; scene.add(pool);
  onProgress(.4);

  /* ── 흔적(꼬리) ── 각 가닥은 머리가 지나간 길 위의 한 구간. 위치·색·퍼짐은 그 자리의 '지난 시간(age)'으로 정해짐 */
  const U = { uS0: { value: S0.clone() }, uC: { value: C.clone() }, uT: { value: 0 }, uE: { value: -1 } };
  const SEG = 14, pos = [], aA = [], aB = [], idx = [];
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.2832, r = Math.pow(Math.random(), .8), w = Math.random(), seed = Math.random(), reach = .25 + Math.pow(Math.random(), .5) * .75, wid = .5 + Math.pow(Math.random(), 4) * 2.5;
    for (let k = 0; k <= SEG; k++) for (const sd of [-1, 1]) { pos.push(0, 0, 0); aA.push(a, r, w, seed); aB.push(k / SEG, sd, reach, wid); }
    const b = i * (SEG + 1) * 2; for (let k = 0; k < SEG; k++) { const p = b + k * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 4)); tg.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 4)); tg.setIndex(idx);
  const trailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `attribute vec4 aA, aB; uniform vec3 uS0, uC; uniform float uT, uE; varying float vX, vW, vAge, vA, vNear; ${NOISE}
      const float FALL=${FALL.toFixed(2)}, EXP=${EXP.toFixed(2)};
      vec3 path(float u){ return mix(uS0, uC, u); }
      void main(){ float ang=aA.x, r=aA.y, w=aA.z, seed=aA.w, s=aB.x, sd=aB.y, reach=aB.z, wid=aB.w; vX=sd; vW=w;
        float uH = pow(clamp(uE/FALL,0.,1.), EXP);                         /* 머리가 지금 있는 자리 */
        float u = uH*(1.-s*reach);                                           /* 이 가닥 점이 놓인 길 위 자리 (머리 → 뒤로) */
        float tPass = pow(max(u,0.),1./EXP)*FALL;                            /* 머리가 그 자리를 지난 때 */
        float age = max(0., uE - tPass); vAge = age; vNear = s;
        vec3 D = normalize(uC-uS0), P1 = normalize(cross(D, vec3(0.,1.,.001))), P2 = cross(D,P1);
        /* 지난 시간만큼 퍼지고 흔들림. 파장마다 조금씩 다르게 어긋남(무지개로 갈라짐) */
        float spread = r*(.03 + age*1.1 + age*age*.9);                        /* 빨리 사라지는 만큼 빨리 퍼짐 */
        float tb = (fbm(vec2(seed*7.+u*9., uT*.8))-.5)*age*1.4;
        float A = ang + (w-.5)*age*3.;
        vec3 off = (cos(A)*P1 + sin(A)*P2)*spread + (P1*.8+P2*.6)*tb + P1*(w-.5)*age*.6;
        off.y -= age*age*.35*seed;                                           /* 오래된 부스러기 빛은 살짝 처짐 */
        vec3 p = path(u) + off, q = path(max(u-.004,0.)) + off;
        vec3 a=(viewMatrix*vec4(p,1.)).xyz, b=(viewMatrix*vec4(q,1.)).xyz;
        vec3 n=cross(normalize(b-a+vec3(1e-4)), normalize(-a+vec3(1e-4))); n = dot(n,n) > 1e-8 ? normalize(n) : vec3(1.,0.,0.);
        a += n*sd*.01*wid*(1.+age*1.5);
        /* 사는 시간: 가닥마다 조금씩 다르게 꺼짐 */
        float life = .3 + seed*.4;                                           /* 꼬리도 빠르게 사라짐 */
        vA = (uE>0.?1.:0.) * clamp(1.-age/life, 0., 1.) * (.5+.5*seed) * step(.0005, uH);
        gl_Position=projectionMatrix*vec4(a,1.); }`,
    fragmentShader: `uniform float uT; varying float vX, vW, vAge, vA, vNear; ${NOISE}
      void main(){ vec3 spec = .5+.5*cos(6.2832*(vW+vec3(0.,.33,.67)));
        vec3 hot = vec3(1.,1.,1.05), cool = vec3(.32,.55,1.35);
        vec3 c = mix(hot, cool, smoothstep(.02,.15,vAge));                    /* 하얗게 뜨거움 → 파랗게 식음 */
        c = mix(c, spec*1.1, smoothstep(.15,.5,vAge)*.75);                    /* 끝내 무지개로 풀림 */
        float across = max(0., 1.-vX*vX);                                       /* 0 아래로 내려가지 않게(빛을 빼는 검은 점 방지) */
        float flick = .7+.3*fbm(vec2(vAge*9.-uT*5., vW*40.));
        float heat = 1.6*exp(-vAge*14.) + .55;
        gl_FragColor = vec4(c*across*flick*heat*vA*.42, 1.); }` });
  const trail = new THREE.Mesh(tg, trailM); trail.frustumCulled = false; trail.renderOrder = 8; scene.add(trail);
  /* ── 머리 ── */
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: `uniform float uI, uT; varying vec2 vU; ${NOISE}
      void main(){ float r=length(vU), a=atan(vU.y, vU.x+1e-5);
        float wob=.3*(fbm(vec2(a*2.5+uT*5., r*5.-uT*9.))-.5); float rr=max(0., r*(1.+wob));
        float core=exp(-rr*rr*170.)*1.9, inner=exp(-rr*rr*40.)*.55, coma=exp(-rr*rr*9.)*.15;
        vec3 c=vec3(1.)*core+vec3(.82,.9,1.25)*inner+vec3(.45,.65,1.35)*coma;
        gl_FragColor=vec4(c*uI*(1.-smoothstep(.7,1.,r)),1.); }` });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), headM); head.frustumCulled = false; head.renderOrder = 9; scene.add(head);
  /* ── 흔적에 남는 반짝이 부스러기 ── */
  const NP = 300, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(NP), 1)); pg.setAttribute('aW', new THREE.BufferAttribute(new Float32Array(NP), 1)); pg.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(NP), 1));
  { const s = new Float32Array(NP); for (let i = 0; i < NP; i++) s[i] = .4 + Math.pow(Math.random(), 3) * 2.2; pg.setAttribute('aS', new THREE.BufferAttribute(s, 1)); }
  const pM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float aA, aS, aW, aC; uniform float uPx; varying float vA, vW, vC; void main(){ vA=aA; vW=aW; vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*uPx*.09/max(.1,-mv.z); }',
    fragmentShader: 'varying float vA, vW, vC; void main(){ vec2 q=gl_PointCoord-.5; float r2=dot(q,q); float k=exp(-r2*40.)*.9+exp(-r2*9.)*.12; vec3 spec=.5+.5*cos(6.2832*(vW+vec3(0.,.33,.67))); vec3 c=mix(vec3(1.), mix(vec3(.4,.62,1.35), spec, smoothstep(.5,1.,vC)), smoothstep(0.,.4,vC)); gl_FragColor=vec4(c*k*vA,1.); }' });
  const sparks = new THREE.Points(pg, pM); sparks.frustumCulled = false; sparks.renderOrder = 9; scene.add(sparks);
  const SP = Array.from({ length: NP }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), w: Math.random() }));
  onProgress(.8);

  /* 버튼: 빠르기 */
  let t = 0, T0 = 0; const tour = $('#tour');
  const SPEEDS = [[1, '빠르기 1배'], [.25, '1/4 느리게'], [.1, '1/10 느리게'], [0, '멈춤']]; let spI = 0, rate = 1;
  { const b = document.createElement('button'); b.type = 'button'; b.textContent = '다시 보기'; b.onclick = () => { T0 = t; SP.forEach(q => q.life = 0); }; tour.appendChild(b);
    const sb = document.createElement('button'); sb.type = 'button'; sb.textContent = SPEEDS[0][1];
    sb.onclick = () => { spI = (spI + 1) % SPEEDS.length; rate = SPEEDS[spI][0]; sb.textContent = SPEEDS[spI][1]; sb.classList.toggle('on', spI > 0); }; tour.appendChild(sb); }
  $('#tip b').textContent = '유성'; $('#tip span').textContent = '멀리서 반짝 나타나 커지며 다가오고, 지나간 자리에 흔적이 남아 하얗게 → 파랗게 식고 → 무지개로 풀리며 흩어져요.'; $('#tip').hidden = false;
  const cam = { az: 2.57, tilt: 1.25, h: 32 };   /* 떨어지는 길을 옆에서 비스듬히 */
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.45); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.h = clamp(cam.h * pin / d, 5, 50); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.h = clamp(cam.h * Math.exp(e.deltaY * .0012), 5, 50); }, { passive: true });
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); pM.uniforms.uPx.value = Hd; }
  addEventListener('resize', size); size();
  const H = new THREE.Vector3(), D = new THREE.Vector3().subVectors(C, S0).normalize();
  let last = performance.now();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05) * rate; last = now; t += dt;
    const e = ((t - T0) % CYCLE) - REST;                                                     /* 0: 나타남, FALL: 꽂힘 */
    if (e < 0) SP.forEach(q => q.life = 0);
    const f = clamp(e / FALL, 0, 1), uH = Math.pow(f, EXP), falling = e >= 0 && e < FALL;
    H.lerpVectors(S0, C, uH);
    U.uE.value = e; U.uT.value = t;
    /* 머리: 멀리서 작은 점으로 반짝 나타나 커지며 다가옴 */
    head.visible = falling; head.position.copy(H); head.scale.setScalar(.6 + uH * 1.5); headM.uniforms.uI.value = falling ? Math.min(1, f * 10) * (1 + .15 * Math.sin(t * 40)) : 0; headM.uniforms.uT.value = t;
    lightM.uniforms.uI.value = falling ? Math.pow(uH, 3) * .45 : 0; lightM.uniforms.uR.value = 1 + uH * 2.5;
    if (falling) for (let j = 0, k = 0; j < NP && k < 4; j++) if (SP[j].life <= 0) { const q = SP[j]; q.max = q.life = .25 + Math.random() * .45;
      q.p.copy(H).add(new THREE.Vector3((Math.random() - .5) * .3, (Math.random() - .5) * .3, (Math.random() - .5) * .3)); q.v.copy(D).multiplyScalar(-(.5 + Math.random() * 1.5)).add(new THREE.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * .8, (Math.random() - .5) * .8)); k++; }
    const P = pg.attributes.position, A = pg.attributes.aA, W = pg.attributes.aW, Cc = pg.attributes.aC;
    SP.forEach((q, i) => { if (q.life > 0) { q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-1.5 * dt)); q.v.y -= .3 * dt; }
      const k = Math.max(0, q.life / q.max); P.setXYZ(i, q.p.x, q.p.y, q.p.z); A.setX(i, q.life > 0 ? k * (.5 + .5 * Math.sin(t * 30 + i * 7)) * 1.3 : 0); W.setX(i, q.w); Cc.setX(i, 1 - k); });
    P.needsUpdate = A.needsUpdate = W.needsUpdate = Cc.needsUpdate = true;
    pad.userData.update(t); star.userData.update(t);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + 2, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(-6, 12, -4);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[유성 시안]', err); } });
  onProgress(1);
  window.__fv = { get t() { return t; }, at: s => { T0 = t - s; } };
}
