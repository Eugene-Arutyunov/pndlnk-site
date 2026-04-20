# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

CLI-инструмент для создания и отправки email-дайджестов через Unisender. Письма пишутся в Markdown, компилируются через MJML-шаблон и отправляются по подписному списку.

## Команды

```bash
# Предпросмотр с live reload (открывает браузер на localhost:3333)
node cli.js preview
node cli.js preview content/digest-01.md

# Тестовая отправка (несколько адресов — через запятую)
node cli.js test-send me@example.com
node cli.js test-send me@example.com,other@example.com content/draft.md

# Отправка по всему списку подписчиков
node cli.js send content/digest-01.md
node cli.js send content/digest-01.md --at "2024-01-15 10:00"

# Проверка подключения к Unisender (выводит списки с ID)
node cli.js ping
```

## Настройка окружения

Скопировать `.env.example` → `.env` и заполнить:

```
UNISENDER_API_KEY=...
UNISENDER_LIST_ID=78        # ID списка подписчиков в Unisender
SENDER_NAME=ОКБ Понедельник
SENDER_EMAIL=okb@ponedelnik.ru
```

## Архитектура

**Конвейер компиляции** (`lib/compile.js`):
1. Markdown-файл с frontmatter → `gray-matter` извлекает `subject` и `preheader`
2. Markdown → HTML через `marked` с кастомным `EmailRenderer` (инлайн-стили для email-клиентов)
3. HTML подставляется в `templates/digest.mjml` через плейсхолдеры `{{CONTENT}}`, `{{SUBJECT}}`, `{{PREHEADER}}`
4. MJML компилируется в финальный HTML

**Шаблон** (`templates/digest.mjml`) — единственный шаблон. Содержит логотип, блок контента, подпись Михаила Руденко, футер с ссылкой на отписку `{{UnsubscribeUrl}}` (подставляет Unisender автоматически).

**Unisender API** (`lib/unisender.js`):
- `createMessage` — создаёт черновик письма, возвращает `message_id`
- `testSend` — отправляет по `message_id` на тестовые адреса
- `createCampaign` — запускает рассылку по списку, опционально с `start_time`
- Большой HTML передаётся через `multipart/form-data` (не URL-параметры)

**Превью** (`lib/preview.js`): Express-сервер на порту 3333 с SSE live reload — следит за изменениями контент-файла и шаблона через chokidar. Раздаёт локальные ассеты из `mailing/assets/` по пути `/assets/`.

## Формат контент-файлов

```markdown
---
subject: "Дайджест понедельника #1"
preheader: "Короткий текст в превью письма"
---

Текст письма в обычном Markdown...
```

Файлы кладутся в `content/`. `content/example.md` — рабочий пример.

## Картинки для писем

Хранятся в `src/mail-assets/` репозитория сайта (не в `mailing/`). После мержа в `main` и деплоя доступны по `https://new.ponedelnik.ru/mail-assets/...`.

```
src/mail-assets/
├── mike-rudenko.jpg          ← подпись, общая для всех писем
└── digest/
    ├── ep-1/                 ← картинки конкретного выпуска
    └── ep-2/
```

В контент-файле картинки вставляются как кликабельные изображения:

```markdown
[![Описание](https://new.ponedelnik.ru/mail-assets/digest/ep-1/cover.png)](https://ссылка)
```

До деплоя картинки в тестовых письмах не отображаются — это ожидаемое поведение.
