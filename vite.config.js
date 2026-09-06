import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 1500, rollupOptions: {input:{game:'index.html',scoreboard:'scoreboard.html'},output:{manualChunks(id){if(id.includes('node_modules/three'))return 'three-runtime';if(id.includes('/data/day-'))return 'observations';}}} },
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
});
