# Реестр репозитория

Навигационный индекс функциональных блоков сайта — для разработчиков и агентов.
При добавлении нового блока — добавь сюда короткое описание.

Архитектурные слои CSS (порядок подключения = каскад, см. `src/css-bundle.njk`):
**токены → ресет → настройки → композиция страницы → ядро → компоненты → инклуды → виджеты → страницы**.

Словарь системы: **токены** (жёсткий контракт, именованные CSS-переменные) →
**компоненты** (референсные образцы UI-элементов) → **виджеты** (крупные куски
функциональности, собранные из компонентов и токенов).

---

## Дизайн-система (ядро)

### Токены

- Styles: `src/ids/tokens/palette.css` (сырые цвета, источник правды), `src/ids/tokens/colors.css` (семантические + брендовые роли; тёмные блоки `.dark` переключаются здесь), `src/ids/tokens/scales.css` (спейсеры, гэпы, радиусы, границы, длительности)
- Used in: весь CSS

Правила: в вёрстке — только семантические токены; палитра напрямую — лишь там, где
цвет не должен зависеть от темы. Прозрачность — `color-mix(in srgb, var(--ids__x) N%, transparent)`
на месте применения, не отдельными токенами. Сырые `rgb()` — нигде, кроме палитры.

### Ядро ids

- Styles: `src/ids/normalize.css` (ресет), `src/ids/settings.css` (шрифты, `--ids__density`, флюидная типографика), `src/ids/layout.css` (`.ids__wrapper`, `.ids__space`, `.ids__sequence`, утилиты `.desktop-only`/`.mobile-only`/`.visually-hidden`), `src/ids/ids.css` (типографика тегов внутри `.ids`, `.promo-link`), `src/ids/navbar.css`, `src/ids/gallery.css`, `src/ids/photoswipe.css` (вендор)
- Scripts: `src/assets/navbar.js` (веб-компоненты `<ids-navbar>`/`<ids-nav-item>`)

Отличие от эталонной ids: спейсеры и гэпы в `em` (не в `rem`) — сайт исторически
свёрстан в em, значения масштабируются от фонт-сайза окружения.

## Витрина дизайн-системы

- Page: `src/style.html` → `/style/`
- Styles: `src/styles/style-guide.css`
- Scripts: `src/assets/tokens-dump.js` — рендерит списки токенов из живого CSS (`document.styleSheets`), витрина не может разойтись с кодом

Секции: Логотип, Токены, Типографика, Компоненты (с токен-контрактами), Виджеты (каталог), Графика.

## Компоненты (`src/styles/components/`)

| Файл | Что | Used in |
|---|---|---|
| `form.css` | Текстфилд `.form-field` (база — подчёркнутый) + `.filled` (залитый) | контактная форма (все страницы), формы КШЦ, подписка |
| `promo-link.css` | Варианты CTA `.second`/`.third` (база `.promo-link` — в ids.css) | ДКЦП, КШЦ, кейсы |
| `outline-button.css` | Контурная кнопка `.outline-button` — как `.lets-talk-button`, но без апперкейса; для действий внутри контента, работает и на `<span>` | кейс Додо Kids (джобс-таблица) |
| `conflict-map.css` | Карта мотивационного конфликта `table.conflict-map`: названия ячеек и стрелки зашиты в макрос `macros/conflict-map.njk`, тексты — параметрами | кейс Додо Kids (джобс-таблица) |
| `promo-switcher.css` | Сегментед-контрол (обёртка `.ids` сохраняет специфичность) | ДКЦП, КШЦ, кейсы, продукты |
| `pndlnk-promo-link.css` | Карточка материала `a.pndlnk-promo-link` (+`.inverted` — всегда тёмная) | главная, ДКЦП |
| `logo-wall.css` | Стена логотипов клиентов | главная, ДКЦП База |
| `review.css` | Отзыв `.review` (имя с подписью + текст; фотка `.review-portrait` и видео `.review-video` — опциональные свойства отзыва) + сетка страницы `.reviews-grid`: всегда 3 колонки, всегда в `ids__wrapper L`, строки 2+1/1+2 (`.wide` = 2 колонки); сами отзывы — инклюды `src/includes/reviews/*` и своей ширины не знают + карточка автора `.author-box` | /ksc-open, /ksc, /dkcp, кейсы, /reviews |
| `initiative-card.css` | Карточка инициативы, сетка, пилюли принципов | кейс Додо Kids (спроектированы для любого кейса) |
| `logo-downloads.css` | Плашки скачивания логотипов | витрина |
| `illustrations.css` | Контейнеры канвас-иллюстраций | главная, ДКЦП, витрина |
| `dkcp-component.css` | Интерактивная схема ДКЦП | ДКЦП |
| `lessons-gantt.css` | Гант программы | КШЦ |
| `copy-table.css`, `copy-field.css` | Копируемые таблица и поле | реквизиты |

## Виджеты (`src/styles/widgets/`)

| Файл | Что | Used in |
|---|---|---|
| `project-catalog.css` | Каталог проектов: фильтр-панель, сетка, карточки | главная, /projects |
| `promo-rows.css` | Промо-строки продуктов: аккордеон задач/продуктов с иконками | /products, промо-таблицы |
| `initiative-catalog.css` | Фильтр-панель каталога инициатив | Додо Kids |
| `case-field-promo.css` | Полевой промо-блок: фото/скрины с гармошкой и транскриптами | Додо Kids |
| `case-video.css` | Главное видео и сетка видео-отзывов кейса | Додо Kids |
| `case-summary.css` | Саммари-дашборд кейса: плашка `article-title` с шапкой, запросом/контекстом и результатом + стики-строка навигации по процессу. Пока исключение кейса Додо Kids; скорее конструктор элементов для будущих длинных кейсов, чем жёсткий шаблон | Додо Kids |

## Страницы и семейства

### Главная
- Page: `src/index.html` → `/`
- Styles: `src/styles/home.css`
- Scripts: `src/assets/script.js` (каталог проектов), `src/assets/illustrations/`

### ДКЦП
- Pages: `src/dkcp.html`, `src/dkcp-base.html`, `src/dkcp-checkup.html`, dkcp-template*
- Styles: `src/styles/dkcp-base.css`, `src/styles/dkcp-page.css`

### Кейсы
- Pages: `src/projects/*.html` (~67 штук) → `/projects/<slug>/`
- Styles: `src/styles/case-page.css` (общие стили кейсов)
- Data: `src/data/loadProjects.js`, скрытые слаги — `src/data/projectHidden.js`

### Царь-кейс Додо Пицца Kids
- Pages: `src/projects/dodo-pizza-kids.html` (длинная версия, noindex, не согласована с заказчиком, доступна по ссылке) + 6 подстраниц в `src/projects/dodo-pizza-kids/`; `src/projects/dodo-pizza-kids-case-v1.html` — опубликованная версия, открывается со страницы проектов
- Styles: `src/styles/cases/dodo-kids.css` (страничное) + компоненты и виджеты выше
- Data: `src/data/loadDodoKidsInitiatives.js`

### КШЦ
- Pages: `src/ksc.html`, `src/ksc-open.html`, `src/ksc-full.html` (редирект на /ksc/)
- Styles: `src/styles/ksc-open.css`, `src/styles/ksc-program-table.css`, `src/styles/article.css` (каркас статьи-лендинга)
- В ksc-open.css мокапы интерфейсов используют локальные переменные `--mock-*` — все указывают на токены; это законные локальные переменные виджета

### Квиз (чекап ДКЦП)
- Styles: `src/styles/quiz.css`
- `!important` внутри `@media print` обоснован комментарием: печать перебивает экранные стили

### Прочее
- `src/styles/glossary.css` — глоссарий; `src/subscribe.html` — подписка (форма `.form-field.filled`); `src/company-details.html` — реквизиты; `src/politika.html` — политика обработки персональных данных (сквозная многоуровневая нумерация — `ol.multilevel` в `src/ids/ids.css`); `src/illustrations.html` — демо иллюстраций; `src/reviews.html` → `/reviews/` (noindex) — служебный каталог всех отзывов из инклюдов
- Инклуды: `src/includes/layout.html` (базовый шаблон; контактная форма — внизу каждой страницы), `header.html`/`footer.html` + `src/styles/includes/*`; `src/includes/reviews/*` — отзывы, по одному на файл (см. `review.css` в компонентах)

## Инфраструктура

- `src/css-bundle.njk` — сборка одного `bundle.css` конкатенацией в порядке слоёв
- `scripts/screenshots.mjs` — контроль визуальных регрессий: Playwright (через установленный Chrome) + pixelmatch; `node scripts/screenshots.mjs <label> [--all-cases] [--compare <base>]`; сайт должен быть собран (`npm run build`)
- `.github/workflows/deploy.yml` — деплой на GitHub Pages

---

## Исключения из системы

Каждое исключение продублировано комментарием-обоснованием в коде.

1. **`--ids__color-red-400` у `.promo-link.second`** — прямое обращение к палитре: кнопки стоят вплотную, нужен промежуточный красный между accent и hover; семантической роли у него нет намеренно (`components/promo-link.css`).
2. **`.pndlnk-promo-link.inverted`** — всегда тёмная карточка, цвета из палитры напрямую: карточка не должна зависеть от темы (`components/pndlnk-promo-link.css`).
3. **`!important`** — три обоснованных гнезда: печатная версия квиза (`quiz.css`), пульсация кнопки при отправке формы (`article.css`), перебивание инлайн-ширины из скрипта (`includes/contact-form.css`).
4. **Спейсеры/гэпы в `em`** вместо `rem` эталонной ids — историческая конвенция сайта («em для всего», см. PROJECT.md).
5. **`.dark` на `mark`-подобных элементах**: тёмные блоки переопределяют только 7 семантических ролей — см. «Открытые вопросы».

## Открытые вопросы

1. **Тёмные блоки не переопределяют `--ids__ink`** — понадобится осветлённая ступень синего при первом использовании чернил в тёмном блоке (`code` и `inverted-text` уже достроены).
2. **Брейкпоинт-хвосты**: конвенция — единственный брейкпоинт `width < 768px`; в ksc-open.css и кейсах остались одиночные 700/720/900/1100px и `max-width`-записи — трогать только с визуальной проверкой (off-by-one на границе).
