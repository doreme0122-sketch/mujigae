/* 하늘 맵 구름 (사용자 2026-11-06)
   · 층 사이 구름: 가운데층과 아래층 사이에 엷은 구름 덩어리가 천천히 흘러감 → 아래층이 구름 사이로 보였다 가려졌다 (깊이감)
   · 기체 높이 구름: 몇 군데에 몽글몽글 뭉친 구름 → 기체가 들어가면 둘레가 밀려나며 흩어지고, 나가면 다시 모임 (숨는 곳으로 쓸 자리)
   · 모두 화면을 바라보는 판 한 장씩(한 번에 그림) · 모양은 판마다 다른 잡음으로 둥글게 깎음 · 깊을수록 하늘빛으로 옅어짐 */
import * as THREE from 'three';

const rnd = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const NOISE = `vec3 pm(vec3 x){ return mod(((x*34.)+1.)*x, 289.); }
  float sn(vec2 v){ const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244); vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.); vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.);
    vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.)); vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;
    vec3 x=2.*fract(p*C.www)-1.; vec3 hh=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox; m*=1.79284291-.85373472*(a0*a0+hh*hh);
    vec3 g; g.x=a0.x*x0.x+hh.x*x0.y; g.yz=a0.yz*x12.xz+hh.yz*x12.yw; return 130.*dot(m,g); }`;
export const CLOUD_NOISE = NOISE;

export function makeClouds(scene, { R0, R1, sect = 10, seed = 7 } = {}) {
  const R = rnd(seed), puffs = [], banks = [];
  /* 구름 세 높이 (사용자 2026-11-06: 위층·중간·아래층으로 나뉘게) — 종류 번호: 0 아래 · 1 숨는 뭉치 · 2 위 · 3 중간 흩어진 것 */
  const band = (n, y0, y1, s0, s1, kind) => { for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = R0 - 8 + R() * (R1 - R0 - 6);   /* 무지개 벽 밖(우주) 위로는 안 나가게 */
    puffs.push([Math.cos(a) * r, y0 + R() * (y1 - y0), Math.sin(a) * r, s0 + Math.pow(R(), 2.2) * (s1 - s0), R() * 100, kind]); } };   /* 작은 구름이 많고 큰 구름은 가끔 */
  band(sect * 26, -24, -9, 5, 32, 0);    /* 아래: 가운데층과 아래층 사이 · 크고 작게 (사용자 2026-11-07: 크고 작은 구름이 더 자주) */
  band(sect * 14, -1.2, 2.6, 2, 8, 3);    /* 중간: 기체 높이 구름 · 기체가 그냥 뚫고 지나감 */
  band(sect * 16, 10, 19, 4, 18, 2);      /* 위: 작은 섬들 사이 · 하늘빛으로 옅게 */
  /* 기체 높이 구름 뭉치: 조각마다 하나씩 (출구 길은 피함) */
  for (let i = 0; i < sect; i++) { const a = (i + .5 + (R() - .5) * .5) / sect * Math.PI * 2, r = R0 + (R1 - R0) * (.25 + R() * .5), cx = Math.cos(a) * r, cz = Math.sin(a) * r, rad = 6 + R() * 3;
    banks.push({ x: cx, z: cz, r: rad });
    for (let k = 0; k < 14; k++) { const b = R() * Math.PI * 2, d = Math.sqrt(R()) * rad; puffs.push([cx + Math.cos(b) * d, -.4 + R() * 2.4, cz + Math.sin(b) * d, 3.2 + R() * 2.6, R() * 100, 1]); } }
  const n = puffs.length, geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  const A = new Float32Array(n * 4), B = new Float32Array(n * 2); puffs.forEach((p, i) => { A.set([p[0], p[1], p[2], p[3]], i * 4); B.set([p[4], p[5]], i * 2); });
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(A, 4)); geo.setAttribute('aS', new THREE.InstancedBufferAttribute(B, 2)); geo.instanceCount = n;
  const U = { uT: { value: 0 }, uShip: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aP; attribute vec2 aS; uniform float uT; uniform vec3 uShip, uCam; varying vec2 vUv; varying float vSeed, vA, vY, vLow, vR;
      void main(){ vec3 c = aP.xyz; float kind = aS.y; vLow = kind; vSeed = aS.x; float bank = kind == 1. ? 1. : 0.;
        { float an = uT * (.0016 + fract(aS.x * 7.3) * .0012) * (1. - bank) + uT * .0003 * bank, ca = cos(an), sa = sin(an); c.xz = mat2(ca, sa, -sa, ca) * c.xz; c.y += sin(uT * .07 + aS.x) * .6; }   /* 맵 가운데를 축으로 아주 천천히 흘러감 (맵 밖으로 안 나감) */
        /* 기체가 지나가도 구름은 비켜 가지 않음 (사용자 2026-11-06) — 기체가 그냥 뚫고 지나감 */
        vA = 1.; float sz = aP.w; vY = c.y; vR = length(c.xz);
        vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), Up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 w = c + (R * position.x + Up * position.y * .62) * sz; vUv = position.xy + .5;
        float camD = distance(w, uCam); vA *= smoothstep(4., 14., camD);   /* 카메라 바로 앞은 비켜 줌 */
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vUv; varying float vSeed, vA, vY, vLow, vR; ${NOISE}
      void main(){ vec2 p = vUv * 2. - 1.; p.y *= 1.15;
        float n = sn(p * 1.6 + vSeed) * .5 + sn(p * 3.4 - vSeed * 1.7 + uT * .02) * .25;
        float body = smoothstep(1., .25, length(p) - n * .45);
        if (body < .01) discard;
        float shade = mix(.7, 1.05, smoothstep(-.8, .55, p.y + n * .35));   /* 아래쪽은 푸른 그늘 · 위는 햇빛 → 흰 구름 바다 위에서도 덩어리가 읽힘 */
        vec3 col = mix(vec3(.62, .7, .86), vec3(.97, .98, 1.), shade);
        float deep = clamp((-vY - 6.) / 22., 0., 1.); col = mix(col, vec3(.66, .74, .88), deep * .45);
        if (vLow > 1.5 && vLow < 2.5) col = mix(col, vec3(.92, .95, 1.), .35);   /* 위 구름: 하늘빛 */
        { float jz = smoothstep(200., 155., vR); col = mix(col, vec3(.42, .3, .62) * (.7 + shade * .5), jz * .75); }   /* 우주 정글 위 구름은 보랏빛 */
        float a = body * (vLow < .5 ? .66 - deep * .12 : vLow < 1.5 ? .85 : vLow < 2.5 ? .5 : .72) * vA;
        gl_FragColor = linearToOutputTexel(vec4(col, a)); }` });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 30; scene.add(mesh);
  const inCloud = (x, z) => banks.some(b => Math.hypot(x - b.x, z - b.z) < b.r);   /* 숨는 곳 판정용 (게임 규칙은 나중에) */
  const update = (t, ship, cam) => { U.uT.value = t; U.uShip.value.copy(ship); U.uCam.value.copy(cam); };
  return { mesh, update, inCloud, banks };
}
