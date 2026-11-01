/* 다이아몬드 기체 재질 — 모든 기체 공용
   상(上): 뒷면을 한 번 더 그려 실제 두께만큼 빛이 지나감(두꺼우면 깊고 진하게, 얇으면 맑게)
   중(中): 한 번만 그림(두께 없이 고정값)
   깎은 면은 기체 표면에 고정(움직여도 미끄러지지 않음), 크기·모양 제각각, 빛만 움직임 */
import * as THREE from 'three';

/* ── 주변: 대부분 어둡고 조명판만 또렷한 공간 (밝음/어둠 대비) ── */
export function makeDiamondEnv(renderer){
  const s=new THREE.Scene();
  const sky=new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`precision highp float;varying vec3 vD;
      void main(){ float y=vD.y; vec3 c=mix(vec3(.02,.022,.03),vec3(.14,.15,.17),smoothstep(-.5,.8,y));   /* 어두운 면을 깊게 → 밝은 면이 띄엄띄엄 */
        c+=vec3(.03,.022,.016)*exp(-pow((y+.05)*7.,2.));          /* 먼 바닥선 은은한 빛 */
        gl_FragColor=vec4(c,1.); }`}));
  s.add(sky);
  const P=(w,h,col,k,pos,look)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(k),side:THREE.DoubleSide}));
    m.position.set(...pos); m.lookAt(...look); s.add(m); };
  P(14,2.2,0xffffff,9,[0,22,-4],[0,0,0]);          /* 천장 긴 조명판 */
  P(10,1.4,0xfff1e0,7,[-6,20,8],[0,0,0]);
  P(1.2,16,0xffffff,6,[-24,4,-6],[0,0,0]);         /* 왼쪽 세로 조명판 */
  P(1.0,14,0xe8f2ff,5,[22,3,10],[0,0,0]);          /* 오른쪽 세로 조명판 */
  P(6,6,0xffb070,2.2,[8,6,-26],[0,0,0]);           /* 뒤쪽 따뜻한 등 */
  P(3,8,0x8fbaff,2.0,[-10,2,24],[0,0,0]);          /* 앞쪽 푸른 반사판 */
  { let sd=7; const rn=()=>{ sd=(sd*16807)%2147483647; return sd/2147483647; };      /* 조명판 여럿을 흩어 놓음 → 면마다 밝거나 어둡게 또렷이 갈림 */
    for(let i=0;i<70;i++){ const th=rn()*Math.PI*2, ph=(rn()*1.6-.5), r=26, w=1+rn()*5, h=.3+rn()*1.6, k=2+rn()*9;
      const warm=rn()<.18, cool=rn()<.15; P(w,h,warm?0xffc28a:(cool?0xa9c8ff:0xffffff),k,[Math.cos(th)*Math.cos(ph)*r,Math.sin(ph)*r,Math.sin(th)*Math.cos(ph)*r],[0,0,0]); } }
  for(let i=0;i<14;i++) P(.6,.6,0xffffff,14,[Math.cos(i*.9)*26,2+Math.sin(i*1.7)*12,Math.sin(i*.9)*26],[0,0,0]);   /* 작은 점 조명 → 반짝임 */
  const rt=new THREE.WebGLCubeRenderTarget(512,{type:THREE.HalfFloatType,generateMipmaps:false,minFilter:THREE.LinearFilter});
  const cc=new THREE.CubeCamera(.1,100,rt); cc.update(renderer,s);
  return rt.texture;
}

const COMMON=`
  float h1(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
  vec3 h3(vec3 p){ return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453); }
  /* 가장 가까운 칸의 번호 = 깎은 면 하나 (표면에 고정) */
  vec3 cellId(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=9.; vec3 best=vec3(0.);
    for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 g=vec3(float(x),float(y),float(z)); vec3 o=h3(i+g); vec3 r=g+o-f; float d=dot(r,r);
      if(d<d1){ d1=d; best=i+g; } }
    return best; }
`;

/* 뒷면 한 장: 화면 위치마다 뒷면까지의 거리와 뒷면 방향을 기록 */
export const SHIP={value:new THREE.Matrix4()};   /* 기체 기준 좌표 (모든 부품 같은 크기의 깎은 면) */
export const backMat=new THREE.ShaderMaterial({side:THREE.BackSide,
  uniforms:{uCell:{value:6},uShip:SHIP},
  vertexShader:`varying vec3 vVN; varying float vZ; varying vec3 vO; uniform mat4 uShip;
    void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vZ=-mv.z; vVN=normalize(normalMatrix*normal); vO=(uShip*modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`precision highp float; varying vec3 vVN; varying float vZ; varying vec3 vO; uniform float uCell;
    ${COMMON}
    void main(){ vec3 n=normalize(vVN); vec3 r=h3(cellId(vO*uCell)+7.)-.5; n=normalize(n+(r-dot(r,n)*n)*1.);
      gl_FragColor=vec4(vZ, n*.5+.5); }`});

export function diamondMaterial({env,back,map=null,mark=0,cell=6,role=0,tint=[1,1,1],base=[.8,.8,.85],body=[.73,.81,.13]}){
  return new THREE.ShaderMaterial({
    uniforms:{uEnv:{value:env},uBack:{value:back},uRes:{value:new THREE.Vector2(1,1)},uMap:{value:map},uHasMap:{value:map?1:0},uMark:{value:mark},
      uCell:{value:cell},uT:{value:0},uHi:{value:1},uLight:{value:new THREE.Vector3(.3,1,.2).normalize()},uScale:{value:1},uRole:{value:role},uMode:{value:1},uTint:{value:new THREE.Vector3(...tint)},uBase:{value:new THREE.Vector3(...base)},uBody:{value:new THREE.Vector3(...body)},uBody2:{value:new THREE.Vector3(...body)},uShip:SHIP,uBright:{value:1.45},uLin:{value:0}},
    vertexShader:`varying vec3 vWN; varying vec3 vWP; varying vec3 vO; varying vec2 vUv; varying float vZ; uniform mat4 uShip;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; vWN=normalize(mat3(modelMatrix)*normal); vO=(uShip*w).xyz; vUv=uv;
        vec4 mv=viewMatrix*w; vZ=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`precision highp float;
      varying vec3 vWN; varying vec3 vWP; varying vec3 vO; varying vec2 vUv; varying float vZ;
      uniform samplerCube uEnv; uniform sampler2D uBack; uniform vec2 uRes; uniform sampler2D uMap; uniform float uHasMap, uMark, uCell, uT, uHi, uScale, uRole, uMode, uBright, uLin; uniform vec3 uLight, uTint, uBase, uBody, uBody2;
      ${COMMON}
      vec3 env(vec3 d){ return textureCube(uEnv,d).rgb; }
      void main(){
        vec3 N0=normalize(vWN), V=normalize(cameraPosition-vWP);
        if(!gl_FrontFacing) N0=-N0;
        vec3 id=cellId(vO*uCell); vec3 r=h3(id)-.5; float rnd=h1(id*1.37);
        vec3 N=normalize(N0+(r-dot(r,N0)*N0)*.9);                 /* 칸마다 다르게 기운 평평한 면 */
        /* 무늬(숫자·가는 테두리): 다이아 위에 박힌 금속 */
        float mk=0.; vec3 mcol=uBase;
        if(uHasMap>.5){ vec3 t=texture2D(uMap,vUv).rgb; mcol=pow(t,vec3(2.2));
          float lime=max(smoothstep(.2,.1,distance(t,uBody)),smoothstep(.2,.1,distance(t,uBody2)));   /* 그림 안 넓은 색 = 다이아 */
          float lav=smoothstep(.12,.0,distance(t,vec3(.76,.71,.83)));
          mk=(1.-lime)*smoothstep(.05,.14,max(max(mcol.r,mcol.g),mcol.b)); }   /* 거의 검은 무늬는 색으로 안 보이므로 다이아로 */                                                   /* 원래 배색 무늬(라임이 아닌 곳) = 백금 */
        float role=uRole;
        if(uRole>.5&&uRole<1.5) mk=1.;                                  /* 작은 색 재질 = 또렷한 원래 색 */
        float cosv=max(dot(N,V),0.);
        float F=.17+.83*pow(1.-cosv,5.);                               /* 다이아 반사율 */
        vec3 R=reflect(-V,N);
        vec3 refl=env(R)*uBright;
        /* 두께: 뒷면까지 거리 − 앞면까지 거리 */
        vec4 bk=texture2D(uBack,gl_FragCoord.xy/uRes);
        float th=uHi>.5? clamp((bk.r-vZ)/uScale,0.,1.5) : .35;
        vec3 Nb=uHi>.5? normalize(bk.gba*2.-1.) : -N;
        vec3 Nbw=normalize((vec4(Nb,0.)*viewMatrix).xyz);              /* 뒷면 방향을 세상 기준으로 */
        vec3 col=vec3(0.);
        vec3 IOR=vec3(2.40,2.42,2.45);                                 /* 빨강·초록·파랑이 다르게 꺾임 */
        for(int c=0;c<3;c++){ float ior=c==0?IOR.x:(c==1?IOR.y:IOR.z);
          vec3 d=refract(-V,N,1./ior);
          vec3 nb=normalize(-Nbw+(h3(id+3.)-.5)*.35);
          vec3 e=refract(d,nb,ior);
          if(dot(e,e)<.01) e=reflect(d,nb);                            /* 안에서 전반사 → 다른 방향 빛이 튀어나옴 */
          vec3 s=env(e);
          col[c]=c==0?s.r:(c==1?s.g:s.b); }
        /* 두꺼우면 깊고 진하게, 얇으면 맑게 */
        vec3 tint=vec3(.86,.93,1.);
        col*=1.7*uBright*mix(vec3(1.),tint,clamp(th*1.6,0.,1.))*exp(-th*.7);
        { float mx=max(max(mcol.r,mcol.g),mcol.b), mn=min(min(mcol.r,mcol.g),mcol.b); vec3 hc=mcol/max(mx,.001);
          float sat=mx>.002?(mx-mn)/mx:0.;                                /* 원래 도색 색을 그 자리 다이아 속에 은은하게 물들임 */
          vec3 tc=mix(vec3(1.),hc,.28*sat*smoothstep(.04,.2,mx));             /* 어두운 색은 짙게 하지 않고 맑은 다이아 */
          col*=tc; refl*=mix(vec3(1.),tc,.35); }
        if(uMode>1.5&&uMode<2.5){ vec3 tc=uTint/max(max(uTint.r,uTint.g),uTint.b); col*=mix(vec3(1.),tc,.55); }   /* 2안: 고유색을 다이아 속에 살짝 */
        if(role>1.5&&role<2.5&&uMode>2.5){ col=col*1.35+vec3(.05,.06,.08); }                                       /* 3안: 돔은 더 맑게 */
        col+=vec3(.06,.07,.09)*(1.-th*.6);                              /* 속에서 은은히 빛남 */
        vec3 o=mix(col,refl,F);
        /* 강하게 빛날 때만 작은 불꽃(무지개) */
        float g=pow(max(dot(R,uLight),0.),180.)*(.4+.6*fract(rnd*7.+uT*.6));
        vec3 fire=.5+.5*cos(6.2831*(rnd+uT*.15+vec3(0.,.33,.67)));
        o+=g*(2.2*vec3(1.)+1.4*fire);
        /* 면 경계: 아주 얇은 밝은 결 (칸과 칸 사이) */
        { vec3 q=vO*uCell; vec3 i0=floor(q), f0=fract(q); float d1=9.,d2=9.;
          for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 gg=vec3(float(x),float(y),float(z)); vec3 rr=gg+h3(i0+gg)-f0; float d=dot(rr,rr); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d; }
          float ed=sqrt(d2)-sqrt(d1); o+=vec3(.9,.95,1.)*smoothstep(.025,.0,ed)*pow(1.-cosv,3.)*(1.-mk)*.35; }
        /* 금속 무늬 */
        vec3 RN=reflect(-V,N0); float Fm=.62+.38*pow(1.-max(dot(N0,V),0.),5.);
        vec3 mc=mcol/max(.001,max(max(mcol.r,mcol.g),mcol.b));                     /* 원래 무늬 색을 금속 광택으로 (색은 유지, 밝기는 금속) */
        vec3 metal=(env(RN)*1.0+vec3(.015))*mix(vec3(.9),mc,.8)*Fm*mix(.55,1.,max(max(mcol.r,mcol.g),mcol.b)*2.);
        metal+=pow(max(dot(RN,uLight),0.),60.)*1.2;
        o=mix(o,metal,mk);
        if(role>2.5&&uMode>2.5){ float rim=pow(1.-max(dot(N0,V),0.),1.5); o+=vec3(.25,.55,1.)*(.35+.9*rim)*(.85+.15*sin(uT*5.)); }   /* 3안: 엔진 푸른 빛 */
        if(uLin>.5){ gl_FragColor=vec4(o,1.); return; }                /* 격납고처럼 마지막에 밝기 정리를 따로 하는 화면: 원래 빛 그대로 넘김 (두 번 하면 하얗게 뜸) */
        o=o/(1.+o*.55);                                                /* 밝은 곳 부드럽게 */
        gl_FragColor=vec4(pow(o,vec3(1./2.2)),1.);
      }`});
}
