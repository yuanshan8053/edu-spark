import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomBytes, scryptSync } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
const file = '.env.local';
try { await access(file); console.error('.env.local 已存在，本脚本不会覆盖。更改配置请直接编辑该文件。'); process.exit(1); } catch(e) { if (e.code !== 'ENOENT') throw e; }
const rl = createInterface({ input: stdin, output: stdout });
console.log('仅配置本地开发。密码会在终端显示输入，请在私人设备操作。');
const password = await rl.question('设置老师密码（至少 12 个字符）：');
const origin = (await rl.question('本地地址（回车使用 http://localhost:3000）：')).trim() || 'http://localhost:3000';
rl.close();
if (password.length < 12) throw new Error('密码至少 12 个字符。');
const url = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('此脚本只配置本机地址。正式域名请后续在 Pages 配置。');
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
await writeFile(file, `DATA_BACKEND=local\nASSET_BACKEND=local\nLOCAL_ONLY=1\nLOCAL_DATA_DIR=.local-data\nAPP_ORIGIN=${url.origin}\nTEACHER_PASSWORD_HASH=scrypt:${salt}:${hash}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });
console.log('本地配置已生成。运行 npm run dev，然后打开上面配置的本地地址。');
