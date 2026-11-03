/* 숨을 곳 생김새 후보 두 가지 (자리·규칙은 bushes.js와 같음 — 고르면 하나만 남김)
   ① 가스 구름: 바닥에서 솟은 짙은 성운 가스 뭉치. 속은 짙어 안이 안 보이고, 위쪽 가장자리는 그 땅 안개 색으로 빛을 받음
      - 뭉게뭉게 천천히 부풀었다 가라앉으며 안에서 굴러감(가스가 살아 있는 것)
      - 기체가 들어가면 둘레 가스가 밀려 벌어지고 소용돌이침, 나오면 천천히 다시 메워짐
   ② 돌 부스러기 무리: 작은 돌 수백 개가 덩이 가운데를 천천히 맴도는 무리(서로 끌어당겨 뭉친 잔해)
      - 돌마다 제멋대로 구르며 돌고, 해 쪽 모서리가 그 땅 빛으로 반짝
      - 기체가 들어가면 둘레 돌이 밀려 바깥으로 비켜남
   무게: 각각 한 묶음씩(36m 칸 나눔), 움직임은 전부 그림 계산 쪽에서 (손으로 매 장면 옮기지 않음) */
import * as THREE from 'three';

const TL = 36;
const tileOf = (x, z) => Math.floor(x / TL) + ',' + Math.floor(z / TL);
function tiled(items, stride, build) {
  const tiles = new Map(); for (let i = 0; i < items.length / stride; i++) { const k = tileOf(items[i * stride], items[i * stride + 1]); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(i); }
  const grp = new THREE.Group();
  for (const [key, ids] of tiles) { const m = build(ids); const [tx, tz] = key.split(',').map(Number); m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3((tx + .5) * TL, 1.5, (tz + .5) * TL), TL * .75 + 5); grp.add(m); }
  return grp;
}

/* ① 가스 구름 */
export function makeGas(bushes, ST, noise) {
  const R = (() => { let s = 4242; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), D = [];   /* x, z, y, 크기, r,g,b, 위상, 덩이 x, 덩이 z */
  bushes.list.forEach(b => { const c = ST[b.k].b;
    for (const [lx, lz, lr] of b.lobes) { const n = Math.round(lr * lr * 2.2) + 8;
      for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * lr * .85, h = R(); D.push(lx + Math.cos(a) * d, lz + Math.sin(a) * d, .3 + h * 2.4 * (1 - d / lr * .6), 1.6 + R() * 1.6, c[0], c[1], c[2], R(), lx, lz); } } });
  const q = new THREE.PlaneGeometry(1, 1), mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uN: { value: noise }, uShip: { value: new THREE.Vector3(0, 0, -1e4) } },
    vertexShader: `attribute vec4 iA, iB; attribute vec2 iL; uniform float uT; uniform vec3 uShip; varying vec2 vU; varying vec3 vC; varying float vH, vPh, vP;
      void main(){ vec3 c=iA.xyz; c=vec3(iA.x, iA.z, iA.y);
        float ph=iB.w*6.28, breathe=sin(uT*.35+ph)*.18;                                                  /* 부풀었다 가라앉음 */
        vec2 rel=c.xz-iL; float a=uT*.07*(fract(iB.w*7.)>.5?1.:-1.); c.xz=iL+mat2(cos(a),-sin(a),sin(a),cos(a))*rel;   /* 안에서 천천히 굴러감 */
        c.y+=sin(uT*.5+ph)*.25;
        vec2 aw=c.xz-uShip.xz; float d=length(aw), push=uShip.y*smoothstep(3.5,.5,d);                     /* 기체가 밀고 들어가면 둘레가 벌어짐 */
        c.xz+=normalize(aw+1e-4)*push*2.2; c.y+=push*.6;
        float sz=iA.w*(1.+breathe)*(1.-push*.35);
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        float r=uT*.05*(iB.w-.5)+ph; vec2 p=mat2(cos(r),-sin(r),sin(r),cos(r))*position.xy;
        vec3 w=c+(right*p.x+up*p.y)*sz;
        vU=uv; vC=iB.rgb; vH=clamp(c.y/2.8,0.,1.); vPh=iB.w; vP=push;
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
    fragmentShader: `precision highp float; uniform sampler2D uN; uniform float uT; varying vec2 vU; varying vec3 vC; varying float vH, vPh, vP;
      void main(){ vec2 q=vU-.5; float r=length(q)*2.;
        float n=texture2D(uN,vU*.55+vec2(vPh*3.7,vPh*1.3)+vec2(uT*.01,-uT*.008)).r;
        float m=smoothstep(1.,.25,r+(n-.5)*.7);                                                          /* 뭉게뭉게한 가장자리 */
        if(m<.01) discard;
        vec3 core=vec3(.01,.012,.016), lit=vC*1.15;
        vec3 c=mix(core, lit*1.4, smoothstep(.05,.9,vH)*(.45+.75*n));                                      /* 아래는 짙고 위는 빛을 받음 */
        c+=vC*smoothstep(.55,1.,r)*m*.25;                                                                /* 가장자리 얇은 곳은 빛이 비쳐 밝음 */
        gl_FragColor=vec4(c, m*.88); }` });
  const grp = tiled(D, 10, ids => { const g = new THREE.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
    const A = new Float32Array(ids.length * 4), Bc = new Float32Array(ids.length * 4), L = new Float32Array(ids.length * 2);
    ids.sort((i, j) => D[i * 10 + 2] - D[j * 10 + 2]);                                                  /* 낮은 것부터 그려 위가 덮음 */
    ids.forEach((i, j) => { A.set([D[i * 10], D[i * 10 + 1], D[i * 10 + 2], D[i * 10 + 3]], j * 4); Bc.set([D[i * 10 + 4], D[i * 10 + 5], D[i * 10 + 6], D[i * 10 + 7]], j * 4); L.set([D[i * 10 + 8], D[i * 10 + 9]], j * 2); });
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(Bc, 4)); g.setAttribute('iL', new THREE.InstancedBufferAttribute(L, 2)); g.instanceCount = ids.length;
    const m = new THREE.Mesh(g, mat); m.renderOrder = 6; return m; });
  let push = 0;
  return { mesh: grp, count: D.length / 10, update(t, dt, sx, sz, inB) { const tg = inB ? 1 : 0; push += (tg - push) * Math.min(1, dt * (tg > push ? 4 : 1)); mat.uniforms.uT.value = t; mat.uniforms.uShip.value.set(sx, push, sz); } };
}

/* ② 돌 부스러기 무리 */
export function makeSwarm(bushes, ST) {
  const R = (() => { let s = 777; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), D = [];   /* x, z: 덩이 가운데 · 돌 반지름 · 높이 · 크기 · 처음 각 · 도는 빠르기 · 구름 축 위상 · r,g,b */
  bushes.list.forEach(b => { const c = ST[b.k].b;
    for (const [lx, lz, lr] of b.lobes) { const n = Math.round(lr * lr * 9) + 20;
      for (let i = 0; i < n; i++) { const rr = Math.sqrt(R()) * lr * .95, h = .25 + R() * 2.6 * (1 - rr / lr * .5);
        D.push(lx, lz, rr, h, (.12 + Math.pow(R(), 2.5) * .45), R() * 6.28, (.08 + R() * .12) / Math.max(.6, rr * .5) * (R() < .5 ? 1 : -1), R() * 6.28, c[0], c[1], c[2]); } } });
  const geo = new THREE.IcosahedronGeometry(1, 0); { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const s = .7 + .45 * Math.abs(Math.sin(P.getX(i) * 7 + P.getY(i) * 3)); P.setXYZ(i, P.getX(i) * s, P.getY(i) * s * .8, P.getZ(i) * s); } geo.computeVertexNormals(); }
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uShip: { value: new THREE.Vector3(0, 0, -1e4) }, uL: { value: new THREE.Vector3(-60, 120, -40).normalize() } },
    vertexShader: `attribute vec4 iA, iB; attribute vec4 iC; uniform float uT; uniform vec3 uShip; varying vec3 vN, vC; varying float vH;
      mat3 rot(vec3 a, float t){ a=normalize(a); float c=cos(t), s=sin(t), k=1.-c; return mat3(c+a.x*a.x*k, a.y*a.x*k+a.z*s, a.z*a.x*k-a.y*s, a.x*a.y*k-a.z*s, c+a.y*a.y*k, a.z*a.y*k+a.x*s, a.x*a.z*k+a.y*s, a.y*a.z*k-a.x*s, c+a.z*a.z*k); }
      void main(){ float ang=iB.y+uT*iB.z;                                                               /* 덩이 가운데를 맴돔 */
        vec3 c=vec3(iA.x+cos(ang)*iA.z, iA.w+sin(uT*.6+iB.w)*.2, iA.y+sin(ang)*iA.z);
        vec2 aw=c.xz-uShip.xz; float d=length(aw), push=uShip.y*smoothstep(3.,.6,d);                       /* 기체가 들어가면 비켜남 */
        c.xz+=normalize(aw+1e-4)*push*1.8; c.y+=push*.5;
        mat3 R=rot(vec3(sin(iB.w),cos(iB.w*1.7),sin(iB.w*2.3)), uT*(.4+fract(iB.w)*.8)+iB.w);              /* 제멋대로 구름 */
        vec3 w=c+R*position*iB.x; vN=R*normal; vC=iC.rgb; vH=iA.w;
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
    fragmentShader: `uniform vec3 uL; varying vec3 vN, vC; varying float vH;
      void main(){ vec3 n=normalize(vN); float dif=max(dot(n,uL),0.);
        vec3 rock=vec3(.07,.068,.075);
        vec3 c=rock*(.35+dif*1.1)+vC*.9*smoothstep(.75,.98,dif)+vC*.06;                                    /* 해 쪽 모서리가 그 땅 빛으로 반짝 */
        gl_FragColor=vec4(c,1.); }` });
  const grp = tiled(D, 11, ids => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', geo.attributes.position); g.setAttribute('normal', geo.attributes.normal);
    const A = new Float32Array(ids.length * 4), Bv = new Float32Array(ids.length * 4), C = new Float32Array(ids.length * 4);
    ids.forEach((i, j) => { const o = i * 11; A.set([D[o], D[o + 1], D[o + 2], D[o + 3]], j * 4); Bv.set([D[o + 4], D[o + 5], D[o + 6], D[o + 7]], j * 4); C.set([D[o + 8], D[o + 9], D[o + 10], 1], j * 4); });
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(Bv, 4)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4)); g.instanceCount = ids.length;
    return new THREE.Mesh(g, mat); });
  let push = 0;
  return { mesh: grp, count: D.length / 11, update(t, dt, sx, sz, inB) { const tg = inB ? 1 : 0; push += (tg - push) * Math.min(1, dt * (tg > push ? 4 : 1)); mat.uniforms.uT.value = t; mat.uniforms.uShip.value.set(sx, push, sz); } };
}
