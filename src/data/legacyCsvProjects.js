/**
 * Legacy CSV loader — used only by scripts/build-projects-json.js for filter fallback.
 * Runtime catalog uses loadProjects.js + projects.json.
 */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const COMPANY_LOGO_COVER_TINT = require("./clientLogoCoverTints.js");
const { isProjectFeatured } = require("./projectFeatured.js");
const {
  AUDIENCE_KEYS,
  INDUSTRY_FILTER_KEYS,
  COMPANY_SLUG_LABELS,
  COMPANY_LOGO_INCLUDES,
  COMPANY_LOGO_MODIFIERS,
  PHOTO_COVER_SLUGS,
  splitList,
  unique,
  extractCatalogTitle,
  extractBrand,
  inferCompanySlug,
  inferAudience,
  inferIndustryFilters,
} = require("./projectMetaHelpers.js");

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

function readCaseInferenceText(slug) {
  const casePath = path.join(__dirname, "..", "projects", `${slug}.html`);
  if (!fs.existsSync(casePath)) return "";

  const raw = fs.readFileSync(casePath, "utf8");
  const plain = stripMarkup(raw).toLowerCase();
  return plain.length <= 14000 ? plain : plain.slice(0, 14000);
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

function resolveProjectCover(slug, companySlug) {
  if (PHOTO_COVER_SLUGS.has(slug)) {
    return {
      coverPhoto: `/assets/projects/${slug}/1.jpg`,
      logoInclude: null,
      logoModifier: "",
      coverTint: null,
    };
  }

  if (!COMPANY_LOGO_INCLUDES.has(companySlug)) {
    return {
      coverPhoto: null,
      logoInclude: null,
      logoModifier: "",
      coverTint: null,
    };
  }

  const modifier = COMPANY_LOGO_MODIFIERS[companySlug] || "";
  const modifierClass = modifier ? ` ${modifier}` : "";

  return {
    coverPhoto: null,
    logoInclude: `assets/client-logos/${companySlug}.html`,
    logoModifier: modifierClass.trim(),
    coverTint: COMPANY_LOGO_COVER_TINT[companySlug] || null,
  };
}

function normTag(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е");
}

function buildDisplayTags(name, typeStr, industryStr) {
  const brand = extractBrand(name);
  const parts = [...splitList(typeStr), ...splitList(industryStr)].map((t) =>
    String(t).trim(),
  );
  const out = [brand];
  const seen = new Set([normTag(brand)]);
  for (const t of parts) {
    if (!t) continue;
    const k = normTag(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

module.exports = function loadLegacyCsvProjects() {
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
    const brand = extractBrand(name);
    const companySlug = inferCompanySlug(name);
    const companyLabel = COMPANY_SLUG_LABELS[companySlug] || brand;
    const cover = resolveProjectCover(slug, companySlug);

    return {
      name,
      catalogTitle: extractCatalogTitle(name),
      slug,
      year: row["Год выполнения"],
      typeTags: splitList(row["Тип"] || ""),
      industryTags: splitList(row["Отрасль"] || ""),
      productTag: (row["Продукт"] || "").trim() || "Индивидуальный проект",
      brand,
      companySlug,
      companyLabel,
      coverPhoto: cover.coverPhoto,
      logoInclude: cover.logoInclude,
      logoModifier: cover.logoModifier,
      coverTint: cover.coverTint,
      displayTags: buildDisplayTags(
        name,
        row["Тип"] || "",
        row["Отрасль"] || "",
      ),
      audience,
      industryFilters,
      isFeatured: isProjectFeatured(slug),
    };
  });
};
