/* 적 행성 + 별 + 일몰 배경 — 메인 화면용 (격납고 창밖도 같은 계산)
   행성 모습은 src/data/planets.js 의 값만 보고 그린다. 행성마다 코드 없음.
   소닉붐(공간 굴절 고리) 자리는 이어하기 연출에서 쓴다. */
const v3 = a => `vec3(${a.map(n => (+n).toFixed(4)).join(',')})`;

export function planetShader(P, opt = {}) {
  /* opt.three: three.js 화면 판(격납고 창밖)용 — 그림판 좌표(vU)로 받고, 밝기는 그대로 넘김(격납고가 마지막에 바꿈) */
  return `precision highp float;${opt.three ? '\nvarying vec2 vU;' : ''}
uniform vec2 uRes; uniform float uT; uniform float uYaw; uniform float uPitch; uniform float uS; uniform float uFade;
uniform float uR; uniform vec2 uC; uniform vec3 uSun; uniform float uDetail; uniform vec4 uSB; uniform vec4 uSB2; uniform vec4 uSC; uniform vec4 uSC2; uniform float uStarK;
float h1(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
vec3 h3(vec3 p){ return fract(sin(vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*n3(p); p=p*2.02+vec3(1.7,9.2,3.3); a*=.5; } return s; }
/* 판의 경계: 가장 가까운 두 점의 거리 차이 */
vec2 vor(vec3 p){
  vec3 i=floor(p), f=fract(p); float d1=9., d2=9.;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 g=vec3(float(x),float(y),float(z)); vec3 o=h3(i+g); vec3 r=g+o-f; float d=dot(r,r);
    if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d; }
  return vec2(sqrt(d1), sqrt(d2)-sqrt(d1)); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 stars(vec2 uv){
  vec2 g=uv*90., i=floor(g), f=fract(g); vec3 c=vec3(0.);
  float r=h2(i); if(r>.94){ vec2 o=vec2(h2(i+3.),h2(i+7.)); float d=length(f-o); c+=vec3(.8,.85,1.)*pow(h2(i+11.),4.)*1.6*exp(-d*d*120.); }
  return c; }
mat3 rotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a),s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
/* 소닉붐: 가는 방향에 수직으로 선 고리가 퍼지며 뒤 풍경을 실제로 밀어 휘게 함 */
void sbw(inout vec2 fc, vec4 A, vec4 B, inout float sbr, inout float sbA, inout float sbB){ if(A.w<=0.) return;
  vec2 sc=A.xy*uRes; vec2 d=(fc-sc)/uRes.y; vec2 u=B.xy, v=vec2(-u.y,u.x); float sq=B.z, sz=max(B.w,.2);
  float a1=dot(d,u)/sq, a2=dot(d,v), r=length(vec2(a1,a2))/sz, tt=A.z, rp=.03+tt*1.7, fade=max(0.,1.-tt/.75)*A.w;
  vec2 gd=normalize(vec2(a1/sq,a2)+1e-5); vec2 dir=u*gd.x+v*gd.y;
  float k=exp(-pow((r-rp)*13.,2.))*fade; sbr+=k; sbA+=exp(-pow((r-rp-.018)*16.,2.))*fade; sbB+=exp(-pow((r-rp+.018)*16.,2.))*fade;
  fc-=dir*k*.11*sz*uRes.y; }
void main(){
  vec2 fc=${opt.three ? 'vU*uRes' : 'gl_FragCoord.xy'};
  float sbr=0., sbA=0., sbB=0.;
  sbw(fc,uSB,uSB2,sbr,sbA,sbB); sbw(fc,uSC,uSC2,sbr,sbA,sbB);
  vec2 uv=(fc-uC*uRes)/uRes.y/uR;          /* 행성 반지름 = 1 */
  vec3 col=vec3(.0015,.002,.004)+stars(fc/uRes.y*uStarK);
  vec3 sun=normalize(uSun);
  float r2=dot(uv,uv), rr=sqrt(r2);
  if(rr>1.){                                 /* 대기: 행성 밖 테두리 빛 */
    vec3 n=normalize(vec3(uv,0.)); float lit=clamp(dot(n,sun)*.7+.45,0.,1.);
    float halo=exp(-(rr-1.)*22.)*.5+exp(-(rr-1.)*9.)*.05;
    col+=${v3(P.air.halo)}*halo*(.25+lit*.95);
    col+=${v3(P.air.hot)}*exp(-(rr-1.)*60.)*.35*lit;
  } else {
    float z=sqrt(1.-r2); vec3 nV=vec3(uv,z);
    mat3 R=rotX(uPitch)*rotY(uYaw); vec3 p=nV*R;   /* 행성 위의 좌표(돌아감) */
    float s=uS;                                     /* 파괴 단계 (0 = 평소) */
    vec3 pw=p+(vec3(fbm(p*2.6),fbm(p*2.6+7.),fbm(p*2.6+13.))-.5)*.42;   /* 판 경계가 반듯한 그물처럼 보이지 않게 비틂 */
    vec2 v1=vor(pw*${(+P.plates[0]).toFixed(3)}); vec2 v2=vor(pw*${(+P.plates[1]).toFixed(3)}+11.);
    float edge1=v1.y, edge2=v2.y;
    float act=smoothstep(.42+(-.35*s),.62+(-.35*s),fbm(p*2.2+3.))*(1.-step(2.6,s))+step(2.6,s);   /* 평소엔 일부 틈만 살아 있음 */
    act=max(act,smoothstep(1.4,2.2,s));
    float wv=.6+.8*n3(p*9.);
    float crackW=(.010+.018*s+.035*smoothstep(1.4,3.,s))*wv;
    float crack=smoothstep(crackW,crackW*.2,edge1)*act;
    float crack2=smoothstep(crackW*.7,crackW*.12,edge2)*smoothstep(1.3,2.3,s);
    float rv=abs(fbm(p*3.6+vec3(5.,1.,3.))-.5);                          /* 굽이치는 가는 강 */
    float rivers=smoothstep(.016,.003,rv)*smoothstep(.35,.62,fbm(p*1.8+9.));
    float lava=max(max(crack,crack2),rivers*${(+P.glow.rivers).toFixed(3)});
    float rock=pow(fbm(p*14.)*.62+fbm(p*42.)*.38,1.6)*1.5;
    vec3 basalt=mix(${v3(P.rock.dark)},${v3(P.rock.light)},rock);
    basalt*=.75+.5*n3(p*5.+v1.x*3.);
    vec3 nS=normalize(nV+(vec3(n3(p*22.),n3(p*22.+3.),n3(p*22.+7.))-.5)*.25);   /* 판마다 미세한 높낮이 → 빛 */
    float dif=clamp(dot(nS,sun),0.,1.);
    float term=smoothstep(-.08,.25,dot(nV,sun));                           /* 낮밤 경계를 부드럽게 */
    vec3 surf=basalt*(dif*3.2*term+.018);
    float heat=.55+.45*fbm(p*8.+uT*.05);
    vec3 lavaC=mix(${v3(P.glow.a)},${v3(P.glow.b)},heat);
    float night=1.-term*.55;                                               /* 틈의 빛은 밤쪽에서 더 또렷 */
    surf+=lavaC*lava*(.28+.72*night)*(1.+.8*smoothstep(0.,3.,s));
    surf+=${v3(P.glow.edge)}*smoothstep(crackW*4.,0.,edge1)*act*.07*night;
    float core=smoothstep(.4,3.,s);
    vec3 coreC=mix(${v3(P.core.a)},${v3(P.core.b)},smoothstep(1.5,3.,s));
    surf+=coreC*max(crack,crack2)*core*2.4;
    surf=mix(surf,surf*.35,smoothstep(2.4,3.,s)*(1.-max(crack,crack2)));
    vec3 pc=nV*(rotX(uPitch)*rotY(uYaw*1.12+uT*.008));                   /* 구름은 지면보다 조금 빨리 */
    float cl=smoothstep(.52,.78,fbm(pc*3.3+vec3(0.,uT*.01,0.)));
    vec3 cloudC=${v3(P.cloud.color)}*(dif*1.5*term+.02)+lavaC*.05*night*lava;
    surf=mix(surf,cloudC,cl*${(+P.cloud.amount).toFixed(3)}*uDetail);
    float fres=pow(1.-z,4.2), litR=clamp(dot(nV,sun)*.6+.5,0.,1.);       /* 대기: 가장자리 테 */
    surf+=${v3(P.air.rim)}*fres*(.22+.75*litR);
    surf+=${v3(P.air.night)}*fres*.4*night;
    col=mix(col,surf,smoothstep(1.,.994,rr));
  }
  { vec3 n0=normalize(vec3(uv,.001)); float lt=clamp(dot(n0,sun)*.8+.35,0.,1.);
    col+=${v3(P.air.edge)}*exp(-abs(rr-1.)*70.)*(.08+lt*1.3)+vec3(1.,.8,.55)*exp(-abs(rr-1.)*260.)*lt*.9;
    /* 일몰: 행성 테두리 뒤로 해가 넘어가는 빛 */
    float sd=max(dot(normalize(uv),normalize(sun.xy)),0.);
    col+=vec3(1.,.48,.18)*pow(sd,8.)*exp(-abs(rr-1.)*8.)*.45+vec3(1.,.6,.3)*pow(sd,13.)*exp(-abs(rr-1.)*11.)*.3;
    col+=vec3(1.,.78,.55)*pow(sd,55.)*exp(-abs(rr-1.)*30.)*1.35;
    col+=vec3(1.,.95,.85)*pow(sd,330.)*exp(-abs(rr-1.)*85.)*2.75;
    vec2 tg=vec2(-normalize(sun.xy).y,normalize(sun.xy).x); vec2 sp=normalize(sun.xy)*1.003;
    vec2 dd=uv-sp; col+=vec3(1.,.8,.6)*exp(-abs(dot(dd,tg))*1150.)*exp(-length(dd)*18.)*.3;
    /* 해: 밝은 점 + 피어났다 사라지는 짧은 빛살 + 가로 빛줄기 + 둥근 빛무리 */
    { vec2 sp2=normalize(sun.xy)*1.012; vec2 q=uv-sp2; float ln=length(q), ang=atan(q.y,q.x);
      float core=exp(-ln*90.)*2.6+exp(-ln*28.)*.6, halo=exp(-ln*8.)*.22, spike=0.;
      for(int i=0;i<9;i++){ float fi=float(i);
        float per=2.6+1.7*fract(fi*.618), ph=fract(fi*.371)*per;
        float cyc=floor((uT+ph)/per), life=fract((uT+ph)/per);
        float a0=fract(sin((cyc*7.13+fi*3.7))*43758.5)*6.2831;
        float grow=sin(3.14159*life); grow*=grow;
        float len=(.012+.022*fract(fi*.53+cyc*.17))*grow;
        float da=abs(mod(ang-a0+3.14159,6.2831)-3.14159);
        float wdt=.06+ln*3.;
        spike+=exp(-pow(da/wdt,2.)*3.)*exp(-ln/max(len,1e-4))*grow; }
      float streak=exp(-abs(q.y)*600.)*exp(-abs(q.x)*14.)*.18*(.8+.2*sin(uT*.9));
      col+=vec3(1.,.93,.82)*core+vec3(1.,.62,.32)*halo+vec3(1.,.86,.68)*spike*.55*smoothstep(0.,.006,ln)+vec3(1.,.8,.62)*streak; } }
  col.r*=1.+sbA*.9; col.b*=1.+sbB*.9; col+=vec3(.9,.95,1.)*sbr*sbr*.06;   /* 고리 가장자리에서 빨강·파랑이 살짝 갈라짐 */
  col*=uFade; col=col/(1.+col*.4);
  gl_FragColor=${opt.three ? 'vec4(max(col,0.),1.)' : 'vec4(pow(max(col,0.),vec3(1./2.2)),1.)'};
}`;
}

/* 캔버스 하나에 행성 배경을 그리는 그림판. 해상도는 화면의 75% (흐린 배경이라 충분, 폰 부담 ↓) */
export function createPlanet(canvas, P) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, planetShader(P))); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['uRes', 'uT', 'uYaw', 'uPitch', 'uS', 'uR', 'uC', 'uSun', 'uDetail', 'uFade', 'uSB', 'uSB2', 'uSC', 'uSC2', 'uStarK']) U[n] = gl.getUniformLocation(pr, n);
  const off = [0, 0, 9, 0];
  return {
    gl,
    /* view: { r 반지름(화면 높이 기준), c [x,y] 중심(화면 비율, y는 아래가 0), fade, stage 파괴 단계, sb/sc 소닉붐 } */
    draw(t, view) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uT, t);
      gl.uniform1f(U.uYaw, t * P.spin + P.yaw0); gl.uniform1f(U.uPitch, P.tilt); gl.uniform1f(U.uS, view.stage || 0);
      gl.uniform1f(U.uR, view.r); gl.uniform2f(U.uC, view.c[0], view.c[1]); gl.uniform3f(U.uSun, ...P.sun);
      gl.uniform1f(U.uDetail, 1); gl.uniform1f(U.uFade, view.fade ?? 1); gl.uniform1f(U.uStarK, view.starK || 1);
      const A = view.sb || [off, [1, 0, 1, 1]], B = view.sc || [off, [1, 0, 1, 1]];
      gl.uniform4f(U.uSB, ...A[0]); gl.uniform4f(U.uSB2, ...A[1]); gl.uniform4f(U.uSC, ...B[0]); gl.uniform4f(U.uSC2, ...B[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.deleteProgram(pr); gl.deleteBuffer(b); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
}
