/* 하늘 섬 — 참고 제작 시트대로 (사용자 2026-11-05: 이렇게 만들어 봐 · 이런 느낌이 더 좋을 것 같은데? · docs/ref_isle_sheet.png)
   손으로 칠한 듯한 밝은 판타지 섬 하나:
   · 몸: 큼직하게 깎인 밝은 회색 바위 덩이들이 둘레 벼랑을 이루고(덩이마다 모서리를 깎아 면이 또렷), 아래로 갈수록 좁아져 뾰족
   · 윗면: 두툼한 풀 · 가장자리로 넘쳐 늘어진 이끼 턱 + 아래로 늘어진 덩굴
   · 가운데: 둥근 돌 판(안쪽 판석 · 바깥 돌 테 · 사이 홈에 청록 빛 고리가 숨 쉬듯) + 디딤돌
   · 부서진 돌 아치 둘: 돌 토막을 반원으로 쌓다 끊김 · 안쪽 면 홈에 청록 빛 줄
   · 빛나는 결정: 아치 옆 무리 + 섬 아래에 거꾸로 매달린 무리
   · 식물: 넓은 잎 열대 풀(잎맥·갈라진 잎) · 야자 한 그루 · 분홍 별꽃 · 작은 바위 */
import * as THREE from 'three';
import { SKY, grassCap, grassMat, bakeFbm } from './skyisle.js';

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const v0 = new THREE.Vector3();

/* 깎인 바위 덩이: 상자를 나눠 모서리를 깎고 흔들어 손으로 깎은 듯한 면 · 모양 몇 가지를 만들어 되풀이 */
function chunkGeo(R) {
  /* 모서리가 둥글게 깎인 상자(둥근 모서리 폭 b) + 덩이 전체를 살짝 비틀고 부풀려 저마다 다른 돌 모양 · 잔 흔들림은 없음(뾰족한 가시가 생기지 않게) */
  const g = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4), p = g.attributes.position, b = .16 + R() * .08, sd = R() * 10, tw = (R() - .5) * .5, bu = [R() * .12, R() * .12, R() * .12];
  const inner = new THREE.Vector3(), lim = .5 - b;
  for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); inner.set(THREE.MathUtils.clamp(v0.x, -lim, lim), THREE.MathUtils.clamp(v0.y, -lim, lim), THREE.MathUtils.clamp(v0.z, -lim, lim));
    const d = v0.clone().sub(inner); if (d.lengthSq() > 1e-8) d.setLength(b); v0.copy(inner).add(d);
    const a = v0.y * tw, c = Math.cos(a), s2 = Math.sin(a); const x = v0.x * c - v0.z * s2, z = v0.x * s2 + v0.z * c;   /* 비틀기 */
    const w = 1 + .07 * Math.sin(v0.x * 3.1 + sd) * Math.cos(v0.z * 2.7 + sd) + .05 * Math.sin(v0.y * 3.7 + sd * 2);   /* 느린 부풂 */
    p.setXYZ(i, x * w * (1 + bu[0] * (v0.y + .5)), v0.y * w, z * w * (1 + bu[2] * (.5 - v0.y))); }
  g.computeVertexNormals();
  /* 면을 조금 납작하게: 노멀을 가까운 상자 면 쪽으로 당겨 손으로 깎은 넓은 면 느낌 */
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) { v0.fromBufferAttribute(n, i); const ax = Math.abs(v0.x), ay = Math.abs(v0.y), az = Math.abs(v0.z), m = Math.max(ax, ay, az);
    const f = new THREE.Vector3(ax === m ? Math.sign(v0.x) : 0, ay === m ? Math.sign(v0.y) : 0, az === m ? Math.sign(v0.z) : 0); v0.lerp(f, .35).normalize(); n.setXYZ(i, v0.x, v0.y, v0.z); }
  return g;
}

/* 돌 재질 (바위 덩이 · 아치 토막 · 디딤돌 · 작은 바위 같이 씀) — 밝은 회색, 위는 밝고 아래로 그늘 · 금 · aGlow면 가운데 홈에 청록 빛 */
function stoneMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `attribute float aGlow; attribute vec3 aTint; varying vec3 vW, vN, vL, vT; varying float vG;
      void main(){ vL=position; vG=aGlow; vT=aTint; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN, vL, vT; varying float vG;
      void main(){ vec3 n=normalize(vN);
        float st=nz(vW.xz*.21+vW.y*.13)*.55+nz(vec2(vW.x-vW.z,vW.y)*.5)*.45;
        float crk=smoothstep(.035,.0,abs(nz(vec2(vW.x+vW.z,vW.y*.7)*.17)-.5))*.7;                                  /* 금 */
        vec3 base=vT*(.85+.3*st)*(1.-crk*.45);
        base*=mix(.62,1.08,smoothstep(-.5,.45,vL.y));                                                               /* 덩이 아래쪽은 그늘, 윗모서리는 밝음 */
        base=mix(base,vec3(.36,.52,.2),smoothstep(.7,.95,n.y)*smoothstep(.3,.5,vL.y)*.45*step(vG,.5));            /* 위를 보는 면엔 이끼 기운 */
        vec3 c=base*(SUNC*wrapL(n,.2)*1.15+SKYC*(.3+.15*n.y))+CLOUD*.2*max(-n.y,0.)*base;
        if(vG>.5){ float inner=smoothstep(.1,.03,abs(vL.z))*smoothstep(.3,.45,-vL.x);                              /* 아치 안쪽 면 가운데 홈 */
          float front=smoothstep(.07,.025,abs(vL.x+.05))*smoothstep(.38,.46,abs(vL.z));                             /* 앞뒤 면 가운데를 따라 흐르는 줄 */
          float g=max(inner,front);
          c=mix(c,vec3(.05,.08,.12),g*.6)+vec3(.25,.95,1.2)*g*(1.6+.5*sin(uT*1.6+vW.y)); }
        gl_FragColor=vec4(sink(c,vW.y),1.); }` });
}

/* 결정: 육각 기둥 + 뾰족한 끝 · 무리로 묶음 */
function crystalCluster(R, n) {
  const gs = [];
  for (let i = 0; i < n; i++) { const h = (i === 0 ? 2.2 : .9 + R() * 1.3), r = (i === 0 ? .42 : .2 + R() * .2);
    const c = new THREE.CylinderGeometry(r, r * 1.05, h, 6, 1); c.translate(0, h / 2, 0); const t = new THREE.ConeGeometry(r, r * 2.2, 6, 1); t.translate(0, h + r * 1.1, 0);
    const g = merge2([c, t]); const e = new THREE.Euler(i ? (R() - .5) * 1.1 : (R() - .5) * .2, R() * 6, i ? (R() - .5) * 1.1 : (R() - .5) * .2);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(e)); if (i) g.translate((R() - .5) * .7, 0, (R() - .5) * .7); gs.push(g.toNonIndexed()); }
  const g = merge2(gs); g.computeVertexNormals(); return g;
}
function crystalMat(uT) {
  return new THREE.ShaderMaterial({ uniforms: { uT },
    vertexShader: `varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT; varying vec3 vW, vN, vL;
      void main(){ vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(n,v)),2.);
        float face=fract(sin(dot(floor(n*3.+.5),vec3(12.9,78.2,37.7)))*43758.5);                                    /* 면마다 밝기가 달라 각이 또렷 */
        float tip=smoothstep(0.,2.6,abs(vL.y));
        vec3 c=mix(vec3(.02,.45,.95),vec3(.45,1.,1.15),tip*.6+face*.35)+vec3(.6,1.,1.2)*f*1.1;
        c*=1.15+.25*sin(uT*1.3+vW.x*.5+vW.y);                                                                       /* 숨 쉬듯 빛남 */
        gl_FragColor=vec4(c,1.); }` });
}

/* 잎 한 장: 길쭉한 판을 길이 방향으로 휘게 · 모양은 그림에서 잘라냄(넓은 잎 / 갈라진 큰 잎 / 야자 잎 / 꽃잎) */
function leafGeo(seg = 6) { const g = new THREE.PlaneGeometry(1, 1, 2, seg); g.translate(0, .5, 0); return g; }
function leafMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `uniform float uT; attribute vec4 aLeaf; varying vec2 vUv; varying vec3 vW, vN; varying vec4 vK;
      void main(){ vUv=uv; vK=aLeaf; vec3 p=position; float t=uv.y;
        p.z+=t*t*aLeaf.y; p.x*=1.+t*.0; p.z+=abs(p.x)*.35*aLeaf.z;                                                 /* 끝으로 갈수록 휘어 늘어짐 · 잎 가운데가 접혀 오목 */
        vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);
        w.xz+=vec2(sin(uT*1.1+w.x*.4+aLeaf.w*6.),cos(uT*.9+w.z*.4))*.06*t*t;                                       /* 바람 */
        vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*vec3(0.,.35,1.)); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec2 vUv; varying vec3 vW, vN; varying vec4 vK;
      void main(){ float u=vUv.x-.5, t=vUv.y, k=vK.x;   /* k: 0 넓은 잎 · 1 갈라진 큰 잎 · 2 야자 잎 · 3 꽃잎 */
        float w=k<2.5?pow(sin(3.1416*min(t*1.05,1.)),.75)*.5:pow(sin(3.1416*t),.55)*.5*(1.-t*.3);
        if(k>1.5&&k<2.5){ float lob=abs(fract(t*14.)-.5)*2.; w*=mix(.15,1.,smoothstep(.0,.35,lob)); if(abs(u)<.03) w=1.; }   /* 야자: 가는 잎 조각이 줄줄이 */
        if(abs(u)>w) discard;
        if(k>.5&&k<1.5){ float sl=abs(fract(t*5.+abs(u)*1.6)-.5); if(sl<.06&&abs(u)>w*.35) discard; }                  /* 큰 잎 갈라진 틈 */
        vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n;
        float mid=smoothstep(.03,.0,abs(u)), side=smoothstep(.05,.0,abs(fract(t*7.-abs(u)*2.)-.5))*smoothstep(.04,.12,abs(u));
        vec3 a=k>2.5?vec3(.85,.25,.6):vec3(.06,.28,.10), b=k>2.5?vec3(1.,.72,.9):vec3(.40,.70,.18);
        vec3 c=mix(a,b,smoothstep(.0,1.,t*.7+abs(u)*.6));
        if(k<2.5) c=mix(c,b*1.25,mid*.6+side*.3); else c=mix(c,vec3(1.,.95,.6),smoothstep(.25,.0,t)*.8);              /* 잎맥 / 꽃잎 밑 노란 빛 */
        vec3 col=c*(SUNC*wrapL(n,.5)*1.1+SKYC*.35)+b*.15*pow(1.-abs(dot(n,normalize(cameraPosition-vW))),2.);
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

/* 늘어진 덩굴: 세로 띠에 잎이 좌우로 번갈아 · 잎 모양대로 잘라냄 */
function vineMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `uniform float uT; varying vec2 vUv; varying vec3 vW; varying float vS; void main(){ vUv=uv; vS=fract(instanceMatrix[3].x*3.7+instanceMatrix[3].z*1.3); vec3 p=position;
        vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); float t=1.-uv.y; w.xz+=vec2(sin(uT*.8+vS*9.),cos(uT*.7+vS*7.))*.08*t*t; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec2 vUv; varying vec3 vW; varying float vS;
      void main(){ float u=vUv.x-.5, t=1.-vUv.y; float L=8.;
        float i=floor(t*L), f=fract(t*L), sd=mod(i,2.)*2.-1.;
        vec2 q=vec2((u-sd*.16)/.26,(f-.5)/.55); float leaf=step(length(q),1.)*step(t,.97-vS*.2);
        float stem=step(abs(u),.035)*step(t,.99);
        if(leaf+stem<.5) discard;
        vec3 c=mix(vec3(.08,.30,.08),vec3(.42,.68,.16),fract(i*.37+vS)*.7+.2)*mix(1.,.6,t);
        vec3 col=c*(SUNC*.85+SKYC*.35);
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

/* 둥근 돌 판: 안쪽 판석(금·이음) · 사이 홈의 청록 빛 고리 · 바깥 돌 테(토막 이음) */
function padMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN, vL;
      void main(){ vec3 n=normalize(vN); float r=length(vL.xz), a=atan(vL.z,vL.x);
        float st=nz(vL.xz*.6)*.5+nz(vL.xz*2.1)*.5;
        vec3 c=vec3(.66,.66,.68)*(.85+.25*st);
        float glow=0.;
        if(n.y>.5){
          float ring=smoothstep(.12,.04,abs(r-1.82));                                                               /* 빛 고리 홈 */
          float joint=step(1.95,r)*smoothstep(.04,.0,abs(fract(a/6.2832*14.)-.5)*r*.45)+smoothstep(.04,.0,abs(r-1.98))+smoothstep(.04,.0,abs(r-1.66));
          float inner=step(r,1.66)*smoothstep(.04,.0,abs(fract((vL.x+vL.z*.3)*.9)-.5)*.5+abs(fract((vL.z-vL.x*.2)*.9)-.5)*0.);   /* 안쪽 판석 이음 */
          c*=1.-.45*(joint+inner*.6); c=mix(c,vec3(.08,.12,.16),ring*.8);
          c*=mix(1.,.82,smoothstep(1.95,2.6,r));
          glow=ring; }
        else c*=.72;
        vec3 col=c*(SUNC*wrapL(n,.2)*1.1+SKYC*(.3+.15*n.y));
        col+=vec3(.3,1.,1.25)*glow*(1.4+.6*sin(uT*1.4))+vec3(.2,.7,.9)*smoothstep(.5,.0,abs(r-1.82))*.25*step(.5,n.y);
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

export function makeHeroIsle(uT, sun, opt = {}) {
  const R = rng(opt.seed || 2026), uN = opt.uN || bakeFbm(), grp = new THREE.Group();
  const T = opt.top ?? -8, CX = opt.x || 0, CZ = opt.z || 0, S = opt.size || 9;
  const rad = th => S * (1 + .1 * Math.sin(th * 2 + 1.2) + .06 * Math.sin(th * 5 + .4) + .03 * Math.sin(th * 11)) * (1 + .12 * Math.cos(th) ** 2);   /* 살짝 길쭉하고 울퉁불퉁한 둘레 */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  /* ── 바위 덩이 놓기 (모양 6가지 되풀이) ── */
  const CG = [0, 1, 2, 3, 4, 5].map(() => chunkGeo(R)), stone = stoneMat(uT, uN, sun), lists = CG.map(() => []);
  const put = (x, y, z, sx, sy, sz, yaw, tilt = 0, glow = 0, tint = [.64, .62, .63], kind = Math.floor(R() * 6)) => lists[kind].push({ x, y, z, sx, sy, sz, yaw, tilt, glow, tint });
  const NR = 18;
  for (let i = 0; i < NR; i++) { const th = (i + R() * .3) / NR * Math.PI * 2, r = rad(th), w = 2 * Math.PI * r / NR * 1.35, h = 3.2 + R() * 2.8;   /* 둘레 벼랑 */
    put(CX + Math.cos(th) * (r - 1.1), T - h / 2 - .25 - R() * .45 + (R() < .15 ? .55 : 0), CZ + Math.sin(th) * (r - 1.1), w, h, 2.6 + R(), -th + Math.PI / 2, (R() - .3) * .12, 0, [.62 + R() * .06, .6 + R() * .05, .62 + R() * .05]); }
  for (let i = 0; i < 13; i++) { const th = (i + R() * .4) / 13 * Math.PI * 2, r = rad(th) * .72, h = 3 + R() * 2.5;   /* 아래 둘째 층: 안쪽으로 물러나 아래로 */
    put(CX + Math.cos(th) * r, T - 4.6 - h / 2 - R(), CZ + Math.sin(th) * r, 3.4 + R() * 1.4, h, 3, -th + Math.PI / 2, (R() - .5) * .2, 0, [.55, .53, .56]); }
  for (let i = 0; i < 8; i++) { const th = (i + R() * .4) / 8 * Math.PI * 2, r = rad(th) * .42, h = 3 + R() * 2;   /* 셋째 층 */
    put(CX + Math.cos(th) * r, T - 8.2 - h / 2 - R() * 1.5, CZ + Math.sin(th) * r, 3, h, 2.6, -th + Math.PI / 2, (R() - .5) * .25, 0, [.5, .48, .52]); }
  put(CX + .5, T - 12.5, CZ - .4, 3.2, 5, 3, R() * 3, .1, 0, [.46, .44, .49]); put(CX - 1.2, T - 13.5, CZ + 1, 2, 4, 2, R() * 3, -.15, 0, [.44, .42, .47]);   /* 맨 아래 뾰족 */
  /* 속 채움: 바위 덩이 사이 빈틈이 안 보이게 큰 덩이 몇 개 */
  for (let i = 0; i < 5; i++) put(CX + (R() - .5) * S * .8, T - 2.6 - R() * 2, CZ + (R() - .5) * S * .8, S * .9, 4, S * .8, R() * 3, 0, 0, [.58, .56, .58]);
  /* ── 둥근 돌 판 + 디딤돌 ── */
  const PX = CX + .6, PZ = CZ + .8;
  { const g = new THREE.CylinderGeometry(2.6, 2.8, .45, 48, 1); g.translate(0, .1, 0); const m = new THREE.Mesh(g, padMat(uT, uN, sun)); m.position.set(PX, T + .1, PZ); grp.add(m); }
  for (let i = 0; i < 7; i++) { const a = 1.9 + i * .38 + (R() - .5) * .15, d = 3.4 + i * .55; put(PX + Math.cos(a) * d, T + .12, PZ + Math.sin(a) * d, 1.15 + R() * .4, .3, .8 + R() * .3, -a + (R() - .5) * .5, 0, 0, [.7, .69, .7]); }   /* 디딤돌 길 */
  for (let i = 0; i < 5; i++) { const a = -.6 + i * .32, d = 3.6 + (R() - .5) * .4; put(PX + Math.cos(a) * d, T + .1, PZ + Math.sin(a) * d, 1.3, .28, .9, -a, 0, 0, [.7, .69, .7]); }
  /* ── 부서진 돌 아치 둘: 반원으로 쌓다 끊김 · 안쪽 면에 빛 줄 ── */
  const arch = (bx, bz, yaw, Rr, nTot, nHave, lean) => { const ux = Math.cos(yaw), uz = -Math.sin(yaw);
    put(bx - ux * Rr, T + .5, bz - uz * Rr, 1.25, 1.2, 1.1, yaw, 0, 0, [.66, .65, .67]);   /* 받침 */
    for (let k = 0; k < nHave; k++) { const ph = Math.PI - (k + .5) / nTot * Math.PI, cx = Math.cos(ph) * Rr, cy = Math.sin(ph) * Rr * 1.15;
      const x = bx + ux * cx, z = bz + uz * cx, y = T + 1.1 + cy;
      e.set(0, yaw, ph - Math.PI / 2 + Math.PI / 2 + lean * k * .02, 'YXZ');
      lists[k % 6].push({ x, y, z, sx: .95, sy: Math.PI * Rr / nTot * 1.04, sz: .95, yawE: e.clone(), glow: 1, tint: [.68, .67, .69] }); } };
  arch(PX - 2.6, PZ - 3.2, .5, 2.3, 9, 6, 1);
  arch(PX + 3.4, PZ - 1.2, 1.9, 2.1, 9, 5, -1);
  /* ── 작은 바위 ── */
  for (let i = 0; i < 14; i++) { const th = R() * 6.28, r = rad(th) * (.62 + R() * .3), s = .5 + R() * 1.1; put(CX + Math.cos(th) * r, T + s * .25, CZ + Math.sin(th) * r, s * 1.2, s, s, R() * 6, (R() - .5) * .4, 0, [.6, .59, .61]); }
  /* 바위 그리기 (모양마다 1번) */
  lists.forEach((L, k) => { if (!L.length) return; const im = new THREE.InstancedMesh(CG[k], stone, L.length), gl = new Float32Array(L.length), ti = new Float32Array(L.length * 3);
    L.forEach((b, i) => { if (b.yawE) q.setFromEuler(b.yawE); else { e.set(b.tilt, b.yaw, 0, 'YXZ'); q.setFromEuler(e); } m4.compose(v.set(b.x, b.y, b.z), q, s3.set(b.sx, b.sy, b.sz)); im.setMatrixAt(i, m4); gl[i] = b.glow; ti.set(b.tint, i * 3); });
    const g2 = CG[k].clone(); g2.setAttribute('aGlow', new THREE.InstancedBufferAttribute(gl, 1)); g2.setAttribute('aTint', new THREE.InstancedBufferAttribute(ti, 3)); im.geometry = g2; grp.add(im); });
  /* ── 풀 윗면 + 넘친 이끼 턱 ── */
  { const ring = []; for (let i = 0; i < 40; i++) { const th = i / 40 * Math.PI * 2, r = rad(th) * .98; ring.push([CX + Math.cos(th) * r, T, CZ + Math.sin(th) * r]); }
    const P = [], I = [], A = []; grassCap(ring, R, P, I, A);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I); g.computeVertexNormals(); grp.add(new THREE.Mesh(g, grassMat(uT, uN, sun))); }
  /* ── 늘어진 덩굴: 풀 턱 아래로 ── */
  { const L = []; for (let i = 0; i < 80; i++) { const th = R() * 6.28, r = rad(th) * 1.04, len = 1.2 + Math.pow(R(), 1.3) * 4.5; L.push([CX + Math.cos(th) * r, T - .2, CZ + Math.sin(th) * r, len, th]); }
    const g = new THREE.PlaneGeometry(.8, 1); g.translate(0, -.5, 0); const im = new THREE.InstancedMesh(g, vineMat(uT, uN, sun), L.length);
    L.forEach(([x, y, z, len, th], i) => { e.set(0, -th + Math.PI / 2, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.set(1, len, 1)); im.setMatrixAt(i, m4); }); grp.add(im); }
  /* ── 결정 무리: 아치 옆(위로) · 섬 아래(거꾸로 매달림) ── */
  { const cm = crystalMat(uT), CG2 = [crystalCluster(R, 5), crystalCluster(R, 4), crystalCluster(R, 6)], L = [[], [], []];
    L[0].push([PX + 5.2, T, PZ - 2.2, 1.15, 0]); L[1].push([PX - 5.6, T, PZ - 3.6, .8, 0]);
    for (let i = 0; i < 6; i++) { const th = R() * 6.28, r = rad(th) * (.35 + R() * .3); L[i % 3].push([CX + Math.cos(th) * r, T - 5.5 - R() * 5, CZ + Math.sin(th) * r, .9 + R() * .6, Math.PI]); }
    L.forEach((list, k) => { if (!list.length) return; const im = new THREE.InstancedMesh(CG2[k], cm, list.length);
      list.forEach(([x, y, z, s, flip], i) => { e.set(flip + (R() - .5) * .3, R() * 6, (R() - .5) * .3); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.set(s, s, s)); im.setMatrixAt(i, m4); }); grp.add(im); }); }
  /* ── 식물: 넓은 잎 풀포기 · 갈라진 큰 잎 · 야자 · 분홍 별꽃 ── */
  { const leaves = [], add = (x, y, z, yaw, pitch, len, wid, kind, bend) => leaves.push({ x, y, z, yaw, pitch, len, wid, kind, bend });
    const plant = (x, z, s, kind) => { s *= 1.6; const n = 8 + Math.floor(R() * 5); for (let i = 0; i < n; i++) { const yaw = i / n * 6.28 + R() * .4; add(x, T + .15, z, yaw, .55 + R() * .5, (1.2 + R() * .6) * s, (.55 + R() * .2) * s, kind, .5 + R() * .4); } };
    const spots = [[2.5, 6.4, 1, 0], [-1, -7.4, 1.1, 1], [8.2, 2, .9, 1], [-8.6, 3.2, 1, 1], [5.5, 6, .8, 0], [-6.5, -2.2, 1.5, 1], [-7, 1.8, 1.1, 0], [4.8, -5.4, 1., 0], [6.4, 3.6, 1.2, 1], [-2.5, 5.6, .9, 0], [1.5, -6.6, .8, 0], [-4.6, -5.6, 1.3, 1], [7.6, -.5, .8, 0], [-8, -.2, .9, 0]];
    for (const [x, z, s, k] of spots) plant(CX + x, CZ + z, s, k);
    /* 야자: 휜 줄기 + 늘어진 긴 잎 */
    const palm = [CX - 6.8, CZ - 3.8], ph = 5.2; { const pts = [new THREE.Vector3(palm[0], T, palm[1]), new THREE.Vector3(palm[0] + .5, T + ph * .5, palm[1] + .2), new THREE.Vector3(palm[0] + 1.1, T + ph, palm[1] + .5)];
      const c = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(c, 12, .26, 7, false); { const p = tg.attributes.position, uv = tg.attributes.uv, cc = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { const u = uv.getX(i); c.getPointAt(Math.min(1, u), cc); const ring = 1 + .12 * Math.max(0, Math.sin(u * 60)); v0.fromBufferAttribute(p, i).sub(cc).multiplyScalar((1 - u * .35) * ring).add(cc); p.setXYZ(i, v0.x, v0.y, v0.z); } tg.computeVertexNormals(); }
      const bm = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: .9, flatShading: true }); grp.add(new THREE.Mesh(tg, bm));
      const top = pts[2]; for (let i = 0; i < 10; i++) add(top.x, top.y, top.z, i / 10 * 6.28 + R() * .3, 1.05 + R() * .35, 3 + R() * .8, .9, 2, 1.2); }
    /* 분홍 별꽃: 꽃잎 여섯 */
    const fl = [[-5.2, -1.2, 1.1], [5.8, 2.4, 1.], [-3.6, 4.4, .8], [3, -5.2, .9], [-7.6, 3, .7]];
    for (const [x, z, s] of fl) { const y = T + .9 * s; for (let i = 0; i < 6; i++) add(CX + x, y, CZ + z, i / 6 * 6.28, .9, .75 * s, .42 * s, 3, .15); }
    const lm = leafMat(uT, uN, sun), im = new THREE.InstancedMesh(leafGeo(6), lm, leaves.length), at = new Float32Array(leaves.length * 4);
    leaves.forEach((l, i) => { e.set(-l.pitch + Math.PI / 2, l.yaw, 0, 'YXZ'); q.setFromEuler(e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
      e.set(0, l.yaw, 0); const qy = new THREE.Quaternion().setFromEuler(e), qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), l.pitch); qy.multiply(qp);
      m4.compose(v.set(l.x, l.y, l.z), qy, s3.set(l.wid, l.len, 1)); im.setMatrixAt(i, m4); at.set([l.kind, l.bend * l.len * .35, l.kind < 2 ? 1 : 0, R()], i * 4); });
    im.geometry.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(at, 4)); grp.add(im);
    /* 꽃 가운데 */
    const cg = new THREE.SphereGeometry(.14, 8, 6), cmt = new THREE.MeshBasicMaterial({ color: 0xffe27a }), ci = new THREE.InstancedMesh(cg, cmt, fl.length);
    fl.forEach(([x, z, s], i) => { m4.compose(v.set(CX + x, T + .95 * s, CZ + z), q.identity(), s3.set(s, s, s)); ci.setMatrixAt(i, m4); }); grp.add(ci); }
  grp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const inside = (x, z) => { const dx = x - CX, dz = z - CZ; return Math.hypot(dx, dz) < rad(Math.atan2(dz, dx)) * .97; };
  return { mesh: grp, uN, discs: [{ x: CX, y: T, z: CZ, r: S * 1.05 }], topAt: (x, z) => inside(x, z) ? T + (Math.hypot(x - PX, z - PZ) < 2.6 ? .55 : .2) : null };
}

function merge2(gs) { const P = [], Nn = []; for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; const p = g.attributes.position; g.computeVertexNormals(); const n = g.attributes.normal; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g; }
