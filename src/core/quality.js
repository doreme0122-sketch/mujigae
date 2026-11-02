/* 그래픽 품질 단계 — 모든 화면 공용 (게임·미리보기)
   기준은 갤럭시 A 중급기 60프레임('보통'). 좋은 기기는 그 위로 더 얹는다.
   · 보통: 모서리 매끄럽게 끔, 한 장면 약 90만 점
   · 높음: 매끄럽게 4번, 약 160만 점
   · 최고: 높음 + 화면 촘촘하게(약 260만 점), 무거운 효과(extra)까지
   규칙 (2026-11-02 확정)
   · 처음엔 기기를 잠깐 재서 맞는 단계를 '추천'하고 그 단계로 시작하되, 언제든 설정에서 바꾼다.
   · 게임 중 프레임이 떨어져도 단계를 절대 저절로 바꾸지 않는다(강제 금지).
   · 고른 단계가 많이 무거우면 설정 화면에 조용히 안내만 한다. */
export const TIERS = {
  normal: { id: 'normal', name: '보통', aa: 0, px: 9e5, extra: false },
  high: { id: 'high', name: '높음', aa: 4, px: 1.6e6, extra: false },
  ultra: { id: 'ultra', name: '최고', aa: 4, px: 2.6e6, extra: true } };
export const ORDER = ['normal', 'high', 'ultra'];
const K = 'mj-quality', KR = 'mj-quality-rec', KH = 'mj-quality-heavy';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
const subs = new Set();

export function tierId() { return TIERS[ls.get(K)] ? ls.get(K) : (TIERS[ls.get(KR)] ? ls.get(KR) : 'normal'); }
export function tier() { return TIERS[tierId()]; }
export function chosen() { return !!TIERS[ls.get(K)]; }
export function setTier(id) { if (!TIERS[id]) return; ls.set(K, id); ls.set(KH, null); for (const f of subs) f(TIERS[id]); }
export function onChange(f) { subs.add(f); return () => subs.delete(f); }
export function recommended() { return TIERS[ls.get(KR)] || null; }
export function heavy() { return ls.get(KH) === tierId(); }

/* 화면(CSS) 크기 → 실제로 그릴 크기 (단계의 점 수 한도 안에서, 기기 밀도를 넘지 않게) */
export function renderSize(cw, ch, t = tier()) { const d = devicePixelRatio || 1; const w = cw * d, h = ch * d, k = Math.min(1, Math.sqrt(t.px / (w * h)));
  return [Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k))]; }

/* 기기 재기 → 추천 단계 (처음 한 번). 그래픽 칩 이름을 먼저 보고, 모르면 짧게 무거운 그림을 그려 본다 */
export async function measure() {
  if (TIERS[ls.get(KR)]) return TIERS[ls.get(KR)];
  let rec = 'normal';
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const gl = cv.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), name = (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) + '';
      const top = /Apple|Adreno \(TM\) (7[3-9]\d|8\d\d)|Xclipse 9\d\d|Immortalis|Mali-G7(1|2|8)\d|Mali-G715|Mali-G720|Mali-G925|GeForce|Radeon|Intel\(R\) (Iris|Arc)/i;
      const mid = /Adreno \(TM\) (6[4-9]\d|7[0-2]\d)|Xclipse|Mali-G(6|7)\d/i;
      if (/SwiftShader|llvmpipe/i.test(name)) rec = 'normal';
      else {
        /* 짧은 부하 시험: 화면 가득 무거운 계산을 몇 번 그려 걸린 시간 */
        const vs = '#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}', fs = `#version 300 es\nprecision highp float;out vec4 o;
          float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){ vec2 q=gl_FragCoord.xy*.01; float s=0.;
          for(int i=0;i<48;i++){ q=mat2(1.6,1.2,-1.2,1.6)*q+.3; s+=h(floor(q))*.02; } o=vec4(s); }`;
        const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
        const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); const px = new Uint8Array(4);
        const run = n => { for (let i = 0; i < n; i++) gl.drawArrays(gl.TRIANGLES, 0, 3); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
        run(2); const t0 = performance.now(); run(12); const ms = (performance.now() - t0) / 12;
        const byTime = ms < 1.6 ? 'ultra' : ms < 4 ? 'high' : 'normal';
        rec = top.test(name) ? (byTime === 'normal' ? 'high' : byTime) : mid.test(name) ? 'normal' : byTime;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
  } catch (e) { rec = 'normal'; }
  ls.set(KR, rec); return TIERS[rec];
}

/* 프레임 살피기 (바꾸지는 않음): 고른 단계에서 오래 느리면 '무거움' 표시만 남긴다 */
export function watch() { let slow = 0, acc = 0, n = 0;
  return dt => { acc += dt; n++; if (acc < 1) return; const f = n / acc; acc = 0; n = 0;
    slow = f < 45 ? slow + 1 : Math.max(0, slow - 1); if (slow >= 8 && tierId() !== 'normal') ls.set(KH, tierId()); }; }
