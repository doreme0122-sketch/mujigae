/* 넓은 맵 시험판 — 돌아다니며 키우고, 준비되면 보스에게
   위에서 내려다본 뷰. 화면 위쪽 = -Z, 오른쪽 = +X, 바닥 평면 XZ. 카메라가 나를 따라온다.
   · 잡몹 무리: 약하고 느린 탄만 쏜다. 잡으면 빛 알갱이 → 모이면 레벨업 → 강화 셋 중 하나를 고른다.
   · 특별 구역(빛 기둥): 강한 적이 신호를 보내고 빠른 탄을 쏜다. 잡으면 새 기본탄 결정이 떨어진다.
   · 보스 문: 들어가면 보스 경기장으로 옮겨 가 반사 시험판과 같은 보스전.
   · 반사·연속 완벽 반사·가까울수록 세게·쏘는 동안 느려짐은 반사 시험판과 같다.
   · 이 판에서 얻은 레벨과 기본탄은 이 판에서만 쓴다(끝나면 처음부터). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11140030';
import * as Q from '../core/quality.js?v=11140030';
import { buildShip, engineSpots } from '../core/ships/build.js?v=11140030';
import { planetShader } from '../core/planet.js?v=11140030';
import { planetFor } from '../data/planets.js?v=11140030';
import { makeGlow } from '../preview/glow.js?v=11140030';
import { filmMaterial, ringMaterial, crystalMaterial } from '../preview/fxmat.js?v=11140030';

const M = new URL('../../assets/models/', import.meta.url).href;
const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const angD = a => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;   /* 가장 짧게 도는 각 */
const rnd = (a, b) => a + Math.random() * (b - a);

/* ───── 손맛 숫자 ───── */
const T0 = {
  move: 9, fireMove: .6, turn: 14, turnFire: 4.5,
  fireEvery: .12, shotSp: 21, shotDmg: .6, guns: 2, shot: 'twin',
  foeSp: 15.5, sig0: .9, sigMin: .3, sigStep: .035,
  win: .18, whiff: .38, shieldR: 1.35, arcCos: .5,
  lightSp: 28, lightDmg: 14, chainK: .25, chainMax: 6, nearK: .6, nearIn: 3.5, nearOut: 11, assist: .5,
  weakK: .6, weakDmg: 2, hitHp: .2, hpMax: 1,
  magnet: 3.6,
  bossHp: 320
};
let T = { ...T0 };
const MAP = { x: 38, z: 25 };                       /* 넓은 맵 (반사 경기장의 서너 배) */
const ARENA = { x: 76, z: 0, hx: 12.6, hz: 7 };     /* 보스 문 너머의 보스 경기장 */
const ZONE = { x: -22, z: -14, r: 7 };              /* 특별 구역 */
const GATE = { x: 33, z: 3 };                       /* 보스 문 */
const FOE_C = [1, .22, .12];
let foeK = 1;

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .5, 400);
  const CAM = new THREE.Vector3(0, 29.5, 7.3), LOOK = new THREE.Vector3(0, 0, -.45), camT = new THREE.Vector3();
  const bloom = makeBloom(renderer, { samples: Q.tier().aa });

  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.position.set(-6, 14, -4); scene.add(sun);
  const lavaL = new THREE.DirectionalLight(0xff7a3c, 1.6); lavaL.position.set(4, -6, 3); scene.add(lavaL);
  const fill = new THREE.DirectionalLight(0x9fb8ff, .7); fill.position.set(6, 6, 8); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x8090b0, 0x3a1c10, .55));

  /* 아래로 보이는 행성 (메인 화면과 같은 계산), 반 크기로 그려 붙임 */
  const P = planetFor(1), U = v => ({ value: v });
  const skyMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uRes: U(new THREE.Vector2(1, 1)), uT: U(0), uYaw: U(P.yaw0), uPitch: U(P.tilt), uS: U(0), uFade: U(.5), uR: U(1.9), uC: U(new THREE.Vector2(1.7, -1.35)),
      uSun: U(new THREE.Vector3(...P.sun)), uDetail: U(1), uSB: U(new THREE.Vector4(0, 0, 9, 0)), uSB2: U(new THREE.Vector4(1, 0, 1, 1)), uSC: U(new THREE.Vector4(0, 0, 9, 0)), uSC2: U(new THREE.Vector4(1, 0, 1, 1)), uStarK: U(1) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: planetShader(P, { three: true }) });
  const skyScene = new THREE.Scene(); skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat));
  const skyRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const bgMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { t: U(skyRT.texture) },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'precision highp float;varying vec2 vU;uniform sampler2D t;void main(){gl_FragColor=vec4(texture2D(t,vU).rgb,1.);}' });
  const bgScene = new THREE.Scene(); bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));
  const bgCam = new THREE.Camera();
  const glow = makeGlow(); scene.add(glow.mesh);

  /* ───── 모델 ───── */
  onProgress(.05);
  const loader = new GLTFLoader(), loadM = f => loader.loadAsync(M + f);
  let got = 0; const tick = r => (onProgress(.1 + .8 * (++got / 6)), r);
  const [ship, bossG, ...foeG] = await Promise.all([
    buildShip(1, 1, 'ruby', { renderer, size: 2.0 }).then(tick), loadM('s1_boss.glb').then(tick),
    loadM('s1_a.glb').then(tick), loadM('s1_b.glb').then(tick), loadM('s1_c.glb').then(tick), loadM('s1_elite.glb').then(tick)]);

  const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const shipModel = ship.root.children[0];
  const shipSz = new THREE.Box3().setFromObject(shipModel).getSize(new THREE.Vector3());
  const ENG = engineSpots(ship.ship, shipModel, shipSz);

  /* 적 모델: 앞(+Z)이 나를 보게 길이 맞춰 둔 원본 */
  const KINDS = foeG.map((g, i) => { const m = g.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); h.scale.setScalar((i === 3 ? 3.4 : 2.2) / Math.max(s.x, s.z)); return h; });

  /* 보스 */
  const boss = new THREE.Group(), bossBody = new THREE.Group(); boss.add(bossBody); scene.add(boss); boss.visible = false;
  const BOSS_LEN = 5.2; let HL = 2.6, HW = .8;
  { const m = bossG.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); const k = BOSS_LEN / Math.max(s.x, s.z); h.scale.setScalar(k); h.rotation.y = Math.PI; bossBody.add(h);
    HL = s.z * k / 2; HW = s.x * k / 2 + .3; }
  const bossMats = []; bossBody.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); bossMats.push(o.material); } });

  /* 내 방패 */
  const shieldMat = filmMaterial(); shieldMat.uniforms.uArc.value = .4;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), shieldMat); shield.renderOrder = 11; scene.add(shield);
  const shieldHits = shieldMat.uniforms.uHit.value; let hitSlot = 0;

  /* 새 기본탄 결정 (엘리트가 떨어뜨림): 천천히 도는 작은 결정 */
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.55), crystalMaterial()); gem.visible = false; scene.add(gem);

  /* 파편 */
  const DEB = []; { const g = new THREE.TetrahedronGeometry(.13);
    for (let i = 0; i < 60; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x3a3c44, metalness: .8, roughness: .35, emissive: new THREE.Color(1, .4, .12), emissiveIntensity: 0 });
      const o = new THREE.Mesh(g, m); o.visible = false; scene.add(o); DEB.push({ o, m, life: 0, age: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0 }); } }
  let debI = 0;
  const debris = (x, z, nx, nz, n, sp = 7) => { for (let i = 0; i < n; i++) { const d = DEB[debI++ % DEB.length], a = Math.atan2(nz, nx) + (Math.random() - .5) * 1.8, s = sp * (.35 + Math.random() * .8);
    Object.assign(d, { life: .7 + Math.random() * .6, age: 0, vx: Math.cos(a) * s, vy: (Math.random() - .2) * 3, vz: Math.sin(a) * s, sx: (Math.random() - .5) * 20, sy: (Math.random() - .5) * 20 });
    d.o.position.set(x, .4, z); d.o.scale.setScalar(.6 + Math.random() * 1.1); d.o.visible = true; } };

  /* ───── 상태 ───── */
  const S = {
    t: 0, ts: 1, stopT: 0, slowT: 0, shakeA: 0, run: false, over: false, pause: false, mode: 'field',
    me: { x: -30, z: 14, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kx: 0, kz: 0, yaw: -Math.PI / 4, hx: 0, hz: -1 },
    boss: { x: 0, z: 0, hp: T0.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.6, sig: T0.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: -Math.PI / 2, dead: true, drift: 0 },
    stick: { on: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 },
    fire: { on: false, id: -1, cd: 0, ox: 0, oy: 0, ax: 1, az: 0 },
    sh: { on: false, id: -1, ox: 0, oy: 0, fx: 1, fz: 0, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0 },
    foes: [], fb: [], mb: [], lb: [], parts: [], rings: [], orbs: [], chain: 0,
    lv: 1, xp: 0, need: 8, picks: {}, kills: 0, zoneDone: false, gemOn: false, gateAsked: 0
  };

  /* ───── 빛 알갱이 ───── */
  const P3 = (x, y, z, vx, vy, vz, life, r, k, c, o = {}) => S.parts.push({ x, y, z, vx, vy, vz, life, age: 0, r, k, c, drag: o.drag ?? 2, grow: o.grow ?? 0, a: o.a ?? 1, tail: o.tail ?? .04, to: o.to || null });
  const spark = (x, z, nx, nz, c, n, sp, spread = 2.2) => { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (Math.random() - .5) * spread, s = sp * (.4 + Math.random());
      P3(x, .35, z, Math.cos(a) * s, (Math.random() - .3) * 4, Math.sin(a) * s, .2 + Math.random() * .25, .05, 2, c, { drag: 5, tail: .05 }); } };
  const flash = (x, z, r, c, life = .12) => P3(x, .4, z, 0, 0, 0, life, r, 3, c, { drag: 0, grow: 3 });
  const ringGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const ring = (x, z, o) => { const m = ringMaterial(), mesh = new THREE.Mesh(ringGeo, m); mesh.position.set(x, .25, z); mesh.renderOrder = 12; scene.add(mesh);
    m.uniforms.uSpec.value = o.spec ? 1 : 0; if (o.c) m.uniforms.uC.value.setRGB(...o.c);
    S.rings.push({ mesh, m, t0: S.t, dur: o.dur || .5, r0: o.r0 ?? .2, r1: o.r1 ?? 3, w: o.w ?? .2, I: o.I ?? 1 }); };
  const shake = a => { S.shakeA = Math.max(S.shakeA, a); };
  const hitStop = (sec, ts = .05) => { S.stopT = Math.max(S.stopT, sec); S.ts = ts; };
  const explode = (x, z, big = 1) => {
    flash(x, z, 1.3 * big, [2, 1.6, 1.3], .16);
    for (let i = 0; i < 16 * big; i++) { const a = Math.random() * 6.283, s = (1 + Math.random() * 3.5) * big;
      P3(x, .4, z, Math.cos(a) * s, Math.random() * 2, Math.sin(a) * s, .5 + Math.random() * .6, (.35 + Math.random() * .45) * big, 3, Math.random() < .5 ? [1.4, .55, .16] : [1.1, .3, .08], { drag: 3.2, grow: -.4 }); }
    for (let i = 0; i < 22 * big; i++) { const a = Math.random() * 6.283, s = (6 + Math.random() * 12) * big;
      P3(x, .4, z, Math.cos(a) * s, Math.random() * 6, Math.sin(a) * s, .35 + Math.random() * .5, .06, 2, [1, .65, .3], { drag: 3.5, tail: .06 }); }
    ring(x, z, { r0: .3, r1: 2.3 * big, dur: .45, w: .2, I: .75, c: [1, .34, .08] }); debris(x, z, 0, 1, Math.round(5 * big), 6 * big); shake(.14 * big); };

  const tagBox = $('#tags'), pv = new THREE.Vector3();
  function tag(x, z, text, cls = '') { pv.set(x, .5, z).project(camera); const el = document.createElement('div'); el.className = 'tag ' + cls; el.textContent = text;
    el.style.left = ((pv.x * .5 + .5) * innerWidth) + 'px'; el.style.top = ((-pv.y * .5 + .5) * innerHeight) + 'px'; tagBox.appendChild(el); setTimeout(() => el.remove(), 1100); }

  /* ───── 적 ───── */
  /* 잡몹 무리: 무리 중심은 제자리 근처를 천천히 떠돌고, 나를 보면 일정 거리에서 맴돌며 느린 탄을 쏜다 */
  const PACKS = [];
  const SPAWNS = [[-8, -12], [6, 12], [-14, 10], [12, -14], [20, 2], [-30, -2], [-4, 2], [24, 16], [26, -12], [-24, 18]];
  function spawnFoe(kind, x, z, pack) {
    const obj = KINDS[kind].clone(true);
    obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); } });
    scene.add(obj);
    const elite = kind === 3;
    const f = { obj, kind, x, z, vx: 0, vz: 0, yaw: rnd(-3, 3), hp: elite ? 40 : 2.6, max: elite ? 40 : 2.6, r: elite ? 1.5 : 1, flash: 0, alive: true, pack, seed: Math.random() * 10,
      cd: rnd(1.5, 3.5), orbit: rnd(0, 6.28), elite, phase: 'idle', pt: 0, wait: 1.4, sig: .75, warm: 0, crouch: 0, recoil: 0, kx: 0, kz: 0, bank: 0 };
    f.mats = []; obj.traverse(o => { if (o.isMesh) f.mats.push(o.material); });
    S.foes.push(f); return f;
  }
  function spawnPack(i) {
    let [cx, cz] = SPAWNS[i % SPAWNS.length];
    const pk = { cx, cz, hx: cx, hz: cz, n: 0, seed: Math.random() * 10, dead: 0, respawn: 0, i };
    const n = 3 + (Math.random() < .5 ? 1 : 0), kind = i % 3;
    for (let j = 0; j < n; j++) { spawnFoe(Math.random() < .25 ? (kind + 1) % 3 : kind, cx + rnd(-2, 2), cz + rnd(-2, 2), pk); pk.n++; }
    PACKS[i] = pk;
  }
  function spawnElite() { const f = spawnFoe(3, ZONE.x, ZONE.z, null); f.home = { x: ZONE.x, z: ZONE.z }; f.yaw = 0; S.elite = f; }

  /* 맞힌 대상 찾기: 원(잡몹·엘리트) 또는 길쭉한 타원(보스) */
  function bossTest(x, z, r) {
    const B = S.boss; if (B.dead || S.mode !== 'boss') return null;
    const fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), dx = x - B.x, dz = z - B.z;
    const u = dx * fx + dz * fz, w = dx * fz - dz * fx;
    return (u / (HL + r)) ** 2 + (w / (HW + r)) ** 2 < 1 ? { u, w, fx, fz } : null;
  }
  function hitAny(x, z, r) {
    if (bossTest(x, z, r)) return S.boss;
    for (const f of S.foes) if (f.alive && (f.x - x) ** 2 + (f.z - z) ** 2 < (f.r + r) ** 2) return f;
    return null;
  }

  function foeHit(f, dmg, x, z, vx, vz, heavy) {
    if (f === S.boss) return bossHit(dmg, x, z, vx, vz, heavy);
    if (!f.alive) return;
    f.hp -= dmg; const sp = Math.hypot(vx, vz) || 1, nx = vx / sp, nz = vz / sp;
    f.flash = heavy ? 1 : Math.max(f.flash, .4);
    spark(x, z, -nx, -nz, [1, .85, .6], heavy ? 10 : 3, heavy ? 10 : 7);
    if (heavy) { f.kx += nx * 1.4; f.kz += nz * 1.4; f.bank += clamp(nx * .8, -.6, .6); flash(x, z, .7, [1.6, 1.5, 1.4], .12); debris(x, z, -nx, -nz, 4, 7); shake(.12); }
    else flash(x, z, .22, [1.2, 1.1, 1], .06);
    if (f.hp <= 0) foeDie(f);
  }
  function foeDie(f) {
    f.alive = false; f.obj.visible = false; S.kills++;
    explode(f.x, f.z, f.elite ? 1.6 : .7);
    const n = f.elite ? 14 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rnd(2, 5); S.orbs.push({ x: f.x, z: f.z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, v: 1, age: 0, pull: false }); }
    if (f.pack) { f.pack.dead++; if (f.pack.dead >= f.pack.n) f.pack.respawn = S.t + 14; }
    if (f.elite) { S.zoneDone = true; S.gemOn = true; gem.visible = true; gem.position.set(f.x, .6, f.z); tag(f.x, f.z - 1.4, '새 기본탄 결정이 떨어졌어요', 'big'); }
  }

  /* 신호 쏘기 (엘리트·보스 공용): 빛을 모으고 움츠렸다가 빠른 탄 */
  function chargeFx(mx, mz, k, e, getPos) {
    if (Math.random() < .7) { const a = Math.random() * 6.283, r = 1.4 + Math.random() * .8, sx = mx + Math.cos(a) * r, sz = mz + Math.sin(a) * r, life = .22 + Math.random() * .12;
      P3(sx, .4, sz, 0, 0, 0, life, .045, 2, [1, .55 + Math.random() * .3, .3], { tail: .05, to: (p) => { const q = p.age / p.life, w = q * q; const [x2, z2] = getPos();
        p.x = sx + (x2 - sx) * w; p.z = sz + (z2 - sz) * w; return 'pos'; } }); }
    const fl = k > .82 ? .75 + .25 * Math.sin(S.t * 70) : 1;          /* 쏘기 바로 전: 떨리듯 깜빡인다 */
    glow.add(mx, .45, mz, 0, 0, 0, (.08 + .22 * e) * fl, 0, FOE_C, 1, 7);
    glow.add(mx, .45, mz, 0, 0, 0, (.3 + 1.1 * e) * fl, 3, [1.2, .35, .12], .55 + .45 * e);
  }
  function shootAt(mx, mz, sp, r = .28) { const a = Math.atan2(S.me.z - mz, S.me.x - mx);
    S.fb.push({ x: mx, z: mz, vx: Math.cos(a) * sp * foeK, vz: Math.sin(a) * sp * foeK, r, age: 0 });
    flash(mx, mz, .8, [1.6, .6, .3], .1); spark(mx, mz, Math.cos(a), Math.sin(a), [1, .5, .2], 5, 9, .9); }

  function foesTick(dt) {
    const m = S.me, t = S.t;
    for (const f of S.foes) { if (!f.alive) continue;
      const dx = m.x - f.x, dz = m.z - f.z, d = Math.hypot(dx, dz);
      let tx, tz, sp;
      if (f.elite) {                                      /* 엘리트: 구역 안에서 맴돌고, 신호를 보내고 빠른 탄 */
        const aggro = d < 15 && S.mode === 'field';
        f.orbit += dt * .35; tx = f.home.x + Math.cos(f.orbit) * 2.2; tz = f.home.z + Math.sin(f.orbit) * 1.6; sp = 2.5;
        if (aggro) {
          if (f.phase === 'idle') { f.pt += dt; f.crouch += (0 - f.crouch) * Math.min(1, dt * 5); f.warm *= Math.pow(.05, dt); if (f.pt > f.wait) { f.phase = 'charge'; f.pt = 0; } }
          else { f.pt += dt; const k = Math.min(1, f.pt / f.sig), e = k * k * (3 - 2 * k); f.crouch = e; f.warm = e; sp = .4;
            const mz = () => [f.x + Math.sin(f.yaw) * 1.6, f.z + Math.cos(f.yaw) * 1.6], [mx, mzz] = mz(); chargeFx(mx, mzz, k, e, mz);
            if (k >= 1) { shootAt(mx, mzz, 13.5); f.recoil = .5; f.crouch = 0; f.phase = 'idle'; f.pt = 0; f.wait = rnd(1.2, 1.8); f.sig = Math.max(.42, f.sig - .02); shake(.05); } }
        } else { f.phase = 'idle'; f.pt = 0; f.warm *= Math.pow(.05, dt); f.crouch *= Math.pow(.05, dt); }
      } else {                                            /* 잡몹: 무리 중심 근처를 떠돌다가, 보이면 거리를 두고 맴돈다 */
        const pk = f.pack, aggro = d < 13 && S.mode === 'field';
        pk.cx = pk.hx + Math.sin(t * .13 + pk.seed) * 4; pk.cz = pk.hz + Math.cos(t * .11 + pk.seed) * 3;
        if (aggro) { f.orbit += dt * (.45 + (f.seed % 1) * .3); const R = 6.5 + (f.seed % 1.5); tx = m.x - Math.cos(f.orbit) * R; tz = m.z - Math.sin(f.orbit) * R; sp = 4.2;
          f.cd -= dt; if (f.cd <= 0 && d < 14) { f.cd = rnd(2.6, 4.2); shootAt(f.x + Math.sin(f.yaw) * .9, f.z + Math.cos(f.yaw) * .9, 7, .22); } }
        else { const a = t * .4 + f.seed; tx = pk.cx + Math.cos(a) * 2.4; tz = pk.cz + Math.sin(a * 1.3) * 2; sp = 2.2; }
      }
      /* 움직임: 목표 쪽으로 가속, 관성 */
      const ddx = tx - f.x, ddz = tz - f.z, l = Math.hypot(ddx, ddz) || 1, want = Math.min(sp, l * 1.5);
      f.vx += (ddx / l * want - f.vx) * Math.min(1, dt * 2.5); f.vz += (ddz / l * want - f.vz) * Math.min(1, dt * 2.5);
      f.kx *= Math.pow(.02, dt); f.kz *= Math.pow(.02, dt); f.bank *= Math.pow(.03, dt); f.recoil *= Math.pow(.008, dt);
      f.x += (f.vx + f.kx * 3) * dt; f.z += (f.vz + f.kz * 3) * dt;
      f.x = clamp(f.x, -MAP.x + 1, MAP.x - 1); f.z = clamp(f.z, -MAP.z + 1, MAP.z - 1);
      /* 고개: 나를 보면 나를, 아니면 가는 쪽을 */
      const look = (f.elite ? d < 15 : d < 13) ? Math.atan2(dx, dz) : Math.atan2(f.vx, f.vz);
      const dy = angD(look - f.yaw); f.yaw += clamp(dy * Math.min(1, dt * 4), -dt * 4, dt * 4);
      const lat = f.vx * Math.cos(f.yaw) - f.vz * Math.sin(f.yaw);
      f.obj.position.set(f.x - Math.sin(f.yaw) * f.recoil, .2 - (f.crouch || 0) * .25, f.z - Math.cos(f.yaw) * f.recoil);
      f.obj.rotation.set((f.crouch || 0) * .15 - f.recoil * .3, f.yaw, -lat * .08 + f.bank + Math.sin(t * 1.1 + f.seed) * .05, 'YXZ');
      f.flash *= Math.pow(.0005, dt);
      for (const mt of f.mats) { mt.emissive.setRGB(f.flash + .45 * f.warm, f.flash * .95 + .12 * f.warm, f.flash * .9 + .04 * f.warm); mt.emissiveIntensity = 1.6; }
      const ex = f.x - Math.sin(f.yaw) * f.r * 1.05, ez = f.z - Math.cos(f.yaw) * f.r * 1.05;
      glow.add(ex, .25, ez, -Math.sin(f.yaw) * .5, 0, -Math.cos(f.yaw) * .5, .32 * f.r, 3, [1.4, .5, .15], .9);
    }
    /* 무리 다시 생기기: 나와 멀리 떨어진 자리에 */
    for (const pk of PACKS) if (pk && pk.respawn && t > pk.respawn && S.mode === 'field') {
      for (let k = 0; k < 6; k++) { const j = Math.floor(Math.random() * SPAWNS.length), [sx, sz] = SPAWNS[j]; if (Math.hypot(sx - m.x, sz - m.z) > 16) { SPAWNS.push(SPAWNS.splice(j, 1)[0]); break; } }
      S.foes = S.foes.filter(f => { if (f.pack === pk) { scene.remove(f.obj); return false; } return true; }); spawnPack(pk.i); }
  }

  /* ───── 보스 (반사 시험판과 같은 몸짓) ───── */
  const BX = ARENA.x + 5.6, BZ = ARENA.z - .6;
  const bossDir = (x, z) => { let tx = null, tz = null, bd = 1e9;   /* 가장 가까운 적 쪽 (고개·기본 방향) */
    if (S.mode === 'boss' && !S.boss.dead) { tx = S.boss.x; tz = S.boss.z; }
    else for (const f of S.foes) { if (!f.alive) continue; const d = (f.x - x) ** 2 + (f.z - z) ** 2; if (d < bd && d < 16 * 16) { bd = d; tx = f.x; tz = f.z; } }
    if (tx === null) return null; const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const muzzle = (off = 0) => { const b = S.boss, a = b.yaw, f = BOSS_LEN * .44; return [b.x + Math.sin(a) * f + Math.cos(a) * off, b.z + Math.cos(a) * f - Math.sin(a) * off]; };
  function bossHit(dmg, x, z, vx, vz, heavy) {
    const b = S.boss; if (b.dead) return;
    b.hp -= dmg; const sp = Math.hypot(vx, vz) || 1, nx = vx / sp, nz = vz / sp;
    if (heavy) { const lat = nx * Math.cos(b.yaw) - nz * Math.sin(b.yaw), fwd = nx * Math.sin(b.yaw) + nz * Math.cos(b.yaw);
      b.flash = 1; b.kx += nx * 1.1; b.kz += nz * 1.1; b.bank += clamp(lat * .9, -.6, .6); b.pitch -= fwd * .35;
      spark(x, z, -nx, -nz, [1, .9, .7], 14, 11); spark(x, z, nx, nz, [1, .55, .25], 6, 6, 1.2);
      flash(x, z, .9, [1.8, 1.6, 1.5], .14); debris(x, z, -nx, -nz, 7, 8); shake(.22); hitStop(.06, .08); }
    else { b.flash = Math.max(b.flash, .35); spark(x, z, -nx, -nz, [1, .85, .6], 3, 7); flash(x, z, .25, [1.2, 1.1, 1], .07); }
    if (b.hp <= 0) { b.dead = true; b.hp = 0; boss.visible = false; S.fb.length = 0; explode(b.x, b.z, 2.4); S.slowT = .9; S.ts = .25; setTimeout(() => endGame(true), 1500); }
  }
  function bossTick(dt) {
    const b = S.boss, t = S.t; if (b.dead || S.mode !== 'boss') return;
    const hold = b.phase === 'charge' ? .15 : 1;
    b.drift += dt * hold; const tz = BZ + Math.sin(b.drift * .42) * 2.7;
    const oz = b.z; b.z += (tz - b.z) * Math.min(1, dt * 1.8);
    const want = Math.atan2(S.me.x - b.x, S.me.z - b.z), dYaw = angD(want - b.yaw);
    b.yaw += clamp(dYaw * Math.min(1, dt * (b.phase === 'charge' ? 5 : 2.2)), -dt * 2.6, dt * 2.6);
    b.kx *= Math.pow(.02, dt); b.kz *= Math.pow(.02, dt); b.bank *= Math.pow(.03, dt); b.pitch *= Math.pow(.03, dt); b.recoil *= Math.pow(.008, dt); b.flash *= Math.pow(.0006, dt);
    const vz = (b.z - oz) / Math.max(dt, 1e-4), lean = clamp(vz * Math.sin(b.yaw) * .05, -.25, .25);
    if (b.phase === 'idle') { b.pt += dt; b.crouch += (0 - b.crouch) * Math.min(1, dt * 5); b.warm *= Math.pow(.05, dt);
      if (b.pt > b.wait) { b.phase = 'charge'; b.pt = 0; b.twin = b.sig < .56 && Math.random() < .38; } }
    else { b.pt += dt; const k = Math.min(1, b.pt / b.sig), e = k * k * (3 - 2 * k); b.crouch = e; b.warm = e;
      const offs = b.twin ? [-.42, .42] : [0];
      for (const off of offs) { const [mx, mz] = muzzle(off); chargeFx(mx, mz, k, e, () => muzzle(off)); }
      if (k >= 1) { for (const off of offs) { const [mx, mz] = muzzle(off); shootAt(mx, mz, T.foeSp); }
        b.recoil = .55; b.crouch = 0; b.warm = .4; shake(.06); b.phase = 'idle'; b.pt = 0; b.wait = 1.05 + Math.random() * .55; b.sig = Math.max(T.sigMin, b.sig - T.sigStep); } }
    boss.position.set(b.x + b.kx - Math.sin(b.yaw) * b.recoil, .25 - b.crouch * .3, b.z + b.kz - Math.cos(b.yaw) * b.recoil);
    boss.rotation.set(0, b.yaw, 0);
    bossBody.rotation.set(b.crouch * .16 - b.recoil * .35 + b.pitch + Math.sin(t * 1.3) * .03, 0, lean + b.bank + Math.sin(t * .9) * .04);
    for (const mt of bossMats) { mt.emissive.setRGB(b.flash + .45 * b.warm, .95 * b.flash + .12 * b.warm, .9 * b.flash + .04 * b.warm); mt.emissiveIntensity = 1.6; }
    const ex = b.x - Math.sin(b.yaw) * BOSS_LEN * .46, ez = b.z - Math.cos(b.yaw) * BOSS_LEN * .46;
    glow.add(ex, .3, ez, -Math.sin(b.yaw) * .7, 0, -Math.cos(b.yaw) * .7, .55, 3, [1.4, .5, .15], .9);
  }

  /* ───── 반사 ───── */
  const chainEl = $('#chain'), chainB = $('#chain b');
  function chainUI() { chainB.textContent = S.chain; chainEl.classList.toggle('on', S.chain >= 2); chainEl.classList.remove('pop', 'broke'); void chainEl.offsetWidth; chainEl.classList.add('pop'); }
  function breakChain() { if (S.chain >= 2) { chainEl.classList.remove('pop'); void chainEl.offsetWidth; chainEl.classList.add('broke'); setTimeout(() => chainEl.classList.remove('on', 'broke'), 600); } S.chain = 0; }
  function tryShield(bl) {
    const m = S.me, sh = S.sh; if (!sh.on) return false;
    const dx = bl.x - m.x, dz = bl.z - m.z, d = Math.hypot(dx, dz);
    if (d > T.shieldR + bl.r || d < .2) return false;
    const nx = dx / d, nz = dz / d; if (nx * sh.fx + nz * sh.fz < T.arcCos) return false;
    const perfect = sh.fresh && !sh.used && (S.t - sh.pressT) <= T.win;
    const ry = shield.rotation.y, lx = nx * Math.cos(ry) - nz * Math.sin(ry), lz = nx * Math.sin(ry) + nz * Math.cos(ry);
    shieldHits[hitSlot++ % 6].set(lx, 0, lz, S.t);
    const px = m.x + nx * T.shieldR, pz = m.z + nz * T.shieldR;
    if (perfect) {
      sh.used = true; sh.hot = 1;
      /* 너그러운 방향: 끈 쪽 30도 안에 적이 있으면 그 적을 향해 곧게 (가장 각이 가까운 적) */
      let ox = sh.fx, oz = sh.fz, best = T.assist, near = null; const a0 = Math.atan2(oz, ox);
      const cand = S.mode === 'boss' ? (S.boss.dead ? [] : [S.boss]) : S.foes.filter(f => f.alive && Math.hypot(f.x - px, f.z - pz) < 22);
      for (const f of cand) { const da = Math.abs(angD(Math.atan2(f.z - pz, f.x - px) - a0)); if (da < best) { best = da; near = f; } }
      if (near) { const ba = Math.atan2(near.z - pz, near.x - px); ox = Math.cos(ba); oz = Math.sin(ba); }
      S.chain = Math.min(S.chain + 1, 99);
      const ch = Math.min(S.chain, T.chainMax), tgt = near || (S.mode === 'boss' ? S.boss : null);
      const dB = tgt ? Math.hypot(tgt.x - m.x, tgt.z - m.z) : 99, nr = clamp((T.nearOut - dB) / (T.nearOut - T.nearIn), 0, 1);
      const mul = (1 + (ch - 1) * T.chainK) * (1 + nr * T.nearK);
      S.lb.push({ x: px, z: pz, vx: ox * T.lightSp, vz: oz * T.lightSp, r: .3 + ch * .02, dmg: T.lightDmg * mul, mul, ch, near: nr, age: 0, weak: false, tr: 0 });
      chainUI();
      flash(px, pz, .6, [1.3, 1.3, 1.45], .1); spark(px, pz, ox, oz, [1, 1, 1], 12, 14, 1.1);
      ring(px, pz, { r0: .2, r1: 2.4, dur: .32, w: .14, spec: true, I: 1.1 });       /* 내 스킬이 터지는 순간에만 무지개 고리 */
      m.kx -= ox * .7; m.kz -= oz * .7;
      shake(.16 + ch * .015); hitStop(.085, .05); tag(px, pz - 1.3, S.chain > 1 ? `완벽 반사 ${S.chain}연속` : '완벽 반사', 'ok');
    } else {
      const dd = bl.vx * nx + bl.vz * nz; let vx = bl.vx - 2 * dd * nx, vz = bl.vz - 2 * dd * nz; vx *= T.weakK; vz *= T.weakK;
      S.lb.push({ x: px, z: pz, vx, vz, r: .24, dmg: T.weakDmg, age: 0, weak: true, tr: 0 });
      spark(px, pz, nx, nz, [.7, .75, .9], 5, 6); flash(px, pz, .45, [.6, .65, .8], .08); shake(.04); tag(px, pz, '약하게 튕김', 'meh'); breakChain();
    }
    return true;
  }

  /* ───── 레벨업·강화 ───── */
  const UPS = [
    { id: 'gun', name: '기본탄 한 줄 더', desc: '총구가 하나 늘어요', go: () => { T.guns++; } },
    { id: 'rate', name: '더 빠르게 쏘기', desc: '연사가 18% 빨라져요', go: () => { T.fireEvery *= .82; } },
    { id: 'dmg', name: '기본탄 더 세게', desc: '기본탄 피해 +30%', go: () => { T.shotDmg *= 1.3; } },
    { id: 'win', name: '반사 판정 늘리기', desc: '완벽 반사로 쳐 주는 시간 +0.04초', go: () => { T.win += .04; } },
    { id: 'move', name: '더 빨리 날기', desc: '이동 속도 +12%', go: () => { T.move *= 1.12; } },
    { id: 'light', name: '받아친 빛 더 세게', desc: '반사 피해 +25%', go: () => { T.lightDmg *= 1.25; } },
    { id: 'hp', name: '기체 수리', desc: '체력 40% 회복', go: () => { S.me.hp = Math.min(T.hpMax, S.me.hp + .4); } },
    { id: 'mag', name: '빛 알갱이 끌어오기', desc: '알갱이를 끌어오는 거리 +40%', go: () => { T.magnet *= 1.4; } }
  ];
  const lvEl = $('#lvup'), cardsEl = $('#lvup .cards');
  function levelUp() {
    S.lv++; S.xp -= S.need; S.need = Math.round(8 + S.lv * 4.5);
    S.pause = true; S.fire.on = false; S.sh.on = false; S.stick.on = false; $('#stick').classList.remove('on'); $('#fire').classList.remove('on'); $('#reflect').classList.remove('on', 'stale');
    const pool = UPS.slice().sort(() => Math.random() - .5).slice(0, 3);
    cardsEl.innerHTML = pool.map(u => `<button class="card-up" data-up="${u.id}" type="button"><b>${u.name}</b><span>${u.desc}</span><em>${S.picks[u.id] ? '지금 ' + S.picks[u.id] + '단계' : '새로'}</em></button>`).join('');
    $('#lvup h3').textContent = `레벨 ${S.lv}`;
    lvEl.hidden = false; ring(S.me.x, S.me.z, { r0: .4, r1: 4, dur: .6, w: .2, spec: true, I: 1 });
  }
  cardsEl.addEventListener('click', e => { const b = e.target.closest('[data-up]'); if (!b) return; const u = UPS.find(x => x.id === b.dataset.up);
    u.go(); S.picks[u.id] = (S.picks[u.id] || 0) + 1; lvEl.hidden = true; S.pause = false; if (S.xp >= S.need) setTimeout(levelUp, 250); });

  /* 새 기본탄 결정: 바꿀지 고른다 */
  const gemEl = $('#gemask');
  $('#gemYes').addEventListener('click', () => { T.shot = 'fan'; gemEl.hidden = true; S.pause = false; tag(S.me.x, S.me.z - 1.6, '부채꼴 기본탄', 'big'); });
  $('#gemNo').addEventListener('click', () => { gemEl.hidden = true; S.pause = false; });

  /* 보스 문: 도전할지 묻는다 */
  const gateEl = $('#gateask');
  $('#gateYes').addEventListener('click', () => { gateEl.hidden = true; enterBoss(); });
  $('#gateNo').addEventListener('click', () => { gateEl.hidden = true; S.pause = false; S.gateAsked = S.t + 2.5; });
  function enterBoss() {
    const fade = $('#fade'); fade.classList.add('on');
    setTimeout(() => {
      S.mode = 'boss'; S.fb.length = 0; S.mb.length = 0; S.lb.length = 0; S.orbs.length = 0;
      for (const f of S.foes) f.obj.visible = false;
      Object.assign(S.me, { x: ARENA.x - 6.5, z: ARENA.z, vx: 0, vz: 0, kx: 0, kz: 0, yaw: -Math.PI / 2 });
      Object.assign(S.boss, { x: BX, z: BZ, hp: T.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.8, sig: T.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: -Math.PI / 2, dead: false, drift: 0 });
      boss.visible = true; camT.set(ARENA.x, 0, ARENA.z); $('#hpBoss').hidden = false; $('#xp').hidden = true;
      fade.classList.remove('on'); S.pause = false;
    }, 450);
  }

  /* ───── 한 걸음 ───── */
  const v = new THREE.Vector3();
  const STARS = []; for (let i = 0; i < 220; i++) STARS.push([(Math.random() - .5) * 260, -40 - Math.random() * 60, (Math.random() - .5) * 200, Math.random()]);
  const DUST = []; for (let i = 0; i < 260; i++) DUST.push([rnd(-MAP.x - 6, ARENA.x + 16), rnd(-3, -1), rnd(-MAP.z - 6, MAP.z + 6), Math.random()]);   /* 지나가는 먼지: 움직이는 느낌 */
  const BEACON = []; { const st = 4; for (let x = -MAP.x; x <= MAP.x; x += st) { BEACON.push([x, -MAP.z], [x, MAP.z]); } for (let z = -MAP.z + st; z < MAP.z; z += st) { BEACON.push([-MAP.x, z], [MAP.x, z]); } }

  function step(dt) {
    S.t += dt; const t = S.t, m = S.me, sh = S.sh;
    const B = S.mode === 'boss' ? { x0: ARENA.x - ARENA.hx + 1, x1: ARENA.x + ARENA.hx - 1, z0: ARENA.z - ARENA.hz + .9, z1: ARENA.z + ARENA.hz - .7 } : { x0: -MAP.x + 1, x1: MAP.x - 1, z0: -MAP.z + 1, z1: MAP.z - 1 };

    if (!S.over) {
      const slow = S.fire.on && !sh.on ? T.fireMove : 1, st = S.stick, tvx = st.on ? st.x * T.move * slow : 0, tvz = st.on ? st.y * T.move * slow : 0;
      m.vx += (tvx - m.vx) * Math.min(1, dt * 11); m.vz += (tvz - m.vz) * Math.min(1, dt * 11);
      m.kx *= Math.pow(.004, dt); m.kz *= Math.pow(.004, dt);
      m.x = clamp(m.x + (m.vx + m.kx * 6) * dt, B.x0, B.x1); m.z = clamp(m.z + (m.vz + m.kz * 6) * dt, B.z0, B.z1);
      const bt = bossTest(m.x, m.z, .7); if (bt) { const k = 1 / Math.sqrt((bt.u / (HL + .7)) ** 2 + (bt.w / (HW + .7)) ** 2);
        const u = bt.u * k, w = bt.w * k; m.x = S.boss.x + bt.fx * u + bt.fz * w; m.z = S.boss.z + bt.fz * u - bt.fx * w; }
    }
    /* 고개: 쏘는 동안은 끈 쪽, 아니면 가까운 적 쪽, 적이 없으면 가는 쪽 */
    const F = S.fire, firing = F.on && !sh.on, toB = bossDir(m.x, m.z);
    if (firing && !F.drag && toB) { F.ax = toB[0]; F.az = toB[1]; fireDir.style.transform = `rotate(${Math.atan2(F.ax, -F.az)}rad)`; }   /* 끌지 않았으면 가까운 적을 계속 따라 겨눈다 */
    const mv = Math.hypot(m.vx, m.vz), aim = firing ? [F.ax, F.az] : toB || (mv > .8 ? [m.vx / mv, m.vz / mv] : [m.hx || 0, m.hz || -1]);
    const wantY = Math.atan2(-aim[0], -aim[1]), dY = angD(wantY - m.yaw);
    const turn = dY * Math.min(1, dt * (firing ? T.turnFire : T.turn)); m.yaw += turn;
    const hx = -Math.sin(m.yaw), hz = -Math.cos(m.yaw), rx = -hz, rz = hx; m.hx = hx; m.hz = hz;
    const side = m.vx * rx + m.vz * rz, back = -(m.vx * hx + m.vz * hz);
    m.roll += (clamp(-side * .085 - turn / Math.max(dt, 1e-4) * .045, -.8, .8) - m.roll) * Math.min(1, dt * 10);
    m.pitch += (clamp(back * .03, -.25, .25) - m.pitch) * Math.min(1, dt * 8);
    me.rotation.order = 'YXZ'; me.position.set(m.x, .15 + Math.sin(t * 1.6) * .05, m.z); me.rotation.set(m.pitch, m.yaw, m.roll);
    me.visible = m.hp > 0 && !(m.hitT > t - .9 && Math.floor(t * 28) % 2 === 1);

    /* 기본탄 */
    S.fire.cd -= dt;
    if (firing && S.fire.cd <= 0 && m.hp > 0 && !S.over) {
      if (T.shot === 'fan') { S.fire.cd = T.fireEvery * 1.6; const n = 3 + T.guns, spread = .55;   /* 부채꼴: 짧고 넓게 */
        for (let i = 0; i < n; i++) { const a = Math.atan2(hz, hx) + (i / (n - 1) - .5) * spread, ax = Math.cos(a), az = Math.sin(a);
          S.mb.push({ x: m.x + hx * .8, z: m.z + hz * .8, vx: ax * T.shotSp, vz: az * T.shotSp, age: 0, life: .5, dmg: T.shotDmg * .75 }); }
        P3(m.x + hx * .9, .35, m.z + hz * .9, hx * 2, 0, hz * 2, .07, .45, 3, [.8, 1, 1.4], { drag: 0, grow: 2 });
      } else { S.fire.cd = T.fireEvery;
        for (let i = 0; i < T.guns; i++) { const gx = (i - (T.guns - 1) / 2) * .36, x = m.x + hx * .85 + rx * gx, z = m.z + hz * .85 + rz * gx;
          S.mb.push({ x, z, vx: hx * T.shotSp, vz: hz * T.shotSp, age: 0, life: 1.1, dmg: T.shotDmg }); P3(x, .35, z, hx * 2, 0, hz * 2, .06, .3, 3, [.8, 1, 1.4], { drag: 0, grow: 2 }); } }
      m.kx -= hx * .025; m.kz -= hz * .025;
    }

    /* 방패 */
    if (sh.on && !sh.used && sh.fresh && t - sh.pressT > T.win) { sh.fresh = false; sh.lock = t + T.whiff; breakChain(); }
    const ageS = t - sh.pressT, freshNow = sh.on && sh.fresh && !sh.used && ageS <= T.win;
    sh.I += ((sh.on ? (freshNow ? 1.5 : .42) : 0) - sh.I) * Math.min(1, dt * (sh.on ? 30 : 12));
    sh.hot *= Math.pow(.002, dt); if (freshNow) sh.hot = Math.max(sh.hot, 1 - ageS / T.win);
    shield.visible = sh.I > .02; shield.position.set(m.x, .25, m.z); shield.rotation.y = Math.atan2(-sh.fx, -sh.fz);
    shield.scale.set(T.shieldR, T.shieldR * .5, T.shieldR);
    shieldMat.uniforms.uI.value = sh.I; shieldMat.uniforms.uHot.value = sh.hot * .8; shieldMat.uniforms.uT.value = t;

    foesTick(dt); bossTick(dt);

    /* 적 탄 */
    for (let i = S.fb.length - 1; i >= 0; i--) { const b = S.fb[i]; b.age += dt; let gone = false;
      for (let s = 0; s < 2 && !gone; s++) { b.x += b.vx * dt / 2; b.z += b.vz * dt / 2;
        if (tryShield(b)) { gone = true; break; }
        if (m.hp > 0 && m.inv < t && Math.hypot(b.x - m.x, (b.z - m.z) * 1.15) < .5 + b.r) { playerHit(b); gone = true; } }
      if (gone || b.age > 4) { S.fb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), tl = Math.min(.55, sp * .035);
      glow.add(b.x, .35, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r, 0, FOE_C, 1, i);
      glow.add(b.x, .35, b.z, 0, 0, 0, b.r * 2.6, 3, [1, .25, .1], .35); }

    /* 기본탄 */
    for (let i = S.mb.length - 1; i >= 0; i--) { const b = S.mb[i]; b.age += dt; b.x += b.vx * dt; b.z += b.vz * dt; let gone = false;
      const h = hitAny(b.x, b.z, .06); if (h) { foeHit(h, b.dmg, b.x, b.z, b.vx, b.vz, false); gone = true; }
      if (gone || b.age > b.life) { if (!gone && b.life < .6) P3(b.x, .33, b.z, b.vx * .1, 0, b.vz * .1, .12, .12, 3, [.5, .7, 1.2], { drag: 4 }); S.mb.splice(i, 1); continue; }
      const k = 1 - Math.max(0, (b.age - b.life * .7) / (b.life * .3));          /* 사거리 끝에서 흐려진다 */
      glow.add(b.x, .33, b.z, -b.vx * .024, 0, -b.vz * .024, .08, 2, [.55, .75, 1.3], k, i); }

    /* 받아친 빛 */
    for (let i = S.lb.length - 1; i >= 0; i--) { const b = S.lb[i]; b.age += dt; let gone = false;
      for (let s = 0; s < 4 && !gone; s++) { b.x += b.vx * dt / 4; b.z += b.vz * dt / 4;
        const h = hitAny(b.x, b.z, b.r);
        if (h) { foeHit(h, b.dmg, b.x, b.z, b.vx, b.vz, !b.weak);
          if (!b.weak && b.mul > 1.05) tag(b.x, b.z - .9, `피해 ×${b.mul.toFixed(1)}` + (b.near > .3 ? ' · 가까이' : ''), 'big');
          gone = true; } }
      if (gone || b.age > 2.5) { S.lb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), split = Math.min(1, ((b.ch || 1) - 1) / (T.chainMax - 1));
      if (b.weak) glow.add(b.x, .35, b.z, -b.vx / sp * .4, 0, -b.vz / sp * .4, b.r, 0, [.5, .6, .9], .8, i);
      else { const tl = 1.5 + split * .9;
        glow.add(b.x, .38, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r * (1 + split * .35), 1 + split * .4, [.8, .9, 1.1], 1, i);
        glow.add(b.x, .38, b.z, 0, 0, 0, b.r * (3 + split * 2), 3, [.6, .7, 1], .3 + split * .25);
        b.tr += dt; if (b.tr > .016) { b.tr = 0; P3(b.x, .38, b.z, 0, 0, 0, .18 + split * .14, b.r * .7, 1 + split * .4, [.7, .8, 1], { drag: 0, grow: -.6, a: .5 }); } } }

    /* 빛 알갱이: 흩어졌다가 가까우면 나에게 빨려 온다 */
    for (let i = S.orbs.length - 1; i >= 0; i--) { const o = S.orbs[i]; o.age += dt;
      const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz);
      if (o.age > .35 && d < T.magnet) o.pull = true;
      if (o.pull) { const a = 30 + 40 * o.age; o.vx += dx / d * a * dt; o.vz += dz / d * a * dt; const sp = Math.hypot(o.vx, o.vz), mx = 22; if (sp > mx) { o.vx *= mx / sp; o.vz *= mx / sp; } }
      else { o.vx *= Math.exp(-3 * dt); o.vz *= Math.exp(-3 * dt); }
      o.x += o.vx * dt; o.z += o.vz * dt;
      if (d < .7) { S.orbs.splice(i, 1); S.xp += o.v; flash(m.x, m.z, .35, [.7, 1, .5], .08); if (S.xp >= S.need && !S.pause) levelUp(); continue; }
      if (o.age > 30) { S.orbs.splice(i, 1); continue; }
      const bob = Math.sin(t * 5 + i) * .06;
      glow.add(o.x, .35 + bob, o.z, -o.vx * .02, 0, -o.vz * .02, .1, 1, [.75, 1, .55], .9, i);
      glow.add(o.x, .35 + bob, o.z, 0, 0, 0, .35, 3, [.4, .9, .3], .35); }

    /* 특별 구역: 빛 기둥과 바닥의 맥박. 잡고 나면 꺼진다 */
    if (!S.zoneDone && S.mode === 'field') { const pul = (t * .5) % 1;
      for (let k = 0; k < 6; k++) glow.add(ZONE.x, .4 + k * 1.6, ZONE.z, 0, 0, 0, 1.2 - k * .12, 3, [1, .75, .35], .28 - k * .03);
      if (pul < dt * .5 + .001) ring(ZONE.x, ZONE.z, { r0: 1, r1: ZONE.r, dur: 1.6, w: .25, I: .5, c: [1, .7, .3] }); }
    /* 새 기본탄 결정: 돌며 숨 쉬고, 닿으면 고른다 */
    if (S.gemOn) { gem.rotation.y += dt * 1.6; gem.position.y = .6 + Math.sin(t * 2) * .12;
      glow.add(gem.position.x, .5, gem.position.z, 0, 0, 0, 1.1, 3, [.7, .8, 1.2], .5 + .2 * Math.sin(t * 4));
      if (Math.hypot(m.x - gem.position.x, m.z - gem.position.z) < 1.3) { S.gemOn = false; gem.visible = false; S.pause = true; gemEl.hidden = false; } }
    /* 보스 문: 천천히 도는 빛 구슬 고리, 가까이 가면 묻는다 */
    if (S.mode === 'field') { for (let k = 0; k < 18; k++) { const a = t * .6 + k / 18 * 6.283, r = 2.2 + Math.sin(t * 2 + k) * .08;
        glow.add(GATE.x + Math.cos(a) * r, .4, GATE.z + Math.sin(a) * r, -Math.sin(a) * .3, 0, Math.cos(a) * .3, .09, 1, [1, .45, .25], .9); }
      glow.add(GATE.x, .3, GATE.z, 0, 0, 0, 1.8, 3, [.9, .25, .12], .35 + .1 * Math.sin(t * 3));
      if (Math.hypot(m.x - GATE.x, m.z - GATE.z) < 2.2 && t > S.gateAsked && !S.pause) { S.pause = true; S.fire.on = false; S.sh.on = false; S.stick.on = false; $('#stick').classList.remove('on');
        $('#gateask p').textContent = `지금 레벨 ${S.lv}. 들어가면 보스를 쓰러뜨릴 때까지 나올 수 없어요.`; gateEl.hidden = false; } }

    /* 경계: 맵 가장자리를 따라 희미한 부표가 숨 쉰다 */
    if (S.mode === 'field') for (let k = 0; k < BEACON.length; k++) { const [bx, bz] = BEACON[k]; if (Math.abs(bx - camT.x) > 24 || Math.abs(bz - camT.z) > 16) continue;
      glow.add(bx, .3, bz, 0, 0, 0, .08, 1, [.6, .8, 1], .5 + .3 * Math.sin(t * 2 + k)); glow.add(bx, .3, bz, 0, 0, 0, .5, 3, [.3, .45, .8], .25); }
    else for (let k = 0; k < 28; k++) { const tq = k / 28, per = 2 * (ARENA.hx + ARENA.hz) * 2; let p = tq * per, x, z;   /* 보스 경기장 둘레 */
      const W2 = ARENA.hx * 2, H2 = ARENA.hz * 2; if (p < W2) { x = -ARENA.hx + p; z = -ARENA.hz; } else if ((p -= W2) < H2) { x = ARENA.hx; z = -ARENA.hz + p; } else if ((p -= H2) < W2) { x = ARENA.hx - p; z = ARENA.hz; } else { p -= W2; x = -ARENA.hx; z = ARENA.hz - p; }
      glow.add(ARENA.x + x, .3, ARENA.z + z, 0, 0, 0, .08, 1, [1, .6, .4], .45 + .3 * Math.sin(t * 2 + k)); }

    /* 파편 */
    for (const d of DEB) { if (!d.o.visible) continue; d.age += dt; if (d.age > d.life) { d.o.visible = false; continue; }
      const k = d.age / d.life, dr = Math.exp(-2.2 * dt); d.vx *= dr; d.vz *= dr; d.vy = d.vy * dr - 4 * dt;
      d.o.position.x += d.vx * dt; d.o.position.y += d.vy * dt; d.o.position.z += d.vz * dt; d.o.rotation.x += d.sx * dt; d.o.rotation.y += d.sy * dt;
      d.m.emissiveIntensity = 2.2 * (1 - k) * (1 - k); d.o.scale.multiplyScalar(1 - dt * .6); }
    /* 효과 알갱이 */
    for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.age += dt; if (p.age > p.life) { S.parts.splice(i, 1); continue; }
      let fixed = false;
      if (p.to) { const px = p.x, pz = p.z; if (p.to(p, dt) === 'pos') { fixed = true; const id = 1 / Math.max(dt, 1e-4); p.vx = (p.x - px) * id; p.vz = (p.z - pz) * id; } }
      if (!fixed) { const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
      const k = p.age / p.life, r = p.r * Math.max(.05, 1 + p.grow * k), a = p.a * (p.k === 3 ? (1 - k) * (1 - k) : (1 - k));
      glow.add(p.x, p.y, p.z, -p.vx * p.tail, -p.vy * p.tail, -p.vz * p.tail, r, p.k, p.c, a, i); }
    /* 고리 */
    for (let i = S.rings.length - 1; i >= 0; i--) { const e = S.rings[i], k = (t - e.t0) / e.dur;
      if (k > 1) { scene.remove(e.mesh); e.m.dispose(); S.rings.splice(i, 1); continue; }
      const r = e.r0 + (e.r1 - e.r0) * (1 - Math.pow(1 - k, 2.2));
      e.m.uniforms.uR.value = r; e.m.uniforms.uW.value = e.w * (1 + k); e.m.uniforms.uS.value = r + e.w * 8 + 1; e.m.uniforms.uI.value = e.I * (1 - k * k); }
    /* 내 엔진 */
    me.updateMatrixWorld(true);
    if (me.visible) for (const p of ENG) { v.copy(p).applyMatrix4(shipModel.matrixWorld); const fl = (1 + Math.max(0, m.vx * m.hx + m.vz * m.hz) * .06) * (.9 + .1 * Math.sin(t * 40 + p.x * 9));
      const bx = -m.hx, bz = -m.hz;
      glow.add(v.x + bx * .05, v.y, v.z + bz * .05, bx * .8 * fl, 0, bz * .8 * fl, .15, 1, [.4, .6, 1.4], .9);
      glow.add(v.x + bx * .22, v.y, v.z + bz * .22, bx * .5 * fl, 0, bz * .5 * fl, .4 * fl, 3, [.25, .45, 1.3], .7); }
    for (const s of STARS) glow.add(s[0], s[1], s[2], 0, 0, 0, .06 + s[3] * .1, 3, [.7, .75, .9], .35 + s[3] * .4);
    for (const d of DUST) { if (Math.abs(d[0] - camT.x) > 26 || Math.abs(d[2] - camT.z) > 18) continue; glow.add(d[0], d[1], d[2], 0, 0, 0, .05 + d[3] * .05, 3, [.55, .6, .75], .25 + d[3] * .2); }
  }

  function playerHit(b) {
    const m = S.me; m.hp = Math.max(0, Math.round((m.hp - T.hitHp) * 1000) / 1000);   /* 0.2씩 빼다 생기는 아주 작은 찌꺼기 없이 */ m.hitT = S.t; m.inv = S.t + .9; breakChain();
    spark(b.x, b.z, -b.vx, -b.vz, [1, .4, .2], 12, 8); flash(b.x, b.z, .8, [1.6, .5, .2], .12); shake(.25); hitStop(.05, .1);
    const vg = $('#hurt'); vg.classList.remove('on'); void vg.offsetWidth; vg.classList.add('on');
    if (m.hp <= 0) { explode(m.x, m.z, 1.2); S.sh.on = false; S.fire.on = false; S.slowT = .7; S.ts = .3; setTimeout(() => endGame(false), 1300); }
  }

  /* ───── 화면 크기 ───── */
  let Wd = 2, Hd = 2;
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = Q.renderSize(r.width, r.height); bloom.setSamples(Q.tier().aa);
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); skyMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size(); Q.onChange(() => size()); Q.measure().then(() => size());   /* 품질 단계가 정해지거나 바뀌면 다시 맞춤 */

  /* ───── 손 ───── */
  const fireB = $('#fire'), refB = $('#reflect'), stickEl = $('#stick'), knob = $('#stick i'), refKnob = $('#reflect .knob'), arc = $('#reflect .arc'), fireDir = $('#fire .dir'), fireKnob = $('#fire .knob');
  const defDir = () => bossDir(S.me.x, S.me.z) || [S.me.hx, S.me.hz];
  function fireAim(e) { const F = S.fire, dx = e.clientX - F.ox, dy = e.clientY - F.oy, l = Math.hypot(dx, dy);
    if (l > 9) { F.ax = dx / l; F.az = dy / l; F.drag = true; }
    const k = Math.min(1, l / 40); fireKnob.style.transform = `translate(${F.ax * 30 * k}px,${F.az * 30 * k}px)`; fireDir.style.transform = `rotate(${Math.atan2(F.ax, -F.az)}rad)`; }
  function shieldDir(e) { const sh = S.sh, dx = e.clientX - sh.ox, dy = e.clientY - sh.oy, l = Math.hypot(dx, dy);
    if (l > 9) { sh.fx = dx / l; sh.fz = dy / l; }
    const k = Math.min(1, l / 40); refKnob.style.transform = `translate(${sh.fx * 30 * k}px,${sh.fz * 30 * k}px)`; }
  function drawArc() { arc.style.transform = `rotate(${Math.atan2(S.sh.fx, -S.sh.fz)}rad)`; }
  addEventListener('pointerdown', e => {
    if (!S.run || S.over || S.pause || e.target.closest('#speed') || e.target.closest('.card')) return;
    if (e.target.closest('#fire')) { const d0 = defDir(); Object.assign(S.fire, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, ax: d0[0], az: d0[1], drag: false }); fireB.classList.add('on'); fireAim(e); e.preventDefault(); return; }
    if (e.target.closest('#reflect')) { const sh = S.sh, d0 = defDir(); Object.assign(sh, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, fx: d0[0], fz: d0[1], pressT: S.t, fresh: S.t >= sh.lock, used: false });
      refB.classList.add('on'); refB.classList.toggle('stale', !sh.fresh); shieldDir(e); drawArc();
      for (let i = S.fb.length - 1; i >= 0; i--) if (tryShield(S.fb[i])) S.fb.splice(i, 1);
      e.preventDefault(); return; }
    if (e.clientX < innerWidth * .55 && !S.stick.on) { Object.assign(S.stick, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 });
      stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('on'); knob.style.transform = ''; }
  }, { passive: false });
  addEventListener('pointermove', e => {
    if (e.pointerId === S.stick.id && S.stick.on) { const st = S.stick, dx = e.clientX - st.ox, dy = e.clientY - st.oy, l = Math.hypot(dx, dy), R = 58, k = Math.min(1, l / R);
      st.x = l ? dx / l * k : 0; st.y = l ? dy / l * k : 0; knob.style.transform = `translate(${st.x * R}px,${st.y * R}px)`; }
    if (e.pointerId === S.sh.id && S.sh.on) { shieldDir(e); drawArc(); }
    if (e.pointerId === S.fire.id && S.fire.on) fireAim(e);
  });
  const up = e => {
    if (e.pointerId === S.stick.id) { S.stick.on = false; S.stick.id = -1; stickEl.classList.remove('on'); }
    if (e.pointerId === S.fire.id) { S.fire.on = false; S.fire.id = -1; fireB.classList.remove('on'); fireKnob.style.transform = ''; }
    if (e.pointerId === S.sh.id) { const sh = S.sh; if (sh.fresh && !sh.used && S.t - sh.pressT <= T.win) { sh.lock = S.t + T.whiff; breakChain(); }
      sh.on = false; sh.id = -1; refB.classList.remove('on', 'stale'); refKnob.style.transform = ''; }
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('contextmenu', e => e.preventDefault());
  const spIn = $('#speed input'), spB = $('#speed b');
  spIn.addEventListener('input', () => { const k = spIn.value / 100, r = k / foeK; foeK = k; spB.textContent = spIn.value + '%'; for (const b of S.fb) { b.vx *= r; b.vz *= r; } });

  /* ───── 판 시작·끝 ───── */
  function reset() {
    T = { ...T0 };
    Object.assign(S, { t: 0, ts: 1, stopT: 0, slowT: 0, shakeA: 0, over: false, pause: false, mode: 'field', chain: 0, lv: 1, xp: 0, need: 8, picks: {}, kills: 0, zoneDone: false, gemOn: false, gateAsked: 0 });
    Object.assign(S.me, { x: -30, z: 14, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kx: 0, kz: 0, yaw: -Math.PI / 4, hx: .7, hz: -.7 });
    Object.assign(S.sh, { on: false, id: -1, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0 });
    S.boss.dead = true; boss.visible = false;
    Object.assign(S.fire, { on: false }); S.stick.on = false;
    for (const f of S.foes) scene.remove(f.obj); S.foes = []; S.fb.length = 0; S.mb.length = 0; S.lb.length = 0; S.parts.length = 0; S.orbs.length = 0;
    for (const e of S.rings) { scene.remove(e.mesh); e.m.dispose(); } S.rings.length = 0;
    for (const d of DEB) d.o.visible = false; gem.visible = false;
    SPAWNS.sort((a, b) => Math.hypot(b[0] + 30, b[1] - 14) - Math.hypot(a[0] + 30, a[1] - 14));   /* 시작 자리에서 먼 곳부터 */
    for (let i = 0; i < SPAWNS.length; i++) if (Math.hypot(SPAWNS[i][0] + 30, SPAWNS[i][1] - 14) > 15) spawnPack(i);   /* 시작 자리 근처는 비워 둔다 */
    spawnElite();
    camT.set(S.me.x, 0, S.me.z);
    chainEl.classList.remove('on', 'pop', 'broke'); $('#hpBoss').hidden = true; $('#xp').hidden = false; drawArc();
    for (const id of ['#lvup', '#gemask', '#gateask']) $(id).hidden = true;
  }
  function endGame(win) { S.over = true; S.run = false;
    $('#end h2').textContent = win ? '격파' : '격추';
    $('#end p').textContent = win ? `레벨 ${S.lv}, ${S.kills}마리를 잡고 ${S.t.toFixed(0)}초 만에 보스를 무너뜨렸어요` : (S.mode === 'boss' ? `보스 체력 ${Math.ceil(S.boss.hp / T.bossHp * 100)}% 남았어요` : `레벨 ${S.lv}에서 격추됐어요`);
    $('#end').hidden = false; }
  $('#go').addEventListener('click', () => { $('#how').hidden = true; reset(); S.run = true; });
  $('#again').addEventListener('click', () => { $('#end').hidden = true; reset(); S.run = true; });

  /* ───── 화면 위 숫자 ───── */
  const meBar = $('#hpMe i'), bossBar = $('#hpBoss .bar i'), sigEl = $('#sig b'), xpBar = $('#xp i'), xpLv = $('#xp b');
  function hud() { meBar.style.transform = `scaleX(${S.me.hp})`;
    if (S.mode === 'boss') { bossBar.style.transform = `scaleX(${Math.max(0, S.boss.hp / T.bossHp)})`; sigEl.textContent = S.boss.sig.toFixed(2) + '초'; }
    xpBar.style.transform = `scaleX(${Math.min(1, S.xp / S.need)})`; xpLv.textContent = S.lv;
    refB.classList.toggle('locked', S.t < S.sh.lock && !S.sh.on); }

  /* ───── 그리기 ───── */
  let last = performance.now(), frame = 0;
  renderer.setAnimationLoop(now => {
    const real = Math.min(.05, (now - last) / 1000); last = now;
    if (S.stopT > 0) S.stopT -= real; else if (S.slowT > 0) { S.slowT -= real; S.ts += (.3 - S.ts) * Math.min(1, real * 10); } else S.ts += (1 - S.ts) * Math.min(1, real * 16);
    const live = (S.run || S.over) && !S.pause, dt = real * S.ts;
    glow.begin(); step(live ? dt : 0); glow.end();
    glow.uT.value = S.t;
    /* 카메라: 들판에서는 나를 부드럽게 따라가고(가는 쪽을 조금 더 보여 줌), 보스전에서는 경기장 가운데 */
    if (S.mode === 'field') { const lx = S.me.x + S.me.vx * .25, lz = S.me.z + S.me.vz * .2;
      camT.x += (clamp(lx, -MAP.x + 10, MAP.x - 10) - camT.x) * Math.min(1, real * 4); camT.z += (clamp(lz, -MAP.z + 6, MAP.z - 6) - camT.z) * Math.min(1, real * 4); }
    else { camT.x += (ARENA.x + S.me.x * 0 + (S.me.x - ARENA.x) * .05 - camT.x) * Math.min(1, real * 4); camT.z += (ARENA.z + (S.me.z - ARENA.z) * .05 - camT.z) * Math.min(1, real * 4); }
    S.shakeA *= Math.pow(.004, real * .6);
    const sh = S.shakeA, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
    camera.position.set(camT.x + CAM.x + sx, CAM.y, camT.z + CAM.z + sz); camera.lookAt(camT.x + LOOK.x + sx * .5, 0, camT.z + LOOK.z + sz * .5);
    skyMat.uniforms.uT.value = S.t; skyMat.uniforms.uYaw.value = S.t * P.spin + P.yaw0;
    if ((frame++ & 1) === 0) { renderer.setRenderTarget(skyRT); renderer.render(skyScene, bgCam); }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth();
    renderer.render(scene, camera);
    bloom.render(Wd, Hd);
    hud();
  });
  onProgress(1);
  reset();
  window.__ft = { S, get T() { return T; }, reset, camT, enterBoss, levelUp, go: () => { $('#how').hidden = true; reset(); S.run = true; } };   /* 검사용 */
}
