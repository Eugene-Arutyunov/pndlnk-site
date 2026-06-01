#!/usr/bin/env node
/**
 * Generates src/data/projects.json from case HTML (primary) + CSV legacy (filters fallback).
 * Usage: node scripts/build-projects-json.js [--check]
 */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const helpers = require("../src/data/projectMetaHelpers.js");
const loadLegacyCsvProjects = require("../src/data/legacyCsvProjects.js");

const PROJECTS_DIR = path.join(__dirname, "../src/projects");
const OUT_PATH = path.join(__dirname, "../src/data/projects.json");
const CSV_PATH = path.join(__dirname, "../src/data/cases.csv");

const {
  extractCatalogTitle,
  extractBrand,
  inferCompanySlug,
  inferAudience,
  inferIndustryFilters,
  inferIndustryKeyForLabel,
  buildLogoConfig,
  buildCoverConfig,
  resolveCoverColor,
  buildPeopleSegmentFilters,
  buildIndustryFilters,
  COMPANY_SLUG_LABELS,
  splitList,
} = helpers;

function parsePageTitle(html) {
  const m = html.match(/\{%\s*set\s+pageTitle\s*=\s*['"]([^'"]*)['"]\s*%\}/);
  return m ? m[1].trim() : "";
}

function parseTagsFromHtml(html) {
  const block = html.match(
    /<ul[^>]*class="[^"]*case-page__tags[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,
  );
  if (!block) return { type: [], industries: [], year: null };

  const type = [];
  const industries = [];
  let year = null;

  const re =
    /<span[^>]*class="([^"]*)"[^>]*>([^<]*)<\/span>/gi;
  let match;
  while ((match = re.exec(block[1])) !== null) {
    const classes = match[1];
    const label = match[2].trim();
    if (!label) continue;
    if (classes.includes("case-page__tag--year")) {
      year = label;
    } else if (classes.includes("case-page__tag--industry")) {
      industries.push(label);
    } else if (classes.includes("case-page__tag--brand")) {
      /* skip brand on case page */
    } else {
      type.push(label);
    }
  }

  return { type, industries, year };
}

function parseLogoFromHtml(html) {
  const header = html.slice(0, 3500);

  const include = header.match(
    /\{%\s*include\s+['"]assets\/client-logos\/([^'"]+)\.html['"]\s*%\}/,
  );
  if (include) {
    const slug = include[1];
    const logo = buildLogoConfig(slug);
    if (logo) return logo;
    return {
      kind: "include",
      path: `assets/client-logos/${slug}.html`,
    };
  }

  const asset = header.match(
    /<img[^>]+src="(\/assets\/clients\/[^"]+\.(?:svg|png|webp))"/i,
  );
  if (asset) {
    return { kind: "asset", path: asset[1] };
  }

  return null;
}

function buildCsvSlugMap() {
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
  });
  const legacy = loadLegacyCsvProjects();
  const bySlug = new Map(legacy.map((p) => [p.slug, p]));
  const byName = new Map(legacy.map((p) => [p.name, p]));
  return { rows, bySlug, byName };
}

function buildProjectEntry(slug, html, legacyBySlug) {
  const pageTitle = parsePageTitle(html);
  const parsedTags = parseTagsFromHtml(html);
  const legacy = legacyBySlug.get(slug);

  const title = extractCatalogTitle(pageTitle || legacy?.catalogTitle || slug);
  const brandSource = pageTitle || legacy?.name || title;
  const clientKey =
    legacy?.companySlug ||
    inferCompanySlug(brandSource) ||
    inferCompanySlug(slug.replace(/-/g, " "));
  const clientLabel =
    COMPANY_SLUG_LABELS[clientKey] || extractBrand(brandSource);

  let typeLabels = parsedTags.type;
  let industryLabels = parsedTags.industries;
  let year = parsedTags.year || legacy?.year || "";

  if (typeLabels.length === 0 && legacy?.typeTags?.length) {
    typeLabels = legacy.typeTags;
  }
  if (industryLabels.length === 0 && legacy?.industryTags?.length) {
    industryLabels = legacy.industryTags;
  }

  const typeStr = typeLabels.join(", ");
  const industryStr = industryLabels.join(", ");
  const caseText = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 14000)
    .toLowerCase();

  let audience = legacy?.audience || [];
  let industryFilterKeys = legacy?.industryFilters || [];

  if (audience.length === 0) {
    audience = inferAudience(brandSource, typeStr, industryStr, caseText);
  }
  if (industryFilterKeys.length === 0) {
    industryFilterKeys = inferIndustryFilters(
      industryStr,
      brandSource,
      typeStr,
      caseText,
    );
  }

  const tags = [
    ...typeLabels.map((label) => ({ category: "type", label })),
    ...industryLabels.map((label) => ({
      category: "industries",
      label,
      key: inferIndustryKeyForLabel(label, brandSource, typeStr),
    })),
  ];

  let logo = parseLogoFromHtml(html);
  if (!logo) logo = buildLogoConfig(clientKey);
  if (
    logo?.kind === "asset" &&
    logo.path?.includes("/assets/projects/") &&
    buildLogoConfig(clientKey)
  ) {
    logo = buildLogoConfig(clientKey);
  }

  const cover = buildCoverConfig(slug, clientKey);
  const coverColor = resolveCoverColor(clientKey);

  return {
    slug,
    title,
    url: `/projects/${slug}/`,
    year: String(year || "").trim(),
    client: { key: clientKey, label: clientLabel },
    coverColor,
    cover,
    logo: logo || undefined,
    tags,
    filters: {
      peopleSegment: buildPeopleSegmentFilters(audience),
      industries: buildIndustryFilters(industryFilterKeys, industryLabels),
    },
  };
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const { bySlug: legacyBySlug } = buildCsvSlugMap();

  const files = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".html"))
    .sort();

  const projects = [];
  const warnings = [];

  for (const file of files) {
    const slug = file.replace(/\.html$/, "");
    const html = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8");
    const entry = buildProjectEntry(slug, html, legacyBySlug);

    if (!legacyBySlug.has(slug)) {
      warnings.push(`no CSV match: ${slug}`);
    }
    if (!entry.tags.length) {
      warnings.push(`no tags: ${slug}`);
    }
    if (!entry.year) {
      warnings.push(`no year: ${slug}`);
    }

    projects.push(entry);
  }

  const out = { projects };
  const json = `${JSON.stringify(out, null, 2)}\n`;

  if (checkOnly) {
    const existing = fs.existsSync(OUT_PATH)
      ? fs.readFileSync(OUT_PATH, "utf8")
      : "";
    if (existing === json) {
      console.log(`OK: ${projects.length} projects (unchanged)`);
      process.exit(0);
    }
    console.log(`DIFF: ${projects.length} projects would change`);
    process.exit(1);
  }

  fs.writeFileSync(OUT_PATH, json, "utf8");
  console.log(`Wrote ${projects.length} projects to ${OUT_PATH}`);
  if (warnings.length) {
    console.warn("Warnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"));
  }
}

main();
