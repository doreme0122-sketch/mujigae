/* 빛의 길 시험 (사용자 2026-11-06)
   · 가운데층 = 하늘섬 난전 맵(v7, 3분의 1) · 윗층 던전 섬 +20m · 아래층 던전 섬 -30m (가운데층 기준)
   · 입·출구 = 흩어진 고리 문(4번) · 섬 땅 위 · 빛의 길 쪽을 바라봄 · 고리 돌 조각은 기체를 막음
   · 보물이 있는 층으로 가는 문만 켜짐 (금빛 = 윗층 · 보랏빛 = 아래층) · 던전의 출구 문은 늘 켜져 돌아갈 수 있음
   · 출발: 문 한가운데서 0.5초 멈춰야 시작(그냥 지나갈 수도 있으니까) → 3초 동안 기체가 갈 쪽으로 천천히 기울며 틂,
     고리 조각·빛 상자가 점점 빠르게 돌고 빛 상자가 점점 밝아짐 · 움직이면 취소 → 3초 끝: 확 빠르게 튀어 나감 + 뒤로 옅은 충격파
   · 빛의 길 = 빛 띠(꺾쇠 없음) · 문에서 수평으로 나가 휘어 오르내린 뒤 출구 앞에서 다시 수평으로 이어짐 → 기체가 온 방향 그대로 미끄러지듯 멈춤
   · 카메라: 출발 때는 제자리(멀어지는 원근감) → 길의 절반쯤부터 빠르게 따라붙어 기체와 함께 도착 (도착지 적에게 선공을 양보하지 않게)
   · 가는 동안 공격받지 않음 · 가운데층에 있을 땐 윗층 섬을 점무늬로 옅게 비킴 · 식물(나무·풀)은 막지 않음 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11091450';
import { makePerf } from './perf.js?v=11091450';
import { makeGlow } from '../preview/glow.js';
import { makeGlbIsle } from './glbisle.js?v=11091450';
import { makeFlight, FLY } from './flight.js?v=11091450';
import { gate4, pedestal } from './gates.js?v=11091450';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, HOVER = FLY.HOVER, GAP = 2.9;
const UP = new THREE.Color(1.45, 1.05, .42), DN = new THREE.Color(.72, .48, 1.55);
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };


/* ── 소리 (파일 없이 화면 안에서 만듦 · 문이 켜져 있을 땐 소리 없음 — 게임에 방해 (사용자 2026-11-06)) ──
   준비 3초: 낮은 울림이 점점 높아짐(종소리 없음) · 움직이면 사그라듦
   출발: 짧은 쿵(충격파) + 슉 튀어 나가는 바람 · 이동: 스치는 바람이 잦아듦 · 도착 소리 없음 (사용자 2026-11-06) */
function makeSound() {
  let ac = null, master = null, noiseBuf = null;
  const init = () => { if (ac) { if (ac.state === 'suspended') ac.resume(); return; } try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = .55; const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; };
  addEventListener('pointerdown', init); addEventListener('keydown', init);
  const noise = () => { const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; return n; };
  let ch = null;
  return {
    chargeStart() { if (!ac) return; this.chargeStop(true); const t = ac.currentTime, out = ac.createGain(); out.gain.value = 0; out.connect(master);
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g1 = ac.createGain(); o1.type = 'sine'; o2.type = 'triangle'; const cv1 = new Float32Array(64), cv2 = new Float32Array(64); for (let i = 0; i < 64; i++) { const u = i / 63, f = 110 * Math.pow(12, u * u * u); cv1[i] = f; cv2[i] = f * 1.5; }   /* 처음은 낮게 그대로 · 3초로 갈수록 가파르게 높아짐 (110 → 약 1320Hz · 사용자 2026-11-06) */
      o1.frequency.setValueCurveAtTime(cv1, t, 3); o2.frequency.setValueCurveAtTime(cv2, t, 3); g1.gain.value = .5;
      o1.connect(g1); o2.connect(g1); g1.connect(out); out.gain.linearRampToValueAtTime(.16, t + .4); out.gain.linearRampToValueAtTime(.3, t + 3); o1.start(t); o2.start(t);
      const bells = [];   /* 맑은 종소리는 뺌 (사용자 2026-11-06) */
      ch = { out, osc: [o1, o2], bells }; },
    chargeStop(quick) { if (!ac || !ch) return; const t = ac.currentTime, c = ch; ch = null; c.out.gain.cancelScheduledValues(t); c.out.gain.setValueAtTime(c.out.gain.value, t); c.out.gain.linearRampToValueAtTime(0, t + (quick ? .05 : .35));
      for (const o of [...c.osc, ...c.bells]) try { o.stop(t + .4); } catch (e) {} },
    depart(dur) { if (!ac) return; this.chargeStop(true); const t = ac.currentTime;
      { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + .35); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + .45); o.connect(g); g.connect(master); o.start(t); o.stop(t + .5); }   /* 쿵 */
      { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + .7); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.4, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .75); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + .8); }   /* 슉 */
      { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.Q.value = .6; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(320, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .15); g.gain.exponentialRampToValueAtTime(.001, t + dur + .1); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + .2); } },   /* 스치는 바람: 잦아듦 */
    arrive() { if (!ac) return; const t = ac.currentTime;
      { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(260, t + .5); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .04); g.gain.exponentialRampToValueAtTime(.001, t + .6); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + .65); }   /* 미끄러지듯 */
      { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(392, t); o.frequency.exponentialRampToValueAtTime(330, t + .5); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .05); g.gain.exponentialRampToValueAtTime(.0005, t + .9); o.connect(g); g.connect(master); o.start(t); o.stop(t + 1); } } };   /* 내려앉는 부드러운 울림 */
}

export async function start(canvas, onProgress = () => {}) {
  const SND = makeSound();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0xbcd2ea, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 1200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const sunDir = new THREE.Vector3(-.45, .78, -.42).normalize(), sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.copy(sunDir).multiplyScalar(20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x3a3020, .7));
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.05);
  /* ── 세 층 ── */
  const isle = (url, scale) => new Promise(res => { const g = makeGlbIsle(HOVER, res, { url, scale, gap: GAP }); scene.add(g.mesh); });
  const [GI, GU, GD] = await Promise.all([isle('./assets/skyislands_v7.glb', 1 / 3), isle('./assets/dng_up.glb', 1), isle('./assets/dng_dn.glb', .7)]);
  onProgress(.55);
  GU.sea.visible = GD.sea.visible = false;
  for (const G of [GU, GD]) G.mesh.traverse(o => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (/terrain/i.test(m.name)) m.color.setRGB(.86, .9, .84); if (/foliage/i.test(m.name)) m.color.setRGB(.78, .92, .8); } });   /* 던전 = 더 오래된 초원 */
  const cfg = { up: 20, dn: 30, far: 55, treasure: 'up', ang: 45, dist: 25 };
  const L = { mid: { G: GI, o: new THREE.Vector3(), gates: [] }, up: { G: GU, o: new THREE.Vector3(), gates: [] }, dn: { G: GD, o: new THREE.Vector3(), gates: [] } };
  const flightY = k => (k === 'mid' ? 0 : L[k].o.y) + HOVER;   /* 그 층에서 기체가 나는 높이 */
  /* ── 문: 흩어진 고리 ── */
  const G4 = []; let PSEED = 3; const mkGate = (key, layer) => { const G = gate4(GAP / .8); G.g.scale.setScalar(.8); const root = new THREE.Group(); const ped = pedestal(PSEED += 7); ped.scale.setScalar(.6); root.add(ped); root.add(G.g);   /* 문 0.8배 · 받침 섬 0.6배 (맵이 3분의 1 크기라) */ scene.add(root);   /* 문마다 자기 받침 섬 위 (참고 그림처럼) — 큰 섬 가장자리에 붙여 둠 */
    const o = { key, layer, G, root, x: 0, z: 0, gy: 0, ax: 0, az: -1, ch: 0, stay: 0, act: 0 }; G4.push(o); L[layer].gates.push(o); return o; };
  const gEnt = { up: mkGate('up', 'mid'), dn: mkGate('dn', 'mid') }, gExit = { up: mkGate('up', 'up'), dn: mkGate('dn', 'dn') };
  /* 문 자리 찾기: 문 받침(반지름 4.6m)이 다 땅 위 · 둘레가 트인 곳 · 원하는 쪽에 가까이 */
  const spotOn = (G, want, avoid = []) => { let best = null, bd = 1e9;
    for (let x = -24; x <= 24; x += .5) for (let z = -24; z <= 24; z += .5) { if (G.blocked(x, z) || avoid.some(a => Math.hypot(a[0] - x, a[1] - z) < 11)) continue; const gy = G.groundFast(x, z); if (gy == null) continue; let ok = true;
      for (let k = 0; k < 12 && ok; k++) { const a = k / 12 * Math.PI * 2; for (const r of [1.6, 2.8, 4]) { const xx = x + Math.cos(a) * r, zz = z + Math.sin(a) * r, g2 = G.groundFast(xx, zz); if (g2 == null || Math.abs(g2 - gy) > 1.3 || (r < 3.5 && G.blocked(xx, zz))) { ok = false; break; } } }
      if (!ok) continue; const d = Math.hypot(x - want[0], z - want[1]); if (d < bd) { bd = d; best = [x, z, gy]; } }
    return best; };
  const onPed = (layer, x, z, r) => L[layer].gates.find(g => Math.hypot(x - g.x, z - g.z) < r);
  /* 고리 돌 조각은 기체를 막음: 고리 판(두께 1.2m) 안에서 가운데로부터 2.35~3.75m */
  const gateBlocked = (layer, x, z) => { for (const g of L[layer].gates) { const dx = x - g.x, dz = z - g.z, along = dx * g.ax + dz * g.az, lat = Math.abs(dx * -g.az + dz * g.ax); if (Math.abs(along) < .5 && lat > 1.9 && lat < 3.0) return true; } return false; };
  /* ── 빛의 길: 빛 띠 (가운데 밝은 심 + 옅은 빛무리 · 반짝이 알갱이 · 끝쪽이 살짝 옅음) ── */
  const roadM = (kind) => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 }, uL: { value: 60 }, uK: { value: kind }, uDir: { value: 1 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uL, uK, uDir; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ float x=vU.x*2.-1., s=vU.y*uL; float edge=exp(-x*x*(uK>1.5?2.:3.5)), core=exp(-x*x*40.);
        float flow=s-uT*14.*uDir; float spark=step(.985,h(floor(vec2(x*8.,flow*2.))))*.9;
        float ends=smoothstep(0.,.03,vU.y)*smoothstep(1.,.97,vU.y);
        gl_FragColor=vec4(uC*(edge*.22+core*.55+spark*edge*.7)*ends*uA*.75,1.); }` });
  const ribbon = (curve, w) => { const n = Math.ceil(curve.getLength() * 3), pos = [], uv = [], idx = [], up0 = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), Bn = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) { const u = i / n; curve.getPointAt(u, p); curve.getTangentAt(u, T); Bn.crossVectors(T, up0); if (Bn.lengthSq() < 1e-6) Bn.set(1, 0, 0); Bn.normalize();
      pos.push(p.x - Bn.x * w, p.y - .25, p.z - Bn.z * w, p.x + Bn.x * w, p.y - .25, p.z + Bn.z * w); uv.push(0, u, 1, u); if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  const P = {}, pathGrp = new THREE.Group(); scene.add(pathGrp);
  let Ewant = null;
  const place = () => {
    L.up.o.set(-cfg.far * .7, cfg.up, -cfg.far * .45); L.dn.o.set(cfg.far * .75, -cfg.dn, -cfg.far * .8);
    GU.mesh.position.copy(L.up.o); GD.mesh.position.copy(L.dn.o); GU.mesh.updateMatrixWorld(true); GD.mesh.updateMatrixWorld(true);
    /* 문 받침 섬 자리: 큰 섬 가장자리에서 상대 쪽으로 3.5m 더 나가 붙임 (받침 섬과 큰 섬이 이어져 보이고 · 땅 밖에 떠 있지 않게) */
    const edgeOut = (G, dx, dz) => { const l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l; let last = 0; for (let r = 0; r < 40; r += .5) if (G.groundFast(ux * r, uz * r) != null) last = r; return [ux * (last + 2.4), uz * (last + 2.4), -GAP + HOVER]; };
    const eU = edgeOut(GI, L.up.o.x, L.up.o.z), eD = edgeOut(GI, L.dn.o.x, L.dn.o.z), xU = edgeOut(GU, -L.up.o.x, -L.up.o.z), xD = edgeOut(GD, -L.dn.o.x, -L.dn.o.z);
    for (const [k, e, x] of [['up', eU, xU], ['dn', eD, xD]]) { const Lk = L[k], ge = gEnt[k], gx = gExit[k];
      ge.x = e[0]; ge.z = e[1]; ge.gy = e[2]; gx.x = Lk.o.x + x[0]; gx.z = Lk.o.z + x[1]; gx.gy = Lk.o.y + x[2];
      const dx = gx.x - ge.x, dz = gx.z - ge.z, l = Math.hypot(dx, dz) || 1; ge.ax = gx.ax = dx / l; ge.az = gx.az = dz / l;   /* 두 문 다 길이 지나는 쪽을 바라봄 */
      for (const g of [ge, gx]) { g.root.position.set(g.x, flightY(g.layer) - GAP, g.z);   /* 고리 가운데 = 기체 높이 */ g.root.rotation.y = Math.atan2(-g.ax, -g.az); }
      const yA = flightY('mid'), yB = flightY(k), A0 = new THREE.Vector3(ge.x, yA, ge.z), B0 = new THREE.Vector3(gx.x, yB, gx.z), d = new THREE.Vector3(ge.ax, 0, ge.az);
      /* 문에서 수평으로 나감 → 휘며 오르내림 → 출구 앞 7m부터 다시 수평 → 출구 한가운데 */
      const pts = [A0, A0.clone().addScaledVector(d, 6), A0.clone().lerp(B0, .36).setY(yA + (yB - yA) * .5), A0.clone().lerp(B0, .6).setY(yB), B0.clone().addScaledVector(d, -8), B0];   /* 수평으로 나가 → 오르거나 내려가다 → 도착 높이에서 바로 수평 (넘어갔다 되돌아오는 출렁임 없음 · 사용자 2026-11-06) */
      const c0 = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), up = yB > yA, sm = [];   /* 높이는 한 방향으로만 (곡선이 살짝 넘치거나 처지는 것도 눌러 줌) */
      let yc = yA; for (let i = 0; i <= 80; i++) { const p = c0.getPointAt(i / 80); yc = up ? clamp(Math.max(yc, p.y), yA, yB) : clamp(Math.min(yc, p.y), yB, yA); p.y = yc; sm.push(p); }
      const curve = new THREE.CatmullRomCurve3(sm, false, 'centripetal'), len = curve.getLength();
      for (const m of (P[k]?.meshes || [])) { pathGrp.remove(m); m.geometry.dispose(); }
      const meshes = [[.62, 0], [1.3, 2]].map(([w, kind]) => { const m = new THREE.Mesh(ribbon(curve, w), roadM(kind)); m.material.uniforms.uL.value = len; m.renderOrder = 7; m.frustumCulled = false; pathGrp.add(m); return m; });
      P[k] = { curve, len, meshes }; }
    placeChest(); };
  /* 보물 상자 */
  const chest = (() => { const g = new THREE.Group(), sm = new THREE.MeshStandardMaterial({ color: 0xd9cfba, roughness: .9, flatShading: true });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.05, .5, 8).translate(0, .25, 0), sm));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .6).translate(0, .75, 0), new THREE.MeshStandardMaterial({ color: 0x9a6430, roughness: .6, flatShading: true })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 1, 0), new THREE.MeshStandardMaterial({ color: 0xc88a3a, roughness: .5, flatShading: true, emissive: 0x3a2200 })));
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.94, .08, .64).translate(0, .78, 0), new THREE.MeshStandardMaterial({ color: 0xffd25a, metalness: .8, roughness: .3, emissive: 0x664400 })));
    scene.add(g); return g; })();
  const placeChest = () => { const k = cfg.treasure; chest.visible = k !== 'none'; if (!chest.visible) return; const Lk = L[k], G = Lk.G, gx = gExit[k];
    /* 보물 = 던전 섬에서 출구와 먼 쪽 땅 (가는 길에 둘러보게) */
    let best = null, bd = -1; for (let x = -16; x <= 16; x += .5) for (let z = -16; z <= 16; z += .5) { if (G.blocked(x, z)) continue; const gy = G.groundFast(x, z); if (gy == null || Math.abs(gy + GAP - HOVER) > 1.2) continue; let ok = true; for (let a = 0; a < 8 && ok; a++) if (G.groundFast(x + Math.cos(a * .785) * 1.4, z + Math.sin(a * .785) * 1.4) == null) ok = false; if (!ok) continue;
      const d = Math.hypot(x + Lk.o.x - gx.x, z + Lk.o.z - gx.z); if (d > bd && d < 22) { bd = d; best = [x, z, gy]; } }
    if (best) chest.position.set(Lk.o.x + best[0], Lk.o.y + best[2], Lk.o.z + best[1]); };
  place();
  onProgress(.62);
  /* ── 내 기체 ── */
  let mode = 'mid', trip = null;
  const B = { blocked: (x, z) => { if (mode === 'trip') return false; if (gateBlocked(mode, x, z)) return true; if (mode === 'mid') return GI.blocked(x, z); const Lm = L[mode], lx = x - Lm.o.x, lz = z - Lm.o.z; if (onPed(mode, x, z, 3.6)) return false;   /* 출구 받침 섬 위는 땅 */
      if (Lm.G.blocked(lx, lz)) return true; for (let a = 0; a < 8; a++) if (Lm.G.groundFast(lx + Math.cos(a * .785) * .9, lz + Math.sin(a * .785) * .9) == null) return true; return Lm.G.groundFast(lx, lz) == null; }, region: () => 0 };
  const sx = gEnt.up.x + 7, sz = gEnt.up.z + 7;
  const fly = await makeFlight(renderer, B, [sx, sz], 0); scene.add(fly); const FS = fly.userData.S; fly.userData.moveTo(sx, sz, 0);
  const oldSh = []; fly.traverse(o => { if (o.isMesh && o.renderOrder === 1 && o.geometry.type === 'PlaneGeometry') oldSh.push(o); });
  const shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 1.3, FLY.LEN * 1.3), shM); shadow.renderOrder = 1; scene.add(shadow);
  /* 출발 충격파: 기체 뒤로 얇은 빛 고리가 한 번 퍼지며 사라짐 (과하지 않게) */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uK; varying vec2 vP;
      void main(){ float r=length(vP); float w=mix(.10,.035,uK); float ring=exp(-pow((r-.92)/w,2.)); float inner=smoothstep(.92,.2,r)*.18*(1.-uK); gl_FragColor=vec4(uC*(ring+inner)*uA,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shockM); shock.visible = false; shock.renderOrder = 9; scene.add(shock); const SW = { t: 9 };
  onProgress(.9);

  /* ── 화면 ── */
  const cam = { x: sx, y: HOVER, z: sz, bk: 0 };
  const bind = (id, key, fmt, after) => { const el = $('#' + id), out = $('#' + id + 'v'); const rd = () => { cfg[key] = +el.value; out.textContent = fmt(+el.value); after?.(); }; el.addEventListener('input', rd); rd(); };
  bind('ang', 'ang', v => v + '°'); bind('dist', 'dist', v => v + 'm');
  bind('lup', 'up', v => '+' + v + 'm', () => { if (mode === 'mid') place(); });
  bind('ldn', 'dn', v => '-' + v + 'm', () => { if (mode === 'mid') place(); });
  bind('lfar', 'far', v => v + 'm', () => { if (mode === 'mid') place(); });
  document.querySelectorAll('#st button').forEach((b, i) => { b.onclick = () => { cfg.treasure = ['up', 'dn', 'none'][i]; document.querySelectorAll('#st button').forEach(x => x.classList.toggle('on', x === b)); placeChest(); }; });
  const say = $('#where');

  let Wd = 2, Hd = 2;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), tan = new THREE.Vector3(), tmp = new THREE.Color(), onC = new THREE.Color(), motes = [];
  let t = 0, last = performance.now(), fade = 1, charge = null, lock = null;   /* lock: 막 도착한 문 — 한 번 벗어나야 다시 켜짐 */
  const startTrip = (key, back) => { const p = P[key], from = back ? gExit[key] : gEnt[key]; const dir = p.curve.getTangentAt(back ? 1 : 0); if (back) dir.negate();
    trip = { key, back, u: 0, dur: clamp(p.len / 30, 1.1, 1.8), p, cam0: new THREE.Vector3(cam.x, cam.y, cam.z) }; mode = 'trip'; FS.aim = null; SND.depart(trip.dur);
    shock.position.set(FS.x, flightY(back ? key : 'mid'), FS.z).addScaledVector(dir, -.7); shock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); SW.t = 0; SW.c = (key === 'dn' ? DN : UP).clone(); };
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    const key = cfg.treasure, on = key !== 'none';
    /* ── 출발 준비: 켜진 문 한가운데서 0.5초 멈춤 → 3초 ── */
    const here = mode === 'trip' ? [] : L[mode].gates, spd = Math.hypot(FS.vx, FS.vz);
    for (const g of G4) { const live = g.layer === 'mid' ? on && g.key === key : true; g.act += ((live ? 1 : 0) - g.act) * Math.min(1, dt * 3);
      const inG = here.includes(g) && live && g !== lock && Math.hypot(FS.x - g.x, FS.z - g.z) < 1.6;
      if (inG && spd < 1.2 && !(charge && charge.g !== g)) { g.stay += dt; } else { g.stay = 0; }
      if (g.stay > .5 && !charge) { const back = g.layer !== 'mid', c = P[g.key].curve, look = c.getPointAt(back ? .8 : .2), wantYaw = Math.atan2(-(look.x - FS.x), -(look.z - FS.z)); charge = { g, u: 0, yaw0: FS.head, wantYaw, back }; SND.chargeStart(); }
      g.ch = charge?.g === g ? charge.u : Math.max(0, g.ch - dt * .8); }
    if (lock && Math.hypot(FS.x - lock.x, FS.z - lock.z) > 2.5) lock = null;
    if (charge) { const c = charge, g = c.g; if (Math.hypot(FS.x - g.x, FS.z - g.z) > 1.9 || spd > 2.6) { charge = null; FS.aim = null; FS.chBank = 0; SND.chargeStop(); }   /* 움직이면 취소 */
      else { c.u = Math.min(1, c.u + dt / 3); const e = c.u * c.u * (3 - 2 * c.u), dY = Math.atan2(Math.sin(c.wantYaw - c.yaw0), Math.cos(c.wantYaw - c.yaw0)); FS.aim = c.yaw0 + dY * e;   /* 갈 쪽으로 천천히 틂 */
        FS.chBank = -Math.sign(dY || 1) * Math.min(.5, Math.abs(dY) * .3 + .12) * Math.sin(c.u * Math.PI); FS.chPitch = (c.back ? 0 : (g.key === 'up' ? .18 : -.14)) * e;
        if (c.u >= 1) { charge = null; FS.chBank = 0; FS.chPitch = 0; startTrip(g.key, c.back); } } }
    /* ── 길을 탐: 처음부터 확 빠르게, 점점 느려지며 출구 앞에서 수평으로 미끄러져 멈춤 ── */
    if (mode === 'trip') { const tr = trip; tr.u = Math.min(1, tr.u + dt / tr.dur); const e = 1 - Math.pow(1 - tr.u, 2.6), s = tr.back ? 1 - e : e;
      tr.p.curve.getPointAt(clamp(s, 0, 1), v3); tr.p.curve.getTangentAt(clamp(s, 0, 1), tan); if (tr.back) tan.negate(); tr.s = e;
      FS.dashUntil = t + 1; FS.dashVx = (v3.x - FS.x) / Math.max(dt, 1e-3); FS.dashVz = (v3.z - FS.z) / Math.max(dt, 1e-3); fly.position.y = v3.y - HOVER; FS.aim = Math.atan2(-tan.x, -tan.z); FS.tripPitch = Math.atan2(tan.y, Math.hypot(tan.x, tan.z));
      if (tr.u >= 1) { FS.dashUntil = 0; FS.aim = null; FS.tripPitch = 0; lock = tr.back ? gEnt[tr.key] : gExit[tr.key]; mode = tr.back ? 'mid' : tr.key; fly.position.y = flightY(mode) - HOVER; fly.userData.moveTo(v3.x, v3.z); FS.vx = tan.x * 2; FS.vz = tan.z * 2; trip = null; } }
    fly.updateMatrixWorld(true); fly.userData.update(t, dt); for (const o of oldSh) o.visible = false;
    { const sh = fly.children[0]; if (FS.tripPitch) sh.rotateX(FS.tripPitch * .7); if (FS.chPitch) sh.rotateX(FS.chPitch); if (FS.chBank) sh.rotateZ(FS.chBank); }
    say.textContent = mode === 'trip' ? (trip.back ? '돌아가는 중 · 공격받지 않음' : (trip.key === 'up' ? '윗층으로' : '아래층으로') + ' 가는 중 · 공격받지 않음') : charge ? `출발 준비 ${Math.ceil(3 - charge.u * 3)} · 움직이면 취소` : mode === 'mid' ? '가운데층 · 빛나는 문 한가운데서 멈추면 출발' : (mode === 'up' ? '윗층' : '아래층') + ' 던전 · 출구 문 한가운데서 멈추면 돌아감';
    /* ── 문 · 길 · 빛 ── */
    for (const g of G4) { const col = g.key === 'dn' ? DN : UP; g.G.update(t, g.act, col, dt, g.ch);
      for (const [m, w] of g.G.glows) { tmp.copy(g.G.idle).multiplyScalar(.18 + w * .15); onC.copy(col).multiplyScalar(.3 + w * .8); m.material.color.copy(tmp.lerp(onC, g.act)); }
      for (const f of g.G.films) { f.material.uniforms.uC.value.copy(col); f.material.uniforms.uA.value = .08 + g.act * .5 + g.ch * .4; f.material.uniforms.uT.value = t; } }
    for (const k of ['up', 'dn']) for (const m of P[k].meshes) { const u = m.material.uniforms; u.uC.value.copy(k === 'dn' ? DN : UP); u.uA.value = Math.max(gEnt[k].act, trip?.key === k ? 1 : 0, mode === k ? .7 : 0); u.uT.value = t; u.uDir.value = trip?.back || mode === k ? -1 : 1; }
    chest.rotation.y = t * .3;
    /* 가운데층(또는 그쪽으로 가는 중)엔 윗층 섬을 점무늬로 옅게 */
    const wantFade = mode === 'up' || (mode === 'trip' && trip.key === 'up' && (trip.back ? trip.s < .5 : trip.s > .5)) ? 0 : .72; fade += (wantFade - fade) * Math.min(1, dt * 3); GU.uFade.value = fade; for (const g of [gExit.up]) g.root.visible = fade < .6;
    /* 그림자 */
    { const Lm = mode === 'trip' ? null : L[mode], pd = Lm && onPed(mode, FS.x, FS.z, 4.2); let gy = Lm ? Lm.G.groundFast(FS.x - Lm.o.x, FS.z - Lm.o.z) : null; if (pd) gy = Math.max(gy ?? -1e9, pd.root.position.y - (mode === 'mid' ? 0 : Lm.o.y)); if (gy == null) shadow.visible = false; else { const y0 = mode === 'mid' ? 0 : Lm.o.y; shadow.visible = true; shadow.position.set(FS.x, y0 + gy + .06, FS.z); shadow.rotation.set(-Math.PI / 2, 0, FS.head); const h = HOVER - gy; shadow.scale.setScalar(.7 + h * .05); shM.uniforms.uA.value = clamp(.6 - h * .02, .2, .55); } }
    glow.begin();
    if (on) { const p = P[key], ca = (key === 'dn' ? DN : UP).toArray(); if (motes.length < 60 && Math.random() < dt * 30) motes.push({ u: 0, sp: .1 + Math.random() * .08, o: [(Math.random() - .5) * 1.2, (Math.random() - .5) * .6] });
      for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.u += dt * m.sp * gEnt[key].act; if (m.u > 1) { motes.splice(i, 1); continue; } p.curve.getPointAt(m.u, v3); glow.add(v3.x + m.o[0], v3.y - .1 + m.o[1], v3.z, 0, .12, 0, .08, 3, ca, Math.sin(m.u * Math.PI) * gEnt[key].act, i); } }
    if (mode === 'trip') { const sp = fly.children[0].position, ca = (trip.key === 'dn' ? DN : UP).toArray(), k = 1 - trip.u; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 1.3 + Math.random() * 2; glow.add(sp.x + Math.cos(a) * r, fly.position.y + sp.y + Math.sin(a) * r * .5, sp.z + Math.sin(a) * r * .4, -tan.x * 3 * k, -tan.y * 3 * k, -tan.z * 3 * k, .05, 0, ca, .8 * k, i); } }
    glow.end(); glow.uT.value = t;
    if (SW.t < .5) { SW.t += dt; const k = SW.t / .5; shock.visible = true; shock.scale.setScalar(.6 + k * 3.6); shockM.uniforms.uK.value = k; shockM.uniforms.uA.value = (1 - k) * (1 - k) * .9; shockM.uniforms.uC.value.copy(SW.c); } else shock.visible = false;
    /* ── 카메라: 길을 탈 땐 처음엔 제자리 → 길의 절반쯤부터 빠르게 따라붙어 함께 도착 ── */
    const sp = fly.children[0].position, ty = fly.position.y + HOVER;
    if (mode === 'trip') { const f = smooth(.45, .9, trip.s); cam.x = THREE.MathUtils.lerp(trip.cam0.x, sp.x, f); cam.y = THREE.MathUtils.lerp(trip.cam0.y, ty, f); cam.z = THREE.MathUtils.lerp(trip.cam0.z, sp.z, f); }
    else { const k = Math.min(1, dt * 4); cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; cam.y += (ty - cam.y) * Math.min(1, dt * 4); }
    const a = cfg.ang * Math.PI / 180, D = cfg.dist; camera.position.set(cam.x, cam.y + D * Math.sin(a), cam.z + D * Math.cos(a)); camera.lookAt(cam.x, cam.y, cam.z); camera.updateMatrixWorld();
    GI.sea.position.x = cam.x; GI.sea.position.z = cam.z; GI.sea.material.uniforms.uT.value = t;
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[빛의 길]', e); } });
  window.__sp = { FS, cfg, L, P, gEnt, gExit, get mode() { return mode; }, get charge() { return charge; }, get trip() { return trip; }, get t() { return t; }, fly, cam, startTrip, place };
}
