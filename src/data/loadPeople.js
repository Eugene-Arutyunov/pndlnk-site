const fs = require("fs");
const path = require("path");
const { isProjectHidden } = require("./projectHidden.js");

// Единственное место, где живут слова статусов. Период дописывается ниже:
// «Бюрошник с 2020», «Срединник 2021–2022».
const STATUS_LABELS = {
  buro: "Бюрошник",
  mid: "Срединник",
  partner: "Партнёр",
};

const EDUCATION_LABELS = {
  cxsl: "Выпускник CX:SL",
  ksc: "Участник корпоративного КСЦ",
};

// Плитка на /people: форма фото, цвет блока вместо фото, графика.
// Логика выбора — docs/people-card-templates.md.
const PHOTO_SHAPES = new Set(["circle", "square", "landscape", "portrait"]);
const FALLBACK_COLORS = new Set([
  "pndlnk-dark-gray",
  "pndlnk-red",
  "pndlnk-red-tinted",
  "pndlnk-gold",
  "pndlnk-gold-tinted",
]);
const CANVAS_TYPES = new Set(["sphere", "layered-house", "pndlnk", "splash"]);
const ICON_TYPES = new Set([
  "etalon",
  "base",
  "evp-dev",
  "evp-checkup",
  "goals",
  "ksc",
  "checkup",
  "cxsl",
  "dkcp-cert",
]);
const DEFAULT_SHAPE = "circle";
const DEFAULT_COLOR = "pndlnk-gold-tinted";

function readJson(name) {
  const raw = fs.readFileSync(path.join(__dirname, name), "utf8");
  return JSON.parse(raw);
}

function formatPeriod(from, to) {
  if (to == null) return from != null ? `с ${from}` : "";
  return `${from != null ? from : "…"}–${to}`;
}

function normalizeStatuses(statuses) {
  const lines = (Array.isArray(statuses) ? statuses : [])
    .filter((s) => s && STATUS_LABELS[s.status])
    .map((s) => {
      const current = s.to == null;
      const label = STATUS_LABELS[s.status];
      const period = formatPeriod(s.from, s.to);
      return {
        key: s.status,
        label,
        from: s.from ?? null,
        to: s.to ?? null,
        current,
        period,
        text: period ? `${label} ${period}` : label,
      };
    });

  // Текущие статусы первыми, затем по году начала — новые выше.
  lines.sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return (b.from || 0) - (a.from || 0);
  });
  return lines;
}

function normalizeEducation(education, certificate) {
  const lines = (Array.isArray(education) ? education : [])
    .filter((e) => e && EDUCATION_LABELS[e.kind])
    .map((e) => {
      const base = EDUCATION_LABELS[e.kind];
      if (e.kind === "cxsl" && (e.flow || e.year)) {
        const flow = e.flow ? `поток ${e.flow}` : "";
        const year = e.year ? `(${e.year})` : "";
        return [base + ",", flow, year].filter(Boolean).join(" ");
      }
      return base;
    });

  if (certificate) {
    const number = certificate.number ? ` № ${certificate.number}` : "";
    lines.push(`Сертификат${number}`);
  }
  return lines;
}

function normalizeGraphic(raw, slug, education) {
  if (!raw) {
    // Выпускник CX:SL без своей графики получает иконку курса
    const isCxsl = (Array.isArray(education) ? education : []).some((e) => e && e.kind === "cxsl");
    return isCxsl ? { kind: "icon", type: "cxsl" } : null;
  }
  const ok =
    (raw.kind === "canvas" && CANVAS_TYPES.has(raw.type)) ||
    (raw.kind === "icon" && ICON_TYPES.has(raw.type));
  if (!ok) {
    console.warn(`[people] ${slug}: неизвестная графика ${raw.kind}:${raw.type} — пропущена`);
    return null;
  }
  return { kind: raw.kind, type: raw.type };
}

function normalizeCard(raw, hasPhoto) {
  const card = raw.card || {};

  let photoShape = card.photoShape;
  if (!PHOTO_SHAPES.has(photoShape)) {
    if (photoShape) {
      console.warn(
        `[people] ${raw.slug}: неизвестная форма фото "${photoShape}" — взят ${DEFAULT_SHAPE}`
      );
    }
    photoShape = DEFAULT_SHAPE;
  }

  let fallbackColor = card.fallbackColor;
  if (!FALLBACK_COLORS.has(fallbackColor)) {
    if (fallbackColor) {
      console.warn(
        `[people] ${raw.slug}: недопустимый цвет блока "${fallbackColor}" — взят ${DEFAULT_COLOR}`
      );
    }
    fallbackColor = DEFAULT_COLOR;
  }

  // Ширина фото в процентах плитки и «без полей» (вплотную к краю)
  let photoWidth = Number(card.photoWidth);
  if (!(photoWidth > 0 && photoWidth <= 100)) {
    if (card.photoWidth != null) {
      console.warn(
        `[people] ${raw.slug}: ширина фото "${card.photoWidth}" вне 1–100 — взят дефолт формы`,
      );
    }
    photoWidth = null;
  }

  // Тёмная плитка: класс .dark переключает токены на тёмный набор
  const tone = card.tone === "dark" ? "dark" : "light";
  if (card.tone && card.tone !== "dark" && card.tone !== "light") {
    console.warn(`[people] ${raw.slug}: неизвестный тон "${card.tone}" — взят light`);
  }

  return {
    photoShape,
    photoWidth,
    photoBleed: Boolean(card.photoBleed),
    tone,
    fallbackColor,
    graphic: normalizeGraphic(card.graphic, raw.slug, raw.education),
    // Агенту: форма назначена руками или это дефолт
    explicit: Boolean(card.photoShape || (!hasPhoto && card.fallbackColor)),
    note: card.note || "",
  };
}

// Имя на плитке всегда в две строки: имя / фамилия по первому пробелу
function splitName(name) {
  const text = String(name || "").trim();
  const space = text.indexOf(" ");
  if (space < 0) return [text, ""];
  return [text.slice(0, space), text.slice(space + 1)];
}

function buildRolesByPerson(roles, projects, peopleSlugs) {
  const projectSlugs = new Set(projects.map((p) => p.slug));
  const byPerson = new Map();

  for (const r of roles) {
    if (!r || !r.project || !r.person) continue;
    if (!peopleSlugs.has(r.person)) {
      console.warn(`[people] неизвестный человек "${r.person}" — пропущен`);
      continue;
    }
    if (!projectSlugs.has(r.project)) {
      if (!isProjectHidden(r.project)) {
        console.warn(`[people] неизвестный проект "${r.project}" у ${r.person} — пропущен`);
      }
      continue;
    }
    if (!byPerson.has(r.person)) byPerson.set(r.person, new Map());
    byPerson.get(r.person).set(r.project, String(r.role || "").trim());
  }
  return byPerson;
}

// Объединение ячеек в таблице проектов: год тянется на все свои строки,
// роль — на подряд идущие строки одного года с той же ролью.
// span > 0 — ячейка рисуется с rowspan, 0 — ячейку пропустить.
// *Last — ячейка дотянута до низа таблицы (чтобы спрятать её нижнюю линейку).
function addRowSpans(list) {
  let i = 0;
  while (i < list.length) {
    let j = i;
    while (j < list.length && list[j].year === list[i].year) j++;
    list[i].yearSpan = j - i;
    list[i].yearLast = j === list.length;
    for (let k = i + 1; k < j; k++) list[k].yearSpan = 0;

    let a = i;
    while (a < j) {
      let b = a;
      while (b < j && list[b].role === list[a].role) b++;
      list[a].roleSpan = b - a;
      list[a].roleLast = b === list.length;
      for (let k = a + 1; k < b; k++) list[k].roleSpan = 0;
      a = b;
    }
    i = j;
  }
  return list;
}

function normalizePerson(raw, roles, projects) {
  const statusLines = normalizeStatuses(raw.statuses);
  // Порядок проектов наследуется от loadProjects: год по убыванию, потом название.
  const personProjects = addRowSpans(
    projects.filter((p) => roles.has(p.slug)).map((p) => ({ ...p, role: roles.get(p.slug) }))
  );

  return {
    slug: raw.slug,
    name: raw.name,
    nameLines: splitName(raw.name),
    url: `/people/${raw.slug}/`,
    photo: raw.photo || null,
    hasPhoto: Boolean(raw.photo),
    // "large" — большой вертикальный прямоугольник, "small" — кружок вдвое мельче
    portrait: raw.portrait === "large" ? "large" : "small",
    publicProfile: Boolean(raw.public_profile),
    statuses: raw.statuses || [],
    statusLines,
    primaryStatus: statusLines[0] || null,
    educationLines: normalizeEducation(raw.education, raw.certificate),
    hasCertificate: Boolean(raw.certificate),
    card: normalizeCard(raw, Boolean(raw.photo)),
    projects: personProjects,
  };
}

module.exports = function loadPeople(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const rawPeople = readJson("people.json").people || [];
  const rawRoles = readJson("project-roles.json").roles || [];

  const peopleSlugs = new Set(rawPeople.map((p) => p.slug));
  const rolesByPerson = buildRolesByPerson(rawRoles, list, peopleSlugs);

  const all = rawPeople.map((raw) =>
    normalizePerson(raw, rolesByPerson.get(raw.slug) || new Map(), list)
  );

  return {
    people: all.filter((p) => p.publicProfile),
    hiddenPeopleSlugs: all.filter((p) => !p.publicProfile).map((p) => p.slug),
  };
};

module.exports.STATUS_LABELS = STATUS_LABELS;
module.exports.PHOTO_SHAPES = PHOTO_SHAPES;
module.exports.FALLBACK_COLORS = FALLBACK_COLORS;
module.exports.CANVAS_TYPES = CANVAS_TYPES;
module.exports.ICON_TYPES = ICON_TYPES;
