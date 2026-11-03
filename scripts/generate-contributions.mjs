import { mkdir, writeFile } from 'node:fs/promises';
import { collectCommits, collectPullRequests } from './contribution-data.mjs';
import { renderDashboard } from './render-contributions.mjs';

const login = process.env.PROFILE_LOGIN || 'u7-u7';
if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(login)) throw new Error('Invalid GitHub login.');
const now = new Date();
const prs = await collectPullRequests(login);
const commits = await collectCommits(login, now);
const data = { schemaVersion: 1, login, updatedAt: now.toISOString(), prs, commits };
// 所有数据完整获取后才写文件；Actions 失败时不会提交部分结果。
const output = new URL('../assets/contributions/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('data.json', output), `${JSON.stringify(data, null, 2)}\n`);
for (const theme of ['light', 'dark']) {
  await writeFile(new URL(`dashboard-merged-${theme}.svg`, output), renderDashboard(data, theme));
  await writeFile(new URL(`dashboard-merged-${theme}-mobile.svg`, output), renderDashboard(data, theme, true));
}
console.log(JSON.stringify({ publicCommits: commits.total, yearCommits: commits.yearTotal, externalPRs: prs.total, mergedPRs: prs.merged, projects: prs.projects }));
