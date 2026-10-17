// scan_reach.mjs 的 Node loader 注册（见该文件头注释）
import {register} from 'node:module';
register('./scan_loader.mjs',import.meta.url);
