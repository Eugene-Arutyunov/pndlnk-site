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
    // Класс позволяет CSS красить активные зоны в цвета палитры ДКЦП
    block.classList.toggle("is-active", isActive);
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
    text: "Противоречие между драйвером и\u00A0барьером, с\u00A0которым живёт клиент.",
  },
  3: {
    title: "Артефакт",
    text: "Набор товаров, услуг и\u00A0информации для разрешения конфликта.",
  },
  4: {
    title: "Атрибуты артефакта",
    text: "Свойства артефакта, по которым его сравнивают и\u00A0выбирают.",
  },
  5: {
    title: "Вклад клиента",
    text: "Форма и\u00A0размер вклада клиента в\u00A0обмен — деньги и\u00A0не\u00A0только.",
  },
  6: {
    title: "Условия обмена",
    text: "Как процесс обмена разворачивается во времени.",
  },
  7: {
    title: "Атрибуты компании",
    text: "Свойства продавца, влияющие на восприятие продукта и\u00A0доверие.",
  },
  8: {
    title: "Ценность",
    text: "Символический смысл процесса обмена.",
  },
  9: {
    title: "Аргументы",
    text: "Сообщения о\u00A0взаимосвязи блоков ценностного предложения.",
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
  const defaultBlocks = [];

  const zones = scenarios.map((scenario) => ({
    element: scenario,
    blocks: scenario.dataset.dkcpBlocks?.split(",") || defaultBlocks,
  }));

  if (!linesLayer || !icon || !iconSvg || anchors.length === 0) return;

  const tooltip = document.createElement("div");
  tooltip.className = "ksc-outcomes__tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  const tooltipTitle = document.createElement("p");
  tooltipTitle.className = "ksc-outcomes__tooltip-title";
  const tooltipText = document.createElement("p");
  tooltipText.className = "ksc-outcomes__tooltip-text";
  tooltip.append(tooltipTitle, tooltipText);
  sticky.appendChild(tooltip);

  // Невидимый зонд: превращает --ksc-outcomes-line-cut (с calc) в пиксели
  const lineCutProbe = document.createElement("div");
  lineCutProbe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--ksc-outcomes-line-cut);";
  root.appendChild(lineCutProbe);

  // Невидимые расширенные хит-зоны поверх блоков: широкий прозрачный штрих
  // закрывает щели между блоками, чтобы ховер переключался без просветов
  iconSvg.querySelectorAll("[data-dkcp-preview-block]").forEach((block) => {
    const hit = block.cloneNode(false);
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("stroke", "transparent");
    hit.setAttribute("stroke-width", "40");
    hit.setAttribute("pointer-events", "all");
    iconSvg.appendChild(hit);
  });

  // Ховер связывает три вещи: блок иконки, термины в тексте и тултип.
  // Работает в обе стороны — с блока иконки и с термина в тексте
  const terms = Array.from(root.querySelectorAll(".dkcp-term"));
  const termBlock = (term) => {
    const match = Array.from(term.classList).find((cls) =>
      /^dkcp-term--\d+$/.test(cls)
    );
    return match ? match.slice("dkcp-term--".length) : null;
  };

  function setBlockHover(block, isHovered) {
    iconSvg
      .querySelectorAll(`[data-dkcp-preview-block="${block}"]`)
      .forEach((el) => el.classList.toggle("is-hovered", isHovered));

    terms.forEach((term) => {
      if (termBlock(term) === block) {
        term.classList.toggle("is-hovered", isHovered);
      }
    });

    const info = DKCP_BLOCK_INFO[block];
    if (!info) return;

    if (isHovered) {
      tooltipTitle.textContent = info.title;
      tooltipText.textContent = info.text;
    }
    tooltip.classList.toggle("is-visible", isHovered);
  }

  iconSvg.querySelectorAll("[data-dkcp-preview-block]").forEach((segment) => {
    const block = segment.dataset.dkcpPreviewBlock;
    segment.addEventListener("mouseenter", () => setBlockHover(block, true));
    segment.addEventListener("mouseleave", () => setBlockHover(block, false));
  });

  terms.forEach((term) => {
    const block = termBlock(term);
    if (!block) return;
    term.addEventListener("mouseenter", () => setBlockHover(block, true));
    term.addEventListener("mouseleave", () => setBlockHover(block, false));
  });

  function updateActiveBlocks() {
    // Иконка переключается, когда верх блока пересекает середину экрана
    const referenceY = window.innerHeight / 2;
    let activeIndex = -1;

    const sorted = zones
      .map((zone) => {
        const rect = zone.element.getBoundingClientRect();
        return { ...zone, top: rect.top, bottom: rect.bottom };
      })
      .sort((a, b) => a.top - b.top);

    sorted.forEach((zone, index) => {
      if (referenceY >= zone.top) {
        activeIndex = index;
      }
    });

    // Когда последняя зона целиком уехала выше середины экрана — сброс
    const lastZone = sorted[sorted.length - 1];
    if (lastZone && referenceY > lastZone.bottom) {
      activeIndex = -1;
    }

    const activeZone = activeIndex >= 0 ? sorted[activeIndex] : null;
    setDkcpPreviewActive(icon, activeZone ? activeZone.blocks : defaultBlocks);

    // Видны линии активного сценария и его соседей сверху и снизу:
    // линия, тянущаяся к далёкому сценарию, читается как шум
    const visible = new Set(
      activeIndex >= 0
        ? sorted
            .slice(Math.max(0, activeIndex - 1), activeIndex + 2)
            .map((zone) => zone.element)
        : []
    );
    lines.forEach((line, index) => {
      line.classList.toggle("is-active", visible.has(anchorScenarios[index]));
    });
  }

  // Линия приходит в центр главного блока сценария (первого в data-dkcp-blocks)
  const anchorStartElements = anchors.map((anchor) => {
    const mainBlock = anchor
      .closest("[data-ksc-outcome]")
      ?.dataset.dkcpBlocks?.split(",")[0]
      ?.trim();
    return (
      (mainBlock &&
        iconSvg.querySelector(`[data-dkcp-preview-block="${mainBlock}"]`)) ||
      iconSvg
    );
  });

  // Линии создаются один раз и живут постоянно: на скролле обновляются
  // только координаты, поэтому фейд появления/переключения не сбрасывается
  const anchorScenarios = anchors.map((anchor) =>
    anchor.closest("[data-ksc-outcome]")
  );
  const lines = anchors.map(() => {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("class", "ksc-outcomes__connector-line");
    linesLayer.appendChild(line);
    return line;
  });

  function updateLines() {
    // Координаты — относительно слоя линий внутри застиканной колонки:
    // конец линии на иконке не зависит от момента перерисовки при скролле.
    // Без viewBox: координаты — просто пиксели. С viewBox изменение высоты
    // слоя (тултип под иконкой) масштабировало линии, и они дёргались
    const layerRect = linesLayer.getBoundingClientRect();
    const lineCut = lineCutProbe.getBoundingClientRect().width;

    anchors.forEach((anchor, index) => {
      const line = lines[index];
      const anchorRect = anchor.getBoundingClientRect();
      const anchorX = anchorRect.left + anchorRect.width / 2 - layerRect.left;
      const anchorY = anchorRect.top + anchorRect.height / 2 - layerRect.top;

      const startRect = anchorStartElements[index].getBoundingClientRect();
      const x1 = startRect.left + startRect.width / 2 - layerRect.left;
      const y1 = startRect.top + startRect.height / 2 - layerRect.top;
      const dx = anchorX - x1;
      const dy = anchorY - y1;
      const length = Math.hypot(dx, dy);
      if (length <= lineCut * 2) {
        line.style.display = "none";
        return;
      }
      line.style.display = "";

      const x2 = anchorX - (dx / length) * lineCut;
      const y2 = anchorY - (dy / length) * lineCut;

      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
    });
  }

  function updateLinesVisibility() {
    const stickyRect = sticky.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(sticky).top) || 0;
    const isStuck = stickyRect.top <= stickyTop + 2;
    const lastAnchorRect = anchors[anchors.length - 1].getBoundingClientRect();
    const pastEnd = lastAnchorRect.bottom <= 0;
    linesLayer.classList.toggle("is-visible", isStuck && !pastEnd);
    // Иконка прячется и возвращается синхронно с линиями
    icon.classList.toggle("is-hidden", pastEnd);
  }

  // Без rAF-оттяжки: линии должны перерисовываться синхронно со скроллом,
  // иначе плавает точка прихода линии на иконке
  function update() {
    updateLines();
    updateActiveBlocks();
    updateLinesVisibility();
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

function initCaseJobsTable() {
  document
    .querySelectorAll(".case-jobs-table .case-jobs-row--expandable")
    .forEach((row) => {
      const details = row.querySelector(".case-job-details");
      if (!details) return;

      row.addEventListener("click", (event) => {
        if (event.target.closest("summary")) return;
        if (event.target.closest("a")) return;
        details.open = !details.open;
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
    container.querySelectorAll(".case-barrier-row").forEach((row) => {
      const match =
        mode === "all" || row.classList.contains(classByMode[mode]);
      row.hidden = !match;
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

  function switchDetail(mode) {
    container.dataset.sspHypothesesDetail = mode;
    rows.forEach((row) => {
      const match = mode === "all" || row.dataset.sspObject === mode;
      row.hidden = !match;
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

/* Плашки цветов на /style теперь рендерит tokens-dump.js из живого CSS */

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
    initCaseJobsTable();
    initCaseBarriersTable();
    initCaseSspHypothesesTable();
    initKscOutcomes();
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
  initCaseJobsTable();
  initCaseBarriersTable();
  initCaseSspHypothesesTable();
  initKscOutcomes();
  initProjectCatalogFilter();
  initInitiativeCatalogFilter();
  initCopyTable();
  initCopyField();
  initLogoViewboxDebug();
  initCaseToc();
  initCaseFieldPromoTranscripts();
}
