// Generates the SVG artwork in assets/ (dark and light variants).
// Edit the data below, then run: node scripts/generate-assets.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENTS, EMBER, OUT, THEMES, esc, svg, tileFrame, wrap } from "./theme.mjs";

const textLines = (lines, x, y, lh, attrs) =>
  lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(l)}</text>`).join("\n");

const arrowLink = (x, y, label, color, fs = 16) => {
  const end = x + label.length * fs * 0.525 + fs * 0.5;
  const k = fs / 16;
  return `
<text x="${x}" y="${y}" class="sans" font-size="${fs}" font-weight="600" fill="${color}">${esc(label)}</text>
<path d="M${end} ${y - 3 * k} l${8 * k} ${-8 * k} M${end + k} ${y - 11 * k} h${7 * k} v${7 * k}" fill="none" stroke="${color}" stroke-width="${2 * k}" stroke-linecap="round"/>`;
};

// Pill chips; wraps onto a new row past maxX. Returns markup and the bottom y.
function chips(t, items, x, y, accent, fs = 13, maxX = Infinity) {
  const h = Math.round(fs * 2.3), gap = Math.round(fs * 0.6);
  let cx = x, cy = y;
  const markup = items.map((s) => {
    const w = Math.round(s.length * fs * 0.585 + fs * 2.6);
    if (cx > x && cx + w > maxX) { cx = x; cy += h + gap; }
    const m = `<g transform="translate(${cx} ${cy})"><rect width="${w}" height="${h}" rx="${h / 2}" fill="${t.raised}" stroke="${t.border}"/><circle cx="${fs * 1.08}" cy="${h / 2}" r="${fs * 0.23}" fill="${accent}"/><text x="${w / 2 + fs * 0.38}" y="${h / 2 + fs * 0.38}" text-anchor="middle" class="sans" font-size="${fs}" font-weight="600" fill="${t.text}">${esc(s)}</text></g>`;
    cx += w + gap;
    return m;
  }).join("");
  return { markup, bottom: cy + h };
}

// A drawable piece: rendered alone, or composed with others into one SVG.
const part = (w, h, label, body, style = "") => ({ w, h, label, body, style });
const render = (p) => svg(p.w, p.h, p.label, p.body, p.style);
function compose(parts, direction, gap = 16) {
  let offset = 0;
  const body = parts.map((p) => {
    const g = direction === "row" ? `<g transform="translate(${offset} 0)">${p.body}</g>` : `<g transform="translate(0 ${offset})">${p.body}</g>`;
    offset += (direction === "row" ? p.w : p.h) + gap;
    return g;
  }).join("\n");
  const size = offset - gap;
  return part(
    direction === "row" ? size : Math.max(...parts.map((p) => p.w)),
    direction === "row" ? Math.max(...parts.map((p) => p.h)) : size,
    parts.map((p) => p.label).join(" "),
    body,
    parts.map((p) => p.style).join("\n"),
  );
}

// ---------------------------------------------------------------- hero

// Orbit system: static rings, nodes orbiting at different speeds, and ripples
// that grow out of the core. Everything is visible without animation; motion
// only adds to it.
function orbitSystem(C) {
  const CREAM = "#fff4ec";
  const origin = `transform-origin: ${C[0]}px ${C[1]}px;`;
  const rings = [90, 150, 210, 270]
    .map((r, i) => `<circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="${EMBER.ink}" stroke-opacity="${0.2 - i * 0.035}" stroke-width="1.5"/>`)
    .join("");
  const orbit = (r, tail, node, seconds, reverse = false) => {
    const angle = tail / r;
    const head = reverse ? [C[0] + r, C[1]] : [(C[0] + r * Math.cos(angle)).toFixed(1), (C[1] + r * Math.sin(angle)).toFixed(1)];
    return `
  <g class="orbit" style="animation-duration:${seconds}s;${reverse ? "animation-direction:reverse;" : ""}">
    <circle cx="${C[0]}" cy="${C[1]}" r="${r}" fill="none" stroke="${node.tail}" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${tail} ${Math.ceil(2 * Math.PI * r)}"/>
    <circle cx="${head[0]}" cy="${head[1]}" r="${node.r}" fill="${node.fill}"${node.ring ? ` stroke="${node.ring}" stroke-width="2.5"` : ""}/>
  </g>`;
  };
  const ripples = [0, 2, 4]
    .map((d) => `<circle cx="${C[0]}" cy="${C[1]}" r="270" fill="none" stroke="${CREAM}" stroke-width="2" vector-effect="non-scaling-stroke" class="ripple" style="animation-delay:${d}s"/>`)
    .join("");
  return {
    body: `
  ${rings}
  ${ripples}
  ${orbit(90, 50, { r: 5, fill: CREAM, tail: CREAM }, 10)}
  ${orbit(150, 90, { r: 8, fill: EMBER.ink, ring: CREAM, tail: EMBER.ink }, 18, true)}
  ${orbit(210, 120, { r: 5, fill: CREAM, tail: CREAM }, 28)}
  ${orbit(270, 150, { r: 10, fill: EMBER.ink, tail: EMBER.ink }, 44, true)}
  <circle cx="${C[0]}" cy="${C[1]}" r="50" fill="${EMBER.flare}" fill-opacity="0.35" class="halo"/>
  <circle cx="${C[0]}" cy="${C[1]}" r="36" fill="${EMBER.ink}"/>
  <circle cx="${C[0]}" cy="${C[1]}" r="11" fill="${EMBER.flare}" class="pulse"/>`,
    style: `
  .orbit { ${origin} animation: spin linear infinite; }
  .ripple { opacity: 0; ${origin} animation: ripple 6s cubic-bezier(0.25, 1, 0.5, 1) infinite backwards; }
  .halo { ${origin} animation: halo 3.2s ease-in-out infinite; }
  .pulse { animation: pulse 2.6s ease-in-out infinite; }
  .breathe { animation: breathe 9s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes ripple { 0% { transform: scale(0.14); opacity: 0.7; } 100% { transform: scale(1.05); opacity: 0; } }
  @keyframes halo { 50% { transform: scale(1.25); opacity: 0.4; } }
  @keyframes pulse { 50% { opacity: 0.35; } }
  @keyframes breathe { 50% { opacity: 0.7; } }`,
  };
}

function heroBackground(W, H) {
  return `
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
</defs>`;
}

const HERO_LABEL = "Harsh Baldaniya. I turn ideas into products and engineer the systems that let them scale. Now building Glyphcast.";
const TAGLINE = "I turn ideas into products and engineer the systems that let them scale.";

function heroPill(x, y, fs) {
  const h = fs * 2.4, w = fs * 15.3;
  return `
<g transform="translate(${x} ${y})">
  <rect width="${w}" height="${h}" rx="${h / 2}" fill="${EMBER.ink}"/>
  <circle cx="${fs * 1.43}" cy="${h / 2}" r="${fs * 0.36}" fill="${EMBER.flare}" class="pulse"/>
  <text x="${fs * 2.43}" y="${h / 2 + fs * 0.36}" class="sans" font-size="${fs}" font-weight="600" fill="#ffe8dc">Now building Glyphcast</text>
</g>`;
}

function hero() {
  const W = 1216, H = 520;
  const sys = orbitSystem([1076, 250]);
  const body = `
${heroBackground(W, H)}
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#flare)" class="breathe"/>
  <rect width="${W}" height="${H}" fill="url(#wine)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.16"/>
  ${sys.body}
</g>
<text x="56" y="70" class="sans" font-size="17" font-weight="700" fill="${EMBER.ink}">harshbaldaniya.com</text>
${heroPill(56, 98, 14)}
<text x="50" y="250" class="display" font-size="100" font-weight="800" letter-spacing="-2" fill="${EMBER.ink}">Harsh</text>
<text x="50" y="356" class="display" font-size="100" font-weight="800" letter-spacing="-2" fill="${EMBER.ink}">Baldaniya</text>
<text x="56" y="420" class="sans" font-size="25" font-weight="700" fill="${EMBER.ink}">${TAGLINE}</text>
<text x="56" y="464" class="sans" font-size="17" font-weight="600" fill="${EMBER.ink}" fill-opacity="0.78">Product engineering  ·  Systems at scale  ·  AI products  ·  AWS and GCP</text>`;
  return part(W, H, HERO_LABEL, body, sys.style);
}

// Phone layout: the README column is ~340px wide, so type is set roughly
// 1.8x larger than the desktop hero.
function heroMobile() {
  const W = 600, H = 760;
  const sys = orbitSystem([500, 640]);
  const tagline = wrap(TAGLINE, 31);
  const body = `
${heroBackground(W, H)}
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#flare)" class="breathe"/>
  <rect width="${W}" height="${H}" fill="url(#wine)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.16"/>
  ${sys.body}
</g>
<text x="40" y="70" class="sans" font-size="24" font-weight="700" fill="${EMBER.ink}">harshbaldaniya.com</text>
${heroPill(40, 98, 21)}
<text x="36" y="282" class="display" font-size="72" font-weight="800" letter-spacing="-1.5" fill="${EMBER.ink}">Harsh</text>
<text x="36" y="362" class="display" font-size="72" font-weight="800" letter-spacing="-1.5" fill="${EMBER.ink}">Baldaniya</text>
${textLines(tagline, 40, 432, 42, `class="sans" font-size="31" font-weight="700" fill="${EMBER.ink}"`)}
<text x="40" y="${432 + tagline.length * 42 + 26}" class="sans" font-size="22" font-weight="600" fill="${EMBER.ink}" fill-opacity="0.78">Product engineering  ·  Systems at scale</text>
<text x="40" y="${432 + tagline.length * 42 + 58}" class="sans" font-size="22" font-weight="600" fill="${EMBER.ink}" fill-opacity="0.78">AI products  ·  AWS and GCP</text>`;
  return part(W, H, HERO_LABEL, body, sys.style);
}

// ---------------------------------------------------------------- project visuals
// Each visual is drawn in its desktop tile coordinates; `box` is its bounds
// so the phone layout can scale and centre it.

function glyphcastVisual(t, a) {
  const SRC_Y = 66;
  const curves = ["M550 66 C550 104 598 98 598 134", "M680 66 C680 104 638 98 638 134"];
  const words = ["every", "word", "counts"].map((w, i) =>
    `<text x="618" y="286" text-anchor="middle" class="display word word${i}" font-size="17" font-weight="800" fill="#ffffff">${w}</text>`).join("");
  return {
    box: [470, 34, 296, 306],
    body: `
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
<rect x="598" y="296" width="40" height="3" rx="1.5" fill="${EMBER.flare}"/>`,
    style: `
  .scan { transform: translateX(550px); animation: scan 6s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
  .flow { offset-distance: 100%; opacity: 0; animation: flow 6s cubic-bezier(0.5, 0, 0.75, 0) infinite; }
  .word { opacity: 0; animation: word 3.6s infinite; }
  .word0 { opacity: 1; }
  .word1 { animation-delay: 1.2s; }
  .word2 { animation-delay: 2.4s; }
  @keyframes scan { 0% { transform: translateX(478px); } 55%, 100% { transform: translateX(758px); } }
  @keyframes flow { 0%, 55% { offset-distance: 0%; opacity: 0; } 60% { opacity: 1; } 80% { offset-distance: 100%; opacity: 1; } 86%, 100% { offset-distance: 100%; opacity: 0; } }
  @keyframes word { 0% { opacity: 0; transform: translateY(4px); } 6%, 30% { opacity: 1; transform: none; } 36%, 100% { opacity: 0; } }`,
  };
}

function eventixVisual(t) {
  return {
    box: [36, 160, 330, 160],
    body: `
<text x="36" y="236" class="display" font-size="96" font-weight="800" letter-spacing="-3" fill="${t.text}">50K</text>
<text x="41" y="272" class="sans" font-size="16" fill="${t.muted}">concurrent users in load tests,</text>
<text x="41" y="294" class="sans" font-size="16" fill="${t.muted}">zero overbookings. Redis + Postgres</text>
<text x="41" y="316" class="sans" font-size="16" fill="${t.muted}">locks on a Clean Architecture API.</text>`,
    style: "",
  };
}

function brainboxVisual(t, a, mode) {
  const line = (y, w, o = 0.35) => `<rect x="40" y="${y}" width="${w}" height="9" rx="4.5" fill="${t.muted}" fill-opacity="${o}"/>`;
  const cursor = (x, y, color, name, cls) => `
<g class="${cls}" transform="translate(${x} ${y})">
  <path d="M0 0 L0 20 L5.5 15 L10 24 L13.5 22.5 L9 13.5 L16 13.5 Z" fill="${color}" stroke="${t.tile}" stroke-width="1.5" stroke-linejoin="round"/>
  <rect x="14" y="20" width="${name.length * 8 + 16}" height="22" rx="11" fill="${color}"/>
  <text x="22" y="35.5" class="sans" font-size="12" font-weight="700" fill="${t.tile}">${esc(name)}</text>
</g>`;
  return {
    box: [40, 146, 320, 100],
    body: `
${line(150, 300)}${line(170, 250)}${line(190, 280, 0.6)}${line(210, 180)}
<rect x="190" y="186" width="120" height="17" rx="4" fill="${a}" fill-opacity="0.22"/>
${cursor(300, 182, a, "you", "drift")}
${cursor(150, 200, ACCENTS.sky[mode], "AI", "drift2")}`,
    style: `
  .drift { animation: drift 6s ease-in-out infinite; }
  .drift2 { animation: drift2 7s ease-in-out infinite; }
  @keyframes drift { 50% { transform: translate(262px, 168px); } }
  @keyframes drift2 { 50% { transform: translate(176px, 214px); } }`,
  };
}

function harshosVisual(t, a) {
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
  return {
    box: [490, 44, 270, 296],
    body: `
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
</g>`,
    style: `
  .float { animation: float 6s ease-in-out infinite; }
  @keyframes float { 50% { transform: translate(578px, 140px); } }`,
  };
}

// ---------------------------------------------------------------- project data

const GC_STACK = ["Next.js", "FastAPI", "Celery", "Redis"];
const OS_STACK = ["Next.js", "TipTap", "Resend", "Tailwind"];
const PROJECTS = {
  glyphcast: {
    title: "Glyphcast", subtitle: "AI video studio for creators", accent: "ember", glow: [1, 0], link: "glyphcast.app", stack: GC_STACK,
    desc: "Understands speech, sound and motion across a whole video, picks the moments worth posting, captions every word, and opens each one in a full timeline editor.",
    label: "Glyphcast, an AI video studio for creators. It understands a whole video, picks the moments worth posting, captions every word and opens each one in a timeline editor.",
    visual: glyphcastVisual,
  },
  eventix: {
    title: "Eventix", subtitle: "Event booking, built for rush hour", accent: "lime", glow: [0, 0], link: "eventixbooking.vercel.app",
    label: "Eventix, event booking load tested at 50K concurrent users with zero overbookings.",
    visual: eventixVisual,
  },
  brainbox: {
    title: "BrainBox", subtitle: "Real-time docs with AI inside", accent: "violet", glow: [1, 1], link: "brainbox-hb.vercel.app",
    desc: "Live cursors, role-based sharing, and AI translation and chat over every document.",
    label: "BrainBox, a real-time collaborative editor with AI translation and chat.",
    visual: brainboxVisual,
  },
  harshos: {
    title: "HarshOS", subtitle: "macOS, rebuilt in the browser", accent: "sky", glow: [1, 1], link: "harshos.vercel.app", stack: OS_STACK,
    desc: "A desktop you can actually use in the browser: a dock, draggable windows, a Notes app, a Mail app that really sends, a Finder and live wallpapers.",
    label: "HarshOS, a macOS-style desktop in the browser.",
    visual: harshosVisual,
  },
};

// ---------------------------------------------------------------- desktop tiles

function wideTile(t, mode, key) {
  const p = PROJECTS[key], a = ACCENTS[p.accent][mode], W = 800, H = 400;
  const v = p.visual(t, a, mode);
  const body = `
${tileFrame(t, W, H, a, key, p.glow)}
<text x="44" y="96" class="display" font-size="50" font-weight="800" letter-spacing="-1" fill="${t.text}">${p.title}</text>
<text x="46" y="134" class="sans" font-size="19" font-weight="700" fill="${a}">${esc(p.subtitle)}</text>
${textLines(wrap(p.desc, 44), 46, 178, 26, `class="sans" font-size="17" fill="${t.muted}"`)}
${chips(t, p.stack, 46, 296, a).markup}
${arrowLink(46, 368, p.link, a)}
${v.body}`;
  return part(W, H, p.label, body, v.style);
}

function squareTile(t, mode, key) {
  const p = PROJECTS[key], a = ACCENTS[p.accent][mode], W = 400, H = 400;
  const v = p.visual(t, a, mode);
  const desc = p.desc ? textLines(wrap(p.desc, 34), 41, 282, 22, `class="sans" font-size="16" fill="${t.muted}"`) : "";
  const body = `
${tileFrame(t, W, H, a, key, p.glow)}
<text x="40" y="84" class="display" font-size="36" font-weight="800" letter-spacing="-0.8" fill="${t.text}">${p.title}</text>
<text x="41" y="116" class="sans" font-size="17" font-weight="700" fill="${a}">${esc(p.subtitle)}</text>
${v.body}
${desc}
${arrowLink(41, 366, p.link, a)}`;
  return part(W, H, p.label, body, v.style);
}

// ---------------------------------------------------------------- phone tiles

// One column, 600 wide: title, line, description, chips, the visual scaled
// up, then the link. Shown at ~340px, so type is ~1.6x the desktop size.
function phoneTile(t, mode, key) {
  const p = PROJECTS[key], a = ACCENTS[p.accent][mode], W = 600, X = 40;
  const v = p.visual(t, a, mode);
  let y = 150;
  const out = [
    `<text x="${X}" y="96" class="display" font-size="54" font-weight="800" letter-spacing="-1" fill="${t.text}">${p.title}</text>`,
    `<text x="${X + 2}" y="${y}" class="sans" font-size="27" font-weight="700" fill="${a}">${esc(p.subtitle)}</text>`,
  ];
  if (p.desc) {
    const lines = wrap(p.desc, 38);
    out.push(textLines(lines, X + 2, y + 50, 37, `class="sans" font-size="25" fill="${t.muted}"`));
    y += 50 + (lines.length - 1) * 37;
  }
  if (p.stack) {
    const c = chips(t, p.stack, X + 2, y + 30, a, 20, W - X);
    out.push(c.markup);
    y = c.bottom;
  }
  const [bx, by, bw, bh] = v.box;
  const s = Math.min(1.75, (W - 2 * X) / bw);
  const tx = (W - bw * s) / 2 - bx * s, ty = y + 40 - by * s;
  out.push(`<g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(3)})">${v.body}</g>`);
  y += 40 + bh * s;
  out.push(arrowLink(X + 2, y + 62, p.link, a, 24));
  const H = Math.round(y + 104);
  const body = `${tileFrame(t, W, H, a, `${key}-m`, p.glow)}${out.join("\n")}`;
  return part(W, H, p.label, body, v.style);
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
const STACK_LABEL = `Toolbox. ${STACK.map(([l, i]) => `${l}: ${i.join(", ")}`).join(". ")}`;
const icon = (raw, x, y, size) => raw.replace(/^<svg width="48" height="48"/, `<svg x="${x}" y="${y}" width="${size}" height="${size}"`);

async function toolbox(t, mode) {
  const W = 1216, SIZE = 50, GAP = 14, ROW = 74, a = ACCENTS.ember[mode];
  let y = 128;
  const rows = [];
  for (const [label, ids] of STACK) {
    const icons = [];
    for (const [i, id] of ids.entries()) icons.push(icon(await fetchIcon(id, mode), 300 + i * (SIZE + GAP), y, SIZE));
    rows.push(`<text x="48" y="${y + 31}" class="sans" font-size="17" font-weight="700" fill="${t.text}">${esc(label)}</text>\n${icons.join("\n")}`);
    y += ROW;
  }
  const H = y - ROW + SIZE + 44;
  const body = `
${tileFrame(t, W, H, a, "tb", [1, 0])}
<text x="46" y="84" class="display" font-size="34" font-weight="800" letter-spacing="-0.6" fill="${t.text}">Toolbox</text>
<text x="${W - 46}" y="80" text-anchor="end" class="sans" font-size="16" font-weight="600" fill="${t.muted}">what I reach for to ship and scale</text>
${rows.join("\n")}`;
  return part(W, H, STACK_LABEL, body);
}

async function toolboxMobile(t, mode) {
  const W = 600, SIZE = 64, GAP = 12, PER_ROW = 7, a = ACCENTS.ember[mode];
  let y = 168;
  const rows = [];
  for (const [label, ids] of STACK) {
    rows.push(`<text x="40" y="${y}" class="sans" font-size="24" font-weight="700" fill="${t.text}">${esc(label)}</text>`);
    y += 18;
    for (const [i, id] of ids.entries()) {
      const col = i % PER_ROW, row = Math.floor(i / PER_ROW);
      rows.push(icon(await fetchIcon(id, mode), 40 + col * (SIZE + GAP), y + row * (SIZE + GAP), SIZE));
    }
    y += Math.ceil(ids.length / PER_ROW) * (SIZE + GAP) + 48;
  }
  const H = y - 20;
  const body = `
${tileFrame(t, W, H, a, "tbm", [1, 0])}
<text x="40" y="92" class="display" font-size="44" font-weight="800" letter-spacing="-0.8" fill="${t.text}">Toolbox</text>
<text x="40" y="128" class="sans" font-size="22" font-weight="600" fill="${t.muted}">what I reach for to ship and scale</text>
${rows.join("\n")}`;
  return part(W, H, STACK_LABEL, body);
}

// ---------------------------------------------------------------- write

mkdirSync(OUT, { recursive: true });
const write = (name, p) => writeFileSync(join(OUT, `${name}.svg`), render(p));

write("hero", hero());
write("hero-mobile", heroMobile());
for (const mode of Object.keys(THEMES)) {
  const t = THEMES[mode];
  write(`work-1-${mode}`, compose([wideTile(t, mode, "glyphcast"), squareTile(t, mode, "eventix")], "row"));
  write(`work-2-${mode}`, compose([squareTile(t, mode, "brainbox"), wideTile(t, mode, "harshos")], "row"));
  write(`work-1-mobile-${mode}`, compose([phoneTile(t, mode, "glyphcast"), phoneTile(t, mode, "eventix")], "column"));
  write(`work-2-mobile-${mode}`, compose([phoneTile(t, mode, "brainbox"), phoneTile(t, mode, "harshos")], "column"));
  write(`toolbox-${mode}`, await toolbox(t, mode));
  write(`toolbox-mobile-${mode}`, await toolboxMobile(t, mode));
}
console.log(`Wrote 14 files to ${OUT}`);
