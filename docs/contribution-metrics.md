# 贡献看板统计口径

看板只展示公开数据，按北京时间每天 10:37 更新，也可在 Actions 手动运行 **Update contribution dashboard**。

## Pull requests

统计作者为 `u7-u7`、目标仓库公开且不属于 `u7-u7` 的历史 PR。创建数包括合并、仍开放和关闭未合并；Open 包含 Draft。一个 PR 只计入一种状态。项目数按目标仓库去重。

- [全部对外公开 PR](https://github.com/pulls?q=is%3Apr+author%3Au7-u7+is%3Apublic+-user%3Au7-u7)
- [已合并对外公开 PR](https://github.com/pulls?q=is%3Apr+author%3Au7-u7+is%3Apublic+-user%3Au7-u7+is%3Amerged)

## Commits

自账号创建月份起逐月读取 GitHub GraphQL `contributionsCollection.commitContributionsByRepository`，过滤 `repository.isPrivate === false`，累计每日节点的 `commitCount`。总数覆盖自己的和其他人的公开仓库；月图展示本日历年。PR、Issue、Review 不计入 commit。

采用 [GitHub 贡献图规则](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference#contribution-criteria-for-commits)：需关联账号邮箱、位于独立仓库的默认分支或 gh-pages 等符合条件的提交。它不是本地所有分支的 git log 总数，也不保证包括 fork 上尚未进入上游的提交。GitHub 的归属、索引和时区处理可能导致延迟或与仓库日志不同。

## 数据与更新

- [聚合数据](../assets/contributions/data.json)保留每月 commit 数、上游项目 PR 分布与更新时间。
- 不保存私有仓库详情、PR 正文或访问令牌；统计始终显式过滤私有仓库。
- 脚本检查搜索完整性、分页总数及 GraphQL 截断。请求失败或结果不完整时工作流失败，保留上一次有效图表。
- 当前 PR 搜索完整读取上限为 1000，超过后需按创建日期拆分查询，脚本会报错而不会展示截断结果。
- 生成图提交由 `github-actions[bot]` 完成，不算作 u7 的 commit。

本地刷新：设置 `GH_TOKEN` 或 `GITHUB_TOKEN`，运行 `node scripts/generate-contributions.mjs`。无第三方运行时依赖。
