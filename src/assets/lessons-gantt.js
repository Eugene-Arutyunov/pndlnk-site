(function() {
  'use strict';

  const ganttContainer = document.querySelector('.lessons-gantt');
  if (!ganttContainer) return;

  const hoverIndicator = ganttContainer.querySelector('.gantt-hover-indicator');
  const hoverTime = hoverIndicator ? hoverIndicator.querySelector('.gantt-hover-time') : null;
  const barsContainer = ganttContainer.querySelector('.gantt-bars');
  const timeEnd = ganttContainer.querySelector('.gantt-time-end');

  if (!hoverIndicator || !hoverTime || !barsContainer) return;

  /**
   * Обновляет отображаемое время окончания на основе CSS переменной --total-duration
   */
  function updateTimeEnd() {
    if (!timeEnd) return;
    
    // Получаем общую длительность из CSS переменной
    const computedStyle = getComputedStyle(ganttContainer);
    const totalDurationValue = computedStyle.getPropertyValue('--total-duration').trim();
    
    // Если это calc(), вычисляем значение напрямую из CSS переменных уроков
    let totalDuration = 295; // значение по умолчанию
    if (totalDurationValue.includes('calc')) {
      // Вычисляем сумму всех длительностей уроков
      const lesson1 = parseInt(computedStyle.getPropertyValue('--lesson-1-duration').trim()) || 55;
      const lesson2 = parseInt(computedStyle.getPropertyValue('--lesson-2-duration').trim()) || 75;
      const lesson3 = parseInt(computedStyle.getPropertyValue('--lesson-3-duration').trim()) || 35;
      const lesson4 = parseInt(computedStyle.getPropertyValue('--lesson-4-duration').trim()) || 42;
      const lesson5 = parseInt(computedStyle.getPropertyValue('--lesson-5-duration').trim()) || 75;
      totalDuration = lesson1 + lesson2 + lesson3 + lesson4 + lesson5;
    } else {
      // Пытаемся распарсить как число
      totalDuration = parseInt(totalDurationValue) || 295;
    }
    
    const hours = Math.floor(totalDuration / 60);
    const mins = totalDuration % 60;
    timeEnd.textContent = `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  // Обновляем время окончания при инициализации
  updateTimeEnd();
  
  // Обновляем текст продолжительности курса при инициализации
  updateCourseDurationText();

  // Получаем общую длительность из CSS переменной для использования в других функциях
  function getTotalDuration() {
    const computedStyle = getComputedStyle(ganttContainer);
    const lesson1 = parseInt(computedStyle.getPropertyValue('--lesson-1-duration').trim());
    const lesson2 = parseInt(computedStyle.getPropertyValue('--lesson-2-duration').trim());
    const lesson3 = parseInt(computedStyle.getPropertyValue('--lesson-3-duration').trim());
    const lesson4 = parseInt(computedStyle.getPropertyValue('--lesson-4-duration').trim());
    const lesson5 = parseInt(computedStyle.getPropertyValue('--lesson-5-duration').trim());
    return lesson1 + lesson2 + lesson3 + lesson4 + lesson5;
  }

  /**
   * Форматирует минуты в формат "X часа Y минут" (русский формат)
   * @param {number} minutes - количество минут
   * @returns {string} - строка в формате "X часа Y минут"
   */
  function formatDurationText(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let hoursText = '';
    let minsText = '';
    
    if (hours > 0) {
      hoursText = `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
    }
    
    if (mins > 0) {
      minsText = `${mins} ${mins === 1 ? 'минута' : mins < 5 ? 'минуты' : 'минут'}`;
    }
    
    if (hoursText && minsText) {
      return `${hoursText} ${minsText}`;
    } else if (hoursText) {
      return hoursText;
    } else {
      return minsText;
    }
  }

  /**
   * Обновляет текст продолжительности курса в описании
   */
  function updateCourseDurationText() {
    const durationTextElement = document.querySelector('.course-duration-text');
    if (!durationTextElement) return;
    
    const totalDuration = getTotalDuration();
    durationTextElement.textContent = formatDurationText(totalDuration);
  }

  const totalDuration = getTotalDuration();

  // Константы позиционирования crop областей для каждого урока
  // Координаты в процентах относительно исходного кадра 480×270
  // Слайд слева, первый спикер справа вверху, второй спикер справа внизу
  // width - ширина в процентах, height рассчитывается автоматически на основе aspect-ratio
  const PREVIEW_CROP_CONFIG = {
    1: {
      speaker1: { x: 80, y: 15, width: 14 },
      speaker2: { x: 80, y: 51, width: 16 },
      slide: { x: 2, y: 2, width: 72 }
    },
    2: {
      speaker1: { x: 81, y: 10, width: 14 },
      speaker2: { x: 80, y: 55, width: 14 },
      slide: { x: 1, y: 2, width: 72 }
    },
    3: {
      speaker1: { x: 80, y: 6, width: 17 },
      speaker2: { x: 80, y: 50, width: 17 },
      slide: { x: 0, y: 0, width: 80 }
    },
    4: {
      speaker1: { x: 82, y: 14, width: 12 },
      speaker2: { x: 80, y: 55, width: 14 },
      slide: { x: 1, y: 2, width: 72 }
    },
    5: {
      speaker1: { x: 66.67, y: 0, width: 33.33 },
      speaker2: { x: 66.67, y: 50, width: 33.33 },
      slide: { x: 0, y: 0, width: 66.67 }
    }
  };

  // Aspect-ratio для каждого типа контейнера
  const CONTAINER_ASPECT_RATIOS = {
    speaker1: 3 / 4,
    speaker2: 3 / 4,
    slide: 43 / 30  // 4.3/3 в целых числах
  };

  // Загружаем данные о превьюшках
  let previewsData = null;
  const speaker1Containers = new Map();
  const speaker2Containers = new Map();
  const slideContainers = new Map();

  // Инициализация контейнеров превью
  const bars = barsContainer.querySelectorAll('.gantt-bar');
  bars.forEach(bar => {
    const lessonNumber = parseInt(bar.getAttribute('data-lesson'));
    const speaker1Container = bar.querySelector('.gantt-preview-speaker-1');
    const speaker2Container = bar.querySelector('.gantt-preview-speaker-2');
    const slideContainer = bar.querySelector('.gantt-preview-slide');
    
    if (speaker1Container) speaker1Containers.set(lessonNumber, speaker1Container);
    if (speaker2Container) speaker2Containers.set(lessonNumber, speaker2Container);
    if (slideContainer) slideContainers.set(lessonNumber, slideContainer);
  });

  // Загрузка JSON с данными о превьюшках
  fetch('/assets/gantt-previews.json')
    .then(response => response.json())
    .then(data => {
      previewsData = data;
      // Инициализируем превью первым кадром после загрузки данных
      initializePreviews();
    })
    .catch(error => {
      console.error('Failed to load previews data:', error);
    });

  // Переменные для плавного следования индикатора
  let targetIndicatorX = 0;
  let currentIndicatorX = 0;
  let targetTime = '0:00';
  let animationFrameId = null;
  let isAnimating = false;

  // Сохраняем последнюю позицию для пересчета при resize
  let lastClientX = null;
  let lastClientY = null;

  /**
   * Форматирует минуты в формат ЧЧ:ММ
   * @param {number} minutes - количество минут
   * @returns {string} - строка в формате ЧЧ:ММ
   */
  function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Обновляет длительности для всех информационных полосок баров
   */
  function updateBarDurations() {
    const barInfos = ganttContainer.querySelectorAll('.gantt-bar-info');
    const computedStyle = getComputedStyle(ganttContainer);
    
    barInfos.forEach(barInfo => {
      const lessonNumber = parseInt(barInfo.getAttribute('data-lesson'));
      const durationElement = barInfo.querySelector('.gantt-bar-duration');
      
      if (!durationElement) return;
      
      // Получаем длительность урока из CSS переменной
      const duration = parseInt(computedStyle.getPropertyValue(`--lesson-${lessonNumber}-duration`).trim()) || 0;
      
      // Форматируем время
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      durationElement.textContent = `${hours}:${mins.toString().padStart(2, '0')}`;
    });
  }

  /**
   * Анимация плавного следования индикатора
   */
  function animateIndicator() {
    // Интерполяция с коэффициентом для эффекта "резиночки" (уменьшено еще в 3 раза)
    const factor = 0.2;
    const diff = targetIndicatorX - currentIndicatorX;
    currentIndicatorX += diff * factor;
    
    // Обновляем позицию индикатора (цифра движется вместе с ним, так как она внутри)
    hoverIndicator.style.left = `${currentIndicatorX}px`;
    hoverTime.textContent = targetTime;
    
    // Продолжаем анимацию, если есть разница
    if (Math.abs(diff) > 0.01) {
      animationFrameId = requestAnimationFrame(animateIndicator);
    } else {
      // Если достигли цели, останавливаем анимацию
      isAnimating = false;
      animationFrameId = null;
    }
  }

  /**
   * Обновляет один контейнер превью с учетом crop области
   * @param {HTMLElement} container - контейнер для обновления
   * @param {Object} cropConfig - конфигурация crop области {x, y, width} в процентах
   * @param {string} containerType - тип контейнера ('speaker1', 'speaker2', 'slide')
   * @param {Object} videoData - данные видео из JSON
   * @param {number} frameNumber - номер кадра
   * @param {number} containerHeight - высота контейнера в пикселях
   */
  function updatePreviewContainer(container, cropConfig, containerType, videoData, frameNumber, containerHeight) {
    if (!container || !cropConfig) return;

    const frameWidth = previewsData.frame.width; // 480
    const frameHeight = previewsData.frame.height; // 270

    // Конвертируем проценты в пиксели относительно исходного кадра
    const cropX = (cropConfig.x / 100) * frameWidth;
    const cropY = (cropConfig.y / 100) * frameHeight;
    const cropWidth = (cropConfig.width / 100) * frameWidth;

    // Рассчитываем высоту crop области на основе ширины и aspect-ratio
    const aspectRatio = CONTAINER_ASPECT_RATIOS[containerType];
    const cropHeight = cropWidth / aspectRatio;

    const columns = previewsData.columns;
    const column = frameNumber % columns;
    const row = Math.floor(frameNumber / columns);

    // Рассчитываем масштаб: высота контейнера должна соответствовать высоте crop области
    const scale = containerHeight / cropHeight;
    
    // Рассчитываем размеры всего спрайта с учетом масштаба
    const spriteWidth = frameWidth * previewsData.columns * scale;
    const spriteHeight = frameHeight * videoData.rows * scale;
    
    // Базовая позиция кадра в спрайте
    const baseBgX = -column * frameWidth * scale;
    const baseBgY = -row * frameHeight * scale;
    
    // Добавляем смещение для crop области
    const bgX = baseBgX - cropX * scale;
    const bgY = baseBgY - cropY * scale;

    // Обновляем background-image, background-size и background-position
    container.style.backgroundImage = `url(${videoData.sprite.url})`;
    container.style.backgroundSize = `${spriteWidth}px ${spriteHeight}px`;
    container.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  /**
   * Обновляет превью для указанного бара
   * @param {HTMLElement} bar - элемент бара
   * @param {number} cursorX - позиция курсора относительно barsContainer (опционально, если не указана - показываем первый кадр)
   */
  function updatePreview(bar, cursorX) {
    if (!previewsData) return;

    const lessonNumber = parseInt(bar.getAttribute('data-lesson'));
    
    // Получаем данные видео (lesson 1 → videos[0], lesson 2 → videos[1], и т.д.)
    const videoData = previewsData.videos[lessonNumber - 1];
    if (!videoData || !videoData.frames || !videoData.rows) return;

    // Получаем конфигурацию crop для текущего урока
    const cropConfig = PREVIEW_CROP_CONFIG[lessonNumber];
    if (!cropConfig) return;

    const barRect = bar.getBoundingClientRect();
    const barsRect = barsContainer.getBoundingClientRect();
    const barLeft = barRect.left - barsRect.left;
    const barRight = barLeft + barRect.width;
    
    // Рассчитываем номер кадра на основе позиции курсора относительно бара
    let frameNumber = 0;
    if (cursorX !== undefined) {
      // Если курсор левее бара - показываем первый кадр
      if (cursorX < barLeft) {
        frameNumber = 0;
      }
      // Если курсор правее бара - показываем последний кадр
      else if (cursorX > barRight) {
        frameNumber = videoData.frames - 1;
      }
      // Если курсор внутри бара - рассчитываем позицию
      else {
        const relativeX = cursorX - barLeft;
        const barWidth = barRect.width;
        const percent = Math.max(0, Math.min(1, relativeX / barWidth));
        frameNumber = Math.floor(percent * videoData.frames);
      }
    }
    const clampedFrameNumber = Math.max(0, Math.min(videoData.frames - 1, frameNumber));

    // Получаем контейнеры
    const speaker1Container = speaker1Containers.get(lessonNumber);
    const speaker2Container = speaker2Containers.get(lessonNumber);
    const slideContainer = slideContainers.get(lessonNumber);

    // Получаем высоту контейнера (все три имеют одинаковую высоту)
    let containerHeight = 0;
    if (speaker1Container) {
      const containerRect = speaker1Container.getBoundingClientRect();
      containerHeight = containerRect.height;
    }

    // Обновляем все три контейнера
    if (speaker1Container && containerHeight > 0) {
      updatePreviewContainer(speaker1Container, cropConfig.speaker1, 'speaker1', videoData, clampedFrameNumber, containerHeight);
    }
    if (speaker2Container && containerHeight > 0) {
      updatePreviewContainer(speaker2Container, cropConfig.speaker2, 'speaker2', videoData, clampedFrameNumber, containerHeight);
    }
    if (slideContainer && containerHeight > 0) {
      updatePreviewContainer(slideContainer, cropConfig.slide, 'slide', videoData, clampedFrameNumber, containerHeight);
    }
  }

  /**
   * Инициализирует превью для всех баров первым кадром
   */
  function initializePreviews() {
    if (!previewsData) return;
    
    bars.forEach(bar => {
      updatePreview(bar);
    });
  }

  /**
   * Обновляет длительности для всех информационных полосок баров
   */
  function updateBarDurations() {
    const barInfos = ganttContainer.querySelectorAll('.gantt-bar-info');
    const computedStyle = getComputedStyle(ganttContainer);
    
    barInfos.forEach(barInfo => {
      const lessonNumber = parseInt(barInfo.getAttribute('data-lesson'));
      const durationElement = barInfo.querySelector('.gantt-bar-duration');
      
      if (!durationElement) return;
      
      // Получаем длительность урока из CSS переменной
      const duration = parseInt(computedStyle.getPropertyValue(`--lesson-${lessonNumber}-duration`).trim()) || 0;
      
      // Форматируем время
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      durationElement.textContent = `${hours}:${mins.toString().padStart(2, '0')}`;
    });
  }

  // Обновляем длительности баров при инициализации
  updateBarDurations();

  /**
   * Обновляет позицию индикатора и превью на основе координат
   * @param {number} clientX - координата X клика/касания
   * @param {number} clientY - координата Y клика/касания
   * @param {boolean} skipSave - пропустить сохранение позиции (для внутренних вызовов)
   */
  function updatePosition(clientX, clientY, skipSave = false) {
    const barsRect = barsContainer.getBoundingClientRect();
    const containerRect = ganttContainer.getBoundingClientRect();
    
    // Сохраняем позицию для пересчета при resize
    if (!skipSave) {
      lastClientX = clientX;
      lastClientY = clientY;
    }
    
    // Проверяем, что касание находится в области ганта
    if (clientY < barsRect.top || clientY > barsRect.bottom) {
      return;
    }
    
    // Рассчитываем позицию курсора относительно barsContainer для расчета времени
    const x = clientX - barsRect.left;
    const percent = Math.max(0, Math.min(100, (x / barsRect.width) * 100));
    
    // Рассчитываем время в минутах
    const timeInMinutes = (percent / 100) * getTotalDuration();
    
    // Рассчитываем абсолютную позицию в пикселях относительно ganttContainer
    const absoluteX = clientX - containerRect.left;
    
    // Обновляем целевую позицию индикатора и время
    targetIndicatorX = absoluteX;
    targetTime = formatTime(Math.round(timeInMinutes));
    
    // Обновляем превью для всех баров на основе позиции курсора по всей области
    bars.forEach(bar => {
      updatePreview(bar, x);
    });
    
    // Запускаем анимацию, если она еще не запущена
    if (!isAnimating) {
      isAnimating = true;
      animationFrameId = requestAnimationFrame(animateIndicator);
    }
  }

  /**
   * Обработчик движения мыши
   */
  function handleMouseMove(e) {
    updatePosition(e.clientX, e.clientY);
  }

  /**
   * Обработчик выхода мыши
   */
  function handleMouseLeave() {
    hoverIndicator.style.opacity = '0';
    hoverTime.style.opacity = '0';
    
    // Останавливаем анимацию
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isAnimating = false;
  }

  /**
   * Обработчик входа мыши
   */
  function handleMouseEnter() {
    hoverIndicator.style.opacity = '1';
    hoverTime.style.opacity = '1';
  }

  /**
   * Обработчик начала касания (touch)
   */
  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    hoverIndicator.style.opacity = '1';
    hoverTime.style.opacity = '1';
    updatePosition(touch.clientX, touch.clientY);
  }

  /**
   * Обработчик движения касания (touch)
   */
  function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  }

  /**
   * Обработчик окончания касания (touch)
   */
  function handleTouchEnd(e) {
    e.preventDefault();
    hoverIndicator.style.opacity = '0';
    hoverTime.style.opacity = '0';
    
    // Останавливаем анимацию
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isAnimating = false;
  }

  // Добавляем обработчики событий на весь контейнер, чтобы ховер работал и над шкалой
  ganttContainer.addEventListener('mousemove', handleMouseMove);
  ganttContainer.addEventListener('mouseenter', handleMouseEnter);
  ganttContainer.addEventListener('mouseleave', handleMouseLeave);
  
  // Добавляем обработчики touch событий для мобильных устройств
  ganttContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  ganttContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  ganttContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  /**
   * Throttle функция для оптимизации обработки resize
   */
  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Обработчик изменения размера окна
   */
  function handleResize() {
    // Обновляем время окончания при изменении размера
    updateTimeEnd();
    
    // Обновляем текст продолжительности курса при изменении размера
    updateCourseDurationText();
    
    // Обновляем длительности баров при изменении размера
    updateBarDurations();
    
    // Если есть сохраненная позиция, пересчитываем превью на её основе
    if (lastClientX !== null && lastClientY !== null) {
      updatePosition(lastClientX, lastClientY, true);
    } else {
      // Если позиции нет, инициализируем превью первым кадром
      initializePreviews();
    }
  }

  // Добавляем обработчик resize с throttle для оптимизации
  window.addEventListener('resize', throttle(handleResize, 50));
})();

