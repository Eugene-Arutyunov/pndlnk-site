function initStickyObserver() {
  const stickyElement = document.querySelector(".sticky");

  if (!stickyElement) return;

  // Кэшируем значение top для избежания повторных вызовов getComputedStyle
  let cachedStickyTop = parseInt(getComputedStyle(stickyElement).top) || 0;
  let rafId = null;
  let isStuck = false;

  function checkSticky() {
    const rect = stickyElement.getBoundingClientRect();
    const shouldBeStuck = rect.top <= cachedStickyTop;

    if (shouldBeStuck !== isStuck) {
      isStuck = shouldBeStuck;
      if (isStuck) {
        stickyElement.classList.add("stuck");
      } else {
        stickyElement.classList.remove("stuck");
      }
    }
  }

  // Throttled версия через requestAnimationFrame
  function throttledCheckSticky() {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        checkSticky();
        rafId = null;
      });
    }
  }

  // Проверяем при скролле с throttling
  window.addEventListener("scroll", throttledCheckSticky, { passive: true });

  // Проверяем при изменении размера окна (пересчитываем кэш)
  window.addEventListener("resize", () => {
    cachedStickyTop = parseInt(getComputedStyle(stickyElement).top) || 0;
    checkSticky();
  });

  // Проверяем сразу при загрузке
  checkSticky();
}

function initSleepyObserver() {
  const sleepyElements = document.querySelectorAll(".ids__sleepy");

  if (sleepyElements.length === 0) return;

  let observer = new IntersectionObserver(
    (elements) => {
      elements.forEach((el) => {
        if (el.intersectionRatio > 0.3) {
          el.target.classList.remove("is-sleeping");
        } else {
          el.target.classList.add("is-sleeping");
        }
      });
    },
    { threshold: [0, 0.5] }
  );

  sleepyElements.forEach((el) => {
    observer.observe(el);
  });
}

function initLogoDownloads() {
  const downloadPlates = document.querySelectorAll(".download-plate");

  if (downloadPlates.length === 0) return;

  downloadPlates.forEach((plate) => {
    const downloadMenu = plate.querySelector(".download-menu");

    // Обработка ховера
    plate.addEventListener("mouseenter", () => {
      plate.classList.add("hover");
    });

    plate.addEventListener("mouseleave", () => {
      plate.classList.remove("hover");
      if (downloadMenu) {
        downloadMenu.classList.remove("visible");
      }
    });

    // Обработка клика для показа/скрытия меню
    plate.addEventListener("click", (e) => {
      // Предотвращаем закрытие меню при клике на ссылки внутри меню
      if (e.target.closest(".download-menu-plate")) {
        return;
      }

      if (downloadMenu) {
        // Закрываем все остальные меню
        document.querySelectorAll(".download-menu.visible").forEach((menu) => {
          if (menu !== downloadMenu) {
            menu.classList.remove("visible");
          }
        });

        // Переключаем текущее меню
        downloadMenu.classList.toggle("visible");
      }
    });
  });

  // Закрытие меню при клике вне его
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".download-plate")) {
      document.querySelectorAll(".download-menu.visible").forEach((menu) => {
        menu.classList.remove("visible");
      });
    }
  });
}

function initPromoTable() {
  const container = document.querySelector(
    ".promo-table-container:not(.ksc-program-table):not(.case-barriers-table)"
  );
  if (!container) return;

  const viewButtons = container.querySelectorAll("[data-promo-view]");
  const detailButtons = container.querySelectorAll("[data-promo-detail]");

  function switchView(view) {
    container.querySelectorAll("[data-promo-content]").forEach((el) => {
      el.style.display = el.dataset.promoContent === view ? "" : "none";
    });
  }

  function switchDetail(mode) {
    const open = mode === "full";
    container.querySelectorAll(".promo-row").forEach((row) => {
      row.classList.toggle("is-open", open);
    });
  }

  function bindGroup(buttons, callback, dataKey) {
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("is-active")) return;

        buttons.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });

        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");

        callback(btn.dataset[dataKey]);
      });
    });
  }

  bindGroup(viewButtons, switchView, "promoView");
  bindGroup(detailButtons, switchDetail, "promoDetail");
}

function initKscProgramTable() {
  const container = document.querySelector(".ksc-program-table");
  if (!container) return;

  const detailButtons = container.querySelectorAll(
    "[data-ksc-program-table-detail]"
  );

  function switchDetail(mode) {
    const open = mode === "full";
    container.querySelectorAll(".ksc-program-row").forEach((row) => {
      row.classList.toggle("is-open", open);
    });
  }

  detailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-active")) return;

      detailButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });

      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      switchDetail(btn.dataset.kscProgramTableDetail);
    });
  });

  const activeDetailButton = Array.from(detailButtons).find((btn) =>
    btn.classList.contains("is-active")
  );
  if (activeDetailButton) {
    switchDetail(activeDetailButton.dataset.kscProgramTableDetail);
  }

  const productRows = container.querySelectorAll(
    '[data-ksc-program-table-content="products"] .ksc-program-row'
  );
  productRows.forEach((row) => {
    row.classList.add("ksc-program-row--inline-detail");
    row.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) {
        event.preventDefault();
      }
      row.classList.toggle("is-open");
    });
  });
}

function initCaseBarriersTable() {
  const container = document.querySelector(".case-barriers-table");
  if (!container) return;

  const detailButtons = container.querySelectorAll("[data-barriers-detail]");

  function switchDetail(mode) {
    container.dataset.barriersDetail = mode;
    const classByMode = {
      new: "is-new",
      unfixed: "is-unfixed",
      "in-progress": "is-in-progress",
    };
    let n = 0;
    container.querySelectorAll(".case-barrier-row").forEach((row) => {
      const match =
        mode === "all" || row.classList.contains(classByMode[mode]);
      row.hidden = !match;
      if (match) {
        n += 1;
        const numCell = row.querySelector("td");
        if (numCell) numCell.textContent = String(n);
      }
    });
  }

  detailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-active")) return;

      detailButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });

      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      switchDetail(btn.dataset.barriersDetail);
    });
  });

  const activeDetailButton = Array.from(detailButtons).find((btn) =>
    btn.classList.contains("is-active")
  );

  if (activeDetailButton) {
    switchDetail(activeDetailButton.dataset.barriersDetail);
  }
}

function initCaseSspHypothesesTable() {
  const container = document.querySelector(".case-ssp-hypotheses-table");
  if (!container) return;

  const detailButtons = container.querySelectorAll("[data-ssp-hypotheses-detail]");
  const rows = Array.from(container.querySelectorAll(".case-ssp-hypothesis-row"));

  if (detailButtons.length === 0 || rows.length === 0) return;

  const counts = { all: rows.length };
  rows.forEach((row) => {
    const key = row.dataset.sspObject;
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });

  detailButtons.forEach((btn) => {
    const mode = btn.dataset.sspHypothesesDetail;
    const count = counts[mode] || 0;
    const label = btn.textContent.replace(/\s*\(\d+\)\s*$/, "").trim();
    btn.textContent = `${label} (${count})`;
  });

  rows.forEach((row) => {
    if (row.dataset.originalNumber == null) {
      const numCell = row.querySelector("td");
      row.dataset.originalNumber = numCell ? numCell.textContent.trim() : "";
    }
  });

  function switchDetail(mode) {
    container.dataset.sspHypothesesDetail = mode;
    let n = 0;
    rows.forEach((row) => {
      const match = mode === "all" || row.dataset.sspObject === mode;
      row.hidden = !match;
      const numCell = row.querySelector("td");
      if (!numCell) return;
      if (match) {
        n += 1;
        numCell.textContent =
          mode === "all" ? row.dataset.originalNumber : String(n);
      }
    });
  }

  detailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-active")) return;

      detailButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });

      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      switchDetail(btn.dataset.sspHypothesesDetail);
    });
  });

  const activeDetailButton = Array.from(detailButtons).find((btn) =>
    btn.classList.contains("is-active")
  );

  if (activeDetailButton) {
    switchDetail(activeDetailButton.dataset.sspHypothesesDetail);
  }
}

function formatRgbColorValue(color) {
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
  }

  const srgbMatch = color.match(
    /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/
  );
  if (srgbMatch) {
    return `rgb(${Math.round(parseFloat(srgbMatch[1]) * 255)}, ${Math.round(parseFloat(srgbMatch[2]) * 255)}, ${Math.round(parseFloat(srgbMatch[3]) * 255)})`;
  }

  return color;
}

function initColorPlates() {
  const plates = document.querySelectorAll(".guide-color-plate");
  if (plates.length === 0) return;

  plates.forEach((plate) => {
    const btn = plate.querySelector(".guide-color-plate__value");
    if (!btn) return;

    const computed = getComputedStyle(plate).backgroundColor;
    const rgb = formatRgbColorValue(computed);
    btn.textContent = rgb;

    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rgb);
      } catch (error) {
        return;
      }

      const flash = document.createElement("span");
      flash.className = "guide-color-plate__flash";
      flash.textContent = rgb;
      btn.appendChild(flash);
      flash.addEventListener("animationend", () => {
        flash.remove();
      });
    });
  });
}

function initProjectCatalogFilter() {
  const root = document.querySelector(".project-catalog-panel");
  if (!root) return;

  const grid = root.querySelector(".project-grid");
  if (!grid) return;

  const audienceSel = root.querySelector("#project-filter-audience");
  const industrySel = root.querySelector("#project-filter-industry");
  const featuredCheckbox = root.querySelector("#project-filter-featured");
  const statusEl = root.querySelector("#project-filter-status");
  const emptyEl = root.querySelector("#project-catalog-empty");
  const showAllEl = root.querySelector("#project-catalog-show-all");
  const cards = Array.from(grid.querySelectorAll(".project-card"));

  if (!audienceSel || !industrySel || !featuredCheckbox || cards.length === 0)
    return;

  const total = cards.length;

  cards.forEach((card, index) => {
    if (card.dataset.originalOrder == null) {
      card.dataset.originalOrder = String(index);
    }
  });

  function splitDataset(value) {
    return (value || "").trim().split(/\s+/).filter(Boolean);
  }

  function cardMatches(card) {
    const aud = audienceSel.value;
    const ind = industrySel.value;
    const onlyFeatured = featuredCheckbox.checked;

    const audList = splitDataset(card.dataset.audience);
    const indList = splitDataset(card.dataset.industry);
    const isFeatured = card.dataset.featured === "true";

    const audOk =
      aud === "all" || (audList.length > 0 && audList.includes(aud));
    const indOk =
      ind === "all" || (indList.length > 0 && indList.includes(ind));
    const featOk = !onlyFeatured || isFeatured;
    return audOk && indOk && featOk;
  }

  function apply() {
    const aud = audienceSel.value;
    const ind = industrySel.value;
    const onlyFeatured = featuredCheckbox.checked;
    const isFilterActive =
      aud !== "all" || ind !== "all" || onlyFeatured;

    const sorted = [...cards].sort((a, b) => {
      if (!isFilterActive) {
        return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
      }
      const ma = cardMatches(a);
      const mb = cardMatches(b);
      if (ma !== mb) return ma ? -1 : 1;
      return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
    });

    sorted.forEach((c) => grid.appendChild(c));

    let shown = 0;
    sorted.forEach((card) => {
      const m = cardMatches(card);
      if (m) shown += 1;
      card.classList.toggle("is-hidden", isFilterActive && !m);
    });

    if (statusEl) {
      statusEl.textContent = isFilterActive ? `${shown} / ${total}` : String(total);
    }

    if (emptyEl) {
      emptyEl.hidden = !(isFilterActive && shown === 0);
    }

    if (showAllEl) {
      showAllEl.hidden = !isFilterActive;
    }
  }

  function showAll() {
    audienceSel.value = "all";
    industrySel.value = "all";
    featuredCheckbox.checked = false;
    apply();
  }

  audienceSel.addEventListener("change", apply);
  industrySel.addEventListener("change", apply);
  featuredCheckbox.addEventListener("change", apply);
  if (showAllEl) showAllEl.addEventListener("click", showAll);
  window.addEventListener("pageshow", apply);
  const defaultFeatured = root.dataset.defaultFeatured === "true";
  audienceSel.value = "all";
  industrySel.value = "all";
  featuredCheckbox.checked = defaultFeatured;
  apply();
}

function initInitiativeCatalogFilter() {
  const root = document.querySelector(".initiative-catalog-panel");
  if (!root) return;

  const grid = root.querySelector(".initiative-grid");
  if (!grid) return;

  const sphereSel = root.querySelector("#initiative-filter-sphere");
  const featuredCheckbox = root.querySelector("#initiative-filter-featured");
  const statusEl = root.querySelector("#initiative-filter-status");
  const showAllEl = root.querySelector("#initiative-catalog-show-all");
  const cards = Array.from(grid.querySelectorAll(".initiative-card"));

  if (!sphereSel || !featuredCheckbox || cards.length === 0) return;

  const total = cards.length;

  cards.forEach((card, index) => {
    if (card.dataset.originalOrder == null) {
      card.dataset.originalOrder = String(index);
    }
  });

  function splitDataset(value) {
    return (value || "").trim().split(/\s+/).filter(Boolean);
  }

  function cardMatches(card) {
    const sphere = sphereSel.value;
    const onlyFeatured = featuredCheckbox.checked;

    const sphereList = splitDataset(card.dataset.sphere);
    const isFeatured = card.dataset.featured === "true";

    const sphereOk =
      sphere === "all" || (sphereList.length > 0 && sphereList.includes(sphere));
    const featOk = !onlyFeatured || isFeatured;
    return sphereOk && featOk;
  }

  function apply() {
    const sphere = sphereSel.value;
    const onlyFeatured = featuredCheckbox.checked;
    const isFilterActive = sphere !== "all" || onlyFeatured;

    const sorted = [...cards].sort((a, b) => {
      if (!isFilterActive) {
        return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
      }
      const ma = cardMatches(a);
      const mb = cardMatches(b);
      if (ma !== mb) return ma ? -1 : 1;
      return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
    });

    sorted.forEach((c) => grid.appendChild(c));

    let shown = 0;
    sorted.forEach((card) => {
      const m = cardMatches(card);
      if (m) shown += 1;
      card.classList.toggle("is-hidden", isFilterActive && !m);
    });

    if (statusEl) {
      statusEl.textContent = isFilterActive ? `${shown} / ${total}` : String(total);
    }

    if (showAllEl) {
      showAllEl.hidden = !isFilterActive;
    }
  }

  function showAll() {
    sphereSel.value = "all";
    featuredCheckbox.checked = false;
    apply();
  }

  sphereSel.addEventListener("change", apply);
  featuredCheckbox.addEventListener("change", apply);
  if (showAllEl) showAllEl.addEventListener("click", showAll);
  window.addEventListener("pageshow", apply);
  sphereSel.value = "all";
  featuredCheckbox.checked = false;
  apply();
}

function initCopyTable() {
  const template = document.querySelector(".copy-table__icon-template");
  if (!template) return;

  const copyClasses = {
    flash: "copy-table__flash",
    flashText: "copy-table__flash-text",
    value: "copy-table__value",
  };

  document.querySelectorAll(".copy-table").forEach((table) => {
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row, rowIndex) => {
      if (rowIndex === rows.length - 1) return;

      const cell = row.querySelector("td:last-child");
      if (!cell || cell.querySelector(".copy-table__icon")) return;

      const value = document.createElement("span");
      value.className = "copy-table__value";
      while (cell.firstChild) {
        value.appendChild(cell.firstChild);
      }
      cell.appendChild(value);

      cell.classList.add("copy-table__cell");
      if (!appendCopyIcon(cell, ".copy-table__icon-template", ".copy-table__icon")) {
        return;
      }

      cell.addEventListener(
        "click",
        copyFromContainer(cell, {
          valueSelector: ".copy-table__value",
          classes: copyClasses,
        }),
      );
    });
  });
}

function initCopyField() {
  const template = document.querySelector(".copy-field__icon-template");
  if (!template) return;

  const copyClasses = {
    flash: "copy-field__flash",
    flashText: "copy-field__flash-text",
    value: "copy-field__value",
  };

  document.querySelectorAll(".copy-field").forEach((field) => {
    const value = field.querySelector(".copy-field__value");
    if (!value) return;

    if (!appendCopyIcon(field, ".copy-field__icon-template", ".copy-field__icon")) {
      return;
    }

    field.addEventListener(
      "click",
      copyFromContainer(field, {
        valueSelector: ".copy-field__value",
        classes: copyClasses,
      }),
    );
  });
}

function initLogoViewboxDebug() {
  document.addEventListener("keydown", (e) => {
    if (e.code !== "KeyB" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable='true']")) return;

    e.preventDefault();
    document.body.classList.toggle("logo-viewbox-debug");
  });
}

function initCaseToc() {
  const nav = document.querySelector(".case-toc");
  if (!nav) return;

  const headings = Array.from(document.querySelectorAll(".case-toc-target"));
  if (headings.length === 0) return;

  const start = document.querySelector(".case-toc-start") || headings[0];
  const footer = document.querySelector("footer");
  const links = [];
  const TOP_RATIO = 0.16;
  const FOOTER_GAP = 24;
  const MIN_HEIGHT = 48;

  headings.forEach((heading, index) => {
    const id = heading.id || `case-toc-${index}`;
    heading.id = id;

    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = heading.getAttribute("data-toc") || heading.textContent.trim();
    nav.append(link);
    links.push({ heading, link });
  });

  function updatePlacement() {
    const top = window.innerHeight * TOP_RATIO;
    let maxHeight = window.innerHeight * 0.68;
    let hasRoom = true;

    if (footer) {
      const available = footer.getBoundingClientRect().top - top - FOOTER_GAP;
      maxHeight = Math.min(maxHeight, available);
      hasRoom = maxHeight >= MIN_HEIGHT;
    }

    nav.style.top = `${top}px`;
    nav.style.maxHeight = `${Math.max(0, maxHeight)}px`;

    const pastStart = start.getBoundingClientRect().top <= top + 8;
    nav.classList.toggle("is-visible", pastStart && hasRoom);
  }

  window.addEventListener("scroll", updatePlacement, { passive: true });
  window.addEventListener("resize", updatePlacement);
  updatePlacement();

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length === 0) return;

      const activeId = visible[0].target.id;
      links.forEach(({ heading, link }) => {
        link.classList.toggle("is-active", heading.id === activeId);
      });
    },
    {
      rootMargin: "-15% 0px -65% 0px",
      threshold: 0,
    },
  );

  headings.forEach((heading) => observer.observe(heading));
}

function initCaseFieldPromoTranscripts() {
  const transcripts = document.querySelectorAll(".case-field-promo-transcript");
  if (transcripts.length === 0) return;

  const EPS = 1;

  function clearChildStyles(child) {
    child.hidden = false;
    child.style.removeProperty("-webkit-line-clamp");
    child.style.removeProperty("display");
    child.style.removeProperty("-webkit-box-orient");
    child.style.removeProperty("overflow");
  }

  function elementFits(el, maxBottom) {
    const rects = el.getClientRects();
    if (rects.length === 0) return true;

    for (const rect of rects) {
      if (rect.bottom > maxBottom + EPS) return false;
    }

    return true;
  }

  function maxParagraphLines(el, maxBottom) {
    el.style.display = "-webkit-box";
    el.style.webkitBoxOrient = "vertical";
    el.style.overflow = "hidden";

    let lo = 1;
    let hi = 500;
    let best = 0;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      el.style.webkitLineClamp = String(mid);

      if (elementFits(el, maxBottom)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return best;
  }

  function trimTranscript(transcript) {
    Array.from(transcript.children).forEach(clearChildStyles);

    const maxBottom = transcript.getBoundingClientRect().bottom;

    for (let i = 0; i < transcript.children.length; i++) {
      const child = transcript.children[i];

      if (elementFits(child, maxBottom)) continue;

      if (child.tagName === "P") {
        const lines = maxParagraphLines(child, maxBottom);

        if (lines === 0) {
          clearChildStyles(child);
          child.hidden = true;
        } else {
          child.style.webkitLineClamp = String(lines);
        }
      } else {
        clearChildStyles(child);
        child.hidden = true;
      }

      for (let j = i + 1; j < transcript.children.length; j++) {
        clearChildStyles(transcript.children[j]);
        transcript.children[j].hidden = true;
      }

      break;
    }

    transcript.classList.add("case-field-promo-transcript--ready");
  }

  let rafId = null;

  function scheduleTrim() {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      transcripts.forEach(trimTranscript);
    });
  }

  scheduleTrim();

  const observer = new ResizeObserver(scheduleTrim);
  transcripts.forEach((transcript) => observer.observe(transcript));

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleTrim);
  }
}


// Инициализируем когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStickyObserver();
    initSleepyObserver();
    initLogoDownloads();
    initPromoTable();
    initKscProgramTable();
    initCaseBarriersTable();
    initCaseSspHypothesesTable();
    initColorPlates();
    initProjectCatalogFilter();
    initInitiativeCatalogFilter();
    initCopyTable();
    initCopyField();
    initLogoViewboxDebug();
    initCaseToc();
    initCaseFieldPromoTranscripts();
  });
} else {
  initStickyObserver();
  initSleepyObserver();
  initLogoDownloads();
  initPromoTable();
  initKscProgramTable();
  initCaseBarriersTable();
  initCaseSspHypothesesTable();
  initColorPlates();
  initProjectCatalogFilter();
  initInitiativeCatalogFilter();
  initCopyTable();
  initCopyField();
  initLogoViewboxDebug();
  initCaseToc();
  initCaseFieldPromoTranscripts();
}
