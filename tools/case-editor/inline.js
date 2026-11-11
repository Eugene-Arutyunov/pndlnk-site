(async () => {
  const status = document.querySelector("#case-editor-status");
  const saveButton = document.querySelector("#case-editor-save");
  const say = (message) => {
    status.textContent = message;
  };
  const dirty = new Map();
  const groups = new Map();
  const originals = new Map();
  let saving = false;
  let storageOK = true;
  const response = await fetch("/api/case", { cache: "no-store" });
  if (!response.ok)
    throw Error("Не удалось загрузить редактор. Обнови страницу.");
  const data = await response.json();
  if (
    document.querySelector('meta[name="case-editor-version"]')?.content !==
    data.version
  )
    throw Error("Страница устарела. Обнови её перед редактированием.");
  const draftKey = `inappstory-inline:${data.version}`;
  const known = new Set(data.blocks.map((b) => b.id));
  for (const node of document.querySelectorAll("[data-case-edit]")) {
    const id = node.dataset.caseEdit;
    if (!known.has(id)) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(node);
    originals.set(id, node.innerHTML);
  }
  const update = () => {
    saveButton.disabled = saving || dirty.size === 0;
    if (!saving)
      say(
        dirty.size
          ? storageOK
            ? "Есть несохранённые правки"
            : "Не удалось сохранить черновик. Нажми «Сохранить»."
          : "Кликни по тексту, чтобы исправить",
      );
  };
  const store = () => {
    try {
      if (dirty.size)
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            version: data.version,
            changes: [...dirty].map(([id, html]) => ({ id, html })),
          }),
        );
      else localStorage.removeItem(draftKey);
      storageOK = true;
    } catch {
      storageOK = false;
    }
  };
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey) || "null");
    if (draft?.version === data.version && Array.isArray(draft.changes)) {
      for (const { id, html } of draft.changes) {
        if (
          !groups.has(id) ||
          typeof html !== "string" ||
          html === originals.get(id)
        )
          continue;
        dirty.set(id, html);
        for (const node of groups.get(id)) node.innerHTML = html;
      }
    }
  } catch {
    storageOK = false;
  }
  for (const [id, nodes] of groups) {
    for (const node of nodes) {
      node.contentEditable = "true";
      node.spellcheck = true;
      node.addEventListener("input", () => {
        const html = node.innerHTML;
        if (html === originals.get(id)) dirty.delete(id);
        else dirty.set(id, html);
        for (const sibling of nodes)
          if (sibling !== node) sibling.innerHTML = html;
        store();
        update();
      });
      node.addEventListener("paste", (event) => {
        event.preventDefault();
        document.execCommand(
          "insertText",
          false,
          event.clipboardData.getData("text/plain"),
        );
      });
      node.addEventListener("drop", (event) => event.preventDefault());
      node.addEventListener("beforeinput", (event) => {
        if (
          event.inputType.startsWith("format") ||
          event.inputType === "insertOrderedList" ||
          event.inputType === "insertUnorderedList"
        )
          event.preventDefault();
      });
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          document.execCommand("insertLineBreak");
        }
      });
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        if (event.target.closest("a")) event.preventDefault();
      });
    }
  }
  const save = async () => {
    if (saving || !dirty.size) return;
    saving = true;
    saveButton.disabled = true;
    say("Сохраняю…");
    for (const nodes of groups.values())
      for (const node of nodes) node.contentEditable = "false";
    try {
      const result = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Editor-Token": data.token,
        },
        body: JSON.stringify({
          version: data.version,
          changes: [...dirty].map(([id, html]) => ({ id, html })),
        }),
      });
      const body = await result.json();
      if (!result.ok)
        throw Error(
          body.error || "Не удалось сохранить. Правки остались в браузере.",
        );
      dirty.clear();
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* The saved source is authoritative. */
      }
      say("Сохранено");
      try {
        sessionStorage.setItem(
          "inappstory-inline-saved",
          JSON.stringify({ y: window.scrollY }),
        );
      } catch {
        /* Reload still opens the saved source. */
      }
      window.location.reload();
    } catch (error) {
      saving = false;
      for (const nodes of groups.values())
        for (const node of nodes) node.contentEditable = "true";
      saveButton.disabled = false;
      say(error.message);
    }
  };
  saveButton.addEventListener("click", save);
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (!dirty.size) return;
    event.preventDefault();
    event.returnValue = "";
  });
  update();
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("inappstory-inline-saved") || "null",
    );
    if (saved) {
      sessionStorage.removeItem("inappstory-inline-saved");
      window.scrollTo(0, saved.y || 0);
      say("Сохранено");
    }
  } catch {
    /* Optional scroll restoration. */
  }
})().catch((error) => {
  const status = document.querySelector("#case-editor-status");
  if (status) status.textContent = error.message;
});
