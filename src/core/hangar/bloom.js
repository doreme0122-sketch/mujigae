import * as THREE from 'three';
/* 가벼운 글로우: 밝은 데만 뽑아서 1/4 크기로 두 번 번지게 하고 더한다 */
export function makeBloom(renderer, bo = {}){
  const T=THREE.HalfFloatType;
  const opt={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:T,depthBuffer:false};
  const rtS=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,type:T,samples:bo.samples ?? 4});
  const a=new THREE.WebGLRenderTarget(1,1,opt), b=new THREE.WebGLRenderTarget(1,1,opt);
  const c=new THREE.WebGLRenderTarget(1,1,opt), d=new THREE.WebGLRenderTarget(1,1,opt);
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1), sc=new THREE.Scene();
  const geo=new THREE.PlaneGeometry(2,2);
  const V='varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const cut=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{t:{value:null},th:{value:.95}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t;uniform float th;
      void main(){ vec3 c=texture(t,vU).rgb; float l=max(c.r,max(c.g,c.b));
        o=vec4(c*smoothstep(th,th+.5,l),1.); }`});
  const blur=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{t:{value:null},dir:{value:new THREE.Vector2()}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t;uniform vec2 dir;
      void main(){ vec3 s=texture(t,vU).rgb*.2270;
        s+=(texture(t,vU+dir*1.3846).rgb+texture(t,vU-dir*1.3846).rgb)*.3162;
        s+=(texture(t,vU+dir*3.2308).rgb+texture(t,vU-dir*3.2308).rgb)*.0702;
        o=vec4(s,1.); }`});
  const comp=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,
    uniforms:{t:{value:null},b1:{value:null},b2:{value:null},k:{value:.28}},
    vertexShader:'in vec3 position;in vec2 uv;out vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;in vec2 vU;out vec4 o;uniform sampler2D t,b1,b2;uniform float k;
      void main(){ vec3 c=texture(t,vU).rgb + (texture(b1,vU).rgb*.45+texture(b2,vU).rgb*1.05)*k;
        c=c/(1.+c*.52);
        o=vec4(pow(max(c,0.),vec3(1./2.2)),1.); }`});
  const mesh=new THREE.Mesh(geo,cut); sc.add(mesh);
  function run(mat,target){ mesh.material=mat; renderer.setRenderTarget(target); renderer.render(sc,cam); }
  return {
    scene:rtS,
    size(W,H){ rtS.setSize(W,H); const w=Math.max(2,W>>2),h=Math.max(2,H>>2);
      a.setSize(w,h);b.setSize(w,h); c.setSize(Math.max(2,W>>4),Math.max(2,H>>4));d.setSize(Math.max(2,W>>4),Math.max(2,H>>4)); },
    /* 모서리 매끄럽게 하는 계산 횟수 바꾸기 (0 = 끔) */
    setSamples(n){ if(rtS.samples!==n){ rtS.samples=n; rtS.dispose(); } },
    render(W,H,off){
      if(off){ comp.uniforms.t.value=rtS.texture; comp.uniforms.b1.value=rtS.texture; comp.uniforms.b2.value=rtS.texture; const k=comp.uniforms.k.value; comp.uniforms.k.value=0; run(comp,null); comp.uniforms.k.value=k; return; }   /* 빛 번짐 끔: 밝기 정리만 */
      cut.uniforms.t.value=rtS.texture; run(cut,a);
      const w=Math.max(2,W>>2),h=Math.max(2,H>>2);
      blur.uniforms.t.value=a.texture; blur.uniforms.dir.value.set(1/w,0); run(blur,b);
      blur.uniforms.t.value=b.texture; blur.uniforms.dir.value.set(0,1/h); run(blur,a);
      blur.uniforms.t.value=a.texture; blur.uniforms.dir.value.set(4/w,0); run(blur,c);
      blur.uniforms.t.value=c.texture; blur.uniforms.dir.value.set(0,4/h); run(blur,d);
      comp.uniforms.t.value=rtS.texture; comp.uniforms.b1.value=a.texture; comp.uniforms.b2.value=d.texture;
      run(comp,null);
    }};
}
