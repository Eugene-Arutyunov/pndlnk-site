const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const AUDIENCE_KEYS = new Set(["clients", "employees", "partners"]);
const SEGMENT_KEYS = new Set(["it", "developer", "retail", "vendor"]);
const TRANSLIT_MAP = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function splitList(value) {
  if (value == null || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function makeSlug(input, usedSlugs) {
  const source = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[«»]/g, "");
  let slug = "";

  for (const ch of source) {
    if (Object.prototype.hasOwnProperty.call(TRANSLIT_MAP, ch)) {
      slug += TRANSLIT_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      slug += ch;
    } else {
      slug += "-";
    }
  }

  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "") || "project";

  let candidate = slug;
  let index = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${slug}-${index++}`;
  }
  usedSlugs.add(candidate);

  return candidate;
}

function inferAudience(name, typeStr, industryStr) {
  const hay = `${name} ${typeStr} ${industryStr}`.toLowerCase();
  const out = [];

  const employeesHints =
    /\bex\b|ux-исследование|\bux\b|сотрудник|директор|логистик|найм|продуктовых команд|агентов по продажам|функционер|job-портала/i.test(
      hay,
    );
  const clientsHints =
    /\bcx\b|cjm|клиент|покупател|гость|водител|болельщик|потребител|семей|лояльност|селлер|b2c|сапр/i.test(
      hay,
    );
  const partnersHints = /партнёр/i.test(hay);

  if (employeesHints) out.push("employees");
  if (clientsHints) out.push("clients");
  if (partnersHints) out.push("partners");

  if (out.length === 0) {
    if (
      /концепц|дизайн-систем|бухгалтер|идеальн(ой|ую) тележк|даркстор|company builder|гиперсегментац/i.test(
        hay,
      )
    ) {
      out.push("clients");
    }
  }

  return unique(out);
}

function inferCompanySegment(industryStr, name, typeStr) {
  const hay = `${name} ${typeStr} ${industryStr}`.toLowerCase();
  const ind = splitList(industryStr).map((s) => s.toLowerCase());
  const out = new Set();

  const hasInd = (sub) => ind.some((i) => i === sub || i.includes(sub));

  if (hasInd("девелопмент") || /квартир|страна девелопмент|^пик:/i.test(name)) {
    out.add("developer");
  }

  if (
    hasInd("it") ||
    hasInd("телеком") ||
    /netangels|хостинг|data darvin|рембот/i.test(hay) ||
    (/контур/i.test(name) && /селлер|маркетплейс|бухгалтер/i.test(hay))
  ) {
    out.add("it");
  }

  if (hasInd("diy") && hasInd("it")) {
    out.add("it");
    out.add("retail");
  }

  if (
    hasInd("розница") ||
    hasInd("fmcg") ||
    hasInd("grocery") ||
    hasInd("horeca") ||
    (hasInd("diy") && !hasInd("it")) ||
    /пятёрочка|х5 club|вкусвилл|магнит|leroy|europharma|floris|автомобил|винотек|даркстор|супермаркет|магазинов у дома/i.test(
      hay,
    )
  ) {
    out.add("retail");
  }

  if (
    hasInd("консалтинг") ||
    hasInd("стартапы") ||
    /company builder/i.test(hay) ||
    hasInd("медицина") ||
    hasInd("туризм") ||
    hasInd("спорт") ||
    hasInd("освещение") ||
    (hasInd("производство") && !hasInd("fmcg") && !hasInd("grocery")) ||
    (/autodesk|сапр/i.test(hay) && hasInd("производство"))
  ) {
    out.add("vendor");
  }

  if (hasInd("услуги") && /мотивац|b2b|b2c/i.test(hay)) {
    out.add("retail");
  }

  return [...out].filter((s) => SEGMENT_KEYS.has(s));
}

function parseAudienceSegment(row) {
  const explicitA = row["Аудитория"];
  const explicitS = row["Сегмент"];
  let audience = splitList(explicitA)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => AUDIENCE_KEYS.has(s));
  let companySegment = splitList(explicitS)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SEGMENT_KEYS.has(s));

  const name = row.Name || "";
  const typeStr = row["Тип"] || "";
  const industryStr = row["Отрасль"] || "";

  if (audience.length === 0) {
    audience = inferAudience(name, typeStr, industryStr);
  }
  if (companySegment.length === 0) {
    companySegment = inferCompanySegment(industryStr, name, typeStr);
  }

  return {
    audience: unique(audience),
    companySegment: unique(companySegment),
  };
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

  const usedSlugs = new Set();

  return rows.map((row) => {
    const { audience, companySegment } = parseAudienceSegment(row);
    const name = row.Name || "";
    return {
      name,
      slug: makeSlug(name, usedSlugs),
      year: row["Год выполнения"],
      tags: [...splitList(row["Тип"]), ...splitList(row["Отрасль"])],
      inKp: row["В КП"],
      progress: row["Прогресс"],
      description: row["Описание"],
      audience,
      companySegment,
    };
  });
};
