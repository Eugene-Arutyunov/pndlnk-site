/**
 * Базовый Canvas рендерер для 3D иллюстраций
 * Универсальный модуль для всех типов иллюстраций
 */

export class BaseRenderer {
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = null;
    this.scaleX = 1;
    this.scaleY = 1;
    this.centerX = 0;
    this.centerY = 0;
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Настройка Canvas с учетом devicePixelRatio и размера контейнера
   */
  setupCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    
    // Используем минимальное значение для создания квадратного canvas
    const size = Math.min(rect.width, rect.height);
    
    // Устанавливаем размер canvas с учетом devicePixelRatio (всегда квадратный)
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);
    
    // Масштабируем координаты под новый размер (было 1000x1000, теперь size x size)
    this.scaleX = size / 1000;
    this.scaleY = size / 1000;
    this.centerX = size / 2;
    this.centerY = size / 2;
  }

  /**
   * Очистка canvas
   */
  clear() {
    if (!this.ctx) return;
    const size = Math.min(this.container.getBoundingClientRect().width, this.container.getBoundingClientRect().height);
    this.ctx.clearRect(0, 0, size, size);
  }

  /**
   * Получение цвета из CSS-переменной
   * @param {string} cssVariable - имя CSS-переменной (например, '--ids__accent')
   * @param {number} alpha - альфа-канал (0-1)
   * @param {Element} element - элемент для получения computed styles (по умолчанию container)
   * @returns {string} цвет в формате rgba()
   */
  getColorFromCSS(cssVariable, alpha = 1, element = null) {
    const el = element || this.container || document.body;
    // Особое значение "transparent": заливок нет, сквозь фигуры видна подложка
    if (cssVariable === 'transparent') return 'rgba(0, 0, 0, 0)';
    // Особое значение "background": фон ближайшего непрозрачного предка —
    // канвас следует за фоном плитки, в том числе на ховере
    if (cssVariable === 'background') {
      const triplet = this.getAncestorBackgroundTriplet(el);
      return triplet ? `rgba(${triplet}, ${alpha})` : null;
    }
    const value = getComputedStyle(el).getPropertyValue(cssVariable).trim();
    if (!value) return null;
    // Токен хранит полный цвет вида rgb(r, g, b); поддерживаем и голый триплет "r, g, b"
    const triplet = value.startsWith('rgb')
      ? value.slice(value.indexOf('(') + 1, value.indexOf(')'))
      : value;
    return `rgba(${triplet}, ${alpha})`;
  }

  /**
   * Триплет "r, g, b" фона ближайшего предка с непрозрачным background-color.
   * Вычисленный цвет может быть rgb(...) или color(srgb r g b) — после color-mix.
   * @param {Element} start - откуда идти вверх
   * @returns {string|null}
   */
  getAncestorBackgroundTriplet(start) {
    let el = start;
    while (el && el !== document.documentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      const triplet = this.parseColorTriplet(bg);
      if (triplet) return triplet;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Разбор вычисленного цвета в триплет "r, g, b"; прозрачный цвет → null.
   * Во время транзишена браузер отдаёт цвет в oklab()/color(srgb …), поэтому
   * разбираем не строку, а пиксель: красим им служебный канвас 1×1 и читаем.
   * @param {string} value
   * @returns {string|null}
   */
  parseColorTriplet(value) {
    if (!value) return null;
    const ctx = BaseRenderer.probeContext();
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Общий служебный контекст 1×1 для разбора цветов
   * @returns {CanvasRenderingContext2D|null}
   */
  static probeContext() {
    if (!BaseRenderer._probeCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      BaseRenderer._probeCtx = canvas.getContext('2d', { willReadFrequently: true });
    }
    return BaseRenderer._probeCtx;
  }

  /**
   * Получение цвета текста из computed styles
   * @param {Element} element - элемент для получения computed styles (по умолчанию container)
   * @returns {string} цвет в формате rgb/rgba
   */
  getTextColor(element = null) {
    const el = element || this.container || document.body;
    return getComputedStyle(el).color;
  }

  /**
   * Масштабирование координаты X из системы 1000x1000 в текущий размер canvas
   * @param {number} x - координата в системе 1000x1000
   * @returns {number} масштабированная координата
   */
  scaleCoordinateX(x) {
    return (x - 500) * this.scaleX + this.centerX;
  }

  /**
   * Масштабирование координаты Y из системы 1000x1000 в текущий размер canvas
   * @param {number} y - координата в системе 1000x1000
   * @returns {number} масштабированная координата
   */
  scaleCoordinateY(y) {
    return (y - 500) * this.scaleY + this.centerY;
  }

  /**
   * Сортировка точек по глубине (Z-координата) для правильного порядка отрисовки
   * @param {Array} points - массив точек с z координатой
   * @returns {Array} отсортированный массив (от дальних к ближним)
   */
  sortByDepth(points) {
    return [...points].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  }
}

