# Данные людей (раздел «Люди»)

## Источники правды

| Что | Где |
|-----|-----|
| Канон человека (статусы, обучение, согласие, фото) | [`src/data/people.json`](../src/data/people.json) |
| Роли в проектах | [`src/data/project-roles.json`](../src/data/project-roles.json) — зеркало таблицы Богдана «люди × проекты» |
| Текст о человеке | [`src/people/*.html`](../src/people/) |
| `<title>` страницы | `{% set pageTitle = '…' %}` в HTML |

Страница человека собирается из двух структур: канона и ролей. Роли у человека
не хранятся — загрузчик при сборке джойнит `project-roles.json` с уже
загруженными проектами (`loadProjects`), поэтому названия, клиенты, годы и ссылки
берутся из `projects.json` и не дублируются.

## Схема записи в `people.json`

- `slug` — имя файла в `src/people/` без `.html` = URL `/people/{slug}/`.
- `name` — имя, попадает в `h1` и карточку списка.
- `statuses` — список записей `{ "status", "from", "to" }`:
  - `status` — `buro` (бюрошник), `mid` (срединник), `partner` (партнёр);
  - `from` — год начала; `to` — год окончания или `null` («сейчас»).
  - Статусы независимы, у каждого свой период; у человека их может быть несколько.
- `education` — список `{ "kind": "cxsl" | "ksc", "flow"?, "year"? }`; может быть пустым.
- `certificate` — `false` или `{ "number": "…" }`.
- `public_profile` — согласие на публичный профиль. Без согласия (`false`/`null`)
  страница **не собирается** (файл добавляется в `conf.ignores`), и человек не попадает
  в список.
- `photo` — путь к фото (`/assets/…`) или `null`: фото необязательно.
- `portrait` — вид портрета в шапке: `large` (большой вертикальный прямоугольник)
  или `small` (кружок вдвое мельче; по умолчанию). Без фото шапка без портрета,
  текст занимает всю ширину.
- `card` — плитка на `/people/`: `photoShape`, `fallbackColor`, `graphic`, `note`.
  Что это и как выбирать — [`people-card-templates.md`](people-card-templates.md).

## Схема записи в `project-roles.json`

Плоский список рёбер, по одной записи на пару «проект × человек»:

```json
{ "project": "<slug проекта>", "person": "<slug человека>", "role": "Старший аналитик" }
```

- `project` — slug из `projects.json`. Неизвестный slug → предупреждение в логе
  сборки и пропуск; скрытый проект (`projectHidden.js`) → тихий пропуск.
- `person` — slug из `people.json`; неизвестный → предупреждение и пропуск.
- `role` — текст как есть, выводится под названием проекта.

Ячейки «Уточнить» из таблицы в JSON не переносим.

## Что вычисляет загрузчик

[`src/data/loadPeople.js`](../src/data/loadPeople.js) → `loadPeople(projects)`
возвращает `{ people, hiddenPeopleSlugs }`. У каждого человека:

- `url`, `photo`, `hasPhoto`, `publicProfile`;
- `statusLines` — строки статусов с готовым текстом: «Бюрошник с 2020»,
  «Срединник 2021–2022», без годов — просто «Бюрошник». Слова статусов — константа `STATUS_LABELS` в начале файла,
  единственное место, где они живут. Текущие статусы идут первыми, потом по году
  начала по убыванию; `primaryStatus` — первая строка (для карточки в списке);
- `projects` — проекты с полем `role`, в порядке `loadProjects` (год по убыванию);
- `educationLines`, `hasCertificate`;
- `nameLines` — имя в две строки по первому пробелу (для плитки);
- `card` — нормализованные параметры плитки (см. `people-card-templates.md`).

## Макросы страницы

```njk
{% from 'macros/person-page-meta.njk' import personMeta, personProjects with context %}
{% call personMeta(page) %}
  <p>…текст о человеке…</p>
{% endcall %}
{{ personProjects(page) }}
```

Текст о человеке передаётся телом `{% call %}` и встаёт в правую колонку шапки,
под статусами и именем.

На списке `/people/` человек — плитка `a.people-card` (макрос
`macros/people-card.njk`): фото или цветной блок, имя в две строки, графика
в правом нижнем углу. Канвасы оживляет `/assets/illustrations/init.js`,
подключённый в конце `src/people.html`.

`with context` обязателен — иначе макрос не видит глобальные `people` и фильтры
`personBySlug` / `personSlugFromUrl`, и шапка молча не рендерится.

`personMeta` — ссылка «← Все люди», портрет, статусы, `h1`, текст из `call`. `personProjects` —
список проектов (год · клиент · название · роль) и, если есть, блок «Обучение».

## Как добавить человека

1. Запись в `people.json`.
2. Роли в `project-roles.json`.
3. Файл `src/people/{slug}.html` по образцу соседних (текст — в `ids__text-width`).
4. Фото — в `src/assets/people/{slug}.jpg`, путь в `photo`; пока фото нет — `null`.

Проверка без сборки:

```bash
node -e "const p=require('./src/data/loadProjects.js')();const r=require('./src/data/loadPeople.js')(p);console.log(r.people.map(x=>[x.slug,x.statusLines.map(s=>s.text),x.projects.length]))"
```
