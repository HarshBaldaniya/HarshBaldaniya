// Shared palette, type and tile chassis for every generated SVG.
// Display type is Unbounded (SIL OFL 1.1, scripts/fonts/OFL.txt), subset and
// embedded so the images render the same on every machine.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(ROOT, "assets");
export const font = (weight) =>
  readFileSync(join(ROOT, "scripts", "fonts", `Unbounded-${weight}.woff2`)).toString("base64");
export const FONT_FACES = `
  @font-face { font-family: 'Unbounded'; font-weight: 700; src: url(data:font/woff2;base64,${font(700)}) format('woff2'); }
  @font-face { font-family: 'Unbounded'; font-weight: 800; src: url(data:font/woff2;base64,${font(800)}) format('woff2'); }`;

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

export const EMBER = { base: "#ff5a1f", flare: "#ffc04d", wine: "#6e0d1c", ink: "#1a0b06" };

export const THEMES = {
  dark: {
    tile: "#161210", raised: "#211a17", border: "#2e2522",
    text: "#f6efeb", muted: "#b9aea8", glow: 0.30,
  },
  light: {
    tile: "#f6f6f7", raised: "#ffffff", border: "#e2e2e6",
    text: "#18181b", muted: "#52525b", glow: 0.16,
  },
};

// Accent per project: a bright tone for dark tiles, a deeper one that keeps
// 4.5:1 contrast on light tiles.
export const ACCENTS = {
  ember: { dark: "#ff7a45", light: "#c2410c" },
  lime: { dark: "#a3e635", light: "#4d7c0f" },
  violet: { dark: "#b197fc", light: "#6d28d9" },
  sky: { dark: "#4cc3f7", light: "#0369a1" },
};

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + " " + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Every asset carries an 8px transparent edge. Images sit flush in the README,
// so two edges make the same 16px gap between tiles and between sections.
export const PAD = 8;

// The README sets no image widths: each SVG's width/height is its display
// size. GitHub's profile README column is 846px wide on screens 1280px and up,
// so the desktop artwork (1232 units across) is scaled to 844px, leaving 2px of
// slack so a row never wraps. Phone artwork stays 616 wide and shrinks to fit.
export const DESKTOP_SCALE = 844 / 1232;

export const svg = (w, h, label, body, style = "", scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" width="${((w + 2 * PAD) * scale).toFixed(1)}" height="${((h + 2 * PAD) * scale).toFixed(1)}" viewBox="${-PAD} ${-PAD} ${w + 2 * PAD} ${h + 2 * PAD}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>
  ${FONT_FACES}
  .display { font-family: 'Unbounded', ${SANS}; }
  .sans { font-family: ${SANS}; }
  ${style}
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${body}
</svg>
`;

// Shared tile chassis: rounded surface, accent glow from one corner, border.
export function tileFrame(t, w, h, accent, id, glowAt = [1, 0]) {
  return `
<defs>
  <radialGradient id="${id}-glow" cx="${glowAt[0]}" cy="${glowAt[1]}" r="0.95">
    <stop offset="0" stop-color="${accent}" stop-opacity="${t.glow}"/>
    <stop offset="0.6" stop-color="${accent}" stop-opacity="${t.glow * 0.25}"/>
    <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="24" fill="${t.tile}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="24" fill="url(#${id}-glow)"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="24" fill="none" stroke="${t.border}"/>`;
}

