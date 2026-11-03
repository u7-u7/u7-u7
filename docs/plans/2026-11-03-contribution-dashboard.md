# GitHub 主页贡献数据看板

用户已选择直接嵌入 GitHub 主页的数据卡片、PR 图表和 commit 统计，沿用只展示公开内容的范围。

## 展示

- 用浅色 / 深色 SVG 看板替换长篇 PR 表格，保留 Featured Projects。
- 四项数据：公开 commit 贡献累计、对外 PR 总数、已合并 PR、参与的上游项目数。
- 图表：PR 状态、主要项目的 PR 分布、今年逐月 commit 贡献。
- 保留全部公开 PR、已合并 PR、统计口径的链接。

## 数据口径

- PR：GitHub Search 查询作者为 u7-u7、公开且仓库不属于 u7-u7 的 PR；Open 包含 Draft。
- Commit：从账号创建月份起，逐月汇总 GraphQL contribution collection 中明确公开的仓库，只累计 commitCount，不把 issue、PR、review 当成 commit。
- 采用 GitHub 贡献图的 commit 归属规则，不宣称覆盖未关联邮箱、fork 或未合入默认分支的提交。
- 不保存私有仓库名称、PR 正文、凭据或其他私有信息。

## 实现顺序

1. 独立脚本读取并校验分页完整性，生成聚合 JSON。
2. 生成无外部依赖的浅色和深色 SVG，嵌入 README。
3. GitHub Actions 每天刷新并提交生成结果，亦可手动运行；失败保留原图。
4. 核对真实 API 汇总、SVG 格式和浏览器显示，再发布并实际运行工作流。
