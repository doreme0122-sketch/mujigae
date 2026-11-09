/* 화산 지역 섬 키트 (사용자 디자인 파일 913f7c22 — 화산 지역 · 섬 모음) 를 모듈로 옮김 (2026-11-09)
   · 원본 코드를 그대로 쓰고, 폰에서 돌도록만 고침: 점 빛(PointLight) 대신 빈 점 · 연기/불티는 한 번에 그리는 판으로 · 해상도(Q)·알갱이 수(PQ) 조절 · 금빛 균열은 섬 안 좌표로
   · 색은 원본처럼 (THREE r128: 색 관리 끔) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function makeVolcKit(){ const cm0=THREE.ColorManagement.enabled; THREE.ColorManagement.enabled=false;
try {
'use strict';
// ---------------- utils ----------------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
let R=mulberry32(81207);const rnd=(a,b)=>a+(b-a)*R(),clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=a=>a[Math.floor(R()*a.length)];
const V=(x,y,z)=>new THREE.Vector3(x,y,z),UP=V(0,1,0);
const C=h=>new THREE.Color(h).convertSRGBToLinear();
function hash2(x,y){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm2(x,y){let s=0,a=.5;for(let i=0;i<4;i++){s+=a*vnoise(x,y);x*=2.03;y*=2.03;a*=.5;}return s;}
const angD=(a,b)=>Math.abs(((a-b+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI);
const anim=[];

const scene=new THREE.Group();
class FakePL extends THREE.Object3D{constructor(c,i,d){super();this.color=new THREE.Color(c);this.intensity=i||0;this.distance=d||0;}}
// ---------------- ash sky ----------------
const NOISE3=`float h(float n){return fract(sin(n)*43758.5453);}
 float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(h(n),h(n+1.),f.x),mix(h(n+57.),h(n+58.),f.x),f.y),mix(mix(h(n+113.),h(n+114.),f.x),mix(h(n+170.),h(n+171.),f.x),f.y),f.z);}
 float fb(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p*=2.03;a*=.5;}return v;}`;
const skyMat={uniforms:{t:{value:0},flash:{value:0}}};
function dotTex(){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);}
const dot=dotTex();
function glow(col,s,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,color:col,transparent:true,opacity:op==null?.8:op,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);return m;}

// ---------------- lava shader ----------------
const LAVA_V='#ifdef USE_INSTANCING\n#define IMX instanceMatrix\n#else\n#define IMX mat4(1.)\n#endif\nvarying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vW=position;gl_Position=projectionMatrix*modelViewMatrix*IMX*vec4(position,1.);}';
const LAVA_F=`uniform float time;uniform float mode;uniform vec2 sc;uniform float flow;uniform float inten;uniform float bank;varying vec2 vUv;varying vec3 vW;
float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.07;a*=.5;}return v;}
void main(){vec2 p=mode<.5?vW.xz*.12:vUv*sc;p.y-=time*flow;
 vec2 w=vec2(fbm(p+vec2(0.,time*.05)),fbm(p+vec2(5.2,1.3)-time*.04));float v=fbm(p*1.15+w*2.3);
 float r=1.-abs(fbm(p*2.4+w*1.6+vec2(time*.03,0.))*2.-1.);r=pow(r,5.);
 float heat=clamp(v*.85+r*.95-.25+mode*.25,0.,1.2);
 vec3 c=mix(vec3(.06,.01,.005),vec3(.55,.06,.01),smoothstep(.05,.33,heat));
 c=mix(c,vec3(1.,.32,.03),smoothstep(.33,.58,heat));c=mix(c,vec3(1.,.72,.22),smoothstep(.6,.85,heat));c=mix(c,vec3(1.,.95,.75),smoothstep(.92,1.12,heat));
 if(bank>.5){float e=abs(vUv.x-.5)*2.;float nb=n(vec2(vUv.y*.35,vUv.x*4.+3.))*.6+n(vec2(vUv.y*1.4,vUv.x*9.))*.4;float ed=e+(nb-.5)*.5;if(ed>.97)discard;
  float ck=smoothstep(.45,.93,ed);float sk=n(vec2(vUv.y*3.,vUv.x*14.));c=mix(c,vec3(.035,.014,.01)*(.7+sk*.6)+c*vec3(.18,.05,.02),ck);}
 gl_FragColor=vec4(c*inten,1.);}`;
let lavaMats=[];
const LAVC=new Map();function lavaMat(o){o=o||{};const key=[o.uv?1:0,o.sx||1,o.sy||1,o.flow==null?.03:o.flow,o.i||1.2,o.bank?1:0,o.side||0].join(',');let m=LAVC.get(key);if(m)return m;
  m=new THREE.ShaderMaterial({uniforms:{time:TU,mode:{value:o.uv?1:0},sc:{value:new THREE.Vector2(o.sx||1,o.sy||1)},flow:{value:o.flow==null?.03:o.flow},inten:{value:o.i||1.2},bank:{value:o.bank?1:0}},
  vertexShader:LAVA_V,fragmentShader:LAVA_F,side:o.side||THREE.FrontSide});m.userData.lava=key;LAVC.set(key,m);return m;}

let W2=200;
// ---------------- procedural cooled-crust cracks (shader injected into lit materials) ----------------
const TU={value:0};let UGLOW={value:1},UGLO={value:1},UFRONT={value:1e5},USOFT={value:6},OWNU=false,Q=1,PQ=1,TQ=1,MINB=0,TD=2,QT=1,VOPT={};const WM=new Map();
const CRACK_GLSL=`uniform float uTime;uniform sampler2D heatMap;uniform float uMode;uniform float uMaskK;uniform float uW2;uniform float uSeed;uniform float uGlow;uniform float uGlowLo;uniform float uFront;uniform float uSoft;uniform float uPK;varying vec3 vWPos;
vec2 hash22(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
float h21(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
vec3 voro(vec2 x){vec2 n=floor(x),f=fract(x);float F1=8.,F2=8.;vec2 id=n;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=hash22(n+g);vec2 r=g+o-f;float d=dot(r,r);if(d<F1){F2=F1;F1=d;id=n+g;}else if(d<F2){F2=d;}}return vec3(sqrt(F2)-sqrt(F1),hash22(id));}
vec3 crackGlow(out float halo){vec2 p;float mask;
 if(uMode<.5){p=vWPos.xz;mask=texture2D(heatMap,vec2(vWPos.x/uW2*.5+.5,1.-(vWPos.z/uW2*.5+.5))).r;}
 else if(uMode<1.5){p=vec2(vWPos.x+vWPos.z,vWPos.y*1.4);mask=smoothstep(.55,.95,sin(vWPos.y*.11+vn(vWPos.xz*.04)*5.)*.5+.5)*smoothstep(-170.,-6.,vWPos.y)*.9;}
 else if(uMode<2.5){p=vWPos.xz+vec2(vWPos.y*.7);mask=uMaskK;}
 else{p=vWPos.xz;mask=smoothstep(.42,.78,vn(p*.045+uSeed))*uMaskK+uMaskK*.12;}
 p*=uPK; vec2 w=vec2(vn(p*.05),vn(p*.05+7.))*6.;vec3 v1=voro((p+w)*.17);vec3 v2=voro((p+w)*.5+3.);
 float width=.025+.1*mask,aw=max(width,fwidth(v1.x)*1.3);float c1=(1.-smoothstep(0.,aw,v1.x))*mix(1.,width/aw,.55),c2=(1.-smoothstep(0.,width*.55,v2.x))*smoothstep(.3,.75,mask)*(1.-smoothstep(.015,.06,fwidth(v2.x)));
 float flick=.78+.22*sin(uTime*1.6+v1.y*30.);float crack=max(c1,c2*.65)*smoothstep(.04,.3,mask)*flick;
 halo=(1.-smoothstep(0.,.3,v1.x))*mask;
 vec3 col=mix(vec3(.5,.035,0.),vec3(1.,.33,.03),smoothstep(.1,.6,crack));col=mix(col,vec3(1.,.82,.45),smoothstep(.72,1.,crack));
 return col*crack*2.4+vec3(.4,.06,0.)*halo*.3+vec3(.3,.05,0.)*mask*mask*.3;}`;
let HEAT=null;
function addCracks(mat,mode,maskK,seed,U0){const U=U0||{uTime:TU,uGlow:UGLOW,uGlowLo:UGLO,uFront:UFRONT,uSoft:USOFT,heatMap:{value:HEAT},uMode:{value:mode},uMaskK:{value:maskK||0},uW2:{value:W2},uSeed:{value:seed||0},uPK:{value:1}};mat.userData.crk=[mode,maskK||0,seed||0];mat.__crkU=U;
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
  sh.vertexShader='varying vec3 vWPos;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#if defined(USE_INSTANCING)&&!defined(VK_PLACE)\n vWPos=(instanceMatrix*vec4(transformed,1.)).xyz;\n#else\n vWPos=transformed;\n#endif');
  sh.fragmentShader=CRACK_GLSL+'\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n float halo;vec3 cgl=crackGlow(halo);diffuseColor.rgb*=1.-.5*halo;float fk=1.-smoothstep(uFront-uSoft,uFront+uSoft,vWPos.y),bq=(vWPos.y-uFront)/uSoft,band=exp(-bq*bq)*step(uFront,9e4),gm=mix(uGlowLo,uGlow,fk)+band*uGlow*.7;totalEmissiveRadiance+=cgl*gm+vec3(1.,.4,.08)*halo*max(gm-1.,0.)*.35;');};
  mat.customProgramCacheKey=()=>'crack'+mode+(mat.defines&&mat.defines.VK_PLACE?'p':'');return mat;}
function wm(m){if(!OWNU||!m.userData.crk)return m;let c=WM.get(m);if(!c){c=m.clone();const k=m.userData.crk;addCracks(c,k[0],k[1],k[2]);WM.set(m,c);}return c;}
// ---------------- Fire Heart sanctum: engraved obsidian floor, broken arc walls, heat shaft ----------------
const goldM2=new THREE.MeshPhongMaterial({color:C('#b8903e'),specular:C('#ffe2a8'),shininess:90,emissive:C('#1c1204')});
const wallM=new THREE.MeshPhongMaterial({color:C('#1e1a1e'),specular:C('#8a5a4a'),shininess:60});
function glyphF(g,x,y,s,rot){g.save();g.translate(x,y);g.rotate(rot);g.beginPath();const n=3+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){const t=Math.floor(Math.random()*6);if(t===0){g.moveTo(-s,-s);g.lineTo(s,-s);}else if(t===1){g.moveTo(-s*.6,-s);g.lineTo(-s*.6,s);}else if(t===2){g.moveTo(s*.6,-s);g.lineTo(s*.6,s*.4);}
    else if(t===3){g.moveTo(-s,s);g.lineTo(0,0);g.lineTo(s,s);}else if(t===4){g.moveTo(-s,0);g.lineTo(s,0);}else{g.moveTo(s*.35,0);g.arc(0,0,s*.35,0,Math.PI*2);}}g.stroke();g.restore();}
function fireFloorTex(){const S=2048,c=document.createElement('canvas'),e=document.createElement('canvas');c.width=c.height=e.width=e.height=S;const g=c.getContext('2d'),ge=e.getContext('2d'),cx=S/2,Rr=S/2;
  g.fillStyle='#161214';g.fillRect(0,0,S,S);ge.fillStyle='#000';ge.fillRect(0,0,S,S);const rings=[.12,.22,.32,.42,.53,.64,.75,.86,.97];
  rings.forEach((r,i)=>{const r0=(i?rings[i-1]:0)*Rr,r1=r*Rr,n=i?8+i*6:1;for(let k=0;k<n;k++){const a0=(k+(i%2)*.5)/n*Math.PI*2,a1=(k+1+(i%2)*.5)/n*Math.PI*2;g.beginPath();g.arc(cx,cx,r1,a0,a1);g.arc(cx,cx,r0,a1,a0,true);g.closePath();
    const sh=Math.floor(18+Math.random()*12);g.fillStyle=`rgb(${sh+4},${sh},${sh+2})`;g.fill();}});
  for(let i=0;i<26000;i++){const x=Math.random()*S,y=Math.random()*S,s=Math.random()*3+1;g.fillStyle=Math.random()<.5?`rgba(255,220,200,${Math.random()*.04})`:`rgba(0,0,0,${Math.random()*.14})`;g.fillRect(x,y,s,s);}
  g.strokeStyle='rgba(4,2,2,.9)';g.lineWidth=5;rings.forEach((r,i)=>{g.beginPath();g.arc(cx,cx,r*Rr,0,Math.PI*2);g.stroke();const r0=(i?rings[i-1]:0)*Rr,n=i?8+i*6:0;for(let k=0;k<n;k++){const a=(k+(i%2)*.5)/n*Math.PI*2;g.beginPath();g.moveTo(cx+Math.cos(a)*r0,cx+Math.sin(a)*r0);g.lineTo(cx+Math.cos(a)*r*Rr,cx+Math.sin(a)*r*Rr);g.stroke();}});
  // molten channels (glow) with a soft halo
  const chan=(ctx,w,col,blur)=>{ctx.save();ctx.filter=blur?`blur(${blur}px)`:'none';ctx.strokeStyle=col;ctx.lineWidth=w;[.27,.585,.955].forEach(r=>{ctx.beginPath();ctx.arc(cx,cx,r*Rr,0,Math.PI*2);ctx.stroke();});
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*.29*Rr,cx+Math.sin(a)*.29*Rr);ctx.lineTo(cx+Math.cos(a)*.57*Rr,cx+Math.sin(a)*.57*Rr);ctx.stroke();}ctx.restore();};
  chan(ge,26,'rgba(255,70,10,.55)',14);chan(ge,9,'#ff8a2a',0);chan(ge,3,'#ffd890',0);chan(g,12,'#2a0a04',0);
  // gold inlay sacred geometry
  const GOLD='#c9a45c';g.strokeStyle=GOLD;[[.30,6],[.31,2],[.46,4],[.70,5],[.715,2],[.93,7]].forEach(([r,w])=>{g.lineWidth=w;g.beginPath();g.arc(cx,cx,r*Rr,0,Math.PI*2);g.stroke();});
  const star=(ctx,r,n,skip,w)=>{ctx.lineWidth=w;ctx.beginPath();for(let i=0;i<=n;i++){const a=(i*skip)/n*Math.PI*2-Math.PI/2,x=cx+Math.cos(a)*r*Rr,y=cx+Math.sin(a)*r*Rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();};
  star(g,.46,12,5,4);star(g,.3,6,2,4);
  for(let k=0;k<36;k++){const a=k/36*Math.PI*2;g.lineWidth=k%3?2:5;g.beginPath();g.moveTo(cx+Math.cos(a)*.715*Rr,cx+Math.sin(a)*.715*Rr);g.lineTo(cx+Math.cos(a)*.93*Rr,cx+Math.sin(a)*.93*Rr);g.stroke();}
  [[.79,60,20],[.38,32,15],[.645,48,14]].forEach(([r,n,sz])=>{for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=cx+Math.cos(a)*r*Rr,y=cx+Math.sin(a)*r*Rr;g.lineWidth=3;g.strokeStyle=GOLD;glyphF(g,x,y,sz,a+Math.PI/2);if(k%2===0){ge.lineWidth=3.5;ge.strokeStyle='#ff9a3a';glyphF(ge,x,y,sz,a+Math.PI/2);}}});
  const dn=cv=>{if(TQ>=1)return cv;const s=Math.round(S*TQ),o=document.createElement('canvas');o.width=o.height=s;o.getContext('2d').drawImage(cv,0,0,s,s);return o;};const map=new THREE.CanvasTexture(dn(c)),em=new THREE.CanvasTexture(dn(e));map.colorSpace=em.colorSpace=THREE.SRGBColorSpace;map.anisotropy=em.anisotropy=4;return{map,em};}
const SH_V='#ifdef USE_INSTANCING\n#define IMX instanceMatrix\n#else\n#define IMX mat4(1.)\n#endif\nvarying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*IMX*vec4(position,1.);vN=normalize(normalMatrix*mat3(IMX)*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const SH_F=`uniform float time;uniform vec3 c1;uniform vec3 c2;uniform float op;uniform float sp;varying vec2 vUv;varying vec3 vN;varying vec3 vV;${NOISE3}
 void main(){float f=abs(dot(normalize(vN),normalize(vV)));float core=pow(f,2.2);float a0=vUv.x*6.2832;float n=fb(vec3(cos(a0)*1.6,sin(a0)*1.6,vUv.y*7.-time*sp));float st=smoothstep(.42,.82,n);
  float fade=smoothstep(0.,.06,vUv.y)*pow(1.-vUv.y,1.4);vec3 col=mix(c1,c2,st);float a=core*fade*(.2+st*.85)*op;gl_FragColor=vec4(col*a,a);}`;
function heatShaft(x,y,z){[[1.6,2.6,110,'#ff8a3a','#ffe0a0',.9,1.1],[3.6,6,90,'#c8300a','#ffb050',.4,.6]].forEach(([rb,rt,Hh,a,b,op,sp])=>{const m=new THREE.ShaderMaterial({uniforms:{time:TU,c1:{value:new THREE.Color(a)},c2:{value:new THREE.Color(b)},op:{value:op},sp:{value:sp}},
  vertexShader:SH_V,fragmentShader:SH_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false});const me=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,Hh,40,20,true),m);me.position.set(x,y+Hh/2,z);W.add(me);});}
function fireSanctum(cx,cy,cz,FR){FR=FR||24;const t=fireFloorTex(),fm=new THREE.MeshStandardMaterial({map:t.map,emissiveMap:t.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.2,roughness:.45,metalness:.1});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(FR,Math.round(240*Q)),fm);floor.rotation.x=-Math.PI/2;floor.position.set(cx,cy+.08,cz);floor.receiveShadow=true;W.add(floor);
  anim.push(tt=>{fm.emissiveIntensity=1.05+Math.sin(tt*1.3)*.22+Math.sin(tt*3.1)*.07;});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(FR+.15,.36,8,Math.round(300*Q)),goldM2);rim.rotation.x=Math.PI/2;rim.position.set(cx,cy+.14,cz);W.add(rim);
  // broken curved obsidian walls with gold cornices and glowing rune bands
  for(let k=0;k<9;k++){if(k%3===2)continue;const a0=k/9*Math.PI*2+.12,len=Math.PI*2/9*.82,h=rnd(3.2,5.2)*(k%3===1?.6:1);
    const sec=(r0,r1)=>{const s=new THREE.Shape(),n=16;for(let i=0;i<=n;i++){const a=a0+len*i/n;i?s.lineTo(Math.cos(a)*r1,-Math.sin(a)*r1):s.moveTo(Math.cos(a)*r1,-Math.sin(a)*r1);}for(let i=n;i>=0;i--){const a=a0+len*i/n;s.lineTo(Math.cos(a)*r0,-Math.sin(a)*r0);}return s;};
    const w=new THREE.ExtrudeGeometry(sec(FR+2.6,FR+4.2),{depth:h+2,bevelEnabled:true,bevelThickness:.15,bevelSize:.15,bevelSegments:2});w.rotateX(-Math.PI/2);w.translate(cx,cy-2,cz);const wm=new THREE.Mesh(w,wallM);wm.castShadow=wm.receiveShadow=true;W.add(wm);
    const cap=new THREE.ExtrudeGeometry(sec(FR+2.4,FR+4.4),{depth:.35,bevelEnabled:false});cap.rotateX(-Math.PI/2);cap.translate(cx,cy+h+.15,cz);W.add(new THREE.Mesh(cap,goldM2));
    const band=new THREE.ExtrudeGeometry(sec(FR+2.5,FR+2.62),{depth:.28,bevelEnabled:false});band.rotateX(-Math.PI/2);band.translate(cx,cy+h*.55,cz);W.add(new THREE.Mesh(band,new THREE.MeshBasicMaterial({color:'#ff8a2a'})));}}
// ================= Fire Heart — high-detail treasure (gem heart, engraved rings, cradle, colonnade) =================
function ringTexF(){const W=2048,H2=64,c=document.createElement('canvas'),e=document.createElement('canvas');c.width=e.width=W;c.height=e.height=H2;const g=c.getContext('2d'),ge=e.getContext('2d');
  g.fillStyle='#1c1618';g.fillRect(0,0,W,H2);ge.fillStyle='#000';ge.fillRect(0,0,W,H2);g.fillStyle='#c9a45c';g.fillRect(0,3,W,4);g.fillRect(0,H2-7,W,4);ge.fillStyle='#3a1a04';ge.fillRect(0,3,W,4);ge.fillRect(0,H2-7,W,4);
  for(let k=0;k<52;k++){const x=(k+.5)/52*W;g.strokeStyle='#c9a45c';g.lineWidth=2.5;glyphF(g,x,H2/2,12,0);ge.strokeStyle='#ff8a2a';ge.lineWidth=3.5;glyphF(ge,x,H2/2,12,0);}
  const m=new THREE.CanvasTexture(c),em=new THREE.CanvasTexture(e);m.colorSpace=em.colorSpace=THREE.SRGBColorSpace;m.wrapS=em.wrapS=THREE.RepeatWrapping;m.anisotropy=em.anisotropy=8;return{m,em};}
function flutedG(rb,rt,h){const g=new THREE.CylinderGeometry(rt,rb,h,48,6,false);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);if(r<.01)continue;const f=1-.05*Math.pow(Math.abs(Math.cos(a*8)),.6);p.setX(i,x*f);p.setZ(i,z*f);}g.computeVertexNormals();return g;}
const HEART_F=`uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vV;${NOISE3}
 void main(){vec3 q=vP*.8;float a=time*.22;q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz;float w=fb(q*1.3+time*.09);float n=fb(q+vec3(w*1.9,w,-w)+vec3(0.,time*.07,0.));
  vec3 c=mix(vec3(.06,.008,.0),vec3(.55,.07,.01),smoothstep(.3,.55,n));c=mix(c,vec3(1.,.36,.04),smoothstep(.52,.72,n));c+=vec3(1.,.82,.45)*pow(smoothstep(.66,.9,n),3.)*1.4;
  float core=pow(max(0.,1.-length(vP)/4.),3.);c+=vec3(1.,.75,.4)*core*.9;float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.3);c=c*(1.-f*.35)+vec3(1.,.55,.2)*f*.8;gl_FragColor=vec4(c,1.);}`;
function fireHeartHQ(cx,G,cz,opt){opt=opt||{};const HY=G+(opt.h||15);
  fireSanctum(cx,G,cz,opt.FR);
  const obsM=new THREE.MeshPhongMaterial({color:C('#141014'),specular:C('#ff9a6a'),shininess:85});
  // central pedestal (low, engraved)
  {const p=new THREE.Mesh(new THREE.CylinderGeometry(5,5.6,.7,72),obsM);p.position.set(cx,G+.35,cz);p.castShadow=p.receiveShadow=true;W.add(p);
   [[5.62,G+.05],[5.05,G+.72]].forEach(([r,y])=>{const t=new THREE.Mesh(new THREE.TorusGeometry(r,.16,8,120),goldM2);t.rotation.x=Math.PI/2;t.position.set(cx,y,cz);W.add(t);});
   const pg=glow('#ff7a2a',14,.35);pg.position.set(cx,G+1,cz);W.add(pg);}
  // colonnade: six fluted obsidian columns with gold rings, capitals and floating ember crystals
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6,x=cx+Math.cos(a)*(opt.colR||14),z=cz+Math.sin(a)*(opt.colR||14),h=(opt.colH||17)+(k%2)*3;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(2,2.2,1.1,8),obsM);base.position.set(x,G+.55,z);base.rotation.y=Math.PI/8;base.castShadow=true;W.add(base);
    const sh=new THREE.Mesh(flutedG(1.25,1.1,h),obsM);sh.position.set(x,G+1.1+h/2,z);sh.castShadow=sh.receiveShadow=true;W.add(sh);
    [G+1.4,G+1.1+h-.5].forEach(y=>{const r=new THREE.Mesh(new THREE.TorusGeometry(1.32,.15,8,48),goldM2);r.rotation.x=Math.PI/2;r.position.set(x,y,z);W.add(r);});
    const band=new THREE.Mesh(new THREE.TorusGeometry(1.28,.07,6,48),new THREE.MeshBasicMaterial({color:'#ff8a2a'}));band.rotation.x=Math.PI/2;band.position.set(x,G+1.1+h*.62,z);W.add(band);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.2,1,48),obsM);cap.position.set(x,G+1.6+h,z);cap.castShadow=true;W.add(cap);
    const ab=new THREE.Mesh(new THREE.BoxGeometry(3.8,.7,3.8),obsM);ab.position.set(x,G+2.45+h,z);ab.rotation.y=-a;W.add(ab);
    const gb=new THREE.Mesh(new THREE.BoxGeometry(3.9,.14,3.9),goldM2);gb.position.set(x,G+2.1+h,z);gb.rotation.y=-a;W.add(gb);
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(.8,0),new THREE.MeshBasicMaterial({color:'#ffb060'}));cr.scale.y=1.7;cr.position.set(x,G+5+h,z);W.add(cr);const cg=glow('#ff7a2a',5,.55);cr.add(cg);
    const ph=R()*6,by=G+5+h;anim.push(t=>{cr.rotation.y=t*.9+ph;cr.position.y=by+Math.sin(t*1.3+ph)*.3;});}
  // braziers: gold bowls on tripods with living flames
  for(let k=0;k<4;k++){const a=k/4*Math.PI*2,x=cx+Math.cos(a)*(opt.brzR||9),z=cz+Math.sin(a)*(opt.brzR||9);
    for(let l=0;l<3;l++){const b=l/3*6.28,leg=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,1.9,8),goldM2);leg.position.set(x+Math.cos(b)*.45,G+.9,z+Math.sin(b)*.45);leg.rotation.set(Math.sin(b)*.25,0,-Math.cos(b)*.25);W.add(leg);}
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.85,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),goldM2);bowl.rotation.x=Math.PI;bowl.position.set(x,G+2.3,z);W.add(bowl);
    const coal=new THREE.Mesh(new THREE.CircleGeometry(.8,24),new THREE.MeshBasicMaterial({color:'#ff6a1a'}));coal.rotation.x=-Math.PI/2;coal.position.set(x,G+2.25,z);W.add(coal);
    const f1=glow('#ff7a2a',3.4,.85),f2=glow('#ffd890',1.5,.9);f1.position.set(x,G+3.2,z);f2.position.set(x,G+2.8,z);W.add(f1);W.add(f2);
    const ph=R()*6;anim.push(t=>{const s=.85+.15*Math.sin(t*9+ph)+.08*Math.sin(t*23+ph);f1.scale.set(3.4*s,4.4*s,1);f1.position.y=G+3.2+.15*Math.sin(t*7+ph);});}
  // the heart: swirling molten core inside a faceted ruby shell
  const heart=new THREE.Group();heart.position.set(cx,HY,cz);W.add(heart);
  const innerM=new THREE.ShaderMaterial({uniforms:{time:TU},vertexShader:'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:HEART_F});
  const inner=new THREE.Mesh(new THREE.SphereGeometry(3.6,Math.round(96*Q),Math.round(64*Q)),innerM);inner.scale.y=1.18;heart.add(inner);
  const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(4.6,1),new THREE.MeshPhongMaterial({color:C('#ff5a3a'),specular:C('#ffffff'),shininess:220,emissive:C('#2a0600'),flatShading:true,transparent:true,opacity:.28,depthWrite:false}));gem.scale.y=1.22;heart.add(gem);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(4.62,1)),new THREE.LineBasicMaterial({color:'#ffb070',transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));edges.scale.y=1.22;heart.add(edges);
  const h1=glow('#ff6a1a',30,.35),h2=glow('#ffd080',12,.4);heart.add(h1);heart.add(h2);
  const hl=new FakePL(C('#ff8a3a'),2.6,95,1.6);heart.add(hl);
  const rt=ringTexF(),gyro=[7.4,9.2,11].map((r,k)=>{const g=new THREE.Group();heart.add(g);
    const m=new THREE.MeshPhongMaterial({map:rt.m,emissiveMap:rt.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.3,specular:C('#ffd8a0'),shininess:90});rt.m.repeat.set(3,1);rt.em.repeat.set(3,1);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.42,Math.round(14*Q),Math.round(240*Q)),m);ring.castShadow=true;g.add(ring);
    const o=new THREE.Mesh(new THREE.TorusGeometry(r+.55,.1,6,Math.round(200*Q)),goldM2);g.add(o);const i2=new THREE.Mesh(new THREE.TorusGeometry(r-.55,.1,6,Math.round(200*Q)),goldM2);g.add(i2);
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2,gm=new THREE.Mesh(new THREE.OctahedronGeometry(.48,0),new THREE.MeshBasicMaterial({color:k===1?'#ffd890':'#ff7a3a'}));gm.position.set(Math.cos(a)*r,Math.sin(a)*r,0);gm.scale.set(1,1.6,1);g.add(gm);}return g;});
  // golden cradle rising from the pedestal
  for(let k=0;k<4;k++){const a=k/4*Math.PI*2+Math.PI/4,pts=[V(cx+Math.cos(a)*4.4,G+.7,cz+Math.sin(a)*4.4),V(cx+Math.cos(a)*6.6,G+5,cz+Math.sin(a)*6.6),V(cx+Math.cos(a)*6.2,HY-2.5,cz+Math.sin(a)*6.2),V(cx+Math.cos(a)*4.4,HY+3,cz+Math.sin(a)*4.4),V(cx+Math.cos(a)*2.4,HY+5.6,cz+Math.sin(a)*2.4)];
    const arm=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.round(100*Q),.34,8,false),goldM2);arm.castShadow=true;W.add(arm);
    const tip=new THREE.Mesh(new THREE.OctahedronGeometry(.5,0),new THREE.MeshBasicMaterial({color:'#ffd890'}));tip.position.copy(pts[4]);tip.scale.y=1.6;W.add(tip);}
  heatShaft(cx,HY,cz);
  anim.push(t=>{heart.position.y=HY+Math.sin(t*.8)*.45;const pb=1+Math.sin(t*1.7)*.035;inner.scale.set(pb,1.18*pb,pb);gem.rotation.y=-t*.12;edges.rotation.y=-t*.12;
    h1.material.opacity=.28+Math.sin(t*1.7)*.08;hl.intensity=2.3+Math.sin(t*1.7)*.5;gyro[0].rotation.set(t*.42,0,0);gyro[1].rotation.set(1.05,t*.3,0);gyro[2].rotation.set(t*.13,0,t*.24);});
  return HY;}
// =====================================================================
//  VOLCANO REGION — one full-quality island at a time
// =====================================================================
let W=null;
const BK={},LEAVES=[],BARKL=[],BLD=[],BOMB=[],LINKS=[],puffs=[],DRIPS=[];
const qTo=d=>new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.clone().normalize()));
function put(k,geo,pos,rot,scl){geo.applyMatrix4(new THREE.Matrix4().compose(pos||V(0,0,0),new THREE.Quaternion().setFromEuler(rot||new THREE.Euler()),scl||V(1,1,1)));(BK[k]=BK[k]||[]).push(geo);}
function mergeG(list,keepUV){return mergeX(list,keepUV?['position','normal','uv']:['position','normal']);}
function mergeX(list,keys){const arr=list.map(g=>{if(!g.attributes.normal)g.computeVertexNormals();if(keys.includes('uv')&&!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    for(const k of Object.keys(g.attributes))if(!keys.includes(k))g.deleteAttribute(k);if(!g.index){const n=g.attributes.position.count,ix=new (n>65535?Uint32Array:Uint16Array)(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new THREE.BufferAttribute(ix,1));}
    for(const k of keys){const a=g.attributes[k];if(a&&a.isInterleavedBufferAttribute)g.setAttribute(k,a.clone());}return g;});
  const m=mergeGeometries(arr,false);arr.forEach(g=>g.dispose());m.computeBoundingSphere();return m;}
const basaltM=new THREE.MeshPhongMaterial({color:C('#2a2426'),specular:C('#5a4440'),shininess:22});
const basaltTopM=new THREE.MeshPhongMaterial({color:C('#3a3234'),specular:C('#7a6058'),shininess:40});
const obsidianM=addCracks(new THREE.MeshPhongMaterial({color:C('#0e0b10'),specular:C('#ff9a6a'),shininess:120}),2,.4);
const obsidianFlatM=addCracks(new THREE.MeshPhongMaterial({color:C('#0e0b10'),specular:C('#ff9a6a'),shininess:120,flatShading:true}),2,.45);
const runeM=new THREE.MeshBasicMaterial({color:'#ffa04a'});
const ironM=new THREE.MeshPhongMaterial({color:C('#2a2628'),specular:C('#8a7a70'),shininess:60});
const boneM=new THREE.MeshPhongMaterial({color:C('#cfc2b0'),specular:C('#4a4038'),shininess:18}),sootM=new THREE.MeshPhongMaterial({color:C('#2a2220'),specular:C('#1a1414'),shininess:8});
const spireM=new THREE.MeshStandardMaterial({color:C('#18110f'),roughness:.9});
const archM=addCracks(new THREE.MeshStandardMaterial({color:C('#2a2224'),roughness:.88}),2,.18);
const scarM=addCracks(new THREE.MeshStandardMaterial({color:C('#0e0a0a'),roughness:.95}),2,.95);
const boulderM=new THREE.MeshStandardMaterial({color:C('#2a2224'),roughness:.85});
const bombM=addCracks(new THREE.MeshStandardMaterial({color:C('#1e1614'),roughness:.8}),2,.85);
// textures
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texOf(c,rep){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
const SMK=(()=>{const S=256,c=cvs(S,S),g=c.getContext('2d');for(let i=0;i<60;i++){const x=S/2+rnd(-50,50),y=S/2+rnd(-50,50),r=rnd(30,80),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.18)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,S,S);}return new THREE.CanvasTexture(c);})();
const EL=(()=>{const Wd=256,H2=512,c=cvs(Wd,H2),e=cvs(Wd,H2),g=c.getContext('2d'),ge=e.getContext('2d');ge.fillStyle='#000';ge.fillRect(0,0,Wd,H2);
  const leaf=ctx=>{ctx.beginPath();ctx.moveTo(Wd/2,H2-6);ctx.bezierCurveTo(Wd*.02,H2*.65,Wd*.18,H2*.18,Wd/2,6);ctx.bezierCurveTo(Wd*.82,H2*.18,Wd*.98,H2*.65,Wd/2,H2-6);ctx.closePath();};
  const gr=g.createLinearGradient(0,H2,0,0);gr.addColorStop(0,'#1a0c08');gr.addColorStop(.7,'#2a120a');gr.addColorStop(1,'#4a1a0a');g.fillStyle=gr;leaf(g);g.fill();
  ge.save();leaf(ge);ge.clip();ge.strokeStyle='#ff7a20';ge.lineWidth=18;leaf(ge);ge.stroke();ge.globalAlpha=.7;ge.strokeStyle='#ff5a10';ge.lineWidth=5;ge.beginPath();ge.moveTo(Wd/2,H2);ge.lineTo(Wd/2,20);ge.stroke();
  for(let k=1;k<7;k++){const y=H2-k*H2*.13;for(const sd of[-1,1]){ge.beginPath();ge.moveTo(Wd/2,y);ge.lineTo(Wd/2+sd*Wd*.3,y-H2*.1);ge.stroke();}}ge.restore();return{map:texOf(c),em:texOf(e)};})();
const BARK=(()=>{const Wd=256,H2=512,c=cvs(Wd,H2),e=cvs(Wd,H2),g=c.getContext('2d'),ge=e.getContext('2d');g.fillStyle='#16100e';g.fillRect(0,0,Wd,H2);ge.fillStyle='#000';ge.fillRect(0,0,Wd,H2);
  for(let i=0;i<80;i++){const x=Math.random()*Wd;g.strokeStyle=Math.random()<.5?'rgba(0,0,0,.6)':'rgba(70,56,50,.3)';g.lineWidth=rnd(2,8);g.beginPath();g.moveTo(x,0);for(let y=0;y<=H2;y+=32)g.lineTo(x+Math.sin(y*.02+i)*6,y);g.stroke();}
  ge.filter='blur(1.5px)';for(let i=0;i<34;i++){const x=Math.random()*Wd,y=Math.random()*H2;ge.strokeStyle='#ff6a1a';ge.lineWidth=rnd(1.5,3.5);ge.beginPath();ge.moveTo(x,y);for(let j=0;j<5;j++)ge.lineTo(x+rnd(-8,8),y+j*rnd(6,14));ge.stroke();}
  return{map:texOf(c,[1,3]),em:texOf(e,[1,3])};})();
const barkM=new THREE.MeshPhongMaterial({map:BARK.map,emissiveMap:BARK.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1,specular:C('#2a1a14'),shininess:10});
const leafMat=new THREE.MeshPhongMaterial({map:EL.map,emissiveMap:EL.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:.9,alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide,shininess:20});
const boneVM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:0});
const SHARED=new Set([boneVM,basaltM,basaltTopM,obsidianM,obsidianFlatM,runeM,ironM,boneM,sootM,spireM,archM,scarM,boulderM,bombM,barkM,leafMat,goldM2,wallM]);
function newWorld(){UGLOW={value:1};UGLO={value:1};UFRONT={value:1e5};USOFT={value:6};OWNU=false;WM.clear();HEAT=null;
  W=new THREE.Group();anim.length=0;lavaMats=[];Object.keys(BK).forEach(k=>delete BK[k]);[LEAVES,BARKL,BLD,BOMB,LINKS,puffs,DRIPS,EMB,SPK,ARC].forEach(a=>a.length=0);}
function smokeSrc(p,r,n,s,big){n=Math.max(1,Math.round(n*PQ));for(let i=0;i<n;i++)puffs.push({p:p.clone(),r,s:s||1,big:!!big,life:R(),sp:rnd(.7,1.3),dx:rnd(-1,1),dz:rnd(-1,1),rot:rnd(-.3,.3)});}
const EMB=[],SPK=[],ARC=[];function embers(cx,cz,r,y0,y1,n){n=Math.round(n*PQ);if(n<4)return;EMB.push({cx,cz,r,y0,y1,n});}
function boulder(x,y,z,s,hot){if(s<MINB)return;(hot?BOMB:BLD).push(new THREE.Matrix4().compose(V(x,y+s*.25,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(R()*3,R()*3,R()*3)),V(s,s,s)));}
function drips(list,fall){list.forEach(p=>DRIPS.push({p,fall}));}
// tapered gnarled tube: one continuous mesh per limb, radius from rf(t), bark-ridge noise, closed tip
function taperTube(pts,segs,rad,rf,seed,nz){segs=Math.max(3,Math.round(segs*QT));rad=Math.max(5,Math.round(rad*QT));const cv=new THREE.CatmullRomCurve3(pts),fr=cv.computeFrenetFrames(segs,false),pos=[],uv=[],idx=[],L=cv.getLength();
  for(let i=0;i<=segs;i++){const t=i/segs,P=cv.getPointAt(t),N=fr.normals[i],B=fr.binormals[i],r=rf(t);
    for(let j=0;j<=rad;j++){const a=j/rad*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),f=1+(fbm2(ca*1.6+seed,t*L*.12+sa*1.6)-.5)*nz+.07*Math.sin(a*7+t*L*.15+seed)+.04*Math.sin(a*13-t*L*.3);
      pos.push(P.x+(N.x*ca+B.x*sa)*r*f,P.y+(N.y*ca+B.y*sa)*r*f,P.z+(N.z*ca+B.z*sa)*r*f);uv.push(j/rad*2,t*L*.06);}}
  for(let i=0;i<segs;i++)for(let j=0;j<rad;j++){const a=i*(rad+1)+j,b=a+1,c=a+rad+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const tip=pos.length/3,E=cv.getPointAt(1),T=cv.getTangentAt(1);pos.push(E.x+T.x*rf(1)*1.2,E.y+T.y*rf(1)*1.2,E.z+T.z*rf(1)*1.2);uv.push(.5,L*.06);for(let j=0;j<rad;j++)idx.push(segs*(rad+1)+j,tip,segs*(rad+1)+j+1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();BARKL.push(g);return cv;}
function charredTree(p,s){const sd=R()*50,Ht=15*s,pts=[];for(let k=0;k<=9;k++){const t=k/9;pts.push(V(p.x+Math.sin(t*3.4+sd)*2.2*s*t,p.y-1.2*s+t*(Ht+1.2*s),p.z+Math.cos(t*2.8+sd)*2.2*s*t));}
  // trunk: base flare -> twisting taper, one seamless mesh
  const trR=t=>s*(1.15*(1-t*.72)+1.5*Math.exp(-t*11)),cv=taperTube(pts,Math.round(30+s*6),18,trR,sd,.32);
  // roots: start inside the trunk, swell out like buttresses, then thin and dive into the ground
  const nR=7;for(let k=0;k<nR;k++){const a=k/nR*6.28+rnd(-.25,.25),dx=Math.cos(a),dz=Math.sin(a),sx=-dz,L=rnd(5.5,8)*s,w=rnd(-.5,.5);
    const rp=[0,.12,.3,.55,.8,1].map((u,i)=>V(p.x+dx*(.3*s+u*L)+sx*Math.sin(u*3+w)*s*.9,p.y+[2.4,1.6,.75,.2,-.3,-1.4][i]*s,p.z+dz*(.3*s+u*L)-dx*Math.sin(u*3+w)*s*.9));
    taperTube(rp,22,10,t=>s*(.95*Math.pow(1-t,1.3)+.1),sd+k*3,.3);
    if(R()<.7){const u0=rnd(.35,.6),q=rp[2].clone().lerp(rp[3],u0),b=a+rnd(.5,.9)*(R()<.5?-1:1),l2=L*rnd(.35,.5);
      taperTube([q,V(q.x+Math.cos(b)*l2*.5,q.y-.15*s,q.z+Math.sin(b)*l2*.5),V(q.x+Math.cos(b)*l2,p.y-1*s,q.z+Math.sin(b)*l2)],12,7,t=>s*(.38*(1-t)+.06),sd+k*7,.25);}}
  // branches: each grows out of its parent's surface, starting buried inside and inheriting the parent's thickness
  const branch=(pc,pt,pr,dir,len,d)=>{const st=pc.getPointAt(pt),en=st.clone().addScaledVector(dir,len),r0=pr*.62;
    const b0=st.clone().addScaledVector(dir,-pr*.4),m1=st.clone().lerp(en,.35).add(V(rnd(-1,1),rnd(.2,.8),rnd(-1,1)).multiplyScalar(len*.1)),m2=st.clone().lerp(en,.7).add(V(rnd(-1,1),rnd(-.2,.5),rnd(-1,1)).multiplyScalar(len*.12));
    const c=taperTube([b0,st,m1,m2,en],Math.round(8+len*.5),d>1?10:d>0?8:6,t=>r0*(1-t*.78)+r0*.25*Math.exp(-t*14),sd+len,.22);
    if(d===0){for(let k=0;k<7;k++)LEAVES.push(new THREE.Matrix4().compose(en.clone().add(V(rnd(-1,1),rnd(-.6,1),rnd(-1,1)).multiplyScalar(s*.9)),new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd(-1.2,.6),R()*6.28,rnd(-.5,.5),'YXZ')),V(1.3*s,1.6*s,1.9*s)));return;}
    const n=d>1?3:2;for(let b=0;b<n;b++){const ct=rnd(.55,.92),nd=dir.clone().applyAxisAngle(V(R()-.5,0,R()-.5).normalize(),rnd(.45,.85)).add(V(0,.18,0)).normalize();branch(c,ct,r0*(1-ct*.78),nd,len*rnd(.6,.72),d-1);}
    if(d>1)branch(c,.97,r0*.3,dir.clone().add(V(rnd(-.3,.3),.1,rnd(-.3,.3))).normalize(),len*.55,d-1);};
  for(let b=0;b<4;b++){const a=b/4*6.28+rnd(-.3,.3),t=rnd(.55,.9);branch(cv,t,trR(t),V(Math.cos(a),rnd(.3,.8),Math.sin(a)).normalize(),rnd(4.5,6.5)*s,TD);}
  // knots / burls where the bark bulges
  for(let k=0;k<4;k++){const t=rnd(.15,.6),q=cv.getPointAt(t),a=R()*6.28,r=trR(t),g=new THREE.IcosahedronGeometry(r*.45,2),pp=g.attributes.position;for(let i=0;i<pp.count;i++){const f=1+(fbm2(pp.getX(i)*2+k,pp.getY(i)*2+pp.getZ(i))-.5)*.5;pp.setXYZ(i,pp.getX(i)*f,pp.getY(i)*f*1.3,pp.getZ(i)*f);}
    g.translate(q.x+Math.cos(a)*r*.75,q.y,q.z+Math.sin(a)*r*.75);g.computeVertexNormals();BARKL.push(g);}}
function groundLeaves(x,y,z,n,s){n=Math.round(n*Q*Q);for(let k=0;k<n;k++){const a=R()*6.28,d=rnd(0,1.6)*s;LEAVES.push(new THREE.Matrix4().compose(V(x+Math.cos(a)*d,y+.1,z+Math.sin(a)*d),new THREE.Quaternion().setFromEuler(new THREE.Euler(-rnd(.2,.9),R()*6.28,0,'YXZ')),V(1.1*s,1.2*s,1.6*s)));}}
function torusLinks(a,b,sag,rad,colA,colB){const dir=b.clone().sub(a).normalize(),L=a.distanceTo(b),n=Math.floor(L/(rad*1.7)),base=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),dir);
  for(let k=0;k<=n;k++){const t=k/n,q=a.clone().lerp(b,t);q.y-=Math.sin(Math.PI*t)*sag;LINKS.push({m:new THREE.Matrix4().compose(q,base.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,k%2?Math.PI/2:0))),V(rad/.55,rad/.55,rad/.55)),c:new THREE.Color(colA).lerp(new THREE.Color(colB),Math.pow(Math.sin(Math.PI*t),1.3))});}}
function spike(x,y,z,h,r,lean){SPK.push({x,y,z,h,r});const g=new THREE.CylinderGeometry(r*.08,r,h,9,8);const p=g.attributes.position;for(let i=0;i<p.count;i++){const yy=p.getY(i),f=1+(fbm2(Math.atan2(p.getZ(i),p.getX(i))*2+x,yy*.12+z)-.5)*.55;p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}g.computeVertexNormals();
  put('obs',g,V(x,y+h/2-1,z),lean||new THREE.Euler(rnd(-.08,.08),R()*3,rnd(-.08,.08)));}
// eruption: light-particle burst + flash
function eruption(gp,sc,P,skyK,o){o=Object.assign({v:1,n:1,g:1,f:1,size:1,gd:null,term:0,life:1},o||{});o.n*=PQ;const sprays=[[Math.round(1100*o.n),1.5*o.size],[Math.round(200*o.n),3.4*o.size]].map(([N,size])=>{const g=new THREE.BufferGeometry(),pp=new Float32Array(N*3),pc=new Float32Array(N*3),base=[],v=[],life=new Float32Array(N);for(let i=0;i<N;i++){base.push(new THREE.Color());v.push(V());}
    g.setAttribute('position',new THREE.BufferAttribute(pp,3));g.setAttribute('color',new THREE.BufferAttribute(pc,3));const pts=new THREE.Points(g,new THREE.PointsMaterial({size,map:dot,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;W.add(pts);return{N,g,pp,pc,base,v,life,next:0,acc:0};});
  const HOT=new THREE.Color('#ffe9a8'),MID=new THREE.Color('#ff8a20'),COOL=new THREE.Color('#e8260a');
  const emit=(S,kind)=>{const i=S.next;S.next=(S.next+1)%S.N;const a=R()*6.28,rr=rnd(0,4*sc*.6);S.pp[i*3]=gp.x+Math.cos(a)*rr;S.pp[i*3+1]=gp.y;S.pp[i*3+2]=gp.z+Math.sin(a)*rr;
    if(kind===2){const sp=rnd(14,34),el=rnd(.45,1.45);S.v[i].set(Math.cos(a)*Math.cos(el)*sp,Math.sin(el)*sp*1.5,Math.sin(a)*Math.cos(el)*sp);S.life[i]=rnd(1.8,3.4)*o.life;}else{S.v[i].set(rnd(-5,5),rnd(22,44),rnd(-5,5));S.life[i]=rnd(1.5,2.8)*o.life;}S.v[i].multiplyScalar(sc*o.v);
    const h=R();S.base[i].copy(h<.45?COOL:MID).lerp(h<.45?MID:HOT,h<.45?h/.45:(h-.45)/.55).multiplyScalar(.9);};
  const fl=new FakePL(C('#ff8a3a'),0,180*sc,1.4);fl.position.copy(gp).add(V(0,14,0));W.add(fl);let was=false;
  anim.push((t,dt)=>{const ph=t%P,on=ph>P-2.4&&ph<P-.4,k=on?Math.sin((ph-(P-2.4))/2*Math.PI):0;fl.intensity=k*4*o.f;if(skyK)skyMat.uniforms.flash.value=k*skyK;
    if(on&&!was)sprays.forEach((S,si)=>{for(let n=0;n<Math.round((si?110:480)*o.n);n++)emit(S,2);});was=on;
    sprays.forEach((S,si)=>{const rate=on?(si?35:300)*o.n*(.3+k):0;S.acc+=rate*dt;while(S.acc>=1){S.acc-=1;emit(S,1);}
      for(let i=0;i<S.N;i++){if(S.life[i]<=0){S.pc[i*3]=S.pc[i*3+1]=S.pc[i*3+2]=0;continue;}S.life[i]-=dt;const vv=S.v[i];if(o.gd!=null&&vv.y<0){vv.y-=22*o.gd*dt;vv.x*=1-dt*1.6;vv.z*=1-dt*1.6;if(o.term&&vv.y<-o.term)vv.y=-o.term;}else{vv.y-=22*o.g*dt;vv.multiplyScalar(1-dt*.4);}S.pp[i*3]+=vv.x*dt;S.pp[i*3+1]+=vv.y*dt;S.pp[i*3+2]+=vv.z*dt;
        const f=clamp(S.life[i],0,1)*(.7+.3*Math.sin(t*25+i));S.pc[i*3]=S.base[i].r*f;S.pc[i*3+1]=S.base[i].g*f;S.pc[i*3+2]=S.base[i].b*f;}S.g.attributes.position.needsUpdate=S.g.attributes.color.needsUpdate=true;});});}

// ---------------- island core ----------------
function island(cfg){const R0=cfg.R,ph=[R()*6,R()*6,R()*6],cx=cfg.cx||0,cz=cfg.cz||0,cy=cfg.cy||0;
  const ol=a=>R0*(1+.07*Math.sin(a*3+ph[0])+.045*Math.sin(a*5+ph[1])+.03*Math.sin(a*9+ph[2]));
  const Hw=(x,z)=>{const lx=x-cx,lz=z-cz,r=Math.hypot(lx,lz),a=Math.atan2(lz,lx),ed=ol(a),t=clamp((r-(ed-R0*.2))/(R0*.2),0,1);let h=cfg.H(lx,lz);h=h*(1-t*.65)+(1.5+fbm2(x*.1,z*.1)*3)*t*.65;return cy+h;};
  return{R0,cx,cz,cy,ol,Hw,depth:cfg.depth||R0*1.2,rivers:[],inside:(x,z,m)=>Math.hypot(x-cx,z-cz)<ol(Math.atan2(z-cz,x-cx))-(m||0)};}
function traceRiver(I,start,dir,bias){let p=start.clone(),d=dir.clone().setY(0).normalize();const pts=[];
  for(let i=0;i<700;i++){const e=.8,hx=(I.Hw(p.x+e,p.z)-I.Hw(p.x-e,p.z))/(2*e),hz=(I.Hw(p.x,p.z+e)-I.Hw(p.x,p.z-e))/(2*e),g=V(-hx,0,-hz);if(g.lengthSq()>1e-6)g.normalize();
    const b=bias?bias(p):V(p.x-I.cx,0,p.z-I.cz).normalize().multiplyScalar(.45);d.lerp(g.add(b),.3).normalize();p=p.clone().addScaledVector(d,1.5);pts.push(p.clone());if(!I.inside(p.x,p.z,1.2))break;}
  for(let k=0;k<3;k++)for(let i=1;i<pts.length-1;i++){pts[i].x=(pts[i-1].x+pts[i].x*2+pts[i+1].x)/4;pts[i].z=(pts[i-1].z+pts[i].z*2+pts[i+1].z)/4;}
  pts.forEach(q=>q.y=I.Hw(q.x,q.z)+.35);for(let i=1;i<pts.length;i++)pts[i].y=Math.min(pts[i].y,pts[i-1].y+.02);I.rivers.push(pts);return pts;}
let ISL=[];const nearRiver=(x,z,d)=>ISL.some(I=>I.rivers.some(rv=>rv.some(p=>(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z)<d*d)));
function buildHeat(blobs){const TS=1024,toT=(x,z)=>[(x/W2*.5+.5)*TS,(z/W2*.5+.5)*TS],c=cvs(TS,TS),g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,TS,TS);
  const blob=(x,z,r,a)=>{const[px,py]=toT(x,z),rr=r/W2*.5*TS,gr=g.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(px,py,rr,0,6.28);g.fill();};
  ISL.forEach(I=>I.rivers.forEach(rv=>rv.forEach((p,i)=>{if(i%2===0){blob(p.x,p.z,16,.3);blob(p.x,p.z,7,.5);}})));
  ISL.forEach(I=>{for(let k=0;k<Math.round(I.R0/6);k++){const a=R()*6.28,d=Math.sqrt(R())*I.ol(a)*.9;blob(I.cx+Math.cos(a)*d,I.cz+Math.sin(a)*d,rnd(6,18),rnd(.2,.5));}});
  blobs(blob);const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;HEAT=t;}
function buildIsland(I){const R0=I.R0,cx=I.cx,cz=I.cz,cy=I.cy,ol=I.ol,Hw=I.Hw;
  // terrain
  {const NR=Math.max(12,Math.round(clamp(R0*.85,40,120)*Q)),NS=Math.max(24,Math.round(clamp(R0*2,96,280)*Q)),pos=[],col=[],idx=[];const basalt=C('#1c1718'),ash=C('#4a4040'),scorch=C('#3a1e16');
    pos.push(cx,Hw(cx,cz),cz);col.push(ash.r,ash.g,ash.b);
    for(let i=1;i<=NR;i++){const u=Math.pow(i/NR,1.2);for(let k=0;k<NS;k++){const a=k/NS*Math.PI*2,r=ol(a)*u,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=Hw(x,z);pos.push(x,y,z);
      const e=.9,sl=Math.hypot(Hw(x+e,z)-Hw(x-e,z),Hw(x,z+e)-Hw(x,z-e))/(2*e),n=fbm2(x*.08,z*.08);
      const c=basalt.clone().lerp(ash,clamp(n*1.3-.2,0,1)*clamp(1-sl,0,1)).lerp(scorch,clamp(1-n*1.6,0,1)*.45).multiplyScalar(.8+.4*fbm2(x*.3,z*.3));col.push(c.r,c.g,c.b);}}
    for(let k=0;k<NS;k++)idx.push(0,1+(k+1)%NS,1+k);for(let i=1;i<NR;i++)for(let k=0;k<NS;k++){const a=1+(i-1)*NS+k,b=1+(i-1)*NS+(k+1)%NS,c=1+i*NS+k,d=1+i*NS+(k+1)%NS;idx.push(a,b,d,a,d,c);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    const m=new THREE.Mesh(g,addCracks(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),0));m.receiveShadow=m.castShadow=true;W.add(m);}
  // underside
  {const N=Math.max(24,Math.round(clamp(R0*1.5,72,200)*Q)),L=Math.max(8,Math.round(16*Q)),depth=I.depth,rings=[];for(let i=0;i<=L;i++){const t=i/L;rings.push({t,sc:i?Math.max(.03,Math.pow(1-t,.85)*(1-.12*t)):1,off:V(Math.sin(t*2.1+cx)*R0*.1*t,0,Math.cos(t*1.7+cz)*R0*.09*t)});}
    const pos=[],col=[],idx=[],top=C('#2a2224'),mid=C('#1a1416'),bot=C('#0a0606');
    rings.forEach((rg,i)=>{for(let k=0;k<N;k++){const a=k/N*Math.PI*2,nz=fbm2(Math.cos(a)*3+7+cx*.01,rg.t*6),nz2=fbm2(a*4+cz*.01,rg.t*14),ex=ol(a);
      if(i===0)pos.push(cx+Math.cos(a)*ex,Hw(cx+Math.cos(a)*ex,cz+Math.sin(a)*ex),cz+Math.sin(a)*ex);
      else{const r=ex*rg.sc*(1+.14*(nz*2-1))+(nz2-.5)*R0*.045*rg.sc;pos.push(cx+rg.off.x+Math.cos(a)*r,cy-2-Math.pow(rg.t,1.15)*depth+(nz2-.5)*2,cz+rg.off.z+Math.sin(a)*r);}
      const c=top.clone().lerp(mid,clamp(rg.t*2,0,1)).lerp(bot,clamp(rg.t*1.4-.4,0,1)).multiplyScalar(.75+.5*nz2);col.push(c.r,c.g,c.b);}});
    for(let i=0;i<L;i++)for(let k=0;k<N;k++){const a=i*N+k,b=i*N+(k+1)%N,c=(i+1)*N+k,d=(i+1)*N+(k+1)%N;idx.push(a,b,d,a,d,c);}
    const tip=pos.length/3;pos.push(cx+rings[L].off.x,cy-depth-6,cz+rings[L].off.z);col.push(bot.r,bot.g,bot.b);for(let k=0;k<N;k++)idx.push(L*N+k,L*N+(k+1)%N,tip);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    W.add(new THREE.Mesh(g,addCracks(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93}),1)));
    const dl=[];for(let k=0;k<Math.round(R0/6);k++){const a=R()*6.28,ri=Math.floor(rnd(3,12)*L/16),rg=rings[ri],r=ol(a)*rg.sc*rnd(.3,.85),Ls=rnd(.16,.4)*depth,rs=rnd(.025,.05)*R0,y0=cy-2-Math.pow(rg.t,1.15)*depth;
      const cg=new THREE.CylinderGeometry(.2,rs,Ls,7,6),p=cg.attributes.position;for(let i=0;i<p.count;i++){const f=1+(fbm2(p.getX(i)*.7+k,p.getY(i)*.3)-.5)*.5;p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}cg.computeVertexNormals();
      const pp=V(cx+rg.off.x+Math.cos(a)*r,y0-Ls/2+1,cz+rg.off.z+Math.sin(a)*r);put('spire',cg,pp,new THREE.Euler(Math.PI,0,0));if(k%2===0)dl.push(pp.clone().add(V(0,-Ls/2,0)));}drips(dl,70);}
  // rivers & falls
  I.rivers.forEach(rv=>{if(rv.length<6)return;W.add(new THREE.Mesh(ribbon(rv,cfgW(rv,0),cfgW(rv,1),Hw),lavaMat({uv:1,sx:.6,sy:.09,flow:.9,i:1.3,side:THREE.DoubleSide,bank:1})));
    const e=rv[rv.length-1],pr=rv[Math.max(0,rv.length-4)],out=V(e.x-pr.x,0,e.z-pr.z).normalize();if(!I.inside(e.x,e.z,2.5))lavaFall(e.clone().add(V(0,-.3,0)),out,Math.min(110,I.depth*.7),rv.wEnd||6);
    const mid=rv[Math.floor(rv.length*.45)],pl=new FakePL(C('#ff6a2a'),1.2,70,1.6);pl.position.copy(mid).add(V(0,6,0));W.add(pl);});}
const cfgW=(rv,end)=>end?(rv.wEnd||7.5):(rv.wStart||3.2);
function ribbon(pts,w0,w1,Hw){const pos=[],uv=[],idx=[];let L=0;
  for(let i=0;i<pts.length;i++){const p=pts[i],nx=pts[Math.min(i+1,pts.length-1)],pv=pts[Math.max(i-1,0)],dir=V(nx.x-pv.x,0,nx.z-pv.z);if(dir.lengthSq()<1e-6)dir.set(1,0,0);dir.normalize();
    const side=V(-dir.z,0,dir.x);if(i)L+=p.distanceTo(pts[i-1]);const t=i/(pts.length-1),w=w0+(w1-w0)*t,l=p.clone().addScaledVector(side,w*(1+.25*Math.sin(i*.37))),r=p.clone().addScaledVector(side,-w*(1+.25*Math.cos(i*.29)));
    l.y=Math.min(Hw(l.x,l.z)+.3,p.y+1.5);r.y=Math.min(Hw(r.x,r.z)+.3,p.y+1.5);pos.push(l.x,l.y,l.z,r.x,r.y,r.z);uv.push(0,L,1,L);if(i){const a=(i-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function lavaFall(top,out,len,w){const side=V(-out.z,0,out.x),pos=[],uv=[],idx=[],nv=44;for(let j=0;j<=nv;j++){const v=j/nv,ww=w*(1+v*.9),c=top.clone().addScaledVector(out,3*Math.sqrt(v)+.8).add(V(0,-len*Math.pow(v,1.1),0));
    const l=c.clone().addScaledVector(side,ww),r=c.clone().addScaledVector(side,-ww);pos.push(l.x,l.y,l.z,r.x,r.y,r.z);uv.push(0,v*len,1,v*len);if(j){const a=(j-1)*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  W.add(new THREE.Mesh(g,lavaMat({uv:1,sx:.6,sy:.09,flow:1.8,i:1.35,side:THREE.DoubleSide,bank:1})));
  const lip=glow('#ffb04a',w*2.6,.42);lip.position.copy(top).add(V(0,1,0));W.add(lip);const b=glow('#ff4a10',w*7,.2);b.position.copy(top).addScaledVector(out,6).add(V(0,-len*.95,0));W.add(b);smokeSrc(top.clone().addScaledVector(out,4).add(V(0,-6,0)),w,8,.9);}
function lavaSheet(cx,y,cz,fn,o){const sh=new THREE.Shape(),N=128;for(let k=0;k<N;k++){const a=k/N*Math.PI*2,r=fn(a);k?sh.lineTo(Math.cos(a)*r,-Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,-Math.sin(a)*r);}
  const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);g.translate(cx,y,cz);const m=new THREE.Mesh(g,lavaMat(Object.assign({i:1.35,flow:.02},o||{})));W.add(m);return m;}
function crater(cx,y,cz,r,big){lavaSheet(cx,y,cz,()=>r);const cl=new FakePL(C('#ff6a2a'),3,big?260:120,1.4);cl.position.set(cx,y+8,cz);W.add(cl);const cg=glow('#ff5a14',r*4,.35);cg.position.set(cx,y+6,cz);W.add(cg);
  anim.push(t=>{cl.intensity=2.6+Math.sin(t*2.1)*.4+Math.sin(t*5.3)*.15;});smokeSrc(V(cx,y+2,cz),r*.5,big?34:18,big?1:.6,true);}
function stoneArch(p0,p1,h,th){ARC.push({p0:p0.clone(),p1:p1.clone(),h,th});const pts=[];for(let i=0;i<=18;i++){const u=i/18;pts.push(p0.clone().lerp(p1,u).add(V(0,Math.sin(u*Math.PI)*h,0)));}
  const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.round(110*Q),th,Math.max(8,Math.round(16*Q)),false),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=(fbm2(x*.12,z*.12+y*.08)-.5)*th*.8;p.setXYZ(i,x+n,y+n*.6,z-n);}g.computeVertexNormals();
  const m=new THREE.Mesh(g,wm(archM));m.castShadow=m.receiveShadow=true;W.add(m);for(const q of[p0,p1]){const b=new THREE.Mesh(new THREE.CylinderGeometry(th*1.2,th*2,8,14),wm(archM));b.position.copy(q).add(V(0,1,0));W.add(b);}}
function finish(){if(BK.boneV&&BK.boneV.length){const me=new THREE.Mesh(mergeC(BK.boneV),boneVM);me.castShadow=me.receiveShadow=true;W.add(me);delete BK.boneV;}Object.entries({obs:obsidianM,obsidian:obsidianM,obsF:obsidianFlatM,rune:runeM,gold:goldM2,iron:ironM,bone:boneM,soot:sootM,scar:scarM,basalt:basaltM,basaltTop:basaltTopM,spire:spireM}).forEach(([k,m])=>{if(!BK[k]||!BK[k].length)return;const me=new THREE.Mesh(mergeG(BK[k]),wm(m));me.castShadow=me.receiveShadow=k!=='rune';W.add(me);});
  if(BARKL.length){const me=new THREE.Mesh(mergeG(BARKL,true),barkM);me.castShadow=me.receiveShadow=true;W.add(me);}
  if(LEAVES.length){const lg=new THREE.PlaneGeometry(1,1,Q<.8?1:3,Q<.8?3:6),p=lg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5;p.setXYZ(i,x,.15*Math.sin(t*Math.PI)-.3*t*t+x*x*.4,t);}lg.computeVertexNormals();
    const im=new THREE.InstancedMesh(lg,leafMat,LEAVES.length);LEAVES.forEach((m,i)=>im.setMatrixAt(i,m));im.instanceMatrix.needsUpdate=true;im.frustumCulled=false;W.add(im);}
  const bg=new THREE.IcosahedronGeometry(1,Q<.8?1:2),p=bg.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+(fbm2(x*1.7+3,y*1.7+z*1.3)-.5)*.6;p.setXYZ(i,x*f,y*f*.75,z*f);}bg.computeVertexNormals();
  [[BLD,boulderM],[BOMB,wm(bombM)]].forEach(([L,m])=>{if(!L.length)return;const im=new THREE.InstancedMesh(bg,m,L.length);L.forEach((x,i)=>im.setMatrixAt(i,x));im.instanceMatrix.needsUpdate=true;im.castShadow=im.receiveShadow=true;im.frustumCulled=false;W.add(im);});
  if(LINKS.length){const im=new THREE.InstancedMesh(new THREE.TorusGeometry(.55,.16,Q<.8?5:8,Q<.8?9:16),new THREE.MeshBasicMaterial({color:'#ffffff'}),LINKS.length);LINKS.forEach((o,i)=>{im.setMatrixAt(i,o.m);im.setColorAt(i,o.c);});im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;im.frustumCulled=false;W.add(im);}
  if(DRIPS.length){const DR=DRIPS.slice(),N=DR.length*3,g=new THREE.BufferGeometry(),pp=new Float32Array(N*3),ph=[];for(let i=0;i<N;i++)ph.push(R());g.setAttribute('position',new THREE.BufferAttribute(pp,3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.5,map:dot,color:'#ffa040',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;W.add(pts);DR.forEach(d=>{const s=glow('#ff6a1a',4,.55);s.position.copy(d.p);W.add(s);});
    anim.push(t=>{for(let i=0;i<N;i++){const d=DR[i%DR.length],k=(t*.35+ph[i])%1;pp[i*3]=d.p.x;pp[i*3+1]=d.p.y-k*k*d.fall;pp[i*3+2]=d.p.z;}g.attributes.position.needsUpdate=true;});}}
// generic dressing helpers
function scatter(I,n,fn,minR,maxR,avoid){for(let k=0;k<n;k++){for(let t=0;t<20;t++){const a=R()*6.28,d=Math.sqrt(rnd(minR*minR,maxR*maxR))*I.ol(a),x=I.cx+Math.cos(a)*d,z=I.cz+Math.sin(a)*d;if(avoid&&avoid(x,z))continue;fn(x,I.Hw(x,z),z);break;}}}
function grove(I,ga,gd,n,avoid){n=Math.max(1,Math.round(n*(VOPT.gk==null?1:VOPT.gk)));for(let k=0;k<n;k++){for(let t=0;t<30;t++){const a=ga+rnd(-.4,.4),d=gd+rnd(-24,24),x=I.cx+Math.cos(a)*d,z=I.cz+Math.sin(a)*d;if(!I.inside(x,z,12)||nearRiver(x,z,10)||(avoid&&avoid(x,z)))continue;charredTree(V(x,I.Hw(x,z)-.5,z),rnd(1.1,1.7));groundLeaves(x,I.Hw(x,z),z,8,rnd(.8,1.1));break;}}}
const volcano=(x,z,vx,vz,H0,Rv,CRv)=>{const d=Math.hypot(x-vx,z-vz),av=Math.atan2(z-vz,x-vx);let h=H0*Math.exp(-Math.pow(d/Rv,1.7));h+=Math.exp(-Math.pow((d-CRv)/(CRv*.33),2))*H0*.055-(d<CRv?(1-Math.pow(d/CRv,2))*H0*.32:0);
  h+=Math.max(0,Math.sin(av*6+fbm2(x*.02,z*.02)*4))*H0*.06*Math.exp(-Math.pow((d-Rv*1.05)/(Rv*.55),2));return h;};
// ================= MONSTER HABITAT (replaces the treasure) =================
// ---------------- sculpted bones (signed-distance skull, meshed with surface nets) ----------------
function mergeC(list){return mergeX(list,['position','normal','color']);}
const n3=(x,y,z)=>(vnoise(x+z*.7,y)+vnoise(y+3.1,z+x*.6)+vnoise(z+7.3,x-y*.5))/3;
const BONE_A=C('#e2d6be'),BONE_B=C('#8a7458'),BONE_D=C('#2e241c'),BONE_S=C('#140e0a');
// colour bone: cavities and the ground-side darken, sooty scorch patches, slight yellowing streaks
function paintBone(g,ao,scorchY,fq){fq=fq||1;const p=g.attributes.position,n=p.count,col=new Float32Array(n*3),c=new THREE.Color();
  for(let i=0;i<n;i++){const x=p.getX(i)*fq,y=p.getY(i)*fq,z=p.getZ(i)*fq,a=ao?ao[i]:1,nz=n3(x*.9,y*.9,z*.9),st=vnoise(x*.35+z*.35,y*3.2);
    c.copy(BONE_B).lerp(BONE_A,clamp(nz*1.5-.15,0,1)*.8+.2).lerp(BONE_B,clamp(st-.55,0,1)*1.2).lerp(BONE_D,clamp(1-a,0,1)*.9);
    if(scorchY!=null)c.lerp(BONE_S,clamp((scorchY*fq-y)*.6/fq,0,1)*.85);c.lerp(BONE_S,clamp(n3(x*.25+9,y*.25,z*.25)*2.4-1.45,0,1)*.7);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));return g;}
function surfaceNets(f,b0,b1,h){const nx=Math.ceil((b1[0]-b0[0])/h)+1,ny=Math.ceil((b1[1]-b0[1])/h)+1,nz=Math.ceil((b1[2]-b0[2])/h)+1,F=new Float32Array(nx*ny*nz),I=(i,j,k)=>i+nx*(j+ny*k);
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)F[I(i,j,k)]=f(b0[0]+i*h,b0[1]+j*h,b0[2]+k*h);
  const cell=new Int32Array(nx*ny*nz).fill(-1),pos=[],E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],O=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const v=O.map(o=>F[I(i+o[0],j+o[1],k+o[2])]);let ins=0;v.forEach(x=>{if(x<0)ins++;});if(ins===0||ins===8)continue;
    let sx=0,sy=0,sz=0,c=0;E.forEach(([a,b])=>{if((v[a]<0)!==(v[b]<0)){const t=v[a]/(v[a]-v[b]);sx+=O[a][0]+(O[b][0]-O[a][0])*t;sy+=O[a][1]+(O[b][1]-O[a][1])*t;sz+=O[a][2]+(O[b][2]-O[a][2])*t;c++;}});
    cell[I(i,j,k)]=pos.length/3;pos.push(b0[0]+(i+sx/c)*h,b0[1]+(j+sy/c)*h,b0[2]+(k+sz/c)*h);}
  const idx=[],quad=(a,b,c,d,flip)=>{if(a<0||b<0||c<0||d<0)return;flip?idx.push(a,c,b,a,d,c):idx.push(a,b,c,a,c,d);};
  for(let k=1;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const s0=F[I(i,j,k)]<0;
    if(s0!==(F[I(i+1,j,k)]<0))quad(cell[I(i,j-1,k-1)],cell[I(i,j,k-1)],cell[I(i,j,k)],cell[I(i,j-1,k)],!s0);
    if(s0!==(F[I(i,j+1,k)]<0))quad(cell[I(i-1,j,k-1)],cell[I(i-1,j,k)],cell[I(i,j,k)],cell[I(i,j,k-1)],!s0);
    if(s0!==(F[I(i,j,k+1)]<0))quad(cell[I(i-1,j-1,k)],cell[I(i,j-1,k)],cell[I(i,j,k)],cell[I(i-1,j,k)],!s0);}
  const nrm=new Float32Array(pos.length),ao=new Float32Array(pos.length/3),e=h*.5;
  for(let q=0;q<pos.length/3;q++){const x=pos[q*3],y=pos[q*3+1],z=pos[q*3+2];let gx=f(x+e,y,z)-f(x-e,y,z),gy=f(x,y+e,z)-f(x,y-e,z),gz=f(x,y,z+e)-f(x,y,z-e);const l=Math.hypot(gx,gy,gz)||1;gx/=l;gy/=l;gz/=l;nrm[q*3]=gx;nrm[q*3+1]=gy;nrm[q*3+2]=gz;
    let o=0;for(const dd of[.08,.18,.32])o+=clamp(f(x+gx*dd,y+gy*dd,z+gz*dd)/dd,0,1);ao[q]=o/3;}
  // fix winding against the true gradient
  for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2],ux=pos[b*3]-pos[a*3],uy=pos[b*3+1]-pos[a*3+1],uz=pos[b*3+2]-pos[a*3+2],vx=pos[c*3]-pos[a*3],vy=pos[c*3+1]-pos[a*3+1],vz=pos[c*3+2]-pos[a*3+2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;if(cx*nrm[a*3]+cy*nrm[a*3+1]+cz*nrm[a*3+2]<0){idx[t+1]=c;idx[t+2]=b;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));g.setIndex(idx);return{g,ao};}
const sEll=(x,y,z,cx,cy,cz,rx,ry,rz)=>{const ax=(x-cx)/rx,ay=(y-cy)/ry,az=(z-cz)/rz,k0=Math.hypot(ax,ay,az),k1=Math.hypot(ax/rx,ay/ry,az/rz);return k1<1e-6?-Math.min(rx,ry,rz):k0*(k0-1)/k1;};
const sCap=(x,y,z,ax,ay,az,bx,by,bz,r)=>{const px=x-ax,py=y-ay,pz=z-az,dx=bx-ax,dy=by-ay,dz=bz-az,t=clamp((px*dx+py*dy+pz*dz)/(dx*dx+dy*dy+dz*dz),0,1);return Math.hypot(px-dx*t,py-dy*t,pz-dz*t)-r;};
const smin=(a,b,k)=>{const h=clamp(.5+.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h);},ssub=(a,b,k)=>-smin(-a,b,k);
const JAW=.36,JP=[0,-.26,-.5],jc=Math.cos(JAW),js=Math.sin(JAW);
const toJaw=(x,y,z)=>{const yy=y-JP[1],zz=z-JP[2];return[x,yy*jc+zz*js+JP[1],-yy*js+zz*jc+JP[2]];},fromJaw=(x,y,z)=>{const yy=y-JP[1],zz=z-JP[2];return V(x,yy*jc-zz*js+JP[1],yy*js+zz*jc+JP[2]);};
function skullSDF(x,y,z){const ax=Math.abs(x);
  let d=sEll(x,y,z,0,.14,-.4,.78,.6,.82);                                    // braincase
  d=smin(d,sEll(x,y,z,0,-.02,.5,.6,.44,.72),.3);                              // face
  d=smin(d,sEll(x,y,z,0,-.1,1.2,.43,.31,.62),.25);                            // long muzzle
  d=smin(d,sEll(x,y,z,0,-.13,1.78,.3,.23,.34),.2);                            // muzzle tip
  d=smin(d,sCap(ax,y,z,.12,.44,.5,.62,.3,.18,.16),.16);                       // heavy angled brow
  d=smin(d,sCap(ax,y,z,.55,-.1,.42,.8,-.06,-.6,.12),.12);                     // cheek arches
  d=smin(d,sCap(x,y,z,0,.7,-.15,0,.42,-1.15,.075),.18);                       // sagittal crest
  d=smin(d,sCap(ax,y,z,.45,.05,-1.0,.98,.38,-1.28,.09),.16);                  // back frill spurs
  d=smin(d,sCap(ax,y,z,.4,-.25,.55,.5,-.32,1.6,.06),.1);                      // tooth-row ridge
  d=ssub(d,Math.hypot(ax-.48,y-.17,z-.36)-.24,.06);                            // eye socket
  d=ssub(d,sEll(ax,y,z,.6,.16,.36,.16,.17,.24),.04);                           // socket opening
  d=ssub(d,sEll(ax,y,z,.58,.2,-.36,.17,.2,.3),.06);                            // temporal window
  d=ssub(d,sEll(ax,y,z,.3,.5,-.45,.12,.08,.24),.05);                           // upper temporal window
  d=ssub(d,sEll(ax,y,z,.47,-.04,.98,.07,.12,.26),.05);                         // antorbital window
  d=ssub(d,sEll(ax,y,z,.12,.08,1.83,.06,.06,.14),.04);                         // nostrils
  d=ssub(d,sEll(x,y,z,0,-.44,.9,.2,.14,1.0),.08);                              // palate groove
  const[jx,jy,jz]=toJaw(x,y,z),jax=Math.abs(jx);                            // mandible (open)
  let dj=sCap(jax,jy,jz,.6,-.3,-.45,.24,-.42,1.82,.09);dj=smin(dj,sCap(jax,jy,jz,.6,-.46,-.38,.24,-.5,1.7,.085),.2);
  dj=smin(dj,Math.hypot(jax-.6,jy+.3,jz+.52)-.15,.08);dj=smin(dj,sCap(jax,jy,jz,.5,-.3,-.05,.52,-.05,-.12,.07),.06);dj=smin(dj,sCap(jax,jy,jz,.24,-.45,1.8,0,-.46,1.9,.09),.08);
  dj=ssub(dj,sEll(jax,jy,jz,.48,-.4,.25,.05,.06,.2),.03);
  d=Math.min(d,dj);
  d+=(n3(x*7,y*7,z*7)-.5)*.026+(n3(x*19,y*19,z*19)-.5)*.01;
  return d;}
let SKULL_G=null;
const SKC={};function skullBase(hh){hh=hh||(.042/Math.max(.2,Q*.55));if(SKC[hh])return SKC[hh];const{g,ao}=surfaceNets(skullSDF,[-1.15,-1.45,-1.5],[1.15,1.05,2.3],hh);paintBone(g,ao,-1.1,4);const parts=[g];
  const addPart=(geo,pos,q)=>{geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));geo.translate(pos.x,pos.y,pos.z);paintBone(geo,null,-1.1,4);parts.push(geo);};
  const tooth=(len,r,base,dir,curl)=>{const g=new THREE.ConeGeometry(r,len,Q<.6?5:8,Q<.6?1:4);g.rotateX(Math.PI);g.translate(0,-len/2+r*.6,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const t=-p.getY(i)/len;p.setZ(i,p.getZ(i)-curl*t*t*len);}g.computeVertexNormals();addPart(g,base,new THREE.Quaternion().setFromUnitVectors(V(0,-1,0),dir));};
  const under=(x,z)=>{let y=-.05;while(y>-.9&&skullSDF(x,y,z)<0)y-=.01;return y+.04;};
  for(const sg of[-1,1]){for(let k=0;k<10;k++){const z=.45+k*.15,x=sg*(.44-(z-.45)*.12),big=k===2||k===8;
      tooth(big?.55:rnd(.15,.28),big?.075:rnd(.038,.055),V(x,under(x,z),z),V(sg*.1,-1,.15).normalize(),big?.3:.12);}
    for(let k=0;k<9;k++){const u=.3+k*.15,lx=.6+(.24-.6)*((u+.45)/2.27),ly=-.3+(-.42+.3)*((u+.45)/2.27)+.07,x=sg*lx,b=fromJaw(x,ly,u),up=fromJaw(x,ly+1,u).sub(b).normalize(),big=k===7;tooth(big?.45:rnd(.13,.24),big?.065:rnd(.036,.05),b,up,big?-.25:-.08);}
    // great curved horns, ringed, sweeping back then forward
    const hp=[V(sg*.4,.4,-.62),V(sg*.8,.62,-.95),V(sg*1.3,.95,-1.2),V(sg*1.7,1.5,-1.05),V(sg*1.75,2.05,-.5)];
    const cv=new THREE.CatmullRomCurve3(hp),fr=cv.computeFrenetFrames(40,false),pos=[],idx=[],RS=14;
    for(let i=0;i<=40;i++){const t=i/40,P=cv.getPointAt(t),N=fr.normals[i],B=fr.binormals[i],r=(.24*(1-t*.92)+.012)*(1+.07*Math.sin(t*46));for(let j=0;j<=RS;j++){const a=j/RS*6.28;pos.push(P.x+(N.x*Math.cos(a)+B.x*Math.sin(a))*r,P.y+(N.y*Math.cos(a)+B.y*Math.sin(a))*r,P.z+(N.z*Math.cos(a)+B.z*Math.sin(a))*r);}}
    for(let i=0;i<40;i++)for(let j=0;j<RS;j++){const a=i*(RS+1)+j;idx.push(a,a+RS+1,a+1,a+1,a+RS+1,a+RS+2);}
    const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));hg.setIndex(idx);hg.computeVertexNormals();paintBone(hg,null,-1.1,4);
    const hc=hg.attributes.color;for(let i=0;i<hc.count;i++){const t=Math.floor(i/(RS+1))/40;hc.setXYZ(i,hc.getX(i)*(1-t*.6),hc.getY(i)*(1-t*.65),hc.getZ(i)*(1-t*.7));}parts.push(hg);}
  return SKC[hh]=mergeC(parts);}
function skull(p,s,f,eye,tilt){f=f.clone().setY(0).normalize();const S=2.4*s,yaw=Math.atan2(f.x,f.z),e=tilt||new THREE.Euler(0,0,0),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(e.x,yaw,e.z,'YXZ')),M=new THREE.Matrix4().compose(p,q,V(S,S,S));
  const g=skullBase(s<1?.24:0).clone();g.applyMatrix4(M);(BK.boneV=BK.boneV||[]).push(g);
  for(const sg of[-1,1]){const c=V(sg*.48,.17,.38).applyMatrix4(M);put('soot',new THREE.SphereGeometry(.17*S,14,10),c);if(eye){put('rune',new THREE.IcosahedronGeometry(.08*S,1),V(sg*.5,.17,.45).applyMatrix4(M));const gl=glow('#ff5a1a',S*.9,.5);gl.position.copy(V(sg*.55,.17,.55).applyMatrix4(M));W.add(gl);}}}
// tapered bone limb, coloured
function boneTube(pts,segs,rs,rf,scorchY){segs=Math.max(3,Math.round(segs*Q));rs=Math.max(5,Math.round(rs*Q));const cv=new THREE.CatmullRomCurve3(pts),fr=cv.computeFrenetFrames(segs,false),pos=[],idx=[],L=cv.getLength();
  for(let i=0;i<=segs;i++){const t=i/segs,P=cv.getPointAt(t),N=fr.normals[i],B=fr.binormals[i],r=rf(t);for(let j=0;j<=rs;j++){const a=j/rs*6.28,ca=Math.cos(a),sa=Math.sin(a),f=(1+(n3(ca+P.x*.3,sa+t*L*.3,P.z*.3)-.5)*.18)*(1-.18*Math.abs(sa));
    pos.push(P.x+(N.x*ca*1.25+B.x*sa*.8)*r*f,P.y+(N.y*ca*1.25+B.y*sa*.8)*r*f,P.z+(N.z*ca*1.25+B.z*sa*.8)*r*f);}}
  for(let i=0;i<segs;i++)for(let j=0;j<rs;j++){const a=i*(rs+1)+j;idx.push(a,a+rs+1,a+1,a+1,a+rs+1,a+rs+2);}
  const E=cv.getPointAt(1),T=cv.getTangentAt(1),tip=pos.length/3;pos.push(E.x+T.x*rf(1),E.y+T.y*rf(1),E.z+T.z*rf(1));for(let j=0;j<rs;j++)idx.push(segs*(rs+1)+j,tip,segs*(rs+1)+j+1);
  const S0=cv.getPointAt(0),T0=cv.getTangentAt(0),st=pos.length/3;pos.push(S0.x-T0.x*rf(0),S0.y-T0.y*rf(0),S0.z-T0.z*rf(0));for(let j=0;j<rs;j++)idx.push(j+1,st,j);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();paintBone(g,null,scorchY);(BK.boneV=BK.boneV||[]).push(g);return cv;}
function boneLump(p,r,sx,sy,sz,scorchY){const g=new THREE.IcosahedronGeometry(r,Q<.6?1:2),pp=g.attributes.position;for(let i=0;i<pp.count;i++){const f=1+(n3(pp.getX(i)*3+p.x,pp.getY(i)*3,pp.getZ(i)*3+p.z)-.5)*.35;pp.setXYZ(i,pp.getX(i)*f*sx,pp.getY(i)*f*sy,pp.getZ(i)*f*sz);}
  g.translate(p.x,p.y,p.z);const q=g.index?g.toNonIndexed():g;paintBone(q,null,scorchY);q.computeVertexNormals();(BK.boneV=BK.boneV||[]).push(q);}
// spine of vertebrae + flattened, tapering ribs; some broken or fallen
function ribs(p,dir,len,s){dir=dir.clone().setY(0).normalize();const side=V(-dir.z,0,dir.x),NV=Math.round(len/(1.25*s)),sp=[];
  for(let k=0;k<=NV;k++){const u=k/NV,q=p.clone().addScaledVector(dir,u*len).addScaledVector(side,Math.sin(u*3.2)*1.2*s);q.y=HH(q.x,q.z)+(2.4+Math.sin(u*Math.PI)*1.9-u*u*1.6)*s;sp.push(q);}
  const scY=HH(p.x,p.z)+.8;
  for(let k=0;k<NV;k++){const a=sp[k],b=sp[k+1],m=a.clone().lerp(b,.5),t=b.clone().sub(a).normalize(),u=k/NV,sz=(1-u*.55)*s,up=V(0,1,0).addScaledVector(t,-V(0,1,0).dot(t)).normalize(),sd=t.clone().cross(up).normalize();
    boneTube([m.clone().addScaledVector(t,-.42*sz),m.clone().addScaledVector(t,.42*sz)],4,12,()=>.52*sz,scY);                     // centrum
    boneTube([m.clone().addScaledVector(up,.3*sz),m.clone().addScaledVector(up,1.25*sz).addScaledVector(t,-.35*sz),m.clone().addScaledVector(up,2.1*sz).addScaledVector(t,-.75*sz)],8,7,v=>sz*(.26*(1-v*.7)),scY); // spinous process
    [-1,1].forEach(g=>boneTube([m.clone().addScaledVector(sd,g*.35*sz),m.clone().addScaledVector(sd,g*1.05*sz).addScaledVector(up,.15*sz)],4,6,v=>sz*.16*(1-v*.5),scY));
    boneLump(m.clone().addScaledVector(t,.48*sz),.3*sz,1.3,1.3,.5,scY);}
  for(let k=1;k<NV;k++){const u=k/NV;if(u>.72)break;const b=sp[k],rl=(1-Math.abs(u-.35)*1.3)*s;
    [1,-1].forEach(sg=>{if(R()<.12)return;const g0=HH(b.x,b.z),broken=R()<.22,pts=[];for(let i=0;i<=6;i++){const v=i/6,ang=v*2.3,out=Math.sin(ang)*4.6*rl+.4*s,yy=b.y+Math.cos(ang)*1.6*rl-v*v*((b.y-g0)+.4);pts.push(b.clone().addScaledVector(side,sg*out).addScaledVector(dir,-v*1.2*s).setY(yy));}
      const use=broken?pts.slice(0,4+Math.floor(R()*2)):pts;boneTube(use,26,9,v=>s*(.34*(1-v*.55))*(broken&&v>.9?.8:1),scY);
      if(broken){const e=pts[6].clone(),q=pts[5].clone();e.y=q.y=g0+.15*s;boneTube([q.clone().add(V(rnd(-1,1),0,rnd(-1,1))),e],10,8,()=>.18*s,scY);}});}}
// long bones lying around: shaft with knobbed ends
function longBone(x,z,s){const a=R()*6.28,L=rnd(2.5,5)*s,d=V(Math.cos(a),0,Math.sin(a)),c=V(x,HH(x,z)+.3*s,z),p0=c.clone().addScaledVector(d,-L/2),p1=c.clone().addScaledVector(d,L/2);p0.y=HH(p0.x,p0.z)+.3*s;p1.y=HH(p1.x,p1.z)+.3*s;
  boneTube([p0,p0.clone().lerp(p1,.5).add(V(0,.08*s,0)),p1],14,9,t=>s*(.17+.14*Math.pow(Math.abs(t-.5)*2,4)),HH(x,z)+.2);
  for(const q of[p0,p1]){const sd=V(-d.z,0,d.x);boneLump(q.clone().addScaledVector(sd,.17*s),.23*s,1,.9,1,HH(x,z)+.2);boneLump(q.clone().addScaledVector(sd,-.17*s),.21*s,1,.9,1,HH(x,z)+.2);}}
function wreck(p,f){f=f.clone().setY(0).normalize();const r=V(f.z,0,-f.x),d=f.clone().add(V(0,-.55,0)).normalize(),yaw=Math.atan2(f.x,f.z),b=V(p.x,HH(p.x,p.z),p.z);
  put('iron',new THREE.CylinderGeometry(.6,.42,5,14),b.clone().add(V(0,2.8,0)),qTo(d));put('iron',new THREE.ConeGeometry(.6,1.5,14),b.clone().add(V(0,2.8,0)).addScaledVector(d,3.1),qTo(d));
  put('iron',new THREE.BoxGeometry(3.6,.15,1.4),b.clone().add(V(0,2.9,0)).addScaledVector(r,1.7),new THREE.Euler(.3,yaw,.5));put('iron',new THREE.BoxGeometry(2.3,.15,1.2),b.clone().add(V(0,.3,0)).addScaledVector(r,-2.9).addScaledVector(f,1.2),new THREE.Euler(-.15,R()*3,.1));
  put('obsidian',new THREE.ConeGeometry(.75,10,7),b.clone().add(V(0,4.6,0)),new THREE.Euler(rnd(-.1,.1),0,rnd(-.1,.1)));
  const fire=glow('#ff6a2a',3.6,.5);fire.position.copy(b).add(V(0,3,0));W.add(fire);const lamp=glow('#ff2a2a',1.8,.9);lamp.position.copy(b).add(V(0,4,0)).addScaledVector(d,-2.2);W.add(lamp);
  const ph=R()*5;anim.push(t=>{fire.material.opacity=.32+Math.random()*.25;lamp.visible=((t+ph)%1.4)<.25;});smokeSrc(b.clone().add(V(0,3,0)),.6,8,.8);}
let HH=null;
function habitat(I,VX,VZ){HH=I.Hw;
{const VB2=Math.atan2(VZ,VX)+Math.PI,lx=Math.cos(VB2)*30,lz=Math.sin(VB2)*30,toC=V(-lx,0,-lz).normalize(),side=V(-toC.z,0,toC.x),g0=HH(lx,lz);
  // obsidian nest with glowing eggs in front of the lair
  {const n=V(lx,0,lz).addScaledVector(toC,20);n.y=HH(n.x,n.z);for(let k=0;k<20;k++){const a=k/20*6.28,p=n.clone().add(V(Math.cos(a)*5.5,0,Math.sin(a)*5.5)),dir=V(Math.cos(a)*.6,1,Math.sin(a)*.6).normalize();put('obsidian',new THREE.ConeGeometry(.55,rnd(2.6,4.4),6),p.clone().addScaledVector(dir,1.3),qTo(dir));}
    for(let k=0;k<6;k++){const a=k/6*6.28+rnd(-.2,.2),e=new THREE.Mesh(new THREE.SphereGeometry(1.25,Math.round(40*Q),Math.round(28*Q)),lavaMat({uv:1,sx:2,sy:2,flow:.05,i:1.1}));e.scale.y=1.35;e.position.copy(n).add(V(Math.cos(a)*rnd(0,3),1.4,Math.sin(a)*rnd(0,3)));e.rotation.z=rnd(-.4,.4);W.add(e);}
    const eg=glow('#ff6a1a',16,.4);eg.position.copy(n).add(V(0,1.6,0));W.add(eg);anim.push(t=>{eg.material.opacity=.3+.12*Math.sin(t*2.4);});}
  // remains of prey, warning totems and impaled wrecks around the arena
  const SKa=VB2+1.35,SKS=5.5,SKx=Math.cos(SKa)*50,SKz=Math.sin(SKa)*50,SKf=V(Math.cos(SKa+Math.PI/2),0,Math.sin(SKa+Math.PI/2)),SKp=V(SKx,HH(SKx,SKz)+4.4*SKS/2.2*1.05,SKz),SKr=SKp.clone().addScaledVector(SKf,-17).setY(0);
  skull(SKp,SKS,SKf,false,new THREE.Euler(-.16,0,.18));ribs(SKr,SKf.clone().multiplyScalar(-1),55,5);
  {const gl=glow('#ff3a10',26,.28);gl.position.copy(V(0,.17,.5).applyAxisAngle(UP,Math.atan2(SKf.x,SKf.z)).multiplyScalar(2.4*SKS).add(SKp));W.add(gl);const sl=new FakePL(C('#ff4a1a'),1.6,60,1.6);sl.position.copy(gl.position);W.add(sl);anim.push(t=>{const k=.5+.5*Math.sin(t*1.3);gl.material.opacity=.18+k*.15;sl.intensity=1+k*1.2;});}
  const nearSkull=(x,z,m)=>{const ax=SKp.x+SKf.x*2*2.4*SKS,az=SKp.z+SKf.z*2*2.4*SKS,bx=SKr.x-SKf.x*55,bz=SKr.z-SKf.z*55,dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-ax-dx*t,z-az-dz*t)<m;};
  for(let k=0;k<7;k++){const a=VB2+Math.PI+(k-3)*.42,x=Math.cos(a)*34,z=Math.sin(a)*34,g=HH(x,z);if(nearSkull(x,z,24))continue;put('obsidian',new THREE.CylinderGeometry(.35,.6,11,8),V(x,g+5.5,z));skull(V(x,g+12,z),.6,V(-x,0,-z),true);}
  for(let k=0;k<4;k++){const a=VB2+.9+k*1.2,x=Math.cos(a)*rnd(40,52),z=Math.sin(a)*rnd(40,52);if(nearSkull(x,z,28))continue;wreck(V(x,0,z),V(Math.cos(a+1),0,Math.sin(a+1)));}
  for(let k=0;k<14;k++){const a=R()*6.28,d=rnd(8,30),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearSkull(x,z,20))continue;longBone(x,z,rnd(.8,1.5));}
  }
}
// ---------------- basalt hex outcrops (only far from landmarks) ----------------
function basaltField(I,cx,cz,Rr,hmax){const s=2.8,ro=s/Math.sqrt(3)*.95,n=Math.ceil(Rr/s)+1;for(let q=-n;q<=n;q++)for(let r=-n;r<=n;r++){const x=cx+s*(q+r*.5),z=cz+s*r*.866,d=Math.hypot(x-cx,z-cz);if(d>Rr)continue;
  const base=I.Hw(x,z)-3,top=I.Hw(x,z)+hmax*Math.pow(1-d/Rr,.7)*rnd(.6,1)+rnd(0,2);put('basalt',new THREE.CylinderGeometry(ro,ro,top-base,6),V(x,(top+base)/2,z));put('basaltTop',new THREE.CylinderGeometry(ro*.97,ro*.97,.3,6),V(x,top+.12,z));}}

// =====================================================================
//  ISLAND DEFINITIONS
// =====================================================================
const DEFS=[];
// 1/2) volcano island — treasure (Fire Heart) or monster habitat at the centre
function volcanoIsland(monster){W2=240;const VX=-112,VZ=42;
  const I=island({R:178,depth:205,H:(x,z)=>{const r=Math.hypot(x,z);let h=volcano(x,z,VX,VZ,74,40,15)+5*Math.exp(-Math.pow(r/120,2))+(fbm2(x*.035+3,z*.035)-.5)*10*Math.min(1,Math.hypot(x-VX,z-VZ)/30)*(.35+.65*clamp((r-60)/40,0,1));
    if(r<82){const s=1-clamp((r-68)/14,0,1),f=s*s*(3-2*s);h=h*(1-f)+(5+(fbm2(x*.035+3,z*.035)-.5)*3*clamp((r-40)/30,0,1))*f;}return h;}});ISL=[I];
  const VB=Math.atan2(VZ,VX);[VB,VB+1.35,VB-1.35].forEach(a=>traceRiver(I,V(VX+Math.cos(a)*16,0,VZ+Math.sin(a)*16),V(Math.cos(a),0,Math.sin(a))));
  buildHeat(blob=>{blob(VX,VZ,44,1);blob(VX,VZ,70,.45);for(let k=0;k<16;k++){const a=R()*6.28,r=rnd(18,60);blob(VX+Math.cos(a)*r,VZ+Math.sin(a)*r,rnd(8,22),rnd(.25,.6));}});
  buildIsland(I);crater(VX,55,VZ,15,true);eruption(V(VX,56,VZ),1.7,10,.6);
  for(let k=0;k<26;k++){const a=R()*6.28,d=rnd(22,70),x=VX+Math.cos(a)*d,z=VZ+Math.sin(a)*d;if(nearRiver(x,z,8)||Math.hypot(x,z)<80||!I.inside(x,z,8))continue;spike(x,I.Hw(x,z),z,rnd(7,22),rnd(1.2,3));}
  for(let k=0;k<7;k++){for(let t=0;t<30;t++){const a=R()*6.28,d=rnd(92,I.ol(a)-14),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,16)||Math.hypot(x-VX,z-VZ)<60)continue;basaltField(I,x,z,rnd(7,12),rnd(8,20));break;}}
  [VB+Math.PI,VB+Math.PI+1.1,VB+Math.PI-1.1,VB+Math.PI/2,VB-Math.PI/2].forEach(ga=>grove(I,ga,118,6));
  scatter(I,260,(x,y,z)=>boulder(x,y,z,rnd(.7,3.2),false),.3,.95,(x,z)=>nearRiver(x,z,7)||Math.hypot(x,z)<(monster?40:70));
  scatter(I,80,(x,y,z)=>boulder(x,y,z,rnd(.8,2.4),true),0,1,(x,z)=>!(nearRiver(x,z,22)||Math.hypot(x-VX,z-VZ)<45)||Math.hypot(x,z)<(monster?40:70));
  if(monster)habitat(I,VX,VZ);else fireHeartHQ(0,I.Hw(0,0),0,{h:16,FR:60,colR:54,colH:22,brzR:24});
  embers(0,0,178,0,140,1000);return{far:[0,280,420],farT:[0,22,0],near:[0,100,150],nearT:[0,14,0]};}
DEFS.push({name:'화산섬 · 불의 심장',tag:'보물섬',desc:'섬 가운데 각인된 흑요석 성소 위로 루비 보석 심장이 금빛 봉인 고리에 감싸여 떠 있음. 화산은 한쪽으로 비켜 솟아 분화구에서 빛 입자가 터지고, 용암 강은 보물 반대쪽으로 흘러 섬 밖으로 쏟아짐.',build:()=>volcanoIsland(false)});
DEFS.push({name:'화산섬 · 몬스터 서식지',tag:'몬스터',desc:'같은 화산섬에서 보물 대신 몬스터가 사는 버전. 넓은 공터 가운데 달아오른 알 둥지, 먹잇감의 거대 해골과 갈비뼈, 경고 기둥, 불타는 기체 잔해.',build:()=>volcanoIsland(true)});

// 3) lava canyon island
DEFS.push({name:'용암 협곡섬',tag:'비행 통로',desc:'섬을 가로질러 깊은 협곡이 갈라져 있고, 협곡 바닥을 따라 용암 강이 흘러 섬 끝에서 거대한 폭포로 떨어짐. 양쪽 벼랑에서도 용암이 협곡 안으로 쏟아지고, 자연 바위 아치 세 개가 협곡 위를 가로지름. 협곡 안을 낮게 비행하는 통로.',
 build(){W2=180;const zc=x=>Math.sin(x*.022)*24+Math.sin(x*.05)*6;
  const I=island({R:132,depth:150,H:(x,z)=>{const pl=17+(fbm2(x*.02+9,z*.02)-.5)*14+(fbm2(x*.08,z*.08)-.5)*3,d=Math.abs(z-zc(x))+(fbm2(x*.05,z*.05)-.5)*5,w=9,floor=6-x*.035+(fbm2(x*.1,z*.1)-.5)*1.2,k=clamp((w+8-d)/8,0,1),s=k*k*(3-2*k);return pl*(1-s)+floor*s;}});ISL=[I];
  const rv=traceRiver(I,V(-110,0,zc(-110)),V(1,0,0),p=>V(1,0,clamp((zc(p.x+3)-p.z)*.15,-.8,.8)));rv.wStart=4;rv.wEnd=7;
  buildHeat(blob=>{for(let x=-110;x<120;x+=8)blob(x,zc(x),26,.35);});buildIsland(I);
  [-70,-20,30,80].forEach((x,i)=>{const sd=i%2?1:-1,z=zc(x)+sd*17,top=V(x,I.Hw(x,z)-.4,z),fl=I.Hw(x,zc(x));if(top.y-fl>4){lavaFall(top,V(0,0,-sd),top.y-fl,2.4);const vg=glow('#ff5a14',10,.35);vg.position.copy(top).add(V(0,1,0));W.add(vg);}});
  [-45,10,62].forEach((x,i)=>{const z0=zc(x),p0=V(x,0,z0-21),p1=V(x+rnd(-6,6),0,z0+21);p0.y=I.Hw(p0.x,p0.z)-1;p1.y=I.Hw(p1.x,p1.z)-1;stoneArch(p0,p1,12+i*3,3.2-i*.3);});
  for(let k=0;k<44;k++){const x=rnd(-115,115),sd=R()<.5?1:-1,z=zc(x)+sd*rnd(18,26);if(!I.inside(x,z,8))continue;spike(x,I.Hw(x,z),z,rnd(6,18),rnd(1,2.6),new THREE.Euler(sd*rnd(.1,.3),R()*3,rnd(-.1,.1)));}
  grove(I,Math.PI/2,78,8,(x,z)=>Math.abs(z-zc(x))<26);grove(I,-Math.PI/2,82,8,(x,z)=>Math.abs(z-zc(x))<26);
  for(let k=0;k<4;k++){for(let t=0;t<30;t++){const a=R()*6.28,d=rnd(70,I.ol(a)-14),x=Math.cos(a)*d,z=Math.sin(a)*d;if(Math.abs(z-zc(x))<30)continue;basaltField(I,x,z,rnd(6,10),rnd(6,16));break;}}
  scatter(I,200,(x,y,z)=>boulder(x,y,z,rnd(.7,3),false),.2,.95,(x,z)=>Math.abs(z-zc(x))<13);
  scatter(I,90,(x,y,z)=>boulder(x,y,z,rnd(.6,2),true),0,.95,(x,z)=>Math.abs(z-zc(x))>16||nearRiver(x,z,6));
  for(let x=-100;x<110;x+=26)smokeSrc(V(x,I.Hw(x,zc(x))+1,zc(x)),4,6,.9);embers(0,0,130,0,90,800);
  return{far:[0,190,330],farT:[0,8,0],near:[-90,40,zc(-90)+60],nearT:[-40,6,zc(-40)]};}});

// 4) obsidian spire forest
DEFS.push({name:'흑요석 첨탑림',tag:'장애물 숲',desc:'수십 개의 거대한 흑요석 첨탑이 숲처럼 솟은 섬. 첨탑 표면 균열마다 마그마가 달아오르고, 첨탑 사이 움푹한 곳마다 용암 못이 끓어 김을 뿜음. 못에서 넘친 용암이 섬 밖으로 흘러내림. 첨탑 사이를 누비는 고난도 비행 구간.',
 build(){W2=170;const pools=[[0,0,9],[-48,30,7],[42,-38,8],[55,40,6],[-40,-50,7]];
  const I=island({R:120,depth:140,H:(x,z)=>{let h=8+(fbm2(x*.015+2,z*.015)-.5)*22+(fbm2(x*.07,z*.07)-.5)*3;pools.forEach(([px,pz,pr])=>{const d=Math.hypot(x-px,z-pz),k=clamp((pr+5-d)/6,0,1);h-=4*k*k*(3-2*k);});return h;}});ISL=[I];
  [[0,0,.4],[42,-38,-.9],[-48,30,2.4]].forEach(([px,pz,a])=>{const pr=pools.find(p=>p[0]===px)[2];traceRiver(I,V(px+Math.cos(a)*(pr+6),0,pz+Math.sin(a)*(pr+6)),V(Math.cos(a),0,Math.sin(a)));});
  buildHeat(blob=>pools.forEach(([x,z,r])=>{blob(x,z,r*3,.9);}));buildIsland(I);
  pools.forEach(([px,pz,pr])=>{const y=I.Hw(px,pz)+1.6;lavaSheet(px,y,pz,a=>pr+2.4+.6*Math.sin(a*3));smokeSrc(V(px,y+.5,pz),pr*.6,10,.9);const g=glow('#ff5a14',pr*4.5,.3);g.position.set(px,y+1.5,pz);W.add(g);});
  for(let c=0;c<Math.round(16*(VOPT.sc||1));c++){for(let t=0;t<40;t++){const a=R()*6.28,d=Math.sqrt(R())*I.ol(a)*.86,x=Math.cos(a)*d,z=Math.sin(a)*d;if(pools.some(([px,pz,pr])=>Math.hypot(x-px,z-pz)<pr+8)||nearRiver(x,z,9))continue;
    const n=2+Math.floor(R()*3);for(let k=0;k<n;k++){const sx=x+rnd(-6,6),sz=z+rnd(-6,6),h=k===0?rnd(40,72):rnd(14,34),r=k===0?rnd(4.5,7):rnd(2,4);spike(sx,I.Hw(sx,sz),sz,h,r,new THREE.Euler(rnd(-.1,.1),R()*3,rnd(-.1,.1)));
      if(k===0){const g=glow('#ff4a10',r*4,.22);g.position.set(sx,I.Hw(sx,sz)+2,sz);W.add(g);}}break;}}
  for(let k=0;k<60;k++){const a=R()*6.28,d=Math.sqrt(R())*I.ol(a)*.9,x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,5))continue;spike(x,I.Hw(x,z),z,rnd(3,9),rnd(.6,1.4));}
  scatter(I,160,(x,y,z)=>boulder(x,y,z,rnd(.6,2.6),false),.2,.95,(x,z)=>nearRiver(x,z,6));scatter(I,70,(x,y,z)=>boulder(x,y,z,rnd(.6,1.8),true),0,.9,(x,z)=>!pools.some(([px,pz,pr])=>Math.hypot(x-px,z-pz)<pr+14));
  embers(0,0,120,0,90,700);return{far:[0,170,300],farT:[0,20,0],near:[0,50,90],nearT:[0,18,0]};}});

// 5) caldera lava lake
DEFS.push({name:'칼데라 용암호',tag:'랜드마크',desc:'무너진 거대 화산의 칼데라. 고리 모양 산등성이 안쪽에 넓은 용암호가 끓고, 가운데 흑요석 섬에서 몇 초마다 빛 입자가 터짐. 산등성이에서 용암이 안쪽 호수로도, 바깥 허공으로도 흘러내리고 호수 위로 김이 자욱함.',
 build(){W2=190;const I=island({R:136,depth:160,H:(x,z)=>{const r=Math.hypot(x,z),a=Math.atan2(z,x),rr=r+(fbm2(x*.03,z*.03)-.5)*10;let h=rr<62?34*Math.exp(-Math.pow((rr-62)/18,2)):34*Math.exp(-Math.pow((rr-62)/34,2));
    h+=(fbm2(x*.04+5,z*.04)-.5)*7*clamp(rr/45,0,1)+Math.max(0,Math.sin(a*7+fbm2(x*.02,z*.02)*4))*4*Math.exp(-Math.pow((rr-75)/16,2));h=Math.max(h,15*Math.exp(-Math.pow(r/7.5,2)));return h;}});ISL=[I];
  const LY=7.5;for(let k=0;k<4;k++){const a=k/4*6.28+.4;traceRiver(I,V(Math.cos(a)*61,0,Math.sin(a)*61),V(-Math.cos(a),0,-Math.sin(a)),p=>V(-p.x,0,-p.z).normalize().multiplyScalar(.5));const rv=I.rivers[I.rivers.length-1];rv.wStart=2;rv.wEnd=4.5;const ci=rv.findIndex(p=>p.y<LY+.3);if(ci>5)rv.length=ci+2;}
  for(let k=0;k<3;k++){const a=k/3*6.28+1.2;traceRiver(I,V(Math.cos(a)*64,0,Math.sin(a)*64),V(Math.cos(a),0,Math.sin(a)));}
  buildHeat(blob=>{blob(0,0,70,.5);blob(0,0,46,.7);});buildIsland(I);
  lavaSheet(0,LY,0,a=>55+3*Math.sin(a*3),{flow:.015,i:1.4});const cl=new FakePL(C('#ff6a2a'),3,240,1.4);cl.position.set(0,LY+14,0);W.add(cl);anim.push(t=>{cl.intensity=2.6+Math.sin(t*1.7)*.5;});
  for(let k=0;k<12;k++){const a=R()*6.28,d=rnd(14,38);smokeSrc(V(Math.cos(a)*d,LY+.5,Math.sin(a)*d),5,5,1.1,true);}const lg=glow('#ff5a14',140,.18);lg.position.set(0,LY+6,0);W.add(lg);
  for(let k=0;k<7;k++){const a=k/7*6.28,d=rnd(1,4.5);spike(Math.cos(a)*d,I.Hw(Math.cos(a)*d,Math.sin(a)*d),Math.sin(a)*d,rnd(9,20),rnd(1.4,2.6),new THREE.Euler(Math.sin(a)*.3,R()*3,-Math.cos(a)*.3));}
  eruption(V(0,16,0),1.4,8,.35);
  for(let k=0;k<50;k++){const a=R()*6.28,d=rnd(56,70),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,7))continue;spike(x,I.Hw(x,z),z,rnd(5,15),rnd(1,2.5));}
  grove(I,.9,100,6);grove(I,3.4,104,6);grove(I,5.2,100,5);
  scatter(I,200,(x,y,z)=>boulder(x,y,z,rnd(.7,3),false),.5,.95,(x,z)=>nearRiver(x,z,6));scatter(I,60,(x,y,z)=>boulder(x,y,z,rnd(.6,2),true),.42,.6,null);
  embers(0,0,130,0,100,850);return{far:[0,200,330],farT:[0,10,0],near:[0,60,120],nearT:[0,10,0]};}});

// 6) ember forest
DEFS.push({name:'잿불 숲섬',tag:'정글',desc:'완만한 언덕을 뒤덮은 거대한 숯 나무 숲. 갈라진 줄기와 잎 가장자리가 잿불로 타오르고, 낙엽 사이로 땅이 달아오름. 언덕 꼭대기 열원에서 시작된 용암 개울이 숲 사이를 지나 섬 밖으로 떨어지고, 나무 사이로 연기가 자욱함.',
 build(){W2=170;const I=island({R:126*(VOPT.rk||1),depth:140,H:(x,z)=>10+(fbm2(x*.012+4,z*.012)-.5)*34+(fbm2(x*.05,z*.05)-.5)*5});ISL=[I];
  const peaks=[];for(let t=0;t<400&&peaks.length<3;t++){const a=R()*6.28,d=Math.sqrt(R())*90,x=Math.cos(a)*d,z=Math.sin(a)*d,h=I.Hw(x,z);if(h>18&&peaks.every(p=>Math.hypot(p[0]-x,p[1]-z)>60))peaks.push([x,z]);}
  peaks.forEach(([x,z])=>{const a=Math.atan2(z,x);const rv=traceRiver(I,V(x,0,z),V(Math.cos(a),0,Math.sin(a)));rv.wStart=1.6;rv.wEnd=4.5;});
  buildHeat(blob=>{peaks.forEach(([x,z])=>blob(x,z,18,.9));for(let k=0;k<30;k++){const a=R()*6.28,d=Math.sqrt(R())*110;blob(Math.cos(a)*d,Math.sin(a)*d,rnd(6,14),rnd(.3,.6));}});buildIsland(I);
  peaks.forEach(([x,z])=>{const y=I.Hw(x,z);const g=glow('#ff5a14',16,.4);g.position.set(x,y+1.5,z);W.add(g);smokeSrc(V(x,y+1,z),2,8,.9);});
  for(let k=0;k<Math.round(55*(VOPT.tk||1));k++){for(let t=0;t<20;t++){const a=R()*6.28,d=Math.sqrt(R())*I.ol(a)*.88,x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,8))continue;charredTree(V(x,I.Hw(x,z)-.5,z),rnd(1.1,1.9));groundLeaves(x,I.Hw(x,z),z,10,rnd(.8,1.1));break;}}
  for(let k=0;k<70;k++){const a=R()*6.28,d=Math.sqrt(R())*I.ol(a)*.9,x=Math.cos(a)*d,z=Math.sin(a)*d;groundLeaves(x,I.Hw(x,z),z,8,rnd(.7,1));}
  for(let k=0;k<14;k++){const a=R()*6.28,d=Math.sqrt(R())*100;smokeSrc(V(Math.cos(a)*d,I.Hw(Math.cos(a)*d,Math.sin(a)*d)+1,Math.sin(a)*d),4,5,.9);}
  scatter(I,120,(x,y,z)=>boulder(x,y,z,rnd(.6,2.4),R()<.25),.1,.95,(x,z)=>nearRiver(x,z,6));scatter(I,20,(x,y,z)=>spike(x,y,z,rnd(5,12),rnd(1,2)),.3,.9,(x,z)=>nearRiver(x,z,8));
  embers(0,0,126,0,80,1100);return{far:[0,170,300],farT:[0,18,0],near:[0,50,80],nearT:[0,20,0]};}});

// 7) shattered volcanic archipelago
DEFS.push({name:'부서진 화산 군도',tag:'연결 지형',desc:'폭발로 쪼개진 화산섬. 가운데 화산섬 둘레로 크고 작은 파편 섬 다섯 개가 높이를 달리해 떠 있고, 달궈진 거대 사슬로 본섬에 묶여 있음. 파편마다 용암이 흘러 섬 끝에서 떨어지고, 본섬 분화구에서 빛 입자가 터짐.',
 build(){W2=200;const main=island({R:72,depth:110,H:(x,z)=>volcano(x,z,0,0,44,22,8)+4+(fbm2(x*.05,z*.05)-.5)*5});const frags=[];
  for(let k=0;k<5;k++){const a=k/5*6.28+rnd(-.2,.2),d=rnd(118,140),r=rnd(18,28),cy=rnd(-24,26);frags.push(island({R:r,depth:r*2.2,cx:Math.cos(a)*d,cz:Math.sin(a)*d,cy,H:(x,z)=>5+(fbm2(x*.05+k*7,z*.05)-.5)*12+6*Math.exp(-Math.pow(Math.hypot(x,z)/(r*.4),2))}));}
  ISL=[main,...frags];
  for(let k=0;k<3;k++){const a=k/3*6.28+.5;traceRiver(main,V(Math.cos(a)*9,0,Math.sin(a)*9),V(Math.cos(a),0,Math.sin(a)));}
  frags.forEach(F=>{const a=Math.atan2(F.cz,F.cx)+rnd(-.6,.6);const rv=traceRiver(F,V(F.cx,0,F.cz),V(Math.cos(a),0,Math.sin(a)));rv.wStart=1.5;rv.wEnd=3.4;});
  buildHeat(blob=>{blob(0,0,30,.9);frags.forEach(F=>blob(F.cx,F.cz,F.R0*.6,.6));});ISL.forEach(buildIsland);
  const lakeY=main.Hw(0,0)+2;crater(0,lakeY,0,8,false);eruption(V(0,lakeY+.5,0),1.3,9,.4);
  frags.forEach((F,i)=>{const a=Math.atan2(F.cz,F.cx),pm=V(Math.cos(a)*main.ol(a)*.9,0,Math.sin(a)*main.ol(a)*.9),pf=V(F.cx-Math.cos(a)*F.R0*.8,0,F.cz-Math.sin(a)*F.R0*.8);pm.y=main.Hw(pm.x,pm.z)-2;pf.y=F.Hw(pf.x,pf.z)-2;
    torusLinks(pm,pf,10,1.15,'#2a1a14','#ff7a1a');const sd=V(-Math.sin(a),0,Math.cos(a));torusLinks(pm.clone().addScaledVector(sd,6),pf.clone().addScaledVector(sd,4),12,1,'#2a1a14','#ff7a1a');
    for(const q of[pm,pf]){spike(q.x,q.y+1,q.z,7,1.6);}
    if(i%2===0)for(let k=0;k<3;k++){const b=R()*6.28,d=rnd(0,F.R0*.6),x=F.cx+Math.cos(b)*d,z=F.cz+Math.sin(b)*d;if(!nearRiver(x,z,5))charredTree(V(x,F.Hw(x,z)-.4,z),rnd(.9,1.2));}
    scatter(F,24,(x,y,z)=>boulder(x,y,z,rnd(.6,2),R()<.3),.2,.9,(x,z)=>nearRiver(x,z,4));scatter(F,5,(x,y,z)=>spike(x,y,z,rnd(5,12),rnd(1,2)),.5,.9,(x,z)=>nearRiver(x,z,5));});
  for(let k=0;k<22;k++){const a=R()*6.28,d=rnd(16,50),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,7))continue;spike(x,main.Hw(x,z),z,rnd(6,18),rnd(1.2,2.6));}
  grove(main,R()*6.28,52,6);scatter(main,110,(x,y,z)=>boulder(x,y,z,rnd(.7,2.8),R()<.3),.25,.95,(x,z)=>nearRiver(x,z,6));
  embers(0,0,170,-30,90,1000);return{far:[0,230,400],farT:[0,0,0],near:[0,70,120],nearT:[0,20,0]};}});


// ---------------- small islands ----------------
const ringPts=(n,r0,ph)=>{const o=[];for(let k=0;k<n;k++){const a=k/n*6.28+(ph||0);o.push([Math.cos(a),Math.sin(a),a]);}return o;};
// 8) eruption pinnacle
DEFS.push({name:'분화 첨봉',tag:'작은 섬',desc:'작고 가파른 화산 봉우리 하나만 떠 있는 섬. 섬 밑바닥부터 화산 꼭대기까지 갈라진 균열 빛이 아래에서 위로 서서히 차오르고, 터지기 직전엔 깜빡임이 빨라짐. 가장 밝아지는 순간 빛 입자가 터져 솟구치고, 빛이 꺼졌다가 다시 차오름. 두 줄기 용암이 비탈을 타고 내려가 섬 끝에서 떨어짐. 비탈엔 흑요석 가시와 달궈진 용암탄이 박혀 있음.',
 build(){OWNU=true;const uF=UFRONT,uG=UGLOW,uL=UGLO,uS=USOFT;W2=60;const I=island({R:34,depth:72,H:(x,z)=>volcano(x,z,0,0,40,14,5)+2+(fbm2(x*.09+1,z*.09)-.5)*4});ISL=[I];
  [.6,.6+2.6].forEach(a=>{const rv=traceRiver(I,V(Math.cos(a)*5.5,0,Math.sin(a)*5.5),V(Math.cos(a),0,Math.sin(a)));rv.wStart=1.3;rv.wEnd=3;});
  buildHeat(blob=>{blob(0,0,14,1);blob(0,0,26,.6);blob(0,0,36,.45);});buildIsland(I);
  // charge-up: every crack on the cone slowly brightens; at full heat the cone erupts, then the glow collapses and builds again
  const P=5,TB=P-2.4,y=I.Hw(0,0)+2;crater(0,y,0,5,false);
  const fl=[0,1,2,3].map(k=>{const a=k/4*6.28+.4,l=new FakePL(C('#ff5a1a'),0,70,1.5);l.position.set(Math.cos(a)*16,I.Hw(Math.cos(a)*16,Math.sin(a)*16)+6,Math.sin(a)*16);W.add(l);return l;});
  const aura=glow('#ff4a10',70,0);aura.position.set(0,y-8,0);W.add(aura);const HOTC=new THREE.Color('#ff3a10'),FULL=new THREE.Color('#ffd27a');
  anim.push(t=>{const ph=t%P;let f=ph<TB?Math.pow(ph/TB,1.6):Math.exp(-(ph-TB)*3.2);const warn=ph<TB?clamp((ph/TB-.7)/.3,0,1):0,pulse=.5+.5*Math.sin(t*(3+warn*20));
    const yBot=I.cy-I.depth-8,yTop=y+6;if(ph<TB){uF.value=yBot+(yTop-yBot)*Math.pow(ph/TB,1.25);uL.value=.12;uG.value=1.6+f*1.8+warn*pulse*1.4;}else{uF.value=yTop+20;uL.value=.12;uG.value=.12+3.4*Math.exp(-(ph-TB)*3.2);}uS.value=7;fl.forEach(l=>{l.intensity=f*2.6+warn*pulse*1.6;l.color.copy(HOTC).lerp(FULL,warn*.6);});aura.material.opacity=f*.22+warn*pulse*.12;});
  eruption(V(0,y+.5,0),.95,P,.7,{v:2.9,n:1.8,g:2.3,gd:.3,term:12,life:2.6,f:2.6,size:1.25});
  // blast: white-hot core flash + expanding shock glow at the moment of eruption
  const core=glow('#fff0c0',10,0),shock=glow('#ff7a20',10,0);core.position.set(0,y+4,0);shock.position.set(0,y+2,0);W.add(core);W.add(shock);
  anim.push(t=>{const ph=t%P,e=ph-TB;if(e>=0&&e<1.2){const k=e/1.2;core.scale.setScalar(14+k*40);core.material.opacity=Math.max(0,1-k*1.6);shock.scale.setScalar(20+Math.pow(k,.5)*140);shock.material.opacity=.55*(1-k);}else{core.material.opacity=shock.material.opacity=0;}});
  for(let k=0;k<16;k++){const a=R()*6.28,d=rnd(8,26),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,3.5)||!I.inside(x,z,3))continue;spike(x,I.Hw(x,z),z,rnd(3,9),rnd(.6,1.4),new THREE.Euler(Math.sin(a)*.35,R()*3,-Math.cos(a)*.35));}
  scatter(I,60,(x,y,z)=>boulder(x,y,z,rnd(.4,1.4),R()<.45),.25,.95,(x,z)=>nearRiver(x,z,3));
  embers(0,0,34,0,60,320);return{far:[0,62,100],farT:[0,18,0],near:[0,44,46],nearT:[0,26,0]};}});
// 10) obsidian shard islet
DEFS.push({name:'흑요석 파편섬',tag:'작은 섬',desc:'날카로운 흑요석 결정이 땅을 뚫고 솟은 작은 섬. 결정 균열마다 마그마가 달아오르고, 부서진 결정 조각들이 섬 위 허공에 천천히 돌며 떠 있음. 결정 사이로 가는 용암 줄기가 흘러내림.',
 build(){W2=60;const I=island({R:22,depth:64,H:(x,z)=>7+(fbm2(x*.1+8,z*.1)-.5)*7});ISL=[I];
  const a0=R()*6.28,rv=traceRiver(I,V(Math.cos(a0)*3,0,Math.sin(a0)*3),V(Math.cos(a0),0,Math.sin(a0)));rv.wStart=1;rv.wEnd=2.2;
  buildHeat(blob=>{blob(0,0,14,.8);});buildIsland(I);
  const shard=(x,y,z,h,r,rot)=>{const g=new THREE.CylinderGeometry(0,r,h,5,1);g.translate(0,h/2,0);const g2=new THREE.CylinderGeometry(r,r*.7,h*.15,5,1);g2.translate(0,-h*.075,0);put('obsF',g,V(x,y-1,z),rot);put('obsF',g2,V(x,y-1,z),rot);};
  for(let k=0;k<9;k++){const a=R()*6.28,d=k?rnd(4,15):0,x=Math.cos(a)*d,z=Math.sin(a)*d;if(k&&nearRiver(x,z,3))continue;const h=k?rnd(6,14):24;shard(x,I.Hw(x,z),z,h,k?rnd(1.2,2.2):3.6,new THREE.Euler(k?Math.sin(a)*rnd(.2,.5):0,R()*3,k?-Math.cos(a)*rnd(.2,.5):0));}
  for(let k=0;k<7;k++){const h=rnd(3,6),r=rnd(.8,1.4),g=new THREE.CylinderGeometry(0,r,h,5,1),g2=new THREE.CylinderGeometry(0,r,h*.5,5,1);g2.rotateX(Math.PI);g2.translate(0,-h*.25,0);g.translate(0,h/2,0);
    const m=new THREE.Mesh(mergeG([g,g2]),obsidianFlatM);m.castShadow=true;const a=k/7*6.28,rad=rnd(8,16),y0=I.Hw(0,0)+rnd(14,26),sp=rnd(.08,.16),ph=R()*6;m.rotation.set(R()*3,R()*3,R()*3);W.add(m);
    const gl=glow('#ff4a10',r*5,.25);W.add(gl);anim.push(t=>{const aa=a+t*sp;m.position.set(Math.cos(aa)*rad,y0+Math.sin(t*.7+ph)*1.5,Math.sin(aa)*rad);m.rotation.y+=.004;m.rotation.x+=.002;gl.position.copy(m.position);});}
  scatter(I,40,(x,y,z)=>boulder(x,y,z,rnd(.3,1),R()<.4),.3,.95,(x,z)=>nearRiver(x,z,2.5));
  embers(0,0,24,0,45,240);return{far:[0,48,82],farT:[0,12,0],near:[0,26,34],nearT:[0,14,0]};}});
// 11) lone ember tree
DEFS.push({name:'잿불 고목섬',tag:'작은 섬',desc:'거대한 숯 고목 한 그루가 섬 전체를 덮고 선 섬. 갈라진 껍질 틈과 잎 가장자리가 잿불로 타오르고, 뿌리 사이 열원에서 흘러나온 용암 개울이 섬 끝으로 떨어짐. 가지 사이로 연기가 피어오름.',
 build(){W2=60;const I=island({R:27,depth:70,H:(x,z)=>{const r=Math.hypot(x,z);return 9+4*Math.exp(-Math.pow(r/10,2))+(fbm2(x*.08+2,z*.08)-.5)*5;}});ISL=[I];
  const a0=R()*6.28,rv=traceRiver(I,V(Math.cos(a0)*6,0,Math.sin(a0)*6),V(Math.cos(a0),0,Math.sin(a0)));rv.wStart=1;rv.wEnd=2.6;
  buildHeat(blob=>{blob(0,0,10,.9);for(let k=0;k<10;k++){const a=R()*6.28,d=rnd(4,20);blob(Math.cos(a)*d,Math.sin(a)*d,rnd(3,6),.5);}});buildIsland(I);
  charredTree(V(0,I.Hw(0,0)-.8,0),3.1);for(let k=0;k<26;k++){const a=R()*6.28,d=rnd(2,22),x=Math.cos(a)*d,z=Math.sin(a)*d;if(nearRiver(x,z,2.5))continue;groundLeaves(x,I.Hw(x,z),z,6,rnd(.7,1));}
  const g=glow('#ff5a14',16,.35);g.position.set(rv[0].x,rv[0].y+1,rv[0].z);W.add(g);smokeSrc(V(0,I.Hw(0,0)+30,0),8,10,1.1);smokeSrc(V(0,I.Hw(0,0)+2,0),4,6,.8);
  for(let k=0;k<3;k++){const a=a0+2+k*1.3,d=rnd(12,18);charredTree(V(Math.cos(a)*d,I.Hw(Math.cos(a)*d,Math.sin(a)*d)-.4,Math.sin(a)*d),rnd(.6,.85));}
  scatter(I,30,(x,y,z)=>boulder(x,y,z,rnd(.4,1.2),R()<.3),.4,.95,(x,z)=>nearRiver(x,z,2.5));
  embers(0,0,30,5,70,500);return{far:[0,70,110],farT:[0,24,0],near:[26,30,34],nearT:[0,30,0]};}});
// 12) arch rock islet
DEFS.push({name:'바위 아치섬',tag:'작은 섬',desc:'섬 양 끝에서 솟은 바위가 하늘 높이 거대한 아치로 이어진 섬. 아치 표면 균열이 달아오르고, 아치 아래로 용암 강이 지나 섬 끝에서 떨어짐. 아치 사이를 통과하는 비행 관문.',
 build(){W2=60;const I=island({R:32,depth:78,H:(x,z)=>8+(fbm2(x*.07+3,z*.07)-.5)*6-2*Math.exp(-Math.pow(z/6,2))});ISL=[I];
  const rv=traceRiver(I,V(-24,0,0),V(1,0,0),p=>V(1,0,-p.z*.2));rv.wStart=1.6;rv.wEnd=3;
  buildHeat(blob=>{for(let x=-26;x<28;x+=4)blob(x,0,7,.4);});buildIsland(I);
  const p0=V(0,0,-20),p1=V(2,0,20);p0.y=I.Hw(p0.x,p0.z)-1.5;p1.y=I.Hw(p1.x,p1.z)-1.5;stoneArch(p0,p1,30,3.6);
  [p0,p1].forEach(q=>{for(let k=0;k<5;k++){const a=R()*6.28,d=rnd(3,7),x=q.x+Math.cos(a)*d,z=q.z+Math.sin(a)*d;if(I.inside(x,z,2))spike(x,I.Hw(x,z),z,rnd(4,10),rnd(.8,1.6));}});
  const ag=glow('#ff5a14',20,.25);ag.position.set(1,p0.y+30,0);W.add(ag);
  for(let k=0;k<2;k++){const x=rnd(-14,14),z=k?rnd(9,18):-rnd(9,18);charredTree(V(x,I.Hw(x,z)-.4,z),rnd(.6,.8));}
  scatter(I,55,(x,y,z)=>boulder(x,y,z,rnd(.4,1.4),R()<.3),.2,.95,(x,z)=>nearRiver(x,z,3));smokeSrc(V(0,I.Hw(0,0)+1,0),3,6,.7);
  embers(0,0,32,0,55,300);return{far:[60,56,90],farT:[0,16,0],near:[34,16,0],nearT:[0,18,0]};}});
// 13) basalt crown islet
DEFS.push({name:'현무암 왕관섬',tag:'작은 섬',desc:'육각 현무암 기둥이 계단처럼 솟아 왕관 모양을 이룬 섬. 기둥 꼭대기 사이 틈으로 용암이 배어 나와 세 갈래로 흘러내리고, 섬 끝에서 폭포로 떨어짐. 기둥 둘레로 김이 피어오름.',
 build(){W2=60;const I=island({R:27,depth:70,H:(x,z)=>7+(fbm2(x*.09+6,z*.09)-.5)*5});ISL=[I];
  ringPts(3,0,R()*6).forEach(([c,s])=>{const rv=traceRiver(I,V(c*12,0,s*12),V(c,0,s));rv.wStart=1.2;rv.wEnd=2.6;});
  buildHeat(blob=>{blob(0,0,16,.9);});buildIsland(I);basaltField(I,0,0,11,20);
  for(let k=0;k<3;k++){const a=R()*6.28,d=rnd(15,20),x=Math.cos(a)*d,z=Math.sin(a)*d;if(!nearRiver(x,z,5))basaltField(I,x,z,rnd(3,4.5),rnd(4,8));}
  const cy=I.Hw(0,0)+21;const g=glow('#ff6a1a',18,.3);g.position.set(0,cy,0);W.add(g);const pl=new FakePL(C('#ff6a2a'),2,50,1.5);pl.position.set(0,cy+4,0);W.add(pl);
  ringPts(3,0,0).forEach(([c,s])=>smokeSrc(V(c*10,I.Hw(c*10,s*10)+3,s*10),2,5,.6));
  scatter(I,40,(x,y,z)=>boulder(x,y,z,rnd(.4,1.2),R()<.35),.45,.95,(x,z)=>nearRiver(x,z,2.5));
  embers(0,0,28,0,50,260);return{far:[0,56,90],farT:[0,12,0],near:[0,34,36],nearT:[0,18,0]};}});



const api={DEFS,TU,dot,SMK,addCracks,
  build(i,o){o=o||{};const cm=THREE.ColorManagement.enabled;THREE.ColorManagement.enabled=false;try{R=mulberry32(o.seed||81207);Q=o.q||1;PQ=o.pq==null?1:o.pq;TQ=o.tq||1;MINB=o.minb||0;TD=o.td==null?2:o.td;QT=o.qt||Q;VOPT=o.v||{};
    newWorld();const view=DEFS[i].build();finish();
    return{W,anim:anim.slice(),ISL:ISL.slice(),puffs:puffs.slice(),embers:EMB.slice(),drips:DRIPS.slice(),spikes:SPK.slice(),arcs:ARC.slice(),view};}finally{THREE.ColorManagement.enabled=cm;}}};
return api;
} finally { THREE.ColorManagement.enabled=cm0; } }
