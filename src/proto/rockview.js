/* 바위 능선 3종 비교 보기 — 맵 미리보기와 같은 하늘(행성 위 궤도), 같은 위에서 본 카메라 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeRidge } from './rocks.js';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, rnd = (a, b) => a + Math.random() * (b - a);
const ROWS = [
  { id: 'plain', name: '그냥 바위', en: 'ROCK', z: -16, tip: '비스듬히 쌓인 결이 있는 퇴적암이에요. 깨진 면은 납작하고, 패인 틈엔 먼지가 고여요. 가장 흔한 경계 벽이에요.' },
  { id: 'lava', name: '용암 바위', en: 'LAVA ROCK', z: 0, tip: '겉은 식어서 검게 굳었고, 갈라진 틈 일부에서 아직 뜨거운 용암이 숨 쉬듯 빛나요. 가까이 가면 불티가 날려요.' },
  { id: 'meteor', name: '운석', en: 'METEORITE', z: 16, tip: '떨어지며 녹았다 굳은 매끈한 겉에 엄지로 누른 듯한 자국이 있어요. 깨진 곳은 속의 쇠가 드러나 반짝여요.' }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 600), bloom = makeBloom(renderer), U = v => ({ value: v }), UT = U(0);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.set(-8, 12, -6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .7); fill.position.set(7, 5, 9); scene.add(fill);
  const lavaUp = new THREE.DirectionalLight(0xff7a3c, .8); lavaUp.position.set(2, -6, 3); scene.add(lavaUp);     /* 아래 용암 행성에서 올라오는 빛 */
  scene.add(new THREE.HemisphereLight(0x7080a8, 0x2a1810, .4));
  /* 아래 행성 */
  const PL = planetFor(1), bgS = new THREE.Scene(), bgCam = new THREE.Camera();
  const planetMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uRes: U(new THREE.Vector2(2, 2)), uT: U(0), uYaw: U(PL.yaw0), uPitch: U(PL.tilt), uS: U(0), uFade: U(.5), uR: U(1), uC: U(new THREE.Vector2(.5, .5)), uSun: U(new THREE.Vector3(...PL.sun)), uDetail: U(1),
      uSB: U(new THREE.Vector4(0, 0, 9, 0)), uSB2: U(new THREE.Vector4(1, 0, 1, 1)), uSC: U(new THREE.Vector4(0, 0, 9, 0)), uSC2: U(new THREE.Vector4(1, 0, 1, 1)), uStarK: U(1) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: planetShader(PL, { three: true }) });
  bgS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planetMat));
  const skyRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const bgMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: U(skyRT.texture), uPx: U(new THREE.Vector2(.002, .004)) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;uniform vec2 uPx;void main(){ vec3 c=texture2D(t,vU).rgb*.4; c+=(texture2D(t,vU+uPx*1.5).rgb+texture2D(t,vU-uPx*1.5).rgb+texture2D(t,vU+vec2(uPx.x,-uPx.y)*1.5).rgb+texture2D(t,vU-vec2(uPx.x,-uPx.y)*1.5).rgb)*.15; gl_FragColor=vec4(c*.45,1.);}' });
  const bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.15);

  /* 능선 셋: 같은 굽이로 나란히 */
  const R = {};
  for (const [i, r] of ROWS.entries()) { const pts = []; for (let k = 0; k <= 8; k++) { const x = -34 + k * 8.5; pts.push([x, r.z + Math.sin(k * .9 + i) * 2.2]); }
    const g = makeRidge(r.id, pts, { uT: UT, seed: 3 + i * 5 }); scene.add(g); R[r.id] = g; onProgress(.15 + .2 * (i + 1)); }
  /* 기체 (크기 비교용): 능선 사이를 천천히 지나간다 */
  const ship = await buildShip(1, 1, 'ruby', { renderer, size: 2.0 }); const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const sm = ship.root.children[0], ENG = engineSpots(ship.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
  onProgress(.9);

  /* 용암 불티 */
  const lavaItems = R.lava.userData.items.filter(it => it.s > 1.2), EMB = [];
  const cam = { x: 0, z: 0, h: 62, H: 62, az: 0, tilt: .26 }; let focus = 'all';
  const tour = $('#tour');
  for (const r of [{ id: 'all', name: '셋 다' }, ...ROWS]) { const b = document.createElement('button'); b.type = 'button'; b.textContent = r.name; b.dataset.id = r.id;
    b.onclick = () => { focus = r.id; cam.H = r.id === 'all' ? 62 : 26; document.querySelectorAll('#tour button').forEach(x => x.classList.toggle('on', x === b));
      $('#tip').hidden = r.id === 'all'; if (r.tip) { $('#tip b').textContent = r.name; $('#tip span').textContent = r.tip; } }; tour.appendChild(b); }
  tour.firstChild.classList.add('on');
  /* 끌면 카메라가 돈다, 두 손가락·휠로 확대 */
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pin = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.1); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pin) cam.H = clamp(cam.H * pin / d, 8, 120); pin = d; } });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 8, 120); }, { passive: true });

  let Wd = 2, Hd = 2;
  function size() { const r = canvas.getBoundingClientRect(), DPR = Math.min(1.75, devicePixelRatio || 1); Wd = Math.max(2, Math.round(r.width * DPR)); Hd = Math.max(2, Math.round(r.height * DPR));
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); bgMat.uniforms.uPx.value.set(2 / Wd, 2 / Hd); planetMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size();

  let last = performance.now(), t = 0, fr = 0, ft = 0; const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; UT.value = t;
    fr++; ft += dt; if (ft > .5) { $('#fps').textContent = Math.round(fr / ft) + ' fps'; fr = 0; ft = 0; }
    glow.begin();
    /* 기체: 용암 줄과 운석 줄 사이, 그냥 바위 줄과 용암 줄 사이를 번갈아 왕복 */
    const lane = Math.sin(t * .11) > 0 ? -8 : 8, x = Math.sin(t * .22) * 30, vx = Math.cos(t * .22) * 30 * .22;
    me.position.set(x, .6, lane + Math.sin(t * .7) * .4); me.rotation.order = 'YXZ'; me.rotation.set(0, vx > 0 ? -Math.PI / 2 : Math.PI / 2, -vx * .04);
    me.updateMatrixWorld(true); const hx = vx > 0 ? 1 : -1;
    for (const p of ENG) { v3.copy(p).applyMatrix4(sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -hx * .9, 0, 0, .15, 1, [.4, .6, 1.4], .9); glow.add(v3.x - hx * .2, v3.y, v3.z, -hx * .6, 0, 0, .4, 3, [.25, .45, 1.3], .7); }
    /* 용암 바위: 큰 덩어리 둘레의 열기와 불티 */
    for (const it of lavaItems) { const pulse = .5 + .5 * Math.sin(t * 1.3 + it.x); glow.add(it.x, it.y - .3, it.z, 0, 0, 0, it.s * 1.6, 3, [1, .3, .06], .12 + pulse * .06);
      if (Math.random() < dt * .9) EMB.push({ x: it.x + rnd(-.6, .6) * it.s, y: it.y + it.s * .4, z: it.z + rnd(-.6, .6) * it.s, vx: rnd(-.4, .4), vy: rnd(.8, 1.8), vz: rnd(-.4, .4), life: rnd(1.2, 2.4), age: 0 }); }
    for (let i = EMB.length - 1; i >= 0; i--) { const e = EMB[i]; e.age += dt; if (e.age > e.life) { EMB.splice(i, 1); continue; } e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.vx += Math.sin(t * 2 + i) * dt * .5;
      const k = e.age / e.life; glow.add(e.x, e.y, e.z, -e.vx * .05, -e.vy * .05, -e.vz * .05, .045 * (1 - k * .5), 2, [1.4, .55, .15], (1 - k) * .9); }
    glow.end(); glow.uT.value = t;
    /* 카메라 */
    const tz = focus === 'all' ? 0 : ROWS.find(r => r.id === focus).z, tx = focus === 'all' ? 0 : x * .5;
    cam.x += (tx - cam.x) * Math.min(1, dt * 2); cam.z += (tz - cam.z) * Math.min(1, dt * 2); cam.h += (cam.H - cam.h) * Math.min(1, dt * 2.5);
    const back = cam.h * Math.sin(cam.tilt), hh = cam.h * Math.cos(cam.tilt);
    camera.position.set(cam.x + Math.sin(cam.az) * back, hh, cam.z + Math.cos(cam.az) * back); camera.lookAt(cam.x, 0, cam.z);
    planetMat.uniforms.uR.value = 450 / (cam.h + 400); planetMat.uniforms.uT.value = t; planetMat.uniforms.uYaw.value = PL.yaw0 + t * .006 + cam.az * .3;
    renderer.setRenderTarget(skyRT); renderer.render(bgS, bgCam);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth(); renderer.render(scene, camera);
    bloom.render(Wd, Hd);
  });
  onProgress(1);
  window.__rv = { cam, set: id => [...document.querySelectorAll('#tour button')].find(b => b.dataset.id === id).click() };
}
