const path = require("node:path");
const configure = require("../../eleventy.config.js");
const { model, annotate, editorPage } = require("./server.cjs");
const source = path.resolve(__dirname, "../../src/projects/inappstory.html");
module.exports = (conf) => {
  const settings = configure(conf);
  let version;
  conf.addPreprocessor("inline-inappstory", "html", (data, content) => {
    if (path.resolve(data.page.inputPath) !== source) return content;
    version = model(content).version;
    return annotate(content);
  });
  conf.addTransform("inline-inappstory-ui", function (content) {
    return path.resolve(this.page.inputPath) === source
      ? editorPage(content, version)
      : content;
  });
  return settings;
};
