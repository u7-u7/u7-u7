const THEMES = {
  light: { text: '#24292f', muted: '#656d76', line: '#d8dee4', accent: '#6e5ab3', faint: '#eaeef2' },
  dark: { text: '#e6edf3', muted: '#8b949e', line: '#30363d', accent: '#b2a1e8', faint: '#30363d' },
};

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
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans CJK SC,Microsoft YaHei,sans-serif">
  ${text(mobile ? 18 : 16, 30, summary, 16, t.text, 'font-weight="600"')}
  ${line(mobile ? 18 : 16, 48, width - (mobile ? 18 : 16), 48, t.line)}
  ${content}
  </g></svg>\n`;
}
