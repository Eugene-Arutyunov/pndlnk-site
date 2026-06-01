#!/usr/bin/env node
/**
 * Fixes botched apply-case-meta-macro run:
 * - caseMeta(page.fileSlug) → caseMeta(page)
 * - removes orphan <ul class="case-page__tags"> after macro
 * - removes extra </div> that closed .ids__wrapper too early
 */
const fs = require("fs");
const path = require("path");

const PROJECTS_DIR = path.join(__dirname, "../src/projects");

function fixFile(content) {
  let next = content.replace(
    /{% from 'macros\/case-page-meta\.njk' import caseMeta %}/,
    "{% from 'macros/case-page-meta.njk' import caseMeta with context %}",
  );

  next = next.replace(
    /\{\{\s*caseMeta\(page\.fileSlug\)\s*\}\}/g,
    "{{ caseMeta(page) }}",
  );

  next = next.replace(
    /(\{\{\s*caseMeta\(page\)\s*\}\})\s*<ul class="case-page__tags"[\s\S]*?<\/ul>\s*/g,
    "$1\n",
  );

  next = next.replace(
    /(\{\{\s*caseMeta\(page\)\s*\}\})\s*<\/div>\s*<\/div>\s*(<div class="ids__space)/g,
    "$1\n</div>\n$2",
  );

  return next;
}

function main() {
  const files = fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".html"));

  let changed = 0;
  for (const file of files) {
    const filePath = path.join(PROJECTS_DIR, file);
    const raw = fs.readFileSync(filePath, "utf8");
    const next = fixFile(raw);
    if (next !== raw) {
      fs.writeFileSync(filePath, next, "utf8");
      changed++;
    }
  }
  console.log(`Fixed ${changed} files`);
}

main();
