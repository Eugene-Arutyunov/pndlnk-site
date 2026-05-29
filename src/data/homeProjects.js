const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const COMPANY_LOGO_COVER_TINT = require("./clientLogoCoverTints.js");

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

/** Первая буква заголовка — заглавная (для карточек каталога). */
function capitalizeFirst(value) {
  const s = String(value || "").trim();
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase("ru-RU") + s.slice(1);
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
]);

/** Подпись компании во втором фильтре каталога /projects/ (как группировка в базе кейсов). */
const COMPANY_SLUG_LABELS = {
  autodesk: "Autodesk",
  cosmobeauty: "CosmoBeauty",
  "company-builder": "Company Builder",
  datadarvin: "DataDarvin",
  dodo: "Додо Пицца",
  europharma: "EuroPharma",
  "fk-spartak": "ФК «Спартак»",
  floris: "Floris",
  "gora-belaya": "Туристический кластер «Гора Белая»",
  inappstory: "InAppStory",
  kontur: "Контур",
  lanit: "Ланит",
  "leroy-merlin": "Leroy Merlin",
  magnit: "Магнит",
  maskoholic: "Maskoholic",
  mango: "Манго Телеком",
  mavt: "МАВТ-Винотека",
  megafon: "МегаФон",
  mts: "МТС",
  netangels: "NetAngels",
  other: "Другое",
  "partner-program": "Партнёрская программа (вендор)",
  perekrestok: "Перекрёсток",
  pik: "ПИК",
  pyaterochka: "Пятёрочка",
  rembot: "Рембот",
  rolf: "Рольф",
  "rmk-arena": "РМК Арена",
  "roza-khutor": "Роза Хутор",
  sbermarket: "Сбермаркет",
  sdvet: "SDSvet",
  seniorgroup: "SeniorGroup",
  shalash: "Шалаш",
  sipuni: "Сипуни",
  sokolov: "SOKOLOV",
  streets: "Streets",
  "strana-development": "Страна Девелопмент",
  t2: "T2",
  tochka: "Банк Точка",
  tutu: "Tutu.ru",
  unicorngo: "UnicornGo",
  vkusvill: "ВкусВилл",
  "x5-club": "X5 Club",
  yandex: "Яндекс",
};

const COMPANY_LOGO_INCLUDES = new Set([
  "autodesk",
  "cosmobeauty",
  "datadarvin",
  "dodo",
  "europharma",
  "fk-spartak",
  "floris",
  "gora-belaya",
  "inappstory",
  "kontur",
  "lanit",
  "leroy-merlin",
  "magnit",
  "maskoholic",
  "mango",
  "mavt",
  "megafon",
  "mts",
  "netangels",
  "perekrestok",
  "pik",
  "pyaterochka",
  "rembot",
  "rolf",
  "rmk-arena",
  "roza-khutor",
  "sbermarket",
  "sdvet",
  "seniorgroup",
  "shalash",
  "sipuni",
  "sokolov",
  "streets",
  "strana-development",
  "t2",
  "tochka",
  "tutu",
  "unicorngo",
  "vkusvill",
  "x5-club",
  "yandex",
]);

const COMPANY_LOGO_MODIFIERS = {
  mavt: "project-card__logo--wide",
  "roza-khutor": "project-card__logo--wide",
  t2: "project-card__logo--compact",
  mts: "project-card__logo--mts",
  "rmk-arena": "project-card__logo--rmk",
};

const COMPANY_LOGO_MONO = new Set(["lanit", "sokolov"]);

const PHOTO_COVER_SLUGS = new Set([]);

function resolveProjectCover(slug, companySlug) {
  if (PHOTO_COVER_SLUGS.has(slug)) {
    return {
      coverPhoto: `/assets/projects/${slug}/1.jpg`,
      logoInclude: null,
      logoModifier: "",
      logoMono: false,
      coverTint: null,
    };
  }

  if (!COMPANY_LOGO_INCLUDES.has(companySlug)) {
    return {
      coverPhoto: null,
      logoInclude: null,
      logoModifier: "",
      logoMono: false,
      coverTint: null,
    };
  }

  const modifier = COMPANY_LOGO_MODIFIERS[companySlug] || "";
  const mono = COMPANY_LOGO_MONO.has(companySlug);
  const monoClass = mono ? " project-card__logo--mono" : "";
  const modifierClass = modifier ? ` ${modifier}` : "";
  const coverTint = mono ? null : COMPANY_LOGO_COVER_TINT[companySlug] || null;

  return {
    coverPhoto: null,
    logoInclude: `assets/client-logos/${companySlug}.html`,
    logoModifier: `${modifierClass}${monoClass}`.trim(),
    logoMono: mono,
    coverTint,
  };
}

/**
 * Первый тег на странице кейса — бренд/заказчик (как в названии в CSV).
 */
function extractBrand(name) {
  const s0 = String(name || "").trim();
  if (!s0) return "Проект";
  const unquoted = s0.replace(/^"(.*)"$/s, "$1").trim();

  if (/^ФК\s*«Спартак»/i.test(unquoted)) return "ФК «Спартак»";
  if (/^Leroy\s+Merlin:/i.test(unquoted)) return "Leroy Merlin";

  const ci = unquoted.indexOf(":");
  if (ci !== -1) return unquoted.slice(0, ci).trim();

  if (/^InAppStory\b/i.test(unquoted)) return "InAppStory";
  if (/^Разработка концепции Company Builder/i.test(unquoted)) return "Company Builder";
  if (/Туристический кластер/i.test(unquoted)) {
    return "Туристический кластер «Гора Белая»";
  }
  if (/^Партнёрская программа/i.test(unquoted)) return "Партнёрская программа";
  if (/^Партнерская программа/i.test(unquoted)) return "Партнёрская программа";

  return unquoted;
}

/** Заголовок карточки в каталоге: название кейса без префикса «Компания:». */
function extractCatalogTitle(name) {
  const unquoted = String(name || "")
    .trim()
    .replace(/^"(.*)"$/s, "$1")
    .trim();
  const ci = unquoted.indexOf(":");
  const title = ci !== -1 ? unquoted.slice(ci + 1).trim() : unquoted;
  return capitalizeFirst(title);
}

/**
 * Ключ фильтра «компания» (как в выгрузке кейсов по заказчику).
 */
function inferCompanySlug(name) {
  const raw = String(name || "").trim();
  const n = raw.toLowerCase();

  if (n.includes("пятёрочка") || n.includes("пятерочка")) return "pyaterochka";
  if (n.includes("перекрёсток") || n.includes("перекресток")) return "perekrestok";
  if (n.includes("x5 club")) return "x5-club";
  if (n.includes("вкусвилл")) return "vkusvill";
  if (n.includes("яндекс")) return "yandex";
  if (n.includes("додо")) return "dodo";
  if (n.includes("скб контур") || n.includes("контур")) return "kontur";
  if (/^inappstory/i.test(n)) return "inappstory";
  if (n.includes("мтс")) return "mts";
  if (n.includes("рмк")) return "rmk-arena";
  if (n.includes("страна девелопмент")) return "strana-development";
  if (n.startsWith("пик:") || n.includes("пик: ")) return "pik";
  if (n.includes("рольф")) return "rolf";
  if (n.includes("europharma")) return "europharma";
  if (n.includes("мегафон")) return "megafon";
  if (n.includes("сбермаркет")) return "sbermarket";
  if (n.includes("floris")) return "floris";
  if (n.includes("leroy") || n.includes("merlin")) return "leroy-merlin";
  if (n.includes("магнит")) return "magnit";
  if (n.includes("спартак")) return "fk-spartak";
  if (n.includes("autodesk")) return "autodesk";
  if (n.includes("datadarvin")) return "datadarvin";
  if (n.includes("netangels")) return "netangels";
  if (n.includes("sdsvet") || raw.includes("SDSvet")) return "sdvet";
  if (n.includes("seniorgroup")) return "seniorgroup";
  if (n.includes("роза хутор")) return "roza-khutor";
  if (n.includes("гора белая") || n.includes("туристический кластер")) return "gora-belaya";
  if (n.includes("мавт") || n.includes("винотека")) return "mavt";
  if (/партнёрская программа|партнерская программа/i.test(raw)) return "partner-program";
  if (n.includes("cosmobeauty")) return "cosmobeauty";
  if (n.includes("maskoholic")) return "maskoholic";
  if (n.includes("sokolov")) return "sokolov";
  if (n.includes("streets")) return "streets";
  if (/^t2[:.\s]/i.test(raw)) return "t2";
  if (n.includes("tutu")) return "tutu";
  if (n.includes("unicorngo")) return "unicorngo";
  if (n.includes("банк точка") || n.includes("точка:")) return "tochka";
  if (n.includes("ланит")) return "lanit";
  if (n.includes("манго телеком")) return "mango";
  if (n.includes("сипуни")) return "sipuni";
  if (n.includes("шалаш")) return "shalash";
  if (n.includes("company builder")) return "company-builder";
  if (n.includes("рембот")) return "rembot";
  return "other";
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
    const brand = extractBrand(name);
    const companySlug = inferCompanySlug(name);
    const companyLabel =
      COMPANY_SLUG_LABELS[companySlug] || brand;
    const displayTags = buildDisplayTags(
      name,
      row["Тип"] || "",
      row["Отрасль"] || "",
    );
    const cover = resolveProjectCover(slug, companySlug);

    return {
      name,
      catalogTitle: extractCatalogTitle(name),
      slug,
      year: row["Год выполнения"],
      typeTags: splitList(row["Тип"] || ""),
      industryTags: splitList(row["Отрасль"] || ""),
      tags: [...splitList(row["Тип"]), ...splitList(row["Отрасль"])],
      brand,
      companySlug,
      companyLabel,
      coverPhoto: cover.coverPhoto,
      logoInclude: cover.logoInclude,
      logoModifier: cover.logoModifier,
      coverTint: cover.coverTint,
      displayTags,
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
