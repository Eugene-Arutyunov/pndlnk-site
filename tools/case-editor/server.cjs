const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { parseDocument } = require("htmlparser2");
const root = path.resolve(__dirname, "../..");
const source = path.join(root, "src/projects/inappstory.html");
const preview = path.join(root, "_preview/case-editor-site");
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const plain = (n) =>
  n.type === "text" ? n.data : (n.children || []).map(plain).join("");
const inlineTags = new Set([
  "strong",
  "em",
  "b",
  "i",
  "mark",
  "a",
  "span",
  "br",
  "s",
  "del",
  "sup",
  "sub",
  "small",
  "u",
]);

function contentStart(raw, start) {
  let quote = "";
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return i + 1;
  }
  throw Error("Незакрытый HTML-тег");
}
function onlyInline(n) {
  return (n.children || []).every(
    (c) => c.type === "text" || (inlineTags.has(c.name) && onlyInline(c)),
  );
}
function model(raw = fs.readFileSync(source, "utf8")) {
  const masked = raw.replace(/{#[\s\S]*?#}|{%[\s\S]*?%}|{{[\s\S]*?}}/g, (s) =>
    " ".repeat(s.length),
  );
  const doc = parseDocument(masked, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const blocks = [];
  let section = "Кратко о проекте";
  function walk(n) {
    if (["script", "style", "svg", "template"].includes(n.name)) return;
    if (/^h[12]$/.test(n.name || "") && plain(n).trim())
      section = plain(n).trim();
    if (
      /^(p|li|h[1-6]|figcaption|td|th|dt|dd|div)$/.test(n.name || "") &&
      onlyInline(n) &&
      (n.name !== "div" ||
        n.children.some((c) => c.type === "text" && c.data.trim()))
    ) {
      const start = contentStart(raw, n.startIndex);
      const end = raw.lastIndexOf("</", n.endIndex);
      const html = raw.slice(start, end);
      if (end >= start && plain(n).trim() && !/{[{%#]/.test(html)) {
        blocks.push({
          id: String(start),
          start,
          end,
          section,
          tag: n.name,
          html,
          text: plain(n).trim(),
        });
        return;
      }
    }
    for (const c of n.children || []) walk(c);
  }
  walk(doc);
  return { raw, version: hash(raw), blocks };
}
function validate(html, original) {
  if (typeof html !== "string" || html.length > 100000 || /{[{%#]/.test(html))
    throw Error("Недопустимый текст");
  const attrs = new Set();
  function visit(n, collect) {
    if (n.type === "text" || n.type === "root") {
      for (const c of n.children || []) visit(c, collect);
      return;
    }
    if (!inlineTags.has(n.name))
      throw Error("Используй обычный текст и существующее выделение");
    for (const [k, v] of Object.entries(n.attribs || {})) {
      const key = JSON.stringify([n.name, k, v]);
      if (collect) attrs.add(key);
      else if (!attrs.has(key))
        throw Error("Новые HTML-атрибуты не поддерживаются");
    }
    for (const c of n.children || []) visit(c, collect);
  }
  visit(parseDocument(original), true);
  visit(parseDocument(html), false);
}
function patch(current, inputChanges) {
  if (!Array.isArray(inputChanges)) throw Error("Нет списка правок");
  const seen = new Set();
  const changes = inputChanges.map((change) => {
    const b = current.blocks.find((b) => b.id === change.id);
    if (!b || seen.has(b.id)) throw Error("Неизвестный или повторный блок");
    seen.add(b.id);
    validate(change.html, b.html);
    return { ...b, replacement: change.html };
  });
  let next = current.raw;
  for (const b of changes.sort((a, b) => b.start - a.start))
    next = next.slice(0, b.start) + b.replacement + next.slice(b.end);
  return next;
}
function annotate(raw) {
  let next = raw;
  for (const b of model(raw).blocks.reverse()) {
    const offset = b.start - 1;
    next =
      next.slice(0, offset) + ` data-case-edit="${b.id}"` + next.slice(offset);
  }
  return next;
}
function editorPage(html, version) {
  if (!/^[a-f0-9]{64}$/.test(version))
    throw Error("Неизвестная версия страницы");
  return html
    .replace(
      /<\/head>/i,
      `<meta name="case-editor-version" content="${version}"><link rel="stylesheet" href="/__case-editor/inline.css"><script src="/__case-editor/inline.js" defer></script></head>`,
    )
    .replace(
      /<\/body>/i,
      '<aside id="case-editor-bar" aria-label="Редактирование текста"><span id="case-editor-status" role="status" aria-live="polite">Загрузка редактора…</span><button id="case-editor-save" type="button" disabled>Сохранить</button></aside></body>',
    );
}
function build(outputPath = preview) {
  execFileSync(
    process.execPath,
    [
      path.join(root, "node_modules/@11ty/eleventy/cmd.cjs"),
      "--config=tools/case-editor/eleventy.config.cjs",
      `--output=${outputPath}`,
    ],
    { cwd: root, stdio: "pipe" },
  );
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

function createEditorServer(options = {}) {
  const sourcePath = options.sourcePath || source;
  const outputPath = options.outputPath || preview;
  const backupDir =
    options.backupDir || path.join(root, "_preview/case-editor-backups");
  const rebuild = options.build || (() => build(outputPath));
  const token = crypto.randomBytes(24).toString("hex");
  const currentModel = () => model(fs.readFileSync(sourcePath, "utf8"));
  const server = http.createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      if (req.headers.host !== new URL(origin).host)
        return reply(403, { error: "Недопустимый адрес" });
      const url = new URL(req.url, origin);
      if (url.pathname === "/api/case" && req.method === "GET") {
        const { raw, ...data } = currentModel();
        return reply(200, { ...data, token });
      }
      if (url.pathname === "/api/apply" && req.method === "POST") {
        if (
          req.headers.origin !== origin ||
          req.headers["x-editor-token"] !== token
        )
          return reply(403, { error: "Открой страницу заново" });
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 2000000) throw Error("Слишком большой запрос");
        }
        const input = JSON.parse(body),
          current = currentModel();
        if (input.version !== current.version)
          return reply(409, {
            error:
              "Исходник изменился. Правки остались в браузере; сообщи мне, чтобы перенести их в новую версию.",
          });
        const next = patch(current, input.changes);
        if (next === current.raw) return reply(200, { message: "Сохранено" });
        fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(
          path.join(
            backupDir,
            `inappstory-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.html`,
          ),
          current.raw,
          { flag: "wx" },
        );
        fs.writeFileSync(sourcePath, next);
        try {
          rebuild();
        } catch {
          if (fs.readFileSync(sourcePath, "utf8") === next)
            fs.writeFileSync(sourcePath, current.raw);
          return reply(500, {
            error:
              "Не удалось собрать страницу. Исходник восстановлен, правки остались в браузере.",
          });
        }
        return reply(200, { message: "Сохранено" });
      }
      if (req.method !== "GET")
        return reply(405, { error: "Метод не поддерживается" });
      if (url.pathname === "/") {
        res.writeHead(302, {
          Location: "/projects/inappstory/",
          "Cache-Control": "no-store",
        });
        return res.end();
      }
      let file;
      if (
        ["/__case-editor/inline.js", "/__case-editor/inline.css"].includes(
          url.pathname,
        )
      )
        file = path.join(__dirname, path.basename(url.pathname));
      else {
        file = path.resolve(
          outputPath,
          decodeURIComponent(url.pathname).replace(/^\/+/, ""),
        );
        if (!file.startsWith(path.resolve(outputPath) + path.sep))
          return reply(403, {});
        if (fs.existsSync(file) && fs.statSync(file).isDirectory())
          file = path.join(file, "index.html");
      }
      if (!fs.existsSync(file)) return reply(404, { error: "Файл не найден" });
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(fs.readFileSync(file));
    } catch (e) {
      if (!res.headersSent) reply(400, { error: e.message });
      else res.end();
    }
  });
  return server;
}
if (require.main === module) {
  build();
  const port = Number(process.env.PORT || 4317);
  createEditorServer().listen(port, "127.0.0.1", () =>
    console.log(
      `Редактирование: http://127.0.0.1:${port}/projects/inappstory/`,
    ),
  );
}
module.exports = {
  model,
  validate,
  patch,
  annotate,
  editorPage,
  createEditorServer,
};
