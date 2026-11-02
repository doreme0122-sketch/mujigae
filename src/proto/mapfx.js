/* 맵 미리보기 — 빛과 공간을 계산하는 재질 모음
   · 깊은 우주: 성운·먼지띠·별 세 겹. 구역마다 성운 색이 다르다(그 자리 아래에 그 색이 깔림).
   · 공간 굴절: 블랙홀·웜홀 둘레의 화면을 실제로 휘게 해서 그린다(고리를 그리지 않는다).
     웜홀 가장자리 색은 빛이 색마다 조금씩 다르게 꺾여서 생긴다.
   · 강착 원반·성운 안개·보스 터 홀로그램 바닥·보스 홀로그램·불탄 잔해·소행성·결정 */
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const HUE = 'vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }';
const N2 = `float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n2(p); p=mat2(1.6,1.2,-1.2,1.6)*p+3.1; a*=.5; } return s; }
float fbm3(vec2 p){ float s=0.,a=.5; for(int i=0;i<3;i++){ s+=a*n2(p); p=mat2(1.6,1.2,-1.2,1.6)*p+3.1; a*=.5; } return s; }`;
const FS = 'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}';
const U = v => ({ value: v });

/* ───── 깊은 우주 ───── */
export function skyMaterial(regions) {
  const rg = regions.map(r => new THREE.Vector4(r.x, r.z, r.r, r.k ?? 1)), rc = regions.map(r => new THREE.Vector3(...r.c));
  return new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { uRes: U(new THREE.Vector2(2, 2)), uCam: U(new THREE.Vector2()), uSpan: U(60), uT: U(0), uRg: U(rg), uRc: U(rc) },
    vertexShader: FS,
    fragmentShader: `precision highp float; varying vec2 vU; uniform vec2 uRes,uCam; uniform float uSpan,uT;
      uniform vec4 uRg[${rg.length}]; uniform vec3 uRc[${rg.length}]; ${N2}
      /* 별 한 겹: 칸마다 하나, 화면 픽셀 크기로 */
      vec3 stars(vec2 q, float cell, float th, float sz){ vec2 g=floor(q/cell), f=q/cell-g; float h=h21(g); if(h<th) return vec3(0.);
        vec2 o=vec2(h21(g+3.1),h21(g+7.7))*.8+.1; float d=length((f-o)*cell); float b=pow((h-th)/(1.-th),2.2);
        float tw=.7+.3*sin(uT*(.7+h*2.6)+h*61.); vec3 col=mix(vec3(1.,.78,.58),vec3(.66,.8,1.),h21(g+1.3));
        float s=sz*(.55+b*1.4); return col*(exp(-d*d/(s*s))*(.35+b*2.2)+exp(-d/(s*3.))*b*b*.05)*tw; }
      void main(){
        float asp=uRes.x/uRes.y; vec2 c=(vU-.5)*vec2(asp,1.);
        vec2 w=uCam+vec2(c.x,-c.y)*uSpan;                         /* 이 픽셀 아래 맵 위의 자리 (구역 색) */
        vec2 p=vec2(c.x,-c.y)*(uSpan*.55+70.)+uCam*.5;             /* 멀리 있는 성운 (덜 움직임) */
        vec2 wp=p*.012; wp+=vec2(fbm3(wp*1.7+uT*.004),fbm3(wp*1.7+5.2-uT*.003))*1.4;
        float neb=fbm(wp), fil=pow(fbm(wp*2.3+11.),2.);
        float dust=smoothstep(.5,.78,fbm(p*.02+vec2(27.,9.)));       /* 빛을 가리는 먼지띠 */
        vec3 rc=vec3(0.); float tw=0.;
        for(int i=0;i<${rg.length};i++){ vec2 d=w-uRg[i].xy; float k=exp(-dot(d,d)/(uRg[i].z*uRg[i].z)); rc+=uRc[i]*k*uRg[i].w; tw+=k; }
        vec3 base=mix(vec3(.012,.016,.04),vec3(.03,.02,.06),neb);
        vec3 col=base + rc*(.05+.34*pow(neb,2.4)+.3*fil) + vec3(.04,.05,.1)*fil*.4;
        col*= 1.-dust*.78;
        float ppu=uRes.y/uSpan; vec2 fc=gl_FragCoord.xy, cm=vec2(uCam.x,-uCam.y)*ppu;
        vec3 st=stars(fc+cm*.06,uRes.y*.03,.6,.45)*.5 + stars(fc+cm*.12+91.,uRes.y*.055,.8,.55)*.8 + stars(fc+cm*.2+37.,uRes.y*.12,.93,.7)*1.3;
        col+=st*(1.-dust*.6);
        gl_FragColor=vec4(col,1.); }` });
}

/* ───── 공간 굴절 (블랙홀·웜홀) ───── */
export function lensMaterial() {
  const L = []; for (let i = 0; i < 3; i++) L.push(new THREE.Vector4(0, 0, 0, 0));
  return new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { tS: U(null), tP0: U(null), tP1: U(null), uAsp: U(1), uT: U(0), uL: U(L) },
    vertexShader: FS,
    fragmentShader: `precision highp float; varying vec2 vU; uniform sampler2D tS,tP0,tP1; uniform float uAsp,uT; uniform vec4 uL[3];
      float sq(float x){ return x*x; }
      vec2 bend(vec2 c, vec2 n, float r, float E, float ext){ float k=smoothstep(ext,ext*.45,r); float b=r-E*E/max(r,.0001)*k; return c+n*b*vec2(1./uAsp,1.); }
      void main(){
        vec2 uv=vU; vec3 col=texture2D(tS,uv).rgb; bool done=false;
        for(int i=0;i<3;i++){ vec4 L=uL[i]; if(L.w<.5||done) continue;
          vec2 d=(uv-L.xy)*vec2(uAsp,1.); float r=length(d), R=L.z; vec2 n=d/max(r,1e-6);
          if(L.w<1.5){                                             /* 블랙홀: 빛이 휘어 뒤쪽이 둘레로 감겨 보인다 */
            float E=R*2.25, ext=E*4.;
            if(r<ext){ done=true;
              vec2 s=bend(L.xy,n,r,E,ext);
              col=texture2D(tS,clamp(s,0.,1.)).rgb;
              col*=smoothstep(R*.94,R*1.06,r);                       /* 빛이 빠져나오지 못하는 곳 */
              col+=vec3(1.,.86,.66)*exp(-sq((r-R*1.08)/(R*.05)))*.35*smoothstep(0.,R,r); } }
          else {                                                   /* 웜홀: 목 안쪽은 반대편 하늘, 둘레는 휘어 보인다 */
            float E=R*1.12, ext=E*3.6;
            if(r<R*1.02){ done=true; float q=clamp(r/R,0.,1.);
              float a=atan(n.y,n.x)+(1.-q)*(1.-q)*1.6+uT*.08;      /* 목으로 갈수록 빙 돌아 들어감 */
              vec2 pu=.5+vec2(cos(a),sin(a))*pow(q,1.45)*.5;
              vec3 pc= L.w<2.5 ? texture2D(tP0,pu).rgb : texture2D(tP1,pu).rgb;
              vec2 s=bend(L.xy,n,r,E,ext);
              vec3 out1=texture2D(tS,clamp(s,0.,1.)).rgb;
              col=mix(pc*(.55+.45*(1.-q*q)), out1, smoothstep(.86,1.02,q)); }
            else if(r<ext){ done=true;                              /* 색마다 꺾이는 정도가 조금씩 다름 */
              vec2 sr=bend(L.xy,n,r,E*1.035,ext), sg=bend(L.xy,n,r,E,ext), sb=bend(L.xy,n,r,E*.965,ext);
              col=vec3(texture2D(tS,clamp(sr,0.,1.)).r,texture2D(tS,clamp(sg,0.,1.)).g,texture2D(tS,clamp(sb,0.,1.)).b);
              col+=vec3(.75,.85,1.)*exp(-sq((r-R)/(R*.12)))*.12; } }
        }
        gl_FragColor=vec4(col,1.); }` });
}

/* ───── 강착 원반: 안쪽은 희게 뜨겁고 바깥은 주황, 다가오는 쪽이 더 밝다 ───── */
export function diskMaterial(rin, rout) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: U(0), uI: U(1) },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `precision highp float; varying vec2 vP; uniform float uT,uI; ${N2}
      void main(){ float r=length(vP), a=atan(vP.y,vP.x);
        float q=clamp((r-${rin.toFixed(2)})/${(rout - rin).toFixed(2)},0.,1.);
        float om=2.2/pow(r/${rin.toFixed(2)},1.5);                 /* 안쪽일수록 빨리 돈다 */
        float aa=a+uT*om;
        float f=fbm(vec2(aa*3.2,r*1.1))*.7+fbm(vec2(aa*9.,r*3.4)+7.)*.45;
        float streak=pow(f,2.4)*1.8;
        float temp=pow(1.-q,1.6);
        vec3 c=mix(vec3(1.,.32,.08),vec3(1.,.72,.38),temp); c=mix(c,vec3(.95,.97,1.15),pow(temp,3.));
        float dop=1.+.55*sin(a+.6);                                 /* 우리 쪽으로 오는 쪽이 밝다 */
        float edge=smoothstep(0.,.06,q)*smoothstep(1.,.55,q);
        gl_FragColor=vec4(c*streak*edge*dop*(.5+temp*2.2)*uI,1.); }` });
}

/* ───── 성운 안개: 겹겹이 깔린 얇은 막. 덮으면 아래가 가려진다 ───── */
export function fogMaterial(cx, cz, R) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uT: U(0), uFlash: U(new THREE.Vector4(0, 0, 0, 0)), uC: U(new THREE.Vector3(cx, 0, cz)) },
    vertexShader: `attribute float aL; varying vec3 vW; varying float vL;
      void main(){ vL=aL; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float; varying vec3 vW; varying float vL; uniform float uT; uniform vec4 uFlash; uniform vec3 uC; ${N2}
      void main(){ vec2 p=vW.xz*.06+vec2(vL*7.3,vL*3.1);
        p+=vec2(fbm3(p*1.3+uT*.03),fbm3(p*1.3+4.-uT*.025))*1.2;
        float d=fbm(p), r=length(vW.xz-uC.xz)/${R.toFixed(1)};
        float a=smoothstep(.42,.82,d)*smoothstep(1.,.4,r)*.24;
        vec3 c=mix(vec3(.02,.13,.16),vec3(.13,.04,.2),smoothstep(.3,.7,fbm3(p*.7+9.)));
        float rim=smoothstep(.5,.62,d)*smoothstep(.75,.62,d);                 /* 안개 결 가장자리가 빛을 받는다 */
        c+=vec3(.12,.5,.55)*rim*.9 + vec3(.5,.9,.95)*pow(smoothstep(.72,.98,d),3.)*.6;
        float fl=uFlash.w*exp(-length(vW.xz-uFlash.xy)/7.);           /* 속에서 번쩍이는 빛 */
        c+=vec3(.6,.75,1.2)*fl*(.4+d);
        gl_FragColor=vec4(c*(1.+fl),a*(1.+fl*.3)); }` });
}

/* ───── 보스 터 바닥 홀로그램: 연두 한 색, 서로 반대로 도는 눈금 ───── */
export function arenaFloorMaterial(R) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: U(0), uI: U(.5), uWarn: U(0) },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `precision highp float; varying vec2 vP; uniform float uT,uI,uWarn;
      float line(float x,float w){ return exp(-x*x/(w*w)); }
      void main(){ float r=length(vP)/${R.toFixed(1)}, a=atan(vP.y,vP.x); float px=fwidth(r)*1.2;
        float v=0.;
        v+=line(r-1.,px*1.2)*1.2 + line(r-.985,px)*.5;                                  /* 테두리 두 줄 */
        float a1=a+uT*.05, t1=abs(fract(a1/6.2832*120.)-.5);                             /* 바깥 눈금 */
        v+=step(.93,r)*step(r,.975)*smoothstep(.12,.0,t1)*.7;
        float a2=a-uT*.08, s2=fract(a2/6.2832*6.);                                       /* 반대로 도는 끊긴 호 */
        v+=line(r-.82,px*1.1)*step(.08,s2)*step(s2,.62)*.8;
        float a3=a+uT*.13, s3=fract(a3/6.2832*3.);
        v+=line(r-.6,px)*step(s3,.4)*.6 + line(r-.585,px)*step(s3,.4)*.3;
        v+=line(r-.34,px)*.45 + line(r-.12,px*1.3)*.8;
        float sw=fract((a-uT*(.6+uWarn*1.4))/6.2832);                                   /* 훑고 지나가는 빛 */
        v+=pow(sw,14.)*smoothstep(1.,.1,r)*.35*(1.+uWarn);
        v*=smoothstep(1.05,.98,r);
        vec3 c=vec3(.72,1.,.29);
        gl_FragColor=vec4(c*v*uI,1.); }` });
}

/* ───── 보스 홀로그램 + 실체로 차오르기 ───── */
export function holoMaterial() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: U(0), uI: U(0), uCut: U(-2), uC: U(new THREE.Vector3()), uAx: U(new THREE.Vector3(0, 0, 1)), uLen: U(3) },
    vertexShader: `varying vec3 vN,vV,vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `precision highp float; varying vec3 vN,vV,vW; uniform float uT,uI,uCut,uLen; uniform vec3 uC,uAx; float sq(float x){ return x*x; }
      void main(){ float s=dot(vW-uC,uAx)/uLen; if(s<uCut) discard;
        vec3 fn=normalize(cross(dFdx(vW),dFdy(vW))); float fr=pow(clamp(1.-abs(dot(fn,normalize(vV))),0.,1.),1.5);
        float scan=.55+.45*smoothstep(.6,1.,sin(s*60.-uT*7.));
        float fl=.85+.15*sin(uT*31.+s*7.);
        float band=exp(-sq((s-uCut)*14.))*3.;
        vec3 c=vec3(.72,1.,.29)*(fr*1.3+.08)*scan*fl + vec3(.9,1.,.75)*band;
        gl_FragColor=vec4(c*uI,1.); }` });
}
/* 실체 쪽: 잘린 선 아래만 남기고 잘린 자리는 달궈져 빛남 */
export function cutPatch(mat, u) {
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vWc;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWc=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'uniform float uCut,uLen; uniform vec3 uC,uAx; varying vec3 vWc; float sq(float x){ return x*x; }\n' + sh.fragmentShader
      .replace('void main() {', 'void main() { float sCut=dot(vWc-uC,uAx)/uLen; if(sCut>uCut) discard;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance+=vec3(.8,1.,.5)*exp(-sq((sCut-uCut)*16.))*2.5;'); };
  mat.needsUpdate = true;
}

/* ───── 불탄 잔해: 그을음 + 아직 식지 않은 불씨 ───── */
export function burnPatch(mat, uT, seed) {
  mat.onBeforeCompile = sh => { sh.uniforms.uT = uT;
    sh.vertexShader = 'varying vec3 vWb;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWb=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = `uniform float uT; varying vec3 vWb; ${N2}\n` + sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 bp=vWb.xz*.35+${seed.toFixed(2)}; float so=fbm(bp*1.4), em=fbm(bp*3.1+vec2(4.,1.)+uT*.02);
        diffuseColor.rgb*=mix(.1,.62,smoothstep(.3,.75,so));
        float ember=smoothstep(.71,.77,em)*smoothstep(.55,.42,so);
        float fl=.7+.3*sin(uT*3.+em*30.);
        totalEmissiveRadiance+=vec3(1.,.36,.08)*ember*fl*2.2 + vec3(1.,.6,.25)*smoothstep(.73,.76,em)*ember*fl*2.;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor=max(roughnessFactor,.55);'); };
  mat.needsUpdate = true;
}

/* ───── 소행성: 울퉁불퉁 + 패인 자국, 꼭짓점 색 ───── */
function vnoise(x, y, z) { const h = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, s = t => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h(ix, iy, iz), h(ix + 1, iy, iz), u), L(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), u), v), L(L(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), u), L(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), u), v), w); }
export function rockGeometry(seed, detail = 4) {
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  const cr = []; for (let i = 0; i < 7; i++) cr.push([new THREE.Vector3().randomDirection(), .25 + Math.random() * .35, .05 + Math.random() * .1]);
  const sx = .8 + Math.random() * .5, sy = .6 + Math.random() * .3, sz = .8 + Math.random() * .5;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);
    let f = 0, a = 1, q = 1.3; for (let o = 0; o < 5; o++) { f += (vnoise(v.x * q + seed, v.y * q + seed * 1.7, v.z * q - seed) - .5) * a; a *= .5; q *= 2.1; }
    let c = 0; for (const [d, w, dp] of cr) { const t = v.distanceTo(d) / w; if (t < 1.3) c += t < 1 ? -dp * (1 - t * t) : dp * .5 * Math.sin((t - 1) / .3 * Math.PI); }
    const rr = 1 + f * .55 + c; v.multiplyScalar(rr); v.x *= sx; v.y *= sy; v.z *= sz; p.setXYZ(i, v.x, v.y, v.z);
    const sh = .075 + f * .16 + c * .8, rust = vnoise(v.x * 2 + 9, v.y * 2, v.z * 2) ;
    col[i * 3] = sh * (1.05 + rust * .25); col[i * 3 + 1] = sh * (.93 + rust * .05); col[i * 3 + 2] = sh * .85; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

/* ───── 결정 기둥: 육각 기둥 + 뾰족한 끝 ───── */
export function crystalGeometry() {
  const a = new THREE.CylinderGeometry(.34, .42, 1, 6, 1); a.translate(0, .5, 0);
  const b = new THREE.ConeGeometry(.34, .55, 6, 1); b.translate(0, 1.275, 0);
  for (const g of [a, b]) g.deleteAttribute('uv');
  const m = mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]); m.computeVertexNormals(); return m;
}
