/* 지역 바닥 보기 — 기체가 구름층 위를 8자로 날며 구름을 가른다 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11072253';
import { makePerf } from './perf.js?v=11021559';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeFloor, FLOORS } from './floor.js?v=11021548';
import * as OLD from './floor_old.js?v=11021548';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const TIPS = { dust: '시작 지역의 잔잔한 회색 먼지예요. 띄엄띄엄 작은 반짝임이 있어요.', frost: '얼음 성운 지대의 푸른 서리 안개예요. 얼음 알갱이가 날카롭게 반짝여요.',
  ash: '용암 균열대의 검은 재 구름이에요. 아래에서 붉은 빛이 비치고 불씨가 숨 쉬듯 깜빡여요.', shard: '결정 협곡의 보랏빛 결정 가루예요. 반짝임이 빛이 갈라진 무지개예요.',
  bog: '안개 늪의 짙은 청록 안개예요. 천천히 소용돌이쳐요.' };
const VIEWS = [{ id: 'game', name: '게임 시점', h: 44, tilt: .26 }, { id: 'near', name: '가까이', h: 20, tilt: .55 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 600), bloom = makeBloom(renderer, { samples: 0 }), U = v => ({ value: v });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.set(-8, 12, -6); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x7080a8, 0x2a1810, .5));
  const PL = planetFor(1), bgS = new THREE.Scene(), bgCam = new THREE.Camera();
  const planetMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uRes: U(new THREE.Vector2(2, 2)), uT: U(0), uYaw: U(PL.yaw0), uPitch: U(PL.tilt), uS: U(0), uFade: U(.5), uR: U(1), uC: U(new THREE.Vector2(.5, .5)), uSun: U(new THREE.Vector3(...PL.sun)), uDetail: U(1),
      uSB: U(new THREE.Vector4(0, 0, 9, 0)), uSB2: U(new THREE.Vector4(1, 0, 1, 1)), uSC: U(new THREE.Vector4(0, 0, 9, 0)), uSC2: U(new THREE.Vector4(1, 0, 1, 1)), uStarK: U(1) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: planetShader(PL, { three: true }) });
  bgS.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planetMat));
  const skyRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const bgMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: U(skyRT.texture), uPx: U(new THREE.Vector2(.002, .004)) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;uniform vec2 uPx;void main(){ vec3 c=texture2D(t,vU).rgb*.4; c+=(texture2D(t,vU+uPx*1.5).rgb+texture2D(t,vU-uPx*1.5).rgb+texture2D(t,vU+vec2(uPx.x,-uPx.y)*1.5).rgb+texture2D(t,vU-vec2(uPx.x,-uPx.y)*1.5).rgb)*.15; gl_FragColor=vec4(c*.4,1.);}' });
  const bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const glow = makeGlow(); scene.add(glow.mesh);
  const floor = makeFloor(renderer); let F = FLOORS[0]; floor.set(F);
  onProgress(.4);
  const ship = await buildShip(1, 1, 'ruby', { renderer, size: 2.0 }); const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const sm = ship.root.children[0], ENG = engineSpots(ship.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
  onProgress(.9);
  const cam = { x: 0, z: 0, h: 44, H: 44, tilt: .26, T: .26 };
  const tour = $('#tour'), tip = () => { $('#tip').hidden = false; $('#tip b').textContent = F.name; $('#tip span').textContent = TIPS[F.id]; $('#head b').textContent = '지역 바닥 · ' + F.name; };
  for (const f of FLOORS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = f.name; b.className = 'wall';
    b.onclick = () => { F = f; floor.set(f); document.querySelectorAll('#tour .wall').forEach(x => x.classList.toggle('on', x === b)); tip(); }; tour.appendChild(b); }
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  for (const v of VIEWS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.className = 'view';
    b.onclick = () => { cam.H = v.h; cam.T = v.tilt; document.querySelectorAll('#tour .view').forEach(x => x.classList.toggle('on', x === b)); }; tour.appendChild(b); }
  tour.querySelector('.wall').classList.add('on'); tour.querySelector('.view').classList.add('on'); tip();
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 10, 120); }, { passive: true });
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); bgDirty = true; });
  let bgDirty = true, bgN = 0;
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); bgDirty = true;
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); bgMat.uniforms.uPx.value.set(2 / Wd, 2 / Hd); planetMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); floor.size(Wd, Hd); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);
  let last = performance.now(), t = 0, fr = 0, ft = 0, py = 0, slow = 0; const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    fr++; ft += dt; if (ft > .5) { const f = fr / ft; fr = 0; ft = 0;
      slow = f < 45 ? slow + 1 : 0; if (slow >= 4 && floor.div < 6) { floor.setDiv(6); floor.mat.uniforms.uGlint.value = .6; } }   /* 느리면 바닥을 더 작게, 반짝임 줄임 */
    /* 8자 비행 */
    const k = t * .28, x = Math.sin(k) * 20, z = Math.sin(k * 2) * 8, vx = Math.cos(k) * 20 * .28, vz = Math.cos(k * 2) * 16 * .28;
    const yaw = Math.atan2(-vx, -vz), turn = THREE.MathUtils.euclideanModulo(yaw - py + Math.PI, Math.PI * 2) - Math.PI; py = yaw;
    me.position.set(x, .4, z); me.rotation.order = 'YXZ'; me.rotation.set(0, yaw, clamp(-turn / Math.max(dt, 1e-3) * .25, -.7, .7));
    me.updateMatrixWorld(true); floor.update(t, dt, x, z);
    glow.begin(); const hx = -Math.sin(yaw), hz = -Math.cos(yaw);
    for (const p of ENG) { v3.copy(p).applyMatrix4(sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -hx * .9, 0, -hz * .9, .15, 1, [.4, .6, 1.4], .9); glow.add(v3.x - hx * .2, v3.y, v3.z - hz * .2, -hx * .6, 0, -hz * .6, .4, 3, [.25, .45, 1.3], .7); }
    glow.end(); glow.uT.value = t;
    cam.x += (x * .4 - cam.x) * Math.min(1, dt * 1.5); cam.z += (z * .4 - cam.z) * Math.min(1, dt * 1.5); cam.h += (cam.H - cam.h) * Math.min(1, dt * 2.5); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 2.5);
    camera.position.set(cam.x, cam.h * Math.cos(cam.tilt), cam.z + cam.h * Math.sin(cam.tilt)); camera.lookAt(cam.x, 0, cam.z);
    planetMat.uniforms.uR.value = 450 / (cam.h + 400); planetMat.uniforms.uT.value = t; planetMat.uniforms.uYaw.value = PL.yaw0 + t * .006;
    if (perf.st.bg && (bgDirty || ++bgN % 20 === 0)) { renderer.setRenderTarget(skyRT); renderer.render(bgS, bgCam); bgDirty = false; }   /* 행성은 아주 느리게 돌아서 20장면에 한 번만 다시 그림 */
    renderer.setRenderTarget(bloom.scene); renderer.clear(); if (perf.st.bg) renderer.render(bgScene, bgCam); floor.render(camera, bloom.scene); renderer.clearDepth(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt); } catch (e) { console.error('[바닥 보기]', e); } });
  onProgress(1);
  /* 무게 재기: 바닥만 여러 번 그려 걸린 시간 (예전 방식과 비교) */
  const oldF = OLD.makeFloor(); const oldS = new THREE.Scene(); oldS.add(oldF.grp); oldF.set(F);
  const px = new Uint8Array(4), sync = () => { const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const bench = (n = 40) => { const run = f => { for (let i = 0; i < 3; i++) f(); sync(); const a = performance.now(); for (let i = 0; i < n; i++) { f(); sync(); } return (performance.now() - a) / n; };
    renderer.setRenderTarget(null);
    oldF.set(F); for (const m of oldF.mats) m.uniforms.uT.value = t;
    const o = run(() => { renderer.setRenderTarget(null); renderer.render(oldS, camera); }) - run(() => { renderer.setRenderTarget(null); renderer.clear(); });
    const nw = run(() => floor.render(camera, null)) - run(() => { renderer.setRenderTarget(null); renderer.clear(); });
    return { old: +o.toFixed(2), now: +nw.toFixed(2), ratio: +(o / nw).toFixed(1) }; };
  window.__fv = { bench, cam, set: id => [...document.querySelectorAll('#tour .wall')][FLOORS.findIndex(f => f.id === id)].click() };
}
