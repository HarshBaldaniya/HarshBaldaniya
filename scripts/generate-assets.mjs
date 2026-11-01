// Generates the SVG artwork in assets/ (dark and light variants).
// Edit the data below, then run: node scripts/generate-assets.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENTS, EMBER, OUT, THEMES, esc, svg, tileFrame, wrap } from "./theme.mjs";

const textLines = (lines, x, y, lh, attrs) =>
  lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(l)}</text>`).join("\n");

const arrowLink = (x, y, label, color) => `
<text x="${x}" y="${y}" class="sans" font-size="16" font-weight="600" fill="${color}">${esc(label)}</text>
<path d="M${x + label.length * 8.4 + 8} ${y - 3} l8 -8 M${x + label.length * 8.4 + 9} ${y - 11} h7 v7" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

function chips(t, items, x, y, accent) {
  let cx = x;
  return items.map((s) => {
    const w = Math.round(s.length * 7.6 + 34);
    const m = `<g transform="translate(${cx} ${y})"><rect width="${w}" height="30" rx="15" fill="${t.raised}" stroke="${t.border}"/><circle cx="14" cy="15" r="3" fill="${accent}"/><text x="${w / 2 + 5}" y="20" text-anchor="middle" class="sans" font-size="13" font-weight="600" fill="${t.text}">${esc(s)}</text></g>`;
    cx += w + 8;
    return m;
  }).join("");
}

// ---------------------------------------------------------------- hero

function hero() {
  const W = 1216, H = 520;
  // Orbit system at the right: static rings, nodes orbiting at different
  // speeds, and ripples that grow out of the core. Everything is visible
  // without animation; motion only adds to it.
  const C = [1076, 250];
  const CREAM = "#fff4ec";
  const rings = [90, 150, 210, 270]
    .map((r, i) => `<circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="${EMBER.ink}" stroke-opacity="${0.2 - i * 0.035}" stroke-width="1.5"/>`)
    .join("");
  const orbit = (r, tail, node, seconds, reverse = false) => {
    const angle = tail / r;
    const nx = (C[0] + r * Math.cos(angle)).toFixed(1);
    const ny = (C[1] + r * Math.sin(angle)).toFixed(1);
    const head = reverse ? [C[0] + r, C[1]] : [nx, ny];
    return `
  <g class="orbit" style="animation-duration:${seconds}s;${reverse ? "animation-direction:reverse;" : ""}">
    <circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="${node.tail}" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${tail} ${Math.ceil(2 * Math.PI * r)}"/>
    <circle cx="${head[0]}" cy="${head[1]}" r="${node.r}" fill="${node.fill}"${node.ring ? ` stroke="${node.ring}" stroke-width="2.5"` : ""}/>
  </g>`;
  };
  const ripples = [0, 2, 4]
    .map((d) => `<circle cx="${C[0]}" cy="${C[1]}" r="270" fill="none" stroke="${CREAM}" stroke-width="2" vector-effect="non-scaling-stroke" class="ripple" style="animation-delay:${d}s"/>`)
    .join("");
  const system = `
  ${rings}
  ${ripples}
  ${orbit(90, 50, { r: 5, fill: CREAM, tail: CREAM }, 10)}
  ${orbit(150, 90, { r: 8, fill: EMBER.ink, ring: CREAM, tail: EMBER.ink }, 18, true)}
  ${orbit(210, 120, { r: 5, fill: CREAM, tail: CREAM }, 28)}
  ${orbit(270, 150, { r: 10, fill: EMBER.ink, tail: EMBER.ink }, 44, true)}
  <circle cx="${C[0]}" cy="${C[1]}" r="50" fill="${EMBER.flare}" fill-opacity="0.35" class="halo"/>
  <circle cx="${C[0]}" cy="${C[1]}" r="36" fill="${EMBER.ink}"/>
  <circle cx="${C[0]}" cy="${C[1]}" r="11" fill="${EMBER.flare}" class="pulse"/>`;
  const body = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff7433"/>
    <stop offset="0.55" stop-color="${EMBER.base}"/>
    <stop offset="1" stop-color="#e5361c"/>
  </linearGradient>
  <radialGradient id="flare" cx="0.92" cy="0.02" r="0.6">
    <stop offset="0" stop-color="${EMBER.flare}" stop-opacity="0.95"/>
    <stop offset="1" stop-color="${EMBER.flare}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="wine" cx="0.02" cy="1.05" r="0.75">
    <stop offset="0" stop-color="${EMBER.wine}" stop-opacity="0.85"/>
    <stop offset="1" stop-color="${EMBER.wine}" stop-opacity="0"/>
  </radialGradient>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
  </filter>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="28"/></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#flare)" class="breathe"/>
  <rect width="${W}" height="${H}" fill="url(#wine)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.16"/>
  ${system}
</g>

<text x="56" y="70" class="sans" font-size="17" font-weight="700" fill="${EMBER.ink}">harshbaldaniya.com</text>
<g transform="translate(56 98)">
  <rect width="214" height="34" rx="17" fill="${EMBER.ink}"/>
  <circle cx="20" cy="17" r="5" fill="${EMBER.flare}" class="pulse"/>
  <text x="34" y="22.5" class="sans" font-size="14" font-weight="600" fill="#ffe8dc">Now building Glyphcast</text>
</g>

<text x="50" y="250" class="display" font-size="100" font-weight="800" letter-spacing="-2" fill="${EMBER.ink}">Harsh</text>
<text x="50" y="356" class="display" font-size="100" font-weight="800" letter-spacing="-2" fill="${EMBER.ink}">Baldaniya</text>

<text x="56" y="420" class="sans" font-size="25" font-weight="700" fill="${EMBER.ink}">I turn ideas into products and engineer the systems that let them scale.</text>
<text x="56" y="464" class="sans" font-size="17" font-weight="600" fill="${EMBER.ink}" fill-opacity="0.78">Product engineering  ·  Systems at scale  ·  AI products  ·  AWS and GCP</text>`;

  const style = `
  .orbit { transform-origin: 1076px 250px; animation: spin linear infinite; }
  .ripple { opacity: 0; transform-origin: 1076px 250px; animation: ripple 6s cubic-bezier(0.25, 1, 0.5, 1) infinite backwards; }
  .halo { transform-origin: 1076px 250px; animation: halo 3.2s ease-in-out infinite; }
  .pulse { animation: pulse 2.6s ease-in-out infinite; }
  .breathe { animation: breathe 9s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes ripple { 0% { transform: scale(0.14); opacity: 0.7; } 100% { transform: scale(1.05); opacity: 0; } }
  @keyframes halo { 50% { transform: scale(1.25); opacity: 0.4; } }
  @keyframes pulse { 50% { opacity: 0.35; } }
  @keyframes breathe { 50% { opacity: 0.7; } }`;
  return svg(W, H, "Harsh Baldaniya. I turn ideas into products and engineer the systems that let them scale. Now building Glyphcast.", body, style);
}

// ---------------------------------------------------------------- tiles

function glyphcast(t, mode) {
  const W = 800, H = 400, a = ACCENTS.ember[mode];
  const desc = wrap("Understands speech, sound and motion across a whole video, picks the moments worth posting, captions every word, and opens each one in a full timeline editor.", 44);

  // One idea: a long video (a line), two moments the AI keeps, and the clip
  // they become, captioned one word at a time.
  const SRC_Y = 66;
  const curves = [
    "M550 66 C550 104 598 98 598 134",
    "M680 66 C680 104 638 98 638 134",
  ];
  const words = ["every", "word", "counts"].map((w, i) => `
<text x="618" y="286" text-anchor="middle" class="display word word${i}" font-size="17" font-weight="800" fill="#ffffff">${w}</text>`).join("");

  const body = `
${tileFrame(t, W, H, a, "gc", [1, 0])}
<text x="44" y="96" class="display" font-size="50" font-weight="800" letter-spacing="-1" fill="${t.text}">Glyphcast</text>
<text x="46" y="134" class="sans" font-size="19" font-weight="700" fill="${a}">AI video studio for creators</text>
${textLines(desc, 46, 178, 26, `class="sans" font-size="17" fill="${t.muted}"`)}
${chips(t, ["Next.js", "FastAPI", "Celery", "Redis"], 46, 296, a)}
${arrowLink(46, 368, "glyphcast.app", a)}

<defs>
  <linearGradient id="clip" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff8a4c"/>
    <stop offset="1" stop-color="#b3260f"/>
  </linearGradient>
  <radialGradient id="clip-light" cx="0.5" cy="0.32" r="0.6">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
</defs>

<text x="478" y="48" class="sans" font-size="12" font-weight="600" fill="${t.muted}">00:00</text>
<text x="758" y="48" text-anchor="end" class="sans" font-size="12" font-weight="600" fill="${t.muted}">42:18</text>
<path d="M478 ${SRC_Y} H758" stroke="${t.muted}" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
<path d="M530 ${SRC_Y} H570" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
<path d="M660 ${SRC_Y} H700" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
<circle cx="0" cy="${SRC_Y}" r="4.5" fill="${t.text}" class="scan"/>

${curves.map((d) => `<path d="${d}" fill="none" stroke="${a}" stroke-opacity="0.45" stroke-width="1.5"/>`).join("")}
${curves.map((d, i) => `<circle r="3" fill="${a}" class="flow" style="offset-path: path('${d}'); animation-delay: ${i * 0.25}s"/>`).join("")}

<rect x="560" y="134" width="116" height="206" rx="18" fill="url(#clip)"/>
<rect x="560" y="134" width="116" height="206" rx="18" fill="url(#clip-light)"/>
${[0, 1, 2].map((i) => `<rect x="${572 + i * 32}" y="146" width="28" height="3" rx="1.5" fill="#ffffff" fill-opacity="${i === 0 ? 0.95 : 0.4}"/>`).join("")}
${words}
<rect x="598" y="296" width="40" height="3" rx="1.5" fill="${EMBER.flare}"/>`;

  const style = `
  .scan { transform: translateX(550px); animation: scan 6s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
  .flow { offset-distance: 100%; opacity: 0; animation: flow 6s cubic-bezier(0.5, 0, 0.75, 0) infinite; }
  .word { opacity: 0; animation: word 3.6s infinite; }
  .word0 { opacity: 1; }
  .word1 { animation-delay: 1.2s; }
  .word2 { animation-delay: 2.4s; }
  @keyframes scan { 0% { transform: translateX(478px); } 55%, 100% { transform: translateX(758px); } }
  @keyframes flow { 0%, 55% { offset-distance: 0%; opacity: 0; } 60% { opacity: 1; } 80% { offset-distance: 100%; opacity: 1; } 86%, 100% { offset-distance: 100%; opacity: 0; } }
  @keyframes word { 0% { opacity: 0; transform: translateY(4px); } 6%, 30% { opacity: 1; transform: none; } 36%, 100% { opacity: 0; } }`;
  return svg(W, H, "Glyphcast, an AI video studio for creators. It understands a whole video, picks the moments worth posting, captions every word and opens each one in a timeline editor.", body, style);
}

function eventix(t, mode) {
  const W = 400, H = 400, a = ACCENTS.lime[mode];
  const body = `
${tileFrame(t, W, H, a, "ev", [0, 0])}
<text x="40" y="84" class="display" font-size="36" font-weight="800" letter-spacing="-0.8" fill="${t.text}">Eventix</text>
<text x="41" y="116" class="sans" font-size="17" font-weight="700" fill="${a}">Event booking, built for rush hour</text>
<text x="36" y="236" class="display" font-size="96" font-weight="800" letter-spacing="-3" fill="${t.text}">50K</text>
<text x="41" y="272" class="sans" font-size="16" fill="${t.muted}">concurrent users in load tests,</text>
<text x="41" y="294" class="sans" font-size="16" fill="${t.muted}">zero overbookings. Redis + Postgres</text>
<text x="41" y="316" class="sans" font-size="16" fill="${t.muted}">locks on a Clean Architecture API.</text>
${arrowLink(41, 366, "eventixbooking.vercel.app", a)}`;
  return svg(W, H, "Eventix, event booking load tested at 50K concurrent users with zero overbookings.", body);
}

function brainbox(t, mode) {
  const W = 400, H = 400, a = ACCENTS.violet[mode];
  const line = (y, w, o = 0.35) => `<rect x="40" y="${y}" width="${w}" height="9" rx="4.5" fill="${t.muted}" fill-opacity="${o}"/>`;
  const cursor = (x, y, color, name, cls) => `
<g class="${cls}" transform="translate(${x} ${y})">
  <path d="M0 0 L0 20 L5.5 15 L10 24 L13.5 22.5 L9 13.5 L16 13.5 Z" fill="${color}" stroke="${t.tile}" stroke-width="1.5" stroke-linejoin="round"/>
  <rect x="14" y="20" width="${name.length * 8 + 16}" height="22" rx="11" fill="${color}"/>
  <text x="${22}" y="35.5" class="sans" font-size="12" font-weight="700" fill="${t.tile}">${esc(name)}</text>
</g>`;
  const body = `
${tileFrame(t, W, H, a, "bb", [1, 1])}
<text x="40" y="84" class="display" font-size="36" font-weight="800" letter-spacing="-0.8" fill="${t.text}">BrainBox</text>
<text x="41" y="116" class="sans" font-size="17" font-weight="700" fill="${a}">Real-time docs with AI inside</text>
${line(150, 300)}${line(170, 250)}${line(190, 280, 0.6)}${line(210, 180)}
<rect x="190" y="186" width="120" height="17" rx="4" fill="${a}" fill-opacity="0.22"/>
${cursor(300, 182, a, "you", "drift")}
${cursor(150, 200, ACCENTS.sky[mode], "AI", "drift2")}
<text x="41" y="282" class="sans" font-size="16" fill="${t.muted}">Live cursors, role-based sharing,</text>
<text x="41" y="304" class="sans" font-size="16" fill="${t.muted}">and AI translation and chat over</text>
<text x="41" y="326" class="sans" font-size="16" fill="${t.muted}">every document.</text>
${arrowLink(41, 366, "brainbox-hb.vercel.app", a)}`;
  const style = `
  .drift { animation: drift 6s ease-in-out infinite; }
  .drift2 { animation: drift2 7s ease-in-out infinite; }
  @keyframes drift { 50% { transform: translate(262px, 168px); } }
  @keyframes drift2 { 50% { transform: translate(176px, 214px); } }`;
  return svg(W, H, "BrainBox, a real-time collaborative editor with AI translation and chat.", body, style);
}

function harshos(t, mode) {
  const W = 800, H = 400, a = ACCENTS.sky[mode];
  const desc = wrap("A desktop you can actually use in the browser: a dock, draggable windows, a Notes app, a Mail app that really sends, a Finder and live wallpapers.", 44);
  const win = (x, y, w, h, cls = "") => `
<g class="${cls}" transform="translate(${x} ${y})">
  <rect width="${w}" height="${h}" rx="9" fill="${t.raised}" stroke="${t.border}"/>
  <circle cx="13" cy="12" r="3.5" fill="#ff5f57"/><circle cx="25" cy="12" r="3.5" fill="#febc2e"/><circle cx="37" cy="12" r="3.5" fill="#28c840"/>
  <rect x="12" y="28" width="${w * 0.55}" height="6" rx="3" fill="${t.muted}" fill-opacity="0.45"/>
  <rect x="12" y="42" width="${w * 0.75}" height="6" rx="3" fill="${t.muted}" fill-opacity="0.3"/>
  <rect x="12" y="56" width="${w * 0.4}" height="6" rx="3" fill="${t.muted}" fill-opacity="0.3"/>
</g>`;
  const dock = Array.from({ length: 6 }, (_, i) =>
    `<rect x="${566 + i * 30}" y="300" width="22" height="22" rx="6" fill="${i === 2 ? a : t.raised}" stroke="${t.border}"/>`).join("");
  const body = `
${tileFrame(t, W, H, a, "os", [1, 1])}
<text x="44" y="96" class="display" font-size="50" font-weight="800" letter-spacing="-1" fill="${t.text}">HarshOS</text>
<text x="46" y="134" class="sans" font-size="19" font-weight="700" fill="${a}">macOS, rebuilt in the browser</text>
${textLines(desc, 46, 178, 26, `class="sans" font-size="17" fill="${t.muted}"`)}
${chips(t, ["Next.js", "TipTap", "Resend", "Tailwind"], 46, 296, a)}
${arrowLink(46, 368, "harshos.vercel.app", a)}

<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0c4a6e"/>
    <stop offset="0.6" stop-color="#0284c7"/>
    <stop offset="1" stop-color="#7dd3fc"/>
  </linearGradient>
  <clipPath id="screen"><rect x="490" y="44" width="270" height="296" rx="16"/></clipPath>
</defs>
<rect x="490" y="44" width="270" height="296" rx="16" fill="url(#wall)"/>
<g clip-path="url(#screen)">
  <rect x="490" y="44" width="270" height="18" fill="#000000" fill-opacity="0.28"/>
  <circle cx="506" cy="53" r="3.5" fill="#ffffff"/>
  <rect x="518" y="50" width="34" height="6" rx="3" fill="#ffffff" fill-opacity="0.7"/>
  <rect x="560" y="50" width="22" height="6" rx="3" fill="#ffffff" fill-opacity="0.5"/>
  ${win(510, 82, 150, 120)}
  ${win(590, 150, 150, 110, "float")}
  <rect x="556" y="292" width="190" height="38" rx="12" fill="#ffffff" fill-opacity="0.25"/>
  ${dock}
</g>`;
  const style = `
  .float { animation: float 6s ease-in-out infinite; }
  @keyframes float { 50% { transform: translate(578px, 140px); } }`;
  return svg(W, H, "HarshOS, a macOS-style desktop in the browser.", body, style);
}

// ---------------------------------------------------------------- toolbox

async function fetchIcon(id, mode) {
  const res = await fetch(`https://skillicons.dev/icons?i=${id}&theme=${mode}`);
  const raw = await res.text();
  if (!res.ok || raw.length < 400) throw new Error(`skillicons has no icon "${id}"`);
  const prefix = `${id}-${mode}-`;
  return raw.trim()
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);
}

const STACK = [
  ["Languages", ["ts", "js", "py", "java", "cpp"]],
  ["Frontend", ["react", "nextjs", "angular", "tailwind", "sass", "html", "css", "figma"]],
  ["Backend", ["nodejs", "express", "fastapi", "graphql", "php", "postman"]],
  ["Data", ["postgres", "mysql", "mongodb", "redis", "sqlite", "firebase"]],
  ["Cloud and DevOps", ["aws", "gcp", "docker", "nginx", "linux", "jenkins", "githubactions", "vercel", "git"]],
];

async function toolbox(t, mode) {
  const W = 1216, SIZE = 50, GAP = 14, ROW = 74, a = ACCENTS.ember[mode];
  let y = 128;
  const rows = [];
  for (const [label, ids] of STACK) {
    let x = 300;
    const icons = [];
    for (const id of ids) {
      const icon = await fetchIcon(id, mode);
      icons.push(icon.replace(/^<svg width="48" height="48"/, `<svg x="${x}" y="${y}" width="${SIZE}" height="${SIZE}"`));
      x += SIZE + GAP;
    }
    rows.push(`<text x="48" y="${y + 31}" class="sans" font-size="17" font-weight="700" fill="${t.text}">${esc(label)}</text>\n${icons.join("\n")}`);
    y += ROW;
  }
  const H = y - ROW + SIZE + 44;
  const body = `
${tileFrame(t, W, H, a, "tb", [1, 0])}
<text x="46" y="84" class="display" font-size="34" font-weight="800" letter-spacing="-0.6" fill="${t.text}">Toolbox</text>
<text x="${W - 46}" y="80" text-anchor="end" class="sans" font-size="16" font-weight="600" fill="${t.muted}">what I reach for to ship and scale</text>
${rows.join("\n")}`;
  return svg(W, H, `Toolbox. ${STACK.map(([l, i]) => `${l}: ${i.join(", ")}`).join(". ")}`, body);
}

// ---------------------------------------------------------------- write

mkdirSync(OUT, { recursive: true });

writeFileSync(join(OUT, "hero.svg"), hero());
for (const mode of Object.keys(THEMES)) {
  const t = THEMES[mode];
  const write = (name, content) => writeFileSync(join(OUT, `${name}-${mode}.svg`), content);
  write("glyphcast", glyphcast(t, mode));
  write("eventix", eventix(t, mode));
  write("brainbox", brainbox(t, mode));
  write("harshos", harshos(t, mode));
  write("toolbox", await toolbox(t, mode));
}
console.log(`Wrote 11 files to ${OUT}`);
