/* 바닥 시험판 — 일반 맵 바닥 후보 넷 + 가운데 보스존 별빛 우주 (사용자 2026-11-04: 일반 바닥은 단순하게, 보스존만 공허한 별빛 우주, 거기도 그림자는 보여야 함)
   판 하나(그리기 1번)에 모든 바닥을 담고 uK로 고른다. 무늬는 이어 붙여도 이음새 없는 구름 그림(256) 하나를 구워 두고 읽기만 함.
   · 바닥은 납작한 색이 아니라 '빛을 받는 면': 높낮이 → 기울기 → 해 쪽은 밝고 반대는 어두움. 그래야 위에 뜬 기체와 그림자가 땅 위에 있는 걸로 읽힘
   · 멀어질수록 깊은 색으로 가라앉힘 (가까운 싸움터가 또렷하게)
   0 금속 판 · 1 이끼 낀 암반 · 2 결정 섞인 모래 · 3 은은한 평지 · 4 보스존 별빛 우주(보이지 않는 유리 바닥 + 아래로 깊은 별 세 겹) */
import * as THREE from 'three';

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
  { id: 'join', name: '얼음·용암 + 유리 길', tip: '왼쪽 얼음 땅, 오른쪽 용암 땅. 둘을 잇는 큰길은 별빛 위 유리예요. 땅은 길 쪽으로 갈수록 얇아지다 조각으로 부서져 우주에 떠요. 얼음은 서리가 유리로 번지고, 용암은 붉은 틈이 비쳐요. 벽 틈이 곧 문이에요.' }];

/* 이음 시험 자리 (그림과 JS가 같은 식): 얼음 땅 가운데 (-30,0) · 용암 땅 (30,0) · 큰길 = 두 가운데를 잇는 폭 8m 띠 */
export const JOIN = { ice: [-30, 0], lava: [30, 0], R: 22, roadW: 4, roadX: 30 };
export const blobR = (dx, dz, R, ph) => { const a = Math.atan2(dz, dx); return R * (1 + .1 * Math.sin(3 * a + 1.3 + ph) + .06 * Math.sin(5 * a - .7 + ph * 2) + .04 * Math.sin(9 * a + 2 + ph)); };
export const sdBlob = (x, z, c, ph) => Math.hypot(x - c[0], z - c[1]) - blobR(x - c[0], z - c[1], JOIN.R, ph);
export const sdRoad = (x, z) => Math.max(Math.abs(z) - JOIN.roadW, Math.abs(x) - JOIN.roadX);

export function makeFloorLab() {
  const noise = bakeNoise();
  const ships = Array.from({ length: 2 }, () => new THREE.Vector4(0, 0, 0, 0));
  const mat = new THREE.ShaderMaterial({ depthWrite: true,
    uniforms: { uN: { value: noise }, uK: { value: 0 }, uT: { value: 0 }, uSun: { value: new THREE.Vector3(-.45, .78, -.42).normalize() }, uShips: { value: ships } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `precision highp float; varying vec3 vW; uniform sampler2D uN; uniform float uK, uT; uniform vec3 uSun; uniform vec4 uShips[2];
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
        } else if(uK<4.5){ /* 보스존: 바닥도 그림자도 없는 우주 */
          c=deep(ro,rd);
        } else { /* 이음 시험: 얼음 땅 · 용암 땅 · 둘을 잇는 별빛 유리 큰길 */
          float sI=sdBlob(p,vec2(-30.,0.),0.), sL=sdBlob(p,vec2(30.,0.),2.1);
          float road=max(abs(p.y)-4.,abs(p.x)-30.);
          bool ice=sI<sL; float sd=min(sI,sL);
          /* 땅은 길에서 멀어질수록 단단, 길 쪽 3m는 조각으로 부서짐(구멍 사이로 우주) */
          /* 조각: 길에서 4m 안쪽은 땅이 조각으로 부서져 떠 있음 — 길에 가까울수록 조각이 작고 드묾 */
          float isl=N4(p*.085+(ice?0.:.37)).r*.6+N4(p*.24).g*.4; isl=clamp((isl-.5)*3.2+.5,0.,1.);
          float need=mix(1.02,-.05,smoothstep(.4,6.,road));          /* 이만큼 넘어야 땅이 남음 (길에 가까울수록 높음) */
          float keep=(isl-need)*5.;                                  /* >0 이면 땅이 남음 */
          float landM=smoothstep(-.06,.06,keep)*step(sd,0.)*step(0.,road);
          float lip=landM*(1.-smoothstep(.0,.45,keep));             /* 부서진 가장자리: 땅의 두께가 보이는 턱 */
          float thin=1.-smoothstep(.0,4.5,road);                    /* 길 가까이 땅이 얇아짐 */
          vec3 sky=deep(ro,rd);
          if(landM>.01){ vec3 land;
            if(ice){ /* 얼음: 깊은 청록 얼음판 · 속에서 빛나는 금 · 눈 쌓인 곳 · 얇은 곳은 아래 별이 비침 */
              float e=.35; float h=N4(p*.03).r*.7+N4(p*.11).b*.3, hx=N4((p+vec2(e,0.))*.03).r*.7+N4((p+vec2(e,0.))*.11).b*.3, hz=N4((p+vec2(0.,e))*.03).r*.7+N4((p+vec2(0.,e))*.11).b*.3;
              vec3 n=normalize(vec3(-(hx-h)/e*1.4,1.,-(hz-h)/e*1.4));
              float cr=abs(N4(p*.045+.6).g-.5), crack=1.-smoothstep(.003,.012,cr);
              float snow=smoothstep(.55,.72,N4(p*.06+.2).r);
              vec3 base=mix(vec3(.05,.17,.26),vec3(.18,.36,.48),h); base=mix(base,vec3(.62,.72,.8),snow*.85);
              land=lit(base,n,rd,.9*(1.-snow*.7),70.)*.13+vec3(.12,.4,.6)*crack*(1.-snow)*(1.-thin*.5);
              land=mix(land,sky*1.3+vec3(.004,.012,.02),thin*.6*(1.-snow));   /* 얇은 얼음 아래로 별이 비침 */
              land+=vec3(.3,.42,.55)*lip;
            } else { /* 용암: 검은 현무암 껍질 · 숨 쉬듯 빛나는 붉은 결 · 길 쪽으로 결이 넓어짐 */
              float e=.35; float h=N4(p*.035+.4).r*.6+N4(p*.14).b*.4, hx=N4((p+vec2(e,0.))*.035+.4).r*.6+N4((p+vec2(e,0.))*.14).b*.4, hz=N4((p+vec2(0.,e))*.035+.4).r*.6+N4((p+vec2(0.,e))*.14).b*.4;
              vec3 n=normalize(vec3(-(hx-h)/e*2.,1.,-(hz-h)/e*2.));
              float v=abs(N4(p*.04+.9).g-.5), w=.01+.03*thin, vein=1.-smoothstep(w*.3,w,v);
              float pulse=.7+.3*sin(uT*1.6+N4(p*.02).r*12.);
              vec3 base=mix(vec3(.05,.045,.045),vec3(.1,.085,.08),h);
              land=lit(base,n,rd,.25,40.)*.13*(1.-vein)+vec3(1.1,.28,.04)*vein*pulse*(.45+.55*thin);
              land+=vec3(.9,.25,.04)*lip*(.5+.5*pulse);               /* 부서진 가장자리는 속이 붉게 비침 */
            }
            c=mix(sky,land,landM);
          } else if(road<0.){ /* 유리 길: 별빛 위에 놓인 유리 — 하늘이 비치는 막 · 가장자리 유리 턱이 빛을 받음 · 땅 쪽 가장자리에 서리/열기가 번짐 */
            float fr=pow(1.-max(-rd.y,0.),4.); c=sky+vec3(.12,.16,.28)*fr*.35;
            float ed=-road; float bevel=exp(-ed*ed*2.2);
            /* 육각 유리 결: 늘 은은하게 + 기체 둘레에서 살아남 · 결 위로 빛이 천천히 흐름 */
            vec2 hp=p*.55; vec2 r=vec2(1.,1.732); vec2 ha=mod(hp,r)-r*.5, hb=mod(hp-r*.5,r)-r*.5; vec2 hg=dot(ha,ha)<dot(hb,hb)?ha:hb;
            vec2 ah=abs(hg); float hd=max(dot(ah,normalize(vec2(1.,1.732))),ah.x); float edge=1.-smoothstep(.0,.035,abs(hd-.5));
            float near=0.; vec3 refl=vec3(0.);
            for(int i=0;i<2;i++){ vec4 s=uShips[i]; if(s.w<.5) continue; vec2 d=p-s.xz; float r2=dot(d,d);
              near=max(near,exp(-r2/40.)); refl+=(s.w>1.5?vec3(1.,.35,.45):vec3(.35,.55,1.2))*exp(-r2/5.)*.07; }
            float flow=pow(.5+.5*sin(p.x*.35-uT*1.4),6.);
            c+=vec3(.35,.55,.95)*edge*(.03+near*.18+flow*.04)+refl;
            c+=vec3(.5,.65,1.)*bevel*.1;                                 /* 유리 가장자리 턱이 빛을 받음 */
            float nearLand=step(sd,1.5);
            if(ice){ float fz=smoothstep(.5,.8,N4(p*.5).b)*exp(-ed*1.4)*nearLand; c+=vec3(.45,.65,.85)*fz*.22; }
            else { float hz=exp(-ed*1.5)*nearLand; c+=vec3(.5,.12,.02)*hz*(.12+.05*sin(uT*1.6+p.x)); }
          } else { c=sky; }
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
