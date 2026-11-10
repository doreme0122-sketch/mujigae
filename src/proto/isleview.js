/* 새 초원 섬 시험 화면 (2026-11-10) — 섬 하나를 게임과 같은 롤 시점으로 보고 스킨 기체로 직접 몰아 봄
   · 카메라 · 화면 밝기 처리 · 기체 · 조종은 새 맵(map2)과 같은 것 · 섬만 새것 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101601';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101601';
import { makePerf } from './perf.js?v=11101601';
import { makeFlight, FLY, padZone } from './flight.js?v=11101601';
import { buildIsle } from './isle.js?v=11101601';

const $ = s => document.querySelector(s);
export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  onProgress(.1); await new Promise(r => setTimeout(r, 30));
  const K = .5;   /* 섬 크기: 0.5배 (사용자 2026-11-10 · 기체에 비해 땅이 너무 컸음) */
  const t0 = performance.now(), isle = await buildIsle({ K }); scene.add(isle.group, isle.sky); console.log('[초원 섬]', JSON.stringify(isle.stats), Math.round(performance.now() - t0) + 'ms');
  onProgress(.55);

  /* 기체: 스킨 고르기 (새 맵과 같은 기억 자리) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  { const sel = $('#skin'); if (sel) { for (const k of SKINS) { const o = document.createElement('option'); o.value = k.id; o.textContent = k.name; o.selected = k.id === FG.C.id; sel.append(o); }
      sel.onchange = () => { try { localStorage.setItem('mj-skin', sel.value); } catch (e) {} location.reload(); }; } }
  /* 세 높이 (사용자 2026-11-10): 1층 땅 가까이(부쉬 · 낮은 벽) · 2층 지형물 사이 · 3층 탁 트임 — 층마다 막히는 것이 다름 */
  const LY = isle.layers, LN = ['1층 · 부쉬와 풀밭', '2층 · 돌탑과 아치 사이', '3층 · 탁 트인 하늘'], LC = [[.45, 1., .38], [.42, .82, 1.], [1., .8, .32]];
  const LV = { cur: 1, to: 1, f: 1, dir: 0, y: LY[1], flash: 0, puff: 9, puffX: 0, puffZ: 0, ring: 9 };
  const B = { blocked: (x, z) => Math.hypot(x, z) > 78 * K || isle.blocked(x, z, LV.cur) || (LV.to !== LV.cur && isle.blocked(x, z, LV.to)), region: () => 0 };
  const START = [8 * K, 8 * K];   /* 트인 풀밭 (세 높이 모두 비어 있는 자리) */
  const fly = await makeFlight(renderer, B, START, 0, FG); scene.add(fly); const FS = fly.userData.S; fly.userData.respawn(START[0], START[1], 0);
  onProgress(.85);
  /* 가려진 기체: 고원·돌탑 뒤에 숨으면 가려진 부분만 은은한 빛 윤곽 (새 맵과 같은 것) */
  const xrayM = new THREE.ShaderMaterial({ transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthWrite: false, depthFunc: THREE.GreaterDepth, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uT; varying vec3 vN; varying vec3 vV; void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))), rim = f * f; vec3 c = mix(vec3(1., .5, .42), vec3(1., .92, .85), rim) * (.7 + rim * 1.6) * (.9 + .1 * sin(uT * 4.)); gl_FragColor = vec4(c, .55 + rim * .45); }' });
  FG.buildXray(xrayM);
  /* 내 그림자: 저 아래 땅에 작고 흐릿하게 (땅이 멀수록 넓고 옅게) — 떠 있는 높이가 느껴지게 */
  const shU = { uA: { value: .5 } };
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: shU, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv - .5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ vec2 q = vU * vec2(2., 1.4); float r = dot(q, q); gl_FragColor = vec4(0., .02, .05, exp(-r * 6.) * uA); }' }));
  shadow.renderOrder = 1; scene.add(shadow);
  /* 발밑 층 고리: 1층 초록 · 2층 하늘색 · 3층 금색 — 위에서 봐도 누가 어느 높이인지 (도착하면 한 번 퍼짐 · 못 바꾸면 빨갛게 깜빡) */
  const ringU = { uC: { value: new THREE.Vector3(...LC[1]) }, uP: { value: 0 }, uT: { value: 0 } };
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vU; void main(){ vU = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uP, uT; varying vec2 vU; void main(){ float r = length(vU), a = atan(vU.y, vU.x);
      float base = exp(-pow((r - .62) / .035, 2.)) * (.55 + .45 * step(.5, fract(a * 3.8197 + uT * .25)));   /* 마디진 고리가 천천히 돎 */
      float pulse = exp(-pow((r - .62 - uP * .38) / .05, 2.)) * (1. - uP) * step(.001, uP) * 1.6;
      gl_FragColor = vec4(uC * (base * .9 + pulse), 1.); }` }));
  ring.renderOrder = 7; ring.scale.setScalar(4.2); scene.add(ring);
  /* 땅 바람 고리: 오를 때 박차고 · 내릴 때 내려앉는 자리에 먼지 섞인 바람이 둥글게 퍼짐 */
  const puffU = { uP: { value: 1 } };
  const puff = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: puffU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vU; void main(){ vU = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uP; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ float r = length(vU), a = atan(vU.y, vU.x), n = .6 + .4 * h(floor(vec2(a * 9., r * 6.)));
      float k = exp(-pow((r - .25 - uP * .65) / (.08 + uP * .12), 2.)) * (1. - uP) * n; gl_FragColor = vec4(vec3(.93, .95, .9), k * .55); }` }));
  puff.renderOrder = 2; puff.visible = false; scene.add(puff);
  /* 바람 줄기: 오르내리는 동안 기체 둘레를 반대 방향으로 스치는 가는 빛줄 */
  const SN = 9, stG = new THREE.InstancedBufferGeometry(); stG.setAttribute('position', new THREE.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, .5, 1, 0, -.5, 1, 0], 3)); stG.setIndex([0, 1, 2, 0, 2, 3]);
  stG.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(Array.from({ length: SN * 3 }, (_, i) => [((i / 3) | 0) / SN * 6.283 + Math.random() * .5, .8 + Math.random() * .9, Math.random()][i % 3])), 3)); stG.instanceCount = SN;
  const stU = { uA: { value: 0 }, uD: { value: 1 }, uF: { value: 0 }, uC: { value: new THREE.Vector3() } };
  const streak = new THREE.Mesh(stG, new THREE.ShaderMaterial({ uniforms: stU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 iA; uniform float uD, uF; uniform vec3 uC; varying float vY, vK; void main(){ vec3 c = uC + vec3(cos(iA.x) * iA.y * 1.4, 0., sin(iA.x) * iA.y * 1.4);
      float off = -uD * (fract(uF * 1.6 + iA.z) - .5) * 3.2; c.y += off; vec4 mv = viewMatrix * vec4(c, 1.); mv.x += position.x * .05; mv.y += (position.y - .5) * 1.3; vY = position.y; vK = iA.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform float uA; varying float vY, vK; void main(){ float k = sin(vY * 3.1416); gl_FragColor = vec4(vec3(.85, .95, 1.) * k * uA * (.5 + .5 * vK), 1.); }' }));
  streak.frustumCulled = false; streak.renderOrder = 8; scene.add(streak);
  /* 설정창은 오른쪽 위 톱니 단추로 접어 둠 (그 자리를 높이 바꾸는 칸이 씀 · 사용자 2026-11-10) */
  { const view = $('#view'), gear = document.createElement('button'); gear.type = 'button'; gear.textContent = '⚙'; gear.setAttribute('aria-label', '설정');
    gear.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top,0px) + 30px);right:max(12px,env(safe-area-inset-right,0px));width:34px;height:34px;border-radius:50%;border:1px solid rgba(185,255,74,.35);background:rgba(4,8,14,.6);color:#d9f7b0;font-size:17px;line-height:1';
    $('#ui').append(gear); if (view) { view.hidden = true; view.style.top = 'calc(env(safe-area-inset-top,0px) + 70px)'; view.style.zIndex = 4; const tog = $('#tog'); if (tog) tog.remove(); gear.onclick = () => { view.hidden = !view.hidden; }; } }
  /* 높이 바꾸기: 오른쪽 위 세로 칸(스킬 단추들 위)에서 위로 끌면 올라가고 아래로 끌면 내려감 · 컴퓨터는 E(위) · Q(아래) */
  const zone = document.createElement('div'); zone.style.cssText = 'position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 76px);width:min(120px,20vw);height:42%;border:1.5px dashed rgba(200,230,255,.28);border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding-block:10px;pointer-events:none;color:rgba(230,242,255,.78);font-size:11px;letter-spacing:.04em;text-shadow:0 0 4px rgba(0,0,0,.6)';
  zone.innerHTML = '<span>↑ 위로</span><span id="pips" style="display:flex;flex-direction:column-reverse;gap:6px"><i></i><i></i><i></i></span><span>아래로 ↓</span>'; $('#ui').append(zone);
  const inZone = (x, y) => { const r = zone.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom && ($('#view')?.hidden ?? true); };
  const pips = [...zone.querySelectorAll('#pips i')]; pips.forEach(p => p.style.cssText = 'display:block;width:28px;height:7px;border-radius:4px;background:rgba(255,255,255,.18)');
  const drawPips = () => pips.forEach((p, k) => { const c = LC[k]; p.style.background = k === LV.to ? `rgb(${c.map(v => v * 255 | 0)})` : 'rgba(255,255,255,.18)'; p.style.boxShadow = k === LV.to ? `0 0 8px rgb(${c.map(v => v * 255 | 0)})` : 'none'; }); drawPips();
  /* 층 바꾸기는 너그럽게 (사용자: 걸려서 멈추는 일이 없어야): 그 자리 위·아래에 돌탑·다리가 있으면 거절하지 않고 가까운 빈 곳(2m 안)으로 비켜 주며 바꿈 · 빈 곳이 없을 때만 빨갛게 깜빡 */
  const bodyFree = (x, z, L) => { if (isle.blocked(x, z, L)) return false; for (let k = 0; k < 8; k++) if (isle.blocked(x + Math.cos(k * .785) * FLY.R * .55, z + Math.sin(k * .785) * FLY.R * .55, L)) return false; return true; };
  const tryLayer = d => { if (LV.cur !== LV.to) return; const to = LV.cur + d; if (to < 0 || to > 2) { LV.flash = 1; return; }
    let spot = bodyFree(FS.x, FS.z, to) ? [FS.x, FS.z] : null;
    for (let r = .3; !spot && r <= 2; r += .3) for (let k = 0; k < 16; k++) { const x = FS.x + Math.cos(k * .3927) * r, z = FS.z + Math.sin(k * .3927) * r; if (bodyFree(x, z, to) && bodyFree(x, z, LV.cur)) { spot = [x, z]; break; } }
    if (!spot) { LV.flash = 1; return; }
    LV.to = to; LV.f = 0; LV.dir = d; LV.y0 = LV.y; LV.sx = FS.x; LV.sz = FS.z; LV.nx = spot[0]; LV.nz = spot[1]; drawPips(); if (d > 0) { LV.puff = 0; LV.puffX = FS.x; LV.puffZ = FS.z; } };
  const zd = { id: null, y: 0, done: false };
  addEventListener('pointerdown', e => { if (zd.id !== null || !inZone(e.clientX, e.clientY)) return; zd.id = e.pointerId; zd.y = e.clientY; zd.done = false; }, true);
  addEventListener('pointermove', e => { if (e.pointerId !== zd.id || zd.done) return; const dy = e.clientY - zd.y; if (Math.abs(dy) > 34) { zd.done = true; tryLayer(dy < 0 ? 1 : -1); } });
  const zUp = e => { if (e.pointerId === zd.id) zd.id = null; }; addEventListener('pointerup', zUp); addEventListener('pointercancel', zUp);
  addEventListener('keydown', e => { if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'e') tryLayer(1); if (k === 'q') tryLayer(-1); });

  /* ── 시야 (사용자 2026-11-10): 내 층 높이에 걸리는 것이 시야를 가림 · 보이는 쪽은 다른 층 기체도 보임 · 3층은 다 보임 · 부쉬 안은 어디서든 안 보임 ──
     · 1층: 고원 · 돌탑 · 아치 기둥에 더해 부쉬 덩이가 가림 — 부쉬 안에선 밖이 다 보이고, 밖에선 부쉬 뒤가 안 보임
     · 2층: 고원 · 돌탑 · 아치 기둥만 가림 · 3층: 가리는 것 없음
     · 가림 지도는 로딩 때 층마다 한 번 굽고, 화면에서는 내 자리에서 사방으로 빛줄기 256개를 쏴 닿는 거리만 잼
     · 어둠은 2D 좌표로 (사용자 2026-11-10): 섬의 모든 것이 높이와 상관없이 자기 x, z로 밝고 어두움이 정해짐 (기울어진 덮개 한 장이 아니라) */
  const VR = [9, 12, 22], VC = .25, VX0 = -30, VZ0 = -28, VN = Math.ceil(60 / VC) + 1, VM = Math.ceil(56 / VC) + 1;
  const inBush = isle.inBrush;   /* 부쉬 덩이 모양 그대로 (보이는 가장자리 = 숨는 경계) */
  /* 가림 지도 (0.25m 칸): 0 = 트임 · 1 = 고원·돌탑·아치 다리 · 2+k = k번째 부쉬 (1층만) */
  const occ = [0, 1, 2].map(L => { const A = new Uint8Array(VN * VM); if (L === 2) return A;
    for (let j = 0; j < VM; j++) for (let i = 0; i < VN; i++) { const x = VX0 + i * VC, z = VZ0 + j * VC; let b = isle.sightBlock(x, z, L) ? 1 : 0;
      if (!b && L === 0) { const k = isle.brushZone(x, z); if (k >= 0) b = 2 + k; }
      A[j * VN + i] = b; } return A; });
  const occAt = (A, x, z) => { const i = Math.round((x - VX0) / VC), j = Math.round((z - VZ0) / VC); return i < 0 || j < 0 || i >= VN || j >= VM ? 0 : A[j * VN + i]; };
  const NR = 256, VG = 144, VS = 56, VO = [-28, -28], visA = new Float32Array(VG * VG), visB = new Float32Array(VG * VG), visT = new Float32Array(VG * VG), visTex = new THREE.DataTexture(new Uint8Array(VG * VG * 4), VG, VG, THREE.RGBAFormat);
  visTex.magFilter = visTex.minFilter = THREE.LinearFilter; visTex.needsUpdate = true;
  /* 빛줄기: 고원·돌탑·아치 다리, 그리고 내가 들어 있지 않은 부쉬에 닿으면 멈춤 — 내가 숨은 부쉬는 내 시야를 안 가림 (사용자 2026-11-10) */
  const ray = (L, x0, z0, dx, dz, R, me) => { const A = occ[L]; for (let d = .15; d < R; d += .15) { const o = occAt(A, x0 + dx * d, z0 + dz * d); if (o === 1 || (o >= 2 && o - 2 !== me)) return d; } return R; };
  const myZone = L => L === 0 ? isle.brushZone(FS.x, FS.z) : -1;
  let Rs = VR[1]; const D = new Float32Array(NR);
  const castSight = () => { const L = LV.f < .5 ? LV.cur : LV.to, me = myZone(L); Rs += (VR[L] - Rs) * .25; const R = Rs;
    for (let k = 0; k < NR; k++) { const an = k / NR * 6.2831853; D[k] = ray(L, FS.x, FS.z, Math.cos(an), Math.sin(an), R, me); }
    const cs = VS / VG; for (let j = 0; j < VG; j++) for (let i = 0; i < VG; i++) { const dx = VO[0] + (i + .5) * cs - FS.x, dz = VO[1] + (j + .5) * cs - FS.z, dist = Math.hypot(dx, dz);
      let v = 0; if (dist < R) { let a = Math.atan2(dz, dx) / 6.2831853 * NR; if (a < 0) a += NR; const k0 = a | 0, f = a - k0, reach = D[k0 % NR] * (1 - f) + D[(k0 + 1) % NR] * f; v = Math.min(1, Math.max(0, (reach - dist) / .5 + .5)) * Math.min(1, (R - dist) / 1.6); }
      visA[j * VG + i] = v; }
    for (let pass = 0; pass < 2; pass++) { for (let j = 0; j < VG; j++) for (let i = 0; i < VG; i++) { let t = 0, n = 0; for (let o = -2; o <= 2; o++) { const ii = i + o; if (ii >= 0 && ii < VG) { t += visA[j * VG + ii]; n++; } } visB[j * VG + i] = t / n; }
      for (let j = 0; j < VG; j++) for (let i = 0; i < VG; i++) { let t = 0, n = 0; for (let o = -2; o <= 2; o++) { const jj = j + o; if (jj >= 0 && jj < VG) { t += visB[jj * VG + i]; n++; } } visA[j * VG + i] = t / n; } }   /* 번지게 */
    const px = visTex.image.data; for (let k = 0; k < VG * VG; k++) { visT[k] += (visA[k] - visT[k]) * .45; px[k * 4] = visT[k] * 255 | 0; }   /* 앞 장면과 섞어 들썩임 없앰 */ visTex.needsUpdate = true; isle.setSight(visTex, VO[0], VO[1], VS, 1); };
  /* 연습 표적 4대: 1층 부쉬 안 · 1층 트인 풀밭 · 2층 돌탑 둘레 · 3층 하늘 — 보이는지 시험용 (안 보이면 스르륵 사라짐) */
  const dummies = [[0, 6.5, 0, 0], [0, -2, 6, 3], [1, 11, -1.5, 4.5], [2, 0, 0, 11]].map(([L, cx, cz, r], k) => {
    const g = new THREE.Group(), c = LC[L], m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...c).multiplyScalar(1.3), transparent: true });
    const body = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.6, 6).rotateX(-Math.PI / 2), m), ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.05, 32).rotateX(-Math.PI / 2), m); ring.position.y = -.3; g.add(body, ring); scene.add(g);
    return { g, m, L, cx, cz, r, k, a: 1 }; });
  const seeDummy = D => { const L = LV.f < .5 ? LV.cur : LV.to, x = D.g.position.x, z = D.g.position.z, dx = x - FS.x, dz = z - FS.z, dist = Math.hypot(dx, dz);
    const me = myZone(L); if (D.L === 0 && me >= 0 && isle.brushZone(x, z) === me) return true;   /* 같은 부쉬 안이면 보임 */
    if (D.L === 0 && inBush(x, z) && dist > 2.2) return false;                  /* 부쉬 안: 바로 옆이 아니면 어느 층에서도 안 보임 */
    if (dist > VR[L]) return false; if (L === 2) return true; return ray(L, FS.x, FS.z, dx / dist, dz / dist, dist, me) >= dist - .3; };
  /* 카메라 (새 맵과 같은 롤 방식: 좁은 시야 · 멀리서) + 둘러보기 */
  const cfg = { ang: 45, dist: 25 }; const bind = (id, key, fmt) => { const el = $('#' + id), out = $('#' + id + 'v'); if (!el) return; const rd = () => { cfg[key] = +el.value; out.textContent = fmt(+el.value); }; el.addEventListener('input', rd); rd(); };
  bind('ang', 'ang', v => v + '°'); bind('dist', 'dist', v => v + 'm');
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180); let camD = cfg.dist * CAMK; const cam = { x: START[0], z: START[1] };
  const look = { x: 0, z: 0, id: null, px: 0, py: 0 };
  addEventListener('pointerdown', e => { if (look.id !== null || e.target.closest('#ui') || padZone(e.clientX, e.clientY) || inZone(e.clientX, e.clientY)) return; look.id = e.pointerId; look.px = e.clientX; look.py = e.clientY; });
  addEventListener('pointermove', e => { if (e.pointerId !== look.id) return; const r = canvas.getBoundingClientRect(), mpp = 2 * camD * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, r.height), a = cfg.ang * Math.PI / 180;
    look.x -= (e.clientX - look.px) * mpp; look.z -= (e.clientY - look.py) * mpp / Math.max(.35, Math.sin(a)); const l = Math.hypot(look.x, look.z); if (l > 90) { look.x *= 90 / l; look.z *= 90 / l; } look.px = e.clientX; look.py = e.clientY; });
  const up = e => { if (e.pointerId === look.id) look.id = null; }; addEventListener('pointerup', up); addEventListener('pointercancel', up);

  let Wd = 2, Hd = 2; const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix();
    const px = Hd / (2 * Math.tan(camera.fov * Math.PI / 360)); isle.setPx(px); fly.userData.setPx?.(px); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);
  /* 무게 표시 */
  const info = document.createElement('div'); info.style.cssText = 'position:absolute;top:calc(env(safe-area-inset-top,0px) + 50px);left:max(18px,env(safe-area-inset-left,0px));font-size:11px;color:rgba(185,255,74,.85);pointer-events:none;font-family:monospace;line-height:1.5'; $('#ui').append(info);
  const say = $('#where'), n = o => o.toLocaleString();

  castSight();
  /* 로딩 때 한 번 그려 칠 계산법 · 모양을 미리 올려 둠 */
  { const cull = []; scene.traverse(o => { if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } }); renderer.setRenderTarget(bloom.scene); renderer.compile(scene, camera); renderer.render(scene, camera); renderer.clear(); renderer.setRenderTarget(null); cull.forEach(o => o.frustumCulled = true); }

  let t = 0, last = performance.now(), acc = { n: 0, ms: 0, calls: 0, tris: 0, tt: 0 };
  const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try { const c0 = performance.now(); const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    /* 높이 바꾸는 중 (0.55초): 오를 땐 기수를 들고 조금 커지며 · 내릴 땐 숙이고 작아짐 · 카메라는 높을수록 물러나 넓게 */
    if (LV.f < 1) { LV.f = Math.min(1, LV.f + dt / .55); const e = LV.f * LV.f * (3 - 2 * LV.f); LV.y = LV.y0 + (LY[LV.to] - LV.y0) * e;
      if (LV.dir < 0 && LV.f > .72 && LV.puff > 1) { LV.puff = 0; LV.puffX = FS.x; LV.puffZ = FS.z; }   /* 내려앉는 순간 아래가 눌림 */
      if (LV.f < .45 && (LV.nx !== LV.sx || LV.nz !== LV.sz)) { const k = Math.min(1, dt / Math.max(.02, (.45 - LV.f) * .55)); FS.x += (LV.nx - FS.x) * k; FS.z += (LV.nz - FS.z) * k; }   /* 비켜 주기 */
      if (LV.f >= 1) { LV.cur = LV.to; LV.ring = 0; } }
    fly.position.y = LV.y - FLY.HOVER;
    fly.updateMatrixWorld(true); fly.userData.update(t, dt);
    { const S = fly.children[0], e = LV.f < 1 ? Math.sin(LV.f * Math.PI) : 0; S.rotateX(LV.dir * .52 * e);   /* 오르내릴 때 기수를 크게 들고 숙임 (사용자 2026-11-10: 높이감이 더 보이게 · 약 30°) */
      const sc = [.92, 1, 1.1], a0 = sc[LV.cur], a1 = sc[LV.to], k = LV.f * LV.f * (3 - 2 * LV.f); S.scale.setScalar(a0 + (a1 - a0) * k); S.updateMatrixWorld(true);
      stU.uA.value = e * .9; stU.uD.value = LV.dir; stU.uF.value = LV.f; stU.uC.value.set(FS.x, LV.y - .6, FS.z); }
    FG.step(dt, t, { moving: Math.hypot(FS.vx, FS.vz) > 1.5, fire: false });
    if (look.id === null) { const k = Math.min(1, dt * 3.5); look.x -= look.x * k; look.z -= look.z * k; }
    const sp = fly.children[0].position; { const k = Math.min(1, dt * 4); cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; }
    { const cf = [.85, 1, 1.3], k = LV.f * LV.f * (3 - 2 * LV.f), f = cf[LV.cur] + (cf[LV.to] - cf[LV.cur]) * k; camD += (cfg.dist * CAMK * f - camD) * Math.min(1, dt * 3); }
    const a = cfg.ang * Math.PI / 180, vx = cam.x + look.x, vz = cam.z + look.z, cy = LV.y; camera.position.set(vx, cy + camD * Math.sin(a), vz + camD * Math.cos(a)); camera.lookAt(vx, cy, vz); camera.updateMatrixWorld();
    isle.sky.position.copy(camera.position); isle.update(t); xrayM.uniforms.uT.value = t;
    /* 땅을 미는 바람 · 땅 바람 고리 · 발밑 층 고리 */
    if (LV.puff < 1) { LV.puff = Math.min(1, LV.puff + dt / .7); const p = LV.puff, gh = isle.H(LV.puffX, LV.puffZ); puff.visible = isle.mask(LV.puffX, LV.puffZ) > 0; puff.position.set(LV.puffX, gh + .08, LV.puffZ); puff.scale.setScalar(5.5); puffU.uP.value = p;
      isle.push(LV.puffX, LV.puffZ, 3.2, .9 * Math.sin(Math.min(1, p * 2.2) * Math.PI * .5) * (1 - p)); } else { puff.visible = false; isle.push(0, 0, 1, 0); }
    { const c = LV.flash > 0 ? [1.2, .25, .2] : LC[LV.f < .5 ? LV.cur : LV.to]; ringU.uC.value.set(...c).multiplyScalar(LV.flash > 0 ? (Math.sin(LV.flash * 25) > 0 ? 1 : .2) : 1); LV.flash = Math.max(0, LV.flash - dt * 1.6);
      LV.ring = Math.min(9, LV.ring + dt / .6); ringU.uP.value = LV.ring < 1 ? LV.ring : 0; ringU.uT.value = t; ring.position.set(FS.x, LV.y - .35, FS.z); }
    { const gh = isle.H(FS.x, FS.z), inIsle = isle.mask(FS.x, FS.z) > 0, d = LV.y - gh; shadow.visible = inIsle; shadow.position.set(FS.x + .4, gh + .06, FS.z + .3); const s = 2.2 + d * .12; shadow.scale.set(s, 1, s); shadow.rotation.y = FS.head; shU.uA.value = .5 * Math.exp(-d * .05);
      say.textContent = LN[LV.f < .5 ? LV.cur : LV.to] + (inIsle ? ` · 땅까지 ${d.toFixed(1)}m` : ' · 섬 밖'); }
    castSight();   /* 매 장면 (깜빡임 없게) */
    for (const D of dummies) { const a = t * .25 + D.k * 1.7; D.g.position.set(D.cx + Math.cos(a) * D.r, LY[D.L] + Math.sin(t * 1.3 + D.k) * .08, D.cz + Math.sin(a) * D.r); D.g.rotation.y = -a; D.a += ((seeDummy(D) ? 1 : 0) - D.a) * Math.min(1, dt * 6); D.m.opacity = D.a; D.g.visible = D.a > .02; }
    { const hid = LV.cur === 0 && LV.f >= 1 && inBush(FS.x, FS.z); fly.userData.setGhost(hid, .55);   /* 숨은 내 기체: 너무 흐리지 않게 (어디 있는지는 보이게) */ if (hid) say.textContent = '1층 · 부쉬에 숨는 중'; }   /* 내가 부쉬에 숨으면 내 화면에서만 반투명 */
    FG.preRender(camera);
    const c1 = performance.now(); renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); acc.calls = renderer.info.render.calls; acc.tris = renderer.info.render.triangles;
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
    acc.n++; acc.ms += c1 - c0; acc.tt += dt; if (acc.tt > .5) { info.textContent = `그리기 ${acc.calls}번 · 삼각형 ${n(acc.tris)}개 · 계산 ${(acc.ms / acc.n).toFixed(1)}ms\n섬: 낮은 식물 ${isle.stats.plants} · 땅 삼각형 ${n(isle.stats.ground.full)} → ${n(isle.stats.ground.kept)}`; info.style.whiteSpace = 'pre'; acc.n = acc.ms = acc.tt = 0; }
  } catch (e) { console.error('[초원 섬]', e); } });
  onProgress(1);
  window.__isle = { THREE, scene, renderer, camera, FS, fly, isle, cfg, look, LV, tryLayer, FG, get t() { return t; } };
}
