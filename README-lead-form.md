# Приёмка лидов с сайта pndlnk.ru

## Общая схема

```
Форма на сайте
     ↓
POST https://apps.pndlnk.ru/webhook/lead
     ↓
/opt/lead-webhook/server.py (Python, порт 8421)
     ↓
Twenty CRM (crm.pndlnk.ru)
— создаёт компанию (если указана)
— создаёт/находит контакт
— создаёт сделку и прикрепляет заметку
     ↓
Twenty Workflow
— триггер: создание Opportunity
— действие: Send Email → mr@pndlnk.team
```

---

## Форма на сайте

**Файл:** `src/assets/contact-form.js`

Универсальная модальная форма. Открывается кнопками с классом `contact-form-trigger`.

### data-атрибуты кнопки

| Атрибут | Назначение | Пример |
|---|---|---|
| `data-cf-title` | Заголовок формы (= название продукта) | `"Культура создания ценности"` |
| `data-cf-tariff` | Подзаголовок (тариф/план) | `"Базовый"` |
| `data-cf-description` | Описание под заголовком | `"3 месяца, онлайн"` |
| `data-cf-submit` | Текст кнопки отправки | `"Отправить заявку"` |
| `data-cf-show-headcount` | Показать поле «Размер команды» | `"true"` |
| `data-cf-success-url` | URL, открываемый после успешной отправки | `"https://t.me/ponedelnik"` |
| `data-cf-slug` | **Slug ценностного предложения в CRM** | `"ksc"` |

### Пример кнопки

```html
<button class="contact-form-trigger"
  data-cf-title="Культура создания ценности"
  data-cf-submit="Отправить заявку"
  data-cf-show-headcount="true"
  data-cf-slug="ksc">
  Отправить заявку
</button>
```

### Поля формы

- **Имя** — обязательное
- **Email** — обязательное
- **Компания** — необязательное
- **Telegram** — необязательное
- **Размер команды** — появляется при `data-cf-show-headcount="true"`

---

## Webhook-сервер

**Расположение:** `apps` (72.56.15.165) → `/opt/lead-webhook/server.py`  
**Сервис:** `lead-webhook.service` (systemd, Restart=always)  
**Порт:** `127.0.0.1:8421` (проксируется Nginx)  
**Логи:** `/opt/lead-webhook/lead-webhook.log`

### Эндпоинт

```
POST https://apps.pndlnk.ru/webhook/lead
Content-Type: application/json

{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "telegram": "@ivan",       // необязательно
  "company": "ООО Ромашка", // необязательно
  "headcount": "50",         // необязательно
  "product": "...",          // заполняется из data-cf-title
  "tariff": "...",           // заполняется из data-cf-tariff
  "slug": "ksc"              // необязательно — slug ЦП в CRM
}
```

### Логика обработки

**Если передан `slug`:**
1. Ищет Ценностное предложение в CRM по slug
2. Создаёт или находит Компанию (по точному совпадению названия)
3. Создаёт или находит Контакт (дедупликация по email → telegram → телефону; восстанавливает soft-deleted записи)
4. Создаёт Сделку: название `"Заявка с сайта на {Название ЦП}"`, стадия `QUALIFICATION`
   - Линкует: Ценностное предложение, Контакт, Взаимодействие «Заявка на сайте», Компанию
5. Создаёт Заметку к сделке с доп. полями (telegram, размер команды, источник)

**Если `slug` не передан:**
1. Создаёт или находит Компанию
2. Создаёт или находит Контакт
3. Создаёт Заметку к контакту с указанием источника

### Дедупликация контактов

Поиск ведётся последовательно: email → telegram → телефон.  
Если контакт был soft-deleted в CRM — автоматически восстанавливается.

---

## Twenty CRM

**URL:** https://crm.pndlnk.ru  
**Сервер:** `apps` (72.56.15.165) → `/opt/twenty/`  
**Запуск:** `docker compose up -d` (4 контейнера: server, worker, db, redis)

### Ключевые объекты

| Объект | Как используется |
|---|---|
| `valuePropositions` | Продукты/программы. Каждый имеет поле `slug` — по нему форма находит нужный ЦП |
| `opportunities` | Создаётся на каждую заявку. Привязывается к ЦП, контакту, компании и взаимодействию |
| `interactions` | «Заявка на сайте» (id: `4f305d88-a206-43a9-a646-c1221b95dff3`) — источник сделки |
| `people` | Контакты. Уникальны по email |
| `companies` | Компании. Уникальны по названию |

### Добавить новый продукт/форму

1. Создать Ценностное предложение в CRM и задать ему **slug** (поле Slug)
2. На странице сайта добавить кнопку с `data-cf-slug="нужный-slug"`

---

## Email-уведомления

Реализовано через **Twenty Workflow**.

**Воркфлоу:** «Уведомление о новой заявке с сайта»  
**Триггер:** создание Opportunity  
**Действие:** Send Email через аккаунт `cxburo@gmail.com`  
**Получатель:** `mr@pndlnk.team`

### Настройка email-аккаунта

Аккаунт `cxburo@gmail.com` подключён в Twenty через IMAP/SMTP с App Password.  
Если перестанет работать (например, после смены App Password):
- Settings → Accounts → cxburo@gmail.com → переподключить

### Если воркфлоу перестал работать

```bash
# Проверить статус worker-контейнера
ssh apps "docker compose -f /opt/twenty/docker-compose.yml ps"

# Логи worker
ssh apps "docker logs twenty-worker-1 2>&1 | tail -50"

# Перезапустить worker
ssh apps "cd /opt/twenty && docker compose restart worker"
```

---

## Обслуживание webhook-сервера

```bash
# Статус
ssh apps "systemctl status lead-webhook"

# Логи
ssh apps "tail -50 /opt/lead-webhook/lead-webhook.log"

# Перезапуск
ssh apps "systemctl restart lead-webhook"

# Редактировать
ssh apps "nano /opt/lead-webhook/server.py"
# после изменений:
ssh apps "systemctl restart lead-webhook"
```

---

## Резервный вариант — Airtable

В `contact-form.js` закомментирован блок отправки в Airtable. Чтобы включить — раскомментировать секцию с `AIRTABLE_API_TOKEN` в `handleSubmit`. База: `appqTc6VQnPAPFDgk`, таблица: `Applications`.
