import { resolve } from 'node:path';
import { createGameServer } from './server';
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.PUBLIC_ORIGIN)throw new Error('PUBLIC_ORIGIN is required');
const port=Number(process.env.PORT??3000),origin=process.env.PUBLIC_ORIGIN??`http://127.0.0.1:${port}`;
if(production&&new URL(origin).protocol!=='https:')throw new Error('Production PUBLIC_ORIGIN requires HTTPS');
const server=createGameServer({dbPath:process.env.DB_PATH??resolve('runtime/data/mahjong.sqlite'),publicOrigin:origin,production,staticDir:resolve(process.env.WEB_DIST??'dist/web')});
await server.listen(port,'127.0.0.1');console.log(`文字麻将 ready on 127.0.0.1:${port}`);
let stopping=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(stopping)return;stopping=true;void server.close().then(()=>process.exit(0));});
