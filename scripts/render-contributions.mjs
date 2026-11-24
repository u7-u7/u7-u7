const THEMES = {
  light: { background: '#fff', text: '#24292f', muted: '#656d76', line: '#d8dee4', accent: '#6e5ab3', faint: '#eaeef2' },
  dark: { background: '#161b22', text: '#e6edf3', muted: '#8b949e', line: '#30363d', accent: '#b2a1e8', faint: '#30363d' },
};

const FONT_FAMILY = '-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans CJK SC,Microsoft YaHei,sans-serif';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const number = value => value.toLocaleString('en-US');
const text = (x, y, value, size, fill, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
const line = (x1, y1, x2, y2, color) => `<path d="M${x1} ${y1}H${x2}" stroke="${color}"/>`;

function projects(prs) {
  return prs.repositories.filter(row => row.merged > 0)
    .sort((a, b) => b.merged - a.merged || a.name.localeCompare(b.name));
}

function projectList(rows, t, x, y, width) {
  const shown = rows.slice(0, 6);
  return text(x, y, '已合并的项目', 13, t.muted) + shown.map((row, i) => {
    const baseline = y + 30 + i * 25;
    return text(x, baseline, row.name, 14, t.text) +
      text(x + width, baseline, number(row.merged), 14, t.text, 'text-anchor="end"') +
      line(x, baseline + 10, x + width, baseline + 10, t.faint);
  }).join('');
}

function monthlyChart(commits, t, x, y, width) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${commits.year}-${String(i + 1).padStart(2, '0')}`;
    return commits.months.find(row => row.month === key) || { count: null };
  });
  const max = Math.max(1, ...months.map(row => row.count || 0));
  const step = width / 12;
  const barWidth = Math.min(15, step * 0.46);
  const bars = months.map((row, i) => {
    const height = (row.count || 0) / max * 75;
    const barX = x + i * step + (step - barWidth) / 2;
    return (height ? `<rect x="${barX}" y="${y + 112 - height}" width="${barWidth}" height="${height}" rx="2" fill="${t.accent}"/>` : '') +
      text(x + i * step + step / 2, y + 132, String(i + 1), 10, t.muted, 'text-anchor="middle"');
  }).join('');
  return text(x, y, `${commits.year} 年提交`, 13, t.muted) +
    text(x + width, y, number(commits.yearTotal), 13, t.text, 'text-anchor="end"') +
    line(x, y + 112, x + width, y + 112, t.line) + bars;
}

export function renderDashboard(data, theme, mobile = false) {
  const t = THEMES[theme];
  const rows = projects(data.prs);
  const width = mobile ? 480 : 880;
  const height = mobile ? 425 : 265;
  const summary = `${number(data.prs.merged)} 个已合并 PR · ${rows.length} 个项目`;
  const content = mobile
    ? projectList(rows, t, 18, 92, 444) + monthlyChart(data.commits, t, 18, 277, 444)
    : projectList(rows, t, 16, 88, 390) + monthlyChart(data.commits, t, 460, 88, 404);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">开源贡献</title>
  <desc id="desc">${escape(summary)}。${data.commits.year} 年提交 ${data.commits.yearTotal} 次。</desc>
  <g font-family="${FONT_FAMILY}">
  ${text(mobile ? 18 : 16, 30, summary, 16, t.text, 'font-weight="600"')}
  ${line(mobile ? 18 : 16, 48, width - (mobile ? 18 : 16), 48, t.line)}
  ${content}
  </g></svg>\n`;
}

function dailyDots(days, theme, left, right) {
  return days.map(({ day, count }, index) => {
    const x = left + index * (right - left) / (days.length - 1);
    const radius = count ? Math.min(6.5, 2.7 + Math.sqrt(count)) : 1.65;
    return `<circle cx="${x.toFixed(2)}" cy="143" r="${radius}" fill="${count ? theme.accent : theme.line}"><title>${day} · ${count} 个合并</title></circle>`;
  }).join('\n  ');
}

export function renderMergedPullRequests(data, theme, mobile = false) {
  const t = THEMES[theme];
  const width = mobile ? 440 : 880;
  const height = 183;
  const left = 24;
  const right = width - left;
  const days = data.prs.recentMergedByDay;
  const recent = days.reduce((total, day) => total + day.count, 0);
  const summary = `公开上游 ${number(data.prs.merged)} 个 PR 已合并，近 30 天合并 ${number(recent)} 个。按北京时间统计。`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">已合并的公开 Pull Requests</title>
  <desc id="desc">${escape(summary)}</desc>
  <rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="16" fill="${t.background}" stroke="${t.line}"/>
  <g font-family="${FONT_FAMILY}">
  <path d="M25 27v4m0 4v4m8-13v3c0 3-3 4-6 4" fill="none" stroke="${t.accent}" stroke-width="1.5"/>
  <g fill="${t.accent}"><circle cx="25" cy="25" r="2"/><circle cx="25" cy="40" r="2"/><circle cx="33" cy="25" r="2"/></g>
  ${text(44, 37, 'MERGED PULL REQUESTS', 12, t.accent, 'font-weight="700" letter-spacing="1.2"')}
  ${text(right, 37, `@${data.login}`, 12, t.muted, 'text-anchor="end"')}
  ${line(left, 51, right, 51, t.line)}
  <text x="${left}" y="111" fill="${t.text}" font-weight="700"><tspan font-size="49">${number(data.prs.merged)}</tspan><tspan dx="10" font-size="17">个 PR 已合并</tspan></text>
  ${text(right, 77, '近 30 天', 12, t.muted, 'text-anchor="end"')}
  ${text(right, 109, `+${number(recent)}`, 26, t.accent, 'text-anchor="end" font-weight="700"')}
  ${dailyDots(days, t, left + 6, right - 6)}
  ${text(left, 168, days[0].day.slice(5), 11, t.muted)}
  ${text(right, 168, days.at(-1).day.slice(5), 11, t.muted, 'text-anchor="end"')}
  </g></svg>\n`;
}
