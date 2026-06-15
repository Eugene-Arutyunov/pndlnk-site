#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CLIENTS_DIR = path.join(ROOT, "src/assets/clients");
const OUT_DIR = path.join(ROOT, "src/includes/assets/client-logos");
const TINTS_OUT = path.join(ROOT, "src/data/clientLogoCoverTints.js");
const DKCP_TOCHKA = path.join(ROOT, "src/assets/dkcp-base/logos/ТОЧКА.svg");

const MONO_SLUGS = new Set(["lanit", "sokolov"]);

const LOGO_BY_COMPANY = {
  autodesk: "Autodesk.svg",
  cosmobeauty: "Cosmobeauty.PNG",
  datadarvin: "DataDarvin.png",
  dodo: "dodo.png",
  europharma: "Europharma.svg",
  "fk-spartak": "Спартак.svg",
  floris: "Floristea.svg",
  "gora-belaya": "Гора Белая.png",
  inappstory: "InAppStory.svg",
  kontur: "Контур.svg",
  lanit: "Ланит.svg",
  "leroy-merlin": "ЛЕРУА МЕРЛЕН.svg",
  magnit: "Магнит.svg",
  maskoholic: "Maskoholic.svg",
  mango: "Mango Office.svg",
  mavt: "МАВТ-Винотека.svg",
  megafon: "МегаФон.svg",
  mts: "МТС.svg",
  netangels: "NetAngels.svg",
  perekrestok: "Х5.svg",
  pik: "ПИК.svg",
  pyaterochka: "Пятёрочка.svg",
  rembot: "Rembot.svg",
  rolf: "РОЛЬФ.svg",
  "rmk-arena": "РМК.svg",
  "roza-khutor": "Роза Хутор.svg",
  sbermarket: "Сбермаркет.png",
  sdvet: "СДСВЕТ.png",
  seniorgroup: "Senior Group.svg",
  shalash: "Shalash.svg",
  sipuni: "Sipuni.svg",
  sokolov: "SOKOLOV.svg",
  streets: "Streets.svg",
  "strana-development": "Страна.svg",
  t2: "T2.svg",
  tochka: "__dkcp__",
  tutu: "Tutu.svg",
  unicorngo: "UnicornGO.svg",
  vkusvill: "Вкусвилл.svg",
  "x5-club": "Х5.svg",
  yandex: "ЯНДЕКС.svg",
};

function parseHexColor(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHexColor(rgb) {
  return `#${rgb.map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function isNeutralRgb(rgb) {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 18 && max > 200) return true;
  if (delta < 18 && max < 45) return true;
  if (delta < 28 && max < 150 && min > 50) return true;
  return false;
}

function normalizeFillColor(raw) {
  if (!raw) return null;
  const c = String(raw).trim().toLowerCase();
  if (["none", "transparent", "currentcolor", "inherit"].includes(c)) return null;
  if (["white", "#fff", "#ffffff", "black", "#000", "#000000"].includes(c)) {
    return null;
  }
  if (c.startsWith("url(")) return null;
  if (c.startsWith("#")) {
    const rgb = parseHexColor(c);
    if (!rgb || isNeutralRgb(rgb)) return null;
    return toHexColor(rgb);
  }
  const rgbMatch = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const rgb = [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
    if (isNeutralRgb(rgb)) return null;
    return toHexColor(rgb);
  }
  return null;
}

function extractCoverTintRgb(svg) {
  const classFills = {};
  for (const match of svg.matchAll(/\.([a-z0-9_-]+)\s*\{[^}]*fill:\s*([^;}\s]+)/gi)) {
    const color = normalizeFillColor(match[2]);
    if (color) classFills[match[1].toLowerCase()] = color;
  }

  const counts = new Map();
  const add = (color, weight = 1) => {
    if (!color) return;
    counts.set(color, (counts.get(color) || 0) + weight);
  };

  for (const match of svg.matchAll(/fill=['"]([^'"]+)['"]/gi)) {
    add(normalizeFillColor(match[1]), 1);
  }
  for (const match of svg.matchAll(/fill:([^;}\s]+)/gi)) {
    add(normalizeFillColor(match[1]), 1);
  }
  for (const match of svg.matchAll(/class=['"]([^'"]+)['"]/gi)) {
    for (const cls of match[1].split(/\s+/)) {
      if (classFills[cls.toLowerCase()]) add(classFills[cls.toLowerCase()], 2);
    }
  }
  for (const match of svg.matchAll(/stop-color=['"]([^'"]+)['"]/gi)) {
    add(normalizeFillColor(match[1]), 0.3);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;

  const [, topWeight] = sorted[0];
  const secondWeight = sorted[1]?.[1] || 0;
  if (topWeight < 1) return null;
  if (secondWeight && secondWeight / topWeight > 0.7) return null;

  const strongColors = sorted.filter(([, weight]) => weight / topWeight >= 0.35);
  if (strongColors.length >= 3) return null;

  const rgb = parseHexColor(sorted[0][0]);
  return rgb ? rgb.join(", ") : null;
}

function toMonoSvg(svg) {
  let s = svg;
  s = s.replace(/fill:\s*#fff(?:fff)?\b/gi, "fill:currentColor");
  s = s.replace(/fill:\s*white\b/gi, "fill:currentColor");
  s = s.replace(/fill="white"/gi, 'fill="currentColor"');
  s = s.replace(/fill="#fff"/gi, 'fill="currentColor"');
  s = s.replace(/fill="#ffffff"/gi, 'fill="currentColor"');
  s = s.replace(/fill="#FFFFFF"/gi, 'fill="currentColor"');
  if (!/fill="currentColor"/i.test(s) && !/fill:\s*currentColor/i.test(s)) {
    s = s.replace(/<svg\b/, '<svg fill="currentColor"');
  }
  return s;
}

function unwrapSymbolSvg(svg) {
  const symbolMatch = svg.match(/<(?:[\w-]+:)?symbol\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?symbol>/i);
  if (!symbolMatch) return svg;

  const inner = symbolMatch[1].trim();
  const symbolTag = symbolMatch[0].match(/<(?:[\w-]+:)?symbol\b([^>]*)>/i)?.[1] || "";
  const viewBoxMatch = symbolTag.match(/viewBox="([^"]+)"/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

  let out = svg.replace(/<(?:[\w-]+:)?symbol\b[^>]*>[\s\S]*?<\/(?:[\w-]+:)?symbol>/i, inner);
  out = out.replace(/xmlns:[\w-]+="[^"]*"/g, "");
  if (viewBox) {
    out = out.replace(/<svg\b([^>]*)>/i, (full, attrs) => {
      if (/viewBox=/i.test(attrs)) return full;
      return `<svg${attrs} viewBox="${viewBox}">`;
    });
  }
  return out;
}

function inlineSvgClassStyles(svg) {
  const classFills = {};
  for (const match of svg.matchAll(/\.([a-z0-9_-]+)\s*\{[^}]*fill:\s*([^;}\s]+)/gi)) {
    classFills[match[1]] = match[2];
  }
  const classClipPaths = {};
  for (const match of svg.matchAll(/\.([a-z0-9_-]+)\s*\{[^}]*clip-path:\s*([^;}]+)/gi)) {
    classClipPaths[match[1].trim()] = match[2].trim();
  }
  if (
    Object.keys(classFills).length === 0 &&
    Object.keys(classClipPaths).length === 0
  ) {
    return svg;
  }

  let out = svg;
  for (const [cls, fill] of Object.entries(classFills)) {
    out = out.replace(
      /<(path|polygon|rect|circle|ellipse|polyline)\b([^>]*)\/?>/gi,
      (full, tag, attrs) => {
        const classMatch = attrs.match(
          new RegExp(`\\bclass=(["'])((?:[^'"]*\\s)?${cls}(?:\\s[^'"]*)?)\\1`, "i"),
        );
        if (!classMatch || /fill\s*=/i.test(attrs)) return full;
        return `<${tag} fill="${fill}"${attrs}>`;
      },
    );
  }
  for (const [cls, clip] of Object.entries(classClipPaths)) {
    out = out.replace(
      /<(g|path|polygon|rect|circle|ellipse|polyline|use)\b([^>]*?)>/gi,
      (full, tag, attrs) => {
        const classMatch = attrs.match(
          new RegExp(`\\bclass=(["'])((?:[^'"]*\\s)?${cls}(?:\\s[^'"]*)?)\\1`, "i"),
        );
        if (!classMatch || /clip-path\s*=/i.test(attrs)) return full;
        return `<${tag} clip-path="${clip}"${attrs}>`;
      },
    );
  }

  out = out.replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>/gi, "");
  out = out.replace(/<style>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<defs>\s*<\/defs>/gi, "");
  return out;
}

function addSvgDimensionsFromViewBox(svg) {
  if (/\bwidth\s*=/i.test(svg)) return svg;
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return svg;
  const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n <= 0)) return svg;
  const width = parts[2];
  const height = parts[3];
  const aspect = width / height;
  if (aspect > 4 || aspect < 0.25) return svg;
  return svg.replace(/<svg\b/, `<svg width="${width}" height="${height}"`);
}

function normalizeSvg(svg) {
  let s = svg.trim();
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = unwrapSymbolSvg(s);
  s = inlineSvgClassStyles(s);
  s = addSvgDimensionsFromViewBox(s);
  if (!/aria-hidden/i.test(s)) {
    s = s.replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"');
  }
  return s.trim();
}

function writeInclude(slug, body) {
  const file = path.join(OUT_DIR, `${slug}.html`);
  fs.writeFileSync(file, body + "\n", "utf8");
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const coverTints = {};

for (const [slug, source] of Object.entries(LOGO_BY_COMPANY)) {
  if (MONO_SLUGS.has(slug)) continue;

  if (source === "__dkcp__") {
    coverTints[slug] = extractCoverTintRgb(fs.readFileSync(DKCP_TOCHKA, "utf8"));
    continue;
  }

  if (!source.toLowerCase().endsWith(".svg")) continue;

  const srcPath = path.join(CLIENTS_DIR, source);
  if (!fs.existsSync(srcPath)) continue;

  coverTints[slug] = extractCoverTintRgb(fs.readFileSync(srcPath, "utf8"));
}

for (const [slug, source] of Object.entries(LOGO_BY_COMPANY)) {
  if (source === "__dkcp__") {
    const svg = normalizeSvg(fs.readFileSync(DKCP_TOCHKA, "utf8"));
    writeInclude(slug, svg);
    continue;
  }

  const ext = path.extname(source).toLowerCase();
  const srcPath = path.join(CLIENTS_DIR, source);
  if (!fs.existsSync(srcPath)) {
    console.warn("skip missing", slug, source);
    continue;
  }

  if (ext === ".svg") {
    let svg = normalizeSvg(fs.readFileSync(srcPath, "utf8"));
    if (MONO_SLUGS.has(slug)) svg = toMonoSvg(svg);
    writeInclude(slug, svg);
    continue;
  }

  const url = `/assets/clients/${encodeURI(source)}`;
  writeInclude(slug, `<img src="${url}" alt="" />`);
}

const tintLines = Object.entries(coverTints)
  .filter(([, rgb]) => rgb)
  .map(([slug, rgb]) => `  "${slug}": "${rgb}",`)
  .join("\n");

fs.writeFileSync(
  TINTS_OUT,
  `// Generated by scripts/generate-client-logo-includes.js — do not edit\nmodule.exports = {\n${tintLines}\n};\n`,
  "utf8",
);

console.log("generated", fs.readdirSync(OUT_DIR).length, "includes");
console.log("cover tints", Object.values(coverTints).filter(Boolean).length);
