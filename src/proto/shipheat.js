/* 기체 과열 표시 — 시안 B 확정 (2026-11-04 사용자)
   · 빛 덩어리를 덧붙이지 않고 기체 금속 자체가 달군 쇠 색(어두운 빨강 → 빨강 → 주황 → 노랑빛 하양)으로 달아오름
   · 열이 총구에서 시작해 몸통 쪽으로 번져 감 — 얼마나 뒤까지 달아올랐나 = 열 정도. 앞이 가장 뜨겁고 뒤로 갈수록 식은 색
   · 기체에는 열 50%부터 보임 (평소엔 깨끗하게 · 달아오르기 시작하면 그 자체가 '곧 과열' 경고). 50% = 총구 끝에서 막 피어남 → 100% = 몸 끝까지
   · 과열 순간 한 번 하얗게 타오르고 기체가 파르르 (연기 없음 · 사용자)
   · 무게: 기체 재질에 몇 줄 더함 (그리기 횟수 그대로) */
import * as THREE from 'three';

export const BB_GLSL = `vec3 bb(float h){ h = clamp(h, 0., 1.);
  vec3 c0 = vec3(.25,.015,0.), c1 = vec3(.8,.07,.01), c2 = vec3(1.25,.38,.04), c3 = vec3(1.45,.9,.35), c4 = vec3(1.6,1.35,1.);
  return h < .3 ? mix(c0, c1, h / .3) : h < .6 ? mix(c1, c2, (h - .3) / .3) : h < .85 ? mix(c2, c3, (h - .6) / .25) : mix(c3, c4, (h - .85) / .15); }`;
/* 열(0~1) → 기체에 보이는 열(0~1): 50% 아래는 0 */
export const heatVis = h => Math.max(0, (h - .5) / .5);

export function applyShipHeat(root, uT) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), bx = new THREE.Box3().setFromObject(root).applyMatrix4(inv);
  const U = { uHeat: { value: 0 }, uFlash: { value: 0 }, uInv: { value: new THREE.Matrix4() }, uZ0: { value: bx.min.z }, uZ1: { value: bx.max.z }, uT };
  root.traverse(o => { if (!o.isMesh) return; const arr = Array.isArray(o.material) ? o.material : [o.material];
    const nm = arr.map(m0 => { const m = m0.clone(); m.userData = { ...m0.userData }; const prev = m0.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { prev?.call(m0, sh, r); Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vHw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vHw = (modelMatrix * vec4(transformed, 1.)).xyz;');
        sh.fragmentShader = `varying vec3 vHw; uniform float uHeat, uFlash, uZ0, uZ1, uT; uniform mat4 uInv;\n${BB_GLSL}\n` + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (uHeat > .001 || uFlash > .001) { vec3 lp = (uInv * vec4(vHw, 1.)).xyz; float zN = clamp((lp.z - uZ0) / (uZ1 - uZ0), 0., 1.);   /* 0 = 총구 · 1 = 엔진 */
            float crease = clamp(length(fwidth(normal)) * 6. - .15, 0., 1.), vein = .5 + .5 * sin(lp.z * 40. + sin(lp.x * 30.) * 1.5);    /* 모서리·이음매를 따라 */
            float front = .04 + uHeat * .92, m = smoothstep(front + .015, front - .09, zN), tz = uHeat * (1. - zN / max(front, .05) * .55);
            totalEmissiveRadiance += bb(tz + uFlash * .4) * m * (crease * (.7 + 1.6 * tz) + .3 * tz * (.6 + .4 * vein)) * smoothstep(0., .12, uHeat) * (1. + uFlash * 2.); }`); };
      m.customProgramCacheKey = () => (m0.customProgramCacheKey?.() || '') + '|heatB'; return m; });
    o.material = Array.isArray(o.material) ? nm : nm[0]; });
  /* 매 장면: 열(0~1 원래 값) · 과열 순간 빛(0~1) */
  return { U, nose: new THREE.Vector3(0, 0, bx.min.z), update(heat, flash) { root.updateMatrixWorld(true); U.uInv.value.copy(root.matrixWorld).invert(); U.uHeat.value = heatVis(heat); U.uFlash.value = flash; } };
}
