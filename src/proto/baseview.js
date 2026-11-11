/* 시작 기지 "빛의 닻" 보기
   우리 편 모함이 내려 둔 작은 정거장. 가운데 자기장 판(격납고와 같은 판·같은 자기장), 둘레에 닻 기둥 여덟, 흑요석 벽이 감싸고 나가는 길은 하나.
   · 처음 시작: 하늘에서 빛줄기가 내려와 판에 닿고 → 빛 조각이 빛줄기를 타고 내려와 판 위에서 기체로 모임 → 판에 불이 번지며 기체가 떠오름 → 나가는 길로 출발
   · 다시 살아나기: 둘레에서 빛 조각이 소용돌이치며 판 위로 모여 기체가 됨 → 비눗방울 막이 몇 초 지켜 줌(탄이 맞으면 물결) → 막이 깨지며 출발
   모든 움직임은 판의 자기장 주기(4.2초)에 맞춘다 — 판에 불이 다 들어오는 순간 기체가 뜬다. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11111031';
import { makePad } from '../core/hangar/pad.js?v=11111031';
import { makeMag } from '../core/hangar/mag.js?v=11111031';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { makeGlow } from '../preview/glow.js';
import { filmMaterial, crystalMaterial } from '../preview/fxmat.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeRidge, updateRidge } from './rocks.js?v=11111031';
import { makeFloor, FLOORS } from './floor.js?v=11111031';
import { makePerf } from './perf.js?v=11111031';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp, rnd = (a, b) => a + Math.random() * (b - a);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const CYC = 4.2, LIFT = 2.1;                  /* 자기장 주기, 그 안에서 기체가 뜨는 순간 */
const SHIP = 7.5, BS = 2.0 / SHIP;             /* 격납고와 같은 비율(기체 7.5 : 판), 맵에서 기체 길이 2 */
const EXIT = new THREE.Vector3(1, 0, .18).normalize();   /* 나가는 길 방향 */
const TIPS = { start: '하늘에서 빛줄기가 내려와 판에 닿고, 빛 조각이 빛줄기를 타고 내려와 기체로 모여요. 판에 불이 다 들어오는 순간 기체가 떠올라 출발해요.',
  respawn: '격추되면 둘레에서 빛 조각이 소용돌이치며 판 위로 모여 기체가 돼요. 몇 초 동안 비눗방울 막이 지켜 주고, 막이 깨지면 출발해요.' };
const VIEWS = [{ id: 'near', name: '가까이', h: 10, tilt: .72 }, { id: 'game', name: '게임 시점', h: 34, tilt: .26 }];

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .3, 600), bloom = makeBloom(renderer, { samples: 0 }), U = v => ({ value: v }), UT = U(0);
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.set(-8, 12, -6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .8); fill.position.set(7, 5, 9); scene.add(fill);
  const up = new THREE.DirectionalLight(0xff7a3c, .7); up.position.set(2, -6, 3); scene.add(up);
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
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;uniform vec2 uPx;void main(){ vec3 c=texture2D(t,vU).rgb*.4; c+=(texture2D(t,vU+uPx*1.5).rgb+texture2D(t,vU-uPx*1.5).rgb+texture2D(t,vU+vec2(uPx.x,-uPx.y)*1.5).rgb+texture2D(t,vU-vec2(uPx.x,-uPx.y)*1.5).rgb)*.15; gl_FragColor=vec4(c*.4,1.);}' });
  const bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const floor = makeFloor(renderer); floor.set(FLOORS[0]);
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.15);

  /* ── 자기장 판 + 자기장 (격납고와 같은 부품) ── */
  const base = new THREE.Group(); base.scale.setScalar(BS); scene.add(base);
  const pad = makePad(); base.add(pad);
  const mag = makeMag(pad); base.add(mag); mag.userData.setMode(1);
  const stand = new THREE.Group(); base.add(stand);
  /* ── 닻 기둥 여덟: 빛줄기를 붙잡는 기둥 (끝에 결정) ── */
  const ANC = [], ancG = new THREE.CylinderGeometry(.16, .34, 2.2, 6), ancM = new THREE.MeshStandardMaterial({ color: 0x26292f, metalness: .9, roughness: .3 }), tipG = new THREE.OctahedronGeometry(.22), tipM = crystalMaterial();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; if (Math.abs(Math.atan2(Math.sin(a - Math.atan2(EXIT.z, EXIT.x)), Math.cos(a - Math.atan2(EXIT.z, EXIT.x)))) < .3) continue;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * 2.75, .15, Math.sin(a) * 2.75); g.scale.setScalar(.62); g.rotation.z = -Math.cos(a) * .12; g.rotation.x = Math.sin(a) * .12;
    const b = new THREE.Mesh(ancG, ancM); b.position.y = .6; g.add(b); const tp = new THREE.Mesh(tipG, tipM); tp.position.y = 1.9; tp.scale.set(1, 1.6, 1); g.add(tp); scene.add(g); ANC.push({ g, tp, a }); }
  /* ── 정거장 바닥: 판을 둘러싼 금속 판 여덟 장 + 나가는 길 쪽으로 이어진 다리 판. 판 사이 틈으로, 판에 불이 들어올 때 빛이 바깥으로 흘러 닻 기둥에 닿는다 ── */
  const deckM = new THREE.MeshStandardMaterial({ color: 0x1d2026, metalness: .85, roughness: .38 }), deckM2 = new THREE.MeshStandardMaterial({ color: 0x2a2e36, metalness: .8, roughness: .5 });
  const deckY = .02, R0 = .62, R1 = 3.1, GAP = .05, SEAMS = [];
  const wedge = (a0, a1, r0, r1) => { const sh = new THREE.Shape(), n = 10;
    for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; const p = [Math.cos(a) * r1, Math.sin(a) * r1]; k ? sh.lineTo(...p) : sh.moveTo(...p); }
    for (let k = n; k >= 0; k--) { const a = a0 + (a1 - a0) * k / n; sh.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 4 }); g.rotateX(Math.PI / 2); g.translate(0, .12 + deckY, 0); return g; };
  for (let i = 0; i < 8; i++) { const a0 = i / 8 * Math.PI * 2 + GAP / R1, a1 = (i + 1) / 8 * Math.PI * 2 - GAP / R1;
    const m = new THREE.Mesh(wedge(a0, a1, R0, R1), deckM); scene.add(m);
    const inner = new THREE.Mesh(wedge(a0 + .08, a1 - .08, R1 - .55, R1 - .12), deckM2); inner.position.y = .035; scene.add(inner);       /* 가장자리 덧판: 발 디딤 */
    const sa = i / 8 * Math.PI * 2; SEAMS.push([Math.cos(sa), Math.sin(sa)]); }
  /* 나가는 길: 판 바깥에서 벽 틈까지 이어진 다리 판 (점점 좁아지고 낮아짐) */
  { const ex = [EXIT.x, EXIT.z], nx = [-EXIT.z, EXIT.x];
    for (let k = 0; k < 4; k++) { const d0 = R1 + .12 + k * 1.55, d1 = d0 + 1.45, w = .95 - k * .1, sh = new THREE.Shape();
      const P = (d, s) => [ex[0] * d + nx[0] * s, ex[1] * d + nx[1] * s]; sh.moveTo(...P(d0, -w)); sh.lineTo(...P(d1, -w * .96)); sh.lineTo(...P(d1, w * .96)); sh.lineTo(...P(d0, w));
      const g = new THREE.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2 }); g.rotateX(Math.PI / 2); g.translate(0, .1 + deckY - k * .03, 0); scene.add(new THREE.Mesh(g, k % 2 ? deckM2 : deckM)); } }
  /* ── 흑요석 벽이 감싸고, 나가는 길 하나 ── */
  const ea = Math.atan2(EXIT.z, EXIT.x), wallPts = []; for (let k = 0; k <= 14; k++) { const a = ea + .75 + k / 14 * (Math.PI * 2 - 1.5); wallPts.push([Math.cos(a) * 9, Math.sin(a) * 9]); }
  const wall = makeRidge('obsidian', wallPts, { uT: UT, seed: 5, float: false }); scene.add(wall);
  onProgress(.35);

  /* ── 기체 ── */
  const b = await buildShip(1, 1, 'ruby', { renderer, size: SHIP }); const ship = b.root, sm = ship.children[0];
  const sz = new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()), shipHalf = sz.y * ship.scale.x / 2, ENG = engineSpots(b.ship, sm, sz);
  stand.add(ship); ship.rotation.y = Math.atan2(-EXIT.x, -EXIT.z);      /* 머리가 나가는 길 쪽 (+Z가 꼬리) */
  base.updateMatrixWorld(true);
  /* 빛 조각으로 흩을 점들 (기체 기준 자리) */
  const LOC = []; { const v = new THREE.Vector3(), all = [], inv = new THREE.Matrix4().copy(ship.matrixWorld).invert();
    ship.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, st = Math.max(1, Math.floor(p.count / 140)); for (let i = 0; i < p.count; i += st) all.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); });
    for (let i = 0; i < 320; i++) LOC.push(all[Math.floor(Math.random() * all.length)]); }
  const shieldMat = filmMaterial(), shield = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), shieldMat); shield.renderOrder = 11; shield.visible = false; scene.add(shield);
  onProgress(.9);

  /* ── 상태 ── */
  const S = { mode: 'start', ph: 'wait', t0: 0, auto: true, bits: [], parts: [], shots: [], trail: [], shI: 0, shCrack: 0, hitN: 0, exitP: null };
  const shipWorld = () => { ship.updateMatrixWorld(true); return LOC.map(p => p.clone().applyMatrix4(ship.matrixWorld)); };
  function begin(mode) { S.mode = mode; S.ph = 'wait'; ship.visible = false; shield.visible = false; S.trail.length = 0; S.shots.length = 0; S.exitP = null; S.hitN = 0;
    stand.add(ship); ship.position.set(0, 0, 0); ship.rotation.set(0, Math.atan2(-EXIT.x, -EXIT.z), 0);
    document.querySelectorAll('#tour .seq').forEach(x => x.classList.toggle('on', x.dataset.id === mode)); $('#tip b').textContent = mode === 'start' ? '처음 시작' : '다시 살아나기'; $('#tip span').textContent = TIPS[mode]; $('#tip').hidden = false; }

  const tour = $('#tour');
  for (const [id, n] of [['start', '처음 시작'], ['respawn', '다시 살아나기']]) { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = n; bt.className = 'seq'; bt.dataset.id = id; bt.onclick = () => begin(id); tour.appendChild(bt); }
  { const sep = document.createElement('i'); sep.style.cssText = 'width:1px;align-self:stretch;background:rgba(185,255,74,.25);margin:0 4px'; tour.appendChild(sep); }
  const cam = { x: 0, z: 0, h: 10, H: 10, tilt: .72, T: .72, az: -.4 };
  for (const v of VIEWS) { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = v.name; bt.className = 'view';
    bt.onclick = () => { cam.H = v.h; cam.T = v.tilt; document.querySelectorAll('#tour .view').forEach(x => x.classList.toggle('on', x === bt)); }; tour.appendChild(bt); }
  tour.querySelector('.view').classList.add('on');
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .05, 1.2); bgDirty = true; }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 6, 90); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 6, 90); }, { passive: true });

  let Wd = 2, Hd = 2, bgDirty = true, bgN = 0;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); bgDirty = true;
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); bgMat.uniforms.uPx.value.set(2 / Wd, 2 / Hd); planetMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); floor.size(Wd, Hd); mag.userData.setPixel(Hd / 20); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  /* ── 한 걸음 ── */
  const v3 = new THREE.Vector3(), PADW = new THREE.Vector3(0, .6, 0);
  function bit(o) { S.bits.push(o); }
  function sparks(p, n, c, sp = 5) { for (let i = 0; i < n; i++) { const d = new THREE.Vector3().randomDirection().multiplyScalar(sp * rnd(.3, 1)); S.parts.push({ p: p.clone(), v: d, life: rnd(.3, .7), age: 0, r: rnd(.03, .07), k: 2, c }); } }
  function flash(p, r, c, life = .3) { S.parts.push({ p: p.clone(), v: new THREE.Vector3(), life, age: 0, r, k: 3, c, a: 1.3, grow: 1 }); }
  function step(t, dt) {
    const cycT = t % CYC, cycS = t - cycT;                        /* 지금 주기의 시작 */
    let magShip = null;
    /* 기다리다가 다음 주기 시작에 맞춰 출발 */
    if (S.ph === 'wait' && cycT < dt * 1.5) { S.ph = 'in'; S.t0 = cycS;
      ship.visible = false; const tgt = shipWorld();
      if (S.mode === 'start') {                                    /* 빛줄기를 타고 위에서 내려옴 */
        tgt.forEach((p, i) => bit({ x0: p.x + rnd(-.08, .08), y0: 26 + rnd(0, 10), z0: p.z + rnd(-.08, .08), p1: p, t0: S.t0 + .55 + Math.random() * .5, dur: .55 + Math.random() * .25, hue: i / tgt.length, sw: 0 }));
      } else {                                                     /* 둘레에서 소용돌이치며 모임 */
        tgt.forEach((p, i) => { const a = rnd(0, 6.28), r = rnd(2, 3.6); bit({ x0: p.x + Math.cos(a) * r, y0: p.y + rnd(-.4, 1.2), z0: p.z + Math.sin(a) * r, p1: p, t0: S.t0 + .2 + Math.random() * .6, dur: .8 + Math.random() * .3, hue: i / tgt.length, sw: rnd(1.2, 2.2) * (i % 2 ? 1 : -1) }); }); } }
    let e = t - S.t0;
    if (S.ph === 'in') {
      if (S.mode === 'start') { const k = clamp(e / .55, 0, 1), top = lerp(30, .4, ease(k)), I = e < 2.2 ? 1 : Math.max(0, 1 - (e - 2.2) / .6);   /* 하늘에서 내려오는 빛줄기 */
        for (let y = top; y < 30; y += 3) { const f = (y - top) / 30; glow.add(0, y, 0, 0, 3, 0, .12 * (1 - f * .5), 1.4, [.75, .88, 1.2], I * .45 * (1 - f * .7)); glow.add(0, y, 0, 0, 3, 0, .6, 3, [.35, .5, 1], I * .07 * (1 - f)); }
        if (k >= 1 && !S.touch) { S.touch = true; flash(PADW, 3, [.9, .95, 1.3], .45); sparks(PADW, 30, [.8, .9, 1.3], 6); }
        for (const A of ANC) { const tp = A.tp.getWorldPosition(v3); glow.add(tp.x, tp.y, tp.z, -tp.x * .8, .6 - tp.y, -tp.z * .8, .05, 2, [.7, .85, 1.3], I * .7 * (k >= 1 ? 1 : 0)); } }   /* 닻 기둥이 빛줄기를 붙잡음 */
      if (e > 1.95 && !ship.visible) { ship.visible = true; flash(PADW.clone().setY(1), 2.2, [1, 1, 1.3], .3); S.touch = false; }
      if (ship.visible) magShip = ship;
      if (ship.visible && e > LIFT + .1 && S.mode === 'respawn' && !shield.visible) { shield.visible = true; S.shI = 0; S.shCrack = 0; S.shT = t;
        for (let i = 0; i < 3; i++) { const a = ea + Math.PI + (i - 1) * .7; S.shots.push({ p: new THREE.Vector3(Math.cos(a) * 14, .9, Math.sin(a) * 14), at: t + .4 + i * .55 }); } }
      if (S.mode === 'start' && e > CYC + .9) { S.ph = 'out'; S.t0 = t; }
      if (S.mode === 'respawn' && e > CYC * 2 - .2) { S.ph = 'pop'; S.t0 = t; } }
    e = t - S.t0;
    if (S.ph === 'pop') { magShip = ship; S.shCrack = clamp(e / .35, 0, 1);
      if (e > .35 && shield.visible) { shield.visible = false; const c = ship.getWorldPosition(v3).clone(); flash(c, 1.6, [.9, .95, 1.2], .3); sparks(c, 28, [.85, .95, 1.3], 7); }
      if (e > .6) { S.ph = 'out'; S.t0 = t; } }
    e = t - S.t0;
    if (S.ph === 'out') {                                          /* 떠올라 숨 고르고 → 엔진이 터지며 나가는 길로 */
      if (!S.exitP) { ship.getWorldPosition(v3); scene.attach(ship); S.exitP = v3.clone(); S.exitY = ship.rotation.y; }
      const rise = ease(clamp(e / .7, 0, 1)), a = Math.max(0, e - 1.0), dist = a * a * 9 + a * 6;
      ship.position.set(S.exitP.x + EXIT.x * dist, S.exitP.y + rise * .9 + Math.sin(Math.min(1, e) * Math.PI) * .1, S.exitP.z + EXIT.z * dist);
      ship.rotation.z = e > .8 && e < 1 ? Math.sin((e - .8) / .2 * Math.PI) * .05 : 0;
      if (e > 1 && !S.boom) { S.boom = true; flash(ship.position.clone().addScaledVector(EXIT, -1), 1.2, [.5, .7, 1.4], .25); }
      if (e > 3.6) { S.boom = false; ship.visible = false; if (S.auto) begin(S.mode === 'start' ? 'respawn' : 'start'); } }
    mag.userData.update(t, magShip, shipHalf);
    if (magShip && S.ph !== 'out') { /* 판이 기체를 잡고 있음 */ }
    pad.userData.update(t);
    /* 비눗방울 막: 기체를 감싸고, 탄이 맞으면 물결, 끝엔 금이 가며 깨짐 */
    if (shield.visible) { ship.getWorldPosition(v3); shield.position.copy(v3); shield.scale.setScalar(1.3);
      S.shI += (1 - S.shI) * Math.min(1, dt * 4); const blink = S.ph === 'in' && t - S.shT > CYC * 2 - 1.6 ? .55 + .45 * Math.sin(t * 22) : 1;
      shieldMat.uniforms.uI.value = S.shI * blink * .3; shieldMat.uniforms.uT.value = t; shieldMat.uniforms.uCrack.value = S.shCrack; shieldMat.uniforms.uArc.value = -1; }
    /* 막을 향해 날아오는 적 탄 */
    for (let i = S.shots.length - 1; i >= 0; i--) { const s = S.shots[i]; if (t < s.at) continue; const c = ship.getWorldPosition(v3).clone(), d = c.clone().sub(s.p), L = d.length();
      if (L < 1.35 && shield.visible) { const n = d.normalize().negate(); shieldMat.uniforms.uHit.value[S.hitN++ % 6].set(n.x, n.y, n.z, t); flash(s.p, 1, [1.3, .45, .2], .2); sparks(s.p, 10, [1.3, .5, .2], 5); S.shots.splice(i, 1); continue; }
      s.p.addScaledVector(d.normalize(), dt * 12); glow.add(s.p.x, s.p.y, s.p.z, -d.x * .4, -d.y * .4, -d.z * .4, .2, 0, [1, .22, .12], 1, i); }
    /* 빛 조각 */
    for (let i = S.bits.length - 1; i >= 0; i--) { const q = S.bits[i], k = (t - q.t0) / q.dur; if (k >= 1) { S.bits.splice(i, 1); continue; } if (k < 0) continue;
      const e2 = 1 - Math.pow(1 - k, 3), sw = (1 - e2) * q.sw; let x = lerp(q.x0, q.p1.x, e2), z = lerp(q.z0, q.p1.z, e2); const y = lerp(q.y0, q.p1.y, e2);
      if (sw) { const dx = x - q.p1.x, dz = z - q.p1.z, cs = Math.cos(sw), sn = Math.sin(sw); x = q.p1.x + dx * cs - dz * sn; z = q.p1.z + dx * sn + dz * cs; }
      const hc = [Math.abs(Math.sin(q.hue * 6.28)) * .4 + .6, Math.abs(Math.sin(q.hue * 6.28 + 2)) * .4 + .6, Math.abs(Math.sin(q.hue * 6.28 + 4)) * .4 + .7];
      { let tx = (q.px ?? x) - x, ty = (q.py ?? y) - y, tz = (q.pz ?? z) - z; const tl = Math.hypot(tx, ty, tz), cap = .35; if (tl > cap) { tx *= cap / tl; ty *= cap / tl; tz *= cap / tl; } glow.add(x, y, z, tx, ty, tz, .04, 2, hc, .5 + e2 * .5); } q.px = x; q.py = y; q.pz = z; }
    /* 불꽃 */
    for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.age += dt; if (p.age > p.life) { S.parts.splice(i, 1); continue; } p.v.multiplyScalar(Math.exp(-2 * dt)); p.p.addScaledVector(p.v, dt);
      const k = p.age / p.life; glow.add(p.p.x, p.p.y, p.p.z, -p.v.x * .03, -p.v.y * .03, -p.v.z * .03, p.grow ? p.r * (.6 + k) : p.r, p.k, p.c, (p.a || 1) * (1 - k) * (p.grow ? 1 - k : 1), i); }
    /* 엔진 불꽃 + 꼬리 */
    if (ship.visible) { ship.updateMatrixWorld(true); const fw = new THREE.Vector3(0, 0, -1).transformDirection(ship.matrixWorld), out = S.ph === 'out', pw = out ? 1 + Math.min(3, Math.max(0, t - S.t0 - 1) * 2) : .5;
      for (const p of ENG) { v3.copy(p).applyMatrix4(sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, -fw.x * .5 * pw, -fw.y * .5 * pw, -fw.z * .5 * pw, .1 + .03 * pw, 1, [.4, .6, 1.4], .9); glow.add(v3.x, v3.y, v3.z, -fw.x * .35 * pw, 0, -fw.z * .35 * pw, .28 * pw, 3, [.25, .45, 1.3], .6); }
      if (out) { const c = ship.position; const l = S.trail[0]; if (!l || c.distanceTo(l) > .3) { S.trail.unshift(c.clone().addScaledVector(fw, -1)); if (S.trail.length > 40) S.trail.pop(); } } }
    for (let i = 0; i < S.trail.length - 1; i++) { const a = S.trail[i], c = S.trail[i + 1], k = 1 - i / S.trail.length; glow.add(a.x, a.y, a.z, c.x - a.x, c.y - a.y, c.z - a.z, .08 + .05 * k, 3, [.3, .5, 1.3], k * k); }
    /* 닻 기둥 끝: 평소엔 꺼져 있고, 판에 불이 들어올 때만 같이 빛남 */
    const lit = Math.exp(-Math.pow((cycT - LIFT) / .35, 2)); for (const A of ANC) { const tp = A.tp.getWorldPosition(v3); glow.add(tp.x, tp.y, tp.z, 0, 0, 0, .32, 3, [.45, .7, 1.2], lit * .45); }
    /* 판에 불이 다 들어오는 순간, 틈을 따라 빛이 바깥으로 흘러 닻 기둥에 닿음 */
    { const q = (cycT - LIFT + .15) / .5; if (q > 0 && q < 1.4) for (const [cx, cz] of SEAMS) { const r = lerp(R0, R1, Math.min(1, q)), r0 = Math.max(R0, r - .9), I = q < 1 ? 1 : 1 - (q - 1) / .4;
      glow.add(cx * r0, deckY + .14, cz * r0, cx * (r - r0), 0, cz * (r - r0), .025, 2, [.45, .7, 1.3], I * .9); glow.add(cx * r, deckY + .15, cz * r, 0, 0, 0, .12, 3, [.5, .75, 1.3], I * .6); } }
    updateRidge(wall, t, dt, glow);
  }

  let last = performance.now(), t = 0;
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; UT.value = t;
    glow.begin(); step(t, dt); glow.end(); glow.uT.value = t;
    const sx = ship.visible ? ship.getWorldPosition(v3).x : 0, szz = ship.visible ? v3.z : 0; floor.update(t, dt, sx, szz);
    const fx = S.ph === 'out' ? lerp(0, sx, .35) : 0, fz = S.ph === 'out' ? lerp(0, szz, .35) : 0;
    cam.x += (fx - cam.x) * Math.min(1, dt * 2); cam.z += (fz - cam.z) * Math.min(1, dt * 2); cam.h += (cam.H - cam.h) * Math.min(1, dt * 2.5); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 2.5);
    const back = cam.h * Math.sin(cam.tilt), hh = cam.h * Math.cos(cam.tilt);
    camera.position.set(cam.x + Math.sin(cam.az) * back, hh, cam.z + Math.cos(cam.az) * back); camera.lookAt(cam.x, .6, cam.z);
    planetMat.uniforms.uR.value = 450 / (cam.h + 400); planetMat.uniforms.uT.value = t; planetMat.uniforms.uYaw.value = PL.yaw0 + t * .006 + cam.az * .3;
    if (perf.st.bg && (bgDirty || ++bgN % 20 === 0)) { renderer.setRenderTarget(skyRT); renderer.render(bgS, bgCam); bgDirty = false; }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); if (perf.st.bg) renderer.render(bgScene, bgCam); floor.render(camera, bloom.scene); renderer.clearDepth(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt); } catch (err) { console.error('[기지 보기]', err); } });
  onProgress(1);
  begin('start');
  window.__bv = { S, cam, begin, get t() { return t; } };
}
