/* 화면 위 진짜 3D 기체 — 2D 화면 좌표(픽셀)로 위치·크기·기울기를 받아 그린다 (메인 화면·전환 연출 공용)
   어떤 기체·스타일·도색이든 build.js 로 조립해서 띄운다. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildShip, UT, engineSpots as engines } from './build.js';
import { makeDiamondEnv, backMat, SHIP } from './diamond.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .22; pm.dispose(); }
  /* 빛: 일몰(화면 가운데 뒤쪽)에서 오는 따뜻한 테두리 빛 + 위에서 약한 빛 + 아주 약한 차가운 채움빛 */
  const rim = new THREE.DirectionalLight(0xffb27a, 4.2); rim.position.set(.9, .8, -1.1); scene.add(rim);
  const top = new THREE.DirectionalLight(0xffe2c8, 1.1); top.position.set(.2, 1, .4); scene.add(top);
  scene.add(new THREE.HemisphereLight(0x5f78a8, 0x120c0a, .55));
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000); camera.position.set(0, 0, 1000);
  const holder = new THREE.Group(); scene.add(holder);
  let diaEnv = null; const back = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  let cur = null, span = 1, rear = [], nose = new THREE.Vector3(), visible = false, want = '';
  const api = { ready: false };

  api.show = async (shipId, styleId, paintId) => {
    const key = shipId + '/' + styleId + '/' + paintId; want = key;
    if (paintId === 'dia' && !diaEnv) diaEnv = makeDiamondEnv(renderer);
    const b = await buildShip(shipId, styleId, paintId, { env: diaEnv, back: back.texture, renderer, size: 2.6 });   /* 2.6 = 다이아 깎은 면 크기 기준 */
    if (want !== key) return;
    holder.clear(); cur = b;
    const m = b.root.children[0];                      /* build 가 이미 가운데 맞춤 */
    const mSize = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
    span = mSize.x * b.root.scale.x;                   /* 화면 크기는 날개 폭 기준 */
    rear = engines(b.ship, m, mSize); nose.set(0, 0, -mSize.z * .5);
    holder.add(b.root); api.ready = true;
  };

  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), qd = new THREE.Quaternion(), qe = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  api.begin = () => { visible = false; };
  /* 메인 자세: 뒤에서 내려다본 모습(행성 쪽으로 머리). turn: 왼쪽으로 몸을 틂, barrel: 앞뒤 축 회전, loop: 머리를 듦, face: 머리를 화면 쪽으로 */
  /* mode 'far': 멀리서 작게 — 가는 방향(화면 각도 ang)으로 머리, 살짝 위에서 본 모습 */
  api.set = ({ x, y, w, roll = 0, barrel = 0, turn = 0, face = 0, tilt = 0, loop = 0, base = .2, mode = 'main', ang = 0 }) => {
    if (!api.ready) return; visible = true;
    holder.position.set(x, -y, 0); holder.scale.setScalar(w / span);
    if (mode === 'far') { const phi = Math.atan2(-Math.sin(ang), Math.cos(ang)) - Math.PI / 2;
      qa.setFromAxisAngle(Z, phi); qc.setFromAxisAngle(X, 1.15); qd.setFromAxisAngle(Z, barrel); holder.quaternion.copy(qa).multiply(qc).multiply(qd); return; }
    qa.setFromAxisAngle(Z, -roll - turn * .35); qb.setFromAxisAngle(Y, -.55 + turn * 1.75); qc.setFromAxisAngle(X, base - turn * .25 + tilt); qd.setFromAxisAngle(Z, barrel);
    qe.setFromAxisAngle(X, loop);
    holder.quaternion.copy(qa).multiply(qb).multiply(qc).multiply(qe).multiply(qd);
    if (face > 0) { qa.setFromAxisAngle(Z, -roll); qb.setFromAxisAngle(Y, Math.PI); qc.setFromAxisAngle(X, -.32); qd.setFromAxisAngle(Z, barrel);
      qe.copy(qa).multiply(qb).multiply(qc).multiply(qd); holder.quaternion.slerp(qe, Math.min(1, face)); }
  };
  /* 엔진 자리와 꼬리 방향(화면 좌표) */
  api.engines = () => {
    holder.updateMatrixWorld(true); const m = cur.root.children[0];
    const pts = rear.map(p => { const v = p.clone().applyMatrix4(m.matrixWorld); return [v.x, -v.y]; });
    const n = nose.clone().applyMatrix4(m.matrixWorld), b = pts[0];
    const dx = b[0] - n.x, dy = b[1] + n.y, l = Math.hypot(dx, dy) || 1;
    return { pts, back: [dx / l, dy / l] };
  };
  api.end = (W, H, t) => {
    if (canvas.width !== W || canvas.height !== H) { renderer.setSize(W, H, false); back.setSize(W, H); if (cur) for (const m of cur.materials) m.uniforms.uRes.value.set(W, H); }
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
    holder.visible = visible; UT.value = t;
    holder.updateMatrixWorld(true); SHIP.value.copy(holder.matrixWorld).invert();
    if (cur && cur.isDiamond && visible) { for (const m of cur.materials) { m.uniforms.uT.value = t; m.uniforms.uHi.value = 1; m.uniforms.uMode.value = 1; }
      scene.overrideMaterial = backMat; renderer.setRenderTarget(back); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera); scene.overrideMaterial = null; renderer.setRenderTarget(null); renderer.setClearColor(0, 0); }
    renderer.clear(); renderer.render(scene, camera);
  };
  api.dispose = () => { renderer.dispose(); back.dispose(); renderer.forceContextLoss?.(); };
  return api;
}
