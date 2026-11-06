/* 맵 만들기 ① — 맵 6안(10명 개인전 · 정사각형)대로 바닥 · 지역 · 벽 · 큰길 · 샛길 · 문기둥 + 날아 보기
   날아 보기: 1번 기지에서 기체를 조이스틱으로 몰아 맵 크기·길·문을 몸으로 확인(지금 있는 땅 이름 · 출발 뒤 걸린 시간 · 속도 바꾸기)
   보기: 날아 보기·지역 보기는 기체를 따라감, 맵 전체는 가운데 고정(끌어서 이동). 두 손가락(휠)로 확대. 시작 기지 자리는 빛 고리(다음 단계에서 진짜 기지) */
import * as THREE from 'three';
import { makeBloom } from '../core/hangar/bloom.js?v=11061643';
import { makeMapFloor, MAP, toWorld } from './mapfloor.js?v=11061643';
import { makePerf } from './perf.js?v=11061643';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFlight, loadBlock, FLY } from './flight.js?v=11061643';
import { makeWalls } from './walls.js?v=11061643';
import { makeMotes } from './motes.js?v=11061643';
import { makeBushes } from './bushes.js?v=11061643';
import { makeVision } from './vision.js?v=11061643';
import { makeHide } from './hideviz.js?v=11061643';
import { makeWardsOnMap, WARDS } from './wardsight.js?v=11061643';
import { makeBlackHole } from './blackhole.js?v=11061643';
import { makeBossCrystals } from './bosscrystals.js?v=11061643';
import { makeShots } from './shots.js?v=11061643';
import { makeJellies } from './jelly.js?v=11061643';
import { makeMobFx } from './mobfx.js?v=11061643';
import { makeHunt } from './hunt.js?v=11061643';
import { makeRange } from './range.js?v=11061643';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const VIEWS = [{ name: '날아 보기', h: 42, tilt: .38 }, { name: '지역 보기', h: 160, tilt: .25 }, { name: '맵 전체', h: 520, tilt: .02 }];

export async function start(canvas, onProgress = () => {}, opt = {}) {
    /* 오류 보기 (임시 · 폰에서 화면이 까만 원인 찾기): 오류·셰이더 실패·그래픽 끊김을 화면 왼쪽 아래에 글자로 띄움 */
  const dg = document.createElement('div'); dg.style.cssText = 'position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 34px);max-width:60vw;max-height:45vh;overflow:auto;padding:6px 9px;background:rgba(40,0,0,.82);border:1px solid #ff7a5a;border-radius:8px;color:#ffd9cc;font:11px/1.45 monospace;white-space:pre-wrap;z-index:30;pointer-events:none'; dg.hidden = true; document.body.appendChild(dg);
  const dgL = []; const dgAdd = m => { m = String(m).slice(0, 400); if (dgL.includes(m) || dgL.length > 12) return; dgL.push(m); dg.hidden = false; dg.textContent = dgL.join('\n'); };
  addEventListener('error', e => dgAdd('오류: ' + (e.message || e) + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')));
  addEventListener('unhandledrejection', e => dgAdd('오류(약속): ' + (e.reason?.message || e.reason)));
  { const ce = console.error.bind(console); console.error = (...a) => { dgAdd('콘솔: ' + a.map(x => x?.stack || x?.message || x).join(' ')); ce(...a); };
    const cw = console.warn.bind(console); console.warn = (...a) => { const s = a.join(' '); if (/shader|program|WebGL|GL_/i.test(s)) dgAdd('경고: ' + s); cw(...a); }; }
  canvas.addEventListener('webglcontextlost', () => dgAdd('그래픽 끊김 (webglcontextlost)'));
  window.__dgAdd = dgAdd;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.debug.onShaderError = (gl, prog, vs, fs) => { dgAdd('셰이더 실패: ' + (gl.getProgramInfoLog(prog) || '') + ' | ' + (gl.getShaderInfoLog(vs) || '') + ' | ' + (gl.getShaderInfoLog(fs) || '')); };
  { const gl = renderer.getContext(), ex = gl.getExtension('WEBGL_debug_renderer_info'); window.__gpu = ex ? gl.getParameter(ex.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 1, 3000), bloom = makeBloom(renderer, { samples: 0 });
  onProgress(.2);
  const floor = await makeMapFloor(renderer, './assets/map/v7.png?v=11061643');
  const J = await (await fetch('./assets/map/v7.json?v=11061643')).json();
  const BLK = await loadBlock('./assets/map/v7.png?v=11061643');                  /* 벽 판정 = 바닥에 그린 벽 그림 그대로 */
  const UT = { value: 0 }, WALL = makeWalls(BLK, floor, J.ridges, UT); floor.mat.uniforms.uWf.value = WALL.fieldTex;   /* 바닥도 같은 벽 지도로 */
  scene.add(WALL.real); scene.add(WALL.mesh); WALL.mesh.visible = false;   /* 승인된 벽 5종 · 맵 전체 보기에서만 가벼운 한 덩어리 벽(멀리서 보는 지도) */
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const SPAWN = J.spawns, ALL = [...J.labels.map(o => [o.x, o.y, o.n, o.l]), [500, 500, '무너진 중심부', 'Lv 10+']];
  onProgress(.7);
  /* 시작 기지 자리: 빛 고리 (임시) */
  const ringM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying vec2 vP; void main(){ float r=length(vP); float q=(r-7.)/.6; float k=exp(-q*q)+exp(-r*r*.05)*.25*(.7+.3*sin(uT*2.)); gl_FragColor=vec4(vec3(.72,1.,.3)*k,1.); }' });
  for (const [px, py] of SPAWN) { const [x, z] = toWorld(px, py), m = new THREE.Mesh(new THREE.CircleGeometry(9, 64), ringM); m.rotation.x = -Math.PI / 2; m.position.set(x, .1, z); scene.add(m); }
  /* 문: 길이 벽을 뚫고 지나가는 자리마다 문기둥 한 쌍 + 두 기둥 사이 바닥을 잇는 빛
     · 왜: 벽이 끊긴 자리가 '실수로 빈 틈'이 아니라 '일부러 낸 문'이라는 걸 멀리서도 알아보게
     · 기둥: 건메탈 몸통 + 금테 머리(기지와 같은 재료) · 안쪽 면에 빛 줄(문 종류 색)
     · 바닥 빛: 기둥 안쪽 빛 줄에서 흘러나와 맞은편 기둥으로 건너감 → 두 기둥이 한 문틀이라는 게 보임
       종류 색: 큰길 금빛 · 보물 땅 문 호박빛 · 보스 옆 샛길 붉은빛(위험) · 좁은 틈 보랏빛
     무게: 기둥·머리·빛 줄·바닥 빛 각각 한 묶음(InstancedMesh) → 문이 백 개여도 그리기 4번 */
  scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x14100c, 1.1));
  { const k = new THREE.DirectionalLight(0xfff0dc, 2.4); k.position.set(-60, 120, -40); scene.add(k);
    const f = new THREE.DirectionalLight(0x8fb0ff, .6); f.position.set(70, 50, 90); scene.add(f); }   /* 반대쪽 푸른 빛: 흑요석·얼음의 매끈한 면에 비치는 빛 (벽 보기와 같게) */
  /* 문기둥·문턱 빛은 없앰 (사용자 결정 2026-11-03): 벽이 실제로 서 있어 벽이 끊긴 틈이 곧 문으로 보임 */

  /* 이름표 */
  const tagBox = $('#tags'), tags = ALL.map(([px, py, n, l]) => { const el = document.createElement('div'); el.className = 'tag'; el.innerHTML = `<b>${n}</b><span>${l}</span>`; tagBox.appendChild(el); const [x, z] = toWorld(px, py); return { el, p: new THREE.Vector3(x, 0, z) }; });

  /* 날아 보기: 1번 기지에서 가운데를 보고 출발 */
  const [sx, sz] = toWorld(...SPAWN[0]);
  const fly = await makeFlight(renderer, BLK, [sx, sz], Math.atan2(sx, sz)); scene.add(fly); const FS = fly.userData.S;
  const bushes = makeBushes(BLK, J, { off: true });                                                           /* 숨을 곳: 자리·모양·규칙 */
  /* 숨을 곳 생김새 후보: ① 가스 구름 ② 돌 부스러기 무리 (자리·규칙은 같음, 버튼으로 바꿔 봄). 수풀 생김새는 우주에 안 어울려 숨김 */
  const hide = makeHide(bushes, floor.ST, floor.noise); scene.add(hide.mesh);                    /* 생김새: 가스 구름 + 돌 부스러기 */
  const vision = makeVision(BLK, bushes, floor.noise); let sightOn = true;                     /* 시야 가림: 둘레 30m · 벽 뒤 안 보임 */
  const wards = makeWardsOnMap(BLK, vision, UT); scene.add(wards);
  const bh = makeBlackHole(BLK, { rooms: SPAWN.map(p => toWorld(...p)), mine: 0 }); scene.add(bh);   /* 보스 구역 블랙홀: 떠돌며 둘레 공간을 끌고 돎 → 안쪽 둥근 길이 소용돌이 흐름, 한가운데에 빨려 들면 맵 아무 곳으로 */
  const toast = document.createElement('div'); toast.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 150px);transform:translateX(-50%);padding:7px 16px;border-radius:14px;background:rgba(20,6,30,.7);border:1px solid rgba(200,140,255,.45);color:#f2e6ff;font-size:13px;letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .4s;white-space:nowrap'; document.body.appendChild(toast);
  let toastT = 0; const say = m => { toast.textContent = m; toast.style.opacity = 1; toastT = 2.6; };                              /* 와드 10개: 5m 안에 10초 머물면 차지 → 물결이 밝히는 땅만 퍼지며 안개 시야가 차례로 걷힘 */
  const crystals = makeBossCrystals(BLK, UT); scene.add(crystals);                                   /* 보스 구역 수정 기둥 20개: 탄을 튕김 · 기체는 부딪힘 */
  /* 사냥터 몹: 성운 해파리 떼 (방마다 셋 · 통로 쪽일수록 셈 · 다 잡으면 1분 뒤 다시) */
  const jel = makeJellies(UT); scene.add(jel); const mfx = makeMobFx(); scene.add(mfx);
  const beaconScene = new THREE.Scene(); beaconScene.add(jel.userData.beacon);                       /* 안개 속 등불: 시야 덮개 뒤에 그림 */
  const hunt = makeHunt(BLK, jel, SPAWN.map(p => toWorld(...p)));
  let expN = 0;
  const shots = makeShots({ B: BLK, crystals, bh, FS, say, mobs: jel, ship: fly.children[0], onKill: (j, killed) => { if (killed) { mfx.userData.burst(j.x, j.y, j.z, j.strong ? 14 : 5); mfx.userData.pop(j.strong); range?.kill(t, j); } },
    onDamage: (j, d, c, bo) => range?.dmg(t, j, d, c, bo), onReveal: (x, z, r, dur) => vision.light(x, z, r, dur, t), canSee: (x, z) => !(sightOn && view < 2) || vision.canSee(x, z) });   /* 비추는 탄: 맞은 둘레를 잠깐 밝힘 */
  let range = null; scene.add(shots);                          /* 기본탄: 오른쪽 아래 버튼에서 끌어 조준 · 누르는 동안 쏨 · 과열 */
  const hideEl = document.createElement('div'); hideEl.id = 'hide'; hideEl.innerHTML = '<i></i><b>숨음</b>'; document.body.appendChild(hideEl);
  const motes = makeMotes(BLK, J.labels.map(o => { const [x, z] = toWorld(o.x, o.y); return [J.names.indexOf(o.n), x, z]; })); scene.add(motes.mesh);   /* 땅마다 떠다니는 알갱이 */
  /* 땅 이름: 경계를 넘으면 화면 위쪽에 잠깐 떴다 사라짐 (그 땅 안개 색 한 줄과 함께)
     · 경계에서 왔다 갔다 할 때 깜빡이지 않게: 새 땅에 0.35초 머물러야 띄움 */
  const SUB = { 0: '시작 기지 앞마당', 16: 'Lv 10+ · 필드 보스' }; J.labels.forEach(o => { const k = J.names.indexOf(o.n); if (!(k in SUB)) SUB[k] = o.l === '보물 땅' ? '보물 땅' : (k >= 6 && k <= 10 ? '중간 보스 · ' : '정글 · ') + o.l; });
  const ban = document.createElement('div'); ban.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 96px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;opacity:0;transition:opacity .5s, transform .5s;text-shadow:0 0 14px rgba(0,0,0,.8)';
  ban.innerHTML = '<div style="display:flex;align-items:center;gap:12px"><i style="display:block;height:1px;width:0;transition:width .7s .1s"></i><b style="font-weight:500;font-size:19px;letter-spacing:.22em;color:#f4f7ee;white-space:nowrap"></b><i style="display:block;height:1px;width:0;transition:width .7s .1s"></i></div><span style="font-size:11px;letter-spacing:.16em;color:rgba(230,240,220,.7)"></span>';
  document.body.appendChild(ban); const banB = ban.querySelector('b'), banS = ban.querySelector('span'), banL = ban.querySelectorAll('i');
  let banReg = -1, banCand = -1, banSince = 0, banHide = 0;
  const showBan = k => { const c = floor.ST[k].b.map(v => Math.min(255, v * 255 * 1.9 | 0)).join(','); banB.textContent = J.names[k]; banS.textContent = SUB[k] || '';
    banL.forEach(l => { l.style.background = `linear-gradient(90deg, rgba(${c},0), rgba(${c},.9))`; l.style.width = '0'; }); banL[1].style.background = `linear-gradient(90deg, rgba(${c},.9), rgba(${c},0))`;
    ban.style.transition = 'none'; ban.style.opacity = 0; ban.style.transform = 'translateX(-50%) translateY(6px)'; void ban.offsetWidth; ban.style.transition = 'opacity .5s, transform .5s';
    ban.style.opacity = 1; ban.style.transform = 'translateX(-50%)'; banL.forEach(l => l.style.width = '46px'); banHide = 2.4; };
  /* 보기 */
  const cam = { x: sx, z: sz, h: 42, H: 42, tilt: .38, T: .38, az: 0 }, tour = $('#tour'); let view = 0;
  $('#head span').textContent = '맵 7안 3단계 · 살아나는 방 · 보물 땅 · 사냥터 · 360m · 화면 왼쪽을 누르면 조이스틱 (컴퓨터: WASD·방향키) · 두 손가락으로 확대';
  VIEWS.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = v.name; b.className = i === 0 ? 'on vw' : 'vw';
    b.onclick = () => { view = i; cam.H = v.h; cam.T = v.tilt; if (i === 2) { cam.x = 0; cam.z = 0; } WALL.real.visible = i < 2; WALL.mesh.visible = i === 2; tour.querySelectorAll('.vw').forEach(x => x.classList.toggle('on', x === b)); }; tour.appendChild(b); });
  /* 크기 재기: 지금 땅 이름 · 출발 뒤 걸린 시간 · 속도 바꾸기 · 기지로 */
  const hud = document.createElement('div'); hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);padding:6px 14px;border-radius:14px;background:rgba(4,8,6,.55);border:1px solid rgba(185,255,74,.25);color:#e8f6d0;font-size:12.5px;letter-spacing:.03em;pointer-events:none;white-space:nowrap'; document.body.appendChild(hud);
  let clock = -1, spI = 1, fogOn = true;
  { const b = document.createElement('button'); b.type = 'button'; const lab = () => b.textContent = `속도 ${FLY.SPEEDS[spI]}m/초`; lab();
    b.onclick = () => { spI = (spI + 1) % FLY.SPEEDS.length; FS.speed = FLY.SPEEDS[spI]; lab(); }; tour.appendChild(b);
    const fg = document.createElement('button'); fg.type = 'button'; const fl = () => fg.textContent = fogOn ? '땅 안개 끄기' : '땅 안개 켜기'; fl();
    fg.onclick = () => { fogOn = !fogOn; fl(); }; tour.appendChild(fg);
    const sg = document.createElement('button'); sg.type = 'button'; const sl = () => sg.textContent = sightOn ? '시야 가림 끄기' : '시야 가림 켜기'; sl();
    sg.onclick = () => { sightOn = !sightOn; sl(); }; tour.appendChild(sg);
    const h = document.createElement('button'); h.type = 'button'; h.textContent = '기지로'; h.onclick = () => { fly.userData.reset(); clock = -1; }; tour.appendChild(h); }
  const ptr = new Map(); let pin = 0;
  addEventListener('pointerdown', e => { if (e.target.closest('#ui') || (e.clientX <= innerWidth * .55 && ptr.size === 0)) return;   /* 왼쪽 한 손가락 = 조이스틱 */
    ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, c] = [...ptr.values()]; pin = Math.hypot(a[0] - c[0], a[1] - c[1]); } });
  addEventListener('pointermove', e => { if (!ptr.has(e.pointerId)) return; const o = ptr.get(e.pointerId);
    if (ptr.size === 1 && view === 2) { const k = cam.h * .0018; cam.x -= (e.clientX - o[0]) * k; cam.z -= (e.clientY - o[1]) * k; cam.x = clamp(cam.x, -180, 180); cam.z = clamp(cam.z, -180, 180); }
    ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 2) { const [a, c] = [...ptr.values()], d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (pin) cam.H = clamp(cam.H * pin / d, 20, 620); pin = d; } });
  const upF = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pin = 0; }; addEventListener('pointerup', upF); addEventListener('pointercancel', upF);
  addEventListener('wheel', e => { cam.H = clamp(cam.H * Math.exp(e.deltaY * .0012), 20, 620); }, { passive: true });

  let Wd = 2, Hd = 2, cw = 1, ch = 1;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); floor.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); fly.userData.setPx(Hd); motes.setPx(Hd); }
  addEventListener('resize', size); size();
  let last = performance.now(), t = 0; const v = new THREE.Vector3();
  renderer.info.autoReset = false;
  renderer.setAnimationLoop(now => { try { renderer.info.reset();
    const dt = clamp((now - last) / 1000, 0, .05) * (FS.stopUntil > performance.now() ? .05 : 1); last = now; t += dt;   /* 크리티컬 반사 순간 아주 짧게 멈칫 */
    fly.userData.update(t, dt);
    shots.userData.update(t, dt, Hd / (2 * Math.tan(camera.fov * Math.PI / 360)));
    { const px = Hd / (2 * Math.tan(camera.fov * Math.PI / 360));
      jel.userData.step(t, dt, { sx: FS.x, sz: FS.z, blocked: (x, z) => BLK.blocked(x, z) || BLK.region(x, z) !== 1, canChase: j => BLK.region(FS.x, FS.z) === 1 && Math.hypot(FS.x - j.home[0], FS.z - j.home[1]) < 22, spit: (j, dx, dz) => mfx.userData.spit(j.x + dx * j.s * .7, j.y - .2, j.z + dz * j.s * .7, dx, dz) });
      for (const sg of jel.userData.signals.splice(0)) mfx.userData.signal(sg);
      hunt.update(t); jel.userData.draw(t, cam.x, cam.z, 80); jel.userData.setPx(px);
      mfx.userData.update(t, dt, px, FS, q => { FS.hurt = t; FS.gooUntil = t + 2; shots.userData.sparks(q.x, q.z, 1.2, .45, .3, 12); }, () => { expN++; }); }
    motes.update(t, dt, FS.x, FS.z); wards.userData.update(t, dt, FS.x, FS.z);
    if (toastT > 0 && (toastT -= dt) <= 0) toast.style.opacity = 0;
    const inBush0 = bushes.update(t, dt, FS.x, FS.z), lit = inBush0 ? jel.userData.litAt(FS.x, FS.z) : 0, inBush = inBush0 && lit < .35;   /* 숨을 곳에 있어도 해파리 빛 안이면 드러남 (사용자 2026-11-04) */
    if (inBush0 && !inBush && !FS.litSaid) { FS.litSaid = 1; say('해파리 빛에 드러남 — 숨을 곳에 있어도 보여요'); } if (!inBush0 || inBush) FS.litSaid = 0;
    hide.update(t, dt, FS.x, FS.z, inBush); fly.userData.setGhost(inBush);   /* 숨으면 내 화면에서 내 기체 반투명 */
    { const k = BLK.region(FS.x, FS.z); if (k !== banCand) { banCand = k; banSince = t; } if (k !== banReg && k !== 17 && t - banSince > .35) { banReg = k; showBan(k); }
      if (banHide > 0 && (banHide -= dt) <= 0) { ban.style.opacity = 0; banL.forEach(l => l.style.width = '0'); } }
    if (view < 2) { const lx = FS.x + FS.vx * .35, lz = FS.z + FS.vz * .35, k = Math.min(1, dt * 5); cam.x += (lx - cam.x) * k; cam.z += (lz - cam.z) * k; }   /* 기체를 따라감: 가는 쪽을 조금 더 보여줌 */
    { const mv = Math.hypot(FS.vx, FS.vz); if (clock < 0 && mv > .5) clock = t;
      const [wo, wd] = wards.userData.nearest(FS.x, FS.z), wS = wo.w.userData.S, wTxt = wS.cap >= 0 ? ` · 와드 차지 ${Math.ceil(WARDS.CAP * (1 - wS.cap))}초` : wS.own === 'mine' && wd < 12 ? ' · 내 와드' : '';
      hud.textContent = `${J.names[BLK.region(FS.x, FS.z)] || ''}${expN ? ' · 경험치 ' + expN : ''} · ${clock < 0 ? '출발 전' : '출발 뒤 ' + (t - clock).toFixed(1) + '초'} · ${mv.toFixed(1)}m/초${FS.shield > 0 ? ' · 보호막 ' + FS.shield.toFixed(1) : ''}${FS.boost > 0 ? ' · 가속 ' + FS.boost.toFixed(1) : ''}${wTxt}`; }
    cam.h += (cam.H - cam.h) * Math.min(1, dt * 3); cam.tilt += (cam.T - cam.tilt) * Math.min(1, dt * 3);
    { const kk = FS.kT ? Math.exp(-(performance.now() - FS.kT) / 70) * Math.sin(Math.min(1, (performance.now() - FS.kT) / 40) * 1.57) : 0, kx = (FS.kx || 0) * kk, kz = (FS.kz || 0) * kk;   /* 칼 간 쪽으로 한 번 밀렸다 돌아오는 흔들림 */
      camera.position.set(cam.x + kx, cam.h * Math.cos(cam.tilt), cam.z + cam.h * Math.sin(cam.tilt) + kz); camera.lookAt(cam.x + kx, 0, cam.z + kz); } camera.updateMatrixWorld();
    bh.userData.update(t, dt, fly, FS, camera, bloom, Wd, Hd, say);                                   /* 흐름은 다음 장면의 움직임에 실림 */
    vision.on = sightOn && view < 2; vision.update(t, dt, FS.x, FS.z, camera);   /* 맵 전체 보기는 지도라서 가리지 않음 */
    { hideEl.classList.toggle('on', inBush); if (inBush) { v.set(FS.x, FLY.HOVER, FS.z).project(camera); hideEl.style.transform = `translate(${(v.x * .5 + .5) * cw}px,${(-v.y * .5 + .5) * ch}px)`; } }
    UT.value = t; WALL.real.userData.update(t, dt); { const u = floor.mat.uniforms.uFog; u.value += ((fogOn ? 1 : 0) - u.value) * Math.min(1, dt * 4); } floor.update(t); ringM.uniforms.uT.value = t;
    for (const g of tags) { v.copy(g.p).project(camera); const on = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      g.el.style.opacity = on ? 1 : 0; if (on) g.el.style.transform = `translate(${(v.x * .5 + .5) * cw}px,${(-v.y * .5 + .5) * ch}px) translate(-50%,-50%)`; }
    if (FS.nose && FS.heatVis > .01) { v.copy(FS.nose).project(camera); const k = Hd / (2 * Math.tan(camera.fov * Math.PI / 360)) / Math.max(1, camera.position.distanceTo(FS.nose)) / Hd;   /* 열 아지랑이: 달아오른 총구 앞 공기 */
      bloom.haze(v.x * .5 + .5, v.y * .5 + .5, Math.max(.008, .32 * k), FS.heatVis * .35, t); } else bloom.haze(.5, .5, 0, 0, t);
    renderer.setRenderTarget(bloom.scene); renderer.clear(); floor.render(camera, bloom.scene); renderer.render(scene, camera); renderer.render(vision.scene, vision.cam0); if (sightOn && view < 2) renderer.render(beaconScene, camera);
    range?.update(t, camera, cw, ch, dt, Hd / (2 * Math.tan(camera.fov * Math.PI / 360)));
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (err) { console.error('[맵]', err); dgAdd('매 장면 오류: ' + (err?.stack || err).toString().split('\n').slice(0, 3).join(' / ')); } });
  { const v = (import.meta.url.match(/v=(\d+)/) || [])[1] || '개발'; const el = document.createElement('div'); el.textContent = '7안 · 판 번호 ' + v;   /* 어떤 버전이 열렸는지 바로 확인 */
    el.style.cssText = 'position:fixed;left:max(18px,env(safe-area-inset-left,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 14px);font-size:11px;color:rgba(185,255,74,.7);pointer-events:none'; document.body.appendChild(el); }
  if (opt.range) { range = makeRange({ shots, fly, FS, cam, hunt, jel, crystals, bushes, say, renderer, scene, B: BLK, rooms: SPAWN.map(p => toWorld(...p)) }); $('#head b').textContent = '기본탄 시험장'; $('#head span').hidden = true; hud.style.display = 'none'; }
  onProgress(1);
  window.__wv = { get range() { return range; }, get t() { return t; }, cam, fly: FS, wards, bh, crystals, shots, jel, hunt, mfx, wallTris: WALL.mesh.userData.tris, real: WALL.real.userData, wallRoot: WALL.real, info: renderer.info, vision, hide: () => [bushes.list.length, ...hide.count], spots: () => bushes.list.map(b => [b.why, b.size, b.shape, +b.x.toFixed(0), +b.z.toFixed(0)]), dbg: () => { const o = {}; const ex = []; scene.traverse(m => { if (m.isMesh && !m.isInstancedMesh && !m.material.customProgramCacheKey && ex.length < 3) { const w = new THREE.Vector3(); m.getWorldPosition(w); ex.push([m.geometry.type, m.parent && m.parent.type, w.x.toFixed(1), w.z.toFixed(1), m.material.type]); } }); o.ex = ex; scene.traverse(m => { if (!m.isMesh && !m.isPoints) return; const k = (m.isInstancedMesh ? 'I:' : 'M:') + (m.material.customProgramCacheKey ? m.material.customProgramCacheKey() : m.material.type); const tri = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; o[k] = o[k] || [0, 0, 0]; o[k][0]++; o[k][1] += tri * (m.count || 1); o[k][2] = tri; }); return o; } };
}
