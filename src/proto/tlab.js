/* 타겟팅 시험장 (사용자 2026-11-09) — 실제 게임 화면(3D·빛 번짐)에서 자동 조준 · 터치 고정 · 끊김 규칙 · 대상 버튼 · 스킬 조준을 만져 보는 곳
   디자인 두 가지: ① 프리즘 칼날 (유리 칼날 셋이 맴돌다 고정 순간 안으로 꽂히듯 모임) ② 링 스코프 (바닥에 얇은 조준 고리 · 위에서 꺾쇠가 내려와 물림)
   색은 절제: 평소엔 은빛 흰색 하나, 고정되면 산호빛 하나, 무지개는 고정되는 순간 한 번 스치는 빛으로만 ("반사"의 순간)
   규칙: 고정은 내 시야(24m) 안에서만 유지 · 시야 밖이나 숲에 숨으면 1.5초 버팀 → 끊김 · 같은 대상 다시 누르거나 빈 곳 누르면 풀림 */
import * as THREE from 'three';
import { makeBloom } from '../core/hangar/bloom.js?v=11101601';
import { makeFlight, FLY, mergeShip, padZone, PADZ } from './flight.js?v=11101601';
import { buildShip } from '../core/ships/build.js';

const SIGHT = 24, ISL = 32;
const TAU = Math.PI * 2, clamp = (x, a, b) => x < a ? a : x > b ? b : x, sm = x => x * x * (3 - 2 * x);
const eob = x => { x = clamp(x, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };   /* 살짝 넘쳤다 돌아오는 착지 */
const CORAL = new THREE.Color(1.3, .1, .18), RUBY = new THREE.Color(1, .2, .28), SILVER = new THREE.Color(.86, .92, 1), AMBER = new THREE.Color(1, .72, .3);
let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .3, 900), bloom = makeBloom(renderer, { samples: 0 });
  scene.fog = new THREE.FogExp2(0x2a2550, .006);

  /* ── 하늘: 저녁에서 밤으로 넘어가는 보랏빛 · 별 ── */
  { const g = new THREE.SphereGeometry(500, 32, 16), m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        void main(){ float y = vD.y; vec3 c = mix(vec3(.42, .3, .55), vec3(.05, .05, .16), smoothstep(-.05, .55, y)); c += vec3(.55, .32, .38) * exp(-abs(y) * 9.) * .5;
          vec3 q = floor(vD * 340.); float s = step(.9975, h(q)) * smoothstep(.0, .3, y); c += s * (.6 + .4 * h(q + 1.)) * 1.6; gl_FragColor = vec4(c, 1.); }` });
    scene.add(new THREE.Mesh(g, m)); }
  /* ── 구름 바다 ── */
  const seaU = { uT: { value: 0 } };
  { const m = new THREE.ShaderMaterial({ uniforms: seaU, fog: false, transparent: true,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT; varying vec3 vW;
        float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
        float fb(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += n(p) * a; p = p * 2.03 + 7.1; a *= .5; } return s; }
        void main(){ vec2 p = vW.xz * .018; float f = fb(p + vec2(uT * .01, uT * .006)), g = fb(p * 2.3 - vec2(uT * .02, 0.));
          vec3 c = mix(vec3(.2, .16, .36), vec3(.75, .62, .86), smoothstep(.35, .8, f)); c += vec3(.9, .7, .8) * pow(g, 5.) * .5;
          float d = length(vW.xz) / 420.; gl_FragColor = vec4(mix(c, vec3(.3, .22, .45), smoothstep(.3, 1., d)), 1.); }` });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), m); sea.position.y = -14; scene.add(sea); }
  scene.add(new THREE.HemisphereLight(0x9a90e0, 0x1c1430, .6)); const moon = new THREE.DirectionalLight(0xffe6d0, 1.05); moon.position.set(-30, 50, 20); scene.add(moon);

  /* ── 시험 섬: 풀 덮인 윗면 · 깎아지른 보랏빛 절벽 · 아래로 갈수록 뾰족 (낮은 다각형 · 면마다 빛 다르게) ── */
  const hs = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (hs(ix, iz) * (1 - u) + hs(ix + 1, iz) * u) * (1 - v) + (hs(ix, iz + 1) * (1 - u) + hs(ix + 1, iz + 1) * u) * v; };
  { const pos = [], col = [], NA = 64, NR = 9, rim = a => ISL + (vn(Math.cos(a) * 3 + 9, Math.sin(a) * 3) - .5) * 6;
    const top = (r, a) => { const x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, (vn(x * .12, z * .12) - .5) * .5 - Math.max(0, r / rim(a) - .85) * 2, z]; };
    const grass = (y, k) => [.07 + k * .05, .2 + k * .07 + y * .05, .2 + k * .04], tri = (a, b, c, ca, cb, cc) => { pos.push(...a, ...b, ...c); col.push(...ca, ...cb, ...cc); };
    for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) { const a0 = i / NA * TAU, a1 = (i + 1) / NA * TAU, r00 = j / NR, r01 = (j + 1) / NR;
      const p = [[r00, a0], [r01, a0], [r01, a1], [r00, a1]].map(([u, a]) => top(u * rim(a), a)), k = hs(i, j) * .6;
      tri(p[0], p[2], p[1], grass(p[0][1], k), grass(p[2][1], k), grass(p[1][1], k)); tri(p[0], p[3], p[2], grass(p[0][1], k * .8), grass(p[3][1], k * .8), grass(p[2][1], k * .8)); }
    const LV = [0, -3, -7, -12, -18, -24];   /* 절벽: 층마다 안쪽으로 들어가며 뾰족해짐 */
    for (let i = 0; i < NA; i++) for (let l = 0; l < LV.length - 1; l++) { const a0 = i / NA * TAU, a1 = (i + 1) / NA * TAU, sh = l => Math.pow(1 - l / (LV.length - 1), 1.3);
      const P = (a, l) => { const r = rim(a) * sh(l) * (.9 + vn(a * 5, l * 1.7) * .2) + (l ? 0 : 0); return l ? [Math.cos(a) * r, LV[l] + (vn(a * 4, l) - .5) * 2, Math.sin(a) * r] : top(rim(a), a); };
      const q = [P(a0, l), P(a0, l + 1), P(a1, l + 1), P(a1, l)], c1 = [.33 - l * .03 + hs(i, l) * .06, .22 - l * .02, .38 - l * .02], c2 = c1.map(v => v * .85);
      tri(q[0], q[1], q[2], c1, c1, c1); tri(q[0], q[2], q[3], c2, c2, c2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))); }
  /* 바위 · 빛나는 수정 (낮은 다각형) */
  const rockM = new THREE.MeshLambertMaterial({ color: 0x6a5a86, flatShading: true }), cryM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 1.6, 1.9) });
  for (let i = 0; i < 26; i++) { const a = R() * TAU, r = 6 + R() * 24, g = new THREE.DodecahedronGeometry(.4 + R() * 1.1, 0); const m = new THREE.Mesh(g, rockM); m.position.set(Math.cos(a) * r, -.1, Math.sin(a) * r); m.scale.y = .5 + R() * .6; m.rotation.set(R(), R() * 6, R()); scene.add(m);
    if (i % 3 === 0) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(.25, 0), cryM); c.scale.set(1, 3 + R() * 2, 1); c.position.set(m.position.x + .5, .5, m.position.z); c.rotation.z = (R() - .5) * .6; scene.add(c); } }
  /* 숲 덤불 (숨는 곳): 빽빽한 침엽수 무더기 */
  const BUSH = { x: -12, z: -9, r: 5.5 };
  { const trunk = new THREE.MeshLambertMaterial({ color: 0x4a3328, flatShading: true });
    for (let i = 0; i < 22; i++) { const a = R() * TAU, r = Math.sqrt(R()) * BUSH.r, s = 1.2 - r / BUSH.r * .45 + R() * .3, x = BUSH.x + Math.cos(a) * r, z = BUSH.z + Math.sin(a) * r;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.08 * s, .14 * s, 1.2 * s, 5), trunk); t.position.set(x, .6 * s, z); scene.add(t);
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.1 - k * .28) * s, 1.4 * s, 7), new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(.4 + R() * .05, .45, .26 + k * .06 + R() * .05), flatShading: true }));
        c.position.set(x, (1.3 + k * .75) * s, z); c.rotation.y = R() * 6; scene.add(c); } } }
  onProgress(.25);

  /* ── 내 기체 (실제 게임 기체 · 실제 조이스틱) ── */
  const B = { blocked: (x, z) => Math.hypot(x, z) > ISL - 1.5, region: () => 0 };
  const fly = await makeFlight(renderer, B, [0, 12], Math.PI); scene.add(fly); const FS = fly.userData.S;
  onProgress(.55);

  /* ── 적 플레이어 기체 둘 ── */
  const ENT = [];
  for (const [i, paint] of [[2, 'OBSIDIAN'], [1, 'onyx']].entries()) { const b = await buildShip(paint[0], 1, paint[1], { renderer, size: FLY.LEN }); const root = b.root; mergeShip(root.children[0]);
    const halo = new THREE.Mesh(new THREE.RingGeometry(.9, 1.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, .35, .45), transparent: true, opacity: .55, depthWrite: false })); halo.position.y = -.68;   /* 적 표시: 발밑 붉은 테 */
    root.add(halo); scene.add(root); ENT.push({ kind: 'player', name: i ? '적 기체 B' : '적 기체 A', obj: root, x: i ? 10 : -6, z: i ? -10 : -14, y: FLY.HOVER, h: 0, hp: 100, r: 1.2, wp: null, until: 0, mode: 'roam', hidden: false, flash: 0, dead: 0 }); }
  onProgress(.8);

  /* ── 몬스터: 떠다니는 유리 해파리 짐승 (갓은 비치는 막 · 속에서 빛나는 심장 · 촉수가 물결) ── */
  const jellyM = col => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uC: { value: col }, uF: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uF; varying vec3 vN, vV; void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2); vec3 c = uC * (.25 + f * 1.8) + vec3(1.) * uF * 1.5; gl_FragColor = vec4(c, .25 + f * .6 + uF * .4); }' });
  for (let i = 0; i < 3; i++) { const col = new THREE.Color().setHSL(.75 + i * .06, .7, .6), g = new THREE.Group(), rr = .9 + i * .15;
    const bellM = jellyM(col), bell = new THREE.Mesh(new THREE.SphereGeometry(rr, 28, 14, 0, TAU, 0, Math.PI * .56), bellM); g.add(bell);
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(rr * .3, 1), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2) })); heart.position.y = rr * .2; g.add(heart);
    const lines = []; for (let k = 0; k < 9; k++) { const geo = new THREE.BufferGeometry(), arr = new Float32Array(18 * 3); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.3), transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); l.frustumCulled = false; g.add(l); lines.push({ arr, geo, a: k / 9 * TAU, len: rr * (2.2 + R() * 1.4) }); }
    scene.add(g); ENT.push({ kind: 'monster', name: '유리 해파리', obj: g, bell, bellM, lines, rr, x: [8, -16, 16][i], z: [6, 10, -2][i], y: 1.8, h: 0, hp: 100, r: rr, wp: null, until: 0, mode: 'roam', hidden: false, flash: 0, dead: 0, ph: R() * 9 }); }
  onProgress(.95);

  /* ── 시야 (게임과 같은 덮개) ── */
  const sightU = { uOn: { value: 1 }, uT: { value: 0 }, uR0: { value: 9 }, uR1: { value: SIGHT } };
  const sight = new THREE.Mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: sightU, transparent: true, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uOn, uT, uR0, uR1; varying vec2 vP; void main(){ float d = length(vP), a = atan(vP.y, vP.x), wob = sin(a * 3. + uT * .35) * .9 + sin(a * 5. - uT * .23) * .6;
      float k = smoothstep(uR0 + wob, uR1 + wob, d); gl_FragColor = vec4(vec3(.004, .006, .018), k * .9 * uOn); }` }));
  sight.renderOrder = 5000; sight.frustumCulled = false; scene.add(sight);

  /* ════ 표시 재료 ════ */
  const add = (m, ro = 60) => { m.renderOrder = ro; m.frustumCulled = false; scene.add(m); return m; };
  /* 유리 칼날: 세모 단면의 가늘고 긴 결정 · 가장자리는 은빛으로 밝고(빛 번짐) 속은 비침 · 칼날을 따라 아주 옅은 분광 띠가 흐름 */
  const bladeGeo = (() => { const g = new THREE.ConeGeometry(.16, 1.25, 3, 1); g.rotateZ(-Math.PI / 2); g.translate(.62, 0, 0); g.scale(1, .55, 1); return g.toNonIndexed(); })(); bladeGeo.computeVertexNormals();
  const bladeMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: SILVER.clone() }, uA: { value: 0 }, uT: { value: 0 }, uSp: { value: 0 } },
    vertexShader: 'varying vec3 vN, vV, vL; void main(){ vL = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uSp; varying vec3 vN, vV, vL;
      vec3 spec(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 1.6), u = vL.x / 1.25;
        float band = exp(-pow((u - fract(uT * .35)) * 9., 2.));                                   /* 칼날을 타고 흐르는 빛 한 줄기 */
        vec3 c = uC * (.18 + f * 1.6 + band * .9) + spec(u + uT * .2) * band * .35;               /* 분광은 그 빛줄기 안에서만 아주 옅게 */
        c += spec(u * .7 + uSp) * uSp * 1.8 * (1. - abs(uSp * 2. - 1.));                            /* 고정되는 순간 한 번 스치는 무지개 */
        gl_FragColor = vec4(c * uA, 1.); }` });
  /* 바닥 고리: 얇은 선 + 부드러운 번짐 · 그려지는 범위(uArc) · 마디 · 도는 빛 */
  const ringMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: SILVER.clone() }, uA: { value: 0 }, uR: { value: 1 }, uW: { value: .045 }, uArc: { value: 1 }, uRot: { value: 0 }, uSeg: { value: 0 }, uT: { value: 0 }, uSp: { value: 0 }, uTick: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uR, uW, uArc, uRot, uSeg, uT, uSp, uTick; varying vec2 vP;
      vec3 spec(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      void main(){ float d = length(vP), a = fract((atan(vP.y, vP.x) - uRot) / 6.2831853), e = d - uR;
        float line = exp(-e * e / (uW * uW)), glow = exp(-e * e / (uW * uW * 30.)) * .25;
        float on = uSeg > .5 ? step(fract(a * uSeg), .5 * uArc + .02) : step(a, uArc);              /* uSeg 칸으로 나뉜 호 · 또는 이어진 고리 */
        float tk = uTick * step(abs(fract(a * 24.) - .5), .06) * smoothstep(uW * 6., 0., abs(e + uW * 3.)) * .8;   /* 안쪽 눈금 */
        float sw = exp(-pow((a - fract(uT * .25)) * 14., 2.)) * .8;                                 /* 고리를 따라 도는 빛 */
        vec3 c = uC * ((line + glow) * on * (1. + sw) + tk) + spec(a - uT * .5) * line * uSp * 2.;
        gl_FragColor = vec4(c * uA, 1.); }` });
  const ringMesh = (size) => add(new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), ringMat()), 55);
  /* 화면을 향한 판 (꺾쇠·마름모) */
  const bbMat = (frag) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: SILVER.clone() }, uA: { value: 0 }, uT: { value: 0 }, uK: { value: 0 }, uSp: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; vec4 c = modelViewMatrix * vec4(0., 0., 0., 1.); vec2 s = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz)); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uK, uSp; varying vec2 vU; vec3 spec(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
      float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); float d = length(pa - ba * h); return exp(-d * d / (w * w)); }
      void main(){ vec2 p = vU; float v = 0.; ${frag} gl_FragColor = vec4((uC * v + spec(p.x * .5 + uT) * v * uSp * 1.5) * uA, 1.); }` });
  /* 빛줄기 (기체 → 대상): 가는 흰 심 + 양옆 아주 옅은 빨강/파랑 어긋남(분광) + 흘러가는 맥박 · 팽팽하면 떨림 */
  const tetherMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: CORAL.clone() }, uA: { value: 0 }, uT: { value: 0 }, uTen: { value: 0 }, uCut: { value: -1 }, uDash: { value: 0 } },
    vertexShader: 'attribute float aU; attribute float aS; varying float vU, vS; void main(){ vU = aU; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT, uTen, uCut, uDash; varying float vU, vS;
      void main(){ float w = .18 - uTen * .1, core = exp(-vS * vS / (w * w * .05)), halo = exp(-vS * vS / (w * w)) * .35;
        vec3 fr = vec3(exp(-pow((vS - .25) / .12, 2.)), 0., exp(-pow((vS + .25) / .12, 2.))) * .35;     /* 빨강·파랑이 살짝 어긋난 테두리 */
        float pulse = exp(-pow((fract(vU * 3. - uT * 1.4) - .5) * 7., 2.)) * .9, ends = smoothstep(0., .06, vU) * smoothstep(1., .9, vU);
        float dash = uDash > 0. ? step(.45, fract(vU * 26. - uT * 2.)) : 1.;
        float fl = 1. - uTen * .6 * step(.5, fract(uT * 18.));                                      /* 버티는 동안 깜빡 */
        float cut = uCut < 0. ? 1. : smoothstep(.0, .03, abs(vU - uCut) - (uCut > 0. ? .08 : 0.));   /* 끊어진 자리 */
        vec3 c = (uC * (core * 1.6 + halo) * (1. + pulse) + fr) * ends * dash * fl * cut;
        gl_FragColor = vec4(c * uA, 1.); }` });
  const TN = 40, tGeo = new THREE.BufferGeometry(), tPos = new Float32Array((TN + 1) * 2 * 3), tU = new Float32Array((TN + 1) * 2), tS = new Float32Array((TN + 1) * 2), tIdx = [];
  for (let i = 0; i <= TN; i++) { tU[i * 2] = tU[i * 2 + 1] = i / TN; tS[i * 2] = -1; tS[i * 2 + 1] = 1; if (i < TN) tIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tGeo.setAttribute('aU', new THREE.BufferAttribute(tU, 1)); tGeo.setAttribute('aS', new THREE.BufferAttribute(tS, 1)); tGeo.setIndex(tIdx);
  const tether = add(new THREE.Mesh(tGeo, tetherMat), 70);
  /* 깨지는 조각 (공용 · 끊길 때) */
  const shardM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const SH = Array.from({ length: 24 }, () => { const m = add(new THREE.Mesh(new THREE.TetrahedronGeometry(.12, 0), shardM.clone()), 65); m.visible = false; return { m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }; });
  const shatter = (p, col, n = 18, spd = 6) => { let k = 0; for (const s of SH) { if (k >= n) break; if (s.life > 0) continue; k++; s.life = .75 + R() * .3; s.m.position.copy(p).add(new THREE.Vector3((R() - .5), (R() - .2), (R() - .5)).multiplyScalar(1.2));
      s.v.set(R() - .5, R() * .8 + .2, R() - .5).normalize().multiplyScalar(spd * (.5 + R())); s.w.set(R() * 9, R() * 9, R() * 9); s.m.scale.setScalar(.6 + R() * 1.4); s.m.material.color.copy(col).multiplyScalar(1.8); s.m.visible = true; } };

  /* ════ 디자인 ① 프리즘 칼날 ════ */
  const D1 = (() => { const blades = [0, 1, 2].map(() => add(new THREE.Mesh(bladeGeo, bladeMat()), 62)), ring = ringMesh(14);
    const st = { a: 0, pull: 0 };
    return {
      hide() { blades.forEach(b => b.visible = false); ring.visible = false; },
      /* s: { mode:'auto'|'lock'|'release', p:{x,y,z}, r, t, k(진입 0..1), fire, ten(버팀 0..1), sp(무지개 스침 0..1), out(사라짐 0..1) } */
      draw(s) { const { p, r, t } = s, lock = s.mode === 'lock', A = (1 - (s.out || 0));
        st.a += (lock ? .25 : .8) * s.dt; const pull = lock ? eob(s.k) : 0, shake = s.ten * .06;
        const R0 = r * 1.4 + 1.01, R1 = r * .95 + 1.01, rad = R0 + (R1 - R0) * pull - s.fire * .25;   /* 칼날 뿌리까지 거리 (칼끝 = 뿌리 - 1.01) */
        blades.forEach((b, i) => { b.visible = true; const a = st.a + i * TAU / 3 + (lock ? 0 : Math.sin(t * 1.3 + i) * .08), y = p.y + (lock ? 0 : Math.sin(t * 1.7 + i * 2) * .18) + .1;
          b.position.set(p.x + Math.cos(a) * rad + (R() - .5) * shake, y, p.z + Math.sin(a) * rad + (R() - .5) * shake);
          b.scale.set(1.35 * .6, 1.35, 1.35);   /* 삼각뿔 길이만 60%로 (사용자 2026-11-09: 좀 짧게) */ b.rotation.set(0, -a + Math.PI, 0); b.rotateZ((lock ? -.35 : -.15) + (1 - pull) * Math.sin(t + i) * .1);   /* 칼끝이 대상을 향하고 · 고정되면 아래로 꽂히듯 기울어짐 */
          const U = b.material.uniforms; U.uT.value = t + i * .33; U.uSp.value = s.sp; U.uC.value.copy(lock ? CORAL : RUBY); U.uA.value = (lock ? 1.6 : .8) * A; });   /* 빨간 수정 (사용자 2026-11-09): 자동은 어둡고 은은한 루비 · 고정은 밝고 진한 진홍 */
        ring.visible = lock || s.mode === 'release'; if (ring.visible) { ring.position.set(p.x, .3, p.z); const U = ring.material.uniforms; U.uR.value = r * 1.7 * (1 + (1 - sm(clamp(s.k * 1.6, 0, 1))) * .6) * (1 + (s.out || 0) * .8); U.uArc.value = sm(clamp(s.k * 1.4, 0, 1)); U.uRot.value = -t * .2;
          U.uC.value.copy(CORAL).lerp(AMBER, s.ten); U.uA.value = 1.3 * A; U.uT.value = t; U.uSp.value = s.sp; U.uSeg.value = 0; U.uTick.value = 0; ring.scale.setScalar(1); } },
      shatter(p, col) { shatter(p, col, 18, 7); },
    }; })();

  /* ════ 디자인 ② 링 스코프 ════ */
  const chevFrag = 'float o = .55 - uK * .3; v += seg(p, vec2(-.55, o + .32), vec2(0., o), .05) + seg(p, vec2(.55, o + .32), vec2(0., o), .05); v += seg(p, vec2(-.4, -o - .25), vec2(0., -o), .045) * uK + seg(p, vec2(.4, -o - .25), vec2(0., -o), .045) * uK;';
  const pipFrag = 'v += seg(p, vec2(0., .5), vec2(.3, 0.), .04) + seg(p, vec2(.3, 0.), vec2(0., -.5), .04) + seg(p, vec2(0., -.5), vec2(-.3, 0.), .04) + seg(p, vec2(-.3, 0.), vec2(0., .5), .04); v += exp(-dot(p, p) * 40.) * .6;';
  const D2 = (() => { const outer = ringMesh(14), inner = ringMesh(14), chev = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bbMat(chevFrag)), 80), pip = add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bbMat(pipFrag)), 80);
    let rot = 0;
    return {
      hide() { outer.visible = inner.visible = chev.visible = pip.visible = false; },
      draw(s) { const { p, r, t } = s, lock = s.mode === 'lock', A = 1 - (s.out || 0), k = lock ? s.k : 0; rot += s.dt * (lock ? .5 : .35);
        outer.visible = true; outer.position.set(p.x, .3, p.z); let U = outer.material.uniforms;
        U.uR.value = r * (lock ? 1.75 - (1 - eob(k)) * -.5 : 2.05) * (1 + (s.out || 0) * .9) - s.fire * .15; U.uW.value = lock ? .05 : .035;
        U.uSeg.value = lock ? (k < 1 ? 2 + 0 : 4) : 2; U.uArc.value = lock ? .6 + sm(k) * .38 : .32; U.uRot.value = rot; U.uC.value.copy(lock ? CORAL.clone().lerp(AMBER, s.ten) : SILVER); U.uA.value = (lock ? 1.4 : .9) * A; U.uT.value = t; U.uSp.value = s.sp; U.uTick.value = lock ? sm(k) * .5 : 0;
        inner.visible = lock; if (lock) { inner.position.set(p.x, .31, p.z); U = inner.material.uniforms; U.uR.value = r * (1.25 - s.ten * .15); U.uW.value = .02; U.uSeg.value = 8; U.uArc.value = .35; U.uRot.value = -rot * 1.6; U.uC.value.copy(SILVER); U.uA.value = .55 * A * sm(k); U.uTick.value = 0; U.uSp.value = 0; }
        chev.visible = lock || s.mode === 'release'; pip.visible = !lock && s.mode !== 'release';
        if (chev.visible) { const drop = (1 - eob(k)) * 1.2; chev.position.set(p.x, p.y + r * .75 + .45 + drop + (s.out || 0) * 1.5, p.z); chev.scale.setScalar(.55); U = chev.material.uniforms; U.uK.value = sm(k); U.uC.value.copy(CORAL.clone().lerp(AMBER, s.ten)); U.uA.value = 1.6 * A * (s.ten > 0 ? .6 + .4 * Math.sign(Math.sin(t * 22)) : 1); U.uT.value = t; U.uSp.value = s.sp; }
        if (pip.visible) { pip.position.set(p.x, p.y + r * .75 + .55 + Math.sin(t * 2.2) * .12, p.z); pip.scale.setScalar(.32); U = pip.material.uniforms; U.uC.value.copy(SILVER); U.uA.value = 1.1; U.uT.value = t; } },
      shatter(p, col) { shatter(new THREE.Vector3(p.x, .1, p.z), col, 14, 5); },
    }; })();
  const DES = [D1, D2]; let des = 0;

  /* ════ 기본탄 (shots.js 비교표 숫자 그대로 · 조준 거리 aimR = 탄마다 다름 · 빛 칼날은 자동 조준 없음) ════ */
  const SHOTS = {
    needle:  { name: '꿰뚫는 바늘', rate: 4, dmg: 5, speed: 52, aimR: 26, heatT: 3, coolT: 2, fireSlow: .5, col: [.8, .88, 1] },
    charge:  { name: '모아 쏘기 (다 모음 26m)', rate: 1.1, dmg: 34, speed: 44, aimR: 26, heatT: 3, coolT: 2, fireSlow: .5, col: [1, .9, .6], big: 1 },
    beam:    { name: '빛줄기', rate: 9, dmg: 2.4, speed: 70, aimR: 22, heatT: 5, coolT: 2.5, fireSlow: .8, col: [.7, .95, 1.1] },
    rapid:   { name: '연발탄', rate: 4.5, dmg: 5.5, speed: 36, aimR: 20, heatT: 3, coolT: 2, fireSlow: .5, col: [.62, 1, .32] },
    bounce:  { name: '튕김탄', rate: 5, dmg: 4.2, speed: 34, aimR: 20, heatT: 3, coolT: 2, fireSlow: .5, col: [.78, 1, .96] },
    prism:   { name: '프리즘 탄', rate: 4, dmg: 6, speed: 32, aimR: 18, heatT: 3, coolT: 2, fireSlow: .5, col: [1, .97, 1] },
    homing:  { name: '유도탄', rate: 3, dmg: 8, speed: 18, aimR: 18, heatT: 3, coolT: 2, fireSlow: .5, col: [1, .55, .95], homing: 1 },
    scatter: { name: '흩뿌림', rate: 1.6, dmg: 4, speed: 22, aimR: 10, heatT: 3.5, coolT: 2.5, fireSlow: .45, col: [1, .86, .62], n: 5, ang: 26 },
    heavy:   { name: '무거운 탄', rate: 2.5, dmg: 13, speed: 22, aimR: 12, heatT: 4, coolT: 2.5, fireSlow: .6, col: [1, .55, .2], big: 1 },
    blade:   { name: '빛 칼날 (자동 조준 없음)', rate: 1.6, dmg: 20, speed: 30, aimR: 0, range: 5.6, heatT: 3, coolT: 2, fireSlow: .3, col: [.85, 1, 1.1], big: 1 },
  };
  const PRI = { dist: '거리순', pct: '체력 비율이 적은 순', hp: '순수 체력이 적은 순' };
  const cfg = { pri: 'dist', shot: 'rapid' }; try { Object.assign(cfg, JSON.parse(localStorage.getItem('tlab.cfg') || '{}')); } catch (e) {}
  const saveCfg = () => { try { localStorage.setItem('tlab.cfg', JSON.stringify(cfg)); } catch (e) {} };
  const SKILL_R = 18;

  /* ════ 화면 위 (DOM) ════ */
  const ui = document.getElementById('ui');
  const css = document.createElement('style'); css.textContent = `
  #ui{position:fixed;inset:0;pointer-events:none;font:500 12px/1.3 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;color:#eef0ff;z-index:5}
  #ui .seg{position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);display:flex;gap:2px;padding:3px;border-radius:12px;background:rgba(14,12,32,.62);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);pointer-events:auto}
  #ui .seg button{all:unset;padding:7px 12px;border-radius:9px;color:#b9bedf;cursor:pointer;white-space:nowrap}
  #ui .seg button.on{background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
  #ui .help{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(env(safe-area-inset-top,0px) + 8px);max-width:min(30vw,260px);color:#c9cdf0;opacity:.85;font-weight:400;font-size:11.5px;text-shadow:0 1px 2px #000a}
  #ui .state{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 54px);transform:translateX(-50%);padding:5px 12px;border-radius:20px;background:rgba(10,8,24,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);white-space:nowrap;transition:color .2s}
  .rb{position:absolute;border-radius:50%;pointer-events:auto;touch-action:none;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,rgba(255,255,255,.12),rgba(20,16,44,.72) 70%);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.22),0 4px 18px rgba(0,0,0,.35);color:#fff;user-select:none;-webkit-user-select:none}
  .rb svg{width:46%;height:46%;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .rb.press{transform:scale(.94)}
  #fireB{width:84px;height:84px;right:max(22px,env(safe-area-inset-right));bottom:calc(env(safe-area-inset-bottom,0px) + 22px)}
  #fireB::before{content:"";position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(var(--hc,#ff5a6a) calc(var(--h,0)*1turn),transparent 0);-webkit-mask:radial-gradient(circle,transparent 46px,#000 47px);mask:radial-gradient(circle,transparent 46px,#000 47px);opacity:var(--ho,0);transition:opacity .2s}
  #skillB{width:60px;height:60px;right:calc(max(22px,env(safe-area-inset-right)) + 100px);bottom:calc(env(safe-area-inset-bottom,0px) + 34px)}
  #setB{width:40px;height:40px;right:max(14px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top,0px) + 10px)}
  #setP{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top,0px) + 58px);width:min(300px,calc(100vw - 28px));max-height:calc(100vh - 80px);overflow:auto;padding:12px;border-radius:14px;background:rgba(14,11,30,.92);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 12px 40px rgba(0,0,0,.5);pointer-events:auto;display:none}
  #setP.on{display:block} #setP h4{margin:4px 2px 8px;font-size:12px;color:#aab0d8;font-weight:500} #setP .grp{display:grid;gap:4px;margin-bottom:12px}
  #setP button{all:unset;cursor:pointer;padding:8px 10px;border-radius:9px;color:#d8dcf6;display:flex;justify-content:space-between;gap:8px}
  #setP button.on{background:rgba(255,60,80,.16);box-shadow:inset 0 0 0 1px rgba(255,110,125,.6);color:#fff} #setP button i{font-style:normal;color:#9aa0c8;font-size:11px}
  #edge{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;display:none}
  #pad0{position:absolute;left:0;bottom:0;border:1.5px dashed rgba(185,255,74,.28);border-radius:14px;margin:6px}
  .hpb{position:absolute;width:44px;height:4px;margin-left:-22px;border-radius:3px;background:rgba(0,0,0,.55);box-shadow:0 0 0 1px rgba(255,255,255,.15);overflow:hidden;display:none}
  .hpb i{display:block;height:100%;background:#ff4d63} .hpb.m i{background:#c9a6ff}`;
  document.head.appendChild(css);
  const icon = { fire: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>', skill: '<svg viewBox="0 0 24 24"><path d="M4 20L20 4"/><path d="M14 4h6v6"/><path d="M4 14l6 6"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>' };
  ui.innerHTML = `<div class="seg"><button data-d="0" class="on">① 빨간 수정 칼날</button><button data-d="1">② 링 스코프</button></div>
    <div class="help">왼쪽 아래 칸 = 이동 · 쏘기 꾹 = 자동 조준 연사 · 쏘기 끌기 = 직접 겨눔 · 적 기체 톡 = 고정 (다시 톡 · 빈 곳 톡 = 풀기) · 스킬 톡 = 대상 자리로 · 스킬 끌기 = 직접</div>
    <div class="state" id="stt">-</div><div id="pad0"></div>
    <div class="rb" id="setB" aria-label="설정">${icon.gear}</div>
    <div id="setP"><h4>자동 조준 우선순위</h4><div class="grp" id="gPri">${Object.entries(PRI).map(([k, v]) => `<button data-k="${k}">${v}</button>`).join('')}</div>
      <h4>기본탄 (조준 거리)</h4><div class="grp" id="gShot">${Object.entries(SHOTS).map(([k, s]) => `<button data-k="${k}">${s.name}<i>${s.aimR ? s.aimR + 'm' : '-'}</i></button>`).join('')}</div></div>
    <div class="rb" id="skillB">${icon.skill}</div><div class="rb" id="fireB">${icon.fire}</div>
    <svg id="edge" viewBox="-20 -20 40 40"><circle r="15" fill="rgba(14,10,30,.6)" stroke="rgba(255,90,110,.7)" stroke-width="1.5"/><path id="edgeA" d="M-4 -6 L6 0 L-4 6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const $ = s => ui.querySelector(s), stt = $('#stt'), edge = $('#edge'), pad0 = $('#pad0'), setP = $('#setP');
  ui.querySelectorAll('.seg button').forEach(b => b.onclick = () => { des = +b.dataset.d; ui.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); DES.forEach(d => d.hide()); });
  const markCfg = () => { $('#gPri').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === cfg.pri)); $('#gShot').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === cfg.shot)); };
  $('#setB').onpointerdown = e => { e.stopPropagation(); setP.classList.toggle('on'); };
  setP.onpointerdown = e => e.stopPropagation();
  $('#gPri').onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.pri = b.dataset.k; saveCfg(); markCfg(); };
  $('#gShot').onclick = e => { const b = e.target.closest('button'); if (!b) return; cfg.shot = b.dataset.k; saveCfg(); markCfg(); T.auto = null; heat = 0; over = false; };
  markCfg();
  /* 체력 막대 (대상 위) */
  const HPB = ENT.map(e => { const d = document.createElement('div'); d.className = 'hpb' + (e.kind === 'monster' ? ' m' : ''); d.innerHTML = '<i></i>'; ui.appendChild(d); return d; });
  /* 쏘기: 꾹 = 자동 조준 연사 · 끌기 = 끈 방향 그대로 · 과열·식는 시간은 탄마다 */
  const fire = { on: false, x0: 0, y0: 0, dx: 0, dy: 0, drag: false }, fb = $('#fireB'); let heat = 0, over = false, fireCD = 0;
  fb.onpointerdown = e => { e.stopPropagation(); Object.assign(fire, { on: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, drag: false }); T.blocked = false; fb.classList.add('press'); fb.setPointerCapture(e.pointerId); };
  fb.onpointermove = e => { if (!fire.on) return; fire.dx = e.clientX - fire.x0; fire.dy = e.clientY - fire.y0; if (Math.hypot(fire.dx, fire.dy) > 16) fire.drag = true; };
  fb.onpointerup = fb.onpointercancel = () => { fire.on = false; fire.drag = false; fb.classList.remove('press'); };
  /* 스킬: 톡 = 사정거리 안 (적 플레이어 1순위 · 몬스터 2순위) 그 순간 자리로 · 끌기 = 직접 */
  const skill = { on: false, x0: 0, y0: 0, dx: 0, dy: 0, drag: false, cd: 0 }; const sb = $('#skillB');
  sb.onpointerdown = e => { e.stopPropagation(); if (skill.cd > 0) return; Object.assign(skill, { on: true, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, drag: false }); sb.classList.add('press'); sb.setPointerCapture(e.pointerId); };
  sb.onpointermove = e => { if (!skill.on) return; skill.dx = e.clientX - skill.x0; skill.dy = e.clientY - skill.y0; if (Math.hypot(skill.dx, skill.dy) > 14) skill.drag = true; };
  sb.onpointerup = sb.onpointercancel = () => { if (!skill.on) return; skill.on = false; sb.classList.remove('press'); castSkill(); };
  const rangeRing = ringMesh(60); rangeRing.visible = false; const aimLine = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, .5, .55), transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })), 56); aimLine.visible = false;

  /* ════ 대상 고르기 · 고정 규칙 ════
     자동: 쏘기를 누를 때 잡음 · 조준 거리 = 고른 기본탄의 거리 · 한 번 잡으면 죽거나 · 안 보이거나 · 거리 1.5배를 넘을 때까지 유지
           죽지 않고 풀리면 쏘기를 다시 누를 때까지 새로 안 잡음 · 고르는 순서: 플레이어가 있으면 플레이어 중에서(설정 순서) →
           몬스터만 있으면: 모두 체력 가득이면 가까운 순 · 차이가 나면 설정 순서
     고정: 적 기체를 톡 (애매하면 플레이어가 먼저 잡힘) · 다시 톡/빈 곳 톡 = 풀기 · 시야 밖·숲에 숨으면 바로 풀림 */
  const T = { lock: null, k: 0, lockT: 0, auto: null, autoK: 0, sp: 0, rel: null, relT: 0, relCause: '', blocked: false };
  const v3 = new THREE.Vector3(), alive = e => !e.dead, dOf = e => Math.hypot(e.x - FS.x, e.z - FS.z), seen = e => alive(e) && !e.hidden && dOf(e) < SIGHT;
  const byCfg = list => list.slice().sort((a, b) => cfg.pri === 'dist' ? dOf(a) - dOf(b) : cfg.pri === 'pct' ? (a.hp / a.max - b.hp / b.max) || dOf(a) - dOf(b) : (a.hp - b.hp) || dOf(a) - dOf(b))[0];
  const pickTarget = R => { const c = ENT.filter(e => seen(e) && dOf(e) <= R); if (!c.length) return null; const pl = c.filter(e => e.kind === 'player'); if (pl.length) return byCfg(pl);
    return c.every(e => e.hp >= e.max) ? c.sort((a, b) => dOf(a) - dOf(b))[0] : byCfg(c); };
  const doLock = (e, t) => { if (T.lock && T.lock !== e) release(t, '바꿈'); T.lock = e; T.auto = null; T.k = 0; T.lockT = t; T.sp = 0; };
  const release = (t, cause) => { if (!T.lock) return; T.rel = T.lock; T.relT = t; T.relCause = cause; if (cause === '시야 밖' || cause === '숲에 숨음') DES[des].shatter(T.lock.obj.position, CORAL); T.lock = null; };
  addEventListener('pointerdown', e => { if (e.target.closest && (e.target.closest('.rb') || e.target.closest('.seg') || e.target.closest('#setP'))) return; if (padZone(e.clientX, e.clientY)) return;
    setP.classList.remove('on');
    const W = innerWidth, H = innerHeight, near = []; for (const e2 of ENT) { if (!alive(e2)) continue; v3.set(e2.obj.position.x, e2.obj.position.y, e2.obj.position.z).project(camera); if (v3.z > 1) continue;
      const d = Math.hypot((v3.x * .5 + .5) * W - e.clientX, (-v3.y * .5 + .5) * H - e.clientY); if (d < 64) near.push([d, e2]); }
    near.sort((a, b) => a[0] - b[0]); const pl = near.find(n => n[1].kind === 'player'), hit = pl ? pl[1] : near.length ? near[0][1] : null;   /* 애매하면 플레이어 먼저 */
    const t = clock.elapsedTime; tapFx(e.clientX, e.clientY, !!hit);
    if (hit) { if (hit === T.lock) release(t, '풀기'); else if (seen(hit)) doLock(hit, t); else flashState('시야 밖이라 고정할 수 없어요'); } else if (T.lock) release(t, '풀기'); });
  const tapFx = (x, y, hit) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:12px;height:12px;margin:-6px;border-radius:50%;pointer-events:none;z-index:6;box-shadow:0 0 0 1.5px ${hit ? 'rgba(255,90,110,.95)' : 'rgba(255,255,255,.6)'};transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .35s`; document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'scale(4)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 400); };
  let msg = '', msgT = -9; const flashState = m => { msg = m; msgT = clock.elapsedTime; };

  /* ════ 탄 · 스킬 ════ */
  const BOLTS = []; const boltGeo = new THREE.CapsuleGeometry(.07, .7, 3, 6).rotateX(Math.PI / 2); const boltMs = {};
  const boltMat = (key, col, k) => boltMs[key] || (boltMs[key] = new THREE.MeshBasicMaterial({ color: new THREE.Color(col[0] * k, col[1] * k, col[2] * k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shootDir = (dir, S, tg, big) => { const o = new THREE.Vector3(FS.x + dir.x * 1.1, FLY.HOVER + .1, FS.z + dir.z * 1.1), n = S.n || 1, range = S.range || S.aimR;
    for (let i = 0; i < n; i++) { const a = n > 1 ? (i / (n - 1) - .5) * S.ang * Math.PI / 180 : 0, d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      const m = add(new THREE.Mesh(boltGeo, boltMat(cfg.shot + (big ? 'B' : ''), big ? [2.2, .5, .6] : S.col, big ? 1 : 2)), 58); if (big || S.big) m.scale.set(2.4, 2.4, 1.6); m.position.copy(o);
      BOLTS.push({ m, v: d.multiplyScalar(big ? 34 : S.speed), tg: S.homing ? tg : null, life: (big ? SKILL_R : range) / (big ? 34 : S.speed), dmg: big ? 45 : S.dmg }); } FS.rc = 1; };
  const dirTo = (x, z) => { const d = new THREE.Vector3(x - FS.x, 0, z - FS.z); return d.lengthSq() > 1e-4 ? d.normalize() : new THREE.Vector3(Math.sin(FS.head), 0, Math.cos(FS.head)); };
  const castSkill = () => { rangeRing.visible = aimLine.visible = false; let dir, tg = null;
    if (skill.drag) dir = dirTo(FS.x + skill.dx, FS.z + skill.dy);
    else { tg = T.lock && seen(T.lock) && dOf(T.lock) <= SKILL_R ? T.lock : (() => { const c = ENT.filter(e => seen(e) && dOf(e) <= SKILL_R); const pl = c.filter(e => e.kind === 'player'); return (pl.length ? pl : c).sort((a, b) => dOf(a) - dOf(b))[0] || null; })();
      dir = tg ? dirTo(tg.x, tg.z) : dirTo(FS.x + Math.sin(FS.head), FS.z + Math.cos(FS.head)); }   /* 누른 순간 적이 있던 자리로 (앞을 내다보지 않음) */
    skill.cd = 1.2; shootDir(dir, SHOTS[cfg.shot], null, true); flashState(skill.drag ? '스킬: 직접 조준' : tg ? '스킬: ' + tg.name + ' 자리로' : '스킬: 앞으로'); };

  /* ════ 적 움직임 ════ */
  const wander = (e, t) => { if (e.dead) { if (t > e.dead) { e.dead = 0; e.hp = e.max; e.obj.visible = true; const a = R() * TAU; e.x = Math.cos(a) * 20; e.z = Math.sin(a) * 20; } return; }
    if (!e.wp || t > e.until) { const r = R();
      if (e.kind === 'player' && r < .28) { e.mode = 'hide'; e.wp = [BUSH.x + (R() - .5) * 3, BUSH.z + (R() - .5) * 3]; e.until = t + 7; }   /* 숲으로 숨으러 감 */
      else if (e.kind === 'player' && r < .5) { const a = Math.atan2(e.z - FS.z, e.x - FS.x) + (R() - .5); e.mode = 'flee'; e.wp = [FS.x + Math.cos(a) * 42, FS.z + Math.sin(a) * 42]; e.until = t + 6; }   /* 멀리 도망 (시야 밖) */
      else { const a = R() * TAU, rr = 6 + R() * 20; e.mode = 'roam'; e.wp = [Math.cos(a) * rr, Math.sin(a) * rr]; e.until = t + 5 + R() * 4; } }
    const dx = e.wp[0] - e.x, dz = e.wp[1] - e.z, d = Math.hypot(dx, dz), sp = e.kind === 'player' ? (e.mode === 'flee' ? 11 : 7) : 1.6;
    if (d > .3) { e.x += dx / d * Math.min(d, sp * dtG); e.z += dz / d * Math.min(d, sp * dtG); e.h += (Math.atan2(dx, dz) - e.h + Math.PI * 3) % TAU - Math.PI; }
    e.hidden = Math.hypot(e.x - BUSH.x, e.z - BUSH.z) < BUSH.r - .5; };
  /* 적 기체와 몬스터는 서로 밀어내 겹치지 않음 (누르기 애매한 자리를 처음부터 줄임) */
  const separate = () => { for (const a of ENT) for (const b of ENT) { if (a.kind !== 'player' || b.kind !== 'monster' || a.dead || b.dead) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || .01, need = a.r + b.r + .8;
      if (d < need) { const p = (need - d) / 2, ux = dx / d, uz = dz / d; a.x -= ux * p; a.z -= uz * p; b.x += ux * p; b.z += uz * p; } } };
  let dtG = 0;
  ENT.forEach((e, i) => { e.max = e.kind === 'player' ? 100 : [60, 100, 140][i % 3]; e.hp = e.max; });   /* 몬스터 최대 체력을 다르게 → 비율·순수 체력 순서가 갈라짐 */

  /* ════ 그리기 ════ */
  const clock = new THREE.Clock(); let W = 1, H = 1;
  const size = () => { W = innerWidth; H = innerHeight; const pr = renderer.getPixelRatio(); renderer.setSize(W, H, false); bloom.size(Math.round(W * pr), Math.round(H * pr)); camera.aspect = W / H; camera.updateProjectionMatrix();
    pad0.style.width = `calc(${PADZ.w * 100}% - 12px)`; pad0.style.height = `calc(${PADZ.h * 100}% - 12px)`; };
  addEventListener('resize', size); size();
  const loop = () => { requestAnimationFrame(loop); const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime; dtG = dt; const S = SHOTS[cfg.shot], AR = S.aimR;
    FS.fireSlow = S.fireSlow; FS.aimK = (FS.aimK || 0) + ((fire.on && !over ? 1 : 0) - (FS.aimK || 0)) * Math.min(1, dt * 10);   /* 쏘는 동안 느려짐 (탄마다) */
    fly.userData.update(t, dt);
    for (const e of ENT) wander(e, t); separate();
    ENT.forEach((e, i) => { e.flash = Math.max(0, e.flash - dt * 4);
      if (e.kind === 'player') { e.obj.position.set(e.x, e.y + Math.sin(t * 2 + e.x) * .08, e.z); e.obj.rotation.set(0, e.h, Math.sin(t * 1.3) * .1); }
      else { e.obj.position.set(e.x, e.y + Math.sin(t * .9 + e.ph) * .35, e.z); const pulse = Math.sin(t * 2.2 + e.ph); e.bell.scale.set(1 + pulse * .07, 1 - pulse * .12, 1 + pulse * .07); e.bellM.uniforms.uF.value = e.flash;
        for (const L of e.lines) { for (let j = 0; j < 18; j++) { const f = j / 17, rr = e.rr * .7 * (1 - f * .4); L.arr[j * 3] = Math.cos(L.a) * rr + Math.sin(t * 1.6 + f * 5 + L.a) * f * e.rr * .5; L.arr[j * 3 + 1] = -f * L.len; L.arr[j * 3 + 2] = Math.sin(L.a) * rr + Math.cos(t * 1.3 + f * 4 + L.a) * f * e.rr * .5; } L.geo.attributes.position.needsUpdate = true; } }
      const hb = HPB[i]; if (seen(e)) { v3.set(e.obj.position.x, e.obj.position.y + e.r + .5, e.obj.position.z).project(camera); if (v3.z < 1 && Math.abs(v3.x) < 1 && Math.abs(v3.y) < 1) { hb.style.display = 'block'; hb.style.left = ((v3.x * .5 + .5) * W) + 'px'; hb.style.top = ((-v3.y * .5 + .5) * H) + 'px'; hb.firstChild.style.width = (e.hp / e.max * 100) + '%'; hb.style.width = (44 * e.max / 100) + 'px'; hb.style.marginLeft = (-22 * e.max / 100) + 'px'; } else hb.style.display = 'none'; } else hb.style.display = 'none'; });
    /* 대상 판단 */
    let label = '';
    if (T.lock) { const e = T.lock; T.k = Math.min(1, (t - T.lockT) / .32); T.sp = Math.sin(Math.PI * clamp((t - T.lockT - .12) / .6, 0, 1));
      if (!alive(e)) release(t, '처치'); else if (!seen(e)) { const c = e.hidden ? '숲에 숨음' : '시야 밖'; release(t, c); flashState(`${c} · 고정 풀림`); } }
    if (!T.lock && AR > 0) { const prev = T.auto;
      if (T.auto) { const e = T.auto; if (!alive(e)) T.auto = fire.on ? pickTarget(AR) : null;
        else if (!seen(e) || dOf(e) > AR * 1.5) { T.auto = null; T.blocked = true; flashState('대상이 풀렸어요 · 쏘기를 다시 누르면 새로 잡아요'); } }
      if (!T.auto && fire.on && !fire.drag && !T.blocked) T.auto = pickTarget(AR);
      if (T.auto && T.auto.kind === 'monster') { const pl = ENT.filter(e => e.kind === 'player' && seen(e) && dOf(e) <= AR); if (pl.length) { T.auto = byCfg(pl); flashState('적 기체 등장 · 대상을 넘김'); } }   /* 몬스터를 노리다 적 플레이어가 사거리에 들어오면 바로 넘어감 (사용자 2026-11-09 '나') · 플레이어끼리는 유지 */
      if (T.auto !== prev) T.autoK = 0; } else if (AR <= 0) T.auto = null;
    T.autoK = Math.min(1, T.autoK + dt * 4);
    label = T.lock ? `고정 · ${T.lock.name}` : T.auto ? `자동 조준 · ${T.auto.name}` : AR > 0 ? `쏘기를 누르면 ${AR}m 안에서 자동 조준` : '빛 칼날: 자동 조준 없음 (앞쪽만 벰)';
    if (t - msgT < 1.6) label = msg; if (stt.textContent !== label) stt.textContent = label; stt.style.color = T.lock ? '#ff8a98' : '#eef0ff';
    /* 표시 */
    const D = DES[des]; D.hide();
    const nose = new THREE.Vector3(FS.x + Math.sin(FS.head) * 1, FLY.HOVER + .1, FS.z + Math.cos(FS.head) * 1);
    const pOf = e => ({ x: e.obj.position.x, y: e.obj.position.y, z: e.obj.position.z });
    tether.visible = false;
    if (T.lock) { const e = T.lock;
      D.draw({ mode: 'lock', p: pOf(e), r: e.r, t, dt, k: T.k, fire: fire.on && !over ? Math.max(0, Math.sin(t * 34)) * .3 : 0, ten: 0, sp: T.sp });
      tether.visible = true; const tp = e.obj.position, L = nose.distanceTo(tp), wid = .18;
      const cv = new THREE.Vector3().subVectors(camera.position, nose).normalize(), sd = new THREE.Vector3().subVectors(tp, nose).cross(cv).normalize();
      for (let i = 0; i <= TN; i++) { const u = i / TN, grow = clamp(T.k * 1.4, 0, 1); if (u > grow) { tPos.fill(0, i * 6); break; } const bow = Math.sin(u * Math.PI) * (.6 + L * .03);
        const x = nose.x + (tp.x - nose.x) * u, y = nose.y + (tp.y - nose.y) * u + bow, z = nose.z + (tp.z - nose.z) * u;
        tPos.set([x - sd.x * wid, y - sd.y * wid, z - sd.z * wid, x + sd.x * wid, y + sd.y * wid, z + sd.z * wid], i * 6); }
      tGeo.attributes.position.needsUpdate = true; const TU = tetherMat.uniforms; TU.uT.value = t; TU.uTen.value = 0; TU.uA.value = .9; TU.uCut.value = -1; TU.uDash.value = des === 1 ? 1 : 0; TU.uC.value.copy(CORAL); }
    else if (T.rel && t - T.relT < .45) { const e = T.rel, out = (t - T.relT) / .45; D.draw({ mode: 'release', p: pOf(e), r: e.r, t, dt, k: 1, fire: 0, ten: 0, sp: 0, out: sm(out) }); }
    else if (T.auto) { const e = T.auto; D.draw({ mode: 'auto', p: pOf(e), r: e.r, t, dt, k: T.autoK, fire: fireCD > 1 / S.rate - .08 ? 1 : 0, ten: 0, sp: 0 }); }
    /* 화면 밖 화살표: 고정 대상이 시야 안이지만 화면 밖일 때 */
    edge.style.display = 'none';
    if (T.lock) { v3.copy(T.lock.obj.position).project(camera); const on = v3.z < 1 && Math.abs(v3.x) < .96 && Math.abs(v3.y) < .94;
      if (!on) { let x = v3.x, y = v3.y; if (v3.z > 1) { x = -x; y = -y; } const a = Math.atan2(-y, x), m = Math.max(Math.abs(x) / .9, Math.abs(y) / .86); x /= m; y /= m;
        edge.style.display = 'block'; edge.style.left = ((x * .5 + .5) * W) + 'px'; edge.style.top = ((-y * .5 + .5) * H) + 'px'; $('#edgeA').setAttribute('transform', `rotate(${a * 180 / Math.PI})`); } }
    /* 쏘기 · 과열 */
    fireCD -= dt; skill.cd = Math.max(0, skill.cd - dt);
    if (fire.on && !over) { heat += dt / S.heatT; if (heat >= 1) { heat = 1; over = true; flashState('과열 · 식는 중'); } } else { heat -= dt / S.coolT; if (heat <= 0) { heat = 0; over = false; } }
    fb.style.setProperty('--h', heat.toFixed(3)); fb.style.setProperty('--ho', heat > .01 ? '1' : '0'); fb.style.setProperty('--hc', over ? '#ff9a3a' : '#ff5a6a');
    if (fire.on && !over && fireCD <= 0) { const tg = T.lock || T.auto; let dir;
      if (fire.drag) dir = dirTo(FS.x + fire.dx, FS.z + fire.dy); else if (tg && AR > 0) dir = dirTo(tg.obj.position.x, tg.obj.position.z); else dir = dirTo(FS.x + Math.sin(FS.head), FS.z + Math.cos(FS.head));
      shootDir(dir, S, tg, false); fireCD = 1 / S.rate; }
    for (let i = BOLTS.length - 1; i >= 0; i--) { const b = BOLTS[i]; b.life -= dt; if (b.tg && alive(b.tg)) { const want = new THREE.Vector3().subVectors(b.tg.obj.position, b.m.position); const sp = b.v.length(); b.v.lerp(want.normalize().multiplyScalar(sp), Math.min(1, dt * 4.2)); }
      b.m.position.addScaledVector(b.v, dt); b.m.lookAt(b.m.position.clone().add(b.v));
      let hit = null; for (const e of ENT) if (alive(e) && b.m.position.distanceTo(e.obj.position) < e.r + .3) { hit = e; break; }
      if (hit) { hit.hp -= b.dmg; hit.flash = 1; shatter(b.m.position, b.dmg > 20 ? CORAL : SILVER, b.dmg > 20 ? 10 : 3, b.dmg > 20 ? 6 : 3); if (hit.hp <= 0) { hit.dead = t + 3; hit.obj.visible = false; shatter(hit.obj.position, CORAL, 20, 8); } }
      if (hit || b.life <= 0) { scene.remove(b.m); BOLTS.splice(i, 1); } }
    for (const s of SH) if (s.life > 0) { s.life -= dt; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += s.w.x * dt; s.m.rotation.y += s.w.y * dt; s.m.material.opacity = clamp(s.life * 1.6, 0, 1); if (s.life <= 0) s.m.visible = false; }
    /* 사거리 원: 쏘기(기본탄 조준 거리) · 스킬(사정거리) 누르는 동안 */
    const rr = skill.on ? SKILL_R : fire.on ? (AR || S.range) : 0; rangeRing.visible = rr > 0; aimLine.visible = false;
    if (rangeRing.visible) { rangeRing.position.set(FS.x, .05, FS.z); const U = rangeRing.material.uniforms; U.uR.value = rr; U.uW.value = .07; U.uSeg.value = 0; U.uArc.value = 1; U.uC.value.copy(over ? AMBER : RUBY); U.uA.value = .5; U.uT.value = t; U.uTick.value = 0; U.uSp.value = 0;
      const dg = skill.on ? skill : fire; if (dg.drag) { const a = Math.atan2(dg.dx, dg.dy), L = rr; aimLine.visible = true; aimLine.scale.set(.4, 1, L); aimLine.position.set(FS.x + Math.sin(a) * L / 2, .06, FS.z + Math.cos(a) * L / 2); aimLine.rotation.y = a; } }
    /* 카메라: 게임처럼 비스듬히 내려다봄 */
    const ca = 50 * Math.PI / 180, cd = 24; camera.position.set(FS.x, FLY.HOVER + cd * Math.sin(ca), FS.z + cd * Math.cos(ca)); camera.lookAt(FS.x, FLY.HOVER, FS.z);
    sight.position.set(FS.x, FLY.HOVER - .2, FS.z); sightU.uT.value = t; seaU.uT.value = t;
    renderer.setRenderTarget(bloom.scene); renderer.setClearColor(0x120e26, 1); renderer.clear(); renderer.render(scene, camera); bloom.render(Math.round(W * renderer.getPixelRatio()), Math.round(H * renderer.getPixelRatio()), false); };
  window.__tl = { ENT, camera, T, FS, fly, cfg, fire, doLock: e => doLock(e, clock.elapsedTime) };
  onProgress(1); loop();
}
