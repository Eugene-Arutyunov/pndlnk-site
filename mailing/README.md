# Почтовый инструмент Понедельника

CLI для создания и отправки email-дайджестов через Unisender.

## Как это работает

1. Пишешь выпуск в Markdown → кладёшь в `content/`
2. Смотришь превью в браузере
3. Отправляешь тест себе
4. Отправляешь по всему списку

## Быстрый старт

```bash
cd mailing
cp .env.example .env   # заполни UNISENDER_API_KEY
npm install
node cli.js preview content/digest-01.md
```

## Команды

| Команда | Что делает |
|---|---|
| `node cli.js preview [файл.md]` | Открывает превью в браузере с live reload |
| `node cli.js test-send email@example.com [файл.md]` | Отправляет тест на указанный адрес |
| `node cli.js send [файл.md]` | Отправляет по всему списку подписчиков |
| `node cli.js send [файл.md] --at "2024-01-15 10:00"` | Планирует отправку на время |
| `node cli.js ping` | Проверяет подключение к Unisender, выводит списки |

Несколько адресов для теста — через запятую: `me@example.com,other@example.com`

## Структура выпуска

Файлы выпусков лежат в `content/`. Формат:

```markdown
---
subject: "Дайджест понедельника #1"
preheader: "Короткий текст в превью письма"
---

Текст письма в обычном Markdown...
```

- **subject** — тема письма
- **preheader** — текст, который показывается в превью рядом с темой

## Картинки

Картинки для писем хранятся в `src/mail-assets/` репозитория сайта и после деплоя доступны по адресу `https://new.ponedelnik.ru/mail-assets/...`.

Структура папок:

```
src/mail-assets/
├── mike-rudenko.jpg          ← подпись, общая для всех писем
└── digest/
    ├── ep-1/                 ← картинки первого выпуска
    └── ep-2/                 ← картинки второго выпуска
```

Вставка кликабельной картинки в Markdown:

```markdown
[![Описание](https://new.ponedelnik.ru/mail-assets/digest/ep-1/cover.png)](https://ссылка)
```

> Картинки становятся доступны только после мержа в `main` и деплоя сайта. До этого они не будут отображаться в тестовых письмах.

## Настройка `.env`

```
UNISENDER_API_KEY=...        # API-ключ из личного кабинета Unisender
UNISENDER_LIST_ID=78         # ID списка подписчиков
SENDER_NAME=ОКБ Понедельник
SENDER_EMAIL=okb@ponedelnik.ru
```
