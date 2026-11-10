/* 와드 부품 ⑤ 꼭대기 눈 홀로그램 — 사용자 참고 그림의 위로 퍼지는 빛 뿔 + 눈 원판
   · 머리: 유리 기둥 위에 얹힌 은빛 금속 투사기(접시 + 빛 렌즈) + 둘레를 감싼 굽은 금속 갈퀴 넷(그림의 왕관 모양 받침)
   · 빛 뿔: 렌즈에서 위로 퍼져 오르는 얇은 빛 막 — 가장자리만 은은히 빛나고 속은 비침, 빛 먼지가 타고 오름 (눈을 띄우는 빛)
   · 눈 원판: 뿔 끝에 떠 있는 홀로그램. 가는 선 대신 넓고 부드러운 빛 띠로(사용자: 선으로 그리지 말 것)
       바깥 띠(넷으로 끊긴 둥근 띠, 천천히 돎) · 안쪽 띠 · 가운데 눈(아몬드 모양으로 채워진 빛 + 눈동자)
   · 눈이 와드의 뜻: 빈 와드 = 눈을 감고 홀로그램이 거의 꺼짐 / 차지할수록 눈꺼풀이 열리며 켜짐 / 주인 있음 = 눈을 뜨고 둘레를 둘러봄(눈동자가 움직임)
   · 색 = 주인 색(보는 사람 기준), 홀로그램이라 가끔 지직 깜빡
   단위 m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowMaterial, stoneMaterial, solid } from './wardbase.js?v=11102116';

const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const clean = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };

const discMat = () => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uI: { value: 0 }, uOpen: { value: 0 }, uT: { value: 0 }, uLook: { value: new THREE.Vector2() }, uRot: { value: 0 } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform vec3 uCol; uniform float uI, uOpen, uT, uRot; uniform vec2 uLook; varying vec2 vP;
    float band(float r, float c, float w){ float d = (r - c) / w; return exp(-d * d); }
    void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5);
      /* 바깥 띠: 넓고 부드러운 둥근 띠를 넷으로 끊음, 천천히 돎 · 띠 위로 빛이 흐름 */
      float seg = smoothstep(.06, .16, abs(fract((a + uRot) / 6.2832 * 4.) - .5) * 2.);
      float outer = band(r, .9, .055) * seg * (.75 + .25 * sin(a * 3. - uT * 2.));
      float outer2 = band(r, .78, .02) * .5;
      float inner = band(r, .6, .035) * (.6 + .4 * smoothstep(-.2, 1., sin(a * 6. + uRot * 3.)));
      /* 눈: 아몬드 모양으로 채운 빛 (눈꺼풀 열린 만큼) + 눈동자(둘러봄) + 가운데 어두운 동공 */
      vec2 q = vP / vec2(.46, .26); float lid = max(.02, uOpen);
      float almond = 1. - smoothstep(0., .06, abs(q.y) - lid * (1. - q.x * q.x)) ; almond *= step(abs(q.x), 1.);
      float edgeE = almond * (1. - smoothstep(0., .12, lid * (1. - q.x * q.x) - abs(q.y))) * .9;          /* 눈 테두리가 더 밝음(채운 면의 가장자리) */
      vec2 ip = vP - uLook * .12 * uOpen; float ir = length(ip);
      float iris = (1. - smoothstep(.13, .16, ir)) * almond, pupil = 1. - smoothstep(.04, .06, ir);
      float eye = almond * .25 + edgeE + iris * (.65 + .35 * sin(atan(ip.y, ip.x + 1e-5) * 14. + uT)) * (1. - pupil * .85);
      float scan = .85 + .15 * sin(vP.y * 90. - uT * 8.);                                                 /* 홀로그램 결 */
      float k = (outer + outer2 + inner) * (.35 + .65 * uOpen) + eye * smoothstep(0., .25, uOpen);
      vec3 c = (uCol * uCol * 1.4 + vec3(.15)) * k * scan;
      gl_FragColor = vec4(c * uI * smoothstep(1.02, .95, r), 1.); }` });
const coneMat = () => new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uCol: { value: new THREE.Vector3(1, 1, 1) }, uI: { value: 0 }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vU; varying vec3 vN, vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uCol; uniform float uI, uT; varying vec2 vU; varying vec3 vN, vW;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec3 V = normalize(cameraPosition - vW); float q = 1. - abs(dot(normalize(vN), V)), rim = q * q * q;
      float y = vU.y, fade = smoothstep(0., .1, y) * smoothstep(1., .75, y);
      float dust = step(.975, h(floor(vec2(vU.x * 70., y * 40. - uT * 4.)))) * .9;
      float waves = .6 + .4 * sin(y * 30. - uT * 5.);
      vec3 c = (uCol * uCol + .15) * (rim * .55 * waves + .035 + dust * .5) * fade;
      gl_FragColor = vec4(c * uI, 1.); }` });

export function makeWardEye(uT, y) {
  const G = new THREE.Group(); G.position.y = y;
  const metal = stoneMaterial(uT), parts = [];   /* 덮개(투사기 머리·갈퀴) = 받침과 같은 처음의 돌 (사용자) */
  const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, yy]) => new THREE.Vector2(r, yy)), seg);
  /* 투사기: 기둥 머리 위 단 → 접시 → 렌즈 테 */
  parts.push(lathe([[0, 0], [.6, 0], [.62, .05], [.5, .12], [.36, .16], [.34, .26], [.42, .3], [.44, .36], [.3, .38], [0, .38]]));
  /* 왕관 갈퀴 넷: 머리 둘레에서 바깥으로 휘어 오르는 굽은 금속 (그림의 굽은 받침) */
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, pts = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(.5 + .38 * Math.sin(u * Math.PI * .55), -.05 + u * .62, 0)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .055, 6); const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const yy = P.getY(i); const s = 1 + (yy < .3 ? .9 : .2); P.setZ(i, P.getZ(i) * s); }   /* 납작한 칼날처럼 */
    g.computeVertexNormals(); g.rotateY(-a); parts.push(g);
    const tip = new THREE.BoxGeometry(.12, .1, .16); tip.translate(.84, .55, 0); tip.rotateY(-a); parts.push(tip); }
  G.add(new THREE.Mesh(solid(mergeGeometries(parts.map(clean))), metal));
  /* 렌즈 빛 테 + 갈퀴 끝 빛 (주인 색) */
  const p = [], uv = [], kk = [], quad = (A, B, C, D) => { p.push(...A, ...B, ...C, ...A, ...C, ...D); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); kk.push(1, 1, 1, 1, 1, 1); };
  for (let i = 0; i < 40; i++) { const a0 = i / 40 * Math.PI * 2, a1 = (i + 1) / 40 * Math.PI * 2, Q = (a, r, yy) => [Math.cos(a) * r, yy, Math.sin(a) * r];
    quad(Q(a0, .3, .385), Q(a1, .3, .385), Q(a1, .16, .395), Q(a0, .16, .395)); quad(Q(a0, .445, .3), Q(a1, .445, .3), Q(a1, .445, .35), Q(a0, .445, .35)); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1));
  const gMat = glowMaterial(), gm = new THREE.Mesh(gg, gMat); gm.renderOrder = 4; G.add(gm);
  /* 빛 뿔 + 눈 원판 */
  const CH = 1.25;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.0, .16, CH, 48, 1, true).translate(0, .4 + CH / 2, 0), coneMat()); cone.renderOrder = 8; G.add(cone);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.08, 96), discMat()); disc.rotation.x = -Math.PI / 2; disc.position.y = .4 + CH; disc.renderOrder = 9; G.add(disc);
  let open = 0, rot = 0, glitch = 0, snapT = -9;
  G.userData.snap = t => { snapT = t; open = 1; };                                         /* 완성: 눈이 번쩍 떠짐 */
  G.userData.glow = gMat;
  G.userData.update = (t, dt, col, power = .4, want = 0) => {
    open += (want - open) * Math.min(1, dt * (want > open ? 2.5 : 4));
    rot += dt * (.15 + power * .35);
    if (Math.random() < dt * .6) glitch = .25 + Math.random() * .25; glitch = Math.max(0, glitch - dt * 3);   /* 홀로그램이 가끔 지직 */
    const se = t - snapT, flash = se >= 0 && se < 1 ? Math.exp(-se * 4) : 0;
    if (flash > 0) glitch = 0;
    const on = Math.max(.04, open) * (1 - glitch * (Math.random() < .5 ? 1 : 0)) + flash * 1.6;
    { const k = se >= 0 && se < .7 ? se / .7 : 1, sc = se >= 0 && se < .7 ? .55 + .6 * (1 - Math.pow(1 - k, 3)) - .15 * Math.sin(k * Math.PI) * (1 - k) * 0 + .12 * Math.sin(k * Math.PI) : 1; disc.scale.setScalar(sc); }   /* 원판이 오므렸다 활짝 펼쳐짐 */
    const D = disc.material.uniforms; D.uCol.value.copy(col); D.uT.value = t; D.uOpen.value = open; D.uRot.value = rot; D.uI.value = (.18 + .55 * on);
    D.uLook.value.set(Math.sin(t * .37) + .4 * Math.sin(t * 1.3), Math.cos(t * .29) * .5);                               /* 둘레를 둘러봄 */
    disc.position.y = .4 + CH + Math.sin(t * 1.2) * .03;
    const C = cone.material.uniforms; C.uCol.value.copy(col); C.uT.value = t; C.uI.value = .12 + on * .45;
    gMat.uniforms.uT.value = t; gMat.uniforms.uCol.value.copy(col); gMat.uniforms.uI.value = .45 + power * .5; };
  return G;
}
