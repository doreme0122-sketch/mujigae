/* 떨어지는 빛 덩어리 시안 다섯 — 세로로 된 무수히 많은 빛선이 다발로 뭉쳐 떨어진다
   무지개는 칠하지 않는다: 빛선마다 파장(색) 하나를 갖고, 다발 가운데에선 모든 파장이 겹쳐 하얗게 보이며,
   바깥으로 갈수록 파장마다 조금씩 다른 방향으로 꺾여(분산) 색이 갈라져 보인다. 프리즘을 지난 빛처럼.
   ① 프리즘 다발  ② 빛의 비(파장마다 떨어지는 속도가 달라 머리가 무지개로 풀림)  ③ 나선 다발(파장마다 감기는 빠르기가 다름)
   ④ 빛의 창(머리가 한 점으로 모이고 위로 부채꼴로 퍼짐)  ⑤ 빛의 장막(속이 빈 원통 + 하얀 심)
   닿는 순간: 빛선이 땅에 부딪혀 파장마다 다른 각도로 튀어 흩어지고, 섬광. (태어나는 효과 전체는 고른 뒤에)
   무게: 빛선 900가닥을 한 묶음으로 한 번에 그림 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js';
import { makePad } from '../core/hangar/pad.js';
import { makeGoldStar } from './goldstar.js?v=11022002';
import { makePerf } from './perf.js?v=11022002';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const N = 900, TOP = 13, G0 = .2, FALL = .85, CYCLE = 3.2;
/* 시안별 값: spread 다발 굵기 · disp 분산(색 갈라짐) · stag 파장별 속도차 · twist 나선 · spear 머리 모음 · ring 속 빈 정도 · len 꼬리 길이 */
const V = [
  { name: '① 프리즘 다발', tip: '가운데는 하얗고 바깥으로 갈수록 색이 갈라지는 굵은 빛 다발', spread: .55, disp: .7, stag: .04, twist: 0, spear: 0, ring: 0, len: 5.5 },
  { name: '② 빛의 비', tip: '파장마다 떨어지는 속도가 달라, 앞머리가 빨강→보라로 풀리며 내려옴', spread: .45, disp: .35, stag: .55, twist: 0, spear: 0, ring: 0, len: 7 },
  { name: '③ 나선 다발', tip: '빛선들이 파장마다 다른 빠르기로 감기며 떨어져 무지개 나선이 생김', spread: .5, disp: .55, stag: .08, twist: 5, spear: 0, ring: 0, len: 6 },
  { name: '④ 빛의 창', tip: '머리는 한 점으로 날카롭게 모이고, 위로 갈수록 부채꼴로 퍼지며 색이 갈라짐', spread: .9, disp: .9, stag: .03, twist: 0, spear: 1, ring: 0, len: 6.5 },
  { name: '⑤ 빛의 장막', tip: '속이 빈 빛선 원통이 무지개 장막처럼 일렁이고, 가운데 하얀 심이 꿰뚫음', spread: .75, disp: .5, stag: .06, twist: 1.2, spear: 0, ring: 1, len: 6 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, .1, 200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(-6, 9, -4); scene.add(key);
  scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x120e18, .4));
  /* 바닥: 건메탈 + 판 + 금테 별 (빛이 닿는 자리) */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshPhysicalMaterial({ color: 0x1c1f25, metalness: .88, roughness: .3, clearcoat: .45, envMapIntensity: .9 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const pad = makePad(); scene.add(pad); const star = makeGoldStar(); scene.add(star);
  /* 빛이 바닥에 비침: 떨어지는 동안 점점 커지는 무지개 웅덩이 */
  const lightM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 }, uR: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uI, uR, uT; varying vec2 vP;
      void main(){ float r=length(vP)/uR; vec3 c=vec3(0.);
        for(int i=0;i<6;i++){ float w=float(i)/5.; float rr=r*(1.+(w-.5)*.35); c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*exp(-rr*rr*3.); }   /* 파장마다 번지는 폭이 달라 가장자리에 색이 갈라짐 */
        gl_FragColor=vec4(c/3.*uI,1.); }` });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 96), lightM); pool.rotation.x = -Math.PI / 2; pool.position.y = .21; pool.renderOrder = 3; scene.add(pool);
  onProgress(.4);

  /* ── 빛선 다발 ── */
  const U = { uE: { value: -1 }, uT: { value: 0 }, uSpread: { value: .5 }, uDisp: { value: .5 }, uStag: { value: 0 }, uTwist: { value: 0 }, uSpear: { value: 0 }, uRing: { value: 0 }, uLen: { value: 6 } };
  const pos = [], aL = [], aS = [], idx = [];
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.2832, r = Math.pow(Math.random(), .6), w = Math.random(), seed = Math.random(), lenK = .45 + Math.random() * .55, wid = .5 + Math.pow(Math.random(), 3) * 2.5;
    for (let j = 0; j < 4; j++) { pos.push(0, 0, 0); aL.push(a, r, w, seed); aS.push(j & 1 ? 1 : -1, j < 2 ? 0 : 1, lenK, wid); }
    const b = i * 4; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aL', new THREE.Float32BufferAttribute(aL, 4)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 4)); g.setIndex(idx);
  const lineM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: U,
    vertexShader: `attribute vec4 aL, aS; uniform float uE, uT, uSpread, uDisp, uStag, uTwist, uSpear, uRing, uLen; varying float vU, vS, vW, vA;
      const float TOP=${TOP.toFixed(1)}, G0=${G0.toFixed(2)}, FALL=${FALL.toFixed(2)};
      void main(){ float ang=aL.x, r0=aL.y, w=aL.z, seed=aL.w; vS=aS.x; vU=aS.y; vW=w;
        float rr = mix(r0, .55+.45*r0, uRing);                                                  /* 장막: 속이 빔 */
        /* 떨어지는 진행: 파장마다 늦고 빠름(빛의 비), 빛선마다 들쭉날쭉 */
        float lag = (w-.5)*uStag + (seed-.5)*.06;
        float f = clamp((uE+FALL)/FALL - lag, 0., 1.4);
        float headY = mix(TOP, G0, min(1., f*f*f));
        float hit = max(0., (uE+FALL)/FALL - lag - 1.)*FALL;                                    /* 땅에 닿은 뒤 지난 시간 */
        /* 꼬리: 위로. 머리 높이에 따라 위쪽 점 */
        float L = uLen*aS.z*(1.-smoothstep(0.,.35,hit));
        float y = headY + vU*L;
        /* 다발 반지름: 머리는 모이고(창) 위로 퍼짐, 분산은 파장마다 다른 방향으로 꺾임 */
        float along = vU;
        float R = uSpread*rr*mix(1., .05+along*1.6, uSpear);
        float da = (w-.5)*uDisp*(.3+along)*rr;                                                 /* 파장마다 각도가 어긋남 → 바깥이 무지개 */
        float tw = uTwist*(y*.25 + uT*(1.+(w-.5)*.6));
        float A = ang + da + tw;
        float Rd = R*(1.+(w-.5)*uDisp*.35);
        vec3 p = vec3(cos(A)*Rd, y, sin(A)*Rd);
        /* 닿은 뒤: 땅에서 파장마다 다른 각도로 튀어 흩어짐 */
        float sp = hit*(3.+seed*5.)*(1.+(w-.5)*.6);
        p.xz += vec2(cos(A),sin(A))*sp; p.y = max(p.y - hit*hit*2., G0) + (vU>.5 ? .0 : 0.);
        vA = (f>0.?1.:0.) * exp(-hit*2.6) * (.5+.5*seed);
        vec3 a = (viewMatrix*vec4(p,1.)).xyz, d = (mat3(viewMatrix)*vec3(0.,1.,0.));
        vec3 n = cross(normalize(d+vec3(1e-4)), normalize(-a+vec3(1e-4))); n = dot(n,n) > 1e-8 ? normalize(n) : vec3(1.,0.,0.);
        a += n*vS*.011*aS.w*(1.+hit*.5);
        gl_Position = projectionMatrix*vec4(a,1.); }`,
    fragmentShader: `varying float vU, vS, vW, vA;
      void main(){ vec3 c = .5+.5*cos(6.2832*(vW+vec3(0.,.33,.67)));                          /* 이 빛선의 파장 색 (겹치면 하양) */
        float across = 1.-vS*vS;
        float head = exp(-vU*14.)*2.2, body = pow(1.-vU, 1.6);                                  /* 머리가 가장 밝고 꼬리로 갈수록 스러짐 */
        gl_FragColor = vec4(c*across*(head+body)*vA*.55, 1.); }` });
  const lines = new THREE.Mesh(g, lineM); lines.frustumCulled = false; lines.renderOrder = 8; scene.add(lines);
  /* 닿는 순간 섬광 */
  const flashM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: 'uniform float uI; varying vec2 vU; void main(){ float r2=dot(vU,vU); vec3 c=vec3(0.); for(int i=0;i<6;i++){ float w=float(i)/5.; float rr=r2*(1.+(w-.5)*.6); c+=(.5+.5*cos(6.2832*(w+vec3(0.,.33,.67))))*(exp(-rr*30.)*1.5+exp(-rr*5.)*.3); } c*=1.-smoothstep(.6,1.,max(abs(vU.x),abs(vU.y))); gl_FragColor=vec4(c/3.*uI,1.); }' });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flashM); flash.frustumCulled = false; flash.renderOrder = 9; flash.position.y = .5; scene.add(flash);
  onProgress(.8);

  /* 버튼 */
  let cur = 0, T0 = 0; const tour = $('#tour');
  const pick = i => { cur = i; const v = V[i]; U.uSpread.value = v.spread; U.uDisp.value = v.disp; U.uStag.value = v.stag; U.uTwist.value = v.twist; U.uSpear.value = v.spear; U.uRing.value = v.ring; U.uLen.value = v.len;
    tour.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); $('#tip b').textContent = v.name; $('#tip span').textContent = v.tip; $('#tip').hidden = false; T0 = t; };
  V.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.onclick = () => pick(i); tour.appendChild(b); });
  const cam = { az: -.5, tilt: 1.12, h: 15 };
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.45); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.h = clamp(cam.h * pin / d, 5, 40); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.h = clamp(cam.h * Math.exp(e.deltaY * .0012), 5, 40); }, { passive: true });

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let last = performance.now(), t = 0;
  pick(0);
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    const c = (t - T0) % CYCLE, e = c - 1.0 - FALL;                                     /* 1초 쉬고 → 떨어짐 → 닿음(e=0) */
    U.uE.value = e; U.uT.value = t;
    const f = clamp((e + FALL) / FALL, 0, 1);
    lightM.uniforms.uI.value = e < 0 ? Math.pow(f, 3) * 1.1 : Math.max(0, 1.4 - e * 1.6); lightM.uniforms.uR.value = e < 0 ? .8 + f * 1.6 : 2.4 + e * 2;
    flash.scale.setScalar(3 + Math.max(0, e) * 3); flashM.uniforms.uI.value = e >= 0 ? (e < .07 ? 3 : 0) + Math.exp(-e * 4) * 1.8 : 0;
    pad.userData.update(t); star.userData.update(t); star.userData.burst(e >= 0 ? Math.exp(-e * 2.5) : 0);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + 1.5, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(0, 2.6, 0);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[빛 시안]', err); } });
  onProgress(1);
  window.__fv = { get t() { return t; }, pick, at: s => { T0 = t - s; } };
}
