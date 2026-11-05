/* 용암 바위 벽 — 사용자 참고 그림(2026-11-05)에서 뼈대부터 새로 (얼음 벽 베끼기 X)
   그림에서 읽은 것 → 만드는 법
   ① 크고 각진 바위 덩어리들이 층층이 쌓인 한 덩어리: 길을 따라 1.6~3.2m짜리 덩어리로 나누고, 덩어리마다 높이·두께·기울기가 다름.
      앞면은 덩어리마다 2~3층 계단(아래층이 더 튀어나옴) · 층의 면은 평평하게 비스듬히(각진 바위 면)
      덩어리 사이는 안쪽으로 깊게 파인 틈(V 골) → 틈 속에서 붉은 빛이 샘. 한 판 겉면이라 이음새가 없음(조각 붙이기 X)
   ② 윗면은 울퉁불퉁한 바위 · 덩어리 몇 개는 산꼭대기처럼 뾰족하게 솟음(봉우리)
   ③ 윗면 가운데로 낮은 골이 길게 패여 용암이 강처럼 흐름
   ④ 폭포는 골이 벽 앞 끝에 닿는 자리에서만: 앞 모서리가 V자로 깊게 파이고, 그 파인 자리를 따라 앞면을 타고 쏟아짐
   ⑤ 발치: 흘러내린 용암이 고인 웅덩이(폭포 앞이 가장 넓고 뜨거움) + 무너져 내린 큰 바위
   ⑥ 겉 금·빛 색은 바닥과 같은 계산(lavatone.js)
   ⑦ 벽 끝은 둥글게 닳음(얼음 벽과 같은 원칙) · 문 양옆엔 날카로운 바위 뿔
   무게: 벽 한 줄 = 그리기 1번 (바위·용암·웅덩이가 한 재질, aF 값으로 용암 자리를 정함) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { block } from './ice.js?v=11050920';
import { LAVA_GLSL } from './lavatone.js?v=11050920';

const hs = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hs(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w); };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const prep = (g, glow = .15, lava = 0) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'aG' && k !== 'aF') n.deleteAttribute(k);
  const c = n.attributes.position.count; if (!n.attributes.aG) n.setAttribute('aG', new THREE.Float32BufferAttribute(new Float32Array(c).fill(glow), 1));
  if (!n.attributes.aF) n.setAttribute('aF', new THREE.Float32BufferAttribute(new Float32Array(c).fill(lava), 1)); n.computeVertexNormals(); return n; };

/* 재질: 바위 + 용암이 한 재질. aG = 덩어리 사이 틈 빛, aF = 용암 자리(0 바위 ~ 1 녹은 용암) */
export function lavaWallMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x0a0605, roughness: .93, metalness: 0, flatShading: true, envMapIntensity: .05 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = 'attribute float aG; attribute float aF; varying float vG; varying float vF; varying vec3 vIw; varying vec3 vNw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vG=aG; vF=aF; vIw=(modelMatrix*vec4(transformed,1.)).xyz; vNw=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = 'uniform float uT; varying float vG; varying float vF; varying vec3 vIw; varying vec3 vNw;\n' + LAVA_GLSL + '\n' + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { /* 바위: 면마다 조금씩 다른 숯빛 현무암 · 위를 향한 면엔 식은 재 */
        float fh=lh(floor(vNw*5.)+floor(vIw*.8)); diffuseColor.rgb*=(.6+.7*fh)*.55;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.05,.045),smoothstep(.65,.95,vNw.y)*.15);
        float low=smoothstep(2.6,.0,vIw.y), pulse=lavaPulse(vIw,uT);
        /* 겉 금: 면이 보는 평면에 판을 나눔 · 뜨거운 곳만 벌어져 빛나고 나머지는 식은 어두운 금 */
        vec3 an=abs(vNw); vec2 uv=an.y>.7?vIw.xz:(an.x>an.z?vIw.zy:vIw.xy); uv+=vec2(lnz(vIw*.7),lnz(vIw*.7+4.))*.5;
        vec2 v1=lvor(uv*vec2(1.,.75)), v2=lvor(uv*2.5+7.);
        float hotz=smoothstep(.5,.75,lnz(vIw*.4+2.)+low*.3);
        float wv=.03+.04*lnz(vIw*.4);
        float crack=smoothstep(wv,0.,v1.x)*hotz, crack2=smoothstep(.035,0.,v2.x)*.5*step(.55,v2.y)*hotz, cold=smoothstep(.03,0.,v1.x)*(1.-hotz);
        diffuseColor.rgb*=(.8+.4*v1.y)*(1.-min(1.,crack+crack2+cold*.6)*.9);
        float seam=pow(clamp(vG,0.,1.),1.4);
        totalEmissiveRadiance+=lavaHot(crack*.9)*(crack+crack2*.6)*pulse*(.45+.6*low)+lavaHot(.25)*smoothstep(.18,0.,v1.x)*hotz*.12+lavaHot(.3+.4*low)*seam*(.3+.8*low)*pulse;
        /* 용암: 윗면 골·웅덩이는 껍질 판이 떠다니는 강 / 앞면 폭포는 아래로 흘러내림 */
        float lv=smoothstep(.25,.6,vF+(lnz(vIw*1.3+uT*.12)-.5)*.35);
        if(lv>.001){ float flat_=smoothstep(.45,.8,vNw.y); vec3 L;
          vec2 cr=lavaCrust(vIw.xz,vF,uT); float molten=mix(1.,cr.x,flat_);
          float s1=lnz(vec3(vIw.x*2.4,vIw.y*.5+uT*1.1,vIw.z*2.4)), s2=lnz(vec3(vIw.x*6.,vIw.y*1.3+uT*1.9,vIw.z*6.)+3.);
          float fall=(1.-flat_)*(.6+.4*s1)*(.75+.35*s2);
          float core=mix(.35+.65*molten*smoothstep(.5,1.,vF),.45+.55*fall*smoothstep(.55,1.,vF),1.-flat_);
          L=lavaHot(core)*pulse*mix(molten,1.,1.-flat_)*mix(1.,.8+.3*s2,1.-flat_);
          vec3 crustC=vec3(.03,.02,.018)*(.7+.6*cr.y);
          diffuseColor.rgb=mix(diffuseColor.rgb,crustC,lv);
          totalEmissiveRadiance=mix(totalEmissiveRadiance,L+lavaHot(.2)*(1.-molten)*smoothstep(.2,0.,abs(molten-.5))*.3,lv); } }`); };
  m.customProgramCacheKey = () => 'lava-wall-v2';
  return m;
}

export function makeLavaWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || lavaWallMaterial(uT), doors = opt.doors || [true, true];
  const seed = opt.seed || 3, R = (() => { let s = seed * 7919 + 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), o = seed * 1.3;
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const Hm = opt.H || 2.4, W = 1.15, DS = .15, N = Math.max(4, Math.round(len / DS));
  /* ① 덩어리: 길이 · 높이 · 앞뒤 두께 · 층 · 면 기울기 · 봉우리 */
  const BL = []; for (let d = -.3; d < len + .3;) { const l = 1.6 + R() * 1.6, peak = R() < .2;
    const tiers = 2 + (R() < .45 ? 1 : 0), ty = []; for (let k = 1; k < tiers; k++) ty.push(k / tiers + (R() - .5) * .18);
    BL.push({ d0: d, d1: d + l, h: Hm * (.78 + R() * .45), peak: peak ? Hm * (.25 + R() * .3) : 0, pk: .3 + R() * .4,
      w: [W * (.85 + R() * .35), W * (.85 + R() * .35)], step: [.22 + R() * .3, .2 + R() * .25], ty, sl: [(R() - .5) * .5, (R() - .5) * .5], lean: .1 + R() * .15, ch: R() < .82 });
    d += l; }
  const blk = d => BL.find(b => d >= b.d0 && d < b.d1) || BL[BL.length - 1];
  /* 덩어리 사이 틈: 경계 0.35m 안에서 안쪽으로 파임 + 빛 */
  const gapK = d => { const b = blk(d), e = Math.min(d - b.d0, b.d1 - d); return 1 - sstep(0, .25, e); };
  /* ④ 폭포 자리: 골이 있는 덩어리 가운데쯤, 6~10m마다 */
  const FALLS = []; { let last = -9; for (const b of BL) { const c = (b.d0 + b.d1) / 2; if (b.ch && !b.peak && c - last > 6 + R() * 4 && c > 2.5 && c < len - 2.5) { FALLS.push([c + (R() - .5) * .4, .55 + R() * .35]); last = c; } } }
  const fallV = d => { let m = 0; for (const [c, w] of FALLS) m = Math.max(m, Math.max(0, 1 - Math.abs(d - c) / w)); return m; };   /* V자 (가운데 1, 가장자리 0) */
  const p = new THREE.Vector3(), tg = new THREE.Vector3(), fr = [];
  for (let i = 0; i <= N; i++) { const d = i / N * len; curve.getPointAt(i / N, p); curve.getTangentAt(i / N, tg); let nx = -tg.z, nz = tg.x; const sg = opt.out ? opt.out(p.x, p.z, nx, nz) : 1; nx *= sg; nz *= sg;
    const b = blk(d), e = Math.min(len - d, d), Lr = 1.8, c = e < Lr ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - e / Lr, 2))) : 1;   /* ⑦ 끝 둥글게 */
    const ds = doors[0] ? d : 1e9, de = doors[1] ? len - d : 1e9, door = Math.exp(-Math.pow(Math.min(ds, de), 2) / 10);
    const g = gapK(d), fv = fallV(d), mid = (d - (b.d0 + b.d1) / 2) / (b.d1 - b.d0);
    let h = (b.h + door * .5 * Hm / 2.4) * (.45 + .55 * c) * (1 - g * .12);
    fr.push({ d, x: p.x, z: p.z, nx, nz, tx: tg.x, tz: tg.z, sg, b, c, g, fv, mid, h }); }
  const FL = fr[0].sg < 0;
  /* 단면 한 장: 앞면(아래→위) · 윗면(앞 모서리 → 골 → 봉우리 → 뒤 모서리) · 뒷면(위→아래). 점마다 [v(바깥 거리), y, 틈 빛, 용암] */
  const RF = [0, .05, .11, .18, .26, .34, .42, .5, .58, .66, .74, .82, .9, .96, 1], RB = [0, .25, .5, .75, .92, 1];
  const faceV = (f, side, yk) => { const b = f.b, si = side < 0 ? 0 : 1; let v = b.w[si] + f.mid * b.sl[si] * (b.d1 - b.d0) * .5;   /* 덩어리 면이 비스듬히 → 각진 판 */
    for (const t0 of b.ty) { const t = t0 + (vn(f.d * .7 + si * 5, t0 * 9, o) - .5) * .22; v -= b.step[si] * sstep(t - .05, t + .05, yk) * (1 - t * .3); }   /* 층: 위층이 한 단 들어감 · 층 선이 비스듬히 오르내려 가로줄로 안 보이게 */
    v += Math.max(0, .2 - yk) * 2.2 - b.lean * yk * (1 + (vn(f.d * .5, 2, o) - .5) * 1.2);                                                                             /* 아래가 퍼진 밑동 · 위로 갈수록 살짝 기욺 */
    v += (vn(f.d * .9 + si * 7, yk * 3.1, o) - .5) * .22 + (Math.floor(vn(f.d * 2.3 + si * 3, yk * 5.2, o + 4) * 4) / 4 - .4) * .2;   /* 큰 면 위의 굵은 울퉁불퉁 + 떨어져 나간 자리(턱이 진 이 빠짐) */
    v -= f.g * (.32 + .1 * yk);                                                                                               /* 덩어리 사이 V 틈 */
    if (side < 0) v -= f.fv * .32 * (.4 + .6 * yk);                                                                           /* 폭포 자리: 앞면을 따라 파인 홈 */
    return Math.max(.12, v * (.25 + .75 * f.c)); };
  const section = f => { const out = [], b = f.b;
    for (const yk of RF) { const lav = f.fv > 0 ? sstep(.15, .7, f.fv) * (.75 + .25 * yk) : 0; out.push([-faceV(f, -1, yk), Math.max(-.3, -.3 + (f.h + .3) * yk), f.g * (.35 + .3 * (1 - yk)), lav]); }
    const fe = -faceV(f, -1, 1), be = faceV(f, 1, 1), chD = b.ch && !b.peak ? .38 : 0, pk = b.peak * Math.max(0, 1 - Math.abs(f.mid - (b.pk - .5) * .5) * 2.2) * f.c;   /* 봉우리: 둥근 언덕 X, 모난 삼각 */
    const notch = f.fv * .55;                                                                                                   /* 폭포 자리: 앞 모서리 V자로 깊게 */
    const bump = k => (vn(f.d * 1.3, k * 2.7, o) - .5) * .22;
    const chLav = chD ? .75 + .25 * f.fv : 0;
    out.push([fe + .06, f.h - notch + bump(1), f.g * .5, f.fv > .05 ? 1 : 0],
      [fe * .55 + be * .45 - .05, f.h - chD - notch * .6 + bump(2) * .4 + pk * .4, f.g * .5, chLav],                        /* 골 (용암 강) */
      [fe * .3 + be * .7 + (b.pk - .5) * .3, f.h + pk + bump(3), f.g * .4, 0],                                                 /* 봉우리 쪽 등줄기 */
      [be - .06, f.h * (.96 + bump(4) * .3), f.g * .4, 0]);
    for (let k = RB.length - 1; k >= 0; k--) { const yk = RB[k]; out.push([faceV(f, 1, yk), Math.max(-.3, -.3 + (f.h + .3) * yk), f.g * (.35 + .3 * (1 - yk)), 0]); }
    return out; };
  const S = fr.map(section), M = S[0].length, P = [], G = [], F = [];
  const pt = (i, k) => { const f = fr[i], q = S[i][k]; return [f.x + f.nx * q[0], q[1], f.z + f.nz * q[0]]; };
  const tri = (a, b, c, A, B, C) => { if (FL) { P.push(...a, ...c, ...b); G.push(A[2], C[2], B[2]); F.push(A[3], C[3], B[3]); } else { P.push(...a, ...b, ...c); G.push(A[2], B[2], C[2]); F.push(A[3], B[3], C[3]); } };
  for (let i = 0; i < N; i++) for (let k = 0; k < M - 1; k++) tri(pt(i, k), pt(i, k + 1), pt(i + 1, k), S[i][k], S[i][k + 1], S[i + 1][k]), tri(pt(i + 1, k), pt(i, k + 1), pt(i + 1, k + 1), S[i + 1][k], S[i][k + 1], S[i + 1][k + 1]);
  /* 끝 막음 (둥근 끝이라 작음) */
  for (const i of [0, N]) { const f = fr[i], dir = i === 0 ? -1 : 1, tx = f.tx * dir, tz = f.tz * dir, ring = S[i];
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(q => new THREE.Vector2(q[0], q[1])), []);
    for (const [x, y, z] of tris) { const A = pt(i, x), B = pt(i, y), C = pt(i, z), ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const ok = (uy * vz - uz * vy) * tx + (ux * vy - uy * vx) * tz >= 0; ok ? P.push(...A, ...B, ...C) : P.push(...A, ...C, ...B); G.push(.3, .3, .3); F.push(0, 0, 0); } }
  const parts = []; { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aG', new THREE.Float32BufferAttribute(G, 1)); g.setAttribute('aF', new THREE.Float32BufferAttribute(F, 1)); parts.push(prep(g)); }
  const RG = (() => { let s = seed * 104729 + 13; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  /* 바위 뿔: 5모 뿔, 마디마다 크게 어긋나 날카롭게 깨진 바위 */
  const spike = (x, z, y0, hh, r, lx, lz, lean) => { const g = new THREE.CylinderGeometry(r * .05, r, hh, 5, 4).toNonIndexed(), P3 = g.attributes.position;
    for (let j = 0; j < P3.count; j++) { const yy = P3.getY(j) / hh + .5, k = 1 + (hs(Math.round(P3.getX(j) * 40), Math.round(yy * 4), seed) - .5) * .5; P3.setX(j, P3.getX(j) * k); P3.setZ(j, P3.getZ(j) * k * .85); }
    g.translate(0, hh / 2, 0); g.rotateY(RG() * 6); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(lx * lean, 1, lz * lean).normalize()));
    g.translate(x, y0, z); parts.push(prep(g, .25)); };
  /* ② 봉우리 덩어리 위엔 날카로운 바위 뿔 1~2개 (그림의 뾰족한 산꼭대기) */
  for (const b of BL) if (b.peak) { const dm = Math.min(len - .5, Math.max(.5, (b.d0 + b.d1) / 2 + (b.pk - .5) * .5 * (b.d1 - b.d0))), i = Math.round(dm / len * N), f = fr[Math.min(N, Math.max(0, i))];
    if (f.c < .9) continue; const cnt = RG() < .5 ? 1 : 2;
    for (let k = 0; k < cnt; k++) spike(f.x + f.tx * (k - .5) * .7 * (cnt - 1), f.z + f.tz * (k - .5) * .7 * (cnt - 1), f.h + b.peak * .6, Hm * (.45 + RG() * .45) / (k + 1), .45 + RG() * .2, f.nx * (RG() - .5), f.nz * (RG() - .5), .25); }
  /* ⑦ 문기둥: 둥근 끝 옆에 큰 뿔 하나 + 작은 뿔 둘, 문 바깥쪽으로 벌어짐 */
  for (const end of [0, 1]) if (doors[end]) { const f = fr[end ? N : 0], dir = end ? 1 : -1, ax = f.tx * dir, az = f.tz * dir, bx = f.x - ax * .8, bz = f.z - az * .8;
    spike(bx, bz, -.2, Hm * 1.7, .8, -ax, -az, .12);
    for (const k of [-1, 1]) spike(bx - ax * (.5 + RG() * .4) + f.nx * k * .8, bz - az * (.5 + RG() * .4) + f.nz * k * .8, -.15, Hm * (.8 + RG() * .4), .42, -ax + f.nx * k * .5, -az + f.nz * k * .5, .3); }
  /* ⑤ 발치: 무너져 내린 큰 바위 (앞쪽 많이 · 폭포 바로 앞은 비움) */
  const rock = (d, v, s) => { const i = Math.round(d / len * N), f = fr[Math.min(N, Math.max(0, i))]; if (v < 0 && fallV(d) > .2) return;
    const g = block(seed * 31 + Math.floor(d * 7)).clone(), sy = s * (.8 + R() * .5); g.scale(s * (1 + R() * .5), sy, s * (.8 + R() * .4)); g.rotateY(R() * 6);
    g.translate(f.x + f.nx * v, sy * .25, f.z + f.nz * v); parts.push(prep(g, .2)); };
  for (let d = .6 + R(); d < len - .4; d += .8 + R() * 1.9) { const big = R() < .4; rock(d, -(W * 1.5 + .4 + R() * (big ? 1.2 : 2.4)), big ? .7 + R() * .8 : .2 + R() * .35); }
  for (let d = 1 + R() * 2; d < len - .5; d += 2.5 + R() * 4) rock(d, W * 1.5 + .5 + R(), .3 + R() * .5);
  /* ⑤ 발치 용암 웅덩이: 벽 밑동에서 앞으로 들쭉날쭉 · 폭포 앞이 가장 넓고 뜨거움 · 바깥 끝은 바닥 아래로 스며 들어감 */
  { const Q = [], Gq = [], Fq = [], sk = (i, k) => { const f = fr[i], fv = Math.max(fallV(f.d), fallV(f.d - .6) * .8, fallV(f.d + .6) * .8);
      const reach = (1.2 + vn(f.d * .35, 4, o) * 2. + fv * 2.6) * f.c, base = faceV(f, -1, 0) - .15;
      const v = -(base + [0, .5, reach * .6, reach][k]), y = [.12, .07, .04, -.05][k];
      const lav = [Math.min(1, .5 + fv * .6), .45 + fv * .5, .35 + fv * .45, .2][k];
      return [[f.x + f.nx * v, y, f.z + f.nz * v], lav]; };
    for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const [a, la] = sk(i, k), [b, lb] = sk(i + 1, k), [c, lc] = sk(i, k + 1), [d, ld] = sk(i + 1, k + 1);
      if (!FL) { Q.push(...a, ...b, ...c, ...b, ...d, ...c); Fq.push(la, lb, lc, lb, ld, lc); } else { Q.push(...a, ...c, ...b, ...b, ...c, ...d); Fq.push(la, lc, lb, lb, lc, ld); } Gq.push(0, 0, 0, 0, 0, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Q, 3)); g.setAttribute('aG', new THREE.Float32BufferAttribute(Gq, 1)); g.setAttribute('aF', new THREE.Float32BufferAttribute(Fq, 1)); parts.push(prep(g)); }
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(mergeGeometries(parts), mat));
  grp.userData = { mat, len, falls: FALLS };
  return grp;
}
