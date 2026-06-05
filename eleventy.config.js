const loadProjects = require("./src/data/loadProjects.js");
const { HIDDEN_PROJECT_SLUGS } = require("./src/data/projectHidden.js");

module.exports = function (conf) {
  for (const slug of HIDDEN_PROJECT_SLUGS) {
    conf.ignores.add(`src/projects/${slug}.html`);
  }

  const projects = loadProjects();
  conf.addGlobalData("projects", projects);
  conf.addGlobalData("homeProjects", projects);

  conf.addFilter("projectBySlug", (list, slug) => {
    if (!Array.isArray(list) || slug == null || slug === "") return null;
    return list.find((p) => p.slug === slug) || null;
  });

  conf.addFilter("projectSlugFromUrl", (url) => {
    if (!url || typeof url !== "string") return "";
    return url.replace(/^\/projects\//, "").replace(/\/$/, "");
  });

  conf.addPassthroughCopy("./src/ids");
  conf.addPassthroughCopy("./src/index.js");
  conf.addPassthroughCopy("./src/assets");
  conf.addPassthroughCopy("./src/mail-assets");
  conf.addPassthroughCopy("./src/fonts");

  conf.addWatchTarget("./src/index.css");
  conf.addWatchTarget("./src/styles/");
  conf.addWatchTarget("./src/ids/");

  return {
    dir: {
      input: "./src",
      includes: "./includes",
    },
    htmlTemplateEngine: "njk",
  };
};
