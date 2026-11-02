import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/* 자기장 판 — 철판 조각을 실제로 쌓아 만든다. 빛은 철판에 박힌 등 부품에서만 나온다 */

/* 긁힌 광택 철판 결 (한 번만 그림) */
function steelTex(){
  const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
  g.fillStyle='#d8d8d8'; g.fillRect(0,0,512,512);
  for(let i=0;i<3200;i++){ const x=Math.random()*512,y=Math.random()*512,l=4+Math.random()*40,a=Math.random()*Math.PI;
    g.strokeStyle=`rgba(${Math.random()<.5?255:0},${Math.random()<.5?255:0},${Math.random()<.5?255:0},${.02+Math.random()*.05})`;
    g.lineWidth=.6; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke(); }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.colorSpace=THREE.NoColorSpace; return t;
}

/* 부채꼴 조각: 틈은 어디서나 같은 폭(평행)으로 */
function sector(r0,r1,a0,a1,gap,h,bevel){
  const sh=new THREE.Shape(), N=40;
  const ang=(r,a,s)=>a+s*Math.asin(Math.min(.99,gap/2/r));
  for(let i=0;i<=N;i++){ const a=THREE.MathUtils.lerp(ang(r1,a0,1),ang(r1,a1,-1),i/N);
    i?sh.lineTo(Math.cos(a)*r1,Math.sin(a)*r1):sh.moveTo(Math.cos(a)*r1,Math.sin(a)*r1); }
  for(let i=0;i<=N;i++){ const a=THREE.MathUtils.lerp(ang(r0,a1,-1),ang(r0,a0,1),i/N); sh.lineTo(Math.cos(a)*r0,Math.sin(a)*r0); }
  sh.closePath();
  const geo=new THREE.ExtrudeGeometry(sh,{depth:h-bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel*.8,bevelSegments:2,curveSegments:40});
  geo.rotateX(-Math.PI/2);   /* 바닥에 눕힘: 위로 h */
  return geo;
}
function ring(r0,r1,h,y=0,seg=128){ const g=new THREE.CylinderGeometry(r1,r1,h,seg,1,true); const gi=new THREE.CylinderGeometry(r0,r0,h,seg,1,true);
  const top=new THREE.RingGeometry(r0,r1,seg); top.rotateX(-Math.PI/2); top.translate(0,h/2,0);
  const m=mergeGeometries([g,gi,top].map(x=>x.toNonIndexed())); m.translate(0,y+h/2,0); return m; }
function arcStrip(r0,r1,a0,a1,y){ const g=new THREE.RingGeometry(r0,r1,48,1,a0,a1-a0); g.rotateX(-Math.PI/2); g.translate(0,y,0); return g; }
function boxAt(w,h,d,r,a,y,yaw){ const g=new THREE.BoxGeometry(w,h,d); g.rotateY(yaw===undefined?-a:yaw); g.translate(Math.cos(a)*r,y,Math.sin(a)*r); return g; }

function sweep(prof,a0,a1,gap,n=40){
  const pos=[], rM=prof.reduce((m,q)=>Math.max(m,q[0]),0);
  const da=Math.asin(Math.min(.99,gap/2/rM)), A0=a0+da, A1=a1-da;
  const P=(q,a)=>[q[0]*Math.cos(a),q[1],q[0]*Math.sin(a)];
  for(let i=0;i<n;i++){ const t0=A0+(A1-A0)*i/n, t1=A0+(A1-A0)*(i+1)/n;
    for(let k=0;k<prof.length;k++){ const q0=prof[k], q1=prof[(k+1)%prof.length];
      pos.push(...P(q0,t0),...P(q1,t0),...P(q1,t1), ...P(q0,t0),...P(q1,t1),...P(q0,t1)); } }
  const tri=THREE.ShapeUtils.triangulateShape(prof.map(q=>new THREE.Vector2(q[0],q[1])),[]);
  for(const [x,y,z] of tri){ pos.push(...P(prof[z],A0),...P(prof[y],A0),...P(prof[x],A0)); pos.push(...P(prof[x],A1),...P(prof[y],A1),...P(prof[z],A1)); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  const uv=[]; for(let i=0;i<pos.length;i+=3) uv.push(pos[i]*.5,pos[i+2]*.5); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.computeVertexNormals(); return g;
}
export function makePad(){
  const tex=steelTex();
  const steel=new THREE.MeshStandardMaterial({color:0xc4cad2,metalness:1,roughness:.14,roughnessMap:tex,map:tex});
  const bright=new THREE.MeshStandardMaterial({color:0xeef2f7,metalness:1,roughness:.11,roughnessMap:tex,map:tex});
  const steel2=new THREE.MeshStandardMaterial({color:0x9aa1aa,metalness:1,roughness:.20,roughnessMap:tex,map:tex});
  const dark=new THREE.MeshStandardMaterial({color:0x22272e,metalness:1,roughness:.35});
  const black=new THREE.MeshStandardMaterial({color:0x07090c,metalness:.6,roughness:.6});
  const BL=new THREE.Color(.30,.58,1.0);
  const lamp=(k)=>new THREE.MeshBasicMaterial({color:BL.clone().multiplyScalar(k),toneMapped:false});
  const lampHi=lamp(3.2), lampMid=lamp(2.2);
  /* 모든 등은 한 셰이더: 가운데서 바깥으로 번지는 빛(앞머리 반지름 uFront)을 받아 차례로 밝아진다 */
  const lampU={uFront:{value:-1},uHead:{value:0},uAfter:{value:0},uBase:{value:.55},uInv:{value:new THREE.Matrix4()},uBack:{value:9},uTail:{value:0},uGrade:{value:0},uT:{value:0},uIn:{value:-1},uInHead:{value:0}};   /* uIn: 바깥에서 가운데로 차오르는 빛의 안쪽 끝(기지에서 에너지가 들어올 때). -1이면 안 씀 */
  const lampMat=new THREE.ShaderMaterial({uniforms:lampU,toneMapped:false,
    vertexShader:'uniform mat4 uInv;varying float vR,vA;void main(){vec4 w=modelMatrix*vec4(position,1.);vec2 l=(uInv*w).xz;vR=length(l);vA=atan(l.y,l.x);gl_Position=projectionMatrix*viewMatrix*w;}',   /* 판 중심에서 잰 거리 */
    fragmentShader:`precision highp float;varying float vR,vA;uniform float uFront,uHead,uAfter,uBase,uBack,uTail,uGrade,uT,uIn,uInHead;
      vec3 hsv(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
      void main(){ float lit=uFront<0.?0.:smoothstep(uFront+.02,uFront-.06,vR)*smoothstep(uBack+.10,uBack-.04,vR);   /* 바깥부터 꺼짐 */
        float tail=uBack<0.||uBack>8.?0.:exp(-pow((vR-uBack)/.12,2.))*uTail;
        float head=uFront<0.?0.:exp(-pow((vR-uFront)/.09,2.))*uHead;   /* 번지는 앞머리를 넓고 밝게 */
        if(uIn>=0.){ lit*=smoothstep(uIn-.04,uIn+.06,vR); head+=exp(-pow((vR-uIn)/.09,2.))*uInHead; }   /* 바깥 → 가운데로 차오름 */
        float k=uBase+uAfter*lit*1.6+head*4.5+tail*2.;
        /* 등급 색: 일반 진한 파랑 / 정예 보랏빛 자홍 / 전설 무지개(가운데서 바깥으로 색이 갈라지며 천천히 돎) */
        vec3 col = uGrade<.5 ? vec3(.10,.30,1.) : uGrade<1.5 ? vec3(.80,.16,1.) : hsv(fract(vR*.42+vA/6.2832-uT*.06))*vec3(1.,.95,1.05)+.08;
        gl_FragColor=vec4(col*3.2*k,1.); }`});
  const lOuter=lampMat, lRim=lampMat, lRad=lampMat, lCen=lampMat;
  const G=new THREE.Group();
  const S=8, A=Math.PI*2/S;

  /* 바닥 받침 */
  G.add(new THREE.Mesh(ring(0,1.60,.03,0,128),dark));
  /* 바깥 고리: 아랫단(넓고 낮음) + 윗단(두꺼움), 8조각 */
  const outerLow=[], outerHi=[];
  for(let i=0;i<S;i++){ const a0=i*A, a1=(i+1)*A;
    outerLow.push(sweep([[1.455,.03],[1.585,.03],[1.585,.07],[1.455,.150]],a0,a1,.17));
    outerHi.push(sector(1.12,1.48,a0,a1,.17,.14,.014).translate(0,.03,0)); }
  G.add(new THREE.Mesh(mergeGeometries(outerLow),steel2));
  G.add(new THREE.Mesh(mergeGeometries(outerHi),bright));
  /* 연결 블록 (틈마다) + 박힌 등 */
  const blocks=[], lamps=[];
  /* 블록: 넓은 판(위 .19)보다 낮게(위 .14). 바깥 끝은 경사.
     등은 판 위에 올리지 않고 블록 가운데를 실제로 파낸 홈 속에 넣는다 (양옆 난간 + 가운데 파인 조각) */
  const BT=.155, R0=1.08, RS=1.38, RE=1.60, YE=.10;
  const slopeY=r=>BT-(r-RS)/(RE-RS)*(BT-YE);
  const D=.012;                                   /* 홈 깊이 */
  const prof=(pts)=>new THREE.Shape(pts.map(q=>new THREE.Vector2(q[0],q[1])));
  const ext=(sh,w,z)=>{ const g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:true,bevelThickness:.004,bevelSize:.004,bevelSegments:2}); g.translate(0,0,z); return g; };
  const full=prof([[R0,.03],[R0,BT],[RS,BT],[RE,YE],[RE,.03]]);
  const s0=1.44, s1=1.55;
  const notched=prof([[R0,.03],[R0,BT],[1.13,BT],[1.13,BT-D],[1.31,BT-D],[1.31,BT],[RS,BT],
    [s0,slopeY(s0)],[s0,slopeY(s0)-D],[s1,slopeY(s1)-D],[s1,slopeY(s1)],[RE,YE],[RE,.03]]);
  const W=.13, CW=.05, RW=(W-CW)/2;
  const blockGeo=mergeGeometries([ext(full,RW-.004,-W/2+.004),ext(notched,CW,-CW/2),ext(full,RW-.004,CW/2)].map(g=>g.toNonIndexed()));
  const sa=Math.atan2(BT-YE,RE-RS);
  const slopeLamp=new THREE.BoxGeometry((s1-s0)/Math.cos(sa)-.01,.004,CW-.008); slopeLamp.rotateZ(-sa);
  slopeLamp.translate((s0+s1)/2,(slopeY(s0)+slopeY(s1))/2-D+.003,0);
  const topLamp=new THREE.BoxGeometry(.17,.004,CW-.008); topLamp.translate(1.22,BT-D+.003,0);
  for(let i=0;i<S;i++){ const a=i*A;
    blocks.push(blockGeo.clone().rotateY(-a));
    lamps.push(topLamp.clone().rotateY(-a));                          /* 윗면 홈 속 등 */
    lamps.push(slopeLamp.clone().rotateY(-a));                        /* 경사면 홈 속 등 */
    const am=a+A/2; lamps.push(boxAt(.010,.018,.20,1.587,am,.050)); } /* 아랫단 옆면 등 */
  G.add(new THREE.Mesh(mergeGeometries(blocks),dark));
  G.add(new THREE.Mesh(mergeGeometries(lamps),lOuter));
  /* 홈: 깊은 바닥 + 통풍 창살 */
  G.add(new THREE.Mesh(ring(.86,1.13,.02,.09,128),black));
  const slats=[]; for(let i=0;i<120;i++){ const a=i/120*Math.PI*2; slats.push(boxAt(.25,.03,.010,.995,a,.11+.015)); }
  G.add(new THREE.Mesh(mergeGeometries(slats),dark));
  /* 안쪽 원판 8조각 (방사형 홈) */
  const inner=[]; for(let i=0;i<S;i++) inner.push(sector(.40,.81,i*A+A/2,(i+1)*A+A/2,.024,.135,.008).translate(0,.03,0));
  G.add(new THREE.Mesh(mergeGeometries(inner),steel));
  /* 원판 테두리: 움푹 들어간 파란 등 띠 + 바깥 철 턱 */
  const rim=[]; for(let i=0;i<S;i++){ const a0=i*A+A/2, a1=a0+A; rim.push(arcStrip(.815,.872,a0+.03,a1-.03,.152)); }
  G.add(new THREE.Mesh(mergeGeometries(rim),lRim));
  G.add(new THREE.Mesh(ring(.81,.875,.12,.03,128),black));      /* 등 띠 아래 어두운 홈 바닥 */
  G.add(new THREE.Mesh(ring(.875,.90,.14,.03,128),steel2));
  /* 방사형 홈 안 짧은 등 (네 곳) */
  /* 방사형 홈 속에서 등 막대 자체가 판 위로 솟아오름(양각) */
  const hl=[], LT=.165+.012;
  for(let i=0;i<8;i++){ const a=i*A+A/2; hl.push(boxAt(.40,LT-.06,.016,.605,a,(LT+.06)/2)); }   /* 홈 8곳, 안쪽 끝~바깥 끝 꽉 */
  G.add(new THREE.Mesh(mergeGeometries(hl),lRad));
  /* 가운데: 철 턱 – 파란 고리 – 어두운 턱 – 빛 렌즈 */
  G.add(new THREE.Mesh(ring(.36,.40,.135,.03,96),steel2));
  G.add(new THREE.Mesh(ring(.305,.36,.115,.03,96),black));
  const cr=new THREE.Mesh(new THREE.RingGeometry(.305,.36,96),lCen); cr.rotation.x=-Math.PI/2; cr.position.y=.148; G.add(cr);
  G.add(new THREE.Mesh(ring(.255,.305,.13,.03,96),steel));
  G.add(new THREE.Mesh(ring(.20,.255,.105,.03,96),dark));
  const lensMat=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uK:{value:1}},toneMapped:false,
    vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`precision highp float;varying vec2 vP;uniform float uT,uK;
      void main(){ float r=length(vP)/.20;
        vec3 c=mix(vec3(4.2,4.6,5.),vec3(.5,1.0,2.4),smoothstep(.0,.85,r));
        c*= .92+.08*sin(uT*2.1);
        gl_FragColor=vec4(c*uK,1.); }`});
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.20,64),lensMat); lens.rotation.x=-Math.PI/2; lens.position.y=.139; G.add(lens);
  G.userData.update=(t)=>{ G.updateMatrixWorld(); lampU.uInv.value.copy(G.matrixWorld).invert(); lampU.uT.value=t; lensMat.uniforms.uT.value=t; };
  G.userData.lamps=[lampHi,lampMid,lensMat];
  G.userData.groups={outer:lOuter,rim:lRim,rad:lRad,cen:lCen,lens:lensMat};
  G.userData.lampU=lampU;
  G.userData.idleSrc={ring:.333,rad:[.42,.79],rim:.845,n:8};
  G.userData.blockLamp={r:1.22,y:.146,n:8};   /* 힘줄이 나오는 자리 */
  return G;
}
