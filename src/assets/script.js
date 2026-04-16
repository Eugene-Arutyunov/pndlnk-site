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

function initPromoViewSwitcher() {
  const container = document.querySelector(".promo-table-container");
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

  const activeDetailButton = Array.from(detailButtons).find((btn) =>
    btn.classList.contains("is-active")
  );
  if (activeDetailButton) {
    switchDetail(activeDetailButton.dataset.promoDetail);
  }
}

function initProjectCatalogFilter() {
  const panel = document.querySelector(".project-catalog-filter");
  if (!panel) return;

  const audienceSel = panel.querySelector("#project-filter-audience");
  const segmentSel = panel.querySelector("#project-filter-segment");
  const statusEl = panel.querySelector("#project-filter-status");
  const cards = document.querySelectorAll(".project-catalog-panel .project-card");

  if (!audienceSel || !segmentSel || cards.length === 0) return;

  const total = cards.length;

  function splitDataset(value) {
    return (value || "").trim().split(/\s+/).filter(Boolean);
  }

  function apply() {
    const aud = audienceSel.value;
    const seg = segmentSel.value;
    let shown = 0;

    cards.forEach((card) => {
      const audList = splitDataset(card.dataset.audience);
      const segList = splitDataset(card.dataset.segment);
      const audOk =
        aud === "all" || (audList.length > 0 && audList.includes(aud));
      const segOk =
        seg === "all" || (segList.length > 0 && segList.includes(seg));
      const visible = audOk && segOk;
      card.classList.toggle("is-hidden", !visible);
      if (visible) shown += 1;
    });

    if (statusEl) {
      const isDefault = aud === "all" && seg === "all";
      statusEl.textContent = isDefault ? String(total) : `${shown} / ${total}`;
    }
  }

  audienceSel.addEventListener("change", apply);
  segmentSel.addEventListener("change", apply);
  apply();
}


// Инициализируем когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStickyObserver();
    initSleepyObserver();
    initLogoDownloads();
    initPromoViewSwitcher();
    initProjectCatalogFilter();
  });
} else {
  initStickyObserver();
  initSleepyObserver();
  initLogoDownloads();
  initPromoViewSwitcher();
  initProjectCatalogFilter();
}
