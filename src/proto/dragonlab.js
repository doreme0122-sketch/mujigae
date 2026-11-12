/* 용 손맛 시험 (사용자 2026-11-12): 용 한 마리 + 허수아비 · 쏘는 수정 눈
   · 기본 공격: 공격 버튼을 누르고 있으면 사거리 원(바깥 = 원거리 · 안 = 근접)이 보이고, 원 안의 가장 가까운 적을 자동 공격
     멀면 브레스(고정 타겟 · 유도) · 가까우면 앞발 할퀴기(훨씬 셈) · 공격 박자는 하나 (원거리 ↔ 근접 바뀌어도 틈 없음) · 경계는 여유를 둠
   · 롤 버튼 (공격 버튼 왼쪽 · 사용자 2026-11-12): 조이스틱으로 꺾는 방식은 움직이며 하기 어려워 버튼으로 바꿈
     적 공격이 판정 시간(0.3초) 안에 닿을 때 누르면 크리티컬 롤: 빠르고 멀리(5m) · 잔상 · 쿨타임 바로 초기화 (맞추면 무제한)
     그 외엔 일반 롤: 옆으로 살짝(2m) · 잔상 없음 · 유도 기본 공격은 못 피함 · 쿨타임 3초 (일찍 누르면 쿨타임이 벌이 됨)
     구르는 방향: 조이스틱을 민 쪽 · 가만있으면 날아오는 공격의 옆쪽 · 그것도 없으면 용의 오른쪽
   · 크리티컬 효과는 잔상 · 멈칫 · 느려짐 · 진동 · 오르는 음 · 글자만 (퍼지는 원 · 불꽃 · 번쩍임 없음)
   · 카메라: 직교 · 56° · 화면 세로 20m · 용은 가운데보다 조금 아래 · 용은 카메라 쪽으로 11° 젖힘 (4분의 3 시점) · 모든 숫자는 조절 칸 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CFG = { critMs: 300, cd: 3, rollDist: 2, rollTime: .35, critDist: 5, critTime: .3, btnTell: 1, range: 14, melee: 3.2, atkEvery: .85, speed: 7.5,
  fireEvery: 1.7, camAng: 56, viewH: 20, camOff: 3, lean: 11, projSpeed: 25, skillEvery: 3.4, tell: 1, reward: 'speed', turret: 1, skill: 1 };
const SPEC = [['cap', '카메라'], ['camAng', '내려다보는 각도(°)', 30, 85, 1], ['viewH', '화면 세로 넓이(m)', 10, 34, .5], ['camOff', '용 위치: 가운데 아래(m)', 0, 6, .1], ['lean', '용 젖힘(°)', 0, 25, 1],
  ['cap', '크리티컬 롤'], ['critMs', '판정 시간(ms)', 100, 500, 10], ['critDist', '크리티컬 롤 거리(m)', 2, 9, .1], ['critTime', '크리티컬 롤 시간(초)', .15, .6, .01], ['reward', '성공 보상', ['speed', '이동 속도 ↑ (1.5초)'], ['power', '다음 공격 강화 ×1.8']], ['tell', '타이밍 고리', 0, 1, 1], ['btnTell', '롤 버튼 반짝임', 0, 1, 1],
  ['cap', '일반 롤'], ['cd', '쿨타임(초)', 1, 4, .1], ['rollDist', '롤 거리(m)', .5, 6, .1], ['rollTime', '롤 시간(초)', .2, .8, .01],
  ['cap', '기본 공격'], ['range', '원거리 사거리(m)', 4, 20, .5], ['melee', '근접 사거리(m)', 1.5, 6, .1], ['atkEvery', '공격 간격(초)', .4, 1.6, .05], ['speed', '이동 속도(m/s)', 3, 14, .5],
  ['cap', '적'], ['turret', '수정 눈 기본 공격', 0, 1, 1], ['fireEvery', '쏘는 간격(초)', .6, 4, .1], ['projSpeed', '탄 속도(m/s)', 15, 40, .5], ['skill', '직선 불덩이(스킬)', 0, 1, 1], ['skillEvery', '스킬 간격(초)', 1.5, 8, .1]];
const FLY = 3.2, $ = s => document.querySelector(s);

/* ── 화면 ── */
const R = new THREE.WebGLRenderer({ canvas: $('#cv'), antialias: true }); R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x9fb6d6, 210, 330);   /* 카메라가 150m 떨어진 직교 화면 기준 */
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 900);   /* 롤처럼 원근감 없는 직교 카메라 (사용자 2026-11-12): 어디서나 크기 같음 · 높이 뜬 탄과 사거리 원이 같은 자리에 겹침 */
const CAM_D = 150; let camA = -1, camH = -1;
const resize = () => { R.setSize(innerWidth, innerHeight, false); camH = -1; };   /* 직교 카메라 넓이는 매 순간 맞춤 (조절 칸 · 화면 크기) */ addEventListener('resize', resize); resize();
/* 하늘: 위는 짙은 파랑 · 지평선은 따뜻한 빛 */
{ const g = new THREE.SphereGeometry(400, 32, 16), m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 v; void main(){ float h = v.y; vec3 c = mix(vec3(.98, .82, .62), vec3(.55, .70, .90), smoothstep(-.05, .25, h)); c = mix(c, vec3(.16, .30, .62), smoothstep(.25, .9, h)); gl_FragColor = vec4(c, 1.); }` });
  scene.add(new THREE.Mesh(g, m)); }
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x4a5a30, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6); sun.position.set(-20, 40, 15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 }); sun.shadow.bias = -.0005; scene.add(sun, sun.target);
/* 땅: 풀밭 (잔결 · 얼룩) */
const noiseTex = (n, f) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), d = x.createImageData(n, n); for (let i = 0; i < n * n; i++) { const v = f(i % n, (i / n) | 0); d.data.set([v[0], v[1], v[2], 255], i * 4); } x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), H = (a, b) => hash(((a % p) + p) % p, ((b % p) + p) % p); return (H(xi, yi) * (1 - u) + H(xi + 1, yi) * u) * (1 - v) + (H(xi, yi + 1) * (1 - u) + H(xi + 1, yi + 1) * u) * v; };
const grassT = noiseTex(512, (x, y) => { const a = vn(x / 64, y / 64, 8) * .55 + vn(x / 16, y / 16, 32) * .3 + vn(x / 4, y / 4, 128) * .15, b = hash(x, y); const g = .78 + .3 * a + .1 * b; return [62 * g * (.9 + .25 * a), 112 * g, 42 * g]; });
grassT.repeat.set(30, 30);
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 96), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
/* 둘레 바위 언덕 · 떠 있는 섬 (거리감) */
{ const rockM = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: .95, flatShading: true }), topM = new THREE.MeshStandardMaterial({ color: 0x5f8f3a, roughness: 1, flatShading: true });
  const lump = (x, z, s, h, y = 0) => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), k = 1 + .22 * (vn(X * 2 + x, Z * 2 + Y, 999) - .5) * 2; p.setXYZ(i, X * s * k, Y > 0 ? Y * h * .5 * k : Y * h * k, Z * s * k); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); const t = new THREE.Mesh(new THREE.CylinderGeometry(s * .92, s * .98, .5, 18), topM); t.position.set(x, y + h * .5 - .1, z); t.receiveShadow = true; scene.add(t); };
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2 + hash(k, 3), r = 55 + hash(k, 7) * 30; lump(Math.cos(a) * r, Math.sin(a) * r, 5 + hash(k, 9) * 7, 6 + hash(k, 2) * 10); }
  for (let k = 0; k < 7; k++) { const a = hash(k, 11) * Math.PI * 2, r = 30 + hash(k, 13) * 50; lump(Math.cos(a) * r, Math.sin(a) * r, 3 + hash(k, 5) * 3, 3 + hash(k, 1) * 3, 14 + hash(k, 4) * 12); } }

/* ── 소리 (처음 손대면 켬) ── */
let AC = null; const ac = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { } return AC; };
const tone = (f0, f1, dur, type = 'sine', vol = .2, delay = 0) => { const a = ac(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02); };
const noise = (dur, f, vol = .25, q = 1, delay = 0, f2) => { const a = ac(); if (!a) return; const t = a.currentTime + delay, n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(fl).connect(g).connect(a.destination); s.start(t); };
const SFX = { roll: () => { noise(.22, 900, .38, 1.4, 0, 4200); noise(.18, 3000, .14, 2, .05, 1200); tone(140, 70, .12, 'sine', .18); }, crit: n => { const st = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24][Math.min(10, n)], k = Math.pow(2, st / 12); [880, 1175, 1568, 2093].forEach((f, i) => tone(f * k, f * k * 1.01, .5, 'triangle', .14, i * .045)); tone(440 * k, 440 * k, .35, 'sine', .12); noise(.5, 3000, .12, .5); },   /* 연속할수록 한 음씩 올라감 (도 레 미 솔 라 …) */
  breath: () => { noise(.5, 260, .35, .6, 0, 900); tone(110, 70, .4, 'sawtooth', .06); }, claw: () => { noise(.12, 2400, .35, 1.2); noise(.12, 1800, .3, 1.2, .05); },
  hit: () => { tone(160, 60, .15, 'square', .12); noise(.1, 900, .25); }, hurt: () => { tone(220, 90, .25, 'sawtooth', .12); noise(.2, 400, .3); }, shoot: () => tone(660, 330, .25, 'triangle', .08), boom: () => { noise(.4, 300, .35, .7); tone(90, 40, .35, 'sine', .25); } };

/* ── 빛 효과 공용 ── */
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const glow = (col, s, o = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); m.scale.setScalar(s); return m; };
const FX = []; const fx = (o, life, upd) => { scene.add(o); FX.push({ o, t: 0, life, upd }); };
const ring = (r0, r1, col, life, pos, w = .25, o = .9) => { const m = new THREE.Mesh(new THREE.RingGeometry(1 - w, 1, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.copy(pos);
  fx(m, life, (k) => { m.scale.setScalar(r0 + (r1 - r0) * (1 - Math.pow(1 - k, 3))); m.material.opacity = o * (1 - k); }); return m; };
const rainbowRing = pos => { const cols = [0xff5f6b, 0xffb35f, 0xfff06b, 0x7dff8a, 0x6bd3ff, 0x9a7bff]; cols.forEach((c, i) => ring(.6 + i * .25, 7 + i * 1.1, c, .7 + i * .05, pos.clone().setY(pos.y - .2 + i * .02), .12, .85)); };
const burst = (pos, col, n = 14, sp = 6, life = .45, size = .5) => { for (let i = 0; i < n; i++) { const s = glow(col, size * (.6 + Math.random() * .8)), v = new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).normalize().multiplyScalar(sp * (.4 + Math.random() * .8)); s.position.copy(pos);
  fx(s, life * (.7 + Math.random() * .6), (k, dt) => { s.position.addScaledVector(v, dt); v.multiplyScalar(.9); s.material.opacity = 1 - k; }); } };

/* ── 용 ── */
const dragon = new THREE.Group(), lean = new THREE.Group(), yawG = new THREE.Group(), bank = new THREE.Group(), spin = new THREE.Group(); dragon.add(lean); lean.add(yawG); yawG.add(bank); bank.add(spin); scene.add(dragon);
/* lean: 어느 쪽을 보든 등이 카메라 쪽으로 젖혀짐 (카메라 56° − 11° = 용 입장에선 45° · 얼굴과 옆구리가 같이 보이는 4분의 3 시점) · 겉모습만 · 판정은 그대로 */
let mixer = null, A = {}, model = null;
const P = { pos: new THREE.Vector3(0, FLY, 6), vel: new THREE.Vector3(), yaw: Math.PI, hp: 1000, roll: null, cdLeft: 0, atkT: 0, attacking: false, lastMelee: false, speedT: 0, power: false, busy: 0, hurtT: 0 };
dragon.position.copy(P.pos);
/* 사거리 원 두 개 (나는 높이에 · 화면 위에 덮어 그림) */
const mkRing = (col, w, o) => { const m = new THREE.Mesh(new THREE.RingGeometry(1 - w, 1, 96), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, depthTest: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 10; m.visible = false; scene.add(m); return m; };
const rOut = mkRing(0xfff1d0, .02, .45), rIn = mkRing(0xff8a4a, .05, .75), rTell = mkRing(0xffffff, .06, .9);
const rInFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: .07, depthTest: false, depthWrite: false })); rInFill.rotation.x = -Math.PI / 2; rInFill.renderOrder = 9; rInFill.visible = false; scene.add(rInFill);

/* ── 적 ── */
const stoneM = new THREE.MeshStandardMaterial({ color: 0x8c8172, roughness: .9, flatShading: true }), runeM = c => new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 1.6, roughness: .4 });
const E = [];
const hpBar = () => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;width:54px;height:6px;border-radius:3px;background:rgba(0,0,0,.5);transform:translate(-50%,-50%);pointer-events:none;overflow:hidden'; const i = document.createElement('i'); i.style.cssText = 'display:block;height:100%;width:100%;background:linear-gradient(90deg,#ff5f5f,#ffb35f)'; d.append(i); document.body.append(d); return d; };
function mkDummy(x, z) {   /* 허수아비: 떠 있는 룬 오벨리스크 (깨진 돌 조각이 돌고 가운데 핵이 빛남) */
  const g = new THREE.Group(), core = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 0), runeM(0xff9a4a)); g.add(core);
  const shell = []; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.42 + hash(k, x) * .2, 0), stoneM); s.position.set(Math.cos(a) * 1.05, (hash(k, 2) - .5) * .9, Math.sin(a) * 1.05); s.castShadow = true; g.add(s); shell.push(s); }
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.35, .6, FLY - 1.2, 6), stoneM); pillar.position.y = -(FLY - 1.2) / 2 - 1; pillar.castShadow = true; g.add(pillar);
  g.add(glow(0xffa050, 2.6, .55)); g.position.set(x, FLY, z); scene.add(g);
  const e = { kind: 'dummy', g, core, shell, hp: 400, max: 400, r: 1.3, bar: hpBar(), dead: 0, flash: 0, home: new THREE.Vector3(x, FLY, z) }; E.push(e); return e; }
function mkEye(x, z) {   /* 수정 눈: 기본 공격(유도 · 못 피함)을 쏨 · 쏘기 전 빛을 모음 · 가끔 직선 불덩이(스킬) */
  const g = new THREE.Group(), body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x6a4cff, emissive: 0x2a10a0, emissiveIntensity: .8, roughness: .2, metalness: .3, flatShading: true }));
  body.castShadow = true; g.add(body); const eye = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 12), runeM(0xd9b8ff)); eye.position.z = .78; g.add(eye);
  const halo = glow(0xb58aff, 3.2, .4); g.add(halo); const shards = []; for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.TetrahedronGeometry(.3, 0), new THREE.MeshStandardMaterial({ color: 0x9a7bff, emissive: 0x5a30ff, emissiveIntensity: 1, flatShading: true })); g.add(s); shards.push(s); }
  g.position.set(x, FLY + .4, z); scene.add(g);
  const e = { kind: 'eye', g, body, eye, halo, shards, hp: 700, max: 700, r: 1.4, bar: hpBar(), dead: 0, flash: 0, home: new THREE.Vector3(x, FLY + .4, z), fireT: 1.2, charge: 0, skillT: 2.5, tele: null }; E.push(e); return e; }
mkDummy(-5, -6); mkDummy(4, -8); mkDummy(-1, -12); mkEye(-10, -15);

/* ── 탄 ── */
const SHOTS = [];
const orb = (col, s) => { const g = new THREE.Group(); g.add(glow(col, s * 2.6, .9)); g.add(glow(0xffffff, s * 1.1, 1)); scene.add(g); return g; };
function enemyShot(e) {   /* 기본 공격: 유도 · 고정 타겟 (크리티컬 회피로만 피함) */
  const o = orb(0xb58aff, .55); o.position.copy(e.g.position); SFX.shoot();
  SHOTS.push({ o, from: 'enemy', kind: 'basic', speed: CFG.projSpeed, dmg: 40, trail: 0, tti: 1e9 }); }
function enemySkill(e) {   /* 스킬: 직선 불덩이 (방향만 정하고 날아감 · 비켜서 피함 · 롤 중엔 무적 · 판정 시간 안이면 크리티컬) */
  const dir = P.pos.clone().sub(e.g.position).setY(0).normalize(); const o = orb(0xff6a2a, 1.1); o.position.copy(e.g.position);
  SHOTS.push({ o, from: 'enemy', kind: 'skill', dir, speed: CFG.projSpeed * .9, dmg: 120, life: 3.2, trail: 0, tti: 1e9 }); SFX.boom(); }
function myShot(t, dmg) { const o = orb(0xffa24a, .7); o.position.copy(P.pos).add(new THREE.Vector3(Math.sin(P.yaw) * 2, .3, Math.cos(P.yaw) * 2)); SHOTS.push({ o, from: 'me', target: t, speed: 26, dmg, trail: 0 }); }

/* ── 입력 ── */
const keys = new Set(); addEventListener('keydown', e => { if (e.repeat) return; keys.add(e.code); ac(); if (e.code === 'KeyQ' || e.code === 'ShiftLeft') pressRoll(); if (e.code === 'Space') P.attacking = true; });   /* 키보드 시험용: Q · 왼쪽 Shift = 롤 버튼 */
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'Space') P.attacking = false; });
const stick = { id: null, x: 0, y: 0, cx: 0, cy: 0 }, knob = $('#knob');
$('#stick').addEventListener('pointerdown', e => { ac(); const r = e.currentTarget.getBoundingClientRect(); stick.id = e.pointerId; stick.cx = r.left + r.width / 2; stick.cy = r.top + r.height / 2; e.currentTarget.setPointerCapture(e.pointerId); moveStick(e); });
const moveStick = e => { let dx = e.clientX - stick.cx, dy = e.clientY - stick.cy; const l = Math.hypot(dx, dy), m = 55; if (l > m) { dx *= m / l; dy *= m / l; } stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; };
$('#stick').addEventListener('pointermove', e => { if (e.pointerId === stick.id) moveStick(e); });
const endStick = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; }; $('#stick').addEventListener('pointerup', endStick); $('#stick').addEventListener('pointercancel', endStick);
/* 공격 버튼: 누르고 있으면 자동 공격 (롤은 조이스틱으로 옮김) */
const atkEl = $('#atk'), fl = { id: null };
atkEl.addEventListener('pointerdown', e => { ac(); fl.id = e.pointerId; P.attacking = true; atkEl.classList.add('on'); atkEl.setPointerCapture(e.pointerId); });
const endAtk = e => { if (e.pointerId !== fl.id) return; fl.id = null; P.attacking = false; atkEl.classList.remove('on'); }; atkEl.addEventListener('pointerup', endAtk); atkEl.addEventListener('pointercancel', endAtk);

/* ── 배럴 롤 ── */
const fwd = () => new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
let lastNoteT = 0; const note = (t, c = '#fff') => { const now = performance.now(); if (now - lastNoteT < 250 && c === '#fff') return; lastNoteT = now; showMsg(t, c, 700, 22); };
/* 롤 버튼: 판정 시간 안에 닿을 공격이 있으면 크리티컬 롤 (쿨타임과 상관없이) · 아니면 일반 롤 (쿨타임) */
const rollEl = $('#rollb'); rollEl.addEventListener('pointerdown', e => { e.preventDefault(); ac(); rollEl.classList.add('on'); pressRoll(); });
const rollUp = () => rollEl.classList.remove('on'); rollEl.addEventListener('pointerup', rollUp); rollEl.addEventListener('pointercancel', rollUp); rollEl.addEventListener('pointerleave', rollUp);
const threats = () => SHOTS.filter(s => s.from === 'enemy' && !s.dodged && s.tti < 1e8);
function pressRoll() { if (P.roll) return; const live = threats(), inW = live.filter(s => s.tti <= CFG.critMs / 1000);
  if (inW.length) { inW.forEach(dodge); startRoll(rollDir(inW), true); crit(); return; }
  if (P.cdLeft > 0) { note('롤 쿨타임 ' + P.cdLeft.toFixed(1) + '초'); return; }
  if (live.some(s => s.tti <= .9)) { stats.early++; stats.combo = 0; note('빨랐어요', '#ffd36b'); }
  startRoll(rollDir(live), false); P.cdLeft = CFG.cd; }
function rollDir(list) {   /* 조이스틱을 민 쪽 · 가만있으면 가장 가까운 공격이 오는 길의 옆쪽(용의 오른쪽에 가까운 편) · 그것도 없으면 용의 오른쪽 */
  const f = fwd(), r = new THREE.Vector3(-f.z, 0, f.x), sl = Math.hypot(stick.x, stick.y);
  let mx = stick.x + ((keys.has('KeyD') || keys.has('ArrowRight')) - (keys.has('KeyA') || keys.has('ArrowLeft'))), mz = stick.y + ((keys.has('KeyS') || keys.has('ArrowDown')) - (keys.has('KeyW') || keys.has('ArrowUp')));
  if (Math.hypot(mx, mz) > .2) return new THREE.Vector3(mx, 0, mz).normalize();
  const s = list.slice().sort((a, b) => a.tti - b.tti)[0]; if (s) { const c = P.pos.clone().sub(s.o.position).setY(0); if (c.lengthSq() > 1e-4) { c.normalize(); const p = new THREE.Vector3(-c.z, 0, c.x); return p.dot(r) >= 0 ? p : p.negate(); } }
  return r; }
function dodge(s) { s.dodged = true; const to = P.pos.clone().sub(s.o.position).setY(0); s.dir = (to.lengthSq() > 1e-6 ? to : (s.dir || new THREE.Vector3(0, 0, 1))).normalize(); s.kind = 'gone'; s.life = .6; }   /* 피한 공격: 그대로 스쳐 지나가며 사라짐 */
function startRoll(dirW, isCrit) {   /* 정한 방향으로 굴러감 · 도는 방향도 그쪽 · 크리티컬은 더 빠르고 멀리 */
  const f = fwd(), r = new THREE.Vector3(-f.z, 0, f.x), d = dirW.clone().setY(0).normalize(), sd = d.dot(r);   /* r = 용의 오른쪽 */
  const side = Math.abs(sd) > .15 ? Math.sign(sd) : (d.x >= 0 ? 1 : -1) * Math.sign(r.x || 1);
  const dist = isCrit ? CFG.critDist : CFG.rollDist, time = isCrit ? CFG.critTime : CFG.rollTime;
  P.roll = { t: 0, side, d, ghosts: 0, dist, time, crit: !!isCrit }; playOnce('roll', 1 / Math.max(.2, time / .45)); SFX.roll(); camNudge.addScaledVector(d, isCrit ? 1.2 : .5); }
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };
/* 잔상: 굴러가는 동안 그 순간 모습을 반투명하게 남김 */
const ghostM = new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: .6, depthWrite: false });   /* 보통 섞기: 풀밭 · 어두운 곳 어디서나 같은 빛깔로 또렷 */
const GHOST_N = 4, GHOST_AT = [.15, .4, .65, .9], GHOST_COL = [0xffb070, 0xffe08a, 0x9fe8ff, 0xc8a8ff], GHOST_LIFE = .5;   /* 크리티컬 롤에만 · 넷 · 따뜻한 빛에서 무지개 끝빛으로 */
const GH = []; let ghI = 0;   /* 잔상 둘: 뼈만 따로 복사해 그 순간 자세로 멈춤 (화면 카드가 그림 · 거의 공짜) */
function mkGhosts() { model.traverse(o => { if (!o.isSkinnedMesh || GH.length) return; const B = o.skeleton.bones, rootB = B.find(b => !(b.parent && b.parent.isBone));
  for (let k = 0; k < GHOST_N; k++) { const grp = new THREE.Group(); grp.matrixAutoUpdate = false; const rc = rootB.clone(true), map = {}; rc.traverse(q => map[q.name] = q); grp.add(rc);
    const m = new THREE.SkinnedMesh(o.geometry, ghostM.clone()); m.material.color.set(GHOST_COL[k]); m.frustumCulled = false; grp.add(m); m.bind(new THREE.Skeleton(B.map(b => map[b.name]), o.skeleton.boneInverses), o.bindMatrix); grp.visible = false; scene.add(grp);
    GH.push({ grp, m, src: B, nb: m.skeleton.bones, par: rootB.parent, t: 1 }); } }); }
function ghost() { if (!GH.length) return; const g = GH[ghI++ % GH.length]; g.src.forEach((b, i) => { g.nb[i].position.copy(b.position); g.nb[i].quaternion.copy(b.quaternion); g.nb[i].scale.copy(b.scale); });
  g.par.updateWorldMatrix(true, false); g.grp.matrix.copy(g.par.matrixWorld); g.grp.matrixWorldNeedsUpdate = true; g.grp.visible = true; g.t = 0; }
function ghostTick(dt) { for (const g of GH) { if (g.t >= 1) continue; g.t = Math.min(1, g.t + dt / GHOST_LIFE); g.m.material.opacity = .6 * Math.pow(1 - g.t, 1.3); if (g.t >= 1) g.grp.visible = false; } }

/* ── 동작 ── */
function playOnce(name, speed = 1) { if (!A[name]) return; const a = A[name]; a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = false; a.timeScale = speed; a.setEffectiveWeight(1); a.fadeIn(.05).play();
  A.fly.setEffectiveWeight(.3); const dur = a.getClip().duration / speed; clearTimeout(a._t); a._t = setTimeout(() => { a.fadeOut(.12); A.fly.setEffectiveWeight(1); }, dur * 1000 - 60); }

/* ── 화면 글자 ── */
let msgT = 0; function showMsg(t, c, ms = 900, size = 34) { const m = $('#msg'); m.textContent = t; m.style.fontSize = size + 'px'; if (c) { m.style.background = c === 'rainbow' ? '' : 'none'; m.style.color = c === 'rainbow' ? 'transparent' : c; m.style.webkitBackgroundClip = c === 'rainbow' ? 'text' : ''; } m.style.opacity = 1; m.style.transform = 'translate(-50%,-50%) scale(1.15)'; clearTimeout(msgT); msgT = setTimeout(() => { m.style.transition = 'opacity .35s, transform .35s'; m.style.opacity = 0; m.style.transform = 'translate(-50%,-50%) scale(1)'; setTimeout(() => m.style.transition = '', 400); }, ms); }
const v3 = new THREE.Vector3(); function dmgText(pos, txt, col, big) { v3.copy(pos).project(cam); const d = document.createElement('div'); d.className = 'dmg'; d.textContent = txt; d.style.color = col; d.style.fontSize = (big ? 26 : 17) + 'px'; d.style.left = (v3.x * .5 + .5) * innerWidth + 'px'; d.style.top = (-v3.y * .5 + .5) * innerHeight + 'px'; document.body.append(d);
  d.animate([{ transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => d.remove(); }
let shake = 0, timeScale = 1, slowT = 0, hitStop = 0;
function crit() {   /* 크리티컬 롤 성공: 멈칫 → 느려짐 · 진동 · 오르는 음 · 잔상 (원 · 불꽃 · 번쩍임 없음 · 사용자 2026-11-12) */
  P.roll.crit = true; P.cdLeft = 0; hitStop = .07; slowT = .4; timeScale = .22; shake = .12; stats.combo++; buzz([28, 35, 50]); SFX.crit(stats.combo - 1); stats.crit++;
  const cb = stats.combo > 1 ? ` ${stats.combo}연속!` : ''; if (CFG.reward === 'speed') { P.speedT = 1.5; showMsg('크리티컬 회피!' + cb, 'rainbow', 900); } else { P.power = true; showMsg('크리티컬 회피!' + cb, 'rainbow', 900); } }
const stats = { crit: 0, early: 0, hits: 0, combo: 0 };

/* ── 내가 맞음 ── */
function hurt(dmg, pos) { P.hp = Math.max(0, P.hp - dmg); stats.hits++; stats.combo = 0; shake = .25; P.hurtT = .25; SFX.hurt(); burst(pos, 0xff5050, 10, 5); dmgText(P.pos.clone().setY(P.pos.y + 1.5), '-' + dmg, '#ff7070'); if (!P.busy) playOnce('hit'); if (P.hp <= 0) { P.hp = 1000; showMsg('다시 시작', '#fff', 900, 24); } }

/* ── 적 맞음 ── */
function hitEnemy(e, dmg, pos, big) { if (e.dead) return; e.hp -= dmg; e.flash = .15; dmgText(pos || e.g.position, String(Math.round(dmg)), big ? '#ffd36b' : '#fff', big); SFX.hit();
  if (e.hp <= 0) { e.dead = 3; e.g.visible = false; burst(e.g.position, e.kind === 'eye' ? 0xb58aff : 0xffa050, 26, 10, .7, .8); SFX.boom(); } }

/* ── 기본 공격 (자동 · 박자 하나) ── */
function nearest() { let best = null, bd = 1e9; for (const e of E) { if (e.dead) continue; const d = Math.hypot(e.g.position.x - P.pos.x, e.g.position.z - P.pos.z) - e.r * .5; if (d < bd) { bd = d; best = e; } } return best ? { e: best, d: bd } : null; }
function attack(dt) {
  P.atkT -= dt; const n = nearest(), show = P.attacking; rOut.visible = rIn.visible = rInFill.visible = show;
  if (!P.attacking || !n || n.d > CFG.range || P.roll) { P.target = null; return; }
  P.target = n.e; if (P.atkT > 0) return;
  const melee = n.d < CFG.melee + (P.lastMelee ? .8 : 0); P.lastMelee = melee; P.atkT = CFG.atkEvery; const pw = P.power ? 1.8 : 1; P.power = false;
  const clip = melee ? 'claw' : 'breath', sp = melee ? 1.15 : 1.25, hitAt = (melee ? .24 : .3) / sp, tgt = n.e; P.busy = A[clip] ? A[clip].getClip().duration / sp : .4; playOnce(clip, sp);
  if (melee) { SFX.claw(); setTimeout(() => { if (tgt.dead) return; const d = Math.hypot(tgt.g.position.x - P.pos.x, tgt.g.position.z - P.pos.z); if (d > CFG.melee + 2) return; hitEnemy(tgt, 34 * pw, null, true); hitStop = .06; shake = .12; slash(tgt.g.position); }, hitAt * 1000); }
  else setTimeout(() => { if (!tgt.dead) { myShot(tgt, 13 * pw); SFX.breath(); } }, hitAt * 1000); }
function slash(pos) { for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.45, 24, 1, -.9, 1.8), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); m.rotation.set(-Math.PI / 2 + .3, P.yaw, (k - 1) * .35); m.position.y += (k - 1) * .25; fx(m, .25, q => { m.scale.setScalar(1 + q * .6); m.material.opacity = 1 - q; }); } burst(pos, 0xffc070, 12, 7, .35, .45); }

/* ── 조절 칸 ── */
{ const pn = $('#panel'); let h = ''; for (const s of SPEC) { if (s[0] === 'cap') { h += `<div class="cap">${s[1]}</div>`; continue; } const [k, lab] = s;
    if (Array.isArray(s[2])) { h += `<div class="r"><label>${lab}</label></div><select data-k="${k}">${s.slice(2).map(([v, t]) => `<option value="${v}" ${CFG[k] === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`; continue; }
    h += `<div class="r"><label for="c_${k}">${lab}</label><input id="c_${k}" data-k="${k}" type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${CFG[k]}"><output>${CFG[k]}</output></div>`; }
  pn.innerHTML = h; pn.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => { const k = el.dataset.k; CFG[k] = el.tagName === 'SELECT' ? el.value : +el.value; if (el.nextElementSibling) el.nextElementSibling.textContent = el.value; }));
  $('#tog').onclick = () => { pn.hidden = !pn.hidden; $('#tog').textContent = pn.hidden ? '조절 칸 ▾' : '조절 칸 ▴'; }; }

/* ── 불러오기 ── */
new GLTFLoader().load('./_mf/DRAGON.glb?v=11122121', g => { model = g.scene; model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) o.material.side = THREE.DoubleSide; } });
  model.position.y = -.75; spin.position.y = .75; spin.add(model);   /* 몸 가운데를 축으로 돎 */
  mixer = new THREE.AnimationMixer(model); for (const c of g.animations) A[c.name] = mixer.clipAction(c); A.fly.play(); model.updateMatrixWorld(true); mkGhosts(); $('#load').classList.add('done'); }, undefined, e => { $('#load').textContent = '불러오지 못했어요: ' + e.message; });

/* ── 매 순간 ── */
const camNudge = new THREE.Vector3(); const clock = new THREE.Clock(), camPos = new THREE.Vector3(0, 30, 30), camT = new THREE.Vector3(); let bankA = 0, t = 0;
function frame() { requestAnimationFrame(frame); const rdt = Math.min(.05, clock.getDelta()); if (slowT > 0) { slowT -= rdt; if (slowT <= 0) timeScale = 1; }
  let dt = rdt * timeScale; if (hitStop > 0) { hitStop -= rdt; dt *= .05; } t += dt;
  /* 이동 */
  let mx = stick.x + ((keys.has('KeyD') || keys.has('ArrowRight')) - (keys.has('KeyA') || keys.has('ArrowLeft'))), mz = stick.y + ((keys.has('KeyS') || keys.has('ArrowDown')) - (keys.has('KeyW') || keys.has('ArrowUp')));
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; } const spd = CFG.speed * (P.speedT > 0 ? 1.6 : 1); P.speedT -= dt;
  P.vel.lerp(new THREE.Vector3(mx * spd, 0, mz * spd), 1 - Math.exp(-dt * 6));
  let desiredYaw = P.yaw; if (P.target && (P.attacking)) desiredYaw = Math.atan2(P.target.g.position.x - P.pos.x, P.target.g.position.z - P.pos.z); else if (ml > .15) desiredYaw = Math.atan2(mx, mz);
  let dy = ((desiredYaw - P.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const turn = Math.max(-1, Math.min(1, dy * 6)) * 7 * dt; if (!P.roll) P.yaw += Math.abs(turn) > Math.abs(dy) ? dy : turn;
  bankA += ((P.roll ? 0 : -Math.max(-.6, Math.min(.6, dy * 1.4))) - bankA) * (1 - Math.exp(-dt * 6));
  P.pos.addScaledVector(P.vel, dt);
  /* 롤: 미는 쪽으로 빠르게 비켜나며 몸통 축으로 한 바퀴 */
  if (P.roll) { const r = P.roll; r.t += dt; const k = Math.min(1, r.t / r.time), e = 1 - Math.pow(1 - k, 3), es = 1 - Math.pow(1 - k, 2.2), prev = r.e || 0;   /* 미는 순간 튀어 나가고 끝은 부드럽게 */
    P.pos.addScaledVector(r.d, (e - prev) * r.dist); r.e = e; spin.rotation.z = r.side * es * Math.PI * 2; if (r.crit && r.ghosts < GHOST_N && e > GHOST_AT[r.ghosts]) { r.ghosts++; ghost(); }   /* 간 거리 기준으로 고르게 남김 */ if (k >= 1) { P.roll = null; spin.rotation.z = 0; } }
  P.cdLeft = Math.max(0, P.cdLeft - dt); P.busy = Math.max(0, P.busy - dt);
  P.pos.y = FLY; const pl = Math.hypot(P.pos.x, P.pos.z); if (pl > 60) P.pos.multiplyScalar(60 / pl).setY(FLY);
  dragon.position.copy(P.pos); lean.rotation.x = CFG.lean * Math.PI / 180; yawG.rotation.y = P.yaw; bank.rotation.z = bankA;
  if (mixer) mixer.update(dt); ghostTick(dt);
  attack(dt);
  rOut.position.copy(P.pos).setY(FLY - .6); rOut.scale.setScalar(CFG.range); rIn.position.copy(rOut.position); rIn.scale.setScalar(CFG.melee); rInFill.position.copy(rOut.position); rInFill.scale.setScalar(CFG.melee);
  /* 적 */
  let incoming = null;
  for (const e of E) { const g = e.g;
    if (e.dead) { e.dead -= dt; e.bar.style.display = 'none'; if (e.dead <= 0) { e.dead = 0; e.hp = e.max; g.visible = true; burst(g.position, 0xffffff, 12, 4); } continue; }
    e.flash = Math.max(0, e.flash - dt); g.position.y = e.home.y + Math.sin(t * 1.6 + e.home.x) * .25;
    if (e.kind === 'dummy') { e.core.rotation.y += dt * 1.5; e.core.material.emissiveIntensity = 1.6 + e.flash * 14; e.shell.forEach((s, k) => { const a = t * .6 + k / 5 * Math.PI * 2; s.position.x = Math.cos(a) * 1.05; s.position.z = Math.sin(a) * 1.05; s.rotation.x += dt; }); g.scale.setScalar(1 + e.flash * 1.2); }
    else { const to = P.pos.clone().sub(g.position); g.rotation.y = Math.atan2(to.x, to.z); e.shards.forEach((s, k) => { const a = t * 1.3 + k / 6 * Math.PI * 2; s.position.set(Math.cos(a) * 1.7, Math.sin(a * 2) * .3, Math.sin(a) * 1.7); s.rotation.y += dt * 2; });
      const near = to.length() < 17; if (CFG.turret && near) { e.fireT -= dt; e.charge = Math.max(0, Math.min(1, 1 - e.fireT / .55)); if (e.fireT <= 0) { e.fireT = CFG.fireEvery; e.charge = 0; enemyShot(e); } } else e.charge = 0;
      e.eye.material.emissiveIntensity = 1.6 + e.charge * 6 + e.flash * 10; e.halo.material.opacity = .35 + e.charge * .6; e.halo.scale.setScalar(3.2 + e.charge * 2.5);
      if (CFG.skill && near) { e.skillT -= dt; if (e.skillT < .7 && !e.tele) { e.tele = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 30), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: .25, depthWrite: false, blending: THREE.AdditiveBlending })); e.tele.rotation.x = -Math.PI / 2; scene.add(e.tele); e.teleDir = to.clone().setY(0).normalize(); }
        if (e.tele) { const d = e.teleDir; e.tele.position.copy(g.position).addScaledVector(d, 15).setY(FLY - .55); e.tele.rotation.z = Math.atan2(-d.x, -d.z); e.tele.material.opacity = .15 + .3 * (1 - Math.max(0, e.skillT) / .7); }
        if (e.skillT <= 0) { e.skillT = CFG.skillEvery; if (e.tele) { scene.remove(e.tele); e.tele = null; } enemySkill(e); SHOTS[SHOTS.length - 1].dir = e.teleDir || SHOTS[SHOTS.length - 1].dir; } } }
    v3.copy(g.position).setY(g.position.y + 2.2).project(cam); e.bar.style.display = 'block'; e.bar.style.left = (v3.x * .5 + .5) * innerWidth + 'px'; e.bar.style.top = (-v3.y * .5 + .5) * innerHeight + 'px'; e.bar.firstChild.style.width = Math.max(0, e.hp / e.max * 100) + '%'; }
  /* 탄 */
  for (let i = SHOTS.length - 1; i >= 0; i--) { const s = SHOTS[i]; let done = false;
    if (s.from === 'me') { if (s.target.dead) done = true; else { const to = s.target.g.position.clone().sub(s.o.position), l = to.length(); s.o.position.addScaledVector(to.normalize(), Math.min(l, s.speed * dt)); if (l < 1) { hitEnemy(s.target, s.dmg, s.o.position); burst(s.o.position, 0xffa24a, 12, 6, .4, .6); done = true; } } }
    else if (s.kind === 'basic') {   /* 유도 기본 공격: 남은 시간 = 거리 ÷ 속도 */
      const to = P.pos.clone().sub(s.o.position), l = to.length(); s.tti = Math.max(0, l - .9) / s.speed; if (!incoming || s.tti < incoming.tti) incoming = { tti: s.tti };
      s.o.position.addScaledVector(to.normalize(), Math.min(l, s.speed * dt));
      if (l < .9) { done = true; if (!(P.roll && P.roll.crit)) hurt(s.dmg, s.o.position); } }   /* 크리티컬 롤 중엔 다른 공격도 스침 · 일반 롤은 맞음 */
    else if (s.kind === 'skill') {   /* 직선 불덩이: 내 쪽으로 오는 줄 위에 있을 때만 위험 */
      s.o.position.addScaledVector(s.dir, s.speed * dt); s.life -= dt; const rel = P.pos.clone().sub(s.o.position).setY(0), along = rel.dot(s.dir), side = Math.sqrt(Math.max(0, rel.lengthSq() - along * along));
      s.tti = along > -.5 && side < 1.6 ? Math.max(0, along - 1.5) / s.speed : 1e9; if (s.tti < 1e8 && (!incoming || s.tti < incoming.tti)) incoming = { tti: s.tti };
      if (Math.hypot(rel.x, rel.z) < 1.5) { done = true; if (!(P.roll && P.roll.crit)) hurt(s.dmg, s.o.position); }
      if (s.life <= 0) done = true; }
    else { s.o.position.addScaledVector(s.dir, s.speed * dt); s.life -= dt; s.o.scale.setScalar(Math.max(.01, s.life / .6)); if (s.life <= 0) done = true; }   /* 피한 공격: 스쳐 지나가며 작아짐 */
    if (done) { scene.remove(s.o); SHOTS.splice(i, 1); } else if ((s.trail += dt) > .03) { s.trail = 0; const tr = glow(s.from === 'me' ? 0xff8a3a : s.kind === 'skill' ? 0xff5a2a : 0x9a7bff, s.kind === 'skill' ? 1.6 : .8, .6); tr.position.copy(s.o.position); fx(tr, .3, k => { tr.material.opacity = .6 * (1 - k); tr.scale.multiplyScalar(.97); }); } }
  /* 타이밍 표시: 날아오는 공격이 닿기 직전 좁혀 드는 고리 · 판정 시간 안이면 금빛 */
  rTell.visible = !!(CFG.tell && incoming && incoming.tti < .7); if (rTell.visible) { const w = CFG.critMs / 1000; rTell.position.copy(P.pos).setY(FLY - .5); rTell.scale.setScalar(1.6 + incoming.tti * 6); const inW = incoming.tti <= w; rTell.material.color.set(inW ? 0xffd34a : 0xffffff); rTell.material.opacity = inW ? 1 : .55; }
  /* 효과 */
  for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const k = Math.min(1, f.t / f.life); f.upd(k, dt); if (k >= 1) { scene.remove(f.o); if (f.o.material) f.o.material.dispose(); FX.splice(i, 1); } }
  /* 카메라 (게임처럼 비스듬히 위에서 · 살짝 늦게 따라옴) */
  camT.lerp(P.pos, 1 - Math.exp(-rdt * 8)); if (camH !== CFG.viewH || camA !== CFG.camAng) { camH = CFG.viewH; camA = CFG.camAng; const w = camH * innerWidth / innerHeight / 2; cam.left = -w; cam.right = w; cam.top = camH / 2; cam.bottom = -camH / 2; cam.updateProjectionMatrix(); }
  const CA = camA * Math.PI / 180, aim = camT.clone().add(new THREE.Vector3(0, 0, -CFG.camOff)), want = aim.clone().add(new THREE.Vector3(0, Math.sin(CA) * CAM_D, Math.cos(CA) * CAM_D)).addScaledVector(camNudge, 1); camPos.lerp(want, 1 - Math.exp(-rdt * 8)); cam.position.copy(camPos);
  if (shake > 0) { shake -= rdt; cam.position.x += (Math.random() - .5) * shake * 1.2; cam.position.y += (Math.random() - .5) * shake * 1.2; }
  cam.lookAt(aim.x + camNudge.x, aim.y - .5, aim.z + camNudge.z); camNudge.multiplyScalar(Math.exp(-rdt * 6));
  sun.position.copy(P.pos).add(new THREE.Vector3(-20, 40, 15)); sun.target.position.copy(P.pos);
  /* 화면 글 */
  { const inW = !!(incoming && incoming.tti <= CFG.critMs / 1000); rollEl.classList.toggle('gold', !!CFG.btnTell && inW); $('#rcd').style.strokeDashoffset = (264 * (P.cdLeft / CFG.cd)).toFixed(1); rollEl.classList.toggle('wait', P.cdLeft > 0); }
  $('#hp i').style.width = (P.hp / 10) + '%'; $('#st').textContent = `크리티컬 회피 ${stats.crit}${stats.combo > 1 ? ' (' + stats.combo + '연속)' : ''} · 빨랐음 ${stats.early} · 맞음 ${stats.hits}${P.speedT > 0 ? ' · 빨라짐!' : ''}${P.power ? ' · 다음 공격 강화!' : ''}`;
  R.render(scene, cam); }
frame();
window.__dragon = { P, CFG, E, stats, SHOTS, pressRoll, ghost, cam, lean, GH };
