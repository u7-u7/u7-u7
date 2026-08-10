# GitHub 个人主页设计

## 目标

为悠柒（u7）创建一个兼具视觉辨识度和工程可信度的 GitHub Profile README，突出 AI 工程化、Java 后端与全栈可视化实践。

## 已选方案

- 首屏用波浪渐变横幅、三枚定位徽章和打字机文字建立视觉节奏。
- 用仓库卡片与简短说明展示 `dev-skills`、`dynamic-thread-pool` 与旅游微服务前后端项目。
- 技术栈仅展示有仓库证据支撑的 Java、Spring Boot、Redis、Vue、Python、Docker 等能力。
- 仅保留 GitHub 数据卡和贡献蛇两种动态组件；前者直接读取公开 GitHub 数据，后者由仓库工作流每日生成，减少外部小组件依赖。

## 实现与验证

- `README.md` 承担所有公开个人介绍内容。
- `.github/workflows/generate-snake.yml` 每日生成浅色和深色贡献动画到 `output` 分支，也支持手动执行。
- 首次合并后需在 Actions 页面手动运行一次 **Generate contribution snake**，让动画产物立即可见。
