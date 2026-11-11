/* 맵 테두리 · 태어나는 곳 (한 조각 체험판 · 사용자 2026-11-11): 새 하늘 맵(map2)의 무지개 홀로그램 벽 · 틈 기둥 · '빛의 닻' 기지를 그대로 옮김
   · 무지개 벽: 맵 둘레 원통 하나 (그리기 1번) · 늘 은은함 · 기지 출구 틈만 열림 · 맞으면 무지개빛 고리가 번짐 (hit)
     맵 끝을 산맥으로 두르지 않음 (사용자: 무겁다면 홀로그램 벽으로)
   · 기지: 가운데가 벽 선 위 (앞 절반 맵 안 · 뒤 절반 우주) · 출구가 맵 가운데를 봄 · 아래는 층층이 좁아지는 흰 돌 받침
     내 기지는 불이 켜진 채 (탑 · 빛 고리 · 금테 별) · 이웃 기지는 화면 밖이라 하나만
   · 기지 안에선 판(계단 단 안쪽)과 출구 길만 다님 · 벽과 그 바깥은 막힘 (blocked) */
import * as THREE from 'three';
import { makePad } from '../core/hangar/pad.js';
import { makeGoldStar } from './goldstar.js?v=11112144';
import { makeArena } from './arena.js?v=11112144';
import { makeGuardians, GUARD } from './guardian.js?v=11112144';
import { FLY } from './flight.js?v=11112144';
import { autoMerge } from './automerge.js?v=11112144';

const SHIPL = 2.9, BS = 2 / SHIPL, BASE_Y = .42, GAPH = 5.6;
function skyTone(root) { root.traverse(o => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m || !m.color || m.userData.toned || m.isShaderMaterial || m.isMeshBasicMaterial) continue;
  m.userData.toned = true; const c = m.color, L = c.r * .3 + c.g * .55 + c.b * .15, gold = c.r > c.b * 1.5 && c.r > .5; if (gold) continue;
  if (L < .12) { m.color.setHex(0xcfc6b3); m.metalness = .05; m.roughness = .82; } else if (L < .3) { m.color.setHex(0xddd5c3); m.metalness = .05; m.roughness = .78; }
  else if (L < .7) { m.color.setHex(0xebe6da); m.metalness = .1; m.roughness = .55; } else { m.color.setHex(0xf4f1ea); m.metalness = .12; m.roughness = .45; }
  if ('clearcoat' in m) { m.clearcoat = .15; m.sheen = 0; } m.needsUpdate = true; } }); }

export async function buildRim({ scene, isle, K, LV }, LO) {
  const RM = LO.rim, R = RM.R * K, Y0 = isle.layers[1] - FLY.HOVER;   /* Y0: 기지 판이 2층(태어나는 높이)에 오게 */
  const A0 = Math.atan2(RM.base[1], RM.base[0]);   /* 내 기지 각도 (기지 10곳은 여기서 36°마다) */
  /* ── 무지개 홀로그램 벽 (map2 그대로 · 기지 각도만 맞춤) ── */
  const HITS = Array.from({ length: 10 }, () => new THREE.Vector4(0, -999, 0, -99)); let hitI = 0;
  const wallM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uR: { value: R }, uGap: { value: GAPH }, uHit: { value: HITS }, uGapOn: { value: 1 }, uP: { value: new THREE.Vector2() }, uC: { value: new THREE.Vector2() }, uA0: { value: A0 }, uY0: { value: Y0 } },
    vertexShader: 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uT, uR, uGap, uGapOn, uA0, uY0; uniform vec2 uP, uC; uniform vec4 uHit[10]; varying vec3 vW; varying vec3 vN;
      vec3 rb(float h){ return .5+.5*cos(6.2832*(h+vec3(0.,.33,.67))); }
      void main(){ float a=atan(vW.z,vW.x)-uA0, st=6.2831853/10., k=a-st*floor(a/st+.5), arc=abs(k)*uR;
        float open=uGapOn>.5 ? smoothstep(uGap-.2,uGap+.7,arc) : 1.;
        float u=atan(vW.z,vW.x)*uR, y=vW.y-uY0;
        vec3 V=normalize(cameraPosition-vW); float nv=abs(dot(normalize(vN),V)), fr=1.-nv; fr=fr*fr;
        vec2 q=vec2(u*.5+y*.5, u*.5-y*.5)*.45; vec2 f=abs(fract(q)-.5); float grid=smoothstep(.46,.5,max(f.x,f.y));
        float scan=pow(.5+.5*sin(y*5.-uT*2.4),18.);
        float hue=fract(u/70.+y*.012+uT*.025);
        float vf=smoothstep(-46.,-26.,y)*smoothstep(38.,20.,y);
        vec3 col=rb(hue); float al=(.11+.14*fr+.1*grid+.05*scan);
        float edge=exp(-pow((arc-uGap)/.22,2.))*uGapOn; col+=rb(hue+.3)*edge*1.2; al+=edge*.5;
        for(int i=0;i<10;i++){ vec4 hh=uHit[i]; float age=uT-hh.w; if(age<0.||age>1.8) continue; float d=distance(vW,hh.xyz), rr=age*10.;
          float ring=exp(-pow((d-rr)/(.6+age*.6),2.))*(1.-age/1.8), core=exp(-d*d*.35)*max(0.,1.-age*3.);
          col+=rb(d*.06-age*.6)*(ring*1.6+core*2.); al+=ring*.55+core*.6; }
        float graze=smoothstep(.03,.28,nv), far=smoothstep(170.,70.,distance(vW.xz,uP));
        float nearC=smoothstep(3.,-4.,dot(vW.xz-uP,normalize(uC-uP+vec2(1e-4))));   /* 카메라와 기체 사이에 걸린 벽은 걷어 냄 (내 기지가 테두리라 카메라가 벽 밖에 있음) */
        gl_FragColor=vec4(col*1.15,clamp(al,0.,.9)*vf*open*graze*far*nearC); }` });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 90, 1080, 1, true).translate(0, Y0 - 4, 0), wallM); wall.renderOrder = 20; wall.frustumCulled = false; scene.add(wall);
  /* 맵 바깥 = 검은 우주 (설계: 테두리 밖은 별만 · 구름 바다 없음) — 테두리 밖 아래로 넓은 고리 판 하나 (그리기 1번) · 깊은 검푸른 바탕 · 화면 점 크기 별 · 테두리 쪽은 옅은 대기 빛 띠 */
  { const g = new THREE.RingGeometry(R + .5, R + 900, 256, 1).rotateX(-Math.PI / 2).translate(0, Y0 - 34, 0);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uR: { value: R }, uT: wallM.uniforms.uT }, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uR, uT; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 stars(vec2 P, float N, float pr, float br){ vec2 g = P * N, id = floor(g), f = fract(g); if (h(id) > pr) return vec3(0.); vec2 p = vec2(.2) + .6 * vec2(h(id + 1.3), h(id + 7.7)); vec2 d = (f - p) / max(fwidth(g), vec2(1e-5)); float b = pow(h(id + 3.1), 4.); float k = exp(-dot(d, d) / ((.6 + b * 1.4) * (.6 + b * 1.4)));
          return mix(vec3(.75, .82, 1.), vec3(1., .88, .76), step(.8, h(id + 5.5))) * k * (.3 + b * 2.) * br * (1. + .4 * sin(uT * (1. + h(id) * 2.) + h(id) * 50.) * step(.4, b)); }
        void main(){ float r = length(vW.xz), e = r - uR; vec3 c = mix(vec3(.02, .035, .09), vec3(.012, .016, .04), smoothstep(0., 140., e));
          c += vec3(.12, .3, .55) * exp(-e / 9.) * .55;   /* 테두리 쪽 옅은 대기 빛 */
          c += stars(vW.xz, .09, .06, 1.) + stars(vW.xz, .25, .03, .4); gl_FragColor = vec4(c, 1.); }` }));
    m.renderOrder = -5; m.frustumCulled = false; scene.add(m); }
  /* 틈 양옆 기둥 (흰 돌 · 금 띠 · 수정 머리 · 틈 쪽 무지개 줄) */
  const postM = new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: .7, flatShading: true }), goldM = new THREE.MeshStandardMaterial({ color: 0xe2b35c, metalness: 1, roughness: .3 });
  const seamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uT; varying vec2 vU; void main(){ float x=abs(vU.x-.5)*2.; vec3 c=.5+.5*cos(6.2832*(vU.y*1.5-uT*.3+vec3(0.,.33,.67))); gl_FragColor=vec4(c*exp(-x*x*6.)*1.2,1.); }' });
  const BASES = (RM.bases || [0]).map(d => A0 + d * Math.PI / 180);
  for (const ang of BASES) for (const s of [-1, 1]) { const a = ang + s * (GAPH + .9) / R, g = new THREE.Group(); g.position.set(Math.cos(a) * R, Y0, Math.sin(a) * R); g.rotation.y = -a; scene.add(g);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(.5, .7, 7, 6).translate(0, -1, 0), postM)); for (const y of [-3.6, 1.2]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .32, 6).translate(0, y, 0), goldM));
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.6, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x223355, roughness: .15, flatShading: true })); cap.scale.y = 1.6; cap.position.y = 3.3; g.add(cap);
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(.3, 6).translate(0, -1, 0), seamM); seam.position.z = -s * .62; seam.rotation.y = s * Math.PI / 2; g.add(seam);
    g.add(new THREE.Mesh(new THREE.ConeGeometry(.7, 5, 6).rotateX(Math.PI).translate(0, -7, 0), postM)); }
  /* ── 기지 ('빛의 닻' 하늘빛 · 받침) — 내 기지만 (이웃 기지는 이 조각 밖) ── */
  const keelM = new THREE.MeshStandardMaterial({ color: 0xe4ddcd, roughness: .7, metalness: .05, flatShading: true }), seamGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(.45, .72, 1.35), toneMapped: false });
  const mk = ang => { const b = { ang, x: Math.cos(ang) * R, z: Math.sin(ang) * R }, root = new THREE.Group(); root.position.set(b.x, Y0, b.z); scene.add(root);
    const w = new THREE.Group(); w.position.y = BASE_Y; w.scale.setScalar(BS); const dx = -Math.cos(ang), dz = -Math.sin(ang); w.rotation.y = Math.atan2(-dz, dx); root.add(w);
    const pad = makePad(), star = makeGoldStar(), ring = makeArena(), guards = makeGuardians(); w.add(pad, star, ring, guards); skyTone(w);
    const k = new THREE.Group(); k.position.y = BASE_Y - .02; k.rotation.y = w.rotation.y; root.add(k);
    k.add(new THREE.Mesh(new THREE.LatheGeometry([[5.46, 0], [5.3, -.28], [4.7, -.42], [4.45, -1.05], [3.6, -1.25], [3.3, -2.05], [2.3, -2.3], [1.9, -3.25], [.95, -3.6], [.55, -4.6], [0, -5.2]].map(([x, y]) => new THREE.Vector2(x, y)), 40), keelM));
    for (const [r, y] of [[5.33, -.24], [4.5, -1.02], [3.35, -2.02], [1.95, -3.2]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 6, 64), goldM); t.rotation.x = Math.PI / 2; t.position.y = y; k.add(t); }
    for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2, s2 = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 1.1), seamGlow); s2.position.set(Math.cos(a) * 4.05, -1.15, Math.sin(a) * 4.05); s2.rotation.y = -a + Math.PI / 2; s2.rotation.x = .1; k.add(s2); }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(.42, 0), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x2a4a88, roughness: .15, flatShading: true })); tip.scale.y = 2.2; tip.position.y = -6; k.add(tip);
    /* 불 켜 둠: 탑 → 빛 물결 → 금테 별 (태어나는 장면은 이 체험판에 없음) */
    const W0 = -20 + GUARD.DOWN; guards.userData.fire(-20); ring.userData.wake(W0); star.userData.fire(W0 + .5, .2);
    return Object.assign(b, { root, w, pad, star, ring, guards, dx, dz }); };
  const ME = mk(A0);
  /* 미리 합치기 (map2와 같음): 한동안 돌려 보며 한 번도 안 움직인 부품을 재질마다 하나로 → 그리기 횟수 줄임 */
  { const AMS = [ME.pad, ME.star, ME.ring, ME.guards, ...ME.root.children.filter(c => c !== ME.w)].map(o => autoMerge(o)); for (let ts = 0; ts < 4; ts += .1) { ME.pad.userData.update(ts); ME.star.userData.update(ts); ME.ring.userData.update(ts); ME.guards.userData.update(ts, false); for (const A of AMS) A.watch(); } let sv = 0; for (const A of AMS) sv += A.merge().saved; console.log('[기지] 미리 합친 부품', sv); }
  /* 막힘: 기지 안에선 판과 출구 길만 · 벽 바깥은 막힘 */
  const FL = 4.3 * BS - .25, EXH = 1.6;
  const blocked = (x, z) => { const b = ME; if (Math.hypot(x - b.x, z - b.z) < 6.2) { const lx = (x - b.x) * b.dx + (z - b.z) * b.dz, lz = -(x - b.x) * b.dz + (z - b.z) * b.dx; return !(Math.hypot(lx, lz) < FL || (lx > 0 && Math.abs(lz) < EXH)); }
    return Math.hypot(x, z) > R - .9; };
  return { blocked, base: ME, hit: (x, y, z, t) => HITS[hitI++ % HITS.length].set(x, y, z, t),
    update: (t, dt, st) => { wallM.uniforms.uT.value = t; seamM.uniforms.uT.value = t; wallM.uniforms.uP.value.set(st.x * K, st.z * K); if (st.cam) wallM.uniforms.uC.value.set(st.cam.x, st.cam.z); ME.pad.userData.update(t); ME.star.userData.update(t); ME.ring.userData.update(t); ME.guards.userData.update(t, false); } };
}
