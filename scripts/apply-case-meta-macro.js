#!/usr/bin/env node
/**
 * Replaces manual h1 + meta-row / case-tags with {{ caseMeta(page.fileSlug) }}.
 * Usage: node scripts/apply-case-meta-macro.js [--dry-run]
 */
const fs = require("fs");
const path = require("path");

const PROJECTS_DIR = path.join(__dirname, "../src/projects");
const IMPORT_LINE =
  "{% from 'macros/case-page-meta.njk' import caseMeta with context %}";
const MACRO_CALL = "{{ caseMeta(page) }}";

function ensureImport(content) {
  if (content.includes("case-page-meta.njk")) return content;
  const m = content.match(/^(\{% extends[^\n]+\n)/);
  if (m) {
    return m[1] + IMPORT_LINE + "\n" + content.slice(m[0].length);
  }
  return IMPORT_LINE + "\n" + content;
}

function applyMetaReplacement(content) {
  let next = content;

  // h1 + case-page__meta-row (multiline)
  const metaRowRe =
    /<h1 class="S">[\s\S]*?<\/h1>\s*<div class="case-page__meta-row">[\s\S]*?<\/div>/;
  if (metaRowRe.test(next)) {
    next = next.replace(metaRowRe, MACRO_CALL);
    return { next, changed: true };
  }

  // h1 + case-tags partial
  const tagsPartialRe =
    /<h1 class="S">[\s\S]*?<\/h1>\s*\{% include 'partials\/case-tags\.njk' %\}/;
  if (tagsPartialRe.test(next)) {
    next = next.replace(tagsPartialRe, MACRO_CALL);
    return { next, changed: true };
  }

  // h1 only (no meta) — skip unless only pageTitle h1 without macro yet
  return { next, changed: false };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".html"));

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(PROJECTS_DIR, file);
    let content = fs.readFileSync(filePath, "utf8");

    if (content.includes("caseMeta(page.fileSlug)")) {
      skipped++;
      continue;
    }

    const { next, changed } = applyMetaReplacement(content);
    if (!changed) {
      console.warn(`skip (no pattern): ${file}`);
      skipped++;
      continue;
    }

    let out = ensureImport(next);
    if (!dryRun) fs.writeFileSync(filePath, out, "utf8");
    updated++;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Updated ${updated}, skipped ${skipped}`,
  );
}

main();
