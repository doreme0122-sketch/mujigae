/* 바닥 시험판 — 일반 맵 바닥 후보 넷 + 가운데 보스존 별빛 우주 (사용자 2026-11-04: 일반 바닥은 단순하게, 보스존만 공허한 별빛 우주, 거기도 그림자는 보여야 함)
   판 하나(그리기 1번)에 모든 바닥을 담고 uK로 고른다. 무늬는 이어 붙여도 이음새 없는 구름 그림(256) 하나를 구워 두고 읽기만 함.
   · 바닥은 납작한 색이 아니라 '빛을 받는 면': 높낮이 → 기울기 → 해 쪽은 밝고 반대는 어두움. 그래야 위에 뜬 기체와 그림자가 땅 위에 있는 걸로 읽힘
   · 멀어질수록 깊은 색으로 가라앉힘 (가까운 싸움터가 또렷하게)
   0 금속 판 · 1 이끼 낀 암반 · 2 결정 섞인 모래 · 3 은은한 평지 · 4 보스존 별빛 우주(보이지 않는 유리 바닥 + 아래로 깊은 별 세 겹) */
import * as THREE from 'three';
import { SNOW_GLSL } from './snowtone.js?v=11042330';

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
  { id: 'walls', name: '빙하 얼음 벽', tip: '벽 한 줄이 처음부터 끝까지 한 덩어리 절벽이에요. 앞뒤 면은 수직 절벽에 세로 결이 깊게 패여 있고, 윗단은 구간마다 한 단씩 높이가 달라 계단처럼 층져요. 윗단엔 눈이 덮이고 고드름이 늘어져요. 문 양옆이 가장 높이 솟았다가 수직으로 끊겨요.' }];

/* 이음 시험 자리 (그림과 JS가 같은 식): 얼음 땅 가운데 (-30,0) · 용암 땅 (30,0) · 큰길 = 두 가운데를 잇는 폭 8m 띠 */
export const JOIN = { ice: [-30, 0], lava: [30, 0], R: 22, roadW: 4, roadX: 30 };
export const blobR = (dx, dz, R, ph) => { const a = Math.atan2(dz, dx); return R * (1 + .1 * Math.sin(3 * a + 1.3 + ph) + .06 * Math.sin(5 * a - .7 + ph * 2) + .04 * Math.sin(9 * a + 2 + ph)); };
export const sdBlob = (x, z, c, ph) => Math.hypot(x - c[0], z - c[1]) - blobR(x - c[0], z - c[1], JOIN.R, ph);
export const sdRoad = (x, z) => Math.max(Math.abs(z) - JOIN.roadW, Math.abs(x) - JOIN.roadX);

export function makeFloorLab() {
  const noise = bakeNoise();
  const ships = Array.from({ length: 2 }, () => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({ depthWrite: true,
    uniforms: { uN: { value: noise }, uK: { value: 0 }, uT: { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .78, -.42).normalize() }, uShips: { value: ships }, uIV: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform sampler2D uN; uniform float uK, uT; uniform vec3 uSun; uniform vec4 uShips[2]; uniform float uIV;
      float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      vec4 N4(vec2 p){ return texture2D(uN,p); }
      const vec3 SUN=vec3(1.,.94,.86), SKY=vec3(.42,.48,.62), GND=vec3(.16,.12,.1);
      vec3 lit(vec3 base, vec3 n, vec3 rd, float spec, float sh){ float d=max(dot(n,uSun),0.); vec3 amb=mix(GND,SKY,n.y*.5+.5)*.55;
        vec3 hv=normalize(uSun-rd); float s=pow(max(dot(n,hv),0.),sh)*spec; return base*(amb+SUN*d*1.05)+SUN*s; }
      /* 별 한 겹: 시선이 깊이 D 판에 닿는 자리의 칸마다 별 하나 (있을 수도 없을 수도) */
      vec3 starLayer(vec3 ro, vec3 rd, float D, float cs, float th, float br, float seed){
        vec2 q=ro.xz+rd.xz*((ro.y+D)/max(-rd.y,.05)); vec2 g=floor(q/cs), f=q/cs-g; float h=h2(g+seed);
        if(h<th) return vec3(0.); vec2 o=vec2(h2(g*1.7+seed),h2(g*2.3-seed))*.7+.15; float d=length(f-o)*cs;
        float tw=.65+.35*sin(uT*(1.+h*3.)+h*40.); float r=.05+.09*fract(h*13.);
        vec3 col=mix(vec3(.7,.8,1.15),vec3(1.1,.95,.8),fract(h*7.));
        return col*(exp(-d*d/(r*r))*1.4+exp(-d/(r*5.))*.12)*br*tw; }
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
      vec3 vor(vec2 x){ vec2 n=floor(x), f=fract(x), mg=vec2(0.), mr=vec2(0.); float md=8.;
        for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=vec2(h2(n+g),h2(n+g+17.3))*.85+.075; vec2 r=g+o-f; float d=dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
        md=8.; for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=mg+vec2(float(i),float(j)); vec2 o=vec2(h2(n+g),h2(n+g+17.3))*.85+.075; vec2 r=g+o-f;
          vec2 dd=r-mr; if(dot(dd,dd)>1e-5) md=min(md,dot(.5*(mr+r),normalize(dd))); }
        return vec3(md,h2(n+mg+3.1),h2(n+mg+9.7)); }
      /* 얼음 땅 (벽과 같은 세상): 눈 많이(uIV 0) / 얼음 많이 + 눈 조금(uIV 1)
         · 색은 벽에서 가져옴: 눈 = 새하양 + 푸른 그늘, 얼음 = 밝은 하늘색 + 하얀 금 + 금 속 푸른 빛
         · 모양도 벽처럼 각지게: 얼음은 깨진 판(각진 조각)들, 눈 가장자리도 판 금을 따라 꺾임
         · 두께: 눈은 바람에 쌓인 언덕 — 해 쪽은 볼록하게 밝고, 반대쪽 얼음 위로 그림자가 짐
         · edge = 벽 가까이일수록 눈이 두꺼움(벽 발치 눈밭과 이어짐) */
      float snowF(vec2 p, float cell){ vec2 wd=vec2(.82,.57); return N4(p*.02).r*.72+N4(p*.07).g*.18+sin(dot(p,wd)*1.6+N4(p*.05).b*7.)*.03+(cell-.5)*.22; }
      vec3 iceGround(vec2 p, vec3 rd, float edge){
        vec2 wq=(N4(p*.04).rg-.5)*1.1+(N4(p*.16).ba-.5)*.25; vec3 v=vor(p*.3+wq), v2=vor(p*1.1+7.+wq*2.);   /* 판 모양이 고르지 않게 살짝 비틂 */                                   /* 큰 판 3m 남짓 · 그 안의 잔 판 */
        float th=mix(.34,.62,uIV)-edge*.45;
        float S=snowF(p,v.y); float snow=smoothstep(th-.012,th+.012,S);
        float dep=clamp((S-th)/.1,0.,1.);                                    /* 가장자리에서 얼마나 안쪽인지 = 눈 두께 */
        /* 눈: 언덕 기울기(가장자리일수록 가파름) */
        float e=.25; vec2 gS=vec2(snowF(p+vec2(e,0.),v.y)-S, snowF(p+vec2(0.,e),v.y)-S)/e;
        vec2 wd=vec2(.82,.57); float rp=cos(dot(p,wd)*1.9+N4(p*.05).g*8.)*.07;   /* 바람 물결 */
        vec3 nS=normalize(vec3(-gS.x*(1.-dep)*26.-wd.x*rp+(N4(p*.7).b-.5)*.05, 1., -gS.y*(1.-dep)*26.-wd.y*rp+(N4(p*.7+.3).b-.5)*.05));
        float dS=dot(nS,uSun);
        vec3 snowLit=SNOW_LIT, snowSh=SNOW_SH;
        vec3 cs=snowTone(nS,-rd,vec3(p.x,0.,p.y),uSun,uT);                       /* 벽 눈과 같은 계산 */
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
        /* 눈 그림자: 해 반대쪽 얼음 위 · 눈가루: 경계 앞에 흩날림 */
        vec2 so=-uSun.xz/max(uSun.y,.2)*.8; float sh=smoothstep(th-.01,th+.02,snowF(p-so,v.y))*(1.-snow);
        ci*=1.-sh*.45; ci=mix(ci,ci*vec3(.75,.88,1.05),sh*.5);
        float dust=smoothstep(th-.07,th-.005,S)*(1.-snow)*smoothstep(.45,.75,N4(p*.45).g);
        ci=mix(ci,mix(snowSh,snowLit,.6),dust*.45);
        vec3 c=mix(ci,cs,snow);
        float rim=snow*(1.-smoothstep(.0,.25,dep))*smoothstep(.3,.9,dS); c+=vec3(.05)*rim;   /* 해 받는 눈 언덕 턱 */
        gSnow=snow; return c; }
      void main(){
        vec3 ro=cameraPosition, rd=normalize(vW-ro); vec2 p=vW.xz; float dist=length(p-ro.xz); vec3 c;
        if(uK<.5){ /* 금속 판: 4m 판 · 이음매 · 모서리로 갈수록 살짝 둥글게 깎임(빛 받는 턱) · 볼트 · 긁힘 · 얼룩 */
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
        } else if(uK>5.5){ /* 얼음 벽 칸: 얼음 땅 (벽 줄 z=-12 가까이 눈 두껍게) */
          c=iceGround(p,rd,smoothstep(9.,2.,abs(p.y+12.)));
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
          float keepF=(isl-need)*5.;
          vec2 so=-uSun.xz/uSun.y*.35; float isl2=N4((p-so)*.085+(ice?0.:.37)).r*.6+N4((p-so)*.24).g*.4; isl2=clamp((isl2-.5)*3.2+.5,0.,1.);
          float sdS=min(sdBlob(p-so,vec2(-30.,0.),0.),sdBlob(p-so,vec2(30.,0.),2.1));
          float needS=smoothstep(.6,-.4,max(abs(p.y-so.y)-4.,abs(p.x-so.x)-30.))*mix(-.05,1.02,smoothstep(-3.4,0.,sdS));
          float landM=smoothstep(-.06,.06,keepF)*step(sd,0.);
          float lip=landM*(1.-smoothstep(.0,.45,keepF))*doorZ;        /* 부서진 가장자리: 땅의 두께가 보이는 옆면 (문턱에서만) */
          vec3 sky=deep(ro,rd);
          vec3 land=vec3(0.);
          if(landM>.01){
            if(ice){ /* 얼음 땅: 벽에 맞춘 눈·얼음 땅 · 벽 가까이일수록 눈 두껍게 · 문턱 얇은 곳은 아래 유리·별이 비침 */
              float thin=doorZ*smoothstep(-3.,0.,sd);
              land=iceGround(p,rd,smoothstep(-7.,-1.5,sI));
              land=mix(land,sky*1.3+vec3(.004,.012,.02),thin*.35*(1.-gSnow));                    /* 유리가 비치는 건 얼음 부분만 · 눈은 그대로 하얗게 */
              land=mix(land,mix(vec3(.05,.08,.11),SNOW_SH*.85,gSnow),lip*.8);            /* 부서진 옆면: 얼음은 짙게, 눈은 눈 그늘색 */
            } else { /* 용암: 검은 현무암 껍질 · 숨 쉬듯 빛나는 붉은 결 · 부서진 옆면은 속이 붉게 */
              float e=.35; float h=N4(p*.035+.4).r*.6+N4(p*.14).b*.4, hx=N4((p+vec2(e,0.))*.035+.4).r*.6+N4((p+vec2(e,0.))*.14).b*.4, hz=N4((p+vec2(0.,e))*.035+.4).r*.6+N4((p+vec2(0.,e))*.14).b*.4;
              vec3 n=normalize(vec3(-(hx-h)/e*2.,1.,-(hz-h)/e*2.));
              float thin=doorZ*smoothstep(-3.,0.,sd); float v=abs(N4(p*.04+.9).g-.5), w=.01+.03*thin, vein=1.-smoothstep(w*.3,w,v);
              float pulse=.7+.3*sin(uT*1.6+N4(p*.02).r*12.);
              vec3 base=mix(vec3(.05,.045,.045),vec3(.1,.085,.08),h);
              land=lit(base,n,rd,.25,40.)*.13*(1.-vein)+vec3(1.1,.28,.04)*vein*pulse*(.45+.55*thin);
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
            float keepS=(isl2-needS)*5.; float sh=smoothstep(-.5,.1,keepS)*step(sdS,0.);
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
