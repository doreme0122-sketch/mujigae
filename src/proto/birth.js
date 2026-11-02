/* 시작 기지 — 기체가 태어나는 효과
   탑이 빛나고 → 빛이 판의 정가운데로 모이는 순간, 하늘에서 빛 한 줄기가 곧장 떨어져 판에 꽂히고
   그 섬광 속에서 기체가 태어난다. 태어난 뒤엔 숨 쉬듯 한 번 밝아지고 판 위로 빛 고리가 퍼진다.
   기체 위치는 판(mag)이 정하고, 여기선 보이는 때와 빛만 정한다. */
import * as THREE from 'three';

export const BIRTH = { FALL: .38, END: 2.4 };

function sprite(color, sx = 1, sy = 1) {
  const m = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(...color) }, uS: { value: new THREE.Vector2(sx, sy) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'uniform vec2 uS; varying vec2 vU; void main(){ vU=uv*2.-1.; vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.); float s=length(modelMatrix[0].xyz); c.xy+=position.xy*uS*s; gl_Position=projectionMatrix*c; }',
    fragmentShader: 'uniform float uI; uniform vec3 uC; varying vec2 vU; void main(){ float r2=dot(vU,vU); float k=exp(-r2*10.)*1.4+exp(-r2*3.)*.35; k*=1.-smoothstep(.7,1.,max(abs(vU.x),abs(vU.y))); gl_FragColor=vec4(uC*k*uI,1.); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); o.frustumCulled = false; o.renderOrder = 8; return o;
}

export function makeBirth(renderer, ship) {
  const G = new THREE.Group();
  /* 떨어지는 빛 줄기: 밝은 머리 + 위로 길게 남는 꼬리 */
  const head = sprite([.75, .9, 1.45]); G.add(head);
  const trailM = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uI; varying vec2 vU; void main(){ float x=abs(vU.x*2.-1.); float k=exp(-x*x*18.)*pow(1.-vU.y,1.6); gl_FragColor=vec4(vec3(.55,.78,1.4)*k*uI,1.); }' });
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), trailM); trail.renderOrder = 8; trail.frustumCulled = false; G.add(trail);
  { const t2 = new THREE.Mesh(trail.geometry, trailM); t2.rotation.y = Math.PI / 2; t2.renderOrder = 8; t2.frustumCulled = false; trail.add(t2); }   /* 엇갈린 두 장: 어느 쪽에서 봐도 줄기 */
  const flash = sprite([.8, .92, 1.4]); G.add(flash);
  /* 판 위로 퍼지는 빛 고리 */
  const waveM = new THREE.ShaderMaterial({ uniforms: { uR: { value: 0 }, uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uR,uI; varying vec2 vP; void main(){ float r=length(vP); float k=exp(-pow((r-uR)/.12,2.))+exp(-pow((r-uR*.7)/.2,2.))*.3; gl_FragColor=vec4(vec3(.5,.75,1.4)*k*uI,1.); }' });
  const wave = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), waveM); wave.rotation.x = -Math.PI / 2; wave.position.y = .2; wave.renderOrder = 7; G.add(wave);
  /* 꽂힌 순간 튀는 빛 부스러기 */
  const NB = 40, bits = Array.from({ length: NB }, () => ({ o: sprite([.55, .8, 1.4]), life: 0, v: new THREE.Vector3() })); bits.forEach(b => { b.o.scale.setScalar(.09); G.add(b.o); });
  let T0 = -99, active = false, hit = false; const cen = new THREE.Vector3(), box = new THREE.Box3(), size = new THREE.Vector3();
  G.visible = false;
  G.userData.start = t => { T0 = t; active = true; hit = false; G.visible = true; ship.visible = false; };
  G.userData.stop = () => { active = false; G.visible = false; };
  G.userData.update = (t, dt) => { if (!active) return; const e = t - T0, f = e / BIRTH.FALL;
    ship.updateMatrixWorld(true); box.setFromObject(ship); box.getCenter(cen); box.getSize(size);
    if (!isFinite(cen.y)) cen.set(0, .9, 0);
    /* 떨어짐: 점점 빨라지며 곧장 판 가운데로 */
    const falling = f < 1, y = THREE.MathUtils.lerp(14, cen.y, Math.min(1, f * f));
    head.visible = trail.visible = falling || e < BIRTH.FALL + .25;
    head.position.set(cen.x, y, cen.z); head.scale.setScalar(.8); head.material.uniforms.uI.value = falling ? 1.6 : 0;
    trail.position.set(cen.x, y, cen.z); trail.scale.set(.35, Math.max(.01, 14 - y + 1.5), 1);
    trailM.uniforms.uI.value = falling ? 1 : Math.max(0, 1 - (e - BIRTH.FALL) / .25);
    /* 꽂힘 → 기체가 섬광 속에서 태어남 */
    if (!falling && !hit) { hit = true; ship.visible = true;
      for (const b of bits) { b.life = .5 + Math.random() * .4; b.o.position.copy(cen); b.v.set((Math.random() - .5), Math.random() * .6, (Math.random() - .5)).normalize().multiplyScalar(2 + Math.random() * 2.5); } }
    const d = e - BIRTH.FALL;
    if (d >= 0) { flash.position.copy(cen); flash.scale.setScalar((size.x || 2.5) * 1.5 + d * 2.5); flash.material.uniforms.uI.value = (d < .12 ? 2.2 : 0) + Math.exp(-d * 3) * 1.4 + Math.sin(Math.min(1, d / 1.1) * Math.PI) * .5;
      waveM.uniforms.uR.value = d * 3.4; waveM.uniforms.uI.value = Math.max(0, 1 - d / 1.1) * 1.4; }
    else { flash.material.uniforms.uI.value = 0; waveM.uniforms.uI.value = 0; }
    for (const b of bits) { b.life -= dt; b.o.visible = b.life > 0; if (b.life > 0) { b.o.position.addScaledVector(b.v, dt); b.v.multiplyScalar(Math.exp(-2.5 * dt)); b.o.material.uniforms.uI.value = b.life * 2; } }
    if (e > BIRTH.END) { active = false; G.visible = false; } };
  return G;
}
