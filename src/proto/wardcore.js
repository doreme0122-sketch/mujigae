/* 와드 부품 ② 가운데 유리 기둥 — 사용자 참고 그림의 보라 에너지 기둥
   · 받침 맨 위 빛 테에 꽂힌 투명한 유리 원통. 위아래를 금속 테가 물고(볼트로 조임), 둘레 금속 버팀대 넷이 세로로 잡아 줌(유리가 홀로 서 있지 않게) — 돌 받침 위에 얹은 금속 장치
   · 안: 보라 에너지가 아래에서 위로 휘감아 오르며 소용돌이 (받침에서 올라온 힘이 여기 모임 — 받침 틈 빛이 위로 흐르던 까닭)
   · 한가운데: 빛 알맹이 + 그 둘레를 서로 다른 기울기로 도는 궤도 셋 (그림의 원자 무늬 — 와드의 심장)
     궤도는 가는 선이 아니라 굵기가 숨 쉬는 빛 띠, 위를 빛 알갱이가 달림
   · 차지할수록 에너지가 아래부터 차오르고(차지 정도가 눈에 보임), 다 차면 알맹이가 확 밝아지며 궤도가 빨라짐
   · 에너지는 늘 보라(와드의 심장 색), 테·버팀대 홈 빛은 주인 색
   단위 m, 받침 위(y = 받침 top)부터 높이 약 1.8m */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowMaterial, stoneMaterial, solid } from './wardbase.js?v=11061724';

const clean = g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g.index ? g.toNonIndexed() : g; };
const AB = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
const NOISE = `float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float f3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += n3(p) * a; p *= 2.1; a *= .5; } return s; }`;

/* 유리: 가장자리에서 비치는 빛(앞면) + 안쪽 면의 옅은 반사(뒷면). 굴곡 따라 세로 하이라이트 */
function glassMat(back) {
  return new THREE.ShaderMaterial({ ...AB, side: back ? THREE.BackSide : THREE.FrontSide, uniforms: { uCol: { value: new THREE.Vector3(.75, .55, 1) }, uT: { value: 0 } },
    vertexShader: 'varying vec3 vN, vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uCol; uniform float uT; varying vec3 vN, vW;
      void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); float nv = abs(dot(N, V)), q = 1. - nv, F = q * q * q;
        vec3 R = reflect(-V, N); float hl = smoothstep(.93, .995, max(dot(R, normalize(vec3(-.5, .4, .75))), 0.)) * 1.4 + smoothstep(.96, .999, max(dot(R, normalize(vec3(.7, .2, .7))), 0.)) * .7;   /* 세로로 긴 반사 */
        vec3 c = mix(uCol, vec3(1.), .5) * F * ${back ? '.18' : '.55'} + vec3(.9, .95, 1.1) * hl * ${back ? '.15' : '.6'};
        gl_FragColor = vec4(c, 1.); }` });
}
/* 보라 에너지: 휘감아 오르는 띠 + 잔물결, 차오른 높이(uFill) 위로는 흐릿 */
function plasmaMat() {
  return new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uFill: { value: .3 }, uI: { value: 1 }, uH: { value: 1.3 } },
    vertexShader: 'varying vec3 vP; varying vec3 vN, vW; void main(){ vP = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, uFill, uI, uH; varying vec3 vP; varying vec3 vN, vW; ${NOISE}
      void main(){ float a = atan(vP.z, vP.x + 1e-5), y = vP.y / uH;
        float sw = sin(a * 2. + y * 11. - uT * 2.6) * .5 + .5, sw2 = sin(-a * 3. + y * 7. - uT * 1.7 + 1.3) * .5 + .5;        /* 두 갈래가 엇갈려 휘감아 오름 */
        float n = f3(vec3(cos(a) * 1.6, y * 4. - uT * .9, sin(a) * 1.6));
        float band = smoothstep(.55, .95, sw) * .9 + smoothstep(.7, 1., sw2) * .55 + n * .45;
        float lvl = uFill + .035 * sin(a * 2. + uT * 1.9) + .022 * sin(a * 5. - uT * 2.7 + 1.1) + (n - .5) * .06;             /* 물낯이 평평하게 잘린 면이 아니라 일렁이는 결 (사용자: 탑에 칼날 경계선) */
        float lev = smoothstep(lvl + .14, lvl - .1, y);                                                                    /* 차오른 만큼 진하게 — 경계는 넓게 녹아듦 */
        float sy = (y - lvl) / .07, surf = exp(-sy * sy) * smoothstep(.02, .12, uFill) * smoothstep(1., .85, uFill) * .55;   /* 물낯은 옅은 빛 띠로만, 처음·끝엔 스르르 */
        vec3 V = normalize(cameraPosition - vW); float edge = 1. - abs(dot(normalize(vN), V)); edge = .35 + edge * edge * .9;
        vec3 deep = vec3(.42, .12, .95), hot = vec3(.95, .55, 1.25);
        vec3 c = mix(deep, hot, smoothstep(.6, 1.2, band)) * band * edge * (.18 + lev * .95) + hot * surf;
        c *= smoothstep(0., .06, y) * smoothstep(1., .9, y);
        gl_FragColor = vec4(c * uI, 1.); }` });
}
/* 궤도 띠: 화면 쪽으로 눕는 고리 리본. 굵기가 숨 쉬고 위를 빛 알갱이가 달림 */
function orbitMat() {
  return new THREE.ShaderMaterial({ ...AB, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uI: { value: 1 }, uSp: { value: 1 }, uPh: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float uT, uI, uSp, uPh; varying vec2 vU;
      void main(){ float x = abs(vU.y * 2. - 1.), u = vU.x;
        float run = fract(u - uT * .35 * uSp + uPh), head = exp(-run * 10.) * 1.6 + exp(-fract(u * 3. - uT * .9 * uSp + uPh) * 14.) * .5;   /* 달리는 빛 알갱이와 꼬리 */
        float core = exp(-x * x * 9.), body = exp(-x * x * 2.5) * .35;
        vec3 c = vec3(.75, .45, 1.2) * (core * (.45 + head) + body) + vec3(1.) * core * head * .5;
        gl_FragColor = vec4(c * uI, 1.); }` });
}
function ribbonRing(r, w, seg = 96) {          /* 원 둘레 띠 (평면, 폭 w) — uv.x = 둘레 위치, uv.y = 폭 */
  const P = [], UV = [], I = [];
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    P.push(c * (r - w / 2), 0, s * (r - w / 2), c * (r + w / 2), 0, s * (r + w / 2)); UV.push(i / seg, 0, i / seg, 1); if (i < seg) { const b = i * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); return g;
}

export function makeWardCore(uT, y0) {
  const G = new THREE.Group(); G.position.y = y0;
  const H = 1.78, RG = .44, stone = [], glowQ = [];   /* 사용자: 조금 더 길게 (1.32 → 1.78m) */
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  /* 아래 물림 테 · 위 물림 테 (돌) */
  stone.push(lathe([[.44, -.02], [.62, -.02], [.66, .04], [.64, .14], [.56, .2], [.45, .2]]));
  stone.push(lathe([[.45, H - .2], [.58, H - .2], [.66, H - .12], [.68, H - .02], [.62, H + .06], [.44, H + .06]]));
  /* 둘레 돌 버팀대 넷: 위아래 테를 잇는 세로 돌, 유리 바로 바깥 · 가운데 높이에 묶음 돌 */
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, r = RG + .1;
    const s = new THREE.Shape(); s.moveTo(-.07, 0); s.lineTo(.07, 0); s.lineTo(.06, H - .26); s.lineTo(-.06, H - .26); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1 }); g.translate(0, .15, -.04);
    g.rotateY(Math.PI / 2 - a); g.translate(Math.cos(a) * r, 0, Math.sin(a) * r); stone.push(g);
    const kn = new THREE.BoxGeometry(.2, .14, .16); kn.translate(0, H * .5, 0); kn.rotateY(Math.PI / 2 - a); kn.translate(Math.cos(a) * (r + .02), 0, Math.sin(a) * (r + .02)); stone.push(kn);
    /* 버팀대 바깥 면 세로 홈 빛 */
    const ro = r + .065, ca = Math.cos(a), sa = Math.sin(a), tx = -sa, tz = ca, w = .022, P = (o, y) => [ca * ro + tx * o, y, sa * ro + tz * o];
    for (const [ya, yb] of [[.24, H * .5 - .1], [H * .5 + .1, H - .28]]) glowQ.push([P(-w, ya), P(w, ya), P(w, yb), P(-w, yb)]); }
  /* 물림 테 둘레 볼트 (금속 테를 조인 자리) */
  for (const [yy, r] of [[.1, .655], [H - .07, .675]]) for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, b = new THREE.CylinderGeometry(.028, .028, .03, 8); b.rotateZ(Math.PI / 2); b.rotateY(-a); b.translate(Math.cos(a) * r, yy, Math.sin(a) * r); stone.push(b); }
  /* 메탈 (사용자: 유리 기둥 틀은 금속): 짙은 건메탈 + 닳은 모서리는 은빛, 위아래 테는 같은 금속 */
  const sMat = stoneMaterial(uT);   /* 유리 뼈대도 처음처럼 받침과 같은 돌 (사용자 2026-11-03) */
  const stoneMesh = new THREE.Mesh(solid(mergeGeometries(stone.map(clean))), sMat); G.add(stoneMesh);
  /* 테 빛 (아래·위 물림 테 안쪽) + 버팀대 홈 빛 → 주인 색 */
  { const p = [], uv = [], kk = [];
    const quad = (A, B, C, D, k0, k1) => { p.push(...A, ...B, ...C, ...A, ...C, ...D); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); kk.push(k0, k0, k1, k0, k1, k1); };
    for (const q of glowQ) quad(...q, .2, .8);
    for (const yy of [.2, H - .2]) for (let i = 0; i < 48; i++) { const a0 = i / 48 * Math.PI * 2, a1 = (i + 1) / 48 * Math.PI * 2, r = .455, Q = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r]; quad(Q(a0, yy - .02), Q(a1, yy - .02), Q(a1, yy + .025), Q(a0, yy + .025), 1, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aK', new THREE.Float32BufferAttribute(kk, 1));
    var gMat = glowMaterial(); const gm = new THREE.Mesh(g, gMat); gm.renderOrder = 4; G.add(gm); }
  G.userData.glow = gMat;
  /* 유리 원통 (뒷면 → 에너지 → 알맹이·궤도 → 앞면 순서로 그림: 유리 속에 든 것처럼) */
  const tube = new THREE.CylinderGeometry(RG, RG, H - .36, 48, 1, true); tube.translate(0, .18 + (H - .36) / 2, 0);
  const gb = new THREE.Mesh(tube, glassMat(true)), gf = new THREE.Mesh(tube, glassMat(false)); gb.renderOrder = 3; gf.renderOrder = 9; G.add(gb, gf);
  const pl = new THREE.CylinderGeometry(RG * .86, RG * .86, H - .36, 48, 8, true); pl.translate(0, (H - .36) / 2, 0);
  const plasma = new THREE.Mesh(pl, plasmaMat()); plasma.position.y = .18; plasma.renderOrder = 5; plasma.material.uniforms.uH.value = H - .36; G.add(plasma);
  const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(RG * .5, RG * .5, H - .36, 32, 8, true).translate(0, (H - .36) / 2, 0), plasmaMat()); pl2.position.y = .18; pl2.renderOrder = 5; pl2.material.uniforms.uH.value = H - .36; G.add(pl2);   /* 안쪽 한 겹 더: 깊이 */
  /* 심장: 빛 알맹이 + 궤도 셋 */
  const heart = new THREE.Group(); heart.position.y = H * .52; G.add(heart);
  const orb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ ...AB, uniforms: { uI: { value: 1 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy * 2.; vec4 c = modelViewMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * .7; gl_Position = projectionMatrix * c; }',
    fragmentShader: 'uniform float uI, uT; varying vec2 vP; void main(){ float r = length(vP), a = atan(vP.y, vP.x + 1e-5); float core = exp(-r * r * 60.) * 2.2, glow = exp(-r * r * 9.) * .7, rays = pow(max(0., cos(a * 4. + uT)), 18.) * exp(-r * 5.) * .4; gl_FragColor = vec4(vec3(.95, .7, 1.3) * (core + glow + rays) * uI, 1.); }' }));
  orb.renderOrder = 7; orb.frustumCulled = false; heart.add(orb);
  const orbits = [[.95, 0], [.95, 2.09], [.95, 4.19]].map(([tilt, yaw], i) => { const m = new THREE.Mesh(ribbonRing(.26, .028), orbitMat()); m.rotation.set(tilt, yaw, 0, 'YXZ'); m.material.uniforms.uPh.value = i / 3; m.renderOrder = 7; heart.add(m); return m; });
  G.userData.height = H + .06;
  G.userData.update = (t, col, power = .4, fill = .3) => {
    gMat.uniforms.uT.value = t; gMat.uniforms.uCol.value.copy(col); gMat.uniforms.uI.value = .5 + power * .55; gMat.uniforms.uFlow.value = .3 + power;
    for (const m of [gb, gf]) m.material.uniforms.uT.value = t;
    for (const p of [plasma, pl2]) { const U = p.material.uniforms; U.uT.value = t * (.7 + power * .8); U.uFill.value = fill; U.uI.value = (p === pl2 ? .6 : 1) * (.55 + power * .35); }
    const beat = 1 + .08 * Math.sin(t * 3.1) * Math.sin(t * 1.3);
    orb.material.uniforms.uI.value = (.3 + fill * .35 + power * .25) * beat; orb.material.uniforms.uT.value = t;
    orbits.forEach((m, i) => { m.rotateY(.004 * (1 + power * 2.5) * (i % 2 ? -1 : 1)); m.material.uniforms.uT.value = t; m.material.uniforms.uSp.value = .6 + power * 1.6; m.material.uniforms.uI.value = .35 + power * .4; });
    heart.rotation.y = t * (.2 + power * .5); heart.position.y = H * .52 + Math.sin(t * 1.1) * .02; };
  return G;
}
