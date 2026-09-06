import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{const p=await b.newPage();await p.setViewport({width:1440,height:1000});p.on('console',m=>m.type()==='error'&&console.log(m.text()));await p.goto('http://127.0.0.1:5178/',{waitUntil:'networkidle0'});await p.click('[data-action=start][data-id=midcap]');await p.evaluate(()=>{const a=__app;a.audio.enabled=false;a.ui.closeCall();a.ui.callQueue=[];a.paused=true;a.ui.activityVisible=false;a.ui.update();a.rig.goTo({x:13,z:11,dist:40,pitch:.73,yaw:-.43});});await new Promise(r=>setTimeout(r,1000));
console.log(await p.evaluate(()=>({reflectionVisible:__app.campus.reflector.visible,sh:__app.campus.reflector.material.fragmentShader,cloud:__app.campus.atmosphere.mist.material.uniforms.light.value})));
await p.screenshot({path:'artifacts/storm-v21/diagnostic-normal.png'});
await p.evaluate(()=>__app.campus.atmosphere.mist.visible=false);await new Promise(r=>setTimeout(r,100));await p.screenshot({path:'artifacts/storm-v21/diagnostic-no-cloud.png'});
await p.evaluate(()=>{const m=__app.campus.reflector.material;m.fragmentShader=m.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor=vec4(1.,0.,0.,1.);\n#include <tonemapping_fragment>');m.needsUpdate=true;});await new Promise(r=>setTimeout(r,100));await p.screenshot({path:'artifacts/storm-v21/diagnostic-reflection-surface.png'});
}finally{await b.close();}
