import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const first=Number(process.argv[2]),last=Number(process.argv[3]),kind=process.argv[4]||'game';
const base='artifacts/storm-v21',cards=[];
for(let i=first;i<=last;i++){const file=`${kind}-${String(i).padStart(2,'0')}.png`;cards.push(`<figure><img src="data:image/png;base64,${fs.readFileSync(base+'/'+file).toString('base64')}"><figcaption>${kind} · ${i}</figcaption></figure>`);}
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{const p=await b.newPage();await p.setViewport({width:1440,height:Math.ceil(cards.length/3)*370});await p.setContent(`<style>body{margin:0;background:#111;color:#eee;display:grid;grid-template-columns:repeat(3,1fr);font:14px sans-serif}figure{margin:5px}img{width:100%;height:335px;object-fit:contain}figcaption{padding:4px}</style>${cards.join('')}`);await p.screenshot({path:`${base}/${kind}-contact-${first}-${last}.png`,fullPage:true});}finally{await b.close();}
