/* 맵 벽 — 함선 뼈대 (함선 묘지)
   거대한 우주선이 부서지고 남은 골조. 바닥을 따라 용골이 이어지고, 배의 단면 모양 늑골 틀이 줄지어 서 있다.
   틀은 제각각 부러져 — 어떤 건 거의 고리째 남고 어떤 건 아래쪽만 남았다. 세로대가 틀을 잇다가 군데군데 끊겼다. 그 사이에 떨어져 나간 외판 조각이 기울어 걸려 있다.
   · 골조 단면은 네모, 바깥 면 가운데에 전선 홈이 길게 파여 있고 양쪽 가장자리에 리벳이 줄지어 박혀 있다.
   · 평소: 빛나지 않는다. 낡은 짙은 쇠, 군데군데 그을음.
   · 맞으면: 맞은 자리에서 전기가 전선 홈을 따라 양쪽으로 달려 나가며(지름 3m 남짓 안) 지지직 깜빡이다 0.7초쯤에 꺼진다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11021334';

const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/* 길을 따라 네모 단면을 쓸어 만든 빔. cs = (단면 안 가로 위치 -1~1, 면 번호 0 바깥 1 옆 2 안 3 옆), 길이 방향 거리 */
function sweep(pts, w, h, upHint) {
  const pos = [], cs = [], ln = [], P = pts.map(p => new THREE.Vector3(...p)), N = P.length;
  const frames = []; let acc = 0;
  for (let i = 0; i < N; i++) { const t = (i < N - 1 ? P[i + 1].clone().sub(P[i]) : P[i].clone().sub(P[i - 1])).normalize();
    const up = (typeof upHint === 'function' ? upHint(i, P[i], t) : upHint.clone()); const s = new THREE.Vector3().crossVectors(t, up).normalize(), u = new THREE.Vector3().crossVectors(s, t).normalize();
    if (i) acc += P[i].distanceTo(P[i - 1]); const k = 1 - (i / (N - 1)) * .25;      /* 끝으로 갈수록 살짝 가늘게 */
    frames.push({ p: P[i], s, u, l: acc, k }); }
  const corner = (f, a, b) => f.p.clone().addScaledVector(f.s, a * w * f.k).addScaledVector(f.u, b * h * f.k);
  const C = [[-1, 1], [1, 1], [1, -1], [-1, -1]];             /* 위(바깥) 0→1, 옆 1→2, 아래 2→3, 옆 3→0 */
  for (let i = 0; i < N - 1; i++) { const A = frames[i], B = frames[i + 1];
    for (let f = 0; f < 4; f++) { const c0 = C[f], c1 = C[(f + 1) % 4];
      const a0 = corner(A, ...c0), a1 = corner(A, ...c1), b0 = corner(B, ...c0), b1 = corner(B, ...c1);
      for (const [p, x, l] of [[a0, -1, A.l], [b0, -1, B.l], [b1, 1, B.l], [a0, -1, A.l], [b1, 1, B.l], [a1, 1, A.l]]) { pos.push(p.x, p.y, p.z); cs.push(x, f); ln.push(l); } } }
  for (const [F, flip] of [[frames[0], true], [frames[N - 1], false]]) { const q = C.map(c => corner(F, ...c)), o = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];   /* 끊긴 단면 */
    for (const j of o) { pos.push(q[j].x, q[j].y, q[j].z); cs.push(0, 4); ln.push(F.l); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('cs', new THREE.Float32BufferAttribute(cs, 2)); g.setAttribute('ln', new THREE.Float32BufferAttribute(ln, 1));
  g.computeVertexNormals();
  /* 면이 안쪽을 보면 뒤집는다 (빔 중심선 기준) */
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  const near = v => { let best = P[0], bd = 1e9; for (const q of P) { const d = q.distanceToSquared(v); if (d < bd) { bd = d; best = q; } } return best; };
  for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)); m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (cs[i * 2 + 1] < 4 && n.dot(m.clone().sub(near(m))) < 0) for (const at of ['position', 'cs', 'ln']) { const A = g.attributes[at], sz = A.itemSize;
      for (let k = 0; k < sz; k++) { const t = A.array[(i + 1) * sz + k]; A.array[(i + 1) * sz + k] = A.array[(i + 2) * sz + k]; A.array[(i + 2) * sz + k] = t; } } }
  g.computeVertexNormals(); return g;
}
/* 늑골 틀 하나: 배의 단면 모양(타원) 고리, 군데군데 부러져 일부만 남음 — 로컬 x = 옆, y = 위 */
const EL = { rx: 2.3, ry: 1.9, cy: 1.6 };
const elP = a => [Math.cos(a) * EL.rx, EL.cy + Math.sin(a) * EL.ry];
function rib(seed) {
  const R = rng(seed), L = .9 + R() * 2.3, Rr = .9 + R() * 2.3, pts = [];       /* 바닥(아래)에서 양쪽으로 얼마나 남았나 */
  const a0 = -Math.PI / 2 - L, a1 = -Math.PI / 2 + Rr;
  for (let i = 0; i <= 30; i++) { const a = a0 + (a1 - a0) * i / 30, [x, y] = elP(a); pts.push([x, y, 0]); }
  return sweep(pts, .13, .26, (i, p, t) => { const a = a0 + (a1 - a0) * i / 30; return new THREE.Vector3(Math.cos(a) / EL.rx, Math.sin(a) / EL.ry, 0).normalize(); });
}
export function hullMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x34373d, roughness: .5, metalness: .8, envMapIntensity: .9, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'attribute vec2 cs; attribute float ln; varying vec2 vCs; varying float vLn; varying vec3 vHw;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vCs=cs; vLn=ln; { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vHw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec2 vCs; varying float vLn; varying vec3 vHw;
      float hh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float hn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float face=floor(vCs.y+.5), x=vCs.x;
        float side=(face==0.||face==2.)?1.:0.;
        float groove=side*smoothstep(.2,.12,abs(x));                                               /* 전선 홈 */
        float rv=side*smoothstep(.12,.05,length(vec2((abs(x)-.78)*2.2,fract(vLn*3.)-.5)*vec2(1.,.6)));   /* 가장자리 리벳 줄 */
        float soot=hn(vec2(vLn*.8,x*.5+face*3.))*.6+hn(vHw.xz*1.7)*.4;
        diffuseColor.rgb*=(1.-groove*.75)*(.65+soot*.6);
        diffuseColor.rgb+=vec3(.05)*rv;
        float pulse=0., stay=0., flash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; float d=distance(vHw,uHits[i].xyz); if(d>3.4) continue;
          float fall=exp(-d*d*.3), fr=age*8.;
          pulse+=exp(-(d-fr)*(d-fr)*4.)*exp(-age*2.6)*fall*1.6;                                   /* 홈을 따라 달려가는 전기 */
          stay+=step(d,fr)*exp(-age*4.)*fall;
          flash+=exp(-d*d*2.)*exp(-age*22.); }
        if(pulse+stay>.003){
          float flick=.55+.45*step(.4,hh(vec2(floor(uT*45.),floor(vLn*2.))));                    /* 지지직 */
          vec3 el=vec3(.45,.8,1.4);
          totalEmissiveRadiance+=el*groove*(pulse*3.+stay*1.2)*flick+vec3(.7,.9,1.2)*rv*(pulse+stay)*1.5+vec3(.8,.9,1.)*flash*.6; }`); };
  m.customProgramCacheKey = () => 'hull-frame';
  return m;
}

export function makeHullRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = hullMaterial(uT), R = rng(opt.seed || 31);
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const grp = new THREE.Group(), tg = [];
  /* 용골: 바닥을 따라 굵은 빔 */
  { const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80, p = curve.getPointAt(u); pts.push([p.x, EL.cy - EL.ry - .05, p.z]); }
    grp.add(new THREE.Mesh(sweep(pts, .32, .2, new THREE.Vector3(0, 1, 0)), mat)); }
  /* 늑골 틀: 길을 따라 줄지어, 끝으로 갈수록 작고 많이 부러짐 */
  const rg = [1, 2, 3, 4, 5, 6].map(rib), ribs = [];
  for (let d = .6; d < len - .4; d += 1.45 + R() * .25) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), yaw = Math.atan2(t.x, t.z);
    const edge = Math.min(1, .5 + Math.min(u, 1 - u) * len / 5), g = Math.floor(R() * rg.length), s = (.82 + R() * .12) * edge;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - .5) * .06, yaw + Math.PI / 2 + (R() - .5) * .06, (R() - .5) * .08, 'YXZ'));
    ribs.push({ g, x: p.x, z: p.z, s, q });
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * .55, [ex, ey] = elP(a); tg.push({ x: p.x + side.x * ex * s, y: -.3 + ey * s, z: p.z + side.z * ex * s, r: .45 }); } }
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  rg.forEach((g, gi) => { const mine = ribs.filter(r => r.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((r, j) => { m4.compose(pos.set(r.x, -.3, r.z), r.q, sc.setScalar(r.s)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  /* 세로대: 늑골 틀을 길이 방향으로 잇는 빔 (군데군데 끊김) */
  for (const a of [-Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05, -Math.PI / 2 - 1.9, -Math.PI / 2 + 1.9]) { const [ex, ey] = elP(a); let pts = [];
    const flush = () => { if (pts.length > 4) { grp.add(new THREE.Mesh(sweep(pts, .09, .12, new THREE.Vector3(0, 1, 0)), mat)); for (let k = 0; k < pts.length; k += 3) tg.push({ x: pts[k][0], y: pts[k][1], z: pts[k][2], r: .35 }); } pts = []; };
    for (let i = 0; i <= 90; i++) { const u = i / 90, p = curve.getPointAt(u), t = curve.getTangentAt(u), edge = Math.min(1, .5 + Math.min(u, 1 - u) * len / 5);
      if (R() < .04 || edge < .95) { flush(); continue; }
      const k = .86; pts.push([p.x - t.z * ex * k, -.3 + ey * k, p.z + t.x * ex * k]); }
    flush(); }
  /* 떨어져 나간 외판 조각: 몇 장만 기울어 걸려 있음 */
  const plateG = sweep([[0, 0, 0], [1.4, 0, 0]], .55, .03, new THREE.Vector3(0, 1, 0)), plates = [];
  for (let d = 2; d < len - 2; d += 4.5 + R() * 3) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), sd = R() < .5 ? -1 : 1;
    plates.push({ x: p.x - t.z * sd * (1.9 + R() * .6), z: p.z + t.x * sd * (1.9 + R() * .6), y: .4 + R() * 1.2, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 1.2 - .6, R() * 6.28, R() * 1.4 - .7)) }); }
  const pim = new THREE.InstancedMesh(plateG, mat, plates.length);
  plates.forEach((pl, j) => { m4.compose(pos.set(pl.x, pl.y, pl.z), pl.q, sc.setScalar(1)); pim.setMatrixAt(j, m4); tg.push({ x: pl.x, y: pl.y, z: pl.z, r: .6 }); });
  pim.computeBoundingSphere(); grp.add(pim);
  grp.userData = { kind: 'hull', uT, targets: () => tg };
  return grp;
}
