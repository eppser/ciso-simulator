import {isMobileDevice,mobileNotice} from './mobile.js';
import './mobile.css';
if(isMobileDevice(navigator)){
 document.body.className='mobile-unsupported';
 document.body.innerHTML=mobileNotice();
}else{
 import('./campaign-main.js').catch(error=>{console.error('Game initialization failed',error);document.body.innerHTML='<main class="desktop-notice"><h1>Connection interrupted</h1><p>Reload this page to assemble your command desk.</p><button id="reload-game">Reload game</button></main>';document.querySelector('#reload-game').addEventListener('click',()=>location.reload());});
}
