/* 우주 정글 (사용자 2026-11-07: 다음 단계는 우주 정글 · 미니맵 Lv2 정글 자리 = 초원 안쪽 고리)
   · 지형 모양·빛·움직임은 사용자가 만든 "우주 정글 하늘섬 지형 키트"(지형 10종)의 생성 코드를 그대로 옮겨 씀 (아래 KIT 부분)
   · 칠 방식만 이 게임에 맞게: 키트의 조명(보랏빛 하늘·청백 주광·자홍 역광)을 꼭짓점에서 한 번 계산 → 바깥 햇빛과 상관없이 키트에서 본 그대로
   · 배치 (사용자 2026-11-07 결정):
       기지 사이 열 곳마다 — 위층/아래층 던전 하나(번갈아 · 정글 + 몬스터 + 보물 · 문으로 감) + 가운데층 몬스터 사냥터 하나(문 없이 바로)
       기지 앞쪽 각도마다 — 정글 지형 둘(균사 뿌리섬 · 수정 산호 숲 · 촉수 나무 숲 · 포자 거품 늪 · 거대 포식 꽃 · 공중 해파리 군락을 돌려 가며) + 작은 부유체 모음
       기지 두 곳에 하나 — 덩굴 기둥 쌍섬(아래층에서 위층까지 · 층을 뚫는 기둥 = 장애물)
     알 둥지는 이번엔 안 씀 · 포식 꽃·촉수 나무·해파리는 장식(기체를 막거나 잡지 않음)
   · 초원 → 정글은 점점: 경계 둘레에 작은 부유체가 섞이고, 기체가 안쪽으로 들어갈수록 하늘이 어두운 보랏빛으로 (skymap에서) */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { spiralPath, SWEEP } from './path.js?v=11100813';
import { buildSanctum } from './jsanct.js?v=11100813';
export { SANCT_TEST } from './jsanct.js?v=11100813';
import { makeDresser } from './jdress.js?v=11100813';
let CAM = { position: new THREE.Vector3() };
let LOD_T = .5, LOD_N = 30;   /* 섬 둘레 · 덩굴 마디 수 (키트 원래 44 · 1배) */
/* ===================== 우주 정글 지형 키트 (사용자 제작 · 생성 코드 그대로) ===================== */
// ---------- utils ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
let R=mulberry32(90417);
const rnd=(a,b)=>a+(b-a)*R(),rint=()=>Math.floor(R()*1e5),pick=a=>a[Math.floor(R()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const V=(x,y,z)=>new THREE.Vector3(x,y,z),E=(x,y,z)=>new THREE.Euler(x||0,y||0,z||0);
const UP=V(0,1,0);
function hash3(x,y,z){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,1440662683);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function jitter(geo,axz,ay,seed){const p=geo.attributes.position,s=seed|0;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),kx=Math.round(x*40),ky=Math.round(y*40),kz=Math.round(z*40);
    p.setXYZ(i,x+(hash3(kx+s,ky,kz)-.5)*2*axz,y+(hash3(kx,ky+s,kz+7)-.5)*2*ay,z+(hash3(kx,ky,kz+s+13)-.5)*2*axz);}return geo;}
function shade(hex,k){const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();}
function eulerTo(dir){return new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,dir.clone().normalize()));}

function canvasDot(){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);}
const dot=canvasDot();
// ---------- alien liquid shader ----------
const T={value:0};
const LQ_V='varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const LQ_F=`uniform float time;uniform float mode;uniform vec2 sc;uniform float flow;uniform float inten;uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;varying vec2 vUv;varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.07;a*=.5;}return v;}
void main(){vec2 p=mode<.5?vW.xz*.15:vUv*sc;p.y-=time*flow;
 vec2 w=vec2(fbm(p+vec2(0.,time*.05)),fbm(p+vec2(5.2,1.3)-time*.04));
 float v=fbm(p*1.1+w*2.4);float r=1.-abs(fbm(p*2.6+w*1.4)*2.-1.);r=pow(r,6.);
 float k=clamp(v*.9+r*.8-.2+mode*.2,0.,1.1);
 vec3 c=mix(c0,c1,smoothstep(.05,.4,k));c=mix(c,c2,smoothstep(.42,.7,k));c=mix(c,c3,smoothstep(.75,1.,k));
 gl_FragColor=vec4(c*inten,1.);}`;
const RAMP={void:['#06021a','#3a1680','#22d6d0','#d8ff8a'],rose:['#14021a','#6a0a5a','#ff3cc8','#ffe0ff']};
function liquidMat(o){o=o||{};const rp=RAMP[o.ramp||'void'];return new THREE.ShaderMaterial({uniforms:{time:T,mode:{value:o.uv?1:0},sc:{value:new THREE.Vector2(o.sx||1,o.sy||1)},flow:{value:o.flow==null?.04:o.flow},inten:{value:o.i||1.1},
  c0:{value:new THREE.Color(rp[0])},c1:{value:new THREE.Color(rp[1])},c2:{value:new THREE.Color(rp[2])},c3:{value:new THREE.Color(rp[3])}},vertexShader:LQ_V,fragmentShader:LQ_F,side:o.side||THREE.FrontSide});}
function fresnelMat(color,power,op){return new THREE.ShaderMaterial({uniforms:{c:{value:new THREE.Color(color)},p:{value:power||2.2},o:{value:op==null?1:op}},
  vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 c;uniform float p;uniform float o;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),p);gl_FragColor=vec4(c*(f*1.5+.1),(f*.9+.1)*o);}',
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});}
function outlineGeo(fn,N){N=N||72;const sh=new THREE.Shape();for(let i=0;i<N;i++){const a=i/N*6.2832,r=fn(a);i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r);}const g=new THREE.ShapeGeometry(sh);g.rotateX(-Math.PI/2);return g;}

// ---------- batching ----------
const rockMat=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:10,specular:new THREE.Color('#1a2040')});
const glossMat=new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,shininess:90,specular:new THREE.Color('#9ad8ff')});
const glowMat=new THREE.MeshBasicMaterial({vertexColors:true});
const _c=new THREE.Color(),_q=new THREE.Quaternion(),_m=new THREE.Matrix4();
function newB(){return{rock:[],gloss:[],glow:[]};}
function add(B,geo,pos,rot,scl,color,o){o=o||{};
  const g=geo.index?geo.toNonIndexed():geo;if(g!==geo)geo.dispose();g.deleteAttribute('uv');if(!g.attributes.normal)g.computeVertexNormals();
  const p=g.attributes.position,n=p.count,cols=new Float32Array(n*3);g.computeBoundingBox();
  const bb=g.boundingBox,hy=(bb.max.y-bb.min.y)||1,base=new THREE.Color(color),gc=o.grad?new THREE.Color(o.grad):null,vary=o.vary==null?.08:o.vary;
  for(let i=0;i<n;i+=3){const f=1+(R()-.5)*2*vary;for(let k=0;k<3&&i+k<n;k++){const j=i+k;_c.copy(base);
    if(gc){const t=clamp((p.getY(j)-bb.min.y)/hy,0,1);_c.copy(gc).lerp(base,o.pow?Math.pow(t,o.pow):t);}
    cols[j*3]=_c.r*f;cols[j*3+1]=_c.g*f;cols[j*3+2]=_c.b*f;}}
  g.setAttribute('color',new THREE.BufferAttribute(cols,3));
  _q.setFromEuler(rot||E());_m.compose(pos,_q,scl||V(1,1,1));g.applyMatrix4(_m);B[o.to||'rock'].push(g);}
// world-space geometry (already positioned), colored by a per-vertex function
function addRaw(B,geo,colorFn,to){const g=geo.index?geo.toNonIndexed():geo;if(g!==geo)geo.dispose();g.deleteAttribute('uv');
  const p=g.attributes.position,n=p.count,cols=new Float32Array(n*3);for(let i=0;i<n;i++){colorFn(i/(n-1),p.getY(i),_c);cols[i*3]=_c.r;cols[i*3+1]=_c.g;cols[i*3+2]=_c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(cols,3));B[to||'rock'].push(g);}
function merge(list){let n=0;list.forEach(g=>n+=g.attributes.position.count);
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
  list.forEach(g=>{P.set(g.attributes.position.array,o);N.set(g.attributes.normal.array,o);C.set(g.attributes.color.array,o);o+=g.attributes.position.count*3;g.dispose();});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('color',new THREE.BufferAttribute(C,3));m.computeBoundingSphere();return m;}
function flush(B,group){[['rock',rockMat],['gloss',glossMat],['glow',glowMat]].forEach(([k,mat])=>{if(B[k].length)group.add(new THREE.Mesh(merge(B[k]),mat));});}

const STONE=['#1d2232','#262a3e','#1a1d2b','#2d2a44','#171a26'];
const GLOWS={cyan:'#3cf6ff',mag:'#ff3cf0',lime:'#9dff3c',vio:'#9a6cff',teal:'#3cffc0'};
let anim=[];
let ISL=null;   /* 조각을 만들 때 맨 처음 세운 섬의 윗면 (바깥선·높이) — 정글 꾸미기가 씀 */

// layered alien rock underside; returns bottom y
function strata(B,x,y,z,r,depth,layers,vein){let yy=y,rr=r;layers=layers||5;
  for(let i=0;i<layers;i++){const h=depth/layers*rnd(.75,1.25),last=i===layers-1,r2=last?rr*.08:rr*rnd(.68,.84),col=STONE[i%STONE.length];
    add(B,jitter(new THREE.CylinderGeometry(rr,Math.max(r2,.4),h,9,2),rr*.1,h*.06,rint()),V(x+rnd(-.6,.6),yy-h/2,z+rnd(-.6,.6)),E(0,R()*6,0),null,col,{grad:shade(col,.5)});
    if(!last&&R()<.8){const nb=2+Math.floor(R()*4);for(let k=0;k<nb;k++){const a=R()*6.28;
      add(B,new THREE.OctahedronGeometry(1,0),V(x+Math.cos(a)*r2*.98,yy-h+.2,z+Math.sin(a)*r2*.98),E(0,-a,rnd(-.3,.3)),V(rnd(.4,.8),rnd(.6,1.4),rnd(.4,.8)),vein||GLOWS.vio,{to:'glow',vary:.1});}}
    yy-=h;rr=Math.max(r2,.4);}return yy;}
function slab(B,x,y,z,r,h,col){add(B,jitter(new THREE.CylinderGeometry(r,r*.95,h,11,1),r*.08,.2,rint()),V(x,y-h/2,z),E(0,R()*6,0),null,col||'#232a3c',{grad:'#161a28'});}
function topPoint(r,a0,a1){const a=R()*Math.PI*2,d=Math.sqrt(rnd(a0*a0,a1*a1))*r;return[Math.cos(a)*d,Math.sin(a)*d];}
// ---------- irregular island generator ----------
function makeOutline(r,o){const lobes=o.lobes||pick([2,3,3,4,5]),amp=o.amp==null?rnd(.12,.24):o.amp,ph=[R()*6,R()*6,R()*6],ex=o.ex||rnd(.72,1.32),rot=R()*6.28,bites=[];
  const nb=o.bites==null?Math.floor(R()*3):o.bites;for(let k=0;k<nb;k++)bites.push([R()*6.28,rnd(.28,.5),rnd(.12,.24)]);
  return a=>{let k=1+amp*(Math.sin(a*lobes+ph[0])*.6+Math.sin(a*(lobes+2)+ph[1])*.3+Math.sin(a*7+ph[2])*.15);
    bites.forEach(([ba,w,d])=>{const da=Math.abs(((a-ba+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI);if(da<w)k-=d*Math.cos(da/w*Math.PI/2);});
    const c=Math.cos(a-rot),s=Math.sin(a-rot),e=1/Math.sqrt(c*c/(ex*ex)+s*s*ex*ex);return Math.max(r*(o.min||.45),r*k*e);};}
// tapered ring band between two outlines (yTop > yBot), with optional caps
function loft(B,x,z,fT,yT,cT,fB,yB,cB,capT,capB,col,grad){const N=LOD_N,P=[];
  const pt=(f,yv,c,a)=>{const r=f(a);return[c[0]+Math.cos(a)*r,yv,c[1]+Math.sin(a)*r];};
  for(let i=0;i<N;i++){const a0=i/N*6.2832,a1=(i+1)/N*6.2832,t0=pt(fT,yT,cT,a0),t1=pt(fT,yT,cT,a1),b0=pt(fB,yB,cB,a0),b1=pt(fB,yB,cB,a1);
    P.push(...t0,...t1,...b1,...t0,...b1,...b0);
    if(capT)P.push(cT[0],yT,cT[1],...t1,...t0);if(capB)P.push(cB[0],yB,cB[1],...b0,...b1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));jitter(g,.3,.1,rint());g.computeVertexNormals();
  add(B,g,V(x,0,z),null,null,col,{grad,vary:.09});}
function isle(B,x,y,z,o){o=o||{};const r=o.r,fn=makeOutline(r,o);if(!ISL&&!o.flip&&!x&&!z)ISL={fn,y,r};const h=o.h||3,depth=o.depth||r*1.3,L=o.layers||5,flip=!!o.flip,vein=o.vein||GLOWS.vio,topCol=o.top||'#22283a';
  const f96=a=>fn(a)*.96;
  if(!flip)loft(B,x,z,fn,y,[0,0],f96,y-h,[0,0],true,false,topCol,'#141826');
  else loft(B,x,z,f96,y+h,[0,0],fn,y,[0,0],false,true,topCol,'#141826');
  let yy=flip?y+h:y-h,sf=.96,c=[0,0],cur=f96,end=yy;
  for(let i=0;i<L;i++){const last=i===L-1,hh=depth/L*rnd(.7,1.3),sf2=last?sf*rnd(.12,.2):sf*rnd(.64,.84),c2=[c[0]+rnd(-1,1)*r*.09,c[1]+rnd(-1,1)*r*.09],ph=R()*6,kk=3+i;
    const nxt=a=>fn(a)*sf2*(1+.1*Math.sin(a*kk+ph)),col=STONE[(i+(flip?2:0))%STONE.length];
    if(!flip){loft(B,x,z,cur,yy,c,nxt,yy-hh,c2,false,last,col,shade(col,.5));}
    else{loft(B,x,z,nxt,yy+hh,c2,cur,yy,c,last,false,col,shade(col,.5));}
    // glowing veins on the band edge
    if(!last){const nv=2+Math.floor(R()*4);for(let k=0;k<nv;k++){const a=R()*6.28,rr=nxt(a)*.98,vy=flip?yy+hh-.2:yy-hh+.2;
      add(B,new THREE.OctahedronGeometry(1,0),V(x+c2[0]+Math.cos(a)*rr,vy,z+c2[1]+Math.sin(a)*rr),E(0,-a,rnd(-.3,.3)),V(rnd(.4,.8),rnd(.6,1.4),rnd(.4,.8)),vein,{to:'glow',vary:.1});}}
    // hanging (or rising) spikes from this band
    if(!flip&&R()<.55){const a=R()*6.28,rr=nxt(a)*rnd(.3,.7),Ls=depth*rnd(.15,.35),rs=r*rnd(.06,.12);
      add(B,jitter(new THREE.ConeGeometry(rs,Ls,6,2),rs*.2,.1,rint()),V(x+c2[0]+Math.cos(a)*rr,yy-hh-Ls/2+.3,z+c2[1]+Math.sin(a)*rr),E(Math.PI,0,0),null,shade(col,.7),{grad:col});}
    yy=flip?yy+hh:yy-hh;sf=sf2;c=c2;cur=nxt;end=yy;}
  // several tips at the very bottom instead of one centred point
  if(!flip){const nt=2+Math.floor(R()*3);for(let k=0;k<nt;k++){const a=R()*6.28,rr=cur(a)*rnd(0,.9),Ls=depth*rnd(.12,.3),rs=Math.max(.6,cur(a)*rnd(.3,.6));
    add(B,jitter(new THREE.ConeGeometry(rs,Ls,6,2),rs*.15,.1,rint()),V(x+c[0]+Math.cos(a)*rr,end-Ls/2+.3,z+c[1]+Math.sin(a)*rr),E(Math.PI,0,0),null,'#171a26',{grad:'#262a3e'});}}
  return{fn,end,pt:(f0,f1)=>{const a=R()*6.2832,d=Math.sqrt(rnd(f0*f0,f1*f1))*fn(a);return[x+Math.cos(a)*d,z+Math.sin(a)*d];},edge:(a,f)=>{const d=fn(a)*f;return[x+Math.cos(a)*d,z+Math.sin(a)*d];}};}

// ---------- particles (never frustum-culled) ----------
function spores(group,count,rx,ry0,ry1,col,size,speed,cx,cz){cx=cx||0;cz=cz||0;
  const g=new THREE.BufferGeometry(),pos=new Float32Array(count*3),sp=new Float32Array(count);
  for(let i=0;i<count;i++){const a=R()*6.28,d=Math.sqrt(R())*rx;pos[i*3]=cx+Math.cos(a)*d;pos[i*3+1]=rnd(ry0,ry1);pos[i*3+2]=cz+Math.sin(a)*d;sp[i]=rnd(.4,1.4);}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:size||.8,map:dot,color:col||GLOWS.cyan,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;group.add(pts);
  anim.push((t,dt)=>{for(let i=0;i<count;i++){let y=pos[i*3+1]+dt*(speed||1.6)*sp[i];if(y>ry1)y=ry0;pos[i*3+1]=y;pos[i*3]+=Math.sin(t*.6+i)*dt*.7;pos[i*3+2]+=Math.cos(t*.5+i*1.3)*dt*.7;}g.attributes.position.needsUpdate=true;});}
function drips(group,points,fall,col){const n=points.length*3,g=new THREE.BufferGeometry(),pos=new Float32Array(n*3),ph=[];
  for(let i=0;i<n;i++){const p=points[i%points.length];pos.set([p.x,p.y,p.z],i*3);ph.push(R());}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const d=new THREE.Points(g,new THREE.PointsMaterial({size:1.1,map:dot,color:col||GLOWS.cyan,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));d.frustumCulled=false;group.add(d);
  anim.push(t=>{for(let i=0;i<n;i++){const p=points[i%points.length],k=((t*.35+ph[i])%1);pos[i*3+1]=p.y-k*k*fall;}g.attributes.position.needsUpdate=true;});}
function glowSprite(col,s,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,color:col,transparent:true,opacity:op==null?.8:op,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);return m;}

// ---------- reusable alien flora ----------
function coral(B,p,s,tipCol){
  const tips=[];
  (function br(o,dir,len,rad,d){const end=o.clone().addScaledVector(dir,len);
    add(B,new THREE.CylinderGeometry(rad*.7,rad,len,6),o.clone().addScaledVector(dir,len/2),eulerTo(dir),null,'#26476a',{grad:'#152234',vary:.1});
    if(d===0){tips.push(end);add(B,new THREE.IcosahedronGeometry(rad*1.6,0),end,null,null,tipCol,{to:'glow',vary:.1});return;}
    const nc=2+(R()<.4?1:0);for(let k=0;k<nc;k++){const nd=dir.clone().applyAxisAngle(V(R()-.5,0,R()-.5).normalize(),rnd(.35,.75)).add(V(0,.25,0)).normalize();br(end,nd,len*rnd(.66,.8),rad*.68,d-1);}
  })(p.clone(),V(rnd(-.15,.15),1,rnd(-.15,.15)).normalize(),3.4*s,.7*s,4);
  return tips;}
function pagoda(B,p,s,col,down){const dirY=down?-1:1,h=rnd(5,13)*s,tiers=2+Math.floor(R()*3);
  add(B,new THREE.CylinderGeometry(.22*s,.38*s,h,6),V(p.x,p.y+dirY*h/2,p.z),null,null,'#c9c2e6',{grad:'#5a5478'});
  for(let k=0;k<tiers;k++){const t=1-k/(tiers+.5),cy=p.y+dirY*h*t,r=(1.2+k*.9)*s*rnd(.85,1.1);
    add(B,new THREE.CylinderGeometry(r*.35,r,.5*s,10),V(p.x,cy,p.z),down?E(Math.PI,0,0):null,null,'#2c2350',{vary:.08});
    add(B,new THREE.TorusGeometry(r*.95,.12*s,4,14),V(p.x,cy-dirY*.25*s,p.z),E(Math.PI/2,0,0),null,col,{to:'glow',vary:0});
    for(let g2=0;g2<6;g2++){const a=g2/6*6.28+k;add(B,new THREE.BoxGeometry(.12*s,.06,r*.75),V(p.x+Math.cos(a)*r*.45,cy-dirY*.27*s,p.z+Math.sin(a)*r*.45),E(0,-a+1.57,0),null,col,{to:'glow',vary:0});}}}
function shelf(B,x,y,z,a,r,col){add(B,new THREE.CylinderGeometry(r,r,.35,10,1,false,0,Math.PI),V(x,y,z),E(0,-a-Math.PI/2,0),null,'#2a2348',{vary:.1});
  add(B,new THREE.TorusGeometry(r,.1,3,12,Math.PI),V(x,y-.2,z),E(Math.PI/2,0,-a+Math.PI/2),null,col,{to:'glow',vary:0});}
function tube(pts,rad,seg){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(5,Math.round((seg||24)*LOD_T)),rad,5,false);}   /* 게임 속 크기(키트의 0.2~0.4배)에선 마디를 반으로 줄여도 같아 보임 */
function eyeStalk(G,B,p,s,eyes){const h=rnd(2.5,5)*s,lean=V(rnd(-.4,.4),1,rnd(-.4,.4)).normalize();
  const top=p.clone().addScaledVector(lean,h);
  add(B,tube([p.clone(),p.clone().addScaledVector(lean,h*.5).add(V(rnd(-.6,.6),0,rnd(-.6,.6))),top],.22*s,10),V(0,0,0),null,null,'#3a2c5a',{grad:'#1e1834'});
  const e=new THREE.Group();e.position.copy(top);G.add(e);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.75*s,14,10),new THREE.MeshPhongMaterial({color:'#e8f0ff',emissive:'#334466',shininess:80}));e.add(ball);
  const iris=new THREE.Mesh(new THREE.CircleGeometry(.42*s,16),new THREE.MeshBasicMaterial({color:pick([GLOWS.lime,GLOWS.mag,GLOWS.cyan])}));iris.position.z=.74*s;e.add(iris);
  const pup=new THREE.Mesh(new THREE.CircleGeometry(.18*s,12),new THREE.MeshBasicMaterial({color:'#05040a'}));pup.position.z=.76*s;pup.scale.y=1.8;e.add(pup);
  eyes.push({e,ph:R()*10,blink:R()*5});}
export function hideMark(G,x,y,z,r){const m=new THREE.Object3D();m.position.set(x,y,z);m.userData.hideR=r;m.name='hide';G.add(m);return m;}   /* 숨을 곳 표시: 빈 점 하나 (그리지 않음) · 반지름은 섬 크기만큼 함께 커짐 */
function jellyfish(G,center,r,col,orbitR,speed){const g=new THREE.Group();G.add(g);g.userData.jelly=r;   /* 기믹: 닿으면 튕김 (gimmick.js가 찾음) */
  const bell=new THREE.Mesh(new THREE.SphereGeometry(r,18,10,0,Math.PI*2,0,Math.PI*.55),fresnelMat(col,1.8,.9));g.add(bell);
  const core=glowSprite(col,r*2.4,.55);core.position.y=r*.25;g.add(core);
  const inner=new THREE.Mesh(new THREE.SphereGeometry(r*.35,10,8),new THREE.MeshBasicMaterial({color:col}));inner.position.y=r*.2;g.add(inner);
  const nt=7,np=14,lines=[];for(let k=0;k<nt;k++){const geo=new THREE.BufferGeometry(),arr=new Float32Array(np*3);geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));l.frustumCulled=false;g.add(l);lines.push({arr,geo,a:k/nt*6.28,len:r*rnd(2.4,4)});}
  const ph=R()*10;
  anim.push(t=>{const a=t*speed+ph;g.position.set(center.x+Math.cos(a)*orbitR,center.y+Math.sin(t*.7+ph)*2.2,center.z+Math.sin(a)*orbitR);
    const pulse=Math.sin(t*2.2+ph),sq=g.userData.sq||0;bell.scale.set((1+pulse*.08)*(1+sq*.35),(1-pulse*.14)*(1-sq*.5),(1+pulse*.08)*(1+sq*.35));   /* 기체가 튕겨 나가면 갓이 납작하게 눌렸다 출렁 돌아옴 */g.rotation.z=Math.sin(t*.5+ph)*.12;
    lines.forEach(L=>{for(let i=0;i<np;i++){const f=i/(np-1),rr=r*.75*(1-f*.4);L.arr[i*3]=Math.cos(L.a)*rr+Math.sin(t*1.6+f*5+L.a)*f*r*.5;L.arr[i*3+1]=-f*L.len;L.arr[i*3+2]=Math.sin(L.a)*rr+Math.cos(t*1.3+f*4+L.a)*f*r*.5;}L.geo.attributes.position.needsUpdate=true;});});}
function tentacleTree(G,p,s,podCol,mat,spotMat){let parent=new THREE.Group();parent.position.copy(p);G.add(parent);
  const segs=7,ph=R()*10,joints=[];let rad=.9*s;
  for(let i=0;i<segs;i++){const L=rnd(1.8,2.5)*s,m=new THREE.Mesh(new THREE.CylinderGeometry(rad*.8,rad,L,7),mat);m.position.y=L/2;parent.add(m);
    if(i%2===0){for(let k=0;k<2;k++){const sp=new THREE.Mesh(new THREE.SphereGeometry(rad*.28,6,4),spotMat);sp.position.set(Math.cos(k*3+i)*rad*.85,L*rnd(.3,.7),Math.sin(k*3+i)*rad*.85);parent.add(sp);}}
    const j=new THREE.Group();j.position.y=L;parent.add(j);joints.push(j);parent=j;rad*=.8;}
  const pod=new THREE.Mesh(new THREE.SphereGeometry(1.1*s,12,10),new THREE.MeshBasicMaterial({color:podCol}));pod.scale.y=1.35;pod.position.y=.9*s;parent.add(pod);
  const pg=glowSprite(podCol,6*s,.6);pod.add(pg);
  anim.push(t=>{joints.forEach((j,i)=>{j.rotation.x=Math.sin(t*.9+ph+i*.6)*.16;j.rotation.z=Math.cos(t*.7+ph*1.3+i*.5)*.13;});const k=.85+.15*Math.sin(t*2+ph);pod.scale.set(k,1.35*k,k);});}

// =============================================================
//  PIECES
// =============================================================
const PIECES=[];

// 1) 균사 뿌리섬
PIECES.push({name:'균사 뿌리섬',tags:['기본 섬','중형'],fy:-4,size:30,
  desc:'섬 아래로 빛나는 균사 뿌리가 촉수처럼 엉켜 매달림. 뿌리 끝에서 발광 액체가 떨어지고, 위에는 층층이 탑 모양 버섯과 절벽에 붙은 선반 버섯이 빛남.',
  build(G){const B=newB(),I=isle(B,0,0,0,{r:20,h:3,depth:12,layers:3,vein:GLOWS.cyan,amp:.22}),tipsDrops=[];
    for(let k=0;k<30;k++){const[a,b]=I.pt(0,.8);let p=V(a,-rnd(4,9),b);const pts=[p.clone()],steps=4+Math.floor(R()*4);
      for(let s=0;s<steps;s++){p=p.clone().add(V(rnd(-3,3)+a*.06,-rnd(3.5,7),rnd(-3,3)+b*.06));pts.push(p);}
      const rad=rnd(.3,1.1),col=k%3?GLOWS.cyan:GLOWS.teal;addRaw(B,tube(pts,rad,28),(f,y,c)=>{c.set('#1a2030').lerp(new THREE.Color(col),Math.pow(f,3.2));},'glow');
      add(B,new THREE.IcosahedronGeometry(rad*1.4,0),p,null,null,col,{to:'glow',vary:0});tipsDrops.push(p.clone().add(V(0,-.8,0)));}
    for(let k=0;k<8;k++){const[a,b]=I.pt(.1,.78);pagoda(B,V(a,0,b),rnd(.7,1.2),pick([GLOWS.mag,GLOWS.cyan,GLOWS.vio]));}
    for(let k=0;k<14;k++){const a=R()*6.28,[ex,ez]=I.edge(a,.97);shelf(B,ex,-rnd(.5,2.5),ez,a,rnd(1,2.2),pick([GLOWS.mag,GLOWS.cyan]));}
    for(let k=0;k<40;k++){const[a,b]=I.pt(0,.93);add(B,new THREE.IcosahedronGeometry(rnd(.12,.3),0),V(a,.1,b),null,null,pick([GLOWS.cyan,GLOWS.vio,GLOWS.lime]),{to:'glow',vary:0});}
    flush(B,G);drips(G,tipsDrops,26,GLOWS.cyan);spores(G,120,20,0,22,GLOWS.cyan,.7,1.4);}});

// 2) 수정 산호 숲
PIECES.push({name:'수정 산호 숲',tags:['정글','엄폐 지형'],fy:5,size:28,
  desc:'나무 대신 가지가 갈라지는 수정 산호가 숲을 이룸. 가지 끝마다 청록·분홍 결정이 빛나고, 바닥엔 발광 결절이 깔림. 가지 사이 틈을 누비는 회피 구간.',
  build(G){const B=newB(),I=isle(B,0,0,0,{r:23,depth:30,vein:GLOWS.mag});
    const placed=[];for(let k=0;k<15;k++){for(let t=0;t<24;t++){const[a,b]=I.pt(0,.76);if(placed.every(q=>Math.hypot(q[0]-a,q[1]-b)>4.6)){placed.push([a,b]);break;}}}   /* 숲을 더 빽빽이 (숨는 덤불) */
    hideMark(G,0,0,0,23*.8);
    placed.forEach(([a,b],i)=>coral(B,V(a,0,b),rnd(.8,1.35),i%3?GLOWS.cyan:GLOWS.mag));
    for(let k=0;k<26;k++){const[a,b]=I.pt(0,.9),c=pick([GLOWS.cyan,GLOWS.mag,GLOWS.vio]);for(let n=0;n<3;n++)add(B,new THREE.IcosahedronGeometry(rnd(.2,.55),0),V(a+rnd(-.8,.8),.2,b+rnd(-.8,.8)),null,null,c,{to:'glow',vary:.1});}
    for(let k=0;k<6;k++){const[a,b]=I.pt(.3,.88),h=rnd(2,5);add(B,new THREE.ConeGeometry(.7,h,5),V(a,h/2,b),E(rnd(-.3,.3),0,rnd(-.3,.3)),null,'#3a5c9a',{to:'gloss'});}
    flush(B,G);spores(G,110,23,0,24,GLOWS.mag,.7,1.2);}});

// 3) 촉수 나무 숲
PIECES.push({name:'촉수 나무 숲',tags:['정글','움직이는 장애물'],fy:7,size:26,
  desc:'줄기가 촉수처럼 마디마디 흔들리는 나무들. 꼭대기의 발광 꼬투리가 숨 쉬듯 부풀고, 바닥의 눈알 줄기들이 카메라를 따라 쳐다봄. 계속 움직여서 피하기 까다로운 숲.',
  build(G){const B=newB(),eyes=[],I=isle(B,0,0,0,{r:21,depth:28,vein:GLOWS.lime,top:'#251f3c'});
    const mat=new THREE.MeshPhongMaterial({color:'#4a2f6e',flatShading:true,shininess:40,specular:'#9a7aff'}),spot=new THREE.MeshBasicMaterial({color:GLOWS.lime});
    const placed=[];for(let k=0;k<10;k++){for(let t=0;t<24;t++){const[a,b]=I.pt(0,.72);if(placed.every(q=>Math.hypot(q[0]-a,q[1]-b)>5)){placed.push([a,b]);break;}}}   /* 숲을 더 빽빽이 (숨는 덤불) */
    hideMark(G,0,0,0,21*.76);
    placed.forEach(([a,b])=>tentacleTree(G,V(a,0,b),rnd(.8,1.25),pick([GLOWS.lime,GLOWS.teal,GLOWS.mag]),mat,spot));
    for(let k=0;k<7;k++){const[a,b]=I.pt(.2,.88);eyeStalk(G,B,V(a,0,b),rnd(.7,1.1),eyes);}
    for(let k=0;k<30;k++){const[a,b]=I.pt(0,.93);const h=rnd(.6,1.6);add(B,new THREE.ConeGeometry(.12,h,4),V(a,h/2,b),E(rnd(-.4,.4),0,rnd(-.4,.4)),null,GLOWS.lime,{to:'glow',grad:'#102010',pow:1.5});}
    flush(B,G);spores(G,90,21,0,20,GLOWS.lime,.7,1.3);
    anim.push(t=>{eyes.forEach(o=>{o.e.lookAt(CAM.position);o.e.rotateY(Math.sin(t*.8+o.ph)*.35);o.e.scale.y=((t+o.blink)%5)<.12?.1:1;});});}});

// 4) 포자 거품 늪
PIECES.push({name:'포자 거품 늪',tags:['습지','시야 방해'],fy:3,size:28,
  desc:'바위 테두리 안에 보랏빛 우주 액체가 고인 늪. 반투명 거품 주머니가 숨 쉬듯 부풀고, 바닥에서 포자 방울이 끊임없이 올라옴. 액체 끝은 테두리 바위 밑으로 숨김.',
  build(G){const B=newB(),I=isle(B,0,-.6,0,{r:24,depth:30,vein:GLOWS.teal,min:.92,amp:.1,bites:0,ex:rnd(.9,1.1)});
    const rimR=a=>16+1.6*Math.sin(a*3+.7)+.8*Math.sin(a*7);
    ISL.hole=a=>rimR(-a)+2.2;ISL.pool=.35;ISL.poolR=a=>rimR(-a)-1;   /* 꾸미기: 늪 물 위엔 땅을 덮지 않고 물풀만 */
    for(let k=0;k<44;k++){const a=k/44*6.28,rr=rimR(-a)+rnd(-.4,1.2),s=rnd(1.4,2.8);add(B,jitter(new THREE.IcosahedronGeometry(s,0),s*.3,s*.25,rint()),V(Math.cos(a)*rr,s*.15,Math.sin(a)*rr),E(R()*3,R()*3,0),V(1.3,.7,1.3),pick(STONE),{vary:.12});}
    const pool=new THREE.Mesh(outlineGeo(a=>rimR(a)-.3),liquidMat({ramp:'void'}));pool.position.y=.35;G.add(pool);
    for(let k=0;k<26;k++){const a=R()*6.28,rr=Math.min(rnd(17.5,21),I.fn(a)*.95),h=rnd(2.5,6);const x=Math.cos(a)*rr,z=Math.sin(a)*rr;
      add(B,new THREE.CylinderGeometry(.06,.14,h,4),V(x,h/2-.6,z),E(rnd(-.2,.2),0,rnd(-.2,.2)),null,'#2a4a46',{grad:'#14201e'});
      add(B,new THREE.IcosahedronGeometry(rnd(.25,.45),0),V(x,h-.5,z),null,V(1,1.8,1),pick([GLOWS.lime,GLOWS.teal]),{to:'glow',vary:0});}
    flush(B,G);
    const bub=[];for(let k=0;k<11;k++){const[a,b]=topPoint(13,0,.9),r=rnd(1.2,4.2),m=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),fresnelMat(pick([GLOWS.cyan,GLOWS.vio,GLOWS.mag]),2,.9));
      m.position.set(a,.35+r*.55,b);G.add(m);const sp=glowSprite(GLOWS.teal,r*1.4,.25);sp.position.copy(m.position);G.add(sp);bub.push({m,ph:R()*6});}
    anim.push(t=>{bub.forEach(o=>{const k=1+Math.sin(t*1.3+o.ph)*.07;o.m.scale.set(k,k*(1+Math.sin(t*1.3+o.ph+1)*.05),k);});});
    spores(G,160,14,.3,9,GLOWS.teal,.8,1.6);spores(G,60,22,0,26,GLOWS.vio,.6,.8);}});

// 5) 포식 꽃
PIECES.push({name:'거대 포식 꽃',tags:['위험 지형','주기 공격'],fy:8,size:24,
  desc:'이빨 달린 꽃잎이 활짝 벌어졌다가 몇 초마다 콱 닫히는 육식 식물. 가운데 빛나는 미끼 주위로 빛 입자가 맴돌아 유인함. 닫히는 순간 근처에 있으면 잡히는 함정.',
  build(G){const B=newB();isle(B,0,0,0,{r:15,depth:26,vein:GLOWS.mag,min:.8,top:'#232038'});
    for(let s=0;s<3;s++){const pts=[];for(let k=0;k<=8;k++){const t=k/8,a=s*2.09+t*4;pts.push(V(Math.cos(a)*1.4*(1-t*.3),t*10,Math.sin(a)*1.4*(1-t*.3)));}add(B,tube(pts,.75,24),V(0,0,0),null,null,'#2d4a3e',{grad:'#16241e'});}
    for(let k=0;k<6;k++){const a=k/6*6.28,pts=[V(Math.cos(a)*2,1,Math.sin(a)*2),V(Math.cos(a)*6,0,Math.sin(a)*6),V(Math.cos(a+.4)*10.5,.3,Math.sin(a+.4)*10.5)];add(B,tube(pts,.45,14),V(0,0,0),null,null,'#2d4a3e');}
    add(B,new THREE.SphereGeometry(2.6,10,8),V(0,10,0),null,V(1,.6,1),'#3a1c48');
    flush(B,G);
    const head=new THREE.Group();head.position.y=10.6;G.add(head);
    const pmat=new THREE.MeshPhongMaterial({color:'#4a1c52',flatShading:true,shininess:30}),inMat=new THREE.MeshBasicMaterial({color:GLOWS.mag}),tooth=new THREE.MeshPhongMaterial({color:'#efe6ff',flatShading:true,shininess:80});
    const pivots=[];for(let k=0;k<6;k++){const yaw=new THREE.Group();yaw.rotation.y=k/6*6.28;head.add(yaw);const piv=new THREE.Group();piv.position.z=1.8;yaw.add(piv);pivots.push(piv);
      const pet=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),pmat);pet.scale.set(2.2,.35,4.8);pet.position.z=4.4;piv.add(pet);
      const vein=new THREE.Mesh(new THREE.BoxGeometry(.35,.08,7.5),inMat);vein.position.set(0,.33,4.2);piv.add(vein);
      for(let j=0;j<6;j++){for(const sx of[-1,1]){const tz=1.6+j*1.25,w=2.15*Math.sqrt(Math.max(0,1-Math.pow((tz-4.4)/4.8,2)));const th=new THREE.Mesh(new THREE.ConeGeometry(.22,1,4),tooth);th.position.set(sx*w*.92,.45,tz);th.rotation.z=-sx*.25;piv.add(th);}}}
    pivots.forEach(piv=>{const by=new Map();piv.updateMatrix();for(const c of[...piv.children]){c.updateMatrix();const g=c.geometry.clone().applyMatrix4(c.matrix);if(!by.has(c.material))by.set(c.material,[]);by.get(c.material).push(g);piv.remove(c);}
      for(const[m,gs]of by)piv.add(new THREE.Mesh(mergeGeometries(gs,false),m));});   /* 꽃잎 하나(잎·잎맥·이빨 12개)를 칠마다 한 덩이로 → 그리기 84번 → 18번 (모든 꽃이 움직여도 가볍게) */
    const lure=new THREE.Mesh(new THREE.SphereGeometry(1.1,14,10),new THREE.MeshBasicMaterial({color:'#ffd6ff'}));lure.position.y=1.4;head.add(lure);const lg=glowSprite(GLOWS.mag,10,.8);lure.add(lg);
    const N=80,mg=new THREE.BufferGeometry(),mp=new Float32Array(N*3),mo=[];for(let i=0;i<N;i++)mo.push([R()*6.28,rnd(2,7),rnd(-1,5),rnd(.3,1)]);mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
    const motes=new THREE.Points(mg,new THREE.PointsMaterial({size:.9,map:dot,color:'#ff9cf4',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));motes.frustumCulled=false;head.add(motes);
    G.userData.flower=1;   /* 기믹: 가까이 오면 삼키고 · 씹고 · 뱉음 (gimmick.js가 bite·near를 줌) */
    /* 늘어나는 목: 덮칠 때만 보임 — 줄기 꼭대기에서 머리까지 휘어진 관 (마디 10개를 매 순간 다시 휨) */
    const NS=10,NR=8,neckG=new THREE.CylinderGeometry(.62,.8,1,NR,NS,true),neckP=neckG.attributes.position,nA=[],nJ=[];
    for(let i=0;i<neckP.count;i++){nA.push(Math.atan2(neckP.getZ(i),neckP.getX(i)));nJ.push(Math.round((neckP.getY(i)+.5)*NS));}
    const neckR=[];for(let i=0;i<neckP.count;i++)neckR.push(Math.hypot(neckP.getX(i),neckP.getZ(i)));
    const neck=new THREE.Mesh(neckG,new THREE.MeshPhongMaterial({color:'#2d4a3e',flatShading:true,shininess:20,specular:'#4a7a5e'}));neck.visible=false;neck.frustumCulled=false;G.add(neck);
    const REST=V(0,10.6,0),P0=V(0,9.4,0),Q0=new THREE.Quaternion(),qT=new THREE.Quaternion(),UPV=V(0,1,0),bz=new THREE.Vector3(),tg=new THREE.Vector3(),nx=new THREE.Vector3(),ny=new THREE.Vector3(),c1=new THREE.Vector3();
    G.userData.headW=out=>{head.getWorldPosition(out);return out;};
    const bend=(ext,tp,t)=>{const tgt=V(tp[0],tp[1],tp[2]);head.position.lerpVectors(REST,tgt,ext);
      if(ext<.01){neck.visible=false;head.quaternion.identity();head.position.y+=Math.sin(t*1.3)*.08;return;}   /* 가만히 있을 땐 머리가 숨 쉬듯 살짝 오르내림 */
      neck.visible=true;const H=head.position;c1.set(0,9.4+Math.max(3,H.y-9.4)*.6+3*ext,0);   /* 목은 위로 솟았다가 기체 쪽으로 휘어 내려옴 (뱀이 고개를 드는 것처럼) */
      for(let i=0;i<neckP.count;i++){const u=nJ[i]/NS,a=1-u;bz.set(0,0,0).addScaledVector(P0,a*a).addScaledVector(c1,2*a*u).addScaledVector(H,u*u);
        tg.set(0,0,0).addScaledVector(c1.clone().sub(P0),2*a).addScaledVector(H.clone().sub(c1),2*u).normalize();
        nx.set(1,0,0);if(Math.abs(tg.x)>.9)nx.set(0,0,1);ny.crossVectors(tg,nx).normalize();nx.crossVectors(ny,tg).normalize();
        const r=neckR[i]*(1-.35*Math.sin(u*Math.PI)*ext)*(1+.06*Math.sin(t*20-u*9));   /* 늘어날수록 가늘어지고 · 꿀꺽 넘기듯 물결 */
        neckP.setXYZ(i,bz.x+(nx.x*Math.cos(nA[i])+ny.x*Math.sin(nA[i]))*r,bz.y+(nx.y*Math.cos(nA[i])+ny.y*Math.sin(nA[i]))*r,bz.z+(nx.z*Math.cos(nA[i])+ny.z*Math.sin(nA[i]))*r);}
      neckP.needsUpdate=true;neckG.computeVertexNormals();
      tg.copy(H).sub(c1).normalize();qT.setFromUnitVectors(UPV,tg);head.quaternion.copy(Q0).slerp(qT,Math.min(1,ext*1.4));};   /* 입이 기체 쪽을 향함 */
    anim.push(t=>{const P=7,ph=t%P;let ang;const bt=G.userData.bite,nr=G.userData.near||0;bend(bt&&bt.ext?bt.ext:0,bt&&bt.tp?bt.tp:[0,10.6,0],t);
      if(bt)ang=-.22-1.18*bt.k+(bt.chew?Math.sin(t*11)*.07:0);   /* 삼킨 동안: 꽉 닫고 우물우물 씹음 */
      else if(ph<4)ang=-.22-Math.sin(t*1.5)*.04+nr*(.2+Math.sin(t*17)*.05);   /* 기체가 다가오면 꽃잎이 더 벌어지며 떨림 (군침) */
      else if(ph<4.25)ang=-.22-(ph-4)/.25*1.18;else if(ph<5.5)ang=-1.4+Math.sin((ph-4.25)*30)*.02;else ang=-1.4+(ph-5.5)/1.5*1.18;
      pivots.forEach((p,i)=>{p.rotation.x=ang+Math.sin(t*2+i)*.03;});const open=bt?bt.k<.5:ph<4||ph>5.5;lg.material.opacity=open?.8+nr*.2:.25;
      for(let i=0;i<N;i++){const o=mo[i],a=o[0]+t*o[3]*(open?1:3),r=o[1]*(open?1:.4);mp[i*3]=Math.cos(a)*r;mp[i*3+1]=o[2]+Math.sin(t+i)*.5;mp[i*3+2]=Math.sin(a)*r;}mg.attributes.position.needsUpdate=true;});
    spores(G,40,14,0,12,GLOWS.mag,.6,1);}});

// 6) 공중 해파리 군락
PIECES.push({name:'공중 해파리 군락',tags:['움직이는 생물','장애물'],fy:6,size:28,
  desc:'작은 바위 둥지 주위를 반투명 해파리들이 천천히 떠다님. 갓이 수축하며 맥동하고 긴 촉수가 흔들림. 움직이는 장애물이라 매번 지나가는 길이 달라짐.',
  build(G){const B=newB();isle(B,0,0,0,{r:9,h:2.4,depth:16,layers:4,vein:GLOWS.cyan,amp:.28,min:.55});
    for(let k=0;k<5;k++){const h=rnd(2,5),a=R()*6.28,d=rnd(0,3);add(B,new THREE.OctahedronGeometry(1,0),V(Math.cos(a)*d,h*.35,Math.sin(a)*d),E(rnd(-.4,.4),R()*3,rnd(-.4,.4)),V(.7,h*.55,.7),GLOWS.cyan,{to:'glow',vary:.15});}
    for(let k=0;k<10;k++){const a=R()*6.28;let p=V(Math.cos(a)*rnd(2,5),-rnd(4,10),Math.sin(a)*rnd(2,5));const pts=[p.clone()];for(let s=0;s<4;s++){p=p.clone().add(V(rnd(-2,2),-rnd(2.5,4.5),rnd(-2,2)));pts.push(p);}
      addRaw(B,tube(pts,rnd(.2,.5),20),(f,y,c)=>{c.set('#1a2030').lerp(new THREE.Color(GLOWS.cyan),Math.pow(f,3));},'glow');}
    flush(B,G);
    const cols=[GLOWS.cyan,GLOWS.mag,GLOWS.vio,GLOWS.teal];
    for(let k=0;k<10;k++)jellyfish(G,V(0,rnd(-4,14),0),rnd(1.4,3.2),cols[k%4],rnd(12,24),rnd(.08,.2)*(k%2?1:-1));
    spores(G,90,26,-10,22,GLOWS.vio,.6,.6);}});

// 7) 덩굴 기둥 쌍섬
PIECES.push({name:'덩굴 기둥 쌍섬',tags:['수직 구조','연결 지형'],fy:34,size:40,
  desc:'위아래 두 섬이 아주 높이 솟은 꼬인 덩굴 기둥으로 묶여 있음. 기둥 중간중간 빛나는 고리와 가시 덩굴이 감겨 있음. 위 섬은 뒤집혀서 버섯과 결정이 아래로 자라 중력이 뒤집힌 듯하고, 기둥을 따라 빛 입자가 위로 빨려 올라감.',
  build(G){const B=newB(),y1=68,I=isle(B,0,0,0,{r:18,depth:24,vein:GLOWS.teal,min:.76}),U=isle(B,0,y1-1.5,0,{r:14,h:3,depth:10,layers:3,flip:true,min:.88,vein:GLOWS.lime});
    for(let k=0;k<7;k++){const[a,b]=U.pt(.1,.82);pagoda(B,V(a,y1-1.5,b),rnd(.6,1),pick([GLOWS.cyan,GLOWS.lime]),true);}
    for(let k=0;k<6;k++){const dir=V(R()-.5,1.4,R()-.5).normalize(),h=rnd(2,4.5);add(B,new THREE.OctahedronGeometry(1,0),V(0,U.end,0).addScaledVector(dir,h*.4),eulerTo(dir),V(.6,h*.55,.6),GLOWS.lime,{to:'glow',vary:.15});}
    const cols=[];for(let c=0;c<4;c++){const a=c/4*6.28+.4,bx=Math.cos(a)*9,bz=Math.sin(a)*9;cols.push([bx,bz]);
      for(let s=0;s<3;s++){const pts=[];for(let k=0;k<=30;k++){const t=k/30,an=s*2.09+t*6.28*3.2,bulge=1.6+Math.sin(t*Math.PI)*.9+Math.sin(t*Math.PI*5)*.25;pts.push(V(bx+Math.cos(an)*bulge,t*(y1-1.5),bz+Math.sin(an)*bulge));}
        if(s<2)add(B,tube(pts,.6,110),V(0,0,0),null,null,'#244a40',{grad:'#14281f',vary:.06});else addRaw(B,tube(pts,.2,110),(f,y,c2)=>{c2.set(GLOWS.lime);},'glow');}
      for(let r=1;r<=5;r++){const ry=r/6*(y1-1.5)+rnd(-2,2);add(B,new THREE.TorusGeometry(2.7,.22,4,14),V(bx,ry,bz),E(Math.PI/2+rnd(-.15,.15),0,rnd(-.15,.15)),null,GLOWS.lime,{to:'glow',vary:0});
        for(let n=0;n<3;n++){const na=R()*6.28;add(B,new THREE.ConeGeometry(.3,rnd(1.2,2.4),4),V(bx+Math.cos(na)*2.2,ry+rnd(-1,1),bz+Math.sin(na)*2.2),E(Math.sin(na)*1.2,0,-Math.cos(na)*1.2),null,'#2f5a48');}}}
    for(let k=0;k<20;k++){const[a,b]=I.pt(.2,.92);add(B,new THREE.IcosahedronGeometry(rnd(.15,.35),0),V(a,.1,b),null,null,GLOWS.lime,{to:'glow',vary:0});}
    flush(B,G);
    const N=480,g=new THREE.BufferGeometry(),pos=new Float32Array(N*3),meta=[];for(let i=0;i<N;i++)meta.push([i%4,R(),R()*6.28,rnd(.6,1.4)]);g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.9,map:dot,color:GLOWS.lime,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;G.add(pts);
    anim.push((t,dt)=>{for(let i=0;i<N;i++){const m=meta[i];m[1]=(m[1]+dt*.06*m[3])%1;const[bx,bz]=cols[m[0]],an=m[2]+m[1]*20;pos[i*3]=bx+Math.cos(an)*2.6;pos[i*3+1]=m[1]*(y1-1.5);pos[i*3+2]=bz+Math.sin(an)*2.6;}g.attributes.position.needsUpdate=true;});
    spores(G,140,18,0,y1,GLOWS.teal,.6,1.4);}});

// 8) 포식자의 사냥터 (몬스터 서식지)
PIECES.push({name:'포식자의 사냥터',tags:['몬스터 서식지','대형 평지'],fy:4,size:40,
  desc:'몬스터가 사는 넓은 땅. 가운데는 싸울 수 있게 평평하게 비워두고, 바닥 곳곳에 거대한 발톱 자국과 빛나는 발자국이 굴까지 이어짐. 굴 안에서 눈이 깜빡이고, 먹잇감의 거대한 뼈와 고치가 매달린 아치가 둘레를 감쌈.',
  build(G){const B=newB(),I=isle(B,0,0,0,{r:38,h:3,depth:38,vein:GLOWS.mag,min:.8,amp:.2,bites:2,top:'#241f34'});G.userData.outline=I.fn;   /* 꾸미기(jdress)가 섬 바깥선을 씀 */
    // den on one side
    const denA=R()*6.28,[dx,dz]=I.edge(denA,.6),den=V(dx,0,dz),toC=V(-dx,0,-dz).normalize();
    jitter(new THREE.SphereGeometry(9,14,8,0,Math.PI*2,0,Math.PI/2),1.1,.6,rint()).dispose();   /* 굴 돔은 뺌 (사용자 2026-11-07: 안에 몬스터가 없으니 없는 게 나음) — 운 순서는 그대로 두어 나머지 모양은 같게 */
    const block=[];G.userData.block=block;   /* 화석 놓을 때 피할 막히는 것들 [x,z,반지름] (키트 단위) */
    for(let k=0;k<7;k++){const a=R()*6.28,d=rnd(9,13),cr=rnd(.8,1.4),ch=rnd(3,7),p=den.clone().add(V(Math.cos(a)*d,1.5,Math.sin(a)*d));add(B,new THREE.ConeGeometry(cr,ch,5),p,E(rnd(-.4,.4),0,rnd(-.4,.4)),null,'#d6cfe8',{grad:'#4a4268'});block.push([p.x,p.z,cr+ch*.4]);}
    flush(B,G);
    const mouth=new THREE.Mesh(new THREE.CircleGeometry(4.2,20),new THREE.MeshBasicMaterial({color:'#020104'}));mouth.scale.y=.75;mouth.position.copy(den).addScaledVector(toC,10.4).add(V(0,2.8,0));G.add(mouth);mouth.lookAt(G.position.clone().add(V(0,2.8,0))); G.remove(mouth);   /* 돔 입구(검은 굴)도 뺌 · 자리는 발자국 시작점으로만 씀 */
    const eyePairs=[];for(let k=0;k<3;k++){const pr=new THREE.Group();pr.position.copy(mouth.position).addScaledVector(toC,.1).addScaledVector(V(-toC.z,0,toC.x),rnd(-2.2,2.2)).add(V(0,rnd(-.8,1),0));pr.quaternion.copy(mouth.quaternion);
      [-.45,.45].forEach(o=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:k?'#ff3a6a':'#ffe23a'}));e.position.x=o;pr.add(e);});eyePairs.push({pr,ph:R()*7});}
    anim.push(t=>{eyePairs.forEach(o=>{const c=(t+o.ph)%7;o.pr.visible=!(c<.15||(c>3&&c<3.12));});});
    /* 발자국 · 할퀸 자국 세 줄 · 엉성한 뼈대 · 고치 매단 반원 아치는 뺌 (사용자 2026-11-08: 조잡하고 뜻이 없음) — 화석은 jdress.js에서 제대로 다시 만듦 */
    // cover rocks and broken coral stumps around the rim
    for(let k=0;k<8;k++){const a=R()*6.28,[x,z]=I.edge(a,rnd(.68,.82)),s=rnd(1.8,3.2),B3=newB();add(B3,jitter(new THREE.IcosahedronGeometry(s,0),s*.3,s*.3,rint()),V(x,s*.4,z),null,V(1,.8,1),pick(STONE));flush(B3,G);block.push([x,z,s*1.3]);}
    spores(G,140,36,0,4,'#ff4ab0',.7,.5);spores(G,60,36,0,20,GLOWS.vio,.6,.8);}});

// 9) 외계 알 둥지 (보물 아레나)
PIECES.push({name:'외계 알 둥지',tags:['보물','수호 몬스터 아레나'],fy:4,size:40,
  desc:'넓고 평평한 아레나 한가운데, 거대한 갈비뼈 같은 뼈대가 둥지를 이루고 그 안에 빛나는 보물 알이 맥동함. 바닥엔 발광 혈관 무늬, 가장자리엔 휘어진 뿔 기둥과 엄폐용 바위. 수호 몬스터가 돌아다닐 공간을 넉넉히 비워둠.',
  build(G){const B=newB(),I=isle(B,0,0,0,{r:38,h:3,depth:36,vein:GLOWS.vio,min:.82,amp:.17,bites:1});
    for(let k=0;k<12;k++){let a=k/12*6.28,p=V(Math.cos(a)*6,.06,Math.sin(a)*6);for(let s=0;s<14;s++){a+=rnd(-.35,.35);const L=rnd(1.8,2.6),q=p.clone().add(V(Math.cos(a)*L,0,Math.sin(a)*L));
      if(Math.hypot(q.x,q.z)>I.fn(Math.atan2(q.z,q.x))*.86)break;
      add(B,new THREE.BoxGeometry(.28*(1-s/17),.08,L),p.clone().lerp(q,.5),E(0,-a+1.57,0),null,GLOWS.vio,{to:'glow',vary:.15});
      if(R()<.25){const b=a+rnd(.6,1)*(R()<.5?1:-1);add(B,new THREE.BoxGeometry(.14,.06,2),p.clone().add(V(Math.cos(b),0,Math.sin(b))),E(0,-b+1.57,0),null,GLOWS.vio,{to:'glow'});}p=q;}}
    for(let k=0;k<9;k++){const a=k/9*6.28,pts=[V(Math.cos(a)*10,-.5,Math.sin(a)*10),V(Math.cos(a)*11,5,Math.sin(a)*11),V(Math.cos(a)*7.5,10.5,Math.sin(a)*7.5),V(Math.cos(a+.25)*3.2,13,Math.sin(a+.25)*3.2)];
      addRaw(B,tube(pts,.75,26),(f,y,c)=>{c.set('#cfc8e8').lerp(new THREE.Color('#6a5a9a'),1-f);});add(B,new THREE.ConeGeometry(.75,1.6,6),pts[3].clone().add(V(0,.4,0)),eulerTo(pts[3].clone().sub(pts[2])),null,GLOWS.vio,{to:'glow'});}
    add(B,jitter(new THREE.CylinderGeometry(3,4,1.6,9,1),.3,.1,rint()),V(0,.8,0),null,null,'#2a2a48');
    for(let k=0;k<6;k++){const a=k/6*6.28,h=rnd(1.5,3);add(B,new THREE.OctahedronGeometry(1,0),V(Math.cos(a)*3.2,1.6+h*.3,Math.sin(a)*3.2),E(rnd(-.3,.3),0,rnd(-.4,.4)),V(.5,h*.5,.5),GLOWS.cyan,{to:'glow'});}
    for(let k=0;k<8;k++){const a=k/8*6.28+.39,[bx,bz]=I.edge(a,.8),b=V(bx,0,bz),out=V(Math.cos(a),0,Math.sin(a)),pts=[b,b.clone().add(V(0,5,0)),b.clone().add(V(0,10,0)).addScaledVector(out,-2),b.clone().add(V(0,14,0)).addScaledVector(out,-5)];
      add(B,tube(pts,1.1,20),V(0,0,0),null,null,'#2e2a4a',{grad:'#181628'});add(B,new THREE.ConeGeometry(1.1,3,6),pts[3].clone().addScaledVector(out,-1.2).add(V(0,.4,0)),eulerTo(pts[3].clone().sub(pts[2])),null,'#d8d0f0');}
    for(let k=0;k<7;k++){const a=k/7*6.28+rnd(-.2,.2),[x,z]=I.edge(a,rnd(.55,.68)),s=rnd(1.8,2.8);add(B,jitter(new THREE.IcosahedronGeometry(s,0),s*.3,s*.3,rint()),V(x,s*.4,z),null,V(1,.8,1),pick(STONE));}
    flush(B,G);
    const egg=new THREE.Group();egg.position.y=4.8;G.add(egg);
    const shell=new THREE.Mesh(new THREE.SphereGeometry(2.4,24,18),fresnelMat(GLOWS.cyan,1.6,1));shell.scale.y=1.35;egg.add(shell);
    const yolk=new THREE.Mesh(new THREE.SphereGeometry(1.2,16,12),new THREE.MeshBasicMaterial({color:'#e6ffff'}));egg.add(yolk);const yg=glowSprite(GLOWS.cyan,14,.8);egg.add(yg);
    const motes=[];for(let k=0;k<7;k++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.45,0),new THREE.MeshBasicMaterial({color:GLOWS.vio}));G.add(m);motes.push(m);}
    anim.push(t=>{const b=1+Math.sin(t*2.4)*.06;shell.scale.set(b,1.35*b,b);yolk.scale.setScalar(1+Math.sin(t*2.4+.5)*.15);yg.material.opacity=.6+Math.sin(t*2.4)*.2;egg.rotation.y=t*.3;
      motes.forEach((m,i)=>{const a=t*.5+i/7*6.28;m.position.set(Math.cos(a)*6,8+Math.sin(t+i)*1.2,Math.sin(a)*6);m.rotation.y=t*2;});});
    spores(G,120,36,0,16,GLOWS.vio,.7,1);}});

// 10) 작은 부유체 모음
PIECES.push({name:'작은 부유체 모음',tags:['소형 지형','빈틈 채우기'],fy:2,size:30,
  desc:'큰 섬 사이를 채우는 작은 땅 7종. 포자 퍼프볼 바위, 산호 한 그루 바위, 해파리 붙은 뿌리 바위, 수정 덩어리, 덩굴 감긴 돌, 눈알 바위, 거품 알 무더기. 모양이 전부 제각각.',
  build(G){const B=newB(),eyes=[];
    const rock=(x,y,z,r,d)=>isle(B,x,y,z,{r,h:1.2,depth:d,layers:3,amp:rnd(.2,.32),min:.5,vein:GLOWS.cyan});
    {const I=rock(-22,4,-6,4.5,9);for(let k=0;k<3;k++){const[a,b]=I.pt(0,.7),r=rnd(1,1.8);add(B,new THREE.SphereGeometry(r,10,8),V(a,4+r*.8,b),null,null,'#3a3060');
      for(let n=0;n<8;n++){const u=R()*6.28,v=rnd(.2,1.3);add(B,new THREE.IcosahedronGeometry(.15,0),V(a+Math.cos(u)*Math.cos(v)*r,4+r*.8+Math.sin(v)*r,b+Math.sin(u)*Math.cos(v)*r),null,null,GLOWS.lime,{to:'glow',vary:0});}}}
    rock(-6,-7,-17,5,10);coral(B,V(-6,-7,-17),.9,GLOWS.mag);
    rock(13,9,-13,4,7);for(let k=0;k<6;k++){let p=V(13+rnd(-2,2),9-rnd(4,6),-13+rnd(-2,2));const pts=[p.clone()];for(let s=0;s<3;s++){p=p.clone().add(V(rnd(-1.5,1.5),-rnd(2,3.5),rnd(-1.5,1.5)));pts.push(p);}
      addRaw(B,tube(pts,rnd(.18,.35),14),(f,y,c)=>{c.set('#1a2030').lerp(new THREE.Color(GLOWS.cyan),Math.pow(f,3));},'glow');}
    jellyfish(G,V(13,15,-13),1.4,GLOWS.cyan,3,.4);
    add(B,jitter(new THREE.IcosahedronGeometry(2.6,0),.6,.6,rint()),V(23,-2,5),null,null,'#1d2232');
    for(let k=0;k<9;k++){const dir=V(R()-.5,R()-.3,R()-.5).normalize(),h=rnd(2,5);add(B,new THREE.OctahedronGeometry(1,0),V(23,-2,5).addScaledVector(dir,2.2+h*.3),eulerTo(dir),V(.55,h*.55,.55),GLOWS.vio,{to:'glow',vary:.15});}
    add(B,jitter(new THREE.IcosahedronGeometry(3.6,1),.8,.8,rint()),V(5,-11,15),E(R()*3,R()*3,0),V(1,.8,1),'#262a3e');
    for(let s=0;s<3;s++){const pts=[];for(let k=0;k<=14;k++){const t=k/14,a=s*2.09+t*9,y=-14+t*6;pts.push(V(5+Math.cos(a)*3.4*Math.sin(t*Math.PI*.9+.2),y,15+Math.sin(a)*3.4*Math.sin(t*Math.PI*.9+.2)));}
      const col=s?GLOWS.teal:GLOWS.lime;addRaw(B,tube(pts,.2,40),(f,y,c)=>{c.set(col);},'glow');}
    rock(-16,-2,14,4,8);eyeStalk(G,B,V(-16.5,-2,13.5),.9,eyes);eyeStalk(G,B,V(-15,-2,15),.7,eyes);
    const pod=rock(-2,15,3,4,8);flush(B,G);
    for(let k=0;k<6;k++){const[a,b]=pod.pt(0,.6),r=rnd(.8,1.5),m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),fresnelMat(pick([GLOWS.mag,GLOWS.cyan]),2,1));m.position.set(a,15+r*.7,b);m.scale.y=1.25;G.add(m);
      const core=new THREE.Mesh(new THREE.SphereGeometry(r*.3,8,6),new THREE.MeshBasicMaterial({color:'#ffd6ff'}));core.position.copy(m.position);G.add(core);}
    anim.push(t=>{eyes.forEach(o=>{o.e.lookAt(CAM.position);o.e.rotateY(Math.sin(t*.8+o.ph)*.35);o.e.scale.y=((t+o.blink)%5)<.12?.1:1;});});
    spores(G,100,30,-16,24,GLOWS.cyan,.6,1);}});
/* ===================== 이 게임에 맞추기 ===================== */
/* 키트 조명을 꼭짓점에서 계산하는 칠 방식 (키트의 반짝임·안개는 뺌) */
const KL = { uKey: { value: new THREE.Vector3(.5, 1, .4).normalize() }, uKeyC: { value: new THREE.Color('#dfe6ff').multiplyScalar(.85) },
  uRim: { value: new THREE.Vector3(-.8, .2, -.6).normalize() }, uRimC: { value: new THREE.Color('#ff4ce0').multiplyScalar(.45) },
  uSky: { value: new THREE.Color('#7a8cff').multiplyScalar(.8) }, uGnd: { value: new THREE.Color('#3a0a4a').multiplyScalar(.8) }, uAmb: { value: new THREE.Color('#1c2040').multiplyScalar(.6) },
  uLift: { value: 1 } };
const litCache = new Map();
function litMat(src) { const vc = !!src.vertexColors, key = vc ? 'vc' : 'c' + src.color.getHex() + (src.side === THREE.DoubleSide ? 'd' : '');
  if (litCache.has(key)) return litCache.get(key);
  const m = new THREE.ShaderMaterial({ vertexColors: vc, side: src.side, uniforms: { ...KL, uC: { value: src.color ? src.color.clone() : new THREE.Color(1, 1, 1) }, uE: { value: src.emissive ? src.emissive.clone() : new THREE.Color(0) } },
    vertexShader: `uniform vec3 uKey, uKeyC, uRim, uRimC, uSky, uGnd, uAmb, uC, uE; uniform float uLift; varying vec3 vC;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vec3 n = normalize(mat3(modelMatrix) * normal);
        ${vc ? 'vec3 c = color;' : 'vec3 c = uC;'}
        vC = c * (uKeyC * max(dot(n, uKey), 0.) + uRimC * max(dot(n, uRim), 0.) + mix(uGnd, uSky, n.y * .5 + .5) + uAmb) * uLift + uE;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: 'varying vec3 vC; void main(){ gl_FragColor = linearToOutputTexel(vec4(vC, 1.)); }' });
  litCache.set(key, m); return m; }

/* 폰 메모리 줄이기: 색은 0~255, 법선은 -127~127 정수로 (보기엔 같음 · 꼭짓점 하나 36바이트 → 20바이트) */
const packed = new WeakSet();
function pack(G) { G.traverse(o => { const g = o.geometry; if (!o.isMesh || !g || packed.has(g)) return; packed.add(g);
  const C = g.attributes.color, N = g.attributes.normal;
  if (C && C.array instanceof Float32Array) { const a = new Uint8Array(C.count * C.itemSize); for (let i = 0; i < a.length; i++) a[i] = Math.max(0, Math.min(255, Math.round(C.array[i] * 255))); g.setAttribute('color', new THREE.BufferAttribute(a, C.itemSize, true)); }
  if (N && N.array instanceof Float32Array && N.itemSize === 3) { const a = new Int8Array(N.count * 4); for (let i = 0; i < N.count; i++) { a[i * 4] = Math.round(N.array[i * 3] * 127); a[i * 4 + 1] = Math.round(N.array[i * 3 + 1] * 127); a[i * 4 + 2] = Math.round(N.array[i * 3 + 2] * 127); }
    const ib = new THREE.InterleavedBuffer(a, 4); g.setAttribute('normal', new THREE.InterleavedBufferAttribute(ib, 3, 0, true)); } }); }

/* 조각 안 부품 합치기 (2026-11-08 최적화): 조각 하나가 부품 약 20개로 따로 그려져 정글만 한 장면 1000번 넘게 그렸음.
   움직이지 않는 부품을 칠마다 하나로 합침 → 모양·칠 그대로, 그리는 횟수만 줄어듦. 복사본(shared)은 원본 모양을 나눠 쓰므로 메모리도 그대로.
   움직이는 것(촉수·해파리·눈 등)은 원본 움직임을 두 번 돌려 보아 자리·방향·크기·보임이 바뀌는 것과 그 아래는 그대로 둠 */

const CANON = new Map(), uid = new WeakMap(); let uidN = 0; const idOf = o => { if (!uid.has(o)) uid.set(o, ++uidN); return uid.get(o); };
const valSig = v => v == null ? 'n' : typeof v === 'number' || typeof v === 'boolean' ? String(+v.toFixed ? +v.toFixed(5) : v) : v.isColor ? 'c' + v.getHexString() : (v.isVector2 || v.isVector3 || v.isVector4) ? 'v' + v.toArray().map(x => +x.toFixed(5)).join(',') : 'o' + idOf(v);
function canonMat(m) {   /* 같은 종류 · 같은 값의 칠이면 같은 칠로 */
  let k; if (m.isMeshBasicMaterial) k = ['B', m.color.getHexString(), m.transparent, +m.opacity.toFixed(4), m.blending, m.vertexColors, m.depthWrite, m.depthTest, m.side, m.map ? idOf(m.map) : 0, m.fog, m.toneMapped].join('|');
  else if (m.isShaderMaterial) { k = ['S', m.vertexShader, m.fragmentShader, m.transparent, m.blending, m.vertexColors, m.depthWrite, m.depthTest, m.side, JSON.stringify(m.defines || {})].join('|');
    for (const u of Object.keys(m.uniforms).sort()) k += '|' + u + '=' + valSig(m.uniforms[u].value) + '#' + (m.uniforms[u].value && typeof m.uniforms[u].value === 'object' && !m.uniforms[u].value.isColor && !m.uniforms[u].value.isVector3 && !m.uniforms[u].value.isVector2 && !m.uniforms[u].value.isVector4 ? '' : ''); }
  else return m;
  if (!CANON.has(k)) CANON.set(k, m); return CANON.get(k); }
function mergeStatic(G, anim) {
  const all = []; G.traverse(o => all.push(o)); const snap = () => all.map(o => o.position.toArray().concat(o.quaternion.toArray(), o.scale.toArray(), [o.visible ? 1 : 0]).join(','));
  const s0 = snap(); try { anim.forEach(f => f(1.3, .016)); } catch (e) {} const s1 = snap(); try { anim.forEach(f => f(2.9, .016)); } catch (e) {} const s2 = snap();
  const moving = new Set(); all.forEach((o, i) => { if (s0[i] !== s1[i] || s1[i] !== s2[i]) o.traverse(c => moving.add(c)); });
  if (!anim.length) G.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) o.material = canonMat(o.material); });   /* 안 움직이는 복사본: 값이 똑같은 칠은 하나로 (합칠 수 있게) */
  G.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), groups = new Map();
  G.traverse(o => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || moving.has(o) || o.morphTargetInfluences || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    const g = o.geometry, key = o.material.uuid + '|' + Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize + g.attributes[k].array.constructor.name + (g.attributes[k].normalized ? 'n' : '')).join(',') + (g.index ? 'i' : '') + '|' + o.renderOrder + (o.frustumCulled ? '' : 'f') + (o.layers.mask);
    let p = o.parent, hid = !o.visible; while (p && p !== G) { if (!p.visible) hid = true; p = p.parent; } if (hid) return;
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); });
  G.userData.moving = [...moving].filter(o => o.isMesh && !o.isInstancedMesh);
  for (const list of groups.values()) { if (list.length < 2) continue;
    const parts = list.map(o => { const g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (g.attributes[k].isInterleavedBufferAttribute) g.setAttribute(k, g.attributes[k].clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
    const mg = mergeGeometries(parts, false); parts.forEach(g => g.dispose()); if (!mg) continue;
    const me = new THREE.Mesh(mg, list[0].material); me.renderOrder = list[0].renderOrder; me.frustumCulled = list[0].frustumCulled; me.userData.merged = true; G.add(me);
    list.forEach(o => o.parent.remove(o)); }
  return G; }
const IDX = { root: 0, coral: 1, tentacle: 2, swamp: 3, flower: 4, jelly: 5, vine: 6, hunt: 7, egg: 8, floaters: 9 };
function buildPiece(kind, seed, lod = 1) { LOD_T = .5 * lod; LOD_N = Math.round(30 * Math.max(.6, lod)); R = mulberry32(seed); anim = []; ISL = null; const G = new THREE.Group(); PIECES[kind].build(G); G.userData.top = ISL;
  G.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhongMaterial) o.material = litMat(o.material); });
  const an = anim.slice(); mergeStatic(G, an); return { G, anim: an, size: PIECES[kind].size }; }
/* 문을 놓을 작은 정글 땅 */
function buildGateIsle(seed) { R = mulberry32(seed); anim = []; ISL = null; const G = new THREE.Group(), B = newB(), I = isle(B, 0, 0, 0, { r: 15, h: 2.5, depth: 13, layers: 3, amp: .1, min: .88, bites: 0, vein: GLOWS.cyan, top: '#241f34' });
  for (let k = 0; k < 18; k++) { const a = R() * 6.28, [ex, ez] = I.edge(a, .9); add(B, new THREE.IcosahedronGeometry(rnd(.25, .5), 0), V(ex, .15, ez), null, null, pick([GLOWS.cyan, GLOWS.vio]), { to: 'glow', vary: 0 }); }
  flush(B, G); G.userData.top = ISL; G.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhongMaterial) o.material = litMat(o.material); }); mergeStatic(G, []); return { G, anim: [], size: 16 }; }

/* 작은 부유체를 하나씩 (사용자 2026-11-07: 무리로만 두지 말고 높이·깊이감을 위해 따로따로) — 키트 "작은 부유체 모음"의 일곱 가지를 원점에 하나씩 세움 */
const SINGLES = [
  (G, B, eyes) => { const I = isle(B, 0, 0, 0, { r: 4.5, h: 1.2, depth: 9, layers: 3, amp: rnd(.2, .32), min: .5, vein: GLOWS.cyan });   /* 포자 퍼프볼 바위 */
    for (let k = 0; k < 3; k++) { const [a, b] = I.pt(0, .7), r = rnd(1, 1.8); add(B, new THREE.SphereGeometry(r, 10, 8), V(a, r * .8, b), null, null, '#3a3060');
      for (let n = 0; n < 8; n++) { const u = R() * 6.28, v = rnd(.2, 1.3); add(B, new THREE.IcosahedronGeometry(.15, 0), V(a + Math.cos(u) * Math.cos(v) * r, r * .8 + Math.sin(v) * r, b + Math.sin(u) * Math.cos(v) * r), null, null, GLOWS.lime, { to: 'glow', vary: 0 }); } } },
  (G, B) => { isle(B, 0, 0, 0, { r: 5, h: 1.2, depth: 10, layers: 3, amp: rnd(.2, .32), min: .5, vein: GLOWS.cyan }); coral(B, V(0, 0, 0), .9, pick([GLOWS.mag, GLOWS.cyan])); },   /* 산호 한 그루 바위 */
  (G, B) => { isle(B, 0, 0, 0, { r: 4, h: 1.2, depth: 7, layers: 3, amp: rnd(.2, .32), min: .5, vein: GLOWS.cyan });   /* 해파리 붙은 뿌리 바위 */
    for (let k = 0; k < 6; k++) { let p = V(rnd(-2, 2), -rnd(4, 6), rnd(-2, 2)); const pts = [p.clone()]; for (let q = 0; q < 3; q++) { p = p.clone().add(V(rnd(-1.5, 1.5), -rnd(2, 3.5), rnd(-1.5, 1.5))); pts.push(p); }
      addRaw(B, tube(pts, rnd(.18, .35), 14), (f, y, c) => { c.set('#1a2030').lerp(new THREE.Color(GLOWS.cyan), Math.pow(f, 3)); }, 'glow'); }
    jellyfish(G, V(0, 6, 0), 1.4, pick([GLOWS.cyan, GLOWS.mag]), 3, .4); },
  (G, B) => { add(B, jitter(new THREE.IcosahedronGeometry(2.6, 0), .6, .6, rint()), V(0, 0, 0), null, null, '#1d2232');   /* 수정 덩어리 */
    for (let k = 0; k < 9; k++) { const dir = V(R() - .5, R() - .3, R() - .5).normalize(), h = rnd(2, 5); add(B, new THREE.OctahedronGeometry(1, 0), V(0, 0, 0).addScaledVector(dir, 2.2 + h * .3), eulerTo(dir), V(.55, h * .55, .55), pick([GLOWS.vio, GLOWS.cyan]), { to: 'glow', vary: .15 }); } },
  (G, B) => { add(B, jitter(new THREE.IcosahedronGeometry(3.6, 1), .8, .8, rint()), V(0, 0, 0), E(R() * 3, R() * 3, 0), V(1, .8, 1), '#262a3e');   /* 덩굴 감긴 돌 */
    for (let q = 0; q < 3; q++) { const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14, a = q * 2.09 + t * 9, y = -3 + t * 6; pts.push(V(Math.cos(a) * 3.4 * Math.sin(t * Math.PI * .9 + .2), y, Math.sin(a) * 3.4 * Math.sin(t * Math.PI * .9 + .2))); }
      const col = q ? GLOWS.teal : GLOWS.lime; addRaw(B, tube(pts, .2, 40), (f, y, c) => { c.set(col); }, 'glow'); } },
  (G, B, eyes) => { isle(B, 0, 0, 0, { r: 4, h: 1.2, depth: 8, layers: 3, amp: rnd(.2, .32), min: .5, vein: GLOWS.cyan }); eyeStalk(G, B, V(-.5, 0, -.5), .9, eyes); if (R() < .6) eyeStalk(G, B, V(1, 0, 1), .7, eyes); },   /* 눈알 바위 */
  (G, B) => { const P = isle(B, 0, 0, 0, { r: 4, h: 1.2, depth: 8, layers: 3, amp: rnd(.2, .32), min: .5, vein: GLOWS.cyan }); return () => { for (let k = 0; k < 6; k++) { const [a, b] = P.pt(0, .6), r = rnd(.8, 1.5);   /* 거품 알 무더기 */
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), fresnelMat(pick([GLOWS.mag, GLOWS.cyan]), 2, 1)); m.position.set(a, r * .7, b); m.scale.y = 1.25; G.add(m);
      const core = new THREE.Mesh(new THREE.SphereGeometry(r * .3, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd6ff' })); core.position.copy(m.position); G.add(core); } }; } ];
function buildSingle(kind, seed) { LOD_T = .3; LOD_N = 18; R = mulberry32(seed); anim = []; ISL = null; const G = new THREE.Group(), B = newB(), eyes = [], after = SINGLES[kind](G, B, eyes); G.userData.top = ISL; flush(B, G); if (after) after();
  if (eyes.length) anim.push(t => { eyes.forEach(o => { o.e.lookAt(CAM.position); o.e.rotateY(Math.sin(t * .8 + o.ph) * .35); o.e.scale.y = ((t + o.blink) % 5) < .12 ? .1 : 1; }); });
  G.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhongMaterial) o.material = litMat(o.material); }); const an = anim.slice(); mergeStatic(G, an); return { G, anim: an, size: 7 }; }

/* 정글 배치 계획 (먼저 계산해 초원 쪽에 넘겨서, 경계를 넘나드는 작은 섬들이 서로 겹치지 않게) */
export function jungleLayout({ R0 = 136, R1 = 187, TOP = -3, UP = 20, DN = -30, sect = 10 } = {}) {
  const SA = Math.PI * 2 / sect, deg = Math.PI / 180, at = (th, r) => [Math.cos(th) * r, Math.sin(th) * r], L = [], Rn = mulberry32(5150);
  const FILL = [IDX.root, IDX.coral, IDX.tentacle, IDX.swamp, IDX.flower, IDX.jelly];
  const push = o => { L.push(o); return o; };
  for (let i = 0; i < sect; i++) { const th0 = i * SA, thg = (i + .5) * SA, up = i % 2 === 0, seed = 7000 + i * 101;
    /* 기지 사이 한 곳의 자리 (사이 한가운데 thg 기준 · 사용자 2026-11-07: 던전은 싸우려면 넓게 → 지름 약 50m):
       던전(위·아래 번갈아) thg+9°·160m 반지름 25m · 문 thg−1°·183m · 가운데층 사냥터 thg−9°·166m · 큰 정글 섬 기지 쪽 경계 · 덩굴 기둥 기지 쪽 경계 · 와드 자리 thg·136m는 비워 둠 */
    const DS = .78, DR = 38 * DS * .82;
    { const [x, z] = at(thg + 9 * deg, 160), Y = up ? UP : DN, [gx, gz] = at(thg - 1 * deg, 183), SR = 25.4, rad = up ? SR : DR, yaw = thg * 3.1;
      /* 위층 = 정글 보물 성소 (사용자 2026-11-08: 근원의 알 성소 디자인 · 크기는 맵에 맞춰) · 아래층 = 몬스터 사냥 던전 (화석) */
      if (up) push({ t: 'sanct', seed: seed + 1, x, y: Y, z, s: 1, yaw, layer: 'up', r: SR + 1, dungeon: true, clearA: Math.atan2(gz - z, gx - x) + SWEEP + yaw });   /* clearA: 빛의 길이 닿는 쪽(섬 안 각도) — 큰 것을 비켜 놓음 */
      else push({ t: 'hunt', seed: seed + 1, x, y: Y, z, s: DS, yaw, layer: 'dn', r: DR + 1, dungeon: true });
      push({ t: 'gate', seed: seed + 2, x: gx, y: TOP - 1.8, z: gz, s: .42, yaw: thg, layer: 'mid', r: 7, gate: { tx: x, tz: z, layer: up ? 'up' : 'dn', ty: Y, rad, gr: 6.3, dir: 1, sanct: up } });
      /* 빛의 길이 지나는 하늘은 비워 둠 (사용자 2026-11-07) — 어느 층이든 이 원들 안엔 아무것도 안 놓음 */
      { const { pts } = spiralPath({ gx, gz, tx: x, tz: z, rad, gr: 6.3, dir: 1 }); let d = 0, last = -9;   /* 감아 도는 빛의 길 하늘 비우기 */
        for (let k = 1; k < pts.length; k++) { d += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][2] - pts[k - 1][2]); if (d > 6.3 + 1.5 && d - last > 2.2) { push({ t: 'corr', x: pts[k][0], z: pts[k][2], r: 2.6, layer: 'all' }); last = d; } } } }
    { const [x, z] = at(thg - 9 * deg, 166); push({ t: 'hunt', seed: seed + 3, x, y: TOP, z, s: .4, yaw: thg * 1.7 + 1, layer: 'mid', r: 16 }); }
    { const [x, z] = at(th0 + 5 * deg, 138); push({ t: 'fill', kind: FILL[(i * 2) % 6], seed: seed + 4, x, y: TOP, z, s: .36, yaw: th0 * 2.3, layer: 'mid', r: 11 }); }   /* 큰 것 하나 */
    /* 탑·기둥 (사용자 2026-11-07: 가운데→위로만 잇지 말 것 · 아래층에서 솟거나 · 사이에 뜨거나 · 크기도 여러 가지) */
    { const mode = ['full', 'low', 'full', 'float', 'small'][i % 5], [x, z] = at(th0 + 3 * deg + (Rn() - .5) * 2 * deg, 181 + Rn() * 2), yaw = th0 * 2.9;   /* 기지 쪽 경계 · 넓어진 던전·사냥터를 피함 */
      const V0 = { full: [DN, (UP - DN) / 66.5, .38], low: [DN, (TOP - 7 - DN) / 66.5, .3], float: [4 + Rn() * 3, (8 + Rn() * 4) / 66.5, .15], small: [DN, (TOP + 5 - DN) / 66.5, .24] }[mode];
      push({ t: 'vine', mode, seed: seed + 7, x, y: V0[0], z, s: V0[2], sy: V0[1], yaw, layer: mode === 'float' ? 'upgap' : 'pillar', r: 18 * V0[2] }); }
    /* 경계 넘어 초원 쪽으로: 정글 조각이 초원 가장자리로 번져 나감 */
    for (let n = 0; n < 6; n++) { const band = n % 3, th = th0 + (Rn() - .5) * SA, r = R1 + 1 + Math.pow(Rn(), 1.6) * 22, [x, z] = at(th, r), s = .18 + Rn() * .18;
      const y = band === 0 ? -8 - Rn() * 14 : band === 1 ? 5 + Rn() * 10 : TOP + .2; push({ t: 'single', kind: Math.floor(Rn() * SINGLES.length), seed: seed + 40 + n, x, y, z, s, yaw: Rn() * 6.28, layer: band === 0 ? 'gap' : band === 1 ? 'upgap' : 'mid', r: 5.5 * s + 1, cross: true }); }
  }
  /* 채우기 (사용자 2026-11-07: 정글 밀도가 너무 없음 · 큰 것만 있음 → 중간 것도) — 후보를 여럿 뽑아 빈 곳부터 · 같은 높이대끼리만 안 겹치게 */
  const BAND = l => l === 'all' ? 'all' : l === 'mid' ? 0 : l === 'upgap' ? 1 : l === 'gap' ? -1 : l === 'up' ? 2 : l === 'dn' ? -2 : 9;
  const gap = (x, z, r, l) => { let m = 1e9; for (const q of L) { if (BAND(q.layer) !== BAND(l) && q.layer !== 'pillar' && q.layer !== 'all') continue; const d = Math.hypot(q.x - x, q.z - z) - q.r - r; if (d < m) m = d; } return m; };
  const add = (sector, o, rMin, rMax, rOf, tries = 24) => { const th0 = sector * SA; let best = null;
    for (let c = 0; c < tries; c++) { const th = th0 + (Rn() - .5) * SA, r = rMin + Rn() * (rMax - rMin), [x, z] = at(th, r), rr = rOf(); const g = gap(x, z, rr, o.layer); if (g < .8) continue; if (!best || g > best.g) best = { x, z, rr, g }; }
    if (!best) return; push({ ...o, x: best.x, z: best.z, r: best.rr }); };
  for (let i = 0; i < sect; i++) { const seed = 9000 + i * 131;
    /* 가운데층: 중간 크기 정글 섬 넷 + 작은 것 하나 (크기 섞기) */
    for (let n = 0; n < 4; n++) { const s = n < 3 ? .2 + Rn() * .07 : .14 + Rn() * .05, kind = FILL[(i + n * 2) % 6];
      add(i, { t: 'fill', kind, seed: seed + n, y: TOP, s, yaw: Rn() * 6.28, layer: 'mid' }, R0 + 4, R1 - 2, () => 27 * s * .62); }
    /* 더 촘촘히 (사용자 2026-11-07: 초원에 비해 정글이 너무 비어 보임) — 같은 모양을 나눠 쓰는 중간·작은 섬 */
    for (let n = 0; n < 7; n++) { const s = .16 + Rn() * .1, kind = FILL[(i * 5 + n) % 6];
      add(i, { t: 'fill', kind, seed: seed + 60 + n, y: TOP, s, yaw: Rn() * 6.28, layer: 'mid', share: true }, R0 + 2, R1 - 1, () => 27 * s * .58, 18); }
    for (let n = 0; n < 6; n++) { const s = .09 + Rn() * .05, kind = FILL[(i * 7 + n) % 6];
      add(i, { t: 'fill', kind, seed: seed + 80 + n, y: TOP + (n % 3 === 2 ? 4 + Rn() * 8 : n % 3 === 1 ? -6 - Rn() * 10 : 0), s, yaw: Rn() * 6.28, layer: n % 3 === 2 ? 'upgap' : n % 3 === 1 ? 'gap' : 'mid', share: true }, R0, R1, () => 27 * s * .58, 14); }
    /* 아래층 정글 섬: 내려다볼 때 꽉 차게 (흐린 거리라 움직임·알갱이는 뺌) */
    for (let n = 0; n < 5; n++) { const s = .16 + Rn() * .14, kind = FILL[(i * 3 + n) % 6];
      add(i, { t: 'fill', kind, seed: seed + 20 + n, y: DN - Rn() * 4, s, yaw: Rn() * 6.28, layer: 'dn', lite: true }, R0 - 2, R1 + 4, () => 27 * s * .62); }
    /* 낱개 작은 조각 20: 아래 사이 · 가운데 · 위 사이 */
    for (let n = 0; n < 30; n++) { const b = n % 4 === 3 ? 1 : n % 2, s = .16 + Rn() * .22, y = b === 0 ? -9 - Rn() * 17 : b === 1 && n % 4 === 3 ? 5 + Rn() * 10 : TOP + .2, layer = b === 0 ? 'gap' : n % 4 === 3 ? 'upgap' : 'mid';
      add(i, { t: 'single', kind: Math.floor(Rn() * SINGLES.length), seed: seed + 40 + n, y, s, yaw: Rn() * 6.28, layer }, R0 + 1, R1 - 1, () => 5.5 * s + .8, 12); }
  }
  /* 고정 자리 지형이 빛의 길과 겹치면 뺌 */
  const C = L.filter(q => q.t === 'corr'); for (const o of L) if ((o.t === 'fill' || o.t === 'vine') && C.some(c => Math.hypot(c.x - o.x, c.z - o.z) < c.r + o.r)) o.skip = true;
  return L.filter(o => !o.skip);
}

const fillHoles = (grid, N, x0, z0, x1, z1) => {   /* 속 빈 구조물(겉면만 칸에 찍힘)의 안쪽을 채움: 상자 테두리에서 닿지 않는 빈 칸 = 안쪽 */
  x0 = Math.max(0, x0); z0 = Math.max(0, z0); x1 = Math.min(N - 1, x1); z1 = Math.min(N - 1, z1); const W = x1 - x0 + 1, Hh = z1 - z0 + 1; if (W < 3 || Hh < 3) return;
  const seen = new Uint8Array(W * Hh), st = [], at = (x, z) => grid[(z + z0) * N + x + x0];
  const wall = (x, z) => at(x, z) || (x > 0 && at(x - 1, z)) || (x < W - 1 && at(x + 1, z)) || (z > 0 && at(x, z - 1)) || (z < Hh - 1 && at(x, z + 1));   /* 한 칸 틈은 막힌 걸로 보고 흘려 봄 → 겉면 사이 작은 틈으로 새지 않음 */
  const push = (x, z) => { const k = z * W + x; if (seen[k] || wall(x, z)) return; seen[k] = 1; st.push(k); };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, Hh - 1); } for (let z = 0; z < Hh; z++) { push(0, z); push(W - 1, z); }
  while (st.length) { const k = st.pop(), x = k % W, z = (k - x) / W; if (x > 0) push(x - 1, z); if (x < W - 1) push(x + 1, z); if (z > 0) push(x, z - 1); if (z < Hh - 1) push(x, z + 1); }
  const S = (x, z) => x >= 0 && z >= 0 && x < W && z < Hh && seen[z * W + x];
  const fill = []; for (let z = 0; z < Hh; z++) for (let x = 0; x < W; x++) if (!seen[z * W + x] && !at(x, z) && !S(x - 1, z) && !S(x + 1, z) && !S(x, z - 1) && !S(x, z + 1)) fill.push((z + z0) * N + x + x0);   /* 바깥과 맞닿은 칸은 그대로 → 둘레가 부풀지 않음 */
  for (const k of fill) grid[k] = 1; };
function squashPiece(G, y0, maxD) {   /* 섬 몸통(땅 아래)만 깊이 maxD로 · 윗면과 그 위는 그대로 */
  G.updateMatrixWorld(true); let lo = 1e9; const v = new THREE.Vector3(), ms = []; G.traverse(m => { if (m.isMesh && m.geometry?.attributes.position) ms.push(m); });
  for (const m of ms) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); lo = Math.min(lo, v.y); } }
  const k = Math.min(1, maxD / Math.max(1e-3, y0 - lo)); if (k >= 1) return; const inv = new THREE.Matrix4(), seen = new Set();
  for (const m of ms) { if (seen.has(m.geometry)) continue; seen.add(m.geometry); const g = m.geometry, P = g.attributes.position, N = g.attributes.normal; inv.copy(m.matrixWorld).invert();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (v.y >= y0) continue; v.y = y0 + (v.y - y0) * k; v.applyMatrix4(inv); P.setXYZ(i, v.x, v.y, v.z); if (N) { const nx = N.getX(i), ny = N.getY(i) / k, nz = N.getZ(i), l = Math.hypot(nx, ny, nz) || 1; N.setXYZ(i, nx / l, ny / l, nz / l); } }   /* 눌린 만큼 빛 받는 방향도 */
    P.needsUpdate = true; if (N) N.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); } }
export function makeJungle(scene, { R0 = 136, R1 = 187, TOP = -3, UP = 20, DN = -30, sect = 10, avoid = [] } = {}) {
  const pieces = [], GATES = [], VINES = [], L = jungleLayout({ R0, R1, TOP, UP, DN, sect });
  const place = (built, x, y, z, s, yaw, sy = s) => { built.G.position.set(x, y, z); built.G.scale.set(s, sy, s); built.G.rotation.y = yaw; scene.add(built.G);
    built.G.traverse(o => { if (o.isPoints && o.material.size) o.material.size *= Math.max(s, sy); });   /* 포자 알갱이도 같은 비율로 */
    pack(built.G); const p = { ...built, x, y, z, rad: built.size * Math.max(s, sy) * 1.3 }; p.o = cur; p.outline = built.outline || built.G.userData.outline; p.block = built.block || built.G.userData.block; p.hole = built.hole; p.top = built.top || built.G.userData.top; pieces.push(p); if (cur && (cur.t === 'hunt' || (cur.t === 'fill' && cur.kind === IDX.flower))) SOLID.push(p); return p; };
  let cur = null; const SOLID = [], FOSS = [];   /* 막는 정글: 사냥터 섬(돔·가시·뼈) · 거대 포식 꽃 (사용자 2026-11-07) */
  /* 낱개 조각이 초원 섬과 겹치면 뺌 (같은 높이대일 때만) */
  const band = l => l === 'all' ? 'all' : l === 'mid' ? 0 : l === 'upgap' ? 1 : l === 'gap' || l === 'rock' ? -1 : l === 'up' ? 2 : l === 'dn' ? -2 : 9;
  const free = (o) => { for (const q of avoid) { if (q.layer === 'deco') continue; if (band(q.layer) !== band(o.layer) && q.layer !== 'pillar' && q.layer !== 'all') continue; if (Math.hypot(q.x - o.x, q.z - o.z) < (q.rr || 3) + o.r + 1) return false; }
    for (const q of L) { if (q === o || q.t === 'single' && L.indexOf(q) > L.indexOf(o)) continue; if (band(q.layer) !== band(o.layer) && q.layer !== 'all') continue; if (Math.hypot(q.x - o.x, q.z - o.z) < q.r + o.r + 1) return false; } return true; };
  /* 같은 모양 나눠 쓰기: 아래층 정글 섬과 작은 조각은 종류마다 몇 벌만 만들어 복사해 씀 (모양 데이터는 하나 · 크기·방향만 다르게) → 폰 메모리 절약 */
  const SHARE = new Map(), shared = (key, n, make) => { if (!SHARE.has(key)) SHARE.set(key, []); const arr = SHARE.get(key); if (arr.length < n) { const b = make(arr.length); arr.push(b); return b; }
    const src = arr[Math.floor(Math.random() * arr.length)]; if (!src.frozen) src.frozen = mergeStatic(src.G.clone(), []);   /* 복사본은 움직이지 않으므로 움직이던 부품까지 칠마다 합친 판을 한 번 만들어 나눠 씀 */
    const G = src.frozen.clone(); G.userData.srcF = src.frozen; return { G, anim: [], size: src.size, outline: src.G.userData.outline, block: src.G.userData.block, top: src.G.userData.top }; };
  for (const o of L) { cur = o;
    if (o.t === 'hunt' && o.dungeon) { const upL = o.layer === 'up';   /* 위층 던전: 아래로 늘어진 몸통을 눌러 줌 (밑을 지날 때 카메라와 기체 사이를 막지 않게 · 사용자 2026-11-07) */
      place(shared(upL ? 'hu' : 'h', 3, v => { const b = buildPiece(IDX.hunt, o.seed + v * 11, 1); if (upL) squashPiece(b.G, -1.5, 6 / o.s); return b; }), o.x, o.y, o.z, o.s, o.yaw); }   /* 위·아래층 던전은 멀리서 보는 곳 → 세 벌 나눠 씀 */
    else if (o.t === 'hunt') place(buildPiece(IDX.hunt, o.seed), o.x, o.y, o.z, o.s, o.yaw);
    else if (o.t === 'sanct') place(buildSanctum({ seed: o.seed, KL, clearA: o.clearA }), o.x, o.y, o.z, 1, o.yaw);
    else if (o.t === 'gate') { place(buildGateIsle(o.seed), o.x, o.y, o.z, o.s, o.yaw); GATES.push({ x: o.x, z: o.z, ...o.gate, jungle: true }); }
    else if (o.t === 'fill' && o.lite) { const b = shared('d' + o.kind, 2, v => { const b = buildPiece(o.kind, o.seed + v * 7, .55); const rm = []; b.G.traverse(c => { if (c.isPoints || c.isSprite || c.isLine) rm.push(c); }); rm.forEach(c => c.parent.remove(c)); b.anim = []; mergeStatic(b.G, []); return b; }); place(b, o.x, o.y, o.z, o.s, o.yaw); }   /* 아래층 먼 섬: 움직임 없음 → 모두 칠마다 합침 */
    else if (o.t === 'fill' && o.share && o.kind === IDX.flower && o.layer === 'mid') place(buildPiece(o.kind, o.seed, .6), o.x, o.y, o.z, o.s, o.yaw);   /* 기체 높이의 포식 꽃은 하나하나 살아 있어야 덮칠 수 있음 → 나눠 쓰지 않음 */
    else if (o.t === 'fill' && o.share) place(shared('m' + o.kind, 2, v => buildPiece(o.kind, o.seed + v * 13, .6)), o.x, o.y, o.z, o.s, o.yaw);
    else if (o.t === 'fill') { const b = buildPiece(o.kind, o.seed, Math.min(1, o.s / .36)); if (o.lite) { const rm = []; b.G.traverse(c => { if (c.isPoints || c.isSprite || c.isLine) rm.push(c); }); rm.forEach(c => c.parent.remove(c)); b.anim = []; } place(b, o.x, o.y, o.z, o.s, o.yaw); }
    else if (o.t === 'vine') { place(buildPiece(IDX.vine, o.seed), o.x, o.y, o.z, o.s, o.yaw, o.sy);
      const top = o.y + 66.5 * o.sy; if (o.y < .7 && top > .7)   /* 기체 높이를 지나가는 기둥만 막음 */
        for (let c = 0; c < 4; c++) { const a = c / 4 * 6.28 + .4, lx = Math.cos(a) * 9 * o.s, lz = Math.sin(a) * 9 * o.s, cy = Math.cos(-o.yaw), sy2 = Math.sin(-o.yaw); VINES.push([o.x + lx * cy - lz * sy2, o.z + lx * sy2 + lz * cy, 3.3 * o.s]); } }
    else if (o.t === 'single') { if (!free(o)) { o.skip = true; continue; } place(shared('s' + o.kind, 3, () => buildSingle(o.kind, o.seed)), o.x, o.y, o.z, o.s, o.yaw); }
  }
  cur = null;
  /* 정글 꾸미기 (사용자 2026-11-08): 사냥터 섬(가운데층 · 위아래 던전)부터 — 땅 덮개 · 바닥 식물 · 가장자리 숲 · 화석(막힘) */
  const dress = makeDresser(scene, KL);
  for (const p of pieces) if (p.o && p.o.t === 'hunt' && p.outline) { const n0 = dress.solids.length; dress.hunt({ x: p.x, y: p.y, z: p.z, yaw: p.o.yaw, extra: null }, p.outline, p.o.s, p.o.seed, { block: p.block });
    p.extra = dress.solids.slice(n0); for (const m of p.extra) { SOLID.push({ G: m, y: p.y, rad: 20 }); m.updateMatrixWorld(true); FOSS.push({ G: m, x: m.position.x, y: p.y, z: m.position.z, rad: 16 }); } }
  /* 보물 성소는 사용자 디자인 파일의 숲·풀·덩굴을 그대로 씀 (jsanct.js) → 여기서 따로 꾸미지 않음 */
  /* 나머지 정글 섬 전부 꾸미기 (사용자 2026-11-08: 정글 섬 전체를 퀄리티 있게) — 섬 종류마다 다른 식물 · 가까운 섬끼리 덩굴 · 그 밑 안개 (빛의 길 근처는 비움) */
  for (const p of pieces) { const o = p.o; if (!o || o.t === 'hunt' || o.t === 'sanct' || !p.top) continue;
    dress.isle({ x: p.x, y: p.y, z: p.z, yaw: o.yaw, s: o.s, sy: o.sy, kind: o.t === 'vine' ? 6 : o.kind, top: p.top, seed: o.seed, layer: o.layer, lite: !!o.lite || o.layer === 'dn', gate: o.t === 'gate', single: o.t === 'single' }); }
  dress.link(L.filter(q => q.t === 'corr')); dress.finish();
  /* 막힘 칸: 사냥터 섬·포식 꽃의 단단한 몸이 기체 높이 단면을 지나는 곳 + 덩굴 기둥 줄기를 25cm 칸으로 찍음 · 빛 무리·포자·선은 뺌 */
  const CL = .25, N = Math.ceil(R1 * 2 / CL) + 2, grid = new Uint8Array(N * N), cellOf = v => Math.floor((v + R1 + 1) / CL), Y0 = .45, Y1 = .95;   /* 25cm 칸 · 기체 높이 단면 */
  { const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3();
    for (const p of FOSS) { if (p.y - p.rad > Y1 || p.y + p.rad < Y0) continue;   /* 화석 뼈만 (사용자 2026-11-09: 뼈는 걸리게 · 최소한으로 · 매끄럽게) */   /* 막힘 없앰 (사용자 2026-11-08) → 칸 지도 안 만듦 (불러오기 빨라짐) */ p.G.updateMatrixWorld(true);
      p.G.traverse(m => { if (!m.isMesh || m.isInstancedMesh || !m.geometry || !m.geometry.attributes.position) return; const mt = m.material; if (mt && (mt.blending === THREE.AdditiveBlending || mt.depthWrite === false)) return;
        const P = m.geometry.attributes.position, I = m.geometry.index, cnt = I ? I.count : P.count, M = m.matrixWorld;
        for (let i = 0; i + 2 < cnt; i += 3) { a.fromBufferAttribute(P, I ? I.getX(i) : i).applyMatrix4(M); b.fromBufferAttribute(P, I ? I.getX(i + 1) : i + 1).applyMatrix4(M); c.fromBufferAttribute(P, I ? I.getX(i + 2) : i + 2).applyMatrix4(M);
          if (Math.max(a.y, b.y, c.y) < Y0 || Math.min(a.y, b.y, c.y) > Y1) continue;
          const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)), n = Math.max(1, Math.ceil(e / .17));
          for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) { const s1 = u / n, s2 = v / n; w.set(0, 0, 0).addScaledVector(a, 1 - s1 - s2).addScaledVector(b, s1).addScaledVector(c, s2);
            if (w.y < Y0 || w.y > Y1) continue; const gx = cellOf(w.x), gz = cellOf(w.z); if (gx >= 0 && gz >= 0 && gx < N && gz < N) grid[gz * N + gx] = 1; } } });
      fillHoles(grid, N, cellOf(p.x - p.rad), cellOf(p.z - p.rad), cellOf(p.x + p.rad), cellOf(p.z + p.rad));
      /* 최소한 · 매끄럽게: 가는 뼈(50cm 아래)는 지움(깎았다 다시 붙임) → 남은 덩어리는 둥글게 다듬음 (모서리 칸에 걸리지 않게) */
      const x0 = Math.max(1, cellOf(p.x - p.rad)), x1 = Math.min(N - 2, cellOf(p.x + p.rad)), z0 = Math.max(1, cellOf(p.z - p.rad)), z1 = Math.min(N - 2, cellOf(p.z + p.rad)), W = x1 - x0 + 1, H = z1 - z0 + 1;
      const get = (A, x, z) => A[(z - z0) * W + (x - x0)], A0 = new Uint8Array(W * H); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) A0[(z - z0) * W + x - x0] = grid[z * N + x];
      const morph = (A, er) => { const B = new Uint8Array(W * H); for (let z = z0 + 1; z < z1; z++) for (let x = x0 + 1; x < x1; x++) { let c = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) c += get(A, x + dx, z + dz); B[(z - z0) * W + x - x0] = er ? (c === 9 ? 1 : 0) : (c > 0 ? 1 : 0); } return B; };
      const sm = A => { const B = new Uint8Array(W * H); for (let z = z0 + 2; z < z1 - 1; z++) for (let x = x0 + 2; x < x1 - 1; x++) { let c = 0; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) c += get(A, x + dx, z + dz); B[(z - z0) * W + x - x0] = c >= 13 ? 1 : 0; } return B; };
      const A1 = sm(morph(morph(A0, 1), 0)); for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[z * N + x] = A1[(z - z0) * W + x - x0]; } }
  if (0) for (const v of VINES) { const r = v[2]; for (let z = v[1] - r; z <= v[1] + r; z += CL) for (let x = v[0] - r; x <= v[0] + r; x += CL) if ((x - v[0]) ** 2 + (z - v[1]) ** 2 < r * r) { const gx = cellOf(x), gz = cellOf(z); if (gx >= 0 && gz >= 0 && gx < N && gz < N) grid[gz * N + gx] = 1; } }   /* 덩굴 줄기도 칸 지도에 → 한 번에 찾음 */
  const blocked = (x, z) => { const gx = cellOf(x), gz = cellOf(z); return gx >= 0 && gz >= 0 && gx < N && gz < N && grid[gz * N + gx] === 1; };   /* 층을 뚫는 덩굴 기둥 + 사냥터 섬·포식 꽃 */
  const sph = new THREE.Sphere(), fr = new THREE.Frustum(), pv = new THREE.Matrix4();
  /* 멀리서는 움직임이 안 보임 → 움직이는 부품을 칠마다 합친 '멈춘 판'을 미리 만들어 두고 65m 밖에선 그것만 그림 (2026-11-08 최적화)
     움직이는 부품만 따로 복사(이미 합친 부품은 나눠 씀) · 가까이 오면 원래 움직이는 부품으로 돌아옴 */
  for (const p of pieces) { const mv = p.G.userData.moving; if (!p.anim || !p.anim.length || !mv || mv.length < 3) continue;
    p.G.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(p.G.matrixWorld).invert(), groups = new Map();
    for (const o of mv) { if (!o.parent) continue; let hid = !o.visible, q = o.parent; while (q && q !== p.G) { if (!q.visible) hid = true; q = q.parent; } if (hid) continue; const m = canonMat(o.material), g = o.geometry, key = m.uuid + '|' + Object.keys(g.attributes).sort().join(',') + (g.index ? 'i' : '') + o.renderOrder; if (!groups.has(key)) groups.set(key, [m, []]); groups.get(key)[1].push(o); }
    const fz = new THREE.Group(); fz.visible = false;
    for (const [m, list] of groups.values()) { const parts = list.map(o => { const g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (g.attributes[k].isInterleavedBufferAttribute) g.setAttribute(k, g.attributes[k].clone()); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
      const mg = parts.length > 1 ? mergeGeometries(parts, false) : parts[0]; if (!mg) continue; const me = new THREE.Mesh(mg, m); me.renderOrder = list[0].renderOrder; fz.add(me); }
    pack(fz); p.G.add(fz); p.frozen = fz; p.mov = mv; p.fz = false; }
  /* 도착 섬(위·아래층)에 있을 때: 다른 층 섬은 수십 m 아래·위로 보임 → 작은 풀·덩굴·안개는 안 그리고 · 120m까지만 · 움직임 없이 멈춘 판 (2026-11-08 최적화 · 사용자: 다른 섬·구름 바다 끄면 확 좋아짐) */
  let FOC = null, FOCY = 0; const setFocus = (L, y) => { FOC = L; FOCY = y; };
  /* 나눠 쓰는 정글 섬(같은 모양 복사본)은 모양마다 한 번에 그림 (2026-11-09 · 폰 그리기 횟수: 정글 가운데층 복사본이 그리기의 절반) — 칠마다 InstancedMesh · 빛 점(스프라이트)은 맵 전체 한 판 */
  const SH = new Map(), GLW = []; const _m4 = new THREE.Matrix4(), _v = new THREE.Vector3();
  for (const p of pieces) { const F = p.G.userData.srcF; if (!F) continue; if (!SH.has(F)) SH.set(F, { F, list: [], ims: [] }); SH.get(F).list.push(p); }
  for (const S of SH.values()) { const ch = S.F.children; p0: for (let j = 0; j < ch.length; j++) { const c = ch[j];
      if (c.isMesh && !c.isInstancedMesh && !c.children.length) { const im = new THREE.InstancedMesh(c.geometry, c.material, S.list.length); im.count = 0; im.frustumCulled = false; im.renderOrder = c.renderOrder; im.visible = false; scene.add(im); S.ims.push({ im, j, local: c.matrix.clone() }); } }
    for (const p of S.list) { p.G.updateMatrixWorld(true); const kill = [];
      p.G.children.forEach((c, j) => { if (S.ims.some(e => e.j === j)) kill.push(c); else if (c.isSprite && c.material.blending === THREE.AdditiveBlending && !c.children.length) { c.updateMatrixWorld(); const ws = new THREE.Vector3(); c.getWorldScale(ws); _v.setFromMatrixPosition(c.matrixWorld); GLW.push([_v.x, _v.y, _v.z, ws.x, ws.y, c.material.color, c.material.opacity, c.material.map]); kill.push(c); } });
      kill.forEach(c => p.G.remove(c)); p.inst = S; p.pts = p.G.children.filter(c => c.isPoints); p.ptsOn = true; } S.dirty = true; }
  { const byMap = new Map(); for (const g of GLW) { if (!byMap.has(g[7])) byMap.set(g[7], []); byMap.get(g[7]).push(g); }
    const q = new THREE.PlaneGeometry(1, 1);
    for (const [map, L] of byMap) { const g = new THREE.InstancedBufferGeometry(); g.index = q.index; g.setAttribute('position', q.attributes.position); g.setAttribute('uv', q.attributes.uv);
      g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(L.flatMap(e => [e[0], e[1], e[2]])), 3)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(new Float32Array(L.flatMap(e => [e[3], e[4]])), 2));
      g.setAttribute('iC', new THREE.InstancedBufferAttribute(new Float32Array(L.flatMap(e => [e[5].r, e[5].g, e[5].b, e[6]])), 4)); g.instanceCount = L.length;
      const m = new THREE.ShaderMaterial({ uniforms: { map: { value: map } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'attribute vec3 iP; attribute vec2 iS; attribute vec4 iC; varying vec2 vU; varying vec4 vC; void main(){ vU = uv; vC = iC; vec4 mv = viewMatrix * vec4(iP, 1.); vC.a *= 1. - smoothstep(100., 125., length(mv.xyz)); mv.xy += position.xy * iS; gl_Position = projectionMatrix * mv; }',
        fragmentShader: map ? 'uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 t = texture2D(map, vU); gl_FragColor = vec4(vC.rgb * t.rgb, t.a * vC.a); }' : 'varying vec2 vU; varying vec4 vC; void main(){ gl_FragColor = vec4(vC.rgb, vC.a); }' });
      const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.renderOrder = 3; scene.add(me); } }
  for (const p of pieces) { const J = []; p.G.traverse(o => { if (o.userData.jelly != null) J.push(o); }); if (J.length) { p.jel = J; p.jelOn = true; } }   /* 해파리 몸은 가까이에서만 그림 (튕김 판정은 자리만 씀) */
  const instSync = () => { for (const S of SH.values()) { if (!S.dirty) continue; S.dirty = false; const vp = S.list.filter(p => p.G.visible);
      for (const e of S.ims) { vp.forEach((p, i) => e.im.setMatrixAt(i, _m4.multiplyMatrices(p.G.matrixWorld, e.local))); e.im.count = vp.length; e.im.instanceMatrix.needsUpdate = true; e.im.visible = vp.length > 0; } } };
  const NEARM = new Set();
  const update = (t, dt, camera) => { CAM = camera; { const c = []; for (const p of pieces) if (p.frozen) c.push([Math.hypot(p.x - camera.position.x, p.z - camera.position.z, (p.y - camera.position.y) * .5), p]); c.sort((a, b) => a[0] - b[0]); NEARM.clear(); for (let i = 0; i < Math.min(2, c.length); i++) NEARM.add(c[i][1]); } T.value = t; dress.update(t, camera.position, FOC ? FOCY : null); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pv);
    for (const p of pieces) { const d = Math.hypot(p.x - camera.position.x, p.z - camera.position.z); sph.center.set(p.x, p.y, p.z); sph.radius = p.rad;
      const other = FOC && p.o && p.o.layer !== FOC && Math.abs(p.y - FOCY) > 6;
      const vis = d < (other ? 90 : 115) + p.rad * .5 && fr.intersectsSphere(sph) && (!globalThis.__HIDE_OTHER || (p.o && p.o.t === 'sanct')); if (p.inst && p.G.visible !== vis) p.inst.dirty = true; p.G.visible = vis; if (p.jel && vis) { const on = d < 40; if (on !== p.jelOn) { p.jelOn = on; for (const q of p.jel) q.visible = on; } } if (p.pts && vis) { const on = d < 42; if (on !== p.ptsOn) { p.ptsOn = on; for (const q of p.pts) q.visible = on; } }   /* 복사본 섬의 포자 알갱이는 가까이에서만 */   /* __HIDE_OTHER: 폰 무게 재기 */ if (!vis) continue; const d3 = Math.hypot(d, p.y - camera.position.y), near = d3 < 26 + p.rad * .5 && !other && (!p.frozen || NEARM.has(p));   /* 움직이는 부품(촉수·해파리…)은 가까운 섬 둘까지만 · 나머지는 멈춘 판 (2026-11-09 · 폰 그리기 횟수) */ if (p.G.userData.lod) p.G.userData.lod(d3);   /* 높이 차이도 (위층에서 내려다보면 먼 것) */
      if (p.frozen && p.fz === near) { p.fz = !near; for (const o of p.mov) o.visible = near; p.frozen.visible = !near; }   /* 65m 밖: 멈춘 판 */
      if (near || (!p.frozen && d < 95 && !other)) for (const f of p.anim) f(t, dt); } instSync(); };   /* 먼 것은 움직임을 멈춤 */
  const setLight = k => { KL.uLift.value = k; };
  return { update, blocked, GATES, pieces, setLight, setFocus };
}
