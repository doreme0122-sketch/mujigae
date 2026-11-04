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
import { makeBloom } from '../core/hangar/bloom.js?v=11041257';
import { makePad } from '../core/hangar/pad.js?v=11041257';
import { makeGoldStar } from './goldstar.js?v=11041257';
import { makePerf } from './perf.js?v=11041257';
import { makeMeteor, METEOR } from './meteor.js?v=11041257';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const { FALL } = METEOR, LINGER = .8, REST = .7, CYCLE = REST + FALL + LINGER;
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

  const met = makeMeteor(S0, C); scene.add(met);
  onProgress(.8);

  /* 버튼: 빠르기 */
  let t = 0, T0 = 0; const tour = $('#tour');
  const SPEEDS = [[1, '빠르기 1배'], [.25, '1/4 느리게'], [.1, '1/10 느리게'], [0, '멈춤']]; let spI = 0, rate = 1;
  { const b = document.createElement('button'); b.type = 'button'; b.textContent = '다시 보기'; b.onclick = () => { T0 = t; met.userData.reset(); }; tour.appendChild(b);
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
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); met.userData.setPx(Hd); }
  addEventListener('resize', size); size();
  let last = performance.now();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05) * rate; last = now; t += dt;
    const e = ((t - T0) % CYCLE) - REST;                                                     /* 0: 나타남, FALL: 꽂힘 */
    if (e < 0) met.userData.reset();
    const M = met.userData.update(e, t, dt), uH = M.uH;
    lightM.uniforms.uI.value = M.falling ? Math.pow(uH, 3) * .45 : 0; lightM.uniforms.uR.value = 1 + uH * 2.5;
    pad.userData.update(t); star.userData.update(t);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + 2, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(-6, 12, -4);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[유성 시안]', err); } });
  onProgress(1);
  window.__fv = { get t() { return t; }, at: s => { T0 = t - s; } };
}
