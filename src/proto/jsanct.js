/* 정글 보물 성소 — 근원의 알 성소 (사용자 2026-11-08: 사용자가 보낸 디자인 파일 'origin-egg-sanctum.html' 그대로)
   ▸ 아래 '원본' 부분은 사용자가 보낸 파일의 섬 만드는 코드를 그대로 옮긴 것 (모양 · 손으로 그린 바닥·고리·잎·나무껍질 그림 · 식물 · 알 · 빛기둥 · 빛 폭포 · 숫자 그대로)
     바꾼 것만: ① 크기 0.16배(원래 반지름 140 → 약 23m · 정글 던전 자리에 맞춤) ② 섬 밑을 얕게(170 → 40 · 위층이라 가운데층 시야를 막지 않게) · 밑 가시·덩굴도 짧게
     ③ 폰 부담: 둥근 것들 마디 수만 줄임(이 크기에선 같아 보임) · 바닥 그림은 2048로 그려서 1024로 줄여 씀 ④ 하늘·별·안개·전투 범위 표시·카메라·화면 효과는 게임 것을 씀
   ▸ 빛: 게임은 낮 햇빛(초원)이라 원본의 밤 조명을 이 섬 칠에서만 똑같이 계산 — 하늘·땅 빛 · 달빛 · 따뜻한 빛 · 알에서 나오는 빛 · 반짝임 · 원본과 같은 색 보정(ACES · 밝기 1.45)
     (진짜 그림자·빛 번짐 화면 효과는 폰 60프레임 때문에 뺌)
   ▸ 한 번만 만들고 다섯 곳에 복사 (모양·그림을 나눠 씀 · 움직임은 하나를 돌려 복사본에 옮김) → 불러오기·메모리는 성소 하나 값
   ▸ 빛의 길이 닿는 쪽(clearA)에 원본의 '빛 폭포 비행 통로' 하나가 오게 돌려 놓음 (나무·바위가 없는 길) */
import * as THREE from 'three';
const K = .16;
const LU = {   /* 원본 조명 (원본 C(): sRGB→선형) — 아래에서 채움 */
  uHS: { value: new THREE.Color() }, uHG: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() },
  uMD: { value: new THREE.Vector3(-90, 140, 60).normalize() }, uMC: { value: new THREE.Color() }, uWD: { value: new THREE.Vector3(70, 30, -50).normalize() }, uWC: { value: new THREE.Color() },
  uEP: { value: new THREE.Vector3() }, uEC: { value: new THREE.Color() }, uEB: { value: new THREE.Color() }, uED: { value: 90 * K } };
const LIT_COMMON = `uniform vec3 uSpec, uHS, uHG, uAmb, uMD, uMC, uWD, uWC, uEP, uEC; uniform float uShin, uED;
  vec3 dirL(vec3 n, vec3 V, vec3 L, vec3 C, inout vec3 sp){ float d = max(dot(n, L), 0.); vec3 H = normalize(L + V); float lh = max(dot(L, H), 0.);
    vec3 F = uSpec + (1. - uSpec) * pow(1. - lh, 5.); sp += C * d * F * .25 * (uShin * .5 + 1.) * pow(max(dot(n, H), 0.), uShin); return C * d; }
  vec3 litAt(vec3 n, vec3 W, inout vec3 sp){ vec3 V = normalize(cameraPosition - W); vec3 irr = mix(uHG, uHS, n.y * .5 + .5) + uAmb + dirL(n, V, uMD, uMC, sp) + dirL(n, V, uWD, uWC, sp);
    vec3 lv = uEP - W; float dist = length(lv); float att = pow(clamp(1. - dist / uED, 0., 1.), 1.6); return irr + dirL(n, V, lv / max(dist, 1e-4), uEC * att, sp); }`;
const LIT_V = `varying vec3 vW, vN, vCol, vIrr, vSp; varying vec2 vUv; uniform mat3 uvT;
  ${LIT_COMMON}
  void main(){
    #ifdef USE_INSTANCING
      mat4 M = modelMatrix * instanceMatrix;
    #else
      mat4 M = modelMatrix;
    #endif
    vec4 w = M * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(M) * normal); vUv = (uvT * vec3(uv, 1.)).xy; vCol = vec3(1.);
    #ifdef USE_COLOR
      vCol *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vCol *= instanceColor;
    #endif
    #ifdef VLIT
      vec3 n = vN; if (dot(n, cameraPosition - vW) < 0.) n = -n; vSp = vec3(0.); vIrr = litAt(n, vW, vSp);   /* 빛을 점마다 한 번 (화면 칸마다가 아니라) */
    #endif
    gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIT_F = `varying vec3 vW, vN, vCol, vIrr, vSp; varying vec2 vUv;
  uniform vec3 uDif, uEm; uniform float uEmI, uAT;
  ${LIT_COMMON}
  #ifdef S_MAP
    uniform sampler2D map;
  #endif
  #ifdef S_EMAP
    uniform sampler2D emap;
  #endif
  vec3 rrt(vec3 v){ vec3 a = v * (v + .0245786) - .000090537; vec3 b = v * (.983729 * v + .4329510) + .238081; return a / b; }
  vec3 aces(vec3 c){ const mat3 I = mat3(vec3(.59719, .07600, .02840), vec3(.35458, .90834, .13383), vec3(.04823, .01566, .83777)); const mat3 O = mat3(vec3(1.60475, -.10208, -.00327), vec3(-.53108, 1.10813, -.07276), vec3(-.07367, -.00605, 1.07602));
    c *= 1.45 / .6; c = I * c; c = rrt(c); c = O * c; return clamp(c, 0., 1.); }
  void main(){
    vec4 dc = vec4(uDif * vCol, 1.);
    #ifdef S_MAP
      dc *= texture2D(map, vUv);
    #endif
    if (dc.a < uAT) discard;
    #ifdef VLIT
      vec3 irr = vIrr, sp = vSp;
    #else
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; vec3 sp = vec3(0.), irr = litAt(n, vW, sp);
    #endif
    vec3 em = uEm * uEmI;
    #ifdef S_EMAP
      em *= texture2D(emap, vUv).rgb;
    #endif
    vec3 c = dc.rgb * irr + sp + em;
    gl_FragColor = linearToOutputTexel(vec4(aces(c), 1.)); }`;
const LIT = new Set(), LITM = [];
function litOf(m) {   /* 원본 Phong/Standard 칠 → 같은 계산의 이 섬 전용 칠 */
  const std = !!m.isMeshStandardMaterial, map = m.map || null, emap = m.emissiveMap || null; if (map) map.updateMatrix();
  const u = { ...LU, uDif: { value: m.color.clone() }, uSpec: { value: std ? new THREE.Color(0, 0, 0) : m.specular.clone() }, uShin: { value: std ? 1 : m.shininess }, uEm: { value: m.emissive ? m.emissive.clone() : new THREE.Color(0) }, uEmI: { value: m.emissiveIntensity ?? 1 },
    uAT: { value: m.alphaTest || 0 }, uvT: { value: map ? map.matrix : new THREE.Matrix3() }, map: { value: map }, emap: { value: emap } };
  const s = new THREE.ShaderMaterial({ uniforms: u, vertexShader: LIT_V, fragmentShader: LIT_F, side: m.side, vertexColors: !!m.vertexColors, defines: { ...(map ? { S_MAP: 1 } : {}), ...(emap ? { S_EMAP: 1 } : {}) } });
  s.userData.src = m; LIT.add(s); LITM.push(s); return s; }


/* 빛기둥·빛 폭포 무늬: 원본은 화면 칸마다 잡음을 네 겹씩 계산(폰에서 가장 무거운 곳) → 같은 성격의 잡음을 미리 그림 한 장으로 구워 흘려 씀 (2026-11-08 최적화)
   이어 붙여도 이음매가 없게(바둑판처럼 반복되는 격자 잡음) · 겹 수·세기는 원본과 같음 */
function tileNoise(W, H, PX, PY, oct = 4) { const d = new Uint8Array(W * H * 4), hh = (x, y, s) => { const n = Math.sin((((x % s[0]) + s[0]) % s[0]) * 127.1 + (((y % s[1]) + s[1]) % s[1]) * 311.7 + s[2] * 74.7) * 43758.5453; return n - Math.floor(n); };
  const vn = (x, y, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hh(ix, iy, s), b = hh(ix + 1, iy, s), c = hh(ix, iy + 1, s), e = hh(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = 0, a = .5; for (let o = 0; o < oct; o++) { const f = 1 << o; v += a * vn(i / W * PX * f, j / H * PY * f, [PX * f, PY * f, o]); a *= .5; } const b = Math.round(Math.min(1, v) * 255), k = (j * W + i) * 4; d[k] = d[k + 1] = d[k + 2] = b; d[k + 3] = 255; }
  const t = new THREE.DataTexture(d, W, H); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; }
let NS = null, NF = null; const noiseTex = () => { if (!NS) { NS = tileNoise(128, 512, 10, 8); NF = tileNoise(256, 256, 16, 16); } return [NS, NF]; };
/* 폰에서 무게 재기 (사용자 2026-11-08: 성소에서 48프레임) — 화면 시험 버튼이 켜고 끔. 모든 성소에 같이 적용 */
const CLONES = [];
export const SANCT_TEST = { all: true, shaft: true, fall: true, glow: true, leaf: true, vlit: false,
  set(k, v) { this[k] = v; if (k === 'vlit') { for (const m of LITM) { if (v) m.defines.VLIT = 1; else delete m.defines.VLIT; m.needsUpdate = true; } } CLONES.forEach(c => c.apply()); } };
let TPL = null;
function template() { if (TPL) return TPL;
  const CMp = THREE.ColorManagement.enabled; THREE.ColorManagement.enabled = false;   /* 원본(three r128)과 같은 색 다루기: 색 글자를 그대로 씀 */
  const root = new THREE.Group(), SEED = 52021; let O;
  try { O = (function () { 'use strict';
/* ═══════════════════════ 원본 (사용자 파일) ═══════════════════════ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const R=mulberry32(SEED),rnd=(a,b)=>a+(b-a)*R(),clamp=(v,a,b)=>v<a?a:v>b?b:v;
const V=(x,y,z)=>new THREE.Vector3(x,y,z),UP=V(0,1,0);
const C=h=>new THREE.Color(h).convertSRGBToLinear();
function hash2(x,y){let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm2(x,y){let s=0,a=.5;for(let i=0;i<4;i++){s+=a*vnoise(x,y);x*=2.03;y*=2.03;a*=.5;}return s;}
const anim=[];
function dotTex(){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);}
const dot=dotTex();
function glow(col,s,op){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:dot,color:col,transparent:true,opacity:op==null?.8:op,blending:THREE.AdditiveBlending,depthWrite:false}));m.scale.set(s,s,1);return m;}
// ---------------- materials ----------------
const goldM=new THREE.MeshPhongMaterial({color:C('#b8903e'),specular:C('#ffe2a8'),shininess:90,emissive:C('#1c1204')});
const goldDarkM=new THREE.MeshPhongMaterial({color:C('#8a6a2a'),specular:C('#e8c88a'),shininess:60,emissive:C('#120a02')});
const marbleM=new THREE.MeshPhongMaterial({color:C('#2c2e40'),specular:C('#5a6080'),shininess:45});
const pillarM=new THREE.MeshPhongMaterial({color:C('#383a4e'),specular:C('#3a3c50'),shininess:18});
const rockM=new THREE.MeshStandardMaterial({vertexColors:true,metalness:0,roughness:.94});

// ---------------- canvas textures ----------------
function glyph(g,x,y,s,rot){g.save();g.translate(x,y);g.rotate(rot);g.beginPath();const n=3+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){const t=Math.floor(Math.random()*6);
    if(t===0){g.moveTo(-s,-s);g.lineTo(s,-s);}else if(t===1){g.moveTo(-s*.6,-s);g.lineTo(-s*.6,s);}else if(t===2){g.moveTo(s*.6,-s);g.lineTo(s*.6,s*.4);}
    else if(t===3){g.moveTo(-s,s);g.lineTo(0,0);g.lineTo(s,s);}else if(t===4){g.moveTo(-s,0);g.lineTo(s,0);}else{g.moveTo(s*.35,0);g.arc(0,0,s*.35,0,Math.PI*2);}}
  g.stroke();g.restore();}
function floorTex(){const S=2048,c=document.createElement('canvas'),e=document.createElement('canvas');c.width=c.height=e.width=e.height=S;const g=c.getContext('2d'),ge=e.getContext('2d'),cx=S/2,Rr=S/2;
  g.fillStyle='#1d1f2b';g.fillRect(0,0,S,S);ge.fillStyle='#000';ge.fillRect(0,0,S,S);
  const rings=[.1,.17,.25,.33,.41,.5,.59,.68,.77,.86,.95];
  // individual flagstones, each slightly different
  rings.forEach((r,i)=>{const r0=(i?rings[i-1]:0)*Rr,r1=r*Rr,n=i?8+i*6:1;for(let k=0;k<n;k++){const a0=(k+(i%2)*.5)/n*Math.PI*2,a1=(k+1+(i%2)*.5)/n*Math.PI*2;
    g.beginPath();g.arc(cx,cx,r1,a0,a1);g.arc(cx,cx,r0,a1,a0,true);g.closePath();const sh=Math.floor(24+Math.random()*12);g.fillStyle=`rgb(${sh},${sh+2},${sh+12})`;g.fill();}});
  for(let i=0;i<26000;i++){const x=Math.random()*S,y=Math.random()*S,s=Math.random()*3+1;g.fillStyle=Math.random()<.5?`rgba(255,255,255,${Math.random()*.05})`:`rgba(0,0,0,${Math.random()*.12})`;g.fillRect(x,y,s,s);}
  g.strokeStyle='rgba(6,6,10,.85)';g.lineWidth=5;rings.forEach((r,i)=>{g.beginPath();g.arc(cx,cx,r*Rr,0,Math.PI*2);g.stroke();const r0=(i?rings[i-1]:0)*Rr,n=i?8+i*6:0;
    for(let k=0;k<n;k++){const a=(k+(i%2)*.5)/n*Math.PI*2;g.beginPath();g.moveTo(cx+Math.cos(a)*r0,cx+Math.sin(a)*r0);g.lineTo(cx+Math.cos(a)*r*Rr,cx+Math.sin(a)*r*Rr);g.stroke();}});
  // gold inlay engravings
  const GOLD='#c9a45c';g.strokeStyle=GOLD;ge.strokeStyle='#3a8ab8';
  [[.262,7],[.275,3],[.455,4],[.62,7],[.635,3],[.80,4],[.97,9],[.985,3]].forEach(([r,w])=>{g.lineWidth=w;g.beginPath();g.arc(cx,cx,r*Rr,0,Math.PI*2);g.stroke();});
  const star=(ctx,r,n,skip,w)=>{ctx.lineWidth=w;ctx.beginPath();for(let i=0;i<=n;i++){const a=(i*skip)/n*Math.PI*2-Math.PI/2,x=cx+Math.cos(a)*r*Rr,y=cx+Math.sin(a)*r*Rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();};
  star(g,.455,12,5,5);star(g,.262,8,3,4);star(ge,.455,12,5,6);
  for(let k=0;k<24;k++){const a=k/24*Math.PI*2;g.lineWidth=k%2?3:6;g.beginPath();g.moveTo(cx+Math.cos(a)*.635*Rr,cx+Math.sin(a)*.635*Rr);g.lineTo(cx+Math.cos(a)*.80*Rr,cx+Math.sin(a)*.80*Rr);g.stroke();}
  // glowing channels and rune bands
  ge.lineWidth=7;[[.268],[.627],[.976]].forEach(([r])=>{ge.beginPath();ge.arc(cx,cx,r*Rr,0,Math.PI*2);ge.stroke();});
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;ge.lineWidth=6;ge.beginPath();ge.moveTo(cx+Math.cos(a)*.28*Rr,cx+Math.sin(a)*.28*Rr);ge.lineTo(cx+Math.cos(a)*.61*Rr,cx+Math.sin(a)*.61*Rr);ge.stroke();}
  [[.71,64,22],[.36,40,16],[.90,96,18]].forEach(([r,n,s])=>{for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=cx+Math.cos(a)*r*Rr,y=cx+Math.sin(a)*r*Rr;g.lineWidth=3.2;g.strokeStyle=GOLD;glyph(g,x,y,s,a+Math.PI/2);
    if(k%3===0){ge.lineWidth=4;ge.strokeStyle='#5ab0e0';glyph(ge,x,y,s,a+Math.PI/2);}}});
  const half=cv=>{const h=document.createElement('canvas');h.width=h.height=1024;h.getContext('2d').drawImage(cv,0,0,1024,1024);return h;};const map=new THREE.CanvasTexture(half(c)),em=new THREE.CanvasTexture(half(e));map.colorSpace=em.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=em.anisotropy=4;return{map,em};}
function ringTex(){const W=2048,H=64,c=document.createElement('canvas'),e=document.createElement('canvas');c.width=e.width=W;c.height=e.height=H;const g=c.getContext('2d'),ge=e.getContext('2d');
  g.fillStyle='#d8b062';g.fillRect(0,0,W,H);ge.fillStyle='#000';ge.fillRect(0,0,W,H);g.fillStyle='#8a6a2a';g.fillRect(0,4,W,3);g.fillRect(0,H-7,W,3);
  for(let k=0;k<48;k++){const x=(k+.5)/48*W;g.strokeStyle='#5a4418';g.lineWidth=3;glyph(g,x,H/2,13,0);ge.strokeStyle='#7ad8ff';ge.lineWidth=4;glyph(ge,x,H/2,13,0);}
  const m=new THREE.CanvasTexture(c),em=new THREE.CanvasTexture(e);m.colorSpace=em.colorSpace=THREE.SRGBColorSpace;m.wrapS=em.wrapS=THREE.RepeatWrapping;return{m,em};}

// ---------------- the island ----------------
const ISL=140;
const lobeP=[R()*6,R()*6,R()*6];
const outline=a=>ISL*(1+.06*Math.sin(a*3+lobeP[0])+.04*Math.sin(a*5+lobeP[1])+.025*Math.sin(a*9+lobeP[2]));
(function buildIsland(){
  const N=220,rings=[];const depth=40,L=18;   /* 원래 170 → 위층이라 얕게 (밑을 지나는 가운데층 시야) */
  for(let i=0;i<=L;i++){const t=i/L,y=-1.5-Math.pow(t,1.15)*depth,sc=i===0?1:Math.max(.03,Math.pow(1-t,.85)*(1-.12*t)),off=V(Math.sin(t*2.1)*15*t,0,Math.cos(t*1.7)*12*t);rings.push({y,sc,off,t});}
  const pos=[],col=[],idx=[];const top=C('#3a3446'),mid=C('#262232'),bot=C('#100e16'),vein=C('#c9a45c');
  rings.forEach((rg,i)=>{for(let k=0;k<N;k++){const a=k/N*Math.PI*2,nz=fbm2(Math.cos(a)*3+7,rg.t*6)*2-1,nz2=fbm2(a*4,rg.t*14);let r=outline(a)*rg.sc*(1+(i?.14:0)*nz)+(i?(nz2-.5)*6*rg.sc:0);
    pos.push(rg.off.x+Math.cos(a)*r,rg.y+(i?(nz2-.5)*2:0),rg.off.z+Math.sin(a)*r);
    const c=top.clone().lerp(mid,clamp(rg.t*2,0,1)).lerp(bot,clamp(rg.t*1.4-.4,0,1));const s=.75+.5*nz2;c.multiplyScalar(s);col.push(c.r,c.g,c.b);}});
  for(let i=0;i<L;i++)for(let k=0;k<N;k++){const a=i*N+k,b=i*N+(k+1)%N,c=(i+1)*N+k,d=(i+1)*N+(k+1)%N;idx.push(a,b,d,a,d,c);}
  const tip=pos.length/3;pos.push(rings[L].off.x,rings[L].y-4,rings[L].off.z);col.push(bot.r,bot.g,bot.b);for(let k=0;k<N;k++)idx.push(L*N+k,L*N+(k+1)%N,tip);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.Mesh(g,rockM);m.receiveShadow=true;root.add(m);
  // top surface beyond the sacred floor
  const sh=new THREE.Shape();for(let k=0;k<N;k++){const a=k/N*Math.PI*2,r=outline(a);k?sh.lineTo(Math.cos(a)*r,-Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,-Math.sin(a)*r);}
  const tg=new THREE.ExtrudeGeometry(sh,{depth:1.5,bevelEnabled:true,bevelThickness:.5,bevelSize:.8,bevelSegments:3,curveSegments:1});tg.rotateX(-Math.PI/2);tg.translate(0,-2,0);
  const tm=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({color:C('#2a2836'),roughness:.8,metalness:.05}));tm.receiveShadow=true;root.add(tm);
  // luminous gold strata bands wrapping the cliff
  [3,6,10].forEach((ri,j)=>{const rg=rings[ri],pts=[];for(let k=0;k<64;k++){const a=k/64*Math.PI*2,r=outline(a)*rg.sc*1.012+.3;pts.push(V(rg.off.x+Math.cos(a)*r,rg.y+Math.sin(a*3+j)*.8,rg.off.z+Math.sin(a)*r));}
    const tb=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),256,.22,5,true),new THREE.MeshBasicMaterial({color:j===1?'#ffd27a':'#c9a45c'}));root.add(tb);});
  // hanging stone spires beneath
  for(let k=0;k<20;k++){const a=R()*Math.PI*2,ri=Math.floor(rnd(3,12)),rg=rings[ri],r=outline(a)*rg.sc*rnd(.3,.85),Ls=rnd(6,14),rs=rnd(3,6);
    const cg=new THREE.ConeGeometry(rs,Ls,10,4);const p=cg.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),f=1+(fbm2(p.getX(i)*.7+k,y*.3)-.5)*.5;p.setX(i,p.getX(i)*f);p.setZ(i,p.getZ(i)*f);}cg.computeVertexNormals();
    const cm=new THREE.Mesh(cg,new THREE.MeshStandardMaterial({color:C('#1a1722'),roughness:.9}));cm.rotation.x=Math.PI;cm.position.set(rg.off.x+Math.cos(a)*r,rg.y-Ls/2+1,rg.off.z+Math.sin(a)*r);root.add(cm);
    if(k%3===0){const gl=glow('#ffcf7a',3,.6);gl.position.copy(cm.position).add(V(0,-Ls/2,0));root.add(gl);}}
})();

// ---------------- sacred floor ----------------
const FLOOR_R=44;
{const t=floorTex();const fm=new THREE.MeshStandardMaterial({map:t.map,emissiveMap:t.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.3,roughness:.55,metalness:0});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(FLOOR_R,160),fm);floor.rotation.x=-Math.PI/2;floor.position.y=.06;floor.receiveShadow=true;root.add(floor);
  anim.push(t=>{fm.emissiveIntensity=1.05+Math.sin(t*1.1)*.3;});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(FLOOR_R+.25,.35,8,200),goldM);rim.rotation.x=Math.PI/2;rim.position.y=.12;root.add(rim);}

// ---------------- central dais (3 octagonal tiers, chamfered, gold trim, stairs) ----------------
function octShape(r){const s=new THREE.Shape();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}return s;}
const tiers=[[11,0,1.3],[8,1.3,1.3],[5,2.6,1.3]];
tiers.forEach(([r,y,h])=>{const g=new THREE.ExtrudeGeometry(octShape(r),{depth:h-.3,bevelEnabled:true,bevelThickness:.15,bevelSize:.25,bevelSegments:3});g.rotateX(-Math.PI/2);g.translate(0,y+.15,0);
  const m=new THREE.Mesh(g,marbleM);m.castShadow=m.receiveShadow=true;root.add(m);
  const tr=new THREE.Mesh(new THREE.TorusGeometry(r+.22,.13,6,8),goldM);tr.rotation.set(Math.PI/2,0,Math.PI/8);tr.position.y=y+h;root.add(tr);
  const tb=new THREE.Mesh(new THREE.TorusGeometry(r+.3,.08,6,8),goldDarkM);tb.rotation.set(Math.PI/2,0,Math.PI/8);tb.position.y=y+.35;root.add(tb);});
for(let s=0;s<4;s++){const a=s/4*Math.PI*2;for(let k=0;k<3;k++){const w=4.2-k*.4,st=new THREE.Mesh(new THREE.BoxGeometry(w,.42,1.1),marbleM),d=11.6-k*1.0+(tiers[0][0]-11);
  st.position.set(Math.cos(a)*(d+.4),.21+k*.43,Math.sin(a)*(d+.4));st.rotation.y=-a+Math.PI/2;st.castShadow=st.receiveShadow=true;root.add(st);}}
// braziers on the lower tier corners
for(let i=0;i<8;i++){if(i%2===0)continue;const a=i/8*Math.PI*2+Math.PI/8,p=V(Math.cos(a)*9.6,1.3,Math.sin(a)*9.6);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.75,.35,.6,16,1,true),goldM);bowl.position.copy(p).add(V(0,1.3,0));root.add(bowl);
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.14,.22,1.1,10),goldDarkM);st.position.copy(p).add(V(0,.55,0));root.add(st);
  const fl=glow('#7ad8ff',3.2,.85);fl.position.copy(p).add(V(0,1.8,0));root.add(fl);const fl2=glow('#ffffff',1.2,.9);fl2.position.copy(fl.position);root.add(fl2);
  const ph=R()*6;anim.push(t=>{const k=.85+.15*Math.sin(t*9+ph)+.08*Math.sin(t*23+ph);fl.scale.set(3.2*k,3.8*k,1);});}

// ---------------- colonnade (16 fluted pillars, some ruined) ----------------
const COL_R=48;
function fluted(rb,rt,h){const g=new THREE.CylinderGeometry(rt,rb,h,32,4,false);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z);if(r<.01)continue;const f=1-.045*Math.pow(Math.abs(Math.cos(a*8)),.6);p.setX(i,x*f);p.setZ(i,z*f);}g.computeVertexNormals();return g;}
const tops=[];
for(let i=0;i<16;i++){const a=i/16*Math.PI*2,x=Math.cos(a)*COL_R,z=Math.sin(a)*COL_R,ruined=(i%5===2)||(i===9),H=ruined?rnd(6,12):22;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-a;root.add(g);
  const base=new THREE.Mesh(new THREE.ExtrudeGeometry((()=>{const s=new THREE.Shape();s.moveTo(-1.9,-1.9);s.lineTo(1.9,-1.9);s.lineTo(1.9,1.9);s.lineTo(-1.9,1.9);return s;})(),{depth:1.2,bevelEnabled:true,bevelThickness:.15,bevelSize:.2,bevelSegments:2}),marbleM);
  base.geometry.rotateX(-Math.PI/2);base.position.y=.15;base.castShadow=base.receiveShadow=true;g.add(base);
  const ring1=new THREE.Mesh(new THREE.TorusGeometry(1.45,.16,6,24),goldM);ring1.rotation.x=Math.PI/2;ring1.position.y=1.65;g.add(ring1);
  const shaft=new THREE.Mesh(fluted(1.35,1.2,H),pillarM);shaft.position.y=1.5+H/2;shaft.castShadow=shaft.receiveShadow=true;g.add(shaft);
  if(!ruined){const r2=new THREE.Mesh(new THREE.TorusGeometry(1.3,.14,6,24),goldM);r2.rotation.x=Math.PI/2;r2.position.y=1.5+H-.6;g.add(r2);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.3,1.1,24),marbleM);cap.position.y=1.5+H+.55;cap.castShadow=true;g.add(cap);
    const ab=new THREE.Mesh(new THREE.BoxGeometry(4.2,.8,4.2),marbleM);ab.position.y=1.5+H+1.5;ab.castShadow=true;g.add(ab);
    const gb=new THREE.Mesh(new THREE.BoxGeometry(4.3,.14,4.3),goldM);gb.position.y=1.5+H+1.1;g.add(gb);
    const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.7,0),new THREE.MeshBasicMaterial({color:'#9adfff'}));orb.position.y=1.5+H+3.4;g.add(orb);const og=glow('#7ad0ff',4.5,.5);orb.add(og);
    const ph=R()*6;anim.push(t=>{orb.rotation.y=t*.9+ph;orb.position.y=1.5+H+3.4+Math.sin(t*1.3+ph)*.25;});tops.push({i,y:1.5+H+1.9});}
  else{const jag=new THREE.Mesh(new THREE.ConeGeometry(1.3,1.6,12,1),pillarM);jag.position.y=1.5+H+.4;jag.rotation.z=.3;g.add(jag);
    for(let k=0;k<2;k++){const drum=new THREE.Mesh(fluted(1.3,1.3,rnd(2.5,4)),pillarM);drum.rotation.set(Math.PI/2,0,rnd(-.6,.6));drum.position.set(rnd(-2,2),1.3,rnd(3,6)*(k?1:-1)*.6+3.5);drum.castShadow=drum.receiveShadow=true;g.add(drum);}}}
// lintels between neighbouring intact pillars
tops.forEach(o=>{const n=tops.find(q=>q.i===(o.i+1)%16);if(!n)return;const a0=o.i/16*Math.PI*2,a1=n.i/16*Math.PI*2,p0=V(Math.cos(a0)*COL_R,o.y+.6,Math.sin(a0)*COL_R),p1=V(Math.cos(a1)*COL_R,o.y+.6,Math.sin(a1)*COL_R),mid=p0.clone().lerp(p1,.5),L=p0.distanceTo(p1);
  const lin=new THREE.Mesh(new THREE.BoxGeometry(L+3.6,1.3,2.6),marbleM);lin.position.copy(mid);lin.lookAt(p1);lin.rotateY(Math.PI/2);lin.castShadow=true;root.add(lin);
  const lg=new THREE.Mesh(new THREE.BoxGeometry(L+3.7,.16,2.7),goldM);lg.position.copy(mid).add(V(0,-.45,0));lg.quaternion.copy(lin.quaternion);root.add(lg);});

// ---------------- the Origin Egg ----------------
const EGG_Y=16;
const egg=new THREE.Group();egg.position.y=EGG_Y;root.add(egg);
const innerMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},
  vertexShader:'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:`uniform float time;varying vec3 vP;varying vec3 vN;varying vec3 vV;float h(float n){return fract(sin(n)*43758.5453);}
  float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(h(n),h(n+1.),f.x),mix(h(n+57.),h(n+58.),f.x),f.y),mix(mix(h(n+113.),h(n+114.),f.x),mix(h(n+170.),h(n+171.),f.x),f.y),f.z);}
  float fb(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n3(p);p*=2.07;a*=.5;}return v;}
  void main(){vec3 q=vP*.75;float a=time*.18;q.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*q.xz;
   float w=fb(q*1.3+time*.08);float n=fb(q+vec3(w*1.8,w,-w)+time*.05);
   vec3 c=mix(vec3(.02,.015,.07),vec3(.22,.10,.48),smoothstep(.3,.58,n));
   c=mix(c,vec3(.25,.75,1.),smoothstep(.55,.74,n));
   c+=vec3(1.,.80,.42)*pow(smoothstep(.66,.9,n),3.)*1.4;
   float core=pow(max(0.,1.-length(vP)/4.4),3.);c+=vec3(1.,.9,.7)*core*.6;
   float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.4);c=c*(1.-f*.4)+vec3(.55,.85,1.)*f*.75;
   gl_FragColor=vec4(c,1.);}`});
const inner=new THREE.Mesh(new THREE.SphereGeometry(4.4,48,32),innerMat);inner.scale.y=1.34;egg.add(inner);
const shellMat=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float time;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.);float band=.5+.5*sin(vP.y*3.-time*1.2);vec3 c=mix(vec3(.45,.8,1.),vec3(1.,.85,.55),band*.4);gl_FragColor=vec4(c*f*.9,f*.9);}'});
const shell=new THREE.Mesh(new THREE.SphereGeometry(4.75,48,32),shellMat);shell.scale.y=1.34;egg.add(shell);
const halo1=glow('#8ad0ff',28,.3);egg.add(halo1);const halo2=glow('#ffe0a0',12,.32);egg.add(halo2);
const eggLight={intensity:2.6};   /* 알 빛: 실제 조명 대신 이 섬 칠(litOf)에서 계산 */
// golden cradle: four curved arms rising from the top tier
for(let k=0;k<4;k++){const a=k/4*Math.PI*2+Math.PI/4,pts=[V(Math.cos(a)*4,3.9,Math.sin(a)*4),V(Math.cos(a)*6.4,8,Math.sin(a)*6.4),V(Math.cos(a)*6.6,EGG_Y-2,Math.sin(a)*6.6),V(Math.cos(a)*4.6,EGG_Y+3.2,Math.sin(a)*4.6),V(Math.cos(a)*2.6,EGG_Y+5.8,Math.sin(a)*2.6)];
  const arm=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,.36,8,false),goldM);arm.castShadow=true;root.add(arm);
  const tip=new THREE.Mesh(new THREE.OctahedronGeometry(.45,0),new THREE.MeshBasicMaterial({color:'#ffe2a0'}));tip.position.copy(pts[4]);root.add(tip);}
const cr=new THREE.Mesh(new THREE.TorusGeometry(4.05,.3,10,96),goldM);cr.rotation.x=Math.PI/2;cr.position.y=3.95;root.add(cr);
// three engraved gyroscope seal rings
const rt=ringTex();
const gyro=[8.4,10.4,12.4].map((r,k)=>{const g=new THREE.Group();egg.add(g);
  const geo=new THREE.TorusGeometry(r,.42,8,160);const m=new THREE.MeshPhongMaterial({map:rt.m,emissiveMap:rt.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.4,specular:C('#ffe8b0'),shininess:90});
  rt.m.repeat.set(2+k,1);rt.em.repeat.set(2+k,1);const ring=new THREE.Mesh(geo,m);ring.castShadow=true;g.add(ring);
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2,gem=new THREE.Mesh(new THREE.OctahedronGeometry(.42,0),new THREE.MeshBasicMaterial({color:k===1?'#ffe2a0':'#9adfff'}));gem.position.set(Math.cos(a)*r,Math.sin(a)*r,0);gem.scale.set(1,1.6,1);g.add(gem);}
  return g;});
// pillar of light rising from the egg: layered soft volumetric shafts + spiralling ribbons + rising sparks
const NOISE3=`float h(float n){return fract(sin(n)*43758.5453);}
 float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(h(n),h(n+1.),f.x),mix(h(n+57.),h(n+58.),f.x),f.y),mix(mix(h(n+113.),h(n+114.),f.x),mix(h(n+170.),h(n+171.),f.x),f.y),f.z);}
 float fb(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n3(p);p*=2.05;a*=.5;}return v;}`;
const SHAFT_V='varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const SHAFT_F=`uniform sampler2D nS;uniform float time;uniform vec3 c1;uniform vec3 c2;uniform float op;uniform float sp;uniform float tl;varying vec2 vUv;varying vec3 vN;varying vec3 vV;${NOISE3}
 void main(){float f=abs(dot(normalize(vN),normalize(vV)));float core=pow(f,2.2);
  float n=texture2D(nS,vec2(vUv.x,(vUv.y*tl-time*sp)/8.)).r;float st=smoothstep(.42,.82,n);
  float fade=smoothstep(0.,.06,vUv.y)*pow(1.-vUv.y,1.4);
  vec3 col=mix(c1,c2,st);float a=core*fade*(.22+st*.9)*op;gl_FragColor=vec4(col*a,a);}`;
function shaft(rb,rt,H,y,c1,c2,op,sp,tl){const m=new THREE.ShaderMaterial({uniforms:{nS:{value:noiseTex()[0]},time:{value:0},c1:{value:new THREE.Color(c1)},c2:{value:new THREE.Color(c2)},op:{value:op},sp:{value:sp},tl:{value:tl}},
  vertexShader:SHAFT_V,fragmentShader:SHAFT_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false});
  const me=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,H,48,24,true),m);me.position.y=y+H/2;root.add(me);anim.push(t=>{m.uniforms.time.value=t;});return me;}
shaft(1.4,2.2,150,EGG_Y,'#bfe8ff','#fff1c8',1.1,1.2,9);
shaft(3.2,5.5,120,EGG_Y-2,'#4a9adf','#ffd890',.55,.7,6);
shaft(7,13,90,EGG_Y-3,'#2a5a9f','#8a6ac0',.22,.35,4);
// motes spiralling into the egg
{const N=420,g=new THREE.BufferGeometry(),p=new Float32Array(N*3),c=new Float32Array(N*3),meta=[];
  for(let i=0;i<N;i++){meta.push([R()*Math.PI*2,R(),rnd(.6,1.4)]);const w=R()<.5;c.set(w?[1,.85,.55]:[.55,.85,1],i*3);}
  g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
  const pts=new THREE.Points(g,new THREE.PointsMaterial({size:.7*K,map:dot,vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;root.add(pts);
  anim.push((t,dt)=>{for(let i=0;i<N;i++){const m=meta[i];m[1]=(m[1]+dt*.06*m[2])%1;const u=m[1],r=40*(1-u)+3.6,a=m[0]+u*9;p[i*3]=Math.cos(a)*r;p[i*3+1]=.6+u*u*(EGG_Y-.6)+Math.sin(u*20+m[0])*.4;if(r<5){}p[i*3+2]=Math.sin(a)*r;}g.attributes.position.needsUpdate=true;});}
// low drifting mist over the arena
for(let k=0;k<26;k++){const a=R()*Math.PI*2,d=rnd(14,44),s=glow(k%3?'#3a4a8a':'#6a4a8a',rnd(16,30),.06);s.position.set(Math.cos(a)*d,rnd(1,3),Math.sin(a)*d);root.add(s);
  const ph=R()*6,b=s.position.clone();anim.push(t=>{s.position.x=b.x+Math.sin(t*.12+ph)*3;s.position.z=b.z+Math.cos(t*.1+ph)*3;});}
// suspended ruin fragments (frozen in the egg's field)
{const frag=new THREE.Group();root.add(frag);
  for(let k=0;k<12;k++){const a=R()*Math.PI*2,d=rnd(18,40),y=rnd(20,34),g=new THREE.Group();g.position.set(Math.cos(a)*d,y,Math.sin(a)*d);g.rotation.set(rnd(-.6,.6),R()*3,rnd(-.6,.6));frag.add(g);
    if(k%2){const h=rnd(2.5,4.5),m=new THREE.Mesh(fluted(1.3,1.3,h),pillarM);m.castShadow=true;g.add(m);[-1,1].forEach(sg=>{const r=new THREE.Mesh(new THREE.TorusGeometry(1.32,.12,8,40),goldM);r.rotation.x=Math.PI/2;r.position.y=sg*h/2;g.add(r);});}
    else{const w=rnd(2,3.4),s=new THREE.Shape();s.moveTo(-w,-w*.6);s.lineTo(w,-w*.6);s.lineTo(w*.8,w*.6);s.lineTo(-w*.9,w*.5);const m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:w*.8,bevelEnabled:true,bevelThickness:.2,bevelSize:.2,bevelSegments:2}),marbleM);m.castShadow=true;g.add(m);
      const gb=new THREE.Mesh(new THREE.BoxGeometry(w*1.7,.14,.1),goldM);gb.position.set(0,0,w*.8+.21);g.add(gb);}
    const ph=R()*6,by=y;anim.push(t=>{g.position.y=by+Math.sin(t*.4+ph)*.6;g.rotation.y+=.0008;});}
  anim.push(t=>{frag.rotation.y=t*.015;});}

// ---------------- light cascades pouring off the island edge (curved, layered, with falling sparks) ----------------
const FALL_F=`uniform sampler2D nF;uniform float time;uniform float op;uniform vec3 c1;uniform vec3 c2;varying vec2 vUv;${NOISE3}
 void main(){float e=pow(sin(vUv.x*3.14159),1.6);vec3 q=vec3(vUv.x*5.,vUv.y*10.+time*1.3,0.);float s=texture2D(nF,q.xy/16.).r,s2=texture2D(nF,(q.xy*2.3+3.)/16.).r;
  float st=smoothstep(.42,.8,s)*.8+smoothstep(.55,.85,s2)*.5;float fade=smoothstep(0.,.55,vUv.y)*smoothstep(1.,.96,vUv.y);
  vec3 col=mix(c1,c2,clamp(st,0.,1.));float a=e*fade*(.12+st*.6)*op;gl_FragColor=vec4(col*a,a);}`;
function fallSheet(W,L,curl,op,c1,c2){const nu=10,nv=60,pos=[],uv=[],idx=[];
  for(let j=0;j<=nv;j++){const v=j/nv;for(let i=0;i<=nu;i++){const u=i/nu,spread=1+v*1.4;pos.push((u-.5)*W*spread,-L*Math.pow(v,1.15),curl*Math.sqrt(v)+1.6);uv.push(u,1-v);}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const m=new THREE.ShaderMaterial({uniforms:{nF:{value:noiseTex()[1]},time:{value:0},op:{value:op},c1:{value:new THREE.Color(c1)},c2:{value:new THREE.Color(c2)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:FALL_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  anim.push(t=>{m.uniforms.time.value=t;});return new THREE.Mesh(g,m);}
for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.35,r=outline(a)+.4,g=new THREE.Group();g.position.set(Math.cos(a)*r,-.2,Math.sin(a)*r);g.rotation.y=Math.atan2(Math.cos(a),Math.sin(a));root.add(g);
  g.add(fallSheet(5,72,5,1.2,'#5aa8ff','#fff0c8'));const wide=fallSheet(11,64,7,.45,'#2a5aaf','#c8a0ff');wide.position.z=.4;g.add(wide);
  const lip=glow('#ffe0a0',8,.35);lip.position.set(0,0,1.6);g.add(lip);
  for(let j=0;j<3;j++){const ms=glow('#4a7adf',rnd(18,30),.1);ms.position.set(rnd(-4,4),-58-j*6,rnd(6,10));g.add(ms);}
  const N=90,pg=new THREE.BufferGeometry(),pp=new Float32Array(N*3),meta=[];for(let i=0;i<N;i++)meta.push([rnd(-1,1),R(),rnd(.6,1.4)]);pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  const sp=new THREE.Points(pg,new THREE.PointsMaterial({size:.8*K,map:dot,color:'#dff0ff',transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));sp.frustumCulled=false;g.add(sp);
  anim.push((t,dt)=>{for(let i=0;i<N;i++){const m=meta[i];m[1]=(m[1]+dt*.22*m[2])%1;const v=m[1];pp[i*3]=m[0]*2.5*(1+v*1.4);pp[i*3+1]=-70*Math.pow(v,1.15);pp[i*3+2]=5*Math.sqrt(v)+1.6+m[0];}pg.attributes.position.needsUpdate=true;});
  /* 바닥까지 잇는 금빛 줄(원본의 빛 길)은 뺌 — 사용자 2026-11-08: 성소 땅 위 십자 줄이 계속 움직여 보임(땅에 너무 붙어 떨림) → 삭제 */}
// =====================================================================
const barkM=new THREE.MeshPhongMaterial({color:C('#2c2432'),specular:C('#1a1a26'),shininess:12});
const leafM=new THREE.MeshPhongMaterial({color:C('#1b4a48'),specular:C('#4a9a90'),shininess:30,emissive:C('#041412'),side:THREE.DoubleSide});
const leafM2=new THREE.MeshPhongMaterial({color:C('#2a2f5a'),specular:C('#6a6ab0'),shininess:30,emissive:C('#060418'),side:THREE.DoubleSide});
const vineM=new THREE.MeshPhongMaterial({color:C('#1e3a32'),specular:C('#2a5a4a'),shininess:16});
const podM=new THREE.MeshBasicMaterial({color:'#7affd0'}),podM2=new THREE.MeshBasicMaterial({color:'#ffb0f0'});
function mergeG(list){let n=0;const arr=list.map(g=>{const q=g.index?g.toNonIndexed():g;if(q.attributes.uv)q.deleteAttribute('uv');if(!q.attributes.normal)q.computeVertexNormals();n+=q.attributes.position.count;return q;});
  const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;arr.forEach(q=>{P.set(q.attributes.position.array,o);N.set(q.attributes.normal.array,o);o+=q.attributes.position.count*3;q.dispose();});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.computeBoundingSphere();return m;}
const BK={};function put(key,geo,pos,rot,scl){const m=new THREE.Matrix4().compose(pos||V(0,0,0),new THREE.Quaternion().setFromEuler(rot||new THREE.Euler()),scl||V(1,1,1));geo.applyMatrix4(m);(BK[key]=BK[key]||[]).push(geo);}
function flushBK(mats){Object.keys(BK).forEach(k=>{if(!BK[k].length)return;const me=new THREE.Mesh(mergeG(BK[k]),mats[k]);root.add(me);BK[k]=[];});}
const qTo=d=>new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,d.clone().normalize()));

// generic floating island (same sculpting as the sanctum, smaller)
function floatIsland(cx,cy,cz,R0,depth){const ph=[R()*6,R()*6,R()*6],ex=rnd(.8,1.25),rot=R()*6.28;
  const ol=a=>{const c=Math.cos(a-rot),s=Math.sin(a-rot),e=1/Math.sqrt(c*c/(ex*ex)+s*s*ex*ex);return R0*e*(1+.09*Math.sin(a*3+ph[0])+.05*Math.sin(a*5+ph[1])+.03*Math.sin(a*9+ph[2]));};
  const N=84,L=10,rings=[];for(let i=0;i<=L;i++){const t=i/L;rings.push({t,y:cy-1.4-Math.pow(t,1.1)*depth,sc:i?Math.max(.04,Math.pow(1-t,.85)):1,off:V(Math.sin(t*2+ph[0])*R0*.14*t,0,Math.cos(t*1.6+ph[1])*R0*.12*t)});}
  const pos=[],col=[],idx=[],top=C('#3a3446'),mid=C('#262232'),bot=C('#100e16');
  rings.forEach((rg,i)=>{for(let k=0;k<N;k++){const a=k/N*Math.PI*2,nz=fbm2(Math.cos(a)*3+cx*.1,rg.t*6+cz*.1)*2-1,nz2=fbm2(a*4+cx,rg.t*14);const r=ol(a)*rg.sc*(1+(i?.15:0)*nz)+(i?(nz2-.5)*2*rg.sc:0);
    pos.push(cx+rg.off.x+Math.cos(a)*r,rg.y+(i?(nz2-.5)*1.6:0),cz+rg.off.z+Math.sin(a)*r);const c=top.clone().lerp(mid,clamp(rg.t*2,0,1)).lerp(bot,clamp(rg.t*1.4-.4,0,1)).multiplyScalar(.75+.5*nz2);col.push(c.r,c.g,c.b);}});
  for(let i=0;i<L;i++)for(let k=0;k<N;k++){const a=i*N+k,b=i*N+(k+1)%N,c=(i+1)*N+k,d=(i+1)*N+(k+1)%N;idx.push(a,b,d,a,d,c);}
  const tip=pos.length/3;pos.push(cx+rings[L].off.x,rings[L].y-3,cz+rings[L].off.z);col.push(bot.r,bot.g,bot.b);for(let k=0;k<N;k++)idx.push(L*N+k,L*N+(k+1)%N,tip);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();root.add(new THREE.Mesh(g,rockM));
  const sh=new THREE.Shape();for(let k=0;k<N;k++){const a=k/N*Math.PI*2,r=ol(a);k?sh.lineTo(Math.cos(a)*r,-Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,-Math.sin(a)*r);}
  const tg=new THREE.ExtrudeGeometry(sh,{depth:1.4,bevelEnabled:true,bevelThickness:.4,bevelSize:.6,bevelSegments:2,curveSegments:1});tg.rotateX(-Math.PI/2);tg.translate(cx,cy-1.8,cz);root.add(new THREE.Mesh(tg,new THREE.MeshStandardMaterial({color:C('#2a2836'),roughness:.82})));
  {const rg=rings[3],pts=[];for(let k=0;k<48;k++){const a=k/48*Math.PI*2,r=ol(a)*rg.sc*1.02+.25;pts.push(V(cx+rg.off.x+Math.cos(a)*r,rg.y+Math.sin(a*3)*.6,cz+rg.off.z+Math.sin(a)*r));}
    root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),160,.18,5,true),new THREE.MeshBasicMaterial({color:'#c9a45c'})));}
  for(let k=0;k<5;k++){const a=R()*6.28,rg=rings[Math.floor(rnd(2,7))],r=ol(a)*rg.sc*rnd(.3,.8),Ls=rnd(6,16)*(R0/25),rs=rnd(1,2.4)*(R0/25);
    put('spire',new THREE.ConeGeometry(rs,Ls,9,3),V(cx+rg.off.x+Math.cos(a)*r,rg.y-Ls/2+1,cz+rg.off.z+Math.sin(a)*r),new THREE.Euler(Math.PI,0,0));}
  return{ol,cx,cy,cz,R0};}
// ================= FOLIAGE: textured, instanced leaves =================
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texOf(c,rep){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
// feathery alien fern frond (base at bottom, tip at top)
function frondTex(cBase,cTip,glowA,glowB){const W=256,H=1024,c=cvs(W,H),e=cvs(W,H),g=c.getContext('2d'),ge=e.getContext('2d');ge.fillStyle='#000';ge.fillRect(0,0,W,H);
  for(let i=0;i<54;i++){const t=i/54,y=H*(1-t)-14,len=W*.47*Math.sin(Math.min(1,t*1.5+.12)*Math.PI*.92)*(1-t*.5);if(len<6)continue;
    for(const sd of[-1,1]){g.save();g.translate(W/2,y);g.rotate(-sd*(.35-.2*t));const gr=g.createLinearGradient(0,0,sd*len,0);gr.addColorStop(0,cBase);gr.addColorStop(1,cTip);g.fillStyle=gr;
      g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*len*.45,-len*.24,sd*len,-len*.34);g.quadraticCurveTo(sd*len*.5,len*.02,0,len*.07);g.closePath();g.fill();
      g.strokeStyle='rgba(180,255,240,.25)';g.lineWidth=1.4;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(sd*len*.5,-len*.13,sd*len*.95,-len*.31);g.stroke();g.restore();
      ge.save();ge.translate(W/2,y);ge.rotate(-sd*(.35-.2*t));if(i%2===0){ge.globalAlpha=.6;ge.fillStyle=i%4?glowA:glowB;ge.beginPath();ge.arc(sd*len*.9,-len*.3,4,0,6.28);ge.fill();ge.globalAlpha=1;}ge.restore();}}
  const mr=g.createLinearGradient(0,H,0,0);mr.addColorStop(0,'#14202a');mr.addColorStop(1,cBase);g.fillStyle=mr;g.beginPath();g.moveTo(W/2-6,H);g.lineTo(W/2+6,H);g.lineTo(W/2+1.5,0);g.lineTo(W/2-1.5,0);g.fill();
  ge.globalAlpha=.55;ge.strokeStyle=glowA;ge.lineWidth=4;ge.beginPath();ge.moveTo(W/2,H);ge.lineTo(W/2,20);ge.stroke();ge.globalAlpha=1;return{map:texOf(c),em:texOf(e)};}
// broad heart-shaped leaf with glowing veins
function broadTex(c1,c2,vein){const S=512,c=cvs(S,S),e=cvs(S,S),g=c.getContext('2d'),ge=e.getContext('2d');ge.fillStyle='#000';ge.fillRect(0,0,S,S);
  const leaf=ctx=>{ctx.beginPath();ctx.moveTo(S/2,S-10);ctx.bezierCurveTo(S*.02,S*.72,S*.08,S*.18,S/2,S*.03);ctx.bezierCurveTo(S*.92,S*.18,S*.98,S*.72,S/2,S-10);ctx.closePath();};
  const gr=g.createRadialGradient(S/2,S*.75,10,S/2,S*.5,S*.55);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;leaf(g);g.fill();
  g.save();leaf(g);g.clip();for(let i=0;i<900;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.04})`;g.fillRect(Math.random()*S,Math.random()*S,3,3);}
  const veins=(ctx,w)=>{ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(S/2,S-10);ctx.lineTo(S/2,S*.06);ctx.stroke();for(let k=1;k<9;k++){const y=S-10-k*S*.1;for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(S/2,y);ctx.quadraticCurveTo(S/2+sd*S*.18,y-S*.06,S/2+sd*S*.36*Math.sin(k/9*Math.PI),y-S*.16);ctx.stroke();}}};
  g.strokeStyle='rgba(10,20,30,.45)';veins(g,5);g.restore();ge.save();leaf(ge);ge.clip();ge.strokeStyle=vein;veins(ge,2.6);ge.restore();return{map:texOf(c),em:texOf(e)};}
function bladeTex(){const c=cvs(32,256),e=cvs(32,256),g=c.getContext('2d'),ge=e.getContext('2d');ge.fillStyle='#000';ge.fillRect(0,0,32,256);
  const gr=g.createLinearGradient(0,256,0,0);gr.addColorStop(0,'#0e1e22');gr.addColorStop(.7,'#1f5a5a');gr.addColorStop(1,'#4ab8a8');g.fillStyle=gr;g.beginPath();g.moveTo(2,256);g.lineTo(30,256);g.lineTo(17,0);g.lineTo(15,0);g.fill();
  const ge2=ge.createLinearGradient(0,60,0,0);ge2.addColorStop(0,'rgba(0,0,0,0)');ge2.addColorStop(1,'#7affd8');ge.fillStyle=ge2;ge.beginPath();ge.moveTo(10,60);ge.lineTo(22,60);ge.lineTo(17,0);ge.lineTo(15,0);ge.fill();return{map:texOf(c),em:texOf(e)};}
function barkTex(){const W=256,H=512,c=cvs(W,H),e=cvs(W,H),g=c.getContext('2d'),ge=e.getContext('2d');g.fillStyle='#2a2232';g.fillRect(0,0,W,H);ge.fillStyle='#000';ge.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){const x=Math.random()*W,w=rnd(2,9);g.strokeStyle=Math.random()<.5?'rgba(10,6,16,.55)':'rgba(90,80,110,.25)';g.lineWidth=w;g.beginPath();g.moveTo(x,0);for(let y=0;y<=H;y+=32)g.lineTo(x+Math.sin(y*.02+i)*6,y);g.stroke();}
  for(let i=0;i<4000;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.15})`;g.fillRect(Math.random()*W,Math.random()*H,2,2);}
  for(let i=0;i<5;i++){const x=Math.random()*W;ge.strokeStyle=i%2?'#3ad8c0':'#a05ad8';ge.lineWidth=2;ge.beginPath();ge.moveTo(x,0);for(let y=0;y<=H;y+=16)ge.lineTo(x+Math.sin(y*.03+i*2)*10,y);ge.stroke();}
  return{map:texOf(c,[1,3]),em:texOf(e,[1,3])};}
// unit geometries
function frondGeo(){const g=new THREE.PlaneGeometry(1,1,1,7),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5;
  p.setXYZ(i,x*(1-.1*t),.32*Math.sin(t*Math.PI*.8)-.6*t*t-Math.abs(x)*.22,t);}g.computeVertexNormals();return g;}
function broadGeo(){const g=new THREE.PlaneGeometry(1,1,3,4),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5;p.setXYZ(i,x,.18*Math.sin(t*Math.PI)-.25*t*t+x*x*.5,t);}g.computeVertexNormals();return g;}
function bladeGeo(){const g=new THREE.PlaneGeometry(1,1,1,3),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),t=p.getY(i)+.5;p.setXYZ(i,x,t,.25*t*t);}g.computeVertexNormals();return g;}
function podGeo(){const pts=[];for(let i=0;i<=7;i++){const t=i/7;pts.push(new THREE.Vector2(Math.sin(t*Math.PI)*(.55-.3*t)+.001,-t*1.6));}return new THREE.LatheGeometry(pts,6);}
const FOL={frondA:[],frondB:[],fern:[],broad:[],broadS:[],blade:[],pod:[],pod2:[]};let FLSPEC=null;
const _q=new THREE.Quaternion();
function inst(kind,pos,rot,scl,col){FOL[kind].push({m:new THREE.Matrix4().compose(pos,_q.setFromEuler(rot).clone(),scl),c:col});}
function flushFoliage(){const fA=frondTex('#0f3d40','#2c8a90','#7affe0','#ff8ae8'),fB=frondTex('#1a1d48','#5a4aa8','#ff9af0','#8ad8ff'),fern=frondTex('#123a2c','#3a9a70','#b0ff9a','#7affe0'),
    br=broadTex('#1a4048','#2a2050','#6affd8'),bl=bladeTex();
  const leafMat=t=>new THREE.MeshPhongMaterial({map:t.map,emissiveMap:t.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:.8,alphaTest:.5,alphaToCoverage:true,side:THREE.DoubleSide,shininess:30,specular:C('#3a5a5a')});
  const spec=FLSPEC={frondA:[frondGeo(),leafMat(fA)],frondB:[frondGeo(),leafMat(fB)],fern:[frondGeo(),leafMat(fern)],broad:[broadGeo(),leafMat(br)],broadS:[broadGeo(),leafMat(br)],blade:[bladeGeo(),leafMat(bl)],
    pod:[podGeo(),new THREE.MeshBasicMaterial({color:'#7affd0'})],pod2:[podGeo(),new THREE.MeshBasicMaterial({color:'#ffa8ee'})]};
  Object.keys(FOL).forEach(k=>{const L=FOL[k];if(!L.length)return;const[g,m]=spec[k];const im=new THREE.InstancedMesh(g,m,L.length);
    L.forEach((o,i)=>{im.setMatrixAt(i,o.m);im.setColorAt(i,o.c||new THREE.Color(1,1,1));});im.frustumCulled=false;im.userData.kind=k;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;root.add(im);});}
const BARK=barkTex();
const barkTexM=new THREE.MeshPhongMaterial({map:BARK.map,emissiveMap:BARK.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:.7,specular:C('#2a2a3a'),shininess:14});
function mergeUV(list){let n=0;const arr=list.map(g=>{const q=g.index?g.toNonIndexed():g;n+=q.attributes.position.count;return q;});const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0,u=0;
  arr.forEach(q=>{P.set(q.attributes.position.array,o);N.set(q.attributes.normal.array,o);U.set(q.attributes.uv.array,u);o+=q.attributes.position.count*3;u+=q.attributes.position.count*2;});
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('uv',new THREE.BufferAttribute(U,2));m.computeBoundingSphere();return m;}
const BARKL=[];function putBark(geo){BARKL.push(geo);}
function flushBark(){if(!BARKL.length)return;const m=new THREE.Mesh(mergeUV(BARKL),barkTexM);m.castShadow=m.receiveShadow=true;root.add(m);}
const tint=(h,k)=>new THREE.Color(h).multiplyScalar(k||1);
// hanging vines with leaves and teardrop glow pods
function vines(I,n,minL,maxL){for(let k=0;k<n;k++){const a=R()*6.28,r=I.ol(a)*.97,x=I.cx+Math.cos(a)*r,z=I.cz+Math.sin(a)*r,L=rnd(minL,maxL);
  const pts=[V(x,I.cy-.6,z)];for(let j=1;j<=6;j++){const t=j/6;pts.push(V(x+Math.cos(a)*(1.5*t)+Math.sin(j*1.7+k)*.9,I.cy-.6-L*t,z+Math.sin(a)*(1.5*t)+Math.cos(j*1.3+k)*.9));}
  const cv=new THREE.CatmullRomCurve3(pts);putBark(new THREE.TubeGeometry(cv,12,rnd(.14,.3),4,false));
  const nl=Math.floor(L/2.2);for(let j=0;j<nl;j++){const q=cv.getPoint(rnd(.05,.95)),yaw=R()*6.28;inst('broadS',q,new THREE.Euler(rnd(.6,1.2),yaw,0,'YXZ'),V(rnd(1,1.8),rnd(1.2,2.2),rnd(1.2,2.2)),tint('#ffffff',rnd(.7,1)));}
  inst(k%3?'pod':'pod2',pts[6].clone(),new THREE.Euler(),V(1,1,1).multiplyScalar(rnd(.7,1.2)));}}
// alien jungle tree: textured twisting trunk, flared roots, layered fern-frond canopy, hanging pods
function alienTree(p,s){const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(V(p.x+Math.sin(t*3+s*4)*1.8*s*t,p.y+t*17*s,p.z+Math.cos(t*2.6+s)*1.8*s*t));}
  const cv=new THREE.CatmullRomCurve3(pts);
  [[0,.4,1.55],[.36,.72,1.1],[.68,1,.7]].forEach(([t0,t1,rr])=>{const sp=[];for(let i=0;i<=6;i++)sp.push(cv.getPoint(t0+(t1-t0)*i/6));putBark(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp),16,rr*s,7,false));});
  for(let k=0;k<7;k++){const a=k/7*6.28+rnd(-.3,.3),b=V(p.x,p.y+2*s,p.z);putBark(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([b,V(p.x+Math.cos(a)*2.4*s,p.y+1.3*s,p.z+Math.sin(a)*2.4*s),V(p.x+Math.cos(a)*4*s,p.y+.2,p.z+Math.sin(a)*4*s),V(p.x+Math.cos(a)*5.6*s,p.y-.3,p.z+Math.sin(a)*5.6*s)]),10,.5*s,5,false));}
  // a few branches carrying secondary crowns
  const top=cv.getPoint(1),kind=R()<.55?'frondA':'frondB',crowns=[top];
  for(let b=0;b<3;b++){const a=b/3*6.28+rnd(-.4,.4),st=cv.getPoint(rnd(.55,.75)),en=st.clone().add(V(Math.cos(a)*5*s,3.5*s,Math.sin(a)*5*s));putBark(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([st,st.clone().lerp(en,.5).add(V(0,1.4*s,0)),en]),10,.4*s,6,false));crowns.push(en);}
  crowns.forEach((c,ci)=>{const big=ci===0,layers=big?[[-.55,13],[-.1,15],[.35,12]]:[[-.35,9],[.25,8]];
    layers.forEach(([pitch,n],li)=>{for(let k=0;k<n;k++){const yaw=k/n*6.28+li*.37+rnd(-.12,.12),L=(big?rnd(10,13.5):rnd(6.5,8.5))*s*(1-li*.08),W=(big?rnd(2.6,3.4):rnd(2,2.6))*s;
      const e=new THREE.Euler(pitch+rnd(-.12,.12),yaw,rnd(-.25,.25),'YXZ');inst(kind,c.clone().add(V(0,rnd(-.4,.4)*s,0)),e,V(W,L,L),tint('#ffffff',rnd(.75,1.05)));
      if(big&&li===1&&k%3===0){const tipL=new THREE.Vector3(0,.32*Math.sin(Math.PI*.8)-.6,1).multiply(V(W,L,L)).applyEuler(e).add(c);
        putBark(new THREE.CylinderGeometry(.04*s,.04*s,3*s,4).translate(tipL.x,tipL.y-1.5*s,tipL.z));inst(k%2?'pod':'pod2',tipL.clone().add(V(0,-3*s,0)),new THREE.Euler(),V(s,s,s).multiplyScalar(rnd(.6,.9)));
        if(k%6===0){const sp=glow(k%4?'#7affd0':'#ffb0f0',4*s,.4);sp.position.copy(tipL).add(V(0,-3.8*s,0));root.add(sp);}}}});});}
function fernCluster(p,s,kind){const n=7+Math.floor(R()*4);for(let k=0;k<n;k++){const yaw=k/n*6.28+rnd(-.2,.2);inst(kind||'fern',p.clone(),new THREE.Euler(-rnd(.55,1.0),yaw,rnd(-.2,.2),'YXZ'),V(rnd(1.4,2)*s,rnd(3.5,6)*s,rnd(3.5,6)*s),tint('#ffffff',rnd(.7,1.05)));}}
function broadCluster(p,s){const n=4+Math.floor(R()*3);for(let k=0;k<n;k++){const yaw=k/n*6.28+rnd(-.3,.3);inst('broad',p.clone().add(V(0,.2,0)),new THREE.Euler(-rnd(.3,.75),yaw,0,'YXZ'),V(rnd(3,4.5)*s,1,rnd(4,6)*s).setY(rnd(4,6)*s),tint('#ffffff',rnd(.75,1.05)));}}
function grassPatch(p,r,n){for(let k=0;k<n;k++){const a=R()*6.28,d=Math.sqrt(R())*r,h=rnd(.8,2.4);inst('blade',V(p.x+Math.cos(a)*d,p.y,p.z+Math.sin(a)*d),new THREE.Euler(rnd(-.25,.25),R()*6.28,rnd(-.25,.25),'YXZ'),V(rnd(.18,.3),h,h),tint('#ffffff',rnd(.7,1.1)));}}
// engraved gold ring gate with a shimmering portal
const PORTAL_F=`uniform float time;varying vec2 vUv;${NOISE3}
 void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec2 d=p/(r+1e-4);float n=fb(vec3(d*1.6+r*1.5,time*.25-r*1.4));float sw=fb(vec3(d*2.2,r*4.-time*.8));
  float edge=smoothstep(1.,.8,r);float rim=smoothstep(.6,.98,r)*edge;vec3 c=mix(vec3(.25,.55,1.),vec3(1.,.86,.55),smoothstep(.45,.8,sw));
  float a=edge*(.05+rim*.5+smoothstep(.55,.85,n)*.22);gl_FragColor=vec4(c*a,a);}`;
function ringGate(pos,r,face){const g=new THREE.Group();g.position.copy(pos);root.add(g);g.lookAt(pos.clone().add(face));
  const rm=new THREE.MeshPhongMaterial({map:rt.m,emissiveMap:rt.em,emissive:new THREE.Color(1,1,1),emissiveIntensity:1.3,specular:C('#ffe8b0'),shininess:90});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.6,16,180),rm);g.add(ring);
  const o=new THREE.Mesh(new THREE.TorusGeometry(r+1.3,.2,8,180),goldM);g.add(o);
  for(let k=0;k<12;k++){const a=k/12*Math.PI*2,sp=new THREE.Mesh(new THREE.ConeGeometry(.35,k%3?1.6:3,8),goldM);sp.position.set(Math.cos(a)*(r+1.6+(k%3?.8:1.5)),Math.sin(a)*(r+1.6+(k%3?.8:1.5)),0);sp.rotation.z=a-Math.PI/2;g.add(sp);}
  for(let k=0;k<4;k++){const a=k/4*Math.PI*2,gm=new THREE.Mesh(new THREE.OctahedronGeometry(.6,0),new THREE.MeshBasicMaterial({color:k%2?'#9adfff':'#ffe2a0'}));gm.position.set(Math.cos(a)*r,Math.sin(a)*r,.7);gm.scale.y=1.6;g.add(gm);}
  const pm=new THREE.ShaderMaterial({uniforms:{time:{value:R()*10}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:PORTAL_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  const portal=new THREE.Mesh(new THREE.CircleGeometry(r-.4,72),pm);g.add(portal);const t0=pm.uniforms.time.value;
  anim.push(t=>{pm.uniforms.time.value=t0+t;ring.rotation.z=t*.12;});return g;}
// ancient obelisk
function obelisk(p,h,glyphCol,s){s=s||1;const w=2.6*s;put('marble',new THREE.BoxGeometry(w*1.9,1.4*s,w*1.9),V(p.x,p.y+.7*s,p.z));put('marble',new THREE.CylinderGeometry(w*.48,w*.72,h,4,1),V(p.x,p.y+1.4*s+h/2,p.z),new THREE.Euler(0,Math.PI/4,0));
  put('marble',new THREE.ConeGeometry(w*.55,3*s,4),V(p.x,p.y+1.4*s+h+1.5*s,p.z),new THREE.Euler(0,Math.PI/4,0));
  [.1,.66].forEach(f=>{const rr=w*(.72-(.24*f));put('gold',new THREE.CylinderGeometry(rr*1.06,rr*1.06,.35*s,4,1),V(p.x,p.y+1.4*s+h*f,p.z),new THREE.Euler(0,Math.PI/4,0));});
  for(let fc=0;fc<4;fc++){const a=fc*Math.PI/2,nx=Math.sin(a),nz=Math.cos(a);for(let g=0;g<9;g++){const f=.18+g*.05,rr=w*(.72-.24*f)*.71+.02;put('glyph',new THREE.BoxGeometry(rnd(.3,.9)*s,.16*s,.06),V(p.x+nx*rr,p.y+1.4*s+h*f,p.z+nz*rr),new THREE.Euler(0,a,0));}}
  const cap=new THREE.Mesh(new THREE.OctahedronGeometry(1.2*s,0),new THREE.MeshBasicMaterial({color:glyphCol}));cap.position.set(p.x,p.y+h+7*s,p.z);cap.scale.y=1.6;root.add(cap);const cg=glow(glyphCol,9*s,.45);cap.add(cg);
  const by=cap.position.y,ph=R()*6;anim.push(t=>{cap.rotation.y=t*.7;cap.position.y=by+Math.sin(t+ph)*.6;});return V(p.x,p.y+h+7*s,p.z);}
// flowing ley line (energy conduit) between two points
const LEY_F=`uniform float time;uniform vec3 c;varying vec2 vUv;void main(){float pulse=pow(.5+.5*sin(vUv.x*60.-time*4.),6.);float base=.18+pulse*.9;float e=1.-abs(vUv.y-.5)*2.;gl_FragColor=vec4(c*base*e,base*e);}`;
function ley(a,b,lift,col){const mid=a.clone().lerp(b,.5).add(V(0,lift,0)),cv=new THREE.CatmullRomCurve3([a,a.clone().lerp(mid,.5).add(V(0,lift*.3,0)),mid,b.clone().lerp(mid,.5).add(V(0,lift*.3,0)),b]);
  const m=new THREE.ShaderMaterial({uniforms:{time:{value:0},c:{value:new THREE.Color(col)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:LEY_F,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  root.add(new THREE.Mesh(new THREE.TubeGeometry(cv,240,.45,8,false),m));const m2=m.clone();m2.uniforms=THREE.UniformsUtils.clone(m.uniforms);
  const halo=new THREE.Mesh(new THREE.TubeGeometry(cv,240,1.3,8,false),m2);m2.uniforms.c.value=new THREE.Color(col).multiplyScalar(.25);root.add(halo);
  anim.push(t=>{m.uniforms.time.value=t;m2.uniforms.time.value=t;});}

// ---- overgrowth on the sanctum cliffs (the guardian is a jungle beast) ----
vines({ol:outline,cx:0,cy:0,cz:0},90,12,30);

// ---- outer grounds of the enlarged island (r 50~135): jungle groves, stone arches, spires, ruins ----
const angOK=(a,list,w)=>list.every(b=>Math.abs(((a-b+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI)>w);
const lanes=[.35,.35+Math.PI/2,.35+Math.PI,.35+Math.PI*1.5];          // the 4 light-fall channels stay open as flight lanes
// jungle groves with layered understory
[[1.1,95],[2.75,100],[4.3,92],[5.75,98]].forEach(([ga,gd])=>{for(let k=0;k<5;k++){const a=ga+rnd(-.32,.32),d=gd+rnd(-22,26);if(!angOK(a,lanes,.12)||d>outline(a)-14)continue;
  alienTree(V(Math.cos(a)*d,0,Math.sin(a)*d),k===0?rnd(2,2.3):rnd(1.3,1.8));}
  for(let k=0;k<16;k++){const a=ga+rnd(-.45,.45),d=gd+rnd(-32,30);if(d>outline(a)-6||d<52)continue;const p=V(Math.cos(a)*d,0,Math.sin(a)*d);
    if(k%3===0)broadCluster(p,rnd(.9,1.3));else fernCluster(p,rnd(.9,1.5),k%2?'fern':'frondA');grassPatch(p,5,40);}});
// natural stone arches to fly through
function stoneArch(a,d,span,h,th){const c=V(Math.cos(a)*d,0,Math.sin(a)*d),t=V(-Math.sin(a),0,Math.cos(a)),p0=c.clone().addScaledVector(t,-span/2),p1=c.clone().addScaledVector(t,span/2),pts=[];
  for(let i=0;i<=16;i++){const u=i/16;pts.push(p0.clone().lerp(p1,u).add(V(0,Math.sin(u*Math.PI)*h,0)));}
  const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),60,th,10,false);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=(fbm2(x*.15,z*.15+y*.1)-.5)*th*.7;p.setXYZ(i,x+n,y+n*.6,z-n);}g.computeVertexNormals();
  put('rock',g);for(const q of[p0,p1])put('rock',new THREE.CylinderGeometry(th*1.3,th*1.9,6,12),q.clone().add(V(0,2,0)));
  for(let k=0;k<7;k++){const u=rnd(.15,.85),q=p0.clone().lerp(p1,u).add(V(0,Math.sin(u*Math.PI)*h-th*.8,0)),L=rnd(5,12);putBark(new THREE.CylinderGeometry(.12,.12,L,5).translate(q.x,q.y-L/2,q.z));
    for(let j=0;j<3;j++)inst('broadS',q.clone().add(V(0,-rnd(1,L),0)),new THREE.Euler(rnd(.6,1.2),R()*6.28,0,'YXZ'),V(1.4,2,2));inst('pod',q.clone().add(V(0,-L,0)),new THREE.Euler(),V(.9,.9,.9));}
  for(let k=0;k<8;k++){const u=rnd(.1,.9),q=p0.clone().lerp(p1,u).add(V(0,Math.sin(u*Math.PI)*h+th*.7,0));fernCluster(q,.6,'fern');}}
stoneArch(.85,118,34,30,3.2);stoneArch(2.2,112,28,24,2.6);stoneArch(3.6,120,38,34,3.4);stoneArch(5.0,115,30,26,2.8);
// tall rock spires (flight obstacles)
for(let k=0;k<12;k++){const a=k/12*Math.PI*2+rnd(-.15,.15);if(!angOK(a,lanes,.15))continue;const d=rnd(64,128);if(d>outline(a)-10)continue;const h=rnd(22,48),r=rnd(3,6);
  const g=new THREE.CylinderGeometry(r*.25,r,h,12,8);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+(fbm2(Math.atan2(z,x)*2+k,y*.08)-.5)*.6;p.setX(i,x*f);p.setZ(i,z*f);}g.computeVertexNormals();
  put('rock',g,V(Math.cos(a)*d,h/2-.5,Math.sin(a)*d),new THREE.Euler(rnd(-.08,.08),0,rnd(-.08,.08)));
  put('gold',new THREE.TorusGeometry(r*.72,.25,6,24),V(Math.cos(a)*d,h*.3,Math.sin(a)*d),new THREE.Euler(Math.PI/2,0,0));}
// four colossal anchor obelisks that hold the seal
for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.35+Math.PI/4;obelisk(V(Math.cos(a)*72,0,Math.sin(a)*72),42,k%2?'#9adfff':'#ffd27a',1.35);}
// ruined outer wall: broken fluted columns and fallen drums along r~60
for(let k=0;k<28;k++){const a=k/28*Math.PI*2;if(!angOK(a,lanes,.1))continue;if(R()<.35)continue;const d=60+rnd(-1,1),h=rnd(3,12),c=V(Math.cos(a)*d,0,Math.sin(a)*d);
  put('marble',new THREE.BoxGeometry(3.4,1.2,3.4),c.clone().add(V(0,.6,0)),new THREE.Euler(0,-a,0));put('pillar',fluted(1.15,1.05,h),c.clone().add(V(0,1.2+h/2,0)));
  if(R()<.5){const dr=fluted(1.1,1.1,rnd(2,3.5));put('pillar',dr,c.clone().add(V(rnd(-3,3),1.1,rnd(-3,3))),new THREE.Euler(Math.PI/2,0,R()*3));}}
// scattered understory and roots across the outer ground
for(let k=0;k<55;k++){const a=R()*Math.PI*2;if(!angOK(a,lanes,.08))continue;const d=rnd(54,outline(a)-6),p=V(Math.cos(a)*d,0,Math.sin(a)*d);if(k%4===0)broadCluster(p,rnd(.7,1));else fernCluster(p,rnd(.6,1.1));grassPatch(p,6,30);}
for(let k=0;k<40;k++){const a=R()*Math.PI*2,d=rnd(52,outline(a)-4);grassPatch(V(Math.cos(a)*d,0,Math.sin(a)*d),4,25);}
for(let k=0;k<26;k++){const a=R()*Math.PI*2,d=rnd(55,120),L=rnd(8,18),b=a+rnd(-.5,.5),p0=V(Math.cos(a)*d,0,Math.sin(a)*d),p1=p0.clone().add(V(Math.cos(b)*L,0,Math.sin(b)*L));
  putBark(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0.clone().add(V(0,.4,0)),p0.clone().lerp(p1,.5).add(V(0,1.2,0)),p1.clone().add(V(0,.2,0))]),12,rnd(.3,.7),6,false));}
/* ── 추가 (사용자 2026-11-08): 숲 네 덩이를 더 빽빽이 → 그 안은 숨을 곳 · 원본 무늬가 바뀌지 않게 원본 다 그린 뒤에 덧심음 ── */
[[1.1,95],[2.75,100],[4.3,92],[5.75,98]].forEach(([ga,gd])=>{const d0=Math.min(gd,outline(ga)-20);
  for(let k=0;k<4;k++){const a=ga+rnd(-.17,.17),d=d0+rnd(-11,11);if(!angOK(a,lanes,.12)||d>outline(a)-14)continue;alienTree(V(Math.cos(a)*d,0,Math.sin(a)*d),rnd(1.2,1.6));}
  for(let k=0;k<6;k++){const a=ga+rnd(-.2,.2),d=d0+rnd(-14,14);if(d>outline(a)-6||d<52)continue;fernCluster(V(Math.cos(a)*d,0,Math.sin(a)*d),rnd(.9,1.4),k%2?'fern':'frondA');}
  const hm=new THREE.Object3D();hm.position.set(Math.cos(ga)*d0,0,Math.sin(ga)*d0);hm.userData.hideR=24;hm.name='hide';root.add(hm);});
flushFoliage();flushBark();

const glyphM=new THREE.MeshBasicMaterial({color:'#7ad0ff'}),rockOM=new THREE.MeshStandardMaterial({color:C('#2a2634'),roughness:.9});
flushBK({bark:barkM,leaf:leafM,leaf2:leafM2,vine:vineM,pod:podM,pod2:podM2,marble:marbleM,gold:goldM,glyph:glyphM,pillar:pillarM,rock:rockOM,spire:new THREE.MeshStandardMaterial({color:C('#1a1722'),roughness:.9})});
root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&[marbleM,pillarM,rockOM].includes(o.material))o.castShadow=o.receiveShadow=true;});
/* ═══════════════════════ 원본 끝 ═══════════════════════ */
    /* 원본 frame()에서 하던 움직임 */
    anim.push((t, dt) => { innerMat.uniforms.time.value = t; shellMat.uniforms.time.value = t; egg.position.y = EGG_Y + Math.sin(t * .8) * .45; const pb = 1 + Math.sin(t * 1.6) * .025; inner.scale.set(pb, 1.34 * pb, pb);
      halo1.material.opacity = .26 + Math.sin(t * 1.6) * .07; eggLight.intensity = 2.3 + Math.sin(t * 1.6) * .5;
      gyro[0].rotation.set(t * .42, 0, 0); gyro[1].rotation.set(1.05, t * .3, 0); gyro[2].rotation.set(t * .13, 0, t * .24); });
    LU.uHS.value.copy(C('#9aa8e8')).multiplyScalar(1.05); LU.uHG.value.copy(C('#3a2c48')).multiplyScalar(1.05); LU.uAmb.value.copy(C('#4a4a6a')).multiplyScalar(.45);
    LU.uMC.value.copy(C('#dfe6ff')).multiplyScalar(1.7); LU.uWC.value.copy(C('#ffd49a')).multiplyScalar(.6); LU.uEB.value.copy(C('#a8d8ff'));
    /* 정글 섬 식물로도 씀 (사용자 2026-11-09: 정글 식물을 보물 성소 식물로) — 원본 함수를 그대로 불러 잎 자리·나무껍질 모양만 받아 감 */
    const floraGen = f => { Object.keys(FOL).forEach(k => FOL[k] = []); BARKL.length = 0; f(); const out = { inst: {}, bark: BARKL.splice(0) }; Object.keys(FOL).forEach(k => { out.inst[k] = FOL[k]; FOL[k] = []; }); return out; };
    const flora = { gen: floraGen, tree: (p, sc) => alienTree(p, sc), fern: (p, sc, k) => fernCluster(p, sc, k), broad: (p, sc) => broadCluster(p, sc), grass: (p, r, n) => grassPatch(p, r, n), vine: () => 0, spec: FLSPEC, bark: barkTexM };
    return { anim, egg, eggLight, outline, flora }; })();
  } finally { THREE.ColorManagement.enabled = CMp; }
  root.scale.setScalar(K);
  const cache = new Map(); root.traverse(o => { if (!o.isMesh || !o.material || o.material.isShaderMaterial) return; const m = o.material; if (!(m.isMeshPhongMaterial || m.isMeshStandardMaterial)) return; if (!cache.has(m)) cache.set(m, litOf(m)); o.material = cache.get(m); });
  /* 움직이는 것 찾기: 원본 움직임을 두 번 돌려 자리·방향·크기가 바뀌는 것만 (복사본에 옮길 목록) */
  const flat = []; root.traverse(o => flat.push(o)); const snap = () => flat.map(o => [...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray()].join(','));
  const s0 = snap(); O.anim.forEach(f => f(1.3, .016)); const s1 = snap(); O.anim.forEach(f => f(2.9, .016)); const s2 = snap();
  const moving = []; for (let i = 1; i < flat.length; i++) if (s0[i] !== s1[i] || s1[i] !== s2[i]) moving.push(i);
  const TPLM = flat.slice();   /* 합치기 전 목록 (움직이는 것의 자리 찾기) */
  /* 안 움직이는 돌·금·나무껍질은 칠마다 하나로 합침 (그리는 횟수 줄이기 · 모양은 그대로) */
  { const mv = new Set(); moving.forEach(i => flat[i].traverse(o => mv.add(o))); root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), drop = [];
    flat.forEach((o, i) => { if (!o.isMesh || o.isInstancedMesh || !LIT.has(o.material) || mv.has(o)) return; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); });
    for (const [m, list] of groups) { if (list.length < 2) continue; const parts = list.map(o => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return g; });
      let n = 0; parts.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), Cc = m.vertexColors ? new Float32Array(n * 3).fill(1) : null; let o3 = 0, o2 = 0;
      parts.forEach(g => { const c = g.attributes.position.count; P.set(g.attributes.position.array, o3); if (g.attributes.normal) N.set(g.attributes.normal.array, o3); if (g.attributes.uv) U.set(g.attributes.uv.array, o2); if (Cc && g.attributes.color) Cc.set(g.attributes.color.array, o3); o3 += c * 3; o2 += c * 2; g.dispose(); });
      const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(P, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(U, 2)); if (Cc) mg.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); mg.computeBoundingSphere();
      const me = new THREE.Mesh(mg, m); root.add(me); list.forEach(o => drop.push(o)); }
    drop.forEach(o => { o.parent.remove(o); }); }
  flat.length = 0; root.traverse(o => flat.push(o)); const mv2 = moving.map(i => TPLM[i]); moving.length = 0; mv2.forEach(o => moving.push(flat.indexOf(o)));
  let lastT = -1; const tick = (t, dt) => { if (t === lastT) return; lastT = t; O.anim.forEach(f => f(t, dt)); LU.uEC.value.copy(LU.uEB.value).multiplyScalar(O.eggLight.intensity); LITM.forEach(s => { s.uniforms.uEmI.value = s.userData.src.emissiveIntensity ?? 1; }); };
  const litFor = m => { if (!(m.isMeshPhongMaterial || m.isMeshStandardMaterial)) return m; if (!cache.has(m)) cache.set(m, litOf(m)); return cache.get(m); };
  return (TPL = { root, flat, moving, eggIdx: flat.indexOf(O.egg), tick, outline: O.outline, flora: { ...O.flora, litFor } }); }
/* 성소 식물 꾸러미 (정글 섬 꾸미기용): 미터 단위로 자리를 주면 잎(종류별 자리·색)과 나무껍질 모양을 돌려줌 */
export function sanctFlora() { const T = template(), F = T.flora, S = new THREE.Matrix4().makeScale(K, K, K);
  const run = f => { const cm = THREE.ColorManagement.enabled; THREE.ColorManagement.enabled = false; try { const o = F.gen(f); for (const k of Object.keys(o.inst)) for (const q of o.inst[k]) q.m.premultiply(S); o.bark.forEach(g => g.applyMatrix4(S)); return o; } finally { THREE.ColorManagement.enabled = cm; } };
  const P = (x, y, z) => new THREE.Vector3(x / K, y / K, z / K);
  return { K, run, P, tree: F.tree, fern: F.fern, broad: F.broad, grass: F.grass, geo: k => F.spec[k][0], mat: k => F.litFor(F.spec[k][1]), barkMat: () => F.litFor(F.bark) }; }

/* 성소 하나 놓기: 원본을 복사해 돌려 놓음 · clearA(조각 안 각도)에 빛 폭포 통로가 오게 */
export function buildSanctum({ clearA = null } = {}) {
  const T = template(), G = new THREE.Group(), root = T.root.clone(true), psi = clearA == null ? 0 : .35 - clearA; root.rotation.y = psi; G.add(root);
  const flat = []; root.traverse(o => flat.push(o)); const pairs = T.moving.map(i => [T.flat[i], flat[i]]), egg = flat[T.eggIdx], ep = new THREE.Vector3();
  const anim = [(t, dt) => { T.tick(t, dt); for (const [a, b] of pairs) { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); } egg.getWorldPosition(LU.uEP.value); }];   /* 알 빛 자리: 가까운(움직이는) 성소 것으로 한 프레임에 한 번 (전엔 부품 그릴 때마다 칠 정보를 통째로 다시 보냈음 → 폰 계산 부담) */
  const outline = a => T.outline(a + psi) * K;
  /* 멀리서(75m 밖) 안 보이는 잔것은 그리지 않음: 풀잎 · 작은 고사리 · 덩굴 잎 · 꼬투리 · 작은 빛 · 빛 알갱이 · 낮은 안개 (나무 지붕·돌·금·빛기둥·폭포는 그대로) */
  const SM = ['blade', 'fern', 'broadS', 'pod', 'pod2'], cat = { shaft: [], fall: [], glow: [], leafS: [], leaf: [] };
  root.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.nS) cat.shaft.push(o); else if (u && u.nF) cat.fall.push(o); else if (o.isSprite || o.isPoints) cat.glow.push(o); else if (o.isInstancedMesh) (SM.includes(o.userData.kind) ? cat.leafS : cat.leaf).push(o); });
  let farS = false; const T2 = SANCT_TEST, apply = () => { root.visible = T2.all; cat.shaft.forEach(o => o.visible = T2.shaft); cat.fall.forEach(o => o.visible = T2.fall); cat.glow.forEach(o => o.visible = T2.glow && !farS); cat.leaf.forEach(o => o.visible = T2.leaf); cat.leafS.forEach(o => o.visible = T2.leaf && !farS); };
  CLONES.push({ apply });
  G.userData.lod = d => { const f = d > 75; if (f === farS) return; farS = f; apply(); };   /* 멀리서(75m 밖) 잔것 안 그림 */
  G.userData.outline = outline; G.userData.top = { fn: a => T.outline(a + psi) * K, y: 0, r: 140 * K };
  return { G, anim, size: 26, outline, block: [], hole: 0 }; }
