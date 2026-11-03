/* 보스 보기 — 크로나크(2스테이지 보스)를 게임 시점(위에서)으로 띄워 휴대폰에서 무게·생김새 확인
   · '원본 / 줄인 판' 버튼: 사용자가 준 효과 그대로 붙인 것과 그리는 횟수만 줄인 것을 번갈아 봄 (겉모습 같은지 · 프레임 차이)
   · 화면 위: 한 장면에 그리는 횟수 · 삼각형 수 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11031250';
import { makePerf } from './perf.js?v=11031250';
import { enhanceChron } from './bosses/chronfx.js?v=11031250';
import { makeChronarch } from './bosses/chronarch.js?v=11031250';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .72; renderer.autoClear = false; renderer.setClearColor(0x05070d, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 400), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); }
  { const k = new THREE.DirectionalLight(0xfff0dc, 2); k.position.set(-6, 12, -4); scene.add(k); scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x14100c, .6)); }
  onProgress(.2);
  const slim = await makeChronarch('./assets/bosses/chronarch.glb'); onProgress(.6);
  const og = await new GLTFLoader().loadAsync('./assets/bosses/chronarch.glb'), ofx = enhanceChron(THREE, og.scene, {}); onProgress(.9);
  const S = 1.4; slim.root.scale.setScalar(S); og.scene.scale.setScalar(S); scene.add(slim.root, og.scene); og.scene.visible = false;
  let useSlim = true, ally = false;
  const tour = $('#tour'), info = document.createElement('div');
  info.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);padding:6px 14px;border-radius:14px;background:rgba(4,8,6,.55);border:1px solid rgba(185,255,74,.25);color:#e8f6d0;font-size:12.5px;pointer-events:none;white-space:nowrap'; document.body.appendChild(info);
  const btn = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt(); b.onclick = () => { fn(); b.textContent = txt(); }; tour.appendChild(b); };
  btn(() => useSlim ? '줄인 판 (누르면 원본)' : '원본 (누르면 줄인 판)', () => { useSlim = !useSlim; slim.root.visible = useSlim; og.scene.visible = !useSlim; });
  btn(() => ally ? '우리 편 빛 (누르면 적)' : '적 (누르면 우리 편 빛)', () => { ally = !ally; slim.setAlly(ally); ofx.setAlly(ally); });
  const cam = { az: 0, tilt: .35, h: 26, H: 26 }, ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId); if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .02, 1.2); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 8, 80); pin = d; } });
  const up = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 8, 80); }, { passive: true });
  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  renderer.info.autoReset = false; let last = performance.now(), t = 0, shown = 0;
  renderer.setAnimationLoop(now => { try { renderer.info.reset();
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    (useSlim ? slim : { update: ofx.update }).update(t);
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt), Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(0, 0, 0);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
    if ((shown -= dt) <= 0) { shown = .5; info.textContent = `${useSlim ? '줄인 판' : '원본'} · 그리는 횟수 ${renderer.info.render.calls}번 · 삼각형 ${(renderer.info.render.triangles / 1e4).toFixed(1)}만`; }
  } catch (err) { console.error('[보스]', err); } });
  { const v = (import.meta.url.match(/v=(\d+)/) || [])[1] || '개발'; const el = document.createElement('div'); el.textContent = '보스 보기 · 판 번호 ' + v;
    el.style.cssText = 'position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-size:11px;color:rgba(185,255,74,.7);pointer-events:none'; document.body.appendChild(el); }
  onProgress(1); window.__bv = { get t() { return t; }, info: renderer.info };
}
