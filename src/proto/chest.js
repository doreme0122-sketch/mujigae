/* 봉인된 보물 상자 (사용자 2026-11-11: 제단 가운데 · 봉인된 느낌 · 몬스터는 둘레를 배회)
   · 등급 넷 (사용자 2026-11-11): 나무 → 청동 → 은 → 금 — 모양은 같고 재질 · 장식만 다름
       나무: 판자 결 · 이음새 · 닳은 모서리 · 검은 쇠띠와 쇠못 (녹) · 쇠 자물쇠
       청동: 룬 새긴 돌 몸통 (빛) · 청동 테 · 홈과 아래에 푸른 녹 · 햇빛 반짝임
       은:   은으로 덮은 몸통에 덩굴무늬 새김 · 맑은 반사 · 모서리 은 장식 · 파란 보석
       금:   금 몸통에 깊은 무늬 · 짙은 금 테 · 모서리 장식 · 빨강 · 파랑 · 초록 보석 · 뚜껑 꼭대기 연꽃 장식
   · 봉인: 돌기둥 여섯에서 사슬 여섯 줄 — 상자 등급 재질 (나무: 검은 쇠 · 청동 · 은 · 금 · 흐르는 빛 없이 은은히 빛남) · 상자 위에 떠서 도는 봉인 원 (여섯 조각 = 사슬 여섯) · 앞 자물쇠 봉인 문양
   · 왜 풀리나: 몬스터 체력과 사슬을 이음 — 체력 1/6이 줄 때마다 사슬 하나가 끊어짐
   · 쓰러뜨리면: 남은 사슬이 차례로 끊김 → 봉인 원이 깨짐 → 뚜껑이 떨다가 젖혀 열림 → 안에서 빛이 터짐
                 → 빛 덩이가 튀어나와 제단 앞 바닥(1층에서 주울 수 있는 높이)에 떨어짐 = 아이템 떨어질 자리 (아이템은 따로 받음)
   · 빛기둥은 없앰 (사용자 2026-11-11: 위에서 비스듬히 보는 카메라라 화면 밖 위치를 못 알려 줌 → 화면 밖 표시기가 대신함)
   · 상자가 내 화면에 들어오는 순간: 모서리가 별처럼 아주 밝게 번쩍했다 줄어듦 → 겉면에 무지개빛이 한 번 지나감 · 그 뒤 몇 초마다 은은히 다시 지나감
   · 상자 둘레로 작은 금빛 반짝이가 천천히 올라감 (동그란 티 안 나게 가는 십자 반짝임) */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { noise2 } from './islefield.js?v=11111311';
import { carvedBlock, runeD } from './ruins.js?v=11111311';

const W = 4.2, D = 2.8, BOT = .75, SEAM = 2.85, R = 1.45, AX = 3.0, LL = 4.3;   /* 몸통 너비 · 깊이 · 바닥 · 뚜껑 이음 높이 · 뚜껑 반지름 · 뚜껑 축 높이 · 뚜껑 길이 (섬 안 단위 · 0.5배 = m) */
const ORDER = [0, 3, 1, 4, 2, 5];   /* 체력이 줄 때 끊기는 차례 (마주 보는 것끼리 번갈아) */
export const GRADES = { wood: { name: '나무', k: 0 }, bronze: { name: '청동', k: 1 }, silver: { name: '은', k: 2 }, gold: { name: '금', k: 3 } };
const GOLD = new THREE.Color(1.25, .86, .32);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* 위치 · 법선 (· aGlow · 색) 만 남기고 하나로 */
function merge(list, glow, col) { const P = [], N = [], G = [], Cc = [];
  for (let e of list) { let g = e.g || e; g = g.index ? g.toNonIndexed() : g; if (!g.attributes.normal || e.flat) g.computeVertexNormals(); const n = g.attributes.position.count; P.push(...g.attributes.position.array); N.push(...g.attributes.normal.array);
    if (glow) { const a = g.attributes.aGlow; for (let i = 0; i < n; i++) G.push(a ? a.array[i] : 0); } if (col) for (let i = 0; i < n; i++) Cc.push(...e.c); }
  const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); b.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); if (glow) b.setAttribute('aGlow', new THREE.Float32BufferAttribute(G, 1)); if (col) b.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); return b; }
const at = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };

/* 둥근 뚜껑 (반원통) — 앞(+z)에서 뒤(-z)로 넘어가는 면 · 가운데 띠에 룬을 파고 홈에 빛 · 양 끝은 닳음 */
function dome() { const nU = 44, nV = 40, P = [], Gw = [], I = [], arc = Math.PI * R;
  for (let j = 0; j <= nV; j++) for (let i = 0; i <= nU; i++) { const u = i / nU, v = j / nV, x = (u - .5) * LL, th = v * Math.PI, s = (v - .5) * arc;
    let rr = R + .02 * noise2(x * 3.1, s * 2.7); const e = Math.min(u, 1 - u) * LL; if (e < .2) rr -= (.2 - e) * .35; let g = 0;
    if (Math.abs(s) < 1.05 && Math.abs(x) < 1.25) { const rd = runeD(x, s, 2.5, 2.1, .16, 41); if (rd < .085) { rr -= .07 * (rd < .055 ? 1 : (.085 - rd) / .03); if (rd < .06) g = 1; } }   /* 룬 띠: 가운데 두 갈비 사이 */
    else if (Math.abs(Math.abs(s) - 1.18) < .05 && Math.abs(x) < 1.25) rr -= .04;   /* 띠 테두리 홈 */
    P.push(x, AX + Math.sin(th) * rr, Math.cos(th) * rr); Gw.push(g); }
  for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) { const a = j * (nU + 1) + i, b = a + 1, c = a + nU + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aGlow', new THREE.Float32BufferAttribute(Gw, 1)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 뚜껑 양 끝 반원 (안쪽으로 살짝 들어간 판 · 가운데 꽃무늬 돋을새김) */
function cap(sx) { const n = 28, rings = 6, P = [], I = [];
  for (let k = 0; k <= rings; k++) for (let i = 0; i <= n; i++) { const rr = R * k / rings, th = i / n * Math.PI, petal = rr < .75 ? .05 * Math.max(0, Math.cos(th * 8)) * Math.sin(rr / .75 * Math.PI) : 0, rim = rr > R - .16 ? 0 : -.05;
    P.push(sx * (LL / 2 + rim + petal), AX + Math.sin(th) * Math.max(rr, .001), Math.cos(th) * rr); }
  for (let k = 0; k < rings; k++) for (let i = 0; i < n; i++) { const a = k * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; if (sx > 0) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; }
/* 금 등급 뚜껑 꼭대기 연꽃 장식 (돌림 깎기) */
function finial() { const pts = [[0, 0], [.42, 0], [.46, .06], [.3, .14], [.36, .24], [.44, .3], [.3, .42], [.16, .5], [.22, .6], [.12, .74], [.05, .86], [0, .9]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 16), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + (y > .2 && y < .45 ? .14 * Math.max(0, Math.cos(a * 8)) : 0); p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); return g; }

/* 공용 GLSL: 무지개 지나감 · 금속 비침 */
const SHARE = `uniform vec3 uSweep; uniform float uKind;
  vec3 rainbow(vec3 L, float b){ float h = fract(L.x * .12 + L.y * .18 + L.z * .05); vec3 rb = .55 + .45 * cos(6.2832 * (h + vec3(0., .33, .67))); float d = (L.x * .42 + L.y * .55 - L.z * .12) - uSweep.x; return rb * exp(-d * d * 7.) * uSweep.y * b; }
  vec3 metal(vec3 al, vec3 n, vec3 v, float rough){ vec3 r = reflect(-v, n); vec3 env = mix(GNDC * 1.3, SKYC * 1.7, smoothstep(-.3, .6, r.y)) + vec3(1., .95, .8) * pow(max(dot(r, uSun), 0.), 40. / rough) * 3.;
    return al * (lit(vec3(1.), n, 1., .6) * .35 + env * .75) + pow(max(dot(normalize(uSun + v), n), 0.), 60. / rough) * vec3(1., .94, .8) * 1.4 * (1. - rough * .5); }`;
const CV = `attribute float aGlow; uniform mat4 uM; varying vec3 vP, vN, vW, vL; varying float vG; void main(){ vL = position; vec4 p = uM * vec4(position, 1.); vP = p.xyz; vN = mat3(uM) * normal; vW = (modelMatrix * p).xyz; vG = aGlow; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
/* 몸통 칠 (등급마다): 0 나무 · 1 돌 (청동 등급) · 2 은 · 3 금 */
const BODY_F = SHARE + `uniform vec3 uSA, uSB, uCov, uGlowC; uniform float uCovA, uGlowA, uSeal; varying vec3 vP, vN, vW, vL; varying float vG;
  void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n), v = normalize(cameraPosition - vW); an /= an.x + an.y + an.z; vec3 c;
    float tr = fb(vL.zy * 1.6) * an.x + fb(vL.xz * 1.6) * an.y + fb(vL.xy * 1.6) * an.z, tr2 = vn(vL.zy * 7.) * an.x + vn(vL.xz * 7.) * an.y + vn(vL.xy * 7.) * an.z;
    float edge = smoothstep(.12, .0, min(min(abs(abs(vL.x) - 2.1), abs(abs(vL.z) - 1.4)), abs(vL.y - 2.85)));   /* 모서리 (닳음 · 반짝임) */
    if (uKind < .5) {   /* 나무: 판자 (높이 0.42마다 이음새) · 결은 길게 · 옹이 · 닳은 모서리는 밝게 */
      float pk = floor(vL.y / .42 + (vL.y > 2.9 ? (atan(vL.y - 3., vL.z) * 3.) : 0.)), fy = fract(vL.y / .42), seam = smoothstep(.06, .0, min(fy, 1. - fy)) * (vL.y < 2.9 ? 1. : 0.);
      float ax = abs(n.x) > .6 ? vL.z : vL.x, grain = vn(vec2(ax * 1.1 + pk * 13.7, (vL.y + vL.z * .3) * 18. + vn(vec2(ax * 3., pk)) * 3.)), knot = smoothstep(.12, .0, length(vec2(fract(ax * .55 + pk * .37) - .5, fy - .5) * vec2(2., 1.)));
      vec3 al = mix(vec3(.33, .19, .09), vec3(.56, .36, .19), grain * .7 + tr * .3) * (1. - .45 * seam) * (1. - .35 * knot) + edge * vec3(.12, .08, .04);
      c = lit(al, n, 1., .85) + pow(max(dot(normalize(uSun + v), n), 0.), 18.) * .06; }
    else if (uKind < 1.5) {   /* 돌 (청동 등급): 장소 돌과 같은 결 · 이끼 · 룬 빛 */
      vec3 st = mix(uSA, uSB, tr) * (.84 + .22 * tr2); float cov = smoothstep(.6, .9, n.y + (tr2 - .5) * .4) * smoothstep(.4, .75, vn(vL.xz * .9)) * uCovA; st = mix(st, uCov * (.8 + .3 * tr2), cov);
      c = lit(st, n, 1., .5 + .5 * smoothstep(-.7, .5, n.y)); c += uGlowC * vG * (.5 + .5 * uGlowA) * (.6 + .4 * uSeal); }
    else {   /* 은 · 금: 덩굴무늬 새김 (홈은 어둡고 · 둘레는 닳아 밝음) · 맑은 반사 */
      float gold = step(2.5, uKind), q = sin(vL.x * 5.2 + sin(vL.y * 4.1 + vL.z * 3.3) * 1.9 + sin(vL.z * 6.1) * .8) * sin(vL.y * 5.7 - sin(vL.x * 3.7) * 1.6 + vL.z * 2.1);
      float vine = smoothstep(.09, .0, abs(q)) * (1. - edge), leaf = smoothstep(.75, .95, q) * .6;
      vec3 al = gold > .5 ? mix(vec3(.72, .4, .05), vec3(.95, .64, .16), tr) : mix(vec3(.66, .69, .74), vec3(.86, .89, .93), tr);
      al *= 1. - .55 * vine; al += leaf * (gold > .5 ? vec3(.12, .08, .0) : vec3(.06)); al = mix(al, al * .55, vG);   /* 룬 홈은 어둡게 (빛 대신) */
      c = metal(al, n, v, .35 + .25 * tr2 + vine * .5) + uGlowC * vG * .35 * uSeal; }
    c += rainbow(vL, 1.);
    gl_FragColor = vec4(fogged(c, vP), 1.); }`;
/* 테 칠 (등급마다): 0 검은 쇠 (녹) · 1 청동 (푸른 녹) · 2 은 · 3 짙은 금 */
const TRIM_F = SHARE + `uniform vec3 uGlowC; uniform float uSeal; varying vec3 vP, vN, vW, vL; varying float vG;
  void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), an = abs(n), v = normalize(cameraPosition - vW); an /= an.x + an.y + an.z; vec3 c;
    float tr = vn(vL.zy * 4.) * an.x + vn(vL.xz * 4.) * an.y + vn(vL.xy * 4.) * an.z, tr2 = vn(vL.zy * 13.) * an.x + vn(vL.xz * 13.) * an.y + vn(vL.xy * 13.) * an.z;
    if (uKind < .5) { float rust = smoothstep(.55, .8, tr * .6 + tr2 * .4 + (.5 - .5 * n.y) * .3); vec3 al = mix(vec3(.11, .11, .12), vec3(.42, .2, .08), rust * .8);
      c = lit(al, n, 1., .8) + pow(max(dot(normalize(uSun + v), n), 0.), 30.) * (1. - rust) * .35; }
    else if (uKind < 1.5) { float pat = smoothstep(.5, .8, tr * .7 + tr2 * .3 + (.5 - .5 * n.y) * .25); vec3 al = mix(mix(vec3(.36, .22, .09), vec3(.72, .5, .24), tr2), vec3(.2, .46, .38), pat * .8);
      c = lit(al, n, 1., .85) + vec3(1., .86, .6) * pow(max(dot(n, normalize(uSun + v)), 0.), 36.) * (1. - pat) * 1.1; }
    else if (uKind < 2.5) c = metal(mix(vec3(.72, .75, .8), vec3(.9, .92, .95), tr2), n, v, .25 + .2 * tr);
    else c = metal(mix(vec3(.62, .33, .04), vec3(.9, .58, .12), tr2), n, v, .25 + .2 * tr);
    c += uGlowC * uSeal * (.08 + .22 * pow(1. - abs(dot(n, v)), 3.)) * (uKind < .5 ? .4 : 1.);   /* 봉인 빛이 테에 비침 */
    c += rainbow(vL, 1.);
    gl_FragColor = vec4(fogged(c, vP), 1.); }`;
/* 보석: 깎은 면마다 빛이 다르게 · 안에서 맑게 빛남 */
const GEM_V = `attribute vec3 color; uniform mat4 uM; varying vec3 vP, vN, vW, vC, vL; void main(){ vC = color; vL = position; vec4 p = uM * vec4(position, 1.); vP = p.xyz; vN = mat3(uM) * normal; vW = (modelMatrix * p).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`;
const GEM_F = SHARE + `varying vec3 vP, vN, vW, vC, vL; void main(){ vec3 n = normalize(vN), v = normalize(cameraPosition - vW); float f = pow(1. - abs(dot(n, v)), 2.);
    vec3 c = vC * (.35 + .9 * max(dot(n, uSun), 0.)) + vC * f * 1.4 + vec3(1.) * pow(max(dot(reflect(-v, n), uSun), 0.), 30.) * 2.5 + vC * (.4 + .3 * sin(uT * 2. + vL.x * 9.)); c += rainbow(vL, .6);
    gl_FragColor = vec4(fogged(c, vP), 1.); }`;

/* x0 z0: 제단 가운데 · cb: 상자 바닥 높이 (섬 안) · anchors: 기둥 여섯 사슬 거는 자리 (기둥 각도 순) · drop: 아이템 떨어질 자리 (섬 안 · 1층에서 주울 수 있는 바닥) */
export function buildChest({ GL, U, S, pxU, x0, z0, cb, anchors, angles, drop, group, grade = 'bronze' }) {
  const body = [], bodyL = [], trim = [], trimL = [], ornS = [], ornL = [];   /* 몸통 (가만히 · 뚜껑) · 테 (가만히 · 뚜껑) · 은 · 금 등급 장식 */
  /* ── 몸통 ── */
  body.push(at(carvedBlock(4.9, .4, 3.5, 'band', .05, 51), 0, .2, 0));                                  /* 받침 */
  body.push(at(carvedBlock(W, SEAM - BOT, D, 'panel', .07, 52), 0, (SEAM + BOT) / 2, 0));              /* 몸통 */
  body.push(at(carvedBlock(3.0, 1.15, .16, 'runes', .05, 53, .9), 0, 1.6, D / 2 + .06));               /* 앞 룬판 */
  body.push(at(carvedBlock(3.0, 1.45, .16, 'lozenge', .05, 54), 0, 1.75, -D / 2 - .06, Math.PI));      /* 뒤 마름모 */
  for (const s of [-1, 1]) body.push(at(carvedBlock(2.0, 1.45, .16, 'rosette', .05, 55 + s), s * (W / 2 + .06), 1.75, 0, s * Math.PI / 2));   /* 옆 꽃무늬 */
  /* 테: 발 · 위아래 띠 · 모서리 꺾쇠 · 징 · 자물쇠판 */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { trim.push(at(carvedBlock(.72, .36, .72, 'band', .04, 60 + sx + sz * 2), sx * 1.85, .58, sz * 1.15));
    trim.push(at(new RoundedBoxGeometry(.5, SEAM - BOT + .06, .1, 2, .03), sx * (W / 2 - .22), (SEAM + BOT) / 2, sz * (D / 2 + .05)));
    trim.push(at(new RoundedBoxGeometry(.1, SEAM - BOT + .06, .5, 2, .03), sx * (W / 2 + .05), (SEAM + BOT) / 2, sz * (D / 2 - .22)));
    /* 은 · 금: 모서리 장식 (아래 · 위 모서리를 감싸는 세 갈래 잎 장식) */
    for (const yy of [BOT + .05, SEAM - .05]) { const o = new THREE.OctahedronGeometry(.3, 0); o.scale(1, .7, 1); ornS.push(at(o, sx * (W / 2 + .02), yy, sz * (D / 2 + .02)));
      for (const [dx, dz] of [[-sx * .42, 0], [0, -sz * .42]]) ornS.push(at(new THREE.SphereGeometry(.09, 8, 6), sx * (W / 2 + .07) + dx, yy + (yy > 1 ? -.12 : .12), sz * (D / 2 + .07) + dz)); } }
  for (const yy of [BOT + .14, SEAM - .13]) { for (const sz of [-1, 1]) trim.push(at(new RoundedBoxGeometry(W + .12, .2, .08, 2, .03), 0, yy, sz * (D / 2 + .04)));
    for (const sx of [-1, 1]) trim.push(at(new RoundedBoxGeometry(.08, .2, D + .12, 2, .03), sx * (W / 2 + .04), yy, 0)); }
  const stud = (list, x, y, z, r = .065) => list.push(at(new THREE.IcosahedronGeometry(r, 1), x, y, z));
  for (const yy of [BOT + .14, SEAM - .13]) { for (let i = -4; i <= 4; i++) for (const sz of [-1, 1]) stud(trim, i * .46, yy, sz * (D / 2 + .1)); for (let i = -2; i <= 2; i++) for (const sx of [-1, 1]) stud(trim, sx * (W / 2 + .1), yy, i * .5); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let q = 0; q < 4; q++) stud(trim, sx * (W / 2 - .22), BOT + .5 + q * .45, sz * (D / 2 + .11), .075);
  trim.push(at(new RoundedBoxGeometry(1.05, .74, .12, 2, .04), 0, 2.42, D / 2 + .13));   /* 자물쇠판 */
  for (const [x, y] of [[-.4, 2.13], [.4, 2.13], [-.4, 2.71], [.4, 2.71]]) stud(trim, x, y, D / 2 + .2);
  /* 사슬 고리: 기둥 쪽을 보는 몸통 벽 위쪽 (앞뒤 면은 자물쇠 · 룬판을 피해 모서리 꺾쇠 위) */
  const hooks = angles.map(a => { const dx = Math.cos(a), dz = Math.sin(a), side = Math.abs(dx) * (D / 2) > Math.abs(dz) * (W / 2), s = Math.min((W / 2 + .12) / Math.abs(dx || 1e-6), (D / 2 + .12) / Math.abs(dz || 1e-6));
    const hx = side ? Math.sign(dx) * (W / 2 + .12) : Math.sign(dx) * 1.75, hz = side ? dz * s : Math.sign(dz) * (D / 2 + .12), out = side ? V(Math.sign(dx), 0, 0) : V(0, 0, Math.sign(dz));
    const ring = new THREE.TorusGeometry(.22, .055, 6, 16); if (side) ring.rotateY(Math.PI / 2); trim.push(at(ring, hx + out.x * .1, 2.3, hz + out.z * .1));
    trim.push(at(new RoundedBoxGeometry(side ? .08 : .44, .36, side ? .44 : .08, 2, .03), hx, 2.6, hz));
    return V(x0 + hx + out.x * .1, cb + 2.3, z0 + hz + out.z * .1); });
  /* ── 뚜껑 (뒤쪽 아래 모서리를 축으로 젖혀짐) ── */
  bodyL.push(dome()); for (const sx of [-1, 1]) bodyL.push(cap(sx));
  bodyL.push(at(carvedBlock(LL + .06, AX - SEAM, R * 2 + .04, 'band', .03, 71), 0, (AX + SEAM) / 2, 0));   /* 뚜껑 아래 테 */
  for (const x of [-1.42, 1.42, -2.06, 2.06]) { const rib = new THREE.TorusGeometry(R + .05, Math.abs(x) > 2 ? .1 : .085, 6, 28, Math.PI); rib.rotateY(Math.PI / 2); at(rib, x, AX, 0);   /* 갈비 (앞 → 꼭대기 → 뒤) */
    trimL.push(rib); for (let q = 1; q < 8; q++) { const th = q / 8 * Math.PI; stud(trimL, x, AX + Math.sin(th) * (R + .13), Math.cos(th) * (R + .13)); } }
  for (const sz of [-1, 1]) trimL.push(at(new RoundedBoxGeometry(LL + .14, .14, .09, 2, .03), 0, SEAM + .08, sz * (R + .04)));
  for (const sx of [-1, 1]) trimL.push(at(new RoundedBoxGeometry(.09, .14, R * 2 + .14, 2, .03), sx * (LL / 2 + .05), SEAM + .08, 0));
  trimL.push(at(new RoundedBoxGeometry(.56, .62, .1, 2, .03), 0, SEAM - .1, R + .14));   /* 걸쇠 (자물쇠판 위로 내려옴) */
  trimL.push(at(new THREE.TorusGeometry(.16, .045, 6, 14), 0, SEAM - .36, R + .22));
  for (const sx of [-1, 1]) trimL.push(at(new THREE.CylinderGeometry(.11, .11, .5, 10), sx * 1.4, SEAM, -R - .02, 0, 0, Math.PI / 2));   /* 경첩 */
  ornL.push(at(finial(), 0, AX + R - .04, 0));   /* 금: 꼭대기 연꽃 */
  /* 보석 (은: 걸쇠에 파랑 하나 / 금: 걸쇠에 빨강 · 앞 룬판 두 모서리에 파랑 · 초록 · 연꽃 위 빨강) */
  const gem = (r, x, y, z, c, rx = Math.PI / 2) => { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, 1, .55); g.rotateX(rx - Math.PI / 2); return { g: at(g, x, y, z), c, flat: true }; };
  const RED = [1.2, .12, .1], BLUE = [.2, .5, 1.3], GRN = [.15, 1.05, .45];
  const gemS = { silver: [], gold: [gem(.17, -1.32, 2.0, D / 2 + .16, BLUE), gem(.17, 1.32, 2.0, D / 2 + .16, GRN)] }, gemL = { silver: [gem(.17, 0, SEAM - .02, R + .21, BLUE)], gold: [gem(.19, 0, SEAM - .02, R + .21, RED), { g: at(new THREE.OctahedronGeometry(.16, 0), 0, AX + R + .95, 0), c: RED, flat: true }] };

  /* 칠 */
  const still = { value: new THREE.Matrix4().makeTranslation(x0, cb, z0) }, lidU = { value: new THREE.Matrix4() }, CU = { uSeal: { value: 1 }, uSweep: { value: new THREE.Vector3(-9, 0, 0) }, uKind: { value: 1 } };
  const mk = (frag, vert, uM) => new THREE.ShaderMaterial({ uniforms: { ...U, ...S, ...CU, uM }, side: THREE.DoubleSide, vertexShader: vert, fragmentShader: GL + frag });
  const mesh = (geo, frag, vert, uM) => { const m = new THREE.Mesh(geo, mk(frag, vert, uM)); m.frustumCulled = false; group.add(m); return m; };
  mesh(merge(body, true), BODY_F, CV, still); mesh(merge(bodyL, true), BODY_F, CV, lidU); mesh(merge(trim, true), TRIM_F, CV, still); mesh(merge(trimL, true), TRIM_F, CV, lidU);
  const orn = { s: mesh(merge(ornS, true), TRIM_F, CV, still), l: mesh(merge(ornL, true), TRIM_F, CV, lidU) };
  const gems = {}; for (const k of ['silver', 'gold']) gems[k] = [gemS[k].length ? mesh(merge(gemS[k], false, true), GEM_F, GEM_V, still) : null, mesh(merge(gemL[k], false, true), GEM_F, GEM_V, lidU)].filter(Boolean);

  /* ── 빛 (모두 더하는 빛 · 깊이 안 씀) ── */
  const C = { uC: { value: new THREE.Color() }, uT: U.uT };
  const glowMat = (vert, frag, uni = {}) => new THREE.ShaderMaterial({ uniforms: { ...C, ...uni }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  /* 뚜껑 틈새로 새는 빛 (닫혀 있을 때 · 숨 쉬듯) */
  const seamG = merge([at(new THREE.BoxGeometry(W - .1, .07, .02), 0, SEAM + .02, D / 2 + .005), at(new THREE.BoxGeometry(W - .1, .07, .02), 0, SEAM + .02, -D / 2 - .005), at(new THREE.BoxGeometry(.02, .07, D - .1), W / 2 + .005, SEAM + .02, 0), at(new THREE.BoxGeometry(.02, .07, D - .1), -W / 2 - .005, SEAM + .02, 0)]);
  seamG.translate(x0, cb, z0); const SA = { uA: { value: 1 } };
  group.add(new THREE.Mesh(seamG, glowMat(`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec3 vP; void main(){ float f = .7 + .3 * sin(uT * 2.2 + vP.x * 1.3); gl_FragColor = vec4(mix(uC, vec3(1.), .5) * 2.2 * f * uA, 1.); }`, SA)));
  /* 열렸을 때 안에서 쏟아지는 빛 */
  const OA = { uA: { value: 0 } };
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(W - .3, D - .3).rotateX(-Math.PI / 2).translate(x0, cb + SEAM + .03, z0), glowMat(`varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ vec2 q = abs(vU - .5) * 2.; float e = (1. - pow(q.x, 6.)) * (1. - pow(q.y, 6.)); gl_FragColor = vec4(mix(uC, vec3(1.), .65) * e * uA * 2.4, 1.); }`, OA)));
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 4, 24, 1, true).translate(x0, cb + SEAM + 2, z0), glowMat(`varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vU; void main(){ float s = .55 + .45 * sin(vU.x * 60. + uT * 3.) * sin(vU.x * 23. - uT * 2.); gl_FragColor = vec4(mix(uC, vec3(1.), .4) * pow(1. - vU.y, 2.) * s * uA * .7, 1.); }`, OA)));

  /* 봉인 원: 상자 위에 떠서 천천히 돎 · 여섯 조각 = 사슬 여섯 (끊기면 그 조각이 깜빡이다 꺼짐) · 다 끊기면 깨짐 */
  const SEC = { uSec: { value: [1, 1, 1, 1, 1, 1] }, uA: { value: 1 }, uRot: { value: 0 }, uA0: { value: angles[0] } };
  const SY = cb + AX + R + .75, seal = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2).translate(x0, SY, z0), glowMat(`varying vec2 vQ; void main(){ vQ = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT, uRot, uA0; uniform float uSec[6]; varying vec2 vQ;
     float h1(float n){ return fract(sin(n * 91.7) * 43758.5); }
     float ln(vec2 p, vec2 a, vec2 b, float w){ vec2 pa = p - a, ba = b - a; float t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return smoothstep(w, w * .3, length(pa - ba * t)); }
     void main(){ float r = length(vQ); if (r > 1.) discard; float a = atan(vQ.y, vQ.x);
       float am = a + uRot, k = floor(mod((-a - uA0) / 6.2832 * 6. + .5, 6.)); float sec = uSec[0]; for (int i = 1; i < 6; i++) if (float(i) == k) sec = uSec[i];   /* 이 자리가 어느 사슬 조각인지 (기둥 각도 기준) */
       float m = smoothstep(.012, .0, abs(r - .97)) + smoothstep(.008, .0, abs(r - .9)) + smoothstep(.006, .0, abs(r - .62)) * .8 + smoothstep(.01, .0, abs(r - .34));
       float cell = floor(am / 6.2832 * 36.), fu = fract(am / 6.2832 * 36.), fv = (r - .905) / .06;   /* 바깥 띠: 룬 36자 */
       if (fv > 0. && fv < 1.) { float s1 = h1(cell), s2 = h1(cell + 7.), s3 = h1(cell + 13.);
         m += smoothstep(.16, .05, abs(fu - .5)) * step(.3, s1) + smoothstep(.12, .03, abs(fv - (.25 + .5 * s2))) * step(.25, fu) * step(fu, .75) + smoothstep(.12, .04, abs(fu - fv * (s3 > .5 ? 1. : -1.) - (s3 > .5 ? 0. : 1.))) * step(.6, s3) * .9; }
       mat2 R2 = mat2(cos(uRot), -sin(uRot), sin(uRot), cos(uRot)); vec2 p = R2 * vQ;   /* 안쪽 육각별 (돎) */
       for (int i = 0; i < 6; i++) { float t0 = float(i) * 1.0472, t1 = t0 + 2.0944; m += ln(p, vec2(cos(t0), sin(t0)) * .62, vec2(cos(t1), sin(t1)) * .62, .012) * .9; }
       for (int i = 0; i < 6; i++) { float t0 = float(i) * 1.0472 + .5236; vec2 c = vec2(cos(t0), sin(t0)) * .76; m += smoothstep(.012, .0, abs(length(p - c) - .09)) * .9 + smoothstep(.05, .0, length(p - c)) * .6; }
       m += smoothstep(.2, .0, r) * .5 + smoothstep(.012, .0, abs(r - .2)) * .8;
       float fl = sec > .99 ? 1. : sec * (.5 + .5 * step(.5, fract(uT * 9. + k * .37)));
       gl_FragColor = vec4(mix(uC, vec3(1.), .35) * (m * 1.25 + smoothstep(1., .85, r) * smoothstep(.25, .9, r) * .07) * fl * uA * (.85 + .15 * sin(uT * 1.7)), 1.); }`, SEC)); seal.renderOrder = 8; group.add(seal);
  /* 앞 자물쇠 봉인 문양 */
  group.add(new THREE.Mesh(new THREE.PlaneGeometry(.95, .95).translate(x0, cb + 2.42, z0 + D / 2 + .2), glowMat(`varying vec2 vQ; void main(){ vQ = (uv - .5) * 2.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uC; uniform float uA, uT; varying vec2 vQ; void main(){ float r = length(vQ), a = atan(vQ.y, vQ.x); if (r > 1.) discard;
      float m = smoothstep(.05, .0, abs(r - .8)) + smoothstep(.04, .0, abs(r - .62)) * step(.5, fract(a / 6.2832 * 12. + uT * .3)) + smoothstep(.12, .0, length(vQ - vec2(0., .12))) * 1.4 + smoothstep(.06, .0, abs(vQ.x)) * step(-.35, vQ.y) * step(vQ.y, .1) * 1.2;
      gl_FragColor = vec4(mix(uC, vec3(1.), .5) * m * uA * (.9 + .2 * sin(uT * 3.)), 1.); }`, { uA: SEC.uA })));

  /* ── 사슬 여섯 (상자 등급 재질: 검은 쇠 · 청동 · 은 · 금) ── 고리를 엇갈려 꿴 사슬 · 처짐 · 흐르는 빛 없이 은은히 빛남 · 끊기면 고리가 흩어지며 떨어짐 */
  const chains = anchors.map((A, c) => { const B = hooks[c], L = A.distanceTo(B), sag = .6 + L * .05; return { A, B, L, sag, P: t => A.clone().lerp(B, t).add(V(0, -sag * 4 * t * (1 - t), 0)) }; });
  const SP = .46, links = []; chains.forEach((ch, c) => { const n = Math.ceil(ch.L / SP); for (let i = 0; i < n; i++) links.push([c, (i + .5) / n, i]); });
  const NL = links.length, link = new THREE.TorusGeometry(.26, .07, 5, 12); link.scale(1.45, 1, 1);
  const iA = new Float32Array(NL * 3), mats = [], m4 = new THREE.Matrix4(), X = V(), Y = V(), Z = V(), up = V(0, 1, 0);
  links.forEach(([c, t, i], k) => { const ch = chains[c], p = ch.P(t), q = ch.P(Math.min(1, t + .01)).sub(ch.P(Math.max(0, t - .01))).normalize(); X.copy(q); Y.crossVectors(q, up).normalize(); Z.crossVectors(X, Y);
    if (i % 2) { const tmp = Y.clone(); Y.copy(Z); Z.copy(tmp).negate(); } m4.makeBasis(X, Y, Z).setPosition(p); mats.push(m4.clone()); iA.set([c, t, i], k * 3); });
  const ig = new THREE.InstancedBufferGeometry().copy(link); ig.instanceCount = NL; ig.setAttribute('aI', new THREE.InstancedBufferAttribute(iA, 3));
  const BR = { uBrk: { value: [-1, -1, -1, -1, -1, -1] }, uShake: { value: 0 }, uGold: { value: GOLD }, uHalo: { value: new THREE.Color() } };
  const chainM = new THREE.InstancedMesh(ig, new THREE.ShaderMaterial({ uniforms: { ...U, ...BR, uKind: CU.uKind },
    vertexShader: `attribute vec3 aI; uniform float uBrk[6]; uniform float uShake, uT; varying vec3 vP, vN, vW; varying float vB;
      float h1(float n){ return fract(sin(n * 127.1) * 43758.5); }
      void main(){ int c = int(aI.x + .5); float b = -1.; for (int i = 0; i < 6; i++) if (i == c) b = uBrk[i];
        vB = -1.; vec4 w = instanceMatrix * vec4(position, 1.); vec3 nn = mat3(instanceMatrix) * normal;
        w.xyz += vec3(sin(uT * 23. + aI.z * .9), sin(uT * 19. + aI.z * 1.3), cos(uT * 21. + aI.z)) * .05 * uShake * sin(aI.y * 3.1416);   /* 싸움: 사슬이 팽팽히 떨림 */
        if (b >= 0.) { float snap = .5 + (h1(aI.x * 7.) - .5) * .4, bl = b - abs(aI.y - snap) * .35; vB = bl;   /* 끊긴 자리에서 양쪽으로 차례로 흩어짐 */
          if (bl > 0.) { float s = h1(aI.z + aI.x * 31.), s2 = h1(aI.z * 1.7 + aI.x * 13.); vec3 ctr = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
            vec3 v = vec3(s - .5, .4 + s2 * .8, s2 - .5) * 5.; float ang = bl * (4. + s * 8.), ca = cos(ang), sa = sin(ang);
            vec3 lp = w.xyz - ctr; lp = vec3(lp.x * ca - lp.y * sa, lp.x * sa + lp.y * ca, lp.z); float k = max(0., 1. - bl / 1.6);
            w.xyz = ctr + lp * k + v * bl + vec3(0., -9.8 * bl * bl, 0.); nn = vec3(nn.x * ca - nn.y * sa, nn.x * sa + nn.y * ca, nn.z); } }
        vP = w.xyz; vN = nn; vW = (modelMatrix * w).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.); }`,
    fragmentShader: GL + `uniform float uKind; varying vec3 vP, vN, vW; varying float vB;
      void main(){ if (vB > 1.6) discard; vec3 n = normalize(vN), v = normalize(cameraPosition - vW), al, glw; float sp, w = vn(vP.xz * 3.1 + vP.y * 2.3);   /* 사슬도 상자 등급 재질 (사용자 2026-11-11) */
        if (uKind < .5) { float rust = smoothstep(.5, .8, w); al = mix(vec3(.11, .11, .12), vec3(.4, .19, .07), rust); glw = vec3(.07, .06, .05); sp = .35 * (1. - rust); }   /* 나무: 검은 쇠사슬 · 녹 */
        else if (uKind < 1.5) { float pat = smoothstep(.55, .85, w); al = mix(vec3(.62, .4, .16), vec3(.2, .46, .38), pat * .8); glw = vec3(.2, .13, .05); sp = .8 * (1. - pat); }   /* 청동: 홈에 푸른 녹 */
        else if (uKind < 2.5) { al = vec3(.74, .77, .82); glw = vec3(.24, .26, .3); sp = 1.3; }   /* 은 */
        else { al = vec3(.78, .48, .1); glw = vec3(.5, .3, .05); sp = .9; }   /* 금 */
        vec3 c = lit(al, n, 1., .9) * .8 + glw + vec3(1., .93, .78) * pow(max(dot(normalize(uSun + v), n), 0.), 24.) * sp + al * pow(1. - abs(dot(n, v)), 2.) * .4;   /* 은은한 빛 · 햇빛 반짝 (흐르는 빛 없음) */
        if (vB >= 0.) c += vec3(1.) * 3. * exp(-vB * 5.);   /* 끊기는 순간 하얗게 번쩍 */
        gl_FragColor = vec4(fogged(c, vP), 1.); }` }), NL);
  mats.forEach((m, k) => chainM.setMatrixAt(k, m)); chainM.frustumCulled = false; group.add(chainM);
  /* 사슬 둘레 번짐 (얇은 빛 띠 · 등급 색 · 늘 카메라를 봄 · 흐름 없음) */
  const HP = [], HT = [], HS = [], HI = []; chains.forEach((ch, c) => { const n = 40, b0 = HP.length / 3; for (let i = 0; i <= n; i++) { const t = i / n, p = ch.P(t), q = ch.P(Math.min(1, t + .02)).sub(ch.P(Math.max(0, t - .02))).normalize(); for (const s of [-1, 1]) { HP.push(p.x, p.y, p.z); HT.push(q.x, q.y, q.z, t); HS.push(s, c); } }
    for (let i = 0; i < n; i++) { const a = b0 + i * 2; HI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3)); hg.setAttribute('aT', new THREE.Float32BufferAttribute(HT, 4)); hg.setAttribute('aS', new THREE.Float32BufferAttribute(HS, 2)); hg.setIndex(HI);
  const halo = new THREE.Mesh(hg, glowMat(`attribute vec4 aT; attribute vec2 aS; uniform float uBrk[6]; varying float vS, vK; void main(){ int c = int(aS.y + .5); float b = -1.; for (int i = 0; i < 6; i++) if (i == c) b = uBrk[i];
      vec3 w = (modelMatrix * vec4(position, 1.)).xyz, sd = normalize(cross(aT.xyz, cameraPosition - w)); vS = aS.x; vK = b < 0. ? 1. : max(0., 1. - b * 4.);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + sd * aS.x * .5, 1.); }`,
    `uniform vec3 uHalo; varying float vS, vK; void main(){ float x = 1. - abs(vS); gl_FragColor = vec4(uHalo * x * x * .18 * vK, 1.); }`, BR)); halo.frustumCulled = false; group.add(halo);
  /* 기둥 쪽 걸쇠 (사슬과 같은 재질) */
  const anch = new THREE.Mesh(merge(anchors.map(A => { const d = V(x0 - A.x, 0, z0 - A.z).normalize(), g = new THREE.TorusGeometry(.42, .1, 6, 18); g.rotateY(Math.atan2(d.x, d.z)); return at(g, A.x - x0, A.y - cb, A.z - z0); }), true), mk(TRIM_F, CV, still));
  anch.material.uniforms = { ...anch.material.uniforms, uSweep: { value: new THREE.Vector3(-9, 0, 0) } }; anch.frustumCulled = false; group.add(anch);

  /* 불꽃 (사슬이 끊길 때 · 봉인이 깨질 때 · 뚜껑이 열릴 때 · 빛 덩이가 떨어질 때) */
  const NS = 360, sP = new Float32Array(NS * 3), sV = new Float32Array(NS * 3), sT = new Float32Array(NS).fill(-99); let sk = 0;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sP, 3)); sg.setAttribute('aV', new THREE.BufferAttribute(sV, 3)); sg.setAttribute('aT0', new THREE.BufferAttribute(sT, 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: { ...C, uPx: pxU, uGold: BR.uGold }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aV; attribute float aT0; uniform float uT, uPx; varying float vA; void main(){ float age = uT - aT0; vA = age < 0. || age > 1.2 ? 0. : 1. - age / 1.2;
      vec3 p = position + aV * age + vec3(0., -7. * age * age, 0.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = vA > 0. ? uPx * .2 / -mv.z * (.6 + vA) : 0.; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uGold; varying float vA; void main(){ vec2 q = abs(gl_PointCoord - .5) * 2.; float s = max(0., 1. - q.x * 5.) * (1. - q.y) + max(0., 1. - q.y * 5.) * (1. - q.x); if (s <= .01 || vA <= 0.) discard; gl_FragColor = vec4(mix(uGold, vec3(1.), .5) * s * vA * 2.2, 1.); }` }));
  sparks.frustumCulled = false; group.add(sparks);
  const burst = (p, n, spd, t0) => { for (let i = 0; i < n; i++) { const k = sk++ % NS, a = Math.random() * 6.283, e = Math.random() * 2 - .5, s = spd * (.4 + Math.random() * .8);
      sP.set([p.x, p.y, p.z], k * 3); sV.set([Math.cos(a) * s * Math.cos(e), Math.sin(e) * s + spd * .3, Math.sin(a) * s * Math.cos(e)], k * 3); sT[k] = t0; }
    sg.attributes.position.needsUpdate = sg.attributes.aV.needsUpdate = sg.attributes.aT0.needsUpdate = true; };

  /* 상자 둘레로 천천히 올라가는 작은 금빛 반짝이 (가는 십자 · 동그란 티 안 남) */
  const NR = 70, rA = new Float32Array(NR * 3); for (let i = 0; i < NR; i++) rA.set([Math.random(), Math.random(), Math.random()], i * 3);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NR * 3), 3)); rg.setAttribute('aS', new THREE.BufferAttribute(rA, 3));
  const RU = { uB: { value: V(x0, cb + .5, z0) }, uA: { value: 1 } };
  const rise = new THREE.Points(rg, new THREE.ShaderMaterial({ uniforms: { ...C, ...RU, uPx: pxU, uGold: BR.uGold }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aS; uniform float uT, uPx, uA; uniform vec3 uB; varying float vA; void main(){ float ph = fract(aS.x * 5.3 + uT * (.05 + aS.y * .04)), a = aS.z * 6.283 + ph * 2.2, r = 2.6 + aS.y * 1.6 + ph * .8;
      vec3 p = uB + vec3(cos(a) * r, ph * 11., sin(a) * r * .8); vA = sin(ph * 3.1416) * (.5 + .5 * pow(.5 + .5 * sin(uT * (2. + aS.z * 3.) + aS.x * 30.), 3.)) * uA;
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uPx * .14 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uGold; varying float vA; void main(){ vec2 q = abs(gl_PointCoord - .5) * 2.; float s = max(0., 1. - q.x * 6.) * (1. - q.y) + max(0., 1. - q.y * 6.) * (1. - q.x) * .6; if (s <= .01) discard; gl_FragColor = vec4(mix(uGold, vec3(1.), .45) * s * vA * 1.6, 1.); }` }));
  rise.frustumCulled = false; group.add(rise);

  /* 모서리 별빛 (상자가 화면에 들어오는 순간 아주 밝게 번쩍 → 줄어듦 · 모서리마다 조금씩 늦게) */
  const corners = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { corners.push([sx * (W / 2 + .1), BOT, sz * (D / 2 + .1)], [sx * (W / 2 + .1), SEAM, sz * (D / 2 + .1)]); } corners.push([LL / 2 + .05, AX + R * .7, 0], [-LL / 2 - .05, AX + R * .7, 0]);
  const stG = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); stG.instanceCount = corners.length;
  stG.setAttribute('aC', new THREE.InstancedBufferAttribute(new Float32Array(corners.flat()), 3)); stG.setAttribute('aD', new THREE.InstancedBufferAttribute(new Float32Array(corners.map((_, i) => (i * 7 % corners.length) / corners.length * .45)), 1));
  const STU = { uS: { value: -9 }, uO: { value: V(x0, cb, z0) } };
  const stars = new THREE.Mesh(stG, glowMat(`attribute vec3 aC; attribute float aD; uniform float uT, uS; uniform vec3 uO; varying vec2 vQ; varying float vK; void main(){ vQ = position.xy * 2.; float a = uT - uS - aD; vK = a < 0. ? 0. : (a < .07 ? a / .07 : exp(-(a - .07) * 3.2));
      vec3 c = uO + aC, w = (modelMatrix * vec4(c, 1.)).xyz, f = normalize(cameraPosition - w), sd = normalize(cross(vec3(0., 1., 0.), f)), uu = cross(f, sd); float s = 3.4 * vK + .01, r = a * .6;
      vec2 xy = mat2(cos(r), -sin(r), sin(r), cos(r)) * position.xy; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(c + (sd * xy.x + uu * xy.y) * s, 1.); }`,
    `uniform vec3 uGold; varying vec2 vQ; varying float vK; void main(){ vec2 q = abs(vQ); float r = length(vQ);
      float ray = max(0., 1. - q.x * 14.) * (1. - q.y) + max(0., 1. - q.y * 14.) * (1. - q.x), ray2 = max(0., 1. - abs(q.x - q.y) * 10.) * (1. - r) * .35, core = exp(-r * r * 40.) * 2.;
      gl_FragColor = vec4(mix(uGold, vec3(1.), .75) * (ray + ray2 + core) * vK * 2.4, 1.); }`, { ...STU, uGold: BR.uGold }));
  stars.frustumCulled = false; stars.renderOrder = 10; group.add(stars);

  /* 아이템 떨어질 자리: 열리면 빛 덩이가 튀어나와 포물선으로 날아가 바닥에 떨어짐 → 자리에 금빛 원 (줍는 거리 3m 고리 · 아이템은 따로 받음) */
  const DY = drop.y, orbU = { uP: { value: V() }, uA: { value: 0 } };
  const orb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(`uniform vec3 uP; varying vec2 vQ; void main(){ vQ = position.xy * 2.; vec3 w = (modelMatrix * vec4(uP, 1.)).xyz, f = normalize(cameraPosition - w), sd = normalize(cross(vec3(0., 1., 0.), f)), uu = cross(f, sd);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(uP + (sd * position.x + uu * position.y) * 2.4, 1.); }`,
    `uniform vec3 uGold; uniform float uA; varying vec2 vQ; void main(){ float r = length(vQ); gl_FragColor = vec4(mix(uGold, vec3(1.), .6) * (exp(-r * r * 18.) * 2.5 + exp(-r * r * 4.) * .4) * uA, 1.); }`, { ...orbU, uGold: BR.uGold }));
  orb.frustumCulled = false; orb.renderOrder = 10; group.add(orb);
  const spotU = { uA: { value: 0 }, uK: { value: 0 } };
  const spot = new THREE.Mesh(new THREE.PlaneGeometry(15, 15).rotateX(-Math.PI / 2).translate(drop.x, DY + .06, drop.z), glowMat(`varying vec2 vQ; void main(){ vQ = (uv - .5) * 15.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    `uniform vec3 uGold; uniform float uA, uK, uT; varying vec2 vQ; void main(){ float r = length(vQ), a = atan(vQ.y, vQ.x);
      float pool = exp(-r * r * .35) * (.8 + .2 * sin(uT * 2.)), ring = smoothstep(.12, .0, abs(r - 6.)) * (.55 + .45 * step(.5, fract(a / 6.2832 * 24. - uT * .2))), land = smoothstep(.4, .0, abs(r - uK * 7.)) * (1. - uK);   /* 가운데 빛 웅덩이 · 줍는 거리(3m) 고리 · 떨어질 때 퍼지는 물결 */
      gl_FragColor = vec4(mix(uGold, vec3(1.), .3) * (pool * .9 + ring * .5 + land * 1.5) * uA, 1.); }`, { ...spotU, uGold: BR.uGold })); spot.renderOrder = 7; group.add(spot);

  /* ── 상태 ── */
  const brk = BR.uBrk.value, sec = SEC.uSec.value; let left = 6, open = -1, now = 0, seen = false, nextSweep = 0, sweepT = -9, sweepK = 0, landed = false, opened = false, burstT = -1;
  const lidAt = (ang, jit) => { const piv = V(0, SEAM, -R - .02); lidU.value.makeTranslation(x0, cb, z0).multiply(new THREE.Matrix4().makeTranslation(piv.x, piv.y, piv.z)).multiply(new THREE.Matrix4().makeRotationX(-ang)).multiply(new THREE.Matrix4().makeRotationZ(jit)).multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z)); };
  lidAt(0, 0);
  const HALO = [[.25, .2, .16], [.9, .55, .25], [.8, .86, 1], [1.25, .86, .32]];
  const setGrade = k => { grade = k; const g = GRADES[k].k; CU.uKind.value = g; BR.uHalo.value.setRGB(...HALO[g]); orn.s.visible = g >= 2; orn.l.visible = g === 3; for (const m of gems.silver) m.visible = g === 2; for (const m of gems.gold) m.visible = g === 3; };
  setGrade(grade);
  const snap = c => { if (brk[c] >= 0) return; brk[c] = 0; sec[c] = .999; left--; const ch = chains[c]; burst(ch.P(.5), 50, 6, now); burst(ch.B, 18, 3, now); burst(ch.A, 18, 3, now); };
  const reset = () => { for (let c = 0; c < 6; c++) { brk[c] = -1; sec[c] = 1; } left = 6; open = -1; opened = landed = false; burstT = -1; lidAt(0, 0); SEC.uA.value = 1; OA.uA.value = 0; SA.uA.value = 1; orbU.uA.value = 0; spotU.uA.value = 0; RU.uA.value = 1; seen = false; };
  const setHP = hp => { const keep = Math.max(0, Math.ceil(hp * 6 - 1e-6)); for (let k = 0; k < 6 - keep; k++) snap(ORDER[k]); };
  let lastLeft = []; const kill = () => { lastLeft = ORDER.filter(c => brk[c] < 0); open = 0; };
  /* 내 화면에 들어오는 순간: 모서리 별빛 → 무지개 한 번 (세게) · 그 뒤 몇 초마다 은은히 */
  const shine = () => { STU.uS.value = now; sweepT = now + .35; sweepK = 1; nextSweep = now + 5.5; };
  const C0 = V(), ndc = V();
  const update = (t, dt, st, cam) => { now = t; SEC.uRot.value = t * .12;
    for (let c = 0; c < 6; c++) if (brk[c] >= 0) { brk[c] += dt; sec[c] = Math.max(0, sec[c] - dt * .9); }
    BR.uShake.value = st === 'fight' ? 1 : 0;
    /* 화면 안에 있나 (상자 가운데가 화면 안쪽 · 카메라 앞) */
    let onScr = false; if (cam) { C0.set(x0, cb + 2, z0); group.localToWorld(C0); ndc.copy(C0).project(cam); onScr = ndc.z < 1 && Math.abs(ndc.x) < .9 && Math.abs(ndc.y) < .9; }
    if (onScr && !seen) shine(); seen = onScr;
    if (seen && t > nextSweep) { sweepT = t; sweepK = .45; nextSweep = t + 5.5 + Math.random() * 2; }
    const sp = (t - sweepT) / 1.3; CU.uSweep.value.set(-3 + sp * 9, sp >= 0 && sp <= 1 ? sweepK * Math.sin(sp * Math.PI) : 0, 0);   /* 무지개 띠가 왼쪽 아래 → 오른쪽 위로 지나감 */
    if (open >= 0) { open += dt; const o = open;
      lastLeft.forEach((c, i) => { if (o > i * .16) snap(c); });   /* 남은 사슬이 차례로 끊김 */
      const tBreak = lastLeft.length * .16 + .25;
      if (o > tBreak && SEC.uA.value === 1) { SEC.uA.value = .999; burst(V(x0, SY, z0), 90, 9, now); }   /* 봉인 원이 깨짐 */
      if (o > tBreak) SEC.uA.value = Math.max(0, 1.6 * Math.exp(-(o - tBreak) * 6) * (o - tBreak < .08 ? 1 : .6));
      const t1 = tBreak + .35, t2 = t1 + .55, t3 = t2 + .7, tf = t2 + .25, tl = tf + .9;   /* 떨림 → 열림 → 빛 덩이 날아감 → 바닥에 떨어짐 */
      let ang = 0, jit = 0;
      if (o > t1 && o < t2) { const k = (o - t1) / (t2 - t1); jit = Math.sin(o * 70) * .025 * k; ang = Math.max(0, Math.sin(o * 55)) * .04 * k; }
      if (o >= t2) { const k = Math.min(1, (o - t2) / (t3 - t2)), e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); ang = 1.95 * e; if (!opened) { opened = true; burst(V(x0, cb + SEAM + .4, z0), 120, 8, now); } }
      lidAt(ang, jit); SA.uA.value = o < t2 ? 1 + (o > t1 ? 1.5 * (o - t1) / (t2 - t1) : 0) : Math.max(0, 1 - (o - t2) * 3);
      OA.uA.value = o < t2 ? 0 : Math.min(1, (o - t2) * 4) * (.6 + 1.5 * Math.exp(-(o - t2) * 3));
      burstT = o >= t2 ? o - t2 : -1; RU.uA.value = o < t2 ? 1 : Math.max(.35, 1 - (o - t2) * .3);
      if (o >= tf && o < tl) { const k = (o - tf) / (tl - tf), A = V(x0, cb + SEAM + .6, z0), B = V(drop.x, DY + 1.1, drop.z); orbU.uP.value.copy(A).lerp(B, k).add(V(0, 9 * k * (1 - k), 0)); orbU.uA.value = 1;
        if (Math.random() < dt * 30) burst(orbU.uP.value, 2, 1.2, now); }   /* 빛 덩이 날아감 (꼬리 불꽃) */
      if (o >= tl) { if (!landed) { landed = true; burst(V(drop.x, DY + .6, drop.z), 70, 5, now); } const k = Math.min(1, (o - tl) / 1.2);
        orbU.uP.value.set(drop.x, DY + 1.1 + .25 * Math.sin(t * 2.4), drop.z); orbU.uA.value = .75 + .25 * Math.sin(t * 3.); spotU.uA.value = Math.min(1, (o - tl) * 3); spotU.uK.value = k; } }
  };
  return { update, setHP, kill, reset, setGrade, get grade() { return grade; }, get left() { return left; }, get opened() { return opened; }, get landed() { return landed; }, get burstT() { return open >= 0 ? burstT : -1; }, get onScreen() { return seen; }, C: C.uC.value, SY, hooks, center: V(x0, cb + 2, z0) };
}
