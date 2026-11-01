/* 스킬 빛 재질 — 공용 블록. 무지개는 칠하지 않고 빛이 갈라져서 생긴다.
   - 막(film): 비눗방울처럼 얇은 막에서 빛이 겹쳐 생기는 색 (막 두께·보는 각도로 계산)
   - 빔(beam): 뜨거운 흰 심 + 바깥으로 갈수록 파장마다 퍼짐이 달라 무지개 테두리
   - 고리(ring): 퍼지는 충격파. 무지개 고리는 빨강이 바깥, 보라가 안쪽으로 갈라짐
   - 잔상(ghost): 기체 윤곽에서만 빛이 갈라지는 투명한 몸 */
import * as THREE from 'three';

const HUE = 'vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }';
const NOISE = `float h1(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z); }`;
/* 얇은 막의 반사색: 두께 d(나노미터), 막 안에서 꺾인 각의 cos */
const FILM = 'vec3 film(float d,float ct){ vec3 ph=6.2832*2.*1.38*d*ct/vec3(640.,540.,450.); return .5-.5*cos(ph); }';

const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

/* 막: 구 모양. arc>0 이면 앞쪽(-Z)만 남은 방패 */
export function filmMaterial() {
  const hits = []; for (let i = 0; i < 6; i++) hits.push(new THREE.Vector4(0, 0, 1, -99));
  return new THREE.ShaderMaterial({ ...add, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uI: { value: 0 }, uHit: { value: hits }, uCrack: { value: 0 }, uArc: { value: -1 }, uHot: { value: 0 } },
    vertexShader: `varying vec3 vN, vV, vO;
      void main(){ vO = normalize(position); vec4 w = modelMatrix * vec4(position,1.);
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; uniform float uT,uI,uCrack,uArc,uHot; uniform vec4 uHit[6];
      varying vec3 vN, vV, vO; ${HUE} ${NOISE} ${FILM}
      vec2 vor(vec3 p){ vec3 i=floor(p),f=fract(p); float a=9.,b=9.;
        for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec3 g=vec3(x,y,z);
          vec3 o=vec3(h1(i+g),h1(i+g+5.3),h1(i+g+9.1)); vec3 r=g+o-f; float d=dot(r,r); if(d<a){b=a;a=d;}else if(d<b)b=d; }
        return vec2(sqrt(a),sqrt(b)-sqrt(a)); }
      void main(){
        float ndv = abs(dot(normalize(vN), vV)), fr = pow(1. - ndv, 2.2);
        float side = 1.;
        if (uArc > -1.) side = smoothstep(uArc, uArc + .18, -vO.z);           /* 방패: 앞쪽만, 가장자리는 부드럽게 */
        float wave = 0.;
        for (int i = 0; i < 6; i++) { float age = uT - uHit[i].w; if (age < 0. || age > 1.2) continue;
          float ang = acos(clamp(dot(vO, normalize(uHit[i].xyz)), -1., 1.));
          float rr = age * 2.4; wave += exp(-pow((ang - rr) * 9., 2.)) * (1. - age / 1.2) * 1.6 + exp(-ang * 7.) * exp(-age * 9.) * 3.; }
        float d = 260. + 420. * n3(vO * 3.8 + vec3(0., uT * .3, uT * .17)) + 120. * wave;
        float ct = sqrt(1. - (1. - ndv * ndv) / (1.38 * 1.38));
        vec3 c = film(d, ct) * (fr * 1.35 + .015) * 1.1 + vec3(.8, .9, 1.) * pow(fr, 4.) * .35;
        c += vec3(1.) * wave * .35 + film(d + 80., ct) * wave * .8;
        if (uCrack > 0.) { vec2 v = vor(vO * 3.4); float e = smoothstep(.07, 0., v.y) * uCrack;      /* 금 사이로 새는 빛 */
          c += (vec3(1.) * 1.3 + hue(fract(v.x * 1.7)) * .7) * e; }
        c += vec3(1., .95, .9) * uHot * (fr + .2);
        gl_FragColor = vec4(c * uI * side, 1.);
      }` });
}

/* 빔: A→B, 화면을 향해 눕는 띠 */
export function beamMaterial() {
  return new THREE.ShaderMaterial({ ...add, depthTest: false,
    uniforms: { uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uW: { value: 1 }, uI: { value: 0 }, uT: { value: 0 }, uLen: { value: 10 }, uWarm: { value: 0 } },
    vertexShader: `uniform vec3 uA,uB; uniform float uW; varying vec2 vU;
      void main(){ vU = uv; vec3 P = mix(uA, uB, uv.y), ax = normalize(uB - uA);
        vec3 s = normalize(cross(ax, cameraPosition - P));
        gl_Position = projectionMatrix * viewMatrix * vec4(P + s * (uv.x - .5) * uW * 2.6, 1.); }`,
    fragmentShader: `precision highp float; uniform float uI,uT,uLen,uWarm; varying vec2 vU; ${HUE} ${NOISE}
      void main(){
        float x = (vU.x - .5) * 2.6, y = vU.y * uLen;
        float fl = .82 + .18 * n3(vec3(y * .9 - uT * 22., x * 3., uT * 3.));                      /* 빔 속을 흐르는 결 */
        float ex = abs(x) / fl;
        vec3 c = vec3(1.) * exp(-ex * ex * 18.) * 1.9;
        for (int i = 0; i < 7; i++) { float f = float(i) / 6.; float s = .55 + f * .6;               /* 빨강이 가장 바깥 */
          c += hue((1. - f) * .83) * exp(-pow(ex / s, 2.) * 3.) * .55; }
        c = mix(c, c * vec3(1.15, .8, .55), uWarm);
        float cap = smoothstep(0., .04, vU.y) * smoothstep(1., .9, vU.y) * smoothstep(1.3, .85, abs(x));
        float flare = exp(-vU.y * 18.) * 1.5;                                                       /* 뿜는 입구가 가장 뜨겁다 */
        gl_FragColor = vec4(c * (cap + flare) * uI, 1.);
      }` });
}

/* 고리: XZ 평면에 누운 충격파. spec=1 무지개로 갈라짐, 0 이면 c 한 색 */
export function ringMaterial() {
  return new THREE.ShaderMaterial({ ...add, depthTest: false,
    uniforms: { uR: { value: 1 }, uW: { value: .2 }, uI: { value: 0 }, uC: { value: new THREE.Color(1, 1, 1) }, uSpec: { value: 1 }, uS: { value: 10 }, uFill: { value: 0 } },
    vertexShader: 'varying vec2 vP; uniform float uS; void main(){ vP = position.xz * uS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uS, 1.); }',
    fragmentShader: `precision highp float; uniform float uR,uW,uI,uSpec,uFill,uS; uniform vec3 uC; varying vec2 vP; ${HUE}
      void main(){ float r = length(vP), d = (r - uR) / uW;
        vec3 c;
        if (uSpec > .5) { c = vec3(0.); for (int i = 0; i < 7; i++) { float f = float(i) / 6.;
            c += hue((1. - f) * .83) * exp(-pow(d - (f - .5) * 1.6, 2.) * 2.2) * .5; }
          c += vec3(1.) * exp(-d * d * 6.) * .9; }
        else c = uC * (exp(-d * d * 2.) + exp(-abs(d) * 1.2) * .3);
        c *= smoothstep(-6., 0., -d) * smoothstep(uS, uS * .8, r);
        c += (uSpec > .5 ? vec3(.55, .6, 1.) : uC) * uFill * smoothstep(uR, 0., r) * .14;     /* 안쪽 은은한 공간 */
        gl_FragColor = vec4(c * uI, 1.); }` });
}

/* 잔상·분신·통과: 윤곽에서만 빛이 갈라지는 투명한 몸 */
export function ghostMaterial() {
  return new THREE.ShaderMaterial({ ...add, side: THREE.FrontSide,
    uniforms: { uI: { value: 1 }, uT: { value: 0 }, uShift: { value: 0 } },
    vertexShader: `varying vec3 vN, vV, vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `precision highp float; uniform float uI,uT,uShift; varying vec3 vN, vV, vW; ${HUE}
      void main(){ float ndv = abs(dot(normalize(vN), vV)), fr = pow(1. - ndv, 1.6);
        vec3 c = hue(fract(fr * .7 + vW.x * .05 + uShift)) * fr * 1.1 + vec3(.75, .85, 1.) * (fr * fr * .9 + .04);
        gl_FragColor = vec4(c * uI, 1.); }` });
}

/* 도우미 결정체: 금속 위 얇은 막(보는 각도마다 색이 바뀜) */
export function crystalMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: 0xdfe6ff, metalness: 1, roughness: .14, iridescence: 1, iridescenceIOR: 1.7,
    iridescenceThicknessRange: [260, 640], clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.6, emissive: 0x334477, emissiveIntensity: .25 });
}
