/**
 * Конфигурация для иллюстрации layered-house
 * Парсинг data-атрибутов и значения по умолчанию
 */

export function parseLayeredHouseConfig(container) {
  // Значения по умолчанию
  const defaults = {
    rotationX: -41, // градусы
    rotationY: -25, // градусы (базовый угол)
    rotationZ: -26, // градусы
    layerSpacing: 130,
    offsetX: 15, // смещение по X (в пикселях системы 1000x1000)
    offsetY: -0, // смещение по Y (в пикселях системы 1000x1000)
    accentColor: '--ids__accent',
    backgroundColor: null, // обязательный параметр
    lineWidth: 4,
    scale: null, // автоматический расчёт
    // Параметры анимации
    animationAngle: 10, // угол поворота в плоскости слоя (градусы)
    animationDurationForward: 2000, // длительность движения вперёд (мс)
    animationPauseAfterForward: 2000, // длительность паузы после движения вперёд (мс)
    animationDurationBackward: 2000, // длительность движения назад (мс)
    animationPauseAfterBackward: 2000, // длительность паузы после движения назад (мс)
    animationDelay: 200 // задержка между слоями (мс)
  };

  // Парсинг data-атрибутов
  const config = { ...defaults };

  // Угол поворота вокруг X
  if (container.dataset.rotationX) {
    config.rotationX = parseFloat(container.dataset.rotationX);
  }

  // Угол поворота вокруг Y
  if (container.dataset.rotationY) {
    config.rotationY = parseFloat(container.dataset.rotationY);
  }

  // Угол поворота вокруг Z
  if (container.dataset.rotationZ) {
    config.rotationZ = parseFloat(container.dataset.rotationZ);
  }

  // Расстояние между слоями
  if (container.dataset.layerSpacing) {
    config.layerSpacing = parseFloat(container.dataset.layerSpacing);
  }

  // Смещение по X
  if (container.dataset.offsetX) {
    config.offsetX = parseFloat(container.dataset.offsetX);
  }

  // Смещение по Y
  if (container.dataset.offsetY) {
    config.offsetY = parseFloat(container.dataset.offsetY);
  }

  // Цвет акцента (CSS-переменная)
  if (container.dataset.accentColor) {
    config.accentColor = container.dataset.accentColor;
  }

  // Цвет фона (CSS-переменная, обязательный)
  if (container.dataset.backgroundColor) {
    config.backgroundColor = container.dataset.backgroundColor;
  }

  // Толщина линии
  if (container.dataset.lineWidth) {
    config.lineWidth = parseFloat(container.dataset.lineWidth);
  }

  // Масштаб
  if (container.dataset.scale) {
    config.scale = parseFloat(container.dataset.scale);
  }

  // Параметры анимации
  if (container.dataset.animationAngle) {
    config.animationAngle = parseFloat(container.dataset.animationAngle);
  }
  if (container.dataset.animationDurationForward) {
    config.animationDurationForward = parseFloat(container.dataset.animationDurationForward);
  }
  if (container.dataset.animationPauseAfterForward) {
    config.animationPauseAfterForward = parseFloat(container.dataset.animationPauseAfterForward);
  }
  if (container.dataset.animationDurationBackward) {
    config.animationDurationBackward = parseFloat(container.dataset.animationDurationBackward);
  }
  if (container.dataset.animationPauseAfterBackward) {
    config.animationPauseAfterBackward = parseFloat(container.dataset.animationPauseAfterBackward);
  }
  if (container.dataset.animationDelay) {
    config.animationDelay = parseFloat(container.dataset.animationDelay);
  }

  // Проверка обязательного параметра
  if (!config.backgroundColor) {
    throw new Error('data-background-color is required for layered-house illustration');
  }

  return config;
}

