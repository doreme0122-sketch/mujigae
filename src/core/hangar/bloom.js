import * as THREE from 'three';
/* 가벼운 글로우: 밝은 데만 뽑아서 1/4 크기로 두 번 번지게 하고 더한다 */
export function makeBloom(renderer, bo = {}){
  const T=THREE.HalfFloatType;
  const opt={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:T,depthBuffer:false};
  const rtS=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:T,samples:bo.samples ?? 4});
  const a=new THREE.WebGLRenderTarget(1,1,opt), b=new THREE.WebGLRenderTarget(1,1,opt);
  const c=new THREE.WebGLRenderTarget(1,1,opt), d=new THREE.WebGLRenderTarget(1,1,opt);
  const e2=new THREE.WebGLRenderTarget(1,1,opt), f2=new THREE.WebGLRenderTarget(1,1,opt);   /* 1/8 단계 */
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1), sc=new THREE.Scene();
  const geo=new THREE.PlaneGeometry(2,2);
  const V='varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const cut=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{t:{value:null},th:{value:.95}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t;uniform float th;
      bool bad(vec3 c){ uvec3 b=floatBitsToUint(c)&0x7f800000u; return any(equal(b,uvec3(0x7f800000u))); }   /* 숫자 아님·끝없음: 비트로 확인(그래픽 카드가 지워 버리지 못하게) */
      void main(){ vec3 c=texture(t,vU).rgb; float l=max(c.r,max(c.g,c.b));
        if(bad(c)||!(l<1e4)){ c=vec3(0.); l=0.; }                                          /* 계산이 깨진 점은 뺌 */
        else if(l>2.){ float L=2.+(l-2.)/(1.+(l-2.)*.5); c*=L/l; l=L; }           /* 아주 밝은 점(매끈한 흑요석·결정의 바늘 끝 반사)은 번짐에 넣을 때 세기를 부드럽게 눌러 최대 4 — 점 하나가 화면 넓게 번지지 않게 (사용자 2026-11-03: 와드·흑요석 벽 하얀 얼룩) */
        o=vec4(c*smoothstep(th,th+.5,l),1.); }`});
  const blur=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{t:{value:null},dir:{value:new THREE.Vector2()}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t;uniform vec2 dir;
      void main(){ vec3 s=texture(t,vU).rgb*.2270;
        s+=(texture(t,vU+dir*1.3846).rgb+texture(t,vU-dir*1.3846).rgb)*.3162;
        s+=(texture(t,vU+dir*3.2308).rgb+texture(t,vU-dir*3.2308).rgb)*.0702;
        o=vec4(s,1.); }`});
  /* 절반으로 줄이기: 네 점을 고르게 섞어 줄임 (한 번에 크게 줄이면 띄엄띄엄 집혀 네모가 드러남) */
  const down=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{t:{value:null},px:{value:new THREE.Vector2()}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t;uniform vec2 px;
      void main(){ vec3 s=texture(t,vU+px*vec2(-1.,-1.)).rgb+texture(t,vU+px*vec2(1.,-1.)).rgb+texture(t,vU+px*vec2(-1.,1.)).rgb+texture(t,vU+px*vec2(1.,1.)).rgb; o=vec4(s*.25,1.); }`});
  const comp=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,
    uniforms:{t:{value:null},b1:{value:null},b2:{value:null},b3:{value:null},k:{value:.28},warp:{value:new THREE.Vector4(.5,.5,0,0)},lens:{value:new THREE.Vector4(.5,.5,0,0)},haze:{value:new THREE.Vector4(.5,.5,0,0)},hT:{value:0},asp:{value:1}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t,b1,b2,b3;uniform float k,asp,hT;uniform vec4 warp,lens,haze;
      bool bad(vec3 c){ uvec3 b=floatBitsToUint(c)&0x7f800000u; return any(equal(b,uvec3(0x7f800000u))); }
      void main(){ vec2 uv=vU;
        if(lens.w>0.){ vec2 d=(uv-lens.xy)*vec2(asp,1.); float r=length(d)+1e-5, R=max(lens.z,1e-3);   /* 블랙홀: 둘레 공간이 휘감기며(소용돌이) 가운데로 끌려 보임 */
          float sw=lens.w*2.4*exp(-r/(R*1.3)), cs=cos(sw), sn=sin(sw); d=mat2(cs,-sn,sn,cs)*d;
          float rr=r*(1.-lens.w*.55*exp(-r/R)); uv=lens.xy+d/r*rr/vec2(asp,1.); }   /* 가운데 쪽을 끌어 와 넓혀 보임 → 검은 가운데가 커 보이고 둘레 빛이 휘감김 */
        if(warp.w>0.){ vec2 d=(vU-warp.xy)*vec2(asp,1.); float r=length(d)+1e-5, R=warp.z;      /* 공간이 일그러지는 파동: 센 첫 물결 + 뒤따르는 약한 물결 둘 */
          float w=exp(-(((r-R)/.035)*((r-R)/.035)))-exp(-(((r-R+.05)/.035)*((r-R+.05)/.035)))*.6+(exp(-(((r-R*.72)/.03)*((r-R*.72)/.03)))-exp(-(((r-R*.72+.04)/.03)*((r-R*.72+.04)/.03)))*.6)*.45+(exp(-(((r-R*.48)/.025)*((r-R*.48)/.025))))*.2;
          uv-=d/r/vec2(asp,1.)*w*warp.w; }
        if(haze.w>0.){ vec2 d=(uv-haze.xy)*vec2(asp,1.); float f=exp(-dot(d,d)/max(haze.z*haze.z,1e-6));   /* 열 아지랑이: 달아오른 총구 앞 공기만 투명하게 일렁임 */
          uv+=vec2(sin(uv.y*260.+hT*11.+sin(uv.x*120.+hT*3.)*2.),cos(uv.x*240.-hT*9.+sin(uv.y*90.)*2.))*haze.w*f*.0022; }
        vec3 m0=texture(t,uv).rgb; if(bad(m0)) m0=vec3(0.);
        vec3 c=m0 + (texture(b1,uv).rgb*.45+texture(b3,uv).rgb*.45+texture(b2,uv).rgb*.6)*k;
        c=c/(1.+c*.52);
        o=vec4(pow(max(c,0.),vec3(1./2.2)),1.); }`});
  const mesh=new THREE.Mesh(geo,cut); sc.add(mesh);
  function run(mat,target){ mesh.material=mat; renderer.setRenderTarget(target); renderer.render(sc,cam); }
  return {
    scene:rtS,
    size(W,H){ rtS.setSize(W,H); const w=Math.max(2,W>>2),h=Math.max(2,H>>2);
      a.setSize(w,h);b.setSize(w,h); e2.setSize(Math.max(2,W>>3),Math.max(2,H>>3));f2.setSize(Math.max(2,W>>3),Math.max(2,H>>3)); c.setSize(Math.max(2,W>>4),Math.max(2,H>>4));d.setSize(Math.max(2,W>>4),Math.max(2,H>>4)); },
    /* 모서리 매끄럽게 하는 계산 횟수 바꾸기 (0 = 끔) */
    setSamples(n){ if(rtS.samples!==n){ rtS.samples=n; rtS.dispose(); } },
    /* 공간 일그러짐 파동 (화면 좌표 중심 cx,cy · 반지름 r · 세기 s, 0이면 꺼짐) */
    warp(cx,cy,r,s,asp){ comp.uniforms.warp.value.set(cx,cy,r,s); comp.uniforms.asp.value=asp||1; },
    /* 블랙홀 둘레 휘어 보임 (화면 좌표 중심 · 반지름 · 세기, 0이면 꺼짐) */
    /* 열 아지랑이 (화면 좌표 중심 · 반지름 · 세기, 0이면 꺼짐) */
    haze(cx,cy,r,s,t){ comp.uniforms.haze.value.set(cx,cy,r,s); comp.uniforms.hT.value=t; },
    lens(cx,cy,r,s,asp){ comp.uniforms.lens.value.set(cx,cy,r,s); if(asp) comp.uniforms.asp.value=asp; },
    render(W,H,off){
      if(off){ comp.uniforms.t.value=rtS.texture; comp.uniforms.b1.value=rtS.texture; comp.uniforms.b2.value=rtS.texture; comp.uniforms.b3.value=rtS.texture; const k=comp.uniforms.k.value; comp.uniforms.k.value=0; run(comp,null); comp.uniforms.k.value=k; return; }   /* 빛 번짐 끔: 밝기 정리만 */
      cut.uniforms.t.value=rtS.texture; run(cut,a);
      const w=Math.max(2,W>>2),h=Math.max(2,H>>2);
      blur.uniforms.t.value=a.texture; blur.uniforms.dir.value.set(1/w,0); run(blur,b);
      blur.uniforms.t.value=b.texture; blur.uniforms.dir.value.set(0,1/h); run(blur,a);
      /* 1/4 → 1/8 → 1/16 로 절반씩 줄이며 단계마다 한 칸 간격으로 번짐 (빈틈 없이) */
      const w8=Math.max(2,W>>3),h8=Math.max(2,H>>3),w16=Math.max(2,W>>4),h16=Math.max(2,H>>4);
      down.uniforms.t.value=a.texture; down.uniforms.px.value.set(.5/w,.5/h); run(down,e2);
      blur.uniforms.t.value=e2.texture; blur.uniforms.dir.value.set(1/w8,0); run(blur,f2);
      blur.uniforms.t.value=f2.texture; blur.uniforms.dir.value.set(0,1/h8); run(blur,e2);
      down.uniforms.t.value=e2.texture; down.uniforms.px.value.set(.5/w8,.5/h8); run(down,c);
      blur.uniforms.t.value=c.texture; blur.uniforms.dir.value.set(1/w16,0); run(blur,d);
      blur.uniforms.t.value=d.texture; blur.uniforms.dir.value.set(0,1/h16); run(blur,c);
      comp.uniforms.t.value=rtS.texture; comp.uniforms.b1.value=a.texture; comp.uniforms.b2.value=c.texture; comp.uniforms.b3.value=e2.texture;
      run(comp,null);
    }};
}
