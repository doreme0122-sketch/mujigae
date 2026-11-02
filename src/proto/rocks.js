/* 지역 경계 벽 — 바위 능선 3종 (그냥 바위 · 용암 바위 · 운석)
   만드는 법: 덩어리 하나하나를 실제 바위처럼 깎는다.
   · 울퉁불퉁한 덩어리 → 여러 방향의 평면으로 잘라 깨진 면을 만든다(쪼개진 바위의 납작한 단면).
   · 패인 곳은 어둡게(빛이 덜 들어감), 튀어나온 모서리는 닳아서 밝게.
   · 그냥 바위: 결이 비스듬히 쌓인 퇴적암 + 틈의 먼지
   · 용암 바위: 식어서 검게 굳은 겉껍질, 그 갈라진 틈으로 아직 뜨거운 용암이 숨 쉬듯 빛남
   · 운석: 대기권을 지나며 녹았다 굳은 매끈한 겉(엄지로 누른 듯한 자국), 깨진 곳은 쇠붙이처럼 반짝
   한 종류당 덩어리 모양 6가지를 미리 깎아 두고, 능선은 그걸 돌리고 키워서 늘어놓는다(그리기 횟수 적게). */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* ───── 3D 잡음 (모양 깎을 때) ───── */
function hash(a, b, c) { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, s = t => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v), L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w); }
const fbm = (x, y, z, o = 5) => { let s = 0, a = .5, q = 1; for (let i = 0; i < o; i++) { s += (vn(x * q, y * q, z * q) - .5) * a; a *= .5; q *= 2.07; } return s; };
const ridged = (x, y, z) => { let s = 0, a = .5, q = 1; for (let i = 0; i < 4; i++) { s += (1 - Math.abs(vn(x * q, y * q, z * q) * 2 - 1)) * a; a *= .5; q *= 2.1; } return s; };

/* ───── 덩어리 깎기 ───── */
export function chunk(kind, seed) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  let g = new THREE.IcosahedronGeometry(1, kind === 'meteor' ? 5 : 4); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const P = g.attributes.position, n = P.count, v = new THREE.Vector3(), rad = new Float32Array(n);
  const sx = .8 + R() * .55, sy = kind === 'meteor' ? .75 + R() * .25 : .55 + R() * .35, sz = .8 + R() * .55;
  /* 잘린 면: 운석은 거의 없고(녹아서 둥긂), 바위는 많이 */
  const cuts = []; const nc = kind === 'meteor' ? 0 : kind === 'obsidian' ? 11 + Math.floor(R() * 5) : 8 + Math.floor(R() * 5);
  for (let i = 0; i < nc; i++) { const d = new THREE.Vector3(R() - .5, (R() - .5) * (kind === 'plain' ? 1.4 : .9), R() - .5).normalize(); cuts.push([d, kind === 'obsidian' ? .3 + R() * .32 : .38 + R() * .3]); }
  /* 운석의 엄지 자국: 얕고 넓은 둥근 패임 여러 개 */
  const dents = []; if (kind === 'meteor') for (let i = 0; i < 40; i++) dents.push([new THREE.Vector3(R() - .5, R() - .5, R() - .5).normalize(), .12 + R() * .14, .012 + R() * .018]);
  const o = seed * 3.17;
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i);
    let r = 1;
    if (kind === 'meteor') { r += fbm(v.x * 1.1 + o, v.y * 1.1, v.z * 1.1 - o, 3) * .35;
      for (const [d, w, dp] of dents) { const t = v.distanceTo(d) / w; if (t < 1) r -= dp * (1 - t * t) * (1 - t * t); } }
    else if (kind === 'obsidian') r += fbm(v.x * .9 + o, v.y * .9, v.z * .9 - o, 2) * .3;            /* 유리처럼 매끈: 잘게 울퉁불퉁하지 않음 */
    else { r += fbm(v.x * 1.1 + o, v.y * 1.1, v.z * 1.1 - o, 3) * .45 + (ridged(v.x * 2.6 + o, v.y * 2.6, v.z * 2.6) - .55) * .12; }
    v.multiplyScalar(r); v.x *= sx; v.y *= sy; v.z *= sz;
    for (const [d, k] of cuts) { const h = v.dot(d); if (h > k) v.addScaledVector(d, -(h - k) * .96); }   /* 쪼개진 납작한 면 */
    if (kind !== 'meteor' && kind !== 'obsidian') v.addScaledVector(v.clone().normalize(), fbm(v.x * 6 + o, v.y * 6, v.z * 6, 3) * .05);   /* 단면도 거칠게 */
    if (v.y < -.35 * sy) v.y = -.35 * sy + (v.y + .35 * sy) * .25;                                       /* 밑은 납작하게 앉음 */
    P.setXYZ(i, v.x, v.y, v.z); rad[i] = v.length(); }
  g.computeVertexNormals();
  /* 패인 곳 찾기: 이웃보다 안쪽이면 어둡게 */
  const I = g.index.array, sum = new Float32Array(n), cnt = new Float32Array(n);
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) { const a = I[t + k], b = I[t + (k + 1) % 3]; sum[a] += rad[b]; cnt[a]++; sum[b] += rad[a]; cnt[b]++; }
  const col = new Float32Array(n * 3), N = g.attributes.normal;
  const axis = new THREE.Vector3(R() - .5, 1.6, R() - .5).normalize();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); const cav = rad[i] - sum[i] / cnt[i];     /* +: 튀어나옴, -: 패임 */
    let ao = THREE.MathUtils.clamp(1 + cav * 11, .3, 1.35);
    const ny = N.getY(i);
    let c;
    if (kind === 'plain') { const band = .5 + .5 * Math.sin(v.dot(axis) * 13 + fbm(v.x * 3, v.y * 3, v.z * 3) * 4);          /* 비스듬한 결 */
      const base = .05 + band * .045 + fbm(v.x * 4 + 7, v.y * 4, v.z * 4) * .04, dust = Math.max(0, ny) * Math.max(0, -cav * 14) * .09;
      const warm = .5 + fbm(v.x * 1.5 + 2, v.y * 1.5, v.z * 1.5) * 1.2; c = [base * (1 + warm * .12) + dust * .55, base * .97 + dust * .5, base * (.92 - warm * .08) + dust * .42]; }
    else if (kind === 'obsidian') { const base = .008 + fbm(v.x * 3, v.y * 3, v.z * 3) * .006; c = [base * .95, base * .85, base * 1.15]; }
    else if (kind === 'lava') { const base = .022 + fbm(v.x * 5, v.y * 5, v.z * 5) * .016;
      c = [base * 1.1, base * .95, base * .9]; }
    else { const fused = .028 + fbm(v.x * 7, v.y * 7, v.z * 7) * .012, rust = Math.max(0, fbm(v.x * 2.5 + 3, v.y * 2.5, v.z * 2.5)) * .08;
      c = [fused + rust * .5, fused * .92 + rust * .28, fused * .85 + rust * .12]; }
    col[i * 3] = c[0] * ao; col[i * 3 + 1] = c[1] * ao; col[i * 3 + 2] = c[2] * ao; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); return g;
}

/* ───── 재질 ───── */
const NOISE = `float rh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float rn(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(rh(i),rh(i+vec3(1,0,0)),f.x),mix(rh(i+vec3(0,1,0)),rh(i+vec3(1,1,0)),f.x),f.y),mix(mix(rh(i+vec3(0,0,1)),rh(i+vec3(1,0,1)),f.x),mix(rh(i+vec3(0,1,1)),rh(i+vec3(1,1,1)),f.x),f.y),f.z); }
vec2 vcell(vec3 p){ vec3 i=floor(p),f=fract(p); float a=9.,b=9.; for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec3 g=vec3(x,y,z); vec3 o=vec3(rh(i+g),rh(i+g+5.3),rh(i+g+9.1)); float d=length(g+o-f); if(d<a){b=a;a=d;}else if(d<b)b=d; } return vec2(a,b-a); }`;
/* 용암 흑요석: 용암이 식어 생긴 검은 유리. 깨진 면은 거울처럼 매끈해 주변 빛이 비친다.
   평소엔 빛나지 않는다. 탄에 맞으면 맞은 자리 둘레의 틈만 용암빛이 확 들어왔다가 0.4초쯤에 식는다(넓게 번지지 않음 — 가볍고 전투가 잘 보임).
   맞는 순간 틈 옆 얇은 유리 막에서 빛이 갈라져 무지개가 아주 짧게 반짝인다(칠한 무지개가 아님). */
export const NHIT = 16;
export const HITS = { value: Array.from({ length: NHIT }, () => new THREE.Vector4(0, -99, 0, -99)) };   /* 맞은 자리 (x,y,z, 맞은 시각) — 모든 벽이 같이 씀 */
/* 새로 맞으면: 바로 옆에 방금 맞은 자리가 있으면 합치고(쌍발 두 알), 아니면 이미 다 식은 칸 → 없으면 가장 오래된 칸에 넣는다.
   (차례대로 덮어쓰면 다른 곳에서 번지던 빛이 갑자기 사라짐) */
export function hitWall(x, y, z, t) { const H = HITS.value; let best = 0, bestAge = -1;
  for (let i = 0; i < NHIT; i++) { const h = H[i], age = t - h.w;
    if (age < .08 && Math.hypot(h.x - x, h.y - y, h.z - z) < .6) return;
    if (age > .8) { best = i; bestAge = 99; break; }
    if (age > bestAge) { bestAge = age; best = i; } }
  H[best].set(x, y, z, t); }
const WAVE = `uniform vec4 uHits[16];
  /* 맞은 자리 둘레만 짧게: 지름 3m 남짓(기체 하나 반), 0.6초쯤에 식는다 (x = 뜨거움, y = 맞는 순간의 번쩍) */
  vec2 hitGlow(vec3 w, float t){ float h=0., f=0.;
    for(int i=0;i<16;i++){ float age=t-uHits[i].w; if(age<0.||age>.8) continue; vec3 d3=w-uHits[i].xyz; float d2=dot(d3,d3); if(d2>10.) continue;
      float fall=exp(-d2*.5);
      h+=fall*exp(-age*5.5);
      f+=fall*exp(-age*28.); }
    return vec2(h,f); }`;
export function obsidianMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .1, metalness: 0, clearcoat: .6, clearcoatRoughness: .05, envMapIntensity: .38, ior: 1.5, specularIntensity: 1 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'varying vec3 vRp; varying vec3 vWq;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRp=position;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vWq=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; varying vec3 vRp; varying vec3 vWq; ${NOISE} ${WAVE}
      vec3 film(float d,float ct){ vec3 ph=6.2832*2.*1.5*d*ct/vec3(640.,540.,450.); return .5-.5*cos(ph); }\n` + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 q=vRp*3.; float e=.04; float h0=rn(q); vec3 gr=vec3(rn(q+vec3(e,0,0))-h0,rn(q+vec3(0,e,0))-h0,rn(q+vec3(0,0,e))-h0)/e;   /* 조개껍질처럼 물결진 깨진 면 */
          normal=normalize(normal-(mat3(viewMatrix)*gr)*.03); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { vec2 hg=hitGlow(vWq,uT);
          if(hg.x>.003){
            vec3 wq=vRp+vec3(rn(vRp*1.5),rn(vRp*1.5+3.),rn(vRp*1.5+7.))*.7;
            vec2 c=vcell(wq*1.9); vec2 c2=vcell(wq*4.6+5.);
            float crack=smoothstep(.05,.0,c.y)+smoothstep(.035,.0,c2.y)*.6;
            float heat=crack*hg.x*3.4;
            vec3 hot=mix(vec3(.9,.12,.02),vec3(1.,.42,.08),clamp(hg.x*1.5,0.,1.));            /* 식으면서 주황 → 짙은 빨강 */
            totalEmissiveRadiance+=hot*heat*2.4+vec3(1.,.7,.35)*pow(max(heat,0.),2.2)*1.2*hg.y;
            totalEmissiveRadiance+=vec3(1.,.5,.2)*hg.y*.9+vec3(.9,.15,.02)*smoothstep(.25,0.,c.y)*hg.x*.35;                                      /* 맞는 순간 그 자리가 확 */
            float ct=abs(dot(normalize(normal),vec3(0.,0.,1.)));
            float rim=smoothstep(.12,.05,c.y)-smoothstep(.05,.0,c.y);                              /* 틈 옆 얇은 막: 맞는 순간만 무지개 */
            totalEmissiveRadiance+=film(280.+260.*rn(vRp*4.),ct)*rim*(1.-ct)*hg.y*1.6; } }`); };
  m.customProgramCacheKey = () => 'rock-obsidian-hit';
  return m;
}
export function rockMaterial(kind, uT) {
  if (kind === 'obsidian') return obsidianMaterial(uT);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: kind === 'meteor' ? .62 : .92, metalness: kind === 'meteor' ? .3 : .03, envMapIntensity: kind === 'meteor' ? .7 : .3 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = 'varying vec3 vRp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRp=position;');
    sh.fragmentShader = `uniform float uT; varying vec3 vRp; ${NOISE}\n` + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 q=vRp*${kind === 'meteor' ? '5.' : '8.'}; float e=.03;                           /* 겉면의 잔결: 빛이 걸리는 오돌토돌함 */
          float h0=rn(q)+rn(q*2.7)*.45; vec3 gr=vec3(rn(q+vec3(e,0,0))+rn((q+vec3(e,0,0))*2.7)*.45-h0, rn(q+vec3(0,e,0))+rn((q+vec3(0,e,0))*2.7)*.45-h0, rn(q+vec3(0,0,e))+rn((q+vec3(0,0,e))*2.7)*.45-h0)/e;
          normal=normalize(normal-(mat3(viewMatrix)*gr)*${kind === 'meteor' ? '.018' : '.04'}); }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        ${kind === 'meteor' ? 'float chip=smoothstep(.74,.8,rn(vRp*2.6+4.)); roughnessFactor=mix(.68,.3,chip); metalnessFactor=mix(.25,.9,chip);' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${kind === 'meteor' ? 'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.2,.19,.18),smoothstep(.74,.8,rn(vRp*2.6+4.)));                  /* 깨진 곳: 속의 쇠가 드러남 */' : ''}
        ${kind === 'lava' ? `{ vec3 wq=vRp+vec3(rn(vRp*1.7),rn(vRp*1.7+3.),rn(vRp*1.7+7.))*.6;      /* 반듯한 그물이 안 되게 비틂 */
            vec2 c=vcell(wq*2.2); vec2 c2=vcell(wq*5.3+3.);
            float live=smoothstep(.3,.62,rn(vRp*1.2+vec3(0.,uT*.04,0.)));                         /* 틈 일부만 아직 뜨겁다 */
            float crack=smoothstep(.055,.0,c.y)*.9+smoothstep(.035,.0,c2.y)*.5*live;               /* 식은 껍질의 갈라진 틈 */
            float br=.75+.25*sin(uT*1.3+rn(vRp*3.)*6.);                                          /* 숨 쉬듯 */
            float heat=crack*live*br;
            diffuseColor.rgb*=1.-smoothstep(.1,0.,c.y)*.5*live;                                       /* 틈 가장자리는 그을려 더 검게 */
            totalEmissiveRadiance+=vec3(1.,.28,.04)*heat*3.2+vec3(1.,.65,.25)*pow(max(heat,0.),3.)*2.5+vec3(.9,.18,.02)*smoothstep(.3,0.,c.y)*live*.22; }` : ''}`); };
  m.customProgramCacheKey = () => 'rock-' + kind;
  return m;
}

/* ───── 능선: 길을 따라 덩어리를 늘어놓는다 ───── */
export function makeRidge(kind, path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = rockMaterial(kind, uT);
  const geos = [0, 1, 2, 3, 4, 5].map(i => chunk(kind, i + 1 + ({ lava: 20, meteor: 40, obsidian: 60 }[kind] || 0)));
  const R = (() => { let s = (opt.seed || 7) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const items = [], width = opt.width || 3.4;
  /* 큰 덩어리가 등뼈, 중간이 살, 작은 돌이 발치에 */
  const put = (u, side, s, y) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x;
    items.push({ g: Math.floor(R() * 6), x: p.x + nx * side, z: p.z + nz * side, y, s, q: new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - .5) * .5, R() * 6.28, (R() - .5) * .5)), sq: [1 + (R() - .5) * .4, 1 + (R() - .5) * .5, 1 + (R() - .5) * .4] }); };
  for (let d = 0; d < len; d += 2.0 + R() * 1.2) { const u = d / len, edge = Math.min(u, 1 - u) * len / 6, k = Math.min(1, .45 + edge);
    put(u, (R() - .5) * width * .3, (1.7 + R() * 1.2) * k, .1 + R() * .5); }
  for (let d = 0; d < len; d += 1.4 + R() * 1.1) { const u = d / len, k = Math.min(1, .5 + Math.min(u, 1 - u) * len / 6);
    put(u, (R() < .5 ? -1 : 1) * width * (.3 + R() * .3), (.7 + R() * .8) * k, R() * .3 - .2); }
  for (let d = 0; d < len; d += .55 + R() * .5) { const u = d / len; put(u, (R() < .5 ? -1 : 1) * width * (.6 + R() * .55), .25 + R() * .55, -.25 + R() * .2); }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  if (opt.float) { let lastX = -1e9; for (const it of items.filter(i => i.s > 1.9).sort((a, b) => a.x - b.x)) { if (it.x - lastX < 7) continue; lastX = it.x; it.skip = true; } }
  geos.forEach((g, gi) => { const mine = items.filter(it => it.g === gi && !it.skip); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((it, j) => { m4.compose(pos.set(it.x, it.y, it.z), it.q, sc.set(it.s * it.sq[0], it.s * it.sq[1], it.s * it.sq[2])); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  /* 떠 있는 큰 바위: 바닥에서 떨어져 천천히 돌고, 서로 · 아래 바위와 녹은 용암 실로 이어진다 */
  const fl = [];
  if (opt.float) { const big = items.filter(it => it.s > 1.9).sort((a, b) => a.x - b.x); let lastX = -1e9;
    for (const it of big) { if (it.x - lastX < 7) continue; lastX = it.x; it.float = true;
      const ms = new THREE.Mesh(geos[it.g], mat); ms.scale.set(it.s * it.sq[0] * .8, it.s * it.sq[1] * .8, it.s * it.sq[2] * .8); ms.quaternion.copy(it.q); grp.add(ms);
      const below = items.filter(o => !o.float && o.s > .9).sort((a, b) => Math.hypot(a.x - it.x, a.z - it.z) - Math.hypot(b.x - it.x, b.z - it.z))[0];
      fl.push({ it, ms, ph: R() * 6.28, h: 2.2 + R() * 1.6, spin: (R() - .5) * .25, below }); } }
  grp.userData = { items, curve, len, uT, kind, fl };
  return grp;
}

/* 매 프레임: 떠 있는 바위 움직이기 + 용암 실 그리기 (glow 공용 블록에) */
const _q = new THREE.Quaternion(), _ax = new THREE.Vector3(0, 1, 0);
export function updateRidge(grp, t, dt, glow) {
  const { fl, kind } = grp.userData; if (!fl || !fl.length) return;
  for (const f of fl) { const it = f.it, y = it.y + f.h + Math.sin(t * .45 + f.ph) * .35;
    f.ms.position.set(it.x, y, it.z); f.ms.quaternion.premultiply(_q.setFromAxisAngle(_ax, f.spin * dt)); f.y = y; }

}
