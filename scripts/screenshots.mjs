// Полностраничные скриншоты ключевых страниц для контроля визуальных регрессий
// при рефакторинге дизайн-системы.
//
// Использование:
//   node scripts/screenshots.mjs <label>              — снять скриншоты _site в screenshots/<label>/
//   node scripts/screenshots.mjs <label> --compare <base> — снять и сравнить с screenshots/<base>/
//
// Перед запуском сайт должен быть собран (npm run build).
// Канвасы скрываются (генеративная графика недетерминирована), анимации отключаются.

import { createServer } from "node:http";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "_site");
const OUT_ROOT = join(ROOT, "screenshots");

const PAGES = [
  "/",
  "/style/",
  "/products/",
  "/projects/",
  "/about/",
  "/cxstrategy/",
  "/sreda/",
  "/dkcp/",
  "/dkcp-base/",
  "/dkcp-checkup/",
  "/ksc/",
  "/ksc-open/",
  "/ksc-full/",
  "/glossary/",
  "/subscribe/",
  "/illustrations/",
  "/landing-template/",
  "/lanit-accelerator/",
  "/projects/dodo-pizza-kids/",
  "/projects/dodo-pizza-kids/dodo-pasta/",
  "/projects/dodo-pizza-kids/wall-attractors/",
  "/projects/autodesk-issledovanie-opyta-pokupki-sapr/",
  "/projects/bank-tochka-issledovanie-korporativnoy-kultury/",
  "/projects/europharma-razrabotka-kontseptsii-darkstorov/",
  "/projects/fk-spartak-issledovanie-opyta-bolelschikov-fanatov-i-sportivnyh-funktsionerov/",
];

const WIDTHS = [390, 1440];

// --all-cases: добавить в обход все собранные страницы кейсов (для этапов,
// трогающих общий case-page.css)
if (process.argv.includes("--all-cases")) {
  const { readdirSync, statSync } = await import("node:fs");
  const projDir = join(SITE, "projects");
  for (const name of readdirSync(projDir)) {
    if (!statSync(join(projDir, name)).isDirectory()) continue;
    const url = `/projects/${name}/`;
    if (!PAGES.includes(url)) PAGES.push(url);
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

function slugify(url) {
  return url === "/" ? "home" : url.replace(/^\/|\/$/g, "").replaceAll("/", "--");
}

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path.endsWith("/")) path += "index.html";
      let file = join(SITE, path);
      if (!existsSync(file) && existsSync(join(SITE, path, "index.html"))) {
        file = join(SITE, path, "index.html");
      }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

async function shoot(label) {
  const { server, port } = await serve();
  const browser = await chromium.launch({ channel: "chrome" });
  const outDir = join(OUT_ROOT, label);
  await mkdir(outDir, { recursive: true });

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const url of PAGES) {
      const target = `http://127.0.0.1:${port}${url}`;
      try {
        let resp;
        try {
          resp = await page.goto(target, { waitUntil: "networkidle", timeout: 20000 });
        } catch {
          // Страницы с бесконечной сетевой активностью (полинг и т.п.) — ждём только load
          resp = await page.goto(target, { waitUntil: "load", timeout: 30000 });
          await page.waitForTimeout(1500);
        }
        if (!resp || !resp.ok()) {
          console.warn(`skip ${url} @${width} (status ${resp ? resp.status() : "none"})`);
          continue;
        }
      } catch (e) {
        console.warn(`skip ${url} @${width} (${e.message.split("\n")[0]})`);
        continue;
      }
      // Догрузить ленивые картинки прокруткой до низа и обратно
      await page.evaluate(async () => {
        await document.fonts.ready;
        const step = window.innerHeight;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
        window.scrollTo(0, 0);
      });
      await page.addStyleTag({
        content: `
          *, *::before, *::after { transition: none !important; animation: none !important; }
          canvas, video { visibility: hidden !important; }
        `,
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(outDir, `${slugify(url)}@${width}.png`), fullPage: true });
      console.log(`ok   ${url} @${width}`);
    }
    await context.close();
  }
  await browser.close();
  server.close();
  return outDir;
}

async function compare(label, base) {
  const { PNG } = await import("pngjs");
  const { default: pixelmatch } = await import("pixelmatch");
  const dirA = join(OUT_ROOT, base);
  const dirB = join(OUT_ROOT, label);
  const diffDir = join(OUT_ROOT, `diff-${base}-vs-${label}`);
  await mkdir(diffDir, { recursive: true });
  const files = (await readdir(dirA)).filter((f) => f.endsWith(".png"));
  let bad = 0;
  for (const f of files) {
    if (!existsSync(join(dirB, f))) {
      console.warn(`missing in ${label}: ${f}`);
      bad++;
      continue;
    }
    const a = PNG.sync.read(readFileSync(join(dirA, f)));
    const b = PNG.sync.read(readFileSync(join(dirB, f)));
    if (a.width !== b.width || a.height !== b.height) {
      console.warn(`SIZE  ${f}: ${a.width}x${a.height} -> ${b.width}x${b.height}`);
      bad++;
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    if (n > 0) {
      writeFileSync(join(diffDir, f), PNG.sync.write(diff));
      console.warn(`DIFF  ${f}: ${n} px (${((n / (a.width * a.height)) * 100).toFixed(3)}%)`);
      bad++;
    } else {
      console.log(`same  ${f}`);
    }
  }
  console.log(bad === 0 ? "\nAll screenshots identical." : `\n${bad} of ${files.length} differ — see ${diffDir}`);
  process.exitCode = bad === 0 ? 0 : 1;
}

const label = process.argv[2];
if (!label) {
  console.error("usage: node scripts/screenshots.mjs <label> [--compare <baseLabel>]");
  process.exit(1);
}
await shoot(label);
const cmpIdx = process.argv.indexOf("--compare");
if (cmpIdx !== -1) await compare(label, process.argv[cmpIdx + 1]);
