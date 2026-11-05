/* 하늘 섬 — 참고 제작 시트를 그대로 (사용자 2026-11-05: 지금 섬 퀄리티로는 절대 안 됨 · 누가 봐도 AI로 돌린 게임 같음
   · 그 그림과 똑같이 만들려고 노력 · 단순화하지 말고 · 임의로 해석하지 말고 · 원본에 있는 걸 그대로 만든다고 생각하고 · docs/ref_isle_sheet.png)
   원본 그대로 옮긴 것 (보는 쪽 = 앞(+z), 왼쪽 = -x, 뒤 = -z):
   · 몸: 큰 면으로 깎인 밝은 회색 바위 판들이 둘레 벼랑을 빈틈없이 두름(윗면은 평평하게 잘려 풀 아래 맞닿음) → 아래로 갈수록 덩이가 작아지며 뾰족
         바닥 아래로 큰 청록 결정이 여러 개 삐져나와 빛남
   · 윗면: 밝은 연두 풀(짙은 얼룩 · 작은 흰 꽃 · 풀 포기) · 가장자리는 두툼한 이끼 턱이 벼랑 위로 넘치고, 이끼 덩이와 잎 달린 덩굴이 늘어짐
   · 가운데 약간 앞: 둥근 돌 단 — 바깥 돌 테(토막 16개) · 그 안 청록 빛 고리 · 가운데 둥근 판석(얕게 새긴 고리)
   · 돌 판 길: 단 왼쪽으로 네모 판석 두 줄 · 앞 오른쪽에 판석 몇 장 · 여기저기 흩어진 판석
   · 왼쪽 뒤: 부서진 돌 아치(왼쪽 다리에서 솟아 위에서 끊김) — 네모 돌 토막을 반원으로 쌓음, 안쪽 면 가운데 홈을 따라 청록 빛 줄
   · 오른쪽 뒤: 더 높은 부서진 아치(오른쪽 다리에서 솟아 왼쪽 위에서 끊김) + 다리 옆에 쌓인 돌기둥 + 뒤에 키 큰 청록 결정 무리
   · 왼쪽 뒤 구석: 큰 잎 열대 나무(굽은 줄기 · 넓은 잎이 우산처럼) + 둘레 큰 잎 덤불(넓은 잎 · 갈라진 잎)
   · 분홍 백합 둘(왼쪽 앞 · 오른쪽) — 뾰족한 꽃잎 여섯 · 노란 꽃술
   · 가장자리 회색 바위 몇 개 · 작은 풀 포기 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SKY, bakeFbm } from './skyisle.js?v=11052234';

const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const v0 = new THREE.Vector3(), v1 = new THREE.Vector3();

/* ── 큰 면으로 깎인 바위: 십이면체를 찌그러뜨리고 꼭짓점을 흔듦(공유 꼭짓점이라 면이 찢어지지 않음) · 윗면은 평평하게 자름 · 면마다 평평한 빛 */
function facetRock(R, flatTop = true) {
  let g = new THREE.DodecahedronGeometry(1, 0); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); v0.multiplyScalar(.78 + R() * .42); if (flatTop && v0.y > .42) v0.y = .5 + (R() - .5) * .04; p.setXYZ(i, v0.x, v0.y, v0.z); }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}
/* ── 모서리를 조금 깎은 네모 돌(판석 · 아치 토막 · 돌기둥) ── */
function cutStone(R, b = .09) {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), p = g.attributes.position, lim = .5 - b, inner = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v0.fromBufferAttribute(p, i); inner.set(THREE.MathUtils.clamp(v0.x, -lim, lim), THREE.MathUtils.clamp(v0.y, -lim, lim), THREE.MathUtils.clamp(v0.z, -lim, lim));
    v1.copy(v0).sub(inner); const ax = Math.abs(v1.x) > 1e-6, ay = Math.abs(v1.y) > 1e-6, az = Math.abs(v1.z) > 1e-6;
    if (ax + ay + az > 1) { const L = Math.abs(v1.x) + Math.abs(v1.y) + Math.abs(v1.z); v1.multiplyScalar(b / L * (ax + ay + az === 3 ? 1.5 : 1)); }   /* 모서리는 비스듬히 깎음 (둥글지 않게) */
    v0.copy(inner).add(v1); v0.x += (R() - .5) * .03; v0.z += (R() - .5) * .03; p.setXYZ(i, v0.x, v0.y, v0.z); }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng;
}

/* 돌 재질: 밝은 회색 · 면마다 밝기가 조금씩 달라 깎인 면이 또렷 · 아래로 그늘 · 얕은 금과 얼룩 · aGlow면 안쪽 면 홈에 청록 빛 */
function stoneMat(uT, uN, sun, cx = 0, cz = 0) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun }, uC: { value: new THREE.Vector2(cx, cz) } },
    vertexShader: `attribute float aGlow; attribute vec3 aTint; varying vec3 vW, vN, vL, vT; varying float vG;
      void main(){ vL=position; vG=aGlow; vT=aTint; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `uniform vec2 uC; varying vec3 vW, vN, vL, vT; varying float vG;
      void main(){ vec3 n=normalize(vN);
        float fh=fract(sin(dot(floor(n*4.+.5),vec3(12.9,78.2,37.7)))*43758.5);                                   /* 면마다 다른 밝기 */
        float st=nz(vW.xz*.31+vW.y*.17)*.5+nz(vec2(vW.x-vW.z,vW.y)*.9)*.5;
        float crk=smoothstep(.03,.0,abs(nz(vec2(vW.x+vW.z,vW.y*.6)*.23)-.5))*smoothstep(.4,.6,nz(vW.xz*.05+vW.y*.04));   /* 얕은 금 (군데군데) */
        vec3 base=vT*(.9+.14*st+.1*(fh-.5))*(1.-crk*.35);
        if(vG<2.5) base*=mix(.7,1.06,smoothstep(-.6,.5,vL.y)); else base*=mix(.82,1.04,smoothstep(.2,.9,n.y*.5+.5));   /* 한 덩어리 몸통은 아래를 보는 면만 살짝 그늘 */                                                                 /* 덩이 아래쪽 그늘 */
        if(vG>1.5){ /* 벼랑: 세로로 깊게 파인 홈 · 가로 지층 띠 · 바위에 박힌 초록 이끼 점 (장자제 돌기둥처럼) */
          float ang=atan(vW.z-uC.y,vW.x-uC.x);
          float gv=abs(fract(ang*7.+nz(vec2(ang*2.,vW.y*.05))*1.2)-.5);
          float groove=smoothstep(.12,.0,gv)*(.6+.4*nz(vec2(ang*3.,vW.y*.13)));
          float band=smoothstep(.04,.0,abs(fract(vW.y*.21+nz(vW.xz*.03)*.8)-.5)-.4);
          base*=1.-groove*.32-band*.18;
          float lich=smoothstep(.62,.72,nz(vW.xz*.4+vW.y*.21))*smoothstep(-.2,.5,n.y);
          base=mix(base,vec3(.32,.48,.16)*(.8+.4*st),lich*.6); }
        vec3 c=base*(SUNC*wrapL(n,.25)*1.1+SKYC*(.36+.14*n.y))+CLOUD*.22*max(-n.y,0.)*base;
        if(vG>.5&&vG<1.5){ float g=smoothstep(.13,.05,abs(vL.z))*smoothstep(.36,.47,-vL.x);                                 /* 안쪽 면 가운데 홈 */
          float rim=smoothstep(.2,.13,abs(vL.z))*smoothstep(.36,.47,-vL.x)-g;
          c=mix(c,c*.45,rim)+vec3(.2,.85,1.15)*g*(1.5+.4*sin(uT*1.5+vW.y*.8)); }
        gl_FragColor=vec4(sink(c,vW.y),1.); }` });
}

/* 결정: 육각 기둥 + 뾰족한 끝 (무리) · 짙은 파랑 밑동 → 밝은 청록 끝 · 면마다 밝기 다름 · 숨 쉬듯 */
function crystalCluster(R, n, big = 2.4) {
  const gs = [];
  for (let i = 0; i < n; i++) { const h = i === 0 ? big : big * (.35 + R() * .45), r = i === 0 ? big * .2 : big * (.08 + R() * .08);
    const c = new THREE.CylinderGeometry(r, r * 1.08, h, 6, 1); c.translate(0, h / 2, 0); const t = new THREE.ConeGeometry(r, r * 2.4, 6, 1); t.translate(0, h + r * 1.2, 0);
    const g = mergeGeos([c.toNonIndexed(), t.toNonIndexed()]);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(i ? (R() - .5) * 1.2 : (R() - .5) * .25, R() * 6, i ? (R() - .5) * 1.2 : (R() - .5) * .25)));
    if (i) g.translate((R() - .5) * big * .35, 0, (R() - .5) * big * .35); gs.push(g); }
  const g = mergeGeos(gs); g.computeVertexNormals(); return g;
}
function crystalMat(uT) {
  return new THREE.ShaderMaterial({ uniforms: { uT },
    vertexShader: `varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT; varying vec3 vW, vN, vL;
      void main(){ vec3 n=normalize(vN), v=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(n,v)),2.);
        float face=fract(sin(dot(floor(n*3.+.5),vec3(12.9,78.2,37.7)))*43758.5);
        float tip=smoothstep(.0,2.8,abs(vL.y));
        vec3 c=mix(vec3(.04,.35,.85),vec3(.5,.98,1.1),tip*.55+face*.4)+vec3(.7,1.,1.2)*f;
        float lines=smoothstep(.06,.0,abs(fract(vL.y*1.7+face)-.5))*.15;                                           /* 결정 속 결 */
        c+=lines;
        c*=1.25+.25*sin(uT*1.3+vW.x*.5+vW.y);
        gl_FragColor=vec4(c,1.); }` });
}

/* 잎 · 꽃잎 · 풀잎 (한 판을 휘고 잎 모양대로 잘라냄)  aLeaf: x 종류(0 넓은 잎 · 1 갈라진 잎 · 3 꽃잎 · 4 풀잎) · y 휨 · z 접힘 · w 흔들림 씨앗 */
function leafMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `uniform float uT; attribute vec4 aLeaf; varying vec2 vUv; varying vec3 vW, vN; varying vec4 vK;
      void main(){ vUv=uv; vK=aLeaf; vec3 p=position; float t=uv.y;
        p.z+=t*t*aLeaf.y; p.z-=abs(p.x)*aLeaf.z;                                                                    /* 끝으로 휨 · 가운데 잎맥 따라 접힘 */
        vec3 nn=normalize(vec3(-sign(p.x)*aLeaf.z*.8,-2.*t*aLeaf.y*.3,1.));
        vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);
        w.xz+=vec2(sin(uT*1.1+w.x*.4+aLeaf.w*6.),cos(uT*.9+w.z*.4+aLeaf.w*4.))*.05*t*t;
        vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*nn); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec2 vUv; varying vec3 vW, vN; varying vec4 vK;
      void main(){ float u=vUv.x-.5, t=vUv.y, k=vK.x;
        float w;
        if(k<1.5) w=pow(max(sin(3.1416*min(t*1.02,1.)),0.),.62)*.5*(1.-.25*t);   /* 끝에서 sin이 0보다 살짝 작아지면 계산이 깨져 끝에 가로 띠가 남던 것 막음 (사용자 2026-11-05) */                                             /* 넓은 잎: 밑이 둥글고 끝이 뾰족 */
        else if(k<3.5) w=pow(max(sin(3.1416*t),0.),.9)*.5*(1.-t*.55);                                                       /* 꽃잎: 가늘고 끝이 뾰족 */
        else w=(1.-t)*.5;                                                                                           /* 풀잎 */
        if(abs(u)>w) discard;
        if(k>.5&&k<1.5){ float sl=abs(fract(t*4.5+abs(u)*1.9)-.5); if(sl<.05&&abs(u)>w*.3&&t>.12) discard; }          /* 갈라진 잎 틈 */
        vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n;
        float mid=smoothstep(.025,.0,abs(u)), side=smoothstep(.04,.0,abs(fract(t*8.-abs(u)*2.2)-.5))*smoothstep(.03,.1,abs(u));
        vec3 c;
        if(k<1.5){ c=mix(vec3(.05,.30,.08),vec3(.30,.66,.14),smoothstep(.0,.9,t*.6+abs(u)*.9)); c=mix(c,vec3(.55,.85,.3),mid*.7+side*.3); c*=1.-.25*smoothstep(.35,.5,abs(u)/max(w*2.,.01)); }
        else if(k<3.5){ c=mix(vec3(.78,.18,.55),vec3(1.,.62,.88),smoothstep(.0,.8,t)); c=mix(c,vec3(1.,.9,.95),mid*.5); c=mix(c,vec3(1.,.85,.35),smoothstep(.22,.0,t)); }   /* 분홍 꽃잎 · 밑동 노란 빛 */
        else c=mix(vec3(.12,.36,.08),vec3(.5,.78,.22),t);
        vec3 col=c*(SUNC*wrapL(n,.45)*1.1+SKYC*.38)+c*.3*pow(1.-abs(dot(n,normalize(cameraPosition-vW))),2.);
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}
/* 잎 달린 덩굴: 세로 띠에 하트 잎이 좌우로 번갈아 */
function vineMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `uniform float uT; varying vec2 vUv; varying vec3 vW; varying float vS, vLen; void main(){ vUv=uv; vLen=length(instanceMatrix[1].xyz); vS=fract(instanceMatrix[3].x*3.7+instanceMatrix[3].z*1.3);
        vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); float t=1.-uv.y; w.xz+=vec2(sin(uT*.8+vS*9.),cos(uT*.7+vS*7.))*.07*t*t; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec2 vUv; varying vec3 vW; varying float vS, vLen;
      void main(){ float u=vUv.x-.5, t=1.-vUv.y; float L=max(3.,vLen*2.6);   /* 길이에 맞춰 잎 수를 늘림 (잎이 늘어나지 않게) */
        float i=floor(t*L+vS*3.), f=fract(t*L+vS*3.), sd=mod(i,2.)*2.-1.;
        vec2 q=vec2((u-sd*.17)/.25,(f-.45)/.5); q.y-=abs(q.x)*.35; float leaf=step(length(q),1.)*step(t,.96-vS*.25);   /* 하트 모양 잎 */
        float stem=step(abs(u+sin(t*9.)*.03),.03)*step(t,.99);
        if(leaf+stem<.5) discard;
        float sh=fract(i*.37+vS);
        vec3 c=mix(vec3(.08,.32,.07),vec3(.45,.72,.16),sh*.7+.25)*mix(1.,.62,t)*(1.-.25*length(q)*leaf);
        gl_FragColor=vec4(sink(c*(SUNC*.85+SKYC*.35),vW.y),1.); }` });
}
/* 풀 윗면 · 이끼 턱 (inst: 이끼 덩이처럼 여러 개를 찍을 때) */
function grassMat(uT, uN, sun, inst = false) {
  const M = inst ? 'modelMatrix*instanceMatrix' : 'modelMatrix';
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `attribute float aEdge; varying vec3 vW, vN; varying float vE; void main(){ vE=aEdge; vec4 w=${M}*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(${M})*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN; varying float vE;
      void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec2 p=vW.xz;
        float a=nz(p*.06), b=nz(p*.23+3.), c=nz(p*1.1);
        vec3 g=mix(vec3(.24,.50,.08),vec3(.56,.78,.20),smoothstep(.3,.75,a))*(.85+.3*b);                            /* 밝은 연두 · 짙은 초록 얼룩 */
        g=mix(g,vec3(.18,.40,.07),smoothstep(.62,.78,b)*.55);
        g*=.9+.2*c;
        vec2 fc=floor(p*2.6), fo=fract(p*2.6)-.5-(vec2(hh(fc+.3),hh(fc+.9))-.5)*.5;
        float fl=step(.965,hh(fc))*step(vE,.05)*smoothstep(.13,.07,length(fo));                                    /* 작은 흰 꽃 */
        g=mix(g,vec3(1.,.98,.88),fl);
        g=mix(g,g*vec3(.55,.7,.5),smoothstep(.2,1.,vE));                                                            /* 늘어진 이끼 턱은 짙게 */
        vec3 col=g*(SUNC*wrapL(n,.35)*1.12+SKYC*(.3+.15*n.y));
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}
/* 둥근 돌 단 가운데 판석: 얕게 새긴 고리 · 판석 결 */
function padTopMat(uT, uN, sun) {
  return new THREE.ShaderMaterial({ uniforms: { uT, uN: { value: uN }, uSun: { value: sun } },
    vertexShader: `varying vec3 vW, vN, vL; void main(){ vL=position; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: SKY + `varying vec3 vW, vN, vL;
      void main(){ vec3 n=normalize(vN); float r=length(vL.xz);
        float st=nz(vL.xz*.5)*.5+nz(vL.xz*1.9)*.5;
        vec3 c=vec3(.70,.70,.72)*(.9+.16*st);
        float groove=smoothstep(.05,.0,abs(r-1.25))+smoothstep(.04,.0,abs(r-.55))*.6;                               /* 얕게 새긴 고리 */
        c*=1.-.3*groove*step(.5,n.y); c*=mix(1.,.9,smoothstep(1.5,1.95,r));
        if(n.y<.5) c*=.75;
        vec3 col=c*(SUNC*wrapL(n,.2)*1.1+SKYC*(.32+.14*n.y));
        gl_FragColor=vec4(sink(col,vW.y),1.); }` });
}

export function makeHeroIsle(uT, sun, opt = {}) {
  const R = rng(opt.seed || 2026), uN = opt.uN || bakeFbm(), grp = new THREE.Group();
  const T = opt.top ?? -8, CX = opt.x || 0, CZ = opt.z || 0, S = opt.size || 9.5;
  const rad = th => S * (1 + .07 * Math.sin(th * 2 + 1.2) + .05 * Math.sin(th * 5 + .4) + .025 * Math.sin(th * 9 + 2)) * (1 + .1 * Math.cos(th) ** 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  /* ───── 돌 (모양 여러 가지를 만들어 되풀이: 윗면 평평한 깎인 바위 8 · 그냥 깎인 바위 3 · 네모 돌 5) ───── */
  const RG = Array.from({ length: 8 }, () => facetRock(R)), RGB = Array.from({ length: 3 }, () => facetRock(R, false)), CS = Array.from({ length: 5 }, () => cutStone(R));
  const GEOS = [...RG, ...RGB, ...CS], lists = GEOS.map(() => []), stone = stoneMat(uT, uN, sun, CX, CZ);
  const rock = (x, y, z, sx, sy, sz, yaw, tilt, tint, flat = true, cliff = 0) => lists[flat ? Math.floor(R() * 8) : 8 + Math.floor(R() * 3)].push({ x, y, z, sx, sy, sz, e: new THREE.Euler(tilt, yaw, tilt * .4, 'YXZ'), glow: cliff ? 2 : 0, tint });
  const block = (x, y, z, sx, sy, sz, eul, glow = 0, tint = [.72, .71, .72]) => lists[11 + Math.floor(R() * 5)].push({ x, y, z, sx, sy, sz, e: eul, glow, tint });
  const gray = k => [.66 * k + R() * .04, .65 * k + R() * .035, .67 * k + R() * .04];
  /* 둘레 벼랑 1층: 큰 판 바위가 빈틈없이 (윗면은 풀 바로 아래) */
  const N1 = 22;
  for (let i = 0; i < N1; i++) { const th = (i + R() * .25) / N1 * Math.PI * 2, r = rad(th), w = 2 * Math.PI * r / N1 * .95, h = 3.6 + R() * 2.2;
    rock(CX + Math.cos(th) * (r - .9), T - .32 - h * .5, CZ + Math.sin(th) * (r - .9), w * .75, h * .5, 1.6 + R() * .6, -th + Math.PI / 2, (R() - .5) * .1, gray(1), true, 1); }
  /* ── 몸통 = 이음매 없는 바위 한 덩어리 (사용자 2026-11-05: 조각 여러 개를 붙인 것 말고 진짜 한 덩어리로)
     · 둘레를 따라 이어진 표면 하나 · 위는 넓고 아래로 좁아지는 물방울 모양 · 깊이 = 윗면 폭의 약 1.6배
     · 꼭짓점을 성기게 두고 흔들어, 넓고 평평한 깎인 면과 각진 모서리 (면마다 평평한 빛)
     · 세로 홈 = 몇 줄마다 표면을 안으로 파냄 · 가로 지층 턱 = 몇 단마다 바깥으로 튀어나왔다 바로 아래서 들어감
     · 끝은 한쪽으로 치우쳐 뜯긴 듯 울퉁불퉁 · 겉에 큰 바위 덩이 몇 개만 박힘 */
  const DEPTH = S * 2 * 1.6, tipX = S * .28, tipZ = -S * .12, LEDGE = [];
  const prof = q => Math.pow(Math.max(0, 1 - q), .72) * (1 + .18 * Math.sin(q * Math.PI)) * .95;
  { const NC = 30, NRW = 16, P = [], ring = [];
    /* 턱은 둘레 전체 고리가 아니라 군데군데 짧게 (사용자 2026-11-05: 여러 층으로 나눈 것처럼 보임) — 2~4줄 폭, 높이 제각각 */
    const LM = Array.from({ length: NRW + 1 }, () => new Float32Array(NC)), LS = [];
    for (let k = 0; k < 11; k++) { const r = 2 + Math.floor(R() * 10), c0 = Math.floor(R() * NC), n = 2 + Math.floor(R() * 3), a = .7 + R() * .6;
      for (let j = 0; j < n; j++) { const c = (c0 + j) % NC, w = j === 0 || j === n - 1 ? .55 : 1; LM[r][c] = Math.max(LM[r][c], a * w); if (r + 1 <= NRW) LM[r + 1][c] = Math.min(LM[r + 1][c], -.3 * w); }
      LS.push([r, (c0 + (n >> 1)) % NC]); }
    const colJ = Array.from({ length: NC }, () => (R() - .5) * .5), grv = Array.from({ length: NC }, (_, c) => c % 3 === 0 ? .55 + R() * .4 : R() < .12 ? 1 + R() * .4 : 0);   /* 세로 홈 + 위에서 아래까지 이어진 깊은 틈 몇 줄 */
    for (let r = 0; r <= NRW; r++) { const q = r / NRW, y = T - .55 - Math.pow(q, 1.05) * DEPTH + (r > 0 && r < NRW ? (R() - .5) * 1.1 : 0), f = prof(q), ox = CX + tipX * q * q, oz = CZ + tipZ * q * q, row = [];
      for (let c = 0; c < NC; c++) { const th = (c + colJ[c] * (r > 0 ? 1 : .3)) / NC * Math.PI * 2;
        let rr = r === 0 ? rad(th) * .97 : rad(th) * f - grv[c] * (1 - q * .4) + LM[r][c] * (1 - q * .5) + (R() - .5) * .7 * (1 - q * .3);
        rr = Math.max(.25, rr); row.push([ox + Math.cos(th) * rr, y, oz + Math.sin(th) * rr]);
        if (LM[r][c] > .5 && q < .8 && LS.some(([lr, lc]) => lr === r && lc === c) && R() < .7) LEDGE.push([ox + Math.cos(th) * (rr + .25), y + .25, oz + Math.sin(th) * (rr + .25), th, 1 - q]); }   /* 짧은 턱 몇 곳에만 식물 */
      ring.push(row); }
    const tip = [CX + tipX + (R() - .5), T - .55 - DEPTH - 2.5, CZ + tipZ + (R() - .5)];
    const tri = (a, b, c) => P.push(...a, ...b, ...c);
    for (let r = 0; r < NRW; r++) for (let c = 0; c < NC; c++) { const d = (c + 1) % NC, a = ring[r][c], b = ring[r][d], e1 = ring[r + 1][d], f1 = ring[r + 1][c];
      if ((r + c) % 2) { tri(a, e1, b); tri(a, f1, e1); } else { tri(a, f1, b); tri(b, f1, e1); } }   /* 대각선을 번갈아 → 면이 한쪽으로 쏠리지 않음 */
    for (let c = 0; c < NC; c++) tri(ring[NRW][c], tip, ring[NRW][(c + 1) % NC]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals();
    g.setAttribute('aGlow', new THREE.InstancedBufferAttribute(new Float32Array([3]), 1)); g.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array([.64, .63, .655]), 3));
    const body = new THREE.InstancedMesh(g, stone, 1); body.setMatrixAt(0, new THREE.Matrix4()); grp.add(body);
    /* 겉에 박힌 큰 바위 덩이 (몇 개만) · 뜯긴 끝에 엉킨 덩이 */
    for (let i = 0; i < 7; i++) { const q = .1 + R() * .6, th = R() * 6.28, rr = rad(th) * prof(q) - .3, s2 = 1.6 + R() * 1.6;
      rock(CX + tipX * q * q + Math.cos(th) * rr, T - .55 - q * DEPTH, CZ + tipZ * q * q + Math.sin(th) * rr, s2 * 1.2, s2, s2, -th + Math.PI / 2, (R() - .5) * .3, gray(.96 - q * .15), R() < .5, 1); }
    for (let i = 0; i < 3; i++) rock(tip[0] + (R() - .5) * 1.4, tip[1] + 1.5 - i * 1.2, tip[2] + (R() - .5) * 1.4, 1.3 - i * .3, 1.1, 1.1 - i * .25, R() * 6, (R() - .5) * .6, gray(.74), false, 1); }
  /* 따로 떠 있는 작은 바위섬 (몸통에 붙지 않고 둘레에 떠 있음) */
  const FLOAT = [];
  for (let i = 0; i < 9; i++) { const th = i / 9 * Math.PI * 2 + R() * .5, d = S * (1.45 + R() * .7), y = T - 3 - R() * 16, s = .9 + Math.pow(R(), 1.5) * 2.2;
    const x = CX + Math.cos(th) * d, z = CZ + Math.sin(th) * d; rock(x, y - s * .5, z, s * 1.3, s * .9, s * 1.2, R() * 6, (R() - .5) * .2, gray(.92), true, 1); rock(x + (R() - .5) * s * .4, y - s * 1.5, z, s * .8, s * .8, s * .7, R() * 6, R(), gray(.84), false, 1);
    FLOAT.push([x, y, z, s]); }
  /* 속 채움 */
  for (let i = 0; i < 6; i++) rock(CX + (R() - .5) * S * .9, T - 2.4 - R() * 2.2, CZ + (R() - .5) * S * .8, S * .5, 2.2, S * .45, R() * 3, 0, gray(.9));
  /* 가장자리 회색 바위 (풀 위로 솟음) */
  const edgeRocks = [[-1.02, -.5, 1.5], [-.92, -3.3, 1.1], [.95, -2.6, 1.0], [-.7, 6.3, .8], [.62, 6.4, .7], [-.96, 2.6, .8], [1.0, 2.4, .7]];
  for (const [fx, z, s] of edgeRocks) { const x = fx * S * .92; rock(CX + x, T + s * .35, CZ + z, s * 1.2, s * .8, s, R() * 6, (R() - .5) * .3, gray(1.02), false); }
  /* ───── 둥근 돌 단 ───── */
  const PX = CX + .4, PZ = CZ + .6;
  { const top = new THREE.CylinderGeometry(1.98, 2.0, .38, 56, 1); top.translate(0, .19, 0); const m = new THREE.Mesh(top, padTopMat(uT, uN, sun)); m.position.set(PX, T + .08, PZ); grp.add(m);
    /* 빛 고리 (홈 안 빛) */
    const rg = new THREE.RingGeometry(2.0, 2.34, 64); rg.rotateX(-Math.PI / 2); const rm = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: { uT },
      vertexShader: 'varying vec2 vP; void main(){ vP=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uT; varying vec2 vP; void main(){ float r=length(vP); float k=smoothstep(.17,.0,abs(r-2.17)); vec3 c=mix(vec3(.05,.3,.45),vec3(.45,1.15,1.35),k); c*=1.+.25*sin(uT*1.4); gl_FragColor=vec4(c,1.); }' }));
    rm.position.set(PX, T + .4, PZ); grp.add(rm);
    /* 바깥 돌 테: 토막 16개 (모서리 깎은 네모 돌을 고리로) */
    const NS = 16; for (let i = 0; i < NS; i++) { const a = (i + .5) / NS * Math.PI * 2, r = 2.78; e.set(0, -a, 0); block(PX + Math.cos(a) * r, T + .27, PZ + Math.sin(a) * r, .82, .5, 2 * Math.PI * r / NS * .95, e.clone(), 0, [.72 + R() * .04, .71 + R() * .04, .73 + R() * .04]); }
    /* 단 아래 받침 (풀에 묻힌 낮은 돌) */
    const bs = new THREE.CylinderGeometry(3.25, 3.4, .3, 40, 1); const bm = new THREE.Mesh(bs, padTopMat(uT, uN, sun)); bm.position.set(PX, T + .04, PZ); grp.add(bm); }
  /* ───── 돌 판 길 ───── */
  const slab = (x, z, w, d, yaw) => { e.set(0, yaw, 0); block(x, T + .1, z, w, .22, d, e.clone(), 0, [.74 + R() * .04, .73 + R() * .04, .74 + R() * .04]); };
  for (let i = 0; i < 4; i++) { const x = PX - 3.9 - i * 1.25; slab(x, PZ + .3 + i * .18 - .55, 1.1, .9, .12 + (R() - .5) * .1); slab(x - .15, PZ + .3 + i * .18 + .5, 1.05, .85, .1 + (R() - .5) * .1); }   /* 왼쪽 두 줄 */
  slab(PX + 3.6, PZ + 2.6, 1.2, .9, -.6); slab(PX + 4.5, PZ + 3.5, 1.1, .85, -.7); slab(PX + 2.6, PZ + 3.6, 1, .8, -.5);   /* 앞 오른쪽 */
  slab(PX - 2.4, PZ + 4.2, .9, .8, .3); slab(PX + 1.2, PZ - 4.1, .95, .8, .2); slab(PX - 6.6, PZ - 2.4, .8, .7, .5); slab(PX + 6.0, PZ - .2, .9, .7, -.3);   /* 흩어진 판석 */
  /* ───── 부서진 돌 아치 ───── */
  const arch = (cx, cz, yaw, Rr, nTot, from, to, legSide) => { const ux = Math.cos(yaw), uz = -Math.sin(yaw), thick = .78, depth = .95, base = T + .25;
    const leg = legSide < 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) { e.set(0, yaw, 0); block(cx + ux * Rr * leg, base + .3 + k * .62, cz + uz * Rr * leg, thick * 1.05, .6, depth * 1.05, e.clone(), 1, [.71, .7, .72]); }   /* 다리: 곧게 선 토막 셋 */
    for (let k = from; k < to; k++) { const ph = legSide < 0 ? Math.PI - (k + .5) / nTot * Math.PI : (k + .5) / nTot * Math.PI, ca = Math.cos(ph) * Rr, sa = Math.sin(ph) * Rr * 1.2;
      e.set(0, yaw, ph, 'YXZ'); const len = Math.PI * Rr / nTot * 1.02;
      block(cx + ux * ca, base + 1.85 + sa, cz + uz * ca, thick, len, depth, e.clone(), 1, [.7 + R() * .04, .69 + R() * .04, .71 + R() * .04]); } };
  arch(PX - 3.9, PZ - 2.7, .62, 2.25, 8, 0, 6, -1);   /* 왼쪽 뒤: 왼쪽 다리에서 솟아 위에서 끊김 */
  arch(PX + 3.2, PZ - 3.6, -.45, 2.5, 8, 0, 5, 1);    /* 오른쪽 뒤: 오른쪽 다리에서 솟아 왼쪽 위에서 끊김 */
  /* 오른쪽 아치 다리 옆 쌓인 돌기둥 */
  { const bx = PX + 5.6, bz = PZ - 2.4; for (let k = 0; k < 4; k++) { e.set(0, .3 + (R() - .5) * .3, (R() - .5) * .06); block(bx + (R() - .5) * .15, T + .45 + k * .78, bz, 1.05 - k * .08, .76, 1.0 - k * .06, e.clone(), 0, gray(1.04)); }
    for (let k = 0; k < 2; k++) { e.set(0, .9, 0); block(bx + 1.1, T + .4 + k * .7, bz + .9, .8, .68, .8, e.clone(), 0, gray(1)); } }
  /* 돌 그리기 */
  lists.forEach((L, k) => { if (!L.length) return; const g = GEOS[k].clone(), im = new THREE.InstancedMesh(g, stone, L.length), gl = new Float32Array(L.length), ti = new Float32Array(L.length * 3);
    L.forEach((b, i) => { q.setFromEuler(b.e); m4.compose(v.set(b.x, b.y, b.z), q, s3.set(b.sx, b.sy, b.sz)); im.setMatrixAt(i, m4); gl[i] = b.glow; ti.set(b.tint, i * 3); });
    g.setAttribute('aGlow', new THREE.InstancedBufferAttribute(gl, 1)); g.setAttribute('aTint', new THREE.InstancedBufferAttribute(ti, 3)); grp.add(im); });
  /* ───── 풀 윗면 + 두툼한 이끼 턱 ───── 윗면(가운데 살짝 볼록) → 가장자리 턱 → 벼랑 위로 넘쳐 물결처럼 늘어진 끝 */
  { const NA = 96, P = [], I = [], A = [], push = (x, y, z, a) => { P.push(x, y, z); A.push(a); }; push(CX, T + .12, CZ, 0);
    const rings = [[.45, .1, 0], [.8, .06, 0], [.97, .04, 0], [1.03, -.12, .25], [1.06, -.4, .6]];
    for (const [k, dy, a] of rings) for (let i = 0; i < NA; i++) { const th = i / NA * Math.PI * 2, r = rad(th) * k; push(CX + Math.cos(th) * r, T + dy, CZ + Math.sin(th) * r, a); }
    for (let i = 0; i < NA; i++) { const th = i / NA * Math.PI * 2, r = rad(th) * 1.055, hang = .55 + .35 * Math.sin(th * 13 + 1) * Math.sin(th * 7) + (R() < .18 ? .6 + R() * .7 : R() * .25); push(CX + Math.cos(th) * r, T - hang, CZ + Math.sin(th) * r, 1); }
    const rI = k => 1 + k * NA; for (let i = 0; i < NA; i++) { const j = (i + 1) % NA; I.push(0, rI(0) + j, rI(0) + i); for (let k = 0; k < rings.length; k++) I.push(rI(k) + i, rI(k) + j, rI(k + 1) + j, rI(k) + i, rI(k + 1) + j, rI(k + 1) + i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I); g.computeVertexNormals(); grp.add(new THREE.Mesh(g, grassMat(uT, uN, sun))); }
  /* 이끼 덩이: 턱 끝에 뭉쳐 늘어짐 */
  { const g = new THREE.IcosahedronGeometry(1, 1), L = []; for (let i = 0; i < 70; i++) { const th = R() * 6.28, r = rad(th) * 1.04; L.push([CX + Math.cos(th) * r, T - .45 - R() * .5, CZ + Math.sin(th) * r, .35 + R() * .45]); }
    for (const [x, y, z] of LEDGE) for (let k = 0; k < 3; k++) L.push([x + (R() - .5) * 1.2, y + .1, z + (R() - .5) * 1.2, .3 + R() * .35]);   /* 벼랑 턱 이끼 */
    for (const [x, y, z, s2] of FLOAT) for (let k = 0; k < 4; k++) L.push([x + (R() - .5) * s2 * 1.4, y + .05, z + (R() - .5) * s2 * 1.2, .25 + R() * .3 * s2]);   /* 떠 있는 바위섬 윗면 이끼 */
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(.7), 1));
    const im = new THREE.InstancedMesh(g, grassMat(uT, uN, sun, true), L.length);
    L.forEach(([x, y, z, s], i) => { m4.compose(v.set(x, y, z), q.identity(), s3.set(s * 1.3, s, s * 1.3)); im.setMatrixAt(i, m4); }); grp.add(im); }
  /* 늘어진 덩굴 */
  { const L = []; for (let i = 0; i < 76; i++) { const th = R() * 6.28, r = rad(th) * 1.06, len = i < 12 ? 7 + R() * 7 : 1 + Math.pow(R(), 1.4) * 4.2;   /* 열둘은 아주 길게 (깊이감) */ L.push([CX + Math.cos(th) * r, T - .35, CZ + Math.sin(th) * r, len, th]); }
    const g = new THREE.PlaneGeometry(.75, 1); g.translate(0, -.5, 0); const im = new THREE.InstancedMesh(g, vineMat(uT, uN, sun), L.length);
    L.forEach(([x, y, z, len, th], i) => { e.set(0, -th + Math.PI / 2, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s3.set(1, len, 1)); im.setMatrixAt(i, m4); }); grp.add(im); }
  /* ───── 결정 ───── 오른쪽 아치 뒤 키 큰 무리 · 섬 바닥 아래로 삐져나온 큰 결정들 */
  { const cm = crystalMat(uT), G2 = [crystalCluster(R, 6, 3.6), crystalCluster(R, 4, 2.2), crystalCluster(R, 5, 2.6)], L = [[], [], []];
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    L[0].push([PX + 6.1, T + .1, PZ - 3.9, 1, new THREE.Vector3(.05, 1, -.12)]);
    /* 몸통 옆구리에서 비스듬히 아래·바깥으로 삐져나온 결정 (바위에 가리지 않게 겉면에) · 뜯긴 끝에 거꾸로 매달린 결정 */
    for (let i = 0; i < 9; i++) { const q2 = .12 + i / 9 * .75, f = prof(q2), th = i * 2.4 + R() * .6, r = rad(th) * f - .2;
      const ox = CX + tipX * q2 * q2, oz = CZ + tipZ * q2 * q2; L[1 + i % 2].push([ox + Math.cos(th) * r, T - .4 - q2 * DEPTH - R() * 2, oz + Math.sin(th) * r, .7 + R() * .6 - q2 * .2, new THREE.Vector3(Math.cos(th) * .75, -.65, Math.sin(th) * .75)]); }
    L[2].push([CX + tipX, T - .4 - DEPTH - 3, CZ + tipZ, 1.2, new THREE.Vector3(.1, -1, .05)]);
    L.forEach((list, k) => { if (!list.length) return; const im = new THREE.InstancedMesh(G2[k], cm, list.length);
      list.forEach(([x, y, z, s, d], i) => { q.setFromUnitVectors(up, dir.copy(d).normalize()); q.multiply(new THREE.Quaternion().setFromAxisAngle(up, R() * 6)); m4.compose(v.set(x, y, z), q, s3.set(s, s, s)); im.setMatrixAt(i, m4); }); grp.add(im); }); }
  /* ───── 식물 ───── */
  { const leaves = [], add = (x, y, z, yaw, pitch, len, wid, kind, bend, fold) => leaves.push({ x, y, z, yaw, pitch, len, wid, kind, bend, fold });
    /* 큰 잎 덤불: 밑에서 넓은 잎이 사방으로 펼쳐짐 */
    const bushAt = (x, z, s, split) => { const n = 9 + Math.floor(R() * 4); for (let i = 0; i < n; i++) { const yaw = i / n * 6.28 + R() * .4, big = R() < .4; add(x, T + .1, z, yaw, .5 + R() * .55, (1.3 + R() * .7) * s * (big ? 1.25 : 1), (.8 + R() * .25) * s * (big ? 1.2 : 1), split && R() < .5 ? 1 : 0, .7 + R() * .5, .25); } };
    /* 벼랑 턱마다 매달려 자란 덤불: 잎이 바깥·아래로 늘어짐 */
    for (const [x, y, z, th, k] of LEDGE) { const n = 5 + Math.floor(R() * 3), sc = .6 + k * .5; for (let i = 0; i < n; i++) { const yaw = -th + Math.PI / 2 + (i / n - .5) * 2.6; add(x, y, z, yaw + Math.PI, .9 + R() * .5, (1 + R() * .5) * sc, .6 * sc, R() < .4 ? 1 : 0, 1.1, .25); } }
    for (const [x, y, z, s2] of FLOAT) if (s2 > 1.4) { for (let i = 0; i < 6; i++) add(x + (R() - .5) * s2 * .6, y + .05, z + (R() - .5) * s2 * .6, R() * 6.28, .5 + R() * .5, .8 * s2 * .6 + .4, .5 * s2 * .5 + .2, 0, .6, .2); }
    bushAt(CX - 7.4, CZ - 1.4, 1.5, true); bushAt(CX - 5.9, CZ - 4.3, 1.3, true); bushAt(CX - 7.9, CZ + 2.2, 1.0, false); bushAt(CX + 7.0, CZ + .9, 1.2, true); bushAt(CX + 4.2, CZ - 6.0, .9, false);
    bushAt(CX + 6.9, CZ - 4.6, .8, false); bushAt(CX - 2.2, CZ - 6.6, .8, true); bushAt(CX + 1.6, CZ + 7.0, .7, false); bushAt(CX - 4.2, CZ + 6.0, .8, false);
    /* 열대 나무: 굽은 줄기 + 넓은 잎 우산 (왼쪽 뒤 구석) */
    const tx = CX - 6.6, tz = CZ - 4.6, th = 6.8;
    { const pts = [new THREE.Vector3(tx, T, tz), new THREE.Vector3(tx + .35, T + th * .45, tz + .15), new THREE.Vector3(tx + .9, T + th, tz + .45)];
      const c = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(c, 16, .34, 8, false), p = tg.attributes.position, uv = tg.attributes.uv, cc = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { const u = uv.getX(i); c.getPointAt(Math.min(1, u), cc); const ring = 1 + .1 * Math.pow(Math.max(0, Math.sin(u * 70)), 2); v0.fromBufferAttribute(p, i).sub(cc).multiplyScalar((1 - u * .4) * ring * (u < .08 ? 1.5 - u * 6 : 1)).add(cc); p.setXYZ(i, v0.x, v0.y, v0.z); }
      tg.computeVertexNormals(); grp.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0x7d5b3d, roughness: .95, flatShading: true })));
      const top = pts[2]; for (let i = 0; i < 9; i++) add(top.x, top.y, top.z, i / 9 * 6.28 + R() * .3, .95 + R() * .45, 3.1 + R() * .8, 1.25, 0, 1.6, .3);
      for (let i = 0; i < 4; i++) add(top.x, top.y + .1, top.z, R() * 6.28, .3 + R() * .3, 2.2, 1, 0, .8, .3); }
    /* 분홍 백합: 뾰족한 꽃잎 여섯이 위로 벌어짐 + 잎 몇 장 */
    const lilies = [[-6.4, 1.0, 1.25], [6.5, 1.8, 1.15], [-3.4, 4.8, .8]];
    for (const [x, z, s] of lilies) { const y = T + 1.1 * s; for (let i = 0; i < 6; i++) add(CX + x, y, CZ + z, i / 6 * 6.28, .75 + (i % 2) * .15, .95 * s, .48 * s, 3, -.35 * s, .12);
      for (let i = 0; i < 4; i++) add(CX + x, T + .1, CZ + z, i / 4 * 6.28 + .4, .7, 1.1 * s, .45 * s, 0, .5, .2); }
    /* 작은 풀 포기 */
    for (let i = 0; i < 70; i++) { const th2 = R() * 6.28, r = rad(th2) * Math.sqrt(R()) * .92, x = CX + Math.cos(th2) * r, z = CZ + Math.sin(th2) * r; if (Math.hypot(x - PX, z - PZ) < 3.5) continue;
      for (let k = 0; k < 5; k++) add(x, T + .06, z, R() * 6.28, .25 + R() * .4, .45 + R() * .35, .12, 4, .1, 0); }
    const g = new THREE.PlaneGeometry(1, 1, 2, 6); g.translate(0, .5, 0);
    const im = new THREE.InstancedMesh(g, leafMat(uT, uN, sun), leaves.length), at = new Float32Array(leaves.length * 4);
    leaves.forEach((l, i) => { e.set(0, l.yaw, 0); const qy = new THREE.Quaternion().setFromEuler(e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), l.pitch));
      m4.compose(v.set(l.x, l.y, l.z), qy, s3.set(l.wid, l.len, 1)); im.setMatrixAt(i, m4); at.set([l.kind, l.bend * l.len * .4, l.fold, R()], i * 4); });
    g.setAttribute('aLeaf', new THREE.InstancedBufferAttribute(at, 4)); grp.add(im);
    /* 백합 꽃술 */
    const cg = new THREE.SphereGeometry(.16, 10, 8), ci = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: 0xffd65a }), lilies.length);
    lilies.forEach(([x, z, s], i) => { m4.compose(v.set(CX + x, T + 1.2 * s, CZ + z), q.identity(), s3.set(s, s, s)); ci.setMatrixAt(i, m4); }); grp.add(ci); }
  grp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const inside = (x, z) => { const dx = x - CX, dz = z - CZ; return Math.hypot(dx, dz) < rad(Math.atan2(dz, dx)) * .98; };
  return { mesh: grp, uN, discs: [{ x: CX, y: T, z: CZ, r: S * 1.05 }], topAt: (x, z) => inside(x, z) ? T + (Math.hypot(x - PX, z - PZ) < 2.8 ? .46 : .14) : null };
}

function mergeGeos(gs) { const P = [], Nn = []; for (const g of gs) { const p = g.attributes.position; if (!g.attributes.normal) g.computeVertexNormals(); const n = g.attributes.normal; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); return g; }
