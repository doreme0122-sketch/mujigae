/* 스킬 미리보기 전투 무대 — 1챕터 용암 행성 위 궤도, 위에서 내려다본 뷰(탑 뷰)
   내 기체(1번 선봉) + 1챕터 적 기체 + 탄·폭발·빛. 스킬은 skills.js 의 공용 블록이 이 무대를 움직인다.
   좌표: 바닥 평면 XZ (y=0), 화면 위쪽 = -Z (앞), 오른쪽 = +X */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11021559';
import * as Q from '../core/quality.js?v=11021559';
import { buildShip, engineSpots } from '../core/ships/build.js';
import { planetShader } from '../core/planet.js';
import { planetFor } from '../data/planets.js';
import { makeGlow } from './glow.js';
import { filmMaterial, beamMaterial, ringMaterial, ghostMaterial, crystalMaterial } from './fxmat.js';

const M = new URL('../../assets/models/', import.meta.url).href;
export const FIELD = { x: 8.6, top: -12.5, bottom: 6.5 };          /* 보이는 싸움터 */
const LAVA = [1, .34, .08], FOE_SHOT = [1, .22, .12];
const hueRGB = h => { const f = n => { const k = (n + h * 6) % 6; return Math.max(0, Math.min(1, Math.abs(k - 3) - 1)); }; return [f(0), f(4), f(2)]; };

export async function createWorld(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, .5, 400);
  const CAM = new THREE.Vector3(0, 25, 8.4), LOOK = new THREE.Vector3(0, 0, -3.3);
  const INSET = { l: 0, t: 0, b: 0 };   /* 화면 왼쪽 메뉴·위아래 글자만큼 무대 가운데를 옮김 (픽셀) */
  const bloom = makeBloom(renderer, { samples: Q.tier().aa });

  /* 주변 빛: 위쪽 해 + 아래 행성에서 올라오는 용암빛 */
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.2); sun.position.set(-6, 14, -4); scene.add(sun);
  const lava = new THREE.DirectionalLight(0xff7a3c, 1.6); lava.position.set(4, -6, 3); scene.add(lava);
  const fill = new THREE.DirectionalLight(0x9fb8ff, .7); fill.position.set(6, 6, 8); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x8090b0, 0x3a1c10, .55));

  /* 아래로 보이는 적 행성 (메인 화면과 같은 계산), 반 크기로 그려 붙임 */
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
  const loader = new GLTFLoader();
  const loadM = f => loader.loadAsync(M + f);
  onProgress(.05);
  const [ship, ...foeG] = await Promise.all([
    buildShip(1, 1, 'ruby', { renderer, size: 2.3 }).then(r => (onProgress(.6), r)),
    loadM('s1_a.glb'), loadM('s1_b.glb'), loadM('s1_c.glb'), loadM('s1_elite.glb')]);
  onProgress(.9);

  const me = new THREE.Group(); me.add(ship.root); scene.add(me);
  const shipModel = ship.root.children[0];
  const shipSz = new THREE.Box3().setFromObject(shipModel).getSize(new THREE.Vector3());
  const ENG = engineSpots(ship.ship, shipModel, shipSz);
  /* 기체 겉면 점들 — 순간이동 때 빛 알갱이로 흩어졌다 모인다 */
  const SKIN = []; { const v = new THREE.Vector3(); ship.root.updateMatrixWorld(true);
    shipModel.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, st = Math.max(1, Math.floor(p.count / 40));
      for (let i = 0; i < p.count; i += st) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); SKIN.push(v.clone()); } });
    while (SKIN.length > 260) SKIN.splice(Math.floor(Math.random() * SKIN.length), 1); }
  const ghostMat = ghostMaterial();
  const makeGhost = (mat = ghostMat) => { const g = ship.root.clone(true); g.traverse(o => { if (o.isMesh) o.material = mat; }); const h = new THREE.Group(); h.add(g); return h; };

  const FOE_KINDS = foeG.map((g, i) => {
    const m = g.scene; const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    m.position.sub(c); const h = new THREE.Group(); h.add(m); h.scale.setScalar((i === 3 ? 3.3 : 2.5) / Math.max(s.x, s.z));
    return h; });

  /* ───── 상태 ───── */
  const W = {
    THREE, scene, camera, glow, glowMat: glow.mesh.material, ghostMat, makeGhost, crystalMaterial, filmMaterial, beamMaterial, ringMaterial,
    t: 0, time: 1, slow: 1, me: { x: 0, z: 3.1, vx: 0, tx: 0, tz: 3.1, roll: 0, vis: 1, inv: 0, hitT: -9, flame: 1, heat: 0, power: 0, wide: 0, scale: 1 },
    shipObj: me, SKIN, ENG, foes: [], fb: [], mb: [], parts: [], fxs: [], score: 0, shakeA: 0, dimA: 0, onScore: null,
    fireRate: 1, autofire: null, fireT: 0, gun: [[-.42, -1.0], [.42, -1.0]], jobs: [], frozen: false, hp: 1, gauge: 0, lv: 1, dmgK: 1, rateK: 1, sizeK: 1
  };

  function spawnFoe(kind, hx, hz, delay = 0) {
    const obj = FOE_KINDS[kind].clone(true);
    obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0); o.userData.base = o.material.emissiveIntensity ?? 1; } });
    scene.add(obj);
    const f = { obj, kind, x: hx, z: FIELD.top - 6, hx, hz, hp: kind === 3 ? 26 : 9, max: kind === 3 ? 26 : 9, alive: true, flash: 0, born: W.t + delay, dead: -1, mark: 0, push: 0, pz: 0, seed: Math.random() * 10, r: kind === 3 ? 1.5 : 1.1 };
    W.foes.push(f); return f;
  }
  W.spawnFoe = spawnFoe;
  W.clearFoes = () => { for (const f of W.foes) scene.remove(f.obj); W.foes.length = 0; };

  /* ───── 빛 효과 ───── */
  const P3 = (x, y, z, vx, vy, vz, life, r, k, c, o = {}) => W.parts.push({ x, y, z, vx, vy, vz, life, age: 0, r, k, c, drag: o.drag ?? 2, grow: o.grow ?? 0, a: o.a ?? 1, tail: o.tail ?? .04, g: o.g ?? 0, to: o.to || null });
  W.part = P3;
  W.spark = (x, z, nx, nz, c = [1, .8, .5], n = 8, sp = 9) => { for (let i = 0; i < n; i++) { const a = Math.atan2(nz, nx) + (Math.random() - .5) * 2.2, s = sp * (.4 + Math.random());
      P3(x, .3, z, Math.cos(a) * s, (Math.random() - .3) * 4, Math.sin(a) * s, .22 + Math.random() * .25, .05, 2, c, { drag: 5, tail: .05 }); }
    P3(x, .3, z, 0, 0, 0, .12, .5, 3, [c[0] * 1.6, c[1] * 1.6, c[2] * 1.6], { drag: 0, grow: 3 }); };
  W.shake = a => { W.shakeA = Math.max(W.shakeA, a); };

  /* 고리·빔 효과 묶음 */
  const ringGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  W.ring = (x, z, o) => { const m = ringMaterial(); const mesh = new THREE.Mesh(ringGeo, m); mesh.position.set(x, o.y ?? .2, z); mesh.renderOrder = 12; scene.add(mesh);
    m.uniforms.uSpec.value = o.spec ? 1 : 0; if (o.c) m.uniforms.uC.value.setRGB(...o.c); m.uniforms.uFill.value = o.fill || 0;
    const e = { kind: 'ring', mesh, m, t0: W.t, dur: o.dur || .6, r0: o.r0 ?? .2, r1: o.r1 ?? 4, w: o.w ?? .25, I: o.I ?? 1, follow: o.follow || null, ease: o.ease ?? 2.2, onR: o.onR || null };
    W.fxs.push(e); return e; };
  W.beam = o => { const m = beamMaterial(); const g = new THREE.PlaneGeometry(1, 1, 1, 24).translate(.5, .5, 0); const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 13; scene.add(mesh);
    const e = { kind: 'beam', mesh, m, ...o, t0: W.t }; W.fxs.push(e); return e; };
  W.dropFx = e => { e.dead = true; };
  W.later = (d, fn) => W.jobs.push({ t: W.t + d, fn });        /* 무대 시간 기준으로 잠시 뒤에 */

  W.explode = (x, z, big = 1) => {
    P3(x, .5, z, 0, 0, 0, .16, 1.3 * big, 3, [2, 1.6, 1.3], { drag: 0, grow: 3 });
    for (let i = 0; i < 18 * big; i++) { const a = Math.random() * 6.283, s = (1 + Math.random() * 3.5) * big;
      P3(x, .4, z, Math.cos(a) * s, Math.random() * 2, Math.sin(a) * s, .5 + Math.random() * .6, (.35 + Math.random() * .45) * big, 3,
        Math.random() < .5 ? [1.4, .55, .16] : [1.1, .3, .08], { drag: 3.2, grow: -.4 }); }
    for (let i = 0; i < 26 * big; i++) { const a = Math.random() * 6.283, s = (6 + Math.random() * 12) * big;
      P3(x, .4, z, Math.cos(a) * s, Math.random() * 6, Math.sin(a) * s, .35 + Math.random() * .5, .06, 2, [1, .65, .3], { drag: 3.5, g: -6, tail: .06 }); }
    W.ring(x, z, { r0: .3, r1: 2.3 * big, dur: .45, w: .2, I: .75, c: LAVA });
    W.shake(.18 * big);
  };

  /* 적에게 맞음 */
  W.damage = (f, d, x, z, nx = 0, nz = 1, c) => {
    if (!f.alive) return false;
    let crit = false;
    if (f.weak && f.weak.until > W.t && Math.hypot(x - (f.x + f.weak.ox), z - (f.z + f.weak.oz)) < .75) { crit = true; d *= 4;
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, s = 5 + Math.random() * 8; P3(x, .4, z, Math.cos(a) * s, Math.random() * 3, Math.sin(a) * s, .35, .06, 2, hueRGB(Math.random() * .83), { drag: 4, tail: .05 }); }
      W.ring(x, z, { r0: .1, r1: 1.4, dur: .3, w: .1, spec: true, I: 1.2 }); W.shake(.08); }
    const dd = d * W.dmgK * (f.mark > W.t ? 1.8 : 1) * (f.vuln > W.t ? 2 : 1) * (1 + W.me.power * .7);
    f.hp -= dd; f.flash = 1;
    W.spark(x, z, nx, nz, c || [1, .85, .6], f.mark > W.t || W.me.power > .5 ? 12 : 6, f.mark > W.t ? 12 : 9);
    if (W.me.power > .5 || f.mark > W.t) W.shake(.05);
    if (f.hp <= 0) { f.alive = false; f.dead = W.t; f.obj.visible = false; W.explode(f.x, f.z, f.kind === 3 ? 1.5 : 1); W.score += f.kind === 3 ? 500 : 100; if (W.onKill) W.onKill(f);
      setTimeout(() => { if (!W.foes.includes(f)) return; f.alive = true; f.hp = f.max; f.obj.visible = true; f.born = W.t; f.z = FIELD.top - 6; f.mark = 0; f.stun = 0; f.vuln = 0; f.weak = null; f.ctl = f.ctl0 || null; f.pitch = 0; f.bank = 0; }, 1400); }
    return true;
  };
  W.nearest = (x, z, not) => { let b = null, bd = 1e9; for (const f of W.foes) { if (!f.alive || f === not || f.z < FIELD.top - 1) continue; const d = (f.x - x) ** 2 + (f.z - z) ** 2; if (d < bd) { bd = d; b = f; } } return b; };

  /* 적 탄 */
  W.foeShot = (x, z, vx, vz, o = {}) => { const b = { x, z, vx, vz, r: o.r ?? .26, c: o.c || FOE_SHOT, slow: 1, ref: false, age: 0, big: o.big || 0, life: o.life ?? 9 }; W.fb.push(b); return b; };
  W.aimAt = (f, sp = 6.5, n = 1, gap = .18) => { const a0 = Math.atan2(W.me.z - f.z, W.me.x - f.x);
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * gap; W.foeShot(f.x, f.z + .6, Math.cos(a) * sp, Math.sin(a) * sp); } };

  /* 내 탄 — k: 1 프리즘. o: pierce 뚫는 수, bounce 튕김, home 따라가기, split, dmg, r */
  W.myShot = (x, z, vx, vz, o = {}) => { const b = { x, z, vx, vz, k: 1, r: (o.r ?? .17) * W.sizeK, dmg: o.dmg ?? 1, pierce: o.pierce ?? 0, bounce: o.bounce ?? 0, home: o.home ?? 0, hit: new Set(), age: 0, life: o.life ?? 2.4,
      c: o.c || [.7, .85, 1], tail: o.tail ?? .55, warm: o.warm || 0, onHit: o.onHit || null, ret: o.ret || 0 }; W.mb.push(b); return b; };

  W.muzzle = (x, z, c = [1.2, 1.2, 1.4]) => P3(x, .35, z, 0, 0, -2, .07, .42, 3, c, { drag: 0, grow: 2 });

  /* ───── 화면 크기 ───── */
  let Wd = 2, Hd = 2, DPR = 1;
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = Q.renderSize(r.width, r.height); bloom.setSamples(Q.tier().aa); DPR = Wd / Math.max(1, r.width);
    renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); skyRT.setSize(Wd >> 1, Hd >> 1); skyMat.uniforms.uRes.value.set(Wd >> 1, Hd >> 1);
    camera.aspect = Wd / Hd;
    const dx = INSET.l * DPR * .5, dy = (INSET.t - INSET.b) * DPR * .5;
    camera.setViewOffset(Wd, Hd, -dx, -dy, Wd, Hd); camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  W.setInset = (l, t, b) => { Object.assign(INSET, { l, t, b }); size(); };
  addEventListener('resize', size); size(); Q.onChange(() => size()); Q.measure().then(() => size());   /* 품질 단계가 정해지거나 바뀌면 다시 맞춤 */

  /* 별: 아주 멀리, 천천히 흘러가 앞으로 날고 있다는 걸 알림 */
  const STARS = []; for (let i = 0; i < 140; i++) STARS.push([(Math.random() - .5) * 120, -40 - Math.random() * 60, (Math.random() - .7) * 120, Math.random()]);

  /* ───── 한 걸음 ───── */
  const v = new THREE.Vector3(), q = new THREE.Quaternion();
  function step(dt) {
    W.t += dt; const t = W.t;
    /* 내 기체: 목표를 부드럽게 따라가고, 옆으로 갈 때 기운다 */
    const m = W.me;
    const ax = (m.tx - m.x) * 34 - m.vx * 9.5; m.vx += ax * dt; m.x += m.vx * dt;
    m.z += (m.tz - m.z) * Math.min(1, dt * (m.zr || 6));
    m.roll += (THREE.MathUtils.clamp(-m.vx * .09, -.75, .75) - m.roll) * Math.min(1, dt * 10);
    me.position.set(m.x, .15 + Math.sin(t * 1.6) * .05, m.z); me.rotation.set(Math.sin(t * 1.1) * .03, 0, m.roll); me.scale.setScalar(m.scale);
    me.visible = m.vis > .5;
    if (m.hitT > t - .4) me.visible = me.visible && (Math.floor(t * 30) % 2 === 0);

    /* 자동 기본탄 */
    if (W.autofire) { W.fireT -= dt * W.fireRate * W.rateK * (1 + m.heat * 1.4); if (W.fireT <= 0 && m.vis > .5) { W.fireT += W.autofire.every; W.autofire.fire(W); } }

    /* 적 */
    for (const f of W.foes) {
      const age = t - f.born;
      if (f.alive) {
        /* 멈춘 시간·기절: 그 자리에 굳는다 (흔들림 시계도 멈춤) */
        const still = W.frozen || f.stun > t; if (still) f.born += dt; f.clk = (f.clk ?? f.seed) + (still ? 0 : dt);
        const e = Math.min(1, Math.max(0, age / 1.6)), k = 1 - Math.pow(1 - e, 3), c = f.clk;
        const sx = Math.sin(c * .7) * .9, sz = Math.sin(c * .9 + f.seed) * .35;
        f.push *= Math.pow(.02, dt); f.pz += f.push * dt * 9; f.pz *= Math.pow(.15, dt);
        if (f.ctl) f.ctl(f, dt); else { f.x = f.hx + sx; f.z = (FIELD.top - 6) + (f.hz + sz - (FIELD.top - 6)) * k - f.pz; }
        const wob = f.stun > t ? Math.sin(t * 9) * .25 : 0;
        f.obj.position.set(f.x, .2, f.z); f.obj.rotation.set(-f.push * .25 + (f.pitch || 0), Math.cos(c * .7) * .12 + wob, -Math.cos(c * .7) * .25 + (f.bank || 0));
        f.flash *= Math.pow(.0005, dt);
        f.obj.traverse(o => { if (o.isMesh) { o.material.emissive.setRGB(1, .55, .35); o.material.emissiveIntensity = f.flash * 1.6; } });
        /* 엔진 불: 적은 뒤(-Z)에서 용암빛 */
        glow.add(f.x, .25, f.z - f.r * 1.05, 0, 0, -.5 - Math.sin(t * 30 + f.seed) * .1, .32 * f.r, 3, [1.4, .5, .15], .9);
        if (f.mark > t) markFx(f, t);
        if (f.stun > t) stunFx(f, t);
        if (f.weak && f.weak.until > t) weakFx(f, t); }
    }
    /* 적 탄 */
    for (let i = W.fb.length - 1; i >= 0; i--) { const b = W.fb[i]; b.age += dt; const s = b.slow;
      if (!W.frozen) { b.x += b.vx * dt * s; b.z += b.vz * dt * s; } b.slow += (1 - b.slow) * Math.min(1, dt * 1.5);
      if (W.onFoeShot && W.onFoeShot(b, dt)) { W.fb.splice(i, 1); continue; }
      if (!b.ref && m.vis > .5 && m.inv < t && Math.hypot(b.x - m.x, (b.z - m.z) * 1.15) < .55 + b.r) {
        if (!W.onPlayerHit || !W.onPlayerHit(b)) { m.hitT = t; W.spark(b.x, b.z, 0, -1, [1, .4, .2], 10, 7); W.shake(.12); W.hp = Math.max(.08, W.hp - (b.big ? .3 : .12)); }
        W.fb.splice(i, 1); continue; }
      if (b.ref) { for (const f of W.foes) if (f.alive && Math.hypot(f.x - b.x, f.z - b.z) < f.r + b.r) { W.damage(f, b.dmg || 2, b.x, b.z, 0, 1, [1, 1, 1]); b.dead = 1; break; } }
      if (b.dead || b.z > FIELD.bottom + 3 || b.z < FIELD.top - 8 || Math.abs(b.x) > FIELD.x + 4 || b.age > b.life) { W.fb.splice(i, 1); continue; }
      const sp = Math.hypot(b.vx, b.vz) * s || 1, tl = Math.min(.5, sp * .05);
      if (b.ref) glow.add(b.x, .3, b.z, -b.vx / sp * tl * 3, 0, -b.vz / sp * tl * 3, b.r * 1.15, 1, [.7, .8, 1], 1, i);
      else if (W.frozen) glow.add(b.x, .3, b.z, 0, 0, 0, b.r * (1 + b.big), 0, [.5, .6, 1], .7, 0);              /* 멈춘 탄: 숨도 멈추고 식은 빛 */
      else glow.add(b.x, .3, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r * (1 + b.big), 0, b.c, s < .6 ? .55 + s * .7 : 1, i);
    }
    /* 내 탄 */
    for (let i = W.mb.length - 1; i >= 0; i--) { const b = W.mb[i]; b.age += dt;
      if (b.home) { const f = W.nearest(b.x, b.z); if (f) { const dx = f.x - b.x, dz = f.z - b.z, l = Math.hypot(dx, dz) || 1, sp = Math.hypot(b.vx, b.vz);
          const tr = b.home * dt; b.vx += (dx / l * sp - b.vx) * Math.min(1, tr); b.vz += (dz / l * sp - b.vz) * Math.min(1, tr);
          const s2 = Math.hypot(b.vx, b.vz) || 1; b.vx = b.vx / s2 * sp; b.vz = b.vz / s2 * sp; } }
      if (b.steer) b.steer(b, dt);
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (b.bounce > 0 && (Math.abs(b.x) > FIELD.x)) { b.vx *= -1; b.x = Math.sign(b.x) * FIELD.x; b.bounce--; W.spark(b.x, b.z, -Math.sign(b.x), 0, [.8, .9, 1], 5, 6); }
      for (const f of W.foes) { if (!f.alive || b.hit.has(f)) continue;
        if (Math.hypot(f.x - b.x, (f.z - b.z) * .9) < f.r + b.r) {
          const sp = Math.hypot(b.vx, b.vz) || 1; W.damage(f, b.dmg, b.x, b.z, -b.vx / sp, -b.vz / sp, b.warm ? [1.2, .8, .4] : [.85, .9, 1.2]);
          b.hit.add(f); if (b.onHit) b.onHit(b, f);
          if (b.bounce > 0) { const nx = b.x - f.x, nz = b.z - f.z, l = Math.hypot(nx, nz) || 1, d = (b.vx * nx + b.vz * nz) / l;
            b.vx -= 2 * d * nx / l; b.vz -= 2 * d * nz / l; b.bounce--; b.dmg *= b.grow || 1; b.hit = new Set([f]); }
          else if (b.pierce > 0) b.pierce--; else { b.dead = 1; } break; } }
      if (b.dead || b.age > b.life || b.z < FIELD.top - 4 || b.z > FIELD.bottom + 3 || Math.abs(b.x) > FIELD.x + 2) { W.mb.splice(i, 1); continue; }
      if (b.draw) { b.draw(b, i); continue; }
      const sp = Math.hypot(b.vx, b.vz) || 1, tl = b.tail;
      const c = b.warm ? [1.2 * b.warm + .7 * (1 - b.warm), .8, .5 + .5 * (1 - b.warm)] : b.c;
      glow.add(b.x, .32, b.z, -b.vx / sp * tl, 0, -b.vz / sp * tl, b.r, 1, c, 1, i);
    }
    /* 효과 알갱이 */
    for (let i = W.parts.length - 1; i >= 0; i--) { const p = W.parts[i]; p.age += dt; if (p.age > p.life) { W.parts.splice(i, 1); continue; }
      let fixed = false;
      if (p.to) { const px = p.x, py = p.y, pz = p.z, T = p.to(p, dt); if (T === false) { W.parts.splice(i, 1); continue; }
        if (T === 'pos') { fixed = true; const id = 1 / Math.max(dt, 1e-4); p.vx = (p.x - px) * id; p.vy = (p.y - py) * id; p.vz = (p.z - pz) * id; } }   /* 자리를 직접 정한 알갱이 */
      if (!fixed) { const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + p.g * dt; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
      const k = p.age / p.life;
      const r = p.r * Math.max(.05, 1 + p.grow * k), a = p.a * (p.k === 3 ? (1 - k) * (1 - k) : (1 - k));
      glow.add(p.x, p.y, p.z, -p.vx * p.tail, -p.vy * p.tail, -p.vz * p.tail, r, p.k, p.c, a, i);
    }
    /* 고리·빔 */
    for (let i = W.fxs.length - 1; i >= 0; i--) { const e = W.fxs[i]; const k = (t - e.t0) / (e.dur || 1);
      if (e.kind === 'ring') { if (k > 1 || e.dead) { scene.remove(e.mesh); e.m.dispose(); W.fxs.splice(i, 1); continue; }
        const ek = 1 - Math.pow(1 - k, e.ease), r = e.r0 + (e.r1 - e.r0) * ek; if (e.follow) e.mesh.position.set(e.follow.x, .2, e.follow.z);
        e.R = r; if (e.onR) e.onR(r, e);
        e.m.uniforms.uR.value = r; e.m.uniforms.uW.value = e.w * (1 + k); e.m.uniforms.uS.value = r + e.w * 8 + 1; e.m.uniforms.uI.value = e.I * (1 - k * k); }
      else if (e.kind === 'beam') { if (e.dead) { scene.remove(e.mesh); e.m.dispose(); e.mesh.geometry.dispose(); W.fxs.splice(i, 1); continue; } e.m.uniforms.uT.value = t; if (e.tick) e.tick(e, dt); }
    }
    /* 엔진 */
    me.updateMatrixWorld(true);
    if (me.visible) { for (const p of ENG) { v.copy(p).applyMatrix4(shipModel.matrixWorld); const fl = m.flame * (1 + m.heat * .6) * (.9 + .1 * Math.sin(t * 40 + p.x * 9));
        glow.add(v.x, v.y, v.z + .05, 0, 0, .9 * fl, .17, 1, [.4, .6, 1.4], .9);
        glow.add(v.x, v.y, v.z + .25, 0, 0, .6 * fl, .45 * fl, 3, [.25, .45, 1.3], .7); } }
    /* 별 */
    for (const s of STARS) { s[2] += dt * (2 + s[3] * 2); if (s[2] > 60) s[2] -= 120; glow.add(s[0], s[1], s[2], 0, 0, .0, .06 + s[3] * .1, 3, [.7, .75, .9], .35 + s[3] * .4); }
    for (let i = W.jobs.length - 1; i >= 0; i--) if (W.jobs[i].t <= W.t) { const j = W.jobs.splice(i, 1)[0]; j.fn(); }
    if (W.tick) W.tick(dt);
  }

  function stunFx(f, t) {          /* 기절: 머리 위로 작은 빛 셋이 천천히 맴돈다 */
    for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.094; glow.add(f.x + Math.cos(a) * .7, 1.1, f.z + Math.sin(a) * .5, -Math.sin(a) * .25, 0, Math.cos(a) * .25, .09, 1, hueRGB((i / 3 + t * .2) % 1), .9); }
  }
  function weakFx(f, t) {          /* 약점: 몸의 한 점이 심장처럼 뛴다 */
    const p = .6 + .4 * Math.pow(Math.max(0, Math.sin(t * 7)), 6), x = f.x + f.weak.ox, z = f.z + f.weak.oz;
    glow.add(x, .55, z, 0, 0, 0, .16 * p + .05, 1, [1, 1, 1], 1); glow.add(x, .55, z, 0, 0, 0, .7 * p, 3, [1, .85, .6], .6);
  }
  function markFx(f, t) {
    for (let i = 0; i < 6; i++) { const a = t * 2.4 + i * 1.047, r = f.r * 1.5; glow.add(f.x + Math.cos(a) * r, .3, f.z + Math.sin(a) * r, -Math.sin(a) * .35, 0, Math.cos(a) * .35, .07, 1, [1, 1, 1], .9); }
  }

  /* ───── 그리기 ───── */
  let last = performance.now(), frame = 0, alive = true;
  renderer.setAnimationLoop(now => {
    if (!alive) return;
    let dt = Math.min(.05, (now - last) / 1000); last = now;
    dt *= W.slow * W.time;
    glow.begin(); step(dt); glow.end();
    glow.uT.value = W.t; ghostMat.uniforms.uT.value = W.t;
    /* 카메라: 흔들림 + 기체를 아주 살짝 따라감 */
    W.shakeA *= Math.pow(.004, dt / Math.max(.01, W.time * W.slow) * .6);
    const sh = W.shakeA, sx = (Math.random() - .5) * sh, sz = (Math.random() - .5) * sh;
    camera.position.set(CAM.x + W.me.x * .12 + sx, CAM.y, CAM.z + sz); camera.lookAt(LOOK.x + W.me.x * .12 + sx * .5, 0, LOOK.z + sz * .5);
    skyMat.uniforms.uT.value = W.t; skyMat.uniforms.uYaw.value = W.t * P.spin + P.yaw0; skyMat.uniforms.uFade.value = .5 * (1 - W.dimA * .7);
    if ((frame++ & 1) === 0) { renderer.setRenderTarget(skyRT); renderer.render(skyScene, bgCam); }
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(bgScene, bgCam); renderer.clearDepth();
    renderer.render(scene, camera);
    bloom.render(Wd, Hd);
  });

  W.reset = () => {
    W.clearFoes(); W.fb.length = 0; W.mb.length = 0; W.parts.length = 0;
    for (const e of W.fxs) { scene.remove(e.mesh); e.m.dispose(); } W.fxs.length = 0;
    Object.assign(W.me, { x: 0, z: 3.1, vx: 0, tx: 0, tz: 3.1, roll: 0, vis: 1, inv: 0, hitT: -9, flame: 1, heat: 0, power: 0, wide: 0, scale: 1, pb: 0, hb: 0, zr: 6 });
    W.onFoeShot = null; W.onPlayerHit = null; W.onKill = null; W.tick = null; W.autofire = null; W.fireRate = 1; W.time = 1; W.dimA = 0; W.score = 0; W.frozen = false; W.hp = 1; W.gauge = 0; W.jobs.length = 0;
  };
  W.dispose = () => { alive = false; renderer.setAnimationLoop(null); renderer.dispose(); };
  onProgress(1);
  return W;
}
