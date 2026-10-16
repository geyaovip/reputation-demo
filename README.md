# 口碑运营 Demo

沈知言 AI 口碑运营应用的静态演示站。打开 `index.html` 即可浏览；部署到 Cloudflare Pages 时，发布目录为仓库根目录，无需构建命令或云服务器。

线上地址：https://weibot-reputation-demo.pages.dev/

页面使用演示数据和浏览器内状态。平台授权、评价同步、回复发布、账号权限和 AI 调用尚未连接真实服务。

本发布包从相邻的 `app-demo/口碑运营专家demo.html` 整理，只包含网页与所需资源。Lucide 图标脚本固定在 `assets/lucide.min.js`，许可见 `assets/LUCIDE-LICENSE.txt`。

当前 Cloudflare Pages 项目使用 Direct Upload。修改并推送 GitHub 后，需通过 Wrangler 将静态文件重新发布到 `weibot-reputation-demo` 项目；GitHub 推送本身不会自动发布。
