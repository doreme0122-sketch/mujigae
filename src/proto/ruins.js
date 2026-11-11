/* 고대 수호자 유적 (사용자 2026-11-11: 동굴은 고대 수호자 유적 느낌 · 입구 앞엔 가운데가 무너져 끊어진 돌다리 — 우리는 날아서 건넘 · 단순화하지 말 것)
   만드는 것 (모두 깎이고 닳고 부서진 돌 — 상자 · 원통 그대로 두지 않음):
   ① 끊어진 돌다리: 돌판을 하나하나 깐 다리 판 · 연석 · 난간 기둥과 동자 기둥 · 난간대 · 다리 밑 아치(쐐기돌을 하나씩) · 아치와 다리 판 사이를 메운 쌓은 돌
      가운데는 무너져 끊김 — 끝은 들쭉날쭉 · 빠진 돌 · 하늘에 멈춘 듯 떠 있는 돌덩이 · 끊긴 끝에서 늘어진 덩굴 · 다리 양 끝 기둥 위 층진 머리 장식(하나는 부서짐)
   ② 유적 입구: 바위 절벽에 반쯤 묻힌 신전 문 (네모 기둥 · 상인방 · 처마 · 룬 · 돌 쌓기) — 아래 ②의 설명
   ③ 기둥 복도 (동굴 안): 네모 기둥이 양쪽에 줄지어 서고 위를 들보가 이음 (들보 밑은 3층보다 높게) · 몇 개는 부러지고 하나는 쓰러짐 · 룬이 희미하게 빛남
   ④ 신전 앞마당 무너진 기둥 무더기 (1층을 막음)
   막힘은 보이는 두께 그대로
   돌려주는 것: geos (깎은 돌 칠 하나로 한 번에 그림) · glow (빛 무늬 세모 [a, b, c, 색, 위상]) · obstacles ([x, y, z, r]) · strands (늘어진 덩굴 점 줄) */
import * as THREE from 'three';
import { noise2 } from './islefield.js?v=11111739';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* 닳은 돌: 꼭짓점을 노이즈로 살짝 밀고 들어감 (amp: 깊이 · f: 촘촘함) — 모서리가 고르게 반듯하지 않게 */
function weather(g, amp, f, seed) { const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = noise2(x * f + seed, z * f + y * f * .7) * .7 + noise2(y * f * 2.3 - seed, x * f * 2.1 + z) * .3;
    const l = Math.hypot(x, y, z) || 1; p.setXYZ(i, x + x / l * n * amp, y + y / l * n * amp, z + z / l * n * amp); } return g; }
/* 깎은 돌덩이: 모서리를 둥글게 닳리고 군데군데 떨어져 나감 (chip) */
function block(w, h, d, seg = 2, chip = .12, seed = 0) { const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg); g.deleteAttribute('uv'); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ex = Math.abs(x) / (w / 2), ey = Math.abs(y) / (h / 2), ez = Math.abs(z) / (d / 2), edge = (ex > .99) + (ey > .99) + (ez > .99);
    if (edge >= 2) { const k = chip * (.5 + .9 * Math.max(0, noise2(x * 3.1 + seed, y * 2.7 + z * 1.9))); x -= Math.sign(x) * k * (ex > .99); y -= Math.sign(y) * k * (ey > .99); z -= Math.sign(z) * k * (ez > .99); }   /* 모서리 · 꼭짓점이 떨어져 나감 */
    p.setXYZ(i, x, y, z); } return g; }
/* 새긴 돌덩이: 앞면(+z)에 무늬를 파냄 — panel: 테두리 안을 판판하게 · lozenge: 마름모 격자 · rosette: 여덟 잎 꽃 · band: 가로 홈 · none: 그냥 깎은 돌 · 모서리는 닳고 떨어져 나감 */
/* 고대 룬 (사용자 2026-11-11): 각진 획 열여섯 가지 — 칸(0~1) 안 선분 [x0, y0, x1, y1] */
const RUNES = [[[.5, 0, .5, 1]], [[.3, 0, .3, 1], [.3, 1, .75, .75], [.3, .6, .75, .35]], [[.3, 0, .3, 1], [.3, .9, .75, .6], [.75, .6, .3, .3]], [[.3, 0, .3, 1], [.7, 0, .7, 1], [.3, 1, .7, .5]],
  [[.2, 0, .8, 1], [.8, 0, .2, 1]], [[.5, 0, .5, 1], [.2, .75, .8, .25]], [[.25, 0, .25, 1], [.25, 1, .75, .5], [.75, .5, .25, 0]], [[.5, 0, .5, 1], [.5, 1, .8, .75], [.5, 1, .2, .75]],
  [[.2, .1, .5, 1], [.5, 1, .8, .1]], [[.5, 0, .5, 1], [.2, .55, .8, .55], [.3, .25, .7, .25]], [[.3, 0, .3, 1], [.3, .5, .75, 1], [.3, .5, .75, 0]], [[.2, 1, .5, .55], [.8, 1, .5, .55], [.5, .55, .5, 0]],
  [[.5, 0, .2, .5], [.2, .5, .5, 1], [.5, 1, .8, .5], [.8, .5, .5, 0]], [[.3, 0, .3, 1], [.7, 0, .7, 1], [.3, .65, .7, .35]], [[.25, .85, .75, .85], [.5, .85, .5, 0], [.25, .35, .75, .35]], [[.3, 1, .3, 0], [.3, 0, .75, .25], [.3, .55, .65, .8]]];
const segD = (px, py, x0, y0, x1, y1) => { const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - x0 - dx * t, py - y0 - dy * t); };
/* 판 위 룬 글자 줄 (세로로 길면 세로 줄 · 아니면 가로 줄) → 획까지 거리 (단위 = 돌 크기) */
function runeD(x, y, w, h, m, seed) { const col = h > w * 1.3, cw = col ? Math.min(w - 2 * m, .62) : Math.min((h - 2 * m) * .7, .62), ch = cw * 1.45, step = (col ? ch : cw) + .16;
  const along = col ? y + h / 2 - m : x + w / 2 - m, i = Math.floor(along / step), lo = along - i * step; if (lo > (col ? ch : cw)) return 9;
  const ux = col ? (x + cw / 2) / cw : lo / cw, uy = col ? lo / ch : (y + ch / 2) / ch; if (ux < -.05 || ux > 1.05 || uy < -.05 || uy > 1.05) return 9;
  const G = RUNES[Math.abs(Math.floor(seed * 7 + i * 5.3 + (seed % 3) * i)) % RUNES.length]; let d = 9; for (const [a, b, c, e] of G) d = Math.min(d, segD(ux * cw, uy * ch, a * cw, b * ch, c * cw, e * ch)); return d; }
function carved(w, h, d, kind, depth, seed, glow = 0) { const res = kind === 'none' ? 0 : kind === 'panel' ? 3 : kind === 'runes' ? 11 : 6, nU = Math.max(2, Math.ceil(w * res)), nV = Math.max(2, Math.ceil(h * res)), g = new THREE.BoxGeometry(w, h, d, nU, nV, 2); g.deleteAttribute('uv');
  const p = g.attributes.position, gl = new Float32Array(p.count), fr = v => v - Math.floor(v), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }, m = Math.min(.24, w * .12, h * .2);
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ex = Math.abs(x) / (w / 2), ey = Math.abs(y) / (h / 2), ez = Math.abs(z) / (d / 2);
    if (kind !== 'none' && z > d / 2 - 1e-4) { const inner = sm(0, .06, Math.min(w / 2 - m - Math.abs(x), h / 2 - m - Math.abs(y))); let c = 0;
      if (kind === 'panel') c = 1; else if (kind === 'band') c = Math.abs(fr(y / .22) - .5) < .17 ? 1 : 0;
      else if (kind === 'lozenge') c = Math.abs(fr(x / .62) - .5) + Math.abs(fr(y / .62) - .5) > .3 ? 1 : .15;
      else if (kind === 'runes') { const rd = runeD(x, y, w, h, m, seed); c = rd < .055 ? 1 : rd < .085 ? (.085 - rd) / .03 : 0; if (glow && rd < .06) gl[i] = glow; }   /* 룬: 획을 파냄 · 빛 흐르는 룬은 홈에 빛 */
      else if (kind === 'rosette') { const cw = Math.min(h - 2 * m, 1.3), lx = (fr(x / cw + .5) - .5) * cw, rr = Math.hypot(lx, y), a = Math.atan2(y, lx), pe = cw * (.3 + .1 * Math.cos(a * 8)); c = rr < pe && rr > cw * .07 ? .1 : 1; }
      z -= depth * c * inner; }
    const edge = (ex > .999) + (ey > .999) + (ez > .999);
    if (edge >= 2) { const k = .1 * (.4 + Math.max(0, noise2(x * 2.7 + seed, y * 2.3 + z * 1.7))); x -= Math.sign(x) * k * (ex > .999); y -= Math.sign(y) * k * (ey > .999); z -= Math.sign(z) * k * (ez > .999); }
    p.setXYZ(i, x, y, z); }
  g.setAttribute('aGlow', new THREE.BufferAttribute(gl, 1)); g.computeVertexNormals(); return g; }
const at = (g, x, y, z, ry = 0, rx = 0, rz = 0) => { g.rotateZ(rz); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); return g; };
/* 홈 파인 둥근 기둥 몸통 (flutes 개의 세로 홈) */
function fluted(r, h, flutes = 16, seg = 6) { const g = new THREE.CylinderGeometry(r, r * 1.04, h, flutes * 3, seg, false); g.deleteAttribute('uv'); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), l = Math.hypot(x, z); if (l < r * .5) continue; const a = Math.atan2(z, x), k = 1 - .06 * Math.pow(Math.max(0, Math.cos(a * flutes)), 2); p.setX(i, x * k); p.setZ(i, z * k); } return g; }

export function buildRuins({ F, hAt, LAYERS, Y, LO, TUN }) {
  const geos = [], rock = [], glow = [], obstacles = [], strands = [], r = rngOf(131), add = (...g) => g.flat().forEach(q => { if (!q.attributes.aGlow) q.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count), 1)); geos.push(q.index ? q.toNonIndexed() : q); });
  const R = LO.ruins; if (!R) return { geos, rock, glow, obstacles, strands };

  /* ① 끊어진 돌다리 ─────────────────────────────────────────── */
  { const { a, b, w, gap } = R.bridge, A = V(a[0], 0, a[1]), B = V(b[0], 0, b[1]), dir = B.clone().sub(A), L = dir.length(); dir.normalize(); const side = V(-dir.z, 0, dir.x), ry = Math.atan2(dir.x, dir.z);
    const deckY = Y.MEADOW + .35, at2 = (u, s, y) => A.clone().addScaledVector(dir, u).addScaledVector(side, s).setY(y), broke = u => u > gap[0] * L && u < gap[1] * L;
    const ragged = (u, s) => { const e0 = gap[0] * L + (noise2(s * .9, 1) * 1.6 + .6), e1 = gap[1] * L - (noise2(s * .9, 7) * 1.6 + .6); return u > e0 && u < e1; };   /* 무너진 끝은 들쭉날쭉 */
    /* 다리 판: 돌판을 엇갈려 깔고 (줄눈) 군데군데 기울거나 빠짐 */
    for (let u = .6; u < L; u += 1.3) for (let s = -w / 2 + .9, row = 0; s < w / 2 - .5; s += 1.6, row++) { const uu = u + (row % 2) * .65; if (ragged(uu, s) || uu > L - .2) continue;
      const nearGap = Math.min(Math.abs(uu - gap[0] * L), Math.abs(uu - gap[1] * L)) < 2.6; if (nearGap && r() < .25) continue;
      const p = at2(uu, s, deckY + (nearGap ? (r() - .6) * .35 : (r() - .5) * .06)), g = block(1.22, .34, 1.52, 2, .07, u * 3 + s); at(g, p.x, p.y, p.z, ry + (r() - .5) * (nearGap ? .25 : .03), (r() - .5) * (nearGap ? .2 : .02)); add(g); }
    /* 연석 · 다리 판 밑 두꺼운 바닥돌 · 다리 밑 아치 (쐐기돌을 하나씩) · 아치와 판 사이 쌓은 돌 */
    for (const sd of [-1, 1]) for (let u = .5; u < L; u += 1.8) { if (ragged(u, sd * w / 2)) continue; const p = at2(u, sd * (w / 2 - .25), deckY + .25), g = block(1.7, .55, .55, 2, .08, u + sd); at(g, p.x, p.y, p.z, ry - Math.PI / 2); add(g); }
    for (let u = .5; u < L; u += 2.1) for (const s of [-w / 4, w / 4]) { if (ragged(u, s)) continue; const p = at2(u, s, deckY - .65), g = block(2, .9, w / 2 - .05, 2, .1, u * 1.7 + s); at(g, p.x, p.y, p.z, ry - Math.PI / 2); add(g); }
    const archY = u => deckY - 1.3 - 9 * Math.pow(1 - Math.sin(Math.PI * u / L), 1.6);   /* 아치 밑면: 양 끝(섬 절벽)에서 낮게 솟아 가운데에서 다리 판 가까이 */
    for (let k = 0; k < 34; k++) { const u0 = L * k / 34, u1 = L * (k + 1) / 34, um = (u0 + u1) / 2; if (ragged(um, 0) || broke(um) && r() < .7) continue;
      const y0 = archY(um), p = at2(um, 0, y0), t = Math.atan2(archY(u1) - archY(u0), u1 - u0), g = block(u1 - u0 - .08, 1.5, w - .4, 2, .12, k * 5.1);   /* 쐐기돌 */
      g.rotateZ(-t); g.rotateY(ry - Math.PI / 2); g.translate(p.x, p.y, p.z); add(g);
      for (let y = y0 + 1, row = 0; y < deckY - 1.15; y += .85, row++) { const q = at2(um + (row % 2) * .4 - .2, 0, y + .4); if (r() < .06) continue; const g2 = block(u1 - u0 + .3, .8, w - .9, 2, .1, k * 3 + row); at(g2, q.x, q.y, q.z, ry - Math.PI / 2); add(g2); } }   /* 쌓은 돌 (엇갈림) */
    /* 하늘에 멈춘 듯 떠 있는 무너진 돌덩이 (사이 하늘) */
    for (let k = 0; k < 9; k++) { const u = (gap[0] + (gap[1] - gap[0]) * (.1 + r() * .8)) * L, p = at2(u, (r() - .5) * w * 1.3, deckY - 2 - r() * 7), s2 = .6 + r() * 1.1, g = block(s2 * 1.4, s2, s2 * 1.6, 2, .25, k * 9);
      at(g, p.x, p.y, p.z, r() * 6, (r() - .5) * 1.2, (r() - .5) * 1.2); add(weather(g, .06, 1.4, k)); }
    /* 난간: 기둥(받침 · 몸 · 머리) 사이 동자 기둥 줄 · 위에 난간대 — 무너진 곳 근처는 끊기고 기울어짐 */
    for (const sd of [-1, 1]) { const posts = []; for (let u = 1.2; u < L - .6; u += 4.2) if (!ragged(u, sd * w / 2) && !broke(u)) posts.push(u);
      for (const u of posts) { const p = at2(u, sd * (w / 2 - .3), deckY + .5); add(at(block(.95, .3, .95, 2, .06, u), p.x, p.y + .15, p.z, ry), at(block(.7, 1.6, .7, 2, .06, u + 1), p.x, p.y + 1.1, p.z, ry), at(block(.95, .28, .95, 2, .06, u + 2), p.x, p.y + 2.04, p.z, ry)); }
      for (let i = 0; i + 1 < posts.length; i++) { const u0 = posts[i], u1 = posts[i + 1]; if (u1 - u0 > 5) continue; const tilt = (broke(u1 + 2) || broke(u0 - 2)) ? (r() - .5) * .15 : 0;
        for (let u = u0 + .7; u < u1 - .5; u += .62) { const p = at2(u, sd * (w / 2 - .3), deckY + .5), lp = [[.13, 0], [.2, .1], [.12, .3], [.18, .55], [.1, .85], [.14, 1.05], [.16, 1.12]].map(([a2, y]) => new THREE.Vector2(a2, y));   /* 동자 기둥 (깎아 돌린 모양) */
          const g = new THREE.LatheGeometry(lp, 8); g.deleteAttribute('uv'); at(g, p.x, p.y + .3, p.z, 0, 0, tilt); add(g); }
        const m = at2((u0 + u1) / 2, sd * (w / 2 - .3), deckY + 1.95), g = block(u1 - u0 - .5, .26, .42, 3, .05, u0 * 2); at(g, m.x, m.y, m.z, ry + Math.PI / 2, 0, tilt); add(g); }
      /* 다리 양 끝 큰 기둥: 층층이 좁아지는 탑 모양 머리 + 연꽃 봉오리 (한쪽은 머리가 깨져 떨어짐) */
      for (const [u, br] of [[posts[0], sd > 0], [posts[posts.length - 1], false]]) { if (u === undefined) continue; const p = at2(u, sd * (w / 2 - .3), deckY + .5); let y = p.y;
        for (const [ww, hh] of [[1.5, .45], [1.2, 2.6], [1.55, .4], [1.3, .35], [1.05, .35], [.8, .3]]) { add(at(carved(ww, hh, ww, hh > 1 ? 'runes' : 'band', .06, u + y, hh > 1 && !br ? 1 : 0), p.x, y + hh / 2, p.z, ry + (u < L / 2 ? Math.PI : 0))); y += hh; if (br && hh < .4 && y > p.y + 3.6) break; }
        if (!br) { const g = new THREE.LatheGeometry([[0, 0], [.42, .05], [.5, .3], [.38, .62], [.16, .9], [0, 1.05]].map(([a2, b2]) => new THREE.Vector2(a2, b2)), 12); g.deleteAttribute('uv'); add(at(weather(g, .03, 3, u), p.x, y, p.z)); y += 1; }
        else { const g = carved(.8, .3, .8, 'band', .05, u); at(g, p.x + sd * .9, deckY + .4, p.z + .6, ry + .7, .4, .3); add(g); }   /* 떨어진 머리 조각 */
        obstacles.push([p.x, p.y + 1.6, p.z, 1], [p.x, y - .6, p.z, .9]); } }
    /* 끊긴 끝에서 늘어진 덩굴 */
    for (const g0 of gap) for (let k = 0; k < 16; k++) { const u = g0 * L + (g0 === gap[0] ? -.6 : .6) + (r() - .5) * 1.2, s = (r() - .5) * w, P0 = at2(u, s, deckY - .2), Lh = 1.5 + r() * r() * 7, pts = [];
      for (let e = 0; e <= 8; e++) { const f = e / 8; pts.push(V(P0.x + Math.sin(f * 3 + k) * .25, P0.y - f * Lh, P0.z + Math.cos(f * 2.2 + k) * .25)); } strands.push({ pts, r: .09 + r() * .06, root: false }); } }

  /* ② 유적 입구 (사용자 2026-11-11 참고 그림: 바위 절벽에 반쯤 묻힌 고대 사원 문 · 안은 자연 동굴과 종유석) ─────────
     · 문 양옆 네모 기둥: 세 단 받침 · 돌을 층층이 쌓은 몸(앞면에 마름모 무늬 판) · 띠 장식 · 겹겹이 넓어지는 머리
     · 문 위: 큰 돌 세 줄 상인방(가운데가 내려앉고 금 감) · 층층이 앞으로 내민 처마 돌 · 그 위로 바위 속으로 물러나는 돌 쌓기
     · 양옆 벽: 엇갈려 쌓은 큰 돌 (위쪽은 무너져 들쭉날쭉 · 군데군데 빠짐) · 가운데 막힌 문(벽감): 작은 기둥 · 상인방 · 처마
     · 앞: 돌판 계단 (깨지고 빠짐) · 꽃무늬가 새겨진 떨어진 상인방이 비스듬히 기댐 · 이끼 낀 바위 · 위에서 늘어진 굵은 뿌리와 덩굴
     · 동굴 천장 종유석 */
  if (TUN) { const f0 = TUN.frame(0), fwd = V(-f0.fx, 0, -f0.fz), sdv = V(f0.sx, 0, f0.sz), ry = Math.atan2(fwd.x, fwd.z), fl = LO.gorge.floor, DW = TUN.wi - .3, TOP = TUN.top, G0 = hAt(f0.x + fwd.x * 6, f0.z + fwd.z * 6);
    const P = (s, y, f = 0) => V(f0.x, y, f0.z).addScaledVector(sdv, s).addScaledVector(fwd, f);
    const put = (g, s, y, f, rot = 0, tilt = 0, roll = 0) => { const p = P(s, y, f); g.rotateZ(roll); g.rotateX(tilt); g.rotateY(ry + rot); g.translate(p.x, p.y, p.z); add(g); return g; };
    const base = Math.min(G0, fl + .6);   /* 문 앞 땅 높이 */
    /* 문 양옆 네모 기둥 */
    for (const s of [-1, 1]) { const cs = s * (DW + 2.4), W2 = 4.6, D2 = 3.6; let y = base - .4;
      for (const [w2, h2, d2] of [[W2 + 1.8, .8, D2 + 1.6], [W2 + 1.1, .6, D2 + 1], [W2 + .5, .5, D2 + .5]]) { put(carved(w2, h2, d2, 'band', .05, s * 7 + y), cs, y + h2 / 2, .6); y += h2; }   /* 세 단 받침 */
      for (let k = 0; y < TOP - 1.2; k++) { const h2 = Math.min(1.55 + r() * .4, TOP - 1.2 - y), band = k % 4 === 3;
        if (band) { put(carved(W2 + .5, .42, D2 + .45, 'band', .05, k + s), cs, y + .21, .6); y += .42; continue; }   /* 띠 장식 */
        put(carved(W2, h2, D2, k % 4 === 1 ? 'lozenge' : k % 4 === 2 ? 'runes' : 'panel', .09, k * 3 + s, k % 8 === 2 ? 1 : 0), cs + (r() - .5) * .12, y + h2 / 2, .6 + (r() - .5) * .14, (r() - .5) * .02); y += h2 + .03; }
      for (const [w2, h2, d2, fo] of [[W2 + .5, .5, D2 + .4, .7], [W2 + 1.1, .45, D2 + .9, .9], [W2 + 1.7, .55, D2 + 1.4, 1.1]]) { put(carved(w2, h2, d2, 'band', .05, s * 3 + y), cs, y + h2 / 2, fo); y += h2; }   /* 겹겹이 넓어지는 머리 */
      for (let q = base + 1; q < TOP; q += 1.6) obstacles.push([P(cs, q, .6).x, q, P(cs, q, .6).z, 2.6]); }
    /* 문 위 상인방: 큰 돌 세 줄 · 가운데로 갈수록 내려앉고 틈이 벌어짐 · 한 줄은 꽃무늬 */
    let y = TOP;
    for (let row = 0; row < 3; row++) { const h2 = 1.45 + r() * .3; let s = -(DW + 4.9);
      while (s < DW + 4.9) { const w2 = Math.min(2.8 + r() * 2.2, DW + 4.9 - s); if (w2 < .8) break; const mid = s + w2 / 2, sag = Math.max(0, 1 - Math.abs(mid) / (DW + 1)) * (.55 - row * .12);
        put(carved(w2 - .06, h2, 3.4 + row * .2, row === 1 ? 'runes' : row === 0 ? 'rosette' : 'panel', .1, row * 11 + s, row === 1 ? 1 : 0), mid, y + h2 / 2 - sag, .7 + row * .12 + (r() - .5) * .1, (r() - .5) * .03, 0, (r() - .5) * .06 - Math.sign(mid) * sag * .04); s += w2; }
      y += h2; }
    /* 층층이 앞으로 내민 처마 돌 (네 단 · 위로 갈수록 좁고 덜 내밈) · 가운데가 조금 내려앉음 */
    for (let k = 0; k < 4; k++) { const hw = (DW + 6.2) * (1 - k * .11), h2 = .75 + (k % 2) * .25, fo = 1.6 - k * .35; let s = -hw;
      while (s < hw) { const w2 = Math.min(1.8 + r() * 1.6, hw - s); if (w2 < .6) break; const mid = s + w2 / 2, sag = Math.max(0, 1 - Math.abs(mid) / (DW + 2)) * .45; if (k === 3 && Math.abs(mid) < 3 && r() < .5) { s += w2; continue; }
        put(carved(w2 - .05, h2, 3.2, k % 2 ? 'band' : 'panel', .06, k * 17 + s), mid, y + h2 / 2 - sag, fo + (r() - .5) * .12, (r() - .5) * .04, 0, (r() - .5) * .05); s += w2; }
      y += h2; }
    /* 그 위로 바위 속으로 물러나는 돌 쌓기 (위쪽 가장자리는 무너져 들쭉날쭉) */
    courses(-(DW + 5), DW + 5, y, y + 6, -.6, 2.6, (s2, y2) => y2 > y + 2.2 + 3 * noise2(s2 * .18, 3) + Math.abs(s2) * .12);
    /* 양옆 벽 · 가운데 막힌 문 (벽감) */
    for (const s of [-1, 1]) { const s0 = s * (DW + 4.7), s1 = s * (DW + 20), lo = Math.min(s0, s1), hi = Math.max(s0, s1), nc = s * (DW + 12.2);
      put(carved(hi - lo + 1, .7, 4.4, 'band', .05, s), (lo + hi) / 2, base + .05, .9); put(carved(hi - lo + .4, .55, 3.8, 'band', .05, s + 1), (lo + hi) / 2, base + .65, .7);   /* 두 단 받침 */
      courses(lo, hi, base + .9, TOP + 5, 0, 3, (s2, y2) => (Math.abs(s2 - nc) < 2.6 && y2 < base + 11.5) || y2 > TOP + 1 + 3.5 * noise2(s2 * .15, s * 5) - Math.abs(s2 - s0) * .2);   /* 위쪽은 바깥으로 갈수록 무너짐 */
      put(carved(5.2, 11, .8, 'panel', .1, s * 9), nc, base + 6.4, -1.3);   /* 벽감 안쪽 판 (깊이 들어감 · 어두움) */
      put(carved(1.5, 9.4, .5, 'runes', .09, s * 13 + 5, 1), nc, base + 6.4, -.75);   /* 벽감 가운데 룬 세로 띠 (빛이 흐름) */
      for (const q of [-1, 1]) { let yy = base + .9; for (let k = 0; k < 6; k++) { const h2 = k === 5 ? .5 : 1.75; put(carved(1.05, h2, 1.2, k === 5 ? 'band' : 'lozenge', .06, k + q + s), nc + q * 3.1, yy + h2 / 2, .55); yy += h2; } }   /* 벽감 작은 기둥 */
      { let yy = base + 11.4; for (const [w2, h2, fo] of [[7.6, .95, .6], [8.4, .55, .85], [7, .5, .55], [5.4, .5, .35]]) { put(carved(w2, h2, 1.8, h2 > .8 ? 'rosette' : 'band', .07, w2 * s + yy), nc, yy + h2 / 2, fo); yy += h2; } } }   /* 벽감 상인방 · 처마 (위로 겹겹이) */
    /* 앞 계단: 넓은 돌판 계단 (네 단 · 높이 합이 1층에 닿지 않게) · 깨지고 빠지고 사이에 틈 */
    for (let k = 0; k < 4; k++) { const f2 = 2.2 + (3 - k) * 1.7, yy = base + .18 + k * .28; let s = -(DW + 1.5);
      while (s < DW + 1.5) { const w2 = Math.min(1.6 + r() * 1.6, DW + 1.5 - s); if (w2 < .5) break; if (r() > .1) put(carved(w2 - .1, .36, 1.75, 'none', 0, k * 13 + s), s + w2 / 2, yy, f2 + (r() - .5) * .15, (r() - .5) * .05, (r() - .5) * .04, (r() - .5) * .04); s += w2; } }
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) put(carved(1.4, 1 + k * .28, 1.7, k % 2 ? 'runes' : 'panel', .06, k * s + 3), s * (DW + 2.3), base + (1 + k * .28) / 2, 2.2 + (3 - k) * 1.7);   /* 계단 옆 낮은 벽 */
    /* 떨어진 상인방 (꽃무늬가 새겨진 긴 돌 · 바위에 비스듬히 기댐 · 끝은 부러짐) */
    { const g = carved(12, 1.7, 2.3, 'runes', .1, 77); const p = P(DW + 7.5, base + 2.4, 5.5); g.rotateZ(.32); g.rotateY(ry + .55); g.translate(p.x, p.y, p.z); add(g);
      for (let q = -5; q <= 5; q += 2) { const d = V(Math.cos(.32), Math.sin(.32), 0).applyAxisAngle(V(0, 1, 0), ry + .55); obstacles.push([p.x + d.x * q, p.y + d.y * q, p.z + d.z * q, 1.4]); } }
    /* 이끼 낀 바위 · 무너진 돌덩이 (문 앞 양옆) */
    for (let k = 0; k < 14; k++) { const s = (k % 2 ? 1 : -1) * (DW + 3 + r() * 14), f2 = 2 + r() * 9, sz = 1 + r() * 2.2, g = weather(block(sz * 1.3, sz, sz * 1.1, 3, .35, k * 31), .18, .7, k);
      const p = P(s, 0, f2); if (Math.abs(s) < DW + 2 && f2 < 9) continue; put(g, s, hAt(p.x, p.z) + sz * .35, f2, r() * 6, (r() - .5) * .3, (r() - .5) * .3); if (sz > 1.6) obstacles.push([p.x, hAt(p.x, p.z) + sz * .4, p.z, sz * .7]); }
    /* 위에서 늘어진 굵은 뿌리 · 덩굴 (문틀 · 벽을 타고 내려옴) */
    for (let k = 0; k < 26; k++) { const s = (r() - .5) * 2 * (DW + 16), y0 = TOP + 9 + r() * 6, root = r() < .45, Lh = (root ? 8 : 4) + r() * (y0 - base - 4), pts = [];
      for (let e = 0; e <= 12; e++) { const t = e / 12, wob = Math.sin(t * 5 + k) * (root ? .35 : .2); pts.push(P(s + wob + t * (r() - .5) * .3, y0 - t * Lh, 1.9 + (root ? .3 : .6) + Math.sin(t * 3 + k * 2) * .25)); }
      strands.push({ pts, r: root ? .22 + r() * .18 : .08 + r() * .06, root }); }
    /* 산과 한 몸 (사용자 2026-11-11: 산맥과 입구가 따로 놀아 보임): 처마 위로 자연 바위가 불룩하게 내려앉고 · 양옆 벽 끝은 바위 덩이가 삼킴 — 산을 깎아 만든 사원처럼 */
    const boulder = (c, sx, sy, sz, sd2, keelDown = .6) => { const g = new THREE.IcosahedronGeometry(1, 4); g.deleteAttribute('uv'); const pp = g.attributes.position;
      for (let v = 0; v < pp.count; v++) { const x = pp.getX(v), y2 = pp.getY(v), z = pp.getZ(v), n = 1 + .22 * noise2(x * 1.7 + sd2, z * 1.7 + y2 * 1.3) + .1 * noise2(x * 4.1 - sd2, y2 * 4.3 + z) + .04 * noise2(y2 * 9, x * 9 + sd2);
        pp.setXYZ(v, x * n * sx, (y2 < 0 ? y2 * keelDown : y2) * n * sy, z * n * sz); } g.rotateY(ry + (r() - .5) * .3); g.translate(c.x, c.y, c.z); g.computeVertexNormals(); rock.push(g); };
    boulder(P(0, y + 4.5, -4.5), DW + 9, 7.5, 9, 3, .45);   /* 처마 위를 덮은 바위 (아래는 처마에 걸침) */
    for (const s of [-1, 1]) { boulder(P(s * (DW + 23), base + 9, -2.5), 7.5, 13, 8, s * 5 + 9, .9); boulder(P(s * (DW + 14), TOP + 7, -4), 9, 6, 7, s * 7 + 2, .5);   /* 벽 끝을 삼킨 바위 · 벽 위에 얹힌 바위 */
      boulder(P(s * (DW + 26), base + 3, 3), 4, 4, 4.5, s * 11, .8); }
    /* 종유석: 동굴 천장 들머리에서 늘어짐 (3층 높이엔 안 닿게) */
    for (let k = 0; k < 46; k++) { const t = r() * TUN.to * .7, th = (.28 + r() * .44) * Math.PI, q = TUN.inner(t, th), lim = q.y - (LAYERS[2] + 1.6); if (lim < .6) continue;
      const L2 = Math.min(lim, .8 + r() * r() * 3.5), g = new THREE.ConeGeometry(.22 + r() * .35, L2, 7, 4); g.deleteAttribute('uv'); weather(g, .05, 4, k); g.rotateX(Math.PI); g.translate(q.x, q.y - L2 / 2 + .25, q.z); rock.push(g); }
    /* ③ 기둥 복도: 양쪽에 네모 띠 기둥 (돌을 층층이 · 띠 장식 · 겹겹 머리) · 위를 잇는 들보 (밑면은 3층보다 높게) · 하나는 쓰러지고 하나는 부러짐 · 기둥 문양이 희미하게 빛남 */
    { const n = 4; for (let k = 0; k < n; k++) { const t = TUN.to * (.2 + k / n * .76), f = TUN.frame(t), bry = Math.atan2(f.fx, f.fz), hh = TOP - .3 - fl, fallen = k === 2;
      for (const s of [-1, 1]) { const c = V(f.x + f.sx * s * (LO.gorge.w - .9), 0, f.z + f.sz * s * (LO.gorge.w - .9)), pl = (g, yy, rot = 0) => { g.rotateY(bry + rot); g.translate(c.x, yy, c.z); add(g); };
        pl(carved(2.9, .7, 2.9, 'band', .05, k * 7 + s), fl + .35); pl(carved(2.4, .5, 2.4, 'band', .05, k * 7 + s + 1), fl + .95);
        if (fallen && s > 0) { const g = carved(2, hh * .6, 2, 'lozenge', .07, k); g.rotateZ(Math.PI / 2 - .1); g.rotateY(bry + .5); g.translate(c.x - f.sx * 3.4, fl + 1.2, c.z - f.sz * 3.4 + 2); add(g); continue; }   /* 쓰러진 기둥 */
        const broken = k === 1 && s < 0, top2 = broken ? fl + hh * .5 : TOP - 1.4; let yy = fl + 1.2;
        for (let q = 0; yy < top2; q++) { const h2 = Math.min(1.7, top2 - yy); if (h2 < .3) break; pl(carved(q % 4 === 3 ? 2.3 : 2, q % 4 === 3 ? .4 : h2, q % 4 === 3 ? 2.3 : 2, q % 4 === 3 ? 'band' : q % 2 ? 'runes' : 'lozenge', .07, k * 5 + q + s, q === 1 ? 1 : 0), yy + (q % 4 === 3 ? .2 : h2 / 2), (r() - .5) * .04); yy += q % 4 === 3 ? .4 : h2; }
        if (!broken) for (const [w2, h2] of [[2.4, .45], [2.9, .45], [3.3, .5]]) { pl(carved(w2, h2, w2, 'band', .05, w2 + k), yy + h2 / 2); yy += h2; }
        else { const g = carved(1.6, .9, 1.6, 'none', 0, k); g.rotateZ(.4); pl(g, yy + .4, .5); }
        for (let q = fl + 1.5; q < yy; q += 1.4) obstacles.push([c.x, q, c.z, 1.35]);
      }
      if (k !== 2) { let s = -(LO.gorge.w + 1.4); while (s < LO.gorge.w + 1.4) { const w2 = Math.min(2.6 + r() * 1.6, LO.gorge.w + 1.4 - s); if (w2 < .7) break; const a2 = V(f.x + f.sx * (s + w2 / 2), TOP + .55, f.z + f.sz * (s + w2 / 2)), g = carved(w2 - .05, 1.3, 2.2, 'band', .05, k * 13 + s); g.rotateY(bry + Math.PI / 2); g.translate(a2.x, a2.y, a2.z); add(g); s += w2; } } } }   /* 들보 (돌 여럿) */
    /* 돌 쌓기 (s0~s1 · y0~y1 · 앞뒤 f · 두께 d · skip(s, y): 비울 곳) — 줄마다 높이 · 돌마다 너비가 다르고 엇갈림 · 조금씩 어긋나고 가끔 빠짐 */
    function courses(s0, s1, y0, y1, f, d, skip) { let y2 = y0; for (let row = 0; y2 < y1; row++) { const h2 = 1.2 + r() * .7; let s = s0 + (row % 2) * .9 * r();
      while (s < s1) { const w2 = Math.min(1.8 + r() * 2.4, s1 - s); if (w2 < .5) break; const mid = s + w2 / 2; if (!skip(mid, y2 + h2 / 2) && r() > .05) put(carved(w2 - .07, h2 - .06, d, r() < .15 ? 'panel' : 'none', .06, row * 37 + s), mid, y2 + h2 / 2, f + (r() - .5) * .22, (r() - .5) * .03, 0, (r() - .5) * .03); s += w2; }
      y2 += h2; } }
  }
  /* ④ 신전 앞마당의 무너진 기둥 무더기 (사용자 2026-11-11: 입구 앞에 무너진 기둥들로 1층을 막음 · 뒤에 가리는 산이 없는 탁 트인 곳)
     거대한 홈 파인 기둥들이 여러 각도로 무너짐 — 비스듬히 누운 것 · 다른 기둥에 기댄 것 · 둘이 서로 기대 ㅅ자를 이룬 것 · 기둥 북(토막) 위에 얹힌 것 · 부러진 밑동
     머리 장식이 떨어져 뒹굴고 토막들이 흩어짐 · 맨 위는 2층 아래 → 1층은 막히고 2 · 3층으로 넘음 */
  if (R.pile) { const [cx, cz] = R.pile.c, hw = R.pile.w / 2, gnd = (x, z) => hAt(cx + x, cz + z), L1 = LAYERS[0], CAPY = LAYERS[1] - 2.2;
    const axis = (yaw, pitch) => V(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw));
    /* 기둥 하나: 홈 파인 몸통 (끝은 부러져 들쭉날쭉) + 한쪽 끝 머리 장식 · (base: 밑동 끝 자리 · 몸통이 axis 쪽으로 뻗음) */
    const column = (bx, bz, by, L, rad, yaw, pitch, seed, cap = true, broken = true) => { const ax = axis(yaw, pitch), parts = [], body = fluted(rad, L, 16, Math.max(4, Math.round(L / 1.4)));
      const bp = body.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); if (broken && y > L / 2 - .8) { const x = bp.getX(i), z = bp.getZ(i); bp.setY(i, y - (.2 + .9 * Math.max(0, noise2(x * 1.3 + seed, z * 1.3))) * (y - (L / 2 - .8)) / .8); } }
      weather(body, .06, 1.2, seed); body.computeVertexNormals(); parts.push(body);
      if (cap) { const c1 = carved(rad * 2.5, .75, rad * 2.5, 'band', .05, seed); c1.translate(0, -L / 2 - .37, 0); const c2 = carved(rad * 2.9, .5, rad * 2.9, 'lozenge', .05, seed + 1); c2.translate(0, -L / 2 - 1, 0); parts.push(c1, c2); }   /* 밑동 쪽 받침 */
      const C0 = V(bx, by, bz).add(ax.clone().multiplyScalar(L / 2)), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), ax), spin = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), seed);
      for (const g of parts) { g.applyQuaternion(spin); g.applyQuaternion(q); g.translate(cx + C0.x, C0.y, cz + C0.z); add(g); }
      for (let t = 0; t <= L; t += 1.5) { const p = V(bx, by, bz).add(ax.clone().multiplyScalar(t)); obstacles.push([cx + p.x, p.y, cz + p.z, rad * .95]); }
      return V(bx, by, bz).add(ax.clone().multiplyScalar(L)); };
    const lie = (x, z, L, rad, yaw, seed, lift = 0) => { const ax = axis(yaw, 0), bx = x - ax.x * L / 2, bz = z - ax.z * L / 2; return column(bx, bz, Math.max(gnd(bx, bz), gnd(x, z)) + rad * .85 + lift, L, rad, yaw, 0, seed); };
    const lean = (bx, bz, tx, tz, ty, rad, seed) => { const by = gnd(bx, bz) + .3, dx = tx - bx, dz = tz - bz, hd = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx), pitch = Math.atan2(ty - by, hd), L = Math.hypot(hd, ty - by); return column(bx, bz, by, L, rad, yaw, pitch, seed, true, true); };
    const drum = (x, z, rad, h, rx, seed) => { const g = fluted(rad, h, 16, 2); weather(g, .05, 1.4, seed); g.computeVertexNormals(); g.rotateX(rx); g.rotateY(seed); const y = gnd(x, z) + (rx ? rad * .8 : h / 2 - .1); g.translate(cx + x, y, cz + z); add(g); obstacles.push([cx + x, y, cz + z, Math.max(rad, h / 2) * .9]); return y + (rx ? rad : h / 2); };
    const top = () => Math.min(CAPY, gnd(0, 0) + 8.4);   /* 기둥 끝 높이 한계 (2층은 지나감) */
    /* 왼쪽: 길게 누운 기둥 · 거기에 기댄 기둥 · 부러진 밑동 */
    lie(-12, 2, 17, 1.55, .22, 3.1);
    lean(-3, -5, -15, 4, top() - 1.2, 1.45, 4.7);
    column(-20, -3, gnd(-20, -3) - .2, 5.4, 1.7, 0, Math.PI / 2, 9.3, true, true);   /* 부러진 밑동 (서 있음) */
    drum(-20.6, 1.6, 1.7, 1.7, 1.45, 2.2);
    /* 가운데: 토막 둘 위에 얹힌 긴 기둥 (밑은 낮게 막힘) */
    const d1 = drum(-1, -1.5, 1.5, 1.6, 0, 5.5), d2 = drum(7, 1.8, 1.5, 1.4, 0, 6.6);
    column(-6, -3.4, Math.max(d1, d2) + 1.3, 19, 1.6, -.28, .02, 7.7, true, true);
    /* 오른쪽: 둘이 서로 기대 ㅅ자 · 떨어진 머리 장식 */
    lean(9, -6, 14.2, -.6, top(), 1.4, 11.1); lean(20, 4, 14.8, -.3, top() - .3, 1.4, 12.4);
    { const g = carved(4.2, 1.1, 4.2, 'lozenge', .06, 15); g.rotateZ(.5); g.rotateY(.8); const y = gnd(4, 6) + 1.4; g.translate(cx + 4, y, cz + 6); add(g); obstacles.push([cx + 4, y, cz + 6, 2.2]); }
    drum(13, 6.5, 1.4, 1.5, Math.PI / 2, 13.3); drum(-8, 6.2, 1.5, 1.3, Math.PI / 2 - .3, 14.4); drum(16, -7.5, 1.3, 1.2, 0, 16.6);
    for (let i = 0; i < 26; i++) { const x = (r() - .5) * 2 * hw, z = (r() - .5) * 16, g = block(.5 + r() * 1.2, .4 + r() * .8, .5 + r(), 1, .2, i); g.rotateY(r() * 6); g.rotateZ((r() - .5) * .6); g.translate(cx + x, gnd(x, z) + .3, cz + z); add(g); }   /* 흩어진 돌 부스러기 */
    for (let x = -hw; x <= hw; x += 2.4) obstacles.push([cx + x, L1, cz + (x < -4 ? 1 : x < 8 ? -1.5 : -1), 2.4]);   /* 1층은 무더기 전체 폭으로 막힘 (보이는 무더기 그대로 · 틈새로 빠지지 않게) */
  }
  return { geos, rock, glow, obstacles, strands };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export { carved as carvedBlock, runeD };   /* 보물 장소에서도 같은 새긴 돌 · 룬 */
