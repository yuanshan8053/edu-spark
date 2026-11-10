# IGA Pages 部署与维护

## 现有部署目标

- GitHub：`https://github.com/yuanshan8053/edu-spark`
- IGA Pages 项目名称：`companion-workbook`
- IGA Pages 项目标识：`i1q9mpnhx5`（项目定位信息，不是凭证）
- 项目类型：Pages；现有绑定没有 Agent 类型标记。
- 固定访问入口：`https://companion-workbook.microfish.top/`
- 框架：Next.js / Node.js；Node 至少 20.9，既有云端开发环境使用 Node 22。
- 数据：Data SDK 保存公共题册 JSON；Pages Blob 保存题图。

本仓库不包含线上 `.iga/project.json`、正式老师密码、密码哈希或会话密钥。更换电脑或对话后，重新关联现有项目，复用官方账号授权。不要从浏览器 Cookie 或聊天记录复制凭证。

## 1. 更新代码

```bash
git checkout main
git pull --ff-only origin main
npm ci
npm test
npm audit --audit=true --omit=dev --json
NEXT_TELEMETRY_DISABLED=1 npm run build
```

只在干净工作区切换分支；有用户未提交改动时先协商。需要修改时建立工作分支并通过 PR 合并。部署前记录最终提交 SHA。

## 2. 核对 CLI 与身份

使用官方 `@iga-pages/cli`，当前工作流要求版本至少 1.1.13。命令参数以安装版本的 `--help` 为准。

```bash
iga --version
node --version
VE_SKILL_ID=iga-pages/1.0.13 iga whoami
```

授权有效时直接复用。远程环境凭证过期时，使用官方 `iga login --remote`，由用户完成设备授权。不要把访问令牌发到聊天或写入 Git URL。

## 3. 关联现有项目

在仓库根目录执行：

```bash
VE_SKILL_ID=iga-pages/1.0.13 iga pages link --project i1q9mpnhx5 --yes
VE_SKILL_ID=iga-pages/1.0.13 iga pages list --project companion-workbook --json
VE_SKILL_ID=iga-pages/1.0.13 iga pages env list --format=json
```

关联结果应指向现有 `companion-workbook`。结果不一致时停止部署。`.iga/` 不提交 Git。

## 4. 环境变量

环境变量已在现有 Pages 项目配置。日常代码部署不重建老师凭证，不需要 `env pull`。`env list` 只展示键名。

- `DATA_BACKEND=iga`
- `ASSET_BACKEND=blob`
- `APP_ORIGIN=https://companion-workbook.microfish.top`
- `TEACHER_DISABLED=0`
- `NEXT_PUBLIC_TEACHER_DISABLED=0`
- `TEACHER_PASSWORD_HASH`：由用户设置的 scrypt 哈希，格式 `scrypt:盐:哈希`。
- `SESSION_SECRET`：至少48字符的随机会话密钥。
- `APP_PREVIEW_HOST_PREFIX`：现有项目预览前缀 `companion-workbo-i1q9mpnhx5-`，只允许该项目受支持的 HTTPS 预览域名。

密码或密钥需要新增、轮换时，由用户在可信环境操作。不得把正式值写入本文件、源码、终端日志或 PR。更换 `SESSION_SECRET` 会使旧老师会话失效。

固定域名变更时，同步更新 `APP_ORIGIN`。此前老师登录报“请求来源不允许”，原因是固定域名与旧预览来源配置不一致；通过更新配置和重新部署修复，未关闭来源检查。

环境变量变更在下一次部署生效。前端 `NEXT_PUBLIC_*` 开关需要重新构建。

## 5. 部署

用户明确授权后，在仓库根目录执行：

```bash
VE_SKILL_ID=iga-pages/1.0.13 iga pages deploy --logs
```

现有流程通过 CLI 上传源码；GitHub 推送或 PR 合并不会自动部署。不要在没有确认的情况下改成 GitHub 自动触发。

保存本次返回的部署 ID。不要用“最新部署”替代正在排查的具体部署。查询示例中的 `DEPLOYMENT_ID` 必须替换为真实结果：

```bash
VE_SKILL_ID=iga-pages/1.0.13 iga pages inspect DEPLOYMENT_ID --project companion-workbook --wait --timeout 25m --format json
VE_SKILL_ID=iga-pages/1.0.13 iga pages inspect DEPLOYMENT_ID --project companion-workbook --logs --format json
```

只有 `DeploySuccess` 才表示平台部署成功。超时返回仍可能显示 `Deploy`；命令退出码为0不能单独证明部署成功。结果未知时查询同一部署，不重复提交。确需另一次部署时，说明旧任务可能随后完成，并取得用户授权。

## 6. 上线验证

优先验证固定域名，而不是临时预览地址：

1. 首页和 `/api/session` 能正常访问，家庭端不要求应用登录。
2. 已发布题册和题图可读，草稿不向家庭公开。
3. 用户自行输入正式密码登录老师端，读取题册列表。
4. 受影响功能需验证真实输入、存储结果和重新进入后的状态。
5. 涉及线上写入时先确认测试范围；不随意新建、下架或删除现有题册。
6. 检查页面、画布、PNG 导出及本机恢复。不要要求用户清理网站数据。

部署成功与域名切换成功是不同状态。若固定域名仍指向旧版本，检查 Pages 域名绑定和发布目标，不伪造 Host、不猜测域名、不绕过平台保护。

预览链接可能含临时访问参数或要求平台验证，不能作为永久家庭入口。不要公开保存签名参数。固定域名不变时，本机数据来源保持不变；换域名不会自动迁移孩子档案和作答。

## 7. 慢构建与排障

历史两次构建中，安装约20分钟，后续构建约20秒、上传约5秒；同锁文件在本地隔离环境约7秒安装。关闭安装审计后仍耗时约20分钟，未证明审计是主因。尚未取得云端逐包耗时或 npm 调试日志，具体原因未确定。

仓库 `.npmrc` 使用公开 npm 源、有限下载等待，并关闭安装时自动审计。安全审计必须在部署前单独执行 `npm audit --audit=true`。这些参数没有证明能消除平台安装耗时，不能承诺部署时长。

- 安装失败：读取本次构建日志，核对锁文件下载源、网络可达性和实际慢请求。
- 服务启动或API失败：查询运行日志；不要用运行日志代替构建日志。
- 回滚：保留上一个已验收部署 ID，通过平台支持的发布/回滚操作恢复。操作前确认固定域名目标；不要删题册或重置数据库。

```bash
VE_SKILL_ID=iga-pages/1.0.13 iga pages logs DEPLOYMENT_ID --since 1h --limit 100 --json
```

## 8. 多对话交接

新对话先读本文件和 `AGENTS.md`，再核对 GitHub 最新提交、实际工作区和 Pages 身份。历史路径、登录态及部署结果都要重新确认。

GitHub公开源码不包含专属云端联调记录、临时老师设置服务和微信域名验证TXT。此前线上验证文件已单独部署；如果未来需要保留它，先核对当前申请的准确文件，不从旧截图或记忆猜值。

每次部署交接至少记录：提交 SHA、本次部署 ID、目标固定域名、成功/失败/未知状态、已验证路径和待验证项。只记录定位信息，不记录凭证或私人数据。
