# AGENTS.md

## Cursor Cloud specific instructions

This is a static marketing website for "Понедельник" (Ponedelnik) built with **Eleventy (11ty) v3**. No backend, database, or external services are required.

### Key commands

- `npm run dev` — starts the Eleventy dev server with live-reload on port **8080**
- `npm run build` — builds the static site to `_site/`

### Notes

- Node.js version is pinned to **22.14.0** via `.nvmrc`. Use `nvm use` to activate it.
- There are no linting tools, automated tests, or type-checking configured in this project.
- The site uses Nunjucks (`.njk`) templates; source files live in `src/`, with partials in `src/includes/`.
- `eleventy.config.js` defines passthrough copies for `src/ids/`, `src/assets/`, `src/fonts/`, and `src/index.js`.
- The `prebuild` script runs `rm -rf _site` before every build.
