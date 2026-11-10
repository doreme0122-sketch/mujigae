/* 새 초원 섬 시험 화면 (2026-11-10) — 섬 하나를 게임과 같은 롤 시점으로 보고 스킨 기체로 직접 몰아 봄
   · 카메라 · 화면 밝기 처리 · 기체 · 조종은 새 맵(map2)과 같은 것 · 섬만 새것 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11101325';
import { makeForgeShip, forgeList } from './forgeship.js?v=11101325';
import { makePerf } from './perf.js?v=11101325';
import { makeFlight, FLY, padZone } from './flight.js?v=11101325';
import { buildIsle } from './isle.js?v=11101325';
import { Y } from './islefield.js?v=11101325';

const $ = s => document.querySelector(s);
export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0x9fc3e0, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(20, 1, .5, 2000), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  onProgress(.1); await new Promise(r => setTimeout(r, 30));
  const t0 = performance.now(), isle = await buildIsle(); scene.add(isle.group); console.log('[초원 섬]', JSON.stringify(isle.stats), Math.round(performance.now() - t0) + 'ms');
  onProgress(.55);

  /* 기체: 스킨 고르기 (새 맵과 같은 기억 자리) */
  const SKINS = forgeList(renderer, camera); let skinId = 'blazedrake'; try { skinId = localStorage.getItem('mj-skin') || skinId; } catch (e) {}
  const FG = await makeForgeShip(renderer, camera, Math.max(0, SKINS.findIndex(s => s.id === skinId)));
  { const sel = $('#skin'); if (sel) { for (const k of SKINS) { const o = document.createElement('option'); o.value = k.id; o.textContent = k.name; o.selected = k.id === FG.C.id; sel.append(o); }
      sel.onchange = () => { try { localStorage.setItem('mj-skin', sel.value); } catch (e) {} location.reload(); }; } }
  const F = isle.field, B = { blocked: (x, z) => Math.hypot(x, z) > 78 || F.blocked(x, z), region: () => 0 };
  const START = [2, 30];
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

  /* 카메라 (새 맵과 같은 롤 방식: 좁은 시야 · 멀리서) + 둘러보기 */
  const cfg = { ang: 45, dist: 25 }; const bind = (id, key, fmt) => { const el = $('#' + id), out = $('#' + id + 'v'); if (!el) return; const rd = () => { cfg[key] = +el.value; out.textContent = fmt(+el.value); }; el.addEventListener('input', rd); rd(); };
  bind('ang', 'ang', v => v + '°'); bind('dist', 'dist', v => v + 'm');
  const CAMK = Math.tan(20 * Math.PI / 180) / Math.tan(10 * Math.PI / 180); let camD = cfg.dist * CAMK; const cam = { x: START[0], z: START[1] };
  const look = { x: 0, z: 0, id: null, px: 0, py: 0 };
  addEventListener('pointerdown', e => { if (look.id !== null || e.target.closest('#ui') || padZone(e.clientX, e.clientY)) return; look.id = e.pointerId; look.px = e.clientX; look.py = e.clientY; });
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

  /* 로딩 때 한 번 그려 칠 계산법 · 모양을 미리 올려 둠 */
  { const cull = []; scene.traverse(o => { if (o.frustumCulled) { cull.push(o); o.frustumCulled = false; } }); renderer.setRenderTarget(bloom.scene); renderer.compile(scene, camera); renderer.render(scene, camera); renderer.clear(); renderer.setRenderTarget(null); cull.forEach(o => o.frustumCulled = true); }

  let t = 0, last = performance.now(), acc = { n: 0, ms: 0, calls: 0, tris: 0, tt: 0 };
  const v3 = new THREE.Vector3();
  renderer.setAnimationLoop(now => { try { const c0 = performance.now(); const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    fly.updateMatrixWorld(true); fly.userData.update(t, dt);
    FG.step(dt, t, { moving: Math.hypot(FS.vx, FS.vz) > 1.5, fire: false });
    if (look.id === null) { const k = Math.min(1, dt * 3.5); look.x -= look.x * k; look.z -= look.z * k; }
    const sp = fly.children[0].position; { const k = Math.min(1, dt * 4); cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; }
    camD += (cfg.dist * CAMK - camD) * Math.min(1, dt * 2);
    const a = cfg.ang * Math.PI / 180, vx = cam.x + look.x, vz = cam.z + look.z, cy = FLY.HOVER; camera.position.set(vx, cy + camD * Math.sin(a), vz + camD * Math.cos(a)); camera.lookAt(vx, cy, vz); camera.updateMatrixWorld();
    isle.sky.position.copy(camera.position); isle.update(t); xrayM.uniforms.uT.value = t;
    { const gh = isle.H(FS.x, FS.z), inIsle = F.mask(FS.x, FS.z) > 0, d = FLY.HOVER - gh; shadow.visible = inIsle; shadow.position.set(FS.x + .4, gh + .06, FS.z + .3); const s = 2.2 + d * .12; shadow.scale.set(s, 1, s); shadow.rotation.y = FS.head; shU.uA.value = .5 * Math.exp(-d * .05);
      say.textContent = !inIsle ? '섬 밖 · 아래는 구름 바다' : gh > Y.FLY - 1.2 ? '고원에 막힘' : `땅까지 ${d.toFixed(1)}m 아래` + (gh < Y.MEADOW - 2.5 ? ' · 낮은 단' : ''); }
    FG.preRender(camera);
    const c1 = performance.now(); renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera); acc.calls = renderer.info.render.calls; acc.tris = renderer.info.render.triangles;
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
    acc.n++; acc.ms += c1 - c0; acc.tt += dt; if (acc.tt > .5) { info.textContent = `그리기 ${acc.calls}번 · 삼각형 ${n(acc.tris)}개 · 계산 ${(acc.ms / acc.n).toFixed(1)}ms\n섬: 나무 ${isle.stats.trees} · 덤불 ${isle.stats.bushes} · 땅 삼각형 ${n(isle.stats.ground.full)} → ${n(isle.stats.ground.kept)}`; info.style.whiteSpace = 'pre'; acc.n = acc.ms = acc.tt = 0; }
  } catch (e) { console.error('[초원 섬]', e); } });
  onProgress(1);
  window.__isle = { THREE, scene, renderer, camera, FS, fly, isle, cfg, look, get t() { return t; } };
}
