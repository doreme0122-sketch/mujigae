/* 시작 기지 부품 보기 ① — 자기장 판(격납고 그대로) + 금테 네 갈래 별 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11051020';
import { makePad } from '../core/hangar/pad.js?v=11051020';
import { makeMag } from '../core/hangar/mag.js?v=11051020';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGoldStar } from './goldstar.js?v=11051020';
import { makeArena, SPEED, WAVE_R0 } from './arena.js?v=11051020';
import { makeGuardians, GUARD } from './guardian.js?v=11051020';
import { makeFloor, FLOORS } from './floor.js?v=11051020';
import { makePerf } from './perf.js?v=11051020';
import { makeBirth, BIRTH } from './birth.js?v=11051020';
import { makeSortie, SORTIE } from './sortie.js?v=11051020';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const SHIPL = 2.9;     /* 기체 길이: 자기장 판(지름 3.2)보다 약간 작게 */
const VIEWS = [{ name: '비스듬히', h: 24, tilt: .82 }, { name: '위에서', h: 28, tilt: .06 }, { name: '낮게', h: 15, tilt: 1.2 }];

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
    /* 하늘 배경은 쓰지 않음: 아래 맵이 보이게 */ }
  onProgress(.2);

  const base = new THREE.Group(); scene.add(base);
  const pad = makePad(); base.add(pad); const mag = makeMag(pad, { dust: false }); base.add(mag); mag.userData.setMode(1);
  const star = makeGoldStar(); base.add(star);
  const ring = makeArena(); base.add(ring);
  const guards = makeGuardians(); base.add(guards);
  const LEAD = GUARD.DOWN + 1.25;   /* 결정 → 받침 → 빛이 바깥에서 가운데로 차례로 켜지며 별에 닿기까지 */
  /* 아래 맵: 판 단위 → 맵 단위(기체 2m = 판 단위 SHIPL). 기지는 맵 바닥 바로 위에 앉음 */
  const BS = 2 / SHIPL, HOVER = .25, floor = makeFloor(renderer); floor.set(FLOORS[1]);
  const fcam = new THREE.PerspectiveCamera(36, 1, .05, 300);
  const stand = new THREE.Group(); base.add(stand);
  onProgress(.5);
  const b = await buildShip(1, 1, 'ruby', { renderer, size: SHIPL }); const ship = b.root, sm = ship.children[0]; stand.add(ship); ship.rotation.y = -Math.PI / 2;   /* 머리가 출격로(+x) 쪽 */
  const k2 = ship.scale.x, shipHalf = new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()).y * k2 / 2;
  const birth = makeBirth(ship); scene.add(birth);
  const ENG = engineSpots(b.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
  const sortie = makeSortie(ship, sm, ENG); scene.add(sortie);
  sortie.userData.onLaunch = () => scene.attach(ship);                 /* 판에서 떨어져 나감 */
  let endAt = 1e9;
  const home = () => { stand.add(ship); ship.position.set(0, 0, 0); ship.rotation.set(0, -Math.PI / 2, 0); sortie.userData.stop(); };
  let showShip = true, onAt, born = false; ship.visible = false;
  /* 원인 → 결과: 탑이 빛남 → 빛 물결이 한 속도로 바닥 → 금테 별 → 판의 정중앙까지 모임 → 모이는 그 순간 하늘 빛이 가운데 땅에 닿음 → 태어남 */
  let holdAt = 1e9, W0 = 0; const FILL = 1.62 / SPEED;
  const tw = r => W0 + (WAVE_R0 - r) / SPEED;                  /* 물결이 반지름 r에 닿는 때 */
  const wake = t0 => { W0 = t0 + GUARD.DOWN; guards.userData.fire(t0); ring.userData.wake(W0);
    star.userData.fire(tw(2.55), (2.55 - 1.8) / SPEED); holdAt = tw(1.62); onAt = tw(0) - BIRTH.PRE; born = false;
    const L = onAt + BIRTH.PRE + 1.0 + SORTIE.IGN; sortie.userData.start(L); endAt = L + 6.5; };   /* 태어나 숨 고르고 1초 → 점화 → 출격 */   /* 빛이 정중앙에 모이는 그 순간 하늘 빛이 땅에 닿음 */ wake(.4);
  onProgress(.9);

  /* 버튼: 시점 · 기체 */
  const cam = { h: 22, H: 22, tilt: .82, T: .82, az: -.6 }, tour = $('#tour');
  VIEWS.forEach((v, i) => { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = v.name; bt.className = 'view' + (i ? '' : ' on');
    bt.onclick = () => { cam.H = v.h; cam.T = v.tilt; tour.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x === bt)); }; tour.appendChild(bt); });
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  const sb = document.createElement('button'); sb.type = 'button'; sb.className = 'on'; sb.textContent = '기체 있음';
  sb.onclick = () => { showShip = !showShip; if (showShip) wake(t); else { ship.visible = false; birth.userData.stop(); star.userData.off(); ring.userData.sleep(); home(); onAt = 1e9; holdAt = 1e9; endAt = 1e9; } sb.textContent = showShip ? '기체 있음' : '기체 없음'; sb.classList.toggle('on', showShip); }; tour.appendChild(sb);
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .02, 1.4); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 3, 60); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 3, 60); }, { passive: true });

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height);
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); fcam.aspect = Wd / Hd; fcam.updateProjectionMatrix(); floor.size(Wd, Hd); mag.userData.setPixel(Hd / 20); birth.userData.setPx(Hd); sortie.userData.setPx(Hd); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  let last = performance.now(), t = 0; const camT = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    const on = showShip && t >= onAt, filling = showShip && t >= holdAt; if (on && !born) { born = true; ship.visible = true; birth.userData.start(t); } mag.userData.setHold(filling);
    if (t > endAt) { home(); ship.visible = false; birth.userData.stop(); star.userData.off(); ring.userData.sleep(); wake(t + .4); }   /* 한 바퀴 끝 → 다시 */
    const SS = sortie.userData.S;
    pad.userData.update(t); mag.userData.update(t, on && !SS.flying ? ship : null, shipHalf);
    { const LU = pad.userData.lampU, q = (t - holdAt) / FILL;          /* 들어온 순서대로: 바깥 고리 → 가운데 */
      if (filling && q < 1.1) { LU.uIn.value = Math.max(0, 1.62 * (1 - Math.min(1, q))); LU.uInHead.value = q < 1 ? 1.4 : 0; } else { LU.uIn.value = -1; LU.uInHead.value = 0; } } star.userData.update(t); ring.userData.update(t); birth.userData.update(t, dt);
    { const S = birth.userData.S; for (const o of [pad, mag, star, stand]) o.position.y = S.punch; star.userData.burst(S.burst); ring.userData.impact(S.impR, S.impK);
      sortie.userData.update(t, dt);
      if (SS.warpS > 0) { const sp = SS.warpP.clone().project(camera); bloom.warp(sp.x * .5 + .5, sp.y * .5 + .5, SS.warpR, SS.warpS, Wd / Hd); }
      else { const sp = new THREE.Vector3(0, .2, 0).project(camera); bloom.warp(sp.x * .5 + .5, sp.y * .5 + .5, S.warpR, S.warpS, Wd / Hd); } } guards.userData.update(t, on);
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    /* 출격하면 화면이 기체를 따라감 */
    { const tx = SS.flying ? ship.position.x : 0, tz = SS.flying ? ship.position.z : 0; camT.x += (tx - camT.x) * Math.min(1, dt * (SS.flying ? 6 : 1.5)); camT.z += (tz - camT.z) * Math.min(1, dt * (SS.flying ? 6 : 1.5)); }
    camera.position.set(camT.x + Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt) + .3, camT.z + Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(camT.x, .35, camT.z);
    fcam.position.copy(camera.position).multiplyScalar(BS); fcam.position.y += HOVER; fcam.quaternion.copy(camera.quaternion); floor.update(t, dt, SS.flying ? ship.position.x * BS : 0, SS.flying ? ship.position.z * BS : 0);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); if (perf.st.bg) floor.render(fcam, bloom.scene); renderer.clearDepth(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[판 보기]', err); } });
  onProgress(1);
  window.__pv = { get t() { return t; }, cam };
}
