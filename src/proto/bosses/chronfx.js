/* 크로나크(2스테이지 보스) 효과 — 사용자가 예전 채팅에서 만든 코드(chron_fx.js) 그대로 + 휴대폰 고장 방지(음수 거듭제곱 막음, 2026-11-03)
   원본 모델 위에 장갑 무늬·새어 나오는 빛·아래 장갑 층·옆벽 타일·가시·엔진 불꽃·터빈·흐르는 에너지를 덧입힘. 그리는 횟수 줄이기는 chronarch.js에서 */
export function enhanceChron(THREE,root,opt){opt=opt||{};
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);const M=(g,m)=>new THREE.Mesh(g,m);const G=n=>{const g=new THREE.Group();g.name=n||'';return g;};
  const U={t:{value:0},ally:{value:opt.ally?1:0},pulse:{value:0}};
  root.updateMatrixWorld(true);
  /* ---------- GLSL 공용 ---------- */
  const NOISE='float h3(vec3 p){p=fract(p*0.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}vec3 hue(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}\n'+
    'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n'+
    /* 다양한 모양 패널 타일: 벽돌 어긋남 + 2단계 분할 + 대각(삼각) · 쉐브론 · 액자 */
    'vec3 panelT(vec2 p){float row=floor(p.y);p.x+=h21(vec2(row,7.))*0.73;vec2 c=floor(p),f=fract(p);float s=1.;float h=h21(c);'+
    'if(h>0.28){vec2 q=floor(f*2.);f=fract(f*2.);c=c*2.+q;s=0.5;h=h21(c+13.1);if(h>0.6){q=floor(f*2.);f=fract(f*2.);c=c*2.+q;s=0.25;}}'+
    'float d=min(min(f.x,1.-f.x),min(f.y,1.-f.y));float k=h21(c+5.3);float sub=0.;'+
    'if(k>0.76){float dd=(k>0.88?abs(f.x-f.y):abs(f.x+f.y-1.))*0.7071;d=min(d,dd);sub=(k>0.88?step(f.y,f.x):step(1.,f.x+f.y));}'+
    'else if(k>0.6){float v=f.y-abs(f.x-.5)*0.9;float dd=min(abs(v-0.12),abs(v-0.5))*0.74;d=min(d,dd);sub=step(0.12,v)+step(0.5,v);}'+
    'else if(k>0.48){float m=max(abs(f.x-.5),abs(f.y-.5));d=min(d,abs(m-0.3));sub=step(m,0.3);}'+
    'return vec3(d*s,h21(c+sub*3.7+0.3),s);}\n'+
    /* 삼각 타일 (정삼각 격자) */
    'vec3 triT(vec2 p){vec2 s=vec2(p.x-p.y*0.57735,p.y*1.1547);vec2 c=floor(s),f=fract(s);float up=step(1.,f.x+f.y);'+
    'float d=up<0.5?min(min(f.x,f.y),1.-f.x-f.y):min(min(1.-f.x,1.-f.y),f.x+f.y-1.);return vec3(d*0.866,h21(c*1.7+up*9.1),1.);}\n';
  /* ---------- 장갑 재질: 진주빛 박막 + (선택) 타일 무늬(홈 깊이 법선 요철 · 타일마다 색/거칠기 차이 · 드문 발광 타일) ---------- */
  const mats=[];
  function armor(base,o){o=o||{};const k=o.k==null?0.32:o.k,pat=o.pat||0;const uSc={value:o.sc||3};
    const m=new THREE.MeshPhysicalMaterial({color:base,metalness:o.metal==null?0.82:o.metal,roughness:o.rough||0.34,clearcoat:0.35,clearcoatRoughness:0.22,side:THREE.DoubleSide,envMapIntensity:o.env||0.32});
    m.onBeforeCompile=sh=>{sh.uniforms.uT=U.t;sh.uniforms.uAlly=U.ally;sh.uniforms.uSc=uSc;
      sh.vertexShader='varying vec3 vWP;varying vec3 vOP;varying vec3 vON;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n{vec4 wp=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwp=instanceMatrix*wp;\n#endif\nvWP=(modelMatrix*wp).xyz;}vOP=transformed;vON=objectNormal;');
      sh.fragmentShader='#define PAT '+pat+'\n#define LEAKON '+(o.leak?1:0)+'\n#define LEAK '+(o.leak||0).toFixed(2)+'\nuniform float uT;uniform float uAlly;uniform float uSc;varying vec3 vWP;varying vec3 vOP;varying vec3 vON;float gH=0.,gG=0.,gId=0.,gLit=0.,gD=1.,gFw=0.;\n'+NOISE+sh.fragmentShader
        .replace('#include <color_fragment>','#include <color_fragment>\n{float n=vn(vOP*3.)*0.6+vn(vOP*9.)*0.4;diffuseColor.rgb*=0.78+0.36*n;\n#if PAT>0\n'+
          'vec3 an=abs(vON);vec2 p=an.y>max(an.x,an.z)?vOP.xz:(an.x>an.z?vOP.zy:vOP.xy);p*=uSc;\n#if PAT==1\nvec3 T=panelT(p);\n#else\nvec3 T=triT(p);\n#endif\n'+
          'float dW=T.x/uSc;float fw=max(fwidth(dW),1e-5);gD=dW;gFw=fw;float fd=smoothstep(3.5,9.,(T.z/uSc)/fw);gG=(1.-smoothstep(0.,max(fw*1.3,0.003),dW))*fd;gH=(smoothstep(0.,max(0.012,fw*3.),dW)*0.005+T.y*0.0012)*fd;gId=mix(0.5,T.y,fd);'+
          'diffuseColor.rgb*=(0.9+0.18*gId)*(1.-0.6*gG);gLit=step(PAT==1?0.975:0.994,fract(T.y*7.13))*fd*step(T.z,0.3);\n#endif\n}')
        .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n{roughnessFactor=clamp(roughnessFactor*(0.72+0.56*vn(vOP*6.))+gG*0.45+(gId-.5)*0.16,0.06,1.);}')
        .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n#if PAT>0\n{float qHx=dFdx(gH),qHy=dFdy(gH);vec3 qSx=dFdx(-vViewPosition),qSy=dFdy(-vViewPosition);vec3 qR1=cross(qSy,normal),qR2=cross(normal,qSx);float qDet=dot(qSx,qR1);vec3 qGr=sign(qDet)*(qHx*qR1+qHy*qR2);normal=normalize(abs(qDet)*normal-qGr);}\n#endif\n')
        .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{vec3 vd=normalize(cameraPosition-vWP);float fr=1.-abs(dot(normalize(vNormal),normalize((viewMatrix*vec4(vd,0.)).xyz)));float th=fr*1.4+vn(vOP*1.6)*0.6+gId*0.25+uT*0.03;'+
          'vec3 film=mix(mix(vec3(0.55,0.32,1.0),vec3(0.25,0.85,0.95),smoothstep(0.2,0.6,fract(th))),vec3(1.0,0.78,0.5),smoothstep(0.65,0.95,fract(th)));film=mix(film,hue(fract(th*0.8)),uAlly);'+
          'totalEmissiveRadiance+=film*pow(max(fr,0.),2.2)*'+k.toFixed(2)+'*(1.-gG);\n#if PAT>0\n{vec3 lc=mix(vec3(0.5,0.22,1.),hue(fract(gId*3.+uT*0.2)),uAlly);totalEmissiveRadiance+=lc*gLit*(1.-gG)*(1.6+1.0*sin(uT*2.+gId*40.));}\n#if LEAKON==1\n{float wd=max(0.007,gFw*1.3);float mk=exp(-gD/wd)*(0.007/wd);float fl=0.55+0.45*sin(vWP.z*2.6+vWP.x*0.8+uT*2.2)+0.25*sin(vWP.z*7.-uT*5.);vec3 lk=mix(vec3(0.55,0.25,1.),hue(fract(vWP.z*0.15-uT*0.25)),uAlly);totalEmissiveRadiance+=lk*mk*fl*LEAK;}\n#endif\n\n#endif\n}');};
    m.customProgramCacheKey=()=>'arm'+pat+'_'+k+'_'+(o.leak||0);m.userData.uSc=uSc;mats.push(m);return m;}
  const graphite=new THREE.MeshStandardMaterial({color:0x14161c,metalness:0.85,roughness:0.38,side:THREE.DoubleSide});
  graphite.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP=position;');sh.fragmentShader='varying vec3 vOP;\n'+NOISE+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{diffuseColor.rgb*=0.75+0.5*vn(vOP*8.);}');};graphite.customProgramCacheKey=()=>'graph';
  const graphLeak=new THREE.MeshStandardMaterial({color:0x14161c,metalness:0.85,roughness:0.38,side:THREE.DoubleSide});
  graphLeak.onBeforeCompile=sh=>{sh.uniforms.uT=U.t;sh.uniforms.uAlly=U.ally;sh.vertexShader='varying vec3 vOP;varying vec3 vON;varying vec3 vWQ;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP=position;vON=normal;vWQ=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader='uniform float uT;uniform float uAlly;varying vec3 vOP;varying vec3 vON;varying vec3 vWQ;\n'+NOISE+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n{diffuseColor.rgb*=0.75+0.5*vn(vOP*8.);}')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float up=smoothstep(0.35,0.85,normalize(vON).y);float fl=0.55+0.45*sin(vWQ.z*2.6+vWQ.x*0.8+uT*2.2)+0.25*sin(vWQ.z*7.-uT*5.);vec3 lk=mix(vec3(0.55,0.25,1.),hue(fract(vWQ.z*0.15-uT*0.25)),uAlly);totalEmissiveRadiance+=lk*up*fl*0.55;}');};
  graphLeak.customProgramCacheKey=()=>'gleak';
  const tungsten=new THREE.MeshStandardMaterial({color:0x2a3038,metalness:0.92,roughness:0.28,side:THREE.DoubleSide});
  const bronze=new THREE.MeshStandardMaterial({color:0x8a6a3a,metalness:1,roughness:0.3});
  const hot=new THREE.MeshStandardMaterial({color:0,emissive:0xd8c8ff,emissiveIntensity:3.5,toneMapped:false});

  /* 흐르는 에너지 재질: uv.x 방향으로 빛 덩어리가 이동 · tube=true면 원통 속 플라스마처럼 가운데가 밝음 */
  const HUE='vec3 hue(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}';
  const flows=[];
  function flowMat(o){const m=new THREE.ShaderMaterial({uniforms:{uT:U.t,uAlly:U.ally,uPu:U.pulse,uC:{value:new THREE.Color(o.col||0x8a4dff)},uB:{value:o.base==null?0.35:o.base},uP:{value:o.pk||3.5},uR:{value:o.rep||3},uS:{value:o.spd||0.8},uO:{value:o.ofs||0},uW:{value:o.w||7}},
    vertexShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalMatrix*normal;gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform float uT,uAlly,uB,uP,uR,uS,uO,uW,uPu;uniform vec3 uC;varying vec2 vUv;varying vec3 vN;varying vec3 vV;'+HUE+
      'void main(){float s=vUv.x*uR-uT*uS+uO;float f=fract(s);float p=exp(-((f-0.5)*uW)*((f-0.5)*uW));float n=abs(dot(normalize(vN),normalize(vV)));float vol='+(o.tube?'0.25+0.75*pow(max(n,0.),1.4)':'1.')+';'+
      'vec3 c=mix(uC,hue(fract(vUv.x*0.6-uT*0.25+uO)),uAlly);float b=uB*(1.+0.5*uPu)+0.15*sin(uT*3.1+vUv.x*9.);vec3 col=c*(b+p*uP)*vol+vec3(1.,0.95,1.)*p*p*uP*0.45*vol;'+
      (o.add?'gl_FragColor=vec4(col*'+(o.op||1).toFixed(2)+',1.);':'gl_FragColor=vec4(col,1.);')+'}',
    transparent:!!o.add,blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:!o.add,side:THREE.DoubleSide});flows.push(m);return m;}

  /* ---------- 원본 정리: 숨김 · 조각 제거 ---------- */
  /* 연결 조각(Connected component) 분리 → 조건에 맞는 조각의 삼각형만 지움 */
  function comps(mesh){const geo=mesh.geometry;const p=geo.attributes.position;const idx=geo.index?Array.from(geo.index.array):[...Array(p.count).keys()];const key=i=>p.getX(i).toFixed(4)+','+p.getY(i).toFixed(4)+','+p.getZ(i).toFixed(4);
    const kid=new Map();const vk=new Int32Array(p.count);for(let i=0;i<p.count;i++){const k=key(i);if(!kid.has(k))kid.set(k,kid.size);vk[i]=kid.get(k);}
    const par=new Int32Array(kid.size).map((_,i)=>i);const f=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
    for(let t=0;t<idx.length;t+=3){const a=f(vk[idx[t]]),b=f(vk[idx[t+1]]),c=f(vk[idx[t+2]]);par[b]=a;par[f(c)]=a;}
    const C=new Map();const v=new THREE.Vector3();for(let t=0;t<idx.length;t+=3){const r=f(vk[idx[t]]);if(!C.has(r))C.set(r,{t:[],b:new THREE.Box3()});const c=C.get(r);c.t.push(t);for(let j=0;j<3;j++){v.fromBufferAttribute(p,idx[t+j]).applyMatrix4(mesh.matrixWorld);c.b.expandByPoint(v);}}
    return {idx,list:[...C.values()]};}
  function dropComps(mesh,drop){if(mesh.geometry.userData.dropped)return;const {idx,list}=comps(mesh);const keep=[];list.forEach(c=>{if(!drop(c))c.t.forEach(t=>keep.push(idx[t],idx[t+1],idx[t+2]));});
    mesh.geometry=mesh.geometry.clone();mesh.geometry.setIndex(keep);mesh.geometry.userData.dropped=1;}
  const HIDE=/(_armor_4|_armor_5|_armor_6|_armor_7|^vane_\d_5|^core_[1234]|^chassis_4|^vane_\d_4)$/;
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  meshes.forEach(o=>{const n=o.name;
    if(HIDE.test(n)){o.visible=false;return;}
    if(/_armor_1$/.test(n))dropComps(o,c=>c.t.length===320);          /* 9) 타원 홈 */
    if(/_armor_2$/.test(n))dropComps(o,c=>c.t.length===276);          /* 9) 타원 테두리 */
    if(/^chassis_5$/.test(n))dropComps(o,c=>c.b.max.z>-1.9);           /* 6) 링·버팀대 발광선 (뒤 노즐 4개는 남김) */
  });
  /* ---------- 재질 교체 ---------- */
  const ws=o=>{const s=new THREE.Vector3();o.getWorldScale(s);return Math.abs(s.x)||1;};
  const vio=new THREE.MeshStandardMaterial({color:0,emissive:0x8a4dff,emissiveIntensity:2.6,toneMapped:false});
  meshes.forEach(o=>{if(!o.visible)return;const n=(o.material&&o.material.name)||'';const s=ws(o);
    if(/Pearlescent/.test(n)){if(/^vane_/.test(o.name))o.material=armor(0x5d616e,{k:0.3,pat:2,sc:8.5*s});else o.material=armor(0x5d616e,{k:0.32,pat:1,sc:2.8*s,leak:/_armor_3$/.test(o.name)?2.1:0});}
    else if(/Polished bevels/.test(n))o.material=armor(0x6c7280,{k:0.18});
    else if(/Recessed graphite/.test(n))o.material=/_armor_1$/.test(o.name)?graphLeak:graphite;
    else if(/Mechanical tungsten/.test(n))o.material=tungsten;
    else if(/ruthenium/.test(n))o.material=bronze;
    else if(/Chronal violet/.test(n))o.material=vio;
    else if(/Ion filaments/.test(n))o.material=vio;
    else if(/Core singularity/.test(n))o.material=hot;});

  const P=G('ChronExtra');root.add(P);
  const port=root.getObjectByName('port_armor'),star=root.getObjectByName('starboard_armor');
  /* ---------- 아래 장갑 층 (원본 장갑을 뒤집어 아래로) ---------- */
  [port,star].forEach(arm=>{if(!arm)return;const low=arm.clone(true);low.name=arm.name+'_lower';low.scale.set(0.97,-0.75,0.97);low.position.y=-0.32;P.add(low);});

  /* ---------- 뿔 가장자리 윤곽 (각도 묶음): 바깥/안쪽 가장자리 반지름과 그 자리 장갑 아랫면 높이 ---------- */
  function edges(node){const pos=[];node.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;const ix=o.geometry.index?o.geometry.index.array:null;const v=new THREE.Vector3();const n=ix?ix.length:p.count;for(let i=0;i<n;i+=2){v.fromBufferAttribute(p,ix?ix[i]:i).applyMatrix4(o.matrixWorld);pos.push([Math.atan2(v.x,v.z),Math.hypot(v.x,v.z),v.y]);}});
    const N=110,bins=[...Array(N)].map(()=>[]);pos.forEach(q=>bins[Math.min(N-1,Math.floor((q[0]+Math.PI)/(2*Math.PI)*N))].push(q));
    const out=[];bins.forEach((b,i)=>{if(b.length<60)return;const rs=b.map(q=>q[1]).sort((x,y)=>x-y);const rO=rs[Math.floor(rs.length*0.985)],rI=rs[Math.floor(rs.length*0.015)];
      const yo=b.filter(q=>q[1]>rO-0.08).map(q=>q[2]).sort((x,y)=>x-y),yi=b.filter(q=>q[1]<rI+0.08).map(q=>q[2]).sort((x,y)=>x-y);
      out.push({a:(i+0.5)/N*2*Math.PI-Math.PI,rO,rI,ybO:yo[Math.floor(yo.length*0.04)],ybI:yi[Math.floor(yi.length*0.04)],ytO:yo[Math.floor(yo.length*0.96)],ytI:yi[Math.floor(yi.length*0.96)]});});
    out.sort((x,y)=>Math.abs(x.a)-Math.abs(y.a));/* 뿔 끝 → 뒤 */
    const sm=(k)=>{const v=out.map(e=>e[k]);out.forEach((e,i)=>{let s=0,w=0;for(let j=-2;j<=2;j++){const q=v[i+j];if(q!=null){s+=q;w++;}}e[k]=s/w;});};['rO','rI','ybO','ybI','ytO','ytI'].forEach(sm);
    return out;}
  const ED={port:port?edges(port):[],star:star?edges(star):[]};
  const at=(a,r,y)=>V(Math.sin(a)*r,y,Math.cos(a)*r);

  /* 공용 */
  const ADD=(c,op)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const radTex=(stops)=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv);};
  const softTex=radTex([[0,'rgba(255,255,255,1)'],[0.15,'rgba(235,220,255,.9)'],[0.42,'rgba(150,100,255,.3)'],[1,'rgba(80,30,255,0)']]);
  const rainbowAdd=[];
  const sprite=(c,s,op)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:softTex,color:c,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.setScalar(s);m.material.userData.c=c;rainbowAdd.push(m.material);return m;};
  const basisQ=(X,Y,Z)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X,Y,Z));

  /* =====================================================================
     8) 옆벽 세로 타일: 위 장갑 아랫면 ~ 아래 장갑 윗면 사이 · 바깥/안쪽 · 타일 틈으로 흐르는 빛
     ===================================================================== */
  const wallTile=armor(0x50545f,{k:0.22,rough:0.3});const wallRib=armor(0x2c2f38,{k:0.12,rough:0.4,metal:0.9});
  const ribbons=[];
  const tileGeo={t:{p:[],c:[]},r:{p:[],c:[]}};
  function wallBand(E,side,outer){if(E.length<4)return;
    let pts=E.map(e=>{const r=outer?e.rO*0.97-0.035:e.rI*0.97-0.012;const yb=outer?e.ybO:e.ybI,yt=outer?e.ytO:e.ytI;let hi=yb+0.03,lo=-0.75*yb-0.32-0.03;if(hi-lo<0.15){hi=yb+0.5*(yt-yb);lo=-0.75*hi-0.32;}
      hi+=0.025;lo=Math.max(lo-0.025,-0.75*yt-0.32+0.03);return {p:at(e.a,r,0),hi,lo,ok:e.rO-e.rI>0.3};});
    /* 높이 곡선을 넓게 한 번 더 고르게 (계단 방지) */
    ['hi','lo'].forEach(k=>{const v=pts.map(q=>q[k]);pts.forEach((q,i)=>{let s=0,w=0;for(let j=-4;j<=4;j++){const x=v[i+j];if(x!=null){const ww=5-Math.abs(j);s+=x*ww;w+=ww;}}q[k]=s/w;});});
    {let i0=pts.findIndex(q=>q.ok),i1=pts.length-1-[...pts].reverse().findIndex(q=>q.ok);if(i0<0)return;pts=pts.slice(i0,i1+1);}
    const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+pts[i].p.distanceTo(pts[i-1].p));const Ltot=cum[cum.length-1];
    const sample=s=>{let i=1;while(i<cum.length-1&&cum[i]<s)i++;const f=Math.max(0,Math.min(1,(s-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1])));const a=pts[i-1],b=pts[i];
      const t=b.p.clone().sub(a.p).setY(0).normalize();let nn=V(-t.z,0,t.x);const p=a.p.clone().lerp(b.p,f);if((nn.dot(p)>0)!==outer)nn.negate();let hi=a.hi+(b.hi-a.hi)*f,lo=a.lo+(b.lo-a.lo)*f;const tp=Math.min(1,Math.max(0,Math.min(s,Ltot-s))/0.55);const ee=tp*tp*(3-2*tp);const md=(hi+lo)/2;return {p,hi:md+(hi-md)*ee,lo:md+(lo-md)*ee,t,n:nn};};
    const step=0.07;const n=Math.floor(Ltot/step);
    /* 뒤판(빛 나는 벽) */
    const pos=[],uv=[],idx=[];for(let k=0;k<=n+1;k++){const s=Math.min(Ltot,k*step);const S=sample(s);const b=S.p.clone().addScaledVector(S.n,-0.006);
      pos.push(b.x,S.lo,b.z,b.x,S.hi,b.z);uv.push(s/1.8,0,s/1.8,1);if(k>0){const a=(k-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();
    const rb=M(bg,flowMat({col:0x7a40ff,base:0.3,pk:4,rep:1,spd:0.55,w:7,ofs:outer?0:0.37}));P.add(rb);ribbons.push(rb);
    /* 타일: 양 끝 높이를 벽 곡선에 그대로 맞춘 사다리꼴 판 (위·아래 장갑 속으로 파묻힘 → 들뜬 계단 없음) */
    for(let k=0;k<n;k++){const rib=k%7===3;const gap=rib?0.008:0.014;const A=sample(k*step+gap/2),B=sample((k+1)*step-gap/2);const d=rib?0.05:0.03+0.008*((k*37)%3);
      const q=(S,front,top)=>{const p=S.p.clone().addScaledVector(S.n,front?d:0);return [p.x,top?S.hi:S.lo,p.z];};
      const v={a0:q(A,0,0),a1:q(A,0,1),b0:q(B,0,0),b1:q(B,0,1),A0:q(A,1,0),A1:q(A,1,1),B0:q(B,1,0),B1:q(B,1,1)};
      const T=rib?tileGeo.r:tileGeo.t;const c=0.82+0.3*(((k*53)%7)/7);
      const quad=(p1,p2,p3,p4)=>{T.p.push(...p1,...p2,...p3,...p1,...p3,...p4);for(let i=0;i<6;i++)T.c.push(c,c,c*1.03);};
      quad(v.A0,v.B0,v.B1,v.A1);quad(v.a0,v.A0,v.A1,v.a1);quad(v.B0,v.b0,v.b1,v.B1);quad(v.A1,v.B1,v.b1,v.a1);quad(v.a0,v.b0,v.B0,v.A0);}}
  ['port','star'].forEach(sd=>{wallBand(ED[sd],sd,true);wallBand(ED[sd],sd,false);});
  [[tileGeo.t,wallTile],[tileGeo.r,wallRib]].forEach(([T,mat])=>{if(!T.p.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(T.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(T.c,3));g.computeVertexNormals();mat.vertexColors=true;P.add(M(g,mat));});

  /* =====================================================================
     5) 칼날 날개 생성기 — 윤곽(앞전 L(u), 뒷전 T(u), u=0 뿌리 → 1 끝) · 두께 = 뿌리 t0 → 끝/가장자리 0
        로컬: X=스팬(바깥) · Z=앞(+)/뒤(−) · Y=두께(위) · 능선(vr)에서 꺾임(각진 칼날)
     ===================================================================== */
  function bladeGeo(o){const NU=o.nu||34,NV=7;const pos=[],idx=[];const vr=o.vr||0.32,T0=o.t0,tp=o.tp||0.9;
    const pt=(u,v,sd)=>{const a=o.lead(u),b=o.trail(u);const x=a[0]+(b[0]-a[0])*v,z=a[1]+(b[1]-a[1])*v;
      const sh=v<vr?Math.pow(v/vr,0.62):Math.pow((1-v)/(1-vr),0.8);const th=T0*Math.pow(1-u,tp)*sh;
      const y=(o.camber||0)*Math.sin(Math.PI*v)*(1-u)+(o.curl||0)*u*u+(sd>0?th*0.62:-th*0.38);return [x,y,z];};
    const uu=i=>{const u=i/NU;return 1-Math.pow(1-u,1.25);};
    const patch=(v0,v1,sd)=>{const base=pos.length/3;for(let i=0;i<=NU;i++){const u=Math.min(0.997,uu(i));for(let j=0;j<=NV;j++)pos.push(...pt(u,v0+(v1-v0)*j/NV,sd));}
      for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const a=base+i*(NV+1)+j,b=a+1,c=a+NV+1,d=c+1;if(sd>0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);}};
    patch(0,vr,1);patch(vr,1,1);patch(0,vr,-1);patch(vr,1,-1);
    {const base=pos.length/3,NC=20;for(let j=0;j<=NC;j++)pos.push(...pt(0,j/NC,1));for(let j=0;j<=NC;j++)pos.push(...pt(0,j/NC,-1));for(let j=0;j<NC;j++){const a=base+j,b=a+1,c=base+NC+1+j,d=c+1;idx.push(a,c,b,b,c,d);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
  const bladeMat=armor(0x5d616e,{k:0.32,pat:2,sc:8});const bladeMat2=armor(0x454954,{k:0.26,pat:2,sc:9.5});
  const S=Math.sin,PI=Math.PI;
  /* 옆 날개 2단 */
  const wingMain=bladeGeo({t0:0.17,vr:0.3,curl:-0.12,camber:0.04,lead:u=>[2.5*u,-1.65*Math.pow(u,1.25)],trail:u=>[2.5*u,-1.3-0.35*u+0.36*S(PI*u)*(1-0.35*u)]});
  const wingUp=bladeGeo({t0:0.13,vr:0.3,curl:0.16,camber:0.03,lead:u=>[1.8*u,-1.5*Math.pow(u,1.15)],trail:u=>[1.8*u,-1.05-0.45*u+0.3*S(PI*u)*(1-0.3*u)]});
  const wingTips=[];
  [1,-1].forEach(sx=>{
    const w=G('WingMain');w.add(M(wingMain,bladeMat));w.scale.set(sx,1,1);w.position.set(sx*2.85,-0.05,-0.72);w.rotation.set(0,0,sx*-0.13);P.add(w);
    /* 뿌리 덮개(매끈한 페어링) */const fr=M(bladeGeo({t0:0.2,vr:0.4,nu:10,lead:u=>[0.35*u,-0.15*u],trail:u=>[0.35*u,-1.35+0.6*u]}),bladeMat2);fr.position.set(-0.12,0.03,0);w.add(fr);
    const tl=sprite(0xb48cff,0.22,0.8);tl.position.set(2.48,-0.12,-1.63);w.add(tl);wingTips.push(tl);
    const u=G('WingUpper');u.add(M(wingUp,bladeMat2));u.scale.set(sx,1,1);u.position.set(sx*2.55,0.42,-1.02);u.rotation.set(0,0,sx*0.22);P.add(u);
    const tu=sprite(0xb48cff,0.18,0.7);tu.position.set(1.78,0.16,-1.5);u.add(tu);wingTips.push(tu);});
  /* 꼬리 수직 날개 (바깥으로 기욺) + 가운데 */
  function tailFin(sc){const g=G('TailFin');const f=M(bladeGeo({t0:0.13*sc,vr:0.3,camber:0,lead:u=>[1.55*sc*u,-1.15*sc*Math.pow(u,1.3)],trail:u=>[1.55*sc*u,(-1.45+0.3*u+0.22*S(PI*u))*sc]}),bladeMat);f.rotation.z=PI/2;g.add(f);
    const tl=sprite(0xc0a0ff,0.2,0.8);tl.position.set(0,1.53*sc,-1.13*sc);g.add(tl);wingTips.push(tl);
    const base=M(bladeGeo({t0:0.2*sc,vr:0.35,nu:8,lead:u=>[0.22*sc*u,-0.1*u],trail:u=>[0.22*sc*u,(-1.5+0.25*u)*sc]}),bladeMat2);base.rotation.z=PI/2;base.position.y=-0.04;g.add(base);return g;}
  [1,-1].forEach(sx=>{const f=tailFin(1);f.position.set(sx*0.95,0.42,-1.95);f.rotation.z=-sx*0.32;P.add(f);});
  {const f=tailFin(0.62);f.position.set(0,0.5,-1.85);P.add(f);}
  /* 뿔 바깥 가장자리 칼날 지느러미 + 뿔 끝 바늘 칼날 */
  const finG=bladeGeo({t0:0.075,vr:0.3,nu:14,lead:u=>[0.6*u,-0.05-0.32*Math.pow(u,1.3)],trail:u=>[0.6*u,-0.3-0.07*u]});
  const needleG=bladeGeo({t0:0.1,vr:0.5,nu:20,tp:0.8,lead:u=>[1.5*u,0.12*(1-u)],trail:u=>[1.5*u,-0.12*(1-u)]});
  ['port','star'].forEach(sd=>{const E=ED[sd];if(E.length<8)return;
    for(let i=3;i<E.length-3;i+=4){const e=E[i];const yM=(e.ytO+e.ybO)/2;const base=at(e.a,e.rO-0.06,yM);const out=V(Math.sin(e.a),0,Math.cos(e.a));
      const nx=E[i+1];const tang=at(nx.a,nx.rO,0).sub(at(e.a,e.rO,0)).setY(0).normalize();/* 뒤쪽 방향 */
      const X=out.clone().multiplyScalar(0.85).addScaledVector(tang,0.55).normalize();const Y=V(0,1,0);let Z=X.clone().cross(Y);
      const f=M(finG,bladeMat2);f.position.copy(base);f.quaternion.copy(basisQ(X,Y,Z));if(Z.dot(tang)>0)f.scale.z=-1;f.scale.multiplyScalar(0.75+0.45*Math.sin(i/E.length*PI));if(Z.dot(tang)>0)f.scale.z=-Math.abs(f.scale.z);P.add(f);}
    const e0=E[0],e1=E[3];const p0=at(e0.a,(e0.rO+e0.rI)/2,(e0.ytO+e0.ybO)/2),p1=at(e1.a,(e1.rO+e1.rI)/2,(e1.ytO+e1.ybO)/2);const d=p0.clone().sub(p1).setY(0).normalize();
    const nd=M(needleG,bladeMat);nd.position.copy(p0).addScaledVector(d,-0.25);nd.quaternion.copy(basisQ(d,V(0,1,0),d.clone().cross(V(0,1,0))));P.add(nd);});

  /* =====================================================================
     C) 추진기 (v2 유지, 선 발광 제거)
     ===================================================================== */
  const flameMats=[],flames=[],turbines=[],shocks=[];const pearlW=armor(0x5d616e,{k:0.32});
  const vioDisc=new THREE.MeshStandardMaterial({color:0,emissive:0x8a4dff,emissiveIntensity:2.4,toneMapped:false});
  function engine(r,len){const e=G('Engine');
    const prof=[[0.0,r*0.55],[0.04,r*0.95],[0.12,r*1.08],[len*0.45,r*1.15],[len*0.6,r*1.05],[len*0.72,r*0.92],[len*0.85,r*0.98],[len,r*1.12]].map(([z,rr])=>new THREE.Vector2(rr,-z));
    const body=M(new THREE.LatheGeometry(prof,20),tungsten);body.rotation.x=PI/2;e.add(body);
    for(let k=0;k<6;k++){const a=k/6*PI*2+PI/6;const sh=M(new THREE.CylinderGeometry(r*1.24,r*1.3,len*0.5,6,1,true,a-0.42,0.84),pearlW);sh.rotation.x=PI/2;sh.position.z=-len*0.32;e.add(sh);}
    [0.08,len*0.6,len*0.84].forEach((z,k)=>{const rg=M(new THREE.TorusGeometry(r*(k?1.08:1.0),0.024,8,24),bronze);rg.position.z=-z;e.add(rg);});
    const gr=M(new THREE.CircleGeometry(r*0.55,16),graphite);gr.position.z=0.001;e.add(gr);for(let k=0;k<8;k++){const b=M(new THREE.BoxGeometry(r*1.0,0.012,0.02),tungsten);b.rotation.z=k/8*PI;b.position.z=0.005;e.add(b);}
    for(let k=0;k<12;k++){const a=k/12*PI*2;const pe=M(new THREE.BoxGeometry(r*0.42,0.02,len*0.2),k%2?tungsten:graphite);pe.position.set(Math.cos(a)*r*1.0,Math.sin(a)*r*1.0,-len*0.95);pe.rotation.z=a+PI/2;pe.rotation.x=0.18;e.add(pe);}
    const tb=G('Turbine');for(let k=0;k<9;k++){const bl=M(new THREE.BoxGeometry(r*0.85,0.02,0.05),tungsten);bl.position.set(Math.cos(k/9*PI*2)*r*0.42,Math.sin(k/9*PI*2)*r*0.42,0);bl.rotation.z=k/9*PI*2+0.5;tb.add(bl);}tb.position.z=-len*0.88;e.add(tb);turbines.push(tb);
    const disc=M(new THREE.CircleGeometry(r*0.9,24),vioDisc);disc.rotation.y=PI;disc.position.z=-len*0.86;e.add(disc);const hc=M(new THREE.CircleGeometry(r*0.45,20),hot);hc.rotation.y=PI;hc.position.z=-len*0.87;e.add(hc);
    const fl=G('Flame');[[r*1.0,len*1.5,0.32,0x6a3cff],[r*0.72,len*1.15,0.55,0xa88cff],[r*0.38,len*0.8,0.9,0xf4eeff]].forEach(([rr,L,op,c])=>{const m=ADD(c,op);flameMats.push(m);const cn=M(new THREE.ConeGeometry(rr,L,18,1,true),m);cn.rotation.x=-PI/2;cn.position.z=-L/2;fl.add(cn);});
    for(let k=0;k<4;k++){const sp=sprite(0xd8c8ff,r*(1.2-k*0.2),0.8-k*0.15);sp.position.z=-len*(0.3+k*0.28);fl.add(sp);shocks.push({sp,k});}
    fl.position.z=-len*0.9;e.add(fl);flames.push(fl);
    const glowS=sprite(0x9a6bff,r*4,0.4);glowS.position.z=-len*1.05;e.add(glowS);return e;}
  [[-0.95,0.08,0.24],[0,0.16,0.3],[0.95,0.08,0.24]].forEach(([x,y,r])=>{const e=engine(r,0.95);e.position.set(x,y,-1.95);P.add(e);});
  [1,-1].forEach(sx=>{const e=engine(0.13,0.55);e.position.set(sx*2.85,-0.05,-1.95);P.add(e);});

  /* =====================================================================
     6·7) 코어 연결부: 장갑 분절 링 + 장갑 파일런 3기 + 안쪽 도관 3줄 → 보석
     ===================================================================== */
  const CORE=G('CoreFX');P.add(CORE);
  const panelM=armor(0x5d616e,{k:0.3,pat:1,sc:9});const sparM=armor(0x474b56,{k:0.24});
  /* 분절 링: 마름모 단면 장갑 12조각 · 틈 사이로 링 속 플라스마 */
  {const ringFlow=M(new THREE.TorusGeometry(1.13,0.05,10,120),flowMat({col:0x8a4dff,base:0.7,pk:4.5,rep:6,spd:-0.5,w:4,tube:true}));ringFlow.rotation.x=PI/2;ringFlow.position.y=0.03;CORE.add(ringFlow);
    for(let k=0;k<12;k++){const seg=M(new THREE.TorusGeometry(1.13,0.085,4,10,0.42),k%3===0?tungsten:sparM);seg.rotation.x=PI/2;seg.rotation.z=k/12*PI*2+0.05;seg.position.y=0.03;CORE.add(seg);
      const cap=M(new THREE.BoxGeometry(0.07,0.05,0.2),tungsten);const a=k/12*PI*2+0.05+0.21;cap.position.set(Math.cos(a)*1.13,0.12,Math.sin(a)*1.13);cap.rotation.y=-a;CORE.add(cap);}}
  const packets=[];const platP=new THREE.MeshStandardMaterial({color:0xb4b7c4,metalness:1,roughness:0.22});
  function pylon(A,B,ph){const g=G('Pylon');const d=B.clone().sub(A);const L=d.length();const X=d.clone().normalize();const Z=X.clone().cross(V(0,1,0)).normalize();const Y=Z.clone().cross(X).normalize();
    g.position.copy(A);g.quaternion.copy(basisQ(X,Y,Z));CORE.add(g);
    const alongX=geo=>{geo.rotateZ(-PI/2);return geo;};
    /* 육각 스파 (끝으로 가늘게) */const sp=M(alongX(new THREE.CylinderGeometry(0.1,0.075,L,6)).translate(L/2,0,0),sparM);sp.rotation.x=PI/6;g.add(sp);
    /* 윗 덮개: 칼날형 장갑 (뿌리 두꺼움 → 링 쪽 얇음) */const cw=M(bladeGeo({t0:0.07,vr:0.5,nu:10,tp:0.5,lead:u=>[L*(1-u)*0.92+0.04,0.16-0.06*u],trail:u=>[L*(1-u)*0.92+0.04,-0.16+0.06*u]}),panelM);cw.rotation.y=0;cw.position.y=0.085;g.add(cw);
    /* 옆 칼날 볏 */[1,-1].forEach(s=>{const fb=M(bladeGeo({t0:0.05,vr:0.3,nu:8,lead:u=>[0.32*u,0.0-0.08*u],trail:u=>[0.32*u,-0.42+0.3*u]}),bladeMat2);fb.position.set(L*0.92,0.0,s*0.09);fb.rotation.set(0,s>0?-PI/2:PI/2,0);fb.scale.z=1;g.add(fb);});
    /* 칼라 3개 */[0.14,L*0.5,L-0.16].forEach(x=>{const c=M(new THREE.TorusGeometry(0.112,0.022,8,22),platP);c.rotation.y=PI/2;c.position.x=x;g.add(c);});
    /* 링 쪽 클램프 발톱 3개 */for(let k=0;k<3;k++){const a=k/3*PI*2+PI/2;const cl=M(new THREE.BoxGeometry(0.16,0.035,0.05),platP);cl.position.set(0.02,Math.sin(a)*0.11,Math.cos(a)*0.11);cl.rotation.x=-a;cl.rotation.z=0.0;g.add(cl);
      const tip=M(new THREE.ConeGeometry(0.03,0.09,4),platP);tip.rotation.z=PI/2;tip.position.set(-0.09,Math.sin(a)*0.11,Math.cos(a)*0.11);g.add(tip);}
    /* 몸체 쪽 소켓 플랜지 + 볼트 */const so=M(alongX(new THREE.CylinderGeometry(0.2,0.13,0.16,12)).translate(L-0.06,0,0),tungsten);g.add(so);
    for(let k=0;k<8;k++){const a=k/8*PI*2;const b=M(new THREE.CylinderGeometry(0.018,0.018,0.03,6),platP);b.rotation.z=PI/2;b.position.set(L-0.15,Math.sin(a)*0.15,Math.cos(a)*0.15);g.add(b);}
    /* 에너지 도관: 위 큰 것 1 + 옆 작은 것 2 (몸체 → 링 방향으로 흐름) */
    const tube=(a,b,r,fm)=>{const c=new THREE.CatmullRomCurve3([a,a.clone().lerp(b,0.5).add(V(0,0.012,0)),b]);const m=M(new THREE.TubeGeometry(c,24,r,10,false),fm);g.add(m);return c;};
    [1,-1].forEach(s=>tube(V(L,0.0,s*0.115),V(0.0,0.0,s*0.115),0.022,flowMat({col:0x6fc8ff,base:0.45,pk:4,rep:3,spd:1.25,w:6,tube:true,ofs:ph+0.3})));
    /* 케이블 (아래로 처짐) */[1,-1].forEach(s=>{const c=new THREE.CatmullRomCurve3([V(L-0.05,-0.08,s*0.05),V(L*0.5,-0.17,s*0.06),V(0.05,-0.07,s*0.05)]);g.add(M(new THREE.TubeGeometry(c,20,0.022,6,false),graphite));});
    /* 빛 덩어리 3개 (월드 좌표로 이동) */g.updateMatrixWorld(true);for(let k=0;k<4;k++){const z=(k%2?1:-1)*0.115;const wA=V(0,0,z).applyMatrix4(g.matrixWorld),wB=V(L,0,z).applyMatrix4(g.matrixWorld);const s=sprite(0xe0ccff,0.2,1);CORE.add(s);const tr=sprite(0x9a6bff,0.12,0.7);CORE.add(tr);packets.push({s,tr,A:wA,B:wB,ph:ph+k/4});}
    return g;}
  const dg=[2.115,-2.115].map(a=>V(Math.sin(a),0,Math.cos(a)));
  dg.forEach((d,i)=>pylon(d.clone().multiplyScalar(1.12).setY(0.03),d.clone().multiplyScalar(2.08).setY(0.02),i*0.17));
  pylon(V(0,0.03,-1.12),V(0,0.02,-1.72),0.5);
  /* 안쪽 도관: 링 → 코어 (초승달 장갑 사이 틈 3곳) */
  const coreY=0.285,cRx=0.54,cRy=0.405;
  [2.115,-2.115,0].forEach((a,i)=>{const d=V(Math.sin(a),0,Math.cos(a));const c=new THREE.CatmullRomCurve3([d.clone().multiplyScalar(1.12).setY(0.08),d.clone().multiplyScalar(0.9).setY(0.12),d.clone().multiplyScalar(0.68).setY(0.18),d.clone().multiplyScalar(0.5).setY(0.22)]);
    CORE.add(M(new THREE.TubeGeometry(c,30,0.03,10,false),flowMat({col:0xa070ff,base:0.7,pk:5,rep:1.5,spd:1.25,w:5,tube:true,ofs:i*0.17})));
    const sl=M(new THREE.TubeGeometry(c,30,0.048,8,false),new THREE.MeshPhysicalMaterial({color:0x8070a0,metalness:0,roughness:0.05,transparent:true,opacity:0.22,depthWrite:false,clearcoat:1}));CORE.add(sl);});

  /* =====================================================================
     2) 시간 코어 — 원본 코어 구체(폭 1.08 · 높이 0.81)를 그대로 보석처럼 깎은 결정체
        + 결정 속 시계 기관(문자반 · 톱니 고리 · 시/분/초침) + 위에 떠 있는 로마숫자 문자 고리
        시간 흐름: 정상(째깍) → 되감기 → 정지 → 빨리감기 반복 (바늘·고리·입자·결정 빛이 모두 따라감)
     ===================================================================== */
  function cutOrb(rx,ry){const pos=[];const n=16;const LAT=[72,52,30,9,-14,-38,-60,-76].map(d=>d*PI/180);
    const ring=(i)=>{const f=LAT[i];const o=(i%2)*PI/n;return [...Array(n)].map((_,j)=>[Math.cos(f)*rx*Math.cos(j*2*PI/n+o),Math.sin(f)*ry,Math.cos(f)*rx*Math.sin(j*2*PI/n+o)]);};
    const tri=(a,b,c)=>{const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];const nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0];const cx=a[0]+b[0]+c[0],cy=a[1]+b[1]+c[1],cz=a[2]+b[2]+c[2];if(nx*cx+ny*cy+nz*cz<0)pos.push(...a,...c,...b);else pos.push(...a,...b,...c);};
    const R=LAT.map((_,i)=>ring(i));
    {const t=R[0];const y=t[0][1];for(let j=0;j<n;j++)tri([0,y,0],t[j],t[(j+1)%n]);}/* 테이블(평평한 윗면) */
    for(let i=0;i<R.length-1;i++){const A=R[i],B=R[i+1];const odd=i%2;for(let j=0;j<n;j++){const j1=(j+1)%n;if(!odd){tri(A[j],A[j1],B[j]);tri(A[j1],B[j1],B[j]);}else{tri(A[j],A[j1],B[j1]);tri(A[j],B[j1],B[j]);}}}
    {const t=R[R.length-1];const y=t[0][1];for(let j=0;j<n;j++)tri([0,y,0],t[j],t[(j+1)%n]);}/* 큘렛 */
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}
  const uTint={value:new THREE.Vector3(1,1,1)};
  const xtalMat=back=>new THREE.ShaderMaterial({uniforms:{uT:U.t,uAlly:U.ally,uPu:U.pulse,uTint},transparent:true,depthWrite:false,side:back?THREE.BackSide:THREE.FrontSide,
    vertexShader:'varying vec3 vWP;varying vec3 vN;varying vec3 vON;void main(){vON=normal;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vWP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform float uT,uAlly,uPu;uniform vec3 uTint;varying vec3 vWP;varying vec3 vN;varying vec3 vON;'+HUE+'float h31(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}'+
      'vec3 envc(vec3 r){float a=pow(max(r.y,0.),2.)*0.8;float b=pow(max(dot(r,normalize(vec3(.6,.55,.6))),0.),70.)*8.;float c=pow(max(dot(r,normalize(vec3(-.7,.35,-.45))),0.),40.)*3.;float st=smoothstep(0.9,1.,sin(atan(r.z,r.x)*5.+r.y*2.))*max(r.y+0.2,0.)*1.4;return vec3(a+b+st)+vec3(0.55,0.45,1.)*c;}'+
      'void main(){vec3 N=normalize(vN);vec3 Vd=normalize(cameraPosition-vWP);'+(back?'N=-N;':'')+'float ndv=abs(dot(N,Vd));float fr=0.06+0.94*pow(max(1.-ndv,0.),4.);'+
      'vec3 R=reflect(-Vd,N);vec3 Tr=refract(-Vd,N,1./1.9);float id=h31(floor(vON*11.)+0.5);float id2=h31(floor(Tr*5.+vON*3.)+3.1);'+
      'vec3 body=mix(vec3(0.42,0.16,0.95),hue(fract(uT*0.07+id*0.2)),uAlly)*uTint;'+
      'vec3 col=body*(0.25+0.9*(id2*id2))+vec3(0.85,0.75,1.)*uTint*pow(max(id2,0.),7.)*1.8;'+
      'col+=hue(fract(dot(Tr,vec3(2.3,1.3,1.9))+id*0.7))*pow(max(0.,sin(id2*37.+uT*1.1+id*11.)),18.)*1.4;'+
      'col+=vec3(1.)*pow(max(dot(R,normalize(vec3(sin(uT*.5),.85,cos(uT*.5)))),0.),260.)*'+(back?'0.':'22.')+';'+
      'col+=body*uPu*0.8;col=mix(col,envc(R),fr*'+(back?'0.3':'0.85')+');'+
      'float al='+(back?'0.32+0.2*pow(max(id2,0.),3.)':'clamp(0.24+0.7*fr+0.22*pow(max(id2,0.),3.),0.,0.96)')+';gl_FragColor=vec4(col,al);}'});
  const XT=G('TimeCore');XT.position.y=coreY;CORE.add(XT);
  const orbG=cutOrb(cRx,cRy);const xtB=M(orbG,xtalMat(true));xtB.renderOrder=3;const xtF=M(orbG,xtalMat(false));xtF.renderOrder=5;XT.add(xtB,xtF);
  /* 결정 테두리 금속 띠 (거들): 얇은 백금 띠 + 12시 방향 표식 */
  const plat=new THREE.MeshStandardMaterial({color:0xc9cbd6,metalness:1,roughness:0.18});const platD=new THREE.MeshStandardMaterial({color:0x6c6f7c,metalness:1,roughness:0.28});
  /* 캔버스 문자반 */
  const ROMAN=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  function dialTex(o){const S=1024,cv=document.createElement('canvas');cv.width=cv.height=S;const x=cv.getContext('2d');const c=S/2;x.translate(c,c);const R0=o.r0*c,R1=o.r1*c;
    if(o.bg){const g=x.createRadialGradient(0,0,0,0,0,R1);o.bg.forEach(([p,col])=>g.addColorStop(p,col));x.fillStyle=g;x.beginPath();x.arc(0,0,R1,0,PI*2);x.arc(0,0,R0,0,PI*2,true);x.fill();}
    if(o.guil){x.strokeStyle=o.guil;x.lineWidth=1.2;for(let k=0;k<36;k++){x.beginPath();for(let a=0;a<=PI*2+0.01;a+=0.02){const r=R0+(R1-R0)*(0.12+0.3*(k%6)/6)+Math.sin(a*24+k)*4;const px=Math.cos(a)*r*(0.5+k/72),py=Math.sin(a)*r*(0.5+k/72);a?x.lineTo(px,py):x.moveTo(px,py);}x.stroke();}}
    x.fillStyle=o.ink;x.strokeStyle=o.ink;
    for(let k=0;k<60;k++){const a=k/60*PI*2-PI/2;const big=k%5===0;const ra=R1*(big?o.tk[0]:o.tk[1]),rb=R1*o.tk[2];x.lineWidth=big?o.lw*2.2:o.lw;x.beginPath();x.moveTo(Math.cos(a)*ra,Math.sin(a)*ra);x.lineTo(Math.cos(a)*rb,Math.sin(a)*rb);x.stroke();}
    if(o.num){x.font='600 '+o.num[1]+'px "Times New Roman",Georgia,serif';x.textAlign='center';x.textBaseline='middle';ROMAN.forEach((s,k)=>{const a=k/12*PI*2-PI/2;x.save();x.translate(Math.cos(a)*R1*o.num[0],Math.sin(a)*R1*o.num[0]);x.rotate(a+PI/2);x.fillText(s,0,0);x.restore();});}
    if(o.teeth){for(let k=0;k<o.teeth;k++){const a=k/o.teeth*PI*2;x.save();x.rotate(a);x.fillRect(R1*0.965,-R1*0.018,R1*0.035,R1*0.036);x.restore();}}
    const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;}
  /* 결정 속 문자반 */
  const dialM=new THREE.MeshBasicMaterial({map:dialTex({r0:0,r1:1,bg:[[0,'#2a1060'],[0.6,'#160830'],[1,'#0b0618']],guil:'rgba(170,130,255,.22)',ink:'#d8c8ff',tk:[0.84,0.9,0.97],lw:3,num:[0.72,96]}),color:0xffffff,toneMapped:false});
  dialM.color.setScalar(1.35);const dial=M(new THREE.CircleGeometry(0.34,64).rotateX(-PI/2),dialM);dial.position.y=-0.02;XT.add(dial);
  /* 톱니 고리 2개 (반대로 회전) */
  const gearTex=(n)=>dialTex({r0:0.82,r1:1,bg:[[0,'#888'],[1,'#ccc']],ink:'#fff',tk:[0.9,0.9,0.9],lw:0,teeth:n});
  const gearM=(n,c)=>new THREE.MeshStandardMaterial({color:c,metalness:1,roughness:0.25,alphaMap:gearTex(n),transparent:false,alphaTest:0.5,side:THREE.DoubleSide});
  const gearA=M(new THREE.RingGeometry(0.3,0.38,96).rotateX(-PI/2),gearM(48,0xc9cbd6));gearA.position.y=0.01;XT.add(gearA);
  const gearB=M(new THREE.RingGeometry(0.19,0.25,72).rotateX(-PI/2),gearM(30,0x9a8cc8));gearB.position.y=0.03;XT.add(gearB);
  /* 바늘: 칼날형 시/분/초침 + 중심 축 */
  const handShape=(L,W,tail)=>{const s=new THREE.Shape();s.moveTo(-tail,0);s.lineTo(0,W);s.lineTo(L*0.82,W*0.55);s.lineTo(L,0);s.lineTo(L*0.82,-W*0.55);s.lineTo(0,-W);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:0.008,bevelEnabled:true,bevelThickness:0.004,bevelSize:0.004,bevelSegments:1});g.rotateX(-PI/2);return g;};
  const hands=[[0.2,0.026,0.05,plat,0.05],[0.29,0.018,0.06,plat,0.065],[0.32,0.007,0.09,new THREE.MeshStandardMaterial({color:0,emissive:0xb090ff,emissiveIntensity:2.2,toneMapped:false}),0.08]].map(([L,W,tl,m,y])=>{const h=G();const mm=M(handShape(L,W,tl),m);h.add(mm);h.position.y=y;XT.add(h);return h;});
  const secTip=sprite(0xd8c0ff,0.07,1);secTip.position.set(0.31,0,0);hands[2].add(secTip);
  const hub=M(new THREE.CylinderGeometry(0.03,0.04,0.07,16),plat);hub.position.y=0.06;XT.add(hub);
  const singular=sprite(0xffffff,0.16,1);singular.position.y=0.1;XT.add(singular);const kern=sprite(0x9a6bff,0.6,0.5);kern.position.y=0.05;XT.add(kern);
  /* 위에 떠 있는 로마숫자 문자 고리 + 톱니 테두리 + 작은 눈금 고리 */
  const crown=G('TimeCrown');crown.position.y=coreY+0.5;CORE.add(crown);
  const crownTex=dialTex({r0:0.7,r1:1,bg:[[0.69,'#3a3d48'],[0.85,'#5b5f6c'],[1,'#2c2f38']],ink:'#e8e2ff',tk:[0.93,0.96,0.995],lw:3,num:[0.8,74],teeth:72});
  const crownEm=dialTex({r0:0.7,r1:1,bg:[[0,'#000'],[1,'#000']],ink:'#a070ff',tk:[0.93,0.96,0.995],lw:3,num:[0.8,74]});
  const crownM=new THREE.MeshStandardMaterial({map:crownTex,emissiveMap:crownEm,emissive:0xffffff,emissiveIntensity:1.7,metalness:0.85,roughness:0.3,side:THREE.DoubleSide,alphaTest:0.4,transparent:false});
  const dialRing=M(new THREE.RingGeometry(0.42,0.6,128).rotateX(-PI/2),crownM);crown.add(dialRing);
  const edgeA=M(new THREE.TorusGeometry(0.6,0.012,8,128),plat);edgeA.rotation.x=PI/2;crown.add(edgeA);const edgeB=M(new THREE.TorusGeometry(0.42,0.01,8,128),platD);edgeB.rotation.x=PI/2;crown.add(edgeB);
  const crown2=M(new THREE.RingGeometry(0.26,0.34,96).rotateX(-PI/2),new THREE.MeshStandardMaterial({map:dialTex({r0:0.75,r1:1,bg:[[0.74,'#2c2f38'],[1,'#4a4e5a']],ink:'#d8ccff',tk:[0.86,0.92,0.99],lw:4}),metalness:0.85,roughness:0.3,side:THREE.DoubleSide,emissive:0x7040c0,emissiveIntensity:0.5}));crown2.position.y=0.1;crown.add(crown2);
  /* 고리 지지대: 결정 꼭대기에서 올라온 가는 백금 기둥 3개 */
  for(let k=0;k<3;k++){const a=k/3*PI*2+0.3;const c=new THREE.CatmullRomCurve3([V(Math.cos(a)*0.2,coreY+cRy*0.95,Math.sin(a)*0.2),V(Math.cos(a)*0.34,coreY+0.42,Math.sin(a)*0.34),V(Math.cos(a)*0.44,coreY+0.5,Math.sin(a)*0.44)]);CORE.add(M(new THREE.TubeGeometry(c,16,0.012,6,false),platD));}
  const coreGlow=sprite(0x8a5cff,1.9,0.28);coreGlow.position.y=coreY;CORE.add(coreGlow);
  const flash=sprite(0xe8d8ff,1.0,0);flash.position.y=coreY+0.1;CORE.add(flash);
  /* 입자 소용돌이 (시간 흐름을 따라 돎) */const NP=220;const pg=new THREE.BufferGeometry();const pp=new Float32Array(NP*3),pd=[];for(let n=0;n<NP;n++){pd.push({r:0.62+Math.random()*0.65,a:Math.random()*PI*2,y:0.15+(Math.random()-0.5)*0.4,s:0.4+Math.random()*1.2});}pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));
  const ptsM=new THREE.PointsMaterial({map:softTex,color:0xc8b0ff,size:0.055,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});ptsM.userData.c=0xc8b0ff;rainbowAdd.push(ptsM);const swirl=new THREE.Points(pg,ptsM);CORE.add(swirl);
  /* 시간 흐름 상태 */
  const TM={tau:0,last:0,rate:1,mode:0};
  const PHASES=[[7,1,0],[1.6,-7,1],[1.1,0,2],[1.3,4,3]];const CYC=PHASES.reduce((s,p)=>s+p[0],0);
  const tintOf=[V(1,1,1),V(0.55,1.15,1.6),V(1.5,1.4,1.7),V(1.3,0.85,1.2)];

  /* ---------- 갱신 ---------- */
  const tmpC=new THREE.Color();
  function setAlly(a){U.ally.value=a?1:0;}
  function update(t){U.t.value=t;const ally=U.ally.value>0.5;const pulse=0.5+0.5*Math.sin(t*2.4);
    vio.emissiveIntensity=2.6*(0.8+0.35*pulse);
    /* 빛 덩어리: 몸체 → 링 · 도착 순간 보석 번쩍 */let pu=0;
    packets.forEach(Pk=>{const f=((t*0.62+Pk.ph)%1+1)%1;Pk.s.position.copy(Pk.B).lerp(Pk.A,f);Pk.tr.position.copy(Pk.B).lerp(Pk.A,Math.max(0,f-0.07));const e=Math.sin(Math.min(1,f*1.15)*PI);Pk.s.scale.setScalar(0.09+0.15*Math.sqrt(Math.max(0,e)));Pk.s.material.opacity=Math.min(1,f*6);Pk.tr.material.opacity=0.6*Math.min(1,f*6);pu=Math.max(pu,Math.exp(-Math.pow((1-f)*9,2)),Math.exp(-Math.pow(f*14,2)));});
    U.pulse.value=U.pulse.value*0.86+pu*0.14*3;U.pulse.value=Math.min(1,U.pulse.value);
    {const dt=Math.max(0,Math.min(0.1,t-TM.last));TM.last=t;let ph=((t%CYC)+CYC)%CYC,i=0;while(ph>PHASES[i][0]){ph-=PHASES[i][0];i++;}const tgtRate=PHASES[i][1];TM.mode=PHASES[i][2];TM.rate+=(tgtRate-TM.rate)*Math.min(1,dt*(TM.mode===2?14:6));TM.tau+=TM.rate*dt;
      const tg=tintOf[TM.mode];uTint.value.lerp(tg,Math.min(1,dt*4));}
    const tau=TM.tau;const tick=TM.mode===0?Math.floor(tau)+Math.min(1,(tau-Math.floor(tau))/0.16):tau;
    hands[2].rotation.y=-tick*(PI*2/12);hands[1].rotation.y=-tau*(PI*2/90);hands[0].rotation.y=-tau*(PI*2/1080);
    gearA.rotation.y=tau*0.35;gearB.rotation.y=-tau*0.7;dialRing.rotation.y=-tick*(PI*2/60);crown2.rotation.y=tau*0.25;crown.position.y=coreY+0.5+0.02*Math.sin(t*1.3);
    xtF.rotation.y=xtB.rotation.y=tau*0.06;
    singular.scale.setScalar(0.14+0.05*pulse+0.12*U.pulse.value+(TM.mode===2?0.08:0));kern.scale.setScalar(0.55+0.3*U.pulse.value);
    coreGlow.scale.setScalar(1.7+0.25*pulse+0.7*U.pulse.value);coreGlow.material.opacity=0.2+0.2*U.pulse.value;flash.material.opacity=0.35*U.pulse.value+(TM.mode===2?0.15:0);flash.scale.setScalar(0.8+1.2*U.pulse.value);
    {const p=swirl.geometry.attributes.position;pd.forEach((d,n)=>{const a=d.a+tau*d.s*0.6;const r=d.r*(0.9+0.1*Math.sin(tau*1.3+n));p.setXYZ(n,Math.cos(a)*r,d.y+0.05*Math.sin(tau+n),Math.sin(a)*r);});p.needsUpdate=true;}
    wingTips.forEach((w,k)=>w.material.opacity=0.55+0.35*Math.sin(t*3+k));
    turbines.forEach((tb,k)=>tb.rotation.z=t*(14+k));flames.forEach((f,k)=>{const q=0.88+0.16*Math.sin(t*34+k*1.7)+0.05*Math.sin(t*71+k);f.scale.set(1+0.04*Math.sin(t*50+k),1+0.04*Math.cos(t*47+k),q);});
    shocks.forEach(S=>{S.sp.material.opacity=(0.75-S.k*0.15)*(0.7+0.3*Math.sin(t*40+S.k*1.3));});
    if(ally){flameMats.forEach((m,k)=>{tmpC.setHSL((t*0.25+k*0.08)%1,0.9,0.62);m.color.copy(tmpC);});rainbowAdd.forEach((m,k)=>{tmpC.setHSL((t*0.3+k*0.13)%1,0.9,0.7);m.color.copy(tmpC);});tmpC.setHSL((t*0.3)%1,0.9,0.55);vio.emissive.copy(tmpC);vioDisc.emissive.copy(tmpC);}
    else{flameMats.forEach((m,k)=>m.color.set([0x6a3cff,0xa88cff,0xf4eeff][k%3]));rainbowAdd.forEach(m=>m.color.set(m.userData.c||0xc8b0ff));vio.emissive.set(0x8a4dff);vioDisc.emissive.set(0x8a4dff);}}
  return{update,setAlly,extra:P,edges:ED};}
