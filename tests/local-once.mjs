import {spawn} from 'node:child_process';
import {randomBytes,scryptSync} from 'node:crypto';
import {mkdtemp,mkdir} from 'node:fs/promises';
const root='.local-data';await mkdir(root,{recursive:true});const dir=await mkdtemp(root+'/api-final-');
const password=randomBytes(24).toString('base64url'),salt=randomBytes(16).toString('hex');
const env={...process.env,DATA_BACKEND:'local',ASSET_BACKEND:'local',LOCAL_ONLY:'1',LOCAL_DATA_DIR:dir,APP_ORIGIN:'http://localhost:11981',SESSION_SECRET:randomBytes(48).toString('hex'),TEACHER_PASSWORD_HASH:`scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`,TEACHER_DISABLED:'0',TEST_TEACHER_PASSWORD:password,TEST_ORIGIN:'http://localhost:11981',NEXT_TELEMETRY_DISABLED:'1'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','11981'],{env,stdio:['ignore','inherit','inherit'],detached:true});
const stop=()=>{try{process.kill(-server.pid,'SIGTERM');}catch{}};
process.on('SIGTERM',()=>{stop();process.exit(1);});process.on('SIGINT',()=>{stop();process.exit(1);});
try{let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(env.TEST_ORIGIN+'/api/session');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('生产构建测试服务未就绪');
const tests=spawn(process.execPath,['tests/api.mjs'],{env,stdio:['ignore','inherit','inherit']});const code=await new Promise(r=>tests.on('exit',r));if(code!==0)throw new Error('API测试失败');console.log('最终生产构建 API 测试通过，仅写隔离本地数据。');}catch(e){console.error(e.message);process.exitCode=1;}finally{stop();}
