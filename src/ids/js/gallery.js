/**
 * @param {HTMLDivElement} node
 */
const photoSwipeSize = (node) => {
  if (node.hasAttribute("data-pswp-width") && node.hasAttribute("data-pswp-height")) {
    return;
  }
  /** @type {HTMLImageElement | null} */
  const img = node.querySelector("img");
  if (!img) {
    return;
  }
  const setSize = () => {
    if (!img.naturalWidth || !img.naturalHeight) {
      return;
    }
    node.setAttribute("data-pswp-width", img.naturalWidth.toString());
    node.setAttribute("data-pswp-height", img.naturalHeight.toString());
  };
  if (img.complete) {
    setSize();
  } else {
    img.addEventListener("load", setSize, { once: true });
  }
};

class IdsGallery extends HTMLElement {
  connectedCallback() {
    this.classList.add("ids__gallery");

    if (this.lightbox) {
      return;
    }

    this.lightbox = new PhotoSwipeLightbox({
      gallery: this,
      children: "a",
      pswpModule: PhotoSwipe,
      paddingFn: (viewportSize) => ({
        top: 20,
        bottom: 40,
        left: viewportSize.x < 768 ? 0 : 100,
        right: viewportSize.x < 768 ? 0 : 100,
      }),
    });

    this.lightbox.on("uiRegister", () => {
      if (!this.getAttribute("zoom") && this.lightbox?.pswp?.ui?.uiElementsData?.length) {
        this.lightbox.pswp.ui.uiElementsData = this.lightbox.pswp.ui.uiElementsData.filter((el) => el.name !== "zoom");
      }

      this.lightbox.pswp.ui.registerElement({
        name: "caption",
        appendTo: "root",
        onInit: (el, pswp) => {
          pswp.on("change", () => {
            const figcaption = pswp.currSlide.data.element?.closest("figure")?.querySelector("figcaption")?.cloneNode(true);

            el.innerHTML = "";
            if (figcaption) {
              el.appendChild(figcaption);
            }
          });
        },
      });
    });

    this.lightbox.init();

    this.querySelectorAll("a").forEach(photoSwipeSize);
  }

  disconnectedCallback() {
    this.lightbox?.destroy();
    this.lightbox = null;
  }
}

window.customElements.define("ids-gallery", IdsGallery);
