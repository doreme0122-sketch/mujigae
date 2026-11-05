/* 용암 색·금 계산 하나로 (사용자 2026-11-05: 용암 벽과 같은 색, 같은 느낌의 바닥)
   벽(빛 계산 있는 재질)과 바닥(바닥 판)이 같은 함수를 씀 → 금 모양·빛 색·숨 쉬는 박자가 같음
   · lavaHot(k): 식은 붉은빛(0) → 주황 → 노랗게 끓는 속(1)
   · lavaCrust(p, amt, t): 식어 굳은 검은 껍질 판 사이로 녹은 용암 — amt가 클수록 금이 넓어져 녹은 곳이 많아짐
     돌려주는 값: x = 녹은 정도(0 껍질 ~ 1 녹음), y = 판 번호(판마다 색 조금 다름) */
import * as THREE from 'three';
/* 판 그림 굽기 (한 번만, 512×512 · 16×16칸 되풀이) */
let VOR = null;
export function vorTex() { if (VOR) return VOR; const N = 512, C = 16, P = N / C, hs = (x, y, k) => { const v = Math.sin(((x % C + C) % C) * 127.1 + ((y % C + C) % C) * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  const pt = []; for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) pt.push([i + hs(i, j, 1) * .8 + .1, j + hs(i, j, 2) * .8 + .1]);
  const d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const fx = (x + .5) / P, fy = (y + .5) / P, cx = Math.floor(fx), cy = Math.floor(fy); let d1 = 9, d2 = 9, id = 0, id2 = 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const gi = ((cx + a) % C + C) % C, gj = ((cy + b) % C + C) % C, q = pt[gj * C + gi], qx = q[0] + (cx + a - gi), qy = q[1] + (cy + b - gj), dd = Math.hypot(fx - qx, fy - qy);
      if (dd < d1) { d2 = d1; d1 = dd; id = hs(gi, gj, 3); id2 = hs(gi, gj, 9); } else if (dd < d2) d2 = dd; }
    const k = (y * N + x) * 4; d[k] = Math.min(255, (d2 - d1) * 255); d[k + 1] = id * 255; d[k + 2] = id2 * 255; d[k + 3] = 255; }
  VOR = new THREE.DataTexture(d, N, N); VOR.wrapS = VOR.wrapT = THREE.RepeatWrapping; VOR.magFilter = THREE.LinearFilter; VOR.minFilter = THREE.LinearMipmapLinearFilter; VOR.generateMipmaps = true; VOR.needsUpdate = true;
  return VOR; }
export const LAVA_GLSL = `
float lh(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float lnz(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(lh(i),lh(i+vec3(1,0,0)),f.x),mix(lh(i+vec3(0,1,0)),lh(i+vec3(1,1,0)),f.x),f.y),mix(mix(lh(i+vec3(0,0,1)),lh(i+vec3(1,0,1)),f.x),mix(lh(i+vec3(0,1,1)),lh(i+vec3(1,1,1)),f.x),f.y),f.z); }
/* 깨진 판 (구워 둔 그림을 읽기만 함 — 사용자 2026-11-05: 얼음·용암·산호 칸이 끊김 → 판 나눔 계산을 화면 점마다 하던 것을 미리 구움)
   uVor: 16칸마다 되풀이되는 판 그림 · r = 금까지 거리(두 판 중심 거리 차) · g,b = 판 번호 둘 */
uniform sampler2D uVor;
vec2 lvor(vec2 x){ vec4 t=texture2D(uVor,x*.0625); return vec2(t.r,t.g); }
vec3 vorB(vec2 x){ vec4 t=texture2D(uVor,x*.0625); return vec3(t.r*.5,t.g,t.b); }
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
