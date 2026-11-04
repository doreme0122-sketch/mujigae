/* 빙하 얼음 벽 — 사용자 참고 그림(2026-11-04)과 똑같이 (예전 얼음 벽은 지움)
   그림에서 읽은 것 → 만드는 법
   ① 앞면: 거의 수직. 위아래가 뾰족한 세로 결정 조각(폭 0.5~1.6m)이 수십 개 붙어 한 면을 이룸 — 조각마다 튀어나온 정도가 달라
      등줄기(날카로운 세로 모서리)와 골(조각 사이 틈)이 생김 → 겉면을 '조각 피라미드들 중 가장 튀어나온 것'으로 계산(한 장의 겉면, 이음매 없음)
   ② 빛: 조각 사이 골(틈)과 속 금에서 청록 빛이 새어 나옴 · 모서리는 하얗게 빛을 받음 · 아래쪽 속이 더 짙고 밝게 빛남
   ③ 윗단: 거의 평평하게 길게 이어지되 몇 미터마다 한 단씩 오르내림(큰 판이 층져 쌓인 듯)
   ④ 눈: 윗단 전체를 두툼하게 덮고 앞 모서리로 둥글게 넘쳐 흘러내림
   ⑤ 고드름: 눈 아래 앞 모서리에서 아주 촘촘히, 길이 0.3~2.4m 들쭉날쭉 (긴 것 사이사이 짧은 것)
   ⑥ 뾰족한 결정 기둥: 문 쪽 끝에 두세 개 크게 · 윗단 군데군데 하나씩
   ⑦ 발치: 눈 덮인 큰 얼음 바위(1~2m) + 작은 조각 · 앞쪽 땅에 들쭉날쭉한 눈밭이 깔림
   무게: 벽 한 줄 = 얼음 1번 + 눈 1번 그리기 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { iceMaterial, block } from './ice.js?v=11042352';
import { SNOW_GLSL, SNOW_U } from './snowtone.js?v=11042352';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };
/* 모든 얼음 조각에 같은 속성(위치·노멀·aG 빛 세기)을 맞춤 → 한 묶음으로 합침 */
const prep = (g, glow = .15) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'aG') n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.aG) n.setAttribute('aG', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count).fill(glow), 1)); return n; };
const smoothG = Q => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m; };
const prepS = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); if (!n.attributes.normal) n.computeVertexNormals(); return n; };

/* 얼음 재질: 승인된 얼음 + 더 맑은 청록 + 조각 틈(aG)과 속 금에서 새는 빛 + 모서리 빛 + 서리 반짝임 */
export function iceWallMaterial(uT) {
  const m = iceMaterial(uT), prev = m.onBeforeCompile; m.color.set(0x0b3d5c);
  m.onBeforeCompile = sh => { prev(sh);
    sh.vertexShader = 'attribute float aG; varying float vG;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vG=aG;');
    sh.fragmentShader = 'varying float vG;\n' + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float fh=ih(floor(vNw*6.)+floor(vIw*.7)); diffuseColor.rgb=mix(diffuseColor.rgb*.7,diffuseColor.rgb*vec3(.9,1.25,1.4)+vec3(.04,.09,.12),fh);   /* 면마다 맑기가 다름 */
        vec3 q=vIw*vec3(1.6,.7,1.6); float l1=abs(inz(q)-.5), l2=abs(inz(q*2.7+3.)-.5);
        float hair=smoothstep(.018,.0,l1)*.6+smoothstep(.012,.0,l2)*.4; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.75,.85),hair*.5);   /* 겉의 하얀 잔금 */
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.6,.85,1.15),smoothstep(3.,.2,vIw.y)*.5); }`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
      { vec3 q=vIw*vec3(.5,.22,.5); float c1=abs(inz(q)-.5), c2=abs(inz(q*2.3+7.)-.5);
        float crack=smoothstep(.026,.0,c1)+smoothstep(.02,.0,c2)*.6, halo=smoothstep(.15,.0,c1)*.3;
        float seam=pow(clamp(vG,0.,1.),1.6);                                                        /* 조각 사이 틈 */
        float deep=smoothstep(4.5,.3,vIw.y);
        float ndv=abs(dot(normal,normalize(vViewPosition)));
        totalEmissiveRadiance+=vec3(.08,.55,1.)*(crack*.4+halo*.6+seam*1.7*(.5+.5*deep))*(.55+.45*ndv)+vec3(.1,.45,.9)*pow(1.-ndv,2.)*.25+vec3(.03,.18,.35)*deep*.5;
        float lip=smoothstep(.5,.95,dot(vNw,normalize(vec3(-.45,.78,-.42))))*(1.-smoothstep(.6,.95,vNw.y));
        totalEmissiveRadiance+=vec3(.7,.85,1.)*lip*.3;
        float sp=step(.993,ih(floor(vIw*16.)))*smoothstep(.3,.9,vNw.y+.4); totalEmissiveRadiance+=vec3(.8,.9,1.)*sp; }`); };
  m.customProgramCacheKey = () => 'ice-wall-ref';
  return m;
}
export function snowMaterial(uT) {
  /* 바닥 눈과 같은 계산(snowtone.js)으로 색을 냄 → 벽 눈 = 바닥 눈 */
  return new THREE.ShaderMaterial({ uniforms: { uSG: SNOW_U.uSG, uT: uT || { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .78, -.42).normalize() } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'precision highp float; varying vec3 vW; varying vec3 vN; uniform float uT; uniform vec3 uSun;\n' + SNOW_GLSL +
      'void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; gl_FragColor=vec4(snowTone(n,normalize(cameraPosition-vW),vW,uSun,uT),1.); }' });
}
export function makeIceWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || iceWallMaterial(uT), smat = opt.smat || snowMaterial(uT), doors = opt.doors || [true, true];
  const seed = opt.seed || 3, R = (() => { let s = seed * 7919 + 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), o = seed * 1.3;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const Hm = opt.H || 3.7, W = 1., DS = .2, N = Math.max(4, Math.round(len / DS));
  /* ③ 윗단: 2~5m 판마다 높이 한 단씩 (거의 평평, 완만히 오르내림) · 문 쪽 끝은 높게 */
  const slab = []; for (let d = 0; d < len;) { const l = 2 + R() * 3; slab.push([d, d + l, (R() - .5) * 1.3]); d += l; }
  const topH = d => { const sb = slab.find(q => d >= q[0] && d < q[1]) || slab[slab.length - 1]; let h = Hm + sb[2] * .55 + .25 * Math.sin(d * .07 + o);
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, dd = Math.min(ds, de); h += Math.exp(-dd * dd / 12) * 1.3;
    if (!doors[0] && d < 1.5) h *= .55 + .45 * d / 1.5; if (!doors[1] && len - d < 1.5) h *= .55 + .45 * (len - d) / 1.5; return h; };
  /* ① 결정 조각 (앞면 · 뒷면 따로) */
  const shards = side => { const L = []; for (let d = -.5; d < len + .5; d += .35 + R() * .7) { const big = R() < .18;
      L.push({ d, w: (big ? .9 : .45) + R() * (big ? .9 : .6), p: ((big ? .75 : .35) + R() * (big ? .6 : .45)) * .67, y0: -.3 + R() * (big ? .2 : 1.4), y1: .55 + R() * .5, lean: (R() - .5) * .25 }); } return L; };
  const SH = { '-1': shards(-1), '1': shards(1) }, PMAX = .9;
  const shardOff = (d, yk, side) => { let m = 0, best = 0; const L = SH[side];
    for (const s of L) { const dd = d - s.d - s.lean * yk * 2; if (Math.abs(dd) > s.w) continue; const t0 = (yk - s.y0) / Math.max(.05, s.y1 - s.y0); if (t0 < 0 || t0 > 1.05) continue;
      const env = Math.min(1, t0 / .25, (1.05 - t0) / .3); if (env <= 0) continue; const v = s.p * (1 - Math.abs(dd) / s.w) * env; if (v > m) { m = v; } }
    return m; };
  const p = new THREE.Vector3(), tg = new THREE.Vector3(), fr = [];
  for (let i = 0; i <= N; i++) { const d = i / N * len; curve.getPointAt(i / N, p); curve.getTangentAt(i / N, tg); let nx = -tg.z, nz = tg.x; const sg = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sg; nz *= sg;
    fr.push({ d, x: p.x, z: p.z, nx, nz, tx: tg.x, tz: tg.z, h: topH(d), sg }); }
  const FL = fr[0].sg < 0;
  /* 단면: 앞면(아래→위) 줄 · 윗단 · 뒷면(위→아래) 줄 — 줄마다 (v, y, 빛) */
  const RF = [0, .06, .13, .21, .3, .4, .5, .6, .7, .79, .87, .94, 1], RB = [0, .2, .45, .7, .9, 1];
  const faceRow = (f, side, yk) => { const y = Math.max(-.3, -.3 + (f.h + .3) * yk), off = shardOff(f.d, yk, side), foot = Math.max(0, .18 - yk) * 2, lean = -.06 * yk;
    const base = W + foot + (vn(f.d * .35 + side * 9, yk * 2, o) - .5) * .35 + lean; return [side * (base + off), y, (1 - off / PMAX) * (.4 + .6 * (1 - yk))]; };
  const section = f => { const out = [];
    for (const yk of RF) out.push(faceRow(f, -1, yk));
    out.push([-W + .25 + (vn(f.d * .8, 3, o) - .5) * .2, f.h + .05, .05], [(vn(f.d * .6, 5, o) - .5) * .6, f.h + .12 + vn(f.d * .4, 6, o) * .15, .05], [W - .25, f.h + .03, .05]);
    for (let k = RB.length - 1; k >= 0; k--) out.push(faceRow(f, 1, RB[k]));
    return out; };
  const S = fr.map(section), M = S[0].length, P = [], G = [];
  const pt = (i, k) => { const f = fr[i], [v, y] = S[i][k]; return [f.x + f.nx * v, y, f.z + f.nz * v]; };
  const tri = (a, b, c, ga, gb, gc) => { if (FL) { P.push(...a, ...c, ...b); G.push(ga, gc, gb); } else { P.push(...a, ...b, ...c); G.push(ga, gb, gc); } };
  for (let i = 0; i < N; i++) for (let k = 0; k < M - 1; k++) { const a = pt(i, k), b = pt(i + 1, k), c = pt(i, k + 1), d = pt(i + 1, k + 1), g = (ii, kk) => S[ii][kk][2];
    tri(a, c, b, g(i, k), g(i, k + 1), g(i + 1, k)); tri(b, c, d, g(i + 1, k), g(i, k + 1), g(i + 1, k + 1)); }
  /* 끝 단면: 단면 테두리를 그대로 따라 세모로 나눠 막음(가운데 한 점 부채 X → 들어간 곳이 겹치거나 비지 않음) · 바깥(길 방향)을 보게 */
  const capPoly = (i, ring, glow, out) => { const f = fr[i], dir = i === 0 ? -1 : 1, tx = f.tx * dir, tz = f.tz * dir;
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(q => new THREE.Vector2(q[0], q[1])), []);
    const W3 = q => [f.x + f.nx * q[0], q[1], f.z + f.nz * q[0]];
    for (const [x, y, z] of tris) { const A = W3(ring[x]), B = W3(ring[y]), C = W3(ring[z]);
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx; const ok = nx * tx + nz * tz >= 0;
      if (ok) out.push(A, B, C); else out.push(A, C, B); if (glow) G.push(glow, glow, glow); } };
  for (const i of [0, N]) { const L = []; capPoly(i, S[i].map(q => [q[0], q[1]]), .3, L); for (const q of L) P.push(...q); }
  const ice = []; { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aG', new THREE.Float32BufferAttribute(G, 1)); g.computeVertexNormals(); ice.push(g); }
  const snow = [];
  /* ④ 눈: 윗단 전체 + 앞 모서리로 둥글게 넘쳐 흘러내림 */
  /* 눈이 얹히는 모서리 자리는 앞뒤 단면 몇 개를 고르게 평균 → 얼음 조각의 잔 들쭉날쭉이 눈에 세로 줄무늬로 옮지 않게 */
  const avgS = (i, k) => { let v = 0, y = 0, n = 0; for (let j = Math.max(0, i - 4); j <= Math.min(N, i + 4); j++) { const w = 5 - Math.abs(j - i); v += S[j][k][0] * w; y += S[j][k][1] * w; n += w; } return [v / n, y / n]; };
  const SM = fr.map((_, i) => { const iT = RF.length - 1; return [0, 1, 2, 3, 4].map(k => avgS(i, iT + k)); });
  { const Q = [], iT = RF.length - 1, top = (i, k, loc) => { const f = fr[i], fe = SM[i][0], be = SM[i][4], t = .32 + vn(f.d * .9, 1, o) * .22, drip = vn(f.d * 1.7, 2, o);
      const sec = [[fe[0] - .12, fe[1] - .35 - drip * .5], [fe[0] - .2, fe[1] + t * .55], [fe[0] + .3, f.h + t], [SM[i][2][0], SM[i][2][1] + t * 1.05], [be[0] - .35, f.h + t * .9], [be[0] + .12, be[1] + t * .4], [be[0] + .1, be[1] - .3]][k];
      return loc ? sec : [f.x + f.nx * sec[0], sec[1], f.z + f.nz * sec[0]]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 6; k++) { const a = top(i, k), b = top(i + 1, k), c = top(i, k + 1), d = top(i + 1, k + 1); FL ? Q.push(...a, ...b, ...c, ...b, ...d, ...c) : Q.push(...a, ...c, ...b, ...b, ...c, ...d); }
    snow.push(smoothG(Q)); Q.length = 0;   /* 윗면 눈: 매끈한 면(꼭짓점 노멀을 이웃과 고르게) */
    for (const i of [0, N]) { const L = [], ring = [0, 1, 2, 3, 4, 5, 6].map(k => top(i, k, true)).concat([4, 3, 2, 1, 0].map(k => SM[i][k]));
      capPoly(i, ring, 0, L); const dir = i === 0 ? -1 : 1, ex = fr[i].tx * dir * .015, ez = fr[i].tz * dir * .015; for (const q of L) Q.push(q[0] + ex, q[1], q[2] + ez); }
    /* 눈 끝 막음: 눈 겉면 ~ 얼음 윗면 사이만 채움(얼음 단면과 같은 자리에 겹치면 둘이 번갈아 깜빡이며 깨져 보임) + 1.5cm 바깥으로 */
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.computeVertexNormals(); snow.push(g); }
  /* ⑤ 고드름: 없앰 (사용자 2026-11-04) */
  /* ⑥ 뾰족한 결정 기둥 */
  const spire = (d, v, hh, r, tilt) => { const i = Math.round(d / len * N), f = fr[Math.min(N, Math.max(0, i))]; const g = new THREE.CylinderGeometry(0, r, hh, 5 + Math.floor(R() * 2), 3);
    const P2 = g.attributes.position; for (let j = 0; j < P2.count; j++) { P2.setX(j, P2.getX(j) * (1 + (R() - .5) * .25)); P2.setZ(j, P2.getZ(j) * (.75 + R() * .3)); }
    g.rotateY(R() * 6); g.rotateZ(tilt * (R() < .5 ? -1 : 1)); g.rotateX((R() - .5) * tilt); g.translate(f.x + f.nx * v, f.h + hh / 2 - .3, f.z + f.nz * v); ice.push(prep(g, .55)); };
  for (const end of [0, 1]) if (doors[end]) { const d0 = end ? len - .8 : .8; spire(d0, -.2, 3.2 + R() * 1.4, .7, .12); spire(d0 + (end ? -1.3 : 1.3), .4, 2.2 + R() * 1.2, .5, .25); }
  for (let d = 5 + R() * 5; d < len - 3; d += 7 + R() * 9) spire(d, (R() - .5) * 1.4, 1.1 + R() * 1.6, .35 + R() * .25, .2);
  /* ⑦ 발치: 눈 덮인 큰 얼음 바위 + 작은 조각 (앞쪽 많이, 뒤쪽 조금) */
  const rock = (d, v, s) => { const i = Math.round(d / len * N), f = fr[Math.min(N, Math.max(0, i))], g = prep(block(seed * 31 + Math.floor(d * 7)).clone(), .2), sy = s * (.75 + R() * .45);
    g.scale(s * (.9 + R() * .4), sy, s * (.8 + R() * .3)); g.rotateY(R() * 6); const x = f.x + f.nx * v, z = f.z + f.nz * v; g.translate(x, sy * .25, z); ice.push(g);
    /* 바위 위 눈: 바위 윗면 모양 그대로 따라 쌓임 (각진 면엔 각지게) · 바람 쪽으로 쏠림 · 바위마다 양이 다름(안 덮인 것도) */
    const amt = R(); if (amt > .2) { const th = (amt > .75 ? .2 : amt > .45 ? .11 : .05) * Math.min(1.4, s + .3), wind = new THREE.Vector3(R() - .5, 0, R() - .5).normalize(), lim = .42 - amt * .15;
      g.computeVertexNormals(); const A = g.attributes.position, Nn = g.attributes.normal, Q = [], a = new THREE.Vector3(), nn = new THREE.Vector3();
      for (let t = 0; t < A.count; t += 3) { nn.fromBufferAttribute(Nn, t); if (nn.y + nn.dot(wind) * .35 < lim) continue;
        for (let k = 0; k < 3; k++) { a.fromBufferAttribute(A, t + k); const w = th * (.6 + .8 * vn(a.x * 3, a.y * 3, a.z * 3)) * Math.min(1, (nn.y - lim + .15) * 2);
          Q.push(a.x + nn.x * w * .15, a.y + w, a.z + nn.z * w * .15); } }
      if (Q.length) { const c = new THREE.BufferGeometry(); c.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); c.computeVertexNormals(); snow.push(c); } } };
  for (let d = .5 + R(); d < len - .3; d += .9 + R() * 2.2) { const big = R() < .35; rock(d, -(W + 1.2 + R() * (big ? 1.6 : 2.6)), big ? .9 + R() * .9 : .25 + R() * .4); }
  for (let d = 1 + R() * 2; d < len - .5; d += 2.5 + R() * 4) rock(d, W + 1.1 + R() * 1.2, .3 + R() * .6);
  /* 앞쪽 땅 눈밭 (들쭉날쭉한 가장자리) */
  { const Q = [], sk = (i, k) => { const f = fr[i], reach = 2.4 + vn(f.d * .3, 4, o) * 3.2, vv = -(W + .2 + [0, .6, reach * .55, reach][k] + (k ? 0 : 0)), y = [.55, .32, .14, -.04][k] + (k < 3 ? (vn(f.d * 1.5, k, o) - .5) * .1 : 0);
      return [f.x + f.nx * vv, y, f.z + f.nz * vv]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const a = sk(i, k), b = sk(i + 1, k), c = sk(i, k + 1), d = sk(i + 1, k + 1); (!FL) ? Q.push(...a, ...b, ...c, ...b, ...d, ...c) : Q.push(...a, ...c, ...b, ...b, ...c, ...d); }
    snow.push(smoothG(Q)); }   /* 발치 눈밭도 매끈하게 */
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(mergeGeometries(ice.map(g => prep(g))), mat), new THREE.Mesh(mergeGeometries(snow.map(prepS)), smat));
  grp.userData = { mat, smat, len };
  return grp;
}
