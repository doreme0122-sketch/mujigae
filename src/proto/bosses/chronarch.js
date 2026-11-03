/* 크로나크 — 2스테이지 보스 (사용자 모델 + 사용자 효과 코드)
   · 모양·효과는 받은 그대로. 바꾼 건 '그리는 횟수'뿐 (사용자 2026-11-03: 단순화해서 최소한으로)
   · 왜 줄이나: 효과 코드가 장갑 조각마다 재질을 따로 만들어, 보스 하나에 한 장면 약 500번 그림 → 휴대폰에서 프레임이 무너짐
   · 어떻게: ① 움직이는 조각(터빈·불꽃·충격파 등)은 그대로 둠 — 매 장면 따로 움직여야 하니까
             ② 가만히 있는 조각은 같은 재질끼리 한 덩어리로 합침 (보스 몸에 붙은 채 같이 움직이므로 겉모습 같음)
             ③ 무늬 크기가 조각마다 따로 맞춰져 있던 재질(장갑 타일)은 조각 크기만큼 나눠 같은 무늬 크기로 모아 합침
             ④ 숨겨 둔 조각(원본에서 효과로 대신한 부분)은 아예 뺌
             ⑤ 장갑 무늬 크기·흐르는 빛의 색·빠르기처럼 조각마다 다른 값은 점마다 새겨 넣어 한 재질로
             ⑥ 빛 알갱이는 전부 한 묶음: 원래 알갱이는 안 보이게 남겨 효과 코드가 계속 움직이게 하고, 매 장면 자리·색·밝기만 옮겨 그림
   · 결과: 한 장면에 그리는 횟수 약 495번 → 약 75번, 삼각형 수·겉모습은 그대로
   · 재질 효과(무늬·빛 새어 나옴·흐르는 에너지)는 모두 재질 쪽 계산이라 합쳐도 그대로 돎 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { enhanceChron } from './chronfx.js?v=11031250';

export async function makeChronarch(url = './assets/bosses/chronarch.glb', opt = {}) {
  const g = await new GLTFLoader().loadAsync(url), root = g.scene;
  const fx = enhanceChron(THREE, root, opt);
  const before = countDraws(root);
  slim(root, fx);
  const after = countDraws(root);
  return { root, fx, update: t => fx.update(t), setAlly: a => fx.setAlly(a), stats: { before, after } };
}

function countDraws(root) { let n = 0; root.traverse(o => { if (!o.visible) return; if (o.isMesh || o.isPoints || o.isSprite || o.isLine) n += Array.isArray(o.material) ? o.material.length : 1; }); return n; }
const visibleAll = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

function slim(root, fx) {
  root.updateMatrixWorld(true);
  /* 숨긴 조각 빼기 */
  const hidden = []; root.traverse(o => { if (o !== root && !o.visible) hidden.push(o); }); hidden.forEach(o => o.parent && o.parent.remove(o));
  /* 스스로 움직이는 것(자기 자리·돌기·크기가 바뀌는 것) 찾기: 서로 다른 두 때를 비교 */
  fx.update(.37); root.updateMatrixWorld(true); const A = new Map(); root.traverse(o => A.set(o, o.matrix.clone()));
  fx.update(1.91); root.updateMatrixWorld(true);
  const anim = new Set(); root.traverse(o => { const m = A.get(o); if (m && !m.equals(o.matrix)) anim.add(o); });
  /* 조각마다 '같이 움직이는 기준'(가장 가까운 스스로 움직이는 윗단, 없으면 보스 몸) — 기준이 같고 재질이 같으면 한 덩어리 */
  const anchorOf = o => { for (let p = o.parent; p && p !== root; p = p.parent) if (anim.has(p)) return p; return root; };
  const m4 = new THREE.Matrix4(), s = new THREE.Vector3(), groups = new Map(), done = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || anim.has(o) || Array.isArray(o.material)) return;
    const mat = o.material, anc = anchorOf(o); o.getWorldScale(s); const ws = Math.abs(s.x) || 1;
    const uSc = mat.userData && mat.userData.uSc, sc = uSc ? +(uSc.value / ws).toFixed(3) : 0;
    const flow = mat.isShaderMaterial && mat.uniforms && mat.uniforms.uW && mat.uniforms.uR;
    const mk = uSc ? 'arm' + mat.customProgramCacheKey() + mat.color.getHexString() + mat.roughness + mat.metalness       /* 장갑: 무늬 크기는 조각마다 점에 새겨 넣고 한 재질로 */
      : flow ? 'flow' + mat.fragmentShader.length + mat.blending + mat.transparent                                            /* 흐르는 빛: 색·빠르기 등은 점에 새겨 넣고 한 재질로 */
      : mat.uuid;
    const key = anc.uuid + '|' + mk + '|' + o.renderOrder;
    let gk = groups.get(key); if (!gk) groups.set(key, gk = { mat, sc, anc, list: [] });
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.morphAttributes = {}; geo.applyMatrix4(m4.copy(anc.matrixWorld).invert().multiply(o.matrixWorld));
    const n = geo.attributes.position.count;
    if (uSc) geo.setAttribute('aSc', new THREE.BufferAttribute(new Float32Array(n).fill(sc), 1));
    if (flow) { const U = mat.uniforms, a = new Float32Array(n * 4), b = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { a.set([U.uC.value.r, U.uC.value.g, U.uC.value.b, U.uB.value], i * 4); b.set([U.uP.value, U.uR.value, U.uS.value, U.uO.value], i * 4); }
      geo.setAttribute('aF1', new THREE.BufferAttribute(a, 4)); geo.setAttribute('aF2', new THREE.BufferAttribute(b, 4)); geo.setAttribute('aFw', new THREE.BufferAttribute(new Float32Array(n).fill(U.uW.value), 1)); }
    gk.list.push(geo); done.push(o); });
  for (const o of done) o.parent && o.parent.remove(o);
  for (const { mat, sc, anc, list } of groups.values()) {
    const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
    let M = mat;
    if (merged.attributes.aSc) { const ob = mat.onBeforeCompile; M = mat; M.onBeforeCompile = sh => { ob(sh);                  /* 장갑 무늬 크기: 재질 하나에 고정값 대신 점마다 새긴 값 */
        sh.vertexShader = 'attribute float aSc; varying float vScv;\n' + sh.vertexShader.replace('void main() {', 'void main() { vScv = aSc;');
        sh.fragmentShader = sh.fragmentShader.replace('uniform float uSc;', 'varying float vScv;\n#define uSc vScv\n'); };
      const ck = mat.customProgramCacheKey(); M.customProgramCacheKey = () => ck + '_vsc'; }
    if (merged.attributes.aF1) { const U = mat.uniforms;                                                                      /* 흐르는 빛: 색·밝기·빠르기·간격·어긋남을 점마다 */
      M = new THREE.ShaderMaterial({ uniforms: { uT: U.uT, uAlly: U.uAlly, uPu: U.uPu }, transparent: mat.transparent, blending: mat.blending, depthWrite: mat.depthWrite, side: mat.side,
        vertexShader: mat.vertexShader.replace('varying vec2 vUv;', 'attribute vec4 aF1, aF2; attribute float aFw; varying vec4 vF1, vF2; varying float vFw; varying vec2 vUv;').replace('void main(){', 'void main(){vF1=aF1;vF2=aF2;vFw=aFw;'),
        fragmentShader: mat.fragmentShader.replace('uniform float uT,uAlly,uB,uP,uR,uS,uO,uW,uPu;uniform vec3 uC;', 'uniform float uT,uAlly,uPu;varying vec4 vF1,vF2;varying float vFw;\n#define uC vF1.rgb\n#define uB vF1.a\n#define uP vF2.x\n#define uR vF2.y\n#define uS vF2.z\n#define uO vF2.w\n#define uW vFw\n') }); }
    const mesh = new THREE.Mesh(merged, M); mesh.name = 'chron_merged'; anc.add(mesh); }
  /* 빛 알갱이(스프라이트) 전부를 그림·섞는 방식이 같은 것끼리 한 묶음으로:
     원래 알갱이는 보이지 않게 그 자리에 남겨 두고(효과 코드가 계속 움직이고 깜빡이게), 매 장면 그 자리·크기·색·밝기를 읽어 묶음에 옮겨 그림 */
  const sg = new Map(); root.traverse(o => { if (!o.isSprite) return; const M = o.material, key = (M.map && M.map.uuid) + '|' + M.blending; let gk = sg.get(key); if (!gk) sg.set(key, gk = { mat: M, list: [] }); gk.list.push(o); });
  const inv = new THREE.Matrix4(), p = new THREE.Vector3(), w = new THREE.Vector3(), rs = new THREE.Vector3();
  for (const { mat, list } of sg.values()) {
    const n = list.length, P = new Float32Array(n * 12), SZ = new Float32Array(n * 8), CR = new Float32Array(n * 8), C = new Float32Array(n * 16), idx = [];
    for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) CR.set([(k & 1) - .5, (k >> 1) - .5], (i * 4 + k) * 2); const o = i * 4; idx.push(o, o + 1, o + 3, o, o + 3, o + 2); list[i].visible = false; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aSz', new THREE.BufferAttribute(SZ, 2)); geo.setAttribute('aCr', new THREE.BufferAttribute(CR, 2)); geo.setAttribute('aC', new THREE.BufferAttribute(C, 4)); geo.setIndex(idx);
    const sm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: mat.blending, uniforms: { map: { value: mat.map } },
      vertexShader: 'attribute vec2 aSz, aCr; attribute vec4 aC; varying vec2 vU; varying vec4 vC; void main(){ vU=aCr+.5; vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); float k=length(modelViewMatrix[0].xyz); mv.xy+=aCr*aSz*k; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vU; varying vec4 vC; void main(){ vec4 t=texture2D(map,vU); gl_FragColor=vec4(vC.rgb*t.rgb, t.a*vC.a); }' });
    const mesh = new THREE.Mesh(geo, sm); mesh.frustumCulled = false; mesh.name = 'chron_sprites';
    mesh.onBeforeRender = () => { inv.copy(root.matrixWorld).invert(); root.getWorldScale(rs);
      for (let i = 0; i < n; i++) { const sp = list[i], M = sp.material; let on = true; for (let q = sp.parent; q && q !== root; q = q.parent) if (!q.visible) { on = false; break; }
        p.setFromMatrixPosition(sp.matrixWorld).applyMatrix4(inv); sp.getWorldScale(w);
        for (let k = 0; k < 4; k++) { P.set([p.x, p.y, p.z], (i * 4 + k) * 3); SZ.set([w.x / rs.x, w.y / rs.y], (i * 4 + k) * 2); C.set([M.color.r, M.color.g, M.color.b, on ? M.opacity : 0], (i * 4 + k) * 4); } }
      geo.attributes.position.needsUpdate = geo.attributes.aSz.needsUpdate = geo.attributes.aC.needsUpdate = true; };
    root.add(mesh); }
}
