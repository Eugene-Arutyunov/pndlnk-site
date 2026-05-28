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
  }

  audienceSel.addEventListener("change", apply);
  industrySel.addEventListener("change", apply);
  featuredCheckbox.addEventListener("change", apply);
  window.addEventListener("pageshow", apply);
  audienceSel.value = "all";
  industrySel.value = "all";
  featuredCheckbox.checked = false;
  apply();
}


// Инициализируем когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStickyObserver();
    initSleepyObserver();
    initLogoDownloads();
    initPromoTable();
    initKscProgramTable();
    initColorPlates();
    initProjectCatalogFilter();
  });
} else {
  initStickyObserver();
  initSleepyObserver();
  initLogoDownloads();
  initPromoTable();
  initKscProgramTable();
  initColorPlates();
  initProjectCatalogFilter();
}
