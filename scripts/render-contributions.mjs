const THEMES = {
  light: { bg: '#f8fafc', panel: '#ffffff', border: '#e2e8f0', text: '#162238', muted: '#64748b', faint: '#edf2f7', purple: '#7952d5', cyan: '#008aab', gray: '#a4adbd', glow: '#ede9fe' },
  dark: { bg: '#0d1423', panel: '#141f32', border: '#26344d', text: '#edf3ff', muted: '#94a7c3', faint: '#22304a', purple: '#ad8bfa', cyan: '#50c8e5', gray: '#53627c', glow: '#282044' },
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const number = value => value.toLocaleString('en-US');

function text(x, y, value, size, fill, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
}

function rect(x, y, width, height, fill, radius = 0, extra = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" ${extra}/>`;
}

function metricCards(data, t, mobile = false) {
  const metrics = [
    ['MERGED PRs', data.prs.merged, '已被上游合并', t.purple],
    ['PROJECTS', data.prs.projects, '参与贡献的上游项目', t.cyan],
  ];
  return metrics.map(([label, value, detail, color], i) => {
    const x = (mobile ? 16 : 32) + i * (mobile ? 228 : 456);
    const y = 0;
    return rect(x, 108 + y, mobile ? 212 : 440, 126, t.panel, 14, `stroke="${t.border}"`) +
      text(x + 18, 136 + y, label, 12, t.muted, 'font-weight="600" letter-spacing="1"') +
      text(x + 18, 181 + y, number(value), 38, color, 'font-weight="750"') + text(x + 18, 212 + y, detail, 12, t.muted);
  }).join('');
}

function statusBar(prs, t) {
  const segments = [['merged', t.purple], ['open', t.cyan], ['closed', t.gray]];
  let x = 32;
  const bars = segments.map(([key, color]) => {
    const width = prs.total ? prs[key] / prs.total * 896 : 0;
    const bar = rect(x, 288, width, 10, color);
    x += width;
    return bar;
  }).join('');
  return text(32, 270, 'PR STATUS', 12, t.muted, 'font-weight="600" letter-spacing="1.3"') +
    rect(32, 288, 896, 10, t.faint, 5) + `<g clip-path="url(#status-clip)">${bars}</g>` +
    text(32, 324, `● ${prs.merged} 已合并`, 13, t.purple) +
    text(210, 324, `● ${prs.open} 待合并（含 ${prs.draft} 草稿）`, 13, t.cyan) +
    text(540, 324, `● ${prs.closed} 已关闭未合并`, 13, t.muted);
}

function projectChart(prs, t) {
  const rows = prs.repositories.slice(0, 6);
  const max = Math.max(1, ...rows.map(row => row.total));
  const chart = rows.map((row, i) => {
    const y = 425 + i * 49;
    const label = row.name.split('/').pop();
    let x = 52;
    const bars = ['merged', 'open', 'closed'].map((state, index) => {
      const width = row[state] / max * 330;
      const svg = rect(x, y + 11, width, 8, [t.purple, t.cyan, t.gray][index], 0);
      x += width;
      return svg;
    }).join('');
    return text(52, y, label, 14, t.text, 'font-weight="550"') +
      text(430, y, `${row.merged} / ${row.total}`, 13, t.muted, 'text-anchor="end"') +
      rect(52, y + 11, 378, 8, t.faint, 4) + bars;
  }).join('');
  return rect(32, 352, 420, 370, t.panel, 14, `stroke="${t.border}"`) +
    text(52, 383, '贡献项目', 17, t.text, 'font-weight="650"') +
    text(430, 382, '已合并 / PR 总数', 11, t.muted, 'text-anchor="end"') + chart +
    text(52, 704, `按 PR 总数展示前 ${rows.length} 个 · 共 ${prs.projects} 个项目`, 11, t.muted);
}

function commitChart(commits, t) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${commits.year}-${String(i + 1).padStart(2, '0')}`;
    return commits.months.find(row => row.month === key) || { month: key, count: null };
  });
  const max = Math.max(1, ...months.map(row => row.count || 0));
  const bars = months.map((row, i) => {
    const x = 500 + i * 34;
    const height = row.count === null ? 0 : row.count / max * 164;
    return (height ? rect(x, 647 - height, 19, height, t.purple, 4) : '') +
      text(x + 9.5, row.count ? 638 - height : 638, row.count === null ? '–' : row.count, 10, t.muted, 'text-anchor="middle"') +
      text(x + 9.5, 671, String(i + 1).padStart(2, '0'), 10, t.muted, 'text-anchor="middle"');
  }).join('');
  return rect(468, 352, 460, 370, t.panel, 14, `stroke="${t.border}"`) +
    text(488, 383, `${commits.year} · 每月公开 Commits`, 17, t.text, 'font-weight="650"') +
    text(488, 429, number(commits.yearTotal), 32, t.purple, 'font-weight="700"') +
    `<path d="M500 647H906" stroke="${t.border}"/>` + bars;
}

export function renderDashboard(data, theme, mobile = false) {
  const t = THEMES[theme];
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.updatedAt));
  if (mobile) return renderMobile(data, t, date);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="740" viewBox="0 0 960 740" role="img" aria-labelledby="title desc">
  <title id="title">u7 的公开开源贡献数据</title>
  <desc id="desc">已有 ${data.prs.merged} 个 PR 已合并，覆盖 ${data.prs.projects} 个项目。${data.commits.year} 年公开 commit 贡献 ${data.commits.yearTotal} 次。</desc>
  <defs><clipPath id="status-clip"><rect x="32" y="288" width="896" height="10" rx="5"/></clipPath></defs>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans CJK SC,Microsoft YaHei,sans-serif">
  ${rect(0.5, 0.5, 959, 739, t.bg, 22, `stroke="${t.border}"`)}
  ${rect(32, 28, 4, 48, t.purple, 2)}
  ${text(50, 48, 'u7 / OPEN SOURCE', 13, t.purple, 'font-weight="700" letter-spacing="2"')}
  ${text(928, 47, 'PUBLIC DATA ONLY', 10, t.muted, 'text-anchor="end" letter-spacing="1.3"')}
  ${text(928, 72, `${date} CST`, 11, t.muted, 'text-anchor="end"')}
  ${metricCards(data, t)}${statusBar(data.prs, t)}${projectChart(data.prs, t)}${commitChart(data.commits, t)}
  </g>
</svg>\n`;
}

function renderMobile(data, t, date) {
  const prs = data.prs;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="1142" viewBox="0 0 480 1142" role="img" aria-labelledby="title desc">
  <title id="title">u7 的公开开源贡献数据</title>
  <desc id="desc">已合并 ${prs.merged} 个 PR，参与 ${prs.projects} 个项目。</desc>
  <g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans CJK SC,Microsoft YaHei,sans-serif">
  ${rect(.5, .5, 479, 1141, t.bg, 18, `stroke="${t.border}"`)}
  ${text(20, 35, 'u7 / OPEN SOURCE', 13, t.purple, 'font-weight="700" letter-spacing="2"')}
  ${text(20, 88, `公开数据 · ${date} CST`, 11, t.muted)}
  ${metricCards(data, t, true)}
  ${text(20, 270, 'PR STATUS', 12, t.muted, 'font-weight="600" letter-spacing="1.3"')}
  ${rect(20, 286, 440, 10, t.faint, 5)}
  ${rect(20, 286, prs.total ? 440 * prs.merged / prs.total : 0, 10, t.purple, 0)}
  ${rect(20 + (prs.total ? 440 * prs.merged / prs.total : 0), 286, prs.total ? 440 * prs.open / prs.total : 0, 10, t.cyan, 0)}
  ${text(20, 323, `● ${prs.merged} 已合并`, 13, t.purple)}
  ${text(182, 323, `● ${prs.open} 待合并（含 ${prs.draft} 草稿）`, 13, t.cyan)}
  ${text(20, 349, `● ${prs.closed} 已关闭未合并`, 13, t.muted)}
  <g transform="translate(-6 20)">${projectChart(prs, t)}</g>
  <g transform="translate(-458 408)">${commitChart(data.commits, t)}</g>
  </g></svg>\n`;
}
