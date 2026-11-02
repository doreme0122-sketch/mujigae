/* 혜성 시안 다섯 — 하늘 저 위에서 판 가운데로 비스듬히 빠르게 내리꽂히는 혜성. 떨어진 뒤의 일은 만들지 않음.
   혜성 = 머리(타는 심 + 둘레를 감싼 빛 안개, 가장자리가 열기처럼 일렁임) + 꼬리(가는 빛 가닥 수백 개가 머리에서 뒤로 뻗으며 퍼짐) + 떨어져 나가는 부스러기
   무지개는 칠하지 않는다: 꼬리 가닥마다 파장(색) 하나 — 머리 쪽에선 모두 겹쳐 하얗고, 뒤로 갈수록 파장마다 다르게 꺾여 갈라짐
   ① 백색 혜성: 하얗게 타는 머리, 곧고 긴 푸른빛 이온 꼬리
   ② 프리즘 혜성: 꼬리가 뒤로 갈수록 무지개 부채로 갈라짐
   ③ 쌍꼬리 혜성: 진짜 혜성처럼 곧은 푸른 이온 꼬리 + 휘어진 넓은 먼지 꼬리(먼지에 빛이 갈라져 옅은 무지개)
   ④ 불꽃 혜성: 머리가 부서지며 불꽃을 흘리고, 꼬리가 거칠게 요동침
   ⑤ 결정 혜성: 빛 안개 속에 진짜 결정이 돌며 타고, 꼬리에 결정 조각이 반짝임
   무게: 꼬리 가닥은 한 묶음으로 한 번에, 부스러기는 점 묶음 한 번 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js';
import { makePad } from '../core/hangar/pad.js';
import { makeGoldStar } from './goldstar.js?v=11022010';
import { gem } from './guardian.js?v=11022010';
import { makePerf } from './perf.js?v=11022010';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const N = 700, FALL = .5, REST = 1.2, CYCLE = FALL + REST;
const S0 = new THREE.Vector3(-7, 19, -5), C = new THREE.Vector3(0, .25, 0);      /* 하늘 저 위 → 판 가운데 */
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const NOISE = `float h1(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }`;
/* 시안 값: white 하얀 정도 · disp 갈라짐 · spread 꼬리 퍼짐 · len 꼬리 길이 · curve 먼지 꼬리 휨 · dual 쌍꼬리 · turb 요동 · coma 빛 안개 색 · sparks 부스러기 양 · crystal */
const V = [
  { name: '① 백색 혜성', tip: '하얗게 타는 머리와 곧고 긴 푸른빛 꼬리', white: .85, disp: .05, spread: .35, len: 9, curve: 0, dual: 0, turb: .05, coma: [.55, .75, 1.4], sparks: 2, crystal: 0 },
  { name: '② 프리즘 혜성', tip: '머리는 하얗고, 꼬리가 뒤로 갈수록 무지개 부채로 갈라짐', white: .1, disp: .9, spread: .55, len: 8, curve: 0, dual: 0, turb: .05, coma: [.85, .9, 1.3], sparks: 2, crystal: 0 },
  { name: '③ 쌍꼬리 혜성', tip: '곧은 푸른 이온 꼬리 + 휘어진 넓은 먼지 꼬리(먼지에 빛이 갈라져 옅은 무지개)', white: .5, disp: .45, spread: .45, len: 8.5, curve: 1, dual: 1, turb: .06, coma: [.7, .82, 1.35], sparks: 3, crystal: 0 },
  { name: '④ 불꽃 혜성', tip: '머리가 부서지며 불꽃을 흘리고, 꼬리가 거칠게 요동침', white: .6, disp: .25, spread: .6, len: 6.5, curve: 0, dual: 0, turb: .8, coma: [1.2, .85, .7], sparks: 9, crystal: 0 },
  { name: '⑤ 결정 혜성', tip: '빛 안개 속에 진짜 결정이 돌며 타고, 꼬리에 결정 조각이 반짝임', white: .35, disp: .6, spread: .4, len: 7.5, curve: 0, dual: 0, turb: .1, coma: [.5, .72, 1.45], sparks: 5, crystal: 1 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .1, 200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-6, 9, -4); scene.add(key);
  scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x120e18, .4));
  { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 1400; i++) { const r = Math.random(); g.fillStyle = `rgba(${200 + r * 55},${215 + r * 40},255,${.15 + Math.random() * .7})`; g.fillRect(Math.random() * 2048, Math.random() * 1024, r > .985 ? 2 : 1, r > .985 ? 2 : 1); }
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; scene.background = t; scene.backgroundIntensity = .5; }
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshPhysicalMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3, clearcoat: .45, envMapIntensity: .9 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pad = makePad(); scene.add(pad); const star = makeGoldStar(); scene.add(star);
  /* 다가오는 혜성이 바닥을 비춤 */
  const lightM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uR: { value: 1 }, uC: { value: new THREE.Color() } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uI, uR; uniform vec3 uC; varying vec2 vP; void main(){ float r=length(vP)/uR; gl_FragColor=vec4(uC*exp(-r*r*2.5)*uI,1.); }' });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 96), lightM); pool.rotation.x = -Math.PI / 2; pool.position.y = .21; pool.renderOrder = 3; scene.add(pool);
  onProgress(.4);

  /* ── 꼬리: 빛 가닥 다발 ── */
  const U = { uH: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, -1, 0) }, uT: { value: 0 }, uOn: { value: 0 },
    uWhite: { value: .5 }, uDisp: { value: .5 }, uSpread: { value: .5 }, uLen: { value: 8 }, uCurve: { value: 0 }, uDual: { value: 0 }, uTurb: { value: 0 } };
  const pos = [], aA = [], aB = [], idx = [], SEG = 8;
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.2832, r = Math.pow(Math.random(), .7), w = Math.random(), seed = Math.random(), lenK = .25 + Math.pow(Math.random(), .6) * .75, wid = .5 + Math.pow(Math.random(), 4) * 3, grp = Math.random() < .45 ? 1 : 0;
    for (let k = 0; k <= SEG; k++) for (const sd of [-1, 1]) { pos.push(0, 0, 0); aA.push(a, r, w, seed); aB.push(k / SEG, sd, lenK, wid + grp * 10); }
    const b = i * (SEG + 1) * 2; for (let k = 0; k < SEG; k++) { const p = b + k * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 4)); tg.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 4)); tg.setIndex(idx);
  const tailM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `attribute vec4 aA, aB; uniform vec3 uH, uD; uniform float uT, uWhite, uDisp, uSpread, uLen, uCurve, uDual, uTurb; varying float vS, vX, vW, vA, vG; ${NOISE}
      void main(){ float ang=aA.x, r=aA.y, w=aA.z, seed=aA.w, s=aB.x, sd=aB.y, wid=mod(aB.w,10.); float grp=step(9.,aB.w)*uDual;
        vS=s; vX=sd; vW=w; vG=grp;
        vec3 D=normalize(uD), P1=normalize(cross(D, vec3(0.,1.,.001))), P2=cross(D,P1);
        float L=uLen*aB.z*mix(1.,.8,grp);
        float spread=uSpread*mix(1.,2.4,grp);
        float rad=spread*r*(.04+pow(s,.75));                                                  /* 머리 쪽 좁고 뒤로 퍼짐 */
        float da=(w-.5)*uDisp*1.1*s;                                                           /* 파장마다 다르게 꺾여 갈라짐 */
        float A=ang+da*3.;
        vec3 off=(cos(A)*P1+sin(A)*P2)*rad + P1*(w-.5)*uDisp*s*1.2;
        off += P1*uCurve*grp*s*s*2.2;                                                           /* 먼지 꼬리는 옆으로 휘어짐 */
        float tb=uTurb*s*(fbm(vec2(seed*9.+s*3.-uT*6., uT*2.))-.5)*2.;                          /* 요동 */
        off += (P1*tb + P2*tb*.7);
        vec3 p=uH - D*s*L + off;
        vec3 q=uH - D*(s+.02)*L + off;
        vec3 a=(viewMatrix*vec4(p,1.)).xyz, b=(viewMatrix*vec4(q,1.)).xyz;
        vec3 n=cross(normalize(b-a+vec3(1e-4)), normalize(-a+vec3(1e-4))); n = dot(n,n) > 1e-8 ? normalize(n) : vec3(1.,0.,0.);
        a += n*sd*.012*wid*(1.+s*1.5);
        vA=.5+.5*seed;
        gl_Position=projectionMatrix*vec4(a,1.); }`,
    fragmentShader: `uniform float uOn, uWhite, uT; varying float vS, vX, vW, vA, vG; ${NOISE}
      void main(){ vec3 spec=.5+.5*cos(6.2832*(vW+vec3(0.,.33,.67)));
        vec3 ion=vec3(.4,.65,1.45), dust=mix(vec3(1.,.95,.85), spec, .55);
        float sat=smoothstep(.0,.45,vS)*(1.-uWhite);
        vec3 c=mix(vec3(1.), spec, sat);
        c=mix(c, mix(ion, vec3(1.), exp(-vS*8.)), uWhite*.8*(1.-vG));                          /* 하얀 혜성은 푸른 이온 빛 */
        c=mix(c, dust, vG);
        float across=1.-vX*vX;
        float tw=.7+.3*fbm(vec2(vS*20.-uT*12., vW*30.));                                        /* 가닥 속에서 빛이 흐름 */
        float k=across*pow(1.-vS,1.8)*tw*vA*uOn;
        gl_FragColor=vec4(c*k*.5,1.); }` });
  const tail = new THREE.Mesh(tg, tailM); tail.frustumCulled = false; tail.renderOrder = 8; scene.add(tail);
  /* ── 머리: 타는 심 + 빛 안개(일렁이는 가장자리) ── */
  const headM = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uT: { value: 0 }, uC: { value: new THREE.Color() }, uTurb: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: `uniform float uI, uT, uTurb; uniform vec3 uC; varying vec2 vU; ${NOISE}
      void main(){ float r=length(vU), a=atan(vU.y, vU.x+1e-5);
        float wob=(.25+uTurb*.6)*(fbm(vec2(a*2.5+uT*4., r*5.-uT*8.))-.5);
        float rr=max(0., r*(1.+wob));
        float core=exp(-rr*rr*120.)*3., inner=exp(-rr*rr*28.)*1.1, coma=exp(-rr*rr*6.)*.4;
        vec3 c=vec3(1.)*core + mix(vec3(1.),uC,.5)*inner + uC*coma;
        gl_FragColor=vec4(c*uI*(1.-smoothstep(.7,1.,r)),1.); }` });
  const head = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), headM); head.frustumCulled = false; head.renderOrder = 9; scene.add(head);
  /* 결정 혜성의 결정 */
  const crystal = new THREE.Mesh((() => { const g = gem(7, .28); g.translate(0, -.5, 0); g.scale(.9, .9, .9); return g; })(),
    new THREE.MeshPhysicalMaterial({ color: 0xcfe2ff, metalness: 0, roughness: .04, clearcoat: 1, iridescence: .8, iridescenceIOR: 1.4, emissive: 0x5a8cff, emissiveIntensity: 2.2, flatShading: true, envMapIntensity: 1.6 }));
  crystal.renderOrder = 7; scene.add(crystal);
  /* ── 부스러기 ── */
  const NP = 260, pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(NP), 1)); pg.setAttribute('aW', new THREE.BufferAttribute(new Float32Array(NP), 1));
  { const s = new Float32Array(NP); for (let i = 0; i < NP; i++) s[i] = .4 + Math.pow(Math.random(), 3) * 2.4; pg.setAttribute('aS', new THREE.BufferAttribute(s, 1)); }
  const pM = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 }, uWhite: { value: .5 }, uWarm: { value: 0 } },
    vertexShader: 'attribute float aA, aS, aW; uniform float uPx; varying float vA, vW; void main(){ vA=aA; vW=aW; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*uPx*.1/max(.1,-mv.z); }',
    fragmentShader: 'uniform float uWhite, uWarm; varying float vA, vW; void main(){ vec2 q=gl_PointCoord-.5; float r2=dot(q,q); float k=exp(-r2*40.)*1.4+exp(-r2*9.)*.3; vec3 spec=.5+.5*cos(6.2832*(vW+vec3(0.,.33,.67))); vec3 c=mix(spec, vec3(1.), uWhite); c=mix(c, vec3(1.25,.85,.55), uWarm); gl_FragColor=vec4(c*k*vA,1.); }' });
  const sparks = new THREE.Points(pg, pM); sparks.frustumCulled = false; sparks.renderOrder = 9; scene.add(sparks);
  const SP = Array.from({ length: NP }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), w: Math.random() }));
  onProgress(.8);

  /* 버튼 */
  let cur = 0, T0 = 0, t = 0; const tour = $('#tour');
  const pick = i => { cur = i; const v = V[i]; Object.assign(U.uWhite, { value: v.white }); U.uDisp.value = v.disp; U.uSpread.value = v.spread; U.uLen.value = v.len; U.uCurve.value = v.curve; U.uDual.value = v.dual; U.uTurb.value = v.turb;
    headM.uniforms.uC.value.setRGB(...v.coma); headM.uniforms.uTurb.value = v.turb; lightM.uniforms.uC.value.setRGB(...v.coma); crystal.visible = !!v.crystal;
    pM.uniforms.uWhite.value = v.white; pM.uniforms.uWarm.value = i === 3 ? .6 : 0;
    tour.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); $('#tip b').textContent = v.name; $('#tip span').textContent = v.tip; $('#tip').hidden = false; T0 = t; SP.forEach(q => q.life = 0); };
  V.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.onclick = () => pick(i); tour.appendChild(b); });
  const cam = { az: .9, tilt: 1.1, h: 17 };
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.45); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.h = clamp(cam.h * pin / d, 5, 45); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.h = clamp(cam.h * Math.exp(e.deltaY * .0012), 5, 45); }, { passive: true });

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); pM.uniforms.uPx.value = Hd; }
  addEventListener('resize', size); size();
  const D = new THREE.Vector3().subVectors(C, S0).normalize(), H = new THREE.Vector3(), prevH = new THREE.Vector3();
  let last = performance.now();
  pick(0);
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    const c = (t - T0) % CYCLE, e = c - REST;                                         /* 쉬고 → 떨어짐(0 → FALL) */
    const f = clamp(e / FALL, 0, 1), on = e >= 0 && e < FALL;
    prevH.copy(H); H.lerpVectors(S0, C, Math.pow(f, 1.6));
    U.uH.value.copy(H); U.uD.value.copy(D); U.uT.value = t; U.uOn.value = on ? Math.min(1, f * 6) : 0; tail.visible = on;
    U.uLen.value = V[cur].len * Math.min(1, f * 3 + .2);
    head.visible = on; head.position.copy(H); head.scale.setScalar(2.4 + f * .8); headM.uniforms.uI.value = on ? 1.5 : 0; headM.uniforms.uT.value = t;
    crystal.position.copy(H); crystal.rotation.set(t * 3, t * 4.2, t * 1.7); crystal.visible = on && !!V[cur].crystal;
    lightM.uniforms.uI.value = on ? Math.pow(f, 2.5) * 1.2 : 0; lightM.uniforms.uR.value = 1 + f * 2.5;
    /* 부스러기: 머리에서 떨어져 나가 뒤로 처지며 반짝이다 꺼짐 */
    if (on) for (let j = 0, k = 0; j < NP && k < V[cur].sparks; j++) if (SP[j].life <= 0) { const q = SP[j]; q.max = q.life = .35 + Math.random() * .6;
      q.p.copy(H).add(new THREE.Vector3((Math.random() - .5) * .4, (Math.random() - .5) * .4, (Math.random() - .5) * .4)); q.v.copy(D).multiplyScalar(-(2 + Math.random() * 6)).add(new THREE.Vector3((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 3)); k++; }
    const P = pg.attributes.position, A = pg.attributes.aA, W = pg.attributes.aW;
    SP.forEach((q, i) => { if (q.life > 0) { q.life -= dt; q.p.addScaledVector(q.v, dt); q.v.multiplyScalar(Math.exp(-3 * dt)); if (!on && e >= FALL) q.life = 0; }
      P.setXYZ(i, q.p.x, q.p.y, q.p.z); A.setX(i, q.life > 0 ? (q.life / q.max) * (.6 + .4 * Math.sin(t * 50 + i)) * 1.5 : 0); W.setX(i, q.w); });
    P.needsUpdate = A.needsUpdate = W.needsUpdate = true;
    pad.userData.update(t); star.userData.update(t);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + 2, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(-1, 4, -.5);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[혜성 시안]', err); } });
  onProgress(1);
  window.__fv = { get t() { return t; }, pick, at: s => { T0 = t - s; } };
}
