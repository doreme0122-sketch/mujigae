/* 와드 부품 ① 받침 — 사용자 참고 그림의 맨 아래 (고대 돌 받침)
   층 (아래 → 위)
   · 바닥 단: 낮은 팔각 돌 단 (땅에 박힌 기초)
   · 장갑 돌 여덟: 둘레를 감싼 큰 돌덩이. 바깥쪽은 비스듬히 깎여 내려가고 모서리는 닳아 둥긂.
     앞(정면)·뒤·양옆 넷은 크고, 대각선 넷은 한 단 낮고 작음. 돌과 돌 사이 틈 아래로 푸른 빛이 새어 나옴(속에서 힘이 흐름)
   · 정면 돌: 주황 거꾸로 세모 표식이 새겨져 빛남 (와드의 얼굴 — 어느 쪽이 앞인지)
   · 가운데 북: 팔각 돌 북 + 둘레 버팀 돌기둥 여덟. 기둥마다 세로 홈에 푸른 빛 막대 (힘이 위로 올라가는 길)
   · 맨 위 고리 자리: 유리 기둥이 꽂힐 둥근 돌 테 + 안쪽 빛 테 (다음 부품이 앉을 자리)
   · 문양 돌판 둘: 양옆에 비스듬히 기대 선 돌판, 앞면에 네모 소용돌이 문양이 푸르게 빛남
   빛 색은 와드 주인 색을 따라감(빈 와드 = 푸른 빛). 이끼·풀은 뺌(우주).
   단위 m. 받침 높이 약 1.3m, 지름 약 4.4m. 돌은 한 재질, 빛은 한 재질 → 그리는 횟수 적게 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ruinMaterial } from './ruins.js?v=11052035';

const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const clean = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };

/* 모서리가 둥글게 닳은 돌 상자 (w 가로 · h 높이 · d 깊이), 밑면 가운데가 원점 */
function block(w, h, d, b = .05) {
  const s = new THREE.Shape(), x = w / 2 - b, y = h - 2 * b;
  s.moveTo(-x, 0); s.lineTo(x, 0); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
  g.translate(0, b, -(d - 2 * b) / 2); return g;
}
/* 위에서 본 모양(부채꼴 돌)을 위로 올린 돌덩이. 바깥쪽 윗면은 비스듬히 깎임 */
function wedge(r0, r1, a0, a1, h, slope, b = .06) {
  const s = new THREE.Shape(), n = 6;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; i ? s.lineTo(Math.cos(a) * r1, -Math.sin(a) * r1) : s.moveTo(Math.cos(a) * r1, -Math.sin(a) * r1); }   /* 위로 세울 때 y → -z 가 되므로 미리 뒤집어 둠 (각도 a = 세상 x·z 방향 그대로) */
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; s.lineTo(Math.cos(a) * r0, -Math.sin(a) * r0); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, b, 0);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z);       /* 바깥쪽으로 갈수록 윗면을 깎아 비탈 */
    if (y > h * .45) { const k = Math.min(1, Math.max(0, (r - (r0 + (r1 - r0) * .35)) / ((r1 - r0) * .65))); P.setY(i, y - slope * k * k * ((y - h * .45) / (h * .55))); } }
  g.computeVertexNormals(); return g;
}
/* 돌: 오래된 회색 돌(살짝 누런 기). 결 · 얼룩 · 금 간 자리 · 모서리가 닳아 밝음 · 아래쪽은 그을려 어두움 */
/* 돌 덩어리 다듬기: 넓이 없는 삼각형(가운데 한 점에 모인 면, 깎은 모서리의 접힌 면)을 빼고, 방향 없는 면 방향을 그 면의 실제 방향으로 채움
   — 방향 없는 면은 폰 그래픽에서 빛 계산이 '숫자 아님'이 되어 번짐 단계에서 커다란 하얀/검은 얼룩으로 번졌음 (사용자 영상 2026-11-03) */
export function solid(g) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, keep = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3();
  for (let t = 0; t < P.length; t += 9) { a.fromArray(P, t); b.fromArray(P, t + 3); c.fromArray(P, t + 6); f.subVectors(c, b).cross(a.clone().sub(b));
    const L = f.length(); if (L < 1e-9) continue; f.divideScalar(L);
    for (let v = 0; v < 3; v++) { const o = t + v * 3, l = Math.hypot(N[o], N[o + 1], N[o + 2]); if (l > .5 && isFinite(l)) keep.push(P[o], P[o + 1], P[o + 2], N[o] / l, N[o + 1] / l, N[o + 2] / l); else keep.push(P[o], P[o + 1], P[o + 2], f.x, f.y, f.z); } }
  const pos = [], nor = []; for (let i = 0; i < keep.length; i += 6) { pos.push(keep[i], keep[i + 1], keep[i + 2]); nor.push(keep[i + 3], keep[i + 4], keep[i + 5]); }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return o;
}
export function stoneMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x5e5a54, roughness: .86, metalness: .03, envMapIntensity: .5 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = 'varying vec3 vSw; varying vec3 vSn;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vSw = (modelMatrix * vec4(transformed, 1.)).xyz; vSn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `varying vec3 vSw; varying vec3 vSn;
      float sh1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float sn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(sh1(i), sh1(i + vec3(1,0,0)), f.x), mix(sh1(i + vec3(0,1,0)), sh1(i + vec3(1,1,0)), f.x), f.y), mix(mix(sh1(i + vec3(0,0,1)), sh1(i + vec3(1,0,1)), f.x), mix(sh1(i + vec3(0,1,1)), sh1(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float sf(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += sn(p) * a; p *= 2.07; a *= .5; } return s; }
      float crackV(vec3 p){ vec3 i = floor(p), f = fract(p); float d1 = 9., d2 = 9.;                               /* 돌 금: 칸 경계 */
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 o = vec3(x, y, z), q = o + vec3(sh1(i + o), sh1(i + o + 3.1), sh1(i + o + 7.7)) - f; float d = dot(q, q); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return sqrt(d2) - sqrt(d1); }\n` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { float big = sf(vSw * .9), fine = sf(vSw * 6.5), grain = sn(vSw * 38.);
          vec3 tint = mix(vec3(.82, .8, .76), vec3(1.04, .99, .9), big);                                           /* 돌마다 조금씩 다른 누런 기 */
          float cr = crackV(vSw * 2.2 + big), crack = smoothstep(.07, .0, cr) * smoothstep(.35, .6, sf(vSw * 1.7 + 4.));
          float up = clamp(vSn.y, 0., 1.);
          float soot = smoothstep(.5, 0., vSw.y) * .35;                                                             /* 땅에 닿은 아래쪽은 그을림 */
          diffuseColor.rgb *= tint * (.78 + fine * .32 + grain * .08) * (1. - crack * .55) * (1. - soot) * (.92 + up * .12); }`); };
  m.customProgramCacheKey = () => 'ward-stone';
  return m;
}
/* 은빛 금속 + 건담식 판 선 (사용자: 아래 받침은 실버 메탈, 건담 무늬)
   · 판마다 크기가 다른 네모 판으로 나뉘고, 판 사이는 가늘게 파인 어두운 홈(판 선)
   · 판 일부엔 안쪽에 한 번 더 네모 선 · 짧은 꺾인 선 · 작은 볼트 점 (기계 장갑판 느낌)
   · 판마다 은빛이 조금씩 다름(따로 찍어 낸 판), 홈 둘레는 살짝 어두움 */
export function metalMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xc3c7cf, metalness: .82, roughness: .34, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: 1.15 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = 'varying vec3 vMw; varying vec3 vMn;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vMw = (modelMatrix * vec4(transformed, 1.)).xyz; vMn = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `varying vec3 vMw; varying vec3 vMn;
      float mh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      /* 판 나누기: 큰 칸 → 칸마다 가로/세로로 한 번 더 나눔 → 홈까지 거리 · 판 번호 */
      vec3 panel(vec2 p){ vec2 c = floor(p / vec2(.62, .44)), f = fract(p / vec2(.62, .44)); float h = mh(c), id = h;
        if (h < .45) { float s = .3 + .4 * mh(c + 3.1); if (f.x < s) { f.x /= s; id += .13; } else { f.x = (f.x - s) / (1. - s); id += .27; } }
        else if (h < .8) { float s = .35 + .3 * mh(c + 5.7); if (f.y < s) { f.y /= s; id += .41; } else { f.y = (f.y - s) / (1. - s); id += .53; } }
        vec2 e = min(f, 1. - f) * vec2(.62, .44); float d = min(e.x, e.y); return vec3(d, id, mh(c + id * 7.)); }
      float lines(vec2 p, out float tone, out float riv){ vec3 P = panel(p); tone = fract(P.y * 3.7);
        float g = smoothstep(.012, .004, P.x);                                                         /* 판 사이 홈 */
        vec2 c = floor(p / vec2(.62, .44)), f = fract(p / vec2(.62, .44));
        float inner = 0.; if (P.z > .55) { vec2 q = abs(f - .5) * vec2(.62, .44); float b = max(q.x - .2, q.y - .12); inner = smoothstep(.006, .002, abs(b)) * .8; }   /* 안쪽 네모 선 */
        float kink = 0.; if (P.z < .25) { vec2 q = f * vec2(.62, .44); kink = smoothstep(.005, .002, abs(q.y - .1)) * step(.08, q.x) * step(q.x, .3) + smoothstep(.005, .002, abs(q.x - .3)) * step(.1, q.y) * step(q.y, .22); }   /* 짧은 꺾인 선 */
        vec2 rq = (f - vec2(.06, .08)) * vec2(.62, .44); riv = smoothstep(.016, .01, length(rq)) * step(.4, P.z);                                   /* 볼트 점 */
        return max(g, max(inner, kink * .8)); }\n` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float mRough = 0.;
        { vec3 an = abs(vMn); vec2 uv = an.y > .65 ? vMw.xz : (an.x > an.z ? vMw.zy : vMw.xy); uv += vec2(3.7, 1.3);
          float tone, riv; float L = lines(uv, tone, riv);
          vec3 base = mix(vec3(.84, .86, .9), vec3(1.02, 1.03, 1.06), tone);                                      /* 판마다 다른 은빛 */
          float grime = smoothstep(.5, 0., vMw.y) * .18;
          diffuseColor.rgb *= base * (1. - L * .78) * (1. - grime) * (1. - riv * .35);
          mRough = L * .35 + riv * .1; }`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor + mRough, 0., 1.);'); };
  m.customProgramCacheKey = () => 'ward-metal-panel';
  return m;
}
/* 빛 (틈·홈·테): 속에서 흐르는 힘. aK = 흐름 위치(아래 0 → 위 1) */
export function glowMaterial() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: new THREE.Vector3(.35, .85, 1) }, uI: { value: 1 }, uT: { value: 0 }, uFlow: { value: .4 }, uProg: { value: -1 }, uPCol: { value: new THREE.Vector3(1, 1, 1) }, uECol: { value: new THREE.Vector3(.35, .85, 1) }, uRise: { value: -9 }, uRiseI: { value: 0 }, uRun: { value: -1 } },
    vertexShader: 'attribute float aK, aA; varying float vK, vA, vY; varying vec2 vU; void main(){ vK = aK; vA = aA; vU = uv; vY = (modelMatrix * vec4(position, 1.)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uCol, uPCol, uECol; uniform float uI, uT, uFlow, uProg, uRise, uRiseI, uRun; varying float vK, vA, vY; varying vec2 vU;
      void main(){ float w = fract(vK * 3. - uT * uFlow); float pulse = .75 + .45 * exp(-(w - .5) * (w - .5) * 30.);
        float edge = 1. - abs(vU.y * 2. - 1.); float core = edge * edge;
        vec3 col = uCol, c;
        if (vA > 0. && uProg >= 0.) {                                                          /* 차지 고리: 차지한 만큼 그 사람 색으로 둘레를 따라 채워짐, 채움 끝이 하얗게 달림 */
          float done = smoothstep(.86, 1., uProg), lit = max(smoothstep(uProg + .06, uProg - .12, vA) * mix(smoothstep(0., .1, vA), 1., done) * smoothstep(0., .04, uProg), done * done); col = mix(uECol, uPCol, lit);   /* 차오르지 않은 쪽은 빈 와드 색 그대로 → 남은 만큼이 끝까지 보임 */
          float bk = uProg - vA, glowH = (bk > 0. ? exp(-bk * 9.) : exp(-bk * bk * 220.)) * smoothstep(0., .1, vA);   /* 시작점에서 잘리지 않게 */                     /* 채움 끝: 하얀 막대 대신 뒤로 길게 끌리는 부드러운 빛 (날카로운 단면이 안 보이게 · 사용자) */
          c = (col * col * 1.4 + vec3(.14) * core) * (.25 + core * .9) * mix(.2, 1.05, lit) + uPCol * uPCol * 1.3 * glowH * (.35 + core * .8) * step(.001, uProg) * (1. - done); }   /* 다 차 갈수록 끝 빛·시작점이 녹아 이음매 없이 한 바퀴로 닫힘 (사용자: 100% 즈음 경계선) */
        else c = (col * col * 1.2 + vec3(.12) * core) * (.4 + core * .9) * pulse;   /* 하얀 심을 줄임: 밝아져도 하얗게 날이 서지 않게 */
        if (vA > 0. && uRun >= 0.) { float rd = fract(vA - uRun + .5) - .5; rd *= rd < 0. ? 5. : 16.; c += (uPCol * uPCol * 1.1 + .35) * exp(-rd * rd) * (.4 + core * .8); }   /* 원이 닫히는 순간 한 바퀴 달리는 빛: 칼 같은 하얀 선 대신 뒤로 끌리는 부드러운 빛 */   /* 원이 닫히는 순간: 하얀 빛이 원을 따라 한 바퀴 달림 */
        float rh = (vY - uRise) / .14, rise = smoothstep(uRise + .02, uRise - .3, vY) * uRiseI;     /* 순간 이동: 땅 고리에서 탑 위로 빛이 차오름 */
        c += (uCol * uCol * 2.2 + .5) * rise * (1. + core) + vec3(2.) * exp(-rh * rh) * uRiseI * (.5 + core);
        gl_FragColor = vec4(c * uI, 1.); }` });
}
/* 빛 띠 조각: 네모 판 (u 가로 · v 세로) + 흐름 값 */
function glowQuad(list, A, B, C, D, k0, k1, a0 = 0, a1 = 0) {          /* A B 아래, C D 위 · a = 차지 고리 둘레 위치(0 = 아님) */
  list.push({ p: [...A, ...B, ...C, ...A, ...C, ...D], uv: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], k: [k0, k0, k1, k0, k1, k1], a: [a0, a1, a1, a0, a1, a0] });
}
function glowGeo(list) { const p = [], uv = [], k = [], aa = []; for (const q of list) { p.push(...q.p); uv.push(...q.uv); k.push(...q.k); aa.push(...(q.a || [0, 0, 0, 0, 0, 0])); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aK', new THREE.Float32BufferAttribute(k, 1)); g.setAttribute('aA', new THREE.Float32BufferAttribute(aa, 1)); return g; }

/* 문양 돌판 앞면 그림: 네모 소용돌이 · 꺾쇠 · 대괄호 (그림의 "回 · 己" 같은 각진 고대 문양) */
function runeTex(seed) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'square'; g.lineJoin = 'miter';
  g.shadowColor = '#fff'; g.shadowBlur = 6;
  const spiral = (x, y, s, dir) => { g.beginPath(); let px = x, py = y, L = s; g.moveTo(px, py); const d = [[1, 0], [0, 1], [-1, 0], [0, -1]]; for (let i = 0; i < 6; i++) { const [dx, dy] = d[(i * dir + 4) % 4]; px += dx * L; py += dy * L; g.lineTo(px, py); if (i % 2) L -= s * .28; } g.stroke(); };
  const rows = [[24, 30], [24, 108], [24, 186]];
  rows.forEach(([x, y], i) => { const k = Math.floor(R() * 3);
    if (k === 0) spiral(x, y, 78, 1);
    else if (k === 1) { g.beginPath(); g.moveTo(x + 78, y); g.lineTo(x, y); g.lineTo(x, y + 30); g.lineTo(x + 54, y + 30); g.lineTo(x + 54, y + 60); g.lineTo(x, y + 60); g.stroke(); g.strokeRect(x + 66, y + 42, 12, 12); }
    else { g.strokeRect(x, y, 78, 58); g.beginPath(); g.moveTo(x + 18, y + 18); g.lineTo(x + 60, y + 18); g.lineTo(x + 60, y + 40); g.lineTo(x + 36, y + 40); g.stroke(); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
const runeMat = tex => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uMap: { value: tex }, uCol: { value: new THREE.Vector3(.35, .85, 1) }, uI: { value: 1 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D uMap; uniform vec3 uCol; uniform float uI, uT; varying vec2 vU;
    void main(){ float v = texture2D(uMap, vU).r; float flick = .85 + .15 * sin(uT * 2.1 + vU.y * 6.);
      gl_FragColor = vec4((uCol * uCol * 1.4 + vec3(.3) * v * v) * v * flick * uI, 1.); }` });

export function makeWardBase(uT) {
  const G = new THREE.Group(), stone = [], glow = [];
  const TAU = Math.PI * 2, R = rng(7), FR = Math.PI / 2;                    /* FR: 정면 = +z */
  const at = (c, r, y) => [Math.cos(c) * r, y, Math.sin(c) * r];
  /* 바닥 단 */
  stone.push(wedge(0, 1.98, -Math.PI / 8, TAU - Math.PI / 8, .16, .04, .04));
  /* 장갑 돌 여덟: 높고 두꺼운 요새 돌. 큰 돌(앞·옆·뒤) / 작은 돌(대각선, 한 단 낮음) · 사이 틈으로 푸른 빛 */
  const gap = .07;
  for (let k = 0; k < 8; k++) { const big = k % 2 === 0, c = FR + k * TAU / 8, hw = TAU / 16 - gap / 1.9;
    const r0 = .92, r1 = big ? 1.9 : 1.72, h = big ? .92 : .7;
    const g = wedge(r0, r1, c - hw, c + hw, h, big ? .42 : .3); g.translate(0, .14, 0); stone.push(g);
    if (big) { const cap = wedge(r0 + .06, r0 + .5, c - hw * .7, c + hw * .7, .22, .05, .04); cap.translate(0, .14 + h - .04, 0); stone.push(cap);   /* 윗면 덧돌 */
      const pf = new THREE.Group(); pf.position.set(...at(c, r1 + .04, .15)); pf.rotation.y = FR - c; pf.rotateX(-.26); pf.updateMatrixWorld(true);   /* 바깥 면에 덧댄 장갑판 (비탈에 기대 섬) */
      const pl = block(.7, .66, .18, .05); pl.applyMatrix4(pf.matrixWorld); stone.push(pl); if (k === 0) G.userData.plate = pf; }
    /* 돌 사이 세로 틈 빛 */
    const ga = c + TAU / 16; for (const [rA, rB, y0, y1] of [[1.0, 1.0, .2, .14 + (big ? .62 : .62)], [1.72, 1.72, .18, .52]]) glowQuad(glow, at(ga - .03, rA, y0), at(ga + .03, rB, y0), at(ga + .03, rB, y1), at(ga - .03, rA, y1), 0, .4);
    glowQuad(glow, at(ga, .98, .19), at(ga, 1.75, .19), at(ga, 1.75, .26), at(ga, .98, .26), 0, .2); }   /* 틈 바닥 빛 */
  /* 바닥 단 위 빛 테 (둘레 한 바퀴) */
  /* 차지 고리 = 와드를 두른 빛 원 (바닥 단 둘레 세로 테 + 땅에 깔린 빛 띠). 차지하는 10초 동안 정면부터 시계 방향으로 그 사람 색으로 채워짐
     — 따로 땅에 눈금 선을 그리지 않고 와드 몸에 붙은 빛 원 하나로 보여 줌 (사용자) */
  for (let i = 0; i < 96; i++) { const a0 = FR - i / 96 * TAU, a1 = FR - (i + 1) / 96 * TAU, u0 = Math.max(.0005, i / 96), u1 = (i + 1) / 96;
    glowQuad(glow, at(a0, 2.0, .02), at(a1, 2.0, .02), at(a1, 1.99, .16), at(a0, 1.99, .16), 0, 0, u0, u1);
    glowQuad(glow, at(a0, 2.26, .012), at(a1, 2.26, .012), at(a1, 2.02, .012), at(a0, 2.02, .012), 0, 0, u0, u1); }
  /* 정면 표식: 거꾸로 세모 (정면 장갑판 위) */
  { const c = FR, tilt = .32, s = .26, T = [[0, -s], [s * 1.05, s * .75], [-s * 1.05, s * .75]], I = T.map(([x, y]) => [x * .6, y * .6]);
    const P = []; for (let e = 0; e < 3; e++) { const a = T[e], b = T[(e + 1) % 3], c2 = I[(e + 1) % 3], d = I[e]; P.push(a[0], a[1], 0, b[0], b[1], 0, c2[0], c2[1], 0, a[0], a[1], 0, c2[0], c2[1], 0, d[0], d[1], 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, .66, .14), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const pf = G.userData.plate; m.position.set(0, .35, .118); m.renderOrder = 5; pf.add(m); G.add(pf); G.userData.emblem = m;   /* 정면 장갑판 앞면 한가운데 */
    const dent = block(.5, .46, .03, .012); dent.translate(0, .12, .085); dent.applyMatrix4(pf.matrixWorld); stone.push(dent); }
  /* 가운데 북 (팔각) */
  stone.push(wedge(0, .98, -Math.PI / 8, TAU - Math.PI / 8, 1.06, .02, .05).translate(0, .16, 0));
  /* 북에 붙은 버팀 돌기둥 여덟 + 세로 홈 빛 */
  for (let k = 0; k < 8; k++) { const c = FR + k * TAU / 8, big = k % 2 === 0, w = big ? .3 : .24, h = big ? 1.12 : .96, r = .98;
    const g = block(w, h, .24, .045); g.rotateY(FR - c); g.translate(...at(c, r, .2)); stone.push(g);
    const top = block(w + .1, .12, .3, .03); top.rotateY(FR - c); top.translate(...at(c, r + .02, .2 + h - .03)); stone.push(top);
    const ro = r + .125, sw = w * .2, tx = -Math.sin(c), tz = Math.cos(c), [cx, , cz] = at(c, ro, 0), y0 = .36, y1 = .2 + h - .16;
    glowQuad(glow, [cx - tx * sw, y0, cz - tz * sw], [cx + tx * sw, y0, cz + tz * sw], [cx + tx * sw, y1, cz + tz * sw], [cx - tx * sw, y1, cz - tz * sw], .3, .9); }
  /* 맨 위 고리 자리: 돌 테 두 겹 + 안쪽 빛 테 */
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  stone.push(lathe([[.6, 1.2], [1.02, 1.2], [1.05, 1.27], [1.02, 1.36], [.92, 1.4], [.64, 1.4], [.6, 1.36]]));
  stone.push(lathe([[.5, 1.4], [.84, 1.4], [.87, 1.47], [.82, 1.56], [.56, 1.56], [.5, 1.52]]));
  for (let i = 0; i < 48; i++) { const a0 = i / 48 * TAU, a1 = (i + 1) / 48 * TAU; glowQuad(glow, at(a0, .555, 1.47), at(a1, .555, 1.47), at(a1, .555, 1.6), at(a0, .555, 1.6), 1, 1);
    glowQuad(glow, at(a0, 1.04, 1.27), at(a1, 1.04, 1.27), at(a1, 1.04, 1.36), at(a0, 1.04, 1.36), .9, .9); }   /* 4cm → 9cm: 너무 가늘면 밝아질 때 칼 같은 선이 됨 (사용자) */
  /* 문양 돌판 둘: 앞쪽 양 대각선에 바깥으로 살짝 기대 섬 */
  const runes = [];
  for (const sd of [-1, 1]) { const c = FR + sd * .82, r = 1.62, tex = runeTex(sd > 0 ? 11 : 23);
    const grp = new THREE.Group(); grp.position.set(...at(c, r, .12)); grp.rotation.y = FR - c; grp.rotateX(.14); grp.rotateZ(-sd * .05); grp.updateMatrixWorld(true);
    const slab = block(.52, 1.24, .22, .05); slab.applyMatrix4(grp.matrixWorld); stone.push(slab);
    const brk = block(.66, .14, .32, .03); brk.translate(0, -.04, 0); brk.applyMatrix4(grp.matrixWorld); stone.push(brk);
    const rp = new THREE.Mesh(new THREE.PlaneGeometry(.36, .92), runeMat(tex)); rp.position.set(0, .66, .113); grp.add(rp); rp.renderOrder = 5; G.add(grp); runes.push(rp); }
  /* 둘레에 떨어져 나간 돌 조각 */
  for (let i = 0; i < 7; i++) { const a = R() * TAU, r = 2.15 + R() * .7, s = .12 + R() * .14; const g = block(s * 1.6, s, s * 1.2, .02); g.rotateY(R() * 3); g.rotateZ((R() - .5) * .5); g.translate(Math.cos(a) * r, 0, Math.sin(a) * r); stone.push(g); }
  const sMat = stoneMaterial(uT), gMat = glowMaterial();   /* 받침 = 처음 만든 오래된 회색 돌 (사용자 2026-11-03: 원래 처음처럼 돌로) */
  const sm = new THREE.Mesh(solid(mergeGeometries(stone.map(clean))), sMat); G.add(sm);
  const gm = new THREE.Mesh(glowGeo(glow), gMat); gm.renderOrder = 4; G.add(gm);
  G.userData.top = 1.56;                                                    /* 다음 부품(유리 기둥)이 앉을 높이 */
  G.userData.glow = gMat;
  G.userData.update = (t, col, power = .5) => { gMat.uniforms.uT.value = t; gMat.uniforms.uCol.value.copy(col); gMat.uniforms.uI.value = .5 + power * .55;   /* 빛 번짐 줄임 (사용자: 너무 번짐) */ gMat.uniforms.uFlow.value = .25 + power * .9;
    runes.forEach(r => { const U = r.material.uniforms; U.uT.value = t; U.uCol.value.copy(col); U.uI.value = .5 + power * .45; });
    G.userData.emblem.material.opacity = .8 + .2 * Math.sin(t * 1.4); };
  return G;
}
