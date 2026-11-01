// Builds assets/github-{dark,light}.svg from the GitHub GraphQL API: an
// isometric 3D contribution graph of the last year, then totals and streaks.
// Also writes docs/contributions.json for the interactive 3D page (docs/).
// Runs daily in .github/workflows/github-card.yml.
// Local run: GITHUB_TOKEN=$(gh auth token) node scripts/build-github-card.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENTS, OUT, ROOT, THEMES, esc, svg, tileFrame } from "./theme.mjs";

const PAGE_URL = "https://harshbaldaniya.github.io/HarshBaldaniya/";

const USER = process.env.GITHUB_USER || "HarshBaldaniya";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

async function graphql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

async function contributionDays() {
  const { user } = await graphql("query($login: String!) { user(login: $login) { createdAt } }", { login: USER });
  const days = [];
  const now = new Date();
  for (let year = new Date(user.createdAt).getUTCFullYear(); year <= now.getUTCFullYear(); year++) {
    const from = new Date(Date.UTC(year, 0, 1)).toISOString();
    const to = year === now.getUTCFullYear() ? now.toISOString() : new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();
    const data = await graphql(
      `query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) { contributionsCollection(from: $from, to: $to) {
          contributionCalendar { weeks { contributionDays { date contributionCount contributionLevel } } }
        } }
      }`,
      { login: USER, from, to },
    );
    for (const week of data.user.contributionsCollection.contributionCalendar.weeks) days.push(...week.contributionDays);
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

function summarise(days) {
  const total = days.reduce((n, d) => n + d.contributionCount, 0);
  const first = days.find((d) => d.contributionCount > 0)?.date;

  let longest = { length: 0 }, run = null;
  for (const d of days) {
    if (d.contributionCount > 0) {
      run = run ? { ...run, end: d.date, length: run.length + 1 } : { start: d.date, end: d.date, length: 1 };
      if (run.length > longest.length) longest = run;
    } else {
      run = null;
    }
  }

  // Today may not have a contribution yet; the streak is still alive if
  // yesterday had one.
  let i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  const current = { length: 0, end: days[i]?.date };
  while (i >= 0 && days[i].contributionCount > 0) {
    current.length++;
    current.start = days[i].date;
    i--;
  }
  return { days, total, first, longest, current };
}

const fmt = (date, withYear = false) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC",
  });
const range = (s) => (s.length ? (s.start === s.end ? fmt(s.start) : `${fmt(s.start)} - ${fmt(s.end)}`) : "Starts with the next commit");

// Isometric 3D contribution graph. Weeks run along a shallow right-down axis,
// weekdays along a left-down axis, and each day is a block whose height
// follows its contribution count.
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const RAMPS = {
  dark: ["#2c2320", "#7a2a12", "#c2410c", "#ff5a1f", "#ffc04d"],
  light: ["#dedee3", "#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lastYear(days) {
  const recent = days.slice(-371);
  const start = recent.findIndex((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 0);
  const weeks = [];
  for (const d of recent.slice(start)) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (weekday === 0) weeks.push([]);
    weeks[weeks.length - 1][weekday] = d;
  }
  return weeks;
}

const SLAB = { dark: "#241c19", light: "#e9e9ee" };

// k scales the labels and legend; the phone card passes a larger k because
// it is shown at about half size.
function graph3d(mode, days, x, y, width, k = 1, note = true, weekLimit = 53) {
  const ramp = RAMPS[mode];
  const weeks = lastYear(days).slice(-weekLimit);
  const max = Math.max(1, ...weeks.flat().map((d) => d.contributionCount));
  const U = [17, 5.2];   // one week: right and slightly down
  const V = [-9.5, 8];   // one weekday: left and down, toward the viewer
  const THICK = 7;       // platform thickness
  const INSET = 0.8;     // leaves a gap between blocks
  const pt = (w, d, z = 0) => [w * U[0] + d * V[0], w * U[1] + d * V[1] - z];
  const poly = (pts, fill, extra = "") =>
    `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L")} Z" fill="${fill}"${extra}/>`;

  // Platform: a solid slab under the whole year.
  const nw = weeks.length, nd = 7;
  const slab = SLAB[mode];
  const platform = [
    poly([pt(0, nd), pt(nw, nd), pt(nw, nd, -THICK), pt(0, nd, -THICK)], shade(slab, 0.7)),
    poly([pt(nw, 0), pt(nw, nd), pt(nw, nd, -THICK), pt(nw, 0, -THICK)], shade(slab, 0.55)),
    poly([pt(0, 0), pt(nw, 0), pt(nw, nd), pt(0, nd)], slab),
  ].join("");

  const off = (1 - INSET) / 2;
  const cells = [];
  weeks.forEach((week, w) => week.forEach((day, d) => {
    if (!day) return;
    const level = LEVELS[day.contributionLevel] ?? 0;
    const h = level === 0 ? 0 : 5 + Math.sqrt(day.contributionCount / max) * 66;
    cells.push({ w, d, h, level, date: day.date, count: day.contributionCount });
  }));
  // Draw far to near: depth is where the cell's base lands on screen.
  cells.sort((p, q) => p.w * U[1] + p.d * V[1] - (q.w * U[1] + q.d * V[1]) || p.w - q.w);

  const shapes = cells.map((c) => {
    const [w0, w1, d0, d1] = [c.w + off, c.w + 1 - off, c.d + off, c.d + 1 - off];
    const tip = `<title>${c.count} contribution${c.count === 1 ? "" : "s"} on ${c.date}</title>`;
    if (!c.h) return `<g>${tip}${poly([pt(w0, d0), pt(w1, d0), pt(w1, d1), pt(w0, d1)], ramp[0])}</g>`;
    const color = ramp[c.level];
    const top = [pt(w0, d0, c.h), pt(w1, d0, c.h), pt(w1, d1, c.h), pt(w0, d1, c.h)];
    const front = [pt(w0, d1, c.h), pt(w1, d1, c.h), pt(w1, d1), pt(w0, d1)];
    const side = [pt(w1, d0, c.h), pt(w1, d1, c.h), pt(w1, d1), pt(w1, d0)];
    const edge = ` stroke="${shade(color, 1.25)}" stroke-width="0.6" stroke-opacity="0.6"`;
    return `<g>${tip}${poly(front, shade(color, 0.74))}${poly(side, shade(color, 0.56))}${poly(top, shade(color, 1.08), edge)}</g>`;
  }).join("");

  // Fit everything into the available width.
  const xs = [], ys = [];
  for (const [w, d] of [[0, 0], [nw, 0], [0, nd], [nw, nd]]) { const [px, py] = pt(w, d, -THICK); xs.push(px); ys.push(py); }
  for (const c of cells) { const [px, py] = pt(c.w, c.d, c.h); xs.push(px); ys.push(py); }
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = width / (maxX - minX);
  const screen = ([px, py]) => [x + (px - minX) * scale, y + (py - minY) * scale];
  const height = Math.round((maxY - minY) * scale);

  // Month labels along the front edge, at the first week of each month.
  const months = [];
  weeks.forEach((week, w) => {
    const first = week.find(Boolean);
    const m = new Date(`${first.date}T00:00:00Z`);
    if (w === 0 || m.getUTCDate() <= 7) {
      const label = m.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      if (!months.length || months[months.length - 1].label !== label) months.push({ w, label });
    }
  });
  const monthLabels = months.slice(1).map(({ w, label }) => {
    const [sx, sy] = screen(pt(w + 0.5, nd + 0.9, -THICK));
    return `<text x="${sx.toFixed(1)}" y="${(sy + 4 * k).toFixed(1)}" text-anchor="middle" class="sans" font-size="${12 * k}" font-weight="600" fill="currentColor">${label}</text>`;
  }).join("");

  const legendY = y + height + 34 * k;
  const legend = ramp.map((c, i) => `<rect x="${x + 44 * k + i * 18 * k}" y="${legendY - 11 * k}" width="${12 * k}" height="${12 * k}" rx="${3 * k}" fill="${c}"/>`).join("");
  return {
    height: height + 46 * k,
    markup: `
<g transform="translate(${x} ${y}) scale(${scale.toFixed(4)}) translate(${-minX} ${-minY})">${platform}${shapes}</g>
${monthLabels}
<g class="sans" font-size="${13 * k}" font-weight="600" fill="currentColor">
  <text x="${x}" y="${legendY}">Less</text>
  ${legend}
  <text x="${x + (44 + 5 * 18 + 4) * k}" y="${legendY}">More</text>
  ${note ? `<text x="${x + width}" y="${legendY}" text-anchor="end">Last 12 months, updated daily</text>` : ""}
</g>`,
  };
}

const flame = (t, a, x, y, scale = 1) => `
<g transform="translate(${x} ${y}) scale(${scale})">
  <g class="flame" style="transform-origin: 0px 26px">
    <path transform="translate(-11 0)" d="M11 0 C13 7 22 11 22 20 C22 27 17 31 11 31 C5 31 0 27 0 20 C0 14 4 11 6 6 C7 11 9 12 10 12 C10 8 9 4 11 0 Z" fill="${a}"/>
    <path transform="translate(-5 14)" d="M5 0 C7 4 10 6 10 10 C10 14 8 16 5 16 C2 16 0 14 0 10 C0 7 2 5 3 3 C4 5 5 5 5 0 Z" fill="${t.tile}"/>
  </g>
</g>`;

// Streak strip in the layout of the classic streak card: total, a ringed
// current streak with a flame, and the longest streak.
function streakStrip(t, a, stats, y, W) {
  const cx = [W / 6, W / 2, (5 * W) / 6];
  const side = (x, value, label, note) => `
<text x="${x}" y="${y + 104}" text-anchor="middle" class="display" font-size="46" font-weight="800" letter-spacing="-1" fill="${t.text}">${esc(value)}</text>
<text x="${x}" y="${y + 144}" text-anchor="middle" class="sans" font-size="18" font-weight="600" fill="${t.text}">${esc(label)}</text>
<text x="${x}" y="${y + 172}" text-anchor="middle" class="sans" font-size="15" fill="${t.muted}">${esc(note)}</text>`;
  const ry = y + 86;
  return `
<defs>
  <mask id="ring-gap">
    <rect x="0" y="0" width="${W}" height="${y + 260}" fill="#fff"/>
    <circle cx="${cx[1]}" cy="${ry - 60}" r="17" fill="#000"/>
  </mask>
</defs>
${side(cx[0], stats.total.toLocaleString("en-US"), "Total contributions", stats.first ? `${fmt(stats.first, true)} - Present` : "")}
<path d="M${W / 3} ${y + 16} V${y + 196}" stroke="${t.border}" stroke-width="1.5"/>
<circle cx="${cx[1]}" cy="${ry}" r="60" fill="none" stroke="${a}" stroke-width="6" mask="url(#ring-gap)"/>
${flame(t, a, cx[1], ry - 78)}
<text x="${cx[1]}" y="${ry + 17}" text-anchor="middle" class="display" font-size="44" font-weight="800" letter-spacing="-1" fill="${t.text}">${stats.current.length}</text>
<text x="${cx[1]}" y="${y + 186}" text-anchor="middle" class="sans" font-size="18" font-weight="700" fill="${a}">Current streak</text>
<text x="${cx[1]}" y="${y + 212}" text-anchor="middle" class="sans" font-size="15" fill="${t.muted}">${esc(range(stats.current))}</text>
<path d="M${(2 * W) / 3} ${y + 16} V${y + 196}" stroke="${t.border}" stroke-width="1.5"/>
${side(cx[2], String(stats.longest.length), "Longest streak", range(stats.longest))}`;
}

// Phone strip: the ringed current streak on top, the other two below.
function streakStripMobile(t, a, stats, y, W) {
  const cx = W / 2, ry = y + 104, R = 76;
  const side = (x, value, label, note) => `
<text x="${x}" y="${y + 384}" text-anchor="middle" class="display" font-size="50" font-weight="800" letter-spacing="-1" fill="${t.text}">${esc(value)}</text>
<text x="${x}" y="${y + 424}" text-anchor="middle" class="sans" font-size="24" font-weight="600" fill="${t.text}">${esc(label)}</text>
<text x="${x}" y="${y + 458}" text-anchor="middle" class="sans" font-size="21" fill="${t.muted}">${esc(note)}</text>`;
  return `
<defs>
  <mask id="ring-gap-m">
    <rect x="0" y="0" width="${W}" height="${y + 520}" fill="#fff"/>
    <circle cx="${cx}" cy="${ry - R}" r="22" fill="#000"/>
  </mask>
</defs>
<circle cx="${cx}" cy="${ry}" r="${R}" fill="none" stroke="${a}" stroke-width="8" mask="url(#ring-gap-m)"/>
${flame(t, a, cx, ry - R - 22, 1.35)}
<text x="${cx}" y="${ry + 22}" text-anchor="middle" class="display" font-size="58" font-weight="800" letter-spacing="-1" fill="${t.text}">${stats.current.length}</text>
<text x="${cx}" y="${y + 236}" text-anchor="middle" class="sans" font-size="26" font-weight="700" fill="${a}">Current streak</text>
<text x="${cx}" y="${y + 270}" text-anchor="middle" class="sans" font-size="21" fill="${t.muted}">${esc(range(stats.current))}</text>
<path d="M40 ${y + 306} H${W - 40}" stroke="${t.border}"/>
${side(W / 4, stats.total.toLocaleString("en-US"), "Contributions", stats.first ? `Since ${fmt(stats.first, true).replace(/ \d+,/, "")}` : "")}
<path d="M${cx} ${y + 336} V${y + 470}" stroke="${t.border}" stroke-width="1.5"/>
${side((3 * W) / 4, String(stats.longest.length), "Longest streak", range(stats.longest))}`;
}

const STYLE = `
  .flame { animation: flicker 2.4s ease-in-out infinite; }
  @keyframes flicker { 50% { transform: scale(1.08) rotate(-3deg); } }`;
const LABEL = (stats) => `On GitHub: ${stats.total} contributions, current streak ${stats.current.length} days, longest streak ${stats.longest.length} days.`;

function cardMobile(mode, stats) {
  const t = THEMES[mode];
  const a = ACCENTS.ember[mode];
  const W = 600;
  const graph = graph3d(mode, stats.days, 40, 176, W - 80, 1.8, false, 26);
  const stripY = 176 + graph.height + 36;
  const H = stripY + 500;
  const body = `
${tileFrame(t, W, H, a, "ghm", [0, 0])}
<text x="40" y="92" class="display" font-size="44" font-weight="800" letter-spacing="-0.8" fill="${t.text}">On GitHub</text>
<text x="40" y="134" class="sans" font-size="22" font-weight="600" fill="${t.muted}">Last 6 months, updated daily</text>
<text x="${W - 70}" y="88" text-anchor="end" class="sans" font-size="23" font-weight="700" fill="${a}">Explore in 3D</text>
<path d="M${W - 60} 84 l11 -11 M${W - 58} 73 h9 v9" fill="none" stroke="${a}" stroke-width="2.6" stroke-linecap="round"/>
<g color="${t.muted}">${graph.markup}</g>
<path d="M40 ${stripY - 14} H${W - 40}" stroke="${t.border}"/>
${streakStripMobile(t, a, stats, stripY, W)}`;
  return svg(W, H, LABEL(stats), body, STYLE);
}

function card(mode, stats) {
  const t = THEMES[mode];
  const a = ACCENTS.ember[mode];
  const W = 1216;
  const graph = graph3d(mode, stats.days, 56, 120, W - 112);
  const stripY = 120 + graph.height + 34;
  const H = stripY + 250;
  const body = `
${tileFrame(t, W, H, a, "gh", [0, 0])}
<text x="46" y="84" class="display" font-size="34" font-weight="800" letter-spacing="-0.6" fill="${t.text}">On GitHub</text>
<text x="${W - 66}" y="80" text-anchor="end" class="sans" font-size="16" font-weight="700" fill="${a}">Explore in 3D</text>
<path d="M${W - 58} 77 l8 -8 M${W - 57} 69 h7 v7" fill="none" stroke="${a}" stroke-width="2" stroke-linecap="round"/>
<g color="${t.muted}">${graph.markup}</g>
<path d="M40 ${stripY - 14} H${W - 40}" stroke="${t.border}"/>
${streakStrip(t, a, stats, stripY, W)}`;
  return svg(W, H, LABEL(stats), body, STYLE);
}

const stats = summarise(await contributionDays());
mkdirSync(OUT, { recursive: true });
for (const mode of Object.keys(THEMES)) {
  writeFileSync(join(OUT, `github-${mode}.svg`), card(mode, stats));
  writeFileSync(join(OUT, `github-mobile-${mode}.svg`), cardMobile(mode, stats));
}

const year = lastYear(stats.days).flat().filter(Boolean);
const page = {
  user: USER,
  generatedAt: new Date().toISOString(),
  stats: {
    total: stats.total,
    lastYear: year.reduce((n, d) => n + d.contributionCount, 0),
    first: stats.first,
    current: stats.current,
    longest: stats.longest,
  },
  days: year.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })),
};
mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(join(ROOT, "docs", "contributions.json"), JSON.stringify(page));
console.log(`total ${stats.total}, current ${stats.current.length}, longest ${stats.longest.length}, page ${PAGE_URL}`);
