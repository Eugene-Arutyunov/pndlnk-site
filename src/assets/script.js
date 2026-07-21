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
    ".promo-table-container:not(.ksc-program-table)"
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

  const rows = container.querySelectorAll(
    ".ksc-program-row:not(.ksc-program-row--static)"
  );

  rows.forEach((row) => {
    row.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) {
        event.preventDefault();
      }
      row.classList.toggle("is-open");
    });
  });

  const detailButtons = container.querySelectorAll("[data-ksc-detail]");
  detailButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-active")) return;

      detailButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      const open = btn.dataset.kscDetail === "full";
      rows.forEach((row) => row.classList.toggle("is-open", open));
    });
  });
}

function setDkcpPreviewActive(preview, blocks) {
  if (!preview) return;

  const active = new Set(blocks.map((block) => String(block).trim()).filter(Boolean));

  preview.querySelectorAll("[data-dkcp-preview-block]").forEach((block) => {
    const isActive = active.has(block.dataset.dkcpPreviewBlock);
    block.setAttribute("fill", isActive ? "currentColor" : "none");
  });

  preview.dataset.dkcpPreviewActive = Array.from(active).join(",");
}

const DKCP_BLOCK_INFO = {
  1: {
    title: "Клиентский сегмент",
    text: "Группа людей или компаний, объединённых по наблюдаемым признакам.",
  },
  2: {
    title: "Мотивационный конфликт",
    text: "Противоречие между драйвером и барьером, с которым живёт клиент.",
  },
  3: {
    title: "Артефакт",
    text: "Набор товаров, услуг и информации для разрешения конфликта.",
  },
  4: {
    title: "Атрибуты артефакта",
    text: "Свойства артефакта, по которым его сравнивают и выбирают.",
  },
  5: {
    title: "Вклад клиента",
    text: "Форма и размер вклада клиента в обмен — деньги и не только.",
  },
  6: {
    title: "Условия обмена",
    text: "Как процесс обмена разворачивается во времени.",
  },
  7: {
    title: "Атрибуты компании",
    text: "Свойства продавца, влияющие на восприятие продукта и доверие.",
  },
  8: {
    title: "Ценность",
    text: "Символический смысл процесса обмена, венчающий всю модель.",
  },
  9: {
    title: "Аргументы",
    text: "Сообщения о взаимосвязи блоков ценностного предложения.",
  },
};

function initKscOutcomes() {
  const root = document.querySelector("[data-ksc-outcomes]");
  if (!root) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const linesLayer = root.querySelector("[data-ksc-outcomes-lines]");
  const sticky = root.querySelector("[data-ksc-outcomes-icon]");
  const icon = sticky?.querySelector(".dkcp-preview");
  const iconSvg = icon?.querySelector(".dkcp-preview-icon");
  const anchors = Array.from(root.querySelectorAll("[data-ksc-outcomes-anchor]"));
  const scenarios = Array.from(root.querySelectorAll("[data-ksc-outcome]"));
  const teamSection = root.querySelector(".ksc-outcomes__section--team");
  const defaultBlocks = [];
  const allBlocks = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  const zones = [
    ...scenarios.map((scenario) => ({
      element: scenario,
      blocks: scenario.dataset.dkcpBlocks?.split(",") || defaultBlocks,
    })),
    teamSection && { element: teamSection, blocks: allBlocks },
  ].filter(Boolean);

  if (!linesLayer || !icon || !iconSvg || anchors.length === 0) return;

  const tooltip = document.createElement("div");
  tooltip.className = "ksc-outcomes__tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  const tooltipTitle = document.createElement("p");
  tooltipTitle.className = "ksc-outcomes__tooltip-title";
  const tooltipText = document.createElement("p");
  tooltipText.className = "ksc-outcomes__tooltip-text";
  tooltip.append(tooltipTitle, tooltipText);
  root.appendChild(tooltip);

  // Невидимый зонд: превращает --ksc-outcomes-line-cut (с calc) в пиксели
  const lineCutProbe = document.createElement("div");
  lineCutProbe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--ksc-outcomes-line-cut);";
  root.appendChild(lineCutProbe);

  function positionTooltip() {
    const rootRect = root.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(root).fontSize) * 0.8;
    tooltip.style.left = `${iconRect.right - rootRect.left + gap}px`;
    tooltip.style.top = `${iconRect.top - rootRect.top}px`;
  }

  iconSvg.querySelectorAll("[data-dkcp-preview-block]").forEach((segment) => {
    segment.addEventListener("mouseenter", () => {
      const info = DKCP_BLOCK_INFO[segment.dataset.dkcpPreviewBlock];
      if (!info) return;

      tooltipTitle.textContent = info.title;
      tooltipText.textContent = info.text;
      positionTooltip();
      tooltip.classList.add("is-visible");
    });

    segment.addEventListener("mouseleave", () => {
      tooltip.classList.remove("is-visible");
    });
  });

  function updateActiveBlocks() {
    const iconRect = icon.getBoundingClientRect();
    const referenceY = iconRect.top + iconRect.height / 2;
    let blocks = defaultBlocks;

    const sorted = zones
      .map((zone) => ({
        ...zone,
        top: zone.element.getBoundingClientRect().top,
      }))
      .sort((a, b) => a.top - b.top);

    for (const zone of sorted) {
      if (referenceY >= zone.top) {
        blocks = zone.blocks;
      }
    }

    setDkcpPreviewActive(icon, blocks);
  }

  function updateLines() {
    const rootRect = root.getBoundingClientRect();
    const iconRect = iconSvg.getBoundingClientRect();
    const startX = iconRect.left + iconRect.width / 2 - rootRect.left;
    const centerY = iconRect.top + iconRect.height / 2 - rootRect.top;
    const startStep = iconRect.height * 0.12;
    const lineCut = lineCutProbe.getBoundingClientRect().width;

    linesLayer.setAttribute("viewBox", `0 0 ${rootRect.width} ${rootRect.height}`);
    linesLayer.replaceChildren();

    anchors.forEach((anchor, index) => {
      const anchorRect = anchor.getBoundingClientRect();
      const anchorX = anchorRect.left + anchorRect.width / 2 - rootRect.left;
      const anchorY = anchorRect.top + anchorRect.height / 2 - rootRect.top;

      const x1 = startX;
      const y1 = centerY + (index - (anchors.length - 1) / 2) * startStep;
      const dx = anchorX - x1;
      const dy = anchorY - y1;
      const length = Math.hypot(dx, dy);
      if (length <= lineCut * 2) return;

      const x2 = anchorX - (dx / length) * lineCut;
      const y2 = anchorY - (dy / length) * lineCut;

      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("class", "ksc-outcomes__connector-line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      linesLayer.appendChild(line);
    });
  }

  function updateLinesVisibility() {
    const stickyRect = sticky.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
    const isStuck = stickyRect.top <= stickyTop + 2;
    const lastAnchorRect = anchors[anchors.length - 1].getBoundingClientRect();
    linesLayer.classList.toggle("is-visible", isStuck && lastAnchorRect.bottom > 0);
  }

  let rafId = null;
  function scheduleUpdate() {
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      updateLines();
      updateActiveBlocks();
      updateLinesVisibility();
      if (tooltip.classList.contains("is-visible")) positionTooltip();
      rafId = null;
    });
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateLines();
  updateActiveBlocks();
  updateLinesVisibility();
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


// Инициализируем когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStickyObserver();
    initSleepyObserver();
    initLogoDownloads();
    initPromoTable();
    initKscProgramTable();
    initKscOutcomes();
    initColorPlates();
    initProjectCatalogFilter();
    initCopyTable();
    initCopyField();
    initLogoViewboxDebug();
  });
} else {
  initStickyObserver();
  initSleepyObserver();
  initLogoDownloads();
  initPromoTable();
  initKscProgramTable();
  initKscOutcomes();
  initColorPlates();
  initProjectCatalogFilter();
  initCopyTable();
  initCopyField();
  initLogoViewboxDebug();
}
