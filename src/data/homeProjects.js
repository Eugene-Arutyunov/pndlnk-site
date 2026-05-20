const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const AUDIENCE_KEYS = new Set(["clients", "employees", "partners"]);

/** Слуги для выпадающего списка «во взаимодействии с» на /projects/ */
const INDUSTRY_FILTER_KEYS = new Set([
  "it-vendor",
  "it-integrator",
  "it-outsourcing",
  "infosec",
  "telecom",
  "finance",
  "retail",
  "fmcg",
  "development",
  "industry-manufacturing",
  "medicine",
  "logistics",
  "consulting",
  "education",
  "media-marketing",
  "hr-recruiting",
  "energy",
  "public-sector",
  "agro",
  "other",
]);
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

/** Точные URL slug по полному названию из CSV (брендовая латиница и т. п.). */
const SLUG_OVERRIDES_BY_NAME = {
  "Яндекс: Опыт водителей такси": "yandex-opyt-voditeley-taksi",
};

function resolveSlug(name, usedSlugs) {
  const key = String(name || "").trim();
  const override = SLUG_OVERRIDES_BY_NAME[key];
  if (override) {
    let candidate = override;
    let index = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${override}-${index++}`;
    }
    usedSlugs.add(candidate);
    return candidate;
  }
  return makeSlug(name, usedSlugs);
}

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

function inferAudience(name, typeStr, industryStr, caseText = "") {
  const hay = `${name} ${typeStr} ${industryStr} ${caseText}`.toLowerCase();
  const out = [];

  const employeesHints =
    /\bex\b|ux-исследование|\bux\b|сотрудник|директор|логистик|найм|продуктовых команд|агентов по продажам|функционер|job-портала|кадров|персонал|внутренн/i.test(
      hay,
    );
  const clientsHints =
    /\bcx\b|cjm|клиент|покупател|гость|водител|болельщик|потребител|семей|лояльност|селлер|b2c|b2b|сапр/i.test(
      hay,
    );
  const partnersHints = /партнёр|франчайзи|дилерск|дистриб|канал продаж/i.test(
    hay,
  );

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

function inferIndustryFilters(industryStr, name, typeStr, caseText = "") {
  const nameStr = String(name || "");
  const hay = `${nameStr} ${typeStr} ${industryStr} ${caseText}`.toLowerCase();
  const ind = splitList(industryStr).map((s) => s.toLowerCase().trim());

  const hasInd = (sub) =>
    ind.some((i) => i === sub || i.includes(sub));
  const out = new Set();

  if (hasInd("fmcg") || hasInd("grocery")) {
    out.add("fmcg");
  }

  if (
    hasInd("розница") ||
    hasInd("horeca") ||
    hasInd("diy") ||
    /пятёрочка|х5 club|вкусвилл|магнит|leroy|europharma|floris|сбермаркет|винотек|даркстор|магазинов у дома|магазин/i.test(
      hay,
    ) ||
    /продажа автомобил/i.test(industryStr)
  ) {
    out.add("retail");
  }

  if (hasInd("девелопмент") || /страна девелопмент|^пик:/i.test(nameStr)) {
    out.add("development");
  }

  if (hasInd("телеком")) {
    out.add("telecom");
  }

  if (hasInd("it")) {
    if (/хостинг|netangels|аутсорс|outsourc/i.test(hay)) {
      out.add("it-outsourcing");
    } else if (/интегратор|интеграц|внедрен/i.test(hay)) {
      out.add("it-integrator");
    } else {
      out.add("it-vendor");
    }
  }

  if (/информационн(ой|ая)\s+безопасност|инфобез|иб\b/i.test(hay)) {
    out.add("infosec");
  }
  if (/банк|финанс|страхов/i.test(hay)) {
    out.add("finance");
  }
  if (hasInd("медицина")) {
    out.add("medicine");
  }
  if (hasInd("консалтинг") || hasInd("стартапы") || /company builder/i.test(hay)) {
    out.add("consulting");
  }
  if (hasInd("образован") || /университет|школ/i.test(hay)) {
    out.add("education");
  }
  if (
    hasInd("производство") ||
    hasInd("освещение") ||
    (/сапр|autodesk/i.test(hay) && hasInd("производство"))
  ) {
    out.add("industry-manufacturing");
  }
  if (/логистик/i.test(hay)) {
    out.add("logistics");
  }
  if (hasInd("маркетинг") || /медиа|ads|реклам/i.test(hay)) {
    out.add("media-marketing");
  }
  if (
    /найм|кэдо|кадров|recruit|hr\b|людских ресурс/i.test(hay)
  ) {
    out.add("hr-recruiting");
  }
  if (/энерг|энергетик|электроэнерг/i.test(hay)) {
    out.add("energy");
  }
  if (/гос|муниципал|государств/i.test(hay)) {
    out.add("public-sector");
  }
  if (/агро|сельскохоз/i.test(hay)) {
    out.add("agro");
  }
  if (hasInd("туризм") || hasInd("спорт") || /роза хутор|гора белая/i.test(hay)) {
    out.add("other");
  }

  const filtered = [...out].filter((s) => INDUSTRY_FILTER_KEYS.has(s));
  if (filtered.length === 0) {
    return ["other"];
  }
  return unique(filtered);
}

function parseAudienceIndustry(row, caseText = "") {
  const explicitA = row["Аудитория"];
  const explicitIndustries = row["Сегмент"];
  let audience = splitList(explicitA)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => AUDIENCE_KEYS.has(s));
  let industryFilters = splitList(explicitIndustries)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => INDUSTRY_FILTER_KEYS.has(s));

  const name = row.Name || "";
  const typeStr = row["Тип"] || "";
  const industryStr = row["Отрасль"] || "";

  if (audience.length === 0) {
    audience = inferAudience(name, typeStr, industryStr, caseText);
  }
  if (industryFilters.length === 0) {
    industryFilters = inferIndustryFilters(industryStr, name, typeStr, caseText);
  }

  return {
    audience: unique(audience),
    industryFilters: unique(industryFilters),
  };
}

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

/** Текст страницы кейса для эвристик аудитории/отрасли (обрезка по объёму). */
function readCaseInferenceText(slug) {
  const casePath = path.join(__dirname, "..", "projects", `${slug}.html`);
  if (!fs.existsSync(casePath)) return "";

  const raw = fs.readFileSync(casePath, "utf8");
  const plain = stripMarkup(raw).toLowerCase();
  return plain.length <= 14000 ? plain : plain.slice(0, 14000);
}

function hasMeaningfulCaseContent(slug) {
  const casePath = path.join(__dirname, "..", "projects", `${slug}.html`);
  if (!fs.existsSync(casePath)) return false;

  const raw = fs.readFileSync(casePath, "utf8");
  const plainText = stripMarkup(raw).toLowerCase();

  if (!plainText) return false;
  if (/ещ[её]\s+(не\s+описан|в\s+работе|скоро)/i.test(plainText)) return false;

  return plainText.length >= 220;
}

const FORCED_FEATURED_SLUGS = new Set([
  "pyaterochka-razrabotka-idealnoy-telezhki",
  "vkusvill-kontseptsiya-novoy-seti-magazinov-u-doma",
  "mavt-vinoteka-issledovanie-opyta-pokupateley",
  "sozdanie-partnerskoy-programmy-dlya-vendora-onlayn-kass",
  "partnerskaya-programma-dlya-vendora",
]);

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
    const name = row.Name || "";
    const slug = resolveSlug(name, usedSlugs);
    const caseText = readCaseInferenceText(slug);
    const { audience, industryFilters } = parseAudienceIndustry(row, caseText);
    return {
      name,
      slug,
      year: row["Год выполнения"],
      tags: [...splitList(row["Тип"]), ...splitList(row["Отрасль"])],
      inKp: row["В КП"],
      progress: row["Прогресс"],
      description: row["Описание"],
      isFeatured: FORCED_FEATURED_SLUGS.has(slug)
        ? true
        : hasMeaningfulCaseContent(slug),
      audience,
      industryFilters,
    };
  });
};
