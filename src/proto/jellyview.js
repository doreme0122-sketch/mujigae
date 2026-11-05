/* 성운 해파리 보기 — 사냥터 잔챙이 몹 (2026-11-04)
   기체 한 대와 해파리 떼. 버튼: 지켜보기(멀리서) · 다가가기(경계) · 쏘기 · 센 몹 · 다시
   맵에 넣기 전에 생김새·움직임·맞음·쓰러짐·경험치를 한자리에서 봄 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11051452';
import { buildShip } from '../core/ships/build.js';
import { makeJellies, JELLY, JCOL } from './jelly.js?v=11051452';
import { pointPool } from './skilldemo.js?v=11051452';
import { makeMobFx } from './mobfx.js?v=11051452';
import { makePerf } from './perf.js?v=11051452';
import * as A from '../core/audio.js';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 소리 */
function plip(f = 520) { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t0); o.frequency.exponentialRampToValueAtTime(f * .55, t0 + .12); o.connect(g); A.env(g, t0, .003, .07, .16); A.out(g, .25); o.start(t0); o.stop(t0 + .2); }
function bloop() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + .14); o.connect(g); A.env(g, t0, .01, .06, .2); A.out(g, .35); o.start(t0); o.stop(t0 + .25); }
function sigh() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime;                                        /* 쓰러짐: 숨이 빠지듯 내려가는 바람 + 맑은 울림 */
  const n = A.noise(.9), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(1800, t0); bp.frequency.exponentialRampToValueAtTime(300, t0 + .8); n.connect(bp); bp.connect(g); A.env(g, t0, .02, .08, .8); A.out(g, .5); n.start(t0);
  [1046.5, 1568].forEach((f, i) => { const o = c.createOscillator(), g2 = c.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g2); A.env(g2, t0 + i * .07, .004, .05, 1.1); A.out(g2, .6); o.start(t0 + i * .07); o.stop(t0 + 1.3); }); }
let tickN = 0, tickT = 0;
function tick(t) { if (!A.live()) return; if (t - tickT > .6) tickN = 0; tickT = t; const c = A.ctx, t0 = c.currentTime, f = 880 * Math.pow(2, Math.min(tickN++, 14) / 12), o = c.createOscillator(), g = c.createGain();   /* 경험치: 들어올 때마다 한 음씩 올라감 */
  o.type = 'sine'; o.frequency.value = f; o.connect(g); A.env(g, t0, .002, .035, .18); A.out(g, .4); o.start(t0); o.stop(t0 + .22); }
function pew() { if (!A.live()) return; const c = A.ctx, t0 = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = 1250 + Math.random() * 160; o.type = 'triangle'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .42, t0 + .07); o.connect(g); A.env(g, t0, .002, .03, .08); A.out(g, .1); o.start(t0); o.stop(t0 + .12); }

/* 바닥: 사냥터 성운 땅 — 짙은 바탕 위 옅은 청록 안개 무늬 */
function groundMat(uT) {
  return new THREE.ShaderMaterial({ uniforms: { uT },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += n(p) * a; p *= 2.03; a *= .5; } return s; }
      void main(){ float r = length(vP), g = fbm(vP * .06 + uT * .01), g2 = fbm(vP * .2 - 3.);
        vec3 c = mix(vec3(.02, .025, .04), vec3(.03, .07, .075), smoothstep(.35, .8, g)) + vec3(.01, .03, .03) * smoothstep(.55, .8, g2);
        vec2 sc = floor(vP * 1.5), sf = fract(vP * 1.5) - .5 - (vec2(h(sc + 3.), h(sc + 7.)) - .5) * .6; float st = step(.985, h(sc)) * exp(-dot(sf, sf) * 400.) * (.5 + .5 * sin(uT * 2. + h(sc + 1.) * 30.));   /* 작은 둥근 별빛 (네모 칸이 보이지 않게) */
        c += vec3(.6, .8, 1.) * st * .25;
        c *= smoothstep(48., 18., r); c *= c * 5.;
        gl_FragColor = vec4(c, 1.); }` });
}

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x020308, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .3, 400), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55; pm.dispose(); }
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-60, 120, -40); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8fb0ff, .6); fill.position.set(70, 50, 90); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x14100c, 1.1));
  const uT = { value: 0 };
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 96), groundMat(uT)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  onProgress(.2);
  const J = makeJellies(uT); scene.add(J);
  const flock = () => { J.userData.list.length = 0; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 1.5 + (i % 4) * 1.1; J.userData.add(Math.cos(a) * r - 2, Math.sin(a) * r - 6, { group: 1 }); } };
  flock();
  let strong = null;
  /* 기체 */
  const b = await buildShip(1, 1, 'ruby', { renderer, size: 2 }); const ship = b.root; scene.add(ship);
  const SH = { x: 0, z: 16, tz: 16, head: 0, hurt: -9 };
  onProgress(.7);
  const motes = pointPool(500, false, .14); scene.add(motes.pts);
  const FX = makeMobFx(); scene.add(FX);
  let exp = 0; const expEl = $('#exp');
  /* 쏘기 */
  const BL = []; let shooting = false, shotAcc = 0;
  const stEl = $('#state'), tipB = $('#tip b'), tipS = $('#tip span'), tipBox = $('#tip');
  const tips = {
    watch: ['지켜보기', '평소엔 떼 지어 천천히 떠다님. 빠르게 오므렸다 천천히 펴며 헤엄치고, 저마다 박자가 조금씩 달라 살아 있는 떼처럼 보임. 촉수는 가는 반대쪽으로 끌려 흐름.'],
    near: ['다가가기 — 경계', '기체가 가까이 오면 몸빛이 붉은 주황으로 물들고 기체 쪽을 향해 알맞은 거리를 둠. 쏘기 직전 몸이 부풀며 밝아지고(신호) 느린 빛 방울을 뱉음.'],
    shoot: ['쏘기 — 떼가 같이 화냄', '한 마리가 맞으면 빛 신호가 떼 동무에게 차례로 날아가고, 닿는 순간 몸 가운데서 붉은 빛 고리가 번지며 같이 덤벼듦. 세 번 맞으면 꽃잎처럼 벌어지며 녹아 사라지고 빛 알갱이(경험치)가 기체로 빨려 들어감.'],
    strong: ['센 몹', '가운데 통로 쪽의 센 해파리: 더 크고 몸 위에 어두운 결정 껍질이 덮임. 아홉 번 맞아야 쓰러지고 경험치도 많음.'] };
  const tour = $('#tour'), btns = {};
  const show = k => { tipBox.hidden = false; tipB.textContent = tips[k][0]; tipS.textContent = tips[k][1]; for (const x in btns) btns[x].classList.toggle('on', x === k || (x === 'shoot' && shooting) || (x === 'strong' && !!strong)); };
  [['지켜보기', 'watch'], ['다가가기', 'near'], ['쏘기', 'shoot'], ['센 몹', 'strong'], ['다시 채우기', 'reset']].forEach(([n, k]) => { const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = n; btns[k] = bt;
    bt.onclick = () => { if (k === 'watch') { SH.tz = 16; shooting = false; }
      else if (k === 'near') { SH.tz = 4; }
      else if (k === 'shoot') { shooting = !shooting; if (shooting && SH.tz > 8) SH.tz = 5; }
      else if (k === 'strong') { if (!strong || !strong.on) { strong = J.userData.add(5.5, -8.5, { strong: true, group: 1 }); } }
      else if (k === 'reset') { flock(); strong = null; shooting = false; SH.tz = 16; exp = 0; expEl.textContent = ''; k = 'watch'; }
      show(k === 'reset' ? 'watch' : k); };
    tour.appendChild(bt); });
  show('watch');
  /* 카메라: 게임처럼 위에서 비스듬히. 끌어서 돌려 보기 · 두 손가락 확대 */
  const cam = { h: 21, H: 21, tilt: .55, T: .55, az: 0 };
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#tour')) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1) { cam.az -= (e.clientX - o[0]) * .006; cam.T = cam.tilt = clamp(cam.tilt + (e.clientY - o[1]) * .004, .15, 1.35); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 5, 60); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 5, 60); }, { passive: true });
  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let last = performance.now(), t = 0;
  const v3 = new THREE.Vector3();
  const near = () => { let best = null, bd = 1e9; for (const j of J.userData.list) { if (!j.on || j.dieT > 0) continue; const d = Math.hypot(j.x - SH.x, j.z - SH.z); if (d < bd) { bd = d; best = j; } } return best; };
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt; uT.value = t;
    const px = Hd / (2 * Math.tan(camera.fov * Math.PI / 360)); motes.setPx(Hd);
    /* 기체: 정한 자리로 스르르, 가장 가까운 해파리를 바라봄 */
    SH.z += (SH.tz - SH.z) * Math.min(1, dt * 1.2);
    const tg = near(); { const want = tg && (shooting || SH.tz < 8) ? Math.atan2(-(tg.x - SH.x), -(tg.z - SH.z)) : 0; let d = want - SH.head; d = Math.atan2(Math.sin(d), Math.cos(d)); SH.head += d * Math.min(1, dt * 6); }
    const hurtK = Math.exp(-(t - SH.hurt) * 6);
    ship.position.set(SH.x + Math.sin(t * 40) * .05 * hurtK, .7 + Math.sin(t * 2.1) * .06, SH.z); ship.rotation.set(0, SH.head, 0);
    /* 해파리 */
    J.userData.step(t, dt, { sx: SH.x, sz: SH.z,
      spit: (j, dx, dz) => { FX.userData.spit(j.x + dx * j.s * .7, j.y - .2, j.z + dz * j.s * .7, dx, dz); bloop(); },
      died: j => { if (j === strong) strong = null; } });
    J.userData.draw(t);
    for (const sg of J.userData.signals.splice(0)) FX.userData.signal(sg);
    FX.userData.update(t, dt, px, SH, q => { SH.hurt = t; plip(260); motes.emit(m => { m.p.set(q.x, q.y, q.z); m.v.randomDirection().multiplyScalar(2 + Math.random() * 3); m.max = m.life = .35 + Math.random() * .3; m.c.copy(JCOL.alert); m.s = .9; }, 14); },
      () => { exp++; expEl.textContent = '경험치 +' + exp; expEl.classList.remove('pop'); void expEl.offsetWidth; expEl.classList.add('pop'); tick(t); motes.emit(m => { m.p.set(SH.x, .9, SH.z); m.v.randomDirection().multiplyScalar(1.5); m.max = m.life = .25; m.c.set(.62, 1, .32); m.s = 1.2; }, 3); });
    /* 쏘기 */
    if (shooting && tg) { shotAcc += dt * 6; while (shotAcc >= 1) { shotAcc -= 1; const dx = tg.x - SH.x, dz = tg.z - SH.z, l = Math.hypot(dx, dz) || 1; BL.push({ x: SH.x + dx / l * 1.1, z: SH.z + dz / l * 1.1, vx: dx / l * 40, vz: dz / l * 40, life: .9 }); pew(); } }
    for (let i = BL.length - 1; i >= 0; i--) { const bl = BL[i]; bl.life -= dt; const ox = bl.x, oz = bl.z; bl.x += bl.vx * dt; bl.z += bl.vz * dt; let dead = bl.life <= 0;
      for (const j of J.userData.list) { if (dead || !j.on || j.dieT > 0) continue; const rr = JELLY.R * j.s * 1.15;
        if (Math.hypot(bl.x - j.x, bl.z - j.z) < rr) { dead = true; const l = Math.hypot(bl.vx, bl.vz), dx = bl.vx / l, dz = bl.vz / l; const killed = J.userData.hit(j, t, dx, dz);
          plip(j.strong ? 380 : 560);
          motes.emit(m => { m.p.set(bl.x, j.y - .1, bl.z); m.v.set(-dx * 3 + (Math.random() - .5) * 4, Math.random() * 2.5, -dz * 3 + (Math.random() - .5) * 4); m.max = m.life = .3 + Math.random() * .35; m.c.copy(JCOL.body); m.s = .8; }, 10);   /* 맞은 자리 몸빛이 튐 */
          if (killed) { sigh(); const n = j.strong ? 14 : 5;
            motes.emit(m => { const a = Math.random() * 6.283, r = Math.random() * JELLY.R * j.s; m.p.set(j.x + Math.cos(a) * r, j.y, j.z + Math.sin(a) * r); m.v.set(Math.cos(a) * 1.5, (Math.random() - .3) * 1.5, Math.sin(a) * 1.5); m.max = m.life = .8 + Math.random() * .7; m.c.copy(Math.random() < .3 ? JCOL.core : JCOL.body); m.s = 1; m.drag = 1.2; }, 40);   /* 몸이 풀리며 흩어지는 빛 */
            FX.userData.burst(j.x, j.y, j.z, n); } } }
      if (dead) { BL.splice(i, 1); continue; }
      motes.emit(m => { m.p.set(bl.x, .7, bl.z); m.v.set(0, 0, 0); m.max = m.life = .12; m.c.set(.62, 1, .32); m.s = .9; m.drag = 0; }, 1);
      motes.emit(m => { m.p.set((bl.x + ox) / 2, .7, (bl.z + oz) / 2); m.v.set(0, 0, 0); m.max = m.life = .09; m.c.set(.8, 1, .6); m.s = .6; m.drag = 0; }, 1); }
    motes.update(dt);
    { const alive = J.userData.list.filter(j => j.on && j.dieT < 0), al = alive.filter(j => j.alert > .5).length; stEl.textContent = `해파리 ${alive.length}마리${al ? ' · 경계 ' + al : ''}`; }
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    const cx = 0, cz = -6.5 + (SH.z + 6) * .22;                                                        /* 떼를 가운데에 두고 기체가 아래쪽에 보이게 */
    camera.position.set(cx + Math.sin(cam.az) * cam.h * Math.sin(cam.tilt), cam.h * Math.cos(cam.tilt), cz + Math.cos(cam.az) * cam.h * Math.sin(cam.tilt)); camera.lookAt(cx, 1, cz);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[해파리 보기]', err); } });
  onProgress(1);
  window.__jv = { get t() { return t; }, J, SH, cam, btns };
}
