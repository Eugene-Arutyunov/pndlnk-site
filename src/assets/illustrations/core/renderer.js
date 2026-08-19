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
    const value = getComputedStyle(el).getPropertyValue(cssVariable).trim();
    if (!value) return null;
    // Токен хранит полный цвет вида rgb(r, g, b); поддерживаем и голый триплет "r, g, b"
    const triplet = value.startsWith('rgb')
      ? value.slice(value.indexOf('(') + 1, value.indexOf(')'))
      : value;
    return `rgba(${triplet}, ${alpha})`;
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

