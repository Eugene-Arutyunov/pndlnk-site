const loadProjects = require("./src/data/loadProjects.js");
const loadPeople = require("./src/data/loadPeople.js");
const loadDodoKidsInitiatives = require("./src/data/loadDodoKidsInitiatives.js");
const { sphereToTags } = loadDodoKidsInitiatives;
const { HIDDEN_PROJECT_SLUGS } = require("./src/data/projectHidden.js");

module.exports = function (conf) {
  for (const slug of HIDDEN_PROJECT_SLUGS) {
    conf.ignores.add(`src/projects/${slug}.html`);
  }

  const projects = loadProjects();
  conf.addGlobalData("projects", projects);
  conf.addGlobalData("homeProjects", projects);

  // Люди без согласия на публичный профиль: страница не собирается
  const { people, hiddenPeopleSlugs } = loadPeople(projects);
  for (const slug of hiddenPeopleSlugs) {
    conf.ignores.add(`src/people/${slug}.html`);
  }
  conf.addGlobalData("people", people);
  conf.addGlobalData("dodoKidsInitiatives", loadDodoKidsInitiatives());

  conf.addFilter("loadDodoKidsInitiatives", () => loadDodoKidsInitiatives());

  conf.addFilter("initiativeTags", (spheres) => {
    if (!Array.isArray(spheres)) return [];
    return sphereToTags(spheres);
  });

  conf.addFilter("projectBySlug", (list, slug) => {
    if (!Array.isArray(list) || slug == null || slug === "") return null;
    return list.find((p) => p.slug === slug) || null;
  });

  conf.addFilter("projectSlugFromUrl", (url) => {
    if (!url || typeof url !== "string") return "";
    return url.replace(/^\/projects\//, "").replace(/\/$/, "");
  });

  conf.addFilter("personBySlug", (list, slug) => {
    if (!Array.isArray(list) || slug == null || slug === "") return null;
    return list.find((p) => p.slug === slug) || null;
  });

  conf.addFilter("personSlugFromUrl", (url) => {
    if (!url || typeof url !== "string") return "";
    return url.replace(/^\/people\//, "").replace(/\/$/, "");
  });

  conf.addPassthroughCopy("./src/robots.txt");
  conf.addPassthroughCopy("./src/ids");
  conf.addPassthroughCopy("./src/index.js");
  conf.addPassthroughCopy("./src/assets");
  conf.addPassthroughCopy("./src/mail-assets");
  conf.addPassthroughCopy("./src/fonts");

  conf.addWatchTarget("./src/index.css");
  conf.addWatchTarget("./src/styles/");
  conf.addWatchTarget("./src/data/");
  conf.addWatchTarget("./src/ids/");

  return {
    dir: {
      input: "./src",
      includes: "./includes",
    },
    htmlTemplateEngine: "njk",
  };
};
