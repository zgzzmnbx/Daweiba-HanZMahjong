import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'apps/web',plugins:[react()],build:{outDir:'../../dist/web',emptyOutDir:true},server:{port:5173,proxy:{'/api':'http://127.0.0.1:3001','/socket.io':{target:'http://127.0.0.1:3001',ws:true}}}});
