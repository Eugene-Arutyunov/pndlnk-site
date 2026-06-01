const fs = require("fs");
const path = require("path");

const FORCED_FEATURED_SLUGS = new Set([
  "pyaterochka-razrabotka-idealnoy-telezhki",
  "vkusvill-kontseptsiya-novoy-seti-magazinov-u-doma",
  "mavt-vinoteka-issledovanie-opyta-pokupateley",
]);

function stripMarkup(source) {
  return String(source || "")
    .replace(/\{#[\s\S]*?#\}/g, " ")
    .replace(/\{%\s*[\s\S]*?%\}/g, " ")
    .replace(/\{\{\s*[\s\S]*?\}\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMeaningfulCaseContent(slug, projectsDir) {
  const base = projectsDir || path.join(__dirname, "..", "projects");
  const casePath = path.join(base, `${slug}.html`);
  if (!fs.existsSync(casePath)) return false;

  const raw = fs.readFileSync(casePath, "utf8");
  const plainText = stripMarkup(raw).toLowerCase();

  if (!plainText) return false;
  if (/ещ[её]\s+(не\s+описан|в\s+работе|скоро)/i.test(plainText)) return false;

  return plainText.length >= 220;
}

function isProjectFeatured(slug, projectsDir) {
  if (FORCED_FEATURED_SLUGS.has(slug)) return true;
  return hasMeaningfulCaseContent(slug, projectsDir);
}

module.exports = {
  FORCED_FEATURED_SLUGS,
  hasMeaningfulCaseContent,
  isProjectFeatured,
};
