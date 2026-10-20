# 口碑运营 · AI 评价处理与运营分析工作台

面向门店评价管理与口碑改善场景的交互原型，集中展示评价处理、回复辅助、分析报告和运营改善任务。项目采用静态前端实现，适合直接浏览业务流程与界面交互。

[在线体验](https://weibot-reputation-demo.pages.dev/) · [页面源码](index.html)

## 功能展示

| 业务场景 | 展示内容 |
| --- | --- |
| 运营概览 | 汇总展示口碑运营状态与待处理事项。 |
| 评价处理 | 浏览评价、查看详情并体验回复相关操作。 |
| 分析与报告 | 展示评价分析、报告解读和相关信息。 |
| 运营助手 | 通过对话界面呈现问题解读与改善任务。 |

页面使用演示数据和浏览器内状态。平台授权、评价同步、回复发布、生产账号权限及真实 AI 调用尚未连接外部服务。

## 技术实现

- 原生 HTML、CSS、JavaScript，无需安装依赖或执行构建。
- 静态资源随仓库提供，可通过普通 HTTP 服务预览。
- Cloudflare Pages 托管前端，运行时不依赖云服务器。
- Lucide 图标脚本固定在仓库内，第三方许可见[许可文件](assets/LUCIDE-LICENSE.txt)。

## 本地运行

```bash
git clone https://github.com/geyaovip/reputation-demo.git
cd reputation-demo
python3 -m http.server 8795 --bind 127.0.0.1
```

打开 [http://127.0.0.1:8795](http://127.0.0.1:8795)，或直接打开根目录的 `index.html`。

## 项目结构

| 路径 | 用途 |
| --- | --- |
| [`index.html`](index.html) | 页面、样式、业务展示逻辑与演示数据 |
| [`assets/`](assets/) | 本地图标和页面所需资源 |
| [`_headers`](_headers) | 静态托管响应头配置 |

## 部署说明

Cloudflare Pages 发布目录为仓库根目录，无需构建命令。当前项目使用 Direct Upload，GitHub 推送不会自动更新线上站点；修改页面后需使用已授权的 Wrangler 重新发布到 `weibot-reputation-demo` 项目。

本仓库用于产品流程与前端交互展示，真实评价数据和平台回复链路需在完成官方授权后独立接入与验收。
