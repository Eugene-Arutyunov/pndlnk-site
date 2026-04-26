/**
 * Автоматическая инициализация всех 3D иллюстраций на странице
 */

import { SphereIllustration } from './sphere/sphere.js';
import { LayeredHouseIllustration } from './layered-house/layered-house.js';
import { SplashIllustration } from './splash/splash.js';
import { PndlnkIllustration } from './pndlnk/pndlnk.js';

// Реестр типов иллюстраций
const illustrationTypes = {
  sphere: SphereIllustration,
  'layered-house': LayeredHouseIllustration,
  splash: SplashIllustration,
  pndlnk: PndlnkIllustration
};

// Хранилище экземпляров иллюстраций
const instances = new Map();

/**
 * Инициализация всех иллюстраций на странице
 */
export function initIllustrations() {
  const containers = document.querySelectorAll('.illustration-container');
  const processedContainers = new Set();
  
  containers.forEach((container, index) => {
    // Пропускаем контейнеры, которые уже обработаны как часть пары
    if (processedContainers.has(container)) {
      return;
    }
    
    // Определяем тип иллюстрации
    const type = container.dataset.illustrationType || 'sphere';
    
    if (!illustrationTypes[type]) {
      console.warn(`Unknown illustration type: ${type}`);
      return;
    }
    
    // Проверяем, является ли это контейнером с двумя слоями
    const canvasLayer = container.dataset.canvasLayer;
    const parentContainer = container.closest('.dkcp-splash-container');
    
    if (canvasLayer && parentContainer) {
      // Находим второй контейнер в паре
      const otherLayer = canvasLayer === 'back' ? 'front' : 'back';
      const otherContainer = parentContainer.querySelector(`[data-canvas-layer="${otherLayer}"]`);
      
      if (otherContainer) {
        // Помечаем оба контейнера как обработанные
        processedContainers.add(container);
        processedContainers.add(otherContainer);
      }
    } else {
      // Обычный контейнер
      processedContainers.add(container);
    }
    
    try {
      const IllustrationClass = illustrationTypes[type];
      const instance = new IllustrationClass(container);
      
      // Сохраняем экземпляр
      const id = `illustration-${index}`;
      instances.set(id, instance);
      container.dataset.illustrationId = id;
      
      // Если это dual canvas режим, сохраняем ID и для второго контейнера
      if (canvasLayer && parentContainer) {
        const otherLayer = canvasLayer === 'back' ? 'front' : 'back';
        const otherContainer = parentContainer.querySelector(`[data-canvas-layer="${otherLayer}"]`);
        if (otherContainer) {
          otherContainer.dataset.illustrationId = id;
        }
      }
      
      // Запускаем анимацию
      const startIllustration = () => {
        Promise.resolve(instance.start()).catch(error => {
          console.error(`Failed to start illustration in container:`, container, error);
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startIllustration);
      } else {
        startIllustration();
      }
    } catch (error) {
      console.error(`Failed to initialize illustration in container:`, container, error);
    }
  });
}

/**
 * Получение экземпляра иллюстрации по контейнеру
 * @param {Element} container - контейнер иллюстрации
 * @returns {Object|null} экземпляр иллюстрации или null
 */
export function getIllustrationInstance(container) {
  const id = container?.dataset?.illustrationId;
  if (id && instances.has(id)) {
    return instances.get(id);
  }
  return null;
}

/**
 * Остановка всех иллюстраций
 */
export function stopAllIllustrations() {
  instances.forEach(instance => {
    instance.stop();
  });
}

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIllustrations);
} else {
  initIllustrations();
}

// Экспортируем для ручного управления
export { SphereIllustration, LayeredHouseIllustration, SplashIllustration, PndlnkIllustration };

