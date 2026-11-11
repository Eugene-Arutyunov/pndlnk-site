const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  model,
  patch,
  validate,
  annotate,
  editorPage,
  createEditorServer,
} = require("./server.cjs");
test("edits preserve templates, attributes and all surrounding bytes", () => {
  const raw = `{% set x = '<p>Template value</p>' %}\n<h2>Раздел</h2><p class="intro">Текст <strong>важный</strong> &nbsp; здесь.</p>\n{{ thing }}<p>Ещё текст</p>`;
  const m = model(raw);
  assert.equal(m.blocks.length, 3);
  const b = m.blocks[1];
  const html = "Новый <strong>текст</strong>.";
  assert.equal(
    patch(m, [{ id: b.id, html }]),
    raw.slice(0, b.start) + html + raw.slice(b.end),
  );
  assert.equal(patch(m, []), raw);
  assert.equal(
    patch(m, [
      { id: m.blocks[2].id, html: "Последний" },
      { id: b.id, html },
    ]),
    raw.slice(0, b.start) +
      html +
      raw.slice(b.end, m.blocks[2].start) +
      "Последний" +
      raw.slice(m.blocks[2].end),
  );
});
test("rejects scripts, new attributes, template injections and duplicate blocks", () => {
  for (const html of [
    "<script>alert(1)</script>",
    '<span onclick="alert(1)">x</span>',
    "{{ secret }}",
    '{% include "file" %}',
  ])
    assert.throws(() => validate(html, "text"));
  const m = model("<p>text</p>");
  assert.throws(() =>
    patch(m, [
      { id: m.blocks[0].id, html: "a" },
      { id: m.blocks[0].id, html: "b" },
    ]),
  );
  assert.throws(() => patch(m, [{ id: "wrong", html: "a" }]));
});
test("all case blocks support an unchanged round trip", () => {
  const m = model();
  assert.ok(m.blocks.length > 100);
  assert.equal(
    patch(
      m,
      m.blocks.map((b) => ({ id: b.id, html: b.html })),
    ),
    m.raw,
  );
  for (let i = 1; i < m.blocks.length; i++)
    assert.ok(m.blocks[i].start > m.blocks[i - 1].end);
});

test("inline editing maps repeated text to separate source ranges", () => {
  const raw = "<p>Раз</p><p>Раз</p>";
  assert.equal(
    annotate(raw),
    '<p data-case-edit="3">Раз</p><p data-case-edit="13">Раз</p>',
  );
  assert.equal(
    patch(model(raw), [{ id: "13", html: "Два" }]),
    "<p>Раз</p><p>Два</p>",
  );
});

test("section navigation stays clickable while module descriptions are editable", () => {
  const raw =
    '<div class="title-nav-item"><a href="#module">Модуль</a></div><div class="summary">Описание</div>';
  const marked = annotate(raw);
  assert.ok(
    marked.startsWith(
      '<div class="title-nav-item"><a href="#module">Модуль</a></div>',
    ),
  );
  assert.equal((marked.match(/ data-case-edit=/g) || []).length, 1);
});

test("inline preview leaves template code and container structure untouched", () => {
  const raw = `{% set x = '<p>Не текст страницы</p>' %}<div class="outer"><p title="a > b">Текст <strong>жирный</strong>.</p></div><div class="summary">Описание<br>модуля</div><p>{{ dynamic }}</p>`;
  const marked = annotate(raw);
  assert.equal(marked.replace(/ data-case-edit="\d+"/g, ""), raw);
  assert.equal((marked.match(/ data-case-edit=/g) || []).length, 2);
  const first = model(raw).blocks[0];
  assert.equal(first.html, "Текст <strong>жирный</strong>.");
});

test("saving inline text backs up the source and rejects stale or unauthorised writes", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "case-inline-test-"));
  const sourcePath = path.join(dir, "source.html");
  const outputPath = path.join(dir, "site");
  const backupDir = path.join(dir, "backups");
  const pagePath = path.join(outputPath, "projects/inappstory/index.html");
  const original =
    '<html><head></head><body><p class="intro">Первый <strong>текст</strong>.</p></body></html>';
  fs.writeFileSync(sourcePath, original);
  let failBuild = false;
  const build = () => {
    if (failBuild) throw Error("Failed build");
    fs.mkdirSync(path.dirname(pagePath), { recursive: true });
    const raw = fs.readFileSync(sourcePath, "utf8");
    fs.writeFileSync(pagePath, editorPage(annotate(raw), model(raw).version));
  };
  build();
  const server = createEditorServer({
    sourcePath,
    outputPath,
    backupDir,
    build,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const read = async () => (await fetch(origin + "/api/case")).json();
  const send = (data, headers = {}) =>
    fetch(origin + "/api/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "X-Editor-Token": data.token,
        ...headers,
      },
      body: JSON.stringify(data),
    });
  const initial = await read();
  const changes = [
    { id: initial.blocks[0].id, html: "Новый <strong>текст</strong>." },
  ];
  const denied = await send(
    { ...initial, changes },
    { Origin: "https://other.example" },
  );
  assert.equal(denied.status, 403);
  assert.equal(fs.readFileSync(sourcePath, "utf8"), original);
  const saved = await send({ ...initial, changes });
  assert.equal(saved.status, 200);
  assert.equal(
    fs.readFileSync(sourcePath, "utf8"),
    original.replace("Первый", "Новый"),
  );
  assert.equal(
    fs.readFileSync(path.join(backupDir, fs.readdirSync(backupDir)[0]), "utf8"),
    original,
  );
  const stale = await send({ ...initial, changes });
  assert.equal(stale.status, 409);
  assert.equal(
    fs.readFileSync(sourcePath, "utf8"),
    original.replace("Первый", "Новый"),
  );
  const current = await read();
  failBuild = true;
  const failed = await send({
    ...current,
    changes: [{ id: current.blocks[0].id, html: "Не сохранять" }],
  });
  assert.equal(failed.status, 500);
  assert.equal(
    fs.readFileSync(sourcePath, "utf8"),
    original.replace("Первый", "Новый"),
  );
});
