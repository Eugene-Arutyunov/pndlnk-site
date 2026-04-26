import { BaseRenderer } from '../core/renderer.js';

export class PndlnkRenderer extends BaseRenderer {
  constructor(canvas, container, config) {
    super(canvas, container);
    this.config = config;
  }

  /**
   * Переопределяем setupCanvas: canvas занимает полный размер контейнера (не квадрат).
   * Масштаб единый (по ширине), чтобы не было искажений.
   * Координатная система модели: 1000 ед. по ширине, 500 ед. по высоте.
   */
  setupCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;

    const width = rect.width;
    const height = rect.height;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);

    // Единый масштаб по ширине (модель — 1000 ед. шириной)
    const scale = width / 1000;
    this.scaleX = scale;
    this.scaleY = scale;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  clear() {
    if (!this.ctx) return;
    const rect = this.container.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  render(model) {
    this.setupCanvas();

    const layers = model.getLayersForRender();

    const accentColor = this.getColorFromCSS(this.config.accentColor, 1) || 'rgba(255, 105, 105, 1)';
    const backgroundColor = this.getColorFromCSS(this.config.backgroundColor, 1);

    if (!backgroundColor) {
      console.warn(`Background color not found: ${this.config.backgroundColor}`);
      return;
    }

    const containerBackgroundColor = this.getColorFromCSS(this.config.backgroundColor, 1);

    this.clear();
    if (containerBackgroundColor && this.ctx) {
      const rect = this.container.getBoundingClientRect();
      this.ctx.fillStyle = containerBackgroundColor;
      this.ctx.fillRect(0, 0, rect.width, rect.height);
    }

    layers.forEach(layer => {
      this.renderFills(layer.fills, backgroundColor, accentColor);
    });
  }

  /**
   * Каждый fill содержит rings — массив контуров одного path-элемента.
   * Все rings в одном beginPath() + fill('evenodd') = дырки работают корректно.
   */
  renderFills(fills, fillColor, strokeColor) {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = this.config.lineWidth * Math.min(this.scaleX, this.scaleY);

    const offsetX = (this.config.offsetX || 0) * this.scaleX;
    const offsetY = (this.config.offsetY || 0) * this.scaleY;

    fills.forEach(fill => {
      this.ctx.beginPath();

      fill.rings.forEach(ring => {
        if (ring.length < 2) return;
        const first = ring[0];
        this.ctx.moveTo(this.scaleCoordinateX(first.x) + offsetX, this.scaleCoordinateY(first.y) + offsetY);
        for (let i = 1; i < ring.length; i++) {
          const p = ring[i];
          this.ctx.lineTo(this.scaleCoordinateX(p.x) + offsetX, this.scaleCoordinateY(p.y) + offsetY);
        }
        this.ctx.closePath();
      });

      this.ctx.fill('evenodd');
      this.ctx.stroke();
    });
  }
}
