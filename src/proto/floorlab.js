/* 바닥 시험판 — 일반 맵 바닥 후보 넷 + 가운데 보스존 별빛 우주 (사용자 2026-11-04: 일반 바닥은 단순하게, 보스존만 공허한 별빛 우주, 거기도 그림자는 보여야 함)
   판 하나(그리기 1번)에 모든 바닥을 담고 uK로 고른다. 무늬는 이어 붙여도 이음새 없는 구름 그림(256) 하나를 구워 두고 읽기만 함.
   · 바닥은 납작한 색이 아니라 '빛을 받는 면': 높낮이 → 기울기 → 해 쪽은 밝고 반대는 어두움. 그래야 위에 뜬 기체와 그림자가 땅 위에 있는 걸로 읽힘
   · 멀어질수록 깊은 색으로 가라앉힘 (가까운 싸움터가 또렷하게)
   0 금속 판 · 1 이끼 낀 암반 · 2 결정 섞인 모래 · 3 은은한 평지 · 4 보스존 별빛 우주(보이지 않는 유리 바닥 + 아래로 깊은 별 세 겹) */
import * as THREE from 'three';
import { LAVA_GLSL, vorTex } from './lavatone.js?v=11110142';
import { SNOW_GLSL, SNOW_U } from './snowtone.js?v=11110142';
import { RUIN_TONE } from './ruintone.js?v=11110142';
const RTv = a => `vec3(${a.map(x => x.toFixed(4)).join(',')})`;

function bakeNoise(N = 256) {
  const hash = (x, y, p) => { x = ((x % p) + p) % p; y = ((y % p) + p) % p; const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, p) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, p), b = hash(ix + 1, iy, p), c = hash(ix, iy + 1, p), d = hash(ix + 1, iy + 1, p); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, base, oct, off) => { let s = 0, a = .5, f = 1, w = 0; for (let i = 0; i < oct; i++) { s += a * vn(x * f + off, y * f + off * 1.7, base * f); w += a; a *= .5; f *= 2; } return s / w; };
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = i / N * 8, y = j / N * 8, k = (j * N + i) * 4;
    data[k] = fbm(x, y, 8, 5, 0) * 255; data[k + 1] = fbm(x, y, 8, 4, 37) * 255; data[k + 2] = fbm(x * 4, y * 4, 32, 3, 91) * 255; data[k + 3] = vn(x * 8, y * 8, 64) * 255; }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

export const LAB = [
  { id: 'metal', name: '금속 판', tip: '무광 금속 판을 이어 깐 바닥이에요. 판마다 색이 살짝 다르고, 이음매와 모서리 볼트, 오래 쓴 긁힘이 있어요.' },
  { id: 'rock', name: '이끼 암반', tip: '울퉁불퉁한 돌바닥이에요. 낮은 곳엔 이끼가 끼고, 군데군데 금이 가 있어요.' },
  { id: 'sand', name: '결정 모래', tip: '바람이 만든 모래 물결 사이로 작은 결정이 박혀 있어요. 보는 각도에 따라 결정이 반짝여요.' },
  { id: 'plain', name: '은은한 평지', tip: '무늬를 거의 없앤 바닥이에요. 고운 결과 큰 얼룩만 있어서 탄과 기체가 가장 또렷해요.' },
  { id: 'void', name: '보스존 별빛 우주', tip: '바닥도 그림자도 없는 진짜 우주예요(블랙홀이 돌아다니는 곳). 아래로 별이 세 겹으로 깊어서, 가까운 별은 빨리, 먼 별은 느리게 흘러요.' },
  { id: 'join', name: '얼음·용암 + 유리 길', tip: '맨 밑은 별빛 유리 한 장, 지역 땅은 그 위에 덮인 껍질이에요. 지역 안은 끝까지 땅이고, 문(벽 틈) 안쪽만 땅이 조각으로 부서져 아래 유리가 드러나요. 문을 나서면 유리 다리가 우주를 건너요. 유리엔 테두리가 없어요.' },
  { id: 'walls', name: '빙하 얼음 벽', tip: '벽 한 줄이 처음부터 끝까지 한 덩어리 절벽이에요. 앞뒤 면은 수직 절벽에 세로 결이 깊게 패여 있고, 윗단은 구간마다 한 단씩 높이가 달라 계단처럼 층져요. 윗단엔 눈이 덮이고 고드름이 늘어져요. 문 양옆이 가장 높이 솟았다가 수직으로 끊겨요.' },
  { id: 'lavawalls', name: '용암 바위 벽', tip: '검은 현무암 절벽 한 덩어리예요. 바위 겉에 빛나는 금이 그물처럼 퍼져 있고, 윗단에서 넘친 용암이 앞면을 타고 흘러내려 발치에 고여요. 문 양옆엔 날카로운 바위 뿔이 솟아요.' },
  { id: 'ruinwalls', name: '고대 유적 벽', tip: '크기가 다른 돌을 엇갈려 쌓은 옛 벽이에요. 구간마다 온전하거나 반쯤 무너졌거나 돌무더기만 남았어요. 돌기둥엔 금빛 띠와 푸른 문양이 빛나고, 문 위엔 거대한 고리 조각이 떠 돌아요. 맞으면 가까운 문양부터 금빛으로 켜져요.' },
  { id: 'coralwalls', name: '성운 산호 벽', tip: '낮고 울퉁불퉁한 산호초 바위 위에 산호가 세 줄로 얽혀 자란 벽이에요. 뿌리는 청록, 가지 끝은 보랏빛이고 물속처럼 천천히 흔들려요. 맞으면 가지 끝 방울이 반딧불처럼 깜빡여요.' },
  { id: 'crystalwalls', name: '자수정 꽃 무리', tip: '크고 작은 자수정 결정이 한가운데서 꽃잎처럼 사방으로 핀 덩어리들이 바짝 붙어 벽을 이뤄요. 가운데 결정이 가장 크고 곧고, 바깥으로 갈수록 짧고 눕혀져요. 맞으면 결정 면마다 다른 색으로 빛이 꺾여요.' },
  { id: 'plants', name: '숨을 곳 · 우주 식물', tip: '미지의 우주 식물 덤불 시안 셋이에요. 왼쪽부터 A 빛잎 덤불 · B 깃털 덤불 · C 빛버섯 무리(키 낮춤) · 맨 오른쪽 셋을 섞은 덤불. 들어가면 반투명해지고 곧은 테두리가 보여요.' },
  { id: 'zone1', name: '맵 1구역', tip: '맵 7안 방 1 둘레를 실제로 깔았어요. 방 1(바깥 벽 뒤) · 얼음 사냥터 · 양옆 보물 땅(유적) · 앞 산호 정글 · 가운데 자수정 보스존 둘레. 숨을 곳은 우주 식물 덤불.' },
  { id: 'sky', name: '하늘 협곡', tip: '나는 느낌 시험이에요. 부서진 행성 조각(섬)들이 저 아래 떠 있고, 섬 사이 틈 아래는 끝없는 별바다예요. 땅이라면 못 건널 틈과 끊긴 다리를 그냥 넘어가요. 막는 건 하늘까지 솟은 바위 첨탑뿐이에요.' },
  { id: 'glbisle', name: '하늘섬 모델', tip: '다른 채팅에서 만든 하늘섬 모델을 참고로 띄운 시험이에요. 탑뷰와 사이드뷰 중간(45도)에서 보고, 기체는 가운데 섬보다 약간 높이 날아요. 지형 뒤로 가면 숨고, 내 기체는 가려져도 윤곽이 보여요.' }];

/* 이음 시험 자리 (그림과 JS가 같은 식): 얼음 땅 가운데 (-30,0) · 용암 땅 (30,0) · 큰길 = 두 가운데를 잇는 폭 8m 띠 */
export const JOIN = { ice: [-30, 0], lava: [30, 0], R: 22, roadW: 4, roadX: 30 };
export const blobR = (dx, dz, R, ph) => { const a = Math.atan2(dz, dx); return R * (1 + .1 * Math.sin(3 * a + 1.3 + ph) + .06 * Math.sin(5 * a - .7 + ph * 2) + .04 * Math.sin(9 * a + 2 + ph)); };
export const sdBlob = (x, z, c, ph) => Math.hypot(x - c[0], z - c[1]) - blobR(x - c[0], z - c[1], JOIN.R, ph);
export const sdRoad = (x, z) => Math.max(Math.abs(z) - JOIN.roadW, Math.abs(x) - JOIN.roadX);

export function makeFloorLab() {
  const noise = bakeNoise();
  const ships = Array.from({ length: 2 }, () => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({ depthWrite: true,
    uniforms: { uReg: { value: null }, uVor: { value: vorTex() }, uN: { value: noise }, uK: { value: 0 }, uT: { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .78, -.42).normalize() }, uShips: { value: ships }, uIV: { value: 0 }, uSG: SNOW_U.uSG, uGate: { value: 0 }, uLF: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uLFw: { value: Array.from({ length: 24 }, () => new THREE.Vector2(0, 0)) }, uTrail: { value: null }, uTrO: { value: new THREE.Vector3(0, 0, 1) }, uDoor: { value: [new THREE.Vector4(), new THREE.Vector4()] } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform sampler2D uN; uniform float uK, uT; uniform vec3 uSun; uniform vec4 uShips[2]; uniform float uIV; uniform float uGate; uniform vec4 uLF[24]; uniform vec2 uLFw[24]; uniform sampler2D uTrail; uniform vec3 uTrO; uniform sampler2D uReg; uniform vec4 uDoor[2];
      float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec4 N4(vec2 p){ return texture2D(uN,p); }
      const vec3 SUN=vec3(1.,.94,.86), SKY=vec3(.42,.48,.62), GND=vec3(.16,.12,.1);
      vec3 lit(vec3 base, vec3 n, vec3 rd, float spec, float sh){ float d=max(dot(n,uSun),0.); vec3 amb=mix(GND,SKY,n.y*.5+.5)*.55;
        vec3 hv=normalize(uSun-rd); float s=pow(max(dot(n,hv),0.),sh)*spec; return base*(amb+SUN*d*1.05)+SUN*s; }
      /* 별 한 겹: 시선이 깊이 D 판에 닿는 자리의 칸마다 별 하나 (있을 수도 없을 수도) */
      /* 별 한 겹 (사용자 2026-11-05: 별이 선명하지 않고 네모로 번짐 · 너무 누렇다)
         · 네모 번짐 원인: 별 둘레 빛 번짐이 칸 경계에서 잘림 → 번짐은 칸 안에서 0이 되게 (칸 가장자리까지 남은 거리로 줄임)
         · 선명하게: 별 심은 작고 또렷하게, 너무 작아 화면 점보다 작아지면 화면 점 크기로 맞추고 밝기는 그만큼 나눔(반짝이며 깨지지 않게)
         · 색: 흰색 · 분홍빛 흰색 · 파란빛 흰색 · 아주 드물게 옅은 금빛 (모두 흰색에 가까운 맑은 빛) */
      float gRdW;   /* 화면 점 하나만큼 시선이 바뀌는 정도 — main 맨 앞(갈림길 전)에서 구함: 갈림길 안에서 구하면 갈림 경계를 따라 값이 깨져 줄이 생김 */
      vec3 starLayer(vec3 ro, vec3 rd, float D, float cs, float th, float br, float seed){
        float tq=(ro.y+D)/max(-rd.y,.05); vec2 q=ro.xz+rd.xz*tq; vec2 g=floor(q/cs), f=q/cs-g; float h=h2(g+seed);
        if(h<th) return vec3(0.); vec2 o=vec2(h2(g*1.7+seed),h2(g*2.3-seed))*.6+.2; float d=length(f-o)*cs;
        float pw=gRdW*tq*.7; float r0=.035+.06*fract(h*13.), r=max(r0,pw); float k=(r0*r0)/(r*r);
        float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y))*cs, R=min(r0*7.,edge);                                 /* 번짐은 칸 안에서 끝남 */
        float halo=pow(max(0.,1.-d/max(R,1e-3)),3.);
        float tw=.7+.3*sin(uT*(1.+h*3.)+h*40.);
        float hc=fract(h*7.3); vec3 col=hc<.34?vec3(1.,1.,1.):hc<.6?vec3(1.,.76,.88):hc<.9?vec3(.74,.86,1.15):vec3(1.,.92,.78);
        return col*(exp(-d*d/(r*r))*k*1.15+halo*.07)*br*tw; }
      /* 깊은 우주: 성운 + 별 세 겹 */
      vec3 deep(vec3 ro, vec3 rd){ vec2 dq=ro.xz+rd.xz*((ro.y+320.)/max(-rd.y,.05)); vec4 nb=N4(dq*.0016+vec2(uT*.0008,0.)); vec4 nb2=N4(dq*.0045-vec2(0.,uT*.001));
        float cloud=smoothstep(.38,.85,nb.r)*(.6+.6*nb2.g);
        vec3 c=vec3(.004,.005,.012)+mix(vec3(.03,.018,.06),vec3(.012,.035,.07),nb.g)*cloud*.6+vec3(.05,.03,.07)*pow(cloud,3.)*.35;
        c+=starLayer(ro,rd,320.,16.,.86,.55,3.1); c+=starLayer(ro,rd,140.,7.,.9,.6,7.3); c+=starLayer(ro,rd,48.,3.4,.95,.5,1.7); return c; }
      float blobR(vec2 q, float R, float ph){ float a=atan(q.y,q.x); return R*(1.+.1*sin(3.*a+1.3+ph)+.06*sin(5.*a-.7+ph*2.)+.04*sin(9.*a+2.+ph)); }
      float sdBlob(vec2 p, vec2 c, float ph){ vec2 q=p-c; return length(q)-blobR(q,22.,ph); }
      /* 얼음 땅 (벽에 맞춤): 눈 많이(uIV 0) / 얼음 많이 + 눈 조금(uIV 1)
         · 눈: 하얗고 푸른 눈 · 바람에 쓸린 잔물결 · 반짝임 · 그늘은 푸름
         · 드러난 얼음: 맑은 청록 · 속 푸른 금빛(벽과 같은 빛) · 하늘을 비추는 매끈한 면
         · 눈과 얼음 경계: 얇은 서리 테 · 작은 얼음 부스러기 · edge = 벽 가까이일수록 눈이 두꺼움(발치 눈밭과 이어짐) */
      ${SNOW_GLSL}
      float gSnow;   /* iceGround가 남기는 '여기가 눈인지' (문턱 처리에 씀) */
      /* 얼음 판 나눔: 가장 가까운 판까지 거리(금까지 거리) + 판 번호 */
      ${LAVA_GLSL}
      vec3 vor(vec2 x){ return vorB(x); }   /* 구워 둔 판 그림 (lavatone) */
      /* 얼음 땅 (벽과 같은 세상) — 바닥 눈은 없앰(사용자 2026-11-04): 바닥은 얼음판만, 눈은 벽 위·바위·벽 발치 눈밭에만
         · 색은 벽에서 가져옴: 밝은 하늘색 + 하얀 금 + 금 속 푸른 빛 · 모양도 벽처럼 각진 깨진 판 */
      vec3 iceGround(vec2 p, vec3 rd, float edge){
        vec2 wq=(N4(p*.04).rg-.5)*1.1+(N4(p*.16).ba-.5)*.25; vec3 v=vor(p*.3+wq), v2=vor(p*1.1+7.+wq*2.);   /* 큰 판 3m 남짓 · 그 안의 잔 판 · 모양이 고르지 않게 살짝 비틂 */
        /* 얼음 판 */
        float tilt=v.z; vec3 nI=normalize(vec3((v.y-.5)*.14,1.,(v.z-.5)*.14));
        vec3 ib=mix(vec3(.24,.54,.76),vec3(.45,.74,.9),v.y)*(.92+.12*N4(p*.08).r);
        ib=mix(ib,ib*vec3(.78,.9,1.),smoothstep(.0,.5,v.x));                 /* 판 가운데는 깊어 보여 조금 짙음 · 금 가까이 밝음 */
        float spec=pow(max(dot(nI,normalize(uSun-rd)),0.),60.)*.35;
        float cw=.012+.04*smoothstep(.3,.8,N4(p*.06+.2).g); float crack=smoothstep(cw,.0,v.x)*(.35+.65*smoothstep(.25,.6,N4(p*.09).r)),   /* 금 굵기·세기가 곳마다 다름 */ crack2=smoothstep(.025,.0,v2.x)*.45*step(.45,v2.y);
        float glow=smoothstep(.22,.0,v.x);
        float hair=smoothstep(.006,.0,abs(N4(p*.11+v.y).g-.5))*.35;
        vec3 ci=ib+vec3(.1,.35,.6)*glow*.18+vec3(.9,.96,1.)*(crack*.55+crack2*.4+hair)*(1.-crack*.2)+vec3(1.)*spec;
        float bub=step(.982,h2(floor(p*6.)))*smoothstep(.3,.6,v.x); ci+=vec3(.6,.8,.9)*bub*.25;
        gSnow=0.; return ci; }
      /* 입구 바닥 (시안): 2 = 깨져 벌어진 틈 → 문 둘레 바닥에 부딪힌 자리처럼 방사형 금 · 3 = 빛나는 문턱 → 두 벽 끝을 잇는 빛 줄(숨 쉬듯 밝아졌다 어두워짐 = 지나갈 수 있는 살아 있는 문) */
      vec3 doorFx(vec2 p, vec3 c){
        for(int i=0;i<2;i++){ if((uK>5.5&&uK<6.5)!=(i==1)) continue;                 /* 이음 장면은 그 문만, 벽 칸은 그 문만 */
          vec4 D=uDoor[i]; vec2 a=D.xy, b=D.zw, ab=b-a; if(dot(ab,ab)<.01) continue;
          if(uGate>1.5&&uGate<2.5){ /* 깨져 벌어진 틈: 무언가 부딪혀 뚫고 간 자리 — 가운데는 하얗게 으스러진 가루, 둘레로 금이 제멋대로 뻗어 나감(길이·굵기 제각각), 부서진 둥근 금은 조각조각 끊김 */
            vec2 m=(a+b)*.5, q=p-m; float r=length(q); if(r>8.) continue; float an=atan(q.y,q.x)/6.2832;
            float w=N4(p*.09+float(i)).r*.5;
            float sec=floor(an*11.+w), reachR=2.5+5.*h2(vec2(sec,3.1));         /* 금마다 뻗은 길이가 다름 */
            float ln=abs(fract(an*11.+w+N4(p*.25).g*.12)-.5)*r;                 /* 금 폭은 m 단위로 일정 → 멀어도 굵어지지 않음 */
            float cr=smoothstep(.06,.0,ln)*smoothstep(reachR,reachR*.4,r)*smoothstep(.6,1.6,r);
            float br=smoothstep(.03,.0,abs(fract(an*23.+w*2.-r*.11)-.5)*r)*smoothstep(3.5,1.2,r)*step(.45,h2(vec2(floor(an*23.+w*2.),7.)));   /* 잔가지 금 */
            float rr=r-1.5-(N4(p*.18).b-.5)*1.1; float arc=exp(-rr*rr/.02)*step(.4,N4(p*.22+.5).r);        /* 둥근 금: 군데군데 끊김 */
            float dust=smoothstep(1.7,.3,r+(N4(p*1.3).g-.5)*.8);                   /* 으스러진 가운데 */
            c=mix(c,vec3(.88,.93,.98)*(.9+.1*N4(p*2.).a),dust*.85);
            float L=min(1.,cr+br*.7+arc*.8); c=mix(c,vec3(.94,.98,1.),L*.8); c+=vec3(.08,.35,.7)*L*.15; }
          if(uGate>2.5){ /* 빛나는 문턱: 두 벽 끝 사이 얼음 아래에서 빛이 올라옴 — 얼음 잔금을 따라 새어 나오고(빛은 금 모양), 숨 쉬듯 밝아졌다 어두워짐(지나갈 수 있는 살아 있는 문) */
            float t=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.); float d=length(p-a-ab*t); if(d>2.5) continue;
            float band=exp(-d*d/(.55+.35*N4(p*.2).r)), br=.7+.3*sin(uT*1.25);
            vec3 v=vor(p*1.25+vec2(float(i)*3.)); float crk=smoothstep(.06,.0,v.x)*(.5+.5*v.y);
            float under=(N4(p*.35+uT*.02).g*.6+.4);                               /* 얼음 속 빛이 고르지 않게 일렁임 */
            float endk=smoothstep(0.,.08,t)*smoothstep(1.,.92,t)*.6+.4;
            vec3 gl=vec3(.12,.55,1.)*band*under*.9*br*endk;                              /* 밝은 얼음 위에서도 보이게: 색을 섞어 바꾸고(더하기만 하면 묻힘) 금은 빛 번짐이 날 만큼 밝게 */
            c=mix(c,c*vec3(.55,.8,1.1)+gl,min(1.,band*.75)); c+=vec3(.6,.9,1.3)*crk*band*1.6*br*endk; } }
        return c; }
      /* 용암 땅 (용암 벽과 같은 세상 · 같은 계산 lavatone.js): 숯빛 현무암 껍질 판(판마다 조금씩 기울고 색이 다름) · 판 사이 금은 뜨거운 곳만 주황으로 빛남(벽 겉 금과 같은 색·박자)
         · 군데군데 녹은 용암 웅덩이: 식은 검은 껍질 판이 떠다니고 그 사이로 끓는 용암 (벽 발치 웅덩이와 같은 모습) · thin = 문턱 얇은 곳일수록 뜨거움
         · 벽 재질은 화면에 낼 때 밝기 변환을 거치므로 바닥 빛은 같은 변환(pow 1/2.2)을 직접 해서 색을 맞춤 */
      /* 용암 벽까지 거리 (벽 칸: 물결 두 줄 · 이음 장면: 용암 땅 둘레) */
      float lavaWallD(vec2 p){
        if(uK>11.5) return 99.;
        if(uK>6.5){ float d=1e3; if(p.x>-34.5&&p.x<-3.5) d=min(d,abs(p.y-(-12.+sin(p.x*.12)*1.2))); if(p.x>3.5&&p.x<34.5) d=min(d,abs(p.y-(-12.+sin(p.x*.12+1.)*1.2)));
          d=min(d,length(vec2(max(abs(p.x)-34.,0.)+max(3.5-abs(p.x),0.),p.y+12.))+1.); return d; }
        return abs(sdBlob(p,vec2(30.,0.),2.1)); }
      /* 용암 땅 (사용자 2026-11-05: 벽과 땅이 따로 놂 → 한 세상으로)
         · 벽과 같은 숯빛 현무암 · 벽 가까이(3~4m)는 잘게 깨지고 금이 촘촘·밝게 달아오름 → 멀어질수록 큰 판, 식어 어두움 (열이 벽에서 퍼져 나옴)
         · 벽 쪽 바닥은 그을음 · 벽 그림자가 해 반대쪽으로 짐
         · 폭포 아래 고인 용암이 바닥 금을 따라 개울로 흘러 나가며(굽이침 · 식은 껍질이 떠내려감) 멀어질수록 식어 끊김 */
      vec3 lavaGround(vec2 p, vec3 rd, float thin){
        float wd=lavaWallD(p), heat=smoothstep(4.5,1.1,wd)*(.8+.2*N4(p*.2).r);
        vec2 wq=vec2(N4(p*.03).r,N4(p*.03+.5).g)*1.4; vec2 v1=lvor(p*.6+wq), v2=lvor(p*2.1+9.+wq), vN=lvor(p*1.7+3.+wq*1.5);
        vec3 n=normalize(vec3((lh(vec3(v1.y,1.,0.))-.5)*.25+(N4(p*.4).b-.5)*.12,1.,(lh(vec3(v1.y,2.,0.))-.5)*.25+(N4(p*.4+.3).b-.5)*.12));
        float fh=lh(vec3(v1.y,4.,1.)); vec3 base=vec3(.0392,.0235,.0196)*(.6+.7*fh)*.55*(.8+.4*N4(p*.3).a);
        float pulse=lavaPulse(vec3(p.x,0.,p.y),uT);
        float hotz=max(smoothstep(.6,.85,lnz(vec3(p*.12,.5))*.6+lnz(vec3(p*.05,1.5))*.4+thin*.45), heat*(.55+.45*lnz(vec3(p*.4,2.))));
        float wv=.03+.05*N4(p*.06+.2).g;
        float near=smoothstep(.25,.7,heat+(N4(p*.15).g-.5)*.4);                                                    /* 벽 가까이 잘게 깨진 판 */
        float crack=max(smoothstep(wv,0.,v1.x), smoothstep(.04,0.,vN.x)*near)*hotz, crack2=smoothstep(.035,0.,v2.x)*.5*step(.55,v2.y)*hotz, cold=max(smoothstep(.03,0.,v1.x),smoothstep(.025,0.,vN.x)*near)*(1.-hotz);
        vec3 lin=lit(base*(.8+.4*v1.y),n,rd,.05,12.)*.04*(1.-min(1.,crack+crack2+cold*.6)*.9)*(1.-.45*heat);   /* 숯빛 · 벽 쪽 그을음 */
        /* 벽 그림자: 해 반대쪽으로 */
        vec2 so=uSun.xz/max(uSun.y,.2); float sh=0.; for(int k=1;k<=3;k++){ float h=float(k)*.8; sh=max(sh,smoothstep(1.35,.95,lavaWallD(p+so*h))*(1.-float(k)*.18)); }
        lin*=1.-sh*.6*step(1.2,wd);
        vec3 em=lavaHot(crack*.9)*(crack+crack2*.6)*pulse*(.9+.5*heat)+lavaHot(.25)*smoothstep(.12,0.,v1.x)*hotz*.05+lavaHot(.1)*heat*heat*.05;
        float amt=smoothstep(.75,.92,lnz(vec3(p*.055,3.5))+thin*.15)*.85;                                           /* 멀리 군데군데 녹은 웅덩이 */
        /* 폭포에서 흘러나오는 용암 개울 */
        int i0=uK>6.5?0:12;
        for(int i=0;i<24;i++){ if(i<i0||i>=i0+12) continue; vec4 F=uLF[i]; vec2 W=uLFw[i]; if(W.x<=0.) continue;
          vec2 q=p-F.xy, dir=F.zw, pr=vec2(-dir.y,dir.x); float s=dot(q,dir), t=dot(q,pr); float L=(2.5+3.5*W.y)*(1.+.3*lh(vec3(float(i),5.,0.)));
          if(s<-1.||s>L) continue; float k=clamp(s/L,0.,1.);
          t-=sin(s*.85+float(i)*1.7)*.55*k+(N4(p*.12+float(i)).r-.5)*1.1*k;                                      /* 굽이침 */
          float w=mix(W.x*1.5+.5,.12,k)*(1.+.3*sin(s*2.3+float(i)));                                              /* 폭포 앞 고인 웅덩이 → 가늘어짐 */
          float st=smoothstep(w,w*.35,abs(t))*smoothstep(-1.,0.,s)*(1.-smoothstep(.8,1.,k));
          if(st<=.001) continue;
          float crust=smoothstep(.5,.72,lnz(vec3((s-uT*.5)*1.6,t*3.,float(i))))*(.25+.75*k);                   /* 식은 껍질이 떠내려감 */
          float core=(1.-k)*(1.-crust)*(.7+.3*lnz(vec3(s*3.-uT*1.2,t*5.,float(i)+7.)));
          lin=mix(lin,vec3(.012,.008,.007),st*crust);
          em=mix(em,(lavaHot(.1+.6*core)*vec3(1.,.6,.4)*pulse*(.14+.26*(1.-k))*(1.-crust*.85)+lavaHot(.1)*crust*.05)*(.75+.25*core),st); }   /* 화면 변환 뒤 하얗게 타지 않게 주황 쪽으로 */
        if(amt>.01){ vec2 cr=lavaCrust(p,amt,uT); vec3 crust=vec3(.03,.02,.018)*(.7+.6*cr.y)*.04;
          lin=mix(lin,crust*max(dot(n,uSun),.2),smoothstep(0.,.35,amt)); em=mix(em,lavaHot(.3+.5*cr.x*amt)*cr.x*pulse*.9+lavaHot(.2)*smoothstep(.2,0.,abs(cr.x-.5))*.3,smoothstep(0.,.35,amt)); }
        return pow(max(lin+em,0.),vec3(.4545)); }
      /* 유적 바닥: 유적 벽과 같은 돌 — 크기가 제각각인 네모 판석을 줄마다 엇갈려 깖 · 판마다 색·기울기가 조금씩 다름 · 줄눈은 어둡게
         · 판 안에 금 · 군데군데 판이 빠져 흙과 돌 부스러기가 드러남(벽 가까이일수록 많이) · 드물게 판에 새긴 문양 고리 */
      vec3 ruinGround(vec2 p, vec3 rd, float near){
        vec2 wq=vec2(N4(p*.05).r,N4(p*.05+.4).g)-.5; vec2 q=p+wq*.4;
        float rw=1.1+.7*h2(vec2(floor(q.y/1.4),3.)); float row=floor(q.y/rw), fy=q.y/rw-row;                       /* 줄 (줄마다 폭이 다름) */
        float sl=.8+1.1*h2(vec2(row,5.)); float qx=q.x+h2(vec2(row,9.))*sl, col=floor(qx/sl), fx=qx/sl-col;          /* 판 (줄마다 길이·엇갈림이 다름) */
        vec2 id=vec2(col,row); float hid=h2(id);
        float ex=min(fx,1.-fx)*sl, ey=min(fy,1.-fy)*rw, e=min(ex,ey);
        float mort=1.-smoothstep(.02,.05,e), chip=1.-smoothstep(.04,.12,e);
        vec3 n=normalize(vec3((h2(id+.3)-.5)*.08+(N4(p*.5).b-.5)*.06,1.,(h2(id+.7)-.5)*.08+(N4(p*.5+.3).b-.5)*.06));
        float wear=N4(p*.18).r*.5+N4(p*.7).g*.3;
        vec3 base=${RTv(RUIN_TONE.floor)}*(.8+.4*hid)*(.6+wear*.8);   /* 벽 돌보다 조금 어둡고 따뜻하게 → 벽이 바닥에서 떠 보임 */
        vec2 v=lvor(p*.9+id); float crk=smoothstep(.04,.0,v.x)*step(.62,h2(id+2.));                                  /* 판 안의 금 (판마다 있거나 없음) */
        base*=1.-crk*.6; base*=1.-mort*.78; base*=1.+chip*.15*(h2(id+5.)-.4);
        float miss=step(h2(id+11.),.06+near*.3);                                                                     /* 빠진 판: 흙 + 부스러기 */
        if(miss>.5){ float gr=N4(p*2.3).a*.6+N4(p*.8).g*.4, gv=smoothstep(.6,.75,N4(p*4.1).b); base=mix(${RTv(RUIN_TONE.dirt)},${RTv(RUIN_TONE.dirt)}*2.15,gr)*(.75+.5*gv); n=normalize(vec3((N4(p*2.).b-.5)*.4,1.,(N4(p*2.+.5).b-.5)*.4)); base*=smoothstep(.0,.15,e)*.5+.5; }
        else if(hid>.96){ vec2 c=vec2(fx-.5,fy-.5)*vec2(sl,rw); float r=length(c), g=smoothstep(.05,.02,abs(r-.32))+smoothstep(.04,.015,abs(r-.18)); base*=1.-g*.6; }   /* 새긴 문양 고리 */
        return lit(base,n,rd,.08,18.)*${RUIN_TONE.glow.toFixed(3)}; }
      /* 산호 바닥 = 우주 이끼 들판 (사용자 2026-11-05: 신비로운 느낌 · 우주 식물 · 지나가면 은은히 빛났다 사라짐)
         · 작은 우주 이끼가 촘촘히 덮임: 포기마다 끝이 아주 희미하게 숨 쉬듯 빛남(포기마다 박자 다름)
         · 기체가 지나간 자리(uTr: x,z,지난 시각)의 이끼가 깨어나 청록·보라로 빛나고 5초에 걸쳐 천천히 꺼짐 → 빛나는 길이 남음
           모두 같은 색 · 숨은 기체도 길은 남김(기체는 안 보여도 지나간 길은 보임 → 쫓아가는 재미)
         · 그 위로 아주 크고 옅은 성운 안개가 천천히 흐름 */
      vec3 coralGround(vec2 p, vec3 rd){
        /* 이끼 결 (사용자 2026-11-05: 점 X): 가는 털 이끼가 한 방향으로 누운 결 — 결 방향은 큰 물결처럼 휘어 흐름 · 곳마다 길고 짧고 촘촘·성김 */
        float fa=N4(p*.018).r*4.2+N4(p*.06).g*1.2; vec2 fd=vec2(cos(fa),sin(fa)), fn=vec2(-fd.y,fd.x);
        float u=dot(p,fd), v=dot(p,fn);
        float dens=.55+.45*N4(p*.09+.3).b;                                                                    /* 촘촘한 곳 / 성긴 곳 */
        float lane=floor(v*9.), off=h2(vec2(lane,3.)), fl=.35+.9*h2(vec2(lane,7.))*dens;                        /* 털 한 가닥: 줄마다 길이·엇갈림 다름 */
        float along=fract(u/fl+off), across=fract(v*9.)-.5;
        float hair=smoothstep(.42,.05,abs(across))*smoothstep(0.,.25,along)*smoothstep(1.,.55,along)*step(.25,h2(vec2(lane,floor(u/fl+off))));
        float thick=smoothstep(.3,.75,N4(p*.035+.7).g);                                                         /* 이끼가 두껍게 뭉친 곳 / 얇아 바닥이 비치는 곳 */
        float cover=mix(.25,1.,thick)*(.6+.4*hair);
        vec3 ground=mix(vec3(.01,.022,.026),vec3(.022,.015,.03),N4(p*.05).g);
        vec3 moss=mix(vec3(.018,.07,.065),vec3(.055,.032,.085),N4(p*.025+.4).r)*(.75+.5*hair);
        vec3 n=normalize(vec3(fd.x*(along-.5)*.5*hair+(N4(p*.6).b-.5)*.06,1.,fd.y*(along-.5)*.5*hair+(N4(p*.6+.3).b-.5)*.06));   /* 누운 털이 빛을 받는 결 */
        vec3 c=lit(mix(ground,moss,cover),n,rd,.14,16.)*.5;
        vec3 glowC=mix(vec3(.15,.9,.75),vec3(.6,.4,1.),N4(p*.04+.2).r*.8+.1*sin(uT*.3+p.x*.05));
        float idle=(.5+.5*sin(uT*.5+N4(p*.07).g*12.))*.03*hair*thick;                                           /* 평소: 결 끝이 아주 희미하게 숨 쉼 */
        vec2 tu=(p-uTrO.xy)/uTrO.z; float wake=0.;                                                                /* 빛 길 지도(trailmap.js)에서 한 번 읽음 */
        if(tu.x>0.&&tu.x<1.&&tu.y>0.&&tu.y<1.) wake=pow(texture2D(uTrail,tu).r,1.6);
        /* 빛 길: 결을 따라 번지는 띠 — 가운데 밝고, 가장자리는 털 결 사이로 스며들며 옅어짐 */
        /* 빛 길 (사용자 2026-11-05: 더 밝고 아름답게)
           · 색: 갓 깨어난 가운데는 맑은 청록 → 가장자리와 식어 가는 쪽은 보라 → 다 꺼지기 직전 남는 분홍빛 여운
           · 결을 따라 빛 물결이 흘러감(털 끝이 차례로 반짝) · 가운데 부드러운 빛 번짐
           · 반딧불 알갱이: 깨어난 자리에서 작은 빛 점이 깜빡이며 떠오르듯 사라짐 */
        float band=smoothstep(.0,.35,wake), edge=wake*(.35+.65*hair);
        vec3 cCore=vec3(.25,1.,.85), cMid=vec3(.55,.45,1.15), cTail=vec3(.9,.4,.85);
        vec3 tc=mix(cTail,mix(cMid,cCore,smoothstep(.45,.9,wake)),smoothstep(.05,.4,wake));
        float flow=.6+.4*sin(u*3.1-uT*2.4+N4(p*.2).r*6.);                                                      /* 결을 따라 흐르는 빛 물결 */
        vec2 gq=p*2.6; vec2 gid=floor(gq); float gh=h2(gid+11.); vec2 gf=fract(gq)-.5-vec2(h2(gid+3.)-.5,h2(gid+5.)-.5)*.6;
        float mote=step(.82,gh)*exp(-dot(gf,gf)*70.)*(.5+.5*sin(uT*(2.+gh*3.)+gh*50.))*band;                     /* 반딧불 알갱이 */
        c+=glowC*idle;
        c+=tc*(edge*.85*cover*flow+band*.12*cover+wake*wake*.3)+mix(cCore,vec3(1.),.4)*mote*.9;
        float m1=smoothstep(.5,.85,N4(p*.012+vec2(uT*.002,uT*.001)).r), m2=smoothstep(.55,.9,N4(p*.018-vec2(uT*.0015,0.)).g);
        c+=vec3(.015,.07,.065)*m1*.35+vec3(.055,.025,.08)*m2*.3;                                               /* 크고 옅은 성운 안개 */
        return c; }
      /* 자수정 바닥: 결정과 같은 세상 — 짙은 보랏빛 회색 바위판(깨진 판, 판마다 색·기울기 다름)
         · 금 속에 자라난 작은 결정 결: 금을 따라 가는 보라 결정이 박혀, 보는 각도에 따라 반짝 (판 그림을 읽기만 해서 가벼움)
         · 바위 겉에 박힌 결정 알갱이가 해 쪽에서 볼 때 반짝 · 결정 무리 가까이는 보랏빛 가루가 더 많음 */
      vec3 crystalGround(vec2 p, vec3 rd){
        vec2 wq=(N4(p*.04).rg-.5)*1.2; vec3 v=vorB(p*.45+wq), v2=vorB(p*1.4+5.+wq);
        vec3 n=normalize(vec3((v.y-.5)*.22+(N4(p*.5).b-.5)*.08,1.,(v.z-.5)*.22+(N4(p*.5+.3).b-.5)*.08));
        vec3 base=mix(vec3(.055,.045,.07),vec3(.085,.07,.1),v.y)*(.75+.5*N4(p*.25).a);
        float crk=smoothstep(.035,0.,v.x), crk2=smoothstep(.02,0.,v2.x)*step(.5,v2.z);
        base*=1.-max(crk,crk2*.7)*.75;
        vec3 c=lit(base,n,rd,.15,30.)*.55;
        vec3 hv=normalize(uSun-rd);
        float vein=smoothstep(.06,.0,v.x)*smoothstep(.3,.7,N4(p*.08+.6).g);                                            /* 금 속 결정 결 */
        float gl=pow(max(dot(normalize(vec3((N4(p*3.).r-.5)*1.6,1.,(N4(p*3.+.4).g-.5)*1.6)),hv),0.),24.);
        c+=vec3(.5,.25,.9)*vein*(.05+.5*gl);
        vec2 gq=p*4.; vec2 gid=floor(gq); float gh=h2(gid+21.); vec2 gf=fract(gq)-.5;
        if(gh>.94){ vec3 gn=normalize(vec3(h2(gid+1.)-.5,.7,h2(gid+2.)-.5)); float sp=pow(max(dot(gn,hv),0.),60.)*exp(-dot(gf,gf)*50.);   /* 박힌 결정 알갱이 */
          c+=mix(vec3(.7,.5,1.2),vec3(1.,.85,1.1),fract(gh*37.))*sp*1.6; }
        return c; }
      /* 맵 1구역 바닥 (2026-11-05): 맵 7안 지역 그림(v7.png R=지역번호×12)에서 지역을 읽어 그 땅 바닥을 깖
         사냥터 = 방 1·3·5·7·9 얼음 / 2·4·6·8·10 용암 · 보물 땅 = 유적 판석 · 산호 정글 = 우주 이끼 · 보스존(16)·맵 밖 = 별빛 우주 · 길·방(0) = 별빛 유리 */
      vec3 mapGround(vec2 p, vec3 ro, vec3 rd){
        vec2 tu=(p+180.+(N4(p*.21).rg-.5)*1.6)/360.; float id=floor(texture2D(uReg,tu).r*255./12.+.5);   /* 지역 경계를 살짝 흔들어 칸 계단을 없앰 */
        float th=atan(p.y,p.x); float sec=mod(floor((th+1.5708+.31416)/.62832),10.);
        vec3 sky=deep(ro,rd);
        if(id>16.5||id>15.5) return sky;
        if(id>10.5) return ruinGround(p,rd,0.);
        if(id>2.5&&id<3.5) return coralGround(p,rd);
        if(id>.5&&id<1.5) return mod(sec,2.)<.5?iceGround(p,rd,0.):lavaGround(p,rd,0.);
        /* 별빛 유리 길: 하늘이 비치는 막 + 은은한 육각 결 */
        vec2 hp=p*.55; vec2 r=vec2(1.,1.732); vec2 ha=mod(hp,r)-r*.5, hb=mod(hp-r*.5,r)-r*.5; vec2 hg=dot(ha,ha)<dot(hb,hb)?ha:hb;
        vec2 ah=abs(hg); float hd=max(dot(ah,normalize(vec2(1.,1.732))),ah.x); float edge=1.-smoothstep(.0,.035,abs(hd-.5));
        float fr=pow(1.-max(-rd.y,0.),4.); return sky+vec3(.12,.16,.28)*fr*.35+vec3(.35,.55,.95)*edge*.035; }
      void main(){
        vec3 ro=cameraPosition, rd=normalize(vW-ro); gRdW=length(fwidth(rd.xz)); vec2 p=vW.xz; float dist=length(p-ro.xz); vec3 c;
        if(uK>11.5){ c=mapGround(p,ro,rd); }
        else if(uK<.5){ /* 금속 판: 4m 판 · 이음매 · 모서리로 갈수록 살짝 둥글게 깎임(빛 받는 턱) · 볼트 · 긁힘 · 얼룩 */
          float S=4.; vec2 cl=floor(p/S), f=p-cl*S; vec2 e2=min(f,S-f); float e=min(e2.x,e2.y);
          vec2 sg=vec2(f.x<S*.5?-1.:1., f.y<S*.5?-1.:1.); float bx=1.-smoothstep(.03,.16,e2.x), bz=1.-smoothstep(.03,.16,e2.y);
          vec4 a=N4(p*.012), b=N4(vec2(p.x*.9,p.y*.035)+cl*.37);
          vec3 n=normalize(vec3(sg.x*bx*.55+(a.b-.5)*.05, 1., sg.y*bz*.55+(a.a-.5)*.05));
          float tone=h2(cl)*.07-.035; float grime=smoothstep(.35,.8,a.r)*.18; float scr=smoothstep(.62,.7,b.b)*.06;
          vec3 base=vec3(.19,.2,.225)*(1.+tone)-grime*vec3(.05,.045,.04)+scr;
          float seam=1.-smoothstep(.012,.035,e); base*=1.-seam*.75;
          vec2 bq=f-vec2(f.x<S*.5?.32:S-.32, f.y<S*.5?.32:S-.32); float bd=length(bq); float bolt=1.-smoothstep(.05,.075,bd);
          vec3 bn=normalize(vec3(bq/.075*.8*bolt,1.)); n=normalize(mix(n,bn,bolt));
          base=mix(base,vec3(.26,.26,.27),bolt*.8);
          c=lit(base,n,rd,.35*(1.-grime*2.),36.);
        } else if(uK<1.5){ /* 이끼 낀 암반: 큰 높낮이 + 잔돌, 낮은 곳에 이끼, 갈라진 금 */
          float e=.35; float h=N4(p*.018).r*.75+N4(p*.07).b*.25;
          float hx=N4((p+vec2(e,0.))*.018).r*.75+N4((p+vec2(e,0.))*.07).b*.25, hz=N4((p+vec2(0.,e))*.018).r*.75+N4((p+vec2(0.,e))*.07).b*.25;
          vec3 n=normalize(vec3(-(hx-h)/e*2.2, 1., -(hz-h)/e*2.2));
          float cr=abs(N4(p*.03+.21).g-.5); float wv=.006+.014*N4(p*.11).r; float crack=1.-smoothstep(wv*.4,wv,cr); float lip=smoothstep(wv,wv*1.6,cr)*(1.-smoothstep(wv*1.6,wv*3.,cr));
          float moss=smoothstep(.52,.36,h)*smoothstep(.4,.6,N4(p*.05+.5).g);
          float peb=N4(p*.35).a; vec3 rock=mix(vec3(.2,.19,.17),vec3(.27,.25,.22),peb)*(.8+.4*h);
          vec3 base=mix(rock,vec3(.13,.2,.1)*(.9+.3*peb),moss); base*=1.-crack*.85; base+=vec3(.05,.045,.04)*lip*(1.-moss);
          c=lit(base,n,rd,.08*(1.-moss),18.);
        } else if(uK<2.5){ /* 결정 모래: 바람 물결(비대칭: 바람 맞는 쪽 완만, 뒤쪽 가파름) + 결정 반짝임 */
          vec2 dir=normalize(vec2(.8,.6)); float w=N4(p*.015).g; float ph=dot(p,dir)*1.25+w*9.+N4(p*.06).r*1.5;
          float s=sin(ph), cs=cos(ph); float slope=cs*(s>0.?.7:1.4);
          vec3 n=normalize(vec3(-dir.x*slope*.22+(N4(p*.4).b-.5)*.12, 1., -dir.y*slope*.22+(N4(p*.4+.3).b-.5)*.12));
          vec3 base=vec3(.34,.29,.22)*(.86+.2*N4(p*.02).r)+vec3(.02)*s;
          c=lit(base,n,rd,.05,12.);
          vec2 gq=p*3.2; vec2 gc=floor(gq); float gh=h2(gc);
          if(gh>.965){ vec2 gf=fract(gq)-.5; vec3 gn=normalize(vec3(h2(gc+1.)-.5,1.2,h2(gc+2.)-.5)); vec3 hv=normalize(uSun-rd);
            float sp=pow(max(dot(gn,hv),0.),90.)*exp(-dot(gf,gf)*40.); c+=mix(vec3(.6,.9,1.3),vec3(1.3,.8,1.1),fract(gh*31.))*sp*3.; }
        } else if(uK<3.5){ /* 은은한 평지: 큰 얼룩 + 고운 결 (거의 무늬 없음) */
          float a=N4(p*.008).r, g=N4(p*.5).a, g2=N4(p*.13).b;
          vec3 n=normalize(vec3((g-.5)*.06+(g2-.5)*.08, 1., (N4(p*.5+.4).a-.5)*.06));
          vec3 base=vec3(.17,.19,.22)*(.88+.22*a)+vec3(.012)*(g2-.5);
          c=lit(base,n,rd,.06,20.);
        } else if(uK>10.5){ /* 숨을 곳 시안 칸: 은은한 유적 판석 바닥 */
          c=ruinGround(p,rd,0.);
        } else if(uK>9.5){ /* 자수정 꽃 무리 칸: 자수정은 보스존을 두르는 벽 (사용자 2026-11-05) → 벽 안쪽(먼 쪽)은 바닥 없는 보스존 별빛 우주 · 바깥쪽만 자수정 바닥
             땅 가장자리는 결정 무리 밑에서 들쭉날쭉 끝남(결정에 가려 보이지 않는 자리) */
          float wl=-12.+sin(p.x*.12+(p.x>0.?1.:0.))*1.2, edgeN=(N4(p*.15).r-.5)*1.4;
          /* 우주와 땅을 둘 다 같은 길로 계산한 뒤 고름 — 갈림길 안에서 그림(구름 그림)을 읽으면 갈림 경계(문 양옆 선)에서 읽는 크기가 깨져 우주 쪽으로 줄이 생김 */
          vec3 sp=deep(ro,rd), gr=crystalGround(p,rd); bool spc=(p.y<wl+edgeN&&abs(p.x)>3.)||p.y<wl-1.5+edgeN;
          c=spc?sp:gr;
        } else if(uK>8.5){ /* 성운 산호 벽 칸: 산호 바닥 */
          c=coralGround(p,rd);
        } else if(uK>7.5){ /* 고대 유적 벽 칸: 유적 바닥 (벽 줄 z=-12 가까이 더 부서짐) */
          c=ruinGround(p,rd,smoothstep(5.,1.5,abs(p.y+12.)));
        } else if(uK>6.5){ /* 용암 바위 벽 칸: 용암 땅 */
          c=lavaGround(p,rd,0.);
        } else if(uK>5.5){ /* 얼음 벽 칸: 얼음 땅 (벽 줄 z=-12 가까이 눈 두껍게) */
          c=doorFx(p,iceGround(p,rd,smoothstep(9.,2.,abs(p.y+12.))));
        } else if(uK<4.5){ /* 보스존: 바닥도 그림자도 없는 우주 */
          c=deep(ro,rd);
        } else { /* 이음 시험: 얼음 땅 · 용암 땅 · 둘을 잇는 별빛 유리 큰길 */
          float sI=sdBlob(p,vec2(-30.,0.),0.), sL=sdBlob(p,vec2(30.,0.),2.1);
          float road=max(abs(p.y)-4.,abs(p.x)-30.);
          bool ice=sI<sL; float sd=min(sI,sL);
          /* 층: 맨 밑은 별빛 유리 한 장(큰길 = 땅이 없는 자리), 지역 땅은 그 위에 덮인 껍질.
             땅은 지역 안에선 길 위까지 다 덮음 · 문(벽 틈) 안쪽 3m만 조각으로 부서져 아래 유리가 드러남 · 땅 밖 길은 유리 다리
             → 유리는 보이는 곳에서만 계산(덮인 곳은 땅만) */
          float isl=N4(p*.085+(ice?0.:.37)).r*.6+N4(p*.24).g*.4; isl=clamp((isl-.5)*3.2+.5,0.,1.);
          float doorZ=smoothstep(.6,-.4,road);                        /* 길 띠 안 (문 앞) */
          float need=doorZ*mix(-.05,1.02,smoothstep(-3.4,0.,sd));      /* 문에 가까울수록 많이 부서짐 · 지역 깊숙이는 온전 */
          float keepF=(isl-need)*5.+smoothstep(.02,-.02,need);   /* 부서지지 않는 자리(need≤0)는 땅이 늘 온전 — 띠 가장자리에 유리가 반쯤 비쳐 회색 줄이 생기던 것 막음 */
          vec2 so=-uSun.xz/uSun.y*.35; float isl2=N4((p-so)*.085+(ice?0.:.37)).r*.6+N4((p-so)*.24).g*.4; isl2=clamp((isl2-.5)*3.2+.5,0.,1.);
          float sdS=min(sdBlob(p-so,vec2(-30.,0.),0.),sdBlob(p-so,vec2(30.,0.),2.1));
          float needS=smoothstep(.6,-.4,max(abs(p.y-so.y)-4.,abs(p.x-so.x)-30.))*mix(-.05,1.02,smoothstep(-3.4,0.,sdS));
          float landM=smoothstep(-.06,.06,keepF)*step(sd,0.);
          float lip=landM*(1.-smoothstep(.0,.45,keepF))*doorZ*smoothstep(.0,.12,need);   /* 실제로 부서지는 자리(문 앞 가장자리)에만 · 땅 한가운데엔 안 묻음 */        /* 부서진 가장자리: 땅의 두께가 보이는 옆면 (문턱에서만) */
          vec3 sky=deep(ro,rd);
          vec3 land=vec3(0.);
          if(landM>.01){
            if(ice){ /* 얼음 땅: 벽에 맞춘 눈·얼음 땅 · 벽 가까이일수록 눈 두껍게 · 문턱 얇은 곳은 아래 유리·별이 비침 */
              float thin=doorZ*smoothstep(-3.,0.,sd);
              land=doorFx(p,iceGround(p,rd,smoothstep(-7.,-1.5,sI)));
              land=mix(land,mix(vec3(.05,.08,.11),SNOW_SH*.85,gSnow),lip*.8);            /* 부서진 옆면: 얼음은 짙게, 눈은 눈 그늘색 */
            } else { /* 용암: 검은 현무암 껍질 · 숨 쉬듯 빛나는 붉은 결 · 부서진 옆면은 속이 붉게 */
              float thin=doorZ*smoothstep(-3.,0.,sd); float pulse=.7+.3*sin(uT*1.6+N4(p*.02).r*12.);
              land=lavaGround(p,rd,thin);
              land=mix(land,vec3(.5,.13,.02)*(.6+.4*pulse),lip*.85);
            } }
          vec3 g=sky;
          bool glassHere=road<0.||(sd<0.&&doorZ>.01);
          if(landM<.99&&glassHere){ /* 유리: 하늘이 비치는 막 · 육각 결(늘 은은 + 기체 둘레) · 테두리 빛 없음(유리는 땅 밑으로 이어짐) */
            float fr=pow(1.-max(-rd.y,0.),4.); g=sky+vec3(.12,.16,.28)*fr*.35;
            vec2 hp=p*.55; vec2 r=vec2(1.,1.732); vec2 ha=mod(hp,r)-r*.5, hb=mod(hp-r*.5,r)-r*.5; vec2 hg=dot(ha,ha)<dot(hb,hb)?ha:hb;
            vec2 ah=abs(hg); float hd=max(dot(ah,normalize(vec2(1.,1.732))),ah.x); float edge=1.-smoothstep(.0,.035,abs(hd-.5));
            float near=0.; vec3 refl=vec3(0.);
            for(int i=0;i<2;i++){ vec4 s=uShips[i]; if(s.w<.5) continue; vec2 d=p-s.xz; float r2=dot(d,d);
              near=max(near,exp(-r2/40.)); refl+=(s.w>1.5?vec3(1.,.35,.45):vec3(.35,.55,1.2))*exp(-r2/5.)*.07; }
            float flow=pow(.5+.5*sin(p.x*.35-uT*1.4),6.);
            g+=vec3(.35,.55,.95)*edge*(.03+near*.18+flow*.04)+refl;
            /* 땅 조각 가까이: 서리/열기가 번짐 + 땅이 유리 위에 얹힌 그림자(해 반대쪽으로 살짝) */
            float nearL=smoothstep(-.9,0.,keepF)*step(sd,.3);
            if(ice){ float fz=smoothstep(.45,.8,N4(p*.5).b)*nearL; g+=vec3(.45,.65,.85)*fz*.18; }
            else g+=vec3(.5,.12,.02)*nearL*(.12+.05*sin(uT*1.6+p.x));
            float keepS=(isl2-needS)*5.+smoothstep(.02,-.02,needS); float sh=smoothstep(-.5,.1,keepS)*step(sdS,0.);
            g*=1.-sh*.6; }
          c=glassHere?mix(g,land,landM):(sd<0.?land:sky);
        }
        if(uK<3.5) c*=.13;   /* 화면에 나올 때 밝게 올라가므로 실제 값은 어둡게 — 우주 게임 밤 바닥 밝기 */
        /* 멀어질수록 깊은 색으로 가라앉음 (보스존은 우주가 원래 깊으니 약하게) */
        float fog=smoothstep(55.,150.,dist); c=mix(c,uK<3.5?vec3(.006,.008,.014):c*.7,fog*(uK<3.5?.85:.4));
        gl_FragColor=vec4(c,1.); }` });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat); plane.rotation.x = -Math.PI / 2; plane.renderOrder = -1;
  return { mesh: plane, mat, ships,
    set(i) { mat.uniforms.uK.value = i; },
    update(t) { mat.uniforms.uT.value = t; } };
}
