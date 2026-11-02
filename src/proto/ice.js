/* 맵 벽 — 얼어붙은 빛 기둥 (얼음 성운 지대)
   육각 얼음 기둥이 무리 지어 비스듬히 솟은 벽. 끝은 깨진 결정처럼 뾰족하고 제각각.
   · 평소: 빛나지 않는다. 깊고 맑은 푸른 얼음, 속에 얼어붙은 금(하얀 막)과 작은 기포가 깊이마다 보인다(속을 들여다보는 느낌).
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 얼음 속에 갇혀 있던 빛줄기가 깨어나 기둥을 타고 위로 흘러가며 0.7초쯤에 다시 얼어붙는다.
     맞는 순간 깎인 면의 모서리에서 빛이 갈라져 무지개가 아주 짧게 반짝인다(칠한 무지개가 아님).
   투명 재질(뒤를 비추는 계산)은 폰에 무거워서 쓰지 않고, 속은 보는 방향으로 몇 겹 들여다본 잡음으로 흉내 낸다. */
import * as THREE from 'three';
import { HITS } from './rocks.js?v=11021246';

/* 기둥 하나: 육각, 아래가 조금 굵고, 끝은 깨진 결정 */
function column(seed) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const g = new THREE.CylinderGeometry(.42, .5, 1, 6, 5, false); g.translate(0, .5, 0);
  const P = g.attributes.position, v = new THREE.Vector3();
  const tipH = .25 + R() * .45, tilt = new THREE.Vector2(R() - .5, R() - .5).multiplyScalar(.35);
  const cut = new THREE.Vector3(R() - .5, 1.2, R() - .5).normalize(), cutK = .95 + R() * .1;
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
    if (v.y > .999) { const r = Math.hypot(v.x, v.z);                                 /* 윗면 → 뾰족한 끝 */
      if (r < .01) { v.y = 1 + tipH; v.x += tilt.x; v.z += tilt.y; } else { v.y = 1 + (R() - .5) * .12; } }
    const h = v.dot(cut); if (h > cutK + tipH * .6) v.addScaledVector(cut, -(h - cutK - tipH * .6) * .9);   /* 비스듬히 깨진 면 */
    const k = 1 - v.y * .08; v.x *= k; v.z *= k;                                        /* 위로 갈수록 살짝 가늘게 */
    P.setXYZ(i, v.x, v.y, v.z); }
  g.deleteAttribute('uv'); const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;   /* 면이 또렷하게 */
}

const NOISE = `float ih(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float inz(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(ih(i),ih(i+vec3(1,0,0)),f.x),mix(ih(i+vec3(0,1,0)),ih(i+vec3(1,1,0)),f.x),f.y),mix(mix(ih(i+vec3(0,0,1)),ih(i+vec3(1,0,1)),f.x),mix(ih(i+vec3(0,1,1)),ih(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

export function iceMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x041722, roughness: .035, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.5, ior: 1.31, specularIntensity: 1, specularColor: 0xd6f4ff, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'varying vec3 vIw; varying vec3 vIo;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vIo=position; { vec4 w4=vec4(transformed,1.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4;
          #endif
          vIw=(modelMatrix*w4).xyz; }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vIw; varying vec3 vIo; ${NOISE}
      vec3 film(float d,float ct){ vec3 ph=6.2832*2.*1.31*d*ct/vec3(640.,540.,450.); return .5-.5*cos(ph); }\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Vw=normalize(cameraPosition-vIw); float ndv=abs(dot(normal,normalize(vViewPosition)));
        /* 속 들여다보기: 보는 방향 반대로 세 겹 */
        float fr=0., bub=0., deep=0.;
        for(int k=1;k<=4;k++){ float dk=.28*float(k); vec3 q=vIw-Vw*dk; float fade=1.-float(k)*.2;
          float n=inz(q*vec3(1.4,.55,1.4)+float(k)*7.); fr+=smoothstep(.46,.5,n)*smoothstep(.56,.5,n)*fade;   /* 속 깊이 얼어붙은 금: 흐릿한 하얀 막 */
          vec3 bc=floor(q*7.); float b=ih(bc+float(k)); bub+=step(.988,b)*smoothstep(.4,.05,length(fract(q*7.)-.5))*fade;
          deep+=inz(q*.8+3.)*fade*.25; }
        vec3 inside=vec3(.02,.1,.16)*(.6+deep)+vec3(.16,.3,.38)*fr*.45+vec3(.5,.62,.7)*bub*.5;       /* 정면에선 속이 들여다보임 */
        diffuseColor.rgb=mix(inside*1.4,diffuseColor.rgb,pow(1.-ndv,1.5));                          /* 비스듬하면 겉의 반사가 덮음 */
        /* 맞으면: 근처 얼음 속 빛줄기가 깨어나 위로 흐른다 */
        float hot=0., flow=0., flash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; vec3 d3=vIw-uHits[i].xyz; float d2=dot(d3,d3); if(d2>10.) continue;
          float fall=exp(-d2*.5);
          hot+=fall*exp(-age*5.);
          float dy=vIw.y-(uHits[i].y+age*4.5);                                                    /* 맞은 높이에서 위로 부드럽게 올라가는 빛 띠 */
          flow+=exp(-d3.x*d3.x*.35-d3.z*d3.z*.35)*exp(-dy*dy*1.2)*exp(-age*2.8);
          flash+=fall*exp(-age*26.); }
        if(hot+flow>.002){
          totalEmissiveRadiance+=(vec3(.35,.7,1.2)*flow*1.8 + vec3(.12,.4,.85)*hot)*(.55+fr*2.2+deep*.6) + vec3(.9,.97,1.)*flash*.8;   /* 빛이 얼음 속 금에 걸려 퍼짐 */
          float edge=pow(1.-ndv,3.);                                                                    /* 깎인 면 모서리: 맞는 순간만 무지개 */
          totalEmissiveRadiance+=film(300.+240.*inz(vIo*5.),ndv)*edge*flash*2.2; }`); };
  m.customProgramCacheKey = () => 'ice-pillar';
  return m;
}

/* 능선: 길을 따라 기둥 무리를 세운다 */
export function makeIceRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = iceMaterial(uT);
  const geos = [1, 2, 3, 4, 5].map(column);
  const R = (() => { let s = (opt.seed || 5) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const cols = [];
  const add = (x, z, h, w, tx, tz, ry) => cols.push({ g: Math.floor(R() * geos.length), x, z, h, w, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(tx, ry, tz, 'YXZ')) });
  for (let d = 0; d < len; d += 2.4 + R() * 1.6) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x;
    const edge = Math.min(1, .45 + Math.min(u, 1 - u) * len / 7), side = (R() - .5) * 1.6, cx = p.x + nx * side, cz = p.z + nz * side;
    const big = (1.8 + R() * 1.8) * edge, n = 3 + Math.floor(R() * 4);
    add(cx, cz, big, 1.05 + R() * .5, (R() - .5) * .2, (R() - .5) * .2, R() * 6.28);                  /* 가운데 큰 기둥 */
    for (let k = 0; k < n; k++) { const a = R() * 6.28, r = .5 + R() * 1.1, ox = Math.cos(a), oz = Math.sin(a);   /* 둘레로 기울어 퍼진 기둥 */
      add(cx + ox * r, cz + oz * r, big * (.35 + R() * .5), .5 + R() * .45, oz * (.25 + R() * .35), -ox * (.25 + R() * .35), R() * 6.28); } }
  for (let d = 0; d < len; d += .7 + R() * .6) { const u = d / len, p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x, s = (R() < .5 ? -1 : 1) * (1.6 + R() * 1.6);   /* 발치의 작은 조각 */
    add(p.x + nx * s, p.z + nz * s, .3 + R() * .5, .25 + R() * .25, (R() - .5) * 1.4, (R() - .5) * 1.4, R() * 6.28); }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  geos.forEach((g, gi) => { const mine = cols.filter(c => c.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((c, j) => { m4.compose(pos.set(c.x, -.4, c.z), c.q, sc.set(c.w, c.h, c.w)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  /* 맞는 자리 판정: 기둥 축을 따라 공 몇 개 */
  const tg = [], up = new THREE.Vector3();
  for (const c of cols) { up.set(0, 1, 0).applyQuaternion(c.q); const n = Math.max(1, Math.round(c.h / .8));
    for (let k = 0; k < n; k++) { const s = (k + .5) / n * c.h; tg.push({ x: c.x + up.x * s, y: -.4 + up.y * s, z: c.z + up.z * s, r: c.w * .5 }); } }
  grp.userData = { cols, targets: () => tg, uT, kind: 'ice' };
  return grp;
}
