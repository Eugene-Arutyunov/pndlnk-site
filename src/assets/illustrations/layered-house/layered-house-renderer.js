/**
 * Рендерер для иллюстрации layered-house
 * Расширяет BaseRenderer специфичной логикой отрисовки заливок и линий
 */

import { BaseRenderer } from '../core/renderer.js';

export class LayeredHouseRenderer extends BaseRenderer {
  constructor(canvas, container, config) {
    super(canvas, container);
    this.config = config;
  }

  /**
   * Рендеринг иллюстрации layered-house
   * @param {LayeredHouseModel} model - модель данных
   */
  render(model) {
    // Настраиваем canvas
    this.setupCanvas();

    // Получаем слои для рендеринга (отсортированные по глубине)
    const layers = model.getLayersForRender();

    // Получаем цвета
    const accentColor = this.getColorFromCSS(
      this.config.accentColor,
      1
    ) || 'rgba(255, 105, 105, 1)';

    const backgroundColor = this.getColorFromCSS(
      this.config.backgroundColor,
      0.7 // прозрачность для заливки
    );

    if (!backgroundColor) {
      console.warn(`Background color not found: ${this.config.backgroundColor}`);
      return;
    }

    // Получаем цвет фона контейнера (без прозрачности)
    const containerBackgroundColor = this.getColorFromCSS(
      this.config.backgroundColor,
      1
    );

    // Очищаем canvas и заливаем фоном контейнера
    this.clear();
    if (containerBackgroundColor && this.ctx && !this.config.transparent) {
      const rect = this.container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      this.ctx.fillStyle = containerBackgroundColor;
      this.ctx.fillRect(0, 0, size, size);
    }

    // Рисуем слои от дальних к ближним
    layers.forEach(layer => {
      // Сначала заливки (с обводкой accent цвета)
      this.renderFills(layer.fills, backgroundColor, accentColor);
      // Затем внутренние линии
      this.renderStrokes(layer.strokes, accentColor);
    });
  }

  /**
   * Отрисовка заливок (полигонов)
   * @param {Array} fills - массив полигонов для отрисовки
   * @param {string} fillColor - цвет заливки
   * @param {string} strokeColor - цвет обводки
   */
  renderFills(fills, fillColor, strokeColor) {
    this.ctx.fillStyle = fillColor;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = this.config.lineWidth * Math.min(this.scaleX, this.scaleY);

    const offsetX = (this.config.offsetX || 0) * this.scaleX;
    const offsetY = (this.config.offsetY || 0) * this.scaleY;

    fills.forEach(fill => {
      if (fill.points.length < 2) return;

      this.ctx.beginPath();
      const firstPoint = fill.points[0];
      const scaledX = this.scaleCoordinateX(firstPoint.x) + offsetX;
      const scaledY = this.scaleCoordinateY(firstPoint.y) + offsetY;
      this.ctx.moveTo(scaledX, scaledY);

      for (let i = 1; i < fill.points.length; i++) {
        const point = fill.points[i];
        const scaledX = this.scaleCoordinateX(point.x) + offsetX;
        const scaledY = this.scaleCoordinateY(point.y) + offsetY;
        this.ctx.lineTo(scaledX, scaledY);
      }

      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  /**
   * Отрисовка линий (обводок)
   * @param {Array} strokes - массив линий для отрисовки
   * @param {string} color - цвет линий
   */
  renderStrokes(strokes, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.config.lineWidth * Math.min(this.scaleX, this.scaleY);

    const offsetX = (this.config.offsetX || 0) * this.scaleX;
    const offsetY = (this.config.offsetY || 0) * this.scaleY;

    strokes.forEach(stroke => {
      const x1 = this.scaleCoordinateX(stroke.x1) + offsetX;
      const y1 = this.scaleCoordinateY(stroke.y1) + offsetY;
      const x2 = this.scaleCoordinateX(stroke.x2) + offsetX;
      const y2 = this.scaleCoordinateY(stroke.y2) + offsetY;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    });
  }
}

