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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { iceMaterial, block } from './ice.js';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };
/* 모든 얼음 조각에 같은 속성(위치·노멀·aG 빛 세기)을 맞춤 → 한 묶음으로 합침 */
const prep = (g, glow = .15) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'aG') n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.aG) n.setAttribute('aG', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count).fill(glow), 1)); return n; };
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
export function snowMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xbccbdc, roughness: .88, metalness: 0, envMapIntensity: .4, emissive: 0x0a1626, emissiveIntensity: .55 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vSw; varying vec3 vSn;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vSw=(modelMatrix*vec4(transformed,1.)).xyz; vSn=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = `varying vec3 vSw; varying vec3 vSn; float sh1(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float sn(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(sh1(i),sh1(i+vec3(1,0,0)),f.x),mix(sh1(i+vec3(0,1,0)),sh1(i+vec3(1,1,0)),f.x),f.y),mix(mix(sh1(i+vec3(0,0,1)),sh1(i+vec3(1,0,1)),f.x),mix(sh1(i+vec3(0,1,1)),sh1(i+vec3(1,1,1)),f.x),f.y),f.z); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float drift=sn(vSw*1.3)*.6+sn(vSw*4.)*.4; diffuseColor.rgb*=.86+.26*drift;
          diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.72,.86,1.12),diffuseColor.rgb,smoothstep(-.2,.8,vSn.y));
          float sp=step(.988,sh1(floor(vSw*22.)))*smoothstep(.3,.9,vSn.y); totalEmissiveRadiance+=vec3(.9,.95,1.)*sp*.8; }`); };
  m.customProgramCacheKey = () => 'snow-ref';
  return m;
}

export function makeIceWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || iceWallMaterial(uT), smat = opt.smat || snowMaterial(), doors = opt.doors || [true, true];
  const seed = opt.seed || 3, R = (() => { let s = seed * 7919 + 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), o = seed * 1.3;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const Hm = opt.H || 4.4, W = 1.5, DS = .2, N = Math.max(4, Math.round(len / DS));
  /* ③ 윗단: 2~5m 판마다 높이 한 단씩 (거의 평평, 완만히 오르내림) · 문 쪽 끝은 높게 */
  const slab = []; for (let d = 0; d < len;) { const l = 2 + R() * 3; slab.push([d, d + l, (R() - .5) * 1.3]); d += l; }
  const topH = d => { const sb = slab.find(q => d >= q[0] && d < q[1]) || slab[slab.length - 1]; let h = Hm + sb[2] * .55 + .25 * Math.sin(d * .07 + o);
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, dd = Math.min(ds, de); h += Math.exp(-dd * dd / 12) * 1.3;
    if (!doors[0] && d < 1.5) h *= .55 + .45 * d / 1.5; if (!doors[1] && len - d < 1.5) h *= .55 + .45 * (len - d) / 1.5; return h; };
  /* ① 결정 조각 (앞면 · 뒷면 따로) */
  const shards = side => { const L = []; for (let d = -.5; d < len + .5; d += .35 + R() * .7) { const big = R() < .18;
      L.push({ d, w: (big ? .9 : .45) + R() * (big ? .9 : .6), p: (big ? .75 : .35) + R() * (big ? .6 : .45), y0: -.3 + R() * (big ? .2 : 1.4), y1: .55 + R() * .5, lean: (R() - .5) * .25 }); } return L; };
  const SH = { '-1': shards(-1), '1': shards(1) }, PMAX = 1.35;
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
  const faceRow = (f, side, yk) => { const y = Math.max(-.3, -.3 + (f.h + .3) * yk), off = shardOff(f.d, yk, side), foot = Math.max(0, .18 - yk) * 3.2, lean = -.06 * yk;
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
  for (const i of [0, N]) { const c = [fr[i].x, fr[i].h * .5, fr[i].z]; for (let k = 0; k < M - 1; k++) { const a = pt(i, k), b = pt(i, k + 1); i === 0 ? tri(a, c, b, .3, .3, .3) : tri(a, b, c, .3, .3, .3); } }
  const ice = []; { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aG', new THREE.Float32BufferAttribute(G, 1)); g.computeVertexNormals(); ice.push(g); }
  const snow = [];
  /* ④ 눈: 윗단 전체 + 앞 모서리로 둥글게 넘쳐 흘러내림 */
  { const Q = [], iT = RF.length - 1, top = (i, k) => { const f = fr[i], s = S[i], fe = s[iT], be = s[iT + 4], t = .32 + vn(f.d * .9, 1, o) * .22, drip = vn(f.d * 1.7, 2, o);
      const sec = [[fe[0] - .12, fe[1] - .35 - drip * .5], [fe[0] - .2, fe[1] + t * .55], [fe[0] + .3, f.h + t], [s[iT + 2][0], s[iT + 2][1] + t * 1.05], [be[0] - .35, f.h + t * .9], [be[0] + .12, be[1] + t * .4], [be[0] + .1, be[1] - .3]][k];
      return [f.x + f.nx * sec[0], sec[1], f.z + f.nz * sec[0]]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 6; k++) { const a = top(i, k), b = top(i + 1, k), c = top(i, k + 1), d = top(i + 1, k + 1); FL ? Q.push(...a, ...b, ...c, ...b, ...d, ...c) : Q.push(...a, ...c, ...b, ...b, ...c, ...d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.computeVertexNormals(); snow.push(g); }
  /* ⑤ 고드름: 앞 모서리에서 아주 촘촘히 (긴 것 사이사이 짧은 것) · 뒤 모서리도 드문드문 */
  const icicle = (x, y, z, l, r) => { const g = new THREE.ConeGeometry(r, l, 5, 2); const P2 = g.attributes.position; for (let j = 0; j < P2.count; j++) { const yy = P2.getY(j); P2.setX(j, P2.getX(j) * (1 + (yy / l) * .3)); } g.rotateX(Math.PI); g.rotateY(R() * 6); g.translate(x, y - l / 2, z); return prep(g, .45); };
  for (let i = 0; i <= N; i++) for (const side of [-1, 1]) { const f = fr[i], s = S[i][side < 0 ? RF.length - 1 : RF.length + 3]; if (side > 0 && R() < .6) continue;
    const longOne = R() < .35, l = longOne ? 1.1 + R() * 1.6 : .35 + R() * .7, v = s[0] + side * .06, y = f.h - .1;
    if (R() < .82) ice.push(icicle(f.x + f.nx * v + f.tx * (R() - .5) * .15, y, f.z + f.nz * v + f.tz * (R() - .5) * .15, l, (longOne ? .13 : .08) + R() * .06)); }
  /* ⑥ 뾰족한 결정 기둥 */
  const spire = (d, v, hh, r, tilt) => { const i = Math.round(d / len * N), f = fr[Math.min(N, Math.max(0, i))]; const g = new THREE.CylinderGeometry(0, r, hh, 5 + Math.floor(R() * 2), 3);
    const P2 = g.attributes.position; for (let j = 0; j < P2.count; j++) { P2.setX(j, P2.getX(j) * (1 + (R() - .5) * .25)); P2.setZ(j, P2.getZ(j) * (.75 + R() * .3)); }
    g.rotateY(R() * 6); g.rotateZ(tilt * (R() < .5 ? -1 : 1)); g.rotateX((R() - .5) * tilt); g.translate(f.x + f.nx * v, f.h + hh / 2 - .3, f.z + f.nz * v); ice.push(prep(g, .55)); };
  for (const end of [0, 1]) if (doors[end]) { const d0 = end ? len - .8 : .8; spire(d0, -.2, 3.2 + R() * 1.4, .7, .12); spire(d0 + (end ? -1.3 : 1.3), .4, 2.2 + R() * 1.2, .5, .25); }
  for (let d = 5 + R() * 5; d < len - 3; d += 7 + R() * 9) spire(d, (R() - .5) * 1.4, 1.1 + R() * 1.6, .35 + R() * .25, .2);
  /* ⑦ 발치: 눈 덮인 큰 얼음 바위 + 작은 조각 (앞쪽 많이, 뒤쪽 조금) */
  const rock = (d, v, s) => { const i = Math.round(d / len * N), f = fr[Math.min(N, Math.max(0, i))], g = prep(block(seed * 31 + Math.floor(d * 7)).clone(), .2), sy = s * (.75 + R() * .45);
    g.scale(s * (.9 + R() * .4), sy, s * (.8 + R() * .3)); g.rotateY(R() * 6); const x = f.x + f.nx * v, z = f.z + f.nz * v; g.translate(x, sy * .25, z); ice.push(g);
    if (s > .55) { const c = new THREE.IcosahedronGeometry(1, 1); const P2 = c.attributes.position; for (let j = 0; j < P2.count; j++) if (P2.getY(j) < 0) P2.setY(j, P2.getY(j) * .15);
      c.scale(s * .85, s * .28, s * .75); c.translate(x, sy * .25 + sy * .62, z); snow.push(prepS(c)); } };
  for (let d = .5 + R(); d < len - .3; d += .9 + R() * 2.2) { const big = R() < .35; rock(d, -(W + 1.2 + R() * (big ? 1.6 : 2.6)), big ? .9 + R() * .9 : .25 + R() * .4); }
  for (let d = 1 + R() * 2; d < len - .5; d += 2.5 + R() * 4) rock(d, W + 1.1 + R() * 1.2, .3 + R() * .6);
  /* 앞쪽 땅 눈밭 (들쭉날쭉한 가장자리) */
  { const Q = [], sk = (i, k) => { const f = fr[i], reach = 2.4 + vn(f.d * .3, 4, o) * 3.2, vv = -(W + .2 + [0, .6, reach * .55, reach][k] + (k ? 0 : 0)), y = [.55, .32, .14, -.04][k] + (k < 3 ? (vn(f.d * 1.5, k, o) - .5) * .1 : 0);
      return [f.x + f.nx * vv, y, f.z + f.nz * vv]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const a = sk(i, k), b = sk(i + 1, k), c = sk(i, k + 1), d = sk(i + 1, k + 1); (!FL) ? Q.push(...a, ...b, ...c, ...b, ...d, ...c) : Q.push(...a, ...c, ...b, ...b, ...c, ...d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.computeVertexNormals(); snow.push(g); }
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(mergeGeometries(ice.map(g => prep(g))), mat), new THREE.Mesh(mergeGeometries(snow.map(prepS)), smat));
  grp.userData = { mat, smat, len };
  return grp;
}
