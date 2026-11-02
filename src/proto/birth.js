/* 시작 기지 — 기체가 태어나는 효과
   빛기둥이 서 있는 게 아니라, 빛 덩어리가 하나씩 차례로 떨어진다(처음엔 느리게 → 점점 빠르게, 탑의 수와 같은 일곱 번).
   하나 닿을 때마다 기체가 꼬리부터 앞쪽으로 조금씩 만들어진다(만들어지는 경계엔 밝은 빛 띠, 거기서 빛 부스러기가 튐).
   일곱 번째가 닿아 다 만들어지면 한 번 숨 쉬듯 크게 밝아지고, 판 위로 빛 고리가 퍼져 나간다.
   기체는 판에 묶여 있으므로 위치는 판(mag)이 정하고, 여기선 보이는 정도만 정한다. */
import * as THREE from 'three';

const HITS = [0, .55, .98, 1.32, 1.58, 1.78, 1.93];         /* 빛 덩어리가 닿는 시각 (점점 빨라짐) */
export const BIRTH = { FALL: .42, DONE: 1.93 + .12, END: 3.2 };

/* 화면을 향한 빛 덩이 (세로로 늘일 수 있음) */
function sprite(color, stretch = 1) {
  const m = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(...color) }, uS: { value: new THREE.Vector2(1, stretch) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform vec2 uS; varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*uS*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying vec2 vU; void main(){ float r2=dot(vU,vU); float k=exp(-r2*10.)*1.4+exp(-r2*3.)*.35; k*=1.-smoothstep(.7,1.,max(abs(vU.x),abs(vU.y))); gl_FragColor=vec4(uC*k*uI,1.); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.frustumCulled = false; o.renderOrder = 8; return o;
}

export function makeBirth(renderer, ship) {
  renderer.localClippingEnabled = true;
  const G = new THREE.Group();
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);      /* z가 경계보다 큰 쪽(꼬리)만 보임 */
  const mats = []; ship.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!mats.includes(m)) mats.push(m); }); });
  const setClip = on => mats.forEach(m => { m.clippingPlanes = on ? [clip] : null; m.needsUpdate = true; });
  /* 떨어지는 빛 덩어리 일곱 + 닿는 섬광 */
  const orbs = HITS.map(() => { const o = sprite([.6, .82, 1.4], 2.6); G.add(o); return o; });
  const flash = sprite([.75, .9, 1.4]); G.add(flash);
  /* 만들어지는 경계의 빛 띠: 기체를 가로지르는 얇고 밝은 판 */
  const seamM = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uI; varying vec2 vU; void main(){ float k=exp(-vU.y*vU.y*30.)*(1.-smoothstep(.75,1.,abs(vU.x))); gl_FragColor=vec4(vec3(.7,.9,1.45)*k*uI,1.); }' });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), seamM); seam.renderOrder = 9; G.add(seam);
  /* 다 만들어진 순간 판 위로 퍼지는 빛 고리 */
  const waveM = new THREE.ShaderMaterial({ uniforms: { uR: { value: 0 }, uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uR,uI; varying vec2 vP; void main(){ float r=length(vP); float k=exp(-pow((r-uR)/.12,2.))+exp(-pow((r-uR*.7)/.2,2.))*.3; gl_FragColor=vec4(vec3(.5,.75,1.4)*k*uI,1.); }' });
  const wave = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), waveM); wave.rotation.x = -Math.PI / 2; wave.position.y = .2; wave.renderOrder = 7; G.add(wave);
  /* 경계에서 튀는 빛 부스러기 */
  const NB = 60, bits = Array.from({ length: NB }, () => ({ o: sprite([.55, .8, 1.4]), life: 0, v: new THREE.Vector3() })); bits.forEach(b => { b.o.scale.setScalar(.09); G.add(b.o); });
  let T0 = -99, box = new THREE.Box3(), size = new THREE.Vector3(), cen = new THREE.Vector3(), k = 0, active = false, bi = 0;
  G.visible = false;
  G.userData.start = t => { T0 = t; k = 0; active = true; G.visible = true; setClip(true); ship.updateMatrixWorld(true); box.setFromObject(ship); box.getSize(size); box.getCenter(cen); };
  G.userData.stop = () => { active = false; G.visible = false; setClip(false); };
  G.userData.update = (t, dt) => { if (!active) return; const e = t - T0; ship.updateMatrixWorld(true); box.setFromObject(ship); box.getCenter(cen);
    /* 몇 개가 닿았나 → 목표 진행. 닿을 때마다 그만큼 앞쪽으로 '확' 자라고 잦아듦 */
    let n = 0; for (const h of HITS) if (e >= h + BIRTH.FALL) n++;
    const target = n / HITS.length; k += (target - k) * Math.min(1, dt * 9);
    const zTail = box.max.z + .02, zNose = box.min.z - .02, edge = zTail + (zNose - zTail) * k; clip.constant = -edge;
    const building = e < BIRTH.DONE + BIRTH.FALL;
    seam.visible = building && k > .002; seam.position.set(cen.x, cen.y, edge); seam.scale.set(size.x * 1.15, size.y * 1.6, 1); seamM.uniforms.uI.value = 1.2;
    /* 빛 덩어리: 위에서 떨어져 기체가 만들어지는 경계에 꽂힘 */
    HITS.forEach((h, i) => { const o = orbs[i], f = (e - h) / BIRTH.FALL; o.visible = f > 0 && f < 1;
      if (o.visible) { const y = THREE.MathUtils.lerp(9, cen.y, f * f); o.position.set(cen.x, y, edge); o.scale.setScalar(.55); o.material.uniforms.uI.value = .6 + f; } });
    /* 닿은 순간 섬광 + 부스러기 */
    let last = -1; HITS.forEach((h, i) => { if (e >= h + BIRTH.FALL) last = i; });
    const since = last >= 0 ? e - HITS[last] - BIRTH.FALL : 99;
    flash.position.set(cen.x, cen.y, edge); flash.scale.setScalar(1.2 + since * 2); flash.material.uniforms.uI.value = building ? Math.exp(-since * 9) * 1.5 : 0;
    if (since < dt * 1.5) for (let j = 0; j < 10; j++) { const b = bits[bi++ % NB]; b.life = .6; b.o.position.set(cen.x + (Math.random() - .5) * size.x, cen.y + (Math.random() - .5) * size.y * .6, edge); b.v.set((Math.random() - .5) * 2, Math.random() * 1.6, (Math.random() - .5) * 1.2); }
    for (const b of bits) { b.life -= dt; b.o.visible = b.life > 0; if (b.life > 0) { b.o.position.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-2 * dt)); b.o.material.uniforms.uI.value = b.life * 2; } }
    /* 다 만들어짐: 숨 쉬듯 크게 밝아지고, 빛 고리가 퍼짐 */
    const d = e - BIRTH.DONE - BIRTH.FALL;
    if (d >= 0) { setClipOnce(); const breathe = Math.sin(Math.min(1, d / .9) * Math.PI);
      flash.position.copy(cen); flash.scale.setScalar(size.x * 1.6 + d * 2); flash.material.uniforms.uI.value = breathe * 1.3;
      waveM.uniforms.uR.value = d * 3.4; waveM.uniforms.uI.value = Math.max(0, 1 - d / 1.1) * 1.4; }
    else waveM.uniforms.uI.value = 0;
    if (e > BIRTH.END) { active = false; G.visible = false; } };
  let cleared = false; const setClipOnce = () => { if (!cleared) { cleared = true; setClip(false); } };
  const s0 = G.userData.start; G.userData.start = t => { cleared = false; s0(t); };
  return G;
}
