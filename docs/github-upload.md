# 上传 GitHub 与后续部署

> 2026-10-14更新：当前项目已初始化Git并保留原前端基线，新增Agent MVP。首次推送只需设置远端并执行 `git push -u origin main`，不要重复执行下面历史步骤中的初始化。新功能、模型配置与验收见根目录README。`.runtime/`、`.qa/`和密钥已排除。

## 仓库内容

以本项目文件夹为仓库根目录：根目录应直接包含 `package.json`、`README.md`、`src/`、`public/` 和 `.github/`。不要把压缩包本身当作源码上传，也不要再套一层项目目录。

提交源码、原始演示素材、文档、测试和 `package-lock.json`。`node_modules/`、`dist/`、本地 `.env` 已由 `.gitignore` 排除。使用 Git 上传可自动应用这些排除规则；网页上传不会替你过滤文件。

## 首次上传

在 GitHub 创建空仓库，建议先设为 Private，不勾选生成 README、许可证或 .gitignore。在本项目目录打开终端，执行：

```sh
git init -b main
git add .
git status
git commit -m "Initial Outfit Master demo"
git remote add origin https://github.com/YOUR_USERNAME/outfit-master.git
git push -u origin main
```

把 `YOUR_USERNAME` 替换为自己的账户名；如果仓库名称不同，也要修改地址。第一次提交若提示身份未设置，执行 `git config user.name "你的名字"` 和 `git config user.email "你的 GitHub 提交邮箱"`，然后重新提交。推送时通过 Git 凭据管理器登录，不要将登录令牌写进代码或远程地址。

## 日常开发

每完成一个可验证的小功能，运行 `npm test` 和 `npm run build`，检查 `git diff`，再提交、推送。多人协作或较大修改使用功能分支和 Pull Request。

仓库包含 GitHub Actions 检查：推送到 `main` 或创建 Pull Request 时，使用 Node.js 24 安装锁定依赖、执行测试并构建。此流程只检查代码，不会自动公开站点。

## 部署参数

本项目是静态 React demo，可交付构建后的 `dist/`：

| 配置 | 值 |
| --- | --- |
| Node.js | 24 |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 项目根目录 | 仓库根目录 |
| 环境变量 | 当前不需要 |

构建使用自定义 esbuild 脚本，部署平台应使用以上命令。页面资源使用相对路径，可放在域名根路径或子目录。预览请使用 `npm run preview`，不要双击 HTML。

已补充 GitHub Pages 自动发布配置，设置步骤见 [在线 Demo 发布指南](github-pages.md)。下方纯前端边界描述属于最初 demo；当前后端实验功能与静态托管的区别以根目录 README 和发布指南为准。源码仓库私有并不代表部署后的网页私有，演示站点的访问权限需要单独设置。

## 当前边界

没有真实 AI、后端、账号或支付服务，数据在浏览器本地保存；清理浏览器数据或更换设备不会保留收藏。接入真实模型时，密钥应保存在服务端，不能放进前端代码或 `VITE_*` 环境变量。

素材来源见 `asset-provenance.md`。本次整理未添加开源许可证，仓库上传不等于授予他人开源使用权。
