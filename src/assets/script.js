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

function initPromoRows() {
  const rows = document.querySelectorAll(".promo-row");

  if (rows.length === 0) return;

  rows.forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".promo-row__product-link")) return;
      row.classList.toggle("is-open");
    });

    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        row.classList.toggle("is-open");
      }
    });
  });
}

// Инициализируем когда DOM готов
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStickyObserver();
    initSleepyObserver();
    initLogoDownloads();
    initPromoRows();
  });
} else {
  initStickyObserver();
  initSleepyObserver();
  initLogoDownloads();
  initPromoRows();
}
