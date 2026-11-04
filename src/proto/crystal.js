/* 맵 벽 — 자수정 무리 (결정 협곡)
   큰 결정 무리가 이어진 벽. 큰 결정마다 뿌리에서 작은 결정이 비스듬히 갈라져 나와 바짝 붙어 있다.
   · 결정 하나: 수정처럼 육각 기둥 + 끝이 정확한 여섯 면으로 깎인 뾰족한 머리. 면이 빠지는 곳이 없게 모든 면을 바깥으로 맞춤.
   · 평소: 빛나지 않는다. 뿌리는 짙은 보라, 끝으로 갈수록 맑아짐(자수정의 색 띠). 끝이 아주 천천히 뻗었다 움츠러든다(살아 있음).
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 결정 속으로 들어간 빛이 면마다 다르게 꺾여 면마다 다른 색으로 0.7초쯤 반짝인다(칠한 무지개가 아님).
     맞은 결정은 움찔 움츠러들었다가 다시 뻗는다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11042117';

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
  const m = new THREE.MeshPhysicalMaterial({ color: 0x14081f, roughness: .025, metalness: 0, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 1.5, ior: 1.9, specularIntensity: 1, specularColor: 0xf3eaff, flatShading: true });
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
