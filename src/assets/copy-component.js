function getCopyText(container, valueSelector) {
  const value = container.querySelector(valueSelector);
  return (value ? value.textContent : container.textContent).trim();
}

function showCopyFlash(container, text, classes) {
  container.querySelector(`.${classes.flash}`)?.remove();
  container.classList.remove("is-copying-animate-in");
  container.classList.add("is-copying");

  const flashEl = document.createElement("span");
  flashEl.className = classes.flash;

  const flashTextEl = document.createElement("span");
  flashTextEl.className = classes.flashText;
  flashTextEl.textContent = text;
  flashEl.appendChild(flashTextEl);

  container.appendChild(flashEl);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.classList.add("is-copying-animate-in");
    });
  });

  flashTextEl.addEventListener("animationend", () => {
    flashEl.remove();
    container.classList.remove("is-copying", "is-copying-animate-in");
  });
}

function copyFromContainer(container, options) {
  const { valueSelector, classes, skipLinkSelector = "a" } = options;

  return (event) => {
    if (event.target.closest(skipLinkSelector)) return;

    const text = getCopyText(container, valueSelector);
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      showCopyFlash(container, text, classes);

      container.classList.add("is-copied");
      window.setTimeout(() => {
        container.classList.remove("is-copied");
      }, 1200);
    });
  };
}

function appendCopyIcon(container, templateSelector, iconSelector) {
  if (container.querySelector(iconSelector)) return false;

  const template = document.querySelector(templateSelector);
  if (!template) return false;

  container.appendChild(template.content.firstElementChild.cloneNode(true));
  return true;
}
