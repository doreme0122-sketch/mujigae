/* 맵 벽 — 성운 산호 (안개 늪)
   성운 가스가 식어 굳으며 산호처럼 가지를 뻗은 벽. 한 뿌리에서 갈라지고 또 갈라져, 가지 끝마다 작은 방울이 맺혀 있다.
   · 평소: 빛나지 않는다. 어두운 청록에서 끝으로 갈수록 보랏빛, 겉은 반투명하게 가장자리가 밝다. 아주 천천히 물속처럼 흔들린다.
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 가지 끝 방울들이 반딧불처럼 하나씩 시차를 두고 깜빡이며 켜졌다가 0.9초쯤에 꺼진다.
     가지에도 끝 쪽으로 빛이 살짝 번진다. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HITS } from './rocks.js?v=11042108';

const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/* 산호 하나: 가지를 재귀로 뻗고 끝에 방울 */
export function coral(seed, lite = false) {   /* lite: 맵 전체에 깔 때 — 위에서 40m 떨어져 보면 같은 모양, 삼각형은 절반 아래 */
  const R = rng(seed), parts = [], up = new THREE.Vector3(0, 1, 0), MAX = 4;
  const seg = (a, b, r0, r1, d) => { const L = a.distanceTo(b), g = new THREE.CylinderGeometry(r1, r0, L, lite ? 5 : 7, lite ? 1 : 2, true); g.translate(0, L / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, b.clone().sub(a).normalize())); g.translate(a.x, a.y, a.z);
    const n = g.attributes.position.count; g.setAttribute('aD', new THREE.Float32BufferAttribute(new Array(n).fill(0).map((_, i) => (d + (g.attributes.position.getY(i) > (a.y + b.y) / 2 ? 1 : 0)) / MAX), 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(R()), 1)); g.deleteAttribute('uv'); parts.push(g); };
  const bulb = (p, r) => { const g = new THREE.IcosahedronGeometry(r, lite ? 0 : 1); g.translate(p.x, p.y, p.z); const n = g.attributes.position.count;
    g.setAttribute('aD', new THREE.Float32BufferAttribute(new Array(n).fill(1.25), 1)); g.setAttribute('aS', new THREE.Float32BufferAttribute(new Array(n).fill(R()), 1)); g.deleteAttribute('uv'); parts.push(g); };
  const grow = (p, dir, len, r, d) => { const bend = new THREE.Vector3(R() - .5, R() * .3, R() - .5).multiplyScalar(.35);
    const mid = p.clone().addScaledVector(dir, len * .5).add(bend.clone().multiplyScalar(len * .3)), end = p.clone().addScaledVector(dir.clone().add(bend).normalize(), len);
    seg(p, mid, r, r * .86, d); seg(mid, end, r * .86, r * .72, d);
    if (d >= MAX - 1) { bulb(end, r * (1.1 + R() * .7)); return; }
    const n = 2 + (R() < .45 ? 1 : 0), nd = end.clone().sub(mid).normalize();
    for (let i = 0; i < n; i++) { const a = R() * 6.28, spread = .45 + R() * .45, side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const cd = nd.clone().addScaledVector(side, spread).add(new THREE.Vector3(0, .25, 0)).normalize(); grow(end, cd, len * (.66 + R() * .12), r * .72, d + 1); } };
  const nr = 2 + Math.floor(R() * 2);
  for (let i = 0; i < nr; i++) { const a = R() * 6.28; grow(new THREE.Vector3(Math.cos(a) * .15, -.2, Math.sin(a) * .15), new THREE.Vector3(Math.cos(a) * .4, 1, Math.sin(a) * .4).normalize(), .75 + R() * .25, .11, 0); }
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); g.computeVertexNormals(); return g;
}

export function coralMaterial(uT) {
  const m = new THREE.MeshStandardMaterial({ color: 0x0b2a2c, roughness: .5, metalness: .05, envMapIntensity: .35 });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'uniform float uT; attribute float aD; attribute float aS; varying float vD; varying float vS; varying vec3 vKw;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vD=aD; vS=aS;
        { vec3 org=vec3(0.);
          #ifdef USE_INSTANCING
            org=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
          #endif
          float sway=min(aD,1.)*min(aD,1.)*.06;                                                     /* 물속처럼 아주 천천히 흔들림 (끝일수록) */
          transformed.x+=sin(uT*.7+org.x*.5+position.y*1.3)*sway; transformed.z+=cos(uT*.6+org.z*.5+position.y*1.1)*sway; }`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vKw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying float vD; varying float vS; varying vec3 vKw;
      float kh(float x){ return fract(sin(x*127.1)*43758.5453); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float ndv=abs(dot(normal,normalize(vViewPosition))), d=min(vD,1.), tip=step(1.1,vD);
        diffuseColor.rgb=mix(vec3(.012,.05,.055),vec3(.05,.025,.08),smoothstep(.2,1.,d));                /* 뿌리 청록 → 끝 보라 */
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.08,.06,.12),tip*.6);
        diffuseColor.rgb+=vec3(.03,.08,.09)*pow(max(1.-ndv,0.),2.5)*(.5+d);                                  /* 반투명한 가장자리 */
        float fire=0., wash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>1.2) continue; float dd=distance(vKw,uHits[i].xyz); if(dd>3.4) continue;
          float fall=exp(-dd*dd*.36);
          float delay=dd/9.+kh(vS*31.+float(i))*.35;                                                /* 방울마다 시차 */
          float a2=age-delay; if(a2<0.) continue;
          float blink=exp(-a2*3.2)*(.65+.35*sin(a2*38.+vS*20.));                                     /* 반딧불처럼 깜빡 */
          fire+=fall*blink;
          wash+=fall*exp(-age*4.); }
        if(fire+wash>.003){
          vec3 c=mix(vec3(.35,1.,.75),vec3(.75,.55,1.2),kh(vS*7.));
          totalEmissiveRadiance+=c*fire*tip*3.4 + c*wash*d*d*.5; }`); };
  m.customProgramCacheKey = () => 'nebula-coral';
  return m;
}

export function makeCoralRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = opt.mat || coralMaterial(uT), geos = opt.geos || [1, 2, 3, 4].map(coral), R = rng(opt.seed || 41);
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const cs = [], tg = [];
  for (let d = .5; d < len - .3; d += 1.9 + R() * 1.2) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x;
    const edge = Math.min(1, .45 + (opt.noTaper ? 9 : Math.min(u, 1 - u)) * len / 6), side = (R() - .5) * 1.6, s = (1.5 + R() * .9) * edge;
    cs.push({ g: Math.floor(R() * 4), x: p.x + nx * side, z: p.z + nz * side, s, yaw: R() * 6.28 });
    if (R() < .5) { const a = R() * 6.28, rr = 1 + R() * .8; cs.push({ g: Math.floor(R() * 4), x: p.x + nx * side + Math.cos(a) * rr, z: p.z + nz * side + Math.sin(a) * rr, s: s * (.45 + R() * .25), yaw: R() * 6.28 }); } }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  geos.forEach((g, gi) => { const mine = cs.filter(c => c.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((c, j) => { m4.compose(pos.set(c.x, -.5, c.z), q.setFromAxisAngle(Y, c.yaw), sc.setScalar(c.s)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  for (const c of cs) for (let k = 0; k < 3; k++) tg.push({ x: c.x, y: -.5 + c.s * (.5 + k * .7), z: c.z, r: c.s * (.45 + k * .1) });
  grp.userData = { kind: 'coral', uT, targets: () => tg };
  return grp;
}
