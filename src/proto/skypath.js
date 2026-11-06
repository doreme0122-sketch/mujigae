/* 빛의 길 시험 (사용자 2026-11-06: 빛의 길 비주얼이 중요 · 기체가 빛의 길로 빠르게 감 · 도착 섬은 입구 바로 위가 아니라 멀리 ·
   빛의 길도 원근감이 느껴지게 그 섬에 이어지게 · 입구와 빛의 길은 실제로 봐야 앎)
   · 가운데층 = 하늘섬 난전 맵(v7, 3분의 1) · 가운데 섬 풀밭 위에 입구 하나
   · 윗층 던전 섬 · 아래층 던전 섬을 멀리 띄움 — 보물이 있는 층으로 가는 길만 켜짐 (금빛 = 위 · 보랏빛 = 아래 · 없으면 꺼짐)
   · 켜진 입구 위로 날아가면: 기체가 빛의 길을 따라 빠르게 감 (공격받지 않음 · 카메라가 따라감) → 던전 섬 땅 안에서만 다님
   · 던전의 도착 자리로 다시 가면 같은 길로 들어갔던 입구로 돌아옴
   · 입구 모양 넷(선돌 고리 · 떠 있는 고리 · 거대한 꽃 · 빛 샘) · 빛의 길 셋(빛 띠 길 · 나선 리본 · 빛 고리)을 버튼으로 바꿔 봄
   · 층 높이 · 떨어진 거리는 막대로 바꿔 봄 (볼륨감 찾기) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11061557';
import { makePerf } from './perf.js?v=11061557';
import { makeGlow } from '../preview/glow.js';
import { makeGlbIsle } from './glbisle.js?v=11061557';
import { makeFlight, FLY } from './flight.js?v=11061557';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp, HOVER = FLY.HOVER;
const UP = new THREE.Color(1.5, 1.12, .45), DN = new THREE.Color(.75, .5, 1.6);   /* 빛 색: 금빛 = 윗층 · 보랏빛 = 아래층 */
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0xbcd2ea, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .5, 1200), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .6; pm.dispose(); }
  const sunDir = new THREE.Vector3(-.45, .78, -.42).normalize(), sun = new THREE.DirectionalLight(0xfff0dc, 3); sun.position.copy(sunDir).multiplyScalar(20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x3a3020, .7));
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.05);
  /* ── 세 층 ── */
  const MAPS = 1 / 3, isle = (url, scale, gap) => new Promise(res => { const g = makeGlbIsle(HOVER, res, { url, scale, gap }); scene.add(g.mesh); });
  const [GI, GU, GD] = await Promise.all([isle('./assets/skyislands_v7.glb', MAPS, 2.9), isle('./assets/dng_up.glb', 1, 2.9), isle('./assets/dng_dn.glb', .7, 2.9)]);
  onProgress(.55);
  GU.sea.visible = GD.sea.visible = false;
  /* 던전 섬은 "더 오래된" 초원: 풀빛을 가라앉히고 바위를 이끼 낀 회색 쪽으로 */
  for (const G of [GU, GD]) G.mesh.traverse(o => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) { if (/terrain/i.test(m.name)) m.color.setRGB(.86, .9, .84); if (/foliage/i.test(m.name)) m.color.setRGB(.78, .92, .8); } });
  const L = { mid: { G: GI, o: new THREE.Vector3() }, up: { G: GU, o: new THREE.Vector3() }, dn: { G: GD, o: new THREE.Vector3() } };
  const cfg = { up: 8, dn: 14, far: 26, gate: 'A', path: 1, treasure: 'up' };
  /* 던전 섬 막힘: 섬 땅 밖(아래가 빈 곳)은 막힘 + 기체 높이에 걸친 지형 */
  const dBlocked = (G, x, z) => { if (G.blocked(x, z)) return true; for (let a = 0; a < 8; a++) if (G.groundFast(x + Math.cos(a * .785) * .9, z + Math.sin(a * .785) * .9) == null) return true; return G.groundFast(x, z) == null; };
  /* 입구 자리: 가운데 섬 풀밭 위 트인 곳 */
  const E = (() => { let best = null, bd = 1e9; for (let x = -12; x <= 12; x += .5) for (let z = -10; z <= 10; z += .5) { if (GI.blocked(x, z)) continue; let ok = true; for (let a = 0; a < 12 && ok; a++) if (GI.blocked(x + Math.cos(a * .52) * 2.6, z + Math.sin(a * .52) * 2.6)) ok = false; const g = GI.groundFast(x, z); if (!ok || g == null || g < -3.5) continue; const d = Math.hypot(x - 3, z - 4); if (d < bd) { bd = d; best = [x, z, g]; } } return best || [0, 0, -2.2]; })();
  const EX = E[0], EZ = E[1], EG = E[2];
  /* 던전 도착 자리: 그 섬에서 입구 쪽에 가까운 트인 땅 */
  const padOf = (G, ox, oz) => { let best = null, bd = 1e9; for (let x = -14; x <= 14; x += .5) for (let z = -14; z <= 14; z += .5) { if (dBlocked(G, x, z)) continue; let ok = true; for (let a = 0; a < 8 && ok; a++) if (dBlocked(G, x + Math.cos(a * .785) * 1.8, z + Math.sin(a * .785) * 1.8)) ok = false; if (!ok) continue; const d = Math.hypot(x + ox - EX, z + oz - EZ); if (d < bd) { bd = d; best = [x, z, G.groundFast(x, z)]; } } return best || [0, 0, -2.2]; };
  /* ── 입구 모양 넷 (낮은 다각 · 섬과 같은 결) ── */
  const stoneM = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: .9, flatShading: true }), stoneD = new THREE.MeshStandardMaterial({ color: 0xb9ab8e, roughness: .95, flatShading: true });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x6fb44c, roughness: .8, flatShading: true, side: THREE.DoubleSide }), petalM = new THREE.MeshStandardMaterial({ color: 0xffb3d4, roughness: .6, flatShading: true, side: THREE.DoubleSide, emissive: new THREE.Color(0), emissiveIntensity: 1 });
  const runeM = new THREE.MeshBasicMaterial({ color: 0x222222 });   /* 룬: 꺼지면 어두운 홈 · 켜지면 빛 색 */
  const jitter = (geo, k, seed) => { const p = geo.attributes.position; let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280 - .5; const m = new Map();
    for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!m.has(key)) m.set(key, [r() * k, r() * k * .5, r() * k]); const d = m.get(key); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); }
    geo.computeVertexNormals(); return geo; };
  const discM = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT; varying vec2 vP;
      void main(){ float r=length(vP); float ring=exp(-pow((r-.82)*9.,2.)), core=exp(-r*r*3.)*.7, wave=.5+.5*sin(r*14.-uT*5.);
        gl_FragColor=vec4(uC*(ring*1.2+core*(.5+.5*wave))*uA*smoothstep(1.,.9,r),1.); }` });
  const beamM = () => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 }, uD: { value: 1 } },
    vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU=uv; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uD; varying vec2 vU; varying vec3 vN, vV;
      void main(){ float f=abs(dot(vN,vV)); float y=vU.y; float fl=.6+.4*sin(y*26.-uT*9.*uD+vU.x*12.);
        float a=pow(f,1.5)*(1.-y)*(1.-y)*fl; gl_FragColor=vec4(uC*a*uA*1.3,1.); }` });
  function gateA() {   /* 선돌 고리: 오래된 돌기둥 일곱 · 떠 있는 머릿돌 · 켜지면 룬이 빛 색 */
    const g = new THREE.Group(), runes = [];
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + .3, h = 1.7 + .45 * Math.sin(k * 1.7);
      const geo = jitter(new THREE.CylinderGeometry(.22, .32, h, 5, 2).translate(0, h / 2, 0), .09, k + 3); const s = new THREE.Mesh(geo, stoneM); s.position.set(Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1); s.rotation.y = -a; s.rotation.z = (Math.sin(k * 2.3)) * .06; g.add(s);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(.16, .5), runeM.clone()); r.position.set(Math.cos(a) * 2.42, h * .55, Math.sin(a) * 2.42); r.lookAt(Math.cos(a) * 5, h * .55, Math.sin(a) * 5); g.add(r); runes.push(r); }
    const cap = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(.62, 0), .12, 9), stoneD); cap.scale.set(1.3, .5, 1.3); cap.position.y = 2.25; g.add(cap);
    const floor = new THREE.Mesh(jitter(new THREE.CylinderGeometry(1.7, 1.85, .16, 10), .05, 4), stoneD); floor.position.y = .05; g.add(floor);
    return { g, update(t, c, a) { cap.rotation.y = t * .4; cap.position.y = 2.25 + Math.sin(t * 1.3) * .08; for (const r of runes) r.material.color.setRGB(.13 + c.r * a * .9, .13 + c.g * a * .9, .13 + c.b * a * .9); }, top: 2.5 }; }
  function gateB() {   /* 떠 있는 고리 셋: 위로 갈수록 작아지며 서로 반대로 돎 · 안쪽 띠가 빛 색 */
    const g = new THREE.Group(), rings = [], bands = [];
    [[1.55, .55], [1.18, 1.35], [.82, 2.05]].forEach(([r, y], k) => { const ring = new THREE.Mesh(jitter(new THREE.TorusGeometry(r, .16, 5, 14), .05, k + 11), stoneM); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); rings.push(ring);
      const band = new THREE.Mesh(new THREE.TorusGeometry(r - .14, .035, 4, 40), new THREE.MeshBasicMaterial({ color: 0x222222 })); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band); bands.push(band); });
    const floor = new THREE.Mesh(jitter(new THREE.CylinderGeometry(1.5, 1.6, .14, 9), .05, 5), stoneD); floor.position.y = .05; g.add(floor);
    return { g, update(t, c, a) { rings.forEach((r, k) => { r.rotation.z = t * (k % 2 ? -.5 : .4); r.position.y = [.55, 1.35, 2.05][k] + Math.sin(t * 1.2 + k) * .06; bands[k].position.y = r.position.y; });
      for (const b of bands) b.material.color.setRGB(.13 + c.r * a, .13 + c.g * a, .13 + c.b * a); }, top: 2.2 }; }
  function gateC() {   /* 거대한 꽃: 평소엔 봉오리 · 켜지면 활짝 피며 가운데가 빛남 */
    const g = new THREE.Group(), petals = [];
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.09, .14, 1.5, 6).translate(0, .75, 0), leafM); g.add(stem);
    for (let k = 0; k < 3; k++) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.7, .35, 1.7, 0); sh.quadraticCurveTo(.7, -.35, 0, 0);
      const lf = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), leafM); lf.rotation.x = -Math.PI / 2; lf.rotation.z = k / 3 * Math.PI * 2 + .4; lf.position.y = .06; g.add(lf); }
    const head = new THREE.Group(); head.position.y = 1.5; g.add(head);
    for (let k = 0; k < 8; k++) { const piv = new THREE.Group(); piv.rotation.y = k / 8 * Math.PI * 2; head.add(piv); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.42, .45, 0, 1.15); sh.quadraticCurveTo(-.42, .45, 0, 0);
      const p = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6), petalM); p.position.z = .12; piv.add(p); petals.push(p); }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.26, 1), new THREE.MeshBasicMaterial({ color: 0x665522 })); core.position.y = 1.55; g.add(core);
    let open = 0;
    return { g, update(t, c, a, dt) { open += ((a > .05 ? 1 : 0) - open) * Math.min(1, dt * 2.2); const ang = THREE.MathUtils.lerp(.15, 1.25, open);
      for (const p of petals) p.rotation.x = ang + Math.sin(t * 1.5 + p.parent.rotation.y) * .03;
      core.material.color.setRGB(.4 + c.r * a * .8, .33 + c.g * a * .8, .14 + c.b * a * .8); petalM.emissive.setRGB(c.r * a * .12, c.g * a * .1, c.b * a * .12); }, top: 2.4 }; }
  function gateD() {   /* 빛 샘: 돌 둘레의 연못 · 켜지면 물과 빛이 함께 솟구침 */
    const g = new THREE.Group();
    const pts = [[1.2, 0], [1.55, .05], [1.62, .32], [1.48, .4], [1.3, .3]].map(([x, y]) => new THREE.Vector2(x, y));
    const rim = new THREE.Mesh(jitter(new THREE.LatheGeometry(pts, 12), .04, 7), stoneM); g.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color() }, uA: { value: 0 } },
      vertexShader: 'varying vec2 vP; void main(){ vP=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uT, uA; uniform vec3 uC; varying vec2 vP;
        void main(){ float r=length(vP); float w=.5+.5*sin(r*12.-uT*3.); vec3 c=mix(vec3(.42,.78,.9),vec3(.75,.95,1.),w*.5); c+=uC*uA*(exp(-r*r*2.5)*.9+w*.15); gl_FragColor=vec4(c,1.); }` }));
    water.position.y = .26; g.add(water);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.35, .6, 3.2, 16, 1, true).translate(0, 1.6, 0), beamM()); g.add(col);
    return { g, update(t, c, a) { water.material.uniforms.uT.value = t; water.material.uniforms.uC.value.copy(c); water.material.uniforms.uA.value = a;
      const u = col.material.uniforms; u.uC.value.copy(c); u.uA.value = a * .9; u.uT.value = t; col.scale.y = .2 + .8 * a; }, top: 2.2 }; }
  const GATES = { A: gateA, B: gateB, C: gateC, D: gateD };
  /* 입구 공용: 바닥 빛 원 + 솟는 빛 기둥 (빛 색 · 위로 가면 솟구치고 아래로 가면 빨려 듦) */
  const gateRoot = new THREE.Group(); gateRoot.position.set(EX, EG, EZ); scene.add(gateRoot);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40).rotateX(-Math.PI / 2), discM()); disc.position.y = .2; disc.renderOrder = 6; gateRoot.add(disc);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.35, .6, 6, 16, 1, true).translate(0, 3, 0), beamM()); pillar.renderOrder = 7; gateRoot.add(pillar);
  let gate = null; const setGate = k => { if (gate) gateRoot.remove(gate.g); gate = GATES[k](); gateRoot.add(gate.g); cfg.gate = k; };
  setGate('A');
  /* 던전 도착 자리 표시 (돌아오는 곳) */
  const padMk = () => { const g = new THREE.Group(); const f = new THREE.Mesh(jitter(new THREE.CylinderGeometry(1.4, 1.55, .14, 9), .05, 21), stoneD); f.position.y = .05; g.add(f);
    const d = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32).rotateX(-Math.PI / 2), discM()); d.position.y = .16; d.renderOrder = 6; g.add(d); scene.add(g); return { g, d }; };
  const PU = padMk(), PD = padMk();
  /* 보물: 제단 위 상자 (윗층·아래층 중 무작위로 생긴다는 규칙 · 여기서는 버튼으로 고름) */
  const chest = (() => { const g = new THREE.Group(); const base = new THREE.Mesh(jitter(new THREE.CylinderGeometry(.9, 1.05, .5, 8).translate(0, .25, 0), .05, 31), stoneM); g.add(base);
    const box = new THREE.Mesh(new THREE.BoxGeometry(.9, .5, .6).translate(0, .75, 0), new THREE.MeshStandardMaterial({ color: 0x9a6430, roughness: .6, flatShading: true })); g.add(box);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .9, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 1, 0), new THREE.MeshStandardMaterial({ color: 0xc88a3a, roughness: .5, flatShading: true, emissive: 0x3a2200 })); g.add(lid);
    const band = new THREE.Mesh(new THREE.BoxGeometry(.94, .08, .64).translate(0, .78, 0), new THREE.MeshStandardMaterial({ color: 0xffd25a, metalness: .8, roughness: .3, emissive: 0x664400 })); g.add(band);
    scene.add(g); return g; })();
  /* ── 빛의 길 ── */
  const pathGrp = new THREE.Group(); scene.add(pathGrp);
  const P = { up: null, dn: null };
  const ribbonGeo = (curve, n, w, twist = 0, phase = 0, rad = 0) => { const pos = [], uv = [], idx = [], up0 = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), Bn = new THREE.Vector3(), Nn = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) { const u = i / n; curve.getPointAt(u, p); curve.getTangentAt(u, T); Bn.crossVectors(T, up0); if (Bn.lengthSq() < 1e-6) Bn.set(1, 0, 0); Bn.normalize(); Nn.crossVectors(Bn, T).normalize();
      const a = u * twist + phase, ca = Math.cos(a), sa = Math.sin(a), c = p.clone();
      if (rad) c.addScaledVector(Bn, ca * rad).addScaledVector(Nn, sa * rad);
      const side = rad ? Bn.clone().multiplyScalar(-sa).addScaledVector(Nn, ca) : Bn.clone().multiplyScalar(ca).addScaledVector(Nn, sa);
      pos.push(c.x - side.x * w, c.y - side.y * w, c.z - side.z * w, c.x + side.x * w, c.y + side.y * w, c.z + side.z * w); uv.push(0, u, 1, u);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  /* 빛 띠 셰이더: 가운데가 밝고 가장자리는 부드럽게 사라짐 · 꺾쇠 무늬가 도착 쪽으로 흐름 · 반짝이 알갱이 · 끝으로 갈수록 살짝 옅게(멀어지는 느낌) */
  const roadM = (kind) => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 }, uL: { value: 60 }, uDir: { value: 1 }, uK: { value: kind } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uL, uDir, uK; varying vec2 vU;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){ float x=vU.x*2.-1., s=vU.y*uL;
        float edge=exp(-x*x*(uK>1.5?2.:3.5)), core=exp(-x*x*40.);
        float flow=s-uT*14.*uDir;
        float chev=uK<.5 ? smoothstep(.55,.95,fract((flow-abs(x)*1.4)/3.2)) : .0;
        float spark=step(.985,h(floor(vec2(x*8.,flow*2.))))*.9;
        float ends=smoothstep(0.,.04,vU.y)*smoothstep(1.,.96,vU.y);
        float fade=mix(1.,.55,vU.y);
        float a=(edge*.22+core*.55+spark*edge*.7)*ends*fade;   /* 꺾쇠 무늬 뺌 (사용자 2026-11-06) */
        gl_FragColor=vec4(uC*a*uA*.75,1.); }` });
  const buildPath = (key) => { for (const m of (P[key]?.meshes || [])) { pathGrp.remove(m); m.geometry.dispose(); }
    const Ld = L[key], pad = Ld.pad, o = Ld.o, A0 = new THREE.Vector3(EX, EG + .3, EZ), B0 = new THREE.Vector3(o.x + pad[0], o.y + pad[2] + .3, o.z + pad[1]);
    const d = new THREE.Vector3().subVectors(B0, A0), hz = Math.hypot(d.x, d.z), up = key === 'up';
    /* 입구에서 먼저 솟거나(위) 살짝 떠오른 뒤 미끄러지듯 내려감(아래) → 길게 휘며 뻗어 → 도착 자리 위에서 내려앉음 */
    const pts = [A0, A0.clone().add(new THREE.Vector3(0, up ? 5 : 3.2, 0)), A0.clone().lerp(B0, .35).add(new THREE.Vector3(0, up ? 6 : 1.5 + hz * .05, 0)), A0.clone().lerp(B0, .72).add(new THREE.Vector3(0, up ? 4 : 5, 0)), B0.clone().add(new THREE.Vector3(0, 3.5, 0)), B0];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .5), len = curve.getLength(), meshes = [];
    const add = (geo, mat, ro) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = ro; m.frustumCulled = false; pathGrp.add(m); meshes.push(m); return m; };
    const n = Math.ceil(len * 3);
    if (cfg.path === 1) { add(ribbonGeo(curve, n, .62), roadM(0), 7); add(ribbonGeo(curve, n, 1.3), roadM(2), 6); }   /* ① 빛 띠 길: 넓은 띠(꺾쇠가 흐름) + 옅은 빛무리 */
    else if (cfg.path === 2) { for (let k = 0; k < 2; k++) add(ribbonGeo(curve, n * 2, .14, len / 5, k * Math.PI, .9), roadM(1), 7); add(ribbonGeo(curve, n, .22), roadM(1), 6); }   /* ② 나선 리본 둘이 감기며 + 가는 심 */
    else { add(ribbonGeo(curve, n, .16), roadM(1), 6);   /* ③ 빛 고리: 4m마다 고리 · 차례로 반짝이며 도착 쪽으로 흐름 */
      const cnt = Math.floor(len / 4); for (let i = 1; i < cnt; i++) { const u = i / cnt, p = curve.getPointAt(u), T = curve.getTangentAt(u);
        const m = add(new THREE.TorusGeometry(1.15, .05, 6, 36), roadM(3), 7); m.position.copy(p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), T); m.userData.u = u; } }
    for (const m of meshes) m.material.uniforms.uL.value = len;
    P[key] = { curve, len, meshes, A0, B0 }; };
  /* 층 자리: 가운데층 기준 · 윗층은 왼쪽 위로 · 아래층은 오른쪽 저 아래로 (카메라에서 멀리 보이는 쪽) */
  const place = () => { L.up.o.set(EX - cfg.far * .62, cfg.up, EZ - cfg.far * .2); L.dn.o.set(EX + cfg.far * .7, -cfg.dn, EZ - cfg.far * .8);
    GU.mesh.position.copy(L.up.o); GD.mesh.position.copy(L.dn.o); GU.mesh.updateMatrixWorld(true); GD.mesh.updateMatrixWorld(true);
    L.up.pad = L.up.pad || padOf(GU, L.up.o.x, L.up.o.z); L.dn.pad = L.dn.pad || padOf(GD, L.dn.o.x, L.dn.o.z);
    for (const [k, pm] of [['up', PU], ['dn', PD]]) { const Ld = L[k]; pm.g.position.set(Ld.o.x + Ld.pad[0], Ld.o.y + Ld.pad[2], Ld.o.z + Ld.pad[1]); }
    buildPath('up'); buildPath('dn'); placeChest(); };
  const placeChest = () => { const k = cfg.treasure; chest.visible = k !== 'none'; if (!chest.visible) return; const Ld = L[k], G = Ld.G, pad = Ld.pad;
    let best = null, bd = -1; for (let x = -14; x <= 14; x += .5) for (let z = -14; z <= 14; z += .5) { if (dBlocked(G, x, z)) continue; const d = Math.hypot(x - pad[0], z - pad[1]); if (d > bd && d < 16) { bd = d; best = [x, z]; } }
    if (best) chest.position.set(Ld.o.x + best[0], Ld.o.y + G.groundFast(best[0], best[1]), Ld.o.z + best[1]); };
  place();
  onProgress(.6);
  /* ── 내 기체 ── */
  let mode = 'mid', trip = null, armed = true;
  const B = { blocked: (x, z) => mode === 'trip' ? false : mode === 'mid' ? GI.blocked(x, z) : dBlocked(L[mode].G, x - L[mode].o.x, z - L[mode].o.z), region: () => 0 };
  const fly = await makeFlight(renderer, B, [EX + 5, EZ + 4], 0); scene.add(fly); const FS = fly.userData.S; fly.userData.moveTo(EX + 5, EZ + 4, 0);
  const oldSh = []; fly.traverse(o => { if (o.isMesh && o.renderOrder === 1 && o.geometry.type === 'PlaneGeometry') oldSh.push(o); });
  const shM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: .5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vP; void main(){ vec2 q=vP*vec2(1.,1.6); float r=dot(q,q); gl_FragColor=vec4(0.,0.,0.,exp(-r*3.)*uA); }' });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FLY.LEN * 1.3, FLY.LEN * 1.3), shM); shadow.renderOrder = 1; scene.add(shadow);
  onProgress(.9);

  /* ── 화면 ── */
  const cam = { x: EX, y: HOVER, z: EZ, ang: 45, dist: 25, bk: 0 };
  const bind = (id, key, fmt, after) => { const el = $('#' + id), out = $('#' + id + 'v'); const rd = () => { cfg[key] = +el.value; out.textContent = fmt(+el.value); after?.(); }; el.addEventListener('input', rd); rd(); };
  bind('ang', 'ang', v => v + '°', () => { cam.ang = cfg.ang; });
  bind('dist', 'dist', v => v + 'm', () => { cam.dist = cfg.dist; });
  bind('lup', 'up', v => '+' + v + 'm', () => { if (mode === 'mid') place(); });
  bind('ldn', 'dn', v => '-' + v + 'm', () => { if (mode === 'mid') place(); });
  bind('lfar', 'far', v => v + 'm', () => { if (mode === 'mid') place(); });
  const seg = (sel, key, vals, after) => document.querySelectorAll(sel + ' button').forEach((b, i) => { b.onclick = () => { cfg[key] = vals[i]; document.querySelectorAll(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); after(); }; });
  seg('#sg', 'gate', ['A', 'B', 'C', 'D'], () => setGate(cfg.gate));
  seg('#sp', 'path', [1, 2, 3], () => { buildPath('up'); buildPath('dn'); });
  seg('#st', 'treasure', ['up', 'dn', 'none'], () => placeChest());
  const say = $('#where');

  let Wd = 2, Hd = 2, cw = 1, ch = 1;
  const perf = makePerf(st => { bloom.setSamples(st.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height; [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd);
    camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); fly.userData.setPx?.(Hd / (2 * Math.tan(camera.fov * Math.PI / 360))); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const v3 = new THREE.Vector3(), tan = new THREE.Vector3(), motes = [];
  let t = 0, last = performance.now(), act = 0;
  const ease = u => u * u * u * (u * (u * 6 - 15) + 10);
  const startTrip = (key, back) => { const p = P[key]; trip = { key, back, u: 0, dur: clamp(p.len / 34, 1.3, 2.4), p }; mode = 'trip'; armed = false; };
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    const key = cfg.treasure, on = key !== 'none', col = key === 'dn' ? DN : UP, ca = col.toArray();
    act += ((on ? 1 : 0) - act) * Math.min(1, dt * 3);
    /* 입구: 켜짐 정도 · 위로 가면 솟구치고 아래로 가면 빨려 듦 */
    gate.update(t, col, act, dt); disc.material.uniforms.uC.value.copy(col); disc.material.uniforms.uA.value = .25 + act; disc.material.uniforms.uT.value = t;
    { const u = pillar.material.uniforms; u.uC.value.copy(col); u.uA.value = act * .35; u.uT.value = t; u.uD.value = key === 'dn' ? -1 : 1; pillar.scale.y = .3 + .7 * act; }
    for (const [k, pm] of [['up', PU], ['dn', PD]]) { const u = pm.d.material.uniforms; u.uC.value.copy(k === 'dn' ? DN : UP); u.uA.value = (k === key ? .9 : .15); u.uT.value = t; }
    for (const k of ['up', 'dn']) for (const m of P[k].meshes) { const u = m.material.uniforms; u.uC.value.copy(k === 'dn' ? DN : UP); const lit = k === key ? act : 0; u.uA.value = (m.userData.u != null ? .55 + .45 * Math.max(0, Math.sin((m.userData.u * 8 - t * 2.2) * Math.PI)) : 1) * (lit + (trip?.key === k ? 1 : 0)); u.uT.value = t; u.uDir.value = trip?.back ? -1 : 1; }
    chest.rotation.y = t * .3;
    /* ── 기체 ── */
    if (mode === 'trip') { const tr = trip; tr.u = Math.min(1, tr.u + dt / tr.dur); const s = tr.back ? 1 - ease(tr.u) : ease(tr.u);
      tr.p.curve.getPointAt(clamp(s, 0, 1), v3); tr.p.curve.getTangentAt(clamp(s, 0, 1), tan); if (tr.back) tan.negate();
      const ny = v3.y - HOVER + .1; FS.dashUntil = t + 1; FS.dashVx = (v3.x - FS.x) / Math.max(dt, 1e-3); FS.dashVz = (v3.z - FS.z) / Math.max(dt, 1e-3); fly.position.y = ny; FS.aim = Math.atan2(-tan.x, -tan.z); FS.tripPitch = Math.atan2(tan.y, Math.hypot(tan.x, tan.z));
      if (tr.u >= 1) { FS.dashUntil = 0; FS.aim = null; FS.tripPitch = 0; const dest = tr.back ? 'mid' : tr.key; mode = dest; const Ld = L[dest]; fly.position.y = dest === 'mid' ? 0 : Ld.o.y;
        if (tr.back) { const a = Math.atan2(FS.z - EZ, FS.x - EX); fly.userData.moveTo(EX + Math.cos(a) * 3.2, EZ + Math.sin(a) * 3.2); } else fly.userData.moveTo(v3.x, v3.z); FS.vx = tan.x * 6; FS.vz = tan.z * 6; trip = null; } }
    fly.updateMatrixWorld(true); fly.userData.update(t, dt); for (const o of oldSh) o.visible = false;
    if (FS.tripPitch) fly.children[0].rotateX(FS.tripPitch * .7);
    /* 입구·도착 자리 밟기 (한 번 벗어나야 다시 켜짐) */
    if (mode === 'mid') { const d = Math.hypot(FS.x - EX, FS.z - EZ); if (d > 3) armed = true; if (armed && on && act > .6 && d < 1.7) startTrip(key, false); }
    else if (mode === 'up' || mode === 'dn') { const Ld = L[mode], d = Math.hypot(FS.x - (Ld.o.x + Ld.pad[0]), FS.z - (Ld.o.z + Ld.pad[1])); if (d > 3) armed = true; if (armed && d < 1.4) startTrip(mode, true); }
    say.textContent = mode === 'trip' ? (trip.back ? '돌아가는 중 · 공격받지 않음' : (trip.key === 'up' ? '윗층으로' : '아래층으로') + ' 가는 중 · 공격받지 않음') : mode === 'mid' ? '가운데층 · 빛나는 입구 위로 날아가면 출발' : (mode === 'up' ? '윗층' : '아래층') + ' 던전 · 도착 자리로 가면 돌아감';
    /* 그림자: 지금 층의 땅 위에 */
    { const Lm = mode === 'trip' ? null : L[mode]; let gy = null; if (Lm) gy = Lm.G.groundFast(FS.x - Lm.o.x, FS.z - Lm.o.z); if (gy == null) shadow.visible = false; else { const y = (mode === 'mid' ? 0 : Lm.o.y); shadow.visible = true; shadow.position.set(FS.x, y + gy + .06, FS.z); shadow.rotation.set(-Math.PI / 2, 0, FS.head); const h = HOVER - gy; shadow.scale.setScalar(.7 + h * .05); shM.uniforms.uA.value = clamp(.6 - h * .02, .2, .55); } }
    /* ── 빛 알갱이: 켜진 길을 따라 도착 쪽으로 흘러감 · 길을 타는 동안은 기체 둘레로 속도선 ── */
    glow.begin();
    if (on) { const p = P[key]; if (motes.length < 70 && Math.random() < dt * 40) motes.push({ u: 0, sp: .12 + Math.random() * .1, o: [(Math.random() - .5) * 1.6, (Math.random() - .5) * .8] });
      for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.u += dt * m.sp * act; if (m.u > 1) { motes.splice(i, 1); continue; } p.curve.getPointAt(m.u, v3); glow.add(v3.x + m.o[0], v3.y + .2 + m.o[1], v3.z, 0, .15, 0, .09, 3, ca, Math.sin(m.u * Math.PI) * act, i); } }
    if (mode === 'trip') { const p = fly.children[0].position; for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28, r = 1.4 + Math.random() * 2.2; glow.add(p.x + Math.cos(a) * r, fly.position.y + p.y + Math.sin(a) * r * .5, p.z + Math.sin(a) * r * .4, -tan.x * 2.5, -tan.y * 2.5, -tan.z * 2.5, .05, 0, trip.key === 'dn' ? DN.toArray() : UP.toArray(), .8, k); } }
    glow.end(); glow.uT.value = t;
    /* ── 카메라: 기체를 따라감 (높이도) · 길을 타는 동안 살짝 물러남 ── */
    const sp = fly.children[0].position, ty = fly.position.y + HOVER, k = Math.min(1, dt * (mode === 'trip' ? 7 : 4));
    cam.x += (sp.x + FS.vx * .25 - cam.x) * k; cam.z += (sp.z + FS.vz * .25 - cam.z) * k; cam.y += (ty - cam.y) * Math.min(1, dt * (mode === 'trip' ? 6 : 3));
    cam.bk += ((mode === 'trip' ? 1 : 0) - cam.bk) * Math.min(1, dt * 2.5);
    const a = cam.ang * Math.PI / 180, D = cam.dist * (1 + .18 * cam.bk); camera.position.set(cam.x, cam.y + D * Math.sin(a), cam.z + D * Math.cos(a)); camera.lookAt(cam.x, cam.y, cam.z); camera.updateMatrixWorld();
    GI.sea.position.x = cam.x; GI.sea.position.z = cam.z; GI.sea.material.uniforms.uT.value = t;
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[빛의 길]', e); } });
  window.__sp = { FS, cfg, L, P, E, get mode() { return mode; }, get t() { return t; }, fly, cam, startTrip, place };
}
