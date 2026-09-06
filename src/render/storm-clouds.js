import * as THREE from 'three';
import {STORM_LOOK} from './storm-look.js';

// Lit drifting slices; world-space exclusion keeps every playable tile clear.
// No cloud takes part in simulation, picking, shadow or planar reflection passes.
export class StormClouds {
 constructor(scene){
  const count=48,geometry=new THREE.PlaneGeometry(1,1);
  const sizes=new Float32Array(count*2),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){sizes.set([12+(i%4)*2,5+(i%3)*1.5],i*2);seeds[i]=i*1.73;}
  geometry.setAttribute('cloudSize',new THREE.InstancedBufferAttribute(sizes,2));
  geometry.setAttribute('cloudSeed',new THREE.InstancedBufferAttribute(seeds,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},opacity:{value:STORM_LOOK.cloudOpacity},scale:{value:STORM_LOOK.cloudScale},light:{value:STORM_LOOK.cloudLight},speed:{value:STORM_LOOK.cloudSpeed},inverseView:{value:new THREE.Matrix4()}},
   vertexShader:`uniform mat4 inverseView;attribute vec2 cloudSize;attribute float cloudSeed;uniform float time,scale,speed;varying vec2 vUv;varying float seed;varying vec3 world;
   void main(){vUv=uv;seed=cloudSeed;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*cloudSize*scale;center.x+=sin(time*speed+seed)*.8;
   world=(inverseView*center).xyz;gl_Position=projectionMatrix*center;}`,
   fragmentShader:`uniform float time,opacity,light,speed;varying vec2 vUv;varying float seed;varying vec3 world;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float fbm(vec2 p){float f=0.;float a=.5;mat2 m=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){f+=a*noise(p);p=m*p*2.07+3.1;a*=.5;}return f;}
   void main(){vec2 q=(vUv-.5)*2.;float edge=1.-smoothstep(.32,1.,dot(q,q));
    float outside=max(max(-1.4-world.x,world.x-30.4),max(-1.4-world.z,world.z-22.4));
    float clear=smoothstep(.0,3.0,outside);if(clear*edge<.008)discard;
    vec2 p=vUv*vec2(4.4,2.8)+vec2(seed+time*speed,seed*.37);
    vec2 warp=vec2(fbm(p*.63),fbm(p*.63+6.2));float n=fbm(p+warp*1.4);
    float density=smoothstep(.24,.75,n)*edge;float rim=clamp((fbm(p+warp*1.4+vec2(-.17,.22))-n)*5.+.35,0.,1.);
    vec3 dark=vec3(.001,.002,.003),lit=vec3(.07,.09,.11)*light;
    vec3 col=mix(dark,lit,rim)*mix(.65,1.,vUv.y);float a=density*opacity*clear;
    gl_FragColor=vec4(col,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
  this.mist=new THREE.InstancedMesh(geometry,material,count);this.mist.name='storm-cloud-banks';this.mist.frustumCulled=false;this.mist.userData.noAO=true;this.mist.userData.noReflection=true;
  const d=new THREE.Object3D();
  for(let i=0;i<count;i++){const side=i%4,layer=Math.floor(i/24),u=(Math.floor(i/4)%6)/5;
   d.position.set(side===0?-6-layer*6:side===1?36+layer*6:-8+44*u,layer?2.4:-1.2,side===2?-6-layer*6:side===3?28+layer*6:-7+36*u);d.updateMatrix();this.mist.setMatrixAt(i,d.matrix);}
  this.mist.instanceMatrix.needsUpdate=true;
  this.mist.onBeforeRender=(r,s,c)=>material.uniforms.inverseView.value.copy(c.matrixWorld);
  scene.add(this.mist);
 }
 configure(look){const u=this.mist.material.uniforms;for(const [key,name]of [['cloudOpacity','opacity'],['cloudScale','scale'],['cloudLight','light'],['cloudSpeed','speed']])if(look[key]!=null)u[name].value=look[key];}
 update(time){this.mist.material.uniforms.time.value=time;}
}
