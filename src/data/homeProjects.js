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
    return {
      name: row.Name,
      year: row["Год выполнения"],
      tags: [...splitList(row["Тип"]), ...splitList(row["Отрасль"])],
      inKp: row["В КП"],
      progress: row["Прогресс"],
      description: row["Описание"],
    };
  });
};
