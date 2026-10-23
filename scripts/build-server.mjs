import {build} from 'esbuild';
await build({entryPoints:['apps/server/main.ts'],outfile:'dist/server/main.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external',sourcemap:true});
