/* 맵 벽 — 빙하 얼음 (얼음 성운 지대)
   거대한 얼음 덩어리들이 겹쳐 이어진 한 덩어리 벽. 빈틈이 없다.
   · 모양: 녹았다 다시 언 듯 둥글고 매끈한 덩어리, 군데군데 크게 쪼개진 면. 밑은 땅에 앉음.
   · 평소: 빛나지 않는다. 속에 푸른 층이 겹겹이 지고(오래 쌓여 언 결), 얼어붙은 기포가 있다. 위를 향한 면엔 하얀 서리.
   · 맞으면: 맞은 자리 근처(지름 3m 남짓) 속 깊이 갇힌 빛이 깨어나 얼음 층을 따라 퍼졌다가 0.7초쯤에 다시 언다.
   투명 재질(뒤를 비추는 계산)은 폰에 무거워서 쓰지 않고, 속은 보는 방향으로 몇 겹 들여다본 잡음으로 흉내 낸다. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HITS } from './rocks.js?v=11030035';

function hash(a, b, c) { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, s = t => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash(ix, iy, iz), hash(ix + 1, iy, iz), u), L(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u), v), L(L(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u), L(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u), v), w); }
const fbm = (x, y, z, o = 4) => { let s = 0, a = .5, q = 1; for (let i = 0; i < o; i++) { s += (vn(x * q, y * q, z * q) - .5) * a; a *= .5; q *= 2.05; } return s; };

/* 얼음 덩어리 하나 */
function block(seed) {
  const R = (() => { let s = seed * 9301 + 49297; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  let g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);   /* 면이 큰 덩어리 → 각진 얼음 */
  const P = g.attributes.position, v = new THREE.Vector3(), o = seed * 2.3;
  const cuts = []; for (let i = 0; i < 7 + Math.floor(R() * 4); i++) cuts.push([new THREE.Vector3(R() - .5, (R() - .2) * .9, R() - .5).normalize(), .45 + R() * .3]);
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i);
    v.multiplyScalar(1 + fbm(v.x * .8 + o, v.y * .8, v.z * .8 - o, 2) * .3);
    for (const [d, k] of cuts) { const h = v.dot(d); if (h > k) v.addScaledVector(d, -(h - k)); }       /* 깨끗하게 쪼개진 평평한 면 */
    v.y *= .78; if (v.y < -.25) v.y = -.25 + (v.y + .25) * .2;
    P.setXYZ(i, v.x, v.y, v.z); }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;   /* 면마다 또렷한 각 */
}

const NOISE = `float ih(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float inz(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(ih(i),ih(i+vec3(1,0,0)),f.x),mix(ih(i+vec3(0,1,0)),ih(i+vec3(1,1,0)),f.x),f.y),mix(mix(ih(i+vec3(0,0,1)),ih(i+vec3(1,0,1)),f.x),mix(ih(i+vec3(0,1,1)),ih(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

export function iceMaterial(uT) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x041a2b, roughness: .05, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: .85, ior: 1.31, specularIntensity: 1, specularColor: 0xd2f2ff, flatShading: true });
  m.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.uniforms.uHits = HITS;
    sh.vertexShader = 'varying vec3 vIw; varying vec3 vNw;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 w4=vec4(transformed,1.); vec4 n4=vec4(objectNormal,0.);
          #ifdef USE_INSTANCING
            w4=instanceMatrix*w4; n4=instanceMatrix*n4;
          #endif
          vIw=(modelMatrix*w4).xyz; vNw=normalize((modelMatrix*n4).xyz); }`);
    sh.fragmentShader = `uniform float uT; uniform vec4 uHits[16]; varying vec3 vIw; varying vec3 vNw; ${NOISE}
      float layers(vec3 q){ float w=q.y*3.4+inz(q*vec3(.35,.2,.35))*5.+inz(q*1.3)*.6; return smoothstep(.55,1.,sin(w))*.8+smoothstep(.9,1.,sin(w*2.3+1.))*.4; }\n` + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float frost=smoothstep(.7,.97,vNw.y)*(.25+.75*smoothstep(.3,.8,inz(vIw*1.6+4.)*.7+inz(vIw*4.3)*.3));               /* 부드럽게 번진 서리 */          /* 위를 향한 면에 앉은 서리 */
        roughnessFactor=mix(roughnessFactor,.75,frost);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 Vw=normalize(cameraPosition-vIw); float ndv=abs(dot(normal,normalize(vViewPosition)));
        /* 속 들여다보기: 겹겹이 언 푸른 층 + 기포 */
        float lay=0., bub=0.;
        for(int k=1;k<=4;k++){ float fade=1.-float(k)*.2; vec3 q=vIw-Vw*(.32*float(k));
          lay+=layers(q)*fade;
          vec3 bc=floor(q*8.); bub+=step(.986,ih(bc+float(k)))*smoothstep(.42,.06,length(fract(q*8.)-.5))*fade; }
        vec3 inside=vec3(.004,.03,.065)+vec3(.025,.11,.2)*lay*.6+vec3(.3,.45,.55)*bub*.55;
        diffuseColor.rgb=mix(inside*1.3,diffuseColor.rgb,pow(max(1.-ndv,0.),1.6));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.4,.5,.58),frost*.45);
        /* 맞으면: 속 깊이 갇힌 빛이 깨어나 층을 따라 퍼짐 */
        float hot=0., flash=0.;
        for(int i=0;i<16;i++){ float age=uT-uHits[i].w; if(age<0.||age>.9) continue; vec3 d3=vIw-uHits[i].xyz; float d2=dot(d3,d3); if(d2>10.) continue;
          float fall=exp(-d2*.5); hot+=fall*exp(-age*4.2); flash+=fall*exp(-age*26.); }
        if(hot>.003){
          totalEmissiveRadiance+=vec3(.25,.6,1.15)*hot*(.35+lay*1.6+bub*2.)*(1.-frost*.6)*1.6 + vec3(.85,.95,1.)*flash*.7; }`); };
  m.customProgramCacheKey = () => 'ice-glacier';
  return m;
}

/* 능선: 덩어리를 겹쳐 빈틈없이 잇는다 (큰 덩어리 등줄기 + 앞뒤로 받치는 덩어리 + 발치 조각) */
export function makeIceRidge(path, opt = {}) {
  const uT = opt.uT || { value: 0 }, mat = iceMaterial(uT);
  const geos = [1, 2, 3, 4, 5, 6].map(block);
  const R = (() => { let s = (opt.seed || 5) * 7919; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })();
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'), len = curve.getLength();
  const bl = [];
  const put = (u, side, s, y, stretch) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u), nx = -t.z, nz = t.x, yaw = Math.atan2(t.x, t.z);
    bl.push({ g: Math.floor(R() * geos.length), x: p.x + nx * side, z: p.z + nz * side, y, sq: [s * (.85 + R() * .3), s * (.8 + R() * .45), s * stretch * (.9 + R() * .3)], q: new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - .5) * .25, yaw + (R() - .5) * .5, (R() - .5) * .25)) }); };
  for (let d = 0; d < len; d += 2.8 + R() * 1.6) { const u = d / len, edge = Math.min(1, .5 + Math.min(u, 1 - u) * len / 6); put(u, (R() - .5) * .8, (1.7 + R() * .9) * edge, .1 + R() * .4, 1.35); }
  for (let d = 1.4; d < len; d += 4.2 + R() * 2.5) { const u = d / len, edge = Math.min(1, .5 + Math.min(u, 1 - u) * len / 6); put(u, (R() < .5 ? -1 : 1) * (1.1 + R() * .6), (1 + R() * .7) * edge, -.1 + R() * .2, 1.2); }
  for (let d = 0; d < len; d += 2 + R() * 2.2) { const u = d / len; put(u, (R() < .5 ? -1 : 1) * (2.1 + R() * 1.2), .25 + R() * .35, -.25, 1); }
  const grp = new THREE.Group(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  geos.forEach((g, gi) => { const mine = bl.filter(b => b.g === gi); if (!mine.length) return;
    const im = new THREE.InstancedMesh(g, mat, mine.length);
    mine.forEach((b, j) => { m4.compose(pos.set(b.x, b.y, b.z), b.q, sc.set(...b.sq)); im.setMatrixAt(j, m4); });
    im.computeBoundingSphere(); grp.add(im); });
  const tg = bl.map(b => ({ x: b.x, y: b.y + b.sq[1] * .25, z: b.z, r: Math.min(b.sq[0], b.sq[2]) * .75 }));
  grp.userData = { targets: () => tg, uT, kind: 'ice' };
  return grp;
}
