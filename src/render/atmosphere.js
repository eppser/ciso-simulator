import * as THREE from 'three';
import {textSprite} from './text.js';

// Ambient perimeter mist: one instanced draw, no extra lights or simulation entities.
// It lives outside the board, below roof lines, so routes and warnings stay legible.
export class PerimeterAtmosphere {
 constructor(scene){
  const geometry=new THREE.PlaneGeometry(1,1),count=24;
  const sizes=new Float32Array(count*2),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){sizes.set([8+(i%4)*2,2.5+(i%3)*.5],i*2);seeds[i]=i*1.73;}
  geometry.setAttribute('cloudSize',new THREE.InstancedBufferAttribute(sizes,2));
  geometry.setAttribute('cloudSeed',new THREE.InstancedBufferAttribute(seeds,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
   vertexShader:`attribute vec2 cloudSize;attribute float cloudSeed;uniform float time;varying vec2 vUv;varying float seed;
   void main(){vUv=uv;seed=cloudSeed;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*cloudSize;center.x+=sin(time*.055+seed)*.5;gl_Position=projectionMatrix*center;}`,
   fragmentShader:`uniform float time;varying vec2 vUv;varying float seed;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec2 p=vUv*vec2(4.,2.)+vec2(time*.025+seed,seed);float n=noise(p)*.6+noise(p*2.1)*.27+noise(p*4.2)*.13;vec2 q=(vUv-.5)*2.;float edge=pow(max(0.,1.-dot(q,q)),2.);float alpha=edge*smoothstep(.2,.85,n)*.085;gl_FragColor=vec4(mix(vec3(.14,.19,.25),vec3(.32,.37,.40),n),alpha);}`});
  this.mist=new THREE.InstancedMesh(geometry,material,count);this.mist.frustumCulled=false;this.mist.userData.noAO=true;
  const d=new THREE.Object3D();
  for(let i=0;i<count;i++){const side=i%4,u=Math.floor(i/4)/5;d.position.set(side===0?-4:side===1?34:-4+38*u,-1.3+(i%3)*.25,side===2?-4:side===3?26:-4+30*u);d.updateMatrix();this.mist.setMatrixAt(i,d.matrix);}
  this.mist.instanceMatrix.needsUpdate=true;scene.add(this.mist);
  this.telemetry=new THREE.Group();this.telemetry.name='ambient-edge-telemetry';
  const tags=['443 / TLS','22 / SSH','3389 / RDP','8080 / HTTP','53 / DNS','445 / SMB','01 / EDGE','03 / EDGE'];
  for(let i=0;i<tags.length;i++){const s=textSprite(tags[i],{size:22,mono:true,color:'#76909e',scale:.65});s.material.opacity=.1;s.material.depthTest=true;s.position.set(i<4?-4.8:34,-1.8,1+(i%4)*6);this.telemetry.add(s);}
  scene.add(this.telemetry);
 }
 update(time){this.mist.material.uniforms.time.value=time;this.telemetry.children.forEach((s,i)=>s.material.opacity=.065+Math.sin(time*.15+i)*.02);}
}
