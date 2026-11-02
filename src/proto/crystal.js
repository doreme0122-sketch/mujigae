/* 맵 벽 — 살아 있는 결정 (결정 협곡)
   한 뿌리에서 여러 방향으로 뻗은 결정 무리. 결정 하나는 양끝이 뾰족한 육각 기둥(수정 모양), 면이 크고 또렷하다.
   · 평소: 빛나지 않는다. 맑고 옅은 보랏빛 결정. 끝이 아주 천천히 뻗었다 움츠러든다(자라는 중 — 살아 있음).
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 결정 속으로 들어간 빛이 면마다 다르게 꺾여 갈라진다 —
     맞은 쪽에서 들어온 빛의 방향과 면의 기울기에 따라 면마다 다른 색(빨강~보라)으로 0.7초쯤 반짝이고 사라진다(칠한 무지개가 아님).
     맞은 결정은 움찔 움츠러들었다가 다시 뻗는다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11021255';

/* 결정 하나: 양끝이 뾰족한 육각 기둥, 위 끝이 길고 아래 끝은 짧게 뿌리에 박힘 */
function prism(seed) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const pts = [], top = 1.25 + R() * .25, tipOff = new THREE.Vector2((R() - .5) * .12, (R() - .5) * .12);
  const g = new THREE.CylinderGeometry(.4, .4, 1, 6, 1, true); g.translate(0, .5, 0);
  const P = g.attributes.position, v = new THREE.Vector3(), rr = [1, .82 + R() * .3, 1, .85 + R() * .3, 1, .9 + R() * .2, 1];   /* 면 너비를 조금씩 다르게 */
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const a = Math.atan2(v.z, v.x), k = rr[Math.round(((a + Math.PI) / (Math.PI * 2)) * 6) % 6];
    v.x *= k; v.z *= k; P.setXYZ(i, v.x, v.y, v.z); }
  const body = g.toNonIndexed();
  /* 위 끝(긴 피라미드)과 아래 끝(짧은 피라미드)을 기둥 테두리에 붙인다 */
  const ring = (y) => { const r = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, s = rr[k]; r.push(new THREE.Vector3(Math.cos(a) * .4 * s, y, Math.sin(a) * .4 * s)); } return r; };
  const cap = (y, apex) => { const r = ring(y), out = []; for (let k = 0; k < 6; k++) { const a = r[k], b = r[(k + 1) % 6]; out.push(...(apex.y > y ? [a, apex, b] : [a, b, apex])); } return out; };
  const tri = [...cap(1, new THREE.Vector3(tipOff.x, top, tipOff.y)), ...cap(0, new THREE.Vector3(0, -.3, 0))];
  const tg = new THREE.BufferGeometry().setFromPoints(tri);
  const pos = new Float32Array(body.attributes.position.array.length + tri.length * 3); pos.set(body.attributes.position.array); pos.set(tg.attributes.position.array, body.attributes.position.array.length);
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.computeVertexNormals(); return out;
}

export function crystalMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x0f0b1e, roughness: .025, metalness: 0, clearcoat: 1, clearcoatRoughness: .01, envMapIntensity: 1.6, ior: 2.0, specularIntensity: 1, specularColor: 0xf2ecff, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vCw; varying vec3 vCo; varying float vSeed; varying vec3 vOrg;
      float chh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 org=vec3(0.);
          #ifdef USE_INSTANCING
            org=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
          #endif
          vSeed=chh(org); vOrg=org;
          float grow=sin(uT*.5+vSeed*6.28)*.05;                                                     /* 끝이 아주 천천히 뻗었다 움츠러듦 */
          float flinch=0.;
          for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; float d=distance(org,uHits[i].xyz); if(d>3.) continue;
            flinch+=exp(-d*d*.4)*age*exp(-age*7.)*2.2; }                                           /* 맞으면 움찔 → 다시 뻗음 */
          float tipk=smoothstep(.9,1.4,position.y);
          transformed.y+=tipk*(grow-flinch*.35);
          transformed.xz*=1.-flinch*.08; }`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vCo=position; { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vCw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vCw; varying vec3 vCo; varying float vSeed; varying vec3 vOrg;
      vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      float chf(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Nw=normalize(cross(dFdx(vCw),dFdy(vCw))); float ndv=abs(dot(normal,normalize(vViewPosition)));
        /* 평소: 맑은 결정 — 정면은 속이 깊고 투명하게(어둡고 맑음), 비스듬하면 겉면 반사 */
        vec3 inside=vec3(.025,.018,.05)+vec3(.09,.07,.15)*pow(chf(floor(vCo*3.)+vSeed),6.);              /* 속의 작은 결 */
        diffuseColor.rgb=mix(inside,diffuseColor.rgb,pow(1.-ndv,1.4));
        /* 맞으면: 들어온 빛이 면마다 다르게 꺾여 갈라진다 */
        vec3 disp=vec3(0.); float flash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; vec3 d3=vCw-uHits[i].xyz; float d2=dot(d3,d3); if(d2>10.) continue;
          float fall=exp(-d2*.5), life=exp(-age*4.5);
          vec3 Ld=normalize(vOrg-uHits[i].xyz+vec3(0.,.3,0.));                                       /* 맞은 쪽에서 결정으로 들어온 빛의 방향 (결정마다 하나) */
          float bend=dot(Nw,Ld)*1.3+dot(Nw,vec3(.3,.8,.5))*.7+vSeed+age*.6;                    /* 면마다 한 색 */                              /* 면 기울기 → 꺾이는 정도 → 색 */
          disp+=hue(fract(bend))*fall*life;
          flash+=fall*exp(-age*24.); }
        if(dot(disp,vec3(1.))+flash>.003){
          float face=.45+.55*pow(ndv,.7);
          totalEmissiveRadiance+=disp*face*2.2+vec3(1.)*flash*.9;
          totalEmissiveRadiance+=disp*pow(1.-ndv,3.)*1.8; }`); };
  m.customProgramCacheKey = () => 'living-crystal';
  return m;
}

/* 능선: 결정 무리(한 뿌리에서 부채처럼 뻗음)를 길을 따라 */
export function makeCrystalRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = crystalMaterial(uT);
  const geos = [1, 2, 3, 4].map(prism);
  const R = (() => { let s = (opt.seed || 9) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const cs = [], up = new THREE.Vector3(0, 1, 0);
  const add = (x, y, z, h, w, dir) => { const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(up, R() * 6.28));
    cs.push({ g: Math.floor(R() * geos.length), x, y, z, h, w, q }); };
  for (let d = 0; d < len; d += 2.2 + R() * 1.5) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x;
    const edge = Math.min(1, .45 + Math.min(u, 1 - u) * len / 7), side = (R() - .5) * 1.4, cx = p.x + nx * side, cz = p.z + nz * side, n = 4 + Math.floor(R() * 5), big = (1.6 + R() * 1.6) * edge;
    for (let k = 0; k < n; k++) { const a = R() * 6.28, spread = k === 0 ? .15 : .35 + R() * .75;      /* 한 뿌리에서 부채처럼 */
      const dir = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread);
      add(cx + Math.cos(a) * .2, -.5, cz + Math.sin(a) * .2, big * (k === 0 ? 1 : .35 + R() * .55), k === 0 ? .9 + R() * .3 : .4 + R() * .4, dir); } }
  for (let d = 0; d < len; d += .8 + R() * .7) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x, s = (R() < .5 ? -1 : 1) * (1.5 + R() * 1.6);   /* 바닥에 누운 작은 결정 */
    add(p.x + nx * s, -.35, p.z + nz * s, .3 + R() * .45, .22 + R() * .2, new THREE.Vector3(R() - .5, .25 + R() * .5, R() - .5)); }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  geos.forEach((g, gi) => { const mine = cs.filter(c => c.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((c, j) => { m4.compose(pos.set(c.x, c.y, c.z), c.q, sc.set(c.w, c.h, c.w)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  const tg = [], ax = new THREE.Vector3();
  for (const c of cs) { ax.set(0, 1, 0).applyQuaternion(c.q); const n = Math.max(1, Math.round(c.h / .7));
    for (let k = 0; k < n; k++) { const s = (k + .5) / n * c.h * 1.1; tg.push({ x: c.x + ax.x * s, y: c.y + ax.y * s, z: c.z + ax.z * s, r: c.w * .42 }); } }
  grp.userData = { targets: () => tg, uT, kind: 'crystal' };
  return grp;
}
