/* 용암 색·금 계산 하나로 (사용자 2026-11-05: 용암 벽과 같은 색, 같은 느낌의 바닥)
   벽(빛 계산 있는 재질)과 바닥(바닥 판)이 같은 함수를 씀 → 금 모양·빛 색·숨 쉬는 박자가 같음
   · lavaHot(k): 식은 붉은빛(0) → 주황 → 노랗게 끓는 속(1)
   · lavaCrust(p, amt, t): 식어 굳은 검은 껍질 판 사이로 녹은 용암 — amt가 클수록 금이 넓어져 녹은 곳이 많아짐
     돌려주는 값: x = 녹은 정도(0 껍질 ~ 1 녹음), y = 판 번호(판마다 색 조금 다름) */
export const LAVA_GLSL = `
float lh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float lnz(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(lh(i),lh(i+vec3(1,0,0)),f.x),mix(lh(i+vec3(0,1,0)),lh(i+vec3(1,1,0)),f.x),f.y),mix(mix(lh(i+vec3(0,0,1)),lh(i+vec3(1,0,1)),f.x),mix(lh(i+vec3(0,1,1)),lh(i+vec3(1,1,1)),f.x),f.y),f.z); }
/* 깨진 판: 가장 가까운 두 판 중심까지 거리 차 = 금까지 거리 · 판 번호 */
vec2 lvor(vec2 x){ vec2 n=floor(x), f=fract(x); float d1=8., d2=8., id=0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=vec2(lh(vec3(n+g,1.)),lh(vec3(n+g,2.)))*.8+.1; float d=length(g+o-f);
    if(d<d1){ d2=d1; d1=d; id=lh(vec3(n+g,3.)); } else if(d<d2) d2=d; }
  return vec2(d2-d1,id); }
vec3 lavaHot(float k){ return mix(mix(vec3(.55,.06,.005),vec3(.95,.24,.02),smoothstep(0.,.5,k)),vec3(1.,.62,.12),smoothstep(.5,1.,k)); }
float lavaPulse(vec3 w, float t){ return .82+.18*sin(t*1.2+lnz(w*.18)*9.); }
vec2 lavaCrust(vec2 p, float amt, float t){
  vec2 wq=vec2(lnz(vec3(p*.5,1.)),lnz(vec3(p*.5,5.)))*.6+vec2(t*.04,0.);   /* 껍질 판이 아주 천천히 떠밀림 */
  vec2 v1=lvor(p*.85+wq), v2=lvor(p*2.2+wq*2.+9.);
  float w=.03+.22*amt*amt;
  float m=max(smoothstep(w,w*.3,v1.x), smoothstep(.05,.0,v2.x)*.5*step(.55,v2.y)*smoothstep(.2,.6,amt+.3));
  m=max(m,smoothstep(.75,1.,amt));
  return vec2(m,v1.y); }
`;
