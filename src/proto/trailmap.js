/* 빛 길 지도 (사용자 2026-11-05: 산호 칸이 끊김 — 바닥이 화면 점마다 지나간 토막 72개를 다 훑던 것)
   → 작은 그림 한 장(256×256, 한 칸 약 0.4m)에 '지나간 자리 밝기'를 직접 칠해 두고, 바닥은 그 그림을 한 번만 읽음
   · 매 프레임: 기체가 지난 토막을 칠함(가운데 밝고 바깥으로 옅어짐, 이미 밝으면 더 밝은 쪽을 남김)
   · 0.05초마다: 전체를 조금씩 어둡게 → 5초면 꺼짐  (작은 숫자 칸이라 매 프레임 조금씩은 못 빼서 묶어서 뺌)
   · 기체가 몇 명이든 그리는 양은 같음 */
import * as THREE from 'three';
export function makeTrailMap(renderer, { size = 256, span = 104, cx = 0, cz = -4, life = 5 } = {}) {
  const mk = () => new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  let A = mk(), B = mk(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const sc = new THREE.Scene(); sc.add(quad);
  const SEG = 8, segs = Array.from({ length: SEG }, () => new THREE.Vector4());
  const mat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { uPrev: { value: null }, uDec: { value: 0 }, uSeg: { value: segs }, uN: { value: 0 }, uO: { value: new THREE.Vector3(cx - span / 2, cz - span / 2, span) } },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader: `precision highp float; varying vec2 vU; uniform sampler2D uPrev; uniform float uDec, uN; uniform vec4 uSeg[${SEG}]; uniform vec3 uO;
      void main(){ float v=texture2D(uPrev,vU).r-uDec; vec2 p=uO.xy+vU*uO.z;
        for(int i=0;i<${SEG};i++){ if(float(i)>=uN) break; vec4 T=uSeg[i]; vec2 ab=T.zw-T.xy, ap=p-T.xy; float k=clamp(dot(ap,ab)/max(dot(ab,ab),1e-4),0.,1.); vec2 d=ap-ab*k;
          v=max(v,exp(-dot(d,d)/2.2)); }
        gl_FragColor=vec4(max(v,0.),0.,0.,1.); }` });
  quad.material = mat;
  { const c = new THREE.Color(); renderer.getClearColor(c); const a = renderer.getClearAlpha(); for (const t of [A, B]) { renderer.setRenderTarget(t); renderer.setClearColor(0, 1); renderer.clear(); } renderer.setRenderTarget(null); renderer.setClearColor(c, a); }
  const last = new Map(); let acc = 0, n = 0;
  const api = { tex: A.texture, origin: mat.uniforms.uO.value,
    /* id마다 지금 자리를 넘김 → 지난 자리에서 지금까지 한 토막 */
    mark(id, x, z) { const L = last.get(id); if (L && n < SEG && Math.hypot(x - L[0], z - L[1]) < 6) segs[n++].set(L[0], L[1], x, z); else if (n < SEG) segs[n++].set(x, z, x, z); last.set(id, [x, z]); },
    update(dt) { acc += dt; let dec = 0; if (acc >= .05) { dec = acc / life; acc = 0; }
      if (!n && !dec) return; mat.uniforms.uPrev.value = A.texture; mat.uniforms.uDec.value = dec; mat.uniforms.uN.value = n;
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(B); renderer.render(sc, cam); renderer.setRenderTarget(prev);
      [A, B] = [B, A]; api.tex = A.texture; n = 0; } };
  return api;
}
