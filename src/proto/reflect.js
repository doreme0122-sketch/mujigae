/* 반사 시험판 — 손맛만 확인하는 작은 경기장 하나
   위에서 내려다본 뷰. 화면 위쪽 = -Z, 오른쪽 = +X, 바닥 평면 XZ.
   · 보스는 쏘기 직전에 빛을 모으고 몸을 움츠린다(신호). 판이 흐를수록 신호가 짧아진다.
   · 반사: 누른 채 끌면 방패가 그쪽으로 돈다. 방패는 앞쪽 1/3만 막는다.
     닿기 직전에 막 누르면 완벽 반사(빛이 갈라지며 엄지를 민 쪽으로 곧게), 미리 들고 있었으면 둥근 막에 맞아 약하게 튕길 뿐.
   · 거울 기둥(육각 결정)은 빛을 면의 각도대로 꺾는다. 꺾일 때마다 빛이 더 갈라지고 세진다 = 콤보. */
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

/* ───── 손맛 숫자 (여기만 바꿔 가며 맞춘다) ───── */
const T = {
  move: 9,                       /* 최고 이동 속도 */
  fireEvery: .12, shotSp: 21, shotDmg: .6,
  foeSp: 15.5,                   /* 보스 탄: 적고 빠르다 */
  sig0: .9, sigMin: .3, sigStep: .035,   /* 신호 길이: 처음 0.9초 → 쏠 때마다 줄어 0.3초까지 */
  win: .18,                      /* 완벽 반사로 쳐 주는 시간 (누른 뒤) */
  whiff: .38,                    /* 헛치면 이만큼 완벽 반사가 안 된다 */
  shieldR: 1.35, arcCos: .5,     /* 방패 반지름, 앞쪽 120도 */
  lightSp: 28, lightDmg: 14, bounceK: 1.5, maxBounce: 4,
  weakK: .6, weakDmg: 2,
  bossHp: 320, hitHp: .2
};
const FIELD = { x: 10.6, top: -6.4, bottom: 5.4 };
const FOE_C = [1, .22, .12];
let foeK = 1;                    /* 화면 위 막대로 바꾸는 적 탄 빠르기 (시험용) */

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .5, 400);
  const CAM = new THREE.Vector3(0, 25, 6.2), LOOK = new THREE.Vector3(0, 0, -.35);
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
  let BOSS_LEN = 5.2, BOSS_R = 1.9;
  { const m = bossG.scene, b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); const k = BOSS_LEN / Math.max(s.x, s.z); h.scale.setScalar(k); h.rotation.y = Math.PI; bossBody.add(h);   /* 창끝(앞)이 나를 향하게 */
    BOSS_R = Math.max(s.x, s.z) * k * .42; }
  const bossMats = []; bossBody.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); bossMats.push(o.material); } });

  /* 방패: 얇은 막 반구, 앞쪽 1/3만 */
  const shieldMat = filmMaterial(); shieldMat.uniforms.uArc.value = .4;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), shieldMat); shield.renderOrder = 11; scene.add(shield);

  /* 거울 기둥: 육각 결정. 면마다 각도가 있어 빛이 그 면대로 꺾인다 */
  const PILLARS = [{ x: -6.3, z: -1.6, rot: 0 }, { x: 6.3, z: -1.6, rot: 0 }]   /* 안쪽 면이 나와 보스 사이를 향한다 */.map(p => {
    const R = .66, geo = new THREE.CylinderGeometry(R, R * 1.08, 1.9, 6, 1);
    const mat = crystalMaterial(); mat.emissive = new THREE.Color(.25, .32, .55); mat.emissiveIntensity = .3;
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(p.x, .4, p.z); mesh.rotation.y = p.rot; scene.add(mesh);
    return { ...p, R, ap: R * Math.cos(Math.PI / 6), mesh, mat, pulse: 0 }; });

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
    me: { x: 0, z: 3.4, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kick: 0, kx: 0, kz: 0 },
    boss: { x: 0, z: -4.3, hp: T.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.4, sig: T.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: 0, dead: false },
    stick: { on: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 },
    fire: { on: false, id: -1, cd: 0 },
    sh: { on: false, id: -1, ox: 0, oy: 0, fx: 0, fz: -1, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0 },
    fb: [], mb: [], lb: [], parts: [], rings: [], hits: 0
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

  /* ───── 육각 기둥 충돌: 겹치면 그 면의 바깥 방향을 돌려준다 ───── */
  function hexHit(p, x, z, r) {
    const dx = x - p.x, dz = z - p.z; if (dx * dx + dz * dz > (p.R + r + .2) ** 2) return null;
    let best = -1e9, bn = null;
    for (let i = 0; i < 6; i++) { const a = p.rot + Math.PI / 6 + i * Math.PI / 3, nx = Math.sin(a), nz = Math.cos(a), d = dx * nx + dz * nz; if (d > best) { best = d; bn = [nx, nz]; } }
    return best < p.ap + r ? { nx: bn[0], nz: bn[1], pen: p.ap + r - best } : null;
  }
  const mirror = (b, n) => { const d = b.vx * n.nx + b.vz * n.nz; if (d >= 0) return false; b.vx -= 2 * d * n.nx; b.vz -= 2 * d * n.nz; b.x += n.nx * n.pen; b.z += n.nz * n.pen; return true; };

  /* ───── 보스 ───── */
  const muzzle = (off = 0) => { const b = S.boss, a = b.yaw, f = BOSS_LEN * .44;
    return [b.x + Math.sin(a) * f + Math.cos(a) * off, b.z + Math.cos(a) * f - Math.sin(a) * off]; };

  function bossHit(dmg, x, z, vx, vz, heavy) {
    const b = S.boss; if (b.dead) return;
    b.hp -= dmg; const sp = Math.hypot(vx, vz) || 1, nx = vx / sp, nz = vz / sp;
    if (heavy) {                                 /* 세게 맞음: 밀리고 기울고 겉 조각이 떨어진다 */
      b.flash = 1; b.kx += nx * 1.1; b.kz += nz * 1.1; b.bank += clamp(nx * .9, -.6, .6); b.pitch -= nz * .35;
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
    b.drift = (b.drift || 0) + dt * hold; const tx = Math.sin(b.drift * .42) * 3.4;
    const ox = b.x; b.x += (tx - b.x) * Math.min(1, dt * 1.8);
    const want = Math.atan2(S.me.x - b.x, S.me.z - b.z); b.yaw += (clamp(want, -.6, .6) - b.yaw) * Math.min(1, dt * (b.phase === 'charge' ? 6 : 2.5));
    b.kx *= Math.pow(.02, dt); b.kz *= Math.pow(.02, dt); b.bank *= Math.pow(.03, dt); b.pitch *= Math.pow(.03, dt); b.recoil *= Math.pow(.008, dt);
    b.flash *= Math.pow(.0006, dt);
    const lean = clamp(-(b.x - ox) / Math.max(dt, 1e-4) * .05, -.25, .25);

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
      S.fb.push({ x: mx, z: mz, vx: Math.cos(a) * T.foeSp * foeK, vz: Math.sin(a) * T.foeSp * foeK, r: .28, age: 0, bn: 0 });
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
      S.lb.push({ x: px, z: pz, vx: sh.fx * T.lightSp, vz: sh.fz * T.lightSp, r: .3, dmg: T.lightDmg, bn: 0, age: 0, weak: false, tr: 0 });
      flash(px, pz, .6, [1.3, 1.3, 1.45], .1);
      spark(px, pz, sh.fx, sh.fz, [1, 1, 1], 12, 14, 1.1);
      ring(px, pz, { r0: .2, r1: 2.4, dur: .32, w: .14, spec: true, I: 1.1 });       /* 내 스킬이 터지는 순간에만 무지개 고리 */
      m.kx -= sh.fx * .7; m.kz -= sh.fz * .7;                                   /* 받아친 힘에 기체가 살짝 밀린다 */
      shake(.16); hitStop(.085, .05); tag(px - sh.fx * .2, pz - 1.3, '완벽 반사', 'ok');
    } else {
      /* 미리 들고 있던 막: 둥근 면에 맞아 힘없이 튕긴다 (방향은 맞은 자리의 각도대로) */
      const dd = bl.vx * nx + bl.vz * nz; let vx = bl.vx - 2 * dd * nx, vz = bl.vz - 2 * dd * nz;
      vx *= T.weakK; vz *= T.weakK;
      S.lb.push({ x: px, z: pz, vx, vz, r: .24, dmg: T.weakDmg, bn: 0, age: 0, weak: true, tr: 0 });
      spark(px, pz, nx, nz, [.7, .75, .9], 5, 6); flash(px, pz, .45, [.6, .65, .8], .08);
      shake(.04); tag(px, pz, '약하게 튕김', 'meh');
    }
    return true;
  }

  /* ───── 한 걸음 ───── */
  const v = new THREE.Vector3();
  const STARS = []; for (let i = 0; i < 140; i++) STARS.push([(Math.random() - .5) * 120, -40 - Math.random() * 60, (Math.random() - .7) * 120, Math.random()]);

  function step(dt) {
    S.t += dt; const t = S.t, m = S.me, sh = S.sh;

    /* 이동: 왼손 막대만큼 원하는 속도, 관성은 남는다 */
    if (!S.over) {
      const st = S.stick, tvx = st.on ? st.x * T.move : 0, tvz = st.on ? st.y * T.move : 0;
      m.vx += (tvx - m.vx) * Math.min(1, dt * 11); m.vz += (tvz - m.vz) * Math.min(1, dt * 11);
      m.kx *= Math.pow(.004, dt); m.kz *= Math.pow(.004, dt);
      m.x = clamp(m.x + (m.vx + m.kx * 6) * dt, -FIELD.x + 1, FIELD.x - 1); m.z = clamp(m.z + (m.vz + m.kz * 6) * dt, -1.2, FIELD.bottom - .7);
    }
    m.roll += (clamp(-m.vx * .085, -.7, .7) - m.roll) * Math.min(1, dt * 10);
    m.pitch += (clamp(m.vz * .03, -.25, .25) - m.pitch) * Math.min(1, dt * 8);
    me.position.set(m.x, .15 + Math.sin(t * 1.6) * .05, m.z); me.rotation.set(m.pitch, 0, m.roll);
    me.visible = m.hp > 0 && !(m.hitT > t - .9 && Math.floor(t * 28) % 2 === 1);

    /* 기본탄: 누르고 있는 동안만 */
    S.fire.cd -= dt;
    if (S.fire.on && !sh.on && S.fire.cd <= 0 && m.hp > 0 && !S.over) { S.fire.cd = T.fireEvery;
      for (const gx of [-.36, .36]) { const x = m.x + gx, z = m.z - .85; S.mb.push({ x, z, vx: 0, vz: -T.shotSp, age: 0 }); P3(x, .35, z, 0, 0, -2, .06, .3, 3, [.8, 1, 1.4], { drag: 0, grow: 2 }); } }

    /* 방패 상태: 막 눌렀을 때 가장 밝고, 들고 있을수록 식는다 */
    if (sh.on && !sh.used && sh.fresh && t - sh.pressT > T.win) { sh.fresh = false; sh.lock = t + T.whiff; }   /* 헛침 */
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
        for (const p of PILLARS) { const h = hexHit(p, b.x, b.z, b.r); if (h && mirror(b, h)) { b.bn++; p.pulse = .6; spark(b.x, b.z, h.nx, h.nz, [1, .5, .25], 5, 6); } }
        if (m.hp > 0 && m.inv < t && Math.hypot(b.x - m.x, (b.z - m.z) * 1.15) < .5 + b.r) { playerHit(b); gone = true; } }
      if (gone || b.age > 3 || Math.abs(b.x) > FIELD.x + 3 || b.z > FIELD.bottom + 3 || b.z < FIELD.top - 3) { S.fb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), tl = .55;
      glow.add(b.x, .35, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r, 0, FOE_C, 1, i);
      glow.add(b.x, .35, b.z, 0, 0, 0, b.r * 2.6, 3, [1, .25, .1], .35); }

    /* 기본탄 */
    for (let i = S.mb.length - 1; i >= 0; i--) { const b = S.mb[i]; b.age += dt; b.x += b.vx * dt; b.z += b.vz * dt; let gone = false;
      for (const p of PILLARS) if (hexHit(p, b.x, b.z, .06)) { spark(b.x, b.z, 0, 1, [.7, .85, 1.2], 3, 5); gone = true; }
      if (!gone && !S.boss.dead && Math.hypot(b.x - S.boss.x, (b.z - S.boss.z) * 1.2) < BOSS_R) { bossHit(T.shotDmg, b.x, b.z, b.vx, b.vz, false); gone = true; }
      if (gone || b.z < FIELD.top - 2) { S.mb.splice(i, 1); continue; }
      glow.add(b.x, .33, b.z, 0, 0, .5, .08, 2, [.55, .75, 1.3], 1, i); }

    /* 받아친 빛: 기둥 면에서 꺾이고, 꺾일 때마다 더 갈라지고 세진다 */
    for (let i = S.lb.length - 1; i >= 0; i--) { const b = S.lb[i]; b.age += dt; let gone = false;
      for (let s = 0; s < 4 && !gone; s++) { b.x += b.vx * dt / 4; b.z += b.vz * dt / 4;
        for (const p of PILLARS) { const h = hexHit(p, b.x, b.z, b.r); if (h && mirror(b, h)) {
            if (b.bn < T.maxBounce) { b.bn++; if (!b.weak) { b.dmg *= T.bounceK; b.vx *= 1.06; b.vz *= 1.06; } }
            p.pulse = 1;
            flash(b.x, b.z, b.weak ? .35 : .55, b.weak ? [.5, .55, .7] : [1.3, 1.3, 1.45], .09);
            /* 결정에 부딪힌 빛이 색마다 다른 각도로 흩어진다 */
            const a0 = Math.atan2(b.vz, b.vx);
            if (!b.weak) for (let j = 0; j < 14; j++) { const f = j / 13, a = a0 + (f - .5) * .9, s2 = 7 + Math.random() * 6;
              P3(b.x, .4, b.z, Math.cos(a) * s2, Math.random() * 2, Math.sin(a) * s2, .3 + Math.random() * .15, .055, 2, hueRGB(f * .83), { drag: 5, tail: .05 }); }
            shake(b.weak ? .03 : .09);
            if (!b.weak) tag(b.x, b.z - 1.1, '꺾임 ' + b.bn, 'bn'); } }
        if (!S.boss.dead && Math.hypot(b.x - S.boss.x, (b.z - S.boss.z) * 1.1) < BOSS_R + b.r) {
          bossHit(b.dmg, b.x, b.z, b.vx, b.vz, !b.weak);
          if (!b.weak) { if (b.bn > 0) tag(b.x, b.z - .9, `꺾임 ${b.bn}번 · 피해 ×${(T.bounceK ** b.bn).toFixed(1)}`, 'big'); }
          gone = true; } }
      if (gone || b.age > 3 || Math.abs(b.x) > FIELD.x + 3 || b.z > FIELD.bottom + 3 || b.z < FIELD.top - 3) { S.lb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz), split = Math.min(1, b.bn / 2);
      if (b.weak) glow.add(b.x, .35, b.z, -b.vx / sp * .4, 0, -b.vz / sp * .4, b.r, 0, [.5, .6, .9], .8, i);
      else {
        const tl = 1.5 + split * .8;
        glow.add(b.x, .38, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r * (1 + split * .35), 1 + split * .4, [.8, .9, 1.1], 1, i);
        glow.add(b.x, .38, b.z, 0, 0, 0, b.r * (3 + split * 2), 3, [.6, .7, 1], .3 + split * .25);
        /* 지나간 자리에 갈라진 빛이 잠깐 남는다 */
        b.tr += dt; if (b.tr > .016) { b.tr = 0; P3(b.x, .38, b.z, 0, 0, 0, .18 + split * .12, b.r * .7, 1 + split * .4, [.7, .8, 1], { drag: 0, grow: -.6, a: .5 }); }
      } }

    /* 기둥: 맞으면 안쪽에서 빛이 번진다 */
    for (const p of PILLARS) { p.pulse *= Math.pow(.02, dt); p.mat.emissiveIntensity = .3 + p.pulse * 2.4; p.mesh.position.y = .4 + Math.sin(t * .8 + p.x) * .04; }

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
    if (me.visible) for (const p of ENG) { v.copy(p).applyMatrix4(shipModel.matrixWorld); const fl = (1 + Math.max(0, -m.vz) * .06) * (.9 + .1 * Math.sin(t * 40 + p.x * 9));
      glow.add(v.x, v.y, v.z + .05, 0, 0, .8 * fl, .15, 1, [.4, .6, 1.4], .9);
      glow.add(v.x, v.y, v.z + .22, 0, 0, .5 * fl, .4 * fl, 3, [.25, .45, 1.3], .7); }
    for (const s of STARS) { s[2] += dt * (1 + s[3]); if (s[2] > 60) s[2] -= 120; glow.add(s[0], s[1], s[2], 0, 0, 0, .06 + s[3] * .1, 3, [.7, .75, .9], .35 + s[3] * .4); }
  }

  function playerHit(b) {
    const m = S.me; m.hp = Math.max(0, m.hp - T.hitHp); m.hitT = S.t; m.inv = S.t + .9;
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
  const fireB = $('#fire'), refB = $('#reflect'), stickEl = $('#stick'), knob = $('#stick i'), refKnob = $('#reflect .knob'), arc = $('#reflect .arc');
  function shieldDir(e) { const sh = S.sh, dx = e.clientX - sh.ox, dy = e.clientY - sh.oy, l = Math.hypot(dx, dy);
    if (l > 9) { sh.fx = dx / l; sh.fz = dy / l; }
    const k = Math.min(1, l / 40); refKnob.style.transform = `translate(${sh.fx * 30 * k}px,${sh.fz * 30 * k}px)`; }
  function drawArc() { arc.style.transform = `rotate(${Math.atan2(S.sh.fx, -S.sh.fz)}rad)`; }
  addEventListener('pointerdown', e => {
    if (!S.run || S.over || e.target.closest('#speed')) return;
    if (e.target.closest('#fire')) { S.fire.on = true; S.fire.id = e.pointerId; fireB.classList.add('on'); e.preventDefault(); return; }
    if (e.target.closest('#reflect')) { const sh = S.sh; Object.assign(sh, { on: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, fx: 0, fz: -1, pressT: S.t, fresh: S.t >= sh.lock, used: false });
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
  });
  const up = e => {
    if (e.pointerId === S.stick.id) { S.stick.on = false; S.stick.id = -1; stickEl.classList.remove('on'); }
    if (e.pointerId === S.fire.id) { S.fire.on = false; S.fire.id = -1; fireB.classList.remove('on'); }
    if (e.pointerId === S.sh.id) { const sh = S.sh; if (sh.fresh && !sh.used && S.t - sh.pressT <= T.win) sh.lock = S.t + T.whiff;   /* 아무것도 못 받고 뗌 = 헛침 */
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
    Object.assign(S.me, { x: 0, z: 3.4, vx: 0, vz: 0, roll: 0, pitch: 0, hp: 1, inv: 0, hitT: -9, kx: 0, kz: 0 });
    Object.assign(S.boss, { x: 0, z: -4.3, hp: T.bossHp, flash: 0, warm: 0, phase: 'idle', pt: 0, wait: 1.6, sig: T.sig0, twin: false, kx: 0, kz: 0, bank: 0, pitch: 0, recoil: 0, crouch: 0, yaw: 0, dead: false, drift: 0 });
    Object.assign(S.sh, { on: false, id: -1, pressT: -9, fresh: false, used: false, lock: 0, I: 0, hot: 0, fx: 0, fz: -1 });
    S.fire.on = false; S.stick.on = false; S.fb.length = 0; S.mb.length = 0; S.lb.length = 0; S.parts.length = 0;
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
    camera.position.set(CAM.x + S.me.x * .08 + sx, CAM.y, CAM.z + S.me.z * .05 + sz); camera.lookAt(LOOK.x + S.me.x * .08 + sx * .5, 0, LOOK.z + S.me.z * .05 + sz * .5);
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
