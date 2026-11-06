/* 빛의 길 입·출구 시안 3D (사용자 2026-11-06: 참고 그림 다섯 중 1번 · 3번 · 4번을 3D로)
   1 돌 고리 문 — 돌덩이 열둘로 짠 큰 고리 · 틈마다 빛 홈 · 꼭대기 수정 · 안쪽 빛 막 · 위에 떠 도는 빛 고리 둘
   3 덩굴 유적 문 — 쌓은 돌기둥 둘 + 들보 · 육각 문양판이 빛남 · 덩굴과 잎이 감기고 늘어짐 · 이끼 · 깨진 바닥돌 · 나비
   4 흩어진 고리 — 갈라진 고리 조각들이 떠서 천천히 돎 · 안쪽 빛 고리 셋 · 둘레를 맴도는 빛 상자 · 조각난 원판
   · 고리 가운데 높이 = 기체가 나는 높이(풀밭 위 2.9m) → 기체가 문 한가운데 머묾
   · 켜짐: 보물이 있는 층으로 가는 문만 빛남 (금빛 = 윗층 · 보랏빛 = 아래층) · 꺼짐: 빛 홈이 희미하게만
   · 문 앞쪽으로 빛 띠 길이 뻗어 나감 (확정된 빛의 길) */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBloom } from '../core/hangar/bloom.js?v=11061610';
import { makePerf } from './perf.js?v=11061610';
import { makeGlow } from '../preview/glow.js';
import { buildShip, engineSpots } from '../core/ships/build.js';

const $ = s => document.querySelector(s), clamp = THREE.MathUtils.clamp;
const SHIP_Y = 2.9;                                  /* 기체가 나는 높이 (풀밭 위) */
const UPC = new THREE.Color(1.45, 1.05, .42), DNC = new THREE.Color(.72, .48, 1.55);
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 작은 도구들 */
let SEED = 1; const rnd = () => (SEED = (SEED * 16807) % 2147483647) / 2147483647;
const jitter = (geo, k, ky = .5) => { geo = geo.index ? geo.toNonIndexed() : geo; const p = geo.attributes.position, m = new Map();
  for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; if (!m.has(key)) m.set(key, [(rnd() - .5) * k, (rnd() - .5) * k * ky, (rnd() - .5) * k]); const d = m.get(key); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]); }
  geo.computeVertexNormals(); return geo; };
const tint = (geo, base, vary) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color(base);   /* 면마다 돌빛을 조금씩 다르게 (같은 색 덩어리로 보이지 않게) */
  for (let i = 0; i < p.count; i += 3) { const k = 1 + (rnd() - .5) * vary; for (let j = 0; j < 3; j++) { c[(i + j) * 3] = col.r * k; c[(i + j) * 3 + 1] = col.g * k; c[(i + j) * 3 + 2] = col.b * k; } }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
const STONE = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true });
const sector = (r0, r1, a0, a1, depth, bev = .05) => { const s = new THREE.Shape(), n = Math.max(3, Math.ceil((a1 - a0) / .12));   /* 고리 토막: 안·바깥 호 사이를 두께만큼 밀어냄 */
  s.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1); for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; s.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -depth / 2); return g; };
const glowMat = () => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
/* 바닥 빛 원판: 동심원 고리가 바깥으로 퍼지고 가운데가 숨 쉬듯 밝아짐 */
const discMat = () => new THREE.ShaderMaterial({ ...AB, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 }, uK: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 uC; uniform float uA, uT, uK; varying vec2 vP;
    void main(){ float r=length(vP), a=atan(vP.y,vP.x);
      float rings=0.; for(int i=0;i<4;i++){ float R=.25+float(i)*.22; rings+=exp(-pow((r-R)*38.,2.))*(.55+.45*sin(a*(6.+float(i)*4.)+uT*(i%2==0?1.2:-1.))); }
      float wave=exp(-pow((r-fract(uT*.45))*14.,2.))*.6, core=exp(-r*r*18.)*(.7+.3*sin(uT*3.));
      float ticks=uK>.5? step(.92,fract(a*24./6.2832))*exp(-pow((r-.93)*30.,2.)) : 0.;
      gl_FragColor=vec4(uC*(rings+wave+core+ticks)*uA*smoothstep(1.,.95,r),1.); }` });
/* 문 안쪽 빛 막: 세로 결이 위로 흐르고 가장자리가 밝음 · 가운데로 빨려 드는 동심 물결 */
const filmMat = () => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 uC; uniform float uA, uT; uniform float uR; varying vec2 vP;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ float r=length(vP)/2.45; float rim=smoothstep(.7,1.,r)*smoothstep(1.02,.97,r);
      float streak=pow(h(vec2(floor(vP.x*9.),0.)),6.)*(.5+.5*sin(vP.y*3.-uT*4.+h(vec2(floor(vP.x*9.),1.))*6.));
      float pull=.5+.5*sin(r*18.+uT*5.);
      float a=(rim*.7+.05)*smoothstep(1.02,.98,r);   /* 선 고리(물결) 뺌 · 가장자리만 은은하게 (사용자 2026-11-06) */   /* 세로 줄기 뺌 (사용자 2026-11-06: 비스듬히 보면 바닥 줄무늬처럼 보임) */
      gl_FragColor=vec4(uC*a*uA,1.); }` });
/* 빛 띠 길 (빛의 길 확정 모양) */
const roadMat = (kind) => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 }, uL: { value: 30 }, uK: { value: kind } },
  vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform vec3 uC; uniform float uA, uT, uL, uK; varying vec2 vU;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    void main(){ float x=vU.x*2.-1., s=vU.y*uL; float edge=exp(-x*x*(uK>1.5?2.:3.5)), core=exp(-x*x*40.);
      float flow=s-uT*14.; float chev=uK<.5 ? smoothstep(.55,.95,fract((flow-abs(x)*1.4)/3.2)) : 0.;
      float spark=step(.985,h(floor(vec2(x*8.,flow*2.))))*.9;
      float ends=smoothstep(0.,.05,vU.y)*smoothstep(1.,.9,vU.y), fade=mix(1.,.55,vU.y);
      gl_FragColor=vec4(uC*(edge*.22+core*.55+spark*edge*.7)*ends*fade*uA*.75,1.); }` });   /* 꺾쇠 무늬 뺌 (사용자 2026-11-06) */

/* 받침 섬: 풀 덮인 둥근 윗면 + 층진 바위 몸통 (참고 그림처럼 문이 섬 하나를 다 차지) */
function pedestal(seed) {
  SEED = seed; const g = new THREE.Group();
  const N = 22, top = [], R = 7.2;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, r = R * (1 + (rnd() - .5) * .14); top.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const shp = new THREE.Shape(top.map(p => new THREE.Vector2(p[0], p[1])));
  const cap = new THREE.ExtrudeGeometry(shp, { depth: .5, bevelEnabled: true, bevelSize: .25, bevelThickness: .2, bevelSegments: 2 }); cap.rotateX(-Math.PI / 2); cap.translate(0, -.5, 0);
  g.add(new THREE.Mesh(tint(jitter(cap, .12, .3), 0x8cc95e, .18), STONE));
  /* 바위 몸통: 층마다 좁아지며 아래로 · 층 경계가 결로 보임 */
  const rings = [[0, 1], [-1.4, .9], [-3, .74], [-4.8, .55], [-6.6, .36], [-8.4, .18], [-10, .02]];
  const pos = [];
  for (let k = 0; k < rings.length - 1; k++) { const [y0, s0] = rings[k], [y1, s1] = rings[k + 1];
    for (let i = 0; i < N; i++) { const a = top[i], b = top[(i + 1) % N]; const A0 = [a[0] * s0, y0 - .5, a[1] * s0], B0 = [b[0] * s0, y0 - .5, b[1] * s0], A1 = [a[0] * s1, y1 - .5, a[1] * s1], B1 = [b[0] * s1, y1 - .5, b[1] * s1];
      pos.push(...A0, ...A1, ...B0, ...B0, ...A1, ...B1); } }
  const body = new THREE.BufferGeometry(); body.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const bm = jitter(body, .55, .4), bc = bm.attributes.position, col = new Float32Array(bc.count * 3);
  for (let i = 0; i < bc.count; i += 3) { const y = (bc.getY(i) + bc.getY(i + 1) + bc.getY(i + 2)) / 3, band = .5 + .5 * Math.sin(y * 3.1), k = .82 + rnd() * .22;
    const c = new THREE.Color().lerpColors(new THREE.Color(0xa58c70), new THREE.Color(0x6a5546), clamp(-y / 10, 0, 1)).multiplyScalar(k * (.9 + band * .14)); for (let j = 0; j < 3; j++) c.toArray(col, (i + j) * 3); }
  bm.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.add(new THREE.Mesh(bm, STONE));
  /* 풀 위 작은 것들: 풀 다발 · 들꽃 · 작은 바위 · 나무 몇 그루 (문 둘레는 비움) */
  const tuft = new THREE.ConeGeometry(.12, .45, 4).translate(0, .22, 0), leafM = new THREE.MeshStandardMaterial({ color: 0x6fb64a, flatShading: true, roughness: .8 });
  const tufts = new THREE.InstancedMesh(tuft, leafM, 140), fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0), new THREE.MeshStandardMaterial({ vertexColors: false, color: 0xffffff, emissive: 0x222222, flatShading: true }), 90), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3();
  let ti = 0, fi = 0; const cols = [0xffe46b, 0xffffff, 0xff9ec4, 0xffb35c, 0xc9a8ff];
  for (let i = 0; i < 400 && (ti < 140 || fi < 90); i++) { const a = rnd() * 6.283, r = 4.4 + rnd() * 2.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (ti < 140) { Q.setFromEuler(new THREE.Euler((rnd() - .5) * .4, rnd() * 6, (rnd() - .5) * .4)); Sv.setScalar(.7 + rnd() * .8); M.compose(new THREE.Vector3(x, 0, z), Q, Sv); tufts.setMatrixAt(ti++, M); }
    else if (fi < 90) { M.compose(new THREE.Vector3(x, .08, z), Q.identity(), Sv.setScalar(.8 + rnd() * .6)); fl.setMatrixAt(fi, M); fl.setColorAt(fi++, new THREE.Color(cols[(rnd() * 5) | 0])); } }
  g.add(tufts, fl);
  for (let i = 0; i < 4; i++) { const a = rnd() * 6.283, r = 5.6 + rnd() * 1.1, x = Math.cos(a) * r, z = Math.sin(a) * r, s = .8 + rnd() * .5; if (z < -3 && Math.abs(x) < 3) continue;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.08 * s, .13 * s, 1.1 * s, 5).translate(0, .55 * s, 0), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, flatShading: true })); tr.position.set(x, 0, z); g.add(tr);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(tint(jitter(new THREE.IcosahedronGeometry(.55 * s, 0), .15), 0x5fae47, .25), STONE); b.position.set(x + (rnd() - .5) * .5 * s, (1.2 + k * .35) * s, z + (rnd() - .5) * .5 * s); g.add(b); } }
  for (let i = 0; i < 7; i++) { const a = rnd() * 6.283, r = 5 + rnd() * 2, b = new THREE.Mesh(tint(jitter(new THREE.DodecahedronGeometry(.25 + rnd() * .3, 0), .1), 0xb9ad98, .2), STONE); b.position.set(Math.cos(a) * r, .05, Math.sin(a) * r); g.add(b); }
  /* 늘어진 뿌리 */
  const rootM = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: .9 });
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.283, r = 5.6 + rnd() * 1.4, x = Math.cos(a) * r, z = Math.sin(a) * r, L = 2 + rnd() * 4;
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x, -.6, z), new THREE.Vector3(x * 1.02, -.6 - L * .4, z * 1.02), new THREE.Vector3(x * .98 + (rnd() - .5), -.6 - L, z * .98 + (rnd() - .5))]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 8, .035 + rnd() * .03, 4), rootM)); }
  return g;
}

/* ── 1 돌 고리 문 ── */
function gate1() {
  SEED = 101; const g = new THREE.Group(), glows = [], films = [], discs = [];
  const C = SHIP_Y;   /* 고리 가운데 = 기체 높이 */
  /* 받침단 두 층 · 바큇살 홈 */
  const d1 = new THREE.Mesh(tint(jitter(new THREE.CylinderGeometry(4.3, 4.5, .28, 16).translate(0, .14, 0), .06, .3), 0xc9bfac, .16), STONE), d2 = new THREE.Mesh(tint(jitter(new THREE.CylinderGeometry(3.5, 3.65, .26, 16).translate(0, .41, 0), .05, .3), 0xd8cfbd, .14), STONE); g.add(d1, d2);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, gr = new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .9), glowMat()); gr.position.set(Math.cos(a) * 3.9, .29, Math.sin(a) * 3.9); gr.rotation.y = -a + Math.PI / 2; g.add(gr); glows.push([gr, .35]); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64).rotateX(-Math.PI / 2), discMat()); disc.position.y = .56; disc.renderOrder = 5; disc.material.uniforms.uK.value = 1; g.add(disc); discs.push(disc);
  /* 고리: 돌덩이 열둘 (틈 3도) · 하나 걸러 겉에 덧댄 띠돌 */
  const ring = new THREE.Group(); ring.position.y = C; g.add(ring);
  for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2 + .028, a1 = (i + 1) / 12 * Math.PI * 2 - .028;
    const blk = new THREE.Mesh(tint(jitter(sector(2.45, 3.2, a0, a1, .95, .06), .04, 1), i % 2 ? 0xbdb3a0 : 0xcbc2b0, .12), STONE); ring.add(blk);
    if (i % 2 === 0) { const cl = new THREE.Mesh(tint(sector(3.18, 3.4, a0 + .08, a1 - .08, .62, .03), 0x8f8676, .1), STONE); ring.add(cl); }
    for (const z of [-.49, .49]) { const inl = new THREE.Mesh(sector(2.72, 2.8, a0 + .05, a1 - .05, .02, 0), glowMat()); inl.position.z = z; ring.add(inl); glows.push([inl, .25]); }   /* 앞뒤 면의 가는 빛 홈 */
    const am = (a0 + a1) / 2; if (i % 3 === 0) for (const z of [-.5, .5]) { const rn = new THREE.Mesh(new THREE.CircleGeometry(.12, 6), glowMat()); rn.position.set(Math.cos(am) * 2.95, Math.sin(am) * 2.95, z * 1.01); if (z < 0) rn.rotation.y = Math.PI; ring.add(rn); glows.push([rn, .5]); }
    const gap = (i + 1) / 12 * Math.PI * 2, bar = new THREE.Mesh(new THREE.BoxGeometry(.75, .045, .82), glowMat()); bar.position.set(Math.cos(gap) * 2.82, Math.sin(gap) * 2.82, 0); bar.rotation.z = gap; ring.add(bar); glows.push([bar, .6]); }   /* 돌덩이 틈 = 빛 */
  /* 꼭대기: 받침 갈래 + 길쭉한 수정 */
  const crown = new THREE.Mesh(tint(jitter(sector(3.15, 3.75, Math.PI / 2 - .2, Math.PI / 2 + .2, .7, .05), .04), 0x9d9483, .1), STONE); ring.add(crown);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(tint(jitter(new THREE.ConeGeometry(.16, .9, 4), .03), 0x9d9483, .1), STONE); f.position.set(s * .5, 3.95, 0); f.rotation.z = -s * .3; ring.add(f); }
  const cry = new THREE.Mesh(new THREE.OctahedronGeometry(.5, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x000000, roughness: .15, metalness: .1, flatShading: true, transparent: true, opacity: .92 })); cry.scale.set(.75, 1.8, .55); cry.position.set(0, 4.3, 0); ring.add(cry);
  /* 밑동: 고리를 받침에 박아 잡는 쐐기돌 둘 */
  for (const s of [-1, 1]) { const w = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(1.1, 1.1, 1.3), .1), 0xa79d8a, .12), STONE); w.position.set(s * 1.9, .9, 0); w.rotation.z = s * .5; g.add(w); }
  /* 안쪽 빛 막 · 위에 떠서 도는 빛 고리 둘 */
  const film = new THREE.Mesh(new THREE.CircleGeometry(2.45, 64), filmMat()); film.position.y = C; film.renderOrder = 6; g.add(film); films.push(film);
  const halos = [[1.05, C + .9], [.7, C + 1.6]].map(([r, y]) => { const h = new THREE.Mesh(new THREE.TorusGeometry(r, .035, 6, 48), glowMat()); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); glows.push([h, .2]); return h; });
  /* 받침 가장자리 수정 무리 */
  for (let i = 0; i < 9; i++) { const a = Math.PI * .1 + rnd() * Math.PI * .8 + (rnd() < .5 ? Math.PI : 0), r = 4.2 + rnd() * .8, c = new THREE.Mesh(new THREE.OctahedronGeometry(.14 + rnd() * .14, 0), new THREE.MeshStandardMaterial({ color: rnd() < .5 ? 0xd7b8ff : 0xa8e2ff, emissive: 0x221133, roughness: .2, flatShading: true }));
    c.scale.y = 2.2; c.position.set(Math.cos(a) * r, .2, Math.sin(a) * r); c.rotation.z = (rnd() - .5) * .6; g.add(c); }
  return { g, glows, films, discs, idle: new THREE.Color(.35, .6, 1.1), update(t, a, col) { halos[0].rotation.z = t * .8; halos[1].rotation.z = -t * 1.1; halos.forEach((h, k) => h.position.y = C + .9 + k * .7 + Math.sin(t * 1.4 + k) * .06); cry.rotation.y = t * .5; cry.material.emissive.copy(col).multiplyScalar(.12 + a * .5); } };
}

/* ── 3 덩굴 유적 문 ── */
function gate3() {
  SEED = 303; const g = new THREE.Group(), glows = [], films = [], discs = [];
  /* 깨진 바닥돌: 둥근 자리 안을 불규칙한 판석으로 · 틈은 풀 */
  for (let i = 0; i < 46; i++) { const r = Math.sqrt(rnd()) * 3.7, a = rnd() * 6.283, x = Math.cos(a) * r, z = Math.sin(a) * r * .95 + .4, s = .55 + rnd() * .45;
    const st = new THREE.Mesh(tint(jitter(new THREE.CylinderGeometry(s, s * 1.04, .16, 5 + (rnd() * 3 | 0)), .12, .2), 0xc7c0b0, .18), STONE); st.position.set(x, .06 + rnd() * .04, z); st.rotation.set((rnd() - .5) * .05, rnd() * 6, (rnd() - .5) * .05); g.add(st); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.3, 64).rotateX(-Math.PI / 2), discMat()); disc.position.set(0, .2, .2); disc.renderOrder = 5; g.add(disc); discs.push(disc);
  /* 돌기둥 둘: 받침 · 쌓은 돌 다섯 · 머리돌 · 안쪽과 앞면에 청록 홈 */
  const pillar = (sx) => { const p = new THREE.Group(); p.position.x = sx * 2.75; g.add(p);
    const base = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(1.45, .5, 1.45).translate(0, .25, 0), .06), 0xb7ae9c, .12), STONE); p.add(base);
    let y = .5; for (let k = 0; k < 5; k++) { const h = .78 + rnd() * .16, b = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(1.05, h, 1.05).translate(0, h / 2, 0), .09, .4), k % 2 ? 0xc4bba9 : 0xb3aa98, .14), STONE); b.position.set((rnd() - .5) * .08, y, (rnd() - .5) * .08); b.rotation.y = (rnd() - .5) * .08; p.add(b);
      for (const [fx, fz, ry] of [[-sx * .535, 0, Math.PI / 2], [0, .535, 0]]) { const strip = new THREE.Mesh(new THREE.PlaneGeometry(.09, h * .74), glowMat()); strip.position.set(fx, y + h / 2, fz); strip.rotation.y = ry * (fx ? -sx : 1); p.add(strip); glows.push([strip, .3]);
        if (k % 2 === 0) { const gl = new THREE.Mesh(new THREE.RingGeometry(.11, .16, 4), glowMat()); gl.position.set(fx * 1.002, y + h * .5, fz * 1.002); gl.rotation.y = ry * (fx ? -sx : 1); p.add(gl); glows.push([gl, .45]); } }
      y += h; }
    const capi = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(1.4, .38, 1.4).translate(0, .19, 0), .06), 0xa69d8b, .1), STONE); capi.position.y = y; p.add(capi);
    /* 기둥 앞 둥근 문양판 */
    const pl = new THREE.Mesh(tint(new THREE.CylinderGeometry(.42, .42, .14, 8).rotateX(Math.PI / 2), 0x8f8777, .08), STONE); pl.position.set(0, 3.9, .6); p.add(pl);
    const pr = new THREE.Mesh(new THREE.TorusGeometry(.3, .035, 4, 6), glowMat()); pr.position.set(0, 3.9, .69); pr.rotation.z = Math.PI / 6; p.add(pr); glows.push([pr, .55]);
    const pd = new THREE.Mesh(new THREE.CircleGeometry(.12, 4), glowMat()); pd.position.set(0, 3.9, .7); p.add(pd); glows.push([pd, .5]);
    return y + .38; };
  const top = Math.max(pillar(-1), pillar(1));
  /* 들보: 두 층 · 처마 · 가운데 육각 문양판(크게) */
  const lin = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(7.2, .7, 1.25).translate(0, .35, 0), .08, .3), 0xb9b09e, .12), STONE); lin.position.y = top; g.add(lin);
  const lin2 = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(6.4, .4, 1.05).translate(0, .2, 0), .06, .3), 0xa9a08e, .1), STONE); lin2.position.y = top + .7; g.add(lin2);
  const hexP = new THREE.Mesh(tint(jitter(new THREE.CylinderGeometry(1.0, 1.0, .35, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), .04), 0x9a9180, .08), STONE); hexP.position.set(0, top + 1.2, .25); g.add(hexP);
  const hexR = new THREE.Mesh(new THREE.TorusGeometry(.78, .05, 4, 6), glowMat()); hexR.rotation.z = Math.PI / 6; hexR.position.set(0, top + 1.2, .44); g.add(hexR); glows.push([hexR, .55]);
  const hexR2 = new THREE.Mesh(new THREE.TorusGeometry(.5, .03, 4, 6), glowMat()); hexR2.position.set(0, top + 1.2, .45); g.add(hexR2); glows.push([hexR2, .45]);
  const rune = new THREE.Group(); rune.position.set(0, top + 1.2, .46); g.add(rune);
  for (let k = 0; k < 3; k++) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(.06, .62), glowMat()); ln.rotation.z = k * Math.PI / 3; rune.add(ln); glows.push([ln, .6]); }
  const runeC = new THREE.Mesh(new THREE.CircleGeometry(.11, 12), glowMat()); rune.add(runeC); glows.push([runeC, .7]);
  /* 이끼: 위를 보는 면에 납작한 초록 덩이 */
  const moss = (x, y, z, s) => { const m = new THREE.Mesh(tint(jitter(new THREE.IcosahedronGeometry(s, 0), s * .3), 0x6aa64a, .25), STONE); m.scale.y = .32; m.position.set(x, y, z); g.add(m); };
  for (let i = 0; i < 9; i++) moss(-3.2 + rnd() * 6.4, top + 1.1, (rnd() - .5) * .9, .35 + rnd() * .3);
  for (const sx of [-1, 1]) { moss(sx * 2.75, top + .02, .2, .55); moss(sx * 2.9, .52, .5, .45); }
  /* 덩굴: 기둥을 감아 오르고 들보에서 늘어짐 · 잎 무리 */
  const vineM = new THREE.MeshStandardMaterial({ color: 0x3f6e2e, roughness: .85 }), vines = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const pts = []; for (let i = 0; i <= 16; i++) { const tt = i / 16, a = tt * 6.283 * 1.6 + k * 2.4 + (sx > 0 ? 1 : 0); pts.push(new THREE.Vector3(sx * 2.75 + Math.cos(a) * .62, .3 + tt * (top + .3), Math.sin(a) * .62)); }
    vines.push(new THREE.CatmullRomCurve3(pts)); }
  for (let i = 0; i < 7; i++) { const x = -3 + i * 1 + (rnd() - .5) * .4, L = .8 + rnd() * 2.2; vines.push(new THREE.CatmullRomCurve3([new THREE.Vector3(x, top + .05, .64), new THREE.Vector3(x + (rnd() - .5) * .3, top - L * .5, .7), new THREE.Vector3(x + (rnd() - .5) * .4, top - L, .66)])); }
  vines.push(new THREE.CatmullRomCurve3([new THREE.Vector3(-3.5, top + .4, .6), new THREE.Vector3(-1.5, top + .95, .66), new THREE.Vector3(0, top + .55, .7), new THREE.Vector3(1.6, top + .9, .66), new THREE.Vector3(3.5, top + .35, .6)]));
  const leafG = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.13, .1, 0, .3); s.quadraticCurveTo(-.13, .1, 0, 0); return new THREE.ShapeGeometry(s, 3); })();
  const leaves = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x5fa945, side: THREE.DoubleSide, roughness: .7, flatShading: true }), 520); let li = 0; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3();
  for (const c of vines) { g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, .045, 4), vineM)); const n = Math.min(60, Math.ceil(c.getLength() * 9));
    for (let i = 0; i < n && li < 520; i++) { const p = c.getPointAt(i / n); Q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)); M.compose(p, Q, Sv.setScalar(.7 + rnd() * .7)); leaves.setMatrixAt(li, M); leaves.setColorAt(li++, new THREE.Color().setHSL(.27 + rnd() * .05, .5, .32 + rnd() * .14)); } }
  leaves.count = li; g.add(leaves);
  /* 문 안쪽 빛 막 (네모 문 모양) */
  const film = new THREE.Mesh(new THREE.PlaneGeometry(4.3, top - .5), new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; float h(float x){ return fract(sin(x*91.3)*437.5); }
      void main(){ float ex=min(vU.x,1.-vU.x), ey=min(vU.y,1.-vU.y); float rim=exp(-ex*24.)+exp(-ey*24.)*.6;
        float col=floor(vU.x*22.), st=pow(h(col),5.)*(.5+.5*sin(vU.y*14.-uT*3.+h(col+3.)*6.));
        gl_FragColor=vec4(uC*(rim*.9+st*.4+.06)*uA,1.); }` }));
  film.position.set(0, .5 + (top - .5) / 2, 0); film.renderOrder = 6; g.add(film); films.push(film);
  /* 나비: 날개 두 장이 팔랑이며 문 둘레를 맴돎 (빛나는 날개) */
  const flies = []; for (let i = 0; i < 7; i++) { const b = new THREE.Group(), wm = glowMat(); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(.14, 5, 0, Math.PI), wm); w.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.x = s * .02; const piv = new THREE.Group(); piv.add(w); piv.userData.s = s; b.add(piv); }
    g.add(b); glows.push([{ material: wm }, .8]); flies.push({ b, r: 2 + rnd() * 2.6, h: 1 + rnd() * 3.5, sp: (.25 + rnd() * .3) * (rnd() < .5 ? 1 : -1), ph: rnd() * 6 }); }
  return { g, glows, films, discs, idle: new THREE.Color(.25, 1.05, .85), update(t, a, col, dt) { for (const f of flies) { const an = t * f.sp + f.ph; f.b.position.set(Math.cos(an) * f.r, f.h + Math.sin(t * 1.3 + f.ph) * .3, Math.sin(an) * f.r * .7 + .3); f.b.rotation.y = -an;
      f.b.children.forEach(piv => { piv.rotation.y = piv.userData.s * (.3 + .9 * Math.abs(Math.sin(t * 14 + f.ph))); }); } } };
}

/* ── 4 흩어진 고리 ── */
function gate4() {
  SEED = 404; const g = new THREE.Group(), glows = [], films = [], discs = [];
  const C = SHIP_Y;
  /* 조각난 원판: 부채꼴 판 열둘 + 바깥 테 · 금빛 동심 고리 */
  for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2 + .02, a1 = (i + 1) / 12 * Math.PI * 2 - .02;
    const s = new THREE.Mesh(tint(jitter(sector(1.2, 4.4, a0, a1, .3, .04).rotateX(-Math.PI / 2), .04, .3), i % 2 ? 0xc9c0ae : 0xbab19f, .12), STONE); s.position.y = .17; g.add(s);
    const blk = new THREE.Mesh(tint(jitter(new THREE.BoxGeometry(.5, .5, .7), .06), 0x9e9583, .1), STONE); blk.position.set(Math.cos(a0 + .26) * 4.5, .2, Math.sin(a0 + .26) * 4.5); blk.rotation.y = -a0; g.add(blk); }
  const hub = new THREE.Mesh(tint(jitter(new THREE.CylinderGeometry(1.18, 1.25, .34, 12).translate(0, .17, 0), .03), 0xd7cfbe, .1), STONE); g.add(hub);
  /* 바닥에는 빛 효과 없음 (사용자 2026-11-06) */
  /* 갈라진 고리 조각: 크기·틈이 들쑥날쑥 · 안쪽 테두리 금빛 · 따로 떠서 오르내림 */
  const ring = new THREE.Group(); ring.position.y = C + .2; g.add(ring); const frags = [];
  let a = .1; while (a < Math.PI * 2 - .3) { const len = .32 + rnd() * .34, a0 = a, a1 = Math.min(a + len, Math.PI * 2 + .05); a = a1 + .1 + rnd() * .16;
    const fg = new THREE.Group(); const body = new THREE.Mesh(tint(jitter(sector(2.65, 3.25, a0, a1, .75, .06), .05, 1), rnd() < .5 ? 0xc0b7a4 : 0xaea592, .12), STONE); fg.add(body);
    const ed = new THREE.Mesh(sector(2.6, 2.7, a0 + .02, a1 - .02, .8, 0), glowMat()); fg.add(ed); glows.push([ed, .7]);
    for (const z of [-.39, .39]) { const gr = new THREE.Mesh(sector(2.92, 2.98, a0 + .05, a1 - .05, .02, 0), glowMat()); gr.position.z = z; fg.add(gr); glows.push([gr, .35]); }
    ring.add(fg); frags.push({ fg, ph: rnd() * 6, dr: (rnd() - .5) * .25, dz: (rnd() - .5) * .35, am: (a0 + a1) / 2 }); }
  /* 안쪽 빛 고리 셋 · 가운데 굴 같은 동심 물결 */
  /* 안쪽 빛 고리 셋은 뺌 (사용자 2026-11-06: 원 안의 선 고리) */
  const film = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), filmMat()); film.position.y = C + .2; film.renderOrder = 6; g.add(film); films.push(film);
  /* 둘레를 맴도는 빛 상자 */
  const cubes = []; for (let i = 0; i < 11; i++) { const s = .22 + rnd() * .16, cb = new THREE.Group(); const core = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), glowMat()); const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s * 1.25, s * 1.25, s * 1.25)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 }));
    cb.add(core, edge); g.add(cb); cubes.push({ core, edge, cb, r: 3.75 + rnd() * .6, a: (i + (rnd() - .5) * .45) / 11 * Math.PI * 2, sp: .1, z: (rnd() - .5) * .8, sp2: rnd() * 2 }); }   /* 아까처럼 크기·거리·앞뒤가 들쑥날쑥 · 대신 둘레에 고르게 퍼지고 다 같은 빠르기로 돌아 빈 곳이 안 생김 (사용자 2026-11-06) */
  let spin = 0, ringA = 0; const cc = new THREE.Color();
  return { g, glows, films, discs, idle: new THREE.Color(1.1, .8, .35), update(t, a, col, dt, ch = 0) {
      /* 기체가 문에서 0.5초 머문 뒤 3초(ch 0→1): 고리 조각과 빛 상자가 점점 빠르게 돌고, 빛 상자가 점점 밝아짐 (기체가 기울며 트는 것과 함께) */
      spin += ((ch > 0 ? .12 + ch * ch * 4.5 : .12 * (.4 + a)) - spin) * Math.min(1, dt * (ch > 0 ? 6 : 2)); ringA += spin * dt; ring.rotation.z = ringA;
      for (const c of cubes) { cc.copy(col).multiplyScalar(.45 + ch * 1.4); c.core.material.color.copy(cc); c.edge.material.opacity = .35 + ch * .65; c.cb.scale.setScalar(1 + ch * .25); }
      for (const f of frags) { const k = Math.sin(t * 1.1 + f.ph); f.fg.position.set(Math.cos(f.am) * (f.dr + k * .05), Math.sin(f.am) * (f.dr + k * .05), f.dz + k * .04); }
      for (const c of cubes) { c.a += dt * (c.sp * (1 + a) + ch * ch * 1.6); c.cb.position.set(Math.cos(c.a) * c.r, C + .2 + Math.sin(c.a) * c.r, c.z + Math.sin(t * 1.2 + c.sp2) * .12);   /* 더 느리게 · 다 같이 돎 */ c.cb.rotation.set(t * c.sp * 3, t * c.sp * 2, 0); } } };
}

export async function start(canvas, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setClearColor(0xbcd2ea, 1);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, .3, 900), bloom = makeBloom(renderer, { samples: 0 });
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .7; pm.dispose(); }
  const sunDir = new THREE.Vector3(-.45, .78, -.42).normalize(), sun = new THREE.DirectionalLight(0xfff0dc, 2.8); sun.position.copy(sunDir).multiplyScalar(20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xb7c8e8, 0x3a3020, .8));
  /* 하늘 아래 구름 바다 */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p=vW.xz*.02+vec2(uT*.004,0.); float c=n(p)*.5+n(p*2.1)*.3+n(p*4.3)*.2; c=smoothstep(.3,.8,c); gl_FragColor=vec4(mix(vec3(.62,.72,.9),vec3(.97,.98,1.),c),1.); }` }));
  sea.position.y = -40; scene.add(sea);
  const glow = makeGlow(); scene.add(glow.mesh);
  onProgress(.15);
  /* 문 셋을 각자 받침 섬 위에 · 문 앞(화면 위쪽)으로 빛 띠 길 */
  const GATES = [['1', gate1], ['3', gate3], ['4', gate4]].map(([id, fn], i) => { const root = new THREE.Group(); root.position.set((i - 1) * 26, 0, 0); scene.add(root);
    root.add(pedestal(11 + i * 7)); const G = fn(); root.add(G.g);
    const pts = [new THREE.Vector3(0, SHIP_Y - .3, 0), new THREE.Vector3(0, SHIP_Y + .2, -6), new THREE.Vector3(-3, SHIP_Y + 4, -16), new THREE.Vector3(-8, SHIP_Y + 9, -26), new THREE.Vector3(-14, SHIP_Y + 13, -36)];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), len = curve.getLength(), road = [];
    const rib = (w, kind) => { const pos = [], uv = [], idx = [], n = 120, T = new THREE.Vector3(), Bn = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3();
      for (let k = 0; k <= n; k++) { const u = k / n; curve.getPointAt(u, p); curve.getTangentAt(u, T); Bn.crossVectors(T, up).normalize(); pos.push(p.x - Bn.x * w, p.y - Bn.y * w, p.z - Bn.z * w, p.x + Bn.x * w, p.y + Bn.y * w, p.z + Bn.z * w); uv.push(0, u, 1, u); if (k < n) { const q = k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      const m = new THREE.Mesh(geo, roadMat(kind)); m.material.uniforms.uL.value = len; m.renderOrder = 7; m.frustumCulled = false; root.add(m); road.push(m); };
    rib(.62, 0); rib(1.3, 2);
    return { id, root, G, road, curve }; });
  /* 크기 비교용 기체: 고른 문 한가운데 (기체가 나는 높이) */
  const sb = await buildShip(1, 1, 'ruby', { renderer, size: 2 }); const ship = sb.root, sm = ship.children[0]; scene.add(ship);
  const ENG = engineSpots(sb.ship, sm, new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3()));
  onProgress(.85);

  const st = { sel: 1, on: 1, dir: 'up', ship: true, yaw: 0, ang: 45, dist: 25 };
  const seg = (sel, vals, key, after) => document.querySelectorAll(sel + ' button').forEach((b, i) => { b.onclick = () => { st[key] = vals[i]; document.querySelectorAll(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); after?.(); }; });
  seg('#sg', [0, 1, 2], 'sel'); seg('#so', [1, 0], 'on'); seg('#sd', ['up', 'dn'], 'dir'); seg('#ss', [true, false], 'ship');
  seg('#sv', [[45, 25], [32, 13], [8, 14]], 'view', () => { [st.ang, st.dist] = st.view; $('#ang').value = st.ang; $('#dist').value = st.dist; drawV(); });
  const drawV = () => { $('#angv').textContent = st.ang + '°'; $('#distv').textContent = st.dist + 'm'; };
  $('#ang').oninput = e => { st.ang = +e.target.value; drawV(); }; $('#dist').oninput = e => { st.dist = +e.target.value; drawV(); }; drawV();
  document.querySelectorAll('#sg button')[2].click();
  /* 끌어서 문 둘레를 돌아봄 · 두 손가락/휠 = 거리 */
  { let px = null; const pts = new Map(); let pd = 0;
    canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId); px = e.clientX; });
    canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pd) { st.dist = clamp(st.dist * pd / d, 6, 80); $('#dist').value = st.dist | 0; drawV(); } pd = d; return; }
      st.yaw -= (e.clientX - px) * .006; px = e.clientX; });
    const up = e => { pts.delete(e.pointerId); pd = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); st.dist = clamp(st.dist * (1 + e.deltaY * .001), 6, 80); $('#dist').value = st.dist | 0; drawV(); }, { passive: false }); }

  let Wd = 2, Hd = 2;
  const perf = makePerf(s => { bloom.setSamples(s.aa ? 4 : 0); size(); });
  function size() { const r = canvas.getBoundingClientRect(); [Wd, Hd] = perf.size(r.width, r.height); renderer.setSize(Wd, Hd, false); bloom.size(Wd, Hd); camera.aspect = Wd / Hd; camera.updateProjectionMatrix(); glow.uRes.value.set(Wd, Hd); }
  addEventListener('resize', size); size(); bloom.setSamples(perf.st.aa ? 4 : 0);

  const cam = { x: 26, y: SHIP_Y, z: 0 }, tmp = new THREE.Color(), onC = new THREE.Color(), v3 = new THREE.Vector3();
  /* 출발 충격파: 기체 뒤에서 얇은 빛 고리가 한 번 퍼지며 사라짐 (과하지 않게) */
  const shockM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uA, uK; varying vec2 vP;
      void main(){ float r=length(vP); float w=mix(.10,.035,uK); float ring=exp(-pow((r-.92)/w,2.)); float inner=smoothstep(.92,.2,r)*.18*(1.-uK);
        gl_FragColor=vec4(uC*(ring+inner)*uA,1.); }` });
  const shock = new THREE.Mesh(new THREE.CircleGeometry(1, 48), shockM); shock.visible = false; shock.renderOrder = 9; scene.add(shock); const SW = { t: 9 };
  const boom = (R, p, tg) => { shock.position.copy(p).add(R.position).addScaledVector(tg, -.6); shock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg); SW.t = 0; };
  let t = 0, last = performance.now(), act = 1, CH = 0; const SQ = { ph: 'idle', t: 0 };
  const DIRS = [['정면에서', 0], ['뒤에서', Math.PI], ['왼쪽 앞에서', -.9], ['오른쪽 뒤에서', 2.3]]; SQ.k = 0; SQ.yaw0 = 0;
  const goTxt = () => { $('#go').textContent = `기체 들어가 보기 · ${DIRS[SQ.k][0]}`; }; goTxt();
  $('#go').onclick = () => { SQ.dir = DIRS[SQ.k][1]; SQ.yaw0 = SQ.dir; SQ.ph = 'in'; SQ.t = 0; st.on = 1; SQ.k = (SQ.k + 1) % DIRS.length; goTxt(); };   /* 들어오는 쪽을 바꿔 가며: 3초 동안 갈 쪽으로 방향을 잡는지 보려고 */
  renderer.setAnimationLoop(now => { try {
    const dt = clamp((now - last) / 1000, 0, .05); last = now; t += dt;
    act += (st.on - act) * Math.min(1, dt * 3);
    const col = st.dir === 'dn' ? DNC : UPC;
    for (const [i, Gt] of GATES.entries()) { const G = Gt.G;
      G.update(t, act, col, dt, i === st.sel ? CH : 0);
      for (const [m, w] of G.glows) { tmp.copy(G.idle).multiplyScalar(.18 + w * .15); onC.copy(col).multiplyScalar(.3 + w * .8); m.material.color.copy(tmp.lerp(onC, act)); }
      for (const f of G.films) { f.material.uniforms.uC.value.copy(col); f.material.uniforms.uA.value = .08 + act * .5; f.material.uniforms.uT.value = t; }
      for (const d of G.discs) { d.material.uniforms.uC.value.copy(act > .02 ? col : G.idle); d.material.uniforms.uA.value = .2 + act * .9; d.material.uniforms.uT.value = t; }
      for (const r of Gt.road) { r.material.uniforms.uC.value.copy(col); r.material.uniforms.uA.value = act; r.material.uniforms.uT.value = t; } }
    /* 기체: 고른 문 한가운데서 살짝 떠 있음 · '들어가 보기'면 날아 들어와 0.5초 멈춤 → 3초 동안 갈 쪽으로 천천히 기울며 틂 → 빛 띠를 따라 멀리 날아감(카메라는 그대로) */
    const R = GATES[st.sel].root, cv = GATES[st.sel].curve; ship.visible = st.ship && SQ.ph !== 'gone';
    SQ.t += dt; let px = 0, py = SHIP_Y + Math.sin(t * 2.1) * .06, pz = .2, yaw = SQ.yaw0, bank = Math.sin(t * .9) * .04, pitch = 0; CH = Math.max(0, CH - dt * .8);
    const look = cv.getPointAt(.3), wantYaw = Math.atan2(-look.x, -look.z), wantPitch = Math.atan2(look.y - SHIP_Y, Math.hypot(look.x, look.z));
    if (SQ.ph === 'in') { const u = Math.min(1, SQ.t / 1.1), e = 1 - Math.pow(1 - u, 3), dd = THREE.MathUtils.lerp(9, 0, e); px = Math.sin(SQ.dir) * dd; pz = .2 + Math.cos(SQ.dir) * dd; py = SHIP_Y + (1 - e) * .4; if (u >= 1) { SQ.ph = 'wait'; SQ.t = 0; } }
    else if (SQ.ph === 'wait') { if (SQ.t >= .5) { SQ.ph = 'charge'; SQ.t = 0; } }
    else if (SQ.ph === 'charge') { const u = Math.min(1, SQ.t / 3), e = u * u * (3 - 2 * u); CH = u; const dY = Math.atan2(Math.sin(wantYaw - SQ.yaw0), Math.cos(wantYaw - SQ.yaw0)); yaw = SQ.yaw0 + dY * e;   /* 들어온 방향에서 갈 쪽으로 3초 동안 천천히 돎 · 도는 쪽으로 몸을 기울임 */
      bank = -Math.sign(dY || 1) * Math.min(.5, Math.abs(dY) * .3 + .12) * Math.sin(u * Math.PI); pitch = wantPitch * .5 * e; if (u >= 1) { SQ.ph = 'go'; SQ.t = 0; } }
    else if (SQ.ph === 'go') { CH = 1; if (SQ.t <= dt + 1e-4) boom(R, ship.position.clone().sub(R.position), cv.getTangentAt(0)); const u = Math.min(1, SQ.t / 1.15), e = 1 - Math.pow(1 - u, 2.6),   /* 3초 뒤 출발: 처음부터 확 빠르게 (점점 느려지며 멀어짐) */ p = cv.getPointAt(e), tg = cv.getTangentAt(e); px = p.x; py = p.y + .3; pz = p.z; yaw = Math.atan2(-tg.x, -tg.z); pitch = Math.atan2(tg.y, Math.hypot(tg.x, tg.z)); bank = -.25; if (u >= 1) { SQ.ph = 'gone'; SQ.t = 0; } }
    else if (SQ.ph === 'gone') { if (SQ.t > 1.2) { SQ.ph = 'idle'; SQ.t = 0; SQ.yaw0 = 0; } }
    ship.position.set(R.position.x + px, py, R.position.z + pz); ship.rotation.set(0, yaw, 0); ship.rotateX(pitch); ship.rotateZ(bank); ship.updateMatrixWorld(true);
    if (SW.t < .5) { SW.t += dt; const k = SW.t / .5; shock.visible = true; shock.scale.setScalar(.6 + k * 3.6); shockM.uniforms.uK.value = k; shockM.uniforms.uA.value = (1 - k) * (1 - k) * .9; shockM.uniforms.uC.value.copy(col); } else shock.visible = false;
    glow.begin();
    if (ship.visible) for (const p of ENG) { v3.copy(p).applyMatrix4(sm.matrixWorld); glow.add(v3.x, v3.y, v3.z, 0, 0, .5, .14, 3, [1.3, .45, .4], .9); }
    for (const Gt of GATES) for (let k = 0; k < 10; k++) { const u = (t * .12 + k / 10) % 1, p = Gt.curve.getPointAt(u); glow.add(Gt.root.position.x + p.x, p.y + .2, Gt.root.position.z + p.z, 0, .12, 0, .09, 3, col.toArray(), Math.sin(u * Math.PI) * act, k); }
    glow.end(); glow.uT.value = t;
    /* 카메라: 고른 문을 보며 끌어서 둘레를 돎 */
    const k = Math.min(1, dt * 4); cam.x += (R.position.x - cam.x) * k; cam.z += (R.position.z - cam.z) * k;
    const a = st.ang * Math.PI / 180, D = st.dist; camera.position.set(cam.x + Math.sin(st.yaw) * Math.cos(a) * D, cam.y + Math.sin(a) * D, cam.z + Math.cos(st.yaw) * Math.cos(a) * D); camera.lookAt(cam.x, cam.y, cam.z); camera.updateMatrixWorld();
    sea.material.uniforms.uT.value = t; sea.position.x = cam.x; sea.position.z = cam.z;
    renderer.setRenderTarget(bloom.scene); renderer.clear(); renderer.render(scene, camera);
    bloom.render(Wd, Hd, !perf.st.bloom); perf.tick(dt);
  } catch (e) { console.error('[입구 시안]', e); } });
  window.__gt = { st, GATES, SQ };
}
