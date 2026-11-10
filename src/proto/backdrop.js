/* 바탕 그림 (2.5D · 사용자 2026-11-10: 롤처럼 맵은 2D 그림 · 기체 · 섬 · 장애물은 3D 모델 · 한 공간에)
   · 섬 아래 저 멀리 구름 바다를 그림 한 장(이어 붙여도 이음새 없는 그림)으로 그려 땅 대신 깔아 둠 — 섬 · 기체와 같은 세상 좌표의 평평한 판 위
   · 그 사이 높이에 투명한 구름 그림 조각(늘 카메라를 보는 판)을 띄워 깊이를 줌
   · 그림은 불러올 때 한 번 그림 (그림 파일을 받지 않음) · 화면에서는 판 한 장 + 구름 조각 한 무리만 그림 → 가벼움
   쓰는 법: const bd = makeBackdrop({ y, size }) · scene.add(bd.group) · 매 장면 bd.update(t) */
import * as THREE from 'three';

const rngOf = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* 구름 바다 그림: 깊은 하늘빛 바탕 위에 구름 덩이 (아래쪽은 푸른 그늘 · 위쪽은 햇빛) · 사이사이 아주 먼 작은 섬 · 가장자리를 넘는 것은 맞은편에도 그려 이음새 없음 */
function paintSea(N = 2048, seed = 7) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), r = rngOf(seed);
  const wrap = (x, y, R, draw) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) if (x + ox > -R && x + ox < N + R && y + oy > -R && y + oy < N + R) draw(x + ox, y + oy); };
  g.fillStyle = '#4a78b8'; g.fillRect(0, 0, N, N);
  for (let k = 0; k < 60; k++) { const x = r() * N, y = r() * N, R = 200 + r() * 420, c = r() < .5 ? '82,118,170' : '120,156,205';   /* 바탕 하늘빛 얼룩 (깊고 옅은 곳) */
    wrap(x, y, R, (X, Y) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(X - R, Y - R, 2 * R, 2 * R); }); }
  const puff = (X, Y, R, a, col) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.55, `rgba(${col},${a * .7})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(X - R, Y - R, 2 * R, 2 * R); };
  /* 아주 먼 작은 섬: 풀 덮인 윗면 + 아래로 뾰족한 바위 · 안개에 흐릿 */
  for (let k = 0; k < 9; k++) { const x = r() * N, y = r() * N, s = 18 + r() * 30;
    wrap(x, y, s * 3, (X, Y) => { g.globalAlpha = .55; g.fillStyle = '#4c5f78'; g.beginPath(); g.moveTo(X - s, Y); g.quadraticCurveTo(X - s * .3, Y + s * 1.6, X + s * .1, Y + s * 2.4); g.quadraticCurveTo(X + s * .4, Y + s * 1.2, X + s, Y); g.fill();
      g.fillStyle = '#6f9a5c'; g.beginPath(); g.ellipse(X, Y, s, s * .42, 0, 0, 6.283); g.fill(); g.fillStyle = '#8fb873'; g.beginPath(); g.ellipse(X - s * .2, Y - s * .1, s * .6, s * .22, 0, 0, 6.283); g.fill(); g.globalAlpha = 1; }); }
  /* 구름 덩이: 그늘 먼저(오른쪽 아래로 비켜 푸른 회색) → 몸통 → 햇빛 받은 윗머리 */
  for (let k = 0; k < 70; k++) { const cx = r() * N, cy = r() * N, W = 120 + r() * 340, n = 10 + (r() * 14 | 0), P = [];
    for (let q = 0; q < n; q++) { const a = r() * 6.283, d = Math.sqrt(r()) * W * .5; P.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * .55, 30 + r() * W * .32]); }
    wrap(cx, cy, W, (X, Y) => { const dx = X - cx, dy = Y - cy;
      for (const [px, py, R] of P) puff(px + dx + R * .18, py + dy + R * .22, R * 1.05, .3, '112,138,182');
      for (const [px, py, R] of P) puff(px + dx, py + dy, R, .38, '220,230,244');
      for (const [px, py, R] of P) puff(px + dx - R * .2, py + dy - R * .25, R * .6, .35, '255,255,255'); }); }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex; }

/* 구름 조각 하나 (투명 바탕): 덩이 여럿을 겹쳐 그늘 · 몸통 · 햇빛 */
function paintCloud(seed, N = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), r = rngOf(seed);
  const puff = (X, Y, R, a, col) => { const gr = g.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.6, `rgba(${col},${a * .6})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(X - R, Y - R, 2 * R, 2 * R); };
  const P = []; for (let q = 0; q < 14; q++) { const a = r() * 6.283, d = Math.sqrt(r()) * N * .28; P.push([N / 2 + Math.cos(a) * d, N / 2 + Math.sin(a) * d * .5, N * (.1 + r() * .12)]); }
  for (const [x, y, R] of P) puff(x + R * .2, y + R * .25, R, .35, '160,176,204');
  for (const [x, y, R] of P) puff(x, y, R, .55, '232,238,247');
  for (const [x, y, R] of P) puff(x - R * .2, y - R * .3, R * .6, .45, '255,255,255');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex; }

export function makeBackdrop({ y = -60, size = 900, tile = 450, clouds = 26, seed = 7 } = {}) {
  const group = new THREE.Group(), sea = paintSea(2048, seed); sea.repeat.set(size / tile, size / tile);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: sea, depthWrite: false, toneMapped: false }));
  plane.position.y = y; plane.renderOrder = -10; plane.frustumCulled = false; group.add(plane);
  /* 섬과 바다 사이에 떠 있는 구름 조각 (섬 둘레 · 여러 높이) */
  const r = rngOf(seed * 3 + 1), tex = [0, 1, 2, 3].map(k => paintCloud(seed * 11 + k)), list = [];
  for (let k = 0; k < clouds; k++) { const a = r() * 6.283, d = 26 + r() * 70, s = 10 + r() * 22, m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[k % 4], transparent: true, depthWrite: false, opacity: .55 + r() * .4, toneMapped: false }));
    m.scale.set(s, s * .55, 1); m.position.set(Math.cos(a) * d, y * (.25 + r() * .6), Math.sin(a) * d); m.renderOrder = -5; group.add(m); list.push({ m, a, d, w: (.002 + r() * .004) * (r() < .5 ? 1 : -1) }); }
  return { group, update(t) { sea.offset.set(t * .0016, t * .0009); for (const c of list) { const a = c.a + t * c.w; c.m.position.x = Math.cos(a) * c.d; c.m.position.z = Math.sin(a) * c.d; } } };   /* 구름 바다는 천천히 흐르고 구름 조각은 섬 둘레를 느리게 돎 */
}
