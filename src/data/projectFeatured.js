const FORCED_FEATURED_SLUGS = new Set([
  "dodo-pitstsa-opyt-semey-s-detmi",
  "yandex-opyt-voditeley-taksi",
  "europharma-razrabotka-kontseptsii-seti-magazinov-u-doma",
  "mango-telekom-kultura-sozdaniya-tsennosti",
  "inappstory",
  "pyaterochka-razrabotka-idealnoy-telezhki",
  "vkusvill-kontseptsiya-novoy-seti-magazinov-u-doma",
  "sipuni-brend-rabotodatelya",
]);

function isProjectFeatured(slug) {
  return FORCED_FEATURED_SLUGS.has(slug);
}

module.exports = {
  FORCED_FEATURED_SLUGS,
  isProjectFeatured,
};
