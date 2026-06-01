const fs = require("fs");
const path = require("path");
const { isProjectFeatured } = require("./projectFeatured.js");
const {
  COMPANY_LOGO_MODIFIERS,
  PHOTO_COVER_SLUGS,
} = require("./projectMetaHelpers.js");

function normalizeLogoForCatalog(logo, clientKey) {
  if (!logo) {
    return { logoInclude: null, logoModifier: "", logoAsset: null };
  }

  if (logo.kind === "include") {
    const modifier = logo.modifier || COMPANY_LOGO_MODIFIERS[clientKey] || "";
    const modifierClass = modifier ? ` ${modifier}` : "";
    return {
      logoInclude: logo.path,
      logoModifier: modifierClass.trim(),
      logoAsset: null,
    };
  }

  if (logo.kind === "asset") {
    return {
      logoInclude: null,
      logoModifier: "",
      logoAsset: logo.path,
    };
  }

  return { logoInclude: null, logoModifier: "", logoAsset: null };
}

function normalizeCover(cover, slug, logoInclude) {
  if (cover?.kind === "photo" && cover.path) {
    return { coverPhoto: cover.path, coverKind: "photo" };
  }
  if (PHOTO_COVER_SLUGS.has(slug)) {
    return {
      coverPhoto: `/assets/projects/${slug}/1.jpg`,
      coverKind: "photo",
    };
  }
  return {
    coverPhoto: null,
    coverKind: logoInclude ? "logo" : "none",
  };
}

function buildDisplayTags(tags, year) {
  const out = [];
  for (const tag of tags || []) {
    if (tag.category === "type" || tag.category === "industries") {
      out.push(tag.label);
    }
  }
  if (year) out.push(String(year));
  return out;
}

function normalizeProject(raw) {
  const clientKey = raw.client?.key || "other";
  const clientLabel = raw.client?.label || "Другое";
  const tags = raw.tags || [];

  const typeTags = tags
    .filter((t) => t.category === "type")
    .map((t) => t.label);
  const industryTags = tags
    .filter((t) => t.category === "industries")
    .map((t) => t.label);

  const audience = (raw.filters?.peopleSegment || [])
    .map((f) => f.key)
    .filter(Boolean);
  const industryFilters = (raw.filters?.industries || [])
    .map((f) => f.key)
    .filter(Boolean);

  const { logoInclude, logoModifier, logoAsset } = normalizeLogoForCatalog(
    raw.logo,
    clientKey,
  );
  const { coverPhoto, coverKind } = normalizeCover(
    raw.cover,
    raw.slug,
    logoInclude,
  );

  const coverTint = raw.coverColor != null ? "128, 128, 128" : null;

  return {
    slug: raw.slug,
    title: raw.title,
    catalogTitle: raw.title,
    name: `${clientLabel}: ${raw.title}`,
    year: raw.year,
    url: raw.url || `/projects/${raw.slug}/`,
    typeTags,
    industryTags,
    tags: [...typeTags, ...industryTags],
    brand: clientLabel,
    companySlug: clientKey,
    companyLabel: clientLabel,
    coverPhoto,
    coverKind,
    coverTint,
    logoInclude,
    logoModifier,
    logoAsset,
    logo: raw.logo,
    cover: raw.cover,
    displayTags: buildDisplayTags(tags, raw.year),
    client: raw.client,
    projectTags: tags,
    filters: raw.filters,
    audience,
    industryFilters,
    isFeatured: isProjectFeatured(raw.slug),
  };
}

module.exports = function loadProjects() {
  const jsonPath = path.join(__dirname, "projects.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  return (data.projects || []).map(normalizeProject);
};
