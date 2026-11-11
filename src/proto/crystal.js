/* 맵 벽 — 자수정 무리 (결정 협곡)
   큰 결정 무리가 이어진 벽. 큰 결정마다 뿌리에서 작은 결정이 비스듬히 갈라져 나와 바짝 붙어 있다.
   · 결정 하나: 수정처럼 육각 기둥 + 끝이 정확한 여섯 면으로 깎인 뾰족한 머리. 면이 빠지는 곳이 없게 모든 면을 바깥으로 맞춤.
   · 평소: 빛나지 않는다. 뿌리는 짙은 보라, 끝으로 갈수록 맑아짐(자수정의 색 띠). 끝이 아주 천천히 뻗었다 움츠러든다(살아 있음).
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 결정 속으로 들어간 빛이 면마다 다르게 꺾여 면마다 다른 색으로 0.7초쯤 반짝인다(칠한 무지개가 아님).
     맞은 결정은 움찔 움츠러들었다가 다시 뻗는다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11111057';

/* 결정 하나 (밑 0 ~ 기둥 끝 1 ~ 머리 꼭짓점 1.0+tip). 모든 삼각형을 바깥쪽으로 맞춘다 */
export function prism(seed) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const tip = .55 + R() * .3, off = [(R() - .5) * .08, (R() - .5) * .08];
  const w = []; for (let k = 0; k < 6; k++) w.push(.36 + R() * .1);                       /* 면 너비를 조금씩 다르게 (실제 수정처럼) */
  const ring = (y, s = 1) => w.map((r, k) => { const a = k / 6 * Math.PI * 2 + Math.PI / 6; return new THREE.Vector3(Math.cos(a) * r * s, y, Math.sin(a) * r * s); });
  const b0 = ring(-.15, .92), b1 = ring(1), apex = new THREE.Vector3(off[0], 1 + tip, off[1]), foot = new THREE.Vector3(0, -.35, 0);
  const tris = [];
  for (let k = 0; k < 6; k++) { const n = (k + 1) % 6;
    tris.push([b0[k], b1[k], b1[n]], [b0[k], b1[n], b0[n]]);                                /* 옆면 */
    tris.push([b1[k], apex, b1[n]]);                                                         /* 머리 여섯 면 */
    tris.push([b0[k], b0[n], foot]); }                                                       /* 밑 (바위에 박힘) */
  const pos = [], c = new THREE.Vector3(), nrm = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const t of tris) { c.copy(t[0]).add(t[1]).add(t[2]).multiplyScalar(1 / 3);
    e1.subVectors(t[1], t[0]); e2.subVectors(t[2], t[0]); nrm.crossVectors(e1, e2);
    const ax = new THREE.Vector3(0, THREE.MathUtils.clamp(c.y, 0, 1), 0); if (c.y > 1) ax.y = .8; if (c.y < -.15) ax.y = 0;
    const tt = nrm.dot(c.clone().sub(ax)) < 0 ? [t[0], t[2], t[1]] : t;                       /* 안쪽을 보면 뒤집는다 */
    for (const p of tt) pos.push(p.x, p.y, p.z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}

export function crystalMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x14081f, roughness: .02, metalness: 0, clearcoat: 0, envMapIntensity: 1.7,   /* 겉 코팅 빛 끔 (가볍게) */ ior: 1.9, specularIntensity: 1, specularColor: 0xf3eaff, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vCw; varying vec3 vCo; varying float vSeed; varying vec3 vOrg;
      float chh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vCo=position;
        { vec3 org=vec3(0.);
          #ifdef USE_INSTANCING
            org=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
          #endif
          vSeed=chh(org); vOrg=org;
          float grow=sin(uT*.5+vSeed*6.28)*.04;                                                     /* 끝이 아주 천천히 뻗었다 움츠러듦 */
          float flinch=0.;
          for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; float d=distance(org,uHits[i].xyz); if(d>3.) continue;
            flinch+=exp(-d*d*.4)*age*exp(-age*7.)*2.2; }                                           /* 맞으면 움찔 → 다시 뻗음 */
          float tipk=smoothstep(.9,1.3,position.y);
          transformed.y+=tipk*(grow-flinch*.3);
          transformed.xz*=1.-flinch*.06; }`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vCw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vCw; varying vec3 vCo; varying float vSeed; varying vec3 vOrg;
      vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      float chf(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Nw=normalize(cross(dFdx(vCw),dFdy(vCw))); float ndv=abs(dot(normal,normalize(vViewPosition)));
        /* 평소: 자수정의 색 띠 — 뿌리는 짙은 보라, 끝으로 갈수록 맑음. 정면은 속이 들여다보여 깊고, 비스듬하면 겉면 반사 */
        float zone=smoothstep(-.1,1.3,vCo.y);
        float band=.5+.5*sin(vCo.y*9.+vSeed*20.);                                                    /* 자라며 생긴 옅은 색 결 */
        vec3 inside=mix(vec3(.11,.02,.2),vec3(.06,.05,.1),zone)*(.75+band*.35);
        inside+=vec3(.25,.18,.3)*smoothstep(1.,1.5,vCo.y)*.4;                                        /* 맑은 끝 */
        diffuseColor.rgb=mix(inside,diffuseColor.rgb,pow(max(1.-ndv,0.),1.4));
        /* 맞으면: 들어온 빛이 면마다 다르게 꺾여 갈라진다 */
        vec3 disp=vec3(0.); float flash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; vec3 d3=vCw-uHits[i].xyz; float d2=dot(d3,d3); if(d2>10.) continue;
          float fall=exp(-d2*.5), life=exp(-age*4.5);
          vec3 Ld=normalize(vOrg-uHits[i].xyz+vec3(0.,.3,0.));                                       /* 맞은 쪽에서 결정으로 들어온 빛의 방향 (결정마다 하나) */
          float bend=dot(Nw,Ld)*1.3+dot(Nw,vec3(.3,.8,.5))*.7+vSeed+age*.6;                          /* 면 기울기 → 꺾이는 정도 → 면마다 한 색 */
          disp+=hue(fract(bend))*fall*life;
          flash+=fall*exp(-age*24.); }
        if(dot(disp,vec3(1.))+flash>.003){
          totalEmissiveRadiance+=disp*(.45+.55*pow(max(ndv,0.),.7))*2.2+disp*pow(max(1.-ndv,0.),3.)*1.6+vec3(1.)*flash*.8; }`); };
  m.customProgramCacheKey = () => 'amethyst';
  return m;
}

/* 능선: 바위 받침을 겹쳐 잇고, 그 윗면에서 결정이 빽빽하게 뻗는다 */
export function makeCrystalRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || crystalMaterial(uT);
  const geos = opt.geos || [1, 2, 3, 4, 5].map(prism);
  const R = (() => { let s = (opt.seed || 9) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const cs = [], rocks = [], up = new THREE.Vector3(0, 1, 0);
  for (let d = 0; d < len; d += 2.1 + R() * .8) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x;
    const edge = Math.min(1, .5 + (opt.noTaper ? 9 : Math.min(u, 1 - u)) * len / 6), side = (R() - .5) * .6, cx = p.x + nx * side, cz = p.z + nz * side;
    const rw = 1.3 * edge, rh = .6 * edge;                                                            /* 바위 받침 (쪼갠 바위의 겉껍질) */
    const n = Math.round((5 + R() * 5) * edge);
    for (let k = 0; k < n; k++) { const a = R() * 6.28, rr = Math.sqrt(R()), lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;   /* 받침 윗면 위의 한 점 */
      const ox = cx + (nx * lx + t.x * lz * 1.3) * rw, oz = cz + (nz * lx + t.z * lz * 1.3) * rw, oy = -.35 + rh * .55 * Math.sqrt(Math.max(0, 1 - rr * rr));
      const dir = new THREE.Vector3(nx * lx + t.x * lz * .8, 1.1 + R() * .4, nz * lx + t.z * lz * .8).normalize();     /* 표면에서 바깥·위로 */
      const h = (rr < .45 ? 1.2 + R() * 1.3 : .45 + R() * .9) * edge;                                   /* 가운데가 길고 가장자리가 짧음 */
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir).multiply(new THREE.Quaternion().setFromAxisAngle(up, R() * 6.28));
      const w0 = h * (.22 + R() * .14) + .1; cs.push({ g: Math.floor(R() * geos.length), x: ox, y: oy, z: oz, h, w: w0, q });
      /* 뿌리에 바짝 붙어 비스듬히 자란 작은 결정 (같은 뿌리에서 갈라져 나옴) */
      const nb = 2 + Math.floor(R() * 3);
      for (let j = 0; j < nb; j++) { const b = R() * 6.28, ca = Math.cos(b), sa = Math.sin(b);
        const sd = new THREE.Vector3(ca, 0, sa).applyQuaternion(q), d2 = dir.clone().multiplyScalar(.9).addScaledVector(sd, .55 + R() * .35).normalize();
        const hh = h * (.22 + R() * .2), rr0 = w0 * .55;
        cs.push({ g: Math.floor(R() * geos.length), x: ox + sd.x * rr0, y: oy + .02, z: oz + sd.z * rr0, h: hh, w: hh * (.32 + R() * .12) + .04,
          q: new THREE.Quaternion().setFromUnitVectors(up, d2).multiply(new THREE.Quaternion().setFromAxisAngle(up, R() * 6.28)), tiny: true }); } } }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  geos.forEach((g, gi) => { const mine = cs.filter(c => c.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((c, j) => { m4.compose(pos.set(c.x, c.y, c.z), c.q, sc.set(c.w, c.h, c.w)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  const tg = [], ax = new THREE.Vector3();
  for (const c of cs) { if (c.tiny) { tg.push({ x: c.x, y: c.y + c.h * .4, z: c.z, r: .35 }); continue; } ax.set(0, 1, 0).applyQuaternion(c.q); const n = Math.max(1, Math.round(c.h / .6));
    for (let k = 0; k < n; k++) { const s = (k + .5) / n * c.h * 1.2; tg.push({ x: c.x + ax.x * s, y: c.y + ax.y * s, z: c.z + ax.z * s, r: c.w * .5 }); } }
  grp.userData = { targets: () => tg, uT, kind: 'crystal' };
  return grp;
}

/* ── 자수정 꽃 무리 벽 (사용자 2026-11-05: 벽보다는 크고 작은 결정이 중심에서 꽃처럼 핀 결정 덩어리들이 벽을 만드는 느낌) ──
   ① 꽃 한 송이: 가운데 뿌리에서 결정이 꽃잎처럼 사방으로 핌 — 한가운데는 가장 크고 곧게, 바깥 고리로 갈수록 짧고 많이 눕고 많아짐(꽃잎 겹)
      · 고리마다 결정 사이를 엇갈려 놓아 빈틈 없음 · 결정마다 뿌리에 작은 결정 한두 개가 바짝 붙어 갈라져 나옴
   ② 꽃 크기가 제각각(큰 송이 · 작은 송이) · 송이끼리 바짝 붙어 겹쳐 한 줄 벽이 됨 — 큰 송이 사이 틈은 작은 송이가 메움(건너편이 안 보이게)
   ③ 문 양옆: 가장 큰 송이 · 문 없는 끝은 작은 송이로 잦아듦
   같은 결정(prism)·같은 재질(crystalMaterial): 평소 빛 없음 · 뿌리 짙은 보라 → 끝 맑음 · 끝이 천천히 뻗었다 움츠러듦 · 맞으면 면마다 다른 색으로 꺾인 빛 */
export function makeCrystalWall(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || crystalMaterial(uT), geos = opt.geos || [1, 2, 3, 4, 5].map(prism), doors = opt.doors || [true, true];
  const R = (() => { let s = (opt.seed || 9) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const at = d => { const u = Math.min(1, Math.max(0, d / len)), p = curve.getPointAt(u), t = curve.getTangentAt(u); return { p, t, nx: -t.z, nz: t.x }; };
  const cs = [], up = new THREE.Vector3(0, 1, 0), BLK = [], tg = [];
  const put = (x, y, z, dir, h, w, tiny) => { const q = new THREE.Quaternion().setFromUnitVectors(up, dir).multiply(new THREE.Quaternion().setFromAxisAngle(up, R() * 6.28)); cs.push({ g: Math.floor(R() * geos.length), x, y, z, h, w, q, tiny }); return q; };
  /* 꽃 한 송이 (가운데 x,z · 크기 S) */
  const flower = (x, z, S) => {
    const rings = S > 1.1 ? 3 : 2;
    put(x, -.3, z, new THREE.Vector3((R() - .5) * .12, 1, (R() - .5) * .12).normalize(), 2.3 * S, .55 * S + .1);             /* 한가운데: 가장 크고 곧게 */
    for (let r = 1; r <= rings; r++) { const k = r / rings, n = 4 + r * 3 + Math.floor(R() * 2), ph = R() * 6.28;
      for (let i = 0; i < n; i++) { const a = ph + (i + (r % 2) * .5) / n * 6.28 + (R() - .5) * .3, ca = Math.cos(a), sa = Math.sin(a), rad = (.18 + .5 * k) * S;
        const lean = .2 + k * k * 2.1 + (R() - .5) * .2;   /* 바깥 고리는 거의 옆으로 벌어짐 */                                                                          /* 바깥 고리일수록 많이 누움 (꽃잎이 벌어짐) */
        const dir = new THREE.Vector3(ca * lean, 1, sa * lean).normalize(), h = (2.1 - k * 1.05) * S * (.8 + R() * .35), w = h * (.24 + R() * .1) + .06;
        const q = put(x + ca * rad, -.3 + (1 - k) * .05, z + sa * rad, dir, h, w);
        if (R() < .55) { const b = R() * 6.28, sd = new THREE.Vector3(Math.cos(b), 0, Math.sin(b)).applyQuaternion(q), d2 = dir.clone().multiplyScalar(.9).addScaledVector(sd, .6).normalize(), hh = h * (.25 + R() * .2);   /* 뿌리에 붙은 작은 결정 */
          put(x + ca * rad + sd.x * w * .5, -.28, z + sa * rad + sd.z * w * .5, d2, hh, hh * .35 + .04, true); } } }
    BLK.push({ x, z, r: .85 * S + .15, top: 2 * S }); tg.push({ x, y: S, z, r: S * .8 }); };
  /* 송이 놓기: 큰 송이 · 작은 송이 번갈아 바짝 붙여 */
  const endK = d => { const ds = doors[0] ? 9 : d, de = doors[1] ? 9 : len - d; return Math.min(1, .55 + Math.min(ds, de) / 4); };
  for (let d = .2; d < len;) { const big = R() < .6, S = (big ? 1.15 + R() * .55 : .65 + R() * .3) * endK(d), a = at(d), off = (R() - .5) * .5;
    flower(a.p.x + a.nx * off, a.p.z + a.nz * off, S); d += S * 1.55 + R() * .3; }   /* 송이가 하나하나 보이게 띄우되, 바깥 꽃잎끼리는 겹쳐 틈이 없음 */
  for (let d = .9 + R() * .5; d < len - .4; d += 2.4 + R() * 1.6) { const a = at(d), side = R() < .5 ? -1 : 1, S = (.38 + R() * .2) * endK(d);   /* 틈 메우는 작은 송이 (앞뒤로 살짝 비켜) */
    flower(a.p.x + a.nx * side * .75, a.p.z + a.nz * side * .75, S); }
  for (const end of [0, 1]) if (doors[end]) { const a = at(end ? len - .7 : .7); flower(a.p.x, a.p.z, 1.65); }   /* 문 양옆 가장 큰 송이 */
  /* 못 지나가는 자리 = 결정이 실제로 덮은 땅 그대로 (사용자 2026-11-05: 옆으로 누운 바깥 꽃잎 아래로 기체가 겹쳐 들어감)
     결정마다 뿌리에서 끝까지 땅 위에 비친 자리를 따라 동그라미를 늘어놓음 — 낮게 누운 꽃잎도 막힘 */
  { const ax = new THREE.Vector3(); for (const c of cs) { if (c.tiny) continue; ax.set(0, 1, 0).applyQuaternion(c.q); const L = c.h * 1.6, hl = Math.hypot(ax.x, ax.z) * L, n = Math.max(1, Math.ceil(hl / .45));
      for (let k = 0; k <= n; k++) { const t = k / n * L * .92; BLK.push({ x: c.x + ax.x * t, z: c.z + ax.z * t, r: c.w * .42 + .08, top: c.y + ax.y * t + c.w * .4 + .6 }); } } }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  geos.forEach((g, gi) => { const mine = cs.filter(c => c.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length); mine.forEach((c, j) => { m4.compose(pos.set(c.x, c.y, c.z), c.q, sc.set(c.w, c.h, c.w)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  grp.userData = { targets: () => tg, uT, kind: 'crystal', blockers: BLK };
  return grp;
}
