const FORCED_FEATURED_SLUGS = new Set([
  "bank-tochka-issledovanie-korporativnoy-kultury",
  "dodo-pitstsa-opyt-semey-s-detmi",
  "yandex-opyt-voditeley-taksi",
  "pyaterochka-testirovanie-effektivnosti-razmeschenie-korzinok-v-torgovyh-zalah",
  "europharma-razrabotka-kontseptsii-seti-magazinov-u-doma",
  "mango-telekom-kultura-sozdaniya-tsennosti",
  "magnit-issledovanie-opyta-sotrudnikov-roznitsy",
  "magnit-razrabotka-brenda-rabotodatelya-evp",
  "t2-opyt-sotrudnikov-i-brend-rabotodatelya",
  "sokolov-klientskiy-opyt",
  "inappstory",
  "mts-etnografiya-v-ekosistemah",
  "mts-opyt-kandidatov-produktovogo-treugolnika",
  "pyaterochka-razrabotka-idealnoy-telezhki",
  "vkusvill-kontseptsiya-novoy-seti-magazinov-u-doma",
  "mavt-vinoteka-issledovanie-opyta-pokupateley",
]);

function isProjectFeatured(slug) {
  return FORCED_FEATURED_SLUGS.has(slug);
}

module.exports = {
  FORCED_FEATURED_SLUGS,
  isProjectFeatured,
};
