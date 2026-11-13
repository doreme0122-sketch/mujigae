/* 숨을 곳 = 미지의 우주 식물 덤불 (사용자 2026-11-05: 참고 그림 느낌 — 평소 보던 식물이 아니라 우주에 있을 법한 식물 · 시안 셋)
   모든 땅에서 같은 덤불(통일). 규칙: 경계는 곧은 네모 · 밖에선 테두리 없음 · 들어가면 반투명 + 곧은 테두리
   A 빛잎 덤불   넓고 반투명한 큰 잎이 밑동에서 사방으로 펼쳐짐 · 잎맥이 빛나는 그물 · 잎 끝에서 빛 방울 줄기가 늘어짐 · 밑동에 숨 쉬는 알 봉오리
   B 깃털 덤불   깃털처럼 잘게 갈라진 붉은보라 잎이 촘촘히 솟음 · 가운데 줄기가 빛남 · 끝이 말려 있음 · 사이사이 작은 빛 버섯
   C 빛버섯 무리 크고 작은 반투명 갓이 층층이 피어남 · 갓 아래 주름이 청록으로 빛나고 숨 쉬듯 오므렸다 폄 · 사이에 낮은 빛잎 몇 장
   무게: 덤불마다 잎 한 묶음 + 봉오리·버섯 한 묶음 + 늘어진 줄기 한 묶음 (같은 생김새를 한 번에 그림) */
import * as THREE from 'three';
import { inRect, sampleRect, ring } from './hidetheme.js?v=11140030';

const LA = { leaf: 'broad', col: [[.42, .06, .75], [.12, .35, 1.]] }, LB = { leaf: 'feather', col: [[.75, .12, .35], [.6, .25, .95]] }, LC = { leaf: 'broad', col: [[.2, .25, .75], [.2, .75, .9]] };
const V = { A: { leaves: [{ ...LA, n: 48, h: [1.6, 2.8] }], drip: 1, pods: 4, shrooms: 3, sh: [.22, .22], tall: 1 },
            B: { leaves: [{ ...LB, n: 70, h: [1.3, 2.5] }], drip: 0, pods: 2, shrooms: 7, sh: [.22, .22], tall: 1 },
            C: { leaves: [{ ...LC, n: 12, h: [.7, 1.2] }], drip: 0, pods: 2, shrooms: 34, sh: [.4, .8], tall: .55 },   /* 키 낮춤 (사용자 2026-11-05) */
            /* M 섞음 (사용자 2026-11-05: 빛버섯 키 낮추고 셋을 섞자) — 가운데 큰 빛잎(위를 덮어 가림) · 그 둘레 깃털 잎 · 발치에 낮은 빛버섯 · 알 봉오리 · 빛 방울 줄기 */
            M: { leaves: [{ ...LA, n: 22, h: [1.5, 2.5], inner: 1 }, { ...LB, n: 30, h: [1., 1.8] }], drip: 1, pods: 3, shrooms: 16, sh: [.32, .5], tall: .55 } };

/* 잎 한 장: 길이 방향으로 휘고 끝이 아래로 늘어짐 (밑동 0 ~ 끝 1) */
function leafGeo() { const g = new THREE.PlaneGeometry(1, 1, 4, 10), P = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < P.count; i++) { const u = uv.getX(i) - .5, t = uv.getY(i), w = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), .75) * .5 + .02;
    const cup = u * u * .5;                                                      /* 잎이 살짝 오목 */
    P.setXYZ(i, u * 2 * w, t, cup); }
  g.computeVertexNormals(); return g; }

export function makePlantBush(rect, kind, uT, R) {
  const cfg = V[kind], grp = new THREE.Group(), uIn = { value: 0 }, uShip = { value: new THREE.Vector3(0, 0, -1e4) }, mats = [];
  const [cx, cz, hl, hw] = rect;
  /* ── 잎 ── 밑동은 네모 안 몇 군데 포기에 모이고, 잎은 포기에서 바깥·위로 펼침 (끝이 네모 밖으로 나가지 않게 기울기를 줄임) */
  const clumps = []; { const nc = Math.max(3, Math.round(hl * hw * .9)); for (let i = 0; i < nc; i++) clumps.push(sampleRect(rect, R, .7)); }   /* 포기를 네모 전체에 고르게 → 덤불이 네모를 꽉 채움 */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), tips = [];
  for (const sp of cfg.leaves) {
  const L = new THREE.InstancedMesh(leafGeo(), null, sp.n);
  const cl = sp.inner ? clumps.map(([x, z]) => [cx + (x - cx) * .5, cz + (z - cz) * .5]) : clumps;   /* 큰 잎은 가운데 쪽 포기에 */
  for (let i = 0; i < sp.n; i++) { const [bx, bz] = cl[i % cl.length], yaw = R() * 6.28, lean = .55 + R() * .75, h = sp.h[0] + R() * (sp.h[1] - sp.h[0]);
    const w = sp.leaf === 'feather' ? .7 + R() * .35 : 1.3 + R() * .9;
    e.set(0, yaw, 0, 'YXZ'); q.setFromEuler(e); const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean); q.multiply(q2);
    m4.compose(p3.set(bx, -.05, bz), q, s3.set(w, h, w)); L.setMatrixAt(i, m4);
    const tip = new THREE.Vector3(0, h * .92, 0).applyQuaternion(q).add(p3); if (sp.leaf === 'broad') tips.push(tip); }
  const leafMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: false, depthWrite: true,   /* 불투명으로 그림: 겹친 잎을 다 섞어 그리면 탭에서 40프레임까지 떨어짐(사용자 2026-11-05) → 반투명은 점무늬로 구멍을 뚫어 흉내 */
    uniforms: { uT, uIn, uShip, uA: { value: new THREE.Vector3(...sp.col[0]) }, uB: { value: new THREE.Vector3(...sp.col[1]) }, uF: { value: sp.leaf === 'feather' ? 1 : 0 }, uSun: { value: new THREE.Vector3(-.45, .78, -.42).normalize() } },
    vertexShader: `uniform float uT, uIn; uniform vec3 uShip; varying vec2 vUv; varying vec3 vN, vW; varying float vS;
      void main(){ vUv=uv; vec3 p=position; float t=uv.y; vS=fract(instanceMatrix[3].x*1.37+instanceMatrix[3].z*.91);
        p.z+= -t*t*.45;                                                                                     /* 끝이 바깥으로 휘어 늘어짐 */
        /* 숨으면 잎이 접힘 (미모사처럼 기체를 느끼고 움츠러듦): 점무늬로 구멍 뚫던 방식은 뒤에 겹친 잎과 바닥까지 다 그려 탭에서 40프레임 → 접힌 잎은 아예 안 그려짐
           · 기체 둘레 포기는 다 접혀 기체가 또렷이 보이고, 먼 곳은 절반쯤만 접혀 덤불이 성겨지며 속이 비쳐 보임 */
        float hs=fract(sin(dot(instanceMatrix[0].xz+instanceMatrix[2].xy,vec2(12.9898,78.233)))*43758.5453);
        float db=length((modelMatrix*vec4(instanceMatrix[3].xyz,1.)).xz-uShip.xz);
        float fk=max(clamp((uIn*.8-hs)*4.,0.,1.), uIn*smoothstep(2.6,1.3,db));
        fk=fk*fk*(3.-2.*fk); p.z-=t*t*fk*.9; p*=1.-fk;                                                       /* 끝부터 안으로 말리며 밑동으로 오므라듦 */
        vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);
        vec2 sw=vec2(sin(uT*.8+vS*20.+w.x*.3),cos(uT*.65+vS*13.+w.z*.3))*.12*t*t;                              /* 바람에 천천히 물결 */
        vec2 aw=w.xz-uShip.xz; float d=length(aw); sw+=normalize(aw+1e-4)*uShip.y*smoothstep(2.,.3,d)*.25*t;   /* 기체 둘레 잎만 살짝 비킴 */
        w.xz+=sw; vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT, uIn, uF; uniform vec3 uA, uB, uSun; varying vec2 vUv; varying vec3 vN, vW; varying float vS;
      void main(){ float u=vUv.x-.5, t=vUv.y;
        if(uF>.5){ float lobe=abs(fract(t*16.+abs(u)*3.)-.5)*2.; if(abs(u)*2.>mix(.25,1.,lobe)*smoothstep(1.,.75,t)+.06) discard; }   /* 깃털처럼 갈라진 가장자리 */
        float mid=smoothstep(.035,.0,abs(u));                                                                  /* 가운데 잎맥 */
        float side=smoothstep(.06,.0,abs(fract(t*7.-abs(u)*2.6+vS)-.5))*smoothstep(.0,.08,abs(u));              /* 곁잎맥 */
        float net=smoothstep(.05,.0,abs(fract(vUv.x*14.+t*5.)-.5)*abs(fract(t*17.-vUv.x*6.)-.5)*4.)*.5;          /* 잔 그물맥 */
        vec3 base=mix(uA*.6,uB,smoothstep(.2,1.,t)+u*.25)*(.3+.25*vS);   /* 밑동 짙고 끝으로 맑아짐 */
        float dif=abs(dot(normalize(vN),uSun));
        vec3 c=base*(.35+.4*dif)+base*smoothstep(.4,1.,t)*.5+mix(uB,vec3(.6,.95,1.),.5)*(mid*1.4+side*1.)+uB*net*.12*(.55+.45*sin(uT*1.1+t*4.-vS*9.));   /* 잎맥이 또렷이 빛남 */   /* 잎맥에 빛이 흐름 */
        c+=mix(uA,uB,.5)*pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),2.)*.25;                                 /* 반투명한 가장자리 */
        float al=.92-.25*smoothstep(.3,.5,abs(u)); if(fract(dot(floor(gl_FragCoord.xy),vec2(.5,.75)))*1.02>al) discard;   /* 점무늬 반투명 (화면 칸마다 뚫음) */
        gl_FragColor=vec4(c,1.); }` });
  L.material = leafMat; mats.push(leafMat); grp.add(L); }
  /* ── 봉오리 · 버섯 ── */
  const bulbs = [];
  for (let i = 0; i < cfg.pods; i++) { const [x, z] = sampleRect(rect, R, .5); bulbs.push({ type: 0, x, z, s: .32 + R() * .25 }); }
  for (let i = 0; i < cfg.shrooms; i++) { const [x, z] = sampleRect(rect, R, .35); bulbs.push({ type: 1, x, z, s: cfg.sh[0] + Math.pow(R(), 1.3) * cfg.sh[1] }); }
  { const pod = new THREE.IcosahedronGeometry(1, 2); pod.scale(.85, 1.1, .85); pod.translate(0, .9, 0);
    const cap = new THREE.SphereGeometry(1, 12, 6, 0, 6.29, 0, Math.PI * .5); cap.scale(1, .5, 1); const stem = new THREE.CylinderGeometry(.12, .16, 1, 6, 1, true); stem.translate(0, .5, 0); cap.translate(0, 1, 0);
    const mk = (geo, list, tp) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, null, list.length); list.forEach((b, j) => { const h = tp ? (1.6 + R()) * cfg.tall : 1;
        m4.compose(p3.set(b.x, -.05, b.z), q.setFromEuler(e.set((R() - .5) * .3, R() * 6.28, (R() - .5) * .3)), s3.set(b.s, b.s * h, b.s)); im.setMatrixAt(j, m4); }); return im; };
    const bMat = (tp) => new THREE.ShaderMaterial({ transparent: false, side: THREE.DoubleSide, uniforms: { uT, uIn, uShip, uTp: { value: tp } },
      vertexShader: `uniform float uT, uTp, uIn; uniform vec3 uShip; varying vec3 vP, vN, vW; varying float vS;
        void main(){ vS=fract(instanceMatrix[3].x*2.1+instanceMatrix[3].z*1.3); vec3 p=position;
          float db=length((modelMatrix*vec4(instanceMatrix[3].xyz,1.)).xz-uShip.xz), fk=uIn*smoothstep(2.2,1.,db); fk=fk*fk*(3.-2.*fk);   /* 기체 바로 둘레 버섯·봉오리는 땅속으로 움츠러듦 */
          if(uTp>1.5){ float k=.92+.08*sin(uT*1.3+vS*20.); p.xz*=k; p.y=1.+(p.y-1.)*(2.-k); }                       /* 갓이 숨 쉬듯 오므렸다 폄 */
          vP=p; p*=1.-fk; vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix*instanceMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uT, uIn, uTp; varying vec3 vP, vN, vW; varying float vS;
        void main(){ float ndv=abs(dot(normalize(vN),normalize(cameraPosition-vW))); vec3 c; float a=1.;
          if(uTp<.5){ /* 알 봉오리: 육각 껍질 사이로 속빛이 숨 쉬듯 */
            vec3 d=normalize(vP-vec3(0.,.9,0.)); float hx=abs(fract(atan(d.z,d.x)*1.9+d.y*2.)-.5)+abs(fract(d.y*3.2)-.5);
            float seam=smoothstep(.12,.0,abs(hx-.45)); float br=.6+.4*sin(uT*1.4+vS*30.);
            c=vec3(.08,.03,.07)*(1.-seam)+mix(vec3(1.,.35,.55),vec3(1.,.6,.25),vS)*(seam*1.3+.25*pow(1.-ndv,2.))*br; }
          else if(uTp<1.5){ c=vec3(.04,.09,.12)*(.4+.6*ndv)+vec3(.2,.7,.9)*.12*pow(1.-ndv,2.)+vec3(.2,.8,.9)*.25*smoothstep(.6,1.,vP.y); a=.9; }   /* 대: 짙고 위로 갈수록 빛이 스밈 */                                  /* 버섯 대: 반투명 */
          else { float under=step(vP.y,1.02); float gill=smoothstep(.2,.0,abs(fract(atan(vP.z,vP.x)*4.)-.5))*under;    /* 갓: 아래 주름이 빛남 */
            vec3 d=normalize(vP-vec3(0.,1.,0.)); float spot=smoothstep(.16,.08,length(fract(vec2(atan(d.z,d.x)*1.6,d.y*3.)+vS)-.5))*(1.-under);   /* 갓 위 빛 점 */
            float rim=smoothstep(.3,.0,abs(vP.y-1.03))*.8;                                                              /* 갓 가장자리 빛 테 */
            c=mix(vec3(.08,.12,.32),vec3(.25,.08,.4),vS)*(.4+.7*pow(1.-ndv,1.5))+vec3(.3,1.,.9)*(gill*1.3+under*.35+rim)*(.7+.3*sin(uT*1.3+vS*20.))+vec3(.6,.9,1.)*spot*.6; a=.86; }
          float al=a; if(fract(dot(floor(gl_FragCoord.xy),vec2(.5,.75)))*1.02>al) discard; gl_FragColor=vec4(c,1.); }` });
    const P = mk(pod, bulbs.filter(b => !b.type), 0); if (P) { P.material = bMat(0); mats.push(P.material); grp.add(P); }
    const sh = bulbs.filter(b => b.type); const St = mk(stem, sh, 1), Cp = mk(cap, sh, 1); if (St) { St.material = bMat(1); Cp.material = bMat(2); mats.push(St.material, Cp.material); grp.add(St, Cp); } }
  /* ── 잎 끝 빛 방울 줄기 (A) ── 가는 세로 띠, 빛 방울이 천천히 흘러내림 */
  if (cfg.drip) { const tl = tips.filter((_, i) => i % 2 === 0), g = new THREE.PlaneGeometry(.05, 1); g.translate(0, -.5, 0);
    const im = new THREE.InstancedMesh(g, null, tl.length); tl.forEach((tp, j) => { const len = .5 + R() * Math.max(.3, tp.y - .2); m4.compose(p3.copy(tp), q.identity(), s3.set(1, len, 1)); im.setMatrixAt(j, m4); });
    const dm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT, uIn },
      vertexShader: `varying vec2 vUv; varying float vS; void main(){ vUv=uv; vS=fract(instanceMatrix[3].x*3.1);
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]); vec4 b=instanceMatrix*vec4(0.,position.y,0.,1.); vec3 w=(modelMatrix*b).xyz+right*position.x;
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
      fragmentShader: `uniform float uT, uIn; varying vec2 vUv; varying float vS;
        void main(){ float t=1.-vUv.y; float bead=pow(max(0.,sin((t*9.-uT*.8-vS*6.)*3.14)),18.); float line=.12*(1.-t);
          float a=(bead+line)*smoothstep(.5,.0,abs(vUv.x-.5))*(1.-t*.6); gl_FragColor=vec4(vec3(.35,.85,1.)*a*(1.-uIn*.5),1.); }` });
    im.material = dm; mats.push(dm); grp.add(im); }
  grp.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const Rg = ring(rect, 'plant'); grp.add(Rg.mesh);
  let k = 0;
  return { mesh: grp, rect, update(t, dt, x, z) { const inB = inRect(rect, x, z), tg = inB ? 1 : 0; k += (tg - k) * Math.min(1, dt * (tg > k ? 5 : 2));
      uIn.value = k; uShip.value.set(x, k, z); Rg.mat.uniforms.uIn.value = k; Rg.mat.uniforms.uT.value = t; return inB; } };
}
