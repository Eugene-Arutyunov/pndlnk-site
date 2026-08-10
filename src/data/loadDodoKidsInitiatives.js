const fs = require("fs");
const path = require("path");

const SPHERE_KEYS = {
  Меню: "menu",
  "Новые продукты и услуги": "new-products",
  "День рождения и мастер-классы": "birthday",
  "Оснащение детских комнат": "kids-rooms",
  "Мобильное приложение": "app",
  Доставка: "delivery",
  Коммуникации: "communications",
  "Сервисные стандарты": "service",
  "Оснащение залов": "halls",
  "Экстра-формат": "extra",
};

function sphereToTags(spheres) {
  const tags = [];

  for (const sphere of spheres) {
    for (const part of sphere.split(/\s+и\s+/)) {
      const tag = part.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  return tags;
}

function sphereToKeys(spheres) {
  const keys = [];

  for (const sphere of spheres) {
    const key = SPHERE_KEYS[sphere];
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  }

  return keys;
}

function loadDodoKidsInitiatives() {
  const file = path.join(__dirname, "dodoKidsInitiatives.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));

  return raw
    .filter((item) => !item.hidden)
    .map((item, index) => {
      const spheres = Array.isArray(item.spheres) ? item.spheres : [];
      const sphereKeys = sphereToKeys(spheres);

      const number = Number.isInteger(item.number) ? item.number : index + 1;

      return {
        title: item.title,
        spheres,
        sphereKeys,
        tags: sphereToTags(spheres),
        principles: Array.isArray(item.principles) ? item.principles : [],
        url: item.url || null,
        featured: Boolean(item.featured),
        cover: item.cover || null,
        order: index,
        number,
      };
    });
}

module.exports = loadDodoKidsInitiatives;
module.exports.sphereToTags = sphereToTags;
module.exports.SPHERE_KEYS = SPHERE_KEYS;
