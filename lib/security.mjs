import { randomUUID, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
export class AppError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function checkConfig() {
  const production = process.env.NODE_ENV === 'production';
  const cloud = process.env.DATA_BACKEND === 'iga';
  if (cloud && !['tos','blob'].includes(process.env.ASSET_BACKEND)) throw new AppError(503, '云端题册尚未配置持久图片存储。');
  if (production && !cloud && process.env.LOCAL_ONLY !== '1') throw new AppError(503, '正式运行必须配置云端存储。');
}
export function sameOrigin(req) {
  const expected = process.env.APP_ORIGIN;
  if (!expected) throw new AppError(503, '尚未配置应用地址。');
  const origin = req.headers.get('origin');
  let allowed = origin === new URL(expected).origin;
  if (!allowed && origin && process.env.APP_PREVIEW_HOST_PREFIX) {
    try {
      const url = new URL(origin), prefix = process.env.APP_PREVIEW_HOST_PREFIX;
      const suffixes = ['.preview.iga-pages.bytedance.net', '.preview.iga-pages.com'];
      allowed = url.origin === origin && url.protocol === 'https:' && !url.port &&
        /^[a-z0-9-]+-$/.test(prefix) && suffixes.some(suffix =>
          url.hostname.startsWith(prefix) && url.hostname.endsWith(suffix) &&
          /^[a-z0-9]+$/.test(url.hostname.slice(prefix.length, -suffix.length)));
    } catch {}
  }
  if (!allowed) throw new AppError(403, '请求来源不允许。请从应用页面重试。');
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new AppError(403, '请求来源不允许。');
}
function secret() { const s = process.env.SESSION_SECRET; if (!s || s.length < 48) throw new AppError(503, '老师登录尚未配置。'); return s; }
function sign(value) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function equal(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function verifyPassword(value) {
  if (process.env.TEACHER_DISABLED === '1') throw new AppError(503, '本次测试仅开放家庭端。');
  const stored = process.env.TEACHER_PASSWORD_HASH || '';
  const [, salt, expected] = stored.split(':');
  if (!/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(stored)) throw new AppError(503, '老师密码尚未配置。');
  if (typeof value !== 'string' || value.length > 256) return false;
  return equal(scryptSync(value, salt, 64).toString('hex'), expected);
}
export function newSession() {
  const body = Buffer.from(JSON.stringify({ role: 'teacher', nonce: randomUUID(), expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return body + '.' + sign(body);
}
export function isTeacher(req) {
  if (process.env.TEACHER_DISABLED === '1') return false;
  try {
    const cookie = req.headers.get('cookie') || '';
    const value = cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('workbook_teacher='))?.slice(17);
    if (!value || value.length > 1000) return false;
    const [body, signature, extra] = value.split('.');
    if (extra || !signature || !equal(signature, sign(body))) return false;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    return data.role === 'teacher' && data.expires > Date.now();
  } catch(e) { return false; }
}
export function requireTeacher(req) { if (!isTeacher(req)) throw new AppError(401, '请先登录老师管理入口。'); }
export function sessionCookie(value, clear=false) {
  const secure = process.env.APP_ORIGIN?.startsWith('https://');
  return `workbook_teacher=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear?0:28800}${secure?'; Secure':''}`;
}
// 本地实例限流。生产多实例限流应由网关进一步执行。
const failures = new Map();
export function checkLoginRate(req) {
  const key = process.env.NODE_ENV === 'development' ? 'local' : (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown');
  const now = Date.now();
  if (failures.size > 5000) for (const [k,v] of failures) if (now-v.start>15*60*1000) failures.delete(k);
  const entry = failures.get(key);
  if (entry && now-entry.start<15*60*1000 && entry.count>=8) throw new AppError(429, '登录尝试过多，请稍后再试。');
  return { fail() { const old = failures.get(key); failures.set(key, old&&now-old.start<15*60*1000?{...old,count:old.count+1}:{start:now,count:1}); }, success() { failures.delete(key); } };
}
export async function jsonInput(req, limit=256*1024) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new AppError(415,'请使用 JSON 请求。');
  const reader=req.body?.getReader(); if (!reader) throw new AppError(400,'请求内容为空。');
  const chunks=[]; let size=0;
  while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>limit){await reader.cancel();throw new AppError(413,'请求内容过大。');}chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch(e) { throw new AppError(400,'请求内容格式不正确。'); }
}
export function validID(id) { if (!/^[A-Za-z0-9_-]{1,80}$/.test(id||'')) throw new AppError(400,'记录标识不正确。'); return id; }
export function dateKey(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError(400,'请选择有效日期。');
  const d=new Date(date+'T00:00:00Z'); if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)throw new AppError(400,'请选择有效日期。'); return date;
}
export function today() { const d=new Date();const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-'); }
export function title(value) { if(typeof value!=='string'||!value.trim()||value.trim().length>60)throw new AppError(400,'名称需为 1 至 60 个字符。');return value.trim(); }
