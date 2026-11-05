/* 숨을 곳 — 땅마다 다른 생김새 (사용자 2026-11-05: 땅이 생겼으니 숨을 곳도 그 땅에 맞게)
   규칙은 그대로(벽 틈을 메움 · 숨으면 밖에서 안 보임 · 밀려나는 움직임은 내 화면에서만 · 공격하면 드러남). 생김새만 땅마다:
   ice   얼음 사냥터  서리 안개 — 아래 짙은 청회색 · 위로 갈수록 하얗고 푸른 서리빛 · 속에 작은 얼음 결정 조각이 천천히 맴돌며 반짝
   lava  용암 사냥터  뜨거운 연기와 재 — 짙은 잿빛 연기, 아래쪽이 용암 빛으로 붉게 물듦 · 불씨가 깜빡이며 솟아오르다 사그라짐
   ruin  보물 땅      옛 먼지 구름 — 가라앉은 모래빛 먼지 · 작은 네모 돌 부스러기가 아주 천천히 떠 돎
   coral 산호 정글    키 큰 우주 이끼 덤불 — 털 이끼 가닥이 빽빽이 솟아 물결치고 끝에 빛 알갱이 · 발치에 낮은 청록·보라 안개
   무게: 숨을 곳마다 가스 한 묶음 + 조각 한 묶음(겹쳐 그리는 판·작은 조각은 묶어서 한 번에 그림) */
import * as THREE from 'three';

const TH = {
  ice:   { core: [.22, .32, .44], lit: [.8, .9, 1.], under: [0, 0, 0], dens: 1.1, hgt: 2.6, bits: 'shard' },
  lava:  { core: [.03, .022, .02], lit: [.32, .24, .22], under: [.75, .2, .03], dens: .9, hgt: 3., bits: 'ember' },
  ruin:  { core: [.06, .05, .04], lit: [.55, .48, .36], under: [0, 0, 0], dens: .82, hgt: 2.2, bits: 'stone' },
  coral: { core: [.01, .03, .035], lit: [.05, .16, .16], under: [0, 0, 0], dens: .35, hgt: .7, bits: 'moss' } };

/* 가스(안개·연기·먼지): 바라보는 쪽을 향한 판을 겹겹이 */
function gas(lobes, th, noise, R) {
  const D = [];
  for (const [lx, lz, lr] of lobes) { const n = Math.round(lr * lr * 2.2 * th.dens) + 8;
    for (let i = 0; i < n; i++) { const a = R() * 6.28, sz = (1.4 + R() * 1.5) * (th.hgt < 1.5 ? .8 : 1), d = Math.sqrt(R()) * Math.max(.2, lr * .9 - sz * .3), h = R(); D.push(lx + Math.cos(a) * d, lz + Math.sin(a) * d, .2 + h * th.hgt * (1 - d / lr * .6), sz, R(), lx, lz); } }   /* 구름 가장자리 = 숨는 자리 경계 */
  D.sort((a, b) => 0);
  const q = new THREE.PlaneGeometry(1, 1), cnt = D.length / 7, g = new THREE.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  const order = [...Array(cnt).keys()].sort((i, j) => D[i * 7 + 2] - D[j * 7 + 2]), A = new Float32Array(cnt * 4), B = new Float32Array(cnt * 3);
  order.forEach((i, j) => { A.set([D[i * 7], D[i * 7 + 1], D[i * 7 + 2], D[i * 7 + 3]], j * 4); B.set([D[i * 7 + 4], D[i * 7 + 5], D[i * 7 + 6]], j * 3); });
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 3)); g.instanceCount = cnt;
  const v3 = a => new THREE.Vector3(...a);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uN: { value: noise }, uShip: { value: new THREE.Vector3(0, 0, -1e4) }, uCore: { value: v3(th.core) }, uLit: { value: v3(th.lit) }, uUnder: { value: v3(th.under) }, uH: { value: th.hgt } },
    vertexShader: `attribute vec4 iA; attribute vec3 iB; uniform float uT, uH; uniform vec3 uShip; varying vec2 vU; varying float vH, vPh, vWy, vP;
      void main(){ vec3 c=vec3(iA.x,iA.z,iA.y); float ph=iB.x*6.28;   /* 부풀기 없앰: 경계가 늘 같은 자리 (사용자 2026-11-05) */
        vec2 rel=c.xz-iB.yz; float a=uT*.07*(fract(iB.x*7.)>.5?1.:-1.); c.xz=iB.yz+mat2(cos(a),-sin(a),sin(a),cos(a))*rel;   /* 안에서 천천히 굴러감 */
        c.y+=sin(uT*.5+ph)*.2*uH/2.5;
        vec2 aw=c.xz-uShip.xz; float d=length(aw), push=uShip.y*smoothstep(2.2,.3,d);   /* 기체 둘레만 옅어짐 — 가장자리는 그대로 */
        float sz=iA.w;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        float r=uT*.05*(iB.x-.5)+ph; vec2 p=mat2(cos(r),-sin(r),sin(r),cos(r))*position.xy;
        vec3 wp=c+(right*p.x+up*p.y)*sz; vU=uv; vH=clamp(c.y/(uH+.3),0.,1.); vPh=iB.x; vWy=wp.y; vP=push; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader: `precision highp float; uniform sampler2D uN; uniform float uT; uniform vec3 uCore, uLit, uUnder; varying vec2 vU; varying float vH, vPh, vWy, vP;
      void main(){ vec2 q=vU-.5; float r=length(q)*2.; float n=texture2D(uN,vU*.55+vec2(vPh*3.7,vPh*1.3)+vec2(uT*.01,-uT*.008)).r;
        float m=smoothstep(1.,.25,r+(n-.5)*.7)*smoothstep(-.1,.6,vWy); if(m<.01) discard;   /* 땅에 닿는 곳은 스며들듯 옅어짐 (판이 땅을 자르는 줄 없앰) */
        vec3 c=mix(uCore,uLit*1.3,smoothstep(.05,.9,vH)*(.45+.75*n));                                    /* 아래 짙고 위는 빛을 받음 */
        c+=uUnder*pow(1.-vH,2.2)*(.35+.4*n)*(.8+.2*sin(uT*1.6+vPh*20.));                                  /* 아래에서 비추는 빛 (용암) */
        c+=uLit*smoothstep(.55,1.,r)*m*.2;
        gl_FragColor=vec4(c,m*.86*(1.-vP*.55)); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 6; mesh.frustumCulled = false; return { mesh, mat };
}

/* 조각: 얼음 결정 / 불씨 / 돌 부스러기 / 이끼 가닥 */
function bits(lobes, th, R) {
  const kind = th.bits, D = [];
  for (const [lx, lz, lr] of lobes) { const n = Math.round(lr * lr * (kind === 'moss' ? 40 : kind === 'ember' ? 5 : 4)) + 10;
    for (let i = 0; i < n; i++) { const rr = Math.sqrt(R()) * lr * (kind === 'moss' ? .92 : .95);
      const h = kind === 'moss' ? 0 : .25 + R() * th.hgt * (1 - rr / lr * .5);
      const s = kind === 'moss' ? (1.6 + R() * 1.4) * (1 - rr / lr * .5) : kind === 'ember' ? .04 + R() * .05 : kind === 'shard' ? .08 + Math.pow(R(), 2) * .2 : .1 + Math.pow(R(), 2.5) * .35;
      D.push(lx, lz, rr, h, s, R() * 6.28, (.08 + R() * .12) / Math.max(.6, rr * .5) * (R() < .5 ? 1 : -1), R() * 6.28); } }
  let geo;
  if (kind === 'moss') { geo = new THREE.ConeGeometry(.06, 1, 4, 3, true); geo.translate(0, .5, 0); }                 /* 털 이끼 한 가닥 */
  else if (kind === 'shard') { geo = new THREE.OctahedronGeometry(1, 0); geo.scale(.45, 1.4, .45); }                  /* 길쭉한 얼음 결정 */
  else if (kind === 'ember') geo = new THREE.OctahedronGeometry(1, 0);
  else { geo = new THREE.BoxGeometry(1, .7, .85); const P = geo.attributes.position; for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) * (1 + Math.sin(i * 3.1) * .12), P.getY(i), P.getZ(i)); }
  geo = geo.toNonIndexed(); geo.computeVertexNormals();
  const cnt = D.length / 8, g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', geo.attributes.position); g.setAttribute('normal', geo.attributes.normal);
  const A = new Float32Array(cnt * 4), B = new Float32Array(cnt * 4); for (let i = 0; i < cnt; i++) { A.set(D.slice(i * 8, i * 8 + 4), i * 4); B.set(D.slice(i * 8 + 4, i * 8 + 8), i * 4); }
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 4)); g.instanceCount = cnt;
  const K = { shard: 0, ember: 1, stone: 2, moss: 3 }[kind];
  const mat = new THREE.ShaderMaterial({ transparent: kind === 'ember', depthWrite: kind !== 'ember', blending: kind === 'ember' ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uT: { value: 0 }, uShip: { value: new THREE.Vector3(0, 0, -1e4) }, uL: { value: new THREE.Vector3(-.45, .78, -.42).normalize() }, uH: { value: th.hgt } },
    vertexShader: `attribute vec4 iA, iB; uniform float uT, uH; uniform vec3 uShip; varying vec3 vN; varying float vY, vF, vS;
      mat3 rot(vec3 a, float t){ a=normalize(a); float c=cos(t), s=sin(t), k=1.-c; return mat3(c+a.x*a.x*k, a.y*a.x*k+a.z*s, a.z*a.x*k-a.y*s, a.x*a.y*k-a.z*s, c+a.y*a.y*k, a.z*a.y*k+a.x*s, a.x*a.z*k+a.y*s, a.y*a.z*k-a.x*s, c+a.z*a.z*k); }
      void main(){ vS=fract(iB.w*3.1); vec3 c; mat3 R; float push;
        #if ${K} == 3
          /* 이끼 가닥: 제자리에서 물결치듯 휨 · 기체가 들어가면 바깥으로 눕혀짐 */
          c=vec3(iA.x+cos(iB.y)*iA.z,-.05,iA.y+sin(iB.y)*iA.z);
          vec2 aw=c.xz-uShip.xz; float d=length(aw); push=uShip.y*smoothstep(2.6,.4,d);
          float h=position.y, bend=h*h;
          vec2 wv=vec2(sin(uT*.9+c.x*.6+iB.w),cos(uT*.7+c.z*.5+iB.w))*.18+normalize(aw+1e-4)*push*.9;
          vec3 p=position*vec3(1.,iB.x*(1.-push*.35),1.); p.xz+=wv*bend*iB.x;
          vec3 w=c+p; vN=normalize(vec3(wv.x*2.*h,1.,wv.y*2.*h)); vY=h; vF=0.;
          gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
        #else
          float ang=iB.y+uT*iB.z;
          #if ${K} == 1
            /* 불씨: 솟아오르다 사그라지고 다시 아래에서 */
            float life=fract(uT*(.12+vS*.12)+iB.w); c=vec3(iA.x+cos(ang)*iA.z*(1.-life*.3), .2+life*uH*1.2, iA.y+sin(ang)*iA.z*(1.-life*.3)); vF=sin(life*3.14)*(.6+.4*sin(uT*9.+iB.w*20.));
          #else
            c=vec3(iA.x+cos(ang)*iA.z, iA.w+sin(uT*.6+iB.w)*.2, iA.y+sin(ang)*iA.z); vF=0.;
          #endif
          vec2 aw=c.xz-uShip.xz; float d=length(aw); push=uShip.y*smoothstep(1.8,.4,d); c.y+=push*.6;   /* 옆으로 밀지 않고 위로 살짝 비킴 */
          R=rot(vec3(sin(iB.w),cos(iB.w*1.7),sin(iB.w*2.3)), uT*(.3+fract(iB.w)*.6)+iB.w);
          vN=R*normal; vY=0.; gl_Position=projectionMatrix*viewMatrix*vec4(c+R*position*iB.x,1.);
        #endif
      }`,
    fragmentShader: `uniform vec3 uL; uniform float uT; varying vec3 vN; varying float vY, vF, vS;
      void main(){ vec3 n=normalize(vN); float dif=max(dot(n,uL),0.); vec3 c;
        #if ${K} == 0
          c=vec3(.2,.5,.7)*(.5+dif)+vec3(.8,.95,1.)*smoothstep(.75,.98,dif)+vec3(.1,.35,.55)*.3;            /* 얼음 결정: 속 청록, 해 쪽 면 하얗게 반짝 */
        #elif ${K} == 1
          c=mix(vec3(1.,.3,.04),vec3(1.,.75,.3),vF)*vF*1.6;                                                        /* 불씨 */
        #elif ${K} == 2
          c=vec3(.16,.135,.1)*(.35+dif*1.1)+vec3(.55,.45,.3)*smoothstep(.8,.98,dif)*.5;                            /* 돌 부스러기 */
        #else
          vec3 base=mix(vec3(.01,.05,.05),mix(vec3(.04,.16,.14),vec3(.1,.06,.16),vS),smoothstep(0.,.8,vY));
          c=base*(.5+dif*.8)+mix(vec3(.3,1.,.85),vec3(.7,.5,1.1),vS)*smoothstep(.82,1.,vY)*(.5+.5*sin(uT*(1.2+vS*2.)+vS*30.))*.8;   /* 끝 빛 알갱이 */
        #endif
        gl_FragColor=vec4(c,1.); }` });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; return { mesh, mat };
}

/* 발밑 경계 표시: 숨는 자리 테두리를 땅에 옅게 (그 땅의 흔적 색) · 내 기체가 안에 있으면 밝아짐 */
const RING = { ice: [.75, .9, 1.], lava: [.9, .35, .1], ruin: [.7, .6, .42], coral: [.3, 1., .85] };
function ring(lobes, theme) { const L = lobes.slice(0, 8), xs = L.map(l => l[0]), zs = L.map(l => l[1]), pad = 3;
  const x0 = Math.min(...xs.map((x, i) => x - L[i][2])) - pad, x1 = Math.max(...xs.map((x, i) => x + L[i][2])) + pad, z0 = Math.min(...zs.map((z, i) => z - L[i][2])) - pad, z1 = Math.max(...zs.map((z, i) => z + L[i][2])) + pad;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, .04, (z0 + z1) / 2);
  const U = Array.from({ length: 8 }, (_, i) => L[i] ? new THREE.Vector3(L[i][0], L[i][1], L[i][2] * .9) : new THREE.Vector3(0, 0, -1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uL: { value: U }, uC: { value: new THREE.Vector3(...RING[theme]) }, uIn: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec3 uL[8]; uniform vec3 uC; uniform float uIn, uT; varying vec2 vP;
      void main(){ float d=1e3; for(int i=0;i<8;i++){ vec3 l=uL[i]; if(l.z<0.) continue; d=min(d,length(vP-l.xy)-l.z); }
        float band=smoothstep(-.45,-.05,d)*smoothstep(.12,-.02,d);                                     /* 경계 바로 안쪽 띠 */
        float inner=smoothstep(.0,-1.5,d)*.12;                                                          /* 안쪽 땅은 살짝 물듦 */
        float a=band*(.32+.5*uIn*(.8+.2*sin(uT*3.)))+inner*(1.+uIn);
        if(a<.004) discard; gl_FragColor=vec4(uC*a,1.); }`, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; return { mesh: m, mat }; }

/* list: [{ lobes:[[x,z,r]...], theme:'ice'|'lava'|'ruin'|'coral' }] */
export function makeThemedHide(list, noise) {
  const R = (() => { let s = 4242; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), grp = new THREE.Group(), mats = [];
  const rings = []; for (const b of list) { const th = TH[b.theme]; const G = gas(b.lobes, th, noise, R), Bt = bits(b.lobes, th, R), Rg = ring(b.lobes, b.theme); grp.add(Rg.mesh, Bt.mesh, G.mesh); mats.push(G.mat, Bt.mat); rings.push(Rg.mat); }
  const inside = (x, z) => list.findIndex(b => b.lobes.some(([lx, lz, lr]) => Math.hypot(x - lx, z - lz) < lr * .9));
  let push = 0;
  return { mesh: grp, inside, update(t, dt, x, z) { const inB = inside(x, z) >= 0, tg = inB ? 1 : 0; push += (tg - push) * Math.min(1, dt * (tg > push ? 4 : 1));
      for (const m of mats) { m.uniforms.uT.value = t; m.uniforms.uShip.value.set(x, push, z); } const id = inside(x, z); rings.forEach((r, i) => { r.uniforms.uT.value = t; const k = i === id ? 1 : 0; r.uniforms.uIn.value += (k - r.uniforms.uIn.value) * Math.min(1, dt * 6); }); return inB; } };
}
