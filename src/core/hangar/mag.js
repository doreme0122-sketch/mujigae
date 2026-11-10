import * as THREE from 'three';

/* 원인 → 과정 → 결과
   원인: 가운데 원에서 빛이 터진다
   과정: 가운데 원 → 세로 빛선(안→밖으로 불이 번지듯) → 원판 테두리 등 띠 → 안쪽 빛 네모 → 바깥 빛 네모 순으로 번지며 밝아진다
   결과: 바깥 빛 네모에서 이어져 세로 빛 알갱이가 솟구치고, 그게 닿는 순간 기체가 떠오른다
   평소: 가운데 원판의 빛나는 부분에서 작은 알갱이가 흐리게 피어오른다 */
const S=1.5, PADY=.175, T=4.2, IMP=.5, SPREAD=1.25, RISE=.50, LV=1.6, FRONT_END=1.62;
const AB={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending};
const sm=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };

export function makeMag(pad,opt={}){   /* opt.dust=false: 떠오르는 알갱이 없음(격납고 밖) */
  const G=new THREE.Group();
  const st={grade:0,push:0,pb:undefined,lt:undefined,fired:-1,mode:'bend'};
  const bellyY=bob=>PADY+S*(.57+bob*.07);
  const L=pad.userData.lampU, ID=pad.userData.idleSrc;
  const SRC={r:1.50,y:.10,n:8};                      /* 바깥 빛 네모(경사면 등) */

  /* ── 평소: 가운데 원판 빛나는 부분에서 흐리게 피어오르는 작은 알갱이 (빛이 지나가면 같이 밝아짐) ── */
  /* 판의 빛나는 곳 전부에서 곧장 위로 올라가는 빛 알갱이. 빛이 지나가면 밝아지고, 결과 때 기체 바닥까지 솟는다 */
  const A8=Math.PI*2/8, src=[];
  const pick=()=>{ const k=Math.random();
    if(k<.12) return [ID.ring, Math.random()*6.283, .148];
    if(k<.42){ const s=Math.floor(Math.random()*8); return [.41+.40*Math.random(), s*A8+A8/2, .177]; }
    if(k<.58) return [ID.rim, Math.random()*6.283, .152];
    const s=Math.floor(Math.random()*8), j=(Math.random()-.5)*.03;
    if(k<.75) return [1.14+.17*Math.random(), s*A8+j, .146];                                  /* 안쪽 빛 네모 */
    if(k<.92){ const r=1.44+.11*Math.random(); return [r, s*A8+j, .155-(r-1.38)/.22*.055-.009]; } /* 바깥 빛 네모 */
    return [1.587, s*A8+A8/2+(Math.random()-.5)*.12, .05]; };                                   /* 맨 바깥 옆면 등 */
  const NI=900, ia=new Float32Array(NI*4), iy=new Float32Array(NI);
  for(let i=0;i<NI;i++){ const [r,ang,y]=pick(); ia[i*4]=r; ia[i*4+1]=ang; ia[i*4+2]=Math.random(); ia[i*4+3]=Math.random(); iy[i]=y; }
  const ig=new THREE.BufferGeometry(); ig.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NI*3),3));
  ig.setAttribute('a',new THREE.BufferAttribute(ia,4)); ig.setAttribute('y0',new THREE.BufferAttribute(iy,1));
  const idleMat=new THREE.ShaderMaterial({...AB,uniforms:{uT:{value:0},uPh:{value:0},uFront:{value:-1},uAfter:{value:0},uTop:{value:1},uPx:{value:10},uRise:{value:99},uMode:{value:0},uGrade:{value:0}},
    vertexShader:`attribute vec4 a;attribute float y0;uniform float uT,uPh,uFront,uAfter,uTop,uPx,uRise,uMode,uGrade;varying float vA,vSz;varying vec3 vCol;
      vec3 hsv(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      void main(){
        float topMax=${(PADY+S*.64).toFixed(3)};
        float tw=.75+.25*sin(uT*2.+a.w*40.);
        float y, al;
        if(uMode<.5){
          /* 1번: 평소엔 판 위에 낮게 멈춰 있다가, 불이 다 들어오면 판의 빛나는 곳에서 위로 솟아 흩어짐 */
          float u=fract(a.z+uPh*(.8+.4*a.w));
          float H=max(.4,uTop-.04-y0)+smoothstep(.9,1.2,a.x)*(.55+.35*uGrade);
          y=y0+u*H;
          float vis=mix(.35,1.,uAfter);
          al=(.30*tw+3.0*uAfter)*smoothstep(0.,.08,u)*(1.-smoothstep(vis*.6,vis,u));
        } else {
          /* 2번: 기체에 묶임 + 불이 다 들어온 순간 판에서 확 솟구쳐 제자리로 */
          float G=max(.4,topMax-.04-y0)+smoothstep(.9,1.2,a.x)*(.55+.35*uGrade), f=a.z;
          float slot=y0+f*G+(uTop-topMax)+sin(uT*.8+a.w*30.)*.006;
          float q=clamp((uRise-f*.10-a.w*.05)/.42,0.,1.); q=1.-pow(max(1.-q,0.),3.);
          y=mix(y0,slot,q);
          float streak=uRise<.6?(1.-q)*2.:0.;
          float hide=uRise<.6?1.:smoothstep(y0,y0+.05,y);
          al=(.10*tw+3.0*uAfter+streak)*hide*(1.-smoothstep(.85,1.,f));
        }
        vec3 p=vec3(cos(a.y)*a.x,max(y,y0),sin(a.y)*a.x);
        vA=al*(1.+.7*uGrade)*${LV.toFixed(2)};
        vCol = uGrade<.5 ? vec3(.22,.45,1.2) : uGrade<1.5 ? vec3(1.,.32,1.15) : hsv(fract(a.w*3.7+uT*.12+y*.35))*1.1+.12;   /* 알갱이 색도 등급대로, 전설은 하나하나 색이 다르고 오르며 바뀜 */
        float sz=fract(a.w*7.31+a.z*3.71); sz=.5+5.5*pow(max(sz,0.),3.2);
        vSz=sz; vA*=mix(1.,.55,smoothstep(1.5,6.,sz));
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=sz*uPx/(-mv.z)*.55; }`,
    fragmentShader:`precision highp float;varying float vA,vSz;varying vec3 vCol;
      void main(){ vec2 q=gl_PointCoord-.5; float k=mix(16.,7.,smoothstep(1.5,6.,vSz));   /* 큰 건 부드럽게 번짐 */
        gl_FragColor=vec4(vCol*exp(-dot(q,q)*k)*vA,1.); }`});
  const idle=new THREE.Points(ig,idleMat); idle.frustumCulled=false; G.add(idle); if(opt.dust===false) idle.visible=false;

  /* ── 기체 바닥 빛 렌즈 + 그림자 ── */
  const disc=(frag,add=true)=>{ const m=new THREE.ShaderMaterial({...(add?AB:{transparent:true,depthWrite:false}),side:THREE.DoubleSide,
      uniforms:{uR:{value:1},uA:{value:0}},
      vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`precision highp float;varying vec2 vP;uniform float uR,uA;void main(){float r=length(vP);${frag}}`});
    const o=new THREE.Mesh(new THREE.CircleGeometry(2.0,96),m); o.rotation.x=-Math.PI/2; G.add(o); return o; };
  const lens=disc(`gl_FragColor=vec4(vec3(.36,.64,1.05)*exp(-(r/uR*r/uR)*2.2)*uA,1.);`); lens.visible=false;   /* 빛 판 없음 */
  const shadow=disc(`gl_FragColor=vec4(0.,0.,0.,exp(-(r/uR*r/uR)*1.8)*uA);`,false); shadow.renderOrder=-1;

  const bellyLight=new THREE.PointLight(0x4f8dff,2,.75,2); G.add(bellyLight);
  bellyLight.visible=false;   /* 배 쪽 빛 없음 */

  function update(t,ship,shipHalf){
    const cyc=Math.floor(t/T), p=t/T-cyc;
    const hAt=pp=>{ if(pp<IMP){ const x=pp/IMP; return 1-2*(x*x*(3-2*x)); } const y=(pp-IMP)/(1-IMP); return -1+2*(1-Math.pow(1-y,2.6)); };
    const bob=hAt(p), dt=st.lt===undefined?.016:Math.min(.05,Math.max(0,t-st.lt)); st.lt=t;   /* 시간이 거꾸로 가면(로딩 때 미리 돌려 본 뒤 처음부터 다시) 0 — 예전엔 음수가 되어 빛 세기가 수백만 배로 튐 (2026-11-10) */
    const near=(1-bob)/2, top=bellyY(bob);
    const tImp=(cyc+IMP)*T, t0=tImp-SPREAD;   /* 불이 다 들어온 순간 = 알갱이가 솟는 순간 = 기체가 뜨는 순간 */           /* 도착 시각에서 거꾸로: 터짐 → 번짐 → 솟음 → 닿음 */
    const e=t-t0;
    /* 과정: 앞머리가 가운데(0)에서 바깥(FRONT_END)으로 */
    let front=-1, head=0;
    if(e>=0 && e<SPREAD+.25){ const q=Math.min(1,e/SPREAD); front=FRONT_END*Math.pow(q,1.15); head=e<SPREAD?1:1-(e-SPREAD)/.25; }
    /* 지나간 자리는 밝게 남았다가 서서히 잦아듦 */
    const after = e>=0 ? Math.exp(-Math.max(0,e-SPREAD-RISE)*1.6)*sm(0,.1,e) : 0;
    /* 꺼질 때: 퍼진 빛이 바깥에서 가운데로 모이며 천천히 꺼짐 */
    const OFF0=SPREAD+.55, OFFD=1.5;
    let back=9, tail=0;
    if(e>=OFF0 && e<OFF0+OFFD){ const q=(e-OFF0)/OFFD, k=q*q*(3-2*q); back=FRONT_END*(1-k); tail=.6; }
    else if(e>=OFF0+OFFD) back=-1;
    const lampOn = e>=0 && back>=0;
    L.uFront.value = lampOn ? (front<0?FRONT_END:front) : -1;
    L.uHead.value=Math.max(0,head)*(1+.6*st.grade); L.uAfter.value=lampOn?1+.7*st.grade:0; L.uBase.value=.22;
    if(L.uBack){ L.uBack.value=back; L.uTail.value=tail; }
    if(st.hold){ L.uFront.value=FRONT_END; L.uHead.value=0; L.uAfter.value=1+.7*st.grade; if(L.uBack){ L.uBack.value=9; L.uTail.value=0; } }   /* 켜 둔 채로 (기체가 있는 동안) */
    /* 원인: 가운데 렌즈가 먼저 터짐 / 빛이 다 모이면 가운데가 한 번 숨 쉬듯 밝았다 잦아듦 */
    const gath = e>=OFF0+OFFD ? Math.exp(-(e-OFF0-OFFD)*2.2) : (e>=OFF0 ? sm(.6,1,(e-OFF0)/OFFD) : 0);
    const g=pad.userData.groups; if(g&&g.lens) g.lens.uniforms.uK.value=.7+2.2*Math.exp(-Math.max(0,e)*5)*(e>=0?1:0)+.6*(lampOn?1:0)+1.2*gath;
    /* 결과: 바깥 네모에 닿은 순간부터 알갱이가 솟구쳐, 정확히 기체 바닥에 닿음 */
    const er=e-SPREAD;
    if(st.fired!==cyc && er>=0){ st.fired=cyc; st.push=1; }
    st.push*=Math.pow(.05,dt);
    const I=idleMat.uniforms; I.uT.value=t; I.uFront.value=L.uFront.value; I.uAfter.value=after; I.uTop.value=top; const launch=er>=0?Math.exp(-er*1.1):0; I.uRise.value=er>=0?er:99;           /* 바닥 전체에 불이 다 들어온 뒤 */
    st.ph=(st.ph||0)+dt*(er>=0?2.4*Math.exp(-er*1.8):0); I.uPh.value=st.ph; I.uAfter.value=launch;
    if(ship){ const jit=Math.max(0,near-.92)/.08; ship.position.set((Math.random()-.5)*jit*.006, top+shipHalf+(Math.random()-.5)*jit*.004, 0); }
    lens.position.y=top-.008; lens.material.uniforms.uR.value=S*.5; lens.material.uniforms.uA.value=(.15+.9*st.push)*LV;
    shadow.position.y=PADY+.002; shadow.material.uniforms.uR.value=S*.62*(.52+.1*(1-near)); shadow.material.uniforms.uA.value=.5+.3*near;
    if(st.grade===2) bellyLight.color.setHSL((t*.06)%1,.8,.6);
    bellyLight.position.set(0,top-.10,0); bellyLight.intensity=(1.5+2*near+6*st.push)*LV;
  }
  G.userData.update=update;
  G.userData.setPixel=px=>{ idleMat.uniforms.uPx.value=px; };
  G.userData.setMode=k=>{ idleMat.uniforms.uMode.value=k; };
  G.userData.setHold=on=>{ st.hold=!!on; };
  const GC=[0x2f6bff,0xd03cff,0xffffff];
  G.userData.setGrade=g=>{ st.grade=g; idleMat.uniforms.uGrade.value=g; L.uGrade.value=g; bellyLight.color.setHex(GC[g]); };
  return G;
}
