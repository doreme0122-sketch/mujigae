/* 반사 시험판 — 손맛만 확인하는 작은 경기장 하나
   위에서 내려다본 뷰. 화면 위쪽 = -Z, 오른쪽 = +X, 바닥 평면 XZ. 경기장 어디든 다닐 수 있다.
   · 보스는 쏘기 직전에 빛을 모으고 몸을 움츠린다(신호). 판이 흐를수록 신호가 짧아진다. 보스는 늘 나를 향해 몸을 돌린다.
   · 반사: 누른 채 끌면 방패가 그쪽으로 돈다. 방패는 앞쪽 1/3만 막는다.
     닿기 직전에 막 누르면 완벽 반사, 미리 들고 있었으면 약하게 튕길 뿐. 보스 쪽으로 대충 밀어도 보스를 향해 날아간다.
   · 완벽 반사를 연달아 성공할수록 받아친 빛이 더 갈라지고 세진다 = 콤보. 놓치거나 맞으면 끊긴다.
   · 보스에게 가까울수록 탄이 빨리 닿아 위험하지만, 받아친 빛도 세게 박힌다.
   · 기본탄: 누른 채 끌면 그쪽으로 고개를 돌려 쏜다. 쏘는 동안은 반동 때문에 이동과 고개 돌리기가 느려진다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeGlow } from '../preview/glow.js';
import { filmMaterial, ringMaterial, crystalMaterial } from '../preview/fxmat.js';

const M = new URL('../../assets/models/', import.meta.url).href;
const $ = s => document.querySelector(s);
const hueRGB = h => { const f = n => { const k = (n + h * 6) % 6; return Math.max(0, Math.min(1, Math.abs(k - 3) - 1)); }; return [f(0), f(4), f(2)]; };
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const angD = a => THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;   /* 가장 짧게 도는 각 */

/* ───── 손맛 숫자 (여기만 바꿔 가며 맞춘다) ───── */
const T = {
  move: 9,                       /* 최고 이동 속도 */
  fireEvery: .12, shotSp: 21, shotDmg: .6,
  foeSp: 15.5,                   /* 보스 탄: 적고 빠르다 */
  sig0: .9, sigMin: .3, sigStep: .035,   /* 신호 길이: 처음 0.9초 → 쏠 때마다 줄어 0.3초까지 */
  win: .18,                      /* 완벽 반사로 쳐 주는 시간 (누른 뒤) */
  whiff: .38,                    /* 헛치면 이만큼 완벽 반사가 안 된다 */
  shieldR: 1.35, arcCos: .5,     /* 방패 반지름, 앞쪽 120도 */
  lightSp: 28, lightDmg: 14,
  chainK: .25, chainMax: 6,      /* 연속 완벽 반사 1번마다 +25%, 6번까지 */
  nearK: .6, nearIn: 3.5, nearOut: 11,   /* 보스와 3.5 안이면 +60%, 11 밖이면 그대로 */
  assist: .5,                    /* 보스 쪽에서 이만큼(라디안, 약 30도) 안으로 밀면 보스를 향해 곧게 */
  weakK: .6, weakDmg: 2,
  bossHp: 320, hitHp: .2,
  turn: 14, turnFire: 4.5,        /* 고개 돌리는 빠르기: 평소 / 쏘는 동안 */
  fireMove: .6                   /* 쏘는 동안 이동 속도 */
};
const FIELD = { x: 12.6, top: -7.6, bottom: 6.4 };  /* 카메라를 조금 멀리 뺀 만큼 넓어진 경기장 */
const BX = 5.6, BZ = -.6;          /* 보스가 머무는 자리 (오른쪽 가운데) */
const FOE_C = [1, .22, .12];
let foeK = 1;                    /* 화면 위 막대로 바꾸는 적 탄 빠르기 (시험용) */

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .5, 400);
  const CAM = new THREE.Vector3(0, 29.5, 7.3), LOOK = new THREE.Vector3(0, 0, -.45);
  const bloom = makeBloom(renderer);

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
  const [ship, bossG] = await Promise.all([
    buildShip(1, 1, 'ruby', { renderer, size: 2.0 }).then(r => (onProgress(.55), r)),
    new GLTFLoader().loadAsync(M + 's1_boss.glb').then(r => (onProgress(.85), r))]);

  const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const shipModel = ship.root.children[0];
  const shipSz = new THREE.Box3().setFromObject(shipModel).getSize(new THREE.Vector3());
  const ENG = engineSpots(ship.ship, shipModel, shipSz);

  /* 보스: 몸(흔들림·움츠림) 안에 모델 */
  const boss = new THREE.Group(), bossBody = new THREE.Group(); boss.add(bossBody); scene.add(boss);
  let BOSS_LEN = 5.2, BOSS_R = 1.9, HL = 2.6, HW = .8;
  { const m = bossG.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); const k = BOSS_LEN / Math.max(s.x, s.z); h.scale.setScalar(k); h.rotation.y = Math.PI; bossBody.add(h);   /* 창끝(앞)이 나를 향하게 */
    BOSS_R = Math.max(s.x, s.z) * k * .42; HL = s.z * k / 2; HW = s.x * k / 2 + .3; }   /* 날개 끝까지 맞는 자리로 */
  const bossMats = []; bossBody.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); bossMats.push(o.material); } });

  /* 방패: 얇은 막 반구, 앞쪽 1/3만 */
  const shieldMat = filmMaterial(); shieldMat.uniforms.uArc.value = .4;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), shieldMat); shield.renderOrder = 11; scene.add(shield);


  /* 깨져 나가는 파편 (진짜 조각) */
  const DEB = []; { const g = new THREE.TetrahedronGeometry(.13);
    for (let i = 0; i < 40; i++) { const m = new THREE.MeshStandardMaterial({ color: 0x3a3c44, metalness: .8, roughness: .35, emissive: new THREE.Color(1, .4, .12), emissiveIntensity: 0 });
      const o = new THREE.Mesh(g, m); o.visible = false; scene.add(o); DEB.push({ o, m, life: 0, age: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0 }); } }
  let debI = 0;
  const debris = (x, z, nx, nz, n, sp = 7) => { for (let i = 0; i < n; i++) { const d = DEB[debI++ % DEB.length], a = Math.atan2(nz, nx) + (Math.random() - .5) * 1.8, s = sp * (.35 + Math.random() * .8);
    Object.assign(d, { life: .7 + Math.random() * .6, age: 0, vx: Math.cos(a) * s, vy: (Math.random() - .2) * 3, vz: Math.sin(a) * s, sx: (Math.random() - .5) * 20, sy: (Math.random() - .5) * 20 });
    d.o.position.set(x, .4, z); d.o.scale.setScalar(.6 + Math.random() * 1.1); d.o.visible = true; } };

  /* ───── 상태 ───── */
  const S = {
    t: 0, ts: 1, stopT: 0, slowT: 0, shakeA: 0, run: false, over: false,
    me: { x: -6.5, z: BZ, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kick: 0, kx: 0, kz: 0, yaw: -Math.PI / 2, hx: 1, hz: 0 },
    boss: { x: BX, z: BZ, hp: T.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.4, sig: T.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: -Math.PI / 2, dead: false },
    stick: { on: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 },
    fire: { on: false, id: -1, cd: 0, ox: 0, oy: 0, ax: 1, az: 0 },
    sh: { on: false, id: -1, ox: 0, oy: 0, fx: 1, fz: 0, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0 },
    fb: [], mb: [], lb: [], parts: [], rings: [], hits: 0, chain: 0
  };
  const shieldHits = shieldMat.uniforms.uHit.value; let hitSlot = 0;

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

  /* 화면 위 글자 (완벽 반사·꺾임) — 세계 좌표 위치에 띄운다 */
  const tagBox = $('#tags'), pv = new THREE.Vector3();
  function tag(x, z, text, cls = '') { pv.set(x, .5, z).project(camera); const el = document.createElement('div'); el.className = 'tag ' + cls; el.textContent = text;
    el.style.left = ((pv.x * .5 + .5) * innerWidth) + 'px'; el.style.top = ((-pv.y * .5 + .5) * innerHeight) + 'px'; tagBox.appendChild(el); setTimeout(() => el.remove(), 1100); }

  /* ───── 보스 몸에 닿았나 (길쭉한 몸을 타원으로) ───── */
  function bossTest(x, z, r) {
    const B = S.boss; if (B.dead) return null;
    const fx = Math.sin(B.yaw), fz = Math.cos(B.yaw), dx = x - B.x, dz = z - B.z;
    const u = dx * fx + dz * fz, w = dx * fz - dz * fx;
    return (u / (HL + r)) ** 2 + (w / (HW + r)) ** 2 < 1 ? { u, w, fx, fz } : null;
  }

  /* ───── 보스 ───── */
  const bossDir = (x, z) => { const B = S.boss, dx = B.x - x, dz = B.z - z, l = Math.hypot(dx, dz) || 1; return B.dead ? [1, 0] : [dx / l, dz / l]; };
  const muzzle = (off = 0) => { const b = S.boss, a = b.yaw, f = BOSS_LEN * .44;
    return [b.x + Math.sin(a) * f + Math.cos(a) * off, b.z + Math.cos(a) * f - Math.sin(a) * off]; };

  function bossHit(dmg, x, z, vx, vz, heavy) {
    const b = S.boss; if (b.dead) return;
    b.hp -= dmg; const sp = Math.hypot(vx, vz) || 1, nx = vx / sp, nz = vz / sp;
    if (heavy) {                                 /* 세게 맞음: 밀리고 기울고 겉 조각이 떨어진다 */
      const lat = nx * Math.cos(b.yaw) - nz * Math.sin(b.yaw), fwd = nx * Math.sin(b.yaw) + nz * Math.cos(b.yaw);
      b.flash = 1; b.kx += nx * 1.1; b.kz += nz * 1.1; b.bank += clamp(lat * .9, -.6, .6); b.pitch -= fwd * .35;
      spark(x, z, -nx, -nz, [1, .9, .7], 14, 11); spark(x, z, nx, nz, [1, .55, .25], 6, 6, 1.2);
      flash(x, z, .9, [1.8, 1.6, 1.5], .14); debris(x, z, -nx, -nz, 7, 8); shake(.22); hitStop(.06, .08);
    } else {                                     /* 기본탄: 불티와 짧은 흰 번쩍임만 */
      b.flash = Math.max(b.flash, .35);
      spark(x, z, -nx, -nz, [1, .85, .6], 3, 7); flash(x, z, .25, [1.2, 1.1, 1], .07);
    }
    if (b.hp <= 0) bossDie();
  }
  function bossDie() {
    const b = S.boss; b.dead = true; b.hp = 0; boss.visible = false; S.fb.length = 0;
    const x = b.x, z = b.z; flash(x, z, 3.4, [2, 1.6, 1.3], .22);
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.283, s = 1.5 + Math.random() * 5.5;
      P3(x, .5, z, Math.cos(a) * s, Math.random() * 2, Math.sin(a) * s, .6 + Math.random() * .8, .45 + Math.random() * .7, 3, Math.random() < .5 ? [1.4, .55, .16] : [1.1, .3, .08], { drag: 2.6, grow: -.4 }); }
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, s = 8 + Math.random() * 16;
      P3(x, .5, z, Math.cos(a) * s, Math.random() * 6, Math.sin(a) * s, .4 + Math.random() * .6, .07, 2, [1, .65, .3], { drag: 3.2, tail: .06 }); }
    for (let i = 0; i < 4; i++) debris(x, z, Math.cos(i * 1.57), Math.sin(i * 1.57), 9, 10);
    ring(x, z, { r0: .4, r1: 5.5, dur: .6, w: .3, I: .8, c: [1, .34, .08] });
    shake(.6); S.slowT = .9; S.ts = .25;
    setTimeout(() => endGame(true), 1500);
  }

  function bossTick(dt) {
    const b = S.boss, t = S.t; if (b.dead) return;
    /* 좌우로 천천히 떠다니며 내 쪽으로 고개를 돌린다 (모으는 동안은 자리를 지킨다) */
    const hold = b.phase === 'charge' ? .15 : 1;
    b.drift = (b.drift || 0) + dt * hold; const tz = BZ + Math.sin(b.drift * .42) * 2.7;
    const oz = b.z; b.z += (tz - b.z) * Math.min(1, dt * 1.8);
    const want = Math.atan2(S.me.x - b.x, S.me.z - b.z), dYaw = angD(want - b.yaw);
    b.yaw += clamp(dYaw * Math.min(1, dt * (b.phase === 'charge' ? 5 : 2.2)), -dt * 2.6, dt * 2.6);   /* 큰 몸이라 천천히 돈다 */
    b.kx *= Math.pow(.02, dt); b.kz *= Math.pow(.02, dt); b.bank *= Math.pow(.03, dt); b.pitch *= Math.pow(.03, dt); b.recoil *= Math.pow(.008, dt);
    b.flash *= Math.pow(.0006, dt);
    const vz = (b.z - oz) / Math.max(dt, 1e-4), lean = clamp(vz * Math.sin(b.yaw) * .05, -.25, .25);   /* 옆으로 미끄러질 때 몸이 기운다 */

    if (b.phase === 'idle') { b.pt += dt; b.crouch += (0 - b.crouch) * Math.min(1, dt * 5); b.warm *= Math.pow(.05, dt);
      if (b.pt > b.wait) { b.phase = 'charge'; b.pt = 0; b.twin = b.sig < .56 && Math.random() < .38; } }
    else if (b.phase === 'charge') {
      b.pt += dt; const k = Math.min(1, b.pt / b.sig), e = k * k * (3 - 2 * k);
      b.crouch = e; b.warm = e;
      const offs = b.twin ? [-.42, .42] : [0];
      for (const off of offs) { const [mx, mz] = muzzle(off);
        /* 빛이 포구로 빨려 들어간다: 가까워질수록 빨라지고 뜨거워진다 */
        if (Math.random() < .7) { const a = Math.random() * 6.283, r = 1.4 + Math.random() * .8, sx = mx + Math.cos(a) * r, sz = mz + Math.sin(a) * r, life = .22 + Math.random() * .12;
          P3(sx, .4, sz, 0, 0, 0, life, .045, 2, [1, .55 + Math.random() * .3, .3], { tail: .05, to: (p) => { const q = p.age / p.life, w = q * q; const [x2, z2] = muzzle(off);
            p.x = sx + (x2 - sx) * w; p.z = sz + (z2 - sz) * w; return 'pos'; } }); }
        const fl = k > .82 ? .75 + .25 * Math.sin(t * 70) : 1;          /* 쏘기 바로 전: 떨리듯 깜빡인다 */
        glow.add(mx, .45, mz, 0, 0, 0, (.08 + .22 * e) * fl, 0, FOE_C, 1, 7);
        glow.add(mx, .45, mz, 0, 0, 0, (.3 + 1.1 * e) * fl, 3, [1.2, .35, .12], .55 + .45 * e); }
      if (k >= 1) { fireBoss(offs); b.phase = 'idle'; b.pt = 0; b.wait = 1.05 + Math.random() * .55; b.sig = Math.max(T.sigMin, b.sig - T.sigStep); }
    }
    /* 몸: 모을 때 낮게 웅크리고 고개를 숙인다 → 쏘면 반동으로 뒤로 젖혀진다 */
    boss.position.set(b.x + b.kx - Math.sin(b.yaw) * b.recoil, .25 - b.crouch * .3, b.z + b.kz - Math.cos(b.yaw) * b.recoil);
    boss.rotation.set(0, b.yaw, 0);
    bossBody.rotation.set(b.crouch * .16 - b.recoil * .35 + b.pitch + Math.sin(t * 1.3) * .03, 0, lean + b.bank + Math.sin(t * .9) * .04);
    for (const m of bossMats) { m.emissive.setRGB(1 * b.flash + .9 * b.warm * .5, .95 * b.flash + .25 * b.warm * .5, .9 * b.flash + .08 * b.warm * .5); m.emissiveIntensity = 1.6; }
    /* 엔진 불: 뒤쪽 */
    const ex = b.x - Math.sin(b.yaw) * BOSS_LEN * .46, ez = b.z - Math.cos(b.yaw) * BOSS_LEN * .46;
    glow.add(ex, .3, ez, -Math.sin(b.yaw) * .7, 0, -Math.cos(b.yaw) * .7, .55, 3, [1.4, .5, .15], .9);
  }
  function fireBoss(offs) {
    const b = S.boss;
    for (const off of offs) { const [mx, mz] = muzzle(off); const a = Math.atan2(S.me.z - mz, S.me.x - mx) + off * .12;
      S.fb.push({ x: mx, z: mz, vx: Math.cos(a) * T.foeSp * foeK, vz: Math.sin(a) * T.foeSp * foeK, r: .28, age: 0 });
      flash(mx, mz, .9, [1.6, .6, .3], .1); spark(mx, mz, Math.cos(a), Math.sin(a), [1, .5, .2], 6, 9, .9); }
    b.recoil = .55; b.crouch = 0; b.warm = .4; shake(.06);
  }

  /* ───── 반사 ───── */
  function tryShield(bl) {
    const m = S.me, sh = S.sh; if (!sh.on) return false;
    const dx = bl.x - m.x, dz = bl.z - m.z, d = Math.hypot(dx, dz);
    if (d > T.shieldR + bl.r || d < .2) return false;
    const nx = dx / d, nz = dz / d; if (nx * sh.fx + nz * sh.fz < T.arcCos) return false;           /* 방패가 없는 쪽 */
    const perfect = sh.fresh && !sh.used && (S.t - sh.pressT) <= T.win;
    /* 막에 물결: 맞은 자리 (방패 기준 방향) */
    const ry = shield.rotation.y, lx = nx * Math.cos(ry) - nz * Math.sin(ry), lz = nx * Math.sin(ry) + nz * Math.cos(ry);
    shieldHits[hitSlot++ % 6].set(lx, 0, lz, S.t);
    const px = m.x + nx * T.shieldR, pz = m.z + nz * T.shieldR;
    if (perfect) {
      sh.used = true; sh.hot = 1;
      /* 너그러운 방향: 보스 쪽으로 대충 밀었으면 보스를 향해 곧게 */
      let ox = sh.fx, oz = sh.fz; const B = S.boss;
      if (!B.dead) { const ba = Math.atan2(B.z - pz, B.x - px), da = angD(ba - Math.atan2(oz, ox)); if (Math.abs(da) < T.assist) { ox = Math.cos(ba); oz = Math.sin(ba); } }
      S.chain = Math.min(S.chain + 1, 99);
      const ch = Math.min(S.chain, T.chainMax), dB = Math.hypot(B.x - m.x, B.z - m.z), near = clamp((T.nearOut - dB) / (T.nearOut - T.nearIn), 0, 1);
      const mul = (1 + (ch - 1) * T.chainK) * (1 + near * T.nearK);
      S.lb.push({ x: px, z: pz, vx: ox * T.lightSp, vz: oz * T.lightSp, r: .3 + ch * .02, dmg: T.lightDmg * mul, mul, ch, near, age: 0, weak: false, tr: 0 });
      chainUI();
      flash(px, pz, .6, [1.3, 1.3, 1.45], .1);
      spark(px, pz, sh.fx, sh.fz, [1, 1, 1], 12, 14, 1.1);
      ring(px, pz, { r0: .2, r1: 2.4, dur: .32, w: .14, spec: true, I: 1.1 });       /* 내 스킬이 터지는 순간에만 무지개 고리 */
      m.kx -= sh.fx * .7; m.kz -= sh.fz * .7;                                   /* 받아친 힘에 기체가 살짝 밀린다 */
      shake(.16 + ch * .015); hitStop(.085, .05); tag(px - sh.fx * .2, pz - 1.3, S.chain > 1 ? `완벽 반사 ${S.chain}연속` : '완벽 반사', 'ok');
    } else {
      /* 미리 들고 있던 막: 둥근 면에 맞아 힘없이 튕긴다 (방향은 맞은 자리의 각도대로) */
      const dd = bl.vx * nx + bl.vz * nz; let vx = bl.vx - 2 * dd * nx, vz = bl.vz - 2 * dd * nz;
      vx *= T.weakK; vz *= T.weakK;
      S.lb.push({ x: px, z: pz, vx, vz, r: .24, dmg: T.weakDmg, age: 0, weak: true, tr: 0 });
      breakChain();
      spark(px, pz, nx, nz, [.7, .75, .9], 5, 6); flash(px, pz, .45, [.6, .65, .8], .08);
      shake(.04); tag(px, pz, '약하게 튕김', 'meh');
    }
    return true;
  }

  /* 연속 완벽 반사: 화면 가운데 위에 숫자, 끊기면 흩어지듯 사라진다 */
  const chainEl = $('#chain'), chainB = $('#chain b');
  function chainUI() { chainB.textContent = S.chain; chainEl.classList.toggle('on', S.chain >= 2); chainEl.classList.remove('pop', 'broke'); void chainEl.offsetWidth; chainEl.classList.add('pop'); }
  function breakChain() { if (S.chain >= 2) { chainEl.classList.remove('pop'); void chainEl.offsetWidth; chainEl.classList.add('broke'); setTimeout(() => chainEl.classList.remove('on', 'broke'), 600); } S.chain = 0; }

  /* ───── 한 걸음 ───── */
  const v = new THREE.Vector3();
  const STARS = []; for (let i = 0; i < 140; i++) STARS.push([(Math.random() - .5) * 120, -40 - Math.random() * 60, (Math.random() - .7) * 120, Math.random()]);

  function step(dt) {
    S.t += dt; const t = S.t, m = S.me, sh = S.sh;

    /* 이동: 왼손 막대만큼 원하는 속도, 관성은 남는다 */
    if (!S.over) {
      const slow = S.fire.on && !sh.on ? T.fireMove : 1, st = S.stick, tvx = st.on ? st.x * T.move * slow : 0, tvz = st.on ? st.y * T.move * slow : 0;
      m.vx += (tvx - m.vx) * Math.min(1, dt * 11); m.vz += (tvz - m.vz) * Math.min(1, dt * 11);
      m.kx *= Math.pow(.004, dt); m.kz *= Math.pow(.004, dt);
      m.x = clamp(m.x + (m.vx + m.kx * 6) * dt, -FIELD.x + 1, FIELD.x - 1); m.z = clamp(m.z + (m.vz + m.kz * 6) * dt, FIELD.top + .9, FIELD.bottom - .7);
      const bt = bossTest(m.x, m.z, .7); if (bt) { const k = 1 / Math.sqrt((bt.u / (HL + .7)) ** 2 + (bt.w / (HW + .7)) ** 2);   /* 보스 몸 안으로는 못 들어간다 */
        const u = bt.u * k, w = bt.w * k; m.x = S.boss.x + bt.fx * u + bt.fz * w; m.z = S.boss.z + bt.fz * u - bt.fx * w; }
    }
    /* 고개: 쏘는 동안은 끈 쪽, 아니면 보스 쪽(오른쪽). 빠르지만 부드럽게 돈다 */
    const F = S.fire, firing = F.on && !sh.on, toB = bossDir(m.x, m.z), aim = firing ? [F.ax, F.az] : toB;
    const wantY = Math.atan2(-aim[0], -aim[1]), dY = angD(wantY - m.yaw);
    const turn = dY * Math.min(1, dt * (firing ? T.turnFire : T.turn)); m.yaw += turn;
    const hx = -Math.sin(m.yaw), hz = -Math.cos(m.yaw), rx = -hz, rz = hx;                 /* 기체 앞, 기체 오른쪽 */
    m.hx = hx; m.hz = hz;
    const side = m.vx * rx + m.vz * rz, back = -(m.vx * hx + m.vz * hz);
    m.roll += (clamp(-side * .085 - turn / Math.max(dt, 1e-4) * .045, -.8, .8) - m.roll) * Math.min(1, dt * 10);   /* 옆으로 가거나 돌 때 기운다 */
    m.pitch += (clamp(back * .03, -.25, .25) - m.pitch) * Math.min(1, dt * 8);
    me.rotation.order = 'YXZ';
    me.position.set(m.x, .15 + Math.sin(t * 1.6) * .05, m.z); me.rotation.set(m.pitch, m.yaw, m.roll);
    me.visible = m.hp > 0 && !(m.hitT > t - .9 && Math.floor(t * 28) % 2 === 1);

    /* 기본탄: 누르고 있는 동안만 */
    S.fire.cd -= dt;
    if (S.fire.on && !sh.on && S.fire.cd <= 0 && m.hp > 0 && !S.over) { S.fire.cd = T.fireEvery;
      const hx = m.hx, hz = m.hz, rx = -hz, rz = hx;
      for (const gx of [-.36, .36]) { const x = m.x + hx * .85 + rx * gx, z = m.z + hz * .85 + rz * gx;
        S.mb.push({ x, z, vx: hx * T.shotSp, vz: hz * T.shotSp, age: 0 }); P3(x, .35, z, hx * 2, 0, hz * 2, .06, .3, 3, [.8, 1, 1.4], { drag: 0, grow: 2 }); }
      m.kx -= hx * .025; m.kz -= hz * .025; }                                           /* 반동이 기체를 살짝 뒤로 민다 */

    /* 방패 상태: 막 눌렀을 때 가장 밝고, 들고 있을수록 식는다 */
    if (sh.on && !sh.used && sh.fresh && t - sh.pressT > T.win) { sh.fresh = false; sh.lock = t + T.whiff; breakChain(); }   /* 헛침 */
    const ageS = t - sh.pressT, freshNow = sh.on && sh.fresh && !sh.used && ageS <= T.win;
    sh.I += ((sh.on ? (freshNow ? 1.5 : .42) : 0) - sh.I) * Math.min(1, dt * (sh.on ? 30 : 12));
    sh.hot *= Math.pow(.002, dt); if (freshNow) sh.hot = Math.max(sh.hot, 1 - ageS / T.win);
    shield.visible = sh.I > .02; shield.position.set(m.x, .25, m.z);
    shield.rotation.y = Math.atan2(-sh.fx, -sh.fz);
    shield.scale.set(T.shieldR, T.shieldR * .5, T.shieldR);
    shieldMat.uniforms.uI.value = sh.I; shieldMat.uniforms.uHot.value = sh.hot * .8; shieldMat.uniforms.uT.value = t;

    bossTick(dt);

    /* 보스 탄 */
    for (let i = S.fb.length - 1; i >= 0; i--) { const b = S.fb[i]; b.age += dt; let gone = false;
      for (let s = 0; s < 2 && !gone; s++) { b.x += b.vx * dt / 2; b.z += b.vz * dt / 2;
        if (tryShield(b)) { gone = true; break; }
        if (m.hp > 0 && m.inv < t && Math.hypot(b.x - m.x, (b.z - m.z) * 1.15) < .5 + b.r) { playerHit(b); gone = true; } }
      if (gone || b.age > 3 || Math.abs(b.x) > FIELD.x + 3 || b.z > FIELD.bottom + 3 || b.z < FIELD.top - 3) { S.fb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), tl = .55;
      glow.add(b.x, .35, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r, 0, FOE_C, 1, i);
      glow.add(b.x, .35, b.z, 0, 0, 0, b.r * 2.6, 3, [1, .25, .1], .35); }

    /* 기본탄 */
    for (let i = S.mb.length - 1; i >= 0; i--) { const b = S.mb[i]; b.age += dt; b.x += b.vx * dt; b.z += b.vz * dt; let gone = false;
      if (bossTest(b.x, b.z, .06)) { bossHit(T.shotDmg, b.x, b.z, b.vx, b.vz, false); gone = true; }
      if (gone || b.age > 1.4 || Math.abs(b.x) > FIELD.x + 2 || b.z < FIELD.top - 2 || b.z > FIELD.bottom + 2) { S.mb.splice(i, 1); continue; }
      glow.add(b.x, .33, b.z, -b.vx * .024, 0, -b.vz * .024, .08, 2, [.55, .75, 1.3], 1, i); }

    /* 받아친 빛: 연속 완벽 반사가 길수록 더 갈라지고 굵다 */
    for (let i = S.lb.length - 1; i >= 0; i--) { const b = S.lb[i]; b.age += dt; let gone = false;
      for (let s = 0; s < 4 && !gone; s++) { b.x += b.vx * dt / 4; b.z += b.vz * dt / 4;
        if (bossTest(b.x, b.z, b.r)) {
          bossHit(b.dmg, b.x, b.z, b.vx, b.vz, !b.weak);
          if (!b.weak && b.mul > 1.05) tag(b.x, b.z - .9, `피해 ×${b.mul.toFixed(1)}` + (b.near > .3 ? ' · 가까이' : ''), 'big');
          gone = true; } }
      if (gone || b.age > 3 || Math.abs(b.x) > FIELD.x + 3 || b.z > FIELD.bottom + 3 || b.z < FIELD.top - 3) { S.lb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), split = Math.min(1, (b.ch - 1 || 0) / (T.chainMax - 1));
      if (b.weak) glow.add(b.x, .35, b.z, -b.vx / sp * .4, 0, -b.vz / sp * .4, b.r, 0, [.5, .6, .9], .8, i);
      else {
        const tl = 1.5 + split * .9;
        glow.add(b.x, .38, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r * (1 + split * .35), 1 + split * .4, [.8, .9, 1.1], 1, i);
        glow.add(b.x, .38, b.z, 0, 0, 0, b.r * (3 + split * 2), 3, [.6, .7, 1], .3 + split * .25);
        /* 지나간 자리에 갈라진 빛이 잠깐 남는다 */
        b.tr += dt; if (b.tr > .016) { b.tr = 0; P3(b.x, .38, b.z, 0, 0, 0, .18 + split * .14, b.r * .7, 1 + split * .4, [.7, .8, 1], { drag: 0, grow: -.6, a: .5 }); }
      } }


    /* 파편: 돌면서 날아가고 식는다 */
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
    for (const s of STARS) { s[2] += dt * (1 + s[3]); if (s[2] > 60) s[2] -= 120; glow.add(s[0], s[1], s[2], 0, 0, 0, .06 + s[3] * .1, 3, [.7, .75, .9], .35 + s[3] * .4); }
  }

  function playerHit(b) {
    const m = S.me; m.hp = Math.max(0, m.hp - T.hitHp); m.hitT = S.t; m.inv = S.t + .9; breakChain();
    spark(b.x, b.z, -b.vx, -b.vz, [1, .4, .2], 12, 8); flash(b.x, b.z, .8, [1.6, .5, .2], .12); shake(.25); hitStop(.05, .1);
    const vg = $('#hurt'); vg.classList.remove('on'); void vg.offsetWidth; vg.classList.add('on');
    if (m.hp <= 0) { const x = m.x, z = m.z; flash(x, z, 2.2, [2, 1.5, 1.2], .2);
      for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 4; P3(x, .4, z, Math.cos(a) * s, 1, Math.sin(a) * s, .5 + Math.random() * .5, .3 + Math.random() * .4, 3, [1.3, .5, .15], { drag: 3, grow: -.4 }); }
      debris(x, z, 0, 1, 10, 7); S.sh.on = false; S.fire.on = false; S.slowT = .7; S.ts = .3; setTimeout(() => endGame(false), 1300); }
  }

  /* ───── 화면 크기 ───── */
  let Wd = 2, Hd = 2;
  function size() { const r = canvas.getBoundingClientRect(), DPR = Math.min(1.75, devicePixelRatio || 1); Wd = Math.max(2, Math.round(r.width * DPR)); Hd = Math.max(2, Math.round(r.height * DPR));
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); skyMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size();

  /* ───── 손 ───── */
  const fireDir = $('#fire .dir'), fireKnob = $('#fire .knob');
  function fireAim(e) { const F = S.fire, dx = e.clientX - F.ox, dy = e.clientY - F.oy, l = Math.hypot(dx, dy);
    if (l > 9) { F.ax = dx / l; F.az = dy / l; }
    const k = Math.min(1, l / 40); fireKnob.style.transform = `translate(${F.ax * 30 * k}px,${F.az * 30 * k}px)`;
    fireDir.style.transform = `rotate(${Math.atan2(F.ax, -F.az)}rad)`; }
  const fireB = $('#fire'), refB = $('#reflect'), stickEl = $('#stick'), knob = $('#stick i'), refKnob = $('#reflect .knob'), arc = $('#reflect .arc');
  function shieldDir(e) { const sh = S.sh, dx = e.clientX - sh.ox, dy = e.clientY - sh.oy, l = Math.hypot(dx, dy);
    if (l > 9) { sh.fx = dx / l; sh.fz = dy / l; }
    const k = Math.min(1, l / 40); refKnob.style.transform = `translate(${sh.fx * 30 * k}px,${sh.fz * 30 * k}px)`; }
  function drawArc() { arc.style.transform = `rotate(${Math.atan2(S.sh.fx, -S.sh.fz)}rad)`; }
  addEventListener('pointerdown', e => {
    if (!S.run || S.over || e.target.closest('#speed')) return;
    if (e.target.closest('#fire')) { const d0 = bossDir(S.me.x, S.me.z); Object.assign(S.fire, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, ax: d0[0], az: d0[1] }); fireB.classList.add('on'); fireAim(e); e.preventDefault(); return; }
    if (e.target.closest('#reflect')) { const sh = S.sh; const d0 = bossDir(S.me.x, S.me.z); Object.assign(sh, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, fx: d0[0], fz: d0[1], pressT: S.t, fresh: S.t >= sh.lock, used: false });
      refB.classList.add('on'); refB.classList.toggle('stale', !sh.fresh); shieldDir(e); drawArc();
      /* 이미 방패 범위 안에 들어온 탄이 있으면 바로 받아친다 */
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
    if (e.pointerId === S.fire.id) { S.fire.on = false; S.fire.id = -1; fireB.classList.remove('on'); fireKnob.style.transform = ''; fireDir.style.transform = 'rotate(90deg)'; }
    if (e.pointerId === S.sh.id) { const sh = S.sh; if (sh.fresh && !sh.used && S.t - sh.pressT <= T.win) { sh.lock = S.t + T.whiff; breakChain(); }   /* 아무것도 못 받고 뗌 = 헛침 */
      sh.on = false; sh.id = -1; refB.classList.remove('on', 'stale'); refKnob.style.transform = ''; }
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('contextmenu', e => e.preventDefault());

  /* 적 탄 속도: 바꾸면 날아가던 탄도 그 빠르기로 바뀐다 */
  const spIn = $('#speed input'), spB = $('#speed b');
  spIn.addEventListener('input', () => { const k = spIn.value / 100, r = k / foeK; foeK = k; spB.textContent = spIn.value + '%';
    for (const b of S.fb) { b.vx *= r; b.vz *= r; } });

  /* ───── 판 시작·끝 ───── */
  function reset() {
    Object.assign(S, { t: 0, ts: 1, stopT: 0, slowT: 0, shakeA: 0, over: false });
    Object.assign(S.me, { x: -6.5, z: BZ, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kx: 0, kz: 0, yaw: -Math.PI / 2, hx: 1, hz: 0 });
    Object.assign(S.boss, { x: BX, z: BZ, hp: T.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.6, sig: T.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: -Math.PI / 2, dead: false, drift: 0 });
    Object.assign(S.sh, { on: false, id: -1, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0, fx: 1, fz: 0 }); S.chain = 0; chainEl.classList.remove('on', 'pop', 'broke');
    Object.assign(S.fire, { on: false, ax: 1, az: 0 }); S.stick.on = false; S.fb.length = 0; S.mb.length = 0; S.lb.length = 0; S.parts.length = 0;
    for (const e of S.rings) { scene.remove(e.mesh); e.m.dispose(); } S.rings.length = 0;
    for (const d of DEB) d.o.visible = false;
    boss.visible = true; drawArc();
  }
  function endGame(win) { S.over = true; S.run = false;
    $('#end h2').textContent = win ? '격파' : '격추';
    $('#end p').textContent = win ? `${S.t.toFixed(1)}초 만에 보스를 무너뜨렸어요` : `보스 체력 ${Math.ceil(S.boss.hp / T.bossHp * 100)}% 남았어요`;
    $('#end').hidden = false; }
  $('#go').addEventListener('click', () => { $('#how').hidden = true; reset(); S.run = true; });
  $('#again').addEventListener('click', () => { $('#end').hidden = true; reset(); S.run = true; });

  /* ───── 화면 위 숫자 ───── */
  const meBar = $('#hpMe i'), bossBar = $('#hpBoss i'), sigEl = $('#sig b');
  function hud() { meBar.style.transform = `scaleX(${S.me.hp})`; bossBar.style.transform = `scaleX(${Math.max(0, S.boss.hp / T.bossHp)})`;
    sigEl.textContent = S.boss.sig.toFixed(2) + '초'; refB.classList.toggle('locked', S.t < S.sh.lock && !S.sh.on); }

  /* ───── 그리기 ───── */
  let last = performance.now(), frame = 0;
  renderer.setAnimationLoop(now => {
    const real = Math.min(.05, (now - last) / 1000); last = now;
    /* 멈칫(받아친 순간)·느려짐(터질 때) */
    if (S.stopT > 0) S.stopT -= real; else if (S.slowT > 0) { S.slowT -= real; S.ts += (.3 - S.ts) * Math.min(1, real * 10); } else S.ts += (1 - S.ts) * Math.min(1, real * 16);
    const dt = (S.run || S.over ? real : real * .25) * S.ts;
    glow.begin(); step(S.run || S.over ? dt : 0); glow.end();
    glow.uT.value = S.t;
    S.shakeA *= Math.pow(.004, real * .6);
    const sh = S.shakeA, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
    camera.position.set(CAM.x + S.me.x * .05 + sx, CAM.y, CAM.z + S.me.z * .05 + sz); camera.lookAt(LOOK.x + S.me.x * .05 + sx * .5, 0, LOOK.z + S.me.z * .05 + sz * .5);
    skyMat.uniforms.uT.value = S.t; skyMat.uniforms.uYaw.value = S.t * P.spin + P.yaw0;
    if ((frame++ & 1) === 0) { renderer.setRenderTarget(skyRT); renderer.render(skyScene, bgCam); }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth();
    renderer.render(scene, camera);
    bloom.render(Wd, Hd);
    hud();
  });
  onProgress(1);
  reset();
  window.__rt = { S, T, reset, camera, CAM, LOOK, boss, go: () => { $('#how').hidden = true; reset(); S.run = true; } };   /* 검사용 */
}
