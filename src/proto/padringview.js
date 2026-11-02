/* 시작 기지 부품 보기 ① — 자기장 판(격납고 그대로) + 금테 네 갈래 별 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js';
import { makePad } from '../core/hangar/pad.js';
import { makeMag } from '../core/hangar/mag.js';
import { buildShip } from '../core/ships/build.js';
import { makeGoldStar } from './goldstar.js?v=11021646';
import { makePerf } from './perf.js?v=11021646';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const VIEWS = [{ name: '비스듬히', h: 11, tilt: .9 }, { name: '위에서', h: 12, tilt: .06 }, { name: '낮게', h: 8, tilt: 1.22 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x03050b, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.8); key.position.set(-6, 9, -4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb0ff, 1.1); fill.position.set(6, 4, 7); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x6a7aa8, 0x120e18, .45));
  /* 우주 배경: 별과 아주 흐린 성운 (한 번만 그림) */
  { const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
    const gr = g.createRadialGradient(600, 320, 20, 600, 320, 1040); gr.addColorStop(0, '#0d1630'); gr.addColorStop(1, '#03050b'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 900; i++) { const r = Math.random(); g.fillStyle = `rgba(${200 + r * 55},${210 + r * 45},255,${.2 + Math.random() * .6})`; g.fillRect(Math.random() * 2048, Math.random() * 1024, 1, 1); }
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; scene.background = t; scene.backgroundIntensity = .32; }
  onProgress(.2);

  const base = new THREE.Group(); scene.add(base);
  const pad = makePad(); base.add(pad); const mag = makeMag(pad); base.add(mag); mag.userData.setMode(1);
  const star = makeGoldStar(); base.add(star);
  const stand = new THREE.Group(); base.add(stand);
  onProgress(.5);
  const b = await buildShip(1, 1, 'ruby', { renderer, size: 7.5 }); const ship = b.root, sm = ship.children[0]; stand.add(ship);
  const k2 = ship.scale.x, shipHalf = new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()).y * k2 / 2;
  let showShip = false; ship.visible = false;
  onProgress(.9);

  /* 버튼: 시점 · 기체 */
  const cam = { h: 11, H: 11, tilt: .9, T: .9, az: -.6 }, tour = $('#tour');
  VIEWS.forEach((v, i) => { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = v.name; bt.className = 'view' + (i ? '' : ' on');
    bt.onclick = () => { cam.H = v.h; cam.T = v.tilt; tour.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x === bt)); }; tour.appendChild(bt); });
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  const sb = document.createElement('button'); sb.type = 'button'; sb.textContent = '기체 없음';
  sb.onclick = () => { showShip = !showShip; ship.visible = showShip; sb.textContent = showShip ? '기체 있음' : '기체 없음'; sb.classList.toggle('on', showShip); }; tour.appendChild(sb);
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .02, 1.4); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 3, 30); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 3, 30); }, { passive: true });

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height);
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); mag.userData.setPixel(Hd / 20); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  let last = performance.now(), t = 0;
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    pad.userData.update(t); mag.userData.update(t, showShip ? ship : null, shipHalf); star.userData.update(t);
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    camera.position.set(Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + .3, Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(0, .35, 0);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); if (perf.st.bg) renderer.render(scene, camera); else { const bg = scene.background; scene.background = null; renderer.render(scene, camera); scene.background = bg; }
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[판 보기]', err); } });
  onProgress(1);
  window.__pv = { get t() { return t; }, cam };
}
