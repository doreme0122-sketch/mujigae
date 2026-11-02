/* 시작 기지 — 하늘에서 떨어지는 빛과 기체가 태어나는 효과
   기준점 H = 빛 물결이 판의 정중앙에 모이는 순간 = 하늘 빛이 판 가운데 땅에 닿는 순간 (태어나기 시작하는 때는 바뀌지 않음)
   닿기 전 (빛이 모여드는 동안 겹쳐서)
   · H-1.5 하늘 문: 판 정중앙 위 하늘에 빛이 소용돌이치며 모이는 구멍이 열린다. 가장자리에서 빛 알갱이가 빨려 든다
   · H-0.8 빛기둥: 하얀 심 · 파란 몸통 · 흐린 빛 안개 세 겹이 서로 다른 결로 흐르며 내려온다(점점 빨라짐). 둘레엔 굵기가 변하고 끝이 흩어지는 빛 가닥 셋이 나선으로 감김
   닿는 순간 H
   · 판이 쿵 눌렸다 튀어 오름 · 금테 별의 갈래 끝까지 빛이 번쩍 뻗음 · 바닥 판 선을 따라 빛이 꺾이며 퍼짐 · 공간이 일그러지는 파동(센 물결 하나 + 약한 물결 둘)
   · 기체 모양 그대로의 빛 막이 테두리부터 나타남
   닿은 뒤 (1초 남짓)
   · 빛 알갱이가 회오리치며 기체 쪽으로 빨려 들어 표면에 녹아듦 → 빛 막이 가득 참
   · 빛 막이 머리에서 꼬리로 쓸려 벗겨지며 진짜 기체가 드러남(경계에서 빛 부스러기가 떨어져 나감)
   · 엔진이 깜빡이다 한 번 크게 켜졌다 잦아듦(첫 숨) · 빛기둥은 위로 걷히고 하늘 문이 닫힘 · 빛 알갱이 몇 개가 하늘로 천천히 오름
   무게: 태어날 때 3초 남짓만 그리고, 알갱이는 점 묶음 한 번에, 일그러짐은 빛 번짐 마무리 단계에 얹어 거의 공짜 */
import * as THREE from 'three';

export const BIRTH = { PRE: 1.5, END: 3.0 };
const PY = 9.5;                                    /* 하늘 문 높이 */
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const sm01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/* 화면을 향한 빛 덩이 */
function sprite(color) {
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(...color) } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying vec2 vU; void main(){ float r2=dot(vU,vU); float k=exp(-r2*10.)*1.4+exp(-r2*3.)*.35; k*=1.-smoothstep(.7,1.,max(abs(vU.x),abs(vU.y))); gl_FragColor=vec4(uC*k*uI,1.); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.frustumCulled = false; o.renderOrder = 9; return o;
}
/* 빛 알갱이 묶음 (크기·밝기 제각각) */
function points(n) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), a = new Float32Array(n), s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = .4 + Math.pow(Math.random(), 2.5) * 1.8;
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aA', new THREE.BufferAttribute(a, 1)); g.setAttribute('aS', new THREE.BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({ ...AB, uniforms: { uPx: { value: 600 } },
    vertexShader: 'attribute float aA, aS; uniform float uPx; varying float vA; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aS*uPx*.06/(-mv.z); }',
    fragmentShader: 'varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float k=exp(-dot(q,q)*14.); gl_FragColor=vec4(vec3(.6,.82,1.4)*k*vA,1.); }' });
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = 9; return o;
}

export function makeBirth(ship, sm, engines) {
  const G = new THREE.Group(), U = v => ({ value: v }), uT = U(0);

  /* ── 하늘 문: 빛이 소용돌이치며 모이는 구멍 ── */
  const portalM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uO: U(0) },
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT, uO; varying vec2 vP;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ float r=length(vP)/2.6, a=atan(vP.y,vP.x); if(r>1.) discard;
        float sw=a*3.+log(r+.02)*-4.5+uT*2.2;                                     /* 안으로 감겨 드는 나선 */
        float arms=pow(.5+.5*sin(sw),3.), grain=n(vec2(sw*1.3, r*9.-uT*3.))*.7+.3;
        float body=arms*grain*smoothstep(1.,.35,r)*smoothstep(.0,.25,r);
        float eye=exp(-r*r*40.)*1.6, rim=exp(-pow((r-.92)/.05,2.))*.5*grain;      /* 가운데는 밝게 뚫리고 가장자리는 결이 흐트러짐 */
        float k=(body*1.2+eye+rim)*uO*smoothstep(1.2*uO, uO*.9, r);
        gl_FragColor=vec4(mix(vec3(.3,.55,1.35),vec3(.9,.96,1.4),eye)*k,1.); }` });
  const portal = new THREE.Mesh(new THREE.CircleGeometry(2.6, 96), portalM); portal.rotation.x = Math.PI / 2; portal.position.y = PY; portal.renderOrder = 8; G.add(portal);
  const suck = points(70), suckS = Array.from({ length: 70 }, () => ({ a: Math.random() * 6.28, r: 1.5 + Math.random() * 1.6, sp: .6 + Math.random() * .8, y: (Math.random() - .5) * .5 })); G.add(suck);

  /* ── 빛기둥 세 겹: 하얀 심 · 파란 몸통 · 빛 안개 ── */
  const beamG = new THREE.CylinderGeometry(1, 1, 1, 40, 24, true).translate(0, .5, 0);
  const layer = (rad, col, flow, freq, bright, soft) => { const m = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uI: U(0), uL: U(1) },
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main(){ vU=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: `uniform float uT, uI, uL; varying vec2 vU; varying vec3 vN, vV;
        void main(){ float f=abs(dot(vN,vV)); float core=pow(f, ${soft.toFixed(2)});                /* 정면이 짙고 가장자리는 옅게 = 둥근 빛 */
          float y=vU.y*uL, a=vU.x*6.2832;
          float flow=.65+.35*sin(y*${freq.toFixed(2)}-uT*${flow.toFixed(2)}+sin(a*3.+y*.7)*1.2)*sin(y*${(freq * .37).toFixed(2)}+uT*${(flow * .6).toFixed(2)}+a);
          float ends=smoothstep(0.,.08,vU.y)*smoothstep(1.,.85,vU.y);
          gl_FragColor=vec4(vec3(${col.join(',')})*core*flow*ends*uI*${bright.toFixed(2)},1.); }` });
    const o = new THREE.Mesh(beamG, m); o.scale.set(rad, 1, rad); o.frustumCulled = false; o.renderOrder = 8; G.add(o); return o; };
  const beams = [layer(.11, [.95, .98, 1.4], 14, 6, 2.2, .6), layer(.3, [.35, .62, 1.4], 9, 3.2, 1.1, 1.2), layer(.75, [.25, .45, 1.2], 4, 1.4, .35, 2.)];
  /* 나선 빛 가닥 셋: 굵기가 변하고 끝이 흩어짐 */
  const strandM = new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT, uI: U(0) },
    vertexShader: 'attribute float aU, aW; varying float vU, vW; void main(){ vU=aU; vW=aW; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uT, uI; varying float vU, vW;
      void main(){ float w=.55+.45*sin(vU*31.-uT*9.)*sin(vU*13.+uT*4.);                    /* 굵기가 숨 쉬듯 변함 */
        float across=exp(-vW*vW/(w*w+.02)*3.);
        float frayEnds=smoothstep(0.,.12,vU)*smoothstep(1.,.75,vU)*(.75+.25*sin(vU*90.+uT*20.));
        gl_FragColor=vec4(vec3(.55,.8,1.4)*across*frayEnds*uI*1.4,1.); }` });
  const strandGeo = (() => { const pos = [], au = [], aw = [], N = 160, turns = 5;
    for (let i = 0; i <= N; i++) { const u = i / N, a = u * turns * 6.2832, r = .42 + .08 * Math.sin(u * 17.);
      for (const w of [-1, 1]) { pos.push(Math.cos(a) * r, u + w * .035, Math.sin(a) * r); au.push(u); aw.push(w); } }
    const idx = []; for (let i = 0; i < N; i++) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1)); g.setAttribute('aW', new THREE.Float32BufferAttribute(aw, 1)); g.setIndex(idx); return g; })();
  const strands = [0, 1, 2].map(i => { const o = new THREE.Mesh(strandGeo, strandM); o.rotation.y = i * 2.094; o.frustumCulled = false; o.renderOrder = 8; G.add(o); return o; });
  const tip = sprite([.85, .94, 1.45]); G.add(tip);
  const flash = sprite([.8, .92, 1.4]); G.add(flash);

  /* ── 기체 모양 그대로의 빛 막 ── */
  const memM = new THREE.ShaderMaterial({ ...AB, uniforms: { uRim: U(0), uFill: U(0), uPeel: U(-99), uT },
    vertexShader: 'varying vec3 vN, vV, vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
    fragmentShader: `uniform float uRim, uFill, uPeel, uT; varying vec3 vN, vV, vW;
      void main(){ float d=vW.z-uPeel; if(d<-.02) discard;                                     /* 벗겨진 쪽(머리 쪽)은 사라짐 */
        float fr=pow(1.-abs(dot(vN,vV)),2.2);
        float ripple=.85+.15*sin(vW.x*30.+vW.z*24.-uT*10.);
        float edge=exp(-d*d*260.)*2.2*step(-90.,uPeel);                                         /* 벗겨지는 경계: 밝은 띠 */
        float k=fr*uRim*1.8+uFill*ripple*(.55+fr*.8)+edge;
        gl_FragColor=vec4(mix(vec3(.3,.58,1.35),vec3(.9,.96,1.4),clamp(uFill*.6+edge*.4,0.,1.))*k,1.); }` });
  const mem = sm.clone(true); mem.traverse(o => { if (o.isMesh) o.material = memM; o.renderOrder = 10; }); mem.scale.multiplyScalar(1.004); mem.visible = false; ship.add(mem);
  /* 표면 위 점들 (알갱이가 날아가 녹아드는 자리, 기체 기준) */
  const LOC = []; { const v = new THREE.Vector3(), all = []; ship.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(ship.matrixWorld).invert();
    sm.traverse(o => { if (!o.isMesh) return; const p = o.geometry.attributes.position, st = Math.max(1, Math.floor(p.count / 160)); for (let i = 0; i < p.count; i += st) all.push(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); });
    for (let i = 0; i < 110; i++) LOC.push(all[Math.floor(Math.random() * all.length)] || new THREE.Vector3()); }
  const swirl = points(110), swS = LOC.map(() => ({ a: Math.random() * 6.28, r: 1.4 + Math.random() * 1.4, y: Math.random() * 1.6, d: Math.random() * .35 })); G.add(swirl);
  const peelBits = points(60), pbS = Array.from({ length: 60 }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() })); G.add(peelBits);
  const motes = points(24), mS = Array.from({ length: 24 }, () => ({ x: (Math.random() - .5) * 2.2, z: (Math.random() - .5) * 2.2, d: Math.random() * .6, sp: .8 + Math.random() * .8 })); G.add(motes);
  const eng = engines.map(() => { const o = sprite([.4, .62, 1.45]); G.add(o); return o; });

  let T0 = -99, active = false, shown = false;
  const box = new THREE.Box3(), cen = new THREE.Vector3(), size = new THREE.Vector3(), v = new THREE.Vector3();
  G.visible = false;
  const S = { punch: 0, burst: 0, impR: 0, impK: 0, warpR: 0, warpS: 0 };
  const reset = () => { S.warpS = 0; S.impK = 0; S.burst = 0; S.punch = 0; };
  G.userData.S = S;
  G.userData.start = t => { T0 = t; active = true; shown = false; G.visible = true; ship.visible = false; mem.visible = false; };
  G.userData.stop = () => { active = false; G.visible = false; mem.visible = false; reset(); };
  G.userData.setPx = px => { for (const p of [suck, swirl, peelBits, motes]) p.material.uniforms.uPx.value = px; };
  G.userData.update = (t, dt) => { if (!active) return; uT.value = t; const e = t - T0 - BIRTH.PRE;      /* e: 닿는 순간 0 */
    ship.updateMatrixWorld(true); box.setFromObject(sm); box.getCenter(cen); box.getSize(size);
    const ground = .22;                                                 /* 판 가운데 땅 (기체는 그 위에 떠 있음) */
    /* 하늘 문: 열렸다가(H-1.5 → -1.0) 빛기둥이 걷힌 뒤 닫힘 */
    const open = sm01((e + 1.5) / .5) * (1 - sm01((e - 1.0) / .5)); portalM.uniforms.uO.value = open; portal.visible = open > .01;
    { const P = suck.geometry.attributes.position, A = suck.geometry.attributes.aA;
      suckS.forEach((q, i) => { q.r -= dt * q.sp * (1.2 + 2 / (q.r + .2)); q.a += dt * (2.2 / (q.r + .3)); if (q.r < .1) { q.r = 2.4 + Math.random() * .8; q.a = Math.random() * 6.28; }
        P.setXYZ(i, cen.x + Math.cos(q.a) * q.r, PY + q.y * q.r * .3, cen.z + Math.sin(q.a) * q.r); A.setX(i, open * Math.min(1, q.r * .8) * 1.2); });
      P.needsUpdate = A.needsUpdate = true; }
    /* 빛기둥: 아래 끝이 점점 빨라지며 내려옴(-0.8 → 0), 닿은 뒤 위로 걷힘(+0.25 → +1.05) */
    const down = Math.pow(Math.max(0, (e + .8) / .8), 2.2), lift = sm01((e - .25) / .8);
    const bottom = e < 0 ? THREE.MathUtils.lerp(PY, ground, Math.min(1, down)) : THREE.MathUtils.lerp(ground, PY, lift);
    const bI = (e < -.8 ? 0 : 1) * (1 - lift), len = Math.max(.01, PY - bottom);
    beams.forEach(b => { b.visible = bI > 0; b.position.set(cen.x, bottom, cen.z); b.scale.y = len; b.material.uniforms.uI.value = bI * (e > 0 && e < .25 ? 1.6 : 1); b.material.uniforms.uL.value = len; });
    strands.forEach((s, i) => { s.visible = bI > 0; s.position.set(cen.x, bottom, cen.z); s.scale.set(1, len, 1); s.rotation.y = i * 2.094 + t * 2.4; });
    strandM.uniforms.uI.value = bI;
    tip.visible = e > -.8 && e < 0; tip.position.set(cen.x, bottom, cen.z); tip.scale.setScalar(1.1); tip.material.uniforms.uI.value = 1.8;
    /* 닿는 순간: 섬광 · 판 쿵 · 별 번쩍 · 판 선 빛 · 공간 파동 */
    if (e >= 0) { flash.position.set(cen.x, ground + .3, cen.z); flash.scale.setScalar(2.4 + e * 3); flash.material.uniforms.uI.value = (e < .1 ? 2.4 : 0) + Math.exp(-e * 4) * 1.6; }
    else flash.material.uniforms.uI.value = 0;
    S.punch = e >= 0 && e < 1 ? -Math.sin(Math.min(1, e / .5) * Math.PI * 2) * Math.exp(-e * 4) * .07 : 0;
    S.burst = e >= 0 ? Math.exp(-e * 2.5) : 0;
    S.impR = Math.max(0, e) * 5.5; S.impK = e >= 0 ? Math.max(0, 1 - e / 1.4) : 0;
    S.warpR = Math.max(0, e) * .85; S.warpS = e >= 0 ? .028 * Math.max(0, 1 - e / 1.1) : 0;
    /* 빛 막: 닿는 순간 테두리부터 → 알갱이가 채움 → 머리에서 꼬리로 벗겨짐 */
    mem.visible = e >= 0 && e < 1.4;
    memM.uniforms.uRim.value = sm01(e / .12);
    memM.uniforms.uFill.value = sm01((e - .1) / .45);
    const peelK = sm01((e - .6) / .6), zN = box.min.z - .05, zT = box.max.z + .05;
    memM.uniforms.uPeel.value = e < .6 ? -99 : THREE.MathUtils.lerp(zN, zT, peelK);
    if (e >= .58 && !shown) { shown = true; ship.visible = true; }
    { const P = swirl.geometry.attributes.position, A = swirl.geometry.attributes.aA;
      swS.forEach((q, i) => { const k = sm01((e - q.d) / .5), tgt = v.copy(LOC[i]).applyMatrix4(ship.matrixWorld), a = q.a + e * 5 * (1 - k);
        const x = cen.x + Math.cos(a) * q.r * (1 - k), z = cen.z + Math.sin(a) * q.r * (1 - k), y = ground + q.y * (1 - k);
        P.setXYZ(i, x + (tgt.x - cen.x) * k, y + (tgt.y - ground) * k, z + (tgt.z - cen.z) * k); A.setX(i, e > q.d - .15 && k < 1 ? (k > .85 ? (1 - k) * 6 : 1) * 1.1 : 0); });
      P.needsUpdate = A.needsUpdate = true; }
    { const P = peelBits.geometry.attributes.position, A = peelBits.geometry.attributes.aA, pz = memM.uniforms.uPeel.value;
      if (e > .6 && e < 1.2) for (let j = 0; j < 3; j++) { const q = pbS[Math.floor(Math.random() * 60)]; q.life = .7; q.p.set(cen.x + (Math.random() - .5) * size.x, cen.y + (Math.random() - .3) * size.y, pz); q.v.set((Math.random() - .5) * .8, .6 + Math.random() * .8, -.3); }
      pbS.forEach((q, i) => { q.life -= dt; if (q.life > 0) { q.p.addScaledVector(q.v, dt); q.v.y -= dt * .4; } P.setXYZ(i, q.p.x, q.p.y, q.p.z); A.setX(i, Math.max(0, q.life) * 1.6); }); P.needsUpdate = A.needsUpdate = true; }
    /* 엔진 첫 숨: 깜빡 · 깜빡 · 한 번 크게 · 잦아듦 */
    { const q = e - 1.05, k = q < 0 ? 0 : q < .35 ? (Math.sin(q * 60) > .3 ? .6 : 0) : q < .6 ? sm01((q - .35) / .1) * 1.8 : 1.8 * Math.exp(-(q - .6) * 3);
      eng.forEach((o, i) => { o.visible = k > .01; v.copy(engines[i]).applyMatrix4(sm.matrixWorld); o.position.copy(v); o.scale.setScalar(.55 + k * .2); o.material.uniforms.uI.value = k; }); }
    /* 빛 알갱이 몇 개가 하늘로 천천히 오름 */
    { const P = motes.geometry.attributes.position, A = motes.geometry.attributes.aA;
      mS.forEach((q, i) => { const u = e - .8 - q.d; P.setXYZ(i, cen.x + q.x * (1 + Math.max(0, u) * .2), ground + Math.max(0, u) * q.sp, cen.z + q.z * (1 + Math.max(0, u) * .2)); A.setX(i, u > 0 ? Math.max(0, 1 - u / 1.6) * .9 : 0); });
      P.needsUpdate = A.needsUpdate = true; }
    if (e > BIRTH.END) { active = false; G.visible = false; mem.visible = false; ship.visible = true; reset(); } };
  return G;
}
