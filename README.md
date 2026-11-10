# 陪伴题册 · edu-spark

老师维护公共题册，家庭与孩子在题图上手写。家庭无需应用账号；孩子档案、陪伴照片和作答保存在当前浏览器。

## 维护入口

继续维护前，请先阅读 [AGENTS.md](AGENTS.md) 和 [DEPLOYMENT.md](DEPLOYMENT.md)。现有应用使用 IGA Pages 的 `companion-workbook` 项目；固定入口为 `https://companion-workbook.microfish.top/`。GitHub 合并与 Pages 部署是独立操作，目前没有自动部署。

## 功能

- 老师登录后上传题图、排序、保存草稿、预览、发布和下架。
- 家庭查看今天的题与以前的题，在原图上书写。
- 画笔、橡皮、撤销、重做、缩放、移动及 PNG 导出。
- 多孩子本机档案隔离；重新练习保留旧记录。
- 最多三张本机陪伴照片，点击显示预设鼓励；不表示真人正在观看。

## 本地开发

需要 Node.js 20.9 或以上版本。

```bash
npm ci
npm run setup
npm run dev
```

`setup` 生成本地 `.env.local`，不覆盖已有配置。正式密码与密钥不要提交到 Git。

```bash
npm test
npm run build
```

## IGA Pages 部署

使用 Next.js、IGA Pages Data SDK 与 Pages Blob。Data 保存题册记录，Blob 保存题图；SDK 仅在服务端使用。

在自己的 Pages 项目关联工程，并配置环境变量：

- `DATA_BACKEND=iga`
- `ASSET_BACKEND=blob`
- `APP_ORIGIN`：实际固定 HTTPS 网址
- `TEACHER_PASSWORD_HASH`：scrypt 格式的老师密码哈希
- `SESSION_SECRET`：至少48字符的随机密钥

`TEACHER_DISABLED=1` 与 `NEXT_PUBLIC_TEACHER_DISABLED=1` 用于关闭老师端。启用老师管理时改为 `0`，重新部署。默认不配置预览域名前缀；仅在明确需要时设置 `APP_PREVIEW_HOST_PREFIX` 为自己的项目专属前缀。

```bash
iga pages link --project <自己的项目>
iga pages deploy
```

## 数据边界

公共题册面向持有链接的人，不应包含私人资料。家庭照片和作答不上传给老师。清理网站数据、换设备、换浏览器或更换域名后，本机记录不会自动迁移；重要练习请导出图片。

首版不提供自动判题、跨设备同步、自动读取微信群、老师收作业统计或跨标签页冲突协调。登录限流目前为单实例内存实现，多实例正式环境需配合网关限流。

仓库不含部署凭证、正式密码、云端记录、本机作答或临时配置服务。示例题图仅用于演示；其版权归原权利人所有，仓库不授予这些素材的额外使用权。
