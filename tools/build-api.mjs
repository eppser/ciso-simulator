import {build} from 'esbuild';
await build({entryPoints:['server/edge.js'],outfile:'supabase/functions/ciso-scoreboard/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',minify:true});
console.log('Staging score-verification function built.');
