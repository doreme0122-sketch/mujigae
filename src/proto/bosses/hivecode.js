/* 크리스탈 하이브(3스테이지 보스) 생김새 코드 — 사용자의 예전 게임(rainbow_reflect_game_FULL, v0.33.2)에서 그대로 옮김
   · buildB03: 보스 본체 (3단계: 재질 마감·페이즈 상태) — 렌즈 코어·수정 칼날·바깥 링·구슬·연결 팔·위아래 창
   · buildB03FX: 둘레에 떠 도는 보조 거울(팔각 보석)·반사 드론 겉모습만 (스킬 물체는 뺌)
   · 바꾼 것: 휴대폰 고장 방지로 음수가 될 수 있는 거듭제곱만 막음 (2026-11-03). 예전 게임 좌표 그대로(바닥 XY · 위 Z) */
export function buildB03(THREE,opt){opt=opt||{};const ally=!!opt.ally;const TAU=Math.PI*2;
  /* ---- 재질 ---- */
  const crystal=new THREE.MeshStandardMaterial({color:0xeef0ff,metalness:0.92,roughness:0.06,flatShading:true});
  const crystal2=new THREE.MeshStandardMaterial({color:0xb4b8e8,metalness:0.92,roughness:0.08,flatShading:true});const lens=new THREE.MeshStandardMaterial({color:0xdde2ff,metalness:0.6,roughness:0.04,flatShading:true,transparent:true,opacity:0.42,depthWrite:false});
  const dark=new THREE.MeshStandardMaterial({color:0x15151c,metalness:0.85,roughness:0.42});
  const dark2=new THREE.MeshStandardMaterial({color:0x22222c,metalness:0.9,roughness:0.34,flatShading:true});
  const mirror=new THREE.MeshStandardMaterial({color:0xd8dce6,metalness:1,roughness:0.05});
  /* v2단계: 크리스탈 박막 무지갯빛 — 적=차가운 보라·청·백 스펙트럼 / 아군=무지개. 하이라이트 상한으로 흰 빛 덩어리 제거 */
  const UT={value:0};
  /* 셰이더 효과는 태그만 달아두고, 모델 완성 후 applyFX()에서 한 번에 적용 (clone 해도 태그 유지) */
  const irid=(m,k,cap)=>{m.userData.iri=[k,cap];return m;};const fin=(m,kind)=>{m.userData.fin=kind;return m;};
  crystal.roughness=0.16;crystal2.roughness=0.2;fin(crystal,'cr');fin(crystal2,'cr');fin(dark,'dk');fin(dark2,'dk');irid(crystal,0.55,1.6);irid(crystal2,0.4,1.5);irid(lens,0.5,1.6);
  const gem=new THREE.MeshStandardMaterial({color:0xd8dce6,metalness:1,roughness:0.1,flatShading:true});irid(gem,0.35,1.7);
  const RSC=opt.rsc||0.055;/* 아군: 한 물체 안에서 위치마다 색이 달라 '동시에' 무지개가 보이게 */
  const rainbowize=m=>{m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.vertexShader='varying vec3 vRp;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvRp=(instanceMatrix*vec4(position,1.)).xyz;\n#else\nvRp=position;\n#endif');
    sh.fragmentShader='uniform float uT;varying vec3 vRp;\nvec3 hue(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=(0.25+0.75*hue(fract(atan(vRp.y,vRp.x)/6.2831+length(vRp)*'+RSC.toFixed(3)+'-uT*0.18)))*max(emissive.r,max(emissive.g,emissive.b));');};m.customProgramCacheKey=()=>'rbw'+RSC;};
  const glows=[];const glow=k=>{const m=new THREE.MeshStandardMaterial({color:0x000000,emissive:ally?0xffffff:0x9a6bff,emissiveIntensity:opt.glowI||2.2,toneMapped:false});if(ally)rainbowize(m);m.userData.k=k||0;glows.push(m);return m;};
  const G1=glow(0),G2=glow(1);
  /* ---- 네온 발광선: 가는 밝은 심(튜브) + 바깥 부드러운 빛 껍질(보는 각도와 무관하게 가운데가 진하고 가장자리로 사라짐) ---- */
  const shells=[];const ECOL=0xa880ff;
  const shCache={};function shellMat(k,col,fresh){const key=(k||1)+'|'+(col||0);if(!fresh&&shCache[key])return shCache[key];const m=new THREE.ShaderMaterial({uniforms:{c:{value:new THREE.Color(col||ECOL)},k:{value:k||1},uT:UT,rb:{value:ally&&!col?1:0}},
    vertexShader:'varying vec3 vN;varying vec3 vV;varying vec3 vRp;void main(){vRp=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 c;uniform float k;uniform float uT;uniform float rb;varying vec3 vN;varying vec3 vV;varying vec3 vRp;vec3 hue(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}void main(){float d=abs(dot(normalize(vN),normalize(vV)));float a=pow(max(d,0.),2.4)*k;vec3 col=mix(c,hue(fract(atan(vRp.y,vRp.x)/6.2831+length(vRp)*'+RSC.toFixed(3)+'-uT*0.18)),rb);gl_FragColor=vec4(col*a*1.5,a);}',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});m.userData.k=shells.length;shells.push(m);if(!fresh)shCache[key]=m;return m;}
  class Poly extends THREE.Curve{constructor(p,closed){super();this.p=closed?p.concat([p[0]]):p;this.L=[0];for(let i=1;i<this.p.length;i++)this.L.push(this.L[i-1]+this.p[i].distanceTo(this.p[i-1]));}
    getPoint(t,o){o=o||new THREE.Vector3();const L=this.L,T=t*L[L.length-1];let i=1;while(i<L.length-1&&L[i]<T)i++;const k=(T-L[i-1])/Math.max(1e-6,L[i]-L[i-1]);return o.lerpVectors(this.p[i-1],this.p[i],Math.min(1,Math.max(0,k)));}}
  const cornerSoft=(pts,closed,r)=>{/* 모서리를 살짝 깎아 튜브 꺾임이 매끈하게 */const o=[];const n=pts.length;for(let i=0;i<n;i++){const p=pts[i];if(!closed&&(i===0||i===n-1)){o.push(p);continue;}const a=pts[(i-1+n)%n],b=pts[(i+1)%n];
      o.push(p.clone().lerp(a,r/Math.max(r,p.distanceTo(a))));o.push(p.clone().lerp(b,r/Math.max(r,p.distanceTo(b))));}return o;};
  function neon(pts,closed,rc,rg,core,k,soft){const P=soft?cornerSoft(pts,closed,soft):pts;const cv=new Poly(P,closed);const L=cv.L[cv.L.length-1];const seg=Math.max(8,Math.min(160,Math.round(L*10)));
    const g=grp('neon');g.add(M(new THREE.TubeGeometry(cv,seg,rc,6,false),core||G1));const sh=M(new THREE.TubeGeometry(cv,seg,rg,10,false),shellMat(k));sh.renderOrder=5;g.add(sh);g.userData.shell=sh;return g;}
  const circ=(r,n,z)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*TAU;o.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z||0));}return o;};

  const M=(g,m)=>new THREE.Mesh(g,m);const grp=n=>{const g=new THREE.Group();g.name=n||'';return g;};
  const polar=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
  /* 마름모 단면 로프트: st=[[x, w, hUp, hDown]] (x 방향으로 뻗는 결정) */
  function loft(st,mat){const pos=[];const ring=a=>[[a[0],a[1],0],[a[0],0,a[2]],[a[0],-a[1],0],[a[0],0,-(a[3]!=null?a[3]:a[2])]];
    for(let i=0;i<st.length-1;i++){const A=ring(st[i]),B=ring(st[i+1]);for(let k=0;k<4;k++){const a0=A[k],a1=A[(k+1)%4],b0=B[k],b1=B[(k+1)%4];pos.push(...a0,...a1,...b0,...a1,...b1,...b0);}}
    const F=ring(st[0]);pos.push(...F[0],...F[1],...F[2],...F[0],...F[2],...F[3],...F[2],...F[1],...F[0],...F[3],...F[2],...F[0]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return M(g,mat);}
  /* 역삼각 단면 로프트: 윗면은 넓고 낮은 능선, 아래는 깊은 용골로 모임 → 앞에서 보면 ▽ */
  function loftV(st,mat){const pos=[];const ring=a=>[[a[0],a[1],a[2]*0.25],[a[0],0,a[2]*0.55],[a[0],-a[1],a[2]*0.25],[a[0],0,-a[3]]];
    for(let i=0;i<st.length-1;i++){const A=ring(st[i]),B=ring(st[i+1]);for(let k=0;k<4;k++){const a0=A[k],a1=A[(k+1)%4],b0=B[k],b1=B[(k+1)%4];pos.push(...a0,...a1,...b0,...a1,...b1,...b0);}}
    const F=ring(st[0]);pos.push(...F[0],...F[1],...F[2],...F[0],...F[2],...F[3],...F[2],...F[1],...F[0],...F[3],...F[2],...F[0]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return M(g,mat);}
  /* 다면 크리스탈 로프트: 단면 8각 컷 + 중간 단면 추가 + 꼭짓점 미세 흔들림 → 삼각형마다 각도가 달라 반사면이 많아짐 (윗 능선은 고정: 발광 줄 유지) */
  let fsd=3;const fr=()=>{fsd=(fsd*16807)%2147483647;return fsd/2147483647;};
  const ringD8=a=>{const w=a[1],u=a[2],d=a[3]!=null?a[3]:a[2];const o=[];for(let k=0;k<8;k++){const t=k*Math.PI/4;const sc=k%2?0.84:1;const sn=Math.sin(t);o.push([w*Math.cos(t)*sc,(sn>=0?u:d)*sn*sc]);}return o;};
  const ringV8=a=>{const w=a[1],u=a[2],d=a[3];return[[w,u*0.25],[w*0.55,u*0.45],[0,u*0.55],[-w*0.55,u*0.45],[-w,u*0.25],[-w*0.62,-d*0.42],[0,-d],[w*0.62,-d*0.42]];};
  function facet(st,ring,mat,top){let S=st.map(a=>ring(a).map(p=>[a[0],p[0],p[1]]));
    /* 2회 분할: 마디 4배 → 반사면 약 2배 (2차 분할은 덜 부풀려 실루엣 유지) */
    [1.04,1.015].forEach(bl=>{const R=S;S=[];for(let i=0;i<R.length;i++){S.push(R[i]);if(i<R.length-1){const A=R[i],B=R[i+1];S.push(A.map((p,k)=>{const q=B[k];const b=k===top?1:bl;return[(p[0]+q[0])/2,(p[1]+q[1])/2*b,(p[2]+q[2])/2*b];}));}}});
    for(let i=1;i<S.length-1;i++){const sz=Math.max(...S[i].map(p=>Math.hypot(p[1],p[2])))||0;S[i].forEach((p,k)=>{if(k===top)return;const j=0.075*sz;p[1]+=(fr()-0.5)*j;p[2]+=(fr()-0.5)*j;p[0]+=(fr()-0.5)*j*0.8;});}
    const pos=[];const n=S[0].length;for(let i=0;i<S.length-1;i++){const A=S[i],B=S[i+1];for(let k=0;k<n;k++){const a0=A[k],a1=A[(k+1)%n],b0=B[k],b1=B[(k+1)%n];
      if((i+k)%2)pos.push(...a0,...a1,...b0,...a1,...b1,...b0);else pos.push(...a0,...a1,...b1,...a0,...b1,...b0);}}
    const F=S[0];for(let k=1;k<n-1;k++)pos.push(...F[0],...F[k+1],...F[k]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return M(g,mat);}
  /* 링 부채꼴 판 */
  function sector(r0,r1,a0,a1,th,mat,bev){const s=new THREE.Shape();const n=16;s.moveTo(Math.cos(a0)*r1,Math.sin(a0)*r1);for(let i=1;i<=n;i++){const a=a0+(a1-a0)*i/n;s.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);}for(let i=n;i>=0;i--){const a=a0+(a1-a0)*i/n;s.lineTo(Math.cos(a)*r0,Math.sin(a)*r0);}s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:th,bevelEnabled:true,bevelThickness:bev||0.15,bevelSize:bev||0.15,bevelSegments:1});g.translate(0,0,-th/2);return M(g,mat);}
  const root=grp('B03_Root');const P={};const add=(k,o)=>{o.name='B03_'+k;P[k]=o;root.add(o);return o;};

  /* 01 중앙 코어 — 완전한 구형 렌즈 + 설계도처럼 검은 계열의 길쭉한 다이아몬드 (앞뒤 X 방향으로 길게) */
  {const g=grp();const lensS=lens.clone();lensS.flatShading=false;lensS.opacity=0.16;lensS.color.set(0x7078a8);lensS.metalness=0.3;lensS.envMapIntensity=0.3;irid(lensS,0.28,1.4);
    const sph=M(new THREE.SphereGeometry(4.3,48,32),lensS);sph.position.z=1.2;sph.renderOrder=3;g.add(sph);g.userData.sph=sph;
    /* 렌즈 바닥: 밝은 다면 크리스탈 (방사형 컷) — 검은 다이아몬드가 또렷이 대비되게 */
    const floor=M(new THREE.ConeGeometry(4.35,1.1,24,1,true),crystal);floor.rotation.x=Math.PI/2;floor.position.z=1.1;g.add(floor);const fl2=M(new THREE.CircleGeometry(4.36,24),crystal2);fl2.position.z=0.56;g.add(fl2);
    const base=M(new THREE.CylinderGeometry(4.8,5.0,2.0,48),dark);base.rotation.x=Math.PI/2;base.position.z=-0.45;g.add(base);
    const obs=new THREE.MeshStandardMaterial({color:0x030305,metalness:0.6,roughness:0.35,flatShading:true,side:THREE.DoubleSide,envMapIntensity:0.12});
    /* 다이아몬드: 가운데가 가장 넓고 앞뒤 끝이 뾰족 — 4면 + 위아래 능선 */
    const dia=grp();const st=[[-3.9,0,0,0],[-1.7,1.2,1.1,1.1],[0,1.55,1.5,1.5],[1.7,1.2,1.1,1.1],[3.9,0,0,0]];
    dia.add(loft(st,obs));
    /* 능선 발광: 위·아래·좌·우 4줄 */
    {const sc=1.01;
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(([sy,sz])=>{dia.add(neon(st.map(p=>new THREE.Vector3(p[0],sy*(p[1]+0.02),sz*(p[2]+0.02))),false,0.02,0.09,G1,0.5));});}
    /* 안쪽 보라 심지 */
    const wick=loft([[-2.6,0,0,0],[0,0.22,0.22,0.22],[2.6,0,0,0]],G2);dia.add(wick);dia.userData.wick=wick;
    dia.position.z=1.9;dia.scale.z=0.85;g.add(dia);g.userData.dia=dia;add('CoreLens',g);}
  /* 02 내부 코어 프레임 — 가시 고리 */
  {const g=grp();const t1=M(new THREE.TorusGeometry(4.85,0.28,8,48),dark2);t1.position.z=1.25;g.add(t1);const in2=neon(circ(4.62,96,0),true,0.05,0.34,G2,0.9);in2.position.z=1.35;g.add(in2);
    /* 링과 코어 사이가 좁아져 가시는 돔 가장자리에 낮게 눕힘 */
    for(let i=0;i<16;i++){const a=i/16*TAU;const c=M(new THREE.ConeGeometry(0.16,i%2?0.5:0.85,4),dark2);const [x,y]=polar(4.75,a);c.position.set(x,y,1.55);c.rotation.z=a-Math.PI/2;c.rotation.x=0.9;g.add(c);}
    add('InnerFrame',g);}
  /* 03 외부 링 세그먼트 ×8 — 부채꼴 판 + 테두리 */
  /* v5: 윗면을 코어 쪽으로 솟는 곡면(돔형)으로 — 바깥 가장자리는 가파르고 안쪽으로 갈수록 완만 */
  let sd2=11;const rnd2=()=>{sd2=(sd2*16807)%2147483647;return sd2/2147483647;};const hexM=fin(new THREE.MeshStandardMaterial({color:0x34343f,metalness:0.9,roughness:0.42,flatShading:true}),'dk');
  {const g=grp();const R0=5.08,R1=8.4,ZB=-1.6,ZO=-0.3,ZI=1.9;const zAt=r=>ZO+(ZI-ZO)*Math.sin(Math.min(1,Math.max(0,(R1-r)/(R1-R0)))*Math.PI/2);
    const d2=dark2.clone();d2.side=THREE.DoubleSide;const dk=dark.clone();dk.side=THREE.DoubleSide;const gl2=G2;
    const lath=(pts,a0,a1,mat)=>{const geo=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),12,a0+Math.PI/2,a1-a0);geo.rotateX(Math.PI/2);return M(geo,mat);};
    const prof=[];for(let k=0;k<=14;k++){const r=R1-(R1-R0)*k/14;prof.push([r,zAt(r)]);}
    for(let i=0;i<8;i++){const a0=i/8*TAU+0.035,a1=(i+1)/8*TAU-0.035;const sg=grp();
      sg.add(lath(prof,a0,a1,d2));sg.add(lath([[R1,ZB],[R1,ZO]],a0,a1,d2));sg.add(lath([[R0,ZB],[R1,ZB]],a0,a1,dk));sg.add(lath([[R0,ZI],[R0,ZB]],a0,a1,d2));
      /* 끝 단면 캡 */
      [a0,a1].forEach(aa=>{const sh=new THREE.Shape();sh.moveTo(R0,ZB);sh.lineTo(R1,ZB);prof.forEach(p=>sh.lineTo(p[0],p[1]));sh.closePath();const cg=new THREE.ShapeGeometry(sh);cg.rotateX(Math.PI/2);cg.rotateZ(aa);sg.add(M(cg,d2));});
      /* 곡면을 따라가는 발광 띠 2줄 */
      [8.12,5.3].forEach(r=>{const pts=[];for(let k=0;k<=16;k++){const aa=a0+0.03+(a1-a0-0.06)*k/16;pts.push(new THREE.Vector3(Math.cos(aa)*r,Math.sin(aa)*r,zAt(r)+0.08));}sg.add(neon(pts,false,0.045,0.3,gl2,0.85));});
      {const am=(a0+a1)/2;const sp=M(new THREE.ConeGeometry(0.35,2.0,4),dark2);sp.rotation.x=Math.PI/2;sp.position.set(Math.cos(am)*7.6,Math.sin(am)*7.6,zAt(7.6)+0.9);sg.add(sp);const sp2=M(new THREE.ConeGeometry(0.35,2.6,4),dark2);sp2.rotation.x=-Math.PI/2;sp2.position.set(Math.cos(am)*7.2,Math.sin(am)*7.2,ZB-1.2);sg.add(sp2);}
      /* 육각 벌집 타일 — 곡면 법선 방향으로 붙임 (섹터별 InstancedMesh) */
      {const d=0.78,rows=[];for(let k=0;;k++){const r=R0+0.4+k*d*0.866;if(r>R1-0.3)break;rows.push([r,k]);}
        const mats=[];rows.forEach(([r,k])=>{const da=d/r;const n=Math.floor((a1-a0-0.04)/da);const st=a0+0.02+((a1-a0-0.04)-(n-1)*da)/2+(k%2?da*0.5:0);for(let j=0;j<n-(k%2?1:0);j++)mats.push([r,st+j*da]);});
        const hex=new THREE.CylinderGeometry(0.4,0.43,0.18,6);const im=new THREE.InstancedMesh(hex,hexM,mats.length);const ig=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25,0.25,0.2,6),G2,mats.length);let ng=0;
        const mx=new THREE.Matrix4(),X=new THREE.Vector3(),Y=new THREE.Vector3(),Z=new THREE.Vector3(),col=new THREE.Color();
        mats.forEach(([r,a],i)=>{const m=(zAt(r+0.01)-zAt(r-0.01))/0.02;const N=Math.hypot(m,1);const c=Math.cos(a),sn=Math.sin(a);
          X.set(-sn,c,0);Y.set(-m*c/N,-m*sn/N,1/N);Z.set(c/N,sn/N,m/N);mx.makeBasis(X,Y,Z);mx.setPosition(r*c+Y.x*0.05,r*sn+Y.y*0.05,zAt(r)+Y.z*0.05);im.setMatrixAt(i,mx);
          const v=0.75+rnd2()*0.5;col.setRGB(v,v,v*1.05);im.setColorAt(i,col);if(rnd2()<0.09){mx.setPosition(r*c+Y.x*0.1,r*sn+Y.y*0.1,zAt(r)+Y.z*0.1);ig.setMatrixAt(ng++,mx);}});
        ig.count=ng;sg.add(im);sg.add(ig);}
      g.add(sg);}add('OuterRing',g);}
  /* 04 방사형 크리스탈 블레이드 ×8 — 대각선마다 2장 (긴 것 · 짧은 것) */
  {const g=grp();const blades=[];const sets=[];
    /* v3: 15°마다 촘촘히 22장 (스파이어·하부 창 방향 제외) — 대각·좌우는 길게, 사이는 짧게, 위아래로 번갈아 겹침 */
    for(let k=0;k<24;k++){if(k%12===0)continue;const a=k/24*TAU;const nearAxis=(k%12===1||k%12===11);const long=k%3===0;
      const len=nearAxis?11.8:long?16.4:13.9,w=long?1.75:nearAxis?1.15:1.4;sets.push([a,0,len,w,(k%2?-0.13:0.13)]);}
    sets.forEach(([base,off,len,w,tilt])=>{const b=grp();
      const st=[[7.6,w*0.5,0.9,1.2],[7.6+(len-7.6)*0.35,w,1.2,1.9],[7.6+(len-7.6)*0.75,w*0.75,0.8,1.2],[len,0,0,0]];b.add(facet(st,ringV8,crystal,2));
      const vein=neon(st.slice(0,3).map(a=>new THREE.Vector3(a[0]+0.15,0,a[2]*0.55+0.03)).concat([new THREE.Vector3(len-0.7,0,0.06)]),false,0.035,0.24,G1,0.75);b.add(vein);
      
      const pv=grp();pv.add(b);b.rotation.y=-tilt;pv.rotation.z=base+off;pv.position.z=0.2;g.add(pv);b.userData.len=len;blades.push(b);});g.userData.blades=blades;add('CrystalBlade',g);}
  /* 05 구체 노드 — 대(링 위 ×8) · 소(바깥 ×8) 미러 구 + 가시 왕관 */
  {const g=grp();const nodes=[];const node=(r,a,sz,z)=>{const n=grp();const [x,y]=polar(r,a);n.position.set(x,y,z);n.add(M(new THREE.IcosahedronGeometry(sz,1),gem));
      const ring=M(new THREE.TorusGeometry(sz*1.08,sz*0.14,6,24),dark2);n.add(ring);for(let k=0;k<4;k++){const c=M(new THREE.ConeGeometry(sz*0.22,sz*0.9,4),dark2);const ca=k/4*TAU;c.position.set(Math.cos(ca)*sz*1.35,Math.sin(ca)*sz*1.35,0);c.rotation.z=ca-Math.PI/2;n.add(c);}
      const gm=M(new THREE.SphereGeometry(sz*0.35,10,8),G2);gm.position.z=sz*0.75;n.add(gm);g.add(n);nodes.push(n);};
    for(let i=0;i<8;i++){node(9.0,i/8*TAU+TAU/16,1.35,2.4);node(12.4,i/8*TAU+TAU/16,0.85,0.8);}
    /* v2: 좌우 끝 대형 가시 노드 + 사이 소형 노드 */
    for(const s of [1,-1]){node(16.4,s*Math.PI/2,1.15,0.9);node(14.6,s*Math.PI/2+0.42,0.6,1.2);node(14.6,s*Math.PI/2-0.42,0.6,1.2);}g.userData.nodes=nodes;add('SphereNode',g);}
  /* 06 연결 암 ×8 — 링에서 바깥 소형 노드로 */
  {const g=grp();for(let i=0;i<8;i++){const a=i/8*TAU+TAU/16;const arm=grp();const bar=M(new THREE.BoxGeometry(2.6,0.5,0.5),dark2);bar.position.x=10.7;arm.add(bar);const bk=M(new THREE.BoxGeometry(0.8,1.2,0.9),dark2);bk.position.x=9.6;arm.add(bk);
      const ln=neon([new THREE.Vector3(9.6,0,0.3),new THREE.Vector3(11.8,0,0.3)],false,0.04,0.22,G2,0.8);arm.add(ln);arm.rotation.z=a;arm.position.z=0.4;g.add(arm);}
    for(const s of [1,-1]){const arm=grp();const bar=M(new THREE.BoxGeometry(7.6,0.55,0.55),dark2);bar.position.x=12.0;arm.add(bar);const ln=neon([new THREE.Vector3(8.6,0,0.32),new THREE.Vector3(15.4,0,0.32)],false,0.04,0.22,G2,0.8);arm.add(ln);
      const sp=M(new THREE.ConeGeometry(0.35,3.2,4),dark2);sp.rotation.z=-Math.PI/2;sp.position.x=18.6;arm.add(sp);arm.rotation.z=s*Math.PI/2;arm.position.z=0.5;g.add(arm);}
    add('ConnectorArm',g);}
  /* 07 상부 스파이어 — 앞(+X)으로 뻗는 크리스탈 첨탑 */
  {const g=grp();g.add(facet([[7.4,1.6,1.2,0.8],[11,1.3,1.0,0.6],[15,0.8,0.6,0.4],[19,0,0,0]],ringD8,crystal,2));g.add(neon([new THREE.Vector3(7.6,0,1.23),new THREE.Vector3(11,0,1.03),new THREE.Vector3(15,0,0.63),new THREE.Vector3(18.3,0,0.1)],false,0.045,0.3,G1,0.85));
    [1,-1].forEach(s=>{const side=loft([[7.6,0.7,0.6,0.4],[11,0.5,0.45,0.3],[14,0,0,0]],dark2);side.position.y=s*1.9;side.rotation.z=-s*0.08;g.add(side);});
    [1,-1].forEach(d=>{const fin=facet([[8,0.3,0.9,0.9],[11.5,0.25,0.7,0.7],[14,0,0,0]],ringD8,crystal2,-1);fin.rotation.x=Math.PI/2;fin.position.z=d*1.2;fin.scale.y=d;g.add(fin);});g.position.z=0.3;add('UpperSpire',g);}
  /* 08 하부 스피어 — 뒤(−X)로 뻗는 창 + 갈래 */
  {const g=grp();const sp=facet([[7.4,1.5,1.0,1.0],[11,1.2,0.8,0.8],[14.5,0.7,0.5,0.5],[17.5,0,0,0]],ringD8,crystal,2);g.add(sp);g.add(neon([new THREE.Vector3(7.6,0,1.03),new THREE.Vector3(11,0,0.83),new THREE.Vector3(14.5,0,0.53),new THREE.Vector3(16.9,0,0.08)],false,0.04,0.28,G1,0.85));
    [1,-1].forEach(s=>{const pr=loft([[7.6,0.6,0.5,0.5],[10.5,0.45,0.35,0.35],[13,0,0,0]],dark2);pr.position.y=s*1.6;pr.rotation.z=s*0.18;g.add(pr);});
    g.rotation.z=Math.PI;g.rotation.y=0.12;g.position.z=0.1;add('LowerSpear',g);}

  /* 09 하부 크리스탈 부채 — 위로 솟는 결정 없음. 바깥 층일수록 낮은 각도(수평에 가깝게) → 안쪽으로 갈수록 가파르게 → 중앙은 수직 아래
        옆·앞에서 보면 층층이 부드럽게 모이는 ▽ 실루엣 */
  {const g=grp();
    let sd=7;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};
    const cr=(r,az,z0,pitch,len,w,glowOn,bulge)=>{len*=0.62;const c=grp();const bp=bulge||0.3;const fl=0.8+rnd()*0.4;const st=[[0,w,w*0.8*fl,w*0.8*fl],[len*bp,w*1.15,w*fl,w*fl],[len*(bp+0.4),w*0.7,w*0.6*fl,w*0.6*fl],[len,0,0,0]];c.add(facet(st,ringD8,crystal,2));
      if(glowOn)c.add(neon(st.slice(0,3).map(a=>new THREE.Vector3(a[0]+len*0.03,0,a[2]+0.02)).concat([new THREE.Vector3(len*0.94,0,0.04)]),false,0.03,0.2,G1,0.7));
      
      c.rotation.y=pitch;c.position.set(r,0,z0);const A=grp();A.add(c);A.rotation.z=az;g.add(A);};
    const D=Math.PI/180;
    /* [반지름, 시작 높이, 아래 각도, 길이, 굵기, 개수, 방위 오프셋] */
    /* v4: 링 측면 가림 — 링 높이에서 거의 수평으로 나오는 촘촘한 결정 2층 */
    [[8.0,0.9,3,7.6,0.7,24,0.25],[8.3,-0.2,8,8.2,0.68,20,0.7],[8.6,-1.2,14,6.4,0.55,16,0.5],[7.0,-1.5,28,7.4,0.65,12,0],[5.4,-1.7,44,8.4,0.75,10,0.5],[3.6,-1.8,60,9.6,0.85,8,0],[1.9,-1.8,75,10.8,0.95,6,0.5]]
      .forEach(([r,z0,deg,len,w,n,off],li)=>{for(let i=0;i<n;i++){
        /* 길이·굵기·각도·방위 불규칙 — 큰 결정 사이에 작은 결정이 섞이도록 */
        const big=rnd()<0.35,tiny=!big&&rnd()<0.3;const lk=big?1.25+rnd()*0.35:tiny?0.45+rnd()*0.25:0.75+rnd()*0.35;const wk=big?1.25+rnd()*0.3:tiny?0.55+rnd()*0.2:0.8+rnd()*0.3;
        const az=(i+off+(rnd()-0.5)*0.55)/n*TAU;const pd=deg+(rnd()-0.5)*14;
        cr(r+(rnd()-0.5)*0.8,az,z0+(rnd()-0.5)*0.4,pd*D,len*lk,w*wk,(i+li)%2===0&&!tiny,0.18+rnd()*0.22);
        if(rnd()<0.4){cr(r+0.6,az+(rnd()<0.5?1:-1)*(0.18+rnd()*0.12),z0+0.2,(pd-8+rnd()*6)*D,len*(0.3+rnd()*0.25),w*(0.4+rnd()*0.2),false,0.25);}}});
    cr(0,0,-1.6,90*D,13.4,1.3,1,0.22);cr(0.9,0.6,-1.6,80*D,8.2,0.75,0,0.3);cr(0.9,3.5,-1.6,78*D,6.4,0.6,0,0.3);
    add('VerticalCrystal',g);}

  function update(t){UT.value=t;
    P.InnerFrame.rotation.z=-t*0.25;
    }
  /* ---- 3단계 재질 마감: 금속 = 얼룩·긁힘·거칠기 변화 / 크리스탈 = 면마다 반짝임 차이 + 내부 탁함 ---- */
  const NZ='varying vec3 vLp;float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}\nfloat fbm(vec3 p){return 0.5*vn(p)+0.3*vn(p*2.1)+0.2*vn(p*4.3);}\n';
  const FIN={dk:{col:'{float n=fbm(vLp*1.6);float sc=smoothstep(0.9,0.98,vn(vec3(vLp.x*7.,vLp.y*7.,vLp.z*0.7)+vec3(vLp.y*3.)));diffuseColor.rgb*=0.68+0.55*n;diffuseColor.rgb+=vec3(0.07,0.07,0.09)*sc;}',
               rgh:'roughnessFactor=clamp(roughnessFactor+(fbm(vLp*1.6)-0.5)*0.35,0.05,1.0);',out:''},
             cr:{col:'',rgh:'',out:'{float h=fract(sin(dot(floor(normal*5.0+0.5),vec3(12.9898,78.233,37.719)))*43758.5453);outgoingLight*=0.8+0.4*h;outgoingLight+='+(ally?'vec3(0.6,0.6,0.8)':'vec3(0.5,0.45,0.85)')+'*0.05*fbm(vLp*0.8);}'}};
  function applyFX(){const seen=new Set();root.traverse(o=>{if(!o.material||seen.has(o.material))return;const m=o.material;seen.add(m);const iri=m.userData.iri,fk=m.userData.fin;if(!iri&&!fk)return;const F=FIN[fk]||{col:'',rgh:'',out:''};
    m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.vertexShader='varying vec3 vLp;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLp=position;');
      let f='uniform float uT;\n'+NZ+sh.fragmentShader;if(F.col)f=f.replace('#include <color_fragment>','#include <color_fragment>\n'+F.col);if(F.rgh)f=f.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n'+F.rgh);
      let tail=F.out;if(iri){tail+='{vec3 vd=normalize(vViewPosition);float f=1.0-abs(dot(normal,vd));f*=f;float ph=f*1.6+dot(normal,vec3(0.31,0.52,0.23))*0.9+uT*0.05;'+
        (ally?'vec3 ir=0.5+0.5*cos(6.2831*(ph+vec3(0.0,0.33,0.67)));':'vec3 ir=mix(vec3(0.5,0.36,1.0),vec3(0.72,0.95,1.0),0.5+0.5*sin(6.2831*ph));')+
        'outgoingLight+=ir*(0.08+0.6*f)*'+iri[0].toFixed(2)+';outgoingLight=min(outgoingLight,vec3('+iri[1].toFixed(2)+'));}';}
      sh.fragmentShader=f.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',tail+'\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');};
    m.customProgramCacheKey=()=>'b03fx'+(ally?1:0)+(fk||'')+(iri?iri.join('_'):'');});}
  applyFX();
  /* ---- 페이즈 상태 (적 보스): 1 기본 → 2 발광↑ → 3 긴 크리스탈 블레이드 6장 이탈 → 4 렌즈 파괴·다이아몬드 심지 노출 ---- */
  const baseI=glows.map(m=>m.emissiveIntensity);
  function setPhase(p){if(!ally){const k=[1,1,1.35,1.7,2.2][p]||1;glows.forEach((m,i)=>{m.emissiveIntensity=baseI[i]*k;});}
    P.CrystalBlade.userData.blades.forEach(b=>{if(b.userData.len>16)b.visible=!(p>=3);});
    const C=P.CoreLens.userData;C.sph.visible=p<4;const w=C.dia.userData.wick;const ws=p>=4?2.6:1;w.scale.set(1,ws,ws);}
  return{root,P,update,glows,setPhase};}

export function buildB03FX(THREE,opt){opt=opt||{};const ally=!!opt.ally;const TAU=Math.PI*2;
  const UT={value:0};
  const M=(g,m)=>new THREE.Mesh(g,m);const grp=n=>{const g=new THREE.Group();g.name=n||'';return g;};
  /* 재질 */
  const crystal=new THREE.MeshStandardMaterial({color:0xeef0ff,metalness:0.92,roughness:0.16,flatShading:true});
  const crystal2=new THREE.MeshStandardMaterial({color:0xb4b8e8,metalness:0.92,roughness:0.2,flatShading:true});
  const dark=new THREE.MeshStandardMaterial({color:0x22222c,metalness:0.9,roughness:0.34,flatShading:true});
  const obs=new THREE.MeshStandardMaterial({color:0x030305,metalness:0.6,roughness:0.35,flatShading:true,envMapIntensity:0.12});
  const lens=new THREE.MeshStandardMaterial({color:0x7078a8,metalness:0.3,roughness:0.05,transparent:true,opacity:0.2,depthWrite:false,envMapIntensity:0.3});
  const RSC=opt.rsc||0.35;/* 아군: 한 물체 안에서 위치마다 색이 달라 '동시에' 무지개가 보이게 */
  const rainbowize=m=>{m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.vertexShader='varying vec3 vRp;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvRp=(instanceMatrix*vec4(position,1.)).xyz;\n#else\nvRp=position;\n#endif');
    sh.fragmentShader='uniform float uT;varying vec3 vRp;\nvec3 hue(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance=(0.25+0.75*hue(fract(atan(vRp.y,vRp.x)/6.2831+length(vRp)*'+RSC.toFixed(3)+'-uT*0.18)))*max(emissive.r,max(emissive.g,emissive.b));');};m.customProgramCacheKey=()=>'rbw'+RSC;};
  const glows=[];const glow=(k,i)=>{const m=new THREE.MeshStandardMaterial({color:0x000000,emissive:ally?0xffffff:0x9a6bff,emissiveIntensity:i||2.4,toneMapped:false});if(ally)rainbowize(m);m.userData.k=k||0;glows.push(m);return m;};
  const G1=glow(0),G2=glow(1,2.0),GH=glow(2,3.4);
  /* ---- 네온 발광선: 가는 밝은 심(튜브) + 바깥 부드러운 빛 껍질(보는 각도와 무관하게 가운데가 진하고 가장자리로 사라짐) ---- */
  const shells=[];const ECOL=0xa880ff;
  const shCache={};function shellMat(k,col,fresh){const key=(k||1)+'|'+(col||0);if(!fresh&&shCache[key])return shCache[key];const m=new THREE.ShaderMaterial({uniforms:{c:{value:new THREE.Color(col||ECOL)},k:{value:k||1},uT:UT,rb:{value:ally&&!col?1:0}},
    vertexShader:'varying vec3 vN;varying vec3 vV;varying vec3 vRp;void main(){vRp=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 c;uniform float k;uniform float uT;uniform float rb;varying vec3 vN;varying vec3 vV;varying vec3 vRp;vec3 hue(float h){return clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}void main(){float d=abs(dot(normalize(vN),normalize(vV)));float a=pow(max(d,0.),2.4)*k;vec3 col=mix(c,hue(fract(atan(vRp.y,vRp.x)/6.2831+length(vRp)*'+RSC.toFixed(3)+'-uT*0.18)),rb);gl_FragColor=vec4(col*a*1.5,a);}',
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});m.userData.k=shells.length;shells.push(m);if(!fresh)shCache[key]=m;return m;}
  class Poly extends THREE.Curve{constructor(p,closed){super();this.p=closed?p.concat([p[0]]):p;this.L=[0];for(let i=1;i<this.p.length;i++)this.L.push(this.L[i-1]+this.p[i].distanceTo(this.p[i-1]));}
    getPoint(t,o){o=o||new THREE.Vector3();const L=this.L,T=t*L[L.length-1];let i=1;while(i<L.length-1&&L[i]<T)i++;const k=(T-L[i-1])/Math.max(1e-6,L[i]-L[i-1]);return o.lerpVectors(this.p[i-1],this.p[i],Math.min(1,Math.max(0,k)));}}
  const cornerSoft=(pts,closed,r)=>{/* 모서리를 살짝 깎아 튜브 꺾임이 매끈하게 */const o=[];const n=pts.length;for(let i=0;i<n;i++){const p=pts[i];if(!closed&&(i===0||i===n-1)){o.push(p);continue;}const a=pts[(i-1+n)%n],b=pts[(i+1)%n];
      o.push(p.clone().lerp(a,r/Math.max(r,p.distanceTo(a))));o.push(p.clone().lerp(b,r/Math.max(r,p.distanceTo(b))));}return o;};
  function neon(pts,closed,rc,rg,core,k,soft){const P=soft?cornerSoft(pts,closed,soft):pts;const cv=new Poly(P,closed);const L=cv.L[cv.L.length-1];const seg=Math.max(8,Math.min(160,Math.round(L*10)));
    const g=grp('neon');g.add(M(new THREE.TubeGeometry(cv,seg,rc,6,false),core||G1));const sh=M(new THREE.TubeGeometry(cv,seg,rg,10,false),shellMat(k));sh.renderOrder=5;g.add(sh);g.userData.shell=sh;return g;}
  const circ=(r,n,z)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*TAU;o.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z||0));}return o;};
  const white=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
  const gradTex=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=128;c.height=16;const x=c.getContext('2d');const gr=x.createLinearGradient(0,0,128,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(255,255,255,1)');x.fillStyle=gr;x.fillRect(0,0,128,16);const gv=x.createLinearGradient(0,0,0,16);gv.addColorStop(0,'rgba(0,0,0,1)');gv.addColorStop(0.5,'rgba(0,0,0,0)');gv.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=gv;x.fillRect(0,0,128,16);return new THREE.CanvasTexture(c);})();
  /* 부드러운 빛 덩어리(스프라이트) — 선 대신 '빛'으로 표현 */
  const glowTex=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.18,'rgba(255,255,255,0.75)');g.addColorStop(0.45,'rgba(255,255,255,0.22)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
  const rbTex=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
    if(x.createConicGradient){const cg=x.createConicGradient(0,64,64);for(let i=0;i<=6;i++)cg.addColorStop(i/6,'hsl('+(i*60)+',100%,62%)');x.fillStyle=cg;}else x.fillStyle='#fff';x.fillRect(0,0,128,128);
    x.globalCompositeOperation='destination-in';x.drawImage(glowTex.image,0,0);const g=x.createRadialGradient(64,64,0,64,64,22);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.globalCompositeOperation='lighter';x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
  const rbTail=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');const gv=x.createLinearGradient(0,0,0,64);for(let i=0;i<=6;i++)gv.addColorStop(i/6,'hsl('+(i*50)+',100%,60%)');x.fillStyle=gv;x.fillRect(0,0,128,64);
    x.globalCompositeOperation='destination-in';const gh=x.createLinearGradient(0,0,128,0);gh.addColorStop(0,'rgba(0,0,0,0)');gh.addColorStop(1,'rgba(0,0,0,1)');x.fillStyle=gh;x.fillRect(0,0,128,64);return new THREE.CanvasTexture(c);})();
  const rbBand=(()=>{if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');const gv=x.createLinearGradient(0,0,0,256);for(let i=0;i<=6;i++)gv.addColorStop(i/6,'hsl('+(i*55)+',100%,62%)');x.fillStyle=gv;x.fillRect(0,0,64,256);
    x.globalCompositeOperation='destination-in';const gh=x.createLinearGradient(0,0,64,0);gh.addColorStop(0,'rgba(0,0,0,0)');gh.addColorStop(0.5,'rgba(0,0,0,1)');gh.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gh;x.fillRect(0,0,64,256);return new THREE.CanvasTexture(c);})();
  const sprites=[];const halo=(size,k,col,thru)=>{const rb=ally&&!col;const m=new THREE.SpriteMaterial({map:rb?rbTex:glowTex,color:rb?0xffffff:(col||0xa880ff),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:!thru,opacity:k==null?0.9:k});const sp=new THREE.Sprite(m);sp.scale.setScalar(size);sp.renderOrder=7;sp.userData.k=sprites.length;sp.userData.rb=rb;sprites.push(sp);return sp;};
  const addM=(c,o,tex)=>new THREE.MeshBasicMaterial({color:c,map:tex||null,transparent:true,opacity:o==null?0.8:o,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  /* 크리스탈 박막광 (적 = 차가운 보라·청 / 아군 = 무지개) + 면 반짝임 */
  [crystal,crystal2,lens].forEach((m,i)=>{const k=(ally?[1.15,0.9,0.6]:[0.55,0.4,0.3])[i],cap=(ally?[1.9,1.8,1.6]:[1.6,1.5,1.4])[i];m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.fragmentShader='uniform float uT;\n'+sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
    '{float h=fract(sin(dot(floor(normal*5.0+0.5),vec3(12.9898,78.233,37.719)))*43758.5453);outgoingLight*=0.8+0.4*h;vec3 vd=normalize(vViewPosition);float f=1.0-abs(dot(normal,vd));f*=f;float ph=f*1.6+dot(normal,vec3(0.31,0.52,0.23))*0.9+uT*0.05;'+
    (ally?'vec3 ir=0.5+0.5*cos(6.2831*(ph+vec3(0.0,0.33,0.67)));':'vec3 ir=mix(vec3(0.5,0.36,1.0),vec3(0.72,0.95,1.0),0.5+0.5*sin(6.2831*ph));')+
    'outgoingLight+=ir*(0.08+0.6*f)*'+k+';outgoingLight=min(outgoingLight,vec3('+cap+'));}\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');};m.customProgramCacheKey=()=>'b03fxo'+(ally?1:0)+i;});
  /* 다면 크리스탈 로프트 (보스와 같은 방식: 8각 단면 · 2회 분할 · 꼭짓점 흔들림) */
  let fsd=5;const fr=()=>{fsd=(fsd*16807)%2147483647;return fsd/2147483647;};
  const ringD8=a=>{const w=a[1],u=a[2],d=a[3]!=null?a[3]:a[2];const o=[];for(let k=0;k<8;k++){const t=k*Math.PI/4;const sc=k%2?0.84:1;const sn=Math.sin(t);o.push([w*Math.cos(t)*sc,(sn>=0?u:d)*sn*sc]);}return o;};
  const ringV8=a=>{const w=a[1],u=a[2],d=a[3];return[[w,u*0.25],[w*0.55,u*0.45],[0,u*0.55],[-w*0.55,u*0.45],[-w,u*0.25],[-w*0.62,-d*0.42],[0,-d],[w*0.62,-d*0.42]];};
  function facet(st,ring,mat,top){let S=st.map(a=>ring(a).map(p=>[a[0],p[0],p[1]]));
    [1.04,1.015].forEach(bl=>{const R=S;S=[];for(let i=0;i<R.length;i++){S.push(R[i]);if(i<R.length-1){const A=R[i],B=R[i+1];S.push(A.map((p,k)=>{const q=B[k];const b=k===top?1:bl;return[(p[0]+q[0])/2,(p[1]+q[1])/2*b,(p[2]+q[2])/2*b];}));}}});
    for(let i=1;i<S.length-1;i++){const sz=Math.max(...S[i].map(p=>Math.hypot(p[1],p[2])))||0;S[i].forEach((p,k)=>{if(k===top)return;const j=0.075*sz;p[1]+=(fr()-0.5)*j;p[2]+=(fr()-0.5)*j;p[0]+=(fr()-0.5)*j*0.8;});}
    const pos=[];const n=S[0].length;for(let i=0;i<S.length-1;i++){const A=S[i],B=S[i+1];for(let k=0;k<n;k++){const a0=A[k],a1=A[(k+1)%n],b0=B[k],b1=B[(k+1)%n];
      if((i+k)%2)pos.push(...a0,...a1,...b0,...a1,...b1,...b0);else pos.push(...a0,...a1,...b1,...a0,...b1,...b0);}}
    const F=S[0];for(let k=1;k<n-1;k++)pos.push(...F[0],...F[k+1],...F[k]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return M(g,mat);}
  /* 양끝이 뾰족한 결정 (중앙 굵기 w, 길이 L, X축) */
  const shard=(L,w,mat,h)=>facet([[-L*0.5,0,0,0],[-L*0.18,w*0.8,(h||w)*0.75,(h||w)*0.75],[L*0.05,w,h||w,h||w],[L*0.5,0,0,0]],ringD8,mat||crystal,-1);
  const O={};const anim=[];

  /* 01 보조 크리스탈 거울 — 보스 둘레를 공전, 크리티컬 반사로 1장씩 깨야 함. 면마다 반사면 12개(기존 6개의 2배) */
  {const g=grp('aux');const hex=new THREE.CylinderGeometry(1.0,1.0,0.22,6);const p=M(hex,crystal);g.add(p);
    const gem=(s)=>{const pos=[];const ap=[0,s*0.42,0];const P=[];for(let k=0;k<12;k++){const a=k*Math.PI/6;const r=k%2?0.866*0.99:0.99;P.push([Math.cos(a)*r,s*(0.11+(k%2?0.07:0)),Math.sin(a)*r]);}
      for(let k=0;k<12;k++){const a=P[k],b=P[(k+1)%12];if(s>0)pos.push(...a,...ap,...b);else pos.push(...a,...b,...ap);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();return M(geo,crystal2);};
    g.add(gem(1));g.add(gem(-1));
    const fr6=M(new THREE.TorusGeometry(1.06,0.1,4,6),dark);fr6.rotation.x=Math.PI/2;g.add(fr6);const gl=neon(circ(1.16,6,0),true,0.022,0.13,G1,0.9,0.08);gl.rotation.x=Math.PI/2;g.add(gl);
    for(let k=0;k<6;k++){const a=k/6*TAU;const sp=M(new THREE.ConeGeometry(0.08,0.4,4),dark);sp.position.set(Math.cos(a)*1.25,0,Math.sin(a)*1.25);sp.rotation.z=-Math.PI/2;sp.rotation.y=-a;g.add(sp);}
    const W=grp('aux');g.rotation.x=Math.PI/2;W.add(g);O.aux=W;anim.push(t=>{g.rotation.y=t*0.8;});}
  /* 02 반사 드론 — 보스를 줄인 소형 기체 (렌즈·검은 다이아·X자 블레이드) */
  {const g=grp('drone');const sp=M(new THREE.SphereGeometry(0.55,32,20),lens);sp.position.z=0.25;sp.renderOrder=3;g.add(sp);
    const base=M(new THREE.CylinderGeometry(0.62,0.7,0.35,24),dark);base.rotation.x=Math.PI/2;g.add(base);
    const d=facet([[-0.6,0,0,0],[0,0.22,0.2,0.2],[0.6,0,0,0]],ringD8,obs,-1);d.position.z=0.3;g.add(d);
    const ring=M(new THREE.TorusGeometry(0.82,0.12,6,32),dark);g.add(ring);const rg=neon(circ(0.82,48,0),true,0.022,0.14,G2,0.9);rg.position.z=0.13;g.add(rg);
    for(let k=0;k<4;k++){const a=k/4*TAU+TAU/8;const b=facet([[0.75,0.16,0.22,0.3],[1.3,0.24,0.3,0.42],[2.2,0,0,0]],ringV8,crystal,2);b.rotation.z=a;g.add(b);}
    for(let k=0;k<4;k++){const a=k/4*TAU;const b=facet([[0.75,0.1,0.15,0.2],[1.6,0,0,0]],ringV8,crystal2,2);b.rotation.z=a;g.add(b);}
    O.drone=g;anim.push(t=>{g.rotation.z=t*0.6;});}
  /* 03~08 스킬 물체(미러 볼트·프리즘 오브·미러 노드·미러 마인·미러 게이트·대형 거울)는 뺌 — 스킬은 새로 만듦 (사용자 2026-11-03) */

  function update(t){UT.value=t;anim.forEach(f=>f(t));sprites.forEach(sp=>{if(sp.userData.rb)sp.material.rotation=-t*1.2+sp.userData.k;});}
  return{O,update,glows,neon,shellMat,shard,halo,rbTail,gradTex,mats:{crystal,crystal2,dark,glow:G1,glowH:GH,white,addM,gradTex}};}
