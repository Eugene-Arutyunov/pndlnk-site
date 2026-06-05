const HIDDEN_PROJECT_SLUGS = new Set([
  "razrabotka-kontseptsii-company-builder",
]);

function isProjectHidden(slug) {
  return HIDDEN_PROJECT_SLUGS.has(slug);
}

module.exports = {
  HIDDEN_PROJECT_SLUGS,
  isProjectHidden,
};
