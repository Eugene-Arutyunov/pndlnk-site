const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

function splitList(value) {
  if (value == null || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function paletteIndex(label) {
  let h = 0;
  const s = String(label);
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 6;
}

function tagsFor(labels, kind) {
  return splitList(labels).map((text) => ({
    text,
    kind,
    palette: paletteIndex(text),
  }));
}

module.exports = function loadHomeProjects() {
  const csvPath = path.join(__dirname, "cases.csv");
  const raw = fs.readFileSync(csvPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  });

  return rows.map((row) => {
    const typeTags = tagsFor(row["Тип"], "type");
    const industryTags = tagsFor(row["Отрасль"], "industry");
    return {
      name: row.Name,
      year: row["Год выполнения"],
      tags: [...typeTags, ...industryTags],
      inKp: row["В КП"],
      progress: row["Прогресс"],
      description: row["Описание"],
    };
  });
};
