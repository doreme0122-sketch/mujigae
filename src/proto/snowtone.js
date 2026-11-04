/* 눈 색 하나로: 벽 위 눈 · 바위 눈 · 발치 눈밭 · 바닥 눈이 모두 이 계산 하나로 색을 냄
   → 같은 방향을 보는 눈은 어디 있든 똑같은 색 (해 향한 비탈은 조금 밝고, 해 등진 쪽은 푸르게)
   n = 눈 겉면 방향, v = 눈에서 카메라 쪽, w = 세상 위치, s = 해 방향, t = 시간 */
export const SNOW_GLSL = `
float stH(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float stN(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(stH(i),stH(i+vec3(1,0,0)),f.x),mix(stH(i+vec3(0,1,0)),stH(i+vec3(1,1,0)),f.x),f.y),mix(mix(stH(i+vec3(0,0,1)),stH(i+vec3(1,0,1)),f.x),mix(stH(i+vec3(0,1,1)),stH(i+vec3(1,1,1)),f.x),f.y),f.z); }
const vec3 SNOW_LIT=vec3(.86,.9,.95), SNOW_SH=vec3(.5,.62,.8);
vec3 snowTone(vec3 n, vec3 v, vec3 w, vec3 s, float t){
  float d=dot(n,s);
  vec3 c=mix(SNOW_SH,SNOW_LIT,smoothstep(.35,.92,d));                       /* 해 받는 만큼 하얗게, 그늘은 푸르게 */
  c*=.95+.07*(stN(w*.6)*.6+stN(w*2.)*.4);                                   /* 바람에 쌓인 얼룩 (아주 옅게) */
  c+=vec3(.06)*pow(max(dot(n,normalize(s+v)),0.),24.);                       /* 해 쪽 은은한 윤기 */
  vec3 g=floor(w*4.); float gh=stH(g); if(gh>.97){ vec3 gf=fract(w*4.)-.5; c+=vec3(.5,.6,.7)*exp(-dot(gf,gf)*70.)*fract(gh*41.+t*.3)*smoothstep(.2,.8,n.y); }   /* 반짝임 */
  return c; }
`;
