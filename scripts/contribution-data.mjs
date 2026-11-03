const API = 'https://api.github.com';

export async function github(path, body) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GH_TOKEN or GITHUB_TOKEN to read GitHub statistics.');
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'u7-profile-contributions',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`GitHub ${path.split('?')[0]} returned HTTP ${response.status}.`);
  const result = await response.json();
  if (result.errors) throw new Error(`GitHub GraphQL: ${result.errors.map(e => e.message).join('; ')}`);
  return result;
}

export async function collectPullRequests(login) {
  const query = `is:pr author:${login} is:public -user:${login}`;
  const items = new Map();
  let expected = 0;
  for (let page = 1; page === 1 || items.size < expected; page++) {
    const params = new URLSearchParams({ q: query, sort: 'created', order: 'asc', per_page: '100', page: String(page) });
    const result = await github(`/search/issues?${params}`);
    // 不把搜索截断或同步期间的缺页误显示成贡献减少。
    if (result.incomplete_results || result.total_count > 1000) {
      throw new Error('PR search is incomplete; keep the previous dashboard and partition the query.');
    }
    if (page > 1 && result.total_count !== expected) throw new Error('PR count changed during pagination; retry later.');
    expected = result.total_count;
    for (const item of result.items) items.set(item.id, item);
    if (!result.items.length && items.size < expected) throw new Error('PR pagination ended before all results arrived.');
    if (page >= 10 && items.size < expected) throw new Error('PR pagination did not converge.');
  }
  if (items.size !== expected) throw new Error('PR search totals do not match the unique results.');
  return summarizePullRequests([...items.values()], login);
}

export function summarizePullRequests(items, login) {
  const repositories = new Map();
  for (const item of items) {
    const repo = item.repository_url.replace(`${API}/repos/`, '');
    if (!item.pull_request || repo.toLowerCase().startsWith(`${login.toLowerCase()}/`)) {
      throw new Error('Unexpected item in external PR search.');
    }
    const row = repositories.get(repo) || { name: repo, total: 0, merged: 0, open: 0, closed: 0, draft: 0 };
    const state = item.pull_request.merged_at ? 'merged' : item.state;
    if (!['merged', 'open', 'closed'].includes(state)) throw new Error('Unknown PR state.');
    row.total++;
    row[state]++;
    if (state === 'open' && item.draft) row.draft++;
    repositories.set(repo, row);
  }
  const rows = [...repositories.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const totals = Object.fromEntries(['total', 'merged', 'open', 'closed', 'draft'].map(key => [key, rows.reduce((n, r) => n + r[key], 0)]));
  return { ...totals, projects: rows.length, repositories: rows };
}

function monthRanges(createdAt, now) {
  const ranges = [];
  let start = new Date(Date.UTC(new Date(createdAt).getUTCFullYear(), new Date(createdAt).getUTCMonth(), 1));
  while (start <= now) {
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const end = new Date(Math.min(next.getTime() - 1000, now.getTime()));
    ranges.push({ month: start.toISOString().slice(0, 7), from: start.toISOString(), to: end.toISOString() });
    start = next;
  }
  return ranges;
}

export function publicCommitCount(collection) {
  const repositories = collection.commitContributionsByRepository;
  // 月粒度最多 31 个日贡献节点；显式检查两层上限，拒绝悄悄少算。
  if (collection.totalRepositoriesWithContributedCommits > repositories.length) {
    throw new Error('Commit repository list was truncated; use smaller date windows.');
  }
  let count = 0;
  for (const row of repositories) {
    if (row.repository.isPrivate !== false) continue;
    if (row.contributions.pageInfo.hasNextPage) throw new Error('Commit contribution days were truncated.');
    for (const node of row.contributions.nodes) {
      if (!Number.isInteger(node.commitCount) || node.commitCount < 0) throw new Error('Invalid commit count.');
      count += node.commitCount;
    }
  }
  return count;
}

export async function collectCommits(login, now) {
  const profile = await github('/graphql', { query: `query($login: String!) { user(login: $login) { createdAt } }`, variables: { login } });
  if (!profile.data.user) throw new Error('GitHub user was not found.');
  const ranges = monthRanges(profile.data.user.createdAt, now);
  const months = [];
  // 分批别名查询，避免一次请求遍历多年贡献触发 GraphQL 资源上限。
  for (let offset = 0; offset < ranges.length; offset += 6) {
    const batch = ranges.slice(offset, offset + 6);
    const fields = batch.map((range, i) => `m${i}: contributionsCollection(from: "${range.from}", to: "${range.to}") {
      totalRepositoriesWithContributedCommits
      commitContributionsByRepository(maxRepositories: 100) {
        repository { isPrivate }
        contributions(first: 100) { nodes { commitCount } pageInfo { hasNextPage } }
      }
    }`).join('\n');
    const result = await github('/graphql', { query: `query($login: String!) { user(login: $login) { ${fields} } }`, variables: { login } });
    batch.forEach((range, i) => months.push({ month: range.month, count: publicCommitCount(result.data.user[`m${i}`]) }));
    console.log(`Collected public commit months ${offset + 1}–${offset + batch.length}/${ranges.length}`);
  }
  const year = now.getUTCFullYear();
  const thisYear = months.filter(row => row.month.startsWith(`${year}-`));
  return { total: months.reduce((n, m) => n + m.count, 0), year, yearTotal: thisYear.reduce((n, m) => n + m.count, 0), since: ranges[0].month, months };
}
