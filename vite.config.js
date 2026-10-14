import {defineConfig} from 'vite';
export default defineConfig({base:'./',css:{postcss:{plugins:[]}},server:{host:'127.0.0.1',port:5176,proxy:{'/api':'http://127.0.0.1:8787'}}});
