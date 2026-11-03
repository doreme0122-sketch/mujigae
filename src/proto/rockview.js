/* 벽 보기 (지금은 용암 흑요석) — 맵 미리보기와 같은 하늘(행성 위 궤도), 같은 위에서 본 카메라 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11031919';
import { makePerf } from './perf.js?v=11031919';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeIceRidge } from './ice.js?v=11031919';
import { makeCrystalRidge } from './crystal.js?v=11031919';
import { makeRuinRidge, updateRuins } from './ruins.js?v=11031919';
import { makeCoralRidge } from './coral.js?v=11031919';
import { makeWalls } from './wallhit.js?v=11031919';
import { makeRidge, updateRidge, hitWall } from './rocks.js?v=11031919';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, rnd = (a, b) => a + Math.random() * (b - a);
const VIEWS = [
  { id: 'near', name: '가까이', h: 22, tilt: .62 },
  { id: 'game', name: '게임 시점', h: 44, tilt: .26 }];
const WALLS = [
  { id: 'obsidian', name: '용암 흑요석', tip: '평소엔 빛나지 않는 검은 유리 바위예요. 탄에 맞으면 맞은 자리 둘레의 틈만 용암빛으로 짧게 반짝였다가 식어요. 화면의 벽을 누르면 그쪽으로 쏴요.', spark: [1.4, .7, .3], flash: [1.4, .55, .2], shard: 0x050407 },
  { id: 'ice', name: '빙하 얼음', tip: '거대한 얼음 덩어리가 이어진 벽이에요. 속에 푸른 층이 겹겹이 지고 기포가 얼어 있어요. 위엔 서리가 앉았어요. 탄에 맞으면 속 깊이 갇힌 빛이 깨어나 층을 따라 퍼졌다가 다시 얼어요.', spark: [.8, 1.05, 1.4], flash: [.6, .85, 1.4], shard: 0x9fd8ff },
  { id: 'crystal', name: '자수정 무리', tip: '자수정 무리가 이어진 벽이에요. 큰 결정 뿌리마다 작은 결정이 붙어 자랐고, 짙은 보라에서 끝으로 갈수록 맑아요. 아주 천천히 자라듯 숨 쉬어요. 탄에 맞으면 결정 속에서 빛이 면마다 다르게 꺾여 무지개로 반짝이고, 맞은 결정은 움찔해요.', spark: [1.2, 1.1, 1.4], flash: [1.1, 1, 1.3], shard: 0xd8ccff },
  { id: 'ruins', name: '고대 유적', tip: '누가 만들었는지 모르는 옛 구조물이 부서져 남은 벽이에요. 거대한 고리 조각이 공중에 떠 돌아요. 탄에 맞으면 새겨진 문양이 맞은 자리부터 하나씩 금빛으로 켜졌다가 꺼져요.', spark: [1.4, 1.1, .6], flash: [1.3, 1, .55], shard: 0x3a3631 },
  { id: 'coral', name: '성운 산호', tip: '성운 가스가 식어 굳으며 산호처럼 가지를 뻗은 벽이에요. 물속처럼 아주 천천히 흔들려요. 탄에 맞으면 근처 가지 끝 방울들이 반딧불처럼 하나씩 깜빡이며 켜졌다 꺼져요.', spark: [.7, 1.3, 1.1], flash: [.6, 1.2, 1], shard: 0x1a3a3c }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 600), bloom = makeBloom(renderer, { samples: 0 }), U = v => ({ value: v }), UT = U(0);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .5; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.set(-8, 12, -6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .7); fill.position.set(7, 5, 9); scene.add(fill);
  const lavaUp = new THREE.DirectionalLight(0xff7a3c, .8); lavaUp.position.set(2, -6, 3); scene.add(lavaUp);     /* 아래 용암 행성에서 올라오는 빛 */
  scene.add(new THREE.HemisphereLight(0x7080a8, 0x2a1810, .4));
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

  /* 흑요석 능선 하나 */
  const pts = []; for (let k = 0; k <= 8; k++) pts.push([-34 + k * 8.5, Math.sin(k * .9) * 2.2]);
  const obs = makeRidge('obsidian', pts, { uT: UT, seed: 3, float: true }); scene.add(obs); onProgress(.45);
  const ice = makeIceRidge(pts, { uT: UT, seed: 4 }); scene.add(ice); ice.visible = false;
  const cry = makeCrystalRidge(pts, { uT: UT, seed: 6 }); scene.add(cry); cry.visible = false; onProgress(.6);
  const rui = makeRuinRidge(pts, { uT: UT, seed: 21 }); scene.add(rui); rui.visible = false;
  const cor = makeCoralRidge(pts, { uT: UT, seed: 41 }); scene.add(cor); cor.visible = false;
  const GR = { obsidian: null, ice, crystal: cry, ruins: rui, coral: cor };
  /* 충돌은 보이는 벽과 따로: 벽마다 같은 길 위의 띠 (두께만 다름) */
  const WB = makeWalls(), HW = { obsidian: 2.1, ice: 2.3, crystal: 1.7, ruins: 1.15, coral: 1.7 };
  for (const id in HW) WB.add(pts, HW[id], { id });
  const items = obs.userData.items, fl = obs.userData.fl;
  let W = WALLS[0], wall = obs;
  const targets = () => GR[W.id] ? GR[W.id].userData.targets() : [...items.filter(i => !i.float && i.s > .6).map(i => ({ x: i.x, y: i.y + i.s * .15, z: i.z, r: i.s * .62 })), ...fl.map(f => ({ x: f.it.x, y: f.y ?? f.it.y + f.h, z: f.it.z, r: f.it.s * .5 }))];
  /* 깨져 튀는 유리 조각 */
  const shardMat = new THREE.MeshPhysicalMaterial({ color: 0x050407, roughness: .08, clearcoat: 1, envMapIntensity: 1.2 });
  const SH = Array.from({ length: 36 }, () => { const o = new THREE.Mesh(new THREE.TetrahedronGeometry(.09), shardMat); o.visible = false; scene.add(o); return { o, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }; }); let shI = 0;
  const ship = await buildShip(1, 1, 'ruby', { renderer, size: 2.0 }); const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const sm = ship.root.children[0], ENG = engineSpots(ship.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
  onProgress(.9);

  const shots = [], parts = [];
  const cam = { x: 0, z: 0, h: 22, H: 22, az: 0, tilt: .62, T: .62 };
  const tour = $('#tour');
  const tip = () => { $('#tip').hidden = false; $('#tip b').textContent = W.name; $('#tip span').textContent = W.tip; $('#head b').textContent = W.name + ' 벽'; };
  for (const w of WALLS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = w.name; b.className = 'wall';
    b.onclick = () => { W = w; wall = GR[w.id] || obs; obs.visible = w.id === 'obsidian'; ice.visible = w.id === 'ice'; cry.visible = w.id === 'crystal'; rui.visible = w.id === 'ruins'; cor.visible = w.id === 'coral'; shardMat.color.set(w.shard);
      shardMat.transmission = 0; document.querySelectorAll('#tour .wall').forEach(x => x.classList.toggle('on', x === b)); tip(); }; tour.appendChild(b); }
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  for (const v of VIEWS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.dataset.id = v.id;
    b.className = 'view'; b.onclick = () => { cam.H = v.h; cam.T = v.tilt; document.querySelectorAll('#tour .view').forEach(x => x.classList.toggle('on', x === b)); }; tour.appendChild(b); }
  tour.querySelector('.wall').classList.add('on'); tour.querySelector('.view').classList.add('on'); tip();

  /* 쏘기: 기체 코에서 목표까지 곧게 */
  const nose = new THREE.Vector3();
  function fire(tx, ty, tz) { me.updateMatrixWorld(true); nose.set(0, 0, -1.1).applyMatrix4(me.matrixWorld);
    const d = new THREE.Vector3(tx - nose.x, ty - nose.y, tz - nose.z).normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize();
    for (const k of [-1, 1]) shots.push({ p: nose.clone().addScaledVector(side, .3 * k), v: d.clone().multiplyScalar(30), life: 1.6 }); }
  let auto = 1.5, burst = 0, aim = null, aimT = 0;
  /* 누르면: 누른 곳의 바위로 쏜다 / 끌면 카메라가 돈다 */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ptr = new Map(); let pin = 0, moved = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pin = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId); moved += Math.abs(e.clientX - o[0]) + Math.abs(e.clientY - o[1]);
    if (ptr.size === 1 && moved > 8) { bgDirty = true; cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.1); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pin) cam.H = clamp(cam.H * pin / d, 8, 120); pin = d; } });
  const up = e => { if (ptr.has(e.pointerId) && ptr.size === 1 && moved < 8) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(wall, true)[0]; if (hit) { aim = hit.point.clone(); burst = 4; aimT = 0; auto = 2.5; } }
    ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 8, 120); }, { passive: true });

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); bgDirty = true; });
  let bgDirty = true, bgN = 0;
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); bgDirty = true;
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); bgMat.uniforms.uPx.value.set(2 / Wd, 2 / Hd); planetMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  let last = performance.now(), t = 0, fr = 0, ft = 0, cd = 0; const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try { frame(now); } catch (e) { console.error('[벽 보기]', e); } });   /* 한 번 틀려도 화면이 멈추지 않게 */
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; UT.value = t;
    glow.begin();
    /* 기체: 벽 앞을 천천히 오가며, 이따금 벽을 쏜다 */
    const x = Math.sin(t * .16) * 24, vx = Math.cos(t * .16) * 24 * .16, z = 8.5 + Math.sin(t * .5) * .6;
    const face = aim ? Math.atan2(-(aim.x - x), -(aim.z - z)) : (vx > 0 ? -Math.PI / 2 : Math.PI / 2);
    me.position.set(x, .6, z); me.rotation.order = 'YXZ'; me.rotation.y += THREE.MathUtils.euclideanModulo(face - me.rotation.y + Math.PI, Math.PI * 2) - Math.PI > 0 ? Math.min(dt * 5, THREE.MathUtils.euclideanModulo(face - me.rotation.y + Math.PI, Math.PI * 2) - Math.PI) : Math.max(-dt * 5, THREE.MathUtils.euclideanModulo(face - me.rotation.y + Math.PI, Math.PI * 2) - Math.PI);
    me.rotation.z = -vx * .03;
    if ((auto -= dt) <= 0 && !burst) { aimT = 0; const ts = targets().filter(o => Math.abs(o.x - x) < 10); const o = ts[Math.floor(Math.random() * ts.length)]; if (o) { aim = new THREE.Vector3(o.x, o.y, o.z); burst = 3; } auto = rnd(1.6, 2.8); }
    if (burst && aim && (cd -= dt) <= 0) { cd = .13; fire(aim.x, aim.y, aim.z); if (--burst === 0) aimT = .5; }   /* 다 쏘고 0.5초 뒤 고개를 돌림 */
    if (aimT > 0 && (aimT -= dt) <= 0 && !burst) aim = null;
    me.updateMatrixWorld(true); const hx = -Math.sin(me.rotation.y), hz = -Math.cos(me.rotation.y);
    for (const p of ENG) { v3.copy(p).applyMatrix4(sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -hx * .9, 0, -hz * .9, .15, 1, [.4, .6, 1.4], .9); glow.add(v3.x - hx * .2, v3.y, v3.z - hz * .2, -hx * .6, 0, -hz * .6, .4, 3, [.25, .45, 1.3], .7); }
    if (obs.visible) updateRidge(obs, t, dt, glow);
    if (rui.visible) updateRuins(rui, t);
    /* 탄 */
    for (let i = shots.length - 1; i >= 0; i--) { const b = shots[i]; b.p.addScaledVector(b.v, dt); b.life -= dt; let hit = b.life <= 0;
      if (!hit) { const h = WB.hit(b.p.x - b.v.x * dt, b.p.z - b.v.z * dt, b.p.x, b.p.z, W.id); if (h) { hit = true;     /* 이번에 지나온 선이 벽 띠에 닿았나 */
          const [nx, nz] = WB.normal(h.x, h.z, h.s), n = new THREE.Vector3(nx, .25, nz).normalize(), hp = new THREE.Vector3(h.x, b.p.y - b.v.y * dt * (1 - h.t), h.z);
          hitWall(hp.x, hp.y, hp.z, t);
          parts.push({ p: hp.clone(), v: new THREE.Vector3(), life: .22, age: 0, r: 1.4, k: 3, c: W.flash, a: 1.3, grow: 1 });
          for (let k = 0; k < 9; k++) { const dv = n.clone().multiplyScalar(rnd(3, 8)).add(new THREE.Vector3(rnd(-4, 4), rnd(-2, 4), rnd(-4, 4))); parts.push({ p: hp.clone(), v: dv, life: rnd(.25, .55), age: 0, r: rnd(.04, .08), k: 2, c: W.spark, a: 1 }); }
          for (let k = 0; k < 2; k++) { const s = SH[shI++ % SH.length]; s.o.position.copy(hp); s.v.copy(n).multiplyScalar(rnd(2, 5)).add(new THREE.Vector3(rnd(-2, 2), rnd(0, 2), rnd(-2, 2))); s.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)); s.life = rnd(.8, 1.4); s.o.visible = true; s.o.scale.setScalar(rnd(.7, 1.6)); }
          } }
      if (hit) { shots.splice(i, 1); continue; }
      glow.add(b.p.x, b.p.y, b.p.z, -b.v.x * .024, -b.v.y * .024, -b.v.z * .024, .08, 2, [.55, .75, 1.3], 1, i); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age > p.life) { parts.splice(i, 1); continue; } p.v.multiplyScalar(Math.exp(-2 * dt)); p.p.addScaledVector(p.v, dt);
      const k = p.age / p.life; glow.add(p.p.x, p.p.y, p.p.z, -p.v.x * .03, -p.v.y * .03, -p.v.z * .03, p.grow ? p.r * (.6 + k) : p.r, p.k, p.c, p.a * (1 - k) * (p.grow ? 1 - k : 1), i); }
    for (const s of SH) if (s.o.visible) { s.life -= dt; s.v.multiplyScalar(Math.exp(-1.2 * dt)); s.o.position.addScaledVector(s.v, dt); s.o.rotation.x += s.w.x * dt; s.o.rotation.y += s.w.y * dt; if (s.life <= 0) s.o.visible = false; }
    glow.end(); glow.uT.value = t;
    /* 카메라 */
    cam.x += (x * .4 - cam.x) * Math.min(1, dt * 1.5); cam.z += (3 - cam.z) * Math.min(1, dt * 2); cam.h += (cam.H - cam.h) * Math.min(1, dt * 2.5); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 2.5);
    const back = cam.h * Math.sin(cam.tilt), hh = cam.h * Math.cos(cam.tilt);
    camera.position.set(cam.x + Math.sin(cam.az) * back, hh, cam.z + Math.cos(cam.az) * back); camera.lookAt(cam.x, 0, cam.z);
    planetMat.uniforms.uR.value = 450 / (cam.h + 400); planetMat.uniforms.uT.value = t; planetMat.uniforms.uYaw.value = PL.yaw0 + t * .006 + cam.az * .3;
    if (perf.st.bg && (bgDirty || ++bgN % 20 === 0)) { renderer.setRenderTarget(skyRT); renderer.render(bgS, bgCam); bgDirty = false; }   /* 행성은 아주 느리게 돌아서 20장면에 한 번만 다시 그림 */
    renderer.setRenderTarget(bloom.scene); renderer.clear(); if (perf.st.bg) renderer.render(bgScene, bgCam); renderer.clearDepth(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  }
  onProgress(1);
  window.__rv = { cam, fire, shots, wall: id => [...document.querySelectorAll('#tour .wall')][WALLS.findIndex(w => w.id === id)].click() };
}
