/**
 * Конфигурация для иллюстрации сферы
 * Парсинг data-атрибутов и значения по умолчанию
 */

export function parseSphereConfig(container) {
  // Значения по умолчанию
  const defaults = {
    radius: 400,
    numPoints: 45,
    rotationSpeed: {
      x: 0.002,
      y: 0.003,
      z: 0.001
    },
    lineConfig: {
      minLines: 30,
      maxLines: 60,
      fadeDuration: 250,
      addIntervalMin: 200,
      addIntervalMax: 400,
      removeIntervalMin: 300,
      removeIntervalMax: 500
    },
    lineWidth: 2,
    pointRadius: 4,
    accentColor: '--ids__accent'
  };

  // Парсинг data-атрибутов
  const config = { ...defaults };

  // Радиус сферы
  if (container.dataset.radius) {
    config.radius = parseFloat(container.dataset.radius);
  }

  // Начальное количество точек
  if (container.dataset.numPoints) {
    config.numPoints = parseInt(container.dataset.numPoints, 10);
  }

  // Скорость вращения
  if (container.dataset.rotationSpeedX) {
    config.rotationSpeed.x = parseFloat(container.dataset.rotationSpeedX);
  }
  if (container.dataset.rotationSpeedY) {
    config.rotationSpeed.y = parseFloat(container.dataset.rotationSpeedY);
  }
  if (container.dataset.rotationSpeedZ) {
    config.rotationSpeed.z = parseFloat(container.dataset.rotationSpeedZ);
  }

  // Толщина линии
  if (container.dataset.lineWidth) {
    config.lineWidth = parseFloat(container.dataset.lineWidth);
  }

  // Радиус точек
  if (container.dataset.pointRadius) {
    config.pointRadius = parseFloat(container.dataset.pointRadius);
  }

  // Длительность fade-in/out
  if (container.dataset.fadeDuration) {
    config.lineConfig.fadeDuration = parseInt(container.dataset.fadeDuration, 10);
  }

  // Минимальное и максимальное количество линий
  if (container.dataset.minLines) {
    config.lineConfig.minLines = parseInt(container.dataset.minLines, 10);
  }
  if (container.dataset.maxLines) {
    config.lineConfig.maxLines = parseInt(container.dataset.maxLines, 10);
  }

  // Цвет акцента (CSS-переменная)
  if (container.dataset.accentColor) {
    config.accentColor = container.dataset.accentColor;
  }

  return config;
}

