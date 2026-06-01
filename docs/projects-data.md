# Данные проектов (каталог и шапка кейса)

## Источники правды

| Что | Где |
|-----|-----|
| Метаданные (теги, год, логотип, фильтры) | [`src/data/projects.json`](../src/data/projects.json) |
| Текст кейса | [`src/projects/*.html`](../src/projects/) |
| `<title>` страницы | `{% set pageTitle = '…' %}` в HTML кейса |
| Архив / резерв | [`src/data/cases.csv`](../src/data/cases.csv) — **не** используется при сборке сайта |

## Схема записи в `projects.json`

- `slug` — имя файла без `.html` (не менять URL).
- `title` — тема без префикса «Компания:»; попадает в `h1` через макрос.
- `url` — `/projects/{slug}/`.
- `year` — год на теге и в карточке каталога.
- `client` — `{ "key", "label" }`; обязательно; на странице кейса **не** показывается.
- `coverColor` — RGB `"r, g, b"` для обложки карточки; по умолчанию `"128, 128, 128"`.
- `cover` — `{ "kind": "logo" }` или `{ "kind": "photo", "path": "/assets/…" }`.
- `logo` — опционально:
  - `{ "kind": "include", "path": "assets/client-logos/{key}.html", "modifier": "…" }`
  - `{ "kind": "asset", "path": "/assets/clients/….svg" }` или `.png`
- `tags` — массив `{ "category", "label", "key"? }`:
  - `type` — тип работы (оранжевый тег на кейсе)
  - `industries` — отрасль (`key` для фильтра каталога)
- `filters.peopleSegment` — `{ "key", "label" }` (`clients` / `employees` / `partners`); только каталог.
- `filters.industries` — `{ "key", "label" }`; каталог + ключи `data-industry`.

## Макрос шапки кейса

```njk
{% from 'macros/case-page-meta.njk' import caseMeta with context %}
{{ caseMeta(page) }}
```

`with context` обязателен — иначе макрос не видит глобальные `projects` и фильтры Eleventy.

Рендерит: `h1` + логотип + теги (type, industries, year). Ссылка «← все проекты» и отступы остаются в HTML.

## Пересборка JSON из HTML

```bash
npm run projects:build-json
```

Скрипт [`scripts/build-projects-json.js`](../scripts/build-projects-json.js) читает HTML, подставляет фильтры из legacy CSV при необходимости. **Проверяйте diff** после автогена — ручные правки в JSON могут быть перезаписаны.

Проверка без записи: `node scripts/build-projects-json.js --check`

## Когда править кейс

1. Текст — только в `src/projects/{slug}.html`.
2. Теги / год / логотип на странице — в `projects.json` (или перегенерация + проверка diff).
3. `pageTitle` в HTML — для SEO; при смене темы обновите и JSON `title`, если `h1` должен совпадать.
4. Длинные кейсы могут оставить бренд в `pageTitle`, а в JSON — короткий `title` для `h1`.

## Загрузка в Eleventy

[`src/data/loadProjects.js`](../src/data/loadProjects.js) → глобальные `projects` / `homeProjects`, фильтр `projectBySlug`.

`isFeatured` вычисляется по объёму HTML ([`projectFeatured.js`](../src/data/projectFeatured.js)), в JSON не хранится.

## Карточка каталога

`displayTags` = тип + отрасль + год (без client).
