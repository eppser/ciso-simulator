import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['server/gateway.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',minify:true});
// Build output only: authoring backups are not runtime assets. Originals are preserved.
function prune(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())prune(path);else if(/\.blend\d*$/.test(entry.name))fs.unlinkSync(path);}}
prune('dist');
fs.writeFileSync('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
console.log('Release includes private API gateway, bounded API routes and no Blender backups.');
