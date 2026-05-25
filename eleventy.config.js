const loadHomeProjects = require("./src/data/homeProjects.js");

module.exports = function (conf) {
  const projects = loadHomeProjects();
  conf.addGlobalData("projects", projects);
  conf.addGlobalData("homeProjects", projects);

  conf.addFilter("projectBySlug", (list, slug) => {
    if (!Array.isArray(list) || slug == null || slug === "") return null;
    return list.find((p) => p.slug === slug) || null;
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
