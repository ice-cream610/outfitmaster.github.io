# 发布可分享的 Demo 链接

本项目已提供 `.github/workflows/deploy-pages.yml`，推送到 `main` 后自动安装依赖、测试、构建，并仅将 `dist/` 发布到 GitHub Pages。原 `ci.yml` 保留用于代码检查。

## 第一次设置

1. 将项目源码上传到 GitHub 仓库。仓库根目录直接包含 `package.json`、`package-lock.json`、`.nvmrc` 和 `src/`。默认分支应为 `main`。
2. 免费账户使用公开仓库；如果需要保留私有源码，先确认账户方案支持私有仓库 Pages，或使用其他托管服务。
3. 在仓库打开 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。不需要选择 Jekyll 模板，不需要添加模型密钥。
4. 如果尚未上传发布文件，打开 **Code → Add file → Create new file**，文件名填写 `.github/workflows/deploy-pages.yml`，粘贴本地同名文件的全部内容。点击 **Commit changes**，提交到 `main`。
5. 如果发布文件已经存在，打开 **Actions → Deploy demo to GitHub Pages → Run workflow**，选择 `main`，点击运行按钮。
6. 等待 `build` 和 `deploy` 两项均成功。在 **Settings → Pages** 复制站点地址，通常为 `https://你的用户名.github.io/仓库名/`。

此后将更新推送到 `main` 会自动重新发布。访问者无需安装 Node.js，也不需要保持开发电脑开机。

## 当前项目的发布范围

当前代码含精选穿搭 Demo 和后端实验模块。Pages 只提供静态网页：精选效果、浏览器本地收藏和模拟购买可用；服务端模型、实时生图、SQLite 和跨设备同步需要另行部署后端。不要把 `.env`、模型密钥或 `.runtime/` 上传到仓库或 Pages。

## 常见情况

- 找不到发布流程：检查文件路径是否完全正确，以及文件是否已提交到 `main`。
- 提示 Pages 未启用或 `Not Found`：先完成 Settings 中的 Pages 设置，再到失败的运行记录选择 **Re-run all jobs**。
- 测试或构建失败：打开 Actions 中红色步骤查看日志，修复后重新推送。此时不会发布新版本。
- 页面 404：以 Settings → Pages 显示的完整地址为准，包括仓库名路径；确认 deploy 已成功。
- 只看到源码：你打开的是仓库地址，需要打开 Pages 提供的站点地址。

参考：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
