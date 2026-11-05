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

/* 숨는 자리 = 곧은 변의 네모 (사용자 2026-11-05: 곡선 테두리는 경계가 애매) — [가운데 x, z, 반 길이, 반 폭, 각도] */
const inRect = ([cx, cz, hl, hw, a], x, z, m = 0) => { const dx = x - cx, dz = z - cz, u = dx * Math.cos(a) + dz * Math.sin(a), v = -dx * Math.sin(a) + dz * Math.cos(a); return Math.abs(u) < hl - m && Math.abs(v) < hw - m; };
const sampleRect = ([cx, cz, hl, hw, a], R, m) => { const u = (R() * 2 - 1) * Math.max(.1, hl - m), v = (R() * 2 - 1) * Math.max(.1, hw - m); return [cx + u * Math.cos(a) - v * Math.sin(a), cz + u * Math.sin(a) + v * Math.cos(a)]; };
/* 가스(안개·연기·먼지): 바라보는 쪽을 향한 판을 겹겹이 */
function gas(lobes, th, noise, R) {
  const D = [];
  { const rc = lobes, n = Math.round(rc[2] * rc[3] * 4 * .55 * th.dens) + 8;
    for (let i = 0; i < n; i++) { const sz = (1.3 + R() * 1.3) * (th.hgt < 1.5 ? .8 : 1), [x, z] = sampleRect(rc, R, sz * .32), h = R(); D.push(x, z, .2 + h * th.hgt, sz, R(), x, z); } }   /* 구름 가장자리 = 네모 경계 */
  D.sort((a, b) => 0);
  const q = new THREE.PlaneGeometry(1, 1), cnt = D.length / 7, g = new THREE.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
  const order = [...Array(cnt).keys()].sort((i, j) => D[i * 7 + 2] - D[j * 7 + 2]), A = new Float32Array(cnt * 4), B = new Float32Array(cnt * 3);
  order.forEach((i, j) => { A.set([D[i * 7], D[i * 7 + 1], D[i * 7 + 2], D[i * 7 + 3]], j * 4); B.set([D[i * 7 + 4], D[i * 7 + 5], D[i * 7 + 6]], j * 3); });
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 3)); g.instanceCount = cnt;
  const v3 = a => new THREE.Vector3(...a);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uIn: { value: 0 }, uT: { value: 0 }, uN: { value: noise }, uShip: { value: new THREE.Vector3(0, 0, -1e4) }, uCore: { value: v3(th.core) }, uLit: { value: v3(th.lit) }, uUnder: { value: v3(th.under) }, uH: { value: th.hgt } },
    vertexShader: `attribute vec4 iA; attribute vec3 iB; uniform float uT, uH; uniform vec3 uShip; varying vec2 vU; varying float vH, vPh, vWy, vP;
      void main(){ vec3 c=vec3(iA.x,iA.z,iA.y); float ph=iB.x*6.28;   /* 부풀기 없앰: 경계가 늘 같은 자리 (사용자 2026-11-05) */
        vec2 rel=c.xz-iB.yz; float a=uT*.07*(fract(iB.x*7.)>.5?1.:-1.); c.xz=iB.yz+mat2(cos(a),-sin(a),sin(a),cos(a))*rel;   /* 안에서 천천히 굴러감 */
        c.y+=sin(uT*.5+ph)*.2*uH/2.5;
        vec2 aw=c.xz-uShip.xz; float d=length(aw), push=uShip.y*smoothstep(2.2,.3,d);   /* 기체 둘레만 옅어짐 — 가장자리는 그대로 */
        float sz=iA.w;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        float r=uT*.05*(iB.x-.5)+ph; vec2 p=mat2(cos(r),-sin(r),sin(r),cos(r))*position.xy;
        vec3 wp=c+(right*p.x+up*p.y)*sz; vU=uv; vH=clamp(c.y/(uH+.3),0.,1.); vPh=iB.x; vWy=wp.y; vP=push; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader: `precision highp float; uniform sampler2D uN; uniform float uT, uIn; uniform vec3 uCore, uLit, uUnder; varying vec2 vU; varying float vH, vPh, vWy, vP;
      void main(){ vec2 q=vU-.5; float r=length(q)*2.; float n=texture2D(uN,vU*.55+vec2(vPh*3.7,vPh*1.3)+vec2(uT*.01,-uT*.008)).r;
        float m=smoothstep(1.,.25,r+(n-.5)*.7)*smoothstep(-.1,.6,vWy); if(m<.01) discard;   /* 땅에 닿는 곳은 스며들듯 옅어짐 (판이 땅을 자르는 줄 없앰) */
        vec3 c=mix(uCore,uLit*1.3,smoothstep(.05,.9,vH)*(.45+.75*n));                                    /* 아래 짙고 위는 빛을 받음 */
        c+=uUnder*pow(1.-vH,2.2)*(.35+.4*n)*(.8+.2*sin(uT*1.6+vPh*20.));                                  /* 아래에서 비추는 빛 (용암) */
        c+=uLit*smoothstep(.55,1.,r)*m*.2;
        gl_FragColor=vec4(c,m*.86*(1.-vP*.4)*(1.-uIn*.6)); }   /* 들어가면 반투명 → 안이 보임 */` });
  const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 6; mesh.frustumCulled = false; return { mesh, mat };
}

/* 조각: 얼음 결정 / 불씨 / 돌 부스러기 / 이끼 가닥 */
function bits(lobes, th, R) {
  const kind = th.bits, D = [];
  { const rc = lobes, ar = rc[2] * rc[3] * 4 / 3.14, n = Math.round(ar * (kind === 'moss' ? 40 : kind === 'ember' ? 5 : 4)) + 10;
    for (let i = 0; i < n; i++) { const [lx, lz] = sampleRect(rc, R, .35), rr = R() * .3;
      const h = kind === 'moss' ? 0 : .25 + R() * th.hgt * .8;
      const s = kind === 'moss' ? (1.4 + R() * 1.4) : kind === 'ember' ? .04 + R() * .05 : kind === 'shard' ? .08 + Math.pow(R(), 2) * .2 : .1 + Math.pow(R(), 2.5) * .35;
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
/* 경계 테두리: 들어가 있을 때만 보임 (사용자 2026-11-05: 안 들어갔는데 테두리가 있으면 안 됨) */
const RING = { ice: [.75, .9, 1.], lava: [.9, .35, .1], ruin: [.7, .6, .42], coral: [.3, 1., .85] };
function ring(rc, theme) { const [cx, cz, hl, hw, an] = rc, pad = 1;
  const g = new THREE.PlaneGeometry((hl + pad) * 2, (hw + pad) * 2); g.rotateX(-Math.PI / 2); g.rotateY(-an); g.translate(cx, .04, cz);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, uniforms: { uR: { value: new THREE.Vector4(cx, cz, hl, hw) }, uA: { value: an }, uC: { value: new THREE.Vector3(...RING[theme]) }, uIn: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vP=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform vec4 uR; uniform float uA; uniform vec3 uC; uniform float uIn, uT; varying vec2 vP;
      void main(){ if(uIn<.01) discard; vec2 d=vP-uR.xy; vec2 q=vec2(d.x*cos(uA)+d.y*sin(uA),-d.x*sin(uA)+d.y*cos(uA)); vec2 e=abs(q)-uR.zw; float sd=max(e.x,e.y);   /* 네모까지 거리 */
        float band=smoothstep(-.3,-.08,sd)*smoothstep(.06,-.02,sd);                                    /* 경계 바로 안쪽 곧은 띠 */
        float a=band*uIn*(.85+.15*sin(uT*3.)); if(a<.004) discard; gl_FragColor=vec4(uC*a,1.); }`, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(g, mat); m.renderOrder = 9; return { mesh: m, mat }; }   /* 눈밭·바닥 턱에 가려지지 않게 위에 그림 (들어가 있을 때만 보이니 괜찮음) */

/* list: [{ rect:[x,z,반길이,반폭,각도], theme }] */
export function makeThemedHide(list, noise) {
  const R = (() => { let s = 4242; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })(), grp = new THREE.Group(), parts = [];
  for (const b of list) { const th = TH[b.theme]; const G = gas(b.rect, th, noise, R), Bt = bits(b.rect, th, R), Rg = ring(b.rect, b.theme); grp.add(Rg.mesh, Bt.mesh, G.mesh); parts.push({ G: G.mat, B: Bt.mat, Rg: Rg.mat, k: 0 }); }
  const inside = (x, z) => list.findIndex(b => inRect(b.rect, x, z));
  return { mesh: grp, inside, update(t, dt, x, z) { const id = inside(x, z);
      parts.forEach((P, i) => { const tg = i === id ? 1 : 0; P.k += (tg - P.k) * Math.min(1, dt * (tg > P.k ? 5 : 2));
        for (const m of [P.G, P.B]) { m.uniforms.uT.value = t; m.uniforms.uShip.value.set(x, P.k, z); } P.G.uniforms.uIn.value = P.k; P.Rg.uniforms.uIn.value = P.k; P.Rg.uniforms.uT.value = t; });
      return id >= 0; } };
}
