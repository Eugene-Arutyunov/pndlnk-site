/**
 * Конфигурация для иллюстрации splash
 * Парсинг data-атрибутов и значения по умолчанию
 */

export function parseSplashConfig(container) {
  // Значения по умолчанию для z-координат (10 объектов, симметрично распределены вокруг нуля)
  // Сдвинуты так, чтобы половина была положительной, половина отрицательной
  const defaultZCoordinates = [
    -75, 15, -105, 75, -45,
    135, -15, 105, 45, -135
  ];

  // Значения по умолчанию
  const defaults = {
    zCoordinates: defaultZCoordinates,
    accentColor: '--ids__accent',
    backgroundColor: null, // обязательный параметр
    lineWidth: 3,
    offsetX: 0,
    offsetY: 0,
    scale: null, // автоматический расчёт
    animationAngle: 30, // угол поворота в градусах (в каждую сторону)
    animationDuration: 8000, // длительность полного цикла туда-обратно (мс)
    perspectiveDistance: 1000, // расстояние от камеры до плоскости проекции (меньше = сильнее перспектива)
    depthChangeEasingPower: 7, // степень резкости временной функции смены глубин (больше = резче, быстрее начало, медленнее конец)
    depthChangeInterval: 1000, // интервал смены глубин в миллисекундах (по умолчанию 1 секунда)
    depthChangeDuration: 3000 // длительность анимации смены глубин в миллисекундах (по умолчанию 3 секунды)
  };

  // Парсинг data-атрибутов
  const config = { ...defaults };

  // Z-координаты объектов (строка вида "z1,z2,z3,..." или массив)
  if (container.dataset.zCoordinates) {
    const zCoordsStr = container.dataset.zCoordinates;
    config.zCoordinates = zCoordsStr.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
    
    // Если не хватает значений, дополняем значениями по умолчанию
    while (config.zCoordinates.length < 10) {
      config.zCoordinates.push(defaultZCoordinates[config.zCoordinates.length] || 0);
    }
    
    // Обрезаем до 10 значений
    config.zCoordinates = config.zCoordinates.slice(0, 10);
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

  // Смещение по X
  if (container.dataset.offsetX) {
    config.offsetX = parseFloat(container.dataset.offsetX);
  }

  // Смещение по Y
  if (container.dataset.offsetY) {
    config.offsetY = parseFloat(container.dataset.offsetY);
  }

  // Масштаб
  if (container.dataset.scale) {
    config.scale = parseFloat(container.dataset.scale);
  }

  // Параметры анимации
  if (container.dataset.animationAngle) {
    config.animationAngle = parseFloat(container.dataset.animationAngle);
  }
  if (container.dataset.animationDuration) {
    config.animationDuration = parseFloat(container.dataset.animationDuration);
  }

  // Расстояние перспективы (меньше значение = сильнее перспективное искажение)
  if (container.dataset.perspectiveDistance) {
    config.perspectiveDistance = parseFloat(container.dataset.perspectiveDistance);
  }

  // Степень резкости временной функции смены глубин
  if (container.dataset.depthChangeEasingPower) {
    config.depthChangeEasingPower = parseFloat(container.dataset.depthChangeEasingPower);
  }

  // Интервал смены глубин (в миллисекундах)
  if (container.dataset.depthChangeInterval) {
    config.depthChangeInterval = parseFloat(container.dataset.depthChangeInterval);
  }

  // Длительность анимации смены глубин (в миллисекундах)
  if (container.dataset.depthChangeDuration) {
    config.depthChangeDuration = parseFloat(container.dataset.depthChangeDuration);
  }

  // Проверка обязательного параметра
  if (!config.backgroundColor) {
    throw new Error('data-background-color is required for splash illustration');
  }

  return config;
}
